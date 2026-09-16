import type {
    OwnedStreamingLaunchMarketingDraft,
    OwnedStreamingLaunchMarketingPlan,
    Player,
    StreamingLaunchMarketingForecastSnapshot,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { getStreamingLaunchMarketingWeeklySchedule } from './streamingLaunchMarketing';

export interface StreamingLaunchMarketingMutationResult {
    player: Player;
    changed: boolean;
    reason: 'SAVED' | 'RESERVED' | 'PROCESSED' | 'SETTLED' | 'UNCHANGED' | 'LOCKED' | 'INSUFFICIENT_TREASURY';
}

const nonNegativeMoney = (value: unknown, fallback: number): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(numeric)))
        : fallback;
};

export const saveOwnedStreamingLaunchMarketingDraft = (
    player: Player,
    patch: Partial<OwnedStreamingLaunchMarketingDraft>,
): StreamingLaunchMarketingMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.launchMarketingPlan && !['CANCELLED', 'SETTLED'].includes(platform.launchMarketingPlan.status)) {
        return { player, changed: false, reason: 'LOCKED' };
    }
    const current = platform.launchMarketingDraft!;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextDraft: OwnedStreamingLaunchMarketingDraft = {
        ...current,
        ...patch,
        schemaVersion: 1,
        budgetCeiling: nonNegativeMoney(patch.budgetCeiling, current.budgetCeiling),
        countryWeights: patch.countryWeights ? { ...patch.countryWeights } : current.countryWeights,
        channelAllocations: patch.channelAllocations ? { ...patch.channelAllocations } : current.channelAllocations,
        updatedAtAbsoluteWeek: absoluteWeek,
        revision: current.revision + 1,
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchMarketingDraft: nextDraft,
    }, player.id);
    return {
        player: { ...player, ownedStreamingPlatform: nextPlatform },
        changed: true,
        reason: 'SAVED',
    };
};

export const reserveOwnedStreamingLaunchMarketing = (
    player: Player,
    forecast: StreamingLaunchMarketingForecastSnapshot,
    readyAtAbsoluteWeek: number,
    openingCountryIds: string[],
    options: { idempotencyKey?: string } = {},
): StreamingLaunchMarketingMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const idempotencyKey = options.idempotencyKey
        ? `${options.idempotencyKey}:launch-marketing`
        : `launch-marketing:${platform.identity?.slug || player.id}:${forecast.signature}`;
    if (platform.launchMarketingPlan && !['CANCELLED', 'SETTLED'].includes(platform.launchMarketingPlan.status)) {
        return {
            player,
            changed: false,
            reason: platform.launchMarketingPlan.idempotencyKey === idempotencyKey ? 'UNCHANGED' : 'LOCKED',
        };
    }
    const draft = platform.launchMarketingDraft!;
    const ceiling = nonNegativeMoney(draft.budgetCeiling, 0);
    const remainingReservations = platform.costCommitments
        .filter(item => item.status === 'COMMITTED')
        .reduce((sum, item) => sum + item.committedAmount, 0);
    if (ceiling > Math.max(0, platform.treasuryCash - remainingReservations)) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const startsAtAbsoluteWeek = absoluteWeek + 1;
    const endsAtAbsoluteWeek = Math.max(startsAtAbsoluteWeek, Math.round(readyAtAbsoluteWeek));
    const planId = createDeterministicId('streaming_launch_marketing', platform.simulationSeed, idempotencyKey);
    const plan: OwnedStreamingLaunchMarketingPlan = {
        ...draft,
        id: planId,
        idempotencyKey,
        status: 'RESERVED',
        openingCountryIds: Array.from(new Set(openingCountryIds.map(id => id.trim().toUpperCase()).filter(Boolean))).sort(),
        committedAtAbsoluteWeek: absoluteWeek,
        startsAtAbsoluteWeek,
        endsAtAbsoluteWeek,
        spentAmount: 0,
        returnedAmount: 0,
        lastProcessedAbsoluteWeek: null,
        forecastSnapshot: forecast,
        countryAwareness: Object.fromEntries(forecast.countryForecasts.map(country => [country.countryId, country.organicAwareness])),
    };
    const commitment = ceiling > 0 ? {
        id: createDeterministicId('streaming_cost', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        category: 'MARKETING' as const,
        label: 'Opening-night marketing ceiling',
        status: 'COMMITTED' as const,
        plannedAmount: ceiling,
        committedAmount: ceiling,
        paidAmount: 0,
        weeklyAmount: Math.ceil(ceiling / Math.max(1, endsAtAbsoluteWeek - startsAtAbsoluteWeek + 1)),
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: absoluteWeek,
        paidAtAbsoluteWeek: null,
        sourceReferenceId: planId,
    } : null;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchMarketingPlan: plan,
        costCommitments: commitment ? [...platform.costCommitments, commitment] : platform.costCommitments,
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'RESERVED' };
};

