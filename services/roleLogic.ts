
// ... existing imports
import { 
    Player, RoleType, Stats, Commitment, ActorSkills, BudgetTier, ProjectType, 
    ProjectDetails, ReleaseScale, OutcomeTier, ProjectMemoryTag, FuturePotential, 
    ProjectSubtype, SeriesStatus, ReleaseStrategy, AuditionOpportunity, 
    ProjectHiddenStats, ActiveRelease, NegotiationData, CastMember, Review, 
    NPCActor, StudioId, PressInteraction, Genre, IndustryProject, WriterStats, DirectorStats, TargetAudience
} from '../types';
import { selectStudioForProject } from './studioLogic';
import { NPC_DATABASE } from './npcLogic';
import { generateFamousMovieOpportunity, generateFamousSeriesOpportunity } from './famousMovieLogic';

// --- CONSTANTS ---

export const ROLE_DEFINITIONS: Record<RoleType, { label: string; difficulty: number; energyCost: number; baseIncome: number; expGain: number }> = {
    MINOR: { label: 'Minor Role', difficulty: 10, energyCost: 10, baseIncome: 500, expGain: 1 },
    CAMEO: { label: 'Cameo', difficulty: 20, energyCost: 5, baseIncome: 1000, expGain: 2 },
    SUPPORTING: { label: 'Supporting Lead', difficulty: 40, energyCost: 20, baseIncome: 3000, expGain: 5 },
    ENSEMBLE: { label: 'Ensemble Cast', difficulty: 50, energyCost: 25, baseIncome: 4000, expGain: 6 },
    LEAD: { label: 'Lead Role', difficulty: 70, energyCost: 40, baseIncome: 10000, expGain: 10 }
};

// ... (Keep existing GENRES, SYNERGIES, HELPERS, CALCULATIONS) ...
const GENRES: Genre[] = ['DRAMA', 'COMEDY', 'ACTION', 'SCI_FI', 'HORROR', 'THRILLER', 'ROMANCE', 'ADVENTURE', 'SUPERHERO'];

