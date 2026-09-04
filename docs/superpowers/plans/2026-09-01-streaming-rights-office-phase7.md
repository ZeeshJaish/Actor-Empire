# Streaming Rights Office Phase A7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a manageable Rights Office with persistent licensing mandates, explainable delegation, commercial relationship intelligence, factual studio/platform statements, and an idempotent weekly digest.

**Architecture:** Extend the existing A4 management state for durable player authority, add a bounded A7 digest ledger, and derive portfolio, relationship, and statement projections from the A1–A6 canonical records. Keep rights, cash, catalogue, and relationship authority in their existing systems.

**Tech Stack:** React 19, TypeScript, existing deterministic services and SSR audit scripts, Vite, CSS.

**Spec:** `docs/superpowers/specs/2026-09-01-streaming-rights-office-phase7-design.md`

## Global Constraints

- `WorldState.streamingRightsContracts` remains the sole exploitation authority.
- Do not create parallel cash, rights, catalogue, revenue, or relationship truth.
- Custom Control remains the migration-safe default.
- Delegation cannot bypass permanent-rights, franchise, global-exclusive, package-size, term, or solvency protections.
- Switching control modes affects only future unresolved decisions.
- Do not fabricate unavailable finance or forecast data.
- Preserve unrelated dirty work and do not commit or push without explicit user authorization.

---

### Task 1: A7 schemas, mandate normalization, and persistence

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingRightsCalendar.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Test: `scripts/audit-streaming-rights-office-phase7.ts`

**Interfaces:**
- Produce `StreamingRightsStudioMandate`, `StreamingRightsTitleControlOverride`, `StreamingRightsDelegationTrace`, `StreamingRightsOfficeDigest`, and `StreamingRightsOfficeState`.
- Produce `getStreamingRightsStudioMandate(player, studioId)` and `updateStreamingRightsStudioMandate(player, input)`.

- [x] Write a failing audit asserting Custom defaults, bounded normalization, per-studio overrides, revision increments, future-only mode switching, and save round-trip behavior.
- [x] Run `npm run audit:streaming-rights-office-phase7` and confirm failure because the A7 interfaces do not exist.
- [x] Add the smallest schema and normalization implementation that satisfies those assertions.
- [x] Advance migration and compaction while preserving legacy A4 policy behavior.
- [x] Re-run the audit and keep it green before continuing.

### Task 2: Rights Office portfolio and explainable delegation

**Files:**
- Create: `services/streamingRightsOffice.ts`
- Modify: `services/streamingRightsCalendar.ts`
- Modify: `services/streamingCataloguePackageAutomation.ts`
- Test: `scripts/audit-streaming-rights-office-phase7.ts`

**Interfaces:**
- Produce `getStreamingRightsOffice(player, studioId, absoluteWeek): StreamingRightsOfficeView`.
- Produce `createStreamingRightsDelegationTrace(...)` using literal decision facts and the saved mandate revision.

- [x] Add failing cases for all six portfolio groups and for a delegated renewal trace that cites its exact mandate revision and factual thresholds.
- [x] Confirm RED from missing office projection and trace.
- [x] Implement the deterministic portfolio projection from contracts, renewal cases, package records, completed studio titles, and canonical status.
- [x] Route new delegated renewals and package decisions through the trace helper without rerolling existing cases.
- [x] Add a 40-title fixture proving Strategy and Custom expose a bounded action rail while Full Control preserves access to every detailed record.
- [x] Re-run the focused audit to GREEN.

### Task 3: Relationship intelligence and commercial statements

**Files:**
- Modify: `services/streamingRightsOffice.ts`
- Test: `scripts/audit-streaming-rights-office-phase7.ts`

**Interfaces:**
- Produce `getStreamingCommercialRelationships(player, studioId)`.
- Produce `getStreamingStudioCommercialStatement(player, studioId)`.
- Produce `getStreamingPlatformCommercialStatement(player, platformPartyId)`.

- [x] Add failing literal-fixture assertions for accepted/rejected offers, renewal history, commission outcomes, breach recovery, profitable royalties, and transfer history.
- [x] Add failing reconciliation assertions separating guarantees, funding, adjusted gross, accrued backend, paid backend, recoupment, transfer proceeds, and retained platform contribution.
- [x] Confirm RED because the projections are absent.
- [x] Implement factual derivation from existing canonical registries and ledgers with no invented estimates.
- [x] Re-run the focused audit to GREEN and mentally mutate each source category to confirm coverage catches omission or double counting.

### Task 4: Idempotent weekly Rights Office digest

**Files:**
- Modify: `services/streamingRightsOffice.ts`
- Modify: `services/gameLoop.ts`
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Test: `scripts/audit-streaming-rights-office-phase7.ts`

**Interfaces:**
- Produce `processStreamingRightsOfficeWeek(player, absoluteWeek)` returning `{ player, processed, digest }`.

- [x] Add failing tests for one digest per active week, no empty-week noise, bounded history, factual counts, and same-week replay identity.
- [x] Confirm RED before game-loop integration.
- [x] Implement digest generation after existing renewal and package processing.
- [x] Add one concise log only when a new non-empty digest is created.
- [x] Re-run the focused audit and existing weekly-loop/save audits.

### Task 5: Player-facing Rights Office

**Files:**
- Modify: `components/StreamingRightsCalendar.tsx`
- Modify: `styles/streaming-rights-calendar.css`
- Modify: `views/lifestyle/business/ProductionHouseGame.tsx`
- Test: `scripts/audit-streaming-rights-office-phase7.ts`

**Interfaces:**
- Consume the A7 office, mandate, relationship, and statement projections.
- Preserve the existing `StreamingRightsCalendar` component boundary for Production House and EMPIRE+ callers.

- [x] Add failing SSR assertions for `Rights Office`, Portfolio, Mandate, Relationships, Statements, Packages, mandate reasoning, relationship evidence, statement labels, and the bounded action queue.
- [x] Confirm RED because the new sections are absent.
- [x] Replace the studio header and section navigation while preserving the compact desk aesthetic and existing detailed renewal actions.
- [x] Add mandate controls with active labels, precise feedback, and visible protected-boundary copy.
- [x] Add relationship rows and reconciled statement lines without card grids or hidden “best deal” language.
- [x] Add responsive layout, keyboard focus, and reduced-motion rules.
- [x] Re-run SSR audit to GREEN.

### Task 6: Regression, browser QA, roadmap, and report

**Files:**
- Modify: `package.json`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Create: `docs/superpowers/reports/2026-09-01-streaming-rights-office-phase7-report.md`

- [x] Run A1–A7 rights audits, marketplace, relevant Platform AI, migration, save-transfer, and weekly-loop audits.
- [x] Run `npm run build`, `npm run lint`, and `git diff --check`; separate pre-existing diagnostics from A7-owned failures.
- [x] Run mobile and desktop browser QA against the real local app, confirming no horizontal overflow and a usable bounded projection; the 40-title workload is covered by the focused audit fixture.
- [x] Record exact evidence and any pre-existing repository debt in the completion report.
- [x] Mark A7 complete and A8 next only after fresh verification evidence exists.
