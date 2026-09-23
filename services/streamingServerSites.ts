/* ============================================================================
   SERVER SITES — where a rack can actually stand.

   This used to be the film-location catalogue. It should never have been: a
   shoot location is chosen for how it LOOKS and what it costs to film in, and a
   site is chosen for fibre, power and who you can peer with. Nothing about
   Marrakesh being photogenic tells you whether a data centre belongs there —
   and the old catalogue scored it `quality: 8`, above Lagos and level with
   Berlin, because it is beautiful. Build read that number to set fibre grade
   and uptime.

   So the two lists are separated. `PRODUCTION_LOCATION_CATALOG` keeps its 29
   places and keeps scoring them for Greenlight, untouched. This scores the same
   places again, for a different job, and adds the hubs a streaming network
   actually runs on — Ashburn, Frankfurt, Amsterdam, Singapore, São Paulo — that
   nobody would ever shoot a film in.

   Two rules held here:

   · Every id the old catalogue used is still an id here. A saved network stores
     `facility.cityId`, so dropping one would silently orphan somebody's build.
     Marrakesh is still a site; it is a tier-3 site, which is the honest answer
     rather than deleting it.
   · `transit` and `residency` are new and are not decoration. `transit` is how
     well a site reaches the ground around it, which the reach model reads to
     decide the shape of its coverage. `residency` is whether this site's
     country requires the data to physically stay inside it.
   ========================================================================== */

import type { ProductionLocationContinentId } from './productionLocations';
import type { BoxOfficeRegionId } from '../types';

/** What a site is for. Tier is not a price band — it is how much of the
    internet runs through the building. */
export type StreamingSiteTier = 1 | 2 | 3;

export interface StreamingServerSite {
  id: string;
  name: string;
  /** ISO alpha-2, and the join to the market registry. */
  countryCode: string;
  regionId: BoxOfficeRegionId;
  continentId: ProductionLocationContinentId;
  latitude: number;
  longitude: number;
  /** 1 carrier hotel · 2 regional hub · 3 emerging edge. */
  tier: StreamingSiteTier;
  /** 0–10, the engineering quality of the ground: fibre routes in, power
      reliability, how much redundancy the market can sell you. The facility
      marketplace already scales fibre grade and uptime by this figure — it was
      just reading the film catalogue's beauty score before. */
  quality: number;
  /** What a build costs here, on the same scale the marketplace already uses. */
  costIndex: number;
  /** Cents per kWh, the number the contracts quote. */
  powerPricePerKwh: number;
  /** 0–1: how well this site reaches the ground around it. A carrier hotel on a
      dozen subsea cables reaches most of its continent; an emerging edge serves
      its own city well and little else. Read by the reach model. */
  transit: number;
}

/** Countries that require streaming data to stay inside their borders. A market
    on this list cannot be served from a site in another country, however close
    that site is — which is the one rule that stops a single enormous hub in the
    cheapest place being the answer to everything. */
export const STREAMING_DATA_RESIDENCY_COUNTRIES: ReadonlySet<string> = new Set([
  'IN', 'ID', 'VN', 'CN', 'RU', 'NG', 'BR', 'TR', 'SA', 'KZ', 'PK',
]);

export const hasDataResidencyRule = (countryCode: string): boolean => (
  STREAMING_DATA_RESIDENCY_COUNTRIES.has(String(countryCode || '').trim().toUpperCase())
);

const site = (
  id: string,
  name: string,
  countryCode: string,
  regionId: BoxOfficeRegionId,
  continentId: ProductionLocationContinentId,
  latitude: number,
  longitude: number,
  tier: StreamingSiteTier,
  quality: number,
  costIndex: number,
  powerPricePerKwh: number,
  transit: number,
): StreamingServerSite => ({
  id, name, countryCode, regionId, continentId,
  latitude, longitude, tier, quality, costIndex, powerPricePerKwh, transit,
});

