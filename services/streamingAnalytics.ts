import type {
    OwnedStreamingPlatformState,
    OwnedStreamingSlateEntry,
    OwnedStreamingWeeklySnapshot,
    PlatformId,
    Player,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getOwnedStreamingProgramEntries } from './streamingOriginals';

export type StreamingAnalyticsRange = 4 | 12 | 26 | 52;
export type StreamingAnalyticsTone = 'POSITIVE' | 'WATCH' | 'CRITICAL' | 'NEUTRAL';

export interface StreamingAnalyticsPoint {
    absoluteWeek: number;
    label: string;
    value: number;
    secondaryValue?: number;
    isForecast?: boolean;
}

export interface StreamingSubscriberWaterfall {
    startingSubscribers: number;
    joinedSubscribers: number;
    reactivations: number;
    cancellations: number;
    endingSubscribers: number;
    reconciled: boolean;
}

export interface StreamingRetentionCohort {
    id: string;
    label: string;
    enteredSubscribers: number;
    remainingSubscribers: number;
    retentionRate: number;
    ageWeeks: number;
    source: 'OPENING' | 'WEEKLY';
}

export interface StreamingAnalyticsIncident {
    id: string;
    absoluteWeek: number;
    severity: 'WATCH' | 'MAJOR';
    title: string;
    detail: string;
    metric: string;
}

export interface StreamingMarketShareEntry {
    id: PlatformId | 'PLAYER';
    name: string;
    subscribersMillions: number;
    sharePercent: number;
    isPlayer: boolean;
}

export interface StreamingContentGapCell {
    programWeek: number;
    label: string;
    status: 'PREMIERE' | 'SUPPORTED' | 'GAP';
    title: string | null;
    detail: string;
}

export interface StreamingCeoPulseSignal {
    id: 'AUDIENCE' | 'RETENTION' | 'FINANCE' | 'TECH' | 'CONTENT';
    label: string;
    value: string;
    conclusion: string;
    action: string;
    tone: StreamingAnalyticsTone;
}

export interface StreamingAnalyticsReconciliation {
    subscriberWaterfall: boolean;
    cashContribution: boolean;
    accountingContribution: boolean;
    snapshotLedgerCoverage: boolean;
    status: 'RECONCILED' | 'PARTIAL';
    detail: string;
}

