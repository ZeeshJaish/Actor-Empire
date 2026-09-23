import type {
    OwnedStreamingFacility,
    StreamingFacilityFibreGrade,
    StreamingFacilityLeaseSnapshot,
    StreamingFacilitySecurityGrade,
    StreamingFacilityType,
    StreamingNetworkNodeRole,
} from '../types';
import type { ProductionLocationContinentId } from './productionLocations';
import {
    getStreamingServerSite,
    getStreamingSiteBuildCost,
} from './streamingServerSites';
import { getOfferedTenures, getStreamingSitePlaces, listingIdForPlace, type StreamingTenure } from './streamingSitePlaces';
import { purchasePriceFor } from './streamingTenure';
import {
    createStreamingFacilityId,
    normalizeStreamingFacilityPhysical,
    STREAMING_FACILITY_CONTRACTS,
} from './streamingFacilities';
import { normalizeStreamingRackGroups } from './streamingRackGroups';

export type StreamingFacilityListingStatus = 'OPEN' | 'LIMITED' | 'RESEARCH_REQUIRED';

export interface StreamingFacilityMarketplaceListing extends StreamingFacilityLeaseSnapshot {
    /** Every way this building can be held. A place with both is the same room
        at two prices, which is the decision. */
    tenures: StreamingTenure[];
    cityId: string;
    facilityType: StreamingFacilityType;
    facilityName: string;
    shortName: string;
    description: string;
    status: StreamingFacilityListingStatus;
    marketNote: string;
}

/** Country-level World Economy facts used to quote a live facility contract.
 * The chosen terms are snapshotted onto the commissioned facility, so later
 * macro movement changes new offers rather than rewriting signed base rent. */
export interface StreamingFacilityMarketContext {
    absoluteWeek: number;
    purchasingPowerIndex: number;
    inflationPressure: number;
    consumerConfidence: number;
    reliableInternetPercent: number;
    commercialHouseholds: number;
}

const PROVIDERS: Record<ProductionLocationContinentId, string[]> = {
    NA: ['Northstar Colocation', 'Atlas Compute', 'MetroGrid Exchange'],
    SA: ['Andes Fibre House', 'SurGrid Digital', 'Aurora Colocation'],
    EU: ['Continental IX', 'Crown Fibre Works', 'Northline Compute'],
    AS: ['Pacific Relay', 'Zenith Data Exchange', 'Lotus Compute'],
    AF: ['Horizon Fibre House', 'Equator Compute', 'Sahara Exchange'],
    OC: ['Southern Cross Compute', 'Harbour IX', 'Pacific Vault'],
};

const TAX_BY_CONTINENT: Record<ProductionLocationContinentId, number> = {
    NA: 8.4,
    SA: 11.2,
    EU: 14.8,
    AS: 10.6,
    AF: 9.1,
    OC: 12.4,
};

const hash = (value: string): number => {
    let out = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        out ^= value.charCodeAt(index);
        out = Math.imul(out, 16777619);
    }
    return out >>> 0;
};

/* `TYPE_ORDER`, `securityFor`, `fibreFor` and `rackPositionsFor` lived here.
   All four answered a question about a BUILDING by looking at the CONTRACT
   TYPE, which is what welded size and quality to tenure. A building carries its
   own now — see `streamingSitePlaces.ts` — and these are deleted rather than
   left lying around for someone to wire back up. */

const roundMoney = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);
const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

