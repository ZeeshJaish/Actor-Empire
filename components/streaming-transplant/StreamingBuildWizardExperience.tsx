import React, { useCallback, useMemo, useRef, useState } from 'react';
import { BuildWizard } from '../studio-finance/components/build/BuildWizard';
import type {
  Architecture,
  BuildData,
  BuildDraft,
  BuildTotals,
  City as BuildCity,
  CountryService,
  Duty,
  Facility,
  FacilityListing,
  MoneyPlan,
  RehearsalResult,
  Scenario,
} from '../studio-finance/finance/build';
import {
  signatureOf,
} from '../studio-finance/finance/build';
import type {
  OwnedStreamingFacility,
  OwnedStreamingRackGroup,
  StreamingDefineLaunchStepId,
  StreamingInfrastructureManagementPolicy,
  StreamingRackDuty,
} from '../../types';
import {
  PRODUCTION_LOCATION_CATALOG,
} from '../../services/productionLocations';
import {
  STREAMING_DAY_ONE_MARKETS,
  STREAMING_DAY_ONE_REGION_LABELS,
} from '../../services/streamingDayOneMarkets';
import {
  createStreamingFacilityFromListing,
  getStreamingFacilityMarketplace,
  type StreamingFacilityMarketplaceListing,
} from '../../services/streamingFacilityMarketplace';
import {
  getStreamingFacilityCapacity,
  getStreamingFacilityContract,
  migratePlacementsToStreamingFacilities,
} from '../../services/streamingFacilities';
import {
  applyStreamingFacilityRepair,
  getStreamingFacilityPhysicalView,
  type StreamingFacilityRepairAction,
} from '../../services/streamingInfrastructurePhysical';
import {
  getProjectedRackDuty,
  getStreamingRackDutyRule,
  normalizeStreamingRackGroups,
  projectFacilityNetworkRole,
} from '../../services/streamingRackGroups';
import {
  CAMPAIGNS,
  PACKAGES,
  PER_RACK_CEILING,
  derive,
  deriveStreamingLaunchRehearsal,
  facilitiesOf,
  selectionWithFacilities,
  StreamingLoadRehearsalExperience,
  type BuildCommitResult,
  type BuildInputs,
  type BuildSel,
  type Placement,
  type RunResult,
} from './StreamingBuildoutExperience';
import {
  type Brand,
  type RegionId,
} from './StreamingBrandVisuals';

export interface StreamingBuildQuote {
  transactionCost: number;
  weeklyOperatingCost: number;
  buildWeeks: number;
  baselineConcurrentStreams: number;
  burstConcurrentStreams: number;
  energyKwhWeekly: number;
  waterLitresWeekly: number;
  sustainabilityScore: number;
  publicReputation: number;
}

export interface StreamingBuildWizardExperienceProps {
  brand: Brand;
  inputs: BuildInputs;
  sel: BuildSel;
  result?: RunResult | null;
  built?: Placement[] | null;
  builtFacilities?: OwnedStreamingFacility[] | null;
  isLive?: boolean;
  onResult?: (result: RunResult | null) => void;
  onCommit?: (selection: BuildSel) => BuildCommitResult | void;
  quoteSelection?: (selection: BuildSel) => StreamingBuildQuote;
  onOpenNight?: () => void;
  onChange: (selection: BuildSel) => void;
  onBack: () => void;
  pricing?: { label: string; arpu: string; reach: string; problems: number; sellable: number };
  onOpenPricing?: () => void;
  onOpenContent?: () => void;
  onOpenDefine?: (step: StreamingDefineLaunchStepId) => void;
  funding?: { borrowed: number; soldPct: number; own: number };
  onRaise?: () => void;
}

const REGION_LINES: Record<RegionId, string> = {
  NORTH_AMERICA: 'Deep fibre, expensive attention and the strongest subscription habit.',
  SOUTH_AMERICA: 'Fast audience growth with one or two cities carrying enormous distances.',
  EUROPE: 'Dense exchanges, expensive power and strict infrastructure obligations.',
  AFRICA: 'Mobile-first growth where power resilience matters as much as fibre.',
  ASIA: 'The largest audiences, sharp price pressure and long routes between hubs.',
  OCEANIA: 'Strong subscription markets separated from the rest of the network by ocean.',
};

