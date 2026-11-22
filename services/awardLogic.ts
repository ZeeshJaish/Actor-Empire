import {fictionalPersonName} from './fictionalNames';

import { GameLanguage, Player, AwardType, PastProject, Award, PendingEvent, PressInteraction, IndustryProject, AwardHistoryEntry, ProjectType } from '../types';
import { NPC_DATABASE } from './npcLogic';
import { calculateProjectMusicImpact } from './musicIndustry';
import { t } from './i18n';
import { getProjectReleaseTiming } from './releaseTiming';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getHistoricalCatalogueAwardProjects } from './historicalCatalogueAwards';
import { getAbsoluteWeek } from './legacyLogic';
import { getCareerProjects, getOutsideOriginalAwardRows } from './outsideOriginals';
import {
    AWARD_CATEGORY_LISTS,
    AWARD_RETIRED_CATEGORIES,
    findAwardCategoryForTitle,
    fitsAwardCategory,
    getAwardCategorySpec,
    isAwardMusicCategory,
    isAwardTitleCategory,
    type AwardCategorySpec,
} from './awardCategories';

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
        categories: AWARD_CATEGORY_LISTS.BAFTA,
        focus: 'Artistic',
        color: 'text-blue-400'
    },
    GOLDEN_GLOBE: {
        id: 'GOLDEN_GLOBE',
        name: 'Golden Globe Awards',
        shortName: 'Golden Globe',
        description: '',
        categories: AWARD_CATEGORY_LISTS.GOLDEN_GLOBE,
        focus: 'Commercial',
        color: 'text-rose-400'
    },
    EMMY: {
        id: 'EMMY',
        name: 'Primetime Emmy Awards',
        shortName: 'Emmy',
        description: '',
        categories: AWARD_CATEGORY_LISTS.EMMY,
        focus: 'Industry',
        color: 'text-emerald-400'
    },
    OSCAR: {
        id: 'OSCAR',
        name: 'The Oscars',
        shortName: 'Oscar',
        description: '',
        categories: AWARD_CATEGORY_LISTS.OSCAR,
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
    /** 22 Nov 2026: the nominated person's NPC id (performer, director, writer, crew), so credits reach the right person. */
    nomineeId?: string;
    playerCreditRole?: 'ACTOR' | 'WRITER' | 'DIRECTOR' | 'PRODUCER' | 'MUSIC';
    /* 21 Nov 2026 (Zeesh: one rule for every nominee). A player nomination keeps the parts the ballot scores it from;
       on the ballot, `score` is the ballot score and `nominationScore` the score that earned the nomination. */
    ballotInputs?: AwardBallotInputs;
    nominationScore?: number;
    /** Set on the ballot, for real ties only: earlier wins this season, rating, campaign, a seeded draw. */
    tie?: AwardBallotTie;
}

/** The parts every nominee's ballot score is made of, player or world, all on the 0-100 scale. */
export interface AwardBallotInputs {
    craft: number;
    quality: number;
    rating: number;
    campaign: number;
    genre?: string;
    /** The acting performance, for the show's taste for great performances. */
    performance?: number;
    /** 22 Nov 2026: voters rarely hand the same person the same award again right away (4 for a win last season, 2
        more for one the season before). Set on the ballot. */
    fatigue?: number;
}

export interface AwardBallotTie {
    momentum: number;
    rating: number;
    campaign: number;
    draw: number;
}

export interface AwardResolvedWinner {
    category: string;
    winnerName: string;
    projectName: string;
    projectId?: string;
    personId?: string;
    isPlayer: boolean;
}

export const createCanonicalAwardNominationId = (
    awardType: AwardType,
    awardYear: number,
    category: string,
    projectId: string,
): string => createDeterministicId('award_nom', awardType, awardYear, category, projectId);

export const createCanonicalAwardRecordId = (
    awardType: AwardType,
    awardYear: number,
    category: string,
    projectId: string,
): string => createDeterministicId('award_record', awardType, awardYear, category, projectId);

