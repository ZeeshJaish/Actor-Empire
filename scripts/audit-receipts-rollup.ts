/**
 * #232 (plan §25.2): a save keeps the week's royalty receipts per platform, contract, source and kind. What reads them totals them
 * by contract, so the rolled-up list must give the same totals and the same royalties; and rolling up again changes nothing.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { calculateStreamingSignedRoyaltyAllocations } from '../services/streamingEconomyCore';
import { verifySaveIntegrity } from '../services/saveIntegrity';

const pass = (label: string) => console.log(`✓ ${label}`);
type Row = NonNullable<NonNullable<Player['world']['worldStreamingViewing']>['royaltyReceipts']>[number];
const totals = (rows: Row[]) => {
    const out = new Map<string, number>();
    for (const row of rows) {
        const key = JSON.stringify([row.platformId, row.contractId ?? null, row.sourceKind ?? null, row.kind]);
        out.set(key, (out.get(key) || 0) + row.grossReceipts);
    }
    return [...out.entries()].sort();
};

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'rollup', name: 'Rollup Founder', age: 40, currentWeek: 1 });
    const fresh = { ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
    let player: Player = await buildStreamingFullPlatformQa(fresh, { processWeek: processGameWeek, persistWeek: async next => next });
    player = (await processGameWeek({ ...player, energy: { current: 100, max: 100 }, pendingEvents: [], stats: { ...player.stats, health: 100, happiness: 100 }, activeHealthConditions: [] })).player;
    const full = player.world.worldStreamingViewing!.royaltyReceipts!;
    const compacted = compactPlayerForPersistence(player);
    const rolled = compacted.world.worldStreamingViewing!.royaltyReceipts!;
    assert.ok(full.length > 1000, `the test company has many rows: ${full.length}`);
    assert.ok(rolled.length < full.length / 10, `${full.length} → ${rolled.length}`);
    pass(`${full.length} rows become ${rolled.length}`);

    assert.deepEqual(totals(rolled), totals(full), 'the same totals, by platform, contract, source and kind');
    assert.equal(new Set(rolled.map(row => row.receiptId)).size, rolled.length, 'each row has its own id');
    assert.ok(rolled.every(row => Number.isSafeInteger(row.grossReceipts) && row.grossReceipts > 0), 'what the viewing check asks of a row');
    pass('the same totals');

    const week = player.world.worldStreamingViewing!.lastProcessedAbsoluteWeek;
    const licenses = Object.values(player.world.streamingRightsContracts || {}) as never[];
    const allocate = (rows: Row[]) => calculateStreamingSignedRoyaltyAllocations({
        licenses,
        receipts: rows.filter(row => row.contractId).map(row => ({ ...row, contractId: row.contractId! })),
        absoluteWeek: week,
    });
    assert.deepEqual(allocate(rolled), allocate(full), 'the same royalties, in the same order');
    pass(`the same royalties on ${allocate(full).length} contracts`);

    assert.deepEqual(compactPlayerForPersistence(compacted).world.worldStreamingViewing!.royaltyReceipts, rolled, 'rolling up again changes nothing');
    assert.equal(player.world.worldStreamingViewing!.royaltyReceipts!.length, full.length, 'the player in memory is not touched');
    pass('rolling up again changes nothing');

    const prepared = prepareVerifiedPlayerForPersistence(player, 'MANUAL');
    assert.ok(prepared.manifest.digest, 'the integrity check accepts it');
    const loaded = migratePlayerSave(JSON.parse(JSON.stringify(prepared.player)));
    assert.deepEqual(totals(loaded.world.worldStreamingViewing!.royaltyReceipts!), totals(full), 'and after a reload');
    pass('the integrity check accepts it, and a reload keeps it');
    console.log(`full rows ${(JSON.stringify(full).length / 1e6).toFixed(1)} MB, rolled ${(JSON.stringify(rolled).length / 1e3).toFixed(0)} KB`);

    /* #233: the AI platforms' older finance rows lose their per-contract copies, and stay in their normal shape. A missing key made
       the AI state stop counting as canonical, and every sixth week the digest of a read-back save failed. So: real weeks, real checks. */
    let later: Player = player;
    for (let week = 0; week < 9; week += 1) {
        later = (await processGameWeek({ ...later, energy: { current: 100, max: 100 }, pendingEvents: [], stats: { ...later.stats, health: 100, happiness: 100 }, activeHealthConditions: [] })).player;
        const saved = prepareVerifiedPlayerForPersistence(later, 'MANUAL');
        const readBack = structuredClone(saved.player);
        assert.ok('ok' in verifySaveIntegrity(readBack, saved.manifest) && verifySaveIntegrity(readBack, saved.manifest).ok, `week ${week + 1}: the digest of a read-back save holds`);
        later = migratePlayerSave(readBack);
    }
    const ai = Object.values(later.world.platforms || {}).find(platform => (platform.ai?.financeHistory.length || 0) > 3)!.ai!;
    const rows = ai.financeHistory;
    assert.ok(rows.slice(0, -2).every(row => !row.contractRoyaltyStatements?.length && row.storeRoyaltyAccruals === undefined), 'older rows have no copies');
    assert.ok(rows.slice(0, -2).every(row => Number.isFinite(row.partnerRevenueShareCostMillions) && Number.isFinite(row.closingCashMillions)), 'the row keeps its own totals');
    assert.ok(Array.isArray(rows.at(-1)!.storeRoyaltyAccruals), 'the last row keeps what the next close reads');
    pass(`9 weeks with a read-back after each: the digest holds; ${rows.length} finance rows slimmed but for the last two`);
};

main().then(() => console.log('receipts-rollup audit passed')).catch(error => { console.error(error); process.exit(1); });
