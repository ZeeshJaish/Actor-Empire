import { useEffect, useRef } from 'react';
import { showAd, type AdResult } from './adLogic';

export const eventRewardKey = (slot: number | null | undefined, playerId: string, eventId?: string) =>
    slot && eventId ? `actorEmpireEventRewardV1:${JSON.stringify([slot, playerId, eventId])}` : null;

export const readEventReward = (key: string | null): string | null => {
    try {
        return key ? localStorage.getItem(key) : null;
    } catch {
        return null;
    }
};

export const clearEventReward = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch {
        // A receipt for an event no longer in the saved queue cannot be applied.
    }
};

const pendingAds = new Set<string>();

export const watchEventRewardAd = async (key: string | null, choice: string): Promise<AdResult> => {
    if (key && pendingAds.has(key)) return { success: false, reason: 'UNAVAILABLE' };
    const earnedChoice = readEventReward(key);
    if (earnedChoice !== null) {
        return earnedChoice === choice ? { success: true } : { success: false, reason: 'UNAVAILABLE' };
    }
    if (key) pendingAds.add(key);
    const recordEarned = () => {
        if (!key) return;
        try {
            localStorage.setItem(key, choice);
        } catch {
            // The player can still receive the reward in the running session.
        }
    };
    try {
        const result = await showAd('REWARDED_BAILOUT', { onEarned: recordEarned });
        if (result.success) recordEarned();
        return result;
    } finally {
        if (key) pendingAds.delete(key);
    }
};

export const useEventRewardRecovery = (key: string | null, onRecover: (choice: string) => void) => {
    const recoveredKey = useRef<string | null>(null);
    useEffect(() => {
        if (!key || recoveredKey.current === key || pendingAds.has(key)) return;
        const choice = readEventReward(key);
        if (choice === null) return;
        recoveredKey.current = key;
        try {
            onRecover(choice);
        } catch (error) {
            console.error('Could not recover the event ad reward:', error);
        }
    }, [key, onRecover]);

    return async (choice: string) => {
        const result = await watchEventRewardAd(key, choice);
        if (result.success) recoveredKey.current = key;
        return result;
    };
};
