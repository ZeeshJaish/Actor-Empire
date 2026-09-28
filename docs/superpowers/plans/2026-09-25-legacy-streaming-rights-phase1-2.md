# Legacy Streaming Rights Phase 1–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This task is inline-only; do not dispatch subagents.

**Goal:** Preserve completed old streaming bids and uncertain old sales before any historical catalogue titles can be offered again.

**Architecture:** Inventory raw pre-normalization rights evidence, then reconcile it with the canonical registry after existing save migration. Explicit signed terms always win; provable no-term old placements become permanent streaming positions in their recorded scope (global when absent); unresolved sales become blocking holds. The common rights-compatibility path enforces both contracts and holds for current market offers.

**Tech Stack:** TypeScript, Vite, esbuild/Node audit scripts, existing save migration/integrity utilities.

**Spec:** `docs/superpowers/specs/2026-09-25-shared-streaming-library-and-legacy-rights-design.md` (only Phases 1 and 2)

## Global Constraints

- Do not seed the 2,000-title library, change awards, add starter grace, or expand rival buying.
- Do not change money, royalty settlement, original film/IP ownership, or an explicitly finite/permanent signed term.
- Missing term plus a proven old completed placement means permanent streaming rights for the recorded buyer. Preserve recorded territory and exclusivity; default only missing scope to global exclusive.
- Unknown buyer/conflicting evidence means non-listable hold, not a guessed platform.
- Preserve unrelated dirty-worktree changes. Do not stage or commit without a separate user request.
- Migration must be idempotent and save/reopen safe; existing integrity manifests remain readable.

---

### Task 1: Baseline fixture and failing rights audit

**Files:**
- Create: `scripts/audit-legacy-streaming-rights-phase1-2.ts`
- Modify: `package.json` (add one audit script)

**Interfaces:**
- Consumes: `migratePlayerSave`, `resolveStreamingRightsCompatibility`, `compactPlayerForPersistence`, `INITIAL_PLAYER`.
- Produces: a repeatable audit covering explicit finite, explicit permanent, no-term active release, no-term archived project, missing buyer, and migration replay.

- [ ] **Step 1: Create deterministic fixture helpers and assertions.** Make fresh `structuredClone(INITIAL_PLAYER)` saves. Give each fixture a unique project ID, known platform, and age/week. For a no-term active release, retain `distributionPhase: 'STREAMING'` and `streaming.platformId` but no canonical contract. For an archived project, retain `pastProjects[].streamingPlatform` and no canonical contract. A missing-buyer fixture retains a `streamingContractId` but no platform. Assert that known-buyer migrations produce one active permanent global exclusive contract with `expiresAtAbsoluteWeek === Number.MAX_SAFE_INTEGER`; explicit 26-week terms remain 26 weeks; unknown buyer is blocked by compatibility; money and finance history are unchanged.

```ts
const migrated = migratePlayerSave(legacySave);
const rights = Object.values(migrated.world.streamingRightsContracts || {})
  .filter(contract => contract.sourceProjectId === projectId);
assert.equal(rights.length, 1);
assert.equal(rights[0].permanentPurchase, true);
assert.equal(rights[0].territory, 'GLOBAL');
assert.equal(rights[0].expiresAtAbsoluteWeek, Number.MAX_SAFE_INTEGER);
assert.equal(migrated.money, legacySave.money);
```

- [ ] **Step 2: Run the new audit and record the expected failure.** Use `npm run audit:legacy-streaming-rights-phase1-2`. It must fail on current 52-week fallback or absent archived-project protection; a passing baseline indicates the fixture is not exercising the bug.
- [ ] **Step 3: Add replay and save-round-trip assertions.** Re-run `migratePlayerSave(migrated)` and `migratePlayerSave(compactPlayerForPersistence(migrated))`; compare contract IDs, permanent terms, holds, money, and finance history.
- [ ] **Step 4: Review the fixture diff without staging or committing.**

### Task 2: Explicit unresolved-rights holds and compatibility

**Files:**
- Modify: `types.ts` (hold type and optional `WorldState.legacyStreamingRightsHolds`)
- Modify: `services/streamingRightsCompatibility.ts`
- Modify: `services/saveIntegrity.ts` (protect non-empty hold registry without changing old manifest digests)
- Extend test: `scripts/audit-legacy-streaming-rights-phase1-2.ts`

**Interfaces:**
- Produces: `LegacyStreamingRightsHold` and `WorldState.legacyStreamingRightsHolds?: Record<string, LegacyStreamingRightsHold>`.
- Consumes in compatibility: `world.legacyStreamingRightsHolds` plus existing canonical registry.

- [ ] **Step 1: Add a failing compatibility assertion.** A world with only a hold for a title must reject a new global or country-specific licence; a different title remains available.

```ts
const denied = resolveStreamingRightsCompatibility({
  world: { streamingRightsContracts: {}, legacyStreamingRightsHolds: { [projectId]: hold } },
  sourceProjectId: projectId, buyerPlatformId: null, territory: 'GLOBAL',
  startsAtAbsoluteWeek: week, expiresAtAbsoluteWeek: week + 52,
  windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
});
assert.equal(denied.available, false);
assert.equal(denied.conflicts[0].code, 'LEGACY_RIGHTS_UNRESOLVED');
```

