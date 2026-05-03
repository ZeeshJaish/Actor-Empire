import { AuditionOpportunity, BudgetTier, Genre, IndustryProject, NewsItem, NpcVentureArchetype, NpcVentureState, Player, ProjectType, RoleType, WorldState } from '../types';
import { NPC_DATABASE, calculateProjectFameMultiplier } from './npcLogic';
import { calculateProjectPay, generateProjectDetails, generateProjectTitle, getEstimatedBudget } from './roleLogic';
import { getEnabledGlobalCreatorSocialProfiles } from './youtubeLogic';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const absWeek = (year: number, week: number) => (year * 52) + week;

const MAX_ACTIVE_VENTURES = 12;
const MAX_TOTAL_VENTURES = 20;

const PREFIXES = ['Northstar', 'Silverline', 'Velvet', 'Ironwood', 'Sable', 'Golden Hour', 'Bright Arc', 'Blue Lantern', 'Red Harbor', 'Wildframe', 'Moonfield', 'Crownline'];
const SUFFIXES = ['Pictures', 'Studios', 'Media', 'Films', 'Entertainment', 'Storyworks', 'Motion Group', 'Creative House', 'Productions', 'Picture Company'];
const CREATOR_PREFIXES = ['Pulse', 'Viral', 'Glowline', 'Signal', 'Hypewell', 'Loopline', 'Framehouse', 'Neon Row'];
const GENRE_PREFIXES = ['Midnight', 'Black Door', 'Graveyard', 'Voltage', 'Afterlight', 'Red Signal', 'Wild Cut'];

const LAUNCH_HEADLINES = [
    '{Owner} launches {Venture}, a new {Archetype} with serious industry ambitions.',
    'New Player: {Owner}-backed {Venture} enters the production race.',
    '{Venture} opens its doors as {Owner} makes a bigger bet on ownership.',
    'Industry Watch: {Owner} quietly builds {Venture} into a new Hollywood vehicle.',
];

const DEVELOPMENT_HEADLINES = [
    '{Venture} is packaging {Title}, with insiders calling it a calculated swing.',
    '{Venture} begins development on {Title} as rivals watch the newcomer closely.',
    '{Owner}\'s {Venture} starts chasing talent for {Title}.',
    'Bidding chatter builds around {Title}, the latest move from {Venture}.',
];

const HIT_HEADLINES = [
    '{Venture} scores a breakout hit with {Title}.',
    '{Title} turns {Venture} from vanity project into real contender.',
    'Industry Surprise: {Venture} lands a major win with {Title}.',
    '{Owner}\'s ownership gamble pays off as {Title} overperforms.',
];

const FLOP_HEADLINES = [
    '{Venture} takes a costly hit after {Title} misses expectations.',
    '{Title} stumbles, putting pressure on {Owner}\'s {Venture}.',
    'Rough Week: {Venture} faces questions after {Title} underperforms.',
    'Insiders wonder if {Venture} moved too fast after {Title} flops.',
];

const CLOSURE_HEADLINES = [
    '{Venture} shuts down after a difficult run of projects.',
    '{Owner} closes {Venture} as losses mount.',
    'End of the Line: {Venture} quietly winds down operations.',
    '{Venture} exits the market after failing to build sustainable momentum.',
];

const OFFER_INTROS = [
    'We are putting together a focused package and think you fit the role.',
    'This is a leaner project, but the team believes it can travel.',
    'Our studio is moving fast and wants you attached before the town catches up.',
    'We are building the next slate around talent with heat, and your name came up.',
];

const ARCHETYPE_LABELS: Record<NpcVentureArchetype, string> = {
    PRESTIGE_LABEL: 'prestige label',
    COMMERCIAL_STUDIO: 'commercial studio',
    GENRE_HOUSE: 'genre house',
    CREATOR_MEDIA: 'creator media company',
    AWARDS_BOUTIQUE: 'awards boutique',
};

