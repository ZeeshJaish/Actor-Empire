import type {
    OwnedStreamingLaunchCommit,
    Player,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';

export type StreamingAftermathTone = 'POSITIVE' | 'WATCH' | 'CRITICAL' | 'PENDING';
export type StreamingAftermathReportStatus = 'AVAILABLE' | 'PENDING';

export interface StreamingAftermathSignal {
    id: 'SUBSCRIBERS' | 'PLAYBACK' | 'HEADROOM' | 'DEMAND';
    label: string;
    value: string;
    detail: string;
    tone: Exclude<StreamingAftermathTone, 'PENDING'>;
}

export interface StreamingAftermathReaction {
    id: 'AUDIENCE' | 'INDUSTRY' | 'OPERATIONS';
    source: string;
    headline: string;
    detail: string;
    tone: Exclude<StreamingAftermathTone, 'PENDING'>;
}

export interface StreamingAftermathReport {
    id: 'SUBSCRIBER_TREND' | 'CHURN' | 'ENGAGEMENT' | 'MARKET_SHARE' | 'TITLE_PERFORMANCE';
    label: string;
    status: StreamingAftermathReportStatus;
    value: string | null;
    detail: string;
}

export interface StreamingLaunchAftermath {
    available: boolean;
    weeksLive: number;
    programWeek: number;
    launchCommit: OwnedStreamingLaunchCommit | null;
    headline: string;
    story: string;
    outcomeLabel: string;
    signals: StreamingAftermathSignal[];
    reactions: StreamingAftermathReaction[];
    reports: StreamingAftermathReport[];
    pendingReportCount: number;
    nextReportLabel: string;
}

const formatCompact = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return Math.round(value).toLocaleString();
};

const formatPercent = (value: number, fractionDigits = 0): string => (
    `${value.toFixed(fractionDigits)}%`
);

const getOutcomeCopy = (
    commit: OwnedStreamingLaunchCommit,
    platformName: string,
): Pick<StreamingLaunchAftermath, 'headline' | 'story' | 'outcomeLabel'> => {
    const capacityChoice = commit.capacityPlan === 'CLOUD_BURST'
        ? 'Temporary cloud protection absorbed the opening wave.'
        : commit.capacityPlan === 'STAGGERED_PREMIERE'
            ? 'Timed access waves flattened the opening peak.'
            : 'The commissioned delivery stack carried the full opening wave.';
    if (commit.outcomeTier === 'SMOOTH_OPENING') return {
        headline: `${platformName} found its first audience.`,
        story: `${commit.initialSubscribers.toLocaleString()} founding subscribers joined around ${commit.openingOriginalTitle}. ${capacityChoice}`,
        outcomeLabel: 'Smooth opening',
    };
    if (commit.outcomeTier === 'DEGRADED_OPENING') return {
        headline: 'The audience arrived faster than the platform.',
        story: `${commit.initialSubscribers.toLocaleString()} founding subscribers joined, but ${formatPercent(commit.playbackSuccessRate, 2)} playback success exposed immediate technical pressure.`,
        outcomeLabel: 'Degraded opening',
    };
    return {
        headline: `${platformName} bent under pressure—and stayed live.`,
        story: `${commit.initialSubscribers.toLocaleString()} founding subscribers joined around ${commit.openingOriginalTitle}. ${capacityChoice}`,
        outcomeLabel: 'Pressured opening',
    };
};

