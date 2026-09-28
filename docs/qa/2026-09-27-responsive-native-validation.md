# Native responsive-core validation — 2026-09-27

This check isolates the Phase 1 `ui-layout/` primitives. Both QA apps load the synthetic `scripts/fixtures/responsive-layout-qa.html` page from the local Vite server; neither opens a player save or replaces the installed `com.zeeshapps.actorempire` game. The distinct QA bundle/package ID is `com.zedfury.layoutqa`.

| Platform | Native host | Runtime | Measured result | Evidence |
| --- | --- | --- | --- | --- |
| iOS | Separate Swift `WKWebView` app on `Actor Empire QA - iPhone SE` simulator | iOS 26.2; executable targets iOS 15.0 | PASS; 351px stat container → 2 columns, 296px action container → 2 columns, targets ≥44px, no document overflow | `responsive-native/ios-26-2-iphone-se-wkwebview.png` |
| iOS | Separate Swift `WKWebView` app on iPhone 17 Pro Max simulator | iOS 26.2; executable targets iOS 15.0 | PASS; 408px stat container → 4 columns, 296px action container → 2 columns, targets ≥44px, no document overflow | `responsive-native/ios-26-2-iphone-17-pro-max-wkwebview.png` |
| Android | Separate Java `WebView` app on `Medium_Phone_API_36.1` emulator | Android API 36.1 | PASS; 387px stat container → 2 columns, 296px action container → 2 columns, targets ≥44px, no document overflow | `responsive-native/android-api-36-1-webview.png`; `ActorEmpireLayoutQA` logcat entry at 22:21:07 |

The synthetic Chromium browser audit separately passed boundary widths 199/200/407/408 for stat columns and 295/296 for action columns, plus representative phone widths and a short height. The first wide-iPhone run was letterboxed because the QA app lacked iOS launch-screen metadata; after adding `UILaunchScreen`, reinstalling, and rerunning both iOS simulators, the measured viewport correctly covered both the two- and four-column branches. The native screenshots validate the actual WebView engines at their available viewport sizes; they do **not** establish full game-screen correctness.

Open compatibility gates:

- No iOS 15 simulator runtime is installed; compiling with a 15.0 deployment target does not prove iOS 15 runtime behavior.
- The owner's iPhone 16 current-versus-expected Home reference remains deliberately deferred for Phase 0.
- Neither native QA host exercises a real Actor Empire screen. Phase 2–3 changes require subsequent app-level iOS/Android checks.
