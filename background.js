/* Masquerade — MV3 service worker.
 * Changes request identity and, only when explicitly enabled, one tab's UA
 * through Network.setUserAgentOverride. No page content or browsing history is read.
 */

importScripts('ua-utils.js');

const RULE_ID = 91001;
// Prefer the lowest stable CDP 1.x version for broad Chromium compatibility.
// Some newer builds reject the legacy 0.1 value still shown in API docs.
const DEBUGGER_PROTOCOL_VERSIONS = ['1.1', '1.0', '0.1'];
const RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
  'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket',
  'webtransport', 'webbundle', 'other'
];
const { validateUserAgent, buildRequestHeaders, buildUserAgentOverride } = globalThis.MASQUERADE_UA_UTILS;

// DNR updates are serialized so a quick sequence of clicks cannot leave a stale rule behind.
let ruleQueue = Promise.resolve();
let debuggerQueue = Promise.resolve();
let fullSpoofTabIds = new Set();
let fullSpoofStateReady;

function enqueueDebuggerUpdate(update) {
  const next = debuggerQueue.then(update, update);
  debuggerQueue = next.catch(() => undefined);
  return next;
}

function ensureFullSpoofState() {
  if (!fullSpoofStateReady) {
    fullSpoofStateReady = chrome.storage.session.get(['fullSpoofTabIds']).then((stored) => {
      fullSpoofTabIds = new Set(Array.isArray(stored.fullSpoofTabIds) ? stored.fullSpoofTabIds.filter(Number.isInteger) : []);
    });
  }
  return fullSpoofStateReady;
}

async function persistFullSpoofState() {
  await chrome.storage.session.set({ fullSpoofTabIds: [...fullSpoofTabIds] });
}

function isUnsupportedProtocolVersion(error) {
  return /protocol version.*(?:not supported|unsupported)|unsupported.*protocol version/i.test(error?.message || '');
}

async function attachDebugger(tabId) {
  let lastError;
  for (const version of DEBUGGER_PROTOCOL_VERSIONS) {
    try {
      await chrome.debugger.attach({ tabId }, version);
      return;
    } catch (error) {
      lastError = error;
      if (!isUnsupportedProtocolVersion(error)) throw error;
    }
  }
  throw lastError || new Error('No compatible debugger protocol version found.');
}

async function applyFullTabUserAgent(tabId, ua) {
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Network.setUserAgentOverride', buildUserAgentOverride(ua));
  } catch (firstError) {
    let attachedByCall = false;
    try {
      await attachDebugger(tabId);
      attachedByCall = true;
      await chrome.debugger.sendCommand({ tabId }, 'Network.setUserAgentOverride', buildUserAgentOverride(ua));
    } catch (secondError) {
      if (attachedByCall) {
        try { await chrome.debugger.detach({ tabId }); } catch (_) { /* best-effort cleanup */ }
      }
      throw secondError || firstError;
    }
  }
}

function enqueueRuleUpdate(update) {
  const next = ruleQueue.then(update, update);
  ruleQueue = next.catch(() => undefined);
  return next;
}

function applyUserAgent(ua) {
  return enqueueRuleUpdate(() => chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
    addRules: [{
      id: RULE_ID,
      priority: 1,
      action: { type: 'modifyHeaders', requestHeaders: buildRequestHeaders(ua) },
      condition: { resourceTypes: RESOURCE_TYPES }
    }]
  }));
}

function clearOverride() {
  return enqueueRuleUpdate(() => chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID]
  }));
}

async function setBadge(active) {
  await chrome.action.setBadgeText({ text: active ? 'ON' : '' });
  if (!active) return;
  await chrome.action.setBadgeBackgroundColor({ color: '#f4b860' });
  try { await chrome.action.setBadgeTextColor({ color: '#17130d' }); } catch (_) { /* Chrome < 110 */ }
}

