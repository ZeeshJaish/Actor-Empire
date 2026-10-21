/** Memory-only QA. The local QA middleware supplies a frozen disposable player. */
import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import {processGameWeek} from '../../services/gameLoop';
import type {Player} from '../../types';
import '../../index.css';
import '../../styles/fonts.css';
function Fixture(){
 const [player,setPlayer]=useState<Player|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch('/__operations-player'+location.search).then(response=>{if(!response.ok)throw Error('Start the Operations QA middleware to use this fixture.');return response.json();}).then(setPlayer).catch(error=>document.getElementById('root')!.textContent=error.message);},[]);
 if(!player)return <p style={{color:'white'}}>Loading disposable Operations fixture…</p>;
 const platform=player.ownedStreamingPlatform;
 return <><StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={()=>{}}/>
 <details style={{position:'fixed',bottom:0,left:0,zIndex:100000,maxWidth:290,color:'white',background:'#172131',font:'11px system-ui',padding:6}}><summary>Isolated QA · {platform.launchCommit?'Live':'Prelaunch'} · week {player.currentWeek}</summary>
 <div aria-label="Operations QA state">{JSON.stringify({treasury:platform.treasuryCash,revision:platform.serviceConfiguration.revision,layout:platform.serviceConfiguration.storefrontLayoutId,sound:platform.serviceConfiguration.soundIdentKey,package:platform.serviceConfiguration.identPackageId,price:platform.serviceConfiguration.pricing.plans[0]?.monthly,launch:platform.launchProgram.status,rights:platform.catalogLicenses.length,pending:platform.pendingInfrastructureSetup?.revision})}</div>
 <button disabled={busy} onClick={async()=>{setBusy(true);try{setPlayer((await processGameWeek(player)).player);}finally{setBusy(false);}}}>{busy?'Processing QA week':'Advance isolated QA week'}</button></details></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
