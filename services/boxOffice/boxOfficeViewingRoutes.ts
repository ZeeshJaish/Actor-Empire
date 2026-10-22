import type { StreamingTitleAccessRoute } from '../streamingTitleAccess';
/** One immutable weekly projection only. No cache survives a player/world change. */
export const createCinemaViewingRouteLookup = <T extends {titleId:string}>(resolve:(countryId:string,week:number,route:StreamingTitleAccessRoute)=>readonly T[]) => {
    const cache=new Map<string,{titles:readonly T[];ids:Set<string>}>();
    const read=(countryId:string,week:number,route:StreamingTitleAccessRoute)=>{
        const plan=route.kind==='SUBSCRIPTION'?route.planId:undefined;
        // Length prefixes keep arbitrary IDs unambiguous without serializing game state.
        const key=`${countryId.length}:${countryId}:${week}:${route.kind}:${plan===undefined?'none':`${plan.length}:${plan}`}`;
        let entry=cache.get(key);
        if(!entry){const titles=Object.freeze([...resolve(countryId,week,route)]);entry={titles,ids:new Set(titles.map(t=>t.titleId))};cache.set(key,entry)}
        return entry;
    };
    return {titles:(countryId:string,week:number,route:StreamingTitleAccessRoute)=>read(countryId,week,route).titles,
        hasTitle:(countryId:string,week:number,route:StreamingTitleAccessRoute,titleId:string)=>read(countryId,week,route).ids.has(titleId)};
};
