import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { advanceWorldStreamingViewingToWeek,createWorldStreamingViewingState } from '../services/worldEconomy/worldStreamingViewing';
import type { Player } from '../types';
const rows=[];
for(const name of (process.env.CINEMA_PARITY_NAMES||'early,late').split(',')){
 const player=JSON.parse(readFileSync(`/private/tmp/actor-phase6-benchmark-fixtures/${name}.json`,'utf8')) as Player;
 const before=createHash('sha256').update(JSON.stringify(player)).digest('hex'),start=performance.now();const result=createWorldStreamingViewingState(player,getAbsoluteWeek(player.age,player.currentWeek)+1);const ms=performance.now()-start;
 assert.equal(createHash('sha256').update(JSON.stringify(player)).digest('hex'),before);
 rows.push({name,sha256:createHash('sha256').update(JSON.stringify(result)).digest('hex'),ms,global:result.global,royaltyRows:result.royaltyReceipts.length,storeTransactions:result.aiStoreTransactions?.length});console.log(name,Math.round(ms));
 if(name==='early'){
  const prior=structuredClone(result),owned=prior.aiCatalogue!.filter(t=>t.countryIds.includes('US')&&t.accessGrant.modes.includes('PURCHASE'));
  assert.ok(owned.length>0,'Parity fixture needs store titles with purchase rights');
  prior.aiStoreEntitlements=[...(prior.aiStoreEntitlements||[]).filter(e=>e.countryId!=='US'||e.kind!=='PURCHASE'),...owned.map(t=>({platformId:t.platformId,countryId:'US',titleId:t.titleId,kind:'PURCHASE' as const,households:1_000_000_000,purchasedAtAbsoluteWeek:result.lastProcessedAbsoluteWeek,expiresAtAbsoluteWeek:null}))];
  const unchanged=structuredClone(prior),at=performance.now(),next=advanceWorldStreamingViewingToWeek(prior,player,result.lastProcessedAbsoluteWeek+1);
  assert.deepEqual(prior,unchanged);assert.deepEqual(advanceWorldStreamingViewingToWeek(next,player,next.lastProcessedAbsoluteWeek),next);
  assert.equal(next.aiStoreTransactions?.filter(t=>t.countryId==='US'&&t.kind==='PURCHASE'&&owned.some(o=>o.platformId===t.platformId&&o.titleId===t.titleId)).length,0,'Owned households cannot be charged for the same permanent purchase again');
  rows.push({name:'early-next-week-owned-entitlements',sha256:createHash('sha256').update(JSON.stringify(next)).digest('hex'),ms:performance.now()-at,global:next.global,royaltyRows:next.royaltyReceipts.length,storeTransactions:next.aiStoreTransactions?.length});
 }
}
writeFileSync(process.env.CINEMA_PARITY_OUTPUT||'/private/tmp/actor-phase6-viewing-parity.json',JSON.stringify(rows,null,2)+'\n');
