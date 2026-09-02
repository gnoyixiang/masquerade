# Masquerade Privacy Policy

Effective date: 2026-09-02

Masquerade is a local-only Chrome extension for testing how websites respond to
different User-Agent identities. This policy explains what Masquerade handles
when you install and use it.

## Data we collect

Masquerade does not collect, transmit, sell, or share personal information,
browsing history, page content, cookies, credentials, form data, or analytics.
It does not operate a remote service and does not use advertising or tracking.

## Data stored locally

Masquerade stores the selected User-Agent, custom User-Agent draft, and the
Network Override and Full Tab Spoof toggle states in Chrome's local extension
storage. This information remains on your device and is used only to provide
the extension's features. You can remove it by uninstalling the extension or
clearing its extension storage in Chrome.

## Permissions and host access

- `storage` stores the extension preferences described above locally.
- `declarativeNetRequestWithHostAccess` applies the selected User-Agent and
  best-effort Client Hint request-header changes when Network Override is
  enabled.
- `http://*/*` and `https://*/*` host access lets those request-header changes
  apply across normal HTTP(S) websites. Masquerade does not read, record, or
  transmit the URLs, requests, responses, or page content involved.
- `debugger` is used only when Full Tab Spoof is explicitly enabled for the
  current tab. Masquerade sends Chrome DevTools Protocol's
  `Network.setUserAgentOverride` command to that tab and does not inspect its
  DOM, JavaScript, cookies, credentials, request bodies, or response bodies.

## Remote code

All Masquerade JavaScript is included in the extension package. Masquerade does
not load or execute remote JavaScript or WebAssembly.

## Changes and contact

This policy may be updated when Masquerade's data practices change. The current
version is maintained in the [Masquerade GitHub repository](https://github.com/gnoyixiang/masquerade).
For questions, please open an issue in that repository.
