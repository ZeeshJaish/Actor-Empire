// Disposable UI cases. All state stays in React memory; no career/save storage is read or written.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import StreamingContentMarket from '../../components/StreamingContentMarket';
import { getContentMarketCollections, getContentMarketListings, getContentMarketPrivateOfferDefaults } from '../../services/streamingContentMarket';
import { processGameWeek } from '../../services/gameLoop';
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
 if(query.has('offers')) {
  p.money=50_000_000_000;p.ownedStreamingPlatform.treasuryCash=50_000_000_000;
  p.world.projects=Array.from({length:9},(_,i)=>({...p.world.projects[i%6],id:`private-ui-${i}`,studioId:`seller-${Math.floor(i/3)}`,rating:3,boxOffice:1_000_000}));
  for(let i=0;i<3;i++)p.world.studios[`seller-${i}`]={...p.world.studios['seller-cm1'],id:`seller-${i}`,name:['Harbour Pictures','Northlight Films','Meridian Studios'][i]};
 }
 const mode=query.get('mode')==='STORE'?'STORE':'SUBSCRIPTION';
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:mode});
 const ecosystem=normalizeStreamingPlatformEcosystem(undefined,getAbsoluteWeek(p.age,p.currentWeek));
 const count=query.get('rivals');if(count==='0'||count==='1')for(const operator of Object.values(ecosystem.operators))if(count==='0'||operator.id!=='NETFLIX')operator.cashMillions=0;
 p.world.streamingPlatformEcosystem=ecosystem;
 return advanceStreamingOpportunityMarket(p);
};
function Fixture(){
 const [player,setPlayer]=useState(fixture),[roomId,setRoomId]=useState(''),[panel,setPanel]=useState(true),[feedback,setFeedback]=useState('');
 const [marketOpen,setMarketOpen]=useState(false),[marketKey,setMarketKey]=useState(0),[processing,setProcessing]=useState(false);
 const brand:any={name:'Empire+',markId:'FRAME_PLAY',hue:252,sat:88,identMode:'badge',identLen:2};
 const openPrivate=(kind:'collection'|'title')=>{
  const source=(kind==='collection'?getContentMarketCollections(player):getContentMarketListings(player)).find(row=>getContentMarketPrivateOfferDefaults(player,row.id));
  if(!source){setFeedback('No unreserved private source remains. Reload resets only this QA career.');return;}
  setPlayer({...player,ownedStreamingPlatform:{...player.ownedStreamingPlatform,contentMarketDraft:{tab:'ALL',search:'',selectedId:source.id,ownedIds:[]}}});
  setRoomId('');setMarketOpen(true);setMarketKey(value=>value+1);setPanel(false);
 };
 const session=player.ownedStreamingPlatform.buyerAuctionSessions.find(row=>row.id===roomId);
 const enter=()=>{const lot=getStreamingBuyerAuctionLots(player).find(row=>row.listingKind==='TITLE');
  if(!lot){setFeedback('This finite cycle has no remaining title auction. Reload resets only this disposable case.');return;}
  const opened=openStreamingBuyerAuction(player,lot.id);if(opened.session){setPlayer(opened.player);setRoomId(opened.session.id);setPanel(false);}else setFeedback(opened.detail||'No room opened');};
 return <>
  <details open={panel} onToggle={event=>setPanel(event.currentTarget.open)} style={{position:'fixed',bottom:0,left:0,zIndex:99999,maxWidth:'100vw',width:310,padding:8,boxSizing:'border-box',background:'#151922',color:'white',font:'12px system-ui'}}>
   <summary>Disposable market QA · ${player.ownedStreamingPlatform.treasuryCash.toLocaleString()}</summary>
   <p>No actual save is read or written. {feedback}</p>
   <button onClick={enter}>Open real title auction</button>
   <button onClick={()=>openPrivate('collection')}>Open real private collection</button>
   <button onClick={()=>openPrivate('title')}>Open real private title</button>
   <button disabled={processing} onClick={async()=>{setProcessing(true);try{const result=await processGameWeek(player);setPlayer(result.player);setFeedback(`Processed actual QA week ${result.player.currentWeek}.`);}catch(error){setFeedback(String(error));}finally{setProcessing(false);}}}>{processing?'Processing QA week…':'Process actual QA week'}</button>
   <button onClick={()=>{setPlayer({...player,ownedStreamingPlatform:{...player.ownedStreamingPlatform,contentMarketDraft:{tab:'OFFERS',search:'',selectedId:null,ownedIds:[]}}});setMarketOpen(true);setRoomId('');setMarketKey(value=>value+1);setPanel(false);}}>Review saved private offers</button>
   <p>QA-only memory · Week {player.currentWeek} · {player.ownedStreamingPlatform.catalogLicenses.length} licences</p>
   {player.ownedStreamingPlatform.rightsNegotiations.filter(row=>row.proposalVersion).map(row=><p key={row.id}>{row.title}: {row.responseStatus} · exact USD {row.minimumGuarantee} · {row.collectionSnapshot?.package.components.length || 1} titles</p>)}
   <p>{session?`${session.rivals.length} funded rivals · ${session.status}`:'No open room'}</p>
  </details>
  {session?<AccessibleDialog className="cm-market-exact-shell" data-epx-root aria-label="Content Market" onEscape={()=>setRoomId('')}><StreamingBuyerAuctionRoom player={player} session={session} onUpdatePlayer={setPlayer} onExit={()=>setRoomId('')}/></AccessibleDialog>
    :marketOpen?<React.Fragment key={marketKey}><StreamingContentMarket player={player} brand={brand} onUpdatePlayer={setPlayer} onClose={()=>setMarketOpen(false)} onOpenFinance={()=>{}} onCommission={()=>{}} onReview={()=>{}}/></React.Fragment>
    :<StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={()=>{}}/>}
 </>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