export interface StreamingPlatformAnalytics {
    available: boolean;
    range: StreamingAnalyticsRange;
    availableWeeks: number;
    platform: OwnedStreamingPlatformState;
    ceoPulse: StreamingCeoPulseSignal[];
    subscriberTimeline: StreamingAnalyticsPoint[];
    churnTimeline: StreamingAnalyticsPoint[];
    engagementTimeline: StreamingAnalyticsPoint[];
    arpuTimeline: StreamingAnalyticsPoint[];
    cashRunwayTimeline: StreamingAnalyticsPoint[];
    revenueTimeline: StreamingAnalyticsPoint[];
    contributionTimeline: StreamingAnalyticsPoint[];
    capacityTimeline: StreamingAnalyticsPoint[];
    capacityForecast: StreamingAnalyticsPoint[];
    waterfall: StreamingSubscriberWaterfall | null;
    customerAccess: {
        paidAccounts: number;
        payingHouseholds: number;
        externalSharedHouseholds: number;
        sharedActiveViewers: number;
        piracyReach: number;
        accessLoadAccounts: number;
        monthlySubscriptionRevenue: number;
        planAllocations: NonNullable<OwnedStreamingWeeklySnapshot['operations']>['worldCustomerPlanAllocations'];
    } | null;
    planMovement: {
        upgrades: number;
        downgrades: number;
        switchIns: number;
        switchOuts: number;
    };
    viewing: {
        viewingAccounts: number;
        hoursViewed: number;
        unmetDemandAccounts: number;
        paidViewingAccounts: number;
        sharedViewingAccounts: number;
        piracyViewingAccounts: number;
        estimatedViewers: number;
        starts: number;
        advertisingRevenue: number;
        transactionRevenue: number;
        sponsorshipRevenue: number;
        incrementalRevenue: number;
    } | null;
    cohorts: StreamingRetentionCohort[];
    incidents: StreamingAnalyticsIncident[];
    marketShare: StreamingMarketShareEntry[];
    playerMarketSharePercent: number | null;
    contentGaps: StreamingContentGapCell[];
    totals: {
        revenue: number;
        productRevenue: number;
        incrementalRevenue: number;
        totalOperatingRevenue: number;
        cashCost: number;
        cashContribution: number;
        contentAmortization: number;
        accountingContribution: number;
        endingTreasury: number;
        weightedArpu: number | null;
        averageEngagementRate: number | null;
        averageChurnRate: number | null;
        averagePlaybackSuccessRate: number | null;
        peakCapacityUtilizationPercent: number | null;
    };
    reconciliation: StreamingAnalyticsReconciliation;
    unmeasured: Array<{ label: string; reason: string }>;
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
const average = (values: number[]): number | null => values.length ? sum(values) / values.length : null;
const round = (value: number, digits = 2): number => {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
};
const formatWeek = (snapshot: OwnedStreamingWeeklySnapshot, fallbackIndex: number): string => (
    `W${snapshot.operations?.programWeek || fallbackIndex + 1}`
);

const buildTimeline = (
    snapshots: OwnedStreamingWeeklySnapshot[],
    getValue: (snapshot: OwnedStreamingWeeklySnapshot) => number,
    getSecondaryValue?: (snapshot: OwnedStreamingWeeklySnapshot) => number,
): StreamingAnalyticsPoint[] => snapshots.map((snapshot, index) => ({
    absoluteWeek: snapshot.absoluteWeek,
    label: formatWeek(snapshot, index),
    value: getValue(snapshot),
    secondaryValue: getSecondaryValue?.(snapshot),
}));

interface MutableCohort {
    id: string;
    label: string;
    enteredSubscribers: number;
    remainingSubscribers: number;
    enteredAbsoluteWeek: number;
    source: StreamingRetentionCohort['source'];
}

const reduceCohorts = (
    platform: OwnedStreamingPlatformState,
    snapshots: OwnedStreamingWeeklySnapshot[],
    absoluteWeek: number,
): StreamingRetentionCohort[] => {
    if (!platform.launchCommit) return [];
    const cohorts: MutableCohort[] = [{
        id: 'opening-cohort',
        label: 'Opening members',
        enteredSubscribers: platform.launchCommit.initialSubscribers,
        remainingSubscribers: platform.launchCommit.initialSubscribers,
        enteredAbsoluteWeek: platform.launchCommit.committedAtAbsoluteWeek,
        source: 'OPENING',
    }];

    snapshots.forEach(snapshot => {
        const operations = snapshot.operations;
        if (!operations) return;
        const entrants = operations.joinedSubscribers + operations.reactivations;
        if (entrants > 0) {
            cohorts.push({
                id: `cohort:${snapshot.absoluteWeek}`,
                label: `Program W${operations.programWeek}`,
                enteredSubscribers: entrants,
                remainingSubscribers: entrants,
                enteredAbsoluteWeek: snapshot.absoluteWeek,
                source: 'WEEKLY',
            });
        }
        const availableBeforeCancellation = sum(cohorts.map(cohort => cohort.remainingSubscribers));
        const targetRemaining = Math.max(0, snapshot.subscribers);
        const removal = Math.max(0, availableBeforeCancellation - targetRemaining);
        if (removal <= 0 || availableBeforeCancellation <= 0) return;

        let assignedRemoval = 0;
        const allocations = cohorts.map(cohort => {
            const exact = removal * cohort.remainingSubscribers / availableBeforeCancellation;
            const whole = Math.min(cohort.remainingSubscribers, Math.floor(exact));
            assignedRemoval += whole;
            return { cohort, whole, fraction: exact - whole };
        });
        let remainder = Math.max(0, removal - assignedRemoval);
        allocations
            .sort((left, right) => right.fraction - left.fraction || right.cohort.remainingSubscribers - left.cohort.remainingSubscribers)
            .forEach(allocation => {
                if (remainder <= 0 || allocation.whole >= allocation.cohort.remainingSubscribers) return;
                allocation.whole += 1;
                remainder -= 1;
            });
        allocations.forEach(({ cohort, whole }) => {
            cohort.remainingSubscribers = Math.max(0, cohort.remainingSubscribers - whole);
        });
    });

    const visible = cohorts.length <= 8
        ? cohorts
        : [
            {
                id: 'older-cohorts',
                label: 'Earlier cohorts',
                enteredSubscribers: sum(cohorts.slice(0, -7).map(cohort => cohort.enteredSubscribers)),
                remainingSubscribers: sum(cohorts.slice(0, -7).map(cohort => cohort.remainingSubscribers)),
                enteredAbsoluteWeek: Math.min(...cohorts.slice(0, -7).map(cohort => cohort.enteredAbsoluteWeek)),
                source: 'OPENING' as const,
            },
            ...cohorts.slice(-7),
        ];
    return visible.map(cohort => ({
        id: cohort.id,
        label: cohort.label,
        enteredSubscribers: cohort.enteredSubscribers,
        remainingSubscribers: cohort.remainingSubscribers,
        retentionRate: cohort.enteredSubscribers > 0
            ? round(cohort.remainingSubscribers / cohort.enteredSubscribers * 100)
            : 0,
        ageWeeks: Math.max(0, absoluteWeek - cohort.enteredAbsoluteWeek),
        source: cohort.source,
    }));
};

const buildIncidents = (
    platform: OwnedStreamingPlatformState,
    snapshots: OwnedStreamingWeeklySnapshot[],
): StreamingAnalyticsIncident[] => {
    const incidents: StreamingAnalyticsIncident[] = [];
    if (platform.launchCommit?.outcomeTier === 'DEGRADED_OPENING') {
        incidents.push({
            id: 'launch-degradation',
            absoluteWeek: platform.launchCommit.committedAtAbsoluteWeek,
            severity: 'MAJOR',
            title: 'Launch delivery degraded',
            detail: `${platform.launchCommit.playbackSuccessRate.toFixed(2)}% of opening playback requests succeeded.`,
            metric: `${platform.launchCommit.launchHeadroomPercent}% headroom`,
        });
    }
    snapshots.forEach(snapshot => {
        const operations = snapshot.operations;
        if (!operations) return;
        if (operations.capacityUtilizationPercent >= 100 || operations.playbackSuccessRate < 98.5) {
            incidents.push({
                id: `delivery:${snapshot.absoluteWeek}`,
                absoluteWeek: snapshot.absoluteWeek,
                severity: 'MAJOR',
                title: operations.capacityUtilizationPercent >= 100 ? 'Burst capacity exceeded' : 'Playback reliability fell',
                detail: operations.headline,
                metric: `${operations.playbackSuccessRate.toFixed(2)}% playback • ${operations.capacityUtilizationPercent.toFixed(0)}% load`,
            });
        } else if (operations.capacityUtilizationPercent >= 90 || operations.playbackSuccessRate < 99) {
            incidents.push({
                id: `pressure:${snapshot.absoluteWeek}`,
                absoluteWeek: snapshot.absoluteWeek,
                severity: 'WATCH',
                title: 'Delivery pressure event',
                detail: operations.summary,
                metric: `${operations.playbackSuccessRate.toFixed(2)}% playback • ${operations.capacityUtilizationPercent.toFixed(0)}% load`,
            });
        }
    });
    return incidents.sort((left, right) => right.absoluteWeek - left.absoluteWeek).slice(0, 12);
};

const buildMarketShare = (
    player: Player,
    platform: OwnedStreamingPlatformState,
): StreamingMarketShareEntry[] => {
    if (!platform.weeklyHistory.length && !platform.launchCommit) return [];
    const canonicalSnapshot = platform.competitiveWorld.marketShareHistory.at(-1);
    if (canonicalSnapshot) {
        return canonicalSnapshot.entries.map(entry => ({
            ...entry,
            isPlayer: entry.id === 'PLAYER',
        }));
    }
    const playerSubscribersMillions = platform.metrics.subscribers / 1_000_000;
    const entries: Array<Omit<StreamingMarketShareEntry, 'sharePercent'>> = [
        {
            id: 'PLAYER',
            name: platform.identity?.name || 'EMPIRE+',
            subscribersMillions: playerSubscribersMillions,
            isPlayer: true,
        },
        ...Object.values(player.world.platforms || {}).map(rival => ({
            id: rival.id,
            name: rival.name,
            subscribersMillions: Math.max(0, rival.subscribers),
            isPlayer: false,
        })),
    ];
    const total = Math.max(0.0001, sum(entries.map(entry => entry.subscribersMillions)));
    return entries
        .map(entry => ({
            ...entry,
            sharePercent: round(entry.subscribersMillions / total * 100),
        }))
        .sort((left, right) => right.sharePercent - left.sharePercent);
};

const buildContentGaps = (
    entries: OwnedStreamingSlateEntry[],
    currentProgramWeek: number,
): StreamingContentGapCell[] => {
    return Array.from({ length: 12 }, (_, index) => {
        const programWeek = currentProgramWeek + index;
        const premieres = entries.filter(entry => entry.launchWeek === programWeek);
        const supported = entries.some(entry => (
            entry.releasePattern === 'WEEKLY'
            && entry.launchWeek < programWeek
            && programWeek - entry.launchWeek <= 6
        ));
        if (premieres.length) return {
            programWeek,
            label: `W${programWeek}`,
            status: 'PREMIERE' as const,
            title: premieres.map(entry => entry.title).join(' + '),
            detail: `${premieres.length} scheduled release${premieres.length === 1 ? '' : 's'} supports discovery.`,
        };
        if (supported) return {
            programWeek,
            label: `W${programWeek}`,
            status: 'SUPPORTED' as const,
            title: null,
            detail: 'An active weekly release continues to provide a next-watch beat.',
        };
        return {
            programWeek,
            label: `W${programWeek}`,
            status: 'GAP' as const,
            title: null,
            detail: 'No premiere or active weekly episode is programmed for this window.',
        };
    });
};

const buildCapacityForecast = (
    platform: OwnedStreamingPlatformState,
    snapshots: OwnedStreamingWeeklySnapshot[],
    contentGaps: StreamingContentGapCell[],
): StreamingAnalyticsPoint[] => {
    const recentPeaks = snapshots.slice(-4).map(snapshot => snapshot.operations?.peakConcurrentStreams || 0);
    const lastPeak = recentPeaks.at(-1) || platform.launchCommit?.forecastLikelyConcurrentStreams || 0;
    const trend = recentPeaks.length >= 2
        ? (recentPeaks.at(-1)! - recentPeaks[0]) / Math.max(1, recentPeaks.length - 1)
        : 0;
    const currentAbsoluteWeek = snapshots.at(-1)?.absoluteWeek || platform.launchCommit?.committedAtAbsoluteWeek || 0;
    return contentGaps.slice(0, 4).map((cell, index) => {
        const programmingMultiplier = cell.status === 'PREMIERE' ? 1.18 : cell.status === 'SUPPORTED' ? 1.06 : 0.96;
        return {
            absoluteWeek: currentAbsoluteWeek + index + 1,
            label: cell.label,
            value: Math.max(0, Math.round((lastPeak + trend * (index + 1)) * programmingMultiplier)),
            secondaryValue: platform.capacity.burstConcurrentStreams,
            isForecast: true,
        };
    });
};

const buildCeoPulse = (
    waterfall: StreamingSubscriberWaterfall | null,
    totals: StreamingPlatformAnalytics['totals'],
    incidents: StreamingAnalyticsIncident[],
    contentGaps: StreamingContentGapCell[],
): StreamingCeoPulseSignal[] => {
    const movement = waterfall ? waterfall.endingSubscribers - waterfall.startingSubscribers : 0;
    const gapCount = contentGaps.slice(0, 4).filter(cell => cell.status === 'GAP').length;
    const majorIncidents = incidents.filter(incident => incident.severity === 'MAJOR').length;
    return [
        {
            id: 'AUDIENCE',
            label: 'Audience direction',
            value: waterfall ? `${movement >= 0 ? '+' : ''}${movement.toLocaleString()}` : 'PENDING',
            conclusion: !waterfall
                ? 'The first complete operating week has not closed.'
                : movement >= 0 ? 'Acquisition is staying ahead of exits.' : 'The audience contracted across this window.',
            action: movement >= 0 ? 'Protect the acquisition curve.' : 'Prioritize retention before another growth push.',
            tone: !waterfall ? 'NEUTRAL' : movement >= 0 ? 'POSITIVE' : 'CRITICAL',
        },
        {
            id: 'RETENTION',
            label: 'Retention pressure',
            value: totals.averageChurnRate === null ? 'PENDING' : `${(totals.averageChurnRate * 100).toFixed(1)}%`,
            conclusion: totals.averageChurnRate === null
                ? 'Churn matures after the weekly audience waterfall.'
                : totals.averageChurnRate <= 0.02 ? 'Weekly churn is controlled.' : 'Cancellation pressure is above the healthy operating lane.',
            action: totals.averageChurnRate !== null && totals.averageChurnRate > 0.02
                ? 'Strengthen next-watch programming.'
                : 'Maintain the current retention promise.',
            tone: totals.averageChurnRate === null ? 'NEUTRAL' : totals.averageChurnRate <= 0.02 ? 'POSITIVE' : 'WATCH',
        },
        {
            id: 'FINANCE',
            label: 'Platform contribution',
            value: totals.cashContribution >= 0 ? `+$${totals.cashContribution.toLocaleString()}` : `−$${Math.abs(totals.cashContribution).toLocaleString()}`,
            conclusion: totals.cashContribution >= 0 ? 'Operations added treasury cash.' : 'This window consumed treasury cash.',
            action: totals.cashContribution >= 0 ? 'Fund the next constraint deliberately.' : 'Repair unit economics before accelerating spend.',
            tone: totals.cashContribution >= 0 ? 'POSITIVE' : 'CRITICAL',
        },
        {
            id: 'TECH',
            label: 'Delivery health',
            value: totals.averagePlaybackSuccessRate === null ? 'PENDING' : `${totals.averagePlaybackSuccessRate.toFixed(2)}%`,
            conclusion: majorIncidents
                ? `${majorIncidents} major delivery event${majorIncidents === 1 ? ' remains' : 's remain'} in the incident record.`
                : 'No major delivery failure exists in this window.',
            action: majorIncidents ? 'Create headroom before the next demand beat.' : 'Keep monitoring peak-load direction.',
            tone: totals.averagePlaybackSuccessRate === null ? 'NEUTRAL' : majorIncidents ? 'CRITICAL' : 'POSITIVE',
        },
        {
            id: 'CONTENT',
            label: 'Four-week runway',
            value: `${gapCount} gap${gapCount === 1 ? '' : 's'}`,
            conclusion: gapCount ? 'The near-term slate contains an unsupported week.' : 'Every near-term week has a programming support signal.',
            action: gapCount ? 'Program the earliest red window.' : 'Preserve release spacing and marketing focus.',
            tone: gapCount ? 'WATCH' : 'POSITIVE',
        },
    ];
};

export const getStreamingPlatformAnalytics = (
    player: Player,
    range: StreamingAnalyticsRange = 12,
): StreamingPlatformAnalytics => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const snapshots = platform.weeklyHistory.slice(-range);
    const operations = snapshots
        .map(snapshot => snapshot.operations)
        .filter(Boolean) as NonNullable<OwnedStreamingWeeklySnapshot['operations']>[];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const firstSnapshot = snapshots[0] || null;
    const lastSnapshot = snapshots.at(-1) || null;
    const startingSubscribers = firstSnapshot
        ? Math.max(0, firstSnapshot.subscribers - firstSnapshot.netSubscriberMovement)
        : platform.launchCommit?.initialSubscribers || 0;
    const joinedSubscribers = sum(operations.map(item => item.joinedSubscribers));
    const reactivations = sum(operations.map(item => item.reactivations));
    const cancellations = sum(operations.map(item => item.cancellations));
    const endingSubscribers = lastSnapshot?.subscribers ?? platform.launchCommit?.initialSubscribers ?? 0;
    const waterfall = snapshots.length ? {
        startingSubscribers,
        joinedSubscribers,
        reactivations,
        cancellations,
        endingSubscribers,
        reconciled: startingSubscribers + joinedSubscribers + reactivations - cancellations === endingSubscribers,
    } : null;
    const latestCustomerOperations = [...operations].reverse().find(item => (
        item.worldCustomerEndingPaidAccounts !== undefined
    ));
    const customerAccess = latestCustomerOperations ? {
        paidAccounts: latestCustomerOperations.worldCustomerEndingPaidAccounts || 0,
        payingHouseholds: latestCustomerOperations.worldCustomerPayingHouseholds || 0,
        externalSharedHouseholds: latestCustomerOperations.worldCustomerExternalSharedHouseholds || 0,
        sharedActiveViewers: latestCustomerOperations.worldCustomerSharedActiveViewers || 0,
        piracyReach: latestCustomerOperations.worldCustomerPiracyReach || 0,
        accessLoadAccounts: latestCustomerOperations.worldCustomerAccessLoadAccounts || 0,
        monthlySubscriptionRevenue: latestCustomerOperations.worldCustomerMonthlySubscriptionRevenue || 0,
        planAllocations: latestCustomerOperations.worldCustomerPlanAllocations?.map(row => ({ ...row })) || [],
    } : null;
    const planMovement = {
        upgrades: sum(operations.map(item => item.worldCustomerUpgrades || 0)),
        downgrades: sum(operations.map(item => item.worldCustomerDowngrades || 0)),
        switchIns: sum(operations.map(item => item.worldCustomerSwitchIns || 0)),
        switchOuts: sum(operations.map(item => item.worldCustomerSwitchOuts || 0)),
    };
    const viewingOperations = operations.filter(item => item.worldViewingAccounts !== undefined);
    const viewingTitleRecords = viewingOperations.flatMap(item => item.titlePerformance || []);
    const viewing = viewingOperations.length ? {
        viewingAccounts: sum(viewingOperations.map(item => item.worldViewingAccounts || 0)),
        hoursViewed: sum(viewingOperations.map(item => item.worldViewingHours || 0)),
        unmetDemandAccounts: sum(viewingOperations.map(item => item.worldViewingUnmetDemandAccounts || 0)),
        paidViewingAccounts: sum(viewingTitleRecords.map(item => item.paidViewingAccounts || 0)),
        sharedViewingAccounts: sum(viewingTitleRecords.map(item => item.sharedViewingAccounts || 0)),
        piracyViewingAccounts: sum(viewingTitleRecords.map(item => item.piracyViewingAccounts || 0)),
        estimatedViewers: sum(viewingTitleRecords.map(item => item.estimatedViewers || 0)),
        starts: sum(viewingTitleRecords.map(item => item.starts || 0)),
        advertisingRevenue: sum(viewingOperations.map(item => item.worldViewingAdvertisingRevenue || 0)),
        transactionRevenue: sum(viewingOperations.map(item => item.worldViewingTransactionRevenue || 0)),
        sponsorshipRevenue: sum(viewingOperations.map(item => item.worldViewingSponsorshipRevenue || 0)),
        incrementalRevenue: sum(viewingOperations.map(item => item.worldViewingIncrementalRevenue || 0)),
    } : null;
    const revenue = sum(operations.map(item => item.subscriptionRevenue));
    const productRevenue = sum(operations.map(item => item.productRevenue || 0));
    const incrementalRevenue = viewing?.incrementalRevenue || 0;
    const totalOperatingRevenue = revenue + productRevenue + incrementalRevenue;
    const cashCost = sum(operations.map(item => item.totalCashCost));
    const cashContribution = sum(operations.map(item => item.netCashContribution));
    const contentAmortization = sum(operations.map(item => item.contentAmortization));
    const accountingContribution = sum(operations.map(item => item.accountingContribution));
    const totals: StreamingPlatformAnalytics['totals'] = {
        revenue,
        productRevenue,
        incrementalRevenue,
        totalOperatingRevenue,
        cashCost,
        cashContribution,
        contentAmortization,
        accountingContribution,
        endingTreasury: platform.treasuryCash,
        weightedArpu: average(snapshots.map(snapshot => snapshot.averageRevenuePerUser)),
        averageEngagementRate: average(snapshots.map(snapshot => snapshot.engagementRate)),
        averageChurnRate: average(snapshots.map(snapshot => snapshot.churnRate)),
        averagePlaybackSuccessRate: average(operations.map(item => item.playbackSuccessRate)),
        peakCapacityUtilizationPercent: operations.length
            ? Math.max(...operations.map(item => item.capacityUtilizationPercent))
            : null,
    };
    const currentProgramWeek = lastSnapshot?.operations?.programWeek
        || Math.max(1, absoluteWeek - (platform.launchCommit?.committedAtAbsoluteWeek ?? absoluteWeek) + 1);
    const contentGaps = buildContentGaps(getOwnedStreamingProgramEntries(player), currentProgramWeek + 1);
    const incidents = buildIncidents(platform, snapshots);
    const marketShare = buildMarketShare(player, platform);
    const metricsLedgerWeeks = new Set(platform.eventLedger
        .filter(entry => entry.type === 'METRICS_COMMITTED')
        .map(entry => entry.absoluteWeek));
    const snapshotLedgerCoverage = snapshots.every(snapshot => metricsLedgerWeeks.has(snapshot.absoluteWeek));
    const reconciliation: StreamingAnalyticsReconciliation = {
        subscriberWaterfall: waterfall?.reconciled ?? true,
        cashContribution: totalOperatingRevenue - cashCost === cashContribution,
        accountingContribution: cashContribution - contentAmortization === accountingContribution,
        snapshotLedgerCoverage,
        status: (
            (waterfall?.reconciled ?? true)
            && totalOperatingRevenue - cashCost === cashContribution
            && cashContribution - contentAmortization === accountingContribution
            && snapshotLedgerCoverage
        ) ? 'RECONCILED' : 'PARTIAL',
        detail: snapshotLedgerCoverage
            ? `${snapshots.length} weekly result${snapshots.length === 1 ? '' : 's'} matched committed metric facts.`
            : 'Some migrated weekly snapshots predate metric-ledger coverage; their visible totals still reconcile internally.',
    };

