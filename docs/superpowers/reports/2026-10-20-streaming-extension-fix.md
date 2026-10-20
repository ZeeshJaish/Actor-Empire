# Streaming catalogue extension repair — 20 October 2026

The multi-second catalogue/Build freeze is substantially reduced, and all 1,040 acquired title records now survive normalization, reload and an auction tick. The bidding room remains responsive with all 1,040 retained. Cold wizard entry is still measurable; this is not a claim that every streaming interaction is below 100 ms.

The requested checkpoint was pushed before production edits: **`9d770f3`**, message `checkpoint lazy load extension fix`, tag **`checkpoint-lazy-load-extension-fix`**, on `codex/streaming-tap-lag`.

## What caused the remaining delay

Programme and forecast readers repeatedly normalized the complete platform and its 197 country profiles for individual titles. Some consumers also built full country/plan playback matrices when they needed only a title-level availability flag. Shared-library search separately prepared the platform/rights context for each result. Build render computed a saved/compacted player merely to obtain a configuration signature; draft edits invalidated catalogue work even when rights and filed countries were unchanged.

The earlier 1,000-record cap compounded this: a 1,040-title input silently lost 40 local licences and references during normalization, migration or auction updates. Canonical world contracts survived, so a displayed 1,040-title enumeration did not establish that every licence remained usable.

## Changes

- Durable catalogue references, local licence records, starter references and explicit country lists no longer use rolling history caps. Planning drafts retain their separate 1,000-item bound. Active local licences can repair missing references; terminal-only licence history does not resurrect expired/transferred catalogue links. Unknown legacy country strings and financial rows keep their previous validation semantics.
- Programme, offers, launch forecast, opening coverage and launch-summary readers share an explicit current catalogue/platform context. Title-level readers skip unused route matrices, and the HQ preview stops after eight playable titles. Equivalent global licensed route decisions are shared within one current batch; owned, mixed-territory and country-specific positions retain their normal checks.
- Each library search prepares compatibility once. Purchase and settlement paths still validate against current rights rather than a cached UI result.
- Immutable Build draft changes reuse catalogue-only projections when all relevant rights, world, pricing, markets and title inputs are equal. Current launch/network/rehearsal views recompute. A read-only canonical infrastructure forecast replaces full player save/compaction during render; action handlers still use the normal save and validation path.
- Save durability, processed-week persistence, current/previous save recovery and transaction idempotency were not deferred or removed. No economy tuning or CSS redesign was included.

## Matched stress input and measurement limits

Baseline: [1,040-title stress report](2026-10-20-streaming-1040-stress.md), source `8d761d8`, which has the same production source as checkpoint `9d770f3`. The after run uses the exact same JSON input: **10,566,888 bytes**, SHA-256 **`f62e4cb54f867fd1e6d40b72aa169d2167c64e596f70da075199350bfa12f13c`**. It contains 104 normally acquired titles plus 936 distinct bulk-seeded released titles with explicit global subscription licences, 1,064 canonical world contracts, and 197 filed countries. The actual Anshu save was not seeded.

Production desktop in-app browser, normal viewport, no CPU/network throttling. Browser timings are event-to-double-frame observations, not field INP or full action completion. Long tasks are captured separately, including work after the first paint. QA state updates are memory-only and exclude App persistence; the actual career was separately checked through normal game UI. No benchmark CPU jobs ran concurrently with headline browser measurements. Browser figures are observations from finite flows, not statistical p95 claims. Market/room captures preceded the final launch-helper-only batching; Define and Build were retested after that integration.

## Before versus after: 1,040 requested titles / 197 filed countries

| Interaction | Before | After |
|---|---:|---:|
| Market entry, first paint | 309.4 ms | 163.4 ms |
| Broad search `the`, main-thread task | 864 ms | 111 ms; input-to-paint 134.3 ms |
| Define first entry, first paint | 2,466.7 ms | 596.8 ms |
| First Ident visit, first paint | 1,888.7 ms | 379.8 ms |
| Warm remaining Define pages, first paint | 54.5–215.8 ms | 25.9–44.4 ms |
| Build first entry, first paint / task | 5,442.1 / 5,437 ms | 396.4 / 392 ms |
| First raw-fixture network draft, paint then later task | 35.7 ms then 5,608 ms | 28.8 ms then 419 ms |
| Repeat rack edits, later main-thread tasks | 601–709 ms | 61–84 ms |
| Repeat rack edits, first paint | 17–21.8 ms | 13.2–14.8 ms |
| Build Money/Test/Launch, first paint | 15.6–23.7 ms | 12.4–18.7 ms; no long task in this window |
| Ten bid-control edits, first paint | 5.4–13.7 ms with only 1,000 retained | 6.4–15.3 ms with all 1,040 retained; no long task in this window |
| Retained licences after normalize / reload / auction tick | 1,000; 40 dropped | 1,040; zero dropped |

