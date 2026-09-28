import assert from 'node:assert/strict';

import { checkpointNativeMemoryPressure } from '../services/nativeMemoryCheckpoint';

const run = async () => {
  const calls: string[] = [];

  const saved = checkpointNativeMemoryPressure({
    isPlaying: true,
    currentSlot: 2,
    isWeekProcessing: false,
    hasVerifiedCheckpoint: () => true,
    cancelPendingAutosave: () => calls.push('cancel'),
  });

  assert.deepEqual(saved, { status: 'READY', slot: 2 });
  assert.deepEqual(calls, ['cancel']);

  for (const skippedCase of [
    {
      name: 'a save transfer is active',
      input: { isPlaying: true, currentSlot: 1, isWeekProcessing: false, isSaveTransferActive: true },
      expected: { status: 'SKIPPED', reason: 'SAVE_TRANSFER_ACTIVE' },
    },
    {
      name: 'a week is processing',
      input: { isPlaying: true, currentSlot: 1, isWeekProcessing: true, isSaveTransferActive: false },
      expected: { status: 'SKIPPED', reason: 'WEEK_PROCESSING' },
    },
    {
      name: 'the game is not playing',
      input: { isPlaying: false, currentSlot: 1, isWeekProcessing: false, isSaveTransferActive: false },
      expected: { status: 'SKIPPED', reason: 'NOT_PLAYING' },
    },
    {
      name: 'there is no active save slot',
      input: { isPlaying: true, currentSlot: null, isWeekProcessing: false, isSaveTransferActive: false },
      expected: { status: 'SKIPPED', reason: 'NO_SLOT' },
    },
  ] as const) {
    let cancelled = false;
    const result = checkpointNativeMemoryPressure({
      ...skippedCase.input,
      hasVerifiedCheckpoint: () => true,
      cancelPendingAutosave: () => {
        cancelled = true;
      },
    });

    assert.deepEqual(result, skippedCase.expected, skippedCase.name);
    assert.equal(cancelled, true, `${skippedCase.name}: pending autosave must stop under pressure`);
  }

  assert.deepEqual(checkpointNativeMemoryPressure({
    isPlaying: true,
    currentSlot: 3,
    isWeekProcessing: false,
    hasVerifiedCheckpoint: () => false,
    cancelPendingAutosave: () => undefined,
  }), { status: 'SKIPPED', reason: 'NO_VERIFIED_CHECKPOINT' });

  console.log('C8R native memory checkpoint audit passed.');
};

await run();
