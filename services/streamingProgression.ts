import type {
    OwnedStreamingPlatformState,
    Player,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';

export type StreamingReachLevel = 0 | 1 | 2 | 3 | 4;

export interface StreamingReachResolution {
    available: boolean;
    level: StreamingReachLevel;
    key: `LEVEL_${StreamingReachLevel}`;
    label: string;
    description: string;
    demandRange: {
        low: number;
        likely: number;
        high: number;
    };
    limitingFactors: string[];
    evidence: string[];
}

export const STREAMING_REACH_LEVELS: Record<StreamingReachLevel, {
    key: `LEVEL_${StreamingReachLevel}`;
    label: string;
    description: string;
    demandRange: StreamingReachResolution['demandRange'];
}> = {
    0: {
        key: 'LEVEL_0',
        label: 'Foundation reach',
        description: 'The company is incorporated, but it has not yet proven a public delivery footprint.',
        demandRange: { low: 130_000, likely: 200_000, high: 320_000 },
    },
    1: {
        key: 'LEVEL_1',
        label: 'Regional reach',
        description: 'A focused operating footprint supported by a real first delivery stack.',
        demandRange: { low: 180_000, likely: 320_000, high: 520_000 },
    },
    2: {
        key: 'LEVEL_2',
        label: 'National reach',
        description: 'A full-country footprint with capacity for a meaningful breakout premiere.',
        demandRange: { low: 700_000, likely: 1_000_000, high: 1_550_000 },
    },
    3: {
        key: 'LEVEL_3',
        label: 'Multi-region reach',
        description: 'Several major regions supported by a stronger delivery and reliability stack.',
        demandRange: { low: 1_600_000, likely: 2_400_000, high: 3_800_000 },
    },
    4: {
        key: 'LEVEL_4',
        label: 'Global reach',
        description: 'A worldwide operating footprint with mature delivery, localization and product systems.',
        demandRange: { low: 2_700_000, likely: 4_000_000, high: 6_400_000 },
    },
};

const resolvePlatform = (
    input: Player | OwnedStreamingPlatformState,
): OwnedStreamingPlatformState => {
    if ('ownedStreamingPlatform' in input) {
        return normalizeOwnedStreamingPlatformState(input.ownedStreamingPlatform, input.id);
    }
    return normalizeOwnedStreamingPlatformState(input);
};

export const resolveOwnedStreamingReach = (
    input: Player | OwnedStreamingPlatformState,
): StreamingReachResolution => {
    const platform = resolvePlatform(input);
    const incorporated = Boolean(
        platform.identity
        && platform.foundingProfile
        && ['FOUNDING', 'ACTIVE', 'SUSPENDED'].includes(platform.lifecycle),
    );
    const baselineCapacity = platform.capacity.baselineConcurrentStreams;
    const delivery = platform.technologyLevels.DELIVERY_CAPACITY;
    const reliability = platform.technologyLevels.RELIABILITY;
    const contentOperations = platform.technologyLevels.CONTENT_OPERATIONS;
    const productExperience = platform.technologyLevels.PRODUCT_EXPERIENCE;

    let level: StreamingReachLevel = 0;
    if (
        baselineCapacity >= 5_000_000
        && delivery >= 35
        && reliability >= 30
        && contentOperations >= 20
        && productExperience >= 20
    ) {
        level = 4;
    } else if (
        baselineCapacity >= 3_000_000
        && delivery >= 30
        && reliability >= 25
    ) {
        level = 3;
    } else if (
        baselineCapacity >= 1_000_000
        && delivery >= 20
        && reliability >= 18
    ) {
        level = 2;
    } else if (
        baselineCapacity >= 100_000
        && delivery >= 6
        && reliability >= 10
    ) {
        level = 1;
    }

    const definition = STREAMING_REACH_LEVELS[level];
    const limitingFactors: string[] = [];
    if (incorporated && level < 1) {
        if (baselineCapacity < 100_000) limitingFactors.push('Install a delivery stack with at least 100,000 baseline concurrent streams.');
        if (delivery < 6) limitingFactors.push('Activate delivery capacity technology at Level 6.');
        if (reliability < 10) limitingFactors.push('Activate reliability technology at Level 10.');
    } else if (incorporated && level < 2) {
        if (baselineCapacity < 1_000_000) limitingFactors.push('Raise baseline concurrent-stream capacity to 1,000,000.');
        if (delivery < 20) limitingFactors.push('Advance delivery capacity technology to 20.');
        if (reliability < 18) limitingFactors.push('Advance reliability technology to 18.');
    } else if (incorporated && level < 3) {
        if (baselineCapacity < 3_000_000) limitingFactors.push('Raise baseline concurrent-stream capacity to 3,000,000.');
        if (delivery < 30) limitingFactors.push('Advance delivery capacity technology to 30.');
        if (reliability < 25) limitingFactors.push('Advance reliability technology to 25.');
    } else if (incorporated && level < 4) {
        if (baselineCapacity < 5_000_000) limitingFactors.push('Raise baseline concurrent-stream capacity to 5,000,000.');
        if (delivery < 35) limitingFactors.push('Advance delivery capacity technology to 35.');
        if (reliability < 30) limitingFactors.push('Advance reliability technology to 30.');
        if (contentOperations < 20) limitingFactors.push('Build multi-region content operations to 20.');
        if (productExperience < 20) limitingFactors.push('Build the global product experience to 20.');
    }

    return {
        available: incorporated,
        level,
        key: definition.key,
        label: incorporated ? definition.label : 'Reach unavailable',
        description: incorporated
            ? definition.description
            : 'Incorporate the streaming company before calculating its operating reach.',
        demandRange: { ...definition.demandRange },
        limitingFactors: incorporated
            ? limitingFactors
            : ['Complete company incorporation.'],
        evidence: incorporated
            ? [
                `${baselineCapacity.toLocaleString()} baseline concurrent streams`,
                `Delivery technology ${delivery}`,
                `Reliability technology ${reliability}`,
                `Content operations ${contentOperations}`,
                `Product experience ${productExperience}`,
            ]
            : [],
    };
};

export const getStreamingReachConfigurationKey = (
    reach: StreamingReachResolution,
): string => `reach-model-v1:${reach.available ? reach.key : 'UNAVAILABLE'}`;
