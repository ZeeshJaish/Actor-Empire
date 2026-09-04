import type { Business, IndustryProject, NpcVentureState, Universe } from '../types';

export type StudioAcquisitionState =
    | 'NOT_FOR_SALE'
    | 'OPEN_TO_OFFERS'
    | 'DISTRESSED'
    | 'SEEKING_INVESTMENT'
    | 'PUBLICLY_TRADED'
    | 'AUCTION_EXPECTED';

export interface ForbesStudioRecord {
    id: string;
    name: string;
    valuation: number;
    reputation: number;
    cashReserve: number;
    recentHits: number;
    archetype: string;
    ownerName?: string;
    isNpcVenture?: boolean;
    isPlayerOwned?: boolean;
}

export interface ForbesCatalogTitle {
    id: string;
    title: string;
    year: number;
    week: number;
    revenue: number;
    quality: number;
    outcome: string;
    genre?: IndustryProject['genre'];
    universeId?: IndustryProject['universeId'];
    source?: 'WORLD_CATALOG' | 'VENTURE_HISTORY' | 'PLAYER_ARCHIVE';
}

export interface ForbesStudioTalent {
    name: string;
    role: string;
}

export interface ForbesStudioProfile {
    id: string;
    name: string;
    isPlayerOwned: boolean;
    rank: number;
    archetype: string;
    reputation: number;
    acquisitionState: StudioAcquisitionState;
    valuation: number;
    capital: number;
    debt: number;
    profitability: number;
    hits: number;
    flops: number;
    hitRate: number;
    catalog: ForbesCatalogTitle[];
    managementPersonality: string;
    ownershipStructure: string;
    universeCount: number;
    rightsCount: number;
    rightsHighlights: string[];
    franchiseCount: number;
    universeNames: string[];
    facilities: string[];
    facilitiesEstimated: boolean;
    keyTalent: ForbesStudioTalent[];
    assetDataSource: 'SAVE_DATA' | 'MIXED' | 'FORBES_ESTIMATE';
    /** Publicly observable evidence. Internal AI company status is intentionally omitted. */
    publicSignals: string[];
    distressEvidence: string[];
}

interface ForbesStudioProfileInput {
    studio: ForbesStudioRecord;
    rank: number;
    worldProjects: IndustryProject[];
    universes: Record<string, Universe>;
    venture?: Pick<NpcVentureState, 'hits' | 'flops' | 'risk' | 'creativeQuality' | 'cashReserve' | 'valuation' | 'ownerName' | 'history'>;
    playerBusiness?: Pick<Business, 'balance' | 'history' | 'staff'>;
    playerProjects?: ForbesCatalogTitle[];
    playerRights?: Array<{ id: string; title: string }>;
    playerFranchiseIds?: string[];
    playerFacilities?: string[];
    playerTalent?: ForbesStudioTalent[];
}

const PUBLIC_STUDIO_IDS = new Set([
    'PARAMOUNT', 'WARNER_BROS', 'UNIVERSAL', 'NETFLIX', 'APPLE_TV',
    'DISNEY_PLUS', 'HULU', 'YOUTUBE',
]);

const stableHash = (value: string) => Array.from(value).reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    2166136261,
);

const isHit = (outcome: string) => ['HIT', 'SUCCESS', 'BLOCKBUSTER'].some(label => outcome.toUpperCase().includes(label));
const isFlop = (outcome: string) => ['FLOP', 'BOMB', 'DISASTER'].some(label => outcome.toUpperCase().includes(label));

const getCatalog = ({ studio, worldProjects, venture, playerProjects }: ForbesStudioProfileInput): ForbesCatalogTitle[] => {
    const worldCatalog = worldProjects
        .filter(project => project.studioId === studio.id)
        .map(project => ({
            id: project.id,
            title: project.title,
            year: project.year,
            week: project.weekReleased,
            revenue: Math.max(0, project.boxOffice || 0),
            quality: Math.max(0, project.quality || 0),
            outcome: project.reviews || 'MIXED',
            genre: project.genre,
            universeId: project.universeId,
            source: 'WORLD_CATALOG' as const,
        }));
    const ventureCatalog = (venture?.history || []).map(project => ({
        id: project.id,
        title: project.title,
        year: project.year,
        week: project.week,
        revenue: Math.max(0, project.revenue || 0),
        quality: Math.max(0, project.quality || 0),
        outcome: project.outcome,
        source: 'VENTURE_HISTORY' as const,
    }));

    return [...worldCatalog, ...ventureCatalog, ...(playerProjects || [])]
        .filter((project, index, projects) => projects.findIndex(candidate => candidate.id === project.id) === index)
        .sort((a, b) => (b.year - a.year) || (b.week - a.week))
        .slice(0, 5);
};

