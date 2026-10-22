import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { makeFullWorldFixture } from './fixtures/boxOfficeFullWorld';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';

const {input}=makeFullWorldFixture('focused-small',0),original=JSON.stringify;
let calls=0;
JSON.stringify=((...args:Parameters<typeof JSON.stringify>)=>{calls++;return original(...args)}) as typeof JSON.stringify;
let result:ReturnType<typeof simulateCinemaWeek>;
try{result=simulateCinemaWeek(input)}finally{JSON.stringify=original}
const hash=createHash('sha256').update(JSON.stringify(result)).digest('hex');
const output=process.env.CINEMA_FINGERPRINT_OUTPUT;
if(output)writeFileSync(output,JSON.stringify({calls,cohorts:input.cohorts.length,hash,fingerprint:result.inputFingerprint}));
console.log(JSON.stringify({calls,cohorts:input.cohorts.length,hash}));
assert.ok(calls<input.cohorts.length*18,'Canonical sorting must serialize each key once, not again for every comparison');
assert.deepEqual(simulateCinemaWeek(input),result);
console.log('PASS full-world fingerprint serialization stays bounded and result deterministic');
