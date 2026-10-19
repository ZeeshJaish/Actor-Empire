# Streaming and production-house release-readiness audit — 19 October 2026

**Verdict: HOLD release. Two reproduced Originals blockers prevent a clean production-to-playback flow.** Core founding, production funding and substantial weekly accounting coverage passed. This audit did not change game code, repair saves, commit or push.

## Builds and evidence

- Committed baseline: `f9835352477dbb88b8a53a731935d398c5b14ea9` (`main`). Budget UI rollback remains intact; no rollback or relationship code was edited.
- Local candidate: snapshot of the pre-existing uncommitted streaming payback/economy changes. It is evaluated separately, not represented as a GitHub release.
- Both snapshots use the repository's installed dependencies. Disposable careers and isolated browser contexts only; no player/cloud saves, real purchases or remote writes.
- Evidence directory: `/Users/zeesh/.codex/visualizations/2026/10/18/01a14f08-9bde-7472-b4cd-238c8df062d1/streaming-readiness-20261019/`.
- SHA256 preservation check confirmed all pre-existing dirty/untracked source/report files stayed unchanged. Only audit planning/report artifacts were added to the real checkout.

## Coverage and outcomes

| Check | Fresh result | What it establishes |
|---|---|---|
| Baseline / candidate production builds | PASS on both; baseline16.45 seconds | Web production compilation; chunk warnings remain |
| Baseline relevant audit matrix | 247 suites: 215 pass, 31 fail, 1 timeout | Broad streaming/world/production/rights/finance/persistence coverage; failures need classification |
| Local candidate impacted matrix | 34 suites: 32 pass, 2 fail | Both failures also occur on baseline; not proof of full regression freedom |
| Baseline full weekly-engine matrix | 15 scenarios, 732 weeks/check rows PASS | Subscription/ads/store, 6/24 titles, quality50/95, 104-week runs and212-week rental/replacement |
| Candidate full-country-cost matrix | 5 scenarios, 784 weeks/check rows PASS | Subscription104, ads104, rental104, refreshed ads260, refreshed rental212 |
| Actual founder/producer browser career | Qualified founder → incorporated → treasury funded → US filed/approved → studio founded → Original commissioned → actual Greenlight → full33-week production → delivered | Real production and finance actions through real components; delivery-to-playback and overlay failures reproduced |
| Separate prepared browser launch | GO LIVE through11/11 launch checks, four live weeks, HQ/markets/audience analytics, reload | Post-launch UI/runtime sample; does not replace failed normal-founder integration |
| Native/store/device readiness | NOT VERIFIED | No native purchase/restore, iOS/Android device, production telemetry or long thermal/memory session |

The 1,516 full-engine soak weeks reconcile treasury deltas, revenue, operating costs, content amortization/basis, royalties, taxes/levies, incoming customer tenure and shared household-wallet funding. They use controlled prepared fixtures and actual `processGameWeek`; they do not demonstrate that every screen in every career is usable.

### Actual founder/production financial trail

1. Started disposable qualified age40/week12 career with $2B personal cash.
2. Incorporation deducted $85M once: personal $1.915B, treasury $0, founder ownership100%.
3. Entered $500M founder transfer in actual finance input: personal $1.415B, treasury $500M.
4. Filed US: $53M and5E, treasury $447M; actual weekly reviews reached READY with saved conditions.
5. Founded `Readiness Pictures` through the production-house wizard: $50M personal setup, $10M opening studio cash.
6. Commissioned `Signal Premiere` with $15M reserved platform cap; actual Greenlight selected a director, Denzel Washington as lead, crew plan, equipment and Vancouver location. Missing-lead validation correctly blocked approval until a lead was selected.
7. Greenlight applied $13,530,671 funding and returned $1,469,329 unused cap. Studio cash was not charged the same production cost again.
8. All33 production weeks completed: PRE_PRODUCTION → PRODUCTION → POST_PRODUCTION → AWAITING_RELEASE. Studio ordinary operating costs continued. Localized domestic master cost $500K once and became ready after a real game week.
9. Two fixed-price released-film licences cost $12M and$13.5M, giving three library entries including the Original. One rapid first attempt at the second purchase did not settle; retry after the detail was fully open succeeded. This is an unconfirmed interaction/race lead, not a proven accounting loss or exploit.

