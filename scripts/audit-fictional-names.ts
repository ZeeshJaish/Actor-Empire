import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const originalRandom=Math.random,originalClock=Date.now;Math.random=()=>.5;Date.now=()=>1700000000000;
const {NPC_DATABASE,createGlobalActorPackNPCs}=await import('../services/npcLogic');
const {DEFAULT_GLOBAL_CREATOR_PROFILES,getEnabledGlobalCreatorProfiles}=await import('../services/youtubeLogic');
const {PROJECT_INVESTORS,investorOwnerNpcId}=await import('../services/projectInvestors');
const {FAMOUS_MOVIE_DB,FAMOUS_SERIES_DB}=await import('../services/famousMovieLogic');
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const immutableNpc=(npc:any)=>{const{name,handle,bio,...rest}=npc;return rest};
const fixturePath='scripts/fixtures/issued-builtin-identities.json';
// Issued fixtures were captured from the pre-alias source and are intentionally frozen.
{
 const issued=JSON.parse(readFileSync(fixturePath,'utf8'));
 assert.deepEqual(NPC_DATABASE.map(n=>n.id),issued.npcs.map((n:any)=>n.id),'Default aliasing must neither add duplicate people nor remove/reorder existing identities');
 assert.deepEqual(DEFAULT_GLOBAL_CREATOR_PROFILES.map(n=>n.id),issued.creators.map((n:any)=>n.id));
 const tom=issued.npcs.find((n:any)=>n.name==='Tom Holland');assert.ok(tom);
 assert.equal(NPC_DATABASE.find(n=>n.id===tom.id)?.name,'Tommy Holland','Default Tom Holland should receive the approved subtle alias');
 assert.equal(DEFAULT_GLOBAL_CREATOR_PROFILES.find(n=>n.id==='yt_global_mrbeast')?.name,'MrBeastly');
 for(const prior of issued.npcs){const current=NPC_DATABASE.find(n=>n.id===prior.id);assert.ok(current,`Lost NPC ${prior.id}`);assert.equal(hash(immutableNpc(current)),prior.immutableHash,`Non-cosmetic NPC data changed: ${prior.id}`);}
 for(const prior of issued.creators){const current=DEFAULT_GLOBAL_CREATOR_PROFILES.find(n=>n.id===prior.id);assert.ok(current);assert.equal(hash(immutableNpc(current)),prior.immutableHash);}
 for(const prior of issued.investors){assert.equal(investorOwnerNpcId(PROJECT_INVESTORS.find(n=>n.id===prior.id)!),prior.ownerId,'Producer ownership identity must not change');}
 const countryPacks=JSON.parse(readFileSync('scripts/fixtures/issued-country-pack-identities.json','utf8'));
 const {INITIAL_PLAYER}=await import('../types');
 for(const pack of countryPacks){const npcs=createGlobalActorPackNPCs(pack.id);assert.equal(npcs.length,pack.npcCount);assert.equal(hash(npcs),pack.npcHash,`Installed ${pack.id} actor/director catalog changed`);const creators=getEnabledGlobalCreatorProfiles({...INITIAL_PLAYER,flags:{enabledGlobalActorPacks:[pack.id]}}).filter(n=>n.followers<20_000_000);assert.equal(creators.length,pack.optionalCreatorCount);assert.equal(hash(creators),pack.optionalCreatorHash,`Installed ${pack.id} optional creator catalog changed`);}
 const india=createGlobalActorPackNPCs('india');for(const prior of issued.indiaPack){assert.equal(hash(india.find(n=>n.id===prior.id)),prior.hash,'Installed pack catalogue must remain byte-equivalent');}
 assert.ok(FAMOUS_MOVIE_DB.some(d=>d.title==='Interstella'),'Default famous movies should display subtle aliases');
 console.log('Built-in aliases, immutable identities and installed pack preservation passed.');
}
Math.random=originalRandom;Date.now=originalClock;
