import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingRightsNegotiation,
    OwnedStreamingRightsObligation,
    OwnedStreamingSublicenseDeal,
    PlatformId,
    Player,
    StreamingLicenseExclusivity,
    StreamingLicenseTerritory,
    StreamingRightsChangeOfControl,
    StreamingRightsWindowType,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    getStreamingLicenseOpportunities,
    getStreamingLicenseQuote,
    type StreamingCatalogTitle,
} from './streamingCatalog';
import { PLATFORMS } from './streamingLogic';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    registerStreamingRightsContract,
    validateStreamingRightsAvailability,
} from './streamingRightsCore';

export type StreamingRightsOpportunityKind = 'STUDIO_ACQUISITION' | 'PLATFORM_TRADE' | 'SUBLICENSE_OUT';

export interface StreamingRightsOpportunity {
    id: string;
    kind: StreamingRightsOpportunityKind;
    title: StreamingCatalogTitle;
    sellerType: 'STUDIO' | 'PLATFORM';
    sellerId: string;
    sellerName: string;
    sellerPlatformId: PlatformId | null;
    sourceLicenseId: string | null;
    recommendedTerritory: StreamingLicenseTerritory;
    recommendedWindow: StreamingRightsWindowType;
    quote: ReturnType<typeof getStreamingLicenseQuote>;
    rivalPlatformId: PlatformId;
    rivalPlatformName: string;
    rivalBidAmount: number;
    marketHeat: 'COOL' | 'ACTIVE' | 'HOT';
}

export interface StreamingRightsTermsInput {
    territory: StreamingLicenseTerritory;
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    windowType: StreamingRightsWindowType;
    minimumGuarantee: number;
    platformRevenueShare: number;
    marketingGuarantee: number;
    viewershipBonusThreshold: number;
    viewershipBonusAmount: number;
    renewalOption: boolean;
    sublicensingAllowed: boolean;
    sequelRightsIncluded: boolean;
    changeOfControl: StreamingRightsChangeOfControl;
    cancellationPenalty: number;
}

export interface StreamingRightsActionResult {
    player: Player;
    changed: boolean;
    reason?: 'NOT_ACTIVE' | 'NOT_FOUND' | 'ALREADY_OPEN' | 'NOT_READY' | 'INSUFFICIENT_TREASURY' | 'INVALID_TERMS';
    negotiation?: OwnedStreamingRightsNegotiation;
}

const ACTIVE_NEGOTIATION_STATUSES = new Set(['OPEN', 'COUNTERED', 'READY_TO_SIGN']);
const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 250_000) * 250_000);

const marketCycle = (absoluteWeek: number): number => Math.max(0, Math.floor(absoluteWeek / 4));

const chooseRival = (
    seed: string,
    opportunityId: string,
    absoluteWeek: number,
    excludedPlatformId: PlatformId | null,
): { id: PlatformId; name: string; pressure: number } => {
    const rng = createDeterministicRng(`${seed}:rights-rival:${opportunityId}:${marketCycle(absoluteWeek)}`);
    const candidates = PLATFORM_IDS.filter(id => id !== excludedPlatformId);
    const id = candidates[Math.floor(rng() * candidates.length)] || 'NETFLIX';
    return { id, name: PLATFORMS[id].name, pressure: 0.88 + rng() * 0.34 };
};

const buildOpportunity = (
    platform: OwnedStreamingPlatformState,
    title: StreamingCatalogTitle,
    absoluteWeek: number,
    sellerType: 'STUDIO' | 'PLATFORM',
    sellerId: string,
    sellerName: string,
    sellerPlatformId: PlatformId | null,
    kind: StreamingRightsOpportunityKind,
    sourceLicenseId: string | null = null,
): StreamingRightsOpportunity => {
    const recommendedTerritory: StreamingLicenseTerritory = title.rating && title.rating >= 8 ? 'GLOBAL' : 'MULTI_REGION';
    const recommendedWindow: StreamingRightsWindowType = sellerType === 'PLATFORM' ? 'SECOND_WINDOW' : 'FIRST_WINDOW';
    const quote = getStreamingLicenseQuote(title, recommendedTerritory, kind === 'SUBLICENSE_OUT' ? 52 : 104, 'NON_EXCLUSIVE');
    const rival = chooseRival(platform.simulationSeed, `${kind}:${title.id}`, absoluteWeek, sellerPlatformId);
    const heatScore = rival.pressure * ((title.rating || 6.5) / 7);
    const marketHeat = heatScore >= 1.16 ? 'HOT' : heatScore >= 0.96 ? 'ACTIVE' : 'COOL';
    return {
        id: `${kind}:${sourceLicenseId || title.id}`,
        kind,
        title,
        sellerType,
        sellerId,
        sellerName,
        sellerPlatformId,
        sourceLicenseId,
        recommendedTerritory,
        recommendedWindow,
        quote,
        rivalPlatformId: rival.id,
        rivalPlatformName: rival.name,
        rivalBidAmount: roundMoney(quote.suggestedGuarantee * rival.pressure),
        marketHeat,
    };
};

