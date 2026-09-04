import assert from 'node:assert/strict';
import type {
    IndustryProject,
    OwnedStreamingRightsNegotiation,
    PlatformAiContentSource,
    PlatformId,
    Player,
    StudioId,
    WorldState,
} from '../types';
import {
    buildPlatformContentCandidates,
    commitPlatformContentCandidate,
    normalizePlatformAiState,
    normalizeWorldPlatformAi,
    resolvePlatformLocalizationLevel,
} from '../services/platformAi';
import {
    createStreamingLicenseContract,
    fullCurrencyToMillions,
    migrateStreamingRightsContractRegistry,
    millionsToFullCurrency,
    validateStreamingRightsAvailability,
} from '../services/streamingRightsCore';
import { signStreamingRightsDeal } from '../services/streamingRightsMarketplace';
import { STUDIO_CATALOG } from '../services/studioLogic';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const ABSOLUTE_WEEK = 2_092;

const makeProject = (
    id: string,
    studioId: StudioId,
    title: string,
    genre: IndustryProject['genre'],
    boxOffice: number,
): IndustryProject => ({
    id,
    title,
    genre,
    mediaType: 'MOVIE',
    targetAudience: 'PG-13',
    studioId,
    budgetTier: 'MID',
    quality: 78,
    rating: 7.8,
    boxOffice,
    year: 39,
    weekReleased: 30,
    leadActorId: `lead-${id}`,
    leadActorName: `Lead ${id}`,
    directorName: `Director ${id}`,
    reviews: 'A strong release.',
});

const sourceProjects: IndustryProject[] = [
    makeProject('universal-1', 'UNIVERSAL', 'Night Ledger', 'THRILLER', 180_000_000),
    makeProject('universal-2', 'UNIVERSAL', 'Crown City', 'DRAMA', 130_000_000),
    makeProject('universal-3', 'UNIVERSAL', 'Paper City', 'CRIME', 90_000_000),
    makeProject('pixar-1', 'PIXAR', 'Cloudbound', 'ANIMATION', 420_000_000),
];

const createWorld = (player: Player): WorldState => normalizeWorldPlatformAi(
    player,
    { ...structuredClone(player.world), projects: structuredClone(sourceProjects) },
    ABSOLUTE_WEEK,
);

const withCanonicalRights = (player: Player, world: WorldState): WorldState => (
    migrateStreamingRightsContractRegistry({ ...player, world }).world
);

const candidateFor = <T extends PlatformAiContentSource>(
    candidates: ReturnType<typeof buildPlatformContentCandidates>,
    source: T,
) => {
    const candidate = candidates.find(item => item.source === source);
    assert.ok(candidate, `Expected a ${source} candidate.`);
    return candidate;
};

assert.equal(fullCurrencyToMillions(20_000_000), 20);
assert.equal(millionsToFullCurrency(20), 20_000_000);
assert.equal(millionsToFullCurrency(fullCurrencyToMillions(37_250_000)), 37_250_000);

const fixture = createPlatformAiFixture();
const world = createWorld(fixture);
const netflixInput = { player: fixture, world, platformId: 'NETFLIX' as const, absoluteWeek: ABSOLUTE_WEEK };
const netflixCandidatesA = buildPlatformContentCandidates(netflixInput);
const netflixCandidatesB = buildPlatformContentCandidates(netflixInput);

assert.deepEqual(netflixCandidatesA, netflixCandidatesB);
assert.ok(netflixCandidatesA.length >= 3 && netflixCandidatesA.length <= 6);
assert.ok(netflixCandidatesA.some(item => item.source === 'COMMISSIONED_ORIGINAL'));
assert.ok(netflixCandidatesA.some(item => item.source === 'LICENSED_RELEASED_TITLE'));
assert.ok(netflixCandidatesA.some(item => item.source === 'CATALOGUE_ACQUISITION'));
assert.ok(netflixCandidatesA.every(item => item.streamingWindow !== ('THEATRICAL' as never)));
assert.ok(netflixCandidatesA.filter(item => item.source === 'COMMISSIONED_ORIGINAL').every(item => (
    item.producerStudioId
    && STUDIO_CATALOG[item.producerStudioId]
    && STUDIO_CATALOG[item.producerStudioId].archetype !== 'PLATFORM'
)));
assert.ok(netflixCandidatesA.filter(item => item.source !== 'COMMISSIONED_ORIGINAL').every(item => (
    item.sourceProjectIds.length > 0
    && item.countryIds.length > 0
)));

