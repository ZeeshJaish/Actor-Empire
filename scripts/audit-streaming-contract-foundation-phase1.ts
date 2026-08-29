import assert from 'node:assert/strict';
import {
    getStreamingRightsContract,
    migrateStreamingRightsContractRegistry,
    normalizeStreamingRightsContractRegistry,
    registerProductionStreamingRightsContract,
    registerStreamingRightsContract,
} from '../services/streamingRightsCore';
import { INITIAL_PLAYER, type StreamingRightsContract } from '../types';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';

assert.deepEqual(INITIAL_PLAYER.world.streamingRightsContracts, {}, 'new games should start with an explicit empty canonical contract registry');

const malformedContract = {
    schemaVersion: 99,
    id: ' contract-1 ',
    idempotencyKey: ' signing:project-1 ',
    sourceProjectId: ' project-1 ',
    titleAtSigning: ' First Picture ',
    projectType: 'MOVIE',
    genre: ' Drama ',
    seller: {
        type: 'PLAYER_STUDIO',
        id: ' studio-1 ',
        name: ' First Studio ',
        platformId: null,
    },
    buyer: {
        type: 'AI_PLATFORM',
        id: 'NETFLIX',
        name: 'Netflix',
        platformId: 'NETFLIX',
    },
    dealStructure: 'GUARANTEE_REVENUE_SHARE',
    territory: 'MULTI_REGION',
    countryIds: ['US', 'IN', 'US', '', ' IN '],
    durationWeeks: 104.4,
    exclusivity: 'EXCLUSIVE',
    minimumGuarantee: -500,
    platformRevenueShare: 72.6,
    licensorRevenueShare: 1,
    signedAtAbsoluteWeek: 200.2,
    startsAtAbsoluteWeek: 199,
    expiresAtAbsoluteWeek: 100,
    status: 'ACTIVE',
    origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    buyerPlatformId: 'NETFLIX',
    windowType: 'FIRST_WINDOW',
    permanentPurchase: false,
    marketingGuarantee: Number.NaN,
    viewershipBonusThreshold: 12_500_000.4,
    viewershipBonusAmount: 400_000.6,
    productionFunding: -1,
    futureSeasonFunding: 2_000_000.2,
    renewalOption: true,
    sublicensingAllowed: false,
    sequelRightsIncluded: false,
    localization: 'DUBS_AND_SUBTITLES',
    changeOfControl: 'NOTICE',
    cancellationPenalty: -5,
    renewedFromLicenseId: null,
    settlement: {
        guarantee: 'LEGACY_PAID',
        paymentKey: ' payment:contract-1 ',
        settledAtAbsoluteWeek: 201.6,
    },
    legacySource: 'OWNED_PLATFORM_LICENSE',
} as Record<string, unknown>;

const normalized = normalizeStreamingRightsContractRegistry({
    first: malformedContract,
    duplicate: { ...malformedContract, id: 'contract-1', titleAtSigning: 'Second copy must lose' },
    invalid: { id: '', sourceProjectId: '' },
});

assert.deepEqual(Object.keys(normalized), ['contract-1'], 'registry should normalize and deduplicate by canonical contract ID');
const contract = normalized['contract-1'];
assert.equal(contract.schemaVersion, 2, 'Phase 2 contract economics must migrate the canonical contract to schema v2');
assert.equal(contract.idempotencyKey, 'signing:project-1');
assert.equal(contract.titleAtSigning, 'First Picture');
assert.deepEqual(contract.countryIds, ['US', 'IN']);
assert.equal(contract.minimumGuarantee, 0);
assert.equal(contract.platformRevenueShare, 73);
assert.equal(contract.licensorRevenueShare, 27);
assert.equal(contract.signedAtAbsoluteWeek, 200);
assert.equal(contract.startsAtAbsoluteWeek, 200);
assert.equal(contract.durationWeeks, 104);
assert.equal(contract.expiresAtAbsoluteWeek, 304);
assert.equal(contract.marketingGuarantee, 0);
assert.equal(contract.viewershipBonusThreshold, 12_500_000);
assert.equal(contract.viewershipBonusAmount, 400_001);
assert.equal(contract.productionFunding, 0);
assert.equal(contract.futureSeasonFunding, 2_000_000);
assert.equal(contract.cancellationPenalty, 0);
assert.deepEqual(contract.settlement, {
    guarantee: 'LEGACY_PAID',
    paymentKey: 'payment:contract-1',
    settledAtAbsoluteWeek: 202,
});

