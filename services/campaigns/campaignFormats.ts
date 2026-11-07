/**
 * The campaign engine's formats (#145; plan §20.10 point 3, Zeesh: "बिल बोर्ड्स … फ्लायर्स … बिल्डिंग के ऊपर पोस्टर
 * रिवील … बुर्ज खलीफा के ऊपर लाइट शो … रेड बुल … मेट्रो के ऊपर प्रिंट"). Business-agnostic: a format is a way to put a
 * creative in front of people, priced the way media is bought.
 *  - `cpm`: the cost of a thousand impressions in a reference market (the country's own ad prices scale it);
 *  - `impact`: how much awareness one impression leaves (a light show on a landmark leaves far more than a feed ad);
 *  - `minWeekly`: the rate card (#154): what it costs a week in a country of 20M homes at reference ad prices, scaled
 *    by each country's homes and ad prices (so a week reads the same everywhere); a big moment's is the price of one
 *    show;
 *  - `budgets`: which budgets may carry it (always-on is online and app formats only; a big moment is a one-time burst;
 *    every format runs on weeks, #154);
 *  - `energy`: a big moment costs some energy as well as money (Zeesh: "बिग मोमेंट्स में हमारे पैसे के साथ थोड़ा सा
 *    एनर्जी भी लगे"). #154 (Zeesh: "building monument ke energy flat … capign commsiion karne ka sirf 5- 20
 *    energy"): it is added once to the 5 that commissioning any campaign costs, at most 20 in all;
 *  - `countries`: where it exists (a landmark, a city screen), otherwise everywhere;
 *  - `frame`: the creative's frame, width ÷ height (0 = no image: a drone show traces your logo); `scene`: its
 *    photo-real scene (#144 built two; #147 the rest).
 */
import type { CampaignBudget, CampaignFormatGroup, CampaignFormatId } from '../../types';

export interface CampaignFormat {
    id: CampaignFormatId;
    name: string;
    group: CampaignFormatGroup;
    line: string;
    cpm: number;
    impact: number;
    minWeekly: number;
    budgets: Array<CampaignBudget['kind']>;
    energy: number;
    countries?: string[];
    /** the landmark or screen in each country where it has one */
    sites?: Record<string, string>;
    frame: number;
    scene?: string;
}

const ONLINE: Array<CampaignBudget['kind']> = ['BURST', 'POT', 'ALWAYS_ON', 'WEEKS'];
const PLACED: Array<CampaignBudget['kind']> = ['BURST', 'POT', 'WEEKS'];
const MOMENT: Array<CampaignBudget['kind']> = ['BURST', 'WEEKS'];

export const LANDMARK_SITES: Record<string, string> = {
    AE: 'Burj Khalifa', US: 'Empire State Building', GB: 'London Eye', JP: 'Tokyo Tower', KR: 'Lotte World Tower',
    CN: 'Canton Tower', SG: 'Marina Bay Sands', TW: 'Taipei 101', MY: 'Petronas Towers', HK: 'Victoria Harbour',
};
export const CITY_SCREEN_SITES: Record<string, string> = {
    US: 'Times Square', GB: 'Piccadilly Circus', JP: 'Shibuya Crossing', KR: 'COEX K-Pop Square', HK: 'Causeway Bay',
    AE: 'Dubai Mall', IN: 'Mumbai, Lower Parel', BR: 'Avenida Paulista', DE: 'Berlin, Alexanderplatz', FR: 'Paris, Champs-Élysées',
};

