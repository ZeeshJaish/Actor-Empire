import type { CampaignFitSnapshot, CampaignForecastSnapshot, CampaignPositioning, CampaignRiskLevel, CampaignTimeline, Genre, MarketingChannelAllocations, MarketingChannelId, ProjectDetails, ProjectHiddenStats } from '../types';
import { calculateProjectMusicImpact } from './musicIndustry';

type CampaignPositioningOption = {
    id: CampaignPositioning;
    label: string;
    shortLabel: string;
    description: string;
    promise: string;
};

type CampaignTimelineOption = {
    id: CampaignTimeline;
    label: string;
    shortLabel: string;
    description: string;
    promise: string;
};

export const CAMPAIGN_POSITIONING_OPTIONS: CampaignPositioningOption[] = [
    {
        id: 'MASS_EVENT',
        label: 'Mass Event',
        shortLabel: 'Event',
        description: 'Big, loud, opening-weekend demand.',
        promise: 'Spectacle'
    },
    {
        id: 'PRESTIGE_PUSH',
        label: 'Prestige Push',
        shortLabel: 'Prestige',
        description: 'Critics, awards rooms, and high-status press.',
        promise: 'Quality'
    },
    {
        id: 'FANBASE_MOBILIZATION',
        label: 'Fanbase Mobilization',
        shortLabel: 'Fanbase',
        description: 'Lore, cast loyalty, franchise energy.',
        promise: 'Belonging'
    },
    {
        id: 'VIRAL_HEAT',
        label: 'Viral Heat',
        shortLabel: 'Viral',
        description: 'Memes, short clips, and conversation spikes.',
        promise: 'Conversation'
    },
    {
        id: 'SLEEPER_BUILD',
        label: 'Sleeper Build',
        shortLabel: 'Sleeper',
        description: 'Controlled rollout built around word of mouth.',
        promise: 'Discovery'
    }
];

export const CAMPAIGN_TIMELINE_OPTIONS: CampaignTimelineOption[] = [
    {
        id: 'FRONT_LOADED_OPENING',
        label: 'Front-Loaded Opening',
        shortLabel: 'Front-Loaded',
        description: 'Spend attention early for a bigger opening, with sharper drop risk.',
        promise: 'Opening'
    },
    {
        id: 'BALANCED_ROLLOUT',
        label: 'Balanced Rollout',
        shortLabel: 'Balanced',
        description: 'Steady awareness before release and enough support after launch.',
        promise: 'Steady'
    },
    {
        id: 'SLOW_BURN_WOM',
        label: 'Slow-Burn Word of Mouth',
        shortLabel: 'Slow-Burn',
        description: 'Protect the launch and let reception build the run over time.',
        promise: 'Legs'
    },
    {
        id: 'LAST_WEEK_BLITZ',
        label: 'Last-Week Blitz',
        shortLabel: 'Last-Week Blitz',
        description: 'A late spike that can break through, but makes the forecast volatile.',
        promise: 'Spike'
    }
];

type MarketingChannelOption = {
    id: MarketingChannelId;
    label: string;
    shortLabel: string;
    description: string;
    buzzWeight: number;
};

export const MARKETING_CHANNEL_OPTIONS: MarketingChannelOption[] = [
    { id: 'TRAILER_LAUNCH', label: 'Trailer Launch', shortLabel: 'Trailer', description: 'Awareness baseline and first impression.', buzzWeight: 1.05 },
    { id: 'SOCIAL_DIGITAL', label: 'Social / Digital', shortLabel: 'Social', description: 'Targeted always-on attention.', buzzWeight: 1 },
    { id: 'TV_OUTDOOR', label: 'TV / Outdoor', shortLabel: 'TV', description: 'Mass-market reach.', buzzWeight: 0.9 },
    { id: 'RED_CARPET', label: 'Red Carpet', shortLabel: 'Premiere', description: 'Press event and celebrity photography.', buzzWeight: 0.78 },
    { id: 'CRITIC_SCREENINGS', label: 'Critic Screenings', shortLabel: 'Critics', description: 'Reviewer access and prestige oxygen.', buzzWeight: 0.82 },
    { id: 'INFLUENCER_PUSH', label: 'Influencer Push', shortLabel: 'Influencer', description: 'Creator-led conversion.', buzzWeight: 0.94 },
    { id: 'INTERNATIONAL', label: 'International', shortLabel: 'Global', description: 'Non-domestic market support.', buzzWeight: 0.88 },
    { id: 'FAN_EVENTS', label: 'Fan Events', shortLabel: 'Fans', description: 'Community screenings and fan moments.', buzzWeight: 0.86 }
];

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const safeNumber = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const includesGenre = (genre: Genre | undefined, genres: Genre[]) => genre ? genres.includes(genre) : false;

