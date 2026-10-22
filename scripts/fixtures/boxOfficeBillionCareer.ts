import assert from 'node:assert/strict';
import type { Commitment, Genre, Player, ProjectDetails } from '../../types';
import { createBusiness } from '../../services/businessLogic';
import { NPC_DATABASE, isCastableActor } from '../../services/npcLogic';
import { BOX_OFFICE_REGIONS, CINEMA_CHAINS } from '../../services/cinemaChains';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { migratePlayerSave } from '../../services/saveMigration';
import { prepareGreenlightFunding } from '../../views/lifestyle/business/greenlightProjectBuilder';
import { calculateCinemaCraftQuality } from '../../services/boxOffice/boxOfficeDelivery';
import { commitCinemaReleaseExposure, prepareCinemaPackageExposure } from '../../services/boxOffice/boxOfficeExposureAdapters';
import { makeCinemaFixture } from './boxOfficeScenarios';

export const BILLION_STUDIO_ID='billion-career-studio';
export const BILLION_UNIVERSE_ID='billion-career-universe';
export const billionCareerCast=()=>NPC_DATABASE.filter(actor=>isCastableActor(actor)).sort((a,b)=>b.stats.fame-a.stats.fame||a.id.localeCompare(b.id)).slice(0,8);

/** An explicit funded, established-owner test save. No historical gross or audience is granted. */
export const makeBillionCareer=():Player=>{
    const {player}=makeCinemaFixture(20261023);
    player.id='billion-career';player.name='Cinema Career';player.money=1_000_000;
    player.commitments=[];player.activeReleases=[];player.pastProjects=[];
    player.pendingEvents=[];player.scheduledEvents=[];
    const studio=createBusiness('Cinema Career Studio','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',player.currentWeek,player.age);
    studio.id=BILLION_STUDIO_ID;studio.balance=3_000_000_000;
    player.businesses=[studio];
    return migratePlayerSave(player);
};

export interface BillionFilm {
    id:string;budget:number;campaign:number;quality:number;estimatedQuality:number;
    castIndices:number[];universe?:boolean;wide?:boolean;genre?:Genre;
}

/** Prepared completed craft, with real catalogue cast and funded confirmation. The game creates the release. */
export const queueBillionFilm=(source:Player,film:BillionFilm):Player=>{
    const player=structuredClone(source),studio=player.businesses.find(b=>b.id===BILLION_STUDIO_ID)!;
    const {project:base}=makeCinemaFixture(20261023),cast=billionCareerCast();
    const regions=film.wide===false?BOX_OFFICE_REGIONS.filter(r=>r.id==='NORTH_AMERICA'):BOX_OFFICE_REGIONS;
    const quality=calculateCinemaCraftQuality({scriptQuality:film.quality,directorQuality:film.quality,castingStrength:film.quality,
        crewQualities:[film.quality,film.quality],equipmentQualityLevels:[0,0,0,0],locationQualities:[5],storyFitQualityAdjustment:0,
        backgroundAuthenticity:50,backgroundReliability:50,backgroundSetCare:50});
    let project:ProjectDetails={...base,title:film.id,studioId:studio.id,genre:film.genre||(film.castIndices.length?'SUPERHERO':'DRAMA'),
        estimatedBudget:film.budget,budgetTier:film.budget>=150e6?'BLOCKBUSTER':film.budget>=30e6?'HIGH':'LOW',
        originalLanguageId:'english',castPackageSource:'AUTHORED',
        universeId:film.universe?BILLION_UNIVERSE_ID:undefined,
        castList:film.castIndices.map((index)=>{const actor=cast[index];assert.ok(actor);return {id:actor.id,actorId:actor.id,name:actor.name,
            role:'Ensemble',roleType:film.castIndices.length>2?'ENSEMBLE':'LEAD',type:'ACTOR',isPlayer:false,image:'',characterId:`career-hero-${index}`}}),
        screeningStrategy:film.wide===false?'REGIONAL':'INTERNATIONAL',releaseStrategy:'THEATRICAL',
        releaseRegionIds:regions.map(r=>r.id),releaseChainSelections:Object.fromEntries(regions.map(r=>[r.id,film.wide===false?['NOVA_CIRCUIT','ARCLIGHT_GRID']:CINEMA_CHAINS.map(c=>c.id)])),
        hiddenStats:{...base.hiddenStats,qualityScore:quality,estimatedQualityScore:film.estimatedQuality,scriptQuality:film.quality,directorQuality:film.quality,castingStrength:film.quality},
        marketingBudgetSpent:film.campaign,marketingChannelAllocations:{SOCIAL_DIGITAL:film.campaign}};
    project.cinemaExposure=prepareCinemaPackageExposure({player,project,titleId:film.id,storyAttention:80,musicAttention:0});
    const commitment:Commitment={id:film.id,name:film.id,type:'ACTING_GIG',roleType:'LEAD',energyCost:0,income:0,lumpSum:0,payoutType:'LUMPSUM',
        projectPhase:'AWAITING_RELEASE',phaseWeeksLeft:0,totalPhaseDuration:0,productionPerformance:film.quality,auditionPerformance:100,projectDetails:project};
    const funding=prepareGreenlightFunding({player,studio,studioCashRequirement:film.budget,newCommitment:commitment,
        finalInvestorRaised:0,greenlightPackageBudget:film.budget,isCreatingNewUniverse:!!film.universe&&!player.world.universes?.[BILLION_UNIVERSE_ID],
        normalizedWorldUniverses:player.world.universes||{},finalUniverseId:film.universe?BILLION_UNIVERSE_ID:undefined,newUniverseName:'Cinema Career Universe',randomUniverseColor:'#2288aa'});
    assert.equal(Math.round((studio.balance-funding.newStudioBalance)*100),Math.round(film.budget*100));
    assert.ok(funding.newStudioBalance>=film.campaign,'The actual campaign must be affordable');
    studio.balance=funding.newStudioBalance-film.campaign;
    studio.studioState!.productionFund=funding.newProductionFund;
    studio.studioState!.financeLedger=[...(studio.studioState!.financeLedger||[]),
        {id:`fund:${film.id}`,week:player.currentWeek,year:player.age,amount:-film.budget,type:'PRODUCTION_SPEND',label:'Funded production',projectId:film.id},
        {id:`campaign:${film.id}`,week:player.currentWeek,year:player.age,amount:-film.campaign,type:'PRODUCTION_SPEND',label:'Paid campaign',projectId:film.id}];
    project=commitCinemaReleaseExposure({player,project:funding.fundedCommitment.projectDetails!,titleId:film.id,
        absoluteWeek:getAbsoluteWeek(player.age,player.currentWeek),allocations:{SOCIAL_DIGITAL:film.campaign}});
    player.world.universes=funding.updatedWorldUniverses;player.world.platforms=funding.updatedWorldPlatforms;
    player.commitments.push({...funding.fundedCommitment,projectDetails:project});
    return player;
};
