# Studio Group Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first Phase 7 slice: a Studio Group surface inside Production House and an immediate, persistent operating-model decision after acquiring a studio.

**Architecture:** Store each acquired studio's operating model on its existing `Business.studioState`, expose model mutations through a focused service, and render the group through a dedicated Production House child view. The acquisition ceremony calls the same service so the immediate decision and later changes share one source of truth.

**Tech Stack:** React 19, TypeScript, Tailwind utility classes, Motion, existing Actor Empire `Player` and `Business` save structures.

---

### Task 1: Operating-model domain

**Files:**
- Modify: `types.ts`
- Create: `services/studioGroup.ts`
- Create: `scripts/audit-studio-group.ts`
- Modify: `package.json`

- [ ] Add `SubsidiaryOperatingModel`, operating-model metadata, and persisted acquired-studio fields.
- [ ] Add selectors for parent studio and acquired subsidiaries.
- [ ] Add a mutation that sets or changes a subsidiary model without replacing unrelated save data.
- [ ] Verify with `npm run audit:studio-group`.

### Task 2: Studio Group game surface

**Files:**
- Create: `views/lifestyle/business/StudioGroupView.tsx`
- Modify: `views/lifestyle/business/ProductionHouseGame.tsx`
- Create: `scripts/audit-studio-group-ui.mjs`
- Modify: `package.json`

- [ ] Add a visible `Studio Group` tab beside the existing studio headquarters.
- [ ] Render the parent company and acquired studio cards with model, capital, valuation, profit, slate, catalog, momentum, and risk.
- [ ] Add a compact operating-model command panel with explicit consequences.
- [ ] Save model changes through the shared service.
- [ ] Verify with `npm run audit:studio-group-ui`.

### Task 3: Immediate post-acquisition decision

**Files:**
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `scripts/audit-studio-acquisition-ui.mjs`

- [ ] Show the three operating models after the acquisition signature completes.
- [ ] Require an operating-model selection before the ceremony's final exit.
- [ ] Persist the selection through the same service used by Studio Group.
- [ ] Keep the acquisition ceremony full-screen while Forbes itself remains inside the phone.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `npm run audit:studio-group`.
- [ ] Run `npm run audit:studio-group-ui`.
- [ ] Run `npm run audit:studio-acquisition-ui`.
- [ ] Run `npm run audit:forbes-studio-ui`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` on all touched files.
