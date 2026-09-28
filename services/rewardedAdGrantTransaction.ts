import type { ActorSkills, Genre, Player } from '../types';
import { restoreWeeklyEnergy } from './premiumLogic';
import { rewardGenreExperience } from './roleLogic';
import {
    markPendingRewardAdGranted,
    markPendingRewardAdVerifiedSave,
    recordPendingRewardAdGrantAttempt,
    type PendingRewardAdReceipt,
} from './rewardedAdRecovery';

export type RewardedAdGrantOutcome =
    | { kind: 'CASH'; amount: number }
    | { kind: 'BAILOUT'; amount: number }
    | { kind: 'ENERGY'; amount: number }
    | { kind: 'WELLNESS' }
    | { kind: 'SKILL'; amount: number; skill: string }
    | { kind: 'GENRE'; amount: number; genre: string };

export interface RewardedAdGrantTransactionResult {
    status: 'GRANTED' | 'ALREADY_GRANTED' | 'SAVE_FAILED' | 'NOT_READY';
    player: Player;
    receipt: PendingRewardAdReceipt;
    outcome?: RewardedAdGrantOutcome;
    error?: unknown;
}

const clonePlayer = (player: Player): Player => JSON.parse(JSON.stringify(player)) as Player;

const hasGrantId = (player: Player, receiptId: string): boolean => (
    Array.isArray(player.flags?.grantedRewardAdIds)
    && player.flags.grantedRewardAdIds.includes(receiptId)
);

export const attachRewardedAdGrantProof = (player: Player, receiptId: string): Player => {
    if (hasGrantId(player, receiptId)) return player;
    const next = clonePlayer(player);
    if (!next.flags) next.flags = {};
    const grantedRewardAdIds = Array.isArray(next.flags.grantedRewardAdIds)
        ? next.flags.grantedRewardAdIds as string[]
        : [];
    next.flags.grantedRewardAdIds = [...grantedRewardAdIds, receiptId].slice(-80);
    return next;
};

export const applyRewardedAdGrant = (
    player: Player,
    receipt: PendingRewardAdReceipt,
): { player: Player; outcome: RewardedAdGrantOutcome; alreadyApplied: boolean } => {
    if (hasGrantId(player, receipt.id)) {
        return { player, outcome: { kind: 'WELLNESS' }, alreadyApplied: true };
    }

    const next = attachRewardedAdGrantProof(player, receipt.id);

    let outcome: RewardedAdGrantOutcome;
    if (receipt.type === 'REWARDED_CASH') {
        next.money += 5_000;
        outcome = { kind: 'CASH', amount: 5_000 };
    } else if (receipt.type === 'REWARDED_BAILOUT') {
        const bailoutAdsUsedThisWeek = next.flags.bailoutAdsUsedThisWeek || 0;
        const currentDebt = Math.abs(next.money < 0 ? next.money : 0);
        const amount = bailoutAdsUsedThisWeek === 0
            ? Math.floor(currentDebt * 0.20) + 5_000
            : Math.floor(currentDebt * 0.10) + 2_500;
        next.money += amount;
        next.flags.bailoutAdsUsedThisWeek = bailoutAdsUsedThisWeek + 1;
        outcome = { kind: 'BAILOUT', amount };
    } else if (receipt.type === 'REWARDED_ENERGY') {
        restoreWeeklyEnergy(next, 25);
        outcome = { kind: 'ENERGY', amount: 25 };
    } else if (receipt.type === 'REWARDED_STATS') {
        next.stats.health = Math.max(90, next.stats.health);
        next.stats.happiness = Math.max(90, next.stats.happiness);
        next.stats.looks = Math.max(90, next.stats.looks);
        next.stats.body = Math.max(90, next.stats.body);
        outcome = { kind: 'WELLNESS' };
    } else if (receipt.type === 'REWARDED_SKILL' && receipt.data) {
        const skill = receipt.data as keyof ActorSkills;
        next.stats.skills[skill] = Math.min(100, next.stats.skills[skill] + 10);
        outcome = { kind: 'SKILL', amount: 10, skill: receipt.data };
    } else if (receipt.type === 'REWARDED_GENRE' && receipt.data) {
        rewardGenreExperience(next, receipt.data as Genre, 10);
        outcome = { kind: 'GENRE', amount: 10, genre: receipt.data };
    } else {
        throw new Error(`Unsupported rewarded-ad grant: ${receipt.type}`);
    }

    return { player: next, outcome, alreadyApplied: false };
};

export const runRewardedAdGrantTransaction = async (input: {
    receipt: PendingRewardAdReceipt;
    player: Player;
    persist: (candidate: Player) => Promise<Player>;
    nowMs?: number;
}): Promise<RewardedAdGrantTransactionResult> => {
    const nowMs = input.nowMs ?? Date.now();
    const { receipt, player } = input;
    if (
        receipt.completedSteps !== receipt.stepsRequired
        || (receipt.status !== 'READY_TO_GRANT' && receipt.status !== 'VERIFIED_SAVE' && receipt.status !== 'GRANTED')
    ) {
        return { status: 'NOT_READY', player, receipt };
    }

    if (receipt.status === 'GRANTED' || hasGrantId(player, receipt.id)) {
        let finalReceipt = receipt;
        try {
            if (finalReceipt.status === 'READY_TO_GRANT') {
                finalReceipt = markPendingRewardAdVerifiedSave(finalReceipt, nowMs);
            }
            if (finalReceipt.status !== 'GRANTED') {
                finalReceipt = markPendingRewardAdGranted(finalReceipt, nowMs);
            }
        } catch {
            finalReceipt = { ...finalReceipt, status: 'GRANTED', grantedAt: nowMs, updatedAt: nowMs };
        }
        return { status: 'ALREADY_GRANTED', player, receipt: finalReceipt };
    }

    const applied = applyRewardedAdGrant(player, receipt);
    let attemptedReceipt = receipt;
    try {
        attemptedReceipt = recordPendingRewardAdGrantAttempt(receipt, nowMs);
    } catch {
        // The verified player flag is the final idempotency boundary. Continue so
        // a transient localStorage write failure cannot consume a watched ad.
    }

    let savedPlayer: Player;
    try {
        savedPlayer = await input.persist(applied.player);
    } catch (error) {
        return {
            status: 'SAVE_FAILED',
            player,
            receipt: attemptedReceipt,
            outcome: applied.outcome,
            error,
        };
    }

    let finalReceipt = attemptedReceipt;
    try {
        finalReceipt = markPendingRewardAdVerifiedSave(finalReceipt, nowMs);
        finalReceipt = markPendingRewardAdGranted(finalReceipt, nowMs);
    } catch {
        finalReceipt = {
            ...finalReceipt,
            status: 'GRANTED',
            verifiedSaveAt: nowMs,
            grantedAt: nowMs,
            updatedAt: nowMs,
        };
    }
    return {
        status: 'GRANTED',
        player: savedPlayer,
        receipt: finalReceipt,
        outcome: applied.outcome,
    };
};
