# Weekly pipeline optimization — verified 29–30 October 2026

The measured repeated work has been removed without changing the calculated week, money, randomness, or prepared save. The total Next Week latency target of under three seconds is **not achieved**. This is a completed optimization and safety-verification pass, not a claim that the remaining large-save storage delay is solved.

## Changes

- Reuse the historical title index within an explicitly immutable streaming read batch. Public reads, a new batch, and another player's context still read fresh data.
- Index royalty funding and purchase/rental entitlements by platform and country once per close. Preserve original source order, including zero-value rows and receipt ordinals.
- Group cinema audience-report cells by country once per title rather than scanning every cell for every country.
- Prepare the protected save projections twice rather than three times. Compare and sign from freshly computed projections within the same synchronous operation; no caller-supplied cached projection is accepted.

Exactly seven production files changed in this pass. See [the optimization-only patch](checks/optimization-only.patch), which compares against the pre-task dirty checkout rather than HEAD. Existing signature versions, detached source/rights checks, candidate read-back, atomic promotion, independent verification and previous-good recovery remain in place. There is no archive storage migration, truncation, earning cap or balance adjustment in this pass.

## Matched retained-career measurements

Two alternating before/after pairs used aligned source snapshots: all shared work was identical except these seven optimized files. The retained career is approximately 70 MB. Values below are Node measurements, not browser/device timings.

| Stage | Before, two runs | After, two runs |
| --- | --- | --- |
| Weekly computation | 5,030–5,257 ms | 3,446–3,675 ms |
| Verified save preparation | 810–821 ms | 536–595 ms |
| File-store verified write | 771–776 ms | 814–816 ms |
| Independent file-store reload | 465–466 ms | 452–476 ms |

Mean computation decreased **30.8%** and mean preparation decreased **30.6%**. Storage I/O did not improve. Do not include the independent reload test in the normal weekly-write total or treat these two pairs as p95 evidence.

All four runs produced the same complete player JSON SHA-256, complete prepared-player JSON SHA-256, financial digest, 3,545,704 RNG calls and final controlled clock. These comparisons include the full result, rather than only a selected profit field. See [paired results](checks/final-pairs.json).

Cost regressions also demonstrate the intended scaling: historical collection is shared within a batch, global funding scans fall from four to one, entitlement membership reads fall from 54,000 to 400 in the exercised production path, audience-report membership work falls from 7,200 to 288, and save-preparation career projections fall from three to two. Frozen independent oracles retain exact output/order comparisons.

## Rendered app verification

The production Vite build and normal Start → existing slot → Home path passed in a disposable browser database using a retained signed career copy. No personal browser save storage was opened.

- First five actual UI weeks: **5.375, 8.675, 5.444, 5.297, 5.400 seconds**.
- Rebuilt artifact, three further UI weeks: **6.857, 10.074, 6.868 seconds**.
- Latest navigation paint observations: **21–113 ms** for the tested Career/Lifestyle/Home routes.
- Financial report figures matched settled gross, producer receipts, paid costs and collected profit; IMDb audience insights rendered at 320 px without document overflow.
- Rapid double-click advanced and settled a single week. Normal reload retained cash, gross, processed week, project identities and archive content.
- An injected real IndexedDB candidate quota failure left the current week/cash/gross/records intact and displayed the failed-week protection dialog.
- Corrupting current cash without its signature triggered the normal Safe backup found UI; Recover Safe Save restored the prior verified generation.
- Both full browser runs reported no page errors.

These are observations under authorized competing background load, not a controlled browser before/after comparison. They do **not** establish an end-to-end speedup over the previously reported 6.6–10.2 seconds. Browser stage traces locate verified write/promotion at approximately **2.3–3.0 seconds**, with latest preparation another **1.1–1.2 seconds**. This persistence stage includes verification and structured cloning, not only physical disk I/O. One intervening AUTOSAVE is visible before the second latest weekly turn; its triggering interaction and scheduling need separate attribution before calling it redundant or changing durability behavior.

