# C4 — live commercial economy implementation plan

Date: 2026-09-23
Status: C4 implementation and economy verification complete; C5 presentation and C6 release regression remain separate.

## Baseline and boundaries

- Preserve the dirty C1–C3 implementation and all previously settled cash.
- C0 fixed-input reference: 600,000 ad-eligible hours at 4 minutes/hour and target $20 CPM produces $76,531 under the old direct-CPM formula. Ad-only live scenario has 250,000 synthetic `OPEN_ACCESS` accounts, 347,977 delivered hours, and $0 ad revenue. These are diagnostic baselines, not C4 targets.
- Existing rights and weekly treasury deductions remain authoritative. New gross revenue must flow through the current WE6/WE7 and player weekly-loop settlement, not a second treasury.
- Legacy sponsor/patron configured income remains until a separate conversion decision.

## Implementation sequence

1. Add behavior tests for non-subscriber access, country-specific advertiser demand, target/fill tradeoff, budget cap, zero cases, replay determinism, and weekly settlement reconciliation. Observe red tests before changing production code.
2. Replace zero-price paid customer allocation with paid-only C3 subscription choices, while retaining old save normalization and migration. Keep free/store households in C3 rather than `paidAccounts`.
3. Feed C3 free and transaction cohorts into player and AI viewing. Resolve title access before delivered viewing or transaction revenue; failed rights/network routes cannot earn.
4. Add a deterministic country-week ad-market resolver. Player and AI target CPM and ad load are strategy inputs; country demand determines fill and realized CPM. Share this function between forecast and live WE6, with bounded spend and finite output.
5. Settle pass and uniform rent/buy transactions exactly once with compact aggregate entitlements. Reconcile country, title, platform, global, rights costs, and treasury; preserve historical transactions and old saves.
6. Run fixed-input, player, AI, old-save, week-replay, build, targeted typecheck, and known baseline audits. Capture before/after balance and performance. If the shift needs a design/balance choice, report it before changing constants.

## Stop conditions

- No synthetic free account can appear as a paid subscriber or produce subscription income.
- Zero delivered eligible viewing or zero country advertiser demand cannot create ad revenue.
- A rent/buy transaction without a valid title-country access route cannot settle.
- A second evaluation of the same week cannot charge again.
- Sponsor/patron historical accrual is not removed in C4 without an approved conversion rule.
