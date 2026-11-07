import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { markWeekProcessingStage } from '../services/firebaseService';

const data = new Map<string, string>();
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
} } });
const original = JSON.stringify;
const player = structuredClone(INITIAL_PLAYER);
let playerEncodings = 0;
JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
    if (args[0] === player) playerEncodings++;
    return original(...args);
}) as typeof JSON.stringify;
const context = { run_id: 'one-owned-week', save_slot: 3, measure_save_size: true };
try {
    markWeekProcessingStage('start', player, context);
    markWeekProcessingStage('game_loop_done', player, context);
    markWeekProcessingStage('persist_prepare_done', player, context);
    markWeekProcessingStage('indexeddb_write_done', player, context);
    markWeekProcessingStage('success', player, context);
    assert.equal(playerEncodings, 1, 'Week tracing must measure the source once, without re-encoding the full prepared player');
    const read = () => JSON.parse([...data.values()][0]);
    assert.equal(read().save_size, original(player).length);
    assert.equal(read().save_size_basis, 'SOURCE_AT_WEEK_START');
    player.money += 100;
    markWeekProcessingStage('start', player, { ...context, run_id: 'next-week' });
    assert.equal(playerEncodings, 2, 'A new run must not reuse a stale source measurement');
    markWeekProcessingStage('persist_prepare_done', player, { ...context, run_id: 'next-week', save_size: 123 });
    assert.equal(playerEncodings, 2);
    assert.equal(read().save_size, 123);
    assert.equal(read().save_size_basis, 'EXPLICIT');
} finally { JSON.stringify = original; }
console.log(JSON.stringify({ passed: 7, fullPlayerEncodingsPerWeek: 1, explicitSizeBasis: true }));
