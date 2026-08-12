import type {
    OwnedStreamingCycleReview,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingWeeklySnapshot,
    PlatformId,
    PlatformState,
    Player,
    StreamingCyclePerformanceTier,
    StreamingStrategicIdentity,
    StreamingTechnicalVerdict,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
} from './ownedStreamingPlatform';

const roundRate = (value: number): number => Math.round(value * 10_000) / 10_000;
const roundPercent = (value: number): number => Math.round(value * 100) / 100;
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
const average = (values: number[]): number => values.length ? sum(values) / values.length : 0;

export const STREAMING_STRATEGIC_IDENTITY_LABELS: Record<StreamingStrategicIdentity, string> = {
    AUDIENCE_HUNTER: 'Audience Hunter',
    RETENTION_HOUSE: 'Retention House',
    RELIABLE_OPERATOR: 'Reliable Operator',
    EVENT_DESTINATION: 'Event Destination',
    CASH_COMPOUNDER: 'Cash Compounder',
    BALANCED_SERVICE: 'Balanced Service',
    FRAGILE_MOMENTUM: 'Fragile Momentum',
};

export const STREAMING_PERFORMANCE_TIER_LABELS: Record<StreamingCyclePerformanceTier, string> = {
    BREAKOUT: 'Breakout cycle',
    GROWING: 'Growth cycle',
    STEADY: 'Steady cycle',
    UNDER_PRESSURE: 'Under pressure',
};

const selectRivalMovement = (
    platform: OwnedStreamingPlatformState,
    platforms: Record<PlatformId, PlatformState> | undefined,
    cycleNumber: number,
): OwnedStreamingCycleReview['rivalMovement'] => {
    const fallback: OwnedStreamingCycleReview['rivalMovement'] = {
        platformId: 'NETFLIX',
        platformName: 'Netflix',
        pressure: 'MEDIUM',
        signal: 'A major rival is maintaining a broad release posture. This is a market signal, not a simulated attack.',
    };
    const move = platform.competitiveWorld.moves.at(-1);
    if (move) {
        return {
            platformId: move.platformId,
            platformName: move.platformName,
            pressure: move.status === 'OPEN' || move.status === 'ACCEPTED_PRESSURE'
                ? 'HIGH'
                : move.status === 'MISFIRED'
                    ? 'LOW'
                    : 'MEDIUM',
            signal: `${move.ceoName} committed $${move.cashCostMillions.toFixed(0)}M to ${move.title.toLowerCase()}. This funded market signal is part of the competitive simulation. ${move.outcomeNote}`,
        };
    }
    const rivals = Object.values(platforms || {})
        .filter(platform => platform && platform.name)
        .sort((left, right) => (
            right.recentHits - left.recentHits
            || right.reputation - left.reputation
            || right.subscribers - left.subscribers
            || left.id.localeCompare(right.id)
        ));
    if (!rivals.length) return fallback;
    const rival = rivals[(Math.max(1, cycleNumber) - 1) % rivals.length];
    const pressure = rival.recentHits >= 4 || rival.reputation >= 88
        ? 'HIGH'
        : rival.recentHits >= 2 || rival.reputation >= 72
            ? 'MEDIUM'
            : 'LOW';
    const posture = rival.recentHits >= 4
        ? 'is carrying visible hit momentum into the next programming window'
        : rival.reputation >= 82
            ? 'is leaning on brand trust while the market watches its next slate'
            : rival.subscribers >= 150
                ? 'still has reach, but needs fresh programming to turn scale into heat'
                : 'is searching for a sharper audience position';
    return {
        platformId: rival.id,
        platformName: rival.name,
        pressure,
        signal: `${rival.name} ${posture}. This is a market signal, not a simulated hostile move.`,
    };
};

