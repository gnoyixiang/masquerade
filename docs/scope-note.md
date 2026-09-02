# Scope note

## Objective

Create a loadable Chrome Manifest V3 extension that lets a user enable a custom User-Agent string or select defaults covering desktop, mobile, and tablet devices across several operating systems and browsers.

## In scope

- Presets for Windows, macOS, Linux, ChromeOS, iOS, and Android.
- Browser coverage for Chrome, Edge, Firefox, Safari, Opera, and Samsung Internet, plus optional crawler presets.
- Custom User-Agent entry with validation and a saved draft.
- Human-readable browser/device/OS classification for selected identities, with an unrecognized-string warning.
- Independent network and full-tab enable/disable toggles, persistent local state, badge state, copy action, and reload-active-tab action.
- Independent global network override and per-tab full spoof toggles. Full spoofing stays attached to the selected tab and does not follow active-tab changes.
- Best-effort Chromium Client Hint alignment/removal.
- Offline-safe popup UI and local validation tests.

## Out of scope

- Automatically following the active tab with debugger attachment.
- Per-site profiles, sync, remote preset updates, analytics, or a Chrome Web Store publishing package.
- Automated browser-level installation and network echo-site verification.

## Assumptions and constraints

- The project is created at `/Users/yxmini/Documents/masquerade`.
- The user accepts the broad host access required for an all-sites request-header switch.
- The user accepts the additional Chrome debugger permission required for full tab spoofing.
- This is an unpacked developer project; store icons are included, but publishing metadata is not.

## Definition of done

- The extension files are present and internally consistent.
- `npm test` validates the manifest, preset coverage, custom-UA constraints, DNR rule shape, debugger command path, and independent toggle behavior.
- `npm run package` creates a zip containing only loadable extension assets.
- `npm run build` runs the same validation suitable for CI.
- README explains installation, permissions, behavior, limitations, and testing.

## Residual risk policy

The implementation must call out that server-visible request headers and in-page JavaScript identity are different. Header behavior can also vary for browser-internal pages and sites that use additional fingerprinting signals.
