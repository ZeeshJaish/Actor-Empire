# Writer Identity and Greenlight Participation (Phases 1–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work inline in this chat; do not delegate or commit without the user's request.

**Goal:** Add stable fictional writer identity and optional player Greenlight backend-point contracts for first films and sequels without changing existing saves or paying backend before phase 3.

**Architecture:** Keep all new save fields optional. A pure participation helper validates 0–3 points per person and 10 per project, compiles only selected writer/director/cast into versioned project contracts, and reads missing legacy values as zero. Greenlight keeps participation choices in the existing saved concept draft; a compact review control and returning-talent negotiation modal edit those choices. Existing projects in production retain their original project details untouched.

**Tech Stack:** TypeScript, React, Vite, esbuild audit scripts, existing save migration and Greenlight builder.

**Spec:** `docs/superpowers/specs/2026-09-27-streaming-content-market-and-studio-talent-roadmap-design.md` (phases 1–2 only).

## Global constraints

- Preserve the dirty worktree and all pre-existing saves. Do not stage, commit or rewrite existing project economics.
- Do not implement phase 3 payout, NPC wealth, award ballots or phase 4–8 marketplace behavior.
- Default participation to 0; each person has 0–3 whole points; a project may not exceed 10 points.
- Backend basis is future positive studio-collected title-attributed receipts; no subscriber-revenue or gross-box-office entitlement.
- Keep UI consistent with current Greenlight dark/emerald styling, keyboard access and phone safe areas.
- Test a legacy concept and an already-active `PRE_PRODUCTION` commitment after migration; neither may gain a paid contract or lose its existing fields.

---

### Task 1: Stable writer roster and optional schema

**Files:** Create `services/writerNpcLibrary.ts`; modify `types.ts`, `services/npcLogic.ts`, `src/data/generators.ts`; test `scripts/audit-greenlight-participation-phases1-2.ts`.

**Interfaces:** `WRITER_NPC_LIBRARY: NPCActor[]`; `getWriterNpcById(id: string): NPCActor | undefined`; `ProjectDetails.talentParticipation?: TalentParticipationPackage`; `ProjectConcept.talentBackendDraft?: Record<string, number>`; `IndustryProject.writerId?/writerName?`; `IndustryProductionCommitment.writerId: string | null`.

- [ ] Write a failing audit: a curated writer ID resolves after serialization and a newly generated featured writer uses an original fictional name; a legacy writer string and `writerId: null` stay valid.
- [ ] Run the audit and confirm it fails on missing roster/fields.
- [ ] Implement immutable, original fictional writer profiles with stable IDs and `occupation: 'WRITER'`; register them in the NPC database and use them for new featured Development Lab writers without rewriting already saved writers.
- [ ] Add only optional or widened types; do not eagerly populate legacy project records.
- [ ] Re-run focused audit and TypeScript check.

### Task 2: Pure backend choices and contract compilation

**Files:** Create `services/talentParticipation.ts`; modify `types.ts`, `views/lifestyle/business/greenlightProjectBuilder.ts`; test `scripts/audit-greenlight-participation-phases1-2.ts`.

**Interfaces:** `participationKey(role: 'ACTOR' | 'DIRECTOR' | 'WRITER', roleId: string, talentId: string): string`; `normalizeTalentBackendDraft(raw: unknown): Record<string, number>`; `setTalentBackendPoints(draft, key, points): Record<string, number>`; `buildGreenlightTalentParticipation(input): TalentParticipationPackage | undefined`.

- [ ] Write failing tests: no draft produces no package; a first-film lead can receive 1/2/3 points; a different actor in the same role cannot inherit points; >3 per person or >10 total is refused; serializing/deserializing preserves contracts; an already-active legacy commitment stays byte-for-byte equal after migration.
- [ ] Run audit and observe the expected missing-behavior failures.
- [ ] Implement pure validation and version-1 contract serialization (`contractId`, role/role ID, stable talent ID/name, upfront fee, points, `STUDIO_COLLECTED_TITLE_RECEIPTS`, empty processed-receipt keys). Compile from current selected cast/director/writer only. Never attach retroactively to `player.commitments`.
- [ ] Make `buildGreenlightProject` accept the optional draft and save a package only for newly greenlit projects with valid selected participants.
- [ ] Run focused audit, then relevant existing Greenlight/sequel audits.

### Task 3: Resume-safe Greenlight choices and negotiation

**Files:** Modify `views/lifestyle/business/GreenlightWizard.tsx`, `views/lifestyle/business/greenlightTypes.ts`, `views/lifestyle/business/components/GreenlightNegotiationModal.tsx`, `types.ts`; test `scripts/audit-greenlight-participation-phases1-2.ts`.

**Interfaces:** `ProjectConcept.talentBackendDraft` is optional and read as `{}`; returning talent may carry optional `backendDemandPoints` and `acceptedBackendPoints`; the negotiation modal receives whole-point value and change callback.

- [ ] Write failing tests for old concepts resuming with zero, saved draft choices surviving reopen, accepted sequel points attaching only to the agreed talent, failed/walk-away negotiations leaving no obligation, and a new first-film contract choice not requiring sequel status.
- [ ] Confirm red. Add participation state to the existing concept save/reload path and clear it when switching scripts or talent. Do not convert active projects or old scripts in place.
- [ ] Show backend choices in returning-talent salary negotiation. A counteroffer includes the proposed points; accepted terms are saved, rejected ones are not. Preserve the existing salary offer math and attempts.
- [ ] Re-run audit; check existing sequel flow.

### Task 4: Greenlight review UI, migration and verification

**Files:** Modify `views/lifestyle/business/components/GreenlightConfirmationStep.tsx`, `views/lifestyle/business/GreenlightWizard.tsx`; extend `scripts/audit-greenlight-participation-phases1-2.ts`; add/modify `package.json` script only if appropriate.

**Interfaces:** Confirmation receives `participants: {key,name,role,upfront,points}[]`, `totalPoints`, and `onPointsChange(key, next)`; existing props remain compatible.

- [ ] Write a failing rendered-UI audit: selected actor/director/writer show 0-point default and ± controls; 1/2/3 persists in review; invalid aggregate choice is disabled; the cash fee and future-receipts basis are clearly distinguished.
- [ ] Confirm red. Add a compact participation section within the established review design, with buttons and aria labels, no new full-screen modal or visual system.
- [ ] Run focused audit, `audit:sequel-flow`, save-migration audit, `tsc --noEmit`, production build and `git diff --check`. Verify new and old-save snapshots, including a movie already in development. Manually inspect phone-width review and returning modal if local browser is available.
- [ ] Report exact completed scope and any baseline failures. Phase 3 remains unimplemented; saved backend contracts do not pay until phase 3 is approved.

## Verification checkpoint (2026-09-27)

- Implemented the phase 1 roster/schema and phase 2 Greenlight draft, first-film/sequel negotiation, contract compilation, and review UI.
- Passed focused writer/legacy-save and rendered UI audits; existing Greenlight builder, cast-negotiation, modules, validation, sequel, and save-migration audits; production Vite build; `git diff --check`.
- An 8 GB TypeScript check completed with four existing errors outside the edited phase 1–2 files (`App.tsx`, `index.tsx` twice, and `scripts/audit-ios-long-session-soak.ts`). Phone-device visual QA has not been performed.
- Phase 3 payout/credit/award behavior is deliberately absent. Do not represent saved points as paid receipts before that phase.
