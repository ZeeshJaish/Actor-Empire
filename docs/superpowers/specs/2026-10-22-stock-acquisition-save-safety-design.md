# Stock acquisition, SX valuations and save safety — proposed design

Status: proposed final design for user review; implementation has not started. This combines the approved repair objective with the user's request to first investigate SX company values and return a final plan.

## Objective and evidence

A legitimate public-company shareholder must be able to buy stock, cross the control boundary, complete a single acquisition ceremony and retain the result through real save/reload and subsequent weeks. Existing cash, valid share quantities, purchase costs, corporate owners and signed obligations must survive the repair.

Evidence: `docs/reports/2026-10-22-paramount-acquisition-analysis/README.md` and its `sx-followup/README.md`. The original investigation reproduced five closing loops in 11 browser scenarios and ran 26 service assertions. The SX follow-up additionally reproduced unrelated cash truncation, rewritten purchase basis, lost corporate allocation, stale weekly stock pressure, a no-op debit granting a share at SX wallet magnitude and a year-rollover dividend-marker problem.

## Approach and alternatives

Recommended: coordinated repair with three ordered workstreams: (A) compatibility/accounting protection, (B) authoritative control transfer and reminders, (C) consistent listed-company valuation and bounded future market changes. Finish with shared browser/storage/week-engine verification. Each workstream remains independently reviewable and testable.

Rejected: simply clamp every large number or reset companies to catalogue defaults. This can destroy valid player cash/basis and already fails to distinguish an unrelated malformed quote from the player's actual earnings. Rejected as the initial scope: a game-wide currency-type rewrite. The immediate stock repair must validate representability and fail atomically without deleting balances; a universal money-engine redesign would need its own specification.

## Non-negotiable invariants

- Migration is not a purchase, sale, fine, dilution or retroactive clawback. It must not debit personal cash because any stock quote looks abnormal.
- Preserve finite nonnegative recorded cash balances, valid integral share quantities, cost basis, explicit corporate funding allocations, ownership dates and signed bank/acquisition liabilities. Missing corporate evidence cannot create new personal ownership.
- Purchase cost is historical accounting. Do not bound `averageCost` or `totalInvested` by today's stock ceiling.
- Existing controlled studios remain controlled. Existing signed debt does not get repriced by a new valuation model. Genuine future share issuance may dilute ownership only through an explicit corporate action.
- Preserve verified candidate write/read-back, current/previous generations, serialized saves and persisted-before-UI processed weeks. Compatibility changes must be idempotent and versioned.
- A failed or duplicate action cannot change cash, shares, studio ownership or energy. A successful transaction must apply its quoted debit/credit and share delta together.
- Unrepresentable/nonfinite legacy fields retain recoverable originals and use the verified recovery path; never invent money or owners. A represented SX balance cannot recover historical pennies already lost to Number precision.
- Unrelated dirty work stays intact. Do not blanket-reset, regenerate localization baselines, deploy or rewrite a real player save during implementation tests.

## A. Compatibility and arithmetic

Remove the stock-triggered $10T wallet haircut. Preserve `equityFunding` through migration and include its authoritative owner/share allocation in version-aware integrity verification. Retain original pre-repair data and a repair version/receipt for any abnormal quote or registry migration; subsequent loads cannot repair the same record repeatedly.

For valid share registers, keep exact quantities. For malformed/unsafe share scales, do not silently shrink the register and rewrite investment. Keep the raw record recoverable, prefer a verified previous save, and require an explicit recorded repair with proportional owner rights if exact units cannot be recovered. Unknown owners stay unknown; their receipts cannot default to the player's wallet.

For stock cash settlement, use safe minor-unit calculations within representable ranges. Reject a transaction that cannot represent the quoted balance/share delta; return an actionable reason and leave the input state unchanged. This avoids the observed free-share purchase with a 10.6Sx wallet. It does not pretend the rest of the game has become arbitrary precision.

Important distinction: preserving settled cash and historical share rights does not guarantee an invalid old quoted market value. A corrected runaway quote may change unrealized portfolio valuation. Record the old quote and the reason/impact; do not disguise the change as spending, delete shares or mint compensating cash. A quote correction and cash haircut are different operations.

