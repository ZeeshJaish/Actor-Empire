import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {createDeterministicRng} from '../services/deterministicRandom';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {commitCinemaWeek} from '../services/boxOffice/boxOfficeLiveSettlement';
import {inspectCinemaSavedState} from '../services/boxOffice/boxOfficeMigration';
import {CINEMA_AUDIENCE_PROFILE,CINEMA_MARKET_TUNING_VERSION} from '../services/boxOffice/boxOfficeProfiles';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
import {makeBillionCareer,queueBillionFilm,BILLION_STUDIO_ID,type BillionFilm} from './fixtures/boxOfficeBillionCareer';
import type {Genre,Player} from '../types';
import type {CinemaWeekResult} from '../services/boxOffice/boxOfficeTypes';

const out=process.env.CINEMA_BILLION_OUTPUT||'/private/tmp/actor-billion-potential-20261022/career';mkdirSync(out,{recursive:true});
const seed=Number(process.env.CINEMA_BILLION_SEED||0);
const executionCodeSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const saveEvery=Number(process.env.CINEMA_BILLION_SAVE_EVERY||1);assert.ok(Number.isInteger(saveEvery)&&saveEvery>0);
const horizon=Number(process.env.CINEMA_BILLION_HORIZON||156);assert.ok(Number.isInteger(horizon)&&horizon>0);
const cases=(process.env.CINEMA_BILLION_CASES||'standalone,earned,weak,small,wide-small').split(',');
const rows:any[]=[];
const save=()=>writeFileSync(join(out,`results-${seed}.json`),JSON.stringify({kind:'ACTUAL_GAME_WEEK_FUNDED_EXISTING_OWNER',executionCodeSha256,tuningVersion:CINEMA_MARKET_TUNING_VERSION,audienceProfile:CINEMA_AUDIENCE_PROFILE,seed,saveEvery,horizon,rows,
    limitations:['Authored established owner starts with $3B studio cash and $1M personal cash, not an ordinary new career',
        'Completed craft packages are authored; real Greenlight funding, release confirmation exposure, game-loop premiere, full-world rivals, settlement and verified saves run unchanged',
        'No pre-existing box-office gross, paid viewers, universe familiarity or affinity is granted; precursor attendance is earned during these weeks',
        'Conditional scenarios demonstrate attainability and contrasts, not the frequency of exceptional films across all careers']},null,2));

