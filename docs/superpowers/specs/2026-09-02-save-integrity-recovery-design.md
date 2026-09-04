# A8S Save Integrity and Recovery Design

**Status:** Implemented and verified  
**Date:** 2026-09-02  
**Scope:** Actor Empire React runtime, browser IndexedDB, and Capacitor Android/iOS WebViews

## Purpose

A long-running career must not be replaced by a partial, corrupt, or incorrectly compacted save. Save-size reduction is allowed only for explicitly disposable history or externally stored media. Player-owned projects, businesses, finances, active rights, active productions, progression, and major achievements must remain intact.

This phase strengthens the existing save system. It does not move Actor Empire to SQLite, add cloud saves, or change gameplay simulation.

## Existing foundation retained

- `ActorEmpireDB` / `saves` remains the authoritative store.
- Existing public slot keys (`actorEmpireSave_1` through `actorEmpireSave_3`) remain readable by older code.
- `migratePlayerSave` remains the sole schema migration entry point.
- `compactPlayerForPersistence` remains the sole persistence compaction entry point.
- Custom poster bytes remain externalized into `ActorEmpireMediaDB`.
- Local storage remains only a summary and small-save compatibility mirror.
- Signed `.aesave` export/import remains the manual device-transfer format.

## Chosen architecture

### 1. Candidate-first writes

Each slot receives internal companion records:

- `<slot>__candidate`: the newly prepared player plus its integrity manifest.
- `<slot>__previous`: the last successfully verified current player plus its manifest.
- `<slot>__integrity`: the manifest for the public current player record.
- `<slot>__quarantine`: a damaged current generation retained when recovery is promoted.

A save operation follows:

1. Prepare the candidate with the existing migration/compaction rules appropriate to the calling flow.
2. Validate the candidate against a pre-compaction canonical manifest.
3. Write the candidate record without touching the current record.
4. Read the candidate back from IndexedDB.
5. Recompute and verify its manifest.
6. In one IndexedDB read-write transaction, rotate the verified current generation to `previous`, promote the candidate to the public slot key, update the current integrity record, and remove the candidate.

An error before or during promotion leaves the existing current generation authoritative. A stale candidate is never loaded as a career and can be removed on the next successful operation.

### 2. Space-aware previous generation

Normal compacted saves retain one previous-good generation. A very large un-compacted legacy current save is not blindly duplicated. During its first migration:

- the old current record remains untouched while the compacted candidate is written and verified;
- promotion is attempted atomically;
- if retaining the oversized raw generation would exceed storage capacity, promotion retains the verified compacted current record and marks the slot as needing a recovery checkpoint;
- the next successful compacted save creates the normal previous-good generation;
- the UI advises the player to export a manual backup until that checkpoint exists.

Storage pressure must never cause an unverified candidate to replace the current save. The game requests persistent browser storage when supported, but never treats that request as a guarantee.

### 3. Integrity manifest

The manifest is small and deterministic. It records:

- format version and save-migration version;
- player ID, player name, age, and week;
- finite money and primary-stat checks;
- sorted identity digests and counts for commitments, active releases, past projects, businesses, awards, relationships, children, universes, active productions, active rights contracts, and owned-streaming catalogue licences;
- owned-streaming platform identity and lifecycle when present;
- candidate creation time and reason (`AUTOSAVE`, `PROCESS_WEEK`, `MIGRATION`, `IMPORT`, or `MANUAL`).

Validation is deliberately based on canonical identities rather than raw byte size. A 400 MB save may legitimately become 60 MB after poster externalization and disposable-history trimming, but it must not lose protected identities or alter canonical balances during that preparation.

The manifest digest is for corruption and regression detection, not anti-cheat security.

### 4. Explicit compaction contract

Compaction data is divided into two categories:

**Protected canonical data**

- Player projects and their final outcomes.
- Current commitments and releases.
- Player businesses, balances, ownership, debt, and studio/platform state.
- Active contracts, rights, production obligations, and unresolved transactions.
- Awards and major legacy milestones covered by the retained canonical collections.
- Relationships, family state, player progression, inventory, and entitlements.

These identities and relevant financial totals must survive compaction.

**Bounded presentation/history data**