export const getStreamingRightsOpportunities = (player: Player): StreamingRightsOpportunity[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE') return [];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platformTitles = new Map(
        (player.pastProjects || [])
            .filter(project => Boolean(project.streamingPlatform))
            .map(project => [project.id, project]),
    );
    const inbound = getStreamingLicenseOpportunities(player).map(title => {
        const tradedTitle = platformTitles.get(title.id);
        const sellerPlatformId = tradedTitle?.streamingPlatform || null;
        return buildOpportunity(
            platform,
            title,
            absoluteWeek,
            sellerPlatformId ? 'PLATFORM' : 'STUDIO',
            sellerPlatformId || title.studioId,
            sellerPlatformId ? PLATFORMS[sellerPlatformId].name : title.studioName,
            sellerPlatformId,
            sellerPlatformId ? 'PLATFORM_TRADE' : 'STUDIO_ACQUISITION',
        );
    });

    const activeLicenses = platform.catalogLicenses
        .filter(license => license.status === 'ACTIVE' && license.expiresAtAbsoluteWeek >= absoluteWeek)
        .filter(license => license.sublicensingAllowed);
    const licensedOutbound = activeLicenses.map(license => buildOpportunity(
        platform,
        {
            id: license.sourceProjectId,
            title: license.titleAtSigning,
            projectType: 'MOVIE',
            genre: 'Licensed',
            rating: null,
            releaseYear: null,
            gross: license.minimumGuarantee * 8,
            studioId: platform.identity?.slug || 'owned-platform',
            studioName: platform.identity?.name || 'Your platform',
            source: 'EXTERNAL_MARKET',
        },
        absoluteWeek,
        'PLATFORM',
        platform.identity?.slug || 'owned-platform',
        platform.identity?.name || 'Your platform',
        null,
        'SUBLICENSE_OUT',
        license.id,
    ));
    const originalOutbound = platform.originalCommissions
        .filter(commission => commission.status === 'RELEASED' && commission.canonicalProjectId)
        .filter(commission => commission.lifecycleDecision?.type === 'LICENSE_WINDOW')
        .map(commission => buildOpportunity(
            platform,
            {
                id: commission.canonicalProjectId!,
                title: commission.title,
                projectType: commission.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
                genre: commission.genre,
                rating: null,
                releaseYear: null,
                gross: commission.productionFundingApplied * 5,
                studioId: platform.identity?.slug || 'owned-platform',
                studioName: platform.identity?.name || 'Your platform',
                source: 'OWNED_LIBRARY',
            },
            absoluteWeek,
            'PLATFORM',
            platform.identity?.slug || 'owned-platform',
            platform.identity?.name || 'Your platform',
            null,
            'SUBLICENSE_OUT',
            `original:${commission.id}`,
        ));
    return [...inbound, ...licensedOutbound, ...originalOutbound]
        .filter(opportunity => !platform.rightsNegotiations.some(negotiation => (
            negotiation.idempotencyKey === `${opportunity.id}:${marketCycle(absoluteWeek)}`
            && ACTIVE_NEGOTIATION_STATUSES.has(negotiation.status)
        )))
        .slice(0, 18);
};

export const createDefaultStreamingRightsTerms = (
    opportunity: StreamingRightsOpportunity,
): StreamingRightsTermsInput => ({
    territory: opportunity.kind === 'SUBLICENSE_OUT' ? 'DOMESTIC' : opportunity.recommendedTerritory,
    durationWeeks: opportunity.kind === 'SUBLICENSE_OUT' ? 52 : 104,
    exclusivity: 'NON_EXCLUSIVE',
    windowType: opportunity.recommendedWindow,
    minimumGuarantee: opportunity.quote.suggestedGuarantee,
    platformRevenueShare: opportunity.kind === 'SUBLICENSE_OUT' ? 62 : opportunity.quote.targetPlatformRevenueShare,
    marketingGuarantee: roundMoney(opportunity.quote.suggestedGuarantee * 0.12),
    viewershipBonusThreshold: Math.max(100_000, Math.round(opportunity.quote.suggestedGuarantee / 45)),
    viewershipBonusAmount: roundMoney(opportunity.quote.suggestedGuarantee * 0.08),
    renewalOption: true,
    sublicensingAllowed: opportunity.kind !== 'SUBLICENSE_OUT',
    sequelRightsIncluded: false,
    changeOfControl: 'NOTICE',
    cancellationPenalty: roundMoney(opportunity.quote.suggestedGuarantee * 0.22),
});