export const CAMPAIGN_FORMATS: Record<CampaignFormatId, CampaignFormat> = {
    /* online and on screens: priced by the thousand, light per impression, always-on welcome */
    SOCIAL_FEED: { id: 'SOCIAL_FEED', name: 'Social feed', group: 'ONLINE', line: 'Posts and ads in every feed', cpm: 6, impact: 0.012, minWeekly: 40_000, budgets: ONLINE, energy: 0, frame: 1 },
    SHORT_VIDEO: { id: 'SHORT_VIDEO', name: 'Short video', group: 'ONLINE', line: 'Vertical cuts, sound on', cpm: 8, impact: 0.018, minWeekly: 50_000, budgets: ONLINE, energy: 0, frame: 9 / 16 },
    SEARCH: { id: 'SEARCH', name: 'Search ads', group: 'ONLINE', line: 'First when people look for it', cpm: 25, impact: 0.05, minWeekly: 25_000, budgets: ONLINE, energy: 0, frame: 0 },
    CREATORS: { id: 'CREATORS', name: 'Creators', group: 'ONLINE', line: 'Reviewers and fans who make it theirs', cpm: 20, impact: 0.04, minWeekly: 80_000, budgets: ONLINE, energy: 0, frame: 16 / 9 },
    CTV: { id: 'CTV', name: 'Connected TV', group: 'ONLINE', line: 'Ads on smart TVs and other apps', cpm: 30, impact: 0.05, minWeekly: 120_000, budgets: ONLINE, energy: 0, frame: 16 / 9 },
    /* out of home and broadcast: placed media, a burst or a pot */
    TV_SPOTS: { id: 'TV_SPOTS', name: 'TV spots', group: 'OUT_OF_HOME', line: 'Prime-time breaks', cpm: 15, impact: 0.04, minWeekly: 400_000, budgets: PLACED, energy: 0, frame: 16 / 9 },
    BILLBOARD: { id: 'BILLBOARD', name: 'Billboards', group: 'OUT_OF_HOME', line: 'Roadside and rooftop boards', cpm: 5, impact: 0.02, minWeekly: 150_000, budgets: PLACED, energy: 0, frame: 3, scene: 'CITY_BILLBOARD' },
    METRO_WRAP: { id: 'METRO_WRAP', name: 'Metro wraps', group: 'OUT_OF_HOME', line: 'Trains wrapped end to end', cpm: 6, impact: 0.022, minWeekly: 200_000, budgets: PLACED, energy: 0, frame: 8 },
    POSTER_WALL: { id: 'POSTER_WALL', name: 'Poster walls', group: 'OUT_OF_HOME', line: 'The same poster, forty times', cpm: 4, impact: 0.014, minWeekly: 60_000, budgets: PLACED, energy: 0, frame: 2 / 3 },
    FLYERS: { id: 'FLYERS', name: 'Flyers', group: 'OUT_OF_HOME', line: 'Hand to hand in busy streets', cpm: 12, impact: 0.01, minWeekly: 20_000, budgets: PLACED, energy: 0, frame: 2 / 3 },
    AIRPORT_SCREENS: { id: 'AIRPORT_SCREENS', name: 'Airport screens', group: 'OUT_OF_HOME', line: 'Gates and baggage halls', cpm: 9, impact: 0.02, minWeekly: 120_000, budgets: PLACED, energy: 0, frame: 9 / 16 },
    MALL_SCREENS: { id: 'MALL_SCREENS', name: 'Mall screens', group: 'OUT_OF_HOME', line: 'Atriums and escalators', cpm: 7, impact: 0.018, minWeekly: 80_000, budgets: PLACED, energy: 0, frame: 9 / 16 },
    CITY_SCREEN: { id: 'CITY_SCREEN', name: 'City screens', group: 'OUT_OF_HOME', line: 'The famous screens: Times Square, Piccadilly', cpm: 15, impact: 0.06, minWeekly: 400_000, budgets: PLACED, energy: 0, countries: Object.keys(CITY_SCREEN_SITES), sites: CITY_SCREEN_SITES, frame: 16 / 9 },
    /* big moments: one night, priced as a show, money and energy */
    BUILDING_REVEAL: { id: 'BUILDING_REVEAL', name: 'Building reveal', group: 'BIG_MOMENT', line: 'A tower-high poster unveiled', cpm: 10, impact: 0.08, minWeekly: 1_500_000, budgets: MOMENT, energy: 4, frame: 1 / 3 },
    LANDMARK_LIGHT_SHOW: { id: 'LANDMARK_LIGHT_SHOW', name: 'Landmark light show', group: 'BIG_MOMENT', line: 'The Burj Khalifa in your colours', cpm: 12, impact: 0.12, minWeekly: 3_000_000, budgets: MOMENT, energy: 8, countries: Object.keys(LANDMARK_SITES), sites: LANDMARK_SITES, frame: 1 / 6, scene: 'BURJ_KHALIFA' },
    DRONE_SHOW: { id: 'DRONE_SHOW', name: 'Drone show', group: 'BIG_MOMENT', line: 'A thousand drones draw your logo', cpm: 10, impact: 0.1, minWeekly: 2_000_000, budgets: MOMENT, energy: 6, frame: 0 },
    FAN_FESTIVAL: { id: 'FAN_FESTIVAL', name: 'Fan festival', group: 'BIG_MOMENT', line: 'A weekend for the fans, the cast on stage', cpm: 40, impact: 0.25, minWeekly: 2_500_000, budgets: MOMENT, energy: 6, frame: 16 / 9 },
    LIVE_SHOW: { id: 'LIVE_SHOW', name: 'Live stunt show', group: 'BIG_MOMENT', line: 'A Red Bull-style event, streamed live', cpm: 15, impact: 0.1, minWeekly: 2_000_000, budgets: MOMENT, energy: 5, frame: 16 / 9 },
};