const recentMarketProjects = Array.from({ length: 600 }, (_, index) => ({
    ...makeProject(
        `market-recent-${String(index).padStart(3, '0')}`,
        'UNIVERSAL',
        `Recent Market Title ${index}`,
        'DRAMA',
        10_000_000 + index,
    ),
    quality: 55,
    rating: 5.5,
}));
const oldBlockbuster = {
    ...makeProject('market-old-blockbuster', 'UNIVERSAL', 'Old Blockbuster', 'DRAMA', 2_000_000_000),
    quality: 100,
    rating: 10,
    year: 18,
    weekReleased: 1,
};
const recentMarketWorld = normalizeWorldPlatformAi(
    fixture,
    { ...structuredClone(fixture.world), projects: recentMarketProjects },
    ABSOLUTE_WEEK,
);
const marketWithOldBlockbuster = {
    ...structuredClone(recentMarketWorld),
    projects: [oldBlockbuster, ...structuredClone(recentMarketProjects)],
};
const recentMarketChoices = buildPlatformContentCandidates({
    player: fixture,
    world: recentMarketWorld,
    platformId: 'NETFLIX',
    absoluteWeek: ABSOLUTE_WEEK,
}).filter(candidate => candidate.source === 'LICENSED_RELEASED_TITLE').map(candidate => candidate.sourceProjectIds[0]);
const choicesWithOldBlockbuster = buildPlatformContentCandidates({
    player: fixture,
    world: marketWithOldBlockbuster,
    platformId: 'NETFLIX',
    absoluteWeek: ABSOLUTE_WEEK,
}).filter(candidate => candidate.source === 'LICENSED_RELEASED_TITLE').map(candidate => candidate.sourceProjectIds[0]);
assert.deepEqual(
    choicesWithOldBlockbuster,
    recentMarketChoices,
    'An old high-quality title outside the bounded rights-market universe must not alter candidate choice.',
);

const disneyCandidates = buildPlatformContentCandidates({
    player: fixture,
    world,
    platformId: 'DISNEY_PLUS',
    absoluteWeek: ABSOLUTE_WEEK,
});
const ownedTransfer = candidateFor(disneyCandidates, 'OWNED_STUDIO_TRANSFER');
assert.deepEqual(ownedTransfer.sourceProjectIds, ['pixar-1']);
assert.equal(ownedTransfer.rightsCostMillions, 0);

const original = candidateFor(netflixCandidatesA, 'COMMISSIONED_ORIGINAL');
const originalCommit = commitPlatformContentCandidate({ ...netflixInput, candidate: original });
assert.equal(originalCommit.changed, true);
assert.equal(originalCommit.world.projects.length, world.projects.length, 'An original brief must not create a project in Phase 2.');
assert.equal(originalCommit.plan?.status, 'BRIEF');
assert.equal(originalCommit.plan?.industryProductionId, null);
assert.equal(originalCommit.plan?.productionHoldStartedAtAbsoluteWeek, null);
assert.equal(originalCommit.plan?.releaseReadiness, null);
assert.equal('production' in originalCommit.plan!, false, 'Platform plans must reference producer-owned productions instead of nesting them.');
assert.ok(
    (originalCommit.plan?.localizationRequirements || []).every(requirement => (
        !Object.prototype.hasOwnProperty.call(requirement, 'sourceProjectId')
    )),
    'A commissioned-original localization promise must omit its not-yet-created source project ID.',
);
assert.equal(originalCommit.world.platforms?.NETFLIX.ai?.rightsContracts.length, 0);
const boundedSourcingWorld = structuredClone(world);
boundedSourcingWorld.platforms!.NETFLIX.ai!.decisionHistory = Array.from({ length: 100 }, (_, index) => ({
    id: `sourcing-history-${index}`,
    absoluteWeek: index,
    type: 'AUDIT_HISTORY',
    summary: `Decision ${index}`,
    reason: 'Fixture',
    cashImpactMillions: 0,
}));
const boundedSourcingCommit = commitPlatformContentCandidate({ ...netflixInput, world: boundedSourcingWorld, candidate: original });
assert.equal(boundedSourcingCommit.changed, true);
assert.equal(boundedSourcingCommit.world.platforms!.NETFLIX.ai!.decisionHistory.length, 40);
assert.equal(boundedSourcingCommit.world.platforms!.NETFLIX.ai!.decisionHistory[0].id, 'sourcing-history-61');
assert.equal(boundedSourcingCommit.world.platforms!.NETFLIX.ai!.decisionHistory.at(-1)?.type, 'CONTENT_COMMITMENT');

