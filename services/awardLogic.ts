
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
    const pool = NPC_DATABASE.filter(n => {
        if (isActress) return n.gender === 'FEMALE';
        if (isActor) return n.gender === 'MALE';
        if (isDirector) return n.occupation === 'DIRECTOR';
        return true;
    });
    if (pool.length > 0) {
        const index = Math.abs(Array.from(salt).reduce((sum, char) => sum + char.charCodeAt(0), 0)) % pool.length;
        return pool[index].name;
    }
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
        categories: ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Supporting Actor", "Best Supporting Actress", "Best Original Song", "Best Score", "Best Soundtrack", "Best Trailer", "Best Music Video Tie-In"],
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
            "Best Original Song", "Best Score", "Best Soundtrack", "Best Trailer", "Best Music Video Tie-In"
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
            "Outstanding Original Song", "Outstanding Score", "Outstanding Soundtrack", "Outstanding Trailer", "Outstanding Music Video Tie-In"
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
            "Best Original Song", "Best Score", "Best Soundtrack", "Best Trailer", "Best Music Video Tie-In"
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

const MUSIC_AWARD_CATEGORY_KEYWORDS = ['Song', 'Score', 'Soundtrack', 'Trailer', 'Music Video'];

const isMusicAwardCategory = (category: string): boolean => (
    MUSIC_AWARD_CATEGORY_KEYWORDS.some(keyword => category.includes(keyword))
);

const getNomineeNameForMusicCategory = (project: any, category: string, fallbackName: string): string => {
    const credits = project.musicPlan?.credits || [];
    if (category.includes('Score')) {
        const composer = project.crewList?.find((crew: any) => crew.role === 'COMPOSER');
        return composer?.name || credits.find((credit: any) => /score|orchestra|classical|film/i.test(`${credit.genre} ${credit.songTitle}`))?.artistName || 'Composer';
    }
    if (category.includes('Music Video')) {
        return credits.find((credit: any) => credit.role === 'MUSIC_VIDEO_TIE_IN')?.artistName || credits[0]?.artistName || fallbackName;
    }
    if (category.includes('Song')) {
        return credits.find((credit: any) => ['LEAD_SINGLE', 'END_CREDIT_SONG', 'TRAILER_ANTHEM'].includes(credit.role))?.artistName || credits[0]?.artistName || fallbackName;
    }
    if (category.includes('Soundtrack')) {
        return credits.find((credit: any) => ['PROMO_ALBUM', 'SOUNDTRACK_EP'].includes(credit.role))?.artistName || credits[0]?.artistName || 'Music Team';
    }
    if (category.includes('Trailer')) {
        return credits.find((credit: any) => credit.role === 'TRAILER_ANTHEM')?.artistName || 'Marketing Team';
    }
    return fallbackName;
};

