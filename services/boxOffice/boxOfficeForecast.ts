import { projectCinemaForecastInput } from './boxOfficeAwareness';
import { buildCinemaAudienceSnapshot } from './boxOfficeAudience';
import { simulateCinemaWeek } from './boxOfficeMarket';
import { quoteCinemaSupply } from './boxOfficeSupply';
import type { CinemaKnownInputs, CinemaWeekInput } from './boxOfficeTypes';

export interface CinemaRange { low:number; mid:number; high:number }
export interface CinemaForecastTitle {
    titleId:string; grossCents:CinemaRange; producerReceiptsCents:CinemaRange; admissions:CinemaRange;
    bookingCostCents:CinemaRange; attentionPotential:number; awarePeople:number;
    awarenessByCountry:Array<{countryId:string;awarePeople:number;people:number}>;
    theaterIntent:CinemaRange; availableScreens:number; ticketPriceCents:{low:number;high:number};
    breakEvenAdmissions:number|null; capacityConstrained:boolean;
}
export interface CinemaForecast { knowledge:'FORECAST'; absoluteWeek:number; titles:CinemaForecastTitle[]; drivers:string[] }
const range=(values:number[]):CinemaRange=>({low:Math.min(...values),mid:values[1],high:Math.max(...values)});
/** Bounded delivery scenarios, not confidence probabilities or lifetime promises. Never settles a receipt. */
export const forecastCinemaWeek=(input:CinemaWeekInput,known:CinemaKnownInputs):CinemaForecast=>{
    const projected=projectCinemaForecastInput(input,known);
    const safe={...projected,supply:projected.supply||quoteCinemaSupply(projected)};
    const scenarios=[0,1,2].map(index=>({...safe,cohorts:safe.cohorts.map(c=>({...c,market:c.market?{...c.market,interest:Math.max(0,Math.min(100,c.market.interest*[.85,1,1.15][index]))}:undefined})),titles:safe.titles.map(t=>({...t,delivery:{...t.delivery,
        estimatedQuality:index===1?t.delivery.estimatedQuality:t.delivery.qualityRange![index===0?0:1]}}))}));
    const results=scenarios.map(simulateCinemaWeek),snapshots=scenarios.map(buildCinemaAudienceSnapshot);
    const supply=safe.supply||quoteCinemaSupply(safe);
    return {knowledge:'FORECAST',absoluteWeek:safe.absoluteWeek,drivers:[
        'Scenarios vary visible delivery and audience intent by a bounded 15 percent; the midpoint uses current inputs. They use and the current competing slate. Future competition and production may change.',
        'Access supplies seats; recorded exposure supplies awareness. Prices and household budgets limit paid visits.',
        'Opening-week estimates are not lifetime earnings or promised payments.',
    ],titles:safe.titles.map(title=>{
        const rows=results.map(r=>r.titles.find(t=>t.titleId===title.id)!);
        const state=snapshots[1].titles.find(t=>t.titleId===title.id);
        const countries=[...new Set(safe.cohorts.map(c=>c.countryId))].filter(id=>title.market?.countryIds.includes(id));
        const awarenessByCountry=countries.map(countryId=>{const cohorts=safe.cohorts.filter(c=>c.countryId===countryId);return {countryId,
            people:cohorts.reduce((n,c)=>n+c.people,0),awarePeople:cohorts.reduce((n,c)=>n+(state?.cells.find(cell=>cell.cohortId===c.id)?.awarePeople||0),0)}});
        const pools=supply.pools.filter(p=>supply.offers.some(o=>o.titleId===title.id&&o.poolId===p.id));
        const costs=results.map(r=>r.costEvents.filter(e=>e.titleId===title.id).reduce((n,e)=>n+e.amountCents,0));
        const admissions=rows.map(r=>r.firstAdmissions+r.repeatAdmissions),mid=rows[1];
        const intent=snapshots.map(s=>s.choices.filter(c=>c.titleId===title.id&&c.kind!=='DEFER').reduce((n,c)=>n+c.requestedAdmissions,0));
        const marketing=(title.exposure?.events||[]).reduce((n,e)=>n+(e.paidCostCents||0),0);
        const receiptPerVisit=admissions[1]>0?mid.producerReceiptsCents/admissions[1]:0;
        return {titleId:title.id,grossCents:range(rows.map(r=>r.grossCents)),producerReceiptsCents:range(rows.map(r=>r.producerReceiptsCents)),
            admissions:range(admissions),bookingCostCents:range(costs),attentionPotential:title.exposure?.attentionPotential||0,
            awarePeople:awarenessByCountry.reduce((n,c)=>n+c.awarePeople,0),awarenessByCountry,theaterIntent:range(intent),
            availableScreens:pools.reduce((n,p)=>n+p.screens,0),ticketPriceCents:{low:pools.length?Math.min(...pools.map(p=>p.ticketPriceCents)):0,high:pools.length?Math.max(...pools.map(p=>p.ticketPriceCents)):0},
            breakEvenAdmissions:receiptPerVisit>0?Math.ceil((title.budgetCents+marketing+costs[1])/receiptPerVisit):null,
            capacityConstrained:intent[1]>admissions[1]};
    })};
};
