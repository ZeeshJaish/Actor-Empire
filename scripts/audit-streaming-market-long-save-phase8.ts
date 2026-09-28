import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { buildStreamingOpportunityOffer, advanceStreamingOpportunityMarket,
    getStreamingOpportunityCards, processRivalBrokeredOpportunityWeek,
    processStreamingOpportunityPremieres } from '../services/streamingOpportunityMarket';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { getAuthoredAiCataloguePositions, seedLegacyAiCatalogue } from '../services/worldEconomy/worldStreamingAiCatalogue';

const player: Player = structuredClone(INITIAL_PLAYER);
player.id = 'phase-8-long-save';

const firstCycle = 450;
const oldAcquired = buildStreamingOpportunityOffer(player, firstCycle, 0);
const laterCycle = buildStreamingOpportunityOffer(player, firstCycle + 95, 10);
assert.notEqual(laterCycle.title, oldAcquired.title,
    'a decade-old acquired title must not return as a new public offer');

const titleHistory = new Set<string>();
for (let cycle = firstCycle; cycle < firstCycle + 520; cycle += 1) {
    for (let index = 0; index < 22; index += 1) {
        const offer = buildStreamingOpportunityOffer(player, cycle, index,
            index >= 20 ? 'BROKERED' : 'PUBLIC');
        assert.ok(!titleHistory.has(offer.title),
            `a thirty-year public/brokered market cannot reuse ${offer.title} (cycle ${cycle})`);
        assert.doesNotMatch(offer.title, /\b([a-z]+)\s+\1\b/i,
            `public/brokered title should not repeat an adjacent word: ${offer.title}`);
        titleHistory.add(offer.title);
    }
    for (let index = 0; index < 20; index += 1) {
        const offer = buildStreamingOpportunityOffer(player, cycle, cycle * 997 + 20 + index, 'SCOUTED');
        assert.ok(!titleHistory.has(offer.title),
            `a thirty-year private scout cannot reuse ${offer.title} (cycle ${cycle})`);
        assert.doesNotMatch(offer.title, /\b([a-z]+)\s+\1\b/i,
            `private-scout title should not repeat an adjacent word: ${offer.title}`);
        titleHistory.add(offer.title);
    }
}

