import type {
    OwnedStreamingCostCommitment,
    OwnedStreamingRightsObligation,
    PlatformId,
    Player,
    StreamingBuyerAuctionBid,
    StreamingBuyerAuctionEvent,
    StreamingBuyerAuctionLot,
    StreamingBuyerAuctionRival,
    StreamingBuyerAuctionSession,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { getStreamingMarketCycle } from './streamingMarketSupply';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import {
    establishContentMarketCatalogue,
    getContentMarketAuctionCollections,
    getContentMarketAuctionListings,
    getContentMarketCollections,
    getContentMarketFunds,
    getContentMarketListings,
} from './streamingContentMarket';
import {
    getOwnedPlatformPackageCountryIds,
    openStreamingRightsNegotiation,
    signOwnedStreamingCataloguePackage,
    signStreamingRightsDeal,
} from './streamingRightsMarketplace';
import { registerProductionStreamingRightsContract } from './streamingRightsCore';
import { resolveStreamingOperatorBrand } from './streamingPlatformBrandRegistry';
import { normalizeStreamingPlatformEcosystem } from './streamingPlatformEcosystem';
import { resolveStreamingOfferRevision } from './streamingOfferRevisionIntelligence';
import { getStreamingUpcomingRightsAuctionLots, resolveStreamingUpcomingRightsAuctionOutcome, settleStreamingUpcomingRightsForPlayer } from './streamingUpcomingRights';

const ROOM_OPEN_SECONDS = 15;
const ROOM_HARD_CAP_SECONDS = 45;
const ROOM_EVENT_FLOOR_SECONDS = 12;
const RIVAL_COOLDOWN_SECONDS = 6;

export interface StreamingBuyerAuctionBidTerms {
    minimumGuarantee: number;
    licensorRevenueShare: number;
    marketingGuarantee: number;
    futureGreenlight: boolean;
}

export interface StreamingBuyerAuctionActionResult {
    player: Player;
    changed: boolean;
    session?: StreamingBuyerAuctionSession;
    reason?: 'NOT_FOUND' | 'NOT_LIVE' | 'INVALID_TERMS' | 'INSUFFICIENT_TREASURY' | 'RIGHTS_UNAVAILABLE';
    detail?: string;
}

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(Number(value)) ? Number(value) : minimum))
);
const money = (value: number): number => Math.max(0, Math.round(value / 100_000) * 100_000);
const technicalOfferFloor = (referenceValue: number): number => money(Math.max(100_000, referenceValue * 0.02));

const auctionEvent = (
    sessionId: string,
    type: StreamingBuyerAuctionEvent['type'],
    activeSecond: number,
    bidderId: string | null,
    bidId: string | null,
    ordinal: number,
): StreamingBuyerAuctionEvent => ({
    id: createDeterministicId('streaming_buyer_auction_event', sessionId, type, activeSecond, bidderId || 'ROOM', bidId || 'NONE', ordinal),
    type,
    activeSecond,
    bidderId,
    bidId,
});

const upsertSession = (
    player: Player,
    session: StreamingBuyerAuctionSession,
    additionalPlatformPatch: Record<string, unknown> = {},
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const sessions = [...platform.buyerAuctionSessions.filter(item => item.id !== session.id), session];
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            ...additionalPlatformPatch,
            buyerAuctionSessions: sessions,
        }, player.id),
    };
};

const activeBidFor = (session: StreamingBuyerAuctionSession, bidderId: string): StreamingBuyerAuctionBid | null => (
    [...session.bids].reverse().find(bid => bid.bidderId === bidderId && bid.status === 'ACTIVE') || null
);

export const getStreamingBuyerAuctionLeader = (session: StreamingBuyerAuctionSession): StreamingBuyerAuctionBid | null => (
    session.bids
        .filter(bid => bid.status === 'ACTIVE')
        .sort((left, right) => right.sellerValue - left.sellerValue
            || left.createdAtActiveSecond - right.createdAtActiveSecond
            || left.id.localeCompare(right.id))[0] || null
);

export const calculateStreamingBuyerAuctionSellerValue = (
    lot: StreamingBuyerAuctionLot,
    terms: StreamingBuyerAuctionBidTerms,
    relationshipMultiplier = 1,
): number => money(
    terms.minimumGuarantee * lot.sellerPriorities.cash
    + lot.referenceValue * (terms.licensorRevenueShare / 100) * 2.25 * lot.sellerPriorities.backend
    + terms.marketingGuarantee * 0.45 * lot.sellerPriorities.marketing
    + (terms.futureGreenlight ? lot.allowedTerms.futureGreenlightReserve * 0.55 * lot.sellerPriorities.futureGreenlight : 0)
    + lot.referenceValue * (clamp(relationshipMultiplier, 0.9, 1.12) - 1),
);

const sellerPriorities = (seed: string): StreamingBuyerAuctionLot['sellerPriorities'] => {
    const rng = createDeterministicRng(`${seed}:seller-priorities`);
    return {
        cash: Math.round((0.92 + rng() * 0.16) * 100) / 100,
        backend: Math.round((0.85 + rng() * 0.3) * 100) / 100,
        marketing: Math.round((0.82 + rng() * 0.34) * 100) / 100,
        futureGreenlight: Math.round((0.8 + rng() * 0.4) * 100) / 100,
    };
};

