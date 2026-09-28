# Talent Settlement and AI Studio Parity (Phases 3–4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work inline in this checkout; do not delegate, stage, or commit without the user's request.

**Goal:** Settle talent contracts exactly once on eligible studio receipts, credit named NPC writers in awards and career/Forbes, and bring new AI-studio productions onto the same named-talent and finance rules.

**Architecture:** A pure versioned career/settlement service posts keyed earnings into optional world state and returns a processed contract package. Player release receipt branches invoke it only after actual studio receipt, subtract expense from the studio, and retain keys with the release. AI studios select a deterministic writer alongside cast/director, store one affordable talent package at booking, allocate upfront fees inside existing production milestones, and apply any backend only at a real release receipt. Existing saves with missing fields remain valid and do not acquire historical obligations.

**Tech Stack:** TypeScript, React, existing Vite/esbuild audits, player release loop, studio AI modules, save migration/compaction.

**Spec:** `docs/superpowers/specs/2026-09-27-streaming-content-market-and-studio-talent-roadmap-design.md`, phases 3–4 only.

## Global constraints

- Preserve all unrelated dirty work and old save data; no retroactive payments or reopened awards.
- Backend basis is positive title-attributed studio receipts after rights-holder allocation, never platform subscribers or gross box office.
- One event key pays each contract at most once; zero/negative/invalid receipts pay nothing.
- AI upfront talent compensation is a named allocation inside the already approved production budget and milestone debit, not a second studio cash charge.
- AI cancelled/held productions cannot earn release backend or fictional profits. Previously in-progress productions may keep their legacy in-house writer and null participation.
- No Phase 5–8 market generation, rival brokerage, or paid refresh work.

---

### Task 1: Shared receipt and NPC-career ledger

**Files:** Create `services/talentCareer.ts`; modify `types.ts`; test `scripts/audit-talent-career-phases3-4.ts`.

**Interfaces:** `settleTalentReceipt(world, projectId, package, receiptKey, studioReceipts, absoluteWeek)` returns updated world/package/payout; `creditTalentUpfront(world, projectId, participants, eventKey, absoluteWeek)` returns an idempotent world and allocated total; `creditTalentProject(world, projectId, participants, eventKey, absoluteWeek)` registers credits once.

- [ ] Write failing behavior tests: positive receipt pays each contract once, same key replay pays zero, zero/negative receipt pays zero, old package absent pays zero, valid writer ID earns persistent income and project credit, separate saves do not share NPC wealth changes.
- [ ] Run the audit and see the missing-service failure.
- [ ] Implement bounded optional world ledger with event IDs, per-NPC earnings/credits, and contract processed keys. Refuse malformed packages and entitlement ratios; preserve missing legacy data as absent.
- [ ] Re-run focused audit and save compaction/migration round trip.

### Task 2: Player studio receipts and screenplay awards

**Files:** Modify `services/gameLoop.ts`, `services/awardLogic.ts`, `views/lifestyle/business/GreenlightWizard.tsx`, `views/mobile/ForbesApp.tsx`; test `scripts/audit-talent-career-phases3-4.ts`, existing award/Greenlight audits.

**Interfaces:** Greenlight credits already-budgeted upfront fees once; theatrical, streaming and soundtrack branches pass actual positive studio receipts to Task 1 with stable event keys. Award writer helper resolves `IndustryProject.writerId/writerName` or truthful team fallback.

- [ ] Write failing tests for a first-film release: receipt payout reduces studio balance/profit exactly once, NPC income is visible in Forbes overlay, and old active project with no package pays zero; screenplay ballot/winner names the credited writer, not the lead actor.
- [ ] Run red. Connect the ledger at actual receipt boundaries and preserve the resulting package on active/past release snapshots. Do not charge upfront talent twice.
- [ ] Correct screenplay nominee/winner/fallback and add stable NPC credit/award history only for new ceremonies.
- [ ] Re-run award, Greenlight, week-progression and save audits.

### Task 3: AI studio named talent and affordable budget allocation

**Files:** Modify `services/studioAi/studioAiProductionTalent.ts`, `services/studioAi/studioAiProductionEconomy.ts`, `services/studioAi/studioAiProductionState.ts`, `types.ts`; test `scripts/audit-studio-ai-production-talent-b6.ts`, new phase audit.

**Interfaces:** New package stores stable writer ID/name, actor/director/writer upfront amounts, optional backend package and processed keys; `paidMilestoneIds` remains the cash-debit authority.

- [ ] Write failing tests: deterministic writer/cast/director IDs after replay; upfront allocation <= existing budget, first milestone posts credits only after cash is debited, held/cancelled projects have no unpaid or release income, legacy in-progress `writerId: null` remains valid.
- [ ] Run red. Select a compatible fictional writer deterministically and derive bounded cash/backend terms from title budget and talent leverage.
- [ ] Attach writer/participation to new production only. Allocate upfront at milestone inside its single existing studio debit and post NPC income once.
- [ ] Re-run B6 talent, economy, hold, turnaround and long-run audits.

### Task 4: AI release settlement, canonical credits and closure

**Files:** Modify `services/studioAi/studioAiCommercialResult.ts`, `services/industryWorld/studioOwnershipMaterializer.ts`, `services/awardLogic.ts`; test `scripts/audit-talent-career-phases3-4.ts` and existing B6 commercial result/award/save audits.

**Interfaces:** AI release writer ID/name and talent participation remain on the canonical `IndustryProject` and production record. AI backend pays from the generated `studioReceiptsMillions` once, after release-market rights allocations, and expense reduces net result and studio cash.

- [ ] Write failing tests: released canonical project has truthful writer, AI backend reduces collected studio income and increases the right NPC's wealth once; no rights/no release pays zero; replay cannot add a second project, ledger row or payout.
- [ ] Run red. Apply shared settlement to release path, keep ownership/turnaround handoff credits intact, and preserve contract state through normalization/save compaction.
- [ ] Run all targeted audits, production build, 8 GB TypeScript check and `git diff --check`. Report any baseline failures and device-QA limits honestly.
