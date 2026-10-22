import assert from 'node:assert/strict';
import { applyOpportunityIdentityToProject } from '../services/characterIdentityLogic';
import { NPC_DATABASE, calculateProjectFameMultiplier, isCastableActor } from '../services/npcLogic';
import { generateRandomUniverseOpportunity } from '../services/universeLogic';
import { normalizeCinemaTitle, completeOfferedCinemaCast, preserveCinemaCastRecognition } from '../services/boxOffice/boxOfficeInputs';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';

const cases: Array<[string, () => void]> = [];
const test = (name: string, run: () => void) => cases.push([name, run]);
test('accepted offer contains the package ensemble, not only the player', () => {
  const f = makeCinemaFixture(1);
  const result = applyOpportunityIdentityToProject(f.opportunity, f.player);
  assert.ok(result.castList!.filter(c => c.type !== 'DIRECTOR').length >= 6,
    'A high-budget offered package must not become a singleton player cast');
  assert.equal(result.castList!.filter(c => c.isPlayer || c.actorId === 'PLAYER_SELF').length, 1);
  assert.equal(result.studioId, 'UNIVERSAL');
});
test('old singleton is repaired deterministically without mutating the offer', () => {
  const f = makeCinemaFixture(2);
  f.project.castList = [{ id:'player', name:f.player.name, actorId:'PLAYER_SELF', role:'Lead', roleType:'LEAD', type:'ACTOR', isPlayer:true, image:'' }];
  const before = structuredClone(f.opportunity);
  const a = applyOpportunityIdentityToProject(f.opportunity, f.player);
  const b = applyOpportunityIdentityToProject(f.opportunity, f.player);
  assert.ok(a.castList!.length > 1);
  assert.deepEqual(a.castList, b.castList);
  assert.deepEqual(f.opportunity, before);
});
test('duplicate actor IDs do not add fame', () => {
  const actor = NPC_DATABASE.find(n => isCastableActor(n) && (n.stats?.fame ?? 0) > 0)!;
  assert.equal(calculateProjectFameMultiplier([actor.id,actor.id], 'Unknown', 0),
    calculateProjectFameMultiplier([actor.id], 'Unknown', 0));
});
test('an uncredited player contributes neither fame nor acting talent', () => {
  assert.equal(calculateProjectFameMultiplier([], 'Unknown', 100, 100), 1);
  assert.ok(calculateProjectFameMultiplier(['PLAYER_SELF'], 'Unknown', 100, 80) > 1);
});
test('universe offer keeps its template studio', () => {
  const f = makeCinemaFixture(3);
  const before = Math.random; Math.random = () => 0.5;
  try {
    const offer = generateRandomUniverseOpportunity(f.player, 'AGENT');
    assert.ok(offer);
    assert.equal(offer.project.universeId, 'MONSTERVERSE');
    assert.equal(offer.project.studioId, 'WARNER_BROS');
  } finally { Math.random = before; }
});
test('authored casting is not padded and canonical people keep their characters', () => {
  const f = makeCinemaFixture(4);
  const actor = NPC_DATABASE.find(isCastableActor)!;
  f.project.castPackageSource = 'AUTHORED';
  f.project.castList = [
    {id:'role-1',actorId:actor.id,name:actor.name,role:'Lead',roleType:'LEAD',characterId:'hero',type:'ACTOR',isPlayer:false,image:''},
    {id:'role-2',npcId:actor.id,name:actor.name,role:'Cameo',roleType:'CAMEO',characterId:'twin',type:'ACTOR',isPlayer:false,image:''},
    {id:'director',name:f.project.directorName,role:'Director',type:'DIRECTOR',isPlayer:false,image:''},
  ];
  const before = structuredClone(f.project);
  const normalized = normalizeCinemaTitle({titleId:'canonical-film',owner:{id:'UNIVERSAL',route:'PLAYER_STUDIO'},project:f.project,player:f.player});
  assert.equal(normalized.cast.length,1,'Two roles played by one person are one audience-reach signal');
  assert.equal(normalized.cast[0].roleType,'LEAD');
  assert.deepEqual(normalized.cast[0].characterIds,['hero','twin']);
  assert.equal(normalized.playerCredited,false);
  assert.equal(normalized.budgetCents,21_000_000_000);
  assert.deepEqual(f.project,before);
});
test('custom actor IDs resolve through relationships without inventing fame', () => {
  const f = makeCinemaFixture(5);
  const actor = NPC_DATABASE.find(isCastableActor)!;
  f.player.relationships = [{id:'friend-alias',npcId:actor.id}] as typeof f.player.relationships;
  f.project.castList=[{id:'role',actorId:'friend-alias',name:actor.name,role:'Lead',roleType:'LEAD',isPlayer:false,type:'ACTOR',image:''}];
  const result=normalizeCinemaTitle({titleId:'film',owner:{id:'UNIVERSAL',route:'ACCEPTED_ROLE'},project:f.project,player:f.player});
  assert.equal(result.cast[0].personId,actor.id);
  assert.equal(result.cast[0].fame,Math.min(100,actor.stats?.fame || 0));
});
test('duplicate player rows cannot stand in for missing co-stars',()=>{
 const f=makeCinemaFixture(9);
 const credit={id:'self',actorId:'PLAYER_SELF',name:f.player.name,role:'Lead',roleType:'LEAD' as const,isPlayer:true,type:'ACTOR' as const,image:''};
 f.project.castList=[credit,{...credit,id:'self-copy'}];
 const repaired=completeOfferedCinemaCast(f.project);
 const title=normalizeCinemaTitle({titleId:'film',owner:{id:'UNIVERSAL',route:'ACCEPTED_ROLE'},project:repaired,player:f.player});
 assert.ok(title.cast.length>=7,'Duplicate player rows are one person, not two ensemble positions');
});
test('canonical custom actor fame is retained without a global database entry',()=>{
 assert.equal(calculateProjectFameMultiplier(['custom-actor'],'Unknown',0,undefined,0,new Map([['custom-actor',80]])),2.6);
});
test('saved cast recognition survives a missing procedural catalogue actor without inventing a replacement',()=>{
 const f=makeCinemaFixture(17);
 const actor={id:'procedural-cast-session-a',name:'Known at casting',tier:'RISING',stats:{fame:24}} as any;
 f.player.flags.extraNPCs=[actor];
 f.project.castList=[{id:'lead-credit',actorId:actor.id,name:actor.name,role:'Lead',roleType:'LEAD',isPlayer:false,type:'ACTOR',image:''}];
 const original=structuredClone(f.project),saved=preserveCinemaCastRecognition(f.project,f.player);
 assert.deepEqual(f.project,original);
 const normalize=(project:any)=>normalizeCinemaTitle({titleId:'reload-film',owner:{id:'UNIVERSAL',route:'ACCEPTED_ROLE'},project,player:f.player});
 const before=normalize(saved);
 f.player.flags.extraNPCs=[];
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(saved))).cast,before.cast);
 const corrupt=structuredClone(saved);corrupt.castList![0].cinemaRecognition!.personId='different-person';
 assert.equal(normalize(corrupt).cast[0].fame,0,'An unrelated saved identity must not supply star reach');
 f.player.flags.extraNPCs=[{...actor,stats:{fame:31}}];
 assert.equal(normalize(saved).cast[0].fame,31,'A current canonical actor still takes precedence');
});
test('offered ensemble captures actual catalogue recognition at casting',()=>{
 const f=makeCinemaFixture(18);f.project.castList=[];
 const project=completeOfferedCinemaCast(f.project,f.player);
 const actors=project.castList!.filter(c=>!c.isPlayer&&c.type==='ACTOR');
 assert.ok(actors.length>0);assert.ok(actors.every(c=>c.cinemaRecognition?.personId===c.actorId));
});
let failures = 0;
for (const [name, run] of cases) { try { run(); console.log('PASS', name); } catch (error) { failures++; console.error('FAIL', name, error instanceof Error ? error.message : error); } }
assert.equal(failures, 0, `${failures} cinema input regressions`);
