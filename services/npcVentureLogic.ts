import { AuditionOpportunity, BudgetTier, GameLanguage, Genre, IndustryContentFingerprint, IndustryProject, NewsItem, NpcVentureArchetype, NpcVentureState, Player, ProjectType, RoleType, StudioAiSlateCommitment, WorldState } from '../types';
import { NPC_DATABASE, calculateProjectFameMultiplier } from './npcLogic';
import { calculateProjectPay, generateProjectDetails, generateProjectTitle, getEstimatedBudget } from './roleLogic';
import { getEnabledGlobalCreatorSocialProfiles } from './youtubeLogic';
import { getPlayerLanguage, t } from './i18n';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { migrateNpcVentureToStudio, projectStudioToNpcVenture } from './studioAi';

const pick = <T>(arr: T[], rng: () => number = Math.random): T => arr[Math.floor(rng() * arr.length)];
const VENTURE_VARIANT_SEPARATOR = ' || ';
const pickVentureVariant = (language: GameLanguage, key: string, vars: Record<string, string | number> = {}, rng: () => number = Math.random) =>
    pick(t(language, key, vars).split(VENTURE_VARIANT_SEPARATOR), rng);
// Preserve the venture scheduler's legacy epoch so existing saves do not replay a
// year of launches. Canonical studio-AI timestamps use the shared zero-based epoch.
const absWeek = (year: number, week: number) => (year * 52) + week;
const studioAbsWeek = (year: number, week: number) => ((Math.max(1, year) - 1) * 52) + (Math.max(1, week) - 1);

const MAX_ACTIVE_VENTURES = 12;
const MAX_TOTAL_VENTURES = 20;

const PREFIXES = ['Northstar', 'Silverline', 'Velvet', 'Ironwood', 'Sable', 'Golden Hour', 'Bright Arc', 'Blue Lantern', 'Red Harbor', 'Wildframe', 'Moonfield', 'Crownline'];
const SUFFIXES = ['Pictures', 'Studios', 'Media', 'Films', 'Entertainment', 'Storyworks', 'Motion Group', 'Creative House', 'Productions', 'Picture Company'];
const CREATOR_PREFIXES = ['Pulse', 'Viral', 'Glowline', 'Signal', 'Hypewell', 'Loopline', 'Framehouse', 'Neon Row'];
const GENRE_PREFIXES = ['Midnight', 'Black Door', 'Graveyard', 'Voltage', 'Afterlight', 'Red Signal', 'Wild Cut'];

const ARCHETYPE_BUDGETS: Record<NpcVentureArchetype, BudgetTier[]> = {
    PRESTIGE_LABEL: ['LOW', 'MID'],
    COMMERCIAL_STUDIO: ['MID', 'HIGH'],
    GENRE_HOUSE: ['LOW', 'MID'],
    CREATOR_MEDIA: ['LOW', 'MID'],
    AWARDS_BOUTIQUE: ['LOW', 'MID'],
};

const ARCHETYPE_GENRES: Record<NpcVentureArchetype, Genre[]> = {
    PRESTIGE_LABEL: ['DRAMA', 'THRILLER', 'ROMANCE', 'MYSTERY'],
    COMMERCIAL_STUDIO: ['ACTION', 'COMEDY', 'ADVENTURE'],
    GENRE_HOUSE: ['HORROR', 'THRILLER', 'SCI_FI', 'MYSTERY'],
    CREATOR_MEDIA: ['COMEDY', 'HORROR', 'ACTION'],
    AWARDS_BOUTIQUE: ['DRAMA', 'ROMANCE', 'THRILLER', 'MYSTERY'],
};

const getArchetypeLabel = (language: GameLanguage, archetype: NpcVentureArchetype): string =>
    t(language, `services.npcVenture.archetype.${archetype}`);

const getGenreLabel = (language: GameLanguage, genre: Genre): string =>
    t(language, `services.npcVenture.genre.${genre}`);

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