const COUNTRY_CITIES: Record<string, string[]> = {
  US: ['LA', 'NYC', 'ATL'], CA: ['TOR', 'VAN'], MX: ['MEX'],
  BR: ['RIO'], AR: ['BUE'], CO: ['BOG'], CL: ['LIM'],
  GB: ['LDN'], DE: ['BER', 'PRG'], FR: ['PAR'], ES: ['MAD'], IT: ['ROM'],
  ZA: ['CPT'], NG: ['LAG'], EG: ['CAI'], KE: ['MAR'],
  IN: ['BOM'], JP: ['TOK'], KR: ['SEO'], ID: ['BEI'], TH: ['BKK'], PH: ['HKG'],
  AU: ['SYD', 'MEL'], NZ: ['AKL'],
};

const SHAPE_BY_COUNTRY: Record<string, string> = { GB: 'uk' };

const DUTY_TO_GAME: Record<Duty, StreamingRackDuty> = {
  ORIGIN: 'CONTENT_ORIGIN',
  REGIONAL: 'REGIONAL_CACHE',
  EDGE: 'LOCAL_EDGE',
  ENCODE: 'ENCODING',
  SERVICES: 'PLATFORM_SERVICES',
  LIVE: 'LIVE_EVENT',
  FUTURE: 'SPECIALIZED',
};

const DUTY_FROM_GAME: Record<StreamingRackDuty, Duty> = {
  CONTENT_ORIGIN: 'ORIGIN',
  REGIONAL_CACHE: 'REGIONAL',
  LOCAL_EDGE: 'EDGE',
  ENCODING: 'ENCODE',
  PLATFORM_SERVICES: 'SERVICES',
  LIVE_EVENT: 'LIVE',
  SPECIALIZED: 'FUTURE',
};

const ARCH_TO_BUILD: Record<BuildSel['arch'], Architecture> = {
  CLOUD: 'CLOUD', HYBRID: 'HYBRID', OWNED: 'METAL',
};

const ARCH_TO_GAME: Record<Architecture, BuildSel['arch']> = {
  CLOUD: 'CLOUD', HYBRID: 'HYBRID', METAL: 'OWNED',
};

const doctrineToBuild = (value: BuildSel['doctrine']): BuildDraft['doctrine'] => (
  value === 'SAFE' ? 'HARDENED' : value === 'RUSHED' ? 'SPRINT' : 'STANDARD'
);

const doctrineToGame = (value: BuildDraft['doctrine']): BuildSel['doctrine'] => (
  value === 'HARDENED' ? 'SAFE' : value === 'SPRINT' ? 'RUSHED' : 'STANDARD'
);

const campaignToBuild = (value: BuildSel['campaign']): string => value.toLowerCase();
const campaignToGame = (value: string): BuildSel['campaign'] => (
  value === 'national' ? 'NATIONAL' : value === 'regional' ? 'REGIONAL' : 'NONE'
);

const managementToBuild = (policy?: StreamingInfrastructureManagementPolicy): BuildDraft['instructions'] => ({
  priority: policy?.priority === 'ECONOMY' ? 'CASH'
    : policy?.priority === 'RELIABLE' ? 'ONLINE'
      : policy?.priority === 'PREMIUM' ? 'PREMIUM' : 'BALANCED',
  maxBudget: policy?.maximumBudget ?? 45_000_000,
  risk: policy?.riskTolerance === 'LOW' ? 'CAREFUL'
    : policy?.riskTolerance === 'HIGH' ? 'FAST' : 'NORMAL',
  preferredCityIds: [...(policy?.preferredCityIds || [])],
  askAbove: policy?.approvalThreshold ?? 5_000_000,
});

