import type {
  OwnedStreamingLaunchMarketingDraft,
  StreamingLaunchMarketingChannelId,
  StreamingLaunchMarketingForecastSnapshot,
} from '../../../types';
import type { StreamingLaunchMarketingRecommendations } from '../../../services/streamingLaunchMarketing';
import type { StreamingLaunchRehearsalResult } from '../../../services/streamingLaunchRehearsal';
import type { StreamingNetworkQuote } from '../../../services/streamingNetworkQuote';
import { formatStreamingCoveragePercent, STREAMING_SERVED_COVERAGE_SHARE } from '../../../services/streamingNetworkCoverage';
import { money as formatMoney } from './format';

/* ============================================================================
   BUILD THE PLATFORM — data contract and rules

   The second wizard on the streaming dashboard. Define the Launch decided what
   the service is; this decides whether it can actually be delivered.

   The rule the whole flow rests on: everything is a free drawing until the
   player commissions it. Racks, leases, repairs and campaigns are all planned
   spending until the commissioning sequence runs, and only then is treasury
   charged.
   ========================================================================== */

export type BuildStageId = 'network' | 'money' | 'test' | 'launch';

export type StageState = 'EMPTY' | 'DOING' | 'DONE' | 'WARN' | 'BLOCKED';

/* Four stages, and each one carries the single question it is asking. The whole
   wizard is long; the sentence at the top of each stage is what keeps it from
   feeling long. */
export const BUILD_STAGES: Array<{ id: BuildStageId; label: string; verb: string; ask: string }> = [
  /* One flow on Sites: country, room, racks — a room is filled where it is
     leased. Plans judges what that adds up to and how much of it you own. */
  /* Four stages (#103). Network is the region board: which regions, how many
     servers and how much cloud in each. Where the rooms stand is the placer's
     job, not a stage. "Servers" was a stage of its own between #99 and #102 —
     which building, then what goes in it — and it folded back into the row
     the region is set in, because a decision belongs beside the thing it
     decides. */
  { id: 'network', label: 'Network', verb: 'Build the network', ask: 'How will each region be served?' },
  { id: 'money', label: 'Money', verb: 'Make it fit the treasury', ask: 'Can the company afford all of this?' },
  { id: 'test', label: 'Test', verb: 'Rehearse opening night', ask: 'What will opening night actually feel like?' },
  { id: 'launch', label: 'Launch', verb: 'Commission the build', ask: 'Is this the network you will pay for?' },
];

export const STAGE_STATE_COPY: Record<StageState, { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' }> = {
  EMPTY: { label: 'Not started', tone: 'flat' },
  DOING: { label: 'In progress', tone: 'flat' },
  DONE: { label: 'Settled', tone: 'good' },
  WARN: { label: 'Needs a look', tone: 'warn' },
  BLOCKED: { label: 'Blocked', tone: 'bad' },
};

/* --- geography --------------------------------------------------------------- */

export interface Coord { lat: number; lng: number }

export interface BuildMarket {
  id: string;
  name: string;
  code: string;
  coord: Coord;
  /** Households expected on opening night, from Define the Launch. */
  demand: number;
  /** Share of the catalogue licensed here, 0–1. */
  catalogue: number;
}

/* The world is a hierarchy in this game — regions hold countries, countries
   hold the cities a rack can actually stand in — so the screen navigates the
   same way rather than presenting one flat list of cities. */

export interface Region {
  id: string;
  name: string;
  line: string;
}

export interface Country {
  id: string;
  regionId: string;
  name: string;
  code: string;
  /** Drawn silhouette key. Unknown codes fall back to a generic landmass. */
  shape: string;
  /** Is this one of the markets the service is opening in? */
  opening?: boolean;
  note: string;
}

export interface City {
  id: string;
  name: string;
  countryId: string;
  country: string;
  code: string;
  coord: Coord;
  /** Position on the country silhouette, 0–100 in both axes. */
  plot: { x: number; y: number };
  /** The team's shortlist for this footprint. */
  recommended?: boolean;
  /** Free text the marketplace shows: power prices, politics, weather. */
  note: string;
}

/* --- facilities --------------------------------------------------------------- */

export type Availability = 'AVAILABLE' | 'LIMITED' | 'RESEARCH';

import type { StreamingFacilityType } from '../../../types';
import { getStreamingRackDutyRule } from '../../../services/streamingRackGroups';
import { getPlaceByListingId } from '../../../services/streamingSitePlaces';
import { audiencePlaces } from '../../../services/worldPopulationClusters';
import { FIBRE_STANDARD_AT_LAUNCH, expectedStandard, fibreMultiplier, type StreamingFibreState } from '../../../services/streamingFibreLadder';
import {
  PEAK_CONCURRENCY_SHARE,
  baseReachKm,
  capacityFactor,
  demandInsideBase,
  effectiveReachKm,
  racksForBaseReachKm,
  reachStrength,
  servedBand,
  siteFactor,
  type ReachSource,
  type ReachTarget,
} from '../../../services/streamingNetworkReach';

export interface FacilityListing {
  id: string;
  cityId: string;
  provider: string;
  name: string;
  /** Canonical marketplace contract type; old fixtures may omit it. */
  facilityType?: StreamingFacilityType;
  type: string;
  description: string;
  rackPositions: number;
  moveIn: number;
  weeklyRent: number;
  /** Cents per kWh, shown as written. */
  powerPrice: string;
  localTax: string;
  uptime: number;
  fibre: 'Basic' | 'Good' | 'Excellent' | 'Carrier hotel';
  security: 'Standard' | 'High' | 'Vault';
  provisioningWeeks: number;
  contractMonths: number;
  expansion: number;
  note: string;
  availability: Availability;
  /** What buying this building outright costs, when it can be bought at all.
      Five years of its own rent — see `streamingTenure.ts`. */
  purchasePrice?: number;
  /** Every way this building may be held. Absent on older fixtures, which reads
      as rent-only. */
  tenures?: Array<'CLOUD' | 'RENTED' | 'OWNED'>;
  /** Canonical engineering envelope quoted by the facility contract service.
      Optional only for legacy fixtures and saves. */
  engineering?: {
    powerContractKw: number;
    backupPowerKw: number;
    backupPowerMode: string;
    coolingCapacityKw: number;
    coolingMode: string;
    committedBandwidthMbps: number;
    burstBandwidthMbps: number;
    securityRiskReductionPercent: number;
    securityRecoveryImprovementPercent: number;
  };
}

export type Duty = 'ORIGIN' | 'REGIONAL' | 'EDGE' | 'ENCODE' | 'SERVICES' | 'LIVE' | 'FUTURE';

/** The wizard's plain-English duties against the engine's own vocabulary. It
    lives beside `Duty` rather than inside the bridge component, because the map
    model needs it too and reaching into a component for a constant made an
    import cycle: studioFinanceMap -> the bridge -> BuildWizard -> StageNetwork
    -> WorldMap -> studioFinanceMap. One translation, no cycle. */
export const DUTY_TO_RACK_DUTY: Record<Duty, import('../../../types').StreamingRackDuty> = {
  ORIGIN: 'CONTENT_ORIGIN',
  REGIONAL: 'REGIONAL_CACHE',
  EDGE: 'LOCAL_EDGE',
  ENCODE: 'ENCODING',
  SERVICES: 'PLATFORM_SERVICES',
  LIVE: 'LIVE_EVENT',
  FUTURE: 'SPECIALIZED',
};

/* Every duty is named twice: what it is for a person, then what an engineer
   would call it. The plain name leads everywhere in the UI — a player should
   never have to learn the word "origin" to understand that this is where the
   library lives. */
/** Viewers one rack can start, before duty, architecture and the room's own
    power and cooling are applied. It mirrors the engine's `PER_RACK_CEILING`
    and is used only as a fallback: once a network exists the page divides its
    real carried figure by its real rack count instead, so a duty mix that
    carries more says so. */
export const SEATS_PER_RACK = 65_000;

/** Viewers a rack of a given duty actually starts.

    There were once three copies of this rule — the old room composer, the
    hand-leased network stage and `buildPlanner` each sized a rack their own
    way, two of them at roughly double this — so the same room was sized one
    way when you built it and another when the planner did. The figure lands
    in `group.capacity`, which the forecast and the map's reach gate both
    read. One definition now: the placer and the planner both come here. */
export const rackCapacity = (duty: Duty, racks: number): number => Math.round(
  racks * SEATS_PER_RACK * getStreamingRackDutyRule(DUTY_TO_RACK_DUTY[duty]).capacityMultiplier,
);

/** How many of each server a room holds. The one reading a page needs. */
export function tiersOf(facility: { groups?: ReadonlyArray<{ tier?: ServerTier; racks: number }> }): Record<ServerTier, number> {
  const out: Record<ServerTier, number> = { SCOUT: 0, WORKHORSE: 0, TITAN: 0 };
  for (const group of facility.groups || []) out[tierOf(group)] += Math.max(0, group.racks);
  return out;
}

/** Racks of a mix, each counted as what it carries against a Workhorse — the
    figure reach and capacity are computed from. Two Titans are 3.6 racks'
    worth of compute; three Scouts are 1.8. */
export function computeRacks(facility: { groups?: ReadonlyArray<{ tier?: ServerTier; racks: number }> }): number {
  return (facility.groups || []).reduce(
    (sum, group) => sum + Math.max(0, group.racks) * SERVER_TIERS[tierOf(group)].compute, 0,
  );
}

/** The duty split the engineering team gives a room, largest remainder so the
    racks always add up. The six shares are `needShare`; below six racks the
    smaller duties simply wait for the next room. */
function splitByNeed(racks: number): Array<{ duty: Duty; racks: number }> {
  const whole = Math.max(0, Math.round(racks));
  if (whole === 0) return [];
  const duties = (Object.keys(DUTY_CHARACTER) as Duty[]).filter(duty => DUTY_CHARACTER[duty].needShare > 0);
  const exact = duties.map(duty => ({ duty, exact: whole * DUTY_CHARACTER[duty].needShare }));
  const floors = exact.map(item => ({ duty: item.duty, racks: Math.floor(item.exact), remainder: item.exact - Math.floor(item.exact) }));
  let left = whole - floors.reduce((sum, item) => sum + item.racks, 0);
  for (const item of [...floors].sort((a, b) => b.remainder - a.remainder || DUTY_CHARACTER[b.duty].needShare - DUTY_CHARACTER[a.duty].needShare)) {
    if (left <= 0) break;
    item.racks += 1;
    left -= 1;
  }
  return floors.filter(item => item.racks > 0).map(item => ({ duty: item.duty, racks: item.racks }));
}

/** The rack groups a room is drawn with, from the servers the player chose.
    One entry per tier per duty, so everything underneath that reads duties
    keeps working and the page above only ever sees tiers. Shared by the
    Servers stage and the assisted planner, so a room filled by hand and a room
    filled by the team are the same shape. */
export function groupsFor(listingId: string, plan: Partial<Record<ServerTier, number>>): RackGroup[] {
  const groups: RackGroup[] = [];
  for (const tier of OPEN_TIERS) {
    const racks = Math.max(0, Math.round(plan[tier] ?? 0));
    if (racks === 0) continue;
    for (const part of splitByNeed(racks)) {
      groups.push({
        id: `g-${listingId}-${tier.toLowerCase()}-${part.duty.toLowerCase()}`,
        name: `${SERVER_TIERS[tier].name} · ${DUTIES[part.duty].name}`,
        duty: part.duty,
        tier,
        racks: part.racks,
        capacity: Math.round(rackCapacity(part.duty, part.racks) * SERVER_TIERS[tier].compute),
      });
    }
  }
  return groups;
}

/** What a room of this many of this server would carry, before it is drawn. */
export function tierCapacity(tier: ServerTier, racks: number): number {
  return groupsFor('quote', { [tier]: racks }).reduce((sum, group) => sum + group.capacity, 0);
}

export const DUTIES: Record<Duty, { name: string; tech: string; shortLine: string; line: string; locked?: boolean }> = {
  ORIGIN: { name: 'Main library', tech: 'Content origin', shortLine: 'Stores masters for the network.', line: 'Holds every title and makes the master stream the rest of the network copies.' },
  REGIONAL: { name: 'Region relay', tech: 'Regional cache', shortLine: 'Moves the library closer to a region.', line: 'Copies the library closer to a whole region and takes load off the library.' },
  EDGE: { name: 'Fast cache', tech: 'Local edge', shortLine: 'Keeps popular titles close to viewers.', line: 'Keeps the popular titles beside local viewers so playback starts instantly.' },
  ENCODE: { name: 'Video workshop', tech: 'Encoding', shortLine: 'Makes versions for every screen.', line: 'Makes the phone, tablet and television versions of every title.' },
  SERVICES: { name: 'Accounts & payments', tech: 'Platform services', shortLine: 'Runs profiles, billing and discovery.', line: 'Sign-in, profiles, search, billing, recommendations, parental controls.' },
  LIVE: { name: 'Premiere surge', tech: 'Live-event delivery', shortLine: 'Reserves capacity for live peaks.', line: 'Machines held back for premieres, sport and anything watched live.' },
  FUTURE: { name: 'Research bay', tech: 'Future workload', shortLine: 'Reserved for future delivery technology.', line: 'Reserved for delivery technology you have not researched yet.', locked: true },
};