Ident windows contain forecast work and are not isolated Ident-component CPU timings. The first bulk-seeded draft canonicalizes raw fixture fields and invalidates its first projection once; the later 419 ms task remains a real observation and is not hidden by its fast first paint. Warm Build edits still contain 61–84 ms tasks. The previous multi-second block is removed in these cases, but cold 1,040-title Define/Build entry does not meet a universal 100 ms budget.

Node/SSR, one warmup plus three measured samples on the matched JSON input:

| Work | Before median | After median |
|---|---:|---:|
| HQ | 948.23 ms | 182.49 ms |
| Define | 785.05 ms | 219.24 ms |
| HQ + auction after tick | 19.69 ms, 1,000 retained | 25.07 ms, 1,040 retained |
| Isolated auction | 7.57 ms | 9.00 ms |

The auction comparison establishes continued responsiveness with the full catalogue; it is not a claim that its already-small CPU time improved. Node samples exclude browser rendering, persistence and native-device work.

## Controls and actual save

- **104 normally acquired titles / 197 filed countries:** Define entry 169.3 ms, first Ident 54.4 ms, warm recorded pages 21.5–30.9 ms. Build entry 199.5 ms, four draft edits 17.1–59.5 ms, one 52 ms long task in that edit window. Fixture acquisition/construction time is excluded. Market entry/search were also exercised.
- **Actual Anshu bisnoi, slot 2:** year 15/week 1, 52 titles, 197 filed markets, treasury `$39995.3B`. All seven Define pages, four Build stages, the market shelf and broad shared-library search opened. Search returned 100 results. Commissioning remained disabled with unmet gates. Final HQ still showed 52 titles, 197 markets, Define 3/7, Build 0/6 and overall readiness 4/15. No purchase, commission or week advance was performed on the actual career. This is a functional UI smoke test, not a millisecond timing claim.
- The disposable auction's timer/rival bids continued while ten controls were edited; the QA counter remained 1,040 references / 1,040 licences. Captured browser console errors were empty in tested actual and disposable flows.
- Local Vite PID 57591 was verified to belong to `/Users/zeesh/Vibe code/Actor empire`, listening on `127.0.0.1:5174`. The actual game is left at Streaming HQ for self-verification.

## Correctness and review

TypeScript and the full production build passed after the final source integration. **32 targeted audit suites passed**, covering retention, market search, programme/forecast projection, opening/playable/global route equivalence, launch batching, Build draft reuse, infrastructure forecast/rehearsal/autosave gates, rights compatibility/calendar/transactions, market/history, Originals readiness/playback, commercial C2/C4, save migration/integrity and save generations. See [machine-readable evidence](2026-10-20-streaming-extension-fix-evidence.json) for commands, captures and results.

Notable checks:

- Retention: 17 checks, including real acquisitions crossing 1,000/1,001/1,040, once-only charges, a real auction update, 197-country local/canonical scope preservation, terminal history and legacy rows.
- Search: complete baseline result fingerprints and stale-listing purchase rejection. Country preparation remains constant with result count.
- Complete pre/post output hashes match for programme/offers/forecast, opening coverage, ten public infrastructure forecast variants, and 128/1,040-title Launch Program views. Public defaults remain fresh, including in-place fixture mutations; different-player contexts fall back to normalization.
- Programme country-profile reads fell from 21,079 to 197 at 52 titles. A Launch Program batch fell from 1,379 to 197 country-profile reads at both 128 and 1,040 titles. These are preparation counters, not user-facing timing measurements.
- Independent review caught terminal-licence reference resurrection and an over-restrictive legacy-country filter during development; both were corrected and tested. Reviews also covered global-route cache boundaries, Build invalidation, canonical public forecast parity and fresh transaction checks. Root reviewed the final optional launch-context identity guards.

**Standing unrelated failure:** `audit:streaming-economy-balance-fixes` remains 245/246: `forecast reserves the final non-owner across rental and purchase`, actual 52,617 versus expected 1. It was independently reproduced before this extension repair. Economy was not changed. There is no blanket all-repository or full-game release green light.

Already-truncated local licence economics or country snapshots cannot be safely invented from incomplete history. The repair prevents new truncation and preserves available durable records; it does not fabricate historical purchases.

Design-hook triage: no CSS changes, no new suppressions. Existing narrow Inter typography and purposeful status-rail exceptions from `8d761d8` were preserved; the existing decorative-grid advisory remains outside this performance task.

## Reproduce

```sh
npm run audit:streaming-catalogue-retention
npm run audit:streaming-stress-boundary
npm run audit:streaming-programme-read-batch
npm run audit:streaming-market-search-read-context
npm run audit:streaming-launch-read-batch
npm run audit:streaming-infrastructure-read-forecast
npm run lint
npm run build
```

The stress benchmark accepts `--fixture=/path/to/streaming-stress-1040-player.json` for exact input reuse; otherwise its existing helper creates the fixture. Build `scripts/fixtures/streaming-tap-performance.html` as the production QA entry and copy that JSON to the preview output root. `?titles=1040` and `?titles=1040&room=1` use disposable state and expose actual retained counts, paint observations and long tasks.
