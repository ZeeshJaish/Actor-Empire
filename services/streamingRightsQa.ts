import type {
    Player,
    PlatformId,
    StreamingRightsContract,
    StreamingRightsRenewalCase,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    normalizeStreamingRightsContractRegistry,
} from './streamingRightsCore';
import {
    getStreamingRightsStudioMandate,
    normalizeStreamingRightsCalendarState,
    updateStreamingRightsStudioMandate,
} from './streamingRightsCalendar';
import { createStreamingCataloguePackage } from './streamingCataloguePackages';

const QA_PREFIX = 'qa_rights_a8_';
const QA_TITLE_COUNT = 40;

const platformNames: Record<PlatformId, string> = {
    NETFLIX: 'Netflix',
    APPLE_TV: 'Apple TV+',
    DISNEY_PLUS: 'Disney+',
    HULU: 'Hulu',
    YOUTUBE: 'YouTube',
};

const qaPlatforms: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const qaGenres = ['DRAMA', 'ACTION', 'THRILLER', 'COMEDY', 'SCI_FI'];
const qaTitles = [
    'Midnight Province', 'The Last Monsoon', 'Glass Embassy', 'Red Frontier', 'Paper Kingdom',
    'After the Parade', 'Signal at Dawn', 'The Ninth Floor', 'Neon River', 'Borrowed Summer',
    'The Quiet Republic', 'Dust and Thunder', 'Monarch Street', 'A Map of Fire', 'The Long Weekend',
    'Winter Harbour', 'The Second Witness', 'Cobalt Sky', 'House of Static', 'One More Take',
    'The Crownless City', 'Letters from Mars', 'Fever Season', 'The Last Broadcast', 'Saltwater Run',
    'Empire of Rain', 'The Orchard Case', 'Blackout Avenue', 'Sunday People', 'A Very Small War',
    'The Golden Hour', 'Northbound', 'Fault Line', 'The Good Rival', 'Blue Room',
    'The Other Candidate', 'Eleven Minutes', 'Borderless', 'The Final Rehearsal', 'Open Secret',
];

const withoutQaEntries = <T extends { id: string }>(items: T[] | undefined): T[] => (
    (items || []).filter(item => !String(item.id).startsWith(QA_PREFIX))
);

const withoutQaRegistry = <T extends { id: string }>(value: Record<string, T> | undefined): Record<string, T> => (
    Object.fromEntries(Object.entries(value || {}).filter(([id, item]) => (
        !id.startsWith(QA_PREFIX) && !String(item.id).startsWith(QA_PREFIX)
    )))
);

const buildQaContract = (
    studioId: string,
    studioName: string,
    absoluteWeek: number,
    index: number,
): StreamingRightsContract => {
    const platformId = qaPlatforms[index % qaPlatforms.length];
    const territory = index % 5 === 0 ? 'GLOBAL' : index % 3 === 0 ? 'MULTI_REGION' : 'DOMESTIC';
    const countryIds = territory === 'GLOBAL' ? [] : territory === 'MULTI_REGION' ? ['US', 'IN', 'GB'] : ['US'];
    const startsAtAbsoluteWeek = Math.max(0, absoluteWeek - 40);
    const expiryOffsets = [4, 5, 7, 8, 12, 18, 26, 35, 52, 78, 104, 130];
    const expiresAtAbsoluteWeek = absoluteWeek + expiryOffsets[index];
    const sourceProjectId = `${QA_PREFIX}title_${String(index).padStart(2, '0')}`;
    const license = createStreamingLicenseContract({
        id: `${QA_PREFIX}contract_${String(index).padStart(2, '0')}`,
        sourceProject: {
            id: sourceProjectId,
            title: qaTitles[index],
            mediaType: index % 6 === 0 ? 'SERIES' : 'MOVIE',
            genre: qaGenres[index % qaGenres.length],
        },
        buyerPlatformId: platformId,
        platformContentPlanId: null,
        cataloguePackageId: null,
        contentSource: 'LICENSED_RELEASED_TITLE',
        licensorName: studioName,
        territory,
        countryIds,
        durationWeeks: Math.max(1, expiresAtAbsoluteWeek - startsAtAbsoluteWeek),
        exclusivity: index % 4 === 0 ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
        minimumGuarantee: 18_000_000 + index * 4_000_000,
        platformRevenueShare: 94 - index % 3,
        signedAtAbsoluteWeek: startsAtAbsoluteWeek,
        startsAtAbsoluteWeek,
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        sellerType: 'STUDIO',
        sellerPlatformId: null,
        windowType: index % 4 === 3 ? 'SECOND_WINDOW' : 'FIRST_WINDOW',
        permanentPurchase: false,
        renewalOption: true,
        sublicensingAllowed: true,
    });
    return createStreamingRightsContractFromLicense({
        license,
        seller: { type: 'PLAYER_STUDIO', id: studioId, name: studioName, platformId: null },
        buyer: { type: 'AI_PLATFORM', id: platformId, name: platformNames[platformId], platformId },
        guaranteeDisposition: 'PAID',
        settledAtAbsoluteWeek: startsAtAbsoluteWeek,
        productionFunding: 0,
        futureSeasonFunding: 0,
        localization: index % 2 === 0 ? 'DUBS_AND_SUBTITLES' : 'SUBTITLES',
        guaranteeRecoupment: index % 3 === 0 ? 'NON_RECOUPABLE' : 'RECOUPABLE',
        backendCap: null,
        idempotencyKey: `${QA_PREFIX}contract:${index}`,
    });
};