const uniqueCompanyName = (world: WorldState, archetype: NpcVentureArchetype, rng: () => number): string => {
    const existing = new Set(Object.values(world.npcVentures || {}).map(v => v.name));
    const prefixes = archetype === 'CREATOR_MEDIA' ? CREATOR_PREFIXES : archetype === 'GENRE_HOUSE' ? GENRE_PREFIXES : PREFIXES;

    for (let i = 0; i < 20; i++) {
        const name = `${pick(prefixes, rng)} ${pick(SUFFIXES, rng)}`;
        if (!existing.has(name)) return name;
    }

    return `${pick(prefixes, rng)} ${pick(SUFFIXES, rng)} ${Math.floor(rng() * 90 + 10)}`;
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
    subtext?: string,
    eventKey = headline,
): NewsItem => ({
    id: createDeterministicId('news_npc_venture', player.id, absWeek(player.age, player.currentWeek), eventKey),
    headline,
    subtext,
    category: impactLevel === 'HIGH' ? 'TOP_STORY' : 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel,
});

const fill = (template: string, venture: NpcVentureState, language: GameLanguage, extra: Record<string, string> = {}) =>
    template
        .replace(/{Owner}/g, venture.ownerName)
        .replace(/{Venture}/g, venture.name)
        .replace(/{Archetype}/g, getArchetypeLabel(language, venture.archetype))
        .replace(/{Title}/g, extra.Title || '');

export const createNpcVenture = (player: Player, world: WorldState, suppliedRng?: () => number): { venture: NpcVentureState; news: NewsItem } | null => {
    const language = getPlayerLanguage(player);
    if (!world.npcVentures) world.npcVentures = {};
    const activeCount = Object.values(world.npcVentures).filter(v => v.status === 'ACTIVE').length;
    if (activeCount >= MAX_ACTIVE_VENTURES) return null;

    const pool = getFounderPool(player, world);
    if (pool.length === 0) return null;

    const currentAbsoluteWeek = absWeek(player.age, player.currentWeek);
    const rng = suppliedRng || createDeterministicRng(`${player.id}:npc-venture:${currentAbsoluteWeek}:launch:${Object.keys(world.npcVentures).length}`);
    const owner = pick(pool, rng);
    const fame = owner.stats?.fame || 50;
    const wealthM = Math.max(5, (owner.netWorth || 0) / 1_000_000);
    const archetypes: NpcVentureArchetype[] = owner.occupation === 'DIRECTOR'
            ? ['PRESTIGE_LABEL', 'AWARDS_BOUTIQUE', 'GENRE_HOUSE']
            : ['COMMERCIAL_STUDIO', 'PRESTIGE_LABEL', 'GENRE_HOUSE'];
    const archetype = pick(archetypes, rng);
    const name = uniqueCompanyName(world, archetype, rng);
    const seedMoney = Math.max(18, Math.min(280, wealthM * (0.08 + rng() * 0.18)));
    const venture: NpcVentureState = {
        id: createDeterministicId('npc_venture', player.id, currentAbsoluteWeek, owner.id, Object.keys(world.npcVentures).length),
        name,
        ownerNpcId: owner.id,
        ownerName: owner.name,
        archetype,
        status: 'ACTIVE',
        valuation: Math.max(0.05, seedMoney / 1000),
        cashReserve: seedMoney,
        hype: Math.max(25, Math.min(95, fame * 0.72 + rng() * 22)),
        reputation: Math.max(25, Math.min(92, fame * 0.58 + rng() * 25)),
        creativeQuality: Math.max(35, Math.min(95, (owner.stats?.talent || 55) * 0.65 + rng() * 30)),
        risk: Math.max(15, Math.min(90, 32 + rng() * 38 + (owner.tier === 'ICON' ? -8 : 0))),
        foundedWeek: player.currentWeek,
        foundedYear: player.age,
        lastProjectWeek: 0,
        nextProjectWeek: player.currentWeek + 6 + Math.floor(rng() * 16),
        projectsReleased: 0,
        hits: 0,
        flops: 0,
        history: [],
    };

    world.npcVentures[venture.id] = venture;
    return {
        venture,
        news: makeNews(
            fill(pickVentureVariant(language, 'services.npcVenture.launch.headline', {}, rng), venture, language),
            player,
            fame > 80 ? 'HIGH' : 'MEDIUM',
            t(language, 'services.npcVenture.launch.subtext', {
                ventureName: venture.name,
                capital: venture.cashReserve.toFixed(0),
            }),
            `launch:${venture.id}`,
        ),
    };
};

