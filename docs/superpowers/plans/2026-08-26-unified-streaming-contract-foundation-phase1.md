# Unified Streaming Contract Foundation Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` for inline implementation. The user explicitly prohibited subagents, staging, and commits.

**Goal:** Add one deterministic canonical streaming-rights contract registry, migrate existing contracts and active Production House streaming deals, and keep current signing paths synchronized without redesigning the bidding UI.

**Architecture:** `WorldState.streamingRightsContracts` stores normalized `StreamingRightsContract` records. Existing owned-platform and Platform AI licence arrays remain temporary compatibility projections, while Production House releases reference the canonical registry by `streamingContractId`. Save migration deterministically imports legacy records without cash movement or offer conversion.

**Tech Stack:** TypeScript, React game state, esbuild audit scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-08-26-unified-streaming-contract-foundation-design.md`

## Global Constraints

- Work inline with the user; do not use subagents.
- Preserve unrelated dirty-worktree changes.
- Do not stage or commit.
- Use strict sequential RED to GREEN TDD.
- Never use `Math.random()` or `Date.now()` for contract IDs, migration, or normalization.
- Pending offers are not signed contracts.
- Migration must not move cash or reroll any existing outcome.
- Phase 1 does not redesign the bidding-room UI or activate renewal gameplay.

---

### Task 1: Restore the persistence audit baseline

**Files:**
- Modify: `services/ownedStreamingPlatform.ts`
- Test: `scripts/audit-streaming-rights-marketplace-phase16.ts`
- Test: `scripts/audit-platform-ai-rights-lifecycle.ts`
- Test: `scripts/audit-save-transfer.ts`

**Interfaces:**
- Consumes: `normalizeOwnedStreamingPlatformState(value, playerId, protectedRivalMoveIds)`.
- Produces: `compactOwnedStreamingPlatformForPersistence(value, playerId, protectedRivalMoveIds?)` without an undefined identifier.

- [ ] **Step 1: Preserve the observed RED**

Run:

```bash
npm run audit:streaming-rights-marketplace-phase16
```

Expected: FAIL with `ReferenceError: protectedRivalMoveIds is not defined`.

- [ ] **Step 2: Write the minimal fix**

Add the optional `protectedRivalMoveIds: ReadonlySet<string> = new Set()` parameter to `compactOwnedStreamingPlatformForPersistence` and pass it to normalization.

- [ ] **Step 3: Verify GREEN**

Run:

```bash
npm run audit:streaming-rights-marketplace-phase16
npm run audit:platform-ai-rights-lifecycle
npm run audit:save-transfer
```

Expected: all three exit successfully.

### Task 2: Define and normalize the canonical registry

**Files:**
- Modify: `types.ts`
- Modify: `services/streamingRightsCore.ts`
- Create: `scripts/audit-streaming-contract-foundation-phase1.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `StreamingRightsContract`, `StreamingRightsContractRegistry`, `normalizeStreamingRightsContractRegistry`, `registerStreamingRightsContract`, and `getStreamingRightsContract`.
- Consumes later: save migration, save compaction, owned-platform signing, Platform AI signing, and Production House acceptance bridges.

- [ ] **Step 1: Write the failing registry audit**

