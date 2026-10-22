# Stock Acquisition and Save Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Default execution for this request is inline with `executing-plans`; do not create extra chats or dispatch agents merely from this header.

**Goal:** Repair public-stock acquisitions and SX company values while preserving existing cash, valid holdings, historical costs, corporate ownership and signed debt, and verify the complete purchase-to-acquisition-to-reload flow.

**Architecture:** Three ordered repair units share canonical quotes and actual game time: compatibility/accounting, control/signing, and market/company valuation. Add focused helpers instead of further expanding the existing large components. Keep raw legacy recovery evidence and verified current/previous saves separate from normalized live projections.

**Tech Stack:** TypeScript, React, Vite/esbuild service audits, Playwright browser interaction, IndexedDB verified save generations.

**Spec:** `docs/superpowers/specs/2026-10-22-stock-acquisition-save-safety-design.md`

**Status:** Implemented and verified locally. All stock/service/accounting/save gates, 14 source-stable browser cases, duplicate-sign protection, the actual App purchase → acquisition → verified reload → three weeks flow, and two actual App recovery cases pass. TypeScript and web build pass. Native smoke was not run because no device was connected/booted. An unrelated theatrical-history fixture fails in the initial baseline too; see `docs/reports/2026-10-22-stock-acquisition-fix/README.md`.

## Global Constraints

- Migration is not a purchase, sale, fine, dilution or retroactive clawback. It must not debit personal cash because any stock quote looks abnormal.
- Purchase cost is historical accounting. Do not bound `averageCost` or `totalInvested` by today's stock ceiling.
- Existing controlled studios remain controlled. Existing signed debt does not get repriced by a new valuation model.
- A failed or duplicate action cannot change cash, shares, studio ownership or energy.
- Preserve explicit corporate funding allocations; missing evidence cannot create personal ownership.
- Preserve verified candidate write/read-back, current/previous generations, serialized saves and persisted-before-UI processed weeks.
- Unknown or unrepresentable legacy values remain recoverable; do not invent balances, share owners or historical compensation.
- Unrelated dirty work stays intact. No blanket reset, localization-baseline recapture, production deployment or real-save mutation during tests.
- A corrected bad quote may change unrealized portfolio valuation. Preserve and disclose its original/impact; never disguise that as a cash debit or share cancellation.

## File and responsibility map

| Unit | Files |
| --- | --- |
| Legacy stock compatibility | New `services/stockSaveCompatibility.ts`; modify `services/saveMigration.ts`, optional stock/flags types in `types.ts` |
| Settlement arithmetic | New `services/stockSettlement.ts`; integrate `services/stockLogic.ts`, `services/stockCashOwnership.ts` |
| Integrity/recovery | `services/saveIntegrity.ts`, `services/saveGenerations.ts`, `services/savePreparation.ts`, `services/storage.ts`; change only where compatibility requires it |
| Control readiness and durable intent | New `services/publicStockControl.ts`; integrate `services/studioAcquisition.ts`, `services/companyPosition.ts`, `services/stockTakeover.ts`, `types.ts` |
| One signing quote | New `services/acquisitionSigningQuote.ts`; integrate acquisition service, `views/mobile/ForbesApp.tsx`, `StudioAcquisitionDesk.tsx`, `StudioAcquisitionDealRoom.tsx` |
| Notice acknowledgement | New `services/stockControlNotices.ts`; integrate `App.tsx`, `StockControlEventModal.tsx`, stock event queue |
| Listed-company valuation / calendar | New `services/stockValuation.ts`, `services/stockMarketClock.ts`; integrate stock/world/studio-AI valuation and Forbes selectors |
| Tests | New fixtures and audits described below; extend existing corporate/save/debt/share suites and actual browser harness |

No broad component replacement or unrelated streaming/box-office refactor is part of this plan. Use the current suitable checkout for implementation after a targeted backup/manifest; an extra worktree is unnecessary unless file contention makes it safer.

## Task 1: Lock the new failure cases and preservation contract

**Files:** Create `scripts/fixtures/stockAcquisitionSafety.ts`, `scripts/audit-stock-save-safety.ts`, `scripts/audit-stock-market-safety.ts`; retain existing analysis evidence.

