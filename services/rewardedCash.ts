import type { Player } from '../types';
import { getEstimatedNetWorth } from './loanLogic';

/* The rewarded cash ad grows with the player (Zeesh, 2026-11-08): 0.1% of net
   worth, at least $5,000 and at most $250,000, paid into the personal wallet
   only. Company money is never given by an ad. */
export const REWARDED_CASH = { share: 0.001, min: 5_000, max: 250_000, step: 100 } as const;

export const rewardedCashAmount = (player: Player): number => {
    let worth = 0;
    try {
        worth = Math.max(0, Number(getEstimatedNetWorth(player)) || 0);
    } catch {
        worth = Math.max(0, Number(player.money) || 0);
    }
    const rounded = Math.round((worth * REWARDED_CASH.share) / REWARDED_CASH.step) * REWARDED_CASH.step;
    return Math.max(REWARDED_CASH.min, Math.min(REWARDED_CASH.max, rounded));
};