/** Stable city listings. Chosen terms are copied onto the facility save. */
export const getStreamingFacilityMarketplace = (
    cityId: string,
    context?: StreamingFacilityMarketContext,
): StreamingFacilityMarketplaceListing[] => {
    /* The server-site catalogue, not the film-location one. This read
       `getProductionLocation`, which scores a place for how it looks on camera
       — so Marrakesh arrived with `quality: 8`, above Lagos and level with
       Berlin, and the two lines below turned that beauty score into a fibre
       grade and an uptime figure. A site carries its own engineering quality
       now. Every id the old catalogue held is still a site, so a saved
       facility still resolves. */
    const city = getStreamingServerSite(cityId);
    if (!city) return [];
    const cityCost = getStreamingSiteBuildCost(city) / 10_000_000;
    const providers = PROVIDERS[city.continentId];

    /* This used to walk `TYPE_ORDER` and quote one listing per contract type,
       deriving the rack count, the fibre grade and the security grade FROM that
       type. So every city offered the same six rungs, and there was no such
       thing as a small building you own or a big cheap one you rent.

       It walks the city's buildings now. A place carries its own ceiling, fibre,
       transit, uptime and power; the contract type it quotes under is a property
       OF the building rather than the thing that defines it. The listing id is
       unchanged — each archetype maps to a distinct contract type and a city
       holds at most one of each, so `LEASE-{city}-{type}-V1` is still unique and
       every saved facility still resolves. */
    const listings = getStreamingSitePlaces(city.id).flatMap((place, index) => {
        if (getOfferedTenures(place).length === 0) return [];
        const base = STREAMING_FACILITY_CONTRACTS.find(contract => contract.type === place.legacyType);
        if (!base?.marketplaceVisible) return [];
        const type = place.legacyType;
        const fingerprint = hash(`${city.id}.${type}.market-v1`);
        const variation = (fingerprint % 1_000) / 1_000;
        const marketPulse = context ? Math.sin((context.absoluteWeek + (fingerprint % 29)) / 13) * .025 : 0;
        const inflationFactor = context ? clamp(1 + (context.inflationPressure - 45) / 360, .78, 1.28) : 1;
        const demandFactor = context ? clamp(
            1 + (context.purchasingPowerIndex - 55) / 700
                + Math.log10(Math.max(1, context.commercialHouseholds)) / 180,
            .88,
            1.16,
        ) : 1;
        const confidenceFactor = context ? clamp(1 + (context.consumerConfidence - 50) / 900, .94, 1.06) : 1;
        const providerName = providers[(fingerprint + index) % providers.length];
        const status: StreamingFacilityListingStatus = variation > 0.78 ? 'LIMITED' : 'OPEN';
        const priceNoise = 0.93 + variation * 0.14;
        /* Rent follows the building, not just the contract: a hall with twice
           the positions costs about twice as much to sit in. */
        const sizeFactor = base.capacityRacks > 0 ? place.rackPositions / base.capacityRacks : 1;
        const weeklyRent = roundMoney(
            base.weeklyLease * cityCost * sizeFactor * priceNoise * inflationFactor * demandFactor * confidenceFactor * (1 + marketPulse),
        );
        const setupCost = roundMoney(base.setupCost * cityCost * sizeFactor * (0.92 + variation * 0.16) * inflationFactor * (1 + marketPulse * .6));
        const depositWeeks = type === 'CLOUD_ALLOCATION' ? 2 : type === 'RENTED_CABINET' ? 4 : 8;
        return [{
            listingId: listingIdForPlace(place),
            cityId: city.id,
            facilityType: type,
            facilityName: place.name,
            shortName: base.shortName,
            description: place.note,
            providerName,
            rackPositions: place.rackPositions,
            depositCost: roundMoney(weeklyRent * depositWeeks),
            setupCost,
            weeklyRent,
            /* The place quotes cents; this field is dollars. */
            electricityRatePerKwh: Math.round(
                (place.powerPricePerKwh / 100) * inflationFactor * (1 + marketPulse) * 100,
            ) / 100,
            taxRatePercent: Math.round((TAX_BY_CONTINENT[city.continentId] + (fingerprint % 25) / 10 + (context ? (context.inflationPressure - 45) / 45 : 0)) * 10) / 10,
            reliabilityPercent: Math.min(99.999, Math.round(
                (place.uptime + (context ? (context.reliableInternetPercent - 70) * .0018 : 0)) * 1_000,
            ) / 1_000),
            securityGrade: place.security,
            fibreGrade: place.fibre,
            contractWeeks: type === 'CLOUD_ALLOCATION' ? 13 : type === 'RENTED_CABINET' ? 26 : type === 'PRIVATE_CAGE' ? 52 : 104,
            provisioningWeeks: Math.max(0, base.provisioningWeeks + (status === 'LIMITED' ? 1 : 0)
                + (context && context.reliableInternetPercent < 55 ? 1 : 0)
                + (context && context.consumerConfidence < 30 ? 1 : 0)),
            expansionRackPositions: place.expansionRackPositions,
            /* What the same building costs outright, when it can be bought at
               all. Five years of this listing's own rent, so the comparison is
               against the number right beside it. */
            /* Filled in below: a building nobody will rent you has no rent to
               price against, so it is priced against what this city's rentable
               space actually costs. */
            purchasePrice: undefined as number | undefined,
            tenures: getOfferedTenures(place),
            status,
            marketNote: status === 'LIMITED'
                ? 'Last suitable space in this building; provisioning takes longer.'
                : place.note,
            place,
        }];
    });

    /* --- what a building costs to buy ---------------------------------------

       Five years of the equivalent rent. For anything you could also rent, that
       is its own rent and the comparison sits on the same card.

       The campus cannot be rented, so it has no rent of its own — and the first
       version priced it off the `OWNED_DATA_CENTRE` contract's `weeklyLease`,
       which is $180,000 for 96 racks against a data hall's $310,000 for 32.
       That figure was always about OPERATING a place you own, not renting one,
       so the best building in the game came out at $57M for 100 racks while an
       industrial shed cost $107M for 38 — five times cheaper per rack, and the
       whole progression inverted.

       An unrentable building is priced against what rentable space in this same
       city actually goes for, per rack. */
    const onlyOwned = (tenures: StreamingTenure[]): boolean => (
        tenures.length === 1 && tenures[0] === 'OWNED'
    );
    const rentable = listings.filter(entry => entry.tenures.includes('RENTED') && entry.rackPositions > 0);
    const rentPerRack = rentable.length > 0
        ? rentable.reduce((sum, entry) => sum + entry.weeklyRent / entry.rackPositions, 0) / rentable.length
        : 0;

    return listings.map(({ place, ...listing }) => ({
        ...listing,
        /* A building nobody will rent you does not get to quote a rent. The
           campus was showing $220K a week beside a price it could only ever be
           bought at, which reads as a choice that is not on offer.

           The test is "owned and nothing else", not "not RENTED" — a cloud
           allocation's tenure is CLOUD, and the first version of this line
           zeroed the weekly bill on the one thing in the game that is nothing
           BUT a weekly bill. */
        weeklyRent: onlyOwned(listing.tenures) ? 0 : listing.weeklyRent,
        depositCost: onlyOwned(listing.tenures) ? 0 : listing.depositCost,
        purchasePrice: place.tenures.includes('OWNED')
            ? purchasePriceFor(
                listing.tenures.includes('RENTED')
                    ? listing.weeklyRent
                    : rentPerRack * listing.rackPositions,
            )
            : undefined,
    }));
};

