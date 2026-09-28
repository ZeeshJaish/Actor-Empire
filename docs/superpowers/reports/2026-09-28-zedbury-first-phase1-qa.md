# Phase 1 — Zedbury-first startup and navigation QA

Date: 2026-09-28

Status: **Web implementation and career-loader polish verified in the shared checkout; native release gate open.** No deployment, commit, or real career mutation was performed.

## Implemented

- The static HTML shell, React studio ident, Android splash, and iOS splash now use the same exact Zedbury vector on black. A lightweight bootstrap starts App loading behind the ident, plays it once, and removes the extra 650 ms wait.
- The Start Career menu is gated on all 12 visible game-screen modules. Nested region maps and detailed country geometry are also ready before play. Obsolete route-level `React.lazy` fallbacks and navigation-time screen preload jobs were removed.
- A selected save opens a separate actor-themed indeterminate loading scene. It reports verifying, preparing/migrating, persisting (only when needed), and entering Home without borrowing startup's 100%. Existing verified-load, recovery, and persistence rules remain in place.
- After the later approved UI simplification, the startup loader shows one status/percentage row without decorative people art. The selected-career scene now uses a lightweight animated scene-card deck, one stage line, and rotating tips; reduced-motion preference suppresses deck animation. Save-opening work has not moved into the startup loader or vice versa.
- A failed screen-code fetch holds the menu. Its Retry safely reloads the document because browser module-import failures cannot reliably be retried in the same document. Storage retry behavior remains unchanged.

## Evidence

- Production web build, first-frame, bootstrap, screen gate, detailed-map gate, code-failure/retry, selected-career/navigation, intro-flow, startup, map, save-integrity, save-generations, save-migration, save-recovery, and large-save audits passed.
- Android `:app:processDebugResources` and iOS `ibtool` launch storyboard compile passed. The Android/iOS raster splash artwork was visually inspected, but no Android device or booted iOS simulator was available to verify the actual operating-system first frame.
- On isolated synthetic small and long careers, first Home → Career was **9 ms** at normal CPU and **40–42 ms** at 4× CPU; first Home → Phone was **6 ms** and **54–70 ms** respectively. No page-code loader or new UI-module request appeared after Start Career. The Phase 0 baseline for first Phone was about 309–323 ms with the loader visible.
- Production-preview Start Career paint measured **2.19 s cold / 1.97 s warm** at normal CPU and **6.04 s cold / 4.92 s warm** at 4× CPU. These are local browser measurements, not device guarantees. The cold preview transferred about 3.85 MB of JavaScript and 1.61 MB of CSS across 39 JS and 5 CSS resources. A single Chromium heap sample was collected; it is not a peak-memory measurement.
- Content Market click times stayed near the Phase 0 baseline, as expected: Add Content ~387–389 ms normal / ~1.57 s at 4× CPU; bid-room entry ~585–592 ms normal / ~2.37–2.39 s at 4× CPU. These are Phase 2 work, not hidden Phase 1 fixes.
- Full-repo `tsc --noEmit` exceeded Node's default 4 GB heap. With an 8 GB heap, Phase 1 files type-checked; three unrelated existing test-script diagnostics remain in `audit-ios-long-session-soak.ts`, `audit-responsive-phase5-lifestyle-browser.ts`, and `audit-responsive-phase5-nested-mobile-browser.ts`.
- The later career-loader change passed the current production web build, synthetic-save career/navigation browser audit, 320/390 px visual audit, reduced-motion check, intro-flow audit, save-integrity, save-generations, and save-migration audits. The tip rotation was observed during a longer fixture wait.
- A freshly built, isolated `com.zeeshapps.actorempire.qa.sim` iOS 26.2 simulator app did **not** pass launch: its embedded WebKit content process crashed and the native recovery overlay remained visible. Simulator reboot and ad-hoc signing did not resolve it. The crash report shows `EXC_BAD_ACCESS/SIGBUS` inside `dyld_sim` before app JavaScript; Safari and a separate QA WebView app both rendered in the same simulator. This evidence does not yet establish whether the cause is app packaging or a simulator-specific runtime issue.

## Release gate still open

- Resolve the iOS simulator WebKit startup failure and repeat the native Zedbury-first/Start Career launch sequence. Check Android launch on an actual device or usable emulator; `adb` was unavailable in this run. Do not infer mobile readiness from the web build.
- A pre-change cold-start/peak-memory baseline was not captured before the Phase 1 code change. Current preview metrics are documented above; they must not be represented as proof of a cold-start regression comparison.
- Market responsiveness, copy/layout, and price balance remain Phases 2–4.
