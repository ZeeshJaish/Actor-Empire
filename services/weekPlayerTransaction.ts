import type { Player } from '../types';
import { clonePlayerForWeekProcessing } from './gameLoopClone';
import { getAbsoluteWeek } from './legacyLogic';

/** Keeps the previous week untouched until the candidate is ready to commit. */
export const createWeekPlayerTransaction = (player: Player) => {
    const expectedWeek = getAbsoluteWeek(player.age, player.currentWeek) + 1;
    return {
        draft: clonePlayerForWeekProcessing(player),
        adopt: (candidate: Player): Player => candidate,
        commit: (candidate: Player): Player => {
            if (candidate === player || getAbsoluteWeek(candidate.age, candidate.currentWeek) !== expectedWeek) {
                throw new Error('Weekly transaction cannot commit a stale or incomplete player.');
            }
            return candidate;
        },
    };
};
