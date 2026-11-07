/**
 * #253: while the opening is being built, what the two wizards approved stays as approved. Zeesh (2026-11-05): "also during this period we lock any changes
 * via operations that alter the wizards content and stuff". Locked from commission until opening night: opening markets, the catalogue and opening slate,
 * the offer, the brand. Still open: Originals, technology, localization, renewing rights, money.
 *
 * One way out, so a lock can never be a dead end: if the launch itself is blocked on the catalogue (a licence ran out while the crews worked), Content opens
 * until that is fixed.
 */
import type { Player } from '../types';
import { getStreamingLaunchReadiness } from './streamingLaunch';

export interface StreamingOpeningLock {
    /** commissioned, not live yet */
    building: boolean;
    /** buying, bringing in or reprogramming titles is closed right now */
    catalogueLocked: boolean;
    /** markets, offer and brand are closed */
    planLocked: boolean;
    message: string;
}

const OPEN: StreamingOpeningLock = { building: false, catalogueLocked: false, planLocked: false, message: '' };
/* #276: an unfinished Original may come off the slate, so it opens Content too */
const CATALOGUE_BLOCKERS = new Set(['slate', 'original', 'rights', 'offer-coverage']);

export const STREAMING_OPENING_LOCK_MESSAGE = 'Locked until opening night. The crews are building the plan you approved.';

export const getStreamingOpeningLock = (player: Player): StreamingOpeningLock => {
    const platform = player.ownedStreamingPlatform;
    if (!platform?.infrastructureSetup || platform.launchCommit) return OPEN;
    const blocked = getStreamingLaunchReadiness(player).items.some(item => CATALOGUE_BLOCKERS.has(item.id) && item.tone === 'BLOCKED');
    return { building: true, catalogueLocked: !blocked, planLocked: true, message: STREAMING_OPENING_LOCK_MESSAGE };
};