## Reproduced release blockers

### P1 — Finished Originals remain unavailable to viewers

**Reproduction:** create a platform and studio, commission an Original, complete Greenlight and its33-week production, then inspect Originals Studio and the Content Desk.

- Canonical commitment phase: `AWAITING_RELEASE`.
- `getStreamingOriginalLiveStatus`: `DELIVERED`.
- Stored commission status: `GREENLIT`.
- Catalogue availability: `IN_PRODUCTION`, `available:false`.
- Offered subscription-plan routes: `PRODUCTION_NOT_READY`.
- Catalogue excludes the finished Original from available title/hours totals.

**Cause:** `services/streamingContentAvailability.ts:62` and`:155` use raw commission status while `services/streamingOriginals.ts:480` derives current truth from the referenced production/commitment. Both builds reproduce the mismatch using the exported actual founder career.

**Isolation:** on a diagnostic copy only, changing raw status to DELIVERED makes all three saved subscription-plan routes ALLOWED and catalogue READY. No production code or original career was repaired during the audit.

**Required repair:** share one canonical production-readiness resolver across catalogue, title routes, launch and delivery. Recover existing GREENLIT commissions whose referenced project already finished. Preserve project/commission IDs, original funding, release windows, views, receipts and settlement keys. Re-test delivered, still-producing, released, cancelled and legacy cases; ensure future/scheduled windows stay enforced.

Evidence: `baseline-original-availability.json`, `candidate-original-availability.json`, `original-availability-diagnostic.ts`.

### P1 — Originals Studio is behind HQ and controls cannot be tapped

**Reproduction:** open Originals after the founder career's first Original is delivered, at390×844.

- Pipeline header/content appears mixed with HQ.
- Normal localization-button clicks time out because `#hq-main` intercepts pointer events.
- Computed `.originals-studio-overlay` position is `static`; it only has `z-index:940`.
- `AccessibleDialog` supplies semantics/focus behavior, not positioning. The overlay stylesheet does not establish a fixed/inset workspace.

**Required repair:** make the workspace correctly positioned above HQ with safe-area sizing, internal scrolling, focus/close behavior and no horizontal overflow. Verify actual taps on narrow mobile and desktop without forced clicks.

**Diagnostic continuation:** a browser-only injected rule (`position:fixed; inset:0; display:flex`) allowed localization business logic to be exercised. That continuation is not a clean unmodified UI pass. No stylesheet in the repository was changed.

Evidence: `originals-overlay-mobile.png`, `browser-actions.jsonl`, `styles/streaming-originals-studio.css:1`.

## Other confirmed issues and follow-up risks

| Priority | Finding | Evidence and limits | Next action |
|---|---|---|---|
| P2 | First reload recalculates world audience-choice allocations | Six full-engine weeks through `prepareVerifiedPlayerForPersistence` → serialize → migrate reproduce changed country allocations/fingerprint in both builds. Money, treasury, debt, paid-customer, viewing and settled-economy records remain unchanged. Second reload is stable; controlled next-week branches converge. | Make same-week saved choice/source fingerprint consistent with final settled world; retain entitlements and do not re-settle money. |
| P2 | Finance mixes company year with absolute week | Actual founder screen shows `Y1 W2039`. Adapter sets company.year relative to incorporation and company.week to absolute world week. | Fix display semantics separately from absolute IDs/grouping/settlement clocks. Do not replace canonical absolute weeks throughout finance. |
| Investigation | Market-only long-save envelope exceeds its bound |20-year selective market soak: ~6.49MB baseline, peak29.70MB at year3, final~7.96MB. Peak `worldStreamingViewing` ~23.5MB. Active rights/project references survived. This is transient growth, not proof of indefinite growth or save corruption. The selective fixture does not run the entire weekly engine. | Attribute the retained title/snapshot evidence, test realistic full-career compaction and native memory/serialization before changing retention. Preserve live rights/receipts. |
| QA debt | Broad matrix is not green |32 baseline suites did not pass, including1 bounded timeout; detailed logs retained. | Repair stale harnesses/expectations and investigate remaining live failures. Do not suppress assertions solely to obtain a green count. |

