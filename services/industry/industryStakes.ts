/**
 * #178 (plan §22): what an investor of the industry has gained from their stake in our company, at what the company
 * is worth less what they put in. The Forbes list adds it to their worth, so a good year for us lifts them too.
 */
import type { Player } from '../../types';
import { normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { getStreamingEquityValuation } from '../streamingPublicMarkets';
import type { IndustryPerson } from './industryPeople';

export const industryStakeGain = (player: Player): ((person: IndustryPerson) => number) => {
    if (!player.ownedStreamingPlatform?.identity) return () => 0;
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const worth = getStreamingEquityValuation(platform);
    const holders = platform.finance.equityHolders;
    return person => {
        if (person.kind !== 'INVESTOR') return 0;
        const holder = holders.find(item => item.holderName === person.name || (person.legacyName && item.holderName === person.legacyName));
        return holder ? Math.max(0, worth * holder.ownershipPercent / 100 - holder.investedCapital) : 0;
    };
};
