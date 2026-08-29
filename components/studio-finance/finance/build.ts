/* ============================================================================
   BUILD THE PLATFORM — data contract and rules

   The second wizard on the streaming dashboard. Define the Launch decided what
   the service is; this decides whether it can actually be delivered.

   The rule the whole flow rests on: everything is a free drawing until the
   player commissions it. Racks, leases, repairs and campaigns are all planned
   spending until the commissioning sequence runs, and only then is treasury
   charged.
   ========================================================================== */

export type BuildStageId = 'sites' | 'plans' | 'money' | 'test' | 'launch';

export type StageState = 'EMPTY' | 'DOING' | 'DONE' | 'WARN' | 'BLOCKED';

/* Five stages, and each one carries the single question it is asking. The whole
   wizard is long; the sentence at the top of each stage is what keeps it from
   feeling long. */
export const BUILD_STAGES: Array<{ id: BuildStageId; label: string; verb: string; ask: string }> = [
  { id: 'sites', label: 'Sites', verb: 'Choose where it lives', ask: 'Where will viewers be served from?' },
  { id: 'plans', label: 'Plans', verb: 'Fit the racks to the rooms', ask: 'What does each machine do, and can the room run it?' },
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

export interface FacilityListing {
  id: string;
  cityId: string;
  provider: string;
  name: string;
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
}

export type Duty = 'ORIGIN' | 'REGIONAL' | 'EDGE' | 'ENCODE' | 'SERVICES' | 'LIVE' | 'FUTURE';

/* Every duty is named twice: what it is for a person, then what an engineer
   would call it. The plain name leads everywhere in the UI — a player should
   never have to learn the word "origin" to understand that this is where the
   library lives. */
export const DUTIES: Record<Duty, { name: string; tech: string; line: string; locked?: boolean }> = {
  ORIGIN: { name: 'Main library', tech: 'Content origin', line: 'Holds every title and makes the master stream the rest of the network copies.' },
  REGIONAL: { name: 'Region relay', tech: 'Regional cache', line: 'Copies the library closer to a whole region and takes load off the library.' },
  EDGE: { name: 'Fast cache', tech: 'Local edge', line: 'Keeps the popular titles beside local viewers so playback starts instantly.' },
  ENCODE: { name: 'Video workshop', tech: 'Encoding', line: 'Makes the phone, tablet and television versions of every title.' },
  SERVICES: { name: 'Accounts & payments', tech: 'Platform services', line: 'Sign-in, profiles, search, billing, recommendations, parental controls.' },
  LIVE: { name: 'Premiere surge', tech: 'Live-event delivery', line: 'Machines held back for premieres, sport and anything watched live.' },
  FUTURE: { name: 'Research bay', tech: 'Future workload', line: 'Reserved for delivery technology you have not researched yet.', locked: true },
};

export interface RackGroup {
  id: string;
  name: string;
  duty: Duty;
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
  company: { name: string; week: number; brandHex?: string; logoSrc?: string };
  treasury: { available: number; committedLaunch: number };
  markets: BuildMarket[];
  regions: Region[];
  countries: Country[];
  cities: City[];
  listings: FacilityListing[];
  presets: NetworkPreset[];
  campaigns: Campaign[];
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
  /**
   * Actor Empire supplies these derivations from its canonical infrastructure
   * services. The ZIP demo deliberately omits the bridge and uses the local
   * fallback rules below.
   */
  canonical?: {
    totals: (draft: BuildDraft) => BuildTotals;
    money: (draft: BuildDraft) => MoneyPlan;
    services: (draft: BuildDraft) => CountryService[];
    signature: (draft: BuildDraft) => string;
    rehearse: (draft: BuildDraft, scenario: Scenario) => RehearsalResult;
  };
}

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
}

