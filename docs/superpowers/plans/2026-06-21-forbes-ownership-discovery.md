# Forbes Ownership Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add contextual ownership-discovery commands to Forbes studio profiles and route their confirmation into Messages.

**Architecture:** A pure service maps acquisition state to one command and applies it idempotently to player flags and inbox. `ForbesApp` wires the existing player updater to `ForbesStudioProfile`, which renders the state-aware command.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react, esbuild audits, Vite.

---

### Task 1: Discovery service

**Files:**
- Create: `services/forbesOwnershipDiscovery.ts`
- Create: `scripts/audit-forbes-ownership-discovery.ts`
- Modify: `package.json`

- [ ] Write failing assertions for every acquisition-state command, player-owned blocking, duplicate prevention and inbox creation.
- [ ] Run `npm run audit:forbes-ownership-discovery` and confirm the service is missing.
- [ ] Implement action mapping and `applyForbesOwnershipDiscovery`.
- [ ] Run the audit and confirm it passes.

### Task 2: Dossier command and app wiring

**Files:**
- Modify: `views/mobile/components/ForbesStudioProfile.tsx`
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `views/mobile/MobilePage.tsx`
- Modify: `views/MobilePage.tsx`
- Modify: `scripts/audit-forbes-studio-ui.mjs`

- [ ] Add failing source assertions for Ownership Command, Monitor Studio, Express Interest, View Investment Opportunity, Prepare Acquisition and player update wiring.
- [ ] Run `npm run audit:forbes-studio-ui` and confirm the command is missing.
- [ ] Pass `onUpdatePlayer` through both mobile shells into Forbes.
- [ ] Render the state-aware command and completed feedback in the existing dossier.
- [ ] Run both focused audits and TypeScript.

### Task 3: Verification

**Files:**
- Verify only.

- [ ] Run all Forbes audits, TypeScript, production build and scoped diff checks.
- [ ] Browser-test a market command, duplicate prevention, player-owned blocking and the generated Messages entry.
- [ ] Confirm no relevant console errors.

