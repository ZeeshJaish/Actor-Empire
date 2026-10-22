import { createWorldPopulationState } from '../../services/worldEconomy/worldPopulation';
import { createWorldAudienceEconomyState } from '../../services/worldEconomy/worldAudienceCohorts';
import { createWorldAudienceParticipationState } from '../../services/worldEconomy/worldAudienceParticipation';
import { createWorldStreamingCompetitionState } from '../../services/worldEconomy/worldStreamingCompetition';
import { createWorldStreamingCustomerState } from '../../services/worldEconomy/worldStreamingCustomers';
import { createWorldStreamingViewingState } from '../../services/worldEconomy/worldStreamingViewing';
import { readCinemaWorldAudience } from '../../services/boxOffice/boxOfficeAudienceAdapters';
import { getCinemaRecognitionShare } from '../../services/boxOffice/boxOfficeAwareness';
import { CINEMA_CHAINS } from '../../services/cinemaChains';
import { CINEMA_MARKET_TUNING_VERSION } from '../../services/boxOffice/boxOfficeProfiles';
import { createDeterministicRng } from '../../services/deterministicRandom';
import { makeCinemaFixture, makeCinemaMarketFixture } from './boxOfficeScenarios';
import type { CinemaTitleInput, CinemaWeekInput } from '../../services/boxOffice/boxOfficeTypes';

export const FULL_WORLD_CASES=['unknown-local','unknown-worldwide','focused-small','wide-small','weak-small','sleeper','local-language','weak-stars','strong-stars','earned-event','unearned-event','weak-event','quiet-release','honest-campaign','misleading-campaign','no-home-access','early-streaming','recession','peak-release'] as const;
export type FullWorldCase=typeof FULL_WORLD_CASES[number];
export const FULL_WORLD_START=1000;

// One real canonical mixed-cohort world, with actual ecosystem offers, customer
// allocation and playable prior-week streaming viewing. No real user saves.
let canonical:ReturnType<typeof readCinemaWorldAudience>|undefined;
export const cinemaFullWorldAudience=()=>{
    if(canonical)return structuredClone(canonical);
    const {player}=makeCinemaFixture(17),week=FULL_WORLD_START-1;
    player.age=Math.floor(week/52)+1;player.currentWeek=week%52+1;
    const pop=createWorldPopulationState(week),aud=createWorldAudienceEconomyState(pop,week);
    player.world.worldPopulation=pop;player.world.worldAudienceEconomy=aud;
    player.world.worldAudienceParticipation=createWorldAudienceParticipationState(pop,aud,week);
    player.world.worldStreamingCompetition=createWorldStreamingCompetitionState(player,week);
    player.world.worldStreamingCustomers=createWorldStreamingCustomerState(player,week);
    player.world.worldStreamingViewing=createWorldStreamingViewingState(player,week);
    player.world.worldPopulation={...pop,lastProcessedAbsoluteWeek:FULL_WORLD_START};
    player.age=Math.floor(FULL_WORLD_START/52)+1;player.currentWeek=FULL_WORLD_START%52+1;
    canonical=readCinemaWorldAudience(player);
    return structuredClone(canonical);
};

