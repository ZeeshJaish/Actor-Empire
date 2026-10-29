# Subtle Built-in Names and Legacy Pack Preservation

> Execution: inline in the current shared checkout, following the approved chat design. Tests precede behavior changes. Publication follows the subsequent explicit commit/push request, selecting only this feature.

**Goal:** Present subtle, consistent aliases for built-in people, creators and curated projects while preserving identities, saves, custom content and already-installed country additions. Remove new country-pack installation UI.

**Architecture:** Pure canonical↔display registries keep original keys available for IDs, localization and released-title comparisons. Factory projections happen after identity/stat/portrait generation. A versioned, selective saved-display transition handles known built-in references and skips pack/custom identities. Legacy pack catalogs and hydration remain readable.

**Constraints:** Tommy Holland/Tom Cruiser style; existing music aliases retained; financial amounts, signed terms, actor/asset/project IDs, relationships and ownership preserved; pack-only records remain as issued; no external-mod downloader or extra UI; preserve unrelated dirty files.

## Task 1 — Identity regression and alias registry
- [x] Capture issued deterministic NPC/creator identities and non-cosmetic hashes plus an installed India pack fixture.
- [x] Verify the initial audit fails because Tom Holland has not received Tommy Holland.
- [x] Add reviewed person, creator, title and franchise alias pairs with reversible canonical keys and uniqueness/idempotence checks.
- [x] Project factory outputs after original ID/stat/portrait generation; keep pack-only factory output unchanged.
- [x] Verify immutable hashes, owner IDs and installed pack equality.

## Task 2 — Curated projects and franchise continuity
- [x] Keep canonical description keys and released/reserved comparisons stable while projecting famous titles/directors.
- [x] Apply the same alias family to universe names, roadmap titles and character display text; normalize old/new selection values.
- [x] Assert old released films remain excluded and signed roadmap identities/terms remain equivalent.

## Task 3 — Existing-save display transition
- [x] Add a selective, idempotent transition over known NPC profiles, linked relationships, cast snapshots and recognized built-in project displays.
- [x] Skip installed pack identities and player/imported custom names/titles. Keep signed economic payloads/receipts intact.
- [x] Test migration → Next Week → save/reload and successor preservation with and without installed country additions.

## Task 4 — Retire installation controls
- [x] Remove country-pack entry, picker and enable handler from Settings; keep save import/export and existing pack hydration/inheritance.
- [x] Verify fresh users cannot install the retired packs and existing installed content remains accessible.

## Task 5 — Review and validation
- [x] Audit all built-in runtime catalogs and hard-coded award/project display fallbacks for remaining targeted real names.
- [x] Run identity, title continuity, financial/save, pack/succession and rendering checks; capture representative mobile results.
- [x] Run source typecheck and memory-guarded production build sequentially; report measured coverage and any limits.

## Evidence
- `npm run audit:fictional-names` passed (final run: 71 actual roster/production/sequel weeks, 25 verified save/reloads).
- Separate legacy routes: two 6-week cases, 9 verified writes each; old verified-generation recovery, failed promotion and heir continuation passed.
- All 21 installed actor/director catalogs and optional-creator catalogs match issued hashes.
- 320px/390px rendered Social and Gameplay screens passed; no page errors or horizontal overflow.
- 57 unrelated previously dirty tracked files match their initial hashes.
- Full source typecheck (including the final tests) and guarded production build passed.
- Ongoing old-display theatrical release versus migrated release: identical payouts/fame for four weeks and four additional verified reloads.

- Publication candidate independently passed all audits (70 game weeks / 26 verified save-reloads), full typecheck and guarded build against published `c52896a`, with unrelated work excluded.
