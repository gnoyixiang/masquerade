# Research brief

## Findings

- Chrome's Manifest V3 `declarativeNetRequest` API supports dynamic `modifyHeaders` rules. The `set` operation can replace an existing request header, and `user-agent` is explicitly supported by the API's request-header rules.
- Header modification requires `declarativeNetRequest` (or its host-access variant) plus host permissions for the requests being modified. This project keeps the broad access explicit because the core promise is a browser-wide switch.
- MV3 extension pages use a local-script CSP by default. The popup therefore ships without remote fonts, remote scripts, analytics, or network calls.
- The extension can change outgoing request headers, but it cannot change the page's in-page `navigator.userAgent` value through the supported MV3 APIs. Client Hints are handled on a best-effort basis for Chromium-shaped presets.
- Chrome's `debugger` API can attach to a tab and send CDP's `Network.setUserAgentOverride`, including User-Agent metadata returned by `navigator.userAgentData`. It requires the powerful `debugger` permission, so the feature is explicitly opt-in and tab-scoped. The implementation negotiates stable protocol versions because current Chromium builds may reject the legacy `0.1` value shown in the API reference.

## Sources

- [Chrome declarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Chrome permission declarations](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome MV3 content security policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [CDP Network.setUserAgentOverride](https://chromedevtools.github.io/devtools-protocol/1-3/Network/)

## Decision

Use a dependency-free, unpacked MV3 extension named Masquerade. Keep all presets in a readable JavaScript data file, store the selected mode locally, and apply one dynamic DNR rule containing the current header mutations.