**Interfaces:** Fixture exports `makeStockSafetyPlayer(): Player`. It returns a fresh structured clone with initialized stocks, actual production house `funding-co`, $25T personal cash, and normal safe financial defaults. `snapshotStockRights(player: Player)` returns cash, each holding's quantity/basis/funding, corporate cash and existing signed debt for invariant assertions.

- [x] Record current HEAD, relevant diffs and SHA256 hashes; copy only implementation-touched pre-existing files/diffs to a task backup before edits.
- [x] Turn the SX probes into failing regression tests, including a valid corporate funder. Start with these exact assertions:

```ts
const p = makeStockSafetyPlayer();
p.stocks.find(s => s.id === 'stk_para')!.price = 10.6e21;
assert.equal(migratePlayerSave(p).money, p.money);
p.portfolio = [{ stockId: 'stk_para', shares: 100, averageCost: 10_000,
  totalInvested: 1_000_000, equityFunding: [{ ownerStudioId: 'funding-co', shares: 60 }] }];
const loaded = migratePlayerSave(p);
assert.equal(loaded.portfolio[0].averageCost, 10_000);
assert.equal(loaded.portfolio[0].totalInvested, 1_000_000);
assert.deepEqual(loaded.portfolio[0].equityFunding, p.portfolio[0].equityFunding);
```

- [x] Include no-holding SX stock, normal stock/high historical cost, mixed funding, already-controlled studios, a known signed liability, repeated migration, malformed supply and a stock missing its corporate owner.
- [x] Bundle/run via `esbuild scripts/audit-stock-save-safety.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/audit-stock-save-safety.mjs` then `node /tmp/audit-stock-save-safety.mjs`. Verify the current implementation fails for the reproduced reasons before repairing it.

## Task 2: Preserve legacy cash, basis and owner metadata through real save/reload

**Files:** Compatibility/integrity/recovery files from the map; extend `scripts/audit-save-migration.ts`, `scripts/audit-save-integrity.ts`, `scripts/audit-save-generations.ts` and Task 1 audit.

**Interfaces:** `migrateStockCompatibility(input: Player): { player: Player; changed: boolean; recoveryRequired: boolean }` lives in `stockSaveCompatibility.ts`; it returns recoverable originals/receipts in versioned optional flags. It cannot mutate the input or execute trades. Runtime failure uses existing verified-save recovery rather than returning a silently cut balance.

- [x] Remove the causal link from `hasRunawayStockValues` to personal-cash normalization; retain finite/nonnegative validation and make invalid data recoverable rather than indistinguishable from a new account.
- [x] Preserve historical average cost/total investment and explicit corporate allocations. Copy supported optional fields and normalize only their type/structural validity; do not use a live quote to reconstruct valid historical data.
- [x] Keep valid integral holdings/supply unchanged. For an unsafe or contradictory register, preserve the raw record and provide an explicit recovery result; do not silently rescale shares or guess a cost basis. If an explicit repair is necessary, it must retain original units and every owner's relative right, with no discarded residual entitlement.
- [x] Extend version-aware integrity tokens to protect allocation/repair provenance. Verify an existing old-format manifest before migration, then create the new-format manifest on the candidate. Old valid saves cannot fail solely because new optional fields were added.
- [x] Add two-round-trip invariants:

```ts
const once = migratePlayerSave(p);
const twice = migratePlayerSave(JSON.parse(JSON.stringify(once)));
assert.deepEqual(snapshotStockRights(twice), snapshotStockRights(once));
assert.equal(twice.money, p.money);
```

- [x] Exercise real candidate write/read-back/promote with fault injection. A failed write retains the prior good generation; recovery never fabricates previously clipped cash. Restore old lost values only from a verified previous generation/import with evidence.
- [x] Run Task 1 audit and `audit:save-migration`, `audit:save-integrity`, `audit:save-generations`, `audit:corporate-stock-cash` if present, and `audit:bank-acquisition-accounting`. Record exactly which commands exist; run the bank aggregate for corporate coverage when a standalone package alias is absent.

## Task 3: Make stock settlement atomic and numerically meaningful

**Files:** `services/stockSettlement.ts`, `services/stockLogic.ts`, `services/stockCashOwnership.ts`; extend `scripts/audit-stock-save-safety.ts` and `scripts/audit-corporate-stock-cash.ts`.

