# Owned Production Career Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make player-owned studio projects appear in Career as personal Actor, Director, and Producer work only when live owned projects exist, with lighter energy costs and a capped 15-point quality polish influence.

**Architecture:** Add a focused owned-production career helper that derives personal tracks and applies capped focus actions. Store compact progress in `ProjectDetails.playerProductionFocus` so old saves remain valid. Career renders normal acting gigs first and a separate My Productions section below, while `useGameActions` applies energy and project updates through the helper.

**Tech Stack:** React, TypeScript, Vite, existing Actor Empire `Player` / `Commitment` models and audit-script testing.

---

### Task 1: Failing Owned-Production Career Audit

**Files:**
- Create: `scripts/audit-owned-production-career.ts`
- Modify: `package.json`

- [ ] Add an audit that imports `deriveOwnedProductionCareerItems`, `applyOwnedProductionFocusAction`, and `OWNED_PRODUCTION_ACTIONS` from `services/ownedProductionCareer.ts`.
- [ ] Test that an owned studio project with the player acting and directing exposes `ACTING`, `DIRECTING`, and `PRODUCING` tracks.
- [ ] Test that an owned studio project with no self-cast or self-directing still exposes only the `PRODUCING` track.
- [ ] Test that repeated producer/director polish actions cap total quality lift at `15`.
- [ ] Add package script `audit:owned-production-career`.
- [ ] Run `npm run audit:owned-production-career` and confirm it fails because the helper does not exist yet.

### Task 2: Helper And Types

**Files:**
- Modify: `types.ts`
- Create: `services/ownedProductionCareer.ts`

- [ ] Add `PlayerProductionFocus`, `OwnedProductionTrackType`, and `OwnedProductionActionId` types.
- [ ] Add optional `playerProductionFocus?: PlayerProductionFocus` to `ProjectDetails`.
- [ ] Implement track derivation for owned studio `JOB` commitments.
- [ ] Implement action costs:
  - `ACTOR_PREP: 8E`
  - `ACTOR_SCENE: 12E`
  - `DIRECTOR_PLAN: 10E`
  - `DIRECTOR_SET: 15E`
  - `DIRECTOR_CUT: 10E`
  - `PRODUCER_PREP: 8E`
  - `PRODUCER_SET: 12E`
  - `PRODUCER_POST: 10E`
- [ ] Implement capped polish contribution where producer/director focus can add at most `15` quality points.
- [ ] Run `npm run audit:owned-production-career` and confirm it passes.

### Task 3: Greenlight Metadata

**Files:**
- Modify: `views/lifestyle/business/GreenlightWizard.tsx`

- [ ] Initialize `playerProductionFocus` on new owned studio commitments.
- [ ] Set `isPlayerActor`, `isPlayerDirector`, and `isPlayerProducer` flags based on cast and crew choices.

### Task 4: Action Wiring

**Files:**
- Modify: `hooks/useGameActions.ts`
- Modify: `App.tsx`

- [ ] Add `handleOwnedProductionFocus(commitmentId, actionId)`.
- [ ] Require the helper-defined energy cost before applying the action.
- [ ] Spend energy with `spendPlayerEnergy`.
- [ ] Add concise log/toast copy for actor prep, actor scene work, director passes, producer polish, and post-production review.
- [ ] Pass `handleOwnedProductionFocus` into `CareerPage`.

### Task 5: Career UI

**Files:**
- Modify: `views/CareerPage.tsx`

- [ ] Keep existing acting-gig sections unchanged.
- [ ] Derive owned production career items from current player commitments.
- [ ] Render a separate `My Productions` section only when derived items exist.
- [ ] Show project phase, studio name, attached personal roles, polish lift, and track progress.
- [ ] Show compact action buttons with visible energy costs and disabled `Need XE` state.
- [ ] Keep post-production promotion buttons for the existing acting flow.

### Task 6: Verification

**Files:**
- Test: package scripts

- [ ] Run `npm run audit:owned-production-career`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