async function setTabBadge(tabId, active) {
  // null removes the tab override so an active global network badge can show through.
  await chrome.action.setBadgeText({ tabId, text: active ? 'ON' : null });
  if (!active) return;
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#f4b860' });
  try { await chrome.action.setBadgeTextColor({ tabId, color: '#17130d' }); } catch (_) { /* Chrome < 110 */ }
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url || '');
}

async function setBadgeFromState(networkActive = false) {
  await ensureFullSpoofState();
  const tabs = await chrome.tabs.query({});
  await setBadge(false);
  await Promise.all(tabs
    .filter((tab) => Number.isInteger(tab?.id))
    .map((tab) => setTabBadge(tab.id, (networkActive && isHttpUrl(tab.url)) || fullSpoofTabIds.has(tab.id)).catch(() => undefined)));
}

async function refreshTabBadge(tabId) {
  await ensureFullSpoofState();
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch (_) { return; }
  const stored = await chrome.storage.local.get(['enabled', 'ua']);
  let networkActive = false;
  if (stored.enabled && stored.ua) {
    try { validateUserAgent(stored.ua); networkActive = true; } catch (_) { /* invalid state is reconciled on startup */ }
  }
  await setTabBadge(tabId, (networkActive && isHttpUrl(tab.url)) || fullSpoofTabIds.has(tabId)).catch(() => undefined);
}

async function enableFullTabSpoof(tabId, ua) {
  return enqueueDebuggerUpdate(async () => {
    await ensureFullSpoofState();
    try {
      await applyFullTabUserAgent(tabId, ua);
    } catch (error) {
      if (!fullSpoofTabIds.has(tabId)) {
        try { await chrome.debugger.detach({ tabId }); } catch (_) { /* best-effort cleanup */ }
      }
      throw error;
    }
    fullSpoofTabIds.add(tabId);
    await persistFullSpoofState();
  });
}

async function disableFullTabSpoof(tabId) {
  return enqueueDebuggerUpdate(async () => {
    await ensureFullSpoofState();
    if (fullSpoofTabIds.has(tabId)) {
      try { await chrome.debugger.detach({ tabId }); } catch (_) { /* already detached or tab closed */ }
      fullSpoofTabIds.delete(tabId);
      await setTabBadge(tabId, false).catch(() => undefined);
      await persistFullSpoofState();
    }
  });
}

async function refreshFullTabSpoofs(ua) {
  return enqueueDebuggerUpdate(async () => {
    await ensureFullSpoofState();
    for (const tabId of fullSpoofTabIds) {
      try {
        await applyFullTabUserAgent(tabId, ua);
      } catch (_) {
        try { await chrome.debugger.detach({ tabId }); } catch (__) { /* already detached or unavailable */ }
        await setTabBadge(tabId, false).catch(() => undefined);
        fullSpoofTabIds.delete(tabId);
      }
    }
    await persistFullSpoofState();
  });
}

async function clearFullTabSpoofs() {
  return enqueueDebuggerUpdate(async () => {
    await ensureFullSpoofState();
    for (const tabId of fullSpoofTabIds) {
      try { await chrome.debugger.detach({ tabId }); } catch (_) { /* already detached or tab closed */ }
      await setTabBadge(tabId, false).catch(() => undefined);
    }
    fullSpoofTabIds.clear();
    await persistFullSpoofState();
  });
}

function forgetFullTab(tabId) {
  return enqueueDebuggerUpdate(async () => {
    await ensureFullSpoofState();
    if (!fullSpoofTabIds.delete(tabId)) return;
    await setTabBadge(tabId, false).catch(() => undefined);
    await persistFullSpoofState();
  });
}

async function syncState() {
  const stored = await chrome.storage.local.get(['enabled', 'ua']);
  let ua = null;
  if (stored.ua) {
    try { ua = validateUserAgent(stored.ua); }
    catch { await chrome.storage.local.remove(['ua', 'mode', 'presetId']); }
  }
  const active = Boolean(stored.enabled && ua);
  if (active) await applyUserAgent(ua); else await clearOverride();
  if (ua) await refreshFullTabSpoofs(ua); else await clearFullTabSpoofs();
  await setBadgeFromState(active);
  if (stored.enabled && !ua) await chrome.storage.local.set({ enabled: false });
}