export const getStreamingBuyerAuctionLots = (player: Player): StreamingBuyerAuctionLot[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const exactPlatformMarkets = getOwnedPlatformPackageCountryIds(platform);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const titleLots = getContentMarketAuctionListings(player).map(listing => {
        const referenceValue = Math.max(1_000_000, Number(listing.rivalBidAmount || listing.terms.minimumGuarantee));
        const countryIds = listing.countryIds.length ? [...listing.countryIds].sort() : [...exactPlatformMarkets].sort();
        const excludedCountryIds = exactPlatformMarkets.filter(id => !countryIds.includes(id));
        const id = createDeterministicId('streaming_buyer_auction_lot', listing.id, getStreamingMarketCycle(absoluteWeek));
        const allowedTerms = {
            backendMinimum: 1,
            backendMaximum: 10,
            marketingMaximum: money(referenceValue * 0.18),
            futureGreenlightAllowed: listing.sellerType === 'STUDIO',
            futureGreenlightReserve: money(referenceValue * 0.25),
        };
        const priorities = sellerPriorities(id);
        const minimumGuarantee = technicalOfferFloor(referenceValue);
        const minimumBidIncrement = money(Math.max(100_000, referenceValue * 0.01));
        return {
            id,
            listingId: listing.id,
            listingSignature: listing.signature,
            listingKind: 'TITLE' as const,
            sourceProjectId: listing.title.id,
            title: listing.title.title,
            projectType: listing.title.projectType,
            genre: listing.title.genre,
            sellerId: listing.sellerId,
            sellerName: listing.sellerName,
            sourceLicenseId: listing.sourceLicenseId,
            territory: listing.terms.territory,
            countryIds,
            excludedCountryIds,
            windowType: listing.terms.windowType,
            exclusivity: listing.terms.exclusivity,
            durationWeeks: listing.terms.durationWeeks,
            startsAtAbsoluteWeek: absoluteWeek,
            referenceValue,
            minimumGuarantee,
            minimumBidIncrement,
            reserveSellerValue: money(referenceValue * 0.84),
            allowedTerms,
            sellerPriorities: priorities,
            notice: excludedCountryIds.length
                ? `${excludedCountryIds.length === 1 ? 'One market is' : `${excludedCountryIds.length} markets are`} already unavailable. This auction covers the remaining eligible markets.`
                : null,
            cataloguePackageId: null,
            catalogueComponentIds: [],
        };
    });
    const packageLots = getContentMarketAuctionCollections(player).map(collection => {
        const referenceValue = Math.max(3_000_000, collection.totalGuarantee);
        const id = createDeterministicId('streaming_buyer_auction_lot', collection.id, getStreamingMarketCycle(absoluteWeek));
        const componentIds = collection.rows.map(row => row.componentProjectId).sort();
        return {
            id,
            listingId: collection.id,
            listingSignature: collection.signature,
            listingKind: 'CATALOGUE_PACKAGE' as const,
            sourceProjectId: collection.id,
            title: collection.package.name,
            projectType: 'MOVIE' as const,
            genre: 'CATALOGUE',
            sellerId: collection.package.seller.id,
            sellerName: collection.sellerName,
            sourceLicenseId: null,
            territory: collection.rows[0]?.territory || 'MULTI_REGION' as const,
            countryIds: [...collection.package.requestedCountryIds].sort(),
            excludedCountryIds: [],
            windowType: collection.package.requestedWindowType,
            exclusivity: collection.package.requestedExclusivity,
            durationWeeks: collection.package.maximumDurationWeeks,
            startsAtAbsoluteWeek: collection.package.startsAtAbsoluteWeek,
            referenceValue,
            minimumGuarantee: technicalOfferFloor(referenceValue),
            minimumBidIncrement: money(Math.max(100_000, referenceValue * 0.01)),
            reserveSellerValue: money(referenceValue * 0.84),
            allowedTerms: {
                backendMinimum: 1,
                backendMaximum: 10,
                marketingMaximum: 0,
                futureGreenlightAllowed: false,
                futureGreenlightReserve: 0,
            },
            sellerPriorities: sellerPriorities(id),
            notice: `${componentIds.length} title contracts settle together. The winning guarantee is allocated across the complete collection.`,
            cataloguePackageId: collection.id,
            catalogueComponentIds: componentIds,
        };
    });
    return [...titleLots, ...packageLots, ...getStreamingUpcomingRightsAuctionLots(player)];
};

const buildRivals = (player: Player, lot: StreamingBuyerAuctionLot, sessionId: string): StreamingBuyerAuctionRival[] => {
    const acquired = new Set(normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).corporateDevelopment.acquiredPlatformIds);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const ecosystem = normalizeStreamingPlatformEcosystem(player.world.streamingPlatformEcosystem, absoluteWeek);
    const lotCountries = new Set(lot.countryIds);
    return Object.values(ecosystem.operators)
        .filter(operator => !acquired.has(operator.id as PlatformId)
            && (operator.lifecycle === 'ACTIVE' || operator.lifecycle === 'DISTRESSED')
            && operator.cashMillions * 1_000_000 >= lot.minimumGuarantee
            && operator.activeCountryIds.some(countryId => lotCountries.has(countryId)))
        .map(operator => {
            const rng = createDeterministicRng(`${sessionId}:${operator.id}:buyer-ceiling`);
            const overlapCount = operator.activeCountryIds.filter(countryId => lotCountries.has(countryId)).length;
            const territoryFit = overlapCount / Math.max(1, lot.countryIds.length);
            const genreFit = lot.genre === 'CATALOGUE' || operator.preferredGenres.includes(lot.genre as any) ? 1 : 0;
            const capability = (operator.cataloguePower + operator.localization + operator.technology) / 300;
            const strategicFit = clamp(
                territoryFit * 0.42 + genreFit * 0.25 + capability * 0.2 + operator.prestige / 100 * 0.08 + rng() * 0.05,
                0,
                1.1,
            );
            const cashAvailable = Math.max(0, operator.cashMillions * 1_000_000);
            const distressMultiplier = operator.lifecycle === 'DISTRESSED' ? 0.72 : 1;
            const sellerValueCeiling = money(Math.min(
                cashAvailable * clamp(0.06 + operator.risk / 100 * 0.09, 0.05, 0.18),
                lot.referenceValue * (0.35 + strategicFit * 0.85 + rng() * 0.25) * distressMultiplier,
            ));
            const brand = resolveStreamingOperatorBrand(operator.id, operator.name, operator.brand);
            return {
                bidderId: `ai-platform:${operator.id}`,
                platformId: operator.id,
                platformName: operator.name,
                color: brand.primaryColor,
                cashAvailable,
                sellerValueCeiling,
                preferredBackend: Math.round(clamp(2 + rng() * 7, lot.allowedTerms.backendMinimum, lot.allowedTerms.backendMaximum)),
                marketingLimit: money(Math.min(lot.allowedTerms.marketingMaximum, lot.referenceValue * (0.03 + rng() * 0.12))),
                nextActionSecond: 0,
                revision: 0,
                status: 'WATCHING' as const,
                currentBidId: null,
                _entryScore: strategicFit * 100 + Math.log10(Math.max(10, cashAvailable)) * 2 + rng(),
            };
        })
        .filter(rival => rival.sellerValueCeiling >= lot.minimumGuarantee)
        .sort((left, right) => right._entryScore - left._entryScore || right.sellerValueCeiling - left.sellerValueCeiling || left.platformId.localeCompare(right.platformId))
        .map(({ _entryScore: _ignored, ...rival }, index) => ({
            ...rival,
            // Every eligible operator gets an opening window before the base room can close.
            // Large fields share action seconds instead of silently losing participants.
            nextActionSecond: 3 + (index % RIVAL_COOLDOWN_SECONDS),
        }));
};

