import type {
    OwnedStreamingFacility,
    OwnedStreamingRackGroup,
    StreamingNetworkNodeRole,
    StreamingRackDuty,
    StreamingRackDutyMigration,
} from '../types';

export interface StreamingRackDutyRule {
    id: StreamingRackDuty;
    name: string;
    technicalName: string;
    shortName: string;
    description: string;
    viewerPromise: string;
    capacityMultiplier: number;
    cacheScore: number;
    latencyAdjustment: number;
    capexMultiplier: number;
    weeklyMultiplier: number;
    migrationWeeks: number;
    migrationPressurePercent: number;
    color: string;
    available: boolean;
}

export const STREAMING_RACK_DUTIES: StreamingRackDutyRule[] = [
    {
        id: 'CONTENT_ORIGIN', name: 'Content origin', technicalName: 'Master library', shortName: 'ORIGIN',
        description: 'Stores every title and creates the master stream used by the rest of the network.',
        viewerPromise: 'Keeps the complete catalogue available.', capacityMultiplier: 1, cacheScore: 100,
        latencyAdjustment: 12, capexMultiplier: 1, weeklyMultiplier: 1, migrationWeeks: 3,
        migrationPressurePercent: 18, color: '#5b4bff', available: true,
    },
    {
        id: 'REGIONAL_CACHE', name: 'Regional cache', technicalName: 'Regional relay', shortName: 'REGION',
        description: 'Copies most titles closer to a region and takes pressure off the master library.',
        viewerPromise: 'Makes a whole region start faster.', capacityMultiplier: .95, cacheScore: 76,
        latencyAdjustment: 4, capexMultiplier: .78, weeklyMultiplier: .84, migrationWeeks: 2,
        migrationPressurePercent: 13, color: '#22c7ff', available: true,
    },
    {
        id: 'LOCAL_EDGE', name: 'Local edge', technicalName: 'Fast cache', shortName: 'EDGE',
        description: 'Keeps popular titles close to viewers. It depends on an origin or regional cache.',
        viewerPromise: 'Cuts buffering for nearby viewers.', capacityMultiplier: .82, cacheScore: 42,
        latencyAdjustment: 0, capexMultiplier: .48, weeklyMultiplier: .62, migrationWeeks: 1,
        migrationPressurePercent: 8, color: '#2ee6a6', available: true,
    },
    {
        id: 'ENCODING', name: 'Encoding', technicalName: 'Video workshop', shortName: 'ENCODE',
        description: 'Turns films and episodes into the quality versions required by phones, TVs and slow connections.',
        viewerPromise: 'Prepares more quality levels and devices.', capacityMultiplier: .42, cacheScore: 24,
        latencyAdjustment: 6, capexMultiplier: .92, weeklyMultiplier: 1.08, migrationWeeks: 2,
        migrationPressurePercent: 14, color: '#ffb020', available: true,
    },
    {
        id: 'PLATFORM_SERVICES', name: 'Platform services', technicalName: 'Accounts and payments', shortName: 'SERVICES',
        description: 'Runs sign-in, profiles, search, recommendations, billing and parental controls.',
        viewerPromise: 'Keeps the app and accounts responsive.', capacityMultiplier: .48, cacheScore: 30,
        latencyAdjustment: 5, capexMultiplier: .76, weeklyMultiplier: .88, migrationWeeks: 2,
        migrationPressurePercent: 15, color: '#bf7cff', available: true,
    },
    {
        id: 'LIVE_EVENT', name: 'Live-event delivery', technicalName: 'Premiere surge', shortName: 'LIVE',
        description: 'Reserves high-burst machines for live premieres, sport and appointment viewing.',
        viewerPromise: 'Absorbs opening-night crowd spikes.', capacityMultiplier: 1.25, cacheScore: 58,
        latencyAdjustment: 2, capexMultiplier: 1.12, weeklyMultiplier: 1.04, migrationWeeks: 2,
        migrationPressurePercent: 16, color: '#ff4f72', available: true,
    },
    {
        id: 'SPECIALIZED', name: 'Future workload', technicalName: 'Research bay', shortName: 'FUTURE',
        description: 'Reserved for patented delivery, immersive formats and technology researched later.',
        viewerPromise: 'Unlocks after a matching technology is developed.', capacityMultiplier: .3, cacheScore: 18,
        latencyAdjustment: 8, capexMultiplier: 1.2, weeklyMultiplier: 1.1, migrationWeeks: 4,
        migrationPressurePercent: 20, color: '#7f8cff', available: false,
    },
];

export const getStreamingRackDutyRule = (duty: StreamingRackDuty): StreamingRackDutyRule => (
    STREAMING_RACK_DUTIES.find(rule => rule.id === duty) || STREAMING_RACK_DUTIES[0]
);

