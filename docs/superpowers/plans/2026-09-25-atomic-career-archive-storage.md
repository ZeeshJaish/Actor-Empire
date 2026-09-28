# Atomic Career Archive Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separately stored, versioned archive whose reference is promoted and recovered atomically with each verified hot save, without moving player history yet.

**Architecture:** Immutable, bounded archive chunks live under reserved keys in `ActorEmpireDB/saves`. A per-generation archive root lists chunk digests. Existing candidate/previous/current save promotion gains a root companion in the same IndexedDB transaction. No gameplay collection is removed until storage and transfers can round-trip the archive.

**Tech Stack:** TypeScript, IndexedDB, Capacitor WebView, esbuild audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-25-atomic-career-history-archive-design.md`

## Global Constraints

- Never discard history, current save, previous verified generation, or quarantine data to recover quota.
- Keep legacy v1 saves readable and do not activate the archive on iOS/Android before complete signed transfer coverage.
- Do not stage or commit in this dirty shared checkout without a separate user request.
- Run focused red/green tests and build; preserve unrelated existing changes.

---

### Task 1: Archive root and chunk integrity model

**Files:**
- Create: `services/careerArchive.ts`
- Test: `scripts/audit-career-archive-core.ts`

**Interfaces:**
- Produces `CareerArchiveRoot`, `CareerArchiveChunk`, `createArchiveChunk`, `verifyArchiveChunk`, `createArchiveRoot`, and `verifyArchiveRoot`.

- [x] Write a failing audit covering stable chunk IDs, SHA-256 digest, duplicate IDs, corrupt bytes, and empty-root compatibility.
- [x] Run the audit and confirm it fails because the new API does not exist.
- [x] Implement the minimal immutable chunk/root model. Each chunk contains one domain, at most 64 records and at most 256 KiB encoded; root references stable chunk keys and hashes. Hash canonical JSON bytes using `crypto.subtle.digest`.
- [x] Run the audit and confirm all cases pass.

### Task 2: Stage and verify archive chunks without changing live saves

**Files:**
- Create: `services/careerArchiveStore.ts`
- Modify: `services/storage.ts`
- Test: `scripts/audit-career-archive-stage.ts`

**Interfaces:**
- Consumes Task 1's root/chunks.
- Produces `stageCareerArchiveChunks(slotKey, chunks)` and `verifyCareerArchiveRoot(root)`, backed by reserved IndexedDB keys. Staging writes immutable records; collision with a different digest rejects.

- [x] Write a failing audit with an injectable key-value store for valid stage, duplicate idempotent stage, digest collision, missing chunk, and interrupted stage.
- [x] Run it and confirm the intended failures.
- [x] Implement stage/read verification one chunk at a time; never delete a current or previous generation on failure.
- [x] Re-run the focused audit and existing `audit:save-integrity`.

### Task 3: Pair archive root with verified save generation

**Files:**
- Modify: `services/saveGenerations.ts`
- Modify: `services/storage.ts`
- Test: `scripts/audit-career-archive-generation.ts`

**Interfaces:**
- `saveVerifiedGameData` accepts an optional verified archive root; legacy callers omit it.
- `loadVerifiedGameData` returns the matching current or previous root, or rejects a damaged pair.
- `promoteGeneration` and `recoverGeneration` move hot/integrity/archive-root records in one IndexedDB transaction.

- [x] Write failing mock-store tests for successful promotion, failure before promotion, missing root chunk, previous recovery, and unchanged v1 load.
- [x] Run red, then add the root companion and verify the exact candidate before promotion.
- [x] Verify both save and root roll back together on a real IndexedDB transaction abort in isolated Chromium, including an abort after writes are queued (`scripts/audit-career-archive-indexeddb-browser.ts`). WebKit/device validation remains a release gate.

### Task 4: Safe migration foundation and diagnostics

**Files:**
- Create: `services/careerArchiveMigration.ts`
- Modify: `App.tsx` only at the save-preparation boundary and selected-slot load boundary.
- Test: `scripts/audit-career-archive-migration.ts`

**Interfaces:**
- `prepareArchiveMigration(player, existingRoot)` returns an unchanged `Player` and an empty or extended root until a domain is certified. This task must not move any history field.

- [ ] Write failing tests proving old saves open, repeated migration is idempotent, a failed stage leaves the old player loadable, and no Player array is shortened.
- [ ] Run red, implement an opt-in migration marker with zero active domains, and run green.
- [ ] Run save migration, save integrity, nine-year soak, and production build. Record that archive-backed saves remain disabled until transfer and domain plans pass.

## Subsequent independently testable plans

`2026-09-25-atomic-career-archive-transfer.md` must add archive records to Android V2 and a bounded iOS file export/import path before activation. `2026-09-25-atomic-career-archive-domains.md` must certify, adapt, and migrate terminal world history and player-facing filmography/X/Instagram/YouTube domains one by one. No domain activation is permitted from this storage plan alone.

As of 2026-09-25, archive-backed transfers deliberately fail closed. The existing signed transfer is not archive-aware and is not counted as a completed backup gate.