const managementToGame = (draft: BuildDraft): StreamingInfrastructureManagementPolicy => ({
  mode: draft.mode === 'HANDS' ? 'HANDS_ON' : 'ASSISTED',
  priority: draft.instructions.priority === 'CASH' ? 'ECONOMY'
    : draft.instructions.priority === 'ONLINE' ? 'RELIABLE'
      : draft.instructions.priority === 'PREMIUM' ? 'PREMIUM' : 'BALANCED',
  maximumBudget: draft.instructions.maxBudget,
  riskTolerance: draft.instructions.risk === 'CAREFUL' ? 'LOW'
    : draft.instructions.risk === 'FAST' ? 'HIGH' : 'MEDIUM',
  preferredCityIds: [...draft.instructions.preferredCityIds],
  requireApprovalForExpensiveChanges: draft.instructions.askAbove > 0,
  approvalThreshold: draft.instructions.askAbove,
});

const hslToHex = (hue: number, saturation: number, lightness = 58): string => {
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r0, g0, b0] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0]
    : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c]
      : hue < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r0, g0, b0].map(value => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const listingToBuild = (listing: StreamingFacilityMarketplaceListing): FacilityListing => ({
  id: listing.listingId,
  cityId: listing.cityId,
  provider: listing.providerName,
  name: listing.facilityName,
  type: getStreamingFacilityContract(listing.facilityType).name,
  description: listing.description,
  rackPositions: listing.rackPositions,
  moveIn: listing.depositCost + listing.setupCost,
  weeklyRent: listing.weeklyRent,
  powerPrice: `$${listing.electricityRatePerKwh.toFixed(2)}/kWh`,
  localTax: `${listing.taxRatePercent.toFixed(1)}% local`,
  uptime: listing.reliabilityPercent / 100,
  fibre: listing.fibreGrade === 'GLOBAL_BACKBONE' ? 'Carrier hotel'
    : listing.fibreGrade === 'CARRIER' ? 'Excellent' : 'Good',
  security: listing.securityGrade === 'FORTIFIED' ? 'Vault'
    : listing.securityGrade === 'REINFORCED' ? 'High' : 'Standard',
  provisioningWeeks: listing.provisioningWeeks,
  contractMonths: Math.max(1, Math.round(listing.contractWeeks / 4.33)),
  expansion: listing.expansionRackPositions,
  note: listing.marketNote,
  availability: listing.status === 'RESEARCH_REQUIRED' ? 'RESEARCH'
    : listing.status === 'LIMITED' ? 'LIMITED' : 'AVAILABLE',
});

const syntheticListing = (facility: OwnedStreamingFacility): FacilityListing => {
  const contract = getStreamingFacilityContract(facility.type);
  const city = PRODUCTION_LOCATION_CATALOG.find(item => item.id === facility.cityId);
  return {
    id: `LEGACY:${facility.id}`,
    cityId: facility.cityId,
    provider: facility.lease?.providerName || 'Existing company contract',
    name: contract.name,
    type: contract.shortName,
    description: contract.description,
    rackPositions: getStreamingFacilityCapacity(facility),
    moveIn: 0,
    weeklyRent: facility.lease?.weeklyRent || 0,
    powerPrice: facility.lease ? `$${facility.lease.electricityRatePerKwh.toFixed(2)}/kWh` : 'Existing tariff',
    localTax: facility.lease ? `${facility.lease.taxRatePercent.toFixed(1)}% local` : 'Existing terms',
    uptime: (facility.lease?.reliabilityPercent || 99.62) / 100,
    fibre: facility.lease?.fibreGrade === 'GLOBAL_BACKBONE' ? 'Carrier hotel'
      : facility.lease?.fibreGrade === 'CARRIER' ? 'Excellent' : 'Good',
    security: facility.lease?.securityGrade === 'FORTIFIED' ? 'Vault'
      : facility.lease?.securityGrade === 'REINFORCED' ? 'High' : 'Standard',
    provisioningWeeks: facility.lease?.provisioningWeeks || 0,
    contractMonths: Math.max(1, Math.round((facility.lease?.contractWeeks || 52) / 4.33)),
    expansion: facility.lease?.expansionRackPositions || 0,
    note: city?.desc || 'A facility preserved from the company save.',
    availability: 'AVAILABLE',
  };
};

const facilityToBuild = (facility: OwnedStreamingFacility, built: boolean): Facility => {
  const groups = normalizeStreamingRackGroups(facility.rackGroups, facility.id, facility.installedRacks, facility.role);
  const physical = getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh);
  return {
    id: facility.id,
    listingId: facility.lease?.listingId || `LEGACY:${facility.id}`,
    cityId: facility.cityId,
    built,
    groups: groups.map(group => {
      const duty = DUTY_FROM_GAME[getProjectedRackDuty(group)];
      const rule = getStreamingRackDutyRule(getProjectedRackDuty(group));
      return {
        id: group.id,
        name: group.name,
        duty,
        racks: group.rackCount,
        capacity: Math.round(group.rackCount * PER_RACK_CEILING * rule.capacityMultiplier),
      };
    }),
    power: { used: physical.powerUsedKw, contracted: physical.state.powerContractKw },
    cooling: { used: physical.coolingUsedKw, available: physical.state.coolingCapacityKw },
    bandwidth: { used: physical.bandwidthUsedMbps, available: physical.state.bandwidthMbps },
    condition: physical.state.maintenanceConditionPercent / 100,
    uptime: physical.reliabilityPercent / 100,
    backup: physical.state.backupPowerMode === 'N_PLUS_ONE' ? 'N+1 generators'
      : physical.state.backupPowerMode === 'GENERATOR' ? 'Generator'
        : physical.state.backupPowerMode === 'UPS' ? 'UPS' : 'None',
    backupCoverage: physical.backupCoveragePercent / 100,
    energyPerWeek: Math.round(physical.energyKwhWeekly / 1_000),
    waterPerWeek: Math.round(physical.waterLitresWeekly / 1_000),
    opCost: physical.weeklyOperatingCost,
    sustainability: physical.sustainabilityScore,
    reputation: physical.publicReputation,
  };
};

