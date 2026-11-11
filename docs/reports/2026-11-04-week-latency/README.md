# Weekly latency and older-save compatibility — 4 November 2026

Safe incremental changes are implemented and the focused correctness checks pass. **The under-three-second target is NOT achieved. A consistent whole-app speed improvement has not been demonstrated.** Keep that distinction when describing this update.

## Actual app results

These are tap-to-ready-screen measurements with a durable, verified IndexedDB save. They use an isolated retained career, real production bundles, normal event/clinic/navigation flows, and a reload check. No forced GC, mid-session restart, gameplay RNG patch, capital grant, or weakened persistence barrier is used in these UI runs.

| Run | Weeks | Median | p95, nearest rank | Range |
| --- | ---: | ---: | ---: | ---: |
| Unchanged task-start source | 12 | 3.240s | 3.495s | 2.945–3.495s |
| Optimized pipeline before the final missing-`replaceAll` fallback | 40 | 3.175s | 3.442s | 2.709–3.737s |
| **Exact final build** | **12** | **3.390s** | **4.957s** | **3.116–4.957s** |
| Exact final build, missing APIs, 2× CPU slowdown, 512MiB JS heap | 3 | 7.267s | 7.299s | 6.962–7.299s |

The final native run includes its slow seventh turn; it is not removed as an outlier. Its internal weekly diagnostic recorded 3.567s while the full observed interaction took 4.957s. This does not establish the cause of the additional interaction/presentation delay. The original baseline had a shared swap-growth warning; final guarded verification and UI runs recorded zero swap growth. Runs have different unseeded normal events and shared-machine conditions, so their differences do not establish a causal regression or improvement.

The forty-week sample is a preceding artifact and is not substituted for the final build's result. With twelve observations, nearest-rank p95 is the maximum; this is not a reliable estimate of every career/device's tail latency. The reduced-CPU run demonstrates exercised fallback functionality, not physical-device speed.

[All timings and artifact identities](latency.json) · [Final source/build hashes](artifact-manifest.json)

## Retained implementation

- `saveCompaction.ts` classifies each history row once. A single immutable world-window protection index serves one compaction call; each platform gets its own copy before adding local paid rights, pending settlements, and award obligations. Duplicate-ID ordering, existing terminal limits, authored records and output remain exact. The retained fixture's world-window scans fell from five to one; a five-row unit case requires five protection checks rather than ten.
- `firebaseService.ts` makes expensive full-player size measurement an explicit diagnostic option (`measure_save_size: true`). Routine weekly diagnostics perform zero complete-player size encodes. Explicit, sampled, stale and unknown sizes are labelled accurately. Complete preparation, signing and stored-current verification continue independently.
- `saveIntegrity.ts` computes an old signature's original issued projection once, instead of walking current-schema career content first and then rebuilding the old projection. The frozen v4 case performs zero later-schema career walks while still rejecting changed money. All old schema verification rules remain in place.
- `runtimeCompatibility.ts` runs before application modules. Exact-pinned `core-js-pure@3.51.0` supplies missing `structuredClone`, `Array.at` and `String.replaceAll`; `Object.hasOwn` gets a small equivalent fallback. Existing native implementations retain their original function identity. Build syntax targets are explicitly Safari 15 and Chrome 80. Native iOS 15 / Android 7 deployment minimums are unchanged.

The Safari gap is real: the [WebKit Safari 15.4 release notes](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/) introduce structured cloning, `Array.at` and `Object.hasOwn`. Removing those APIs from the frozen baseline reproduced Startup Recovery. The final app starts, progresses and reloads with those APIs and `String.replaceAll` missing, including the pure-JS clone path with `PerformanceMark` removed.

Android OS version alone does not identify its installed WebView engine. The bundle targets Chrome 80 syntax; ancient WebViews and physical Android 7/iOS 15 devices are not certified by this run. Existing styling and every device-specific keyboard/layout behavior were not audited as part of this change.

No earning formula/cap, save storage layout, digest schema version, protected-field coverage, atomic write protocol or retention limit changed in this task. The existing schema-5 writer and original schema-1–4 readers remain in place. A completed screen still waits for the verified durable save.

