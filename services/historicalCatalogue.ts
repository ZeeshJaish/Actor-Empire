import type {
    BudgetTier, Genre, HistoricalCatalogueProducer, HistoricalCatalogueState,
    HistoricalCatalogueTitle, Player,
} from '../types';
import { createDeterministicId, createDeterministicRng, hashDeterministicSeed } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';

const TARGET_RELEASED_TITLES = 2_000;
const GENRES: Genre[] = [
    'DRAMA', 'COMEDY', 'THRILLER', 'ACTION', 'ROMANCE', 'MYSTERY', 'HORROR',
    'SCI_FI', 'ADVENTURE', 'BIOPIC', 'SPORTS', 'ANIMATION', 'FANTASY', 'CRIME',
    'DOCUMENTARY', 'MUSICAL', 'SUPERHERO',
];
const TITLE_OPENERS = [
    'After', 'Beyond', 'Beneath', 'Before', 'Blue', 'Broken', 'Burning', 'Cold',
    'Dark', 'Distant', 'Echoes of', 'Fading', 'Golden', 'Hidden', 'Last', 'Little',
    'Lost', 'Midnight', 'New', 'Northern', 'Paper', 'Quiet', 'Red', 'River',
    'Second', 'Silent', 'Silver', 'South of', 'The', 'Wild',
];
const TITLE_CENTRES = [
    'Atlas', 'Beacon', 'Border', 'Bridge', 'Canvas', 'City', 'Coast', 'Compass',
    'Crown', 'Current', 'Dawn', 'Desert', 'Dream', 'Empire', 'Field', 'Fire',
    'Forest', 'Garden', 'Harbour', 'House', 'Island', 'Lantern', 'Map', 'Mountain',
    'Ocean', 'Orchard', 'Path', 'Signal', 'Sky', 'Window',
];
const TITLE_ENDINGS = [
    'at Dawn', 'of Tomorrow', 'in Winter', 'Beyond the Sea', 'of Glass',
    'and Stone', 'of Stars', 'at Night', 'of the Valley', 'Remembered',
];
const seededTitleCache = new WeakMap<HistoricalCatalogueState, HistoricalCatalogueTitle[]>();
const marqueeTitleCache = new WeakMap<HistoricalCatalogueState, HistoricalCatalogueTitle[]>();
const MARQUEE_SLATE: ReadonlyArray<{ title: string; projectType: 'MOVIE' | 'SERIES'; genre: Genre }> = [
    { title: 'The Hollow Meridian', projectType: 'SERIES', genre: 'MYSTERY' },
    { title: 'Northbound', projectType: 'MOVIE', genre: 'DRAMA' },
    { title: 'Signal House', projectType: 'MOVIE', genre: 'THRILLER' },
    { title: 'The Glass Kingdom', projectType: 'MOVIE', genre: 'FANTASY' },
    { title: 'No City Sleeps', projectType: 'SERIES', genre: 'CRIME' },
    { title: 'After the Monsoon', projectType: 'MOVIE', genre: 'ROMANCE' },
    { title: 'Atlas of Dust', projectType: 'MOVIE', genre: 'ADVENTURE' },
    { title: 'The Paper Crown', projectType: 'MOVIE', genre: 'BIOPIC' },
    { title: 'The Eleventh Floor', projectType: 'SERIES', genre: 'SCI_FI' },
    { title: 'Winter Orchard', projectType: 'MOVIE', genre: 'DRAMA' },
    { title: 'Night Ferry', projectType: 'MOVIE', genre: 'HORROR' },
    { title: 'The Long Divide', projectType: 'MOVIE', genre: 'ACTION' },
    { title: 'Summer of Ash', projectType: 'SERIES', genre: 'DRAMA' },
    { title: 'The Guest List', projectType: 'MOVIE', genre: 'COMEDY' },
    { title: 'Last Harbour', projectType: 'MOVIE', genre: 'THRILLER' },
    { title: 'The Blue Hour', projectType: 'MOVIE', genre: 'MUSICAL' },
];

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, value))
);
const numeric = (value: unknown, fallback: number): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
);
const text = (value: unknown, fallback: string): string => (
    typeof value === 'string' && value.trim() ? value.trim() : fallback
);
const genre = (value: unknown): Genre => GENRES.includes(value as Genre) ? value as Genre : 'DRAMA';
const budgetTier = (value: unknown): BudgetTier => (
    value === 'LOW' || value === 'MID' || value === 'HIGH' || value === 'BLOCKBUSTER' ? value : 'MID'
);
const projectType = (value: unknown): 'MOVIE' | 'SERIES' => value === 'SERIES' ? 'SERIES' : 'MOVIE';
const languageRegion = (languageId: string): string => {
    if (['hindi', 'tamil', 'telugu', 'bengali'].includes(languageId)) return 'SOUTH_ASIA';
    if (['japanese', 'korean'].includes(languageId)) return 'EAST_ASIA';
    if (['spanish', 'portuguese'].includes(languageId)) return 'LATIN_AMERICA';
    if (['french', 'german', 'italian'].includes(languageId)) return 'EUROPE';
    if (['swahili', 'hausa', 'yoruba', 'igbo', 'arabic'].includes(languageId)) return 'AFRICA';
    if (['indonesian', 'thai', 'filipino'].includes(languageId)) return 'SOUTHEAST_ASIA';
    return 'NORTH_AMERICA';
};

