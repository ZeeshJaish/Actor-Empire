import { getPlatformAiSpendingRestrictions } from './platformAi/platformAiFinancing';
import type { Player, ProjectDetails, StreamingBiddingRightsLot, StreamingBiddingPlatformInput, StreamingOfferVersion, PlatformId } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { buildReleaseStreamingBidderMarket } from './releaseStreamingAuction';
import { buildStreamingBiddingRightsLot, resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { createStreamingBiddingSession, advanceStreamingBiddingSession, getStreamingBiddingClosingOffers, type CreateStreamingBiddingSessionInput } from './streamingBidding';

const finite = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;

export const getSeriesPackageScore = (project: ProjectDetails): number => {
    const h: Partial<ProjectDetails['hiddenStats']> = project.hiddenStats || {};
    return finite(h.qualityScore, 50) * .4 + finite(h.scriptQuality, 50) * .2
        + finite(h.directorQuality, 50) * .15 + finite(h.castingStrength, 50) * .15 + finite(h.rawHype, 50) * .1;
};

/** Only released work in this series informs renewal value. Never salary, gross budget, or invented viewers. */
export const getSeriesPerformanceEvidence = (player: Player, project: ProjectDetails, titleId: string): CreateStreamingBiddingSessionInput['seriesPerformance'] => {
    const franchise = project.franchiseId || titleId;
    const installment = finite(project.installmentNumber, 1) || 1;
    const candidates = [...player.activeReleases, ...player.pastProjects].filter((row: any) => {
        const d = row.projectDetails || row;
        return (row.type === 'SERIES' || row.projectType === 'SERIES' || d.type === 'SERIES' || d.projectType === 'SERIES')
            && (row.id === titleId || ((row.franchiseId || d.franchiseId || row.id) === franchise
                && finite(row.installmentNumber || d.installmentNumber, 1) < installment));
    }).sort((a: any, b: any) => finite(b.installmentNumber || b.projectDetails?.installmentNumber, 1) - finite(a.installmentNumber || a.projectDetails?.installmentNumber, 1));
    for (const row of candidates as any[]) {
        const views = finite(row.totalViews ?? row.streaming?.totalViews ?? row.views);
        const rating = finite(row.imdbRating ?? row.rating);
        if (views > 0 || rating > 0) return { viewingAccounts: views, ...(rating > 0 ? { rating: Math.min(10, rating) } : {}) };
    }
    return undefined;
};

export const buildSeriesStreamingSessionInput = (
    player: Player, project: ProjectDetails, titleId: string, rightsLot: StreamingBiddingRightsLot,
    platforms?: StreamingBiddingPlatformInput[],
): CreateStreamingBiddingSessionInput => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const packageScore = getSeriesPackageScore(project);
    const market = platforms || buildReleaseStreamingBidderMarket(player, { projectId: titleId, title: project.title, genre: project.genre,
        packageScore, absoluteWeek, earliestPremiereAbsoluteWeek: rightsLot.startsAtAbsoluteWeek,
        studioPlatformRelations: player.businesses.find(b => b.id === project.studioId)?.studioState?.platformRelations || {} });
    return { projectId: titleId, title: project.title, sellerStudioId: project.studioId, sellerStudioName: player.businesses.find(b => b.id === project.studioId)?.name || 'Series rights holder',
        absoluteWeek, projectType: 'SERIES', genre: project.genre, projectBudget: project.estimatedBudget, packageScore,
        seriesPerformance: getSeriesPerformanceEvidence(player, project, titleId), rightsLot,
        platforms: market.map(platform => {
            const pending = Object.values(player.world.streamingRightsContracts || {}).filter(c => c.buyer.platformId === platform.id && c.settlement.guarantee === 'PENDING')
                .reduce((sum, c) => sum + c.minimumGuarantee + c.productionFunding + c.futureSeasonFunding, 0);
            const core = player.world.platforms?.[platform.id];
            return { ...platform, cashAvailable: Math.max(0, platform.cashAvailable - pending),
                canStartNewBids: platform.canStartNewBids !== false && (!core || !getPlatformAiSpendingRestrictions(core, absoluteWeek).blocksNewBids) };
        }) };
};

/** Current signing cap; old signed contracts are never repriced or mutated. */
export const quoteSeriesStreamingRights = (
    player: Player, project: ProjectDetails, titleId: string, buyerId: string,
    startsAtAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek) + 1, durationWeeks = 52,
    scope?: Pick<StreamingOfferVersion, 'countryIds' | 'exclusivity' | 'windowType'>,
): { maximumBid: number; rightsLot: StreamingBiddingRightsLot | null } => {
    let scoped: StreamingBiddingRightsLot | null;
    if (scope) {
        const compatibility = resolveStreamingRightsCompatibility({ world: player.world, sourceProjectId: titleId,
            sellerPartyId: project.studioId, buyerPlatformId: buyerId, territory: 'MULTI_REGION', countryIds: scope.countryIds,
            startsAtAbsoluteWeek, expiresAtAbsoluteWeek: startsAtAbsoluteWeek + durationWeeks,
            exclusivity: scope.exclusivity, windowType: scope.windowType });
        if (!scope.countryIds.length || !compatibility.available) return { maximumBid: 0, rightsLot: null };
        scoped = { id: `series-rights:${titleId}:${buyerId}`, sourceProjectId: titleId, territory: 'MULTI_REGION',
            countryIds: [...scope.countryIds], excludedCountryIds: [], startsAtAbsoluteWeek, maximumDurationWeeks: durationWeeks,
            windowType: scope.windowType, notice: null };
    } else {
        scoped = buildStreamingBiddingRightsLot({ world: player.world, sourceProjectId: titleId, sellerPartyId: project.studioId,
            startsAtAbsoluteWeek, maximumDurationWeeks: durationWeeks, windowType: 'FIRST_WINDOW' }).lot;
        if (!scoped) return { maximumBid: 0, rightsLot: null };
    }
    try {
        const session = createStreamingBiddingSession(buildSeriesStreamingSessionInput(player, project, titleId, scoped));
        return { maximumBid: session.platformStates.find(p => p.platformId === buyerId)?.fixedExposureCeiling || 0, rightsLot: scoped };
    } catch { return { maximumBid: 0, rightsLot: null }; }
};

/** Automatic studios use the same room value. Funding promises are not converted into cash profit. */
export const createSeriesStreamingBids = (player: Player, project: ProjectDetails, titleId: string) => {
    const lot = buildStreamingBiddingRightsLot({ world: player.world, sourceProjectId: titleId, sellerPartyId: project.studioId,
        startsAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) + 1, maximumDurationWeeks: 52, windowType: 'FIRST_WINDOW' }).lot;
    if (!lot) return [];
    try {
        const input = buildSeriesStreamingSessionInput(player, project, titleId, lot);
        // This automatic cash authority currently settles core platforms only.
        input.platforms = input.platforms.filter(platform => Boolean(player.world.platforms?.[platform.id]));
        const session = advanceStreamingBiddingSession(createStreamingBiddingSession(input), 45);
        const best = new Map<string, ReturnType<typeof getStreamingBiddingClosingOffers>[number]>();
        for (const offer of getStreamingBiddingClosingOffers(session)) if (!best.has(offer.platformId) || best.get(offer.platformId)!.minimumGuarantee < offer.minimumGuarantee) best.set(offer.platformId, offer);
        return [...best.values()].filter(o => o.minimumGuarantee > 0).map(o => ({ platformId: o.platformId as PlatformId,
            upfront: o.minimumGuarantee, royalty: o.licensorRevenueShare, duration: o.durationWeeks }));
    } catch { return []; }
};
