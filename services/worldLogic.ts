
import { WorldState, IndustryProject, StudioId, BudgetTier, Genre, Player, NPCActor, NewsItem, UniverseId, Universe, Festival, TargetAudience } from '../types';
import { STUDIO_CATALOG } from './studioLogic';
import { NPC_DATABASE, calculateProjectFameMultiplier, isCastableActor } from './npcLogic';
import { generateProjectTitle, getEstimatedBudget, generateProjectDetails } from './roleLogic';
import { initUniverses, normalizeUniverseMap, processUniverseTurn } from './universeLogic';
import { processNpcVentures, syncNpcVenturesToStudios } from './npcVentureLogic';
import { ALL_GENRES } from './genreCatalog';
import { applyPassiveStudioEcosystemTurn, applyStudioProjectOutcome, ensureStudioEcosystem } from './studioEcosystem';
import { getPlayerLanguage, t } from './i18n';

// Helpers
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const GENRES: Genre[] = ALL_GENRES;
const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const getWorldAbsoluteWeek = (year: number, week: number) => ((year - 1) * 52) + (week - 1);
const getWorldYearWeek = (absoluteWeek: number) => ({
    year: Math.floor(Math.max(0, absoluteWeek) / 52) + 1,
    week: (Math.max(0, absoluteWeek) % 52) + 1,
});
const normalizeScheduledIndustryProject = (project: IndustryProject): IndustryProject => {
    if (project.weekReleased >= 1 && project.weekReleased <= 52) return project;
    const normalized = getWorldYearWeek(getWorldAbsoluteWeek(project.year, project.weekReleased));
    return {
        ...project,
        year: normalized.year,
        weekReleased: normalized.week,
    };
};

export const FESTIVALS: Festival[] = [
    { id: 'sundance', name: '', nameKey: 'services.worldLogic.festival.sundance.name', weeks: [3, 4], prestigeReq: 60, cost: 100000, description: '', descriptionKey: 'services.worldLogic.festival.sundance.description' },
    { id: 'cannes', name: '', nameKey: 'services.worldLogic.festival.cannes.name', weeks: [19, 20, 21], prestigeReq: 80, cost: 500000, description: '', descriptionKey: 'services.worldLogic.festival.cannes.description' },
    { id: 'tiff', name: '', nameKey: 'services.worldLogic.festival.tiff.name', weeks: [36, 37, 38], prestigeReq: 70, cost: 250000, description: '', descriptionKey: 'services.worldLogic.festival.tiff.description' }
];

export const CALENDAR_EVENTS = [
    { week: 1, name: '', nameKey: 'services.worldLogic.calendar.newYear.name', impact: 1.2, description: '', descriptionKey: 'services.worldLogic.calendar.newYear.description' },
    { week: 7, name: '', nameKey: 'services.worldLogic.calendar.valentines.name', impact: 1.3, description: '', descriptionKey: 'services.worldLogic.calendar.valentines.description' },
    { week: 18, name: '', nameKey: 'services.worldLogic.calendar.summerKickoff.name', impact: 1.4, description: '', descriptionKey: 'services.worldLogic.calendar.summerKickoff.description' },
    { week: 26, name: '', nameKey: 'services.worldLogic.calendar.july4.name', impact: 1.5, description: '', descriptionKey: 'services.worldLogic.calendar.july4.description' },
    { week: 44, name: '', nameKey: 'services.worldLogic.calendar.halloween.name', impact: 1.4, description: '', descriptionKey: 'services.worldLogic.calendar.halloween.description' },
    { week: 47, name: '', nameKey: 'services.worldLogic.calendar.thanksgiving.name', impact: 1.3, description: '', descriptionKey: 'services.worldLogic.calendar.thanksgiving.description' },
    { week: 51, name: '', nameKey: 'services.worldLogic.calendar.christmas.name', impact: 1.6, description: '', descriptionKey: 'services.worldLogic.calendar.christmas.description' }
];