const getVentureBudgetTier = (venture: NpcVentureState, rng: () => number = createDeterministicRng(`${venture.id}:budget:${venture.projectsReleased}`)): BudgetTier => {
    const options = ARCHETYPE_BUDGETS[venture.archetype];
    let tier = pick(options, rng);
    if (venture.cashReserve < 35) tier = 'LOW';
    else if (venture.cashReserve < 120 && tier === 'HIGH') tier = 'MID';
    else if (venture.hype > 78 && venture.cashReserve > 180 && rng() < 0.2) tier = 'HIGH';
    return tier;
};

const getBudgetTierForMillions = (budgetMillions: number): BudgetTier => budgetMillions >= 100 ? 'HIGH' : budgetMillions >= 25 ? 'MID' : 'LOW';

const createVentureProject = (
    player: Player,
    venture: NpcVentureState,
    rng: () => number,
    commitment: StudioAiSlateCommitment,
    fingerprint?: IndustryContentFingerprint,
): IndustryProject => {
    const committedBudgetMillions = commitment.greenlightBudgetMillions || commitment.proposedBudgetMillions;
    const budgetTier = getBudgetTierForMillions(committedBudgetMillions);
    const budget = Math.max(1_000_000, Math.round(committedBudgetMillions * 1_000_000));
    const genre = fingerprint?.primaryGenre || pick(ARCHETYPE_GENRES[venture.archetype], rng);
    const talentPool = getTalentPool(player);
    const actorPool = talentPool.filter(n => n.occupation === 'ACTOR');
    const owner = talentPool.find(n => n.id === venture.ownerNpcId);
    const lead = owner?.occupation === 'ACTOR' && rng() < 0.38 ? owner : pick(actorPool, rng);
    const directorPool = talentPool.filter(n => n.occupation === 'DIRECTOR');
    const director = owner?.occupation === 'DIRECTOR' && rng() < 0.45 ? owner : pick(directorPool, rng);
    const leadTalent = lead?.stats?.talent || 55;
    const directorTalent = director?.stats?.talent || (director?.tier === 'A_LIST' ? 82 : 65);
    const quality = Math.max(12, Math.min(100, Math.round(
        (venture.creativeQuality * 0.42) +
        (venture.reputation * 0.18) +
        (leadTalent * 0.18) +
        (directorTalent * 0.16) +
        (rng() * 24 - venture.risk * 0.08)
    )));
    const fameMultiplier = calculateProjectFameMultiplier(lead ? [lead.id] : [], director?.name || 'Unknown Director', 0);
    const hypeMultiplier = 0.75 + (venture.hype / 120);
    const qualityMultiplier = Math.max(0.28, quality / 56);
    const volatility = 0.48 + rng() * 1.35;
    const boxOffice = Math.floor(budget * fameMultiplier * hypeMultiplier * qualityMultiplier * volatility);

    return {
        id: createDeterministicId('npc_venture_project', player.id, venture.id, commitment.id),
        title: generateProjectTitle([], rng),
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
        studioAiSlateCommitmentId: commitment.id,
        industryContentFingerprintId: commitment.fingerprintId,
    };
};

export const syncNpcVenturesToStudios = (world: WorldState, absoluteWeek = Math.max(0, world.npcVentureLastProcessedAbsoluteWeek || 0)): WorldState => {
    if (!world.npcVentures) world.npcVentures = {};
    if (!world.studios) world.studios = {};

    Object.values(world.npcVentures).forEach(venture => {
        world.studios![venture.id] = migrateNpcVentureToStudio(
            venture,
            world.studios![venture.id],
            absoluteWeek,
        );
    });

    return world;
};

