import {
    ActiveRelease,
    FuturePotential,
    NewsItem,
    NextSeasonFundingTier,
    PlatformId,
    Player,
    RareHollywoodChaosKind
} from '../types';
import { calculateBalancedNextSeasonFundingCap, PlatformFundingProfile } from './streamingFundingLogic';
import { PLATFORMS } from './streamingLogic';

export interface RareHollywoodChaosFunding {
    amount: number;
    tier: NextSeasonFundingTier;
    reason: string;
}

export interface RareHollywoodChaosResult {
    kind: RareHollywoodChaosKind;
    reason: string;
    news: NewsItem;
    futurePotentialPatch: Partial<FuturePotential>;
    continuationSubtype?: 'SEQUEL' | 'REBOOT';
    platformId?: PlatformId;
    platformName?: string;
    funding?: RareHollywoodChaosFunding;
}

interface ResolveRareHollywoodChaosInput {
    release: ActiveRelease;
    player: Player;
    isPlayerProduction: boolean;
    forcedKind?: RareHollywoodChaosKind;
    random?: () => number;
}

const PLATFORM_FUNDING_PROFILES: Record<PlatformId, PlatformFundingProfile> = {
    NETFLIX: { id: 'NETFLIX', name: 'Netflix', baseBid: 12_000_000, qualityReq: 72, maxBudget: 420_000_000 },
    APPLE_TV: { id: 'APPLE_TV', name: 'Apple TV+', baseBid: 17_000_000, qualityReq: 82, maxBudget: 560_000_000 },
    DISNEY_PLUS: { id: 'DISNEY_PLUS', name: 'Disney+', baseBid: 11_000_000, qualityReq: 70, maxBudget: 520_000_000 },
    HULU: { id: 'HULU', name: 'Hulu', baseBid: 7_500_000, qualityReq: 58, maxBudget: 180_000_000 },
    YOUTUBE: { id: 'YOUTUBE', name: 'YouTube Premium', baseBid: 3_000_000, qualityReq: 38, maxBudget: 80_000_000 }
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatMoneyShort = (value: number) => {
    const safeValue = Math.max(0, Math.floor(Number(value) || 0));
    if (safeValue >= 1_000_000_000) return `$${(safeValue / 1_000_000_000).toFixed(1)}B`;
    if (safeValue >= 1_000_000) return `$${(safeValue / 1_000_000).toFixed(0)}M`;
    return `$${safeValue.toLocaleString()}`;
};

const getRecentViewRetention = (release: ActiveRelease) => {
    const views = release.streaming?.weeklyViews?.slice(-4).filter(value => Number.isFinite(value) && value >= 0) || [];
    if (views.length < 2) return 0;
    return views[views.length - 1] / Math.max(1, views[0]);
};

const hasProvenIp = (release: ActiveRelease) => Boolean(
    release.projectDetails.franchiseId
    || release.projectDetails.universeId
    || release.projectDetails.isFamous
    || (release.projectDetails.installmentNumber || 1) > 1
    || release.projectDetails.subtype === 'SEQUEL'
    || release.projectDetails.subtype === 'SPINOFF'
);

const getPlayerStudio = (release: ActiveRelease, player: Player) =>
    player.businesses?.find(business =>
        business.type === 'PRODUCTION_HOUSE'
        && business.id === release.projectDetails.studioId
    );

const getFailureSuppression = (release: ActiveRelease, player: Player, isPlayerProduction: boolean) => {
    if (!isPlayerProduction) return 1;
    const flopStreak = getPlayerStudio(release, player)?.stats.recentFlopStreak || 0;
    return clamp(1 - (flopStreak * 0.15), 0.35, 1);
};

const pickAlternatePlatform = (
    currentPlatformId: string | null | undefined,
    random: () => number
): PlatformId => {
    const available = (Object.keys(PLATFORMS) as PlatformId[]).filter(id => id !== currentPlatformId);
    const index = Math.min(available.length - 1, Math.floor(clamp(random(), 0, 0.999999) * available.length));
    return available[index] || 'NETFLIX';
};

const getCurrentPlatform = (release: ActiveRelease): PlatformId => {
    const platformId = release.streaming?.platformId || release.projectDetails.hiddenStats.platformId;
    return platformId && platformId in PLATFORMS ? platformId as PlatformId : 'NETFLIX';
};

const makeNews = (
    release: ActiveRelease,
    player: Player,
    kind: RareHollywoodChaosKind,
    headline: string,
    subtext: string
): NewsItem => ({
    id: `rare_chaos_${kind.toLowerCase()}_${release.id}_${player.age}_${player.currentWeek}`,
    headline,
    subtext,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: 'HIGH'
});

const getEligibility = (release: ActiveRelease) => {
    const budget = Math.max(1, Number(release.budget) || Number(release.projectDetails.estimatedBudget) || 1);
    const roi = Math.max(0, Number(release.totalGross) || 0) / budget;
    const rating = clamp(Number(release.imdbRating) || 5, 1, 10);
    const performance = clamp(Number(release.productionPerformance) || 50, 0, 100);
    const hype = clamp(Number(release.projectDetails.hiddenStats.rawHype) || 0, 0, 100);
    const totalViews = Math.max(0, Number(release.streaming?.totalViews) || 0);
    const retention = getRecentViewRetention(release);
    const provenIp = hasProvenIp(release);

    return {
        roi,
        rating,
        performance,
        hype,
        totalViews,
        retention,
        provenIp,
        flopSequel: release.type === 'MOVIE'
            && provenIp
            && roi >= 0.6
            && roi < 1.9
            && rating >= 6
            && (performance >= 58 || hype >= 72),
        reboot: release.type === 'MOVIE'
            && provenIp
            && roi < 1.35
            && rating >= 4.8
            && (release.projectDetails.installmentNumber || 1) >= 2,
        revival: release.type === 'SERIES'
            && rating >= 7.2
            && (totalViews >= 8_000_000 || retention >= 0.62 || performance >= 76),
        moonshot: release.type === 'SERIES'
            && rating >= 5.6
            && rating < 7.6
            && (performance >= 58 || hype >= 65 || provenIp)
    };
};

export const resolveRareHollywoodChaos = ({
    release,
    player,
    isPlayerProduction,
    forcedKind,
    random = Math.random
}: ResolveRareHollywoodChaosInput): RareHollywoodChaosResult | null => {
    const hiddenStats = release.projectDetails.hiddenStats;
    if (hiddenStats.rareChaosResolved) return null;

    const eligibility = getEligibility(release);
    const suppression = getFailureSuppression(release, player, isPlayerProduction);
    const selectedForcedKind = forcedKind || hiddenStats.forcedRareChaosKind;
    const chanceRoll = clamp(random(), 0, 1);

    let kind: RareHollywoodChaosKind | null = null;
    if (selectedForcedKind) {
        const isEligible = {
            FLOP_SEQUEL_GAMBLE: eligibility.flopSequel,
            CANCELLED_SHOW_REVIVAL: eligibility.revival,
            PLATFORM_MOONSHOT: eligibility.moonshot,
            STUDIO_REBOOT_GAMBLE: eligibility.reboot
        }[selectedForcedKind];
        if (isEligible) kind = selectedForcedKind;
    } else if (release.type === 'SERIES') {
        const revivalChance = (0.018
            + (eligibility.rating >= 8.2 ? 0.012 : 0)
            + (eligibility.retention >= 0.8 ? 0.01 : 0)) * suppression;
        const moonshotChance = 0.012 * suppression;

        if (eligibility.revival && chanceRoll < revivalChance) {
            kind = 'CANCELLED_SHOW_REVIVAL';
        } else if (eligibility.moonshot && chanceRoll < revivalChance + moonshotChance) {
            kind = 'PLATFORM_MOONSHOT';
        }
    } else {
        const rebootChance = 0.012 * suppression;
        const sequelChance = (0.02 + (eligibility.hype >= 85 ? 0.01 : 0)) * suppression;

        if (eligibility.reboot && chanceRoll < rebootChance) {
            kind = 'STUDIO_REBOOT_GAMBLE';
        } else if (eligibility.flopSequel && chanceRoll < rebootChance + sequelChance) {
            kind = 'FLOP_SEQUEL_GAMBLE';
        }
    }

    if (!kind) return null;

    if (kind === 'CANCELLED_SHOW_REVIVAL') {
        const currentPlatformId = getCurrentPlatform(release);
        const platformId = pickAlternatePlatform(currentPlatformId, random);
        const platformName = PLATFORMS[platformId].name;
        const reason = eligibility.retention >= 0.8
            ? 'Late audience growth convinced a rival platform that the show still has life.'
            : eligibility.rating >= 8.2
                ? 'Critical acclaim and cult demand created a second-chance market.'
                : 'Fan demand pushed a rival platform to revive the cancelled series.';

        return {
            kind,
            reason,
            platformId,
            platformName,
            futurePotentialPatch: {
                isRenewed: true,
                seriesStatus: 'RUNNING',
                renewalChance: Math.max(55, Math.round(eligibility.rating * 8))
            },
            news: makeNews(
                release,
                player,
                kind,
                `${platformName} Revives "${release.name}" After Fan Campaign`,
                `${reason} The revival is a rare exception, not a normal renewal.`
            )
        };
    }

    if (kind === 'PLATFORM_MOONSHOT') {
        const platformId = getCurrentPlatform(release);
        const platformName = PLATFORMS[platformId].name;
        const profile = PLATFORM_FUNDING_PROFILES[platformId];
        const balancedFunding = calculateBalancedNextSeasonFundingCap({
            projectBudget: release.budget,
            packageScore: Math.round((eligibility.performance * 0.55) + (eligibility.hype * 0.45)),
            currentOffer: Math.max(0, Number(release.streamingRevenue) || 0),
            platform: profile,
            genre: release.projectDetails.genre,
            rating: eligibility.rating,
            seasonOneViews: eligibility.totalViews,
            streamingRevenue: release.streamingRevenue,
            rawHype: eligibility.hype,
            hasProvenIp: eligibility.provenIp,
            randomFactor: random()
        });
        const hardCap = Math.min(profile.maxBudget, release.budget * 1.05);
        const fundingAmount = Math.floor(Math.min(hardCap, Math.max(release.budget * 0.5, balancedFunding.amount)));
        const reason = `${platformName} sees upside despite weak Season 1 proof and is making a controlled executive bet.`;

        return {
            kind,
            reason,
            platformId,
            platformName,
            funding: {
                amount: fundingAmount,
                tier: 'RISKY_BET',
                reason: 'A rare platform moonshot with a strict one-season cap.'
            },
            futurePotentialPatch: {
                isRenewed: true,
                seriesStatus: 'RUNNING',
                renewalChance: Math.max(35, Math.round(eligibility.performance * 0.55))
            },
            news: makeNews(
                release,
                player,
                kind,
                `${platformName} Makes High-Risk Bet on "${release.name}"`,
                `${reason} Season 2 receives a capped ${formatMoneyShort(fundingAmount)} commitment.`
            )
        };
    }

    if (kind === 'STUDIO_REBOOT_GAMBLE') {
        const reason = 'The old run stumbled, but recognizable IP convinced the studio to reset the cast and tone.';
        return {
            kind,
            reason,
            continuationSubtype: 'REBOOT',
            futurePotentialPatch: {
                isSequelGreenlit: true,
                rebootChance: Math.max(55, Math.round((eligibility.hype + eligibility.performance) / 2))
            },
            news: makeNews(
                release,
                player,
                kind,
                `"${release.name}" Reboot Gamble Moves Forward`,
                `${reason} Industry watchers call it an expensive second chance.`
            )
        };
    }

    const reason = eligibility.rating >= 7
        ? 'Strong audience affection outweighed the disappointing theatrical return.'
        : 'Franchise awareness and market research persuaded the studio to double down.';
    return {
        kind,
        reason,
        continuationSubtype: 'SEQUEL',
        futurePotentialPatch: {
            isSequelGreenlit: true,
            sequelChance: Math.max(45, Math.round((eligibility.hype + eligibility.performance) / 2))
        },
        news: makeNews(
            release,
            player,
            kind,
            `Studio Doubles Down on "${release.name}" Sequel`,
            `${reason} The follow-up is being treated as a high-risk recovery play.`
        )
    };
};