const getIndustryReleaseNews = (project: IndustryProject, player: Player, language = getPlayerLanguage(player)): NewsItem | null => {
    const isHit = project.boxOffice > getEstimatedBudget(project.budgetTier) * 3;
    const isFlop = project.boxOffice < getEstimatedBudget(project.budgetTier) * 0.8;

    if (!(project.budgetTier === 'HIGH' || isHit || isFlop || project.directorName === "Nyanika Mishra")) {
        return null;
    }

    let headline = t(language, 'services.worldLogic.news.industryRelease.default.headline', { title: project.title });
    if (isHit) headline = t(language, 'services.worldLogic.news.industryRelease.hit.headline', { title: project.title });
    if (isFlop) headline = t(language, 'services.worldLogic.news.industryRelease.flop.headline', { title: project.title });
    if (project.quality > 90) headline = t(language, 'services.worldLogic.news.industryRelease.masterpiece.headline', { title: project.title });

    if (project.directorName === "Nyanika Mishra") {
        headline = t(language, 'services.worldLogic.news.industryRelease.visionary.headline', { title: project.title });
    }

    return {
        id: `news_world_${project.id}`,
        headline,
        subtext: t(language, 'services.worldLogic.news.industryRelease.subtext', {
            leadActorName: project.leadActorName,
            directorName: project.directorName
        }),
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: isHit || isFlop ? 'HIGH' : 'MEDIUM'
    };
};

// 1. Generate an Industry Project
export const generateIndustryProject = (
    currentWeek: number, 
    year: number, 
    forcedLead?: NPCActor
): IndustryProject => {
    
    // Pick Studio
    const studioId = pick(Object.keys(STUDIO_CATALOG)) as StudioId;
    const studio = STUDIO_CATALOG[studioId];
    
    // Pick Budget based on studio comfort
    const tier = pick(studio.budgetComfort);
    
    // Pick Genre
    const genre = pick(GENRES);
    
    // Pick Lead Actor
    let lead: NPCActor;
    if (forcedLead && isCastableActor(forcedLead)) {
        lead = forcedLead;
    } else {
        let pool = NPC_DATABASE.filter(n => isCastableActor(n));
        if (tier === 'HIGH') pool = pool.filter(n => n.tier === 'A_LIST' || n.tier === 'ESTABLISHED');
        else if (tier === 'MID') pool = pool.filter(n => n.tier === 'ESTABLISHED' || n.tier === 'RISING');
        else pool = pool.filter(n => n.tier === 'RISING' || n.tier === 'INDIE');
        
        lead = pick(pool.length > 0 ? pool : NPC_DATABASE.filter(n => isCastableActor(n)));
    }

    // Pick Director
    const director = pick(NPC_DATABASE.filter(n => n.occupation === 'DIRECTOR')) || NPC_DATABASE[0];

    // Generate Quality
    const leadTalent = lead.stats?.talent || 50;
    const budgetBonus = tier === 'HIGH' ? 20 : tier === 'MID' ? 10 : 0;
    const rng = Math.random() * 30;
    
    let directorSkill = 70;
    if (director.name === "Nyanika Mishra") directorSkill = 100; 
    else if (director.tier === 'A_LIST') directorSkill = 90;
    else if (director.tier === 'ESTABLISHED') directorSkill = 75;

    // Boosted quality formula to ensure ~50% of movies are decent (above 60) for awards
    const quality = Math.min(100, Math.floor((leadTalent + directorSkill + budgetBonus + rng) / 3) + 5);

    const budget = getEstimatedBudget(tier);
    const fameMultiplier = calculateProjectFameMultiplier([lead.id], director.name, 0);
    const qualityMod = quality / 50;
    
    let luck = 0.5 + Math.random();
    if (director.name === "Nyanika Mishra") luck = Math.max(luck, 1.5);
 
    let boxOffice = budget * fameMultiplier * qualityMod * luck;
    if (tier === 'HIGH' && boxOffice < budget) boxOffice = budget * 0.8; 
    
    let review = "MIXED";
    if (quality > 80) review = "HIT";
    else if (quality < 40) review = "FLOP";

    const targetAudiences: TargetAudience[] = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
    const targetAudience = targetAudiences[Math.floor(Math.random() * targetAudiences.length)];
    const rating = Math.round(Math.max(4, Math.min(9.8, (
        (quality + (Math.random() * 22) - 8) / 10
    ))) * 10) / 10;
    const prestigeGenreBoost = ['DRAMA', 'BIOPIC', 'MUSICAL', 'DOCUMENTARY'].includes(genre) ? 7 : 0;
    const musicGenreBoost = ['MUSICAL', 'ANIMATION', 'BIOPIC', 'DRAMA', 'FANTASY'].includes(genre) ? 9 : 0;
    const campaign = clampScore(
        (tier === 'HIGH' ? 76 : tier === 'MID' ? 62 : 45)
        + (Math.random() * 24 - 8)
    );
    const picture = clampScore(
        (quality * 0.58)
        + (rating * 3.2)
        + prestigeGenreBoost
        + (campaign * 0.08)
        + (Math.random() * 12 - 6)
    );

    return {
        id: `ind_proj_${Date.now()}_${Math.random()}`,
        title: generateProjectTitle([]), 
        genre,
        mediaType: 'MOVIE',
        targetAudience,
        studioId,
        budgetTier: tier,
        quality,
        rating,
        boxOffice: Math.floor(boxOffice),
        year,
        weekReleased: currentWeek,
        leadActorId: lead.id,
        leadActorName: lead.name,
        directorName: director.name,
        reviews: review,
        awardProfile: {
            leadPerformance: clampScore((leadTalent * 0.58) + (quality * 0.34) + (Math.random() * 18 - 5)),
            directing: clampScore((directorSkill * 0.58) + (quality * 0.34) + (Math.random() * 16 - 5)),
            screenplay: clampScore((quality * 0.72) + prestigeGenreBoost + (Math.random() * 26 - 10)),
            cinematography: clampScore((quality * 0.68) + (tier === 'HIGH' ? 9 : 3) + (Math.random() * 22 - 8)),
            picture,
            originalScore: clampScore((quality * 0.62) + musicGenreBoost + (Math.random() * 28 - 12)),
            originalSong: clampScore(
                (quality * 0.48)
                + (['MUSICAL', 'ANIMATION', 'BIOPIC'].includes(genre) ? 24 : 2)
                + (Math.random() * 34 - 15)
            ),
            campaign
        }
    };
};

