/* Masquerade — popup controller */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const GROUP_ORDER = ['Desktop', 'Mobile', 'Tablet', 'Bots'];
const CAT_COLOR = { Desktop: '#f4b860', Mobile: '#49d69a', Tablet: '#5fc7e7', Bots: '#bc91ef' };
const ICONS = {
  Desktop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="12" rx="1.6"/><path d="M9.5 20h5M12 16.5V20"/></svg>',
  Mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7.2" y="2.8" width="9.6" height="18.4" rx="2.2"/><path d="M11 18.2h2"/></svg>',
  Tablet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.6" y="3" width="14.8" height="18" rx="2.2"/><path d="M10.8 18.2h2.4"/></svg>',
  Bots: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8.5" width="14" height="9.5" rx="2.2"/><path d="M12 8.5V5.2m0 0h2.6"/><circle cx="9.4" cy="13" r="1"/><circle cx="14.6" cy="13" r="1"/><path d="M8.6 18v1.8m6.8-1.8v1.8"/></svg>'
};
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>';

const els = {
  toggle: $('#enabledToggle'), fullTabToggle: $('#fullTabToggle'), readout: $('#readout'), uaString: $('#uaString'), pill: $('#livePill'),
  pillText: $('#pillText'), identityName: $('#identityName'), identityMeta: $('#identityMeta'), srcLabel: $('#srcLabel'), copyBtn: $('#copyBtn'), reloadBtn: $('#reloadBtn'),
  presetsPane: $('#pane-presets'), customUA: $('#customUA'), charCount: $('#charCount'),
  applyCustom: $('#applyCustomBtn'), useReal: $('#useRealBtn'), toast: $('#toast'), status: $('#statusMsg'), fullTabScope: $('#fullTabScope')
};

let state = { enabled: false, fullTabSpoof: false, tabSupported: false, tabId: null, mode: null, presetId: null, ua: null };
let toastTimer = 0;

init().catch(() => toast('Could not load saved state. Reopen the popup.'));

async function init() {
  const stored = await chrome.storage.local.get(['enabled', 'mode', 'presetId', 'ua', 'customDraft']);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state = { enabled: Boolean(stored.enabled), fullTabSpoof: false, tabSupported: false, tabId: tab?.id ?? null, mode: stored.mode || null, presetId: stored.presetId || null, ua: stored.ua || null };
  if (state.tabId != null) {
    const fullTabState = await chrome.runtime.sendMessage({ type: 'getFullTabState', tabId: state.tabId });
    state.fullTabSpoof = Boolean(fullTabState?.ok && fullTabState.enabled);
    state.tabSupported = Boolean(fullTabState?.ok && fullTabState.supported);
  }
  buildPresets();
  bindEvents();
  els.customUA.value = state.mode === 'custom' && state.ua ? state.ua : (stored.customDraft || '');
  updateCount();
  render();
}

function buildPresets() {
  for (const category of GROUP_ORDER) {
    const items = MASQUERADE_PRESETS.filter((preset) => preset.cat === category);
    if (!items.length) continue;
    const group = document.createElement('div');
    group.className = 'group';
    group.innerHTML = `<div class="group-head"><span class="dot" style="--dot:${CAT_COLOR[category]}"></span>${category}<span class="count">${items.length}</span></div>`;
    for (const preset of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'preset';
      button.dataset.id = preset.id;
      button.title = preset.ua;
      button.innerHTML = `<span class="preset-ic">${ICONS[category]}</span><span class="preset-meta"><span class="preset-name">${preset.name}</span><span class="preset-sub">${preset.sub}</span></span><span class="chip">${preset.chip}</span><span class="preset-check">${CHECK_SVG}</span>`;
      button.addEventListener('click', () => applyPreset(preset));
      group.appendChild(button);
    }
    els.presetsPane.appendChild(group);
  }
}

function bindEvents() {
  els.toggle.addEventListener('change', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'toggle' });
      if (!response?.ok) throw new Error(response.error);
      state.enabled = response.enabled;
      render();
      if (!response.enabled) toast('Override paused — using your real User-Agent');
      else if (!state.ua) toast('Ready — choose a preset or custom string');
      else { toast('Override active — reload pages to apply'); flashReadout(); }
    } catch (error) { els.toggle.checked = state.enabled; toast(error.message || 'Could not toggle the override.'); }
  });

  els.fullTabToggle.addEventListener('change', async () => {
    const requested = els.fullTabToggle.checked;
    if (state.tabId == null || !state.tabSupported) { els.fullTabToggle.checked = false; return toast('Full tab spoofing works on normal HTTP(S) pages only.'); }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'setFullTab', tabId: state.tabId, enabled: requested });
      if (!response?.ok) throw new Error(response.error);
      state.fullTabSpoof = response.enabled;
      render();
      toast(response.enabled ? 'Full tab spoof active — reload the page' : 'Full tab spoof disabled');
    } catch (error) {
      els.fullTabToggle.checked = state.fullTabSpoof;
      toast(error.message || 'Could not change full tab spoofing.');
    }
  });

  $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
    $$('.tab').forEach((item) => { const active = item === tab; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); });
    $$('.pane').forEach((pane) => pane.classList.toggle('is-active', pane.id === `pane-${tab.dataset.tab}`));
  }));

  els.copyBtn.addEventListener('click', async () => {
    const text = els.uaString.textContent;
    try { await navigator.clipboard.writeText(text); }
    catch { const textarea = document.createElement('textarea'); textarea.value = text; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); textarea.remove(); }
    toast('Copied to clipboard');
  });

  els.reloadBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id == null) throw new Error('No active tab found.');
      await chrome.tabs.reload(tab.id);
      toast('Tab reloaded');
      setTimeout(() => window.close(), 350);
    } catch { toast('This tab cannot be reloaded by the extension.'); }
  });

  els.customUA.addEventListener('input', () => {
    updateCount();
    void chrome.storage.local.set({ customDraft: els.customUA.value });
  });
  els.customUA.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') els.applyCustom.click(); });
  els.useReal.addEventListener('click', () => { els.customUA.value = navigator.userAgent; updateCount(); els.customUA.focus(); });
  els.applyCustom.addEventListener('click', applyCustom);
}

