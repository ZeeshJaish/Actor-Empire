import type {
    PlatformId,
    Player,
    StreamingBiddingPlatformInput,
    StreamingCataloguePackage,
    StreamingOfferVersion,
    StreamingRightsRenewalPreference,
} from '../types';
import {
    acceptStreamingCataloguePackageOffer,
    normalizeStreamingCataloguePackagePolicy,
    normalizeStreamingCataloguePackageRegistry,
} from './streamingCataloguePackages';
import {
    acceptStreamingBiddingOffer,
    advanceStreamingBiddingSession,
    createStreamingCatalogueBiddingSession,
    getStreamingBiddingClosingOffers,
    upsertStreamingBiddingSession,
} from './streamingBidding';
import { STREAMING_DAY_ONE_MARKETS } from './streamingDayOneMarkets';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';
import { getStreamingRightsStudioMandate } from './streamingRightsCalendar';
import { createStreamingRightsDelegationTrace } from './streamingRightsDelegation';

const PLATFORM_TERMS: Record<PlatformId, { baseBid: number; ceiling: number; quality: number }> = {
    NETFLIX: { baseBid: 24_000_000, ceiling: 620_000_000, quality: 72 },
    APPLE_TV: { baseBid: 30_000_000, ceiling: 760_000_000, quality: 84 },
    DISNEY_PLUS: { baseBid: 22_000_000, ceiling: 680_000_000, quality: 76 },
    HULU: { baseBid: 15_000_000, ceiling: 260_000_000, quality: 62 },
    YOUTUBE: { baseBid: 8_000_000, ceiling: 130_000_000, quality: 46 },
};

export interface ProcessStreamingCataloguePackageStrategyAutomationResult {
    player: Player;
    processed: boolean;
    signedPackageIds: string[];
    skippedReasons: string[];
}

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum))
);

const buildPlatformInputs = (
    player: Player,
    cataloguePackage: StreamingCataloguePackage,
): StreamingBiddingPlatformInput[] => {
    const seller = player.businesses.find(business => business.id === cataloguePackage.seller.id);
    return (Object.keys(PLATFORM_TERMS) as PlatformId[]).flatMap(platformId => {
        const platform = player.world.platforms?.[platformId];
        if (!platform) return [];
        const terms = PLATFORM_TERMS[platformId];
        const relation = seller?.studioState?.platformRelations?.[platformId];
        const brand = resolveStreamingPlatformBrandById(platformId, platform.name);
        const aiRestrictions = platform.ai?.spendingRestrictions;
        return [{
            id: platformId,
            name: platform.name || brand.displayName,
            color: brand.primaryColor,
            cashAvailable: Math.max(0, Number(platform.cashReserve) || 0) * 1_000_000,
            baseBid: terms.baseBid,
            acquisitionCeiling: terms.ceiling,
            qualityPreference: terms.quality,
            relationshipMultiplier: clamp(1 + Number(relation?.trustModifier || 0) / 100, 0.84, 1.16),
            canStartNewBids: !aiRestrictions?.blocksNewBids,
        }];
    });
};

const offerScore = (
    offer: StreamingOfferVersion,
    preference: StreamingRightsRenewalPreference,
    player: Player,
    cataloguePackage: StreamingCataloguePackage,
): number => {
    const relation = player.businesses
        .find(business => business.id === cataloguePackage.seller.id)
        ?.studioState?.platformRelations?.[offer.platformId];
    const relationship = Number(relation?.loyaltyScore || 0) * 1_000_000
        + Number(relation?.trustModifier || 0) * 5_000_000;
    const backendUpside = Math.max(0, offer.expectedRoyaltyCost);
    if (preference === 'UPFRONT_SECURITY') return offer.minimumGuarantee;
    if (preference === 'BACKEND_UPSIDE') return backendUpside * 1.35 + offer.minimumGuarantee * 0.5;
    if (preference === 'RELATIONSHIP_FIRST') return relationship + offer.expectedTotalCost * 0.35;
    if (preference === 'RETEST_MARKET') return offer.expectedTotalCost + backendUpside * 0.2;
    return offer.minimumGuarantee + backendUpside;
};

const updateWeeklyDigest = (
    player: Player,
    absoluteWeek: number,
    signedDelta: number,
    skippedDelta: number,
): Player => {
    if (signedDelta <= 0 && skippedDelta <= 0) return player;
    const digests = [...(player.world.streamingCataloguePackageDigests || [])];
    const index = digests.findIndex(digest => digest.absoluteWeek === absoluteWeek);
    if (index < 0) return player;
    const current = digests[index];
    const signed = current.signed + signedDelta;
    const skipped = current.skipped + skippedDelta;
    digests[index] = {
        ...current,
        signed,
        skipped,
        summary: `Package Desk: ${current.proposed} portfolio proposal prepared; ${signed} signed; ${skipped} skipped.`,
    };
    return { ...player, world: { ...player.world, streamingCataloguePackageDigests: digests } };
};

/**
 * Applies only the bounded delegation chosen in Strategy mode. It deliberately
 * consumes the existing A2 bidding clock and the A5 atomic acceptance path;
 * Full and Custom control never enter this function's signing branch.
 */
