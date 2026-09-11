# World Economy WE7 Implementation Plan

**Goal:** Make the WE1-WE6 cohort economy authoritative for player, core AI, regional, and generated streaming platforms without simulating rival player workflows.

## Guardrails

- Extend the existing offer, competition, customer, viewing, Platform AI, ecosystem, acquisition, save, and weekly-loop systems.
- Keep WE4 as the finite subscription allocator and WE5 as the persistent customer ledger.
- Keep the player settlement path intact.
- Use aggregate platform outcomes for AI companies; do not materialize a platform x country x cohort x title Cartesian product.
- Apply AI recurring-cost assistance only while the company is AI-controlled.
- Preserve unrelated dirty work and do not commit or push without explicit approval.

## Tasks

1. Add a failing WE7 audit for all-platform customer/viewing/economy reconciliation and ownership-sensitive cost policy.
2. Generalize WE6 with deterministic aggregate rival viewing and platform-level revenue attribution.
3. Add the versioned shared platform economy state and selectors, derived only from WE5/WE6 canonical facts.
4. Synchronize canonical subscribers, audience health, market shares, and strategy signals into the existing Platform AI and ecosystem records.
5. Make Platform AI and generated-operator weekly economics consume the latest canonical result while retaining the existing AI-only efficiency policy.
6. Preserve canonical audience history and use canonical subscribers during platform acquisition handoff.
7. Add save migration, weekly-loop ordering, bounded history, malformed-state recovery, deterministic replay, generated-platform coverage, and focused long-run validation.
8. Update the roadmap and write the WE7 delivery report only after fresh focused audits, TypeScript, and production build pass.

## Verification

- `npm run audit:world-streaming-we7`
- `npm run audit:world-streaming-we6`
- `npm run audit:world-streaming-we5`
- `npm run audit:platform-ai-economy`
- `npm run audit:streaming-acquisitions-phase21`
- `npm run lint`
- `npm run build`
