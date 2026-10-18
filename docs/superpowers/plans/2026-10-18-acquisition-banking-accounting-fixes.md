# Acquisition and banking accounting repair

Approved in chat on October 18, 2026: delegate implementation, preserve legitimate withdrawals/acquisitions and existing saves, verify withdrawal → acquisition → loan repayment, and push the verified fixes.

## Invariants

- Moving the same cash between personal, HQ and subsidiary treasuries cannot manufacture wealth, operating income, credit history or borrowing capacity.
- Preserve legitimate established business value. Additive cash/equity bookkeeping must account for real cash changes without resetting studios to a new-business valuation or rewriting old balances.
- Genuine salary, royalties and external operating income remain recognized. Borrowed principal, capital transfers and capital repayments are not operating income. Preserve loan principal, signed rates, payment history and early repayment.
- A studio-funded acquisition belongs to the funding company. The player's beneficial share follows its shareholders, including later ownership changes, withdrawal rights, bundled sale and save/reload. Personal purchases retain direct ownership.
- Preserve old saves with conservative, unambiguous recovery from recorded closing funding. Never invent missing owners, recursive cycles or historical money adjustments.
- Retain the previous studio-sale protections and unrelated streaming work.

## Delegated tasks

- [x] Bank equity agent: write failing bank/treasury valuation cases, then add current cash basis and attributable equity accounting; refresh basis at genuine revaluations; verify ordinary transfers, minority interests, growth and old saves.
- [x] Bank cashflow agent: write failing false-income/credit cases, then classify operating versus capital/financing flows, reject future transactions, centralize actual bank loan issue/repayment actions and preserve early repayment without credit spam.
- [x] Acquisition equity agent: write failing company-funded ownership cases, then persist beneficial-owner links, recover unambiguous legacy funding, guard source treasury eligibility, and integrate withdrawal/sale/merger ownership.
- [x] Coordinator: exercise real withdrawal → loan issuance → submitted/accepted acquisition → correct target withdrawal → bank/acquisition debt repayment → save/reload. Include valid personal and studio-funded purchases, insufficient funds and repeat-action guards.
- [x] Independent reviewer: inspect the final diff and adversarial ownership/cash/credit paths; rerun original reproductions and report important remaining issues.
- [x] Coordinator: run focused and relevant sale/acquisition/debt/save regressions, typecheck and isolated production build; stage only this repair, verify staged source separately, commit and push without force, verify GitHub ref.

## File ownership

Equity: `services/studioGroupValuation.ts`, focused cash-basis helper, `services/businessLogic.ts`, `scripts/audit-bank-studio-equity.ts`.

Bank flows: `services/loanLogic.ts`, `services/playerBanking.ts`, `views/mobile/BankApp.tsx`, `scripts/audit-bank-transfer-cashflow.ts`.

Acquisition ownership: `services/studioAcquisition.ts`, `services/studioOwnership.ts`, `services/studioGroup.ts`, `services/studioSale.ts`, additive `types.ts` fields and `scripts/audit-studio-funded-equity.ts`. Coordinate cash-basis calls rather than concurrent edits to the same file.

Coordinator owns package commands, aggregate integration test, verification report and publication.

## Verified scope

Implementation and independent review completed. See the verification report for the exact automated/UI checks and conservative legacy attribution boundary. Publication checkbox reflects the completion checklist; verified commit and remote details are recorded in the chat after push.