const buildRivalBid = (
    session: StreamingBuyerAuctionSession,
    rival: StreamingBuyerAuctionRival,
    targetSellerValue: number,
): StreamingBuyerAuctionBid => {
    const lot = session.lot;
    const rng = createDeterministicRng(`${session.id}:${rival.platformId}:buyer-bid:${rival.revision + 1}`);
    const licensorRevenueShare = Math.round(clamp(
        rival.preferredBackend + (rng() > 0.55 ? 1 : -1),
        lot.allowedTerms.backendMinimum,
        lot.allowedTerms.backendMaximum,
    ));
    const marketingGuarantee = money(Math.min(rival.marketingLimit, lot.allowedTerms.marketingMaximum * (0.35 + rng() * 0.55)));
    const futureGreenlight = false;
    const nonCashValue = calculateStreamingBuyerAuctionSellerValue(lot, {
        minimumGuarantee: 0,
        licensorRevenueShare,
        marketingGuarantee,
        futureGreenlight,
    });
    const minimumGuarantee = money(clamp(
        (targetSellerValue - nonCashValue) / lot.sellerPriorities.cash,
        lot.minimumGuarantee,
        Math.min(rival.cashAvailable, lot.referenceValue * 2.5),
    ));
    const terms = { minimumGuarantee, licensorRevenueShare, marketingGuarantee, futureGreenlight };
    return {
        id: createDeterministicId('streaming_buyer_auction_bid', session.id, rival.bidderId, rival.revision + 1),
        sessionId: session.id,
        bidderId: rival.bidderId,
        bidderName: rival.platformName,
        platformId: rival.platformId,
        isPlayer: false,
        revision: rival.revision + 1,
        status: 'ACTIVE',
        replacesBidId: rival.currentBidId,
        ...terms,
        guaranteedExposure: minimumGuarantee + marketingGuarantee,
        sellerValue: calculateStreamingBuyerAuctionSellerValue(lot, terms),
        createdAtActiveSecond: session.activeSecondsElapsed,
    };
};

const withLeader = (session: StreamingBuyerAuctionSession): StreamingBuyerAuctionSession => ({
    ...session,
    leaderBidId: getStreamingBuyerAuctionLeader(session)?.id || null,
});

export const openStreamingBuyerAuction = (
    player: Player,
    lotId: string,
    nowMs = Date.now(),
): StreamingBuyerAuctionActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const lot = getStreamingBuyerAuctionLots(player).find(candidate => candidate.id === lotId);
    if (!lot) return { player, changed: false, reason: 'NOT_FOUND', detail: 'This auction lot is no longer available.' };
    const existing = platform.buyerAuctionSessions.find(session => session.lot.id === lot.id);
    if (existing) return { player, changed: false, session: existing, reason: existing.status === 'LIVE' ? undefined : 'NOT_LIVE' };
    const sessionId = createDeterministicId('streaming_buyer_auction', platform.simulationSeed, lot.id);
    const rivals = buildRivals(player, lot, sessionId);
    if (rivals.length < 2) return { player, changed: false, reason: 'NOT_FOUND', detail: 'Not enough funded buyers entered this auction.' };
    let session: StreamingBuyerAuctionSession = {
        id: sessionId,
        idempotencyKey: `streaming-buyer-auction:${lot.id}`,
        lot,
        status: 'LIVE',
        openedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        roomSecondsRemaining: ROOM_OPEN_SECONDS,
        activeSecondsElapsed: 0,
        hardClosesAtSecond: ROOM_HARD_CAP_SECONDS,
        materialEventCount: 0,
        lastRealtimeAtMs: Math.max(0, Math.round(nowMs)),
        playerBidderId: platform.identity?.slug || `player-platform:${player.id}`,
        playerBidId: null,
        rivals,
        bids: [],
        events: [auctionEvent(sessionId, 'OPENED', 0, null, null, 0)],
        leaderBidId: null,
        winnerBidId: null,
        closedAtActiveSecond: null,
        settledAtAbsoluteWeek: null,
        resultReason: null,
        outcomeMessageId: null,
    };
    const openingRival = rivals[rivals.length - 1];
    const openingRng = createDeterministicRng(`${session.id}:${openingRival.platformId}:opening-posture`);
    const openingBid = buildRivalBid(session, openingRival, Math.min(
        openingRival.sellerValueCeiling,
        lot.reserveSellerValue * (0.28 + openingRng() * 0.38),
    ));
    session = withLeader({
        ...session,
        bids: [openingBid],
        events: [...session.events, auctionEvent(session.id, 'RIVAL_BID', 0, openingRival.bidderId, openingBid.id, 1)],
        rivals: rivals.map(rival => rival.bidderId === openingRival.bidderId
            ? { ...rival, status: 'ACTIVE', revision: 1, currentBidId: openingBid.id, nextActionSecond: RIVAL_COOLDOWN_SECONDS }
            : rival),
    });
    return { player: upsertSession(player, session), changed: true, session };
};

const extendRoom = (session: StreamingBuyerAuctionSession): Pick<StreamingBuyerAuctionSession, 'roomSecondsRemaining' | 'materialEventCount'> => {
    const extension = session.materialEventCount < 3 ? 3 : session.materialEventCount < 6 ? 2 : 1;
    const hardRemaining = Math.max(0, session.hardClosesAtSecond - session.activeSecondsElapsed);
    return {
        roomSecondsRemaining: Math.min(hardRemaining, Math.max(ROOM_EVENT_FLOOR_SECONDS, session.roomSecondsRemaining + extension)),
        materialEventCount: session.materialEventCount + 1,
    };
};

