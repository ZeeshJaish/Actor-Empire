import {
    AuditionOpportunity,
    CharacterStoryRole,
    PastProject,
    Player,
} from '../types';
import { getRoleMasteryLanes } from './actorRoleIdentity';

export type RoleMarketHeat = 'QUIET' | 'EMERGING' | 'IN_DEMAND' | 'HOT';
export type RoleOfferMarketKind = 'OPEN' | 'MOMENTUM' | 'TYPECAST' | 'RANGE';

export interface RoleMarketLane {
    role: CharacterStoryRole;
    credits: number;
    recentCredits: number;
    averagePerformance: number;
    demand: number;
    heat: RoleMarketHeat;
    latestCreditAgeWeeks: number;
}

export interface RoleMarketProfile {
    lanes: RoleMarketLane[];
    primaryLane?: RoleMarketLane;
    typecastingPressure: number;
    rangeScore: number;
}

export interface RoleOfferMarketContext {
    kind: RoleOfferMarketKind;
    marketRole?: CharacterStoryRole;
    originalRole: CharacterStoryRole;
    demand: number;
    typecastingPressure: number;
    label: string;
    reason: string;
}

interface RoleOfferDecisionOptions {
    protectedIdentity?: boolean;
    forceRange?: boolean;
}

const ROLES: CharacterStoryRole[] = ['HERO', 'ANTI_HERO', 'VILLAIN', 'ALLY', 'CIVILIAN', 'OTHER'];
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const finiteNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const absoluteProjectWeek = (project: PastProject) => finiteNumber(
    project.releasedAtAbsoluteWeek,
    (Math.max(1, finiteNumber(project.releaseYear || project.year, 1)) - 1) * 52
        + Math.max(0, finiteNumber(project.releaseWeek, 1) - 1)
);
const currentAbsoluteWeek = (player: Player) => (
    (Math.max(1, finiteNumber(player.age, 1)) - 1) * 52
    + Math.max(0, Math.min(51, finiteNumber(player.currentWeek, 1) - 1))
);
const roleLabel = (role: CharacterStoryRole) => role
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());
const performanceOf = (project: PastProject) => clamp(finiteNumber(
    project.playerRolePerformance
    ?? project.projectQuality
    ?? finiteNumber(project.imdbRating || project.rating, 5) * 10,
    50
));
const stablePercent = (seed: string) => {
    let value = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        value ^= seed.charCodeAt(index);
        value = Math.imul(value, 16777619);
    }
    return (value >>> 0) % 100;
};

const heatFor = (demand: number): RoleMarketHeat => {
    if (demand >= 82) return 'HOT';
    if (demand >= 66) return 'IN_DEMAND';
    if (demand >= 45) return 'EMERGING';
    return 'QUIET';
};

const getRecentIdentityCredits = (player: Player): PastProject[] => [...(player.pastProjects || [])]
    .filter(project => !project.isQaArchive && project.playerCharacterProfile?.storyRole)
    .sort((a, b) => absoluteProjectWeek(b) - absoluteProjectWeek(a))
    .slice(0, 12);

export const getRoleMarketProfile = (player: Player): RoleMarketProfile => {
    const recent = getRecentIdentityCredits(player);
    const currentWeek = currentAbsoluteWeek(player);
    const masteryByRole = new Map(getRoleMasteryLanes(player).map(lane => [lane.role, lane]));
    const lanes = ROLES.map(role => {
        const roleCredits = recent
            .map((project, index) => ({ project, index }))
            .filter(({ project }) => project.playerCharacterProfile?.storyRole === role);
        const mastery = masteryByRole.get(role);
        if (!roleCredits.length && !mastery) return null;

        const weighted = roleCredits.reduce((state, { project, index }) => {
            const recencyWeight = Math.max(0.34, 1 - index * 0.085);
            const creditAgeWeeks = Math.max(0, currentWeek - absoluteProjectWeek(project));
            const timeWeight = creditAgeWeeks <= 26
                ? 1
                : creditAgeWeeks <= 104
                    ? 1 - ((creditAgeWeeks - 26) / 78) * 0.65
                    : 0.18;
            const billingWeight = project.roleType === 'LEAD'
                ? 1.08
                : project.roleType === 'SUPPORTING'
                    ? 1.04
                    : 0.94;
            const weight = recencyWeight * timeWeight * billingWeight;
            return {
                score: state.score + performanceOf(project) * weight,
                weight: state.weight + weight,
            };
        }, { score: 0, weight: 0 });
        const averagePerformance = Math.round(weighted.score / Math.max(0.01, weighted.weight));
        const recentCredits = roleCredits.filter(({ index }) => index < 6).length;
        const latestCreditAgeWeeks = roleCredits.length
            ? Math.max(0, currentWeek - Math.max(...roleCredits.map(({ project }) => absoluteProjectWeek(project))))
            : 999;
        const freshness = latestCreditAgeWeeks <= 26
            ? 1
            : latestCreditAgeWeeks <= 104
                ? 1 - ((latestCreditAgeWeeks - 26) / 78) * 0.75
                : 0.12;
        const volumeSignal = Math.min(16, recentCredits * 4 + Math.max(0, roleCredits.length - recentCredits) * 1.5);
        const masterySignal = Number(mastery?.mastery || 0) * 0.24;
        const performanceSignal = averagePerformance * 0.62;
        const demand = Math.round(clamp((performanceSignal + masterySignal + volumeSignal - 12) * freshness));

        return {
            role,
            credits: roleCredits.length,
            recentCredits,
            averagePerformance,
            demand,
            heat: heatFor(demand),
            latestCreditAgeWeeks,
        } satisfies RoleMarketLane;
    }).filter((lane): lane is RoleMarketLane => Boolean(lane))
        .sort((a, b) => b.demand - a.demand || b.recentCredits - a.recentCredits);

    const primaryLane = lanes[0];
    const recentSix = recent.slice(0, 6);
    const primaryShare = primaryLane && recentSix.length
        ? recentSix.filter(project => project.playerCharacterProfile?.storyRole === primaryLane.role).length / recentSix.length
        : 0;
    const uniqueRecentRoles = new Set(recentSix.map(project => project.playerCharacterProfile?.storyRole)).size;
    const primaryFreshness = primaryLane
        ? primaryLane.latestCreditAgeWeeks <= 26
            ? 1
            : primaryLane.latestCreditAgeWeeks <= 104
                ? 1 - ((primaryLane.latestCreditAgeWeeks - 26) / 78) * 0.85
                : 0.08
        : 0;
    const typecastingPressure = primaryLane && primaryLane.recentCredits >= 3
        ? Math.round(clamp(
            (18
            + primaryShare * 62
            + Math.max(0, primaryLane.demand - 70) * 0.35
            - Math.max(0, uniqueRecentRoles - 1) * 9) * primaryFreshness
        ))
        : Math.round(clamp(primaryShare * 32 * primaryFreshness));
    const rangeScore = Math.round(clamp(
        uniqueRecentRoles * 18
        + Math.max(0, 4 - (primaryLane?.recentCredits || 0)) * 7
        + (lanes.filter(lane => lane.demand >= 55).length * 8)
    ));

    return { lanes, primaryLane, typecastingPressure, rangeScore };
};

