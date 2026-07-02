import type {
    BoxOfficeRegionId,
    BudgetTier,
    CinemaChain,
    CinemaChainId,
    CinemaChainRegionalTerms,
    Genre,
    ProjectDetails,
    PlatformId,
    ScreeningStrategy,
    StreamingDistributionBreakdown,
    TheatricalChainReceipt,
    TheatricalDistributionBreakdown,
    TheatricalRegionReceipt
} from '../types';
import {
    BOX_OFFICE_REGIONS,
    getCinemaChainById,
    getCinemaChainTerms
} from './cinemaChains';
import {
    getDefaultReleaseRegionIds,
    normalizeReleaseRegionIds
} from './regionMap';
import { PLATFORMS } from './streamingLogic';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const BUDGET_TARGET_SCREENS: Record<BudgetTier, number> = {
    LOW: 1100,
    MID: 3600,
    HIGH: 9200,
    BLOCKBUSTER: 15500
};

const inferStrategy = (project: ProjectDetails): ScreeningStrategy => {
    if (project.screeningStrategy) return project.screeningStrategy;
    const distributionPower = Number(project.hiddenStats?.distributionPower || 50);
    if (distributionPower >= 78) return 'INTERNATIONAL';
    if (distributionPower >= 52) return 'NATIONAL';
    return 'REGIONAL';
};

export const normalizeDistributionChainSelections = (
    rawSelections: ProjectDetails['releaseChainSelections']
): Partial<Record<BoxOfficeRegionId, CinemaChainId[]>> => {
    if (!rawSelections || typeof rawSelections !== 'object') return {};

    return Object.entries(rawSelections).reduce((normalized, [regionId, chainIds]) => {
        const safeChainIds = Array.from(new Set((Array.isArray(chainIds) ? chainIds : []).filter(Boolean)));
        if (safeChainIds.length > 0) {
            normalized[regionId as BoxOfficeRegionId] = safeChainIds;
        }
        return normalized;
    }, {} as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>);
};

export const getReleaseRegionIdsForProject = (project: ProjectDetails): BoxOfficeRegionId[] => {
    const selectedRegionIds = normalizeReleaseRegionIds(project.releaseRegionIds || []);
    if (selectedRegionIds.length > 0) return selectedRegionIds;
    return getDefaultReleaseRegionIds(inferStrategy(project));
};

const prefersPrestige = (project: ProjectDetails) => (
    project.genre === 'DRAMA' ||
    project.genre === 'BIOPIC' ||
    project.genre === 'DOCUMENTARY' ||
    Number(project.hiddenStats?.prestigeBonus || 0) > 0
);

const prefersFamily = (project: ProjectDetails) => (
    project.genre === 'ANIMATION' ||
    project.format === 'ANIMATED'
);

const prefersEvent = (project: ProjectDetails) => (
    ['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY'].includes(project.genre) ||
    Boolean(project.franchiseId || project.universeId)
);

export const getDefaultCinemaChainIdsForRegion = (
    project: ProjectDetails,
    regionId: BoxOfficeRegionId
): CinemaChainId[] => {
    const strategy = inferStrategy(project);

    if (prefersPrestige(project)) {
        if (regionId === 'NORTH_AMERICA' || regionId === 'EUROPE') return ['ARCLIGHT_GRID', 'EMPIRE_CINEMAS'];
        return ['NOVA_CIRCUIT'];
    }

    if (prefersFamily(project)) {
        if (regionId === 'ASIA' || regionId === 'SOUTH_AMERICA') return ['PRISM_HALLS', 'Z_CINEMAS'];
        return ['PRISM_HALLS', 'NOVA_CIRCUIT'];
    }

    if (strategy === 'REGIONAL') {
        return regionId === 'NORTH_AMERICA' || regionId === 'EUROPE'
            ? ['NOVA_CIRCUIT']
            : ['PRISM_HALLS'];
    }

    if (prefersEvent(project)) {
        if (regionId === 'ASIA') return ['Z_CINEMAS', 'CROWNSCREEN'];
        return ['EMPIRE_CINEMAS', 'CROWNSCREEN'];
    }

    return strategy === 'INTERNATIONAL'
        ? ['NOVA_CIRCUIT', 'Z_CINEMAS']
        : ['NOVA_CIRCUIT'];
};

