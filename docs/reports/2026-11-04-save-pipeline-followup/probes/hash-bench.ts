import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
import {stableSaveHash as before} from '/Users/zeesh/Vibe code/Actor empire/services/stableSaveHash';
import {stableSaveHash as short} from './hash-short';import {stableSaveHash as shapes} from './hash-shapes';import {stableSaveHash as both} from './hash-both';
import {readCinemaAuditCheckpoint} from '/Users/zeesh/Vibe code/Actor empire/scripts/fixtures/cinemaAuditCheckpoint';
const saved=readCinemaAuditCheckpoint<any>('cinema-verification.local/owned-studio-20261029/earned-owned-prefix/career-0.json.gz'),p=saved.player;
const value={market:p.world.cinemaMarket,active:p.activeReleases.filter((r:any)=>r.cinema&&r.cinema.settlementBasis!=='LEGACY_FULLY_SETTLED'&&!p.world.cinemaMarket.titles[r.id]?.closed).map((r:any)=>({id:r.id,cinema:r.cinema,gross:r.totalGross,receipts:r.totalStudioReceipts})),projects:p.world.projects.filter((r:any)=>r.cinema&&r.cinema.settlementBasis!=='LEGACY_FULLY_SETTLED'&&!p.world.cinemaMarket.titles[r.id]?.closed).map((r:any)=>({id:r.id,cinema:r.cinema,gross:r.boxOffice}))};
const algorithms={before,short,shapes,both},rows=[];let expected:string|undefined;
for(let i=0;i<6;i++)for(const name of i%2?['both','shapes','short','before']:['before','short','shapes','both']){(globalThis as any).gc?.();const start=performance.now(),hash=algorithms[name](value),ms=performance.now()-start;expected??=hash;assert.equal(hash,expected);rows.push({i,name,ms,hash});}
writeFileSync('/private/tmp/actor-save-round-20261104-Lm5LRx/hash-bench.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
