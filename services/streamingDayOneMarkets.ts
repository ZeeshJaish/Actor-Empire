import { PRODUCTION_LOCATION_CATALOG } from './productionLocations';
import type {
    OwnedStreamingCountryLanguageShare,
    OwnedStreamingCountryMarketProfile,
    OwnedStreamingMarketCostBreakdown,
    StreamingMarketLocalizationPreference,
    StreamingMarketPrivacyComplianceLevel,
    StreamingMarketRightsAvailability,
} from '../types';

export type StreamingDayOneRegionId =
    | 'NORTH_AMERICA'
    | 'SOUTH_AMERICA'
    | 'EUROPE'
    | 'AFRICA'
    | 'ASIA'
    | 'OCEANIA';

export type StreamingMarketCompetition = 'OPEN' | 'BUSY' | 'FIERCE';
export type StreamingMarketGrowth = 'FAST' | 'STEADY' | 'MATURE';
export type StreamingMarketDifficulty = 'EASY' | 'MODERATE' | 'HARD';

export interface StreamingMarketRival {
    id: 'NETFLIX' | 'DISNEY_PLUS' | 'AMAZON_PRIME' | 'APPLE_TV' | 'HULU' | 'YOUTUBE';
    name: string;
    watchSharePercent: number;
}

export interface StreamingDayOneMarket {
    id: string;
    country: string;
    regionId: StreamingDayOneRegionId;
    streamingAudience: number;
    annualGrowthPercent: number;
    growth: StreamingMarketGrowth;
    openingRightsEstimate: number;
    languages: string[];
    competition: StreamingMarketCompetition;
    launchDifficulty: StreamingMarketDifficulty;
    localizationNote: string;
    marketNote: string;
    recommendedCityId: string;
    rivals: StreamingMarketRival[];
}

export const STREAMING_DAY_ONE_REGION_ORDER: StreamingDayOneRegionId[] = [
    'NORTH_AMERICA', 'SOUTH_AMERICA', 'EUROPE', 'AFRICA', 'ASIA', 'OCEANIA',
];

export const STREAMING_DAY_ONE_REGION_LABELS: Record<StreamingDayOneRegionId, string> = {
    NORTH_AMERICA: 'North America',
    SOUTH_AMERICA: 'South America',
    EUROPE: 'Europe',
    AFRICA: 'Africa',
    ASIA: 'Asia',
    OCEANIA: 'Oceania',
};

export interface StreamingDayOneCountryPresentation {
    localName: string;
}

const STREAMING_DAY_ONE_COUNTRY_PRESENTATION: Record<string, StreamingDayOneCountryPresentation> = {
    US: { localName: 'United States' },
    CA: { localName: 'Canada' },
    MX: { localName: 'México' },
    BR: { localName: 'Brasil' },
    AR: { localName: 'Argentina' },
    CO: { localName: 'Colombia' },
    CL: { localName: 'Chile' },
    GB: { localName: 'United Kingdom' },
    DE: { localName: 'Deutschland' },
    FR: { localName: 'France' },
    ES: { localName: 'España' },
    IT: { localName: 'Italia' },
    ZA: { localName: 'South Africa' },
    NG: { localName: 'Nigeria' },
    EG: { localName: 'مصر' },
    KE: { localName: 'Kenya' },
    IN: { localName: 'भारत' },
    JP: { localName: '日本' },
    KR: { localName: '대한민국' },
    ID: { localName: 'Indonesia' },
    TH: { localName: 'ประเทศไทย' },
    PH: { localName: 'Pilipinas' },
    AU: { localName: 'Australia' },
    NZ: { localName: 'Aotearoa' },
};

export type StreamingMarketTaxLoad = 'LOW' | 'BALANCED' | 'HIGH';
export type StreamingMarketApprovalLoad = 'LIGHT' | 'STANDARD' | 'STRICT';

export interface StreamingMarketEntryProfile {
    taxLoad: StreamingMarketTaxLoad;
    approvalLoad: StreamingMarketApprovalLoad;
    approvalWeeks: number;
    clearances: string[];
    localRule: string;
    plannedOverheadEstimate: number;
    consequence: string;
}

/**
 * Stable game-world planning profiles. They intentionally describe the player
 * consequence in plain language instead of claiming to reproduce live law or
 * tax advice. Build and rehearsal may consume these estimates later; founding
 * only previews them and never adds a surprise charge.
 */
