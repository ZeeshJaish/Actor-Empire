# Project B Phase B1 Canonical Studio AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every established and generated production company one deterministic, persisted Studio AI runtime with safe ownership handoff, ledgered transitional finance, and consequence-led presentation.

**Architecture:** Keep `WorldState.studios` as the only company authority and add a versioned runtime to each `NPCStudioState`. Migrate generated ventures through a compatibility projection, reuse existing ownership and project registries, and run one idempotent controller-aware weekly coordinator.

**Tech Stack:** React, TypeScript, Vite, Node assertion audit scripts, existing deterministic RNG/ID, acquisition, Studio Group, save, and weekly-loop services.

**Spec:** `docs/superpowers/specs/2026-09-02-general-production-studio-ai-b1-design.md`

## Global Constraints

- Do not create a second Studio AI registry.
- Keep `NPCStudioState.cashReserve`, `valuation`, and `reputation` canonical.
- Player-controlled studios receive normalization only and no autonomous weekly mutation.
- Raw company statuses are private and must not be printed in studio or streaming UI.
- Preserve stable studio/venture/founder IDs and all acquisition links.
- Use deterministic seeds and exact-once absolute-week checkpoints.
- Keep ledgers, events, and decisions bounded.
- Preserve unrelated dirty-worktree changes and do not stage or commit without explicit user authorization.
- Observe a meaningful RED before every production behavior change.

---

### Task 1: Canonical Studio AI schema and deterministic profile seeding

