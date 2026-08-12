
import { GameLanguage, Player, AwardType, PastProject, Award, PendingEvent, PressInteraction, IndustryProject, AwardHistoryEntry, ProjectType } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { generateProjectTitle } from './roleLogic';
import { calculateProjectMusicImpact } from './musicIndustry';
import { t } from './i18n';
import { getProjectReleaseTiming } from './releaseTiming';

const resolveAwardMediaType = (...candidates: unknown[]): ProjectType => {
    for (const candidate of candidates) {
        if (candidate === 'SERIES') return 'SERIES';
        if (candidate === 'MOVIE') return 'MOVIE';
    }
    return 'MOVIE';
};

export interface AwardDefinition {
    type: AwardType;
    name: string;
    prestige: number; // Multiplier for fame/rep
    inviteWeek: number; // Week to send invite/announce nominations
}

// --- CALENDAR CONFIG ---
// BAFTA replaces Tony and acts as a precursor (Week 4, before Oscars)
export const AWARD_CALENDAR: Record<number, AwardDefinition> = {
    2: { type: 'GOLDEN_GLOBE', name: 'Golden Globe Awards', prestige: 1.5, inviteWeek: 50 }, // Previous year week 50
    4: { type: 'BAFTA', name: 'BAFTA Film Awards', prestige: 2.5, inviteWeek: 1 },
    10: { type: 'OSCAR', name: 'The Oscars', prestige: 3.0, inviteWeek: 6 },
    38: { type: 'EMMY', name: 'Primetime Emmy Awards', prestige: 2.0, inviteWeek: 34 }, 
};

const getFallbackAwardNominee = (cat: string, salt: string) => {
    const isActress = cat.includes('Actress');
    const isActor = cat.includes('Actor') && !cat.includes('Actress');
    const isDirector = cat.includes('Director');
    const isMusic = /song|score|music composition|music and lyrics/i.test(cat);
    const pool = NPC_DATABASE.filter(n => {
        if (isMusic) return n.occupation === 'MUSIC_ARTIST';
        if (isActress) return n.gender === 'FEMALE';
        if (isActor) return n.gender === 'MALE';
        if (isDirector) return n.occupation === 'DIRECTOR';
        return true;
    });
    if (pool.length > 0) {
        const index = Math.abs(Array.from(salt).reduce((sum, char) => sum + char.charCodeAt(0), 0)) % pool.length;
        return pool[index].name;
    }
    if (isMusic) return 'Music Team';
    if (isDirector) return 'Avery Stone';
    return isActress ? 'Maya Hart' : 'Julian Cross';
};

export const getAwardCeremonyYear = (
    definition: AwardDefinition,
    ceremonyWeek: number,
    currentAge: number,
    currentWeek: number
): number => {
    const crossesBirthday = definition.inviteWeek > ceremonyWeek;
    return crossesBirthday && currentWeek >= definition.inviteWeek ? currentAge + 1 : currentAge;
};

// --- LORE DATABASE (IMDb Encyclopedia) ---
export interface AwardShowLore {
    id: AwardType;
    name: string;
    shortName: string;
    description: string;
    categories: string[];
    focus: 'Artistic' | 'Commercial' | 'Industry' | 'Prestige';
    color: string;
}

export const AWARD_SHOW_DB: Record<AwardType, AwardShowLore> = {
    BAFTA: {
        id: 'BAFTA',
        name: 'BAFTA Film Awards',
        shortName: 'BAFTA',
        description: '',
        categories: ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best Score"],
        focus: 'Artistic',
        color: 'text-blue-400'
    },
    GOLDEN_GLOBE: {
        id: 'GOLDEN_GLOBE',
        name: 'Golden Globe Awards',
        shortName: 'Golden Globe',
        description: '',
        categories: [
            "Best Motion Picture - Drama", "Best TV Series - Drama", 
            "Best Actor - Motion Picture", "Best Actress - Motion Picture",
            "Best Actor - TV Series", "Best Actress - TV Series",
            "Best Original Song", "Best Score"
        ],
        focus: 'Commercial',
        color: 'text-rose-400'
    },
    EMMY: {
        id: 'EMMY',
        name: 'Primetime Emmy Awards',
        shortName: 'Emmy',
        description: '',
        categories: [
            "Outstanding Drama Series", "Outstanding Comedy Series", 
            "Outstanding Lead Actor", "Outstanding Lead Actress",
            "Outstanding Supporting Actor", "Outstanding Supporting Actress",
            "Outstanding Original Song", "Outstanding Score"
        ],
        focus: 'Industry',
        color: 'text-emerald-400'
    },
    OSCAR: {
        id: 'OSCAR',
        name: 'The Oscars',
        shortName: 'Oscar',
        description: '',
        categories: [
            "Best Picture", "Best Director", 
            "Best Actor", "Best Actress",
            "Best Supporting Actor", "Best Supporting Actress", 
            "Best Original Screenplay", "Best Cinematography",
            "Best Original Song", "Best Score"
        ],
        focus: 'Prestige',
        color: 'text-amber-400'
    }
};

export const getAwardShowLore = (language: GameLanguage, awardType: AwardType): AwardShowLore => {
    const lore = AWARD_SHOW_DB[awardType];
    return {
        ...lore,
        name: t(language, `imdb.awards.show.${awardType}.name`),
        shortName: t(language, `imdb.awards.show.${awardType}.shortName`),
        description: t(language, `imdb.awards.show.${awardType}.description`),
    };
};

// --- GOSSIP STRINGS ---
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const AWARD_GOSSIP_TEMPLATE_KEYS = [
    'award.gossip.lock',
    'award.gossip.controversy',
    'award.gossip.odds',
    'award.gossip.critics',
    'award.gossip.voter',
    'award.gossip.social',
    'award.gossip.race',
];

export const SNUB_TEMPLATE_KEYS = [
    'award.snub.biggest',
    'award.snub.cut',
    'award.snub.petition',
];