const getGenreAudienceFit = (genre: Genre, chain: CinemaChain) => {
    if (['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY'].includes(genre)) {
        return chain.audienceStrengths.some(strength => strength === 'FRANCHISE' || strength === 'MASS') ? 1.08 : 0.95;
    }
    if (genre === 'ANIMATION') {
        return chain.audienceStrengths.includes('FAMILY') ? 1.12 : 0.94;
    }
    if (['DRAMA', 'BIOPIC', 'DOCUMENTARY'].includes(genre)) {
        return chain.audienceStrengths.some(strength => strength === 'PRESTIGE' || strength === 'URBAN') ? 1.12 : 0.88;
    }
    if (genre === 'ROMANCE') {
        return chain.audienceStrengths.some(strength => strength === 'FAMILY' || strength === 'STAR_DRIVEN') ? 1.06 : 0.98;
    }
    return 1;
};

const getRegionHoldModifier = (project: ProjectDetails, terms: CinemaChainRegionalTerms[], week: number) => {
    if (week <= 1 || terms.length === 0) return 1;

    const qualityScore = Number(project.hiddenStats?.qualityScore || 50);
    const averageVolatility = terms.reduce((sum, term) => sum + term.volatility, 0) / terms.length;
    const qualityHold = (qualityScore - 62) / 360;
    const volatilityDrag = averageVolatility * Math.min(0.16, 0.035 * (week - 1));

    return clamp(1 + qualityHold - volatilityDrag, 0.72, 1.1);
};

const getDistributionModifier = (project: ProjectDetails, totalScreens: number, expectedFootfall: number) => {
    const targetScreens = BUDGET_TARGET_SCREENS[project.budgetTier] || BUDGET_TARGET_SCREENS.MID;
    const screenRatio = totalScreens / Math.max(1, targetScreens);
    const underReleasePenalty = screenRatio < 0.7
        ? clamp((0.7 - screenRatio) * 0.42, 0, 0.28)
        : 0;
    const overscreeningPenalty = screenRatio > 1.75
        ? clamp((screenRatio - 1.75) * 0.065, 0, 0.18)
        : 0;
    const audienceFloor = expectedFootfall > 0
        ? clamp(expectedFootfall / Math.max(1, totalScreens * 620), 0.92, 1.08)
        : 0.96;
    const reachLift = clamp(Math.log1p(totalScreens / Math.max(1, targetScreens)) * 0.09, 0, 0.09);

    return {
        distributionModifier: clamp((1 - underReleasePenalty - overscreeningPenalty + reachLift) * audienceFloor, 0.62, 1.12),
        overscreeningPenalty,
        underReleasePenalty
    };
};