const releasedWeek = (source: Record<string, any>, fallbackYear: number, fallbackWeek: number): {
    year: number; weekReleased: number;
} => ({
    year: Math.max(1, Math.floor(numeric(source.releaseYear ?? source.year, fallbackYear))),
    weekReleased: clamp(Math.floor(numeric(
        source.weekReleased ?? source.releaseWeek ?? source.week,
        fallbackWeek,
    )), 1, 52),
});

const savedTitle = (
    source: Record<string, any>, player: Player, titleSource: 'WORLD' | 'ACTIVE' | 'PAST' | 'LEGACY' | 'ACQUIRED' | 'PRODUCTION',
): HistoricalCatalogueTitle => {
    const qualitySource = titleSource === 'WORLD' ? source.quality
        : source.projectQuality ?? source.productionPerformance ?? source.quality;
    const storedRating = source.imdbRating ?? source.rating;
    const quality = clamp(Math.round(numeric(qualitySource,
        numeric(storedRating, 6.5) * 10)), 0, 100);
    const rating = clamp(numeric(storedRating, 4.8 + quality * 0.045), 1, 10);
    const boxOffice = Math.max(0, numeric(
        source.boxOffice ?? source.gross ?? source.totalGross ?? source.revenue, 0,
    ));
    const studioId = text(source.studioId ?? source.producerStudioId ?? source.projectDetails?.studioId,
        'independent-rights-holder');
    const rightsHolderId = text(source.rightsHolderId, studioId);
    const languageId = text(source.originalLanguageId, 'english');
    const yearWeek = releasedWeek(source, player.age, player.currentWeek);
    const studioName = text(source.studioName,
        (player.businesses || []).find(business => business.id === studioId)?.name
            || player.world.studios?.[studioId]?.name || studioId);
    const regionId = text(source.regionId, languageRegion(languageId));
    const reach = clamp(Math.round(numeric(source.reach,
        35 + Math.log10(1 + boxOffice) * 4 + quality * 0.2)), 0, 100);
    const prestige = clamp(Math.round(numeric(source.prestige,
        quality * 0.7 + rating * 2.5)), 0, 100);
    const inferredFields: string[] = [];
    if (!Number.isFinite(Number(qualitySource))) inferredFields.push('quality');
    if (!Number.isFinite(Number(storedRating))) inferredFields.push('rating');
    if (!Number.isFinite(Number(source.boxOffice ?? source.gross ?? source.totalGross ?? source.revenue))) inferredFields.push('boxOffice');
    if (!source.originalLanguageId) inferredFields.push('originalLanguageId');
    if (!source.regionId) inferredFields.push('regionId');
    if (!source.studioName) inferredFields.push('studioName');
    if (!source.rightsHolderId) inferredFields.push('rightsHolderId');
    if (!source.genre && !source.projectDetails?.genre) inferredFields.push('genre');
    if (!source.mediaType && !source.projectType && !source.projectDetails?.type) inferredFields.push('projectType');
    if (!source.budgetTier) inferredFields.push('budgetTier');
    if (!Number.isFinite(Number(source.reach))) inferredFields.push('reach');
    if (!Number.isFinite(Number(source.prestige))) inferredFields.push('prestige');
    if (!source.releaseYear && !source.year) inferredFields.push('year');
    if (!source.weekReleased && !source.releaseWeek && !source.week) inferredFields.push('weekReleased');
    return {
        id: text(source.id ?? source.canonicalProjectId, ''),
        title: text(source.title ?? source.name, 'Untitled'),
        projectType: projectType(source.mediaType ?? source.projectType ?? source.projectDetails?.type),
        genre: genre(source.genre ?? source.projectDetails?.genre),
        originalLanguageId: languageId,
        regionId,
        studioId,
        studioName,
        rightsHolderId,
        ...yearWeek,
        quality,
        rating,
        boxOffice,
        budgetTier: budgetTier(source.budgetTier),
        reach,
        prestige,
        provenance: 'SAVED_RELEASE',
        inferredFields,
    };
};

