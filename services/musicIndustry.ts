import artistCsv from './data/music_artists_database.csv?raw';
import {
    BudgetTier,
    Genre,
    MusicArtist,
    MusicArtistAvailability,
    MusicArtistFameTier,
    MusicArtistGender,
    MusicArtistScandalRisk,
    MusicArtistWorldState,
    MusicChartEntry,
    MusicCultureMomentRecord,
    MusicCultureMomentType,
    MusicCreditRole,
    MusicIndustryState,
    MusicReleaseKind,
    MusicReleaseRecord,
    MusicRivalryRecord,
    MusicScandalRecord,
    NewsItem,
    Player,
    ProjectDetails,
    ProjectMusicImpact,
    ProjectMusicPlan,
    ProjectMusicStrategy,
    ProjectSoundtrackRevenueBreakdown,
    WorldState
} from '../types';

const FAME_SCORE: Record<MusicArtistFameTier, number> = {
    EMERGING: 10,
    KNOWN: 24,
    STAR: 42,
    SUPERSTAR: 64,
    LEGEND: 78
};

const AVAILABILITY_SCORE: Record<MusicArtistAvailability, number> = {
    COMMON: 14,
    SELECTIVE: 6,
    RARE: -8
};

const SCANDAL_RISK_SCORE: Record<MusicArtistScandalRisk, number> = {
    LOW: 4,
    MEDIUM: 12,
    HIGH: 24
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

const GENRE_FIT_TAGS: Record<Genre, string[]> = {
    ACTION: ['action', 'festival', 'global', 'street'],
    DRAMA: ['drama', 'prestige', 'romance'],
    COMEDY: ['comedy', 'festival', 'family'],
    ROMANCE: ['romance', 'teen', 'global'],
    THRILLER: ['crime', 'horror', 'prestige'],
    MYSTERY: ['crime', 'prestige', 'horror'],
    HORROR: ['horror', 'teen', 'dark'],
    SCI_FI: ['fantasy', 'global', 'action'],
    ADVENTURE: ['action', 'family', 'global'],
    SUPERHERO: ['action', 'global', 'festival'],
    MUSICAL: ['family', 'romance', 'festival', 'global'],
    BIOPIC: ['prestige', 'drama', 'global'],
    SPORTS: ['festival', 'family', 'street'],
    ANIMATION: ['family', 'teen', 'global'],
    FANTASY: ['fantasy', 'family', 'global'],
    CRIME: ['crime', 'street', 'nightlife'],
    DOCUMENTARY: ['prestige', 'global']
};

const ROLE_LABELS: Record<MusicCreditRole, string> = {
    LEAD_SINGLE: 'Lead single',
    END_CREDIT_SONG: 'End-credit song',
    SOUNDTRACK_EP: 'Soundtrack EP',
    PROMO_ALBUM: 'Promo album',
    TRAILER_ANTHEM: 'Trailer anthem',
    MUSIC_VIDEO_TIE_IN: 'Music video'
};

const STRATEGY_LABELS: Record<ProjectMusicStrategy, string> = {
    COMPOSER_ONLY: 'Composer only',
    LEAD_SINGLE: 'Lead single',
    SOUNDTRACK_EP: 'Soundtrack EP',
    PROMO_ALBUM: 'Promo album',
    MUSIC_VIDEO_TIE_IN: 'Music video tie-in'
};

const GENDER_LABELS: Record<MusicArtistGender, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    GROUP: 'Group',
    UNKNOWN: 'Unknown'
};

const MALE_NAME_HINTS = new Set([
    'jasper', 'calvin', 'aubrey', 'abel', 'bruno', 'austin', 'kendrick', 'jason', 'eddie', 'harold',
    'samuel', 'andrew', 'christopher', 'daniel', 'alex', 'dave', 'james', 'corey', 'benito', 'jose',
    'hector', 'daljit', 'arjun', 'aditya', 'vivaan', 'arin', 'aman', 'pritham', 'nasir', 'damini',
    'ayodeji', 'ramon', 'adam', 'marshall', 'callum', 'martijn', 'davide', 'anton', 'lucas',
    'christopher', 'jonah', 'kamal', 'herbert', 'luca', 'jonas', 'hans', 'eneo', 'robert', 'marcus',
    'kevin'
]);

const FEMALE_NAME_HINTS = new Set([
    'belinda', 'talia', 'ariana', 'daria', 'olive', 'carlita', 'monica', 'bianca', 'rina', 'mila',
    'melissa', 'dorianne', 'megara', 'isla', 'lena', 'ella', 'jisoo', 'nari', 'mina', 'shara',
    'rosa', 'carolina', 'shreya', 'tamara', 'kassandra', 'dorothy', 'nora', 'joanna', 'flora'
]);

const GROUP_STAGE_HINTS = [
    'coldplayt',
    'imagine draggins',
    'arctic monkies',
    'foo fliers',
    'metal llama',
    'slipknotty',
    'btsky',
    'black pynk',
    'newjeanz',
    'twicey twice',
    'mumford suns'
];

const STAGE_GENDER_OVERRIDES: Record<string, MusicArtistGender> = {
    'drayk noon': 'MALE',
    'sam smither': 'MALE',
    'doja catnip': 'FEMALE',
    'bad bunno': 'MALE',
    'dolly partinova': 'FEMALE',
    'bob dylanova': 'MALE',
    'florence machinea': 'FEMALE'
};

const parseCsvRows = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];

        if (char === '"' && quoted && next === '"') {
            cell += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            quoted = !quoted;
            continue;
        }

        if (char === ',' && !quoted) {
            row.push(cell);
            cell = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') index += 1;
            row.push(cell);
            if (row.some(value => value.trim().length > 0)) rows.push(row);
            row = [];
            cell = '';
            continue;
        }

        cell += char;
    }

    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        if (row.some(value => value.trim().length > 0)) rows.push(row);
    }

    return rows;
};

const normalizeId = (id: string, name: string): string => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return `music_${id}_${slug}`;
};