- Old feed posts, comments, routine news, logs, weekly chart points, resolved bidding sessions, expired unreferenced world contracts, and terminal AI simulation records.
- Embedded poster byte strings after successful media externalization.
- Reconstructable event callbacks and duplicated derived snapshots.

These collections may be bounded under the existing compaction rules. Their limits remain explicit and audited.

### 5. Load and recovery

Slot discovery continues to use lightweight summaries. Opening a slot performs:

1. Read current player and integrity record.
2. Validate structure and manifest.
3. If valid, migrate normally and open it.
4. If missing or invalid, validate `previous`.
5. If previous is valid, show a recovery prompt with the previous generation's age/week and a **Recover Safe Save** action.
6. Recovery copies the damaged current generation to `quarantine` and promotes a verified previous generation in one transaction.
7. If neither generation is valid, leave all records untouched, show a clear failure message, and direct the player to signed import.

The app must never silently create a new career over a damaged slot.

### 6. Transactional import

Signed import no longer clears the live database first. It follows:

1. Parse and verify the archive signature.
2. Migrate, compact, and integrity-check every imported slot in memory one at a time, yielding between slots.
3. Write imported candidates under staging keys.
4. Read and verify every staged slot.
5. In one transaction, preserve existing valid currents as previous generations and promote all staged slots.
6. Restore media and local preferences only after save promotion succeeds.

An interrupted or invalid import leaves existing careers loadable. Importing a slot intentionally replaces that slot only after verification.

### 7. Capacitor and Android boundary

The same IndexedDB implementation runs in the Capacitor WebView. A normal same-package signed update should use the same origin and storage, but uninstall, Clear Storage, device cleaners, WebView corruption, and some device-transfer paths remain outside IndexedDB's guarantee.

This phase therefore:

- keeps `android:allowBackup="true"` but does not describe it as guaranteed recovery;
- requests persistent web storage where available;
- keeps signed manual export prominent for long careers;
- records recovery telemetry without uploading save contents;
- does not add a native filesystem or SQLite dependency.

Cloud or native-file backups can be designed later without replacing this integrity layer.

## Player experience

Routine saving stays invisible. Additional UI appears only when needed:

- A one-time low-pressure notice recommends exporting a backup for an unusually large migrated career until a previous-good checkpoint exists.
- A recovery dialog appears only when the current generation fails validation and a previous-good generation is available.
- A save failure says the current career was left untouched.
- The existing save-transfer UI reports staging, verification, promotion, and completion accurately.

No new weekly management work is added.

## Failure handling

- Candidate write failure: retain current and report save failure.
- Candidate read-back mismatch: retain current, retain diagnostics, reject promotion.
- Promotion transaction failure: IndexedDB rolls the entire promotion back.
- Quota pressure: retain current; use the space-aware legacy rule only after a compacted candidate has passed read-back verification.
- Current corruption with valid previous: offer recovery.
- Both generations invalid: preserve both for support/export and do not start a replacement career.
- Import failure at any stage: retain all existing public slot records.

## Verification

Focused audits must prove:

- a candidate failure cannot modify current or previous;
- read-back verification occurs before promotion;
- promotion rotates current to previous atomically;
- a corrupt current exposes a valid previous recovery option;
- recovery does not destroy the damaged generation before success;
- migration/compaction preserves every protected identity and canonical financial total;
- intentionally bounded histories may shrink without triggering false corruption;
- staged import failure leaves every existing slot unchanged;
- first migration of an oversized legacy save never requires duplicating the raw generation;
- the 50 MB, 100 MB, and synthetic 400 MB shapes complete without constructing unnecessary extra JSON copies;
- existing migration, save-transfer, Process Week safety, mirror, late-game performance, build, and diff checks remain green.

Large fixture tests may use repeated representative records rather than commit hundreds of megabytes to the repository. The audit must measure the generated in-memory shape and record exact byte estimates.

## Completion criteria

A8S is complete when:

- every authoritative write is candidate-first and read-back verified;
- each normal slot can retain and recover one previous-good generation;
- compaction is guarded by protected-data invariants;
- imports are staged before any live slot is replaced;
- corrupted current records cannot silently create a new game;
- oversized legacy saves follow the space-aware migration path;
- focused audits and the production build pass;
- the roadmap records Project B as the next approval-gated phase.