**Interfaces:** `settleStockCash(balance: number, delta: number): { success: true; balance: number } | { success: false; reason: 'UNREPRESENTABLE_AMOUNT' }`. Quotes normalize charges into supported minor units. No caller changes shares/energy before settlement validation succeeds.

- [x] Add the precision regression:

```ts
const p = makeStockSafetyPlayer(); p.money = 10.6e21;
const r = executeStockTrade(p, 'stk_para', 1);
assert.equal(r.success, false);
assert.deepEqual(snapshotStockRights(r.player), snapshotStockRights(p));
```

- [x] Implement safe minor-unit checks so no-op debits, overflow and a lost credit reject without side effects. Preserve the large represented legacy balance instead of reducing it to make arithmetic easier. Return clear recovery/precision feedback to the player.
- [x] Verify buy/sell rounding and mixed corporate/personal splits conserve the charged/credited amount and every allocation. Corporate receipts with missing or locked owners cannot become personal cash.
- [x] Run existing corporate cash and banking/accounting audits. Keep normal small transactions, MAX-buy quotes, partial sells and zero-money failures working.

## Task 4: Make current majority ownership drive a durable transfer

**Files:** `services/publicStockControl.ts`, acquisition/company-position/takeover services and `types.ts`; extend `scripts/audit-stock-control-acquisition.ts` and create `scripts/audit-public-control-resume.ts`.

**Interfaces:** `PUBLIC_CONTROL_PERCENT = 50`; `getPublicControlReadiness(player: Player, profile: ForbesStudioProfile)` returns supported-company eligibility, actual held shares, outstanding shares, total rights and zero additional price when eligible. `beginPublicControlTransfer({player, profile})` persists explicit public-control intent without fabricating a seller's accepted purchase offer.

- [x] Cover 49.99%, exactly 50%, 51%, 100%; no case/DRAFT/ACCEPTED/COUNTERED/REJECTED/CLOSED and unsupported platform profiles. Compute control from actual rights rather than a rounded display or a historical allied-support number.
- [x] Reuse existing presentation resume markers for the public intent. The phase resolver accepts intent plus *current* readiness, so saving RESPONSE/CLOSING/SIGNING cannot reset a valid DRAFT control file to dossier.
- [x] Current readiness outranks stale responses and their obsolete price. Preserve old offers as history and existing signed acquisitions as signed. Align Stocks/manual/Forbes/reminder thresholds; do not revoke a previously controlled business.
- [x] Add the resume assertions:

```ts
const begun = beginPublicControlTransfer({ player: majorityDraft, profile });
assert.equal(begun.success, true);
const resumed = migratePlayerSave(JSON.parse(JSON.stringify(begun.player)));
assert.equal(getPublicControlReadiness(resumed, profile).additionalPrice, 0);
```

- [x] Verify selling below control before signing produces an actionable unchanged-state failure, then regaining the threshold permits a fresh transfer. Repeated final signature creates no duplicate business/debt/charge.

## Task 5: Quote and sign the same financial terms; repair the actual rendered UI

**Files:** `services/acquisitionSigningQuote.ts`, acquisition service and three Forbes/deal-room components; real browser audit `scripts/audit-stock-acquisition-flow-browser.ts`.

**Interfaces:** `buildAcquisitionSigningQuote({player, profile}): AcquisitionSigningQuote` defines `outcome`, `additionalPrice`, `funding`, `verifiedDebt`, `hiddenLiabilities`, `expectedAnnualIncome`, `ownershipPercent`, `sourceVersion`, `quoteKey`. The backend recomputes/validates `quoteKey` before settling. The React room receives the same validated quote, not separate fallback calculations.

- [x] Add regressions for the existing $1B stale accepted offer with 51% shares and for the paid-diligence discrepancy ($5.885B/$2.31B review versus $5.5B/$0.44B signing).
- [x] Use recorded verified diligence consistently where still valid. Material unsigned changes require an explicit refreshed review; never overwrite already signed liabilities or cost basis.
- [x] Wire the real exported cinematic desk to durable control intent and the single quote. Use latest player state for dependent actions; avoid saving a stale prop snapshot over a just-completed action.
- [x] Keep successful closing debt/ownership materialization on the canonical `completeAcquisitionTransaction` path. Charge energy once, and show the actual funding/energy/ownership requirements before signing.
- [x] Add browser assertions against the rendered route:

