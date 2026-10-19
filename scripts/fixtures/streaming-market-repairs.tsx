// Disposable UI cases. All state stays in React memory; no career/save storage is read or written.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import StreamingBuyerAuctionRoom from '../../components/StreamingBuyerAuctionRoom';
import AccessibleDialog from '../../components/AccessibleDialog';
import {contentMarketFixture} from '../helpers/contentMarketFixture';
import {advanceStreamingOpportunityMarket} from '../../services/streamingOpportunityMarket';
import {normalizeStreamingPlatformEcosystem} from '../../services/streamingPlatformEcosystem';
import {getAbsoluteWeek} from '../../services/legacyLogic';
import {getStreamingBuyerAuctionLots,openStreamingBuyerAuction} from '../../services/streamingBuyerAuctions';
import {configureStreamingPricingOffer} from '../../services/streamingCommercialOffers';
const fixture=()=>{
 const p=contentMarketFixture();p.businesses=[];p.pastProjects=[];
 p.world.studios['seller-cm1']={...Object.values(p.world.studios)[0],id:'seller-cm1',name:'Harbour Pictures'} as any;
 p.world.projects.forEach((project,index)=>{if(index===0)Object.assign(project,{title:'Dark Garden of Glass 2',installmentNumber:2,franchiseName:'Dark Garden of Glass',franchiseId:'dark-garden'});});
 const query=new URLSearchParams(location.search);
 const mode=query.get('mode')==='STORE'?'STORE':'SUBSCRIPTION';
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:mode});
 const ecosystem=normalizeStreamingPlatformEcosystem(undefined,getAbsoluteWeek(p.age,p.currentWeek));
 const count=query.get('rivals');if(count==='0'||count==='1')for(const operator of Object.values(ecosystem.operators))if(count==='0'||operator.id!=='NETFLIX')operator.cashMillions=0;
 p.world.streamingPlatformEcosystem=ecosystem;
 return advanceStreamingOpportunityMarket(p);
};
function Fixture(){
 const [player,setPlayer]=useState(fixture),[roomId,setRoomId]=useState(''),[panel,setPanel]=useState(true),[feedback,setFeedback]=useState('');
 const session=player.ownedStreamingPlatform.buyerAuctionSessions.find(row=>row.id===roomId);
 const enter=()=>{const lot=getStreamingBuyerAuctionLots(player).find(row=>row.listingKind==='TITLE');
  if(!lot){setFeedback('This finite cycle has no remaining title auction. Reload resets only this disposable case.');return;}
  const opened=openStreamingBuyerAuction(player,lot.id);if(opened.session){setPlayer(opened.player);setRoomId(opened.session.id);setPanel(false);}else setFeedback(opened.detail||'No room opened');};
 return <>
  <details open={panel} onToggle={event=>setPanel(event.currentTarget.open)} style={{position:'fixed',bottom:0,left:0,zIndex:99999,maxWidth:'100vw',width:310,padding:8,boxSizing:'border-box',background:'#151922',color:'white',font:'12px system-ui'}}>
   <summary>Disposable market QA · ${player.ownedStreamingPlatform.treasuryCash.toLocaleString()}</summary>
   <p>No actual save is read or written. {feedback}</p>
   <button onClick={enter}>Open real title auction</button>
   <p>{session?`${session.rivals.length} funded rivals · ${session.status}`:'No open room'}</p>
  </details>
  {session?<AccessibleDialog className="cm-market-exact-shell" data-epx-root aria-label="Content Market" onEscape={()=>setRoomId('')}><StreamingBuyerAuctionRoom player={player} session={session} onUpdatePlayer={setPlayer} onExit={()=>setRoomId('')}/></AccessibleDialog>
    :<StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={()=>{}}/>}
 </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
