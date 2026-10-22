import { issueCinemaResult } from './boxOfficeIdentity';
import { compactCinemaMarketState } from './boxOfficeHistory';
import { buildCinemaAudienceSnapshot } from './boxOfficeAudience';
import { allocateCinemaResources, apportionCinemaIntegers, cinemaCount, cinemaKey, cinemaSum, cinemaWeeklyWallet } from './boxOfficeMath';
import { CINEMA_AUDIENCE_PROFILE, CINEMA_MARKET_TUNING_VERSION, CINEMA_SUPPLY_PROFILE as P } from './boxOfficeProfiles';
import { splitRealizedCinemaGross } from './boxOfficeSettlement';
import { quoteCinemaSupply } from './boxOfficeSupply';
import type { CinemaAdmissionAllocation, CinemaSupplyPool, CinemaWeekInput, CinemaWeekResult } from './boxOfficeTypes';

const group = <T>(rows:readonly T[],key:(r:T)=>string):Map<string,T[]> => {
    const result=new Map<string,T[]>();for(const row of rows){const id=key(row);const list=result.get(id)||[];list.push(row);result.set(id,list)}return result;
};
const unique = (ids:readonly string[],kind:string):void => {if(ids.some(id=>!id)||new Set(ids).size!==ids.length)throw new Error(`Duplicate/missing cinema ${kind} identity`)};
const validate = (input:CinemaWeekInput):void => {
    cinemaCount(input.absoluteWeek,'week');
    if (!Number.isSafeInteger(input.seed) || input.tuningVersion!==CINEMA_MARKET_TUNING_VERSION) throw new Error('Unsupported cinema tuning/seed');
    if(input.marketState && (input.marketState.schemaVersion!==1 || input.marketState.tuningVersion!==input.tuningVersion)) throw new Error('Unsupported cinema state version');
    if(input.marketState && input.marketState.lastProcessedAbsoluteWeek>=input.absoluteWeek) throw new Error('Cinema week already simulated or out of order');
    unique(input.titles.map(t=>t.id),'title');unique(input.cohorts.map(c=>c.id),'cohort');unique((input.countries || []).map(c=>c.id),'country');
    for(const t of input.titles) {
        cinemaCount(t.budgetCents,'budget');
        if(t.market) {
            cinemaCount(t.market.releaseWeek,'release week');cinemaCount(t.market.runtimeMinutes,'runtime');
            if(t.market.runtimeMinutes<1 || t.market.runtimeMinutes+P.turnaroundMinutes>P.openingMinutesPerDay) throw new RangeError('Invalid cinema runtime');
        }
    }
    for(const c of input.cohorts) {
        cinemaCount(c.people,'people');
        if(c.market) {
            const m=c.market;
            [m.eligiblePeople,m.monthlyCinemaBudgetCents,m.weeklyLeisureMinutes,m.travelMinutes].forEach(n=>cinemaCount(n,'cohort resource'));
            if(m.eligiblePeople>c.people) throw new RangeError('Cinema eligibility exceeds cohort');
        }
    }
    for(const t of input.marketState?.titles || []) {
        unique(t.cells.map(c=>c.cohortId),'state cohort');
        for(const c of t.cells) {
            cinemaCount(c.awarePeople,'aware people');cinemaCount(c.discoveryContactsUsed || 0,'discovery contacts');
            const seen=cinemaSum(c.seenBands.map(b=>cinemaCount(b.people,'seen people')));
            const cohort=input.cohorts.find(r=>r.id===c.cohortId);
            if(cohort && (c.awarePeople>cohort.people || seen>c.awarePeople)) throw new RangeError('Cinema seen/aware population inconsistent');
            for(const b of c.seenBands) {cinemaCount(b.repeatAdmissions,'repeat history');if(!Number.isFinite(b.satisfaction)||b.satisfaction<0||b.satisfaction>100)throw new RangeError('Invalid cinema satisfaction')}
        }
    }
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
    for(const row of order) {
        let left=fair.get(row.id) || 0;
        for(const [minutes,count] of [...bins].sort(([a],[b])=>a-b)) {
            if(!left)break;const perBin=Math.floor(minutes/row.minutes);if(!perBin)continue;
            const fullBins=Math.min(count,Math.floor(left/perBin));
            let touched=fullBins,used=fullBins*perBin;
            if(count>fullBins && left-used>0){const part=Math.min(perBin,left-used);touched++;used+=part;add(minutes-part*row.minutes,1)}
            bins.set(minutes,(bins.get(minutes)||0)-touched);add(minutes-perBin*row.minutes,fullBins);
            left-=used;packed.set(row.id,packed.get(row.id)!+used);
        }
    }
    return packed;
};

