import type { ActiveRelease, CampaignPositioning, CampaignRealityOutcome, CampaignRealitySnapshot, NewsItem, Review, XPost } from '../types';

type MarketingRealityResult = CampaignRealitySnapshot & {
    shouldCreatePopup: false;
    review: Review;
    newsItem?: NewsItem;
    socialPost?: XPost;
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const safeNumber = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const POSITION_PROMISE: Record<CampaignPositioning, string> = {
    MASS_EVENT: 'Spectacle',
    PRESTIGE_PUSH: 'Quality',
    FANBASE_MOBILIZATION: 'Belonging',
    VIRAL_HEAT: 'Conversation',
    SLEEPER_BUILD: 'Discovery'
};

const outcomeLabel: Record<CampaignRealityOutcome, string> = {
    CAMPAIGN_DELIVERED: 'Campaign Delivered',
    OVERHYPED: 'Overhyped',
    HIDDEN_GEM: 'Hidden Gem',
    MISPOSITIONED: 'Mispositioned',
    PRESTIGE_REJECTED: 'Prestige Rejected',
    VIRAL_BACKLASH: 'Viral Backlash',
    WORD_OF_MOUTH_BREAKOUT: 'Word of Mouth Breakout',
    EVENT_DROP_OFF: 'Event Drop-Off'
};

const getTone = (outcome: CampaignRealityOutcome): CampaignRealitySnapshot['tone'] => {
    if (outcome === 'CAMPAIGN_DELIVERED' || outcome === 'HIDDEN_GEM' || outcome === 'WORD_OF_MOUTH_BREAKOUT') return 'POSITIVE';
    if (outcome === 'OVERHYPED' || outcome === 'PRESTIGE_REJECTED' || outcome === 'VIRAL_BACKLASH' || outcome === 'EVENT_DROP_OFF') return 'NEGATIVE';
    return 'MIXED';
};

const getForecastShift = (outcome: CampaignRealityOutcome) => {
    switch (outcome) {
        case 'WORD_OF_MOUTH_BREAKOUT':
            return 'Forecast revised upward as audience demand broadens.';
        case 'HIDDEN_GEM':
            return 'Forecast lifted from a modest opening into stronger legs.';
        case 'OVERHYPED':
            return 'Forecast revised downward after the campaign outpaced reception.';
        case 'VIRAL_BACKLASH':
            return 'Forecast became volatile as online attention turned negative.';
        case 'PRESTIGE_REJECTED':
            return 'Awards and long-run upside cooled after critic pushback.';
        case 'EVENT_DROP_OFF':
            return 'Opening demand was front-loaded; week-two risk increased.';
        case 'MISPOSITIONED':
            return 'Forecast narrowed because the campaign reached the wrong audience.';
        default:
            return 'Forecast held close to the early studio read.';
    }
};

const getAudienceRead = (outcome: CampaignRealityOutcome) => {
    switch (outcome) {
        case 'WORD_OF_MOUTH_BREAKOUT':
            return 'Audiences are telling friends to catch up.';
        case 'HIDDEN_GEM':
            return 'Viewers feel the movie is better than the campaign suggested.';
        case 'OVERHYPED':
            return 'Audiences feel the campaign promised more than the movie delivered.';
        case 'VIRAL_BACKLASH':
            return 'The conversation is loud, but the tone is turning against the movie.';
        case 'EVENT_DROP_OFF':
            return 'Early crowds showed up, then enthusiasm cooled quickly.';
        case 'MISPOSITIONED':
            return 'The right audience is still finding it.';
        case 'PRESTIGE_REJECTED':
            return 'Prestige audiences are not buying the pitch.';
        default:
            return 'The audience reaction broadly matches the campaign.';
    }
};

const getCriticRead = (outcome: CampaignRealityOutcome, criticScore: number) => {
    if (outcome === 'PRESTIGE_REJECTED') return 'Critics rejected the prestige framing.';
    if (criticScore >= 80) return 'Critics are carrying the movie.';
    if (criticScore <= 45) return 'Critics are cooling the run.';
    return 'Critics are broadly mixed.';
};

const getSummary = (outcome: CampaignRealityOutcome, title: string, promised: string) => {
    switch (outcome) {
        case 'WORD_OF_MOUTH_BREAKOUT':
            return `${title} is turning into the kind of run that builds after opening weekend.`;
        case 'HIDDEN_GEM':
            return `${title} opened quietly, but audience response is stronger than the market expected.`;
        case 'OVERHYPED':
            return `${title}'s ${promised.toLowerCase()} promise is being called too big for the movie.`;
        case 'VIRAL_BACKLASH':
            return `${title} is generating chatter, but not the clean kind.`;
        case 'PRESTIGE_REJECTED':
            return `${title}'s awards-facing campaign is running ahead of critical support.`;
        case 'EVENT_DROP_OFF':
            return `${title} pulled attention early, but the first-week read points to sharp drop-off risk.`;
        case 'MISPOSITIONED':
            return `${title} may have been sold to the wrong crowd.`;
        default:
            return `${title}'s campaign promise and audience reaction are aligned.`;
    }
};

const makeReviewText = (outcome: CampaignRealityOutcome, promised: string) => {
    switch (outcome) {
        case 'CAMPAIGN_DELIVERED':
            return `The campaign promise of ${promised.toLowerCase()} matches what audiences are actually responding to.`;
        case 'HIDDEN_GEM':
            return 'Audience word of mouth is stronger than the campaign footprint suggested.';
        case 'WORD_OF_MOUTH_BREAKOUT':
            return 'The release is gaining momentum because the movie is holding up outside the marketing push.';
        case 'OVERHYPED':
            return `The campaign promise of ${promised.toLowerCase()} is bigger than the movie can comfortably support.`;
        case 'VIRAL_BACKLASH':
            return 'The marketing made people look, but the conversation is starting to turn messy.';
        case 'PRESTIGE_REJECTED':
            return 'The prestige push is exposing a gap between the campaign and the critic response.';
        case 'EVENT_DROP_OFF':
            return 'This looks like a front-loaded launch with weaker audience legs after opening weekend.';
        default:
            return 'The movie has an audience, but the campaign angle does not fully match it.';
    }
};

const makeNews = (
    release: ActiveRelease,
    outcome: CampaignRealityOutcome,
    summary: string,
    week: number,
    year: number
): NewsItem | undefined => {
    if (!['OVERHYPED', 'VIRAL_BACKLASH', 'PRESTIGE_REJECTED', 'WORD_OF_MOUTH_BREAKOUT', 'HIDDEN_GEM', 'EVENT_DROP_OFF'].includes(outcome)) {
        return undefined;
    }

    const highImpact = outcome === 'VIRAL_BACKLASH' || outcome === 'WORD_OF_MOUTH_BREAKOUT' || outcome === 'OVERHYPED';
    return {
        id: `news_marketing_reality_${release.id}_${week}_${year}`,
        headline: `${outcomeLabel[outcome]}: ${release.name}`,
        subtext: summary,
        category: 'INDUSTRY',
        week,
        year,
        impactLevel: highImpact ? 'HIGH' : 'MEDIUM'
    };
};

const makeSocialPost = (
    release: ActiveRelease,
    outcome: CampaignRealityOutcome,
    audienceRead: string,
    week: number
): XPost | undefined => {
    if (!['OVERHYPED', 'VIRAL_BACKLASH', 'WORD_OF_MOUTH_BREAKOUT', 'HIDDEN_GEM', 'EVENT_DROP_OFF'].includes(outcome)) {
        return undefined;
    }

    const negative = outcome === 'OVERHYPED' || outcome === 'VIRAL_BACKLASH' || outcome === 'EVENT_DROP_OFF';
    const reach = Math.max(800, Math.floor((release.weeklyGross[0] || release.totalGross || release.budget) / 35000));
    return {
        id: `x_marketing_reality_${release.id}_${week}`,
        authorId: 'film_chatter',
        authorName: 'Film Chatter',
        authorHandle: '@filmchatter',
        authorAvatar: '🎬',
        content: `${release.name}: ${audienceRead}`,
        timestamp: Date.now(),
        likes: reach,
        retweets: Math.floor(reach * (negative ? 0.28 : 0.18)),
        replies: Math.floor(reach * (negative ? 0.34 : 0.12)),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'FILM_OPINION',
        sentiment: negative ? 'MESSY' : 'SUPPORTIVE',
        controversyScore: negative ? 35 : 0
    };
};

export const evaluatePostReleaseReality = (
    release: ActiveRelease,
    week: number,
    year: number
): MarketingRealityResult => {
    const details = release.projectDetails;
    const hidden = details.hiddenStats;
    const positioning = details.campaignPositioning || hidden.campaignPromise || 'MASS_EVENT';
    const promised = POSITION_PROMISE[positioning];
    const fit = details.campaignFitSnapshot;
    const forecast = details.campaignForecastSnapshot;
    const openingActual = Math.max(0, release.weeklyGross[0] || release.totalGross || 0);
    const forecastOpeningHigh = Math.max(1, safeNumber(forecast?.openingWeekendHigh, openingActual || release.budget * 0.25));
    const openingVsForecast = openingActual / forecastOpeningHigh;
    const quality = clamp(safeNumber(hidden.qualityScore, (release.imdbRating || 5) * 10));
    const audienceScore = Math.round(clamp((release.imdbRating || 5) * 10 + (openingVsForecast - 0.75) * 18 + (quality - 55) * 0.14));
    const criticScore = Math.round(clamp((quality * 0.62) + (safeNumber(hidden.scriptQuality, quality) * 0.2) + (safeNumber(hidden.directorQuality, quality) * 0.18)));
    const spend = safeNumber(details.marketingBudgetSpent, 0);
    const budget = Math.max(1, safeNumber(release.budget || details.estimatedBudget, 1));
    const spendRatio = spend / budget;
    const falseRisk = fit?.falseMarketingRisk || hidden.falseMarketingRisk || 'LOW';
    const overspendRisk = fit?.overspendRisk || hidden.campaignOverspendRisk || 'LOW';

    let outcome: CampaignRealityOutcome = 'CAMPAIGN_DELIVERED';
    if (positioning === 'VIRAL_HEAT' && audienceScore < 48 && (falseRisk === 'HIGH' || falseRisk === 'SEVERE')) {
        outcome = 'VIRAL_BACKLASH';
    } else if (positioning === 'PRESTIGE_PUSH' && criticScore < 58) {
        outcome = 'PRESTIGE_REJECTED';
    } else if ((falseRisk === 'SEVERE' || overspendRisk === 'SEVERE' || spendRatio > 1.25) && audienceScore < 58) {
        outcome = 'OVERHYPED';
    } else if ((details.campaignTimeline || hidden.campaignTimeline) === 'FRONT_LOADED_OPENING' && openingVsForecast >= 0.78 && audienceScore < 58) {
        outcome = 'EVENT_DROP_OFF';
    } else if ((details.campaignTimeline || hidden.campaignTimeline) === 'SLOW_BURN_WOM' && quality >= 78 && audienceScore >= 72) {
        outcome = 'WORD_OF_MOUTH_BREAKOUT';
    } else if (spendRatio < 0.12 && audienceScore >= 76) {
        outcome = 'HIDDEN_GEM';
    } else if (fit && fit.fitScore < 50 && audienceScore >= 58) {
        outcome = 'MISPOSITIONED';
    }

    const tone = getTone(outcome);
    const label = outcomeLabel[outcome];
    const audienceRead = getAudienceRead(outcome);
    const criticRead = getCriticRead(outcome, criticScore);
    const summary = getSummary(outcome, release.name, promised);
    const forecastShift = getForecastShift(outcome);
    const buzzDelta = outcome === 'WORD_OF_MOUTH_BREAKOUT' ? 18 : outcome === 'HIDDEN_GEM' ? 12 : tone === 'NEGATIVE' ? -12 : 3;
    const reputationDelta = outcome === 'CAMPAIGN_DELIVERED' ? 2 : outcome === 'WORD_OF_MOUTH_BREAKOUT' ? 4 : tone === 'NEGATIVE' ? -4 : -1;
    const franchiseValueDelta = outcome === 'WORD_OF_MOUTH_BREAKOUT' ? 5 : outcome === 'EVENT_DROP_OFF' || outcome === 'OVERHYPED' ? -4 : outcome === 'CAMPAIGN_DELIVERED' ? 2 : 0;
    const newsworthy = tone !== 'MIXED' && outcome !== 'CAMPAIGN_DELIVERED';

    const review: Review = {
        id: `review_marketing_reality_${release.id}`,
        author: 'Audience Desk',
        publication: 'IMDb Audience Pulse',
        text: makeReviewText(outcome, promised),
        sentiment: tone === 'POSITIVE' ? 'POSITIVE' : tone === 'NEGATIVE' ? 'NEGATIVE' : 'MIXED',
        type: 'AUDIENCE',
        rating: Math.max(1, Math.min(5, Math.round(audienceScore / 20)))
    };

    return {
        outcome,
        label,
        tone,
        promised,
        audienceRead,
        criticRead,
        summary,
        forecastShift,
        audienceScore,
        criticScore,
        buzzDelta,
        reputationDelta,
        franchiseValueDelta,
        newsworthy,
        checkedWeek: week,
        checkedYear: year,
        shouldCreatePopup: false,
        review,
        newsItem: newsworthy ? makeNews(release, outcome, summary, week, year) : undefined,
        socialPost: newsworthy ? makeSocialPost(release, outcome, audienceRead, week) : undefined
    };
};
