import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {verifySaveIntegrity} from '../services/saveIntegrity';
const pack=JSON.parse(readFileSync('scripts/fixtures/saveArchiveSchema4Frozen.json','utf8'));
let reads=0;Object.defineProperty(pack.player.pastProjects[0],'futureCareerDetail',{enumerable:true,get(){reads++;return 'Retained legacy detail';}});
assert.equal(verifySaveIntegrity(pack.player,pack.manifest).ok,true,'The independently issued v4 signature still verifies');
assert.equal(reads,0,'Legacy v4 verification must not build the later v5 full-career projection before verifying its own exact issued schema');
pack.player.money++;
assert.equal(verifySaveIntegrity(pack.player,pack.manifest).ok,false,'Legacy protected-money mutation must still be rejected');
console.log(JSON.stringify({legacySchemaChecks:3,issuedV4Verified:true,laterSchemaWalks:0,moneyTamperingRejected:true}));
