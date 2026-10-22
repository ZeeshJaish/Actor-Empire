import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { makeCinemaFixture } from '../scripts/fixtures/boxOfficeScenarios';
import { createBusiness } from '../services/businessLogic';
import { GreenlightWizard } from '../views/lifestyle/business/GreenlightWizard';
import { ReleaseWizard } from '../views/lifestyle/business/ReleaseWizard';
import { BoxOfficeApp } from '../views/mobile/BoxOfficeApp';
import { ImdbApp } from '../views/mobile/ImdbApp';
import { ProjectDashboardModal } from '../views/lifestyle/business/components/ProjectDashboardModal';
import { buildCinemaReleaseDashboardProject } from '../services/boxOffice/boxOfficePresentation';
import { processGameWeek } from '../services/gameLoop';
import '../index.css';
const f=makeCinemaFixture(51);
const studio=createBusiness('Cinema Phase 5 QA','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',20);
studio.balance=1e9;studio.studioState!.scripts=[{id:'cinema-script',title:'The Last Lantern',status:'READY',projectType:'MOVIE',genres:['DRAMA'],quality:75,price:0,logline:'A traveler returns home.',estimatedBudget:20e6} as any];
f.player.businesses=[studio];f.player.money=1e9;f.player.commitments=[];f.player.activeReleases=[];f.player.pendingEvents=[];f.player.scheduledEvents=[];f.player.energy={current:100,max:100};f.player.stats.talent=85;
f.project={...f.project,title:'The Last Lantern',genre:'DRAMA',studioId:studio.id,estimatedBudget:20e6,castList:[{id:'PLAYER_SELF',actorId:'PLAYER_SELF',name:f.player.name,role:'Lead',roleType:'LEAD',type:'ACTOR',isPlayer:true,image:''}],hiddenStats:{...f.project.hiddenStats,estimatedQualityScore:75},releaseStrategy:undefined};
const concept={scriptId:'cinema-script',lastStep:'CONFIRM',castList:[{id:'lead',actorId:'PLAYER_SELF',roleType:'LEAD',role:'Lead',characterName:'Lantern Keeper',negotiationStatus:'ACCEPTED',salary:0}],crewModes:{director:'SELF',cinematographer:'IN_HOUSE',composer:'IN_HOUSE',lineProducer:'IN_HOUSE',vfx:'IN_HOUSE'},selectedLocations:['LA'],reservedMarketingBudget:2e6};
const App=()=>{
 const [player,setPlayer]=useState(f.player),[screen,setScreen]=useState('HOME'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const own=player.businesses.find(b=>b.id===studio.id)!;const commitment=player.commitments.find(c=>c.projectDetails?.studioId===studio.id);const release=player.activeReleases.find(r=>r.projectDetails.studioId===studio.id);
 const advance=async()=>{setBusy(true);try {const result=await processGameWeek(player);setPlayer(result.player)}catch(e){setError(String(e))}finally{setBusy(false)}};
 const prepare=()=>{setPlayer({...player,commitments:[...player.commitments,{id:'cinema-qa-title',type:'ACTING_GIG',name:'The Last Lantern',weeksLeft:1,energyCost:0,weeklyPay:0,lumpSum:0,payoutType:'LUMPSUM',projectPhase:'POST_PRODUCTION',phaseWeeksLeft:0,totalPhaseDuration:0,productionPerformance:80,auditionPerformance:80,projectDetails:f.project} as any]});};
 return <div style={{height:'100dvh',width:'100vw',position:'relative',background:'#09090b',color:'white'}}>
 {screen==='HOME'?<main className="p-4 space-y-3"><h1>Cinema Phase 5 journey QA</h1><p>Authored fixture; no real save. Week {player.currentWeek} · {commitment?.projectPhase||release?.distributionPhase||'No live title'}</p>
 <div className="flex flex-wrap gap-3">{[['Greenlight','GREENLIGHT'],['Release strategy','RELEASE'],['Box office','BOX'],['IMDb','IMDB'],['Project report','REPORT']].map(([label,id])=><button className="p-3 bg-emerald-700 rounded" key={id} onClick={()=>setScreen(id)}>{label}</button>)}</div>
 <button className="block p-3 bg-zinc-700" onClick={prepare}>Prepare authored post-production fixture</button><button disabled={busy} className="block p-3 bg-zinc-700" onClick={advance}>{busy?'Advancing…':'Advance actual game week'}</button><p>{error}</p>
 <pre data-testid="facts" className="text-xs break-all whitespace-pre-wrap">{JSON.stringify({commitments:player.commitments.map(c=>({id:c.id,phase:c.projectPhase})),releases:player.activeReleases.map(r=>({id:r.id,phase:r.distributionPhase,gross:r.totalGross})),paid:player.world.cinemaMarket?.titles},null,2)}</pre></main>:<>
 {screen==='GREENLIGHT'&&<GreenlightWizard initialConcept={concept} player={player} studio={own} onBack={()=>setScreen('HOME')} onUpdatePlayer={setPlayer} onComplete={()=>setScreen('HOME')}/>}
 {screen==='RELEASE'&&(commitment?<ReleaseWizard player={player} studio={own} project={commitment} onBack={()=>setScreen('HOME')} onUpdatePlayer={setPlayer} onComplete={()=>setScreen('HOME')}/>:<button onClick={()=>setScreen('HOME')}>No ready commitment. Back</button>)}
 {screen==='BOX'&&<BoxOfficeApp player={player} onBack={()=>setScreen('HOME')}/>}
 {screen==='IMDB'&&<ImdbApp player={player} onBack={()=>setScreen('HOME')}/>}
 {screen==='REPORT'&&(release?<ProjectDashboardModal player={player} studio={own} project={buildCinemaReleaseDashboardProject(release)} onClose={()=>setScreen('HOME')} onUpdatePlayer={setPlayer} onMakeSequel={()=>{}} onMakeSpinoff={()=>{}} onStartStreamingBidding={()=>{}} onRenameProject={()=>{}} onConfigureRelease={()=>{}}/>:<button onClick={()=>setScreen('HOME')}>No release. Back</button>)}
 </>}
 </div>;
};createRoot(document.getElementById('root')!).render(<App/>);
