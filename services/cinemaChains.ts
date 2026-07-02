import type {
    BoxOfficeRegion,
    BoxOfficeRegionId,
    CinemaChain,
    CinemaChainAudienceStrength,
    CinemaChainId,
    CinemaChainRegionalTerms,
    ScreeningStrategy
} from '../types';

export const BOX_OFFICE_REGIONS: BoxOfficeRegion[] = [
    { id: 'NORTH_AMERICA', label: 'North America', shortLabel: 'NA', marketWeight: 1.18 },
    { id: 'SOUTH_AMERICA', label: 'South America', shortLabel: 'SA', marketWeight: 0.76 },
    { id: 'EUROPE', label: 'Europe', shortLabel: 'EU', marketWeight: 0.86 },
    { id: 'ASIA', label: 'Asia', shortLabel: 'AS', marketWeight: 1.32 },
    { id: 'AFRICA', label: 'Africa', shortLabel: 'AF', marketWeight: 0.56 },
    { id: 'OCEANIA', label: 'Oceania', shortLabel: 'OC', marketWeight: 0.3 }
];

const REGION_BASE_TERMS: Record<BoxOfficeRegionId, Omit<CinemaChainRegionalTerms, 'note'>> = {
    NORTH_AMERICA: { screens: 1700, exhibitorCut: 0.45, bookingCost: 3_700_000, footfallPower: 0.96, prestigeSupport: 0.64, volatility: 0.42 },
    SOUTH_AMERICA: { screens: 820, exhibitorCut: 0.41, bookingCost: 1_300_000, footfallPower: 0.83, prestigeSupport: 0.36, volatility: 0.5 },
    EUROPE: { screens: 1480, exhibitorCut: 0.44, bookingCost: 2_850_000, footfallPower: 0.88, prestigeSupport: 0.78, volatility: 0.35 },
    ASIA: { screens: 3020, exhibitorCut: 0.48, bookingCost: 5_900_000, footfallPower: 1.12, prestigeSupport: 0.42, volatility: 0.58 },
    AFRICA: { screens: 650, exhibitorCut: 0.42, bookingCost: 1_100_000, footfallPower: 0.68, prestigeSupport: 0.38, volatility: 0.5 },
    OCEANIA: { screens: 280, exhibitorCut: 0.42, bookingCost: 520_000, footfallPower: 0.46, prestigeSupport: 0.56, volatility: 0.3 }
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const makeRegionalTerms = ({
    screenMultiplier,
    cutShift,
    bookingMultiplier,
    footfallShift,
    prestigeShift,
    volatilityShift,
    note
}: {
    screenMultiplier: number;
    cutShift: number;
    bookingMultiplier: number;
    footfallShift: number;
    prestigeShift: number;
    volatilityShift: number;
    note: string;
}): Record<BoxOfficeRegionId, CinemaChainRegionalTerms> => {
    return Object.fromEntries(
        BOX_OFFICE_REGIONS.map(region => {
            const base = REGION_BASE_TERMS[region.id];
            const marketBias = region.marketWeight >= 0.8 ? 1.04 : region.marketWeight <= 0.4 ? 0.86 : 1;
            return [
                region.id,
                {
                    screens: Math.max(80, Math.round(base.screens * screenMultiplier * marketBias)),
                    exhibitorCut: Number(clamp(base.exhibitorCut + cutShift + ((region.marketWeight - 0.65) * 0.018), 0.32, 0.58).toFixed(2)),
                    bookingCost: Math.max(120_000, Math.round(base.bookingCost * bookingMultiplier * marketBias)),
                    footfallPower: Number(clamp(base.footfallPower + footfallShift + ((region.marketWeight - 0.65) * 0.08), 0.35, 1.25).toFixed(2)),
                    prestigeSupport: Number(clamp(base.prestigeSupport + prestigeShift, 0.15, 1.05).toFixed(2)),
                    volatility: Number(clamp(base.volatility + volatilityShift, 0.15, 0.9).toFixed(2)),
                    note
                }
            ];
        })
    ) as Record<BoxOfficeRegionId, CinemaChainRegionalTerms>;
};

const makeChain = (
    id: CinemaChainId,
    name: string,
    logoMark: string,
    brandColor: string,
    personality: string,
    globalReputation: number,
    audienceStrengths: CinemaChainAudienceStrength[],
    regionalConfig: Parameters<typeof makeRegionalTerms>[0]
): CinemaChain => ({
    id,
    name,
    logoMark,
    brandColor,
    personality,
    globalReputation,
    audienceStrengths,
    regionalTerms: makeRegionalTerms(regionalConfig)
});

export const CINEMA_CHAINS: CinemaChain[] = [
    makeChain(
        'EMPIRE_CINEMAS',
        'Empire Cinemas',
        'crown-gate',
        '#f6c85f',
        'Premium flagship circuit with polished lobbies, strong urban reach, and the highest trust with event audiences.',
        92,
        ['PREMIUM', 'FRANCHISE', 'URBAN'],
        { screenMultiplier: 1.08, cutShift: 0.035, bookingMultiplier: 1.22, footfallShift: 0.08, prestigeShift: 0.1, volatilityShift: -0.05, note: 'Premium access, high trust, higher exhibitor share.' }
    ),
    makeChain(
        'Z_CINEMAS',
        'Z Cinemas',
        'bolt-z',
        '#44d7ff',
        'Fast, loud, mass-market chain that can flood screens quickly but creates sharper week-two pressure.',
        84,
        ['MASS', 'YOUTH', 'STAR_DRIVEN'],
        { screenMultiplier: 1.2, cutShift: -0.015, bookingMultiplier: 0.9, footfallShift: 0.1, prestigeShift: -0.12, volatilityShift: 0.12, note: 'Huge mass reach with more volatile holds.' }
    ),
    makeChain(
        'NOVA_CIRCUIT',
        'Nova Circuit',
        'orbit',
        '#7cffe2',
        'Balanced global circuit built for reliable commercial coverage and clean reporting across territories.',
        80,
        ['MASS', 'FAMILY', 'URBAN'],
        { screenMultiplier: 1, cutShift: 0, bookingMultiplier: 1, footfallShift: 0.02, prestigeShift: 0.02, volatilityShift: -0.02, note: 'Balanced reach and predictable terms.' }
    ),
    makeChain(
        'PRISM_HALLS',
        'Prism Halls',
        'prism',
        '#ff7ad9',
        'Family-forward and star-driven circuit with strong matinee traffic and broad public appeal.',
        76,
        ['FAMILY', 'STAR_DRIVEN', 'MASS'],
        { screenMultiplier: 0.9, cutShift: -0.01, bookingMultiplier: 0.88, footfallShift: 0.04, prestigeShift: -0.02, volatilityShift: 0.02, note: 'Efficient family and star-driven footprint.' }
    ),
    makeChain(
        'ARCLIGHT_GRID',
        'ArcLight Grid',
        'arc-grid',
        '#bba5ff',
        'Prestige-leaning urban network that gives smaller runs credibility and strong critic-facing placement.',
        74,
        ['PRESTIGE', 'URBAN', 'PREMIUM'],
        { screenMultiplier: 0.62, cutShift: -0.035, bookingMultiplier: 0.72, footfallShift: -0.03, prestigeShift: 0.22, volatilityShift: -0.12, note: 'Lower screen count, cleaner prestige signal.' }
    ),
    makeChain(
        'CROWNSCREEN',
        'CrownScreen',
        'split-crown',
        '#76ff8a',
        'Event-friendly circuit with strong premium large-format rooms and dependable franchise traffic.',
        86,
        ['FRANCHISE', 'PREMIUM', 'MASS'],
        { screenMultiplier: 1.05, cutShift: 0.02, bookingMultiplier: 1.08, footfallShift: 0.06, prestigeShift: 0.04, volatilityShift: 0, note: 'Event-friendly premium rooms and strong franchise traffic.' }
    )
];

export const getCinemaChainById = (chainId: CinemaChainId): CinemaChain | undefined => (
    CINEMA_CHAINS.find(chain => chain.id === chainId)
);

export const getCinemaChainsForRegion = (regionId: BoxOfficeRegionId): CinemaChain[] => (
    CINEMA_CHAINS.filter(chain => Boolean(chain.regionalTerms[regionId]))
);

export const getCinemaChainTerms = (chainId: CinemaChainId, regionId: BoxOfficeRegionId): CinemaChainRegionalTerms | undefined => (
    getCinemaChainById(chainId)?.regionalTerms[regionId]
);

export const getScreeningStrategyChainPreview = (strategy: ScreeningStrategy): CinemaChain[] => {
    if (strategy === 'REGIONAL') {
        return ['ARCLIGHT_GRID', 'PRISM_HALLS'].map(id => getCinemaChainById(id as CinemaChainId)!).filter(Boolean);
    }
    if (strategy === 'NATIONAL') {
        return ['NOVA_CIRCUIT', 'EMPIRE_CINEMAS', 'Z_CINEMAS'].map(id => getCinemaChainById(id as CinemaChainId)!).filter(Boolean);
    }
    return ['EMPIRE_CINEMAS', 'Z_CINEMAS', 'NOVA_CIRCUIT', 'CROWNSCREEN'].map(id => getCinemaChainById(id as CinemaChainId)!).filter(Boolean);
};

export const getAverageRegionalTerms = (chain: CinemaChain): { screens: number; exhibitorCut: number; bookingCost: number; footfallPower: number } => {
    const terms = Object.values(chain.regionalTerms);
    const divisor = Math.max(1, terms.length);
    return {
        screens: Math.round(terms.reduce((sum, term) => sum + term.screens, 0) / divisor),
        exhibitorCut: Number((terms.reduce((sum, term) => sum + term.exhibitorCut, 0) / divisor).toFixed(2)),
        bookingCost: Math.round(terms.reduce((sum, term) => sum + term.bookingCost, 0) / divisor),
        footfallPower: Number((terms.reduce((sum, term) => sum + term.footfallPower, 0) / divisor).toFixed(2))
    };
};