const selectBaseFacility = (
  draftFacility: Facility,
  existing: OwnedStreamingFacility[],
): OwnedStreamingFacility | null => {
  const current = existing.find(item => item.id === draftFacility.id);
  if (current) return current;
  const listing = getStreamingFacilityMarketplace(draftFacility.cityId)
    .find(item => item.listingId === draftFacility.listingId);
  if (!listing) return migratePlacementsToStreamingFacilities([{
    cityId: draftFacility.cityId,
    racks: Math.max(1, draftFacility.groups.reduce((sum, group) => sum + group.racks, 0)),
    role: 'EDGE_CACHE',
  }])[0] || null;
  return { ...createStreamingFacilityFromListing(listing, existing, 'EDGE_CACHE', 1), id: draftFacility.id };
};

const buildSelectionFromDraft = (
  draft: BuildDraft,
  base: BuildSel,
  absoluteWeek: number,
): BuildSel => {
  const originalFacilities = facilitiesOf(base);
  const facilities = draft.facilities.flatMap(draftFacility => {
    const source = selectBaseFacility(draftFacility, originalFacilities);
    if (!source) return [];
    const rackGroups: OwnedStreamingRackGroup[] = draftFacility.groups
      .filter(group => group.racks > 0)
      .map(group => ({
        id: group.id,
        name: group.name,
        rackCount: group.racks,
        duty: DUTY_TO_GAME[group.duty],
      }));
    if (!rackGroups.length) return [];
    let next: OwnedStreamingFacility = {
      ...source,
      id: draftFacility.id,
      installedRacks: rackGroups.reduce((sum, group) => sum + group.rackCount, 0),
      rackGroups,
      role: projectFacilityNetworkRole(rackGroups),
    };
    draft.repairIds.forEach(repairId => {
      const [facilityId, action] = repairId.split(':');
      if (facilityId !== draftFacility.id) return;
      if (!['UPGRADE_POWER', 'IMPROVE_COOLING', 'ADD_BANDWIDTH', 'REPLACE_EQUIPMENT'].includes(action)) return;
      next = applyStreamingFacilityRepair(next, action as StreamingFacilityRepairAction, absoluteWeek).facility;
    });
    return [next];
  });
  return selectionWithFacilities({
    ...base,
    arch: ARCH_TO_GAME[draft.architecture],
    doctrine: doctrineToGame(draft.doctrine),
    campaign: campaignToGame(draft.campaignId),
    managementPolicy: managementToGame(draft),
  }, facilities);
};

