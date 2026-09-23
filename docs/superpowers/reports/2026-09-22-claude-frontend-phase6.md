# Claude Frontend Integration — Phase 6 Report

**Date:** 2026-09-22  
**Target:** `/Users/zeesh/Vibe code/Actor empire`  
**Branch:** `codex/rights-market-phase1`

## Outcome

Phase 6 connects the regional Network Build to commissioning, construction,
Opening Night, the weekly simulation, reload, and later live expansion without
creating a second infrastructure authority.

The first failing lifecycle assertion exposed the central defect: commissioning
a live expansion replaced the operating network immediately. The corrected
model keeps two explicit revisions:

- `infrastructureSetup` is the network currently serving viewers and being
  charged through weekly operations.
- `pendingInfrastructureSetup` is one paid, immutable change order under
  construction.

The pending revision is promoted atomically on its ready week. Promotion updates
capacity, clears the pending record, writes one deterministic milestone, and is
safe to replay after a reload.

## Canonical lifecycle now covered

- Multi-region intent with Scout, Workhorse, Titan, and cloud survives draft
  save/reload.
- The accepted due-now quote, configuration signature, launch-definition
  signature, rehearsal signature, markets, facilities, rack groups, physical
  envelope, fibre-backed forecast, and construction schedule are frozen at
  commission.
- Commission and live change orders charge exactly once.
- Duplicate commission, duplicate live change order, duplicate weekly process,
  and duplicate completion process are all idempotent.
- Construction progress is derived from the immutable committed and ready weeks;
  reopening does not re-plan the network.
- Opening Night cannot occur before the commissioned programme is ready.
- Weekly infrastructure cost comes from the active revision.
- A live expansion does not change service capacity or weekly cost until its
  ready week.
- A live expansion's strategy and infrastructure-derived technology floor also
  remain pending until the same atomic promotion.
- The Build route displays the pending revision's construction window while the
  existing network continues operating.
- Save schema v27 migrates older careers with no fabricated pending revision.

## Verification

Passed:

- `audit:streaming-regional-network-lifecycle`
- `audit:streaming-opening-programme`
- `audit:streaming-opening-programme-ui`
- `audit:streaming-infrastructure-phase5`
- `audit:streaming-physical-infrastructure-phase5`
- `audit:streaming-infrastructure-operations-phase9`
- `audit:streaming-network-launch-connection-phase4`
- `audit:streaming-weekly-loop-phase10`
- `audit:streaming-launch-phase8`
- `audit:streaming-regional-plan-migration`
- `audit:streaming-build-phase4-ui`
- `audit:streaming-build-lab-career-parity`
- `audit:streaming-research-integration-phase7`
- `audit:streaming-facility-contract`
- all schema-version audits touched by the v27 migration, apart from the
  separately recorded canonical-foundation assertion below
- `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit`
- `npm run build`
- `git diff --check`

The running 393-pixel Network lab was also inspected. North America, Europe, and
Asia rendered from the configured query, switching to Europe updated the map,
coverage, countries, server controls, cloud provider choices, landed rooms, and
costs without losing the regional state.

## Captured non-Phase-6 failures

These audits still stop at previously divergent expectations outside the Phase
6 commissioning lifecycle. They were not weakened or repaired inside this
integration phase:

1. `audit:streaming-canonical-foundation-phase1`
   - `The guided journey must derive one clear next step from canonical facts.`
2. `audit:streaming-infrastructure-finale-phase10`
   - `Patent cinema must preserve research and installation as separate decisions.`

The requested Python Playwright runtime helper was unavailable because the
workspace has no Python `playwright` module. Runtime presentation was therefore
verified through the existing Codex in-app browser instead of installing a new
dependency.

## Protected balance boundary

Claude entries #77, #78, and #79 were not copied or reimplemented.

## Phase 6 gate

The exact commissioned network now survives time progression and reload. The
operating revision, pending construction revision, weekly bill, capacity, Build
presentation, launch readiness, and reopening behavior agree on the same saved
canonical state.
