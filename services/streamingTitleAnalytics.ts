import type {
    OwnedStreamingSlateEntry,
    OwnedStreamingTitleWeekPerformance,
    Player,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getOwnedStreamingProgramEntries } from './streamingOriginals';

export type StreamingTitleDossierTab = 'OVERVIEW' | 'AUDIENCE' | 'ENGAGEMENT' | 'DISCOVERY' | 'FINANCIALS' | 'TECHNICAL' | 'FUTURE';
export type StreamingTitleReportStatus = 'AVAILABLE' | 'COLLECTING' | 'NOT_MEASURED';

export interface StreamingTitleReportState {
    tab: StreamingTitleDossierTab;
    status: StreamingTitleReportStatus;
    requiredWeeks: number;
    measuredWeeks: number;
    detail: string;
}

export interface StreamingTitleDossierSummary {
    entry: OwnedStreamingSlateEntry;
    measuredWeeks: number;
    firstMeasuredAbsoluteWeek: number | null;
    latestMeasuredAbsoluteWeek: number | null;
    totalViewingAccounts: number | null;
    totalHoursViewed: number | null;
    averageCompletionRate: number | null;
    averageRepeatViewingRate: number | null;
    averageSatisfactionScore: number | null;
    averagePlaybackSuccessRate: number | null;
    attributedSubscriptionRevenue: number | null;
    allocatedCashCost: number | null;
    allocatedContentAmortization: number | null;
    cashContribution: number | null;
    accountingContribution: number | null;
    discoveryMix: OwnedStreamingTitleWeekPerformance['discoveryMix'] | null;
    audienceTrend: Array<{ label: string; absoluteWeek: number; value: number }>;
    engagementTrend: Array<{ label: string; absoluteWeek: number; value: number; secondaryValue: number }>;
    technicalTrend: Array<{ label: string; absoluteWeek: number; value: number }>;
    momentum: 'RISING' | 'HOLDING' | 'COOLING' | 'UNKNOWN';
    futureOutlook: string | null;
    nextQuestion: string | null;
    reports: Record<StreamingTitleDossierTab, StreamingTitleReportState>;
}

export interface StreamingTitleAnalyticsCenter {
    titles: Array<{
        entry: OwnedStreamingSlateEntry;
        measuredWeeks: number;
        latestViewingAccounts: number | null;
        reportStatus: StreamingTitleReportStatus;
    }>;
    selected: StreamingTitleDossierSummary | null;
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
const weightedAverage = (
    records: OwnedStreamingTitleWeekPerformance[],
    getValue: (record: OwnedStreamingTitleWeekPerformance) => number,
): number | null => {
    if (!records.length) return null;
    const totalWeight = sum(records.map(record => Math.max(1, record.viewingAccounts)));
    return records.reduce((total, record) => total + getValue(record) * Math.max(1, record.viewingAccounts), 0) / totalWeight;
};

const reportRequirements: Record<StreamingTitleDossierTab, number> = {
    OVERVIEW: 1,
    AUDIENCE: 1,
    ENGAGEMENT: 2,
    DISCOVERY: 2,
    FINANCIALS: 4,
    TECHNICAL: 1,
    FUTURE: 4,
};

const reportCopy: Record<StreamingTitleDossierTab, string> = {
    OVERVIEW: 'The first measured title week unlocks the executive overview.',
    AUDIENCE: 'Audience reporting begins after one complete title week.',
    ENGAGEMENT: 'Two measured weeks are required to separate behavior from launch noise.',
    DISCOVERY: 'Two measured weeks are required before discovery mix is trustworthy.',
    FINANCIALS: 'Four measured weeks are required before attributed contribution is decision-grade.',
    TECHNICAL: 'Playback telemetry matures after one complete title week.',
    FUTURE: 'Four measured weeks are required before the platform forms an outlook.',
};

const getReportState = (
    tab: StreamingTitleDossierTab,
    measuredWeeks: number,
    hasAnyTitleTelemetry: boolean,
): StreamingTitleReportState => {
    const requiredWeeks = reportRequirements[tab];
    if (!hasAnyTitleTelemetry) return {
        tab,
        status: 'NOT_MEASURED',
        requiredWeeks,
        measuredWeeks: 0,
        detail: 'This title predates canonical title telemetry. Advance a live platform week to begin measurement.',
    };
    if (measuredWeeks < requiredWeeks) return {
        tab,
        status: 'COLLECTING',
        requiredWeeks,
        measuredWeeks,
        detail: `${reportCopy[tab]} ${requiredWeeks - measuredWeeks} more measured week${requiredWeeks - measuredWeeks === 1 ? '' : 's'} needed.`,
    };
    return {
        tab,
        status: 'AVAILABLE',
        requiredWeeks,
        measuredWeeks,
        detail: `${measuredWeeks} canonical title weeks support this report.`,
    };
};

export const getStreamingTitleAnalytics = (
    player: Player,
    selectedProjectId?: string | null,
): StreamingTitleAnalyticsCenter => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const entries = getOwnedStreamingProgramEntries(player);
    const records = platform.weeklyHistory.flatMap(snapshot => snapshot.operations?.titlePerformance || []);
    const byProject = new Map<string, OwnedStreamingTitleWeekPerformance[]>();
    records.forEach(record => {
        const current = byProject.get(record.projectId) || [];
        current.push(record);
        byProject.set(record.projectId, current);
    });
    byProject.forEach(projectRecords => projectRecords.sort((left, right) => left.absoluteWeek - right.absoluteWeek));
    const titles = entries.map(entry => {
        const projectRecords = byProject.get(entry.projectId) || [];
        return {
            entry,
            measuredWeeks: projectRecords.length,
            latestViewingAccounts: projectRecords.at(-1)?.viewingAccounts ?? null,
            reportStatus: (projectRecords.length ? 'AVAILABLE' : 'NOT_MEASURED') as StreamingTitleReportStatus,
        };
    });
    const selectedEntry = entries.find(entry => entry.projectId === selectedProjectId)
        || entries.find(entry => (byProject.get(entry.projectId) || []).length > 0)
        || entries[0]
        || null;
    if (!selectedEntry) return { titles, selected: null };
    const titleRecords = byProject.get(selectedEntry.projectId) || [];
    const measuredWeeks = titleRecords.length;
    const hasTitleTelemetry = titleRecords.length > 0;
    const discoveryMix = measuredWeeks ? {
        homepagePercent: weightedAverage(titleRecords, record => record.discoveryMix.homepagePercent) || 0,
        recommendationsPercent: weightedAverage(titleRecords, record => record.discoveryMix.recommendationsPercent) || 0,
        searchPercent: weightedAverage(titleRecords, record => record.discoveryMix.searchPercent) || 0,
        directPercent: weightedAverage(titleRecords, record => record.discoveryMix.directPercent) || 0,
    } : null;
    const latest = titleRecords.at(-1) || null;
    const previous = titleRecords.at(-2) || null;
    const momentum = !latest || !previous
        ? 'UNKNOWN'
        : latest.viewingAccounts > previous.viewingAccounts * 1.04
            ? 'RISING'
            : latest.viewingAccounts < previous.viewingAccounts * 0.92
                ? 'COOLING'
                : 'HOLDING';
    const completion = weightedAverage(titleRecords, record => record.completionRate);
    const satisfaction = weightedAverage(titleRecords, record => record.satisfactionScore);
    const futureOutlook = measuredWeeks < 4
        ? null
        : momentum === 'RISING'
            ? 'Audience momentum supports a larger future window, but renewal controls remain in the Originals phase.'
            : momentum === 'COOLING'
                ? 'The title is cooling. The next decision should weigh catalog value against another content-gap need.'
                : (completion || 0) >= 0.65 && (satisfaction || 0) >= 72
                    ? 'Stable depth and satisfaction suggest durable catalog value.'
                    : 'The title is holding without a clear expansion signal.';
    const nextQuestion = measuredWeeks < 4
        ? null
        : selectedEntry.source === 'ORIGINAL'
            ? 'Should the platform preserve this world for a later renewal or franchise decision?'
            : 'Does this window still justify its catalog cost when renewal becomes available?';

