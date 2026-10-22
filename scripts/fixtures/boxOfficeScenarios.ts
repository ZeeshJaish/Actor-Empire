import { CINEMA_MARKET_TUNING_VERSION } from '../../services/boxOffice/boxOfficeProfiles';
import { INITIAL_PLAYER, type Player, type ProjectDetails, type AuditionOpportunity } from '../../types';
import type { CinemaExposureInput } from '../../services/boxOffice/boxOfficeTypes';

export const CINEMA_EXPOSURE_SCENARIOS = ['wide-unknown','narrow-unknown','two-stars-weak','healthy-new-studio','overlapping-fans'] as const;
export const makeCinemaExposureFixture = (variant: typeof CINEMA_EXPOSURE_SCENARIOS[number] = 'narrow-unknown'): CinemaExposureInput => ({
  titleId: 'exposure-fixture', absoluteWeek: 100,
  cast: variant === 'two-stars-weak' || variant === 'overlapping-fans' ? ['actor-a','actor-b'].map(personId => ({personId,name:personId,
    fame:90,roleType:'LEAD',roleWeight:1,isPlayer:false,characterIds:[]})) : [],
  studio: {releasedTitleCount:0,prestige:0,brandHealth:variant==='healthy-new-studio'?100:0},
  storyAttention:40,musicAttention:0,
  cohorts:[{id:'US:audience',countryId:'US',people:1_000_000}], events:[],
});

/** Isolated authored fixtures. Never load a player save or write audit results over old evidence. */
export const makeCinemaFixture = (seed = 1): { player: Player; project: ProjectDetails; opportunity: AuditionOpportunity } => {
  const player = structuredClone(INITIAL_PLAYER);
  player.id = `cinema-fixture-${seed}`;
  player.name = 'Cinema Fixture';
  player.age = 30; player.currentWeek = 20; player.stats.fame = 50;
  const project: ProjectDetails = {
    title: `Cinema fixture ${seed}`, type: 'MOVIE', description: 'An authored theatrical audit package.',
    studioId: 'UNIVERSAL', subtype: 'STANDALONE', genre: 'ACTION', format: 'LIVE_ACTION',
    budgetTier: 'HIGH', estimatedBudget: 210_000_000, releaseStrategy: 'THEATRICAL', visibleHype: 'MID',
    directorName: 'Fixture Director', visibleDirectorTier: 'PROFESSIONAL', visibleScriptBuzz: 'MID', visibleCastStrength: 'Solid',
    hiddenStats: { scriptQuality: 75, directorQuality: 75, castingStrength: 75, distributionPower: 80,
      rawHype: 80, qualityScore: 75, prestigeBonus: 0, fameMultiplier: 1, boxOfficeCapRoll: 0.5 },
  };
  const opportunity: AuditionOpportunity = {
    id: `cinema-offer-${seed}`, roleType: 'LEAD', projectName: project.title, genre: project.genre,
    config: { label: 'Lead', difficulty: 70, energyCost: 40, baseIncome: 10_000, expGain: 10 },
    project, estimatedIncome: 1_000_000, source: 'AGENT',
  };
  return { player, project, opportunity };
};