const normalizeTerms = (terms: StreamingRightsTermsInput): StreamingRightsTermsInput => ({
    territory: ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'].includes(terms.territory) ? terms.territory : 'MULTI_REGION',
    durationWeeks: [26, 52, 104, 156, 260, 520].includes(terms.durationWeeks) ? terms.durationWeeks : 104,
    exclusivity: terms.exclusivity === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'NON_EXCLUSIVE',
    windowType: ['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'].includes(terms.windowType) ? terms.windowType : 'SECOND_WINDOW',
    minimumGuarantee: roundMoney(clamp(terms.minimumGuarantee, 0, 5_000_000_000)),
    platformRevenueShare: Math.round(clamp(terms.platformRevenueShare, 45, 90)),
    marketingGuarantee: roundMoney(clamp(terms.marketingGuarantee, 0, 1_000_000_000)),
    viewershipBonusThreshold: Math.round(clamp(terms.viewershipBonusThreshold, 0, 100_000_000)),
    viewershipBonusAmount: roundMoney(clamp(terms.viewershipBonusAmount, 0, 1_000_000_000)),
    renewalOption: Boolean(terms.renewalOption),
    sublicensingAllowed: Boolean(terms.sublicensingAllowed),
    sequelRightsIncluded: Boolean(terms.sequelRightsIncluded),
    changeOfControl: ['NONE', 'NOTICE', 'CONSENT_REQUIRED'].includes(terms.changeOfControl) ? terms.changeOfControl : 'NOTICE',
    cancellationPenalty: roundMoney(clamp(terms.cancellationPenalty, 0, 2_000_000_000)),
});

