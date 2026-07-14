
// ... existing imports
import { 
    Player, RoleType, Stats, Commitment, ActorSkills, BudgetTier, ProjectType, GameLanguage,
    ProjectDetails, ReleaseScale, OutcomeTier, ProjectMemoryTag, FuturePotential, 
    ProjectSubtype, SeriesStatus, ReleaseStrategy, AuditionOpportunity, 
    ProjectHiddenStats, ActiveRelease, NegotiationData, CastMember, Review, 
    NPCActor, StudioId, PressInteraction, Genre, IndustryProject, WriterStats, DirectorStats, TargetAudience, ProjectFormat, PlatformId
} from '../types';
import { selectStudioForProject } from './studioLogic';
import { NPC_DATABASE, isCastableActor } from './npcLogic';
import { createFamousOpportunity, generateFamousMovieOpportunity, generateFamousSeriesOpportunity, getNextFamousMovie } from './famousMovieLogic';
import { ALL_GENRES } from './genreCatalog';
import { getAbsoluteWeek } from './legacyLogic';
import { buildAutomaticProjectMusicPlan } from './musicIndustry';
import { getPlayerLanguage, t } from './i18n';

// --- CONSTANTS ---

export const getRoleDefinitionLabel = (roleType: RoleType, language: GameLanguage = 'en'): string =>
    t(language, `services.role.definition.${roleType}`);

export const ROLE_DEFINITIONS: Record<RoleType, { label: string; difficulty: number; energyCost: number; baseIncome: number; expGain: number }> = {
    MINOR: { label: getRoleDefinitionLabel('MINOR'), difficulty: 10, energyCost: 10, baseIncome: 500, expGain: 1 },
    CAMEO: { label: getRoleDefinitionLabel('CAMEO'), difficulty: 20, energyCost: 5, baseIncome: 1000, expGain: 2 },
    SUPPORTING: { label: getRoleDefinitionLabel('SUPPORTING'), difficulty: 40, energyCost: 20, baseIncome: 3000, expGain: 5 },
    ENSEMBLE: { label: getRoleDefinitionLabel('ENSEMBLE'), difficulty: 50, energyCost: 25, baseIncome: 4000, expGain: 6 },
    LEAD: { label: getRoleDefinitionLabel('LEAD'), difficulty: 70, energyCost: 40, baseIncome: 10000, expGain: 10 }
};

// ... (Keep existing GENRES, SYNERGIES, HELPERS, CALCULATIONS) ...
const GENRES: Genre[] = ALL_GENRES;

const getWeeklyOfferRoleLabel = (language: GameLanguage, roleType: RoleType): string =>
    t(language, `services.weeklyOffer.role.${roleType}`);

