# Streaming Launch S3 Implementation Plan

Execution status: completed on 2026-09-23. The checklist below is the original task order; verified outcomes and limitations are in `docs/superpowers/reports/2026-09-23-streaming-launch-s3.md`.

> **For agentic workers:** Implement inline in this existing checkout using test-first steps and review checkpoints. Do not dispatch subagents or make commits; the user requested inline phase work and the workspace contains unrelated dirty work.

**Goal:** Make group market facts and maps reconcile to countries, and make combined filing use the approved 5/17/25/30 energy schedule without duplicate charges.

**Architecture:** A pure quote function in the market domain is shared by UI previews and the filing transaction; the transaction remains the authority on eligible targets. Group view models derive only from the canonical country catalogue and operation statuses. An atlas-backed group map uses shapes and centroid markers without a second geography registry.

**Tech Stack:** TypeScript, React, Node/esbuild audits, Vite, local browser verification.

**Spec:** `docs/superpowers/specs/2026-09-23-streaming-launch-s3-design.md`

## Global constraints

- Preserve existing dirty work, saves, cash purchase rules, and S1/S2 launch gates.
- No energy or cash mutation in a read-only preview; each filing is an explicit, idempotent transaction.
- No new group-country registry or invented map positions; use the existing sub-region and world-atlas records.
- No commit, push, or S4/S5/S6 work.

---

### Task 1: Canonical filing quote and transaction

**Files:** Create `services/streamingMarketFilingQuote.ts`; modify `services/streamingMarkets.ts`, `services/streamingOpeningProgramme.ts`; create `scripts/audit-streaming-launch-s3-energy.ts` and add its package script.

**Interface:** `quoteStreamingMarketFilingEnergy(count: number): number` returns the approved action cost. The transaction passes its freshly filtered target count, not the requested array length. Opening-programme quote passes its unfiled operation count.

- [ ] Write a table-driven audit with literal `0→0, 1→5, 7→17, 13→25, 23→30`, and a real player transaction covering exact debit, partial filing, repeat no-op, insufficient energy, and unchanged per-country cash.
- [ ] Run the audit and observe a behavior failure under the linear 5×N rule.
- [ ] Implement the pure quote and replace the two transaction/quote multiplications.
- [ ] Run the audit and existing S0/S2/opening-programme/market-lifecycle audits; record any changed assertions as deliberate balance updates, not silent test edits.

### Task 2: Selection and clearance use the canonical quote

**Files:** Modify `components/studio-finance/components/launch/StepMarkets.tsx`, `StepClearance.tsx`, and `components/studio-finance/styles/launch.css`; create `scripts/audit-streaming-launch-s3-ui.tsx`.

**Interface:** The UI imports `quoteStreamingMarketFilingEnergy`; it derives unfiled members from `LaunchData.clearance` and shows the cost for the exact action. The group report keeps standalone 5E separate from the discounted batch quote.

- [ ] Add a rendered-component audit asserting 13-market group 25E, 23-market region 30E, the correct partial-file quote, separate per-country cash, and no already-filed recharge.
- [ ] Run it red against the old 5×N UI.
- [ ] Replace copied energy arithmetic, add per-country report details and aggregate methodology, make Add all switch to Remove all, and lay out the six region controls and summary without truncation.
- [ ] Run the UI audit green and check keyboard-disclosure labels.

### Task 3: Atlas-backed group map and geography audit

**Files:** Create `components/studio-finance/components/launch/GroupMarketMap.tsx`, its pure `finance/groupMarketMap.ts` model, and `scripts/audit-streaming-launch-s3-geography.ts`; modify `StepMarkets.tsx` and `launch.css`.

**Interface:** The map accepts group `Country[]`, selected IDs, and a country-select callback. It reads `getCountryShapeId` and `getCountryPosition`; an atlas-missing shape still renders a marker and remains in the accessible country list.

- [ ] Add a six-region audit with literal Caribbean/NA counts, world-registry membership, finite positions, and a marker fallback for Saint Vincent and the Grenadines.
- [ ] Run it red against missing group-map behavior.
- [ ] Implement the map using shared atlas geometry, and place it in the group report without making marker tapping the only selection path.
- [ ] Run geography and UI audits green; visually check 393×600, 393×852, and desktop widths.

### Task 4: Full S3 gate and report

**Files:** Update the stabilization roadmap's superseded candidate note and S0 failure ledger disposition; create `docs/superpowers/reports/2026-09-23-streaming-launch-s3.md`.

- [ ] Run the S3 audits, S0/S1/S2 audits, market/opening/network lifecycle, TypeScript with sufficient Node heap, and production build.
- [ ] Inspect actual group/clearance components in an isolated synthetic career at the required widths and verify no clipping or quote mismatch; do not touch the user's save.
- [ ] Record every newly observed failure with reproduction, expected/actual behavior, owner, and disposition. Report the remaining S4–S6 issues honestly.
