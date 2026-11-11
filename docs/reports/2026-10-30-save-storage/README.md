# Faster, safer saves — 30 October 2026

Production retains the existing save layout and all independent financial/recovery checks. The selected improvements speed up the exact issued signature algorithm, avoid constructing an oversized optional mirror, and bind live promotion to the requested generation. The block-storage prototype remains disabled because it did not establish a performance benefit.

## Measured results

| Controlled retained-career storage check | Before | Selected production path |
| --- | --- | --- |
| Verified write, three observations | 2,343 / 2,019 / 2,050 ms | 1,338 / 1,194 / 1,166 ms |
| Independent verified load | 463 / 457 / 446 ms | 304 / 258 / 296 ms |
| Optional mirror, three alternating pairs at its actual 600,000-character budget | 97–118 ms | 6–9 ms |

The write mean decreased **42.3%** in this storage-only comparison. All three complete hydrated-player JSON SHA-256 values and original manifest digests matched before/after. These controlled writes add $10 only to distinguish successive test generations; they do not simulate or claim movie earnings. Input was a retained earned-career copy, not personal browser storage. Shared background jobs remained active; these are not p95 or quiet-device certifications.

The hash microbenchmark alternated baseline/variants over the same retained world. The selected native-quoting path was about 30% faster and produced the same issued digest. The independent frozen oracle passed **1,022 vectors**, including sparse arrays, control characters and lone UTF-16 surrogates.

Actual five-week app journey after the hash change: **4.043, 5.855, 3.999, 3.978, 3.980 seconds**. Final build including the optional-mirror improvement: **3.972, 5.617, 3.878 seconds**, with persisted week/cinema progression assertions. **The under-three-second target remains unmet.** Do not turn the observed app timings into a clean before/after percentage: source from other chats and system load changed during this work.

## Production changes

- `stableSaveHash.ts`: native JSON quoting for ordinary strings, the exact issued spelling for surrogate-containing strings, local loop state and separate bounded key/value quote caches. Signature versions and protected fields remain unchanged.
- `saveMirror.ts`: a bounded, conservative size witness for ordinary data. When the data already proves the optional mirror cannot fit, return the existing metadata-only plan before constructing a discarded full string. Small mirrors and explicitly supplied serializers retain their existing behavior. Authoritative IndexedDB saves still contain every record.
- `saveGenerations.ts` and the IndexedDB adapter: a candidate must match the requested digest during live single/batch promotion, in addition to verifying independently. Batch read-back also binds the requested digest.
- The physical store implementation is extracted to `indexedDbSaveGenerations.ts`. Candidate/current verification stays inside the locked transaction. Recovery verifies the actual stored previous generation before promotion. Public reads/export return complete logical players.

A fault test reproduced promotion accepting a different valid candidate after initial read-back. It failed before the digest binding and passed afterward; current/previous generations remain unchanged on rejection. This is a demonstrated gap, not an asserted explanation of the earlier reported 99-hour loss.

No earning formula, hard earning cap, movie budget, revenue split or payment amount was changed. No archive/history trimming or automatic storage migration is activated. Core screens were not made lazy, and weekly UI commit still waits for verified persistence.

## Why block migration is not activated

The retained input contains approximately 63 MB of world data and 2 MB of past projects. Archive-only extraction could not address most of the payload. The optional immutable-Blob prototype passed 19 correctness/corruption/import cases, but initial writes were 3.19–3.29 seconds. Native JSON and transaction-local reuse reduced steady writes to approximately 2.01–2.03 seconds, similar to the original 2.02–2.05 seconds, while initial conversion and loads remained slower.

Consequently `blockPayloads` is an explicit opt-in constructor option, false in production. The app keeps its existing structured-clone representation. The experiment and measurements remain available for future work; passing correctness tests does not authorize enabling that migration without a fresh benefit and compatibility review.

## Autosave attribution