export const GENRE_SYNERGIES: Record<Genre, Genre[]> = {
    ACTION: ['ADVENTURE', 'THRILLER', 'SUPERHERO'],
    DRAMA: ['ROMANCE', 'THRILLER'],
    COMEDY: ['ROMANCE'],
    ROMANCE: ['DRAMA', 'COMEDY'],
    THRILLER: ['HORROR', 'DRAMA', 'ACTION'],
    SCI_FI: ['ADVENTURE', 'ACTION', 'SUPERHERO'],
    HORROR: ['THRILLER', 'SCI_FI'],
    ADVENTURE: ['ACTION', 'SCI_FI', 'SUPERHERO'],
    SUPERHERO: ['ACTION', 'SCI_FI', 'ADVENTURE']
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ... (Keep existing functions: rewardGenreExperience, calculateGenreFit, etc.) ...
export const rewardGenreExperience = (player: Player, primaryGenre: Genre, baseAmount: number) => {
    const current = player.stats.genreXP[primaryGenre] || 0;
    const primaryGain = current > 80 ? baseAmount * 0.5 : baseAmount;
    player.stats.genreXP[primaryGenre] = Math.min(100, current + primaryGain);

    const synergyGain = baseAmount * 0.25;
    const related = GENRE_SYNERGIES[primaryGenre] || [];
    
    related.forEach(gen => {
        const cur = player.stats.genreXP[gen] || 0;
        player.stats.genreXP[gen] = Math.min(100, cur + synergyGain);
    });
};

export const calculateGenreFit = (player: Player, project: ProjectDetails): { fitScore: number, isMismatch: boolean } => {
    const proficiency = player.stats.genreXP[project.genre] || 0;
    let isMismatch = false;
    if (proficiency < 20) isMismatch = true;
    return { fitScore: proficiency, isMismatch };
};

export const calculateGlobalTalent = (skills: ActorSkills, writerStats?: WriterStats, directorStats?: DirectorStats): number => {
    const actorValues = [
        skills?.delivery || 0, 
        skills?.memorization || 0, 
        skills?.expression || 0, 
        skills?.improvisation || 0, 
        skills?.discipline || 0, 
        skills?.presence || 0, 
        skills?.charisma || 0
    ].map(v => isNaN(v) ? 0 : v);
    const actorTalent = actorValues.reduce((sum, val) => sum + val, 0) / actorValues.length;
    
    let totalTalent = actorTalent;
    let count = 1;

    if (writerStats) {
        const writerTalent = (
            (isNaN(writerStats.creativity) ? 0 : writerStats.creativity || 0) + 
            (isNaN(writerStats.dialogue) ? 0 : writerStats.dialogue || 0) + 
            (isNaN(writerStats.structure) ? 0 : writerStats.structure || 0) + 
            (isNaN(writerStats.pacing) ? 0 : writerStats.pacing || 0)
        ) / 4;
        totalTalent += writerTalent;
        count++;
    }

    if (directorStats) {
        const directorTalent = (
            (isNaN(directorStats.vision) ? 0 : directorStats.vision || 0) + 
            (isNaN(directorStats.technical) ? 0 : directorStats.technical || 0) + 
            (isNaN(directorStats.leadership) ? 0 : directorStats.leadership || 0) + 
            (isNaN(directorStats.style) ? 0 : directorStats.style || 0)
        ) / 4;
        totalTalent += directorTalent;
        count++;
    }
    
    return isNaN(totalTalent) ? 0 : totalTalent / count;
};

export const getActorTalent = (skills: ActorSkills): number => {
    const actorValues = [
        skills?.delivery || 0, 
        skills?.memorization || 0, 
        skills?.expression || 0, 
        skills?.improvisation || 0, 
        skills?.discipline || 0, 
        skills?.presence || 0, 
        skills?.charisma || 0
    ].map(v => isNaN(v) ? 0 : v);
    const talent = actorValues.reduce((sum, val) => sum + val, 0) / actorValues.length;
    return isNaN(talent) ? 0 : talent;
};

export const getWriterTalent = (writerStats: WriterStats): number => {
    const talent = (
        (isNaN(writerStats?.creativity) ? 0 : writerStats?.creativity || 0) + 
        (isNaN(writerStats?.dialogue) ? 0 : writerStats?.dialogue || 0) + 
        (isNaN(writerStats?.structure) ? 0 : writerStats?.structure || 0) + 
        (isNaN(writerStats?.pacing) ? 0 : writerStats?.pacing || 0)
    ) / 4;
    return isNaN(talent) ? 0 : talent;
};

export const getDirectorTalent = (directorStats: DirectorStats): number => {
    const talent = (
        (isNaN(directorStats?.vision) ? 0 : directorStats?.vision || 0) + 
        (isNaN(directorStats?.technical) ? 0 : directorStats?.technical || 0) + 
        (isNaN(directorStats?.leadership) ? 0 : directorStats?.leadership || 0) + 
        (isNaN(directorStats?.style) ? 0 : directorStats?.style || 0)
    ) / 4;
    return isNaN(talent) ? 0 : talent;
};

// NERFED: Reduced base gain significantly to increase energy sink
export const calculateAuditionGain = (player: Player, roleType: RoleType, currentPrep: number): number => {
    const intelligence = (player.stats.skills.memorization + player.stats.skills.discipline) / 2;
    // Reduced base from 7 to 4
    const gain = 4 + (intelligence * 0.10); 
    const diminishing = Math.max(0.1, 1 - (currentPrep / 100));
    return Math.floor(gain * diminishing);
};

// NERFED: Reduced base gain for production rehearsals
export const calculateProductionGain = (player: Player, roleType: RoleType, currentPerf: number, isOverworked: boolean, commitmentType: string = 'ACTING_GIG'): number => {
    let skill = 0;
    
    if (commitmentType === 'DIRECTOR_GIG') {
        skill = getDirectorTalent(player.directorStats || { vision: 0, technical: 0, leadership: 0, style: 0 });
    } else if (commitmentType === 'WRITER_GIG') {
        skill = getWriterTalent(player.writerStats || { creativity: 0, dialogue: 0, structure: 0, pacing: 0 });
    } else {
        // Default Acting
        skill = (player.stats.skills.expression + player.stats.skills.presence) / 2;
    }

    // Reduced base from 4 to 3
    let gain = 3 + (skill * 0.08); 
    if (isOverworked) gain *= 0.5;
    const diminishing = Math.max(0.1, 1 - (currentPerf / 100));
    return Math.floor(gain * diminishing);
};

export const calculatePassiveGain = (talent: number): number => {
    return Math.floor(talent * 0.05);
};

export const getPhaseDuration = (phase: string): number => {
    switch (phase) {
        case 'AUDITION': return 2 + Math.floor(Math.random() * 6);
        case 'PLANNING': return 15 + Math.floor(Math.random() * 16);
        case 'PRE_PRODUCTION': return 6 + Math.floor(Math.random() * 7);
        case 'PRODUCTION': return 8 + Math.floor(Math.random() * 6);
        case 'POST_PRODUCTION': return 12;
        default: return 4;
    }
};

export const checkAuditionPass = (player: Player, commitment: Commitment): { passed: boolean; reason: string; rivalWinner?: NPCActor } => {
    if (!commitment.roleType || !commitment.projectDetails) return { passed: false, reason: "Invalid role." };
    const role = ROLE_DEFINITIONS[commitment.roleType];
    const isFamous = commitment.projectDetails.isFamous || false;
    
    const prep = commitment.auditionPerformance || 0;
    const talent = getActorTalent(player.stats.skills);
    const genreFit = calculateGenreFit(player, commitment.projectDetails);
    
    let playerScore = (prep * 0.4) + (talent * 0.3) + (genreFit.fitScore * 0.3);
    
    if (player.activeUniverseContract && commitment.projectDetails.universeId === player.activeUniverseContract.universeId) {
        playerScore += 50; 
    }

    if (genreFit.isMismatch && role.difficulty > 20) {
        playerScore -= 20; 
    }
    
    if (isFamous) {
        playerScore -= 20; 
        if (role.difficulty > 30 && player.stats.fame < 40) {
            playerScore = 0; 
        }
    }

    playerScore += Math.random() * 15;

    const rivals = NPC_DATABASE
        .filter(n => {
            if (isFamous) return n.tier === 'A_LIST' || n.tier === 'ESTABLISHED';
            return Math.abs((n.stats?.fame || 0) - player.stats.fame) < 20 && n.occupation === 'ACTOR';
        })
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);
    
    let highestRivalScore = 0;
    let winningRival: NPCActor | undefined;

    rivals.forEach(rival => {
        const rTalent = rival.stats?.talent || 50;
        const rFame = rival.stats?.fame || 10;
        const rScore = (rTalent * 0.6) + (rFame * 0.2) + (Math.random() * 30);
        
        if (rScore > highestRivalScore) {
            highestRivalScore = rScore;
            winningRival = rival;
        }
    });

    const baseThreshold = 50 + (role.difficulty * 0.5);
    const finalThreshold = Math.max(baseThreshold, highestRivalScore);

    if (playerScore >= finalThreshold) {
        rewardGenreExperience(player, commitment.projectDetails.genre, isFamous ? 2.0 : 0.5); 
        return { passed: true, reason: isFamous ? "Incredible! You landed a role in a cinema classic." : "Great performance. You beat out the competition." };
    }
    
    if (winningRival && highestRivalScore > baseThreshold) {
        return { 
            passed: false, 
            reason: `Studio went with ${winningRival.name} instead.`, 
            rivalWinner: winningRival 
        };
    }

    if (isFamous && player.stats.fame < 40 && role.difficulty > 30) return { passed: false, reason: "You're not famous enough for this role yet." };
    if (genreFit.isMismatch) return { passed: false, reason: "Director didn't see you in this genre." };
    if (prep < 50) return { passed: false, reason: "You seemed unprepared." };
    
    return { passed: false, reason: "Stronger candidates available." };
};

