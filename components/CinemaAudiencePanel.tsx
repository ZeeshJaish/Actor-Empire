import React from 'react';
import type { Player } from '../types';
import { getCinemaAudienceInsights } from '../services/boxOffice/boxOfficePresentation';
export const CinemaAudiencePanel=({player,titleId}:{player:Player;titleId:string})=>{
    const data=getCinemaAudienceInsights(player,titleId),n=(v:number)=>v.toLocaleString('en-US');
    return <section aria-label="Cinema audience insights" className="m-3 rounded-xl border border-yellow-300/20 bg-zinc-950 p-3 text-xs text-zinc-300 space-y-2">
        <h3 className="font-bold text-yellow-200">Cinema audience insights</h3>
        <p>{data.evidence==='UNAVAILABLE'?'Audience history unavailable':`${n(data.firstAdmissions||0)} first visits · ${n(data.repeatAdmissions||0)} paid repeat visits`}</p>
        <p>{data.note}</p>{data.tags.length>0&&<ul className="flex flex-wrap gap-2">{data.tags.map(tag=><li className="rounded-lg bg-yellow-200/10 px-2 py-1" key={tag}>{tag}</li>)}</ul>}
    </section>;
};
