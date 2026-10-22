import type { Player } from '../../types';
import { normalizeWorldPopulationState } from '../worldEconomy/worldPopulation';
import { normalizeWorldAudienceEconomyState } from '../worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../worldEconomy/worldAudienceParticipation';
import { getDefaultCinemaChainIdsForRegion, getReleaseRegionIdsForProject } from '../distributionRevenue';
import { readCinemaWorldAudience } from './boxOfficeAudienceAdapters';
import { quoteCinemaSupply } from './boxOfficeSupply';
import { normalizeCinemaTitle } from './boxOfficeInputs';
import { apportionCinemaIntegers } from './boxOfficeMath';
import { CINEMA_MARKET_TUNING_VERSION } from './boxOfficeProfiles';
import type { CinemaMigrationResult, CinemaSavedState, CinemaSettledTitle } from './boxOfficeTypes';

const integer=(n:unknown):n is number=>Number.isSafeInteger(n) && (n as number)>=0;
const cents=(n:number):number=>{const value=Math.round(n*100);if(!Number.isFinite(n)||n<0||!integer(value))throw new RangeError('Invalid protected cinema money');return value};
const object=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==='object' && !Array.isArray(v);
const finiteTree=(v:unknown):boolean=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(finiteTree):object(v)?Object.values(v).every(finiteTree):true;
export class CinemaMigrationError extends Error {
    readonly recoverable=true;
    constructor(readonly codes:readonly string[]){super(`Cinema save requires recovery: ${codes.join(', ')}`);this.name='CinemaMigrationError'}
}
/** A future/ambiguous paid schema must never be silently reset by generic save defaults. */
export const inspectCinemaSavedState = (state:unknown):string[] => {
    if(state===undefined || state===null)return [];
    if(!object(state))return ['CINEMA_STATE_CORRUPT'];
    if(typeof state.schemaVersion==='number' && state.schemaVersion>1)return ['CINEMA_FUTURE_SCHEMA'];
    if(state.schemaVersion===0)return (Array.isArray(state.weeks)&&state.weeks.length || object(state.titles)&&Object.keys(state.titles).length)?['CINEMA_UNKNOWN_SETTLEMENT_BASIS']:[];
    if(state.schemaVersion!==1 || !integer(state.clockEpoch)||!integer(state.activationWeek)||!integer(state.lastProcessedAbsoluteWeek)
        ||state.tuningVersion!==CINEMA_MARKET_TUNING_VERSION||!object(state.market)||!object(state.titles)||!Array.isArray(state.weeks)
        ||!Array.isArray(state.market.titles)||!Array.isArray(state.market.affinities)||!Array.isArray(state.market.runs))return ['CINEMA_STATE_INCOMPLETE'];
    if(state.market.schemaVersion!==1 || state.market.tuningVersion!==state.tuningVersion)return ['CINEMA_STATE_INCOMPLETE'];
    if(!finiteTree(state)||state.weeks.length>52||state.market.lastProcessedAbsoluteWeek!==state.lastProcessedAbsoluteWeek)return ['CINEMA_STATE_CORRUPT'];
    if(state.externalProducerBalancesCents!==undefined && (!object(state.externalProducerBalancesCents)||Object.values(state.externalProducerBalancesCents).some(v=>!Number.isSafeInteger(v))))return ['CINEMA_EXTERNAL_BALANCE_CORRUPT'];
    const titleIds=state.market.titles.map((t:any)=>t?.titleId);
    if(titleIds.some((id:unknown)=>typeof id!=='string'||!id)||new Set(titleIds).size!==titleIds.length)return ['CINEMA_AUDIENCE_ID_CORRUPT'];
    for(const title of state.market.titles){
        if(!object(title)||typeof title.ownerId!=='string'||!integer(title.releaseWeek)||!Array.isArray(title.cast)||title.cast.some((p:any)=>!p||typeof p.personId!=='string'||typeof p.roleWeight!=='number'||typeof p.isPlayer!=='boolean')||!Array.isArray(title.cells)||!Array.isArray(title.appliedExposureIds))return ['CINEMA_AUDIENCE_CORRUPT'];
        const ids=title.cells.map((c:any)=>c?.cohortId);if(new Set(ids).size!==ids.length)return ['CINEMA_AUDIENCE_ID_CORRUPT'];
        for(const cell of title.cells){
            if(!object(cell)||!integer(cell.awarePeople)||!integer(cell.deferredPeople)||!Array.isArray(cell.seenBands)||cell.seenBands.length>3)return ['CINEMA_AUDIENCE_CORRUPT'];
            let seen=0;for(const b of cell.seenBands){if(!object(b)||!integer(b.people)||!integer(b.repeatAdmissions)||!integer(b.lastViewedWeek)||typeof b.satisfaction!=='number'||b.satisfaction<0||b.satisfaction>100)return ['CINEMA_AUDIENCE_CORRUPT'];seen+=b.people}
            if(seen>cell.awarePeople||cell.deferredPeople>cell.awarePeople-seen)return ['CINEMA_AUDIENCE_CONSERVATION'];
        }
    }
    const nonempty=(v:unknown)=>typeof v==='string'&&v.length>0;
    for(const a of state.market.affinities)if(!object(a)||!nonempty(a.cohortId)||!nonempty(a.id)||!['ACTOR','STUDIO','UNIVERSE'].includes(String(a.kind))||!integer(a.people)||!integer(a.lastWeek)||typeof a.strength!=='number'||a.strength<0||a.strength>100)return ['CINEMA_AFFINITY_CORRUPT'];
    for(const r of state.market.runs)if(!object(r)||!nonempty(r.titleId)||!nonempty(r.poolId)||!integer(r.quietWeeks)||typeof r.closed!=='boolean')return ['CINEMA_RUN_CORRUPT'];
    const receiptIds=new Set<string>();
    for(const w of state.weeks){
        if(!object(w)||!nonempty(w.id)||!integer(w.absoluteWeek)||!integer(w.clockEpoch)||!nonempty(w.inputFingerprint)||!nonempty(w.receiptSignature)||!Array.isArray(w.titles)||receiptIds.has(w.id as string))return ['CINEMA_WEEK_RECEIPT_CORRUPT'];
        receiptIds.add(w.id as string);const ids=new Set<string>();
        for(const t of w.titles){
            if(!object(t)||!nonempty(t.titleId)||!nonempty(t.ownerId)||!['PLAYER_STUDIO','ACCEPTED_ROLE','NPC_STUDIO'].includes(String(t.ownerRoute))||typeof t.closed!=='boolean'||ids.has(t.titleId as string))return ['CINEMA_WEEK_TITLE_CORRUPT'];
            ids.add(t.titleId as string);
            for(const k of ['grossCents','producerReceiptsCents','exhibitorReceiptsCents','distributionDeductionsCents','firstAdmissions','repeatAdmissions','costsCents','investorPaidCents','talentPaidCents','actorPaidCents','screens'])if(!integer(t[k]))return ['CINEMA_WEEK_MONEY_CORRUPT'];
            if(t.grossCents!==(t.producerReceiptsCents as number)+(t.exhibitorReceiptsCents as number)+(t.distributionDeductionsCents as number)||t.satisfactionScore!==null&&(typeof t.satisfactionScore!=='number'||t.satisfactionScore<0||t.satisfactionScore>100))return ['CINEMA_WEEK_MONEY_CORRUPT'];
        }
    }
    for(const [id,value] of Object.entries(state.titles)) {
        if(!object(value)||value.titleId!==id||!['UNSETTLED_WEEKLY','LEGACY_ACTIVE','LEGACY_FULLY_SETTLED'].includes(String(value.basis)))return ['CINEMA_TITLE_STATE_CORRUPT'];
        for(const key of ['legacyGrossCents','grossCents','producerReceiptsCents','exhibitorReceiptsCents','distributionDeductionsCents','bookingCostCents','investorPaidCents','talentPaidCents','actorPaidCents','firstAdmissions','repeatAdmissions'])if(!integer(value[key]))return ['CINEMA_TITLE_MONEY_CORRUPT'];
        for(const k of ['satisfactionScoreUnits','satisfactionAdmissions'])if(value[k]!==undefined&&!integer(value[k]))return ['CINEMA_TITLE_AUDIENCE_CORRUPT'];
        if(value.legacyProducerReceiptsCents!==null && !integer(value.legacyProducerReceiptsCents))return ['CINEMA_TITLE_MONEY_CORRUPT'];
        if(value.grossCents!==(value.producerReceiptsCents as number)+(value.exhibitorReceiptsCents as number)+(value.distributionDeductionsCents as number))return ['CINEMA_RECEIPT_CONSERVATION'];
    }
    return [];
};
export const makeCinemaSettledTitle = (titleId:string,ownerId:string,basis:CinemaSettledTitle['basis'],activationWeek:number,legacyGross=0,legacyReceipts?:number):CinemaSettledTitle => ({
    titleId,ownerId,basis,activationWeek,legacyGrossCents:cents(legacyGross),legacyProducerReceiptsCents:legacyReceipts===undefined?null:cents(legacyReceipts),
    grossCents:0,producerReceiptsCents:0,exhibitorReceiptsCents:0,distributionDeductionsCents:0,bookingCostCents:0,investorPaidCents:0,talentPaidCents:0,actorPaidCents:0,
    firstAdmissions:0,repeatAdmissions:0,lastSettledWeek:activationWeek-1,closed:basis==='LEGACY_FULLY_SETTLED',
});
/** Pure migration. Historical money/contracts stay byte-for-byte facts; estimated attendance pays zero. */
export const migrateCinemaState = (player:Player,absoluteWeek:number):CinemaMigrationResult => {
    const rejected=(code:string):CinemaMigrationResult=>({player,status:'REJECTED',diagnostics:[{code}]});
    if(!integer(absoluteWeek))return rejected('CINEMA_CLOCK_CORRUPT');
    const errors=inspectCinemaSavedState(player.world?.cinemaMarket);if(errors.length)return {player,status:'REJECTED',diagnostics:errors.map(code=>({code}))};
    if(player.world?.cinemaMarket?.schemaVersion===1)return {player,status:'UNCHANGED',diagnostics:[]};
    if(!Number.isFinite(player.money))return rejected('CINEMA_PROTECTED_MONEY_CORRUPT');
    for(const r of player.activeReleases || [])if(r.type==='MOVIE' && (!Number.isFinite(r.totalGross)||r.totalGross<0||!Number.isFinite(r.budget)||r.budget<0
        ||(r.totalStudioReceipts!==undefined && (!Number.isFinite(r.totalStudioReceipts)||r.totalStudioReceipts<0))))return rejected('CINEMA_LEGACY_FINANCE_CORRUPT');
    for(const p of player.world.projects || [])if(p.boxOffice!==undefined && (!Number.isFinite(p.boxOffice)||p.boxOffice<0))return rejected('CINEMA_LEGACY_FINANCE_CORRUPT');
    try{for(const r of player.activeReleases || []){cents(r.totalGross);cents(r.budget);if(r.totalStudioReceipts!==undefined)cents(r.totalStudioReceipts)}for(const p of player.world.projects)if(p.boxOffice!==undefined)cents(p.boxOffice)}catch{return rejected('CINEMA_LEGACY_FINANCE_CORRUPT')}
    const activationWeek=absoluteWeek+1;
    const state:CinemaSavedState={schemaVersion:1,tuningVersion:CINEMA_MARKET_TUNING_VERSION,clockEpoch:0,activationWeek,lastProcessedAbsoluteWeek:absoluteWeek,
        market:{schemaVersion:1,tuningVersion:CINEMA_MARKET_TUNING_VERSION,lastProcessedAbsoluteWeek:absoluteWeek,titles:[],affinities:[],runs:[]},titles:{},weeks:[]};
    const population=normalizeWorldPopulationState(player.world.worldPopulation,absoluteWeek);
    const audience=normalizeWorldAudienceEconomyState(player.world.worldAudienceEconomy,population,absoluteWeek);
    const participation=normalizeWorldAudienceParticipationState(player.world.worldAudienceParticipation,population,audience,absoluteWeek);
    const worldAudience=readCinemaWorldAudience({...player,world:{...player.world,worldPopulation:population,worldAudienceEconomy:audience,worldAudienceParticipation:participation}});
    const supply=quoteCinemaSupply({...worldAudience,titles:[],absoluteWeek,seed:0,tuningVersion:CINEMA_MARKET_TUNING_VERSION,knowledge:'OBSERVED'});
    const diagnostics:CinemaMigrationResult['diagnostics']=[];
    const activeReleases=(player.activeReleases || []).map(release=>{
        if(release.type!=='MOVIE')return release;
        const active=release.distributionPhase==='THEATRICAL' && release.status!=='FINISHED';
        const basis=active?'LEGACY_ACTIVE' as const:'LEGACY_FULLY_SETTLED' as const;
        state.titles[release.id]=makeCinemaSettledTitle(release.id,release.projectDetails.studioId,basis,activationWeek,release.totalGross,release.totalStudioReceipts);
        if(active && release.totalGross>0) {
            const regions=getReleaseRegionIdsForProject(release.projectDetails);
            const cohortCountries=new Set(worldAudience.countries!.filter(c=>regions.includes(c.regionId)).map(c=>c.id));
            const eligible=worldAudience.cohorts.filter(c=>cohortCountries.has(c.countryId));
            const weights=eligible.map(c=>({id:c.id,weight:c.market!.eligiblePeople}));
            const capacity=weights.reduce((n,c)=>n+c.weight,0);
            // Coarse regional/economy quote: half estimated paid tickets count as unique viewers.
            const prices=supply.pools.filter(pool=>pool.format==='STANDARD' && cohortCountries.has(pool.countryId) && (
                release.projectDetails.releaseChainSelections?.[worldAudience.countries!.find(c=>c.id===pool.countryId)!.regionId]
                ||getDefaultCinemaChainIdsForRegion(release.projectDetails,worldAudience.countries!.find(c=>c.id===pool.countryId)!.regionId)).includes(pool.chainId));
            const meanPrice=Math.max(1,Math.round(prices.reduce((n,p)=>n+p.ticketPriceCents*p.screens,0)/Math.max(1,prices.reduce((n,p)=>n+p.screens,0))));
            const seen=Math.min(capacity,Math.floor(cents(release.totalGross)/meanPrice*.5));
            const allocated=apportionCinemaIntegers(seen,weights,0,absoluteWeek);
            const title=normalizeCinemaTitle({titleId:release.id,project:release.projectDetails,player,owner:{id:release.projectDetails.studioId,route:'ACCEPTED_ROLE'}});
            state.market.titles.push({titleId:release.id,ownerId:title.owner.id,cast:title.cast,universeId:release.projectDetails.universeId,
                releaseWeek:Math.max(0,absoluteWeek-Math.max(0,release.weekNum-1)),
                appliedExposureIds:(release.projectDetails.cinemaExposure?.events || []).filter(e=>e.absoluteWeek<=absoluteWeek).map(e=>e.id),
                cells:eligible.map(c=>{const n=allocated.get(c.id)||0;return {cohortId:c.id,awarePeople:n,seenBands:n?[{people:n,
                    satisfaction:(50+Math.max(30,Math.min(90,release.projectDetails.hiddenStats.qualityScore || 50)))/2,repeatAdmissions:0,lastViewedWeek:absoluteWeek}]:[],
                    deferredPeople:0,lastDiscoveryWeek:absoluteWeek,lastChoiceWeek:absoluteWeek}})});
            diagnostics.push({code:'CINEMA_LEGACY_AUDIENCE_ESTIMATED',titleId:release.id,estimated:true});
        }
        return {...release,cinema:{schemaVersion:1 as const,settlementBasis:basis,activationWeek,audienceBasis:'LEGACY_ESTIMATE' as const}};
    });
    const projects=player.world.projects.map(project=>{
        if(state.titles[project.id])return project;
        const basis=project.cinema?.settlementBasis || 'LEGACY_FULLY_SETTLED';
        state.titles[project.id]={...makeCinemaSettledTitle(project.id,project.studioId || `legacy-owner:${project.id}`,basis,activationWeek,project.boxOffice),legacyGrossKnown:project.boxOffice!==undefined};
        return {...project,cinema:project.cinema || {schemaVersion:1 as const,settlementBasis:basis,activationWeek,audienceBasis:'LEGACY_ESTIMATE' as const}};
    });
    return {player:{...player,activeReleases,world:{...player.world,projects,cinemaMarket:state}},status:'MIGRATED',diagnostics};
};
