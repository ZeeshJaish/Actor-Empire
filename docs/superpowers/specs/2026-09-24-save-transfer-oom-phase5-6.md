# Save Transfer OOM — Phase 5 and 6

## Outcome

Phase 5 adds player-facing progress and cancellation to the bounded Android V2 transfer path. Phase 6 adds repeatable stress and failure gates. These changes do not alter rendering, artwork, animation quality, or gameplay systems.

## Phase 5: player experience

- Transfers completing in under 1 second do not open a progress overlay.
- Slower transfers show actual records and bytes processed; there is no fake timer or fixed wait.
- The UI updates at record boundaries and approximately every 1 MiB, avoiding a React render for every 128 KiB bridge call.
- Cancel uses an `AbortSignal`. Export and import stop at the next safe native chunk boundary.
- Native export cancellation removes temporary session files.
- Import cancellation closes the native reader and discards staged save/media candidates before any save generation is promoted.
- Cancellation is disabled after the final promotion boundary begins. At that point the UI says “Finalizing — please wait”.
- Older V1 archives that exceed the safe bridge budget explain how to create a V2 export and explicitly say that existing careers are unchanged.

## Phase 6: automated release gates

Run:

```bash
npm run audit:save-transfer-oom-phase1-2
npm run audit:save-transfer-oom-phase3-4
npm run audit:save-transfer-oom-phase5-6
npm run audit:save-transfer
cd android && ./gradlew testDebugUnitTest assembleDebug
```

The combined gates cover:

- three-slot V2 manifest limits;
- 40 MiB and 100 MiB save streams;
- a 32 MiB media stream;
- the 128 KiB raw Capacitor bridge ceiling;
- export and import cancellation before the next native chunk;
- duplicate/concurrent transfer locking;
- low-memory and oversized V1 rejection;
- corrupted signatures and record digests;
- truncated records and invalid framing;
- native partial-file deletion on cancellation;
- save candidate read-back before promotion;
- V1 compatibility and V2 format detection.

## Physical Android device matrix

This gate needs a connected device and cannot be replaced by a desktop test.

Test on at least:

1. A low-memory Android device (or Android Go class device).
2. A current mid-range Android device.
3. A high-end Android device.

For each device:

1. Prepare three mature save slots and maximum realistic poster/social media.
2. Export V2; verify the UI stays silent when fast and shows real progress after 1 second when slow.
3. Cancel once during a save record and once during media; confirm all original slots still load.
4. Export again and import successfully; restart and open all three slots.
5. Try a corrupted, truncated, and oversized V1 file; confirm each is blocked and old slots still load.
6. Force-stop the app while import is staging, relaunch, and confirm old slots still load. Start a new transfer to exercise stale native-session cleanup.
7. Double-tap import/export and attempt Next Week during transfer; confirm only one transfer runs and week processing stays blocked.
8. Repeat after Android reports memory pressure. Confirm a safe retry message instead of a crash.

Capture Logcat and Play Console evidence. Release only when there is no `OutOfMemoryError`, no large `JSObject` payload, no partial slot replacement, and no orphaned active transfer session after the next transfer starts.
