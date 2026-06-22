# Acquisition Desk Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Acquisition Desk's competing back and close controls with one state-aware back arrow.

**Architecture:** Keep navigation inside `StudioAcquisitionDesk` and use the persisted submitted-offer state already derived by the component. Extend the existing source audit so the navigation contract remains protected without introducing a second state machine.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node source-audit scripts, Vite

---

### Task 1: Protect the navigation contract

**Files:**
- Modify: `scripts/audit-studio-acquisition-ui.mjs`
- Test: `scripts/audit-studio-acquisition-ui.mjs`

- [ ] **Step 1: Add failing source assertions**

Require a submitted-offer guard that invokes `onClose`, require the profile-exit accessible label, and reject both the X icon import and a second close button.

- [ ] **Step 2: Verify the audit fails**

Run: `npm run audit:studio-acquisition-ui`

Expected: FAIL because the current component still renders the X and Review always returns to Funding.

- [ ] **Step 3: Commit the audit with the implementation after green**

Stage only the audit and component files to avoid unrelated dirty-worktree changes.

### Task 2: Implement state-aware back navigation

**Files:**
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Test: `scripts/audit-studio-acquisition-ui.mjs`

- [ ] **Step 1: Add the submitted-offer exit guard**

At the start of `goBack`, after clearing transient feedback, call `onClose()` and return when `submittedOffer` exists.

- [ ] **Step 2: Remove the redundant close control**

Delete the X button and its icon import. Make the arrow label `Back to studio profile` for the entry and submitted states, otherwise `Previous acquisition step`.

- [ ] **Step 3: Verify the audit passes**

Run: `npm run audit:studio-acquisition-ui`

Expected: `Studio acquisition UI audit passed.`

### Task 3: Regression and rendered verification

**Files:**
- Verify: `views/mobile/components/StudioAcquisitionDesk.tsx`

- [ ] **Step 1: Run focused and broad checks**

Run `npm run audit:studio-acquisition`, `npm run lint`, `npm run build`, and `git diff --check` for the two implementation files.

- [ ] **Step 2: Exercise the submitted state in the browser**

Open a studio's submitted offer, press the arrow once, and confirm the studio profile appears without Funding rendering in between.

- [ ] **Step 3: Check browser health**

Confirm no framework overlay or relevant new console error appears.
