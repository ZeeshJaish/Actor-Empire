/* 20 Nov 2026 (player report, Partha: Streaming Library "newest first & older don't work"). On a real test company (the
   full-platform QA build: opening catalogue, market buys, Originals), turning the Library's order round must turn the
   list round, including titles that joined in the same week. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createCanonicalContentDeskState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { compareLibraryOrder } from '../components/streaming-transplant/StreamingContentExperience';

const run = async () => {
    const start = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'library-sort-audit', name: 'Audit', age: 30, currentWeek: 1 });
    const built = await buildStreamingFullPlatformQa({ ...start, energy: { current: 100, max: 100 } } as Player, { processWeek: processGameWeek, persistWeek: async next => next });
    const player = ('player' in built ? built.player : built) as Player;
    const titles = createCanonicalContentDeskState(player).titles;
    const known = titles.filter(title => title.addedAt !== undefined);
    assert.ok(known.length >= 10, `a real library (${known.length} titles with a week)`);
    const weeks = new Set(known.map(title => title.addedAt));
    const sameWeek = known.length - weeks.size;
    assert.ok(sameWeek > 0, 'the test library has titles that joined in the same week (the case that looked dead)');
    assert.equal(new Set(known.map(title => title.addedOrder)).size, known.length, 'every title has its own place in the joining order');
    const newest = [...titles].sort((a, b) => compareLibraryOrder(a, b, 'NEWEST')).map(title => title.id);
    const oldest = [...titles].sort((a, b) => compareLibraryOrder(a, b, 'OLDEST')).map(title => title.id);
    const knownIds = new Set(known.map(title => title.id));
    assert.deepEqual(newest.filter(id => knownIds.has(id)), [...oldest.filter(id => knownIds.has(id))].reverse(), 'oldest first is exactly newest first turned round');
    assert.notEqual(newest[0], oldest[0], 'the first title changes when the order is turned round');
    const missing = titles.length - known.length;
    if (missing) assert.deepEqual(newest.slice(-missing).sort(), oldest.slice(-missing).sort(), 'titles with no week stay at the end both ways');
    console.log(`library sort audit passed (${titles.length} titles, ${weeks.size} weeks, ${sameWeek} sharing a week)`);
};
run().catch(error => { console.error(error); process.exit(1); });