const buildQaRenewal = (
    contract: StreamingRightsContract,
    absoluteWeek: number,
    index: number,
): StreamingRightsRenewalCase => {
    const states = [
        { status: 'ACTION_REQUIRED', outcome: 'PENDING', offer: 'OFFERED', reason: null, protected: ['GLOBAL_EXCLUSIVE'] },
        { status: 'OFFER_AVAILABLE', outcome: 'PENDING', offer: 'OFFERED', reason: null, protected: [] },
        { status: 'RENEWAL_SECURED', outcome: 'DELEGATED_ACCEPTED', offer: 'OFFERED', reason: 'Strategy Mode renewed a qualified title inside the saved mandate.', protected: [] },
        { status: 'RETURNING_TO_MARKET', outcome: 'RETURN_TO_MARKET', offer: 'DECLINED', reason: 'The incumbent terms missed the saved mandate.', protected: [] },
        { status: 'LETTING_EXPIRE', outcome: 'LET_EXPIRE', offer: 'DECLINED', reason: 'The rights team declined an underperforming window.', protected: [] },
        { status: 'WATCHING', outcome: 'PENDING', offer: 'PENDING', reason: null, protected: [] },
    ] as const;
    const state = states[index];
    return {
        id: `${QA_PREFIX}renewal_${String(index).padStart(2, '0')}`,
        idempotencyKey: `${QA_PREFIX}renewal:${index}`,
        sourceContractId: contract.id,
        sourceProjectId: contract.sourceProjectId,
        title: contract.titleAtSigning,
        projectType: contract.projectType || 'MOVIE',
        genre: contract.genre || 'DRAMA',
        territory: contract.territory,
        countryIds: contract.countryIds,
        exclusivity: contract.exclusivity,
        windowType: contract.windowType || 'FIRST_WINDOW',
        seller: contract.seller,
        incumbentBuyer: contract.buyer,
        sourceExpiresAtAbsoluteWeek: contract.expiresAtAbsoluteWeek,
        renewalStartsAtAbsoluteWeek: contract.expiresAtAbsoluteWeek + 1,
        openedAtAbsoluteWeek: absoluteWeek,
        decisionDeadlineAbsoluteWeek: Math.max(absoluteWeek, contract.expiresAtAbsoluteWeek - 1),
        renewalOption: true,
        status: state.status,
        offerDisposition: state.offer,
        performance: {
            attributedRevenue: 12_000_000 + index * 5_000_000,
            viewingAccounts: 600_000 + index * 125_000,
            watchHours: 1_400_000 + index * 210_000,
            subscriberAcquisition: 24_000 + index * 3_000,
            subscriberRetention: 18_000 + index * 2_000,
            royaltiesPaid: index * 450_000,
            rating: 6.2 + index * .3,
            awards: index % 3,
            performanceScore: 58 + index * 6,
            marketDemandScore: 60 + index * 4,
            relationshipScore: 55 + index * 5,
            rivalInterestScore: 52 + index * 4,
            affordabilityScore: 78 - index * 3,
        },
        proposedEconomics: state.offer === 'OFFERED' ? {
            minimumGuarantee: contract.minimumGuarantee + 6_000_000,
            platformRevenueShare: contract.platformRevenueShare - 1,
            licensorRevenueShare: contract.licensorRevenueShare + 1,
            durationWeeks: 78,
            offerExpiresAtAbsoluteWeek: Math.max(absoluteWeek, contract.expiresAtAbsoluteWeek - 1),
        } : null,
        controlModeAtOpen: 'STRATEGY',
        policyPreferenceAtOpen: 'BALANCED',
        protectionReasons: [...state.protected],
        delegatedReason: state.reason,
        outcome: state.outcome,
        replacementContractId: state.outcome === 'DELEGATED_ACCEPTED' ? `${QA_PREFIX}replacement_02` : null,
        resolvedAtAbsoluteWeek: state.outcome === 'PENDING' ? null : absoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
    };
};

