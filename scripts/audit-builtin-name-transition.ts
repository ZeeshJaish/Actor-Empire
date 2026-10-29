import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
Math.random=()=>.5;Date.now=()=>1700000000000;
const {INITIAL_PLAYER}=await import('../types');
const {NPC_DATABASE,createGlobalActorPackNPCs,calculateProjectFameMultiplier}=await import('../services/npcLogic');
const {FAMOUS_MOVIE_DB,FAMOUS_SERIES_DB,getNextFamousMovie,getNextFamousSeries,getFamousProjectDescription,createFamousOpportunity}=await import('../services/famousMovieLogic');
const {initUniverses,generateDirectEntryOffer,normalizeUniverseCharacterKey,normalizeUniverseMap,buildUniverseRoster,processUniverseTurn}=await import('../services/universeLogic');
const {BUILTIN_PERSON_ALIASES,BUILTIN_PROJECT_ALIASES}=await import('../services/fictionalNameCatalog');
const {fictionalPersonName,fictionalProjectTitle,canonicalProjectTitle,fictionalHandle,fictionalCharacterName,projectBuiltinPerson,isBuiltinPersonId,fictionalBuiltinText}=await import('../services/fictionalNames');
const {migrateBuiltinNames}=await import('../services/builtinNameMigration');
const {getCastingDirectorStyle}=await import('../services/roleLogic');
const {generateProjectInvestorOffers}=await import('../services/projectInvestors');
const issued=JSON.parse(readFileSync('scripts/fixtures/issued-builtin-identities.json','utf8'));
const universes=JSON.parse(readFileSync('scripts/fixtures/issued-builtin-universes.json','utf8'));
// Frozen published and explicit-media schedules preserve each contract schema independently.
const legacyUniverses=JSON.parse(readFileSync('scripts/fixtures/issued-builtin-universes-legacy.json','utf8'));
assert.equal(calculateProjectFameMultiplier([],'Christopher Nolan',0),calculateProjectFameMultiplier([],'Christopher Noland',0),'Legacy director names must keep their fame contribution');
for(const def of issued.famous)assert.equal(getCastingDirectorStyle(def.director),getCastingDirectorStyle(fictionalPersonName(def.director)),`Director style changed for ${def.director}`);
for(const name of ['constructor','toString','__proto__']){
 assert.equal(fictionalPersonName(name),name);assert.equal(fictionalProjectTitle(name),name);assert.equal(fictionalCharacterName(name),name);
 assert.deepEqual(projectBuiltinPerson({id:name,name:'My custom person'}),{id:name,name:'My custom person'});
}
const hasOwn=Object.hasOwn;try{Object.hasOwn=undefined as any;assert.equal(isBuiltinPersonId('celeb_act_18'),true);}finally{Object.hasOwn=hasOwn;}
assert.equal(fictionalBuiltinText('Thor/Loki; Thorough Jelly and A4 paper'),'Thorr/Lokki; Thorough Jelly and A4 paper');
const original=issued.npcs.find((n:any)=>n.name==='Tom Holland');
const tom={...NPC_DATABASE.find(n=>n.id===original.id)!,name:original.name,handle:original.handle};
const pack=createGlobalActorPackNPCs('india')[0];
const contract={id:'signed-before-update',npcId:tom.id,actorSnapshot:tom,type:'MOVIE_DEAL',paymentMode:'UPFRONT',totalAmount:1234567,maintenanceFee:0,installmentsPaid:1,totalInstallments:1,amountPaid:1234567,moviesRemaining:2,totalMovies:3,startWeek:8,status:'ACTIVE'};
const builtinProject={id:'famous_agent_123',name:'Interstellar',projectDetails:{isFamous:true,title:'Interstellar',directorName:'Christopher Nolan',castList:[{actorId:tom.id,actorName:tom.name,fee:234567}]},paid:345678};
const player:any={...structuredClone(INITIAL_PLAYER),age:30,money:987654321,flags:{extraNPCs:[tom,pack],enabledGlobalActorPacks:['india'],modHistory:[{type:'GLOBAL_ACTOR_PACK',packId:'india'}]},relationships:[{id:tom.id,name:tom.name,relation:'Friend',closeness:82,image:tom.avatar,lastInteractionWeek:5},{id:'player_relative',name:'Tom Holland',relation:'Sibling',closeness:99}],studio:{...INITIAL_PLAYER.studio,talentRoster:[contract]},commitments:[builtinProject],pastProjects:[{id:'custom-1',name:'Interstellar',projectDetails:{title:'Interstellar',directorName:'Tom Holland'}}],world:{...structuredClone(INITIAL_PLAYER.world),universes:initUniverses(),famousMoviesReleased:issued.famous.map((d:any)=>d.title)},activeUniverseContract:structuredClone(universes[0].offer)};
player.weeklyOpportunities={auditions:[{id:'famous_agent_old',projectName:'Interstellar',project:{isFamous:true,title:'Interstellar',directorName:'Christopher Nolan'}}],jobs:[]};
player.instagram.feed=[{id:'old-feed-post',authorId:tom.id,authorName:tom.name,authorHandle:tom.handle,caption:'My original player caption',likes:321}];
player.youtube.activeCollabs=[{id:'signed-collab',creatorId:'yt_global_mrbeast',creatorName:'MrBeast',creatorHandle:'@mrbeast',bonusViews:123456}];
player.world.projects=[{id:'retained-world-film',title:'My Custom Film',leadActorId:tom.id,leadActorName:tom.name}];
const input=JSON.stringify(player),migrated=migrateBuiltinNames(player);
assert.equal(migrated.relationships[0].name,'Tommy Holland','Old connections must display the same built-in alias');
assert.equal(JSON.stringify(player),input,'Migration must not mutate its input');
assert.equal(migrated.flags.extraNPCs[0].name,'Tommy Holland');
assert.equal(migrated.instagram.feed[0].authorHandle,'@tommyholland2013');
assert.equal(migrated.instagram.feed[0].caption,'My original player caption');
assert.equal(migrated.youtube.activeCollabs[0].creatorName,'MrBeastly');
assert.equal(migrated.youtube.activeCollabs[0].bonusViews,123456);
assert.deepEqual(migrated.flags.extraNPCs[1],pack,'Installed actor profile must be untouched');
assert.deepEqual(migrated.flags.enabledGlobalActorPacks,['india']);
assert.deepEqual(migrated.flags.modHistory,player.flags.modHistory);
assert.equal(migrated.relationships[0].closeness,82);
assert.equal(migrated.relationships[1].name,'Tom Holland','Player family names are not built-in identities');
assert.equal(migrated.studio.talentRoster[0].actorSnapshot.name,'Tommy Holland');
const withoutSnapshot=(c:any)=>{const {actorSnapshot,...facts}=c;return facts};
assert.deepEqual(withoutSnapshot(migrated.studio.talentRoster[0]),withoutSnapshot(contract),'Signed contract facts must not change');
assert.equal(migrated.money,player.money);
assert.equal(migrated.world.projects[0].leadActorName,'Tommy Holland','Retained industry film credits follow stable actor IDs');
assert.equal(migrated.world.projects[0].title,'My Custom Film');
assert.equal(migrated.weeklyOpportunities.auditions[0].projectName,'Interstella','Already pending famous offers must also transition');
assert.equal(migrated.commitments[0].name,'Interstella');
assert.equal(migrated.commitments[0].projectDetails.directorName,'Christopher Noland');
assert.deepEqual(migrated.pastProjects,player.pastProjects,'Unmarked player projects must not be renamed');
const external:any=structuredClone(player);external.flags.builtinNameVersion=0;external.commitments[0].projectDetails.directorId='external-custom-director';
assert.equal(migrateBuiltinNames(external).commitments[0].projectDetails.directorName,'Christopher Nolan','A custom/pack director credit must follow its own identity');
assert.strictEqual(migrateBuiltinNames(migrated),migrated,'Completed transition must be an O(1) no-op');
const reload=migrateBuiltinNames(JSON.parse(JSON.stringify(migrated)));
assert.equal(JSON.stringify(reload),JSON.stringify(migrated));
for(const [from,to] of Object.entries(BUILTIN_PERSON_ALIASES)){assert.equal(fictionalPersonName(from),to);assert.equal(fictionalPersonName(to),to);}
for(const [from,to] of Object.entries(BUILTIN_PROJECT_ALIASES)){assert.equal(fictionalProjectTitle(from),to);assert.equal(canonicalProjectTitle(to),from);assert.equal(fictionalProjectTitle(to),to);}
assert.equal(fictionalHandle('A4','@a4'),'@a4plus','Digits in the original creator name are not an automatic handle suffix');
assert.equal(fictionalHandle('Vegeta777','@vegeta777'),'@vegeta778');
assert.equal(fictionalHandle('Tom Holland','@custom_actor'),'@custom_actor');
assert.equal(new Set(Object.values(BUILTIN_PROJECT_ALIASES)).size,Object.keys(BUILTIN_PROJECT_ALIASES).length);
assert.equal(getNextFamousMovie(migrated,new Set()),null,'Old release ledger must still block reissuing famous movies');
assert.equal(getNextFamousSeries(migrated,new Set()),null);
const noReleases={...migrated,world:{...migrated.world,famousMoviesReleased:[]}};
const reserved=new Set([...FAMOUS_MOVIE_DB,...FAMOUS_SERIES_DB].map(d=>d.title.toLowerCase()));
assert.equal(getNextFamousMovie(noReleases,reserved),null,'Alias reservations must block duplicates');
assert.equal(getNextFamousSeries(noReleases,reserved),null);
const interstellar=FAMOUS_MOVIE_DB.find(d=>d.title==='Interstella')!;
assert.ok(getFamousProjectDescription('en',interstellar).length>40,'Canonical translation keys retain the existing detailed plot');
const project=createFamousOpportunity(interstellar,'LEAD','DIRECT','en',INITIAL_PLAYER).project;let checkedOffers=0;
for(let week=1;week<=12;week++){const input={project,player:{...INITIAL_PLAYER,currentWeek:week,stats:{...INITIAL_PLAYER.stats,fame:90,reputation:90}},targetRaise:20_000_000,packageBudget:60_000_000};const aliasOffers=generateProjectInvestorOffers(input);checkedOffers+=aliasOffers.length;assert.deepEqual(generateProjectInvestorOffers({...input,project:{...project,title:'Interstellar'}}),aliasOffers,'Renaming a curated package must not reroll its investor terms');}
assert.ok(checkedOffers>0);
assert.equal(normalizeUniverseCharacterKey('Iron Mann'),'iron_mann','Generic custom-character keys must retain their original semantics');
const current=initUniverses();
for(const name of ['Tom Holland','Interstellar','Iron Man','My Own Name']){const turn=processUniverseTurn({...INITIAL_PLAYER,name,stats:{...INITIAL_PLAYER.stats,fame:90}},{...current.MCU,weeksUntilNextPhase:1});assert.ok(turn.news.some(n=>n.headline.includes(`Fans Demand ${name} as`)),'Player-written names must not be rewritten inside localized narrative variables');}
const legacyUniverse={...current.MCU,roster:[{id:'iron_man',characterId:'iron_man',name:'Iron Man',actorId:'UNKNOWN',actorName:'Unknown Actor'}]};
const legacyNormalized=normalizeUniverseMap({MCU:legacyUniverse}).MCU;
assert.equal(legacyNormalized.roster.find(r=>r.characterId==='iron_man')!.actorId,current.MCU.roster[0].actorId,'Old canonical names must still recover their original default cast');
assert.equal(buildUniverseRoster(legacyUniverse as unknown as Parameters<typeof buildUniverseRoster>[0],[],'QA')[0].actorId,current.MCU.roster[0].actorId);
for(const previous of universes){
 const now=current[previous.id];
 assert.deepEqual(now.roster.map(r=>({id:r.id,characterId:r.characterId,actorId:r.actorId})),previous.roster.map(({name,...rest}:any)=>rest));
 const offer=generateDirectEntryOffer({...INITIAL_PLAYER,age:30},previous.id);
 const normalize=(o:any)=>({...o,characterName:undefined,films:o.films.map((f:any)=>({...f,title:canonicalProjectTitle(f.title)}))});
 const issuedOffer=offer.films.some(f=>Object.prototype.hasOwnProperty.call(f,'projectType'))?previous.offer:legacyUniverses.find((u:any)=>u.id===previous.id).offer;
 assert.deepEqual(normalize(offer),normalize(issuedOffer),'Universe film obligations, pay and schedule remain identical within its issued schema');
}
const edited={...player,flags:{...player.flags,extraNPCs:[{...tom,name:'My Custom Actor'}]}};
assert.equal(migrateBuiltinNames(edited).flags.extraNPCs[0].name,'My Custom Actor');
console.log('Legacy aliases, protected money/contracts, installed packs, custom titles, reload, reservation and franchise continuity passed.');