const auctionCommitment = (
    platform: ReturnType<typeof normalizeOwnedStreamingPlatformState>,
    session: StreamingBuyerAuctionSession,
    amount: number,
): OwnedStreamingCostCommitment => {
    const existing = platform.costCommitments.find(item => item.sourceReferenceId === session.id);
    return {
        id: existing?.id || createDeterministicId('streaming_cost_commitment', session.id),
        idempotencyKey: existing?.idempotencyKey || `buyer-auction:${session.id}`,
        category: 'CONTENT',
        label: `${session.lot.title} live auction bid`,
        status: 'COMMITTED',
        plannedAmount: amount,
        committedAmount: amount,
        paidAmount: 0,
        weeklyAmount: 0,
        createdAtAbsoluteWeek: existing?.createdAtAbsoluteWeek ?? session.openedAtAbsoluteWeek,
        committedAtAbsoluteWeek: session.openedAtAbsoluteWeek,
        paidAtAbsoluteWeek: null,
        sourceReferenceId: session.id,
    };
};

const replaceAuctionCommitment = (
    platform: ReturnType<typeof normalizeOwnedStreamingPlatformState>,
    session: StreamingBuyerAuctionSession,
    amount: number,
): OwnedStreamingCostCommitment[] => {
    const next = auctionCommitment(platform, session, amount);
    return [...platform.costCommitments.filter(item => item.sourceReferenceId !== session.id), next];
};

export const placeStreamingBuyerAuctionBid = (
    player: Player,
    sessionId: string,
    rawTerms: StreamingBuyerAuctionBidTerms,
    nowMs = Date.now(),
): StreamingBuyerAuctionActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const session = platform.buyerAuctionSessions.find(item => item.id === sessionId);
    if (!session) return { player, changed: false, reason: 'NOT_FOUND' };
    if (session.status !== 'LIVE') return { player, changed: false, session, reason: 'NOT_LIVE' };
    const terms = {
        minimumGuarantee: money(rawTerms.minimumGuarantee),
        licensorRevenueShare: Math.round(Number(rawTerms.licensorRevenueShare)),
        marketingGuarantee: money(rawTerms.marketingGuarantee),
        futureGreenlight: Boolean(rawTerms.futureGreenlight),
    };
    const allowed = session.lot.allowedTerms;
    if (
        terms.minimumGuarantee < session.lot.minimumGuarantee
        || terms.minimumGuarantee > session.lot.referenceValue * 2.5
        || terms.licensorRevenueShare < allowed.backendMinimum
        || terms.licensorRevenueShare > allowed.backendMaximum
        || terms.marketingGuarantee < 0
        || terms.marketingGuarantee > allowed.marketingMaximum
        || terms.futureGreenlight && !allowed.futureGreenlightAllowed
    ) return { player, changed: false, session, reason: 'INVALID_TERMS', detail: 'One or more terms fall outside the seller’s auction rules.' };
    const guaranteedExposure = terms.minimumGuarantee + terms.marketingGuarantee
        + (terms.futureGreenlight ? allowed.futureGreenlightReserve : 0);
    const existingCommitment = platform.costCommitments.find(item => item.sourceReferenceId === session.id && item.status === 'COMMITTED');
    const spendableIncludingThisRoom = getContentMarketFunds(player) + (existingCommitment?.committedAmount || 0);
    if (guaranteedExposure > spendableIncludingThisRoom) {
        return { player, changed: false, session, reason: 'INSUFFICIENT_TREASURY', detail: 'Available funds cannot support this complete offer.' };
    }
    const sellerValue = calculateStreamingBuyerAuctionSellerValue(session.lot, terms, 1);
    const previous = activeBidFor(session, session.playerBidderId);
    const revision = (previous?.revision || 0) + 1;
    const bid: StreamingBuyerAuctionBid = {
        id: createDeterministicId('streaming_buyer_auction_bid', session.id, session.playerBidderId, revision),
        sessionId: session.id,
        bidderId: session.playerBidderId,
        bidderName: platform.identity?.name || 'Your platform',
        platformId: null,
        isPlayer: true,
        revision,
        status: 'ACTIVE',
        replacesBidId: previous?.id || null,
        ...terms,
        guaranteedExposure,
        sellerValue,
        createdAtActiveSecond: session.activeSecondsElapsed,
    };
    const extended = extendRoom(session);
    const nextSession = withLeader({
        ...session,
        ...extended,
        lastRealtimeAtMs: Math.max(session.lastRealtimeAtMs, Math.round(nowMs)),
        playerBidId: bid.id,
        bids: [...session.bids.map(item => item.bidderId === session.playerBidderId && item.status === 'ACTIVE'
            ? { ...item, status: 'OUTBID' as const }
            : item), bid],
        events: [...session.events, auctionEvent(session.id, previous ? 'BID_REVISED' : 'BID_PLACED', session.activeSecondsElapsed, session.playerBidderId, bid.id, session.events.length)],
    });
    const costCommitments = replaceAuctionCommitment(platform, nextSession, guaranteedExposure);
    return {
        player: upsertSession(player, nextSession, { costCommitments }),
        changed: true,
        session: nextSession,
    };
};