```ts
await page.getByRole('button', { name: /Proceed to Closing/i }).click();
await expectScene(page, 'sa-closing');
assert.equal((await readPlayer(page)).money, cashAfterDiligence);
```

`expectScene` and `readPlayer` are browser-harness helpers defined in the new browser audit; they wait for the production scene and read the isolated fixture's observable player state. They do not mutate React internals.
- [x] Preserve normal private buyouts, minority stakes, public tender purchase charges and corporate beneficial ownership. Replace/add meaningful rendered flow coverage instead of treating strings in the legacy desk as completion evidence.

## Task 6: Acknowledge control notices without weekly repetition

**Files:** `services/stockControlNotices.ts`, `services/stockTakeover.ts`, `components/StockControlEventModal.tsx`, `App.tsx`; extend stock decision/event cadence audits.

**Interfaces:** `acknowledgeStockControlNotice(player: Player, stockId: string, action: 'OPEN' | 'DEFER'): Player` records optional per-stock state keyed by absolute week and eligibility generation. `canQueueStockControlNotice` consumes it; completion clears matching queue entries and records completed control.

- [x] Write the queue regression: opening a notice then processing the next week must not recreate it; after a completed transfer it must remain absent across reload and later weeks.
- [x] Add an explicit defer action. Recommend 12 weeks for an unchanged deferred opportunity; ownership loss and later regain creates a new eligible crossing. Manual Stocks/Forbes entry always remains available.
- [x] Persist acknowledgements before navigation, using the updated player returned by the queue action. Test year rollover, multiple studios, duplicate queued events and unsupported platforms.

## Task 7: Reconcile SX valuation, expire stale growth and fix market time

**Files:** `services/stockValuation.ts`, `services/stockMarketClock.ts`, stock/ecosystem/AI/Forbes services, `services/formatUtils.ts`, `services/entertainmentStockMarket.ts`, `views/mobile/StocksApp.tsx`, `types.ts`, relevant game-loop call site.

**Interfaces:** `getStockMarketAbsoluteWeek(age: number, week: number): number` uses the repository's existing year/week convention. `getListedCompanyValuation(player, stock)` returns validated per-share quote, actual supply, equity market cap, separately labeled enterprise value, validity/provenance and any legacy quote adjustment. All quote/portfolio/display/payout consumers use this result. Optional absolute market/payout markers are persisted on the stock; old week-only markers are conservatively translated without retroactive payouts.

- [x] Preserve current company/sector ceilings as initial guardrails. Fix upward cent rounding at cap boundaries and validate all 16 stocks plus imported unknown tickers.
- [x] Remove permanent pressure from decades-old titles. Start calibration with the spec's 13-week decay and bounded project/reputation pressure; test hits, flops, no releases and improving actual company economics. Keep tuning isolated so rejecting a balance number does not invalidate save compatibility or ownership fixes.
- [x] Use one clock and durable processed markers for weekly price update, issuance and dividends. Add regression for year-one 12/24/36/48 versus later years, same-week retry, reload and the next actual due payout.
- [x] Use listed-company equity capitalization consistently across Stocks/Forbes/tender references. Separate enterprise value and parent/studio scope explicitly. Remove recursive estimates that turn an inflated headline into invented cash, contractual debt or guaranteed income.
- [x] Preserve real owned-studio valuation/ledger achievements and existing signed terms. Archive an abnormal raw quote and show a transparent repair delta; a quote adjustment must never change historical basis or settled cash.
- [x] Reject or visibly classify nonfinite/unsafe values; do not display a fabricated '$999T+' valid quote. Include SX magnitude and safe-formatting tests.
- [x] Run seeded 50- and 100-year stock-only replays with year/week rollover for every stock, multiple seeds and bull/bear/stale-hit/issuance scenarios. Assert bounded finite values, no same-week compounding, no duplicate payouts and no mutation of holdings except explicit trades or corporate actions. Run a smaller actual full-world weekly replay separately to verify integration order.

## Task 8: Verify the full flow and publish a truthful completion report

