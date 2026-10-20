# Streaming 1,040-title stress test — 20 October 2026

Verdict: **not ready for 1,040-title operation.** The optimized bidding room remains responsive at the retained 1,000-title boundary, but the test reproduced long wizard/build blocks and a catalogue projection/retention limit. No production game logic, cap, rights validator, economy or career save was changed.

## Test conditions

Source: `8d761d8` on `codex/streaming-tap-lag` (same game source as performance commit `6e326c3`). Local desktop in-app browser, production Vite build, normal viewport, no CPU/network throttling. CPU work was not run concurrently with headline browser measurements. Browser first-paint figures are double-requestAnimationFrame observations, **not field INP or full action completion**; main-thread long tasks were recorded separately.

The disposable fixture starts with the existing 104 normally acquired licences, then adds **936 distinct released historical titles** using explicit global subscription licences and canonical rights-contract records. No inflated UI counter, repeated project IDs or user save edit. This is a bulk-seeded stress/boundary fixture, not a simulated history of 1,040 normal UI purchases. Initial counts: 1,040 distinct titles/references/licences, 1,064 total canonical world contracts, 197 filed countries. JSON input size: 10,566,888 bytes.

Fixture construction ran in Node (~14.7s including boundary preparation) and was excluded from interaction timings. The browser loads this generated JSON from a disposable preview directory. Only the disposable auction's wall-clock origin is rebased when it loads; prices, bids, ownership and duration are unchanged.

## Confirmed retention/playability boundary

