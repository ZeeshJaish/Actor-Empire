# Studio Seller Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve submitted studio offers and let players continue the negotiation from Forbes or Messages.

**Architecture:** Extend the existing acquisition case in `services/studioAcquisition.ts`, process pending responses from the weekly game loop, and render every response inside `StudioAcquisitionDesk`. Add a narrow Messages-to-Forbes target handoff so the inbox button opens the existing studio profile and desk.

**Tech Stack:** TypeScript, React, Vite, source audits, deterministic game simulation

---

### Task 1: Seller response state machine

**Files:**
- Modify: `services/studioAcquisition.ts`
- Modify: `scripts/audit-studio-acquisition.ts`

- [ ] Add failing assertions for accept, counter, reject, accept-counter, revise, and walk-away transitions.
- [ ] Run `npm run audit:studio-acquisition` and confirm the missing APIs fail the audit.
- [ ] Implement the minimal deterministic response and action APIs.
- [ ] Re-run the audit and confirm it passes.

### Task 2: Weekly response delivery

**Files:**
- Modify: `services/gameLoop.ts`
- Modify: `types.ts`

- [ ] Add the `STUDIO_ACQUISITION` inbox type.
- [ ] Process pending acquisition responses after the week advances.
- [ ] Persist one response message and one activity log per resolved case.

### Task 3: Existing Acquisition Desk response UI

**Files:**
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Modify: `views/mobile/components/ForbesStudioProfile.tsx`
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `scripts/audit-studio-acquisition-ui.mjs`

- [ ] Add failing source assertions for accepted, countered, and rejected visuals and actions.
- [ ] Render the response states before the setup stages.
- [ ] Wire accept-counter, revise, and walk-away callbacks through Forbes.
- [ ] Update the profile status and action labels.

### Task 4: Message routing into Forbes

**Files:**
- Modify: `views/mobile/MessagesApp.tsx`
- Modify: `views/mobile/MobilePage.tsx`
- Modify: `views/mobile/ForbesApp.tsx`

- [ ] Render an acquisition response card with a `Review Offer` button.
- [ ] Route the target studio id into Forbes.
- [ ] Auto-open the matching existing studio profile and Acquisition Desk once.

### Task 5: Verification

**Files:**
- Verify all files above.

- [ ] Run acquisition audits, lint, build, and scoped `git diff --check`.
- [ ] Advance a week in the browser and open the response from Messages.
- [ ] Confirm the matching Forbes desk opens with no relevant console error.
