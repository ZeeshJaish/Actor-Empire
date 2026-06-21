# Owned IP Card Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace oversized Rights Library cards with compact IP dossiers and show lifetime gross from existing released projects.

**Architecture:** Keep the current `ScriptVault` and owned-right development flow. Add a small pure performance helper beside the Rights Library UI that derives matching revenue from `Player.activeReleases` and `Player.pastProjects` through the existing `subjectName`, then render the result in the existing owned-right map.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node source audit, Vite

---

### Task 1: Lock the approved UI contract

**Files:**
- Modify: `scripts/audit-owned-right-ui.mjs`

- [ ] Add failing assertions for `Owned IP`, `IP Library`, `Develop IP`, `Lifetime Gross`, `Unproven`, `activeReleases`, `pastProjects`, and `subjectName`.
- [ ] Run `npm run audit:owned-right-ui` and verify it fails because the card still uses property terminology and has no revenue metric.

### Task 2: Derive existing IP performance

**Files:**
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] Add a pure `getOwnedIpLifetimeGross` helper that matches releases by normalized `subjectName` and sums non-negative theatrical gross and streaming revenue.
- [ ] Use the existing `player` prop; do not add storage fields or mutate save data.
- [ ] Run `npm run audit:owned-right-ui` and confirm only rendering assertions remain failing.

### Task 3: Render the compact dossier

**Files:**
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] Rename visible asset language from property to IP while preserving rights language for expiry and deal terms.
- [ ] Replace the large card anatomy with a compact header, three-column performance rail, and slim Develop IP button.
- [ ] Render `Unproven` when lifetime gross is zero; otherwise use `formatCurrency`.
- [ ] Run `npm run audit:owned-right-ui` and confirm it passes.

### Task 4: Verify behavior and presentation

**Files:**
- Verify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] Run `npm run lint`, rights audits, `npm run build`, and a targeted `git diff --check`.
- [ ] Use the in-app Browser at `http://127.0.0.1:3000/` to verify the Rights lane, compact mobile density, terminology, lifetime gross state, and Develop IP modal interaction.

### Task 5: Highlight ownership scope

**Files:**
- Modify: `scripts/audit-owned-right-ui.mjs`
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] Add failing source-audit assertions for `Character IP`, `Story World IP`, `Franchise IP`, and `Catalog IP`.
- [ ] Add one presentation mapper for the existing `propertyType` values, returning the approved label, icon, and tone.
- [ ] Replace the combined `GENRE · TYPE` text with muted genre text and a colored IP-type badge on the same line.
- [ ] Run the UI audit, TypeScript lint, production build, and Browser visual QA; verify the card height is unchanged and the type badge is readable.
