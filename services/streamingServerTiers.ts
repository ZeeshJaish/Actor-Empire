import type { StreamingServerTier } from '../types';

export interface StreamingServerTierSpec {
    id: StreamingServerTier;
    name: string;
    compute: number;
    draw: number;
    price: number;
    reach: number;
    minimumRoomPositions: number;
}

export const STREAMING_SERVER_TIER_ORDER: readonly StreamingServerTier[] = ['SCOUT', 'WORKHORSE', 'TITAN'];

export const STREAMING_SERVER_TIERS: Record<StreamingServerTier, StreamingServerTierSpec> = {
    SCOUT: { id: 'SCOUT', name: 'Scout', compute: 0.6, draw: 0.6, price: 0.5, reach: 0.62, minimumRoomPositions: 1 },
    WORKHORSE: { id: 'WORKHORSE', name: 'Workhorse', compute: 1, draw: 1, price: 1, reach: 1, minimumRoomPositions: 2 },
    TITAN: { id: 'TITAN', name: 'Titan', compute: 1.8, draw: 1.6, price: 2.2, reach: 1.7, minimumRoomPositions: 8 },
};

export const STREAMING_VIEWERS_PER_WORKHORSE = 65_000;
export const STREAMING_RACK_BUILD_COST = 3_750_000;
export const STREAMING_POWER_KW_PER_WORKHORSE = 12;
export const STREAMING_COOLING_KW_PER_WORKHORSE = 11;
export const STREAMING_PIPE_MBPS_PER_WORKHORSE = 2_000;