export const getRecommendedStreamingFacilityListing = (
    cityId: string,
    minimumRacks = 1,
    preferCloud = false,
): StreamingFacilityMarketplaceListing | null => {
    const listings = getStreamingFacilityMarketplace(cityId).filter(listing => (
        listing.status !== 'RESEARCH_REQUIRED' && listing.rackPositions >= minimumRacks
    ));
    if (preferCloud) {
        const cloud = listings.find(listing => listing.facilityType === 'CLOUD_ALLOCATION');
        if (cloud) return cloud;
    }
    return listings.find(listing => listing.facilityType !== 'CLOUD_ALLOCATION') || listings[0] || null;
};

export const createStreamingFacilityFromListing = (
    listing: StreamingFacilityMarketplaceListing,
    existingFacilities: OwnedStreamingFacility[],
    role: StreamingNetworkNodeRole,
    installedRacks = 1,
    /* How it is being held, and when. Both default to what every caller meant
       before ownership existed: a lease, signed at an unrecorded week. An
       unrecorded week is treated as never expiring rather than as overdue, so
       an old save is never evicted from a room over a field that did not exist
       when it was written. */
    tenure: StreamingTenure = 'RENTED',
    signedAtAbsoluteWeek?: number,
): OwnedStreamingFacility => {
    const usedIds = new Set(existingFacilities.map(facility => facility.id));
    let ordinal = existingFacilities.filter(facility => facility.cityId === listing.cityId).length + 1;
    let id = createStreamingFacilityId(listing.cityId, ordinal);
    while (usedIds.has(id)) {
        ordinal += 1;
        id = createStreamingFacilityId(listing.cityId, ordinal);
    }
    const lease: StreamingFacilityLeaseSnapshot = {
        listingId: listing.listingId,
        providerName: listing.providerName,
        rackPositions: listing.rackPositions,
        /* An owned building has no rent and no deposit. What it has is the
           cheque that bought it, kept below so a sale price later has something
           honest to be measured against. */
        depositCost: tenure === 'OWNED' ? 0 : listing.depositCost,
        setupCost: listing.setupCost,
        weeklyRent: tenure === 'OWNED' ? 0 : listing.weeklyRent,
        electricityRatePerKwh: listing.electricityRatePerKwh,
        taxRatePercent: listing.taxRatePercent,
        reliabilityPercent: listing.reliabilityPercent,
        securityGrade: listing.securityGrade,
        fibreGrade: listing.fibreGrade,
        contractWeeks: listing.contractWeeks,
        provisioningWeeks: listing.provisioningWeeks,
        expansionRackPositions: listing.expansionRackPositions,
        tenure,
        startedAtAbsoluteWeek: signedAtAbsoluteWeek,
        purchasePrice: tenure === 'OWNED' ? listing.purchasePrice : undefined,
    };
    const safeInstalledRacks = Math.max(1, Math.min(listing.rackPositions, Math.round(installedRacks)));
    return {
        id,
        cityId: listing.cityId,
        type: listing.facilityType,
        installedRacks: safeInstalledRacks,
        role,
        rackGroups: normalizeStreamingRackGroups(undefined, id, safeInstalledRacks, role),
        lease,
        physical: normalizeStreamingFacilityPhysical(undefined, listing.facilityType, safeInstalledRacks, lease),
    };
};