**Files:** Actual browser harness/audit, fixtures, `package.json` audit aliases, final evidence under `docs/reports/2026-10-22-stock-acquisition-fix/`.

- [x] Start from zero holdings, real normal cash and the actual Stocks UI. Buy shares below control, then buy the remaining quoted block; record actual cash delta, quantity, cost basis and personal/corporate allocation.
- [x] Advance the real week engine to generate the reminder; open the production Forbes route; run diligence; reach closing; review documents; sign. Verify exactly one owned studio, preserved shares, no second share purchase debit, one energy charge and one acquisition-debt entry.
- [x] Save through actual IndexedDB verified candidate/current/previous generations. Reload through the application's real migration/preparation boundary, then advance multiple weeks. Assert ownership, basis, company funding and cash reconciliation; no duplicate closing, income or reminder.
- [x] Repeat Paramount/Warner/Universal, 51%/100%, legacy DRAFT/countered/rejected/accepted cases, partial tenders, private control, low energy, insufficient funds, sold-down holdings, duplicate taps, interrupted save and an SX/malformed old save. Failed actions must preserve the complete rights snapshot.
- [x] Run regressions: stock share structure, entertainment stocks, takeovers, stock-control acquisition, stock decision events, acquisition cadence, private control, acquisition debt, banking/acquisition accounting, save migration, save integrity, save generations, studio group/sale ownership and inheritance. Run `npm run lint` and `npm run build` after the relevant source changes; distinguish unrelated pre-existing failures with evidence.
- [x] Capture browser screenshots, state/balance tables, console output, source hashes, migration receipts and save/reload results. Include at least one small viewport and one normal mobile viewport.
- [x] Perform an Android/iOS installed-build smoke run when a device/simulator is available. If unavailable, explicitly label browser/service proof and the native gap; do not call a store/native release verified from browser results.
- [x] Review only this repair's diff against the initial backup and verify unrelated dirty files were preserved. Create focused commits only when integrating the completed repair; no force push or deployment is implied by this plan.
- [x] Completion report separates fixed/reproduced, automated/browser/native evidence, safe legacy recoveries and any unsupported precision case. Do not call the work done from direct completion-service or source-string passes alone.

## Self-review and scope decisions

Every newly reproduced issue is covered: cash/basis/allocation loss (Tasks 1–2), SX arithmetic (3), majority loop/stale response/thresholds (4–5), financial mismatch (5), reminders (6), valuation and stale growth/caps/calendar (7), full purchase → acquisition → real reload → weeks (8).

This plan preserves money already in the wallet, valid share rights, purchase history and signed obligations. It cannot prove a previously lost balance without an older verified source, and it cannot guarantee that an invalid SX *paper market value* remains unchanged while correcting that quote. These boundaries must be stated to the user rather than silently solved by deleting or minting assets.


Implementation notes: focused fixtures live beside their regression audits rather than in a single shared fixture module. The actual browser scripts use `.cjs` to match the repository tooling. Added review regressions cover stale/unsafe ledger debt, unknown and zero historical basis, cent-exact mixed receipts, actual dividend settlement clock, and unsupported min-cent supply. Existing signed terms are not repriced.

## Completed Stocks/Forbes follow-up (23 October)

The user chose to retain both Stocks purchases and Forbes public tenders with clear labels. Additional reproduced route/cooldown, reserved-platform diligence, current private availability, undersized accepted block, fractional/exact-share gap, accepted-price overcharge, acquired receipt and legacy minority-display cases are repaired. Existing accepted contracts and actual paid holdings remain authoritative.

- [x] Reproduce each additional failure and retain red/green service/render/browser evidence.
- [x] Verify 16 focused browser cases and 14 full stock regressions on the final source, including old no-offer private minority records.
- [x] Repeat actual App Stocks purchase → acquisition → verified reload → three actual weeks, and independently paid Forbes tender → verified reload → three actual weeks.
- [x] Confirm unchanged guarded source hashes, preserved unrelated work, and fresh lint/build exit 0. Keep the known unrelated theatrical fixture and native-device gap explicit.

Final evidence and warning dispositions: `docs/reports/2026-10-22-stock-acquisition-fix/route-recheck/README.md`.
