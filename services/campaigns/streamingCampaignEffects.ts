/**
 * What the player's campaigns do to the world (#145), kept light (types only) so the world's simulation and the
 * weekly close can read it without importing the campaign adapter:
 *  - a country's marketing index rises with the service's awareness there: 11 × √awareness points, at most 10
 *    (#153: was 45 and 40, which let a $10M campaign add a home for about $18; now about $70);
 *  - a title's pull in a country's viewing: 1 + 0.55 × √awareness;
 *  - the week's spend, an operating cost.
 */
import type { CampaignBook, OwnedStreamingPlatformState } from '../../types';

export const STREAMING_CAMPAIGN_MARKETING_PER_AWARENESS = 11;
export const STREAMING_CAMPAIGN_MARKETING_CAP = 10;
export const STREAMING_CAMPAIGN_TITLE_PULL = 0.55;

type WithBook = { campaignBook?: CampaignBook };

/** A country's marketing points from the service's awareness there. */
export const streamingCampaignMarketingBoost = (awareness: number): number => (
    Math.min(STREAMING_CAMPAIGN_MARKETING_CAP, STREAMING_CAMPAIGN_MARKETING_PER_AWARENESS * Math.sqrt(Math.max(0, awareness)))
);

/** The player's marketing index where campaigns built awareness; undefined when none did. */
export const streamingCampaignMarketingByCountry = (platform: WithBook, base: number): Record<string, number> | undefined => {
    const awareness = platform.campaignBook?.serviceAwareness;
    if (!awareness || !Object.keys(awareness).length) return undefined;
    return Object.fromEntries(Object.entries(awareness).map(([countryId, level]) => [
        countryId, Math.round(Math.min(100, base + streamingCampaignMarketingBoost(level)) * 100) / 100,
    ]));
};

/** A title's extra pull in a country's viewing from its campaigns (×1 where none ran). */
export const streamingCampaignTitleFit = (platform: WithBook, projectId: string, countryId: string): number => {
    const level = platform.campaignBook?.titleAwareness?.[projectId]?.[countryId] ?? 0;
    return level > 0 ? 1 + STREAMING_CAMPAIGN_TITLE_PULL * Math.sqrt(level) : 1;
};

/** #152: a rival title's extra pull in the weekly chart, which shares out its service's week as a whole: its
    campaigns' best awareness of it in any country (×1 where none ran). */
export const streamingCampaignTitleFitAnywhere = (platform: WithBook, projectId: string): number => {
    const levels = Object.values(platform.campaignBook?.titleAwareness?.[projectId] ?? {});
    const level = levels.length ? Math.max(...levels) : 0;
    return level > 0 ? 1 + STREAMING_CAMPAIGN_TITLE_PULL * Math.sqrt(level) : 1;
};

/** What the campaigns spent in a week: an operating cost in the weekly close. #160: a campaign paid in full when it was
    commissioned is not charged again. */
export const streamingCampaignWeekCost = (platform: Pick<OwnedStreamingPlatformState, 'campaignBook'>, absoluteWeek: number): number => (
    (platform.campaignBook?.campaigns || []).filter(campaign => typeof campaign.paid !== 'number')
        .reduce((sum, campaign) => sum + (campaign.weeks.find(week => week.absoluteWeek === absoluteWeek)?.spend || 0), 0)
);