**Files:**
- Modify: `types.ts`
- Create: `services/studioAi/studioAiProfiles.ts`
- Create: `services/studioAi/studioAiState.ts`
- Create: `services/studioAi/index.ts`
- Create: `scripts/audit-studio-ai-foundation-b1.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `StudioAiRuntimeState`, `StudioAiCompanyStatus`, `StudioAiController`, `StudioAiOrigin`, `StudioAiProfile`, `normalizeStudioAiState(studio, context)`, `getStudioAiProfileSeed(studio)`.
- Consumes: `NPCStudioState`, `STUDIO_CATALOG`, `createDeterministicId`, `createDeterministicRng`.

- [ ] Write a failing audit with one established major and one regional studio asserting stable schema version, different maturity/capacity, finite values, bounded profiles, and deterministic repeated normalization.
- [ ] Run `npm run audit:studio-ai-foundation-b1`; expect failure because the runtime and normalizer do not exist.
- [ ] Add schema-v1 types. Keep public cash/valuation/reputation outside the runtime; store strategy, competence, debt, costs, capacity, status, histories, seed, controller, and checkpoint inside it.
- [ ] Implement deterministic profile templates derived from existing identity/archetype/valuation instead of real-world hard-coded weekly outcomes.
- [ ] Normalize malformed values and cap ledger/event/decision histories at documented limits.
- [ ] Run the focused audit and verify the established/region profile assertions pass.

### Task 2: Generated venture unification and compatibility projection

**Files:**
- Modify: `services/npcVentureLogic.ts`
- Modify: `services/studioEcosystem.ts`
- Modify: `services/studioAi/studioAiState.ts`
- Modify: `scripts/audit-studio-ai-foundation-b1.ts`
- Test: `scripts/audit-npc-venture-determinism.ts`

**Interfaces:**
- Produces: `migrateNpcVentureToStudio(venture, studio, absoluteWeek)`, `projectStudioToNpcVenture(studio, legacy)`, `ensureStudioAiEcosystem(player, world, absoluteWeek)`.
- Consumes: stable venture IDs, founder fields, venture histories, `ensureStudioEcosystem`.

- [ ] Add failing cases proving an active and a closed venture become canonical studio records with the same IDs, founder/history preservation, correct private status, and no duplicate record on a second migration.
- [ ] Run the B1 and venture determinism audits; verify RED on canonical migration.
- [ ] Migrate venture fields into the studio runtime and preserve public projection fields.
- [ ] Change `syncNpcVenturesToStudios` into the compatibility adapter: the studio record is authoritative after migration and closed companies remain historical records.
- [ ] Ensure new venture launch classes produce varied but bounded starting maturity and capital using persisted deterministic values.
- [ ] Run both audits and verify GREEN without changing the existing venture release cadence yet.

### Task 3: Single controller resolver and exact-once ownership handoff

**Files:**
- Create: `services/studioAi/studioAiControl.ts`
- Modify: `services/studioOwnership.ts`
- Modify: `services/studioAi/index.ts`
- Modify: `scripts/audit-studio-ai-foundation-b1.ts`
- Test: existing acquisition and Studio Group audits

**Interfaces:**
- Produces: `resolveStudioAiController(player, studioId)`, `applyStudioAiOwnershipHandoff(player, world, studioId, absoluteWeek)`.
- Consumes: player Production House businesses, acquisition cases, stock control, Studio Group ownership, studio runtime.

- [ ] Add failing cases for independent AI control, direct player business, negotiated acquisition, stock control, repeat handoff, and malformed imported acquisition state.
- [ ] Run the focused audit and verify RED because no shared resolver exists.
- [ ] Implement one resolver with explicit ownership precedence and no title/name matching.
- [ ] Record a stable handoff key, controller transition, and event once while retaining finance, capacity, history, projects, bookings, and rights references.
- [ ] Prove repeated handoff is unchanged and player control removes autonomous eligibility.
- [ ] Run acquisition, Studio Group, subsidiary, and B1 audits.

### Task 4: Ledgered transitional finance, runway, and private status

**Files:**
- Create: `services/studioAi/studioAiFinance.ts`
- Modify: `services/studioEcosystem.ts`
- Modify: `services/studioAi/studioAiState.ts`
- Modify: `scripts/audit-studio-ai-foundation-b1.ts`
- Test: `scripts/audit-studio-production-economy.ts`

**Interfaces:**
- Produces: `calculateStudioAiWeeklyOperations(studio, world, absoluteWeek)`, `applyStudioAiFinanceWeek(studio, world, absoluteWeek)`, `deriveStudioAiStatus(studio)`.
- Consumes: canonical cash, released `WorldState.projects`, debt, operating cost, capacity, prior ledger IDs.

- [ ] Add failing exact-number cases for catalogue income, operating cost, debt service, resulting cash, runway, and idempotent ledger entries.
- [ ] Add failing status cases for sustainable, distressed, restructuring, dormant, sold/merged, and closed companies without asserting any UI label.
- [ ] Remove `Math.random()` and unexplained valuation/cash drift from the migrated studio path.
- [ ] Add deterministic transitional `CATALOGUE_OPERATIONS`, `OPERATING_COST`, and `DEBT_SERVICE` ledger categories with stable IDs and bounded history.
- [ ] Derive private status from runway and persisted evidence; do not add hidden rescue funding.
- [ ] Run B1, studio ecosystem, production economy, and stock/Forbes calculation audits.

### Task 5: Idempotent B1 weekly coordinator and legacy boundary

**Files:**
- Create: `services/studioAi/studioAiTurn.ts`
- Modify: `services/studioAi/index.ts`
- Modify: `services/worldLogic.ts`
- Modify: `services/gameLoop.ts` only if the existing world-turn call cannot provide the canonical boundary
- Modify: `scripts/audit-studio-ai-foundation-b1.ts`

**Interfaces:**
- Produces: `processStudioAiFoundationWeek(player, world, absoluteWeek): { world; news; logs; diagnostics }`.
- Consumes: ecosystem normalizer, controller/handoff, finance processor, existing project outcomes, compatibility venture adapter.

- [ ] Add a failing multi-studio week fixture asserting deterministic ordering, AI progression, player no-op, exact same-week replay, bounded output, and no duplicate ledger/events.
- [ ] Run the focused audit and verify RED on the missing coordinator.
- [ ] Implement the coordinator as one sorted studio pass and call it from the existing world progression boundary.
- [ ] Keep old instant rival/venture production behind named compatibility functions; do not allow both legacy passive finance and B1 finance to mutate the same migrated studio.
- [ ] Emit News/X only for meaningful status consequences and ownership changes, using evidence-based prose without raw status labels.
- [ ] Run weekly-loop, venture, ecosystem, Platform AI producer-selection, and B1 audits.

### Task 6: Consequence-led Forbes and streaming presentation

**Files:**
- Modify: `views/mobile/ForbesApp.tsx`
- Modify: `services/forbesStudioProfile.ts`
- Modify: `views/mobile/components/ForbesStudioProfile.tsx`
- Modify: `services/localization/locales/en.ts`
- Modify translated locale files only through existing fallback-compatible keys if required
- Create: `scripts/audit-studio-ai-presentation-b1.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: canonical public studio/platform summaries and acquisition action state.
- Produces: no raw private company lifecycle label in rendered studio or streaming cards.