/* ============================================================================
   THE THREE SERVERS.

   A player chooses hardware, not jobs. Scout, Workhorse and Titan differ in
   what a rack carries, what it draws from the room, and what it costs — and
   that is the whole choice: a Titan wants a room that can cool it, a Scout will
   run in a shared cabinet, a Workhorse is the rack everything is measured
   against.

   The six duties are still underneath. The commissioned platform, the weekly
   loop and the status page all read rack groups by duty, and ripping that out
   would reach into the save. So a tier is expanded into duties by `needShare`
   when the room is drawn — the engineering team assigns roles, which is
   exactly the fiction the assisted planner already runs on. The player never
   sees a duty again.
   ========================================================================== */
export type ServerTier = 'SCOUT' | 'WORKHORSE' | 'TITAN';

export const OPEN_TIERS: ServerTier[] = ['SCOUT', 'WORKHORSE', 'TITAN'];

export const SERVER_TIERS: Record<ServerTier, {
  name: string;
  line: string;
  /** Viewers per rack, against a Workhorse. */
  compute: number;
  /** Power and heat per rack, against a Workhorse. */
  draw: number;
  /** Price per rack, against a Workhorse. */
  price: number;
  /** How far its compute throws, against a Workhorse.

      The three servers were the same machine at three sizes until #114: more
      compute, more heat, more money, and reach that followed compute alone.
      So the only question was how many racks you could afford, and a network
      of Titans looked exactly like a network of Scouts, only bigger.

      Reach is what separates them now. A Titan throws most of a region from
      one room, so a handful of them IS the network — central, and everything
      resting on a few addresses. A Scout barely leaves the city it is in, so
      covering the same ground takes one in every city — slow to buy, dear per
      kilometre, and impossible to knock over. Roughly a Titan covers the
      ground of ten Scouts, which is the shape of the trade: five Titans or
      fifty Scouts, and the difference is what happens when one goes down. */
  reach: number;
  /** Where it will run. */
  fits: string;
}> = {
  /*                                    compute  draw  price  reach */
  SCOUT:     { name: 'Scout',     compute: 0.6,  draw: 0.6, price: 0.5, reach: 0.62, line: 'Small and cheap, and it serves the city it is in.', fits: 'Runs anywhere, even a shared cabinet.' },
  WORKHORSE: { name: 'Workhorse', compute: 1,    draw: 1,   price: 1,   reach: 1,    line: 'The rack everything is measured against.', fits: 'Wants a decent room.' },
  TITAN:     { name: 'Titan',     compute: 1.8,  draw: 1.6, price: 2.2, reach: 1.7,  line: 'Throws across a region from one room. Dense, hot, expensive.', fits: 'Needs a suite or a hall — a cabinet cannot cool it.' },
};

export const tierOf = (group: { tier?: ServerTier }): ServerTier => group.tier ?? 'WORKHORSE';

/** A Titan needs a suite or a hall: the smallest room that can take one, in
    positions. The tier's own line has said so since #99; the fit test only
    checked kilowatts, and with a site in every city (#109) the placer found
    four-position shared floors whose contract could carry the watts and put
    Titans in cabinets. */
export const TITAN_MIN_POSITIONS = 8;

export interface RackGroup {
  id: string;
  name: string;
  duty: Duty;
  /** Which server this group is racks of. Absent on a save or fixture written
      before servers had tiers, which has always meant a Workhorse. */
  tier?: ServerTier;
  racks: number;
  /** Streams this group can carry when built. */
  capacity: number;
  migration?: { weeks: number; pressure: number };
}

export type Limiting = 'NONE' | 'RACK' | 'POWER' | 'COOLING' | 'BANDWIDTH' | 'CONDITION';

export const SUPPLY_COPY: Record<Exclude<Limiting, 'NONE'>, { name: string; tone: string }> = {
  RACK: { name: 'Floor space', tone: 'space' },
  POWER: { name: 'Power', tone: 'power' },
  COOLING: { name: 'Cooling', tone: 'cool' },
  BANDWIDTH: { name: 'Fibre', tone: 'fibre' },
  CONDITION: { name: 'Condition', tone: 'space' },
};

export const LIMITING_COPY: Record<Limiting, string> = {
  NONE: 'Nothing is holding this room back.',
  RACK: 'Out of floor space — there is nowhere to bolt another cabinet.',
  POWER: 'The power contract is the ceiling. More racks need more amps.',
  COOLING: 'Cooling is the ceiling. The room cannot carry the heat.',
  BANDWIDTH: 'Fibre is the ceiling. The racks can serve more than the pipe can carry.',
  CONDITION: 'The room needs maintenance before it can be trusted with more load.',
};

export interface Facility {
  id: string;
  listingId: string;
  cityId: string;
  /** How this room is held. Chosen in the drawer, and it has to survive all the
      way to the commissioned facility — a decision the player made that got
      dropped on the way out would be worse than not offering it. Absent reads
      as rented, which is what every draft written before ownership meant. */
  tenure?: 'CLOUD' | 'RENTED' | 'OWNED';
  /** Which provider a cloud region is rented from. Absent reads as the global
      one, which is what every cloud room drawn before providers existed was. */
  provider?: CloudProviderId;
  /** Compute bought above the provider's normal ceiling here, billed at the
      step-up rate. A limit is a cost, not a wall. */
  cloudExtended?: number;
  /** False while it is still a drawing. */
  built: boolean;
  groups: RackGroup[];
  power: { used: number; contracted: number };
  cooling: { used: number; available: number };
  bandwidth: { used: number; available: number };
  condition: number;          // 0–1
  uptime: number;             // 0–1
  backup: string;
  backupCoverage: number;     // 0–1
  energyPerWeek: number;      // MWh
  waterPerWeek: number;       // m³
  opCost: number;             // weekly
  sustainability: number;     // 0–100
  reputation: number;         // 0–100
}

export interface Repair {
  id: string;
  facilityId: string;
  label: string;
  /** What this actually is, in one sentence. "Second fibre entrance" means
      nothing to a player until someone says it is a second cable route into the
      building so one digger cannot take you off the internet. */
  what: string;
  cost: number;
  fixes: Limiting;
  weeks: number;
}

/* --- shape of the build -------------------------------------------------------- */

export type Architecture = 'CLOUD' | 'HYBRID' | 'METAL';
export type Doctrine = 'HARDENED' | 'STANDARD' | 'SPRINT';

export const ARCHITECTURES: Record<Architecture, { name: string; line: string; effects: string[] }> = {
  CLOUD: { name: 'Cloud first', line: 'Rent everything. Fast to stand up, expensive to keep.', effects: ['Low to build', 'High every week', 'Strong burst protection', 'Extra latency'] },
  HYBRID: { name: 'Hybrid', line: 'Own the core, rent the edge.', effects: ['Balanced cost', 'Moderate burst protection', 'Most common choice'] },
  METAL: { name: 'Owned metal', line: 'Buy the machines. Slow, dear, and cheap forever after.', effects: ['High to build', 'Low every week', 'Longer construction', 'No rented burst'] },
};

export const DOCTRINES: Record<Doctrine, { name: string; line: string; effects: string[] }> = {
  HARDENED: { name: 'Hardened', line: 'Test everything twice before it carries a viewer.', effects: ['Longest build', 'Slightly dearer', 'No engineering debt'] },
  STANDARD: { name: 'Standard', line: 'Build it properly and move on.', effects: ['Normal time', 'Normal cost', 'A little debt'] },
  SPRINT: { name: 'Sprint', line: 'Get it standing. Fix it later.', effects: ['Fastest build', 'Dearest', 'Real technical debt', 'Unstable under load'] },
};

export interface NetworkPreset {
  id: string;
  name: string;
  racks: number;
  cities: number;
  line: string;
}

export interface TeamInstructions {
  priority: 'CASH' | 'BALANCED' | 'ONLINE' | 'PREMIUM';
  maxBudget: number;
  risk: 'CAREFUL' | 'NORMAL' | 'FAST';
  preferredCityIds: string[];
  askAbove: number;
}

export interface TeamDraft {
  cityIds: string[];
  racks: number;
  networkCost: number;
  reserveCost: number;
  commitment: number;
  reasoning: string;
  warnings: string[];
  needsFounder: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  cost: number;
  line: string;
  multiplier: number;
}

export interface SpendLine {
  id: string;
  label: string;
  amount: number;
  note?: string;
  /** Comes from Define the Launch and cannot be changed here. */
  locked?: boolean;
  /** When this commitment actually moves money. Omitted means commissioning. */
  timing?: 'COMMISSION' | 'OPENING_NIGHT' | 'SETTLED';
}

/* --- service and rehearsal ------------------------------------------------------ */

export type ServiceState = 'READY' | 'WATCH' | 'POOR' | 'UNSTABLE' | 'NONE';

export const SERVICE_COPY: Record<ServiceState, { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' }> = {
  READY: { label: 'Ready', tone: 'good' },
  WATCH: { label: 'Watch it', tone: 'warn' },
  POOR: { label: 'Poor', tone: 'warn' },
  UNSTABLE: { label: 'Unstable', tone: 'bad' },
  NONE: { label: 'No delivery path', tone: 'bad' },
};

/** One population cluster of a market, as the forecast graded it — what the
    map paints (#108). */
export interface PlaceService {
  lat: number;
  lng: number;
  /** Its share of the market's audience, 0–1. */
  share: number;
  state: 'SERVED' | 'REACHED' | 'DARK';
  /** Served, and the nearest good room is rented. */
  cloud: boolean;
}

export interface CountryService {
  marketId: string;
  name: string;
  code: string;
  servedBy: string[];
  role: string;
  state: ServiceState;
  startupMs: number;
  buffering: number;      // %
  peak: number;           // concurrent streams
  /** The share of this market's audience inside any ring at all, 0–1 —
      reached, whatever the quality of the stream there. `coveredShare` below
      is the part of it served to the standard; the gap between the two is a
      thin region, which is what the Test stage names. */
  reachedShare: number;
  /** The share of this market's audience inside somebody's reach, 0–1.

      A market is its population clusters — real cities, weighted by share — so
      "half of India" is a state that can exist. Before this a market was one
      coordinate and one room in reach of it served the whole country. */
  coveredShare: number;
  /** Canonical smooth geographic footprint before local compute is applied.
      Commissioning grades this independently of the load rehearsal. */
  geographicCoveredShare?: number;
  /** That share as people on the night, which is the number a screen should
      show when it says "covered". */
  coveredPeak: number;
  /** The market's population clusters, each graded where it is. Absent from
      a canonical forecast, which grades a market whole; the map then paints
      every cluster the market's own colour. */
  places?: PlaceService[];
  /** The part of `coveredShare` whose nearest good room is a cloud region —
      so a region's served bar can be drawn in two colours, yours and rented. */
  cloudServedShare?: number;
  /** False when a canonical projection could not supply a trustworthy reading. */
  coverageAvailable?: boolean;
  catalogue: number;      // 0–1
  localization: string;
  fix?: string;
}

export type Scenario = 'QUIET' | 'LIKELY' | 'SURGE';

export const SCENARIOS: Record<Scenario, { name: string; line: string; factor: number }> = {
  QUIET: { name: 'Quiet night', line: 'Fewer arrive than you hoped.', factor: 0.55 },
  LIKELY: { name: 'Likely night', line: 'The night you are planning for.', factor: 1 },
  SURGE: { name: 'Surge', line: 'It becomes the thing everyone opens at once.', factor: 1.9 },
};

export type Verdict = 'HELD' | 'RENTED' | 'BROKE';

export interface RehearsalResult {
  /** The configuration this rehearsal was run against. If the live signature
      no longer matches, the result is stale and must be run again. */
  signature: string;
  scenario: Scenario;
  verdict: Verdict;
  peak: number;
  capacity: number;
  spare: number;
  failedPct: number;
  catalogue: number;
  spof: number;
  held: string[];
  failed: string[];
  /** Per country and per room, so a verdict can be argued with. */
  countries: Array<{ name: string; code: string; demand: number; failedPct: number; state: ServiceState }>;
  rooms: Array<{ city: string; load: number; limiting: Limiting; failedPct: number }>;
}

