# SX clarification and additional stock safety findings

October 22, 2026. The user clarified that the reported number was **10.6 SX**, not a 10.6× return. `services/formatUtils.ts` defines Sx as 10^21; $10.6Sx represents approximately $1.06 × 10^22. Merely changing its suffix would hide an actual large underlying number.

Read-only synthetic probes against current production services are saved in `probe.ts` and `results.json`. No player save was loaded or rewritten.

## Reproduced findings

1. **Unrelated cash haircut:** injecting a 10.6Sx Paramount quote into a save with $25T personal cash causes `migratePlayerSave` to return $10T cash, even with an empty portfolio. `hasRunawayStockValues` checks the market list, not whether the player owned/sold the stock or received proceeds. `normalizeMigratedCash` imposes the $10T ceiling solely from that flag. This cannot distinguish earned money from a stock exploit.
2. **Historical cost rewritten:** a valid 100-share position with recorded average cost $10,000 and total investment $1M becomes average cost $39 and total investment $3,900 on migration. Historical purchase cost is being bounded by today's price ceiling, which is a different quantity.
3. **Corporate ownership lost:** the same position's explicit 60 company-funded shares disappear from `equityFunding` after migration. This was reproduced with an actual production house created by `createBusiness`, not just a missing owner. Later sale/dividend helpers depend on this allocation to route cash to the correct treasury.
4. **Corrupt supply repair rewrites units and basis:** a synthetic 10^24-share company with a represented 51% holding is reduced to 1.95B total shares / 994.5M held shares, and total invested is rewritten. Percentage preservation alone does not preserve all historical accounting. Valid quantities must not be reissued by migration; invalid scales need a recoverable explicit repair policy.
5. **Stale release pressure never ages out:** an old Paramount hit from age 18 produces a 1.0977 price multiplier both at age 40 and age 90 with the same reputation/momentum. `getStudioStockPerformanceMultiplier` selects latest projects without an age window and has no clock input. The same release is effectively reapplied every week. A 9.77% weekly multiplier is not a single 9.77% rerating.
6. **SX wallet precision creates free shares:** with money = 10.6Sx and normal $13 Paramount quotes, `executeStockTrade(..., 1)` succeeds and creates one share, while personal cash remains numerically identical. JavaScript's Number cannot represent a $13 difference at that magnitude. Preserving a legacy balance requires arithmetic validation, not silently accepting a no-op debit or deleting money.
7. **Market calendar rollover:** replaying actual 1–52 weeks across ages 18–20 produces new dividend markers at weeks 12/24/36/48 in year one, then the old week-48 marker appears payout-eligible in each later year without a new marker transition. `processGameWeek` passes week-of-year to `processStockMarket`, and dividend selectors compare only that week number. A shared absolute-week/idempotency clock is required for market movements, issuances and payouts.

## What was not reproduced

A 1,040-step stock-market-only stress replay with maximum positive random-walk pressure kept all 16 current stocks within their current per-share ceilings. This isolation uses increasing step indices; it is not a full-world career replay. The separate rollover probe uses real year/week boundaries. Normal current price writers also route quotes through `normalizeStockPrice`, including trades, votes and takeover effects.

Thus, there is no evidence that a properly normalized current stock quote can grow from its default to SX through the normal weekly writer. Likely source classes include an older/raw save, unsanitized state, or a different company/portfolio valuation screen. The particular stock, screen and installed version remain unspecified. Historical world-company inflation and current preservation of those world values were already demonstrated in the main analysis.

The current ceiling implementation rounds per-share prices to cents; total capitalization can exceed the intended ceiling by rounding error. It should use conservative minor-unit rounding with an explicit tolerance rather than incorrectly expecting exact decimal equality.

## Plan implications

Protect cash, quantity, historical basis and ownership metadata first. Remove unrelated cash clawbacks. Use audited quote repair rather than rewriting transaction history. Bound future pricing and company valuation consistently, expire old project pressure, share one absolute clock, reject unrepresentable stock settlements atomically, and retain verified original/previous save generations. Do not invent historical compensation where the original loss or owner is unprovable.
