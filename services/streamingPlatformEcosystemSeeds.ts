import type {
    Genre,
    PlatformId,
    StreamingEcosystemOperatorKind,
    StreamingEcosystemOrigin,
    StreamingEcosystemLanguageCapability,
    StreamingEcosystemStartingClass,
} from '../types';

export interface StreamingEcosystemOperatorSeed {
    id: string;
    name: string;
    brandRegistryKey: string;
    kind: StreamingEcosystemOperatorKind;
    corePlatformId: PlatformId | null;
    origin: StreamingEcosystemOrigin;
    startingClass: StreamingEcosystemStartingClass;
    homeCountryId: string;
    activeCountryIds: string[];
    cashMillions: number;
    valuationBillions: number;
    subscriberMillions: number;
    technology: number;
    cataloguePower: number;
    localization: number;
    brandPower: number;
    prestige: number;
    efficiency: number;
    risk: number;
    preferredGenres: Genre[];
    languageCapabilities: StreamingEcosystemLanguageCapability[];
}

const lang = (
    languageId: string,
    subtitleLevel: 0 | 1 | 2 | 3,
    dubbingLevel: 0 | 1 | 2 | 3,
): StreamingEcosystemLanguageCapability => ({ languageId, subtitleLevel, dubbingLevel });

const seed = (
    id: string,
    name: string,
    kind: StreamingEcosystemOperatorKind,
    corePlatformId: PlatformId | null,
    origin: StreamingEcosystemOrigin,
    homeCountryId: string,
    activeCountryIds: string[],
    scores: [number, number, number, number, number, number, number, number, number],
    preferredGenres: Genre[],
    languageCapabilities: StreamingEcosystemLanguageCapability[],
): StreamingEcosystemOperatorSeed => ({
    id, name, brandRegistryKey: id, kind, corePlatformId, origin,
    startingClass: kind === 'CORE_GLOBAL' || kind === 'GLOBAL_REAL' ? 'GLOBAL_ENTRANT' : 'REGIONAL_CHALLENGER',
    homeCountryId, activeCountryIds,
    cashMillions: scores[0], valuationBillions: scores[1], subscriberMillions: scores[2],
    technology: scores[3], cataloguePower: scores[4], localization: scores[5],
    brandPower: scores[6], prestige: scores[7], efficiency: scores[8],
    risk: kind === 'DYNAMIC_FICTIONAL' ? 60 : 35,
    preferredGenres, languageCapabilities,
});

const ALL_MARKETS = ['US', 'CA', 'MX', 'BR', 'AR', 'CO', 'CL', 'GB', 'DE', 'FR', 'ES', 'IT', 'ZA', 'NG', 'EG', 'KE', 'IN', 'JP', 'KR', 'ID', 'TH', 'PH', 'AU', 'NZ'];

/**
 * Stable game-world company profiles. Financial and subscriber values are
 * balance inputs, not claims about live real-world company reporting.
 */
