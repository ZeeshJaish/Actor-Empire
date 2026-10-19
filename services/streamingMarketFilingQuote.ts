import { WORLD_COUNTRY_DEFINITIONS_BY_ID } from './worldEconomy/worldCountryRegistry';

/** Fixed country tiers. Filing separately, by group or together costs the same.
 * These IDs are balance decisions, independent of UI layout and live audience.
 */
const MAJOR_MARKETS = new Set(['US', 'MX', 'BR', 'DE', 'IN', 'JP', 'ID', 'CN', 'RU', 'PK', 'BD']);
const FEATURED_MARKETS = new Set(['CA', 'AR', 'CL', 'CO', 'GB', 'FR', 'IT', 'ES', 'EG', 'NG', 'KE', 'ZA', 'KR', 'PH', 'TH', 'AU', 'NZ']);

export const getStreamingCountryFilingEnergy = (countryId: string): number => {
    const id = String(countryId || '').trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(WORLD_COUNTRY_DEFINITIONS_BY_ID, id)) return 0;
    return MAJOR_MARKETS.has(id) ? 10 : FEATURED_MARKETS.has(id) ? 5 : 2;
};

export const hasDetailedStreamingMarketCard = (countryId: string): boolean => (
    getStreamingCountryFilingEnergy(countryId) >= 5
);

/** Callers pass only countries still awaiting their first application. */
export const quoteStreamingMarketFilingEnergy = (countryIds: readonly string[]): number => (
    [...new Set(countryIds.map(id => String(id || '').trim().toUpperCase()))]
        .reduce((total, id) => total + getStreamingCountryFilingEnergy(id), 0)
);