/** Population changes update current modeled segments, never immutable historical financial facts. */
const reconcilePopulation = (input:CinemaWeekInput):CinemaWeekInput => {
    if(!input.marketState)return input;
    const state=structuredClone(input.marketState),current=new Map(input.cohorts.map(c=>[c.id,c.people]));
    const previous=new Map(Object.entries(state.cohortPopulations || {}));
    const known=new Set(previous.keys());
    // Legacy states need one fixed baseline per cohort across every title; never infer it mid-loop.
    for(const t of state.titles)for(const c of t.cells)if(!known.has(c.cohortId))
        previous.set(c.cohortId,Math.max(previous.get(c.cohortId)||0,current.get(c.cohortId)||0,c.awarePeople,c.seenBands.reduce((n,b)=>n+b.people,0)));
    for(const a of state.affinities)if(!known.has(a.cohortId))previous.set(a.cohortId,Math.max(previous.get(a.cohortId)||0,current.get(a.cohortId)||0,a.people));
    for(const t of state.titles)for(const cell of t.cells) {
        const n=current.get(cell.cohortId);if(n===undefined)continue;
        const old=previous.get(cell.cohortId) ?? Math.max(n,cell.awarePeople,cell.seenBands.reduce((n,b)=>n+b.people,0));
        cinemaCount(old,'prior cohort population');
        if(old>n) {
            const scaled=(count:number)=>Number(BigInt(cinemaCount(count,'prior audience'))*BigInt(n)/BigInt(old));
            const total=scaled(cell.seenBands.reduce((n,b)=>n+b.people,0));
            const bands=apportionCinemaIntegers(total,cell.seenBands.map((b,i)=>({id:String(i),weight:b.people})),input.seed,input.absoluteWeek);
            cell.seenBands=cell.seenBands.map((b,i)=>({...b,people:bands.get(String(i)) || 0,repeatAdmissions:scaled(b.repeatAdmissions)})).filter(b=>b.people>0);
            cell.awarePeople=scaled(cell.awarePeople);cell.deferredPeople=scaled(cell.deferredPeople);
        }
    }
    state.affinities=state.affinities.map(a=>{const n=current.get(a.cohortId),old=previous.get(a.cohortId);return n!==undefined && old && old>n ? {...a,people:Number(BigInt(a.people)*BigInt(n)/BigInt(old))}:a});
    return {...input,marketState:state};
};
const fingerprint = (value:unknown):string => {
    const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
        : v && typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
    return `cinema-shadow-v1:${cinemaKey(0,0,JSON.stringify(canonical(value))).toString(16)}`;
};