const getStrategicIdentity = (
    window: OwnedStreamingWeeklySnapshot[],
    totalCashContribution: number,
    averagePlaybackSuccessRate: number,
): StreamingStrategicIdentity => {
    const markerCount = (marker: string) => window.filter(snapshot => snapshot.causeMarkers.includes(marker)).length;
    const negativeWeeks = window.filter(snapshot => snapshot.netSubscriberMovement < 0).length;
    const pressuredWeeks = window.filter(snapshot => (
        (snapshot.operations?.capacityUtilizationPercent || 0) >= 95
        || (snapshot.operations?.playbackSuccessRate || 100) < 98.5
    )).length;
    const releaseWeeks = window.filter(snapshot => (snapshot.operations?.releaseTitles.length || 0) > 0).length;
    if (negativeWeeks >= Math.ceil(window.length / 2) || pressuredWeeks >= Math.ceil(window.length / 2)) {
        return 'FRAGILE_MOMENTUM';
    }
    if (markerCount('PLAN_AUDIENCE_PUSH') >= Math.ceil(window.length / 3)) return 'AUDIENCE_HUNTER';
    if (markerCount('PLAN_RETENTION_SPOTLIGHT') >= Math.ceil(window.length / 3)) return 'RETENTION_HOUSE';
    if (markerCount('PLAN_RELIABILITY_GUARD') >= Math.ceil(window.length / 3) || averagePlaybackSuccessRate >= 99.75) {
        return 'RELIABLE_OPERATOR';
    }
    if (releaseWeeks >= Math.ceil(window.length / 3)) return 'EVENT_DESTINATION';
    if (totalCashContribution > 0 && window.every(snapshot => (snapshot.operations?.netCashContribution || 0) >= 0)) {
        return 'CASH_COMPOUNDER';
    }
    return 'BALANCED_SERVICE';
};

const getTechnicalVerdict = (
    averagePlaybackSuccessRate: number,
    peakCapacityUtilizationPercent: number,
): StreamingTechnicalVerdict => {
    if (averagePlaybackSuccessRate >= 99.7 && peakCapacityUtilizationPercent < 82) return 'RESILIENT';
    if (averagePlaybackSuccessRate >= 99 && peakCapacityUtilizationPercent < 95) return 'HEALTHY';
    if (averagePlaybackSuccessRate >= 98 && peakCapacityUtilizationPercent < 110) return 'WATCH_LOAD';
    return 'AT_RISK';
};

const getPerformanceTier = (
    subscriberStart: number,
    subscriberNetMovement: number,
    averagePlaybackSuccessRate: number,
    totalCashContribution: number,
): StreamingCyclePerformanceTier => {
    const growthRate = subscriberNetMovement / Math.max(1, subscriberStart);
    if (growthRate >= 0.08 && averagePlaybackSuccessRate >= 99 && totalCashContribution > 0) return 'BREAKOUT';
    if (growthRate >= 0.015 && averagePlaybackSuccessRate >= 98.5) return 'GROWING';
    if (growthRate < 0 || averagePlaybackSuccessRate < 98 || totalCashContribution < 0) return 'UNDER_PRESSURE';
    return 'STEADY';
};

