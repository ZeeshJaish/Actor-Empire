# Forbes Studio Profiles Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Forbes studio selectable and show an immersive, data-backed company profile with acquisition status.

**Architecture:** Add a pure studio-profile derivation service and keep selection/rendering inside the existing `ForbesApp`. Reuse world studios, world projects, NPC ventures, universes, and player production-house data; do not add a parallel company database or acquisition workflow.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react, motion/react, esbuild audit scripts, Vite.

---

### Task 1: Studio intelligence model

**Files:**
- Create: `services/forbesStudioProfile.ts`
- Create: `scripts/audit-forbes-studio-profile.ts`
- Modify: `package.json`

- [ ] Write a failing audit importing `buildForbesStudioProfile` and asserting deterministic acquisition states, player ownership, venture pressure, financial metrics, and catalog sorting.
- [ ] Run `npm run audit:forbes-studio-profile` and confirm it fails because the service does not exist.
- [ ] Implement `ForbesStudioProfile`, `StudioAcquisitionState`, and `buildForbesStudioProfile` using existing world and business data.
- [ ] Run `npm run audit:forbes-studio-profile` and confirm all assertions pass.

### Task 2: Immersive profile UI

**Files:**
- Create: `views/mobile/components/ForbesStudioProfile.tsx`
- Modify: `views/mobile/ForbesApp.tsx`
- Create: `scripts/audit-forbes-studio-ui.mjs`
- Modify: `package.json`

- [ ] Write a failing source audit requiring accessible studio-card labels, profile dialog semantics, acquisition-state copy, Financial Command, Performance Record, Catalog Intelligence, Management Style, and Ownership.
- [ ] Run `npm run audit:forbes-studio-ui` and confirm the required profile surface is missing.
- [ ] Convert studio ranking cards to accessible buttons and store the selected profile in `ForbesApp`.
- [ ] Implement the full-screen editorial profile with compact metric strips, acquisition badge, catalog rows, identity section, and a close control.
- [ ] Run both Forbes audits and confirm they pass.

### Task 3: Verification

**Files:**
- Verify only; no new production files expected.

- [ ] Run `npm run audit:forbes-studio-profile`, `npm run audit:forbes-studio-ui`, `npm run lint`, and `npm run build`.
- [ ] In the in-app browser, test Forbes → Studios → select a market studio → inspect profile → close → select the player studio.
- [ ] Verify mobile layout, meaningful empty catalog state, no framework overlay, and no new application errors.

