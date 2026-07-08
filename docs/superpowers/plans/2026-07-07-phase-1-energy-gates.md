# Phase 1 Energy Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Phase 1 one-time energy gates to meaningful signing and commitment actions without changing the Career/My Productions layout yet.

**Architecture:** Add a small shared energy-cost module, then wire existing accept/sign/greenlight handlers to check and spend energy through `spendPlayerEnergy`. UI updates stay inside existing buttons/cards so the screens keep their current look and avoid clutter.

**Tech Stack:** React, TypeScript, Vite, existing Actor Empire services and UI components.

---

### Task 1: Shared Phase 1 Energy Costs

**Files:**
- Create: `services/energyCosts.ts`

- [ ] Add named constants for production signing, studio acquisition signing, stock-control completion, outside producer investment acceptance, rights signing, greenlight, release strategy, streaming deal acceptance, acquisition strategy moves, and collaboration signing.

### Task 2: Production And Greenlight Gates

**Files:**
- Modify: `views/lifestyle/business/ProductionWizard.tsx`
- Modify: `views/lifestyle/business/GreenlightWizard.tsx`

- [ ] Require `25E` before final production-house ratification and spend it when the studio launches.
- [ ] Require `15E` before greenlighting an owned studio project and spend it when the commitment is created.
- [ ] Show the energy cost in the existing final-action buttons and disable them when energy is insufficient.

### Task 3: Studio Acquisition Gates

**Files:**
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `views/mobile/components/StudioAcquisitionDesk.tsx`

- [ ] Charge `10E` for offer, counter, revision, and rival-bid actions.
- [ ] Charge `25E` for final acquisition signing and stock-control completion.
- [ ] Keep desk styling consistent by adding small cost chips and disabled button states.

### Task 4: Rights, Investments, Release, And Collaborations

**Files:**
- Modify: `views/lifestyle/business/components/RightsMarket.tsx`
- Modify: `views/lifestyle/business/components/RightsDealRoom.tsx`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `views/mobile/MobilePage.tsx`
- Modify: `views/mobile/MessagesApp.tsx`

- [ ] Charge `20E` for final rights agreement signing.
- [ ] Charge `25E` when accepting or accepted-countering outside producer investment offers.
- [ ] Charge `10E` for streaming deal acceptance and `15E` for locking a release strategy.
- [ ] Charge `10E` when signing sponsorship, YouTube collab, or YouTube brand offers from Messages.
- [ ] Keep later sponsorship/collab performance energy costs separate.

### Task 5: Verify

**Files:**
- Test: package scripts

- [ ] Run `npm run lint`.
- [ ] Run targeted audits when relevant: `npm run audit:studio-acquisition-ui`, `npm run audit:rights-negotiation`, `npm run audit:outside-producer-investments`, and `npm run build`.