export const CAMPAIGN_FORMAT_ORDER = Object.keys(CAMPAIGN_FORMATS) as CampaignFormatId[];

/** Whether a format exists in a country (a landmark light show needs a landmark). */
export const campaignFormatIn = (format: CampaignFormat, countryId: string): boolean => !format.countries || format.countries.includes(countryId);

/* #154: commissioning a campaign costs 5 energy; each big moment adds its own once; at most 20 in all */
export const CAMPAIGN_COMMISSION_ENERGY = 5;
export const CAMPAIGN_ENERGY_CAP = 20;
export const campaignCommissionEnergy = (formats: CampaignFormatId[]): number => Math.min(CAMPAIGN_ENERGY_CAP, CAMPAIGN_COMMISSION_ENERGY
    + [...new Set(formats)].filter(id => CAMPAIGN_FORMATS[id]?.group === 'BIG_MOMENT').reduce((sum, id) => sum + CAMPAIGN_FORMATS[id].energy, 0));

export interface CampaignMoment { formatId: CampaignFormatId; countryId: string; site: string | null }

/** What makes a campaign news (#149): its first big moment that has a place in its countries, else a famous screen,
    with where it happens. The launch campaign (#151) uses the same rule for its opening night. #154: a big moment
    happens where the campaign put it (`places`), else in the first of its countries where it exists. */
export const campaignMomentOf = (formats: CampaignFormatId[], countryIds: string[], places?: Partial<Record<CampaignFormatId, string>>): CampaignMoment | null => {
    const pick = (formatId: CampaignFormatId): CampaignMoment | null => {
        const format = CAMPAIGN_FORMATS[formatId];
        const placed = places?.[formatId];
        const countryId = placed && countryIds.includes(placed) && campaignFormatIn(format, placed) ? placed : countryIds.find(id => campaignFormatIn(format, id));
        return countryId ? { formatId, countryId, site: format.sites?.[countryId] ?? null } : null;
    };
    const moment = CAMPAIGN_FORMAT_ORDER.filter(id => CAMPAIGN_FORMATS[id].group === 'BIG_MOMENT' && formats.includes(id)).map(pick).find(Boolean);
    if (moment) return moment;
    return formats.includes('CITY_SCREEN') ? pick('CITY_SCREEN') : null;
};
