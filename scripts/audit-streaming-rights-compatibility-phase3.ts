import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingRightsChangeOfControl,
    StreamingRightsContract,
    StreamingRightsWindowType,
} from '../types';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    registerProductionStreamingRightsContractFromOffer,
} from '../services/streamingRightsCore';
import {
    buildStreamingBiddingRightsLot,
    formatStreamingRightsCompatibilitySummary,
    formatStreamingBiddingRightsLotScope,
    resolveStreamingRightsCompatibility,
} from '../services/streamingRightsCompatibility';
import { STREAMING_DAY_ONE_MARKETS } from '../services/streamingDayOneMarkets';
import {
    createStreamingBiddingSession,
    acceptStreamingBiddingOffer,
    normalizeStreamingBiddingSessionRegistry,
} from '../services/streamingBidding';
import { INITIAL_PLAYER } from '../types';
import { StreamingBiddingRoom } from '../views/lifestyle/business/components/StreamingBiddingRoom';

interface ContractFixtureInput {
    id: string;
    sourceProjectId?: string;
    countryIds?: string[];
    territory?: StreamingLicenseTerritory;
    startsAtAbsoluteWeek?: number;
    expiresAtAbsoluteWeek?: number;
    exclusivity?: StreamingLicenseExclusivity;
    windowType?: StreamingRightsWindowType;
    buyerId?: 'NETFLIX' | 'APPLE_TV' | 'DISNEY_PLUS' | 'HULU' | 'YOUTUBE';
    sublicensingAllowed?: boolean;
    sequelRightsIncluded?: boolean;
    changeOfControl?: StreamingRightsChangeOfControl;
}

const createContract = (input: ContractFixtureInput): StreamingRightsContract => {
    const startsAtAbsoluteWeek = input.startsAtAbsoluteWeek ?? 10;
    const expiresAtAbsoluteWeek = input.expiresAtAbsoluteWeek ?? 60;
    const durationWeeks = Math.max(1, expiresAtAbsoluteWeek - startsAtAbsoluteWeek);
    const buyerId = input.buyerId || 'NETFLIX';
    return createStreamingRightsContractFromLicense({
        license: createStreamingLicenseContract({
            id: input.id,
            sourceProject: {
                id: input.sourceProjectId || 'picture-1',
                title: 'The Quiet Fire',
                mediaType: 'MOVIE',
                genre: 'DRAMA',
            },
            buyerPlatformId: buyerId,
            platformContentPlanId: null,
            cataloguePackageId: null,
            licensorName: 'First Studio',
            territory: input.territory || 'MULTI_REGION',
            countryIds: input.countryIds || ['IN'],
            durationWeeks,
            exclusivity: input.exclusivity || 'EXCLUSIVE',
            minimumGuarantee: 40_000_000,
            platformRevenueShare: 90,
            signedAtAbsoluteWeek: 9,
            startsAtAbsoluteWeek,
            status: 'ACTIVE',
            origin: 'STUDIO_MARKET',
            sellerType: 'STUDIO',
            sellerPlatformId: null,
            windowType: input.windowType || 'FIRST_WINDOW',
            permanentPurchase: input.windowType === 'PERMANENT',
            sublicensingAllowed: input.sublicensingAllowed || false,
            sequelRightsIncluded: input.sequelRightsIncluded || false,
            changeOfControl: input.changeOfControl || 'NOTICE',
        }),
        seller: {
            type: 'PLAYER_STUDIO', id: 'studio-1', name: 'First Studio', platformId: null,
        },
        buyer: {
            type: 'AI_PLATFORM', id: buyerId, name: buyerId === 'NETFLIX' ? 'Netflix' : buyerId, platformId: buyerId,
        },
        guaranteeDisposition: 'PAID',
        settledAtAbsoluteWeek: 9,
    });
};

const worldWith = (...contracts: StreamingRightsContract[]) => ({
    streamingRightsContracts: Object.fromEntries(contracts.map(contract => [contract.id, contract])),
}) as any;

