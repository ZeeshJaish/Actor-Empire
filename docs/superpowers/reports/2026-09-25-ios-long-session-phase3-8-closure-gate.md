# iOS long-session Phase 3–8 closure gate

Date: 2026-09-25
Status: **NOT RELEASE-VERIFIED**. Archive domain migration remains disabled.

## Changes in this continuation

- Added an opt-in, empty-root archive migration foundation. It validates owner/root consistency and is idempotent; no player history collection is shortened. The existing save generation remains authoritative after a simulated staging failure.
- Made archive export inspect every canonical save slot against its verified generation, including a public read with a missing archive marker. Legacy whole-file export now fails closed instead of silently omitting an archive-backed career.
- Extended signed transfer audits to multi-chunk, multi-slot, interrupted writer, corrupt chunk, and incomplete-root cases.
- Structurally share immutable `industryProductions` and `talentBookings` during the initial weekly draft. Added a differential test comparing the optimized week with the prior full JSON-clone result, including frozen terminal production and booking records. This reduces initial copying but does not remove the whole-player clone.
- Added a focused TypeScript check for the weekly transaction audit.
- Fixed the soak harness bootstrap so the randomly generated `NPC_DATABASE` starts from the same seed in each Node process. Two independent 52-week runs now produced identical saved/runtime JSON bytes and state counts; their wall time and sampled heap still vary normally. A 104-week paired run passed when the simulator's mutable global NPC database was reset between branches.

## Automated results

| Gate | Result | Meaning |
| --- | --- | --- |
| 468 weeks with save preparation each week | Pass: 468/468, 25,983,362 runtime JSON bytes, 309.30 ms p95 week | Code-side nine-year regression only; Node heap is not iPhone memory. |
| 468 weeks with deterministic startup seed and save preparation each week | Pass: 468/468, 25,993,973 runtime JSON bytes, 286.17 ms p95 week | Current repeatable nine-year save-path check. |
| 1,000 weeks before latest clone-sharing additions | Pass: 1,000/1,000, 31,963,425 runtime JSON bytes, 344.18 ms p95 | Very close to the 32 MB test ceiling; not evidence of bounded growth. |
| 1,000 weeks after latest clone-sharing additions | **Fail**: 1,000/1,000 advanced, 32,424,508 runtime JSON bytes, 391.11 ms p95 | The fixture has run-to-run output variation; clone sharing does not itself bound runtime state. This release gate is not green. |
| 1,000 weeks with deterministic startup seed | **Fail**: 1,000/1,000 advanced, 32,089,823 runtime JSON bytes, 362.26 ms p95 | Reproducible fixture; 7,085,280 bytes of terminal production history remain hot. |
| 1,040 weeks (20 years) | **Fail**: 33,226,422 runtime JSON bytes; 7,220,540 bytes of terminal production history | Phase 3 hot-state bound is not met. |
| 1,040 weeks with deterministic startup seed | **Fail**: 1,040/1,040 advanced, 32,478,843 runtime JSON bytes; 7,265,600 bytes of terminal production history | Reproducible 20-year gate; bounded hot state is not yet implemented. |
| 104-week frozen shared-domain soak | Pass: all weeks advanced with `industryProductions` and `talentBookings` deeply frozen on entry | Detects direct writes to shared data in this fixture; does not prove all career states. |
| 468-week frozen shared-domain soak | Pass: all 468 weeks advanced with the two shared domains deeply frozen | Broader ownership regression, still not a replacement for mature-career physical peak-memory testing. |
| Archive foundation, migration, transfer, save integrity, save transfer, week/save safety, iOS pressure/recovery Swift and TS audits | Pass | Test fixtures only; not device end-to-end proof. |
| Focused TypeScript checks, Vite production build, `git diff --check` | Pass | Build checks do not validate memory or user-visible recovery. |

The two earlier 1,000-week runs did not produce identical state counts because `NPC_DATABASE` was generated before the per-week RNG seed was installed. They are not comparable before/after measurements. The seeded 1,000-week result is the current code-side gate. Wall-time and Node-heap figures remain non-deterministic and are not iPhone measurements.

## Release blockers

1. No archive domain has passed complete writer/reader eligibility. `industryProductions` still has late references; X and Instagram screens and actions read or truncate hot arrays directly. Moving history now could lose content or change gameplay. The signed root/index and archive-aware UI must be completed domain by domain before activation.
2. `processGameWeek` still creates a broad initial player draft. Sharing two more immutable domains lowers one allocation but is not the requested stage-level copy-on-write transaction. Mature deterministic parity, injected failure rollback, and peak-memory comparison remain.
   `applyMusicArtistNpcEarnings` also mutates module-global `NPC_DATABASE` outside the Player transaction; that side effect must be made per-career/rollback-safe before Phase 4 is complete.
3. A 20-year deterministic fixture fails its hot-state ceiling. The 1,000-week pass is close to the ceiling and is not a scalable fix.
4. Only a paired iPhone 16 is visible to CoreDevice, and no physical Android device was connected during this QA pass. The older physical iPhone tier is unavailable. The virtual-device startup checks below do not replace 30/60/120-minute physical gameplay, memory-warning, WKWebView termination, background-during-save/week, full signed backup round trip, or zero-black-screen evidence.
5. Native Android/iOS archive-backed import/export must pass a full device round trip with corrupt/missing chunk and interrupted promotion before the migration flag can be enabled.

Do not describe Phases 3–8 as complete or ship archive-backed saves until these gates pass. Existing production app and real save containers were not overwritten by this continuation.

## Virtual-device QA addendum (2026-09-25)

- Created an isolated Xcode iPhone SE (3rd generation), iOS 26.2 simulator: `F6418232-5530-4469-8DFA-C58017D01B6F`. Built and installed a separate `com.zeeshapps.actorempire.qa.sim` Debug app. The Xcode simulator build succeeded and the app launched to a visible Actor Empire screen; later screenshot remained visible. An optional notification prompt remained in front, so this is a startup smoke test, **not** an iOS career/save/recovery round trip.
- Created an isolated Android 36.1 Medium Phone AVD in `/private/tmp/actor-empire-qa-avd/Actor_Empire_QA_API_36_1.avd`, with 2 GB configured RAM. The pre-existing `Medium_Phone_API_36.1` AVD already had Actor Empire installed and was not overwritten. The fresh AVD was verified by `adb emu avd name`, was empty before installation, and received the Debug APK. Gradle `:app:assembleDebug` succeeded.
- Android QA advanced from splash to Start Career, empty save slots, and Create Your Star. The initial launch briefly showed a dark transitional frame and logged `startup_failure code=native_first_screen_timeout` at 15:55:19, then `checkpoint=first_screen_ready` at 15:55:24 and rendered the menu. The JS-side `first_screen_ready` checkpoint had been emitted around 15:55:19. This is evidence of a slow-emulator watchdog/bridge acknowledgement race, not proof that a player-device black screen is fixed; inspect the 30-second deadline in `MainActivity` before release.
- Re-ran code audits: iOS weekly transaction, renderer recovery, save/pressure, archive transfer contract/export/import, and iOS native save-transfer session all passed. Those audits do not substitute for a mature-career native import/export or long-session physical run.
- No real iPhone app or save was installed over or changed. No archive domain was activated. Simulator startup and Android onboarding do **not** close the Phase 3/4 state-growth and transaction-ownership gates, the native signed-backup round trip, or Phase 8 physical 30/60/120-minute memory and renderer verification.