const ARCHETYPE_BUDGETS: Record<NpcVentureArchetype, BudgetTier[]> = {
    PRESTIGE_LABEL: ['LOW', 'MID'],
    COMMERCIAL_STUDIO: ['MID', 'HIGH'],
    GENRE_HOUSE: ['LOW', 'MID'],
    CREATOR_MEDIA: ['LOW', 'MID'],
    AWARDS_BOUTIQUE: ['LOW', 'MID'],
};

const ARCHETYPE_GENRES: Record<NpcVentureArchetype, Genre[]> = {
    PRESTIGE_LABEL: ['DRAMA', 'THRILLER', 'ROMANCE'],
    COMMERCIAL_STUDIO: ['ACTION', 'COMEDY', 'ADVENTURE'],
    GENRE_HOUSE: ['HORROR', 'THRILLER', 'SCI_FI'],
    CREATOR_MEDIA: ['COMEDY', 'HORROR', 'ACTION'],
    AWARDS_BOUTIQUE: ['DRAMA', 'ROMANCE', 'THRILLER'],
};

const getTalentPool = (player: Player) => {
    const extraNPCs = Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : [];
    const socialProfiles = getEnabledGlobalCreatorSocialProfiles(player);
    const merged = [...NPC_DATABASE, ...extraNPCs, ...socialProfiles]
        .filter(npc => npc && typeof npc.id === 'string' && typeof npc.name === 'string')
        .filter(npc => npc.occupation === 'ACTOR' || npc.occupation === 'DIRECTOR');

    return merged
        .filter((npc, idx, arr) => arr.findIndex(entry => entry.id === npc.id || entry.name.toLowerCase() === npc.name.toLowerCase()) === idx)
        .map(npc => ({
            ...npc,
            handle: npc.handle || `@${npc.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
            followers: Number.isFinite(npc.followers) ? Math.max(0, npc.followers) : 0,
            netWorth: Number.isFinite(npc.netWorth) ? Math.max(250000, npc.netWorth) : 1_000_000,
            stats: {
                ...(npc.stats || {}),
                fame: Number.isFinite(npc.stats?.fame) ? npc.stats?.fame : (npc.tier === 'ICON' || npc.tier === 'A_LIST' ? 82 : npc.tier === 'ESTABLISHED' ? 62 : 42),
                talent: Number.isFinite(npc.stats?.talent) ? npc.stats?.talent : (npc.tier === 'ICON' ? 92 : npc.tier === 'A_LIST' ? 86 : npc.tier === 'ESTABLISHED' ? 74 : 60),
            },
        }));
};

const uniqueCompanyName = (world: WorldState, archetype: NpcVentureArchetype): string => {
    const existing = new Set(Object.values(world.npcVentures || {}).map(v => v.name));
    const prefixes = archetype === 'CREATOR_MEDIA' ? CREATOR_PREFIXES : archetype === 'GENRE_HOUSE' ? GENRE_PREFIXES : PREFIXES;

    for (let i = 0; i < 20; i++) {
        const name = `${pick(prefixes)} ${pick(SUFFIXES)}`;
        if (!existing.has(name)) return name;
    }

    return `${pick(prefixes)} ${pick(SUFFIXES)} ${Math.floor(Math.random() * 90 + 10)}`;
};

const getFounderPool = (player: Player, world: WorldState) => {
    const owners = new Set(Object.values(world.npcVentures || {}).map(v => v.ownerNpcId));
    return getTalentPool(player).filter(npc => {
        if (owners.has(npc.id)) return false;
        const fame = npc.stats?.fame || 0;
        const wealthM = (npc.netWorth || 0) / 1_000_000;
        const isEligibleJob = ['ACTOR', 'DIRECTOR'].includes(npc.occupation as any);
        return isEligibleJob && (fame >= 55 || wealthM >= 40 || npc.tier === 'ICON' || npc.tier === 'A_LIST');
    });
};

const makeNews = (
    headline: string,
    player: Player,
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
    subtext?: string
): NewsItem => ({
    id: `news_npc_venture_${Date.now()}_${Math.random()}`,
    headline,
    subtext,
    category: impactLevel === 'HIGH' ? 'TOP_STORY' : 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel,
});

const fill = (template: string, venture: NpcVentureState, extra: Record<string, string> = {}) =>
    template
        .replace(/{Owner}/g, venture.ownerName)
        .replace(/{Venture}/g, venture.name)
        .replace(/{Archetype}/g, ARCHETYPE_LABELS[venture.archetype])
        .replace(/{Title}/g, extra.Title || '');

export const createNpcVenture = (player: Player, world: WorldState): { venture: NpcVentureState; news: NewsItem } | null => {
    if (!world.npcVentures) world.npcVentures = {};
    const activeCount = Object.values(world.npcVentures).filter(v => v.status === 'ACTIVE').length;
    if (activeCount >= MAX_ACTIVE_VENTURES) return null;

    const pool = getFounderPool(player, world);
    if (pool.length === 0) return null;

    const owner = pick(pool);
    const fame = owner.stats?.fame || 50;
    const wealthM = Math.max(5, (owner.netWorth || 0) / 1_000_000);
    const archetypes: NpcVentureArchetype[] = owner.occupation === 'DIRECTOR'
            ? ['PRESTIGE_LABEL', 'AWARDS_BOUTIQUE', 'GENRE_HOUSE']
            : ['COMMERCIAL_STUDIO', 'PRESTIGE_LABEL', 'GENRE_HOUSE'];
    const archetype = pick(archetypes);
    const name = uniqueCompanyName(world, archetype);
    const seedMoney = Math.max(18, Math.min(280, wealthM * (0.08 + Math.random() * 0.18)));
    const venture: NpcVentureState = {
        id: `npc_venture_${owner.id}_${Date.now()}`,
        name,
        ownerNpcId: owner.id,
        ownerName: owner.name,
        archetype,
        status: 'ACTIVE',
        valuation: Math.max(0.05, seedMoney / 1000),
        cashReserve: seedMoney,
        hype: Math.max(25, Math.min(95, fame * 0.72 + Math.random() * 22)),
        reputation: Math.max(25, Math.min(92, fame * 0.58 + Math.random() * 25)),
        creativeQuality: Math.max(35, Math.min(95, (owner.stats?.talent || 55) * 0.65 + Math.random() * 30)),
        risk: Math.max(15, Math.min(90, 32 + Math.random() * 38 + (owner.tier === 'ICON' ? -8 : 0))),
        foundedWeek: player.currentWeek,
        foundedYear: player.age,
        lastProjectWeek: 0,
        nextProjectWeek: player.currentWeek + 6 + Math.floor(Math.random() * 16),
        projectsReleased: 0,
        hits: 0,
        flops: 0,
        history: [],
    };

    world.npcVentures[venture.id] = venture;
    return {
        venture,
        news: makeNews(fill(pick(LAUNCH_HEADLINES), venture), player, fame > 80 ? 'HIGH' : 'MEDIUM', `${venture.name} begins with roughly $${venture.cashReserve.toFixed(0)}M in launch capital.`),
    };
};

const getVentureBudgetTier = (venture: NpcVentureState): BudgetTier => {
    const options = ARCHETYPE_BUDGETS[venture.archetype];
    let tier = pick(options);
    if (venture.cashReserve < 35) tier = 'LOW';
    else if (venture.cashReserve < 120 && tier === 'HIGH') tier = 'MID';
    else if (venture.hype > 78 && venture.cashReserve > 180 && Math.random() < 0.2) tier = 'HIGH';
    return tier;
};

const createVentureProject = (player: Player, venture: NpcVentureState): IndustryProject => {
    const budgetTier = getVentureBudgetTier(venture);
    const budget = getEstimatedBudget(budgetTier);
    const genre = pick(ARCHETYPE_GENRES[venture.archetype]);
    const talentPool = getTalentPool(player);
    const actorPool = talentPool.filter(n => n.occupation === 'ACTOR');
    const owner = talentPool.find(n => n.id === venture.ownerNpcId);
    const lead = owner?.occupation === 'ACTOR' && Math.random() < 0.38 ? owner : pick(actorPool);
    const directorPool = talentPool.filter(n => n.occupation === 'DIRECTOR');
    const director = owner?.occupation === 'DIRECTOR' && Math.random() < 0.45 ? owner : pick(directorPool);
    const leadTalent = lead?.stats?.talent || 55;
    const directorTalent = director?.stats?.talent || (director?.tier === 'A_LIST' ? 82 : 65);
    const quality = Math.max(12, Math.min(100, Math.round(
        (venture.creativeQuality * 0.42) +
        (venture.reputation * 0.18) +
        (leadTalent * 0.18) +
        (directorTalent * 0.16) +
        (Math.random() * 24 - venture.risk * 0.08)
    )));
    const fameMultiplier = calculateProjectFameMultiplier(lead ? [lead.id] : [], director?.name || 'Unknown Director', 0);
    const hypeMultiplier = 0.75 + (venture.hype / 120);
    const qualityMultiplier = Math.max(0.28, quality / 56);
    const volatility = 0.48 + Math.random() * 1.35;
    const boxOffice = Math.floor(budget * fameMultiplier * hypeMultiplier * qualityMultiplier * volatility);

    return {
        id: `npc_venture_project_${venture.id}_${Date.now()}_${Math.random()}`,
        title: generateProjectTitle([]),
        genre,
        studioId: venture.id,
        budgetTier,
        quality,
        boxOffice,
        year: player.age,
        weekReleased: player.currentWeek,
        leadActorId: lead?.id || 'unknown',
        leadActorName: lead?.name || 'Unknown Actor',
        directorName: director?.name || 'Unknown Director',
        reviews: quality >= 78 ? 'HIT' : quality <= 38 ? 'FLOP' : 'MIXED',
    };
};

export const syncNpcVenturesToStudios = (world: WorldState): WorldState => {
    if (!world.npcVentures) world.npcVentures = {};
    if (!world.studios) world.studios = {};

    Object.values(world.npcVentures).forEach(venture => {
        if (venture.status !== 'ACTIVE') {
            delete world.studios?.[venture.id];
            return;
        }

        world.studios![venture.id] = {
            id: venture.id,
            name: venture.name,
            valuation: Math.max(0.01, venture.valuation),
            reputation: venture.reputation,
            cashReserve: Math.max(0, Math.floor(venture.cashReserve)),
            recentHits: venture.hits,
            archetype: ARCHETYPE_LABELS[venture.archetype].toUpperCase(),
            ownerNpcId: venture.ownerNpcId,
            ownerName: venture.ownerName,
            isNpcVenture: true,
        };
    });

    return world;
};

export const processNpcVentures = (player: Player, world: WorldState): { world: WorldState; news: NewsItem[]; logs: string[] } => {
    if (!world.npcVentures) world.npcVentures = {};
    const news: NewsItem[] = [];
    const logs: string[] = [];
    const currentAbs = absWeek(player.age, player.currentWeek);
    const activeVentures = Object.values(world.npcVentures).filter(v => v.status === 'ACTIVE');

    const newestLaunchAbs = Math.max(0, ...Object.values(world.npcVentures).map(v => absWeek(v.foundedYear, v.foundedWeek)));
    const launchCooldownPassed = currentAbs - newestLaunchAbs >= 10;
    const launchChance = player.age < 20 ? 0.015 : 0.045;
    if (launchCooldownPassed && activeVentures.length < MAX_ACTIVE_VENTURES && Math.random() < launchChance) {
        const created = createNpcVenture(player, world);
        if (created) {
            news.push(created.news);
            logs.push(`${created.venture.ownerName} launched ${created.venture.name}.`);
        }
    }

    Object.values(world.npcVentures).forEach(venture => {
        if (venture.status !== 'ACTIVE') return;

        const pressure = venture.cashReserve < 45 ? 0.12 : 0;
        venture.hype = Math.max(5, Math.min(100, venture.hype + (Math.random() * 3.4 - 1.6) - pressure));
        venture.reputation = Math.max(5, Math.min(100, venture.reputation + (Math.random() * 2.2 - 0.9)));
        venture.valuation = Math.max(0.01, venture.valuation * (1 + (Math.random() * 0.024 - 0.009)));
        venture.cashReserve = Math.max(-30, venture.cashReserve + (venture.valuation * 0.3));

        if (player.currentWeek >= venture.nextProjectWeek || (venture.nextProjectWeek > 52 && player.currentWeek + 52 >= venture.nextProjectWeek)) {
            const project = createVentureProject(player, venture);
            const budget = getEstimatedBudget(project.budgetTier);
            const profit = project.boxOffice - budget;
            const profitM = profit / 1_000_000;
            const outcome: 'HIT' | 'SOLID' | 'FLOP' = profit > budget * 0.8 || project.quality >= 80 ? 'HIT' : profit < -budget * 0.25 || project.quality < 40 ? 'FLOP' : 'SOLID';

            venture.projectsReleased += 1;
            venture.lastProjectWeek = player.currentWeek;
            venture.nextProjectWeek = player.currentWeek + 10 + Math.floor(Math.random() * 18);
            venture.cashReserve += profitM;
            venture.valuation = Math.max(0.01, venture.valuation + (profitM / 850) + (outcome === 'HIT' ? 0.05 : outcome === 'FLOP' ? -0.04 : 0.01));
            venture.hype = Math.max(0, Math.min(100, venture.hype + (outcome === 'HIT' ? 12 : outcome === 'FLOP' ? -13 : 3)));
            venture.reputation = Math.max(0, Math.min(100, venture.reputation + (outcome === 'HIT' ? 5 : outcome === 'FLOP' ? -6 : 1)));
            if (outcome === 'HIT') venture.hits += 1;
            if (outcome === 'FLOP') venture.flops += 1;
            venture.history = [{
                id: project.id,
                title: project.title,
                week: player.currentWeek,
                year: player.age,
                budgetTier: project.budgetTier,
                quality: project.quality,
                revenue: project.boxOffice,
                profit,
                outcome,
            }, ...venture.history].slice(0, 8);
            world.projects.unshift(project);

            if (outcome === 'HIT') {
                news.push(makeNews(fill(pick(HIT_HEADLINES), venture, { Title: project.title }), player, 'HIGH', `Starring ${project.leadActorName}. Directed by ${project.directorName}.`));
            } else if (outcome === 'FLOP') {
                news.push(makeNews(fill(pick(FLOP_HEADLINES), venture, { Title: project.title }), player, 'MEDIUM', `The miss cut into ${venture.name}'s cash reserves.`));
            } else if (Math.random() < 0.35) {
                news.push(makeNews(fill(pick(DEVELOPMENT_HEADLINES), venture, { Title: project.title }), player, 'LOW', `${venture.name} is still building its slate.`));
            }
        }

        const shouldClose = venture.projectsReleased >= 2 && (venture.cashReserve < 0 || (venture.flops >= 3 && venture.hits === 0) || venture.valuation < 0.025);
        if (shouldClose) {
            venture.status = 'CLOSED';
            venture.closureReason = venture.cashReserve < 0 ? 'Cash reserves collapsed.' : 'The slate failed to gain traction.';
            news.push(makeNews(fill(pick(CLOSURE_HEADLINES), venture), player, 'HIGH', venture.closureReason));
            logs.push(`${venture.name} closed after ${venture.projectsReleased} releases.`);
        }
    });

    const allVentures = Object.values(world.npcVentures);
    if (allVentures.length > MAX_TOTAL_VENTURES) {
        const active = allVentures.filter(v => v.status === 'ACTIVE');
        const closed = allVentures.filter(v => v.status === 'CLOSED').sort((a, b) => absWeek(b.foundedYear, b.foundedWeek) - absWeek(a.foundedYear, a.foundedWeek));
        world.npcVentures = [...active, ...closed.slice(0, Math.max(0, MAX_TOTAL_VENTURES - active.length))]
            .reduce<Record<string, NpcVentureState>>((acc, venture) => {
                acc[venture.id] = venture;
                return acc;
            }, {});
    }

    return { world: syncNpcVenturesToStudios(world), news, logs };
};