export const CINEMA_AUDIENCE_SCENARIOS = ['earned-event','unearned-event','streaming-wait','no-streaming-deal','satisfied-repeat','weak-repeat','indie-discovery','no-exposure','overlapping-favorites'] as const;
export const CINEMA_MARKET_SCENARIOS = ['base',...CINEMA_AUDIENCE_SCENARIOS,'scarce-seat','scarce-wallet','low-access-language','runtime','saturated-market','costly-wide-release','non-binding-capacity','narrow-unknown','wide-unknown'] as const;
export const makeCinemaMarketFixture = (variant: typeof CINEMA_MARKET_SCENARIOS[number] = 'base', seed = 13): import('../../services/boxOffice/boxOfficeTypes').CinemaWeekInput => {
  const cast = [{personId:'actor-a',name:'Actor A',roleType:'LEAD' as const,roleWeight:1,fame:90,isPlayer:false,characterIds:['hero']}];
  const band = {people:100_000,satisfaction:variant==='weak-repeat'?15:95,repeatAdmissions:0,lastViewedWeek:98};
  const title: import('../../services/boxOffice/boxOfficeTypes').CinemaTitleInput = {
    id:'film',owner:{id:'studio',route:'PLAYER_STUDIO'},projectType:'MOVIE',genre:'ACTION',budgetCents:5_000_000_000,cast,playerCredited:false,
    delivery:{estimatedQuality:80,deliveredQuality:90,scriptQuality:80,directorQuality:80,castingStrength:80},
    exposure:{version:1,attentionBasis:'PACKAGE',attentionPotential:70,events:['no-exposure','narrow-unknown','wide-unknown','costly-wide-release'].includes(variant)?[]:[{id:'press',titleId:'film',absoluteWeek:99,kind:'PROMOTION',channel:'PRESS',impressions:600_000}]},
    market:{releaseWeek:100,runtimeMinutes:120,languages:['en'],countryIds:['US'],chainIds:['NOVA_CIRCUIT'],format:'STANDARD',universeId:'universe',returningCharacterIds:['hero'],payoff:85,accessibility:85,urgency:60},
  };
  if(variant==='streaming-wait') title.market!.streamingWindow={platformId:'streamer',countryIds:['US'],absoluteWeek:101,publiclyKnown:true};
  const state: import('../../services/boxOffice/boxOfficeTypes').CinemaMarketState={schemaVersion:1,tuningVersion:CINEMA_MARKET_TUNING_VERSION,lastProcessedAbsoluteWeek:99,titles:[],affinities:[],runs:[]};
  if(['satisfied-repeat','weak-repeat','indie-discovery','saturated-market'].includes(variant)) {
    title.exposure!.events=[];
    state.titles=[{titleId:'film',ownerId:'studio',cast,universeId:'universe',releaseWeek:98,appliedExposureIds:[],cells:[{cohortId:'US:audience',awarePeople:100_000,seenBands:[band],deferredPeople:0,lastDiscoveryWeek:98}]}];
  }
  const history: import('../../services/boxOffice/boxOfficeTypes').CinemaViewingEvidence[] = variant==='earned-event'||variant==='overlapping-favorites'?[{
    id:'earlier-view',titleId:'earlier-film',ownerId:'studio',cohortId:'US:audience',people:300_000,satisfaction:95,absoluteWeek:96,cast,universeId:'universe',source:'THEATER',
  }]:[];
  const input: import('../../services/boxOffice/boxOfficeTypes').CinemaWeekInput = {absoluteWeek:100,seed,tuningVersion:CINEMA_MARKET_TUNING_VERSION,knowledge:'OBSERVED',titles:[title],history,marketState:state,
    cohorts:[{id:'US:audience',countryId:'US',people:1_000_000,market:{eligiblePeople:800_000,monthlyCinemaBudgetCents:2_000_000_000,weeklyLeisureMinutes:60_000_000,interest:80,priceSensitivity:60,persona:'FANDOM_LOYALISTS',languages:['en'],travelMinutes:40}}],
    countries:[{id:'US',regionId:'NORTH_AMERICA',population:1_000_000,cinemaAccess:80,purchasingPower:90,inflation:10,languages:['en']}],
    supply:{pools:[{id:'US:NOVA_CIRCUIT:STANDARD',countryId:'US',chainId:'NOVA_CIRCUIT',format:'STANDARD',screens:1000,seatsPerShow:180,weeklyScreenMinutes:5_040_000,ticketPriceCents:1000,exhibitorBasisPoints:4500,distributionBasisPoints:500,bookingCentsPerShow:1000}],offers:[{titleId:'film',poolId:'US:NOVA_CIRCUIT:STANDARD'}]},
  };
  if(variant==='streaming-wait') input.streamingAlternatives=[{platformId:'streamer',countryId:'US',cohortId:'US:audience',accessiblePeople:800_000,catalogueStrength:80,serviceQuality:90,localization:90,freshness:80,preferredGenres:['DRAMA'],evidenceWeek:99}];
  if(variant==='scarce-seat' || variant==='runtime') {input.supply!.pools[0].screens=1;input.supply!.pools[0].weeklyScreenMinutes=5040}
  if(variant==='scarce-wallet') input.cohorts[0].market!.monthlyCinemaBudgetCents=20_000_000;
  if(variant==='low-access-language'){input.cohorts[0].market!.eligiblePeople=200_000;input.cohorts[0].market!.languages=['ja'];input.cohorts[0].market!.travelMinutes=180}
  if(variant==='runtime') title.market!.runtimeMinutes=240;
  if(variant==='saturated-market'){state.titles[0].cells[0].awarePeople=1_000_000;state.titles[0].cells[0].seenBands[0].people=1_000_000}
  if(['non-binding-capacity','wide-unknown'].includes(variant)) {title.market!.chainIds=['NOVA_CIRCUIT','Z_CINEMAS'];input.supply!.pools.push({...input.supply!.pools[0],id:'US:Z_CINEMAS:STANDARD',chainId:'Z_CINEMAS'});input.supply!.offers.push({titleId:title.id,poolId:'US:Z_CINEMAS:STANDARD'})}
  if(variant==='costly-wide-release'){delete input.supply;title.market!.chainIds=['NOVA_CIRCUIT','Z_CINEMAS','EMPIRE_CINEMAS']}
  return input;
};