const competingRecord: StreamingRightsContract = {
    ...contract,
    titleAtSigning: 'Replacement must not win',
};
const duplicateRegistration = registerStreamingRightsContract(normalized, competingRecord);
assert.equal(duplicateRegistration.changed, false, 'duplicate contract registration must be idempotent');
assert.strictEqual(duplicateRegistration.registry, normalized, 'a duplicate registration should preserve registry identity');
assert.equal(getStreamingRightsContract(duplicateRegistration.registry, ' contract-1 ')?.titleAtSigning, 'First Picture');

const secondRecord: StreamingRightsContract = {
    ...contract,
    id: 'contract-2',
    idempotencyKey: 'signing:project-2',
    sourceProjectId: 'project-2',
    titleAtSigning: 'Second Picture',
};
const added = registerStreamingRightsContract(normalized, secondRecord);
assert.equal(added.changed, true);
assert.deepEqual(Object.keys(added.registry), ['contract-1', 'contract-2']);
assert.equal(normalized['contract-2'], undefined, 'registration must not mutate the input registry');

const richLicensePlayer = createPlatformAiFixture();
richLicensePlayer.ownedStreamingPlatform.identity = {
    name: 'Empire Plus',
    slug: 'empire-plus',
    primaryColor: '#111111',
    secondaryColor: '#ffffff',
    logoKey: 'FRAME_PLAY',
    brandPromiseId: 'BALANCED',
    publicManifesto: '',
    foundedAtAbsoluteWeek: 100,
};
richLicensePlayer.ownedStreamingPlatform.catalogLicenses = [{
    id: 'owned-license-1',
    sourceProjectId: 'owned-project-1',
    titleAtSigning: 'Owned Licence Picture',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    licensorName: 'Outside Studio',
    territory: 'MULTI_REGION',
    countryIds: ['US', 'IN'],
    durationWeeks: 104,
    exclusivity: 'EXCLUSIVE',
    minimumGuarantee: 15_000_000,
    platformRevenueShare: 70,
    licensorRevenueShare: 30,
    signedAtAbsoluteWeek: 150,
    startsAtAbsoluteWeek: 152,
    expiresAtAbsoluteWeek: 256,
    status: 'ACTIVE',
    origin: 'STUDIO_MARKET',
    buyerPlatformId: null,
    platformContentPlanId: null,
    cataloguePackageId: null,
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    windowType: 'FIRST_WINDOW',
    permanentPurchase: false,
    marketingGuarantee: 2_000_000,
    viewershipBonusThreshold: 10_000_000,
    viewershipBonusAmount: 500_000,
    renewalOption: true,
    sublicensingAllowed: false,
    sequelRightsIncluded: false,
    changeOfControl: 'NOTICE',
    cancellationPenalty: 1_000_000,
    renewedFromLicenseId: null,
}];
const aiLicense = {
    ...richLicensePlayer.ownedStreamingPlatform.catalogLicenses[0],
    id: 'ai-license-1',
    sourceProjectId: 'ai-project-1',
    titleAtSigning: 'AI Licence Picture',
    minimumGuarantee: 9_000_000,
    buyerPlatformId: 'NETFLIX' as const,
};
(richLicensePlayer.world.platforms!.NETFLIX as any).ai = { rightsContracts: [aiLicense] };
richLicensePlayer.world.streamingRightsContracts = {};
const moneyBeforeRichMigration = richLicensePlayer.money;
const ownedTreasuryBeforeRichMigration = richLicensePlayer.ownedStreamingPlatform.treasuryCash;
const netflixCashBeforeRichMigration = richLicensePlayer.world.platforms!.NETFLIX.cashReserve;

