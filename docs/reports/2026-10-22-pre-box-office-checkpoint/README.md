# Checkpoint before box-office Phase 1 — 22 October 2026

This checkpoint preserves the current streaming Operations implementation and the approved, source-traced box-office redesign before any box-office gameplay edits. Parent: `612efbb1cb6c80a22d1ba30fde4a1d88f90cdc4e`; branch: `codex/streaming-tap-lag`.

## Included work

- Focused live streaming Pricing, Ident, Storefront, Markets, Clearance and Network revision controls, with save/reload, affordability, research and duplicate-payment guards.
- Streaming Audience world map and settled-country account presentation, expansion footprint, Boardroom M&A placement, and preservation of paid language assets beyond the previous global array limit.
- Streaming Operations service/UI audits, disposable QA pages and responsive screenshots. [Implementation and limitations](../2026-10-21-streaming-operations/README.md) and [recorded prior verification](../2026-10-21-streaming-operations/verification.json).
- Current box-office audit and controlled reproductions: [report](../2026-10-22-box-office-analysis/report.md), [results](../2026-10-22-box-office-analysis/results.json), [final design](../../superpowers/specs/2026-10-22-fair-box-office-design.md) and [six-phase plan](../../superpowers/plans/2026-10-22-fair-box-office.md).

## Fresh checkpoint verification

- `npm run build`: passed, 22.84 seconds. Existing large-bundle/Browserslist notices remain.
- Streaming Operations service audit: passed using the existing local prepared fixture. Covers live save/reload, immutable signed launch/rights/customer state, exact ident charges, no-op/research/cash refusal, pending network revisions, expansion and next-week customer pricing.
- Streaming Operations UI/adapter audit: passed. Covers focused Operations navigation and canonical incremental network quotations.
- `git diff --check`: passed.
- `npm run lint` (TypeScript): passed. Fresh check outcomes are recorded in [verification.json](verification.json).

The two new Operations audits depend on prepared files outside Git (`/tmp/streaming-cheats-finished.json`, then `/tmp/streaming-operations-live.json`). They are local fixture checks, not fresh-checkout standalone tests. No raw player save is included in this checkpoint.

## Scope and known limits

The new box-office audience engine is a design at this checkpoint. It is not implemented, balanced or device-certified. IMDb numerical-rating and series redesign remain outside its scope.

The streaming report retains two pre-existing broader audit failures (persona percentage reconciliation and promoted-title discovery reconciliation) and a prepared 197-market full-week viewing-stage timeout reproduced against its original baseline. Passing Operations checks does not clear those separate issues. Physical-phone performance was not certified.

The next implementation is box-office **Phase 1 only**: canonical cast/owner identity, continuous production/delivery inputs, and realized-gross/cost accounting. Audience allocation, new awareness/Greenlight presentation, market migration and live shared ticket settlement follow later phases.