const collectSavedReleasedTitles = (player: Player): Map<string, HistoricalCatalogueTitle> => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const titles = new Map<string, HistoricalCatalogueTitle>();
    const add = (source: Record<string, any>, kind: Parameters<typeof savedTitle>[2]): void => {
        const id = text(source.id ?? source.canonicalProjectId, '');
        if (!id || titles.has(id)) return;
        titles.set(id, savedTitle({ ...source, id }, player, kind));
    };
    (player.world.projects || []).forEach(project => {
        if (project.marketOpportunityId && project.marketPremiereAtAbsoluteWeek == null) return;
        if (releasedBy(project.year, project.weekReleased, now)) add(project, 'WORLD');
    });
    (player.activeReleases || []).forEach(release => {
        const releasedAt = Number(release.releasedAtAbsoluteWeek);
        if (Number.isFinite(releasedAt) && releasedAt > now) return;
        if (release.releaseYear && !releasedBy(release.releaseYear, release.releaseWeek ?? 1, now)) return;
        add({ ...release, year: release.releaseYear ?? player.age,
            weekReleased: release.releaseWeek ?? player.currentWeek }, 'ACTIVE');
    });
    (player.pastProjects || []).forEach(project => {
        if (releasedBy(project.releaseYear ?? project.year, project.releaseWeek ?? 1, now)) add(project, 'PAST');
    });
    const legacyProjects = Array.isArray(player.flags?.legacyStudioProjects)
        ? player.flags.legacyStudioProjects : [];
    legacyProjects.forEach((project: any) => {
        if (releasedBy(project.releaseYear ?? project.year, project.releaseWeek ?? project.week ?? 1, now)) {
            add(project, 'LEGACY');
        }
    });
    (player.businesses || []).forEach(business => {
        business.studioState?.acquisitionPortfolio?.catalog?.forEach(project => {
            if (releasedBy(project.year, project.week, now)) {
                add({ ...project, studioId: business.id }, 'ACQUIRED');
            }
        });
    });
    Object.values(player.world.industryProductions || {}).forEach(production => {
        const releasedAt = production.studioAiExecution?.result?.releasedAtAbsoluteWeek
            ?? production.updatedAtAbsoluteWeek;
        if (production.status !== 'RELEASED'
            || !Number.isFinite(releasedAt) || releasedAt > now) return;
        const absoluteWeek = releasedAt;
        add({ ...production, id: production.canonicalProjectId,
            studioId: production.producerStudioId,
            year: Math.floor(absoluteWeek / 52) + 1,
            weekReleased: absoluteWeek % 52 + 1,
            mediaType: production.projectType }, 'PRODUCTION');
    });
    return titles;
};