export const processNpcVentures = (player: Player, world: WorldState): { world: WorldState; news: NewsItem[]; logs: string[] } => {
    const language = getPlayerLanguage(player);
    if (!world.npcVentures) world.npcVentures = {};
    Object.keys(world.npcVentures).forEach(ventureId => {
        const canonical = world.studios?.[ventureId];
        const projection = canonical ? projectStudioToNpcVenture(canonical) : null;
        if (projection) world.npcVentures![ventureId] = projection;
    });
    const news: NewsItem[] = [];
    const logs: string[] = [];
    const currentAbs = absWeek(player.age, player.currentWeek);
    if ((world.npcVentureLastProcessedAbsoluteWeek ?? -1) >= currentAbs) {
        return { world: syncNpcVenturesToStudios(world, studioAbsWeek(player.age, player.currentWeek)), news, logs };
    }

    const activeVentures = Object.values(world.npcVentures).filter(v => v.status === 'ACTIVE');

    const newestLaunchAbs = Math.max(0, ...Object.values(world.npcVentures).map(v => absWeek(v.foundedYear, v.foundedWeek)));
    const launchCooldownPassed = currentAbs - newestLaunchAbs >= 10;
    const launchChance = player.age < 20 ? 0.015 : 0.045;
    const launchOpportunityRng = createDeterministicRng(`${player.id}:npc-venture:${currentAbs}:launch-opportunity`);
    if (launchCooldownPassed && activeVentures.length < MAX_ACTIVE_VENTURES && launchOpportunityRng() < launchChance) {
        const created = createNpcVenture(player, world, createDeterministicRng(`${player.id}:npc-venture:${currentAbs}:launch`));
        if (created) {
            news.push(created.news);
            logs.push(t(language, 'services.npcVenture.log.launch', {
                ownerName: created.venture.ownerName,
                ventureName: created.venture.name,
            }));
        }
    }

    Object.values(world.npcVentures).forEach(venture => {
        if (venture.status !== 'ACTIVE') return;
        const rng = createDeterministicRng(`${player.id}:npc-venture:${currentAbs}:${venture.id}:progress:${venture.projectsReleased}`);

        const pressure = venture.cashReserve < 45 ? 0.12 : 0;
        venture.hype = Math.max(5, Math.min(100, venture.hype + (rng() * 3.4 - 1.6) - pressure));
        venture.reputation = Math.max(5, Math.min(100, venture.reputation + (rng() * 2.2 - 0.9)));
        venture.valuation = Math.max(0.01, venture.valuation * (1 + (rng() * 0.024 - 0.009)));
        venture.cashReserve = Math.max(-30, venture.cashReserve + (venture.valuation * 0.3));

        // B6 owns physical production and release. This legacy projection no longer
        // consumes greenlights or fabricates an instant public project.

        const shouldClose = venture.projectsReleased >= 2 && (venture.cashReserve < 0 || (venture.flops >= 3 && venture.hits === 0) || venture.valuation < 0.025);
        if (shouldClose) {
            venture.status = 'CLOSED';
            venture.closureReason = t(language, venture.cashReserve < 0 ? 'services.npcVenture.closure.reason.cash' : 'services.npcVenture.closure.reason.slate');
            news.push(makeNews(
                fill(pickVentureVariant(language, 'services.npcVenture.closure.headline', {}, rng), venture, language),
                player,
                'HIGH',
                venture.closureReason,
                `closure:${venture.id}:${venture.projectsReleased}`,
            ));
            logs.push(t(language, 'services.npcVenture.log.closure', {
                ventureName: venture.name,
                count: venture.projectsReleased,
            }));
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

    world.npcVentureLastProcessedAbsoluteWeek = currentAbs;
    return { world: syncNpcVenturesToStudios(world, studioAbsWeek(player.age, player.currentWeek)), news, logs };
};

export const generateNpcVentureRoleOffer = (player: Player): { opportunity: AuditionOpportunity; venture: NpcVentureState } | null => {
    const language = getPlayerLanguage(player);
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
    project.description = t(language, 'services.npcVenture.project.description', {
        ventureName: venture.name,
        genre: getGenreLabel(language, project.genre),
        projectType: type === 'MOVIE'
            ? t(language, 'services.npcVenture.project.type.movie')
            : t(language, 'services.npcVenture.project.type.series'),
        ownerName: venture.ownerName,
    });
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

export const getNpcVentureOfferText = (venture: NpcVentureState, opportunity: AuditionOpportunity, language: GameLanguage = 'en'): string => (
    t(language, 'services.npcVenture.offer.text', {
        intro: pickVentureVariant(language, 'services.npcVenture.offer.intro'),
        projectName: opportunity.projectName,
        studioName: venture.name,
        founderName: venture.ownerName,
        roleType: opportunity.roleType,
        estimatedPay: opportunity.estimatedIncome.toLocaleString(),
    })
);