const migratedRichLicenses = migrateStreamingRightsContractRegistry(richLicensePlayer);
assert.deepEqual(
    Object.keys(migratedRichLicenses.world.streamingRightsContracts || {}),
    ['owned-license-1', 'ai-license-1'],
    'existing rich licences should enter the registry once in deterministic actor order',
);
const migratedOwnedLicense = migratedRichLicenses.world.streamingRightsContracts!['owned-license-1'];
assert.deepEqual(migratedOwnedLicense.buyer, {
    type: 'PLAYER_PLATFORM',
    id: 'empire-plus',
    name: 'Empire Plus',
    platformId: null,
});
assert.equal(migratedOwnedLicense.settlement.guarantee, 'LEGACY_PAID');
assert.equal(migratedOwnedLicense.settlement.settledAtAbsoluteWeek, 150);
assert.equal(migratedOwnedLicense.legacySource, 'OWNED_PLATFORM_LICENSE');
const migratedAiLicense = migratedRichLicenses.world.streamingRightsContracts!['ai-license-1'];
assert.deepEqual(migratedAiLicense.buyer, {
    type: 'AI_PLATFORM',
    id: 'NETFLIX',
    name: 'Netflix',
    platformId: 'NETFLIX',
});
assert.equal(migratedAiLicense.legacySource, 'PLATFORM_AI_LICENSE');
assert.equal(migratedRichLicenses.money, moneyBeforeRichMigration);
assert.equal(migratedRichLicenses.ownedStreamingPlatform.treasuryCash, ownedTreasuryBeforeRichMigration);
assert.equal(migratedRichLicenses.world.platforms!.NETFLIX.cashReserve, netflixCashBeforeRichMigration);

const activeReleasePlayer = createPlatformAiFixture();
activeReleasePlayer.world.streamingRightsContracts = {};
activeReleasePlayer.ownedStreamingPlatform.catalogLicenses = [];
Object.values(activeReleasePlayer.world.platforms || {}).forEach(platform => {
    delete (platform as any).ai;
});
activeReleasePlayer.activeReleases = [{
    id: 'production-release-1',
    name: 'Legacy Streaming Picture',
    type: 'MOVIE',
    roleType: 'LEAD',
    distributionPhase: 'STREAMING',
    weekNum: 8,
    weeklyGross: [],
    totalGross: 80_000_000,
    budget: 25_000_000,
    status: 'FINISHED',
    productionPerformance: 76,
    streamingRevenue: 18_250_000,
    streamingUpfrontFee: 18_000_000,
    streamingRoyaltyRevenue: 250_000,
    streamingFundingAmount: 3_000_000,
    studioRoyaltyPercentage: 8,
    streaming: {
        platformId: 'NETFLIX',
        weekOnPlatform: 8,
        totalViews: 22_000_000,
        weeklyViews: [8_000_000, 5_000_000],
        isLeaving: false,
        startWeekAbsolute: 900,
    },
    projectDetails: {
        studioId: 'player-studio-1',
        type: 'MOVIE',
        genre: 'DRAMA',
        hiddenStats: { qualityScore: 75 },
    },
}, {
    id: 'pending-release-1',
    name: 'Pending Offer Picture',
    type: 'MOVIE',
    roleType: 'LEAD',
    distributionPhase: 'STREAMING_BIDDING',
    weekNum: 5,
    weeklyGross: [],
    totalGross: 25_000_000,
    budget: 12_000_000,
    status: 'FINISHED',
    productionPerformance: 65,
    bids: [{ platformId: 'HULU', upfront: 10_000_000, royalty: 7, duration: 52 }],
    projectDetails: {
        studioId: 'player-studio-1',
        type: 'MOVIE',
        genre: 'COMEDY',
        hiddenStats: { qualityScore: 63 },
    },
}] as any;
const activeCashBefore = JSON.stringify({
    money: activeReleasePlayer.money,
    platformCash: Object.fromEntries(Object.entries(activeReleasePlayer.world.platforms || {}).map(([id, platform]) => [id, platform.cashReserve])),
});
const migratedActiveRelease = migrateStreamingRightsContractRegistry(activeReleasePlayer);
const activeContractId = (migratedActiveRelease.activeReleases[0] as any).streamingContractId;
assert.ok(activeContractId, 'an accepted active streaming release should gain a canonical contract reference');
assert.equal((migratedActiveRelease.activeReleases[0].streaming as any).contractId, activeContractId);
assert.equal((migratedActiveRelease.activeReleases[1] as any).streamingContractId, undefined, 'pending bids must not become contracts');
const activeContract = migratedActiveRelease.world.streamingRightsContracts![activeContractId];
assert.equal(activeContract.sourceProjectId, 'production-release-1');
assert.equal(activeContract.buyer.platformId, 'NETFLIX');
assert.equal(activeContract.startsAtAbsoluteWeek, 900);
assert.equal(activeContract.durationWeeks, 52);
assert.equal(activeContract.expiresAtAbsoluteWeek, 952);
assert.equal(activeContract.minimumGuarantee, 18_000_000);
assert.equal(activeContract.platformRevenueShare, 92);
assert.equal(activeContract.licensorRevenueShare, 8);
assert.equal(activeContract.productionFunding, 3_000_000);
assert.equal(activeContract.dealStructure, 'GUARANTEE_REVENUE_SHARE');
assert.equal(activeContract.settlement.guarantee, 'LEGACY_PAID');
assert.equal(activeContract.legacySource, 'PRODUCTION_RELEASE');
assert.equal(
    JSON.stringify({
        money: migratedActiveRelease.money,
        platformCash: Object.fromEntries(Object.entries(migratedActiveRelease.world.platforms || {}).map(([id, platform]) => [id, platform.cashReserve])),
    }),
    activeCashBefore,
    'active-release migration must not move cash',
);
const migratedActiveReleaseAgain = migrateStreamingRightsContractRegistry(structuredClone(migratedActiveRelease));
assert.deepEqual(
    migratedActiveReleaseAgain.world.streamingRightsContracts,
    migratedActiveRelease.world.streamingRightsContracts,
    'a second migration must not create or rewrite contracts',
);
assert.equal((migratedActiveReleaseAgain.activeReleases[0] as any).streamingContractId, activeContractId);

