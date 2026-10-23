import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createDeterministicRng } from '../services/deterministicRandom';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { buildPlatformContentCandidates, commitPlatformContentCandidate } from '../services/platformAi/platformAiContentSourcing';
import { commissionPlatformAiOriginal } from '../services/platformAi/platformAiCommissioning';
import { generateAuditions } from '../services/roleLogic';
import { createProjectTitleReservations, rememberProjectTitles, projectTitleKey } from '../services/projectTitleGeneration';

async function main() {
    Math.random = createDeterministicRng('project-title-full-flow');
    const source = structuredClone(INITIAL_PLAYER); source.id = 'title-flow'; source.age = 40; source.currentWeek = 48;
    let player = migratePlayerSave(source);
    const store = new CinemaMemorySaveStore();
    const key = 'project-title-flow-audit';
    const before = getAbsoluteWeek(player.age, player.currentWeek);
    player.world.platforms!.NETFLIX.ai!.strategyCycle = 1;
    const input = { player, world: player.world, platformId: 'NETFLIX' as const, absoluteWeek: before };
    const candidate = buildPlatformContentCandidates(input).find(c => c.source === 'COMMISSIONED_ORIGINAL')!;
    assert.ok(candidate);
    const committed = commitPlatformContentCandidate({ ...input, candidate });
    assert.ok(committed.changed, committed.reason); player = { ...player, world: committed.world };
    const commissioned = commissionPlatformAiOriginal({ player, world: player.world, platformId: 'NETFLIX', planId: committed.plan!.id, absoluteWeek: before });
    assert.ok(commissioned.production, commissioned.reason); player = { ...player, world: commissioned.world };
    const productionId = commissioned.production!.id;
    const originalTitle = commissioned.production!.title;
    const canonicalId = commissioned.production!.canonicalProjectId;
    let saves = 0;
    for (let cycle = 0; cycle < 3; cycle++) {
        const ready = prepareVerifiedPlayerForPersistence(player, 'MANUAL');
        assert.deepEqual(ready.comparison, { ok: true });
        const balances = { money: ready.player.money, platformCash: ready.player.world.platforms!.NETFLIX.cashReserve };
        const contracts = JSON.stringify(ready.player.world.streamingRightsContracts);
        const memory = structuredClone(ready.player.world.recentProjectTitles);
        await saveVerifiedGameData(store, key, ready.player, ready.manifest);
        const loaded = await loadVerifiedGameData(store, key);
        assert.equal(loaded.status, 'CURRENT');
        player = migratePlayerSave(loaded.player!); saves++;
        assert.equal(player.money, balances.money);
        assert.equal(player.world.platforms!.NETFLIX.cashReserve, balances.platformCash);
        assert.equal(JSON.stringify(player.world.streamingRightsContracts), contracts);
        assert.deepEqual(player.world.recentProjectTitles, memory, 'reload must preserve original reservation dates');
        const savedProduction = player.world.industryProductions![productionId];
        assert.equal(savedProduction.title, originalTitle);
        assert.equal(savedProduction.canonicalProjectId, canonicalId);
        assert.equal(player.world.platforms!.NETFLIX.ai!.slate.find(p => p.id === committed.plan!.id)!.title, originalTitle);
        assert.ok(createProjectTitleReservations(player).has(projectTitleKey(originalTitle)));
        const offers = generateAuditions(player, []);
        assert.ok(offers.every(o => o.project.title !== originalTitle));
        assert.equal(new Set(offers.map(o => o.project.title)).size, offers.length);
        player = { ...player, world: rememberProjectTitles(player.world, offers.map(o => o.project.title), getAbsoluteWeek(player.age, player.currentWeek)) };
        if (cycle < 2) for (let i = 0; i < 6; i++) {
            const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
            player = (await processGameWeek(player)).player;
            assert.equal(getAbsoluteWeek(player.age, player.currentWeek), absoluteWeek + 1);
            assert.ok(player.world.recentProjectTitles!.entries.length <= 1024);
            assert.equal(player.world.industryProductions![productionId].title, originalTitle);
        }
    }
    assert.equal(player.age, 41, 'the actual weekly flow must cross a year boundary');
    console.log(JSON.stringify({ status: 'PASS', scope: 'sourcing → commission → three verified save/reload cycles → twelve actual weeks across rollover → new offers', saves, processedWeeks: 12, originalTitle, productionId, canonicalId, finalMemoryEntries: player.world.recentProjectTitles!.entries.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
