# Archive-Aware Signed Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export and restore every archive chunk with its hot save on Android and iOS without a whole-archive JavaScript or Capacitor-bridge payload.

**Architecture:** Extend the signed framed-record transfer with bounded ARCHIVE_ROOT and ARCHIVE_CHUNK records. An archive-backed slot is exported only after its root and chunks pass read-back verification. Import stages chunks and hot candidates in isolation, verifies completeness, then promotes the save and root together. Android reuses its native streaming file session; iOS receives an equivalent bounded native file session and share/picker UI.

**Tech Stack:** TypeScript, Web Crypto, IndexedDB, Android Java Capacitor plugin, iOS Swift Capacitor plugin, framed `.aesave` V2 protocol.

**Spec:** `docs/superpowers/specs/2026-09-25-atomic-career-history-archive-design.md`

## Global Constraints

- No archive-backed save may be exported as a hot-only backup.
- No import may overwrite a slot until every signed record, archive reference, and hot manifest verifies.
- No transfer operation may encode the whole archive as one JSON string or cross the native bridge in a single large payload.
- Keep legacy V1 and V2 unarchived transfers importable.
- Preserve all unrelated dirty changes; do not commit or stage without a separate user request.

---

### Task 1: Signed archive record contract

**Files:** Modify `services/saveTransferV2.ts`; create `services/careerArchiveTransfer.ts`; test `scripts/audit-career-archive-transfer-contract.ts`.

**Interfaces:** Extend `SaveTransferV2RecordKind` with `ARCHIVE_ROOT` and `ARCHIVE_CHUNK`; add `assertCompleteArchiveTransferManifest(manifest)` to reject a save marked with an archive root when the root/chunks are absent or duplicated. Use a canonical logical key of `actorEmpireSave_N__archiveRoot` for roots and `${slot}__archive_chunk__${digest}` for chunks.

- [x] Write a test constructing a signed manifest with one SAVE, one ARCHIVE_ROOT, and one ARCHIVE_CHUNK, then assert tampering or omitting either archive record fails verification.
- [x] Run the test red with `esbuild scripts/audit-career-archive-transfer-contract.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-career-archive-transfer-contract.mjs && node /tmp/audit-career-archive-transfer-contract.mjs`.
- [x] Add bounded descriptor validation for each archive kind, including slot ownership, digest-shaped chunk key, unique logical targets, byte ceilings, and no MEDIA metadata. Preserve existing V2 SAVEs and MEDIA behavior.
- [x] Run green plus `npm run audit:save-transfer-oom-phase3-4` and `npm run audit:save-transfer`.

### Task 2: Android archive export/import

**Files:** Modify `services/saveTransfer.ts`, `services/storage.ts`, and if limits require it `android/app/src/main/java/com/zeeshapps/actorempire/SaveTransferStreamSession.java`; test `scripts/audit-career-archive-android-transfer.ts`.

**Interfaces:** `listVerifiedArchiveExportRecords(slot)` reads the current verified generation and produces one root plus each referenced chunk, individually verified. `stageImportedArchiveRecords(records)` writes isolated chunks and root candidates; the existing batch promotion receives each slot's `archiveRoot`.

- [ ] Write a failing in-memory transfer test: two archived slots, one unarchived slot, complete round trip, missing last chunk, duplicate chunk, and interrupted import. Assert old destinations remain unchanged on every failure.
- [x] Run red, then add ARCHIVE_ROOT/CHUNK sources to `exportStreamedAndroidV2Archive` and stage ARCHIVE records before save batch promotion.
- [x] Do not use `prepareSaveTransferImportEntries`' current archive rejection on a verified archive-aware path; keep that rejection for V1 and hot-only paths.
- [ ] Run green plus native Java transfer tests and check transfer memory limits against a 20-year fixture.

### Task 3: Bounded iOS transport

**Files:** Create `ios/App/CapApp-SPM/Sources/CapApp-SPM/IOSSaveTransferPlugin.swift`; modify `ios/App/App/ViewController.swift`; create a platform-neutral session wrapper in `services/saveTransfer.ts`; test Swift file-framing and bounded-chunk sessions under `scripts/`.

**Interfaces:** The Swift plugin exposes the same `beginExport`, `beginExportRecord`, `appendExportChunk`, `finishExportRecord`, `beginExportManifest`, `appendExportManifestChunk`, `finalizeExport`, `shareStreamedExport`, `cancelExport`, `beginImport`, `prepareImportManifest`, `readImportRecordChunk`, `finishImportRecord`, `finishImport`, and `cancelImport` semantics as Android, capped at 128 KiB raw per bridge call. Files are streamed to a temporary URL and shared with `UIActivityViewController`; import uses `UIDocumentPickerViewController` and streams from security-scoped URL.

- [ ] Extend the passing Swift framing test to cover the 128 KiB chunk ceiling, corrupt digest, and cancellation cleanup; it currently covers streamed file round trip and truncated manifest.
- [ ] Implement the plugin and registration, keeping the existing unarchived V1 path compatible.
- [ ] Reuse signed V2 JavaScript export/import flow on iOS via a native-session interface; do not call `JSON.stringify(archive)` or `file.text()` for archive-backed careers.
- [ ] Run Swift tests, TypeScript transfer audits, and an iOS simulator export/import round trip.

### Task 4: Activation gate and release proof

**Files:** Modify `services/saveTransfer.ts` and transfer diagnostics; test `scripts/audit-career-archive-transfer-roundtrip.ts`.

**Interfaces:** `assertArchiveTransferReady(platform)` is true only when the native streaming plugin is registered and the signed archive round trip passes. If false, archive migration stays disabled; unarchived save transfer remains available.

- [ ] Write a failing round-trip test for complete archive, missing chunk, changed root, old V1/V2 transfer, and a failed destination save transaction.
- [ ] Run red, implement gate and full verification, then run green.
- [ ] Measure bridge call maximum and peak-memory bands on Android and iOS devices. Keep migration off if either platform cannot complete the test.

## Self-review and handoff

This plan covers the spec's transfer gate only. Domain eligibility/UI adapters and physical-device long-session validation are separate plans. No player history moves merely because this transfer plan is complete.
