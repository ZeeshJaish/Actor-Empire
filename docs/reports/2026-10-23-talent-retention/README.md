# Actor roster and sequel retention repair

The actor profile could be removed by weekly NPC cleanup even though its contract survived. The roster counted that contract but rendered no card when the profile was missing. Sequel prefill also discarded unresolved actor IDs. Save compaction protected current productions but missed historical casts and continuation drafts.

## Changes

- Weekly cleanup and save compaction share one reference collector. Signed actors, subsidiary rosters, past/current productions, sequel drafts, universes, relationships and dynasty history protect referenced profiles. Only unreferenced market profiles rotate out.
- New signed contracts keep an exact actor snapshot. Migration and weekly processing can restore a missing profile from that snapshot without changing money, contract terms, installments or consumed film uses. A newer live profile takes priority.
- A valid current save can recover a missing contracted actor from its integrity-verified previous generation. Recovery requires the same original signing ID, owning studio and immutable signing terms. Default player IDs do not establish career identity. Ambiguous legacy contracts are skipped. The repair copies only the actor profile; it neither promotes the previous save nor rewrites the stored current save during loading.
- Healthy profiles, built-in database actors, family relationship IDs and unsigned historical references do not trigger previous-generation verification.
- A contract with an unavailable profile remains visible with its saved actor name where available, remaining movies and financial terms. Unknown skills are not invented. Known deceased actors are not restored as living actors.
- Unresolved sequel cast members remain visible. Validation and the project builder stop Greenlight before funding or consuming contract uses until the role is recovered or recast.

## Verification

The final complete run passed **72 actual game weeks and 26 verified save/reloads**.

The long-flow audit uses the actual signing transaction, Greenlight builder/funding, weekly production engine, continuation creation, save preparation/integrity coordinator and migration. Fixtures are isolated and highly funded; no personal save is loaded or modified.

| Coverage | Result / evidence |
| --- | --- |
| Reference retention, missing roster UI, mirrors, legacy contract fields, installment safety, deceased actors, unresolved sequel cast | [13 passing groups](evidence/retention-tests.txt) |
| Previous-generation profile recovery, default-ID cross-career separation, changed signing terms, damaged/missing backup, no unnecessary reads, all other current career fields unchanged | [15 passing cases](evidence/backup-recovery.txt) |
| Four actual hires: generated and built-in actors, parent and subsidiary studios, upfront and weekly installments | [Full engine journey](evidence/full-flow-final.txt) |
| Two original films through production and real premieres; two sequels through full production; five subsequent game weeks | [Full engine journey](evidence/full-flow-final.txt) |
| Save/reload checkpoints preserve actor identity, remaining uses, payment progress, cash, subsidiary balances, shares and ownership | [Full engine journey](evidence/full-flow-final.txt) |
| Existing signing, last-film exhaustion, unpaid EMI, Greenlight funding and migration | [Contract regression audit](evidence/contract-regressions.txt) |
| Save coordinator and integrity; dynasty behavior | [Generations](evidence/save-generations-final.txt), [integrity](evidence/save-integrity.txt), [dynasty](evidence/dynasty-regressions.txt) |
| Production build | [Passed](evidence/build-final.txt) |
| Scoped TypeScript compilation including changed views/services and all new audits | Passed, exit 0; [diagnostics](evidence/focused-typecheck.txt) |
| Diff whitespace check | Passed; [diagnostics](evidence/diff-check.txt) |

Browser checks used the real Talent Management component in an isolated local harness. A real market actor was signed with the visible offer controls and remained visible after the harness state reload. The browser harness stores only QA money/contracts/actors; the long engine audit separately verifies the complete generation coordinator and migration path.

- [Hired actor after reload](../../../output/playwright/talent-retention/hired-roster.png) · [signing/reload assertions](../../../output/playwright/talent-retention/hiring-proof.txt)
- [Missing legacy profile, contract still visible](../../../output/playwright/talent-retention/legacy-missing-profile.png) · [320/390/1440px assertions](../../../output/playwright/talent-retention/legacy-proof.txt)
- [Exact snapshot restored as an actor card](../../../output/playwright/talent-retention/recovered-roster.png)

A scoped UI detector reported [no findings](evidence/design-detector.json). No ignore rules were added.

## Limits and preservation

A profile already deleted from every available source cannot be reconstructed accurately. The safe fallback keeps its contract/history visible and requires a verified source or recasting; no random actor or invented stats replace it. Historical-only references without a provable signed-contract lineage are not automatically copied from a previous career generation.

The complete repository TypeScript check still reports an existing `vite.config.ts` plugin `enforce` typing error ([output](evidence/typecheck.txt)); the focused compilation and production build pass. The Vite configuration was not changed for this repair.

Unrelated box-office/economy work present at the start or edited concurrently was preserved. This task does not stage, commit, push, reset or restore workspace changes. Reproduce the checks with `npm run audit:talent-retention`, `npm run audit:talent-save-recovery`, `npm run audit:talent-roster-flow`, and `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p docs/reports/2026-10-23-talent-retention/tsconfig.json`. Source fingerprints and commands are recorded in [provenance.json](provenance.json).
