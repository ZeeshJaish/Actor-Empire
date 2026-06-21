# Forbes Company Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rights, franchises, universes, facilities and talent intelligence to the existing Forbes studio profile.

**Architecture:** Extend `buildForbesStudioProfile` with one strategic-assets view model derived from data already passed by `ForbesApp`. Render the result inside `ForbesStudioProfile`; keep estimates deterministic and visibly labelled.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react, esbuild audits, Vite.

---

### Task 1: Strategic asset derivation

**Files:**
- Modify: `services/forbesStudioProfile.ts`
- Modify: `scripts/audit-forbes-studio-profile.ts`
- Modify: `views/mobile/ForbesApp.tsx`

- [ ] Add failing assertions for actual player rights, franchise IDs, universe ownership, facility upgrades and talent names.
- [ ] Run `npm run audit:forbes-studio-profile` and confirm the strategic asset assertions fail.
- [ ] Extend the input and output types with `rightsCount`, `franchiseCount`, `universes`, `facilities`, `keyTalent` and `assetDataSource`.
- [ ] Pass the player studio's existing rights, projects, facility state, staff and contracts from `ForbesApp`.
- [ ] Run `npm run audit:forbes-studio-profile` and confirm it passes.

### Task 2: Company assets UI

**Files:**
- Modify: `views/mobile/components/ForbesStudioProfile.tsx`
- Modify: `scripts/audit-forbes-studio-ui.mjs`

- [ ] Add failing source assertions for Strategic Assets, Rights & IP, Franchises, Universes, Facilities and Key Talent.
- [ ] Run `npm run audit:forbes-studio-ui` and confirm the new section is missing.
- [ ] Add compact asset cells and a talent strip below Performance Record.
- [ ] Run both Forbes audits and `npm run lint`.

### Task 3: Verification

**Files:**
- Verify only.

- [ ] Run the two Forbes audits, `npm run lint`, `npm run build` and scoped `git diff --check`.
- [ ] Browser-test one market studio, the player studio and an NPC venture.
- [ ] Confirm the profile distinguishes save data from Forbes estimates and introduces no relevant console errors.

