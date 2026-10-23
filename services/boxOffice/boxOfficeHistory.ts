import { CINEMA_AUDIENCE_PROFILE } from './boxOfficeProfiles';
import type { CinemaAffinity, CinemaMarketState } from './boxOfficeTypes';

/** Retire closed matrices into bounded overlapping affinity summaries; money lives in title ledgers. */
export const compactCinemaMarketState = (state:CinemaMarketState,keep:ReadonlySet<string>):CinemaMarketState => {
    const retained=state.titles.filter(t=>keep.has(t.titleId));
    const retired=state.titles.filter(t=>!keep.has(t.titleId)).sort((a,b)=>a.releaseWeek-b.releaseWeek||a.titleId.localeCompare(b.titleId));
    const affinities:CinemaAffinity[]=structuredClone(state.affinities);
    const byCohort=new Map<string,CinemaAffinity[]>(),firstByIdentity=new Map<string,CinemaAffinity>();
    const key=(cohortId:string,kind:CinemaAffinity['kind'],id:string)=>JSON.stringify([cohortId,kind,id]);
    const index=(entry:CinemaAffinity)=>{
        const identity=key(entry.cohortId,entry.kind,entry.id);
        // Preserve Array.find's first-match behavior for older duplicate rows.
        if(!firstByIdentity.has(identity))firstByIdentity.set(identity,entry);
        const rows=byCohort.get(entry.cohortId);
        if(rows)rows.push(entry);else byCohort.set(entry.cohortId,[entry]);
    };
    for(const entry of affinities)index(entry);
    for(const title of retired) {
        const roles=new Map<string,number>();for(const p of title.cast)roles.set(p.personId,Math.max(roles.get(p.personId)||0,p.roleWeight));
        const credits=[...[...roles].map(([id,weight])=>({kind:'ACTOR' as const,id,weight})),{kind:'STUDIO' as const,id:title.ownerId,weight:1},...(title.universeId?[{kind:'UNIVERSE' as const,id:title.universeId,weight:1}]:[])];
        for(const cell of title.cells) {
            const total=cell.seenBands.reduce((n,b)=>n+b.people,0);if(!total)continue;
            const quality=cell.seenBands.reduce((n,b)=>n+b.people*b.satisfaction,0)/total;
            const lastWeek=Math.max(...cell.seenBands.map(b=>b.lastViewedWeek));
            for(const credit of credits) {
                const people=Math.floor(total*credit.weight),old=firstByIdentity.get(key(cell.cohortId,credit.kind,credit.id));
                if(old){old.strength=(old.strength+quality)/2;old.people=Math.max(old.people,people);old.lastWeek=Math.max(old.lastWeek,lastWeek)}
                else index({cohortId:cell.cohortId,kind:credit.kind,id:credit.id,people,strength:quality,lastWeek});
            }
        }
    }
    const compact=[...byCohort.keys()].sort().flatMap(id=>byCohort.get(id)!.sort((a,b)=>b.lastWeek-a.lastWeek||b.people-a.people||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)).slice(0,CINEMA_AUDIENCE_PROFILE.maxAffinityEntriesPerCohort));
    return {...state,titles:retained,runs:state.runs.filter(r=>keep.has(r.titleId)),affinities:compact.sort((a,b)=>a.cohortId.localeCompare(b.cohortId)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id))};
};