const placeRivalBid = (
    session: StreamingBuyerAuctionSession,
    rival: StreamingBuyerAuctionRival,
): StreamingBuyerAuctionSession => {
    const rivalCurrent = activeBidFor(session, rival.bidderId);
    if (rival.revision >= 3) {
        return {
            ...session,
            rivals: session.rivals.map(item => item.bidderId === rival.bidderId
                ? { ...item, status: rivalCurrent ? 'FINAL' as const : 'WITHDRAWN' as const }
                : item),
            events: rivalCurrent
                ? session.events
                : [...session.events, auctionEvent(session.id, 'RIVAL_WITHDREW', session.activeSecondsElapsed, rival.bidderId, rival.currentBidId, session.events.length)],
        };
    }
    const rng = createDeterministicRng(`${session.id}:${rival.platformId}:buyer-action:${rival.revision + 1}`);
    const activeCompetitors = session.bids.filter(bid => bid.status === 'ACTIVE' && bid.bidderId !== rival.bidderId);
    const marketLeaderValue = activeCompetitors.reduce(
        (highest, bid) => Math.max(highest, bid.sellerValue),
        session.lot.minimumGuarantee,
    );
    const marketPressure = clamp(marketLeaderValue / Math.max(1, rival.sellerValueCeiling), 0, 1.5);
    const withdraw = !rivalCurrent && marketPressure > 1.12 && rng() < 0.6;
    if (withdraw) return {
        ...session,
        rivals: session.rivals.map(item => item.bidderId === rival.bidderId ? { ...item, status: 'WITHDRAWN' as const } : item),
        events: [...session.events, auctionEvent(session.id, 'RIVAL_WITHDREW', session.activeSecondsElapsed, rival.bidderId, rival.currentBidId, session.events.length)],
    };
    const target = rivalCurrent
        ? resolveStreamingOfferRevision({
            currentValue: rivalCurrent.sellerValue,
            currentAmount: rivalCurrent.sellerValue,
            competitorValue: marketLeaderValue,
            capacityCeiling: rival.sellerValueCeiling,
            minimumAmount: session.lot.minimumGuarantee,
            randomFactor: rng(),
        }).targetAmount
        : rival.sellerValueCeiling > marketLeaderValue && rng() > 0.28
            ? Math.min(rival.sellerValueCeiling, marketLeaderValue + session.lot.minimumBidIncrement * (0.5 + rng() * 1.5))
            : Math.min(rival.sellerValueCeiling, session.lot.reserveSellerValue * (0.3 + rng() * 0.5));
    const bid = buildRivalBid(session, rival, target);
    const extended = extendRoom(session);
    return withLeader({
        ...session,
        ...extended,
        bids: [...session.bids.map(item => item.bidderId === rival.bidderId && item.status === 'ACTIVE'
            ? { ...item, status: 'OUTBID' as const }
            : item), bid],
        events: [...session.events, auctionEvent(session.id, 'RIVAL_BID', session.activeSecondsElapsed, rival.bidderId, bid.id, session.events.length)],
        rivals: session.rivals.map(item => item.bidderId === rival.bidderId
            ? { ...item, status: 'ACTIVE' as const, revision: bid.revision, currentBidId: bid.id, nextActionSecond: session.activeSecondsElapsed + RIVAL_COOLDOWN_SECONDS }
            : item),
    });
};

const terminalCommitments = (
    player: Player,
    session: StreamingBuyerAuctionSession,
    status: 'PAID' | 'CANCELLED',
    paidAmount = 0,
): OwnedStreamingCostCommitment[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return platform.costCommitments.map(item => item.sourceReferenceId === session.id ? {
        ...item,
        status,
        committedAmount: 0,
        paidAmount: status === 'PAID' ? paidAmount : 0,
        paidAtAbsoluteWeek: status === 'PAID' ? getAbsoluteWeek(player.age, player.currentWeek) : null,
    } : item);
};

const outcomeMessage = (session: StreamingBuyerAuctionSession, absoluteWeek: number): Player['inbox'][number] => ({
    id: session.outcomeMessageId || createDeterministicId('streaming_buyer_auction_message', session.id),
    type: 'RIGHTS_NEGOTIATION',
    sender: session.lot.sellerName,
    subject: session.status === 'WON' ? `You won ${session.lot.title}`
        : session.status === 'NO_SALE' ? `${session.lot.title} closed without a sale`
            : session.status === 'INVALIDATED' ? `${session.lot.title} rights changed`
                : `You were outbid for ${session.lot.title}`,
    text: session.resultReason || 'The live rights auction has closed.',
    weekSent: (absoluteWeek % 52) + 1,
    isRead: false,
    data: { streamingBuyerAuctionId: session.id },
} as Player['inbox'][number]);