const indiaExclusive = createContract({ id: 'india-exclusive', countryIds: ['IN'] });
const partial = resolveStreamingRightsCompatibility({
    world: worldWith(indiaExclusive),
    sourceProjectId: 'picture-1',
    buyerPlatformId: 'APPLE_TV',
    sellerPartyId: 'studio-1',
    territory: 'GLOBAL',
    countryIds: [],
    startsAtAbsoluteWeek: 20,
    expiresAtAbsoluteWeek: 52,
    windowType: 'FIRST_WINDOW',
    exclusivity: 'EXCLUSIVE',
});

assert.equal(partial.status, 'PARTIALLY_AVAILABLE');
assert.equal(partial.available, false, 'partial availability must not approve the exact global proposal');
assert.deepEqual(partial.blockedCountryIds, ['IN']);
assert.equal(partial.availableCountryIds.length, STREAMING_DAY_ONE_MARKETS.length - 1);
assert.equal(partial.availableCountryIds.includes('US'), true);
assert.deepEqual(partial.controllingContractIds, ['india-exclusive']);
assert.equal(partial.earliestCompatibleStartWeek, 61);

const indiaOnly = resolveStreamingRightsCompatibility({
    world: worldWith(indiaExclusive),
    sourceProjectId: 'picture-1',
    buyerPlatformId: 'APPLE_TV',
    territory: 'DOMESTIC',
    countryIds: ['IN'],
    startsAtAbsoluteWeek: 20,
    expiresAtAbsoluteWeek: 52,
    windowType: 'FIRST_WINDOW',
    exclusivity: 'EXCLUSIVE',
});
assert.equal(indiaOnly.status, 'AVAILABLE_IN_FUTURE');
assert.deepEqual(indiaOnly.availableCountryIds, []);
assert.deepEqual(indiaOnly.blockedCountryIds, ['IN']);
assert.equal(
    formatStreamingRightsCompatibilitySummary(indiaOnly),
    'India is exclusively licensed to Netflix until Week 60.',
);

const afterExpiry = resolveStreamingRightsCompatibility({
    world: worldWith(indiaExclusive),
    sourceProjectId: 'picture-1',
    buyerPlatformId: 'APPLE_TV',
    territory: 'DOMESTIC',
    countryIds: ['IN'],
    startsAtAbsoluteWeek: 61,
    expiresAtAbsoluteWeek: 112,
    windowType: 'SECOND_WINDOW',
    exclusivity: 'EXCLUSIVE',
});
assert.equal(afterExpiry.status, 'AVAILABLE');
assert.equal(afterExpiry.available, true);

const existingShared = createContract({
    id: 'us-shared', countryIds: ['US'], exclusivity: 'NON_EXCLUSIVE', buyerId: 'HULU',
});
const exclusiveAfterShared = resolveStreamingRightsCompatibility({
    world: worldWith(existingShared), sourceProjectId: 'picture-1', buyerPlatformId: 'NETFLIX',
    territory: 'DOMESTIC', countryIds: ['US'], startsAtAbsoluteWeek: 20, expiresAtAbsoluteWeek: 52,
    windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
});
assert.equal(exclusiveAfterShared.status, 'AVAILABLE_IN_FUTURE');
assert.equal(exclusiveAfterShared.conflicts[0]?.code, 'EXCLUSIVE_OVERLAP');

const sharedSlots = ['NETFLIX', 'APPLE_TV', 'HULU'].map((buyerId, index) => createContract({
    id: `shared-${index + 1}`,
    countryIds: ['US'],
    exclusivity: 'NON_EXCLUSIVE',
    buyerId: buyerId as ContractFixtureInput['buyerId'],
}));
const fullSharedSlot = resolveStreamingRightsCompatibility({
    world: worldWith(...sharedSlots), sourceProjectId: 'picture-1', buyerPlatformId: 'DISNEY_PLUS',
    territory: 'DOMESTIC', countryIds: ['US'], startsAtAbsoluteWeek: 20, expiresAtAbsoluteWeek: 52,
    windowType: 'FIRST_WINDOW', exclusivity: 'NON_EXCLUSIVE', nonExclusiveSlotLimit: 3,
});
assert.equal(fullSharedSlot.status, 'AVAILABLE_IN_FUTURE');
assert.equal(fullSharedSlot.conflicts[0]?.code, 'NON_EXCLUSIVE_SLOT_LIMIT');

