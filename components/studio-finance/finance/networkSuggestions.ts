import type { BuildData, BuildDraft, BuildTotals, CountryService, Facility, MoneyPlan } from './build';
import {
  assertCanonicalBuildData, buildTotals, CLOUD_PROVIDERS, CLOUD_PROVIDER_IDS, cloudProviderServes, countryServiceCoverageValid,
  fitsPlan, moneyPlan, serviceForecast, tiersOf,
} from './build';
import { emptySetup, openingRegions, placeRegion, type RegionSetup } from './placer';
import { STREAMING_SERVED_COVERAGE_SHARE } from '../../../services/streamingNetworkCoverage';
import type { StreamingNetworkQuote } from '../../../services/streamingNetworkQuote';

export type NetworkSuggestionMode = 'BUDGET' | 'BALANCED' | 'PREMIUM';
export interface NetworkSuggestionRequest {
  mode: NetworkSuggestionMode;
  upfrontLimit: number;
  weeklyLimit: number;
  replaceUnbuilt: boolean;
}
export const NETWORK_SUGGESTION_TARGETS: Record<NetworkSuggestionMode, number> = { BUDGET: 1, BALANCED: 1.2, PREMIUM: 1.5 };
export interface NetworkSuggestionProposal {
  draft: BuildDraft;
  request: NetworkSuggestionRequest;
  inputIdentity: string;
  totals: BuildTotals;
  money: MoneyPlan;
  quote?: StreamingNetworkQuote;
  services: CountryService[];
  upfront: number;
  weekly: number;
  upfrontDelta: number;
  weeklyDelta: number;
  targetMultiplier: number;
  targetCapacity: number;
  fullCoverage: boolean;
  launchThresholdMet: boolean;
  complete: boolean;
  capacityTargetMet: boolean;
  warnings: string[];
  evaluatedCandidates: number;
}
export type NetworkSuggestionResult = { status: 'READY'; proposal: NetworkSuggestionProposal }
  | { status: 'INVALID'; message: string } | { status: 'CANCELLED' };
export interface NetworkSuggestionControl {
  signal?: AbortSignal;
  onProgress?: (progress: { evaluated: number; maximum: number }) => void;
}
export type NetworkSuggestionValidation = { ok: true; patch: Pick<BuildDraft, 'facilities' | 'rehearsal'> }
  | { ok: false; message: string };

