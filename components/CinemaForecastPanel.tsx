import React, { useEffect, useRef, useState } from 'react';
import type { Player, ProjectDetails } from '../types';
import type { CinemaForecast } from '../services/boxOffice/boxOfficeForecast';
import { formatMoney } from '../services/formatUtils';
import { isWeekAheadPreparing } from '../services/weekAhead/weekAheadClient';
import { isSwitchOn } from '../services/remoteSwitches';

/* Phase 1 of the week-speed plan (2026-11-17), item 7. Before, every Calculate tap copied the whole career with
   JSON.parse(JSON.stringify(...)) on the main thread, then started the 5 MB forecast worker. Now:
   - the worker starts when the panel opens, and stays for the next Calculate;
   - the tap shows "Calculating…" first; the career then goes to the worker as one structured copy, and the worker
     makes the JSON copy (the same data as before: boxOfficeForecast.worker.ts). The forecast reads most of the
     career (85-90% of its bytes on two late careers, 17 Nov), so a smaller projection would not save much;
   - on phones with 4 GB or less, it waits while Week Ahead prepares a week (two career copies at once there). */
const LOW_MEMORY_GB = 4;
const isLowMemoryPhone = (): boolean => {
    const ios = Number((window as Window & { __aeDeviceMemoryGB?: number }).__aeDeviceMemoryGB);
    const android = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory);
    const gb = Number.isFinite(ios) && ios > 0 ? ios : Number.isFinite(android) && android > 0 ? android : NaN;
    return Number.isFinite(gb) && gb <= LOW_MEMORY_GB;
};
const createForecastWorker = () => new Worker(new URL('../services/boxOffice/boxOfficeForecast.worker.ts', import.meta.url), { type: 'module' });
/** The career as the worker needs it: its callbacks (pending life events) are not copyable, and JSON drops them anyway. */
const careerForForecast = (player: Player): Player => ({
    ...player,
    pendingEvents: JSON.parse(JSON.stringify(player.pendingEvents ?? [])),
    ...((player as Player & { pendingEvent?: unknown }).pendingEvent !== undefined
        ? { pendingEvent: JSON.parse(JSON.stringify((player as Player & { pendingEvent?: unknown }).pendingEvent ?? null)) }
        : {}),
} as Player);

