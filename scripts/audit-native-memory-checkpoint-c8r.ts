import assert from 'node:assert/strict';

import { checkpointNativeMemoryPressure } from '../services/nativeMemoryCheckpoint';

const run = async () => {
  const committedPlayer = { age: 82, currentWeek: 17, marker: 'latest-committed-week' };
  const calls: string[] = [];
  let persistedPlayer: typeof committedPlayer | null = null;

  const saved = await checkpointNativeMemoryPressure({
    isPlaying: true,
    currentSlot: 2,
    isWeekProcessing: false,
    getCommittedPlayer: () => committedPlayer,
    cancelPendingAutosave: () => calls.push('cancel'),
    persistCommittedPlayer: async (slot, player) => {
      calls.push(`persist:${slot}`);
      persistedPlayer = player;
    },
  });

  assert.deepEqual(saved, { status: 'SAVED', slot: 2 });
  assert.deepEqual(calls, ['cancel', 'persist:2']);
  assert.equal(persistedPlayer, committedPlayer);

  for (const skippedCase of [
    {
      name: 'a week is processing',
      input: { isPlaying: true, currentSlot: 1, isWeekProcessing: true },
      expected: { status: 'SKIPPED', reason: 'WEEK_PROCESSING' },
    },
    {
      name: 'the game is not playing',
      input: { isPlaying: false, currentSlot: 1, isWeekProcessing: false },
      expected: { status: 'SKIPPED', reason: 'NOT_PLAYING' },
    },
    {
      name: 'there is no active save slot',
      input: { isPlaying: true, currentSlot: null, isWeekProcessing: false },
      expected: { status: 'SKIPPED', reason: 'NO_SLOT' },
    },
  ] as const) {
    let cancelled = false;
    let persisted = false;
    const result = await checkpointNativeMemoryPressure({
      ...skippedCase.input,
      getCommittedPlayer: () => committedPlayer,
      cancelPendingAutosave: () => {
        cancelled = true;
      },
      persistCommittedPlayer: async () => {
        persisted = true;
      },
    });

    assert.deepEqual(result, skippedCase.expected, skippedCase.name);
    assert.equal(cancelled, false, `${skippedCase.name}: autosave must stay untouched`);
    assert.equal(persisted, false, `${skippedCase.name}: no checkpoint may be written`);
  }

  const persistenceError = new Error('storage unavailable');
  await assert.rejects(
    checkpointNativeMemoryPressure({
      isPlaying: true,
      currentSlot: 3,
      isWeekProcessing: false,
      getCommittedPlayer: () => committedPlayer,
      cancelPendingAutosave: () => undefined,
      persistCommittedPlayer: async () => {
        throw persistenceError;
      },
    }),
    persistenceError,
  );

  console.log('C8R native memory checkpoint audit passed.');
};

await run();
