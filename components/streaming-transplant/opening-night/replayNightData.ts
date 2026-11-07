/**
 * #263: the developer's replay of the opening night. Zeesh (2026-11-05): "add a cheat in mod menu which literlally just trigger the night animation evyertime or if ou can then
 * run that thing only in the server do i can see it repeeat".
 *
 * Works out what a replay shows, and changes nothing: a founded service plays with its own name, logo, network and numbers; anything it does not have yet comes from a demo
 * company, so the night can be played from any career, at any time. Nothing here is saved, and the player passed in is only read.
 */
import type { OwnedStreamingLaunchCommit, Player, StreamingLaunchOutcomeTier } from '../../../types';
import { normalizeOwnedStreamingPlatformState } from '../../../services/ownedStreamingPlatform';
import { commitOwnedStreamingLaunch, getStreamingLaunchReadiness } from '../../../services/streamingLaunch';
import { getStreamingNetworkMapView, type StreamingNetworkMapView } from '../../../services/streamingNetworkMapView';
import { openingNightMoments, openingNightStations } from '../../../services/streamingOpeningNight';
import { STREAMING_SERVER_SITES } from '../../../services/streamingServerSites';
import { STREAMING_WORLD_MARKETS } from '../../../services/streamingDayOneMarkets';
import type { Brand } from '../StreamingBrandVisuals';
import type { PremiereInputs } from '../StreamingPremiereExperience';
import { streamingPlatformBrand } from '../streamingPlatformBrand';
import { openingNightInputs, openingNightTitles } from './nightInputs';

export interface ReplayNight { brand: Brand; inputs: PremiereInputs }

export const DEMO_BRAND: Brand = {
  name: 'NORTHSTAR+', markId: 'BOLT', customMark: null, hue: 218, sat: 92, identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: '', layoutId: 'cinema',
  typeId: 'GROTESK', accentHue: 38, identMode: 'badge', identLen: 2, ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
};

const DEMO_TITLES = [
  { id: 'demo-northern-signal', title: 'Northern Signal', genre: 'THRILLER', hue: 178 },
  { id: 'demo-glass-harbour', title: 'Glass Harbour', genre: 'DRAMA', hue: 62 },
  { id: 'demo-salt-and-ember', title: 'Salt and Ember', genre: 'ROMANCE', hue: 322 },
  { id: 'demo-last-station', title: 'The Last Station', genre: 'SCI_FI', hue: 262 },
];

/* the carrier hotels and every other regional hub: a network that reaches round the world */
const demoNetwork = (): StreamingNetworkMapView => {
  const hubs = STREAMING_SERVER_SITES.filter(site => site.tier === 2).filter((_, index) => index % 2 === 0);
  const chosen = [...STREAMING_SERVER_SITES.filter(site => site.tier === 1), ...hubs];
  const countries = new Set(chosen.map(site => site.countryCode));
  return {
    built: true,
    sites: chosen.map(site => ({
      id: site.id, name: site.name, countryCode: site.countryCode, lat: site.latitude, lng: site.longitude,
      racks: site.tier === 1 ? 12 : 4, role: site.tier === 1 ? 'CORE ORIGIN' : 'REGIONAL HUB', reachKm: site.tier === 1 ? 2400 : 1200, tier: site.tier,
    })),
    markets: STREAMING_WORLD_MARKETS.filter(market => countries.has(market.id)).map(market => ({
      countryId: market.id, name: market.country, state: 'SERVED' as const, reached: 1, served: 1, audience: market.streamingAudience,
    })),
    reached: 1, served: 1, revision: 1, pending: null, peakStreams: 5_283_000, capacityStreams: 9_000_000, weeklyOperatingCost: 4_200_000,
  };
};

/* subscribers by market when the night has none of its own yet: by the size of each audience */
const marketsByAudience = (network: StreamingNetworkMapView, subscribers: number) => {
  const total = Math.max(1, network.markets.reduce((sum, market) => sum + market.audience, 0));
  return network.markets
    .map(market => ({ countryId: market.countryId, name: market.name, subscribers: Math.round(subscribers * (market.audience / total)) }))
    .sort((left, right) => right.subscribers - left.subscribers);
};

const DEMO_COMMIT: OwnedStreamingLaunchCommit = {
  id: 'replay', idempotencyKey: 'replay', committedAtAbsoluteWeek: 1000, capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 100,
  forecastLikelyConcurrentStreams: 5_283_000, forecastHighConcurrentStreams: 7_450_000, protectedPeakConcurrentStreams: 9_000_000, launchHeadroomPercent: 40,
  initialSubscribers: 7_777_502, openingDemandIndex: 78, playbackSuccessRate: 99.99, outcomeTier: 'SMOOTH_OPENING', openingTitleCount: 3, openingOriginalTitle: DEMO_TITLES[0].title,
};