export const processStreamingCataloguePackageStrategyAutomation = (
    player: Player,
    absoluteWeek: number,
): ProcessStreamingCataloguePackageStrategyAutomationResult => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const management = player.streamingRightsManagement;
    const candidateStudioId = Object.values(normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages))
        .find(cataloguePackage => cataloguePackage.lifecycle === 'READY' && cataloguePackage.createdAtAbsoluteWeek === week)?.seller.id;
    const mandate = getStreamingRightsStudioMandate(player, candidateStudioId || 'player-studio');
    const policy = normalizeStreamingCataloguePackagePolicy(management?.packagePolicy);
    if (mandate.controlMode !== 'STRATEGY' || policy.automation !== 'ROUTINE_AUTOMATIC') {
        return { player, processed: false, signedPackageIds: [], skippedReasons: [] };
    }

    const allCountryCount = STREAMING_DAY_ONE_MARKETS.length;
    const candidates = Object.values(normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages))
        .filter(cataloguePackage => (
            cataloguePackage.lifecycle === 'READY'
            && cataloguePackage.source === 'RIGHTS_DESK_PROPOSAL'
            && cataloguePackage.createdAtAbsoluteWeek === week
        ))
        .sort((left, right) => left.createdAtAbsoluteWeek - right.createdAtAbsoluteWeek || left.id.localeCompare(right.id));
    const candidate = candidates[0];
    if (!candidate) return { player, processed: false, signedPackageIds: [], skippedReasons: [] };

    const policyBlocked = candidate.manualApprovalRequired
        || candidate.protectionReasons.length > 0
        || candidate.components.length > policy.maximumAutomaticSize
        || candidate.maximumDurationWeeks > policy.maximumAutomaticDurationWeeks
        || (candidate.requestedExclusivity === 'EXCLUSIVE' && !policy.allowAutomaticExclusive)
        || (candidate.requestedCountryIds.length >= allCountryCount && !policy.allowAutomaticGlobal);
    if (policyBlocked) {
        return {
            player: updateWeeklyDigest(player, week, 0, 1),
            processed: true,
            signedPackageIds: [],
            skippedReasons: ['POLICY_PROTECTED'],
        };
    }

    let session;
    try {
        session = createStreamingCatalogueBiddingSession({
            cataloguePackage: candidate,
            platforms: buildPlatformInputs(player, candidate),
        });
    } catch {
        return {
            player: updateWeeklyDigest(player, week, 0, 1),
            processed: true,
            signedPackageIds: [],
            skippedReasons: ['NO_FINANCIALLY_CAPABLE_BIDDER'],
        };
    }
    while (session.status === 'LIVE') session = advanceStreamingBiddingSession(session, 1);
    const referenceTotal = candidate.components.reduce((sum, component) => sum + component.referenceValue, 0);
    const minimumGuarantee = referenceTotal * policy.minimumGuaranteeRatio;
    const preference = mandate.renewalPreference;
    const selected = getStreamingBiddingClosingOffers(session)
        .filter(offer => offer.minimumGuarantee >= minimumGuarantee)
        .sort((left, right) => (
            offerScore(right, preference, player, candidate) - offerScore(left, preference, player, candidate)
            || right.minimumGuarantee - left.minimumGuarantee
            || left.platformId.localeCompare(right.platformId)
        ))[0];
    if (!selected) {
        return {
            player: updateWeeklyDigest(player, week, 0, 1),
            processed: true,
            signedPackageIds: [],
            skippedReasons: ['BELOW_MINIMUM_GUARANTEE'],
        };
    }

    const acceptedSession = acceptStreamingBiddingOffer(session, selected.id);
    const livePackage: StreamingCataloguePackage = {
        ...candidate,
        lifecycle: 'LIVE',
        biddingSessionId: acceptedSession.id,
        delegatedReason: `Strategy mandate selected ${selected.platformName} under ${preference.toLowerCase().replaceAll('_', ' ')} policy.`,
        delegationTrace: createStreamingRightsDelegationTrace({
            mandate,
            rule: 'CATALOGUE_PACKAGE_WITHIN_MANDATE',
            facts: {
                packageId: candidate.id,
                selectedPlatformId: selected.platformId,
                totalGuarantee: selected.minimumGuarantee,
                titleCount: candidate.components.length,
                durationWeeks: candidate.maximumDurationWeeks,
                exclusivity: candidate.requestedExclusivity,
                countryCount: candidate.requestedCountryIds.length,
            },
            explanation: `Strategy mandate selected ${selected.platformName} under ${preference.toLowerCase().replaceAll('_', ' ')} policy.`,
        }),
    };
    const prepared: Player = {
        ...player,
        world: {
            ...player.world,
            streamingCataloguePackages: {
                ...normalizeStreamingCataloguePackageRegistry(player.world.streamingCataloguePackages),
                [candidate.id]: livePackage,
            },
            streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, acceptedSession),
        },
    };
    const signing = acceptStreamingCataloguePackageOffer(prepared, {
        packageId: candidate.id,
        session: acceptedSession,
        offerId: selected.id,
        absoluteWeek: week,
    });
    if (!signing.changed) {
        return {
            player: updateWeeklyDigest(player, week, 0, 1),
            processed: true,
            signedPackageIds: [],
            skippedReasons: [signing.reason || 'SIGNING_REJECTED'],
        };
    }
    return {
        player: updateWeeklyDigest(signing.player, week, 1, 0),
        processed: true,
        signedPackageIds: [candidate.id],
        skippedReasons: [],
    };
};
