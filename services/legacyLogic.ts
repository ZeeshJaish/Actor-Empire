import { ActorSkills, BloodlineMember, NPCActor, Player, PortfolioItem, Relationship, StreamingState, UniverseId, ProjectType } from '../types';

export const LEGACY_MIN_PLAYABLE_AGE = 18;
export const LEGACY_INHERITANCE_TAX_RATE = 0.25;

const clone = <T,>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value));

const resolveLegacyProjectType = (...candidates: unknown[]): ProjectType => {
    for (const candidate of candidates) {
        if (candidate === 'SERIES') return 'SERIES';
        if (candidate === 'MOVIE') return 'MOVIE';
    }
    return 'MOVIE';
};

export interface LegacyParentContext {
    playerId: string;
    actorId: string;
    name: string;
    gender: Player['gender'];
    avatar: string;
    isDeceased: boolean;
    inheritedAtAge: number;
    inheritedAtWeek: number;
    studioIds: string[];
    franchiseIds: string[];
    universeIds: UniverseId[];
    projectCount: number;
}

const getLegacyParentActorId = (player: Pick<Player, 'id'>) => `legacy_parent_actor_${String(player.id || 'player').replace(/[^a-z0-9_]/gi, '_')}`;

const getLegacyParentTier = (fame: number): NPCActor['tier'] => {
    if (fame >= 90) return 'ICON';
    if (fame >= 75) return 'A_LIST';
    if (fame >= 50) return 'ESTABLISHED';
    if (fame >= 25) return 'RISING';
    return 'INDIE';
};

export const createLegacyParentActor = (player: Player, isDeceased = !!player.flags?.isDead): NPCActor => {
    const fame = Math.max(0, Math.min(100, Math.round(player.stats?.fame || 0)));
    const talent = Math.max(25, Math.min(100, Math.round(player.stats?.talent || fame || 45)));

    return {
        id: getLegacyParentActorId(player),
        name: player.name,
        handle: `@${String(player.name || 'legacy').replace(/\s+/g, '_').toLowerCase()}`,
        gender: player.gender,
        avatar: player.avatar,
        tier: getLegacyParentTier(fame),
        prestigeBias: (player.stats?.reputation || 0) >= 60 ? 'PRESTIGE' : 'MIXED',
        openness: isDeceased ? 0 : 82,
        followers: Math.max(0, Math.floor(player.stats?.followers || 0)),
        netWorth: Math.max(0, Math.floor(player.money || 0)),
        occupation: 'ACTOR',
        age: player.age,
        bio: isDeceased
            ? `${player.name} is remembered as a studio founder and performer.`
            : `${player.name} is a studio founder and performer available for selected productions.`,
        stats: {
            fame,
            talent,
            reputation: Math.max(0, Math.min(100, Math.round(player.stats?.reputation || 0))),
            looks: Math.max(0, Math.min(100, Math.round(player.stats?.looks || 50))),
            body: Math.max(0, Math.min(100, Math.round(player.stats?.body || 50))),
            skills: clone(player.stats?.skills)
        },
        isIndependent: false
    };
};

const PLAYER_SELF_REFERENCE_KEYS = new Set([
    'id',
    'actorId',
    'directorId',
    'npcId',
    'leadActorId',
    'performerId'
]);

export const rewritePlayerSelfReferencesForLegacyParent = <T,>(value: T, parentActor: NPCActor): T => {
    const rewrite = (entry: any): any => {
        if (Array.isArray(entry)) return entry.map(rewrite);
        if (!entry || typeof entry !== 'object') return entry;

        const next: any = {};
        let rewroteSelfReference = false;

        Object.entries(entry).forEach(([key, rawValue]) => {
            if (PLAYER_SELF_REFERENCE_KEYS.has(key) && rawValue === 'PLAYER_SELF') {
                next[key] = parentActor.id;
                rewroteSelfReference = true;
                return;
            }
            next[key] = rewrite(rawValue);
        });

        if (rewroteSelfReference) {
            if ('actorName' in next || 'actorId' in next) next.actorName = parentActor.name;
            if ('directorName' in next || 'directorId' in next) next.directorName = parentActor.name;
            if ('name' in next && ('role' in next || 'roleType' in next || 'tier' in next)) next.name = parentActor.name;
            if ('isPlayer' in next) next.isPlayer = false;
        }

        return next;
    };

    return rewrite(clone(value));
};