export const getAwardGossipTemplate = (language: GameLanguage): string => t(language, pick(AWARD_GOSSIP_TEMPLATE_KEYS));
export const getAwardSnubTemplate = (language: GameLanguage): string => t(language, pick(SNUB_TEMPLATE_KEYS));

// --- NOMINATION LOGIC ---

export interface Nomination {
    project: { id: string; name: string };
    score: number;
    category: string;
    isPlayer: boolean;
    nomineeName?: string; // For NPCs
    playerCreditRole?: 'ACTOR' | 'WRITER' | 'DIRECTOR' | 'PRODUCER' | 'MUSIC';
}

export interface AwardResolvedWinner {
    category: string;
    winnerName: string;
    projectName: string;
    isPlayer: boolean;
}

const isMusicAwardCategory = (category: string): boolean => (
    /song|score|music composition|music and lyrics/i.test(category)
);

const getNomineeNameForMusicCategory = (project: any, category: string, fallbackName: string): string => {
    const credits = project.musicPlan?.credits || [];
    if (/score|music composition/i.test(category)) {
        const composer = project.crewList?.find((crew: any) => crew.role === 'COMPOSER');
        return composer?.name || credits.find((credit: any) => /score|orchestra|classical|film/i.test(`${credit.genre} ${credit.songTitle}`))?.artistName || fallbackName;
    }
    if (/song|music and lyrics/i.test(category)) {
        return credits.find((credit: any) => ['LEAD_SINGLE', 'END_CREDIT_SONG'].includes(credit.role))?.artistName || credits[0]?.artistName || fallbackName;
    }
    return fallbackName;
};

const getPlayerMusicAwardCategory = (
    awardType: AwardType,
    mediaType: ProjectType,
    baseCategory: 'SONG' | 'SCORE'
): string | null => {
    if (awardType === 'EMMY') {
        if (mediaType !== 'SERIES') return null;
        return baseCategory === 'SONG' ? 'Outstanding Original Song' : 'Outstanding Score';
    }
    if (mediaType !== 'MOVIE') return null;
    if (awardType === 'BAFTA' && baseCategory === 'SONG') return null;
    return baseCategory === 'SONG' ? 'Best Original Song' : 'Best Score';
};

const LEGACY_INFLATED_MUSIC_CATEGORY_PATTERN = /soundtrack|trailer|music video/i;

export const isLegacyInflatedMusicAwardCategory = (
    awardType: string,
    category: string
): boolean => (
    LEGACY_INFLATED_MUSIC_CATEGORY_PATTERN.test(category)
    || (awardType === 'BAFTA' && /original song/i.test(category))
);

const getPlayerAwardNomineeName = (player: Player, playerCreditRole: NonNullable<Nomination['playerCreditRole']>) => {
    if (playerCreditRole === 'PRODUCER') return player.name;
    if (playerCreditRole === 'WRITER') return player.name;
    if (playerCreditRole === 'DIRECTOR') return player.name;
    return player.name;
};

const getAverageStat = (stats?: Record<string, number>) => {
    const values = Object.values(stats || {}).filter(value => Number.isFinite(value));
    if (!values.length) return 50;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getPlayerCreativeCreditFlags = (player: Player, project: any) => {
    const sourceScriptId = project.sourceScriptId;
    const sourceScript = sourceScriptId
        ? (player.businesses || [])
            .flatMap((business: any) => business.studioState?.scripts || [])
            .find((script: any) => script.id === sourceScriptId)
        : null;
    const writerId = String(sourceScript?.writerId || '').toLowerCase();
    const author = String(sourceScript?.author || '').trim().toLowerCase();
    const playerName = String(player.name || '').trim().toLowerCase();
    const playerIsWriter = Boolean(sourceScript) && (
        writerId === 'player' ||
        writerId === 'player_self' ||
        author === playerName ||
        (sourceScript.isOriginal && !sourceScript.writerId && !sourceScript.author)
    );
    const playerIsDirector = (
        String(project.directorId || '').toLowerCase() === 'player' ||
        String(project.directorId || '').toLowerCase() === 'player_self' ||
        String(project.director?.id || '').toLowerCase() === 'player_self' ||
        String(project.director?.id || '').toLowerCase() === 'player' ||
        String(project.directorName || '').trim().toLowerCase() === playerName
    );
    const playerIsProducer = (player.businesses || []).some((business: any) => (
        business.id === project.studioId &&
        business.type === 'PRODUCTION_HOUSE'
    ));
    return {
        WRITER: playerIsWriter,
        DIRECTOR: playerIsDirector,
        PRODUCER: playerIsProducer,
        sourceScript
    };
};

const getProducerAwardCategory = (awardType: AwardType, project: any): string | null => {
    if (awardType === 'OSCAR') return project.mediaType === 'MOVIE' ? 'Best Picture' : null;
    if (awardType === 'BAFTA') return project.mediaType === 'MOVIE' ? 'Best Film' : null;
    if (awardType === 'GOLDEN_GLOBE') {
        return project.mediaType === 'SERIES' ? 'Best TV Series - Drama' : 'Best Motion Picture - Drama';
    }
    if (awardType === 'EMMY') return project.mediaType === 'SERIES' ? 'Outstanding Drama Series' : null;
    return null;
};

type AwardLike = {
    type: string;
    year: number;
    category: string;
    projectId: string;
    outcome: 'WON' | 'NOMINATED';
};

const getAwardRecordProjectKey = (award: AwardLike): string => `${award.type}::${award.category}::${award.projectId}`;
const getAwardRecordSeasonKey = (award: AwardLike): string => `${award.type}::${award.year}::${award.category}`;

const shouldReplaceAwardRecord = <T extends AwardLike>(existing: T, candidate: T): boolean => {
    if (candidate.year < existing.year) return true;
    if (candidate.year > existing.year) return false;
    if (existing.outcome !== 'WON' && candidate.outcome === 'WON') return true;
    return false;
};

export const sanitizeAwardRecords = <T extends AwardLike>(awards: T[] = []): T[] => {
    const byProject = new Map<string, T>();

    awards
    .filter(award => !isLegacyInflatedMusicAwardCategory(award.type, award.category))
    .forEach(award => {
        const projectKey = getAwardRecordProjectKey(award);
        const existing = byProject.get(projectKey);
        if (!existing || shouldReplaceAwardRecord(existing, award)) {
            byProject.set(projectKey, award);
        }
    });

    const byCategory = new Map<string, T[]>();
    Array.from(byProject.values()).forEach(award => {
        const categoryKey = getAwardRecordSeasonKey(award);
        if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
        byCategory.get(categoryKey)!.push(award);
    });

    return Array.from(byCategory.values()).flatMap(categoryAwards => {
        const wins = categoryAwards.filter(award => award.outcome === 'WON');
        if (wins.length <= 1) return categoryAwards;

        let keepWon = wins[0];
        categoryAwards.forEach(award => {
            if (award.outcome === 'WON' && award.projectId < keepWon.projectId) {
                keepWon = award;
            }
        });

        return categoryAwards.map(award =>
            award.projectId === keepWon.projectId
                ? award
                : { ...award, outcome: 'NOMINATED' as const }
        );
    });
};

export const sanitizeAwardHistoryEntries = <T extends AwardHistoryEntry>(entries: T[] = []): T[] => {
    const seenPlayerWinners = new Set<string>();
    const droppedWinnerKeys = new Set<string>();
    const orderedEntries = entries
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => (a.entry.year - b.entry.year) || (a.index - b.index));

    orderedEntries.forEach(({ entry, index }) => {
        (entry.winners || []).forEach((winner, winnerIndex) => {
            if (isLegacyInflatedMusicAwardCategory(entry.type, winner.category)) {
                droppedWinnerKeys.add(`${index}::${winnerIndex}`);
                return;
            }
            if (!winner.isPlayer) return;
            const winnerKey = `${entry.type}::${winner.category}::${winner.projectName}`;
            if (seenPlayerWinners.has(winnerKey)) {
                droppedWinnerKeys.add(`${index}::${winnerIndex}`);
                return;
            }
            seenPlayerWinners.add(winnerKey);
        });
    });

    return entries.map((entry, index) => ({
        ...entry,
        winners: (entry.winners || []).filter((_, winnerIndex) => !droppedWinnerKeys.has(`${index}::${winnerIndex}`))
    }));
};