export const GENRE_SYNERGIES: Record<Genre, Genre[]> = {
    ACTION: ['ADVENTURE', 'THRILLER', 'SUPERHERO'],
    DRAMA: ['ROMANCE', 'THRILLER'],
    COMEDY: ['ROMANCE'],
    ROMANCE: ['DRAMA', 'COMEDY'],
    THRILLER: ['HORROR', 'DRAMA', 'ACTION', 'MYSTERY'],
    MYSTERY: ['THRILLER', 'CRIME', 'DRAMA'],
    SCI_FI: ['ADVENTURE', 'ACTION', 'SUPERHERO'],
    HORROR: ['THRILLER', 'SCI_FI'],
    ADVENTURE: ['ACTION', 'SCI_FI', 'SUPERHERO'],
    SUPERHERO: ['ACTION', 'SCI_FI', 'ADVENTURE'],
    MUSICAL: ['DRAMA', 'ROMANCE', 'COMEDY'],
    BIOPIC: ['DRAMA', 'DOCUMENTARY'],
    SPORTS: ['DRAMA', 'ACTION'],
    ANIMATION: ['ADVENTURE', 'COMEDY', 'FANTASY'],
    FANTASY: ['ADVENTURE', 'SCI_FI', 'ANIMATION'],
    CRIME: ['THRILLER', 'MYSTERY', 'DRAMA'],
    DOCUMENTARY: ['BIOPIC', 'DRAMA']
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const splitLocalizedList = (language: GameLanguage, key: string, vars: Record<string, string | number> = {}): string[] => {
    const localized = t(language, key, vars);
    if (!localized || localized === key) return [];
    return localized.split('||').map(item => item.trim()).filter(Boolean);
};
const SPECTACLE_GENRES = new Set<Genre>(['ACTION', 'SCI_FI', 'SUPERHERO', 'ADVENTURE', 'FANTASY', 'ANIMATION']);
const INTIMATE_GENRES = new Set<Genre>(['DRAMA', 'ROMANCE', 'THRILLER', 'MYSTERY', 'COMEDY', 'HORROR', 'BIOPIC', 'CRIME', 'DOCUMENTARY', 'MUSICAL', 'SPORTS']);

export const getRecommendedCastDepth = (genre: Genre, budgetTier: BudgetTier): number => {
    if (SPECTACLE_GENRES.has(genre)) {
        if (budgetTier === 'BLOCKBUSTER') return 7;
        if (budgetTier === 'HIGH') return 6;
        return 4;
    }
    if (INTIMATE_GENRES.has(genre)) {
        if (budgetTier === 'BLOCKBUSTER') return 4;
        if (budgetTier === 'HIGH') return 3;
        return 2;
    }
    return budgetTier === 'BLOCKBUSTER' ? 5 : budgetTier === 'HIGH' ? 4 : 3;
};

export const calculateCastDepthScore = (
    castSize: number,
    genre: Genre,
    budgetTier: BudgetTier,
    leadStarPower: number = 50
): { score: number; note: string } => {
    const recommended = getRecommendedCastDepth(genre, budgetTier);
    const depthRatio = Math.min(1.35, Math.max(0.2, castSize / Math.max(1, recommended)));
    const starCover = Math.max(0, Math.min(18, (leadStarPower - 70) * 0.45));
    const spectaclePenalty = SPECTACLE_GENRES.has(genre) && castSize < recommended ? 10 : 0;
    const intimateForgiveness = INTIMATE_GENRES.has(genre) && castSize >= 2 ? 10 : 0;
    const score = Math.max(10, Math.min(100, Math.round((depthRatio * 72) + starCover + intimateForgiveness - spectaclePenalty)));
    const note = score >= 82 ? 'Deep ensemble'
        : score >= 62 ? 'Healthy cast'
        : score >= 42 ? 'Thin but workable'
        : 'Too thin for scale';
    return { score, note };
};

export const calculateProjectExperienceGain = (
    role: RoleType,
    rating: number,
    budgetTier: BudgetTier,
    isFamous?: boolean,
    isPlayerStudio?: boolean
): number => {
    let gain = role === 'LEAD' ? 3 : role === 'SUPPORTING' || role === 'ENSEMBLE' ? 2 : 1;
    if (rating >= 8.5) gain += 2;
    else if (rating >= 7.4) gain += 1;
    if (budgetTier === 'HIGH' || budgetTier === 'BLOCKBUSTER') gain += 1;
    if (isFamous) gain += 1;
    if (isPlayerStudio) gain += 1;
    return Math.max(1, Math.min(7, gain));
};

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

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export type CastingDirectorStyle = 'BALANCED' | 'CRAFT_FIRST' | 'STAR_DRIVEN' | 'GENRE_PURIST' | 'RISK_TAKER';

export interface CastingApplicationEvaluation {
    baseChance: number;
    finalChance: number;
    plausible: boolean;
    fitScore: number;
    fitMargin: number;
    momentumBonus: number;
    directorStyle: CastingDirectorStyle;
}

export interface CastingOpportunityAccess {
    careerStrength: number;
    famousProjectChance: number;
    midBudgetChance: number;
    highBudgetChance: number;
    leadRoleChance: number;
    supportingRoleChance: number;
}

export type BreakthroughInviteKind = 'FRESH_FACE' | 'BLOCKBUSTER_EXTRA';

export interface BreakthroughInviteProfile {
    eligible: boolean;
    weeklyChance: number;
    blockbusterExtraChance: number;
    talent: number;
    bestGenre: Genre;
    bestGenreScore: number;
    craftGap: number;
}

export interface BreakthroughAuditionInvite {
    kind: BreakthroughInviteKind;
    opportunity: AuditionOpportunity;
    sender: string;
    subject: string;
    text: string;
}

export const getCastingDirectorStyle = (directorName: string = ''): CastingDirectorStyle => {
    const styles: CastingDirectorStyle[] = ['BALANCED', 'CRAFT_FIRST', 'STAR_DRIVEN', 'GENRE_PURIST', 'RISK_TAKER'];
    const hash = [...directorName].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
    return styles[hash % styles.length];
};

export const getCastingOpportunityAccess = (player: Player): CastingOpportunityAccess => {
    const fame = clamp(player.stats.fame || 0, 0, 100);
    const reputation = clamp(player.stats.reputation || 0, 0, 100);
    const experience = clamp(player.stats.experience || 0, 0, 100);
    const talent = clamp(getActorTalent(player.stats.skills), 0, 100);
    const careerStrength = (fame * 0.42) + (reputation * 0.18) + (talent * 0.25) + (experience * 0.15);

    return {
        careerStrength,
        famousProjectChance: clamp(0.06 + (careerStrength * 0.0018), 0.06, 0.22),
        midBudgetChance: clamp(0.12 + (careerStrength * 0.006), 0.12, 0.68),
        highBudgetChance: clamp(0.015 + (careerStrength * 0.0028), 0.015, 0.30),
        leadRoleChance: clamp(0.02 + (careerStrength * 0.0038), 0.02, 0.40),
        supportingRoleChance: clamp(0.10 + (careerStrength * 0.0035), 0.10, 0.38)
    };
};

export const getBreakthroughInviteProfile = (player: Player): BreakthroughInviteProfile => {
    const fame = clamp(player.stats.fame || 0, 0, 100);
    const reputation = clamp(player.stats.reputation || 0, 0, 100);
    const experience = clamp(player.stats.experience || 0, 0, 100);
    const talent = clamp(getActorTalent(player.stats.skills), 0, 100);
    const genreEntries = Object.entries(player.stats.genreXP || {}) as [Genre, number][];
    const [bestGenre, bestGenreScore] = genreEntries.reduce<[Genre, number]>(
        (best, entry) => entry[1] > best[1] ? entry : best,
        ['DRAMA', 0]
    );
    const recentProjectQuality = (player.pastProjects || [])
        .slice(-3)
        .reduce((best, project) => Math.max(best, project.projectQuality || 0, (project.imdbRating || project.rating || 0) * 10), 0);
    const craftSignal = (talent * 0.55) + (bestGenreScore * 0.25) + (experience * 0.20);
    const craftGap = craftSignal - fame;
    const hasCareerEvidence = experience >= 8 || bestGenreScore >= 25 || reputation >= 15 || recentProjectQuality >= 68;
    const eligible = fame < 55 && talent >= 42 && craftSignal >= 38 && craftGap >= 12 && hasCareerEvidence;
    const qualityBoost = recentProjectQuality >= 78 ? 0.012 : recentProjectQuality >= 68 ? 0.006 : 0;
    const weeklyChance = eligible
        ? clamp(0.012 + (Math.max(0, craftGap - 12) * 0.001) + (reputation * 0.00025) + qualityBoost, 0.012, 0.08)
        : 0;
    const blockbusterExtraChance = eligible
        ? clamp(0.08 + (talent * 0.0012) + (bestGenreScore * 0.001) + (recentProjectQuality >= 78 ? 0.04 : 0), 0.08, 0.26)
        : 0;

    return {
        eligible,
        weeklyChance,
        blockbusterExtraChance,
        talent,
        bestGenre,
        bestGenreScore,
        craftGap
    };
};

export const generateBreakthroughAuditionInvite = (
    player: Player,
    usedTitles: string[],
    language: GameLanguage = 'en',
    random: () => number = Math.random
): BreakthroughAuditionInvite | null => {
    const profile = getBreakthroughInviteProfile(player);
    if (!profile.eligible) return null;

    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const lastInviteWeek = Number(player.flags?.lastBreakthroughInviteAbsoluteWeek ?? -999);
    if (currentAbsoluteWeek - lastInviteWeek < 12) return null;

    const hasPendingInvite = (player.inbox || []).some(message =>
        message.type === 'OFFER_AUDITION' || message.id.startsWith('breakthrough_invite_')
    );
    if (hasPendingInvite) return null;

    const hasActiveBlockbuster = (player.commitments || []).some(commitment =>
        commitment.type === 'ACTING_GIG'
        && commitment.projectDetails?.budgetTier === 'HIGH'
        && ['AUDITION', 'PRE_PRODUCTION', 'PRODUCTION'].includes(commitment.projectPhase || '')
    );
    if (hasActiveBlockbuster) return null;

    if (random() > profile.weeklyChance) return null;

    if (random() < profile.blockbusterExtraChance) {
        const famousProject = getNextFamousMovie(player);
        if (famousProject && !usedTitles.includes(famousProject.title)) {
            const roleType: RoleType = random() < 0.65 ? 'SUPPORTING' : 'ENSEMBLE';
            const roleLabel = getWeeklyOfferRoleLabel(language, roleType);
            const opportunity = createFamousOpportunity(famousProject, roleType, 'DIRECT', language);
            opportunity.source = 'DIRECTOR';
            opportunity.config = {
                ...opportunity.config,
                label: t(language, roleType === 'SUPPORTING'
                    ? 'services.weeklyOffer.breakthrough.blockbuster.label.supporting'
                    : 'services.weeklyOffer.breakthrough.blockbuster.label.ensemble')
            };
            opportunity.estimatedIncome = Math.floor(opportunity.estimatedIncome * 0.65);

            return {
                kind: 'BLOCKBUSTER_EXTRA',
                opportunity,
                sender: t(language, 'services.weeklyOffer.breakthrough.blockbuster.sender', { projectTitle: famousProject.title }),
                subject: t(language, 'services.weeklyOffer.breakthrough.blockbuster.subject', { projectTitle: famousProject.title }),
                text: t(language, 'services.weeklyOffer.breakthrough.blockbuster.text', { role: roleLabel })
            };
        }
    }

    const roleType: RoleType = random() < 0.65 ? 'SUPPORTING' : 'ENSEMBLE';
    const tier: BudgetTier = random() < 0.30 ? 'MID' : 'LOW';
    const opportunity = generateAudition(roleType, tier, usedTitles, player, 'DIRECTOR');
    opportunity.config = {
        ...opportunity.config,
        label: t(language, 'services.weeklyOffer.breakthrough.freshFace.label')
    };

    return {
        kind: 'FRESH_FACE',
        opportunity,
        sender: t(language, 'services.weeklyOffer.breakthrough.freshFace.sender'),
        subject: t(language, 'services.weeklyOffer.breakthrough.freshFace.subject', { projectName: opportunity.projectName }),
        text: t(language, 'services.weeklyOffer.breakthrough.freshFace.text', {
            role: getWeeklyOfferRoleLabel(language, roleType)
        })
    };
};

export const evaluateCastingApplication = (
    player: Player,
    opportunity: AuditionOpportunity,
    momentum: number = 0
): CastingApplicationEvaluation => {
    const project = opportunity.project;
    const talent = clamp(getActorTalent(player.stats.skills), 0, 100);
    const genreFit = clamp(player.stats.genreXP[project.genre] || 0, 0, 100);
    const fame = clamp(player.stats.fame || 0, 0, 100);
    const reputation = clamp(player.stats.reputation || 0, 0, 100);
    const experience = clamp(player.stats.experience || 0, 0, 100);
    const directorStyle = getCastingDirectorStyle(project.directorName);

    let fitScore = (talent * 0.30) + (genreFit * 0.30) + (fame * 0.20) + (reputation * 0.12) + (experience * 0.08);

    if (directorStyle === 'CRAFT_FIRST') fitScore += (talent - 50) * 0.10;
    if (directorStyle === 'STAR_DRIVEN') fitScore += (fame - 50) * 0.12;
    if (directorStyle === 'GENRE_PURIST') fitScore += (genreFit - 50) * 0.12;
    if (directorStyle === 'RISK_TAKER') {
        const underdogCraft = ((talent + genreFit) / 2) - fame;
        fitScore += clamp(underdogCraft * 0.10, -3, 6);
    }

    const sourceBonus = opportunity.source === 'DIRECT'
        ? 18
        : opportunity.source === 'DIRECTOR'
            ? 15
            : opportunity.source === 'AGENT'
                ? 5
                : 0;
    fitScore += sourceBonus;

    const roleDifficulty = opportunity.config?.difficulty ?? ROLE_DEFINITIONS[opportunity.roleType].difficulty;
    const budgetPressure = project.budgetTier === 'HIGH' ? 12 : project.budgetTier === 'MID' ? 6 : 0;
    const famousPressure = project.isFamous ? 14 : 0;
    const castingPressure = ((project.hiddenStats?.castingStrength || 50) - 50) * 0.16;
    const directorPressure = ((project.hiddenStats?.directorQuality || 50) - 50) * 0.08;
    const requiredScore = (roleDifficulty * 0.50) + budgetPressure + famousPressure + castingPressure + directorPressure;
    const fitMargin = fitScore - requiredScore;

    // Smooth logistic curve: no hard locks, but extreme long shots stay genuinely rare.
    let baseChance = 0.02 + (0.93 / (1 + Math.exp(-fitMargin / 15)));
    if (directorStyle === 'RISK_TAKER' && fitMargin < -20) {
        baseChance = Math.max(baseChance, 0.07);
    }
    baseChance = clamp(baseChance, 0.02, 0.95);

    const plausible = baseChance >= 0.12 && fitMargin >= -34;
    const momentumBonus = plausible ? clamp(Math.floor(momentum) * 0.04, 0, 0.12) : 0;
    const finalChance = clamp(baseChance + momentumBonus, 0.02, 0.95);

    return {
        baseChance,
        finalChance,
        plausible,
        fitScore,
        fitMargin,
        momentumBonus,
        directorStyle
    };
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
    const minimumGain = currentPrep >= 70 ? 2 : 1;
    return currentPrep >= 100 ? 0 : Math.max(minimumGain, Math.floor(gain * diminishing));
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
    const minimumGain = currentPerf >= 70 ? 2 : 1;
    return currentPerf >= 100 ? 0 : Math.max(minimumGain, Math.floor(gain * diminishing));
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
    
    const masteryBonus = genreFit.fitScore >= 85 ? 8 : genreFit.fitScore >= 65 ? 5 : genreFit.fitScore >= 40 ? 2 : 0;
    let playerScore = (prep * 0.4) + (talent * 0.3) + (genreFit.fitScore * 0.3) + masteryBonus;
    
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

export const getRoleRejectionFeedback = (
    player: Player,
    opportunity: Partial<AuditionOpportunity> | ProjectDetails | undefined,
    stage: 'APPLICATION' | 'AUDITION',
    rivalWinner?: NPCActor,
    language: GameLanguage = getPlayerLanguage(player)
): { summary: string; reasons: string[]; hint: string } => {
    const project = 'project' in (opportunity || {}) ? (opportunity as AuditionOpportunity).project : opportunity as ProjectDetails | undefined;
    const roleType = 'roleType' in (opportunity || {}) ? (opportunity as AuditionOpportunity).roleType : undefined;
    const role = roleType ? ROLE_DEFINITIONS[roleType] : undefined;
    const genre = project?.genre;
    const genreScore = genre ? (player.stats.genreXP[genre] || 0) : 0;
    const fame = player.stats.fame || 0;
    const talent = getActorTalent(player.stats.skills);
    const reasons: string[] = [];
    const genreLabel = genre ? genre.replace(/_/g, ' ') : '';

    if (rivalWinner) {
        reasons.push(t(language, 'services.role.rejection.reason.rival', { rivalName: rivalWinner.name }));
    }

    if (project?.isFamous && fame < 45) {
        reasons.push(t(language, 'services.role.rejection.reason.legacyFame'));
    } else if (role && role.difficulty >= 60 && fame < 35) {
        reasons.push(t(language, 'services.role.rejection.reason.leadFame'));
    } else if (fame < 18 && stage === 'APPLICATION') {
        reasons.push(t(language, 'services.role.rejection.reason.visibility'));
    }

    if (genre && genreScore < 35) {
        reasons.push(t(language, 'services.role.rejection.reason.genreWeak', { genre: genreLabel }));
    } else if (genre && genreScore >= 70 && stage === 'AUDITION') {
        reasons.push(t(language, 'services.role.rejection.reason.genreHelped', { genre: genreLabel }));
    }

    if (stage === 'AUDITION') {
        reasons.push(talent < 45
            ? t(language, 'services.role.rejection.reason.roomCraft')
            : t(language, 'services.role.rejection.reason.roomPackage'));
    }

    if (reasons.length === 0) {
        reasons.push(stage === 'APPLICATION'
            ? t(language, 'services.role.rejection.reason.shortlist')
            : t(language, 'services.role.rejection.reason.castingPressure'));
    }

    const hint = genre && genreScore < 55
        ? t(language, 'services.role.rejection.hint.genre', { genre: genreLabel })
        : fame < 35
            ? t(language, 'services.role.rejection.hint.fame')
            : t(language, 'services.role.rejection.hint.prep');

    return {
        summary: stage === 'APPLICATION'
            ? t(language, 'services.role.rejection.summary.application')
            : t(language, 'services.role.rejection.summary.audition'),
        reasons: reasons.slice(0, 2),
        hint
    };
};

const cleanCastingFeedbackReason = (reason: string): string => reason.replace(/^[^:]+:\s*/, '').trim();

export const formatRoleRejectionReview = (
    projectName: string,
    stage: 'APPLICATION' | 'AUDITION',
    feedback: { summary: string; reasons: string[]; hint: string },
    language: GameLanguage = 'en'
): string => {
    const primaryReason = cleanCastingFeedbackReason(feedback.reasons[0] || t(language, 'services.role.rejection.reason.saferFit'));
    const secondaryReason = feedback.reasons[1] ? cleanCastingFeedbackReason(feedback.reasons[1]) : '';
    const intro = stage === 'APPLICATION'
        ? t(language, 'services.role.rejection.review.intro.application', { projectName })
        : t(language, 'services.role.rejection.review.intro.audition', { projectName });

    return [
        intro,
        feedback.summary,
        t(language, 'services.role.rejection.review.directorNote', { reason: primaryReason }),
        secondaryReason ? t(language, 'services.role.rejection.review.castingNote', { reason: secondaryReason }) : '',
        t(language, 'services.role.rejection.review.workOn', { hint: feedback.hint })
    ].filter(Boolean).join('\n\n');
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

    const project: ProjectDetails = {
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
    project.musicPlan = buildAutomaticProjectMusicPlan(project);
    return project;
};

export const generateAudition = (
    roleType: RoleType, 
    tier: BudgetTier, 
    usedTitles: string[], 
    player: Player, 
    source: 'CASTING_APP' | 'AGENT' | 'DIRECTOR' | 'DIRECT',
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
    const access = getCastingOpportunityAccess(player);
    
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
        if (famousRoll < access.famousProjectChance) {
            const famousOpp = Math.random() > 0.5 
                ? generateFamousMovieOpportunity(player) 
                : generateFamousSeriesOpportunity(player);
            
            if (famousOpp) {
                opps.push(famousOpp);
                continue;
            }
        }

        let tier: BudgetTier = 'LOW';
        const tierRoll = Math.random();
        if (tierRoll < access.highBudgetChance) tier = 'HIGH';
        else if (tierRoll < access.highBudgetChance + access.midBudgetChance) tier = 'MID';
        
        let role: RoleType = 'MINOR';
        const r = Math.random();
        if (r < access.leadRoleChance) role = 'LEAD';
        else if (r < access.leadRoleChance + access.supportingRoleChance) role = 'SUPPORTING';
        else if (r < access.leadRoleChance + access.supportingRoleChance + 0.28) role = 'CAMEO';

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
        type: 'ACTOR',
        actorId: 'PLAYER_SELF',
        actorName: player.name,
        roleType: playerRole
    });

    let count = 2;
    if (project.budgetTier === 'MID') count = 4;
    if (project.budgetTier === 'HIGH') count = 6;

    const pool = [...NPC_DATABASE].filter(npc => isCastableActor(npc)).sort(() => 0.5 - Math.random()).slice(0, count);
    
    pool.forEach(npc => {
        cast.push({
            id: npc.id,
            name: npc.name,
            role: 'Co-Star',
            isPlayer: false,
            image: npc.avatar,
            type: 'ACTOR',
            npcId: npc.id,
            actorId: npc.id,
            actorName: npc.name,
            roleType: 'SUPPORTING'
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

export const generateReviews = (
    quality: number,
    genre: string,
    playerName: string,
    isRecast?: boolean,
    castDepthScore: number = 70,
    budgetTier: BudgetTier = 'MID',
    format: ProjectFormat = 'LIVE_ACTION',
    subjectName?: string,
    language: GameLanguage = 'en'
): Review[] => {
    const reviews: Review[] = [];
    const count = 6;
    const isThinSpectacle = castDepthScore < 50 && SPECTACLE_GENRES.has(genre as Genre) && ['HIGH', 'BLOCKBUSTER'].includes(budgetTier);
    const genreLabel = genre.replace(/_/g, ' ');
    const subjectPhrase = subjectName ? t(language, 'services.role.review.subjectPhrase.biopic', { subjectName }) : '';
    const subjectStory = subjectName
        ? t(language, 'services.role.review.subjectStory.named', { subjectName })
        : t(language, 'services.role.review.subjectStory.default');
    const reviewVars = { playerName, genre: genreLabel, subjectPhrase, subjectStory };
    const genreKey = String(genre);
    const positiveLines = splitLocalizedList(language, 'services.role.review.positive.general', reviewVars);
    const mixedLines = splitLocalizedList(language, 'services.role.review.mixed.general', reviewVars);
    const negativeLines = splitLocalizedList(language, 'services.role.review.negative.general', reviewVars);
    const thinCastLines = splitLocalizedList(language, 'services.role.review.thinCast', reviewVars);
    let genrePositiveLines = splitLocalizedList(language, `services.role.review.positive.${genreKey}`, reviewVars);
    let genreMixedLines = splitLocalizedList(language, `services.role.review.mixed.${genreKey}`, reviewVars);
    let genreNegativeLines = splitLocalizedList(language, `services.role.review.negative.${genreKey}`, reviewVars);
    if (format === 'ANIME') {
        genrePositiveLines = splitLocalizedList(language, 'services.role.review.positive.ANIME', reviewVars);
        genreMixedLines = splitLocalizedList(language, 'services.role.review.mixed.ANIME', reviewVars);
        genreNegativeLines = splitLocalizedList(language, 'services.role.review.negative.ANIME', reviewVars);
    }

    for(let i=0; i<count; i++) {
        let sentiment: 'POSITIVE' | 'MIXED' | 'NEGATIVE' = 'MIXED';
        if (quality > 70) sentiment = 'POSITIVE';
        if (quality < 40) sentiment = 'NEGATIVE';
        if (isThinSpectacle && sentiment === 'POSITIVE' && Math.random() < 0.55) sentiment = 'MIXED';
        if (Math.random() > 0.8) sentiment = sentiment === 'POSITIVE' ? 'MIXED' : 'POSITIVE';

        let text = "";
        if (isThinSpectacle && i === 1) {
            text = pick(thinCastLines);
        }
        if (sentiment === 'POSITIVE') {
            text = text || pick(genrePositiveLines.length > 0 ? genrePositiveLines : positiveLines);
            if (isRecast && Math.random() > 0.5) text = t(language, 'services.role.review.recast.positive', reviewVars);
        }
        else if (sentiment === 'MIXED') {
            text = text || pick(genreMixedLines.length > 0 ? genreMixedLines : mixedLines);
            if (isRecast && Math.random() > 0.5) text = t(language, 'services.role.review.recast.mixed', reviewVars);
        }
        else {
            text = text || pick(genreNegativeLines.length > 0 ? genreNegativeLines : negativeLines);
            if (isRecast && Math.random() > 0.5) text = t(language, 'services.role.review.recast.negative', reviewVars);
        }

        reviews.push({
            id: `rev_${i}`,
            author: t(language, 'services.role.review.author', { index: i + 1 }),
            publication: t(language, 'services.role.review.publication'),
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
    if (['DRAMA', 'THRILLER', 'MYSTERY'].includes(genre)) baseRating += 0.3;
    if (['ACTION', 'SUPERHERO'].includes(genre) && details.budgetTier === 'LOW') baseRating -= 0.8; 
    if (genre === 'DOCUMENTARY') baseRating += (stats.scriptQuality || 50) > 72 ? 0.45 : 0.1;
    if (genre === 'BIOPIC') baseRating += details.subjectName ? 0.25 : -0.2;
    if (genre === 'MUSICAL') baseRating += (stats.scriptQuality || 50) > 70 ? 0.2 : -0.25;
    if (details.format === 'ANIME') baseRating += ['ANIMATION', 'FANTASY', 'ACTION'].includes(genre) ? 0.25 : -0.15;
    if (details.format === 'ANIMATED') baseRating += ['ANIMATION', 'ADVENTURE', 'FANTASY', 'COMEDY'].includes(genre) ? 0.2 : -0.1;

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

    const scriptQuality = stats.scriptQuality || quality;
    const directorQuality = stats.directorQuality || quality;
    const castingStrength = stats.castingStrength || 50;
    const castDepthScore = stats.castDepthScore ?? 70;
    const budgetAnchor = details.budgetTier === 'LOW'
        ? 8_000_000
        : details.budgetTier === 'MID'
            ? 35_000_000
            : details.budgetTier === 'HIGH'
                ? 90_000_000
                : 180_000_000;
    const budgetPressure = Math.max(0, ((details.estimatedBudget || budgetAnchor) / budgetAnchor) - 1);
    const elitePackageScore = (quality * 0.34)
        + (scriptQuality * 0.22)
        + (directorQuality * 0.18)
        + (castingStrength * 0.14)
        + (perf * 0.12);
    const packageFragility = Math.max(0, budgetPressure * 0.22)
        + (hype > 82 && quality < 72 ? 0.16 : 0)
        + (['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY'].includes(genre) && castDepthScore < 64 ? (64 - castDepthScore) / 95 : 0)
        + (perf < 74 ? (74 - perf) / 120 : 0);
    const highRatingGate = 8.12 + Math.max(0, Math.min(1.05, (elitePackageScore - 82) / 15)) - packageFragility;
    if (baseRating > 8.15 && elitePackageScore < 96) {
        baseRating = Math.min(baseRating, highRatingGate);
    }

    const variance = (Math.random() * 0.6) - 0.3; 
    baseRating += variance;

    return Math.max(1.1, Math.min(9.8, parseFloat(baseRating.toFixed(1))));
};

const BOX_OFFICE_CAPS: Record<BudgetTier, { opening: number, total: number }> = {
    'LOW': { opening: 30000000, total: 150000000 },
    'MID': { opening: 120000000, total: 500000000 },
    // Base targets. The active release receives a stable per-project variance/stretch.
    'HIGH': { opening: 350000000, total: 1600000000 },
    'BLOCKBUSTER': { opening: 600000000, total: 3000000000 }
};

export const getBoxOfficeCaps = (budgetTier: BudgetTier): { opening: number, total: number } => {
    return BOX_OFFICE_CAPS[budgetTier] || BOX_OFFICE_CAPS.HIGH;
};

export const calculateDynamicBoxOfficeTotalCap = ({
    budgetTier,
    genre,
    format = 'LIVE_ACTION',
    hiddenStats,
    marketDemand = 1,
    studioGenreReputation = 0,
    capRoll = 0.5
}: {
    budgetTier: BudgetTier;
    genre: Genre;
    format?: ProjectFormat;
    hiddenStats: ProjectHiddenStats;
    marketDemand?: number;
    studioGenreReputation?: number;
    capRoll?: number;
}): { totalCap: number; label: NonNullable<ProjectHiddenStats['boxOfficeCapLabel']> } => {
    const baseCap = getBoxOfficeCaps(budgetTier).total;
    const safeRoll = clamp(Number.isFinite(capRoll) ? capRoll : 0.5, 0, 1);
    const packageStrength = (
        (hiddenStats.scriptQuality || 50) * 0.18 +
        (hiddenStats.directorQuality || 50) * 0.16 +
        (hiddenStats.castingStrength || 50) * 0.21 +
        (hiddenStats.distributionPower || 50) * 0.2 +
        (hiddenStats.qualityScore || 50) * 0.16 +
        (hiddenStats.rawHype || 50) * 0.09
    );
    const eventGenre = SPECTACLE_GENRES.has(genre) || format === 'ANIMATED';
    const variance = 0.92 + (safeRoll * 0.16);
    const weakPackageDrag = packageStrength < 58
        ? clamp((58 - packageStrength) * 0.006, 0, 0.14)
        : 0;
    const marketLift = clamp((marketDemand - 1) * 0.18, -0.08, 0.08);
    const studioLift = clamp(Math.max(0, studioGenreReputation) / 900, 0, 0.1);

    let stretch = 1 + marketLift + studioLift - weakPackageDrag;
    let label: NonNullable<ProjectHiddenStats['boxOfficeCapLabel']> = weakPackageDrag > 0.08 ? 'LIMITED' : 'STANDARD';

    if (['HIGH', 'BLOCKBUSTER'].includes(budgetTier) && eventGenre) {
        const eventScore = packageStrength
            + clamp((hiddenStats.rawHype || 50) - 78, -10, 16) * 0.35
            + clamp((hiddenStats.distributionPower || 50) - 76, -10, 18) * 0.25
            + clamp(((hiddenStats.fameMultiplier || 1) - 1) * 28, -5, 12);

        if (eventScore >= 92) {
            const breakoutRoom = budgetTier === 'BLOCKBUSTER' ? 0.34 : 0.46;
            stretch += clamp((eventScore - 88) / 58, 0.08, breakoutRoom);
            label = eventScore >= 102 ? 'BREAKOUT' : 'EVENT';
        } else if (eventScore >= 82) {
            stretch += clamp((eventScore - 80) / 95, 0.02, 0.14);
            label = 'EVENT';
        }
    }

    const totalCap = Math.floor(baseCap * variance * clamp(stretch, 0.72, budgetTier === 'BLOCKBUSTER' ? 1.42 : 1.58));
    return { totalCap: Math.max(1, totalCap), label };
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
    'MYSTERY': 0.75,
    'COMEDY': 0.8, 
    'HORROR': 0.6, // Consistent but lower cap
    'MUSICAL': 0.75,
    'BIOPIC': 0.65,
    'SPORTS': 0.85,
    'ANIMATION': 1.15,
    'FANTASY': 1.25,
    'CRIME': 0.75,
    'DOCUMENTARY': 0.35
};

export const calculateWeeklyBoxOffice = (
    week: number, budget: number, stats: ProjectHiddenStats, prevGross: number, buzzScore: number | undefined, budgetTier: BudgetTier = 'LOW', genre: Genre = 'DRAMA', format: ProjectFormat = 'LIVE_ACTION', marketDemand: number = 1, studioGenreReputation: number = 0
): number => {
    const caps = BOX_OFFICE_CAPS[budgetTier];
    const genreMod = GENRE_MULTIPLIERS[genre];
    const scriptQuality = stats.scriptQuality || 50;
    const directorQuality = stats.directorQuality || 50;
    const castingStrength = stats.castingStrength || 50;
    const qualityScore = stats.qualityScore || 50;
    const fameMultiplier = stats.fameMultiplier || 1.0;
    const castDepthScore = stats.castDepthScore ?? 70;
    const studioPrestigeScore = stats.studioPrestigeScore ?? 0;
    const musicOpeningLiftPct = stats.musicOpeningLiftPct || 0;
    const musicAudienceReachLiftPct = stats.musicAudienceReachLiftPct || 0;
    const musicMismatchBacklashRisk = stats.musicMismatchBacklashRisk || 0;
    const musicControversyRisk = stats.musicControversyRisk || 0;
    const musicTrailerStrengthLift = stats.musicTrailerStrengthLift || 0;
    const packageStrength = (scriptQuality * 0.35) + (directorQuality * 0.25) + (castingStrength * 0.4);
    const audienceStrength = (qualityScore * 0.55) + (scriptQuality * 0.25) + (directorQuality * 0.2);
    const formatAudienceMod = format === 'ANIMATED' ? 1.08 : format === 'ANIME' ? 0.92 : 1;
    const formatOpeningMod = format === 'ANIMATED' ? 1.05 : format === 'ANIME' ? 0.9 : 1;
    const genreOpeningMod = (0.85 + ((genreMod - 1) * 0.6)) * formatOpeningMod;
    const castDepthMod = castDepthScore >= 85 ? 1.08
        : castDepthScore >= 65 ? 1
        : castDepthScore >= 45 ? 0.88
        : 0.7;
    const studioPrestigeMod = 1 + Math.min(0.14, studioPrestigeScore / 700);
    const marketDemandMod = Math.max(0.72, Math.min(1.36, marketDemand));
    const studioReputationMod = 1 + Math.min(0.14, Math.max(0, studioGenreReputation) / 700);

    // --- OPENING WEEKEND ---
    if (week === 1) {
        // Opening is mostly stars, hype, distribution, and event-feel.
        const baseMultiplier = 0.18 + (stats.rawHype / 140);
        const distMod = Math.pow(stats.distributionPower / 50, 1.2); 
        const buzzMod = buzzScore ? (1 + (buzzScore / 100)) : 1.0;
        const packageMod = 0.75 + ((packageStrength - 50) / 100) * 0.8;
        const qualityMod = 0.85 + ((qualityScore - 50) / 100) * 0.45;
        const fameMod = 0.85 + ((fameMultiplier - 1) * 0.7);
        const musicOpeningMod = Math.max(0.88, Math.min(1.28, 1 + (musicOpeningLiftPct / 100) + (musicTrailerStrengthLift / 250) - (musicMismatchBacklashRisk / 900) - (musicControversyRisk / 1200)));

        let rawOpening = budget * baseMultiplier * distMod * buzzMod * packageMod * qualityMod * fameMod * castDepthMod * studioPrestigeMod * studioReputationMod * formatAudienceMod * marketDemandMod * musicOpeningMod;
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

        if (SPECTACLE_GENRES.has(genre) && ['HIGH', 'BLOCKBUSTER'].includes(budgetTier) && castDepthScore < 55) {
            rawOpening *= 0.72 + (castDepthScore / 220);
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
    if (genre === 'DRAMA' || genre === 'ROMANCE' || genre === 'BIOPIC' || genre === 'DOCUMENTARY') dropRate -= 0.05; // Long tail
    if (genre === 'MYSTERY' || genre === 'CRIME') dropRate -= 0.03; // Good word of mouth for clue-driven stories

    // Good script and direction improve legs. Star-heavy weak movies drop faster after the opening.
    if (scriptQuality > 85) dropRate -= 0.05;
    if (directorQuality > 82) dropRate -= 0.03;
    if (week === 2 && castingStrength - audienceStrength > 18) dropRate += 0.08;
    if (SPECTACLE_GENRES.has(genre) && ['HIGH', 'BLOCKBUSTER'].includes(budgetTier) && castDepthScore < 55) dropRate += 0.1;
    if (castDepthScore > 84 && qualityScore > 75) dropRate -= 0.03;
    dropRate += musicMismatchBacklashRisk / 520;
    dropRate += musicControversyRisk / 760;
    dropRate -= musicAudienceReachLiftPct / 520;

    const variance = (Math.random() * 0.1) - 0.05; 
    dropRate += variance;

    if (week >= 4) dropRate += 0.05;
    if (week >= 8) dropRate += 0.10;

    const retention = Math.max(0.05, 1 - dropRate);
    const musicLegsMod = Math.max(0.92, Math.min(1.14, 1 + (musicAudienceReachLiftPct / 260) - (musicMismatchBacklashRisk / 1100) - (musicControversyRisk / 1500)));
    return Math.floor(prevGross * retention * formatAudienceMod * marketDemandMod * studioReputationMod * musicLegsMod);
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
export interface SeriesRenewalContext {
    budget: number;
    rating: number;
    role: RoleType;
    genre: string;
    totalViews?: number;
    recentWeeklyViews?: number[];
    streamingRevenue?: number;
    productionPerformance?: number;
    platformId?: PlatformId;
}

const PLATFORM_GENRE_FIT: Partial<Record<PlatformId, string[]>> = {
    NETFLIX: ['THRILLER', 'MYSTERY', 'ACTION', 'COMEDY', 'ROMANCE', 'SCI_FI', 'CRIME'],
    APPLE_TV: ['DRAMA', 'MYSTERY', 'INDIE', 'SCI_FI', 'DOCUMENTARY'],
    DISNEY_PLUS: ['FANTASY', 'ACTION', 'SCI_FI', 'SUPERHERO', 'ADVENTURE', 'ANIMATION'],
    HULU: ['DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'MYSTERY', 'CRIME'],
    YOUTUBE: ['INDIE', 'HORROR', 'DOCUMENTARY', 'COMEDY']
};

const getSeriesViewScore = (totalViews: number): number => {
    if (totalViews >= 100_000_000) return 34;
    if (totalViews >= 60_000_000) return 30;
    if (totalViews >= 30_000_000) return 24;
    if (totalViews >= 15_000_000) return 18;
    if (totalViews >= 6_000_000) return 10;
    if (totalViews >= 2_000_000) return 5;
    return 0;
};

export const calculateSeriesRenewalChance = ({
    budget,
    rating,
    role,
    genre,
    totalViews,
    recentWeeklyViews,
    streamingRevenue,
    productionPerformance,
    platformId
}: SeriesRenewalContext): number => {
    const hasTvSignals =
        typeof totalViews === 'number' ||
        typeof streamingRevenue === 'number' ||
        typeof productionPerformance === 'number' ||
        (Array.isArray(recentWeeklyViews) && recentWeeklyViews.length > 0);

    if (!hasTvSignals) {
        return rating > 7.5 ? 70 : 20;
    }

    const safeBudget = Math.max(1, budget || 1);
    const safeRating = Number.isFinite(rating) ? rating : 5;
    const viewScore = getSeriesViewScore(Math.max(0, totalViews || 0));
    const ratingScore = clamp((safeRating - 6) * 10, -12, 22);
    const revenueRatio = Math.max(0, streamingRevenue || 0) / safeBudget;
    const revenueScore = revenueRatio >= 0.75 ? 12
        : revenueRatio >= 0.4 ? 5
            : revenueRatio >= 0.18 ? 0
                : revenueRatio > 0 ? -4
                    : -8;
    const performanceScore = typeof productionPerformance === 'number'
        ? clamp((productionPerformance - 60) * 0.25, -8, 10)
        : 0;
    const roleScore: Record<RoleType, number> = {
        LEAD: 4,
        SUPPORTING: 1,
        ENSEMBLE: 2,
        CAMEO: -2,
        MINOR: -3
    };
    const platformFitScore = platformId && PLATFORM_GENRE_FIT[platformId]?.includes(genre) ? 4 : 0;

    let trendScore = 0;
    const recentViews = (recentWeeklyViews || []).filter(value => Number.isFinite(value) && value >= 0);
    if (recentViews.length >= 2) {
        const first = Math.max(1, recentViews[0]);
        const last = recentViews[recentViews.length - 1];
        const retention = last / first;
        trendScore = retention >= 1 ? 12 : retention >= 0.75 ? 10 : retention >= 0.45 ? 4 : -8;
    }

    const chance = 16 + viewScore + ratingScore + trendScore + revenueScore + performanceScore + roleScore[role] + platformFitScore;
    return Math.round(clamp(chance, 8, 94));
};

export const calculateFuturePotential = (
    type: ProjectType, 
    budgetTier: BudgetTier, 
    gross: number, 
    budget: number, 
    rating: number, 
    genre: string,
    role: RoleType,
    seriesRenewalContext?: Partial<SeriesRenewalContext>
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
        renewalChance = calculateSeriesRenewalChance({
            budget,
            rating,
            genre,
            role,
            ...seriesRenewalContext
        });
        if (roi > 2.0) renewalChance = Math.max(renewalChance, 70);
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
    project.musicPlan = buildAutomaticProjectMusicPlan(project);

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
    project.musicPlan = buildAutomaticProjectMusicPlan(project);

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

export const getBuzzLabel = (score: number, language: GameLanguage = 'en') => {
    const build = (level: string, color: string) => ({
        label: t(language, `services.role.buzz.${level}`),
        color,
    });
    if (score >= 40) return build('deafening', 'text-emerald-400');
    if (score >= 20) return build('growing', 'text-blue-400');
    if (score >= 5) return build('positive', 'text-teal-400');
    if (score > -5) return build('quiet', 'text-zinc-400');
    if (score > -20) return build('mixed', 'text-yellow-400');
    return build('controversial', 'text-rose-500');
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