const isMusicAwardCategory = (category: string): boolean => (
    isAwardMusicCategory(category) || /song|score|music composition|music and lyrics/i.test(category)
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

/* 22 Nov 2026: the producer's title goes where a studio would enter it: a comedy into Musical or Comedy (Globes) or
   Comedy Series (Emmys), an animated film into Animated, a non-English film into its own category. */
const getProducerAwardCategory = (awardType: AwardType, project: any): string | null => findAwardCategoryForTitle(awardType, {
    kind: 'PICTURE', mediaType: project.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE', genre: project.genre, languageId: project.languageId,
});

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
    /* 22 Nov 2026: a ceremony frozen before the real-world category lists keeps its own (retired) categories */
    const allowedCategories = new Set([...AWARD_SHOW_DB[awardType].categories, ...(AWARD_RETIRED_CATEGORIES[awardType] || [])]);
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
    /* 22 Nov 2026: the Globes field is set in week 50, so a title out in weeks 51-52 runs at the next Globes instead of
       missing them for good (the same rule as the Emmys' cut-off). */
    if (awardType === 'GOLDEN_GLOBE') {
        const globesInviteWeek = getAwardDefinitionByType('GOLDEN_GLOBE')?.inviteWeek || 50;
        return timing.releaseWeek && timing.releaseWeek > globesInviteWeek
            ? timing.releaseYear + 2
            : timing.releaseYear + 1;
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
        ...getCareerProjects(player).filter(project => !project.isQaArchive).map(project => ({ project, active: false })),
        ...player.activeReleases.map(project => ({ project, active: true })),
    ];
    const seasonal = sourceProjects.filter(({ project, active }) => (
        (!active || Number((project as any).weekNum || 0) >= 1)
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
    luck?: number
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

    const resolvedLuck = Number.isFinite(luck)
        ? Number(luck)
        : createDeterministicRng([
            'actor-award-nomination',
            ceremonyWeek,
            qualityScore,
            imdbScore,
            rolePerformance,
            project.roleType || '',
            project.genre || '',
        ].join(':'))() * 15;
    return score + Math.max(0, Math.min(15, resolvedLuck));
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
            languageId: fromActive ? p.projectDetails?.originalLanguageId : (p.originalLanguageId ?? p.projectDetails?.originalLanguageId),
            soundtrackRevenue: fromActive ? p.soundtrackRevenue : p.soundtrackRevenue,
            gross: fromActive ? p.totalGross : p.gross,
            streamingRevenue: fromActive ? p.streamingRevenue : p.streamingRevenue,
            campaignForecastSnapshot: fromActive ? p.projectDetails.campaignForecastSnapshot : p.campaignForecastSnapshot
        });
    };

    // Player Past Projects (only their exact award season)
    getCareerProjects(player).filter(p => !p.isQaArchive).forEach(p => {
        if (isProjectEligibleForAwardSeason(p, awardType, awardYear)) {
            addCandidate(p, false);
        }
    });
    
    // Player Active Releases (Currently running or just finished)
    /* 22 Nov 2026: any release counts, not only one 3+ weeks out: a title out in the invite week (or late December)
       otherwise missed its only season. */
    player.activeReleases.forEach(r => {
        if (r.weekNum >= 1 && isProjectEligibleForAwardSeason(r, awardType, awardYear)) {
            addCandidate(r, true);
        }
    });

    const nominations: Nomination[] = [];
    const isFemale = player.gender === 'FEMALE';
    /* 22 Nov 2026: Cinematic and Box Office Achievement (Globes) is relative, like the real one: a film the player
       produced is in when it out-grossed the fifth biggest film of the season. */
    const boxOfficeCategory = awardType ? findAwardCategoryForTitle(awardType, { kind: 'BOX_OFFICE', mediaType: 'MOVIE' }) : null;
    const boxOfficeBar = boxOfficeCategory && awardType
        ? (getWorldProjectsForAwardSeason(player, awardType, awardYear)
            .filter(project => getWorldProjectMediaType(project) === 'MOVIE' && Number(project.boxOffice) > 0)
            .map(project => Number(project.boxOffice))
            .sort((left, right) => right - left)[4] ?? 0)
        : 0;

    // 2. EVALUATE CANDIDATES
    candidates.forEach(project => {
        if ((project.rating || 0) < 7.0) return; // Minimum 7.0 to be considered
        /* 21 Nov 2026: the parts this title's ballot score is made of (the same parts as any world nominee) */
        const ballotQuality = clampAwardScore(Number(project.quality) || 0);
        const ballotRating = clampAwardScore((Number(project.rating) || 0) * 10);
        const ballotCampaign = clampAwardScore(Number(project.campaignForecastSnapshot?.awardsVisibility ?? (ballotQuality - 2)));
        const ballotInputsFor = (craft: number, performance?: number): AwardBallotInputs => ({
            craft: clampAwardScore(Number(craft) || 0),
            quality: ballotQuality,
            rating: ballotRating,
            campaign: ballotCampaign,
            genre: project.genre,
            ...(performance !== undefined ? { performance } : {}),
        });
        const mediaTypeMatchesAward =
            awardType === 'EMMY'
                ? project.mediaType === 'SERIES'
                : awardType === 'GOLDEN_GLOBE'
                    ? true
                    : project.mediaType === 'MOVIE';
        if (awardType && mediaTypeMatchesAward) {
            const addMusicNomination = (category: string | null, score: number, threshold: number, craft: number) => {
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
                    playerCreditRole: 'MUSIC',
                    ballotInputs: ballotInputsFor(craft),
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
            const musicLuck = createDeterministicRng(
                `award-nomination:${awardType}:${awardYear}:music:${project.id}`
            )() * 4;
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
                    awardType === 'OSCAR' ? 89 : awardType === 'EMMY' ? 86 : 84,
                    songCraft
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
                    awardType === 'OSCAR' ? 89 : awardType === 'BAFTA' ? 86 : awardType === 'EMMY' ? 86 : 84,
                    scoreCraft
                );
            }

            const addPlayerCreativeNomination = (
                category: string | null,
                score: number,
                threshold: number,
                playerCreditRole: NonNullable<Nomination['playerCreditRole']>,
                craft: number
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
                    playerCreditRole,
                    ballotInputs: ballotInputsFor(craft),
                });
            };

            const playerCreativeCredits = getPlayerCreativeCreditFlags(player, project);
            const writerScore = getAverageStat(player.writerStats as any);
            const directorScore = getAverageStat(player.directorStats as any);
            const producerHeat = Math.min(18, Math.log10(Math.max(1, (project.gross || 0) + (project.streamingRevenue || 0))) * 2.1);
            const creativeLuck = createDeterministicRng(
                `award-nomination:${awardType}:${awardYear}:creative:${project.id}`
            )() * 8;

            /* 22 Nov 2026: writing and directing compete at every show that has the category (Globes film, Emmys by
               drama or comedy series), not only the Oscars and BAFTA */
            const creativeTitle = { mediaType: project.mediaType === 'SERIES' ? 'SERIES' as const : 'MOVIE' as const, genre: project.genre, languageId: project.languageId };
            if (playerCreativeCredits.WRITER) {
                addPlayerCreativeNomination(
                    findAwardCategoryForTitle(awardType, { kind: 'SCREENPLAY', ...creativeTitle }),
                    prestigeBase + (project.hiddenStats?.scriptQuality || qualityScore) * 0.2 + writerScore * 0.28 + creativeLuck,
                    86,
                    'WRITER',
                    project.hiddenStats?.scriptQuality || qualityScore
                );
            }
            if (playerCreativeCredits.DIRECTOR) {
                addPlayerCreativeNomination(
                    findAwardCategoryForTitle(awardType, { kind: 'DIRECTOR', ...creativeTitle }),
                    prestigeBase + (project.hiddenStats?.directorQuality || qualityScore) * 0.2 + directorScore * 0.28 + creativeLuck,
                    awardType === 'OSCAR' ? 87 : 82,
                    'DIRECTOR',
                    project.hiddenStats?.directorQuality || qualityScore
                );
            }
            if (playerCreativeCredits.PRODUCER) {
                addPlayerCreativeNomination(
                    getProducerAwardCategory(awardType, project),
                    prestigeBase + producerHeat + Number(project.campaignForecastSnapshot?.awardsVisibility || 0) * 0.18 + creativeLuck,
                    awardType === 'OSCAR' ? 88 : awardType === 'EMMY' ? 81 : 79,
                    'PRODUCER',
                    qualityScore
                );
                const gross = Number(project.gross) || 0;
                if (boxOfficeCategory && project.mediaType === 'MOVIE' && gross > 0 && gross >= boxOfficeBar) {
                    const boxCraft = getAwardBoxOfficeCraft(gross);
                    addPlayerCreativeNomination(boxOfficeCategory, Math.max(boxCraft, 1), 0, 'PRODUCER', boxCraft);
                }
            }
        }

        const normalizedRole = project.roleType || 'MINOR';
        const isLeadRole = normalizedRole === 'LEAD';
        const isSupportingRole = normalizedRole === 'SUPPORTING';

        // Minor, cameo, and ensemble roles should not be treated as supporting award contenders.
        if (!isLeadRole && !isSupportingRole) return;

        /* 21 Nov 2026 (Zeesh: "Oscar ke bonus kabhi lagte nahi, ise theek karo"): the score's taste checks the CEREMONY
           week (Oscars = 10). This runs at the invite week (6), so the Oscar drama and great-performance bonuses never
           applied. */
        const nomScore = calculateActorAwardNominationScore(
            project,
            getAwardCeremonyWeek(awardType) || week,
            createDeterministicRng(`award-nomination:${awardType || 'UNKNOWN'}:${awardYear}:actor:${project.id}`)() * 15,
        );
        const actingPerformance = clampAwardScore(
            Number.isFinite(Number(project.playerRolePerformance)) ? Number(project.playerRolePerformance) : ballotQuality
        );

        // LOWERED THRESHOLDS for accessibility
        // Branch on the show, not the week: this runs at each show's invite week (50, 1, 6, 34), never at its
        // ceremony week, so the old week checks sent every show down the Oscar branch. Emmy nominations got film
        // categories the ceremony then dropped, and Globe acting nominations never matched the Globe list.
        const threshold = awardType === 'OSCAR' ? 85 : awardType === 'EMMY' ? 80 : 75; // Oscars 85, Emmys 80, Others 75

        if (nomScore >= threshold && awardType) {
            /* 22 Nov 2026: the show's own category for this performance: lead or supporting, film or TV, and at the
               Globes and Emmys drama or musical/comedy, as the real shows split them. No category (an animated voice
               role, a documentary, a film at the Emmys) means no nomination. */
            const cat = findAwardCategoryForTitle(awardType, {
                kind: 'ACTING',
                gender: isFemale ? 'FEMALE' : 'MALE',
                role: isLeadRole ? 'LEAD' : 'SUPPORTING',
                mediaType: project.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE',
                genre: project.genre,
                languageId: project.languageId,
            });
            if (!cat) return;

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
                        playerCreditRole: 'ACTOR',
                        ballotInputs: ballotInputsFor(actingPerformance, actingPerformance),
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

/* ---------- 21 Nov 2026: one rule for every nominee (Zeesh: "jab sabko 100 mil jaye to kya karenge") ----------
   Before, a world nominee's ballot score was capped at 100, while the player's kept its own bonuses and up to 15 luck
   with no cap (often 105-118). A nominated player nearly always won, and a real tie fell to the alphabetical project id.
   Now every nominee in a category is scored from the same parts (craft, quality, rating, campaign), with the same taste
   of the show and the same small seeded luck, and the sum is not capped, so the order is kept and exact ties are
   practically impossible. A real tie goes to momentum this season, then rating, then campaign, then a seeded draw. */
const AWARD_BALLOT_LUCK = 6;

/* 22 Nov 2026: by the category's kind (the same weights as before for every old category) */
const getAwardCraftWeight = (category: string): number => {
    switch (getAwardCategorySpec(category).kind) {
        case 'ACTING': return 0.66;
        case 'DIRECTOR': return 0.68;
        case 'SCREENPLAY': return 0.7;
        case 'CINEMATOGRAPHY': return 0.7;
        case 'VFX': return 0.7;
        case 'SCORE': return 0.72;
        case 'SONG': return 0.72;
        case 'BOX_OFFICE': return 0.75;
        default: return 0.58;
    }
};

/** The show's taste, the same for every nominee in an acting race. It used to lift only the player, and never fired. */
export const getAwardShowTasteBonus = (
    awardType: AwardType, category: string, genre?: string, performance?: number,
): number => {
    if (!/Actor|Actress/.test(category)) return 0;
    const acting = Number.isFinite(Number(performance)) ? Number(performance) : 0;
    let bonus = 0;
    if (awardType === 'OSCAR' && ['DRAMA', 'THRILLER', 'MYSTERY'].includes(String(genre))) bonus += 10;
    if (awardType === 'OSCAR' && acting > 90) bonus += 5;
    if (/Supporting/.test(category) && acting >= 88) bonus += 3;
    return bonus;
};

/** A nominee's standing before the night's luck: the parts and the show's taste. Decides who makes the ballot. */
export const getAwardBallotStanding = (awardType: AwardType, category: string, inputs: AwardBallotInputs): number => {
    const part = (value: number) => clampAwardScore(Number.isFinite(Number(value)) ? Number(value) : 0);
    return part(inputs.craft) * getAwardCraftWeight(category)
        + part(inputs.quality) * 0.2
        + part(inputs.rating) * 0.13
        + part(inputs.campaign) * 0.05
        + getAwardShowTasteBonus(awardType, category, inputs.genre, inputs.performance);
};

/** One nominee's ballot score: the same parts, taste and luck for the player and the world, never capped, less the
    voters' fatigue with last year's winner. */
export const scoreAwardBallotEntry = (
    awardType: AwardType, awardYear: number, category: string, projectId: string, inputs: AwardBallotInputs,
): number => {
    const luck = createDeterministicRng(`award-ballot-luck:${awardType}:${awardYear}:${category}:${projectId}`)()
        * AWARD_BALLOT_LUCK;
    return getAwardBallotStanding(awardType, category, inputs) + luck - Math.max(0, Number(inputs.fatigue) || 0);
};

const getAwardTieDraw = (nomination: Pick<Nomination, 'category' | 'project'>, awardType?: string, awardYear?: number) => (
    hashToUnit(`award-tie:${awardType || ''}:${awardYear ?? ''}:${nomination.category}:${nomination.project.id}`)
);

/** Every winner pick uses this one order: the score, then, for a real tie only, momentum, rating, campaign and a
    seeded draw. The project id is the very last resort, so the same ballot always gives the same winner. */
export const compareAwardBallotEntries = (a: Nomination, b: Nomination): number => (
    (b.score - a.score)
    || ((b.tie?.momentum ?? 0) - (a.tie?.momentum ?? 0))
    || ((b.tie?.rating ?? 0) - (a.tie?.rating ?? 0))
    || ((b.tie?.campaign ?? 0) - (a.tie?.campaign ?? 0))
    || ((b.tie?.draw ?? getAwardTieDraw(b)) - (a.tie?.draw ?? getAwardTieDraw(a)))
    || a.project.id.localeCompare(b.project.id)
);

/** The winner of one category's ballot: the same pick on the ceremony screen, in the history and in the news. */
export const pickAwardBallotWinner = (nominees: Nomination[] | undefined | null): Nomination | null => (
    Array.isArray(nominees) && nominees.length ? [...nominees].sort(compareAwardBallotEntries)[0] : null
);

/** 21 Nov 2026 (heir careers): a season inherited from an earlier generation is marked at succession. Its year is
    that generation's age, so it never stands for (or blocks) a season of this career. */
export const isCurrentGenerationAwardEntry = (entry: { inherited?: boolean } | null | undefined): boolean => (
    !entry?.inherited
);

/** The ceremony week of a show (Oscars 10, BAFTA 4, Globes 2, Emmys 38). */
export const getAwardCeremonyWeek = (awardType?: AwardType | null): number => Number(
    Object.entries(AWARD_CALENDAR).find(([, definition]) => definition.type === awardType)?.[0] ?? 0,
);

const getWorldProjectMediaType = (project: IndustryProject): ProjectType => (
    project.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE'
);

export const isWorldProjectEligibleForAwardSeason = (
    project: IndustryProject,
    awardType: AwardType,
    awardYear: number
): boolean => {
    if (project.marketOpportunityId && project.marketPremiereAtAbsoluteWeek == null) return false;
    const mediaType = getWorldProjectMediaType(project);
    if (awardType === 'EMMY') {
        if (mediaType !== 'SERIES') return false;
        const emmyInviteWeek = getAwardDefinitionByType('EMMY')?.inviteWeek || 34;
        const seasonYear = project.weekReleased > emmyInviteWeek ? project.year + 1 : project.year;
        return seasonYear === awardYear;
    }
    if (awardType === 'GOLDEN_GLOBE') {
        /* 22 Nov 2026: out after the week-50 field is set: the next Globes (see getProjectAwardSeasonYear) */
        const globesInviteWeek = getAwardDefinitionByType('GOLDEN_GLOBE')?.inviteWeek || 50;
        return (project.weekReleased > globesInviteWeek ? project.year + 2 : project.year + 1) === awardYear;
    }
    return mediaType === 'MOVIE' && project.year + 1 === awardYear;
};

const getWorldProjectsForAwardSeason = (
    player: Player, awardType: AwardType, awardYear: number,
): IndustryProject[] => {
    const savedProjects = [...(player.world.projects || []), ...getOutsideOriginalAwardRows(player)].filter(project => (
        isWorldProjectEligibleForAwardSeason(project, awardType, awardYear)
    ));
    if (player.world.awardHistory.some(entry => isCurrentGenerationAwardEntry(entry) && entry.type === awardType && entry.year === awardYear)) {
        return savedProjects;
    }
    const definition = getAwardDefinitionByType(awardType);
    const ceremonyWeek = Number(Object.entries(AWARD_CALENDAR)
        .find(([, candidate]) => candidate.type === awardType)?.[0]);
    const inviteYear = definition && definition.inviteWeek > ceremonyWeek
        ? awardYear - 1 : awardYear;
    const inviteAbsoluteWeek = definition && inviteYear >= 1
        ? getAbsoluteWeek(inviteYear, definition.inviteWeek) : -1;
    const catalogueStart = player.world.historicalCatalogue?.initializedAtAbsoluteWeek;
    if (catalogueStart === undefined || catalogueStart > inviteAbsoluteWeek
        || getAbsoluteWeek(player.age, player.currentWeek) > inviteAbsoluteWeek
        || player.scheduledEvents.some(event => event.type === 'AWARD_CEREMONY'
            && event.data?.awardDef?.type === awardType && event.data?.awardYear === awardYear)) {
        return savedProjects;
    }
    const ids = new Set(savedProjects.map(project => project.id));
    const seededProjects = getHistoricalCatalogueAwardProjects(player, awardYear)
        .filter(project => isWorldProjectEligibleForAwardSeason(project, awardType, awardYear)
            && !ids.has(project.id));
    return [...savedProjects, ...seededProjects];
};

/** A world title's parts for one category (21 Nov 2026: split out so its ballot score uses the player's rule). */
export const getWorldAwardCategoryInputs = (
    project: IndustryProject,
    category: string
): AwardBallotInputs => {
    const quality = clampAwardScore(project.quality);
    const ratingScore = clampAwardScore((project.rating ?? (4.8 + quality * 0.045)) * 10);
    const stableProfile = (field: string, bias = 0) => clampAwardScore(
        quality + ((hashToUnit(`${project.id}:${field}`) - 0.5) * 30) + bias
    );
    const profile = project.awardProfile;
    const campaign = clampAwardScore(profile?.campaign ?? stableProfile('campaign', -2));
    /* 22 Nov 2026: by the category's kind, not words in its name; Visual Effects and Box Office added */
    const kind = getAwardCategorySpec(category).kind;
    const acting = kind === 'ACTING';
    let craft: number;
    if (acting) craft = profile?.leadPerformance ?? stableProfile('performance');
    else if (kind === 'DIRECTOR') craft = profile?.directing ?? stableProfile('directing');
    else if (kind === 'SCREENPLAY') craft = profile?.screenplay ?? stableProfile('screenplay');
    else if (kind === 'CINEMATOGRAPHY') craft = profile?.cinematography ?? stableProfile('cinematography');
    else if (kind === 'SCORE') craft = profile?.originalScore ?? stableProfile('original-score', -3);
    else if (kind === 'SONG') {
        const genreBoost = ['MUSICAL', 'ANIMATION', 'BIOPIC'].includes(project.genre) ? 8 : -5;
        craft = profile?.originalSong ?? stableProfile('original-song', genreBoost);
    } else if (kind === 'VFX') {
        const spectacle = ['SCI_FI', 'SUPERHERO', 'FANTASY', 'ACTION', 'ADVENTURE'].includes(project.genre) ? 22 : -8;
        const budget = ['HIGH', 'BLOCKBUSTER', 'MEGA'].includes(String(project.budgetTier)) ? 12 : String(project.budgetTier) === 'MID' ? 4 : -6;
        craft = clampAwardScore(quality * 0.55 + spectacle + budget + (hashToUnit(`${project.id}:vfx`) - 0.5) * 10);
    } else if (kind === 'BOX_OFFICE') craft = getAwardBoxOfficeCraft(project.boxOffice);
    else craft = profile?.picture ?? stableProfile('picture');
    return { craft, quality, rating: ratingScore, campaign, genre: project.genre, ...(acting ? { performance: craft } : {}) };
};

/** Box office on the award scale: $1M = 0, $10M = 33, $100M = 67, $1B = 100. */
export const getAwardBoxOfficeCraft = (gross: unknown): number => {
    const value = Number(gross);
    return value > 0 ? clampAwardScore(((Math.log10(value) - 6) / 3) * 100) : 0;
};

/** A world title's standing in a category (0-100): decides which titles reach the ballot. Unchanged numbers. */
export const getWorldAwardCategoryScore = (
    project: IndustryProject,
    category: string
): number => {
    const inputs = getWorldAwardCategoryInputs(project, category);
    return clampAwardScore(
        (inputs.craft * getAwardCraftWeight(category))
        + (inputs.quality * 0.2)
        + (inputs.rating * 0.13)
        + (inputs.campaign * 0.05)
    );
};

/* ---------- 22 Nov 2026: the world's nominees are real titles and real people ----------
   Zeesh: "we try to have everything as per the real world". Before, a category with fewer than five titles over a fixed
   bar was filled with made-up titles ("Season Selection 494") that often won; supporting races took each title's LEAD
   actor, so one person won lead and supporting; cinematography went to the lead actor, the score to pop acts, a best
   picture to "Producers". Now:
   - every eligible real title competes by the category's rules (film or TV, drama or comedy, animated, not English);
   - the field is relative, like a class topper: the best five entries that exist are nominated, however the year
     went, and the best one wins even when it is the only one; a category with no real entry that year is not
     presented;
   - each entry names the real person: the billed lead for lead races; for supporting races a performer of the right
     gender, the same for the title at every show, never a lead of the season; the director; the writer; the
     cinematographer, VFX supervisor or composer from the crew list; the studio for a title award;
   - one entry per person in a category;
   - a performance (and directing) is scored from the person's own skill first, the title second. */
type AwardPerson = (typeof NPC_DATABASE)[number];

interface AwardPeople {
    byId: Map<string, AwardPerson>;
    byName: Map<string, AwardPerson>;
    actors: Record<'MALE' | 'FEMALE', AwardPerson[]>;
    writers: AwardPerson[];
    music: AwardPerson[];
    crew: Record<string, AwardPerson[]>;
}

const addAwardPerson = (people: AwardPeople, person: AwardPerson) => {
    if (!person?.id || people.byId.has(person.id)) return;
    people.byId.set(person.id, person);
    const occupation = String((person as any).occupation || '');
    /* a name shared by two people resolves to the actor (a title's lead is looked up by name only when its id is not
       a person's, as for a passed pitch's lead) */
    const named = person.name ? people.byName.get(person.name) : undefined;
    if (person.name && (!named || (occupation === 'ACTOR' && String((named as any).occupation) !== 'ACTOR'))) people.byName.set(person.name, person);
    if (occupation === 'ACTOR' && (person.gender === 'MALE' || person.gender === 'FEMALE')) people.actors[person.gender].push(person);
    else if (occupation === 'WRITER') people.writers.push(person);
    else if (occupation === 'MUSIC_ARTIST') people.music.push(person);
    else if (['CINEMATOGRAPHER', 'COMPOSER', 'VFX_SUPERVISOR'].includes(occupation)) (people.crew[occupation] ||= []).push(person);
};

const emptyAwardPeople = (): AwardPeople => ({ byId: new Map(), byName: new Map(), actors: { MALE: [], FEMALE: [] }, writers: [], music: [], crew: {} });

let builtInAwardPeople: AwardPeople | null = null;
let saveAwardPeople: { source: unknown; people: AwardPeople } | null = null;

/** Everyone who can be nominated: the built-in people and the save's own (most world titles' leads are save NPCs). */
const getAwardPeople = (player: Player): AwardPeople => {
    if (!builtInAwardPeople) {
        builtInAwardPeople = emptyAwardPeople();
        NPC_DATABASE.forEach(person => addAwardPerson(builtInAwardPeople!, person));
    }
    const extra = (player.flags as any)?.extraNPCs;
    if (!Array.isArray(extra) || !extra.length) return builtInAwardPeople;
    if (saveAwardPeople?.source === extra) return saveAwardPeople.people;
    const people = emptyAwardPeople();
    NPC_DATABASE.forEach(person => addAwardPerson(people, person));
    extra.forEach((person: AwardPerson) => addAwardPerson(people, person));
    saveAwardPeople = { source: extra, people };
    return people;
};

/** The same pick every time for the same seed: the best hash plus how well the person fits the title. */
const pickAwardPerson = (
    pool: AwardPerson[], seed: string, fit: (person: AwardPerson) => number, skip?: (person: AwardPerson) => boolean,
): AwardPerson | null => {
    let best: AwardPerson | null = null;
    let bestScore = -Infinity;
    for (const person of pool) {
        if (skip?.(person)) continue;
        const score = hashToUnit(`${seed}:${person.id}`) + fit(person);
        if (score > bestScore) {
            best = person;
            bestScore = score;
        }
    }
    return best;
};

const getAwardPersonSkill = (person?: AwardPerson | null): number | null => {
    const value = Number((person as any)?.stats?.talent);
    return person && Number.isFinite(value) ? clampAwardScore(value) : null;
};

/** Genre experience, and big films with established names (small ones with newer ones). */
const getAwardPersonFit = (person: AwardPerson, project: IndustryProject): number => {
    const genreXp = Number((person as any).stats?.genreXP?.[project.genre] || 0) > 0
        || (Array.isArray((person as any).specialties) && (person as any).specialties.includes(project.genre));
    const bigFilm = ['HIGH', 'BLOCKBUSTER', 'MEGA'].includes(String(project.budgetTier));
    const established = ['A_LIST', 'ICON', 'LEGEND', 'ESTABLISHED'].includes(String((person as any).crewTier || person.tier));
    return (genreXp ? 0.25 : 0) + (bigFilm === established ? 0.2 : 0);
};

/** A performance (or directing) on the award scale: the person's own skill first, then the title around it. */
const getAwardPerformanceCraft = (skill: number | null, project: IndustryProject, fallback: number, seed: string): number => (
    skill === null
        ? fallback
        : clampAwardScore(skill * 0.5 + clampAwardScore(project.quality) * 0.35 + 6 + (hashToUnit(seed) - 0.5) * 10)
);

/** The company a title award is credited to: the player's studio, a world studio or platform, or the studio id. */
const getAwardStudioName = (player: Player, project: IndustryProject): string => {
    const studioId = String(project.studioId || (project as any).physicalProducerStudioId || '');
    const own = (player.businesses || []).find(business => business.id === studioId);
    const worldStudio = (player.world as any).studios?.[studioId];
    const platform = (player.world as any).platforms?.[studioId];
    const name = own?.name || worldStudio?.name || platform?.identity?.name || platform?.name;
    if (name) return String(name);
    return studioId
        ? studioId.toLowerCase().split(/[_\s]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ')
        : project.title;
};

interface AwardWorldEntry {
    nomination: Nomination;
    inputs: AwardBallotInputs;
    standing: number;
    personKey: string;
}

const buildWorldAwardEntries = (
    player: Player,
    awardType: AwardType,
    category: string,
    spec: AwardCategorySpec,
    projects: IndustryProject[],
    seasonLeads: { ids: Set<string>; names: Set<string> },
): AwardWorldEntry[] => {
    const people = getAwardPeople(player);
    const entries: AwardWorldEntry[] = [];
    projects.forEach(project => {
        if (!fitsAwardCategory(spec, { mediaType: getWorldProjectMediaType(project), genre: project.genre, languageId: project.originalLanguageId })) return;
        const base = getWorldAwardCategoryInputs(project, category);
        let craft = base.craft;
        let nomineeName: string | undefined;
        let nomineeId: string | undefined;
        if (spec.kind === 'PICTURE' || spec.kind === 'BOX_OFFICE') {
            if (spec.kind === 'BOX_OFFICE' && !(Number(project.boxOffice) > 0)) return;
            nomineeName = getAwardStudioName(player, project);
        } else if (spec.kind === 'ACTING' && spec.role === 'SUPPORTING') {
            const gender = spec.gender || 'MALE';
            const performer = pickAwardPerson(
                people.actors[gender],
                `award-supporting:${project.id}:${gender}`,
                person => getAwardPersonFit(person, project),
                person => person.id === project.leadActorId || person.name === project.leadActorName
                    || seasonLeads.ids.has(person.id) || seasonLeads.names.has(person.name),
            );
            if (!performer) return;
            nomineeName = performer.name;
            nomineeId = performer.id;
            craft = getAwardPerformanceCraft(getAwardPersonSkill(performer), project, clampAwardScore(base.craft - 4), `award-performance:${project.id}:${performer.id}`);
        } else if (spec.kind === 'ACTING') {
            const lead = (project.leadActorId && people.byId.get(project.leadActorId))
                || (project.leadActorName && people.byName.get(project.leadActorName)) || null;
            /* a lead whose gender is unknown cannot be placed in a gendered race */
            if (!project.leadActorName || !lead || lead.gender !== spec.gender) return;
            nomineeName = project.leadActorName;
            nomineeId = lead.id;
            craft = getAwardPerformanceCraft(getAwardPersonSkill(lead), project, base.craft, `award-performance:${project.id}:${lead.id}`);
        } else if (spec.kind === 'DIRECTOR') {
            if (!project.directorName) return;
            const director = (project.directorId && people.byId.get(project.directorId)) || people.byName.get(project.directorName) || null;
            nomineeName = project.directorName;
            nomineeId = director?.id || project.directorId;
            craft = getAwardPerformanceCraft(getAwardPersonSkill(director), project, base.craft, `award-directing:${project.id}:${nomineeId || nomineeName}`);
        } else if (spec.kind === 'SCREENPLAY') {
            const credited = project.writerName?.trim();
            const writer = (project.writerId && people.byId.get(project.writerId))
                || (credited ? people.byName.get(credited) : null)
                || (credited ? null : pickAwardPerson(people.writers, `award-writer:${project.id}`, person => getAwardPersonFit(person, project)));
            nomineeName = credited || writer?.name;
            if (!nomineeName) return;
            nomineeId = writer?.id || project.writerId;
            const skill = getAwardPersonSkill(writer);
            craft = skill === null ? base.craft : clampAwardScore(base.craft * 0.6 + skill * 0.4);
        } else if (spec.kind === 'CINEMATOGRAPHY' || spec.kind === 'VFX' || spec.kind === 'SCORE') {
            const role = spec.kind === 'CINEMATOGRAPHY' ? 'CINEMATOGRAPHER' : spec.kind === 'VFX' ? 'VFX_SUPERVISOR' : 'COMPOSER';
            const member = pickAwardPerson(people.crew[role] || [], `award-crew:${role}:${project.id}`, person => getAwardPersonFit(person, project));
            if (!member) return;
            nomineeName = member.name;
            nomineeId = member.id;
            craft = clampAwardScore(base.craft * 0.6 + (getAwardPersonSkill(member) ?? base.craft) * 0.4);
        } else {
            const artist = pickAwardPerson(people.music, `award-song:${project.id}`, () => 0);
            nomineeName = getNomineeNameForMusicCategory(project, category, artist?.name || getFallbackAwardNominee(category, project.id || project.title));
            nomineeId = people.byName.get(nomineeName)?.id;
        }
        const inputs: AwardBallotInputs = { ...base, craft, ...(spec.kind === 'ACTING' ? { performance: craft } : {}) };
        entries.push({
            nomination: {
                project: { id: project.id, name: project.title },
                score: 0,
                category,
                isPlayer: false,
                nomineeName,
                ...(nomineeId ? { nomineeId } : {}),
            },
            inputs,
            standing: getAwardBallotStanding(awardType, category, inputs),
            personKey: spec.kind === 'PICTURE' || spec.kind === 'BOX_OFFICE' ? `title:${project.id}` : `person:${nomineeId || nomineeName}`,
        });
    });
    return entries;
};

// Generates a season-specific ballot: the player's nominations first, then the world's real field (see above).
export const generateFullBallot = (
    player: Player,
    awardType: AwardType,
    playerNoms: Nomination[],
    awardYear = player.age
): Record<string, Nomination[]> => {
    const lore = AWARD_SHOW_DB[awardType];
    const ballot: Record<string, Nomination[]> = {};
    const worldProjects = getWorldProjectsForAwardSeason(player, awardType, awardYear);
    /* 21 Nov 2026: momentum for a real tie: the title's wins this season (same award year) at shows already held */
    const seasonWins = new Map<string, number>();
    (player.world.awardHistory || [])
        .filter(entry => entry.year === awardYear && entry.type !== awardType && isCurrentGenerationAwardEntry(entry))
        .forEach(entry => entry.winners.forEach(winner => {
            if (winner.projectId) seasonWins.set(winner.projectId, (seasonWins.get(winner.projectId) || 0) + 1);
        }));
    /* 22 Nov 2026 (Zeesh: last year's winner, as in the real world): voters seldom give the same person the same award
       again right away. Who won this category at this show one or two seasons ago; title awards are exempt. */
    const recentWinners = new Set<string>();
    (player.world.awardHistory || []).forEach(entry => {
        const yearsAgo = awardYear - entry.year;
        if (entry.type !== awardType || !isCurrentGenerationAwardEntry(entry) || yearsAgo < 1 || yearsAgo > 2) return;
        entry.winners.forEach(winner => {
            if (isAwardTitleCategory(winner.category, awardType)) return;
            const people = winner.isPlayer ? ['player'] : [winner.personId, winner.winnerName].filter(Boolean) as string[];
            people.forEach(who => recentWinners.add(`${winner.category}::${who}::${yearsAgo}`));
        });
    });
    /* 4 for a win last season, 2 more for one the season before: a third straight win is the hardest */
    const fatigueFor = (nomination: Nomination, category: string): number => {
        if (isAwardTitleCategory(category, awardType)) return 0;
        const people = nomination.isPlayer ? ['player'] : [nomination.nomineeId, nomination.nomineeName].filter(Boolean) as string[];
        const won = (yearsAgo: number) => people.some(who => recentWinners.has(`${category}::${who}::${yearsAgo}`));
        return (won(1) ? 4 : 0) + (won(2) ? 2 : 0);
    };
    /* Every entry goes on the ballot the same way: scored by the one rule (when its parts are known) and given the
       tie-break keys. Entries without parts (an old queued nomination) keep their score. */
    const onBallot = (nomination: Nomination, inputs: AwardBallotInputs | undefined, category: string): Nomination => {
        const scored = inputs ? { ...inputs, fatigue: fatigueFor(nomination, category) } : undefined;
        return {
            ...nomination,
            ...(scored ? {
                nominationScore: nomination.score,
                score: scoreAwardBallotEntry(awardType, awardYear, category, nomination.project.id, scored),
            } : {}),
            tie: {
                momentum: seasonWins.get(nomination.project.id) || 0,
                rating: clampAwardScore(Number(inputs?.rating) || 0),
                campaign: clampAwardScore(Number(inputs?.campaign) || 0),
                draw: getAwardTieDraw(nomination, awardType, awardYear),
            },
        };
    };
    /* no lead of this season is anyone's supporting performer */
    const seasonLeads = { ids: new Set<string>(), names: new Set<string>() };
    worldProjects.forEach(project => {
        if (project.leadActorId) seasonLeads.ids.add(project.leadActorId);
        if (project.leadActorName) seasonLeads.names.add(project.leadActorName);
    });

    lore.categories.forEach(cat => {
        const spec = getAwardCategorySpec(cat, awardType);
        const categoryNoms: Nomination[] = [];

        // 1. The player's best nomination in this category (by the same order)
        const pNom = playerNoms
            .filter(n => n.category === cat)
            .sort(compareAwardBallotEntries)[0];
        if (pNom) {
            categoryNoms.push(onBallot(pNom, pNom.ballotInputs, cat));
        }
        // 2. The player's own titles written by an NPC writer: the writer is the nominee
        if (spec.kind === 'SCREENPLAY') {
            const creditedPlayerFilms = [
                ...getCareerProjects(player).filter(project => !project.isQaArchive).map(project => ({
                    id: project.id, name: project.name, writerId: project.writerId, writerName: project.writerName,
                    quality: project.projectQuality, rating: project.rating, release: project,
                    mediaType: resolveAwardMediaType((project as any).projectType, (project as any).type, (project as any).projectDetails?.type),
                    genre: (project as any).genre ?? (project as any).projectDetails?.genre,
                })),
                ...player.activeReleases.filter(project => project.weekNum >= 1).map(project => ({
                    id: project.id, name: project.name, writerId: project.projectDetails.writerId,
                    writerName: project.projectDetails.writerName,
                    quality: project.projectDetails.hiddenStats.qualityScore, rating: project.imdbRating || 0, release: project,
                    mediaType: resolveAwardMediaType(project.projectDetails?.type, (project as any).type),
                    genre: project.projectDetails?.genre,
                })),
            ].filter(project => project.writerId && project.writerName && !['PLAYER_SELF', 'player'].includes(project.writerId)
                && project.quality >= 75 && project.rating >= 7
                && fitsAwardCategory(spec, { mediaType: project.mediaType, genre: project.genre })
                && isProjectEligibleForAwardSeason(project.release, awardType, awardYear)
                && !categoryNoms.some(nomination => nomination.project.id === project.id))
                .map(project => ({
                    nomination: {
                        project: { id: project.id, name: project.name }, category: cat, isPlayer: false,
                        nomineeName: project.writerName!, nomineeId: project.writerId,
                        score: Math.min(100, project.quality * 0.7 + project.rating * 3),
                    } as Nomination,
                    /* the writer's work is the script: the same parts as any nominee */
                    inputs: {
                        craft: project.quality, quality: project.quality, rating: project.rating * 10,
                        campaign: project.quality - 2, genre: project.genre,
                    } as AwardBallotInputs,
                }))
                .sort((left, right) => compareAwardBallotEntries(left.nomination, right.nomination));
            categoryNoms.push(...creditedPlayerFilms.slice(0, Math.max(0, 5 - categoryNoms.length))
                .map(entry => onBallot(entry.nomination, entry.inputs, cat)));
        }

        // 3. The world's real field, best first, one entry per person and per title
        const takenTitles = new Set(categoryNoms.map(nomination => nomination.project.id));
        const takenPeople = new Set(categoryNoms
            .filter(nomination => !nomination.isPlayer)
            .map(nomination => `person:${nomination.nomineeId || nomination.nomineeName}`));
        const field = buildWorldAwardEntries(player, awardType, cat, spec, worldProjects, seasonLeads)
            .sort((left, right) => (
                right.standing - left.standing
                || left.nomination.project.id.localeCompare(right.nomination.project.id)
            ));
        for (const entry of field) {
            if (categoryNoms.length >= 5) break;
            if (takenTitles.has(entry.nomination.project.id) || takenPeople.has(entry.personKey)) continue;
            takenTitles.add(entry.nomination.project.id);
            takenPeople.add(entry.personKey);
            categoryNoms.push(onBallot({ ...entry.nomination, score: entry.standing }, entry.inputs, cat));
        }

        /* Zeesh's class-topper rule: the best entry that exists wins, even in a thin year (a single entry included);
           only a category with no real entry at all is not presented that year (no title is ever made up) */
        if (!categoryNoms.length) return;
        ballot[cat] = categoryNoms.sort(compareAwardBallotEntries);
    });

    return ballot;
};

export const determineWinners = (
    nominations: Nomination[],
    fullBallot?: Record<string, Nomination[]>
): { won: boolean, nomination: Nomination }[] => {
    /* 21 Nov 2026: a nomination wins only when it IS its category's ballot winner (a player entry, the same project).
       The ballot's pick uses the one order. Without a ballot (an old pending ceremony), the player's best nomination
       per category is still checked against the old world threshold. */
    const playerBestByCategory = new Map<string, Nomination>();

    nominations.forEach(nom => {
        const existing = playerBestByCategory.get(nom.category);
        if (!existing || compareAwardBallotEntries(nom, existing) < 0) {
            playerBestByCategory.set(nom.category, nom);
        }
    });

    return nominations.map(nom => {
        const ballotWinner = fullBallot && fullBallot[nom.category]?.length
            ? pickAwardBallotWinner(fullBallot[nom.category])
            : null;
        if (ballotWinner) {
            return { won: Boolean(ballotWinner.isPlayer && ballotWinner.project.id === nom.project.id), nomination: nom };
        }

        const playerContender = playerBestByCategory.get(nom.category);
        if (!playerContender || playerContender.project.id !== nom.project.id) {
            return { won: false, nomination: nom };
        }

        const worldWinnerScore = 90 + createDeterministicRng(
            `award-winner-threshold:${nom.category}:${nom.project.id}`
        )() * 15;
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
        ...(winner.projectId ? { projectId: winner.projectId } : {}),
        ...(winner.personId && !winner.isPlayer ? { personId: winner.personId } : {}),
        isPlayer: winner.isPlayer
    }))
});