const initial = structuredClone(INITIAL_PLAYER);
initial.id = 'phase-8-market-soak';
initial.age = 26;
initial.currentWeek = 9;
initial.ownedStreamingPlatform.lifecycle = 'FOUNDING';
initial.ownedStreamingPlatform.treasuryCash = 300_000_000;
let running = migratePlayerSave(initial);
const baselineSaveBytes = Buffer.byteLength(JSON.stringify(compactPlayerForPersistence(running)));
const firstAbsoluteWeek = getAbsoluteWeek(running.age, running.currentWeek);
let maxSaveBytes = 0;
let maxCompactedProjectCount = 0;
const rivalDeals = new Map<string, number>();
let premiumCards = 0;
let allCards = 0;
let totalAskingPrice = 0;
for (let offset = 0; offset < 20 * 52; offset += 1) {
    const absoluteWeek = firstAbsoluteWeek + offset;
    running = { ...running, age: Math.floor(absoluteWeek / 52) + 1,
        currentWeek: absoluteWeek % 52 + 1 };
    running = advanceStreamingOpportunityMarket(running, absoluteWeek);
    if (offset === 0 || running.world.streamingOpportunityMarket?.openedAtAbsoluteWeek === absoluteWeek) {
        for (const offer of running.world.streamingOpportunityMarket?.offers || []) {
            allCards += 1;
            premiumCards += Number(offer.premium);
            totalAskingPrice += offer.askingPrice;
        }
    }
    const priorContractIds = new Set(Object.keys(running.world.streamingRightsContracts || {}));
    running = processRivalBrokeredOpportunityWeek(running, absoluteWeek);
    for (const contract of Object.values(running.world.streamingRightsContracts || {})) {
        if (priorContractIds.has(contract.id) || !contract.sourceOfferId?.startsWith('streaming_opportunity')) continue;
        rivalDeals.set(contract.buyer.id, (rivalDeals.get(contract.buyer.id) || 0) + 1);
    }
    assert.ok(Object.values(running.world.platforms || {}).every(platform => platform.cashReserve >= 0),
        `a market purchase must not bankrupt a rival below zero in week ${absoluteWeek}`);
    running = processStreamingOpportunityPremieres(running, absoluteWeek);
    const cards = getStreamingOpportunityCards(running);
    assert.ok(cards.individuals.length >= 12,
        `funded rivals must not empty the protected shelf in week ${absoluteWeek}`);
    assert.equal(new Set(cards.individuals.map(card => card.title)).size, cards.individuals.length,
        `active shelf names must be distinct in week ${absoluteWeek}`);
    if (offset % 52 === 0) {
        const before = running.world.streamingOpportunityMarket;
        const compacted = compactPlayerForPersistence(running);
        assert.ok(compacted.world.projects.length <= 900,
            `this fixture has no protected player releases; old market history must fit the world-project budget in week ${absoluteWeek}`);
        maxCompactedProjectCount = Math.max(maxCompactedProjectCount, compacted.world.projects.length);
        const serialized = JSON.stringify(compacted);
        maxSaveBytes = Math.max(maxSaveBytes, Buffer.byteLength(serialized));
        running = migratePlayerSave(JSON.parse(serialized));
        assert.deepEqual(running.world.streamingOpportunityMarket, before,
            `annual save/export/import must retain the same public offers and rival cursors in week ${absoluteWeek}`);
        const projectIds = new Set(running.world.projects.map(project => project.id));
        assert.ok(Object.values(running.world.streamingRightsContracts || {})
            .filter(contract => contract.sourceOfferId?.startsWith('streaming_opportunity')
                && contract.status === 'ACTIVE' && contract.expiresAtAbsoluteWeek >= absoluteWeek)
            .every(contract => projectIds.has(contract.sourceProjectId)),
        `all live market rights must retain canonical projects in week ${absoluteWeek}`);
    }
}
const finalWeek = getAbsoluteWeek(running.age, running.currentWeek);
assert.deepEqual(processRivalBrokeredOpportunityWeek(running, finalWeek), running,
    'late-game same-week rival processing must not replay a purchase');
assert.ok(maxSaveBytes < baselineSaveBytes + 3_500_000,
    'twenty years of generated offers, rights and talent credits must not create unbounded save growth');
const longRunRivals = getWorldStreamingOffers(running, finalWeek).offers.filter(offer => !offer.isPlayer);
const longRunLibrary = seedLegacyAiCatalogue(running, longRunRivals, finalWeek, [], []);
assert.ok(longRunRivals.length >= 30, 'the long-save world still has the wide rival field');
assert.ok(longRunRivals.every(offer => longRunLibrary.titles.filter(title => title.platformId === offer.platformId).length
    + getAuthoredAiCataloguePositions(running, offer.platformId).length >= 8),
    'the long-save rival field retains a credible minimum library beyond the five core brokered buyers');
console.log(`Phase 8 twenty-year market soak: ${running.world.projects.length} retained projects, max ${maxCompactedProjectCount} immediately after compaction, ${Object.keys(running.world.streamingRightsContracts || {}).length} rights contracts, baseline ${baselineSaveBytes} bytes, max serialized save ${maxSaveBytes} bytes.`);
console.log(`Phase 8 balance sample: ${allCards} public film offers (${premiumCards} premium), mean asking price $${Math.round(totalAskingPrice / allCards).toLocaleString()}, ${[...rivalDeals.values()].reduce((sum, count) => sum + count, 0)} rival deals across ${rivalDeals.size} buyers.`);

console.log('Phase 8 streaming market long-save audit passed.');
