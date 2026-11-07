/** Read-only timing of the real verified-generation path on a retained large save.
 * Instrumented hashing still executes every existing serializer/hash statement. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {CinemaFileSaveStore} from './fixtures/cinemaFileSaveStore';
const checkpoint=process.env.CINEMA_PROFILE_CHECKPOINT||'cinema-verification.local/owned-studio-20261029/earned-owned-prefix/career-0.json.gz';
const output=process.env.CINEMA_PROFILE_OUTPUT;assert.ok(output);
const saved=readCinemaAuditCheckpoint<any>(checkpoint),player=saved.player;delete saved.player;delete saved.npcDatabase;
const phases:any[]=[];const timed=async(name:string,fn:()=>any)=>{const start=performance.now(),result=await fn();phases.push({name,ms:performance.now()-start});return result;};
const dir=mkdtempSync(join(tmpdir(),'cinema-persistence-profile-')),store=new CinemaFileSaveStore(dir);
try{
 const prepared=await timed('prepareProcessedWeek',()=>prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK'));
 await timed('firstVerifiedSave',()=>saveVerifiedGameData(store,'profile',prepared.player,prepared.manifest));
 await timed('secondVerifiedSaveWithPrevious',()=>saveVerifiedGameData(store,'profile',prepared.player,prepared.manifest));
 const loaded=await timed('verifiedLoad',()=>loadVerifiedGameData(store,'profile'));
 assert.equal(loaded.status,'CURRENT');assert.equal(loaded.player?.money,player.money);
 const hashes=(globalThis as any).__cinemaHashTimings||[];
 const result={phases,hashes:hashes.length,serializeMs:hashes.reduce((n:number,r:any)=>n+r.serializeMs,0),hashMs:hashes.reduce((n:number,r:any)=>n+r.hashMs,0),largestHashes:[...hashes].sort((a:any,b:any)=>b.serializeMs-a.serializeMs).slice(0,8),newWeeks:0,personalSaveStorageAccessed:false,sourceSha:(globalThis as any).__cinemaIntegritySourceSha};
 writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{rmSync(dir,{recursive:true,force:true});}
