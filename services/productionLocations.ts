import type { BoxOfficeRegionId } from '../types';

export type ProductionLocationContinentId = 'NA' | 'SA' | 'EU' | 'AS' | 'AF' | 'OC';

export interface ProductionLocation {
    id: string;
    name: string;
    desc: string;
    cost: number;
    quality: number;
    x: number;
    y: number;
    longitude: number;
    latitude: number;
    continentId: ProductionLocationContinentId;
    regionId: BoxOfficeRegionId;
}

const location = (
    continentId: ProductionLocationContinentId,
    regionId: BoxOfficeRegionId,
    value: Omit<ProductionLocation, 'continentId' | 'regionId'>,
): ProductionLocation => ({ ...value, continentId, regionId });

/**
 * The shared Actor Empire location directory used by Greenlight production
 * planning and by the owned-streaming founding network map.
 */
export const PRODUCTION_LOCATION_CATALOG: ProductionLocation[] = [
    location('NA', 'NORTH_AMERICA', { id: 'LA', name: 'Los Angeles', desc: 'The heart of Hollywood. Expensive but high quality.', cost: 15_000_000, quality: 10, x: 15, y: 35, longitude: -118.2437, latitude: 34.0522 }),
    location('NA', 'NORTH_AMERICA', { id: 'ATL', name: 'Atlanta', desc: 'Generous tax credits. Good facilities.', cost: 5_000_000, quality: 5, x: 22, y: 38, longitude: -84.388, latitude: 33.749 }),
    location('NA', 'NORTH_AMERICA', { id: 'NYC', name: 'New York', desc: 'Iconic urban scenery. Very expensive.', cost: 20_000_000, quality: 9, x: 25, y: 32, longitude: -74.006, latitude: 40.7128 }),
    location('NA', 'NORTH_AMERICA', { id: 'VAN', name: 'Vancouver', desc: 'Versatile and budget friendly.', cost: 3_000_000, quality: 6, x: 12, y: 28, longitude: -123.1207, latitude: 49.2827 }),
    location('NA', 'NORTH_AMERICA', { id: 'MEX', name: 'Mexico City', desc: 'Vibrant culture and unique architecture.', cost: 4_000_000, quality: 7, x: 18, y: 45, longitude: -99.1332, latitude: 19.4326 }),
    location('NA', 'NORTH_AMERICA', { id: 'TOR', name: 'Toronto', desc: 'Urban double for New York and Chicago.', cost: 3_500_000, quality: 6, x: 20, y: 30, longitude: -79.3832, latitude: 43.6532 }),
    location('EU', 'EUROPE', { id: 'LDN', name: 'London', desc: 'World-class studios and talent.', cost: 12_000_000, quality: 9, x: 48, y: 28, longitude: -0.1276, latitude: 51.5072 }),
    location('EU', 'EUROPE', { id: 'PAR', name: 'Paris', desc: 'Romantic and historic.', cost: 10_000_000, quality: 8, x: 50, y: 32, longitude: 2.3522, latitude: 48.8566 }),
    location('EU', 'EUROPE', { id: 'PRG', name: 'Prague', desc: 'Old-world charm on a budget.', cost: 2_000_000, quality: 7, x: 54, y: 30, longitude: 14.4378, latitude: 50.0755 }),
    location('EU', 'EUROPE', { id: 'ROM', name: 'Rome', desc: 'Eternal city with epic scale.', cost: 9_000_000, quality: 9, x: 53, y: 36, longitude: 12.4964, latitude: 41.9028 }),
    location('EU', 'EUROPE', { id: 'BER', name: 'Berlin', desc: 'Gritty urban spaces and modern technology.', cost: 7_000_000, quality: 8, x: 53, y: 28, longitude: 13.405, latitude: 52.52 }),
    location('EU', 'EUROPE', { id: 'MAD', name: 'Madrid', desc: 'Sunny and historic.', cost: 5_000_000, quality: 7, x: 46, y: 38, longitude: -3.7038, latitude: 40.4168 }),
    location('AS', 'ASIA', { id: 'TOK', name: 'Tokyo', desc: 'Neon, precision, and futuristic infrastructure.', cost: 14_000_000, quality: 9, x: 88, y: 35, longitude: 139.6503, latitude: 35.6762 }),
    location('AS', 'ASIA', { id: 'SEO', name: 'Seoul', desc: 'Modern and efficient.', cost: 8_000_000, quality: 8, x: 84, y: 34, longitude: 126.978, latitude: 37.5665 }),
    location('AS', 'ASIA', { id: 'BOM', name: 'Mumbai', desc: 'The home of Bollywood.', cost: 6_000_000, quality: 7, x: 72, y: 48, longitude: 72.8777, latitude: 19.076 }),
    location('AS', 'ASIA', { id: 'HKG', name: 'Hong Kong', desc: 'Dense urban neon.', cost: 11_000_000, quality: 9, x: 80, y: 42, longitude: 114.1694, latitude: 22.3193 }),
    location('AS', 'ASIA', { id: 'BEI', name: 'Beijing', desc: 'Grand scale and history.', cost: 12_000_000, quality: 8, x: 78, y: 32, longitude: 116.4074, latitude: 39.9042 }),
    location('AS', 'ASIA', { id: 'BKK', name: 'Bangkok', desc: 'Fast-moving energy and landmark architecture.', cost: 3_000_000, quality: 6, x: 75, y: 45, longitude: 100.5018, latitude: 13.7563 }),
    location('SA', 'SOUTH_AMERICA', { id: 'RIO', name: 'Rio de Janeiro', desc: 'Stunning natural beauty.', cost: 5_000_000, quality: 8, x: 32, y: 72, longitude: -43.1729, latitude: -22.9068 }),
    location('SA', 'SOUTH_AMERICA', { id: 'BUE', name: 'Buenos Aires', desc: 'European flair in South America.', cost: 4_000_000, quality: 7, x: 30, y: 85, longitude: -58.3816, latitude: -34.6037 }),
    location('SA', 'SOUTH_AMERICA', { id: 'BOG', name: 'Bogota', desc: 'High-altitude urban character.', cost: 2_000_000, quality: 6, x: 25, y: 58, longitude: -74.0721, latitude: 4.711 }),
    location('SA', 'SOUTH_AMERICA', { id: 'LIM', name: 'Lima', desc: 'Coastal desert city.', cost: 2_500_000, quality: 6, x: 22, y: 65, longitude: -77.0428, latitude: -12.0464 }),
    location('AF', 'AFRICA', { id: 'CPT', name: 'Cape Town', desc: 'Diverse landscapes and excellent light.', cost: 4_000_000, quality: 8, x: 53, y: 82, longitude: 18.4241, latitude: -33.9249 }),
    location('AF', 'AFRICA', { id: 'CAI', name: 'Cairo', desc: 'Ancient landmarks and desert scale.', cost: 7_000_000, quality: 7, x: 56, y: 42, longitude: 31.2357, latitude: 30.0444 }),
    location('AF', 'AFRICA', { id: 'MAR', name: 'Marrakesh', desc: 'Rich colors and distinctive textures.', cost: 3_000_000, quality: 8, x: 46, y: 42, longitude: -7.9811, latitude: 31.6295 }),
    location('AF', 'AFRICA', { id: 'LAG', name: 'Lagos', desc: 'Bustling energy and a rapidly growing media scene.', cost: 2_000_000, quality: 5, x: 48, y: 55, longitude: 3.3792, latitude: 6.5244 }),
    location('OC', 'OCEANIA', { id: 'SYD', name: 'Sydney', desc: 'Modern harbor and coastal beauty.', cost: 10_000_000, quality: 9, x: 88, y: 82, longitude: 151.2093, latitude: -33.8688 }),
    location('OC', 'OCEANIA', { id: 'MEL', name: 'Melbourne', desc: 'Arts and culture hub.', cost: 8_000_000, quality: 8, x: 86, y: 86, longitude: 144.9631, latitude: -37.8136 }),
    location('OC', 'OCEANIA', { id: 'AKL', name: 'Auckland', desc: 'Large-scale landscapes and experienced crews.', cost: 6_000_000, quality: 10, x: 94, y: 88, longitude: 174.7633, latitude: -36.8485 }),
];

export const PRODUCTION_LOCATIONS_BY_CONTINENT = PRODUCTION_LOCATION_CATALOG.reduce<Record<ProductionLocationContinentId, ProductionLocation[]>>(
    (result, item) => {
        result[item.continentId].push(item);
        return result;
    },
    { NA: [], SA: [], EU: [], AS: [], AF: [], OC: [] },
);

export const getProductionLocation = (id: string | null | undefined): ProductionLocation | null => (
    PRODUCTION_LOCATION_CATALOG.find(item => item.id === id) || null
);

/** A streaming hall is not a film shoot, so the data-centre quote is derived
 * from the shared city's market cost and infrastructure quality. */
export const getStreamingDataCenterCost = (item: ProductionLocation): number => (
    Math.round((2_500_000 + item.quality * 700_000 + item.cost * 0.15) / 500_000) * 500_000
);