/** Exact whole dollars; blank editing text remains blank instead of authorizing a default. */
export function parseNetworkLimit(text: string): number | null {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
const json = (value: unknown): string => JSON.stringify(value);
const issuedProposals = new WeakMap<NetworkSuggestionProposal, { content: string; signal?: AbortSignal }>();
const selectedCodes = (data: BuildData) => new Set(data.countries.filter(country => country.opening).map(country => country.code));
const fail = (message: string): NetworkSuggestionResult => ({ status: 'INVALID', message });
function requestError(data: BuildData, request: NetworkSuggestionRequest): string | null {
  if (!Object.hasOwn(NETWORK_SUGGESTION_TARGETS, request.mode)
    || typeof request.replaceUnbuilt !== 'boolean') return 'Choose a suggestion mode and a plan option.';
  if (![request.upfrontLimit, request.weeklyLimit].every(n => Number.isSafeInteger(n) && n >= 0))
    return 'Enter exact, non-negative whole USD amounts for both limits.';
  if (data.hasExplicitOpeningMarkets !== true || !data.markets.length || !selectedCodes(data).size)
    return 'Choose and confirm opening markets in Define the Launch first.';
  const codes = selectedCodes(data);
  if (data.markets.some(market => !codes.has(market.code)) || [...codes].some(code => !data.markets.some(market => market.code === code)))
    return 'Opening market data changed. Reopen Build before generating.';
  if (![data.treasury.available, data.treasury.committedLaunch].every(n => Number.isFinite(n) && n >= 0))
    return 'Current available funds could not be verified.';
  try { assertCanonicalBuildData(data); } catch (error) { return (error as Error).message; }
  if (data.canonicalMode === 'CAREER' && (!data.canonical?.quote || !data.canonical.facilities))
    return 'Current canonical network evidence is unavailable. Reopen Build.';
  return null;
}
/** Called only by explicit generation/apply, never by render or ordinary field edits. */
function inputIdentity(data: BuildData, draft: BuildDraft, request: NetworkSuggestionRequest): string {
  return json({ data: { ...data, canonical: undefined }, draft, request,
    canonicalSignature: data.canonical?.signature(draft) });
}
function preservedRooms(data: BuildData, draft: BuildDraft, replace: boolean): Facility[] {
  const retained = draft.facilities.filter(room => !replace || room.built || data.existing.some(existing => existing.id === room.id));
  const byId = new Map(retained.map(room => [room.id, room]));
  for (const room of data.existing) byId.set(room.id, room);
  return [...byId.values()];
}
interface Evidence {
  totals: BuildTotals; money: MoneyPlan; quote?: StreamingNetworkQuote; services: CountryService[];
  upfront: number; weekly: number; targetCapacity: number; fullCoverage: boolean; launchThresholdMet: boolean;
  complete: boolean; capacityTargetMet: boolean;
  regional: Record<string, { score: number; complete: boolean; cities: number }>;
}
function evidence(data: BuildData, draft: BuildDraft, multiplier: number): Evidence {
  const totals = buildTotals(data, draft);
  const money = moneyPlan(data, draft);
  const quote = data.canonical?.quote?.(draft);
  const services = serviceForecast(data, draft);
  // Local lab money predates commissionNow. Its infrastructure lines are explicit;
  // career money always comes from the canonical bridge, including deposits/reserves.
  const upfront = money.commissionNow ?? money.lines.filter(line => ['infra', 'deposits', 'reserve'].includes(line.id)).reduce((sum, line) => sum + line.amount, 0);
  const weekly = totals.weeklyCost;
  if (![upfront, weekly, money.total, money.available, totals.capacity, totals.burst].every(n => Number.isFinite(n) && n >= 0))
    throw new Error('The current network quote is unavailable. Reopen Build.');
  const valid = services.length === data.markets.length && services.every(countryServiceCoverageValid)
    && data.markets.every(market => services.some(service => service.code === market.code));
  const likely = data.openingDemand?.likely ?? services.reduce((sum, service) => sum + service.peak, 0);
  const targetCapacity = Math.ceil(likely * multiplier);
  const fullCoverage = valid && services.every(service => service.coveredShare >= .999999);
  const launchThresholdMet = valid && services.every(service => (service.geographicCoveredShare ?? service.coveredShare) >= STREAMING_SERVED_COVERAGE_SHARE);
  const projected = data.canonical?.facilities?.(draft) ?? draft.facilities;
  const regionOfCity = new Map(data.cities.map(city => [city.id, data.countries.find(country => country.id === city.countryId)?.regionId]));
  const regionOfCode = new Map(data.countries.map(country => [country.code, country.regionId]));
  const capacityByRegion = new Map<string, number>();
  for (const room of projected) {
    const region = regionOfCity.get(room.cityId);
    if (region) capacityByRegion.set(region, (capacityByRegion.get(region) ?? 0) + room.groups.reduce((sum, group) => sum + group.capacity, 0));
  }
  const regional: Evidence['regional'] = {};
  let capacityTargetMet = valid;
  for (const region of data.regions) {
    const readings = services.filter(service => regionOfCode.get(service.code) === region.id);
    if (!readings.length) continue;
    const required = readings.reduce((sum, service) => sum + service.peak, 0) * multiplier;
    const capacity = capacityByRegion.get(region.id) ?? 0;
    capacityTargetMet &&= capacity >= required;
    const coverage = readings.reduce((sum, service) => sum + service.coveredShare, 0) / readings.length;
    regional[region.id] = { cities: new Set(projected.filter(room => regionOfCity.get(room.cityId) === region.id).map(room => room.cityId)).size, score: coverage + Math.min(1, capacity / Math.max(1, required)) * .1,
      complete: readings.every(service => countryServiceCoverageValid(service) && service.coveredShare >= .999999) && capacity >= required };
  }
  capacityTargetMet &&= (totals.capacity + (data.canonical ? 0 : totals.burst)) >= targetCapacity;
  return { totals, money, quote, services, upfront, weekly, targetCapacity, fullCoverage, launchThresholdMet,
    complete: fullCoverage && capacityTargetMet, capacityTargetMet, regional };
}
function affordable(data: BuildData, request: NetworkSuggestionRequest, value: Evidence): boolean {
  // Explicit canonical deferred excludes already-settled launch/catalogue spend.
  // Only legacy money without that accounting needs the committedLaunch fallback.
  const deferred = value.money.deferred ?? Math.max(0, value.money.total - value.upfront, data.treasury.committedLaunch);
  return value.upfront <= request.upfrontLimit && value.weekly <= request.weeklyLimit
    && value.upfront + deferred <= Math.min(data.treasury.available, value.money.available);
}
function structuralError(data: BuildData, original: BuildDraft, request: NetworkSuggestionRequest, proposed: BuildDraft): string | null {
  const retained = preservedRooms(data, original, request.replaceUnbuilt);
  for (const room of retained) if (json(proposed.facilities.find(candidate => candidate.id === room.id)) !== json(room))
    return 'An existing facility changed. Generate again.';
  const retainedIds = new Set(retained.map(room => room.id));
  const ids = new Set<string>();
  const codes = selectedCodes(data);
  for (const room of proposed.facilities) {
    if (ids.has(room.id)) return 'Duplicate facility identity. Generate again.';
    ids.add(room.id);
    if (retainedIds.has(room.id)) continue;
    const city = data.cities.find(candidate => candidate.id === room.cityId);
    const listing = data.listings.find(candidate => candidate.id === room.listingId && candidate.cityId === room.cityId);
    if (!city || !codes.has(city.code) || !listing || listing.availability === 'RESEARCH') return 'A proposed site is no longer available in the opening markets.';
    if (!(listing.tenures ?? ['RENTED']).includes(room.tenure ?? 'RENTED')) return 'A proposed facility tenure is unavailable.';
    if (room.tenure === 'CLOUD') {
      const provider = CLOUD_PROVIDERS[room.provider ?? 'ATLAS'];
      const region = data.countries.find(country => country.id === city.countryId)?.regionId;
      if (!provider || !region || !cloudProviderServes(provider, region)) return 'A proposed cloud provider is unavailable here.';
    }
    if (room.tenure !== 'CLOUD' && !fitsPlan(listing, tiersOf(room))) return 'A proposed room exceeds its physical limits.';
  }
  return null;
}
const yieldWork = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Bounded greedy comparison, not a promise of a globally optimal network.
 * Scope only the placement view: canonical evaluation always receives the full current data.
 * New regional rooms are planned independently beside the preserved estate.
 */
export async function createNetworkSuggestion(data: BuildData, draft: BuildDraft, request: NetworkSuggestionRequest,
  control: NetworkSuggestionControl = {}): Promise<NetworkSuggestionResult> {
  const error = requestError(data, request);
  if (error) return fail(error);
  if (control.signal?.aborted) return { status: 'CANCELLED' };
  try {
    const identity = inputIdentity(data, draft, request);
    const multiplier = NETWORK_SUGGESTION_TARGETS[request.mode];
    const before = evidence(data, draft, multiplier);
    const retained = preservedRooms(data, draft, request.replaceUnbuilt);
    let bestDraft = { ...draft, facilities: retained, rehearsal: null };
    let best = evidence(data, bestDraft, multiplier);
    if (!affordable(data, request, best)) return fail('The preserved network already exceeds a limit or available funds. Increase the limits or explicitly replace the unbuilt plan.');
    const opening = selectedCodes(data);
    const scoped: BuildData = { ...data, countries: data.countries.filter(country => opening.has(country.code)),
      cities: data.cities.filter(city => opening.has(city.code)) };
    const regions = openingRegions(scoped);
    // At most 432 candidate placements, with a task boundary after each one.
    const sizes = [1, 2, 4, 8, 16, 32, 64, 128];
    const maximum = regions.length * sizes.length * 9;
    let evaluated = 0;
    let capLimited = false;
    const generatedByRegion = new Map<string, Facility[]>();
    for (const region of regions) {
      let regionBest = best;
      let regionDraft = bestDraft;
      let regionRooms: Facility[] = [];
      const others = [...retained, ...[...generatedByRegion.values()].flat()];
      // Use each real listing as authorized by BuildData; never turn a research
      // listing into an available room, or fabricate a fallback career facility.
      for (const size of sizes) for (let mix = 0; mix < 9; mix += 1) {
        control.onProgress?.({ evaluated, maximum });
        await yieldWork();
        if (control.signal?.aborted) return { status: 'CANCELLED' };
        const setup: RegionSetup = emptySetup();
        if (mix < 3) setup.servers[(['SCOUT', 'WORKHORSE', 'TITAN'] as const)[mix]] = size;
        else if (mix < 6) setup.cloud = { provider: CLOUD_PROVIDER_IDS[mix - 3], compute: size };
        else if (mix === 6) {
          setup.servers.WORKHORSE = Math.ceil(size / 2);
          setup.cloud = { provider: 'ATLAS', compute: Math.ceil(size / 2) };
        } else if (mix === 7) {
          setup.servers.TITAN = Math.ceil(size / 2);
          setup.cloud = { provider: 'MERIDIAN', compute: Math.ceil(size / 2) };
        } else {
          setup.servers.SCOUT = Math.ceil(size / 4);
          setup.servers.WORKHORSE = Math.ceil(size / 2);
          setup.servers.TITAN = Math.ceil(size / 4);
        }
        const placement = placeRegion(scoped, { ...draft, facilities: [], rehearsal: null }, region.id, setup);
        const usedIds = new Set(others.map(room => room.id));
        const rooms = placement.draft.facilities.map((room, index) => {
          let id = `suggest-${region.id}-${index}-${room.listingId}`;
          while (usedIds.has(id)) id += '-next';
          usedIds.add(id);
          return { ...room, id };
        });
        const candidate: BuildDraft = { ...draft, facilities: [...others, ...rooms], rehearsal: null };
        evaluated += 1;
        if (structuralError(data, draft, request, candidate)) continue;
        const current = evidence(data, candidate, multiplier);
        if (!affordable(data, request, current)) { capLimited = true; continue; }
        const cost = (value: Evidence) => value.upfront + value.weekly * (request.mode === 'BUDGET' ? 52 : 26);
        const diversity = (value: Evidence) => request.mode === 'PREMIUM' ? Math.min(2, value.regional[region.id]?.cities ?? 0) : 0;
        const currentRegional = current.regional[region.id];
        const bestRegional = regionBest.regional[region.id];
        const currentScore = (currentRegional?.score ?? 0) + diversity(current) * .001;
        const bestScore = (bestRegional?.score ?? 0) + diversity(regionBest) * .001;
        const better = currentRegional?.complete && !bestRegional?.complete
          || currentRegional?.complete === bestRegional?.complete && (currentRegional?.complete
            ? diversity(current) > diversity(regionBest) || diversity(current) === diversity(regionBest) && cost(current) < cost(regionBest)
            : currentScore > bestScore + 1e-8 || Math.abs(currentScore - bestScore) < 1e-8 && cost(current) < cost(regionBest));
        if (better) { regionBest = current; regionDraft = candidate; regionRooms = rooms; }
      }
      best = regionBest;
      bestDraft = regionDraft;
      generatedByRegion.set(region.id, regionRooms);
    }
    if (control.signal?.aborted) return { status: 'CANCELLED' };
    // Recreate the draft to avoid reading a memoized candidate's canonical evidence.
    bestDraft = { ...bestDraft, facilities: [...bestDraft.facilities] };
    best = evidence(data, bestDraft, multiplier);
    if (inputIdentity(data, draft, request) !== identity) return fail('Inputs changed while generating. Generate again.');
    if (!affordable(data, request, best)) return fail('The current quote exceeds a limit. Generate again.');
    const warnings: string[] = [];
    if (!best.complete) warnings.push('Partial suggestion: no complete plan was found in the bounded comparison.');
    const gaps = best.services.filter(service => !countryServiceCoverageValid(service) || service.coveredShare < .999999);
    if (gaps.length) warnings.push(`Remaining service gaps: ${gaps.map(service => service.name).join(', ')}. Geography, residency and available sites can limit coverage.`);
    if (!best.capacityTargetMet) warnings.push(`Capacity is short of the ${multiplier}× likely-demand target.`);
    if (capLimited) warnings.push('Some evaluated plans exceeded the spending limits or available funds.');
    warnings.push('Practical bounded comparison; costs are evaluated quotes, not a proven minimum.');
    control.onProgress?.({ evaluated, maximum });
    if (control.signal?.aborted) return { status: 'CANCELLED' };
    const { regional: _regional, ...shown } = best;
    const proposal: NetworkSuggestionProposal = { draft: bestDraft, request: { ...request }, inputIdentity: identity,
      ...shown, upfrontDelta: best.upfront - before.upfront, weeklyDelta: best.weekly - before.weekly,
      targetMultiplier: multiplier, warnings, evaluatedCandidates: evaluated };
    issuedProposals.set(proposal, { content: json(proposal), signal: control.signal });
    return { status: 'READY', proposal };
  } catch (error) { return fail(error instanceof Error ? error.message : 'The network could not be verified. Reopen Build.'); }
}

/** Authorizes only an in-memory draft patch, never money, rights, or commissioning. */
export function validateNetworkSuggestion(data: BuildData, draft: BuildDraft, request: NetworkSuggestionRequest,
  proposal: NetworkSuggestionProposal): NetworkSuggestionValidation {
  try {
    const issued = issuedProposals.get(proposal);
    if (!issued || issued.signal?.aborted || issued.content !== json(proposal))
      return { ok: false, message: 'This suggestion was cancelled or changed. Generate again.' };
    const error = requestError(data, request);
    if (error) return { ok: false, message: error };
    if (inputIdentity(data, draft, request) !== proposal.inputIdentity || json(request) !== json(proposal.request))
      return { ok: false, message: 'Inputs changed. Generate a new suggestion.' };
    const structural = structuralError(data, draft, request, proposal.draft);
    if (structural) return { ok: false, message: structural };
    const candidate = { ...proposal.draft, facilities: [...proposal.draft.facilities], rehearsal: null };
    const current = evidence(data, candidate, NETWORK_SUGGESTION_TARGETS[request.mode]);
    if (!affordable(data, request, current)) return { ok: false, message: 'The current quote exceeds a limit or available funds.' };
    for (const key of ['totals','money','quote','services','upfront','weekly','targetCapacity','fullCoverage','launchThresholdMet','complete','capacityTargetMet'] as const)
      if (json(current[key]) !== json(proposal[key])) return { ok: false, message: 'Network evidence changed. Generate a new suggestion.' };
    return { ok: true, patch: { facilities: candidate.facilities, rehearsal: null } };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'The proposal could not be verified.' }; }
}
