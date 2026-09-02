import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (file) => readFile(resolve(root, file), 'utf8');

const manifest = JSON.parse(await read('manifest.json'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.background.service_worker, 'background.js');
assert.ok(manifest.permissions.includes('declarativeNetRequestWithHostAccess'));
assert.ok(manifest.permissions.includes('storage'));
assert.ok(manifest.permissions.includes('debugger'));
assert.deepEqual(manifest.host_permissions, ['http://*/*', 'https://*/*']);
assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self';");
for (const file of ['background.js', 'ua-utils.js', 'presets.js', 'popup.html', 'popup.css', 'popup.js']) {
  await read(file);
}

const presetSandbox = { globalThis: {} };
vm.runInNewContext(await read('presets.js'), presetSandbox);
const presets = presetSandbox.globalThis.MASQUERADE_PRESETS;
assert.ok(Array.isArray(presets) && presets.length >= 18);
assert.equal(new Set(presets.map((preset) => preset.id)).size, presets.length);
for (const preset of presets) {
  assert.match(preset.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(['Desktop', 'Mobile', 'Tablet', 'Bots'].includes(preset.cat));
  assert.ok(preset.ua.length <= 512 && !/[\r\n]/.test(preset.ua));
}
for (const category of ['Desktop', 'Mobile', 'Tablet']) assert.ok(presets.some((preset) => preset.cat === category));
for (const browser of ['Chrome', 'Edge', 'Firefox', 'Safari', 'Opera', 'Samsung Internet']) assert.ok(presets.some((preset) => preset.browser === browser));
for (const os of ['Windows', 'macOS', 'Linux', 'ChromeOS', 'iOS', 'Android']) assert.ok(presets.some((preset) => preset.os === os));

const utilitySandbox = { globalThis: {} };
vm.runInNewContext(await read('ua-utils.js'), utilitySandbox);
const utils = utilitySandbox.globalThis.MASQUERADE_UA_UTILS;
assert.equal(utils.validateUserAgent('  hello  '), 'hello');
assert.throws(() => utils.validateUserAgent(''), /Enter/);
assert.throws(() => utils.validateUserAgent('x'.repeat(513)), /512/);
assert.throws(() => utils.validateUserAgent('Mozilla\nTest'), /control/);
const chromeHeaders = utils.buildRequestHeaders(presets.find((preset) => preset.id === 'win-chrome').ua);
assert.equal(chromeHeaders[0].header, 'user-agent');
assert.equal(chromeHeaders[0].operation, 'set');
assert.equal(chromeHeaders[0].value, presets.find((preset) => preset.id === 'win-chrome').ua);
assert.equal(chromeHeaders.find((header) => header.header === 'sec-ch-ua-mobile').value, '?0');
assert.equal(chromeHeaders.find((header) => header.header === 'sec-ch-ua-platform').value, '"Windows"');
assert.equal(new Set(chromeHeaders.map((header) => header.header)).size, chromeHeaders.length);
assert.equal(chromeHeaders.find((header) => header.header === 'sec-ch-ua-mobile').operation, 'set');
assert.equal(chromeHeaders.find((header) => header.header === 'sec-ch-ua-platform').operation, 'set');
assert.equal(chromeHeaders.find((header) => header.header === 'sec-ch-ua-full-version-list').operation, 'remove');
const safariHeaders = utils.buildRequestHeaders(presets.find((preset) => preset.id === 'mac-safari').ua);
assert.ok(safariHeaders.every((header) => header.header === 'user-agent' || header.operation === 'remove'));
const fullOverride = utils.buildUserAgentOverride(presets.find((preset) => preset.id === 'android-chrome').ua);
assert.equal(fullOverride.userAgent, presets.find((preset) => preset.id === 'android-chrome').ua);
assert.equal(fullOverride.platform, 'Linux armv8l');
assert.equal(fullOverride.userAgentMetadata.platform, 'Android');
assert.equal(fullOverride.userAgentMetadata.mobile, true);
const androidDescription = utils.describeUserAgent(presets.find((preset) => preset.id === 'android-chrome').ua);
assert.equal(androidDescription.recognized, true);
assert.equal(androidDescription.label, 'Chrome 140 · Pixel 10');
assert.equal(androidDescription.detail, 'Mobile · Android 16');
const tabletDescription = utils.describeUserAgent(presets.find((preset) => preset.id === 'android-tablet-firefox').ua);
assert.equal(tabletDescription.label, 'Firefox 142 · Android 16');
assert.equal(tabletDescription.detail, 'Tablet');
assert.equal(utils.describeUserAgent('not a browser').recognized, false);

const background = await read('background.js');
assert.match(background, /importScripts\('ua-utils\.js'\)/);
assert.match(background, /type: 'modifyHeaders'/);
assert.match(background, /removeRuleIds: \[RULE_ID\]/);
assert.doesNotMatch(await read('popup.html'), /fonts\.googleapis|fonts\.gstatic/mi, 'popup must remain offline-safe');
const popupStyles = await read('popup.css');
assert.match(popupStyles, /#pane-custom[^}]*overflow-y:\s*auto/);
assert.match(popupStyles, /#pane-presets,\s*#pane-custom[^}]*scrollbar-width:\s*thin/);
assert.match(popupStyles, /\.custom-bar\s*\{[^}]*flex:\s*none/);
const popupController = await read('popup.js');
assert.equal((popupController.match(/state = \{ \.\.\.state/g) || []).length, 2, 'UA changes must preserve per-tab full-spoof state');

// Exercise the service worker message path with a tiny Chrome API mock.
let onMessage;
let activeUpdates = 0;
let maxActiveUpdates = 0;
let failNextUpdate = false;
let failNextDebuggerCommands = 0;
let onStartup;
let activeTabId = 7;
const calls = [];
const stored = { enabled: false, ua: null };
const sessionStored = { fullSpoofTabIds: [] };
const attachedTabs = new Set();
const debuggerCommands = [];
const debuggerAttachVersions = [];
const unsupportedDebuggerVersions = new Set(['0.1']);
const badgeCalls = [];
const chrome = {
  declarativeNetRequest: {
    updateDynamicRules: async (change) => {
      if (failNextUpdate) {
        failNextUpdate = false;
        throw new Error('mock DNR failure');
      }
      activeUpdates += 1;
      maxActiveUpdates = Math.max(maxActiveUpdates, activeUpdates);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 3));
      activeUpdates -= 1;
      calls.push(change);
    }
  },
  debugger: {
    attach: async ({ tabId }, version) => {
      debuggerAttachVersions.push({ tabId, version });
      if (unsupportedDebuggerVersions.has(version)) throw new Error(`Requested protocol version: ${version} is not supported`);
      if (attachedTabs.has(tabId)) throw new Error('already attached');
      attachedTabs.add(tabId);
    },
    detach: async ({ tabId }) => { attachedTabs.delete(tabId); },
    sendCommand: async ({ tabId }, method, params) => {
      if (!attachedTabs.has(tabId)) throw new Error('not attached');
      if (failNextDebuggerCommands > 0) { failNextDebuggerCommands -= 1; throw new Error('mock debugger command failure'); }
      debuggerCommands.push({ tabId, method, params });
    },
    onDetach: { addListener: () => {} }
  },
  storage: {
    local: {
      get: async () => ({ ...stored }),
      set: async (values) => Object.assign(stored, values),
      remove: async (keys) => keys.forEach((key) => delete stored[key])
    },
    session: {
      get: async () => ({ ...sessionStored }),
      set: async (values) => Object.assign(sessionStored, values)
    }
  },
  action: {
    setBadgeText: async (details) => badgeCalls.push({ method: 'setBadgeText', details }),
    setBadgeBackgroundColor: async (details) => badgeCalls.push({ method: 'setBadgeBackgroundColor', details }),
    setBadgeTextColor: async (details) => badgeCalls.push({ method: 'setBadgeTextColor', details })
  },
  runtime: {
    onInstalled: { addListener: () => {} }, onStartup: { addListener: (listener) => { onStartup = listener; } },
    onMessage: { addListener: (listener) => { onMessage = listener; } }
  },
  tabs: {
    get: async (tabId) => ({ id: tabId, url: tabId === 42 ? 'chrome://extensions/' : 'https://example.test/' }),
    query: async () => [{ id: activeTabId, url: 'https://example.test/' }],
    onRemoved: { addListener: () => {} },
    onActivated: { addListener: () => {} },
    onUpdated: { addListener: () => {} }
  }
};
const workerSandbox = { console, chrome, Promise, setTimeout, globalThis: {} };
const awaitableUtils = await read('ua-utils.js');
workerSandbox.importScripts = () => vm.runInNewContext(awaitableUtils, workerSandbox);
workerSandbox.globalThis = workerSandbox;
vm.runInNewContext(background, workerSandbox);
const send = (message) => new Promise((resolveResponse) => onMessage(message, {}, resolveResponse));
const firstUA = presets.find((preset) => preset.id === 'win-chrome').ua;
const secondUA = presets.find((preset) => preset.id === 'android-chrome').ua;
const responses = await Promise.all([
  send({ type: 'set', mode: 'custom', ua: firstUA }),
  send({ type: 'set', mode: 'custom', ua: secondUA })
]);
assert.ok(responses.every((response) => response.ok));
assert.equal(maxActiveUpdates, 1);
assert.equal(stored.ua, secondUA);
assert.equal(stored.enabled, false);
assert.ok(responses.every((response) => response.enabled === false));
const fullTabEnabled = await send({ type: 'setFullTab', tabId: 7, enabled: true });
assert.equal(fullTabEnabled.enabled, true);
assert.deepEqual([...sessionStored.fullSpoofTabIds], [7]);
assert.equal(debuggerCommands.at(-1).method, 'Network.setUserAgentOverride');
assert.equal(debuggerCommands.at(-1).params.userAgent, secondUA);
assert.equal(debuggerCommands.at(-1).params.userAgentMetadata.platform, 'Android');
assert.equal(debuggerAttachVersions.at(-1).version, '1.1');
assert.ok(badgeCalls.some(({ method, details }) => method === 'setBadgeText' && details.tabId === 7 && details.text === 'ON'));
const fullOnlyIdentityChange = await send({ type: 'set', mode: 'preset', presetId: 'win-chrome', ua: firstUA, networkEnabled: false });
assert.equal(fullOnlyIdentityChange.enabled, false);
assert.equal(stored.enabled, false);
assert.deepEqual([...sessionStored.fullSpoofTabIds], [7]);
assert.equal(debuggerCommands.at(-1).params.userAgent, firstUA);
const networkEnabled = await send({ type: 'toggle' });
assert.equal(networkEnabled.enabled, true);
assert.deepEqual([...sessionStored.fullSpoofTabIds], [7]);
const networkDisabled = await send({ type: 'toggle' });
assert.equal(networkDisabled.enabled, false);
assert.deepEqual([...sessionStored.fullSpoofTabIds], [7]);
assert.equal((await send({ type: 'getFullTabState', tabId: 7 })).enabled, true);
const fullTabDisabled = await send({ type: 'setFullTab', tabId: 7, enabled: false });
assert.equal(fullTabDisabled.enabled, false);
assert.deepEqual([...sessionStored.fullSpoofTabIds], []);
assert.ok(badgeCalls.some(({ method, details }) => method === 'setBadgeText' && details.tabId === 7 && details.text === null));
assert.equal((await send({ type: 'setFullTab', tabId: 42, enabled: true })).ok, false);
failNextDebuggerCommands = 1;
const failedFullTab = await send({ type: 'setFullTab', tabId: 7, enabled: true });
assert.equal(failedFullTab.ok, false);
assert.equal(attachedTabs.has(7), false);
assert.deepEqual([...sessionStored.fullSpoofTabIds], []);
const fullTabForStartup = await send({ type: 'setFullTab', tabId: 9, enabled: true });
assert.equal(fullTabForStartup.ok, false);
activeTabId = 9;
unsupportedDebuggerVersions.add('1.1');
assert.equal((await send({ type: 'setFullTab', tabId: 9, enabled: true })).ok, true);
assert.equal(debuggerAttachVersions.at(-1).version, '1.0');
stored.ua = 'invalid\nua';
stored.enabled = true;
await onStartup();
assert.equal(attachedTabs.has(9), false);
assert.deepEqual([...sessionStored.fullSpoofTabIds], []);
assert.equal(stored.enabled, false);
const savedState = { ua: stored.ua, enabled: stored.enabled };
failNextUpdate = true;
const failedSet = await send({ type: 'set', mode: 'custom', ua: firstUA });
assert.equal(failedSet.ok, false);
assert.deepEqual({ ua: stored.ua, enabled: stored.enabled }, savedState);
stored.ua = null;
stored.enabled = false;
const emptyToggle = await send({ type: 'toggle' });
assert.equal(emptyToggle.enabled, false);
assert.equal(stored.enabled, false);
assert.equal((await send({ type: 'set', mode: 'preset', presetId: 'bad id', ua: firstUA })).ok, false);
assert.ok(calls.length >= 2);

console.log(`Validated MV3 manifest, ${presets.length} presets, UA helpers, and serialized worker updates.`);