export const calculateTheatricalDistributionBreakdown = (
    project: ProjectDetails,
    worldwideGrossDemand: number,
    week: number
): TheatricalDistributionBreakdown => {
    const regionIds = getReleaseRegionIdsForProject(project);
    const chainSelections = normalizeDistributionChainSelections(project.releaseChainSelections);

    const rows = regionIds.map(regionId => {
        const region = BOX_OFFICE_REGIONS.find(item => item.id === regionId);
        if (!region) return null;

        const chainIds = chainSelections[regionId]?.length
            ? chainSelections[regionId]!
            : getDefaultCinemaChainIdsForRegion(project, regionId);
        const chainRows = chainIds
            .map(chainId => {
                const chain = getCinemaChainById(chainId);
                const terms = getCinemaChainTerms(chainId, regionId);
                if (!chain || !terms) return null;
                const genreFit = getGenreAudienceFit(project.genre, chain);
                const chainWeight = terms.screens * region.marketWeight * terms.footfallPower * genreFit;
                return { chain, terms, genreFit, chainWeight };
            })
            .filter((row): row is { chain: CinemaChain; terms: CinemaChainRegionalTerms; genreFit: number; chainWeight: number } => Boolean(row));

        if (chainRows.length === 0) return null;

        const totalScreens = chainRows.reduce((sum, row) => sum + row.terms.screens, 0);
        const expectedFootfall = Math.round(chainRows.reduce((sum, row) => (
            sum + (row.terms.screens * row.terms.footfallPower * region.marketWeight * 680)
        ), 0));
        const holdModifier = getRegionHoldModifier(project, chainRows.map(row => row.terms), week);
        const regionWeight = chainRows.reduce((sum, row) => sum + row.chainWeight, 0) * holdModifier;

        return {
            region,
            chainRows,
            totalScreens,
            expectedFootfall,
            holdModifier,
            regionWeight
        };
    }).filter((row): row is NonNullable<typeof row> => Boolean(row));

    const totalScreens = rows.reduce((sum, row) => sum + row.totalScreens, 0);
    const expectedFootfall = rows.reduce((sum, row) => sum + row.expectedFootfall, 0);
    const { distributionModifier, overscreeningPenalty, underReleasePenalty } = getDistributionModifier(project, totalScreens, expectedFootfall);
    const gross = Math.max(0, Math.floor(worldwideGrossDemand * distributionModifier));
    const totalWeight = rows.reduce((sum, row) => sum + row.regionWeight, 0) || 1;

    let allocatedGross = 0;
    const regionReceipts: TheatricalRegionReceipt[] = rows.map((row, regionIndex) => {
        const isLastRegion = regionIndex === rows.length - 1;
        const regionGross = isLastRegion
            ? Math.max(0, gross - allocatedGross)
            : Math.floor(gross * (row.regionWeight / totalWeight));
        allocatedGross += regionGross;

        const chainWeightTotal = row.chainRows.reduce((sum, chainRow) => sum + chainRow.chainWeight, 0) || 1;
        let allocatedRegionGross = 0;
        const chainReceipts: TheatricalChainReceipt[] = row.chainRows.map((chainRow, chainIndex) => {
            const isLastChain = chainIndex === row.chainRows.length - 1;
            const chainGross = isLastChain
                ? Math.max(0, regionGross - allocatedRegionGross)
                : Math.floor(regionGross * (chainRow.chainWeight / chainWeightTotal));
            allocatedRegionGross += chainGross;
            const exhibitorReceipts = Math.floor(chainGross * chainRow.terms.exhibitorCut);
            const studioReceipts = Math.max(0, chainGross - exhibitorReceipts);

            return {
                chainId: chainRow.chain.id,
                chainName: chainRow.chain.name,
                gross: chainGross,
                studioReceipts,
                exhibitorReceipts,
                screens: chainRow.terms.screens,
                expectedFootfall: Math.round(chainRow.terms.screens * chainRow.terms.footfallPower * row.region.marketWeight * 680),
                exhibitorCut: chainRow.terms.exhibitorCut
            };
        });

        const studioReceipts = chainReceipts.reduce((sum, receipt) => sum + receipt.studioReceipts, 0);
        const exhibitorReceipts = chainReceipts.reduce((sum, receipt) => sum + receipt.exhibitorReceipts, 0);
        const averageExhibitorCut = regionGross > 0 ? exhibitorReceipts / regionGross : 0;

        return {
            regionId: row.region.id,
            regionLabel: row.region.label,
            regionShortLabel: row.region.shortLabel,
            gross: regionGross,
            studioReceipts,
            exhibitorReceipts,
            screens: row.totalScreens,
            expectedFootfall: row.expectedFootfall,
            averageExhibitorCut,
            holdModifier: row.holdModifier,
            chainReceipts
        };
    });

    const studioReceipts = regionReceipts.reduce((sum, receipt) => sum + receipt.studioReceipts, 0);
    const exhibitorReceipts = regionReceipts.reduce((sum, receipt) => sum + receipt.exhibitorReceipts, 0);
    const averageExhibitorCut = gross > 0 ? exhibitorReceipts / gross : 0;

    return {
        week,
        gross,
        studioReceipts,
        exhibitorReceipts,
        totalScreens,
        expectedFootfall,
        averageExhibitorCut,
        studioShare: gross > 0 ? studioReceipts / gross : 0,
        distributionModifier,
        overscreeningPenalty,
        underReleasePenalty,
        regionReceipts
    };
};

const STREAMING_PLATFORM_REGION_BIAS: Record<PlatformId, Partial<Record<BoxOfficeRegionId, number>>> = {
    NETFLIX: {
        NORTH_AMERICA: 1.08,
        SOUTH_AMERICA: 1.08,
        EUROPE: 1,
        ASIA: 1.08,
        AFRICA: 0.92,
        OCEANIA: 0.9
    },
    APPLE_TV: {
        NORTH_AMERICA: 1.18,
        EUROPE: 1.12,
        OCEANIA: 1.02,
        ASIA: 0.86,
        SOUTH_AMERICA: 0.78,
        AFRICA: 0.68
    },
    DISNEY_PLUS: {
        NORTH_AMERICA: 1.1,
        EUROPE: 1.02,
        ASIA: 1.12,
        SOUTH_AMERICA: 1,
        OCEANIA: 0.95,
        AFRICA: 0.82
    },
    HULU: {
        NORTH_AMERICA: 1.46,
        EUROPE: 0.76,
        ASIA: 0.68,
        SOUTH_AMERICA: 0.62,
        AFRICA: 0.5,
        OCEANIA: 0.58
    },
    YOUTUBE: {
        ASIA: 1.28,
        SOUTH_AMERICA: 1.16,
        AFRICA: 1.12,
        NORTH_AMERICA: 1,
        EUROPE: 0.92,
        OCEANIA: 0.76
    }
};

