import {
    LockedStreamingFunding,
    NewsItem,
    NextSeasonFundingTier,
    PlatformFundingRelationship,
    StudioFinanceEntry
} from '../types';

export interface PlatformFundingProfile {
    id: string;
    name: string;
    baseBid: number;
    qualityReq: number;
    maxBudget: number;
}

export interface BalancedNextSeasonFundingInput {
    projectBudget: number;
    packageScore: number;
    currentOffer: number;
    platform: PlatformFundingProfile;
    genre?: string;
    rating?: number;
    seasonOneViews?: number;
    streamingRevenue?: number;
    rawHype?: number;
    hasProvenIp?: boolean;
    randomFactor?: number;
}

export interface BalancedNextSeasonFundingResult {
    amount: number;
    tier: NextSeasonFundingTier;
    reason: string;
    score: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatMoneyShort = (value: number) => {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    if (safeValue >= 1_000_000_000) return `$${(safeValue / 1_000_000_000).toFixed(1)}B`;
    if (safeValue >= 1_000_000) return `$${(safeValue / 1_000_000).toFixed(1)}M`;
    if (safeValue >= 1_000) return `$${(safeValue / 1_000).toFixed(0)}k`;
    return `$${safeValue.toLocaleString()}`;
};

const getPlatformGenreFit = (platformId: string, genre?: string) => {
    if (!genre) return 1;
    const normalizedGenre = genre.toUpperCase();
    const fits: Record<string, string[]> = {
        NETFLIX: ['ACTION', 'CRIME', 'MYSTERY', 'DRAMA', 'THRILLER', 'COMEDY'],
        APPLE_TV: ['DRAMA', 'MYSTERY', 'SCI_FI', 'DOCUMENTARY', 'BIOPIC'],
        DISNEY_PLUS: ['ACTION', 'ADVENTURE', 'ANIMATION', 'FANTASY', 'SUPERHERO'],
        HULU: ['DRAMA', 'COMEDY', 'THRILLER', 'MYSTERY', 'ROMANCE'],
        YOUTUBE: ['COMEDY', 'DOCUMENTARY', 'MUSIC', 'REALITY', 'ACTION']
    };

    const preferredGenres = fits[platformId] || [];
    if (preferredGenres.includes(normalizedGenre)) return 1.1;
    if (preferredGenres.length === 0) return 1;
    return 0.92;
};

export const calculateBalancedNextSeasonFundingCap = ({
    projectBudget,
    packageScore,
    currentOffer,
    platform,
    genre,
    rating,
    seasonOneViews,
    streamingRevenue,
    rawHype,
    hasProvenIp = false,
    randomFactor
}: BalancedNextSeasonFundingInput): BalancedNextSeasonFundingResult => {
    const budget = Math.max(0, Math.floor(Number(projectBudget) || 0));
    if (budget <= 0) {
        return {
            amount: 0,
            tier: 'CONSERVATIVE',
            reason: 'No season budget is available yet.',
            score: 0
        };
    }

    const safePackageScore = clamp(Number(packageScore) || 0, 0, 100);
    const safeOffer = Math.max(0, Math.floor(Number(currentOffer) || 0));
    const safePlatformMax = Math.max(1, Math.floor(Number(platform.maxBudget) || 1));
    const safeRating = Number.isFinite(rating) ? clamp(Number(rating), 1, 10) : 6.8;
    const safeViews = Math.max(0, Number(seasonOneViews) || 0);
    const safeRevenue = Math.max(0, Number(streamingRevenue) || 0);
    const safeHype = clamp(Number(rawHype ?? safePackageScore) || 0, 0, 100);
    const variance = 0.94 + clamp(Number(randomFactor ?? Math.random()), 0, 1) * 0.12;

    const platformScale = clamp(safePlatformMax / 560_000_000, 0.12, 1);
    const viewScore = safeViews > 0
        ? clamp(Math.log10(safeViews + 1) / 8.2, 0, 1)
        : clamp(safePackageScore / 115, 0.18, 0.72);
    const ratingScore = clamp((safeRating - 5.2) / 3.8, 0, 1);
    const profitScore = safeRevenue > 0 ? clamp(safeRevenue / budget, 0, 1.35) / 1.35 : clamp(safeOffer / Math.max(1, budget * 1.25), 0.12, 0.75);
    const packageQualityScore = safePackageScore / 100;
    const hypeScore = safeHype / 100;
    const ipScore = hasProvenIp ? 1 : 0;
    const genreFit = getPlatformGenreFit(platform.id, genre);

    const performanceScore = clamp(
        (viewScore * 0.28)
        + (ratingScore * 0.18)
        + (profitScore * 0.22)
        + (packageQualityScore * 0.18)
        + (hypeScore * 0.08)
        + (ipScore * 0.06),
        0,
        1
    );
    const platformAdjustedScore = clamp(performanceScore * (0.86 + platformScale * 0.2) * genreFit, 0, 1.08);

    const isBreakout = platformAdjustedScore >= 0.82 && (safeViews >= 80_000_000 || safeRevenue >= budget * 0.85 || safePackageScore >= 90);
    const isPremium = !isBreakout && platformAdjustedScore >= 0.7;
    const isRiskyBet = platformAdjustedScore < 0.48 && (safeRating >= 7.4 || safePackageScore >= 68 || hasProvenIp);

    let tier: NextSeasonFundingTier = 'CONSERVATIVE';
    if (isBreakout) tier = 'BREAKOUT';
    else if (isPremium) tier = 'PREMIUM';
    else if (platformAdjustedScore >= 0.5) tier = 'STANDARD';
    else if (isRiskyBet) tier = 'RISKY_BET';

    const tierMultiplier: Record<NextSeasonFundingTier, number> = {
        CONSERVATIVE: 0.68,
        RISKY_BET: 0.86,
        STANDARD: 1.02,
        PREMIUM: 1.28,
        BREAKOUT: 1.68
    };
    const tierCeilingBoost: Record<NextSeasonFundingTier, number> = {
        CONSERVATIVE: 0.74,
        RISKY_BET: 0.92,
        STANDARD: 1.12,
        PREMIUM: 1.42,
        BREAKOUT: 1.92
    };

    const budgetAnchor = budget * tierMultiplier[tier] * (0.84 + platformAdjustedScore * 0.34) * variance;
    const offerAnchor = safeOffer * (0.34 + performanceScore * 0.36);
    const platformCeiling = safePlatformMax * (0.62 + platformScale * 0.38) * tierCeilingBoost[tier];
    const globalCeiling = budget * (tier === 'BREAKOUT' ? 2.15 : tier === 'PREMIUM' ? 1.65 : tier === 'STANDARD' ? 1.35 : 0.92);
    const floor = budget * (tier === 'CONSERVATIVE' ? 0.45 : tier === 'RISKY_BET' ? 0.55 : 0.62);
    const amount = Math.floor(Math.max(0, Math.min(platformCeiling, globalCeiling, Math.max(floor, budgetAnchor, offerAnchor))));

    const reason: Record<NextSeasonFundingTier, string> = {
        CONSERVATIVE: 'Funding is limited because Season 1 still needs stronger proof.',
        RISKY_BET: 'The platform is taking a cautious second-season bet on upside.',
        STANDARD: 'Solid Season 1 signals earned a standard next-season cap.',
        PREMIUM: 'Strong reviews, demand, or revenue earned a premium cap.',
        BREAKOUT: 'Breakout demand pushed the platform to stretch its cap.'
    };

    return {
        amount,
        tier,
        reason: reason[tier],
        score: Math.round(platformAdjustedScore * 100)
    };
};

interface LockedSeasonFundingInput {
    budget: number;
    lockedFunding?: LockedStreamingFunding | null;
    lockedStreamingFunds?: LockedStreamingFunding[];
    projectId: string;
    studioBalance: number;
    productionFund?: number;
    week?: number;
    year?: number;
    newsYear?: number;
    projectTitle?: string;
}

export interface LockedSeasonFundingResult {
    lockedFundApplied: number;
    unusedFundingReturned: number;
    productionFundApplied: number;
    studioSpend: number;
    nextStudioBalance: number;
    nextProductionFund: number;
    updatedLockedStreamingFunds: LockedStreamingFunding[];
    ledgerEntries: StudioFinanceEntry[];
    feedbackMessages: string[];
    news: NewsItem | null;
}

export const markHiddenSeasonFundingUsed = <T extends { hiddenStats?: Record<string, any> }>(
    details: T | undefined,
    lockedFunding: LockedStreamingFunding | null | undefined,
    projectId: string
): T | undefined => {
    if (!details || !lockedFunding || !details.hiddenStats) return details;

    const hiddenStats = details.hiddenStats;
    const fundingAmount = Math.max(0, Math.floor(Number(lockedFunding.amount) || 0));
    const hiddenFundingAmount = Math.max(0, Math.floor(Number(hiddenStats.nextSeasonFundingAmount) || 0));
    const matchesFunding = hiddenStats.nextSeasonFundingSourceProjectId === lockedFunding.sourceProjectId
        || (!hiddenStats.nextSeasonFundingSourceProjectId
            && hiddenStats.nextSeasonFundingPlatformId === lockedFunding.platformId
            && fundingAmount > 0
            && hiddenFundingAmount === fundingAmount);

    if (!matchesFunding || hiddenStats.nextSeasonFundingUsedByProjectId) return details;

    return {
        ...details,
        hiddenStats: {
            ...hiddenStats,
            nextSeasonFundingUsedByProjectId: projectId
        }
    };
};

export const applyLockedSeasonFunding = ({
    budget,
    lockedFunding,
    lockedStreamingFunds = [],
    projectId,
    studioBalance,
    productionFund = 0,
    week = 0,
    year = 0,
    newsYear = year,
    projectTitle = 'Season'
}: LockedSeasonFundingInput): LockedSeasonFundingResult => {
    const safeBudget = Math.max(0, Math.floor(Number(budget) || 0));
    const safeStudioBalance = Math.floor(Number(studioBalance) || 0);
    const safeProductionFund = Math.max(0, Math.floor(Number(productionFund) || 0));
    const canUseLockedFunding = !!lockedFunding
        && !lockedFunding.usedByProjectId
        && Math.max(0, Math.floor(Number(lockedFunding.amount) || 0)) > 0;

    let remainingBudgetToPay = safeBudget;
    let lockedFundApplied = 0;
    let unusedFundingReturned = 0;
    let updatedLockedStreamingFunds = [...lockedStreamingFunds];
    const ledgerEntries: StudioFinanceEntry[] = [];

    if (canUseLockedFunding && lockedFunding) {
        const fundingCap = Math.max(0, Math.floor(Number(lockedFunding.amount) || 0));
        lockedFundApplied = Math.min(remainingBudgetToPay, fundingCap);
        unusedFundingReturned = Math.max(0, fundingCap - lockedFundApplied);
        remainingBudgetToPay -= lockedFundApplied;
        updatedLockedStreamingFunds = updatedLockedStreamingFunds
            .map(fund => fund.id === lockedFunding.id ? { ...fund, usedByProjectId: projectId } : fund)
            .filter(fund => fund.id !== lockedFunding.id);
    }

    const productionFundApplied = Math.min(safeProductionFund, remainingBudgetToPay);
    remainingBudgetToPay -= productionFundApplied;
    const nextProductionFund = safeProductionFund - productionFundApplied;
    const studioSpend = remainingBudgetToPay;
    const nextStudioBalance = safeStudioBalance - studioSpend;
    const platformName = lockedFunding?.platformName || 'Platform';
    const sourceTitle = lockedFunding?.sourceTitle || projectTitle;
    const feedbackMessages: string[] = [];
    let news: NewsItem | null = null;

    ledgerEntries.push({
        id: `studio_ledger_greenlight_${projectId}_${Date.now()}`,
        week,
        year,
        amount: -studioSpend,
        type: 'PRODUCTION_SPEND',
        label: lockedFundApplied > 0
            ? studioSpend > 0
                ? `${projectTitle} over-cap spend (${platformName} covered ${formatMoneyShort(lockedFundApplied)})`
                : `${projectTitle} greenlight fully covered by ${platformName} renewal cap`
            : `${projectTitle} greenlight spend`,
        projectId
    });

    if (lockedFundApplied > 0 && lockedFunding) {
        feedbackMessages.push(`${platformName} renewed ${sourceTitle}. Season 2 funding cap used: ${formatMoneyShort(lockedFundApplied)}.`);
        feedbackMessages.push(`${platformName} already committed Season 2 funding, so the bidding room stayed closed.`);
        if (studioSpend > 0) {
            feedbackMessages.push(`Studio added ${formatMoneyShort(studioSpend)} above the ${platformName} cap.`);
        }
        if (unusedFundingReturned > 0) {
            feedbackMessages.push(`Unused ${formatMoneyShort(unusedFundingReturned)} of the ${platformName} cap returned to the platform.`);
        }

        const financeNote = studioSpend > 0
            ? `The platform covered ${formatMoneyShort(lockedFundApplied)} and the studio added ${formatMoneyShort(studioSpend)} above the platform cap.`
            : unusedFundingReturned > 0
                ? `The season came in under cap, so unused funding returned to the platform.`
                : `${platformName} covered the full season budget.`;

        news = {
            id: `news_season_funding_${projectId}_${Date.now()}`,
            headline: `${platformName} renews ${sourceTitle}`,
            subtext: `${projectTitle} moves forward with committed Season 2 funding. ${financeNote}`,
            category: 'INDUSTRY',
            week,
            year: newsYear,
            impactLevel: studioSpend > 0 ? 'HIGH' : 'MEDIUM'
        };
    }

    return {
        lockedFundApplied,
        unusedFundingReturned,
        productionFundApplied,
        studioSpend,
        nextStudioBalance,
        nextProductionFund,
        updatedLockedStreamingFunds,
        ledgerEntries,
        feedbackMessages,
        news
    };
};

export const STREAMING_FUNDING_DEADLINE_WEEKS = 104;
export const STREAMING_FUNDING_FIRST_WARNING_WEEKS = 26;
export const STREAMING_FUNDING_FINAL_WARNING_WEEKS = 8;

export type StreamingFundingContractEventType = 'WARNING' | 'FINAL_WARNING' | 'DEFAULT';

export interface StreamingFundingContractEvent {
    type: StreamingFundingContractEventType;
    funding: LockedStreamingFunding;
    weeksRemaining: number;
}

interface ProcessStreamingFundingContractsInput {
    lockedStreamingFunds?: LockedStreamingFunding[];
    platformRelations?: Record<string, PlatformFundingRelationship>;
    currentWeek: number;
    currentYear: number;
}

export interface ProcessStreamingFundingContractsResult {
    lockedStreamingFunds: LockedStreamingFunding[];
    platformRelations: Record<string, PlatformFundingRelationship>;
    events: StreamingFundingContractEvent[];
}

const getAbsoluteContractWeek = (year: number, week: number) => {
    const safeYear = Math.max(0, Math.floor(Number(year) || 0));
    const safeWeek = clamp(Math.floor(Number(week) || 1), 1, 52);
    return (safeYear * 52) + (safeWeek - 1);
};

const recoverPlatformRelations = (
    relations: Record<string, PlatformFundingRelationship>
): Record<string, PlatformFundingRelationship> => Object.fromEntries(
    Object.entries(relations).flatMap(([platformId, relation]) => {
        const remaining = Math.max(0, Math.floor(Number(relation.recoveryWeeksRemaining) || 0) - 1);
        if (remaining <= 0) return [];

        return [[platformId, {
            ...relation,
            recoveryWeeksRemaining: remaining,
            trustModifier: -Math.max(1, Math.ceil(remaining / 6))
        }]];
    })
);

export const processStreamingFundingContracts = ({
    lockedStreamingFunds = [],
    platformRelations = {},
    currentWeek,
    currentYear
}: ProcessStreamingFundingContractsInput): ProcessStreamingFundingContractsResult => {
    const events: StreamingFundingContractEvent[] = [];
    const nextFunds: LockedStreamingFunding[] = [];
    const nextRelations = recoverPlatformRelations(platformRelations);
    const currentAbsoluteWeek = getAbsoluteContractWeek(currentYear, currentWeek);

    lockedStreamingFunds.forEach(funding => {
        if (funding.usedByProjectId) return;

        const createdWeek = clamp(Math.floor(Number(funding.createdWeek) || 1), 1, 52);
        const createdYear = Math.max(0, Math.floor(Number(funding.createdYear) || currentYear));
        const extensionWeeks = Math.max(0, Math.floor(Number(funding.deadlineExtensionWeeks) || 0));
        const deadlineWeeks = STREAMING_FUNDING_DEADLINE_WEEKS + extensionWeeks;
        const ageWeeks = Math.max(0, currentAbsoluteWeek - getAbsoluteContractWeek(createdYear, createdWeek));
        const weeksRemaining = deadlineWeeks - ageWeeks;

        if (weeksRemaining <= 0) {
            const existingRelation = nextRelations[funding.platformId];
            const currentPenalty = Math.min(0, Math.floor(Number(existingRelation?.trustModifier) || 0));
            const currentRecovery = Math.max(0, Math.floor(Number(existingRelation?.recoveryWeeksRemaining) || 0));

            nextRelations[funding.platformId] = {
                trustModifier: Math.max(-8, currentPenalty - 4),
                recoveryWeeksRemaining: Math.min(36, Math.max(24, currentRecovery + 6)),
                lastBreachWeek: currentWeek,
                lastBreachYear: currentYear
            };
            events.push({ type: 'DEFAULT', funding, weeksRemaining: 0 });
            return;
        }

        if (weeksRemaining <= STREAMING_FUNDING_FINAL_WARNING_WEEKS && funding.warningStage !== 'FINAL') {
            const updatedFunding = { ...funding, warningStage: 'FINAL' as const };
            nextFunds.push(updatedFunding);
            events.push({ type: 'FINAL_WARNING', funding: updatedFunding, weeksRemaining });
            return;
        }

        if (weeksRemaining <= STREAMING_FUNDING_FIRST_WARNING_WEEKS && !funding.warningStage) {
            const updatedFunding = { ...funding, warningStage: 'FIRST' as const };
            nextFunds.push(updatedFunding);
            events.push({ type: 'WARNING', funding: updatedFunding, weeksRemaining });
            return;
        }

        nextFunds.push(funding);
    });

    return {
        lockedStreamingFunds: nextFunds,
        platformRelations: nextRelations,
        events
    };
};

export const getPlatformFundingRelationshipMultiplier = (
    relation?: PlatformFundingRelationship
) => clamp(1 + ((Number(relation?.trustModifier) || 0) * 0.02), 0.84, 1);