## Verified safety

| Check | Result |
| --- | --- |
| 25 focused integrity, archive, migration, stock, settlement, royalties, identity, diagnostics and viewing suites | PASS |
| Final root TypeScript and production build, compiler heap ≤2048MiB | PASS |
| Native and missing-API clone/type/alias/cycle/sparse/date/buffer/replacement edge cases; native APIs preserved | PASS |
| Twelve full-player old-source/new-source weeks, including manifests, money, receipt facts, prior-player immutability, RNG calls and clock | EXACT |
| Same twelve-week career through the missing-API JS clone fallback | EXACT |
| Nine actual IndexedDB atomic cases in Chromium and nine in macOS system WebKit | PASS |
| Frozen issued schema-4 body/signature retained exactly as backup after upgrade | PASS |
| Old built app → final built app → original reader, with independently observed durable menu saves | PASS |
| Actual final app quota failure at physical current write | Previously committed week, money, cinema facts and records retained |
| Corrupted current save → normal Safe Backup recovery UI | Previous verified generation restored |
| Reloads, double-click guard, career/lifestyle/phone/box-office navigation in exercised UI runs | PASS, zero page errors |
| Preservation audit of 924 initially dirty files and 845 runtime/config files | No missing or unexpected changes |

The app update roundtrip preserved 37 film records and 200 authored posts, complete protected projections and authored-content SHA-256. Restart comparisons include producer, owned business, NPC studio, talent and streaming treasury facts. The large UI career's dynasty archive is empty; populated archives and detailed authored records are covered separately by the frozen atomic/native fixtures and the sixteen-check career-preservation suite. This is not a claim that every real ninety-nine-hour save has been tested.

[Focused checks](checks/regressions.json) · [Sequential app/storage checks](checks/safety.json) · [Complete-player parity](checks/complete-player-parity.json) · [Fallback parity](checks/legacy-clone-full-parity.json) · [Unrelated-work preservation](checks/preservation.json)

## Resource use and discarded experiments

Only one task-owned heavy worker ran at a time; other chats were left running. Admission required at least 30% free memory; the guard aborted below 20%, above 2560MiB sampled owned-tree RSS, or on shared swap growth over 512MiB with free memory below 30%. Compiler heaps were at most 2048MiB. These are sampled process-tree measurements, not a cap on all applications on the Mac.

- Final types/build/regression sequence: peak owned-tree RSS **2287.3MiB**, swap growth **0**.
- Final twelve-week app run: peak **1778.6MiB**, swap growth **0**.
- Sequential fallback/parity/Chromium/WebKit/update/recovery sequence: peak **2019.9MiB**, swap growth **0**.
- Native-vs-fallback full career replay: peak **1352.2MiB**, swap growth **0**.

The invocation-local cinema key-sort cache was reverted byte-for-byte after a retained-data pair failed to improve performance. A throwaway UTF8/Wasm hash and another canonical-fingerprint serializer also matched compared output but were slower on retained world data. Neither prototype entered application source. `stableSaveHash.ts` and `boxOfficeIdentity.ts` match the task-start snapshot exactly. The package and lockfile contain only the one added pinned compatibility dependency; npm's unrelated peer-metadata churn was removed.

Resource logs and rejected paired experiments are retained under [checks](checks/).

## Remaining acceptance work

1. The **under-three-second end-to-end target remains unmet**, including the exact final artifact. Component work reduction is not a whole-app speed claim. The remaining cost includes the weekly world calculation, complete protected projections, durable storage and occasional interaction/presentation delay. Further work must retain full verification and previous-good rollback; publishing an early UI success is not an acceptable shortcut.
2. Physical iOS 15 / Android 7 device testing, including WebView version and keyboard/recovery UI, remains unverified. Capability removal, CPU throttling and current macOS WebKit do not replace it.
3. No new sixty-minute continuous session or ninety-nine-hour physical-device/save certification was performed. The forty-week UI run lasted about 4.84 accelerated minutes; the exact final twelve-week run lasted about 1.60 minutes.

Changes are local. No commit, push or deployment was performed in this task.
