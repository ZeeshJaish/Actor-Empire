import type { OwnedStreamingFacility } from '../types';

export interface StreamingConstructionSchedule {
    weeks: number;
    startedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
    physicalRooms: number;
    physicalRacks: number;
    longestProvisioningWeeks: number;
}

export const deriveStreamingConstructionSchedule = (input: {
    facilities: readonly OwnedStreamingFacility[];
    absoluteWeek: number;
}): StreamingConstructionSchedule => {
    const physical = input.facilities.filter(facility => (
        facility.type !== 'CLOUD_ALLOCATION' && facility.lease?.tenure !== 'CLOUD'
    ));
    const physicalRacks = physical.reduce((sum, facility) => sum + facility.installedRacks, 0);
    const longestProvisioningWeeks = physical.reduce((longest, facility) => (
        Math.max(longest, facility.lease?.provisioningWeeks || 0)
    ), 0);
    const breadthWeeks = Math.ceil(new Set(physical.map(facility => facility.cityId)).size / 2);
    const volumeWeeks = Math.ceil(physicalRacks / 24);
    const rawWeeks = 4 + breadthWeeks + volumeWeeks + Math.ceil(longestProvisioningWeeks / 3);
    const weeks = Math.max(4, Math.min(15, rawWeeks));
    const startedAtAbsoluteWeek = Math.max(0, Math.round(input.absoluteWeek));
    return {
        weeks,
        startedAtAbsoluteWeek,
        readyAtAbsoluteWeek: startedAtAbsoluteWeek + weeks,
        physicalRooms: physical.length,
        physicalRacks,
        longestProvisioningWeeks,
    };
};
