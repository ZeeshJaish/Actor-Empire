import type { Player } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { transitionOwnedStreamingLifecycle } from './ownedStreamingPlatform';

export const STREAMING_ELIGIBILITY_THRESHOLDS = {
    LIQUID_CASH: 85_000_000,
    FAME: 65,
    REPUTATION: 55,
} as const;

export type StreamingLaunchMetricId = 'LIQUID_CASH' | 'FAME' | 'REPUTATION';
export type StreamingLaunchMetricUnit = 'MONEY' | 'SCORE';

export interface StreamingLaunchMetric {
    id: StreamingLaunchMetricId;
    label: string;
    current: number;
    target: number;
    unit: StreamingLaunchMetricUnit;
    met: boolean;
    progress: number;
}

export interface StreamingEligibilityReport {
    status: 'LOCKED' | 'ELIGIBLE';
    eligible: boolean;
    readiness: number;
    clearedMetrics: number;
    nextRequirement: StreamingLaunchMetric | null;
    metrics: StreamingLaunchMetric[];
}

const metric = (
    id: StreamingLaunchMetricId,
    label: string,
    current: number,
    target: number,
    unit: StreamingLaunchMetricUnit,
): StreamingLaunchMetric => {
    const safeCurrent = Math.max(0, Number.isFinite(current) ? current : 0);
    const safeTarget = Math.max(1, Number.isFinite(target) ? target : 1);
    return {
        id,
        label,
        current: safeCurrent,
        target: safeTarget,
        unit,
        met: safeCurrent >= safeTarget,
        progress: Math.max(0, Math.min(1, safeCurrent / safeTarget)),
    };
};

export const evaluateStreamingEligibility = (player: Player): StreamingEligibilityReport => {
    const metrics = [
        metric(
            'LIQUID_CASH',
            'Personal Cash',
            Number(player.money || 0),
            STREAMING_ELIGIBILITY_THRESHOLDS.LIQUID_CASH,
            'MONEY',
        ),
        metric(
            'FAME',
            'Fame',
            Number(player.stats.fame || 0),
            STREAMING_ELIGIBILITY_THRESHOLDS.FAME,
            'SCORE',
        ),
        metric(
            'REPUTATION',
            'Reputation',
            Number(player.stats.reputation || 0),
            STREAMING_ELIGIBILITY_THRESHOLDS.REPUTATION,
            'SCORE',
        ),
    ];
    const clearedMetrics = metrics.filter(item => item.met).length;
    const eligible = clearedMetrics === metrics.length;
    const readiness = metrics.reduce((sum, item) => sum + item.progress, 0) / metrics.length;
    const nextRequirement = metrics
        .filter(item => !item.met)
        .sort((a, b) => a.progress - b.progress)[0] || null;

    return {
        status: eligible ? 'ELIGIBLE' : 'LOCKED',
        eligible,
        readiness,
        clearedMetrics,
        nextRequirement,
        metrics,
    };
};

export interface ClaimStreamingLaunchEligibilityResult {
    player: Player;
    changed: boolean;
    reason: 'LAUNCH_CLEARED' | 'NOT_ELIGIBLE' | 'ALREADY_CLEARED';
}

export const claimStreamingLaunchEligibility = (player: Player): ClaimStreamingLaunchEligibilityResult => {
    const eligibility = evaluateStreamingEligibility(player);
    if (!eligibility.eligible) {
        return { player, changed: false, reason: 'NOT_ELIGIBLE' };
    }
    if (player.ownedStreamingPlatform.lifecycle !== 'LOCKED') {
        return { player, changed: false, reason: 'ALREADY_CLEARED' };
    }

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const ownedStreamingPlatform = transitionOwnedStreamingLifecycle(
        player.ownedStreamingPlatform,
        'ELIGIBLE',
        absoluteWeek,
        'PLAYER_ACTION',
    );
    if (ownedStreamingPlatform.lifecycle !== 'ELIGIBLE') {
        return { player, changed: false, reason: 'NOT_ELIGIBLE' };
    }

    return {
        changed: true,
        reason: 'LAUNCH_CLEARED',
        player: {
            ...player,
            ownedStreamingPlatform,
        },
    };
};
