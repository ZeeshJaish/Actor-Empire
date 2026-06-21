# Owned IP Performance Dossier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen owned-IP dossier inside the current IP Library using existing script and release data.

**Architecture:** A pure `ownedIpPerformance` service matches and summarizes existing records. A focused `OwnedIpDossier` component renders the overlay, while `DevelopmentLab` owns open/close/develop state and `ProductionHouseGame` handles the existing Project Dashboard handoff.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node/esbuild audits, Vite

---

### Task 1: Lock performance behavior with a failing audit

**Files:**
- Create: `scripts/audit-owned-ip-performance.ts`
- Modify: `package.json`

- [ ] Define fixtures for one owned IP, a linked script, active releases, completed projects, ratings, awards, and outcome tiers.
- [ ] Assert subject/studio matching, lifetime gross, average rating, release ordering, awards, audience strength, momentum, and the unproven state.
- [ ] Run `npm run audit:owned-ip-performance` and verify it fails because `services/ownedIpPerformance.ts` does not exist.

### Task 2: Build the pure existing-data adapter

**Files:**
- Create: `services/ownedIpPerformance.ts`

- [ ] Implement owned-right script matching through `OWNED_RIGHT:<id>`.
- [ ] Implement active and completed release matching through normalized `subjectName` plus studio ID.
- [ ] Return normalized project rows and derived performance labels without mutating input.
- [ ] Run `npm run audit:owned-ip-performance` and verify it passes.

### Task 3: Lock the dossier UI contract

**Files:**
- Modify: `scripts/audit-owned-right-ui.mjs`

- [ ] Add failing assertions for `IP Performance Dossier`, `Performance Pulse`, `Screen History`, `Development Pipeline`, `Open Project`, and `onOpenProject`.
- [ ] Run `npm run audit:owned-right-ui` and verify the new assertions fail.

### Task 4: Build and wire the dossier overlay

**Files:**
- Create: `views/lifestyle/business/components/OwnedIpDossier.tsx`
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`
- Modify: `views/lifestyle/business/ProductionHouseGame.tsx`

- [ ] Render the approved command header, rights strip, performance pulse, history, pipeline, and unproven empty state.
- [ ] Make the IP card body open the dossier while keeping Develop IP as a direct action.
- [ ] Hand Develop IP back to the existing authorization brief.
- [ ] Pass an `onOpenProject` callback from Production House that sets the existing selected project and returns to the dashboard.
- [ ] Run both owned-IP audits and verify they pass.

### Task 5: Verify the existing flow

**Files:**
- Verify: `services/ownedIpPerformance.ts`
- Verify: `views/lifestyle/business/components/OwnedIpDossier.tsx`
- Verify: `views/lifestyle/business/DevelopmentLab.tsx`
- Verify: `views/lifestyle/business/ProductionHouseGame.tsx`

- [ ] Run rights audits, TypeScript lint, production build, and targeted `git diff --check`.
- [ ] Use the in-app Browser at `http://127.0.0.1:3000/` to verify dossier open/close, unproven state, Develop IP, and the existing Project Dashboard handoff without creating a project.
