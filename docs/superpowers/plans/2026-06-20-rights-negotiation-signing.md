# Rights Negotiation And Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct property acquisition, deterministic owner negotiations, contract signing, and owned-right development to the existing Development Lab.

**Architecture:** A focused `rightsNegotiation` domain service owns quotes, capital holds, weekly responses, counters, signing, and owned-right conversion. Existing React screens render the state and dispatch pure transitions; the weekly game loop creates response messages. Development Lab Vault reads the resulting owned-right collection and feeds new concepts into the existing script pipeline.

**Tech Stack:** React 19, TypeScript, Motion, Lucide, Vite, esbuild audit scripts.

---

### Task 1: Define And Audit The Domain Contract

**Files:**
- Modify: `types.ts`
- Create: `scripts/audit-rights-negotiation.ts`
- Modify: `package.json`

- [x] Add deal, negotiation, creative guarantee, and owned-right types.
- [x] Add `rightsNegotiations` and `ownedRights` to `StudioState`.
- [x] Write assertions for direct acquisition, deal availability, capital holds,
  deterministic responses, three-round limits, signing, and old-save defaults.
- [x] Run `npm run audit:rights-negotiation` and confirm it fails because the
  negotiation service does not exist.

### Task 2: Implement Negotiation And Signing Rules

**Files:**
- Create: `services/rightsNegotiation.ts`
- Modify: `services/businessLogic.ts`
- Modify: `services/newsLogic.ts`

- [x] Implement pure deal quotes and term generation.
- [x] Implement direct offer creation without an investigation requirement.
- [x] Reserve capital across active negotiations.
- [x] Implement deterministic weekly owner responses and limited counters.
- [x] Implement one-time contract signing and owned-right creation.
- [x] Add acquisition news generation.
- [x] Run the negotiation audit until all domain assertions pass.

### Task 3: Connect Weekly Responses And Messages

**Files:**
- Modify: `types.ts`
- Modify: `services/businessLogic.ts`
- Modify: `services/gameLoop.ts`
- Modify: `views/mobile/MessagesApp.tsx`

- [x] Advance negotiations during the business week.
- [x] Emit each new response once.
- [x] Add a dedicated `RIGHTS_NEGOTIATION` message presentation.
- [x] Direct the player back to Development Lab -> Market -> Properties for the
  actionable response.

### Task 4: Build The Deal Room And Contract

**Files:**
- Modify: `views/lifestyle/business/components/RightsMarket.tsx`

- [x] Add `Acquire` to every available public property file.
- [x] Use `Acquire / Walk Away` for report decisions.
- [x] Add deal-type selection and clear offer controls.
- [x] Add waiting, counter, guarantee, rival, rejection, and accepted states.
- [x] Add an interactive contract sheet and signing stamp.
- [x] Deduct money and publish news only after signing.

### Task 5: Build The Rights Shelf And Development Handoff

**Files:**
- Modify: `views/lifestyle/business/DevelopmentLab.tsx`

- [x] Render signed rights as collectible cards in Vault -> Rights.
- [x] Show control type, paid price, expiry, and project allowance.
- [x] Add `Develop Property` to create a concept in the existing script pipeline.
- [x] Prevent development after a temporary right expires or runs out of projects.

### Task 6: Verify The Complete Feature

**Files:**
- Verify: all changed files

- [x] Run `npm run audit:rights-negotiation`.
- [x] Run existing rights audits.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Test direct blind acquisition, investigated acquisition, weekly owner
  response, counter/bidding round, signing, and Vault ownership in the browser.
- [x] Confirm there is no horizontal overflow and the underlying page does not
  scroll while the deal modal is open.