export const rackDutyFromNetworkRole = (role: StreamingNetworkNodeRole): StreamingRackDuty => (
    role === 'CORE_ORIGIN' ? 'CONTENT_ORIGIN' : role === 'REGIONAL_HUB' ? 'REGIONAL_CACHE' : 'LOCAL_EDGE'
);

export const networkRoleFromRackDuty = (duty: StreamingRackDuty): StreamingNetworkNodeRole => (
    duty === 'CONTENT_ORIGIN' || duty === 'ENCODING' || duty === 'PLATFORM_SERVICES'
        ? 'CORE_ORIGIN'
        : duty === 'REGIONAL_CACHE' || duty === 'LIVE_EVENT'
            ? 'REGIONAL_HUB'
            : 'EDGE_CACHE'
);

const validDuty = (value: unknown, fallback: StreamingRackDuty): StreamingRackDuty => (
    STREAMING_RACK_DUTIES.some(rule => rule.id === value) ? value as StreamingRackDuty : fallback
);

const normalizeMigration = (value: unknown, duty: StreamingRackDuty): StreamingRackDutyMigration | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const source = value as Record<string, unknown>;
    const toDuty = validDuty(source.toDuty, duty);
    return {
        fromDuty: duty,
        toDuty,
        weeks: Math.max(1, Math.min(8, Math.round(Number(source.weeks) || getStreamingRackDutyRule(toDuty).migrationWeeks))),
        pressurePercent: Math.max(1, Math.min(40, Math.round(Number(source.pressurePercent) || getStreamingRackDutyRule(toDuty).migrationPressurePercent))),
    };
};

export const createStreamingRackGroupId = (facilityId: string, ordinal = 1): string => (
    `${facilityId}-GROUP-${String(Math.max(1, ordinal)).padStart(2, '0')}`
);

export const normalizeStreamingRackGroups = (
    value: unknown,
    facilityId: string,
    installedRacks: number,
    legacyRole: StreamingNetworkNodeRole,
): OwnedStreamingRackGroup[] => {
    const wantedRacks = Math.max(1, Math.round(installedRacks || 1));
    const seen = new Set<string>();
    let remaining = wantedRacks;
    const groups = (Array.isArray(value) ? value : []).flatMap((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item) || remaining <= 0) return [];
        const source = item as Record<string, unknown>;
        const id = String(source.id || createStreamingRackGroupId(facilityId, index + 1)).trim().slice(0, 140);
        if (!id || seen.has(id)) return [];
        seen.add(id);
        const duty = validDuty(source.duty, rackDutyFromNetworkRole(legacyRole));
        const rackCount = Math.max(1, Math.min(remaining, Math.round(Number(source.rackCount) || 1)));
        remaining -= rackCount;
        return [{
            id,
            name: String(source.name || `${getStreamingRackDutyRule(duty).name} ${index + 1}`).trim().slice(0, 48),
            rackCount,
            duty,
            migration: normalizeMigration(source.migration, duty),
        } satisfies OwnedStreamingRackGroup];
    });
    if (!groups.length) {
        const duty = rackDutyFromNetworkRole(legacyRole);
        return [{
            id: createStreamingRackGroupId(facilityId, 1),
            name: `${getStreamingRackDutyRule(duty).name} 1`,
            rackCount: wantedRacks,
            duty,
        }];
    }
    if (remaining > 0) groups[0] = { ...groups[0], rackCount: groups[0].rackCount + remaining };
    return groups;
};

export const getProjectedRackDuty = (group: OwnedStreamingRackGroup): StreamingRackDuty => (
    group.migration?.toDuty || group.duty
);

export const projectFacilityNetworkRole = (groups: OwnedStreamingRackGroup[]): StreamingNetworkNodeRole => {
    const duties = groups.map(getProjectedRackDuty);
    if (duties.includes('CONTENT_ORIGIN')) return 'CORE_ORIGIN';
    if (duties.some(duty => duty === 'REGIONAL_CACHE' || duty === 'LIVE_EVENT')) return 'REGIONAL_HUB';
    return 'EDGE_CACHE';
};

export const finalizeStreamingRackGroupMigrations = (facility: OwnedStreamingFacility): OwnedStreamingFacility => {
    const groups = normalizeStreamingRackGroups(facility.rackGroups, facility.id, facility.installedRacks, facility.role)
        .map(group => group.migration
            ? { ...group, duty: group.migration.toDuty, migration: undefined }
            : group);
    return { ...facility, rackGroups: groups, role: projectFacilityNetworkRole(groups) };
};
