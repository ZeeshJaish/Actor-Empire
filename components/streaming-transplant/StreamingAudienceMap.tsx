import React, {useMemo, useState} from 'react';
import type {OwnedStreamingMarketOperation} from '../../types';
import type {StreamingAudienceCountryView} from '../../services/streamingAudienceMarket';
import {buildStreamingGroupMarketMap} from '../studio-finance/finance/groupMarketMap';
import {WORLD_LAND_PATH} from '../../views/lifestyle/business/components/worldMapDetailedGeometry';
import css from './presentation/screens/AudienceDesk/AudienceDesk.module.css';

const compact=(n:number)=>n>=1e9?`${(n/1e9).toFixed(2)}B`:n>=1e6?`${(n/1e6).toFixed(2)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:Math.round(n).toLocaleString();
export type AudienceMapScope='INDUSTRY'|'PLATFORM'|'MARKETS';
const stateOf=(row?:OwnedStreamingMarketOperation)=>row?.status==='ACTIVE'?'Live':row?.status==='READY'?'Cleared':row?.clearance?'In review':row?'Selected':'Not entered';
const stateColor=(row?:OwnedStreamingMarketOperation)=>row?.status==='ACTIVE'?'#43c98b':row?.status==='READY'?'#75a9ff':row?.clearance?'#e9ae49':row?'#b3b9c5':'#283341';
const POSITIONS:Record<string,[number,number]>={NORTH_AMERICA:[205,155],SOUTH_AMERICA:[310,365],EUROPE:[490,110],AFRICA:[530,310],ASIA:[745,205],OCEANIA:[870,435]};

export function StreamingAudienceMap({countries,operations=[],scope,live,regionId,onRegionChange,countryId,onCountryChange,onManage,onClearance}:{
 countries:StreamingAudienceCountryView[];operations?:OwnedStreamingMarketOperation[];scope:AudienceMapScope;live:boolean;
 regionId:string|null;onRegionChange:(id:string|null)=>void;countryId:string|null;onCountryChange:(id:string|null)=>void;
 onManage?:(id?:string)=>void;onClearance?:(id?:string)=>void;
}){
 const [search,setSearch]=useState('');
 const byOperation=useMemo(()=>new Map(operations.filter(row=>row.scope==='COUNTRY'&&row.status!=='EXITED').map(row=>[row.countryId,row])),[operations]);
 const selected=countries.find(row=>row.id===countryId);
 const regions=useMemo(()=>Array.from(new Map(countries.map(row=>[row.regionId,row.regionName]))).map(([id,label])=>({id,label,countries:countries.filter(row=>row.regionId===id)})),[countries]);
 const shown=countries.filter(row=>(!regionId||row.regionId===regionId));
 const visible=shown.filter(row=>!search||row.country.toLowerCase().includes(search.toLowerCase()));
 const shape=useMemo(()=>buildStreamingGroupMarketMap(shown.map(row=>row.id),new Set()),[countries,regionId]);
 const measured=shown.length>0&&shown.every(row=>row.audienceMeasured);
 const total=scope==='MARKETS'?shown.filter(row=>byOperation.has(row.id)).length:scope==='PLATFORM'?shown.reduce((sum,row)=>sum+(row.playerPaidAccounts||0),0):shown.reduce((sum,row)=>sum+row.activeViewers,0);
 const label=scope==='MARKETS'?'markets in your plan':scope==='PLATFORM'?'settled paid accounts':`${measured?'Settled':'Modelled'} industry viewers`;
 const focus=(row:StreamingAudienceCountryView)=>{onCountryChange(row.id);onRegionChange(row.regionId);};
 return <section className={css.audienceMap} aria-label={`${scope.toLowerCase()} geographic overview`}>
   <header><div><span>{scope==='INDUSTRY'?'STREAMING MARKET':scope==='PLATFORM'?'YOUR PLATFORM':'MARKET PORTFOLIO'}</span><h2>{regionId?regions.find(row=>row.id===regionId)?.label:'World footprint'}</h2></div>
    {regionId&&<button type="button" onClick={()=>{onRegionChange(null);onCountryChange(null);}}>World ↗</button>}
   </header>
   <div className={css.audienceMapNumber}><strong>{scope==='PLATFORM'&&!measured?'—':compact(total)}</strong><span>{scope==='PLATFORM'&&!measured?live?'Country accounts appear after the next settled week.':'Your platform has not opened yet.':label}</span></div>
   <div className={css.audienceMapCanvas}>
    <svg viewBox={regionId?shape.viewBox.join(' '):'0 0 1000 520'} role="group" aria-label="Country map. Use the region controls or country search to inspect a market.">
     <path d={WORLD_LAND_PATH} fill="#17212d" stroke="#384454" strokeWidth=".6"/>
     {shape.countries.map(geo=>{
       const row=countries.find(country=>country.id===geo.id)!; const operation=byOperation.get(row.id);
       const fill=scope==='INDUSTRY'?'var(--epx-ad-c)':scope==='PLATFORM'?(row.playerPaidAccounts?'var(--epx-ad-c)':'#283341'):stateColor(operation);
       return <g key={row.id} onClick={()=>focus(row)} aria-label={`${row.country}, ${scope==='MARKETS'?stateOf(operation):scope==='PLATFORM'?`${row.playerPaidAccounts??'unsettled'} paid accounts`:`${compact(row.activeViewers)} industry viewers`}`} role="button" style={{cursor:'pointer'}}>
        <title>{row.country} · {scope==='MARKETS'?stateOf(operation):scope==='PLATFORM'?`${row.playerPaidAccounts??'No settled'} accounts`:`${compact(row.activeViewers)} viewers`}</title>
        {geo.path&&<path d={geo.path} fill={fill} fillOpacity={scope==='INDUSTRY'?.3+Math.min(.6,Math.log10(Math.max(1,row.activeViewers))/12):.75} stroke={countryId===row.id?'#fff':'#526070'} strokeWidth={countryId===row.id?2:.5}/>}
        {(geo.markerOnly||countryId===row.id)&&<circle cx={geo.x} cy={geo.y} r={geo.markerOnly?3:5} fill={fill} stroke="#fff" strokeWidth="1"/>}
       </g>;
     })}
     {!regionId&&regions.map(region=>{const [x,y]=POSITIONS[region.id]||[500,260];const n=scope==='MARKETS'?region.countries.filter(row=>byOperation.has(row.id)).length:region.countries.reduce((sum,row)=>sum+(scope==='PLATFORM'?row.playerPaidAccounts||0:row.activeViewers),0);return <g key={region.id} transform={`translate(${x} ${y})`} onClick={()=>{onRegionChange(region.id);onCountryChange(null);}} style={{cursor:'pointer'}} aria-hidden="true"><rect x="-68" y="-20" width="136" height="40" rx="12" fill="#0b111bea" stroke="#ffffff30"/><text textAnchor="middle" fill="#f5f7fb" dominantBaseline="central" fontSize="26" fontWeight="800">{scope==='PLATFORM'&&!measured?'—':compact(n)}</text></g>;})}
    </svg>
   </div>
   {scope==='MARKETS'?<div className={css.audienceMapLegend}><span><i style={{background:'#43c98b'}}/>Live</span><span><i style={{background:'#75a9ff'}}/>Cleared</span><span><i style={{background:'#e9ae49'}}/>In review</span><span><i style={{background:'#b3b9c5'}}/>Selected</span><span><i style={{background:'#283341'}}/>Not entered</span></div>:<p className={css.audienceMapHint}>{scope==='PLATFORM'?'Paid accounts are settled customer records; they are not concurrent viewers.':measured?'Industry audience from the current settled customer week.':'Industry audience is a modelled estimate, not your platform audience.'}</p>}
   <div className={css.audienceMapRegions}>
    {regions.map(region=><button type="button" key={region.id} aria-pressed={regionId===region.id} onClick={()=>{onRegionChange(region.id);onCountryChange(null);}}><span>{region.label}</span><b>{scope==='MARKETS'?`${region.countries.filter(row=>byOperation.has(row.id)).length}/${region.countries.length}`:scope==='PLATFORM'&&!measured?'—':compact(region.countries.reduce((sum,row)=>sum+(scope==='PLATFORM'?row.playerPaidAccounts||0:row.activeViewers),0))}</b></button>)}
   </div>
   <div className={css.audienceMapSearch}>
    <label>Find a country<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search countries" type="search"/></label>
    <label>Country<select value={selected&&visible.some(row=>row.id===selected.id)?selected.id:''} onChange={event=>{const row=countries.find(item=>item.id===event.target.value);if(row)focus(row);}}><option value="">Choose a country ({visible.length})</option>{visible.map(row=><option key={row.id} value={row.id}>{row.country}</option>)}</select></label>
   </div>
   {selected&&<article className={css.audienceCountryFocus}><header><div><span>{selected.regionName}</span><h3>{selected.country}</h3></div><b>{stateOf(byOperation.get(selected.id))}</b></header>
    <div><span>{scope==='PLATFORM'?'Paid accounts':'Industry viewers'}<b>{scope==='PLATFORM'?selected.playerPaidAccounts==null?'Not settled':compact(selected.playerPaidAccounts):compact(selected.activeViewers)}</b></span><span>Industry adoption<b>{selected.streamingAdoptionPercent}%</b></span></div>
    {scope==='MARKETS'&&<p>{byOperation.get(selected.id)?.clearance?.condition||'Select a new market or review its existing filing. Active markets keep their current service.'}</p>}
    {scope==='MARKETS'&&(byOperation.get(selected.id)?.clearance?<button type="button" onClick={()=>onClearance?.(selected.id)}>Review clearance →</button>:<button type="button" onClick={()=>onManage?.(selected.id)}>{byOperation.has(selected.id)?'Manage market':'Plan entry'} →</button>)}
   </article>}
 </section>;
}
