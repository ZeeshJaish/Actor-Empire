/**
 * #316: what the Rights room shows and does. A studio's rights in the order a producer thinks of them: what needs me now, what is out there
 * earning, and what is sitting on my shelf that I could sell. Reads the office, the calendar and the contracts; adds no rule of its own.
 */
import type {
    PlatformId,
    Player,
    StreamingBiddingPlatformInput,
    StreamingBiddingSession,
    StreamingCataloguePackage,
    StreamingLicenseExclusivity,
    StreamingOfferVersion,
    StreamingRightsContract,
    StreamingRightsStudioMandate,
} from '../types';
import { gameWeekLabel } from './gameWeek';
import { getAbsoluteWeek } from './legacyLogic';
import {
    acceptStreamingBiddingOffer,
    createStreamingCatalogueBiddingSession,
    leaveStreamingBiddingSession,
    upsertStreamingBiddingSession,
} from './streamingBidding';
import {
    acceptStreamingCataloguePackageOffer,
    calculateStreamingCatalogueReferenceValue,
    createStreamingCataloguePackage,
    getStreamingCataloguePackageDesk,
    getStreamingRightsDealFactor,
} from './streamingCataloguePackages';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';
import { buildStreamingBiddingRightsLot } from './streamingRightsCompatibility';
import { getStreamingRightsCalendar, normalizeStreamingRightsCalendarState, type StreamingRightsCalendarItem } from './streamingRightsCalendar';
import { isStreamingLicenseActiveAt, normalizeStreamingRightsContractRegistry } from './streamingRightsCore';
import { getStreamingCommercialRelationships, getStreamingRightsOffice, type StreamingRightsOfficeItem } from './streamingRightsOffice';
import { normalizeStreamingRoyaltySettlementRegistry } from './streamingContractSettlement';
import { getStreamingRightsTransferChain } from './streamingRightsTransactions';
import { ratingFromQuality } from './titleRating';
import { getStreamingTitlePlacement } from './streamingTitlePlacement';

export interface RightsRoomTitle {
    projectId: string;
    title: string;
    genre: string;
    quality: number;
    rating: number;
    releasedAtAbsoluteWeek: number | null;
    buyerName: string | null;
    buyerColor: string;
    /** null: for good, or the player's own service */
    weeksLeft: number | null;
    /** how much of the deal has gone, 0 to 1 */
    used: number;
    onYourService: boolean;
}

export interface RightsRoomView {
    mandate: StreamingRightsStudioMandate;
    yearIncome: number;
    /** what the team did last, in words */
    note: string | null;
    waiting: StreamingRightsCalendarItem[];
    /** a package room left open: back to it */
    openRooms: StreamingCataloguePackage[];
    /** the team's last idea for a package, while its titles are still free */
    suggestion: { packageId: string; name: string; projectIds: string[] } | null;
    onServices: RightsRoomTitle[];
    freeToSell: RightsRoomTitle[];
    /** cannot be sold, and why: never a tile that leads nowhere */
    heldBack: Array<{ title: string; why: string }>;
}

const projectsOf = (player: Player): Map<string, any> => {
    const projects = new Map<string, any>();
    [...(player.pastProjects || []), ...(player.activeReleases || [])].forEach(project => {
        if (project?.id && !projects.has(project.id)) projects.set(project.id, project);
    });
    return projects;
};

const buyerColorOf = (player: Player, contract: StreamingRightsContract): string => (contract.buyer.type === 'PLAYER_PLATFORM'
    ? player.ownedStreamingPlatform.identity?.primaryColor || '#e7b64a'
    : resolveStreamingPlatformBrandById(contract.buyer.platformId || contract.buyer.id, contract.buyer.name).primaryColor);

const finiteWeek = (value: unknown): number | null => (Number.isFinite(Number(value)) && value !== null && value !== undefined ? Number(value) : null);