const selectionKey = (selection: BuildSel): string => JSON.stringify({
  arch: selection.arch,
  doctrine: selection.doctrine,
  campaign: selection.campaign,
  managementPolicy: selection.managementPolicy,
  facilities: facilitiesOf(selection).map(facility => ({
    id: facility.id,
    cityId: facility.cityId,
    type: facility.type,
    installedRacks: facility.installedRacks,
    role: facility.role,
    lease: facility.lease,
    physical: facility.physical,
    rackGroups: facility.rackGroups,
  })),
});

const rehearsalToBuild = (result: RunResult, signature: string): RehearsalResult => ({
  signature,
  scenario: result.scenario,
  verdict: result.verdict === 'BURST' ? 'RENTED' : result.verdict,
  peak: result.peakConcurrentStreams,
  capacity: result.steadyCapacity,
  spare: Math.max(0, result.steadyCapacity + result.burstCapacity - result.peakConcurrentStreams),
  failedPct: result.failedPercent,
  catalogue: result.catalogueAvailabilityPercent / 100,
  spof: result.regionalSinglePointFailures.length,
  held: result.countries.filter(country => country.verdict !== 'BROKE').map(country => country.country),
  failed: result.countries.filter(country => country.verdict === 'BROKE').map(country => country.country),
  countries: result.countries.map(country => ({
    name: country.country,
    code: country.marketId,
    demand: country.demand,
    failedPct: country.failedPercent,
    state: country.verdict === 'BROKE' ? 'UNSTABLE' : country.verdict === 'BURST' ? 'WATCH' : 'READY',
  })),
  rooms: result.facilities.map(facility => ({
    city: facility.cityLabel,
    load: facility.loadPercent / 100,
    limiting: facility.limitingFactor === 'POWER' ? 'POWER'
      : facility.limitingFactor === 'COOLING' ? 'COOLING'
        : facility.limitingFactor === 'BANDWIDTH' ? 'BANDWIDTH'
          : facility.limitingFactor === 'MAINTENANCE' ? 'CONDITION'
            : facility.limitingFactor === 'RACK_SPACE' ? 'RACK' : 'NONE',
    failedPct: facility.failedPercent,
  })),
});

const plotFor = (index: number, count: number): { x: number; y: number } => {
  const slots = [{ x: 30, y: 46 }, { x: 58, y: 38 }, { x: 48, y: 66 }, { x: 72, y: 58 }];
  return slots[Math.min(index, Math.max(0, Math.min(slots.length - 1, count - 1)))] || slots[0];
};

