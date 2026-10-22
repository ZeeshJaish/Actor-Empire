# Fair box office — Phase 5

Phase 5 connects Greenlight/release forecasts, finance reports, IMDb audience insights and new movie streaming bids to the shared cinema results. Task 9 is checkpointed at `5640278`; Task 10 is the following scoped local checkpoint. Nothing has been pushed.

Cinema access remains capacity, not guaranteed awareness or sales. Forecast scenarios run the same market kernel with visible information; they grant no money. Reports distinguish public gross, producer receipts, costs, profit and recorded actor backend. IMDb tags require audience evidence and do not multiply demand or change numerical ratings.

New movie rights bids value reachable incremental households in the offered countries and dates, subtract observed overlap, decay old interest, and respect buyer cash after obligations. Budget recovery and theatrical-gross multiples do not set a bid floor. A buyer can decline; the title then archives without an invented payout. Signed contracts retain their original terms.

Waiting interest competes inside an already funded, playable streaming catalogue. Production, premiere, country, language and route entitlement must be ready. It creates no automatic subscriptions, starts or ticket cash. Signed country windows also inform theater waiting behavior without implying worldwide availability.

## Verification

The final code was tested in an isolated archive of `5640278` plus the explicit Task 10 files. All 77 pre-existing unrelated dirty paths matched their original hashes.

| Check | Result |
| --- | --- |
| 14 cinema audit suites | 212 passing assertions/groups |
| Rights transactions and calendar | Passed |
| Original readiness | 28/28 |
| Original playback → receipts → Finance/replay/reload | Passed |
| World streaming WE6 | Passed, including 400 annual checkpoints |
| TypeScript and production build | Passed |
| Frozen English baseline | 8,173 keys; 14,720 reaction cases unchanged |
| Browser journey | Greenlight → actual production → release → seven actual weeks → financial detail → IMDb; no page errors |
| Narrow layout | 320px viewport and document scroll width both 320px; screenshot inspected |

The browser uses a separate authored QA career and never accesses a real save. Natural theater exit and exactly-once save recovery are verified by actual-week integration audits. The WE6 timing is a desktop synthetic regression measurement, not a device or career performance guarantee. Existing build chunk-size and Browserslist warnings remain.

See [Task 9](task9.md), [Task 10](task10.md), [machine-readable verification](verification.json), [final browser transcript](phase5-browser.txt) and the explicit task file manifests.

## Remaining calibration

Phase 6 still owns the contrasted 768 conditional scenarios, broad career/save soaks, forecast coverage and device profiling. Rights parameters are documented assumptions, not externally calibrated economics: two contribution months at a 35% margin, a 70% maximum value share, an 8% buyer cash allocation, 3% weekly intent decay and a bounded 25% waiting-preference lift. All live in `CINEMA_RIGHTS_PROFILE` for measured tuning. A maximum weekly observed household count is a conservative overlap lower bound, not a measured lifetime unique audience.

Numerical IMDb redesign, series economics and cinema ownership screens remain outside this phase. Save-generation promotion and persisted-before-UI ordering were preserved.