const sublicenseRestricted = resolveStreamingRightsCompatibility({
    world: worldWith(indiaExclusive), sourceProjectId: 'picture-1', buyerPlatformId: 'APPLE_TV',
    sellerPartyId: 'NETFLIX', territory: 'DOMESTIC', countryIds: ['IN'],
    startsAtAbsoluteWeek: 20, expiresAtAbsoluteWeek: 40, windowType: 'SECOND_WINDOW',
    exclusivity: 'NON_EXCLUSIVE', action: 'SUBLICENSE', sourceContractId: 'india-exclusive',
});
assert.equal(sublicenseRestricted.status, 'RESTRICTED');
assert.equal(sublicenseRestricted.conflicts[0]?.code, 'SUBLICENSE_NOT_PERMITTED');

const consentContract = createContract({
    id: 'consent-contract', countryIds: ['US'], changeOfControl: 'CONSENT_REQUIRED',
});
const consentRequired = resolveStreamingRightsCompatibility({
    world: worldWith(consentContract), sourceProjectId: 'picture-1', buyerPlatformId: 'APPLE_TV',
    territory: 'DOMESTIC', countryIds: ['US'], startsAtAbsoluteWeek: 20, expiresAtAbsoluteWeek: 52,
    windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE', action: 'CHANGE_OF_CONTROL',
    sourceContractId: 'consent-contract',
});
assert.equal(consentRequired.status, 'RESTRICTED');
assert.equal(consentRequired.conflicts[0]?.code, 'CHANGE_OF_CONTROL_CONSENT_REQUIRED');

const franchiseContract = createContract({
    id: 'franchise-rights', sourceProjectId: 'original-picture', countryIds: ['US'], sequelRightsIncluded: true,
});
const explicitRelatedProject = resolveStreamingRightsCompatibility({
    world: worldWith(franchiseContract), sourceProjectId: 'sequel-picture', relatedProjectIds: ['original-picture'],
    buyerPlatformId: 'APPLE_TV', territory: 'DOMESTIC', countryIds: ['US'],
    startsAtAbsoluteWeek: 20, expiresAtAbsoluteWeek: 52, windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
});
assert.equal(explicitRelatedProject.status, 'RESTRICTED');
assert.equal(explicitRelatedProject.conflicts[0]?.code, 'RELATED_IP_RESTRICTED');

const titleMatchOnly = resolveStreamingRightsCompatibility({
    world: worldWith(franchiseContract), sourceProjectId: 'different-canonical-id', relatedProjectIds: [],
    buyerPlatformId: 'APPLE_TV', territory: 'DOMESTIC', countryIds: ['US'],
    startsAtAbsoluteWeek: 20, expiresAtAbsoluteWeek: 52, windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
});
assert.equal(titleMatchOnly.status, 'AVAILABLE', 'matching display titles must never join canonical rights');

let registryEnumerationCount = 0;
const indexedRegistryTarget = Object.fromEntries(Array.from({ length: 200 }, (_, index) => {
    const contract = createContract({
        id: `indexed-contract-${index}`,
        sourceProjectId: `indexed-project-${index}`,
        countryIds: [index % 2 === 0 ? 'US' : 'IN'],
    });
    return [contract.id, contract];
}));
const indexedRegistry = new Proxy(indexedRegistryTarget, {
    ownKeys(target) {
        registryEnumerationCount += 1;
        return Reflect.ownKeys(target);
    },
});
const indexedWorld = { streamingRightsContracts: indexedRegistry } as any;
const indexedCompatibilityInput = {
    world: indexedWorld,
    sourceProjectId: 'indexed-project-50',
    relatedProjectIds: ['indexed-project-51'],
    buyerPlatformId: 'APPLE_TV' as const,
    territory: 'DOMESTIC' as const,
    countryIds: ['GB'],
    startsAtAbsoluteWeek: 20,
    expiresAtAbsoluteWeek: 52,
    windowType: 'FIRST_WINDOW' as const,
    exclusivity: 'EXCLUSIVE' as const,
};
resolveStreamingRightsCompatibility(indexedCompatibilityInput);
const enumerationCountAfterWarmup = registryEnumerationCount;
resolveStreamingRightsCompatibility(indexedCompatibilityInput);
assert.equal(
    registryEnumerationCount,
    enumerationCountAfterWarmup,
    'repeated compatibility checks against the same immutable registry must reuse a project index',
);

