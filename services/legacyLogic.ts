import { ActorSkills, BloodlineMember, Player, PortfolioItem, Relationship } from '../types';

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
