import type { AuditionOpportunity, Message, Player } from '../types';
import { markQuietPlayerUpdate } from './quietPlayerUpdates';

/**
 * U12 (2026-11-16): "No way to stop movie offers or clear messages."
 *
 * Which role offers the player wants in the inbox: every one (the default, as before), lead roles only, big films only
 * (a HIGH or BLOCKBUSTER budget; offers carry no studio size, so "big films" is the honest name), or none. The weekly
 * loop asks `roleOfferWanted` before it posts an agent's audition or a director's follow-up offer.
 *
 * And Delete all (16 Nov, in place of "Decline role offers" and "Clear read").
 */
export type RoleOfferPreference = 'ALL' | 'LEADS' | 'BIG' | 'OFF';
export const ROLE_OFFER_PREFERENCES: ReadonlyArray<{ id: RoleOfferPreference; label: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'LEADS', label: 'Leads' },
    { id: 'BIG', label: 'Big films' },
    { id: 'OFF', label: 'Off' },
];

export const getRoleOfferPreference = (player: Pick<Player, 'flags'> | null | undefined): RoleOfferPreference => {
    const value = player?.flags?.roleOfferPreference;
    return value === 'LEADS' || value === 'BIG' || value === 'OFF' ? value : 'ALL';
};

export const roleOfferWanted = (player: Pick<Player, 'flags'>, offer: Pick<AuditionOpportunity, 'roleType' | 'project'> | null | undefined): boolean => {
    if (!offer) return false;
    const preference = getRoleOfferPreference(player);
    if (preference === 'OFF') return false;
    if (preference === 'LEADS') return offer.roleType === 'LEAD';
    if (preference === 'BIG') return offer.project?.budgetTier === 'HIGH' || offer.project?.budgetTier === 'BLOCKBUSTER';
    return true;
};

export const isRoleOfferMessage = (message: Pick<Message, 'type'>): boolean => (
    message.type === 'OFFER_ROLE' || message.type === 'OFFER_AUDITION'
);

/* The two changes, as quiet player updates (saved with the next real save, like reading a message: B29). */
export const setRoleOfferPreference = (player: Player, preference: RoleOfferPreference): Player => markQuietPlayerUpdate({
    ...player, flags: { ...(player.flags || {}), roleOfferPreference: preference },
});
/** 2026-11-16 (Zeesh: "delete all msg ka button chahiye tha naki role cancel ka"): every message goes, as Delete does for
    one (an offer or a request deleted is one let go), after a second tap */
export const deleteAllMessages = (player: Player): Player => markQuietPlayerUpdate({ ...player, inbox: [] });