/** the night as it would go at this outcome: the room there was, and how many plays worked */
export const replayCommit = (base: OwnedStreamingLaunchCommit, tier: StreamingLaunchOutcomeTier): OwnedStreamingLaunchCommit => {
  const peak = base.forecastLikelyConcurrentStreams;
  if (tier === 'DEGRADED_OPENING') return { ...base, outcomeTier: tier, playbackSuccessRate: 95.3, protectedPeakConcurrentStreams: Math.round(peak * 0.82) };
  if (tier === 'PRESSURED_OPENING') return { ...base, outcomeTier: tier, playbackSuccessRate: 98.1, protectedPeakConcurrentStreams: Math.round(peak * 0.92) };
  return { ...base, outcomeTier: tier, playbackSuccessRate: 99.99, protectedPeakConcurrentStreams: Math.max(base.protectedPeakConcurrentStreams, Math.round(peak * 1.6)) };
};

export const demoNight = (tier: StreamingLaunchOutcomeTier = 'SMOOTH_OPENING'): ReplayNight => {
  const network = demoNetwork();
  const commit = replayCommit(DEMO_COMMIT, tier);
  const openingCountryIds = ['US', 'GB', 'IN', 'JP'];
  return {
    brand: DEMO_BRAND,
    inputs: {
      title: DEMO_TITLES[0].title,
      ceiling: commit.protectedPeakConcurrentStreams,
      burstCeiling: commit.protectedPeakConcurrentStreams,
      expected: commit.forecastLikelyConcurrentStreams,
      stations: openingNightStations({ items: [], committed: true, cities: network.sites.length, countries: network.markets.length, titles: DEMO_TITLES.length, title: DEMO_TITLES[0].title, treasury: 1_800_000_000 }),
      network,
      ident: { sound: 'pulse', seconds: 3, packageId: 'STANDARD' },
      moments: openingNightMoments({ formatIds: ['DRONE_SHOW', 'LANDMARK_LIGHT_SHOW', 'CITY_SCREEN'], places: { LANDMARK_LIGHT_SHOW: 'US', CITY_SCREEN: 'GB', DRONE_SHOW: 'IN' }, openingCountryIds } as never),
      titleArt: DEMO_TITLES[0],
      posters: DEMO_TITLES,
      titleCount: DEMO_TITLES.length,
      runwayWeeks: 149,
      treasury: 1_800_000_000,
      markets: marketsByAudience(network, commit.initialSubscribers),
      weekLabel: 'Week 16',
      stories: [],
      checks: [],
      rivals: [{ name: 'Netflix', subs: '280M' }],
      committedLaunch: commit,
      launchAllowed: true,
    },
  };
};

/** the player's own service if it has one; whatever it lacks, the demo's. It always plays. */
export const replayNightOf = (player: Player | null, tier: StreamingLaunchOutcomeTier): ReplayNight => {
  const demo = demoNight(tier);
  if (!player?.ownedStreamingPlatform?.identity) return demo;
  try {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const reader: Player = { ...player, ownedStreamingPlatform: platform };
    const readiness = getStreamingLaunchReadiness(reader);
    const own = getStreamingNetworkMapView(reader);
    const network = own.sites.length ? own : demo.inputs.network!;
    const titles = openingNightTitles(reader);
    const inputs = openingNightInputs(reader, { readiness, network, ...titles });
    /* a launch it has made, or the one it would make now. The second is worked out and thrown away. */
    const saved = platform.launchCommit ?? commitOwnedStreamingLaunch(reader, 'STANDARD').launchCommit ?? null;
    const commit = replayCommit(saved ?? { ...DEMO_COMMIT, openingOriginalTitle: inputs.title || DEMO_COMMIT.openingOriginalTitle }, tier);
    const titleArt = inputs.titleArt ?? (inputs.posters?.[0]) ?? demo.inputs.titleArt;
    return {
      brand: streamingPlatformBrand(platform, null),
      inputs: {
        ...inputs,
        title: inputs.title || demo.inputs.title,
        titleArt,
        posters: inputs.posters?.length ? inputs.posters : demo.inputs.posters,
        markets: inputs.markets?.length ? inputs.markets : marketsByAudience(network, commit.initialSubscribers),
        committedLaunch: commit,
        launchAllowed: true,
      },
    };
  } catch {
    return demo;
  }
};