const FICTIONAL_REGIONAL_PRODUCERS: HistoricalCatalogueProducer[] = [
    { id: 'HIST_INDIA', name: 'Monsoon Lantern Films', archetype: 'REGIONAL', languageId: 'hindi', regionId: 'SOUTH_ASIA', weight: 3, kind: 'FICTIONAL_REGIONAL' },
    { id: 'HIST_EAST_ASIA', name: 'Paper Crane Pictures', archetype: 'REGIONAL', languageId: 'japanese', regionId: 'EAST_ASIA', weight: 3, kind: 'FICTIONAL_REGIONAL' },
    { id: 'HIST_LATAM', name: 'Cielo Sur Films', archetype: 'REGIONAL', languageId: 'spanish', regionId: 'LATIN_AMERICA', weight: 3, kind: 'FICTIONAL_REGIONAL' },
    { id: 'HIST_EUROPE', name: 'Blue Hour Cinema', archetype: 'PRESTIGE', languageId: 'french', regionId: 'EUROPE', weight: 2, kind: 'FICTIONAL_REGIONAL' },
    { id: 'HIST_AFRICA', name: 'Baobab Storyworks', archetype: 'REGIONAL', languageId: 'swahili', regionId: 'AFRICA', weight: 2, kind: 'FICTIONAL_REGIONAL' },
    { id: 'HIST_SE_ASIA', name: 'Tidal Road Pictures', archetype: 'REGIONAL', languageId: 'indonesian', regionId: 'SOUTHEAST_ASIA', weight: 2, kind: 'FICTIONAL_REGIONAL' },
];

const releasedBy = (year: unknown, releaseWeek: unknown, currentAbsoluteWeek: number): boolean => (
    Number.isFinite(Number(year)) && Number(year) >= 1
    && Number.isFinite(Number(releaseWeek)) && Number(releaseWeek) >= 1
    && getAbsoluteWeek(Number(year), Number(releaseWeek)) <= currentAbsoluteWeek
);

/** Only records that already represent released screen titles count toward the initial target. */
export const getSavedReleasedHistoricalTitleIds = (player: Player): Set<string> => {
    return new Set(collectSavedReleasedTitles(player).keys());
};

const freezeProducerRoster = (player: Player): HistoricalCatalogueProducer[] => {
    const playerStudioIds = new Set((player.businesses || [])
        .filter(business => business.type === 'PRODUCTION_HOUSE')
        .map(business => business.id));
    const worldStudios = Object.values(player.world.studios || {})
        .filter(studio => studio.id && !playerStudioIds.has(studio.id)
            && studio.ai?.origin !== 'PLAYER_FOUNDED')
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, 80)
        .map(studio => ({
            id: studio.id,
            name: studio.name,
            archetype: studio.archetype,
            languageId: 'english',
            regionId: 'NORTH_AMERICA',
            weight: Math.max(1, Math.min(6, Math.round((studio.reputation || 55) / 23))),
            earliestYear: studio.ai?.legacyVenture?.foundedYear
                ?? (studio.archetype === 'PLATFORM' ? Math.max(1, player.age - 8)
                    : studio.ai?.origin === 'GENERATED' ? Math.max(1, player.age - 4) : 1),
            kind: 'WORLD_STUDIO' as const,
        }));
    return [...worldStudios, ...FICTIONAL_REGIONAL_PRODUCERS];
};

const isValidHistoricalCatalogueState = (value: HistoricalCatalogueState): boolean => (
    value.schemaVersion === 1 && value.generatorVersion === 1
    && typeof value.seed === 'string' && value.seed.length > 0
    && Number.isInteger(value.initializedAtAbsoluteWeek) && value.initializedAtAbsoluteWeek >= 0
    && Number.isInteger(value.seededCount) && value.seededCount >= 0 && value.seededCount <= TARGET_RELEASED_TITLES
    && Number.isInteger(value.savedTitleCountAtInitialization) && value.savedTitleCountAtInitialization >= 0
    && Array.isArray(value.producerRoster) && value.producerRoster.length > 0
    && (value.marqueeVersion === undefined || value.marqueeVersion === 2)
    && (value.marqueeVersion !== 2 || (Number.isInteger(value.marqueeActivatedAtAbsoluteWeek)
        && value.marqueeActivatedAtAbsoluteWeek! >= value.initializedAtAbsoluteWeek))
    && value.overlays !== null && typeof value.overlays === 'object' && !Array.isArray(value.overlays)
);

