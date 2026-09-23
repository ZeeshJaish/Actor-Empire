import type { BoxOfficeRegionId, OwnedStreamingFacility } from '../types';
import { getStreamingCloudProvider } from './streamingCloudProviders';
import { expectedStandard, fibreMultiplier, type StreamingFibreState } from './streamingFibreLadder';
import { getStreamingServerSite, hasDataResidencyRule } from './streamingServerSites';
import { getPlaceByListingId } from './streamingSitePlaces';
import { STREAMING_SERVER_TIERS } from './streamingServerTiers';
import { audiencePlaces } from './worldPopulationClusters';
import { COUNTRY_GEOGRAPHY } from './worldEconomy/worldCountryGeography.generated';
import { WORLD_COUNTRY_DEFINITIONS_BY_ID } from './worldEconomy/worldCountryRegistry';

export type StreamingCoverageGrade = 'SERVED' | 'THIN' | 'DARK';

export interface StreamingCountryCoverage {
    countryId: string;
    regionId: BoxOfficeRegionId;
    population: number;
    reachedShare: number;
    reachedPopulation: number;
    /** Geographic reach strong enough for a smooth stream at launch. */
    coveredShare: number;
    coveredPopulation: number;
    /** Portion of covered audience whose strongest delivery source is cloud. */
    cloudServedShare: number;
    grade: StreamingCoverageGrade;
}

export interface StreamingRegionCoverage {
    regionId: BoxOfficeRegionId;
    reachedShare: number;
    reachedPopulation: number;
    coveredShare: number;
    coveredPopulation: number;
    cloudServedShare: number;
    population: number;
    grade: StreamingCoverageGrade;
}

export interface StreamingNetworkCoverage {
    countries: StreamingCountryCoverage[];
    regions: StreamingRegionCoverage[];
    reachedShare: number;
    reachedPopulation: number;
    coveredShare: number;
    coveredPopulation: number;
    cloudServedShare: number;
    population: number;
}

export interface StreamingNetworkCoverageInput {
    facilities: readonly OwnedStreamingFacility[];
    openingCountryIds: readonly string[];
    fibreState?: StreamingFibreState;
}