export const sanitizeAwardCeremonyEvent = <T extends PendingEvent>(event: T): T => {
    if (event.type !== 'AWARD_CEREMONY') return event;
    const awardType = event.data?.awardDef?.type as AwardType | undefined;
    if (!awardType || !AWARD_SHOW_DB[awardType]) return event;
    const allowedCategories = new Set(AWARD_SHOW_DB[awardType].categories);
    const nominations = (Array.isArray(event.data?.nominations) ? event.data.nominations : [])
        .filter((nomination: Nomination) => allowedCategories.has(nomination.category));
    const sourceBallot = event.data?.fullBallot && typeof event.data.fullBallot === 'object'
        ? event.data.fullBallot
        : {};
    const fullBallot = Object.fromEntries(
        Object.entries(sourceBallot)
            .filter(([category]) => allowedCategories.has(category))
            .map(([category, entries]) => [
                category,
                (Array.isArray(entries) ? entries : [])
                    .filter((nomination: any) => allowedCategories.has(nomination.category || category))
            ])
    );

    return {
        ...event,
        data: {
            ...event.data,
            nominations,
            fullBallot
        }
    };
};

const getAwardTypeForInviteWeek = (week: number): AwardType | null => {
    const match = Object.values(AWARD_CALENDAR).find(def => def.inviteWeek === week);
    return match?.type || null;
};

const getAwardDefinitionByType = (awardType: AwardType): AwardDefinition | undefined => (
    Object.values(AWARD_CALENDAR).find(def => def.type === awardType)
);

const getProjectAwardSeasonYear = (project: any, awardType: AwardType | null): number | undefined => {
    if (!awardType) return undefined;
    const timing = getProjectReleaseTiming(project);
    if (!timing.releaseYear) return undefined;

    if (awardType === 'EMMY') {
        const emmyInviteWeek = getAwardDefinitionByType('EMMY')?.inviteWeek || 34;
        return timing.releaseWeek && timing.releaseWeek > emmyInviteWeek
            ? timing.releaseYear + 1
            : timing.releaseYear;
    }

    return timing.releaseYear + 1;
};

export const isProjectEligibleForAwardSeason = (
    project: any,
    awardType: AwardType | null,
    awardYear: number
): boolean => getProjectAwardSeasonYear(project, awardType) === awardYear;

export const getAwardEligibilityDiagnostics = (player: Player) => {
    const nextWindow = Object.entries(AWARD_CALENDAR)
        .map(([ceremonyWeek, definition]) => {
            const inviteYear = definition.inviteWeek >= player.currentWeek ? player.age : player.age + 1;
            const weeksUntilInvite = definition.inviteWeek >= player.currentWeek
                ? definition.inviteWeek - player.currentWeek
                : (52 - player.currentWeek) + definition.inviteWeek;
            return { ceremonyWeek: Number(ceremonyWeek), definition, inviteYear, weeksUntilInvite };
        })
        .sort((a, b) => a.weeksUntilInvite - b.weeksUntilInvite)[0];

    if (!nextWindow) return {};
    const awardType = nextWindow.definition.type;
    const sourceProjects = [
        ...player.pastProjects.filter(project => !project.isQaArchive).map(project => ({ project, active: false })),
        ...player.activeReleases.map(project => ({ project, active: true })),
    ];
    const seasonal = sourceProjects.filter(({ project, active }) => (
        (!active || Number((project as any).weekNum || 0) > 2)
        && isProjectEligibleForAwardSeason(project, awardType, nextWindow.inviteYear)
    ));
    const mediaMatches = seasonal.filter(({ project }) => {
        const mediaType = resolveAwardMediaType(
            (project as any).projectType,
            (project as any).type,
            (project as any).projectDetails?.type,
        );
        if (awardType === 'EMMY') return mediaType === 'SERIES';
        if (awardType === 'GOLDEN_GLOBE') return true;
        return mediaType === 'MOVIE';
    });
    const ratingMatches = mediaMatches.filter(({ project }) => (
        Number((project as any).rating ?? (project as any).imdbRating ?? 0) >= 7
    ));

    return {
        award_debug_next_type: awardType,
        award_debug_invite_week: nextWindow.definition.inviteWeek,
        award_debug_ceremony_week: nextWindow.ceremonyWeek,
        award_debug_weeks_until_invite: nextWindow.weeksUntilInvite,
        award_debug_target_year: nextWindow.inviteYear,
        award_debug_total_projects: sourceProjects.length,
        award_debug_seasonal_projects: seasonal.length,
        award_debug_media_matches: mediaMatches.length,
        award_debug_rating_matches: ratingMatches.length,
        award_debug_existing_records: player.awards?.length || 0,
        award_debug_history_entries: player.world?.awardHistory?.length || 0,
    };
};