/** Money this studio really received in the last 52 weeks: deals signed, its share of what they earned, and resales. */
const yearIncomeOf = (player: Player, studioId: string, week: number): number => {
    const from = week - 52;
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts))
        .filter(contract => contract.seller.type === 'PLAYER_STUDIO' && contract.seller.id === studioId
            && (contract.settlement.guarantee === 'PAID' || contract.settlement.guarantee === 'LEGACY_PAID')
            && contract.signedAtAbsoluteWeek > from);
    const royalties = Object.values(normalizeStreamingRoyaltySettlementRegistry(player.world.streamingRoyaltySettlements))
        .filter(settlement => settlement.sellerStudioId === studioId && settlement.absoluteWeek > from);
    return contracts.reduce((sum, contract) => sum + contract.minimumGuarantee, 0)
        + royalties.reduce((sum, settlement) => sum + settlement.royaltyPaid, 0);
};

export const getRightsRoom = (player: Player, studioId: string): RightsRoomView => {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const office = getStreamingRightsOffice(player, studioId, week);
    const calendar = getStreamingRightsCalendar(player, week);
    const desk = getStreamingCataloguePackageDesk(player, studioId, week);
    const contracts = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const projects = projectsOf(player);
    const inOpenRoom = new Set(desk.live.flatMap(item => item.components.map(component => component.sourceProjectId)));

    const titleOf = (item: StreamingRightsOfficeItem): RightsRoomTitle => {
        const contract = item.contractId ? contracts[item.contractId] : null;
        const live = contract && isStreamingLicenseActiveAt(contract, week) ? contract : null;
        const forGood = Boolean(live && (live.permanentPurchase || live.windowType === 'PERMANENT'));
        const weeksLeft = live && !forGood ? Math.max(0, live.expiresAtAbsoluteWeek - week) : null;
        const length = live ? Math.max(1, live.expiresAtAbsoluteWeek - live.startsAtAbsoluteWeek) : 1;
        return {
            projectId: item.projectId,
            title: item.title,
            genre: item.genre,
            quality: item.quality,
            rating: Number(projects.get(item.projectId)?.imdbRating || projects.get(item.projectId)?.rating) || ratingFromQuality(item.quality),
            releasedAtAbsoluteWeek: finiteWeek(projects.get(item.projectId)?.releasedAtAbsoluteWeek),
            buyerName: live?.buyer.name || null,
            buyerColor: live ? buyerColorOf(player, live) : '#e7b64a',
            weeksLeft,
            used: weeksLeft === null ? 0 : Math.max(0, Math.min(1, 1 - weeksLeft / length)),
            onYourService: live?.buyer.type === 'PLAYER_PLATFORM',
        };
    };

    const free = [...office.groups.AVAILABLE_TO_LICENSE, ...office.groups.NO_CURRENT_INTEREST].filter(item => !inOpenRoom.has(item.projectId));
    const placements = new Map(free.map(item => [item.projectId, getStreamingTitlePlacement(player, item.projectId)]));
    /* a title that cannot be sold is not on the shelf: every tile here opens a room */
    const lotProblems = new Map(free.filter(item => placements.get(item.projectId)!.maySellOutside).map(item => {
        const built = buildStreamingBiddingRightsLot({ world: player.world, sourceProjectId: item.projectId, sellerPartyId: studioId, startsAtAbsoluteWeek: week, maximumDurationWeeks: 104, windowType: 'FIRST_WINDOW' });
        return [item.projectId, built.lot ? null : built.compatibility.summary] as const;
    }));
    const freeToSell = free.filter(item => lotProblems.has(item.projectId) && !lotProblems.get(item.projectId)).map(titleOf).sort((left, right) => right.rating - left.rating || right.quality - left.quality || left.title.localeCompare(right.title));
    const heldBack = free.filter(item => lotProblems.get(item.projectId)).map(item => ({ title: item.title, why: lotProblems.get(item.projectId)! }));
    const ownService = player.ownedStreamingPlatform.identity;
    const onYours: RightsRoomTitle[] = free.filter(item => placements.get(item.projectId)!.onYours && !placements.get(item.projectId)!.maySellOutside).map(item => ({
        ...titleOf(item), buyerName: placements.get(item.projectId)!.serviceName || ownService?.name || 'Your service', buyerColor: ownService?.primaryColor || '#e7b64a', onYourService: true,
    }));
    /* a licence its holder resold: your studio is no longer the seller on the paper, but the title is out there, with whoever holds it now */
    const resold: RightsRoomTitle[] = free.filter(item => {
        const placement = placements.get(item.projectId)!;
        return !placement.onYours && !placement.maySellOutside && placement.outside.length > 0;
    }).map(item => {
        const holder = placements.get(item.projectId)!.outside[0];
        const contract = contracts[holder.contractId];
        const weeksLeft = holder.expiresAt === null ? null : Math.max(0, holder.expiresAt - week);
        return {
            ...titleOf(item),
            buyerName: holder.platformName,
            buyerColor: contract ? buyerColorOf(player, contract) : '#e7b64a',
            weeksLeft,
            used: weeksLeft === null || !contract ? 0 : Math.max(0, Math.min(1, 1 - weeksLeft / Math.max(1, contract.expiresAtAbsoluteWeek - contract.startsAtAbsoluteWeek))),
        };
    });
    const onServices = [...[...office.groups.UNDER_CONTRACT.map(titleOf), ...resold].sort((left, right) => (left.weeksLeft ?? 9999) - (right.weeksLeft ?? 9999) || left.title.localeCompare(right.title)), ...onYours];

    const freeIds = new Set(freeToSell.map(title => title.projectId));
    const idea = desk.ready.find(item => item.source === 'RIGHTS_DESK_PROPOSAL' && item.components.length >= 2 && item.components.every(component => freeIds.has(component.sourceProjectId)));

    return {
        mandate: office.mandate,
        yearIncome: yearIncomeOf(player, studioId, week),
        note: office.latestDigest?.summary || null,
        waiting: calendar.groups.actionRequired.filter(item => item.seller.type === 'PLAYER_STUDIO' && item.seller.id === studioId),
        openRooms: desk.live.filter(item => item.biddingSessionId && player.world.streamingBiddingSessions?.[item.biddingSessionId]),
        suggestion: idea ? { packageId: idea.id, name: idea.name, projectIds: idea.components.map(component => component.sourceProjectId) } : null,
        onServices,
        freeToSell,
        heldBack,
    };
};