export const initializeHistoricalCatalogue = (
    player: Player, rawInput?: Partial<Player> | Player,
): Player => {
    const existing = player.world.historicalCatalogue;
    if (existing !== undefined && existing !== null) {
        if (!isValidHistoricalCatalogueState(existing)) {
            throw new Error('Unsupported or damaged historical catalogue recipe; preserve the save for recovery.');
        }
        if (existing.marqueeVersion === undefined && Number(rawInput?.flags?.saveMigrationVersion) >= 50) {
            throw new Error('Missing marquee catalogue batch in a new-format save; preserve the save for recovery.');
        }
        const activated = existing.marqueeVersion === 2 ? existing : {
            ...existing,
            marqueeVersion: 2 as const,
            marqueeActivatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        };
        const savedCount = getSavedReleasedHistoricalTitleIds(player).size;
        const requiredSeedCount = Math.max(existing.seededCount,
            TARGET_RELEASED_TITLES - savedCount);
        if (requiredSeedCount > existing.seededCount || activated !== existing) {
            return { ...player, world: { ...player.world, historicalCatalogue: {
                ...activated, seededCount: requiredSeedCount,
            } } };
        }
        return player;
    }
    if (Number(rawInput?.flags?.saveMigrationVersion) >= 49) {
        throw new Error('Missing historical catalogue recipe in a new-format save; preserve the save for recovery.');
    }
    const savedTitleCountAtInitialization = getSavedReleasedHistoricalTitleIds(player).size;
    const state: HistoricalCatalogueState = {
        schemaVersion: 1,
        generatorVersion: 1,
        marqueeVersion: 2,
        marqueeActivatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        seed: createDeterministicId('historical_catalogue_seed_v1', player.id),
        initializedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        seededCount: Math.max(0, TARGET_RELEASED_TITLES - savedTitleCountAtInitialization),
        savedTitleCountAtInitialization,
        producerRoster: freezeProducerRoster(player),
        overlays: {},
    };
    return { ...player, world: { ...player.world, historicalCatalogue: state } };
};

const pickProducer = (
    state: HistoricalCatalogueState, titleGenre: Genre, tier: BudgetTier,
    releaseYear: number, random: number,
): HistoricalCatalogueProducer => {
    const weighted = state.producerRoster
        .filter(producer => !producer.earliestYear || producer.earliestYear <= releaseYear)
        .map(producer => {
        const archetype = producer.archetype;
        const genreFit = archetype === 'FRANCHISE' && ['SUPERHERO', 'ACTION', 'SCI_FI', 'FANTASY'].includes(titleGenre)
            ? 2.5 : archetype === 'PRESTIGE' && ['DRAMA', 'BIOPIC', 'DOCUMENTARY'].includes(titleGenre)
                ? 1.8 : 1;
        const budgetFit = tier === 'BLOCKBUSTER' && producer.kind === 'FICTIONAL_REGIONAL'
            ? 0.3 : tier === 'LOW' && producer.kind === 'FICTIONAL_REGIONAL' ? 1.5 : 1;
        return { producer, weight: producer.weight * genreFit * budgetFit };
        });
    let position = random * weighted.reduce((total, item) => total + item.weight, 0);
    for (const item of weighted) {
        position -= item.weight;
        if (position < 0) return item.producer;
    }
    return weighted[weighted.length - 1].producer;
};

