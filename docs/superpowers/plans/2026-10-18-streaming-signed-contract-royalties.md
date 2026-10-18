# Signed streaming royalties and catalogue profit verification

User-authorized scope: replace the owned-platform subscription aggregate estimate with title-attributed, signed-contract royalties; apply advances/caps exactly once across revenue modes, preserve signed terms and historical payments, provide player/rival parity, rerun existing checks and measure broad diverse catalogues. Explain model attribution versus real-world contractual backend without claiming causal profit measurement.

## Design

Subscription receipts are a finite country/plan revenue pool. Allocate once across all legitimately included titles, including owned/zero-backend titles, using the existing contribution allocator (watch hours, viewing accounts, acquisition and retention signals). These are explicit simulation attribution signals, not measured counterfactual profit. Do not spread a country's receipts onto a title lacking that country/plan's rights. No viewers/attribution evidence means no invented royalty allocation.

Sum each signed contract's attributable subscription, advertising/non-store and direct-store receipts before calculating its single royalty accrual. Apply its own signed percentage, recoupable advance and payment cap to persisted cumulative totals. Preserve historical accruals, use durable receipt-week settlement guards, and pay actual sellers only from matching buyer expense evidence. Existing non-recouppable contracts remain non-recouppable; no automatic net-profit rewrite, cost/budget subsidy, or retroactive charges for previously approximated weeks.

Use the same allocation/settlement kernels for player and AI. Persist sufficient current-week contribution/contract evidence for the finance explanation, reload and replay checks. Keep title-level Finance attribution consistent with the royalty base.

## Work

- [x] Trace existing attribution, contract settlement, AI timing and seller cash paths; capture the current dirty-source baseline.
- [x] Add failing conservation, exact signed cost, combined cap/advance, territorial/plan, zero-contribution, replay/reload and seller debit-credit regressions.
- [x] Implement the shared allocation and settlement paths and durable normalization; preserve existing signed deals and old saves.
- [x] Run focused tests and independent money-path review; fix material findings without weakening assertions.
- [x] Freeze final source; rerun the retained baseline, expanded 69 selected suites, typecheck/build and new diverse-catalogue cases with real quotes and all costs: 173 scenarios / 6,964 weeks / 170 passing jobs; 64 suites pass, five proven pre-existing failures.
- [x] Publish measured operating contribution and cash after paid investments, acquisition/maintenance/royalty costs, catalogue quality/breadth/pricing effects and remaining limitations. Separate legacy V7 and current V8 founding cases; disclose uncorrected long-run amortization display and five baseline failures.

## Evidence

Baseline copies and working evidence: `/tmp/streaming-contract-royalties-20261018`. Final durable evidence will be retained under this chat's visualization directory. No commit, push, deployment or unrelated dirty-file restoration is authorized by this task.

Focused implementation evidence: 26 regressions cover exact signed subscription and advertising, finite pools, combined advances/caps, no-customer ad/store sources, archived/current/legacy studio receipts with investor/talent deductions, true sellers, canonical buyer identity, expiry/transfer timing, serialization and replay after history pruning. Independent read-only review reproduced and resolved the pure-ad underpayment and archive/provenance findings. Final full rerun complete: 26/26 focused cases, 18/18 balance criteria, zero weekly cash/budget/turnover identity failures; TypeScript/build/diff checks pass. All 425 frozen runtime hashes remain unchanged. Detailed results and permanent evidence are linked in the report.