export const STREAMING_ECOSYSTEM_OPERATOR_SEEDS: StreamingEcosystemOperatorSeed[] = [
    seed('NETFLIX', 'Netflix', 'CORE_GLOBAL', 'NETFLIX', 'TECH_BACKED', 'US', ALL_MARKETS, [5000, 260, 260, 94, 94, 95, 96, 84, 91], ['THRILLER', 'CRIME', 'DRAMA'], [lang('english', 3, 3), lang('spanish', 3, 3), lang('hindi', 3, 3)]),
    seed('APPLE_TV', 'Apple TV+', 'CORE_GLOBAL', 'APPLE_TV', 'TECH_BACKED', 'US', ['US', 'CA', 'GB', 'DE', 'FR', 'IN', 'JP', 'KR', 'AU'], [20000, 2900, 45, 98, 72, 86, 88, 96, 94], ['DRAMA', 'SCI_FI', 'THRILLER'], [lang('english', 3, 3), lang('french', 3, 2), lang('japanese', 3, 2)]),
    seed('DISNEY_PLUS', 'Disney+', 'CORE_GLOBAL', 'DISNEY_PLUS', 'CONGLOMERATE_BACKED', 'US', ['US', 'CA', 'MX', 'BR', 'GB', 'DE', 'FR', 'IN', 'JP', 'AU'], [8000, 180, 150, 88, 95, 96, 95, 91, 88], ['ANIMATION', 'SUPERHERO', 'FANTASY'], [lang('english', 3, 3), lang('spanish', 3, 3), lang('hindi', 3, 3)]),
    seed('HULU', 'Hulu', 'CORE_GLOBAL', 'HULU', 'BROADCASTER_BACKED', 'US', ['US', 'JP'], [2000, 27, 48, 76, 82, 62, 79, 76, 80], ['COMEDY', 'DRAMA', 'CRIME'], [lang('english', 3, 2), lang('japanese', 2, 1)]),
    seed('YOUTUBE', 'YouTube', 'CORE_GLOBAL', 'YOUTUBE', 'TECH_BACKED', 'US', ALL_MARKETS, [15000, 1800, 2500, 99, 75, 88, 99, 65, 96], ['DOCUMENTARY', 'COMEDY', 'MUSICAL'], [lang('english', 3, 2), lang('spanish', 3, 2), lang('hindi', 3, 2)]),
    seed('PRIME_VIDEO', 'Prime Video', 'GLOBAL_REAL', null, 'CONGLOMERATE_BACKED', 'US', ALL_MARKETS, [12000, 1600, 210, 93, 91, 88, 94, 79, 91], ['ACTION', 'DRAMA', 'THRILLER'], [lang('english', 3, 3), lang('spanish', 3, 3), lang('hindi', 3, 3)]),

    seed('CRAVE', 'Crave', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'CA', ['CA'], [420, 3.2, 4, 72, 78, 82, 76, 84, 70], ['DRAMA', 'COMEDY', 'DOCUMENTARY'], [lang('english', 3, 3), lang('french', 3, 2)]),
    seed('VIX', 'ViX', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'MX', ['US', 'MX', 'AR', 'CO', 'CL'], [700, 5.2, 9, 75, 85, 94, 82, 72, 74], ['DRAMA', 'ROMANCE', 'COMEDY'], [lang('spanish', 3, 3)]),
    seed('GLOBOPLAY', 'Globoplay', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'BR', ['BR'], [800, 6.5, 8, 78, 92, 92, 91, 79, 76], ['DRAMA', 'ROMANCE', 'COMEDY'], [lang('portuguese', 3, 3)]),
    seed('NOW', 'NOW', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'GB', ['GB'], [900, 8, 6, 80, 84, 76, 82, 81, 77], ['DRAMA', 'CRIME', 'SPORTS'], [lang('english', 3, 3)]),
    seed('ITVX', 'ITVX', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'GB', ['GB'], [500, 4, 5, 74, 86, 72, 84, 76, 72], ['DRAMA', 'COMEDY', 'CRIME'], [lang('english', 3, 2)]),
    seed('RTL_PLUS', 'RTL+', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'DE', ['DE'], [650, 5, 5, 76, 84, 88, 81, 71, 73], ['DRAMA', 'CRIME', 'COMEDY'], [lang('german', 3, 3)]),
    seed('CANAL_PLUS', 'CANAL+', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'FR', ['FR'], [1400, 10, 8, 82, 91, 91, 89, 92, 80], ['DRAMA', 'THRILLER', 'SPORTS'], [lang('french', 3, 3)]),
    seed('MOVISTAR_PLUS', 'Movistar Plus+', 'REGIONAL_REAL', null, 'TELECOM_BACKED', 'ES', ['ES'], [950, 7, 5, 82, 86, 91, 86, 82, 78], ['DRAMA', 'SPORTS', 'THRILLER'], [lang('spanish', 3, 3), lang('catalan', 3, 2)]),
    seed('RAIPLAY', 'RaiPlay', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'IT', ['IT'], [500, 4, 7, 72, 89, 90, 88, 78, 69], ['DRAMA', 'DOCUMENTARY', 'COMEDY'], [lang('italian', 3, 3)]),
    seed('DSTV_STREAM', 'DStv Stream', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'ZA', ['ZA', 'NG', 'KE'], [750, 5, 7, 76, 86, 69, 89, 72, 74], ['SPORTS', 'DRAMA', 'DOCUMENTARY'], [lang('english', 3, 2), lang('zulu', 2, 1), lang('swahili', 2, 1)]),
    seed('SHAHID', 'Shahid', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'EG', ['EG'], [850, 6, 8, 80, 90, 94, 91, 82, 78], ['DRAMA', 'COMEDY', 'THRILLER'], [lang('arabic', 3, 3)]),
    seed('JIOHOTSTAR', 'JioHotstar', 'REGIONAL_REAL', null, 'CONGLOMERATE_BACKED', 'IN', ['IN'], [2400, 18, 120, 91, 96, 97, 98, 84, 88], ['SPORTS', 'DRAMA', 'ACTION'], [lang('hindi', 3, 3), lang('tamil', 3, 3), lang('telugu', 3, 3), lang('english', 3, 3)]),
    seed('ZEE5', 'ZEE5', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'IN', ['IN'], [700, 5, 20, 77, 89, 94, 87, 74, 72], ['DRAMA', 'ROMANCE', 'COMEDY'], [lang('hindi', 3, 3), lang('tamil', 3, 2), lang('telugu', 3, 2)]),
    seed('SONY_LIV', 'Sony LIV', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'IN', ['IN'], [750, 6, 18, 82, 88, 90, 88, 82, 76], ['SPORTS', 'DRAMA', 'CRIME'], [lang('hindi', 3, 3), lang('english', 3, 2)]),
    seed('U_NEXT', 'U-NEXT', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'JP', ['JP'], [1100, 8, 5, 86, 94, 96, 88, 85, 82], ['ANIMATION', 'DRAMA', 'DOCUMENTARY'], [lang('japanese', 3, 3)]),
    seed('ABEMA', 'ABEMA', 'REGIONAL_REAL', null, 'TECH_BACKED', 'JP', ['JP'], [650, 5, 7, 89, 84, 93, 89, 73, 84], ['ANIMATION', 'SPORTS', 'COMEDY'], [lang('japanese', 3, 3)]),
    seed('TVING', 'TVING', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'KR', ['KR'], [900, 7, 8, 85, 94, 96, 92, 87, 81], ['DRAMA', 'ROMANCE', 'COMEDY'], [lang('korean', 3, 3)]),
    seed('WAVVE', 'Wavve', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'KR', ['KR'], [620, 4.5, 5, 79, 88, 94, 82, 77, 74], ['DRAMA', 'CRIME', 'DOCUMENTARY'], [lang('korean', 3, 3)]),
    seed('COUPANG_PLAY', 'Coupang Play', 'REGIONAL_REAL', null, 'TECH_BACKED', 'KR', ['KR'], [1500, 12, 6, 93, 78, 91, 87, 75, 89], ['SPORTS', 'DRAMA', 'COMEDY'], [lang('korean', 3, 3)]),
    seed('VIU', 'Viu', 'REGIONAL_REAL', null, 'TELECOM_BACKED', 'ID', ['ID', 'TH', 'PH', 'ZA', 'EG'], [950, 7, 16, 85, 87, 94, 86, 78, 82], ['DRAMA', 'ROMANCE', 'COMEDY'], [lang('indonesian', 3, 2), lang('thai', 3, 2), lang('filipino', 3, 2), lang('arabic', 2, 1)]),
    seed('VIDIO', 'Vidio', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'ID', ['ID'], [650, 5, 8, 81, 91, 94, 91, 72, 77], ['SPORTS', 'DRAMA', 'COMEDY'], [lang('indonesian', 3, 3)]),
    seed('TRUE_ID', 'TrueID', 'REGIONAL_REAL', null, 'TELECOM_BACKED', 'TH', ['TH'], [550, 4, 7, 83, 86, 93, 89, 70, 78], ['DRAMA', 'SPORTS', 'COMEDY'], [lang('thai', 3, 3)]),
    seed('IWANT_TFC', 'iWantTFC', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'PH', ['PH'], [480, 3.5, 6, 76, 91, 91, 90, 75, 71], ['DRAMA', 'ROMANCE', 'COMEDY'], [lang('filipino', 3, 3), lang('english', 3, 2)]),
    seed('STAN', 'Stan', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'AU', ['AU'], [850, 6, 4, 84, 88, 76, 91, 87, 81], ['DRAMA', 'SPORTS', 'THRILLER'], [lang('english', 3, 3)]),
    seed('BINGE', 'Binge', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'AU', ['AU'], [620, 4.5, 3, 79, 84, 73, 85, 79, 75], ['DRAMA', 'COMEDY', 'CRIME'], [lang('english', 3, 3)]),
    seed('NEON', 'Neon', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'NZ', ['NZ'], [280, 2, 1.5, 74, 80, 70, 82, 78, 70], ['DRAMA', 'COMEDY', 'THRILLER'], [lang('english', 3, 3), lang('maori', 2, 1)]),
    seed('TVNZ_PLUS', 'TVNZ+', 'REGIONAL_REAL', null, 'BROADCASTER_BACKED', 'NZ', ['NZ'], [240, 1.8, 1.8, 72, 86, 72, 89, 73, 69], ['DRAMA', 'DOCUMENTARY', 'COMEDY'], [lang('english', 3, 2), lang('maori', 2, 1)]),
];

