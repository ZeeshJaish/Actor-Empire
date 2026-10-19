# Streaming tap performance verification — 20 October 2026

The reported multi-second HQ, wizard and bidding stalls are resolved in the tested flows. The same Anshu bisnoi save now opens the room, advances AI offers, reflects bid-preview changes and exits without the previous sustained freeze. Smaller subsecond costs remain, listed below; this is not a claim that every streaming interaction is instant or that all native devices have been verified.

## Recovery checkpoint

- Commit: [`9905a9a27e818c28c407945193eb1ccfecac0bf6`](https://github.com/ZeeshJaish/Actor-Empire/commit/9905a9a27e818c28c407945193eb1ccfecac0bf6)
- Exact message: `checkpoint lazy load fix`
- Annotated tag: `checkpoint-lazy-load-fix`
- All 92 existing changed/new files were captured and the commit/tag were pushed before performance edits.
- Fixes are separate on `codex/streaming-tap-lag`. Returning to the checkpoint requires explicitly selecting that tag; do not blanket-reset a checkout containing later work.

## Causes and changes

1. **Auction rendering rebuilt the public catalogue for one access grant.** A fresh studio listing has no inherited access grant, so that fallback scanned the entire market to obtain `undefined`. The room now reads inherited licence/contract grants directly and freshly. Bid and settlement validation remain authoritative.
2. **Discovery normalized 197 countries per candidate title.** One discovery read traversed country profiles 397,152 times. Country/week inputs are now prepared once per synchronous discovery batch.
3. **Licensed content multiplied route work across countries and plans.** The original no-licence fixture missed the real-save case. A single licensed title caused repeated platform normalization and title-readiness resolution for its whole route matrix; a probe counted 466,102 country-profile reads and 1,185 world-title reads. One current title/platform/offer context now serves that matrix. No cache survives between reads or player changes.
4. **Collection quotes normalized countries per row, and individual-card reads also rebuilt collections.** Collection backend quotes reuse their batch platform; callers that only need individual offers omit the unused collection calculation. The default API still includes collections.
5. **Some canonical streaming taps re-ran full save migration.** HQ onboarding, launch drafts and build draft/rehearsal updates use the existing trusted update path. Already-visited unchanged onboarding is a no-op. External/import updates retain migration. Normal autosave, save generations and recovery are unchanged.

No core-screen lazy loading, timer throttling, autosave disabling, price tuning, filing-energy change or game-week rule change was introduced.

## Comparable before/after CPU benchmark

Both runs use the same benchmark and disposable fixture: **2,016 historical titles, 197 countries actually filed through the real service, one normally purchased licence and a real title-auction session**. Test-only money/energy funds fixture construction. The checkpoint run overlays the nine changed production files from the saved tag without switching or modifying the checkout. Each metric has one warmup and three measured samples; numbers below are medians on this machine.

These are Node CPU/service or React server-render measurements. They exclude browser paint, native transport, IndexedDB persistence and actual-device overhead, so they are not tap-to-screen timings.

| Work | Checkpoint | Fixed | Reduction |
|---|---:|---:|---:|
| HQ server render | 10,998.09 ms | 127.14 ms | 98.8% |
| Define Launch server render | 4,540.36 ms | 62.84 ms | 98.6% |
| Open title auction service | 4,514.24 ms | 248.60 ms | 94.5% |
| Market listings | 894.58 ms | 30.02 ms | 96.6% |
| Market collections | 305.62 ms | 48.24 ms | 84.2% |
| One-lot backend capability | 913.19 ms | 0.42 ms | 99.95% |
| Auction-room server render | 1,008.33 ms | 1.72 ms | 99.8% |
| Auction tick service | 1.19 ms | 1.08 ms | 9.2% |

The tick service itself was already quick; the expensive room eligibility and surrounding view work caused the repeated stalls. External-update migration remains around 57 ms in this fixture; the existing trusted update preparation is around 0.46 ms. Those are separate paths, not a universal save-time before/after claim.

The 2-country control also improves (listings 79.09 → 4.03 ms; auction entry 363.04 → 45.07 ms). Small-market HQ rendering stays similar (32.93 → 29.28 ms).

For both 2 and 197 countries, **listing IDs/signatures and the complete licensed-title availability result hash match the checkpoint**. Raw samples and hashes are in [before](evidence/2026-10-20-streaming-before.jsonl) and [after](evidence/2026-10-20-streaming-after.jsonl).

Reproduce:

```sh
node scripts/benchmark-streaming-tap-checkpoint.mjs --quick --licensed
npm run benchmark:streaming-tap-lag -- fixed --quick --licensed
npm run audit:streaming-tap-performance
```

## Browser verification

### Actual local save

Used ordinary UI controls on **Anshu bisnoi, slot 2, Year 15 Week 1**, at `http://localhost:5174/`, with 197 filed markets and an existing licensed series. No storage extraction, scripted service calls or new test funding was used on this save.

- Entered the title live-bid room; AI offers and countdown continued while the room stayed readable.
- Changed the upfront bid preview and confirmed the visible amount changed; no bid was submitted. Left normally and confirmed no committed bid money.
- Navigated all seven Define Launch stages: Markets, Clearance, Ident, Store, Catalogue, Pricing and Blueprint. Silent and Just the ident remain first and selected by default.
- Opened Build, added one Scout draft, restored it to zero, and visited Money, Test and Launch. The unbuilt network correctly blocks rehearsal/commissioning. No build was commissioned.
- Reloaded the actual game, reopened the same career and verified the zero-site build draft persisted against 197 markets. Returned to HQ and left the local tab open.
- Navigation and draft autosaves occurred, including the normal free default-ident save. No week was advanced and no new purchase, bid submission or build commission was made.

Automation command/AX round trips became responsive, but include bridge, polling, animation and save overhead. They must not be presented as precise tap-to-paint measurements or compared numerically with Node CPU timings.

### Production browser lab

Also tested the built production UI using `scripts/fixtures/streaming-tap-performance.html`: the same 197-filed/one-licence fixture, held in memory. It reads/writes no career storage and omits the global App autosave pipeline. Click capture records two animation frames, not field INP or guaranteed completion of asynchronous room entry. Initial fixture-construction tasks were excluded by resetting visible metrics after loading.

Observed latest-build samples:

| Interaction | Click to double frame |
|---|---:|
| Enter Define Launch | 84.1 ms |
| Ident stage | 326.8 ms |
| Store stage | 166.9 ms |
| Pricing stage | 151.2 ms |
| Open Content Market | 157.4 ms |
| Market shelf | 68.3 ms |
| Auction-title details | 30.1 ms |
| Enter Live Bid | 294.3 ms |
| Increase bid preview | 11.7 ms |
| Leave room | 123.0 ms |

The room subsequently rendered normally and continued AI bids. No browser error entries were captured in this production QA tab. [Raw browser observations](evidence/2026-10-20-streaming-production-browser.json).

**Remaining limits:** Several wizard transitions still take 150–327 ms. Idle auction updates produced roughly 98–107 ms long tasks in this lab because surrounding presentation still updates; no sustained multi-second backlog occurred. The production bundle is still large and Vite warns about chunk size; this repair targets interaction computation, not initial download size. No throttled mobile/native-device performance or full late-game soak is claimed.

## Correctness and build verification

Fifteen relevant suites passed after the final changes:

- `audit:streaming-tap-performance` — 8 new workload/correctness checks
- `audit:streaming-original-readiness-repair`
- `audit:streaming-original-playback-repair`
- `audit:streaming-ads-rental-integration`
- `audit:streaming-auction-repairs`
- `audit:streaming-collection-auction-repairs`
- `audit:content-market-cm3`
- `audit:streaming-hq-phase4`
- `audit:streaming-launch-draft-continuity`
- `audit:player-ui-state`
- `audit:streaming-launch-s3-energy`
- `audit:streaming-launch-s3-ui`
- `audit:streaming-build-world`
- `audit:save-integrity`
- `audit:save-migration`

TypeScript (`npm run lint`), the main production build and disposable QA production build passed. Independent read-only review found no actionable correctness/maintainability issue and independently passed the 8 new checks and `git diff --check`.

One additional existing suite, `audit:streaming-access-phase2`, fails its static Lifestyle assertion `lifestyleSource.includes('streamingEligibility.readiness')` with “Lifestyle should show total launch readiness.” It fails identically when built against the checkpoint. Lifestyle was not changed here; this is recorded as a pre-existing audit mismatch, not hidden by altering its assertion.
