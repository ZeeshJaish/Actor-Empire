import type {
    Business,
    Genre,
    OwnedRight,
    Player,
    StudioAcquisitionPortfolio,
    StudioDepartments,
    StudioEquipment,
    StudioLegacyCatalogItem,
    StudioLegacyFranchise,
    Universe,
} from '../types';
import type { ForbesCatalogTitle, ForbesStudioProfile } from './forbesStudioProfile';

type AcquisitionAssetProfile = Pick<
    ForbesStudioProfile,
    | 'id'
    | 'name'
    | 'valuation'
    | 'reputation'
    | 'archetype'
    | 'catalog'
    | 'rightsHighlights'
    | 'franchiseCount'
    | 'universeNames'
    | 'facilities'
    | 'facilitiesEstimated'
    | 'assetDataSource'
>;

const MAX_IMPORTED_ASSETS = 24;
const MAX_IMPORTED_FRANCHISES = 8;
const normalizeKey = (value?: string) => String(value || '').trim().toLocaleLowerCase();
const clampLevel = (value: number) => Math.max(0, Math.min(10, Math.round(value)));
const uniqueStrings = (values: string[]) => values.filter(
    (value, index, all) => Boolean(value?.trim()) && all.findIndex(candidate => normalizeKey(candidate) === normalizeKey(value)) === index,
);
const uniqueById = <T extends { id: string }>(values: T[]) => values.filter(
    (value, index, all) => all.findIndex(candidate => candidate.id === value.id) === index,
);
const slug = (value: string) => normalizeKey(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'legacy';
const stableHash = (value: string) => Array.from(value).reduce(
    (hash, character) => ((hash * 33) ^ character.charCodeAt(0)) >>> 0,
    5381,
);

const getFallbackGenre = (archetype?: string): Genre => {
    const key = String(archetype || '').toUpperCase();
    if (key.includes('FRANCHISE') || key.includes('UNIVERSE')) return 'ACTION';
    if (key.includes('PRESTIGE')) return 'DRAMA';
    if (key.includes('ANIMATION')) return 'ANIMATION';
    if (key.includes('HORROR')) return 'HORROR';
    if (key.includes('COMEDY')) return 'COMEDY';
    return 'DRAMA';
};

const normalizeCatalogItem = ({
    studioId,
    item,
    fallbackGenre,
}: {
    studioId: string;
    item: ForbesCatalogTitle;
    fallbackGenre: Genre;
}): StudioLegacyCatalogItem => ({
    id: `acq_catalog_${studioId}_${item.id || slug(item.title)}`,
    title: String(item.title || 'Untitled Legacy Project').trim(),
    year: Math.max(1, Math.round(Number(item.year || 1))),
    week: Math.max(1, Math.min(52, Math.round(Number(item.week || 1)))),
    revenue: Math.max(0, Number(item.revenue || 0)),
    quality: Math.max(0, Math.min(100, Math.round(Number(item.quality || 0)))),
    outcome: String(item.outcome || 'MIXED'),
    genre: item.genre || fallbackGenre,
    projectType: 'MOVIE',
    source: item.source === 'WORLD_CATALOG'
        ? 'WORLD_CATALOG'
        : item.source === 'VENTURE_HISTORY'
            ? 'VENTURE_HISTORY'
            : 'ACQUISITION_SUMMARY',
    universeId: item.universeId,
});

const buildFranchises = ({
    studioId,
    catalog,
    declaredCount,
    universes,
}: {
    studioId: string;
    catalog: StudioLegacyCatalogItem[];
    declaredCount: number;
    universes: Universe[];
}): { catalog: StudioLegacyCatalogItem[]; franchises: StudioLegacyFranchise[] } => {
    const franchises: StudioLegacyFranchise[] = [];
    const franchiseByCatalogId = new Map<string, string>();

    universes.forEach(universe => {
        const universeCatalog = catalog.filter(item => item.universeId === universe.id);
        if (!universeCatalog.length) return;
        const id = `acq_franchise_${studioId}_${universe.id}`;
        franchises.push({
            id,
            name: universe.name,
            catalogItemIds: universeCatalog.map(item => item.id),
            universeId: universe.id,
            estimated: false,
        });
        universeCatalog.forEach(item => franchiseByCatalogId.set(item.id, id));
    });

    const ungrouped = catalog
        .filter(item => !franchiseByCatalogId.has(item.id))
        .sort((a, b) => b.revenue - a.revenue || b.quality - a.quality);
    const estimatedCount = Math.min(
        MAX_IMPORTED_FRANCHISES - franchises.length,
        Math.max(0, Math.round(declaredCount) - franchises.length),
        ungrouped.length,
    );

    for (let index = 0; index < estimatedCount; index += 1) {
        const seed = ungrouped[index];
        const id = `acq_franchise_${studioId}_${slug(seed.title)}_${index + 1}`;
        const members = ungrouped.filter((_, memberIndex) => memberIndex % estimatedCount === index);
        franchises.push({
            id,
            name: seed.title,
            catalogItemIds: members.map(item => item.id),
            estimated: true,
        });
        members.forEach(item => franchiseByCatalogId.set(item.id, id));
    }

    return {
        franchises,
        catalog: catalog.map(item => ({
            ...item,
            franchiseId: franchiseByCatalogId.get(item.id),
        })),
    };
};

export const buildStudioAcquisitionPortfolio = ({
    player,
    profile,
}: {
    player: Player;
    profile: AcquisitionAssetProfile;
}): StudioAcquisitionPortfolio => {
    const fallbackGenre = getFallbackGenre(profile.archetype);
    const catalog = uniqueById((profile.catalog || []).map(item => normalizeCatalogItem({
        studioId: profile.id,
        item,
        fallbackGenre,
    })));
    const knownTitles = new Set(catalog.map(item => normalizeKey(item.title)));
    const summaryRights = (profile.rightsHighlights || [])
        .filter(title => !knownTitles.has(normalizeKey(title)))
        .map((title, index): StudioLegacyCatalogItem => ({
            id: `acq_catalog_${profile.id}_right_${slug(title)}_${index + 1}`,
            title,
            year: player.age,
            week: player.currentWeek,
            revenue: 0,
            quality: Math.max(40, Math.round(profile.reputation || 50)),
            outcome: 'LEGACY RIGHT',
            genre: fallbackGenre,
            projectType: 'MOVIE',
            source: 'ACQUISITION_SUMMARY',
        }));
    const normalizedCatalog = [...catalog, ...summaryRights].slice(0, MAX_IMPORTED_ASSETS);
    const studioUniverses = Object.values(player.world?.universes || {})
        .filter(universe => universe.studioId === profile.id);
    const grouped = buildFranchises({
        studioId: profile.id,
        catalog: normalizedCatalog,
        declaredCount: profile.franchiseCount || 0,
        universes: studioUniverses,
    });

    return {
        version: 1,
        sourceStudioId: profile.id,
        importedWeek: player.currentWeek,
        importedYear: player.age,
        assetDataSource: profile.assetDataSource,
        catalog: grouped.catalog,
        franchises: grouped.franchises,
        declaredFranchiseCount: Math.max(grouped.franchises.length, Math.round(profile.franchiseCount || 0)),
        universeIds: studioUniverses.map(universe => universe.id),
        universeNames: uniqueStrings([
            ...studioUniverses.map(universe => universe.name),
            ...(profile.universeNames || []),
        ]),
        facilityLabels: uniqueStrings(profile.facilities || []).slice(0, 8),
        facilitiesEstimated: Boolean(profile.facilitiesEstimated),
    };
};

const getRightRarity = (item: StudioLegacyCatalogItem): OwnedRight['rarity'] => {
    if (item.revenue >= 750_000_000 || item.quality >= 88) return 'LEGENDARY';
    if (item.revenue >= 300_000_000 || item.quality >= 78) return 'RARE';
    if (item.revenue >= 100_000_000 || item.quality >= 68) return 'UNCOMMON';
    return 'COMMON';
};

const RIGHT_ACCENTS = ['#f59e0b', '#38bdf8', '#a78bfa', '#2dd4bf', '#fb7185'];

export const buildPortfolioOwnedRights = ({
    portfolio,
    studioName,
}: {
    portfolio: StudioAcquisitionPortfolio;
    studioName: string;
}): OwnedRight[] => portfolio.catalog.map(item => ({
    id: `owned_${item.id}`,
    sourceOpportunityId: item.id,
    title: item.title,
    sellerName: `${studioName} legacy catalog`,
    propertyType: item.franchiseId ? 'FRANCHISE' : 'CATALOG',
    archetype: item.franchiseId ? 'PRESTIGE_PROPERTY' : 'STREAMING_CATALOG',
    primaryGenre: item.genre,
    rarity: getRightRarity(item),
    accent: RIGHT_ACCENTS[stableHash(item.id) % RIGHT_ACCENTS.length],
    emblemKey: item.franchiseId ? 'SHIELD' : 'BOOK',
    dealType: 'CATALOG_PURCHASE',
    purchasePrice: 0,
    acquiredWeek: portfolio.importedWeek,
    acquiredYear: portfolio.importedYear,
    projectsUsed: 0,
    status: 'ACTIVE',
    ownershipSource: 'ACQUIRED',
    sourceProjectId: item.id,
    franchiseId: item.franchiseId,
    universeId: item.universeId,
}));

export const deriveAcquiredStudioFacilities = ({
    valuation,
    reputation,
    facilityLabels,
    facilitiesEstimated,
}: {
    valuation: number;
    reputation: number;
    facilityLabels: string[];
    facilitiesEstimated: boolean;
}): { departments: StudioDepartments; equipment: StudioEquipment } => {
    const scaleLevel = valuation >= 10_000_000_000
        ? 7
        : valuation >= 3_000_000_000
            ? 6
            : valuation >= 1_000_000_000
                ? 5
                : valuation >= 300_000_000
                    ? 4
                    : 3;
    const reputationLift = reputation >= 90 ? 2 : reputation >= 75 ? 1 : 0;
    const confidencePenalty = facilitiesEstimated ? 1 : 0;
    const base = clampLevel(scaleLevel + reputationLift - confidencePenalty);
    const search = facilityLabels.join(' ').toLocaleLowerCase();
    const has = (pattern: RegExp) => pattern.test(search);
    const boost = (pattern: RegExp, amount = 1) => has(pattern) ? amount : 0;

    return {
        departments: {
            writing: clampLevel(base + boost(/story|writing|development|awards/)),
            directing: clampLevel(base + boost(/director|auteur|production|soundstage/)),
            casting: clampLevel(base + boost(/talent|casting|ensemble|global/)),
            production: clampLevel(base + boost(/backlot|soundstage|production|volume|campus/)),
            postProduction: clampLevel(base + boost(/post|vfx|virtual|data|operations/)),
        },
        equipment: {
            cameras: clampLevel(base + boost(/camera|volume|virtual|soundstage/)),
            lighting: clampLevel(base + boost(/lighting|volume|stage|backlot/)),
            sound: clampLevel(base + boost(/sound|post|music/)),
            practicalEffects: clampLevel(Math.max(1, base - 1) + boost(/backlot|practical|animatronic|soundstage/)),
        },
    };
};

const createLegacyPortfolioFromBusiness = (player: Player, business: Business): StudioAcquisitionPortfolio => {
    const fallbackGenre = getFallbackGenre(business.config?.theme);
    const titles = uniqueStrings(business.studioState?.purchasedIPTitles || []);
    const catalog: StudioLegacyCatalogItem[] = titles.slice(0, MAX_IMPORTED_ASSETS).map((title, index) => ({
        id: `acq_catalog_${business.id}_legacy_${slug(title)}_${index + 1}`,
        title,
        year: business.studioState?.acquiredYear || player.age,
        week: business.studioState?.acquiredWeek || player.currentWeek,
        revenue: 0,
        quality: Math.max(40, Math.round(Number(business.stats?.brandHealth || 50))),
        outcome: 'IMPORTED LEGACY',
        genre: fallbackGenre,
        projectType: 'MOVIE',
        source: 'ACQUISITION_SUMMARY',
    }));
    const studioUniverses = Object.values(player.world?.universes || {})
        .filter(universe => universe.studioId === business.id);

    return {
        version: 1,
        sourceStudioId: business.id,
        importedWeek: business.studioState?.acquiredWeek || player.currentWeek,
        importedYear: business.studioState?.acquiredYear || player.age,
        assetDataSource: 'MIXED',
        catalog,
        franchises: [],
        declaredFranchiseCount: 0,
        universeIds: studioUniverses.map(universe => universe.id),
        universeNames: studioUniverses.map(universe => universe.name),
        facilityLabels: uniqueStrings(business.config?.amenities || []).slice(0, 8),
        facilitiesEstimated: true,
    };
};

export const repairAcquiredStudioAssetPortfolios = (player: Player): Player => {
    let changed = false;
    const businesses = (player.businesses || []).map(business => {
        if (business.type !== 'PRODUCTION_HOUSE' || business.studioState?.acquisitionOrigin !== 'STUDIO_ACQUISITION') {
            return business;
        }

        const portfolio = business.studioState.acquisitionPortfolio || createLegacyPortfolioFromBusiness(player, business);
        const inheritedRights = buildPortfolioOwnedRights({ portfolio, studioName: business.name });
        const existingRightsById = new Map((business.studioState.ownedRights || []).map(right => [right.id, right]));
        const inheritedRightIds = new Set(inheritedRights.map(right => right.id));
        const existingRights = (business.studioState.ownedRights || []).filter(right => !inheritedRightIds.has(right.id));
        const mergedInheritedRights = inheritedRights.map(right => ({
            ...right,
            ...(existingRightsById.get(right.id) || {}),
        }));
        const facilities = deriveAcquiredStudioFacilities({
            valuation: Number(business.stats?.valuation || 0),
            reputation: Number(business.stats?.brandHealth || 0),
            facilityLabels: portfolio.facilityLabels,
            facilitiesEstimated: portfolio.facilitiesEstimated,
        });
        const departments = Object.fromEntries(Object.entries(facilities.departments).map(([key, level]) => [
            key,
            Math.max(level, Number(business.studioState?.departments?.[key as keyof StudioDepartments] || 0)),
        ])) as unknown as StudioDepartments;
        const equipment = Object.fromEntries(Object.entries(facilities.equipment).map(([key, level]) => [
            key,
            Math.max(level, Number(business.studioState?.equipment?.[key as keyof StudioEquipment] || 0)),
        ])) as unknown as StudioEquipment;
        const purchasedIPTitles = uniqueStrings([
            ...(business.studioState.purchasedIPTitles || []),
            ...portfolio.catalog.map(item => item.title),
        ]);
        const ownedRights = [...existingRights, ...mergedInheritedRights];
        const portfolioChanged = !business.studioState.acquisitionPortfolio;
        const rightsChanged = JSON.stringify(ownedRights) !== JSON.stringify(business.studioState.ownedRights || []);
        const departmentsChanged = JSON.stringify(departments) !== JSON.stringify(business.studioState.departments || {});
        const equipmentChanged = JSON.stringify(equipment) !== JSON.stringify(business.studioState.equipment || {});
        const titlesChanged = JSON.stringify(purchasedIPTitles) !== JSON.stringify(business.studioState.purchasedIPTitles || []);

        if (!portfolioChanged && !rightsChanged && !departmentsChanged && !equipmentChanged && !titlesChanged) {
            return business;
        }
        changed = true;
        return {
            ...business,
            studioState: {
                ...business.studioState,
                acquisitionPortfolio: portfolio,
                purchasedIPTitles,
                ownedRights,
                departments,
                equipment,
            },
        };
    });

    return changed ? { ...player, businesses } : player;
};
