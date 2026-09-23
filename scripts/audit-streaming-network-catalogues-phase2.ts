import { PRODUCTION_LOCATION_CATALOG } from '../services/productionLocations';
import { PROPERTY_CATALOG } from '../services/lifestyleLogic';
import { quoteRealEstateSale } from '../services/realEstateLogic';
import { REAL_ESTATE_DEALERS, getDealerStock } from '../services/realEstateDealers';
import {
    STREAMING_CLOUD_PROVIDERS,
    getStreamingCloudProvider,
} from '../services/streamingCloudProviders';
import {
    MAX_FIBRE_LEVEL,
    STREAMING_FIBRE_GENERATIONS,
    fibreMultiplier,
    normalizeStreamingFibreState,
} from '../services/streamingFibreLadder';
import {
    STREAMING_SERVER_SITES,
    getStreamingServerSite,
} from '../services/streamingServerSites';
import {
    STREAMING_SITE_PLACES,
    getOfferedTenures,
    getPlaceByListingId,
    getStreamingSitePlaces,
    listingIdForPlace,
} from '../services/streamingSitePlaces';
import { paybackWeeks, purchasePriceFor, tenureOf } from '../services/streamingTenure';
import { audiencePlaces } from '../services/worldPopulationClusters';
import { COUNTRY_GEOGRAPHY } from '../services/worldEconomy/worldCountryGeography.generated';
import { POPULATION_CLUSTERS } from '../services/worldEconomy/worldPopulationClusters.generated';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';

const assert: (condition: unknown, message: string) => void = (condition, message) => {
    if (!condition) throw new Error(message);
};

assert(STREAMING_SERVER_SITES.length === 194, `Expected 194 canonical server sites, found ${STREAMING_SERVER_SITES.length}.`);
assert(new Set(STREAMING_SERVER_SITES.map(site => site.id)).size === STREAMING_SERVER_SITES.length, 'Server-site ids must be unique.');
assert(
    PRODUCTION_LOCATION_CATALOG.every(location => Boolean(getStreamingServerSite(location.id))),
    'Every legacy production-location id must resolve to a server site so existing saves remain loadable.',
);
assert(
    STREAMING_SERVER_SITES.every(site => Number.isFinite(site.latitude)
        && site.latitude >= -90 && site.latitude <= 90
        && Number.isFinite(site.longitude) && site.longitude >= -180 && site.longitude <= 180
        && site.quality >= 0 && site.quality <= 10
        && site.costIndex > 0 && site.powerPricePerKwh > 0
        && site.transit > 0 && site.transit <= 1),
    'Every server site must carry valid coordinates and positive engineering economics.',
);

assert(WORLD_COUNTRY_DEFINITIONS.length === 197, `Expected 197 world countries, found ${WORLD_COUNTRY_DEFINITIONS.length}.`);
assert(
    WORLD_COUNTRY_DEFINITIONS.every(country => Boolean(COUNTRY_GEOGRAPHY[country.id])),
    'Every world-economy country must have canonical geography.',
);
assert(
    COUNTRY_GEOGRAPHY.AU?.[0] === '036'
        && COUNTRY_GEOGRAPHY.AU?.[1] === -33
        && COUNTRY_GEOGRAPHY.AU?.[2] === 148.5,
    'Australia must resolve to the mainland geometry, not an island sharing its source map id.',
);
assert(
    Object.values(COUNTRY_GEOGRAPHY).every(([, lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)),
    'Every country geography anchor must be finite.',
);

const clusterCount = Object.values(POPULATION_CLUSTERS).reduce((sum, clusters) => sum + clusters.length, 0);
assert(clusterCount === 398, `Expected 398 population clusters, found ${clusterCount}.`);
assert(
    WORLD_COUNTRY_DEFINITIONS.every(country => {
        const clusters = audiencePlaces(country.id);
        const share = clusters.reduce((sum, cluster) => sum + cluster.share, 0);
        return clusters.length > 0 && Math.abs(share - 1) <= 0.02;
    }),
    'Every country must have population clusters whose audience shares sum to one.',
);

assert(STREAMING_SITE_PLACES.length > STREAMING_SERVER_SITES.length, 'Every city must offer more than a single undifferentiated room.');
assert(new Set(STREAMING_SITE_PLACES.map(place => place.id)).size === STREAMING_SITE_PLACES.length, 'Site-place ids must be unique.');
assert(
    STREAMING_SERVER_SITES.every(site => getStreamingSitePlaces(site.id).some(place => getOfferedTenures(place).length > 0)),
    'Every server site must expose at least one holdable place.',
);
assert(
    STREAMING_SITE_PLACES.every(place => getPlaceByListingId(listingIdForPlace(place))?.id === place.id),
    'Place/listing conversion must round-trip without ambiguity.',
);
assert(
    STREAMING_SITE_PLACES.every(place => place.rackPositions > 0
        && place.expansionRackPositions >= 0
        && place.powerPricePerKwh > 0
        && place.uptime >= 99 && place.uptime <= 100
        && place.transit > 0 && place.transit <= 1),
    'Every place must expose a valid physical and operating envelope.',
);

assert(STREAMING_CLOUD_PROVIDERS.length === 3, 'The canonical cloud market must contain exactly three providers.');
assert(getStreamingCloudProvider('ATLAS')?.rateMultiplier === 1, 'Atlas must remain the neutral migration/default provider.');
assert(getStreamingCloudProvider('NORTHWIND')?.rateMultiplier === 0.7, 'Northwind must preserve its low-cost trade-off.');
assert(getStreamingCloudProvider('MERIDIAN')?.reachMultiplier === 1.5, 'Meridian must preserve its premium reach trade-off.');

assert(STREAMING_FIBRE_GENERATIONS.length === 5 && MAX_FIBRE_LEVEL === 100, 'The fibre ladder must expose five generations with 100 levels each.');
assert(
    STREAMING_FIBRE_GENERATIONS.slice(0, -1).every((generation, index) => (
        generation.ceiling === STREAMING_FIBRE_GENERATIONS[index + 1]?.floor
    )),
    'Each fibre generation ceiling must equal the next generation floor.',
);
assert(fibreMultiplier({ generation: 0, level: 100 }) === fibreMultiplier({ generation: 1, level: 0 }), 'Fibre generation transitions must be continuous.');
assert(normalizeStreamingFibreState({ generation: 99, level: -20 }).generation === 4, 'Fibre save normalization must clamp unknown future values.');

assert(paybackWeeks() === 260, 'Owned property payback must remain exactly five 52-week years.');
assert(purchasePriceFor(10_000) === 2_600_000, 'Purchase price must equal five years of equivalent rent.');
assert(tenureOf(undefined) === 'RENTED', 'Legacy saves without tenure must normalize to rented.');

assert(REAL_ESTATE_DEALERS.length >= 4, 'The property market must expose distinct dealer shelves.');
assert(
    PROPERTY_CATALOG.every(property => REAL_ESTATE_DEALERS.some(dealer => getDealerStock(dealer.id).some(stock => stock.id === property.id))),
    'Every lifestyle property must appear in at least one dealer catalogue.',
);
const saleFixture = PROPERTY_CATALOG[0];
const saleQuote = quoteRealEstateSale(saleFixture, {
    currentValue: Math.round(saleFixture.price * 0.7),
    condition: 100,
});
assert(saleQuote.marketValue < saleFixture.price, 'A property in a slump must be allowed to fall below its purchase price.');
assert(saleQuote.saleProceeds < saleQuote.marketValue, 'Selling must apply a market-cycle spread instead of a fixed punitive haircut.');

console.log('Streaming Phase 2 catalogue audit passed.');