const finishPlayerWin = (
    player: Player,
    session: StreamingBuyerAuctionSession,
    winner: StreamingBuyerAuctionBid,
): StreamingBuyerAuctionActionResult => {
    const releasedCommitments = terminalCommitments(player, session, 'CANCELLED');
    let staged = upsertSession(player, session, { costCommitments: releasedCommitments });
    if (session.lot.listingKind === 'CATALOGUE_PACKAGE') {
        const collection = getContentMarketCollections(staged, session.lot.listingId).find(item => item.id === session.lot.listingId);
        if (!collection || collection.signature !== session.lot.listingSignature) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: 'The collection changed before settlement. Your commitment was released.' };
            return { player: upsertSession(staged, invalid), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        const signedPackage = signOwnedStreamingCataloguePackage(staged, collection.id, {
            totalGuarantee: winner.minimumGuarantee,
            licensorRevenueShare: winner.licensorRevenueShare,
            skipEnergyCost: true,
        });
        if (!signedPackage.changed) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: signedPackage.detail || 'The winning collection could not settle. Your commitment was released.' };
            return { player: upsertSession(player, invalid, { costCommitments: releasedCommitments }), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
        const won: StreamingBuyerAuctionSession = {
            ...session,
            status: 'WON',
            winnerBidId: winner.id,
            settledAtAbsoluteWeek: absoluteWeek,
            resultReason: `${winner.bidderName} won ${session.lot.title} with ${winner.minimumGuarantee.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} allocated across every title.`,
            outcomeMessageId: createDeterministicId('streaming_buyer_auction_message', session.id),
            bids: session.bids.map(bid => ({ ...bid, status: bid.id === winner.id ? 'WON' as const : 'LOST' as const })),
            events: [...session.events, auctionEvent(session.id, 'SETTLED', session.activeSecondsElapsed, winner.bidderId, winner.id, session.events.length)],
        };
        let result = establishContentMarketCatalogue(signedPackage.player);
        const resultPlatform = normalizeOwnedStreamingPlatformState(result.ownedStreamingPlatform, result.id);
        result = {
            ...result,
            inbox: result.inbox.some(message => message.data?.streamingBuyerAuctionId === session.id)
                ? result.inbox : [outcomeMessage(won, absoluteWeek), ...result.inbox],
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...resultPlatform,
                costCommitments: terminalCommitments(result, session, 'PAID', winner.minimumGuarantee),
                buyerAuctionSessions: [...resultPlatform.buyerAuctionSessions.filter(item => item.id !== won.id), won],
            }, result.id),
        };
        return { player: result, changed: true, session: won };
    }
    let signedPlayer: Player;
    if (session.lot.upcomingRightsSaleId) {
        const settled = settleStreamingUpcomingRightsForPlayer(staged, session.lot.upcomingRightsSaleId, session.id, {
            minimumGuarantee: winner.minimumGuarantee,
            licensorRevenueShare: winner.licensorRevenueShare,
            marketingGuarantee: winner.marketingGuarantee,
        });
        if (!settled.changed) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: settled.detail || 'The future-rights contract could not settle. Your commitment was released.' };
            return { player: upsertSession(player, invalid, { costCommitments: releasedCommitments }), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        signedPlayer = settled.player;
    } else {
        const listing = getContentMarketListings(staged).find(item => item.id === session.lot.listingId);
        if (!listing || listing.signature !== session.lot.listingSignature) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: 'The rights changed before settlement. Your commitment was released.' };
            return { player: upsertSession(staged, invalid), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        const opened = openStreamingRightsNegotiation(staged, session.lot.listingId, {
            ...listing.terms,
            countryIds: session.lot.countryIds,
            minimumGuarantee: winner.minimumGuarantee,
            platformRevenueShare: 100 - winner.licensorRevenueShare,
            marketingGuarantee: winner.marketingGuarantee,
        });
        if (!opened.changed || !opened.negotiation) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: opened.detail || 'The rights became unavailable before settlement.' };
            return { player: upsertSession(staged, invalid), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        staged = {
            ...opened.player,
            ownedStreamingPlatform: {
                ...opened.player.ownedStreamingPlatform,
                rightsNegotiations: opened.player.ownedStreamingPlatform.rightsNegotiations.map(item => item.id === opened.negotiation!.id
                    ? { ...item, status: 'READY_TO_SIGN' as const }
                    : item),
            },
        };
        const signed = signStreamingRightsDeal(staged, opened.negotiation.id);
        if (!signed.changed) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: signed.detail || 'The winning contract could not settle. Your commitment was released.' };
            return { player: upsertSession(player, invalid, { costCommitments: releasedCommitments }), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        signedPlayer = signed.player;
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const won: StreamingBuyerAuctionSession = {
        ...session,
        status: 'WON',
        winnerBidId: winner.id,
        settledAtAbsoluteWeek: absoluteWeek,
        resultReason: `${winner.bidderName} won with ${winner.minimumGuarantee.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} upfront and ${winner.licensorRevenueShare}% backend.`,
        outcomeMessageId: createDeterministicId('streaming_buyer_auction_message', session.id),
        bids: session.bids.map(bid => ({ ...bid, status: bid.id === winner.id ? 'WON' as const : 'LOST' as const })),
        events: [...session.events, auctionEvent(session.id, 'SETTLED', session.activeSecondsElapsed, winner.bidderId, winner.id, session.events.length)],
    };
    let result = establishContentMarketCatalogue(signedPlayer);
    const resultPlatform = normalizeOwnedStreamingPlatformState(result.ownedStreamingPlatform, result.id);
    const license = [...resultPlatform.catalogLicenses].reverse().find(item => item.sourceProjectId === session.lot.sourceProjectId);
    const futureObligation: OwnedStreamingRightsObligation | null = winner.futureGreenlight && license ? {
        id: createDeterministicId('streaming_rights_obligation', license.id, 'future-greenlight'),
        licenseId: license.id,
        sourceProjectId: session.lot.sourceProjectId,
        title: session.lot.title,
        type: 'FUTURE_GREENLIGHT',
        targetAmount: 1,
        observedAmount: 0,
        dueAtAbsoluteWeek: absoluteWeek + 26,
        status: 'PENDING',
        breachPenalty: session.lot.allowedTerms.futureGreenlightReserve,
        successPayment: 0,
        resolvedAtAbsoluteWeek: null,
        counterpartyId: session.lot.sellerId,
        createdAtAbsoluteWeek: absoluteWeek,
    } : null;
    const paidCommitments = terminalCommitments(result, session, 'PAID', winner.minimumGuarantee);
    const inbox = result.inbox.some(message => message.data?.streamingBuyerAuctionId === session.id)
        ? result.inbox
        : [outcomeMessage(won, absoluteWeek), ...result.inbox];
    result = {
        ...result,
        inbox,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...resultPlatform,
            costCommitments: paidCommitments,
            buyerAuctionSessions: [...resultPlatform.buyerAuctionSessions.filter(item => item.id !== won.id), won],
            rightsObligations: futureObligation && !resultPlatform.rightsObligations.some(item => item.id === futureObligation.id)
                ? [...resultPlatform.rightsObligations, futureObligation]
                : resultPlatform.rightsObligations,
        }, result.id),
    };
    return { player: result, changed: true, session: won };
};

const chargeAiAuctionWinner = (player: Player, winner: StreamingBuyerAuctionBid): Player => {
    if (!winner.platformId) return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const ecosystem = normalizeStreamingPlatformEcosystem(player.world.streamingPlatformEcosystem, absoluteWeek);
    const operator = ecosystem.operators[winner.platformId];
    const legacyPlatform = player.world.platforms?.[winner.platformId as PlatformId];
    const chargeMillions = winner.guaranteedExposure / 1_000_000;
    return {
        ...player,
        world: {
            ...player.world,
            platforms: legacyPlatform ? {
                ...player.world.platforms,
                [winner.platformId]: {
                    ...legacyPlatform,
                    cashReserve: Math.max(0, legacyPlatform.cashReserve - chargeMillions),
                },
            } : player.world.platforms,
            streamingPlatformEcosystem: operator ? {
                ...ecosystem,
                operators: {
                    ...ecosystem.operators,
                    [winner.platformId]: {
                        ...operator,
                        cashMillions: Math.max(0, operator.cashMillions - chargeMillions),
                    },
                },
            } : ecosystem,
        },
    };
};

