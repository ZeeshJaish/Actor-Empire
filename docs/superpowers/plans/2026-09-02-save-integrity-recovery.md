# A8S Save Integrity and Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent corrupt, partial, or incorrectly compacted saves and imports from replacing the last verified Actor Empire career.

**Architecture:** Add a pure integrity-manifest boundary around the existing migration and compaction pipeline, then add an IndexedDB candidate/previous generation adapter with atomic promotion and recovery. Keep public save keys and the signed transfer format compatible; integrate recovery only at the existing App save/load boundaries.

**Tech Stack:** TypeScript, React, IndexedDB, Capacitor WebView storage, esbuild audit scripts

**Spec:** `docs/superpowers/specs/2026-09-02-save-integrity-recovery-design.md`

## Global Constraints

- Preserve `ActorEmpireDB` and public `actorEmpireSave_N` records.
- Preserve all player-owned canonical identities and financial values through compaction.
- Do not add SQLite, cloud storage, or a new Capacitor dependency.
- Never promote before candidate read-back verification.
- Never silently replace a damaged slot with a new career.
- Preserve unrelated dirty work and do not commit or push without explicit user instruction.

---

### Task 1: Integrity manifest and protected-data validation

**Files:**
- Create: `services/saveIntegrity.ts`
- Create: `scripts/audit-save-integrity.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `createSaveIntegrityManifest(player, reason)`, `verifySaveIntegrity(player, manifest)`, `compareProtectedSaveState(before, after)` and the manifest/result types.

- [x] **Step 1: Write the failing audit**

Cover literal fixtures proving that money, player project IDs, business IDs, active rights IDs, active production IDs, awards, relationships, family, universes, entitlements, and owned-streaming identity survive; bounded feeds and terminal history may shrink; malformed numeric state fails.

- [x] **Step 2: Run RED**

Run: `npm run audit:save-integrity`  
Expected: FAIL because `services/saveIntegrity.ts` does not exist.

- [x] **Step 3: Implement the pure manifest boundary**

Use deterministic sorted IDs and a small stable string hash. The comparison result must be:

```ts
type ProtectedSaveComparison =
  | { ok: true }
  | { ok: false; violations: string[] };
```

Do not hash raw poster bytes, feeds, logs, news, chart histories, or terminal world simulation collections.

- [x] **Step 4: Run GREEN**

Run: `npm run audit:save-integrity`  
Expected: PASS with deliberate protected-data corruption rejected.

### Task 2: Candidate-first generation storage

**Files:**
- Create: `services/saveGenerations.ts`
- Create: `scripts/audit-save-generations.ts`
- Modify: `services/storage.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: manifest creation and verification from Task 1.
- Produces: `saveVerifiedGameData`, `loadVerifiedGameData`, `recoverPreviousGameData`, `stageVerifiedGameDataBatch`, and `promoteStagedGameDataBatch`.

- [x] **Step 1: Write the failing audit**

Use the real generation coordinator with an in-memory transaction adapter. Prove candidate-write failure, read-back mismatch, and promotion failure leave current unchanged; successful promotion rotates current to previous; corrupt current exposes recovery; successful recovery quarantines the damaged current.

- [x] **Step 2: Run RED**

Run: `npm run audit:save-generations`  
Expected: FAIL because generation services are missing.

- [x] **Step 3: Implement the coordinator and IndexedDB adapter**

Keep database mechanics in `storage.ts`; put state-machine decisions in `saveGenerations.ts`. Legacy current records without manifests return `LEGACY_UNVERIFIED`, not `CORRUPT`. Internal companion keys must never appear as player slots.

- [x] **Step 4: Run GREEN**

Run: `npm run audit:save-generations`  
Expected: PASS for all failure-injection and recovery cases.

### Task 3: Compaction guard and oversized legacy policy

**Files:**
- Create: `services/savePreparation.ts`
- Create: `scripts/audit-large-save-integrity.ts`
- Modify: `services/saveCompaction.ts` only if the failing invariant audit identifies an actual protected-data loss
- Modify: `package.json`

**Interfaces:**
- Produces: `prepareVerifiedPlayerForPersistence(player, reason)` returning `{ player, manifest, comparison, oversizedLegacy }`.

