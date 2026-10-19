# Streaming catalogue scale repair — 20 October 2026

Second performance repair on `codex/streaming-tap-lag`. Rollback checkpoint `9905a9a` / `checkpoint-lazy-load-fix` is untouched. The comparison baseline is first repair `693c84d`, not the original unoptimized main.

## Result

The repeated multi-second catalogue work behind Market/auction screens has been removed. Active screens read one current catalogue batch. Pure navigation, query drafts and auction-clock updates preserve relevant read models. Wizard steps persist immediately without full blueprint validation on navigation. Authoritative purchases, bids, launch and commission still validate the actual current player.

## Comparable CPU/SSR measurements

Same disposable fixture: 197 markets filed through normal services and exactly 52 or 104 purchased licences. One warmup plus three samples; values are median milliseconds. No career storage is accessed. These measure computation/server rendering, not tap-to-screen latency, App persistence or native-device performance.

| Work | Titles | Before | After |
|---|---:|---:|---:|
| HQ | 52 | 2086.38 | 59.86 |
| HQ plus bidding room after timer tick | 52 | 2055.81 | 5.63 |
| Define wizard | 52 | 536.29 | 78.85 |
| Isolated bidding room | 52 | 2.52 | 2.39 |
| HQ | 104 | 4968.68 | 103.29 |
| HQ plus bidding room after timer tick | 104 | 4901.28 | 7.63 |
| Define wizard | 104 | 1327.49 | 109.60 |
| Isolated bidding room | 104 | 3.41 | 3.11 |

Step-only service updates fell below this timer’s resolution (previously 1.31/2.20 ms). This is not a claim that saving costs literally zero time.

Full availability, opening-catalogue and launch-readiness output hashes match at both sizes. Build/customer forecast outputs also match byte-for-byte at both sizes after route preparation reuse.

## Browser and actual-save verification

Actual Anshu bisnoi, slot 2, Year 15 Week 1: 52 licensed titles and 197 filed/under-review countries. Tested market search/clear, fixed-price title detail, Rights/Deal/Interest, all seven Define stages and all four Build stages. Normal reload recovered Define review step and a temporary one-rack Build draft. Restored that rack to zero. Company treasury remained $39,995.3B; no title purchase, commission or week advance was performed. The save remains pre-launch with real clearance/store/pricing/rehearsal gates visible.

There was no live title auction available in the actual save. Live auction timer, rival activity and bid controls were therefore exercised on disposable 52/104-title production fixtures. Ten bid edits per size painted in 2.8–13.1 ms (52) and 4.3–16.9 ms (104), with no post-reset long task during that observed room window. Normal no-sale settlement also returned to Market with no rights or money moved.

Production Market detail plus tabs: 9.9–27.8 ms at 52 titles and 9.8–29.3 ms at 104. Market entry from the already-prepared source gate at 104 was 24.1 ms. Nine repeated tabs at each size produced no observed long task. These are small desktop double-frame samples, not field INP or a broad p95 claim.

Warm Define navigation across all stages at 104 titles was 12.3–36 ms; first entry was 208.2 ms and the first Ident visit 91.5 ms. Initial/async forecast work still produced 193/89/160 ms long tasks in that window. At 52, first entry was 149.6 ms and the second full navigation cycle was 12–30.6 ms.

Build’s first open remains heavier: 445 ms at 104 titles in the final production lab. Draft edits painted in 10.2–100 ms; initial draft creation also triggered a separate 422 ms forecast task, then repeated saved edits produced roughly 86–97 ms tasks. This remaining cold forecast/network work is explicitly not called instant. The original multi-second auction freeze and repeated whole-catalogue passes are resolved; a universal zero-latency or native-device green light would be unsupported.

## Safety and regression checks

33 distinct audit suites passed, including new active-screen/read-context/presentation-input/wizard-navigation tests, existing auction and collection settlement, launch filing/UI, build rehearsal/autosave, content rights, playback readiness, save integrity, migration, UI state and save-generation recovery. TypeScript and production application/QA builds pass. Vite retains its existing large-chunk warning.

One expanded economy audit remains failing: `audit:streaming-economy-balance-fixes`, case `forecast reserves the final non-owner across rental and purchase` (52,617 vs 1). Running the identical audit against the production source of `693c84d` produces the exact same complete result JSON, including this failure. It predates this repair. No economy formulas were changed to silence it.

Review identified hidden-overlay and welcome-backdrop issues plus a legacy draft-presence invalidation edge; all three were corrected. No remaining findings from the focused static reviews. Follow-up design-hook triage preserved the existing CSS: four Inter body-font warnings received value-specific exceptions scoped to these two stylesheets, and the two 2px contract/status-message rails received a side-tab exception scoped only to streaming-content-market.css. Reasons are recorded in .impeccable/config.json. A pre-existing decorative-grid advisory in streaming-hq.css remains standing; no runtime UI/design changes were made.

## Implementation boundaries

- HQ models resolve synchronously only when consumed; opaque rooms do not render the dashboard underneath. Static imports remain.
- One caller-owned catalogue context reuses normalized platform/countries, resolved titles, route matrices and derived views. No global or persisted authorization cache.
- Forecast world offers prepare title positions, commercial offers and active-country membership once per synchronous read. Fresh batches preserve canonical grants, expiry, ownership conflicts, inactive-country denial metadata and changed pricing.
- Relevant immutable read inputs survive known trusted UI sanitation and navigation/clock-only changes. Unknown canonical fields, real bids/reservations, money, rights, pricing, world/week and market changes invalidate.
- Build customer forecasts retain reuse across edits to an existing uncommissioned drawing. Null/present legacy draft transitions invalidate. Rehearsal/commission use current canonical data.
- Normal autosave, durable recovery generations, market timers and transaction validation remain enabled.

Reproducible commands: `npm run benchmark:streaming-catalogue-scale -- after`; `node scripts/benchmark-streaming-scale-baseline.mjs`; `npm run audit:streaming-active-screen`; `npm run audit:streaming-catalogue-read-context`; `npm run audit:streaming-world-offer-read-context`; `npm run audit:streaming-presentation-inputs`; `npm run audit:streaming-wizard-navigation`; `npm run lint`; `npm run build`.

Machine-readable medians, samples, output hashes, browser observations and suite outcomes: [evidence JSON](2026-10-20-streaming-catalogue-scale-evidence.json).
