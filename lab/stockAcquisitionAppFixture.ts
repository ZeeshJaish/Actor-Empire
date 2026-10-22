import {INITIAL_PLAYER} from '../types';
import {initializeStocks} from '../services/stockLogic';
import {ensureStudioEcosystem} from '../services/studioEcosystem';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData,writeGameSaveSummary} from '../services/storage';
export async function seed(){
 let p=structuredClone(INITIAL_PLAYER);
 Object.assign(p,{id:'isolated-actual-app-stock-safety',name:'Stock Actual App Buyer',age:35,currentWeek:8,money:2e12,stocks:initializeStocks(),portfolio:[],businesses:[],pendingEvents:[]});
 p.energy={...p.energy,current:100};p.flags={...p.flags,tutorialCompleted:true};p.world=ensureStudioEcosystem(p.world);
 const prepared=prepareVerifiedPlayerForPersistence(p,'MIGRATION');
 await saveVerifiedGameData('actorEmpireSave_1',prepared.player,prepared.manifest);writeGameSaveSummary('actorEmpireSave_1',prepared.player);
 return prepared.player.name;
}
export async function read(){const result=await loadVerifiedGameData('actorEmpireSave_1');if(result.status!=='CURRENT')throw new Error('Unverified synthetic slot '+result.status);return {status:result.status,player:result.player};}

// Author signed incompatible legacy fixtures only in a fresh synthetic browser context.
export async function seedRecovery(bothBad=false){
 const storage=await import('../services/storage');const {createSaveIntegrityManifest}=await import('../services/saveIntegrity');const {getSaveGenerationKeys}=await import('../services/saveGenerations');
 await seed();const {player}=await read();player.name=bothBad?'Stock Unsupported Buyer':'Stock Recovery Buyer';player.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300}];
 const safe=prepareVerifiedPlayerForPersistence(player,'MIGRATION').player;
 const current=structuredClone(safe);current.currentWeek=9;current.money+=1000;current.stocks.find(s=>s.id==='stk_para')!.outstandingShares=100.5;
 const previous=structuredClone(safe);if(bothBad)previous.stocks.find(s=>s.id==='stk_para')!.outstandingShares=100.25;
 const keys=getSaveGenerationKeys('actorEmpireSave_1');
 await storage.saveGameData(keys.current,current,{rethrow:true});
 await storage.saveGameData(keys.integrity,createSaveIntegrityManifest(current,'AUTOSAVE'),{rethrow:true});
 await storage.saveGameData(keys.previous,{kind:'ACTOR_EMPIRE_SAVE_GENERATION',formatVersion:1,player:previous,manifest:createSaveIntegrityManifest(previous,'AUTOSAVE'),needsRecoveryCheckpoint:false},{rethrow:true});
 storage.writeGameSaveSummary(keys.current,current);
 return {name:current.name,safe:{money:safe.money,holdings:safe.portfolio,week:safe.currentWeek},schemaVersion:createSaveIntegrityManifest(current,'AUTOSAVE').digestSchemaVersion};
}
export async function recoverySnapshot(){
 const storage=await import('../services/storage'),{getSaveGenerationKeys}=await import('../services/saveGenerations');const keys=getSaveGenerationKeys('actorEmpireSave_1');const result:Record<string,string>={};
 for(const key of [keys.current,keys.integrity,keys.previous]){const raw=await storage.loadGameData(key),bytes=new TextEncoder().encode(JSON.stringify(raw)),digest=await crypto.subtle.digest('SHA-256',bytes);result[key]=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');}
 return result;
}