const REASON_WORDS: Record<string, string> = {
    FULL_CONTROL: 'You decide every renewal',
    MANUAL_CONTROL: 'You took this one yourself',
    PROTECTED_TITLE: 'You protected this title',
    EXCLUSIVE_ASKS_YOU: 'Exclusive titles ask you first',
    WORLDWIDE_EXCLUSIVE: 'Worldwide exclusives always come to you',
    FRANCHISE_OR_UNIVERSE: 'Franchises always come to you',
    VALUE_THRESHOLD: 'It is above your limit for the team',
    DURATION_THRESHOLD: 'It runs longer than the team may sign',
    SOLVENCY_SENSITIVE: 'They may struggle to pay',
    RELATIONSHIP_SENSITIVE: 'A close partner, so it is your call',
    RETURN_NOT_SUPPORTED: 'What it earns may not cover the price',
    RIGHTS_CONFLICT: 'Another deal overlaps this one',
    DELEGATED_RESOLUTION_FAILED: 'The team could not close it',
};
export const getRightsReasonWords = (reasons: readonly string[]): string => reasons.map(reason => REASON_WORDS[reason]).filter(Boolean)[0] || '';

export interface RightsNextStep {
    headline: string;
    line: string;
    /** the case the three answers act on; none when nothing is left to decide */
    caseId: string | null;
    canRenew: boolean;
}

const moneyWords = (value: number): string => (value >= 1_000_000_000
    ? `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
    : value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1_000)}K`);