export const calculateProjectPay = (roleType: RoleType, budgetTier: BudgetTier, type: ProjectType): number => {
    const base = ROLE_DEFINITIONS[roleType].baseIncome;
    let multiplier = 1;
    
    if (budgetTier === 'MID') multiplier = 20; 
    if (budgetTier === 'HIGH') multiplier = 300; 
    
    if (type === 'MOVIE') multiplier *= 1.2; 
    
    return Math.floor(base * multiplier * (0.8 + Math.random() * 0.4));
};

export const getEstimatedBudget = (tier: BudgetTier): number => {
    switch(tier) {
        case 'LOW': return Math.floor(500000 + Math.random() * 4500000); 
        case 'MID': return Math.floor(20000000 + Math.random() * 60000000); 
        case 'HIGH': return Math.floor(120000000 + Math.random() * 180000000); 
    }
};

export const getBudgetDisplay = (tier: BudgetTier): string => {
    switch(tier) {
        case 'LOW': return '$';
        case 'MID': return '$$';
        case 'HIGH': return '$$$';
    }
};

// --- TITLE GENERATION ---
const TITLES_FIRST = [
    'The', 'A', 'My', 'Our', 'Last', 'First', 'Dark', 'Light', 'Red', 'Blue', 'Golden', 'Silent', 'Loud', 
    'Beyond', 'After', 'Before', 'Under', 'Over', 'Within', 'Without', 'Endless', 'Finite', 'Broken', 'Hidden',
    'Secret', 'Lost', 'Found', 'Eternal', 'Fleeting', 'Wild', 'Quiet', 'Brave', 'Fierce', 'Savage', 'Gentle',
    'Crimson', 'Azure', 'Violet', 'Black', 'White', 'Grey', 'Silver', 'Neon', 'Digital', 'Analog', 'Final',
    'Infinite', 'Zero', 'Alpha', 'Omega', 'Prime', 'Neo', 'Cyber', 'Solar', 'Lunar', 'Stellar', 'Void'
];

const TITLES_ADJ = [
    'Broken', 'Hidden', 'Secret', 'Lost', 'Found', 'Eternal', 'Fleeting', 'Wild', 'Quiet', 'Brave', 'Fierce',
    'Savage', 'Gentle', 'Crimson', 'Azure', 'Violet', 'Black', 'White', 'Grey', 'Silver', 'Neon', 'Digital',
    'Analog', 'Final', 'Infinite', 'Zero', 'Alpha', 'Omega', 'Prime', 'Neo', 'Cyber', 'Solar', 'Lunar',
    'Stellar', 'Void', 'Electric', 'Velvet', 'Crystal', 'Iron', 'Steel', 'Glass', 'Stone', 'Wood', 'Fire',
    'Ice', 'Storm', 'Thunder', 'Rain', 'Wind', 'Cloud', 'Sky', 'Sea', 'Ocean', 'River', 'Mountain', 'Valley'
];

const TITLES_NOUN = [
    'Dream', 'Heart', 'Soul', 'City', 'World', 'Life', 'Death', 'Love', 'Night', 'Day', 'Star', 'Moon', 'Sun',
    'Sky', 'Sea', 'Ocean', 'River', 'Mountain', 'Valley', 'Forest', 'Desert', 'Garden', 'Machine', 'Ghost',
    'Spirit', 'Shadow', 'Light', 'Flame', 'Spark', 'Ember', 'Ash', 'Dust', 'Bone', 'Blood', 'Tear', 'Smile',
    'Laugh', 'Cry', 'Scream', 'Whisper', 'Song', 'Dance', 'Walk', 'Run', 'Jump', 'Fall', 'Rise', 'Fly',
    'Horizon', 'Frontier', 'Empire', 'Kingdom', 'Republic', 'Union', 'Federation', 'Alliance', 'Syndicate'
];

const TITLES_VERB = [
    'Rising', 'Falling', 'Burning', 'Freezing', 'Breaking', 'Healing', 'Living', 'Dying', 'Loving', 'Hating',
    'Fighting', 'Surviving', 'Winning', 'Losing', 'Searching', 'Finding', 'Hiding', 'Seeking', 'Chasing',
    'Running', 'Walking', 'Sleeping', 'Dreaming', 'Waking', 'Calling', 'Answering', 'Asking', 'Knowing'
];

export const generateProjectTitle = (existingTitles: string[]): string => {
    let title = "";
    let attempts = 0;
    do {
        const structure = Math.floor(Math.random() * 5); // Increased variations
        if (structure === 0) title = `${pick(TITLES_FIRST)} ${pick(TITLES_NOUN)}`;
        else if (structure === 1) title = `${pick(TITLES_FIRST)} ${pick(TITLES_ADJ)} ${pick(TITLES_NOUN)}`;
        else if (structure === 2) title = `${pick(TITLES_ADJ)} ${pick(TITLES_NOUN)}`;
        else if (structure === 3) title = `The ${pick(TITLES_NOUN)} of ${pick(TITLES_NOUN)}`;
        else title = `${pick(TITLES_NOUN)} ${pick(TITLES_VERB)}`;
        
        attempts++;
    } while (existingTitles.includes(title) && attempts < 20);
    return title;
};

export const generateHiddenStats = (tier: BudgetTier): ProjectHiddenStats => {
    const base = tier === 'LOW' ? 30 : tier === 'MID' ? 50 : 70;
    const variance = 25; // Increased variance for more unpredictable outcomes
    
    // Improved roll function with "Masterpiece" potential
    const roll = () => {
        let val = base + (Math.random() * variance * 2) - variance;
        // 8% chance for a "Breakout" quality boost, allowing even low-budget projects to shine
        if (Math.random() > 0.92) {
            val += 15 + Math.random() * 20;
        }
        return Math.floor(Math.min(100, Math.max(10, val)));
    };

    const script = roll();
    const director = roll();
    const casting = roll();
    const distribution = tier === 'HIGH' ? Math.min(100, roll() + 20) : roll();
    const hype = tier === 'HIGH' ? Math.min(100, roll() + 30) : roll();
    
    const baseQuality = (script * 0.4) + (director * 0.3) + (casting * 0.3);
    // Add final variance to the quality score itself (+/- 5 points)
    const qualityScore = Math.max(10, Math.min(100, Math.floor(baseQuality + (Math.random() * 10 - 5))));
    
    return {
        scriptQuality: script,
        directorQuality: director,
        castingStrength: casting,
        distributionPower: distribution,
        rawHype: hype,
        qualityScore,
        prestigeBonus: (script > 85 && director > 85) ? 1 : 0
    };
};