See [latest actual app observations](evidence/latest-app-check.json), [successful stages](evidence/latest-successful-week-stages.json), [metadata-only storage operations](evidence/latest-successful-storage-ops.json), and [failed-save protection](evidence/latest-storage-failure-protected.png).

## Safety checks and memory

All **20 closeout regression suites** passed, including 16 career-preservation cases, 32 live-integration groups, original signature/recovery tests, signed royalties, early/late viewing replay and commercial-economy checks. After concurrent source updates, nine focused suites passed again. The former viewing-parity audit required deleted temporary fixtures; a portable equivalent was added, retaining early/late immutability, replay and purchase-entitlement assertions rather than silently dropping that coverage.

Full root TypeScript checks passed at a 2 GiB heap; no scope was excluded. Attempts at 1 and 1.5 GiB hit compiler heap limits, not product failures. Production Vite compilation passed with the same minification/configuration; this run invoked Vite directly under the shared-load guard rather than claiming the npm build wrapper passed.

Only one own heavy worker ran at a time, with no subagents. The user explicitly allowed the other Claude workspace jobs to continue; none were stopped. Earlier unconditional global-swap guards interrupted some attempts because other jobs grew system swap. The documented shared-load guard retained the 2 GiB heap ceiling, tightened sampled own-tree RSS to 2.5 GiB and free-memory floor to 20%, recorded swap growth above 512 MiB, and stopped on that growth if free memory fell below 30%. Latest build/browser passed but recorded global swap warnings; they are not quiet-machine certification. Maximum sampled own-tree RSS across successful build/browser checks was about **2.35 GiB**. Short tests with no RSS sample do not imply zero memory usage.

## Source and remaining limits

The tested rebuilt entry is `dist/assets/index-C8gh93Bv.js`; [artifact hashes](checks/verified-build-artifacts.json) identify its exact output. All seven optimized source files stayed unchanged through final browser/types/focused checks. Concurrent YouTube changes to `services/youtubeLogic.ts`, `services/youtubeEconomy.ts` and package scripts happened after that build. They were preserved. The browser result therefore certifies that named artifact, not every later unrelated edit to the shared tree. Current root types and the later focused safety checks passed; continually rebuilding while another chat edits would not create a stable whole-tree release certificate.

All 331 initially dirty/untracked files still exist: 325 stayed byte-identical, two include this task's optimizations, and four contain concurrent work that was preserved. Other concurrently edited, initially clean files were also left in place. No reset, stash, checkout, commit, push or unrelated process termination was performed. See [preservation inventory](checks/preservation-closeout.json).

The next measured target is large-save persistence: separate immutable archive storage/serialization work from current weekly state, with equivalent signatures, atomic generation switching, backup recovery, crash/quota testing and complete record access before migration. That storage change was deliberately outside this approved pass. Do not remove verification, delete archives, skip payments, or defer durable settlement merely to claim a timing threshold. Native device performance and the reported 99-hour career loss have not been reproduced or certified here; data already absent from every surviving backup cannot be reconstructed by this optimization.

## Repeating a focused source check

The new audits can be bundled individually using the project's existing esbuild dependency and run sequentially, for example:

```sh
./node_modules/.bin/esbuild scripts/audit-ai-catalogue-read-batch.ts --bundle --platform=node --format=esm --loader:.csv=text --loader:.css=empty --outfile=/private/tmp/actor-ai-catalogue-audit.mjs
node --max-old-space-size=512 /private/tmp/actor-ai-catalogue-audit.mjs
```

Apply the same approach to `audit-royalty-source-index`, `audit-save-preparation-projections` and `audit-cinema-country-scaling`. The retained-career profile/viewing/browser checks also need their explicitly supplied local retained-career fixtures. Resource guard source and per-check observations are retained under `checks/`; do not run multiple heavy jobs together.