    return {
        available: Boolean(platform.launchCommit),
        range,
        availableWeeks: snapshots.length,
        platform,
        ceoPulse: buildCeoPulse(waterfall, totals, incidents, contentGaps),
        subscriberTimeline: buildTimeline(snapshots, snapshot => snapshot.subscribers),
        churnTimeline: buildTimeline(snapshots, snapshot => snapshot.churnRate * 100),
        engagementTimeline: buildTimeline(snapshots, snapshot => snapshot.engagementRate * 100),
        arpuTimeline: buildTimeline(snapshots, snapshot => snapshot.averageRevenuePerUser),
        cashRunwayTimeline: buildTimeline(snapshots, snapshot => snapshot.cashRunwayWeeks),
        revenueTimeline: buildTimeline(snapshots, snapshot => snapshot.operations?.subscriptionRevenue || 0),
        contributionTimeline: buildTimeline(
            snapshots,
            snapshot => snapshot.operations?.netCashContribution || 0,
            snapshot => snapshot.operations?.accountingContribution || 0,
        ),
        capacityTimeline: buildTimeline(
            snapshots,
            snapshot => snapshot.operations?.peakConcurrentStreams || 0,
            () => platform.capacity.burstConcurrentStreams,
        ),
        capacityForecast: buildCapacityForecast(platform, snapshots, contentGaps),
        waterfall,
        customerAccess,
        planMovement,
        viewing,
        cohorts: reduceCohorts(platform, platform.weeklyHistory, absoluteWeek),
        incidents,
        marketShare,
        playerMarketSharePercent: marketShare.find(entry => entry.isPlayer)?.sharePercent ?? null,
        contentGaps,
        totals,
        reconciliation,
        unmeasured: [
            {
                label: 'Tier and regional churn',
                reason: 'Member-level tier and territory cohorts are not yet canonical. Aggregate churn remains available.',
            },
            ...(!viewing ? [{
                label: 'Cost per viewing hour',
                reason: 'Advance a live WE6 platform week to begin canonical watch-hour measurement.',
            }, {
                label: 'Recommendation share',
                reason: 'Advance a live WE6 platform week before title-level recommendation discovery is treated as measured.',
            }] : []),
        ],
    };
};