const licence = candidateFor(netflixCandidatesA, 'LICENSED_RELEASED_TITLE');
const netflixCashBefore = world.platforms?.NETFLIX.cashReserve || 0;
const licenceCommit = commitPlatformContentCandidate({ ...netflixInput, candidate: licence });
const netflixAfterLicence = licenceCommit.world.platforms?.NETFLIX;
assert.equal(licenceCommit.changed, true);
assert.equal(licenceCommit.world.projects.length, world.projects.length, 'Licensing must reuse the canonical project.');
assert.equal(netflixAfterLicence?.cashReserve, netflixCashBefore - licence.depositMillions);
assert.equal(netflixAfterLicence?.ai?.rightsContracts.length, 1);
const licenceContract = netflixAfterLicence?.ai?.rightsContracts[0];
assert.equal(licenceContract?.buyerPlatformId, 'NETFLIX');
const canonicalLicenceContract = licenceContract
    ? licenceCommit.world.streamingRightsContracts?.[licenceContract.id]
    : undefined;
assert.ok(canonicalLicenceContract, 'A committed Platform AI licence should register one world-level canonical contract.');
assert.equal(canonicalLicenceContract?.buyer.platformId, 'NETFLIX');
assert.equal(canonicalLicenceContract?.minimumGuarantee, licenceContract?.minimumGuarantee);
assert.equal(licenceContract?.platformContentPlanId, licenceCommit.plan?.id);
assert.equal(licenceContract?.contentSource, 'LICENSED_RELEASED_TITLE');
assert.equal(licenceContract?.minimumGuarantee, millionsToFullCurrency(licence.rightsCostMillions));
assert.equal(licenceContract?.origin, 'STUDIO_MARKET');

const repeatedLicenceCommit = commitPlatformContentCandidate({
    ...netflixInput,
    world: licenceCommit.world,
    candidate: licence,
});
assert.equal(repeatedLicenceCommit.changed, false);
assert.deepEqual(repeatedLicenceCommit.world, licenceCommit.world);