const partialLotBuild = buildStreamingBiddingRightsLot({
    world: worldWith(indiaExclusive),
    sourceProjectId: 'picture-1',
    sellerPartyId: 'studio-1',
    startsAtAbsoluteWeek: 20,
    maximumDurationWeeks: 156,
    windowType: 'FIRST_WINDOW',
});
assert.ok(partialLotBuild.lot, 'all remaining eligible markets should form a valid lot');
assert.equal(partialLotBuild.compatibility.status, 'PARTIALLY_AVAILABLE');
assert.equal(partialLotBuild.lot?.territory, 'MULTI_REGION');
assert.equal(partialLotBuild.lot?.countryIds.length, STREAMING_DAY_ONE_MARKETS.length - 1);
assert.equal(partialLotBuild.lot?.countryIds.includes('IN'), false);
assert.deepEqual(partialLotBuild.lot?.excludedCountryIds, ['IN']);
assert.equal(
    partialLotBuild.lot?.notice,
    'India is already licensed. This auction covers the remaining eligible markets.',
);
assert.equal(formatStreamingBiddingRightsLotScope(partialLotBuild.lot!), `${STREAMING_DAY_ONE_MARKETS.length - 1} markets`);

const biddingPlatforms = [{
    id: 'NETFLIX' as const,
    name: 'Netflix',
    color: '#e50914',
    cashAvailable: 500_000_000,
    baseBid: 12_000_000,
    acquisitionCeiling: 420_000_000,
    qualityPreference: 72,
    relationshipMultiplier: 1,
    strategicCountryIds: ['US'],
}];
const partialLotSession = createStreamingBiddingSession({
    projectId: 'picture-1', title: 'The Quiet Fire', sellerStudioId: 'studio-1', sellerStudioName: 'First Studio',
    absoluteWeek: 20, projectType: 'MOVIE', genre: 'DRAMA', projectBudget: 80_000_000,
    packageScore: 74, theatricalGross: 0, platforms: biddingPlatforms, rightsLot: partialLotBuild.lot!,
});
assert.deepEqual(partialLotSession.rightsLot, partialLotBuild.lot);
assert.ok(partialLotSession.offers.every(offer => offer.territory === 'MULTI_REGION'));
assert.ok(partialLotSession.offers.every(offer => (
    JSON.stringify(offer.countryIds) === JSON.stringify(partialLotBuild.lot!.countryIds)
)));
assert.ok(partialLotSession.offers.every(offer => offer.windowType === 'FIRST_WINDOW'));

const lowStrategicDemandSession = createStreamingBiddingSession({
    projectId: 'picture-1', title: 'The Quiet Fire', sellerStudioId: 'studio-1', sellerStudioName: 'First Studio',
    absoluteWeek: 20, projectType: 'MOVIE', genre: 'DRAMA', projectBudget: 80_000_000,
    packageScore: 74, theatricalGross: 0,
    platforms: [{ ...biddingPlatforms[0], strategicCountryIds: ['IN'] }], rightsLot: partialLotBuild.lot!,
});
assert.ok(
    partialLotSession.platformStates[0].expectedTitleGross > lowStrategicDemandSession.platformStates[0].expectedTitleGross,
    'strategic demand in a valuable eligible country should increase title valuation',
);
assert.ok(partialLotSession.platformStates[0].fixedExposureCeiling <= biddingPlatforms[0].cashAvailable);

const permanentGlobal = createContract({
    id: 'permanent-global', territory: 'GLOBAL', countryIds: [], startsAtAbsoluteWeek: 0,
    expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER, windowType: 'PERMANENT',
});
const noMarketLot = buildStreamingBiddingRightsLot({
    world: worldWith(permanentGlobal), sourceProjectId: 'picture-1', sellerPartyId: 'studio-1',
    startsAtAbsoluteWeek: 20, maximumDurationWeeks: 156, windowType: 'FIRST_WINDOW',
});
assert.equal(noMarketLot.lot, null, 'a room cannot open when no compatible country remains');
assert.equal(noMarketLot.compatibility.status, 'UNAVAILABLE');