const hasExistingPlayerAwardRecord = (
    player: Player,
    projectId: string,
    category: string,
    awardType: AwardType | null
): boolean => player.awards.some(a =>
    a.projectId === projectId &&
    a.category === category &&
    (!awardType || a.type === awardType)
);

export interface ActorAwardNominationInput {
    quality?: number;
    rating?: number;
    playerRolePerformance?: number;
    roleType?: string;
    genre?: string;
}

const clampAwardScore = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Actor awards reward the player's work in the role first. The film still needs
 * enough critical and production strength to enter the conversation, but a
 * weak performance can no longer ride a great movie to a nomination.
 */
export const calculateActorAwardNominationScore = (
    project: ActorAwardNominationInput,
    ceremonyWeek: number,
    luck = Math.random() * 15
): number => {
    const qualityScore = clampAwardScore(Number.isFinite(Number(project.quality)) ? Number(project.quality) : 50);
    const imdbScore = clampAwardScore(
        (Number.isFinite(Number(project.rating)) ? Number(project.rating) : 5) * 10
    );
    const rolePerformance = clampAwardScore(
        Number.isFinite(Number(project.playerRolePerformance))
            ? Number(project.playerRolePerformance)
            : qualityScore
    );

    let score = (rolePerformance * 0.52) + (imdbScore * 0.28) + (qualityScore * 0.20);
    if (
        ceremonyWeek === 10
        && ['DRAMA', 'THRILLER', 'MYSTERY'].includes(String(project.genre))
    ) {
        score += 10;
    }
    if (ceremonyWeek === 10 && rolePerformance > 90) score += 5;
    if (project.roleType === 'SUPPORTING' && rolePerformance >= 88) score += 3;

    return score + Math.max(0, Math.min(15, Number.isFinite(luck) ? luck : 0));
};

