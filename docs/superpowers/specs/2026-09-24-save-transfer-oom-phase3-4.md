# Save Transfer OOM — Phase 3 and Phase 4 Contract

## Objective

Remove whole-archive payloads from the Android Capacitor bridge in both directions while preserving V1 compatibility and the existing verified-save promotion boundary.

## Phase 3 — streamed Android export

- Android V2 export uses an exclusive native session.
- JavaScript serializes save JSON incrementally and reads media Blob slices without building an archive-wide string or base64 media array.
- Raw chunks are limited to 128 KiB; their base64 representation remains below 256 KiB with room for the Capacitor envelope.
- Native code writes each record to a temporary file, updates SHA-256 incrementally, and returns the measured length and digest.
- JavaScript builds and signs the manifest from those native measurements, then streams the manifest to native code.
- Native code validates manifest descriptors against the spooled records, assembles the framed archive on a background executor, syncs it, atomically renames it, and shares only a FileProvider `content://` URI.
- Cancellation, plugin destruction, malformed input, and stale sessions remove working files. Export never modifies an active career.

## Phase 4 — streamed and staged Android import

- Android opens the selected `content://` URI and detects V1 or V2 without loading the complete file.
- V2 manifest and records cross the bridge in bounded chunks.
- Native framing enforces manifest, header, record-count, individual-record, and total-byte limits and calculates the actual SHA-256 for every record.
- JavaScript verifies the signed manifest, matches every record header and native digest to it, and rejects missing, duplicate, truncated, trailing, or corrupted data.
- Saves are migrated, compacted, integrity-manifested, written as candidates, and read back one slot at a time.
- Media is staged one record at a time under isolated import IDs so an interrupted import cannot overwrite media used by an existing career.
- After every signed record passes, staged media is promoted and the complete save-slot batch is atomically promoted through the existing generation system.
- Any pre-promotion failure discards candidates. If final save promotion fails after media promotion, isolated imported media is removed and active careers remain unchanged.
- V1 archives remain importable through a bounded native reader and retain the Phase 1 adaptive size guard.

## Limits

- Bridge raw chunk: 128 KiB.
- Manifest: 512 KiB.
- Records: 643 total, including at most 3 saves, 128 local-storage values, and 512 media items.
- Record limits: 128 MiB save, 4 MiB local-storage value, 32 MiB media.
- Total record bytes: 512 MiB.

## Activation

V2 export and V2 import are active by default only inside the native Android build with `AndroidSaveTransfer` available. Browser and non-Android behavior retains the existing signed V1 path. No rendering, visual-quality, gameplay, or `largeHeap` setting is changed.