async function applyCustom() {
  const ua = els.customUA.value.trim();
  if (!ua || /[\u0000-\u001f\u007f]/.test(ua)) return toast('Use a non-empty, single-line User-Agent.');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'set', mode: 'custom', ua, networkEnabled: state.enabled });
    if (!response?.ok) throw new Error(response.error);
    await chrome.storage.local.set({ customDraft: ua });
    state = { ...state, enabled: response.enabled, mode: 'custom', presetId: null, ua };
    render(); flashReadout(); toast('Custom User-Agent applied — reload pages');
  } catch (error) { toast(error.message || 'Could not apply this User-Agent.'); }
}

async function applyPreset(preset) {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'set', mode: 'preset', presetId: preset.id, ua: preset.ua, networkEnabled: state.enabled });
    if (!response?.ok) throw new Error(response.error);
    state = { ...state, enabled: response.enabled, mode: 'preset', presetId: preset.id, ua: preset.ua };
    render(); flashReadout(); toast(`Masquerading as ${preset.name} · ${preset.sub}`);
  } catch (error) { toast(error.message || 'Could not apply this preset.'); }
}

function render() {
  const networkActive = Boolean(state.enabled && state.ua);
  const fullTabActive = Boolean(state.fullTabSpoof && state.ua);
  const active = networkActive || fullTabActive;
  const selection = state.ua ? MASQUERADE_UA_UTILS.describeUserAgent(state.ua) : null;
  els.toggle.checked = state.enabled;
  els.readout.classList.toggle('is-live', active);
  els.readout.classList.toggle('has-selection', Boolean(selection));
  els.pill.classList.toggle('is-pass', !active);
  els.pillText.textContent = networkActive && fullTabActive ? 'both live' : networkActive ? 'network live' : fullTabActive ? 'tab live' : 'pass-through';
  els.identityName.textContent = active && selection ? selection.label : 'Using real browser';
  els.identityMeta.textContent = active && selection
    ? selection.detail
    : selection
      ? `Selected but disabled · ${selection.label}`
      : 'No override selected';
  els.identityMeta.classList.toggle('is-warning', Boolean(selection && !selection.recognized));
  els.uaString.textContent = active ? state.ua : navigator.userAgent;
  els.uaString.title = els.uaString.textContent;
  els.srcLabel.textContent = active ? sourceLabel() : 'real browser identity';
  els.status.textContent = networkActive && fullTabActive
    ? 'Network + current tab use the selected identity'
    : networkActive
      ? 'New HTTP(S) requests use the selected identity'
      : fullTabActive
        ? 'Current tab JavaScript uses the selected identity'
        : 'Local-only · no browsing data collected';
  els.fullTabToggle.checked = state.fullTabSpoof;
  els.fullTabToggle.disabled = !state.tabSupported;
  els.fullTabScope.textContent = state.tabSupported ? 'Current HTTP(S) tab only · stays here' : 'Unavailable on this page';
  $$('.preset').forEach((button) => button.classList.toggle('is-selected', active && state.mode === 'preset' && button.dataset.id === state.presetId));
  if (state.mode === 'custom' && state.ua && document.activeElement !== els.customUA && els.customUA.value !== state.ua) { els.customUA.value = state.ua; updateCount(); }
}

function sourceLabel() {
  if (state.mode === 'custom') return 'custom string';
  const preset = MASQUERADE_PRESETS.find((item) => item.id === state.presetId);
  return preset ? `preset · ${preset.name} / ${preset.sub}` : 'preset';
}

function updateCount() {
  const length = els.customUA.value.length;
  els.charCount.textContent = `${length} / 512`;
  els.applyCustom.disabled = !els.customUA.value.trim() || /[\u0000-\u001f\u007f]/.test(els.customUA.value);
}

function flashReadout() { els.readout.classList.remove('flash'); void els.readout.offsetWidth; els.readout.classList.add('flash'); }
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600); }
