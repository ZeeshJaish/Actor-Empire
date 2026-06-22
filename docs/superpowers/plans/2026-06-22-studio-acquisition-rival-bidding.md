# Studio Acquisition Rival Bidding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rival studio bidding wars and limited negotiation rounds to the existing Forbes Studio Acquisition Desk.

**Architecture:** Extend `services/studioAcquisition.ts` as the single acquisition state machine. Reuse the existing `StudioAcquisitionDesk` response surface for bidding-war UI and wire the action through existing Forbes callbacks.

**Tech Stack:** TypeScript, React, Vite, existing script audits.

---

### Task 1: Failing audits

**Files:**
- Modify: `scripts/audit-studio-acquisition.ts`
- Modify: `scripts/audit-studio-acquisition-ui.mjs`

- [ ] Add acquisition logic assertions for `RIVAL_BID`, required bid, beat-rival success, low rival response rejection, and final-round closure.
- [ ] Add UI source assertions for `BIDDING WAR`, `Rival At The Table`, `Beat Rival`, `Custom Bid`, `Round`, and `onBeatRival`.
- [ ] Run `npm run audit:studio-acquisition` and `npm run audit:studio-acquisition-ui`; both should fail before implementation.

### Task 2: Acquisition state machine

**Files:**
- Modify: `services/studioAcquisition.ts`

- [ ] Add `RIVAL_BID` to seller decisions and actionable statuses.
- [ ] Add rival fields to `sellerResponse`.
- [ ] Create deterministic rival bid generation using existing stable hash inputs.
- [ ] Add `beatAcquisitionRivalBid` to validate the amount and resubmit the case.
- [ ] Cap bidding at three rounds and reject/close low final-round responses.
- [ ] Run `npm run audit:studio-acquisition`; it should pass.

### Task 3: React wiring and UI

**Files:**
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `views/mobile/components/ForbesStudioProfile.tsx`

- [ ] Add `onBeatRival` prop and wire it from Forbes.
- [ ] Render the bidding-war response mode in the existing response panel.
- [ ] Show rival name, rival bid, required beat amount, and round pressure.
- [ ] Add `Beat Rival`, `Custom Bid`, and `Walk Away` actions.
- [ ] Update profile status copy for active rival bidding.
- [ ] Run `npm run audit:studio-acquisition-ui`; it should pass.

### Task 4: Full verification

**Files:**
- No new files.

- [ ] Run `npm run audit:studio-acquisition`.
- [ ] Run `npm run audit:studio-acquisition-ui`.
- [ ] Run `npm run audit:forbes-studio-ui`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] QA in the in-app browser if the dev server is available.
