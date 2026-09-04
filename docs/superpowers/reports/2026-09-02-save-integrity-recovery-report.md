# A8S Save Integrity and Recovery Completion Report

**Date:** 2026-09-02  
**Scope:** Shared Actor Empire persistence hardening before Project B  
**Next approval-gated phase:** Project B B1 — Canonical Studio State, Control, and Migration

## Outcome

Actor Empire no longer replaces a live career with an unchecked save candidate. Autosaves, Process Week, migration, manual export preparation, and signed import now share one integrity boundary around the existing migration and compaction systems.

Every normal successful save keeps one verified previous generation. If the public current generation is missing or fails its manifest, slot selection offers the last safe age/week instead of silently opening a new career. Recovery quarantines the damaged current record and promotes the verified previous generation atomically.

## Player-visible behaviour

- Routine saving remains invisible and adds no weekly management work.
- A failed write says the new save was not applied and leaves the earlier career authoritative.
- A recoverable slot shows a focused **Save Recovery Available** dialog with the safe player name, age, and week.
- **Recover Safe Save** restores the previous verified generation; **Back to Save Slots** changes nothing.
- When neither generation verifies, the slot remains untouched and the game directs the player to signed backup import.
- An unusually large unverified legacy career receives a backup recommendation until its next verified previous-good checkpoint exists.

## Storage and integrity design

Public keys remain `actorEmpireSave_1` through `actorEmpireSave_3`. Internal candidate, integrity, previous, and quarantine records stay in the existing `ActorEmpireDB` store and are excluded from save-slot discovery and public export.

The manifest protects:

- player identity, age/week, money, nested stats, entitlements, assets, and custom items;
- commitments, releases, completed player projects, portfolio positions, active loans, and active studio talent;
- businesses plus balance, debt, and production-fund values;
- awards, relationships, children, and universes;
- active physical productions and streaming-rights contracts;
- owned-platform identity, treasury, and catalogue licences.

Routine feeds, logs, old News, chart samples, expired unreferenced records, and externalized poster bytes remain eligible for existing bounded compaction. Preparation rejects the save if that compaction changes protected identities or financial values.

## Transactional signed import

The old clear-first database replacement path is removed. A signed archive is verified, each slot is migrated and compacted, all candidates are staged and read back, and then all supplied public slots are promoted in one IndexedDB transaction. A failure before or during promotion leaves every existing public slot unchanged. Existing valid currents become previous generations. Optional poster-media restoration cannot misreport an already completed career import as a destructive failure.

## Large and legacy saves

The size estimator walks the object without constructing another full JSON string. The generated audit measured:

- 50 MB shape: 52,428,963 bytes;
- 100 MB shape: 104,857,913 bytes;
- 400 MB shape: 419,431,613 bytes.

For a clearly oversized unverified legacy save, the raw current is not duplicated into `previous` during its first verified compacted promotion. The promoted current is marked as needing a recovery checkpoint, and the next successful compacted save establishes the normal previous generation. No project, right, business, or canonical balance is intentionally removed to achieve this.

## Existing systems reused

- `migratePlayerSave` remains the schema migration authority.
- `compactPlayerForPersistence` remains the persistence compaction authority.
- `ActorEmpireDB` and the current public slot keys remain compatible.
- `ActorEmpireMediaDB` continues owning externalized custom-poster bytes.
- the lightweight startup summary and bounded localStorage mirror remain fallbacks, not authoritative saves.
- the existing signed `.aesave` format remains the device-transfer boundary.

## Verification evidence

Fresh passing checks:

- `audit:save-integrity`
- `audit:save-generations`
- `audit:large-save-integrity`
- `audit:save-recovery-ui`
- `audit:save-transfer`
- `audit:save-migration`
- `audit:week-processing-save-safety`
- `audit:save-mirror`
- `audit:large-save-startup`
- `audit:late-game-week-performance`
- `npm run build`

The final fresh age-82 20-week benchmark completed at 169.65 ms p95 for the composite Process Week path, with 13,415,475 persisted bytes and 6,021 rights contracts in the fixture.

Repository-wide `npm run lint` still exits non-zero only on previously documented older owned-streaming audit fixtures: missing `publicManifesto` or `networkPlacements`, obsolete acquisition enum fixtures, older rival fields, and the old rack-group timestamp. The fresh typecheck contains no A8S-owned diagnostic.

## Honest boundaries

- This does not provide cloud backup.
- Uninstall, Clear Storage, device cleaners, WebView-origin loss, and physical storage failure can still remove local IndexedDB.
- `navigator.storage.persist()` is requested when supported but is not treated as a guarantee.
- No Android/iOS physical-device destructive-storage test was performed in this phase.
- Signed manual export remains the only recovery path outside the device's local origin.

Project B B1 remains approval-gated; no Studio AI phase has begun.