const generateHistoricalTitleV1 = (state: HistoricalCatalogueState, index: number): HistoricalCatalogueTitle => {
    const rng = createDeterministicRng(`${state.seed}:v1:${index}`);
    const titleCode = (index * 7_919 + hashDeterministicSeed(state.seed)) % 9_000;
    const opener = TITLE_OPENERS[titleCode % TITLE_OPENERS.length];
    const centre = TITLE_CENTRES[Math.floor(titleCode / TITLE_OPENERS.length) % TITLE_CENTRES.length];
    const ending = TITLE_ENDINGS[Math.floor(titleCode / (TITLE_OPENERS.length * TITLE_CENTRES.length))];
    const projectGenre = GENRES[Math.floor(rng() * GENRES.length)];
    const budgetRoll = rng();
    const tier: BudgetTier = budgetRoll < 0.47 ? 'LOW'
        : budgetRoll < 0.79 ? 'MID' : budgetRoll < 0.95 ? 'HIGH' : 'BLOCKBUSTER';
    const initialYear = Math.floor(state.initializedAtAbsoluteWeek / 52) + 1;
    const initialWeek = state.initializedAtAbsoluteWeek % 52 + 1;
    const currentYearTranche = index % 50 === 0 || initialYear === 1;
    const year = currentYearTranche ? initialYear : 1 + Math.floor(rng() * (initialYear - 1));
    const weekReleased = 1 + Math.floor(rng() * (currentYearTranche ? initialWeek : 52));
    const producer = pickProducer(state, projectGenre, tier, year, rng());
    const prestigeBias = producer.archetype === 'PRESTIGE' ? 6 : producer.archetype === 'FRANCHISE' ? 1 : 0;
    const quality = clamp(Math.round(38 + 52 * Math.pow(rng(), 1.55) + prestigeBias), 15, 98);
    const rating = Math.round(clamp(3.5 + quality * 0.058 + (rng() - 0.5) * 1.4, 1, 9.8) * 10) / 10;
    const budgetMillions = tier === 'LOW' ? 3 + rng() * 10 : tier === 'MID' ? 12 + rng() * 28
        : tier === 'HIGH' ? 40 + rng() * 55 : 100 + rng() * 160;
    const reach = clamp(Math.round(15 + quality * 0.43 + Math.log10(budgetMillions) * 14
        + (rng() - 0.5) * 18), 0, 100);
    const prestige = clamp(Math.round(quality * 0.65 + rating * 2.8 + prestigeBias
        + (rng() - 0.5) * 12), 0, 100);
    const isSeries = index % 20 < 3;
    const boxOffice = isSeries ? 0 : Math.round(budgetMillions * 1_000_000
        * clamp(0.4 + quality / 45 + (rng() - 0.5) * 1.6, 0.2, 5));
    return {
        id: `historical_v1_${hashDeterministicSeed(state.seed).toString(36)}_${index.toString(36).padStart(4, '0')}`,
        title: `${opener} ${centre} ${ending}`,
        projectType: isSeries ? 'SERIES' : 'MOVIE',
        genre: projectGenre,
        originalLanguageId: producer.languageId,
        regionId: producer.regionId,
        studioId: producer.id,
        studioName: producer.name,
        rightsHolderId: producer.id,
        year,
        weekReleased,
        quality,
        rating,
        boxOffice,
        budgetTier: tier,
        reach,
        prestige,
        provenance: 'SEEDED_HISTORY',
        inferredFields: [],
    };
};

const getSeededHistoricalTitles = (state: HistoricalCatalogueState): HistoricalCatalogueTitle[] => {
    if (!isValidHistoricalCatalogueState(state)) {
        throw new Error('Unsupported or damaged historical catalogue recipe; preserve the save for recovery.');
    }
    const cached = seededTitleCache.get(state);
    if (cached) return cached;
    const titles = Array.from({ length: state.seededCount }, (_, index) => {
        const base = generateHistoricalTitleV1(state, index);
        Object.freeze(base.inferredFields);
        const overlay = state.overlays[base.id];
        if (!overlay) return Object.freeze(base);
        return Object.freeze({
            ...base,
            rating: clamp(numeric(overlay.rating, base.rating), 1, 10),
            quality: clamp(numeric(overlay.quality, base.quality), 0, 100),
            boxOffice: Math.max(0, numeric(overlay.boxOffice, base.boxOffice)),
            reach: clamp(numeric(overlay.reach, base.reach), 0, 100),
            prestige: clamp(numeric(overlay.prestige, base.prestige), 0, 100),
        });
    });
    seededTitleCache.set(state, titles);
    return titles;
};