export const makeFullWorldFixture=(name:FullWorldCase,seed:number):{input:CinemaWeekInput;slate:CinemaTitleInput[]}=>{
    const world=cinemaFullWorldAudience(),rng=createDeterministicRng(`full-world-cinema:${seed}`),f=makeCinemaMarketFixture('base',seed),title=structuredClone(f.titles[0]);
    const english=['US','CA','GB','AU','NZ','IE'],global=world.countries!.map(c=>c.id);
    const noise=.7+rng()*.6,quality=Math.round(65+rng()*30);
    title.id='film';title.genre='DRAMA';title.cast=[];title.budgetCents=200_000_000;
    title.delivery={estimatedQuality:70,deliveredQuality:quality,scriptQuality:quality,directorQuality:quality,castingStrength:quality};
    title.market={...title.market!,releaseWeek:FULL_WORLD_START,countryIds:english,chainIds:['NOVA_CIRCUIT','ARCLIGHT_GRID'],universeId:undefined,languages:['english'],payoff:quality,accessibility:quality,urgency:45};
    title.exposure={version:1,attentionBasis:'PACKAGE',attentionPotential:55,events:[{id:'campaign',titleId:'film',absoluteWeek:FULL_WORLD_START-1,kind:'PAID_CAMPAIGN',channel:'TARGETED_CAMPAIGN',impressions:Math.round(15_000_000*noise),paidCostCents:50_000_000,countryIds:english}]};
    const input:CinemaWeekInput={...world,absoluteWeek:FULL_WORLD_START,seed,tuningVersion:CINEMA_MARKET_TUNING_VERSION,knowledge:'OBSERVED',titles:[title],history:[]};
    const stars=()=>{title.cast=['actor-a','actor-b'].map(personId=>({personId,name:personId,roleType:'LEAD',roleWeight:1,fame:92,isPlayer:false,characterIds:[personId+'-hero']}));
        title.exposure!.events=[...title.exposure!.events,{id:'announcement',titleId:'film',absoluteWeek:FULL_WORLD_START-1,kind:'ANNOUNCEMENT',channel:'CAST_NEWS',impressions:0,recognitionShare:getCinemaRecognitionShare(title.cast,{releasedTitleCount:0,prestige:0})}];};
    if(['unknown-local','unknown-worldwide'].includes(name))title.exposure!.events=[];
    if(['unknown-worldwide','wide-small'].includes(name)){title.market.countryIds=global;title.market.chainIds=CINEMA_CHAINS.map(c=>c.id)}
    if(name==='weak-small')title.delivery.deliveredQuality=20;
    if(name==='sleeper'){title.delivery.deliveredQuality=95;title.exposure!.events=[{...title.exposure!.events[0],impressions:Math.round(1_000_000*noise),paidCostCents:3_333_300}]}
    if(name==='local-language'){title.market.countryIds=['IN'];title.market.languages=['hindi'];title.exposure!.events=title.exposure!.events.map(e=>({...e,countryIds:['IN']}))}
    if(['weak-stars','strong-stars','honest-campaign','misleading-campaign'].includes(name)){
        stars();title.genre='ACTION';title.budgetCents=5_000_000_000;title.market.countryIds=global;title.market.chainIds=['NOVA_CIRCUIT','Z_CINEMAS','EMPIRE_CINEMAS'];title.market.urgency=65;
        title.delivery.deliveredQuality=name==='strong-stars'?90:25;
        title.exposure!.events=title.exposure!.events.map(e=>e.kind==='PAID_CAMPAIGN'?{...e,impressions:Math.round(150_000_000*noise),paidCostCents:500_000_000}:e);
        if(name==='honest-campaign'||name==='misleading-campaign'){title.delivery.deliveredQuality=40;title.exposure!.attentionPotential=name==='misleading-campaign'?100:40;}
    }
    if(['earned-event','unearned-event','weak-event'].includes(name)){
        stars();title.genre='SUPERHERO';title.budgetCents=20_000_000_000;title.delivery.deliveredQuality=name==='weak-event'?22:92;title.delivery.estimatedQuality=80;
        title.market={...title.market,universeId:'earned-universe',returningCharacterIds:['actor-a-hero','actor-b-hero'],countryIds:global,chainIds:CINEMA_CHAINS.map(c=>c.id),languages:['english','hindi','spanish'],urgency:95,payoff:title.delivery.deliveredQuality,accessibility:80};
        title.exposure!.events=title.exposure!.events.map(e=>e.kind==='PAID_CAMPAIGN'?{...e,countryIds:global,impressions:Math.round(900_000_000*noise),paidCostCents:3_000_000_000}:e);
        title.exposure!.attentionPotential=85;
        if(name!=='unearned-event')input.history=world.cohorts.map(c=>({id:'precursor:'+c.id,titleId:'precursor',ownerId:title.owner.id,cohortId:c.id,people:Math.floor(c.people*.18),satisfaction:90,absoluteWeek:FULL_WORLD_START-15,cast:structuredClone(title.cast),universeId:'earned-universe',source:'THEATER'}));
    }
    if(name==='early-streaming')title.market.streamingWindows=[...new Map((world.streamingAlternatives||[]).map(a=>[a.platformId,{platformId:a.platformId,countryIds:global,absoluteWeek:FULL_WORLD_START+3,publiclyKnown:true}])).values()];
    if(name==='no-home-access')input.streamingAlternatives=[];
    if(name==='recession')input.cohorts=input.cohorts.map(c=>({...c,market:{...c.market!,monthlyCinemaBudgetCents:Math.floor(c.market!.monthlyCinemaBudgetCents*.5)}}));
    const slate:CinemaTitleInput[]=[];
    if(name!=='quiet-release')for(let i=0;i<24;i++){
        const rival=structuredClone(title),id=`rival-${i}`;
        rival.id=id;rival.owner={id:`npc-studio-${i%4}`,route:'NPC_STUDIO'};rival.genre=(['ACTION','COMEDY','DRAMA','ANIMATION','THRILLER','ROMANCE'] as const)[i%6];
        const releaseWeek=FULL_WORLD_START-9+i*3;
        rival.cast=[{personId:`rival-star-${i%6}`,name:'Rival cast',roleType:'LEAD',roleWeight:1,fame:45+i%5*10,isPlayer:false,characterIds:[]}];
        rival.budgetCents=(30+i%5*25)*1e8;rival.delivery={estimatedQuality:65,deliveredQuality:45+i%6*9,scriptQuality:65,directorQuality:65,castingStrength:65};
        rival.market={...title.market,releaseWeek,universeId:undefined,returningCharacterIds:[],streamingWindows:undefined,streamingWindow:undefined,countryIds:global,chainIds:['NOVA_CIRCUIT','Z_CINEMAS','EMPIRE_CINEMAS'],languages:[['english','hindi','spanish','french'][i%4]],urgency:55,payoff:65,accessibility:65};
        rival.exposure={version:1,attentionBasis:'PACKAGE',attentionPotential:65,events:[{id:`rival-campaign-${i}`,titleId:id,absoluteWeek:releaseWeek-1,kind:'PAID_CAMPAIGN',channel:'NPC_CAMPAIGN',impressions:Math.round((100+i%5*80)*1e6*noise),paidCostCents:(4+i%5*2)*1e8},{id:`rival-news-${i}`,titleId:id,absoluteWeek:releaseWeek-1,kind:'ANNOUNCEMENT',channel:'NPC_CAST_NEWS',impressions:0,recognitionShare:getCinemaRecognitionShare(rival.cast,{releasedTitleCount:0,prestige:0})}]};
        slate.push(rival);
    }
    // A deliberate binding-market stress, not an ordinary release calendar or
    // an assumed hit rate: simultaneous heavily promoted rivals in the same
    // language/markets and every existing chain. Supply and wallets stay real.
    if(name==='peak-release'){
        const template=slate[0];slate.length=0;
        for(let i=0;i<32;i++){
            const rival=structuredClone(template),id=`peak-rival-${i}`;
            rival.id=id;rival.owner={id:`peak-studio-${i}`,route:'NPC_STUDIO'};rival.genre='DRAMA';
            rival.budgetCents=10_000_000_000;rival.cast[0].fame=85;rival.cast[0].personId=`peak-star-${i}`;
            rival.market={...rival.market!,releaseWeek:FULL_WORLD_START,countryIds:english,chainIds:CINEMA_CHAINS.map(c=>c.id),languages:['english']};
            rival.exposure!.events=rival.exposure!.events.map(e=>({...e,id:`peak-${i}:${e.kind}`,titleId:id,absoluteWeek:FULL_WORLD_START-1,countryIds:english,
                ...(e.kind==='PAID_CAMPAIGN'?{impressions:Math.round(600_000_000*noise),paidCostCents:2_000_000_000}:{recognitionShare:getCinemaRecognitionShare(rival.cast,{releasedTitleCount:0,prestige:0})})}));
            slate.push(rival);
        }
    }
    return {input,slate};
};
