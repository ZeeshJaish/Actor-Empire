# Acquisition and banking accounting repair — October 18, 2026

The reported withdrawal → acquisition → loan repayment loop contained three accounting bugs. Ordinary use of existing capital and legitimate borrowing remains allowed; moving the same cash cannot create extra collateral, operating income or ownership.

## Changes

- Studio equity retains its recorded operating value while cash movements are valued dollar for dollar. Genuine weekly appraisals, world reactions and acquisition sentiment refresh that basis without reviving withdrawn cash. Acquired studios used as the display HQ retain their real ownership percentage.
- Operating cashflow is classified separately from transfers, loan principal and asset disposals. Legacy generated transactions use precise fallback matching. Bounded history retention reserves room for real operating entries so capital spam cannot erase a loss. Current-year bank totals use the same classification; passbook entries and historical annual snapshots remain available.
- BankApp uses shared current-state loan actions. Invalid/stale applications and duplicate repayment are rejected, real principal and signed rates are preserved, and manual payment splitting awards reliability credit at most once per game week.
- Studio-funded purchases retain their corporate owner, including full acquisitions, private investments and public tenders. Mixed funding and live shareholder changes determine beneficial ownership. Withdrawals follow that ownership; corporate private/public investment exits, dividends, child sales and sale royalties return to company treasuries.
- Sale packages include funded descendants and corporate investment assets once, remove only transferred interests, preserve unrelated personal holdings, and lock included capital during live listings. Signed debt offsets and a global settlement budget prevent underwater companies from creating excessive corporate payouts.
- Sale offers/contracts show corporate cash receipts separately from personal proceeds.

## Compatibility

Fields are additive and optional. Existing cash, loan principal/rates, acquisition liabilities, ownership dates and closed royalty agreements are not retrospectively rewritten. Missing cash bases start from the existing valuation; there is no historical clawback. Corporate owner recovery uses unambiguous recorded closing evidence. Ambiguous old public-control purchases without durable allocation evidence remain grandfathered rather than guessing ownership from subsequently traded shares. Recursive/missing corporate owners cannot fall back to newly created personal equity.

## Verification

The new `npm run audit:bank-acquisition-accounting` runs **66 checks**: equity 18, capital/credit/actions 10, funded ownership 22, public stock cash 8 and full integration 8. Relevant tests failed against the old behavior before implementation. The full integration invokes real treasury transfer, bank issue/repayment, submitted and accepted acquisition, separate acquisition-debt paydown, migration and weekly engine services.

The tested sequence withdraws $500M without increasing collateral/borrowing room, blocks an inflated $500M loan, issues a valid $50M loan, buys a $55M studio with $18M capital, withdraws its $13M reserve surplus, repays the personal loan, pays the separately preserved acquisition debt and reloads the save. Corporate public dividends post once through the actual weekly engine and do not duplicate in the next week after reload. Small mixed stock sale rounding conserves cash and ownership across all tested integer combinations.

The previous studio-sale security suite passes **125 checks** (23 history, 25 exploit, 77 treasury). These additional audit commands pass:

- studio-sale-deck, studio-group-valuation, studio-group, studio-merger-treasury
- private-equity, private-control-acquisition, studio-acquisition
- stock-control-acquisition, stock-share-structure, stock-takeovers, stock-decision-events
- acquisition-debt, save-migration, save-generations, legacy-inheritance

`npm run lint` passes. Exact staged-source validation repeats the new accounting suite, prior sale protection suite, TypeScript check and production build separately from unrelated dirty streaming work.

## UI verification

A temporary isolated local harness rendered the actual BankApp with synthetic game data and called the production treasury/acquisition services. Browser interaction verified:

1. $200M personal cash / $1.25B asset base / $111.795M loan cap initially.
2. Withdraw $500M: personal cash becomes $700M, assets and loan cap stay unchanged, operating income stays $0.
3. Enter $500M loan: application disabled with an actionable ceiling reason.
4. Apply for $50M over 52 weeks: real loan created once at its quoted rate.
5. Acquire a $55M studio, withdraw its legitimate $13M surplus, then repay bank balance: personal cash $658M and personal loan balance $0; operating income stays $0.
6. Reload: $658M and zero personal loan balance persist. Inherited acquisition debt is verified separately in the integration audit.

No browser console errors were recorded. Screenshot evidence is saved locally at `/Users/zeesh/.codex/visualizations/2026/10/18/01a14f08-9bde-7472-b4cd-238c8df062d1/bank-accounting-after-reload.png`. This is an isolated component/service browser test, not a native-device or production telemetry claim.

An independent read-only agent reviewed the final funding, valuation, settlement and bank paths, reproduced the discovered edge cases, and confirmed no remaining reproduced blockers. The unrelated in-progress streaming changes were preserved and excluded from this repair's commit.
