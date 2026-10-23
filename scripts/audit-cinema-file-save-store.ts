import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CinemaFileSaveStore} from './fixtures/cinemaFileSaveStore';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
import {getSaveGenerationKeys,saveVerifiedGameData,loadVerifiedGameData,recoverPreviousGameData} from '../services/saveGenerations';
import {makeCinemaFixture} from './fixtures/boxOfficeScenarios';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';

const root=mkdtempSync(join(tmpdir(),'cinema-file-store-'));let passed=0;
try{
 const memory=new CinemaMemorySaveStore(),file=new CinemaFileSaveStore(root),keys=getSaveGenerationKeys('parity');
 const parity=async()=>{for(const key of Object.values(keys))assert.deepEqual(await file.read(key),await memory.read(key));passed++};
 const sparse:any[]=[];sparse[5]={value:undefined};
 for(const store of [memory,file])await store.write('clone-semantics',{sparse,missing:undefined,finite:Infinity});
 assert.deepEqual(await file.read('clone-semantics'),await memory.read('clone-semantics'));passed++;
 const a=await file.read('clone-semantics');a.sparse[5].value='changed';assert.equal((await file.read('clone-semantics')).sparse[5].value,undefined);passed++;
 const source=makeCinemaFixture(4).player;
 let prepared=prepareVerifiedPlayerForPersistence(source,'PROCESS_WEEK');
 for(const store of [memory,file])await saveVerifiedGameData(store,'parity',prepared.player,prepared.manifest);
 await parity();
 const next={...source,money:source.money+123}; // Controlled adapter case only.
 prepared=prepareVerifiedPlayerForPersistence(next,'PROCESS_WEEK');
 for(const store of [memory,file])await saveVerifiedGameData(store,'parity',prepared.player,prepared.manifest);
 await parity();assert.equal((await loadVerifiedGameData(new CinemaFileSaveStore(root),'parity')).player!.money,next.money);passed++;
 for(const store of [memory,file]){store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,'parity',prepared.player,prepared.manifest),/promotion/);store.failPromotion=false}
 await parity();assert.equal((await loadVerifiedGameData(new CinemaFileSaveStore(root),'parity')).player!.money,next.money);passed++;
 await recoverPreviousGameData(memory,'parity');await recoverPreviousGameData(file,'parity');await parity();
 for(let i=0;i<5;i++){await file.write('discarded',{i});await file.remove('discarded')}
 assert.ok(readdirSync(root).filter(n=>n.endsWith('.bin')).length<=7,'Unreferenced worlds must not accumulate on disk');passed++;
 console.log(JSON.stringify({passed,failures:0,kind:'SAVE_ADAPTER_PARITY_EXCLUDED_FROM_CAREER_RESULTS'}));
}finally{rmSync(root,{recursive:true,force:true})}