const legacySession = structuredClone(partialLotSession) as any;
delete legacySession.rightsLot;
legacySession.offers.forEach((offer: any) => {
    delete offer.countryIds;
    delete offer.windowType;
    offer.territory = 'GLOBAL';
});
const normalizedLegacy = normalizeStreamingBiddingSessionRegistry({ legacy: legacySession })[legacySession.id];
assert.equal(normalizedLegacy.rightsLot.territory, 'GLOBAL');
assert.equal(normalizedLegacy.rightsLot.countryIds.length, STREAMING_DAY_ONE_MARKETS.length);
assert.deepEqual(normalizedLegacy.offers[0].countryIds, normalizedLegacy.rightsLot.countryIds);
assert.equal(normalizedLegacy.offers[0].windowType, 'FIRST_WINDOW');

const partialAcceptedSession = acceptStreamingBiddingOffer(partialLotSession, partialLotSession.offers[0].id);
const partialSigningPlayer = structuredClone(INITIAL_PLAYER);
partialSigningPlayer.world.streamingRightsContracts = { [indiaExclusive.id]: indiaExclusive };
const partialSigning = registerProductionStreamingRightsContractFromOffer(partialSigningPlayer, {
    session: partialAcceptedSession,
    offer: partialAcceptedSession.offers.find(offer => offer.status === 'ACCEPTED')!,
    signedAtAbsoluteWeek: 20,
    startsAtAbsoluteWeek: 20,
});
assert.ok(partialSigning.contract, 'the exact remaining-market offer should pass the final recheck');
assert.equal(partialSigning.contract?.territory, 'MULTI_REGION');
assert.deepEqual(partialSigning.contract?.countryIds, partialLotBuild.lot!.countryIds);
assert.equal(partialSigning.contract?.windowType, 'FIRST_WINDOW');
assert.equal(partialSigning.contract?.countryIds?.includes('IN'), false);

const concurrentUsExclusive = createContract({
    id: 'concurrent-us-exclusive', countryIds: ['US'], startsAtAbsoluteWeek: 20,
    expiresAtAbsoluteWeek: 200, buyerId: 'DISNEY_PLUS',
});
const conflictedSigningPlayer = structuredClone(partialSigningPlayer);
conflictedSigningPlayer.world.streamingRightsContracts = {
    ...conflictedSigningPlayer.world.streamingRightsContracts,
    [concurrentUsExclusive.id]: concurrentUsExclusive,
};
const rejectedConcurrentSigning = registerProductionStreamingRightsContractFromOffer(conflictedSigningPlayer, {
    session: partialAcceptedSession,
    offer: partialAcceptedSession.offers.find(offer => offer.status === 'ACCEPTED')!,
    signedAtAbsoluteWeek: 20,
    startsAtAbsoluteWeek: 20,
});
assert.equal(rejectedConcurrentSigning.contract, null, 'a concurrent canonical conflict must fail hidden signing recheck');
assert.equal(rejectedConcurrentSigning.changed, false);
assert.equal(rejectedConcurrentSigning.player, conflictedSigningPlayer, 'failed signing must return the untouched player');

const partialRoomMarkup = renderToStaticMarkup(React.createElement(StreamingBiddingRoom, {
    session: partialLotSession,
    canAccept: true,
    energyCost: 5,
    onStart: () => undefined,
    onSessionChange: () => undefined,
    onAccept: () => undefined,
    onLeave: () => undefined,
    onBack: () => undefined,
}));
assert.match(partialRoomMarkup, /India is already licensed\. This auction covers the remaining eligible markets\./);
assert.match(partialRoomMarkup, new RegExp(`${STREAMING_DAY_ONE_MARKETS.length - 1} markets`));
assert.doesNotMatch(partialRoomMarkup, /Global exclusive|Global shared/);

const worldwidePreflightMarkup = renderToStaticMarkup(React.createElement(StreamingBiddingRoom, {
    session: null,
    canAccept: true,
    energyCost: 5,
    onStart: () => undefined,
    onSessionChange: () => undefined,
    onAccept: () => undefined,
    onLeave: () => undefined,
    onBack: () => undefined,
}));
assert.match(worldwidePreflightMarkup, /Worldwide rights available\./);

console.log('Streaming rights compatibility Phase A3 audit passed.');