const buildCycleReview = (
    platform: OwnedStreamingPlatformState,
    player: Player,
    window: OwnedStreamingWeeklySnapshot[],
    kind: OwnedStreamingCycleReview['kind'],
    cycleNumber: number,
): OwnedStreamingCycleReview => {
    const first = window[0];
    const last = window[window.length - 1];
    const operations = window.map(snapshot => snapshot.operations).filter(Boolean) as NonNullable<OwnedStreamingWeeklySnapshot['operations']>[];
    const subscriberStart = Math.max(0, first.subscribers - first.netSubscriberMovement);
    const subscriberEnd = last.subscribers;
    const subscriberNetMovement = subscriberEnd - subscriberStart;
    const averagePlaybackSuccessRate = roundPercent(average(operations.map(item => item.playbackSuccessRate)));
    const peakCapacityUtilizationPercent = roundPercent(Math.max(0, ...operations.map(item => item.capacityUtilizationPercent)));
    const totalSubscriptionRevenue = Math.round(sum(operations.map(item => item.subscriptionRevenue)));
    const totalCashContribution = Math.round(sum(operations.map(item => item.netCashContribution)));
    const totalAccountingContribution = Math.round(sum(operations.map(item => item.accountingContribution)));
    const strategicIdentity = getStrategicIdentity(window, totalCashContribution, averagePlaybackSuccessRate);
    const technicalVerdict = getTechnicalVerdict(averagePlaybackSuccessRate, peakCapacityUtilizationPercent);
    const performanceTier = getPerformanceTier(
        subscriberStart,
        subscriberNetMovement,
        averagePlaybackSuccessRate,
        totalCashContribution,
    );
    const strongestWeek = [...window].sort((left, right) => right.netSubscriberMovement - left.netSubscriberMovement)[0];
    const weakestWeek = [...window].sort((left, right) => left.netSubscriberMovement - right.netSubscriberMovement)[0];
    const strongestTitle = strongestWeek.operations?.releaseTitles[0];
    const releaseCount = operations.filter(item => item.releaseTitles.length > 0).length;
    const positiveCashWeeks = operations.filter(item => item.netCashContribution >= 0).length;
    const hits = [
        strongestTitle
            ? `${strongestTitle} anchored the strongest audience week at ${strongestWeek.netSubscriberMovement >= 0 ? '+' : ''}${strongestWeek.netSubscriberMovement.toLocaleString()} net members.`
            : `The strongest catalog week delivered ${strongestWeek.netSubscriberMovement >= 0 ? '+' : ''}${strongestWeek.netSubscriberMovement.toLocaleString()} net members.`,
        `${positiveCashWeeks} of ${window.length} weeks added cash to the platform treasury.`,
    ];
    const misses = [
        weakestWeek.netSubscriberMovement < 0
            ? `The weakest week lost ${Math.abs(weakestWeek.netSubscriberMovement).toLocaleString()} net members.`
            : `The quietest week added only ${weakestWeek.netSubscriberMovement.toLocaleString()} net members.`,
        peakCapacityUtilizationPercent >= 90
            ? `Peak demand reached ${peakCapacityUtilizationPercent.toFixed(0)}% of burst capacity.`
            : releaseCount < Math.ceil(window.length / 4)
                ? `Only ${releaseCount} of ${window.length} weeks carried a new programming beat.`
                : `No critical delivery failure emerged; the next risk is sustaining the programming rhythm.`,
    ];
    const nextMandate = technicalVerdict === 'AT_RISK' || technicalVerdict === 'WATCH_LOAD'
        ? 'Create more delivery headroom before the next demand spike.'
        : subscriberNetMovement < 0
            ? 'Put the next cycle behind retention and a clear next-watch promise.'
            : totalCashContribution < 0
                ? 'Keep the audience growing while bringing weekly cash contribution back above zero.'
                : releaseCount < Math.ceil(window.length / 4)
                    ? 'Close the next content gap before audience momentum cools.'
                    : 'Defend the growth curve without sacrificing playback trust.';
    const headline = performanceTier === 'BREAKOUT'
        ? 'The platform found another gear.'
        : performanceTier === 'GROWING'
            ? 'Momentum is becoming a company habit.'
            : performanceTier === 'UNDER_PRESSURE'
                ? 'The quarter exposed the next hard decision.'
                : 'The service held its ground and earned another cycle.';
    const boardVerdict = `${STREAMING_STRATEGIC_IDENTITY_LABELS[strategicIdentity]} defined this run: ${subscriberNetMovement >= 0 ? '+' : ''}${subscriberNetMovement.toLocaleString()} net members, ${averagePlaybackSuccessRate.toFixed(2)}% playback success and ${totalCashContribution >= 0 ? 'positive' : 'negative'} cash contribution.`;
    const idempotencyKey = kind === 'TWELVE_WEEK_REVIEW'
        ? `streaming-season-review:${cycleNumber}`
        : `streaming-progress-beat:${cycleNumber}`;
    const ledgerFactId = createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey);
    return {
        id: createDeterministicId('streaming_cycle', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        ledgerFactId,
        kind,
        cycleNumber,
        startAbsoluteWeek: first.absoluteWeek,
        endAbsoluteWeek: last.absoluteWeek,
        weeksIncluded: window.length,
        strategicIdentity,
        performanceTier,
        subscriberStart,
        subscriberEnd,
        subscriberNetMovement,
        averageChurnRate: roundRate(average(window.map(snapshot => snapshot.churnRate))),
        averageEngagementRate: roundRate(average(window.map(snapshot => snapshot.engagementRate))),
        averagePlaybackSuccessRate,
        peakCapacityUtilizationPercent,
        totalSubscriptionRevenue,
        totalCashContribution,
        totalAccountingContribution,
        technicalVerdict,
        rivalMovement: selectRivalMovement(platform, player.world.platforms, cycleNumber),
        hits,
        misses,
        headline,
        boardVerdict,
        nextMandate,
        acknowledgedAtAbsoluteWeek: null,
    };
};