export const resolveCanonicalAwardSeason = (
    player: Player,
    awardType: AwardType,
    awardYear = player.age,
    resolvedWinners?: AwardResolvedWinner[],
    ceremonyBallot?: Record<string, Nomination[]>
): AwardHistoryEntry => {
    const existing = player.world.awardHistory.find(entry => (
        isCurrentGenerationAwardEntry(entry) && entry.type === awardType && entry.year === awardYear
    ));
    if (existing) return existing;
    if (resolvedWinners?.length) {
        return createAwardHistoryFromBallot(awardType, awardYear, resolvedWinners);
    }
    const scheduledCeremony = player.scheduledEvents.find(event => (
        event.type === 'AWARD_CEREMONY'
        && event.data?.awardDef?.type === awardType
        && event.data?.awardYear === awardYear
    ));
    const pendingCeremony = player.pendingEvent?.type === 'AWARD_CEREMONY'
        && player.pendingEvent.data?.awardDef?.type === awardType
        && player.pendingEvent.data?.awardYear === awardYear
        ? player.pendingEvent : undefined;
    const frozenBallot = ceremonyBallot || scheduledCeremony?.data?.fullBallot
        || pendingCeremony?.data?.fullBallot;
    /* 22 Nov 2026: one way to decide a season: its ballot. A season without a frozen one (a save from before the invite
       ran, a skipped week) gets one built now by the same rules, instead of the old looser path that ignored film/TV
       at the Globes and could give an acting award to "Producers". A ballot frozen before the real-world category lists
       is decided with its own categories. */
    const ballot: Record<string, Nomination[]> = frozenBallot && typeof frozenBallot === 'object' && Object.keys(frozenBallot).length
        ? frozenBallot as Record<string, Nomination[]>
        : generateFullBallot(player, awardType, [], awardYear);
    const historyEntry: AwardHistoryEntry = {
        year: awardYear,
        type: awardType,
        winners: []
    };
    const playerWins = player.awards.filter(award => (
        award.type === awardType && award.outcome === 'WON' && award.year === awardYear
    ));
    const categories = [
        ...Object.keys(ballot),
        ...playerWins.map(award => award.category).filter(category => !(category in ballot)),
    ];

    categories.forEach(cat => {
        const playerWin = playerWins.find(award => award.category === cat);

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
                projectId: playerWin.projectId,
                isPlayer: true
            });
            return;
        }
        const nominees = Array.isArray(ballot[cat])
            ? (ballot[cat] as Nomination[]).filter(nomination => (
                nomination?.project?.id && nomination.project.name
                && Number.isFinite(nomination.score)
            )) : [];
        const winner = pickAwardBallotWinner(nominees);
        if (!winner) return;
        historyEntry.winners.push({
            category: cat,
            winnerName: winner.nomineeName || (winner.isPlayer ? player.name : winner.project.name),
            projectName: winner.project.name,
            projectId: winner.project.id,
            ...(winner.nomineeId && !winner.isPlayer ? { personId: winner.nomineeId } : {}),
            isPlayer: winner.isPlayer
        });
    });

    return historyEntry;
};

export const generateSeasonWinners = (
    player: Player,
    awardType: AwardType,
    awardYear = player.age,
    resolvedWinners?: AwardResolvedWinner[]
): AwardHistoryEntry => resolveCanonicalAwardSeason(player, awardType, awardYear, resolvedWinners);

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
