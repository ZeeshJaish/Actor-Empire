import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import type { Player } from '../types';
import { createStreamingCatalogueReadContext, getStreamingContentAvailability, resolveStreamingCatalogueReadTitle, createStreamingTitleRouteReadBatch, evaluatePlayerStreamingTitleRoute } from '../services/streamingContentAvailability';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { forecastWorldStreamingLaunchPricing, forecastWorldStreamingBuildDemand } from '../services/worldEconomy/worldStreamingPricingForecast';
import { reuseStreamingPresentationSource } from '../services/streamingPresentationInputs';
import { streamingTitleQuality } from '../services/worldEconomy/worldStreamingContentValue';
import { resolveStreamingCatalogTitle } from '../services/streamingCatalog';
const full = JSON.parse(readFileSync('/tmp/streaming-stress-5000-player.json', 'utf8')) as Player;
const small = structuredClone(full);
small.ownedStreamingPlatform.catalogLicenses = small.ownedStreamingPlatform.catalogLicenses.slice(0, 12);
small.ownedStreamingPlatform.catalogProjectIds = small.ownedStreamingPlatform.catalogLicenses.map(row => row.sourceProjectId);
small.ownedStreamingPlatform.starterCatalog = null;
small.world.projects = small.world.projects.slice(0, 20);
small.ownedStreamingPlatform.identity!.dayOneMarketIds = ['US', 'CA'];
small.ownedStreamingPlatform.marketOperations = small.ownedStreamingPlatform.marketOperations.filter(row => row.countryId === 'US' || row.countryId === 'CA');
const failures: string[] = [];
const check = (name: string, test: () => void) => { try { test(); console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.error(`FAIL ${name}: ${(error as Error).message}`); } };
check('batch converts world titles once and groups licences once', () => {
    const player = structuredClone(small);
    let conversions = 0; let visits = 0;
    player.world.projects.forEach(project => { const genre = project.genre; Object.defineProperty(project, 'genre', { get: () => { conversions++; return genre; }, enumerable: true }); });
    player.ownedStreamingPlatform.catalogLicenses.forEach(license => { const id = license.sourceProjectId; Object.defineProperty(license, 'sourceProjectId', { get: () => { visits++; return id; }, enumerable: true }); });
    const context = createStreamingCatalogueReadContext(player);
    for (const id of player.ownedStreamingPlatform.catalogProjectIds) getStreamingContentAvailability(player, id, ['US', 'CA'], true, context);
    assert.ok(conversions <= player.world.projects.length, `world conversions ${conversions} > ${player.world.projects.length}`);
    assert.ok(visits <= player.ownedStreamingPlatform.catalogLicenses.length * 5, `licence visits ${visits} exceed bounded grouping`);
});
check('all source precedence and current routes equal independent fresh defaults', () => {
    const player = structuredClone(small);
    const world = player.world.projects[0];
    player.pastProjects.push({ ...world, id: world.id, name: 'Career duplicate', projectType: 'MOVIE', studioId: world.studioId } as any);
    const context = createStreamingCatalogueReadContext(player);
    const ids = [...player.ownedStreamingPlatform.catalogProjectIds, ...player.world.projects.map(row => row.id), ...player.pastProjects.map(row => row.id), 'missing'];
    const read = createStreamingTitleRouteReadBatch(player, context.absoluteWeek, context.platform, new Set());
    for (const id of ids) {
        assert.deepEqual(resolveStreamingCatalogueReadTitle(context, id), resolveStreamingCatalogTitle(player, id));
        assert.deepEqual(getStreamingContentAvailability(player, id, ['US', 'CA'], true, context), getStreamingContentAvailability(player, id, ['US', 'CA']));
        for (const country of ['US', 'CA', 'IN']) for (const route of [{ kind: 'RENTAL' }, { kind: 'PURCHASE' }, { kind: 'AD_SUPPORTED' }, { kind: 'SUBSCRIPTION', planId: context.offer.subscriptions[0]?.id || '' }] as const)
            assert.deepEqual(read(id, country, route), evaluatePlayerStreamingTitleRoute(player, id, country, context.absoluteWeek, route, { platform: context.platform, ownedTitleIds: new Set() }));
    }
});
check('title source precedence retains owned, world, career, commission and licence snapshots', () => {
    const player = structuredClone(small);
    player.businesses.push({ id: 'index-owned-studio', type: 'PRODUCTION_HOUSE', name: 'Index Studio' } as any);
    const world = player.world.projects[0]; const past = player.pastProjects[0];
    player.world.projects.push({ ...world, id: 'owned-precedence', title: 'Wrong world', studioId: 'outside' }, { ...world, id: 'world-precedence', title: 'World wins', studioId: 'outside' });
    player.pastProjects.push({ ...past, id: 'owned-precedence', name: 'Owned wins', studioId: 'index-owned-studio' }, { ...past, id: 'world-precedence', name: 'Wrong career', studioId: 'outside' }, { ...past, id: 'career-only', name: 'Career wins', studioId: 'outside' });
    player.ownedStreamingPlatform.originalCommissions.push({ ...player.ownedStreamingPlatform.originalCommissions[0], id: 'index-commission', canonicalProjectId: 'commission-only', title: 'Commission wins', projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: 'index-owned-studio', producerStudioName: 'Index Studio' } as any);
    player.ownedStreamingPlatform.catalogLicenses.push({ ...player.ownedStreamingPlatform.catalogLicenses[0], id: 'index-licence', sourceProjectId: 'licence-only', titleAtSigning: 'Licence wins' });
    const context = createStreamingCatalogueReadContext(player);
    for (const [id, title] of [['owned-precedence', 'Owned wins'], ['world-precedence', 'World wins'], ['career-only', 'Career wins'], ['commission-only', 'Commission wins'], ['licence-only', 'Licence wins']]) {
        assert.equal(resolveStreamingCatalogueReadTitle(context, id)?.title, title);
        assert.deepEqual(resolveStreamingCatalogueReadTitle(context, id), resolveStreamingCatalogTitle(player, id));
    }
});
check('territorial route batch preserves overlapping-contract denial precedence', () => {
    const player = structuredClone(small); const week = createStreamingCatalogueReadContext(player).absoluteWeek;
    const id = 'territorial-overlap';
    const template = player.ownedStreamingPlatform.catalogLicenses.at(-1)!;
    player.ownedStreamingPlatform.catalogLicenses = [
        { ...template, id: 'route-ca', sourceProjectId: id, territory: 'MULTI_REGION', countryIds: ['CA'], startsAtAbsoluteWeek: week - 1, expiresAtAbsoluteWeek: week + 20, status: 'ACTIVE' },
        { ...template, id: 'route-us', sourceProjectId: id, territory: 'DOMESTIC', countryIds: ['US'], startsAtAbsoluteWeek: week - 2, expiresAtAbsoluteWeek: week + 10, status: 'ACTIVE' },
    ];
    const context = createStreamingCatalogueReadContext(player);
    const read = createStreamingTitleRouteReadBatch(player, week, context.platform, new Set(), context);
    for (const country of ['US', 'CA', 'IN', 'MX']) for (const route of [{ kind: 'RENTAL' }, { kind: 'PURCHASE' }, { kind: 'AD_SUPPORTED' }, { kind: 'SUBSCRIPTION', planId: context.offer.subscriptions[0]?.id || '' }] as const)
        assert.deepEqual(read(id, country, route), evaluatePlayerStreamingTitleRoute(player, id, country, week, route, { platform: context.platform, ownedTitleIds: new Set() }));
    const proposal = { ...context.platform, catalogLicenses: [] };
    const proposedRead = createStreamingTitleRouteReadBatch(player, week, proposal, new Set(), context);
    assert.deepEqual(proposedRead(id, 'US', { kind: 'RENTAL' }), evaluatePlayerStreamingTitleRoute(player, id, 'US', week, { kind: 'RENTAL' }, { platform: proposal, ownedTitleIds: new Set() }), 'mismatched platform proposal must use current proposed licences');

});
check('historical quality fallback prepares saved releases once per batch', () => {
    const player = structuredClone(small); let visits = 0;
    player.world.projects.forEach(project => { const year = project.year; Object.defineProperty(project, 'year', { get: () => { visits++; return year; }, enumerable: true }); });
    const context = createStreamingCatalogueReadContext(player);
    visits = 0;
    for (let i = 0; i < 12; i++) assert.equal(streamingTitleQuality(player, `missing-${i}`, context), 60);
    assert.ok(visits <= player.world.projects.length * 2, `historical saved-release conversions ${visits} exceed one pass`);
});
check('step-only comparison does not serialize unchanged licence records and unknown inputs invalidate', () => {
    const player = structuredClone(small); let visits = 0;
    player.ownedStreamingPlatform.catalogLicenses.forEach(row => { const value = row.minimumGuarantee; Object.defineProperty(row, 'minimumGuarantee', { get: () => { visits++; return value; }, enumerable: true }); });
    const changed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, launchProgram: { ...player.ownedStreamingPlatform.launchProgram, defineCurrentStep: 'IDENTITY' as const } } };
    assert.strictEqual(reuseStreamingPresentationSource(player, changed, 'BUILD_FORECAST'), player);
    assert.equal(visits, 0, `unchanged licence records serialized ${visits} times`);
    const unknown = { ...changed, ownedStreamingPlatform: { ...changed.ownedStreamingPlatform, futureCanonicalInput: { value: 1 } } as any };
    assert.strictEqual(reuseStreamingPresentationSource(player, unknown, 'BUILD_FORECAST'), unknown);
    assert.strictEqual(reuseStreamingPresentationSource(unknown, player, 'BUILD_FORECAST'), player);
    const nested = { ...unknown, ownedStreamingPlatform: { ...unknown.ownedStreamingPlatform, futureCanonicalInput: { value: 2 } } as any };
    assert.strictEqual(reuseStreamingPresentationSource(unknown, nested, 'BUILD_FORECAST'), nested);
});
check('same forecast result reused across step and network draft changes', () => {
    const player = structuredClone(small); const context = createStreamingCatalogueReadContext(player);
    const forecast = forecastWorldStreamingLaunchPricing(player, context.platform.serviceConfiguration.pricing, ['US'], context);
    const changed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, infrastructureSetupDraft: { ...player.ownedStreamingPlatform.infrastructureSetupDraft, revision: 999 } as any, launchProgram: { ...player.ownedStreamingPlatform.launchProgram, defineCurrentStep: 'IDENTITY' as const } } };
    const next = createStreamingCatalogueReadContext(changed, context);
    assert.strictEqual(forecastWorldStreamingLaunchPricing(changed, next.platform.serviceConfiguration.pricing, ['US'], next), forecast);
    assert.notStrictEqual(forecastWorldStreamingLaunchPricing(changed, next.platform.serviceConfiguration.pricing, ['CA'], next), forecast);
});
check('dependent mutations invalidate current projections and defaults remain fresh', () => {
    const player = structuredClone(small); const previous = createStreamingCatalogueReadContext(player);
    getStreamingOpeningCatalogueView(player, previous);
    const mutators: Array<[string, (p: Player) => void]> = [
        ['expiry', p => { p.ownedStreamingPlatform.catalogLicenses[0].expiresAtAbsoluteWeek = 0; }],
        ['rights', p => { p.world.streamingRightsContracts = { ...p.world.streamingRightsContracts, changed: { ...Object.values(p.world.streamingRightsContracts || {})[0], id: 'changed', sourceProjectId: p.ownedStreamingPlatform.catalogProjectIds[0], status: 'EXPIRED' } as any }; }],
        ['country', p => { p.ownedStreamingPlatform.identity!.dayOneMarketIds = ['IN']; p.ownedStreamingPlatform.marketOperations = []; }],
        ['offer', p => { p.ownedStreamingPlatform.serviceConfiguration.pricing.streams = []; }],
        ['production', p => { p.world.industryProductions = { ...p.world.industryProductions, unfinished: { id: 'unfinished', canonicalProjectId: p.ownedStreamingPlatform.catalogProjectIds[0], status: 'IN_PRODUCTION' } as any }; }],
        ['world', p => { p.world.projects[0].title = 'Current world title'; }],
        ['localization', p => { p.ownedStreamingPlatform.localizationOperations.titleLanguageAssets = []; p.ownedStreamingPlatform.technologyLevels.CONTENT_OPERATIONS += 1; }],
        ['commissioned network', p => { p.ownedStreamingPlatform.infrastructureSetup = { ...(p.ownedStreamingPlatform.infrastructureSetup || {}), reliabilityTarget: 99, facilities: [] } as any; }],
        ['pending network', p => { p.ownedStreamingPlatform.pendingInfrastructureSetup = { ...(p.ownedStreamingPlatform.infrastructureSetup || {}), reliabilityTarget: 60, facilities: [] } as any; }],
        ['week', p => { p.currentWeek += 1; }],
        ['pricing', p => { p.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].monthly += 2; }],
    ];
    const initialForecast = forecastWorldStreamingLaunchPricing(player, previous.platform.serviceConfiguration.pricing, ['US'], previous);
    for (const [name, mutate] of mutators) {
        const changed = structuredClone(player); mutate(changed);
        const current = createStreamingCatalogueReadContext(changed, previous);
        // Some fixture defaults (e.g. an already empty asset list) can be equal.
        assert.deepEqual(getStreamingOpeningCatalogueView(changed, current), getStreamingOpeningCatalogueView(changed), name);
        const forecast = forecastWorldStreamingLaunchPricing(changed, current.platform.serviceConfiguration.pricing, ['US'], current);
        assert.deepEqual(forecast, forecastWorldStreamingLaunchPricing(changed, current.platform.serviceConfiguration.pricing, ['US']), `${name} forecast`);
        assert.notStrictEqual(forecast, initialForecast, `${name} invalidates forecast result`);
        assert.deepEqual(forecastWorldStreamingLaunchPricing(changed, current.platform.serviceConfiguration.pricing, ['US'], previous), forecast, `${name} mismatched context`);
    }
    const id = 'fresh-default-licensed';
    player.ownedStreamingPlatform.catalogLicenses = [{ ...player.ownedStreamingPlatform.catalogLicenses.at(-1)!, sourceProjectId: id, territory: 'GLOBAL', status: 'ACTIVE', startsAtAbsoluteWeek: previous.absoluteWeek - 1, expiresAtAbsoluteWeek: previous.absoluteWeek + 1 }];
    assert.equal(getStreamingContentAvailability(player, id, ['US']).available, true);
    player.ownedStreamingPlatform.catalogLicenses[0].status = 'EXPIRED';
    assert.equal(getStreamingContentAvailability(player, id, ['US']).available, false);
});
if (process.env.STREAMING_5000_BENCH === '1') {
    const measure = <T>(name: string, read: () => T) => { const start = performance.now(); const value = read(); console.log(JSON.stringify({ name, ms: +(performance.now() - start).toFixed(1) })); return value; };
    const context = measure('5000 context cold', () => createStreamingCatalogueReadContext(full));
    const coverage = measure('5000 opening coverage cold', () => getStreamingOpeningCatalogueView(full, context));
    const forecast = measure('5000 build forecast cold', () => forecastWorldStreamingBuildDemand(full, context.platform.serviceConfiguration.pricing, context.packageCountryIds, context));
    const baseline = JSON.parse(readFileSync('/tmp/task1-baseline-projections.json', 'utf8'));
    assert.deepEqual(coverage, baseline.coverage, 'complete 5000 coverage parity'); assert.deepEqual(forecast, baseline.forecast, 'complete 5000 build forecast parity');
    const changed = { ...full, ownedStreamingPlatform: { ...full.ownedStreamingPlatform, launchProgram: { ...full.ownedStreamingPlatform.launchProgram, defineCurrentStep: 'IDENTITY' as const } } };
    const next = measure('5000 step context', () => createStreamingCatalogueReadContext(changed, context));
    assert.strictEqual(measure('5000 step coverage', () => getStreamingOpeningCatalogueView(changed, next)), coverage);
    measure('5000 step forecast', () => forecastWorldStreamingBuildDemand(changed, next.platform.serviceConfiguration.pricing, next.packageCountryIds, next));
}
assert.equal(failures.length, 0, `Failed: ${failures.join(', ')}`);
console.log('streaming 5000 indexed reads audit passed');
