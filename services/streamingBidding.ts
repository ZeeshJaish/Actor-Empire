import type {
    PlatformId,
    StreamingBiddingEvent,
    StreamingBiddingPlatformInput,
    StreamingBiddingPlatformState,
    StreamingBiddingSession,
    StreamingBiddingSessionRegistry,
    StreamingOfferVersion,
    StreamingRightsDealStructure,
    StreamingRightsLocalizationTerms,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';

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
    platformId: PlatformId | null,
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
}

const buildOffer = (input: OfferBuildInput): StreamingOfferVersion => {
    const rng = createDeterministicRng(`${input.sessionId}:${input.platform.id}:offer:${input.revision}:${input.variant}`);
    const structureRoll = rng();
    const isSeriesFunding = input.projectType === 'SERIES' && structureRoll > 0.66;
    const hasBackend = structureRoll > 0.2;
    const backendPoints = hasBackend ? Math.round(1 + rng() * 11) : 0;
    const guaranteeRecoupment = hasBackend && rng() > 0.52 ? 'RECOUPABLE' as const : 'NON_RECOUPABLE' as const;
    const durationWeeks = [52, 104, 156][Math.min(2, Math.floor(rng() * 3))];
    const exclusivity = rng() > 0.22 ? 'EXCLUSIVE' as const : 'NON_EXCLUSIVE' as const;
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
        territory: 'GLOBAL',
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
    const expectedTitleGross = roundMoney(Math.max(
        Math.max(1_000_000, input.projectBudget) * qualityMultiplier * (input.projectType === 'SERIES' ? 1.18 : 1),
        theatricalProof,
        platform.baseBid * 2.5,
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
        localizationLevelCap: platform.localizationLevelCap || 'DUBS_AND_SUBTITLES',
        localizationRequirements: platform.localizationRequirements?.map(requirement => ({
            ...requirement,
            countryIds: [...requirement.countryIds].sort(),
        })) || [],
    };
};

export const createStreamingBiddingSession = (input: CreateStreamingBiddingSessionInput): StreamingBiddingSession => {
    const absoluteWeek = Math.max(0, Math.floor(Number(input.absoluteWeek) || 0));
    const idempotencyKey = `streaming-bidding:${input.projectId}:${input.sellerStudioId}:${absoluteWeek}`;
    const sessionId = createDeterministicId('streaming_bidding', idempotencyKey);
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
        projectId: input.projectId,
        title: input.title,
        sellerStudioId: input.sellerStudioId,
        sellerStudioName: input.sellerStudioName,
        absoluteWeek,
        projectType: input.projectType,
        genre: input.genre || 'UNKNOWN',
        status: 'LIVE',
        roomSecondsRemaining: ROOM_OPEN_SECONDS,
        activeSecondsElapsed: 0,
        materialEventCount: 0,
        platformStates,
        offers: [clearingOffer],
        events: [openedEvent],
        acceptedOfferId: null,
        closedAtActiveSecond: null,
    };
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
    };

    if (!currentOffer) {
        const rng = createDeterministicRng(`${session.id}:${state.platformId}:opening-pitch`);
        const guaranteeTarget = Math.min(
            state.fixedExposureCeiling,
            Math.max(1_000_000, state.expectedTitleGross * (0.34 + rng() * 0.28)),
        );
        const offer = buildOffer({
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
        });
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

    let variant: OfferBuildInput['variant'];
    let guaranteeTarget: number;
    if (competitorValue > currentValue * 1.12 && state.fixedExposureCeiling > currentOffer.fixedExposure * 1.08) {
        variant = 'UP';
        guaranteeTarget = Math.min(
            state.fixedExposureCeiling,
            Math.max(currentOffer.minimumGuarantee * 1.14, competitorValue * (0.82 + rng() * 0.12)),
        );
    } else if (currentValue > Math.max(1_000_000, competitorValue) * 1.34) {
        variant = 'DOWN';
        guaranteeTarget = Math.max(1_000_000, currentOffer.minimumGuarantee * (0.68 + rng() * 0.12));
    } else {
        variant = 'RESTRUCTURE';
        guaranteeTarget = Math.min(
            state.fixedExposureCeiling,
            Math.max(1_000_000, currentOffer.minimumGuarantee * (rng() > 0.5 ? 1.08 : 0.91)),
        );
    }
    const revision = state.revision + 1;
    const revised = buildOffer({
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
    });
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
        return offer && (offer.status === 'ACTIVE' || offer.status === 'FINAL') ? [offer] : [];
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
    return {
        ...session,
        status: 'ACCEPTED',
        acceptedOfferId: selectable.id,
        closedAtActiveSecond: session.closedAtActiveSecond ?? session.activeSecondsElapsed,
        offers: session.offers.map(offer => {
            if (offer.id === selectable.id) return { ...offer, status: 'ACCEPTED' as const };
            if (offer.status === 'ACTIVE' || offer.status === 'FINAL') return { ...offer, status: 'WITHDRAWN' as const };
            return offer;
        }),
        platformStates: session.platformStates.map(state => ({
            ...state,
            status: state.currentOfferId === selectable.id ? 'FINAL' as const : 'WITHDRAWN' as const,
            secondsUntilAction: 0,
        })),
        events: [...session.events, createEvent(session.id, 'ACCEPTED', session.activeSecondsElapsed, selectable.platformId, selectable.id, session.events.length)],
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
    const offerIds = new Set<string>();
    for (const rawOffer of value.offers) {
        if (!isRecord(rawOffer) || typeof rawOffer.id !== 'string' || !rawOffer.id || offerIds.has(rawOffer.id)) return false;
        if (rawOffer.sessionId !== value.id || !['ACTIVE', 'FINAL', 'REPLACED', 'WITHDRAWN', 'ACCEPTED'].includes(String(rawOffer.status))) return false;
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
        registry[rawSession.id] = {
            ...rawSession,
            platformStates: rawSession.platformStates.map(state => ({
                ...state,
                color: resolveStreamingPlatformBrandById(state.platformId, state.platformName).primaryColor,
            })),
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