const getAcquisitionState = (input: ForbesStudioProfileInput): StudioAcquisitionState => {
    const { studio, venture } = input;
    if (studio.isPlayerOwned) return 'NOT_FOR_SALE';
    if (venture) {
        if (venture.cashReserve < 0 && (venture.flops >= 2 || venture.valuation < 0.05)) return 'AUCTION_EXPECTED';
        if (venture.cashReserve < 15 || venture.flops > venture.hits + 1) return 'DISTRESSED';
        if (venture.cashReserve < 60) return 'SEEKING_INVESTMENT';
        return 'OPEN_TO_OFFERS';
    }
    if (PUBLIC_STUDIO_IDS.has(studio.id)) return 'PUBLICLY_TRADED';
    if (studio.archetype.includes('FRANCHISE') || studio.archetype.includes('UNIVERSE')) return 'NOT_FOR_SALE';
    if (studio.valuation <= 5) return 'OPEN_TO_OFFERS';
    if (studio.cashReserve < studio.valuation * 8) return 'SEEKING_INVESTMENT';
    return 'NOT_FOR_SALE';
};

const getManagementPersonality = (studio: ForbesStudioRecord, venture?: ForbesStudioProfileInput['venture']) => {
    if (studio.isPlayerOwned) return 'Founder-led · Player strategy sets the slate';
    if (venture) {
        const temperament = venture.risk >= 70 ? 'bold and volatile' : venture.creativeQuality >= 72 ? 'creator-first and selective' : 'commercial and adaptive';
        return `Founder-led by ${venture.ownerName || studio.ownerName || 'an independent producer'} · ${temperament}`;
    }
    if (studio.archetype.includes('PRESTIGE')) return 'Prestige-driven · Patient, selective and awards focused';
    if (studio.archetype.includes('PLATFORM')) return 'Data-led · Scale, retention and global reach first';
    if (studio.archetype.includes('FRANCHISE') || studio.archetype.includes('UNIVERSE')) return 'Franchise-led · Long-horizon canon and event strategy';
    return 'Legacy operator · Balanced theatrical slate and brand protection';
};

const getOwnershipStructure = (studio: ForbesStudioRecord, venture?: ForbesStudioProfileInput['venture']) => {
    if (studio.isPlayerOwned) return 'Privately held · Player controlled';
    if (venture) return `Privately held · ${venture.ownerName || studio.ownerName || 'Founder'} controlled`;
    if (PUBLIC_STUDIO_IDS.has(studio.id)) return 'Public company · Institutional ownership';
    if (studio.archetype.includes('FRANCHISE') || studio.archetype.includes('UNIVERSE')) return 'Private division · Parent-company controlled';
    return 'Privately held · Strategic ownership group';
};

const getEstimatedFacilities = (studio: ForbesStudioRecord) => {
    if (studio.archetype.includes('PLATFORM')) return ['Virtual Production Campus', 'Global Content Operations', 'Audience Data Lab'];
    if (studio.archetype.includes('FRANCHISE') || studio.archetype.includes('UNIVERSE')) return ['Franchise Story Group', 'Volume Stage', 'VFX Pipeline'];
    if (studio.archetype.includes('PRESTIGE')) return ['Boutique Soundstages', 'Awards Campaign Unit', 'Independent Post House'];
    if (studio.archetype.includes('LEGACY')) return ['Studio Backlot', 'Soundstage Complex', 'Distribution Operations'];
    return ['Production Office', 'Flexible Soundstage', 'Post-Production Suite'];
};

const getKeyTalent = (input: ForbesStudioProfileInput): ForbesStudioTalent[] => {
    if (input.playerTalent?.length) return input.playerTalent.slice(0, 4);

    const talent = input.worldProjects
        .filter(project => project.studioId === input.studio.id)
        .sort((a, b) => (b.year - a.year) || (b.weekReleased - a.weekReleased))
        .flatMap(project => [
            project.leadActorName ? { name: project.leadActorName, role: 'Lead Talent' } : null,
            project.directorName ? { name: project.directorName, role: 'Director' } : null,
        ])
        .filter((entry): entry is ForbesStudioTalent => Boolean(entry))
        .filter((entry, index, entries) => entries.findIndex(candidate => candidate.name === entry.name) === index)
        .slice(0, 4);

    if (talent.length) return talent;
    if (input.studio.archetype.includes('PLATFORM')) return [{ name: 'Global A-list network', role: 'Talent Reach' }];
    if (input.studio.archetype.includes('PRESTIGE')) return [{ name: 'Auteur and awards roster', role: 'Talent Network' }];
    if (input.studio.archetype.includes('FRANCHISE') || input.studio.archetype.includes('UNIVERSE')) return [{ name: 'Long-term ensemble roster', role: 'Talent Network' }];
    return [{ name: 'Studio contract network', role: 'Talent Reach' }];
};