/* --- the whole thing ------------------------------------------------------------- */

export interface BuildData {
  company: { name: string; week: number; brandHex?: string; logoSrc?: string; signatoryName?: string };
  treasury: { available: number; committedLaunch: number };
  /** True only when the player explicitly confirmed at least one Day-One market. */
  hasExplicitOpeningMarkets?: boolean;
  /** Filing gate passed from the canonical career operation ledger. */
  marketPlanning?: { editable: boolean; reason: string | null };
  /** Canonical concurrent-stream demand from the World Economy bridge. */
  openingDemand?: { low: number; likely: number; high: number };
  /** Where the platform sits on the fibre ladder. Absent on older saves and on
      callers that have no platform, which reads as the launch position. */
  fibre?: StreamingFibreState;
  /** Weeks the platform has been running, which is what moves the expected
      standard. Absent reads as week zero, so a save written before the ladder
      existed is graded exactly as it was. */
  platformWeeks?: number;
  markets: BuildMarket[];
  regions: Region[];
  countries: Country[];
  cities: City[];
  listings: FacilityListing[];
  presets: NetworkPreset[];
  campaigns: Campaign[];
  marketing?: {
    draft: OwnedStreamingLaunchMarketingDraft;
    recommendations: StreamingLaunchMarketingRecommendations;
    forecast: StreamingLaunchMarketingForecastSnapshot;
    channels: Array<{
      id: StreamingLaunchMarketingChannelId;
      label: string;
      line: string;
      available: boolean;
      reason?: string;
    }>;
  };
  /** Everything Define the Launch already committed the company to. */
  spend: SpendLine[];
  defineLaunchChecks?: Array<{
    id: string;
    label: string;
    complete: boolean;
    detail: string;
    step: import('../../../types').StreamingDefineLaunchStepId;
  }>;
  pricing: {
    model: string;
    plans: number;
    arpu: number;
    reach: number;
    problems: string[];
  };
  /** Repairs the engineers have costed for the current drawing. */
  repairs: Repair[];
  team: TeamInstructions;
  /** Facilities that already exist, if the player has built before. */
  existing: Facility[];
  commissioned: boolean;
  /** Canonical game-week window for a commissioned network that is still being built. */
  construction?: { committedAtWeek: number; readyAtWeek: number };
  /** Saved careers require canonical handlers. Only isolated fixtures may use local fallbacks. */
  canonicalMode?: 'FIXTURE' | 'CAREER';
  /**
   * Actor Empire supplies these derivations from its canonical infrastructure
   * services. The ZIP demo deliberately omits the bridge and uses the local
   * fallback rules below.
   */
  canonical?: {
    /** Canonical room projections for the current drawing. The Plans stage
        consumes these so every visible meter agrees with commissioning and
        rehearsal instead of maintaining a second approximation. */
    facilities?: (draft: BuildDraft) => Facility[];
    /** Exact canonical quote behind every region and network total shown on Money. */
    quote?: (draft: BuildDraft) => StreamingNetworkQuote;
    totals: (draft: BuildDraft) => BuildTotals;
    money: (draft: BuildDraft) => MoneyPlan;
    services: (draft: BuildDraft) => CountryService[];
    signature: (draft: BuildDraft) => string;
    /** Full canonical evidence consumed by Actor Empire's animated rehearsal. */
    runRehearsal?: (draft: BuildDraft, scenario: Scenario) => StreamingLaunchRehearsalResult;
    rehearse: (draft: BuildDraft, scenario: Scenario) => RehearsalResult;
  };
}

export const assertCanonicalBuildData = (
  data: Pick<BuildData, 'canonicalMode' | 'canonical'>,
): void => {
  if (data.canonicalMode === 'CAREER' && !data.canonical) {
    throw new Error('Career Build is missing canonical handlers; local fixture calculations are disabled.');
  }
};

export interface BuildDraft {
  facilities: Facility[];
  architecture: Architecture;
  /** 0–1: how much of the fleet you own rather than rent. The three
      architectures are presets on this one number — cloud is 0.15, hybrid is
      anywhere in the middle, owned metal is 1 — which is what lets a player
      say "hybrid, but mostly mine" instead of picking a word. */
  ownedShare: number;
  doctrine: Doctrine;
  campaignId: string;
  mode: 'ASSISTED' | 'HANDS';
  instructions: TeamInstructions;
  repairIds: string[];
  rehearsal: RehearsalResult | null;
  override: boolean;
  /** The team owns editing after its proposal is approved; commissioning remains player-only. */
  teamPlanApproved?: boolean;
  /** Capability label earned by the approved proposal. It is descriptive, not a pricing tier. */
  teamPlanClass?: 'STARTER' | 'ESSENTIAL' | 'GROWTH' | 'PREMIERE';
}

export interface BuildHandlers {
  onExit?: () => void;
  onOpenStudioFinance?: () => void;
  onEditPricing?: () => void;
  onOpenDefine?: (step: import('../../../types').StreamingDefineLaunchStepId) => void;
  onOpenLaunchBudget?: () => void;
  onOpenRehearsal?: (draft: BuildDraft) => void;
  onValidateCommission?: (draft: BuildDraft) => { ok: boolean; message: string } | void;
  onCommission?: (draft: BuildDraft) => { ok: boolean; message: string } | void;
  onOpeningNight?: () => void;
  onChangeMarketing?: (patch: Partial<OwnedStreamingLaunchMarketingDraft>) => void;
}

/* --- derivations ------------------------------------------------------------------ */

export function countriesIn(data: BuildData, regionId: string): Country[] {
  return data.countries.filter((c) => c.regionId === regionId);
}

export function citiesIn(data: BuildData, countryId: string): City[] {
  return data.cities.filter((c) => c.countryId === countryId);
}

export function totalRacks(facilities: Facility[]): number {
  return facilities.reduce((sum, f) => sum + f.groups.reduce((g, group) => g + group.racks, 0), 0);
}

export function facilityRacks(facility: Facility): number {
  return facility.groups.reduce((sum, g) => sum + g.racks, 0);
}

/** Fits a rack-duty drawing inside a physical room without inventing space.
    Existing duties are retained where the room has enough positions, and each
    retained group's per-rack capacity stays unchanged. */