const getPlayerMusicAwardCategory = (awardType: AwardType, baseCategory: 'SONG' | 'SCORE' | 'SOUNDTRACK' | 'TRAILER' | 'VIDEO'): string => {
    const prefix = awardType === 'EMMY' ? 'Outstanding' : 'Best';
    if (baseCategory === 'SONG') return `${prefix} Original Song`;
    if (baseCategory === 'SCORE') return `${prefix} Score`;
    if (baseCategory === 'SOUNDTRACK') return `${prefix} Soundtrack`;
    if (baseCategory === 'TRAILER') return `${prefix} Trailer`;
    return `${prefix} Music Video Tie-In`;
};

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

    awards.forEach(award => {
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
    player.pastProjects.forEach(p => {
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
            const addMusicNomination = (category: string, score: number, threshold: number) => {
                if (score < threshold) return;
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
                    nomineeName: getNomineeNameForMusicCategory(project, category, player.name)
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
            const ratingScore = (project.rating || 7) * 10;
            const qualityScore = project.quality || 60;
            const prestigeBase = (ratingScore * 0.35) + (qualityScore * 0.35);
            const revenueHeat = Math.min(12, Math.log10(Math.max(1, (project.gross || 0) + (project.streamingRevenue || 0) + (project.soundtrackRevenue || 0))) * 1.4);
            const campaignTrailer = Number(project.hiddenStats?.musicTrailerStrengthLift || 0)
                + Number(project.campaignForecastSnapshot?.awardsVisibility || 0) * 0.18
                + Number(project.hiddenStats?.campaignFitScore || 0) * 0.08;

            if (credits.some((credit: any) => ['LEAD_SINGLE', 'END_CREDIT_SONG', 'TRAILER_ANTHEM'].includes(credit.role))) {
                addMusicNomination(
                    getPlayerMusicAwardCategory(awardType, 'SONG'),
                    prestigeBase + (musicImpact?.awardChanceLift || 0) * 2.5 + (musicImpact?.socialHypeLift || 0) * 0.45 + revenueHeat + Math.random() * 10,
                    awardType === 'OSCAR' ? 82 : 76
                );
            }
            if (project.crewList?.some((crew: any) => crew.role === 'COMPOSER') || credits.some((credit: any) => /score|orchestra|classical|film/i.test(`${credit.genre} ${credit.songTitle}`))) {
                addMusicNomination(
                    getPlayerMusicAwardCategory(awardType, 'SCORE'),
                    prestigeBase + (qualityScore * 0.18) + (project.genre === 'DRAMA' || project.genre === 'SCI_FI' || project.genre === 'FANTASY' ? 8 : 0) + Math.random() * 8,
                    awardType === 'OSCAR' ? 84 : 78
                );
            }
            if (credits.some((credit: any) => ['SOUNDTRACK_EP', 'PROMO_ALBUM'].includes(credit.role))) {
                addMusicNomination(
                    getPlayerMusicAwardCategory(awardType, 'SOUNDTRACK'),
                    prestigeBase + (musicImpact?.score || 0) * 0.35 + Math.min(14, (project.soundtrackRevenue || 0) / 650_000) + Math.random() * 9,
                    awardType === 'OSCAR' ? 84 : 77
                );
            }
            if ((musicImpact?.trailerStrengthLift || 0) > 0 || campaignTrailer > 12) {
                addMusicNomination(
                    getPlayerMusicAwardCategory(awardType, 'TRAILER'),
                    prestigeBase + campaignTrailer + (musicImpact?.trailerStrengthLift || 0) * 1.4 + revenueHeat + Math.random() * 9,
                    awardType === 'OSCAR' ? 83 : 76
                );
            }
            if (credits.some((credit: any) => credit.role === 'MUSIC_VIDEO_TIE_IN')) {
                addMusicNomination(
                    getPlayerMusicAwardCategory(awardType, 'VIDEO'),
                    prestigeBase + (musicImpact?.socialHypeLift || 0) * 0.9 + (musicImpact?.audienceReachLiftPct || 0) * 0.55 + revenueHeat + Math.random() * 9,
                    awardType === 'OSCAR' ? 84 : 76
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

        // REVISED SCORE FORMULA
        // 50% Quality (Hidden) + 50% Rating (Visible)
        const perfScore = project.quality || 50; 
        const imdbScore = (project.rating || 5) * 10;
        
        let nomScore = (perfScore * 0.5) + (imdbScore * 0.5);

        // Oscar Bias: Drama/Prestige
        if (week === 10) {
            if (project.genre === 'DRAMA' || project.genre === 'THRILLER' || project.genre === 'MYSTERY') nomScore += 10;
            if (perfScore > 90) nomScore += 5; 
        }
        
        // Add random variance (Luck factor)
        nomScore += Math.random() * 15;

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

// NEW: Generates the full ballot (NPCs included) for the "Season View"
export const generateFullBallot = (player: Player, awardType: AwardType, playerNoms: Nomination[]): Record<string, Nomination[]> => {
    const lore = AWARD_SHOW_DB[awardType];
    const ballot: Record<string, Nomination[]> = {};
    const worldProjects = player.world.projects || [];
    
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
            const isTVOnly = awardType === 'EMMY' || cat.includes('TV Series');

            // Find eligible world projects
            // Filter by quality
            let candidates = worldProjects.filter(p => {
                if (p.quality < 50) return false; // Lowered threshold slightly to ensure pool isn't empty
                return true;
            });
            
            // Filter candidates by Actor Gender if applicable
            // IMPORTANT: Don't fail if NPC_DATABASE lookup misses (due to save/load cycle ID mismatch)
            if (isActress) {
                candidates = candidates.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    // If actor found, check gender. If not found, assume 50/50 chance for random fill or allow it
                    return actor ? actor.gender === 'FEMALE' : Math.random() > 0.5;
                });
            } else if (isActor) {
                candidates = candidates.filter(p => {
                    const actor = NPC_DATABASE.find(n => n.id === p.leadActorId);
                    return actor ? actor.gender === 'MALE' : Math.random() > 0.5;
                });
            }

            candidates = candidates.sort(() => 0.5 - Math.random()).slice(0, spotsLeft);
            
            candidates.forEach(p => {
                // Determine nominee name based on category
                const linkedActor = p.leadActorId ? NPC_DATABASE.find(n => n.id === p.leadActorId) : null;
                let nomineeName = p.leadActorName || linkedActor?.name || p.directorName || p.title;
                if (isActor || isActress) nomineeName = p.leadActorName || linkedActor?.name || getFallbackAwardNominee(cat, p.id || p.title);
                else if (isDirector) nomineeName = p.directorName || getFallbackAwardNominee(cat, p.id || p.title);
                else if (isMusicAward) nomineeName = getNomineeNameForMusicCategory(p, cat, 'Music Team');
                else if (reallyIsProjectAward) nomineeName = "Producers";

                categoryNoms.push({
                    project: { id: p.id, name: p.title },
                    score: p.quality + (Math.random() * 20), // Simulated score
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
                    score: 70 + (Math.random() * 30),
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

    const targetYear = year - 1; 
    const worldCandidates = player.world.projects.filter(p => {
        return (p.year === targetYear || p.year === year) && p.quality > 60;
    });
    
    const usedNames = new Set<string>();

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

            let possibleWinners = [...worldCandidates].filter(p => !usedNames.has(p.title));
            
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
            
            possibleWinners.sort((a,b) => b.quality - a.quality);
            const top3 = possibleWinners.slice(0, 3);
            let winnerProj = top3.length > 0 ? top3[Math.floor(Math.random() * top3.length)] : null;

            let winnerName = "Unknown";
            let projName = "Untitled Project";

            if (winnerProj) {
                projName = winnerProj.title;
                usedNames.add(projName);

                if (isActor || isActress) winnerName = winnerProj.leadActorName || getFallbackAwardNominee(cat, winnerProj.id || winnerProj.title);
                else if (isDirector) winnerName = winnerProj.directorName || getFallbackAwardNominee(cat, winnerProj.id || winnerProj.title);
                else if (isMusicAward) winnerName = getNomineeNameForMusicCategory(winnerProj, cat, 'Music Team');
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