export const checkAwardEligibility = (player: Player, week: number, awardYear = player.age): Nomination[] => {
    // 1. GATHER ALL CANDIDATES (Player + World)
    const candidates: any[] = [];
    const processedIds = new Set<string>(); // Prevent duplicates between past/active/same-project
    const awardType = getAwardTypeForInviteWeek(week);

    // Helper
    const addCandidate = (p: any, fromActive: boolean) => {
        if (processedIds.has(p.id)) return;
        processedIds.add(p.id);
        
        candidates.push({
            id: p.id,
            name: p.name,
            roleType: p.roleType,
            quality: fromActive ? p.projectDetails.hiddenStats.qualityScore : p.projectQuality,
            rating: fromActive ? p.imdbRating : p.rating,
            playerRolePerformance: fromActive ? p.productionPerformance : p.playerRolePerformance,
            isPlayer: true,
            genre: fromActive ? p.projectDetails.genre : p.genre,
            mediaType: fromActive
                ? resolveAwardMediaType(p.projectDetails?.type, p.type)
                : resolveAwardMediaType(p.projectType, p.type, p.projectDetails?.type),
            musicPlan: fromActive ? p.projectDetails.musicPlan : p.musicPlan,
            hiddenStats: fromActive ? p.projectDetails.hiddenStats : (p.hiddenStats || {}),
            crewList: fromActive ? p.projectDetails.crewList : (p.crewList || []),
            sourceScriptId: fromActive ? p.projectDetails.sourceScriptId : p.sourceScriptId,
            studioId: fromActive ? p.projectDetails.studioId : p.studioId,
            directorId: fromActive ? p.projectDetails.directorId : p.directorId,
            director: fromActive ? p.projectDetails.director : p.director,
            directorName: fromActive ? p.projectDetails.directorName : p.directorName,
            isOriginal: fromActive ? p.projectDetails.isOriginal : p.isOriginal,
            soundtrackRevenue: fromActive ? p.soundtrackRevenue : p.soundtrackRevenue,
            gross: fromActive ? p.totalGross : p.gross,
            streamingRevenue: fromActive ? p.streamingRevenue : p.streamingRevenue,
            campaignForecastSnapshot: fromActive ? p.projectDetails.campaignForecastSnapshot : p.campaignForecastSnapshot
        });
    };

    // Player Past Projects (only their exact award season)
    player.pastProjects.filter(p => !p.isQaArchive).forEach(p => {
        if (isProjectEligibleForAwardSeason(p, awardType, awardYear)) {
            addCandidate(p, false);
        }
    });
    
    // Player Active Releases (Currently running or just finished)
    player.activeReleases.forEach(r => {
        if (r.weekNum > 2 && isProjectEligibleForAwardSeason(r, awardType, awardYear)) {
            addCandidate(r, true);
        }
    });

    const nominations: Nomination[] = [];
    const isFemale = player.gender === 'FEMALE';
    const actorTerm = isFemale ? 'Actress' : 'Actor';

    // 2. EVALUATE CANDIDATES
    candidates.forEach(project => {
        if ((project.rating || 0) < 7.0) return; // Minimum 7.0 to be considered
        const mediaTypeMatchesAward =
            awardType === 'EMMY'
                ? project.mediaType === 'SERIES'
                : awardType === 'GOLDEN_GLOBE'
                    ? true
                    : project.mediaType === 'MOVIE';
        if (awardType && mediaTypeMatchesAward) {
            const addMusicNomination = (category: string | null, score: number, threshold: number) => {
                if (!category || !AWARD_SHOW_DB[awardType].categories.includes(category) || score < threshold) return;
                const exists = player.awards.some(a =>
                    a.projectId === project.id &&
                    a.category === category &&
                    a.type === awardType
                );
                const alreadyQueued = nominations.some(n => n.project.id === project.id && n.category === category);
                if (exists || alreadyQueued) return;
                nominations.push({
                    project: { id: project.id, name: project.name },
                    score,
                    category,
                    isPlayer: true,
                    nomineeName: getNomineeNameForMusicCategory(project, category, player.name),
                    playerCreditRole: 'MUSIC'
                });
            };

            const musicPlan = project.musicPlan;
            const credits = musicPlan?.credits || [];
            const detailsForImpact = {
                title: project.name,
                genre: project.genre,
                budgetTier: project.gross >= 250_000_000 ? 'BLOCKBUSTER' : project.gross >= 90_000_000 ? 'HIGH' : 'MID',
                estimatedBudget: project.budget || 40_000_000,
                studioId: 'AWARDS',
                hiddenStats: project.hiddenStats || {},
                musicPlan
            } as any;
            const musicImpact = credits.length ? calculateProjectMusicImpact(detailsForImpact, musicPlan) : null;
            const ratingScore = clampAwardScore((project.rating || 7) * 10);
            const qualityScore = clampAwardScore(project.quality || 60);
            const prestigeBase = (ratingScore * 0.35) + (qualityScore * 0.35);
            const impactScore = clampAwardScore(musicImpact?.score || 0);
            const awardChanceLift = clampAwardScore(
                musicImpact?.awardChanceLift
                || project.hiddenStats?.musicAwardChanceLift
                || 0
            );
            const musicLuck = Math.random() * 4;
            const prestigeGenreBoost = ['DRAMA', 'BIOPIC', 'MUSICAL', 'ANIMATION', 'FANTASY'].includes(project.genre) ? 4 : 0;
            const songCredits = credits.filter((credit: any) => ['LEAD_SINGLE', 'END_CREDIT_SONG'].includes(credit.role));
            const hasOriginalScore = (
                musicPlan?.strategy === 'COMPOSER_ONLY'
                || project.crewList?.some((crew: any) => crew.role === 'COMPOSER')
                || credits.some((credit: any) => /score|orchestra|classical|film/i.test(`${credit.genre} ${credit.songTitle}`))
            );

            if (songCredits.length > 0) {
                const bestSongBuzz = Math.max(...songCredits.map((credit: any) => clampAwardScore(Number(credit.buzz || 0) * 7)));
                const songCraft = clampAwardScore((impactScore * 0.78) + (bestSongBuzz * 0.22));
                const songScore = clampAwardScore(
                    (ratingScore * 0.24)
                    + (qualityScore * 0.24)
                    + (songCraft * 0.36)
                    + (awardChanceLift * 0.6)
                    + prestigeGenreBoost
                    + musicLuck
                );
                addMusicNomination(
                    getPlayerMusicAwardCategory(awardType, project.mediaType, 'SONG'),
                    songScore,
                    awardType === 'OSCAR' ? 89 : awardType === 'EMMY' ? 86 : 84
                );
            }
            if (hasOriginalScore) {
                const scoreCraft = impactScore > 0
                    ? impactScore
                    : clampAwardScore((qualityScore * 0.68) + (ratingScore * 0.32));
                const scoreNominationScore = clampAwardScore(
                    (ratingScore * 0.24)
                    + (qualityScore * 0.24)
                    + (scoreCraft * 0.36)
                    + (awardChanceLift * 0.6)
                    + prestigeGenreBoost
                    + musicLuck
                );
                addMusicNomination(
                    getPlayerMusicAwardCategory(awardType, project.mediaType, 'SCORE'),
                    scoreNominationScore,
                    awardType === 'OSCAR' ? 89 : awardType === 'BAFTA' ? 86 : awardType === 'EMMY' ? 86 : 84
                );
            }

            const addPlayerCreativeNomination = (
                category: string | null,
                score: number,
                threshold: number,
                playerCreditRole: NonNullable<Nomination['playerCreditRole']>
            ) => {
                if (!category || !AWARD_SHOW_DB[awardType].categories.includes(category) || score < threshold) return;
                const exists = hasExistingPlayerAwardRecord(player, project.id, category, awardType);
                const alreadyQueued = nominations.some(n => n.project.id === project.id && n.category === category);
                if (exists || alreadyQueued) return;
                nominations.push({
                    project: { id: project.id, name: project.name },
                    score,
                    category,
                    isPlayer: true,
                    nomineeName: getPlayerAwardNomineeName(player, playerCreditRole),
                    playerCreditRole
                });
            };

            const playerCreativeCredits = getPlayerCreativeCreditFlags(player, project);
            const writerScore = getAverageStat(player.writerStats as any);
            const directorScore = getAverageStat(player.directorStats as any);
            const producerHeat = Math.min(18, Math.log10(Math.max(1, (project.gross || 0) + (project.streamingRevenue || 0))) * 2.1);
            const creativeLuck = Math.random() * 8;

            if (playerCreativeCredits.WRITER) {
                addPlayerCreativeNomination(
                    awardType === 'OSCAR' ? 'Best Original Screenplay' : null,
                    prestigeBase + (project.hiddenStats?.scriptQuality || qualityScore) * 0.2 + writerScore * 0.28 + creativeLuck,
                    86,
                    'WRITER'
                );
            }
            if (playerCreativeCredits.DIRECTOR) {
                addPlayerCreativeNomination(
                    ['OSCAR', 'BAFTA'].includes(awardType) ? 'Best Director' : null,
                    prestigeBase + (project.hiddenStats?.directorQuality || qualityScore) * 0.2 + directorScore * 0.28 + creativeLuck,
                    awardType === 'OSCAR' ? 87 : 82,
                    'DIRECTOR'
                );
            }
            if (playerCreativeCredits.PRODUCER) {
                addPlayerCreativeNomination(
                    getProducerAwardCategory(awardType, project),
                    prestigeBase + producerHeat + Number(project.campaignForecastSnapshot?.awardsVisibility || 0) * 0.18 + creativeLuck,
                    awardType === 'OSCAR' ? 88 : awardType === 'EMMY' ? 81 : 79,
                    'PRODUCER'
                );
            }
        }

        const normalizedRole = project.roleType || 'MINOR';
        const isLeadRole = normalizedRole === 'LEAD';
        const isSupportingRole = normalizedRole === 'SUPPORTING';

        // Minor, cameo, and ensemble roles should not be treated as supporting award contenders.
        if (!isLeadRole && !isSupportingRole) return;

        const nomScore = calculateActorAwardNominationScore(project, week);

        // LOWERED THRESHOLDS for accessibility
        const threshold = week === 10 ? 85 : week === 38 ? 80 : 75; // Oscars 85, Emmys 80, Others 75

        if (nomScore >= threshold) {
            let cat = '';
            
            // Map to specific award show categories with gender
            if (week === 38) { // EMMY
                if (project.mediaType !== 'SERIES') return; // Emmys are strictly TV
                cat = isLeadRole ? `Outstanding Lead ${actorTerm}` : `Outstanding Supporting ${actorTerm}`; 
            }
            else if (week === 4) { // BAFTA
               if (project.mediaType !== 'MOVIE') return; // BAFTA Film Awards
               cat = isLeadRole ? `Best ${actorTerm}` : `Best Supporting ${actorTerm}`;
            }
            else if (week === 2) { // GOLDEN GLOBES
                // Globes split Movie and TV
                if (project.mediaType === 'SERIES') {
                    cat = `Best ${actorTerm} - TV Series`;
                } else {
                    cat = `Best ${actorTerm} - Motion Picture`;
                }
            } else { // OSCARS (Week 10)
                if (project.mediaType !== 'MOVIE') return; // Oscars are strictly Movie
                cat = isLeadRole ? `Best ${actorTerm}` : `Best Supporting ${actorTerm}`;
            }

            if (project.isPlayer) {
                // Check if already nominated for this project/category to avoid duplicates
                const exists = hasExistingPlayerAwardRecord(player, project.id, cat, awardType);
                const alreadyQueued = nominations.some(n => n.project.id === project.id && n.category === cat);

                if (!exists && !alreadyQueued) {
                    nominations.push({
                        project: { id: project.id, name: project.name },
                        score: nomScore,
                        category: cat,
                        isPlayer: true,
                        nomineeName: getPlayerAwardNomineeName(player, 'ACTOR'),
                        playerCreditRole: 'ACTOR'
                    });
                }
            }
        }
    });

    return nominations;
};

