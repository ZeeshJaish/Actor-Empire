import type { OwnedStreamingFacility } from '../types';
import { getDefaultStreamingFacilityPhysical } from './streamingFacilities';
import {
    STREAMING_COOLING_KW_PER_WORKHORSE,
    STREAMING_PIPE_MBPS_PER_WORKHORSE,
    STREAMING_POWER_KW_PER_WORKHORSE,
    STREAMING_SERVER_TIERS,
    STREAMING_VIEWERS_PER_WORKHORSE,
} from './streamingServerTiers';

export type StreamingCapacityLimit = 'NONE' | 'POWER' | 'COOLING' | 'FIBRE' | 'CONDITION';

export interface StreamingFacilityCapacity {
    facilityId: string;
    compute: number;
    steadyStreams: number;
    burstStreams: number;
    limiting: StreamingCapacityLimit;
}

export interface StreamingNetworkCapacity {
    steadyStreams: number;
    burstStreams: number;
    forecastConcurrentStreams: number;
    headroomPercent: number;
    redundancy: 'REDUNDANT' | 'EXPOSED' | 'SINGLE';
    limiting: StreamingCapacityLimit[];
    facilities: StreamingFacilityCapacity[];
}

export const deriveStreamingNetworkCapacity = (input: {
    facilities: readonly OwnedStreamingFacility[];
    forecastConcurrentStreams: number;
}): StreamingNetworkCapacity => {
    const facilities = input.facilities.map(facility => {
        const groups = facility.rackGroups || [];
        const weightedDraw = groups.reduce((sum, group) => sum + group.rackCount * STREAMING_SERVER_TIERS[group.serverTier || 'WORKHORSE'].draw, 0)
            || facility.installedRacks;
        const compute = groups.reduce((sum, group) => sum + group.rackCount * STREAMING_SERVER_TIERS[group.serverTier || 'WORKHORSE'].compute, 0)
            || facility.installedRacks;
        const physical = facility.physical || getDefaultStreamingFacilityPhysical(facility.type, facility.installedRacks, facility.lease);
        const ratios: Array<[StreamingCapacityLimit, number]> = [
            ['POWER', physical.powerContractKw / Math.max(1, weightedDraw * STREAMING_POWER_KW_PER_WORKHORSE)],
            ['COOLING', physical.coolingCapacityKw / Math.max(1, weightedDraw * STREAMING_COOLING_KW_PER_WORKHORSE)],
            ['FIBRE', physical.bandwidthMbps / Math.max(1, weightedDraw * STREAMING_PIPE_MBPS_PER_WORKHORSE)],
            ['CONDITION', physical.maintenanceConditionPercent / 100],
        ];
        const limitingEntry = [...ratios].sort((a, b) => a[1] - b[1])[0];
        const steadyFactor = Math.max(0, Math.min(1, limitingEntry[1]));
        const burstFactor = Math.max(0, Math.min(1.25, physical.burstBandwidthMbps / Math.max(1, weightedDraw * STREAMING_PIPE_MBPS_PER_WORKHORSE)));
        return {
            facilityId: facility.id,
            compute,
            steadyStreams: Math.round(compute * STREAMING_VIEWERS_PER_WORKHORSE * steadyFactor),
            burstStreams: Math.round(compute * STREAMING_VIEWERS_PER_WORKHORSE * Math.max(steadyFactor, burstFactor)),
            limiting: limitingEntry[1] >= 1 ? 'NONE' as const : limitingEntry[0],
        };
    });
    const steadyStreams = facilities.reduce((sum, facility) => sum + facility.steadyStreams, 0);
    const burstStreams = facilities.reduce((sum, facility) => sum + facility.burstStreams, 0);
    const forecastConcurrentStreams = Math.max(0, Math.round(input.forecastConcurrentStreams));
    const cities = new Set(input.facilities.map(facility => facility.cityId)).size;
    return {
        steadyStreams,
        burstStreams,
        forecastConcurrentStreams,
        headroomPercent: forecastConcurrentStreams > 0
            ? Math.round(((steadyStreams - forecastConcurrentStreams) / forecastConcurrentStreams) * 100)
            : 100,
        redundancy: cities >= 3 ? 'REDUNDANT' : cities === 2 ? 'EXPOSED' : 'SINGLE',
        limiting: Array.from(new Set(facilities.map(facility => facility.limiting).filter(limit => limit !== 'NONE'))),
        facilities,
    };
};
