import type { StreamingFacilityRepairAction } from './streamingInfrastructurePhysical';

export type StreamingRehearsalScenario = 'QUIET' | 'LIKELY' | 'SURGE';
export type StreamingRehearsalVerdict = 'HELD' | 'BURST' | 'BROKE';
export type StreamingFacilityStressState = 'CLEAR' | 'STRESSED' | 'BURSTING' | 'FAILED';

export interface StreamingRehearsalFacilityInput {
    facilityId: string;
    cityId: string;
    cityLabel: string;
    regionId: string;
    steadyCapacity: number;
    burstCapacity: number;
    reliabilityPercent: number;
    limitingFactor: string;
    physicalRepairActions: Array<{
        id: StreamingFacilityRepairAction;
        label: string;
        cost: number;
    }>;
}

export interface StreamingRehearsalCountryInput {
    marketId: string;
    country: string;
    regionId: string;
    regionLabel: string;
    demand: number;
    latencyMs: number | null;
    cacheHitPercent: number;
    baseBufferingRiskPercent: number;
    routeFacilityIds: string[];
    servingCityLabels: string[];
    recommendedCityId: string;
    localizationNote: string;
    catalogueAvailableTitles: number;
    catalogueTotalTitles: number;
}

export interface StreamingRehearsalFacilityResult {
    facilityId: string;
    cityId: string;
    cityLabel: string;
    demand: number;
    steadyCapacity: number;
    burstCapacity: number;
    loadPercent: number;
    spareCapacity: number;
    state: StreamingFacilityStressState;
    verdict: StreamingRehearsalVerdict;
    failedPercent: number;
    limitingFactor: string;
    affectedMarketIds: string[];
}

export interface StreamingRehearsalCountryResult {
    marketId: string;
    country: string;
    regionId: string;
    regionLabel: string;
    demand: number;
    latencyMs: number | null;
    startupTimeMs: number | null;
    bufferingRiskPercent: number;
    catalogueAvailabilityPercent: number;
    catalogueAvailableTitles: number;
    catalogueTotalTitles: number;
    outageResistance: 'REDUNDANT' | 'EXPOSED' | 'SINGLE_POINT' | 'UNSERVED';
    servingCityLabels: string[];
    verdict: StreamingRehearsalVerdict;
    failedPercent: number;
    viewerConsequence: string;
    localizationNote: string;
}

export type StreamingRehearsalRepairAction =
    | {
        id: string;
        type: 'REPAIR_PHYSICAL';
        label: string;
        detail: string;
        facilityId: string;
        cityId: string;
        physicalAction: StreamingFacilityRepairAction;
        cost: number;
    }
    | {
        id: string;
        type: 'ADD_CAPACITY' | 'ADD_REGIONAL_HUB';
        label: string;
        detail: string;
        cityId: string;
        racks: number;
    }
    | {
        id: string;
        type: 'EXPAND_RIGHTS';
        label: string;
        detail: string;
        marketId: string;
    };

export interface StreamingLaunchRehearsalResult {
    scenario: StreamingRehearsalScenario;
    verdict: StreamingRehearsalVerdict;
    peakConcurrentStreams: number;
    steadyCapacity: number;
    burstCapacity: number;
    peakLoadPercent: number;
    spareCapacityPercent: number;
    failedPercent: number;
    estimatedDowntimeMinutes: number;
    regionalSinglePointFailures: string[];
    catalogueAvailabilityPercent: number;
    countries: StreamingRehearsalCountryResult[];
    facilities: StreamingRehearsalFacilityResult[];
    repairActions: StreamingRehearsalRepairAction[];
    warningSummary: string;
}