export const buildForbesStudioProfile = (input: ForbesStudioProfileInput): ForbesStudioProfile => {
    const { studio, rank, universes, venture, playerBusiness } = input;
    const catalog = getCatalog(input);
    const resolvedHits = venture?.hits ?? (catalog.length ? catalog.filter(project => isHit(project.outcome)).length : studio.recentHits || 0);
    const resolvedFlops = venture?.flops ?? catalog.filter(project => isFlop(project.outcome)).length;
    const hash = stableHash(studio.id);
    const valuation = Math.max(0, studio.valuation || 0) * 1_000_000_000;
    const capital = playerBusiness
        ? Math.max(0, playerBusiness.balance || 0)
        : Math.max(0, venture?.cashReserve ?? studio.cashReserve ?? 0) * 1_000_000;
    const debtRatio = 0.08 + ((hash % 19) / 100);
    const debt = studio.isPlayerOwned
        ? 0
        : venture
            ? Math.max(0, -venture.cashReserve) * 1_000_000
            : Math.round(valuation * debtRatio);
    const ventureProfit = venture?.history.reduce((sum, entry) => sum + (entry.profit || 0), 0);
    const playerProfit = playerBusiness?.history.reduce((sum, entry) => sum + (entry.profit || 0), 0);
    const estimatedMargin = 0.035 + ((hash % 9) / 100);
    const profitability = playerProfit ?? ventureProfit ?? Math.round((valuation * estimatedMargin) - (resolvedFlops * valuation * 0.008));
    const decidedOutcomes = resolvedHits + resolvedFlops;
    const studioUniverses = Object.values(universes || {}).filter(universe => universe.studioId === studio.id);
    const usesPlayerAssets = Boolean(studio.isPlayerOwned);
    const rightsHighlights = usesPlayerAssets && input.playerRights?.length
        ? input.playerRights.map(right => right.title).filter((title, index, titles) => titles.indexOf(title) === index).slice(0, 3)
        : catalog.map(project => project.title).slice(0, 3);
    const estimatedRights = studio.archetype.includes('FRANCHISE') || studio.archetype.includes('UNIVERSE')
        ? Math.max(4, catalog.length)
        : studio.archetype.includes('PLATFORM')
            ? Math.max(6, catalog.length)
            : Math.max(1, catalog.length);
    const franchiseIds = usesPlayerAssets && input.playerFranchiseIds
        ? [...new Set(input.playerFranchiseIds.filter(Boolean))]
        : [];
    const estimatedFranchises = studio.archetype.includes('FRANCHISE') || studio.archetype.includes('UNIVERSE')
        ? Math.max(3, studioUniverses.length)
        : studio.archetype.includes('LEGACY') || studio.archetype.includes('PLATFORM')
            ? Math.max(1, Math.min(5, Math.ceil(catalog.length / 2)))
            : catalog.length >= 2 ? 1 : 0;
    const facilities = usesPlayerAssets && input.playerFacilities?.length ? input.playerFacilities.slice(0, 4) : getEstimatedFacilities(studio);
    const distressEvidence = [
        ...(capital <= 0 ? ['Reported cash reserves are below zero.'] : []),
        ...(profitability < 0 ? [`Recent tracked results imply a ${Math.abs(profitability).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} loss.`] : []),
        ...(resolvedFlops >= 2 && resolvedFlops > resolvedHits ? [`The latest tracked slate includes ${resolvedFlops} commercial misses against ${resolvedHits} hits.`] : []),
    ];
    const latestTitle = catalog[0];
    const publicSignals = [
        latestTitle
            ? `${latestTitle.title} is the studio's latest tracked release, with ${latestTitle.outcome.toLowerCase()} reception.`
            : 'No recent public release is recorded in the tracked catalogue.',
        capital > 0
            ? `Reported capital stands near ${capital.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })}.`
            : 'Public filings indicate depleted operating capital.',
        ...(distressEvidence.length ? distressEvidence : [`The tracked slate shows ${resolvedHits} hits and ${resolvedFlops} flops.`]),
    ].slice(0, 4);

    return {
        id: studio.id,
        name: studio.name,
        isPlayerOwned: Boolean(studio.isPlayerOwned),
        rank,
        archetype: studio.archetype,
        reputation: Math.round(Math.max(0, Math.min(100, studio.reputation || 0))),
        acquisitionState: getAcquisitionState(input),
        valuation,
        capital,
        debt,
        profitability,
        hits: resolvedHits,
        flops: resolvedFlops,
        hitRate: decidedOutcomes > 0 ? Math.round((resolvedHits / decidedOutcomes) * 100) : 0,
        catalog,
        managementPersonality: getManagementPersonality(studio, venture),
        ownershipStructure: getOwnershipStructure(studio, venture),
        universeCount: studioUniverses.length,
        rightsCount: usesPlayerAssets ? (input.playerRights?.length || 0) : estimatedRights,
        rightsHighlights,
        franchiseCount: usesPlayerAssets ? franchiseIds.length : estimatedFranchises,
        universeNames: studioUniverses.map(universe => universe.name).slice(0, 3),
        facilities,
        facilitiesEstimated: !usesPlayerAssets || !input.playerFacilities?.length,
        keyTalent: getKeyTalent(input),
        assetDataSource: studio.isPlayerOwned ? 'SAVE_DATA' : venture ? 'MIXED' : 'FORBES_ESTIMATE',
        publicSignals,
        distressEvidence,
    };
};