## B. Public control and signing

Retain 50% as the existing acquisition eligibility boundary and use it consistently across supported public studio entry points; do not retroactively revoke old controlled cases. Check actual current stock/negotiated rights, not merely a displayed rounded percentage or an obsolete response.

Add explicit persisted public-control intent when filing a notice. It is not a seller purchase acceptance. Existing DRAFT diligence cases can hold this intent; response/closing/signing resume from presentation state while current rights are still sufficient. Existing counters/rejections remain history and cannot override current control readiness. Zero additional share purchase price is authoritative when control is already held.

Build one signing quote containing outcome, additional purchase price, current shares, funding, verified debt, liabilities, expected income and source/version. Dossier/review/contract/completion use the same quote. Final signature revalidates current ownership, funding and energy. Material changes trigger visible quote refresh before consent, not a hidden settlement change. Signed old obligations remain unchanged.

The completion action runs once, adds one business, preserves stock basis/allocations, records acquisition debt once and clears related queued notices. Existing private acquisitions, minority investments, public tenders, unsupported streaming-platform restrictions and corporate ownership attribution remain covered.

Opening/defering a stock-control notice records a durable acknowledgement. Use a 12-week reminder interval for an unchanged deferred opportunity, with manual Stocks/Forbes access always available; crossing below and later regaining control is a new meaningful opportunity. Completed transfers suppress all matching notices. Key time by year plus week, not week-of-year alone.

## C. Valuation, pricing and calendar

Keep current per-company/sector stock market-cap guardrails initially; do not choose a new arbitrary low cap as the fix. Use conservative cent rounding so prices cannot round above the stated cap beyond the declared minor-unit tolerance.

Use a single listed-company equity market-cap quote for Stocks, public Forbes equity and the tender's share-value reference. Where enterprise value is useful, label it separately and reconcile it using documented cash/debt rather than silently treating a parent-company equity value and studio enterprise estimate as identical. Modelled parent/studio scope follows the existing stock linkage; platform acquisition restrictions remain intact.

Do not derive new contractual debt, guaranteed income, withdrawable cash or collateral simply by multiplying an inflated world headline. Preserve real stored ledgers/reserves and signed terms; keep unaudited legacy estimates separate from them. Apply future world operating valuation changes from real company results with bounded adjustment and verified facts. Preserve legitimate owned-studio achievements instead of resetting all businesses.

Stop reapplying a decades-old hit as permanent weekly growth. Proposed starting calibration: project return pressure tapers linearly to zero over 13 weeks, with maximum incremental project pressure ±1% per week; reputation/momentum pressure combined is bounded ±0.25% per week. Keep sector volatility and hard caps, and add bounded mean reversion toward the supported market reference. Validate this calibration with seeded long-run bull/bear/no-release and genuine growth cases before choosing it as final balance; expose tuning in one policy module and record results.

One absolute-week clock drives market processing, corporate actions, release ages and dividends. Persist market/payout markers so processing the same week twice cannot reprice or repay twice, and week 52 → 1 cannot reuse the prior year's payout marker. Preserve existing next-due dates conservatively without retroactively minting missed dividends.

All public displays/quotes/payout/portfolio selectors consume the same validated quote. SX formatting is real magnitude; do not merely replace the suffix. Unknown/nonfinite values must not be shown as a credible '$999T+' price.

## Completion gate

The primary end-to-end browser test starts with zero stock, purchases actual shares through Stocks, crosses the chosen threshold, handles the real reminder, runs diligence, opens closing, signs, verifies exactly one owned studio and no second share debit, saves through real IndexedDB verified generations, reloads and advances multiple actual game weeks. Repeat for old DRAFT/countered/rejected/accepted cases, 51%/100%, multiple studios, mixed corporate funding and deliberately malformed legacy inputs.

Add deterministic 50–100-year stock simulations for all 16 stocks with proper year/week rollover, plus a smaller full-world weekly run to test ordering/persistence and company accounting. These are separate evidence levels; native device runs must be labeled separately from browser success. Never call the repair complete solely from source-string audits or direct backend calls.