export const STREAMING_SERVER_SITES: StreamingServerSite[] = [
  /* --- North America ------------------------------------------------------
     Ashburn is the largest exchange point on earth and would never appear in a
     catalogue of places to shoot a film, which is the whole argument for this
     file existing. */
  site('ASH', 'Ashburn', 'US', 'NORTH_AMERICA', 'NA', 39.04, -77.49, 1, 10, 9_000_000, 7.4, 1),
  site('NYC', 'New York', 'US', 'NORTH_AMERICA', 'NA', 40.71, -74.01, 1, 9, 20_000_000, 14.2, 0.95),
  site('LA', 'Los Angeles', 'US', 'NORTH_AMERICA', 'NA', 34.05, -118.24, 1, 9, 15_000_000, 15.8, 0.93),
  site('CHI', 'Chicago', 'US', 'NORTH_AMERICA', 'NA', 41.88, -87.63, 2, 8, 9_500_000, 8.1, 0.82),
  site('DAL', 'Dallas', 'US', 'NORTH_AMERICA', 'NA', 32.78, -96.80, 2, 8, 7_500_000, 7.9, 0.8),
  site('MIA', 'Miami', 'US', 'NORTH_AMERICA', 'NA', 25.76, -80.19, 2, 8, 9_000_000, 9.6, 0.84),
  site('ATL', 'Atlanta', 'US', 'NORTH_AMERICA', 'NA', 33.75, -84.39, 2, 7, 6_500_000, 7.2, 0.74),
  site('TOR', 'Toronto', 'CA', 'NORTH_AMERICA', 'NA', 43.65, -79.38, 2, 7, 6_500_000, 8.8, 0.7),
  site('VAN', 'Vancouver', 'CA', 'NORTH_AMERICA', 'NA', 49.28, -123.12, 3, 6, 5_500_000, 7.1, 0.55),
  site('MEX', 'Mexico City', 'MX', 'NORTH_AMERICA', 'NA', 19.43, -99.13, 2, 6, 5_000_000, 10.4, 0.6),

  /* More of the continent (#109): the audience is served from where it
     lives, and the placer lands rooms only where a site is — so a country
     with two sites could never be covered however much was bought. Major
     metros in every region now, so full compute can paint the world. */
  site('SEA', 'Seattle', 'US', 'NORTH_AMERICA', 'NA', 47.61, -122.33, 2, 8, 8_500_000, 8.2, 0.78),
  site('SFO', 'San Francisco', 'US', 'NORTH_AMERICA', 'NA', 37.77, -122.42, 1, 9, 16_000_000, 17.4, 0.94),
  site('DEN', 'Denver', 'US', 'NORTH_AMERICA', 'NA', 39.74, -104.99, 2, 7, 6_500_000, 9.1, 0.66),
  site('PHX', 'Phoenix', 'US', 'NORTH_AMERICA', 'NA', 33.45, -112.07, 2, 7, 6_000_000, 9.8, 0.62),
  site('HOU', 'Houston', 'US', 'NORTH_AMERICA', 'NA', 29.76, -95.37, 2, 8, 7_000_000, 8.0, 0.72),
  site('MSP', 'Minneapolis', 'US', 'NORTH_AMERICA', 'NA', 44.98, -93.27, 2, 7, 6_000_000, 8.6, 0.6),
  site('BOS', 'Boston', 'US', 'NORTH_AMERICA', 'NA', 42.36, -71.06, 2, 8, 9_000_000, 15.1, 0.76),
  site('YUL', 'Montreal', 'CA', 'NORTH_AMERICA', 'NA', 45.50, -73.57, 2, 8, 6_000_000, 6.9, 0.68),
  site('YYC', 'Calgary', 'CA', 'NORTH_AMERICA', 'NA', 51.05, -114.07, 3, 6, 5_000_000, 7.4, 0.48),
  site('GDL', 'Guadalajara', 'MX', 'NORTH_AMERICA', 'NA', 20.66, -103.35, 3, 5, 3_500_000, 10.6, 0.42),
  site('MTY', 'Monterrey', 'MX', 'NORTH_AMERICA', 'NA', 25.69, -100.32, 3, 6, 4_000_000, 10.2, 0.48),
  site('PTY', 'Panama City', 'PA', 'NORTH_AMERICA', 'NA', 8.98, -79.52, 3, 6, 4_000_000, 11.9, 0.52),

  /* The far corners (#111): buy everything and the map should be green
     everywhere, so somewhere has to throw a field over Alaska, the Pacific
     and the Canadian north. Greenland has no market record of its own; it is
     reached from Reykjavik and Anchorage. */
  site('ANC', 'Anchorage', 'US', 'NORTH_AMERICA', 'NA', 61.22, -149.90, 3, 5, 4_500_000, 11.4, 0.34),
  site('HNL', 'Honolulu', 'US', 'NORTH_AMERICA', 'NA', 21.31, -157.86, 3, 6, 5_500_000, 28.4, 0.44),
  site('YWG', 'Winnipeg', 'CA', 'NORTH_AMERICA', 'NA', 49.90, -97.14, 3, 5, 4_000_000, 7.0, 0.36),
  site('YHZ', 'Halifax', 'CA', 'NORTH_AMERICA', 'NA', 44.65, -63.58, 3, 5, 4_000_000, 9.2, 0.38),

  /* The interiors (#113): a room's green reaches about 650km, and Kansas,
     Utah and the Canadian prairie sit further than that from every coast, so
     a region could never fill in however much was bought. */
  site('MCI', 'Kansas City', 'US', 'NORTH_AMERICA', 'NA', 39.10, -94.58, 3, 6, 5_000_000, 8.4, 0.44),
  site('SLC', 'Salt Lake City', 'US', 'NORTH_AMERICA', 'NA', 40.76, -111.89, 3, 6, 5_000_000, 8.0, 0.46),
  site('YEG', 'Edmonton', 'CA', 'NORTH_AMERICA', 'NA', 53.55, -113.49, 3, 5, 4_500_000, 6.8, 0.36),
  /* The far north (#115): small places, but places — northern Canada was the
     last quarter of a region that could not be reached at any price. */
  site('YZF', 'Yellowknife', 'CA', 'NORTH_AMERICA', 'NA', 62.45, -114.37, 3, 3, 3_500_000, 7.6, 0.2),
  site('YXY', 'Whitehorse', 'CA', 'NORTH_AMERICA', 'NA', 60.72, -135.06, 3, 3, 3_500_000, 8.0, 0.18),
  site('YFB', 'Iqaluit', 'CA', 'NORTH_AMERICA', 'NA', 63.75, -68.52, 3, 2, 3_500_000, 18.4, 0.16),

  /* --- South America ------------------------------------------------------- */
  site('SAO', 'São Paulo', 'BR', 'SOUTH_AMERICA', 'SA', -23.55, -46.63, 1, 8, 8_000_000, 11.8, 0.82),
  site('RIO', 'Rio de Janeiro', 'BR', 'SOUTH_AMERICA', 'SA', -22.91, -43.17, 2, 7, 6_000_000, 12.1, 0.62),
  /* The subsea landing for Brazil's north-east. Without it Salvador and
     Recife sit 1,200–1,900 km from the nearest room and a residency country
     cannot reach Strong at any price (#106). */
  site('FOR', 'Fortaleza', 'BR', 'SOUTH_AMERICA', 'SA', -3.73, -38.52, 3, 5, 3_500_000, 12.4, 0.5),
  site('BUE', 'Buenos Aires', 'AR', 'SOUTH_AMERICA', 'SA', -34.60, -58.38, 3, 6, 4_500_000, 9.4, 0.5),
  site('BOG', 'Bogota', 'CO', 'SOUTH_AMERICA', 'SA', 4.71, -74.07, 3, 5, 3_000_000, 10.8, 0.48),
  site('LIM', 'Lima', 'PE', 'SOUTH_AMERICA', 'SA', -12.05, -77.04, 3, 5, 3_000_000, 10.2, 0.42),

  site('SCL', 'Santiago', 'CL', 'SOUTH_AMERICA', 'SA', -33.45, -70.67, 2, 7, 5_500_000, 10.4, 0.6),
  site('CCS', 'Caracas', 'VE', 'SOUTH_AMERICA', 'SA', 10.48, -66.90, 3, 4, 3_000_000, 8.8, 0.36),
  site('UIO', 'Quito', 'EC', 'SOUTH_AMERICA', 'SA', -0.18, -78.47, 3, 5, 3_000_000, 9.6, 0.4),
  site('BSB', 'Brasília', 'BR', 'SOUTH_AMERICA', 'SA', -15.79, -47.88, 3, 6, 4_000_000, 12.0, 0.46),
  site('CNF', 'Belo Horizonte', 'BR', 'SOUTH_AMERICA', 'SA', -19.92, -43.94, 3, 6, 4_000_000, 11.9, 0.46),
  site('SSA', 'Salvador', 'BR', 'SOUTH_AMERICA', 'SA', -12.97, -38.51, 3, 5, 3_500_000, 12.2, 0.42),
  site('REC', 'Recife', 'BR', 'SOUTH_AMERICA', 'SA', -8.05, -34.88, 3, 5, 3_500_000, 12.3, 0.44),
  site('POA', 'Porto Alegre', 'BR', 'SOUTH_AMERICA', 'SA', -30.03, -51.23, 3, 6, 4_000_000, 11.7, 0.46),
  site('MAO', 'Manaus', 'BR', 'SOUTH_AMERICA', 'SA', -3.12, -60.02, 3, 4, 3_500_000, 13.0, 0.3),
  site('MDE', 'Medellín', 'CO', 'SOUTH_AMERICA', 'SA', 6.25, -75.56, 3, 5, 3_000_000, 10.6, 0.42),
  site('LPB', 'La Paz', 'BO', 'SOUTH_AMERICA', 'SA', -16.50, -68.15, 3, 4, 2_500_000, 9.2, 0.32),
  site('ASU', 'Asunción', 'PY', 'SOUTH_AMERICA', 'SA', -25.26, -57.58, 3, 4, 2_500_000, 8.6, 0.34),
  site('MVD', 'Montevideo', 'UY', 'SOUTH_AMERICA', 'SA', -34.90, -56.16, 3, 6, 3_500_000, 11.0, 0.46),

  site('PUQ', 'Punta Arenas', 'CL', 'SOUTH_AMERICA', 'SA', -53.16, -70.91, 3, 3, 2_500_000, 10.6, 0.24),
  site('BEL', 'Belém', 'BR', 'SOUTH_AMERICA', 'SA', -1.46, -48.49, 3, 4, 3_000_000, 12.4, 0.3),

  site('COR', 'Córdoba', 'AR', 'SOUTH_AMERICA', 'SA', -31.42, -64.18, 3, 4, 3_000_000, 9.0, 0.32),
  site('CGB', 'Cuiabá', 'BR', 'SOUTH_AMERICA', 'SA', -15.60, -56.10, 3, 4, 3_000_000, 12.6, 0.28),

  /* --- Europe --------------------------------------------------------------
     FLAP-D — Frankfurt, London, Amsterdam, Paris, Dublin — is where European
     traffic actually lands. Berlin is the capital and not the hub; Rome and
     Prague are beautiful and neither is a carrier hotel. */
  site('FRA', 'Frankfurt', 'DE', 'EUROPE', 'EU', 50.11, 8.68, 1, 10, 11_000_000, 23.4, 1),
  site('LDN', 'London', 'GB', 'EUROPE', 'EU', 51.51, -0.13, 1, 9, 12_000_000, 21.8, 0.96),
  site('AMS', 'Amsterdam', 'NL', 'EUROPE', 'EU', 52.37, 4.90, 1, 9, 10_000_000, 19.6, 0.95),
  site('PAR', 'Paris', 'FR', 'EUROPE', 'EU', 48.86, 2.35, 1, 9, 10_000_000, 17.2, 0.9),
  site('MAD', 'Madrid', 'ES', 'EUROPE', 'EU', 40.42, -3.70, 2, 7, 6_000_000, 16.4, 0.7),
  site('MIL', 'Milan', 'IT', 'EUROPE', 'EU', 45.46, 9.19, 2, 7, 7_500_000, 20.1, 0.68),
  site('STO', 'Stockholm', 'SE', 'EUROPE', 'EU', 59.33, 18.07, 2, 8, 7_000_000, 9.2, 0.66),
  site('WAW', 'Warsaw', 'PL', 'EUROPE', 'EU', 52.23, 21.01, 2, 6, 4_500_000, 14.8, 0.62),
  site('BER', 'Berlin', 'DE', 'EUROPE', 'EU', 52.52, 13.40, 2, 7, 7_000_000, 23.9, 0.64),
  /* Russia insists on rooms inside Russia and had nowhere to rent one, so a
     launch there could never be served (#106). Moscow and St Petersburg are
     two-thirds of the audience; the Urals and Siberia stay far. */
  site('MOW', 'Moscow', 'RU', 'EUROPE', 'EU', 55.76, 37.62, 2, 6, 6_000_000, 6.8, 0.55),
  site('SVX', 'Yekaterinburg', 'RU', 'EUROPE', 'EU', 56.84, 60.60, 3, 5, 4_000_000, 6.2, 0.4),
  site('PRG', 'Prague', 'CZ', 'EUROPE', 'EU', 50.08, 14.44, 3, 6, 3_500_000, 15.2, 0.52),
  site('ROM', 'Rome', 'IT', 'EUROPE', 'EU', 41.90, 12.50, 3, 5, 5_500_000, 21.4, 0.44),

  site('DUB', 'Dublin', 'IE', 'EUROPE', 'EU', 53.35, -6.26, 2, 8, 8_000_000, 20.4, 0.8),
  site('LIS', 'Lisbon', 'PT', 'EUROPE', 'EU', 38.72, -9.14, 2, 7, 6_000_000, 18.6, 0.66),
  site('BCN', 'Barcelona', 'ES', 'EUROPE', 'EU', 41.39, 2.17, 2, 7, 6_500_000, 16.8, 0.7),
  site('VIE', 'Vienna', 'AT', 'EUROPE', 'EU', 48.21, 16.37, 2, 8, 7_000_000, 19.2, 0.7),
  site('ZRH', 'Zurich', 'CH', 'EUROPE', 'EU', 47.38, 8.54, 2, 9, 9_500_000, 21.0, 0.78),
  site('MUC', 'Munich', 'DE', 'EUROPE', 'EU', 48.14, 11.58, 2, 8, 7_500_000, 23.6, 0.7),
  site('HAM', 'Hamburg', 'DE', 'EUROPE', 'EU', 53.55, 9.99, 2, 7, 7_000_000, 23.7, 0.64),
  site('CPH', 'Copenhagen', 'DK', 'EUROPE', 'EU', 55.68, 12.57, 2, 8, 7_500_000, 22.1, 0.72),
  site('OSL', 'Oslo', 'NO', 'EUROPE', 'EU', 59.91, 10.75, 2, 8, 7_000_000, 8.9, 0.66),
  site('HEL', 'Helsinki', 'FI', 'EUROPE', 'EU', 60.17, 24.94, 2, 8, 6_500_000, 9.4, 0.64),
  site('MAN', 'Manchester', 'GB', 'EUROPE', 'EU', 53.48, -2.24, 2, 7, 7_000_000, 21.6, 0.66),
  site('BRU', 'Brussels', 'BE', 'EUROPE', 'EU', 50.85, 4.35, 2, 8, 7_000_000, 19.8, 0.72),
  site('MRS', 'Marseille', 'FR', 'EUROPE', 'EU', 43.30, 5.37, 2, 7, 6_500_000, 17.0, 0.7),
  site('ATH', 'Athens', 'GR', 'EUROPE', 'EU', 37.98, 23.73, 3, 6, 4_500_000, 17.4, 0.5),
  site('BUH', 'Bucharest', 'RO', 'EUROPE', 'EU', 44.43, 26.10, 3, 6, 4_000_000, 13.8, 0.5),
  site('BUD', 'Budapest', 'HU', 'EUROPE', 'EU', 47.50, 19.04, 3, 6, 4_000_000, 14.4, 0.52),
  site('KBP', 'Kyiv', 'UA', 'EUROPE', 'EU', 50.45, 30.52, 3, 5, 3_500_000, 9.8, 0.42),
  site('BEG', 'Belgrade', 'RS', 'EUROPE', 'EU', 44.79, 20.46, 3, 5, 3_500_000, 12.2, 0.44),
  site('SOF', 'Sofia', 'BG', 'EUROPE', 'EU', 42.70, 23.32, 3, 5, 3_500_000, 12.6, 0.44),
  site('NAP', 'Naples', 'IT', 'EUROPE', 'EU', 40.85, 14.27, 3, 5, 5_000_000, 21.2, 0.44),
  site('LED', 'St Petersburg', 'RU', 'EUROPE', 'EU', 59.93, 30.32, 3, 6, 4_500_000, 6.6, 0.46),
  site('OVB', 'Novosibirsk', 'RU', 'EUROPE', 'EU', 55.03, 82.92, 3, 5, 4_000_000, 6.0, 0.36),

  site('KEF', 'Reykjavik', 'IS', 'EUROPE', 'EU', 64.15, -21.94, 3, 6, 4_500_000, 5.4, 0.42),
  site('IKT', 'Irkutsk', 'RU', 'EUROPE', 'EU', 52.29, 104.30, 3, 4, 3_500_000, 5.8, 0.28),
  site('YKS', 'Yakutsk', 'RU', 'EUROPE', 'EU', 62.03, 129.68, 3, 2, 3_500_000, 6.4, 0.16),
  site('MMK', 'Murmansk', 'RU', 'EUROPE', 'EU', 68.97, 33.08, 3, 3, 3_500_000, 5.8, 0.2),
  site('NSK', 'Norilsk', 'RU', 'EUROPE', 'EU', 69.35, 88.20, 3, 2, 3_500_000, 6.0, 0.14),
  site('GDX', 'Magadan', 'RU', 'EUROPE', 'EU', 59.56, 150.80, 3, 2, 3_500_000, 6.6, 0.16),
  site('VVO', 'Vladivostok', 'RU', 'EUROPE', 'EU', 43.12, 131.89, 3, 5, 4_000_000, 6.2, 0.34),

  site('KJA', 'Krasnoyarsk', 'RU', 'EUROPE', 'EU', 56.01, 92.87, 3, 4, 3_500_000, 5.6, 0.3),
  site('KUF', 'Samara', 'RU', 'EUROPE', 'EU', 53.20, 50.15, 3, 5, 4_000_000, 6.0, 0.36),

  /* --- Asia ---------------------------------------------------------------- */
  site('SIN', 'Singapore', 'SG', 'ASIA', 'AS', 1.35, 103.82, 1, 10, 12_000_000, 14.6, 1),
  site('TOK', 'Tokyo', 'JP', 'ASIA', 'AS', 35.68, 139.65, 1, 9, 14_000_000, 18.2, 0.92),
  /* Hong Kong is not one of the world registry's 197 markets — it is a
     territory, not a country you open in. It is here because a site does not
     have to be a market: it is one of the best places on earth to serve the
     region FROM, which is a different question and the only one this file
     asks. Its residency lookup simply answers no. */
  site('HKG', 'Hong Kong', 'HK', 'ASIA', 'AS', 22.32, 114.17, 1, 9, 11_000_000, 15.1, 0.9),
  site('BOM', 'Mumbai', 'IN', 'ASIA', 'AS', 19.08, 72.88, 1, 8, 6_500_000, 9.8, 0.86),
  site('SEO', 'Seoul', 'KR', 'ASIA', 'AS', 37.57, 126.98, 2, 8, 8_500_000, 11.4, 0.7),
  site('BEI', 'Beijing', 'CN', 'ASIA', 'AS', 39.90, 116.41, 2, 7, 12_000_000, 9.1, 0.58),
  site('DXB', 'Dubai', 'AE', 'ASIA', 'AS', 25.20, 55.27, 2, 8, 9_000_000, 8.4, 0.74),
  site('IST', 'Istanbul', 'TR', 'ASIA', 'AS', 41.01, 28.98, 2, 6, 5_000_000, 12.6, 0.62),
  site('JKT', 'Jakarta', 'ID', 'ASIA', 'AS', -6.21, 106.85, 2, 6, 4_500_000, 9.6, 0.58),
  site('CHN', 'Chennai', 'IN', 'ASIA', 'AS', 13.08, 80.27, 2, 7, 4_500_000, 9.4, 0.68),
  /* Nearly half of India lives in the north, 1,150 km and more from Mumbai
     and Chennai — the largest market in the game could not reach Strong (#106). */
  site('DEL', 'Delhi', 'IN', 'ASIA', 'AS', 28.61, 77.21, 2, 7, 5_000_000, 8.9, 0.6),
  site('CCU', 'Kolkata', 'IN', 'ASIA', 'AS', 22.57, 88.36, 3, 6, 3_500_000, 9.0, 0.5),
  site('BKK', 'Bangkok', 'TH', 'ASIA', 'AS', 13.76, 100.50, 3, 6, 3_500_000, 11.2, 0.5),

  site('BLR', 'Bangalore', 'IN', 'ASIA', 'AS', 12.97, 77.59, 2, 8, 5_500_000, 9.1, 0.66),
  site('HYD', 'Hyderabad', 'IN', 'ASIA', 'AS', 17.39, 78.49, 3, 7, 4_500_000, 9.0, 0.54),
  site('KHI', 'Karachi', 'PK', 'ASIA', 'AS', 24.86, 67.01, 2, 6, 4_500_000, 10.8, 0.56),
  site('LHE', 'Lahore', 'PK', 'ASIA', 'AS', 31.55, 74.34, 3, 5, 3_500_000, 10.6, 0.42),
  site('DAC', 'Dhaka', 'BD', 'ASIA', 'AS', 23.81, 90.41, 3, 5, 3_500_000, 9.4, 0.44),
  site('CMB', 'Colombo', 'LK', 'ASIA', 'AS', 6.93, 79.86, 3, 5, 3_000_000, 11.8, 0.46),
  site('KUL', 'Kuala Lumpur', 'MY', 'ASIA', 'AS', 3.14, 101.69, 2, 8, 6_500_000, 9.9, 0.74),
  site('MNL', 'Manila', 'PH', 'ASIA', 'AS', 14.60, 120.98, 2, 6, 5_000_000, 13.2, 0.6),
  site('SGN', 'Ho Chi Minh City', 'VN', 'ASIA', 'AS', 10.82, 106.63, 2, 6, 4_500_000, 8.7, 0.58),
  site('HAN', 'Hanoi', 'VN', 'ASIA', 'AS', 21.03, 105.85, 3, 5, 3_500_000, 8.6, 0.44),
  site('TPE', 'Taipei', 'TW', 'ASIA', 'AS', 25.03, 121.57, 2, 8, 8_000_000, 10.4, 0.78),
  site('OSA', 'Osaka', 'JP', 'ASIA', 'AS', 34.69, 135.50, 2, 8, 9_500_000, 18.0, 0.76),
  site('SHA', 'Shanghai', 'CN', 'ASIA', 'AS', 31.23, 121.47, 1, 8, 13_000_000, 9.3, 0.82),
  site('SZX', 'Shenzhen', 'CN', 'ASIA', 'AS', 22.54, 114.06, 2, 8, 9_000_000, 9.2, 0.72),
  site('CTU', 'Chengdu', 'CN', 'ASIA', 'AS', 30.57, 104.07, 3, 6, 6_000_000, 8.8, 0.5),
  site('RUH', 'Riyadh', 'SA', 'ASIA', 'AS', 24.71, 46.68, 2, 7, 7_000_000, 6.4, 0.6),
  site('DOH', 'Doha', 'QA', 'ASIA', 'AS', 25.29, 51.53, 3, 7, 6_000_000, 6.2, 0.56),
  site('TLV', 'Tel Aviv', 'IL', 'ASIA', 'AS', 32.09, 34.78, 2, 8, 7_500_000, 13.6, 0.7),
  site('THR', 'Tehran', 'IR', 'ASIA', 'AS', 35.69, 51.39, 3, 4, 4_000_000, 5.8, 0.34),
  site('ALA', 'Almaty', 'KZ', 'ASIA', 'AS', 43.24, 76.89, 3, 5, 3_500_000, 6.8, 0.4),
  site('TAS', 'Tashkent', 'UZ', 'ASIA', 'AS', 41.30, 69.24, 3, 4, 3_000_000, 6.4, 0.34),
  site('SUB', 'Surabaya', 'ID', 'ASIA', 'AS', -7.26, 112.75, 3, 5, 3_500_000, 9.7, 0.44),
  site('MES', 'Medan', 'ID', 'ASIA', 'AS', 3.60, 98.67, 3, 5, 3_500_000, 9.8, 0.42),
  site('UPG', 'Makassar', 'ID', 'ASIA', 'AS', -5.15, 119.43, 3, 4, 3_000_000, 10.0, 0.32),
  site('DJJ', 'Jayapura', 'ID', 'ASIA', 'AS', -2.53, 140.72, 3, 2, 3_000_000, 12.4, 0.16),
  site('RGN', 'Yangon', 'MM', 'ASIA', 'AS', 16.87, 96.20, 3, 4, 3_000_000, 10.2, 0.32),
  site('PUS', 'Busan', 'KR', 'ASIA', 'AS', 35.18, 129.08, 3, 7, 6_000_000, 11.2, 0.56),

  site('ULN', 'Ulaanbaatar', 'MN', 'ASIA', 'AS', 47.89, 106.91, 3, 4, 3_000_000, 7.2, 0.28),
  site('KBL', 'Kabul', 'AF', 'ASIA', 'AS', 34.56, 69.21, 3, 3, 2_500_000, 9.0, 0.22),
  site('BGW', 'Baghdad', 'IQ', 'ASIA', 'AS', 33.32, 44.36, 3, 4, 3_500_000, 5.6, 0.3),
  site('MCT', 'Muscat', 'OM', 'ASIA', 'AS', 23.59, 58.41, 3, 6, 4_500_000, 6.0, 0.46),
  site('KTM', 'Kathmandu', 'NP', 'ASIA', 'AS', 27.72, 85.32, 3, 4, 3_000_000, 8.8, 0.28),
  site('PNH', 'Phnom Penh', 'KH', 'ASIA', 'AS', 11.56, 104.92, 3, 4, 3_000_000, 10.4, 0.32),

  site('URC', 'Urumqi', 'CN', 'ASIA', 'AS', 43.83, 87.62, 3, 4, 4_000_000, 7.8, 0.3),
  site('XIY', "Xi'an", 'CN', 'ASIA', 'AS', 34.34, 108.94, 3, 6, 5_500_000, 8.6, 0.46),
  site('NAG', 'Nagpur', 'IN', 'ASIA', 'AS', 21.15, 79.09, 3, 5, 3_500_000, 9.2, 0.38),

  /* --- Africa --------------------------------------------------------------- */
  site('JNB', 'Johannesburg', 'ZA', 'AFRICA', 'AF', -26.20, 28.05, 2, 7, 5_000_000, 9.8, 0.66),
  site('CPT', 'Cape Town', 'ZA', 'AFRICA', 'AF', -33.92, 18.42, 2, 7, 4_500_000, 10.1, 0.6),
  site('LAG', 'Lagos', 'NG', 'AFRICA', 'AF', 6.52, 3.38, 2, 5, 3_500_000, 14.8, 0.52),
  site('CAI', 'Cairo', 'EG', 'AFRICA', 'AF', 30.04, 31.24, 2, 6, 4_000_000, 7.6, 0.58),
  site('NBO', 'Nairobi', 'KE', 'AFRICA', 'AF', -1.29, 36.82, 3, 5, 3_000_000, 12.4, 0.44),
  /* Kept because a save may hold a room here. It is a fine place to shoot and a
     poor place to put a rack, and the two scores now say so separately. */
  site('MAR', 'Marrakesh', 'MA', 'AFRICA', 'AF', 31.63, -7.98, 3, 4, 2_500_000, 11.6, 0.34),

  site('CAS', 'Casablanca', 'MA', 'AFRICA', 'AF', 33.57, -7.59, 2, 6, 4_500_000, 11.4, 0.58),
  site('ALG', 'Algiers', 'DZ', 'AFRICA', 'AF', 36.75, 3.06, 3, 5, 3_500_000, 7.8, 0.42),
  site('TUN', 'Tunis', 'TN', 'AFRICA', 'AF', 36.81, 10.18, 3, 5, 3_500_000, 9.6, 0.44),
  site('ALY', 'Alexandria', 'EG', 'AFRICA', 'AF', 31.20, 29.92, 3, 5, 3_500_000, 7.8, 0.46),
  site('ACC', 'Accra', 'GH', 'AFRICA', 'AF', 5.60, -0.19, 3, 5, 3_500_000, 13.6, 0.46),
  site('ABJ', 'Abidjan', 'CI', 'AFRICA', 'AF', 5.36, -4.01, 3, 5, 3_500_000, 13.2, 0.44),
  site('DKR', 'Dakar', 'SN', 'AFRICA', 'AF', 14.72, -17.47, 3, 5, 3_500_000, 14.4, 0.46),
  site('ABV', 'Abuja', 'NG', 'AFRICA', 'AF', 9.06, 7.49, 3, 5, 3_500_000, 14.6, 0.42),
  site('KAN', 'Kano', 'NG', 'AFRICA', 'AF', 12.00, 8.52, 3, 4, 3_000_000, 15.0, 0.34),
  site('ADD', 'Addis Ababa', 'ET', 'AFRICA', 'AF', 9.03, 38.74, 3, 5, 3_500_000, 8.4, 0.4),
  site('DAR', 'Dar es Salaam', 'TZ', 'AFRICA', 'AF', -6.79, 39.28, 3, 5, 3_500_000, 12.0, 0.42),
  site('EBB', 'Kampala', 'UG', 'AFRICA', 'AF', 0.35, 32.58, 3, 4, 3_000_000, 12.8, 0.36),
  site('FIH', 'Kinshasa', 'CD', 'AFRICA', 'AF', -4.32, 15.31, 3, 4, 3_500_000, 13.4, 0.32),
  site('LAD', 'Luanda', 'AO', 'AFRICA', 'AF', -8.84, 13.23, 3, 4, 4_000_000, 12.6, 0.38),
  site('LUN', 'Lusaka', 'ZM', 'AFRICA', 'AF', -15.39, 28.32, 3, 4, 3_000_000, 10.8, 0.34),
  site('HRE', 'Harare', 'ZW', 'AFRICA', 'AF', -17.83, 31.05, 3, 4, 3_000_000, 11.6, 0.34),
  site('MPM', 'Maputo', 'MZ', 'AFRICA', 'AF', -25.97, 32.57, 3, 4, 3_000_000, 11.2, 0.38),
  site('DUR', 'Durban', 'ZA', 'AFRICA', 'AF', -29.86, 31.03, 3, 6, 4_000_000, 10.0, 0.5),
  site('KRT', 'Khartoum', 'SD', 'AFRICA', 'AF', 15.50, 32.56, 3, 3, 3_000_000, 9.4, 0.28),

  site('WDH', 'Windhoek', 'NA', 'AFRICA', 'AF', -22.56, 17.08, 3, 4, 3_000_000, 11.0, 0.3),
  site('TNR', 'Antananarivo', 'MG', 'AFRICA', 'AF', -18.88, 47.51, 3, 3, 2_500_000, 12.4, 0.24),
  site('BKO', 'Bamako', 'ML', 'AFRICA', 'AF', 12.64, -8.00, 3, 3, 2_500_000, 14.2, 0.24),
  site('TIP', 'Tripoli', 'LY', 'AFRICA', 'AF', 32.89, 13.19, 3, 4, 3_000_000, 6.8, 0.3),
  site('NDJ', "N'Djamena", 'TD', 'AFRICA', 'AF', 12.13, 15.06, 3, 3, 2_500_000, 15.0, 0.2),
  site('MGQ', 'Mogadishu', 'SO', 'AFRICA', 'AF', 2.05, 45.32, 3, 3, 2_500_000, 14.6, 0.22),

  site('NIM', 'Niamey', 'NE', 'AFRICA', 'AF', 13.51, 2.13, 3, 3, 2_500_000, 15.4, 0.2),
  site('FBM', 'Lubumbashi', 'CD', 'AFRICA', 'AF', -11.66, 27.48, 3, 3, 2_500_000, 13.0, 0.22),

  /* --- Oceania -------------------------------------------------------------- */
  site('SYD', 'Sydney', 'AU', 'OCEANIA', 'OC', -33.87, 151.21, 1, 9, 10_000_000, 16.2, 0.84),
  site('MEL', 'Melbourne', 'AU', 'OCEANIA', 'OC', -37.81, 144.96, 2, 8, 8_000_000, 15.8, 0.62),
  site('AKL', 'Auckland', 'NZ', 'OCEANIA', 'OC', -36.85, 174.76, 3, 6, 6_000_000, 13.4, 0.4),
  site('BNE', 'Brisbane', 'AU', 'OCEANIA', 'OC', -27.47, 153.03, 2, 7, 7_000_000, 15.6, 0.6),
  site('PER', 'Perth', 'AU', 'OCEANIA', 'OC', -31.95, 115.86, 2, 7, 7_000_000, 16.0, 0.58),
  site('ADL', 'Adelaide', 'AU', 'OCEANIA', 'OC', -34.93, 138.60, 3, 6, 5_500_000, 16.4, 0.48),
  site('WLG', 'Wellington', 'NZ', 'OCEANIA', 'OC', -41.29, 174.78, 3, 6, 5_000_000, 13.2, 0.42),
  site('POM', 'Port Moresby', 'PG', 'OCEANIA', 'OC', -9.44, 147.18, 3, 3, 3_000_000, 16.8, 0.22),
  site('SUV', 'Suva', 'FJ', 'OCEANIA', 'OC', -18.14, 178.44, 3, 4, 3_500_000, 18.2, 0.26),
  site('DRW', 'Darwin', 'AU', 'OCEANIA', 'OC', -12.46, 130.84, 3, 5, 4_500_000, 17.0, 0.34),
  site('CNS', 'Cairns', 'AU', 'OCEANIA', 'OC', -16.92, 145.77, 3, 4, 4_000_000, 17.4, 0.28),
  site('CHC', 'Christchurch', 'NZ', 'OCEANIA', 'OC', -43.53, 172.64, 3, 5, 4_500_000, 13.6, 0.32),
  site('ASP', 'Alice Springs', 'AU', 'OCEANIA', 'OC', -23.70, 133.88, 3, 3, 3_000_000, 18.0, 0.2),
];

const SITE_BY_ID = new Map(STREAMING_SERVER_SITES.map(entry => [entry.id, entry]));

export const getStreamingServerSite = (id: string): StreamingServerSite | undefined => (
  SITE_BY_ID.get(String(id || '').trim().toUpperCase())
);

export const getStreamingServerSitesInCountry = (countryCode: string): StreamingServerSite[] => {
  const code = String(countryCode || '').trim().toUpperCase();
  return STREAMING_SERVER_SITES.filter(entry => entry.countryCode === code);
};

/** The build cost basis, on the scale the facility marketplace already divides
    by. It mirrors `getStreamingDataCenterCost` so the two catalogues price the
    same way — the inputs are a site's engineering quality and its cost index
    rather than a film location's beauty and its shooting cost. */
export const getStreamingSiteBuildCost = (entry: StreamingServerSite): number => (
  Math.round((2_500_000 + entry.quality * 700_000 + entry.costIndex * 0.15) / 500_000) * 500_000
);
