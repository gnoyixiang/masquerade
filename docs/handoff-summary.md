# Handoff summary

## Delivered

Version 1.2.2 refines the extension’s state visibility, identity selection behavior, and Custom-pane layout.

Masquerade is available at `/Users/yxmini/Documents/masquerade`. It is a standalone Chrome MV3 extension with 20 presets, custom input, independent global-network and per-tab-full-spoof controls, persistent state, human-readable identity classification, tab-aware badges, copy/reload actions, local icons, README instructions, tests, and a generated `masquerade.zip` package.

## Refinements from the supplied draft

- Removed remote Google Fonts and all remote runtime dependencies.
- Added bounded single-line User-Agent validation in both popup and service worker.
- Serialized dynamic-rule updates and only persist an identity after DNR accepts it.
- Reconciled invalid saved state on startup and prevented an empty toggle from pretending to be active.
- Saved custom drafts while typing and added tests for failure and concurrency behavior.
- Switched host access to explicit HTTP(S) patterns and documented the permission tradeoff.
- Added an explicit debugger-backed full-tab mode without active-tab following; it sends only `Network.setUserAgentOverride` and cleans up tab state on detach/close.
- Fixed the debugger handshake for newer Chrome builds with protocol-version negotiation.
- Preset and custom selection now preserve both toggle states instead of enabling Network override implicitly.
- Made Full tab spoof badges tab-specific and added a prominent browser/device/OS summary with warnings for unrecognized custom strings.

## Next manual check

Load `/Users/yxmini/Documents/masquerade` through `chrome://extensions`, choose a preset, enable either network override or full tab spoof independently, reload a normal HTTPS page, and check both a header echo tool and `navigator.userAgent`. Remember that other fingerprinting signals remain unchanged by design.

For tab behavior, enable full spoof on tab A, switch to tab B, and confirm tab A remains attached while tab B is unaffected by the debugger toggle. The global network switch remains independent.
