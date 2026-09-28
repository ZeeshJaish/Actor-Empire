# Save Transfer OOM — Phase 1 and Phase 2 Report

## Implemented

- Added pre-base64 save, local-storage, and media footprint measurement.
- Added adaptive legacy Android bridge protection using memory class, available memory, low-memory state, and an absolute ceiling.
- Added a final serialized-size check before `AndroidSaveTransfer.shareExport`.
- Added privacy-bounded `save_transfer_safety` telemetry.
- Added an exclusive save-transfer lease and integrated it with Process Week, autosave, and native memory checkpoints.
- Added a friendly non-destructive block for transfers too large for the legacy bridge.
- Added the signed Save Transfer v2 manifest and framed-record contract with per-record SHA-256, aggregate integrity, raw binary media encoding, explicit limits, and v1 compatibility metadata.
- Preserved verified candidate staging, batch promotion, previous-generation recovery, and existing v1 imports.

## Interim behavior

Small legacy Android transfers may continue when the measured device budget permits them. Unsafe transfers are blocked before media base64 encoding or the Capacitor bridge call. The player's careers are not changed by that block.

V2 is not sent through the legacy bridge. Its default Android activation belongs to Phase 3, when the native plugin can write bounded chunks. V2 import activation belongs to Phase 4. This avoids recreating the same OOM under a new format version.

## Verification

- Phase 1–2 OOM audit: passed.
- Known SHA-256 vector: passed.
- Privacy-bounded telemetry key contract: passed.
- Payload and low-memory blocking: passed.
- Exclusive transfer lease and stale-lease rejection: passed.
- Media inventory callback before base64 conversion: passed.
- V2 manifest signature, tamper rejection, duplicate rejection, framing, and v1 detection: passed.
- Existing save-transfer audit: passed.
- Native memory checkpoint audit: passed.
- Week-processing save-safety and scheduler audits: passed.
- TypeScript `--noEmit`: passed with the repository's 8 GB compiler heap.
- Production Vite build: passed.

## Next gate

Phase 3 must implement `beginExport`, bounded `appendChunk`, atomic native finalization, temporary-file cleanup, and FileProvider sharing. Until that is complete, large transfers will fail safely instead of risking an Android process crash.