const buildContext = (
    kind: RoleOfferMarketKind,
    originalRole: CharacterStoryRole,
    profile: RoleMarketProfile,
    marketRole = profile.primaryLane?.role,
): RoleOfferMarketContext => {
    const marketLabel = marketRole ? roleLabel(marketRole) : '';
    const originalLabel = roleLabel(originalRole);
    const demand = profile.primaryLane?.demand || 0;
    const base = {
        kind,
        marketRole,
        originalRole,
        demand,
        typecastingPressure: profile.typecastingPressure,
    };

    if (kind === 'TYPECAST' && marketRole) {
        return {
            ...base,
            label: `${marketLabel} demand`,
            reason: `Your recent ${marketLabel.toLowerCase()} performances pulled this offer toward the screen identity casting teams already trust.`,
        };
    }
    if (kind === 'MOMENTUM' && marketRole) {
        return {
            ...base,
            label: `${marketLabel} momentum`,
            reason: `This script naturally matches the ${marketLabel.toLowerCase()} work currently building your demand.`,
        };
    }
    if (kind === 'RANGE' && marketRole) {
        return {
            ...base,
            label: 'Range move',
            reason: `${originalLabel} moves you beyond the ${marketLabel.toLowerCase()} lane the industry currently expects.`,
        };
    }
    return {
        ...base,
        marketRole: undefined,
        label: 'Open casting lane',
        reason: `${originalLabel} is being judged on fit and craft, without an established screen identity controlling the offer.`,
    };
};

export const getRoleOfferMarketDecision = (
    player: Player,
    originalRole: CharacterStoryRole,
    seed: string,
    options: RoleOfferDecisionOptions = {},
): { role: CharacterStoryRole; context: RoleOfferMarketContext } => {
    const profile = getRoleMarketProfile(player);
    const primary = profile.primaryLane;
    if (!primary || primary.credits < 1 || primary.demand < 35 || options.protectedIdentity) {
        return { role: originalRole, context: buildContext('OPEN', originalRole, profile) };
    }
    if (originalRole === primary.role) {
        return { role: originalRole, context: buildContext('MOMENTUM', originalRole, profile) };
    }
    if (options.forceRange) {
        return { role: originalRole, context: buildContext('RANGE', originalRole, profile) };
    }

    const sameLaneOpenOffers = [
        ...(player.weeklyOpportunities?.auditions || []),
        ...(player.inbox || [])
            .map(message => message.data as AuditionOpportunity | undefined)
            .filter((item): item is AuditionOpportunity => Boolean(item?.characterProfile)),
    ].filter(opportunity => opportunity.characterProfile?.storyRole === primary.role).length;
    const biasChance = sameLaneOpenOffers >= 2
        ? 0
        : clamp(
            16
            + Math.max(0, primary.demand - 45) * 0.65
            + profile.typecastingPressure * 0.2
            - sameLaneOpenOffers * 12,
            8,
            58
        );
    const followsMarket = stablePercent(`${seed}:${primary.role}:${profile.typecastingPressure}`) < biasChance;

    return followsMarket
        ? { role: primary.role, context: buildContext('TYPECAST', originalRole, profile) }
        : { role: originalRole, context: buildContext('RANGE', originalRole, profile) };
};

export const getRoleOfferMessageLine = (opportunity: AuditionOpportunity): string => {
    const context = opportunity.industryContext;
    if (!context) return '';
    return `${context.label}: ${context.reason}`;
};
