# Verification report

Date: 2026-09-02

## Checks

- `npm test` — passed. Validated the MV3 manifest, local CSP, 20 unique presets, requested device/browser/OS coverage, UA length/control-character rules, identity classification and unrecognized-string warnings, Custom-pane overflow and scrollbar styling protections, Chromium and Safari header behavior, mocked DNR rejection, serialized worker updates, debugger attach/command/detach behavior, protocol-version fallback, tab-aware badges, and independent toggle states.
- `npm run build` — passed. This intentionally aliases the dependency-free validation suite.
- `npm run package` — passed. Created `masquerade.zip` from the loadable extension assets only.
- `unzip -t masquerade.zip` — passed. All 11 archive entries were readable with no compression errors.
- `node --check background.js ua-utils.js presets.js popup.js` — passed.
- Manifest JSON parse — passed.
- Icon inspection — passed. PNGs are present at 16, 32, 48, and 128 pixels.
- Final source review — passed; debugger access is limited to the explicit `Network.setUserAgentOverride` command and tab-scoped cleanup paths.

## Not verified here

Chrome was not launched with the unpacked extension in this environment, so live server echo behavior, Chrome permission UI, and restricted browser-internal pages still need a manual smoke test after loading the folder.

## Residual risks

- A storage write failure after a successful DNR update could briefly desynchronize persisted state and the active rule; the next worker startup reconciles the rule from storage.
- The packaged zip is generated from an explicit asset list and passes integrity checks, but packaging freshness is not compared against source mtimes.
- Full-tab spoofing requires the powerful `debugger` permission and is intentionally limited to the tab selected when the user enables it. It does not automatically follow active-tab changes.
