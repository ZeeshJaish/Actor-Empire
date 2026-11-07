/**
 * A country as a campaign sees it (#145; shared with the rivals' campaigns in #152): its homes that can stream, and how
 * dear its ads are (its homes' monthly entertainment budget against the reference market's $30, ×0.25 to ×2.2).
 * Reads the world only.
 */
import type { Player } from '../../types';
import type { CampaignMarket } from './campaignEngine';

/* the reference market's monthly entertainment budget per home, which prices ads at ×1 */
export const CAMPAIGN_REFERENCE_BUDGET = 30;

export const campaignMarketOf = (player: Player, countryId: string): CampaignMarket | null => {
    const homes = player.world.worldAudienceParticipation?.countries?.[countryId]?.streamingReachableHouseholds || 0;
    if (homes <= 0) return null;
    const cohorts = player.world.worldAudienceEconomy?.countries?.[countryId]?.cohorts || [];
    const households = cohorts.reduce((sum, cohort) => sum + cohort.households, 0);
    const budget = households > 0 ? cohorts.reduce((sum, cohort) => sum + cohort.totalMonthlyEntertainmentBudget, 0) / households : CAMPAIGN_REFERENCE_BUDGET;
    return { countryId, homes, costIndex: Math.round(Math.min(2.2, Math.max(0.25, budget / CAMPAIGN_REFERENCE_BUDGET)) * 100) / 100 };
};