export function fitRackGroupsToLimit(groups: RackGroup[], rackLimit: number): RackGroup[] {
  const active = groups.filter(group => group.racks > 0);
  const requested = active.reduce((sum, group) => sum + group.racks, 0);
  const target = Math.max(0, Math.min(requested, Math.floor(rackLimit)));
  if (target === 0 || active.length === 0) return [];

  let allocations: number[];
  if (target >= requested) {
    allocations = active.map(group => group.racks);
  } else if (target < active.length) {
    const retained = new Set(active
      .map((group, index) => ({ index, racks: group.racks, critical: group.duty === 'ORIGIN' }))
      .sort((left, right) => Number(right.critical) - Number(left.critical)
        || right.racks - left.racks
        || left.index - right.index)
      .slice(0, target)
      .map(item => item.index));
    allocations = active.map((_, index) => retained.has(index) ? 1 : 0);
  } else {
    const remaining = target - active.length;
    const shares = active.map((group, index) => {
      const exact = remaining * (group.racks / requested);
      return { index, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    allocations = shares.map(item => item.floor + 1);
    let unassigned = target - allocations.reduce((sum, racks) => sum + racks, 0);
    shares
      .slice()
      .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
      .forEach(item => {
        if (unassigned <= 0) return;
        allocations[item.index] += 1;
        unassigned -= 1;
      });
  }

  return active.flatMap((group, index) => {
    const racks = allocations[index] ?? 0;
    if (racks <= 0) return [];
    const capacityPerRack = group.capacity / Math.max(1, group.racks);
    return [{
      ...group,
      racks,
      capacity: Math.round(capacityPerRack * racks),
    }];
  });
}

export function listingFor(data: BuildData, facility: Facility): FacilityListing | undefined {
  return data.listings.find((l) => l.id === facility.listingId);
}

export function cityFor(data: BuildData, facility: Facility): City | undefined {
  return data.cities.find((c) => c.id === facility.cityId);
}

/** Repeated leases remain separate physical rooms, but Sites presents contracts
    from the same marketplace listing as one readable stack. */
export interface FacilityLeaseGroup {
  listingId: string;
  listing?: FacilityListing;
  facilities: Facility[];
  count: number;
  racks: number;
  weeklyRent: number;
}

export function groupFacilityLeases(data: BuildData, facilities: Facility[]): FacilityLeaseGroup[] {
  const groups = new Map<string, FacilityLeaseGroup>();
  facilities.forEach((facility) => {
    const listing = listingFor(data, facility);
    const current = groups.get(facility.listingId);
    if (current) {
      current.facilities.push(facility);
      current.count += 1;
      current.racks += facilityRacks(facility);
      current.weeklyRent += listing?.weeklyRent ?? 0;
      return;
    }
    groups.set(facility.listingId, {
      listingId: facility.listingId,
      listing,
      facilities: [facility],
      count: 1,
      racks: facilityRacks(facility),
      weeklyRent: listing?.weeklyRent ?? 0,
    });
  });
  return Array.from(groups.values());
}

/** A stable human label for one physical room inside a repeated lease stack. */
export function facilityRoomLabel(data: BuildData, facilities: Facility[], facility: Facility): string {
  const peers = facilities.filter((candidate) => candidate.listingId === facility.listingId);
  const ordinal = Math.max(0, peers.findIndex((candidate) => candidate.id === facility.id)) + 1;
  const city = cityFor(data, facility)?.name ?? 'Facility';
  return `${city} · Room ${String(ordinal).padStart(2, '0')}`;
}

/** What prevents this room from running the rack drawing. A room using every
    valid floor position is full, not broken; only overflow is a constraint. */
export function limitingFactor(data: BuildData, facility: Facility): Limiting {
  const listing = listingFor(data, facility);
  const racks = facilityRacks(facility);
  if (listing && racks > listing.rackPositions) return 'RACK';
  if (facility.power.used >= facility.power.contracted) return 'POWER';
  if (facility.cooling.used >= facility.cooling.available) return 'COOLING';
  if (facility.bandwidth.used >= facility.bandwidth.available) return 'BANDWIDTH';
  if (facility.condition < 0.5) return 'CONDITION';
  return 'NONE';
}

/** 0–1: how much of this room's drawn racks it can actually run. */
export function usableCapacity(data: BuildData, facility: Facility): number {
  const listing = listingFor(data, facility);
  const racks = Math.max(1, facilityRacks(facility));
  const bySpace = listing ? listing.rackPositions / racks : 1;
  const byPower = facility.power.contracted / Math.max(1, facility.power.used);
  const byCooling = facility.cooling.available / Math.max(1, facility.cooling.used);
  const byPipe = facility.bandwidth.available / Math.max(1, facility.bandwidth.used);
  return Math.max(0, Math.min(1, bySpace, byPower, byCooling, byPipe));
}

export type Redundancy = 'REDUNDANT' | 'EXPOSED' | 'SINGLE';

export function redundancy(facilities: Facility[]): Redundancy {
  const cities = new Set(facilities.map((f) => f.cityId)).size;
  /* Rooms with servers in them. This counted rooms holding an ORIGIN group,
     which a player can no longer choose to hold — and every racked room gets
     its share of the library now, so "has racks" is the same test. */
  const serving = facilities.filter((f) => computeRacks(f) > 0).length;
  if (cities >= 3 && serving >= 2) return 'REDUNDANT';
  if (cities >= 2) return 'EXPOSED';
  return 'SINGLE';
}

export const REDUNDANCY_COPY: Record<Redundancy, { label: string; tone: 'good' | 'warn' | 'bad'; line: string }> = {
  REDUNDANT: { label: 'Redundant', tone: 'good', line: 'Lose a city and the service stays up.' },
  EXPOSED: { label: 'Exposed', tone: 'warn', line: 'Lose the wrong city and a region goes dark.' },
  SINGLE: { label: 'Single point of failure', tone: 'bad', line: 'One room, one power feed, one bad night.' },
};

export const ARCH_SHARE: Record<Architecture, number> = { CLOUD: 0.15, HYBRID: 0.6, METAL: 1 };

/** Which architecture a given mix is closest to. */
export function architectureFor(share: number): Architecture {
  if (share <= 0.3) return 'CLOUD';
  if (share >= 0.9) return 'METAL';
  return 'HYBRID';
}

/** How much of the network's compute stands in buildings you fill, against
    cloud you rent — read off the rooms, never chosen.

    It was a dial. `ownedShare` scaled the build cost by 0.6× to 1.45×, the
    weekly cost by 1.7× to 0.65× and invented up to 55% of "burst" on top of
    the capacity, whatever the rooms actually were: a draft of three halls read
    as "cloud first" if the dial said so, and got a cheaper build and a dearer
    week for it. The rooms decide now. A cloud region IS rented compute; a
    building you fill IS owned metal. The three names stay, for the team's
    brief and for the save, which carries one of them. Nothing taken yet reads
    as the old default, hybrid, so an empty draft changes nothing downstream. */
export function ownedShareOf(draft: Pick<BuildDraft, 'facilities'>): number {
  const total = draft.facilities.reduce((sum, facility) => sum + computeRacks(facility), 0);
  if (total <= 0) return ARCH_SHARE.HYBRID;
  const cloud = draft.facilities
    .filter((facility) => facility.tenure === 'CLOUD')
    .reduce((sum, facility) => sum + computeRacks(facility), 0);
  return (total - cloud) / total;
}

export const architectureOf = (draft: Pick<BuildDraft, 'facilities'>): Architecture => (
  architectureFor(ownedShareOf(draft))
);
const RACK_COST = 3_750_000;   // one rack, delivered and racked

export interface BuildTotals {
  /** Racks in buildings — the ones that get bought, bolted and built. */
  racks: number;
  /** Cloud compute, rented — nothing to bolt, running from week one. */
  compute: number;
  /** Every city with a room of any kind: how wide the network stands. */
  cities: number;
  /** Cities with a building — where deposits are paid and crews go. */
  buildingCities: number;
  capacity: number;        // concurrent streams the drawing can carry
  burst: number;           // protected burst on top
  buildCost: number;
  weeklyCost: number;
  weeks: number;
  energy: number;
  water: number;
  sustainability: number;
  reputation: number;
  redundancy: Redundancy;
}

/** What taking this room costs up front, and what it costs every week.

    Both read the tenure. Before this they read the listing alone, so a building
    you had chosen to BUY was still billed a move-in fee and a weekly rent — the
    choice existed in the drawer and changed nothing about the money, which is
    the worst possible version of offering it. */
/** What a Workhorse's worth of cloud compute costs a week.

    Tuned on the crossover, measured (#101): with the real rooms in Toronto,
    New York, Mumbai and Lagos, at $40K a week a building beat cloud only after
    two to twelve YEARS — cloud was the right answer for the whole game. At
    this rate the building is cheaper from week 28 to 35 in every city and at
    every size measured: a cabinet with two Workhorses, a suite with eight, a
    hall with sixteen. Launch on cloud, build inside the first season. A rack
    costs $3.75M, so this is 25 weeks of cloud rent for the rack alone. */
export const CLOUD_WEEKLY_PER_RACK = 150_000;

/* --- cloud providers ------------------------------------------------------------
   Three, not five: five cannot be compared on a phone. Each is a rate against
   the going price, a reach factor, a ceiling against the region's normal caps,
   and the regions it sells in. A provider is chosen per region; the rooms it
   rents you are ordinary cloud rooms in the region's cities, which is what the
   save and the weekly loop read. */

export type CloudProviderId = 'ATLAS' | 'NORTHWIND' | 'MERIDIAN';

export interface CloudProvider {
  id: CloudProviderId;
  name: string;
  line: string;
  /** Against `CLOUD_WEEKLY_PER_RACK`. */
  rate: number;
  /** Multiplies how far its compute reaches. */
  reach: number;
  /** Multiplies the region's normal caps. */
  ceiling: number;
  /** Where it sells. */
  regions: 'ALL' | readonly string[];
}

export const CLOUD_PROVIDERS: Record<CloudProviderId, CloudProvider> = {
  ATLAS: {
    id: 'ATLAS', name: 'Atlas Compute', line: 'Everywhere, at the going rate, and further than a building.',
    rate: 1, reach: 1.2, ceiling: 1, regions: 'ALL',
  },
  NORTHWIND: {
    id: 'NORTHWIND', name: 'Northwind', line: 'Cheaper, and reaches no further than a building. Not sold in Africa or South America.',
    rate: 0.7, reach: 1, ceiling: 1, regions: ['NORTH_AMERICA', 'EUROPE', 'ASIA', 'OCEANIA'],
  },
  MERIDIAN: {
    id: 'MERIDIAN', name: 'Meridian Edge', line: 'Reaches furthest, sells the smallest plans, sends the biggest bill.',
    rate: 1.45, reach: 1.5, ceiling: 0.6, regions: 'ALL',
  },
};

export const CLOUD_PROVIDER_IDS: CloudProviderId[] = ['ATLAS', 'NORTHWIND', 'MERIDIAN'];

/** Compute above a provider's normal ceiling costs this much more per week. */
export const CLOUD_EXTENSION_PREMIUM = 1.5;

export const cloudProviderServes = (provider: CloudProvider, regionId: string): boolean => (
  provider.regions === 'ALL' || provider.regions.includes(regionId)
);

export const providerOf = (facility: Pick<Facility, 'provider'>): CloudProvider => (
  CLOUD_PROVIDERS[facility.provider ?? 'ATLAS']
);

/** How much further, or less far, a room's compute reaches: who you rent it
    from for a cloud region, and what is standing in it for a building —
    compute-weighted, so a room of Titans and Scouts throws somewhere between
    the two (#114). The map and the forecast both come through here, so a
    field and its verdict cannot be drawn from different servers. */
export const facilityReachFactor = (
  facility: Pick<Facility, 'tenure' | 'provider'> & { groups?: ReadonlyArray<{ tier?: ServerTier; racks: number }> },
): number => {
  if (facility.tenure === 'CLOUD') return providerOf(facility).reach;
  const held = tiersOf(facility);
  let compute = 0;
  let thrown = 0;
  for (const tier of OPEN_TIERS) {
    const spec = SERVER_TIERS[tier];
    compute += held[tier] * spec.compute;
    thrown += held[tier] * spec.compute * spec.reach;
  }
  return compute > 0 ? thrown / compute : 1;
};

/** About how far one kind of server serves a stream to the standard, at this
    many racks — the figure a player needs before buying one (#119). Measured
    on neutral ground, because the true radius depends on the address the
    placer picks; "about" is the honest word for it on a card. */
export function tierReachKm(tier: ServerTier, racks: number, fibre = 1, standard = FIBRE_STANDARD_AT_LAUNCH): number {
  const spec = SERVER_TIERS[tier];
  const source = { cityId: '', lat: 0, lng: 0, racks: Math.max(0, racks) * spec.compute, capacity: Number.POSITIVE_INFINITY, spread: 1, transit: 0.8 };
  if (source.racks <= 0) return 0;
  return Math.round(baseReachKm(source) * spec.reach * siteFactor(source) * fibre * servedBand(standard));
}

/** The reach a plan of servers would throw, per unit of compute — what the
    placer asks before it has rooms to read it off. */
export function planReachFactor(plan: TierPlan): number {
  let compute = 0;
  let thrown = 0;
  for (const tier of OPEN_TIERS) {
    const spec = SERVER_TIERS[tier];
    const racks = plan[tier] ?? 0;
    compute += racks * spec.compute;
    thrown += racks * spec.compute * spec.reach;
  }
  return compute > 0 ? thrown / compute : 1;
}

/** And the compute a rack of that plan carries, on average. */
export function planComputePerRack(plan: TierPlan): number {
  const racks = planRacks(plan);
  if (racks <= 0) return 1;
  return OPEN_TIERS.reduce((sum, tier) => sum + (plan[tier] ?? 0) * SERVER_TIERS[tier].compute, 0) / racks;
}

/** What a cloud room costs a week: its compute at the provider's rate, and
    anything bought above the ceiling at the step-up. */
export function cloudWeeklyCost(
  facility: { groups?: ReadonlyArray<{ tier?: ServerTier; racks: number }>; provider?: CloudProviderId; cloudExtended?: number },
): number {
  const rate = CLOUD_WEEKLY_PER_RACK * providerOf(facility).rate;
  const compute = computeRacks(facility);
  const extended = Math.max(0, Math.min(compute, Math.round(facility.cloudExtended ?? 0)));
  return Math.round((compute - extended) * rate + extended * rate * CLOUD_EXTENSION_PREMIUM);
}

export function facilityCapitalCost(data: BuildData, facility: Facility): number {
  /* No building, no metal, nothing to move in. */
  if (facility.tenure === 'CLOUD') return 0;
  const listing = listingFor(data, facility);
  if (!listing) return 0;
  return facility.tenure === 'OWNED'
    ? (listing.purchasePrice ?? listing.moveIn ?? 0)
    : (listing.moveIn ?? 0);
}

export function facilityWeeklyRent(data: BuildData, facility: Facility): number {
  if (facility.tenure === 'OWNED') return 0;
  /* Priced by the compute you asked for, not by the building — there is no
     building. A cloud room with nothing in it costs nothing. */
  if (facility.tenure === 'CLOUD') return cloudWeeklyCost(facility);
  return listingFor(data, facility)?.weeklyRent ?? 0;
}

/** What the servers in a draft cost to buy, each priced by what it is. Cloud
    racks are rented compute and cost nothing up front — that is the point of
    cloud, and the reason it costs more every week. */
export function rackSpend(draft: BuildDraft): number {
  return draft.facilities.reduce((sum, facility) => sum + (
    facility.tenure === 'CLOUD' ? 0 : (facility.groups || []).reduce(
      (roomSum, group) => roomSum + group.racks * rackBuildCost(tierOf(group)), 0,
    )
  ), 0);
}

export function buildTotals(data: BuildData, draft: BuildDraft): BuildTotals {
  if (data.canonical) return data.canonical.totals(draft);
  /* Racks are what stands in a building; compute is what cloud rents. The
     two were one figure until #106, so a network of three racks and four
     compute read "7 racks · 7 weeks to build" over rooms that were running
     from week one, and every cloud city counted toward the deposits. */
  const buildings = draft.facilities.filter((f) => f.tenure !== 'CLOUD');
  const clouds = draft.facilities.filter((f) => f.tenure === 'CLOUD');
  const racks = totalRacks(buildings);
  const compute = totalRacks(clouds);
  const cities = new Set(draft.facilities.map((f) => f.cityId)).size;
  const buildingCities = new Set(buildings.map((f) => f.cityId)).size;
  const moveIn = draft.facilities.reduce((sum, f) => sum + facilityCapitalCost(data, f), 0);
  const rent = draft.facilities.reduce((sum, f) => sum + facilityWeeklyRent(data, f), 0);
  const ops = draft.facilities.reduce((sum, f) => sum + f.opCost, 0);
  const repairs = data.repairs.filter((r) => draft.repairIds.includes(r.id)).reduce((sum, r) => sum + r.cost, 0);

  /* What the rooms carry, split by how they are held: `capacity` is the
     buildings you filled, `burst` is the cloud you rent, and their sum is the
     network. `burst` used to be a fiction — up to 55% on top of everything,
     from the ownership dial — so a cloud-heavy drawing carried half again
     what its racks could start. The word means now what the Test stage always
     drew it as: the machines you do not own, standing past the end of the
     aisle. */
  const carriedBy = (f: Facility) => f.groups.reduce((g, group) => g + group.capacity * usableCapacity(data, f), 0);
  const capacity = draft.facilities.filter((f) => f.tenure !== 'CLOUD').reduce((sum, f) => sum + carriedBy(f), 0);
  const burst = draft.facilities.filter((f) => f.tenure === 'CLOUD').reduce((sum, f) => sum + carriedBy(f), 0);

  /* Construction is buildings. A cloud plan is ready when the provider says
     — a week or two — so a network with nothing to build is ready then. */
  const longestBuild = Math.max(0, ...buildings.map((f) => listingFor(data, f)?.provisioningWeeks ?? 0));
  const longestCloud = Math.max(0, ...clouds.map((f) => listingFor(data, f)?.provisioningWeeks ?? 0));
  const extraRooms = Math.max(0, buildings.length - buildingCities);
  const weeks = buildings.length === 0
    ? Math.max(0, longestCloud - 1)
    : Math.max(4, Math.min(15, Math.ceil(
      2 + longestBuild * .35 + racks * .28 + Math.max(0, buildingCities - 1) * .7 + extraRooms * .18,
    )));

  return {
    racks,
    compute,
    cities,
    buildingCities,
    capacity: Math.round(capacity),
    burst: Math.round(burst),
    /* Priced per duty, not per rack.

       This was `racks * RACK_COST`, a flat $3.75M whatever the rack was for —
       so adding a Main library and adding a Premiere surge quoted the same
       $154M and the choice carried no cost at all. An idle burst reserve is
       dearer than an accounts box; now the quote says so. */
    /* No multiplier on either. The racks cost what the tier costs, the rooms
       cost what the listing says, and cloud costs nothing here and everything
       every week — which is the trade Money now lays out room by room. */
    buildCost: Math.round(rackSpend(draft) + moveIn + repairs),
    weeklyCost: Math.round(rent + ops),
    weeks,
    energy: draft.facilities.reduce((sum, f) => sum + f.energyPerWeek, 0),
    water: draft.facilities.reduce((sum, f) => sum + f.waterPerWeek, 0),
    sustainability: average(draft.facilities.map((f) => f.sustainability)),
    reputation: average(draft.facilities.map((f) => f.reputation)),
    redundancy: redundancy(draft.facilities),
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/** "3 racks · 4 compute", either alone when the other is nothing, and
    'nothing' when both are. One phrase for the header, the gate, the
    agreement and the cinematic, so they cannot count differently. */
export function kitWords(totals: Pick<BuildTotals, 'racks' | 'compute'>, joiner = ' · '): string {
  /* A totals object from before compute was counted (an old canonical
     provider, an audit fixture) reads as no compute, not as nothing. */
  const compute = totals.compute ?? 0;
  const parts = [
    totals.racks > 0 ? `${totals.racks} ${totals.racks === 1 ? 'rack' : 'racks'}` : '',
    compute > 0 ? `${compute} compute` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(joiner) : 'nothing';
}

/* --- what it all costs ------------------------------------------------------------ */

export interface MoneyPlan {
  lines: SpendLine[];
  total: number;
  /** The atomic charge made by the Build commission action. */
  commissionNow?: number;
  /** Planned spend that belongs to a later launch action. */
  deferred?: number;
  available: number;
  headroom: number;
  shortfall: number;
}

/** The Build shell represents infrastructure. Deferred opening-night spend is
 * still preserved in the complete Money-stage plan, but it must not inflate
 * the persistent "This build" rail or the Build budget sheet. */
export function infrastructureMoneyPlan(plan: MoneyPlan): MoneyPlan {
  if (plan.commissionNow === undefined) return plan;
  const total = Math.max(0, plan.commissionNow);
  return {
    ...plan,
    lines: plan.lines.filter(line => line.timing !== 'OPENING_NIGHT'),
    total,
    deferred: 0,
    headroom: Math.max(0, plan.available - total),
    shortfall: Math.max(0, total - plan.available),
  };
}

export function moneyPlan(data: BuildData, draft: BuildDraft): MoneyPlan {
  if (data.canonical) return data.canonical.money(draft);
  const totals = buildTotals(data, draft);
  const campaign = data.campaigns.find((c) => c.id === draft.campaignId);
  const deposits = draft.facilities.reduce((sum, f) => sum + facilityCapitalCost(data, f), 0);

  const lines: SpendLine[] = [
    { id: 'infra', label: 'Infrastructure construction', amount: totals.buildCost - deposits, note: infraNote(draft) },
    { id: 'deposits', label: 'Facility setup and deposits', amount: deposits, note: `${totals.buildingCities} ${totals.buildingCities === 1 ? 'city' : 'cities'}` },
    { id: 'reserve', label: 'Operating reserve · six weeks', amount: totals.weeklyCost * 6, note: `${formatWeekly(totals.weeklyCost)} a week` },
    ...data.spend,
    { id: 'campaign', label: 'Launch campaign', amount: campaign?.cost ?? 0, note: campaign?.name },
  ].filter((line) => line.amount !== 0);

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const available = data.treasury.available;
  return {
    lines,
    total,
    available,
    headroom: Math.max(0, available - total),
    shortfall: Math.max(0, total - available),
  };
}

/** What the construction line is made of: racks you buy, and the cloud
    compute beside them that you do not. It read "N racks · 60% owned" off the
    dial, whatever stood in the rooms. */
function infraNote(draft: BuildDraft): string {
  const bought = draft.facilities.filter((f) => f.tenure !== 'CLOUD').reduce((sum, f) => sum + facilityRacks(f), 0);
  const cloud = draft.facilities.filter((f) => f.tenure === 'CLOUD').reduce((sum, f) => sum + computeRacks(f), 0);
  const racks = `${bought} ${bought === 1 ? 'rack' : 'racks'} bought`;
  return cloud > 0 ? `${racks} · ${cloud} cloud compute, nothing to buy` : racks;
}

function formatWeekly(value: number): string {
  return formatMoney(value);
}

/* --- who gets served -------------------------------------------------------------- */

const EARTH_KM = 111;   // rough km per degree, good enough for routing distance

export function distanceKm(a: Coord, b: Coord): number {
  const dLat = (a.lat - b.lat) * EARTH_KM;
  const dLng = (a.lng - b.lng) * EARTH_KM * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * What each opening market actually gets. Distance to the nearest serving city
 * sets startup time; capacity against that market's share of demand sets
 * buffering; and a market with no city within reach has no delivery path at all.
 */
/** How wide a room throws its field, from what its racks are doing. The map
    weights the same table; this is the figure the reach model takes. */
/** What a kind of room is FOR — the one table, read by the engine and by the map.

    Two numbers that pull against each other, so no room is simply the best one:

      REACH       how far the room throws. A region relay covers ground a fast
                  cache never will.
      SMOOTHNESS  how well it actually plays once it gets there — startup and
                  buffering. A fast cache is instant over one city; a relay
                  reaching three countries away will hitch a little.

    Before this, range varied per duty but smoothness was a single yes/no on
    whether a fast cache was present at all (`hasEdge ? 0 : 260`), so five of
    the six room types were interchangeable for playback and the only real
    question was how many racks. Now the choice is a trade: buy ground or buy
    smoothness, and a network wants some of each.

    `glow` is how hard the map draws the field, and is presentation only. */
/* How the engineering team splits a room's racks across the six duties. This
   is all that is left of a table that once carried reach, smoothness, glow,
   cost and draw per duty — every one of which is a property of the SERVER or
   the BUILDING now, not the job. A player never chooses a duty; the shares
   below decide what a Workhorse becomes once it is racked. */
export const DUTY_CHARACTER: Record<Duty, {
  /** The share of a room's racks this duty is given. Sums to 1 over the six. */
  needShare: number;
}> = {
  ORIGIN:   { needShare: 0.20 },
  REGIONAL: { needShare: 0.24 },
  EDGE:     { needShare: 0.24 },
  ENCODE:   { needShare: 0.12 },
  SERVICES: { needShare: 0.12 },
  LIVE:     { needShare: 0.08 },
  FUTURE:   { needShare: 0 },
};

/* What a Workhorse draws, per rack, before the room's own contract is applied.
   The room quotes ONE power and ONE cooling ceiling, and until #98 every rack
   was charged the same flat figure against them — so the ceilings could never
   be a decision, only a wall you hit at the same place every time.

   The draw follows the SERVER now. A Titan runs hot; a Scout barely warms the
   room. That is what makes the ceilings a choice: a cabinet that cools two
   Workhorses cannot cool two Titans, and a hall can. */
export const POWER_KW_PER_RACK = 12;
export const COOLING_KW_PER_RACK = 11;
export const PIPE_MBPS_PER_RACK = 2_000;

/** What a mix of racks draws, per resource. Shared by the Servers stage's
    meters and the facility the draft commissions, so the two cannot drift. */
export function drawOf(groups: ReadonlyArray<{ tier?: ServerTier; racks: number }>): {
  powerKw: number; coolingKw: number; pipeMbps: number;
} {
  let weighted = 0;
  for (const group of groups) {
    weighted += Math.max(0, group.racks) * SERVER_TIERS[tierOf(group)].draw;
  }
  return {
    powerKw: Math.round(weighted * POWER_KW_PER_RACK),
    coolingKw: Math.round(weighted * COOLING_KW_PER_RACK),
    pipeMbps: Math.round(weighted * PIPE_MBPS_PER_RACK),
  };
}

/** What one rack of this server costs to buy. */
export const rackBuildCost = (tier: ServerTier): number => Math.round(RACK_COST * SERVER_TIERS[tier].price);

/** What a room actually throws: its compute, from its own building. Reach was
    a per-duty multiplier a player could never see; the ring is the BUILDING now
    — its site, its fibre, its pipe — scaled by the compute inside it. */
export function reachSourceFor(facility: Facility, city: City, fibre: number): ReachSource {
  const groups = facility.groups || [];
  /* Which building this room is in, so its own fibre decides how far it
     throws. Without this every address in a city reached identically and
     picking the carrier hotel over the shed bought nothing. */
  const place = getPlaceByListingId(facility.listingId);
  return {
    cityId: city.id,
    lat: city.coord?.lat ?? 0,
    lng: city.coord?.lng ?? 0,
    racks: computeRacks(facility),
    capacity: groups.reduce((sum, group) => sum + (group.capacity || 0), 0),
    spread: 1,
    transit: place?.transit,
    /* The ladder, and the provider on top of it: a budget cloud reaches less
       than the going one for the same compute. */
    fibre: fibre * facilityReachFactor(facility),
  };
}

/** The audience inside a site's ring, counted where people actually live.

    `demandInsideBase` used to count a market by its one coordinate, which for
    the United States is a point in Kansas — so a two-position cabinet in
    Toronto "reached" nobody, while the same ring drawn on the map plainly
    covered Buffalo, Detroit and Cleveland. Both count the population
    clusters #85 built coverage on now (#102); this one measures the ring at
    its EFFECTIVE radius, the drawer's "could reach", where that one measures
    the base radius the capacity gate is judged against. */
export function audienceInside(source: ReachSource, data: BuildData): number {
  const radius = effectiveReachKm(source, 0);
  if (radius <= 0) return 0;
  return data.markets.reduce((sum, market) => {
    const places = audiencePlaces(market.code, market.coord);
    const inside = places.reduce((share, place) => (
      distanceKm({ lat: source.lat, lng: source.lng }, { lat: place.lat, lng: place.lng }) <= radius
        ? share + place.share
        : share
    ), 0);
    return sum + market.demand * inside;
  }, 0);
}

/** What a building COULD throw, filled with Workhorses and never short of
    compute — the dashed ring a player sees before committing to it. The fill
    inside is what the servers actually serve, and it grows toward this. */
export function potentialReachSourceFor(listing: FacilityListing, city: City, fibre: number): ReachSource {
  const place = getPlaceByListingId(listing.id);
  return {
    cityId: city.id,
    lat: city.coord?.lat ?? 0,
    lng: city.coord?.lng ?? 0,
    racks: Math.max(1, listing.rackPositions),
    capacity: Number.POSITIVE_INFINITY,
    spread: 1,
    transit: place?.transit,
    fibre,
  };
}

/* --- cloud: compute, priced by range ------------------------------------------
   A cloud region has no building and so no meters. What it has is a ring the
   player sizes, and a bill that follows the ring. Range costs compute, and
   reach grows with the square root of compute — so the four functions below
   are one curve read from either end, and the price that falls out of it. */

/** The most compute a cloud region will sell. It is the listing's positions
    — the marketplace and every save already carry it there — named here for
    what it means in a region with no floor. */
export const cloudCap = (listing: Pick<FacilityListing, 'rackPositions'>): number => (
  Math.max(0, Math.round(listing.rackPositions))
);

/** How far a cloud region reaches with this much compute in it: the ring the
    Servers stage draws. Nothing in it, no ring. */
export function cloudReachKm(listing: FacilityListing, city: City, fibre: number, compute: number): number {
  if (compute <= 0) return 0;
  return effectiveReachKm({ ...potentialReachSourceFor(listing, city, fibre), racks: compute }, 0);
}

/** The compute a range costs in this region — `cloudReachKm` run backwards,
    in whole Workhorses, held inside the region's cap. What a drag on the ring
    resolves to. */
export function cloudComputeForKm(listing: FacilityListing, city: City, fibre: number, km: number): number {
  if (km <= 0) return 0;
  const potential = potentialReachSourceFor(listing, city, fibre);
  const ground = siteFactor(potential) * (potential.fibre ?? 1);
  if (ground <= 0) return 0;
  const racks = racksForBaseReachKm(km / ground, potential.spread);
  return Math.max(0, Math.min(cloudCap(listing), Math.round(racks)));
}

/** What a cloud region costs a week at this much compute. */
export const cloudWeeklyAt = (compute: number): number => Math.round(Math.max(0, compute) * CLOUD_WEEKLY_PER_RACK);

/** The racks a room's dashed ring is drawn at.

    A building's ring is the building — every position full of Workhorses,
    however few are in it today; that is what "what it could reach" means. A
    cloud region has no building. Its ring is the compute you bought, because
    the ring is the thing you are buying; only while nothing is bought yet does
    it show the most the region would sell. */
export function potentialRacksOf(facility: Pick<Facility, 'tenure' | 'groups'>, positions: number): number {
  if (facility.tenure !== 'CLOUD') return positions;
  const bought = computeRacks(facility);
  return bought > 0 ? bought : positions;
}

/* --- a listing, taken ----------------------------------------------------------- */

/** The empty room a draft holds before anything is put in it. Its ceilings
    come with it so the Servers stage has something to fill against. It lived
    in the Network page; the engine needs it too, to price the room you did
    NOT take beside the one you did. */
export function takeListing(
  listing: FacilityListing,
  tenure: NonNullable<Facility['tenure']> = 'RENTED',
  id = `fac-${listing.id}-${Date.now()}`,
): Facility {
  const engineering = listing.engineering;
  return {
    id,
    listingId: listing.id,
    tenure,
    cityId: listing.cityId,
    built: false,
    groups: [],
    power: { used: 0, contracted: engineering?.powerContractKw ?? listing.rackPositions * POWER_KW_PER_RACK },
    cooling: { used: 0, available: engineering?.coolingCapacityKw ?? listing.rackPositions * COOLING_KW_PER_RACK },
    bandwidth: { used: 0, available: engineering?.committedBandwidthMbps ?? listing.rackPositions * 3_200 },
    condition: 0.92,
    uptime: listing.uptime,
    backup: engineering?.backupPowerMode || 'UPS',
    backupCoverage: engineering ? 1 : 0.7,
    energyPerWeek: 0,
    waterPerWeek: 0,
    /* A cloud region's price is its compute, all in; a building has running
       costs on top of its rent. */
    opCost: tenure === 'CLOUD' ? 0 : listing.weeklyRent * 0.55,
    sustainability: listing.fibre === 'Carrier hotel' ? 62 : 74,
    reputation: 70,
  };
}

/* --- a room, filled ---------------------------------------------------------- */

export type TierPlan = Partial<Record<ServerTier, number>>;

export const planRacks = (plan: TierPlan): number => OPEN_TIERS.reduce((sum, tier) => sum + (plan[tier] ?? 0), 0);

/** A held room, redrawn with these servers in it. Everything that hangs off
    the racks — the duty groups underneath, the draw against the room's
    ceilings, energy and water — is recomputed from one place, so the board,
    the placer and the room the draft commissions cannot disagree. A cloud
    region goes through here too: its compute is Workhorses, and the draw it
    records is simply never shown. */
export function fillRoom(listing: FacilityListing, facility: Facility, plan: TierPlan): Facility {
  const groups = groupsFor(listing.id, plan);
  const racks = planRacks(plan);
  const drawn = drawOf(groups);
  const engineering = listing.engineering;
  return {
    ...facility,
    groups,
    power: { used: drawn.powerKw, contracted: engineering?.powerContractKw ?? listing.rackPositions * POWER_KW_PER_RACK },
    cooling: { used: drawn.coolingKw, available: engineering?.coolingCapacityKw ?? listing.rackPositions * COOLING_KW_PER_RACK },
    bandwidth: { used: drawn.pipeMbps, available: engineering?.committedBandwidthMbps ?? listing.rackPositions * 3_200 },
    backupCoverage: engineering ? Math.min(1, engineering.backupPowerKw / Math.max(1, drawn.powerKw)) : 0.7,
    energyPerWeek: Math.round(drawn.powerKw * 168 / 1_000 * 0.7),
    waterPerWeek: racks * 26,
  };
}

/** Whether a building can power and cool this plan — the same test a stepper
    puts on a room, for any mix of servers. */
export function fitsPlan(listing: FacilityListing, plan: TierPlan): boolean {
  if (listing.rackPositions < planRacks(plan)) return false;
  if ((plan.TITAN ?? 0) > 0 && listing.rackPositions < TITAN_MIN_POSITIONS) return false;
  const engineering = listing.engineering;
  if (!engineering) return true;
  const drawn = drawOf(groupsFor(listing.id, plan));
  return drawn.powerKw <= engineering.powerContractKw && drawn.coolingKw <= engineering.coolingCapacityKw;
}

/* --- the other way to get the same compute ---------------------------------
   Every room has a counterpart in its own city: for a cloud region, the
   smallest building that would run the same compute in Workhorses; for a
   building, the city's cloud region at the same compute. Money puts the two
   side by side and says in which week the one that costs more today becomes
   the one that costs less. That week is the whole cloud decision, and it is
   computed here rather than left for the player to divide. */

export interface RoomCounterpart {
  facility: Facility;
  listing: FacilityListing;
  cityName: string;
  cloud: boolean;
  compute: number;
  /** What this room costs up front, racks included. */
  once: number;
  /** And every week: rent or cloud, plus running costs. */
  weekly: number;
  readyWeeks: number;
  /** The other way, if the city offers one at this compute. */
  other?: { listing: FacilityListing; cloud: boolean; once: number; weekly: number; readyWeeks: number };
  /** The week from which the BUILDING is the cheaper way overall, counted from
      commissioning, whichever side of it this room is on. Null when it never
      is — which, at these prices, it never is not. */
  crossoverWeeks: number | null;
}

const isCloudListing = (listing: FacilityListing): boolean => (
  listing.facilityType === 'CLOUD_ALLOCATION' || (listing.tenures?.includes('CLOUD') ?? false)
);

const rentable = (listing: FacilityListing): boolean => (
  !isCloudListing(listing)
  && listing.availability !== 'RESEARCH'
  && (listing.tenures ?? ['RENTED']).includes('RENTED')
);

/** Whether a building can power and cool this many Workhorses — the same test
    the Servers stage puts on a stepper. */
export function fitsWorkhorses(listing: FacilityListing, compute: number): boolean {
  if (listing.rackPositions < compute) return false;
  const engineering = listing.engineering;
  if (!engineering) return true;
  const drawn = drawOf(groupsFor(listing.id, { WORKHORSE: compute }));
  return drawn.powerKw <= engineering.powerContractKw && drawn.coolingKw <= engineering.coolingCapacityKw;
}

/** The smallest building in a city that can run this much compute. */
export function buildingFor(data: BuildData, cityId: string, compute: number): FacilityListing | undefined {
  return data.listings
    .filter((listing) => listing.cityId === cityId && rentable(listing) && fitsWorkhorses(listing, compute))
    .sort((a, b) => a.rackPositions - b.rackPositions || a.moveIn - b.moveIn)[0];
}

/** The city's cloud region, if it sells this much compute. */
export function cloudFor(data: BuildData, cityId: string, compute: number): FacilityListing | undefined {
  return data.listings.find((listing) => (
    listing.cityId === cityId && isCloudListing(listing) && listing.availability !== 'RESEARCH' && cloudCap(listing) >= compute
  ));
}

/** A room priced as if taken and filled with this many Workhorses. */
function pricedAs(data: BuildData, listing: FacilityListing, cloud: boolean, compute: number) {
  const room: Facility = {
    ...takeListing(listing, cloud ? 'CLOUD' : 'RENTED', `alt-${listing.id}`),
    groups: groupsFor(listing.id, { WORKHORSE: compute }),
  };
  return {
    once: facilityCapitalCost(data, room) + (cloud ? 0 : compute * rackBuildCost('WORKHORSE')),
    weekly: facilityWeeklyRent(data, room) + room.opCost,
    readyWeeks: listing.provisioningWeeks,
  };
}

export function roomCounterparts(data: BuildData, draft: BuildDraft): RoomCounterpart[] {
  return draft.facilities.flatMap((facility) => {
    const listing = listingFor(data, facility);
    if (!listing) return [];
    const compute = computeRacks(facility);
    const cloud = facility.tenure === 'CLOUD';
    const mine = {
      once: facilityCapitalCost(data, facility) + rackSpend({ facilities: [facility] } as BuildDraft),
      weekly: facilityWeeklyRent(data, facility) + facility.opCost,
      readyWeeks: listing.provisioningWeeks,
    };
    const otherListing = compute > 0
      ? (cloud ? buildingFor(data, facility.cityId, compute) : cloudFor(data, facility.cityId, compute))
      : undefined;
    const other = otherListing
      ? { listing: otherListing, cloud: !cloud, ...pricedAs(data, otherListing, !cloud, compute) }
      : undefined;
    /* The two cumulative bills, once + weekly × w, meet where the building's
       extra up front is paid back by what it saves each week. */
    let crossoverWeeks: number | null = null;
    if (other) {
      const building = cloud ? other : mine;
      const rented = cloud ? mine : other;
      const saves = rented.weekly - building.weekly;
      crossoverWeeks = saves > 0 ? Math.max(1, Math.ceil((building.once - rented.once) / saves)) : null;
    }
    return [{
      facility, listing, cityName: cityFor(data, facility)?.name ?? facility.cityId, cloud, compute,
      ...mine, other, crossoverWeeks,
    }];
  });
}

export function serviceForecast(data: BuildData, draft: BuildDraft): CountryService[] {
  if (data.canonical) return data.canonical.services(draft).map(service => {
    if (countryServiceCoverageValid(service)) return service;
    return {
      ...service,
      state: 'NONE' as const,
      startupMs: 0,
      buffering: 100,
      peak: Number.isFinite(service.peak) && service.peak >= 0 ? service.peak : 0,
      reachedShare: 0,
      coveredShare: 0,
      geographicCoveredShare: undefined,
      coveredPeak: 0,
      cloudServedShare: 0,
      catalogue: Number.isFinite(service.catalogue) ? Math.max(0, Math.min(1, service.catalogue)) : 0,
      places: undefined,
      coverageAvailable: false,
      fix: 'Coverage unavailable. Reopen Build and verify this market before commissioning.',
    };
  });
  const totals = buildTotals(data, draft);
  const totalDemand = data.markets.reduce((sum, m) => sum + m.demand, 0) || 1;
  /* How good a stream has to be before anyone calls it good. It was the
     constant 0.55 written into the two lines below; it climbs now, which is how
     a network you never touch stops being enough without anything you own
     getting worse. */
  const standard = expectedStandard(data.platformWeeks ?? 0);
  const cities = draft.facilities.map((f) => ({ facility: f, city: cityFor(data, f) })).filter((x) => x.city);

  /* Where the audience is, so a room can be told when its field has claimed
     more of it than its racks can carry. Computed once for the whole forecast
     rather than per market. */
  const reachTargets: ReachTarget[] = data.markets.map((market) => ({
    lat: market.coord?.lat ?? 0,
    lng: market.coord?.lng ?? 0,
    demand: market.demand,
    countryCode: market.code,
  }));
  const sourceCache = new Map<string, ReachSource>();
  const insideCache = new Map<string, number>();
  /* One ladder reading for the whole forecast. */
  const fibre = fibreMultiplier(data.fibre);
  const sourceFor = (facility: Facility, city: City): ReachSource => {
    const cached = sourceCache.get(facility.id);
    if (cached) return cached;
    const source = reachSourceFor(facility, city, fibre);
    sourceCache.set(facility.id, source);
    return source;
  };
  const insideFor = (facility: Facility, city: City): number => {
    const cached = insideCache.get(facility.id);
    if (cached !== undefined) return cached;
    const inside = demandInsideBase(sourceFor(facility, city), reachTargets);
    insideCache.set(facility.id, inside);
    return inside;
  };

  return data.markets.map((market) => {
    const ranked = cities
      .map((x) => ({ ...x, km: distanceKm(market.coord, (x.city as City).coord) }))
      .sort((a, b) => a.km - b.km);
    const nearest = ranked[0];

    if (!nearest) {
      return {
        marketId: market.id, name: market.name, code: market.code, servedBy: [], role: '—',
        state: 'NONE', startupMs: 0, buffering: 100, peak: Math.round(market.demand * PEAK_CONCURRENCY_SHARE),
        reachedShare: 0, coveredShare: 0, coveredPeak: 0,
        places: audiencePlaces(market.code, market.coord).map((place) => ({ lat: place.lat, lng: place.lng, share: place.share, state: 'DARK' as const, cloud: false })),
        catalogue: market.catalogue, localization: 'No path', fix: 'Lease a facility that can reach this market',
      };
    }

    /* Reach, not raw kilometres. This read `r.km < 1500` and `r.km < 4000`
       against straight-line distance — so a rack in Marrakesh served Madrid as
       well as a rack in Madrid did, an ocean counted the same as a motorway,
       and a two-rack room reached exactly as far as a forty-rack one. The map
       drew its field from an entirely different rule, which is how green
       territory came to close over countries this function called unserved.
       Both read the reach model now. */
    const strengthOf = (entry: typeof ranked[number]) => reachStrength(
      sourceFor(entry.facility, entry.city as City),
      { lat: market.coord.lat, lng: market.coord.lng, demand: market.demand, countryCode: market.code },
      insideFor(entry.facility, entry.city as City),
    );
    /* How smoothly this market actually plays: how much of what the best room
       reaches its servers can actually carry, discounted by how well that room
       reaches here. Smoothness used to be a constant per duty that a player
       could never see or change; it is the SERVED SHARE now — "did you put
       enough compute in" — which is the one thing the Servers stage is about. */
    const smoothness = ranked.reduce((top, entry) => Math.max(
      top,
      capacityFactor(sourceFor(entry.facility, entry.city as City), insideFor(entry.facility, entry.city as City))
        * strengthOf(entry),
    ), 0);
    /* The best-placed room, for the fix line. */
    const bestEntry = ranked.reduce<typeof ranked[number] | null>(
      (top, entry) => (!top || strengthOf(entry) > strengthOf(top) ? entry : top), null,
    );
    /* How well the best-placed room reaches it at all. A market nothing can
       reach is not merely slow. */
    const best = ranked.reduce((top, entry) => Math.max(top, strengthOf(entry)), 0);

    /* How much of this market anyone can actually reach.

       `best` is the strongest room against the market's main city, and that
       still decides the grade. This is a different question: of all the places
       this country's people live, how many can anyone reach? A room in Delhi
       leaves Chennai dark, and the headline should say so rather than calling
       India served. */
    const places = audiencePlaces(market.code, market.coord);
    /* Two shares, one pass: inside any ring at all, and inside the standard.
       The first is "reached", the second "served", and a place that is in the
       first and not the second is what the Test stage calls a thin region. */
    let reachedShare = 0;
    let coveredShare = 0;
    let cloudServedShare = 0;
    /* Each cluster's grade is kept, so the map can paint the people the
       forecast counted rather than the ground the rings cover (#108). */
    const graded: PlaceService[] = [];
    for (const place of places) {
      let strength = 0;
      let byCloud = false;
      for (const entry of ranked) {
        const here = reachStrength(
          sourceFor(entry.facility, entry.city as City),
          { lat: place.lat, lng: place.lng, demand: market.demand * place.share, countryCode: market.code },
          insideFor(entry.facility, entry.city as City),
        );
        if (here > strength) { strength = here; byCloud = entry.facility.tenure === 'CLOUD'; }
      }
      if (strength > 0) reachedShare += place.share;
      if (strength >= standard) {
        coveredShare += place.share;
        if (byCloud) cloudServedShare += place.share;
      }
      graded.push({
        lat: place.lat, lng: place.lng, share: place.share,
        state: strength >= standard ? 'SERVED' : strength > 0 ? 'REACHED' : 'DARK',
        cloud: byCloud && strength >= standard,
      });
    }
    const share = market.demand / totalDemand;
    const peak = Math.round(market.demand * PEAK_CONCURRENCY_SHARE);
    const headroom = (totals.capacity + totals.burst) * share;
    const load = headroom > 0 ? peak / headroom : 99;

    /* Smoothness buys down both, on a scale that keeps a perfect fast cache
       where the old boolean put it (+0) and a room with none of that character
       roughly where "no edge" used to land (+300ms, +6%). */
    const startupMs = Math.round(320 + nearest.km * 0.06 + (1 - smoothness) * 300
      + Math.round((1 - best) * 420) + (architectureOf(draft) === 'CLOUD' ? 90 : 0));
    const buffering = Math.round(Math.max(0, (load - 0.75) * 120) + (1 - smoothness) * 6);

    /* Graded where the people are.

       This graded a market by `best`, the strength of the best room against
       the market's ONE coordinate — for the United States, a point in Kansas.
       So a Toronto region with a third of Americans inside the standard read
       "No delivery path", while the map beside it painted New York green. The
       state is the two shares now: how much of the country any ring reaches,
       and how much of it is served to the standard, which is the same
       standard that climbs with the years. The load checks are unchanged.

       Nothing reaches it — which a capacity figure can never say, because
       capacity is pooled and would happily report a comfortable load for a
       country on the far side of an ocean from every room you own. */
    let state: ServiceState = 'READY';
    if (reachedShare <= 0) state = 'NONE';
    else if (load > 1.25) state = 'UNSTABLE';
    /* Three in four cannot get a smooth stream: for that country, an outage. */
    else if (coveredShare < 0.25) state = 'UNSTABLE';
    else if (load > 1) state = 'POOR';
    else if (coveredShare < 0.6) state = 'POOR';
    else if (coveredShare < 0.9) state = 'WATCH';
    else if (load > 0.85 || buffering > 6 || startupMs > 900) state = 'WATCH';

    return {
      marketId: market.id,
      name: market.name,
      code: market.code,
      servedBy: ranked.slice(0, 2).map((r) => (r.city as City).name),
      role: bestEntry ? `From ${(bestEntry.city as City).name}` : '—',
      state,
      startupMs,
      buffering: Math.min(60, buffering),
      peak,
      reachedShare: Math.min(1, Math.round(reachedShare * 1000) / 1000),
      coveredShare: Math.min(1, Math.round(coveredShare * 1000) / 1000),
      coveredPeak: Math.round(peak * Math.min(1, coveredShare)),
      cloudServedShare: Math.min(1, Math.round(cloudServedShare * 1000) / 1000),
      places: graded,
      catalogue: market.catalogue,
      localization: market.catalogue > 0.9 ? 'Fully licensed' : 'Some titles missing',
      fix: state === 'READY' ? undefined
        : reachedShare <= 0 ? `Nothing you hold reaches ${market.name} — put a room closer`
          : load > 1 ? 'Add capacity — the racks cannot carry the peak'
            : coveredShare < 0.9
              ? `${market.name} is reached but not served well — more servers in ${bestEntry ? (bestEntry.city as City).name : 'the nearest room'}, or a room nearer`
              : smoothness < standard ? `Put more servers in ${bestEntry ? (bestEntry.city as City).name : 'the nearest room'}`
                : 'Repair the limiting factor in the serving room',
    };
  });
}

/** A missing field is not the same as a known dark market. */
export function countryServiceCoverageValid(service: CountryService): boolean {
  if (service.coverageAvailable === false) return false;
  const share = (value: number): boolean => Number.isFinite(value) && value >= 0 && value <= 1;
  if (!Number.isFinite(service.peak) || service.peak < 0
    || !Number.isFinite(service.startupMs) || service.startupMs < 0
    || !Number.isFinite(service.buffering) || service.buffering < 0 || service.buffering > 100
    || !share(service.reachedShare) || !share(service.coveredShare)
    || (service.geographicCoveredShare !== undefined
      && (!share(service.geographicCoveredShare) || service.geographicCoveredShare > service.reachedShare + 1e-9))
    || service.coveredShare > service.reachedShare + 1e-9
    || !Number.isFinite(service.coveredPeak) || service.coveredPeak < 0
    || service.coveredPeak > service.peak + 1
    || Math.abs(service.coveredPeak - Math.round(service.peak * service.coveredShare)) > 1
    || !share(service.catalogue)) return false;
  if (service.cloudServedShare !== undefined
    && (!share(service.cloudServedShare) || service.cloudServedShare > service.coveredShare + 1e-9)) return false;
  return !service.places?.some(place => !Number.isFinite(place.lat) || !Number.isFinite(place.lng)
    || !share(place.share));
}

/* --- what each city is actually carrying -------------------------------------
   The Build used to make you choose the city on one page and fill it on
   another, and neither page ever told you whether what you put in a city was
   enough for what that city has to answer for.

   This is that answer, and it is the engine's own: a market is anchored by the
   site nearest to it — the same ranking `serviceForecast` uses, read back off
   its own `servedBy` — so a city's standing here and the verdict the load test
   gives later cannot disagree.

   Note what this deliberately does not claim. Capacity is pooled across the
   whole network at serving time, not spent city by city, so no city is ever
   called "short" on its own. What is true locally is reported locally: what
   this city anchors, how those markets are actually doing, what its rooms
   contribute, and what is holding them back. */

export interface CityStanding {
  cityId: string;
  name: string;
  rooms: number;
  racks: number;
  /** Steady capacity contributed by the rooms in this city. */
  capacity: number;
  /** Markets whose nearest site is this city. */
  anchored: CountryService[];
  /** Combined opening-night peak of those markets. */
  anchoredPeak: number;
  ready: number;
  strained: number;
  /** Rooms here held back by power, cooling or fibre. */
  capped: number;
  duties: Duty[];
  /** Which servers stand here — what a page shows, since duties are internal. */
  tiers: ServerTier[];
}

export function cityStandings(data: BuildData, draft: BuildDraft, services: CountryService[]): CityStanding[] {
  /* Judge what the game says the rooms are, not what the draft asked for: a
     canonical projection carries the real power, cooling and fibre. */
  const facilities = data.canonical?.facilities?.(draft) ?? draft.facilities;
  const byCity = new Map<string, Facility[]>();
  for (const facility of facilities) {
    const kept = byCity.get(facility.cityId);
    if (kept) kept.push(facility);
    else byCity.set(facility.cityId, [facility]);
  }
  if (byCity.size === 0) return [];

  const held = [...byCity.keys()]
    .map((cityId) => data.cities.find((city) => city.id === cityId))
    .filter((city): city is City => Boolean(city));

  /* The engine names the two nearest sites; the first is the anchor. When it
     names none — a market nothing can reach — fall back to the same distance
     ranking rather than dropping the market from the page. */
  const anchorOf = (service: CountryService): string | undefined => {
    const named = service.servedBy[0];
    const byName = named ? held.find((city) => city.name === named) : undefined;
    if (byName) return byName.id;
    const market = data.markets.find((candidate) => candidate.id === service.marketId);
    if (!market) return undefined;
    let best: { id: string; km: number } | undefined;
    for (const city of held) {
      const km = distanceKm(market.coord, city.coord);
      if (!best || km < best.km) best = { id: city.id, km };
    }
    return best?.id;
  };

  const anchored = new Map<string, CountryService[]>();
  for (const service of services) {
    const cityId = anchorOf(service);
    if (!cityId) continue;
    const list = anchored.get(cityId);
    if (list) list.push(service);
    else anchored.set(cityId, [service]);
  }

  return [...byCity.entries()]
    .map(([cityId, facilities]) => {
      const markets = anchored.get(cityId) ?? [];
      return {
        cityId,
        name: data.cities.find((city) => city.id === cityId)?.name ?? cityId,
        rooms: facilities.length,
        racks: facilities.reduce((sum, facility) => sum + facilityRacks(facility), 0),
        capacity: Math.round(facilities.reduce(
          (sum, facility) => sum + facility.groups.reduce(
            (inner, group) => inner + group.capacity * usableCapacity(data, facility), 0,
          ), 0,
        )),
        anchored: markets,
        anchoredPeak: markets.reduce((sum, service) => sum + service.peak, 0),
        ready: markets.filter((service) => service.state === 'READY').length,
        strained: markets.filter((service) => service.state !== 'READY').length,
        capped: facilities.filter((facility) => limitingFactor(data, facility) !== 'NONE').length,
        duties: [...new Set(facilities.flatMap((facility) => facility.groups.map((group) => group.duty)))],
        tiers: OPEN_TIERS.filter((tier) => facilities.some((facility) => tiersOf(facility)[tier] > 0)),
      };
    })
    .sort((left, right) => right.anchoredPeak - left.anchoredPeak || right.racks - left.racks);
}

/* --- coverage --------------------------------------------------------------------
   How far a room actually reaches, and how well. A room with edge racks throws
   a tight, fast circle; a regional cache covers a continent more slowly; an
   origin-only room can serve the planet badly. The map draws these so the
   player can see whether the markets they bought sit inside the circles they
   have paid for. */

export interface Reach {
  cityId: string;
  coord: Coord;
  /** Radius on the ground, in kilometres. */
  km: number;
  /** How good service is inside it, worst case across the markets it serves. */
  grade: 'STRONG' | 'FAIR' | 'WEAK';
  racks: number;
}

/** One line for the player: how many opening markets the drawing actually covers. */
export function coverageLine(services: CountryService[]): { covered: number; total: number; text: string } {
  const total = services.length;
  /* Covered means there is a path at all. Whether that path is any good is the
     grade, and the sentence carries it. */
  const covered = services.filter((s) => s.state !== 'NONE').length;
  const dark = services.filter((s) => s.state === 'NONE');
  const strained = services.filter((s) => s.state === 'POOR' || s.state === 'UNSTABLE');
  const watched = services.filter((s) => s.state === 'WATCH');
  return {
    covered,
    total,
    text: dark.length > 0
      ? `${dark.map((s) => s.name).join(', ')} ${dark.length === 1 ? 'has' : 'have'} no delivery path`
      : strained.length > 0
        ? `${strained.map((s) => s.name).join(', ')} will buffer at peak`
        : watched.length > 0
          ? `${watched.map((s) => s.name).join(', ')} ${watched.length === 1 ? 'is' : 'are'} close to the limit`
          : 'Every opening market is inside the network with room to spare',
  };
}

/* --- the rehearsal ------------------------------------------------------------------ */

/**
 * Everything a rehearsal depends on, in one string. Change a rack, a duty, an
 * architecture, a repair or the campaign and this changes — which is how the
 * screen knows the evidence on screen no longer describes the drawing.
 */
export function signatureOf(data: BuildData, draft: BuildDraft): string {
  if (data.canonical) return data.canonical.signature(draft);
  /* How a room is held is part of the drawing now — cloud is the burst the
     rehearsal falls back on, so swapping a region for a building changes the
     verdict. The architecture and the dial are not in here any more, because
     they are read off these same rooms. */
  const rooms = draft.facilities
    .map((f) => `${f.listingId}:${f.tenure ?? 'RENTED'}:${f.groups.map((g) => `${g.duty}x${g.racks}`).sort().join('+')}`)
    .sort()
    .join('|');
  const demand = data.markets.map((m) => `${m.id}:${m.demand}`).join(',');
  return [rooms, draft.campaignId, [...draft.repairIds].sort().join('+'), demand].join('/');
}

export interface ConstructionProgress {
  status: 'BUILDING' | 'OPERATIONAL';
  totalWeeks: number;
  elapsedWeeks: number;
  remainingWeeks: number;
  progressPercent: number;
}

/** One game-week clock powers Build, Define the Launch and Opening Night. */
export function constructionProgress(currentWeek: number, committedAtWeek: number, readyAtWeek: number): ConstructionProgress {
  const totalWeeks = Math.max(0, readyAtWeek - committedAtWeek);
  const elapsedWeeks = Math.max(0, Math.min(totalWeeks, currentWeek - committedAtWeek));
  const remainingWeeks = Math.max(0, readyAtWeek - currentWeek);
  return {
    status: remainingWeeks > 0 ? 'BUILDING' : 'OPERATIONAL',
    totalWeeks,
    elapsedWeeks,
    remainingWeeks,
    progressPercent: totalWeeks > 0 ? Math.round(elapsedWeeks / totalWeeks * 100) : 100,
  };
}

export function rehearsalStale(data: BuildData, draft: BuildDraft): boolean {
  return Boolean(draft.rehearsal && draft.rehearsal.signature !== signatureOf(data, draft));
}

export function rehearse(data: BuildData, draft: BuildDraft, scenario: Scenario): RehearsalResult {
  if (data.canonical) return data.canonical.rehearse(draft, scenario);
  const totals = buildTotals(data, draft);
  const services = serviceForecast(data, draft);
  const factor = SCENARIOS[scenario].factor;
  const campaign = data.campaigns.find((c) => c.id === draft.campaignId);
  const hype = campaign?.multiplier ?? 1;

  const peak = Math.round(data.markets.reduce((sum, m) => sum + m.demand * PEAK_CONCURRENCY_SHARE, 0) * factor * hype);
  const permanent = totals.capacity;
  const withBurst = permanent + totals.burst;

  const failedPct = peak > withBurst
    ? Math.min(90, Math.round(((peak - withBurst) / Math.max(1, peak)) * 100))
    : 0;

  const failed = services.filter((s) => s.state === 'NONE' || s.state === 'UNSTABLE' || (failedPct > 0 && s.state !== 'READY'));
  const held = services.filter((s) => !failed.includes(s));

  const verdict: Verdict = failedPct > 0 || failed.length > 0
    ? 'BROKE'
    : peak > permanent
      ? 'RENTED'
      : 'HELD';

  return {
    signature: signatureOf(data, draft),
    scenario,
    verdict,
    peak,
    capacity: permanent,
    spare: Math.max(0, withBurst - peak),
    failedPct,
    catalogue: average(services.map((s) => Math.round(s.catalogue * 100))) / 100,
    spof: totals.redundancy === 'REDUNDANT' ? 0 : totals.redundancy === 'EXPOSED' ? 1 : 2,
    held: held.map((s) => s.name),
    failed: failed.map((s) => s.name),
    countries: services.map((s) => ({
      name: s.name,
      code: s.code,
      demand: Math.round(s.peak * factor * hype),
      failedPct: failed.includes(s) ? Math.max(failedPct, s.state === 'NONE' ? 100 : 12) : 0,
      state: s.state,
    })),
    rooms: draft.facilities.map((f) => {
      const city = cityFor(data, f)?.name ?? 'Room';
      const load = f.power.used / Math.max(1, f.power.contracted);
      return {
        city,
        load: Math.min(2, load * factor * hype),
        limiting: limitingFactor(data, f),
        failedPct: failedPct,
      };
    }),
  };
}

/* --- how each stage is doing ------------------------------------------------
   The track should carry state, not just position: a stage the player has
   satisfied looks different from one they have visited and left broken. */

export function stageStates(data: BuildData, draft: BuildDraft): Record<BuildStageId, StageState> {
  const totals = buildTotals(data, draft);
  const plan = moneyPlan(data, draft);
  const constrained = draft.facilities.filter((f) => limitingFactor(data, f) !== 'NONE').length;
  const empty = draft.facilities.filter((f) => computeRacks(f) === 0).length;
  const stale = rehearsalStale(data, draft);

  return {
    /* One stage for the network: regions, servers and cloud together. Judged
       on whether anything is set, whether a room is empty or over its limits,
       and whether everything sits in one city. */
    network: draft.facilities.length === 0 ? 'EMPTY'
      : totals.racks + (totals.compute ?? 0) === 0 ? 'DOING'
        : empty > 0 || constrained > 0 ? 'WARN'
          : totals.redundancy === 'SINGLE' ? 'WARN' : 'DONE',
    money: plan.total === 0 ? 'EMPTY' : plan.shortfall > 0 ? 'BLOCKED' : 'DONE',
    test: !draft.rehearsal ? 'EMPTY' : stale ? 'WARN' : draft.rehearsal.verdict === 'BROKE' ? 'BLOCKED' : 'DONE',
    launch: data.commissioned ? 'DONE' : draft.facilities.length === 0 ? 'EMPTY' : 'DOING',
  };
}

/** The one line the header carries, in every state the build can be in. */
export function headerLine(data: BuildData, draft: BuildDraft): string {
  const totals = buildTotals(data, draft);
  const standing = totalRacks(data.existing);
  const drawn = totals.racks + (totals.compute ?? 0);
  if (data.commissioned) {
    return standing === drawn
      ? `Infrastructure · ${kitWords(totals)} standing`
      : `${standing} racks standing · ${kitWords(totals)} drawn`;
  }
  if (drawn === 0) return 'Nothing exists yet';
  return `${kitWords(totals)} · ${totals.weeks > 0 ? `${totals.weeks} ${totals.weeks === 1 ? 'week' : 'weeks'} to build` : 'ready on the night'}`;
}

/* --- the gates ---------------------------------------------------------------------- */

export interface Gate {
  id: string;
  label: string;
  value: string;
  ok: boolean;
  stage: BuildStageId;
}

export function gates(data: BuildData, draft: BuildDraft): Gate[] {
  const totals = buildTotals(data, draft);
  const money = moneyPlan(data, draft);
  const rehearsal = draft.rehearsal;
  const services = serviceForecast(data, draft);
  const coverageAvailable = services.length === data.markets.length
    && services.every(countryServiceCoverageValid);
  const geographicCoverageAvailable = coverageAvailable && services.length > 0
    && services.every(service => data.canonicalMode !== 'CAREER'
      || service.geographicCoveredShare !== undefined);
  const thinMarkets = geographicCoverageAvailable
    ? services.filter(service => (service.geographicCoveredShare ?? service.coveredShare) < STREAMING_SERVED_COVERAGE_SHARE)
    : [];

  return [
    /* The team-plan gate went with the team path (#103): nobody drafts the
       network for you, so there is nothing to approve. */
    {
      id: 'network', stage: 'network', label: 'Network',
      value: draft.facilities.length > 0
        ? `${draft.facilities.length} ${draft.facilities.length === 1 ? 'room' : 'rooms'} · ${totals.cities} ${totals.cities === 1 ? 'city' : 'cities'}`
        : 'Nothing set yet',
      ok: draft.facilities.length > 0,
    },
    /* "Content origin" used to gate here — a duty a player can no longer choose.
       The engineering team gives every room its share of the library when it
       is racked, so the only thing that can be missing is the racks. */
    {
      id: 'servers', stage: 'network', label: 'Servers',
      value: (() => {
        const empty = draft.facilities.filter((f) => computeRacks(f) === 0).length;
        if (totals.racks + (totals.compute ?? 0) === 0) return 'Nothing installed yet';
        return empty > 0
          ? `${empty} ${empty === 1 ? 'room' : 'rooms'} still empty`
          : `${kitWords(totals)} installed`;
      })(),
      ok: totals.racks + (totals.compute ?? 0) > 0 && draft.facilities.every((f) => computeRacks(f) > 0),
    },
    {
      id: 'money', stage: 'money', label: 'Money',
      value: data.marketPlanning?.editable === false ? 'No market quote yet'
        : money.shortfall > 0 ? `${formatWeekly(money.shortfall)} short` : `${formatWeekly(money.headroom)} headroom`,
      ok: data.marketPlanning?.editable !== false && money.shortfall === 0,
    },
    {
      id: 'plans', stage: 'money', label: 'Plans on sale',
      value: data.pricing.plans > 0 ? `${data.pricing.plans} on sale` : 'Nothing on sale',
      ok: data.pricing.plans > 0,
    },
    {
      id: 'physical', stage: 'network', label: 'The rooms',
      value: (() => {
        const constrained = draft.facilities.filter((f) => limitingFactor(data, f) !== 'NONE');
        if (draft.facilities.length === 0) return 'No rooms leased';
        return constrained.length === 0
          ? 'All rooms within limits'
          : `${constrained.length} room${constrained.length > 1 ? 's' : ''} short of power, cooling or fibre`;
      })(),
      ok: draft.facilities.length > 0 && draft.facilities.every((f) => limitingFactor(data, f) === 'NONE'),
    },
    {
      id: 'coverage', stage: 'network', label: 'Opening-market coverage',
      value: !geographicCoverageAvailable
        ? data.markets.length === 0 ? 'Choose an opening market first' : 'Geographic coverage unavailable — verify the network'
        : thinMarkets.length > 0
          ? `${thinMarkets.slice(0, 2).map(service => `${service.name} ${formatStreamingCoveragePercent(service.geographicCoveredShare ?? service.coveredShare)}`).join(', ')}${thinMarkets.length > 2 ? ` +${thinMarkets.length - 2} more` : ''} — each market needs ${formatStreamingCoveragePercent(STREAMING_SERVED_COVERAGE_SHARE)}`
          : `${services.length} ${services.length === 1 ? 'market' : 'markets'} geographically served`,
      ok: geographicCoverageAvailable && thinMarkets.length === 0,
    },
    {
      id: 'rehearsal', stage: 'test', label: 'Rehearsal',
      value: !coverageAvailable ? 'Coverage unavailable — verify the network'
        : !rehearsal ? 'Not run'
        : rehearsalStale(data, draft) ? 'Out of date — the drawing changed'
          : rehearsal.verdict === 'HELD' ? 'It held'
            : rehearsal.verdict === 'RENTED' ? 'Held by renting' : 'It broke',
      ok: Boolean(coverageAvailable && rehearsal && !rehearsalStale(data, draft) && rehearsal.verdict !== 'BROKE'),
    },
  ];
}

/* --- commissioning ------------------------------------------------------------------- */

export const COMMISSION_STEPS = [
  { id: 'drawing', label: 'Drawing approved', line: 'Rev A signed off. Construction may begin.' },
  { id: 'floors', label: 'Floors poured', line: 'Raised floor, cable trays and cooling loops installed.' },
  { id: 'racks', label: 'Racks installed', line: 'Cabinets bolted in, still dark.' },
  { id: 'power', label: 'Power on', line: 'Machines boot and the rooms come alive.' },
  { id: 'funds', label: 'Funds released', line: 'Contracts execute and treasury is charged.' },
  { id: 'done', label: 'Commissioned', line: 'The drawing is now persistent infrastructure.' },
];