const parseList = (value: string): string[] => value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const parseNumber = (value: string): number => {
    const numeric = Number(String(value || '').replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
};

const inferArtistGender = (stageName: string, realName: string, explicitGender = ''): MusicArtistGender => {
    const explicit = explicitGender.trim().toUpperCase();
    if (explicit === 'MALE' || explicit === 'FEMALE' || explicit === 'GROUP') return explicit;

    const normalizedStageName = stageName.trim().toLowerCase();
    if (STAGE_GENDER_OVERRIDES[normalizedStageName]) return STAGE_GENDER_OVERRIDES[normalizedStageName];
    if (GROUP_STAGE_HINTS.some(hint => normalizedStageName.includes(hint))) return 'GROUP';

    const firstName = realName.trim().split(/\s+/)[0]?.toLowerCase() || '';
    if (FEMALE_NAME_HINTS.has(firstName)) return 'FEMALE';
    if (MALE_NAME_HINTS.has(firstName)) return 'MALE';

    const firstStageToken = normalizedStageName.split(/\s+/)[0] || '';
    if (FEMALE_NAME_HINTS.has(firstStageToken)) return 'FEMALE';
    if (MALE_NAME_HINTS.has(firstStageToken)) return 'MALE';

    return 'UNKNOWN';
};

const parseArtists = (): MusicArtist[] => {
    const rows = parseCsvRows(artistCsv);
    const headers = rows.shift() || [];
    const headerIndex = new Map(headers.map((header, index) => [header, index]));
    const valueOf = (row: string[], key: string): string => row[headerIndex.get(key) ?? -1]?.trim() || '';

    return rows.map(row => {
        const stageName = valueOf(row, 'stage_name') || 'Unknown Artist';
        const realName = valueOf(row, 'real_name');
        return {
            id: normalizeId(valueOf(row, 'id') || stageName, stageName),
            stageName,
            realName,
            genre: valueOf(row, 'genre') || 'Pop',
            gender: inferArtistGender(stageName, realName, valueOf(row, 'gender')),
            subgenre: valueOf(row, 'subgenre') || valueOf(row, 'genre') || 'Pop',
            fameTier: (valueOf(row, 'fame_tier') || 'KNOWN') as MusicArtistFameTier,
            reputation: parseNumber(valueOf(row, 'reputation')),
            audience: valueOf(row, 'audience'),
            region: valueOf(row, 'region'),
            costLow: parseNumber(valueOf(row, 'cost_low')),
            costHigh: parseNumber(valueOf(row, 'cost_high')),
            socialFollowers: parseNumber(valueOf(row, 'social_followers')),
            soundtrackFitTags: parseList(valueOf(row, 'soundtrack_fit_tags')).map(tag => tag.toLowerCase()),
            strengths: parseList(valueOf(row, 'strengths')),
            risks: parseList(valueOf(row, 'risks')),
            scandalRisk: (valueOf(row, 'scandal_risk') || 'LOW') as MusicArtistScandalRisk,
            availability: (valueOf(row, 'availability') || 'COMMON') as MusicArtistAvailability,
            personality: valueOf(row, 'personality'),
            dealPreference: valueOf(row, 'deal_preference') || 'Flat fee'
        };
    });
};

export const MUSIC_ARTISTS: MusicArtist[] = parseArtists();

export const getMusicArtistCatalog = (world?: Pick<WorldState, 'musicIndustry'>): MusicArtist[] => {
    const generated = Array.isArray(world?.musicIndustry?.generatedArtists)
        ? world.musicIndustry.generatedArtists
        : [];
    return [...MUSIC_ARTISTS, ...generated]
        .filter((artist, index, catalog) => catalog.findIndex(entry => entry.id === artist.id) === index);
};

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const createRng = (seed: string) => {
    let state = hashString(seed) || 1;
    return () => {
        state = Math.imul(state ^ (state >>> 15), 1 | state);
        state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
        return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    };
};

const pickWithRng = <T,>(items: T[], rng: () => number): T => items[Math.floor(rng() * items.length) % items.length];

const estimateArtistCost = (artist: MusicArtist, tier: BudgetTier, rng: () => number): number => {
    const tierWeight = tier === 'LOW' ? 0.18 : tier === 'MID' ? 0.38 : tier === 'HIGH' ? 0.62 : 0.86;
    const variance = (rng() - 0.5) * 0.18;
    const weight = Math.max(0.05, Math.min(1, tierWeight + variance));
    return Math.round(artist.costLow + (artist.costHigh - artist.costLow) * weight);
};

export const estimateMusicArtistProjectCost = (artist: MusicArtist, project: ProjectDetails, seed = project.title): number => {
    const rng = createRng(`${seed}_${artist.id}_${project.genre}_${project.budgetTier}_cost`);
    return estimateArtistCost(artist, project.budgetTier, rng);
};

const getProjectTags = (project: ProjectDetails): string[] => {
    const tags = new Set<string>(GENRE_FIT_TAGS[project.genre] || ['global']);
    if (project.targetAudience === 'G' || project.targetAudience === 'PG') tags.add('family');
    if (project.targetAudience === 'PG-13') tags.add('teen');
    if (project.budgetTier === 'HIGH' || project.budgetTier === 'BLOCKBUSTER') {
        tags.add('global');
        tags.add('luxury');
    }
    if (project.releaseStrategy === 'STREAMING_ONLY') tags.add('teen');
    return Array.from(tags);
};

const getFitScore = (artist: MusicArtist, project: ProjectDetails): number => {
    const projectTags = getProjectTags(project);
    const tagHits = artist.soundtrackFitTags.filter(tag => projectTags.includes(tag)).length;
    const fameFitPenalty = project.budgetTier === 'LOW' && (artist.fameTier === 'SUPERSTAR' || artist.fameTier === 'LEGEND') ? 20 : 0;
    const blockbusterBonus = project.budgetTier === 'BLOCKBUSTER' && (artist.fameTier === 'SUPERSTAR' || artist.fameTier === 'LEGEND') ? 18 : 0;
    return (tagHits * 34)
        + FAME_SCORE[artist.fameTier]
        + (artist.reputation * 0.45)
        + Math.min(34, artist.socialFollowers / 4000000)
        + AVAILABILITY_SCORE[artist.availability]
        + blockbusterBonus
        - fameFitPenalty
        - SCANDAL_RISK_SCORE[artist.scandalRisk] * 0.35;
};

export const getMusicArtistById = (artistId?: string, catalog: MusicArtist[] = MUSIC_ARTISTS): MusicArtist | undefined => {
    if (!artistId) return undefined;
    return catalog.find(artist => artist.id === artistId);
};

export const getRecommendedMusicArtistsForProject = (project: ProjectDetails, limit = 8, catalog: MusicArtist[] = MUSIC_ARTISTS): MusicArtist[] => {
    return [...catalog]
        .sort((left, right) => getFitScore(right, project) - getFitScore(left, project))
        .slice(0, limit);
};

const getCreditRoles = (project: ProjectDetails, count: number): MusicCreditRole[] => {
    if (project.genre === 'MUSICAL') return (['LEAD_SINGLE', 'SOUNDTRACK_EP', 'PROMO_ALBUM'] as MusicCreditRole[]).slice(0, count);
    if (project.budgetTier === 'BLOCKBUSTER') return (['LEAD_SINGLE', 'TRAILER_ANTHEM', 'MUSIC_VIDEO_TIE_IN'] as MusicCreditRole[]).slice(0, count);
    if (project.genre === 'ACTION' || project.genre === 'SUPERHERO') return (['TRAILER_ANTHEM', 'LEAD_SINGLE'] as MusicCreditRole[]).slice(0, count);
    if (project.genre === 'ROMANCE' || project.genre === 'DRAMA') return (['LEAD_SINGLE', 'END_CREDIT_SONG'] as MusicCreditRole[]).slice(0, count);
    if (project.genre === 'CRIME' || project.genre === 'HORROR') return (['END_CREDIT_SONG', 'TRAILER_ANTHEM'] as MusicCreditRole[]).slice(0, count);
    return (['END_CREDIT_SONG', 'LEAD_SINGLE'] as MusicCreditRole[]).slice(0, count);
};

const clampMusicArtistCount = (count: number, min: number, max: number): number => (
    Math.min(max, Math.max(min, Math.round(Number.isFinite(count) ? count : min)))
);

export const getMusicArtistCountBounds = (strategy: ProjectMusicStrategy): { min: number; max: number } => {
    if (strategy === 'COMPOSER_ONLY') return { min: 0, max: 0 };
    if (strategy === 'LEAD_SINGLE') return { min: 1, max: 4 };
    if (strategy === 'SOUNDTRACK_EP') return { min: 2, max: 5 };
    if (strategy === 'MUSIC_VIDEO_TIE_IN') return { min: 1, max: 5 };
    return { min: 3, max: 6 };
};

export const getDefaultMusicArtistCount = (strategy: ProjectMusicStrategy, project?: ProjectDetails): number => {
    const bounds = getMusicArtistCountBounds(strategy);
    if (bounds.max === 0) return 0;

    let count = strategy === 'LEAD_SINGLE'
        ? 1
        : strategy === 'SOUNDTRACK_EP'
            ? 2
            : strategy === 'MUSIC_VIDEO_TIE_IN'
                ? 2
                : 4;

    if (project?.genre === 'MUSICAL' && strategy !== 'LEAD_SINGLE') count += 1;
    if (project?.budgetTier === 'BLOCKBUSTER' && strategy !== 'LEAD_SINGLE') count += 1;
    return clampMusicArtistCount(count, bounds.min, bounds.max);
};

const uniqueRoles = (roles: MusicCreditRole[]): MusicCreditRole[] => {
    const seen = new Set<MusicCreditRole>();
    return roles.filter(role => {
        if (seen.has(role)) return false;
        seen.add(role);
        return true;
    });
};

const normalizeSelectedCreditRoles = (roles?: MusicCreditRole[]): MusicCreditRole[] => {
    const allowedRoles = new Set<MusicCreditRole>([
        'LEAD_SINGLE',
        'END_CREDIT_SONG',
        'SOUNDTRACK_EP',
        'PROMO_ALBUM',
        'TRAILER_ANTHEM',
        'MUSIC_VIDEO_TIE_IN'
    ]);
    return uniqueRoles((roles || []).filter(role => allowedRoles.has(role)));
};

export const getMusicStrategyCreditRoles = (strategy: ProjectMusicStrategy, project?: ProjectDetails, artistCount?: number): MusicCreditRole[] => {
    if (strategy === 'COMPOSER_ONLY') return [];
    const bounds = getMusicArtistCountBounds(strategy);
    const count = clampMusicArtistCount(
        artistCount ?? getDefaultMusicArtistCount(strategy, project),
        bounds.min,
        bounds.max
    );
    const actionLeadRole: MusicCreditRole = (project?.genre === 'ACTION' || project?.genre === 'SUPERHERO') ? 'TRAILER_ANTHEM' : 'LEAD_SINGLE';
    const musicalFirstRoles: MusicCreditRole[] = project?.genre === 'MUSICAL'
        ? ['LEAD_SINGLE', 'SOUNDTRACK_EP', 'PROMO_ALBUM', 'MUSIC_VIDEO_TIE_IN', 'END_CREDIT_SONG', 'TRAILER_ANTHEM']
        : [];
    const strategyRoles: Record<Exclude<ProjectMusicStrategy, 'COMPOSER_ONLY'>, MusicCreditRole[]> = {
        LEAD_SINGLE: [actionLeadRole, 'LEAD_SINGLE', 'END_CREDIT_SONG', 'MUSIC_VIDEO_TIE_IN', 'SOUNDTRACK_EP', 'PROMO_ALBUM'],
        SOUNDTRACK_EP: ['LEAD_SINGLE', 'SOUNDTRACK_EP', 'END_CREDIT_SONG', 'TRAILER_ANTHEM', 'MUSIC_VIDEO_TIE_IN', 'PROMO_ALBUM'],
        MUSIC_VIDEO_TIE_IN: ['LEAD_SINGLE', 'MUSIC_VIDEO_TIE_IN', 'TRAILER_ANTHEM', 'END_CREDIT_SONG', 'SOUNDTRACK_EP', 'PROMO_ALBUM'],
        PROMO_ALBUM: ['LEAD_SINGLE', 'MUSIC_VIDEO_TIE_IN', 'PROMO_ALBUM', 'SOUNDTRACK_EP', 'TRAILER_ANTHEM', 'END_CREDIT_SONG']
    };
    const roles = uniqueRoles([
        ...musicalFirstRoles,
        ...strategyRoles[strategy],
        'LEAD_SINGLE',
        'END_CREDIT_SONG',
        'SOUNDTRACK_EP',
        'PROMO_ALBUM',
        'TRAILER_ANTHEM',
        'MUSIC_VIDEO_TIE_IN'
    ]);
    return roles.slice(0, count);
};

export const getMusicStrategyCreditCount = (strategy: ProjectMusicStrategy, project?: ProjectDetails, artistCount?: number): number => {
    return getMusicStrategyCreditRoles(strategy, project, artistCount).length;
};

const getStrategyForRoles = (roles: MusicCreditRole[]): ProjectMusicStrategy => {
    if (roles.includes('PROMO_ALBUM')) return 'PROMO_ALBUM';
    if (roles.includes('SOUNDTRACK_EP')) return 'SOUNDTRACK_EP';
    if (roles.includes('MUSIC_VIDEO_TIE_IN')) return 'MUSIC_VIDEO_TIE_IN';
    if (roles.includes('LEAD_SINGLE')) return 'LEAD_SINGLE';
    return 'COMPOSER_ONLY';
};

const buildSongTitle = (project: ProjectDetails, artist: MusicArtist, role: MusicCreditRole, rng: () => number): string => {
    const hooks = ['Last Scene', 'City Lights', 'No Looking Back', 'First Light', 'Gold Frame', 'After Midnight', 'Run It Back', 'Hearts on Fire', 'Final Take', 'Echo Season'];
    const hook = pickWithRng(hooks, rng);
    if (role === 'TRAILER_ANTHEM') return `${hook} Trailer Mix`;
    if (role === 'END_CREDIT_SONG') return `${project.title}: ${hook}`;
    if (role === 'PROMO_ALBUM') return `${project.title} Sessions`;
    if (role === 'SOUNDTRACK_EP') return `${project.title} EP`;
    if (role === 'MUSIC_VIDEO_TIE_IN') return `${hook} (${project.title} Cut)`;
    return `${hook} from ${project.title}`;
};

export const buildAutomaticProjectMusicPlan = (project: ProjectDetails, seed = project.title): ProjectMusicPlan => {
    const rng = createRng(`${seed}_${project.genre}_${project.budgetTier}_${project.studioId}`);
    const creditCount = project.genre === 'MUSICAL'
        ? 3
        : project.budgetTier === 'BLOCKBUSTER'
            ? 2 + Math.floor(rng() * 2)
            : project.budgetTier === 'HIGH'
                ? 2
                : 1;
    const roles = getCreditRoles(project, creditCount);
    const recommendations = getRecommendedMusicArtistsForProject(project, Math.max(12, creditCount * 4));
    const chosenArtists: MusicArtist[] = [];

    while (chosenArtists.length < roles.length && recommendations.length > 0) {
        const sliceSize = Math.min(recommendations.length, 5 + chosenArtists.length);
        const artist = pickWithRng(recommendations.slice(0, sliceSize), rng);
        if (!chosenArtists.some(existing => existing.id === artist.id)) chosenArtists.push(artist);
        recommendations.splice(recommendations.findIndex(candidate => candidate.id === artist.id), 1);
    }

    const credits = chosenArtists.map((artist, index) => {
        const role = roles[index] || 'END_CREDIT_SONG';
        const estimatedCost = estimateArtistCost(artist, project.budgetTier, rng);
        const fitScore = getFitScore(artist, project);
        return {
            artistId: artist.id,
            artistName: artist.stageName,
            genre: artist.subgenre || artist.genre,
            role,
            songTitle: buildSongTitle(project, artist, role, rng),
            dealType: artist.dealPreference,
            estimatedCost,
            buzz: Math.max(3, Math.round(fitScore / 9)),
            risk: SCANDAL_RISK_SCORE[artist.scandalRisk] + (artist.availability === 'RARE' ? 6 : 0)
        };
    });

    const musicBudget = credits.reduce((sum, credit) => sum + credit.estimatedCost, 0);
    const musicBuzz = credits.reduce((sum, credit) => sum + credit.buzz, 0);
    const musicRisk = Math.round(credits.reduce((sum, credit) => sum + credit.risk, 0) / Math.max(1, credits.length));

    return {
        strategy: getStrategyForRoles(roles),
        artistTargetCount: credits.length,
        selectedCreditRoles: roles,
        credits,
        musicBudget,
        musicBuzz,
        musicRisk,
        soundtrackTitle: credits.length > 1 ? `${project.title}: Original Soundtrack` : undefined
    };
};

export const buildProjectMusicPlanFromArtists = (
    project: ProjectDetails,
    strategy: ProjectMusicStrategy,
    artistIds: string[],
    seed = project.title,
    artistTargetCount?: number,
    selectedCreditRoles?: MusicCreditRole[],
    fillMissingArtists = true,
    artistCatalog: MusicArtist[] = MUSIC_ARTISTS
): ProjectMusicPlan => {
    const customRoles = normalizeSelectedCreditRoles(selectedCreditRoles);
    const roles = customRoles.length ? customRoles : getMusicStrategyCreditRoles(strategy, project, artistTargetCount);
    if (roles.length === 0) {
        return {
            strategy: 'COMPOSER_ONLY',
            artistTargetCount: 0,
            selectedCreditRoles: [],
            credits: [],
            musicBudget: 0,
            musicBuzz: 0,
            musicRisk: 0
        };
    }

    const rng = createRng(`${seed}_${strategy}_${roles.length}_${project.genre}_${project.budgetTier}`);
    const recommended = getRecommendedMusicArtistsForProject(project, Math.max(12, roles.length * 4), artistCatalog);
    const artistsByRole: (MusicArtist | undefined)[] = roles.map(() => undefined);

    artistIds.slice(0, roles.length).forEach((artistId, index) => {
        const artist = getMusicArtistById(artistId, artistCatalog);
        if (artist) artistsByRole[index] = artist;
    });

    if (fillMissingArtists) {
        recommended.forEach(artist => {
            const openIndex = artistsByRole.findIndex(item => !item);
            if (openIndex < 0) return;
            if (!artistsByRole.some(existing => existing?.id === artist.id)) artistsByRole[openIndex] = artist;
        });
    }

    const credits = artistsByRole.flatMap((artist, index) => {
        if (!artist) return [];
        const role = roles[index] || 'END_CREDIT_SONG';
        const estimatedCost = estimateArtistCost(artist, project.budgetTier, rng);
        const fitScore = getFitScore(artist, project);
        return [{
            artistId: artist.id,
            artistName: artist.stageName,
            genre: artist.subgenre || artist.genre,
            role,
            songTitle: buildSongTitle(project, artist, role, rng),
            dealType: artist.dealPreference,
            estimatedCost,
            buzz: Math.max(3, Math.round(fitScore / 9)),
            risk: SCANDAL_RISK_SCORE[artist.scandalRisk] + (artist.availability === 'RARE' ? 6 : 0)
        }];
    });

    const musicBudget = credits.reduce((sum, credit) => sum + credit.estimatedCost, 0);
    const musicBuzz = credits.reduce((sum, credit) => sum + credit.buzz, 0);
    const musicRisk = Math.round(credits.reduce((sum, credit) => sum + credit.risk, 0) / Math.max(1, credits.length));

    return {
        strategy,
        artistTargetCount: roles.length,
        selectedCreditRoles: roles,
        credits,
        musicBudget,
        musicBuzz,
        musicRisk,
        soundtrackTitle: credits.length > 1 ? `${project.title}: Original Soundtrack` : undefined
    };
};

export const withAutomaticMusicPlan = (project: ProjectDetails): ProjectDetails => {
    if (project.musicPlan?.credits?.length) return project;
    return {
        ...project,
        musicPlan: buildAutomaticProjectMusicPlan(project)
    };
};

export const getProjectMusicPlan = (project?: ProjectDetails): ProjectMusicPlan | undefined => {
    if (!project) return undefined;
    return project.musicPlan?.credits?.length ? project.musicPlan : buildAutomaticProjectMusicPlan(project);
};

export const getMusicCreditRoleLabel = (role: MusicCreditRole): string => ROLE_LABELS[role] || role.replace(/_/g, ' ').toLowerCase();

export const getMusicStrategyLabel = (strategy?: ProjectMusicStrategy): string => strategy ? STRATEGY_LABELS[strategy] : 'Soundtrack';

export const getMusicArtistGenderLabel = (gender?: MusicArtistGender): string => GENDER_LABELS[gender || 'UNKNOWN'];

export const formatProjectMusicByline = (project?: ProjectDetails, maxArtists = 3): string => {
    const plan = getProjectMusicPlan(project);
    const names = plan?.credits?.map(credit => credit.artistName).filter(Boolean) || [];
    if (!names.length) return '';
    if (names.length <= maxArtists) return names.join(', ');
    return `${names.slice(0, maxArtists).join(', ')} +${names.length - maxArtists}`;
};

export const formatProjectMusicSummary = (project?: ProjectDetails): string => {
    const plan = getProjectMusicPlan(project);
    if (!plan?.credits?.length) return '';
    const lead = plan.credits[0];
    const extra = plan.credits.length > 1 ? ` +${plan.credits.length - 1} more` : '';
    return `${getMusicStrategyLabel(plan.strategy)}: ${lead.artistName}${extra}`;
};

const ROLE_IMPACT_WEIGHTS: Record<MusicCreditRole, { opening: number; social: number; trailer: number; awards: number; reach: number }> = {
    LEAD_SINGLE: { opening: 1.1, social: 1.05, trailer: 0.65, awards: 0.65, reach: 1 },
    END_CREDIT_SONG: { opening: 0.35, social: 0.42, trailer: 0.25, awards: 1.05, reach: 0.55 },
    SOUNDTRACK_EP: { opening: 0.72, social: 1.1, trailer: 0.42, awards: 0.82, reach: 0.85 },
    PROMO_ALBUM: { opening: 0.92, social: 1.25, trailer: 0.55, awards: 0.72, reach: 1.05 },
    TRAILER_ANTHEM: { opening: 1.22, social: 0.8, trailer: 1.35, awards: 0.38, reach: 0.85 },
    MUSIC_VIDEO_TIE_IN: { opening: 0.86, social: 1.2, trailer: 0.8, awards: 0.45, reach: 0.95 }
};

const getMusicImpactEmpty = (): ProjectMusicImpact => ({
    openingWeekendLiftPct: 0,
    audienceReachLiftPct: 0,
    socialHypeLift: 0,
    trailerStrengthLift: 0,
    controversyRisk: 0,
    mismatchBacklashRisk: 0,
    awardChanceLift: 0,
    streamingInterestLiftPct: 0,
    score: 0,
    label: 'Composer score only',
    headline: 'Composer score supports the movie without named-artist campaign lift.',
    strengths: [],
    warnings: []
});

export const calculateProjectMusicImpact = (
    project?: ProjectDetails,
    plan: ProjectMusicPlan | undefined = project ? getProjectMusicPlan(project) : undefined,
    catalog: MusicArtist[] = MUSIC_ARTISTS
): ProjectMusicImpact => {
    if (!project || !plan?.credits?.length) return getMusicImpactEmpty();

    const projectTags = getProjectTags(project);
    const creditCount = plan.credits.length;
    const artistRows = plan.credits.map(credit => {
        const artist = getMusicArtistById(credit.artistId, catalog);
        const fit = artist ? clamp(getFitScore(artist, project), 0, 140) : clamp((credit.buzz || 0) * 8, 20, 105);
        const tags = artist?.soundtrackFitTags || [];
        const tagHits = tags.filter(tag => projectTags.includes(tag)).length;
        const roleWeight = ROLE_IMPACT_WEIGHTS[credit.role] || ROLE_IMPACT_WEIGHTS.END_CREDIT_SONG;
        const followers = artist?.socialFollowers || 0;
        const scandal = artist ? SCANDAL_RISK_SCORE[artist.scandalRisk] : Math.max(0, credit.risk || 0);
        return { artist, credit, fit, tagHits, roleWeight, followers, scandal };
    });

    const avgFit = artistRows.reduce((sum, row) => sum + row.fit, 0) / Math.max(1, creditCount);
    const totalFollowers = artistRows.reduce((sum, row) => sum + row.followers, 0);
    const followerPower = clamp(Math.log10(1 + totalFollowers) * 9, 0, 72);
    const totalBuzz = clamp(plan.musicBuzz || 0, 0, 160);
    const roleOpening = artistRows.reduce((sum, row) => sum + row.roleWeight.opening, 0);
    const roleSocial = artistRows.reduce((sum, row) => sum + row.roleWeight.social, 0);
    const roleTrailer = artistRows.reduce((sum, row) => sum + row.roleWeight.trailer, 0);
    const roleAwards = artistRows.reduce((sum, row) => sum + row.roleWeight.awards, 0);
    const roleReach = artistRows.reduce((sum, row) => sum + row.roleWeight.reach, 0);
    const fitBonus = (avgFit - 58) / 9;
    const tagMisses = artistRows.filter(row => row.tagHits === 0).length;
    const mismatchBacklashRisk = Math.round(clamp((58 - avgFit) * 0.75 + tagMisses * 9 + (plan.musicRisk || 0) * 0.1, 0, 72));
    const controversyRisk = Math.round(clamp((plan.musicRisk || 0) * 1.15 + artistRows.reduce((sum, row) => sum + row.scandal, 0) / Math.max(1, creditCount) * 0.4, 0, 88));

    const openingWeekendLiftPct = Math.round(clamp(
        (totalBuzz * 0.08) + (followerPower * 0.08) + (roleOpening * 1.6) + fitBonus - (mismatchBacklashRisk * 0.08) - (controversyRisk * 0.03),
        -8,
        24
    ));
    const audienceReachLiftPct = Math.round(clamp(
        (totalBuzz * 0.05) + (followerPower * 0.07) + (roleReach * 1.3) + Math.max(0, fitBonus * 0.6) - (mismatchBacklashRisk * 0.04),
        0,
        21
    ));
    const socialHypeLift = Math.round(clamp(
        (totalBuzz * 0.18) + (followerPower * 0.12) + (roleSocial * 1.8) - (mismatchBacklashRisk * 0.04),
        0,
        34
    ));
    const trailerStrengthLift = Math.round(clamp(
        (totalBuzz * 0.06) + (roleTrailer * 3.4) + Math.max(0, fitBonus * 0.8) - (mismatchBacklashRisk * 0.05),
        0,
        22
    ));
    const awardChanceLift = Math.round(clamp(
        (avgFit - 48) * 0.09 + roleAwards * 1.5 + (project.genre === 'MUSICAL' ? 5 : 0) + (project.genre === 'BIOPIC' || project.genre === 'DRAMA' ? 2 : 0) - controversyRisk * 0.04,
        0,
        16
    ));
    const streamingInterestLiftPct = Math.round(clamp((audienceReachLiftPct * 0.62) + (socialHypeLift * 0.24) + (trailerStrengthLift * 0.18), 0, 24));
    const score = Math.round(clamp(
        42 + openingWeekendLiftPct * 1.4 + audienceReachLiftPct + socialHypeLift * 0.9 + trailerStrengthLift * 0.7 + awardChanceLift * 0.8 - mismatchBacklashRisk * 0.38 - controversyRisk * 0.18,
        0,
        100
    ));

    const strengths = [
        openingWeekendLiftPct >= 8 ? 'Opening weekend lift' : '',
        audienceReachLiftPct >= 8 ? 'Broader audience reach' : '',
        trailerStrengthLift >= 8 ? 'Stronger trailer hook' : '',
        socialHypeLift >= 12 ? 'Social campaign heat' : '',
        awardChanceLift >= 6 ? 'Original song awards push' : ''
    ].filter(Boolean);
    const warnings = [
        mismatchBacklashRisk >= 38 ? 'Genre mismatch backlash risk' : '',
        controversyRisk >= 36 ? 'Artist controversy can spill into campaign' : '',
        openingWeekendLiftPct < 0 ? 'Music package may weaken positioning' : ''
    ].filter(Boolean);
    const lead = plan.credits[0];
    const label = score >= 76 ? 'Culture moment' : score >= 58 ? 'Strong music push' : score >= 38 ? 'Useful soundtrack' : 'Risky fit';
    const headline = lead
        ? `${getMusicCreditRoleLabel(lead.role)} by ${lead.artistName} adds ${openingWeekendLiftPct >= 0 ? '+' : ''}${openingWeekendLiftPct}% opening signal.`
        : getMusicImpactEmpty().headline;

    return {
        openingWeekendLiftPct,
        audienceReachLiftPct,
        socialHypeLift,
        trailerStrengthLift,
        controversyRisk,
        mismatchBacklashRisk,
        awardChanceLift,
        streamingInterestLiftPct,
        score,
        label,
        headline,
        strengths,
        warnings
    };
};

export const applyMusicImpactToHiddenStats = (
    hiddenStats: ProjectDetails['hiddenStats'],
    impact: ProjectMusicImpact,
    plan?: ProjectMusicPlan
): ProjectDetails['hiddenStats'] => ({
    ...hiddenStats,
    musicBuzz: plan?.musicBuzz || hiddenStats.musicBuzz || 0,
    musicRisk: plan?.musicRisk || hiddenStats.musicRisk || 0,
    musicBudget: plan?.musicBudget || hiddenStats.musicBudget || 0,
    musicOpeningLiftPct: impact.openingWeekendLiftPct,
    musicAudienceReachLiftPct: impact.audienceReachLiftPct,
    musicSocialHypeLift: impact.socialHypeLift,
    musicTrailerStrengthLift: impact.trailerStrengthLift,
    musicControversyRisk: impact.controversyRisk,
    musicMismatchBacklashRisk: impact.mismatchBacklashRisk,
    musicAwardChanceLift: impact.awardChanceLift,
    musicStreamingInterestLiftPct: impact.streamingInterestLiftPct,
    musicImpactLabel: impact.label
});

export const emptySoundtrackRevenueBreakdown = (): ProjectSoundtrackRevenueBreakdown => ({
    albumRevenue: 0,
    leadSingleRevenue: 0,
    musicVideoRevenue: 0,
    streamingBuzzRevenue: 0,
    viralSongRevenue: 0,
    totalRevenue: 0
});

export const mergeSoundtrackRevenueBreakdowns = (
    current?: Partial<ProjectSoundtrackRevenueBreakdown>,
    next?: Partial<ProjectSoundtrackRevenueBreakdown>
): ProjectSoundtrackRevenueBreakdown => {
    const base = emptySoundtrackRevenueBreakdown();
    const merged = {
        albumRevenue: Math.max(0, Math.round((current?.albumRevenue || 0) + (next?.albumRevenue || 0))),
        leadSingleRevenue: Math.max(0, Math.round((current?.leadSingleRevenue || 0) + (next?.leadSingleRevenue || 0))),
        musicVideoRevenue: Math.max(0, Math.round((current?.musicVideoRevenue || 0) + (next?.musicVideoRevenue || 0))),
        streamingBuzzRevenue: Math.max(0, Math.round((current?.streamingBuzzRevenue || 0) + (next?.streamingBuzzRevenue || 0))),
        viralSongRevenue: Math.max(0, Math.round((current?.viralSongRevenue || 0) + (next?.viralSongRevenue || 0))),
        totalRevenue: 0
    };
    merged.totalRevenue = merged.albumRevenue
        + merged.leadSingleRevenue
        + merged.musicVideoRevenue
        + merged.streamingBuzzRevenue
        + merged.viralSongRevenue;
    return { ...base, ...merged };
};

export const normalizeSoundtrackRevenueBreakdown = (value?: Partial<ProjectSoundtrackRevenueBreakdown>): ProjectSoundtrackRevenueBreakdown => (
    mergeSoundtrackRevenueBreakdowns(undefined, value)
);

export const calculateWeeklySoundtrackRevenue = (
    project?: ProjectDetails,
    options: {
        week: number;
        theatricalGross?: number;
        streamingViews?: number;
        seed?: string;
        catalog?: MusicArtist[];
    } = { week: 1 }
): ProjectSoundtrackRevenueBreakdown => {
    const plan = getProjectMusicPlan(project);
    if (!project || !plan?.credits?.length) return emptySoundtrackRevenueBreakdown();

    const impact = calculateProjectMusicImpact(project, plan, options.catalog || MUSIC_ARTISTS);
    const credits = plan.credits;
    const hasAlbum = credits.some(credit => credit.role === 'SOUNDTRACK_EP' || credit.role === 'PROMO_ALBUM');
    const hasLeadSingle = credits.some(credit => credit.role === 'LEAD_SINGLE' || credit.role === 'END_CREDIT_SONG' || credit.role === 'TRAILER_ANTHEM');
    const hasMusicVideo = credits.some(credit => credit.role === 'MUSIC_VIDEO_TIE_IN');
    const week = Math.max(1, Math.round(options.week || 1));
    const budget = Math.max(1_000_000, Number(project.estimatedBudget || 0) || 1_000_000);
    const musicBudget = Math.max(0, Number(plan.musicBudget || 0));
    const theatricalSignal = options.theatricalGross
        ? clamp(Number(options.theatricalGross || 0) / Math.max(1, budget * 0.28), 0.18, 2.4)
        : 0.45;
    const streamingSignal = options.streamingViews
        ? clamp(Number(options.streamingViews || 0) / 3_000_000, 0.12, 2.1)
        : 0;
    const marketSignal = Math.max(theatricalSignal, streamingSignal);
    const decay = Math.max(0.08, Math.exp(-(week - 1) * 0.28));
    const streamingDecay = Math.max(0.16, Math.exp(-(week - 1) * 0.18));
    const fitMultiplier = clamp(
        1 + (impact.socialHypeLift / 120) + (impact.audienceReachLiftPct / 130) + (impact.trailerStrengthLift / 180) - (impact.mismatchBacklashRisk / 260),
        0.52,
        1.95
    );
    const studioRightsShare = clamp(
        0.18
        + (hasAlbum ? 0.05 : 0)
        + (hasMusicVideo ? 0.03 : 0)
        + (plan.strategy === 'PROMO_ALBUM' ? 0.04 : 0)
        - (credits.length >= 5 ? 0.04 : 0),
        0.14,
        0.34
    );
    const cappedMusicInvestment = Math.min(musicBudget, budget * 0.12);
    const musicMarketBase = Math.max(
        8_000,
        (budget * 0.00032)
        + (cappedMusicInvestment * 0.022)
        + (plan.musicBuzz * 3_500)
    );
    const albumRoleCount = credits.filter(credit => credit.role === 'SOUNDTRACK_EP' || credit.role === 'PROMO_ALBUM').length;
    const leadRoleCount = credits.filter(credit => credit.role === 'LEAD_SINGLE' || credit.role === 'END_CREDIT_SONG' || credit.role === 'TRAILER_ANTHEM').length;
    const videoRoleCount = credits.filter(credit => credit.role === 'MUSIC_VIDEO_TIE_IN').length;

    const leadSingleGross = hasLeadSingle
        ? musicMarketBase * (0.36 + leadRoleCount * 0.14) * decay * fitMultiplier * (0.7 + marketSignal * 0.26)
        : 0;
    const albumGross = hasAlbum
        ? musicMarketBase * (0.44 + albumRoleCount * 0.2 + credits.length * 0.04) * decay * fitMultiplier * (0.64 + impact.audienceReachLiftPct / 110)
        : 0;
    const musicVideoGross = hasMusicVideo
        ? musicMarketBase * (0.24 + videoRoleCount * 0.16) * decay * fitMultiplier * (0.72 + impact.trailerStrengthLift / 90 + impact.socialHypeLift / 160)
        : 0;
    const streamingBuzzGross = musicMarketBase * 0.18 * streamingDecay * fitMultiplier * (0.4 + streamingSignal * 0.32 + impact.streamingInterestLiftPct / 130);
    const viralSongGross = impact.score >= 62 || impact.socialHypeLift >= 18
        ? musicMarketBase * clamp((impact.score - 54) / 140, 0, 0.54) * decay * (0.66 + marketSignal * 0.18)
        : 0;
    const uncappedStudioGross = (leadSingleGross + albumGross + musicVideoGross + streamingBuzzGross + viralSongGross) * studioRightsShare;
    const weeklyStudioCap = budget * clamp(
        0.004
        + (credits.length * 0.0011)
        + (impact.score / 18_000)
        + (marketSignal * 0.0012),
        0.006,
        0.022
    ) * Math.max(0.24, decay);
    const scale = uncappedStudioGross > weeklyStudioCap && uncappedStudioGross > 0
        ? weeklyStudioCap / uncappedStudioGross
        : 1;

    return normalizeSoundtrackRevenueBreakdown({
        albumRevenue: albumGross * studioRightsShare * scale,
        leadSingleRevenue: leadSingleGross * studioRightsShare * scale,
        musicVideoRevenue: musicVideoGross * studioRightsShare * scale,
        streamingBuzzRevenue: streamingBuzzGross * studioRightsShare * scale,
        viralSongRevenue: viralSongGross * studioRightsShare * scale
    });
};

const buildInitialArtistWorld = (): Record<string, MusicArtistWorldState> => {
    return MUSIC_ARTISTS
        .map(artist => ({
            artist,
            score: FAME_SCORE[artist.fameTier] + artist.reputation + Math.min(35, artist.socialFollowers / 5000000)
        }))
        .sort((left, right) => right.score - left.score)
        .reduce<Record<string, MusicArtistWorldState>>((state, entry, index) => {
            state[entry.artist.id] = {
                artistId: entry.artist.id,
                artistName: entry.artist.stageName,
                genre: entry.artist.genre,
                rank: index + 1,
                momentum: Math.round(entry.score),
                followers: entry.artist.socialFollowers
            };
            return state;
        }, {});
};

export const ensureMusicIndustryState = (world: WorldState): MusicIndustryState => {
    const existing = world.musicIndustry;
    const artists = existing?.artists && typeof existing.artists === 'object'
        ? { ...existing.artists }
        : buildInitialArtistWorld();

    MUSIC_ARTISTS.forEach(artist => {
        if (!artists[artist.id]) {
            artists[artist.id] = {
                artistId: artist.id,
                artistName: artist.stageName,
                genre: artist.genre,
                rank: Object.keys(artists).length + 1,
                momentum: FAME_SCORE[artist.fameTier] + artist.reputation,
                followers: artist.socialFollowers
            };
        }
    });

    const generatedArtists = Array.isArray(existing?.generatedArtists) ? existing.generatedArtists : [];
    generatedArtists.forEach(artist => {
        if (!artists[artist.id]) {
            artists[artist.id] = {
                artistId: artist.id,
                artistName: artist.stageName,
                genre: artist.genre,
                rank: Object.keys(artists).length + 1,
                momentum: FAME_SCORE[artist.fameTier] + artist.reputation,
                followers: artist.socialFollowers
            };
        }
    });

    return {
        artists,
        generatedArtists,
        chart: Array.isArray(existing?.chart) ? existing.chart : [],
        recentReleases: Array.isArray(existing?.recentReleases) ? existing.recentReleases.slice(0, 40) : [],
        rivalries: Array.isArray(existing?.rivalries) ? existing.rivalries.slice(0, 24) : [],
        scandals: Array.isArray(existing?.scandals) ? existing.scandals.slice(0, 24) : [],
        cultureMoments: Array.isArray(existing?.cultureMoments) ? existing.cultureMoments.slice(0, 30) : [],
        lastProcessedWeek: existing?.lastProcessedWeek,
        history: Array.isArray(existing?.history) ? existing.history.slice(0, 40) : []
    };
};

const getAbsoluteWeek = (player: Player): number => player.age * 52 + player.currentWeek;

const createReleaseTitle = (artist: MusicArtist, rng: () => number): string => {
    const nouns = ['Spotlight', 'No Sleep', 'Velvet Room', 'Blue Flash', 'Crown Talk', 'Late Call', 'Neon Prayer', 'Wild Roses', 'Red Carpet', 'Golden Hour'];
    const suffixes = ['Single', 'Video', 'Live Cut', 'Premiere', 'Remix'];
    return `${pickWithRng(nouns, rng)} ${pickWithRng(suffixes, rng)}`;
};

const getChartRankMap = (chart: MusicChartEntry[]): Map<string, number> => {
    const ranks = new Map<string, number>();
    chart.forEach((entry, index) => {
        if (!ranks.has(entry.artistId)) ranks.set(entry.artistId, entry.currentRank || index + 1);
    });
    return ranks;
};

const getReleaseKind = (artist: MusicArtist, rng: () => number): MusicReleaseKind => {
    const roll = rng();
    if (roll > 0.94 && (artist.fameTier === 'SUPERSTAR' || artist.fameTier === 'LEGEND')) return 'ALBUM';
    if (roll > 0.84 && artist.fameTier !== 'EMERGING') return 'EP';
    if (roll > 0.67) return 'VIDEO';
    if (roll > 0.52) return 'REMIX';
    return 'SINGLE';
};

const releaseKindLabel = (kind: MusicReleaseKind): string => {
    if (kind === 'ALBUM') return 'promo album';
    if (kind === 'EP') return 'soundtrack-style EP';
    if (kind === 'VIDEO') return 'music video';
    if (kind === 'REMIX') return 'remix';
    return 'single';
};

const estimateYoutubeViews = (artist: MusicArtist, score: number, rng: () => number): number => {
    const fameMultiplier = artist.fameTier === 'LEGEND'
        ? 8.5
        : artist.fameTier === 'SUPERSTAR'
            ? 6.2
            : artist.fameTier === 'STAR'
                ? 3.4
                : artist.fameTier === 'KNOWN'
                    ? 1.35
                    : 0.34;
    const base = artist.socialFollowers * (0.02 + rng() * 0.1);
    const scoreLift = score * score * 850 * fameMultiplier;
    return Math.max(8_000, Math.round(base + scoreLift));
};

const buildReleaseRecord = (
    artist: MusicArtist,
    songTitle: string,
    kind: MusicReleaseKind,
    score: number,
    week: number,
    year: number,
    absoluteWeek: number,
    previousRank: number | undefined,
    followerGain: number,
    youtubeViews: number,
    currentFollowers: number
): MusicReleaseRecord => ({
    id: `music_release_record_${absoluteWeek}_${artist.id}_${songTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    artistId: artist.id,
    artistName: artist.stageName,
    songTitle,
    genre: artist.genre,
    kind,
    score,
    week,
    year,
    previousRank,
    followerGain,
    socialGrowthPct: Math.round((followerGain / Math.max(1, currentFollowers)) * 1000) / 10,
    youtubeViews
});

export const createMusicCultureMoment = (
    type: MusicCultureMomentType,
    options: {
        id: string;
        headline: string;
        description: string;
        artistIds?: string[];
        artistNames?: string[];
        songTitle?: string;
        projectTitle?: string;
        heat?: number;
        week: number;
        year: number;
        impactLevel?: MusicCultureMomentRecord['impactLevel'];
    }
): MusicCultureMomentRecord => ({
    id: options.id,
    type,
    headline: options.headline,
    description: options.description,
    artistIds: options.artistIds || [],
    artistNames: options.artistNames || [],
    songTitle: options.songTitle,
    projectTitle: options.projectTitle,
    heat: clamp(Math.round(options.heat || 0), 0, 100),
    week: options.week,
    year: options.year,
    impactLevel: options.impactLevel || 'LOW'
});

export const addMusicCultureMoment = (
    industry: MusicIndustryState,
    moment: MusicCultureMomentRecord
): MusicIndustryState => {
    const existing = Array.isArray(industry.cultureMoments) ? industry.cultureMoments : [];
    if (existing.some(entry => entry.id === moment.id)) return industry;
    return {
        ...industry,
        cultureMoments: [moment, ...existing].slice(0, 30)
    };
};

const rivalryIdFor = (leftArtistId: string, rightArtistId: string): string => {
    return [leftArtistId, rightArtistId].sort().join('_vs_');
};

const heatActiveRivalry = (
    rivalries: MusicRivalryRecord[],
    left: MusicChartEntry,
    right: MusicChartEntry,
    reason: string,
    week: number,
    year: number,
    heatGain: number
): { rivalries: MusicRivalryRecord[]; rivalry: MusicRivalryRecord; isNew: boolean } => {
    const id = rivalryIdFor(left.artistId, right.artistId);
    const existing = rivalries.find(entry => entry.id === id);
    if (existing) {
        const updated: MusicRivalryRecord = {
            ...existing,
            artistNames: [left.artistName, right.artistName],
            reason,
            heat: clamp(existing.heat + heatGain, 1, 100),
            lastEventWeek: week,
            lastEventYear: year,
            status: 'ACTIVE'
        };
        return {
            rivalries: rivalries.map(entry => entry.id === id ? updated : entry),
            rivalry: updated,
            isNew: false
        };
    }
    const rivalry: MusicRivalryRecord = {
        id,
        artistIds: [left.artistId, right.artistId],
        artistNames: [left.artistName, right.artistName],
        reason,
        heat: clamp(38 + heatGain, 1, 100),
        startedWeek: week,
        startedYear: year,
        lastEventWeek: week,
        lastEventYear: year,
        status: 'ACTIVE'
    };
    return { rivalries: [rivalry, ...rivalries], rivalry, isNew: true };
};

const decayRivalries = (rivalries: MusicRivalryRecord[]): MusicRivalryRecord[] => {
    return rivalries
        .map(rivalry => {
            const heat = Math.max(0, rivalry.heat - 6);
            return {
                ...rivalry,
                heat,
                status: heat <= 12 ? 'ENDED' : heat <= 32 ? 'COOLING' : rivalry.status
            } as MusicRivalryRecord;
        })
        .filter(rivalry => rivalry.status !== 'ENDED' || rivalry.heat > 0)
        .slice(0, 24);
};

const getScandalSeverity = (artist: MusicArtist, rng: () => number): MusicScandalRecord['severity'] => {
    const roll = rng();
    if (artist.scandalRisk === 'HIGH' && roll > 0.58) return 'HIGH';
    if (artist.scandalRisk !== 'LOW' && roll > 0.46) return 'MEDIUM';
    return 'LOW';
};

const buildMusicScandal = (
    artist: MusicArtist,
    week: number,
    year: number,
    absoluteWeek: number,
    rng: () => number
): MusicScandalRecord => {
    const severity = getScandalSeverity(artist, rng);
    const templates = [
        `${artist.stageName} faces backlash after a messy livestream.`,
        `${artist.stageName} sparks fan drama during a chart week.`,
        `${artist.stageName} is criticized for skipping a major promo event.`,
        `${artist.stageName} gets dragged into a label dispute.`
    ];
    const momentumHit = severity === 'HIGH' ? 26 : severity === 'MEDIUM' ? 15 : 8;
    const followerLoss = severity === 'HIGH' ? 180_000 : severity === 'MEDIUM' ? 62_000 : 14_000;
    return {
        id: `music_scandal_${absoluteWeek}_${artist.id}`,
        artistId: artist.id,
        artistName: artist.stageName,
        headline: pickWithRng(templates, rng),
        severity,
        week,
        year,
        momentumHit,
        followerLoss
    };
};

const GENERATED_STAGE_PREFIXES = ['Nova', 'Velvet', 'King', 'Luna', 'Saint', 'Echo', 'Mira', 'Kairo', 'Zara', 'Juno', 'Ravi', 'Nyla', 'Orion', 'Cleo', 'Astra', 'Rhea'];
const GENERATED_STAGE_SUFFIXES = ['Vex', 'Waves', 'Saint', 'Noir', 'Rush', 'Bloom', 'Ryder', 'Fox', 'Chrome', 'Reign', 'Verse', 'Halo', 'Drift', 'Khan', 'Blue', 'Storm'];
const GENERATED_REAL_FIRST = ['Ari', 'Maya', 'Dev', 'Nico', 'Sana', 'Lena', 'Omar', 'Tara', 'Iris', 'Rohan', 'Mina', 'Jalen', 'Noor', 'Eli', 'Gia', 'Kian'];
const GENERATED_REAL_LAST = ['Stone', 'Kapoor', 'Reed', 'Santos', 'Hayes', 'Khan', 'Rivera', 'Blake', 'Nakamura', 'Cole', 'Bennett', 'Shah', 'West', 'Vale', 'Moon', 'Cross'];
const GENERATED_GENRES = ['Pop', 'Rap', 'Hip-Hop', 'R&B', 'Rock', 'Indie', 'EDM', 'Country', 'Latin', 'K-pop', 'Afrobeats', 'Classical', 'Jazz', 'Punjabi', 'Bollywood', 'Metal', 'Folk'];
const GENERATED_AUDIENCES = ['teen fans', 'global youth', 'prestige listeners', 'festival crowds', 'street culture', 'family audiences', 'luxury nightlife', 'online fanbases'];
const GENERATED_REGIONS = ['Los Angeles', 'London', 'Mumbai', 'Seoul', 'Lagos', 'Toronto', 'Atlanta', 'Mexico City', 'Paris', 'Dubai', 'Nashville', 'Berlin'];
const GENERATED_DEALS = ['Upfront fee', 'Soundtrack rights share', 'Music video package', 'Album partnership', 'Artist cameo bundle'];

const genreTags = (genre: string): string[] => {
    if (genre === 'Rap' || genre === 'Hip-Hop') return ['crime', 'street', 'action', 'teen'];
    if (genre === 'Pop' || genre === 'R&B') return ['romance', 'teen', 'global', 'luxury'];
    if (genre === 'K-pop' || genre === 'Afrobeats' || genre === 'Latin' || genre === 'Bollywood' || genre === 'Punjabi') return ['global', 'festival', 'family', 'romance'];
    if (genre === 'Metal' || genre === 'Rock') return ['action', 'horror', 'dark', 'street'];
    if (genre === 'Classical' || genre === 'Jazz' || genre === 'Folk' || genre === 'Indie') return ['prestige', 'drama', 'festival', 'romance'];
    return ['global', 'teen', 'festival'];
};

const generatedArtistCosts = (tier: MusicArtistFameTier, reputation: number): { low: number; high: number } => {
    const base = tier === 'STAR' ? 650_000 : tier === 'KNOWN' ? 180_000 : 35_000;
    const low = Math.round(base * (0.7 + reputation / 180));
    return { low, high: Math.round(low * (tier === 'STAR' ? 4.5 : tier === 'KNOWN' ? 3.2 : 2.4)) };
};

const generateEmergingMusicArtist = (seed: string, index: number): MusicArtist => {
    const rng = createRng(seed);
    const stageName = `${pickWithRng(GENERATED_STAGE_PREFIXES, rng)} ${pickWithRng(GENERATED_STAGE_SUFFIXES, rng)}`;
    const realName = `${pickWithRng(GENERATED_REAL_FIRST, rng)} ${pickWithRng(GENERATED_REAL_LAST, rng)}`;
    const genre = pickWithRng(GENERATED_GENRES, rng);
    const fameTier: MusicArtistFameTier = rng() > 0.92 ? 'STAR' : rng() > 0.48 ? 'KNOWN' : 'EMERGING';
    const gender: MusicArtistGender = rng() > 0.82 ? 'GROUP' : rng() > 0.48 ? 'FEMALE' : 'MALE';
    const reputation = Math.round((fameTier === 'STAR' ? 62 : fameTier === 'KNOWN' ? 45 : 28) + rng() * 28);
    const costs = generatedArtistCosts(fameTier, reputation);
    const socialFollowers = Math.round((fameTier === 'STAR' ? 3_500_000 : fameTier === 'KNOWN' ? 650_000 : 45_000) * (0.6 + rng() * 2.4));
    const tags = genreTags(genre);
    return {
        id: `music_generated_${index}_${stageName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`,
        stageName,
        realName,
        genre,
        gender,
        subgenre: genre === 'Rap' ? 'Trap' : genre === 'Pop' ? 'Synth pop' : genre === 'EDM' ? 'Festival house' : genre,
        fameTier,
        reputation: Math.max(1, Math.min(100, reputation)),
        audience: pickWithRng(GENERATED_AUDIENCES, rng),
        region: pickWithRng(GENERATED_REGIONS, rng),
        costLow: costs.low,
        costHigh: costs.high,
        socialFollowers,
        soundtrackFitTags: tags,
        strengths: [`${genre} identity`, 'Fresh fanbase', rng() > 0.5 ? 'Trailer-friendly hook' : 'Strong social snippets'],
        risks: [rng() > 0.72 ? 'Untested live draw' : 'Limited mainstream proof'],
        scandalRisk: rng() > 0.9 ? 'HIGH' : rng() > 0.62 ? 'MEDIUM' : 'LOW',
        availability: rng() > 0.82 ? 'RARE' : rng() > 0.5 ? 'SELECTIVE' : 'COMMON',
        personality: rng() > 0.55 ? 'Ambitious breakout with online heat.' : 'Fresh voice trying to cross into film culture.',
        dealPreference: pickWithRng(GENERATED_DEALS, rng)
    };
};

export const processMusicIndustryWeek = (player: Player): { world: WorldState; news: NewsItem[]; logs: string[]; newArtists?: MusicArtist[]; artistEarnings?: { artistId: string; amount: number; followerGain: number }[] } => {
    const world: WorldState = { ...player.world };
    const industry = ensureMusicIndustryState(world);
    const absoluteWeek = getAbsoluteWeek(player);
    const news: NewsItem[] = [];
    const logs: string[] = [];
    const newArtists: MusicArtist[] = [];
    const artistEarnings: { artistId: string; amount: number; followerGain: number }[] = [];

    if (industry.lastProcessedWeek === absoluteWeek) {
        return { world: { ...world, musicIndustry: industry }, news, logs, artistEarnings };
    }

    const rng = createRng(`music_world_${player.age}_${player.currentWeek}_${industry.chart[0]?.artistId || 'seed'}`);
    const previousLeader = industry.chart[0]?.artistId;
    const previousRankByArtist = getChartRankMap(industry.chart);
    const recentReleases = Array.isArray(industry.recentReleases) ? [...industry.recentReleases] : [];
    let rivalries = decayRivalries(Array.isArray(industry.rivalries) ? industry.rivalries : []);
    let scandals = Array.isArray(industry.scandals) ? [...industry.scandals] : [];
    let cultureMoments = Array.isArray(industry.cultureMoments) ? [...industry.cultureMoments] : [];
    const recordCultureMoment = (moment: MusicCultureMomentRecord): void => {
        if (cultureMoments.some(entry => entry.id === moment.id)) return;
        cultureMoments = [moment, ...cultureMoments].slice(0, 30);
        logs.push(moment.headline);
    };
    Object.values(industry.artists).forEach(artistState => {
        artistState.followersLastWeek = artistState.followers;
        artistState.weeklyFollowerGain = 0;
        artistState.socialGrowthPct = 0;
        artistState.rivalryHeat = Math.max(0, Math.round((artistState.rivalryHeat || 0) * 0.9));
        artistState.scandalHeat = Math.max(0, Math.round((artistState.scandalHeat || 0) * 0.86));
    });
    const releaseWeek = !industry.lastProcessedWeek || player.currentWeek % 3 === 0;
    const generatedArtists = Array.isArray(industry.generatedArtists) ? [...industry.generatedArtists] : [];
    const shouldDebutArtist = absoluteWeek > 0 && absoluteWeek % 8 === 0 && generatedArtists.length < 120 && rng() > 0.24;
    if (shouldDebutArtist) {
        const artist = generateEmergingMusicArtist(`artist_debut_${absoluteWeek}_${generatedArtists.length}_${previousLeader || 'scene'}`, absoluteWeek);
        if (!generatedArtists.some(entry => entry.id === artist.id) && !MUSIC_ARTISTS.some(entry => entry.id === artist.id)) {
            generatedArtists.push(artist);
            newArtists.push(artist);
            industry.artists[artist.id] = {
                artistId: artist.id,
                artistName: artist.stageName,
                genre: artist.genre,
                rank: Object.keys(industry.artists).length + 1,
                momentum: FAME_SCORE[artist.fameTier] + artist.reputation,
                followers: artist.socialFollowers
            };
            news.push({
                id: `music_debut_${absoluteWeek}_${artist.id}`,
                headline: `${artist.stageName} breaks out of the ${artist.genre} scene.`,
                subtext: 'Industry trackers add a new music artist to the celebrity world.',
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: artist.fameTier === 'STAR' ? 'MEDIUM' : 'LOW'
            });
            logs.push(`${artist.stageName} emerged as a new ${artist.genre} artist.`);
        }
    }
    industry.generatedArtists = generatedArtists;
    const artistCatalog = getMusicArtistCatalog({ musicIndustry: industry } as WorldState);
    const artistById = new Map(artistCatalog.map(artist => [artist.id, artist]));
    let chartEntries: MusicChartEntry[] = industry.chart
        .map(entry => ({ ...entry, score: Math.max(1, Math.round(entry.score * 0.88)) }));

    if (releaseWeek) {
        const candidates = artistCatalog
            .map(artist => {
                const artistState = industry.artists[artist.id];
                const weeksSinceRelease = artistState?.lastReleaseWeek && artistState?.lastReleaseYear
                    ? absoluteWeek - ((artistState.lastReleaseYear * 52) + artistState.lastReleaseWeek)
                    : 999;
                return {
                    artist,
                    score: (artistState?.momentum || 0)
                        + FAME_SCORE[artist.fameTier]
                        + artist.reputation
                        + (weeksSinceRelease > 10 ? 20 : weeksSinceRelease > 5 ? 8 : -22)
                        + (rng() * 25)
                };
            })
            .sort((left, right) => right.score - left.score)
            .slice(0, 10);

        const releaseCount = 1 + Math.floor(rng() * 3);
        for (let index = 0; index < releaseCount && candidates.length > 0; index += 1) {
            const pickIndex = Math.floor(rng() * Math.min(5, candidates.length));
            const [{ artist }] = candidates.splice(pickIndex, 1);
            const artistState = industry.artists[artist.id];
            const songTitle = createReleaseTitle(artist, rng);
            const releaseKind = getReleaseKind(artist, rng);
            const score = Math.round(
                artist.reputation
                + FAME_SCORE[artist.fameTier]
                + Math.min(55, artist.socialFollowers / 2500000)
                + (rng() * 35)
            );
            const tierRoyaltyBase = artist.fameTier === 'LEGEND'
                ? 650_000
                : artist.fameTier === 'SUPERSTAR'
                    ? 420_000
                    : artist.fameTier === 'STAR'
                        ? 140_000
                        : artist.fameTier === 'KNOWN'
                            ? 38_000
                            : 8_000;
            const releaseIncome = Math.round(
                tierRoyaltyBase
                + (score * 950)
                + Math.min(280_000, artist.socialFollowers * 0.0012)
            );
            const followerGain = Math.round(score * (releaseKind === 'ALBUM' ? 1850 : releaseKind === 'EP' ? 1550 : releaseKind === 'VIDEO' ? 1450 : 1200));
            const youtubeViews = estimateYoutubeViews(artist, score, rng);
            artistEarnings.push({
                artistId: artist.id,
                amount: releaseIncome,
                followerGain
            });

            chartEntries.push({
                artistId: artist.id,
                artistName: artist.stageName,
                songTitle,
                genre: artist.genre,
                score,
                week: player.currentWeek,
                year: player.age
            });

            const previousFollowers = artistState?.followers || artist.socialFollowers;
            recentReleases.unshift(buildReleaseRecord(
                artist,
                songTitle,
                releaseKind,
                score,
                player.currentWeek,
                player.age,
                absoluteWeek,
                previousRankByArtist.get(artist.id),
                followerGain,
                youtubeViews,
                previousFollowers
            ));

            industry.artists[artist.id] = {
                ...(artistState || {}),
                artistId: artist.id,
                artistName: artist.stageName,
                genre: artist.genre,
                rank: artistState?.rank || Object.keys(industry.artists).length + 1,
                momentum: Math.max(1, Math.round((artistState?.momentum || 50) * 0.72 + score * 0.28)),
                followersLastWeek: previousFollowers,
                followers: Math.round(previousFollowers + followerGain),
                weeklyFollowerGain: followerGain,
                socialGrowthPct: Math.round((followerGain / Math.max(1, previousFollowers)) * 1000) / 10,
                youtubeViews,
                lastReleaseWeek: player.currentWeek,
                lastReleaseYear: player.age,
                currentSingle: songTitle
            };

            if (index === 0) {
                news.push({
                    id: `music_release_${absoluteWeek}_${artist.id}`,
                    headline: `${artist.stageName} drops a ${releaseKindLabel(releaseKind)}: "${songTitle}".`,
                    subtext: `${artist.genre} fans push the track into the industry conversation.`,
                    category: 'INDUSTRY',
                    week: player.currentWeek,
                    year: player.age,
                    impactLevel: artist.fameTier === 'LEGEND' || artist.fameTier === 'SUPERSTAR' ? 'MEDIUM' : 'LOW'
                });
            }

            if (score >= 168 || youtubeViews >= 18_000_000) {
                const moment = createMusicCultureMoment('ARTIST_BREAKOUT', {
                    id: `music_culture_breakout_${absoluteWeek}_${artist.id}`,
                    headline: `${artist.stageName} turns "${songTitle}" into a culture moment.`,
                    description: `${artist.genre} clips, edits, and fan posts push the release beyond a normal drop.`,
                    artistIds: [artist.id],
                    artistNames: [artist.stageName],
                    songTitle,
                    heat: Math.min(100, Math.round(score / 2)),
                    week: player.currentWeek,
                    year: player.age,
                    impactLevel: score >= 205 || youtubeViews >= 38_000_000 ? 'HIGH' : 'MEDIUM'
                });
                recordCultureMoment(moment);
                news.push({
                    id: moment.id,
                    headline: moment.headline,
                    subtext: moment.description,
                    category: 'INDUSTRY',
                    week: player.currentWeek,
                    year: player.age,
                    impactLevel: moment.impactLevel
                });
            }
        }
    }

    chartEntries = chartEntries
        .sort((left, right) => right.score - left.score)
        .slice(0, 20)
        .map((entry, index) => {
            const currentRank = index + 1;
            const previousRank = previousRankByArtist.get(entry.artistId);
            return {
                ...entry,
                previousRank,
                currentRank,
                movement: previousRank ? previousRank - currentRank : 0
            };
        });

    chartEntries.forEach((entry, index) => {
        const artistState = industry.artists[entry.artistId];
        if (!artistState) return;
        industry.artists[entry.artistId] = {
            ...artistState,
            rank: index + 1,
            peakRank: artistState.peakRank ? Math.min(artistState.peakRank, index + 1) : index + 1,
            chartMovement: entry.movement || 0,
            momentum: Math.max(1, Math.round(artistState.momentum * 0.9 + entry.score * 0.1))
        };
    });

    chartEntries.forEach(entry => {
        const release = recentReleases.find(item => item.artistId === entry.artistId && item.songTitle === entry.songTitle && item.week === player.currentWeek && item.year === player.age);
        if (!release) return;
        release.currentRank = entry.currentRank;
        release.movement = entry.movement;
    });

    const newLeader = chartEntries[0];
    const previousLeaderEntry = previousLeader ? chartEntries.find(entry => entry.artistId === previousLeader) : undefined;
    if (newLeader && newLeader.artistId !== previousLeader && releaseWeek) {
        news.push({
            id: `music_chart_${absoluteWeek}_${newLeader.artistId}`,
            headline: `${newLeader.artistName} takes #1 with "${newLeader.songTitle}".`,
            subtext: 'The in-game music scene shifts again as artists battle for the top spot.',
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: 'MEDIUM'
        });
        logs.push(`${newLeader.artistName} now leads the music charts with "${newLeader.songTitle}".`);

        if (previousLeaderEntry) {
            const moment = createMusicCultureMoment('SONG_BEATS_SONG', {
                id: `music_culture_song_beats_${absoluteWeek}_${newLeader.artistId}_${previousLeaderEntry.artistId}`,
                headline: `"${newLeader.songTitle}" beats "${previousLeaderEntry.songTitle}" for #1.`,
                description: `${newLeader.artistName} knocks ${previousLeaderEntry.artistName} off the top spot, giving both fanbases something to argue about.`,
                artistIds: [newLeader.artistId, previousLeaderEntry.artistId],
                artistNames: [newLeader.artistName, previousLeaderEntry.artistName],
                songTitle: newLeader.songTitle,
                heat: 72,
                week: player.currentWeek,
                year: player.age,
                impactLevel: 'MEDIUM'
            });
            recordCultureMoment(moment);
            news.push({
                id: moment.id,
                headline: moment.headline,
                subtext: moment.description,
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: moment.impactLevel
            });
        }
    }

    const runnerUp = chartEntries[1];
    if (releaseWeek && newLeader && runnerUp && Math.abs(newLeader.score - runnerUp.score) <= 18) {
        const rivalryResult = heatActiveRivalry(
            rivalries,
            newLeader,
            runnerUp,
            'Close chart race',
            player.currentWeek,
            player.age,
            14 + Math.round(rng() * 16)
        );
        rivalries = rivalryResult.rivalries;
        const [leftId, rightId] = rivalryResult.rivalry.artistIds;
        if (industry.artists[leftId]) {
            industry.artists[leftId].rivalArtistId = rightId;
            industry.artists[leftId].rivalryHeat = rivalryResult.rivalry.heat;
        }
        if (industry.artists[rightId]) {
            industry.artists[rightId].rivalArtistId = leftId;
            industry.artists[rightId].rivalryHeat = rivalryResult.rivalry.heat;
        }
        if (rivalryResult.isNew || rivalryResult.rivalry.heat >= 64) {
            const moment = createMusicCultureMoment('FANBASE_WAR', {
                id: `music_culture_fanbase_war_${absoluteWeek}_${rivalryResult.rivalry.id}`,
                headline: `${newLeader.artistName} and ${runnerUp.artistName} fanbases go to war.`,
                description: 'Chart posts turn into a full fanbase fight over streams, videos, and who owns the week.',
                artistIds: rivalryResult.rivalry.artistIds,
                artistNames: rivalryResult.rivalry.artistNames,
                songTitle: newLeader.songTitle,
                heat: rivalryResult.rivalry.heat,
                week: player.currentWeek,
                year: player.age,
                impactLevel: rivalryResult.rivalry.heat >= 72 ? 'HIGH' : 'MEDIUM'
            });
            recordCultureMoment(moment);
            news.push({
                id: `music_rivalry_${absoluteWeek}_${rivalryResult.rivalry.id}`,
                headline: `${newLeader.artistName} and ${runnerUp.artistName} spark a chart rivalry.`,
                subtext: 'Fanbases are comparing numbers, clips, and chart positions all week.',
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: rivalryResult.rivalry.heat >= 64 ? 'MEDIUM' : 'LOW'
            });
            news.push({
                id: moment.id,
                headline: moment.headline,
                subtext: moment.description,
                category: 'INDUSTRY',
                week: player.currentWeek,
                year: player.age,
                impactLevel: moment.impactLevel
            });
            logs.push(`${newLeader.artistName} and ${runnerUp.artistName} became a music-scene rivalry.`);
        }
    }

    if (releaseWeek && newLeader && previousLeaderEntry && newLeader.artistId !== previousLeaderEntry.artistId) {
        const rivalryResult = heatActiveRivalry(
            rivalries,
            newLeader,
            previousLeaderEntry,
            'New #1 unseated the previous leader',
            player.currentWeek,
            player.age,
            18 + Math.round(rng() * 18)
        );
        rivalries = rivalryResult.rivalries;
    }

    const scandalCandidates = chartEntries
        .slice(0, 12)
        .map(entry => ({ entry, artist: artistById.get(entry.artistId) }))
        .filter((entry): entry is { entry: MusicChartEntry; artist: MusicArtist } => Boolean(entry.artist));
    for (const candidate of scandalCandidates) {
        const artistState = industry.artists[candidate.artist.id];
        const lastScandalAbsoluteWeek = artistState?.lastScandalWeek && artistState?.lastScandalYear
            ? (artistState.lastScandalYear * 52) + artistState.lastScandalWeek
            : -999;
        if (absoluteWeek - lastScandalAbsoluteWeek < 10) continue;
        const riskBase = candidate.artist.scandalRisk === 'HIGH' ? 0.08 : candidate.artist.scandalRisk === 'MEDIUM' ? 0.035 : 0.012;
        const chartPressure = (candidate.entry.currentRank || 20) <= 3 ? 0.012 : 0;
        const rivalryPressure = Math.min(0.035, (artistState?.rivalryHeat || 0) / 2000);
        if (rng() >= riskBase + chartPressure + rivalryPressure) continue;
        const scandal = buildMusicScandal(candidate.artist, player.currentWeek, player.age, absoluteWeek, rng);
        scandals.unshift(scandal);
        if (artistState) {
            industry.artists[candidate.artist.id] = {
                ...artistState,
                momentum: Math.max(1, artistState.momentum - scandal.momentumHit),
                followers: Math.max(0, artistState.followers - scandal.followerLoss),
                scandalHeat: clamp((artistState.scandalHeat || 0) + scandal.momentumHit, 0, 100),
                lastScandalWeek: player.currentWeek,
                lastScandalYear: player.age
            };
        }
        news.push({
            id: scandal.id,
            headline: scandal.headline,
            subtext: `${candidate.artist.stageName} loses momentum while the ${candidate.artist.genre} scene reacts.`,
            category: 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: scandal.severity === 'HIGH' ? 'HIGH' : scandal.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW'
        });
        logs.push(`${candidate.artist.stageName} hit a ${scandal.severity.toLowerCase()} music scandal.`);
        break;
    }

    industry.chart = chartEntries;
    industry.recentReleases = recentReleases.slice(0, 40);
    industry.rivalries = rivalries.slice(0, 24);
    industry.scandals = scandals.slice(0, 24);
    industry.cultureMoments = cultureMoments.slice(0, 30);
    industry.lastProcessedWeek = absoluteWeek;
    industry.history = [
        ...(cultureMoments[0]?.week === player.currentWeek && cultureMoments[0]?.year === player.age ? [`Week ${player.currentWeek}, ${player.age}: ${cultureMoments[0].headline}`] : []),
        ...(scandals[0]?.week === player.currentWeek && scandals[0]?.year === player.age ? [`Week ${player.currentWeek}, ${player.age}: ${scandals[0].artistName} scandal affected music momentum.`] : []),
        ...(rivalries[0]?.lastEventWeek === player.currentWeek && rivalries[0]?.lastEventYear === player.age ? [`Week ${player.currentWeek}, ${player.age}: ${rivalries[0].artistNames.join(' vs ')} became a chart rivalry.`] : []),
        ...(newLeader ? [`Week ${player.currentWeek}, ${player.age}: ${newLeader.artistName} led with "${newLeader.songTitle}".`] : []),
        ...industry.history
    ].slice(0, 40);

    return {
        world: {
            ...world,
            musicIndustry: industry
        },
        news: news.slice(0, 6),
        logs,
        newArtists,
        artistEarnings
    };
};