/** Pure complete-slate shadow calculation. All money is a proposal; nothing is persisted or paid. */
export const simulateCinemaWeek = (input:CinemaWeekInput):CinemaWeekResult => {
    input=reconcilePopulation(input);
    validate(input);
    const supply=input.supply ? structuredClone(input.supply) : quoteCinemaSupply(input);
    unique(supply.pools.map(p=>p.id),'supply pool');unique(supply.offers.map(o=>`${o.titleId}:${o.poolId}`),'supply offer');
    for(const p of supply.pools) {
        [p.screens,p.seatsPerShow,p.weeklyScreenMinutes,p.ticketPriceCents,p.bookingCentsPerShow].forEach(n=>cinemaCount(n,'supply resource'));
        if(!p.seatsPerShow || !p.ticketPriceCents || p.weeklyScreenMinutes>p.screens*P.daysPerWeek*P.openingMinutesPerDay)throw new RangeError('Invalid cinema physical/price supply');
        splitRealizedCinemaGross({grossCents:0,exhibitorBasisPoints:p.exhibitorBasisPoints,distributionBasisPoints:p.distributionBasisPoints});
    }
    const titleScreens=new Map<string,number>();
    const exhibition:NonNullable<CinemaWeekResult['exhibition']>=[];
    const titleIndex=new Map(input.titles.map(t=>[t.id,t])),poolIndex=new Map(supply.pools.map(p=>[p.id,p]));
    const inputCohortIndex=new Map(input.cohorts.map(c=>[c.id,c]));
    for(const o of supply.offers)if(!titleIndex.has(o.titleId)||!poolIndex.has(o.poolId))throw new Error('Unknown cinema offer identity');
    supply.offers=supply.offers.filter(o=>{
        const t=titleIndex.get(o.titleId)!,pool=poolIndex.get(o.poolId)!;
        return t.market && t.market.releaseWeek<=input.absoluteWeek && t.market.countryIds.includes(pool.countryId)
            && (t.market.chainIdsByCountry?.[pool.countryId] || t.market.chainIds).includes(pool.chainId) && t.market.format===pool.format
            && !input.marketState?.runs.some(r=>r.titleId===t.id && r.poolId===pool.id && r.closed);
    });
    const snapshot=buildCinemaAudienceSnapshot({...input,supply});
    const requests=snapshot.choices.filter(r=>r.kind!=='DEFER').map(r=>({...r,id:`${r.titleId}:${r.cohortId}:${r.kind}`,remaining:r.requestedAdmissions}));
    const cohorts=[...input.cohorts].sort((a,b)=>a.id.localeCompare(b.id)).map(c=>({cohortId:c.id,
        walletCents:cinemaWeeklyWallet(c.market?.monthlyCinemaBudgetCents || 0,input.absoluteWeek),spentCents:0,unspentCents:0,
        leisureMinutes:c.market?.weeklyLeisureMinutes || 0,usedMinutes:0}));
    const cohortIndex=new Map(cohorts.map(c=>[c.cohortId,c]));
    const requestsByCountry=group(requests,r=>inputCohortIndex.get(r.cohortId)!.countryId);
    const cohortsByCountry=group(cohorts,c=>inputCohortIndex.get(c.cohortId)!.countryId);
    const offersByPool=group(supply.offers,o=>o.poolId);
    const allocations:CinemaAdmissionAllocation[]=[],costEvents:CinemaWeekResult['costEvents']=[],supplyRows:CinemaWeekResult['supply']=[];
    const runs=structuredClone(input.marketState?.runs || []);
    for(const pool of [...supply.pools].sort((a,b)=>a.ticketPriceCents-b.ticketPriceCents||a.id.localeCompare(b.id))) {
        const titleIds=(offersByPool.get(pool.id)||[]).map(o=>o.titleId).sort();
        const candidates=(requestsByCountry.get(pool.countryId)||[]).filter(r=>r.remaining>0 && titleIds.includes(r.titleId));
        const candidatesByCohort=group(candidates,r=>r.cohortId),countryCohorts=cohortsByCountry.get(pool.countryId)||[];
        let poolAdmissions=0;
        const wanted=new Map<string,number>();
        for(const c of countryCohorts) {
            const rows=candidatesByCohort.get(c.cohortId)||[];
            const funded=allocateCinemaResources(rows.map(r=>({id:r.id,wanted:r.remaining,units:[pool.ticketPriceCents,r.minutesPerVisit]})),[c.walletCents-c.spentCents,c.leisureMinutes-c.usedMinutes],input.seed,input.absoluteWeek);
            for(const r of rows)wanted.set(r.id,funded.get(r.id)!);
        }
        const desired=titleIds.map(id=>{
            const title=titleIndex.get(id)!;
            const demand=cinemaSum(candidates.filter(r=>r.titleId===id).map(r=>wanted.get(r.id)||0));
            const grace=input.absoluteWeek-title.market!.releaseWeek<P.discoveryGraceWeeks;
            return {id,wanted:Math.max(grace?1:0,Math.ceil(demand/pool.seatsPerShow)),minutes:title.market!.runtimeMinutes+P.turnaroundMinutes};
        });
        const shows=packShows(pool,desired,input.seed,input.absoluteWeek);
        const localCohorts=countryCohorts.filter(c=>candidatesByCohort.has(c.cohortId));
        const limits=[...localCohorts.flatMap(c=>[c.walletCents-c.spentCents,c.leisureMinutes-c.usedMinutes]),...titleIds.map(id=>(shows.get(id)||0)*pool.seatsPerShow)];
        const joint=allocateCinemaResources(candidates.map(r=>({id:r.id,wanted:r.remaining,units:[
            ...localCohorts.flatMap(c=>c.cohortId===r.cohortId?[pool.ticketPriceCents,r.minutesPerVisit]:[0,0]),
            ...titleIds.map(id=>id===r.titleId?1:0),
        ]})),limits,input.seed,input.absoluteWeek);
        for(const titleId of titleIds) {
            const rows=candidates.filter(r=>r.titleId===titleId),showCount=shows.get(titleId)||0;
            let sold=0;
            for(const r of rows) {
                const admissions=joint.get(r.id)!;if(!admissions)continue;
                const c=cohortIndex.get(r.cohortId)!;
                c.spentCents=cinemaSum([c.spentCents,cinemaCount(admissions*pool.ticketPriceCents,'ticket payment')]);c.usedMinutes+=admissions*r.minutesPerVisit;
                sold+=admissions;poolAdmissions+=admissions;r.remaining-=admissions;
                allocations.push({titleId,cohortId:r.cohortId,poolId:pool.id,kind:r.kind as 'FIRST'|'REPEAT',admissions,priceCents:pool.ticketPriceCents,minutesPerVisit:r.minutesPerVisit,satisfaction:r.satisfaction});
            }
            const scheduledScreens=Math.min(pool.screens,Math.ceil(showCount*(titleIndex.get(titleId)!.market!.runtimeMinutes+P.turnaroundMinutes)/(P.openingMinutesPerDay*P.daysPerWeek)));
            titleScreens.set(titleId,(titleScreens.get(titleId)||0)+scheduledScreens);
            exhibition.push({titleId,poolId:pool.id,shows:showCount,screens:scheduledScreens});
            const prior=runs.find(r=>r.titleId===titleId && r.poolId===pool.id);
            const releaseAge=input.absoluteWeek-titleIndex.get(titleId)!.market!.releaseWeek;
            const hadDemand=rows.some(r=>(wanted.get(r.id)||0)>0);
            const quietWeeks=showCount===0 && hadDemand ? prior?.quietWeeks || 0 : sold<pool.seatsPerShow*.1?(prior?.quietWeeks || 0)+1:0;
            const run={titleId,poolId:pool.id,quietWeeks,closed:releaseAge>=P.discoveryGraceWeeks && quietWeeks>=P.quietWeeksBeforeExit};
            if(prior)Object.assign(prior,run);else runs.push(run);
            // A selected new market pays a launch booking even when nobody buys; subsequent costs follow actual shows.
            const cost=cinemaCount((showCount+(!prior?1:0))*pool.bookingCentsPerShow,'booking cost');
            if(cost)costEvents.push({id:`cinema-booking:${input.absoluteWeek}:${titleId}:${pool.id}`,titleId,poolId:pool.id,category:'BOOKING_COST',amountCents:cost});
        }
        const totalShows=cinemaSum([...shows.values()]);
        supplyRows.push({poolId:pool.id,shows:totalShows,usedScreenMinutes:cinemaSum(desired.map(r=>(shows.get(r.id)||0)*r.minutes)),
            availableScreenMinutes:pool.weeklyScreenMinutes,seats:totalShows*pool.seatsPerShow,admissions:poolAdmissions});
    }
    const allocationsByTitle=group(allocations,a=>a.titleId),allocationsByCell=group(allocations,a=>JSON.stringify([a.titleId,a.cohortId]));
    const footfall=new Map<string,number>();
    for(const a of allocations){const key=JSON.stringify([a.cohortId,a.poolId]);footfall.set(key,(footfall.get(key)||0)+a.admissions)}
    const posterPools=group(exhibition.filter(e=>e.shows>0&&e.screens>0),e=>JSON.stringify([e.titleId,poolIndex.get(e.poolId)!.countryId]));
    const firstRequests=new Map(snapshot.choices.filter(r=>r.kind==='FIRST').map(r=>[JSON.stringify([r.titleId,r.cohortId]),r]));
    const titles=[...input.titles].sort((a,b)=>a.id.localeCompare(b.id)).map(t=>{
        const rows=allocationsByTitle.get(t.id)||[];
        const splits=rows.map(r=>{const pool=poolIndex.get(r.poolId)!;return splitRealizedCinemaGross({grossCents:r.admissions*r.priceCents,exhibitorBasisPoints:pool.exhibitorBasisPoints,distributionBasisPoints:pool.distributionBasisPoints})});
        const splitIndex=new Map(rows.map((r,i)=>[r,splits[i]]));
        const countries=[...group(rows,r=>poolIndex.get(r.poolId)!.countryId)].sort(([a],[b])=>a.localeCompare(b)).map(([countryId,local])=>{
            const localSplits=local.map(r=>splitIndex.get(r)!);
            return {countryId,firstAdmissions:cinemaSum(local.filter(r=>r.kind==='FIRST').map(r=>r.admissions)),repeatAdmissions:cinemaSum(local.filter(r=>r.kind==='REPEAT').map(r=>r.admissions)),
                grossCents:cinemaSum(localSplits.map(s=>s.grossCents)),producerReceiptsCents:cinemaSum(localSplits.map(s=>s.producerReceiptsCents)),
                exhibitorReceiptsCents:cinemaSum(localSplits.map(s=>s.exhibitorReceiptsCents)),distributionDeductionsCents:cinemaSum(localSplits.map(s=>s.distributionDeductionsCents))};
        });
        const admissions=cinemaSum(rows.map(r=>r.admissions));
        return {titleId:t.id,screens:titleScreens.get(t.id)||0,countries,satisfactionScore:admissions ? rows.reduce((n,r)=>n+r.admissions*r.satisfaction,0)/admissions : null,
            firstAdmissions:cinemaSum(rows.filter(r=>r.kind==='FIRST').map(r=>r.admissions)),repeatAdmissions:cinemaSum(rows.filter(r=>r.kind==='REPEAT').map(r=>r.admissions)),
            deferredPeople:cinemaSum(snapshot.choices.filter(r=>r.titleId===t.id && r.kind==='DEFER').map(r=>r.interestedPeople)),
            grossCents:cinemaSum(splits.map(s=>s.grossCents)),producerReceiptsCents:cinemaSum(splits.map(s=>s.producerReceiptsCents)),
            exhibitorReceiptsCents:cinemaSum(splits.map(s=>s.exhibitorReceiptsCents)),distributionDeductionsCents:cinemaSum(splits.map(s=>s.distributionDeductionsCents))};
    });
    for(const title of snapshot.titles)for(const cell of title.cells) {
        const rows=allocationsByCell.get(JSON.stringify([title.titleId,cell.cohortId]))||[];
        const first=cinemaSum(rows.filter(a=>a.kind==='FIRST').map(a=>a.admissions)),repeat=cinemaSum(rows.filter(a=>a.kind==='REPEAT').map(a=>a.admissions));
        if(repeat) {
            const eligible=cell.seenBands.map((b,i)=>({id:String(i),wanted:b.satisfaction>55?b.people:0,units:[1]}));
            const assigned=allocateCinemaResources(eligible,[repeat],input.seed,input.absoluteWeek);
            cell.seenBands.forEach((b,i)=>{const n=assigned.get(String(i))||0;if(n){b.repeatAdmissions+=n;b.lastViewedWeek=input.absoluteWeek}});
        }
        if(first) {
            const quality=rows.find(a=>a.kind==='FIRST')!.satisfaction,bandIndex=quality<45?0:quality<75?1:2;
            // At most three satisfaction bands. Recent repeat history is aggregate, unique people never reset.
            const band=cell.seenBands.find(b=>(b.satisfaction<45?0:b.satisfaction<75?1:2)===bandIndex);
            if(band){band.satisfaction=(band.satisfaction*band.people+quality*first)/(band.people+first);band.people+=first;band.lastViewedWeek=input.absoluteWeek}
            else cell.seenBands.push({people:first,satisfaction:quality,repeatAdmissions:0,lastViewedWeek:input.absoluteWeek});
            cell.seenBands.sort((a,b)=>a.satisfaction-b.satisfaction);
        }
        // A paid release booking includes local exhibitor placement. Only realized OTHER-title
        // patrons near its actual screen footprint can discover it. An offer alone buys no placement;
        // one booked screen cannot advertise to every visitor across an entire chain.
        const posters=posterPools.get(JSON.stringify([title.titleId,inputCohortIndex.get(cell.cohortId)!.countryId]))||[];
        const otherVisits=cinemaSum(posters.map(o=>{
            const visitors=(footfall.get(JSON.stringify([cell.cohortId,o.poolId]))||0)-rows.filter(a=>a.poolId===o.poolId).reduce((n,a)=>n+a.admissions,0);
            return Math.floor(visitors*o.screens/Math.max(1,poolIndex.get(o.poolId)!.screens));
        }));
        cell.pendingLocalFootfall=otherVisits?{absoluteWeek:input.absoluteWeek,otherFilmAdmissions:otherVisits}:undefined;
        const seen=cell.seenBands.reduce((n,b)=>n+b.people,0);
        const firstIntent=firstRequests.get(JSON.stringify([title.titleId,cell.cohortId]))?.requestedAdmissions || 0;
        cell.deferredPeople=Math.min(cell.deferredPeople+Math.max(0,firstIntent-first),Math.max(0,cell.awarePeople-seen));
    }
    for(const title of titles)title.deferredPeople=cinemaSum(snapshot.titles.find(t=>t.titleId===title.titleId)!.cells.map(c=>c.deferredPeople));
    for(const title of titles){
        const cells=snapshot.titles.find(t=>t.titleId===title.titleId)!.cells;
        const choices=snapshot.choices.filter(c=>c.titleId===title.titleId&&c.kind==='FIRST');
        const countries=[...new Set(input.cohorts.map(c=>c.countryId))].sort().map(countryId=>{
            const ids=new Set(input.cohorts.filter(c=>c.countryId===countryId).map(c=>c.id));
            const local=cells.filter(c=>ids.has(c.cohortId));
            return {countryId,awarePeople:cinemaSum(local.map(c=>c.awarePeople)),deferredPeople:cinemaSum(local.map(c=>c.deferredPeople))};
        }).filter(c=>c.awarePeople>0||c.deferredPeople>0);
        Object.assign(title,{audienceSignals:{awarePeople:cinemaSum(cells.map(c=>c.awarePeople)),
            homeWaitingPeople:cinemaSum(snapshot.choices.filter(c=>c.titleId===title.titleId&&c.kind==='DEFER'&&c.reasons.includes('KNOWN_STREAMING_WINDOW')).map(c=>c.interestedPeople)),
            discoveryPeople:cinemaSum(choices.map(c=>c.discoveryPeople)),
            familiarPeople:cinemaSum(choices.map(c=>Math.floor(c.awarePeople*c.universeFamiliarity))),countries}});
    }

    const activeIds=new Set(snapshot.titles.map(t=>t.titleId));
    const retained=(input.marketState?.titles || []).filter(t=>!activeIds.has(t.titleId) && input.absoluteWeek-t.releaseWeek<=CINEMA_AUDIENCE_PROFILE.activeTitleHistoryWeeks).map(t=>({...structuredClone(t),cells:t.cells.map(c=>({...structuredClone(c),lastChoiceWeek:c.lastChoiceWeek ?? input.marketState!.lastProcessedAbsoluteWeek}))}));
    const archived=(input.marketState?.titles || []).filter(t=>!activeIds.has(t.titleId) && !retained.some(r=>r.titleId===t.titleId));
    const compact=compactCinemaMarketState({schemaVersion:1,tuningVersion:input.tuningVersion,lastProcessedAbsoluteWeek:input.absoluteWeek,
        cohortPopulations:Object.fromEntries(input.cohorts.map(c=>[c.id,c.people])),titles:[...snapshot.titles,...retained,...archived],
        affinities:input.marketState?.affinities || [],runs},new Set([...snapshot.titles,...retained].map(t=>t.titleId)));
    cohorts.forEach(c=>{c.unspentCents=c.walletCents-c.spentCents;if(c.unspentCents<0||c.usedMinutes>c.leisureMinutes)throw new Error('Cinema resource conservation failed')});
    for(const s of supplyRows)if(s.admissions>s.seats||s.usedScreenMinutes>s.availableScreenMinutes)throw new Error('Cinema physical conservation failed');
    return issueCinemaResult({absoluteWeek:input.absoluteWeek,tuningVersion:input.tuningVersion,mode:input.live?'LIVE':'SHADOW',...(input.live?{live:{...input.live}}:{}),inputFingerprint:fingerprint(input),titles,cohorts,supply:supplyRows.sort((a,b)=>a.poolId.localeCompare(b.poolId)),
        allocations:allocations.sort((a,b)=>a.titleId.localeCompare(b.titleId)||a.cohortId.localeCompare(b.cohortId)||a.poolId.localeCompare(b.poolId)||a.kind.localeCompare(b.kind)),
        exhibition, costEvents:costEvents.sort((a,b)=>a.id.localeCompare(b.id)),nextState:{...compact,titles:[...compact.titles].sort((a,b)=>a.titleId.localeCompare(b.titleId)),
            runs:[...compact.runs].sort((a,b)=>a.titleId.localeCompare(b.titleId)||a.poolId.localeCompare(b.poolId))}});
};
