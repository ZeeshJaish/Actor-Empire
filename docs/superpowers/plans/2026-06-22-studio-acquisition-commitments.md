# Studio Acquisition Commitments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deal commitments to studio acquisition offers and show them inside the existing Acquisition Desk.

**Architecture:** Extend `services/studioAcquisition.ts` as the single acquisition state machine. Reuse the current Acquisition Desk offer setup and review stages; wire commitments through Forbes callbacks and existing audits.

**Tech Stack:** TypeScript, React, Vite, existing script audits.

---

### Task 1: Failing audits

**Files:**
- Modify: `scripts/audit-studio-acquisition.ts`
- Modify: `scripts/audit-studio-acquisition-ui.mjs`

- [ ] Add assertions that submitted offers persist commitments.
- [ ] Add assertions that commitments can improve seller acceptance for a near-value offer.
- [ ] Add assertions that revised and rival-beating offers keep commitments.
- [ ] Add UI source assertions for `Deal Promises`, `Preserve Studio Name`, `Protect Employees`, `Guarantee Productions`, and `Promises Attached`.
- [ ] Run `npm run audit:studio-acquisition` and `npm run audit:studio-acquisition-ui`; both should fail before implementation.

### Task 2: Acquisition logic

**Files:**
- Modify: `services/studioAcquisition.ts`

- [ ] Add `AcquisitionCommitmentId`.
- [ ] Add exported `ACQUISITION_COMMITMENTS` metadata.
- [ ] Store `commitments` on `AcquisitionCase.offer`.
- [ ] Accept `commitments` in `submitOpeningOffer`.
- [ ] Apply commitment leverage inside seller response resolution.
- [ ] Preserve commitments during counter revisions and rival bids.
- [ ] Run `npm run audit:studio-acquisition`; it should pass.

### Task 3: Acquisition Desk UI

**Files:**
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Modify: `views/mobile/ForbesApp.tsx`

- [ ] Add selected commitment state.
- [ ] Render compact commitment toggle cards in Offer Setup.
- [ ] Include selected promises in Final Review.
- [ ] Show promises on submitted/response cards.
- [ ] Pass commitments through `onSubmitOffer`.
- [ ] Run `npm run audit:studio-acquisition-ui`; it should pass.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `npm run audit:studio-acquisition`.
- [ ] Run `npm run audit:studio-acquisition-ui`.
- [ ] Run `npm run audit:forbes-studio-ui`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Smoke check the app in the in-app browser.