const currentSigningFixture = structuredClone(activeReleasePlayer);
currentSigningFixture.activeReleases[0] = {
    ...currentSigningFixture.activeReleases[0],
    distributionPhase: 'THEATRICAL',
    streaming: {
        platformId: 'NETFLIX',
        weekOnPlatform: 1,
        totalViews: 0,
        weeklyViews: [],
        isLeaving: false,
        startWeekAbsolute: 950,
    },
    streamingContractId: undefined,
};
const currentSigningCashBefore = JSON.stringify({
    money: currentSigningFixture.money,
    platformCash: currentSigningFixture.world.platforms!.NETFLIX.cashReserve,
});
const currentSigning = registerProductionStreamingRightsContract(currentSigningFixture, {
    sourceProjectId: 'production-release-1',
    title: 'Current Signing Picture',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    sellerStudioId: 'player-studio-1',
    sellerStudioName: 'Player Studio',
    buyerPlatformId: 'NETFLIX',
    minimumGuarantee: 24_000_000,
    platformRevenueShare: 91,
    productionFunding: 4_000_000,
    futureSeasonFunding: 2_000_000,
    guaranteeRecoupment: 'RECOUPABLE',
    backendCap: 18_000_000,
    territory: 'MULTI_REGION',
    countryIds: ['US', 'IN'],
    exclusivity: 'NON_EXCLUSIVE',
    localization: 'DUBS_AND_SUBTITLES',
    renewalOption: true,
    signedAtAbsoluteWeek: 940,
    startsAtAbsoluteWeek: 950,
    durationWeeks: 104,
});
assert.equal(currentSigning.changed, true, 'a current Production House signing should create one canonical contract');
assert.ok(currentSigning.contract);
assert.equal(currentSigning.contract?.minimumGuarantee, 24_000_000);
assert.equal(currentSigning.contract?.durationWeeks, 104);
assert.equal(currentSigning.contract?.expiresAtAbsoluteWeek, 1054);
assert.equal(currentSigning.contract?.platformRevenueShare, 91);
assert.equal(currentSigning.contract?.productionFunding, 4_000_000);
assert.equal(currentSigning.contract?.futureSeasonFunding, 2_000_000);
assert.equal(currentSigning.contract?.backendBasis, 'ADJUSTED_GROSS_RECEIPTS');
assert.equal(currentSigning.contract?.guaranteeRecoupment, 'RECOUPABLE');
assert.equal(currentSigning.contract?.backendCap, 18_000_000);
assert.equal(currentSigning.contract?.cumulativeRoyaltyAccrued, 0);
assert.equal(currentSigning.contract?.cumulativeRoyaltyPaid, 0);
assert.equal(currentSigning.contract?.territory, 'MULTI_REGION');
assert.deepEqual(currentSigning.contract?.countryIds, ['US', 'IN']);
assert.equal(currentSigning.contract?.exclusivity, 'NON_EXCLUSIVE');
assert.equal(currentSigning.contract?.localization, 'DUBS_AND_SUBTITLES');
assert.equal(currentSigning.contract?.renewalOption, true);
assert.equal(currentSigning.contract?.settlement.guarantee, 'PAID');
assert.equal(currentSigning.player.activeReleases[0].streamingContractId, currentSigning.contract?.id);
assert.equal(JSON.stringify({
    money: currentSigning.player.money,
    platformCash: currentSigning.player.world.platforms!.NETFLIX.cashReserve,
}), currentSigningCashBefore, 'contract registration must not repeat the cash movement performed by the signing route');
const currentSigningReplay = registerProductionStreamingRightsContract(currentSigning.player, {
    sourceProjectId: 'production-release-1',
    title: 'Current Signing Picture',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    sellerStudioId: 'player-studio-1',
    sellerStudioName: 'Player Studio',
    buyerPlatformId: 'NETFLIX',
    minimumGuarantee: 24_000_000,
    platformRevenueShare: 91,
    productionFunding: 4_000_000,
    futureSeasonFunding: 2_000_000,
    signedAtAbsoluteWeek: 940,
    startsAtAbsoluteWeek: 950,
    durationWeeks: 104,
});
assert.equal(currentSigningReplay.changed, false, 'replaying the same Production House signing must be idempotent');
assert.deepEqual(currentSigningReplay.player.world.streamingRightsContracts, currentSigning.player.world.streamingRightsContracts);

