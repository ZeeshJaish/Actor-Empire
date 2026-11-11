# Large-save storage and final verification implementation plan

> Execute inline, one low-memory worker. The user approved the remaining storage, autosave investigation and combined-app verification work. Preserve the existing checkout and other chats' changes.

**Goal:** Reduce verified large-save latency while preserving complete careers, independent verification, atomic generations, import/export and existing saves.

**Final decision:** Production uses the exact-algorithm hash optimization, bounded optional mirror and requested-generation binding. The immutable-block design below was implemented and measured as an opt-in experiment; it is disabled in the app because it did not show a worthwhile benefit. Browser verification is complete in separate memory-bounded phases. Under-three-second weekly turns, continuous long-session testing and physical iPhone certification remain outstanding.

**Measured inputs:** The retained fixture has about 66 MB of JSON: 63 MB world data, 2 MB past projects, 0.7 MB flags. Archive-only extraction cannot address most of this save. Existing promotion clones current/candidate again and writes full previous/current players.

**Experimental architecture, disabled in production:** Store large player sections in immutable Blob blocks, with a versioned envelope and content checksums. Split world/flags at field boundaries. Small values remain inline. Identical block bytes can reuse the current envelope's immutable Blob references; the browser owns their lifetime, so no manual archive garbage collection can delete live data. Materialize the complete Player before gameplay, verification or export. Preserve undefined, sparse slots, special numbers and Date values; unsupported shapes keep the existing structured-clone representation. Existing monolithic generations remain readable. No save-integrity digest projection changes.

**Transaction rule:** Blob reads are asynchronous. Keep an explicit IndexedDB request pending while decoding within promotion, and run final writes from an active request callback. Reverify actual stored candidate/current within the same transaction before switching roots. Never promote based only on an earlier digest or cached mutable object. Quota, abort, corruption and timeout must leave current/previous intact.

**Source references:** [IndexedDB transaction lifecycle](https://w3c.github.io/IndexedDB/#transaction-lifecycle), [immutable Blob data](https://w3c.github.io/FileAPI/#blob-section).

## Task 1 — codec and physical store

- [x] Add real-browser regressions against public storage and the experimental opt-in. The original physical-layout requirement is superseded by the measured decision below: production must retain the existing layout.
- [x] Implement experimental `services/savePayloadBlocks.ts`: versioned encoding, exact value hydration, root/block checksums, invocation-local reuse, corruption rejection, legacy passthrough. Keep disabled in production.
- [x] Implement `services/indexedDbSaveGenerations.ts`: bounded transaction lifetime, materialized logical reads, optional immutable physical writes, independent live promotion/recovery/batch verification.
- [x] Route `services/storage.ts` through that adapter, including legacy public load/export. Keep database version and public slot keys unchanged.
- [x] Verify save/generation/migration/transfer compatibility and browser corruption, quota, interruption, atomicity, recovery, export and deletion cases. Production system WebKit passed 17 cases; experimental Chromium passed 19 cases. No physical iPhone certification.

## Task 2 — autosave attribution

- [x] Attribute the observed intervening AUTOSAVE to a concrete input/state change using actual app traces.
- [x] Preserve legitimate decision/playtime/purchase saves. No redundant or stale-write defect was demonstrated for the intervening event save; scheduling remains unchanged.

## Task 3 — application, performance and durability

- [x] Freeze same-source baseline/current comparisons for storage. Compare complete hydrated player output and manifests, not selected money values.
- [x] Run existing save/integrity/migration/transfer/archive/payment suites sequentially, then full types and production build with the established shared-load memory guard.
- [x] Verify normal Start/slot/gameplay/report/next-week/reload path on the combined build with the retained large career. Verify storage failure and backup recovery in a fresh process on the same interrupted large profile. Record actual latency and peak sampled RSS; under three seconds remains unmet and combined long-session runs hit the guard.
- [x] Check available native devices without booting a heavy simulator. iPhone 16 is unavailable; physical-device verification remains outstanding. Desktop WebKit is supplemental.
- [x] Preserve all initially dirty/untracked files; record source/build hashes and concurrent changes. No commit/push or unrelated worker termination.

**Acceptance:** Exact logical data survives migration/reload/import/recovery; malformed records never silently become new careers; failed writes do not advance weeks or pay twice; storage change must show repeatable benefit before it remains enabled. No history deletion, earning cap or numerical balance change.

## Measured architecture decision

The immutable-block prototype passed correctness/failure tests but did not establish a steady-state latency benefit: original writes about 2.02–2.05 s; initial blocks 3.19–3.29 s; native JSON/batch improvements about 2.01–2.03 s, with slower initial migration/read. Therefore `blockPayloads` remains opt-in and production preserves the existing physical layout. No user migration is activated. The profiler instead identified signature-string hashing as the dominant CPU work. An exact-algorithm native JSON quoting path (with issued UTF-16 fallback) and invocation-local caches improved the controlled production write to 1.17–1.34 s and reload to 0.26–0.30 s, with identical complete payload SHA-256 and original manifests. Independent live candidate/current verification remains in place.

Additional safety issue: fault injection showed a different valid candidate could be accepted during live promotion. Requested candidate digests are now bound at single/batch promotion, and batch read-back also checks the requested digest. Regression failed before and passes after.

Full root types passed after keeping generated bundles outside TypeScript source extensions. Two concurrent naming-map type errors were repaired with annotations only; normalized compiled JS is identical before/after. All 22 regression suites passed. macOS system WebKit passed 17 production storage/signature/failure/recovery checks. The listed iPhone 16 is unavailable; no simulator booted. Final built-app journey and source/artifact preservation closeout are recorded below.

## Closeout

Production keeps the old physical format. The opt-in block prototype passed its final 19-case matrix and is not enabled. The selected hash path and bounded optional mirror are enabled; neither changes protected-state projections or money formulas. Optional mirror measured 97–118 ms before versus 6–9 ms after at the actual 600,000-character budget, with the same metadata-only output. Targeted mirror audits passed.

22 core regression suites, 1,022 issued hash vectors, full root types, production Vite build and 17 macOS system-WebKit scenarios passed. Actual app five-week journey before the final mirror change passed all faults/recovery. Final build three-week/restart checks passed at 3.972/5.617/3.878 seconds. Combined fault phases hit the unchanged memory guard; the same large interrupted QA profile was resumed in a fresh process and quota/corrupt-current/verified-backup UI tests passed at 1,272 MiB sampled RSS. No test fixture was substituted with a small career for that final recovery proof.

Autosave traced to a life-event Continue action and retained. No native iPhone verification: device unavailable; no simulator boot. Under-three-second total remains unmet. No earning cap, dropped history, reduced signature verification, commit/push or unrelated job termination. All initial files remain. Remaining limits and concurrent-source drift are explicit in the report.
