import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {INITIAL_PLAYER,type Player} from '../../../types';
import {createBusiness} from '../../../services/businessLogic';
import {createContract} from '../../../services/talentService';
import {generateNewUnknowns} from '../../../services/npcLogic';
import {restoreContractActorProfiles} from '../../../services/npcRetention';
import {StudioPage} from '../../../views/StudioPage';
import '/index.css';
const make=()=>{
 const p=structuredClone(INITIAL_PLAYER);p.money=2e9;p.age=30;p.currentWeek=20;p.stats.fame=100;
 const studio=createBusiness('Retention Pictures','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',20);p.businesses=[studio];
 const params=new URLSearchParams(location.search);
 if(params.has('saved')){const saved=JSON.parse(localStorage.getItem('ae-talent-retention-qa-only')||'null');if(saved?.contracts?.length){studio.id=saved.contracts[0].studioId;p.money=saved.money;p.studio.talentRoster=saved.contracts;studio.studioState!.talentRoster=saved.contracts;p.flags.extraNPCs=saved.actors;return restoreContractActorProfiles(p);}}
 if(params.has('missing')||params.has('recovered')){
  const actor={...generateNewUnknowns(1)[0],id:'qa-legacy-actor',name:'Mira Retention'};
  const contract={...createContract(actor.id,'MOVIE_DEAL','UPFRONT',3,100000,100,20),studioId:studio.id,...(params.has('recovered')?{actorSnapshot:actor}:{})};
  p.studio.talentRoster=[contract];studio.studioState!.talentRoster=[contract];p.flags.extraNPCs=[];
  p.pastProjects=[{id:'qa-old-film',castList:[{actorId:actor.id,name:actor.name}]} as any];
 }
 return restoreContractActorProfiles(p);
};
const App=()=>{const [player,setPlayer]=useState(make);const record=(p:Player)=>{localStorage.setItem('ae-talent-retention-qa-only',JSON.stringify({money:p.money,contracts:p.studio.talentRoster,actors:p.flags.extraNPCs}));setPlayer(p);};return <StudioPage player={player} onBack={()=>{}} onUpdatePlayer={record}/>;};
createRoot(document.getElementById('root')!).render(<App/>);
