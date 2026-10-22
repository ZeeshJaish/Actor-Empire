import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Player} from '../types';
import {processGameWeek} from '../services/gameLoop';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {prepareProcessedWeekForUi} from '../services/playerUiState';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/storage';
import {createDeterministicRng} from '../services/deterministicRandom';
const q=new URLSearchParams(location.search),fixture=q.get('fixture')==='late'?'late':'early';
const App=()=>{
 const [player,setPlayer]=useState<Player|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[rows,setRows]=useState<any[]>([]);const pending=useRef<any>(null);const seq=useRef(0);
 useEffect(()=>{fetch('/cinema-benchmark-fixture/'+fixture).then(r=>r.json()).then(setPlayer).catch(e=>setError(String(e)))},[]);
 useEffect(()=>{if(!pending.current)return;const row=pending.current;pending.current=null;requestAnimationFrame(()=>requestAnimationFrame(()=>{row.eventToPaintMs=performance.now()-row.started;delete row.started;setRows(r=>[...r,row]);setBusy(false)}))},[player]);
 const advance=async()=>{if(!player||busy)return;setBusy(true);const i=seq.current++;Math.random=createDeterministicRng(`cinema-bench:${fixture}:${i-1}`);Date.now=()=>1800000000000+i;const started=performance.now();try{
  const result=await processGameWeek(player),computed=performance.now();const prepared=prepareVerifiedPlayerForPersistence(result.player,'PROCESS_WEEK'),prepped=performance.now();
  await saveVerifiedGameData('phase6-authored-qa',prepared.player,prepared.manifest);const persisted=performance.now();const loaded=await loadVerifiedGameData('phase6-authored-qa');if(loaded.status!=='CURRENT')throw new Error('Authored QA save did not verify');
  if(loaded.player!.world.cinemaMarket?.lastProcessedAbsoluteWeek!==prepared.player.world.cinemaMarket?.lastProcessedAbsoluteWeek)throw new Error('UI would precede durable cinema commit');
  pending.current={index:i,computeMs:computed-started,prepareMs:prepped-computed,persistenceMs:persisted-prepped,verifiedReadMs:performance.now()-persisted,started,saveJsonCodeUnits:JSON.stringify(prepared.player).length};setPlayer(prepareProcessedWeekForUi(prepared.player));
 }catch(e){setError(String(e));setBusy(false)}};
 return <main style={{fontFamily:'system-ui',padding:20,maxWidth:600,margin:'auto'}}><h1>Cinema Phase 6 performance QA</h1><p>Authored {fixture} fixture. Isolated browser context; no real career saves. Real verified IndexedDB persistence occurs before this summary renders.</p><p>Week {player?.currentWeek} · age {player?.age} · retained cinema weeks {player?.world.cinemaMarket?.weeks.length||0}</p><button disabled={!player||busy} onClick={advance}>{busy?'Processing and saving…':'Advance verified game week'}</button><p role="alert">{error}</p><pre data-testid="metrics">{JSON.stringify(rows,null,2)}</pre></main>;
};createRoot(document.getElementById('root')!).render(<App/>);
