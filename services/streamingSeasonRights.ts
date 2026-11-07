/**
 * #246 (plan §25.4 Q8): who gets the next season. Zeesh (2026-11-04): "Agar ek ka sequel Disney paisa diya to kya wo season 2 kisi aur ke pas jaa sakta
 * hai and kaise uska financial handle hoga". Three rules, the way the business runs:
 *  - Disney already paid for the next season: it goes to Disney. To leave, repay what it paid and a penalty.
 *  - Disney licensed the last season: it gets the first word on the next. If it passes, or the player does, the season goes to the floor.
 *  - Disney commissioned it: Disney owns it and decides, and can hire the studio again (platformAiPlayerCommissions).
 * The last season stays on its platform until its licence ends, and each season's money is its own.
 */
import type { Business, LockedStreamingFunding, Player, ProjectDetails } from '../types';
import { addActivityLog } from './activityLog';
import { getProjectFundingEconomics } from './projectFundingEconomics';
import { buildReleaseStreamingBidderMarket } from './releaseStreamingAuction';
import { buildSeriesStreamingSessionInput, getSeriesPackageScore } from './seriesStreamingValue';
import { createStreamingBiddingSession } from './streamingBidding';
import { buildStreamingBiddingRightsLot } from './streamingRightsCompatibility';
import { getAbsoluteWeek } from './legacyLogic';

/** to leave a platform that paid for the season: what it paid, and this much again */
export const STREAMING_SEASON_LEAVE_PENALTY = 0.15;
/** a first negotiation is a fair price, short of what an open floor can reach */
const FIRST_NEGOTIATION_SHARE = 0.85;
const FIRST_NEGOTIATION_FLOOR = 1_000_000;

const installmentOf = (row: any) => Number(row?.installmentNumber || row?.projectDetails?.installmentNumber || 1);
const franchiseOf = (row: any) => row?.franchiseId || row?.projectDetails?.franchiseId || row?.id;

const lastSeason = (player: Player, projectId: string, details: Pick<ProjectDetails, 'franchiseId' | 'installmentNumber'>) => {
    const franchise = details.franchiseId || projectId;
    const installment = Number(details.installmentNumber || 1);
    return [...(player.activeReleases || []), ...(player.pastProjects || [])]
        .filter((row: any) => row.id !== projectId && franchiseOf(row) === franchise && installmentOf(row) < installment)
        .sort((left: any, right: any) => installmentOf(right) - installmentOf(left))[0] as { id: string } | undefined;
};

/** the money a platform locked for the season after this one, if it is still unused */
export const getStreamingSeasonFunding = (studio: Business | undefined, project: any): LockedStreamingFunding | null => {
    const details = project?.projectDetails || project || {};
    const hidden = details.hiddenStats || {};
    const type = project?.projectType || details.projectType || details.type || project?.type;
    if (type !== 'SERIES') return null;
    const record = (studio?.studioState?.lockedStreamingFunds || []).find(fund => !fund.usedByProjectId && !fund.playerPlatformCommissionOfferId
        && (fund.sourceProjectId === project?.id || fund.sourceProjectId === details.id || fund.sourceProjectId === hidden.nextSeasonFundingSourceProjectId));
    return record || null;
};

export interface StreamingFirstNegotiation {
    platformId: string;
    platformName: string;
    lastSeasonTitle: string;
    /** false when the platform has no interest or no money: then the floor is simply open */
    interested: boolean;
    amount: number;
    premiereWeek: number | null;
}