const STREAMING_MARKET_ENTRY_PROFILES: Record<string, StreamingMarketEntryProfile> = {
    US: { taxLoad: 'HIGH', approvalLoad: 'STANDARD', approvalWeeks: 4, clearances: ['Privacy filing', 'Age ratings'], localRule: 'Consumer rules vary by state.', plannedOverheadEstimate: 5_000_000, consequence: 'Higher setup spend, but no national launch delay.' },
    CA: { taxLoad: 'BALANCED', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Privacy review', 'French support'], localRule: 'Quebec needs a credible French experience.', plannedOverheadEstimate: 2_000_000, consequence: 'A bilingual launch protects trust and reach.' },
    MX: { taxLoad: 'BALANCED', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Service registration', 'Age ratings'], localRule: 'Clear local pricing and Spanish support are expected.', plannedOverheadEstimate: 1_600_000, consequence: 'Moderate setup work with strong regional upside.' },
    BR: { taxLoad: 'HIGH', approvalLoad: 'STRICT', approvalWeeks: 4, clearances: ['Data handling review', 'Local billing registration'], localRule: 'Local payment and Portuguese support are essential.', plannedOverheadEstimate: 2_400_000, consequence: 'More launch work, followed by a very large audience.' },
    AR: { taxLoad: 'HIGH', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Tax registration', 'Consumer pricing review'], localRule: 'Pricing changes can move customers quickly.', plannedOverheadEstimate: 1_100_000, consequence: 'Protect margins carefully or churn will rise.' },
    CO: { taxLoad: 'BALANCED', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Service registration', 'Data filing'], localRule: 'Local drama and Spanish discovery improve trust.', plannedOverheadEstimate: 800_000, consequence: 'A manageable entry with good growth.' },
    CL: { taxLoad: 'BALANCED', approvalLoad: 'LIGHT', approvalWeeks: 2, clearances: ['Consumer registration'], localRule: 'Transparent local pricing is the main requirement.', plannedOverheadEstimate: 600_000, consequence: 'Fast approval and modest launch risk.' },
    GB: { taxLoad: 'HIGH', approvalLoad: 'STRICT', approvalWeeks: 5, clearances: ['Data privacy registration', 'Age-rating process', 'Catalogue reporting'], localRule: 'Local programming and viewer protection face close review.', plannedOverheadEstimate: 3_200_000, consequence: 'Prestige and trust are high, but mistakes draw attention.' },
    DE: { taxLoad: 'HIGH', approvalLoad: 'STRICT', approvalWeeks: 5, clearances: ['Data privacy review', 'Age ratings', 'Consumer terms'], localRule: 'Privacy and service reliability expectations are strict.', plannedOverheadEstimate: 2_800_000, consequence: 'Strong spending power with little tolerance for shortcuts.' },
    FR: { taxLoad: 'HIGH', approvalLoad: 'STRICT', approvalWeeks: 6, clearances: ['Catalogue declaration', 'Age ratings', 'Local works plan'], localRule: 'French-language and local-content commitments matter.', plannedOverheadEstimate: 3_000_000, consequence: 'A slower entry that rewards a serious local slate.' },
    ES: { taxLoad: 'BALANCED', approvalLoad: 'STRICT', approvalWeeks: 4, clearances: ['Catalogue filing', 'Age ratings'], localRule: 'Spanish support is required; regional languages add goodwill.', plannedOverheadEstimate: 1_800_000, consequence: 'Moderate cost with a useful bridge to Latin America.' },
    IT: { taxLoad: 'BALANCED', approvalLoad: 'STANDARD', approvalWeeks: 4, clearances: ['Service registration', 'Age ratings'], localRule: 'Italian dubbing and clear consumer terms are expected.', plannedOverheadEstimate: 1_700_000, consequence: 'Steady launch work with broad household appeal.' },
    ZA: { taxLoad: 'BALANCED', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Data registration', 'Age ratings'], localRule: 'Local-language discovery improves reach and trust.', plannedOverheadEstimate: 900_000, consequence: 'A practical regional base with room to expand.' },
    NG: { taxLoad: 'BALANCED', approvalLoad: 'STRICT', approvalWeeks: 5, clearances: ['Service licence', 'Local billing registration'], localRule: 'Mobile delivery and local film partnerships matter.', plannedOverheadEstimate: 1_000_000, consequence: 'More launch care unlocks explosive growth.' },
    EG: { taxLoad: 'BALANCED', approvalLoad: 'STRICT', approvalWeeks: 6, clearances: ['Content review', 'Service licence'], localRule: 'Arabic presentation and careful catalogue review are required.', plannedOverheadEstimate: 1_200_000, consequence: 'Higher delay risk, but access to a major language market.' },
    KE: { taxLoad: 'LOW', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Service registration'], localRule: 'Mobile reliability and clear local pricing matter most.', plannedOverheadEstimate: 500_000, consequence: 'Low entry cost and an open competitive field.' },
    IN: { taxLoad: 'HIGH', approvalLoad: 'STRICT', approvalWeeks: 6, clearances: ['Service registration', 'Content classification', 'Data review'], localRule: 'Many languages and audience sensitivities require local teams.', plannedOverheadEstimate: 4_500_000, consequence: 'The hardest launch work on the board—and the greatest scale.' },
    JP: { taxLoad: 'HIGH', approvalLoad: 'STRICT', approvalWeeks: 5, clearances: ['Consumer terms review', 'Age ratings'], localRule: 'Premium localization and dependable service are expected.', plannedOverheadEstimate: 3_400_000, consequence: 'High standards, high value and strong local rivals.' },
    KR: { taxLoad: 'HIGH', approvalLoad: 'STRICT', approvalWeeks: 5, clearances: ['Data review', 'Age ratings', 'Local billing'], localRule: 'Local originals and Korean presentation drive credibility.', plannedOverheadEstimate: 2_600_000, consequence: 'A demanding launch that can create worldwide hits.' },
    ID: { taxLoad: 'BALANCED', approvalLoad: 'STRICT', approvalWeeks: 5, clearances: ['Service registration', 'Content classification'], localRule: 'Mobile pricing and Indonesian support are essential.', plannedOverheadEstimate: 1_400_000, consequence: 'Manageable cost with strong growth potential.' },
    TH: { taxLoad: 'BALANCED', approvalLoad: 'STRICT', approvalWeeks: 4, clearances: ['Content classification', 'Service registration'], localRule: 'Thai presentation and local catalogue care build trust.', plannedOverheadEstimate: 1_000_000, consequence: 'Moderate work for a fast-growing audience.' },
    PH: { taxLoad: 'BALANCED', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Service registration', 'Consumer terms'], localRule: 'Mobile value and Filipino discovery support mass reach.', plannedOverheadEstimate: 900_000, consequence: 'A social, accessible market with modest entry friction.' },
    AU: { taxLoad: 'HIGH', approvalLoad: 'STANDARD', approvalWeeks: 3, clearances: ['Age ratings', 'Consumer terms review'], localRule: 'A deep local catalogue helps win saturated households.', plannedOverheadEstimate: 1_800_000, consequence: 'Easy operations, but expensive competition.' },
    NZ: { taxLoad: 'BALANCED', approvalLoad: 'LIGHT', approvalWeeks: 2, clearances: ['Service registration'], localRule: 'Māori support strengthens local trust.', plannedOverheadEstimate: 400_000, consequence: 'A small, low-risk companion to Australia.' },
};

const STREAMING_DAY_ONE_LANGUAGE_LABELS: Record<string, string> = {
    English: 'English',
    Spanish: 'Español',
    French: 'Français',
    Portuguese: 'Português',
    German: 'Deutsch',
    Catalan: 'Català',
    Italian: 'Italiano',
    Zulu: 'isiZulu',
    Afrikaans: 'Afrikaans',
    Hausa: 'Hausa',
    Yoruba: 'Yorùbá',
    Igbo: 'Igbo',
    Arabic: 'العربية',
    Swahili: 'Kiswahili',
    Hindi: 'हिन्दी',
    Tamil: 'தமிழ்',
    Telugu: 'తెలుగు',
    Bengali: 'বাংলা',
    Japanese: '日本語',
    Korean: '한국어',
    Indonesian: 'Bahasa Indonesia',
    Thai: 'ไทย',
    Filipino: 'Filipino',
    Māori: 'Māori',
};

export const getStreamingDayOneCountryPresentation = (marketId: string): StreamingDayOneCountryPresentation => (
    STREAMING_DAY_ONE_COUNTRY_PRESENTATION[String(marketId || '').trim().toUpperCase()]
    || { localName: '' }
);

export const getStreamingMarketEntryProfile = (marketId: string): StreamingMarketEntryProfile => (
    STREAMING_MARKET_ENTRY_PROFILES[String(marketId || '').trim().toUpperCase()]
    || {
        taxLoad: 'BALANCED',
        approvalLoad: 'STANDARD',
        approvalWeeks: 3,
        clearances: ['Service registration'],
        localRule: 'Clear local pricing and viewer protection are expected.',
        plannedOverheadEstimate: 750_000,
        consequence: 'A standard launch with manageable entry work.',
    }
);

export const getStreamingDayOneLanguageLabel = (language: string): string => (
    STREAMING_DAY_ONE_LANGUAGE_LABELS[language] || language
);

const rival = (
    id: StreamingMarketRival['id'],
    name: string,
    watchSharePercent: number,
): StreamingMarketRival => ({ id, name, watchSharePercent });

const netflix = (share: number) => rival('NETFLIX', 'Netflix', share);
const disney = (share: number) => rival('DISNEY_PLUS', 'Disney+', share);
const prime = (share: number) => rival('AMAZON_PRIME', 'Prime Video', share);
const apple = (share: number) => rival('APPLE_TV', 'Apple TV+', share);
const hulu = (share: number) => rival('HULU', 'Hulu', share);
const youtube = (share: number) => rival('YOUTUBE', 'YouTube', share);

/**
 * A balanced game-world market model, not a claim about live real-world market
 * research. Values are stable so a save never changes because a dashboard was
 * reopened or the real calendar moved on.
 */
export const STREAMING_DAY_ONE_MARKETS: StreamingDayOneMarket[] = [
    { id: 'US', country: 'United States', regionId: 'NORTH_AMERICA', streamingAudience: 225_000_000, annualGrowthPercent: 3, growth: 'MATURE', openingRightsEstimate: 48_000_000, languages: ['English', 'Spanish'], competition: 'FIERCE', launchDifficulty: 'HARD', localizationNote: 'English launch; Spanish audio widens household reach.', marketNote: 'Huge spending power, but every major rival protects this market.', recommendedCityId: 'LA', rivals: [netflix(24), prime(18), disney(15), hulu(10)] },
    { id: 'CA', country: 'Canada', regionId: 'NORTH_AMERICA', streamingAudience: 29_000_000, annualGrowthPercent: 4, growth: 'STEADY', openingRightsEstimate: 11_000_000, languages: ['English', 'French'], competition: 'BUSY', launchDifficulty: 'MODERATE', localizationNote: 'French support matters in Quebec.', marketNote: 'High subscription comfort and a manageable opening footprint.', recommendedCityId: 'TOR', rivals: [netflix(28), prime(17), disney(14), apple(7)] },
    { id: 'MX', country: 'Mexico', regionId: 'NORTH_AMERICA', streamingAudience: 73_000_000, annualGrowthPercent: 9, growth: 'FAST', openingRightsEstimate: 14_000_000, languages: ['Spanish'], competition: 'BUSY', launchDifficulty: 'MODERATE', localizationNote: 'Neutral Spanish dubbing travels well across the region.', marketNote: 'A large, fast-growing audience with strong local-content demand.', recommendedCityId: 'MEX', rivals: [netflix(30), prime(19), disney(16), youtube(9)] },

    { id: 'BR', country: 'Brazil', regionId: 'SOUTH_AMERICA', streamingAudience: 108_000_000, annualGrowthPercent: 10, growth: 'FAST', openingRightsEstimate: 18_000_000, languages: ['Portuguese'], competition: 'BUSY', launchDifficulty: 'MODERATE', localizationNote: 'Brazilian Portuguese dubbing is essential.', marketNote: 'The continent’s biggest opening audience and a powerful fandom culture.', recommendedCityId: 'RIO', rivals: [netflix(31), prime(20), disney(15), youtube(8)] },
    { id: 'AR', country: 'Argentina', regionId: 'SOUTH_AMERICA', streamingAudience: 26_000_000, annualGrowthPercent: 7, growth: 'STEADY', openingRightsEstimate: 7_000_000, languages: ['Spanish'], competition: 'BUSY', launchDifficulty: 'MODERATE', localizationNote: 'Regional Spanish works; local pricing is sensitive.', marketNote: 'Engaged viewers, but price changes can move subscribers quickly.', recommendedCityId: 'BUE', rivals: [netflix(34), prime(18), disney(14), youtube(9)] },
    { id: 'CO', country: 'Colombia', regionId: 'SOUTH_AMERICA', streamingAudience: 30_000_000, annualGrowthPercent: 11, growth: 'FAST', openingRightsEstimate: 6_000_000, languages: ['Spanish'], competition: 'OPEN', launchDifficulty: 'MODERATE', localizationNote: 'Spanish launch; local drama improves discovery.', marketNote: 'Good growth and lower opening costs than the largest markets.', recommendedCityId: 'BOG', rivals: [netflix(29), prime(16), disney(12), youtube(10)] },
    { id: 'CL', country: 'Chile', regionId: 'SOUTH_AMERICA', streamingAudience: 13_000_000, annualGrowthPercent: 6, growth: 'STEADY', openingRightsEstimate: 4_000_000, languages: ['Spanish'], competition: 'OPEN', launchDifficulty: 'EASY', localizationNote: 'Regional Spanish is enough for day one.', marketNote: 'Smaller audience, dependable payments, easier opening.', recommendedCityId: 'BUE', rivals: [netflix(32), prime(17), disney(13), apple(6)] },

    { id: 'GB', country: 'United Kingdom', regionId: 'EUROPE', streamingAudience: 49_000_000, annualGrowthPercent: 3, growth: 'MATURE', openingRightsEstimate: 20_000_000, languages: ['English'], competition: 'FIERCE', launchDifficulty: 'HARD', localizationNote: 'No dubbing needed; local programming expectations are high.', marketNote: 'Prestige market with fierce rivals and strong press influence.', recommendedCityId: 'LDN', rivals: [netflix(25), prime(21), disney(14), apple(9)] },
    { id: 'DE', country: 'Germany', regionId: 'EUROPE', streamingAudience: 56_000_000, annualGrowthPercent: 5, growth: 'STEADY', openingRightsEstimate: 17_000_000, languages: ['German'], competition: 'BUSY', launchDifficulty: 'HARD', localizationNote: 'High-quality German dubbing is expected.', marketNote: 'Large paying audience with strict privacy and service expectations.', recommendedCityId: 'BER', rivals: [netflix(27), prime(23), disney(12), apple(7)] },
    { id: 'FR', country: 'France', regionId: 'EUROPE', streamingAudience: 45_000_000, annualGrowthPercent: 5, growth: 'STEADY', openingRightsEstimate: 16_000_000, languages: ['French'], competition: 'BUSY', launchDifficulty: 'HARD', localizationNote: 'French dubbing and local-content commitments matter.', marketNote: 'Strong cinema culture rewards a serious local slate.', recommendedCityId: 'PAR', rivals: [netflix(29), prime(16), disney(14), apple(6)] },
    { id: 'ES', country: 'Spain', regionId: 'EUROPE', streamingAudience: 32_000_000, annualGrowthPercent: 6, growth: 'STEADY', openingRightsEstimate: 10_000_000, languages: ['Spanish', 'Catalan'], competition: 'BUSY', launchDifficulty: 'MODERATE', localizationNote: 'Spanish dubbing required; Catalan adds goodwill.', marketNote: 'Strong series audience and a useful bridge to Latin America.', recommendedCityId: 'MAD', rivals: [netflix(31), prime(20), disney(13), apple(6)] },
    { id: 'IT', country: 'Italy', regionId: 'EUROPE', streamingAudience: 37_000_000, annualGrowthPercent: 6, growth: 'STEADY', openingRightsEstimate: 11_000_000, languages: ['Italian'], competition: 'BUSY', launchDifficulty: 'MODERATE', localizationNote: 'Italian dubbing is a day-one expectation.', marketNote: 'Broad household audience with room for local originals.', recommendedCityId: 'ROM', rivals: [netflix(30), prime(21), disney(13), apple(5)] },

    { id: 'ZA', country: 'South Africa', regionId: 'AFRICA', streamingAudience: 24_000_000, annualGrowthPercent: 12, growth: 'FAST', openingRightsEstimate: 6_000_000, languages: ['English', 'Zulu', 'Afrikaans'], competition: 'OPEN', launchDifficulty: 'MODERATE', localizationNote: 'English opens the door; local subtitles grow trust.', marketNote: 'Best-developed opening base in the region with good expansion potential.', recommendedCityId: 'CPT', rivals: [netflix(28), prime(13), disney(9), youtube(12)] },
    { id: 'NG', country: 'Nigeria', regionId: 'AFRICA', streamingAudience: 31_000_000, annualGrowthPercent: 19, growth: 'FAST', openingRightsEstimate: 5_000_000, languages: ['English', 'Hausa', 'Yoruba', 'Igbo'], competition: 'OPEN', launchDifficulty: 'HARD', localizationNote: 'English works; local-language discovery unlocks scale.', marketNote: 'Explosive mobile growth and a powerful local film industry.', recommendedCityId: 'LAG', rivals: [netflix(20), prime(11), youtube(18), disney(5)] },
    { id: 'EG', country: 'Egypt', regionId: 'AFRICA', streamingAudience: 28_000_000, annualGrowthPercent: 14, growth: 'FAST', openingRightsEstimate: 6_000_000, languages: ['Arabic'], competition: 'OPEN', launchDifficulty: 'HARD', localizationNote: 'Arabic dubbing and careful local review are required.', marketNote: 'A gateway to Arabic-speaking audiences with higher launch care.', recommendedCityId: 'CAI', rivals: [netflix(22), prime(12), youtube(16), disney(8)] },
    { id: 'KE', country: 'Kenya', regionId: 'AFRICA', streamingAudience: 14_000_000, annualGrowthPercent: 17, growth: 'FAST', openingRightsEstimate: 3_000_000, languages: ['English', 'Swahili'], competition: 'OPEN', launchDifficulty: 'MODERATE', localizationNote: 'English and Swahili subtitles cover most viewers.', marketNote: 'Mobile-first audience and a relatively open competitive field.', recommendedCityId: 'LAG', rivals: [netflix(18), youtube(20), prime(9), disney(5)] },

    { id: 'IN', country: 'India', regionId: 'ASIA', streamingAudience: 310_000_000, annualGrowthPercent: 16, growth: 'FAST', openingRightsEstimate: 34_000_000, languages: ['Hindi', 'Tamil', 'Telugu', 'Bengali', 'English'], competition: 'FIERCE', launchDifficulty: 'HARD', localizationNote: 'Multi-language dubbing is essential for national reach.', marketNote: 'Enormous scale, fierce pricing, and many distinct audience cultures.', recommendedCityId: 'BOM', rivals: [prime(19), netflix(17), disney(16), youtube(15)] },
    { id: 'JP', country: 'Japan', regionId: 'ASIA', streamingAudience: 67_000_000, annualGrowthPercent: 6, growth: 'STEADY', openingRightsEstimate: 22_000_000, languages: ['Japanese'], competition: 'FIERCE', launchDifficulty: 'HARD', localizationNote: 'Premium Japanese dubbing and subtitles are expected.', marketNote: 'High-value audience with strong local anime and drama rivals.', recommendedCityId: 'TOK', rivals: [netflix(23), prime(22), disney(11), apple(7)] },
    { id: 'KR', country: 'South Korea', regionId: 'ASIA', streamingAudience: 39_000_000, annualGrowthPercent: 8, growth: 'STEADY', openingRightsEstimate: 14_000_000, languages: ['Korean'], competition: 'BUSY', launchDifficulty: 'HARD', localizationNote: 'Korean localization and local originals drive credibility.', marketNote: 'A trend-setting export market where hits can travel worldwide.', recommendedCityId: 'SEO', rivals: [netflix(31), youtube(13), disney(11), prime(9)] },
    { id: 'ID', country: 'Indonesia', regionId: 'ASIA', streamingAudience: 95_000_000, annualGrowthPercent: 18, growth: 'FAST', openingRightsEstimate: 10_000_000, languages: ['Indonesian'], competition: 'OPEN', launchDifficulty: 'MODERATE', localizationNote: 'Indonesian subtitles are essential; dubbing helps families.', marketNote: 'Large mobile audience with strong growth and price sensitivity.', recommendedCityId: 'BKK', rivals: [netflix(19), prime(12), disney(10), youtube(18)] },
    { id: 'TH', country: 'Thailand', regionId: 'ASIA', streamingAudience: 34_000_000, annualGrowthPercent: 13, growth: 'FAST', openingRightsEstimate: 7_000_000, languages: ['Thai'], competition: 'OPEN', launchDifficulty: 'MODERATE', localizationNote: 'Thai subtitles are required; dubbing lifts family viewing.', marketNote: 'Fast growth with strong demand for Asian drama and variety.', recommendedCityId: 'BKK', rivals: [netflix(23), youtube(17), prime(10), disney(8)] },
    { id: 'PH', country: 'Philippines', regionId: 'ASIA', streamingAudience: 48_000_000, annualGrowthPercent: 15, growth: 'FAST', openingRightsEstimate: 7_000_000, languages: ['Filipino', 'English'], competition: 'OPEN', launchDifficulty: 'MODERATE', localizationNote: 'English works widely; Filipino localization improves mass reach.', marketNote: 'Social, mobile audience that responds strongly to fandom.', recommendedCityId: 'HKG', rivals: [netflix(24), youtube(20), disney(10), prime(9)] },

    { id: 'AU', country: 'Australia', regionId: 'OCEANIA', streamingAudience: 20_000_000, annualGrowthPercent: 4, growth: 'MATURE', openingRightsEstimate: 9_000_000, languages: ['English'], competition: 'FIERCE', launchDifficulty: 'MODERATE', localizationNote: 'No dubbing needed; local catalog depth matters.', marketNote: 'High subscription use, but most households already know the rivals.', recommendedCityId: 'SYD', rivals: [netflix(26), prime(20), disney(15), apple(8)] },
    { id: 'NZ', country: 'New Zealand', regionId: 'OCEANIA', streamingAudience: 4_000_000, annualGrowthPercent: 4, growth: 'MATURE', openingRightsEstimate: 2_000_000, languages: ['English', 'Māori'], competition: 'BUSY', launchDifficulty: 'EASY', localizationNote: 'English launch; Māori support builds local trust.', marketNote: 'Small, stable audience that pairs naturally with Australia.', recommendedCityId: 'AKL', rivals: [netflix(28), prime(19), disney(14), apple(7)] },
];

const MARKET_BY_ID = new Map(STREAMING_DAY_ONE_MARKETS.map(market => [market.id, market]));
const VALID_CITY_IDS = new Set(PRODUCTION_LOCATION_CATALOG.map(city => city.id));

export const normalizeStreamingDayOneMarketIds = (value: unknown, limit = 40): string[] => Array.from(new Set(
    (Array.isArray(value) ? value : [])
        .map(item => String(item || '').trim().toUpperCase())
        .filter(id => MARKET_BY_ID.has(id)),
)).slice(0, limit);

export const getStreamingDayOneMarket = (id: string): StreamingDayOneMarket | null => (
    MARKET_BY_ID.get(String(id || '').trim().toUpperCase()) || null
);

const COUNTRY_LOCAL_CONTENT: Record<string, number> = {
    CA: 20, MX: 10, BR: 12, GB: 10, DE: 15, FR: 30, ES: 20, IT: 15,
    ZA: 10, NG: 12, EG: 10, IN: 20, JP: 10, KR: 20, ID: 10, AU: 10, NZ: 10,
};

const COUNTRY_LEVY: Record<string, number> = {
    US: 1, CA: 3, MX: 2, BR: 3, AR: 2.5, CO: 2, CL: 1.5,
    GB: 3, DE: 4, FR: 5, ES: 4, IT: 3.5,
    ZA: 2, NG: 2, EG: 2.5, KE: 1, IN: 3, JP: 2.5, KR: 3,
    ID: 2, TH: 2, PH: 1.5, AU: 3, NZ: 2,
};

const languageDistributionFor = (languages: string[]): OwnedStreamingCountryLanguageShare[] => {
    if (languages.length <= 1) return languages.map(language => ({ language, audiencePercent: 100 }));
    const primary = languages.length >= 5 ? 46 : languages.length === 4 ? 55 : languages.length === 3 ? 66 : 76;
    const remaining = 100 - primary;
    const base = Math.floor(remaining / (languages.length - 1));
    return languages.map((language, index) => ({
        language,
        audiencePercent: index === 0
            ? primary
            : base + (index === languages.length - 1 ? remaining - base * (languages.length - 1) : 0),
    }));
};

const localizationPreferenceFor = (market: StreamingDayOneMarket): StreamingMarketLocalizationPreference => {
    const note = market.localizationNote.toLowerCase();
    if (note.includes('dubbing is essential') || note.includes('dubbing required') || note.includes('dubbing is a day-one')) return 'DUB_FIRST';
    if (note.includes('subtitles are essential') || note.includes('subtitles are required')) return 'SUBTITLE_FIRST';
    if (note.includes('no dubbing needed') || market.languages.length === 1 && market.languages[0] === 'English') return 'ORIGINAL_AUDIO';
    return 'MIXED';
};

const rightsAvailabilityFor = (competition: StreamingMarketCompetition): StreamingMarketRightsAvailability => (
    competition === 'FIERCE' ? 'TIGHT' : competition === 'BUSY' ? 'LIMITED' : 'OPEN'
);

const privacyLevelFor = (profile: StreamingMarketEntryProfile): StreamingMarketPrivacyComplianceLevel => {
    const requirements = `${profile.clearances.join(' ')} ${profile.localRule}`.toLowerCase();
    if (requirements.includes('privacy') || requirements.includes('data review') || profile.approvalLoad === 'STRICT') return 'STRICT';
    return profile.approvalLoad === 'STANDARD' ? 'ENHANCED' : 'STANDARD';
};

const entryCostsFor = (market: StreamingDayOneMarket, profile: StreamingMarketEntryProfile): OwnedStreamingMarketCostBreakdown => {
    const rights = Math.max(0, Math.round(market.openingRightsEstimate));
    const compliance = Math.max(0, Math.round(profile.plannedOverheadEstimate));
    return { rights, compliance, localization: 0, infrastructure: 0, other: 0, total: rights + compliance };
};

/**
 * Canonical, deterministic country dossier used by both opening launch and all
 * later expansion. Localization here describes audience preference only; the
 * platform still has to build or outsource the capability separately.
 */
export const getStreamingCountryMarketProfile = (id: string): OwnedStreamingCountryMarketProfile | null => {
    const market = getStreamingDayOneMarket(id);
    if (!market) return null;
    const entry = getStreamingMarketEntryProfile(market.id);
    const taxBaselinePercent = entry.taxLoad === 'HIGH' ? 24 : entry.taxLoad === 'LOW' ? 12 : 18;
    const audienceMillions = market.streamingAudience / 1_000_000;
    const edgeSites = Math.max(1, Math.min(8, Math.ceil(audienceMillions / 55)));
    const peakConcurrentStreams = Math.max(45_000, Math.round(market.streamingAudience * 0.012));
    const bandwidthGbps = Math.max(180, Math.round(peakConcurrentStreams * 0.0045));
    const approval = Math.max(4, Math.min(6, entry.approvalWeeks));
    return {
        countryId: market.id,
        country: market.country,
        regionId: market.regionId,
        audienceSize: market.streamingAudience,
        annualGrowthPercent: market.annualGrowthPercent,
        languageDistribution: languageDistributionFor(market.languages),
        localizationPreference: localizationPreferenceFor(market),
        competitors: market.rivals.map(rivalEntry => ({ ...rivalEntry })),
        rightsAvailability: rightsAvailabilityFor(market.competition),
        entryCosts: entryCostsFor(market, entry),
        approvalPeriodWeeks: { minimum: Math.max(4, approval - 1), maximum: Math.min(6, approval + 1) },
        taxBaselinePercent,
        streamingLevyBaselinePercent: COUNTRY_LEVY[market.id] ?? 2,
        localContentObligationPercent: COUNTRY_LOCAL_CONTENT[market.id] ?? 5,
        privacyComplianceLevel: privacyLevelFor(entry),
        complianceRequirements: [...entry.clearances],
        recommendedNetworkFootprint: {
            recommendedCityId: market.recommendedCityId,
            edgeSites,
            originCapacitySharePercent: Math.max(5, Math.min(45, Math.round(audienceMillions / 8))),
            peakConcurrentStreams,
            bandwidthGbps,
        },
    };
};

export const getStreamingDayOneMarketsForRegion = (
    regionId: StreamingDayOneRegionId,
): StreamingDayOneMarket[] => STREAMING_DAY_ONE_MARKETS.filter(market => market.regionId === regionId);

export const getStreamingDayOneRegionIds = (marketIds: string[]): StreamingDayOneRegionId[] => {
    const selected = new Set(normalizeStreamingDayOneMarketIds(marketIds)
        .map(id => MARKET_BY_ID.get(id)?.regionId)
        .filter((id): id is StreamingDayOneRegionId => Boolean(id)));
    return STREAMING_DAY_ONE_REGION_ORDER.filter(id => selected.has(id));
};

export interface StreamingDayOneMarketSummary {
    marketCount: number;
    regionCount: number;
    streamingAudience: number;
    openingRightsEstimate: number;
    languageCount: number;
    averageGrowthPercent: number;
    competition: StreamingMarketCompetition;
    launchDifficulty: StreamingMarketDifficulty;
    verdict: string;
    topRivals: Array<StreamingMarketRival & { weightedShare: number }>;
}

export const summarizeStreamingDayOneMarkets = (marketIds: string[]): StreamingDayOneMarketSummary => {
    const markets = normalizeStreamingDayOneMarketIds(marketIds)
        .map(id => MARKET_BY_ID.get(id))
        .filter((market): market is StreamingDayOneMarket => Boolean(market));
    const streamingAudience = markets.reduce((sum, market) => sum + market.streamingAudience, 0);
    const openingRightsEstimate = markets.reduce((sum, market) => sum + market.openingRightsEstimate, 0);
    const weightedGrowth = markets.reduce((sum, market) => sum + market.annualGrowthPercent * market.streamingAudience, 0);
    const languages = new Set(markets.flatMap(market => market.languages));
    const difficultyScore = markets.reduce((sum, market) => sum + (market.launchDifficulty === 'HARD' ? 3 : market.launchDifficulty === 'MODERATE' ? 2 : 1), 0);
    const competitionScore = markets.reduce((sum, market) => sum + (market.competition === 'FIERCE' ? 3 : market.competition === 'BUSY' ? 2 : 1), 0);
    const rivalWeights = new Map<StreamingMarketRival['id'], { name: string; total: number }>();
    markets.forEach(market => market.rivals.forEach(entry => {
        const previous = rivalWeights.get(entry.id) || { name: entry.name, total: 0 };
        previous.total += entry.watchSharePercent * market.streamingAudience;
        rivalWeights.set(entry.id, previous);
    }));
    const averageDifficulty = markets.length ? difficultyScore / markets.length : 0;
    const averageCompetition = markets.length ? competitionScore / markets.length : 0;
    const regionCount = getStreamingDayOneRegionIds(markets.map(market => market.id)).length;
    const launchDifficulty: StreamingMarketDifficulty = averageDifficulty >= 2.5 ? 'HARD' : averageDifficulty >= 1.6 ? 'MODERATE' : 'EASY';
    const competition: StreamingMarketCompetition = averageCompetition >= 2.5 ? 'FIERCE' : averageCompetition >= 1.6 ? 'BUSY' : 'OPEN';
    const verdict = markets.length === 0
        ? 'Choose where viewers can subscribe on day one.'
        : regionCount >= 4
            ? 'A bold worldwide opening. Rights, languages and launch marketing will be expensive.'
            : launchDifficulty === 'HARD'
                ? 'A high-reward opening. Expect stronger rivals and more launch work.'
                : markets.some(market => market.growth === 'FAST')
                    ? 'A growth-first opening with room to win early loyalty.'
                    : 'A focused opening with a manageable first audience.';
    return {
        marketCount: markets.length,
        regionCount,
        streamingAudience,
        openingRightsEstimate,
        languageCount: languages.size,
        averageGrowthPercent: streamingAudience ? weightedGrowth / streamingAudience : 0,
        competition,
        launchDifficulty,
        verdict,
        topRivals: [...rivalWeights.entries()]
            .map(([id, value]) => ({ id, name: value.name, watchSharePercent: 0, weightedShare: streamingAudience ? value.total / streamingAudience : 0 }))
            .sort((a, b) => b.weightedShare - a.weightedShare)
            .slice(0, 4),
    };
};

export const getRecommendedStreamingCoreCityIds = (marketIds: string[], limit = 3): string[] => {
    const selected = normalizeStreamingDayOneMarketIds(marketIds)
        .map(id => MARKET_BY_ID.get(id))
        .filter((market): market is StreamingDayOneMarket => Boolean(market))
        .sort((a, b) => b.streamingAudience - a.streamingAudience);
    const selectedRegions = new Set<StreamingDayOneRegionId>();
    const cityIds: string[] = [];
    for (const market of selected) {
        if (selectedRegions.has(market.regionId) || !VALID_CITY_IDS.has(market.recommendedCityId)) continue;
        selectedRegions.add(market.regionId);
        cityIds.push(market.recommendedCityId);
        if (cityIds.length >= limit) break;
    }
    if (!cityIds.length) cityIds.push('LA');
    return cityIds;
};