const loadedLegacySave = migratePlayerSave(structuredClone(activeReleasePlayer));
const loadedContractId = loadedLegacySave.activeReleases[0].streamingContractId;
assert.ok(loadedContractId, 'the main save migration boundary must invoke contract migration');
assert.ok(loadedLegacySave.world.streamingRightsContracts?.[loadedContractId!]);
const loadedLegacySaveAgain = migratePlayerSave(structuredClone(loadedLegacySave));
assert.deepEqual(loadedLegacySaveAgain.world.streamingRightsContracts, loadedLegacySave.world.streamingRightsContracts);
assert.equal(loadedLegacySaveAgain.activeReleases[0].streamingContractId, loadedContractId);

const compactionFixture = structuredClone(loadedLegacySave);
const compactionActiveContract = compactionFixture.world.streamingRightsContracts![loadedContractId!];
const terminalContracts = Object.fromEntries(Array.from({ length: 245 }, (_, index) => {
    const id = `expired-contract-${String(index).padStart(3, '0')}`;
    return [id, {
        ...compactionActiveContract,
        id,
        idempotencyKey: `expired:${index}`,
        sourceProjectId: `expired-project-${index}`,
        titleAtSigning: `Expired Picture ${index}`,
        startsAtAbsoluteWeek: index,
        expiresAtAbsoluteWeek: index + 52,
        status: 'EXPIRED' as const,
    }];
}));
compactionFixture.world.streamingRightsContracts = {
    ...compactionFixture.world.streamingRightsContracts,
    ...terminalContracts,
    malformed: { id: '', sourceProjectId: '' } as any,
};
const compactedContractsPlayer = compactPlayerForPersistence(compactionFixture);
const compactedRegistry = compactedContractsPlayer.world.streamingRightsContracts || {};
assert.ok(compactedRegistry[loadedContractId!], 'active release contract must survive save compaction');
assert.equal(compactedRegistry.malformed, undefined, 'malformed canonical contracts must be discarded');
assert.equal(
    Object.values(compactedRegistry).filter(item => item.status !== 'ACTIVE').length,
    240,
    'unreferenced terminal contract history must be bounded',
);
const transferredCompactedContracts = migratePlayerSave(JSON.parse(JSON.stringify(compactedContractsPlayer)));
assert.deepEqual(
    transferredCompactedContracts.world.streamingRightsContracts,
    compactedContractsPlayer.world.streamingRightsContracts,
    'JSON save transfer and migration must preserve the compacted canonical registry',
);

console.log('Unified streaming contract foundation Phase 1 audit passed.');
