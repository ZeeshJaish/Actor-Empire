import assert from 'node:assert/strict';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { prepareTrustedMarketUpdateForUi } from '../services/playerUiState';
import { reuseStreamingPresentationSource } from '../services/streamingPresentationInputs';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction, advanceStreamingBuyerAuction, placeStreamingBuyerAuctionBid } from '../services/streamingBuyerAuctions';
import { createDefaultStreamingInfrastructureDraft } from '../services/streamingInfrastructure';
import { getStreamingBuildMarketAccess } from '../services/streamingBuildMarketAccess';

const player = prepareTrustedMarketUpdateForUi(filedMarketFixture());
const updated = (patch: object) => prepareTrustedMarketUpdateForUi({ ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, ...patch } });
const draftOnly = updated({ contentMarketDraft: { tab: 'ALL', search: 'night', selectedId: null, ownedIds: [] } });
assert.ok(reuseStreamingPresentationSource(player, draftOnly) === player, 'A query/draft save must not rebuild HQ read models.');
assert.ok(reuseStreamingPresentationSource(player, prepareTrustedMarketUpdateForUi(player), 'WIZARD') === player,
    'Normal trusted UI sanitation must not invalidate unchanged reads.');
const cash = updated({ treasuryCash: player.ownedStreamingPlatform.treasuryCash - 100 });
assert.equal(reuseStreamingPresentationSource(player, cash), cash, 'Cash changes must invalidate finance reads.');
const rights = { ...player, world: { ...player.world, streamingRightsContracts: { ...player.world.streamingRightsContracts, newContract: { id: 'newContract' } as any } } };
assert.equal(reuseStreamingPresentationSource(player, rights), rights, 'Canonical rights changes must invalidate readers.');
const pricing = updated({ serviceConfiguration: { ...player.ownedStreamingPlatform.serviceConfiguration,
    revision: player.ownedStreamingPlatform.serviceConfiguration.revision + 1 } });
assert.equal(reuseStreamingPresentationSource(player, pricing), pricing, 'Configuration changes must invalidate readers.');
const week = { ...player, currentWeek: player.currentWeek + 1 };
assert.equal(reuseStreamingPresentationSource(player, week), week, 'Week changes must invalidate windows/readiness.');
const future = updated({ futureCanonicalField: 1 });
assert.equal(reuseStreamingPresentationSource(player, future), future, 'Future canonical fields must not be silently ignored.');
const markets = updated({ marketOperations: player.ownedStreamingPlatform.marketOperations.slice(1) });
const world = { ...player, world: { ...player.world, projects: player.world.projects.slice(1) } };
assert.equal(reuseStreamingPresentationSource(player, markets), markets, 'A changed market footprint must invalidate readers.');
assert.equal(reuseStreamingPresentationSource(player, world), world, 'A changed game world must invalidate readers.');
const lot = getStreamingBuyerAuctionLots(player).find(row => row.listingKind === 'TITLE')!;
const opened = openStreamingBuyerAuction(player, lot.id, 1_000);
assert.ok(opened.session);
const source = prepareTrustedMarketUpdateForUi(opened.player);
const tick = advanceStreamingBuyerAuction(source, opened.session!.id, 4, 5_000);
assert.ok(tick.changed);
const tickUi = prepareTrustedMarketUpdateForUi(tick.player);
assert.ok(reuseStreamingPresentationSource(source, tickUi) === source, 'Clock/AI updates must not recompute hidden catalogue models.');
const submitted = placeStreamingBuyerAuctionBid(source, opened.session!.id, {
    minimumGuarantee: opened.session!.lot.minimumGuarantee + opened.session!.lot.minimumBidIncrement * 2,
    licensorRevenueShare: 0, marketingGuarantee: 0, futureGreenlight: false,
}, 1_001);
assert.ok(submitted.changed, submitted.detail);
assert.ok(reuseStreamingPresentationSource(source, submitted.player) === submitted.player,
    'A player bid/reservation must invalidate monetary projections.');
const unknownSession = { ...source, ownedStreamingPlatform: { ...source.ownedStreamingPlatform,
    buyerAuctionSessions: source.ownedStreamingPlatform.buyerAuctionSessions.map(row => ({ ...row, futureFinancialState: 1 })) } };
assert.ok(reuseStreamingPresentationSource(source, unknownSession) === unknownSession, 'Future auction financial fields must invalidate.');
const networkBase = updated({ infrastructureSetupDraft: createDefaultStreamingInfrastructureDraft(player) });
const networkDraftOnly = updated({ infrastructureSetupDraft: {
    ...networkBase.ownedStreamingPlatform.infrastructureSetupDraft!, currentStep: 2,
} });
assert.equal(reuseStreamingPresentationSource(networkBase, networkDraftOnly, 'BUILD_FORECAST'), networkBase,
    'Uncommissioned network drawings cannot alter the world customer forecast.');
const withoutDraft = { ...networkBase, ownedStreamingPlatform: { ...networkBase.ownedStreamingPlatform, infrastructureSetupDraft: null } };
assert.equal(getStreamingBuildMarketAccess(withoutDraft).source, 'FILED_OPERATIONS');
assert.equal(getStreamingBuildMarketAccess(withoutDraft).countryIds.length, 197);
assert.equal(reuseStreamingPresentationSource(withoutDraft, networkBase, 'BUILD_FORECAST'), withoutDraft,
    'The first network drawing must not invalidate the unchanged 197-country filed footprint.');
assert.equal(reuseStreamingPresentationSource(networkBase, withoutDraft, 'BUILD_FORECAST'), networkBase,
    'Removing a drawing must not invalidate an unchanged filed footprint.');
const legacy = { ...player, ownedStreamingPlatform: {
    ...player.ownedStreamingPlatform,
    identity: { ...player.ownedStreamingPlatform.identity!, dayOneMarketIds: ['US', 'IN'] },
    marketOperations: player.ownedStreamingPlatform.marketOperations.filter(operation => ['US', 'IN'].includes(operation.countryId!))
        .map(operation => ({ ...operation, source: 'LEGACY_DAY_ONE' as const, status: 'PLANNED' as const,
            committedAtAbsoluteWeek: null, clearance: null })),
    infrastructureSetupDraft: null, infrastructureSetup: null, pendingInfrastructureSetup: null,
} };
const legacyWithDraft = { ...legacy, ownedStreamingPlatform: {
    ...legacy.ownedStreamingPlatform, infrastructureSetupDraft: networkBase.ownedStreamingPlatform.infrastructureSetupDraft,
} };
assert.equal(getStreamingBuildMarketAccess(legacy).source, 'NONE');
assert.equal(getStreamingBuildMarketAccess(legacyWithDraft).source, 'LEGACY_OPENING_IDS');
assert.deepEqual(getStreamingBuildMarketAccess(legacyWithDraft).countryIds, ['IN', 'US']);
assert.equal(reuseStreamingPresentationSource(legacy, legacyWithDraft, 'BUILD_FORECAST'), legacyWithDraft,
    'The first drawing must invalidate a true legacy opening footprint when it exposes inherited countries.');
for (const changed of [cash, rights, pricing, week, future, markets, world]) assert.equal(
    reuseStreamingPresentationSource(player, changed, 'BUILD_FORECAST'), changed,
    'Build forecast reuse must invalidate canonical economy/rights/configuration changes.');
assert.equal(reuseStreamingPresentationSource(player, networkDraftOnly), networkDraftOnly,
    'Normal HQ/readiness must still see the current network drawing.');
console.log(JSON.stringify({ passed: 19 }));