The audit imports the wished-for API and asserts literal normalized values for malformed money, shares, country duplicates, dates, and party data. It also asserts that registering an existing ID is a no-op and preserves the first record.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run audit:streaming-contract-foundation-phase1
```

Expected: FAIL because the contract registry API is missing.

- [ ] **Step 3: Add the minimal types and registry functions**

Implement schema version 1, stable normalization, deterministic ordering, and immutable registration. Keep legacy `OwnedStreamingCatalogLicense` unchanged as a projection type.

- [ ] **Step 4: Verify GREEN**

Run the focused audit and expect all registry assertions to pass.

### Task 3: Add deterministic legacy migration

**Files:**
- Modify: `services/streamingRightsCore.ts`
- Modify: `services/saveMigration.ts`
- Modify: `types.ts`
- Modify: `scripts/audit-streaming-contract-foundation-phase1.ts`

**Interfaces:**
- Produces: `migrateStreamingRightsContractRegistry(player): Player`.
- Adds: `WorldState.streamingRightsContracts`, `ActiveRelease.streamingContractId`, `StreamingState.contractId`, and optional `PastProject.streamingContractId` compatibility fields.

- [ ] **Step 1: Add a failing rich-license migration case**

Build a real player fixture with one owned-platform licence and one AI licence. Assert both appear once in the world registry with the correct buyer parties and `LEGACY_PAID` settlement.

- [ ] **Step 2: Verify RED**

Run the focused audit and expect the registry to remain empty.

- [ ] **Step 3: Implement rich-license import**

Import existing canonical licence data in deterministic precedence order without modifying platform cash, player money, or studio balances.

- [ ] **Step 4: Verify GREEN**

Run the focused audit and expect the rich-license migration case to pass.

- [ ] **Step 5: Add a failing active-release backfill case**

Use an active `STREAMING` release with a known platform, elapsed week, upfront fee, royalty, funding, and no contract ID. Assert one stable 52-week legacy contract and matching release references. Include a `STREAMING_BIDDING` release and assert it creates no contract.

- [ ] **Step 6: Verify RED**

Run the focused audit and expect the active release to lack its canonical contract.

- [ ] **Step 7: Implement active-release backfill**

Derive the stable ID and start week without randomness, mark prior cash `LEGACY_PAID`, and leave pending bids untouched.

- [ ] **Step 8: Verify GREEN and idempotence**

Run migration twice and assert byte-equivalent registry/references and unchanged cash values.

### Task 4: Preserve the registry through save compaction and transfer

**Files:**
- Modify: `services/saveCompaction.ts`
- Modify: `scripts/audit-streaming-contract-foundation-phase1.ts`
- Modify: `scripts/audit-save-migration.ts`
- Modify: `scripts/audit-save-transfer.ts`

**Interfaces:**
- Consumes: `normalizeStreamingRightsContractRegistry`.
- Produces: compacted saves that retain active/referenced contracts and bounded terminal history.

- [ ] **Step 1: Add failing compaction and transfer assertions**

Assert an active referenced contract survives compaction and migration after JSON transfer, malformed entries are removed, and a second migration is unchanged.

- [ ] **Step 2: Verify RED**

Run the focused audit plus save migration/transfer audits and observe the missing registry preservation assertion.

- [ ] **Step 3: Implement world-registry compaction**

Normalize the registry, retain every active or project-referenced contract, and keep at most 240 newest unreferenced terminal contracts.

- [ ] **Step 4: Verify GREEN**

Run the focused, save-migration, and save-transfer audits.

### Task 5: Synchronize existing signing paths

**Files:**
- Modify: `services/streamingCatalog.ts`
- Modify: `services/streamingRightsMarketplace.ts`
- Modify: `services/platformAi/platformAiContentSourcing.ts`
- Modify: `services/platformAi/platformAiRightsLifecycle.ts`
- Modify: `services/platformAi/platformAiDistress.ts`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `services/gameLoop.ts`
- Modify: `scripts/audit-streaming-contract-foundation-phase1.ts`

**Interfaces:**
- Consumes: `registerStreamingRightsContract` and adapters from existing licence/bid data.
- Produces: immediate canonical registration for current player-owned licences, AI licences/renewals, accepted Production House bids, and autonomous subsidiary deals.

- [ ] **Step 1: Add one failing signing-path case at a time**

For each actor path, assert that the existing projection and the world registry share the same contract ID and commercial terms, with no double payment when the same action is replayed.

- [ ] **Step 2: Verify each RED independently**

Run only the focused audit after adding each case; the new assertion must fail for a missing canonical registry side effect.

- [ ] **Step 3: Implement the minimal registration bridge**

Register the contract during the existing state transition. Do not alter offer timing, UI, acceptance choices, or renewal behaviour.

- [ ] **Step 4: Verify each GREEN independently**

Run the focused audit after each bridge and retain all prior passing assertions.

### Task 6: Final verification

**Files:**
- Review only: all Phase 1 changes.

**Interfaces:**
- Produces: fresh evidence for the approved Phase 1 acceptance criteria.

- [ ] **Step 1: Run focused and regression audits**

```bash
npm run audit:streaming-contract-foundation-phase1
npm run audit:streaming-rights-marketplace-phase16
npm run audit:platform-ai-rights-lifecycle
npm run audit:platform-ai-sourcing
npm run audit:save-migration
npm run audit:save-transfer
npm run audit:subsidiary-streaming
```

- [ ] **Step 2: Run production verification**

```bash
npm run build
git diff --check
```

- [ ] **Step 3: Review scope**

Confirm no bidding UI redesign, no renewal activation, no random/time-based IDs, no staging/commit, and no unrelated cleanup entered the diff.
