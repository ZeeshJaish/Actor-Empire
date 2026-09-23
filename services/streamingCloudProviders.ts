import type { BoxOfficeRegionId, StreamingCloudProviderId } from '../types';

export interface StreamingCloudProvider {
    id: StreamingCloudProviderId;
    name: string;
    line: string;
    rateMultiplier: number;
    reachMultiplier: number;
    ceilingMultiplier: number;
    regions: 'ALL' | readonly BoxOfficeRegionId[];
}

export const STREAMING_CLOUD_PROVIDERS: readonly StreamingCloudProvider[] = [
    {
        id: 'ATLAS',
        name: 'Atlas Compute',
        line: 'Everywhere, at the going rate, and further than a building.',
        rateMultiplier: 1,
        reachMultiplier: 1.2,
        ceilingMultiplier: 1,
        regions: 'ALL',
    },
    {
        id: 'NORTHWIND',
        name: 'Northwind',
        line: 'Cheaper, and reaches no further than a building. Not sold in Africa or South America.',
        rateMultiplier: 0.7,
        reachMultiplier: 1,
        ceilingMultiplier: 1,
        regions: ['NORTH_AMERICA', 'EUROPE', 'ASIA', 'OCEANIA'],
    },
    {
        id: 'MERIDIAN',
        name: 'Meridian Edge',
        line: 'Reaches furthest, sells the smallest plans, sends the biggest bill.',
        rateMultiplier: 1.45,
        reachMultiplier: 1.5,
        ceilingMultiplier: 0.6,
        regions: 'ALL',
    },
];

const PROVIDERS_BY_ID = new Map(STREAMING_CLOUD_PROVIDERS.map(provider => [provider.id, provider]));

export const getStreamingCloudProvider = (
    id: StreamingCloudProviderId | string | null | undefined,
): StreamingCloudProvider | undefined => PROVIDERS_BY_ID.get(String(id || '').trim().toUpperCase() as StreamingCloudProviderId);

export const streamingCloudProviderServes = (
    provider: StreamingCloudProvider,
    regionId: BoxOfficeRegionId | string,
): boolean => provider.regions === 'ALL' || provider.regions.includes(regionId as BoxOfficeRegionId);

export const DEFAULT_STREAMING_CLOUD_PROVIDER_ID: StreamingCloudProviderId = 'ATLAS';
export const STREAMING_CLOUD_EXTENSION_PREMIUM = 1.5;
