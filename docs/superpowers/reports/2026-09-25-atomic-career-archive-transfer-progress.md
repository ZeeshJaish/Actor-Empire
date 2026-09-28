# Career archive transfer continuation — status

Date: 2026-09-25

The signed V2 transfer contract now supports bounded `ARCHIVE_ROOT` and `ARCHIVE_CHUNK` records. An archived SAVE descriptor carries the root digest, requires the matching root, and requires root/chunk records to precede the SAVE. Old unarchived V2 transfers keep their existing totals and remain valid.

The Android streamed export path verifies the current hot save/root pair, writes the root and chunks as separate bounded records, and keeps the verified hot generation associated with them. Android import stages each chunk under immutable archive keys and checks root coverage and chunk completeness before staging its SAVE candidate. The existing multi-slot save promotion remains the final visibility boundary. A malformed archive fails before replacing a public slot; failed imports can leave unreachable staged chunks, which are not deleted until a safe reachability cleanup is implemented.

A Foundation-only iOS `AESAVE2` streaming writer/reader now passes a Mac Swift audit for a 260 KiB record read in 7 KiB chunks and a truncated manifest. It is **not registered as a Capacitor plugin** and is not yet connected to iOS share or document-picker UI. iOS still cannot export/import archive-backed saves; the existing fail-closed transfer guard remains. No history-domain migration was enabled.

Tests: `npm run audit:career-archive-transfer`, `npm run audit:career-archive-foundation`, `npm run audit:save-transfer-oom-phase3-4`, `npm run audit:save-transfer`, `npm run typecheck:career-archive`, `npm run audit:ios-save-transfer-framing`, and `npm run build` passed during this continuation. Android device round trip, iOS native integration, a 20-year fixture, browser IndexedDB transaction-abort testing, and physical-device long-session validation remain unverified.

Important inventory finding: at least 116 app/service/view files directly reference the candidate history domains. `gameLoop.ts` still truncates X/Instagram posts to 200, and several history screens directly read/mutate `pastProjects` or social arrays. Removing those arrays now would break gameplay/history. Domain adapters and lossless backup on both platforms must precede migration.