/** Stable local shares layered onto the existing global-rival market fixture. */
export const STREAMING_ECOSYSTEM_LOCAL_SHARE_SEEDS: Record<string, Record<string, number>> = {
    US: { VIX: 3 }, CA: { CRAVE: 11 }, MX: { VIX: 15 },
    BR: { GLOBOPLAY: 16 }, AR: { VIX: 9 }, CO: { VIX: 10 }, CL: { VIX: 8 },
    GB: { NOW: 9, ITVX: 7 }, DE: { RTL_PLUS: 10 }, FR: { CANAL_PLUS: 13 }, ES: { MOVISTAR_PLUS: 12 }, IT: { RAIPLAY: 11 },
    ZA: { DSTV_STREAM: 19, VIU: 5 }, NG: { DSTV_STREAM: 13 }, EG: { SHAHID: 20, VIU: 4 }, KE: { DSTV_STREAM: 11 },
    IN: { JIOHOTSTAR: 15, ZEE5: 7, SONY_LIV: 6 },
    JP: { U_NEXT: 15, ABEMA: 9 }, KR: { TVING: 15, WAVVE: 8, COUPANG_PLAY: 7 },
    ID: { VIDIO: 17, VIU: 9 }, TH: { TRUE_ID: 15, VIU: 8 }, PH: { IWANT_TFC: 14, VIU: 9 },
    AU: { STAN: 13, BINGE: 8 }, NZ: { NEON: 14, TVNZ_PLUS: 10 },
};

export const STREAMING_DAY_ONE_RIVAL_TO_ECOSYSTEM_ID: Record<string, string> = {
    NETFLIX: 'NETFLIX', DISNEY_PLUS: 'DISNEY_PLUS', AMAZON_PRIME: 'PRIME_VIDEO',
    APPLE_TV: 'APPLE_TV', HULU: 'HULU', YOUTUBE: 'YOUTUBE',
};
