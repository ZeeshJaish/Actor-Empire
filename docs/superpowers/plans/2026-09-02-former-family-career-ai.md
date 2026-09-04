# Former Family Career AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep former playable family members alive as autonomous, persistent industry talent after succession without duplicating the existing NPC, production, booking, health, or legacy systems.

**Architecture:** Add a canonical dynasty-career registry under player flags and treat the existing legacy `NPCActor` as its talent-pool projection. A deterministic weekly service observes canonical bookings/productions, owns career and life decisions, and emits presentation events; succession, Platform AI talent selection, Career filtering, Legacy UI, migration, and compaction receive narrow integrations.

**Tech Stack:** React, TypeScript, Vite, Node assertion audit scripts, existing deterministic RNG and save services.

**Spec:** `docs/superpowers/specs/2026-09-02-former-family-career-ai-design.md`

**Implementation status:** Complete on 2026-09-02. Focused behavior, UI, succession, production, booking, save, weekly-loop, and production-build verification passed.

## Global Constraints

- Preserve `WorldState.industryProductions` and `WorldState.talentBookings` as the only project and booking authorities.
- Preserve unrelated dirty-worktree changes; do not stage or commit without explicit user authorization.
- Observe a meaningful RED before every production behavior change.
- Succession never automatically retires a living former character.
- No talent replacement, lawsuit, comeback, or separate dynasty-project simulator.
- Keep histories bounded and older saves compatible.

---

### Task 1: Canonical dynasty schema and succession initialization

**Files:**
- Modify: `types.ts`
- Create: `services/dynastyCareer.ts`
- Modify: `services/legacyLogic.ts`
- Test: `scripts/audit-dynasty-career.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `DynastyCareerState`, `DynastyCareerMember`, `normalizeDynastyCareerState(player)`, `buildDynastySuccessionState(player, parentActor, archive, heirAge, heirWeek)`.
- Consumes: `getAbsoluteWeek`, `createDeterministicId`, `NPCActor`, and `LegacyCareerArchive`.

- [x] Write an audit fixture that hands a healthy 48-year-old actor to an 18-year-old heir and asserts the actor is `ACTIVE`, remains age 48, retains one canonical NPC ID, and merges rather than replaces an older generation/archive.
- [x] Run `npm run audit:dynasty-career` and verify RED because the dynasty interfaces/service do not exist.
- [x] Add the typed schema, normalization, deterministic personality initialization, succession-clock rebasing, multi-generation archive merge, and compatibility projection.
- [x] Run `npm run audit:dynasty-career` and verify GREEN.

### Task 2: Deterministic career, aging, health, retirement, and death

**Files:**
- Modify: `services/healthConditions.ts`
- Modify: `services/dynastyCareer.ts`
- Modify: `scripts/audit-dynasty-career.ts`

**Interfaces:**
- Produces: `getOldAgeIncidentChance(age)`, `processDynastyCareerWeek(player, absoluteWeek)` and bounded `DynastyCareerEvent` output.
- Consumes: normalized dynasty state, talent bookings, industry productions, and deterministic RNG.

- [x] Add literal audit cases proving a young successor does not force retirement, a booked member stays working, a completed booking is recorded once, a low-health older member can deterministically retire/die, and reprocessing the same week is idempotent.
- [x] Run the focused audit and verify RED on the missing transitions.
- [x] Extract the existing old-age incident curve into a pure helper without changing player-health results, then implement the minimum weekly dynasty transitions and relationship/NPC projection updates.
- [x] Run the focused audit and existing health/legacy audits; verify GREEN.

### Task 3: Real outside-production offer acceptance

**Files:**
- Modify: `services/platformAi/platformAiTalent.ts`
- Modify: `services/dynastyCareer.ts`
- Modify: `scripts/audit-dynasty-career.ts`

**Interfaces:**
- Produces: `evaluateDynastyTalentOffer(player, npc, offer)` returning `{ eligible, modifier, reason }`.
- Consumes: Platform AI genre, platform, canonical project ID, production start week, and dynasty personality/life state.

- [x] Add audit cases proving active members can accept, selective members reject weak deterministic offers, and hiatus/retired/deceased members cannot be selected.
- [x] Run the focused audit and verify RED because Platform AI does not consult dynasty state.
- [x] Filter/rank dynasty candidates through the evaluator while leaving non-dynasty talent unchanged; retain the existing canonical reservation call and overlap policy.
- [x] Run dynasty and Platform AI commissioning/booking audits; verify GREEN.

### Task 4: Weekly integration and current-player isolation

**Files:**
- Modify: `services/gameLoop.ts`
- Modify: `views/CareerPage.tsx`
- Modify: `services/ownedProductionCareer.ts`
- Modify: `scripts/audit-dynasty-career.ts`

**Interfaces:**
- Consumes: `processDynastyCareerWeek`, `isPlayerCastInProject`, and existing loop diagnostics.
- Produces: one `dynasty_career_*` loop stage plus current-player-only Career lists/rewards.

- [x] Add an audit fixture where an inherited studio commitment contains only the ancestor actor ID and assert it remains in Production House but is absent from current-player Career and personal reward calculation.
- [x] Run the audit and verify RED against the current `ACTING_GIG`-only Career filtering.
- [x] Process dynasty state after Platform AI has created/progressed bookings, append bounded news/log events, and make Career/reward paths require an actual `PLAYER_SELF` role.
- [x] Run dynasty, legacy inheritance, owned production, and game-loop audits; verify GREEN.

### Task 5: Multi-generation Legacy presentation

**Files:**
- Modify: `views/SocialPage.tsx`
- Modify: `views/mobile/ImdbApp.tsx`
- Modify: `views/mobile/BoxOfficeApp.tsx`
- Create: `scripts/audit-dynasty-career-ui.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: normalized dynasty members and per-actor legacy archives.
- Produces: compact Connections > Legacy status rows and an IMDb ancestor selector.

- [x] Add a source/UI audit asserting two generations can be selected, living status/current project is visible only in Legacy, and current credits remain separate.
- [x] Run `npm run audit:dynasty-career-ui` and verify RED.
- [x] Add a compact status treatment to existing generation cards and replace the single-parent archive assumption with a selected archive while retaining the current compatibility fallback.
- [x] Run UI and focused behavioral audits; verify GREEN.

### Task 6: Migration, compaction, and integrity protection

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `services/saveIntegrity.ts`
- Modify: `scripts/audit-dynasty-career.ts`
- Modify: `scripts/audit-save-generations.ts`

**Interfaces:**
- Consumes: `normalizeDynastyCareerState` and the canonical member/archive schema.
- Produces: old-save backfill, protected dynasty NPC IDs, compact archives, and integrity fingerprints.

- [x] Add old-save and three-generation fixtures proving backfill, chronological preservation, NPC protection, bounded history, and round-trip integrity.
- [x] Run focused save audits and verify RED.
- [x] Implement migration/compaction/integrity changes without changing unrelated save data.
- [x] Run dynasty, migration, compaction, integrity, and generation audits; verify GREEN.

### Task 7: Final verification

**Files:**
- Review only: all files changed by Tasks 1-6

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: fresh evidence for the completion criteria.

- [x] Run `npm run audit:dynasty-career`.
- [x] Run `npm run audit:dynasty-career-ui`.
- [x] Run `npm run audit:legacy-inheritance` and the focused Platform AI production/talent audits discovered in `package.json`.
- [x] Run the focused save migration/integrity/generation audits.
- [x] Run `npm run build`.
- [x] Inspect `git diff --check` and the scoped diff, reporting pre-existing repository noise separately from regressions caused by this feature.
