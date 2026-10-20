import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createStreamingCatalogueReadContext } from '../services/streamingContentAvailability';
import { getOwnedStreamingProgramEntries } from '../services/streamingOriginals';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';

const fixture = (count: number, countryIds?: string[]) => {
    const player = filedMarketFixture(countryIds);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = player.ownedStreamingPlatform;
    platform.lifecycle = 'ACTIVE';
    platform.marketOperations = platform.marketOperations.map(operation => ({ ...operation, status: 'ACTIVE' }));
    platform.serviceConfiguration.pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing,
        { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
    platform.serviceConfiguration.pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing,
        { kind: 'TOGGLE', offer: 'STORE', enabled: true });
    platform.launchCommit = { id: 'programme-batch-launch', idempotencyKey: 'programme-batch-launch', committedAtAbsoluteWeek: week - 4 } as any;
    for (let index = 0; index < count; index++) {
        const projectId = `programme-batch-${index}`;
        const licence = addStreamingAuditCatalogueTitle(player, week, projectId, ['SUBSCRIPTION', 'RENTAL', 'PURCHASE']);
        licence.accessGrant!.purchaseFulfillment = 'PERPETUAL';
        const contract = createStreamingRightsContractFromLicense({ license: licence,
            buyer: { type: 'PLAYER_PLATFORM', id: platform.identity!.slug, name: platform.identity!.name, platformId: null },
            guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week - 4 });
        player.world.streamingRightsContracts![contract.id] = contract;
        platform.catalogProjectIds.push(projectId);
    }
    platform.launchSlate = { entries: platform.catalogLicenses.map((licence, index) => ({
        id: `opening-${index}`, projectId: licence.sourceProjectId, title: `Opening ${index}`,
        source: 'LICENSED_WINDOW', projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 1,
        releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'LEAN',
    })) } as any;
    return player;
};
const observeProfiles = (player: ReturnType<typeof fixture>) => {
    let reads = 0;
    player.ownedStreamingPlatform.marketOperations = player.ownedStreamingPlatform.marketOperations.map(operation => {
        const observed = { ...operation };
        Object.defineProperty(observed, 'countryProfile', { enumerable: true, get: () => { reads++; return operation.countryProfile; } });
        return observed;
    });
    return () => reads;
};
let passed = 0;
const failures: string[] = [];
const check = (name: string, run: () => void) => {
    try { run(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
};

check('52 programme entries share one current platform read rather than normalizing every licence per title', () => {
    const player = fixture(52);
    const reads = observeProfiles(player);
    const context = createStreamingCatalogueReadContext(player);
    const first = getOwnedStreamingProgramEntries(player, context);
    const second = getOwnedStreamingProgramEntries(player, context);
    assert.equal(first.length, 52);
    console.log(JSON.stringify({ programmeTitles: 52, countryProfileReads: reads() }));
    assert.ok(reads() <= 197 * 4, `${reads()} profile reads for one 52-title programme batch`);
    assert.equal(first, second, 'one current read batch should reuse its exact programme projection');
});

check('opening entry precedence, active-window filtering and late rights start dates are preserved', () => {
    const player = fixture(4, ['US', 'IN']);
    const platform = player.ownedStreamingPlatform;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    platform.launchSlate!.entries.splice(1, 0, { ...platform.launchSlate!.entries[0], id: 'duplicate-0', launchWeek: 99 });
    platform.catalogLicenses[1].startsAtAbsoluteWeek = week - 1;
    platform.catalogLicenses[1].projectType = 'SERIES';
    platform.catalogLicenses[1].genre = 'THRILLER';
    platform.catalogLicenses[2].expiresAtAbsoluteWeek = week;
    platform.catalogLicenses[3].startsAtAbsoluteWeek = week + 1;
    const rows = getOwnedStreamingProgramEntries(player);
    assert.deepEqual(rows.map(entry => ({ id: entry.id, projectId: entry.projectId, week: entry.launchWeek,
        type: entry.projectType, genre: entry.genre })), [
        { id: 'opening-0', projectId: 'programme-batch-0', week: 1, type: 'MOVIE', genre: 'DRAMA' },
        { id: 'opening-1', projectId: 'programme-batch-1', week: 4, type: 'SERIES', genre: 'THRILLER' },
    ]);
});

check('overlapping licences retain newest-start and ID tie-break rules without reordering later acquisitions', () => {
    const player = fixture(1, ['US', 'IN']);
    const platform = player.ownedStreamingPlatform;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const original = platform.catalogLicenses[0];
    platform.catalogLicenses.push({ ...original, id: 'z-overlap', startsAtAbsoluteWeek: week - 1,
        projectType: 'SERIES', genre: 'THRILLER' });
    platform.catalogLicenses.push({ ...original, id: 'a-overlap', startsAtAbsoluteWeek: week - 1,
        projectType: 'SERIES', genre: 'COMEDY' });
    const opening = getOwnedStreamingProgramEntries(player);
    assert.equal(opening.length, 1);
    assert.equal(opening[0].id, 'opening-0');
    assert.equal(opening[0].launchWeek, 4);
    assert.equal(opening[0].genre, 'COMEDY');
    assert.equal(opening[0].projectType, 'SERIES');
    platform.launchSlate = null;
    const later = getOwnedStreamingProgramEntries(player);
    assert.equal(later.length, 1);
    assert.equal(later[0].launchWeek, 1, 'later acquisitions preserve their existing first-seen precedence');
    assert.equal(later[0].genre, 'DRAMA');
});

check('world offer and programme readers share the caller-owned batch', () => {
    const player = fixture(6, ['US', 'IN']);
    const reads = observeProfiles(player);
    const context = createStreamingCatalogueReadContext(player);
    getOwnedStreamingProgramEntries(player, context);
    const offers = getWorldStreamingOffers(player, getAbsoluteWeek(player.age, player.currentWeek), context);
    assert.ok(offers.offers.some(offer => offer.platformId === 'PLAYER'));
    assert.ok(reads() <= 16, `${reads()} country profiles read despite the prepared offer/programme batch`);
});

check('fresh programme and offer calls honor in-place delivery, territory and canonical grant changes', () => {
    const player = fixture(1, ['US', 'IN']);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const programme = () => getOwnedStreamingProgramEntries(player);
    assert.equal(programme().length, 1);
    createStreamingCatalogueReadContext(player);
    player.commitments.push({ id: 'programme-batch-0', projectPhase: 'PRODUCTION' } as any);
    assert.equal(programme().length, 0);
    player.commitments = [];
    const playerOffer = () => getWorldStreamingOffers(player, week).offers.find(offer => offer.platformId === 'PLAYER')!;
    assert.ok((playerOffer().catalogueStrengthByCountry?.US || 0) > 0);
    const contract = Object.values(player.world.streamingRightsContracts!).find(row => row.sourceProjectId === 'programme-batch-0')!;
    contract.accessGrant!.modes = [];
    assert.equal(playerOffer().catalogueStrengthByCountry?.US, 0);
    contract.accessGrant!.modes = ['SUBSCRIPTION'];
    contract.territory = 'DOMESTIC'; contract.countryIds = ['IN'];
    assert.equal(playerOffer().catalogueStrengthByCountry?.US, 0);
    assert.ok((playerOffer().catalogueStrengthByCountry?.IN || 0) > 0);
    player.ownedStreamingPlatform.catalogLicenses[0].expiresAtAbsoluteWeek = week;
    assert.equal(programme().length, 0);
});

if (process.argv.includes('--hash')) {
    const player = fixture(3, ['US', 'IN']);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const before = JSON.stringify(player);
    const payload = [getOwnedStreamingProgramEntries(player), getWorldStreamingOffers(player, week),
        forecastWorldStreamingLaunchPricing(player, player.ownedStreamingPlatform.serviceConfiguration.pricing, ['US', 'IN'])];
    assert.equal(JSON.stringify(player), before, 'programme, offer and pricing projections cannot mutate a saved player');
    console.log(`OUTPUT_HASH ${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`);
}
console.log(JSON.stringify({ passed, failed: failures.length }));
if (failures.length) process.exitCode = 1;