export interface StreamingLaunchRehearsalInput {
    scenario: StreamingRehearsalScenario;
    countries: StreamingRehearsalCountryInput[];
    facilities: StreamingRehearsalFacilityInput[];
    rolloutRiskPercent: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const round = (value: number): number => Math.max(0, Math.round(value));

/**
 * Canonical deterministic launch rehearsal. The Build animation, repair
 * actions and persisted load-test evidence all consume this exact result.
 */
export const createStreamingLaunchRehearsal = (
    input: StreamingLaunchRehearsalInput,
): StreamingLaunchRehearsalResult => {
    const facilities = input.facilities.filter(item => item.steadyCapacity > 0 || item.burstCapacity > 0);
    const facilityById = new Map(facilities.map(item => [item.facilityId, item]));
    const facilityDemand = new Map<string, number>();
    const affectedMarkets = new Map<string, Set<string>>();
    const countryAllocations = new Map<string, Array<{ facilityId: string; demand: number }>>();

    for (const country of input.countries) {
        const route = Array.from(new Set(country.routeFacilityIds))
            .map(id => facilityById.get(id))
            .filter((item): item is StreamingRehearsalFacilityInput => Boolean(item));
        const routeCapacity = route.reduce((sum, item) => sum + Math.max(1, item.steadyCapacity), 0);
        const allocations = route.map(item => ({
            facilityId: item.facilityId,
            demand: round(country.demand * Math.max(1, item.steadyCapacity) / Math.max(1, routeCapacity)),
        }));
        const allocationTotal = allocations.reduce((sum, item) => sum + item.demand, 0);
        if (allocations.length && allocationTotal !== country.demand) {
            allocations[0].demand += country.demand - allocationTotal;
        }
        countryAllocations.set(country.marketId, allocations);
        allocations.forEach(allocation => {
            facilityDemand.set(allocation.facilityId, (facilityDemand.get(allocation.facilityId) || 0) + allocation.demand);
            const marketIds = affectedMarkets.get(allocation.facilityId) || new Set<string>();
            marketIds.add(country.marketId);
            affectedMarkets.set(allocation.facilityId, marketIds);
        });
    }

    const facilityResults: StreamingRehearsalFacilityResult[] = facilities.map(facility => {
        const demand = facilityDemand.get(facility.facilityId) || 0;
        const loadPercent = facility.steadyCapacity > 0
            ? round(demand / facility.steadyCapacity * 100)
            : demand > 0 ? 999 : 0;
        let verdict: StreamingRehearsalVerdict = 'HELD';
        let failedPercent = 0;
        if (demand > facility.burstCapacity || facility.burstCapacity <= 0 && demand > 0) {
            verdict = 'BROKE';
            failedPercent = clamp(round(
                (demand - facility.burstCapacity) / Math.max(1, demand) * 100
                + input.rolloutRiskPercent * .35,
            ), 1, 92);
        } else if (demand > facility.steadyCapacity
            || input.rolloutRiskPercent >= 10 && demand > facility.steadyCapacity * .82) {
            verdict = 'BURST';
            failedPercent = demand > facility.steadyCapacity
                ? clamp(round(input.rolloutRiskPercent * .18), 0, 18)
                : clamp(round(input.rolloutRiskPercent * .1), 0, 10);
        }
        const state: StreamingFacilityStressState = verdict === 'BROKE'
            ? 'FAILED'
            : verdict === 'BURST'
                ? 'BURSTING'
                : loadPercent >= 82 || facility.reliabilityPercent < 99.5 || facility.limitingFactor !== 'NONE'
                    ? 'STRESSED'
                    : 'CLEAR';
        return {
            facilityId: facility.facilityId,
            cityId: facility.cityId,
            cityLabel: facility.cityLabel,
            demand,
            steadyCapacity: facility.steadyCapacity,
            burstCapacity: facility.burstCapacity,
            loadPercent,
            spareCapacity: Math.max(0, facility.burstCapacity - demand),
            state,
            verdict,
            failedPercent,
            limitingFactor: facility.limitingFactor,
            affectedMarketIds: Array.from(affectedMarkets.get(facility.facilityId) || []),
        };
    });
    const facilityResultById = new Map(facilityResults.map(item => [item.facilityId, item]));

    const countries: StreamingRehearsalCountryResult[] = input.countries.map(country => {
        const allocations = countryAllocations.get(country.marketId) || [];
        const routeResults = allocations
            .map(item => ({ allocation: item, result: facilityResultById.get(item.facilityId) }))
            .filter((item): item is { allocation: { facilityId: string; demand: number }; result: StreamingRehearsalFacilityResult } => Boolean(item.result));
        const failedPercent = routeResults.length
            ? round(routeResults.reduce((sum, item) => sum + item.result.failedPercent * item.allocation.demand, 0)
                / Math.max(1, routeResults.reduce((sum, item) => sum + item.allocation.demand, 0)))
            : 100;
        const worstLoad = routeResults.reduce((max, item) => Math.max(max, item.result.loadPercent), 0);
        const hasBrokenRoute = routeResults.some(item => item.result.verdict === 'BROKE');
        const hasBurstRoute = routeResults.some(item => item.result.verdict === 'BURST');
        const verdict: StreamingRehearsalVerdict = routeResults.length === 0 || hasBrokenRoute
            ? 'BROKE'
            : hasBurstRoute ? 'BURST' : 'HELD';
        const uniqueCities = new Set(country.servingCityLabels).size;
        const allocatedDemand = Math.max(1, routeResults.reduce((sum, item) => sum + item.allocation.demand, 0));
        const routeReliabilityPercent = routeResults.length
            ? routeResults.reduce((sum, item) => (
                sum + (facilityById.get(item.result.facilityId)?.reliabilityPercent || 0) * item.allocation.demand
            ), 0) / allocatedDemand
            : 0;
        const outageResistance: StreamingRehearsalCountryResult['outageResistance'] = routeResults.length === 0
            ? 'UNSERVED'
            : uniqueCities >= 2 ? 'REDUNDANT'
                : routeResults.length >= 2 ? 'EXPOSED' : 'SINGLE_POINT';
        const startupTimeMs = country.latencyMs === null
            ? null
            : round(520
                + country.latencyMs * 7.4
                + Math.max(0, worstLoad - 68) * 11
                + failedPercent * 16
                + Math.max(0, 99.8 - routeReliabilityPercent) * 45);
        const bufferingRiskPercent = clamp(round(
            country.baseBufferingRiskPercent
            + Math.max(0, worstLoad - 72) * .22
            + failedPercent * .72
            + Math.max(0, 100 - country.cacheHitPercent) * .04
            + Math.max(0, 99.8 - routeReliabilityPercent) * .9,
        ), 1, 100);
        const catalogueAvailabilityPercent = country.catalogueTotalTitles > 0
            ? clamp(round(country.catalogueAvailableTitles / country.catalogueTotalTitles * 100), 0, 100)
            : 0;
        const viewerConsequence = verdict === 'BROKE'
            ? `${failedPercent}% of attempted streams are expected to fail at peak.`
            : bufferingRiskPercent >= 15
                ? `Playback should start, but ${bufferingRiskPercent}% buffering risk will be visible.`
                : catalogueAvailabilityPercent < 100
                    ? `Playback is healthy, but only ${catalogueAvailabilityPercent}% of the opening catalogue is cleared here.`
                    : outageResistance === 'SINGLE_POINT'
                        ? 'Playback is healthy, but one city failure can disconnect this market.'
                        : 'Fast startup, low buffering risk and a protected delivery path.';
        return {
            marketId: country.marketId,
            country: country.country,
            regionId: country.regionId,
            regionLabel: country.regionLabel,
            demand: country.demand,
            latencyMs: country.latencyMs,
            startupTimeMs,
            bufferingRiskPercent,
            catalogueAvailabilityPercent,
            catalogueAvailableTitles: country.catalogueAvailableTitles,
            catalogueTotalTitles: country.catalogueTotalTitles,
            outageResistance,
            servingCityLabels: [...country.servingCityLabels],
            verdict,
            failedPercent,
            viewerConsequence,
            localizationNote: country.localizationNote,
        };
    }).sort((left, right) => (
        right.failedPercent - left.failedPercent
        || right.bufferingRiskPercent - left.bufferingRiskPercent
        || right.demand - left.demand
    ));

    const regionalSinglePointFailures = Array.from(new Set(countries
        .filter(country => country.outageResistance === 'SINGLE_POINT')
        .map(country => country.regionLabel)));
    const peakConcurrentStreams = countries.reduce((sum, country) => sum + country.demand, 0);
    const steadyCapacity = facilities.reduce((sum, facility) => sum + facility.steadyCapacity, 0);
    const burstCapacity = facilities.reduce((sum, facility) => sum + facility.burstCapacity, 0);
    const failedPercent = peakConcurrentStreams > 0
        ? round(countries.reduce((sum, country) => sum + country.failedPercent * country.demand, 0) / peakConcurrentStreams)
        : 0;
    const catalogueDemand = countries.reduce((sum, country) => sum + country.demand, 0);
    const catalogueAvailabilityPercent = catalogueDemand > 0
        ? round(countries.reduce((sum, country) => sum + country.catalogueAvailabilityPercent * country.demand, 0) / catalogueDemand)
        : 0;
    const verdict: StreamingRehearsalVerdict = countries.some(country => country.verdict === 'BROKE')
        ? 'BROKE'
        : countries.some(country => country.verdict === 'BURST') ? 'BURST' : 'HELD';

    const repairs: StreamingRehearsalRepairAction[] = [];
    for (const facilityResult of facilityResults.filter(item => item.state !== 'CLEAR')) {
        const facility = facilityById.get(facilityResult.facilityId);
        const physical = facility?.physicalRepairActions[0];
        if (physical && facilityResult.limitingFactor !== 'NONE') {
            repairs.push({
                id: `physical:${facilityResult.facilityId}:${physical.id}`,
                type: 'REPAIR_PHYSICAL',
                label: physical.label,
                detail: `${facilityResult.cityLabel} is capped by ${facilityResult.limitingFactor.toLowerCase().replace('_', ' ')}.`,
                facilityId: facilityResult.facilityId,
                cityId: facilityResult.cityId,
                physicalAction: physical.id,
                cost: physical.cost,
            });
        } else if (facilityResult.loadPercent >= 82) {
            repairs.push({
                id: `capacity:${facilityResult.cityId}`,
                type: 'ADD_CAPACITY',
                label: `Add capacity in ${facilityResult.cityLabel}`,
                detail: `${facilityResult.loadPercent}% expected load leaves too little launch-night room.`,
                cityId: facilityResult.cityId,
                racks: Math.max(1, Math.ceil(Math.max(0, facilityResult.demand - facilityResult.steadyCapacity * .72) / 65_000)),
            });
        }
    }
    for (const regionLabel of regionalSinglePointFailures) {
        const country = countries.find(item => item.regionLabel === regionLabel);
        if (!country) continue;
        repairs.push({
            id: `redundancy:${country.regionId}`,
            type: 'ADD_REGIONAL_HUB',
            label: `Add a second ${regionLabel} path`,
            detail: `${regionLabel} currently depends on one network city.`,
            cityId: input.countries.find(item => item.marketId === country.marketId)?.recommendedCityId || '',
            racks: 1,
        });
    }
    for (const country of countries.filter(item => item.catalogueAvailabilityPercent < 100)) {
        repairs.push({
            id: `rights:${country.marketId}`,
            type: 'EXPAND_RIGHTS',
            label: country.catalogueTotalTitles > 0
                ? `Repair ${country.country} catalogue rights`
                : `Build a ${country.country} opening catalogue`,
            detail: country.catalogueTotalTitles > 0
                ? `${country.catalogueAvailableTitles}/${country.catalogueTotalTitles} opening titles are cleared.`
                : 'No opening title is currently available to this market.',
            marketId: country.marketId,
        });
    }
    const repairActions = Array.from(new Map(repairs.map(item => [item.id, item])).values()).slice(0, 12);
    const spareCapacityPercent = burstCapacity > 0
        ? Math.round((burstCapacity - peakConcurrentStreams) / burstCapacity * 100)
        : -100;
    const warningSummary = verdict === 'BROKE'
        ? `${countries.filter(country => country.verdict === 'BROKE').map(country => country.country).join(', ')} will experience failed streams at peak.`
        : verdict === 'BURST'
            ? 'The opening can continue, but temporary burst capacity and visible buffering are expected.'
            : regionalSinglePointFailures.length
                ? `Traffic clears, but ${regionalSinglePointFailures.join(', ')} still has a regional single point of failure.`
                : catalogueAvailabilityPercent < 100
                    ? 'The network holds, but catalogue rights differ between opening countries.'
                    : 'Every opening country clears peak traffic with spare capacity and a complete catalogue.';

    return {
        scenario: input.scenario,
        verdict,
        peakConcurrentStreams,
        steadyCapacity,
        burstCapacity,
        peakLoadPercent: steadyCapacity > 0 ? round(peakConcurrentStreams / steadyCapacity * 100) : 999,
        spareCapacityPercent,
        failedPercent,
        estimatedDowntimeMinutes: failedPercent > 0 ? 5 + round(failedPercent * .9) : 0,
        regionalSinglePointFailures,
        catalogueAvailabilityPercent,
        countries,
        facilities: facilityResults,
        repairActions,
        warningSummary,
    };
};