export const getRightsNextStep = (contract: StreamingRightsContract, item: StreamingRightsCalendarItem | null, week: number): RightsNextStep => {
    const buyer = contract.buyer.name;
    const left = Math.max(0, contract.expiresAtAbsoluteWeek - week);
    const weeksWord = `${left} ${left === 1 ? 'week' : 'weeks'}`;
    if (contract.permanentPurchase || contract.windowType === 'PERMANENT') return { headline: 'Sold for good', line: `${buyer} keeps it. There is nothing to renew.`, caseId: null, canRenew: false };
    if (!item) {
        const opens = Math.max(0, contract.expiresAtAbsoluteWeek - 8 - week);
        return contract.renewalOption
            ? { headline: `${buyer} has it for ${weeksWord}`, line: opens > 0 ? `Renewal talks open in ${opens} ${opens === 1 ? 'week' : 'weeks'}.` : 'Renewal talks open any week now.', caseId: null, canRenew: false }
            : { headline: `${buyer} has it for ${weeksWord}`, line: 'No renewal in this deal. Then it comes back to you, free to sell.', caseId: null, canRenew: false };
    }
    const economics = item.proposedEconomics;
    const offered = item.offerDisposition === 'OFFERED' && economics;
    if (item.outcome === 'PENDING' && item.status === 'ACTION_REQUIRED') return {
        headline: offered ? `${buyer} offers ${moneyWords(economics.minimumGuarantee)} to keep it` : `${buyer} has not made an offer`,
        line: [offered ? `${economics.durationWeeks} more weeks.` : null, getRightsReasonWords(item.protectionReasons), `It waits for you until ${gameWeekLabel(item.decisionDeadlineAbsoluteWeek, week)}.`].filter(Boolean).join(' '),
        caseId: item.id,
        canRenew: Boolean(offered),
    };
    if (item.outcome === 'PENDING' && offered) return {
        headline: `${buyer} offers ${moneyWords(economics.minimumGuarantee)} to keep it`,
        line: `${economics.durationWeeks} more weeks. The team decides next week unless you do.`,
        caseId: item.id,
        canRenew: true,
    };
    if (item.outcome === 'PENDING') return { headline: `Talks have opened with ${buyer}`, line: `It has ${weeksWord} left. An offer should land soon.`, caseId: item.id, canRenew: false };
    if (item.outcome === 'ACCEPTED' || item.outcome === 'DELEGATED_ACCEPTED') return {
        headline: `Renewed with ${buyer}`,
        line: `${economics ? `${moneyWords(economics.minimumGuarantee)}, ${economics.durationWeeks} weeks. ` : ''}${item.decidedBy ? `${item.decidedBy.name} signed it.` : item.outcome === 'DELEGATED_ACCEPTED' ? 'The team signed it.' : 'You signed it.'}`,
        caseId: null,
        canRenew: false,
    };
    if (item.outcome === 'RETURN_TO_MARKET') return { headline: `Back to you in ${weeksWord}`, line: `${buyer} keeps it until then. Then it is free to sell.`, caseId: null, canRenew: false };
    if (item.outcome === 'LET_EXPIRE') return { headline: `It ends in ${weeksWord}`, line: 'Then it comes back to you, free to sell.', caseId: null, canRenew: false };
    return { headline: `${buyer} does not want it again`, line: `It comes back to you in ${weeksWord}, free to sell.`, caseId: null, canRenew: false };
};

export interface RightsHistoryRow {
    when: string;
    what: string;
    detail: string;
    money: number | null;
}

export interface RightsTitleSheet {
    projectId: string;
    title: string;
    genre: string;
    kind: string;
    rating: number;
    buyerName: string;
    buyerColor: string;
    buyerId: string;
    weeksLeft: number | null;
    theyPaid: number;
    yourShare: number;
    earned: number;
    next: RightsNextStep;
    history: RightsHistoryRow[];
    canOpenFilm: boolean;
}

const scopeWords = (contract: Pick<StreamingRightsContract, 'territory' | 'countryIds' | 'exclusivity' | 'durationWeeks'>): string => {
    const markets = contract.territory === 'GLOBAL' ? 'worldwide' : `in ${contract.countryIds?.length || 1} ${(contract.countryIds?.length || 1) === 1 ? 'market' : 'markets'}`;
    const years = contract.durationWeeks % 52 === 0 ? `${contract.durationWeeks / 52} ${contract.durationWeeks === 52 ? 'year' : 'years'}` : `${contract.durationWeeks} weeks`;
    return `${contract.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'} ${markets}, ${years}`;
};

