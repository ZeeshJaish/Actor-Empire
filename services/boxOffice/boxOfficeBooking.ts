import { allocateCinemaResources, cinemaKey } from './boxOfficeMath';
import { CINEMA_SUPPLY_PROFILE as P } from './boxOfficeProfiles';
import type { CinemaRunState, CinemaSupplyPool } from './boxOfficeTypes';

export interface CinemaBookingRequest {
    id:string; demand:number; minutes:number; discovery:boolean; prior?:CinemaRunState;
}
export const cinemaOperatingCostPerShow = (pool:CinemaSupplyPool):number => pool.operatingCentsPerShow
    ?? Math.round(pool.ticketPriceCents*pool.seatsPerShow*P.minimumOccupancy*pool.exhibitorBasisPoints/10_000);

/** Public local demand plus observed attendance; no budget, owner privilege or secret craft input. */
export const planCinemaBookings = (pool:CinemaSupplyPool, requests:readonly CinemaBookingRequest[],seed:number,week:number) => {
    const operating=cinemaOperatingCostPerShow(pool);
    const desired=requests.map(r=>{
        // Smooth a renewal against what the exhibitor actually sold, while allowing a sleeper to grow.
        const prior=r.prior?.lastAdmissions;
        const expected=prior===undefined ? r.demand : Math.round(r.demand*.75+Math.min(prior,r.demand*2)*.25);
        const block=P.minimumShowsPerBooking;
        const commercialShows=expected>0?Math.max(block,Math.ceil(expected/(pool.seatsPerShow*P.targetOccupancy)/block)*block):0;
        const contribution=expected*pool.ticketPriceCents*pool.exhibitorBasisPoints/10_000-commercialShows*operating;
        const viable=commercialShows>0 && contribution>0;
        const wanted=viable ? commercialShows : r.discovery ? 1 : 0;
        return {...r,wanted,score:viable?contribution/Math.max(1,wanted*r.minutes): -operating/r.minutes};
    });
    // When binding, a lower-value booking cannot consume the time required by a stronger local alternative.
    // In a slack market every commercially viable request keeps its requested footprint.
    let minutes=pool.weeklyScreenMinutes;
    const ranked=[...desired].sort((a,b)=>b.score-a.score||cinemaKey(seed,week,a.id)-cinemaKey(seed,week,b.id)||a.id.localeCompare(b.id));
    const selected=new Map<string,number>();
    // Establish feasible small bookings before expanding them. Identical local
    // alternatives should compete for attendance, not lose all access on an ID tie.
    for(const r of ranked){const n=Math.min(r.wanted,P.minimumShowsPerBooking,Math.floor(minutes/r.minutes));selected.set(r.id,n);minutes-=n*r.minutes}
    for(const r of ranked){const n=Math.min(r.wanted-selected.get(r.id)!,Math.floor(minutes/r.minutes));selected.set(r.id,selected.get(r.id)!+n);minutes-=n*r.minutes}
    const shows=packShows(pool,desired.map(r=>({...r,wanted:selected.get(r.id)||0})),seed,week);
    return {shows,requested:new Map(desired.map(r=>[r.id,r.wanted]))};
};

/** Pack aggregate planned shows into real screen-days, preserving turnaround and daily closing. */
const packShows = (pool:CinemaSupplyPool,desired:readonly {id:string;wanted:number;minutes:number}[],seed:number,week:number):Map<string,number> => {
    const fair=allocateCinemaResources(desired.map(r=>({...r,units:[r.minutes]})),[pool.weeklyScreenMinutes],seed,week);
    const bins=new Map<number,number>();
    const full=Math.floor(pool.weeklyScreenMinutes/P.openingMinutesPerDay),partial=pool.weeklyScreenMinutes%P.openingMinutesPerDay;
    if(full) bins.set(P.openingMinutesPerDay,full);if(partial) bins.set(partial,1);
    const packed=new Map(desired.map(r=>[r.id,0]));
    const add=(minutes:number,count:number)=>{if(count>0 && minutes>0)bins.set(minutes,(bins.get(minutes)||0)+count)};
    const order=[...desired].sort((a,b)=>b.minutes-a.minutes || cinemaKey(seed,week,a.id)-cinemaKey(seed,week,b.id)||a.id.localeCompare(b.id));
    const fill=(row:typeof order[number],count:number)=>{
        let left=count;
        for(const [minutes,count] of [...bins].sort(([a],[b])=>a-b)) {
            if(!left)break;const perBin=Math.floor(minutes/row.minutes);if(!perBin)continue;
            const fullBins=Math.min(count,Math.floor(left/perBin));
            let touched=fullBins,used=fullBins*perBin;
            if(count>fullBins && left-used>0){const part=Math.min(perBin,left-used);touched++;used+=part;add(minutes-part*row.minutes,1)}
            bins.set(minutes,(bins.get(minutes)||0)-touched);add(minutes-perBin*row.minutes,fullBins);
            left-=used;packed.set(row.id,packed.get(row.id)!+used);
        }
    };
    // Reserve on the real daily bins, then expand. Raw weekly-minute reservations
    // alone can be eaten by daily closing gaps before a competing film is packed.
    for(const row of order)fill(row,Math.min(P.minimumShowsPerBooking,fair.get(row.id)||0));
    for(const row of order)fill(row,(fair.get(row.id)||0)-packed.get(row.id)!);
    return packed;
};

