/* Synthetic isolated save namespace; all market, acquisition, week, migration and storage actions are production services. */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER, type Player } from '../types';
import { StocksApp } from '../views/mobile/StocksApp';
import { ForbesApp } from '../views/mobile/ForbesApp';
import { StockControlEventModal } from '../components/StockControlEventModal';
import { initializeStocks, executeStockTrade, getStockOutstandingShares, calculateStockTradeQuote } from '../services/stockLogic';
import { getAcquisitionCase, runDueDiligence } from '../services/studioAcquisition';
import { buildForbesStudioProfile } from '../services/forbesStudioProfile';
import { getAcquisitionDebtSummary } from '../services/acquisitionDebt';
import { getStudioOwnershipPercent } from '../services/studioOwnership';
import { ensureStudioEcosystem } from '../services/studioEcosystem';
import { attachNormalizedStudioAiState } from '../services/studioAi/studioAiState';
import { prepareExternalPlayerUpdateForUi, prepareProcessedWeekForUi } from '../services/playerUiState';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/storage';
import { processGameWeek } from '../services/gameLoop';
import { acknowledgeStockControlNotice } from '../services/stockControlNotices';
import '../index.css';

const params = new URLSearchParams(location.search);
const studioId = params.get('studio') || 'PARAMOUNT';
const scenario = params.get('scenario') || 'fresh';
const key = `isolated-stock-acquisition-safety-${studioId}-${scenario}`;
const makeSeed = (): Player => {
  let p = structuredClone(INITIAL_PLAYER);
  p.id = 'isolated-stock-safety'; p.name = 'Stock Safety Buyer'; p.age = 35; p.currentWeek = 8;
  p.money = scenario === 'sxWallet' ? 10.6e21 : 2_000_000_000_000; p.energy = {...p.energy, current: Number(params.get('energy') ?? 100)};
  p.stocks = initializeStocks(); p.portfolio = []; p.businesses = []; p.pendingEvents = [];
  p.flags = {...p.flags, tutorialCompleted: true}; p.world = ensureStudioEcosystem(p.world);
  if (params.has('debtMillions')) {
    const company = attachNormalizedStudioAiState(p.world.studios![studioId], {absoluteWeek: (p.age-1)*52+p.currentWeek-1});
    company.ai!.finance.debtPrincipalMillions = Number(params.get('debtMillions'));
    p.world.studios![studioId] = company;
  }
  if (scenario==='repairedQuote') {const stock=p.stocks.find(s=>s.relatedStudioId===studioId)!;stock.price=10.6e21;stock.priceHistory=[10.6e21];p.portfolio=[{stockId:stock.id,shares:100,averageCost:0,totalInvested:0}];}
  if (['draft','accepted','countered','rejected'].includes(scenario)) {
    const s = p.stocks.find(s=>s.relatedStudioId===studioId)!;
    const shares = Math.floor(getStockOutstandingShares(s) * Number(params.get('pct') || 51) / 100);
    p.portfolio = [{stockId:s.id,shares,averageCost:s.price,totalInvested:shares*s.price}];
    const profile = buildForbesStudioProfile({player:p,studio:p.world.studios![studioId],rank:1,worldProjects:p.world.projects,universes:p.world.universes});
    p = runDueDiligence({player:p,profile,funding:{source:'PERSONAL'}}).player;
    const c = getAcquisitionCase(p,studioId)!;
    if (['accepted','countered','rejected'].includes(scenario)) {
      c.status = scenario.toUpperCase() as any;
      c.offer = {type:'MINORITY',amount:1e9,minorityPercent:49,funding:{source:'PERSONAL'},complianceRisk:0,complianceBand:'ROUTINE',submittedWeek:7,submittedYear:35,round:1};
      c.sellerResponse = {decision:scenario.toUpperCase() as any,agreedAmount:scenario==='accepted'?1e9:undefined,counterAmount:scenario==='countered'?1.1e9:undefined,round:1,respondedWeek:8,respondedYear:35,summary:'Explicit isolated legacy fixture'};
    }
  }
  return prepareExternalPlayerUpdateForUi(p);
};
const snapshot = (p:Player) => ({
  money:p.money,age:p.age,week:p.currentWeek,energy:p.energy.current,
  holdings:p.portfolio,case:getAcquisitionCase(p,studioId),
  businesses:p.businesses.map(b=>({id:b.id,balance:b.balance,ownership:getStudioOwnershipPercent(p,b),state:b.studioState})),
  debt:getAcquisitionDebtSummary(p),
  reminders:(p.pendingEvents||[]).filter(e=>e.data?.stockDecisionType==='TAKEOVER_CONTROL'),
  history:p.finance.history,stock:p.stocks.find(s=>s.relatedStudioId===studioId),
  energyLog:p.flags.weeklyEnergySpendLog,repairs:p.flags.stockQuoteRepairs,
});
function Harness() {
 const [p,setP]=useState<Player|null>(null),[screen,setScreen]=useState<'STOCKS'|'FORBES'>('STOCKS'),[initialStudio,setInitialStudio]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saveStatus,setSaveStatus]=useState('Loading isolated save');
 const loadStatus=useRef('NOT_LOADED');
 const live=useRef<Player|null>(null), pending=useRef(Promise.resolve()), events=useRef<any[]>([]);
 const persist=(next:Player,reason:'AUTOSAVE'|'PROCESS_WEEK'|'MIGRATION')=>{
   const prepared=prepareVerifiedPlayerForPersistence(next,reason);
   pending.current=pending.current.then(()=>saveVerifiedGameData(key,prepared.player,prepared.manifest,{retainPrevious:prepared.retainPrevious,needsRecoveryCheckpoint:prepared.needsRecoveryCheckpoint})).then(()=>setSaveStatus('Verified save committed')).catch(e=>{setError(String(e));throw e});
   return pending.current.then(()=>prepared.player);
 };
 const commit=(next:Player,label:string)=>{
   const canonical=prepareExternalPlayerUpdateForUi(next); live.current=canonical;setP(canonical);
   events.current.push({label,...snapshot(canonical)});void persist(canonical,'AUTOSAVE');
 };
 useEffect(()=>{void(async()=>{try{const loaded=await loadVerifiedGameData(key);loadStatus.current=loaded.status;const seed=loaded.status==='CURRENT'?prepareExternalPlayerUpdateForUi(loaded.player):makeSeed();live.current=seed;setP(seed);events.current.push({label:loaded.status==='CURRENT'?'verified reload':'new isolated fixture',...snapshot(seed)});await persist(seed,'MIGRATION');}catch(e){setError(String(e));}})();},[]);
 const open=()=>{setInitialStudio(studioId);setScreen('FORBES')};
 const advance=async()=>{if(!live.current||busy)return;setBusy(true);try{await pending.current;const result=await processGameWeek(live.current);const saved=await persist(result.player,'PROCESS_WEEK');const next=prepareProcessedWeekForUi(saved);live.current=next;setP(next);events.current.push({label:'actual processGameWeek committed',...snapshot(next)});}catch(e){setError(String(e));}finally{setBusy(false)}};
 (window as any).__stockFlow = {snapshot:()=>live.current&&({...snapshot(live.current),loadStatus:loadStatus.current}),events:events.current,player:()=>live.current,idle:()=>pending.current,saveKey:key,authorFixtureDebt:(debtMillions:number)=>{const next=structuredClone(live.current!);const company=attachNormalizedStudioAiState(next.world.studios![studioId],{absoluteWeek:(next.age-1)*52+next.currentWeek-1});company.ai!.finance.debtPrincipalMillions=debtMillions;next.world.studios![studioId]=company;commit(next,'isolated fixture debt changed while signing')},quote:(shares:number)=>live.current&&calculateStockTradeQuote(live.current,live.current.stocks.find(s=>s.relatedStudioId===studioId)!,shares)};
 if(!p)return <div>{error||'Loading isolated save'}</div>;
 const stock=p.stocks.find(s=>s.relatedStudioId===studioId)!;
 const event=(p.pendingEvents||[]).find(e=>e.data?.stockDecisionType==='TAKEOVER_CONTROL'&&e.data?.relatedStudioId===studioId);
 return <div style={{position:'fixed',inset:0,background:'#111',color:'white'}}><style>{'.sa-stage{bottom:50px!important}'}</style>
   <div style={{position:'absolute',inset:'0 0 50px'}}>
    {screen==='STOCKS'?<StocksApp player={p} onBack={()=>{}} onTrade={(id,n)=>{const result=executeStockTrade(live.current!,id,n);if(result.success)commit(result.player,'actual Stocks purchase/sale');else setError('Trade failed: '+result.reason)}} onUpdatePlayer={n=>commit(n,'Stocks update')} initialStockId={stock.id} onOpenStudioAcquisition={open}/>:<ForbesApp player={p} onBack={()=>setScreen('STOCKS')} onOpenStocks={()=>setScreen('STOCKS')} initialStudioId={initialStudio} onInitialStudioConsumed={()=>setInitialStudio('')} onUpdatePlayer={n=>commit(n,'actual Forbes action')}/>}
   </div>
   {event&&screen==='STOCKS'&&<StockControlEventModal player={p} event={event} onDefer={()=>commit(acknowledgeStockControlNotice(live.current!,event.data.stockId,'DEFER'),'defer actual control notice')} onReviewStock={()=>commit(acknowledgeStockControlNotice(live.current!,event.data.stockId,'OPEN'),'review reminder')} onOpenAcquisitionDesk={()=>{commit(acknowledgeStockControlNotice(live.current!,event.data.stockId,'OPEN'),'open actual control reminder');open()}}/>}
   <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:250,background:'#16464c',padding:'5px',display:'flex',gap:8,fontSize:10}}>
    <button disabled={busy} onClick={advance}>Advance Real Week</button>
    <button disabled={busy} onClick={async()=>{await pending.current;location.reload()}}>Verified Save / Reload</button>
    <button onClick={open}>Open Acquisition</button><span>{busy?'Processing actual week':saveStatus}</span>
   </div>
   {error&&<div role="alert" style={{position:'fixed',top:0,left:0,right:0,zIndex:500,background:'#600',padding:12}}>{error}</div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