export const CinemaForecastPanel=({player,project,titleId,releaseWeek,onForecast}:{player:Player;project:ProjectDetails;titleId:string;releaseWeek?:number;onForecast?:(f:CinemaForecast|null)=>void})=>{
    const [result,setResult]=useState<CinemaForecast|null>(null),[busy,setBusy]=useState(false),[waiting,setWaiting]=useState(false),[error,setError]=useState('');
    const worker=useRef<Worker|null>(null),callback=useRef(onForecast);callback.current=onForecast;
    const requestRef=useRef(0),busyRef=useRef(false),latest=useRef({player,project,titleId,releaseWeek});latest.current={player,project,titleId,releaseWeek};
    // Draft autosaves replace Player/Project objects without changing audience facts.
    const signature=JSON.stringify({titleId,releaseWeek,week:player.currentWeek,age:player.age,fame:player.stats.fame,
        marketWeek:player.world.cinemaMarket?.lastProcessedAbsoluteWeek,
        slate:player.activeReleases.map(r=>[r.id,r.distributionPhase,r.totalGross]),
        streamingWindows:Object.values(player.world.streamingRightsContracts||{}).map(c=>
            [c.id,c.sourceProjectId,c.status,c.countryIds,c.startsAtAbsoluteWeek,c.expiresAtAbsoluteWeek,c.buyer.platformId]),
        populationWeek:player.world.worldPopulation?.lastProcessedAbsoluteWeek,
        project:{studioId:project.studioId,genre:project.genre,budget:project.estimatedBudget,cast:project.castList,
            quality:project.hiddenStats?.estimatedQualityScore,exposure:project.cinemaExposure,regions:project.releaseRegionIds,
            chains:project.releaseChainSelections,strategy:project.screeningStrategy,language:project.originalLanguageId,
            universe:project.universeId,campaign:project.marketingChannelAllocations,spend:project.marketingBudgetSpent}});

    const ensureWorker=()=>{
        if(worker.current)return worker.current;
        const w=createForecastWorker();worker.current=w;
        w.onmessage=({data})=>{
            if(worker.current!==w||data?.requestId!==requestRef.current)return; // a newer request, or an older panel state
            busyRef.current=false;setBusy(false);setWaiting(false);setError(data.error||'');setResult(data.forecast||null);callback.current?.(data.forecast||null);
        };
        w.onerror=()=>{if(worker.current!==w)return;busyRef.current=false;setBusy(false);setWaiting(false);setError('Forecast unavailable. Try again.');w.terminate();worker.current=null};
        return w;
    };
    // The worker starts with the panel (its 5 MB of code loads off the main thread), unless Week Ahead is preparing a
    // week on a low-memory phone: then it starts on Calculate, after that week.
    useEffect(()=>{
        if(!(isLowMemoryPhone()&&isWeekAheadPreparing()))ensureWorker();
        // a Calculate still waiting for Week Ahead stops too, so no worker starts after the panel closed
        return()=>{requestRef.current++;worker.current?.terminate();worker.current=null;};
    },[]);
    // A change in what the forecast reads clears the answer; a calculation still running for the old state is
    // stopped (its worker replaced), as before.
    useEffect(()=>{
        requestRef.current++;
        if(busyRef.current){worker.current?.terminate();worker.current=null;}
        busyRef.current=false;setResult(null);setBusy(false);setWaiting(false);setError('');callback.current?.(null);
    },[signature]);

    const calculate=()=>{
        const requestId=++requestRef.current;
        busyRef.current=true;setBusy(true);setError('');
        const send=()=>{
            if(requestRef.current!==requestId)return;
            if(isLowMemoryPhone()&&isWeekAheadPreparing()){setWaiting(true);window.setTimeout(send,400);return;}
            setWaiting(false);
            const {player:p,project:pr,titleId:id,releaseWeek:week}=latest.current;
            const w=ensureWorker();
            // Switched off from Firebase (plan item 8): the JSON copy is made here, as before.
            if(!isSwitchOn('forecastWorkerCopy')){w.postMessage(JSON.parse(JSON.stringify({requestId,player:p,project:pr,titleId:id,releaseWeek:week})));return;}
            try{w.postMessage({requestId,jsonCopyInWorker:true,player:careerForForecast(p),project:pr,titleId:id,releaseWeek:week});}
            catch{
                // Something in the career cannot be copied as it is: the old way, a JSON copy here.
                w.postMessage(JSON.parse(JSON.stringify({requestId,player:p,project:pr,titleId:id,releaseWeek:week})));
            }
        };
        // "Calculating…" is on screen before the career is copied.
        window.requestAnimationFrame(()=>window.setTimeout(send,0));
    };
    const row=result?.titles.find(t=>t.titleId===titleId),number=(n:number)=>n.toLocaleString('en-US');
    return <section aria-label="Cinema audience forecast" className="m-3 rounded-2xl border border-emerald-400/20 bg-zinc-950 p-4 text-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-sm">Cinema audience forecast</h3><button type="button" disabled={busy} onClick={calculate} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-60">{busy?'Calculating…':result?'Refresh forecast':'Calculate forecast'}</button></div>
        <p className="text-xs text-zinc-400">Current audience, country prices and competing films. Before Greenlight, campaign spend is only a plan. Future competition and delivery may change.</p>
        {waiting&&<p role="status" className="text-xs text-zinc-400">Waiting for the next week to finish preparing…</p>}
        {error&&<p role="status" className="text-xs text-amber-300">{error}</p>}
        {row&&<><dl className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries({'Attention potential':`${row.attentionPotential}/100`,'Market awareness':number(row.awarePeople),'Theater intent':`${number(row.theaterIntent.low)}–${number(row.theaterIntent.high)}`,'Opening paid visits':`${number(row.admissions.low)}–${number(row.admissions.high)}`,'Opening public gross':`${formatMoney(row.grossCents.low/100)}–${formatMoney(row.grossCents.high/100)}`,'Producer receipts':`${formatMoney(row.producerReceiptsCents.low/100)}–${formatMoney(row.producerReceiptsCents.high/100)}`,'Opening booking costs':`${formatMoney(row.bookingCostCents.low/100)}–${formatMoney(row.bookingCostCents.high/100)}`,'Automatic ticket prices':`${formatMoney(row.ticketPriceCents.low/100)}–${formatMoney(row.ticketPriceCents.high/100)}`,'Cost recovery visits':row.breakEvenAdmissions===null?'No paid demand estimate':number(row.breakEvenAdmissions)}).map(([label,value])=><div key={label} className="min-w-0"><dt className="text-zinc-400">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}
        </dl><p className="text-xs text-zinc-400">{row.capacityConstrained?'Some intent cannot convert within available money, time and seats.':'Available screens do not guarantee visits.'} Cost recovery uses estimated receipts per visit, production, planned campaign and opening booking; later costs can increase it. This is not a lifetime payout.</p>
        <details className="text-xs"><summary>Awareness by country</summary><ul className="mt-2 grid grid-cols-2 gap-2">{row.awarenessByCountry.map(c=><li key={c.countryId}>{c.countryId}: {number(c.awarePeople)} / {number(c.people)}</li>)}</ul></details></>}
    </section>;
};