## What passed on production-house/accounting side

- Actual studio founding, commissioning handoff, Greenlight validation, cast/location selection, funding application/refund and production completion above.
- Existing focused talent signing/contract-lifecycle suites pass, including fixed saved roll,1.5× guarantee, pending EMI after uses exhaust, no extra paid installments and no restoration of consumed uses from stale mirrors.
- Studio sale-security and acquisition/bank accounting suites pass, including ownership, cash classification, loan/dividend and save-reload safeguards.
- Streaming19-check run-progress audit passes, including legacy views/weeks recovery without replaying payouts.
- Signed-royalty, content-accounting, tax, shared-budget, rights lifecycle and weekly save/generation/integrity suites pass.
- Rival world is active: the real founder career had35 ecosystem operators,62 canonical production records and43 current released world projects after progression; logs showed AI commissions, physical production, hits/flops and outside studio offers. These counts describe this test career, not universal minimums.

## Scenario balance is not automatically a bug

Candidate results include real country entry/service costs and catalogue/network/foundation investment:

| Scenario | Duration | Accounting profit | Net cash after modeled investment | Sustained cash payback |
|---|---:|---:|---:|---|
| Subscription, fixed catalogue |104 weeks |-$31.5M |-$203.3M |Not reached |
| Ads, fixed catalogue |104 weeks |-$101.4M |-$273.2M |Not reached |
| Rentals, fixed catalogue |104 weeks |+$147.8M |-$23.9M |Not reached |
| Ads, refreshed catalogue |260 weeks |+$140.1M |-$44.0M |Not reached |
| Rentals, refreshed catalogue |212 weeks |+$334.8M |+$163.1M |Week133 |

Premium rights do not guarantee payback; licences expire and titles need replacing. These outcomes require product/balance review, not a blanket promise that every platform should profit. Candidate numbers are unpublished local-candidate measurements.

## Failed-suite triage

Confirmed obsolete checks include hardcoded media migration version40 versus current51; legacy `upcomingRivals` injection after B7 switched to canonical production schedules; static UI strings/markup; zero-catalogue Build forecast expecting positive demand; ad-income fixture missing the new market context; an optional-undefined discovery mix sum; and a blanket JSON.stringify monkeypatch that now rejects small receipt-key serialization rather than a full-save clone.

Additional red suites cover studio production record counts, branding/RNG snapshots, sourcing validation order, access/research semantics, audience persona totals, ZIP visual fidelity and acquired royalties using old receipt assumptions. These remain visible in the raw matrix and are not automatically certified harmless. The Platform AI exact-resume failure led to the independent full-engine reload reproduction above. `studio-ai-long-run-b1` exceeded the150-second audit limit; its orphan was stopped, not claimed passed. Separate specialized long-run suites passed; annual-checkpoint/production-only horizons are not described as continuous full-game/device runs.

See `baseline-matrix.json`, `baseline-failures.txt` and `candidate-matrix.json` for all32 non-passing names, exit codes, durations and original log paths.

## Remaining release gates

1. Fix both P1 Originals blockers, including recovery of already-finished projects in existing careers.
2. Re-run the normal founder → first Original → actual view/receipt route without diagnostic CSS or synthetic status edits; verify content availability, release date, catalogue, playback and finance agree.
3. Repair reload/display inconsistencies and resolve/rebaseline failed audit expectations with current source-based evidence.
4. Re-run narrow mobile/desktop interaction and overflow checks on repaired rooms; repeat only affected business/accounting checks.
5. Complete native purchase/restore/offline entitlement checks, long-session device memory/thermal tests and real-device save/write recovery. This web audit provides no native certification.

No fixes or GitHub push were performed. Existing pending work remains unchanged.
