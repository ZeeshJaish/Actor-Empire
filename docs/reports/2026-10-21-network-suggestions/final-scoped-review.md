# Final scoped re-review — canonical unpaid commitments

Range: `e88e984..a42ea26`. Reviewed the complete three-file fix diff and `final-fix-report.md`. Scope was the previous final-review P2 and breakage introduced by this fix only. No test reruns, browser actions, subagents, product edits or Git-state changes; this report is the only write.

## Previous finding

**P2 settled-spend double reservation: ADDRESSED.**

`components/studio-finance/finance/networkSuggestions.ts:134-138` now honors explicit `MoneyPlan.deferred`, including zero. Historical `treasury.committedLaunch` participates only when explicit deferred accounting is absent. This resolves the reviewed CAREER mismatch while retaining the legacy fallback and the same upfront, weekly, treasury and canonical available-money limits. Generate and Apply share this gate.

## Strengths

- The production change is limited to the accounting precedence responsible for the finding; it does not alter transactions, persistent state, placement or UI behavior.
- Regressions exercise actual CAREER adapter accounting with $150M settled spend and $100M remaining cash. They cover both an empty zero-limit plan and a positive-cost Scout retained in the draft, avoiding dependence on whether the heuristic happens to prefer zero-upfront cloud.
- Separate real marketing inputs exercise genuinely unpaid obligations equal to cash and $1 above cash. A swapped actual CAREER money bridge also proves the final Apply affordability gate refuses newly insufficient funds even with otherwise unchanged input identity; the expected rejection message distinguishes this from generic stale-evidence refusal.
- The capture helper's new options are test-only, optional and default-compatible. Existing source-player immutability assertions remain.
- The supplied report records the original `INVALID !== READY` RED, then focused GREEN, canonical parity, draft continuity and diff-check success. These results were inspected as reported rather than rerun.

## New issues introduced by this fix

### Critical

None found.

### Important

None found.

### Minor

None found.

## Assessment

**Scoped correction approved. Previous P2 addressed; no unresolved findings in the reviewed fix diff.**

The prior whole-change review's sole Important finding is closed. Final amended-head TypeScript, production build and scale verification remain controller-owned and were underway at dispatch; this approval does not substitute for their results. Previously disclosed baseline SSR audit failures, audit-bundle notices and broader Build cold-open latency remain unchanged by this correction.