export const generateProjectDetails = (tier: BudgetTier, type: ProjectType, usedTitles: string[], player: Player): ProjectDetails => {
    const genre = pick(GENRES);
    const studio = selectStudioForProject(tier, player);
    const hidden = generateHiddenStats(tier);
    const title = generateProjectTitle(usedTitles);
    
    const dirFirst = ['Christopher', 'Greta', 'Steven', 'Martin', 'Quentin', 'Sofia', 'Wes', 'James', 'Denis', 'Chloe'];
    const dirLast = ['Nolan', 'Gerwig', 'Spielberg', 'Scorsese', 'Tarantino', 'Coppola', 'Anderson', 'Cameron', 'Villeneuve', 'Zhao'];
    const directorName = `${pick(dirFirst)} ${pick(dirLast)}`;

    const isStreamingStudio = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'].includes(studio.id);
    const releaseStrategy: ReleaseStrategy = (type === 'SERIES' || isStreamingStudio) ? 'STREAMING_ONLY' : 'THEATRICAL';

    const targetAudiences: TargetAudience[] = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
    const targetAudience = targetAudiences[Math.floor(Math.random() * targetAudiences.length)];

    return {
        title,
        type,
        description: `A ${genre.toLowerCase().replace('_', ' ')} ${type === 'MOVIE' ? 'film' : 'series'} about ${pick(['love', 'revenge', 'hope', 'survival'])}.`,
        studioId: studio.id,
        subtype: 'STANDALONE',
        genre,
        targetAudience,
        budgetTier: tier,
        estimatedBudget: getEstimatedBudget(tier),
        releaseScale: tier === 'HIGH' ? 'GLOBAL' : tier === 'MID' ? 'MASS' : 'LIMITED',
        releaseStrategy, 
        visibleHype: hidden.rawHype > 80 ? 'HIGH' : hidden.rawHype > 50 ? 'MID' : 'LOW',
        hiddenStats: hidden,
        directorName,
        visibleDirectorTier: hidden.directorQuality > 80 ? 'A-List' : hidden.directorQuality > 60 ? 'Established' : 'Indie',
        visibleScriptBuzz: hidden.scriptQuality > 80 ? 'Hot' : hidden.scriptQuality > 60 ? 'Good' : 'Unknown',
        visibleCastStrength: hidden.castingStrength > 80 ? 'Star-Studded' : hidden.castingStrength > 60 ? 'Solid' : 'Unknown',
        episodes: type === 'SERIES' ? 8 + Math.floor(Math.random() * 5) : undefined
    };
};

export const generateAudition = (
    roleType: RoleType, 
    tier: BudgetTier, 
    usedTitles: string[], 
    player: Player, 
    source: 'CASTING_APP' | 'AGENT' | 'DIRECT',
    forcedType?: ProjectType
): AuditionOpportunity => {
    const type: ProjectType = forcedType || (Math.random() > 0.4 ? 'MOVIE' : 'SERIES');
    const project = generateProjectDetails(tier, type, usedTitles, player);
    const income = calculateProjectPay(roleType, tier, type);
    
    let energyCost = ROLE_DEFINITIONS[roleType].energyCost;
    if (tier === 'HIGH' && roleType === 'LEAD') {
        energyCost = 45; 
    } else if (tier === 'MID' && roleType === 'LEAD') {
        energyCost = 35; 
    }

    const config = { ...ROLE_DEFINITIONS[roleType], energyCost };

    return {
        id: `aud_${Date.now()}_${Math.random()}`,
        roleType,
        projectName: project.title,
        genre: project.genre,
        config: config,
        project,
        estimatedIncome: income,
        source
    };
};

export const generateAuditions = (player: Player, usedTitles: string[]): AuditionOpportunity[] => {
    const count = 3 + Math.floor(Math.random() * 3);
    const opps: AuditionOpportunity[] = [];
    
    for(let i=0; i<count; i++) {
        // Director Favor (Direct Bookings)
        const directorFriends = player.relationships.filter(r => (r.relation === 'Director' || r.relation === 'Connection') && r.closeness > 50);
        if (directorFriends.length > 0 && Math.random() < 0.15) {
            const friend = directorFriends[Math.floor(Math.random() * directorFriends.length)];
            const npc = NPC_DATABASE.find(n => n.id === friend.npcId);
            if (npc) {
                const role: RoleType = Math.random() > 0.7 ? 'LEAD' : 'SUPPORTING';
                const opp = generateAudition(role, 'MID', usedTitles, player, 'DIRECT');
                opp.projectName = `${npc.name}'s Next Project`;
                opp.source = 'DIRECT';
                opp.estimatedIncome = Math.floor(opp.estimatedIncome * 1.2); // Better pay from friends
                opps.push(opp);
                continue;
            }
        }

        const famousRoll = Math.random();
        if (famousRoll < 0.05) {
            const famousOpp = Math.random() > 0.5 
                ? generateFamousMovieOpportunity(player) 
                : generateFamousSeriesOpportunity(player);
            
            if (famousOpp) {
                opps.push(famousOpp);
                continue;
            }
        }

        let tier: BudgetTier = 'LOW';
        if (player.stats.fame > 20 && Math.random() > 0.6) tier = 'MID';
        if (player.stats.fame > 60 && Math.random() > 0.7) tier = 'HIGH';
        
        let role: RoleType = 'MINOR';
        const r = Math.random();
        if (r > 0.9) role = 'SUPPORTING';
        else if (r > 0.6) role = 'CAMEO';
        else role = 'MINOR';
        
        if (player.stats.fame > 30 && r > 0.8) role = 'LEAD';

        opps.push(generateAudition(role, tier, usedTitles, player, 'CASTING_APP'));
    }
    return opps;
};

