# Owned Right Game UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the existing owned-right surfaces into a clearer studio-game presentation with persistent next-step feedback.

**Architecture:** Keep `OwnedRightDevelopmentBrief` presentation-only and reuse the current `onDevelopRight` callback. Return the created script ID through that callback so the result screen can route into the existing ScriptVault writer-assignment and Scripts-lane state.

**Tech Stack:** React 19, TypeScript, Motion, Lucide, Tailwind utilities.

---

### Task 1: Polish Rights Library Cards

**Files:**
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] Replace the archive glyph with a labelled `Owned` seal using `ShieldCheck`.
- [ ] Replace the three-cell grid with compact acquisition, control, and usage facts.
- [ ] Add property accent depth and reduce hard rectangular borders.
- [ ] Preserve `Develop Property`, expiry, and allowance behavior.

### Task 2: Polish Development Brief And Result Flow

**Files:**
- Modify: `views/lifestyle/business/components/OwnedRightDevelopmentBrief.tsx`
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [ ] Give Movie an electric-blue selected state and Series a cinematic-crimson state.
- [ ] Convert control data and creative plays to lighter dossier rows.
- [ ] Keep Sequel and Spin-off visible with explicit locks.
- [ ] Change `onAuthorize` to return the created script ID or `null`.
- [ ] Replace timed dismissal with `Assign Writer`, `Go to Active Scripts`, and `Stay in Rights Library`.
- [ ] Route each result action into existing ScriptVault state only.

### Task 3: Verify

**Files:**
- Verify: `views/lifestyle/business/DevelopmentLab.tsx`
- Verify: `views/lifestyle/business/components/OwnedRightDevelopmentBrief.tsx`

- [ ] Run `npm run audit:rights-negotiation`, `npm run audit:rights-market`, and `npm run audit:rights-investigation`.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Browser-test the two supplied screen states at the existing mobile game width without submitting a second project into the user's save.
