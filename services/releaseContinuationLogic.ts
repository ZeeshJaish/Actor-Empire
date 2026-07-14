import type { ActiveRelease } from '../types';

const clampWeek = (value: number, fallback: number) => {
    const safe = Math.round(Number(value));
    return Number.isFinite(safe) && safe > 0 ? safe : fallback;
};

export const getContinuationDecisionWeek = (release: ActiveRelease): number => {
    const savedWeek = clampWeek(release.sequelDecisionWeek || 0, release.type === 'SERIES' ? 7 : 5);
    return release.type === 'SERIES'
        ? Math.max(6, savedWeek)
        : Math.max(4, savedWeek);
};

export const getContinuationProgressWeek = (release: ActiveRelease): number => {
    if (release.streaming) {
        const completedStreamingWeeks = Array.isArray(release.streaming.weeklyViews)
            ? release.streaming.weeklyViews.length
            : Math.max(0, Math.round(Number(release.streaming.weekOnPlatform || 1)) - 1);
        if (release.type === 'SERIES' || release.distributionPhase === 'STREAMING') {
            return completedStreamingWeeks;
        }
    }

    return clampWeek(release.weekNum, 1);
};

export const getContinuationPerformanceGross = (release: ActiveRelease): number => {
    const theatricalGross = Math.max(0, Math.round(Number(release.totalGross) || 0));
    const streamingRevenue = Math.max(0, Math.round(Number(release.streamingRevenue) || 0));
    const soundtrackRevenue = Math.max(0, Math.round(Number(release.soundtrackRevenue) || 0));
    return theatricalGross + streamingRevenue + soundtrackRevenue;
};

export const shouldResolveContinuationDecision = (release: ActiveRelease): boolean => {
    if (release.sequelDecisionMade) return false;

    const progressWeek = getContinuationProgressWeek(release);
    const decisionWeek = getContinuationDecisionWeek(release);

    if (release.type === 'SERIES') {
        return progressWeek >= decisionWeek || Boolean(release.streaming?.isLeaving) || release.status === 'FINISHED';
    }

    if (release.distributionPhase === 'THEATRICAL') {
        return false;
    }

    if (release.distributionPhase === 'STREAMING_BIDDING') {
        return true;
    }

    if (release.distributionPhase === 'STREAMING') {
        return progressWeek >= decisionWeek || Boolean(release.streaming?.isLeaving) || release.status === 'FINISHED';
    }

    return progressWeek >= decisionWeek || release.status === 'FINISHED';
};
