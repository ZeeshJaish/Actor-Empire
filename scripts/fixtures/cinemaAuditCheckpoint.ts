import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createDeterministicRng} from '../../services/deterministicRandom';

/** Audit-only state: no changes to gameplay RNG or the user's persistence. */
export const cinemaAuditRandom=(seed:string,initialCalls=0)=>{
 const rng=createDeterministicRng(seed);let calls=0;
 while(calls<initialCalls){rng();calls++}
 return {next:()=>{calls++;return rng()},calls:()=>calls};
};
export const cinemaAuditClock=(initialNext=Date.now())=>{
 let next=initialNext;
 return {now:()=>next++,next:()=>next,restore:(value:number)=>{next=value}};
};
export const readCinemaAuditCheckpoint=<T>(path:string):T|undefined=>existsSync(path)
 ? JSON.parse(gunzipSync(readFileSync(path)).toString('utf8')) as T:undefined;
export const writeCinemaAuditCheckpoint=(path:string,value:unknown)=>{
 // A killed batch cannot replace its last complete checkpoint with a partial file.
 writeFileSync(path+'.next',gzipSync(JSON.stringify(value),{level:1}));
 renameSync(path+'.next',path);
};