const getMarqueeHistoricalTitles = (state: HistoricalCatalogueState): HistoricalCatalogueTitle[] => {
    if (state.marqueeVersion !== 2) return [];
    if (!isValidHistoricalCatalogueState(state)) {
        throw new Error('Unsupported or damaged marquee catalogue recipe; preserve the save for recovery.');
    }
    const cached = marqueeTitleCache.get(state);
    if (cached) return cached;
    const activation = state.marqueeActivatedAtAbsoluteWeek!;
    const activationYear = Math.floor(activation / 52) + 1;
    const activationWeek = activation % 52 + 1;
    const titles = MARQUEE_SLATE.map((item, index): HistoricalCatalogueTitle => {
        const rng = createDeterministicRng(`${state.seed}:marquee-v2:${index}`);
        const year = Math.max(1, activationYear - 2 - index % 8);
        const weekReleased = year === activationYear
            ? Math.max(1, Math.min(activationWeek, 1 + Math.floor(rng() * activationWeek)))
            : 1 + Math.floor(rng() * 52);
        const tier: BudgetTier = index % 4 === 0 ? 'BLOCKBUSTER' : 'HIGH';
        const producer = pickProducer(state, item.genre, tier, year, rng());
        const quality = 90 + index % 9;
        const rating = Math.round((8.6 + index % 10 * 0.1) * 10) / 10;
        const reach = Math.min(100, 82 + index % 17);
        const prestige = Math.min(100, 83 + (index * 3) % 18);
        const title: HistoricalCatalogueTitle = {
            id: `historical_marquee_v2_${hashDeterministicSeed(state.seed).toString(36)}_${index.toString(36).padStart(2, '0')}`,
            title: item.title,
            projectType: item.projectType,
            genre: item.genre,
            originalLanguageId: producer.languageId,
            regionId: producer.regionId,
            studioId: producer.id,
            studioName: producer.name,
            rightsHolderId: producer.id,
            year,
            weekReleased,
            quality,
            rating,
            boxOffice: item.projectType === 'SERIES' ? 0 : (140 + index * 13) * 1_000_000,
            budgetTier: tier,
            reach,
            prestige,
            provenance: 'SEEDED_HISTORY',
            catalogueTier: 'MARQUEE',
            inferredFields: [],
        };
        Object.freeze(title.inferredFields);
        return Object.freeze(title);
    });
    marqueeTitleCache.set(state, titles);
    return titles;
};

/** Saved released results always outrank immutable seeded history by canonical ID. */
export const getHistoricalCatalogueTitles = (player: Player): HistoricalCatalogueTitle[] => {
    const saved = collectSavedReleasedTitles(player);
    const seed = player.world.historicalCatalogue;
    if (!seed) return [...saved.values()];
    const result = [...saved.values()];
    getSeededHistoricalTitles(seed).forEach(title => {
        if (!saved.has(title.id)) result.push(title);
    });
    getMarqueeHistoricalTitles(seed).forEach(title => {
        if (!saved.has(title.id)) result.push(title);
    });
    return result;
};

export const resolveHistoricalCatalogueTitle = (
    player: Player, titleId: string,
): HistoricalCatalogueTitle | null => {
    const saved = collectSavedReleasedTitles(player).get(titleId);
    if (saved) return saved;
    const seed = player.world.historicalCatalogue;
    return seed ? getSeededHistoricalTitles(seed).find(title => title.id === titleId)
        || getMarqueeHistoricalTitles(seed).find(title => title.id === titleId) || null : null;
};
