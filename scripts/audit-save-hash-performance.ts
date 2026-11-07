import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {stableSaveHash} from '../services/stableSaveHash';
import {issuedSaveHash} from './fixtures/issuedSaveHashReference';
const saved=readCinemaAuditCheckpoint<any>('cinema-verification.local/owned-studio-20261029/earned-owned-prefix/career-0.json.gz');const values=[saved.player.world.cinemaMarket,saved.player.world.worldStreamingViewing];delete saved.npcDatabase;
const rows:any[]=[];
for(let round=0;round<3;round++)for(let i=0;i<values.length;i++){
 const value=values[i],measure=(fn:(value:unknown)=>string)=>{const start=performance.now(),hash=fn(value);return{ms:performance.now()-start,hash}};
 const a=round%2===0?measure(issuedSaveHash):measure(stableSaveHash),b=round%2===0?measure(stableSaveHash):measure(issuedSaveHash);assert.equal(a.hash,b.hash);
 rows.push({round,field:i===0?'cinema':'viewing',issuedMs:round%2===0?a.ms:b.ms,candidateMs:round%2===0?b.ms:a.ms});
 (globalThis as any).gc?.();
}
const report={scope:'Same actual large-save subtrees; alternating algorithm order, no weeks advanced',rows,oldTotal:rows.reduce((n,r)=>n+r.issuedMs,0),newTotal:rows.reduce((n,r)=>n+r.candidateMs,0),personalSaveStorageAccessed:false};writeFileSync(process.env.HASH_PROFILE_OUTPUT!,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
