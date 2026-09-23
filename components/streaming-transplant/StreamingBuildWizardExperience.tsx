import React, { useCallback, useMemo, useRef, useState } from 'react';
import { BuildWizard } from '../studio-finance/components/build/BuildWizard';
import type {
  Architecture,
  BuildData,
  BuildDraft,
  BuildHandlers,
  BuildTotals,
  City as BuildCity,
  CloudProviderId,
  CountryService,
  Duty,
  Facility,
  FacilityListing,
  MoneyPlan,
  RehearsalResult,
  Scenario,
} from '../studio-finance/finance/build';
import {
  architectureOf,
  cloudWeeklyCost,
  fitRackGroupsToLimit,
  signatureOf,
} from '../studio-finance/finance/build';
import type {
  OwnedStreamingFacility,
  OwnedStreamingLaunchRehearsalSnapshot,
  OwnedStreamingRackGroup,
  OwnedStreamingRegionNetworkPlan,
  StreamingDefineLaunchStepId,
  StreamingInfrastructureManagementPolicy,
  StreamingRackDuty,
} from '../../types';
import {
  STREAMING_DAY_ONE_MARKETS,
  STREAMING_DAY_ONE_REGION_LABELS,
} from '../../services/streamingDayOneMarkets';
import { STREAMING_SERVER_SITES } from '../../services/streamingServerSites';
import { WORLD_COUNTRY_DEFINITIONS } from '../../services/worldEconomy/worldCountryRegistry';
import {
  createStreamingFacilityFromListing,
  getStreamingFacilityMarketplace,
  type StreamingFacilityMarketContext,
  type StreamingFacilityMarketplaceListing,
} from '../../services/streamingFacilityMarketplace';
import {
  getStreamingFacilityCapacity,
  getStreamingFacilityContract,
  getDefaultStreamingFacilityPhysical,
  getStreamingFacilitySecurityProfile,
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
import { reconstructStreamingRegionPlans } from '../../services/streamingRegionalNetworkPlan';
import {
  createCanonicalBuildData,
  type StreamingCanonicalBuildData,
  type StreamingCanonicalBuildSource,
} from '../../services/streamingCanonicalBuildData';
import { STREAMING_SERVER_TIERS } from '../../services/streamingServerTiers';
import { getStreamingServerSite } from '../../services/streamingServerSites';
import { streamingEligibleMarketFacilities } from '../../services/streamingMarketRoute';
import { createStreamingLaunchRehearsal } from '../../services/streamingLaunchRehearsal';
import {
  PACKAGES,
  PER_RACK_CEILING,
  derive,
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
import { countCompletedBudgetSteps, createLaunchBudgetSummary } from '../studio-finance/finance/budgetLinks';

export interface StreamingBuildWizardExperienceProps {
  brand: Brand;
  signatoryName?: string;
  inputs: BuildInputs;
  sel: BuildSel;
  result?: RunResult | null;
  savedRehearsal?: OwnedStreamingLaunchRehearsalSnapshot | null;
  rehearsalConfigurationSignature?: string;
  built?: Placement[] | null;
  builtFacilities?: OwnedStreamingFacility[] | null;
  construction?: { committedAtAbsoluteWeek: number; readyAtAbsoluteWeek: number } | null;
  isLive?: boolean;
  onResult?: (result: RunResult | null, selection?: BuildSel) => void;
  onCommit?: (selection: BuildSel) => BuildCommitResult | void;
  onValidateCommit?: (selection: BuildSel) => BuildCommitResult;
  onOpenNight?: () => void;
  onChange: (selection: BuildSel) => void;
  onBack: () => void;
  pricing?: { label: string; arpu: string; reach: string; problems: number; sellable: number };
  onOpenPricing?: () => void;
  onOpenContent?: () => void;
  onOpenDefine?: (step: StreamingDefineLaunchStepId) => void;
  onOpenLaunchBudget?: () => void;
  initialSheet?: 'money' | 'build' | null;
  launchBudget?: {
    plannedSpend: number;
    committedSpend: number;
    paidSpend: number;
  };
  launchBlueprintSaved?: boolean;
  funding?: { borrowed: number; soldPct: number; own: number };
  onRaise?: () => void;
  marketing?: BuildData['marketing'];
  onChangeMarketing?: BuildHandlers['onChangeMarketing'];
  /** Explicitly allows isolated fixture data. Saved careers never use UI fallbacks. */
  canonicalSource?: StreamingCanonicalBuildSource;
  /** Read-only S0 audit tap; omitted in normal gameplay. */
  onProjectionDiagnostic?: (snapshot: {
    coverage: StreamingCanonicalBuildData['coverage']['countries'];
    services: Array<Partial<CountryService>>;
  }) => void;
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

const engineeringFromListing = (listing: StreamingFacilityMarketplaceListing): NonNullable<FacilityListing['engineering']> => {
  const physical = getDefaultStreamingFacilityPhysical(listing.facilityType, 1, listing);
  const security = getStreamingFacilitySecurityProfile(listing.securityGrade);
  return {
    powerContractKw: physical.powerContractKw,
    backupPowerKw: physical.backupPowerKw,
    backupPowerMode: physical.backupPowerMode,
    coolingCapacityKw: physical.coolingCapacityKw,
    coolingMode: physical.coolingMode === 'DIRECT_LIQUID' ? 'Direct liquid'
      : physical.coolingMode === 'IMMERSION' ? 'Immersion' : 'Air',
    committedBandwidthMbps: physical.bandwidthMbps,
    burstBandwidthMbps: physical.burstBandwidthMbps,
    securityRiskReductionPercent: Math.round((1 - security.incidentRiskMultiplier) * 100),
    securityRecoveryImprovementPercent: Math.round((1 - security.recoveryMultiplier) * 100),
  };
};

export const listingToBuild = (listing: StreamingFacilityMarketplaceListing): FacilityListing => ({
  id: listing.listingId,
  cityId: listing.cityId,
  provider: listing.providerName,
  name: listing.facilityName,
  facilityType: listing.facilityType,
  type: getStreamingFacilityContract(listing.facilityType).name,
  description: listing.description,
  purchasePrice: listing.purchasePrice,
  tenures: listing.tenures,
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
  engineering: engineeringFromListing(listing),
});

const syntheticListing = (facility: OwnedStreamingFacility): FacilityListing => {
  const contract = getStreamingFacilityContract(facility.type);
  const city = getStreamingServerSite(facility.cityId);
  const physical = getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh);
  return {
    id: `LEGACY:${facility.id}`,
    cityId: facility.cityId,
    provider: facility.lease?.providerName || 'Existing company contract',
    name: contract.name,
    facilityType: facility.type,
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
    note: city ? `${city.name} · ${city.tier === 1 ? 'carrier hotel' : city.tier === 2 ? 'regional hub' : 'edge site'}` : 'A facility preserved from the company save.',
    availability: 'AVAILABLE',
    engineering: {
      powerContractKw: physical.state.powerContractKw,
      backupPowerKw: physical.state.backupPowerKw,
      backupPowerMode: physical.state.backupPowerMode,
      coolingCapacityKw: physical.state.coolingCapacityKw,
      coolingMode: physical.state.coolingMode === 'DIRECT_LIQUID' ? 'Direct liquid'
        : physical.state.coolingMode === 'IMMERSION' ? 'Immersion' : 'Air',
      committedBandwidthMbps: physical.state.bandwidthMbps,
      burstBandwidthMbps: physical.state.burstBandwidthMbps,
      securityRiskReductionPercent: Math.round((1 - physical.securityIncidentRiskMultiplier) * 100),
      securityRecoveryImprovementPercent: Math.round((1 - physical.securityRecoveryMultiplier) * 100),
    },
  };
};

const facilityToBuild = (facility: OwnedStreamingFacility, built: boolean): Facility => {
  const groups = normalizeStreamingRackGroups(facility.rackGroups, facility.id, facility.installedRacks, facility.role);
  const physical = getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh);
  const projectedGroups = groups.map(group => {
    const duty = DUTY_FROM_GAME[getProjectedRackDuty(group)];
    const rule = getStreamingRackDutyRule(getProjectedRackDuty(group));
    const serverTier = group.serverTier || 'WORKHORSE';
    return {
      id: group.id,
      name: group.name,
      duty,
      racks: group.rackCount,
      capacity: Math.round(group.rackCount * PER_RACK_CEILING * rule.capacityMultiplier * STREAMING_SERVER_TIERS[serverTier].compute),
      tier: serverTier,
    };
  });
  return {
    id: facility.id,
    listingId: facility.lease?.listingId || `LEGACY:${facility.id}`,
    cityId: facility.cityId,
    tenure: facility.lease?.tenure,
    provider: facility.lease?.cloudProvider as CloudProviderId | undefined,
    cloudExtended: facility.lease?.cloudExtendedCompute,
    built,
    groups: fitRackGroupsToLimit(projectedGroups, getStreamingFacilityCapacity(facility)),
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
  marketContext?: StreamingFacilityMarketContext,
  source: StreamingCanonicalBuildSource = 'CAREER',
): OwnedStreamingFacility | null => {
  const current = existing.find(item => item.id === draftFacility.id);
  if (current) return current;
  const listing = getStreamingFacilityMarketplace(draftFacility.cityId, marketContext)
    .find(item => item.listingId === draftFacility.listingId);
  if (!listing) {
    if (source !== 'LAB') {
      throw new Error(`Career Build cannot resolve canonical facility listing ${draftFacility.listingId}.`);
    }
    return migratePlacementsToStreamingFacilities([{
      cityId: draftFacility.cityId,
      racks: Math.max(1, draftFacility.groups.reduce((sum, group) => sum + group.racks, 0)),
      role: 'EDGE_CACHE',
    }])[0] || null;
  }
  return {
    ...createStreamingFacilityFromListing(
      listing,
      existing,
      'EDGE_CACHE',
      1,
      draftFacility.tenure ?? 'RENTED',
      marketContext?.absoluteWeek,
    ),
    id: draftFacility.id,
  };
};

export const buildSelectionFromDraft = (
  draft: BuildDraft,
  base: BuildSel,
  absoluteWeek: number,
  marketContextByCityId: Record<string, StreamingFacilityMarketContext> = {},
  source: StreamingCanonicalBuildSource = 'CAREER',
): BuildSel => {
  const originalFacilities = facilitiesOf(base);
  const facilities = draft.facilities.flatMap(draftFacility => {
    const baseFacility = selectBaseFacility(draftFacility, originalFacilities, marketContextByCityId[draftFacility.cityId], source);
    if (!baseFacility) return [];
    const fittedGroups = fitRackGroupsToLimit(draftFacility.groups, getStreamingFacilityCapacity(baseFacility));
    const rackGroups: OwnedStreamingRackGroup[] = fittedGroups
      .filter(group => group.racks > 0)
      .map(group => ({
        id: group.id,
        name: group.name,
        rackCount: group.racks,
        duty: DUTY_TO_GAME[group.duty],
        serverTier: group.tier || 'WORKHORSE',
      }));
    if (!rackGroups.length) return [];
    let next: OwnedStreamingFacility = {
      ...baseFacility,
      id: draftFacility.id,
      installedRacks: rackGroups.reduce((sum, group) => sum + group.rackCount, 0),
      rackGroups,
      role: projectFacilityNetworkRole(rackGroups),
    };
    if (draftFacility.tenure === 'CLOUD' && next.lease) {
      next = {
        ...next,
        lease: {
          ...next.lease,
          tenure: 'CLOUD',
          weeklyRent: cloudWeeklyCost(draftFacility),
          depositCost: 0,
          setupCost: 0,
          cloudProvider: draftFacility.provider,
          cloudExtendedCompute: draftFacility.cloudExtended,
        },
      };
    }
    draft.repairIds.forEach(repairId => {
      const [facilityId, action] = repairId.split(':');
      if (facilityId !== draftFacility.id) return;
      if (!['UPGRADE_POWER', 'IMPROVE_COOLING', 'ADD_BANDWIDTH', 'REPLACE_EQUIPMENT'].includes(action)) return;
      next = applyStreamingFacilityRepair(next, action as StreamingFacilityRepairAction, absoluteWeek).facility;
    });
    return [next];
  });
  const selection = selectionWithFacilities({
    ...base,
    arch: ARCH_TO_GAME[architectureOf(draft)],
    doctrine: 'STANDARD',
    campaign: campaignToGame(draft.campaignId),
    managementPolicy: managementToGame(draft),
    assistedPlanApproved: Boolean(draft.teamPlanApproved),
    assistedPlanClass: draft.teamPlanClass,
  }, facilities);
  return {
    ...selection,
    regionPlans: reconstructStreamingRegionPlans(facilities),
  };
};

const selectionKey = (selection: BuildSel): string => JSON.stringify({
  arch: selection.arch,
  doctrine: selection.doctrine,
  campaign: selection.campaign,
  managementPolicy: selection.managementPolicy,
  assistedPlanApproved: selection.assistedPlanApproved,
  assistedPlanClass: selection.assistedPlanClass,
  regionPlans: selection.regionPlans,
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

export const rehearsalSnapshotToBuild = (
  snapshot: OwnedStreamingLaunchRehearsalSnapshot,
  signature: string,
  cityNameById: ReadonlyMap<string, string>,
  expectedCanonicalSignature = snapshot.configurationSignature,
): RehearsalResult | null => expectedCanonicalSignature !== snapshot.configurationSignature ? null : ({
  signature,
  scenario: snapshot.scenario,
  verdict: snapshot.verdict === 'BURST' ? 'RENTED' : snapshot.verdict,
  peak: snapshot.peakConcurrentStreams,
  capacity: snapshot.steadyCapacity,
  spare: Math.max(0, snapshot.steadyCapacity + snapshot.burstCapacity - snapshot.peakConcurrentStreams),
  failedPct: snapshot.failedPercent,
  catalogue: snapshot.catalogueAvailabilityPercent / 100,
  spof: snapshot.regionalSinglePointFailures.length,
  held: snapshot.countries.filter(country => country.verdict !== 'BROKE').map(country => country.country),
  failed: snapshot.countries.filter(country => country.verdict === 'BROKE').map(country => country.country),
  countries: snapshot.countries.map(country => ({
    name: country.country,
    code: country.marketId,
    demand: country.demand,
    failedPct: country.failedPercent,
    state: country.verdict === 'BROKE' ? 'UNSTABLE' : country.verdict === 'BURST' ? 'WATCH' : 'READY',
  })),
  rooms: snapshot.facilities.map(facility => ({
    city: cityNameById.get(facility.cityId) || facility.cityId,
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
    brand, inputs, sel, result, savedRehearsal, built, builtFacilities, onResult, onCommit,
    onOpenNight, onChange, onBack, pricing, onOpenPricing,
    onOpenContent, onOpenDefine, onOpenLaunchBudget, onRaise, marketing, onChangeMarketing,
  } = props;
  const canonicalSource = props.canonicalSource || 'CAREER';
  const absoluteWeek = inputs.absoluteWeek || 0;
  const [rehearsalRun, setRehearsalRun] = useState<{ draft: BuildDraft; selection: BuildSel } | null>(null);
  const baseFacilities = useMemo(() => facilitiesOf(sel), [sel]);
  const builtIds = useMemo(() => new Set((builtFacilities || []).map(facility => facility.id)), [builtFacilities]);

  const regions = useMemo<BuildData['regions']>(() => Object.entries(STREAMING_DAY_ONE_REGION_LABELS).map(([id, name]) => ({
    id,
    name,
    line: REGION_LINES[id as RegionId],
  })), []);

  const countries = useMemo<BuildData['countries']>(() => {
    const opening = new Set((inputs.markets || []).map(market => market.id));
    const dayOneById = new Map(STREAMING_DAY_ONE_MARKETS.map(market => [market.id, market]));
    const fromRegistry = WORLD_COUNTRY_DEFINITIONS.map(country => {
      const market = dayOneById.get(country.id);
      return {
        id: `country:${country.id}`,
        regionId: country.regionId,
        name: country.name,
        code: country.id,
        shape: SHAPE_BY_COUNTRY[country.id] || country.id.toLowerCase(),
        opening: opening.has(country.id),
        note: market?.marketNote || `${country.name} network market.`,
      };
    });
    const known = new Set(fromRegistry.map(country => country.code));
    const serverTerritories = STREAMING_SERVER_SITES
      .filter(site => !known.has(site.countryCode))
      .filter((site, index, all) => all.findIndex(other => other.countryCode === site.countryCode) === index)
      .map(site => ({
        id: `country:${site.countryCode}`,
        regionId: site.regionId as string,
        name: site.countryCode,
        code: site.countryCode,
        shape: site.countryCode.toLowerCase(),
        opening: opening.has(site.countryCode),
        note: 'Infrastructure territory.',
      }));
    return [...fromRegistry, ...serverTerritories];
  }, [inputs.markets]);

  const cities = useMemo<BuildCity[]>(() => {
    const recommended = new Set([
      ...(inputs.recommendedPlacements || []).map(item => item.cityId),
      ...(inputs.markets || []).map(item => item.recommendedCityId).filter(Boolean) as string[],
    ]);
    const perCountry = new Map<string, number>();
    return STREAMING_SERVER_SITES.map(site => {
      const index = perCountry.get(site.countryCode) ?? 0;
      perCountry.set(site.countryCode, index + 1);
      const siblings = STREAMING_SERVER_SITES.filter(other => other.countryCode === site.countryCode).length;
      return {
        id: site.id,
        name: site.name,
        countryId: `country:${site.countryCode}`,
        country: site.countryCode,
        code: site.countryCode,
        coord: { lat: site.latitude, lng: site.longitude },
        plot: plotFor(index, siblings),
        recommended: recommended.has(site.id),
        note: site.tier === 1
          ? `A carrier hotel. Deep fibre, ${site.powerPricePerKwh}c power, and regional reach.`
          : site.tier === 2
            ? `A regional hub with ${site.powerPricePerKwh}c power.`
            : `A local edge site with ${site.powerPricePerKwh}c power.`,
      };
    });
  }, [inputs.markets, inputs.recommendedPlacements]);

  const marketContextByCityId = useMemo<Record<string, StreamingFacilityMarketContext>>(() => Object.fromEntries(
    cities.flatMap(city => {
      const context = inputs.facilityMarketContextByCountryId?.[city.code];
      return context ? [[city.id, context]] : [];
    }),
  ), [cities, inputs.facilityMarketContextByCountryId]);

  const listings = useMemo<FacilityListing[]>(() => {
    const marketListings = cities.flatMap(city => getStreamingFacilityMarketplace(city.id, marketContextByCityId[city.id]).map(listingToBuild));
    const known = new Set(marketListings.map(listing => listing.id));
    const legacy = [...baseFacilities, ...(builtFacilities || [])]
      .filter(facility => !facility.lease || !known.has(facility.lease.listingId))
      .map(syntheticListing);
    return [...marketListings, ...legacy];
  }, [baseFacilities, builtFacilities, cities, marketContextByCityId]);

  const initialDraft = useMemo<BuildDraft>(() => ({
    facilities: baseFacilities.map(facility => facilityToBuild(facility, builtIds.has(facility.id))),
    architecture: ARCH_TO_BUILD[sel.arch],
    ownedShare: sel.arch === 'CLOUD' ? .15 : sel.arch === 'OWNED' ? 1 : .6,
    doctrine: 'STANDARD',
    campaignId: campaignToBuild(sel.campaign),
    mode: 'HANDS',
    instructions: managementToBuild(sel.managementPolicy),
    repairIds: [],
    rehearsal: null,
    override: false,
    teamPlanApproved: false,
    teamPlanClass: undefined,
  }), [baseFacilities, builtIds, sel]);

  const canonicalFor = useCallback((draft: BuildDraft) => (
    buildSelectionFromDraft(draft, sel, absoluteWeek, marketContextByCityId, canonicalSource)
  ), [absoluteWeek, canonicalSource, marketContextByCityId, sel]);

  const data = useMemo<BuildData>(() => {
    const projectionCache = new WeakMap<BuildDraft, { selection: BuildSel; build: StreamingCanonicalBuildData }>();
    const projectionFor = (draft: BuildDraft) => {
      const cached = projectionCache.get(draft);
      if (cached) return cached;
      const selection = canonicalFor(draft);
      const facilities = facilitiesOf(selection);
      const regionPlans: OwnedStreamingRegionNetworkPlan[] = selection.regionPlans?.length
        ? selection.regionPlans.map(plan => ({ ...plan, serverCounts: { ...plan.serverCounts } }))
        : reconstructStreamingRegionPlans(facilities);
      const likelyDemand = inputs.openingDemandForecast?.likely
        ?? Math.round((inputs.markets || []).reduce((sum, market) => sum + market.audience, 0) * .00018 * inputs.audienceMul);
      const build = createCanonicalBuildData({
        source: canonicalSource,
        regionPlans,
        facilities,
        openingCountryIds: (inputs.markets || []).map(market => market.id),
        forecastConcurrentStreams: likelyDemand,
        absoluteWeek,
        fibreState: inputs.fibreState,
        demandState: inputs.openingDemandForecast || { likely: likelyDemand },
        pricingState: {
          model: pricing?.label,
          arpu: pricing?.arpu,
          plans: pricing?.sellable,
          marketing: marketing?.forecast.signature,
        },
        repairs: draft.repairIds,
      });
      const result = { selection, build };
      projectionCache.set(draft, result);
      return result;
    };

    const servicesFor = (draft: BuildDraft): CountryService[] => {
      const { build } = projectionFor(draft);
      const coverageById = new Map(build.coverage.countries.map(country => [country.countryId, country]));
      const signalById = new Map(build.signals.marketSignals.map(signal => [signal.countryId, signal]));
      const totalAudience = Math.max(1, (inputs.markets || []).reduce((sum, market) => sum + market.audience, 0));
      const likelyDemand = Math.max(1, inputs.openingDemandForecast?.likely
        ?? Math.round(totalAudience * .00018 * inputs.audienceMul));
      const demandByMarket = new Map<string, number>((inputs.markets || []).map(market => [
        market.id,
        inputs.openingDemandForecast?.byMarket?.[market.id]
          ?? Math.round(likelyDemand * market.audience / totalAudience),
      ]));
      const demandByRegion = new Map<string, number>();
      for (const market of inputs.markets || []) {
        demandByRegion.set(market.region,
          (demandByRegion.get(market.region) || 0) + (demandByMarket.get(market.id) || 0));
      }
      const capacityByFacilityId = new Map(build.capacity.facilities.map(item => [item.facilityId, item]));
      const steadyByRegion = new Map<string, number>();
      for (const facility of build.facilities) {
        const regionId = getStreamingServerSite(facility.cityId)?.regionId;
        if (!regionId) continue;
        steadyByRegion.set(regionId, (steadyByRegion.get(regionId) || 0)
          + (capacityByFacilityId.get(facility.id)?.steadyStreams || 0));
      }
      const totalTitles = Math.max(0, inputs.catalogueTitles);
      const rights = inputs.catalogueRights;
      const globalTitles = Math.max(
        rights?.globalTitleCount || 0,
        rights?.licensedTitles.filter(title => title.territory === 'GLOBAL').length || 0,
      );
      const multiRegionTitles = rights?.licensedTitles.filter(title => title.territory === 'MULTI_REGION').length || 0;
      const domesticTitles = rights?.licensedTitles.filter(title => title.territory === 'DOMESTIC').length || 0;
      const services = (inputs.markets || []).map(market => {
        const coverage = coverageById.get(market.id);
        const signal = signalById.get(market.id);
        const reachedShare = coverage?.reachedShare || 0;
        const serving = streamingEligibleMarketFacilities(build.facilities, market.id, market.region, reachedShare);
        const servedBy = Array.from(new Set(serving.map(facility => getStreamingServerSite(facility.cityId)?.name || facility.cityId)));
        const primaryRole = serving[0]?.role;
        const marketDemand = demandByMarket.get(market.id) || 0;
        const regionalDemand = demandByRegion.get(market.region) || 0;
        const regionalSteady = steadyByRegion.get(market.region) || 0;
        const capacityShare = regionalDemand > 0 ? Math.min(1, regionalSteady / regionalDemand) : 0;
        const coveredShare = Math.min(reachedShare, (coverage?.coveredShare || 0) * capacityShare);
        const cloudServedShare = Math.min(coveredShare, (coverage?.cloudServedShare || 0) * capacityShare);
        const overloaded = regionalDemand > regionalSteady;
        const state: CountryService['state'] = !coverage || regionalSteady <= 0 || reachedShare <= 0
          ? 'NONE'
          : overloaded || coveredShare < .25 ? 'UNSTABLE'
            : coveredShare < .6 ? 'POOR'
              : coveredShare < .9 || signal?.state === 'WATCH' ? 'WATCH' : 'READY';
        const clearedTitles = Math.min(totalTitles, globalTitles + multiRegionTitles
          + (rights?.primaryMarketId === market.id ? domesticTitles : 0));
        return {
          marketId: market.id,
          name: market.country,
          code: market.id,
          servedBy,
          role: primaryRole === 'CORE_ORIGIN' ? 'Main library'
            : primaryRole === 'REGIONAL_HUB' ? 'Region relay'
              : primaryRole === 'EDGE_CACHE' ? 'Fast cache' : '—',
          state,
          startupMs: reachedShare > 0 ? Math.round(180 + (1 - reachedShare) * 1_200) : 0,
          buffering: Math.min(100, Math.round((1 - coveredShare) * 20 + (overloaded ? 35 : 0))),
          peak: marketDemand,
          reachedShare,
          coveredShare,
          geographicCoveredShare: coverage?.coveredShare,
          coveredPeak: Math.round(marketDemand * coveredShare),
          cloudServedShare,
          catalogue: totalTitles > 0 ? clearedTitles / totalTitles : 0,
          localization: market.localizationNote,
          fix: state === 'READY' ? undefined
            : state === 'NONE' ? `Add a serving room inside ${market.region.replace(/_/g, ' ').toLowerCase()}`
              : overloaded ? 'Add server compute in this region before opening night'
                : 'Increase regional reach or fibre',
        };
      });
      props.onProjectionDiagnostic?.({ coverage: build.coverage.countries, services });
      return services;
    };

    const totalsFor = (draft: BuildDraft): BuildTotals => {
      const { build } = projectionFor(draft);
      const physicalViews = build.facilities.map(facility => getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh));
      const average = (values: number[]) => values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;
      return {
        racks: build.quote.totals.racks,
        compute: build.quote.totals.compute,
        cities: build.quote.totals.cities,
        buildingCities: new Set(build.facilities.filter(facility => facility.type !== 'CLOUD_ALLOCATION').map(facility => facility.cityId)).size,
        capacity: build.capacity.steadyStreams,
        burst: Math.max(0, build.capacity.burstStreams - build.capacity.steadyStreams),
        buildCost: build.quote.totals.dueNow,
        weeklyCost: build.quote.totals.weeklyTotal,
        weeks: build.schedule.weeks,
        energy: Math.round(physicalViews.reduce((sum, view) => sum + view.energyKwhWeekly, 0) / 1_000),
        water: Math.round(physicalViews.reduce((sum, view) => sum + view.waterLitresWeekly, 0) / 1_000),
        sustainability: average(physicalViews.map(view => view.sustainabilityScore)),
        reputation: average(physicalViews.map(view => view.publicReputation)),
        redundancy: build.capacity.redundancy,
      };
    };

    const moneyFor = (draft: BuildDraft): MoneyPlan => {
      const { build } = projectionFor(draft);
      const infrastructure = build.quote.totals.dueNow;
      const campaign = marketing?.draft.budgetCeiling || 0;
      const lines = [
        ...(inputs.defineLaunchPaid || []).map(item => ({ ...item, locked: true, timing: 'SETTLED' as const })),
        { id: 'network-capex', label: 'Servers and owned property', amount: build.quote.totals.capex, note: `${build.quote.totals.racks} racks · ${build.quote.totals.compute} compute`, timing: 'COMMISSION' as const },
        { id: 'network-deposits', label: 'Facility deposits', amount: build.quote.totals.deposits, note: `${build.quote.totals.rooms} rooms · ${build.quote.totals.cities} cities`, timing: 'COMMISSION' as const },
        { id: 'network-setup', label: 'Commissioning and setup', amount: build.quote.totals.setup, note: `${build.schedule.weeks} weeks to build`, timing: 'COMMISSION' as const },
        { id: 'campaign', label: 'Launch marketing ceiling', amount: campaign, note: campaign ? 'Reserved and spent across construction' : 'Organic launch', timing: 'OPENING_NIGHT' as const },
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

    const runRehearsalFor = (draft: BuildDraft, scenario: Scenario) => {
      const { build } = projectionFor(draft);
      const services = servicesFor(draft);
      const scenarioMultiplier = scenario === 'QUIET' ? .55 : scenario === 'SURGE' ? 1.9 : 1;
      return createStreamingLaunchRehearsal({
        scenario,
        rolloutRiskPercent: 0,
        countries: services.map(service => {
          const market = (inputs.markets || []).find(item => item.id === service.marketId);
          const coverage = build.coverage.countries.find(item => item.countryId === service.marketId);
          const routeFacilities = market
            ? streamingEligibleMarketFacilities(build.facilities, market.id, market.region, coverage?.reachedShare || 0)
            : [];
          return {
            marketId: service.marketId,
            country: service.name,
            regionId: market?.region || '',
            regionLabel: STREAMING_DAY_ONE_REGION_LABELS[market?.region || 'NORTH_AMERICA'],
            demand: Math.round(service.peak * scenarioMultiplier),
            latencyMs: service.startupMs || null,
            cacheHitPercent: Math.round((coverage?.reachedShare || 0) * 100),
            baseBufferingRiskPercent: service.buffering,
            routeFacilityIds: routeFacilities.map(facility => facility.id),
            servingCityLabels: service.servedBy,
            recommendedCityId: market?.recommendedCityId || '',
            localizationNote: service.localization,
            catalogueAvailableTitles: Math.round(service.catalogue * inputs.catalogueTitles),
            catalogueTotalTitles: inputs.catalogueTitles,
          };
        }),
        facilities: build.facilities.map(facility => {
          const site = getStreamingServerSite(facility.cityId);
          const capacity = build.capacity.facilities.find(item => item.facilityId === facility.id);
          const physical = getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh);
          return {
            facilityId: facility.id,
            cityId: facility.cityId,
            cityLabel: site?.name || facility.cityId,
            regionId: site?.regionId || '',
            steadyCapacity: capacity?.steadyStreams || 0,
            burstCapacity: capacity?.burstStreams || 0,
            reliabilityPercent: physical.reliabilityPercent,
            limitingFactor: capacity?.limiting === 'FIBRE' ? 'BANDWIDTH' : capacity?.limiting || 'NONE',
            physicalRepairActions: physical.repairActions.map(action => ({
              id: action.id,
              label: action.label,
              cost: action.cost,
            })),
          };
        }),
      });
    };

    const canonical = {
      facilities: (draft: BuildDraft): Facility[] => {
        const { build } = projectionFor(draft);
        const capacityByFacilityId = new Map(build.capacity.facilities.map(facility => [facility.facilityId, facility]));
        return build.facilities.map(facility => {
          const projected = facilityToBuild(facility, builtIds.has(facility.id));
          const canonicalCapacity = capacityByFacilityId.get(facility.id);
          if (!canonicalCapacity) return projected;
          const rawCapacity = projected.groups.reduce((sum, group) => sum + group.capacity, 0);
          const capacityScale = rawCapacity > 0 ? canonicalCapacity.steadyStreams / rawCapacity : 0;
          return {
            ...projected,
            groups: projected.groups.map(group => ({
              ...group,
              capacity: Math.round(group.capacity * capacityScale),
            })),
          };
        });
      },
      quote: (draft: BuildDraft) => projectionFor(draft).build.quote,
      totals: totalsFor,
      money: moneyFor,
      services: servicesFor,
      signature: (draft: BuildDraft) => `${projectionFor(draft).build.signature}/${marketing?.forecast.signature || 'organic'}`,
      runRehearsal: runRehearsalFor,
      rehearse: (draft: BuildDraft, scenario: Scenario) => {
        const { build } = projectionFor(draft);
        const canonicalResult = runRehearsalFor(draft, scenario);
        return rehearsalToBuild(canonicalResult, `${build.signature}/${marketing?.forecast.signature || 'organic'}`);
      },
    };

    const demandById = new Map(servicesFor(initialDraft).map(service => [service.marketId, service.peak]));
    return {
      company: {
        name: brand.name,
        week: absoluteWeek,
        brandHex: hslToHex(brand.hue, brand.sat),
        signatoryName: props.signatoryName,
      },
      treasury: {
        available: inputs.treasury,
        committedLaunch: (inputs.defineLaunchPaid || []).reduce((sum, item) => sum + item.amount, 0)
          + inputs.catalogueSpend + inputs.originalsSpend,
      },
      hasExplicitOpeningMarkets: inputs.hasExplicitOpeningMarkets !== false && Boolean(inputs.markets?.length),
      marketPlanning: inputs.marketPlanning,
      openingDemand: inputs.openingDemandForecast ? {
        low: inputs.openingDemandForecast.low,
        likely: inputs.openingDemandForecast.likely,
        high: inputs.openingDemandForecast.high,
      } : undefined,
      markets: (inputs.markets || []).map(market => {
        const location = getStreamingServerSite(market.recommendedCityId);
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
      campaigns: [],
      marketing,
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
      canonicalMode: canonicalSource === 'CAREER' ? 'CAREER' : 'FIXTURE',
      construction: props.construction ? {
        committedAtWeek: props.construction.committedAtAbsoluteWeek,
        readyAtWeek: props.construction.readyAtAbsoluteWeek,
      } : undefined,
      canonical,
    };
  }, [absoluteWeek, baseFacilities, brand, built, builtFacilities, canonicalFor, canonicalSource, cities, countries, initialDraft, inputs, listings, marketing, pricing, props.construction, props.signatoryName, regions, sel.managementPolicy]);

  const draftWithResult = useMemo<BuildDraft>(() => {
    if (!result && !savedRehearsal) return initialDraft;
    const canonicalEvidenceRequired = props.rehearsalConfigurationSignature !== undefined;
    return {
      ...initialDraft,
      rehearsal: result && !canonicalEvidenceRequired
        ? rehearsalToBuild(result, signatureOf(data, initialDraft))
        : savedRehearsal ? rehearsalSnapshotToBuild(
          savedRehearsal,
          signatureOf(data, initialDraft),
          new Map(cities.map(city => [city.id, city.name])),
          props.rehearsalConfigurationSignature,
        ) : null,
    };
  }, [cities, data, initialDraft, result, savedRehearsal, props.rehearsalConfigurationSignature]);

  const launchBudgetSummary = useMemo(() => {
    const checks = data.defineLaunchChecks || [];
    const knownSubtotal = (props.launchBudget?.plannedSpend || 0)
      + (props.launchBudget?.committedSpend || 0)
      + (props.launchBudget?.paidSpend || 0);
    const paidAmount = props.launchBudget?.paidSpend || data.treasury.committedLaunch;
    return createLaunchBudgetSummary({
      completedStages: countCompletedBudgetSteps(checks),
      totalStages: 7,
      knownSubtotal,
      paidAmount,
      dueAmount: Math.max(0, knownSubtotal - paidAmount),
      blueprintSaved: Boolean(props.launchBlueprintSaved),
      live: Boolean(props.isLive),
    });
  }, [data.defineLaunchChecks, data.treasury.committedLaunch, props.isLive, props.launchBlueprintSaved, props.launchBudget]);

  // The BuildDraft adapter normalizes an untouched selection (for example its
  // management policy). Compare against that projection, not the raw input,
  // or simply opening Build writes a new draft before the player acts.
  const lastSelectionKey = useRef<string | null>(null);
  if (lastSelectionKey.current === null) {
    lastSelectionKey.current = selectionKey(canonicalFor(initialDraft));
  }
  const handleDraftChange = useCallback((draft: BuildDraft) => {
    if (inputs.marketPlanning?.editable === false) return;
    const next = canonicalFor(draft);
    const key = selectionKey(next);
    if (key === lastSelectionKey.current) return;
    lastSelectionKey.current = key;
    onResult?.(null);
    onChange(next);
  }, [canonicalFor, inputs.marketPlanning?.editable, onChange, onResult]);
  const rehearsalForecastFor = useCallback((scenario: Scenario) => {
    if (!rehearsalRun) throw new Error('Career Build rehearsal opened without a draft.');
    const run = data.canonical?.runRehearsal?.(rehearsalRun.draft, scenario);
    if (!run) throw new Error('Career Build is missing its canonical rehearsal handlers.');
    return run;
  }, [data.canonical, rehearsalRun]);

  return (
    <>
      <BuildWizard
        data={data}
        initialDraft={draftWithResult}
        initialSheet={props.initialSheet}
        launchBudgetSummary={launchBudgetSummary}
        onDraftChange={handleDraftChange}
        onExit={onBack}
        onOpenStudioFinance={onRaise}
        onEditPricing={onOpenPricing}
        onOpenDefine={onOpenDefine}
        onOpenLaunchBudget={onOpenLaunchBudget}
        onOpenRehearsal={draft => {
          if (inputs.marketPlanning?.editable === false) return;
          setRehearsalRun({ draft, selection: canonicalFor(draft) });
        }}
        onValidateCommission={draft => inputs.marketPlanning?.editable === false
          ? { ok: false, message: inputs.marketPlanning.reason || 'File an opening market first.' }
          : props.onValidateCommit?.(canonicalFor(draft))}
        onCommission={draft => {
          if (inputs.marketPlanning?.editable === false) return { ok: false, message: inputs.marketPlanning.reason || 'File an opening market first.' };
          const selection = canonicalFor(draft);
          const outcome = onCommit?.(selection);
          return outcome || { ok: true, message: 'Infrastructure commissioned.' };
        }}
        onOpeningNight={onOpenNight}
        onChangeMarketing={onChangeMarketing}
      />

      {rehearsalRun && (
        <StreamingLoadRehearsalExperience
          brand={brand}
          d={derive(rehearsalRun.selection, {
            ...inputs,
            homeCityId: rehearsalRun.selection.placements[0]?.cityId || null,
          })}
          inp={inputs}
          sel={rehearsalRun.selection}
          forecastFor={rehearsalForecastFor}
          onClose={() => setRehearsalRun(null)}
          onResult={next => onResult?.(next, rehearsalRun.selection)}
          onOpenContent={onOpenContent}
          onRepair={next => {
            onResult?.(null);
            onChange(next);
            setRehearsalRun(null);
          }}
        />
      )}
    </>
  );
};

export default StreamingBuildWizardExperience;
