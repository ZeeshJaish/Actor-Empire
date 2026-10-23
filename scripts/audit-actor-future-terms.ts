import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import type {Player,RoleType,AuditionOpportunity,ActiveRelease} from '../types';
import {INITIAL_PLAYER} from '../types';
import {createFamousOpportunity,FAMOUS_MOVIE_DB,FAMOUS_SERIES_DB,generateFamousMovieOpportunity,generateCameoOffer} from '../services/famousMovieLogic';
import {generateAudition,generateSequelOffer,generateRenewalOffer,calculateProjectPay} from '../services/roleLogic';
import {generateDirectEntryOffer,generateRandomUniverseOpportunity} from '../services/universeLogic';
import {cinemaAuditRandom} from './fixtures/cinemaAuditCheckpoint';
import {lifetimeAccept} from './fixtures/actorLifetimeActions';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {migratePlayerSave} from '../services/saveMigration';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
const p:Player=JSON.parse(gunzipSync(readFileSync('/tmp/ae-lifetime-repaired-free/free/career-0.json.gz')).toString()).player;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const sourceHash=hash(p),failures:string[]=[];let checks=0;
const test=(name:string,run:()=>void)=>{try{run();checks++;console.log('PASS',name)}catch(e){failures.push(name+': '+String(e));console.error('FAIL',name,String(e))}};
const famous=(role:RoleType,player=p,type:'MOVIE'|'SERIES'='MOVIE')=>{
 Math.random=cinemaAuditRandom('future-terms-identical-project').next;
 return (createFamousOpportunity as (...args:any[])=>AuditionOpportunity)((type==='MOVIE'?FAMOUS_MOVIE_DB:FAMOUS_SERIES_DB)[0],role,'DIRECT','en',player);
};
test('new supporting and cameo quotes do not receive a lead actor point package',()=>{
 const lead=famous('LEAD'),support=famous('SUPPORTING'),cameo=famous('CAMEO'),minor=famous('MINOR');
 assert.ok((support.royaltyPercentage||0)<(lead.royaltyPercentage||0));
 assert.ok((cameo.royaltyPercentage||0)<(support.royaltyPercentage||0));
 assert.equal(minor.royaltyPercentage||0,0);
 assert.ok((lead.royaltyPercentage||0)>0&&(lead.royaltyPercentage||0)<=1.5);
 assert.equal(lead.estimatedIncome,200000,'Famous salary is preserved');
 assert.equal(support.estimatedIncome,60000);
});
test('skill100 alone is not personal drawing power; recent earned work matters',()=>{
 const unknown={...p,pastProjects:[],activeReleases:[],stats:{...p.stats,fame:0,reputation:0,followers:0},youtube:undefined};
 const established=famous('LEAD'),noDemand=famous('LEAD',unknown);
 assert.ok((established.royaltyPercentage||0)>(noDemand.royaltyPercentage||0));
});
test('offer terms never alter film quality, distribution or the next random draw',()=>{
 const unknown={...p,pastProjects:[],activeReleases:[],stats:{...p.stats,fame:0,reputation:0,followers:0}};
 const first=famous('LEAD');const randomA=Math.random();
 const second=famous('LEAD',unknown);const randomB=Math.random();
 assert.deepEqual(first.project,second.project);assert.equal(randomA,randomB);
});
test('new renewal quotes do not copy a previous contract point rate',()=>{
 const offer=famous('SUPPORTING',p,'SERIES');
 const original={id:'old-series',name:'Series',roleType:'SUPPORTING',type:'SERIES',royaltyPercentage:9,projectDetails:offer.project} as ActiveRelease;
 const before=hash(original),renewed=generateRenewalOffer(original,p);
 assert.ok((renewed.royaltyPercentage||0)<1.5);assert.equal(hash(original),before);
});
test('new sequel points follow billing size and pay concession follows actual offered points',()=>{
 const project=famous('LEAD').project;
 const original={id:'old-film',name:'Film',roleType:'CAMEO',type:'MOVIE',royaltyPercentage:9,projectDetails:project} as ActiveRelease;
 Math.random=cinemaAuditRandom('sequel-quote').next;const cameo=generateSequelOffer(original,p);
 Math.random=cinemaAuditRandom('sequel-quote').next;const lead=generateSequelOffer({...original,roleType:'LEAD'},p);
 assert.ok((cameo.royaltyPercentage||0)<(lead.royaltyPercentage||0));
 assert.ok((lead.royaltyPercentage||0)<=1.5);
 for(const [role,offer] of [['CAMEO',cameo],['LEAD',lead]] as const){
  Math.random=cinemaAuditRandom('sequel-quote').next;
  const unconceded=Math.floor(calculateProjectPay(role,project.budgetTier,'MOVIE',project.estimatedBudget)*1.5);
  assert.equal(offer.currentOffer,Math.floor(unconceded*(1-Math.min(.25,(offer.royaltyPercentage||0)*.1))));
 }
});
test('purchased wallet size cannot lower or raise future backend quotes',()=>{
 const rich={...p,money:p.money+1000000000};
 assert.equal(famous('LEAD',rich).royaltyPercentage,famous('LEAD',p).royaltyPercentage);
});
test('franchise quotes depend on the actual remaining role package instead of a flat40M',()=>{
 const salaries=new Set<number>();
 for(const seed of [0,7,19,31,43,59,71,97]){
  Math.random=cinemaAuditRandom('franchise:'+seed).next;
  const offer=generateRandomUniverseOpportunity({...p,activeUniverseContract:undefined},'DIRECT');
  if(offer){salaries.add(offer.estimatedIncome);assert.ok(offer.estimatedIncome>0&&offer.estimatedIncome<30000000);assert.ok((offer.royaltyPercentage||0)<=1.2)}
 }
 assert.ok(salaries.size>=3,'Different actual packages have different quoted salaries');
 Math.random=cinemaAuditRandom('direct-entry').next;
 assert.ok(generateDirectEntryOffer(p,'MCU').salaryTotal<30000000);
});
test('normal low-budget audition salary has no purchased-wallet surcharge',()=>{
 const initial=structuredClone(INITIAL_PLAYER),boosted={...initial,money:75000000};
 Math.random=cinemaAuditRandom('early-pay').next;const free=generateAudition('MINOR','LOW',[],initial,'CASTING_APP','MOVIE');
 Math.random=cinemaAuditRandom('early-pay').next;const boost=generateAudition('MINOR','LOW',[],boosted,'CASTING_APP','MOVIE');
 assert.equal(free.estimatedIncome,boost.estimatedIncome);assert.ok(free.estimatedIncome>0);
});
test('old pending terms are accepted at their quoted amounts without repricing',()=>{
 const opp={...famous('SUPPORTING'),estimatedIncome:123456,royaltyPercentage:2.5};
 const before=p.money,accepted=lifetimeAccept(structuredClone(p),{id:'old-pending-offer',type:'OFFER_ROLE',subject:'Old offer',sender:'Studio',body:'',week:p.currentWeek,year:p.age,data:opp} as any);
 const c=accepted.commitments.find(c=>c.name===opp.projectName&&c.lumpSum===123456);
 assert.ok(c);assert.equal(c.royaltyPercentage,2.5);assert.equal(accepted.money,before);
});
assert.equal(hash(p),sourceHash,'Offer generation/acceptance must not mutate the source player');
const terms=(q:Player)=>({money:q.money,skills:q.stats.skills,shares:q.portfolio,loans:q.finance.loans,contracts:q.world.streamingRightsContracts,roles:q.commitments.map(c=>[c.id,c.lumpSum,c.royaltyPercentage]),active:q.activeReleases.map(r=>[r.id,r.royaltyPercentage]),universe:q.activeUniverseContract});
const before=hash(terms(p)),prepared=prepareVerifiedPlayerForPersistence(p,'MANUAL'),store=new CinemaMemorySaveStore();
await saveVerifiedGameData(store,'future-terms-preserve',prepared.player,prepared.manifest);
const loaded=await loadVerifiedGameData(store,'future-terms-preserve');assert.equal(loaded.status,'CURRENT');
assert.equal(hash(terms(migratePlayerSave(loaded.player!))),before,'Signed terms and holdings survive save/reload');
assert.equal(hash(p),sourceHash);
assert.equal(failures.length,0,failures.join('\n'));
console.log(JSON.stringify({checks,oldTermsRoundTrip:true,sourceUnchanged:true}));
