import { issueCinemaResult } from './boxOfficeIdentity';
import { compactCinemaMarketState } from './boxOfficeHistory';
import { buildCinemaAudienceSnapshot } from './boxOfficeAudience';
import { allocateCinemaResources, apportionCinemaIntegers, cinemaCount, cinemaKeyPieces, cinemaSum, cinemaWeeklyWallet } from './boxOfficeMath';
import { CINEMA_AUDIENCE_PROFILE, CINEMA_MARKET_TUNING_VERSION, CINEMA_SUPPLY_PROFILE as P } from './boxOfficeProfiles';
import { splitRealizedCinemaGross } from './boxOfficeSettlement';
import { quoteCinemaSupply } from './boxOfficeSupply';
import { planCinemaBookings, cinemaOperatingCostPerShow } from './boxOfficeBooking';
import type { CinemaAdmissionAllocation, CinemaWeekInput, CinemaWeekResult } from './boxOfficeTypes';

const group = <T>(rows:readonly T[],key:(r:T)=>string):Map<string,T[]> => {
    const result=new Map<string,T[]>();for(const row of rows){const id=key(row);const list=result.get(id)||[];list.push(row);result.set(id,list)}return result;
};
/* Round 3 (2026-11-09): values kept under an exact pair of ids, one map inside another, where every cell of
   every title used to build a JSON text key for each lookup. Same pairs, same values, same insertion order. */
type PairIndex<V> = {get:(a:string,b:string)=>V|undefined;set:(a:string,b:string,value:V)=>void};
const pairIndex = <V>():PairIndex<V> => {
    const outer=new Map<string,Map<string,V>>();
    return {get:(a,b)=>outer.get(a)?.get(b),set:(a,b,value)=>{let inner=outer.get(a);if(!inner){inner=new Map();outer.set(a,inner)}inner.set(b,value)}};
};
const groupPairs = <T>(rows:readonly T[],first:(r:T)=>string,second:(r:T)=>string):PairIndex<T[]> => {
    const result=pairIndex<T[]>();for(const row of rows){const a=first(row),b=second(row);const list=result.get(a,b);if(list)list.push(row);else result.set(a,b,[row])}return result;
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
    const cohortIndex=new Map(input.cohorts.map(c=>[c.id,c]));
    for(const t of input.marketState?.titles || []) {
        unique(t.cells.map(c=>c.cohortId),'state cohort');
        for(const c of t.cells) {
            cinemaCount(c.awarePeople,'aware people');cinemaCount(c.discoveryContactsUsed || 0,'discovery contacts');
            const seen=cinemaSum(c.seenBands.map(b=>cinemaCount(b.people,'seen people')));
            const cohort=cohortIndex.get(c.cohortId);
            if(cohort && (c.awarePeople>cohort.people || seen>c.awarePeople)) throw new RangeError('Cinema seen/aware population inconsistent');
            for(const b of c.seenBands) {cinemaCount(b.repeatAdmissions,'repeat history');if(!Number.isFinite(b.satisfaction)||b.satisfaction<0||b.satisfaction>100)throw new RangeError('Invalid cinema satisfaction')}
        }
    }
};