export const StreamingBuildWizardExperience: React.FC<StreamingBuildWizardExperienceProps> = props => {
  const {
    brand, inputs, sel, result, built, builtFacilities, onResult, onCommit,
    quoteSelection, onOpenNight, onChange, onBack, pricing, onOpenPricing,
    onOpenContent, onOpenDefine, onRaise,
  } = props;
  const absoluteWeek = inputs.absoluteWeek || 0;
  const [rehearsalSelection, setRehearsalSelection] = useState<BuildSel | null>(null);
  const baseFacilities = useMemo(() => facilitiesOf(sel), [sel]);
  const builtIds = useMemo(() => new Set((builtFacilities || []).map(facility => facility.id)), [builtFacilities]);

  const regions = useMemo<BuildData['regions']>(() => Object.entries(STREAMING_DAY_ONE_REGION_LABELS).map(([id, name]) => ({
    id,
    name,
    line: REGION_LINES[id as RegionId],
  })), []);

  const countries = useMemo<BuildData['countries']>(() => {
    const opening = new Set((inputs.markets || []).map(market => market.id));
    return STREAMING_DAY_ONE_MARKETS.map(market => ({
      id: `country:${market.id}`,
      regionId: market.regionId,
      name: market.country,
      code: market.id,
      shape: SHAPE_BY_COUNTRY[market.id] || market.id.toLowerCase(),
      opening: opening.has(market.id),
      note: market.marketNote,
    }));
  }, [inputs.markets]);

  const cities = useMemo<BuildCity[]>(() => {
    const countryByCity = new Map<string, string>();
    Object.entries(COUNTRY_CITIES).forEach(([countryId, ids]) => ids.forEach(id => countryByCity.set(id, countryId)));
    return PRODUCTION_LOCATION_CATALOG.flatMap(location => {
      const countryCode = countryByCity.get(location.id);
      if (!countryCode) return [];
      const siblings = COUNTRY_CITIES[countryCode] || [location.id];
      const market = STREAMING_DAY_ONE_MARKETS.find(item => item.id === countryCode);
      return [{
        id: location.id,
        name: location.name,
        countryId: `country:${countryCode}`,
        country: market?.country || countryCode,
        code: countryCode,
        coord: { lat: location.latitude, lng: location.longitude },
        plot: plotFor(Math.max(0, siblings.indexOf(location.id)), siblings.length),
        recommended: (inputs.recommendedPlacements || []).some(item => item.cityId === location.id)
          || (inputs.markets || []).some(item => item.recommendedCityId === location.id),
        note: location.desc,
      }];
    });
  }, [inputs.markets, inputs.recommendedPlacements]);

  const listings = useMemo<FacilityListing[]>(() => {
    const marketListings = cities.flatMap(city => getStreamingFacilityMarketplace(city.id).map(listingToBuild));
    const known = new Set(marketListings.map(listing => listing.id));
    const legacy = [...baseFacilities, ...(builtFacilities || [])]
      .filter(facility => !facility.lease || !known.has(facility.lease.listingId))
      .map(syntheticListing);
    return [...marketListings, ...legacy];
  }, [baseFacilities, builtFacilities, cities]);

  const initialDraft = useMemo<BuildDraft>(() => ({
    facilities: baseFacilities.map(facility => facilityToBuild(facility, builtIds.has(facility.id))),
    architecture: ARCH_TO_BUILD[sel.arch],
    ownedShare: sel.arch === 'CLOUD' ? .15 : sel.arch === 'OWNED' ? 1 : .6,
    doctrine: doctrineToBuild(sel.doctrine),
    campaignId: campaignToBuild(sel.campaign),
    mode: sel.managementPolicy?.mode === 'HANDS_ON' ? 'HANDS' : 'ASSISTED',
    instructions: managementToBuild(sel.managementPolicy),
    repairIds: [],
    rehearsal: null,
    override: false,
  }), [baseFacilities, builtIds, sel]);

  const canonicalFor = useCallback((draft: BuildDraft) => (
    buildSelectionFromDraft(draft, sel, absoluteWeek)
  ), [absoluteWeek, sel]);

  const data = useMemo<BuildData>(() => {
    const servicesFor = (draft: BuildDraft): CountryService[] => {
      const selection = canonicalFor(draft);
      const derived = derive(selection, { ...inputs, homeCityId: selection.placements[0]?.cityId || null });
      return derived.countryService.map(country => ({
        marketId: country.marketId,
        name: country.country,
        code: country.marketId,
        servedBy: [...country.servingCityLabels],
        role: country.role === 'CORE_ORIGIN' ? 'Main library'
          : country.role === 'REGIONAL_HUB' ? 'Region relay'
            : country.role === 'EDGE_CACHE' ? 'Fast cache' : '—',
        state: !country.cityId ? 'NONE'
          : country.quality === 'POOR' ? 'UNSTABLE'
            : country.quality === 'UNSTABLE' ? 'POOR'
              : country.quality === 'GOOD' ? 'WATCH' : 'READY',
        startupMs: country.latency || 0,
        buffering: country.bufferRisk,
        peak: country.demand,
        catalogue: country.catalogueTotalTitles > 0
          ? country.catalogueAvailableTitles / country.catalogueTotalTitles : 0,
        localization: country.localizationNote,
        fix: country.quality === 'EXCELLENT' ? undefined : country.repairLabel,
      }));
    };

    const totalsFor = (draft: BuildDraft): BuildTotals => {
      const selection = canonicalFor(draft);
      const derived = derive(selection, { ...inputs, homeCityId: selection.placements[0]?.cityId || null });
      const quote = quoteSelection?.(selection);
      return {
        racks: derived.racks,
        cities: derived.uniqueCityCount,
        capacity: quote?.baselineConcurrentStreams ?? derived.ceiling,
        burst: Math.max(0, (quote?.burstConcurrentStreams ?? derived.burstCeiling) - (quote?.baselineConcurrentStreams ?? derived.ceiling)),
        buildCost: quote?.transactionCost ?? derived.capex,
        weeklyCost: quote?.weeklyOperatingCost ?? derived.weekly,
        weeks: quote?.buildWeeks ?? derived.weeks,
        energy: Math.round((quote?.energyKwhWeekly ?? derived.energyKwhWeekly) / 1_000),
        water: Math.round((quote?.waterLitresWeekly ?? derived.waterLitresWeekly) / 1_000),
        sustainability: quote?.sustainabilityScore ?? derived.sustainabilityScore,
        reputation: quote?.publicReputation ?? derived.publicReputation,
        redundancy: derived.resilienceLabel === 'REDUNDANT' ? 'REDUNDANT'
          : derived.resilienceLabel === 'EXPOSED' ? 'EXPOSED' : 'SINGLE',
      };
    };

    const moneyFor = (draft: BuildDraft): MoneyPlan => {
      const selection = canonicalFor(draft);
      const quote = quoteSelection?.(selection);
      const derived = derive(selection, { ...inputs, homeCityId: selection.placements[0]?.cityId || null });
      const infrastructure = quote?.transactionCost ?? derived.capex;
      const campaign = CAMPAIGNS.find(item => item.id === selection.campaign)?.cost || 0;
      const lines = [
        ...(inputs.defineLaunchPaid || []).map(item => ({ ...item, locked: true, timing: 'SETTLED' as const })),
        { id: 'infra', label: 'Infrastructure commissioning', amount: infrastructure, note: `${derived.racks} racks · ${derived.uniqueCityCount} cities`, timing: 'COMMISSION' as const },
        { id: 'campaign', label: 'Opening-night campaign', amount: campaign, note: campaign ? 'Reserved for opening night' : 'No paid campaign', timing: 'OPENING_NIGHT' as const },
        { id: 'catalogue', label: 'Catalogue licences already signed', amount: inputs.catalogueSpend, note: `${inputs.catalogueTitles} titles · already settled`, locked: true, timing: 'SETTLED' as const },
        { id: 'originals', label: 'Originals already funded', amount: inputs.originalsSpend, note: `${inputs.originalsCount} commissions · already settled`, locked: true, timing: 'SETTLED' as const },
      ].filter(line => line.amount > 0 || line.id === 'campaign');
      const total = infrastructure + campaign;
      return {
        lines,
        total,
        commissionNow: infrastructure,
        deferred: campaign,
        available: inputs.treasury,
        headroom: Math.max(0, inputs.treasury - total),
        shortfall: Math.max(0, total - inputs.treasury),
      };
    };

    const canonical = {
      totals: totalsFor,
      money: moneyFor,
      services: servicesFor,
      signature: (draft: BuildDraft) => selectionKey(canonicalFor(draft)),
      rehearse: (draft: BuildDraft, scenario: Scenario) => {
        const selection = canonicalFor(draft);
        const derived = derive(selection, { ...inputs, homeCityId: selection.placements[0]?.cityId || null });
        const canonicalResult = deriveStreamingLaunchRehearsal(derived, inputs, selection, scenario);
        onResult?.(canonicalResult);
        return rehearsalToBuild(canonicalResult, selectionKey(selection));
      },
    };

    const demandById = new Map(servicesFor(initialDraft).map(service => [service.marketId, service.peak]));
    return {
      company: { name: brand.name, week: absoluteWeek, brandHex: hslToHex(brand.hue, brand.sat) },
      treasury: { available: inputs.treasury, committedLaunch: 0 },
      markets: (inputs.markets || []).map(market => {
        const location = PRODUCTION_LOCATION_CATALOG.find(item => item.id === market.recommendedCityId);
        const service = servicesFor(initialDraft).find(item => item.marketId === market.id);
        return {
          id: market.id,
          name: market.country,
          code: market.id,
          coord: { lat: location?.latitude || 0, lng: location?.longitude || 0 },
          demand: Math.max(1, (demandById.get(market.id) || Math.round(market.audience * .00018)) / .09),
          catalogue: service?.catalogue || 0,
        };
      }),
      regions,
      countries,
      cities,
      listings,
      presets: PACKAGES.map(item => ({ id: item.id.toLowerCase(), name: item.name, racks: item.racks, cities: item.cities, line: item.sub })),
      campaigns: CAMPAIGNS.map(item => ({ id: item.id.toLowerCase(), name: item.name, cost: item.cost, line: item.line, multiplier: item.demandMul })),
      spend: [],
      defineLaunchChecks: inputs.defineLaunchChecks,
      pricing: {
        model: pricing?.label || 'Pricing not configured',
        plans: pricing?.sellable || 0,
        arpu: Number.parseFloat(String(pricing?.arpu || '').replace(/[^0-9.]/g, '')) || 0,
        reach: (inputs.markets || []).reduce((sum, market) => sum + market.audience, 0),
        problems: pricing?.problems ? ['Complete pricing in Define the Launch.'] : [],
      },
      repairs: baseFacilities.flatMap(facility => {
        const view = getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh);
        const listingId = facility.lease?.listingId || `LEGACY:${facility.id}`;
        return view.repairActions.map(action => ({
          id: `${facility.id}:${action.id}`,
          facilityId: listingId,
          label: action.label,
          what: action.detail,
          cost: action.cost,
          fixes: action.id === 'UPGRADE_POWER' ? 'POWER' as const
            : action.id === 'IMPROVE_COOLING' ? 'COOLING' as const
              : action.id === 'ADD_BANDWIDTH' ? 'BANDWIDTH' as const : 'CONDITION' as const,
          weeks: action.id === 'REPLACE_EQUIPMENT' ? 2 : 3,
        }));
      }),
      team: managementToBuild(sel.managementPolicy),
      existing: (builtFacilities || []).map(facility => facilityToBuild(facility, true)),
      commissioned: Boolean(built),
      canonical,
    };
  }, [absoluteWeek, baseFacilities, brand, built, builtFacilities, canonicalFor, cities, countries, initialDraft, inputs, listings, onResult, pricing, quoteSelection, regions, sel.managementPolicy]);

  const draftWithResult = useMemo<BuildDraft>(() => {
    if (!result) return initialDraft;
    return {
      ...initialDraft,
      rehearsal: rehearsalToBuild(result, signatureOf(data, initialDraft)),
    };
  }, [data, initialDraft, result]);

  const lastSelectionKey = useRef(selectionKey(sel));
  const handleDraftChange = useCallback((draft: BuildDraft) => {
    const next = canonicalFor(draft);
    const key = selectionKey(next);
    if (key === lastSelectionKey.current) return;
    lastSelectionKey.current = key;
    onResult?.(null);
    onChange(next);
  }, [canonicalFor, onChange, onResult]);

  return (
    <>
      <BuildWizard
        data={data}
        initialDraft={draftWithResult}
        onDraftChange={handleDraftChange}
        onExit={onBack}
        onOpenStudioFinance={onRaise}
        onEditPricing={onOpenPricing}
        onOpenDefine={onOpenDefine}
        onOpenRehearsal={draft => setRehearsalSelection(canonicalFor(draft))}
        onCommission={draft => {
          const selection = canonicalFor(draft);
          const outcome = onCommit?.(selection);
          return outcome || { ok: true, message: 'Infrastructure commissioned.' };
        }}
        onOpeningNight={onOpenNight}
      />

      {rehearsalSelection && (
        <StreamingLoadRehearsalExperience
          brand={brand}
          d={derive(rehearsalSelection, {
            ...inputs,
            homeCityId: rehearsalSelection.placements[0]?.cityId || null,
          })}
          inp={inputs}
          sel={rehearsalSelection}
          onClose={() => setRehearsalSelection(null)}
          onResult={next => onResult?.(next)}
          onOpenContent={onOpenContent}
          onRepair={next => {
            onResult?.(null);
            onChange(next);
            setRehearsalSelection(null);
          }}
        />
      )}
    </>
  );
};

export default StreamingBuildWizardExperience;