const commitReview = (
    platform: OwnedStreamingPlatformState,
    review: OwnedStreamingCycleReview,
): OwnedStreamingPlatformState => {
    if (platform.cycleReviews.some(item => item.idempotencyKey === review.idempotencyKey)) return platform;
    const ledgerEntry: OwnedStreamingLedgerEntry = {
        id: review.ledgerFactId,
        idempotencyKey: review.idempotencyKey,
        absoluteWeek: review.endAbsoluteWeek,
        type: review.kind === 'TWELVE_WEEK_REVIEW' ? 'SEASON_REVIEW_COMMITTED' : 'QUARTER_BEAT_COMMITTED',
        summary: review.headline,
        source: 'WEEK_PROCESSOR',
        metadata: {
            reviewId: review.id,
            cycleNumber: review.cycleNumber,
            strategicIdentity: review.strategicIdentity,
            performanceTier: review.performanceTier,
        },
    };
    return compactOwnedStreamingPlatformForPersistence({
        ...platform,
        cycleReviews: [...platform.cycleReviews, review],
        eventLedger: [...platform.eventLedger, ledgerEntry],
        milestoneKeys: Array.from(new Set([
            ...platform.milestoneKeys,
            review.kind === 'TWELVE_WEEK_REVIEW' ? 'first-season-reviewed' : 'quarter-cycle-started',
        ])),
    });
};

export const commitStreamingQuarterSeasonCycle = (
    value: OwnedStreamingPlatformState,
    player: Player,
    snapshot: OwnedStreamingWeeklySnapshot,
): OwnedStreamingPlatformState => {
    let platform = normalizeOwnedStreamingPlatformState(value, player.id);
    if (!platform.launchCommit) return platform;
    const completedOperatingWeeks = snapshot.absoluteWeek - platform.launchCommit.committedAtAbsoluteWeek;
    if (completedOperatingWeeks <= 0 || completedOperatingWeeks % 4 !== 0) return platform;

    const fourWeekWindow = platform.weeklyHistory.filter(item => (
        item.absoluteWeek > snapshot.absoluteWeek - 4 && item.absoluteWeek <= snapshot.absoluteWeek
    ));
    if (fourWeekWindow.length === 4) {
        platform = commitReview(
            platform,
            buildCycleReview(platform, player, fourWeekWindow, 'FOUR_WEEK_BEAT', completedOperatingWeeks / 4),
        );
    }

    if (completedOperatingWeeks % 12 !== 0) return platform;
    const twelveWeekWindow = platform.weeklyHistory.filter(item => (
        item.absoluteWeek > snapshot.absoluteWeek - 12 && item.absoluteWeek <= snapshot.absoluteWeek
    ));
    if (twelveWeekWindow.length !== 12) return platform;
    const seasonReview = buildCycleReview(
        platform,
        player,
        twelveWeekWindow,
        'TWELVE_WEEK_REVIEW',
        completedOperatingWeeks / 12,
    );
    platform = commitReview(platform, seasonReview);
    return queueOwnedStreamingCinematic(platform, {
        idempotencyKey: `board-review:${seasonReview.id}`,
        type: 'BOARD_REVIEW',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: snapshot.absoluteWeek,
        title: `Season ${seasonReview.cycleNumber} Board Review`,
        factIds: [seasonReview.ledgerFactId],
    });
};