export const openStreamingRightsNegotiation = (
    player: Player,
    opportunityId: string,
    inputTerms?: StreamingRightsTermsInput,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE') return { player, changed: false, reason: 'NOT_ACTIVE' };
    const opportunity = getStreamingRightsOpportunities(player).find(item => item.id === opportunityId);
    if (!opportunity) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `${opportunity.id}:${marketCycle(absoluteWeek)}`;
    const existing = platform.rightsNegotiations.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { player, changed: false, reason: 'ALREADY_OPEN', negotiation: existing };
    const terms = normalizeTerms(inputTerms || createDefaultStreamingRightsTerms(opportunity));
    const negotiation: OwnedStreamingRightsNegotiation = {
        id: createDeterministicId('streaming_rights_negotiation', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        kind: opportunity.kind === 'SUBLICENSE_OUT' ? 'SUBLICENSE_OUT' : 'ACQUIRE',
        sourceProjectId: opportunity.title.id,
        sourceLicenseId: opportunity.sourceLicenseId,
        title: opportunity.title.title,
        projectType: opportunity.title.projectType,
        genre: opportunity.title.genre,
        sellerType: opportunity.sellerType,
        sellerId: opportunity.sellerId,
        sellerName: opportunity.sellerName,
        buyerPlatformId: opportunity.kind === 'SUBLICENSE_OUT' ? opportunity.rivalPlatformId : null,
        buyerName: opportunity.kind === 'SUBLICENSE_OUT' ? opportunity.rivalPlatformName : null,
        ...terms,
        rivalPlatformId: opportunity.kind === 'SUBLICENSE_OUT' ? null : opportunity.rivalPlatformId,
        rivalPlatformName: opportunity.kind === 'SUBLICENSE_OUT' ? null : opportunity.rivalPlatformName,
        rivalBidAmount: opportunity.rivalBidAmount,
        marketHeat: opportunity.marketHeat,
        status: 'OPEN',
        round: 0,
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        createdAtAbsoluteWeek: absoluteWeek,
        updatedAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: absoluteWeek + 3,
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: [...platform.rightsNegotiations, negotiation],
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

export const reviseStreamingRightsNegotiation = (
    player: Player,
    negotiationId: string,
    inputTerms: StreamingRightsTermsInput,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!current || !ACTIVE_NEGOTIATION_STATUSES.has(current.status)) return { player, changed: false, reason: 'NOT_FOUND' };
    const terms = normalizeTerms(inputTerms);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const negotiation = { ...current, ...terms, status: 'OPEN' as const, updatedAtAbsoluteWeek: absoluteWeek };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? negotiation : item),
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

export const submitStreamingRightsOffer = (
    player: Player,
    negotiationId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!current || !ACTIVE_NEGOTIATION_STATUSES.has(current.status)) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (absoluteWeek > current.expiresAtAbsoluteWeek) return { player, changed: false, reason: 'NOT_READY' };
    const rng = createDeterministicRng(`${platform.simulationSeed}:rights-offer:${current.id}:${current.round + 1}`);
    const referencePrice = Math.max(1, current.rivalBidAmount);
    const moneyScore = current.kind === 'SUBLICENSE_OUT'
        ? referencePrice / Math.max(1, current.minimumGuarantee)
        : current.minimumGuarantee / referencePrice;
    const shareScore = current.kind === 'SUBLICENSE_OUT'
        ? (100 - current.platformRevenueShare) / 38
        : (100 - current.platformRevenueShare) / 32;
    const clauseScore = (
        (current.renewalOption ? 0.04 : 0)
        + (current.sublicensingAllowed ? -0.03 : 0.03)
        + (current.marketingGuarantee > referencePrice * 0.08 ? 0.06 : 0)
        + (current.changeOfControl === 'CONSENT_REQUIRED' ? 0.04 : 0)
    );
    const score = moneyScore * 0.72 + shareScore * 0.18 + clauseScore + rng() * 0.08;
    const nextRound = Math.min(3, current.round + 1);
    let status: OwnedStreamingRightsNegotiation['status'] = 'COUNTERED';
    if (score >= 0.91 || nextRound >= 3) status = score >= 0.78 ? 'READY_TO_SIGN' : 'LOST';
    const counterGuarantee = status === 'COUNTERED'
        ? roundMoney(current.kind === 'SUBLICENSE_OUT'
            ? Math.max(current.minimumGuarantee * 0.92, referencePrice * 0.83)
            : Math.max(current.minimumGuarantee * 1.08, referencePrice * 0.92))
        : null;
    const counterShare = status === 'COUNTERED'
        ? Math.round(clamp(
            current.platformRevenueShare + (current.kind === 'SUBLICENSE_OUT' ? 3 : -3),
            45,
            90,
        ))
        : null;
    const negotiation: OwnedStreamingRightsNegotiation = {
        ...current,
        status,
        round: nextRound,
        counterMinimumGuarantee: counterGuarantee,
        counterPlatformRevenueShare: counterShare,
        updatedAtAbsoluteWeek: absoluteWeek,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${current.id}:round:${nextRound}`),
        idempotencyKey: `${current.id}:round:${nextRound}`,
        absoluteWeek,
        type: 'LICENSE_NEGOTIATION_UPDATED',
        summary: status === 'READY_TO_SIGN'
            ? `${current.title} reached signature terms after round ${nextRound}.`
            : status === 'LOST'
                ? `${current.title} was lost to competitive pressure.`
                : `${current.sellerName} countered the ${current.title} offer.`,
        source: 'PLAYER_ACTION',
        metadata: { negotiationId: current.id, round: nextRound, status },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? negotiation : item),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

export const acceptStreamingRightsCounter = (
    player: Player,
    negotiationId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!current || current.status !== 'COUNTERED' || current.counterMinimumGuarantee == null || current.counterPlatformRevenueShare == null) {
        return { player, changed: false, reason: 'NOT_READY' };
    }
    const negotiation: OwnedStreamingRightsNegotiation = {
        ...current,
        minimumGuarantee: current.counterMinimumGuarantee,
        platformRevenueShare: current.counterPlatformRevenueShare,
        status: 'READY_TO_SIGN',
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? negotiation : item),
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

const createObligations = (
    platform: OwnedStreamingPlatformState,
    negotiation: OwnedStreamingRightsNegotiation,
    licenseId: string,
    absoluteWeek: number,
): OwnedStreamingRightsObligation[] => [
    ...(negotiation.marketingGuarantee > 0 ? [{
        id: createDeterministicId('streaming_rights_obligation', platform.simulationSeed, licenseId, 'marketing'),
        licenseId,
        sourceProjectId: negotiation.sourceProjectId,
        title: negotiation.title,
        type: 'MARKETING_SPEND' as const,
        targetAmount: negotiation.marketingGuarantee,
        observedAmount: 0,
        dueAtAbsoluteWeek: absoluteWeek + 4,
        status: 'PENDING' as const,
        breachPenalty: negotiation.cancellationPenalty,
        successPayment: 0,
        resolvedAtAbsoluteWeek: null,
    }] : []),
    ...(negotiation.viewershipBonusThreshold > 0 ? [{
        id: createDeterministicId('streaming_rights_obligation', platform.simulationSeed, licenseId, 'viewership'),
        licenseId,
        sourceProjectId: negotiation.sourceProjectId,
        title: negotiation.title,
        type: 'VIEWERSHIP_THRESHOLD' as const,
        targetAmount: negotiation.viewershipBonusThreshold,
        observedAmount: 0,
        dueAtAbsoluteWeek: absoluteWeek + 6,
        status: 'PENDING' as const,
        breachPenalty: negotiation.cancellationPenalty,
        successPayment: negotiation.viewershipBonusAmount,
        resolvedAtAbsoluteWeek: null,
    }] : []),
];

export const signStreamingRightsDeal = (
    player: Player,
    negotiationId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const negotiation = platform.rightsNegotiations.find(item => item.id === negotiationId);
    if (!negotiation || negotiation.status !== 'READY_TO_SIGN') return { player, changed: false, reason: 'NOT_READY' };
    if (negotiation.kind !== 'SUBLICENSE_OUT' && platform.treasuryCash < negotiation.minimumGuarantee) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', negotiation };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const signedNegotiation = { ...negotiation, status: 'SIGNED' as const, updatedAtAbsoluteWeek: absoluteWeek };
    let nextPlatform = platform;
    let nextWorld = player.world;
    if (negotiation.kind === 'SUBLICENSE_OUT') {
        const buyerPlatformId = negotiation.buyerPlatformId || 'NETFLIX';
        const deal: OwnedStreamingSublicenseDeal = {
            id: createDeterministicId('streaming_sublicense', platform.simulationSeed, negotiation.id),
            sourceLicenseId: negotiation.sourceLicenseId || `original:${negotiation.sourceProjectId}`,
            sourceProjectId: negotiation.sourceProjectId,
            title: negotiation.title,
            buyerPlatformId,
            buyerName: negotiation.buyerName || PLATFORMS[buyerPlatformId].name,
            territory: negotiation.territory,
            durationWeeks: negotiation.durationWeeks,
            exclusivity: negotiation.exclusivity,
            upfrontFee: negotiation.minimumGuarantee,
            sellerRevenueShare: negotiation.platformRevenueShare,
            buyerRevenueShare: 100 - negotiation.platformRevenueShare,
            signedAtAbsoluteWeek: absoluteWeek,
            startsAtAbsoluteWeek: absoluteWeek,
            expiresAtAbsoluteWeek: negotiation.windowType === 'PERMANENT' ? Number.MAX_SAFE_INTEGER : absoluteWeek + negotiation.durationWeeks,
            status: 'ACTIVE',
            changeOfControl: negotiation.changeOfControl,
            cancellationPenalty: negotiation.cancellationPenalty,
        };
        const buyerState = player.world.platforms?.[buyerPlatformId];
        nextWorld = buyerState ? {
            ...player.world,
            platforms: {
                ...player.world.platforms,
                [buyerPlatformId]: {
                    ...buyerState,
                    cashReserve: Math.max(0, buyerState.cashReserve - negotiation.minimumGuarantee / 1_000_000),
                },
            },
        } : player.world;
        const sourceLicense = platform.catalogLicenses.find(item => item.id === deal.sourceLicenseId);
        if (sourceLicense) {
            const sublicenseProjection = {
                ...sourceLicense,
                id: deal.id,
                buyerPlatformId,
                licensorName: platform.identity?.name || 'Player streaming platform',
                territory: deal.territory,
                durationWeeks: deal.durationWeeks,
                exclusivity: deal.exclusivity,
                minimumGuarantee: deal.upfrontFee,
                platformRevenueShare: deal.buyerRevenueShare,
                studioRevenueShare: deal.sellerRevenueShare,
                signedAtAbsoluteWeek: deal.signedAtAbsoluteWeek,
                startsAtAbsoluteWeek: deal.startsAtAbsoluteWeek,
                expiresAtAbsoluteWeek: deal.expiresAtAbsoluteWeek,
                status: deal.status,
                origin: 'PLATFORM_TRADE' as const,
                sellerType: 'PLATFORM' as const,
                sellerPlatformId: null,
                changeOfControl: deal.changeOfControl,
                cancellationPenalty: deal.cancellationPenalty,
            };
            const canonicalRegistration = registerStreamingRightsContract(
                nextWorld.streamingRightsContracts,
                createStreamingRightsContractFromLicense({
                    license: sublicenseProjection,
                    seller: {
                        type: 'PLAYER_PLATFORM',
                        id: platform.identity?.slug || `player-platform:${player.id}`,
                        name: platform.identity?.name || 'Player streaming platform',
                        platformId: null,
                    },
                    buyer: {
                        type: 'AI_PLATFORM',
                        id: buyerPlatformId,
                        name: deal.buyerName,
                        platformId: buyerPlatformId,
                    },
                    guaranteeDisposition: 'PAID',
                    settledAtAbsoluteWeek: absoluteWeek,
                }),
            );
            nextWorld = { ...nextWorld, streamingRightsContracts: canonicalRegistration.registry };
        }
        nextPlatform = {
            ...platform,
            treasuryCash: platform.treasuryCash + negotiation.minimumGuarantee,
            rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? signedNegotiation : item),
            sublicenseDeals: [...platform.sublicenseDeals, deal],
        };
    } else {
        const licenseId = createDeterministicId('streaming_catalog_license', platform.simulationSeed, negotiation.id);
        const permanentPurchase = negotiation.windowType === 'PERMANENT';
        const startsAtAbsoluteWeek = negotiation.kind === 'RENEW' && negotiation.sourceLicenseId
            ? Math.max(absoluteWeek, platform.catalogLicenses.find(item => item.id === negotiation.sourceLicenseId)?.expiresAtAbsoluteWeek || absoluteWeek)
            : absoluteWeek;
        const currentCountryIds = platform.marketOperations
            .filter(operation => operation.scope === 'COUNTRY' && operation.status !== 'EXITED' && operation.countryId)
            .map(operation => operation.countryId!);
        const expiresAtAbsoluteWeek = permanentPurchase ? Number.MAX_SAFE_INTEGER : startsAtAbsoluteWeek + negotiation.durationWeeks;
        const availability = validateStreamingRightsAvailability({
            player,
            world: player.world,
            sourceProjectId: negotiation.sourceProjectId,
            buyerPlatformId: null,
            exclusivity: negotiation.exclusivity,
            startsAtAbsoluteWeek,
            expiresAtAbsoluteWeek,
            excludeLicenseIds: negotiation.kind === 'RENEW' && negotiation.sourceLicenseId
                ? [negotiation.sourceLicenseId]
                : [],
        });
        if (!availability.available) {
            return { player, changed: false, reason: 'INVALID_TERMS', negotiation };
        }
        const license = createStreamingLicenseContract({
            id: licenseId,
            sourceProject: {
                id: negotiation.sourceProjectId,
                title: negotiation.title,
                mediaType: negotiation.projectType,
                genre: negotiation.genre,
            },
            buyerPlatformId: null,
            platformContentPlanId: null,
            cataloguePackageId: null,
            licensorName: negotiation.sellerName,
            territory: negotiation.territory,
            countryIds: negotiation.territory === 'GLOBAL'
                ? []
                : negotiation.territory === 'DOMESTIC'
                    ? currentCountryIds.slice(0, 1)
                    : currentCountryIds,
            durationWeeks: negotiation.durationWeeks,
            exclusivity: negotiation.exclusivity,
            minimumGuarantee: negotiation.minimumGuarantee,
            platformRevenueShare: negotiation.platformRevenueShare,
            signedAtAbsoluteWeek: absoluteWeek,
            startsAtAbsoluteWeek,
            origin: negotiation.kind === 'RENEW' ? 'RENEWAL' : negotiation.sellerType === 'PLATFORM' ? 'PLATFORM_TRADE' : 'STUDIO_MARKET',
            sellerType: negotiation.sellerType,
            sellerPlatformId: negotiation.sellerType === 'PLATFORM' ? negotiation.sellerId as PlatformId : null,
            windowType: negotiation.windowType,
            permanentPurchase,
            marketingGuarantee: negotiation.marketingGuarantee,
            viewershipBonusThreshold: negotiation.viewershipBonusThreshold,
            viewershipBonusAmount: negotiation.viewershipBonusAmount,
            renewalOption: negotiation.renewalOption,
            sublicensingAllowed: negotiation.sublicensingAllowed,
            sequelRightsIncluded: negotiation.sequelRightsIncluded,
            changeOfControl: negotiation.changeOfControl,
            cancellationPenalty: negotiation.cancellationPenalty,
            renewedFromLicenseId: negotiation.kind === 'RENEW' ? negotiation.sourceLicenseId : null,
        });
        const canonicalRegistration = registerStreamingRightsContract(
            nextWorld.streamingRightsContracts,
            createStreamingRightsContractFromLicense({
                license,
                seller: {
                    type: negotiation.sellerType === 'PLATFORM' ? 'AI_PLATFORM' : 'NPC_STUDIO',
                    id: negotiation.sellerId,
                    name: negotiation.sellerName,
                    platformId: negotiation.sellerType === 'PLATFORM' ? negotiation.sellerId as PlatformId : null,
                },
                buyer: {
                    type: 'PLAYER_PLATFORM',
                    id: platform.identity?.slug || `player-platform:${player.id}`,
                    name: platform.identity?.name || 'Player streaming platform',
                    platformId: null,
                },
                guaranteeDisposition: 'PAID',
                settledAtAbsoluteWeek: absoluteWeek,
            }),
        );
        nextWorld = { ...nextWorld, streamingRightsContracts: canonicalRegistration.registry };
        nextPlatform = {
            ...platform,
            treasuryCash: platform.treasuryCash - negotiation.minimumGuarantee,
            rightsNegotiations: platform.rightsNegotiations.map(item => item.id === negotiationId ? signedNegotiation : item),
            catalogLicenses: [...platform.catalogLicenses, license],
            rightsObligations: [...platform.rightsObligations, ...createObligations(platform, negotiation, licenseId, startsAtAbsoluteWeek)],
            catalogProjectIds: Array.from(new Set([...platform.catalogProjectIds, negotiation.sourceProjectId])),
        };
    }
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${negotiation.id}:signed`),
        idempotencyKey: `${negotiation.id}:signed`,
        absoluteWeek,
        type: 'LICENSE_SIGNED',
        summary: negotiation.kind === 'SUBLICENSE_OUT'
            ? `${negotiation.title} was sublicensed to ${negotiation.buyerName}.`
            : `${negotiation.title} joined the catalog through ${negotiation.sellerType === 'PLATFORM' ? 'a platform trade' : 'a studio agreement'}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            negotiationId,
            kind: negotiation.kind,
            minimumGuarantee: negotiation.minimumGuarantee,
            territory: negotiation.territory,
        },
    };
    return {
        player: {
            ...player,
            world: nextWorld,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...nextPlatform,
                eventLedger: [...nextPlatform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        negotiation: signedNegotiation,
    };
};

export const openStreamingRightsRenewal = (
    player: Player,
    licenseId: string,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const license = platform.catalogLicenses.find(item => item.id === licenseId);
    if (!license || !license.renewalOption) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `RENEW:${license.id}:${Math.max(absoluteWeek, license.expiresAtAbsoluteWeek)}`;
    const existing = platform.rightsNegotiations.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { player, changed: false, reason: 'ALREADY_OPEN', negotiation: existing };
    const rival = chooseRival(platform.simulationSeed, idempotencyKey, absoluteWeek, license.sellerPlatformId || null);
    const negotiation: OwnedStreamingRightsNegotiation = {
        id: createDeterministicId('streaming_rights_negotiation', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        kind: 'RENEW',
        sourceProjectId: license.sourceProjectId,
        sourceLicenseId: license.id,
        title: license.titleAtSigning,
        projectType: 'MOVIE',
        genre: 'Renewal',
        sellerType: license.sellerType || 'STUDIO',
        sellerId: license.sellerPlatformId || license.licensorName,
        sellerName: license.licensorName,
        buyerPlatformId: null,
        buyerName: null,
        territory: license.territory,
        durationWeeks: license.durationWeeks,
        exclusivity: license.exclusivity,
        windowType: license.windowType || 'SECOND_WINDOW',
        minimumGuarantee: roundMoney(license.minimumGuarantee * 1.08),
        platformRevenueShare: license.platformRevenueShare,
        marketingGuarantee: license.marketingGuarantee || 0,
        viewershipBonusThreshold: license.viewershipBonusThreshold || 0,
        viewershipBonusAmount: license.viewershipBonusAmount || 0,
        renewalOption: true,
        sublicensingAllowed: Boolean(license.sublicensingAllowed),
        sequelRightsIncluded: Boolean(license.sequelRightsIncluded),
        changeOfControl: license.changeOfControl || 'NOTICE',
        cancellationPenalty: license.cancellationPenalty || roundMoney(license.minimumGuarantee * 0.2),
        rivalPlatformId: rival.id,
        rivalPlatformName: rival.name,
        rivalBidAmount: roundMoney(license.minimumGuarantee * rival.pressure),
        marketHeat: rival.pressure > 1.08 ? 'HOT' : 'ACTIVE',
        status: 'OPEN',
        round: 0,
        counterMinimumGuarantee: null,
        counterPlatformRevenueShare: null,
        createdAtAbsoluteWeek: absoluteWeek,
        updatedAtAbsoluteWeek: absoluteWeek,
        expiresAtAbsoluteWeek: absoluteWeek + 3,
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                rightsNegotiations: [...platform.rightsNegotiations, negotiation],
            }, player.id),
        },
        changed: true,
        negotiation,
    };
};

export const evaluateStreamingRightsCompliance = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
): {
    platform: OwnedStreamingPlatformState;
    complianceCost: number;
    ledgerEntries: OwnedStreamingLedgerEntry[];
} => {
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    let complianceCost = 0;
    const catalogLicenses = platform.catalogLicenses.map(license => {
        if (license.status === 'ACTIVE' && !license.permanentPurchase && absoluteWeek >= license.expiresAtAbsoluteWeek) {
            const key = `rights-expired:${license.id}`;
            if (!platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
                ledgerEntries.push({
                    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                    idempotencyKey: key,
                    absoluteWeek,
                    type: 'SYSTEM_REPAIR',
                    summary: `${license.titleAtSigning} left the catalog when its rights window expired.`,
                    source: 'WEEK_PROCESSOR',
                    metadata: { licenseId: license.id, projectId: license.sourceProjectId },
                });
            }
            return { ...license, status: 'EXPIRED' as const };
        }
        return license;
    });
    const sublicenseDeals = platform.sublicenseDeals.map(deal => (
        deal.status === 'ACTIVE' && absoluteWeek > deal.expiresAtAbsoluteWeek
            ? { ...deal, status: 'EXPIRED' as const }
            : deal
    ));
    const rightsNegotiations = platform.rightsNegotiations.map(negotiation => (
        ACTIVE_NEGOTIATION_STATUSES.has(negotiation.status) && absoluteWeek > negotiation.expiresAtAbsoluteWeek
            ? { ...negotiation, status: 'EXPIRED' as const, updatedAtAbsoluteWeek: absoluteWeek }
            : negotiation
    ));
    const rightsObligations = platform.rightsObligations.map(obligation => {
        if (obligation.status === 'SATISFIED' || obligation.status === 'BREACHED') return obligation;
        const observedAmount = obligation.type === 'MARKETING_SPEND'
            ? platform.growthActions
                .filter(action => action.projectId === obligation.sourceProjectId && action.status === 'APPLIED')
                .reduce((sum, action) => sum + action.cashCost, 0)
            : platform.weeklyHistory.reduce((sum, snapshot) => (
                sum + (snapshot.operations?.titlePerformance || [])
                    .filter(performance => performance.projectId === obligation.sourceProjectId)
                    .reduce((titleSum, performance) => titleSum + performance.viewingAccounts, 0)
            ), 0);
        if (observedAmount >= obligation.targetAmount) {
            const key = `rights-obligation-satisfied:${obligation.id}`;
            if (obligation.successPayment > 0 && !platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
                complianceCost += obligation.successPayment;
                ledgerEntries.push({
                    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                    idempotencyKey: key,
                    absoluteWeek,
                    type: 'SYSTEM_REPAIR',
                    summary: `${obligation.title} earned its contractual viewership bonus.`,
                    source: 'WEEK_PROCESSOR',
                    metadata: { obligationId: obligation.id, bonus: obligation.successPayment },
                });
            }
            return { ...obligation, observedAmount, status: 'SATISFIED' as const, resolvedAtAbsoluteWeek: absoluteWeek };
        }
        if (absoluteWeek > obligation.dueAtAbsoluteWeek) {
            const key = `rights-obligation-breach:${obligation.id}`;
            if (!platform.eventLedger.some(entry => entry.idempotencyKey === key)) {
                complianceCost += obligation.breachPenalty;
                ledgerEntries.push({
                    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
                    idempotencyKey: key,
                    absoluteWeek,
                    type: 'SYSTEM_REPAIR',
                    summary: `${obligation.title} breached its ${obligation.type === 'MARKETING_SPEND' ? 'marketing guarantee' : 'viewership obligation'}.`,
                    source: 'WEEK_PROCESSOR',
                    metadata: { obligationId: obligation.id, penalty: obligation.breachPenalty },
                });
            }
            return { ...obligation, observedAmount, status: 'BREACHED' as const, resolvedAtAbsoluteWeek: absoluteWeek };
        }
        return { ...obligation, observedAmount, status: observedAmount > 0 ? 'ON_TRACK' as const : 'PENDING' as const };
    });
    return {
        platform: { ...platform, catalogLicenses, sublicenseDeals, rightsNegotiations, rightsObligations },
        complianceCost,
        ledgerEntries,
    };
};

export const applyStreamingRightsChangeOfControl = (
    player: Player,
    licenseId: string,
    consentGranted: boolean,
): StreamingRightsActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const license = platform.catalogLicenses.find(item => item.id === licenseId);
    if (!license) return { player, changed: false, reason: 'NOT_FOUND' };
    const requiresConsent = license.changeOfControl === 'CONSENT_REQUIRED';
    if (!requiresConsent || consentGranted) return { player, changed: false, reason: 'NOT_READY' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const penalty = Math.min(platform.treasuryCash, license.cancellationPenalty || 0);
    const otherActiveRight = platform.catalogLicenses.some(item => (
        item.id !== license.id && item.sourceProjectId === license.sourceProjectId && item.status === 'ACTIVE'
    ));
    const key = `rights-change-of-control:${license.id}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'SYSTEM_REPAIR',
        summary: `${license.titleAtSigning} terminated after change-of-control consent was denied.`,
        source: 'SYSTEM',
        metadata: { licenseId, penalty },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - penalty,
                catalogLicenses: platform.catalogLicenses.map(item => item.id === licenseId ? { ...item, status: 'TERMINATED' } : item),
                catalogProjectIds: otherActiveRight
                    ? platform.catalogProjectIds
                    : platform.catalogProjectIds.filter(id => id !== license.sourceProjectId),
                eventLedger: platform.eventLedger.some(entry => entry.idempotencyKey === key)
                    ? platform.eventLedger
                    : [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};