export const getRightsTitleSheet = (player: Player, studioId: string, projectId: string): RightsTitleSheet | null => {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    /* every deal on this title that started with this studio, including a licence its holder passed on */
    const registry = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const sold = (contract: StreamingRightsContract) => contract.seller.type === 'PLAYER_STUDIO' && contract.seller.id === studioId;
    const all = Object.values(registry)
        .filter(contract => contract.sourceProjectId === projectId && (sold(contract) || (registry[contract.rootContractId] && sold(registry[contract.rootContractId]))))
        .sort((left, right) => left.signedAtAbsoluteWeek - right.signedAtAbsoluteWeek || left.id.localeCompare(right.id));
    const live = all.filter(contract => isStreamingLicenseActiveAt(contract, week)).sort((left, right) => left.expiresAtAbsoluteWeek - right.expiresAtAbsoluteWeek)[0];
    if (!live) return null;
    /* every case there has ever been, not the calendar's short list of recent ones */
    const allCases = Object.values(normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar).renewalCases);
    const thisCase = allCases.find(candidate => candidate.sourceContractId === live.id);
    const item = thisCase ? { ...thisCase, weeksRemaining: Math.max(0, thisCase.sourceExpiresAtAbsoluteWeek - week) } : null;
    const project = projectsOf(player).get(projectId);
    const quality = Number(project?.projectQuality || project?.quality) || 0;
    const renewalOf = new Set(allCases.map(row => row.replacementContractId).filter(Boolean));
    const history: RightsHistoryRow[] = [];
    if (Number(project?.gross) > 0 && finiteWeek(project?.releasedAtAbsoluteWeek) !== null) {
        history.push({ when: gameWeekLabel(project.releasedAtAbsoluteWeek, week), what: 'In cinemas', detail: 'What it took at the box office', money: Number(project.gross) });
    }
    all.forEach(contract => {
        const chain = contract.parentContractId ? getStreamingRightsTransferChain(player.world, contract.id) : null;
        history.push({
            when: gameWeekLabel(contract.signedAtAbsoluteWeek, week),
            what: chain ? `${chain.holders.length > 1 ? chain.holders[chain.holders.length - 2].name : 'It'} passed it to ${contract.buyer.name}` : renewalOf.has(contract.id) ? `Renewed with ${contract.buyer.name}` : `Sold to ${contract.buyer.name}`,
            detail: scopeWords(contract),
            money: chain ? null : contract.minimumGuarantee,
        });
    });
    return {
        projectId,
        title: live.titleAtSigning,
        genre: String(project?.genre || project?.projectDetails?.genre || live.genre || '').replaceAll('_', ' '),
        kind: live.projectType === 'SERIES' ? 'Series' : 'Film',
        rating: Number(project?.imdbRating || project?.rating) || ratingFromQuality(quality),
        buyerName: live.buyer.name,
        buyerColor: buyerColorOf(player, live),
        buyerId: live.buyer.platformId || live.buyer.id,
        weeksLeft: live.permanentPurchase || live.windowType === 'PERMANENT' ? null : Math.max(0, live.expiresAtAbsoluteWeek - week),
        theyPaid: live.minimumGuarantee,
        yourShare: live.licensorRevenueShare,
        earned: all.filter(sold).reduce((sum, contract) => sum + contract.minimumGuarantee + contract.cumulativeRoyaltyPaid, 0),
        next: getRightsNextStep(live, item, week),
        history,
        canOpenFilm: Boolean(project),
    };
};

export interface RightsPartner {
    platformId: string;
    name: string;
    color: string;
    score: number;
    tier: string;
    trend: string;
    deals: number;
    renewals: number;
    madeForThem: number;
    turnedDown: number;
    paid: number;
}

