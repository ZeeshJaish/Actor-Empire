import type { ActiveRelease, PastProject } from '../../types';
import { getReleaseDisplayPhase } from '../releasePresentation';
import { normalizeCinemaReceiptHistory } from './boxOfficeReceiptHistory';

/** Presentation overrides must retain financial and ownership facts from the source. */
export const buildCinemaReleaseDashboardProject = (r: ActiveRelease) => ({
    ...r,
    phase: getReleaseDisplayPhase(r),
    rating: r.imdbRating,
    gross: r.totalGross,
    awards: [],
    views: r.streaming?.totalViews,
    franchiseId: r.projectDetails.franchiseId,
    installmentNumber: r.projectDetails.installmentNumber,
    genre: r.projectDetails.genre,
});

export const buildCinemaArchiveDashboardProject = <T extends PastProject>(p: T) => ({
    ...p,
    phase: 'RELEASED',
    views: p.totalViews,
    projectDetails: p,
});

export const createArchivedCinemaReleaseRecord = (project: any, untitledLabel: string): ActiveRelease => {
    const weeklyGross = Array.isArray(project.weeklyGross) ? project.weeklyGross.map(Number) : [];
    const weeklyViews = Array.isArray(project.weeklyViews) ? project.weeklyViews.map(Number) : [];
    const gross = Math.max(0, Number(project.gross ?? project.totalGross ?? 0));
    const streamingRevenue = Math.max(0, Number(project.streamingRevenue || 0));
    const projectType = project.projectType === 'SERIES' || project.type === 'SERIES' ? 'SERIES' : 'MOVIE';
    const projectDetails = project.projectDetails && typeof project.projectDetails === 'object'
        ? project.projectDetails
        : {
            title: project.name || project.title || untitledLabel,
            type: projectType,
            description: project.description || '',
            studioId: project.studioId || 'ARCHIVE',
            subtype: project.subtype || 'STANDALONE',
            genre: project.genre || 'DRAMA',
            format: project.format || 'LIVE_ACTION',
            budgetTier: project.budgetTier || 'MID',
            estimatedBudget: Math.max(1, Number(project.budget || 1)),
            visibleHype: 'MID',
            hiddenStats: {
                qualityScore: Number(project.projectQuality || project.imdbRating * 10 || 50),
            },
            directorName: project.directorName || '',
            visibleDirectorTier: '',
            visibleScriptBuzz: '',
            visibleCastStrength: '',
            releaseRegionIds: project.releaseRegionIds || [],
            releaseChainSelections: project.releaseChainSelections || {},
        };
    const streamingOnly = gross <= 0 && streamingRevenue > 0 && project.streamingPlatform;

    return {
        ...project,
        id: String(project.id),
        name: project.name || project.title || untitledLabel,
        type: projectType,
        roleType: project.roleType || 'LEAD',
        projectDetails,
        distributionPhase: streamingOnly ? 'STREAMING' : 'THEATRICAL',
        weekNum: Math.max(1, streamingOnly ? weeklyViews.length : weeklyGross.length),
        weeklyGross,
        totalGross: gross,
        weeklyStudioReceipts: Array.isArray(project.weeklyStudioReceipts) ? project.weeklyStudioReceipts.map(Number) : [],
        ...normalizeCinemaReceiptHistory(project),
        weeklyExhibitorReceipts: Array.isArray(project.weeklyExhibitorReceipts) ? project.weeklyExhibitorReceipts.map(Number) : [],
        totalExhibitorReceipts: Math.max(0, Number(project.totalExhibitorReceipts || 0)),
        weeklyDistributionBreakdowns: Array.isArray(project.weeklyDistributionBreakdowns) ? project.weeklyDistributionBreakdowns : [],
        budget: Math.max(1, Number(project.budget || projectDetails.estimatedBudget || 1)),
        status: 'FINISHED',
        imdbRating: Number(project.imdbRating || project.rating || 0),
        productionPerformance: Number(project.projectQuality || project.imdbRating * 10 || 50),
        maxTheatricalWeeks: Math.max(1, Number(project.baseTheatricalWeeks || weeklyGross.length || 1)),
        baseTheatricalWeeks: project.baseTheatricalWeeks,
        theatricalExtensionWeeks: Math.max(0, Number(project.theatricalExtensionWeeks || 0)),
        theatricalExtensionHistory: Array.isArray(project.theatricalExtensionHistory) ? project.theatricalExtensionHistory : [],
        weeksInTheaters: weeklyGross.length,
        streaming: streamingOnly ? {
            platformId: project.streamingPlatform,
            weekOnPlatform: Math.max(1, weeklyViews.length),
            totalViews: Math.max(0, Number(project.totalViews || 0)),
            weeklyViews,
            isLeaving: true,
        } : undefined,
        streamingRevenue,
        weeklyStreamingBreakdowns: Array.isArray(project.weeklyStreamingBreakdowns) ? project.weeklyStreamingBreakdowns : [],
        soundtrackRevenue: Math.max(0, Number(project.soundtrackRevenue || 0)),
        weeklySoundtrackRevenue: Array.isArray(project.weeklySoundtrackRevenue) ? project.weeklySoundtrackRevenue.map(Number) : [],
        soundtrackRevenueBreakdown: project.soundtrackRevenueBreakdown,
        weeklySoundtrackBreakdowns: Array.isArray(project.weeklySoundtrackBreakdowns) ? project.weeklySoundtrackBreakdowns : [],
        investorPlan: project.investorPlan,
        investorPayouts: project.investorPayouts,
        audienceReception: project.audienceReception,
        releaseWeek: project.releaseWeek,
        releaseYear: project.releaseYear || project.year,
        releasedAtAbsoluteWeek: project.releasedAtAbsoluteWeek,
    };
};