const finishAiWin = (
    player: Player,
    session: StreamingBuyerAuctionSession,
    winner: StreamingBuyerAuctionBid,
): StreamingBuyerAuctionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (session.lot.listingKind === 'CATALOGUE_PACKAGE' && winner.platformId) {
        const collection = getContentMarketCollections(player).find(item => item.id === session.lot.listingId);
        if (!collection || collection.signature !== session.lot.listingSignature) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: 'The collection changed before settlement. Your commitment was released.' };
            return { player: upsertSession(player, invalid, { costCommitments: terminalCommitments(player, session, 'CANCELLED') }), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        const originalTotal = Math.max(1, collection.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0));
        let allocated = 0;
        let registeredPlayer = player;
        let registeredCount = 0;
        collection.rows.forEach((row, index) => {
            const guarantee = index === collection.rows.length - 1
                ? Math.max(0, winner.minimumGuarantee - allocated)
                : Math.floor((winner.minimumGuarantee * row.minimumGuarantee / originalTotal) / 100_000) * 100_000;
            allocated += guarantee;
            const component = collection.package.components.find(item => item.sourceProjectId === row.componentProjectId);
            if (!component) return;
            const result = registerProductionStreamingRightsContract(registeredPlayer, {
                sourceProjectId: component.sourceProjectId,
                title: component.title,
                projectType: component.projectType,
                genre: component.genre,
                sellerStudioId: session.lot.sellerId,
                sellerStudioName: session.lot.sellerName,
                sellerPartyType: 'NPC_STUDIO',
                buyerPlatformId: winner.platformId!,
                buyerPlatformName: winner.bidderName,
                cataloguePackageId: collection.id,
                minimumGuarantee: guarantee,
                platformRevenueShare: 100 - winner.licensorRevenueShare,
                territory: row.territory,
                countryIds: row.countryIds,
                exclusivity: row.exclusivity,
                signedAtAbsoluteWeek: absoluteWeek,
                startsAtAbsoluteWeek: collection.package.startsAtAbsoluteWeek,
                durationWeeks: row.durationWeeks,
                windowType: row.windowType,
            });
            if (result.changed && result.contract) {
                registeredPlayer = result.player;
                registeredCount += 1;
            }
        });
        if (registeredCount !== collection.rows.length) {
            const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: 'The package rights changed before settlement. Your commitment was released.' };
            return { player: upsertSession(player, invalid, { costCommitments: terminalCommitments(player, session, 'CANCELLED') }), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
        }
        const wonByRival: StreamingBuyerAuctionSession = {
            ...session, status: 'LOST', winnerBidId: winner.id, settledAtAbsoluteWeek: absoluteWeek,
            resultReason: `${winner.bidderName} won the complete ${collection.rows.length}-title collection. Your auction commitment was released.`,
            outcomeMessageId: createDeterministicId('streaming_buyer_auction_message', session.id),
            bids: session.bids.map(bid => ({ ...bid, status: bid.id === winner.id ? 'WON' as const : 'LOST' as const })),
            events: [...session.events, auctionEvent(session.id, 'SETTLED', session.activeSecondsElapsed, winner.bidderId, winner.id, session.events.length)],
        };
        const chargedPlayer = chargeAiAuctionWinner(registeredPlayer, winner);
        const result = {
            ...chargedPlayer,
            inbox: chargedPlayer.inbox.some(message => message.data?.streamingBuyerAuctionId === session.id)
                ? chargedPlayer.inbox : [outcomeMessage(wonByRival, absoluteWeek), ...chargedPlayer.inbox],
        };
        return { player: upsertSession(result, wonByRival, { costCommitments: terminalCommitments(result, session, 'CANCELLED') }), changed: true, session: wonByRival };
    }
    const registered = winner.platformId ? registerProductionStreamingRightsContract(player, {
        sourceProjectId: session.lot.sourceProjectId,
        title: session.lot.title,
        projectType: session.lot.projectType,
        genre: session.lot.genre,
        sellerStudioId: session.lot.sellerId,
        sellerStudioName: session.lot.sellerName,
        sellerPartyType: 'NPC_STUDIO',
        buyerPlatformId: winner.platformId,
        buyerPlatformName: winner.bidderName,
        minimumGuarantee: winner.minimumGuarantee,
        platformRevenueShare: 100 - winner.licensorRevenueShare,
        marketingGuarantee: winner.marketingGuarantee,
        territory: session.lot.territory,
        countryIds: session.lot.countryIds,
        exclusivity: session.lot.exclusivity,
        signedAtAbsoluteWeek: absoluteWeek,
        startsAtAbsoluteWeek: session.lot.startsAtAbsoluteWeek,
        durationWeeks: session.lot.durationWeeks,
        windowType: session.lot.windowType,
    }) : { player, contract: null, changed: false };
    if (!registered.contract || !winner.platformId) {
        const invalid = { ...session, status: 'INVALIDATED' as const, resultReason: 'The rights changed before settlement. Your commitment was released.' };
        return { player: upsertSession(player, invalid, { costCommitments: terminalCommitments(player, session, 'CANCELLED') }), changed: true, session: invalid, reason: 'RIGHTS_UNAVAILABLE' };
    }
    const wonByRival: StreamingBuyerAuctionSession = {
        ...session,
        status: 'LOST',
        winnerBidId: winner.id,
        settledAtAbsoluteWeek: absoluteWeek,
        resultReason: `${winner.bidderName} won the complete contract. Your auction commitment was released.`,
        outcomeMessageId: createDeterministicId('streaming_buyer_auction_message', session.id),
        bids: session.bids.map(bid => ({ ...bid, status: bid.id === winner.id ? 'WON' as const : 'LOST' as const })),
        events: [...session.events, auctionEvent(session.id, 'SETTLED', session.activeSecondsElapsed, winner.bidderId, winner.id, session.events.length)],
    };
    const chargedPlayer = chargeAiAuctionWinner(registered.player, winner);
    let result: Player = {
        ...chargedPlayer,
        inbox: chargedPlayer.inbox.some(message => message.data?.streamingBuyerAuctionId === session.id)
            ? chargedPlayer.inbox
            : [outcomeMessage(wonByRival, absoluteWeek), ...chargedPlayer.inbox],
    };
    if (session.lot.upcomingRightsSaleId) result = resolveStreamingUpcomingRightsAuctionOutcome(
        result,
        session.lot.upcomingRightsSaleId,
        {
            status: 'LOST',
            auctionSessionId: session.id,
            winnerName: winner.bidderName,
            winningContractId: registered.contract.id,
        },
    );
    result = upsertSession(result, wonByRival, { costCommitments: terminalCommitments(result, session, 'CANCELLED') });
    return { player: result, changed: true, session: wonByRival };
};