const getStreamingGenreRegionFit = (project: ProjectDetails, regionId: BoxOfficeRegionId) => {
    if (project.genre === 'ANIMATION') {
        return regionId === 'ASIA' || regionId === 'NORTH_AMERICA' ? 1.08 : 1;
    }
    if (['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY'].includes(project.genre)) {
        return regionId === 'ASIA' || regionId === 'NORTH_AMERICA' || regionId === 'EUROPE' ? 1.08 : 0.96;
    }
    if (['DRAMA', 'BIOPIC', 'DOCUMENTARY'].includes(project.genre)) {
        return regionId === 'EUROPE' || regionId === 'NORTH_AMERICA' ? 1.1 : 0.9;
    }
    if (project.genre === 'ROMANCE') {
        return regionId === 'ASIA' || regionId === 'SOUTH_AMERICA' ? 1.08 : 0.98;
    }
    return 1;
};

export const calculateStreamingDistributionBreakdown = (
    project: ProjectDetails,
    platformId: PlatformId,
    weeklyViews: number,
    weeklyRevenue: number,
    week: number
): StreamingDistributionBreakdown => {
    const platform = PLATFORMS[platformId];
    const focusRegionIds = normalizeReleaseRegionIds(project.releaseRegionIds || []);
    const focusRegionSet = new Set<BoxOfficeRegionId>(focusRegionIds);
    const focusHasRegions = focusRegionSet.size > 0;

    const regionRows = BOX_OFFICE_REGIONS.map(region => {
        const platformBias = STREAMING_PLATFORM_REGION_BIAS[platformId]?.[region.id] || 1;
        const marketingFocus = focusHasRegions ? (focusRegionSet.has(region.id) ? 1.18 : 0.9) : 1;
        const genreFit = getStreamingGenreRegionFit(project, region.id);
        const retentionModifier = clamp(
            1 + ((Number(project.hiddenStats?.qualityScore || 50) - 58) / 420) - (week > 4 ? (week - 4) * 0.008 : 0),
            0.78,
            1.12
        );
        const weight = region.marketWeight * platformBias * genreFit * marketingFocus * retentionModifier;

        return {
            region,
            retentionModifier,
            weight
        };
    });
    const totalWeight = regionRows.reduce((sum, row) => sum + row.weight, 0) || 1;
    let allocatedViews = 0;
    let allocatedRevenue = 0;
    const safeViews = Math.max(0, Math.floor(weeklyViews));
    const safeRevenue = Math.max(0, Math.floor(weeklyRevenue));

    const regionBreakdowns = regionRows.map((row, index) => {
        const isLast = index === regionRows.length - 1;
        const views = isLast ? Math.max(0, safeViews - allocatedViews) : Math.floor(safeViews * (row.weight / totalWeight));
        const revenue = isLast ? Math.max(0, safeRevenue - allocatedRevenue) : Math.floor(safeRevenue * (row.weight / totalWeight));
        allocatedViews += views;
        allocatedRevenue += revenue;

        return {
            regionId: row.region.id,
            regionLabel: row.region.label,
            regionShortLabel: row.region.shortLabel,
            views,
            revenue,
            audienceShare: safeViews > 0 ? views / safeViews : 0,
            retentionModifier: row.retentionModifier
        };
    });
    const primaryRegion = regionBreakdowns.reduce((winner, region) => (
        region.views > winner.views ? region : winner
    ), regionBreakdowns[0]);
    const globalReachScore = Math.round(clamp(
        (platform.audienceMult * 32) + (regionBreakdowns.filter(region => region.audienceShare >= 0.08).length * 7),
        12,
        100
    ));

    return {
        week,
        platformId,
        views: safeViews,
        revenue: safeRevenue,
        primaryRegionId: primaryRegion?.regionId || 'NORTH_AMERICA',
        globalReachScore,
        regionBreakdowns
    };
};