// 2. Process World Turn (Runs Weekly)
export const processWorldTurn = (player: Player): { world: WorldState, news: NewsItem[], logs: string[] } => {
    const language = getPlayerLanguage(player);
    let newWorld = { ...player.world };
    const news: NewsItem[] = [];
    const logs: string[] = [];
    if (!newWorld.npcVentures) newWorld.npcVentures = {};
    newWorld = syncNpcVenturesToStudios(newWorld);
    newWorld = ensureStudioEcosystem(newWorld);
    newWorld.universes = normalizeUniverseMap(newWorld.universes, language);

    // --- A. MAINTAIN RIVAL SCHEDULE ---
    // Ensure we have at least 12 weeks of upcoming rivals
    if (!newWorld.upcomingRivals) newWorld.upcomingRivals = [];
    const currentAbsoluteWeek = getWorldAbsoluteWeek(player.age, player.currentWeek);
    newWorld.upcomingRivals = newWorld.upcomingRivals
        .map(normalizeScheduledIndustryProject)
        .filter(project => getWorldAbsoluteWeek(project.year, project.weekReleased) >= currentAbsoluteWeek);

    // Keep two rival releases queued for each of the next 12 weeks, including
    // weeks that cross a birthday/year boundary.
    for (let offset = 1; offset <= 12; offset += 1) {
        const targetAbsoluteWeek = currentAbsoluteWeek + offset;
        const target = getWorldYearWeek(targetAbsoluteWeek);
        let scheduledForTarget = newWorld.upcomingRivals.filter(project => (
            getWorldAbsoluteWeek(project.year, project.weekReleased) === targetAbsoluteWeek
        )).length;
        while (scheduledForTarget < 2) {
            newWorld.upcomingRivals.push(generateIndustryProject(target.week, target.year));
            scheduledForTarget += 1;
        }
    }

    newWorld.upcomingRivals.sort((a, b) => (
        getWorldAbsoluteWeek(a.year, a.weekReleased) - getWorldAbsoluteWeek(b.year, b.weekReleased)
    ));

    // --- B. RELEASE RIVALS FOR THIS WEEK ---
    const rivalsToRelease = newWorld.upcomingRivals.filter(project => (
        getWorldAbsoluteWeek(project.year, project.weekReleased) === currentAbsoluteWeek
    ));
    rivalsToRelease.forEach(project => {
        newWorld.projects.unshift(project);
        newWorld = applyStudioProjectOutcome(newWorld, project).world;

        // Find and Pay the Lead Actor
        const lead = NPC_DATABASE.find(n => n.id === project.leadActorId);
        if (lead && lead.stats) {
            // Fame Boost
            const fameGain = project.budgetTier === 'HIGH' ? 3 : project.budgetTier === 'MID' ? 1 : 0.3;
            lead.stats.fame = Math.min(100, lead.stats.fame + fameGain);
            
            // Salary Logic
            let salary = 0;
            if (project.budgetTier === 'HIGH') {
                salary = 12000000 + Math.floor(Math.random() * 18000000); // $12M - $30M
            } else if (project.budgetTier === 'MID') {
                salary = 1500000 + Math.floor(Math.random() * 3500000); // $1.5M - $5M
            } else {
                salary = 50000 + Math.floor(Math.random() * 200000); // $50k - $250k
            }

            // Backend Logic
            const estimatedBudget = getEstimatedBudget(project.budgetTier);
            if (project.boxOffice > estimatedBudget * 2.5 && project.budgetTier !== 'LOW') {
                // Hit! 1% to 4% backend
                const points = 0.01 + (Math.random() * 0.03);
                const backend = Math.floor(project.boxOffice * points);
                salary += backend;
            }

            lead.netWorth += salary;
        }

        const directorNpc = NPC_DATABASE.find(n => n.name === project.directorName && n.occupation === 'DIRECTOR');
        if (directorNpc && directorNpc.stats) {
            const fameGain = project.budgetTier === 'HIGH' ? 2.2 : project.budgetTier === 'MID' ? 0.8 : 0.2;
            directorNpc.stats.fame = Math.min(100, (directorNpc.stats.fame || 45) + fameGain);

            let directorFee = 0;
            if (project.budgetTier === 'HIGH') {
                directorFee = 4_000_000 + Math.floor(Math.random() * 8_000_000);
            } else if (project.budgetTier === 'MID') {
                directorFee = 750_000 + Math.floor(Math.random() * 1_750_000);
            } else {
                directorFee = 25_000 + Math.floor(Math.random() * 125_000);
            }

            const estimatedBudget = getEstimatedBudget(project.budgetTier);
            if (project.boxOffice > estimatedBudget * 2.5 && project.budgetTier !== 'LOW') {
                directorFee += Math.floor(project.boxOffice * (0.003 + Math.random() * 0.012));
            }

            directorNpc.netWorth += directorFee;
        }

        const releaseNews = getIndustryReleaseNews(project, player, language);
        if (releaseNews) news.push(releaseNews);
    });
    newWorld.upcomingRivals = newWorld.upcomingRivals.filter(project => (
        getWorldAbsoluteWeek(project.year, project.weekReleased) > currentAbsoluteWeek
    ));

    // --- C. SIMULATE NPC ECONOMY (Passive) ---
    // Apply small market fluctuations to all NPCs to keep the Forbes list dynamic
    NPC_DATABASE.forEach(npc => {
        // -0.5% to +1.0% weekly swing
        const percentChange = (Math.random() * 0.015) - 0.005; 
        const change = Math.floor(npc.netWorth * percentChange);
        npc.netWorth += change;
    });

    newWorld = applyPassiveStudioEcosystemTurn(newWorld, player.currentWeek, player.age).world;

    const ventureResult = processNpcVentures(player, newWorld);
    newWorld = ventureResult.world;
    news.push(...ventureResult.news);
    logs.push(...ventureResult.logs);
    newWorld.universes = normalizeUniverseMap(newWorld.universes, language);

    if (!newWorld.universes || Object.keys(newWorld.universes).length === 0) {
        newWorld.universes = initUniverses(language);
    }

    (Object.keys(newWorld.universes) as UniverseId[]).forEach(uid => {
        const uni = newWorld.universes[uid];
        const res = processUniverseTurn(player, uni);
        newWorld.universes[uid] = res.universe;
        news.push(...res.news);
        
        if (res.project) {
            newWorld.projects.unshift(res.project);
            newWorld = applyStudioProjectOutcome(newWorld, res.project).world;
            news.push({
                id: `news_uni_rel_${res.project.id}`,
                headline: t(language, 'services.worldLogic.news.universeRelease.headline', { title: res.project.title }),
                category: 'UNIVERSE',
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'HIGH'
            });
        }
    });

    // --- B. GENERATE NEW RELEASES & PAY NPCs ---
    if (Math.random() < 0.7) { 
        const project = generateIndustryProject(player.currentWeek, player.age);
        newWorld.projects.unshift(project);
        newWorld = applyStudioProjectOutcome(newWorld, project).world;

        // Find and Pay the Lead Actor
        const lead = NPC_DATABASE.find(n => n.id === project.leadActorId);
        if (lead && lead.stats) {
            // Fame Boost
            const fameGain = project.budgetTier === 'HIGH' ? 3 : project.budgetTier === 'MID' ? 1 : 0.3;
            lead.stats.fame = Math.min(100, lead.stats.fame + fameGain);
            
            // Salary Logic
            let salary = 0;
            if (project.budgetTier === 'HIGH') {
                salary = 12000000 + Math.floor(Math.random() * 18000000); // $12M - $30M
            } else if (project.budgetTier === 'MID') {
                salary = 1500000 + Math.floor(Math.random() * 3500000); // $1.5M - $5M
            } else {
                salary = 50000 + Math.floor(Math.random() * 200000); // $50k - $250k
            }

            // Backend Logic
            const estimatedBudget = getEstimatedBudget(project.budgetTier);
            if (project.boxOffice > estimatedBudget * 2.5 && project.budgetTier !== 'LOW') {
                // Hit! 1% to 4% backend
                const points = 0.01 + (Math.random() * 0.03);
                const backend = Math.floor(project.boxOffice * points);
                salary += backend;
            }

            lead.netWorth += salary;
        }

        const directorNpc = NPC_DATABASE.find(n => n.name === project.directorName && n.occupation === 'DIRECTOR');
        if (directorNpc && directorNpc.stats) {
            const fameGain = project.budgetTier === 'HIGH' ? 2.2 : project.budgetTier === 'MID' ? 0.8 : 0.2;
            directorNpc.stats.fame = Math.min(100, (directorNpc.stats.fame || 45) + fameGain);

            let directorFee = 0;
            if (project.budgetTier === 'HIGH') {
                directorFee = 4_000_000 + Math.floor(Math.random() * 8_000_000);
            } else if (project.budgetTier === 'MID') {
                directorFee = 750_000 + Math.floor(Math.random() * 1_750_000);
            } else {
                directorFee = 25_000 + Math.floor(Math.random() * 125_000);
            }

            const estimatedBudget = getEstimatedBudget(project.budgetTier);
            if (project.boxOffice > estimatedBudget * 2.5 && project.budgetTier !== 'LOW') {
                directorFee += Math.floor(project.boxOffice * (0.003 + Math.random() * 0.012));
            }

            directorNpc.netWorth += directorFee;
        }

        const releaseNews = getIndustryReleaseNews(project, player, language);
        if (releaseNews) news.push(releaseNews);
    }

    // Preserve the current and previous release years in full so early-year
    // contenders still exist when the following award season arrives.
    const awardsWindowProjects = newWorld.projects.filter(project => project.year >= player.age - 1);
    const olderProjects = newWorld.projects
        .filter(project => project.year < player.age - 1)
        .slice(0, 20);
    newWorld.projects = [...awardsWindowProjects, ...olderProjects].slice(0, 320);

    return { world: newWorld, news, logs };
};