export interface BuildHandlers {
  onExit?: () => void;
  onOpenStudioFinance?: () => void;
  onEditPricing?: () => void;
  onOpenDefine?: (step: import('../../../types').StreamingDefineLaunchStepId) => void;
  onOpenRehearsal?: (draft: BuildDraft) => void;
  onCommission?: (draft: BuildDraft) => { ok: boolean; message: string } | void;
  onOpeningNight?: () => void;
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

export function listingFor(data: BuildData, facility: Facility): FacilityListing | undefined {
  return data.listings.find((l) => l.id === facility.listingId);
}

export function cityFor(data: BuildData, facility: Facility): City | undefined {
  return data.cities.find((c) => c.id === facility.cityId);
}

/** What is stopping this room from carrying another rack. */
export function limitingFactor(data: BuildData, facility: Facility): Limiting {
  const listing = listingFor(data, facility);
  const racks = facilityRacks(facility);
  if (listing && racks >= listing.rackPositions) return 'RACK';
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
  const origins = facilities.filter((f) => f.groups.some((g) => g.duty === 'ORIGIN')).length;
  if (cities >= 3 && origins >= 2) return 'REDUNDANT';
  if (cities >= 2) return 'EXPOSED';
  return 'SINGLE';
}

export const REDUNDANCY_COPY: Record<Redundancy, { label: string; tone: 'good' | 'warn' | 'bad'; line: string }> = {
  REDUNDANT: { label: 'Redundant', tone: 'good', line: 'Lose a city and the service stays up.' },
  EXPOSED: { label: 'Exposed', tone: 'warn', line: 'Lose the wrong city and a region goes dark.' },
  SINGLE: { label: 'Single point of failure', tone: 'bad', line: 'One room, one power feed, one bad night.' },
};

export const ARCH_SHARE: Record<Architecture, number> = { CLOUD: 0.15, HYBRID: 0.6, METAL: 1 };

/** Renting is cheap to stand up and dear to keep; owning is the reverse. */
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
const buildCostFactor = (share: number) => lerp(0.6, 1.45, share);
const weeklyFactor = (share: number) => lerp(1.7, 0.65, share);
const burstFactor = (share: number) => lerp(0.55, 0, share);

/** Which architecture a given mix is closest to. */
export function architectureFor(share: number): Architecture {
  if (share <= 0.3) return 'CLOUD';
  if (share >= 0.9) return 'METAL';
  return 'HYBRID';
}
const DOCTRINE_COST: Record<Doctrine, number> = { HARDENED: 1.12, STANDARD: 1, SPRINT: 1.22 };
const DOCTRINE_WEEKS: Record<Doctrine, number> = { HARDENED: 1.4, STANDARD: 1, SPRINT: 0.65 };
const RACK_COST = 3_750_000;   // one rack, delivered and racked

export interface BuildTotals {
  racks: number;
  cities: number;
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

export function buildTotals(data: BuildData, draft: BuildDraft): BuildTotals {
  if (data.canonical) return data.canonical.totals(draft);
  const racks = totalRacks(draft.facilities);
  const cities = new Set(draft.facilities.map((f) => f.cityId)).size;
  const moveIn = draft.facilities.reduce((sum, f) => sum + (listingFor(data, f)?.moveIn ?? 0), 0);
  const rent = draft.facilities.reduce((sum, f) => sum + (listingFor(data, f)?.weeklyRent ?? 0), 0);
  const ops = draft.facilities.reduce((sum, f) => sum + f.opCost, 0);
  const repairs = data.repairs.filter((r) => draft.repairIds.includes(r.id)).reduce((sum, r) => sum + r.cost, 0);

  const capacity = draft.facilities.reduce(
    (sum, f) => sum + f.groups.reduce((g, group) => g + group.capacity * usableCapacity(data, f), 0),
    0,
  );
  const share = draft.ownedShare ?? ARCH_SHARE[draft.architecture];
  const burst = capacity * burstFactor(share);

  const longest = Math.max(0, ...draft.facilities.map((f) => listingFor(data, f)?.provisioningWeeks ?? 0));
  const weeks = Math.round((longest + racks * 0.45) * DOCTRINE_WEEKS[draft.doctrine]);

  return {
    racks,
    cities,
    capacity: Math.round(capacity),
    burst: Math.round(burst),
    buildCost: Math.round((racks * RACK_COST * buildCostFactor(share) + moveIn) * DOCTRINE_COST[draft.doctrine] + repairs),
    weeklyCost: Math.round((rent + ops) * weeklyFactor(share)),
    weeks: Math.max(1, weeks),
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

export function moneyPlan(data: BuildData, draft: BuildDraft): MoneyPlan {
  if (data.canonical) return data.canonical.money(draft);
  const totals = buildTotals(data, draft);
  const campaign = data.campaigns.find((c) => c.id === draft.campaignId);
  const deposits = draft.facilities.reduce((sum, f) => sum + (listingFor(data, f)?.moveIn ?? 0), 0);

  const lines: SpendLine[] = [
    { id: 'infra', label: 'Infrastructure construction', amount: totals.buildCost - deposits, note: `${totals.racks} racks · ${Math.round((draft.ownedShare ?? ARCH_SHARE[draft.architecture]) * 100)}% owned` },
    { id: 'deposits', label: 'Facility setup and deposits', amount: deposits, note: `${totals.cities} cities` },
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

function formatWeekly(value: number): string {
  return value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${Math.round(value / 1000)}K`;
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
export function serviceForecast(data: BuildData, draft: BuildDraft): CountryService[] {
  if (data.canonical) return data.canonical.services(draft);
  const totals = buildTotals(data, draft);
  const totalDemand = data.markets.reduce((sum, m) => sum + m.demand, 0) || 1;
  const cities = draft.facilities.map((f) => ({ facility: f, city: cityFor(data, f) })).filter((x) => x.city);

  return data.markets.map((market) => {
    const ranked = cities
      .map((x) => ({ ...x, km: distanceKm(market.coord, (x.city as City).coord) }))
      .sort((a, b) => a.km - b.km);
    const nearest = ranked[0];

    if (!nearest) {
      return {
        marketId: market.id, name: market.name, code: market.code, servedBy: [], role: '—',
        state: 'NONE', startupMs: 0, buffering: 100, peak: Math.round(market.demand * 0.09),
        catalogue: market.catalogue, localization: 'No path', fix: 'Lease a facility that can reach this market',
      };
    }

    const hasEdge = ranked.some((r) => r.km < 1500 && r.facility.groups.some((g) => g.duty === 'EDGE'));
    const hasRegional = ranked.some((r) => r.km < 4000 && r.facility.groups.some((g) => g.duty === 'REGIONAL'));
    const share = market.demand / totalDemand;
    const peak = Math.round(market.demand * 0.09);
    const headroom = (totals.capacity + totals.burst) * share;
    const load = headroom > 0 ? peak / headroom : 99;

    const startupMs = Math.round(320 + nearest.km * 0.06 + (hasEdge ? 0 : 260) + (draft.architecture === 'CLOUD' ? 90 : 0));
    const buffering = Math.round(Math.max(0, (load - 0.75) * 120) + (hasEdge ? 0 : 4) + (draft.doctrine === 'SPRINT' ? 3 : 0));

    let state: ServiceState = 'READY';
    if (load > 1.25) state = 'UNSTABLE';
    else if (load > 1) state = 'POOR';
    else if (load > 0.85 || buffering > 6 || startupMs > 900) state = 'WATCH';

    return {
      marketId: market.id,
      name: market.name,
      code: market.code,
      servedBy: ranked.slice(0, 2).map((r) => (r.city as City).name),
      role: hasEdge ? 'Local edge' : hasRegional ? 'Regional cache' : 'Origin only',
      state,
      startupMs,
      buffering: Math.min(60, buffering),
      peak,
      catalogue: market.catalogue,
      localization: market.catalogue > 0.9 ? 'Fully licensed' : 'Some titles missing',
      fix: state === 'READY' ? undefined
        : !hasEdge ? `Add a local edge near ${market.name}`
          : load > 1 ? 'Add capacity — the racks cannot carry the peak'
            : 'Repair the limiting factor in the serving room',
    };
  });
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

const REACH_KM = { EDGE: 1500, REGIONAL: 4000, ORIGIN: 9000 };

export function coverage(data: BuildData, draft: BuildDraft, services: CountryService[]): Reach[] {
  return draft.facilities.map((facility) => {
    const city = cityFor(data, facility);
    const duties = new Set(facility.groups.map((g) => g.duty));
    const km = duties.has('EDGE') ? REACH_KM.EDGE
      : duties.has('REGIONAL') ? REACH_KM.REGIONAL
        : REACH_KM.ORIGIN;

    /* The circle is only as good as the worst market inside it. */
    const inside = city
      ? services.filter((s) => {
        const market = data.markets.find((m) => m.id === s.marketId);
        return market && distanceKm(market.coord, city.coord) <= km;
      })
      : [];
    const worst = inside.reduce<ServiceState>((acc, s) => {
      const rank = { READY: 0, WATCH: 1, POOR: 2, UNSTABLE: 3, NONE: 4 };
      return rank[s.state] > rank[acc] ? s.state : acc;
    }, 'READY');

    return {
      cityId: city?.id ?? facility.cityId,
      coord: city?.coord ?? { lat: 0, lng: 0 },
      km,
      grade: worst === 'READY' ? 'STRONG' : worst === 'WATCH' ? 'FAIR' : 'WEAK',
      racks: facilityRacks(facility),
    };
  });
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
  const rooms = draft.facilities
    .map((f) => `${f.listingId}:${f.groups.map((g) => `${g.duty}x${g.racks}`).sort().join('+')}`)
    .sort()
    .join('|');
  const demand = data.markets.map((m) => `${m.id}:${m.demand}`).join(',');
  return [rooms, draft.architecture, String(draft.ownedShare ?? ''), draft.doctrine, draft.campaignId, [...draft.repairIds].sort().join('+'), demand].join('/');
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

  const peak = Math.round(data.markets.reduce((sum, m) => sum + m.demand * 0.09, 0) * factor * hype);
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
  const hasOrigin = draft.facilities.some((f) => f.groups.some((g) => g.duty === 'ORIGIN'));
  const stale = rehearsalStale(data, draft);

  return {
    sites: totals.racks === 0 ? 'EMPTY' : totals.redundancy === 'SINGLE' ? 'WARN' : 'DONE',
    plans: totals.racks === 0 ? 'EMPTY' : !hasOrigin ? 'BLOCKED' : constrained > 0 ? 'WARN' : 'DONE',
    money: plan.total === 0 ? 'EMPTY' : plan.shortfall > 0 ? 'BLOCKED' : 'DONE',
    test: !draft.rehearsal ? 'EMPTY' : stale ? 'WARN' : draft.rehearsal.verdict === 'BROKE' ? 'BLOCKED' : 'DONE',
    launch: data.commissioned ? 'DONE' : 'DOING',
  };
}

/** The one line the header carries, in every state the build can be in. */
export function headerLine(data: BuildData, draft: BuildDraft): string {
  const totals = buildTotals(data, draft);
  const standing = totalRacks(data.existing);
  if (data.commissioned) {
    return standing === totals.racks
      ? `Infrastructure · ${standing} racks standing`
      : `${standing} racks standing · ${totals.racks} drawn`;
  }
  if (totals.racks === 0) return 'Nothing exists yet';
  return `${totals.racks} racks · ${totals.weeks} weeks to build`;
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

  return [
    {
      id: 'network', stage: 'sites', label: 'Network',
      value: totals.racks > 0
        ? `${totals.racks} ${totals.racks === 1 ? 'rack' : 'racks'} in ${totals.cities} ${totals.cities === 1 ? 'city' : 'cities'}`
        : 'No servers drawn',
      ok: totals.racks > 0,
    },
    {
      id: 'origin', stage: 'plans', label: 'Content origin',
      value: draft.facilities.some((f) => f.groups.some((g) => g.duty === 'ORIGIN'))
        ? 'Master catalogue has a home'
        : 'Nothing holds the masters',
      ok: draft.facilities.some((f) => f.groups.some((g) => g.duty === 'ORIGIN')),
    },
    {
      id: 'money', stage: 'money', label: 'Money',
      value: money.shortfall > 0 ? `${formatWeekly(money.shortfall)} short` : `${formatWeekly(money.headroom)} headroom`,
      ok: money.shortfall === 0,
    },
    {
      id: 'plans', stage: 'money', label: 'Plans on sale',
      value: data.pricing.plans > 0 ? `${data.pricing.plans} on sale` : 'Nothing on sale',
      ok: data.pricing.plans > 0,
    },
    {
      id: 'physical', stage: 'plans', label: 'The rooms',
      value: (() => {
        const constrained = draft.facilities.filter((f) => limitingFactor(data, f) !== 'NONE');
        if (draft.facilities.length === 0) return 'No rooms leased';
        return constrained.length === 0
          ? 'Every room can run its racks'
          : `${constrained.length} room${constrained.length > 1 ? 's' : ''} short of power, cooling or fibre`;
      })(),
      ok: draft.facilities.length > 0 && draft.facilities.every((f) => limitingFactor(data, f) === 'NONE'),
    },
    {
      id: 'rehearsal', stage: 'test', label: 'Rehearsal',
      value: !rehearsal ? 'Not run'
        : rehearsalStale(data, draft) ? 'Out of date — the drawing changed'
          : rehearsal.verdict === 'HELD' ? 'It held'
            : rehearsal.verdict === 'RENTED' ? 'Held by renting' : 'It broke',
      ok: Boolean(rehearsal && !rehearsalStale(data, draft) && rehearsal.verdict !== 'BROKE'),
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
