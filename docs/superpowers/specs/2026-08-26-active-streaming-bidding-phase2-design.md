# Active Streaming Bidding and Contract Economics Design

## Status

Approved in chat on 2026-08-26. This is Phase 2 of the Unified Rights and Active Bidding project and builds directly on `WorldState.streamingRightsContracts` from Phase 1.

## Goal

Replace the Production House's increasing-cash auction with a deterministic, saved live rights market where platforms compete through materially different contract structures, the player chooses without counteroffering, and accepted backend terms settle from the buyer platform's attributable title revenue.

## Bidding-room rules

- One visible room clock starts at 15 active seconds.
- Every platform has the same six-second response cooldown after a pitch or revision.
- Other platforms may act during that cooldown.
- A material pitch or revision extends the common room clock. Early extensions add three seconds, later extensions add two and then one, while preserving at least 12 seconds after an event and enforcing a 45-second active-room cap.
- An offer is immutable while its platform is cooling down. At the next action the platform may replace it upward, replace it downward, restructure it, declare it final, or withdraw it.
- No player counteroffers exist in this phase.
- There is no highest-bid winner or player-facing best-offer score.
- When the common clock ends, remaining valid offers move to a closing table. Nothing signs automatically.
- Every normally opened room reserves one real market-clearing offer from a financially capable platform. The clearing offer may be small or restrictive but cannot withdraw before closing.
- Reopening the same game week restores the same session. A fresh room is allowed only after the next game-week market refresh.
- Active time pauses when the room is not mounted or the application is backgrounded.

## Offer model

Every immutable offer version records the platform, round, guarantee, backend percentage, backend basis, guarantee recoupment, optional backend cap, duration, exclusivity, territory, localization, production funding, future-season funding, renewal option, platform forecast, and fixed exposure. Platform comparisons use internal expected retained value, not cash amount alone.

Platforms form downside, base, and breakout forecasts from project package strength, genre fit, theatrical proof, audience history, platform finances, current slate needs, competitor offers, and the commercial relationship with the seller. The signing-time expected contract cost is a forecast. Only fixed promises are constrained by hard available capacity. Uncapped backend may exceed the forecast when a title outperforms.

Tricky offers are created through visible trade-offs such as a recoupable guarantee, a low backend rate, a backend cap, a long exclusive window, or funding in place of cash. The UI presents exact terms without advisory badges, hidden clauses, or a recommended-deal label.

## Revenue attribution and royalty settlement

The shared weekly platform revenue pool consists of subscription revenue, advertising revenue, and direct transactional receipts where supported. Subscription revenue is attributed across active titles from normalized realized contribution:

- 45 percent watch-time share.
- 25 percent viewing-account share.
- 20 percent subscriber-acquisition contribution.
- 10 percent subscriber-retention contribution.

Completion, repeat viewing, audience reaction, and word of mouth affect those realized inputs, so an average-rated title may become a breakout. Forecast quality does not cap realized performance.

Title Adjusted Gross Receipts equal attributed subscription revenue plus title advertising and direct transactional receipts, less taxes, refunds, and storefront fees. Unrelated platform overhead is not deductible. A non-recoupable royalty pays `adjustedGrossReceipts * licensorRevenueShare`. A recoupable minimum guarantee accrues the same royalty but pays new cash only after cumulative accrued royalty exceeds the guarantee. An explicit backend cap limits cumulative paid backend; absence of a cap means uncapped.

Every weekly settlement is exact-once and actor-neutral: the same amount leaves the buyer platform, enters the seller studio, updates the release and studio ledgers, and records an idempotent contract settlement row. Attributed title subscription revenue never sums above the platform subscription pool.

## Relationship effects

The commercial relationship expands beyond breach recovery to include completed deals, profitable outcomes, loyalty, rejections, and realized partner value. Positive history may make a platform enter earlier, allocate modestly more fixed exposure, choose more generous structures, or remain in the room longer. Effects are capped and never create money or override solvency.

## Phase 1 connection

`StreamingBiddingSession` and `StreamingOfferVersion` are saved decision records, not contracts. Accepting an exact active offer version registers one canonical `StreamingRightsContract` with the same idempotency key and terms. The canonical contract remains the authority for buyer, seller, dates, rights compatibility, funding, and settlement.

Exclusive acceptance closes incompatible offers. Non-exclusive acceptance is compatible with up to three territory/window slots, subject to canonical conflict checks. Phase 2's Production House room signs one selected offer; multi-license package workflows remain later work.

## Persistence and determinism

`WorldState.streamingBiddingSessions` stores normalized sessions keyed by stable session ID. `WorldState.streamingRoyaltySettlements` stores bounded exact-once settlement history. IDs and decisions derive from project ID, seller ID, absolute week, platform ID, and revision round through deterministic RNG helpers. Save migration normalizes malformed data, preserves valid closed sessions, and does not reroll an existing session.

## UI direction

The War Room uses a production-floor auction aesthetic: cool slate surfaces, contract-paper offer slips, one dominant common countdown rail, restrained platform colors, compact legal term rows, and a chronological market tape. Platform cooldowns use equal response rings. The room does not use green/red quality judgments, leader badges, or a giant highest-bid hero. Mobile stacks the countdown, active offer slips, closing actions, bidders, and transcript without horizontal overflow. Reduced-motion and keyboard focus are preserved.

## Deferred work

Catalogue packages, output deals, Rights Calendar, bulk renewal, full renewal negotiation, platform-to-platform resale, advanced cinematics, cheat shortcuts, and long-run balance tuning remain in later phases. Phase 2 stores the clauses and canonical records those systems will consume.

## Verification

Focused audits must prove deterministic opening/revision, upward and downward revisions, equal cooldowns, common-clock extension and cap, floor-offer survival, closing without auto-signing, same-week restoration, exact offer-to-contract conversion, normalized title attribution, recoupment, caps, exact-once settlement, relationship bounds, save migration/compaction, and reload determinism. Existing Phase 1, Platform AI rights/economy, Production House streaming, save, and build checks must remain green.

## Constraints

- Inline implementation only; no subagents.
- Strict sequential RED to GREEN TDD.
- Preserve the dirty worktree and unrelated changes.
- Do not stage or commit.
- No `Math.random()` or `Date.now()` for bidding decisions, IDs, settlement outcomes, or migration.
- Do not add player counteroffers or advisory best-offer labels.
