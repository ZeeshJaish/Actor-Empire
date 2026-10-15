import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    estimateSaveJsonBytes,
    isClearlyOversizedLegacySave,
    prepareVerifiedPlayerForPersistence,
} from '../services/savePreparation';

const MIB = 1024 * 1024;
const chunk = 'x'.repeat(MIB);
const makeEstimatedShape = (repeatCount: number) => ({ payload: Array(repeatCount).fill(chunk) });

const estimates = [50, 100, 400].map(megabytes => ({
    megabytes,
    bytes: estimateSaveJsonBytes(makeEstimatedShape(megabytes)),
}));
for (const estimate of estimates) {
    assert.ok(estimate.bytes >= estimate.megabytes * MIB, `${estimate.megabytes} MB fixture must reach its declared byte shape.`);
    assert.ok(estimate.bytes < (estimate.megabytes + 1) * MIB, `${estimate.megabytes} MB fixture overhead must stay below one MiB.`);
}

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'large-save-player';
player.age = 82;
player.currentWeek = 50;
player.money = 2_000_000_000;
player.pastProjects = [
    { id: 'protected-project-a', title: 'A' } as unknown as Player['pastProjects'][number],
    { id: 'protected-project-b', title: 'B' } as unknown as Player['pastProjects'][number],
];
player.businesses = [{ id: 'protected-studio', name: 'Empire Studios', balance: 900_000_000 } as Player['businesses'][number]];
player.news = Array.from({ length: 500 }, (_, index) => ({
    id: `routine-news-${index}`,
    headline: `Routine story ${index}`,
    subtext: chunk,
    year: 82,
    week: 1,
    category: 'INDUSTRY',
    impactLevel: 'LOW',
} as Player['news'][number]));

assert.equal(isClearlyOversizedLegacySave(player), true);
const prepared = prepareVerifiedPlayerForPersistence(player, 'MIGRATION', { legacyOrExternal: false, currentIsUnverified: true });
assert.equal(prepared.comparison.ok, true);
assert.equal(prepared.oversizedLegacy, true);
assert.equal(prepared.retainPrevious, false);
assert.equal(prepared.needsRecoveryCheckpoint, true);
assert.equal(prepared.manifest.needsRecoveryCheckpoint, true);
assert.deepEqual(prepared.player.pastProjects.map(project => project.id), ['protected-project-a', 'protected-project-b']);
assert.equal(prepared.player.money, 2_000_000_000);
assert.ok(prepared.player.news.length <= 80, 'Routine news may be bounded without violating protected state.');

const externallyCompactedLargeLegacy = prepareVerifiedPlayerForPersistence(structuredClone(INITIAL_PLAYER) as Player, 'MIGRATION', {
    currentIsUnverified: true,
    sourceByteEstimate: 400 * MIB,
});
assert.equal(externallyCompactedLargeLegacy.oversizedLegacy, true, 'Original raw size must survive poster/media externalization decisions.');

const originalStringify = JSON.stringify;
JSON.stringify = (() => { throw new Error('legacy migration attempted a full JSON stringify clone'); }) as typeof JSON.stringify;
try {
    const migrated = prepareVerifiedPlayerForPersistence(structuredClone(INITIAL_PLAYER) as Player, 'MIGRATION', {
        legacyOrExternal: true,
        currentIsUnverified: true,
    });
    assert.equal(migrated.comparison.ok, true);
} finally {
    JSON.stringify = originalStringify;
}

console.log('Large save integrity audit passed:', estimates.map(item => `${item.megabytes}MB=${item.bytes} bytes`).join(', '));
