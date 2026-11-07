/** Controlled preservation/recovery regressions; no personal saves or career earnings proof. */
import assert from 'node:assert/strict';
import {INITIAL_PLAYER,type Player} from '../types';
import {compactPlayerForPersistence} from '../services/saveCompaction';
import {compareProtectedSaveState,createSaveIntegrityManifest,verifySaveIntegrity} from '../services/saveIntegrity';
import {saveVerifiedGameData,loadVerifiedGameData,getSaveGenerationKeys} from '../services/saveGenerations';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
import {makeCinemaFixture} from './fixtures/boxOfficeScenarios';
import {createBusiness} from '../services/businessLogic';
import {performStudioTreasuryTransfer} from '../services/studioGroup';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {migrateCinemaState} from '../services/boxOffice/boxOfficeMigration';
import {processCinemaMarketWeek} from '../services/boxOffice/boxOfficeWeek';
import {processGameWeek} from '../services/gameLoop';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import frozen from './fixtures/saveArchiveSchema4Frozen.json';

const rows=(n:number,prefix:string)=>Array.from({length:n},(_,i)=>({id:prefix+i,name:prefix+i}));
const film={id:'personal-film',name:'Personal Film',projectType:'MOVIE',budget:1000,gross:2000,
 weeklyGross:Array.from({length:75},(_,i)=>i+1),weeklyStudioReceipts:Array.from({length:75},(_,i)=>i+.5),
 castList:rows(35,'credit-').map(c=>({...c,characterName:'Original '+c.id})),crewList:rows(20,'crew-'),reviews:rows(20,'review-')};
