# Studio Acquisition Final Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 6 by turning accepted studio acquisition offers into signed, owned production-house assets.

**Architecture:** Add a focused signing function to `services/studioAcquisition.ts`, reusing existing `Business` and production-house `studioState` structures. Wire it through `ForbesApp` into `StudioAcquisitionDesk`, and replace the accepted placeholder with final review and signed-state UI.

**Tech Stack:** React, TypeScript, Vite, existing audit scripts.

---

### Task 1: Audit the final signing logic

**Files:**
- Modify: `scripts/audit-studio-acquisition.ts`

- [ ] Add `completeStudioAcquisition` to the acquisition imports.
- [ ] Add a test that accepts a full acquisition, signs it with personal wealth, verifies purchase money is deducted, verifies a `PRODUCTION_HOUSE` business exists for the acquired studio, and verifies the case is `ACQUIRED`.
- [ ] Add a test that accepted terms fail safely with `INSUFFICIENT_FUNDS` if the chosen source no longer covers the final price.
- [ ] Add a test that studio-capital funded signing deducts the selected studio balance and still creates the acquired studio business.
- [ ] Run `npm run audit:studio-acquisition` and confirm it fails because `completeStudioAcquisition` is not implemented yet.

### Task 2: Implement signing and owned-studio transfer

**Files:**
- Modify: `services/studioAcquisition.ts`

- [ ] Add closing metadata to `AcquisitionCase`.
- [ ] Implement `completeStudioAcquisition` with guards for accepted-only, full-acquisition-only, duplicate ownership, missing funds, and missing case.
- [ ] Deduct the agreed price from the selected funding source at signing time.
- [ ] Create a production-house `Business` using the acquired studio profile, existing default studio state, profile talent, facilities, valuation, profitability, and catalog/IP metadata.
- [ ] Mark the case `ACQUIRED`, store the final price and acquired business id, and write a log/inbox result.
- [ ] Run `npm run audit:studio-acquisition` and confirm it passes.

### Task 3: Audit and implement final signing UI

**Files:**
- Modify: `scripts/audit-studio-acquisition-ui.mjs`
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`
- Modify: `views/mobile/ForbesApp.tsx`

- [ ] Add UI audit checks for `Final Deal Review`, `Assets + Liabilities`, `Document Signing`, `Sign & Acquire Studio`, `DEAL SIGNED`, and `onCompleteAcquisition`.
- [ ] Run `npm run audit:studio-acquisition-ui` and confirm it fails before UI implementation.
- [ ] Add `onCompleteAcquisition` to `StudioAcquisitionDesk` props and wire it in `ForbesApp`.
- [ ] Replace the accepted placeholder with final review cards and a signing CTA.
- [ ] Add an acquired/signed state card with clear completion visuals and no redundant step navigation.
- [ ] Run `npm run audit:studio-acquisition-ui` and confirm it passes.

### Task 4: Verify the whole slice

**Files:**
- No source edits unless verification finds a defect.

- [ ] Run `npm run audit:studio-acquisition`.
- [ ] Run `npm run audit:studio-acquisition-ui`.
- [ ] Run `npm run audit:forbes-studio-ui`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Browser-smoke `http://127.0.0.1:3000/` and check the page loads with no console errors.
