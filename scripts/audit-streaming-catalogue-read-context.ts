import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createStreamingCatalogueReadContext, createStreamingTitleRouteReadBatch, getStreamingContentAvailability, getStreamingPlayableCatalogProjectIds } from '../services/streamingContentAvailability';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { createCanonicalContentDeskState, createCanonicalViewerState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';
import { rankStreamingLaunchAnchors } from '../services/streamingCatalogueAnchors';

const fixture = (count: number) => {
    const player = filedMarketFixture();
    player.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        player.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
    for (let index = 0; index < count; index++) {
        const id = `catalogue-context-${index}`;
        addStreamingAuditCatalogueTitle(player, getAbsoluteWeek(player.age, player.currentWeek), id);
        player.ownedStreamingPlatform.catalogProjectIds.push(id);
    }
    player.ownedStreamingPlatform.starterCatalog = { packageId: 'BROAD_APPEAL', ownedProjectIds: [],
        licensedProjectIds: player.ownedStreamingPlatform.catalogProjectIds.slice(), selectedAtAbsoluteWeek: 0 } as any;
    return player;
};
const createContext = createStreamingCatalogueReadContext;
const read = getStreamingContentAvailability;
let passed = 0;
const failures: string[] = [];
const check = (name: string, run: () => void) => {
    try { run(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
};

for (const count of [52, 128]) check(`${count} titles share one country snapshot and one route matrix across presentation readers`, () => {
    const player = fixture(count);
    let profileReads = 0;
    player.ownedStreamingPlatform.marketOperations = player.ownedStreamingPlatform.marketOperations.map(operation => {
        const observed = { ...operation };
        Object.defineProperty(observed, 'countryProfile', { enumerable: true, get: () => { profileReads++; return operation.countryProfile; } });
        return observed;
    });
    const context = createContext(player);
    const first = getStreamingOpeningCatalogueView(player, context);
    assert.equal(first.titles.length, count);
    assert.equal(first.countries.length, 197);
    const second = getStreamingOpeningCatalogueView(player, context);
    createCanonicalContentDeskState(player, context);
    createCanonicalViewerState(player, context);
    const anchors = rankStreamingLaunchAnchors(player, first.titles, 4, context);
    assert.equal(anchors.length, 4);
    console.log(JSON.stringify({ titleCount: count, countries: 197, countryProfileReads: profileReads }));
    assert.ok(profileReads <= 197 * 12, `read ${profileReads} country profiles for ${count} titles across one current read batch`);
    assert.equal(second, first, 'the same current opening coverage must be reused within one explicit batch');
    const one = read(player, 'catalogue-context-0', undefined, true, context);
    assert.equal(read(player, 'catalogue-context-0', undefined, true, context), one, 'repeated full route requests must reuse the current matrix');
});

check('country order and route completeness remain authoritative for opening rights coverage', () => {
    const player = fixture(1);
    const id = 'catalogue-context-0';
    const context = createContext(player);
    const full = read(player, id, ['US', 'IN'], true, context);
    assert.equal(full.available, true);
    assert.equal(full.status, 'READY');
    assert.deepEqual(full.coveredCountryIds, ['US', 'IN']);
    assert.equal(full.routesByCountry.US.SUBSCRIPTION.allowed, true);
    assert.equal(full.routesByCountry.IN.SUBSCRIPTION.allowed, true);
    assert.equal(full.routesByCountry.US.RENTAL.allowed, false);
    assert.deepEqual(Object.keys(read(player, id, ['IN'], true, context).routesByCountry), ['IN']);
    assert.deepEqual(read(player, id, ['US'], false, context).routesByCountry, {});
    assert.equal(read(player, id, ['US'], true, context).routesByCountry.US.SUBSCRIPTION.allowed, true);
});

check('opening launch gates retain full offer-route coverage when title-level rights are available', () => {
    const player = fixture(1);
    assert.equal(getStreamingOpeningCatalogueView(player, createContext(player)).rightsReadyCountryCount, 197);
    player.ownedStreamingPlatform.catalogLicenses[0].accessGrant!.modes = ['RENTAL'];
    assert.equal(read(player, 'catalogue-context-0', ['US'], false).available, true,
        'an active title-level licence alone does not prove that the saved offer can play it');
    const blocked = getStreamingOpeningCatalogueView(player, createContext(player));
    assert.equal(blocked.rightsReadyCountryCount, 0);
    assert.equal(blocked.rightsReady, false);
    assert.equal(blocked.countries.find(country => country.countryId === 'US')!.launchGateReady, false);
});

check('fresh reads honor in-place pricing, canonical grants, territory, and week changes', () => {
    const player = fixture(1);
    const id = 'catalogue-context-0';
    const licence = player.ownedStreamingPlatform.catalogLicenses[0];
    const contract = createStreamingRightsContractFromLicense({ license: licence,
        buyer: { type: 'PLAYER_PLATFORM', id: player.ownedStreamingPlatform.identity!.slug, name: 'Empire+', platformId: null },
        guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) });
    player.world.streamingRightsContracts = { [contract.id]: contract };
    const allowed = () => read(player, id, ['US'], true).routesByCountry.US.SUBSCRIPTION.allowed;
    assert.equal(allowed(), true);
    createContext(player); // An unused or previously consumed UI context must not install a hidden global cache.
    player.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        player.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'STORE' });
    assert.equal(allowed(), false);
    assert.equal(read(player, id, ['US'], true, createContext(player)).routesByCountry.US.SUBSCRIPTION.allowed, false);
    player.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        player.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
    contract.accessGrant!.modes = ['RENTAL'];
    assert.equal(allowed(), false);
    contract.accessGrant!.modes = ['SUBSCRIPTION'];
    contract.territory = 'DOMESTIC'; contract.countryIds = ['IN'];
    assert.equal(allowed(), false);
    contract.countryIds = ['US']; assert.equal(allowed(), true);
    contract.expiresAtAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek) + 1;
    player.currentWeek += 1;
    assert.equal(allowed(), false);
    assert.equal(read(player, id, ['US'], true, createContext(player)).routesByCountry.US.SUBSCRIPTION.allowed, false);
});