const toLegacyStudioProject = (project: any, parentActor: NPCActor, source: 'PAST' | 'ACTIVE') => {
    const rewritten = rewritePlayerSelfReferencesForLegacyParent(project, parentActor) as any;
    const id = String(rewritten.id || rewritten.projectId || rewritten.title || rewritten.name || `legacy_project_${source.toLowerCase()}`);
    const details = rewritten.projectDetails || rewritten;
    const projectType = resolveLegacyProjectType(rewritten.projectType, details.projectType, rewritten.type, details.type);

    return {
        ...details,
        ...rewritten,
        id,
        name: rewritten.name || details.title || details.name || 'Inherited Studio Project',
        title: details.title || rewritten.title || rewritten.name || details.name || 'Inherited Studio Project',
        legacySourceProjectId: id,
        legacyParentActorId: parentActor.id,
        legacyParentName: parentActor.name,
        isLegacyStudioProject: true,
        legacySource: source,
        studioId: rewritten.studioId || details.studioId,
        franchiseId: rewritten.franchiseId || details.franchiseId,
        universeId: rewritten.universeId || details.universeId,
        castList: Array.isArray(rewritten.castList) ? rewritten.castList : Array.isArray(details.castList) ? details.castList : [],
        gross: rewritten.gross ?? rewritten.totalGross ?? details.gross ?? details.totalGross ?? 0,
        imdbRating: rewritten.imdbRating ?? details.imdbRating ?? rewritten.rating ?? details.rating ?? 0,
        rating: rewritten.rating ?? rewritten.imdbRating ?? details.rating ?? details.imdbRating ?? 0,
        projectType,
        type: projectType,
        releaseYear: rewritten.releaseYear || details.releaseYear || rewritten.year || details.year,
        year: rewritten.year || rewritten.releaseYear || details.year || details.releaseYear
    };
};

export const getInheritedStudioProjects = (
    player: Pick<Player, 'flags'>,
    studioId?: string
): any[] => {
    const projects = Array.isArray(player.flags?.legacyStudioProjects) ? player.flags.legacyStudioProjects : [];
    return projects.filter((project: any) => !studioId || project.studioId === studioId);
};

export const buildLegacyStudioInheritance = (
    player: Player,
    options: { isDeceased?: boolean } = {}
) => {
    const isDeceased = options.isDeceased ?? !!player.flags?.isDead;
    const parentActor = createLegacyParentActor(player, isDeceased);
    const inheritedBusinesses = rewritePlayerSelfReferencesForLegacyParent(player.businesses || [], parentActor);
    const inheritedStudio = player.studio ? rewritePlayerSelfReferencesForLegacyParent(player.studio, parentActor) : undefined;
    const inheritedWorld = player.world ? rewritePlayerSelfReferencesForLegacyParent(player.world, parentActor) : undefined;
    const studioIds = inheritedBusinesses
        .filter((business: any) => business?.type === 'PRODUCTION_HOUSE' && business?.id)
        .map((business: any) => String(business.id));
    const studioIdSet = new Set(studioIds);
    const legacyPastProjects = (player.pastProjects || [])
        .filter((project: any) => project?.studioId && studioIdSet.has(String(project.studioId)))
        .map(project => toLegacyStudioProject(project, parentActor, 'PAST'));
    const legacyActiveProjects = (player.activeReleases || [])
        .filter((release: any) => release?.projectDetails?.studioId && studioIdSet.has(String(release.projectDetails.studioId)))
        .map(release => toLegacyStudioProject({
            ...(release.projectDetails || {}),
            id: release.id,
            name: release.name || release.projectDetails?.title,
            totalGross: release.totalGross,
            streamingRevenue: release.streamingRevenue,
            imdbRating: release.imdbRating,
            releaseYear: release.releaseYear,
            releaseWeek: release.releaseWeek,
            releasedAtAbsoluteWeek: release.releasedAtAbsoluteWeek
        }, parentActor, 'ACTIVE'));
    const legacyProjects = [...legacyPastProjects, ...legacyActiveProjects];
    const franchiseIds = Array.from(new Set(legacyProjects.map(project => project.franchiseId).filter(Boolean).map(String)));
    const universeIds = Array.from(new Set(legacyProjects.map(project => project.universeId).filter(Boolean).map(String))) as UniverseId[];
    const existingExtraNPCs = Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : [];
    const extraNPCs = isDeceased
        ? existingExtraNPCs.filter((npc: any) => npc?.id !== parentActor.id)
        : [parentActor, ...existingExtraNPCs.filter((npc: any) => npc?.id !== parentActor.id)];

    const legacyParent: LegacyParentContext = {
        playerId: player.id,
        actorId: parentActor.id,
        name: parentActor.name,
        gender: parentActor.gender,
        avatar: parentActor.avatar,
        isDeceased,
        inheritedAtAge: player.age,
        inheritedAtWeek: player.currentWeek,
        studioIds,
        franchiseIds,
        universeIds,
        projectCount: legacyProjects.length
    };

    return {
        parentActor,
        legacyParent,
        legacyProjects,
        businesses: inheritedBusinesses,
        studio: inheritedStudio,
        world: inheritedWorld,
        flags: {
            legacyParent,
            legacyStudioProjects: legacyProjects,
            extraNPCs
        }
    };
};

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


// legacyLogic.ts contains fuction related to calculating legacy scores in
