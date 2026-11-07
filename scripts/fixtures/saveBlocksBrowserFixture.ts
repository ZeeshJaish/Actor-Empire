import {INITIAL_PLAYER, type Player} from '../../types';
import * as storage from '../../services/storage';
import {createSaveIntegrityManifest, verifySaveIntegrity} from '../../services/saveIntegrity';
import {createIndexedDbSaveGenerationStore} from '../../services/indexedDbSaveGenerations';
import * as generations from '../../services/saveGenerations';
import {stableSaveHash} from '../../services/stableSaveHash';
import {issuedSaveHash} from './issuedSaveHashReference';

const key = 'actorEmpireSave_1';
const open = () => new Promise<IDBDatabase>((resolve,reject) => {
    const request=indexedDB.open('ActorEmpireDB',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('saves');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});
const rawRead=async(k=key)=>{const db=await open();try{return await new Promise<any>((resolve,reject)=>{
    const tx=db.transaction('saves','readonly'),r=tx.objectStore('saves').get(k);
    tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);
});}finally{db.close();}};
const rawWrite=async(k:string,value:any)=>{const db=await open();try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(value,k);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
});}finally{db.close();}};
const fresh=()=>{const p=structuredClone(INITIAL_PLAYER) as Player;p.id='block-career';p.name='Block Career';p.money=500;p.currentWeek=20;
    (p.world as any).savedArchiveAudit={text:'Career history 🦊\n'.repeat(18000),optional:undefined,notANumber:NaN,negativeZero:-0,
        date:new Date('2020-02-03T04:05:06Z'),collision:{$actorSaveValue:'u',body:'real player data'},sparse:[1,,undefined,4]};
    (p.flags as any).savedRecordAudit={body:'Never drop this record.'.repeat(10000),nested:{optional:undefined}};
    return p;};
const useBlocks=new URLSearchParams(location.search).get('blocks')==='1';
const experimental=createIndexedDbSaveGenerationStore(open,'saves',{blockPayloads:true});
const overrides=useBlocks?{
    saveVerifiedGameData:(key:string,p:Player,m:any,options:any)=>generations.saveVerifiedGameData(experimental,key,p,m,options),
    loadVerifiedGameData:(key:string)=>generations.loadVerifiedGameData(experimental,key),
    peekVerifiedPreviousGameData:(key:string)=>generations.peekVerifiedPreviousGameData(experimental,key),
    recoverPreviousGameData:(key:string)=>generations.recoverPreviousGameData(experimental,key),
    replaceAllVerifiedGameData:async(entries:any[])=>generations.promoteStagedGameDataBatch(experimental,await generations.stageVerifiedGameDataBatch(experimental,entries)),
}:{};
(window as any).saveBlocksQA={...storage,...overrides,key,rawRead,rawWrite,fresh,sign:createSaveIntegrityManifest,verify:verifySaveIntegrity};