/** the platform that licensed the last season has the first word on this one */
export const getStreamingFirstNegotiation = (player: Player, details: ProjectDetails, projectId: string, startsAt: number): StreamingFirstNegotiation | null => {
    if (details.type !== 'SERIES' || Number(details.installmentNumber || 1) <= 1) return null;
    const previous = lastSeason(player, projectId, details);
    if (!previous) return null;
    const contract = Object.values(player.world?.streamingRightsContracts || {})
        .filter(row => row.sourceProjectId === previous.id && row.seller?.type === 'PLAYER_STUDIO' && Boolean(row.buyer?.platformId))
        .sort((left, right) => left.signedAtAbsoluteWeek - right.signedAtAbsoluteWeek)[0];
    if (!contract) return null;
    const platformId = contract.buyer.platformId!;
    const buyer = buildReleaseStreamingBidderMarket(player, {
        projectId, title: details.title, genre: details.genre, packageScore: getSeriesPackageScore(details),
        absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek), earliestPremiereAbsoluteWeek: startsAt,
        studioPlatformRelations: player.businesses.find(item => item.id === details.studioId)?.studioState?.platformRelations || {},
        requiredPlatformId: platformId,
    }).find(row => row.id === platformId);
    const premiereWeek = buyer?.availablePremiereAbsoluteWeek ?? null;
    const lot = buyer && premiereWeek !== null
        ? buildStreamingBiddingRightsLot({ world: player.world, sourceProjectId: projectId, sellerPartyId: details.studioId, startsAtAbsoluteWeek: premiereWeek, maximumDurationWeeks: 52, windowType: 'FIRST_WINDOW' }).lot
        : null;
    let ceiling = 0;
    if (buyer && lot) {
        try {
            ceiling = createStreamingBiddingSession(buildSeriesStreamingSessionInput(player, details, projectId, lot, [buyer])).platformStates.find(row => row.platformId === platformId)?.fixedExposureCeiling || 0;
        } catch { ceiling = 0; }
    }
    const amount = Math.round(ceiling * FIRST_NEGOTIATION_SHARE / 100_000) * 100_000;
    return {
        platformId, platformName: contract.buyer.name, lastSeasonTitle: contract.titleAtSigning,
        interested: amount >= FIRST_NEGOTIATION_FLOOR, amount: amount >= FIRST_NEGOTIATION_FLOOR ? amount : 0, premiereWeek,
    };
};

/** one line for Filmography: where the next season goes, and why */
export const getStreamingNextSeasonLine = (player: Player, studio: Business | undefined, project: any): string | null => {
    const fund = getStreamingSeasonFunding(studio, project);
    if (fund) return `${fund.platformName} already paid for the next season, so it goes to ${fund.platformName}.`;
    const details = project?.projectDetails || project || {};
    const type = project?.projectType || details.projectType || details.type || project?.type;
    if (type !== 'SERIES') return null;
    const contract = Object.values(player.world?.streamingRightsContracts || {})
        .filter(row => row.sourceProjectId === project?.id && row.seller?.type === 'PLAYER_STUDIO' && Boolean(row.buyer?.platformId))
        .sort((left, right) => left.signedAtAbsoluteWeek - right.signedAtAbsoluteWeek)[0];
    return contract ? `${contract.buyer.name} streamed this season, so it gets the first word on the next.` : null;
};

export interface StreamingSeasonLeaveQuote { platformName: string; repay: number; penalty: number; total: number }

export const getStreamingSeasonLeaveQuote = (project: any, platformName: string): StreamingSeasonLeaveQuote | null => {
    const repay = getProjectFundingEconomics(project).platformFunding;
    if (repay <= 0) return null;
    const penalty = Math.round(repay * STREAMING_SEASON_LEAVE_PENALTY);
    return { platformName, repay, penalty, total: repay + penalty };
};

const moveMoneyToPlatform = (player: Player, platformId: string, amount: number): Player => {
    const core = player.world.platforms?.[platformId as keyof NonNullable<Player['world']['platforms']>];
    const operator = player.world.streamingPlatformEcosystem?.operators?.[platformId];
    return {
        ...player,
        world: {
            ...player.world,
            ...(core ? { platforms: { ...player.world.platforms!, [platformId]: { ...core, cashReserve: core.cashReserve + amount / 1_000_000 } } } : {}),
            ...(!core && operator ? { streamingPlatformEcosystem: { ...player.world.streamingPlatformEcosystem!, operators: { ...player.world.streamingPlatformEcosystem!.operators, [platformId]: { ...operator, cashMillions: operator.cashMillions + amount / 1_000_000 } } } } : {}),
        },
    };
};

