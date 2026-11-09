import { CINEMA_AUDIENCE_PROFILE } from './boxOfficeProfiles';
import type { CinemaAffinity, CinemaMarketState } from './boxOfficeTypes';

/** Retire closed matrices into bounded overlapping affinity summaries; money lives in title ledgers. */
export const compactCinemaMarketState = (state:CinemaMarketState,keep:ReadonlySet<string>):CinemaMarketState => {
    const retained=state.titles.filter(t=>keep.has(t.titleId));
    const retired=state.titles.filter(t=>!keep.has(t.titleId)).sort((a,b)=>a.releaseWeek-b.releaseWeek||a.titleId.localeCompare(b.titleId));
    /* Perf plan Phase 3 (2026-11-09): rows are copied only when a retired title changes them (copy on
       write), instead of cloning every row each week; the state passed in is never changed. */
    type Found={row:CinemaAffinity;copied:boolean;rows:CinemaAffinity[];at:number};
    const byCohort=new Map<string,CinemaAffinity[]>(),firstByIdentity=new Map<string,Map<string,Map<string,Found>>>();
    const lookup=(cohortId:string,kind:CinemaAffinity['kind'],id:string):Found|undefined=>firstByIdentity.get(cohortId)?.get(kind)?.get(id);
    const index=(entry:CinemaAffinity,copied:boolean)=>{
        let rows=byCohort.get(entry.cohortId);
        if(!rows){rows=[];byCohort.set(entry.cohortId,rows);}
        rows.push(entry);
        // Preserve Array.find's first-match behavior for older duplicate rows.
        let kinds=firstByIdentity.get(entry.cohortId);if(!kinds){kinds=new Map();firstByIdentity.set(entry.cohortId,kinds);}
        let ids=kinds.get(entry.kind);if(!ids){ids=new Map();kinds.set(entry.kind,ids);}
        if(!ids.has(entry.id))ids.set(entry.id,{row:entry,copied,rows,at:rows.length-1});
    };
    for(const entry of state.affinities)index(entry,false);
    const writable=(found:{row:CinemaAffinity;copied:boolean;rows:CinemaAffinity[];at:number}):CinemaAffinity=>{
        if(!found.copied){found.row={...found.row};found.copied=true;found.rows[found.at]=found.row;}
        return found.row;
    };
    for(const title of retired) {
        const roles=new Map<string,number>();for(const p of title.cast)roles.set(p.personId,Math.max(roles.get(p.personId)||0,p.roleWeight));
        const credits=[...[...roles].map(([id,weight])=>({kind:'ACTOR' as const,id,weight})),{kind:'STUDIO' as const,id:title.ownerId,weight:1},...(title.universeId?[{kind:'UNIVERSE' as const,id:title.universeId,weight:1}]:[])];
        for(const cell of title.cells) {
            const total=cell.seenBands.reduce((n,b)=>n+b.people,0);if(!total)continue;
            const quality=cell.seenBands.reduce((n,b)=>n+b.people*b.satisfaction,0)/total;
            const lastWeek=Math.max(...cell.seenBands.map(b=>b.lastViewedWeek));
            for(const credit of credits) {
                const people=Math.floor(total*credit.weight),found=lookup(cell.cohortId,credit.kind,credit.id);
                if(found){const old=writable(found);old.strength=(old.strength+quality)/2;old.people=Math.max(old.people,people);old.lastWeek=Math.max(old.lastWeek,lastWeek)}
                else index({cohortId:cell.cohortId,kind:credit.kind,id:credit.id,people,strength:quality,lastWeek},true);
            }
        }
    }
    const kept=new Map<string,CinemaAffinity[]>([...byCohort.keys()].sort().map(id=>[id,byCohort.get(id)!.sort((a,b)=>b.lastWeek-a.lastWeek||b.people-a.people||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)).slice(0,CINEMA_AUDIENCE_PROFILE.maxAffinityEntriesPerCohort)]));
    const byRow=(a:CinemaAffinity,b:CinemaAffinity)=>a.cohortId.localeCompare(b.cohortId)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id);
    /* Perf plan Phase 3 (2026-11-09): the final order is built cohort by cohort (cohorts in locale order,
       each cohort's rows by kind and id). That is the one stable sort of every row by cohort, kind and id,
       as long as no two different cohort ids compare equal; if any do, the full sort runs as before. */
    const cohorts=[...kept.keys()].sort((a,b)=>a.localeCompare(b));
    const collated=cohorts.every((id,i)=>i===0 || cohorts[i-1].localeCompare(id)!==0);
    const affinities=collated
        ? cohorts.flatMap(id=>kept.get(id)!.slice().sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)))
        : [...kept.keys()].flatMap(id=>kept.get(id)!).sort(byRow);
    return {...state,titles:retained,runs:state.runs.filter(r=>keep.has(r.titleId)),affinities};
};