The actual app trace ties the intervening AUTOSAVE to clicking **Continue** after a normal life-event choice. `resolveQueuedEventSafely` updates the player/event queue; the ordinary 750 ms autosave effect persists that decision. It is not a duplicate unchanged weekly save. Processed-week commits already suppress their immediate redundant autosave. Legitimate event, playtime, reward and purchase durability behavior was retained.

The optional mirror was a separate measured waste: on this 66 MB fixture, 266 rights, 131 world projects and 314 platform plans did not trip the old count heuristics. It constructed the full string and then discarded it. The new size witness makes the same metadata-only decision without that allocation. Its inspection bound limits optional work, not saved records or earnings.

## Actual application and recovery verification

The production build's normal Start → slot → Home/Career/Lifestyle → phone → BoxOffice/IMDb path passed. Financial amounts matched the settled source and the audience view rendered at 320 px without document overflow. Normal life-event options were selected through UI; no overlay was bypassed. Rapid double-click advances a single week.

The five-week run completed large-career quota-failure and verified-backup recovery tests. On the final build, three further large-career weeks and a real process restart retained cash, gross, processed week, record identities and archive content. Two attempts to combine all later fault checks in one browser run crossed the 2.5 GiB sampled worker limit and were stopped by the guard. They are retained as test-resource failures, not hidden or described as product corruption.

The same interrupted isolated large-career profile was then resumed in a fresh process. It loaded week 24 normally. A real candidate `QuotaExceededError` preserved committed cash/week/gross/records; corrupting current cash without its signature produced the normal **Safe backup found** flow and restored the verified previous generation. This final large-recovery phase passed with **zero page errors** and a sampled worker-tree peak of **1,272 MiB**. Final verification was deliberately phased to fit the memory budget; it is not a continuous long-session memory soak.

Evidence: [final weekly timings](evidence/final-week-week-timing.json), [week stages](evidence/final-week-successful-week-stages.json), [large recovery results](evidence/final-recovery-app-check.json), [quota protection](evidence/final-recovery-large-quota-protected.png).

## Other checks and limits

- All **22** save/archive/migration/market/payment/viewing suites passed, followed by the two focused mirror audits. This includes 16 career-preservation cases and 32 live box-office integration groups.
- macOS **system WebKit** passed 17 production storage/signature/recovery scenarios, including the independent issued UTF-16 oracle. This is supplemental engine coverage, not physical iPhone certification.
- Full root TypeScript checks and unchanged-config production Vite builds passed. Generated test bundles were moved from `.js` to `.bundle` so TypeScript no longer parsed duplicated generated programs; actual source coverage was not excluded. Earlier compiler-budget/resource failures remain recorded.
- Two concurrent naming-map inference errors were repaired with annotations only; normalized compiled JavaScript was identical. An intentionally incomplete legacy naming fixture received an explicit boundary type assertion, preserving the original legacy payload and runtime assertions.
- One own heavy worker ran at a time. Other chats/jobs were not stopped. The existing shared-load guard and 2 GiB heap / 2.5 GiB sampled process-tree limit were retained; global swap warnings are recorded rather than presented as quiet-system results.
- The iPhone 16 device check returned **unavailable**. No simulator was booted. Physical-device performance and the reported 99-hour career-loss incident remain unverified. Controlled test-profile interruption/recovery passed; that does not identify the historical incident's cause.

The tested final entry is `dist/assets/index-C4YR7r8u.js`; [artifact hashes](checks/final-build-artifacts.json) identify the actual bundle. Later concurrent naming edits to `projectInvestors.ts`, `fictionalNames.ts` and package scripts were preserved; browser results certify the named artifact rather than every subsequent unrelated edit. No commit, push, blanket reset or unrelated process termination was performed.

All 462 initially dirty/untracked files still exist; [preservation inventory](checks/preservation.json) distinguishes unchanged files and ongoing concurrent work. Test profiles and local retained fixtures were isolated from personal game storage. See [machine-readable results](results.json) and [implementation/decision log](../../superpowers/plans/2026-10-30-save-storage.md).
