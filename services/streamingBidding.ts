import type {
    PlatformId,
    StreamingCataloguePackage,
    StreamingBiddingEvent,
    StreamingBiddingPlatformInput,
    StreamingBiddingPlatformState,
    StreamingBiddingRightsLot,
    StreamingBiddingSession,
    StreamingBiddingSessionRegistry,
    StreamingLicenseExclusivity,
    StreamingOfferVersion,
    StreamingRightsDealStructure,
    StreamingRightsLocalizationTerms,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { resolveStreamingOfferRevision } from './streamingOfferRevisionIntelligence';
import { allocateStreamingCatalogueGuarantee } from './streamingCataloguePackages';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';
import { normalizeStreamingDayOneMarketIds, STREAMING_DAY_ONE_MARKETS } from './streamingDayOneMarkets';

const ROOM_OPEN_SECONDS = 15;
const PLATFORM_COOLDOWN_SECONDS = 6;
const ROOM_EVENT_FLOOR_SECONDS = 12;
const ROOM_HARD_CAP_SECONDS = 45;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

const roundMoney = (value: number): number => Math.max(0, Math.round(value / 100_000) * 100_000);

const getEventExtension = (materialEventCount: number): number => (
    materialEventCount < 3 ? 3 : materialEventCount < 6 ? 2 : 1
);

const expectedOfferValue = (offer: StreamingOfferVersion): number => (
    offer.minimumGuarantee
    + offer.productionFunding
    + offer.futureSeasonFunding
    + offer.expectedRoyaltyCost
);

export const getStreamingOfferFundingAllocation = (offer: StreamingOfferVersion): {
    productionFund: number;
    lockedFutureSeasonFund: number;
    totalFunding: number;
} => {
    const productionFund = Math.max(0, Math.round(Number(offer.productionFunding) || 0));
    const lockedFutureSeasonFund = Math.max(0, Math.round(Number(offer.futureSeasonFunding) || 0));
    return {
        productionFund,
        lockedFutureSeasonFund,
        totalFunding: productionFund + lockedFutureSeasonFund,
    };
};

const replaceOfferStatus = (
    offers: StreamingOfferVersion[],
    offerId: string,
    status: StreamingOfferVersion['status'],
): StreamingOfferVersion[] => offers.map(offer => offer.id === offerId ? { ...offer, status } : offer);

const createEvent = (
    sessionId: string,
    type: StreamingBiddingEvent['type'],
    activeSecond: number,
    platformId: string | null,
    offerId: string | null,
    ordinal: number,
): StreamingBiddingEvent => ({
    id: createDeterministicId('streaming_bid_event', sessionId, type, activeSecond, platformId || 'ROOM', offerId || 'NONE', ordinal),
    type,
    activeSecond,
    platformId,
    offerId,
});

export interface CreateStreamingBiddingSessionInput {
    projectId: string;
    title: string;
    sellerStudioId: string;
    sellerStudioName: string;
    absoluteWeek: number;
    projectType: 'MOVIE' | 'SERIES';
    genre?: string;
    projectBudget: number;
    packageScore: number;
    theatricalGross?: number;
    platforms: StreamingBiddingPlatformInput[];
    rightsLot?: StreamingBiddingRightsLot;
}

interface OfferBuildInput {
    sessionId: string;
    platform: StreamingBiddingPlatformInput;
    platformState: StreamingBiddingPlatformState;
    projectType: 'MOVIE' | 'SERIES';
    revision: number;
    activeSecond: number;
    guaranteeTarget: number;
    replacesOfferId: string | null;
    isClearingOffer: boolean;
    variant: 'OPENING' | 'UP' | 'DOWN' | 'RESTRUCTURE';
    rightsLot: StreamingBiddingRightsLot;
    requiredExclusivity?: StreamingLicenseExclusivity;
    requiredPremiereAbsoluteWeek?: number;
}

const buildOffer = (input: OfferBuildInput): StreamingOfferVersion => {
    const rng = createDeterministicRng(`${input.sessionId}:${input.platform.id}:offer:${input.revision}:${input.variant}`);
    const structureRoll = rng();
    const isSeriesFunding = input.projectType === 'SERIES' && structureRoll > 0.66;
    const hasBackend = structureRoll < clamp(input.platform.backendPreference ?? 0.5, 0.1, 0.8);
    const backendPoints = hasBackend ? Math.round(1 + rng() * 11) : 0;
    const guaranteeRecoupment = hasBackend && rng() > 0.52 ? 'RECOUPABLE' as const : 'NON_RECOUPABLE' as const;
    const supportedDurations = [52, 104, 156].filter(duration => duration <= input.rightsLot.maximumDurationWeeks);
    const durationWeeks = supportedDurations.length
        ? supportedDurations[Math.min(supportedDurations.length - 1, Math.floor(rng() * supportedDurations.length))]
        : input.rightsLot.maximumDurationWeeks;
    const exclusivity = input.requiredExclusivity || (
        rng() < clamp(input.platform.sharedRightsPreference ?? 0.22, 0.05, 0.75)
            ? 'NON_EXCLUSIVE' as const
            : 'EXCLUSIVE' as const
    );
    const generatedLocalization: StreamingRightsLocalizationTerms = rng() > 0.72
        ? 'DUBS_AND_SUBTITLES'
        : rng() > 0.35 ? 'SUBTITLES' : 'NONE';
    const localizationRank: Record<StreamingRightsLocalizationTerms, number> = {
        NONE: 0, SUBTITLES: 1, DUBS_AND_SUBTITLES: 2,
    };
    const localizationCap = input.platform.localizationLevelCap || 'DUBS_AND_SUBTITLES';
    const localization = input.platform.localizationRequirements?.length
        ? localizationCap
        : localizationRank[generatedLocalization] <= localizationRank[localizationCap]
            ? generatedLocalization
            : localizationCap;
    const fundingFraction = isSeriesFunding ? 0.16 + rng() * 0.18 : structureRoll > 0.9 ? 0.08 + rng() * 0.1 : 0;
    const productionFunding = roundMoney(Math.min(
        input.platformState.fixedExposureCeiling * 0.25,
        input.guaranteeTarget * fundingFraction,
    ));
    const futureSeasonFunding = isSeriesFunding
        ? roundMoney(Math.min(input.platformState.fixedExposureCeiling * 0.2, input.guaranteeTarget * (0.1 + rng() * 0.18)))
        : 0;
    const maximumGuarantee = Math.max(0, input.platformState.fixedExposureCeiling - productionFunding - futureSeasonFunding);
    const minimumGuarantee = roundMoney(Math.min(maximumGuarantee, Math.max(1_000_000, input.guaranteeTarget)));
    const expectedRoyaltyCost = roundMoney(input.platformState.expectedTitleGross * (backendPoints / 100));
    const fixedExposure = minimumGuarantee + productionFunding + futureSeasonFunding;
    const backendCap = backendPoints > 0 && rng() > 0.78
        ? roundMoney(Math.max(expectedRoyaltyCost, expectedRoyaltyCost * (1.25 + rng() * 1.5)))
        : null;
    const dealStructure: StreamingRightsDealStructure = productionFunding > 0 || futureSeasonFunding > 0
        ? 'PRE_BUY'
        : backendPoints > 0 ? 'GUARANTEE_REVENUE_SHARE' : 'FLAT_LICENSE';

    return {
        id: createDeterministicId('streaming_offer', input.sessionId, input.platform.id, input.revision),
        sessionId: input.sessionId,
        platformId: input.platform.id,
        platformName: input.platform.name,
        revision: input.revision,
        status: 'ACTIVE',
        replacesOfferId: input.replacesOfferId,
        isClearingOffer: input.isClearingOffer,
        dealStructure,
        minimumGuarantee,
        productionFunding,
        futureSeasonFunding,
        licensorRevenueShare: backendPoints,
        platformRevenueShare: 100 - backendPoints,
        backendBasis: 'ADJUSTED_GROSS_RECEIPTS',
        guaranteeRecoupment,
        backendCap,
        durationWeeks,
        territory: input.rightsLot.territory,
        countryIds: [...input.rightsLot.countryIds],
        windowType: input.rightsLot.windowType,
        exclusivity,
        localization,
        localizationRequirements: localization === 'NONE'
            ? []
            : input.platform.localizationRequirements?.map(requirement => ({
                ...requirement,
                countryIds: [...requirement.countryIds].sort(),
            })) || [],
        renewalOption: rng() > 0.48,
        fixedExposure,
        expectedRoyaltyCost,
        expectedTotalCost: fixedExposure + expectedRoyaltyCost,
        expectedPlatformValue: roundMoney(Math.max(0, input.platformState.expectedTitleGross - expectedRoyaltyCost - fixedExposure)),
        createdAtActiveSecond: input.activeSecond,
        proposedPremiereAbsoluteWeek: input.requiredPremiereAbsoluteWeek
            ?? input.platform.availablePremiereAbsoluteWeek
            ?? input.platform.availablePremiereAbsoluteWeeks?.[0]
            ?? input.rightsLot.startsAtAbsoluteWeek,
    };
};

const applyCatalogueTermsToOffer = (
    session: StreamingBiddingSession,
    state: StreamingBiddingPlatformState,
    offer: StreamingOfferVersion,
): StreamingOfferVersion => {
    if (session.subjectKind !== 'CATALOGUE_PACKAGE' || !session.cataloguePackageId || !session.catalogueComponents?.length) {
        return offer;
    }
    const titleFloor = session.catalogueComponents.length * 1_000_000;
    const minimumGuarantee = Math.max(titleFloor, Math.min(state.fixedExposureCeiling, offer.minimumGuarantee));
    const allocation = allocateStreamingCatalogueGuarantee({
        totalGuarantee: minimumGuarantee,
        components: session.catalogueComponents,
        platformId: state.platformId as PlatformId,
        bidderValues: state.catalogueComponentValues || Object.fromEntries(
            session.catalogueComponents.map(component => [component.sourceProjectId, component.referenceValue]),
        ),
        durationWeeks: offer.durationWeeks,
        exclusivity: offer.exclusivity,
        localization: offer.localization,
        localizationRequirements: offer.localizationRequirements || [],
    });
    if (!allocation.valid) return offer;
    const expectedRoyaltyCost = allocation.rows.reduce((sum, row) => sum + row.expectedRoyaltyCost, 0);
    const weightedBackend = minimumGuarantee > 0
        ? Math.round(allocation.rows.reduce((sum, row) => sum + row.minimumGuarantee * row.licensorRevenueShare, 0) / minimumGuarantee)
        : 0;
    return {
        ...offer,
        cataloguePackageId: session.cataloguePackageId,
        componentTerms: allocation.rows,
        dealStructure: weightedBackend > 0 ? 'GUARANTEE_REVENUE_SHARE' : 'FLAT_LICENSE',
        minimumGuarantee,
        productionFunding: 0,
        futureSeasonFunding: 0,
        licensorRevenueShare: weightedBackend,
        platformRevenueShare: 100 - weightedBackend,
        backendCap: null,
        fixedExposure: minimumGuarantee,
        expectedRoyaltyCost,
        expectedTotalCost: minimumGuarantee + expectedRoyaltyCost,
        expectedPlatformValue: roundMoney(Math.max(0, state.expectedTitleGross - minimumGuarantee - expectedRoyaltyCost)),
    };
};

const buildPlatformState = (
    input: CreateStreamingBiddingSessionInput,
    platform: StreamingBiddingPlatformInput,
    sessionId: string,
): StreamingBiddingPlatformState => {
    const brand = resolveStreamingPlatformBrandById(platform.id, platform.name);
    const safeScore = clamp(input.packageScore, 0, 100);
    const fitPenalty = Math.max(0, platform.qualityPreference - safeScore) * 0.006;
    const qualityMultiplier = clamp(0.72 + safeScore / 100 - fitPenalty, 0.45, 1.75);
    const relationshipMultiplier = clamp(platform.relationshipMultiplier, 0.84, 1.16);
    const theatricalProof = Math.max(0, Number(input.theatricalGross) || 0) * 0.32;
    const rightsLot = input.rightsLot || createDefaultStreamingBiddingRightsLot(input);
    const lotCountries = new Set(rightsLot.countryIds);
    const totalMarketValue = STREAMING_DAY_ONE_MARKETS.reduce((sum, market) => sum + market.openingRightsEstimate, 0);
    const lotMarketValue = STREAMING_DAY_ONE_MARKETS.reduce((sum, market) => (
        sum + (lotCountries.has(market.id) ? market.openingRightsEstimate : 0)
    ), 0);
    const valuableCoverage = totalMarketValue > 0 ? lotMarketValue / totalMarketValue : 1;
    const strategicCountries = new Set(normalizeStreamingDayOneMarketIds(platform.strategicCountryIds));
    const strategicValue = STREAMING_DAY_ONE_MARKETS.reduce((sum, market) => (
        sum + (lotCountries.has(market.id) && strategicCountries.has(market.id) ? market.openingRightsEstimate : 0)
    ), 0);
    const strategicDemand = strategicCountries.size
        ? clamp(0.88 + (lotMarketValue > 0 ? strategicValue / lotMarketValue : 0) * 0.5, 0.88, 1.24)
        : 1;
    const weightedCompetition = lotMarketValue > 0
        ? STREAMING_DAY_ONE_MARKETS.reduce((sum, market) => {
            if (!lotCountries.has(market.id)) return sum;
            const pressure = market.competition === 'FIERCE' ? 1.12 : market.competition === 'BUSY' ? 1.06 : 1;
            return sum + market.openingRightsEstimate * pressure;
        }, 0) / lotMarketValue
        : 1;
    const rightsLotValueMultiplier = clamp(
        (0.55 + valuableCoverage * 0.65)
        * strategicDemand
        * weightedCompetition
        * clamp(platform.catalogueGapMultiplier ?? 1, 0.82, 1.2)
        * clamp(platform.subscriberOpportunityMultiplier ?? 1, 0.82, 1.2),
        0.42,
        1.7,
    );
    const expectedTitleGross = roundMoney(Math.max(
        Math.max(1_000_000, input.projectBudget) * qualityMultiplier * (input.projectType === 'SERIES' ? 1.18 : 1) * rightsLotValueMultiplier,
        theatricalProof * rightsLotValueMultiplier,
        platform.baseBid * 2.5 * rightsLotValueMultiplier,
    ));
    const fixedExposureCeiling = roundMoney(Math.min(
        Math.max(0, platform.cashAvailable),
        Math.max(0, platform.acquisitionCeiling) * relationshipMultiplier,
        expectedTitleGross * clamp(0.72 + relationshipMultiplier * 0.28, 0.7, 1.2),
    ));
    const rng = createDeterministicRng(`${sessionId}:${platform.id}:arrival`);
    return {
        platformId: platform.id,
        platformName: platform.name,
        color: brand.primaryColor,
        status: 'WAITING',
        actionCooldownSeconds: PLATFORM_COOLDOWN_SECONDS,
        secondsUntilAction: 1 + Math.floor(rng() * 4),
        revision: 0,
        currentOfferId: null,
        isClearingBidder: false,
        fixedExposureCeiling,
        expectedTitleGross,
        relationshipMultiplier,
        rightsLotValueMultiplier,
        localizationLevelCap: platform.localizationLevelCap || 'DUBS_AND_SUBTITLES',
        localizationRequirements: platform.localizationRequirements?.map(requirement => ({
            ...requirement,
            countryIds: [...requirement.countryIds].sort(),
        })) || [],
        backendPreference: clamp(platform.backendPreference ?? 0.5, 0.1, 0.8),
        sharedRightsPreference: clamp(platform.sharedRightsPreference ?? 0.22, 0.05, 0.75),
        availablePremiereAbsoluteWeeks: [...(platform.availablePremiereAbsoluteWeeks || [])],
        availablePremiereAbsoluteWeek: platform.availablePremiereAbsoluteWeek
            ?? platform.availablePremiereAbsoluteWeeks?.[0]
            ?? rightsLot.startsAtAbsoluteWeek,
    };
};

const getCanonicalCountryIds = (): string[] => STREAMING_DAY_ONE_MARKETS.map(market => market.id).sort();

const createDefaultStreamingBiddingRightsLot = (
    input: Pick<CreateStreamingBiddingSessionInput, 'projectId' | 'sellerStudioId' | 'absoluteWeek'>,
): StreamingBiddingRightsLot => {
    const countryIds = getCanonicalCountryIds();
    const startsAtAbsoluteWeek = Math.max(0, Math.floor(Number(input.absoluteWeek) || 0));
    return {
        id: createDeterministicId(
            'streaming_rights_lot', input.projectId, input.sellerStudioId,
            startsAtAbsoluteWeek, 156, 'FIRST_WINDOW', countryIds.join(','),
        ),
        sourceProjectId: input.projectId,
        territory: 'GLOBAL',
        countryIds,
        excludedCountryIds: [],
        startsAtAbsoluteWeek,
        maximumDurationWeeks: 156,
        windowType: 'FIRST_WINDOW',
        notice: null,
    };
};

export const createStreamingBiddingSession = (input: CreateStreamingBiddingSessionInput): StreamingBiddingSession => {
    const absoluteWeek = Math.max(0, Math.floor(Number(input.absoluteWeek) || 0));
    const idempotencyKey = `streaming-bidding:${input.projectId}:${input.sellerStudioId}:${absoluteWeek}`;
    const sessionId = createDeterministicId('streaming_bidding', idempotencyKey);
    const rightsLot = input.rightsLot || createDefaultStreamingBiddingRightsLot(input);
    if (!rightsLot.countryIds.length || rightsLot.sourceProjectId !== input.projectId) {
        throw new Error('No compatible streaming-rights market remains for this room.');
    }
    const eligiblePlatforms = input.platforms
        .filter(platform => (
            platform.canStartNewBids !== false
            && platform.id
            && platform.cashAvailable >= 1_000_000
            && platform.acquisitionCeiling >= 1_000_000
        ))
        .slice()
        .sort((left, right) => left.id.localeCompare(right.id));
    if (!eligiblePlatforms.length) {
        throw new Error('No financially capable streaming platform can reserve a clearing offer.');
    }

    let platformStates = eligiblePlatforms.map(platform => buildPlatformState(input, platform, sessionId));
    const clearingState = platformStates
        .slice()
        .sort((left, right) => right.fixedExposureCeiling - left.fixedExposureCeiling || left.platformId.localeCompare(right.platformId))[0];
    const clearingPlatform = eligiblePlatforms.find(platform => platform.id === clearingState.platformId)!;
    const clearingGuarantee = Math.max(
        1_000_000,
        Math.min(clearingState.fixedExposureCeiling, clearingState.expectedTitleGross * 0.82),
    );
    const clearingOffer = buildOffer({
        sessionId,
        platform: clearingPlatform,
        platformState: clearingState,
        projectType: input.projectType,
        revision: 1,
        activeSecond: 0,
        guaranteeTarget: clearingGuarantee,
        replacesOfferId: null,
        isClearingOffer: true,
        variant: 'OPENING',
        rightsLot,
    });
    platformStates = platformStates.map(state => state.platformId === clearingState.platformId
        ? {
            ...state,
            status: 'RESPONDING',
            secondsUntilAction: PLATFORM_COOLDOWN_SECONDS,
            revision: 1,
            currentOfferId: clearingOffer.id,
            isClearingBidder: true,
        }
        : state);
    const openedEvent = createEvent(sessionId, 'OPENED', 0, clearingState.platformId, clearingOffer.id, 0);

    return {
        id: sessionId,
        idempotencyKey,
        subjectKind: 'TITLE',
        cataloguePackageId: null,
        componentLots: [],
        projectId: input.projectId,
        title: input.title,
        sellerStudioId: input.sellerStudioId,
        sellerStudioName: input.sellerStudioName,
        absoluteWeek,
        projectType: input.projectType,
        genre: input.genre || 'UNKNOWN',
        rightsLot,
        status: 'LIVE',
        roomSecondsRemaining: ROOM_OPEN_SECONDS,
        activeSecondsElapsed: 0,
        materialEventCount: 0,
        platformStates,
        offers: [clearingOffer],
        events: [openedEvent],
        acceptedOfferId: null,
        closedAtActiveSecond: null,
        lockedPremiereAbsoluteWeek: null,
    };
};

export interface CreateStreamingCatalogueBiddingSessionInput {
    cataloguePackage: StreamingCataloguePackage;
    platforms: StreamingBiddingPlatformInput[];
    bidderValuesByPlatform?: Partial<Record<PlatformId, Record<string, number>>>;
}

export const createStreamingCatalogueBiddingSession = (
    input: CreateStreamingCatalogueBiddingSessionInput,
): StreamingBiddingSession => {
    const cataloguePackage = input.cataloguePackage;
    if (cataloguePackage.components.length < 2) throw new Error('A catalogue package requires at least two eligible titles.');
    const titleFloor = cataloguePackage.components.length * 1_000_000;
    const eligiblePlatforms = input.platforms.filter(platform => (
        platform.canStartNewBids !== false
        && platform.cashAvailable >= titleFloor
        && platform.acquisitionCeiling * clamp(platform.relationshipMultiplier, 0.84, 1.16) >= titleFloor
    )).map(platform => ({
        ...platform,
        baseBid: Math.max(platform.baseBid, titleFloor / 2),
    }));
    if (!eligiblePlatforms.length) throw new Error('No platform can fund every title in this package.');
    const countryIds = Array.from(new Set(cataloguePackage.components.flatMap(component => component.rightsLot.countryIds))).sort();
    if (!countryIds.length) throw new Error('No compatible streaming-rights market remains for this package.');
    const canonicalCountryIds = getCanonicalCountryIds();
    const summaryLot: StreamingBiddingRightsLot = {
        id: createDeterministicId('streaming_package_rights_lot', cataloguePackage.id, countryIds.join(',')),
        sourceProjectId: cataloguePackage.id,
        territory: countryIds.length === canonicalCountryIds.length
            ? 'GLOBAL'
            : countryIds.length === 1 ? 'DOMESTIC' : 'MULTI_REGION',
        countryIds,
        excludedCountryIds: [],
        startsAtAbsoluteWeek: cataloguePackage.startsAtAbsoluteWeek,
        maximumDurationWeeks: Math.min(
            cataloguePackage.maximumDurationWeeks,
            ...cataloguePackage.components.map(component => component.rightsLot.maximumDurationWeeks),
        ),
        windowType: cataloguePackage.requestedWindowType,
        notice: cataloguePackage.components.some(component => component.rightsLot.excludedCountryIds.length)
            ? 'Some titles contain market exceptions. Open the title schedule for exact rights.'
            : null,
    };
    const referenceTotal = cataloguePackage.components.reduce((sum, component) => (
        sum + Math.max(1_000_000, component.referenceValue)
    ), 0);
    const session = createStreamingBiddingSession({
        projectId: cataloguePackage.id,
        title: cataloguePackage.name,
        sellerStudioId: cataloguePackage.seller.id,
        sellerStudioName: cataloguePackage.seller.name,
        absoluteWeek: cataloguePackage.createdAtAbsoluteWeek,
        projectType: 'MOVIE',
        genre: cataloguePackage.components[0]?.genre || 'CATALOGUE',
        projectBudget: Math.max(titleFloor * 2, referenceTotal),
        packageScore: cataloguePackage.components.reduce((sum, component) => sum + clamp(component.quality, 0, 100), 0) / cataloguePackage.components.length,
        theatricalGross: cataloguePackage.components.reduce((sum, component) => sum + component.theatricalGross, 0),
        platforms: eligiblePlatforms,
        rightsLot: summaryLot,
    });
    const platformStates = session.platformStates.map(state => {
        const provided = input.bidderValuesByPlatform?.[state.platformId];
        const values = Object.fromEntries(cataloguePackage.components.map(component => {
            if (provided && Number(provided[component.sourceProjectId]) > 0) {
                return [component.sourceProjectId, Number(provided[component.sourceProjectId])];
            }
            const rng = createDeterministicRng(`${cataloguePackage.id}:${state.platformId}:${component.sourceProjectId}:package-fit`);
            return [component.sourceProjectId, Math.max(1, component.referenceValue * (0.72 + rng() * 0.56))];
        }));
        return { ...state, catalogueComponentValues: values };
    });
    const packageSession: StreamingBiddingSession = {
        ...session,
        subjectKind: 'CATALOGUE_PACKAGE',
        cataloguePackageId: cataloguePackage.id,
        componentLots: cataloguePackage.components.map(component => ({ ...component.rightsLot })),
        catalogueComponents: cataloguePackage.components.map(component => ({
            ...component,
            rightsLot: { ...component.rightsLot, countryIds: [...component.rightsLot.countryIds], excludedCountryIds: [...component.rightsLot.excludedCountryIds] },
        })),
        platformStates,
    };
    const offers = packageSession.offers.map(offer => {
        const state = platformStates.find(candidate => candidate.platformId === offer.platformId)!;
        return applyCatalogueTermsToOffer(packageSession, state, offer);
    });
    if (offers.some(offer => offer.componentTerms?.length !== cataloguePackage.components.length)) {
        throw new Error('The package allocation could not produce a complete title schedule.');
    }
    return { ...packageSession, offers };
};

const extendRoomForMaterialAction = (session: StreamingBiddingSession): Pick<StreamingBiddingSession, 'roomSecondsRemaining' | 'materialEventCount'> => {
    const nextEventCount = session.materialEventCount + 1;
    const hardCapRemaining = Math.max(0, ROOM_HARD_CAP_SECONDS - session.activeSecondsElapsed);
    const extended = Math.max(
        session.roomSecondsRemaining + getEventExtension(session.materialEventCount),
        ROOM_EVENT_FLOOR_SECONDS,
    );
    return {
        roomSecondsRemaining: Math.min(hardCapRemaining, extended),
        materialEventCount: nextEventCount,
    };
};

const actForPlatform = (
    session: StreamingBiddingSession,
    state: StreamingBiddingPlatformState,
): StreamingBiddingSession => {
    const requiredExclusivity = session.offers.some(offer => (
        offer.status === 'ACCEPTED' && offer.exclusivity === 'NON_EXCLUSIVE'
    )) ? 'NON_EXCLUSIVE' as const : undefined;
    const requiredPremiereAbsoluteWeek = requiredExclusivity
        ? session.lockedPremiereAbsoluteWeek ?? undefined
        : undefined;
    const currentOffer = state.currentOfferId
        ? session.offers.find(offer => offer.id === state.currentOfferId)
        : null;
    const activeCompetitors = session.platformStates.flatMap(platformState => {
        if (platformState.platformId === state.platformId || !platformState.currentOfferId) return [];
        const offer = session.offers.find(candidate => candidate.id === platformState.currentOfferId);
        return offer && (offer.status === 'ACTIVE' || offer.status === 'FINAL') ? [offer] : [];
    });
    const competitorValue = activeCompetitors.reduce((maximum, offer) => Math.max(maximum, expectedOfferValue(offer)), 0);
    const platformInput: StreamingBiddingPlatformInput = {
        id: state.platformId,
        name: state.platformName,
        color: state.color,
        cashAvailable: state.fixedExposureCeiling,
        baseBid: Math.max(1_000_000, state.expectedTitleGross * 0.16),
        acquisitionCeiling: state.fixedExposureCeiling,
        qualityPreference: 50,
        relationshipMultiplier: state.relationshipMultiplier,
        localizationLevelCap: state.localizationLevelCap,
        localizationRequirements: state.localizationRequirements,
        backendPreference: state.backendPreference,
        sharedRightsPreference: state.sharedRightsPreference,
        availablePremiereAbsoluteWeeks: [...(state.availablePremiereAbsoluteWeeks || [])],
        availablePremiereAbsoluteWeek: state.availablePremiereAbsoluteWeek,
    };

    if (!currentOffer) {
        const rng = createDeterministicRng(`${session.id}:${state.platformId}:opening-pitch`);
        const guaranteeTarget = Math.min(
            state.fixedExposureCeiling,
            Math.max(1_000_000, state.expectedTitleGross * (0.34 + rng() * 0.28)),
        );
        const offer = applyCatalogueTermsToOffer(session, state, buildOffer({
            sessionId: session.id,
            platform: platformInput,
            platformState: state,
            projectType: session.projectType,
            revision: 1,
            activeSecond: session.activeSecondsElapsed,
            guaranteeTarget,
            replacesOfferId: null,
            isClearingOffer: false,
        variant: 'OPENING',
        rightsLot: session.rightsLot,
        requiredExclusivity,
        requiredPremiereAbsoluteWeek,
        }));
        const extension = extendRoomForMaterialAction(session);
        return {
            ...session,
            ...extension,
            offers: [...session.offers, offer],
            events: [...session.events, createEvent(session.id, 'PITCHED', session.activeSecondsElapsed, state.platformId, offer.id, session.events.length)],
            platformStates: session.platformStates.map(candidate => candidate.platformId === state.platformId
                ? { ...candidate, status: 'RESPONDING', secondsUntilAction: PLATFORM_COOLDOWN_SECONDS, revision: 1, currentOfferId: offer.id }
                : candidate),
        };
    }

    const currentValue = expectedOfferValue(currentOffer);
    const rng = createDeterministicRng(`${session.id}:${state.platformId}:decision:${state.revision + 1}`);
    if (state.revision >= 3) {
        const mustRemain = state.isClearingBidder;
        const shouldWithdraw = !mustRemain && (currentValue > state.expectedTitleGross * 1.05 || rng() < 0.28);
        const nextStatus = shouldWithdraw ? 'WITHDRAWN' as const : 'FINAL' as const;
        const offerStatus = shouldWithdraw ? 'WITHDRAWN' as const : 'FINAL' as const;
        return {
            ...session,
            offers: replaceOfferStatus(session.offers, currentOffer.id, offerStatus),
            events: [...session.events, createEvent(session.id, shouldWithdraw ? 'WITHDREW' : 'FINAL', session.activeSecondsElapsed, state.platformId, currentOffer.id, session.events.length)],
            platformStates: session.platformStates.map(candidate => candidate.platformId === state.platformId
                ? { ...candidate, status: nextStatus, secondsUntilAction: 0 }
                : candidate),
        };
    }

    const revisionDecision = resolveStreamingOfferRevision({
        currentValue,
        currentAmount: currentOffer.minimumGuarantee,
        currentExposure: currentOffer.fixedExposure,
        competitorValue,
        capacityCeiling: state.fixedExposureCeiling,
        minimumAmount: 1_000_000,
        randomFactor: rng(),
    });
    const variant: OfferBuildInput['variant'] = revisionDecision.variant;
    const guaranteeTarget = revisionDecision.targetAmount;
    const revision = state.revision + 1;
    const revised = applyCatalogueTermsToOffer(session, state, buildOffer({
        sessionId: session.id,
        platform: platformInput,
        platformState: state,
        projectType: session.projectType,
        revision,
        activeSecond: session.activeSecondsElapsed,
        guaranteeTarget,
        replacesOfferId: currentOffer.id,
        isClearingOffer: state.isClearingBidder,
        variant,
        rightsLot: session.rightsLot,
        requiredExclusivity,
        requiredPremiereAbsoluteWeek,
    }));
    const extension = extendRoomForMaterialAction(session);
    return {
        ...session,
        ...extension,
        offers: [...replaceOfferStatus(session.offers, currentOffer.id, 'REPLACED'), revised],
        events: [...session.events, createEvent(session.id, 'REVISED', session.activeSecondsElapsed, state.platformId, revised.id, session.events.length)],
        platformStates: session.platformStates.map(candidate => candidate.platformId === state.platformId
            ? { ...candidate, status: 'RESPONDING', secondsUntilAction: PLATFORM_COOLDOWN_SECONDS, revision, currentOfferId: revised.id }
            : candidate),
    };
};

const advanceOneSecond = (source: StreamingBiddingSession): StreamingBiddingSession => {
    if (source.status !== 'LIVE') return source;
    let session: StreamingBiddingSession = {
        ...source,
        activeSecondsElapsed: source.activeSecondsElapsed + 1,
        roomSecondsRemaining: Math.max(0, source.roomSecondsRemaining - 1),
        platformStates: source.platformStates.map(state => (
            state.status === 'FINAL' || state.status === 'WITHDRAWN'
                ? state
                : { ...state, secondsUntilAction: Math.max(0, state.secondsUntilAction - 1) }
        )),
    };

    const duePlatformIds = session.platformStates
        .filter(state => state.status !== 'FINAL' && state.status !== 'WITHDRAWN' && state.secondsUntilAction <= 0)
        .map(state => state.platformId);
    for (const platformId of duePlatformIds) {
        const latestState = session.platformStates.find(state => state.platformId === platformId);
        if (latestState && session.activeSecondsElapsed < ROOM_HARD_CAP_SECONDS) {
            session = actForPlatform(session, latestState);
        }
    }

    if (session.roomSecondsRemaining <= 0 || session.activeSecondsElapsed >= ROOM_HARD_CAP_SECONDS) {
        session = {
            ...session,
            status: 'CLOSING',
            roomSecondsRemaining: 0,
            closedAtActiveSecond: session.activeSecondsElapsed,
            events: [...session.events, createEvent(session.id, 'CLOSED', session.activeSecondsElapsed, null, null, session.events.length)],
        };
    }
    return session;
};

export const advanceStreamingBiddingSession = (
    source: StreamingBiddingSession,
    activeSeconds = 1,
): StreamingBiddingSession => {
    let session = source;
    const seconds = clamp(Math.floor(activeSeconds), 0, ROOM_HARD_CAP_SECONDS);
    for (let index = 0; index < seconds && session.status === 'LIVE'; index += 1) {
        session = advanceOneSecond(session);
    }
    return session;
};

export const getStreamingBiddingClosingOffers = (session: StreamingBiddingSession): StreamingOfferVersion[] => (
    session.platformStates.flatMap(state => {
        if (!state.currentOfferId) return [];
        const offer = session.offers.find(candidate => candidate.id === state.currentOfferId);
        return offer
            && (offer.status === 'ACTIVE' || offer.status === 'FINAL')
            && offer.territory === session.rightsLot.territory
            && offer.windowType === session.rightsLot.windowType
            && offer.durationWeeks <= session.rightsLot.maximumDurationWeeks
            && offer.countryIds.length === session.rightsLot.countryIds.length
            && offer.countryIds.every((countryId, index) => countryId === session.rightsLot.countryIds[index])
            ? [offer]
            : [];
    }).sort((left, right) => left.createdAtActiveSecond - right.createdAtActiveSecond || left.platformId.localeCompare(right.platformId))
);

export const acceptStreamingBiddingOffer = (
    session: StreamingBiddingSession,
    offerId: string,
): StreamingBiddingSession => {
    if (session.status === 'ACCEPTED') return session;
    if (session.status === 'LEFT') return session;
    const selectable = getStreamingBiddingClosingOffers(session).find(offer => offer.id === offerId);
    if (!selectable) return session;
    const acceptedSharedCount = session.offers.filter(offer => (
        offer.status === 'ACCEPTED' && offer.exclusivity === 'NON_EXCLUSIVE'
    )).length;
    const continuesSharedLicensing = selectable.exclusivity === 'NON_EXCLUSIVE' && acceptedSharedCount < 2;
    const lockedPremiereAbsoluteWeek = selectable.exclusivity === 'NON_EXCLUSIVE'
        ? session.lockedPremiereAbsoluteWeek ?? selectable.proposedPremiereAbsoluteWeek ?? null
        : null;
    const nextOffers = session.offers.map(offer => {
        if (offer.id === selectable.id) return { ...offer, status: 'ACCEPTED' as const };
        if (offer.status !== 'ACTIVE' && offer.status !== 'FINAL') return offer;
        if (
            continuesSharedLicensing
            && offer.exclusivity === 'NON_EXCLUSIVE'
            && offer.proposedPremiereAbsoluteWeek === lockedPremiereAbsoluteWeek
        ) return offer;
        return { ...offer, status: 'WITHDRAWN' as const };
    });
    const availableOfferIds = new Set(nextOffers
        .filter(offer => offer.status === 'ACTIVE' || offer.status === 'FINAL')
        .map(offer => offer.id));
    return {
        ...session,
        status: continuesSharedLicensing ? session.status : 'ACCEPTED',
        acceptedOfferId: selectable.id,
        lockedPremiereAbsoluteWeek,
        closedAtActiveSecond: continuesSharedLicensing
            ? session.closedAtActiveSecond
            : session.closedAtActiveSecond ?? session.activeSecondsElapsed,
        offers: nextOffers,
        platformStates: session.platformStates.map(state => {
            const hasCompatibleOffer = Boolean(state.currentOfferId && availableOfferIds.has(state.currentOfferId));
            const canStillPitchShared = continuesSharedLicensing
                && !state.currentOfferId
                && lockedPremiereAbsoluteWeek !== null
                && (state.availablePremiereAbsoluteWeeks || []).includes(lockedPremiereAbsoluteWeek);
            return {
                ...state,
                status: hasCompatibleOffer || canStillPitchShared ? state.status : 'WITHDRAWN' as const,
                secondsUntilAction: hasCompatibleOffer || canStillPitchShared ? state.secondsUntilAction : 0,
            };
        }),
        events: [...session.events, createEvent(session.id, 'ACCEPTED', session.activeSecondsElapsed, selectable.platformId, selectable.id, session.events.length)],
    };
};

export const finishStreamingBiddingSession = (session: StreamingBiddingSession): StreamingBiddingSession => {
    if (session.status === 'ACCEPTED' || session.status === 'LEFT') return session;
    const acceptedOffers = session.offers.filter(offer => offer.status === 'ACCEPTED');
    if (acceptedOffers.length === 0) return session;
    return {
        ...session,
        status: 'ACCEPTED',
        acceptedOfferId: session.acceptedOfferId || acceptedOffers[0].id,
        closedAtActiveSecond: session.closedAtActiveSecond ?? session.activeSecondsElapsed,
        offers: session.offers.map(offer => (
            offer.status === 'ACTIVE' || offer.status === 'FINAL'
                ? { ...offer, status: 'WITHDRAWN' as const }
                : offer
        )),
        platformStates: session.platformStates.map(state => ({
            ...state,
            status: 'WITHDRAWN' as const,
            secondsUntilAction: 0,
        })),
        events: [...session.events, createEvent(session.id, 'CLOSED', session.activeSecondsElapsed, null, null, session.events.length)],
    };
};

export const leaveStreamingBiddingSession = (session: StreamingBiddingSession): StreamingBiddingSession => {
    if (session.status === 'ACCEPTED' || session.status === 'LEFT') return session;
    return {
        ...session,
        status: 'LEFT',
        closedAtActiveSecond: session.closedAtActiveSecond ?? session.activeSecondsElapsed,
        events: [...session.events, createEvent(session.id, 'LEFT', session.activeSecondsElapsed, null, null, session.events.length)],
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isSameCountrySnapshot = (left: unknown, right: string[]): boolean => (
    Array.isArray(left)
    && left.length === right.length
    && left.every((countryId, index) => countryId === right[index])
);

const normalizeSessionRightsLot = (value: unknown): StreamingBiddingRightsLot | null => {
    if (!isRecord(value)) return null;
    if (value.rightsLot === undefined) {
        return createDefaultStreamingBiddingRightsLot({
            projectId: String(value.projectId || ''),
            sellerStudioId: String(value.sellerStudioId || ''),
            absoluteWeek: Number(value.absoluteWeek) || 0,
        });
    }
    if (!isRecord(value.rightsLot)) return null;
    const source = value.rightsLot;
    const countryIds = normalizeStreamingDayOneMarketIds(source.countryIds).sort();
    const rawCountryIds = Array.isArray(source.countryIds) ? source.countryIds : [];
    if (!countryIds.length || !isSameCountrySnapshot(rawCountryIds, countryIds)) return null;
    const excludedCountryIds = normalizeStreamingDayOneMarketIds(source.excludedCountryIds).sort();
    const territory = source.territory;
    const territoryMatches = territory === 'GLOBAL'
        ? countryIds.length === getCanonicalCountryIds().length
        : territory === 'DOMESTIC'
            ? countryIds.length === 1
            : territory === 'MULTI_REGION' && countryIds.length > 1 && countryIds.length < getCanonicalCountryIds().length;
    if (
        typeof source.id !== 'string' || !source.id.trim()
        || source.sourceProjectId !== value.projectId
        || !territoryMatches
        || !['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'].includes(String(source.windowType))
        || !Number.isFinite(Number(source.startsAtAbsoluteWeek))
        || !Number.isFinite(Number(source.maximumDurationWeeks))
        || Number(source.maximumDurationWeeks) < 1
    ) return null;
    return {
        id: source.id,
        sourceProjectId: String(source.sourceProjectId),
        territory: territory as StreamingBiddingRightsLot['territory'],
        countryIds,
        excludedCountryIds,
        startsAtAbsoluteWeek: Math.max(0, Math.floor(Number(source.startsAtAbsoluteWeek))),
        maximumDurationWeeks: Math.max(1, Math.floor(Number(source.maximumDurationWeeks))),
        windowType: source.windowType as StreamingBiddingRightsLot['windowType'],
        notice: typeof source.notice === 'string' && source.notice.trim() ? source.notice.trim() : null,
    };
};

const isValidSession = (value: unknown): value is StreamingBiddingSession => {
    if (!isRecord(value)) return false;
    if (
        typeof value.id !== 'string'
        || !value.id.trim()
        || typeof value.idempotencyKey !== 'string'
        || !value.idempotencyKey.trim()
        || typeof value.projectId !== 'string'
        || !value.projectId.trim()
        || typeof value.sellerStudioId !== 'string'
        || !value.sellerStudioId.trim()
        || !['LIVE', 'CLOSING', 'ACCEPTED', 'LEFT'].includes(String(value.status))
        || !Array.isArray(value.platformStates)
        || !Array.isArray(value.offers)
        || !Array.isArray(value.events)
    ) return false;
    const rightsLot = normalizeSessionRightsLot(value);
    if (!rightsLot) return false;
    const offerIds = new Set<string>();
    for (const rawOffer of value.offers) {
        if (!isRecord(rawOffer) || typeof rawOffer.id !== 'string' || !rawOffer.id || offerIds.has(rawOffer.id)) return false;
        if (rawOffer.sessionId !== value.id || !['ACTIVE', 'FINAL', 'REPLACED', 'WITHDRAWN', 'ACCEPTED'].includes(String(rawOffer.status))) return false;
        if (
            rawOffer.countryIds !== undefined
            && !isSameCountrySnapshot(rawOffer.countryIds, rightsLot.countryIds)
        ) return false;
        if (rawOffer.windowType !== undefined && rawOffer.windowType !== rightsLot.windowType) return false;
        if (rawOffer.territory !== undefined && rawOffer.territory !== rightsLot.territory && value.rightsLot !== undefined) return false;
        offerIds.add(rawOffer.id);
    }
    for (const rawState of value.platformStates) {
        if (!isRecord(rawState) || !rawState.platformId || Number(rawState.actionCooldownSeconds) !== PLATFORM_COOLDOWN_SECONDS) return false;
        if (rawState.currentOfferId !== null && !offerIds.has(String(rawState.currentOfferId))) return false;
    }
    return true;
};

export const normalizeStreamingBiddingSessionRegistry = (value: unknown): StreamingBiddingSessionRegistry => {
    if (!isRecord(value)) return {};
    const registry: StreamingBiddingSessionRegistry = {};
    for (const rawSession of Object.values(value)) {
        if (!isValidSession(rawSession) || registry[rawSession.id]) continue;
        const rightsLot = normalizeSessionRightsLot(rawSession)!;
        const platformStates = rawSession.platformStates.map(state => {
            const hasStoredPremiereWeeks = Array.isArray(state.availablePremiereAbsoluteWeeks);
            const availablePremiereAbsoluteWeeks = hasStoredPremiereWeeks
                ? state.availablePremiereAbsoluteWeeks
                    .map(week => Number(week))
                    .filter(week => Number.isFinite(week) && week >= rightsLot.startsAtAbsoluteWeek)
                : [];
            const availablePremiereAbsoluteWeek = Number.isFinite(Number(state.availablePremiereAbsoluteWeek))
                ? Number(state.availablePremiereAbsoluteWeek)
                : availablePremiereAbsoluteWeeks[0] ?? rightsLot.startsAtAbsoluteWeek;
            return {
                ...state,
                color: resolveStreamingPlatformBrandById(state.platformId, state.platformName).primaryColor,
                rightsLotValueMultiplier: Number.isFinite(Number(state.rightsLotValueMultiplier))
                    ? Number(state.rightsLotValueMultiplier)
                    : 1,
                availablePremiereAbsoluteWeeks: hasStoredPremiereWeeks
                    ? availablePremiereAbsoluteWeeks
                    : [availablePremiereAbsoluteWeek],
                availablePremiereAbsoluteWeek,
            };
        });
        const premiereByPlatform = new Map(platformStates.map(state => [state.platformId, state.availablePremiereAbsoluteWeek]));
        const offers = rawSession.offers.map(offer => ({
            ...offer,
            territory: rightsLot.territory,
            countryIds: [...rightsLot.countryIds],
            windowType: rightsLot.windowType,
            proposedPremiereAbsoluteWeek: Number.isFinite(Number(offer.proposedPremiereAbsoluteWeek))
                ? Number(offer.proposedPremiereAbsoluteWeek)
                : premiereByPlatform.get(offer.platformId) ?? rightsLot.startsAtAbsoluteWeek,
        }));
        const acceptedSharedPremiere = offers.find(offer => (
            offer.status === 'ACCEPTED' && offer.exclusivity === 'NON_EXCLUSIVE'
        ))?.proposedPremiereAbsoluteWeek;
        registry[rawSession.id] = {
            ...rawSession,
            subjectKind: rawSession.subjectKind === 'CATALOGUE_PACKAGE' ? 'CATALOGUE_PACKAGE' : 'TITLE',
            cataloguePackageId: rawSession.subjectKind === 'CATALOGUE_PACKAGE' && typeof rawSession.cataloguePackageId === 'string'
                ? rawSession.cataloguePackageId
                : null,
            componentLots: rawSession.subjectKind === 'CATALOGUE_PACKAGE' && Array.isArray(rawSession.componentLots)
                ? rawSession.componentLots.map(componentLot => ({ ...componentLot }))
                : [],
            rightsLot,
            lockedPremiereAbsoluteWeek: rawSession.lockedPremiereAbsoluteWeek !== null
                && rawSession.lockedPremiereAbsoluteWeek !== undefined
                && Number.isFinite(Number(rawSession.lockedPremiereAbsoluteWeek))
                ? Number(rawSession.lockedPremiereAbsoluteWeek)
                : acceptedSharedPremiere ?? null,
            offers,
            platformStates,
        };
    }
    return registry;
};

export const upsertStreamingBiddingSession = (
    value: unknown,
    session: StreamingBiddingSession,
): StreamingBiddingSessionRegistry => {
    const registry = normalizeStreamingBiddingSessionRegistry(value);
    if (!isValidSession(session)) return registry;
    if (registry[session.id] === session) return registry;
    return { ...registry, [session.id]: session };
};

export const getRestorableStreamingBiddingSession = (
    value: unknown,
    projectId: string,
    sellerStudioId: string,
    absoluteWeek: number,
): StreamingBiddingSession | null => {
    const week = Math.max(0, Math.floor(Number(absoluteWeek) || 0));
    return Object.values(normalizeStreamingBiddingSessionRegistry(value)).find(session => (
        session.projectId === projectId
        && session.sellerStudioId === sellerStudioId
        && session.absoluteWeek === week
    )) || null;
};
