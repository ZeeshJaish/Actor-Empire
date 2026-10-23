// Prepare the explicit, disposable advanced-owner App route.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import type { Player } from '../types';
import { queueBillionFilm } from './fixtures/boxOfficeBillionCareer';

const source=process.env.CINEMA_BILLION_CHECKPOINT;
const output=process.env.CINEMA_BILLION_APP_FIXTURE;
assert.ok(source&&output,'Set earned checkpoint and disposable App fixture paths');
const bytes=readFileSync(source);
let player:Player=JSON.parse(source.endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8'));
player=queueBillionFilm(player,{id:'final-phenomenon',budget:300e6,campaign:200e6,quality:100,estimatedQuality:90,
    genre:'FANTASY',castIndices:[0,1,2,3,4,5,6,7],universe:true,wide:true});
assert.equal(player.world.cinemaMarket?.titles['final-phenomenon'],undefined,'Final film must have no paid history');
const economicHash=()=>createHash('sha256').update(JSON.stringify({world:player.world,businesses:player.businesses,
    money:player.money,commitments:player.commitments,activeReleases:player.activeReleases,pastProjects:player.pastProjects})).digest('hex');
const before=economicHash();
// Explicit authored UI control: the financial soak does not play life choices.
// Start this separate App route healthy, without old unresolved life/award prompts.
// Never alter economic inputs, cash, prior paid viewers or the new film's package.
player.stats.health=100;player.stats.happiness=100;player.activeHealthConditions=[];
player.pendingEvent=undefined;player.pendingEvents=[];player.scheduledEvents=[];
for(const key of Object.keys(player.flags))if(/^(deathCause|lastHealth|healthConditionCap|activeHealthConditionCount|criticalHealthWeeks|recentHealthCrises)/.test(key))delete player.flags[key];
player.flags.isDead=false;
assert.equal(economicHash(),before,'UI controls must preserve all economic state');
writeFileSync(output,JSON.stringify(player));
console.log(JSON.stringify({status:'PASS',economicStateSha256:before,finalGrossCents:0,
    controls:'Authored healthy owner; unresolved life/award prompts cleared. Financial state untouched.',output},null,2));
