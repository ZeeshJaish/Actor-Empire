import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {INITIAL_PLAYER,type Player,type Message} from '../types';
import {generateRandomUniverseOpportunity} from '../services/universeLogic';
import {createDeterministicRng} from '../services/deterministicRandom';
import {migratePlayerSave} from '../services/saveMigration';
import {matureCareerUi} from './fixtures/cinemaMatureAppPolicy';

// Real template media, independently listed here. These controlled cases never
// contribute a film, a cash grant or a result to the earned career experiment.
const series=new Set(['WandaVision (Series)','The Mandalorian (Series)','Ahsoka (Series)','Monarch: Legacy of Monsters (Series)']);
const input=migratePlayerSave(structuredClone(INITIAL_PLAYER));
input.stats.fame=100;input.energy.current=input.energy.max;
const before=JSON.stringify(input),universes=new Set<string>(),mismatches:any[]=[],mixed=new Map<string,{offer:NonNullable<ReturnType<typeof generateRandomUniverseOpportunity>>;gender:Player['gender']}>();
let offers=0,acceptedMedia=0;
for(let seed=0;seed<1024;seed++){
 Math.random=createDeterministicRng('universe-release-routing:'+(seed%512));
 const gender=seed<512?'MALE':'FEMALE';
 const offer=generateRandomUniverseOpportunity({...input,gender},'DIRECT');assert.ok(offer?.universeContract);offers++;
 universes.add(offer.universeContract.universeId);
 const wantType=series.has(offer.projectName)?'SERIES':'MOVIE',wantRoute=wantType==='MOVIE'?'THEATRICAL':'STREAMING_ONLY';
 if(offer.project.type!==wantType||offer.project.releaseStrategy!==wantRoute)mismatches.push({seed,title:offer.projectName,studio:offer.project.studioId,wantType,wantRoute,actualType:offer.project.type,actualRoute:offer.project.releaseStrategy});
 if(offer.universeContract.films.some(f=>series.has(f.title)))mixed.set(offer.universeContract.characterName,{offer,gender});
}
assert.equal(JSON.stringify(input),before,'Generating an offer cannot rewrite an existing save or paid facts');
if(process.env.UNIVERSE_ROUTING_OUTPUT)writeFileSync(process.env.UNIVERSE_ROUTING_OUTPUT,JSON.stringify({offers,universes:[...universes].sort(),mismatchCount:mismatches.length,examples:mismatches.slice(0,8)},null,2)+'\n');
assert.equal(mismatches.length,0,'A franchise film must not inherit a random streaming studio route: '+JSON.stringify(mismatches.slice(0,3)));
assert.equal(universes.size,8,'Exercise every built-in universe, including Avatar with its Disney owner');
assert.ok(mixed.size>=3,'Exercise mixed film/series roadmaps');
for(const {offer,gender} of mixed.values())for(const legacy of [false,true]){
 assert.ok(offer?.universeContract);
 const p:Player={...structuredClone(input),gender},op=structuredClone(offer);
 if(legacy)for(const film of op.universeContract!.films)delete (film as any).projectType;
 const message={id:'routing-'+op.id+'-'+legacy,type:'OFFER_ROLE',isExpired:false,data:op} as Message;
 p.inbox=[message];const next=matureCareerUi(p).accept(message);
 const commitments=next.commitments.filter(c=>c.projectDetails?.universeId===op.universeContract!.universeId);
 assert.equal(commitments.length,op.universeContract.films.length);
 for(const c of commitments){
  const want=series.has(c.name)?'SERIES':'MOVIE';
  assert.equal(c.projectDetails!.type,want,'The accepted roadmap keeps the actual media type of '+c.name);
  assert.equal(c.projectDetails!.releaseStrategy,want==='MOVIE'?'THEATRICAL':'STREAMING_ONLY');
  assert.equal(c.projectDetails!.estimatedBudget,op.project.estimatedBudget,'Routing cannot increase the production budget');
  assert.deepEqual(c.projectDetails!.hiddenStats,op.project.hiddenStats,'Routing cannot boost craft or hype');
  if(want==='MOVIE')assert.equal(c.projectDetails!.episodes,undefined,'A film cannot inherit series episodes');
  else assert.ok((c.projectDetails!.episodes||0)>0);
  acceptedMedia++;
 }
}
console.log(JSON.stringify({offers,universes:universes.size,mixedRoadmaps:mixed.size,acceptedMedia,failures:0,kind:'CONTROLLED_ROUTING_CASES_EXCLUDED_FROM_CAREER_RESULTS'}));
