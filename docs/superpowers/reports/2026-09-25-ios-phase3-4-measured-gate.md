# iOS long-session Phase 3/4 measured gate

Date: 2026-09-25

## Scope and status

The original eight-phase roadmap is unchanged. Phase 3 (bounded hot state plus offline history archive) and Phase 4 (remove the broad weekly clone) are **not complete**. Archive storage and signed transfer are being prepared, but no history domain has been moved from `Player` and `processGameWeek` still begins with `createWeekPlayerTransaction`, whose draft clones most of the player.

This report records the baseline and the gate before domain migration. Do not infer iOS crash-rate improvement from desktop simulation.

## Fresh nine-year baseline

`npm run audit:ios-long-session-soak` completed 468/468 weeks on the Node fixture. The pre-sharing baseline run reported 25,927,386 estimated runtime JSON bytes, 25,939,233 persisted bytes, 307.89 ms p95 week time, and 532.4 MiB peak sampled Node heap. Node heap is not an iPhone memory measurement; the fixture has shown some output variation even between identical-code runs.

Largest `world` domains at year nine (estimated JSON bytes):

| Domain | Bytes | Classification |
| --- | ---: | --- |
| `industryProductions` | 4,094,051 | Mixed active and terminal; 3,686,645 bytes are `RELEASED`/`CANCELLED` records in this fixture |
| `studios` | 3,686,366 | Active AI studio state; not archival merely because old |
| `platforms` | 3,574,321 | Active platform state; not archival merely because old |
| `streamingPlatformEcosystem` | 2,935,763 | Active simulation state until proven otherwise |
| `worldStreamingCustomers` | 2,737,969 | Active weekly model |
| `worldAudienceParticipation` | 1,460,566 | Active weekly model |
| `worldAudienceEconomy` | 1,282,320 | Active weekly model |
| `industryMedia` | 1,224,415 | Mixed current/historical; requires eligibility audit |
| `worldStreamingViewing` | 759,355 | Active weekly model |
| `talentBookings` | 581,859 | Mixed current/historical; requires eligibility audit |

The fixture has no player `pastProjects`, X/Instagram posts, or YouTube videos. Migrating those first would preserve future history but would not reduce this measured baseline. The `industryProductions` domain has 778 `RELEASED` and 2 `CANCELLED` entries, alongside active/awaiting entries. Terminal status alone is insufficient for removal: historical-catalogue, rights, social, release, and AI-memory readers still reference productions by ID.

The current code has 76 TypeScript/TSX files mentioning `industryProductions` and 141 mentioning `pastProjects`. Those are reference-inventory counts, not proof that every read needs full detail. A studio writer audit found one in-place map mutation in `syncNpcVenturesToStudios`; it now returns an owned studio map without changing its input. The weekly clone structurally shares canonical `world.studios` until that ownership boundary. Non-canonical studio objects still take the JSON-clone fallback.

## Transfer safety work in this continuation

- Added a Foundation-only bounded iOS export/import session and a Capacitor bridge registered as `IOSSaveTransfer`.
- Routed the existing signed V2 TypeScript transfer through Android or iOS native ports; V1 remains supported through bounded native import.
- Corrected iOS V2 record headers to contain the complete signed descriptor, matching Android and the shared importer.
- Added a Swift round-trip/cancellation/malformed-manifest/legacy-V1 audit and a native-port selection audit.
- Built a separately signed `com.zeeshapps.actorempire.qa.archive` app on a connected iPhone 16. The installed `com.zeeshapps.actorempire` app and its data container were not modified. The QA app launched to Start Career. A complete export/import/reopen round trip is not yet verified.
- Automated regression testing found and fixed an iOS export cleanup edge case: cancelling a failed session no longer deletes a pre-existing destination file. The Swift audit now covers this ownership invariant.
- Archive-backed autosaves now carry forward the existing verified archive root only when the player marker, stored root, and current manifest match. A missing marker or corrupt root still blocks the save; the previous career remains authoritative. The new red/green generation audit and isolated Chromium IndexedDB audit cover normal autosave, corrupt candidate abort, and a forced abort after promotion writes are queued.

## Automated verification and its boundary

- `npm run audit:ios-save-transfer-session`, `npm run audit:career-archive-transfer`, `npm run audit:save-transfer`, and `npm run typecheck:career-archive` pass.
- `npm run audit:career-archive-foundation`, `npm run audit:save-integrity`, `npm run audit:week-processing-save-safety`, and `npm run audit:ios-week-transaction-phase4` pass after the autosave-root change. `scripts/audit-career-archive-indexeddb-browser.ts` passed in isolated headless Chromium with `{ "ok": true }`.
- Studio/NPC-venture determinism, studio migration, and clone-compatibility audits pass after sharing `world.studios`; a focused streaming-ecosystem turn test shows equal output from deep-cloned and shared inputs and no source mutation. The newest 468-week Node soak completed all weeks with ~25.75 MB runtime JSON and 368.93 ms p95. At year nine, the initial weekly clone now shares roughly 3.69 MB of studio JSON and 2.94 MB of streaming-ecosystem JSON before those domains take ownership. This is a targeted allocation reduction, **not** a demonstrated iPhone peak-memory or crash-rate reduction. Sampled Node heap and gameplay counts differed between runs; two identical-code 52-week runs also differed by 517 runtime bytes, so the soak is not exact-output parity evidence.
- After the streaming-ecosystem sharing change, a fresh run also passed `audit:career-archive-foundation`, `audit:career-archive-transfer`, `audit:save-integrity`, `audit:week-processing-save-safety`, `audit:ios-week-transaction-phase4`, `audit:game-loop-clone-c8`, `audit:npc-venture-determinism`, `audit:studio-ai-venture-migration-b1`, `typecheck:career-archive`, `npm run build`, and `git diff --check`.
- A fresh unsigned Debug iOS build with the registered `IOSSaveTransfer` plugin succeeds. This verifies compilation and linkage, not a document-picker or share-sheet interaction.
- The player requested code-driven testing rather than manual taps. No automated iOS UI-test target currently exists, so the native share sheet, Files picker, full app import/reopen, and memory-pressure session have **not** been exercised end to end. The separate QA app remains isolated from the original installed game.

## Required gate before activating Phase 3 or claiming Phase 4

1. Complete QA-app signed V2 export/import/reopen on iPhone and Android, including a missing/corrupt chunk and interrupted import. The old save must remain authoritative after every failure.
2. Audit every incoming reference and late mutation for a candidate terminal domain; provide hot summaries for weekly rules and offline archive adapters for every affected history screen. Measure record IDs and content parity across migrate/save/reopen/transfer.
3. Only then enable that domain's migration behind a format gate. Keep all other domains hot until separately certified.
4. Replace the remaining broad weekly clone with verified domain-level ownership/transactions. Run deterministic before/after weekly-result parity, rollback/failure tests, and measured peak-memory comparison on mature fixtures.
5. Run 468- and 1,000-week fixtures plus 30/60/120-minute physical iPhone sessions before calling the long-session crash fix release-ready.

No history truncation cap may be removed solely because the archive foundation exists. Already-discarded history in older saves cannot be reconstructed.
