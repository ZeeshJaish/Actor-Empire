# Shared budget and usage-based streaming implementation

**Approved design:** The user approved cross-service rental opportunities, one conserved audience budget, usage-sensitive subscription value, unchanged real costs and a complete rerun with measured results.

**Goal:** Remove structural subscription priority without creating buyers, spending power or profit subsidies.

**Architecture:** Keep primary household choices as a conserved partition. Model secondary public-store opportunities separately. A country/cohort commercial budget reserves all subscriptions and divides the remaining weekly spending capacity among competing platforms before any player or AI store settles. Forecast and live viewing use the same rules; purchases remain rights- and ownership-gated.

**Constraints:** Preserve existing dirty work and signed contracts. No changes to capital, license guarantees, audience budgets or infrastructure quotes. Income is earned transactions only. Report recurring cash, content cost and cumulative investment separately. This is an aggregate cohort economy, not individually identified real customers.

## 1. Choice and budget regressions

- [x] Add `scripts/audit-streaming-shared-budget.ts` exercising real allocation and viewing: a rival subscriber can rent; primary households still conserve; all plans reserve spending; competing store receipts cannot exceed one remaining weekly budget; no spend at zero remaining budget; membership and ownership still gate sales; occasional and frequent viewers respond differently to monthly value.
- [x] Run the audit against the old behavior and retain the failing output.

## 2. Shared choice and commercial allocation

- [x] Add `services/worldEconomy/worldStreamingHouseholdBudget.ts` for deterministic bounded opportunity sources and integer-cent commercial budget allocation.
- [x] Update `worldStreamingCompetition.ts` to value a monthly plan against expected viewing use and available transactional alternatives.
- [x] Wire separate store opportunities into `worldStreamingAudienceChoice.ts` and its entitlement reach validation. Keep primary counts unchanged by secondary opportunities.
- [x] Wire player/AI viewing and pricing forecasts into the shared budget/source rules. Save derived spending evidence with the viewing result. Retain transaction idempotency and title ownership reservations.
- [x] Run focused audits; resolve failures by checking actual contract changes rather than weakening integrity assertions.

## 3. Balance and full verification

- [x] Rerun all previously retained balance configurations with the final source, plus live license-quote cases, full maintenance cycles, cross-service cases and pricing/quality sensitivities. Keep starting capital outside income.
- [x] Run the expanded 50 selected regression suites, typecheck, production build and diff checks. 49 passed; the awards failure was reproduced against its HEAD baseline and disclosed.
- [x] Review the money paths for duplicate spending/settlement and inconsistent forecast/live sources.
- [x] Save actual measured results, failed gates if any, realistic viable ranges and remaining limitations in a new report. Do not grant a profit green light on synthetic cheap rights.