/** Who you deal with. The relationship comes from the office; the deals and the money are read off the contracts themselves, so nothing is missed. */
export const getRightsPartners = (player: Player, studioId: string): RightsPartner[] => {
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts))
        .filter(contract => contract.seller.type === 'PLAYER_STUDIO' && contract.seller.id === studioId);
    const renewed = new Set(Object.values(player.world.streamingRightsCalendar?.renewalCases || {}).map(item => item.replacementContractId).filter(Boolean));
    return getStreamingCommercialRelationships(player, studioId).map(partner => {
        const theirs = contracts.filter(contract => (contract.buyer.platformId || contract.buyer.id) === partner.platformId);
        return {
            platformId: partner.platformId,
            name: partner.platformName,
            color: resolveStreamingPlatformBrandById(partner.platformId, partner.platformName).primaryColor,
            score: partner.score,
            tier: partner.tier,
            trend: partner.trend,
            deals: theirs.filter(contract => !renewed.has(contract.id)).length,
            renewals: theirs.filter(contract => renewed.has(contract.id)).length,
            madeForThem: partner.deliveredCommissions,
            turnedDown: partner.rejectedOffers,
            paid: Math.max(partner.realizedPartnerValue + partner.backendPaid, theirs.reduce((sum, contract) => sum + contract.minimumGuarantee + contract.cumulativeRoyaltyPaid, 0)),
        };
    }).sort((left, right) => right.paid - left.paid || right.score - left.score || left.name.localeCompare(right.name));
};

/* what a seller can be told before the room opens: measured against the room's own closing offers (see `audit-package-fair-price`) */
export const estimateRightsPackage = (titles: Array<{ quality: number; gross: number; budget: number; streamingRevenue: number }>, durationWeeks: number, exclusivity: StreamingLicenseExclusivity): { low: number; high: number } => {
    if (!titles.length) return { low: 0, high: 0 };
    const factor = getStreamingRightsDealFactor({ durationWeeks, exclusivity, marketShare: 1 });
    const sum = titles.reduce((total, title) => total + calculateStreamingCatalogueReferenceValue({ quality: title.quality, audience: 0, budget: title.budget, theatricalGross: title.gross, streamingRevenue: title.streamingRevenue, franchiseProtected: false }) * factor, 0);
    const quality = titles.reduce((total, title) => total + title.quality, 0) / titles.length;
    const multiple = 1.24 * Math.max(0.45, 0.72 + quality / 100 - Math.max(0, 75 - quality) * 0.006) * 0.85;
    return { low: Math.round(sum * multiple * 0.85 / 1_000_000) * 1_000_000, high: Math.round(sum * multiple * 1.15 / 1_000_000) * 1_000_000 };
};

export const getRightsTitleFigures = (player: Player, projectId: string): { quality: number; gross: number; budget: number; streamingRevenue: number } => {
    const project = projectsOf(player).get(projectId);
    return {
        quality: Number(project?.projectQuality ?? project?.quality) || 0,
        gross: Number(project?.gross || project?.totalGross) || 0,
        budget: Number(project?.budget || project?.projectDetails?.estimatedBudget) || 0,
        streamingRevenue: Number(project?.streamingRevenue || project?.projectDetails?.streamingRevenue) || 0,
    };
};

const PACKAGE_BUYERS: Record<PlatformId, { baseBid: number; ceiling: number; quality: number }> = {
    NETFLIX: { baseBid: 24_000_000, ceiling: 620_000_000, quality: 72 },
    APPLE_TV: { baseBid: 30_000_000, ceiling: 760_000_000, quality: 84 },
    DISNEY_PLUS: { baseBid: 22_000_000, ceiling: 680_000_000, quality: 76 },
    HULU: { baseBid: 15_000_000, ceiling: 260_000_000, quality: 62 },
    YOUTUBE: { baseBid: 8_000_000, ceiling: 130_000_000, quality: 46 },
};

