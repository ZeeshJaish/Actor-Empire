/* ============================================================================
   WHERE THE AUDIENCE ACTUALLY IS.

   A market was one coordinate. A room within reach of it served the entire
   country — one site covered all 310 million viewers in India, and "cover the
   region" was a switch rather than a job. Worse, the headline number was never
   about people at all: it was `totals.capacity + totals.burst`, what the racks
   could carry if the audience happened to be standing next to them. A four-rack
   room in Toronto reported 317K covered against 169K expected while the
   forecast underneath graded every single market NONE.

   A market is its population clusters now — real cities, weighted by share —
   and coverage is the share of its audience inside somebody's reach. Half of
   India is a thing that can happen, and the other half is a reason to build.
   ========================================================================== */

import { POPULATION_CLUSTERS, type PopulationCluster } from './worldEconomy/worldPopulationClusters.generated';
import { WORLD_COUNTRY_DEFINITIONS } from './worldEconomy/worldCountryRegistry';

export interface AudiencePlace {
  lat: number;
  lng: number;
  /** Share of this country's audience living here. Sums to 1 per country. */
  share: number;
}

const key = (countryId: string): string => String(countryId || '').trim().toUpperCase();

/** Every place a country's audience lives, largest first.

    Falls back to a single place at the caller's own coordinate when a country
    has no clusters, so a market the generator has never seen still works —
    exactly as it did before, one point carrying all of it. */
export function audiencePlaces(
  countryId: string,
  fallback?: { lat: number; lng: number },
): AudiencePlace[] {
  const clusters: PopulationCluster[] | undefined = POPULATION_CLUSTERS[key(countryId)];
  if (clusters && clusters.length > 0) {
    return clusters.map(([lat, lng, share]) => ({ lat, lng, share }));
  }
  return fallback ? [{ lat: fallback.lat, lng: fallback.lng, share: 1 }] : [];
}

/** How many separate places a country's people live in — what a network has to
    reach to claim the whole of it. */
export const audiencePlaceCount = (countryId: string): number => (
  POPULATION_CLUSTERS[key(countryId)]?.length ?? 1
);

/** The people behind a share of a country, for a screen that wants to say how
    many rather than what fraction. */
export const populationOf = (countryId: string): number => (
  WORLD_COUNTRY_DEFINITIONS.find(country => country.id === key(countryId))?.baselinePopulation ?? 0
);

/* --- integrity --------------------------------------------------------------
   A country whose shares do not sum to 1 quietly loses or invents audience, and
   it would show up as a coverage percentage that never reaches 100 with no
   indication why. */
(() => {
  const broken = Object.entries(POPULATION_CLUSTERS)
    .map(([countryId, clusters]) => ({
      countryId,
      total: clusters.reduce((sum, cluster) => sum + cluster[2], 0),
    }))
    .filter(entry => Math.abs(entry.total - 1) > 0.02)
    .map(entry => `${entry.countryId}=${entry.total.toFixed(3)}`);
  if (broken.length > 0) {
    throw new Error(`Population shares that do not sum to 1: ${broken.join(', ')}`);
  }
})();
