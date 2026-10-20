import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Player } from '../types';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createStreamingCatalogueReadContext, getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';
import { createC6QaCareer } from '../lab/c6QaCareer';

const fixture = (count = 1, countryIds?: string[]) => {
    const player = filedMarketFixture(countryIds);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = player.ownedStreamingPlatform;
    platform.serviceConfiguration.pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing,
        { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
    for (let index = 0; index < count; index++) {
        const id = `opening-batch-${index}`;
        const licence = addStreamingAuditCatalogueTitle(player, week, id);
        const contract = createStreamingRightsContractFromLicense({ license: licence,
            buyer: { type: 'PLAYER_PLATFORM', id: platform.identity!.slug, name: platform.identity!.name, platformId: null },
            guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week - 4 });
        player.world.streamingRightsContracts![contract.id] = contract;
        platform.catalogProjectIds.push(id);
    }
    platform.starterCatalog = { packageId: 'BROAD_APPEAL', ownedProjectIds: [], licensedProjectIds: platform.catalogProjectIds.slice() } as any;
    return player;
};
const cases = (): Record<string, Player> => {
    const fiftyTwo = fixture(52);
    fiftyTwo.ownedStreamingPlatform.localizationOperations.titleLanguageAssets = [
        { id: 'first-hindi', titleId: 'opening-batch-0', languageId: 'Hindi', subtitleReady: true, dubReady: false, readyAtAbsoluteWeek: 0 },
        { id: 'duplicate-hindi', titleId: 'opening-batch-0', languageId: 'hindi', subtitleReady: false, dubReady: true, readyAtAbsoluteWeek: 0 },
        { id: 'french', titleId: 'opening-batch-1', languageId: 'French', subtitleReady: false, dubReady: true, readyAtAbsoluteWeek: 0 },
    ];
    const denied = fixture(1, ['US', 'IN']);
    Object.values(denied.world.streamingRightsContracts!).find(contract => contract.sourceProjectId === 'opening-batch-0')!.accessGrant!.modes = ['RENTAL'];
    const fallback = fixture(1, ['US', 'IN']);
    const platform = fallback.ownedStreamingPlatform;
    const week = getAbsoluteWeek(fallback.age, fallback.currentWeek);
    platform.serviceConfiguration.pricing.plans = [
        { id: 'BASIC', name: 'Basic', monthly: 5, featureIds: [], ads: false },
        { id: 'EARLY', name: 'Early', monthly: 10, featureIds: ['early'], ads: false },
    ];
    platform.serviceConfiguration.pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing,
        { kind: 'BENEFIT', offer: 'PLAN', planId: 'EARLY', premiumAccess: true, earlyAccessWeeks: 4 });
    Object.values(fallback.world.streamingRightsContracts!).find(contract => contract.sourceProjectId === 'opening-batch-0')!.accessGrant!.earlyWindowWeeks = 4;
    platform.launchCommit = { id: 'future-launch', idempotencyKey: 'future-launch', committedAtAbsoluteWeek: week } as any;
    platform.launchSlate = { entries: [{ id: 'future-entry', projectId: 'opening-batch-0', title: 'Future premiere',
        source: 'LICENSED_WINDOW', projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 3,
        releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'LEAN' }] } as any;
    const freeAds = fixture(1, ['US', 'IN']);
    freeAds.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        freeAds.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'ADVERTISING' });
    Object.values(freeAds.world.streamingRightsContracts!).find(contract => contract.sourceProjectId === 'opening-batch-0')!.accessGrant!.modes = ['AD_SUPPORTED'];
    const noPlayableOffer = fixture(1, ['US', 'IN']);
    noPlayableOffer.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        noPlayableOffer.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'STORE' });
    Object.values(noPlayableOffer.world.streamingRightsContracts!).find(contract => contract.sourceProjectId === 'opening-batch-0')!.accessGrant!.modes = ['SUBSCRIPTION'];
    const original = createC6QaCareer();
    const values = { fiftyTwo, denied, fallback, freeAds, noPlayableOffer, original };
    const stressPath = process.argv.find(value => value.startsWith('--stress-player='))?.split('=').slice(1).join('=');
    return stressPath ? { ...values, stress1040: JSON.parse(readFileSync(stressPath, 'utf8')) as Player } : values;
};
const inputs = cases();
let passed = 0;
const failures: string[] = [];
const check = (name: string, run: () => void) => {
    try { run(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
};
check('all six complete coverage projections retain their pre-optimization output', () => {
    const outputs = Object.fromEntries(Object.entries(inputs).filter(([name]) => name !== 'stress1040')
        .map(([name, player]) => [name, getStreamingOpeningCatalogueView(player)]));
    assert.equal(createHash('sha256').update(JSON.stringify(outputs)).digest('hex'),
        'bff78869a51f37ccc23fddc80bd02e1023490ed6db7c24126d67e0056f012f57');
});
check('opening coverage keeps canonical grant denials and the first subscription denial explanation', () => {
    const view = getStreamingOpeningCatalogueView(inputs.denied);
    assert.equal(view.titles[0].available, true);
    assert.equal(view.rightsReadyCountryCount, 0);
    assert.equal(view.countries.find(country => country.countryId === 'US')!.missingRightsDetails[0],
        'Granted Audit Film: Offer not included in the rights agreement');
});
check('a later subscription plan can provide the country route when the first plan cannot', () => {
    const access = getStreamingContentAvailability(inputs.fallback, 'opening-batch-0', ['US', 'IN']);
    assert.equal(access.routesByCountry.US['SUBSCRIPTION:BASIC'].allowed, false);
    assert.equal(access.routesByCountry.US['SUBSCRIPTION:EARLY'].allowed, true);
    assert.equal(getStreamingOpeningCatalogueView(inputs.fallback).rightsReadyCountryCount, 2);
});
check('free-ad fallback remains playable without any subscription plan', () => {
    assert.equal(getStreamingOpeningCatalogueView(inputs.freeAds).rightsReadyCountryCount, 2);
});
check('store-only configuration cannot turn a subscription grant into an offered route', () => {
    const view = getStreamingOpeningCatalogueView(inputs.noPlayableOffer);
    assert.equal(view.rightsReadyCountryCount, 0);
    assert.equal(view.countries.find(country => country.countryId === 'US')!.missingRightsDetails[0], 'Granted Audit Film: No playable offer here');
});
check('opening coverage does not allocate full per-country route maps that its output never exposes', () => {
    const player = fixture(52);
    const context = createStreamingCatalogueReadContext(player);
    assert.equal(getStreamingOpeningCatalogueView(player, context).titles.length, 52);
    const routeMaps = [...context.availability.values()].reduce((sum, row) => sum + Object.keys(row.routesByCountry).length, 0);
    assert.equal(routeMaps, 0, `opening coverage materialized ${routeMaps} unused country route maps`);
});

const goldenPath = process.argv.find(value => value.startsWith('--write-golden='))?.split('=').slice(1).join('=');
const comparisonPath = process.argv.find(value => value.startsWith('--compare-golden='))?.split('=').slice(1).join('=');
if (goldenPath || comparisonPath) {
    const outputs = Object.fromEntries(Object.entries(inputs).map(([name, player]) => [name, getStreamingOpeningCatalogueView(player)]));
    if (goldenPath) writeFileSync(goldenPath, JSON.stringify(outputs));
    if (comparisonPath) check('all complete coverage outputs match the captured pre-optimization views', () => {
        assert.deepEqual(outputs, JSON.parse(readFileSync(comparisonPath, 'utf8')));
    });
    console.log(JSON.stringify({ fullCoverageHash: createHash('sha256').update(JSON.stringify(outputs)).digest('hex'),
        counts: Object.fromEntries(Object.entries(outputs).map(([name, view]) => [name, { titles: view.titles.length, countries: view.countries.length }])) }));
}
console.log(JSON.stringify({ passed, failed: failures.length }));
if (failures.length) process.exitCode = 1;
