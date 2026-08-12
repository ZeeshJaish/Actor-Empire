# EMPIRE+ Phase 5 — Infrastructure and Subscription Setup

Phase 5 gives the incorporated platform its first real operating configuration. It adds gameplay-funded infrastructure, a modeled load test, rollout tradeoffs, and explicit Basic/Premium/Family prices. It does not launch the service or create subscribers.

## Connected player flow

1. Open Technology Campus in Platform HQ.
2. Compare cloud-first, owned-network, and hybrid architecture.
3. Select Starter, Essential, Growth, or Premiere capacity.
4. Choose a Safe, Standard, or Rushed rollout.
5. Review disclosed capital, weekly cost, staff, construction weeks, reliability, and technical debt.
6. Run a modeled load test tied to that exact infrastructure signature.
7. Inspect low, likely, and high demand ranges and their drivers.
8. Set Basic, Premium, and Family monthly prices.
9. Review the complete operating setup.
10. Approve one atomic company-treasury transaction.

The draft resumes at its saved screen. Infrastructure changes invalidate an older load test; pricing changes do not.

## Canonical state

These records were introduced in the Phase 5 slice and now normalize under
owned-platform schema v7:

- `infrastructureSetupDraft`
- `infrastructureSetup`
- `subscriptionPrices`
- the `INFRASTRUCTURE_COMMITTED` ledger event

Canonical baseline and burst capacity remain in `capacity`. The committed setup stores storage, reliability, weekly operating cost, staff, capital invested, technical debt, game-week readiness, revision, and the historical load-test snapshot.

## Forecast contract

Demand is a planning range derived from:

- current capacity-derived reach level
- selected baseline and burst capacity
- delivery and reliability technology
- selected architecture and rollout

The first draft suggests Hybrid, Standard, and the $7.5M Starter Rack so the
fixed $15M opening treasury can fund a real Level 0 configuration. Reach is not
selected here: it is recalculated from canonical capacity and technology after
company actions.

It is never presented as guaranteed subscribers. Load-test status is:

- **PASS:** high-case demand clears with sufficient headroom and reliability.
- **CONDITIONAL:** likely demand clears, but safety margin or reliability is thin.
- **FAIL:** modeled high-case demand exceeds burst capacity.

Players may knowingly continue with a conditional or failed test. Phase 8 will surface the same risk before launch.

## Rollout consequences

- **Safe:** longer construction, higher setup cost, best reliability, no starting technical debt.
- **Standard:** balanced construction and light starting debt.
- **Rushed:** shortest construction, rush premium, lower reliability, and significant technical debt.

Construction uses game weeks only. Weekly infrastructure cost is disclosed now but does not begin processing until streaming operations are integrated in a later phase.

## Subscription contract

Basic, Premium, and Family each have distinct features and editable monthly prices. The screen shows planning ARPU and price position, but real ARPU remains unavailable until subscribers and weekly simulation exist.

Pricing-only revisions before launch carry no infrastructure capital charge. Infrastructure change orders reuse 45% of the selected stack and disclose the remaining company cost.

## Explicitly deferred

- Catalog import and licensing: Phase 6
- First Original and twelve-week slate: Phase 7
- Final readiness and launch simulation: Phase 8
- Real subscribers, revenue, churn, and weekly infrastructure cost: Phase 10
- Full technology upgrade tree: Phase 17

## Verification

```bash
npm run audit:streaming-infrastructure-phase5
npm run audit:streaming-hq-phase4
npm run audit:streaming-founding-phase3
npm run audit:streaming-access-phase2
npm run audit:save-migration
npm run audit:save-transfer
npm run build
```
