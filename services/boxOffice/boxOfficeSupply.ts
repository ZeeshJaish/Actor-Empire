import { CINEMA_CHAINS } from '../cinemaChains';
import { WORLD_COUNTRY_DEFINITIONS, WORLD_COUNTRY_DEFINITIONS_BY_ID } from '../worldEconomy/worldCountryRegistry';
import { apportionCinemaIntegers, cinemaCount } from './boxOfficeMath';
import { CINEMA_SUPPLY_PROFILE as P } from './boxOfficeProfiles';
import type { CinemaSupplyQuote, CinemaWeekInput } from './boxOfficeTypes';

// Existing NPC infrastructure is a fixed partition of the complete registry, not
// an investment/expansion system. Current population/access changes demand, not
// the location of these screens. Baseline access weights are versioned supply assumptions.
const baselineAccess = { LOW:21, EMERGING:43, DEVELOPED:68, ADVANCED:79 } as const;
const existingFootprint = new Map<string,number>();
for(const chain of CINEMA_CHAINS) for(const region of Object.keys(chain.regionalTerms)) {
    const countries=WORLD_COUNTRY_DEFINITIONS.filter(c=>c.regionId===region);
    const shares=apportionCinemaIntegers(chain.regionalTerms[countries[0].regionId].screens,
        countries.map(c=>({id:c.id,weight:Math.round(c.baselinePopulation*baselineAccess[c.developmentProfile])})),0,0);
    for(const country of countries)existingFootprint.set(`${chain.id}:${country.id}`,shares.get(country.id)||0);
}

/** Country quotes read the existing complete-world network, independent of the caller's subset. */
export const quoteCinemaSupply = (input: CinemaWeekInput): CinemaSupplyQuote => {
    const pools: CinemaSupplyQuote['pools']=[], offers: CinemaSupplyQuote['offers']=[];
    const countries=[...(input.countries || [])].sort((a,b)=>a.id.localeCompare(b.id));
    for(const country of countries) {
        if (!WORLD_COUNTRY_DEFINITIONS_BY_ID[country.id] || WORLD_COUNTRY_DEFINITIONS_BY_ID[country.id].regionId!==country.regionId) throw new Error('Unknown cinema country/region');
        cinemaCount(country.population,'country population');
    }
    for(const chain of CINEMA_CHAINS) for(const region of [...new Set(countries.map(c=>c.regionId))].sort()) {
        const terms=chain.regionalTerms[region];
        const regional=countries.filter(c=>c.regionId===region);
        for(const country of regional) {
            const total=existingFootprint.get(`${chain.id}:${country.id}`) || 0;
            const premium=Math.floor(total*P.premiumScreenShare);
            for(const format of ['STANDARD','PREMIUM'] as const) {
                const count=format==='PREMIUM'?premium:total-premium;
                if(!count) continue;
                const seasonal=input.absoluteWeek%52>=46?1.05:1;
                const economy=.2+Math.max(0,Math.min(150,country.purchasingPower))/100;
                const inflation=1+Math.max(0,Math.min(100,country.inflation))*.003;
                const chainPremium=chain.audienceStrengths.includes('PREMIUM')?1.12:1;
                const ticketPriceCents=Math.round(P.standardBasePriceCents*economy*inflation*chainPremium*seasonal*(format==='PREMIUM'?P.premiumPriceMultiplier:1));
                pools.push({id:`${country.id}:${chain.id}:${format}`,countryId:country.id,chainId:chain.id,format,screens:count,
                    seatsPerShow:P.seatsPerShow,weeklyScreenMinutes:count*P.openingMinutesPerDay*P.daysPerWeek,ticketPriceCents,
                    exhibitorBasisPoints:Math.round(terms.exhibitorCut*10_000),distributionBasisPoints:500,
                    operatingCentsPerShow:Math.max(1,Math.round(P.standardOperatingCentsPerShow*economy*inflation*chainPremium*(format==='PREMIUM'?1.2:1))),
                    bookingCentsPerShow:0,
                    legacyBookingCentsPerShow:Math.max(1,Math.round(terms.bookingCost*100/(terms.screens*P.daysPerWeek*4)))});
            }
        }
    }
    for(const title of [...input.titles].sort((a,b)=>a.id.localeCompare(b.id))) {
        const m=title.market;
        if(!m || m.releaseWeek>input.absoluteWeek) continue;
        for(const pool of pools) {
            if(!m.countryIds.includes(pool.countryId) || !(m.chainIdsByCountry?.[pool.countryId] || m.chainIds).includes(pool.chainId) || m.format!==pool.format) continue;
            if(input.marketState?.runs.some(r=>r.titleId===title.id && r.poolId===pool.id && r.closed)) continue;
            offers.push({titleId:title.id,poolId:pool.id});
        }
    }
    return {pools:pools.sort((a,b)=>a.id.localeCompare(b.id)),offers:offers.sort((a,b)=>a.titleId.localeCompare(b.titleId)||a.poolId.localeCompare(b.poolId))};
};
