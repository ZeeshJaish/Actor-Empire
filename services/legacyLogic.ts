import { ActorSkills, BloodlineMember, Player, PortfolioItem, Relationship, StreamingState } from '../types';

export const LEGACY_MIN_PLAYABLE_AGE = 18;
export const LEGACY_INHERITANCE_TAX_RATE = 0.25;

export const getAbsoluteWeek = (age: number, currentWeek: number): number => {
    const safeAge = Math.max(1, age);
    const safeWeek = Math.min(52, Math.max(1, currentWeek));
    return (safeAge - 1) * 52 + (safeWeek - 1);
};

export const getElapsedWeeks = (
    fromAge: number,
    fromWeek: number,
    toAge: number,
    toWeek: number
): number => {
    return Math.max(0, getAbsoluteWeek(toAge, toWeek) - getAbsoluteWeek(fromAge, fromWeek));
};

export const getRelationshipAge = (
    relationship: Pick<Relationship, 'age' | 'birthWeekAbsolute'>,
    playerAge: number,
    currentWeek: number
): number => {
    if (typeof relationship.birthWeekAbsolute === 'number') {
        const weeksLived = getAbsoluteWeek(playerAge, currentWeek) - relationship.birthWeekAbsolute;
        return Math.max(0, Math.floor(weeksLived / 52));
    }
    return relationship.age ?? 0;
};

export const getInteractionAgeInWeeks = (
    relationship: Pick<Relationship, 'lastInteractionWeek' | 'lastInteractionAbsolute'>,
    playerAge: number,
    currentWeek: number
): number => {
    if (typeof relationship.lastInteractionAbsolute === 'number') {
        return Math.max(0, getAbsoluteWeek(playerAge, currentWeek) - relationship.lastInteractionAbsolute);
    }
    return Math.max(0, currentWeek - (relationship.lastInteractionWeek || currentWeek));
};

export const inferStreamingStartWeekAbsolute = (
    streaming: Partial<StreamingState> | undefined,
    playerAge: number,
    currentWeek: number
): number | undefined => {
    if (!streaming) return undefined;
    if (typeof streaming.startWeekAbsolute === 'number') return streaming.startWeekAbsolute;

    const currentAbsoluteWeek = getAbsoluteWeek(playerAge, currentWeek);
    const safeWeekOnPlatform = Math.max(1, Math.floor(streaming.weekOnPlatform ?? 1));
    const hasStreamingHistory =
        (typeof streaming.totalViews === 'number' && streaming.totalViews > 0) ||
        (Array.isArray(streaming.weeklyViews) && streaming.weeklyViews.length > 0) ||
        safeWeekOnPlatform > 1;

    if (hasStreamingHistory) {
        return Math.max(0, currentAbsoluteWeek - Math.max(0, safeWeekOnPlatform - 1));
    }

    if (typeof streaming.startWeek === 'number') {
        if (currentWeek < streaming.startWeek) {
            return currentAbsoluteWeek + (streaming.startWeek - currentWeek);
        }
        return currentAbsoluteWeek;
    }

    return currentAbsoluteWeek;
};

export const getGenerationNumber = (player: Player): number => {
    return (player.bloodline?.length || 0) + 1;
};

export const calculateLegacyScore = (member: {
    netWorth: number;
    awards: number;
    moviesMade: number;
    peakFame?: number;
    businessCount?: number;
}): number => {
    const wealthScore = Math.min(250, Math.floor(member.netWorth / 500000));
    const fameScore = Math.min(200, Math.floor((member.peakFame || 0) * 1.5));
    const awardsScore = member.awards * 35;
    const filmScore = member.moviesMade * 8;
    const businessScore = (member.businessCount || 0) * 20;
    return wealthScore + fameScore + awardsScore + filmScore + businessScore;
};

export const createBloodlineSnapshot = (player: Player): BloodlineMember => {
    const snapshot: BloodlineMember = {
        id: player.id,
        name: player.name,
        finalAge: player.age,
        netWorth: player.money,
        moviesMade: player.pastProjects.length,
        awards: player.awards?.length || 0,
        generation: getGenerationNumber(player),
        avatar: player.avatar,
        peakFame: player.stats.fame,
        businessCount: player.businesses?.length || 0,
    };

    snapshot.legacyScore = calculateLegacyScore(snapshot);
    return snapshot;
};

export const calculateDynastyScore = (player: Player): number => {
    const bloodlineScore = (player.bloodline || []).reduce(
        (sum, member) => sum + (member.legacyScore || calculateLegacyScore(member)),
        0
    );
    return bloodlineScore + calculateLegacyScore({
        netWorth: player.money,
        awards: player.awards?.length || 0,
        moviesMade: player.pastProjects.length,
        peakFame: player.stats.fame,
        businessCount: player.businesses?.length || 0,
    });
};

export const getLegacyArchetype = (player: Player): string => {
    const awards = player.awards?.length || 0;
    const projects = player.pastProjects.length;
    const businesses = player.businesses?.length || 0;
    const fame = player.stats.fame || 0;
    const reputation = player.stats.reputation || 0;
    const abandonedChildren = player.flags?.abandonedChildIds?.length || 0;
    const debtPressure = (player.flags?.weeksInDebt || 0) >= 4 || player.money < 0;

    if (debtPressure && reputation < 35) return 'Debt-Ridden Tragedy';
    if (businesses >= 4 && player.money >= 200_000_000) return 'Empire Builder';
    if (awards >= 12 && fame >= 75) return 'Prestige Immortal';
    if (projects >= 20 && fame >= 85) return 'Screen Legend';
    if (businesses >= 2 && fame >= 70) return 'Industry Mogul';
    if (abandonedChildren > 0 || reputation < 25) return 'Scandal-Plagued Icon';
    if (fame >= 70) return 'Beloved Superstar';
    if (projects >= 10) return 'Working Screen Veteran';
    return 'Forgotten Talent';
};