const packageBuyers = (player: Player, studioId: string): StreamingBiddingPlatformInput[] => {
    const relations = player.businesses.find(business => business.id === studioId)?.studioState?.platformRelations;
    return (Object.keys(PACKAGE_BUYERS) as PlatformId[]).flatMap(platformId => {
        const platform = player.world.platforms?.[platformId];
        if (!platform) return [];
        const brand = resolveStreamingPlatformBrandById(platformId, platform.name);
        return [{
            id: platformId,
            name: platform.name || brand.displayName,
            color: brand.primaryColor,
            cashAvailable: Math.max(0, Number(platform.cashReserve) || 0) * 1_000_000,
            baseBid: PACKAGE_BUYERS[platformId].baseBid,
            acquisitionCeiling: PACKAGE_BUYERS[platformId].ceiling,
            qualityPreference: PACKAGE_BUYERS[platformId].quality,
            relationshipMultiplier: Math.max(0.84, Math.min(1.16, 1 + Number(relations?.[platformId]?.trustModifier || 0) / 100)),
            canStartNewBids: !platform.ai?.spendingRestrictions?.blocksNewBids,
        }];
    });
};

/** Two or more titles into one room: the package and its room are made together, and the team's old idea for the same titles goes away. */
export const openRightsPackageRoom = (player: Player, input: { studioId: string; projectIds: string[]; durationWeeks: number; exclusivity: StreamingLicenseExclusivity }): { player: Player; session: StreamingBiddingSession | null; message: string | null } => {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const studio = player.businesses.find(business => business.id === input.studioId);
    const created = createStreamingCataloguePackage(player, {
        studioId: input.studioId,
        name: `${studio?.name || 'Studio'} collection`,
        projectIds: input.projectIds,
        source: 'PLAYER_CURATED',
        absoluteWeek: week,
        startsAtAbsoluteWeek: week,
        maximumDurationWeeks: input.durationWeeks,
        windowType: 'FIRST_WINDOW',
        exclusivity: input.exclusivity,
    });
    if (!created.package) return { player, session: null, message: 'Fewer than two of these can be sold together right now.' };
    try {
        const session = createStreamingCatalogueBiddingSession({ cataloguePackage: created.package, platforms: packageBuyers(created.player, input.studioId) });
        const picked = new Set(input.projectIds);
        const packages = Object.fromEntries(Object.entries(created.player.world.streamingCataloguePackages || {}).map(([id, item]) => [id,
            item.id === created.package!.id ? { ...item, lifecycle: 'LIVE' as const, biddingSessionId: session.id }
                : item.lifecycle === 'READY' && item.components.some(component => picked.has(component.sourceProjectId)) ? { ...item, lifecycle: 'WITHDRAWN' as const } : item]));
        return {
            player: { ...created.player, world: { ...created.player.world, streamingCataloguePackages: packages, streamingBiddingSessions: upsertStreamingBiddingSession(created.player.world.streamingBiddingSessions, session) } },
            session,
            message: null,
        };
    } catch (error) {
        return { player, session: null, message: error instanceof Error && !/fund every title/.test(error.message) ? error.message : 'No service can pay for all of these today. Try fewer titles.' };
    }
};

export const signRightsPackage = (player: Player, session: StreamingBiddingSession, offer: StreamingOfferVersion): { player: Player; signed: boolean; message: string; total: number; titles: number } => {
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const accepted = acceptStreamingBiddingOffer(session, offer.id);
    const prepared: Player = { ...player, world: { ...player.world, streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, accepted) } };
    const result = acceptStreamingCataloguePackageOffer(prepared, { packageId: session.cataloguePackageId || '', session: accepted, offerId: offer.id, absoluteWeek: week });
    return { player: result.changed ? result.player : player, signed: result.changed, message: result.detail || 'The package could not be signed.', total: result.package?.totalGuarantee || 0, titles: result.package?.components.length || 0 };
};

export const leaveRightsPackageRoom = (player: Player, session: StreamingBiddingSession): Player => {
    const left = leaveStreamingBiddingSession(session);
    const item = session.cataloguePackageId ? player.world.streamingCataloguePackages?.[session.cataloguePackageId] : null;
    return {
        ...player,
        world: {
            ...player.world,
            streamingBiddingSessions: upsertStreamingBiddingSession(player.world.streamingBiddingSessions, left),
            streamingCataloguePackages: item ? { ...player.world.streamingCataloguePackages, [item.id]: { ...item, lifecycle: 'WITHDRAWN' as const } } : player.world.streamingCataloguePackages,
        },
    };
};