const closeStreamingBuyerAuction = (
    player: Player,
    source: StreamingBuyerAuctionSession,
): StreamingBuyerAuctionActionResult => {
    if (source.status !== 'LIVE') return { player, changed: false, session: source, reason: 'NOT_LIVE' };
    const leader = getStreamingBuyerAuctionLeader(source);
    const closed: StreamingBuyerAuctionSession = {
        ...source,
        roomSecondsRemaining: 0,
        closedAtActiveSecond: source.activeSecondsElapsed,
        events: [...source.events, auctionEvent(source.id, 'CLOSED', source.activeSecondsElapsed, leader?.bidderId || null, leader?.id || null, source.events.length)],
    };
    if (!leader || leader.sellerValue < source.lot.reserveSellerValue) {
        const noSale: StreamingBuyerAuctionSession = {
            ...closed,
            status: 'NO_SALE',
            winnerBidId: null,
            settledAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
            resultReason: 'The strongest contract did not meet the seller’s reserve. No rights or money moved.',
            outcomeMessageId: createDeterministicId('streaming_buyer_auction_message', source.id),
            bids: closed.bids.map(bid => ({ ...bid, status: 'LOST' as const })),
        };
        let result = upsertSession(player, noSale, { costCommitments: terminalCommitments(player, source, 'CANCELLED') });
        if (source.lot.upcomingRightsSaleId) result = resolveStreamingUpcomingRightsAuctionOutcome(
            result,
            source.lot.upcomingRightsSaleId,
            { status: 'CLOSED', auctionSessionId: source.id },
        );
        return { player: { ...result, inbox: result.inbox.some(message => message.data?.streamingBuyerAuctionId === source.id)
            ? result.inbox : [outcomeMessage(noSale, getAbsoluteWeek(player.age, player.currentWeek)), ...result.inbox] }, changed: true, session: noSale };
    }
    return leader.isPlayer ? finishPlayerWin(player, closed, leader) : finishAiWin(player, closed, leader);
};

export const advanceStreamingBuyerAuction = (
    player: Player,
    sessionId: string,
    seconds = 1,
    nowMs = Date.now(),
): StreamingBuyerAuctionActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    let session = platform.buyerAuctionSessions.find(item => item.id === sessionId);
    if (!session) return { player, changed: false, reason: 'NOT_FOUND' };
    if (session.status !== 'LIVE') return { player, changed: false, session, reason: 'NOT_LIVE' };
    const count = Math.round(clamp(seconds, 0, ROOM_HARD_CAP_SECONDS));
    for (let index = 0; index < count && session.status === 'LIVE'; index += 1) {
        session = {
            ...session,
            activeSecondsElapsed: session.activeSecondsElapsed + 1,
            roomSecondsRemaining: Math.max(0, session.roomSecondsRemaining - 1),
            lastRealtimeAtMs: Math.max(session.lastRealtimeAtMs, Math.round(nowMs)),
        };
        const due = session.rivals.filter(rival => (
            rival.status !== 'FINAL' && rival.status !== 'WITHDRAWN' && rival.nextActionSecond <= session!.activeSecondsElapsed
        ));
        for (const rival of due) {
            const current = session.rivals.find(item => item.bidderId === rival.bidderId);
            if (current && session.activeSecondsElapsed < session.hardClosesAtSecond) session = placeRivalBid(session, current);
        }
        if (session.roomSecondsRemaining <= 0 || session.activeSecondsElapsed >= session.hardClosesAtSecond) {
            return closeStreamingBuyerAuction(upsertSession(player, session), session);
        }
    }
    return { player: upsertSession(player, session), changed: count > 0, session };
};

export const reconcileStreamingBuyerAuction = (
    player: Player,
    sessionId: string,
    nowMs = Date.now(),
): StreamingBuyerAuctionActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const session = platform.buyerAuctionSessions.find(item => item.id === sessionId);
    if (!session) return { player, changed: false, reason: 'NOT_FOUND' };
    if (session.status !== 'LIVE') return { player, changed: false, session, reason: 'NOT_LIVE' };
    const elapsed = Math.round(clamp(Math.floor((nowMs - session.lastRealtimeAtMs) / 1_000), 0, ROOM_HARD_CAP_SECONDS));
    return elapsed > 0 ? advanceStreamingBuyerAuction(player, sessionId, elapsed, nowMs) : { player, changed: false, session };
};

export const withdrawStreamingBuyerAuctionBid = (
    player: Player,
    sessionId: string,
): StreamingBuyerAuctionActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const session = platform.buyerAuctionSessions.find(item => item.id === sessionId);
    if (!session) return { player, changed: false, reason: 'NOT_FOUND' };
    if (session.status !== 'LIVE' || !session.playerBidId) return { player, changed: false, session, reason: 'NOT_LIVE' };
    const next = withLeader({
        ...session,
        playerBidId: null,
        bids: session.bids.map(bid => bid.id === session.playerBidId ? { ...bid, status: 'WITHDRAWN' as const } : bid),
        events: [...session.events, auctionEvent(session.id, 'RIVAL_WITHDREW', session.activeSecondsElapsed, session.playerBidderId, session.playerBidId, session.events.length)],
    });
    const costCommitments = terminalCommitments(player, session, 'CANCELLED');
    return { player: upsertSession(player, next, { costCommitments }), changed: true, session: next };
};

/** Closes abandoned live rooms during normal game-week progression. */
export const processStreamingBuyerAuctionsWeek = (player: Player): Player => {
    let result = player;
    const sessions = normalizeOwnedStreamingPlatformState(result.ownedStreamingPlatform, result.id).buyerAuctionSessions
        .filter(session => session.status === 'LIVE');
    sessions.forEach(session => {
        result = advanceStreamingBuyerAuction(result, session.id, ROOM_HARD_CAP_SECONDS, session.lastRealtimeAtMs + ROOM_HARD_CAP_SECONDS * 1_000).player;
    });
    return result;
};
