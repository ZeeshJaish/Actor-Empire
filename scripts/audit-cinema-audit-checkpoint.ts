import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cinemaAuditRandom,cinemaAuditClock,readCinemaAuditCheckpoint,writeCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
const original=cinemaAuditRandom('resume-proof');
for(let i=0;i<137;i++)original.next();
const resumed=cinemaAuditRandom('resume-proof',original.calls());
for(let i=0;i<100;i++)assert.equal(resumed.next(),original.next());
const clock=cinemaAuditClock(1800000000000);clock.now();clock.now();
const again=cinemaAuditClock(clock.next());assert.equal(clock.now(),again.now());
const folder=mkdtempSync(join(tmpdir(),'cinema-checkpoint-proof-')),file=join(folder,'checkpoint.gz');
try{
 const paid={cash:12345,receipt:'cinema:0:123',grossCents:987654321,randomCalls:resumed.calls(),clockNext:again.next()};
 writeCinemaAuditCheckpoint(file,paid);writeFileSync(file+'.next','interrupted incomplete candidate');
 assert.deepEqual(readCinemaAuditCheckpoint(file),paid,'A failed next checkpoint retains the prior paid state');
 assert.equal(readCinemaAuditCheckpoint(join(folder,'missing.gz')),undefined);
}finally{rmSync(folder,{recursive:true,force:true})}
console.log('PASS audit checkpoint preserves RNG/clock and the previous complete state after interrupted writing');
