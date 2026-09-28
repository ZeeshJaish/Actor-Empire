# Atomic career-history archive and bounded hot state — design

Date: 2026-09-25  
Status: Approved by user; storage foundation implemented but history migration and transfer activation remain gated  
Scope: Actor Empire local saves, offline history screens, signed device transfer, iOS/Android long-session memory

## Player contract

A 20-year career must retain every historical record still present when this feature is enabled and every new record created thereafter. Archiving means moving detail out of the weekly simulation object, not deleting it. Filmography, IMDb-style credits, player projects, social posts, awards, and other affected history remain accessible offline through the same screens, with pagination or on-demand detail loading where necessary. Export/import carries the complete archive and its index. Gameplay, ownership, money, rights, and week results must not change.

Older saves may already lack details because `compactPlayerForPersistence` caps or truncates some histories, including X/Instagram posts, YouTube videos, project weekly points, terminal AI records, and world projects. Migration preserves all data still present; it cannot reconstruct details previously removed by an older save. A migration report must state this limit rather than implying recovery.

## Current evidence and constraints

- `Player` and `world` are passed directly to many weekly systems and screens. `pastProjects`, `world.projects`, and `world.industryProductions` have active references. No collection is archival merely because a record is old.
- `ActorEmpireDB/saves` currently stores a public `Player` plus candidate, previous, integrity, and quarantine records. Candidate read-back precedes atomic promotion. These protections stay in place.
- The Android V2 transfer supports bounded native chunks. The current non-Android transfer builds and stringifies a whole signed archive; merely adding archive data to that payload would recreate a large-memory path on iOS.
- The earlier in-`Player` archive experiment increased the nine-year save to roughly 47.7 MB. Archive detail must be stored separately from the hot player, not nested into `Player.flags` or `world`.

## Chosen approach and alternatives

Use a selective, versioned sidecar archive in IndexedDB. Keep current simulation state and compact, verified summaries in the hot `Player`. Move a domain only after its read/write references have been enumerated and tests prove its terminal records no longer affect weekly calculations. The archive is a local database collection with stable IDs and a query adapter; screens load pages/details when opened.

Do not move the entire `Player` in one change: direct screen access and late mutations (for example, award updates to completed projects) make that unsafe. Do not only compress the existing full save: compression reduces disk bytes but not the in-memory weekly clone, render state, or IndexedDB clone peak.

## Data model and eligibility

- The hot save has a schema/version marker and an archive-root reference. It contains active projects, mutable obligations, ownership, contracts, finance, progression, and the minimum historical summaries required by weekly systems.
- Immutable archive chunks are keyed by slot, domain, and stable chunk ID under reserved `saves` keys. A small archive index maps stable record IDs and periods to chunk references and cryptographic digests. Bounded chunks avoid one ever-growing archive object.
- A record is eligible only when it is terminal, its ID and all incoming references are known, no weekly rule needs its full detail, and any future mutation either stays in hot state or writes a new archive revision. Ambiguous records remain hot.
- Player `pastProjects`, credits, awards, and social posts are not removed from hot state until every consuming screen and relevant game rule uses the archive-aware adapter. The adapter must preserve ordering, search, filters, counts, and detail view behavior.
- Existing compaction caps for a migrated domain may be removed only after its archive path and transfer path pass lossless round-trip tests. Do not remove all caps blindly, since active/derived state can still grow without bound.

## Atomic save and recovery

1. Build the hot candidate and an archive delta without embedding archive detail into the hot player. Preserve the existing protected-state comparison and add archive record-count, ID-set, and digest invariants.
2. Stage new immutable chunks under keys unreachable from the current archive root. Verify each staged chunk and the candidate hot save by read-back. A failed stage leaves the current generation authoritative; orphaned staged chunks can be cleaned later.
3. In one IndexedDB transaction, promote the candidate hot save, its integrity manifest, and the new archive-root pointer together. The previous hot generation and its archive root remain recoverable. This pointer promotion, rather than a multi-megabyte copy, is the atomic visibility boundary.
4. Loading verifies the hot manifest and archive index, then checks referenced chunks one at a time without hydrating the entire archive. Completeness verification may run during the guarded loading state, with real progress for long careers. Missing or corrupt archive data must not silently produce an empty history. Offer the previous complete hot-plus-archive generation or the existing recovery flow.
5. Garbage collection may delete a chunk only after a reachability pass proves that neither current, previous, quarantine, staged import, nor an active export references it. Quota failure never triggers deletion of the last complete generation.

## Migration and compatibility

Legacy saves remain readable. On first migration, retain the original verified generation while staging archive chunks. If interrupted, the old save opens unchanged; if quota is insufficient, abort migration and continue using the old format with a clear backup recommendation. No partial hot state is promoted.

Migration is idempotent by stable IDs and archive schema version. A downgraded older app is not promised write compatibility with an archive-backed save; a newer app must never silently import or overwrite a format it cannot understand. Exact migration categories are released one by one behind format/feature gates.

## Backup and transfer gate

The signed transfer format must carry hot save, archive index, every referenced archive chunk, and media. Export verifies completeness before announcing success. Import stages and verifies the entire set before promoting any slot; a missing archive chunk rejects the import without replacing an existing career. Android keeps its bounded V2 transport. iOS must gain an archive-aware bounded file path before archive-backed saves are enabled there; appending all chunks to the current whole-string JSON path is not acceptable. Older transfers remain importable through migration. Older apps that cannot understand the new format must fail clearly rather than silently drop history.

## Rollout slices

1. Baseline: inventory each history domain, references, size, existing compaction loss, and old-save behavior; write failing parity and crash-point tests.
2. Storage foundation: sidecar chunks, index, integrity, candidate/previous pairing, migration rollback, and archive query API. No domain moves yet.
3. Transfer foundation: archive-aware signed export/import, Android V2 compatibility, and bounded iOS transport. Keep activation off until both platforms pass.
4. Domain migrations: first terminal, unreferenced world records; then player filmography/social history after screen adapters and mutation rules pass. Each domain has its own parity gate and can be disabled without affecting others.
5. Activation: nine-year and 20-year saves, repeated save/reopen, award-season updates, offline history browsing, crash/quota/corruption tests, Android/iOS transfer, and physical-device memory sessions. Compare gameplay determinism and measured hot-state/peak-memory improvement against baseline.

## Acceptance gates

- For each enabled domain, no record present at migration disappears from history UI or signed backup; post-migration records remain available after save/reopen and device transfer. The overall history-preservation goal is not complete until all named player-history domains (filmography, X/Instagram, YouTube, and their associated detail) pass this gate.
- A crash at every staging and promotion boundary opens either the old complete generation or the new complete generation, never a mixed pair.
- Current and previous generations each have complete archive references; corrupt or missing chunks trigger recovery, not an apparently empty filmography.
- Weekly gameplay outputs and protected finance/rights/ownership identities match baseline for deterministic fixtures.
- 468-week and mature 20-year simulations show bounded hot-state growth and lower peak memory; exact budgets are set from measured baseline before activation.
- Offline history screens remain responsive through pagination and have no visual/content downgrade on healthy devices.
- No iOS/Android activation without a backup round trip and physical-device validation; a desktop build alone is insufficient.

## Explicit non-goals

No cloud service, history deletion, social-post rewriting, gameplay balance change, or forced visual downgrade. Do not promise recovery of data already discarded by older saves.