check('a context from another player snapshot cannot mask changed rights', () => {
    const player = fixture(1);
    const context = createContext(player);
    assert.equal(read(player, 'catalogue-context-0', ['US'], true, context).available, true);
    const next = structuredClone(player);
    next.ownedStreamingPlatform.catalogLicenses[0].expiresAtAbsoluteWeek = 0;
    assert.equal(read(next, 'catalogue-context-0', ['US'], true, context).available, false);
});

check('one worldwide licensed read reuses identical active-country decisions while fresh territorial grants stay separate', () => {
    const player = fixture(1);
    const context = createContext(player);
    const readRoute = createStreamingTitleRouteReadBatch(player, context.absoluteWeek, context.platform, new Set());
    const decisions = context.packageCountryIds.map(country => readRoute('catalogue-context-0', country,
        { kind: 'SUBSCRIPTION', planId: context.offer.subscriptions[0].id }));
    assert.ok(decisions.every(row => row.allowed));
    assert.equal(new Set(decisions).size, 1, 'a worldwide licence must not allocate 197 equivalent route decisions');
    assert.equal(readRoute('catalogue-context-0', 'NOT_A_MARKET',
        { kind: 'SUBSCRIPTION', planId: context.offer.subscriptions[0].id }).allowed, false);
    const licence = player.ownedStreamingPlatform.catalogLicenses[0];
    const contract = createStreamingRightsContractFromLicense({ license: licence,
        buyer: { type: 'PLAYER_PLATFORM', id: player.ownedStreamingPlatform.identity!.slug, name: 'Empire+', platformId: null },
        guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: context.absoluteWeek });
    contract.territory = 'DOMESTIC'; contract.countryIds = ['IN'];
    player.world.streamingRightsContracts = { [contract.id]: contract };
    const territorial = createStreamingTitleRouteReadBatch(player, context.absoluteWeek, createContext(player).platform, new Set());
    assert.equal(territorial('catalogue-context-0', 'US', { kind: 'SUBSCRIPTION', planId: context.offer.subscriptions[0].id }).allowed, false);
    assert.equal(territorial('catalogue-context-0', 'IN', { kind: 'SUBSCRIPTION', planId: context.offer.subscriptions[0].id }).allowed, true);
});

check('a bounded viewer preview checks only its eight playable titles without full route matrices', () => {
    const player = fixture(52);
    const context = createContext(player);
    const preview = getStreamingPlayableCatalogProjectIds(player, context, 8);
    assert.deepEqual(preview, Array.from({ length: 8 }, (_, index) => `catalogue-context-${index}`));
    assert.ok(context.availability.size <= 8, 'an eight-title preview must not prepare the remaining library');
    assert.ok([...context.availability.values()].every(row => Object.keys(row.routesByCountry).length === 0),
        'playable ID projection must short-circuit canonical routes instead of allocating every country matrix');
});

check('short-circuit viewer projection equals full current route decisions after canonical grant changes', () => {
    const player = fixture(4);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const licence = player.ownedStreamingPlatform.catalogLicenses[0];
    const contract = createStreamingRightsContractFromLicense({ license: licence,
        buyer: { type: 'PLAYER_PLATFORM', id: player.ownedStreamingPlatform.identity!.slug, name: 'Empire+', platformId: null },
        guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week });
    player.world.streamingRightsContracts = { [contract.id]: contract };
    const expected = () => player.ownedStreamingPlatform.catalogProjectIds.filter(id => {
        const row = read(player, id);
        return row.available && Object.values(row.routesByCountry).some(routes => Object.values(routes).some(route => route.allowed));
    });
    assert.deepEqual(getStreamingPlayableCatalogProjectIds(player), expected());
    contract.accessGrant!.modes = [];
    assert.deepEqual(getStreamingPlayableCatalogProjectIds(player), ['catalogue-context-1', 'catalogue-context-2', 'catalogue-context-3']);
    assert.deepEqual(getStreamingPlayableCatalogProjectIds(player), expected());
    contract.accessGrant!.modes = ['SUBSCRIPTION']; contract.territory = 'DOMESTIC'; contract.countryIds = ['IN'];
    assert.deepEqual(getStreamingPlayableCatalogProjectIds(player), expected());
    player.ownedStreamingPlatform.marketOperations = player.ownedStreamingPlatform.marketOperations.filter(row => row.countryId === 'US');
    player.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US'];
    assert.deepEqual(getStreamingPlayableCatalogProjectIds(player), expected());
});

if (process.argv.includes('--hash')) {
    const player = fixture(52);
    const payload = [player.ownedStreamingPlatform.catalogProjectIds.map(id => read(player, id)), getStreamingOpeningCatalogueView(player),
        createCanonicalContentDeskState(player), createCanonicalViewerState(player)];
    console.log(`OUTPUT_HASH ${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`);
}
console.log(JSON.stringify({ passed, failed: failures.length }));
if (failures.length) process.exitCode = 1;