- [ ] **Step 2: Add the type and compatibility rule.** A hold has stable ID, title ID, reason (`UNKNOWN_BUYER` or `CONFLICTING_EVIDENCE`), and first observed week. Compatibility returns `UNAVAILABLE` with no purchasable countries, no guessed contract or expiry, and a plain-language unresolved-rights summary. This check runs before ordinary contract overlap evaluation.
- [ ] **Step 3: Add non-empty holds to protected-save fingerprints.** Make the new manifest field optional and omit it for old saves without holds so old signed digests are unchanged. Compare it during canonical-to-compacted save checks. Add integrity audit cases for a missing hold after compaction and a legacy manifest without the field.
- [ ] **Step 4: Run** `npm run audit:legacy-streaming-rights-phase1-2` and `npm run audit:save-integrity`; review failures before proceeding.

### Task 3: Rights-first legacy reconciliation

**Files:**
- Create: `services/legacyStreamingRights.ts`
- Modify: `services/saveMigration.ts` (call reconciler after canonical rights import; bump migration version)
- Modify: `services/streamingRightsCore.ts` only if a narrow helper/export is necessary; preserve existing access-grant edits
- Extend test: `scripts/audit-legacy-streaming-rights-phase1-2.ts`

**Interfaces:**
- Produces: `reconcileLegacyStreamingRights(player: Player, rawInput: Partial<Player> | Player): Player`.
- Consumes: existing `createStreamingLicenseContract`, `createStreamingRightsContractFromLicense`, `registerStreamingRightsContract`, and normalized registry from `streamingRightsCore.ts`.

- [ ] **Step 1: Add failing migration cases.** Include (a) old active streaming release, (b) archived sold film, (c) explicit finite contract plus stale `streamingPlatform`, (d) explicit expired finite contract, (e) existing synthesized 52-week `legacySource: 'PRODUCTION_RELEASE'`, (f) ambiguous buyer, (g) player-owned platform licence missing terms, and (h) AI buyer-local licence missing terms.
- [ ] **Step 2: Implement evidence extraction from the raw input.** Scan raw active releases, archived projects, buyer-local licences, canonical contracts, and accepted offer references before reading normalized default terms. Mark an original contract explicit when it carries a genuine signed window/expiry/duration; treat a `PRODUCTION_RELEASE` fallback without an accepted source offer as synthesized. Merge records by canonical project ID and proven contract lineage, never by title text.
- [ ] **Step 3: Reconcile without financial mutation.** For each title, preserve explicit terms first. For one proven no-term buyer, make an existing synthesized contract permanent in place or register one deterministic permanent global contract with `LEGACY_PAID` settlement. Align affected buyer-local projection expiry with the canonical result. For missing/conflicting buyer, create one stable blocking hold. Never invent a payment, new award, or IP transfer.

```ts
const reconciled = reconcileLegacyStreamingRights(playerWithStreamingContracts, input);
const playerWithStreamingRightsCalendar: Player = {
  ...reconciled,
  streamingRightsManagement: normalizeStreamingRightsManagementState(reconciled.streamingRightsManagement),
  world: {
    ...reconciled.world,
    streamingRightsCalendar: normalizeStreamingRightsCalendarState(reconciled.world.streamingRightsCalendar),
  },
};
```

- [ ] **Step 4: Store a versioned reconciliation summary.** Persist a version marker and bounded counts of explicit preserved, permanent protected, and unresolved held titles. A repeated migration must return equivalent rights/holds and never duplicate IDs.
- [ ] **Step 5: Run the focused audit and existing migration/rights audits.** Use `npm run audit:legacy-streaming-rights-phase1-2`, `npm run audit:save-migration`, and `npm run audit:streaming-rights-compatibility-phase3`.

### Task 4: End-to-end safety gate and handoff

**Files:**
- Extend test: `scripts/audit-legacy-streaming-rights-phase1-2.ts`
- Extend test only if needed: `scripts/audit-save-migration.ts`, `scripts/audit-save-integrity.ts`
- Create: `docs/superpowers/reports/2026-09-25-legacy-streaming-rights-phase1-2.md`

**Interfaces:**
- Consumes: completed reconciliation, compatibility, save compaction, integrity, and market listing checks.
- Produces: read-only QA report; no later-phase catalogue or market supply changes.

- [ ] **Step 1: Add purchase-path regression.** A saved sold title that is already a market candidate must be blocked by canonical compatibility (permanent contract or hold) at listing and signing. An unsold title must remain eligible. Add a territory-specific explicit finite test to prove unrelated territories are not globally locked.
- [ ] **Step 2: Run focused and broad checks.** Run the new audit, save migration, save integrity, streaming-rights compatibility, marketplace audit, `npm run lint`, `npm run build`, and `git diff --check`. Report pre-existing unrelated failures separately from regressions.
- [ ] **Step 3: Write the QA report with exact pass/fail commands, known limitations, and confirmation that no 2,000-title seeding or financial replay occurred.** Do not stage or commit.
