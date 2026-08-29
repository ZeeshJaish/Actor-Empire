import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    createStreamingFacilityFromListing,
    getRecommendedStreamingFacilityListing,
    getStreamingFacilityMarketplace,
} from '../services/streamingFacilityMarketplace';
import {
    getStreamingFacilityCapacity,
    getStreamingFacilitySetupCost,
    getStreamingFacilityWeeklyRent,
    normalizeStreamingFacilityLease,
} from '../services/streamingFacilities';
import {
    derive,
    type BuildInputs,
    type BuildSel,
} from '../components/streaming-transplant/StreamingBuildoutExperience';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const first = getStreamingFacilityMarketplace('NYC');
const repeated = getStreamingFacilityMarketplace('NYC');
assert(JSON.stringify(first) === JSON.stringify(repeated), 'The city marketplace must be deterministic.');
assert(first.length === 6, 'A major city should expose five lease formats and the future owned-campus path.');
assert(
    first.map(listing => listing.facilityType).join(',')
        === 'CLOUD_ALLOCATION,RENTED_CABINET,PRIVATE_CAGE,PRIVATE_SUITE,DEDICATED_DATA_HALL,OWNED_DATA_CENTRE',
    'Marketplace listings must appear in the intended facility progression.',
);
assert(first.at(-1)?.status === 'RESEARCH_REQUIRED', 'Owned data centres must remain research-locked.');
for (const listing of first) {
    assert(listing.listingId && listing.providerName, 'Every listing needs a stable identity and provider.');
    assert(listing.rackPositions > 0, 'Every listing needs a fixed physical rack limit.');
    assert(listing.depositCost >= 0 && listing.setupCost >= 0 && listing.weeklyRent >= 0, 'Every listing needs explicit move-in and rent economics.');
    assert(listing.electricityRatePerKwh > 0, 'Every listing needs an electricity rate.');
    assert(listing.taxRatePercent >= 0, 'Every listing needs a tax rate.');
    assert(listing.reliabilityPercent >= 95, 'Every listing needs an operational reliability forecast.');
    assert(listing.contractWeeks > 0, 'Every listing needs a contract term.');
    assert(listing.provisioningWeeks >= 0, 'Every listing needs provisioning time.');
}

const cabinet = first.find(listing => listing.facilityType === 'RENTED_CABINET');
assert(cabinet, 'New York should have a rented-cabinet listing.');
const one = createStreamingFacilityFromListing(cabinet!, [], 'CORE_ORIGIN', cabinet!.rackPositions);
const two = createStreamingFacilityFromListing(cabinet!, [one], 'EDGE_CACHE', 1);
assert(one.id !== two.id, 'Leasing the same city twice must create separate facilities.');
assert(one.cityId === two.cityId, 'Multiple facilities must be allowed inside one city.');
assert(getStreamingFacilityCapacity(one) === cabinet!.rackPositions, 'A signed listing must preserve its fixed rack limit.');
assert(getStreamingFacilitySetupCost(one) === cabinet!.depositCost + cabinet!.setupCost, 'Move-in cost must include deposit and setup.');
assert(getStreamingFacilityWeeklyRent(one) === cabinet!.weeklyRent, 'Weekly rent must come from the signed listing snapshot.');
assert(
    JSON.stringify(normalizeStreamingFacilityLease(one.lease, one.type)) === JSON.stringify(one.lease),
    'A selected listing must survive save normalization without economic drift.',
);

const sameCitySelection: BuildSel = {
    placements: [],
    facilities: [one, two],
    arch: 'HYBRID',
    doctrine: 'STANDARD',
    campaign: 'NONE',
};
const sameCityInputs: BuildInputs = {
    treasury: 200_000_000,
    catalogueSpend: 0,
    catalogueTitles: 0,
    originalsSpend: 0,
    originalsCount: 0,
    premiereTitle: 'Test Signal',
    regions: ['NORTH_AMERICA'],
    coverageRegions: ['NORTH_AMERICA'],
    markets: [{
        id: 'US',
        country: 'United States',
        region: 'NORTH_AMERICA',
        audience: 225_000_000,
        annualGrowthPercent: 3,
        recommendedCityId: 'NYC',
        localizationNote: 'English launch.',
    }],
    homeCityId: null,
    audienceMul: 1,
};
const sameCityDerived = derive(sameCitySelection, sameCityInputs);
assert(sameCityDerived.halls.length === 2, 'Two leases in one city must remain two physical facilities.');
assert(sameCityDerived.uniqueCityCount === 1, 'Two leases in one city must count as one outage location.');
assert(
    sameCityDerived.halls[0].load === sameCityDerived.halls[1].load,
    'Same-city facilities must read pooled city load rather than duplicating the city audience.',
);

const recommendation = getRecommendedStreamingFacilityListing('BOM', 5, false);
assert(recommendation && recommendation.rackPositions >= 5, 'Assisted mode must recommend a real listing with enough physical room.');
assert(recommendation?.facilityType !== 'CLOUD_ALLOCATION', 'Physical-first recommendations should not silently become cloud allocations.');

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const buildSource = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
const infrastructureSource = source('services/streamingInfrastructure.ts');
const platformSource = source('services/ownedStreamingPlatform.ts');
const styles = source('components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css');
[
    'LIVE SPACE MARKET',
    'LEASE SPACE, THEN INSTALL RACKS',
    'A full room stays full',
    'LEASE ANOTHER',
    'Draft only. Deposits, setup and rent enter the forecast now; treasury moves only when you commission.',
].forEach(fragment => assert(buildSource.includes(fragment), `Phase 3 UI should include ${fragment}.`));
assert(!buildSource.includes('setFacilityType'), 'A facility type must never mutate into a larger room.');
assert(buildSource.includes('createStreamingFacilityFromListing'), 'Marketplace contracts must create separate facility records.');
assert(buildSource.includes('capacityByCity'), 'Same-city facility capacity must be pooled before load is calculated.');
assert(buildSource.includes('new Set(halls.map(hall => hall.city.id)).size'), 'Opening-night rehearsal must aggregate facilities into distinct cities.');
assert(infrastructureSource.includes('normalizeStreamingFacilityLease'), 'Draft normalization must preserve signed listing terms.');
assert(platformSource.includes('normalizeStreamingFacilityLease'), 'Company-save migration must preserve signed listing terms.');
assert(styles.includes('.marketHero') && styles.includes('.marketListing') && styles.includes('.contractFacts'), 'The marketplace needs its cinematic, listing and contract visual system.');
assert(!buildSource.includes('Math.random') && !source('services/streamingFacilityMarketplace.ts').includes('Math.random'), 'Listings and recommendations must never use uncontrolled randomness.');

console.log('EMPIRE+ Facility Marketplace and Contracts Phase 3 audit passed.');