- `OWNED_STREAMING_CATALOG_REFERENCE_LIMIT = 1_000` in [ownedStreamingPlatform.ts](../../../services/ownedStreamingPlatform.ts#L209).
- Normalization, `migratePlayerSave(JSON round-trip)` and a real auction timer update each retain **1,000** references/licences from the 1,040 input: **40 are removed from the local projections**.
- The 40 dropped licences still have active canonical world contracts. These records were not deleted from the world registry. The resulting opening view still enumerates **1,040 titles**, but only **1,000 available**. This is a mismatch between title/rights projections and availability, not evidence that all 1,040 survived as playable titles.
- Examples of affected paid titles from the normally acquired prefix: The Glass Kingdom, Night Ferry, Dark Map Remembered. Their canonical contracts remain present.
- Reference and local-licence sets stay aligned with each other (zero mismatched IDs); the problem is the truncation and disagreement with retained canonical ownership/history.
- The browser QA summary was changed to display **requested**, **actual references** and **actual licences** independently. After the first auction tick or Define update it visibly changes to “1040 requested · 1000 references · 1000 licensed”. A static 1040 badge would hide this failure.

The boundary audit intentionally exits 1 because retaining all requested titles fails. Do not report subsequent 1,000-title room/warm-flow measurements as a passing sustained 1,040-title test.

## Measured CPU/SSR work

One warmup and three measured samples, median milliseconds. The 104-column comes from the previous same-source performance report; the large fixture also increases canonical-rights record count, so this is a practical scale comparison rather than an isolated title-array microbenchmark.

| Work | Previous 104 titles | 1,040 input stress fixture |
|---|---:|---:|
| HQ | 103.29 ms | 948.23 ms |
| Define wizard | 109.60 ms | 785.05 ms |
| HQ + room | see previous evidence | 20.88 ms |
| HQ + room after real tick | 7.63 ms | 19.69 ms (1,000 retained) |
| Isolated room | 3.11 ms | 7.57 ms |

The Node process read ~1,683 MiB heap / ~1,344 MiB RSS at the end of multiple render samples. This is aggregate benchmark-process evidence, not a browser-memory measurement or a demonstrated leak.

## Production browser results

| Interaction | Observed result |
|---|---|
| Bid controls, ten edits | 5.4–13.7 ms paint; no long task during the reset window. Timer/rival bidding advanced. Actual catalogue had already compacted to 1,000. |
| Market entry | 309.4 ms paint / 307 ms long task |
| Market shelf from source gate | 59.7 ms paint / 56 ms long task |
| Fixed-price detail | 31.1 ms paint |
| Rights/Deal/Interest, nine tabs | 9.9–16.1 ms paint |
| Broad shared-library search “the” | 100 results; additional **864 ms long task**. The click-only metric panel does not assign an input-to-paint value to this search. |
| Define first entry | **2,466.7 ms** paint; 1,268 and 1,180 ms tasks in that window |
| First Ident visit | **1,888.7 ms** paint in a window containing asynchronous forecast work; not isolated Ident-component CPU time |
| Warm full Define cycle | approximately 54.5–215.8 ms for steps; all seven stages opened |
| Build first entry | **5,442.1 ms** paint / **5,437 ms main-thread block** |
| First network draft creation | first paint 35.7 ms, followed by **5,608 ms long task** |
| Four repeat saved rack edits | first paint 17–21.8 ms, followed by **601–709 ms tasks** |
| Money/Test/Launch stage navigation | 15.6–23.7 ms paint; all stages displayed; unmet commissioning gates stayed enforced |

This confirms why a fast initial button reflection can still feel frozen immediately afterward. Reversible rack edits were made only in the disposable fixture. No commission, real-save title purchase or real-save week advance was performed. Browser console error capture was empty during the tested flow.

## Profile-backed cause and next repair

A bounded Node inspector capture of Build showed the dominant stack:

`StreamingPlatformHQ → forecastWorldStreamingBuildDemand → forecastWorldStreamingLaunchPricing → getOwnedStreamingProgramEntries → getStreamingContentAvailability → createStreamingCatalogueReadContext → normalizeOwnedStreamingPlatformState → normalizeCatalogLicense`

`getOwnedStreamingProgramEntries` in [streamingOriginals.ts](../../../services/streamingOriginals.ts#L495) calls availability separately for every entry at line 582 and only consumes `.available`. The caller supplies neither a shared read context nor `includeRoutes=false`, so every title prepares a fresh full platform/catalogue and route matrix. The forecast and world-offer paths each call the programme reader. At around 1,000 titles this introduces roughly quadratic licence-normalization work. The inspector run took ~10.7s with profiling/Node overhead; the browser's direct measured first-open block is 5.437s, which is the relevant user-facing observation.

Recommended order before claiming 1,040 support:

1. Preserve coherent references/licences and canonical ownership across the >1,000 boundary; make any intended product limit explicit and reject/prevent overflow before charging. Verify reload, purchases, active windows, renewals and recovery at 1,000/1,001/1,040. An unreviewed cap increase alone does not establish safe scalable operation.
2. Extend the current caller-owned catalogue read batch into `getOwnedStreamingProgramEntries` and its forecast/world-offer callers. Skip unused route matrices where the reader only needs title-level availability. Keep authoritative route/transaction checks fresh.
3. Keep catalogue/rights inputs stable across uncommissioned network draft edits while separately updating current network/rehearsal/commission gates. This targets the 0.6–0.7s post-paint recomputation.
4. Profile and reduce repeated shared-library search/rights preparation; retest broad queries after that change.

These are recommendations from the stress test. Production fixes have not been applied in this test-only turn.

## Reproduction and evidence

`node_modules/.bin/esbuild scripts/benchmark-streaming-stress.tsx --bundle --platform=node --format=cjs --loader:.csv=text --loader:.css=empty --outfile=/tmp/benchmark-streaming-stress.cjs`

`node --max-old-space-size=6144 /tmp/benchmark-streaming-stress.cjs`

`node_modules/.bin/esbuild scripts/audit-streaming-stress-boundary.ts --bundle --platform=node --format=cjs --loader:.csv=text --outfile=/tmp/audit-streaming-stress-boundary.cjs`

`node /tmp/audit-streaming-stress-boundary.cjs` — expected current failure, exits 1.

For the production browser lab build `scripts/fixtures/streaming-tap-performance.html`, copy the generated `/tmp/streaming-stress-1040-player.json` into the preview output root, and open `?titles=1040` or `?titles=1040&room=1`. It never reads/writes career storage. Missing generated data produces an explicit error.

[Machine-readable evidence](2026-10-20-streaming-1040-stress-evidence.json) contains sample values, counts, boundary IDs, and profile summaries. The real local game at port 5174 and Anshu's saved career were not used for seeding this stress test.