export const processOwnedStreamingLaunchMarketingWeek = (
    player: Player,
): { player: Player; processed: boolean; spentAmount: number } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const plan = platform.launchMarketingPlan;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (!plan || ['SETTLED', 'CANCELLED'].includes(plan.status) || absoluteWeek <= plan.committedAtAbsoluteWeek
        || plan.lastProcessedAbsoluteWeek !== null && plan.lastProcessedAbsoluteWeek >= absoluteWeek) {
        return { player, processed: false, spentAmount: 0 };
    }
    const commitmentIndex = platform.costCommitments.findIndex(item => item.sourceReferenceId === plan.id && item.category === 'MARKETING');
    const commitment = commitmentIndex >= 0 ? platform.costCommitments[commitmentIndex] : null;
    const schedule = getStreamingLaunchMarketingWeeklySchedule(
        plan.budgetCeiling,
        plan.timeline,
        Math.max(1, plan.endsAtAbsoluteWeek - plan.startsAtAbsoluteWeek + 1),
    );
    const scheduleIndex = absoluteWeek - plan.startsAtAbsoluteWeek;
    const scheduled = scheduleIndex >= 0 && scheduleIndex < schedule.length ? schedule[scheduleIndex] : 0;
    const spend = commitment
        ? Math.max(0, Math.min(scheduled, commitment.committedAmount, platform.treasuryCash))
        : 0;
    const progress = plan.budgetCeiling > 0 ? Math.min(1, (plan.spentAmount + spend) / plan.budgetCeiling) : 0;
    const decayed = absoluteWeek > plan.endsAtAbsoluteWeek ? .92 : 1;
    const countryAwareness = Object.fromEntries(plan.forecastSnapshot.countryForecasts.map(country => [
        country.countryId,
        Math.min(1, Math.max(country.organicAwareness, (
            country.organicAwareness + country.likelyAwarenessLift * progress
        ) * decayed)),
    ]));
    const nextCommitments = [...platform.costCommitments];
    if (commitment) {
        nextCommitments[commitmentIndex] = {
            ...commitment,
            committedAmount: Math.max(0, commitment.committedAmount - spend),
            paidAmount: commitment.paidAmount + spend,
            paidAtAbsoluteWeek: spend > 0 ? absoluteWeek : commitment.paidAtAbsoluteWeek,
        };
    }
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - spend,
        launchMarketingPlan: {
            ...plan,
            status: spend > 0 || plan.spentAmount > 0 ? 'SPENDING' : plan.status,
            spentAmount: plan.spentAmount + spend,
            lastProcessedAbsoluteWeek: absoluteWeek,
            countryAwareness,
        },
        costCommitments: nextCommitments,
    }, player.id);
    return {
        player: { ...player, ownedStreamingPlatform: nextPlatform },
        processed: true,
        spentAmount: spend,
    };
};

export const settleOwnedStreamingLaunchMarketingAtOpening = (
    player: Player,
): StreamingLaunchMarketingMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const plan = platform.launchMarketingPlan;
    if (!plan || ['SETTLED', 'CANCELLED'].includes(plan.status)) {
        return { player, changed: false, reason: 'UNCHANGED' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    let returnedAmount = 0;
    const costCommitments = platform.costCommitments.map(item => {
        if (item.sourceReferenceId !== plan.id || item.category !== 'MARKETING') return item;
        returnedAmount = item.committedAmount;
        return {
            ...item,
            status: item.paidAmount > 0 ? 'PAID' as const : 'CANCELLED' as const,
            committedAmount: 0,
            paidAtAbsoluteWeek: item.paidAmount > 0 ? item.paidAtAbsoluteWeek ?? absoluteWeek : item.paidAtAbsoluteWeek,
        };
    });
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchMarketingPlan: {
            ...plan,
            status: plan.spentAmount > 0 ? 'SETTLED' : 'CANCELLED',
            returnedAmount,
        },
        costCommitments,
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SETTLED' };
};
