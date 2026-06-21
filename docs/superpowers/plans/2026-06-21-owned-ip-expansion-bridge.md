# Owned IP Expansion Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify acquired and released original IP in the existing library and bridge expansion into current Franchise and Universe systems.

**Architecture:** Extend the owned-IP data adapter with derived Studio Original assets and provenance metadata. Keep `DevelopmentLab` as orchestration, reuse `OwnedIpDossier`, and switch existing tabs for franchise/universe management rather than implementing duplicate controls.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node/esbuild audits, Vite

---

### Task 1: Define unified ownership and persistence metadata

**Files:**
- Modify: `types.ts`
- Modify: `views/lifestyle/business/GreenlightWizard.tsx`
- Modify: `services/gameLoop.ts`

- [ ] Add optional ownership provenance and source project fields to `OwnedRight`.
- [ ] Persist `isOriginal` into `ProjectDetails` and `PastProject`.
- [ ] Preserve `sourceScriptId` when an active release becomes a past project.

### Task 2: Test and derive Studio Original IP

**Files:**
- Create: `scripts/audit-studio-original-ip.ts`
- Modify: `package.json`
- Create: `services/studioOriginalIp.ts`

- [ ] Write failing fixtures for deterministic source-script matching, legacy title fallback, franchise grouping, standalone assets, and acquired-right de-duplication.
- [ ] Run the audit and verify the missing service failure.
- [ ] Implement pure derived Studio Original `OwnedRight` records without mutating save data.
- [ ] Run the audit and verify it passes.

### Task 3: Test and implement licence renewal

**Files:**
- Modify: `scripts/audit-rights-negotiation.ts`
- Modify: `services/rightsNegotiation.ts`

- [ ] Add failing assertions for availability, cost, 104-week extension, permanent-right rejection, and insufficient capital.
- [ ] Implement `getOwnedRightRenewalQuote` and `renewOwnedRight`.
- [ ] Run the rights negotiation audit and verify it passes.

### Task 4: Extend the unified IP UI

**Files:**
- Modify: `scripts/audit-owned-right-ui.mjs`
- Modify: `views/lifestyle/business/components/OwnedIpDossier.tsx`
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] Add failing UI assertions for Studio Original, Expansion Command, Franchise Command, Universe Command, Hold IP, and Renew Licence.
- [ ] Merge acquired and derived original assets before rendering the library.
- [ ] Give Studio Original cards permanent-control provenance without fake purchase cost.
- [ ] Add expansion handoffs and renewal feedback to the dossier.
- [ ] Keep acquired Develop IP behavior unchanged.

### Task 5: Verify Phase 4 completion

**Files:**
- Verify all modified files.

- [ ] Run original-IP, performance, rights, sequel, universe, UI, lint, build, and targeted whitespace checks.
- [ ] Use the in-app Browser to verify source badges, dossier ownership language, Franchise and Universe handoffs, Hold IP, and renewal visibility.
