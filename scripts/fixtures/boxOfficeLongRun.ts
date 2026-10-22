import { INITIAL_PLAYER,type Player,type ActiveRelease,type Commitment } from '../../types';
import { makeCinemaFixture } from './boxOfficeScenarios';
import { createBusiness } from '../../services/businessLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { migratePlayerSave } from '../../services/saveMigration';
import { prepareGreenlightFunding } from '../../views/lifestyle/business/greenlightProjectBuilder';
import { commitCinemaReleaseExposure } from '../../services/boxOffice/boxOfficeExposureAdapters';
export const LONG_SAVE_CASES=['founder-small','established-studio','offered-universe','legacy-active','ordinary-starter','late-handoff'] as const;
export type LongSaveCase=typeof LONG_SAVE_CASES[number];
/** Prepared saves are explicit; ordinary-starter retains $2,000, skills and fame from INITIAL_PLAYER. */
export const makeCinemaLongSave=(name:LongSaveCase,starterStyle='sustainable'):Player=>{
 const f=name==='ordinary-starter'?undefined:makeCinemaFixture(607),player=name==='ordinary-starter'?structuredClone(INITIAL_PLAYER):f!.player;
 player.id=`phase6-${name}`;player.name='Phase 6 '+name;player.commitments=[];player.activeReleases=[];player.pendingEvents=[];player.scheduledEvents=[];player.world.projects=[];
 // Fresh careers wait for the real weekly job/role refresh, just like the App.
 if(name==='ordinary-starter')return migratePlayerSave(player);
 const week=getAbsoluteWeek(player.age,player.currentWeek),owned=['founder-small','established-studio'].includes(name);
 const budget=name==='founder-small'?500_000:50e6;
 const studio=owned?createBusiness('Phase 6 Studio','PRODUCTION_HOUSE',name==='founder-small'?'INDIE_STUDIO':'MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',player.currentWeek,player.age):undefined;
 if(studio){studio.balance=name==='founder-small'?3e6:300e6;player.businesses=[studio]}
 const project={...f!.project,studioId:studio?.id||'UNIVERSAL',estimatedBudget:budget,genre:'DRAMA' as const,originalLanguageId:'english',releaseRegionIds:['NORTH_AMERICA' as const],releaseChainSelections:{NORTH_AMERICA:['NOVA_CIRCUIT' as const]},castPackageSource:'AUTHORED' as const,castList:[{id:'PLAYER_SELF',actorId:'PLAYER_SELF',name:player.name,type:'ACTOR' as const,role:'Lead',roleType:'LEAD' as const,isPlayer:true,image:''}],hiddenStats:{...f!.project.hiddenStats,estimatedQualityScore:75,qualityScore:80},marketingBudgetSpent:owned?50_000:0,marketingChannelAllocations:owned?{SOCIAL_DIGITAL:50_000}:{}};
 if(name==='offered-universe'){project.universeId='phase6-universe';player.activeUniverseContract={universeId:project.universeId} as any}
 if(owned){
  const commitment={id:'long-film',name:'Self-funded film',type:'ACTING_GIG',roleType:'LEAD',energyCost:0,income:0,lumpSum:0,payoutType:'LUMPSUM',projectPhase:'PRE_PRODUCTION',phaseWeeksLeft:2,totalPhaseDuration:2,auditionPerformance:100,productionPerformance:50,projectDetails:project} as Commitment;
  const funding=prepareGreenlightFunding({player,studio:studio!,studioCashRequirement:budget,newCommitment:commitment,finalInvestorRaised:0,greenlightPackageBudget:budget,isCreatingNewUniverse:false,normalizedWorldUniverses:{},newUniverseName:'',randomUniverseColor:'#fff'});
  studio!.balance=funding.newStudioBalance;player.commitments=[funding.fundedCommitment];
 }else{
  player.activeReleases=[{id:'long-film',name:'Offered film',type:'MOVIE',roleType:'LEAD',projectDetails:project,weekNum:name==='late-handoff'?201:name==='legacy-active'?5:1,weeklyGross:name==='legacy-active'?[50e6,40e6,30e6,30e6]:[],totalGross:name==='legacy-active'?150e6:0,budget,status:'RUNNING',productionPerformance:80,imdbRating:8,distributionPhase:'THEATRICAL',releasedAtAbsoluteWeek:week-(name==='late-handoff'?200:name==='legacy-active'?4:0),royaltyPercentage:1,sequelDecisionMade:true} as ActiveRelease];
  if(name!=='legacy-active')player.activeReleases[0].projectDetails=commitCinemaReleaseExposure({player,project:{...project,marketingBudgetSpent:1e6},titleId:'long-film',absoluteWeek:week,allocations:{SOCIAL_DIGITAL:1e6}});
 }
 return migratePlayerSave(player);
};