export const getStreamingLaunchAftermath = (player: Player): StreamingLaunchAftermath => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const commit = platform.launchCommit;
    if (!commit || platform.lifecycle !== 'ACTIVE') {
        return {
            available: false,
            weeksLive: 0,
            programWeek: 0,
            launchCommit: null,
            headline: 'Launch aftermath unavailable',
            story: 'Commit the platform launch before opening audience and technical signals exist.',
            outcomeLabel: 'Pre-launch',
            signals: [],
            reactions: [],
            reports: [],
            pendingReportCount: 5,
            nextReportLabel: 'Begins after launch',
        };
    }

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const weeksLive = Math.max(1, absoluteWeek - commit.committedAtAbsoluteWeek + 1);
    const programWeek = Math.max(1, Math.min(12, weeksLive));
    const firstPostLaunchSnapshot = platform.weeklyHistory.find(
        snapshot => snapshot.absoluteWeek > commit.committedAtAbsoluteWeek,
    );
    const weeklyReportAvailable = Boolean(firstPostLaunchSnapshot);
    const outcome = getOutcomeCopy(commit, platform.identity?.name || 'EMPIRE+');
    const subscriberTone = commit.openingDemandIndex >= 68 ? 'POSITIVE' : commit.openingDemandIndex >= 48 ? 'WATCH' : 'CRITICAL';
    const playbackTone = commit.playbackSuccessRate >= 99 ? 'POSITIVE' : commit.playbackSuccessRate >= 97 ? 'WATCH' : 'CRITICAL';
    const headroomTone = commit.launchHeadroomPercent >= 10 ? 'POSITIVE' : commit.launchHeadroomPercent >= -10 ? 'WATCH' : 'CRITICAL';

    const signals: StreamingAftermathSignal[] = [
        {
            id: 'SUBSCRIBERS',
            label: 'Opening subscribers',
            value: formatCompact(commit.initialSubscribers),
            detail: 'Committed at launch; not a projected audience.',
            tone: subscriberTone,
        },
        {
            id: 'PLAYBACK',
            label: 'Playback success',
            value: formatPercent(commit.playbackSuccessRate, 2),
            detail: 'Immediate launch-night delivery result.',
            tone: playbackTone,
        },
        {
            id: 'HEADROOM',
            label: 'Peak headroom',
            value: `${commit.launchHeadroomPercent >= 0 ? '+' : ''}${commit.launchHeadroomPercent}%`,
            detail: `${formatCompact(commit.protectedPeakConcurrentStreams)} protected concurrent streams.`,
            tone: headroomTone,
        },
        {
            id: 'DEMAND',
            label: 'Opening demand',
            value: `${commit.openingDemandIndex}/100`,
            detail: 'Launch demand index—not market share.',
            tone: subscriberTone,
        },
    ];

    const reactions: StreamingAftermathReaction[] = [
        {
            id: 'AUDIENCE',
            source: 'Audience room',
            headline: `${commit.openingOriginalTitle} gave the service a clear opening identity.`,
            detail: `${commit.initialSubscribers.toLocaleString()} subscribers converted during the committed opening window.`,
            tone: subscriberTone,
        },
        {
            id: 'INDUSTRY',
            source: 'Industry desk',
            headline: commit.outcomeTier === 'SMOOTH_OPENING'
                ? 'A controlled debut earns attention.'
                : commit.outcomeTier === 'DEGRADED_OPENING'
                    ? 'Demand is real; execution is now the story.'
                    : 'A pressured debut still establishes a credible new player.',
            detail: 'Competitor response and market-share measurement begin in later simulation phases.',
            tone: commit.outcomeTier === 'SMOOTH_OPENING' ? 'POSITIVE' : commit.outcomeTier === 'DEGRADED_OPENING' ? 'CRITICAL' : 'WATCH',
        },
        {
            id: 'OPERATIONS',
            source: 'Network operations',
            headline: `${formatPercent(commit.playbackSuccessRate, 2)} of opening playback requests succeeded.`,
            detail: commit.launchHeadroomPercent >= 10
                ? 'The protected stack closed launch night with breathing room.'
                : 'Capacity pressure should remain the first technical priority.',
            tone: playbackTone === 'CRITICAL' || headroomTone === 'CRITICAL'
                ? 'CRITICAL'
                : playbackTone === 'WATCH' || headroomTone === 'WATCH'
                    ? 'WATCH'
                    : 'POSITIVE',
        },
    ];

    const reports: StreamingAftermathReport[] = [
        {
            id: 'SUBSCRIBER_TREND',
            label: 'Subscriber movement',
            status: weeklyReportAvailable ? 'AVAILABLE' : 'PENDING',
            value: weeklyReportAvailable ? firstPostLaunchSnapshot!.netSubscriberMovement.toLocaleString() : null,
            detail: weeklyReportAvailable ? 'First processed weekly movement.' : 'Opening total exists; week-over-week movement needs one processed game week.',
        },
        {
            id: 'CHURN',
            label: 'Churn rate',
            status: weeklyReportAvailable ? 'AVAILABLE' : 'PENDING',
            value: weeklyReportAvailable ? formatPercent(firstPostLaunchSnapshot!.churnRate * 100, 1) : null,
            detail: weeklyReportAvailable ? 'First measured weekly churn.' : 'No cohort has completed a full week yet.',
        },
        {
            id: 'ENGAGEMENT',
            label: 'Engagement',
            status: weeklyReportAvailable ? 'AVAILABLE' : 'PENDING',
            value: weeklyReportAvailable ? formatPercent(firstPostLaunchSnapshot!.engagementRate * 100, 1) : null,
            detail: weeklyReportAvailable ? 'First measured weekly engagement.' : 'Viewing-session behavior arrives with the weekly processor.',
        },
        {
            id: 'MARKET_SHARE',
            label: 'Market share',
            status: 'PENDING',
            value: null,
            detail: 'Requires the later competitive market simulation; it is not inferred from opening subscribers.',
        },
        {
            id: 'TITLE_PERFORMANCE',
            label: 'Title performance',
            status: 'PENDING',
            value: null,
            detail: 'Per-title views and completion are not fabricated from the slate.',
        },
    ];

    return {
        available: true,
        weeksLive,
        programWeek,
        launchCommit: commit,
        ...outcome,
        signals,
        reactions,
        reports,
        pendingReportCount: reports.filter(report => report.status === 'PENDING').length,
        nextReportLabel: weeklyReportAvailable ? 'First weekly report available' : 'First weekly report after the next processed week',
    };
};
