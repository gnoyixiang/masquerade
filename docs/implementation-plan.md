# Implementation plan

1. Keep the dependency-free MV3 manifest and DNR service worker, adding the explicit debugger permission needed for full-tab mode.
2. Add independent global-network and per-tab-full-spoof state, serialized debugger operations, session tab tracking, cleanup on detach/close, startup restoration, debugger protocol-version negotiation, and tab-aware badge state.
3. Add CDP UA and Client Hint metadata generation with clear limitations for non-Chromium presets.
4. Update the popup with two independent switches and explicit current-tab scope, without active-tab following; preserve toggle states when identities change and show a prominent derived identity summary with warnings for unrecognized strings.
5. Extend Node mocks/tests for combined toggle states, debugger attach/command/detach behavior, and packaging.
6. Run tests and packaging, inspect the final file list, and record evidence in the verification report. Leave the live Chrome smoke test documented for the user because Chrome itself is not launched by the repository checks.