export interface StreamingQuarterSeasonCycleView {
    completedOperatingWeeks: number;
    seasonNumber: number;
    weekInSeason: number;
    weeksUntilProgressBeat: number;
    weeksUntilSeasonReview: number;
    audiencePulse: OwnedStreamingWeeklySnapshot[];
    progressBeats: OwnedStreamingCycleReview[];
    seasonReviews: OwnedStreamingCycleReview[];
    latestReview: OwnedStreamingCycleReview | null;
    unacknowledgedReview: OwnedStreamingCycleReview | null;
    pendingBoardCinematicId: string | null;
    pendingBoardReview: OwnedStreamingCycleReview | null;
}

export const getStreamingQuarterSeasonCycle = (player: Player): StreamingQuarterSeasonCycleView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const completedOperatingWeeks = Math.max(
        0,
        absoluteWeek - (platform.launchCommit?.committedAtAbsoluteWeek ?? absoluteWeek),
    );
    const seasonRemainder = completedOperatingWeeks % 12;
    const weekInSeason = completedOperatingWeeks > 0 && seasonRemainder === 0 ? 12 : seasonRemainder;
    const beatRemainder = completedOperatingWeeks % 4;
    const progressBeats = platform.cycleReviews.filter(review => review.kind === 'FOUR_WEEK_BEAT');
    const seasonReviews = platform.cycleReviews.filter(review => review.kind === 'TWELVE_WEEK_REVIEW');
    const latestReview = platform.cycleReviews.at(-1) || null;
    const unacknowledgedReview = [...platform.cycleReviews].reverse().find(review => (
        review.acknowledgedAtAbsoluteWeek === null
    )) || null;
    const pendingBoardCinematic = [...platform.cinematicQueue].reverse().find(event => (
        event.type === 'BOARD_REVIEW'
        && event.status === 'QUEUED'
        && event.availableAtAbsoluteWeek <= absoluteWeek
    )) || null;
    const pendingBoardReview = pendingBoardCinematic
        ? [...seasonReviews].reverse().find(review => pendingBoardCinematic.factIds.includes(review.ledgerFactId)) || null
        : null;
    return {
        completedOperatingWeeks,
        seasonNumber: Math.max(1, Math.floor(Math.max(0, completedOperatingWeeks - 1) / 12) + 1),
        weekInSeason,
        weeksUntilProgressBeat: beatRemainder === 0 ? 4 : 4 - beatRemainder,
        weeksUntilSeasonReview: seasonRemainder === 0 ? 12 : 12 - seasonRemainder,
        audiencePulse: platform.weeklyHistory.slice(-12),
        progressBeats,
        seasonReviews,
        latestReview,
        unacknowledgedReview,
        pendingBoardCinematicId: pendingBoardCinematic?.id || null,
        pendingBoardReview,
    };
};

export const acknowledgeStreamingCycleReview = (
    player: Player,
    reviewId: string,
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const target = platform.cycleReviews.find(review => review.id === reviewId);
    if (!target || target.acknowledgedAtAbsoluteWeek !== null) return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            cycleReviews: platform.cycleReviews.map(review => (
                review.id === reviewId
                    ? { ...review, acknowledgedAtAbsoluteWeek: absoluteWeek }
                    : review
            )),
        }, player.id),
    };
};