const hashToUnit = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
};

const getWorldProjectMediaType = (project: IndustryProject): ProjectType => (
    project.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE'
);

export const isWorldProjectEligibleForAwardSeason = (
    project: IndustryProject,
    awardType: AwardType,
    awardYear: number
): boolean => {
    const mediaType = getWorldProjectMediaType(project);
    if (awardType === 'EMMY') {
        if (mediaType !== 'SERIES') return false;
        const emmyInviteWeek = getAwardDefinitionByType('EMMY')?.inviteWeek || 34;
        const seasonYear = project.weekReleased > emmyInviteWeek ? project.year + 1 : project.year;
        return seasonYear === awardYear;
    }
    if (awardType === 'GOLDEN_GLOBE') {
        return project.year + 1 === awardYear;
    }
    return mediaType === 'MOVIE' && project.year + 1 === awardYear;
};

export const getWorldAwardCategoryScore = (
    project: IndustryProject,
    category: string
): number => {
    const quality = clampAwardScore(project.quality);
    const ratingScore = clampAwardScore((project.rating ?? (4.8 + quality * 0.045)) * 10);
    const stableProfile = (field: string, bias = 0) => clampAwardScore(
        quality + ((hashToUnit(`${project.id}:${field}`) - 0.5) * 30) + bias
    );
    const profile = project.awardProfile;
    const campaign = clampAwardScore(profile?.campaign ?? stableProfile('campaign', -2));
    const combine = (craft: number, craftWeight = 0.62) => clampAwardScore(
        (craft * craftWeight)
        + (quality * 0.2)
        + (ratingScore * 0.13)
        + (campaign * 0.05)
    );

    if (/Actor|Actress/.test(category)) {
        return combine(profile?.leadPerformance ?? stableProfile('performance'), 0.66);
    }
    if (category.includes('Director')) {
        return combine(profile?.directing ?? stableProfile('directing'), 0.68);
    }
    if (category.includes('Screenplay')) {
        return combine(profile?.screenplay ?? stableProfile('screenplay'), 0.7);
    }
    if (category.includes('Cinematography')) {
        return combine(profile?.cinematography ?? stableProfile('cinematography'), 0.7);
    }
    if (/score|music composition/i.test(category)) {
        return combine(profile?.originalScore ?? stableProfile('original-score', -3), 0.72);
    }
    if (/song|music and lyrics/i.test(category)) {
        const genreBoost = ['MUSICAL', 'ANIMATION', 'BIOPIC'].includes(project.genre) ? 8 : -5;
        return combine(profile?.originalSong ?? stableProfile('original-song', genreBoost), 0.72);
    }
    if (/Picture|Series|Film/.test(category)) {
        return combine(profile?.picture ?? stableProfile('picture'), 0.58);
    }
    return combine(stableProfile(category), 0.6);
};

