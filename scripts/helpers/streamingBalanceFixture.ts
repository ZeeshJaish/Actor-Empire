import assert from 'node:assert/strict';
import {createC6QaCareer} from '../../lab/c6QaCareer';
import {configureStreamingPricingOffer} from '../../services/streamingCommercialOffers';
import {getStreamingLaunchDefinitionSignature} from '../../services/streamingLaunchProgram';
import {commitOwnedStreamingLaunch} from '../../services/streamingLaunch';
import {processGameWeek} from '../../services/gameLoop';
import {getStreamingFinanceRoom} from '../../services/streamingFinanceRoom';
import type {Player} from '../../types';
type Core='SUBSCRIPTION'|'ADVERTISING'|'STORE';
export type BalanceConfig={id:string;core:Core;catalog:number;price?:number;buy?:number;quality?:number;seed?:number;weeks?:number;mg?:number;annual?:number;intro?:number;shock?:'REMOVE'|'HIKE'|'REFRESH'|'REPLACE_HIT'|'CLEARANCE'|'OUTAGE';};
export function balanceFixture(c:BalanceConfig){
 const p=createC6QaCareer();const s=p.ownedStreamingPlatform;const seed=c.seed||0;
 if(seed)s.simulationSeed='economy-balance-'+seed;
 const template=JSON.parse(JSON.stringify(s.catalogLicenses[0]));
 const project=JSON.parse(JSON.stringify(p.world.projects[0]));
 s.catalogProjectIds=[];s.catalogLicenses=[];p.world.projects=[];
 const licensedSlate=s.launchSlate!.entries.find(x=>x.source==='LICENSED_WINDOW')!;
 s.launchSlate!.entries=s.launchSlate!.entries.filter(x=>x.source==='ORIGINAL');
 for(let i=0;i<c.catalog;i++){
  const id='balance-title-'+i;const title='Balance Film '+i;const genre=['DRAMA','COMEDY','THRILLER','FAMILY','MYSTERY','ACTION'][i%6];
  p.world.projects.push({...project,id,title,genre,quality:c.quality??80,rating:(c.quality??80)/10,boxOffice:(c.quality??80)>=90?300_000_000:10_000_000} as any);
  s.catalogProjectIds.push(id);s.catalogLicenses.push({...template,genre,id:'balance-license-'+i,sourceProjectId:id,sourceProjectTitle:title,titleAtSigning:title,minimumGuarantee:c.mg??1_000_000});
  s.launchSlate!.entries.push({...licensedSlate,id:'balance-slate-'+i,projectId:id,title,genre} as any);
 }
 s.starterCatalog={...s.starterCatalog!,ownedProjectIds:[],licensedProjectIds:[...s.catalogProjectIds]};
 s.serviceConfiguration.pricing=configureStreamingPricingOffer(s.serviceConfiguration.pricing,{kind:'CORE',coreModel:c.core});
 const pricing=s.serviceConfiguration.pricing;
 if(c.core==='SUBSCRIPTION')pricing.plans.forEach(x=>{x.monthly=c.price??7.99;});
 if(c.core==='ADVERTISING')pricing.ads.minutesPerHour=c.price??4;
 if(c.core==='STORE')pricing.rentals={...pricing.rentals,rent:c.price??5.99,buy:c.buy??19.99};
 if(c.annual!==undefined)pricing.annualDiscount=c.annual;
 if(c.intro!==undefined)pricing.introOffer=c.intro;
 const rightsCash=c.catalog*(c.mg??1_000_000);s.treasuryCash=200_000_000-rightsCash;
 s.launchProgram.lastBlueprintSignature=getStreamingLaunchDefinitionSignature(p);
 const launch=commitOwnedStreamingLaunch(p,'STANDARD');assert.ok(launch.changed,'Launch '+c.id+' '+launch.reason);
 return {p:launch.player,opening:launch.launchCommit!.initialSubscribers,rightsCash};
}
