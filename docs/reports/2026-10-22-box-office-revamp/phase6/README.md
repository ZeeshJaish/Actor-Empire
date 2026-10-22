# Phase 6: tuning-2 follow-up snapshot

**Superseded by the [existing-distributor / full-world tuning-3 revision](../distributor-booking/README.md).** The measurements below are retained as historical evidence. Use the new report for current booking, rival-platform, calibration, save and performance results.

**The requested code fixes and desktop cinema verification pass. Physical-device/native testing remains untested; this is not a release approval.** The previous failed career harness and inconclusive global comparison remain in the [historical checkpoint](README-checkpoint-bb029e5.md). The current comparison uses stable `bb029e5` plus the exact same 69 unrelated dirty paths on both sides.

The follow-up fixes real StrictMode energy double charges/refunds, a benign-trait production crash, procedural co-star recognition lost after reload, unusable marketing increments for small reserved pools, repeated title-fact reconstruction and quadratic royalty receipt scans. No save-generation verification, previous-generation recovery or persisted-before-week-UI safeguard was removed. Schema 1 / tuning 2 and the normal v1 path remain unchanged.

- **226 real engine/save weeks pass:** 96 ordinary newcomer weeks, 104 weeks across four required existing-save styles, and 26 late-handoff weeks. Actual current jobs, applications and auditions fund the newcomer; no injected job, cash or guaranteed casting. First audition fails. The eventual opening is **$285,303.27 gross / $140,629.38 producer receipts**, with $41,211 personal cash and a living, funded character.
- **Full App passes:** fresh creation/wellbeing/job/application/quit/reload, the earned post-production save loaded in another runtime, real actor publicity and paid opening, plus a separately prepared owner's actual footprint/campaign/release/financial/IMDb flow. A $100K reserve permits five $10K allocations, returns its unused $50K once, and survives reload. No page errors or 320px horizontal overflow. This is not a claim that all 96 weeks were manually tapped or every unrelated game feature tested.
- **Payments and saves pass:** same-week replay, stale settlement, source immutability, failed promotion/retry, paid repeats, old paid facts, natural exit and signed handoff. Known co-star facts are saved by identity; irrecoverably missing legacy actor facts stay unknown. Historical money is not recalculated.
- **Balance passes:** 832 controlled treatments / 53,469 title-weeks / 23 tendencies, including worldwide access without exposure, targeted small films, good/weak stars, earned/unearned/weak crossovers, repeats, competition and streaming wait. These are conditional distributions, not game-wide hit rates. See [all 26 cases and gross/receipt/profit ranges](scenario-results.md) or [CSV](scenario-results.csv).
- **Verification:** 20 cinema suites and 10 affected existing audits pass, as do TypeScript, web build and the frozen English comparison (8,173 keys and 14,720 deterministic reaction cases). All 69 original unrelated dirty paths remain unchanged.

| Matched measurement | Before warm p95 | After warm p95 | Change |
|---|---:|---:|---:|
| Node early, trial 1 / trial 2 | 491.5 / 512.1 ms | 486.3 / 451.5 ms | -1.0% / -11.8% |
| Node late, trial 1 / trial 2 | 14.03 / 13.13 s | 8.26 / 7.66 s | -41.1% / -41.6% |
| Actual App early | 487 ms | 469 ms | -3.7% |
| Actual App late | 12.45 s | 6.83 s | -45.1% |

Node has 8+4 warm samples per fixture/side, with opposite trial order. Actual App has four warm weeks per fixture/side plus its first weekly calculation; initial page/fixture loading is excluded. It uses normal `index.tsx`/`App.tsx`, actual Age Up, verified IndexedDB before the displayed week and two animation frames. Medical alerts use the existing Later choice outside the timed interval. Both sides load the same authored JSON over ordinary HTTP; the audit clock respects the 500ms double-click guard. No concurrent heavy audit runs during measurements.

Comparable Node gameplay/money hashes match after omitting only the newly added `cinemaRecognition` and `cinemaCast` fallback metadata. App recorded saved week, cash, health, project count and cumulative tracked gross/receipts match. The **233–240MB stress saves remain heavy**: multiple-second latency and sampled retained Node heap around 3.5–3.7GB. These desktop samples meet the plan's <=10% regression gate; they do not prove mobile memory safety, native bridge/GPU performance or production percentiles.

[Detailed fixes, scope and caveats](followup-progress.md) · [Current verification matrix](verification-matrix.json) · [Measured performance](followup/performance-summary.json) · [Actual App facts](followup/app-results.json) · [Reproduction](followup/reproduce.md)