/**
 * Deterministic dev-only portfolio used by the existing cheat menu and audits.
 * No production simulation imports or calls this builder.
 */
export const buildStreamingRightsPhase8QaFixture = (source: Player, studioId: string): Player => {
    const absoluteWeek = getAbsoluteWeek(source.age, source.currentWeek);
    const studio = (source.businesses || []).find(business => business.id === studioId && business.type === 'PRODUCTION_HOUSE');
    if (!studio) return source;
    const studioName = studio.name || 'Empire Studios';
    const cleanContracts = withoutQaRegistry(normalizeStreamingRightsContractRegistry(source.world.streamingRightsContracts));
    const cleanCalendar = normalizeStreamingRightsCalendarState(source.world.streamingRightsCalendar);
    const projects = Array.from({ length: QA_TITLE_COUNT }, (_, index) => ({
        id: `${QA_PREFIX}title_${String(index).padStart(2, '0')}`,
        name: qaTitles[index],
        title: qaTitles[index],
        studioId,
        projectType: index % 6 === 0 ? 'SERIES' : 'MOVIE',
        genre: qaGenres[index % qaGenres.length],
        projectQuality: 58 + (index * 7) % 36,
        imdbRating: Number((5.9 + (index % 30) / 10).toFixed(1)),
        releasedAtAbsoluteWeek: Math.max(0, absoluteWeek - 160 + index * 3),
        status: 'FINISHED',
        gross: 30_000_000 + index * 11_000_000,
        streamingRevenue: 4_000_000 + index * 1_500_000,
    }));
    const contracts = Array.from({ length: 12 }, (_, index) => buildQaContract(studioId, studioName, absoluteWeek, index));
    contracts.forEach(contract => { cleanContracts[contract.id] = contract; });
    const renewalCases = withoutQaRegistry(cleanCalendar.renewalCases);
    contracts.slice(0, 6).forEach((contract, index) => {
        const renewal = buildQaRenewal(contract, absoluteWeek, index);
        renewalCases[renewal.id] = renewal;
    });
    let player: Player = {
        ...source,
        pastProjects: [
            ...withoutQaEntries(source.pastProjects),
            ...projects,
        ] as Player['pastProjects'],
        world: {
            ...source.world,
            streamingRightsContracts: cleanContracts,
            streamingRightsCalendar: {
                ...cleanCalendar,
                renewalCases,
                digests: cleanCalendar.digests.filter(digest => !digest.id.startsWith(QA_PREFIX)),
                lastProcessedAbsoluteWeek: absoluteWeek,
            },
            streamingCataloguePackages: withoutQaRegistry(source.world.streamingCataloguePackages),
        },
    };
    player = updateStreamingRightsStudioMandate(player, {
        studioId,
        absoluteWeek,
        patch: {
            controlMode: 'STRATEGY',
            renewalPreference: 'BALANCED',
            financialPriority: 'BALANCED_RETURN',
            distributionPriority: 'REGIONAL_OPTIMIZATION',
        },
    });
    const packageResult = createStreamingCataloguePackage(player, {
        source: 'PLAYER_CURATED',
        studioId,
        projectIds: projects.slice(20, 26).map(project => project.id),
        name: 'Empire Studios Festival Collection',
        absoluteWeek,
        startsAtAbsoluteWeek: absoluteWeek + 1,
        windowType: 'SECOND_WINDOW',
        exclusivity: 'NON_EXCLUSIVE',
        maximumDurationWeeks: 78,
        desiredCountryIds: ['US', 'IN', 'GB'],
    });
    return packageResult.player;
};

export const getStreamingRightsPhase8QaSummary = (player: Player, studioId: string) => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts));
    const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const mandate = getStreamingRightsStudioMandate(player, studioId);
    return {
        absoluteWeek,
        titleCount: player.pastProjects.filter(project => String(project.id).startsWith(`${QA_PREFIX}title_`)).length,
        contractCount: contracts.filter(contract => contract.id.startsWith(`${QA_PREFIX}contract_`)).length,
        renewalCount: Object.values(calendar.renewalCases).filter(renewal => renewal.id.startsWith(`${QA_PREFIX}renewal_`)).length,
        protectedCount: Object.values(calendar.renewalCases).filter(renewal => renewal.id.startsWith(QA_PREFIX) && renewal.status === 'ACTION_REQUIRED').length,
        delegatedCount: Object.values(calendar.renewalCases).filter(renewal => renewal.id.startsWith(QA_PREFIX) && renewal.outcome === 'DELEGATED_ACCEPTED').length,
        controlMode: mandate.controlMode,
    };
};