const toRisk = (score: number): CampaignRiskLevel => {
    if (score >= 78) return 'SEVERE';
    if (score >= 55) return 'HIGH';
    if (score >= 32) return 'MEDIUM';
    return 'LOW';
};

const unique = (items: string[]) => Array.from(new Set(items)).slice(0, 3);

export const normalizeMarketingChannelAllocations = (
    allocations: MarketingChannelAllocations = {},
    pool = 0
): { allocations: MarketingChannelAllocations; totalSpent: number; remaining: number } => {
    const safePool = Math.max(0, Math.floor(safeNumber(pool, 0)));
    let remaining = safePool;
    const normalized: MarketingChannelAllocations = {};

    MARKETING_CHANNEL_OPTIONS.forEach(channel => {
        const requested = Math.max(0, Math.floor(safeNumber(allocations[channel.id], 0)));
        const applied = Math.min(requested, remaining);
        normalized[channel.id] = applied;
        remaining -= applied;
    });

    return {
        allocations: normalized,
        totalSpent: safePool - remaining,
        remaining
    };
};

export const calculateCampaignFit = (
    project: Partial<ProjectDetails>,
    positioning: CampaignPositioning,
    plannedSpend = 0
): CampaignFitSnapshot => {
    const hiddenStats: Partial<ProjectHiddenStats> = project.hiddenStats || {};
    const quality = clamp(safeNumber(hiddenStats.qualityScore, 50));
    const script = clamp(safeNumber(hiddenStats.scriptQuality, quality));
    const director = clamp(safeNumber(hiddenStats.directorQuality, quality));
    const cast = clamp(safeNumber(hiddenStats.castingStrength, 50));
    const hype = clamp(safeNumber(hiddenStats.rawHype, 50));
    const prestige = clamp(safeNumber(hiddenStats.prestigeBonus, 0));
    const fameMultiplier = Math.max(1, safeNumber(hiddenStats.fameMultiplier, 1));
    const budget = Math.max(1_000_000, safeNumber(project.estimatedBudget, 1_000_000));
    const spend = Math.max(0, safeNumber(plannedSpend, 0));
    const hasIp = Boolean(project.franchiseId || project.universeId || project.subtype === 'SEQUEL' || project.subtype === 'SPINOFF' || project.subtype === 'REBOOT' || project.subtype === 'UNIVERSE_ENTRY' || project.subtype === 'UNIVERSE_EVENT' || project.subtype === 'UNIVERSE_CROSSOVER');
    const genre = project.genre;

    const budgetPower = clamp(35 + Math.log10(Math.max(1, budget / 1_000_000)) * 24);
    const famePower = clamp((fameMultiplier - 1) * 12);
    const ipPower = hasIp ? 88 : 28;
    const audiencePower = clamp((hype * 0.34) + (cast * 0.22) + (budgetPower * 0.16) + (famePower * 0.14) + (ipPower * 0.14));
    const criticPower = clamp((quality * 0.42) + (script * 0.22) + (director * 0.2) + (prestige * 0.16));

    const spectacleGenre = includesGenre(genre, ['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY', 'ANIMATION']) ? 92 : 48;
    const prestigeGenre = includesGenre(genre, ['DRAMA', 'BIOPIC', 'MUSICAL', 'DOCUMENTARY', 'CRIME', 'MYSTERY']) ? 88 : 46;
    const fanbaseGenre = includesGenre(genre, ['SUPERHERO', 'SCI_FI', 'FANTASY', 'ANIMATION', 'ADVENTURE', 'HORROR']) ? 84 : 42;
    const viralGenre = includesGenre(genre, ['COMEDY', 'HORROR', 'THRILLER', 'ROMANCE', 'MYSTERY', 'ACTION']) ? 86 : 50;

    let fitScore = 50;
    let audienceMatch = audiencePower;
    let criticMatch = criticPower;
    let promisePressure = 0;
    let spendTolerance = 0.75;
    const strengths: string[] = [];
    const risks: string[] = [];

    switch (positioning) {
        case 'MASS_EVENT':
            fitScore = (audiencePower * 0.42) + (spectacleGenre * 0.24) + (budgetPower * 0.18) + (quality * 0.16);
            audienceMatch = clamp((audiencePower * 0.68) + (spectacleGenre * 0.32));
            criticMatch = clamp((criticPower * 0.72) + (quality * 0.28));
            promisePressure = 70 - ((quality * 0.42) + (cast * 0.2) + (hype * 0.2) + (spectacleGenre * 0.18));
            spendTolerance = 1.2;
            if (spectacleGenre >= 80) strengths.push('Spectacle genre fit');
            if (!hasIp && hype < 55) risks.push('No built-in event audience');
            break;
        case 'PRESTIGE_PUSH':
            fitScore = (criticPower * 0.62) + (prestigeGenre * 0.22) + (quality * 0.16);
            audienceMatch = clamp((audiencePower * 0.48) + (prestigeGenre * 0.2) + (quality * 0.32));
            criticMatch = clamp((criticPower * 0.72) + (prestigeGenre * 0.28));
            promisePressure = 76 - ((quality * 0.5) + (script * 0.2) + (director * 0.18) + (prestigeGenre * 0.12));
            spendTolerance = 0.78;
            if (criticPower >= 70) strengths.push('Strong critic-facing package');
            if (quality < 65) risks.push('Prestige promise may expose weak material');
            break;
        case 'FANBASE_MOBILIZATION':
            fitScore = (ipPower * 0.34) + (fanbaseGenre * 0.24) + (audiencePower * 0.24) + (quality * 0.18);
            audienceMatch = clamp((ipPower * 0.36) + (fanbaseGenre * 0.28) + (audiencePower * 0.36));
            criticMatch = clamp((criticPower * 0.62) + (quality * 0.38));
            promisePressure = 66 - ((quality * 0.34) + (ipPower * 0.28) + (hype * 0.22) + (fanbaseGenre * 0.16));
            spendTolerance = 1.05;
            if (hasIp) strengths.push('Built-in fanbase');
            if (!hasIp) risks.push('Fanbase hook is thin');
            break;
        case 'VIRAL_HEAT':
            fitScore = (viralGenre * 0.32) + (hype * 0.24) + (quality * 0.2) + (cast * 0.14) + (famePower * 0.1);
            audienceMatch = clamp((viralGenre * 0.36) + (hype * 0.34) + (cast * 0.18) + (famePower * 0.12));
            criticMatch = clamp((criticPower * 0.56) + (quality * 0.44));
            promisePressure = 72 - ((quality * 0.38) + (hype * 0.3) + (viralGenre * 0.2) + (cast * 0.12));
            spendTolerance = 0.68;
            if (viralGenre >= 80) strengths.push('Shareable genre angle');
            if (quality < 55) risks.push('Viral attention can flip negative');
            break;
        case 'SLEEPER_BUILD':
            fitScore = (quality * 0.38) + (script * 0.24) + (criticPower * 0.18) + ((100 - Math.min(90, hype)) * 0.12) + ((100 - Math.min(100, budgetPower)) * 0.08);
            audienceMatch = clamp((quality * 0.36) + (script * 0.22) + (hype * 0.18) + (cast * 0.12) + (prestigeGenre * 0.12));
            criticMatch = clamp((criticPower * 0.72) + (quality * 0.28));
            promisePressure = 58 - ((quality * 0.56) + (script * 0.22) + (director * 0.12) + (prestigeGenre * 0.1));
            spendTolerance = 0.42;
            if (quality >= 72) strengths.push('Word of mouth can carry it');
            if (hype > 78) risks.push('Slow rollout may waste existing demand');
            break;
    }

    const supportScore = clamp((quality * 0.28) + (script * 0.12) + (cast * 0.16) + (hype * 0.2) + (director * 0.1) + (budgetPower * 0.08) + (famePower * 0.06));
    const ipSpendBonus = hasIp ? budget * 0.32 : 0;
    const recommendedSpendCap = Math.max(750_000, Math.round((budget * (0.1 + (supportScore / 100) * 0.5) + ipSpendBonus) * spendTolerance));
    const spendRatio = recommendedSpendCap > 0 ? spend / recommendedSpendCap : 0;
    const overspendPressure = spendRatio <= 1 ? Math.max(0, (spendRatio - 0.72) * 26) : Math.min(100, 32 + ((spendRatio - 1) * 34));
    const falsePressure = clamp(Math.max(0, promisePressure) + (quality < 55 ? (55 - quality) * 0.75 : 0) + (overspendPressure * 0.34) + (fitScore < 52 ? (52 - fitScore) * 0.5 : 0));

    if (spendRatio > 1.25) risks.push('Marketing spend is ahead of what the film can credibly support');
    if (quality < 50 && positioning !== 'SLEEPER_BUILD') risks.push('Audience reaction may punish the promise');
    if (audienceMatch >= 70) strengths.push('Audience hook is clear');
    if (criticMatch >= 70) strengths.push('Critic-facing story is credible');

    const fitPenalty = Math.min(30, Math.max(0, spendRatio - 1) * 9) + (falsePressure >= 78 ? 10 : falsePressure >= 55 ? 5 : 0);
    const finalFit = Math.round(clamp(fitScore - fitPenalty));
    const falseMarketingRisk = toRisk(falsePressure);
    const overspendRisk = toRisk(overspendPressure);

    let warning = 'Marketing can amplify demand, but it cannot repair weak reception.';
    if (falseMarketingRisk === 'SEVERE') warning = 'Campaign promise is far ahead of the movie. Expect backlash if audiences reject it.';
    else if (overspendRisk === 'SEVERE') warning = 'Spend is beyond the project support cap. Extra money has sharply reduced impact.';
    else if (finalFit >= 76) warning = 'Campaign position fits the movie and should convert cleanly if reception holds.';
    else if (positioning === 'SLEEPER_BUILD') warning = 'A patient rollout protects the downside and lets word of mouth update the forecast.';

    return {
        positioning,
        fitScore: finalFit,
        falseMarketingRisk,
        overspendRisk,
        audienceMatch: Math.round(clamp(audienceMatch)),
        criticMatch: Math.round(clamp(criticMatch)),
        recommendedSpendCap,
        warning,
        strengths: unique(strengths),
        risks: unique(risks)
    };
};

