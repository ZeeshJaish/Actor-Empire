/** Source-extracted owned-studio UI actions for an isolated verification worker.
 * Network ads, telemetry, rendering and animation are the only omitted effects. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import type {Player,Script} from '../../types';
import * as sequels from '../../services/sequelFlow';
import * as participation from '../../services/talentParticipation';
import * as scriptFinance from '../../services/scriptDevelopmentFinance';
import * as business from '../../services/businessLogic';
import * as premium from '../../services/premiumLogic';
import * as role from '../../services/roleLogic';
import * as universe from '../../services/universeLogic';
import * as genreCatalog from '../../services/genreCatalog';
import * as identity from '../../services/characterIdentityLogic';
import * as storyFit from '../../services/characterStoryFit';
import * as concept from '../../services/scriptConcept';
import * as scriptTemplates from '../../src/data/scriptTemplates';
import * as treasury from '../../services/studioGroup';
import * as productionEconomy from '../../services/studioProductionEconomy';
import * as location from '../../services/productionLocations';
import * as directorConnections from '../../services/directorConnectionLogic';
import * as productionCalendar from '../../services/productionCalendar';
import * as crew from '../../services/crewMarket';
import * as talent from '../../services/talentService';
import * as talentCareer from '../../services/talentCareer';
import * as talentBookings from '../../services/talentBookings';
import * as projectBuilder from '../../views/lifestyle/business/greenlightProjectBuilder';
import * as calculations from '../../views/lifestyle/business/greenlightCalculations';
import * as validation from '../../views/lifestyle/business/greenlightValidation';
import * as utils from '../../views/lifestyle/business/greenlightUtils';
import * as buzz from '../../views/lifestyle/business/greenlightBuzz';
import * as originals from '../../services/streamingOriginals';
import * as investors from '../../services/projectInvestors';
import * as exposure from '../../services/boxOffice/boxOfficeExposureAdapters';
import * as marketing from '../../services/marketingStrategy';
import * as music from '../../services/musicIndustry';
import * as regions from '../../services/regionMap';
import * as chains from '../../services/cinemaChains';
import * as background from '../../services/livingEnsemble';
import {getCinemaProjectFinance} from '../../services/boxOffice/boxOfficeSettlement';
import {NPC_DATABASE,getAvailableTalent,isCastableActor} from '../../services/npcLogic';
import {getAbsoluteWeek,getInheritedStudioProjects} from '../../services/legacyLogic';
import {PHASE_ONE_ENERGY_COSTS} from '../../services/energyCosts';

export const OWNED_UI_SOURCES=[
 'views/lifestyle/business/ProductionWizard.tsx','views/lifestyle/business/DevelopmentLab.tsx',
 'views/lifestyle/business/components/DevelopmentLabScriptWizard.tsx','views/lifestyle/business/GreenlightWizard.tsx',
 'views/lifestyle/business/ReleaseWizard.tsx','views/lifestyle/business/components/GreenlightEquipmentStep.tsx',
 'views/lifestyle/business/ProductionHouseGame.tsx','views/lifestyle/business/components/SequelSetupModal.tsx',
];
const ts=createRequire(process.cwd()+'/package.json')('typescript');
const snapshot=process.env.OWNED_UI_SOURCE_SNAPSHOT?JSON.parse(readFileSync(process.env.OWNED_UI_SOURCE_SNAPSHOT,'utf8')):null;
const sources=new Map(OWNED_UI_SOURCES.map(file=>[file,snapshot?.[file]||readFileSync(file,'utf8')]));
export const ownedUiSourceHashes=Object.fromEntries([...sources].map(([file,source])=>[file,createHash('sha256').update(source as string).digest('hex')]));
const parsed=new Map<string,Map<string,string>>();
for(const[file,text]of sources){
 const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found=new Map<string,string>();
 const visit=(node:any)=>{
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer){
   const init=node.initializer;
   found.set(node.name.text,ts.isCallExpression(init)&&init.expression.getText(ast)==='useMemo'?'('+init.arguments[0].getText(ast)+')()':init.getText(ast));
  }
  if(ts.isJsxAttribute(node)&&node.name.getText(ast)==='onAssign'&&node.initializer?.expression)found.set('assignWriter',node.initializer.expression.getText(ast));
  ts.forEachChild(node,visit);
 };visit(ast);parsed.set(file,found);
}
const shared:Record<string,any>={...sequels,...participation,...scriptFinance,...business,...premium,...role,...universe,...identity,...genreCatalog,...storyFit,...concept,...scriptTemplates,...treasury,
 ...productionEconomy,...directorConnections,...productionCalendar,...location,...crew,...talent,...talentCareer,...talentBookings,...projectBuilder,...calculations,
 ...validation,...utils,...buzz,...originals,...investors,...exposure,...marketing,...music,...regions,...chains,...background,
 getAbsoluteWeek,getInheritedStudioProjects,PHASE_ONE_ENERGY_COSTS,NPC_DATABASE,getAvailableTalent,isCastableActor,
 useMemo:(fn:()=>unknown)=>fn(),tr:(key:string)=>key,
};
const evaluate=(file:string,name:string,context:Record<string,any>)=>{
 const initializer=parsed.get(file)?.get(name);assert.ok(initializer,'Source UI value missing: '+name);
 const env={...shared,...context};delete (env as any).default;
 const code=ts.transpileModule('return ('+initializer+');',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function(...Object.keys(env),code)(...Object.values(env));
};
const file=(name:string)=>'views/lifestyle/business/'+name;
const studioOf=(p:Player,id:string)=>{const studio=p.businesses.find(b=>b.id===id);assert.ok(studio?.studioState);return studio;};

export const foundEarnedStudio=(p:Player,amount:number,options:{name?:string;specialty?:string}={})=>{
 const cost=50_000_000,name=options.name||'Atlas Pictures',head=business.HEAD_OF_PRODUCTION_CANDIDATES.find(c=>c.specialty===(options.specialty||'CREATIVE'))!.id;
 assert.ok(p.money>=cost+amount&&p.energy.current>=PHASE_ONE_ENERGY_COSTS.PRODUCTION_HOUSE_SIGNING,'Cash and signing energy are required');
 let current=p;
 evaluate(file('ProductionWizard.tsx'),'handleLaunchLogic',{player:p,COST:cost,name,headOfProd:head,
  signingEnergyCost:PHASE_ONE_ENERGY_COSTS.PRODUCTION_HOUSE_SIGNING,
  getHeadOfProductionName:()=>head,setIsAnimating:()=>{},setTimeout:(fn:()=>void)=>fn(),onComplete:()=>{},onUpdatePlayer:(v:Player)=>{current=v;}})();
 const added=current.businesses.find(b=>!p.businesses.some(old=>old.id===b.id));assert.ok(added?.studioState);
 assert.equal(current.money,p.money-cost);
 const personalBefore=current.money,balanceBefore=added.balance;
 const transfer=treasury.performStudioTreasuryTransfer({player:current,studioId:added.id,action:'INJECT',counterparty:'PERSONAL',amount});
 assert.ok(transfer.success,transfer.reason);current=transfer.player;
 assert.equal(current.money,personalBefore-amount);assert.equal(studioOf(current,added.id).balance,balanceBefore+amount);
 return {player:current,studioId:added.id,incorporationCost:cost,initialOperatingBalance:balanceBefore,transferredEarnedCash:amount};
};

export const developRealConcept=(p:Player,studioId:string,title:string,genre:'DRAMA'|'FANTASY',weak=false)=>{
 const studio=studioOf(p,studioId),studioState=studio.studioState!;
 const source=file('components/DevelopmentLabScriptWizard.tsx'),env:Record<string,any>={};
 env.getFormatQuestions=evaluate(source,'getFormatQuestions',env);env.getSubjectQuestions=evaluate(source,'getSubjectQuestions',env);
 const questions=evaluate(source,'getScriptQuestions',env)(genre,'LIVE_ACTION','','PUBLIC_FIGURE');
 const selectedScriptOptions=questions.map((q:any)=>({questionId:q.id,choiceId:q.options[0].id}));
 const attributes=concept.calculateConceptAttributes(genre,'LIVE_ACTION','PUBLIC_FIGURE',selectedScriptOptions,false);
 const quality=concept.calculateConceptQuality(attributes),premise=genre==='FANTASY'?'A cartographer must reunite rival cities before a living storm erases their world.':'A family must rebuild its local cinema after a flood threatens their town.';
 const script:Script=evaluate(source,'buildScript',{initialScript:undefined,title,projectType:'MOVIE',format:'LIVE_ACTION',targetAudience:'PG-13',episodes:8,
  primaryGenre:genre,secondaryGenre:'',previewQuality:quality,selectedScriptOptions,finalPremise:premise,
  previewStoryCompass:identity.inferStoryCompass({genres:[genre],logline:premise,options:selectedScriptOptions,isOriginal:true},'SCRIPT_DNA'),
  needsSubject:false,subjectName:'',subjectType:'PUBLIC_FIGURE',previewAttributes:attributes})();
 assert.equal(script.status,'CONCEPT');assert.equal(script.developmentCost,0);
 let current={...p,businesses:p.businesses.map(b=>b.id===studioId?{...b,studioState:{...studioState,scripts:[...studioState.scripts,{...script,createdAtWeek:p.currentWeek}]}}:b)};
 const updated=studioOf(current,studioId),writer=[...updated.studioState!.writers].filter(w=>w.fee<=updated.balance*.05).sort((a,b)=>(weak?a.skill-b.skill:b.skill-a.skill)||a.fee-b.fee)[0];assert.ok(writer,'An actual affordable writer listing is required');
 evaluate(file('DevelopmentLab.tsx'),'assignWriter',{player:current,studio:updated,studioState:updated.studioState,onUpdatePlayer:(v:Player)=>{current=v;}})(script.id,writer.id,writer.fee,writer.skill,writer.speed);
 const assigned=studioOf(current,studioId).studioState!.scripts.find(s=>s.id===script.id)!;
 assert.equal(assigned.status,'IN_DEVELOPMENT');assert.equal(updated.balance-studioOf(current,studioId).balance,writer.fee);
 return {player:current,scriptId:script.id,writer:{id:writer.id,name:writer.name,fee:writer.fee,skill:writer.skill},developmentWeeks:assigned.totalDevelopmentWeeks,conceptQuality:quality};
};

export const greenlightRealPackage=async(p:Player,studioId:string,scriptId:string,scale:'SMALL'|'GLOBAL'|'EPIC'|'WEAK_WIDE'|'SMALL_WIDE')=>{
 const studio=studioOf(p,studioId),script=studio.studioState!.scripts.find(s=>s.id===scriptId);assert.ok(script?.status==='READY');
 const source=file('GreenlightWizard.tsx'),epic=scale==='EPIC',weak=scale==='WEAK_WIDE',smallWide=scale==='SMALL_WIDE',global=scale==='GLOBAL'||scale==='EPIC',abs=getAbsoluteWeek(p.age,p.currentWeek);
 const crewMarket={cinematographers:crew.getRotatingCrewCandidates('CINEMATOGRAPHER',p.age,p.currentWeek),composers:crew.getRotatingCrewCandidates('COMPOSER',p.age,p.currentWeek),
  producers:crew.getRotatingCrewCandidates('LINE_PRODUCER',p.age,p.currentWeek),vfxTeams:crew.getRotatingCrewCandidates('VFX_SUPERVISOR',p.age,p.currentWeek)};
 const env:Record<string,any>={player:p,studio,selectedScript:script,selectedScriptId:script.id,crewMarket,
  selectedCrew:{director:null,cinematographer:null,composer:null,lineProducer:null,vfx:null},crewModes:{director:'HIRE',cinematographer:'HIRE',composer:'HIRE',lineProducer:'HIRE',vfx:'HIRE'},
  currentReturningTalent:script.returningTalent||[],selectedLocations:epic?[...location.PRODUCTION_LOCATION_CATALOG].sort((a,b)=>b.quality-a.quality||a.id.localeCompare(b.id)).slice(0,3).map(l=>l.id):[global&&!weak?'LA':'ATL'],castList:[],contractedActors:[],playerActingTalent:role.getActorTalent(p.stats.skills),
  equipmentChoices:{cameras:global?'TIER_5':'TIER_2',lighting:global?'TIER_5':'TIER_2',sound:global?'TIER_5':'TIER_2',practical:global?'TIER_5':'TIER_2'},
  selectedUniverseId:null,selectedFranchiseId:script.franchiseId||null,newUniverseName:'',previousFranchiseInstallments:[],effectiveConnectedIntent:'SOLO',studioPrestigeScore:0,tone:50,
  linkedUniverseCastCount:0,studioFranchises:[],visualStyle:'REALISTIC',pacing:'MODERATE',lockedStreamingFunding:null,isPrimaryStudio:false,studioTalentRoster:[],
  selectedMusicPlan:undefined,musicPreviewProject:null,effectiveMusicStrategy:'COMPOSER_ONLY',selectedMusicArtistIds:[],effectiveMusicArtistCount:0,
  activeMusicCreditRoles:[],isStudioDecidedMusicPlan:true,musicCatalogArtists:[],selectedInvestorPlan:undefined,talentBackendDraft:{},musicBudget:0,
 };
 env.isPrimaryStudio=treasury.getStudioGroup(p).parentStudio?.id===studio.id;
 env.crewMarketAbsoluteWeek=crew.getCrewMarketAbsoluteWeek(p.age,p.currentWeek);env.crewMarketCycle=crew.getCrewMarketCycle(p.age,p.currentWeek);
 env.directorCandidatePool=[...NPC_DATABASE,...(p.flags.extraNPCs||[])];env.actorCandidatePool=env.directorCandidatePool;
 env.connectedDirectorCandidates=directorConnections.getConnectedDirectorCandidates(p.relationships||[],env.directorCandidatePool);
 env.previousFranchiseInstallments=evaluate(source,'previousFranchiseInstallments',env);
 env.studioFranchises=evaluate(source,'studioFranchises',env);
 env.linkedCharacterOptions=[];env.previousCharacterOptions=[];env.legacyCharacterOptions=[];env.activeUniverseCharacterOptions=[];
 env.availableDirectors=evaluate(source,'availableDirectors',env);env.availableActors=evaluate(source,'availableActors',env);
 const availableDirectors=env.availableDirectors,availableActors=env.availableActors;
 env.studioPrestigeScore=evaluate(source,'studioPrestigeScore',env);
 env.GEAR_TIERS=evaluate(file('components/GreenlightEquipmentStep.tsx'),'GREENLIGHT_GEAR_TIERS',{});
 const gearCategories=evaluate(file('components/GreenlightEquipmentStep.tsx'),'GEAR_CATEGORIES',{});
 env.equipmentChoices=Object.fromEntries(gearCategories.map((category:any)=>[category.id,global&&!weak?'TIER_5':smallWide?'TIER_3':'TIER_2']));
 if(weak)for(const key of Object.keys(env.crewModes))env.crewModes[key]='IN_HOUSE';
 for(const name of ['getInHouseQuality','getInHouseFame','getInHouseLevel','findLocation','getDefaultCharacterName','getCrewData','calculateActorSalary'])env[name]=evaluate(source,name,env);
 const rank=(list:any[],stateKey:string)=>list.filter(candidate=>!env.currentReturningTalent.some((t:any)=>t.id===candidate.id&&!t.accepted)).map(candidate=>{env.selectedCrew[stateKey]=candidate.id;return{candidate,quote:env.getCrewData(stateKey)};})
  .filter(row=>row.quote.cost>0&&(global||row.quote.cost<=(smallWide?6_000_000:3_000_000))).sort((a,b)=>b.quote.quality-a.quote.quality||a.quote.cost-b.quote.cost)[0]?.candidate;
 if(!weak){
 const director=rank(availableDirectors,'director');if(!director)return {player:p,waiting:'No current affordable director listing'};env.selectedCrew.director=director.id;
 for(const[key,list]of Object.entries({cinematographer:crewMarket.cinematographers,composer:crewMarket.composers,lineProducer:crewMarket.producers,vfx:crewMarket.vfxTeams})){
  const hired=rank(list,key);if(!hired)return {player:p,waiting:'No current affordable crew listing: '+key};env.selectedCrew[key]=hired.id;
 }}
 const target=weak||smallWide?3:epic?7:global?6:2;
 const chosen=[...availableActors].filter(a=>!env.currentReturningTalent.some((t:any)=>t.id===a.id&&!t.accepted)).filter(a=>!smallWide||(a.stats?.fame||0)<=50).filter(a=>global||env.calculateActorSalary(a,'SUPPORTING')<=1_000_000)
  .sort((a,b)=>weak?((a.stats?.talent||0)-(b.stats?.talent||0)||(a.stats?.fame||0)-(b.stats?.fame||0)):
   epic?((b.stats?.fame||0)-(a.stats?.fame||0)||(b.stats?.talent||0)-(a.stats?.talent||0)):
   ((b.stats?.talent||0)-(a.stats?.talent||0)||(b.stats?.fame||0)-(a.stats?.fame||0))).slice(0,target);
 if(chosen.length!==target)return {player:p,waiting:'Not enough current actor listings'};
 env.selectedStoryCompass=evaluate(source,'selectedStoryCompass',env);
 if(!weak&&!smallWide){
 const priorHero=(studio.studioState!.concepts.find(c=>c.scriptId===script.id)?.castList||[]).find((c:any)=>c.actorId==='PLAYER_SELF');
 env.castList.push({...identity.suggestCharacterIdentity(env.selectedStoryCompass,'LEAD',0,script),
  id:'owned-lead',role:'LEAD',roleType:'LEAD',actorId:'PLAYER_SELF',actorName:p.name,salary:0,...(priorHero||{})});
 }
 chosen.forEach((actor,i)=>{const roleType=(weak||smallWide?i===0:epic&&i<2)?'LEAD':'SUPPORTING';
  env.castList.push({...identity.suggestCharacterIdentity(env.selectedStoryCompass,roleType,i+1,script),
   id:'owned-support-'+i,role:roleType,roleType,actorId:actor.id,actorName:actor.name,salary:env.calculateActorSalary(actor,roleType)});
 });
 env.getCastableActorById=(id:string)=>[...NPC_DATABASE,...(p.flags.extraNPCs||[])].find(n=>n.id===id&&isCastableActor(n));
 env.backgroundCastingPlan=background.buildBackgroundCastingPlan(evaluate(source,'backgroundCastingContext',env),global?{scale:'EPIC'}:{});
 env.budgetBreakdown=evaluate(source,'budgetBreakdown',env);env.currentEstimatedBudget=env.budgetBreakdown.total;
 env.currentCastingStrength=evaluate(source,'currentCastingStrength',env);env.liveCharacterStoryFit=evaluate(source,'liveCharacterStoryFit',env);
 env.currentEstimatedQuality=evaluate(source,'currentEstimatedQuality',env);env.currentEstimatedBuzz=evaluate(source,'currentEstimatedBuzz',env);
 env.reservedMarketingBudget=weak?0:Math.floor(env.budgetBreakdown.total*(epic ? .65 : global ? .35 : smallWide ? .2 : .12));
 if(epic){
  const parent=env.previousFranchiseInstallments[0];assert.ok(parent,'An epic continuation needs an actual released predecessor');
  const earnedProfit=getCinemaProjectFinance(parent).netProfitCents/100;
  const allowable=calculations.calculateMaxGreenlightMarketingBudget(Math.min(studio.balance,earnedProfit*.9),env.budgetBreakdown.total,0);
  env.reservedMarketingBudget=Math.min(env.reservedMarketingBudget,allowable);
  assert.ok(env.budgetBreakdown.total+env.reservedMarketingBudget<=earnedProfit,'The epic must fit inside the already collected predecessor profit');
 }
 env.effectiveStudioFundingPool=studio.balance;env.netGreenlightCashRequirement=env.budgetBreakdown.total+env.reservedMarketingBudget-scriptFinance.getPrepaidScriptDevelopmentCash(script,studio.id);
 env.greenlightEnergyCost=PHASE_ONE_ENERGY_COSTS.GREENLIGHT_OWNED_PROJECT;env.unresolvedReturningTalent=[];env.selectedTalentConflictNames=[];
 const chosenIds=new Set([...env.castList.map((c:any)=>c.actorId),...Object.values(env.selectedCrew)]);
 assert.ok(!env.currentReturningTalent.some((t:any)=>!t.accepted&&chosenIds.has(t.id)),'Unaccepted returning terms cannot be bypassed; this policy recasts those parts');
 env.greenlightStatus=evaluate(source,'greenlightStatus',env);assert.ok(env.greenlightStatus.can,JSON.stringify(env.greenlightStatus.errors));
 env.commissionBudgetError=null;env.participationError=null;env.canGreenlight=evaluate(source,'canGreenlight',env);
 let current=p;
 const noop=()=>{};Object.assign(env,{platformCommissionOffer:undefined,step:'CONFIRM',language:'en',setIsProcessingAd:noop,setBuzzItems:noop,setStep:noop,
  addBreadcrumb:noop,markGameCheckpoint:noop,markTraceAction:noop,setCrashContext:noop,startPerformanceTrace:noop,stopPerformanceTrace:noop,trackGameEvent:noop,
  hasNoAds:()=>false,showAd:async()=>{},onUpdatePlayer:(v:Player)=>{current=v;}});
 await evaluate(source,'handleGreenlight',env)();
 const commitment=current.commitments.find(c=>!p.commitments.some(old=>old.id===c.id));assert.ok(commitment?.projectDetails);assert.notEqual(commitment.projectPhase,'AWAITING_RELEASE');
 assert.equal(Math.round(studio.balance-studioOf(current,studioId).balance),Math.round(env.netGreenlightCashRequirement));
 return {player:current,id:commitment.id,quote:{scale,scriptQuality:script.quality,casting:env.currentCastingStrength,estimatedQuality:env.currentEstimatedQuality,
  budget:env.budgetBreakdown,reservedCampaign:env.reservedMarketingBudget,cast:env.castList,director:env.getCrewData('director'),crew:Object.keys(env.selectedCrew).map(key=>({role:key,...env.getCrewData(key)}))}};
};

export const releaseRealPackage=(p:Player,studioId:string,id:string,wide:boolean)=>{
 const studio=studioOf(p,studioId),project=p.commitments.find(c=>c.id===id);assert.ok(project?.projectDetails);
 assert.equal(project.projectPhase,'AWAITING_RELEASE');const details=project.projectDetails;
 const reserve=Number(details.reservedMarketingBudget||details.marketingBudgetRemaining||0);
 const normalizedChannelMix=marketing.normalizeMarketingChannelAllocations({TRAILER_LAUNCH:reserve*.3,SOCIAL_DIGITAL:reserve*.3,TV_OUTDOOR:reserve*.2,INTERNATIONAL:reserve*.2},reserve);
 const env:Record<string,any>={player:p,studio,project,releaseType:'THEATRICAL',releaseWeek:p.currentWeek,lockedPremiereAbsoluteWeek:null,festivalPremiere:null,FESTIVALS:[],
  completionStartedRef:{current:false},releaseDraftClearedRef:{current:false},hasReleaseStrategyEnergy:p.energy.current>=PHASE_ONE_ENERGY_COSTS.RELEASE_STRATEGY_LOCK,
  releaseStrategyEnergyCost:PHASE_ONE_ENERGY_COSTS.RELEASE_STRATEGY_LOCK,normalizedChannelMix,totalCampaignCost:normalizedChannelMix.totalSpent,hasReservedMarketingPool:reserve>0,
  campaignBudgetRemaining:normalizedChannelMix.remaining,campaignPositioning:wide?'MASS_EVENT':'SLEEPER_BUILD',campaignTimeline:'BALANCED_ROLLOUT',
  effectiveScreeningStrategy:wide?'INTERNATIONAL':'REGIONAL',normalizedSelectedRegionIds:regions.getDefaultReleaseRegionIds(wide?'INTERNATIONAL':'REGIONAL'),
  normalizedDistributionChainSelections:{},activeCampaignChannels:marketing.MARKETING_CHANNEL_OPTIONS.filter(c=>(normalizedChannelMix.allocations[c.id]||0)>0),
  musicImpact:music.calculateProjectMusicImpact(details,details.musicPlan),language:'en',onComplete:()=>{},onUpdatePlayer:(v:Player)=>{current=v;}};
 env.distributionChainSelections={};env.getRecommendedDistributionChainIds=evaluate(file('ReleaseWizard.tsx'),'getRecommendedDistributionChainIds',env);
 env.normalizedDistributionChainSelections=evaluate(file('ReleaseWizard.tsx'),'normalizedDistributionChainSelections',env);
 env.campaignFit=marketing.calculateCampaignFit(details,env.campaignPositioning,env.totalCampaignCost);
 env.campaignForecast=marketing.calculateCampaignForecast(details,env.campaignPositioning,env.normalizedChannelMix.allocations,env.campaignFit,env.campaignTimeline);
 env.campaignReachPreview=productionEconomy.calculateCampaignReachProfile({productionBudget:details.estimatedBudget||0,marketingSpend:env.totalCampaignCost,rawHype:details.hiddenStats?.rawHype,fameMultiplier:details.hiddenStats?.fameMultiplier,distributionPower:details.hiddenStats?.distributionPower});
 let current=p;assert.ok(env.hasReleaseStrategyEnergy);evaluate(file('ReleaseWizard.tsx'),'handleComplete',env)();
 assert.ok(current.commitments.find(c=>c.id===id)?.projectDetails?.releaseRegionIds?.length);
 return {player:current,campaignSpent:env.totalCampaignCost,reservedCampaign:reserve,campaignReturned:Number(current.commitments.find(c=>c.id===id)?.projectDetails?.returnedMarketingBudget||0)};
};

export const quoteOwnedDirector=(p:Player,candidate:any)=>{
 const source=file('GreenlightWizard.tsx'),env:Record<string,any>={player:p,studio:{studioState:{departments:{}}},crewModes:{director:'HIRE'},selectedCrew:{director:candidate.id},currentReturningTalent:[],availableDirectors:[candidate],crewMarket:{}};
 return evaluate(source,'getCrewData',env)('director');
};


export const developActualSequel=(p:Player,studioId:string,parentId:string)=>{
 const studio=studioOf(p,studioId),project=p.pastProjects.find(r=>r.id===parentId)||p.activeReleases.find(r=>r.id===parentId);assert.ok(project);
 const source=file('ProductionHouseGame.tsx');let setup:any=null,current=p;
 const context={player:p,studio,setSequelSetupProject:(value:any)=>{setup=value;},setSelectedProjectDashboard:()=>{},setView:()=>{},onUpdatePlayer:(value:Player)=>{current=value;}};
 evaluate(source,'handleMakeSequel',context)(project);assert.ok(setup,'The actual continuation eligibility gate must allow this owned released film');
 const writer=[...studio.studioState!.writers].filter(w=>w.fee<=studio.balance*.05).sort((a,b)=>b.skill-a.skill||a.fee-b.fee)[0];assert.ok(writer&&studio.balance>=writer.fee);
 const beforeIds=new Set(studio.studioState!.scripts.map(s=>s.id));
 evaluate(source,'handleStartWritingSequel',{...context,sequelSetupProject:setup})(writer,'The Last Atlas 2',false,'MOVIE');
 const script=studioOf(current,studioId).studioState!.scripts.find(s=>!beforeIds.has(s.id));assert.ok(script?.status==='IN_DEVELOPMENT');
 assert.equal(studio.balance-studioOf(current,studioId).balance,writer.fee);assert.equal(script.franchiseId,parentId);
 return {player:current,scriptId:script.id,writer:{id:writer.id,name:writer.name,fee:writer.fee,skill:writer.skill},developmentWeeks:script.totalDevelopmentWeeks,conceptQuality:script.baseQuality,predecessorId:parentId};
};

/** Read the actual preview memos without rendering; this does not fund a project. */
export const quoteOwnedFundingPreview=(context:{availableGreenlightFunds:number;prepaidDevelopmentCash:number;isPlayerPlatformCommission:boolean;budgetBreakdown:{total:number};musicBudget:number;unpaidPackageBudget:number;lockedStreamingFundingAmount:number;investorRaiseAmount:number})=>{
 const source=file('GreenlightWizard.tsx');
 return Object.fromEntries(['maxMarketingBudget','maxInvestorRaise','normalizedInvestorRaise'].map(name=>[name,evaluate(source,name,context)]));
};
