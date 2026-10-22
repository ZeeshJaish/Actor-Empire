import React, { useEffect, useRef, useState } from 'react';
import type { Player, ProjectDetails } from '../types';
import type { CinemaForecast } from '../services/boxOffice/boxOfficeForecast';
import { formatMoney } from '../services/formatUtils';
export const CinemaForecastPanel=({player,project,titleId,releaseWeek,onForecast}:{player:Player;project:ProjectDetails;titleId:string;releaseWeek?:number;onForecast?:(f:CinemaForecast|null)=>void})=>{
    const [result,setResult]=useState<CinemaForecast|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
    const worker=useRef<Worker|null>(null),callback=useRef(onForecast);callback.current=onForecast;
    // Draft autosaves replace Player/Project objects without changing audience facts.
    const signature=JSON.stringify({titleId,releaseWeek,week:player.currentWeek,age:player.age,fame:player.stats.fame,
        marketWeek:player.world.cinemaMarket?.lastProcessedAbsoluteWeek,
        slate:player.activeReleases.map(r=>[r.id,r.distributionPhase,r.totalGross]),
        populationWeek:player.world.worldPopulation?.lastProcessedAbsoluteWeek,
        project:{studioId:project.studioId,genre:project.genre,budget:project.estimatedBudget,cast:project.castList,
            quality:project.hiddenStats?.estimatedQualityScore,exposure:project.cinemaExposure,regions:project.releaseRegionIds,
            chains:project.releaseChainSelections,strategy:project.screeningStrategy,language:project.originalLanguageId,
            universe:project.universeId,campaign:project.marketingChannelAllocations,spend:project.marketingBudgetSpent}});

    useEffect(()=>{worker.current?.terminate();worker.current=null;setResult(null);setBusy(false);setError('');callback.current?.(null);return()=>worker.current?.terminate()},[signature]);
    const calculate=()=>{
        worker.current?.terminate();setBusy(true);setError('');
        const w=new Worker(new URL('../services/boxOffice/boxOfficeForecast.worker.ts',import.meta.url),{type:'module'});worker.current=w;
        w.onmessage=({data})=>{if(worker.current!==w)return;setBusy(false);setError(data.error||'');setResult(data.forecast||null);callback.current?.(data.forecast||null);w.terminate();worker.current=null};
        w.onerror=()=>{if(worker.current!==w)return;setBusy(false);setError('Forecast unavailable. Try again.');w.terminate();worker.current=null};
        w.postMessage(JSON.parse(JSON.stringify({player,project,titleId,releaseWeek})));
    };
    const row=result?.titles.find(t=>t.titleId===titleId),number=(n:number)=>n.toLocaleString('en-US');
    return <section aria-label="Cinema audience forecast" className="m-3 rounded-2xl border border-emerald-400/20 bg-zinc-950 p-4 text-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-sm">Cinema audience forecast</h3><button type="button" disabled={busy} onClick={calculate} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-60">{busy?'Calculating…':result?'Refresh forecast':'Calculate forecast'}</button></div>
        <p className="text-xs text-zinc-400">Current audience, country prices and competing films. Before Greenlight, campaign spend is only a plan. Future competition and delivery may change.</p>
        {error&&<p role="status" className="text-xs text-amber-300">{error}</p>}
        {row&&<><dl className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries({'Attention potential':`${row.attentionPotential}/100`,'Market awareness':number(row.awarePeople),'Theater intent':`${number(row.theaterIntent.low)}–${number(row.theaterIntent.high)}`,'Opening paid visits':`${number(row.admissions.low)}–${number(row.admissions.high)}`,'Opening public gross':`${formatMoney(row.grossCents.low/100)}–${formatMoney(row.grossCents.high/100)}`,'Producer receipts':`${formatMoney(row.producerReceiptsCents.low/100)}–${formatMoney(row.producerReceiptsCents.high/100)}`,'Opening booking costs':`${formatMoney(row.bookingCostCents.low/100)}–${formatMoney(row.bookingCostCents.high/100)}`,'Automatic ticket prices':`${formatMoney(row.ticketPriceCents.low/100)}–${formatMoney(row.ticketPriceCents.high/100)}`,'Cost recovery visits':row.breakEvenAdmissions===null?'No paid demand estimate':number(row.breakEvenAdmissions)}).map(([label,value])=><div key={label} className="min-w-0"><dt className="text-zinc-400">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}
        </dl><p className="text-xs text-zinc-400">{row.capacityConstrained?'Some intent cannot convert within available money, time and seats.':'Available screens do not guarantee visits.'} Cost recovery uses estimated receipts per visit, production, planned campaign and opening booking; later costs can increase it. This is not a lifetime payout.</p>
        <details className="text-xs"><summary>Awareness by country</summary><ul className="mt-2 grid grid-cols-2 gap-2">{row.awarenessByCountry.map(c=><li key={c.countryId}>{c.countryId}: {number(c.awarePeople)} / {number(c.people)}</li>)}</ul></details></>}
    </section>;
};
