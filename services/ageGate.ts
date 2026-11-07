import type { Player } from '../types';

/**
 * #255: the dating apps, hook-ups, marriage and the nightlife scene stay locked until a character is 18.
 * A locked button still answers a tap, with a short "wait till 18" popup, so nothing new is added to any screen.
 */
export const ADULT_AGE = 18;

export const isUnderAdultAge = (player: Pick<Player, 'age'>): boolean => Number(player.age) < ADULT_AGE;