// ... (Keep JOB_POOL, generatePartTimeJobs, generateCastList, generateReviews) ...
const JOB_POOL: Partial<Commitment>[] = [
    { name: 'Waiter', energyCost: 30, income: 450 },
    { name: 'Barista', energyCost: 25, income: 350 },
    { name: 'Background Extra', energyCost: 20, income: 200 },
    { name: 'Ride Share Driver', energyCost: 15, income: 300 },
    { name: 'Catering Server', energyCost: 35, income: 500 },
    { name: 'Brand Ambassador', energyCost: 30, income: 600 }, 
    { name: 'Club Promoter', energyCost: 50, income: 1000 }, 
    { name: 'Security Guard', energyCost: 40, income: 550 },
    { name: 'Dog Walker', energyCost: 20, income: 250 },
    { name: 'Retail Associate', energyCost: 30, income: 380 },
    { name: 'Bartender', energyCost: 40, income: 800 },
    { name: 'Personal Trainer', energyCost: 35, income: 700 },
    { name: 'Social Media Assistant', energyCost: 20, income: 400 },
    { name: 'Tutor', energyCost: 25, income: 500 }
];

export const generatePartTimeJobs = (): Commitment[] => {
    const count = 3 + Math.floor(Math.random() * 2);
    const shuffled = [...JOB_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    return selected.map((job, i) => ({
        id: `job_offer_${Date.now()}_${i}`,
        name: job.name!,
        type: 'JOB',
        energyCost: job.energyCost!,
        income: job.income!,
        roleType: 'MINOR',
        payoutType: 'WEEKLY'
    }));
};

export const generateCastList = (player: Player, project: ProjectDetails, playerRole: RoleType): CastMember[] => {
    const cast: CastMember[] = [];
    cast.push({
        id: 'player',
        name: player.name,
        role: playerRole === 'LEAD' ? 'Lead' : playerRole === 'SUPPORTING' ? 'Supporting' : 'Cast',
        isPlayer: true,
        image: player.avatar,
        type: 'ACTOR'
    });

    let count = 2;
    if (project.budgetTier === 'MID') count = 4;
    if (project.budgetTier === 'HIGH') count = 6;

    const pool = [...NPC_DATABASE].sort(() => 0.5 - Math.random()).slice(0, count);
    
    pool.forEach(npc => {
        cast.push({
            id: npc.id,
            name: npc.name,
            role: 'Co-Star',
            isPlayer: false,
            image: npc.avatar,
            type: 'ACTOR',
            npcId: npc.id
        });
    });

    cast.push({
        id: `dir_${Math.random()}`,
        name: project.directorName,
        role: 'Director',
        isPlayer: false,
        image: `https://ui-avatars.com/api/?name=${project.directorName.replace(' ', '+')}`,
        type: 'DIRECTOR'
    });

    return cast;
};

export const generateReviews = (quality: number, genre: string, playerName: string, isRecast?: boolean): Review[] => {
    const reviews: Review[] = [];
    const count = 3;
    for(let i=0; i<count; i++) {
        let sentiment: 'POSITIVE' | 'MIXED' | 'NEGATIVE' = 'MIXED';
        if (quality > 70) sentiment = 'POSITIVE';
        if (quality < 40) sentiment = 'NEGATIVE';
        if (Math.random() > 0.8) sentiment = sentiment === 'POSITIVE' ? 'MIXED' : 'POSITIVE';

        let text = "";
        if (sentiment === 'POSITIVE') {
            text = `A stunning entry in the ${genre} genre. ${playerName} shines.`;
            if (isRecast && Math.random() > 0.5) text = `The new cast breathes fresh life into the franchise! A stunning entry in the ${genre} genre.`;
        }
        else if (sentiment === 'MIXED') {
            text = `Has its moments, but fails to stick the landing.`;
            if (isRecast && Math.random() > 0.5) text = `The recasting is jarring, but it has its moments.`;
        }
        else {
            text = `A disappointing mess. Avoid.`;
            if (isRecast && Math.random() > 0.5) text = `A disastrous recast ruins whatever magic the original had. Avoid.`;
        }

        reviews.push({
            id: `rev_${i}`,
            author: `Critic ${i+1}`,
            publication: "The Daily Review",
            text,
            sentiment,
            type: 'CRITIC',
            rating: sentiment === 'POSITIVE' ? 4 : sentiment === 'MIXED' ? 2.5 : 1
        });
    }
    return reviews;
};

// ... (Keep calculateIMDbRating, calculateWeeklyBoxOffice, calculateRunOutcome, getConsequences) ...
export const calculateIMDbRating = (commitment: Commitment): number => {
    if (!commitment.projectDetails) return 5.0;
    const details = commitment.projectDetails;
    const stats = details.hiddenStats;
    const quality = stats.qualityScore || 50; 
    const hype = stats.rawHype || 50;
    const genre = details.genre;
    const roleType = commitment.roleType || 'MINOR';
    
    let baseRating = 0;
    if (quality < 30) baseRating = 2.0 + (quality / 30) * 2.5; 
    else if (quality < 70) baseRating = 4.5 + ((quality - 30) / 40) * 2.7;
    else if (quality < 90) baseRating = 7.2 + ((quality - 70) / 20) * 1.2;
    else baseRating = 8.4 + ((quality - 90) / 10) * 0.8;

    const perf = commitment.productionPerformance || 50;
    const perfDelta = (perf - 50) / 50; 
    let perfWeight = 0.3; 
    if (roleType === 'LEAD') perfWeight = 0.8;
    if (roleType === 'SUPPORTING') perfWeight = 0.5;
    
    baseRating += (perfDelta * perfWeight);

    if (['COMEDY', 'HORROR'].includes(genre)) baseRating -= 0.6; 
    if (['DRAMA', 'THRILLER'].includes(genre)) baseRating += 0.3; 
    if (['ACTION', 'SUPERHERO'].includes(genre) && details.budgetTier === 'LOW') baseRating -= 0.8; 

    if (hype > 80 && quality < 50) baseRating -= 1.5; 
    if (hype < 30 && quality > 80) baseRating += 0.5; 

    if (details.universeId) {
        if (baseRating < 6.0) baseRating = Math.max(baseRating, 5.8); 
        if (baseRating > 8.5 && quality < 95) baseRating = 8.5;
    }

    if (details.isFamous) {
        if (baseRating < 8.0) baseRating += 1.5;
        else baseRating += 0.5;
    }

    if (stats.isRecast) {
        if (quality < 60) baseRating -= 1.0; // Backlash for bad recast
        else if (quality > 85) baseRating += 0.5; // Praise for good recast
    }

    const variance = (Math.random() * 0.6) - 0.3; 
    baseRating += variance;

    return Math.max(1.1, Math.min(9.8, parseFloat(baseRating.toFixed(1))));
};

const BOX_OFFICE_CAPS: Record<BudgetTier, { opening: number, total: number }> = {
    'LOW': { opening: 30000000, total: 150000000 },
    'MID': { opening: 120000000, total: 500000000 },
    // Adjusted: Hard Cap reduced from 3B to 1.6B to make >2B a rare event
    'HIGH': { opening: 350000000, total: 1600000000 },
    'BLOCKBUSTER': { opening: 600000000, total: 3000000000 }
};

export const getBoxOfficeCaps = (budgetTier: BudgetTier): { opening: number, total: number } => {
    return BOX_OFFICE_CAPS[budgetTier] || BOX_OFFICE_CAPS.HIGH;
};

// Adjusted: Superhero/Sci-Fi are the "Money Makers"
const GENRE_MULTIPLIERS: Record<Genre, number> = {
    'ACTION': 1.1, 
    'SCI_FI': 1.3, 
    'SUPERHERO': 1.5, 
    'ADVENTURE': 1.2,
    'DRAMA': 0.6, 
    'ROMANCE': 0.7, 
    'THRILLER': 0.8,
    'COMEDY': 0.8, 
    'HORROR': 0.6 // Consistent but lower cap
};

export const calculateWeeklyBoxOffice = (
    week: number, budget: number, stats: ProjectHiddenStats, prevGross: number, buzzScore: number | undefined, budgetTier: BudgetTier = 'LOW', genre: Genre = 'DRAMA'
): number => {
    const caps = BOX_OFFICE_CAPS[budgetTier];
    const genreMod = GENRE_MULTIPLIERS[genre];
    const scriptQuality = stats.scriptQuality || 50;
    const directorQuality = stats.directorQuality || 50;
    const castingStrength = stats.castingStrength || 50;
    const qualityScore = stats.qualityScore || 50;
    const fameMultiplier = stats.fameMultiplier || 1.0;
    const packageStrength = (scriptQuality * 0.35) + (directorQuality * 0.25) + (castingStrength * 0.4);
    const audienceStrength = (qualityScore * 0.55) + (scriptQuality * 0.25) + (directorQuality * 0.2);
    const genreOpeningMod = 0.85 + ((genreMod - 1) * 0.6);

    // --- OPENING WEEKEND ---
    if (week === 1) {
        // Opening is mostly stars, hype, distribution, and event-feel.
        const baseMultiplier = 0.18 + (stats.rawHype / 140);
        const distMod = Math.pow(stats.distributionPower / 50, 1.2); 
        const buzzMod = buzzScore ? (1 + (buzzScore / 100)) : 1.0;
        const packageMod = 0.75 + ((packageStrength - 50) / 100) * 0.8;
        const qualityMod = 0.85 + ((qualityScore - 50) / 100) * 0.45;
        const fameMod = 0.85 + ((fameMultiplier - 1) * 0.7);

        let rawOpening = budget * baseMultiplier * distMod * buzzMod * packageMod * qualityMod * fameMod;
        rawOpening *= (0.8 + Math.random() * 0.4); // Variance

        // Genre Adjustment
        rawOpening *= genreOpeningMod;

        // Sleeper hits are possible when craft is excellent even without massive star power.
        const isSleeperCandidate =
            ['LOW', 'MID'].includes(budgetTier) &&
            audienceStrength > 82 &&
            (scriptQuality > 85 || directorQuality > 85);
        if (isSleeperCandidate) {
            rawOpening *= 1.08 + (Math.random() * 0.12);
        }

        // "The Avenger Factor": Can we break the cap?
        // Only top-end event films with stars, hype, and distribution get to stretch the opening cap.
        const isMegaEvent =
            ['HIGH', 'BLOCKBUSTER'].includes(budgetTier) &&
            ['SUPERHERO', 'SCI_FI', 'ADVENTURE', 'ACTION'].includes(genre) &&
            stats.rawHype > 92 &&
            castingStrength > 82 &&
            stats.distributionPower > 82 &&
            fameMultiplier > 1.2;
        
        if (isMegaEvent) {
            const breakoutMult = 1.0 + (Math.random() * 0.2);
            rawOpening = Math.min(rawOpening, caps.opening * 1.2 * breakoutMult);
        } else {
            rawOpening = Math.min(rawOpening, caps.opening);
        }

        return Math.floor(rawOpening);
    }
    
    // --- LEGS / DROPOFF ---
    // Standard blockbuster drop is 40-60%.
    // Only masterpieces (Quality > 90) get 25-35% drops.
    let dropRate = 0.55; 
    
    if (qualityScore > 90) dropRate = 0.30; // Amazing legs
    else if (qualityScore > 80) dropRate = 0.40; // Good legs
    else if (qualityScore > 60) dropRate = 0.50; // Standard
    else if (qualityScore < 30) dropRate = 0.70; // Terrible
    else if (qualityScore < 50) dropRate = 0.65; 

    // Genre tweaks for legs
    if (genre === 'HORROR') dropRate += 0.1; // Front-loaded
    if (genre === 'DRAMA' || genre === 'ROMANCE') dropRate -= 0.05; // Long tail

    // Good script and direction improve legs. Star-heavy weak movies drop faster after the opening.
    if (scriptQuality > 85) dropRate -= 0.05;
    if (directorQuality > 82) dropRate -= 0.03;
    if (week === 2 && castingStrength - audienceStrength > 18) dropRate += 0.08;

    const variance = (Math.random() * 0.1) - 0.05; 
    dropRate += variance;

    if (week >= 4) dropRate += 0.05;
    if (week >= 8) dropRate += 0.10;

    const retention = Math.max(0.05, 1 - dropRate);
    return Math.floor(prevGross * retention);
};

export const calculateRunOutcome = (totalGross: number, budget: number, rating: number): { tier: OutcomeTier, score: number } => {
    const roi = totalGross / budget;
    let tier: OutcomeTier = 'NEUTRAL';
    if (roi > 3.0) tier = 'MASSIVE_SUCCESS';
    else if (roi > 2.2) tier = 'SUCCESS'; 
    else if (roi < 0.6) tier = 'MAJOR_FAILURE';
    else if (roi < 1.2) tier = 'FAILURE';
    else tier = 'NEUTRAL';
    if (tier === 'FAILURE' && rating > 8.0) tier = 'NEUTRAL'; 
    const score = Math.min(100, (roi * 20) + (rating * 5));
    return { tier, score };
};

export const getConsequences = (outcome: OutcomeTier, role: RoleType, perf: number, quality: number, gross: number, budget: number, isFamous?: boolean): { fameDelta: number, repDelta: number, followerDelta: number } => {
    let fameDelta = 0, repDelta = 0, followerDelta = 0;
    const roleMod = role === 'LEAD' ? 2.0 : role === 'SUPPORTING' ? 1.5 : 0.5;
    const famousMod = isFamous ? 2.0 : 1.0; 
    const scaleFactor = Math.max(1, budget / 10000000); 

    if (outcome === 'MASSIVE_SUCCESS') {
        fameDelta = 9 * roleMod * famousMod; repDelta = 5 * famousMod; followerDelta = 50000 * roleMod * scaleFactor; 
        if (isFamous) followerDelta *= 2; 
    } else if (outcome === 'SUCCESS') {
        fameDelta = 4 * roleMod; repDelta = 2 * famousMod; followerDelta = 10000 * roleMod * scaleFactor;
    } else if (outcome === 'FAILURE') {
        fameDelta = 0; repDelta = -2 * roleMod * famousMod; followerDelta = 500;
    } else if (outcome === 'MAJOR_FAILURE') {
        fameDelta = -1 * roleMod; repDelta = -5 * roleMod * famousMod; followerDelta = -1000 * roleMod;
    }
    
    if (perf > 90) { repDelta += 2; followerDelta += 5000 * scaleFactor; }
    return { fameDelta: Math.floor(fameDelta), repDelta: Math.floor(repDelta), followerDelta: Math.floor(followerDelta) };
};

// ... (calculateFuturePotential remains same) ...
export const calculateFuturePotential = (
    type: ProjectType, 
    budgetTier: BudgetTier, 
    gross: number, 
    budget: number, 
    rating: number, 
    genre: string,
    role: RoleType
): FuturePotential => {
    const roi = gross / budget;
    let sequelChance = 0;
    let franchiseChance = 0;
    let renewalChance = 0;

    if (type === 'MOVIE') {
        if (roi < 2.0) { sequelChance = 0; } 
        else if (roi < 2.5) { if (rating > 8.0) sequelChance = 20; else sequelChance = 5; } 
        else if (roi < 4.0) { sequelChance = 40 + ((roi - 2.5) * 20); } 
        else { sequelChance = 80; franchiseChance = 50; }

        if (['DRAMA', 'ROMANCE', 'INDIE'].includes(genre)) sequelChance -= 30; 
        if (['ACTION', 'SCI_FI', 'SUPERHERO'].includes(genre)) sequelChance += 10; 
    } else {
        if (rating > 7.5 || roi > 2.0) renewalChance = 70;
        else renewalChance = 20;
    }
    
    return {
        sequelChance: Math.max(0, Math.min(100, sequelChance)),
        franchiseChance: Math.max(0, Math.min(100, franchiseChance)),
        rebootChance: 0,
        renewalChance,
        isFranchiseStarter: franchiseChance > 50,
        isSequelGreenlit: Math.random() * 100 < sequelChance,
        isRenewed: Math.random() * 100 < renewalChance,
        seriesStatus: 'N/A'
    };
};

export const generateSequelOffer = (original: ActiveRelease, player: Player): NegotiationData => {
    const hypeBoost = 20; 
    const basePay = calculateProjectPay(original.roleType, original.projectDetails.budgetTier, original.type);
    let newPay = Math.floor(basePay * 1.5);
    
    let newTitle = `${original.name} 2`;
    const titleMatch = original.name.match(/^(.*?) (\d+)$/);
    if (titleMatch) {
        const baseName = titleMatch[1];
        const prevNumber = parseInt(titleMatch[2], 10);
        newTitle = `${baseName} ${prevNumber + 1}`;
    }
    
    const project: ProjectDetails = {
        ...original.projectDetails,
        title: newTitle,
        subtype: 'SEQUEL',
        franchiseId: original.projectDetails.franchiseId || original.id,
        installmentNumber: (original.projectDetails.installmentNumber || 1) + 1,
        hiddenStats: {
            ...original.projectDetails.hiddenStats,
            rawHype: Math.min(100, original.projectDetails.hiddenStats.rawHype + hypeBoost),
            prestigeBonus: Math.max(0, original.projectDetails.hiddenStats.prestigeBonus - 1) 
        }
    };

    const isRoyaltyEligible = player.stats.fame >= 50 && player.stats.reputation >= 50 && player.stats.experience >= 20; 
    let royaltyPercentage = 0;
    if (isRoyaltyEligible) {
        royaltyPercentage = 1 + Math.floor(Math.random() * 3); 
        newPay = Math.floor(newPay * 0.75); 
    }

    const roleType = (original.roleType && ROLE_DEFINITIONS[original.roleType]) ? original.roleType : 'LEAD';

    const opportunity: AuditionOpportunity = {
        id: `seq_offer_${Date.now()}`,
        roleType: roleType,
        projectName: project.title,
        genre: project.genre,
        config: ROLE_DEFINITIONS[roleType],
        project: project,
        estimatedIncome: newPay,
        source: 'DIRECT',
        royaltyPercentage
    };

    return {
        opportunity,
        basePay: newPay,
        currentOffer: newPay,
        roundsUsed: 0,
        maxRounds: 3,
        status: 'PENDING',
        studioPatience: 50 + Math.random() * 50,
        hasRoyaltyOption: isRoyaltyEligible,
        royaltyPercentage
    };
};

// --- NEW: TV RENEWAL GENERATOR ---
export const generateRenewalOffer = (original: ActiveRelease, player: Player): NegotiationData => {
    // 1. Determine New Title
    let newTitle = `${original.name}: Season 2`;
    // Regex to detect "Name: Season X"
    const seasonMatch = original.name.match(/^(.*?): Season (\d+)$/);
    if (seasonMatch) {
        const baseName = seasonMatch[1];
        const nextSeason = parseInt(seasonMatch[2], 10) + 1;
        newTitle = `${baseName}: Season ${nextSeason}`;
    } else {
        // If current title doesn't have "Season X", append ": Season 2"
        // E.g. "Breaking Bad" -> "Breaking Bad: Season 2"
        newTitle = `${original.name}: Season 2`;
    }

    // 2. Pay Increase (20%)
    const basePay = calculateProjectPay(original.roleType, original.projectDetails.budgetTier, original.type);
    let newPay = Math.floor(basePay * 1.2); 
    
    // 3. Project Details
    const project: ProjectDetails = {
        ...original.projectDetails,
        title: newTitle,
        subtype: 'SEQUEL', // Treat as sequel/continuation in the system
        franchiseId: original.projectDetails.franchiseId || original.id,
        installmentNumber: (original.projectDetails.installmentNumber || 1) + 1,
        hiddenStats: {
            ...original.projectDetails.hiddenStats,
            // Hype carries over
            rawHype: Math.min(100, original.projectDetails.hiddenStats.rawHype), 
        }
    };

    // TV residuals usually implied in basePay for this game or handled via royalty
    let royaltyPercentage = original.royaltyPercentage || 0;
    // Syndication/backend bonus for high fame
    if (player.stats.fame > 60) royaltyPercentage = Math.max(royaltyPercentage, 1.0); 

    const roleType = original.roleType || 'LEAD';

    const opportunity: AuditionOpportunity = {
        id: `renew_offer_${Date.now()}`,
        roleType: roleType, 
        projectName: project.title,
        genre: project.genre,
        config: ROLE_DEFINITIONS[roleType],
        project: project,
        estimatedIncome: newPay,
        source: 'DIRECT',
        royaltyPercentage
    };

    return {
        opportunity,
        basePay: newPay,
        currentOffer: newPay,
        roundsUsed: 0,
        maxRounds: 3,
        status: 'PENDING',
        studioPatience: 70, // Networks are generally stable
        hasRoyaltyOption: true,
        royaltyPercentage
    };
};

export const getBuzzLabel = (score: number) => {
    if (score >= 40) return { label: 'Deafening', color: 'text-emerald-400' };
    if (score >= 20) return { label: 'Growing', color: 'text-blue-400' };
    if (score >= 5) return { label: 'Positive', color: 'text-teal-400' };
    if (score > -5) return { label: 'Quiet', color: 'text-zinc-400' };
    if (score > -20) return { label: 'Mixed', color: 'text-yellow-400' };
    return { label: 'Controversial', color: 'text-rose-500' };
};

export const generateReleasePressQuestions = (count: number = 3): PressInteraction[] => {
    const QUESTIONS_POOL = [
        {
            q: "Fans are calling this your biggest role yet. Do you feel the pressure?",
            opts: [
                { text: "Pressure makes diamonds. I'm ready.", style: 'BOLD', consequences: { buzz: 10, fame: 2 } },
                { text: "I just hope people connect with the story.", style: 'HUMBLE', consequences: { buzz: 5, reputation: 2 } },
                { text: "The work speaks for itself.", style: 'SAFE', consequences: { buzz: 2 } }
            ]
        },
        {
            q: "What was the atmosphere like on set?",
            opts: [
                { text: "Intense. We pushed boundaries.", style: 'RISKY', consequences: { buzz: 15, reputation: -2 } },
                { text: "Like a family. Best crew ever.", style: 'SAFE', consequences: { buzz: 5, reputation: 1 } },
                { text: "Focused. We knew we had something special.", style: 'BOLD', consequences: { buzz: 8 } }
            ]
        },
        {
            q: "The trailer has sparked some debate online. Your thoughts?",
            opts: [
                { text: "Controversy gets people watching.", style: 'RISKY', consequences: { buzz: 20, reputation: -5 } },
                { text: "Everyone is entitled to their opinion.", style: 'SAFE', consequences: { buzz: 0 } },
                { text: "Just wait until you see the full film.", style: 'BOLD', consequences: { buzz: 10 } }
            ]
        },
        {
            q: "How was working with the director?",
            opts: [
                { text: "A visionary. I learned so much.", style: 'HUMBLE', consequences: { reputation: 3, buzz: 3 } },
                { text: "We butted heads, but it made the art better.", style: 'RISKY', consequences: { buzz: 10, reputation: -2 } },
                { text: "Smooth sailing. Great professional.", style: 'SAFE', consequences: { buzz: 2 } }
            ]
        },
        {
            q: "Is there an Oscar in your future with this one?",
            opts: [
                { text: "I'm not thinking about awards, just the work.", style: 'HUMBLE', consequences: { reputation: 5 } },
                { text: "I certainly hope the Academy takes notice.", style: 'BOLD', consequences: { fame: 2, buzz: 5 } },
                { text: "Let's not jinx it!", style: 'SAFE', consequences: { buzz: 1 } }
            ]
        }
    ];
    
    const shuffled = [...QUESTIONS_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    return selected.map((q, i) => ({
        id: `press_release_${Date.now()}_${i}`,
        question: q.q,
        options: q.opts as any
    }));
};