const EARTH_RADIUS_KM = 6_371;
const distanceKm = (latA: number, lngA: number, latB: number, lngB: number): number => {
    const radians = Math.PI / 180;
    const deltaLat = (latB - latA) * radians;
    const deltaLng = (lngB - lngA) * radians;
    const a = Math.sin(deltaLat / 2) ** 2
        + Math.cos(latA * radians) * Math.cos(latB * radians) * Math.sin(deltaLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

export const STREAMING_SERVED_COVERAGE_SHARE = 0.8;
/** Truncate failed coverage to one decimal so 79.9% never reads as a passing 80%. */
export const formatStreamingCoveragePercent = (share: number): string =>
    Number.isFinite(share) ? `${Math.floor(Math.max(0, Math.min(1, share)) * 1000) / 10}%` : 'unavailable';
const gradeFor = (share: number): StreamingCoverageGrade => share >= STREAMING_SERVED_COVERAGE_SHARE ? 'SERVED' : share >= 0.2 ? 'THIN' : 'DARK';

interface CoverageSource {
    countryId: string;
    regionId: BoxOfficeRegionId;
    lat: number;
    lng: number;
    radiusKm: number;
    cloud: boolean;
}

const sourceFor = (facility: OwnedStreamingFacility, fibre: number): CoverageSource | null => {
    const site = getStreamingServerSite(facility.cityId);
    if (!site) return null;
    const groups = facility.rackGroups || [];
    let compute = 0;
    let weightedReach = 0;
    for (const group of groups) {
        const spec = STREAMING_SERVER_TIERS[group.serverTier || 'WORKHORSE'];
        compute += group.rackCount * spec.compute;
        weightedReach += group.rackCount * spec.compute * spec.reach;
    }
    if (compute <= 0) compute = Math.max(0, facility.installedRacks);
    if (weightedReach <= 0) weightedReach = compute;
    if (!Number.isFinite(compute) || compute <= 0 || !Number.isFinite(weightedReach)) return null;
    const placeTransit = getPlaceByListingId(facility.lease?.listingId || '')?.transit ?? site.transit;
    const providerReach = facility.lease?.tenure === 'CLOUD'
        ? getStreamingCloudProvider(facility.lease.cloudProvider || 'ATLAS')?.reachMultiplier || 1
        : 1;
    const tierReach = weightedReach / Math.max(0.01, compute);
    const radiusKm = 540 * Math.sqrt(compute) * (0.55 + placeTransit * 0.7) * tierReach * providerReach * fibre;
    if (!Number.isFinite(radiusKm) || radiusKm <= 0) return null;
    return {
        countryId: site.countryCode, regionId: site.regionId,
        lat: site.latitude, lng: site.longitude, radiusKm,
        cloud: facility.lease?.tenure === 'CLOUD' || facility.type === 'CLOUD_ALLOCATION',
    };
};

const normalizedShare = (value: number): number => Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0;

export const deriveStreamingNetworkCoverage = (
    input: StreamingNetworkCoverageInput,
): StreamingNetworkCoverage => {
    const fibre = fibreMultiplier(input.fibreState);
    const standard = expectedStandard(0);
    const sources = input.facilities.map(facility => sourceFor(facility, fibre)).filter(Boolean) as CoverageSource[];
    const countries = Array.from(new Set(input.openingCountryIds.map(id => id.trim().toUpperCase())))
        .map(countryId => {
            const country = WORLD_COUNTRY_DEFINITIONS_BY_ID[countryId];
            if (!country) return null;
            const geography = COUNTRY_GEOGRAPHY[countryId];
            const places = audiencePlaces(countryId, geography ? { lat: geography[1], lng: geography[2] } : undefined);
            // The rehearsal can only route through facilities in this country’s
            // service region. Geography must not promise a stream it cannot route.
            const eligible = sources.filter(source => source.regionId === country.regionId
                && (!hasDataResidencyRule(countryId) || source.countryId === countryId));
            let reachedShare = 0;
            let coveredShare = 0;
            let cloudServedShare = 0;
            for (const place of places) {
                let strongest: CoverageSource | null = null;
                let strongestStrength = 0;
                const missed = eligible.reduce((product, source) => {
                    const distance = distanceKm(source.lat, source.lng, place.lat, place.lng);
                    const strength = distance >= source.radiusKm ? 0 : Math.max(0, 1 - (distance / source.radiusKm) ** 2);
                    if (strength > strongestStrength) {
                        strongest = source;
                        strongestStrength = strength;
                    }
                    return product * (1 - strength);
                }, 1);
                const strength = normalizedShare(1 - missed);
                reachedShare += place.share * strength;
                if (strength >= standard) {
                    const served = place.share * strength;
                    coveredShare += served;
                    if (strongest?.cloud) cloudServedShare += served;
                }
            }
            const normalized = normalizedShare(reachedShare);
            const covered = Math.min(normalized, normalizedShare(coveredShare));
            const cloudServed = Math.min(covered, normalizedShare(cloudServedShare));
            return {
                countryId,
                regionId: country.regionId,
                population: country.baselinePopulation,
                reachedShare: normalized,
                reachedPopulation: Math.round(country.baselinePopulation * normalized),
                coveredShare: covered,
                coveredPopulation: Math.round(country.baselinePopulation * covered),
                cloudServedShare: cloudServed,
                grade: gradeFor(covered),
            } satisfies StreamingCountryCoverage;
        })
        .filter(Boolean) as StreamingCountryCoverage[];

    const regions = Array.from(new Set(countries.map(country => country.regionId))).map(regionId => {
        const held = countries.filter(country => country.regionId === regionId);
        const population = held.reduce((sum, country) => sum + country.population, 0);
        const reachedPopulation = held.reduce((sum, country) => sum + country.reachedPopulation, 0);
        const reachedShare = population > 0 ? reachedPopulation / population : 0;
        const coveredPopulation = held.reduce((sum, country) => sum + country.coveredPopulation, 0);
        const coveredShare = population > 0 ? coveredPopulation / population : 0;
        const cloudServedShare = population > 0
            ? held.reduce((sum, country) => sum + country.population * country.cloudServedShare, 0) / population
            : 0;
        return { regionId, reachedShare, reachedPopulation, coveredShare, coveredPopulation,
            cloudServedShare, population, grade: gradeFor(coveredShare) };
    });
    const population = countries.reduce((sum, country) => sum + country.population, 0);
    const reachedPopulation = countries.reduce((sum, country) => sum + country.reachedPopulation, 0);
    const coveredPopulation = countries.reduce((sum, country) => sum + country.coveredPopulation, 0);
    const cloudServedShare = population > 0
        ? countries.reduce((sum, country) => sum + country.population * country.cloudServedShare, 0) / population
        : 0;
    return { countries, regions, reachedShare: population > 0 ? reachedPopulation / population : 0,
        reachedPopulation, coveredShare: population > 0 ? coveredPopulation / population : 0,
        coveredPopulation, cloudServedShare, population };
};