(window as any).saveBlocksQA.runChecks=async()=>{const q=(window as any).saveBlocksQA,p=q.fresh(),manifest=q.sign(p,'AUTOSAVE',100),rows=[];
    for(const value of ['\ud800','\udfff','a\ud800z','🦊','\u0000\u2028\u2029',{'key\udfff':'value\ud800'},undefined,[1,,undefined,-0,NaN,Infinity]]){
        if(stableSaveHash(value)!==issuedSaveHash(value))throw Error('Issued signature bytes changed on this JavaScript engine');
    }
    rows.push('frozen issued UTF-16 signature oracle on this engine');
    await q.saveVerifiedGameData(q.key,p,manifest);const raw=await q.rawRead();
    if(useBlocks&&raw?.kind!=='ACTOR_EMPIRE_PLAYER_BLOCKS')throw Error('Large careers must persist as immutable payload blocks; received '+raw?.kind);
    if(!useBlocks&&raw?.kind==='ACTOR_EMPIRE_PLAYER_BLOCKS')throw Error('Unproven storage experiment enabled in production');
    let loaded=await q.loadVerifiedGameData(q.key);if(loaded.status!=='CURRENT')throw Error('New blocks did not load');
    const a=loaded.player.world.savedArchiveAudit;if(a.text!==p.world.savedArchiveAudit.text||!Object.hasOwn(a,'optional')||a.optional!==undefined||!Number.isNaN(a.notANumber)||!Object.is(a.negativeZero,-0)||!(a.date instanceof Date)||a.date.toISOString()!=='2020-02-03T04:05:06.000Z'||1 in a.sparse||!(2 in a.sparse)||a.collision.$actorSaveValue!=='u')throw Error('Payload values changed');
    if(!q.verify(loaded.player,manifest).ok)throw Error('Original signature changed');rows.push('exact large-value roundtrip with original signature');
    p.money=650;p.currentWeek=21;const next=q.sign(p,'PROCESS_WEEK',200);await q.saveVerifiedGameData(q.key,p,next);loaded=await q.loadVerifiedGameData(q.key);
    if(loaded.status!=='CURRENT'||loaded.player.money!==650||loaded.player.currentWeek!==21)throw Error('Next generation did not settle');
    const previous=await q.peekVerifiedPreviousGameData(q.key);if(previous?.money!==500||previous?.currentWeek!==20)throw Error('Previous generation changed');rows.push('atomic next and retained previous');
    const full=await q.loadGameData(q.key);if(full.world.savedArchiveAudit.text!==a.text)throw Error('Legacy public read did not hydrate');rows.push('public load exports a complete player');
    await q.recoverPreviousGameData(q.key);loaded=await q.loadVerifiedGameData(q.key);if(loaded.status!=='CURRENT'||loaded.player.money!==500)throw Error('Recovery failed');rows.push('previous-generation recovery');
    // Existing saves must retain compatibility on the first new-format write.
    const oldKey='qa.legacy';await q.rawWrite(oldKey,p);await q.rawWrite(oldKey+'__integrity',q.sign(p,'AUTOSAVE',300));const old=await q.loadVerifiedGameData(oldKey);if(old.status!=='CURRENT')throw Error('Legacy signed save failed');await q.saveVerifiedGameData(oldKey,p,q.sign(p,'AUTOSAVE',400));if(useBlocks&&(await q.rawRead(oldKey)).kind!=='ACTOR_EMPIRE_PLAYER_BLOCKS')throw Error('Legacy migration not enabled');rows.push('legacy signed save compatibility');
    // Unchanged sections should allocate no replacement immutable payloads.
    const BaseBlob=window.Blob;let allocations=0;
    window.Blob=new Proxy(BaseBlob,{construct(target,args){allocations++;return Reflect.construct(target,args);}});
    try{const unchanged=q.fresh();await q.saveVerifiedGameData(q.key,unchanged,q.sign(unchanged,'AUTOSAVE',500));}
    finally{window.Blob=BaseBlob;}
    if(allocations!==0)throw Error('Unchanged archive blocks were recreated');rows.push('unchanged immutable bytes reused without Blob allocations');

    const before=await q.loadVerifiedGameData(q.key),beforePrevious=await q.peekVerifiedPreviousGameData(q.key);
    const candidate=q.fresh();candidate.currentWeek=22;candidate.money=700;
    const put=IDBObjectStore.prototype.put;let injected=false;
    IDBObjectStore.prototype.put=function(value:any,key:any){
        if(key===q.key+'__candidate'){injected=true;throw new DOMException('QA full storage','QuotaExceededError');}
        return put.call(this,value,key);
    };
    let rejected=false;try{await q.saveVerifiedGameData(q.key,candidate,q.sign(candidate,'PROCESS_WEEK',600));}catch{rejected=true;}
    finally{IDBObjectStore.prototype.put=put;}
    if(!rejected||!injected||(await q.loadVerifiedGameData(q.key)).player.money!==before.player.money)throw Error('Quota failure replaced current');rows.push('quota failure preserves current');
    IDBObjectStore.prototype.put=function(value:any,key:any){if(key===q.key)throw Error('QA interrupted promotion');return put.call(this,value,key);};
    rejected=false;try{await q.saveVerifiedGameData(q.key,candidate,q.sign(candidate,'PROCESS_WEEK',700));}catch{rejected=true;}
    finally{IDBObjectStore.prototype.put=put;}
    if(!rejected||(await q.loadVerifiedGameData(q.key)).player.money!==before.player.money||(await q.peekVerifiedPreviousGameData(q.key)).money!==beforePrevious.money)throw Error('Promotion failure changed generations');rows.push('interrupted promotion preserves current and previous');

    // A valid but different generation returned at live promotion must not be
    // accepted merely because its own manifest verifies.
    const get=IDBObjectStore.prototype.get;let candidateReads=0;
    const substitute=q.fresh();substitute.money=9999;
    IDBObjectStore.prototype.get=function(key:any){const request=get.call(this,key);
        if(key===q.key+'__candidate'&&++candidateReads===2)request.addEventListener('success',()=>{
            request.result.player=substitute;request.result.manifest=q.sign(substitute,'AUTOSAVE',800);
        });return request;};
    rejected=false;try{await q.saveVerifiedGameData(q.key,candidate,q.sign(candidate,'PROCESS_WEEK',900));}catch{rejected=true;}
    finally{IDBObjectStore.prototype.get=get;}
    if(!rejected||(await q.loadVerifiedGameData(q.key)).player.money!==before.player.money)throw Error('Live promotion accepted a different valid candidate');rows.push('live promotion binds the requested generation');
    // Candidate leftovers from interruption are never silently promoted on load.
    if((await q.loadVerifiedGameData(q.key)).player.currentWeek!==before.player.currentWeek)throw Error('Restart promoted an unfinished week');rows.push('restart ignores uncommitted candidate');
    const corrupt=await q.rawRead();if(useBlocks)corrupt.fields.find((row:any)=>row[0]==='money')[1].value+=1;else corrupt.money+=1;
    await q.rawWrite(q.key,corrupt);let damaged=await q.loadVerifiedGameData(q.key);
    if(damaged.status!=='RECOVERY_AVAILABLE'||damaged.previous.money!==beforePrevious.money)throw Error('Inline corruption did not offer backup');
    await q.recoverPreviousGameData(q.key);rows.push('inline corruption recovers verified backup');
    if(useBlocks){
    const damagedBlock=await q.rawRead(),world=damagedBlock.fields.find((row:any)=>row[0]==='world')[1];
    const archive=world.fields.find((row:any)=>row[0]==='savedArchiveAudit')[1],text=await archive.blob.text();
    archive.blob=new Blob([text.replace('Career history','Broken history')],{type:archive.blob.type});
    await q.rawWrite(q.key,damagedBlock);damaged=await q.loadVerifiedGameData(q.key);
    if(damaged.status!=='RECOVERY_AVAILABLE'||damaged.previous.world.savedArchiveAudit.text!==p.world.savedArchiveAudit.text)throw Error('Damaged block lost archive recovery');
    await q.recoverPreviousGameData(q.key);rows.push('corrupt block body leaves shared previous immutable bytes intact');
    const missing=await q.rawRead();delete missing.fields.find((row:any)=>row[0]==='world')[1].fields.find((row:any)=>row[0]==='savedArchiveAudit')[1].blob;
    await q.rawWrite(q.key,missing);if((await q.loadVerifiedGameData(q.key)).status!=='RECOVERY_AVAILABLE')throw Error('Missing block silently loaded');
    await q.recoverPreviousGameData(q.key);rows.push('missing block fails closed with recovery');
    }
    const unsupported=q.fresh();unsupported.flags.nativeMap=new Map([['untouched',23]]);const nativeKey='qa.native-map';
    await q.saveVerifiedGameData(nativeKey,unsupported,q.sign(unsupported,'AUTOSAVE',1000));const native=await q.loadVerifiedGameData(nativeKey);
    if(native.status!=='CURRENT'||!(native.player.flags.nativeMap instanceof Map)||native.player.flags.nativeMap.get('untouched')!==23)throw Error('Native structured-clone fallback changed data');rows.push('unsupported native shapes keep the monolithic structured clone');
    const secondKey='actorEmpireSave_2',second=q.fresh();second.id='second-player';second.name='Second Career';second.money=300;
    await q.saveVerifiedGameData(secondKey,second,q.sign(second,'AUTOSAVE',1100));
    const one=q.fresh(),two=structuredClone(second);one.money=1100;two.money=2200;
    const entries=[{currentKey:q.key,player:one,manifest:q.sign(one,'IMPORT',1200)},{currentKey:secondKey,player:two,manifest:q.sign(two,'IMPORT',1300)}];
    const savedBefore=[(await q.loadVerifiedGameData(q.key)).player.money,(await q.loadVerifiedGameData(secondKey)).player.money];
    IDBObjectStore.prototype.put=function(value:any,key:any){if(key===secondKey)throw Error('QA interrupted batch');return put.call(this,value,key);};
    rejected=false;try{await q.replaceAllVerifiedGameData(entries);}catch{rejected=true;}finally{IDBObjectStore.prototype.put=put;}
    if(!rejected||(await q.loadVerifiedGameData(q.key)).player.money!==savedBefore[0]||(await q.loadVerifiedGameData(secondKey)).player.money!==savedBefore[1])throw Error('Batch failure partially imported careers');rows.push('batch failure is atomic across slots');
    await q.replaceAllVerifiedGameData(entries);
    if((await q.loadVerifiedGameData(q.key)).player.money!==1100||(await q.loadVerifiedGameData(secondKey)).player.money!==2200)throw Error('Batch success lost a slot');rows.push('signed batch import hydrates both careers');
    const exported=await q.exportPublicGameData();if(exported.length!==2||exported.some((row:any)=>row.value.kind==='ACTOR_EMPIRE_PLAYER_BLOCKS'||row.value.world.savedArchiveAudit.text!==one.world.savedArchiveAudit.text))throw Error('Public export leaked physical references');rows.push('public export contains complete plain players');
    await q.deleteVerifiedGameData(q.key);if((await q.listGameDataKeys()).some((key:string)=>key===q.key||key.startsWith(q.key+'__')))throw Error('Deleted slot retained generation roots');
    if((await q.loadVerifiedGameData(secondKey)).player.world.savedArchiveAudit.text!==two.world.savedArchiveAudit.text)throw Error('Deleting one slot deleted another archive');rows.push('slot deletion preserves other slots and shared archive data');
    return rows;
};
