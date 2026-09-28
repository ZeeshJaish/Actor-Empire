# Android startup release gate — phases 7–9

## Release invariant

Every launch must reach the title/save screen or display an actionable recovery surface with **Retry** and **Restart Game**. A silent black screen is never acceptable. Critical local startup does not require internet, but the recovery UI must never bypass a failed required task or expose Continue Offline.

No scenario below may delete, replace, migrate, or display an empty substitute for an undiscovered save.

## Automated gate

Run from the repository root:

```bash
npm run audit:android-startup-phase1-2
npm run audit:android-startup-phase3-4
npm run audit:android-startup-phase5-6
npm run audit:android-startup-phase7-9
npm run build
npx cap sync android
cd android
./gradlew testDebugUnitTest
./gradlew assembleDebug
```

Required result: every command exits successfully, the production startup bundle stays below its regression ceiling, and the Android APK is produced.

## Device matrix

Test at minimum:

- one Android Go or low-RAM device/emulator;
- one mid-range Android device;
- one current high-end Android device;
- the oldest Android/WebView combination supported by the store release;
- a current Android/WebView combination.

Keep at least one existing career in a save slot for upgrade/recovery cases. Record app version, Android version, WebView version, memory class and final startup checkpoint with each result. Never attach save contents.

## Scenarios

### Local and network isolation

1. Fresh install, enable airplane mode, launch.
2. Upgrade an installation containing an existing career, enable airplane mode, launch.
3. Block advertising, Firebase, font and CDN domains while leaving the local app available.
4. Interrupt Wi-Fi and mobile data during each visible startup checkpoint.

Pass: the packaged Zedbury/Actor Empire surface appears, local startup reaches the save screen when storage is healthy, and online services do not block it. If a real network-dependent task fails, the recovery actions remain Retry and Restart Game.

### Storage protection

1. Deny or make IndexedDB unavailable using WebView/DevTools test controls.
2. Delay the storage open beyond its deadline.
3. Relaunch with an existing career after the failed attempt.

Pass: storage failure never renders empty save slots, recovery states that careers were not changed, and the existing slot returns after storage is restored.

### Bundle, WebView and renderer recovery

1. Launch on the oldest supported WebView.
2. Interrupt/corrupt a debug copy of a required packaged asset.
3. Terminate the WebView renderer during Zedbury, storage and save-summary checkpoints.
4. Prevent the JavaScript entry bundle from starting in a debug fixture.

Pass: the HTML or native recovery surface replaces the failed view within the bounded deadline. Repeated critical failure recommends lightweight safe startup automatically. Retry and Restart Game remain usable at small phone heights.

### Lifecycle and input pressure

1. Background and resume during every critical checkpoint.
2. Rotate or trigger configuration changes where supported.
3. Tap Retry rapidly at least ten times.
4. Terminate the app during every critical checkpoint, then reopen it.
5. Complete a clean launch after a failed launch, then launch again.

Pass: background time does not create a false timeout, only one retry attempt runs, interrupted-launch count is bounded, and a successful first screen clears the restart loop.

### Memory pressure

1. Run on the low-RAM target with an existing large career.
2. Trigger Android trim-memory pressure during startup and after Home appears.
3. Repeat launch/recovery at least ten times without clearing app data.

Pass: no silent black screen, no save mutation, no unbounded restart loop, and no startup payload containing player data.

## Evidence to retain

- screenshot or recording of the final surface;
- final startup checkpoint and failure code;
- app/Android/WebView versions and memory class;
- renderer restart count;
- elapsed startup duration;
- confirmation that the known save slot remained intact.

Do not retain player names, balances, save JSON or other career contents in diagnostics.