export const generateNpcVentureRoleOffer = (player: Player): { opportunity: AuditionOpportunity; venture: NpcVentureState } | null => {
    const ventures = Object.values(player.world.npcVentures || {})
        .filter(v => v.status === 'ACTIVE' && v.cashReserve > 8 && v.reputation >= 20)
        .sort((a, b) => (b.hype + b.reputation + b.valuation * 10) - (a.hype + a.reputation + a.valuation * 10));
    if (ventures.length === 0) return null;

    const playerPull = Math.max(0, player.stats.fame * 0.45 + player.stats.reputation * 0.25 + player.stats.talent * 0.2 + player.stats.followers * 0.1);
    const offerChance = Math.min(0.2, 0.025 + playerPull / 900);
    if (Math.random() > offerChance) return null;

    const venture = pick(ventures.slice(0, Math.min(5, ventures.length)));
    const budgetTier = getVentureBudgetTier(venture);
    const type: ProjectType = Math.random() < 0.28 ? 'SERIES' : 'MOVIE';
    const roleType: RoleType = player.stats.fame >= 65 || Math.random() < 0.35 ? 'LEAD' : player.stats.fame >= 30 ? 'SUPPORTING' : 'ENSEMBLE';
    const usedTitles = [
        ...player.commitments.map(c => c.name),
        ...player.activeReleases.map(r => r.name),
        ...player.pastProjects.map(p => p.name),
        ...venture.history.map(h => h.title),
    ];
    const project = generateProjectDetails(budgetTier, type, usedTitles, player);
    project.studioId = venture.id;
    project.description = `${venture.name} is producing a ${project.genre.toLowerCase().replace('_', ' ')} ${type === 'MOVIE' ? 'film' : 'series'} backed by ${venture.ownerName}.`;
    project.visibleHype = venture.hype >= 75 ? 'HIGH' : venture.hype >= 45 ? 'MID' : 'LOW';
    project.hiddenStats.rawHype = Math.max(project.hiddenStats.rawHype, Math.round(venture.hype));
    project.hiddenStats.distributionPower = Math.max(25, Math.min(100, Math.round((project.hiddenStats.distributionPower + venture.reputation) / 2)));

    const basePay = calculateProjectPay(roleType, budgetTier, type);
    const ventureMultiplier = venture.cashReserve < 30 ? 0.75 : venture.hype > 75 ? 1.25 : 1;
    const riskPremium = venture.flops >= 2 ? 1.15 : 1;
    const opportunity: AuditionOpportunity = {
        id: `npc_venture_offer_${venture.id}_${Date.now()}_${Math.random()}`,
        roleType,
        projectName: project.title,
        genre: project.genre,
        config: {
            label: roleType,
            difficulty: budgetTier === 'HIGH' ? 80 : budgetTier === 'MID' ? 58 : 38,
            energyCost: roleType === 'LEAD' ? 38 : roleType === 'SUPPORTING' ? 26 : 18,
            baseIncome: basePay,
            expGain: budgetTier === 'HIGH' ? 22 : budgetTier === 'MID' ? 14 : 8,
        },
        project,
        estimatedIncome: Math.max(25_000, Math.floor(basePay * ventureMultiplier * riskPremium)),
        source: 'DIRECT',
    };

    return { opportunity, venture };
};

export const getNpcVentureOfferText = (venture: NpcVentureState, opportunity: AuditionOpportunity): string => (
    `${pick(OFFER_INTROS)}\n\nProject: ${opportunity.projectName}\nStudio: ${venture.name}\nFounder: ${venture.ownerName}\nRole: ${opportunity.roleType}\nEstimated pay: $${opportunity.estimatedIncome.toLocaleString()}\n\nThis is a real company in the market now. If the project hits, the studio gains momentum. If it misses, the risk is on them.`
);
