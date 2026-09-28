# Android Startup Phases 1-2 Design

## Goal

Eliminate the device-specific Android black screen before the Zedbury ident and replace the artificial loading delay with observable, retryable startup work. Existing intro visuals and save data must be preserved.

## Phase 1: Local-first boot surface

- Compile Tailwind into the application bundle instead of loading `cdn.tailwindcss.com` synchronously.
- Remove startup Google Fonts, import-map, AdSense, and missing stylesheet requests from `index.html`.
- Use the existing packaged Anton and Archivo font files for startup artwork.
- Render a minimal inline boot shell inside `#root` before the JavaScript bundle executes. It is a safety surface, not a replacement design, and React replaces it as soon as the app mounts.
- Initialize Firebase telemetry only after the React root has rendered. Web ads remain optional and must be requested lazily by the ad service.

## Phase 2: Real startup coordinator

Startup tasks are explicit and monotonic:

1. `APP_CORE` - the React app mounted.
2. `STORAGE` - IndexedDB opened and save keys were read.
3. `SAVE_SUMMARIES` - lightweight slot summaries were assembled without hydrating careers.
4. `FIRST_SCREEN` - state is ready to leave the loading surface.

Each task has `PENDING`, `RUNNING`, `READY`, `FAILED`, or `TIMED_OUT` state. Weighted progress only advances when real work advances and never regresses.

The Zedbury ident keeps its approved 1.47-second timing. The Actor Empire loading screen follows it and remains only while critical local work is incomplete. There is no 8.6-second artificial progress animation.

If storage fails or times out, the loading screen displays a recovery card with Retry. Failed storage must never be represented as three empty save slots. Retry reruns the failed local startup work. If the JavaScript bundle itself cannot mount, the pre-React shell exposes a separate reload action after a bounded wait.

## Reliability constraints

- Startup does not require internet.
- Firebase, ads, tracking permission, and other optional services cannot gate navigation.
- Existing saves are never deleted, overwritten, or parsed in full during boot.
- Duplicate React effects and repeated retry taps cannot run concurrent startup attempts.
- Diagnostics identify the failed task and attempt without including save payloads.

## Verification

- Coordinator unit tests cover success, monotonic progress, failure, timeout, retry, and stale-attempt rejection.
- Build output is checked for local compiled CSS and an HTML entry point with no external blocking scripts or styles.
- Existing intro-flow and startup-performance audits continue to pass.