    return {
        titles,
        selected: {
            entry: selectedEntry,
            measuredWeeks,
            firstMeasuredAbsoluteWeek: titleRecords[0]?.absoluteWeek ?? null,
            latestMeasuredAbsoluteWeek: latest?.absoluteWeek ?? null,
            totalViewingAccounts: measuredWeeks ? sum(titleRecords.map(record => record.viewingAccounts)) : null,
            totalHoursViewed: measuredWeeks ? sum(titleRecords.map(record => record.hoursViewed)) : null,
            averageCompletionRate: completion,
            averageRepeatViewingRate: weightedAverage(titleRecords, record => record.repeatViewingRate),
            averageSatisfactionScore: satisfaction,
            averagePlaybackSuccessRate: weightedAverage(titleRecords, record => record.playbackSuccessRate),
            attributedSubscriptionRevenue: measuredWeeks ? sum(titleRecords.map(record => record.attributedSubscriptionRevenue)) : null,
            allocatedCashCost: measuredWeeks ? sum(titleRecords.map(record => record.allocatedCashCost)) : null,
            allocatedContentAmortization: measuredWeeks ? sum(titleRecords.map(record => record.allocatedContentAmortization)) : null,
            cashContribution: measuredWeeks ? sum(titleRecords.map(record => record.cashContribution)) : null,
            accountingContribution: measuredWeeks ? sum(titleRecords.map(record => record.accountingContribution)) : null,
            discoveryMix,
            audienceTrend: titleRecords.map(record => ({
                label: `W${record.programWeek}`,
                absoluteWeek: record.absoluteWeek,
                value: record.viewingAccounts,
            })),
            engagementTrend: titleRecords.map(record => ({
                label: `W${record.programWeek}`,
                absoluteWeek: record.absoluteWeek,
                value: record.completionRate * 100,
                secondaryValue: record.repeatViewingRate * 100,
            })),
            technicalTrend: titleRecords.map(record => ({
                label: `W${record.programWeek}`,
                absoluteWeek: record.absoluteWeek,
                value: record.playbackSuccessRate,
            })),
            momentum,
            futureOutlook,
            nextQuestion,
            reports: Object.fromEntries(
                (Object.keys(reportRequirements) as StreamingTitleDossierTab[])
                    .map(tab => [tab, getReportState(tab, measuredWeeks, hasTitleTelemetry)]),
            ) as Record<StreamingTitleDossierTab, StreamingTitleReportState>,
        },
    };
};