/** Population changes update current modeled segments, never immutable historical financial facts. */
const reconcilePopulation = (input:CinemaWeekInput):CinemaWeekInput => {
    if(!input.marketState)return input;
    // Reconciliation is a private read-only view. Clone only changed population
    // rows; the allocator separately detaches every published audience/run row.
    const state=input.marketState,current=new Map(input.cohorts.map(c=>[c.id,c.people]));
    const previous=new Map(Object.entries(state.cohortPopulations || {}));
    const known=new Set(previous.keys());
    // Legacy states need one fixed baseline per cohort across every title; never infer it mid-loop.
    for(const t of state.titles)for(const c of t.cells)if(!known.has(c.cohortId))
        previous.set(c.cohortId,Math.max(previous.get(c.cohortId)||0,current.get(c.cohortId)||0,c.awarePeople,c.seenBands.reduce((n,b)=>n+b.people,0)));
    for(const a of state.affinities)if(!known.has(a.cohortId))previous.set(a.cohortId,Math.max(previous.get(a.cohortId)||0,current.get(a.cohortId)||0,a.people));
    const titles=state.titles.map(t=>{
      let changed=false;
      const cells=t.cells.map(cell=>{
        const n=current.get(cell.cohortId);if(n===undefined)return cell;
        const old=previous.get(cell.cohortId) ?? Math.max(n,cell.awarePeople,cell.seenBands.reduce((n,b)=>n+b.people,0));
        cinemaCount(old,'prior cohort population');
        if(old>n) {
            const scaled=(count:number)=>Number(BigInt(cinemaCount(count,'prior audience'))*BigInt(n)/BigInt(old));
            const total=scaled(cell.seenBands.reduce((n,b)=>n+b.people,0));
            const bands=apportionCinemaIntegers(total,cell.seenBands.map((b,i)=>({id:String(i),weight:b.people})),input.seed,input.absoluteWeek);
            changed=true;
            return {...cell,seenBands:cell.seenBands.map((b,i)=>({...b,people:bands.get(String(i)) || 0,repeatAdmissions:scaled(b.repeatAdmissions)})).filter(b=>b.people>0),
                awarePeople:scaled(cell.awarePeople),deferredPeople:scaled(cell.deferredPeople)};
        }
        return cell;
      });
      return changed?{...t,cells}:t;
    });
    const affinities=state.affinities.map(a=>{const n=current.get(a.cohortId),old=previous.get(a.cohortId);return n!==undefined && old && old>n ? {...a,people:Number(BigInt(a.people)*BigInt(n)/BigInt(old))}:a});
    return {...input,marketState:{...state,titles,affinities}};
};
const fingerprint = (value:unknown):string => {
    // Produce the issued v2 canonical JSON directly. Rebuilding a parallel
    // object tree serialized every nested array element again at each ancestor.
    // Strings here live only for this invocation; no mutable-state hash cache.
    const isIndex=(key:string):boolean=>{const n=Number(key);return Number.isInteger(n)&&n>=0&&n<4294967295&&String(n)===key;};
    /* Perf plan Phase 3 (2026-11-09): tens of thousands of rows share a key list, so the ordered keys are
       kept per exact key sequence (a trie, no delimiter) for this invocation; same order, same text.
       Round 3 (2026-11-09): the kept layout also holds each key's quoted label, so a field needs no lookup. */
    type KeyLayout={ordered:readonly string[];first:readonly string[];rest:readonly string[]};
    type KeyNode={next:Map<string,KeyNode>;layout?:KeyLayout};
    const keyRoot:KeyNode={next:new Map()};let keyNodes=0;
    const orderKeys=(keys:string[]):readonly string[]=>{
        let firstNamed=0;while(firstNamed<keys.length && isIndex(keys[firstNamed]))firstNamed++;
        return firstNamed?keys.slice(0,firstNamed).concat(keys.slice(firstNamed).sort((a,b)=>a.localeCompare(b))):keys.sort((a,b)=>a.localeCompare(b));
    };
    const layout=(keys:string[]):KeyLayout=>{
        const ordered=orderKeys(keys);
        return {ordered,first:ordered.map(key=>`${JSON.stringify(key)}:`),rest:ordered.map(key=>`,${JSON.stringify(key)}:`)};
    };
    const layoutOf=(keys:string[]):KeyLayout=>{
        if(keys.length>32)return layout(keys);
        let node=keyRoot;
        for(const key of keys){
            let next=node.next.get(key);
            if(!next){if(keyNodes>=4096)return layout(keys);next={next:new Map()};node.next.set(key,next);keyNodes++;}
            node=next;
        }
        return node.layout || (node.layout=layout(keys.slice()));
    };
    // Kinds, ids and names repeat by the thousand; each is quoted once per invocation.
    const quoted=new Map<string,string>();
    const quote=(text:string):string=>{
        let json=quoted.get(text);
        if(json===undefined){json=JSON.stringify(text);if(text.length<=64 && quoted.size<8192)quoted.set(text,json);}
        return json;
    };
    // JSON.stringify's own text for a non-object: a finite number is ToString, any other number is null,
    // and undefined, a function or a symbol has none.
    const primitive=(v:unknown):string|undefined=>typeof v==='string'?quote(v)
        :typeof v==='number'?(Number.isFinite(v)?String(v):'null'):typeof v==='boolean'?(v?'true':'false'):JSON.stringify(v);
    /* Round 3 (2026-11-09): the same v2 text, written as pieces. Only an element of a sorted array is joined
       into one string, because the sort compares element texts; objects append to the enclosing pieces, and
       the top level is hashed piece by piece. A late career's 14M-character text was copied at every object
       level and joined whole before hashing. Returns false when the value has no JSON text. */
    const write=(v:unknown,out:string[]):boolean=>{
        if(Array.isArray(v)) {
            if(v.length<2){out.push('[');if(v.length && !write(v[0],out))out.push('null');out.push(']');return true;}
            const rows:(string|undefined)[]=new Array(v.length);
            for(let index=0;index<v.length;index++)rows[index]=text(v[index]);
            rows.sort((a,b)=>a===undefined?(b===undefined?0:1):b===undefined?-1:a.localeCompare(b));
            out.push('[');
            for(let index=0;index<rows.length;index++){if(index)out.push(',');out.push(rows[index] ?? 'null');}
            out.push(']');
            return true;
        }
        if(v && typeof v==='object') {
            const record=v as Record<string,unknown>;
            // JSON.stringify(Object.fromEntries(sortedEntries)) still emits
            // integer-index keys first, in numeric order. Object.keys has that
            // order already; only the following named keys use locale ordering.
            const {ordered,first,rest}=layoutOf(Object.keys(record));
            out.push('{');
            let empty=true;
            for(let index=0;index<ordered.length;index++){
                const mark=out.length;
                out.push(empty?first[index]:rest[index]);
                if(write(record[ordered[index]],out))empty=false;else out.length=mark;
            }
            out.push('}');
            return true;
        }
        const json=primitive(v);
        if(json===undefined)return false;
        out.push(json);
        return true;
    };
    const text=(v:unknown):string|undefined=>{
        if(!v || typeof v!=='object')return primitive(v);
        const out:string[]=[];write(v,out);return out.join('');
    };
    // sourceSignature is derived from these same facts. Including its full
    // serialized copy again inflated both canonicalization and result issuance.
    // v2 changes diagnostic identity only; exact source/issued checks stay intact.
    const {live,...facts}=value as CinemaWeekInput;
    const independentFacts={...facts,...(live?{live:{clockEpoch:live.clockEpoch}}:{})};
    const pieces:string[]=[];write(independentFacts,pieces);
    return `cinema-input-v2:${cinemaKeyPieces(0,0,pieces).toString(16)}`;
};