const runWeek=async(player:Player,store:CinemaMemorySaveStore,key:string,offset:number)=>{
    let cinema:CinemaWeekResult|undefined;
    const r=await processGameWeek(player,{onCinemaResult:result=>cinema=result});
    const state=r.player.world.cinemaMarket!;
    assert.equal(getAbsoluteWeek(r.player.age,r.player.currentWeek),getAbsoluteWeek(player.age,player.currentWeek)+1);
    assert.deepEqual(inspectCinemaSavedState(state),[]);
    for(const t of state.weeks.at(-1)!.titles){
        assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);
        assert.ok(t.actorPaidCents+t.talentPaidCents+t.investorPaidCents<=t.producerReceiptsCents+(t.soundtrackReceiptsCents||0));
    }
    for(const c of cinema!.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
    for(const p of cinema!.supply){assert.ok(p.admissions<=p.seats);assert.ok(p.usedScreenMinutes<=p.availableScreenMinutes)}
    assert.equal(commitCinemaWeek(r.player,cinema!).applied,false,'Replaying actual paid result must pay zero');
    // Balance branches need the real engine every week, with periodic durable checkpoints.
    // The primary earned journey uses the default verified save on every week.
    if(offset%saveEvery!==0)return r.player;
    const prepared=prepareVerifiedPlayerForPersistence(r.player,'PROCESS_WEEK');
    if(offset===0){
        const before=await loadVerifiedGameData(store,key);assert.equal(before.status,'CURRENT');
        store.failPromotion=true;
        await assert.rejects(()=>saveVerifiedGameData(store,key,prepared.player,prepared.manifest),/promotion/);
        const failed=await loadVerifiedGameData(store,key);assert.equal(failed.status,'CURRENT');
        assert.equal(failed.player!.money,before.player!.money);
        assert.deepEqual(failed.player!.world.cinemaMarket,before.player!.world.cinemaMarket);
        assert.deepEqual(failed.player!.businesses,before.player!.businesses);
        store.failPromotion=false;
    }
    await saveVerifiedGameData(store,key,prepared.player,prepared.manifest);
    writeFileSync(join(out,`${key}-latest.json`),JSON.stringify(prepared.player));
    if(offset%13===0){const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');return JSON.parse(JSON.stringify(loaded.player)) as Player}
    return prepared.player;
};

for(const name of cases){
    Math.random=createDeterministicRng(`billion-career:${seed}`);
    const checkpoint=process.env.CINEMA_BILLION_CHECKPOINT;
    let player:Player=checkpoint?JSON.parse(checkpoint.endsWith('.gz')?gunzipSync(readFileSync(checkpoint)).toString('utf8'):readFileSync(checkpoint,'utf8')):makeBillionCareer();
    const store=new CinemaMemorySaveStore(),key=`billion-${name}-${seed}`;
    let pre=prepareVerifiedPlayerForPersistence(player,'MIGRATION');await saveVerifiedGameData(store,key,pre.player,pre.manifest);player=pre.player;
    let totalWeeks=0;const precursors:any[]=Object.values(player.world.cinemaMarket!.titles).filter(t=>t.titleId.startsWith('precursor-'))
        .map(t=>({id:t.titleId,grossCents:t.grossCents,firstAdmissions:t.firstAdmissions,fromCheckpoint:true}));
    if(name==='earned'||name==='weak')for(let n=precursors.length;n<Number(process.env.CINEMA_BILLION_PRECURSORS||4);n++){
        const pair=n%4;
        const film:BillionFilm={id:`precursor-${n}`,budget:100e6,campaign:30e6,quality:92,estimatedQuality:85,castIndices:[pair*2,pair*2+1],universe:true};
        player=queueBillionFilm(player,film);
        for(let w=0;w<26;w++){player=await runWeek(player,store,key,totalWeeks++);if(w%13===0)console.log('CAREER_PROGRESS',name,seed,n,w,totalWeeks)}
        const title=player.world.cinemaMarket!.titles[film.id];assert.ok(title.firstAdmissions>0);precursors.push({id:film.id,grossCents:title.grossCents,firstAdmissions:title.firstAdmissions});
    }
    const small=name==='small'||name==='wide-small';
    const genre=process.env.CINEMA_BILLION_GENRE as Genre|undefined;
    if(genre)assert.ok(['SUPERHERO','FANTASY','ACTION','ANIMATION','SCI_FI','ADVENTURE','DRAMA'].includes(genre));
    const film:BillionFilm={id:process.env.CINEMA_BILLION_FILM_ID||`final-${name}`,budget:small?2e6:300e6,campaign:small?.5e6:Number(process.env.CINEMA_BILLION_CAMPAIGN||100e6),quality:name==='weak'?25:Number(process.env.CINEMA_BILLION_QUALITY||96),estimatedQuality:90,genre,
        castIndices:small?[]:[0,1,2,3,4,5,6,7],universe:name==='earned'||name==='weak',wide:name!=='small'};
    writeFileSync(join(out,`${name}-before-final-${seed}.json`),JSON.stringify(player));
    const beforeFunding=player.businesses.find(b=>b.id===BILLION_STUDIO_ID)!.balance;
    player=queueBillionFilm(player,film);
    assert.equal(Math.round((beforeFunding-player.businesses.find(b=>b.id===BILLION_STUDIO_ID)!.balance)*100),Math.round((film.budget+film.campaign)*100));
    let closed=false;const weekly:any[]=[];const started=performance.now();
    for(let w=0;w<horizon;w++){
        player=await runWeek(player,store,key,totalWeeks++);
        const paid=player.world.cinemaMarket!.weeks.at(-1)!.titles.find(t=>t.titleId===film.id);
        assert.ok(paid,'Real AWAITING_RELEASE must enter the actual common weekly slate');
        weekly.push({week:w+1,grossCents:paid.grossCents,first:paid.firstAdmissions,repeats:paid.repeatAdmissions,closed:paid.closed,
            slate:player.world.cinemaMarket!.weeks.at(-1)!.titles.length});
        if(w%10===0)console.log('CAREER_FINAL',name,seed,w+1,player.world.cinemaMarket!.titles[film.id].grossCents/1e8,weekly.at(-1)!.slate);
        if(paid.closed){closed=true;break}
    }
    assert.ok(closed,'Observation horizon reached; this is censored, never a forced theatrical exit');
    const facts=player.world.cinemaMarket!.titles[film.id];assert.equal(facts.legacyGrossCents,0);
    const finalPrepared=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');
    await saveVerifiedGameData(store,key,finalPrepared.player,finalPrepared.manifest);player=finalPrepared.player;
    const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');assert.deepEqual(loaded.player!.world.cinemaMarket!.titles[film.id],facts);
    let gross=0,week95=0;for(const w of weekly){gross+=w.grossCents;if(gross>=facts.grossCents*.95){week95=w.week;break}}
    const row={name,film,precursors,checkpoint,totalWeeks,runWeeks:weekly.length,week95,grossCents:facts.grossCents,receiptsCents:facts.producerReceiptsCents,
        profitCents:facts.producerReceiptsCents-facts.bookingCostCents-(film.budget+film.campaign)*100,
        first:facts.firstAdmissions,repeats:facts.repeatAdmissions,weekly,allClosed:closed,runMs:Math.round(performance.now()-started),
        countries:Object.keys(player.world.worldPopulation!.countries).length,platforms:Object.keys(player.world.platforms||{}).length};
    rows.push(row);save();writeFileSync(join(out,`${name}-final-${seed}.json`),JSON.stringify(player));
    console.log('CAREER_RESULT',JSON.stringify({name,seed,grossM:row.grossCents/1e8,profitM:row.profitCents/1e8,runWeeks:row.runWeeks,week95,totalWeeks}));
}
save();