// Generates a season-specific ballot. World projects are ranked by the craft
// relevant to each category instead of being sampled from the entire save.
export const generateFullBallot = (
    player: Player,
    awardType: AwardType,
    playerNoms: Nomination[],
    awardYear = player.age
): Record<string, Nomination[]> => {
    const lore = AWARD_SHOW_DB[awardType];
    const ballot: Record<string, Nomination[]> = {};
    const worldProjects = (player.world.projects || []).filter(project => (
        isWorldProjectEligibleForAwardSeason(project, awardType, awardYear)
    ));
    
    lore.categories.forEach(cat => {
        const categoryNoms: Nomination[] = [];
        
        // 1. Add Player if they are nominated in this category
        const pNom = playerNoms
            .filter(n => n.category === cat)
            .sort((a, b) => b.score - a.score)[0];
        if (pNom) {
            categoryNoms.push(pNom);
        }

        // 2. Fill the rest with NPCs (Total 4-5 nominees)
        const spotsLeft = 5 - categoryNoms.length;
        if (spotsLeft > 0) {
            
            // Gender check
            const isActress = cat.includes('Actress');
            const isActor = cat.includes('Actor') && !cat.includes('Actress'); // Strict check
            const isDirector = cat.includes('Director');
            const isMusicAward = isMusicAwardCategory(cat);
            const isProjectAward = cat.includes('Picture') || cat.includes('Series') || cat.includes('Musical') || cat.includes('Play') || cat.includes('Film');
            const reallyIsProjectAward = isProjectAward && !isActor && !isActress && !isDirector;
            
            // Type check based on award show
            const requiresSeries = awardType === 'EMMY' || /TV Series|Drama Series|Comedy Series/.test(cat);
            const requiresMovie = !requiresSeries;

            let candidates = worldProjects.filter(p => {
                if (p.quality < 50) return false;
                const mediaType = getWorldProjectMediaType(p);
                if (requiresSeries && mediaType !== 'SERIES') return false;
                if (requiresMovie && mediaType !== 'MOVIE') return false;
                return getWorldAwardCategoryScore(p, cat) >= (isMusicAward ? 74 : 68);
            });
            
            // Filter candidates by Actor Gender if applicable
            // IMPORTANT: Don't fail if NPC_DATABASE lookup misses (due to save/load cycle ID mismatch)
            if (isActress) {
                candidates = candidates.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'FEMALE' : hashToUnit(`${p.id}:gender`) >= 0.5;
                });
            } else if (isActor) {
                candidates = candidates.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'MALE' : hashToUnit(`${p.id}:gender`) < 0.5;
                });
            }

            candidates = candidates
                .sort((a, b) => getWorldAwardCategoryScore(b, cat) - getWorldAwardCategoryScore(a, cat))
                .slice(0, spotsLeft);
            
            candidates.forEach(p => {
                // Determine nominee name based on category
                const linkedActor = p.leadActorId ? NPC_DATABASE.find(n => n.id === p.leadActorId) : null;
                let nomineeName = p.leadActorName || linkedActor?.name || p.directorName || p.title;
                if (isActor || isActress) nomineeName = p.leadActorName || linkedActor?.name || getFallbackAwardNominee(cat, p.id || p.title);
                else if (isDirector) nomineeName = p.directorName || getFallbackAwardNominee(cat, p.id || p.title);
                else if (isMusicAward) nomineeName = getNomineeNameForMusicCategory(
                    p,
                    cat,
                    getFallbackAwardNominee(cat, p.id || p.title)
                );
                else if (reallyIsProjectAward) nomineeName = "Producers";

                categoryNoms.push({
                    project: { id: p.id, name: p.title },
                    score: getWorldAwardCategoryScore(p, cat),
                    category: cat,
                    isPlayer: false,
                    nomineeName: nomineeName
                });
            });

            // Fallback if world DB is empty or filtered out
            while (categoryNoms.length < 5) {
                const randomSalt = Math.floor(Math.random() * 10000);
                const fakeTitle = generateProjectTitle([`Fake_${randomSalt}`]);
                
                // Pick random NPC of correct gender
                const pool = NPC_DATABASE.filter(n => {
                    if (isMusicAward) return n.occupation === 'MUSIC_ARTIST';
                    if (isActress) return n.gender === 'FEMALE';
                    if (isActor) return n.gender === 'MALE';
                    return true;
                });
                
                const randomNPC = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
                const randomName = randomNPC ? randomNPC.name : (isMusicAward ? 'Music Team' : isActress ? "Emma Stone" : "Timothée Chalamet");

                categoryNoms.push({
                    project: { id: `fake_${Math.random()}`, name: fakeTitle },
                    score: 76 + (Math.random() * 22),
                    category: cat,
                    isPlayer: false,
                    nomineeName: reallyIsProjectAward ? "Producers" : randomName
                });
            }
        }
        
        ballot[cat] = categoryNoms.sort((a,b) => b.score - a.score); // Sorted internally for now
    });

    return ballot;
};

export const determineWinners = (
    nominations: Nomination[],
    fullBallot?: Record<string, Nomination[]>
): { won: boolean, nomination: Nomination }[] => {
    const playerBestByCategory = new Map<string, Nomination>();

    nominations.forEach(nom => {
        const existing = playerBestByCategory.get(nom.category);
        if (!existing || nom.score > existing.score) {
            playerBestByCategory.set(nom.category, nom);
        }
    });

    return nominations.map(nom => {
        const playerContender = playerBestByCategory.get(nom.category);
        if (!playerContender || playerContender.project.id !== nom.project.id) {
            return { won: false, nomination: nom };
        }

        if (fullBallot && fullBallot[nom.category]?.length) {
            const sortedBallot = [...fullBallot[nom.category]].sort((a, b) => b.score - a.score);
            const topNominee = sortedBallot[0];
            const playerWins = topNominee.isPlayer && topNominee.project.id === nom.project.id;
            return { won: playerWins, nomination: nom };
        }

        const worldWinnerScore = 90 + Math.random() * 15;
        return {
            won: nom.score > worldWinnerScore,
            nomination: nom
        };
    });
};

export const createAwardHistoryFromBallot = (
    awardType: AwardType,
    awardYear: number,
    resolvedWinners: AwardResolvedWinner[]
): AwardHistoryEntry => ({
    year: awardYear,
    type: awardType,
    winners: resolvedWinners.map(winner => ({
        category: winner.category,
        winnerName: winner.winnerName,
        projectName: winner.projectName,
        isPlayer: winner.isPlayer
    }))
});