chrome.runtime.onInstalled.addListener(() => syncState().catch(console.error));
chrome.runtime.onStartup.addListener(() => syncState().catch(console.error));
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId != null) forgetFullTab(source.tabId).catch(console.error);
});
chrome.tabs.onRemoved.addListener((tabId) => forgetFullTab(tabId).catch(console.error));
chrome.tabs.onActivated.addListener(({ tabId }) => refreshTabBadge(tabId).catch(console.error));
chrome.tabs.onUpdated.addListener((tabId) => refreshTabBadge(tabId).catch(console.error));

async function isSupportedTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return /^https?:\/\//i.test(tab?.url || '');
  } catch (_) {
    return false;
  }
}

async function isActiveTab(tabId) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id === tabId;
}

async function handleMessage(message) {
  switch (message?.type) {
    case 'set': {
      const ua = validateUserAgent(message.ua);
      if (message.mode === 'preset' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(message.presetId || ''))) {
        throw new Error('Invalid preset selection.');
      }
      const stored = await chrome.storage.local.get(['enabled']);
      const networkActive = typeof message.networkEnabled === 'boolean' ? message.networkEnabled : Boolean(stored.enabled);
      if (networkActive) await applyUserAgent(ua); else await clearOverride();
      await chrome.storage.local.set({
        ua,
        enabled: networkActive,
        mode: message.mode === 'preset' ? 'preset' : 'custom',
        presetId: message.mode === 'preset' ? String(message.presetId || '') : null
      });
      await refreshFullTabSpoofs(ua);
      await setBadgeFromState(networkActive);
      return { ok: true, enabled: networkActive };
    }
    case 'getFullTabState': {
      const tabId = Number(message.tabId);
      if (!Number.isInteger(tabId) || tabId < 0) throw new Error('Invalid tab.');
      await ensureFullSpoofState();
      return { ok: true, enabled: fullSpoofTabIds.has(tabId), supported: await isSupportedTab(tabId) };
    }
    case 'setFullTab': {
      const tabId = Number(message.tabId);
      if (!Number.isInteger(tabId) || tabId < 0) throw new Error('Invalid tab.');
      const enabled = Boolean(message.enabled);
      if (!(await isActiveTab(tabId))) throw new Error('Open Masquerade on the tab you want to change.');
      if (!(await isSupportedTab(tabId))) throw new Error('Full tab spoofing works on normal HTTP(S) pages only.');
      const stored = await chrome.storage.local.get(['ua']);
      const ua = stored.ua ? validateUserAgent(stored.ua) : null;
      if (enabled && !ua) throw new Error('Choose a User-Agent before enabling full tab spoofing.');
      if (enabled) await enableFullTabSpoof(tabId, ua); else await disableFullTabSpoof(tabId);
      await setBadgeFromState(Boolean((await chrome.storage.local.get(['enabled'])).enabled && ua));
      return { ok: true, enabled };
    }
    case 'toggle': {
      const stored = await chrome.storage.local.get(['enabled', 'ua']);
      let ua = null;
      if (stored.ua) {
        try { ua = validateUserAgent(stored.ua); }
        catch { await chrome.storage.local.remove(['ua', 'mode', 'presetId']); }
      }
      const requested = !Boolean(stored.enabled);
      const enabled = requested && Boolean(ua);
      if (enabled && ua) await applyUserAgent(ua); else await clearOverride();
      await chrome.storage.local.set({ enabled });
      await setBadgeFromState(enabled && Boolean(ua));
      return { ok: true, enabled, active: enabled && Boolean(ua) };
    }
    default:
      return { ok: false, error: 'Unknown extension message.' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
  return true;
});