const make=()=>{
 const p=structuredClone(INITIAL_PLAYER) as Player;
 p.id='preservation-test';p.money=1000000;
 p.pastProjects=[structuredClone(film)] as any;
 p.flags={...p.flags,dynastyCareerArchives:{ancestor:{id:'ancestor',awards:rows(121,'award-'),pastProjects:[structuredClone(film)],activeReleases:[]}},
  legacyCareerArchive:{id:'legacy',awards:rows(121,'legacy-award-')},legacyHighlights:rows(100,'highlight-').map((r,i)=>({...r,title:'Career award '+i,absoluteWeek:i,year:1,week:i,source:'LOG',impact:'HIGH'}))} as any;
 p.businesses=[{id:'personal-studio',name:'Personal Studio',type:'PRODUCTION_HOUSE',balance:50000,history:rows(600,'business-history-'),studioState:{financeLedger:rows(320,'receipt-')}}] as any;
 p.instagram={...p.instagram,posts:rows(220,'ig-'),feed:rows(100,'feed-')} as any;
 p.x={...p.x,posts:rows(220,'x-')} as any;
 p.youtube={...p.youtube,videos:rows(125,'video-').map(v=>({...v,comments:rows(15,'comment-'),weeklyHistory:rows(30,'views-')}))} as any;
 return p;
};
let passed=0,failed=0;
const test=async(name:string,fn:()=>void|Promise<void>)=>{try{await fn();passed++;console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+'\n'+String((e as Error).stack))}};
await test('save compaction does not mutate or remove custom poster data from source records',()=>{
 const p=make();(p.pastProjects[0] as any).customPoster={type:'IMAGE',posterMediaId:'existing-poster',imageData:'data:image/png;base64,aW1hZ2U='};const before=structuredClone(p);const compacted=compactPlayerForPersistence(p);assert.deepEqual(p.pastProjects,before.pastProjects,'Compaction must be read-only for source records');assert.deepEqual(compacted.pastProjects,before.pastProjects,'Persist complete poster source when supplied; media externalization owns its own lifecycle');
});
await test('legacy migration, save preparation and generation reload preserve complete user records',async()=>{
 const p=make(),original=structuredClone(p);const prepared=prepareVerifiedPlayerForPersistence(p,'MANUAL',{legacyOrExternal:true});
 assert.deepEqual(prepared.player.flags.dynastyCareerArchives,original.flags.dynastyCareerArchives);assert.equal(prepared.player.pastProjects[0].castList!.length,original.pastProjects[0].castList!.length);for(const [i,credit] of original.pastProjects[0].castList!.entries())assert.deepEqual(Object.fromEntries(Object.keys(credit).map(key=>[key,(prepared.player.pastProjects[0].castList![i] as any)[key]])),credit,'Legacy normalization may add defaults, never remove supplied credit facts');assert.deepEqual(prepared.player.pastProjects[0].weeklyGross,original.pastProjects[0].weeklyGross);assert.deepEqual(prepared.player.businesses[0].studioState!.financeLedger,original.businesses[0].studioState!.financeLedger);
 const store=new CinemaMemorySaveStore();await saveVerifiedGameData(store,'long-records',prepared.player,prepared.manifest);const loaded=await loadVerifiedGameData(store,'long-records');assert.equal(loaded.status,'CURRENT');assert.deepEqual(loaded.player!.flags.dynastyCareerArchives,original.flags.dynastyCareerArchives);assert.deepEqual(loaded.player!.pastProjects[0].castList,prepared.player.pastProjects[0].castList);assert.deepEqual(loaded.player!.businesses[0].studioState!.financeLedger,original.businesses[0].studioState!.financeLedger);
});
await test('oldest dynasty award survives a save beyond120 awards',()=>{
 const p=make(),c=compactPlayerForPersistence(p);assert.deepEqual(c.flags.dynastyCareerArchives,p.flags.dynastyCareerArchives);
 assert.equal((c.flags.dynastyCareerArchives as any).ancestor.awards[0].id,'award-0');
});
await test('full personal film history and nested credits/reviews survive compaction',()=>{
 const p=make(),c=compactPlayerForPersistence(p);assert.deepEqual(c.pastProjects,p.pastProjects);
});
await test('owned studio receipts and history survive beyond old rolling limits',()=>{
 const p=make(),c=compactPlayerForPersistence(p);assert.deepEqual(c.businesses[0].studioState!.financeLedger,p.businesses[0].studioState!.financeLedger);assert.deepEqual(c.businesses[0].history,p.businesses[0].history);
});
await test('authored posts and video records remain while disposable feed stays bounded',()=>{
 const p=make(),c=compactPlayerForPersistence(p);assert.deepEqual(c.instagram.posts,p.instagram.posts);assert.deepEqual(c.x.posts,p.x.posts);assert.deepEqual(c.youtube.videos,p.youtube.videos);assert.equal(c.instagram.feed.length,80);
});
await test('same archive entry with a missing nested award fails protected comparison',()=>{
 const p=make(),c=structuredClone(p);(c.flags.dynastyCareerArchives as any).ancestor.awards.shift();assert.equal(compareProtectedSaveState(p,c).ok,false);
});
await test('changed nested credit or receipt is rejected without changing record IDs',()=>{
 for(const mutate of [(p:Player)=>{(p.pastProjects[0].castList![0] as any).characterName='Wrong character'},(p:Player)=>{(p.businesses[0].studioState!.financeLedger[0] as any).amount=9}]){
  const p=make(),m=createSaveIntegrityManifest(p,'AUTOSAVE');mutate(p);assert.equal(verifySaveIntegrity(p,m).ok,false);
 }
});
await test('old personal financial journal entries are protected by content',()=>{
 const p=make();p.finance.history=[{id:'original-personal-receipt',amount:17,category:'ROYALTY',description:'Original receipt',week:1,year:18}] as any;const manifest=createSaveIntegrityManifest(p,'AUTOSAVE');p.finance.history[0].amount=18;assert.equal(verifySaveIntegrity(p,manifest).ok,false);
});
await test('issued schema4 signature opens unchanged then upgrades with exact original recovery',async()=>{
 const store=new CinemaMemorySaveStore(),key='archive-upgrade',keys=getSaveGenerationKeys(key),old=structuredClone(frozen);
 assert.equal(verifySaveIntegrity(old.player as unknown as Player,old.manifest as any).ok,true);
 await store.write(keys.current,old.player);await store.write(keys.integrity,old.manifest);
 assert.equal((await loadVerifiedGameData(store,key)).status,'CURRENT');
 const p=make(),m=createSaveIntegrityManifest(p,'AUTOSAVE');await saveVerifiedGameData(store,key,p,m);
 const previous=store.records.get(keys.previous) as any;assert.deepEqual(previous.manifest,old.manifest);assert.deepEqual(previous.player,old.player);
});
await test('nested corruption selects verified previous career, never an empty career',async()=>{
 const store=new CinemaMemorySaveStore(),key='archive-corruption',keys=getSaveGenerationKeys(key),p=make();await saveVerifiedGameData(store,key,p,createSaveIntegrityManifest(p,'AUTOSAVE'));
 const next=structuredClone(p);next.money-=100;await saveVerifiedGameData(store,key,next,createSaveIntegrityManifest(next,'PROCESS_WEEK'));
 const corrupt=await store.read(keys.current) as Player;(corrupt.flags.dynastyCareerArchives as any).ancestor.awards.pop();await store.write(keys.current,corrupt);
 const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'RECOVERY_AVAILABLE');assert.equal(loaded.previous!.money,1000000);assert.deepEqual(loaded.previous!.flags.dynastyCareerArchives,p.flags.dynastyCareerArchives);
});
await test('failed promotion preserves complete prior archives and cash',async()=>{
 const store=new CinemaMemorySaveStore(),p=make();await saveVerifiedGameData(store,'safe',p,createSaveIntegrityManifest(p,'AUTOSAVE'));store.failPromotion=true;
 const next=structuredClone(p);next.money-=100;await assert.rejects(()=>saveVerifiedGameData(store,'safe',next,createSaveIntegrityManifest(next,'PROCESS_WEEK')),/promotion/);
 const loaded=await loadVerifiedGameData(store,'safe');assert.equal(loaded.status,'CURRENT');assert.deepEqual(loaded.player!.flags.dynastyCareerArchives,p.flags.dynastyCareerArchives);assert.equal(loaded.player!.money,p.money);
});
await test('JSON export/import preserves the new signed career projection',()=>{
 const p=make();(p.pastProjects[0] as any).optionalNotSet=undefined;const m=createSaveIntegrityManifest(p,'MANUAL');const round=JSON.parse(JSON.stringify({p,m}));assert.equal(verifySaveIntegrity(round.p,round.m).ok,true);
});
await test('actual treasury movement retains every earlier receipt beyond200 entries',()=>{
 const p=makeCinemaFixture(23).player;p.money=1e9;const business=createBusiness('Archive Studio','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'S',20);business.balance=1e8;business.studioState!.financeLedger=rows(321,'old-receipt-') as any;p.businesses=[business];
 const result=performStudioTreasuryTransfer({player:p,studioId:business.id,action:'INJECT',counterparty:'PERSONAL',amount:100});assert.ok(result.success);const ledger=result.player.businesses[0].studioState!.financeLedger;assert.equal(ledger.length,322);assert.ok(ledger.some(r=>r.id==='old-receipt-320'));
});
await test('actual cinema settlement appends without deleting opening weeks or old studio receipts',()=>{
 const f=makeCinemaFixture(23),p=f.player;p.money=1e9;p.commitments=[];p.pendingEvents=[];p.scheduledEvents=[];const b=createBusiness('Cinema Archive','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'S',20);b.balance=1e9;b.studioState!.financeLedger=rows(321,'cinema-receipt-') as any;p.businesses=[b];
 const oldWeeks=Array(105).fill(10),week=getAbsoluteWeek(p.age,p.currentWeek)+1;p.activeReleases=[{id:'archive-live',name:'Archive Live',type:'MOVIE',roleType:'LEAD',projectDetails:{...structuredClone(f.project),studioId:b.id,cinemaExposure:{version:1,attentionPotential:80,attentionBasis:'PACKAGE',events:[{id:'paid-live',titleId:'archive-live',absoluteWeek:week,kind:'PAID_CAMPAIGN',channel:'TEST',paidCostCents:1000000,impressions:2000000000}]}},weekNum:106,weeksInTheaters:105,weeklyGross:oldWeeks,totalGross:1050,budget:5e6,status:'RUNNING',productionPerformance:80,imdbRating:8,distributionPhase:'THEATRICAL',sequelDecisionMade:true}] as any;
 const ready=migrateCinemaState(p,week-1).player,result=processCinemaMarketWeek(ready,week).player;assert.deepEqual(result.activeReleases[0].weeklyGross.slice(0,105),oldWeeks);assert.equal(result.activeReleases[0].weeklyGross.length,106);assert.ok(result.businesses[0].studioState!.financeLedger.some(r=>r.id==='cinema-receipt-320'));
});
await test('a real weekly turn keeps all authored social posts beyond200',async()=>{
 const p=makeCinemaFixture(23).player;p.money=1e9;p.instagram.posts=rows(220,'authored-').map(v=>({...v,year:p.age,week:1,likes:100,comments:2,shares:0,saves:0,caption:v.name})) as any;p.x.posts=[];
 const result=(await processGameWeek(p)).player;const ids=new Set(result.instagram.posts.map(post=>post.id));assert.equal(p.instagram.posts.filter(post=>!ids.has(post.id)).length,0);
});
console.log(JSON.stringify({passed,failed,personalSaveStorageAccessed:false}));if(failed)process.exitCode=1;