export const generateSeasonWinners = (
    player: Player,
    awardType: AwardType,
    awardYear = player.age,
    resolvedWinners?: AwardResolvedWinner[]
): AwardHistoryEntry => {
    if (resolvedWinners?.length) {
        return createAwardHistoryFromBallot(awardType, awardYear, resolvedWinners);
    }
    // This function creates the historical record AFTER the ceremony
    const lore = AWARD_SHOW_DB[awardType];
    const year = awardYear;
    const historyEntry: AwardHistoryEntry = {
        year,
        type: awardType,
        winners: []
    };

    const worldCandidates = player.world.projects.filter(p => {
        return isWorldProjectEligibleForAwardSeason(p, awardType, year) && p.quality > 55;
    });

    lore.categories.forEach(cat => {
        const playerWin = player.awards.find(a => 
            a.type === awardType && 
            a.category === cat && 
            a.outcome === 'WON' &&
            a.year === year
        );

        if (playerWin) {
            const playerProject = [
                ...player.pastProjects,
                ...player.activeReleases.map(release => ({
                    id: release.id,
                    name: release.name,
                    musicPlan: release.projectDetails?.musicPlan,
                    crewList: release.projectDetails?.crewList || []
                } as any))
            ].find(project => project.id === playerWin.projectId);
            historyEntry.winners.push({
                category: cat,
                winnerName: isMusicAwardCategory(cat) && playerProject
                    ? getNomineeNameForMusicCategory(playerProject, cat, player.name)
                    : player.name,
                projectName: playerWin.projectName,
                isPlayer: true
            });
        } else {
            // Determine filter based on category gender
            const isActress = cat.includes('Actress');
            const isActor = cat.includes('Actor') && !cat.includes('Actress'); // Strict
            const isDirector = cat.includes('Director');
            const isMusicAward = isMusicAwardCategory(cat);
            const isProjectAward = cat.includes('Picture') || cat.includes('Series') || cat.includes('Musical') || cat.includes('Play') || cat.includes('Film');

            let possibleWinners = [...worldCandidates];
            
            // Filter by gender if needed
            if (isActress) {
                possibleWinners = possibleWinners.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'FEMALE' : true;
                });
            } else if (isActor) {
                possibleWinners = possibleWinners.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'MALE' : true;
                });
            }
            
            possibleWinners.sort((a,b) => (
                getWorldAwardCategoryScore(b, cat) - getWorldAwardCategoryScore(a, cat)
            ));
            const winnerProj = possibleWinners[0] || null;

            let winnerName = "Unknown";
            let projName = "Untitled Project";

            if (winnerProj) {
                projName = winnerProj.title;

                if (isActor || isActress) winnerName = winnerProj.leadActorName || getFallbackAwardNominee(cat, winnerProj.id || winnerProj.title);
                else if (isDirector) winnerName = winnerProj.directorName || getFallbackAwardNominee(cat, winnerProj.id || winnerProj.title);
                else if (isMusicAward) winnerName = getNomineeNameForMusicCategory(
                    winnerProj,
                    cat,
                    getFallbackAwardNominee(cat, winnerProj.id || winnerProj.title)
                );
                else if (isProjectAward) winnerName = "Producers";
                else winnerName = winnerProj.leadActorName; 
            } else {
                // FALLBACK GENERATION (Correct Gender)
                const randomSalt = Math.floor(Math.random() * 1000);
                projName = generateProjectTitle([`Fake_${randomSalt}`]); 
                
                // Fallback random actor of CORRECT gender
                const pool = NPC_DATABASE.filter(n => {
                    if (isMusicAward) return n.occupation === 'MUSIC_ARTIST';
                    if (isActress) return n.gender === 'FEMALE';
                    if (isActor) return n.gender === 'MALE';
                    return true;
                });
                
                // Ensure pool isn't empty (safety check)
                const randomActor = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
                
                if (randomActor) {
                    winnerName = randomActor.name;
                } else {
                    // Ultimate fallback if DB is somehow empty of a gender (unlikely)
                    winnerName = isMusicAward ? "Music Team" : isActress ? "Meryl Streep" : "Robert De Niro";
                }
                
                if (isDirector) winnerName = "Christopher Nolan"; // Placeholder director
                if (isProjectAward) winnerName = "Producers";
            }

            historyEntry.winners.push({
                category: cat,
                winnerName: winnerName,
                projectName: projName,
                isPlayer: false
            });
        }
    });

    return historyEntry;
};

export const generatePressInteractions = (count: number, language: GameLanguage = 'en'): PressInteraction[] => {
    // Basic placeholder generator if needed by RedCarpetEvent, typically populated via roleLogic in gameLoop
    const QUESTIONS_POOL = [
        {
            q: t(language, 'award.press.wearing.question'),
            opts: [
                { text: t(language, 'award.press.wearing.vintage'), style: 'HUMBLE', consequences: { buzz: 2 } },
                { text: t(language, 'award.press.wearing.designer'), style: 'BOLD', consequences: { fame: 2, buzz: 5 } },
                { text: t(language, 'award.press.wearing.comfortable'), style: 'SAFE', consequences: { buzz: 1 } }
            ]
        },
        {
            q: t(language, 'award.press.feeling.question'),
            opts: [
                { text: t(language, 'award.press.feeling.overwhelming'), style: 'HUMBLE', consequences: { reputation: 2 } },
                { text: t(language, 'award.press.feeling.born'), style: 'BOLD', consequences: { fame: 3, buzz: 5 } },
                { text: t(language, 'award.press.feeling.friends'), style: 'SAFE', consequences: { buzz: 1 } }
            ]
        }
    ];
    
    const shuffled = [...QUESTIONS_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    
    return selected.map((q, i) => ({
        id: `carpet_qn_${Date.now()}_${i}`,
        question: q.q,
        options: q.opts as any
    }));
};
