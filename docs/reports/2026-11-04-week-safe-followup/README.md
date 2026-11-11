# Safe weekly optimization — 4 November 2026

**The bounded optimization and browser verification are complete. The continuous-hour test passes for stability, but consistent under-three-second latency is still unmet.** The observed same-host gain is modest. All slow observations, preliminary runs and resource interruptions are retained. Physical older devices remain unverified.

## Retained changes

Only two production files changed from the preceding verified artifact:

1. `services/boxOffice/boxOfficeMarket.ts`: construct the exact issued v2 fingerprint JSON directly, instead of building a parallel canonical object tree and repeatedly serializing nested arrays. Integer-index key enumeration, locale ordering, sparse/undefined slots, omission, Unicode and all issued fingerprints remain exact. A bounded key-quotation cache is local to the invocation and stores only strings, not protected player data or hashes.
2. `services/boxOffice/boxOfficeLiveSettlement.ts`: the player-only synchronous owner consumes its already-detached private next-market state. Public proposals and the diagnostic getter retain the independent market copy; changing an exposed proposal's next-market cells/runs cannot change the settled player. Authority, cents conservation, ownership, replay, receipt and save verification remain in place.

No save format, digest schema, API fallback, earning formula, hard cap, archive-retention rule, dependency or early-screen-publication change is included.

## Final measurements

| Comparison | Before | After | Scope |
| --- | ---: | ---: | --- |
| Fingerprint median |214.29ms|168.59ms|Alternating algorithms on the same retained input in one Node process; all8 identities exact; controlled GC between component measurements |
| Same-host built-app median |3.181s|3.120s|ABBA order,6 UI weeks/run,12 turns/build, identical signed initial fixture; normal unseeded UI events |
| Same-host built-app p95 |3.624s|3.609s|Nearest-rank p95 of12 observations is the maximum; this is a small sample and not a statistically established tail improvement |
| Final continuous-hour desktop run |—|Median2.999s/p953.607s/max3.865s|65 UI weeks in60.021 actual minutes;33/65 turns under3s; final normal reload passes |
| Same-host missing-API/2×CPU/512MiB-heap median |7.209s|6.832s|3 weeks/build, same signed initial fixture; separate sequential runs, limited sample, not physical-phone evidence |
| Final-build missing-API/2×CPU/512MiB-heap smoke |—|7.558–8.113s command wall|3 weeks, navigation and reload; zero page errors; functionality passes,3s target does not |

The same-host app median improves by about61ms in these observations. A component gain is not a large end-to-end speedup. The prior artifact's earlier2.943s p95 confirmation came from different shared-host conditions and is not reused as a current pass. An initially slower whole-loop CPU profile is also retained: unchanged stages slowed as well, motivating the same-host app comparison.

An initial hour attempt was deliberately stopped for the A/B investigation after8 measured weeks/about2.79 recorded minutes; no page errors were observed, but it is **not** a completed-hour result. Its raw stored finances, authored content and last committed cinema week1900 were subsequently reopened through old→new→old readers and preserved exactly.

The subsequent unchanged-artifact run completed **60.021 actual minutes and65 UI weeks**, including game-year rollover, regular Career/Lifestyle/phone/BoxOffice navigation, records checks and final normal reload. No forced GC, mid-session restart or mid-session reload was used. All65 timings remain included. Final reload preserves the tracked cash, gross, records, archives and posts and does not repeat payments. The fixture retains37 film records and200 authored posts. This is one retained career on desktop Chromium, not every possible career or a phone certification.

Primary timing includes the automation/input queue through real verified save commit and two-frame painted readiness. The initial older-API smoke and the later matched pair ran under different host conditions; the later lower figures do not erase the earlier8.1s observation. No statistically established physical-device speedup is claimed.

[All latency cases](latency.json) · [Continuous-hour raw observations](../../../output/playwright/2026-11-04-safe-followup-hour-final/results.json) · [Exact tested artifact/source manifest](artifact-manifest.json)

## Completed safety checks

-35 focused suites and the full root TypeScript check pass. New regressions were observed failing before production edits, then passing: repeated nested-object serialization13→0, private full-market copy1→0/public copy remains1.
-12 native and12 missing-API checkpointed career weeks each match the complete verified task-start output: whole-player SHA-256, save-manifest digest, receipts, cash, RNG count and clock. Every prior player remains immutable. Baseline provenance verifies all901 task-start source/config hashes against the preceding artifact. These bounded replays are not continuous UI/session measurements.
-Real minified production build passes, main entry `/assets/index-BCSTCJCG.js` (SHA-256 `ca37266d35977d6c936fb78d1c5ff58fe68ba7d4895bc54127382f2d0d91abfe`). Test-only probes are absent.
-Nine Chromium and nine macOS system WebKit atomic-save cases pass.
-Actual previous built reader→new built writer→previous built reader passes, including protected/authored-content comparisons.
-Actual final-app storage-full rollback and corrupted-current Safe Backup recovery pass.
-The deliberately interrupted final-build QA profile retains its last committed week and full protected/authored facts through actual old→new→old UI saves and reader restarts.
-Completed app cases retain37 existing film records and200 authored posts. Populated archives and detailed content are separately covered by the focused preservation suites; the large UI fixture's dynasty archive is empty.
-All901 tested source/config hashes are still exact; all runtime sources predate the tested build. All1121 initially dirty files remain present, with no unexpected changes. Only the two production files and the existing test-only audit loader changed from that initial set; the new regressions/reports are separate additions.

[Safety groups](checks/safety.json) · [Suites/types](checks/regressions.json) · [Baseline provenance](checks/baseline-provenance.json) · [Native parity](checks/complete-player-parity-native.json) · [Fallback parity](checks/complete-player-parity-legacy.json) · [Same-host comparison](checks/same-host-ab.json) · [Interrupted-save recovery](checks/interrupted-reload.json) · [Preservation](checks/preservation.json) · [Completion assertions](checks/completion.json)

## Resource handling and limits

One task-owned heavy worker runs at a time. Other chats/jobs remain untouched. Runtime/test process trees have a2560MiB sampled RSS guard; the existing production build runner retains its2048MiB compiler/3072MiB process-tree guard and512MiB swap-growth stop. Admission was strengthened to45% free memory for replay batches,50% for types/app tests and55% for the build.

Three earlier long test/type/replay batches were stopped for shared swap growth with low free memory. Completed suites were resumed, and exact replay was split into short checkpoint batches. A1536MiB compiler attempt exhausted its heap; the full2048MiB type check then passed. No safety assertions were removed to achieve a pass. Resource failures and the slower/partial observations remain in the logs.

Completed build peak owned RSS was2349.95MiB, swap growth0. Completed browser safety sequence peak was1663.63MiB, swap growth0. The continuous-hour worker peaked at2160.66MiB, with1627.37MiB global swap growth recorded as a warning, without a sampled abort-threshold breach. The full type check also had a722.12MiB global swap warning; do not describe the entire task as swap-free. These are sampled task-process measurements, not total Mac memory or an attribution of shared swap to this worker. All task-owned heavy workers are now stopped.

Physical iOS15/Android7 performance and compatibility remain unverified. Missing-API emulation and current macOS WebKit do not certify those devices. Code remains local; no commit, push or deployment was performed.