export const calculateCampaignForecast = (
    project: Partial<ProjectDetails>,
    positioning: CampaignPositioning,
    allocations: MarketingChannelAllocations = {},
    fit: CampaignFitSnapshot,
    timeline: CampaignTimeline = 'BALANCED_ROLLOUT'
): CampaignForecastSnapshot => {
    const hiddenStats: Partial<ProjectHiddenStats> = project.hiddenStats || {};
    const budget = Math.max(1_000_000, safeNumber(project.estimatedBudget, 1_000_000));
    const quality = clamp(safeNumber(hiddenStats.qualityScore, 50));
    const script = clamp(safeNumber(hiddenStats.scriptQuality, quality));
    const director = clamp(safeNumber(hiddenStats.directorQuality, quality));
    const cast = clamp(safeNumber(hiddenStats.castingStrength, 50));
    const hype = clamp(safeNumber(hiddenStats.rawHype, 50));
    const distribution = clamp(safeNumber(hiddenStats.distributionPower, 45));
    const prestige = clamp(safeNumber(hiddenStats.prestigeBonus, 0));
    const fameMultiplier = Math.max(1, safeNumber(hiddenStats.fameMultiplier, 1));
    const isFranchise = Boolean(project.franchiseId || project.universeId || project.subtype === 'SEQUEL' || project.subtype === 'SPINOFF' || project.subtype === 'UNIVERSE_ENTRY' || project.subtype === 'UNIVERSE_EVENT' || project.subtype === 'UNIVERSE_CROSSOVER');
    const musicImpact = calculateProjectMusicImpact(project as ProjectDetails, (project as ProjectDetails).musicPlan);

    const totalSpend = MARKETING_CHANNEL_OPTIONS.reduce((sum, channel) => sum + Math.max(0, safeNumber(allocations[channel.id], 0)), 0);
    const weightedChannelSpend = MARKETING_CHANNEL_OPTIONS.reduce((sum, channel) => {
        return sum + (Math.max(0, safeNumber(allocations[channel.id], 0)) * channel.buzzWeight);
    }, 0);
    const marketingPower = clamp((Math.log10(1 + (weightedChannelSpend / Math.max(1, budget))) * 44) + (fit.fitScore * 0.22));
    const packagePower = clamp((quality * 0.34) + (script * 0.16) + (director * 0.12) + (cast * 0.16) + (hype * 0.14) + (distribution * 0.08));
    const franchiseBoost = isFranchise ? 0.22 : 0;
    const fameBoost = Math.min(0.65, (fameMultiplier - 1) * 0.08);

    const positioningOpeningBonus: Record<CampaignPositioning, number> = {
        MASS_EVENT: 0.34,
        PRESTIGE_PUSH: -0.05,
        FANBASE_MOBILIZATION: 0.22,
        VIRAL_HEAT: 0.18,
        SLEEPER_BUILD: -0.22
    };
    const positioningLegsBonus: Record<CampaignPositioning, number> = {
        MASS_EVENT: -0.12,
        PRESTIGE_PUSH: 0.18,
        FANBASE_MOBILIZATION: 0.08,
        VIRAL_HEAT: -0.02,
        SLEEPER_BUILD: 0.34
    };
    const timelineOpeningBonus: Record<CampaignTimeline, number> = {
        FRONT_LOADED_OPENING: 0.24,
        BALANCED_ROLLOUT: 0,
        SLOW_BURN_WOM: -0.12,
        LAST_WEEK_BLITZ: 0.14
    };
    const wordOfMouthPower = clamp((quality * 0.52) + (script * 0.22) + (director * 0.14) + (fit.criticMatch * 0.12));
    const timelineLegsBonus: Record<CampaignTimeline, number> = {
        FRONT_LOADED_OPENING: -0.28,
        BALANCED_ROLLOUT: 0,
        SLOW_BURN_WOM: 0.35 + (wordOfMouthPower / 100) * 0.72,
        LAST_WEEK_BLITZ: -0.18
    };
    const timelineDropRisk: Record<CampaignTimeline, number> = {
        FRONT_LOADED_OPENING: 13,
        BALANCED_ROLLOUT: 0,
        SLOW_BURN_WOM: -11,
        LAST_WEEK_BLITZ: 17
    };
    const timelineUncertainty: Record<CampaignTimeline, number> = {
        FRONT_LOADED_OPENING: 0.04,
        BALANCED_ROLLOUT: 0,
        SLOW_BURN_WOM: 0.02,
        LAST_WEEK_BLITZ: 0.16
    };

    const openingMultiplier = Math.max(
        0.08,
        0.18 + (packagePower / 100) * 0.42 + (marketingPower / 100) * 0.3 + (hype / 100) * 0.22 + franchiseBoost + fameBoost + (musicImpact.openingWeekendLiftPct / 100) + positioningOpeningBonus[positioning] + timelineOpeningBonus[timeline]
    );
    const openingBase = budget * openingMultiplier;
    const baseUncertainty = fit.falseMarketingRisk === 'SEVERE' || fit.overspendRisk === 'SEVERE'
        ? 0.42
        : fit.falseMarketingRisk === 'HIGH' || fit.overspendRisk === 'HIGH'
            ? 0.32
            : 0.22;
    const uncertainty = baseUncertainty + timelineUncertainty[timeline];

    const legsMultiplier = Math.max(
        1.35,
        1.85 + (quality / 100) * 1.6 + (fit.fitScore / 100) * 0.72 + (musicImpact.audienceReachLiftPct / 120) - (musicImpact.mismatchBacklashRisk / 260) + positioningLegsBonus[positioning] + timelineLegsBonus[timeline] - (fit.falseMarketingRisk === 'SEVERE' ? 0.72 : fit.falseMarketingRisk === 'HIGH' ? 0.42 : 0)
    );

    const openingWeekendLow = Math.round(openingBase * (1 - uncertainty));
    const openingWeekendHigh = Math.round(openingBase * (1 + uncertainty));
    const totalLow = Math.round(openingWeekendLow * Math.max(1.25, legsMultiplier - uncertainty));
    const totalHigh = Math.round(openingWeekendHigh * (legsMultiplier + uncertainty));
    const totalCost = budget + totalSpend;
    const breakEvenChance = Math.round(clamp(((totalLow + totalHigh) / 2 / Math.max(1, totalCost)) * 42 + (quality - 50) * 0.4 + (fit.fitScore - 50) * 0.28));
    const weekTwoDropRisk = Math.round(clamp(35 + (fit.falseMarketingRisk === 'SEVERE' ? 30 : fit.falseMarketingRisk === 'HIGH' ? 18 : fit.falseMarketingRisk === 'MEDIUM' ? 8 : 0) + (positioning === 'MASS_EVENT' ? 10 : positioning === 'SLEEPER_BUILD' ? -12 : 0) + timelineDropRisk[timeline] + (quality < 55 ? 14 : quality >= 78 ? -10 : 0) + (musicImpact.mismatchBacklashRisk * 0.12) + (musicImpact.controversyRisk * 0.08) - (musicImpact.audienceReachLiftPct * 0.15)));
    const streamingBidBoost = Math.round(clamp((quality - 45) * 0.35 + (fit.audienceMatch - 50) * 0.18 + (totalSpend / Math.max(1, budget)) * 5 + (isFranchise ? 8 : 0) + (musicImpact.streamingInterestLiftPct * 0.42), 0, 48));
    const awardsVisibility = Math.round(clamp((quality - 55) * 0.7 + (prestige * 0.6) + musicImpact.awardChanceLift + (positioning === 'PRESTIGE_PUSH' ? 18 : positioning === 'SLEEPER_BUILD' ? 8 : -4) + ((allocations.CRITIC_SCREENINGS || 0) / Math.max(1, budget)) * 22, 0, 100));
    const franchiseValueImpact = Math.round(clamp((isFranchise ? 8 : 0) + (fit.audienceMatch - 50) * 0.18 + (quality - 55) * 0.12 + (musicImpact.socialHypeLift * 0.12) + (positioning === 'FANBASE_MOBILIZATION' ? 8 : positioning === 'MASS_EVENT' ? 5 : 0), -12, 38));
    const confidenceLabel: CampaignForecastSnapshot['confidenceLabel'] = timeline === 'LAST_WEEK_BLITZ' || fit.falseMarketingRisk === 'SEVERE' || fit.overspendRisk === 'SEVERE'
        ? 'Volatile Estimate'
        : fit.fitScore >= 72
            ? 'Market Read'
            : 'Early Estimate';

    return {
        timeline,
        openingWeekendLow,
        openingWeekendHigh: Math.max(openingWeekendHigh, openingWeekendLow + 1),
        totalRevenueLow: totalLow,
        totalRevenueHigh: Math.max(totalHigh, totalLow + 1),
        breakEvenChance,
        weekTwoDropRisk,
        streamingBidBoost,
        awardsVisibility,
        franchiseValueImpact,
        confidenceLabel
    };
};