const sharedCandidates = buildPlatformContentCandidates({
    player: fixture,
    world: licenceCommit.world,
    platformId: 'HULU',
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.ok(sharedCandidates.some(item => (
    item.source === 'LICENSED_RELEASED_TITLE'
    && item.sourceProjectIds[0] === licence.sourceProjectIds[0]
    && item.exclusivity === 'NON_EXCLUSIVE'
)), 'A second platform may receive a non-exclusive candidate.');
const huluLocalizationCandidate = candidateFor(sharedCandidates, 'LICENSED_RELEASED_TITLE');
const huluLocalizationCommit = commitPlatformContentCandidate({
    player: fixture,
    world,
    platformId: 'HULU',
    absoluteWeek: ABSOLUTE_WEEK,
    candidate: huluLocalizationCandidate,
});
assert.equal(huluLocalizationCommit.changed, true);
assert.equal(
    huluLocalizationCommit.plan?.localizationLevel,
    resolvePlatformLocalizationLevel(world.platforms!.HULU.ai!.capabilities),
    'A new plan must use the localization level the platform has already researched.',
);

const catalogue = candidateFor(netflixCandidatesA, 'CATALOGUE_ACQUISITION');
assert.equal(catalogue.sourceProjectIds.length, 3);
const catalogueCommit = commitPlatformContentCandidate({ ...netflixInput, candidate: catalogue });
const catalogueContracts = catalogueCommit.world.platforms?.NETFLIX.ai?.rightsContracts || [];
assert.equal(catalogueContracts.length, 3);
assert.ok(catalogueCommit.plan?.cataloguePackageId);
assert.ok(catalogueContracts.every(contract => (
    contract.cataloguePackageId === catalogueCommit.plan?.cataloguePackageId
    && contract.origin === 'CATALOGUE_ACQUISITION'
    && contract.contentSource === 'CATALOGUE_ACQUISITION'
)));
assert.deepEqual(
    catalogueContracts.map(contract => contract.sourceProjectId).sort(),
    catalogue.sourceProjectIds.slice().sort(),
);
assert.ok(
    new Set(catalogueContracts.map(contract => contract.minimumGuarantee)).size > 1,
    'Platform AI catalogue acquisitions must use title value and bidder fit instead of an equal split',
);
assert.equal(
    catalogueContracts.reduce((sum, contract) => sum + contract.minimumGuarantee, 0),
    millionsToFullCurrency(catalogue.rightsCostMillions),
    'the title cost bases must reconcile exactly to the package commitment',
);
const aiCataloguePackage = catalogueCommit.world.streamingCataloguePackages?.[catalogueCommit.plan!.cataloguePackageId!];
assert.equal(aiCataloguePackage?.lifecycle, 'SIGNED');
assert.deepEqual(
    aiCataloguePackage?.components.map(component => component.sourceProjectId).sort(),
    catalogue.sourceProjectIds.slice().sort(),
);
assert.deepEqual(
    aiCataloguePackage?.componentContractIds.slice().sort(),
    catalogueContracts.map(contract => contract.id).sort(),
);
assert.equal(catalogueCommit.world.projects.length, world.projects.length);
const normalizedCataloguePlatform = normalizePlatformAiState(
    structuredClone(catalogueCommit.world.platforms!.NETFLIX),
    fixture.id,
    ABSOLUTE_WEEK + 1,
);
assert.deepEqual(
    [...new Set((normalizedCataloguePlatform.ai!.slate.find(plan => plan.id === catalogueCommit.plan!.id)
        ?.localizationRequirements || []).map(requirement => requirement.sourceProjectId))].sort(),
    catalogue.sourceProjectIds.slice().sort(),
    'Reloading a catalogue plan must preserve localization promises for every component title.',
);

const mixedLanguageWorld = structuredClone(world);
mixedLanguageWorld.projects = mixedLanguageWorld.projects.map(project => ({
    ...project,
    originalLanguageId: project.id === catalogue.sourceProjectIds[0] ? 'hindi' : 'english',
}));
const mixedLanguageNetflix = mixedLanguageWorld.platforms!.NETFLIX;
mixedLanguageNetflix.ai!.marketOperations = mixedLanguageNetflix.ai!.marketOperations.map(operation => ({
    ...operation,
    status: operation.countryId === 'IN' || operation.countryId === 'JP' ? 'ACTIVE' : 'PLANNED',
}));
mixedLanguageNetflix.ai!.capabilities.activeCountryIds = ['IN', 'JP'];
mixedLanguageNetflix.ai!.languageCapabilities = [{
    languageId: 'hindi',
    subtitleLevel: 2,
    dubbingLevel: 2,
    source: 'LANGUAGE_PACKAGE',
    sourceReferenceId: 'mixed-catalogue-audit',
    activatedAtAbsoluteWeek: ABSOLUTE_WEEK,
}];
const mixedLanguageCatalogueCommit = commitPlatformContentCandidate({
    ...netflixInput,
    world: mixedLanguageWorld,
    candidate: catalogue,
});
assert.equal(mixedLanguageCatalogueCommit.changed, true);
assert.equal(
    mixedLanguageCatalogueCommit.plan?.localizationLevel,
    'DUBS_AND_SUBTITLES',
    'One catalogue title with no supported asset must not erase supported localization promised for the remaining titles.',
);
assert.ok(
    (mixedLanguageCatalogueCommit.plan?.localizationRequirements?.length || 0) > 0,
    'A mixed-language catalogue should persist its supported per-title localization requirements.',
);

const transferCommit = commitPlatformContentCandidate({
    player: fixture,
    world,
    platformId: 'DISNEY_PLUS',
    absoluteWeek: ABSOLUTE_WEEK,
    candidate: ownedTransfer,
});
const transferContract = transferCommit.world.platforms?.DISNEY_PLUS.ai?.rightsContracts[0];
assert.equal(transferContract?.origin, 'OWNED_STUDIO_TRANSFER');
assert.equal(transferContract?.minimumGuarantee, 0);
assert.equal(transferContract?.contentSource, 'OWNED_STUDIO_TRANSFER');

const exclusiveContract = createStreamingLicenseContract({
    id: 'exclusive-netflix-universal-1',
    sourceProject: sourceProjects[0],
    buyerPlatformId: 'NETFLIX',
    platformContentPlanId: 'exclusive-plan',
    cataloguePackageId: null,
    contentSource: 'LICENSED_RELEASED_TITLE',
    licensorName: 'Universal Pictures',
    territory: 'GLOBAL',
    countryIds: [],
    durationWeeks: 104,
    exclusivity: 'EXCLUSIVE',
    minimumGuarantee: 40_000_000,
    platformRevenueShare: 70,
    signedAtAbsoluteWeek: ABSOLUTE_WEEK,
    startsAtAbsoluteWeek: ABSOLUTE_WEEK,
    origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    windowType: 'FIRST_WINDOW',
});
const exclusiveProjectionWorld = structuredClone(world);
exclusiveProjectionWorld.platforms!.NETFLIX.ai!.rightsContracts.push(exclusiveContract);
const exclusiveWorld = withCanonicalRights(fixture, exclusiveProjectionWorld);

const blockedAvailability = validateStreamingRightsAvailability({
    player: fixture,
    world: exclusiveWorld,
    sourceProjectId: 'universal-1',
    buyerPlatformId: 'HULU',
    exclusivity: 'NON_EXCLUSIVE',
    startsAtAbsoluteWeek: ABSOLUTE_WEEK,
    expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 52,
});
assert.equal(blockedAvailability.available, false);
assert.deepEqual(blockedAvailability.conflictLicenseIds, ['exclusive-netflix-universal-1']);

const huluAfterExclusive = buildPlatformContentCandidates({
    player: fixture,
    world: exclusiveWorld,
    platformId: 'HULU',
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.ok(!huluAfterExclusive.some(item => (
    item.source !== 'COMMISSIONED_ORIGINAL' && item.sourceProjectIds.includes('universal-1')
)));

const playerWithReadyDeal = structuredClone(fixture);
playerWithReadyDeal.world = exclusiveWorld;
const readyNegotiation: OwnedStreamingRightsNegotiation = {
    id: 'player-ready-exclusive-conflict',
    idempotencyKey: 'player-ready-exclusive-conflict',
    kind: 'ACQUIRE',
    sourceProjectId: 'universal-1',
    sourceLicenseId: null,
    title: 'Night Ledger',
    projectType: 'MOVIE',
    genre: 'THRILLER',
    sellerType: 'STUDIO',
    sellerId: 'UNIVERSAL',
    sellerName: 'Universal Pictures',
    buyerPlatformId: null,
    buyerName: null,
    territory: 'GLOBAL',
    countryIds: [],
    durationWeeks: 104,
    exclusivity: 'NON_EXCLUSIVE',
    windowType: 'FIRST_WINDOW',
    minimumGuarantee: 20_000_000,
    platformRevenueShare: 70,
    marketingGuarantee: 0,
    viewershipBonusThreshold: 0,
    viewershipBonusAmount: 0,
    renewalOption: true,
    sublicensingAllowed: true,
    sequelRightsIncluded: false,
    changeOfControl: 'NOTICE',
    cancellationPenalty: 4_000_000,
    rivalPlatformId: 'HULU',
    rivalPlatformName: 'Hulu',
    rivalBidAmount: 18_000_000,
    marketHeat: 'ACTIVE',
    status: 'READY_TO_SIGN',
    round: 1,
    counterMinimumGuarantee: null,
    counterPlatformRevenueShare: null,
    createdAtAbsoluteWeek: ABSOLUTE_WEEK,
    updatedAtAbsoluteWeek: ABSOLUTE_WEEK,
    expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 4,
};
playerWithReadyDeal.ownedStreamingPlatform = {
    ...playerWithReadyDeal.ownedStreamingPlatform,
    treasuryCash: 100_000_000,
    rightsNegotiations: [readyNegotiation],
};
const blockedPlayerSigning = signStreamingRightsDeal(playerWithReadyDeal, readyNegotiation.id);
assert.equal(blockedPlayerSigning.changed, false);
assert.equal(blockedPlayerSigning.reason, 'RIGHTS_UNAVAILABLE');

const nonExclusiveProjectionWorld = structuredClone(world);
nonExclusiveProjectionWorld.platforms!.NETFLIX.ai!.rightsContracts.push({
    ...exclusiveContract,
    id: 'shared-netflix-universal-1',
    exclusivity: 'NON_EXCLUSIVE',
});
const nonExclusiveWorld = withCanonicalRights(fixture, nonExclusiveProjectionWorld);
const allowedShared = validateStreamingRightsAvailability({
    player: fixture,
    world: nonExclusiveWorld,
    sourceProjectId: 'universal-1',
    buyerPlatformId: 'HULU',
    exclusivity: 'NON_EXCLUSIVE',
    startsAtAbsoluteWeek: ABSOLUTE_WEEK,
    expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 52,
});
assert.equal(allowedShared.available, true);

for (const platformId of Object.keys(world.platforms || {}) as PlatformId[]) {
    assert.equal(world.platforms?.[platformId].ai?.rightsContracts.length, 0, 'Candidate building must remain pure.');
}

console.log('Platform AI sourcing audit passed.');
