import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CinemaFileSaveStore} from './fixtures/cinemaFileSaveStore';
import {migratePlayerSave} from '../services/saveMigration';
import type {Player} from '../types';

const path=process.env.CINEMA_DIAGNOSTIC_STORE!;assert.ok(path);
const p=await new CinemaFileSaveStore(path).read('normal-cohort-0') as Player;assert.ok(p);
const fields=['storyFunction','storyRole','abilityType','nature','identitySource','characterId','characterName','sourceUniverseId'] as const;
const facts=(p:Player)=>p.commitments.flatMap(c=>(c.projectDetails?.castList||[]).map(m=>({projectId:c.id,memberId:m.id,projectName:c.name,universeId:c.projectDetails?.universeId,compass:c.projectDetails?.storyCompass,profile:Object.fromEntries(fields.map(k=>[k,m[k]]))})));
const financialFacts=(p:Player)=>({cash:p.money,businesses:p.businesses.map(b=>[b.id,b.balance]),cinema:p.world.cinemaMarket,contracts:p.world.streamingRightsContracts,roles:p.commitments.map(c=>({id:c.id,pay:c.lumpSum,cast:c.projectDetails?.castList?.map(m=>({id:m.id,actorId:m.actorId,npcId:m.npcId,salary:m.salary,characterId:m.characterId,recognition:m.cinemaRecognition}))}))});
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const before=facts(p),financial=financialFacts(p),fingerprint=hash(financial),next=migratePlayerSave(p),after=facts(next),financialAfter=financialFacts(next);
const financialDifferences:any[]=[];
const diff=(a:any,b:any,path='')=>{if(financialDifferences.length>=8||a===b)return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],path+'.'+k)}else financialDifferences.push({path,before:a,after:b})};diff(financial,financialAfter);
const differences=before.flatMap(b=>{const a=after.find(a=>a.projectId===b.projectId&&a.memberId===b.memberId)!;return fields.filter(k=>a.profile[k]!==b.profile[k]).map(k=>({project:b.projectName,memberId:b.memberId,universeId:b.universeId,compass:b.compass,field:k,before:b.profile[k],after:a.profile[k],profile:b.profile}))});
console.log(JSON.stringify({differences,financialsUnchanged:hash(financialAfter)===fingerprint,financialDifferences}));
assert.equal(hash(financialAfter),fingerprint,'Canonical tagging must not alter any protected payment or recognition');