export const getLegacyObituary = (player: Player): string => {
    const archetype = getLegacyArchetype(player).toLowerCase();
    const awards = player.awards?.length || 0;
    const businesses = player.businesses?.length || 0;
    const projects = player.pastProjects.length;
    const dynasty = calculateDynastyScore(player);
    const abandonedChildren = player.flags?.abandonedChildIds?.length || 0;

    const parts = [
        `${player.name} leaves behind the memory of a ${archetype} whose career stretched across ${projects} released project${projects === 1 ? '' : 's'}.`,
    ];

    if (awards > 0) {
        parts.push(`Their shelf held ${awards} major award${awards === 1 ? '' : 's'}, cementing their place in industry history.`);
    }

    if (businesses > 0) {
        parts.push(`Beyond the spotlight, they built ${businesses} business${businesses === 1 ? '' : 'es'} and turned fame into a larger empire.`);
    }

    if (abandonedChildren > 0) {
        parts.push(`But their personal life remained controversial, and family wounds shaped how the public remembers them.`);
    } else if ((player.relationships || []).some(rel => rel.relation === 'Child')) {
        parts.push(`Their family story became part of the legacy they passed on to the next generation.`);
    }

    if (dynasty > 0) {
        parts.push(`Their bloodline now carries a dynasty score of ${dynasty}, a measure of the mark they left on the world.`);
    }

    return parts.join(' ');
};

export const getLegacyTributes = (player: Player): string[] => {
    const fame = player.stats.fame || 0;
    const reputation = player.stats.reputation || 0;
    const awards = player.awards?.length || 0;
    const businesses = player.businesses?.length || 0;
    const debtPressure = (player.flags?.weeksInDebt || 0) >= 4 || player.money < 0;
    const tributes: string[] = [];

    if (awards >= 8) tributes.push('“A once-in-a-generation talent whose work will outlive the era that made them.”');
    if (businesses >= 3) tributes.push('“They didn’t just star in the game, they learned how to own the whole board.”');
    if (fame >= 85 && reputation >= 60) tributes.push('“Fans loved them, critics respected them, and rivals feared them.”');
    if (reputation < 35) tributes.push('“Brilliant, chaotic, and impossible to ignore right until the end.”');
    if (debtPressure) tributes.push('“The empire cracked late, but people will still remember how high they climbed.”');
    if ((player.flags?.abandonedChildIds?.length || 0) > 0) tributes.push('“Their legacy is powerful, but so are the scars they left behind.”');

    if (tributes.length < 3) tributes.push('“However messy the life was, the story they left behind still belongs to the ages.”');
    if (tributes.length < 4) tributes.push('“People will argue about the choices. They won’t argue about the impact.”');

    return tributes.slice(0, 4);
};

export const inheritActorSkills = (skills: ActorSkills, ratio: number): ActorSkills => {
    return {
        delivery: Math.floor(skills.delivery * ratio),
        memorization: Math.floor(skills.memorization * ratio),
        expression: Math.floor(skills.expression * ratio),
        improvisation: Math.floor(skills.improvisation * ratio),
        discipline: Math.floor(skills.discipline * ratio),
        presence: Math.floor(skills.presence * ratio),
        charisma: Math.floor(skills.charisma * ratio),
        writing: Math.floor(skills.writing * ratio),
    };
};

const taxPortfolio = (portfolio: PortfolioItem[], taxRate: number): PortfolioItem[] => {
    return portfolio
        .map(item => ({
            ...item,
            shares: Math.max(0, Math.floor(item.shares * (1 - taxRate))),
        }))
        .filter(item => item.shares > 0);
};

export const getPortfolioShareCount = (portfolio: PortfolioItem[]): number => {
    return portfolio.reduce((sum, item) => sum + item.shares, 0);
};

export const getLegacyInheritancePreview = (player: Pick<Player, 'money' | 'portfolio' | 'assets' | 'customItems' | 'businesses'>) => {
    const inheritedMoney = Math.max(0, Math.floor(player.money * (1 - LEGACY_INHERITANCE_TAX_RATE)));
    const inheritedPortfolio = taxPortfolio(player.portfolio, LEGACY_INHERITANCE_TAX_RATE);
    const originalShares = getPortfolioShareCount(player.portfolio);
    const inheritedShares = getPortfolioShareCount(inheritedPortfolio);

    return {
        taxRate: LEGACY_INHERITANCE_TAX_RATE,
        originalMoney: player.money,
        inheritedMoney,
        moneyTaxPaid: Math.max(0, player.money - inheritedMoney),
        inheritedPortfolio,
        originalShares,
        inheritedShares,
        sharesTaxPaid: Math.max(0, originalShares - inheritedShares),
        untaxedAssetCount: (player.assets?.length || 0) + (player.customItems?.length || 0),
        businessCount: player.businesses?.length || 0,
    };
};