/** the platform paid for this season, and the player wants out: repay it and a penalty, and the season is free to sell */
export const leaveStreamingSeasonFunding = (player: Player, projectId: string): { player: Player; changed: boolean; detail: string } => {
    const commitment = player.commitments.find(item => item.id === projectId);
    const hidden = commitment?.projectDetails?.hiddenStats;
    const platformId = hidden?.nextSeasonFundingPlatformId || hidden?.platformId;
    if (!commitment || !hidden || !platformId) return { player, changed: false, detail: 'No platform paid for this season.' };
    const studio = player.businesses.find(item => item.id === commitment.projectDetails?.studioId);
    const platformName = player.world.streamingPlatformEcosystem?.operators?.[platformId]?.name || String(platformId);
    const quote = getStreamingSeasonLeaveQuote(commitment, platformName);
    if (!studio || !quote) return { player, changed: false, detail: 'No platform paid for this season.' };
    if (studio.balance < quote.total) return { player, changed: false, detail: `${studio.name} needs $${Math.round(quote.total / 1_000_000)}M to leave ${platformName}.` };
    const { platformId: _platform, nextSeasonFundingAmount: _amount, nextSeasonFundingPlatformId: _funder, nextSeasonFundingSourceProjectId: _source, nextSeasonFundingUsedByProjectId: _used,
        nextSeasonFundingTier: _tier, nextSeasonFundingReason: _reason, platformFundedPremiereConfirmed: _confirmed, ...freeStats } = hidden;
    const relation = studio.studioState?.platformRelations?.[platformId];
    const key = `season_leave_${projectId}`;
    const moved = moveMoneyToPlatform({
        ...player,
        commitments: player.commitments.map(item => (item.id !== projectId ? item : {
            ...item,
            platformProductionFunding: 0,
            projectDetails: { ...item.projectDetails!, hiddenStats: { ...freeStats, platformProductionFundingApplied: 0 } },
        })),
        businesses: player.businesses.map(item => (item.id !== studio.id ? item : {
            ...item,
            balance: item.balance - quote.total,
            studioState: item.studioState ? {
                ...item.studioState,
                platformRelations: { ...item.studioState.platformRelations, [platformId]: { ...relation, trustModifier: Math.max(-8, Math.min(0, Number(relation?.trustModifier) || 0) - 2), recoveryWeeksRemaining: Math.max(12, Number(relation?.recoveryWeeksRemaining) || 0) } },
                financeLedger: [{
                    id: key, week: player.currentWeek, year: player.age, amount: -quote.total, type: 'LEGAL' as const,
                    label: `Left ${platformName}: ${commitment.name}`, projectId,
                }, ...(item.studioState.financeLedger || [])].slice(0, 40),
            } : item.studioState,
        })),
    }, platformId, quote.total);
    return {
        player: addActivityLog(moved, `"${commitment.name}" left ${platformName}: repaid what it paid and a penalty. It is free to sell.`, 'negative'),
        changed: true,
        detail: `${commitment.name} is free to sell.`,
    };
};

/** the network stopped the show: the money it locked for the next season goes back, and nobody is sued for it */
export const releaseStreamingSeasonFunding = (player: Player, studioId: string, sourceProjectId: string): Player => {
    const studio = player.businesses.find(item => item.id === studioId);
    const fund = (studio?.studioState?.lockedStreamingFunds || []).find(item => item.sourceProjectId === sourceProjectId && !item.usedByProjectId && !item.playerPlatformCommissionOfferId);
    if (!studio?.studioState || !fund) return player;
    const released = moveMoneyToPlatform({
        ...player,
        businesses: player.businesses.map(item => (item.id !== studio.id ? item : {
            ...item,
            studioState: { ...item.studioState!, lockedStreamingFunds: (item.studioState!.lockedStreamingFunds || []).filter(row => row.id !== fund.id) },
        })),
    }, fund.platformId, Math.max(0, fund.amount));
    return addActivityLog(released, `${fund.platformName} took back the money it set aside for the next season of "${fund.sourceTitle}".`);
};