- [ ] Add a failing SSR/source audit rendering a distressed streaming platform and studio; assert raw `ACTIVE`, `DISTRESSED`, `RESTRUCTURING`, `DORMANT`, and `CLOSED` company labels are absent while valuation/cash/action evidence remains.
- [ ] Run `npm run audit:studio-ai-presentation-b1`; verify RED on the current Forbes Stream lifecycle text and studio distress badge.
- [ ] Remove the streaming lifecycle text from the ranking card while retaining subscribers, valuation, cash, tech, and markets.
- [ ] Replace distress-derived studio badge copy with acquisition consequence/action copy; retain internal acquisition-state logic.
- [ ] Keep major transition reporting in existing News/X pathways and avoid a new status dashboard.
- [ ] Run the new presentation, Forbes profile, Forbes UI, and acquisition UI audits.

### Task 7: Save migration, compaction, and integrity protection

**Files:**
- Modify: `services/saveMigration.ts`
- Modify: `services/saveCompaction.ts`
- Modify: `services/saveIntegrity.ts`
- Modify: `scripts/audit-studio-ai-foundation-b1.ts`
- Test: existing save migration/integrity/generation/transfer audits

**Interfaces:**
- Consumes: `ensureStudioAiEcosystem`, runtime normalizers, stable studio and venture IDs.
- Produces: schema-v1 old-save migration, bounded persistence, and protected identity/control/finance fingerprints.

- [ ] Add failing old-save, malformed-save, generated-venture, acquired-studio, and repeated-round-trip fixtures.
- [ ] Run focused migration and integrity audits; verify RED on missing Studio AI preservation.
- [ ] Bump the save migration version and normalize Studio AI after the world and ownership evidence are available.
- [ ] Compact only bounded ledger/decision/event history while retaining active debt, controller, handoff, and founder evidence.
- [ ] Extend integrity protection to studio IDs, controllers, debt, handoff keys, and last-processed checkpoints.
- [ ] Run B1 plus save migration, compaction, integrity, generations, transfer, mirror, and large-save preparation audits.

### Task 8: B1 long-run, regression, and completion report

**Files:**
- Create: `scripts/audit-studio-ai-long-run-b1.ts`
- Create: `docs/superpowers/reports/2026-09-02-general-production-studio-ai-b1-report.md`
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: all B1 services and existing test fixtures.
- Produces: deterministic multi-company reload-parity and performance evidence plus the B1 completion record.

- [ ] Add a deterministic long-run matrix covering established majors, regional studios, generated ventures, a closed venture, and a mid-run player acquisition.
- [ ] Assert finite cash/valuation/debt/runway, bounded histories, zero duplicate IDs, zero post-handoff AI mutation, stable company count, and exact checkpoint reload parity.
- [ ] Run all new B1 audits and existing living-studio, venture, production, acquisition, Studio Group, subsidiary, Platform AI, Project A, weekly-loop, and save audits.
- [ ] Run `npm run build`, `npm run lint`, and `git diff --check`; separate pre-existing fixture diagnostics from B1-owned failures.
- [ ] Record exact commands, results, measured runtime/save size, migration behavior, presentation rule, and deferred B2 work in the report.
- [ ] Mark B1 complete and B2 next only when every B1-owned diagnostic is green; do not begin B2 automatically.