- [x] **Step 1: Write the failing audit**

Generate representative 50 MB, 100 MB, and 400 MB byte estimates without committing fixture blobs. Assert that preparation keeps protected IDs/totals, permits declared history shrinkage, marks the oversized legacy path, and does not JSON-clone the entire save.

- [x] **Step 2: Run RED**

Run: `npm run audit:large-save-integrity`  
Expected: FAIL because verified preparation is missing.

- [x] **Step 3: Implement preparation and space-aware policy**

Migrate external/legacy input first, capture the canonical pre-compaction manifest, compact once, compare protected state, and reject on violation. A clearly oversized unverified legacy current is not duplicated as `previous`; its first verified compacted generation records `needsRecoveryCheckpoint: true`.

- [x] **Step 4: Run GREEN**

Run: `npm run audit:large-save-integrity`  
Expected: PASS and print generated byte estimates plus retained protected counts.

### Task 4: App save, load, and recovery integration

**Files:**
- Modify: `App.tsx`
- Create: `components/SaveRecoveryModal.tsx`
- Create: `scripts/audit-save-recovery-ui.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: verified preparation and generation storage.
- Player-visible result: routine saves remain invisible; corrupt current + valid previous opens a recovery dialog; failure never creates a replacement career.

- [x] **Step 1: Write failing service/UI audits**

Assert slot loading branches on `CURRENT`, `LEGACY_UNVERIFIED`, `RECOVERY_AVAILABLE`, and `UNRECOVERABLE`; the recovery action shows the safe generation age/week; cancellation returns to slot selection.

- [x] **Step 2: Run RED**

Run: `npm run audit:save-recovery-ui`  
Expected: FAIL because recovery UI and integration are absent.

- [x] **Step 3: Integrate save reasons and recovery**

Route Process Week through reason `PROCESS_WEEK`, migration through `MIGRATION`, ordinary state writes through `AUTOSAVE`, and manual saves through `MANUAL`. Request `navigator.storage.persist()` once when supported. Keep localStorage mirror scheduling after verified promotion.

- [x] **Step 4: Run GREEN**

Run: `npm run audit:save-recovery-ui` and focused save audits.  
Expected: PASS; no silent new-game fallback exists for a damaged populated slot.

### Task 5: Transactional signed import

**Files:**
- Modify: `services/saveTransfer.ts`
- Modify: `services/storage.ts`
- Modify: `scripts/audit-save-transfer.ts`

**Interfaces:**
- Consumes: verified preparation and batch staging/promotion.
- Result: signature verification and every candidate read-back complete before any public slot replacement.

- [x] **Step 1: Extend the transfer audit and run RED**

Add existing-slot fixtures and inject a failure on the second staged import. Assert every public current remains byte-for-byte unchanged.  
Run: `npm run audit:save-transfer`  
Expected: FAIL because import still clears the live store before writes.

- [x] **Step 2: Replace clear-first import with staged batch promotion**

Stage sanitized entries, verify all of them, then promote in one transaction. Restore media and local preferences only after promotion. Preserve existing valid currents as previous generations.

- [x] **Step 3: Run GREEN**

Run: `npm run audit:save-transfer`  
Expected: PASS for interrupted and successful multi-slot import.

### Task 6: Regression, performance, documentation, and roadmap

**Files:**
- Modify: `docs/superpowers/specs/actor-empire-post-platform-master-roadmap.md`
- Create: `docs/superpowers/reports/2026-09-02-save-integrity-recovery-report.md`

**Interfaces:**
- Consumes all prior tasks.
- Produces final verification evidence and leaves Project B B1 approval-gated.

- [x] **Step 1: Run focused regression**

Run the new A8S audits plus `audit:save-migration`, `audit:save-transfer`, `audit:week-processing-save-safety`, `audit:save-mirror`, and `audit:late-game-week-performance`.

- [x] **Step 2: Run build and repository checks**

Run `npm run build`, `npm run lint`, and `git diff --check`. Separate pre-existing fixture diagnostics from A8S-owned failures.

- [x] **Step 3: Write the evidence report and update the roadmap**

Record exact audit outcomes, generated fixture sizes, remaining native-storage boundaries, and the next approval gate. Do not claim physical-device evidence unless it was actually collected.