const calculateCinemaWeek = (input:CinemaWeekInput):CinemaWeekResult => {
    input=reconcilePopulation(input);
    validate(input);
    const supply=input.supply ? structuredClone(input.supply) : quoteCinemaSupply(input);
    unique(supply.pools.map(p=>p.id),'supply pool');unique(supply.offers.map(o=>`${o.titleId}:${o.poolId}`),'supply offer');
    for(const p of supply.pools) {
        [p.screens,p.seatsPerShow,p.weeklyScreenMinutes,p.ticketPriceCents,p.bookingCentsPerShow,...(p.legacyBookingCentsPerShow===undefined?[]:[p.legacyBookingCentsPerShow]),...(p.operatingCentsPerShow===undefined?[]:[p.operatingCentsPerShow])].forEach(n=>cinemaCount(n,'supply resource'));
        if(!p.seatsPerShow || !p.ticketPriceCents || p.weeklyScreenMinutes>p.screens*P.daysPerWeek*P.openingMinutesPerDay)throw new RangeError('Invalid cinema physical/price supply');
        splitRealizedCinemaGross({grossCents:0,exhibitorBasisPoints:p.exhibitorBasisPoints,distributionBasisPoints:p.distributionBasisPoints});
    }
    const titleScreens=new Map<string,number>();
    const exhibition:NonNullable<CinemaWeekResult['exhibition']>=[];
    const titleIndex=new Map(input.titles.map(t=>[t.id,t])),poolIndex=new Map(supply.pools.map(p=>[p.id,p]));
    const runs=structuredClone(input.marketState?.runs || []);
    const runKey=(titleId:string,poolId:string)=>JSON.stringify([titleId,poolId]);
    const runIndex=new Map<string,(typeof runs)[number]>(),closedRuns=new Set<string>();
    for(const run of runs){
        const key=runKey(run.titleId,run.poolId);
        if(!runIndex.has(key))runIndex.set(key,run);
        if(run.closed)closedRuns.add(key);
    }
    const inputCohortIndex=new Map(input.cohorts.map(c=>[c.id,c]));
    const inputCohortsByCountry=group(input.cohorts,c=>c.countryId);
    for(const o of supply.offers)if(!titleIndex.has(o.titleId)||!poolIndex.has(o.poolId))throw new Error('Unknown cinema offer identity');
    supply.offers=supply.offers.filter(o=>{
        const t=titleIndex.get(o.titleId)!,pool=poolIndex.get(o.poolId)!;
        return t.market && t.market.releaseWeek<=input.absoluteWeek && t.market.countryIds.includes(pool.countryId)
            && (t.market.chainIdsByCountry?.[pool.countryId] || t.market.chainIds).includes(pool.chainId) && t.market.format===pool.format
            && !closedRuns.has(runKey(t.id,pool.id));
    });
    const snapshot=buildCinemaAudienceSnapshot({...input,supply});
    // Round 3 (2026-11-09): each title reads its own choices, in their order, not the whole list three times.
    const choicesByTitle=group(snapshot.choices,c=>c.titleId);
    const requests=snapshot.choices.filter(r=>r.kind!=='DEFER').map(r=>({...r,id:`${r.titleId}:${r.cohortId}:${r.kind}`,remaining:r.requestedAdmissions}));
    const cohorts=[...input.cohorts].sort((a,b)=>a.id.localeCompare(b.id)).map(c=>({cohortId:c.id,
        walletCents:cinemaWeeklyWallet(c.market?.monthlyCinemaBudgetCents || 0,input.absoluteWeek),spentCents:0,unspentCents:0,
        leisureMinutes:c.market?.weeklyLeisureMinutes || 0,usedMinutes:0}));
    const cohortIndex=new Map(cohorts.map(c=>[c.cohortId,c]));
    const requestsByCountry=group(requests,r=>inputCohortIndex.get(r.cohortId)!.countryId);
    const cohortsByCountry=group(cohorts,c=>inputCohortIndex.get(c.cohortId)!.countryId);
    const offersByPool=group(supply.offers,o=>o.poolId);
    const allocations:CinemaAdmissionAllocation[]=[],costEvents:CinemaWeekResult['costEvents']=[],supplyRows:CinemaWeekResult['supply']=[];
    for(const pool of [...supply.pools].sort((a,b)=>a.ticketPriceCents-b.ticketPriceCents||a.id.localeCompare(b.id))) {
        const titleIds=(offersByPool.get(pool.id)||[]).map(o=>o.titleId).sort();
        const candidates=(requestsByCountry.get(pool.countryId)||[]).filter(r=>r.remaining>0 && titleIds.includes(r.titleId));
        const candidatesByCohort=group(candidates,r=>r.cohortId),candidatesByTitle=group(candidates,r=>r.titleId),countryCohorts=cohortsByCountry.get(pool.countryId)||[];
        let poolAdmissions=0;
        const wanted=new Map<string,number>();
        for(const c of countryCohorts) {
            const rows=candidatesByCohort.get(c.cohortId)||[];
            const funded=allocateCinemaResources(rows.map(r=>({id:r.id,wanted:r.remaining,units:[pool.ticketPriceCents,r.minutesPerVisit]})),[c.walletCents-c.spentCents,c.leisureMinutes-c.usedMinutes],input.seed,input.absoluteWeek);
            for(const r of rows)wanted.set(r.id,funded.get(r.id)!);
        }
        const desired=titleIds.map(id=>{
            const title=titleIndex.get(id)!;
            const demand=cinemaSum((candidatesByTitle.get(id)||[]).map(r=>wanted.get(r.id)||0));
            const grace=input.absoluteWeek-title.market!.releaseWeek<P.discoveryGraceWeeks;
            return {id,demand,discovery:grace,prior:runIndex.get(runKey(id,pool.id)),minutes:title.market!.runtimeMinutes+P.turnaroundMinutes};
        });
        const booking=planCinemaBookings(pool,desired,input.seed,input.absoluteWeek),shows=booking.shows;
        const localCohorts=countryCohorts.filter(c=>candidatesByCohort.has(c.cohortId));
        const limits=[...localCohorts.flatMap(c=>[c.walletCents-c.spentCents,c.leisureMinutes-c.usedMinutes]),...titleIds.map(id=>(shows.get(id)||0)*pool.seatsPerShow)];
        const joint=allocateCinemaResources(candidates.map(r=>({id:r.id,wanted:r.remaining,units:[
            ...localCohorts.flatMap(c=>c.cohortId===r.cohortId?[pool.ticketPriceCents,r.minutesPerVisit]:[0,0]),
            ...titleIds.map(id=>id===r.titleId?1:0),
        ]})),limits,input.seed,input.absoluteWeek);
        for(const titleId of titleIds) {
            const rows=candidatesByTitle.get(titleId)||[],showCount=shows.get(titleId)||0;
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
            const prior=runIndex.get(runKey(titleId,pool.id));
            const contract=titleIndex.get(titleId)!.market!.bookingContract;
            const bookingCentsPerShow=prior?.bookingCentsPerShow ?? (contract==='REVENUE_SHARE'?0:
                contract==='LEGACY_SHOW_FEES'?pool.legacyBookingCentsPerShow ?? pool.bookingCentsPerShow:pool.bookingCentsPerShow);
            const releaseAge=input.absoluteWeek-titleIndex.get(titleId)!.market!.releaseWeek;
            const hadDemand=rows.some(r=>(wanted.get(r.id)||0)>0);
            const capacityDenied=showCount===0&&hadDemand&&(booking.requested.get(titleId)||0)>0;
            const contribution=sold*pool.ticketPriceCents*pool.exhibitorBasisPoints/10_000-showCount*cinemaOperatingCostPerShow(pool);
            const viable=showCount>0&&contribution>0&&sold/(showCount*pool.seatsPerShow)>=P.minimumOccupancy;
            const quietWeeks=capacityDenied ? prior?.quietWeeks || 0 : viable?0:(prior?.quietWeeks || 0)+1;
            const run={titleId,poolId:pool.id,quietWeeks,bookingCentsPerShow,lastBookedWeek:input.absoluteWeek,lastShows:showCount,lastAdmissions:sold,closed:!capacityDenied && releaseAge>=P.discoveryGraceWeeks && quietWeeks>=P.quietWeeksBeforeExit};
            if(prior)Object.assign(prior,run);else {runs.push(run);runIndex.set(runKey(titleId,pool.id),run)}
            // Standard exhibition is paid through the exhibitor share. An existing
            // fixed-show agreement retains its actual launch and renewal charges.
            const cost=cinemaCount((showCount+(!prior?1:0))*bookingCentsPerShow,'booking cost');
            if(cost)costEvents.push({id:`cinema-booking:${input.absoluteWeek}:${titleId}:${pool.id}`,titleId,poolId:pool.id,category:'BOOKING_COST',amountCents:cost});
        }
        const totalShows=cinemaSum([...shows.values()]);
        supplyRows.push({poolId:pool.id,shows:totalShows,usedScreenMinutes:cinemaSum(desired.map(r=>(shows.get(r.id)||0)*r.minutes)),
            availableScreenMinutes:pool.weeklyScreenMinutes,seats:totalShows*pool.seatsPerShow,admissions:poolAdmissions});
    }
    const allocationsByTitle=group(allocations,a=>a.titleId),allocationsByCell=groupPairs(allocations,a=>a.titleId,a=>a.cohortId);
    const footfall=pairIndex<number>();
    for(const a of allocations)footfall.set(a.cohortId,a.poolId,(footfall.get(a.cohortId,a.poolId)||0)+a.admissions);
    const posterPools=groupPairs(exhibition.filter(e=>e.shows>0&&e.screens>0),e=>e.titleId,e=>poolIndex.get(e.poolId)!.countryId);
    const firstRequests=pairIndex<(typeof snapshot.choices)[number]>();
    for(const r of snapshot.choices)if(r.kind==='FIRST')firstRequests.set(r.titleId,r.cohortId,r);
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
            deferredPeople:cinemaSum((choicesByTitle.get(t.id)||[]).filter(r=>r.kind==='DEFER').map(r=>r.interestedPeople)),
            grossCents:cinemaSum(splits.map(s=>s.grossCents)),producerReceiptsCents:cinemaSum(splits.map(s=>s.producerReceiptsCents)),
            exhibitorReceiptsCents:cinemaSum(splits.map(s=>s.exhibitorReceiptsCents)),distributionDeductionsCents:cinemaSum(splits.map(s=>s.distributionDeductionsCents))};
    });
    for(const title of snapshot.titles)for(const cell of title.cells) {
        const rows=allocationsByCell.get(title.titleId,cell.cohortId)||[];
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
        const posters=posterPools.get(title.titleId,inputCohortIndex.get(cell.cohortId)!.countryId)||[];
        const otherVisits=cinemaSum(posters.map(o=>{
            const visitors=(footfall.get(cell.cohortId,o.poolId)||0)-rows.filter(a=>a.poolId===o.poolId).reduce((n,a)=>n+a.admissions,0);
            return Math.floor(visitors*o.screens/Math.max(1,poolIndex.get(o.poolId)!.screens));
        }));
        cell.pendingLocalFootfall=otherVisits?{absoluteWeek:input.absoluteWeek,otherFilmAdmissions:otherVisits}:undefined;
        const seen=cell.seenBands.reduce((n,b)=>n+b.people,0);
        const firstIntent=firstRequests.get(title.titleId,cell.cohortId)?.requestedAdmissions || 0;
        cell.deferredPeople=Math.min(cell.deferredPeople+Math.max(0,firstIntent-first),Math.max(0,cell.awarePeople-seen));
    }
    for(const title of titles)title.deferredPeople=cinemaSum(snapshot.titles.find(t=>t.titleId===title.titleId)!.cells.map(c=>c.deferredPeople));
    for(const title of titles){
        const cells=snapshot.titles.find(t=>t.titleId===title.titleId)!.cells;
        const titleChoices=choicesByTitle.get(title.titleId)||[];
        const choices=titleChoices.filter(c=>c.kind==='FIRST');
        const cellsByCountry=group(cells,c=>inputCohortIndex.get(c.cohortId)?.countryId || '');
        const countries=[...inputCohortsByCountry.keys()].sort().map(countryId=>{
            const local=cellsByCountry.get(countryId)||[];
            return {countryId,awarePeople:cinemaSum(local.map(c=>c.awarePeople)),deferredPeople:cinemaSum(local.map(c=>c.deferredPeople))};
        }).filter(c=>c.awarePeople>0||c.deferredPeople>0);
        Object.assign(title,{audienceSignals:{awarePeople:cinemaSum(cells.map(c=>c.awarePeople)),
            homeWaitingPeople:cinemaSum(titleChoices.filter(c=>c.kind==='DEFER'&&c.reasons.includes('KNOWN_STREAMING_WINDOW')).map(c=>c.interestedPeople)),
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
    return {absoluteWeek:input.absoluteWeek,tuningVersion:input.tuningVersion,mode:input.live?'LIVE':'SHADOW',...(input.live?{live:{...input.live}}:{}),inputFingerprint:fingerprint(input),titles,cohorts,supply:supplyRows.sort((a,b)=>a.poolId.localeCompare(b.poolId)),
        allocations:allocations.sort((a,b)=>a.titleId.localeCompare(b.titleId)||a.cohortId.localeCompare(b.cohortId)||a.poolId.localeCompare(b.poolId)||a.kind.localeCompare(b.kind)),
        exhibition, costEvents:costEvents.sort((a,b)=>a.id.localeCompare(b.id)),nextState:{...compact,titles:[...compact.titles].sort((a,b)=>a.titleId.localeCompare(b.titleId)),
            runs:[...compact.runs].sort((a,b)=>a.titleId.localeCompare(b.titleId)||a.poolId.localeCompare(b.poolId))}};
};

/** Pure complete-slate proposal. Its mutation guard exists before it reaches a caller. */
export const simulateCinemaWeek = (input:CinemaWeekInput):CinemaWeekResult => issueCinemaResult(calculateCinemaWeek(input));

/** Internal synchronous consumption only. This unissued proposal cannot pass public commit. */
export const consumeUnexposedCinemaWeek = <T>(input:CinemaWeekInput, consume:(result:CinemaWeekResult)=>T):T => consume(calculateCinemaWeek(input));
