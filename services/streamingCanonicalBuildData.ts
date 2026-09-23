import type {
  OwnedStreamingFacility,
  OwnedStreamingNetworkPlacement,
  OwnedStreamingRegionNetworkPlan,
} from '../types';
import type { StreamingFibreState } from './streamingFibreLadder';
import {
  deriveStreamingRegionalPlacement,
  reconstructStreamingRegionPlans,
} from './streamingRegionalNetworkPlan';
import {
  deriveStreamingNetworkCoverage,
  type StreamingNetworkCoverage,
} from './streamingNetworkCoverage';
import {
  deriveStreamingNetworkCapacity,
  type StreamingNetworkCapacity,
} from './streamingNetworkCapacity';
import {
  deriveStreamingNetworkSignals,
  type StreamingNetworkSignals,
} from './streamingNetworkSignals';
import {
  deriveStreamingInfrastructureSignature,
  quoteStreamingNetworkPlan,
  type StreamingNetworkQuote,
} from './streamingNetworkQuote';
import {
  deriveStreamingConstructionSchedule,
  type StreamingConstructionSchedule,
} from './streamingNetworkConstruction';

export type StreamingCanonicalBuildSource = 'LAB' | 'CAREER';

export interface StreamingCanonicalBuildInput {
  source: StreamingCanonicalBuildSource;
  regionPlans?: readonly OwnedStreamingRegionNetworkPlan[];
  facilities?: readonly OwnedStreamingFacility[];
  openingCountryIds: readonly string[];
  forecastConcurrentStreams: number;
  absoluteWeek: number;
  fibreState?: StreamingFibreState;
  demandState?: unknown;
  pricingState?: unknown;
  repairs?: unknown;
}

export interface StreamingCanonicalBuildData {
  regionPlans: OwnedStreamingRegionNetworkPlan[];
  facilities: OwnedStreamingFacility[];
  placements: OwnedStreamingNetworkPlacement[];
  placementWarnings: Array<{ regionId: string; code: string; message: string }>;
  coverage: StreamingNetworkCoverage;
  capacity: StreamingNetworkCapacity;
  signals: StreamingNetworkSignals;
  quote: StreamingNetworkQuote;
  schedule: StreamingConstructionSchedule;
  signature: string;
}

const clonePlans = (plans: readonly OwnedStreamingRegionNetworkPlan[]): OwnedStreamingRegionNetworkPlan[] => (
  plans.map(plan => ({
    ...plan,
    serverCounts: { ...plan.serverCounts },
  }))
);

const cloneFacilities = (facilities: readonly OwnedStreamingFacility[]): OwnedStreamingFacility[] => (
  facilities.map(facility => ({
    ...facility,
    lease: facility.lease ? { ...facility.lease } : undefined,
    physical: facility.physical ? { ...facility.physical } : undefined,
    rackGroups: facility.rackGroups?.map(group => ({
      ...group,
      migration: group.migration ? { ...group.migration } : undefined,
    })),
  }))
);

/**
 * Single deterministic Build read model shared by the isolated UI lab and a
 * saved career. This function does not mutate treasury or saves: it projects a
 * regional drawing into facilities, coverage, capacity, quote and schedule.
 */
export const createCanonicalBuildData = (
  input: StreamingCanonicalBuildInput,
): StreamingCanonicalBuildData => {
  const suppliedFacilities = cloneFacilities(input.facilities || []);
  const suppliedPlans = clonePlans(input.regionPlans || []);
  // An explicit pair of empty arrays is a legitimate first-career drawing.
  // What is forbidden is a career caller omitting both canonical inputs and
  // accidentally falling through to the lab's fixture-only assumptions.
  if (input.source === 'CAREER' && input.regionPlans === undefined && input.facilities === undefined) {
    throw new Error('Career Build requires a canonical region plan or facilities; fixture fallback is disabled.');
  }

  const regionPlans = suppliedPlans.length > 0
    ? suppliedPlans
    : reconstructStreamingRegionPlans(suppliedFacilities);
  const placement = deriveStreamingRegionalPlacement({
    regionPlans,
    openingCountryIds: [...input.openingCountryIds],
    existingFacilities: suppliedFacilities,
    absoluteWeek: input.absoluteWeek,
  });
  const coverage = deriveStreamingNetworkCoverage({
    facilities: placement.facilities,
    openingCountryIds: input.openingCountryIds,
    fibreState: input.fibreState,
  });
  const capacity = deriveStreamingNetworkCapacity({
    facilities: placement.facilities,
    forecastConcurrentStreams: input.forecastConcurrentStreams,
  });
  const signals = deriveStreamingNetworkSignals(coverage, capacity);
  const quote = quoteStreamingNetworkPlan({
    facilities: placement.facilities,
    regionPlans,
  });
  const schedule = deriveStreamingConstructionSchedule({
    facilities: placement.facilities,
    absoluteWeek: input.absoluteWeek,
  });
  const signature = deriveStreamingInfrastructureSignature({
    facilities: placement.facilities,
    regionPlans,
    quote,
    demandState: input.demandState,
    pricingState: input.pricingState,
    fibreState: input.fibreState,
    repairs: input.repairs,
  });

  return {
    regionPlans,
    facilities: placement.facilities,
    placements: placement.placements,
    placementWarnings: placement.warnings,
    coverage,
    capacity,
    signals,
    quote,
    schedule,
    signature,
  };
};
