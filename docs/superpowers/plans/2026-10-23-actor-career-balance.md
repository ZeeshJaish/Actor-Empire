# Actor Career Balance Implementation Plan

> **For agentic workers:** Execute with executing-plans, using read-only independent review at integration boundaries.

**Goal:** Make early acting competence useful sooner and keep established careers dependent on performance, fit, audience and per-project attention.

**Architecture:** A focused actorCareerBalance module resolves versioned learning, workload, performance, publicity and career evidence. Existing action, offer, migration and weekly engines consume it; existing accounting and cinema settlement remain unchanged.

**Tech Stack:** TypeScript, React action handlers, existing esbuild audit runner, verified save-generation memory fixtures.

**Spec:** docs/superpowers/specs/2026-10-23-actor-career-balance.md

## Global Constraints

- No extra scheduling UI, forced flop quotas, wealth-based earning cap or renewal-rights work.
- Preserve existing skills, money, awards, signed salaries/sponsorships, studio ownership and shares.
- Preserve unrelated workspace work; baseline copies/hashes in /tmp/ae-career-balance-baseline.
- Existing active commitments retain their legacy rules. Apply new preparation/performance rules to version1 projects only.
- No personal save storage or destructive Git operations. No commit/push requested in this turn.

## Task 1 — Learning and project-specific attention

Files: create services/actorCareerBalance.ts and scripts/audit-actor-career-balance.ts; modify types.ts, hooks/useGameActions.ts, services/roleLogic.ts, services/gameLoop.ts, services/saveMigration.ts, views/mobile/MobilePage.tsx and greenlightProjectBuilder.ts.

Interfaces: ensureActorCareerBalance(player); getCareerLearningGain(current,base); getCareerProjectLoad(player,project); getCareerPassivePreparation(player,project); getCareerFinalPerformance(player,project); applyCareerRehearsal(player,projectId). New optional Commitment.careerBalanceVersion=1.

- [x] Write executable regressions: low-level class gain beats current gain; 85+ progress slower than beginner progress; actor passive preparation unaffected by writing skill; five new overlapping movies share attention; focused rehearsal changes only one project and consumes energy; table reads cannot farm global XP; legacy commitment stats and salary unchanged.
- [x] Run esbuild audit and capture failures before production edits.
- [x] Implement bounded helpers and integrate exact enrollment/rehearsal/new commitment/production handoffs. Mark initial version at week/migration/action without restamping active legacy projects.
- [x] Re-run regressions and exact action-handler checks.

## Task 2 — Team, demand, new offers and legacy status

Files: actorCareerBalance.ts, teamLogic.ts, roleLogic.ts, actorCareerArc.ts, gameLoop.ts; extend audit-actor-career-balance.ts.

Interfaces: getCareerEvidence(player), getCareerPublicityDelta(player), getCareerCommercialMultiplier(player), canOfferCareerLead(player), hasCareerLegendStanding(player).

- [x] Write regressions showing PR-only no-credit fame cannot rise toward94, recent good work supports more attention than old repeated poor work, new commercial quotes require credible audience, agent/direct offers distinguish craft fit, future pay smoothly rises through BLOCKBUSTER, and new Legend requires sustained credits while grandfathered status remains valid.
- [x] Run RED, implement minimal pure rules using existing history/staff, then GREEN. Preserve current signed offer amounts and every cash ledger.
- [x] Validate good personal acting in weak movies versus poor acting in successful movies; no random forced failure or money clawback.

## Task 3 — Career and persistence verification

Files: create scripts/audit-actor-career-flow.ts, fixtures as needed, docs/reports/2026-10-23-actor-career-balance/README.md and provenance/evidence; add package scripts without dropping unrelated commands.

- [x] Run ordinary fresh actor careers using paid classes/jobs/practice/applications/production actions, not stat/cash grants; include differing genres and failed attempts. Record horizons and terminal states honestly.
- [x] Separately run prepared established actor and five concurrent-film cases through real creation/rehearsal/production/release functions; signed payments settle once and project-specific quality responds to allocated attention.
- [x] Save/reload at meaningful stages with real preparation/migration/verified generations. Repeat weeks and failed-promotion recovery; assert skills/cash/shares/ownership/contracts unchanged by migration.
- [x] Run affected casting, role, team, energy, talent, cinema audience, save and legacy regressions; run lint/build; independent review and preservation hash checks.
- [x] Publish precise results and remaining coverage limits. Leave changes local for user review.

## Verification closeout

Completed two ordinary 78-week careers with one archived acting credit and 12 verified reloads each; prepared five-film/continuation flow completed 73 weeks and 19 reloads; legacy-contract flow completed 14 weeks and 15 reloads. 29 focused checks, 10 affected regression commands, full TypeScript and bounded production build passed. Full-flow money verification additionally reproduced and fixed a prospective double commission debit: gross salary plus one expense now nets the signed amount correctly. Existing balances/history were not rewritten. Earlier 208-week exploratory runs are explicitly distinguished from the final preparation-flow evidence. All 59 non-package baseline files remain byte-identical; all pre-existing npm commands retained. Changes remain local.
