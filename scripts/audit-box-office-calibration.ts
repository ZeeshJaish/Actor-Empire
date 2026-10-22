import { buildCinemaAudienceSnapshot } from '../services/boxOffice/boxOfficeAudience';
import { CINEMA_MARKET_TUNING_VERSION } from '../services/boxOffice/boxOfficeProfiles';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { CALIBRATION_CASES,makeCalibrationFixture,calibrationKnown } from './fixtures/boxOfficeCalibration';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { forecastCinemaWeek } from '../services/boxOffice/boxOfficeForecast';
import { valueCinemaStreamingRights } from '../services/boxOffice/boxOfficeRightsValue';
import { quoteCinemaSupply } from '../services/boxOffice/boxOfficeSupply';
import { makeCinemaMarketFixture } from './fixtures/boxOfficeScenarios';
import type { CinemaWeekInput,CinemaWeekResult } from '../services/boxOffice/boxOfficeTypes';
export const assertCalibrationInvariants=(input:CinemaWeekInput,r:CinemaWeekResult)=>{
 const choices=buildCinemaAudienceSnapshot({...input,supply:input.supply||quoteCinemaSupply(input)}).choices;
 for(const c of choices.filter(c=>c.kind!=='DEFER')){const allocated=r.allocations.filter(a=>a.titleId===c.titleId&&a.cohortId===c.cohortId&&a.kind===c.kind).reduce((n,a)=>n+a.admissions,0);assert.ok(allocated<=c.requestedAdmissions);assert.ok(allocated<=(c.kind==='FIRST'?c.reachableUnseenPeople:c.repeatEligiblePeople))}
 assert.equal(r.titles.reduce((n,t)=>n+t.grossCents,0),r.cohorts.reduce((n,c)=>n+c.spentCents,0));
 for(const t of r.titles){for(const n of [t.grossCents,t.producerReceiptsCents,t.exhibitorReceiptsCents,t.distributionDeductionsCents,t.firstAdmissions,t.repeatAdmissions])assert.ok(Number.isSafeInteger(n)&&n>=0);assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents)}
 for(const c of r.cohorts){assert.equal(c.walletCents,c.spentCents+c.unspentCents);assert.ok(c.spentCents<=c.walletCents&&c.usedMinutes<=c.leisureMinutes)}
 for(const p of r.supply)assert.ok(p.admissions<=p.seats&&p.usedScreenMinutes<=p.availableScreenMinutes);
 for(const t of r.nextState.titles)for(const c of t.cells){const population=input.cohorts.find(x=>x.id===c.cohortId)!.people;assert.ok(c.awarePeople<=population);assert.ok(c.seenBands.reduce((n,b)=>n+b.people,0)<=c.awarePeople)}
};
const summaries:any[]=[];const seeds=32;const maxWeeks=104;
for(const name of CALIBRATION_CASES)for(let seed=0;seed<seeds;seed++){
 let input=makeCalibrationFixture(name,seed);const original=structuredClone(input),forecast=forecastCinemaWeek(input,calibrationKnown(input)).titles.find(t=>t.titleId==='film')!;
 let gross=0,receipts=0,booking=0,first=0,repeats=0,weeks=0,awareness=0,opening=0,last:any,continuedPast3B=false;const weekly:number[]=[];
 const campaign=input.titles[0].exposure!.events.reduce((n,e)=>n+(e.paidCostCents||0),0);
 for(let w=0;w<maxWeeks;w++){
  const r=simulateCinemaWeek(input);assertCalibrationInvariants(input,r);if(w===0){assert.deepEqual(input,original);opening=r.titles.find(t=>t.titleId==='film')!.grossCents;assert.deepEqual(r,simulateCinemaWeek(input))}
  last=r.titles.find(t=>t.titleId==='film')!;if(gross>300_000_000_000&&last.grossCents>0)continuedPast3B=true;gross+=last.grossCents;receipts+=last.producerReceiptsCents;first+=last.firstAdmissions;repeats+=last.repeatAdmissions;booking+=r.costEvents.filter(c=>c.titleId==='film').reduce((n,c)=>n+c.amountCents,0);awareness=last.audienceSignals.awarePeople;weekly.push(last.grossCents);weeks++;
  const filmRuns=r.nextState.runs.filter(x=>x.titleId==='film');if(filmRuns.length&&filmRuns.every(x=>x.closed))break;
  input={...input,absoluteWeek:input.absoluteWeek+1,marketState:r.nextState};
 }
 const quote=valueCinemaStreamingRights({titleId:'film',buyerId:'buyer',absoluteWeek:input.absoluteWeek,startsAtAbsoluteWeek:input.absoluteWeek+1,durationWeeks:52,hasRights:true,alreadySigned:false,buyerCashCents:50_000_000_000,unpaidObligationsCents:0,uncertainty:.25,countries:original.cohorts.map(c=>({countryId:c.countryId,reachableHouseholds:Math.floor(c.people/3*.5),interestedHouseholds:Math.floor((last.audienceSignals.countries.find((x:any)=>x.countryId===c.countryId)?.awarePeople||0)/3*.22),deferredHouseholds:Math.floor((last.audienceSignals.countries.find((x:any)=>x.countryId===c.countryId)?.deferredPeople||0)/3),overlapFraction:0,contributionCentsPerHousehold:700}))});
 summaries.push({name,seed,grossCents:gross,producerReceiptsCents:receipts,profitCents:receipts-booking-campaign-original.titles[0].budgetCents,firstAdmissions:first,repeatAdmissions:repeats,awarePeople:awareness,bookingCents:booking,campaignCents:campaign,weeks,runCensored:weeks===maxWeeks,openingGrossCents:opening,forecastLow:forecast.grossCents.low,forecastHigh:forecast.grossCents.high,forecastCovered:opening>=forecast.grossCents.low&&opening<=forecast.grossCents.high,rightsMaximumCents:quote.maximumBidCents,continuedPast3B,peakWeek:weekly.indexOf(Math.max(...weekly))+1});
}
const rows=(name:string)=>summaries.filter(x=>x.name===name);const mean=(name:string,key:string)=>rows(name).reduce((n,r)=>n+r[key],0)/seeds;
const checks:Record<string,boolean>={};
{const a=makeCalibrationFixture('targeted-indie',1),b=structuredClone(a);b.absoluteWeek+=48;checks['old finite exposure loses opening urgency']=simulateCinemaWeek(b).titles[0].firstAdmissions<simulateCinemaWeek(a).titles[0].firstAdmissions/16;}
checks['no free worldwide tickets']=Array.from({length:32},(_,seed)=>{const a=simulateCinemaWeek(makeCinemaMarketFixture('narrow-unknown',seed)),b=simulateCinemaWeek(makeCinemaMarketFixture('wide-unknown',seed));assert.equal(a.titles[0].grossCents,b.titles[0].grossCents);return true}).every(Boolean);
checks['worldwide checkbox cannot create a new audience']=Array.from({length:32},(_,seed)=>{const a=makeCalibrationFixture('targeted-indie',seed),b=structuredClone(a);a.titles[0].market!.countryIds=['US'];a.titles[0].exposure={...a.titles[0].exposure!,events:a.titles[0].exposure!.events.map(e=>({...e,countryIds:['US']}))};b.titles[0].exposure=a.titles[0].exposure;b.titles[0].market!.countryIds=['US','IN','GB'];return simulateCinemaWeek(a).titles[0].grossCents===simulateCinemaWeek(b).titles[0].grossCents}).every(Boolean);
checks['targeted campaign finds more paid viewers']=mean('targeted-indie','firstAdmissions')>mean('no-exposure-indie','firstAdmissions');
checks['strong two-star delivery outlasts weak delivery']=mean('strong-two-stars','repeatAdmissions')>mean('weak-two-stars','repeatAdmissions')&&mean('strong-two-stars','producerReceiptsCents')>mean('weak-two-stars','producerReceiptsCents');
checks['earned buildup improves crossover demand']=mean('earned-crossover','firstAdmissions')>mean('unearned-crossover','firstAdmissions');
checks['earned universe with weak payoff can lose money']=rows('weak-crossover').some(r=>r.profitCents<0)&&mean('weak-crossover','producerReceiptsCents')<mean('earned-crossover','producerReceiptsCents');
checks['cameo cannot equal meaningful returning lead']=mean('meaningful-lead','producerReceiptsCents')>mean('cameo','producerReceiptsCents');
checks['duplicate fan evidence makes no extra people']=rows('earned-crossover').every((r,i)=>r.firstAdmissions===rows('overlapping-favorites')[i].firstAdmissions);
checks['actual precursor streaming catch-up earns familiarity']=mean('streaming-catch-up','firstAdmissions')>mean('unearned-crossover','firstAdmissions');
checks['cadence fatigue has consequences']=mean('continuity-fatigue','firstAdmissions')<mean('earned-crossover','firstAdmissions');
checks['new studio health is not free awareness']=mean('healthy-new-studio','firstAdmissions')===mean('no-exposure-indie','firstAdmissions');
checks['small film can recover its real costs']=rows('targeted-indie').some(r=>r.profitCents>0);
checks['wide weak no-awareness film can lose money']=rows('weak-wide').every(r=>r.profitCents<0);
checks['high-price low-income constrains paid visits']=mean('high-price-low-income','firstAdmissions')<mean('targeted-indie','firstAdmissions');
checks['recession reduces affordable paid visits']=mean('recession','firstAdmissions')<mean('targeted-indie','firstAdmissions');
checks['rivals compete for the same audience resources']=mean('saturated-competition','firstAdmissions')<mean('targeted-indie','firstAdmissions');
checks['local language improves otherwise identical local reach']=Array.from({length:32},(_,seed)=>{const local=makeCalibrationFixture('local-language',seed),foreign=structuredClone(local);foreign.titles[0].market!.languages=['english'];return simulateCinemaWeek(local).titles[0].firstAdmissions>simulateCinemaWeek(foreign).titles[0].firstAdmissions}).every(Boolean);
checks['limited seats constrain opening']=mean('limited-seats','openingGrossCents')<mean('targeted-indie','openingGrossCents');
checks['campaign exposure saturates before spending']=Array.from({length:32},(_,seed)=>{const a=makeCalibrationFixture('campaign-saturation',seed),b=structuredClone(a);b.titles[0].exposure={...b.titles[0].exposure!,events:b.titles[0].exposure!.events.map(e=>({...e,impressions:e.impressions*2,paidCostCents:(e.paidCostCents||0)*2}))};const one=simulateCinemaWeek(a),two=simulateCinemaWeek(b);return two.titles[0].grossCents<one.titles[0].grossCents*2}).every(Boolean);
checks['short announced streaming window reduces theater visits']=mean('short-streaming-window','firstAdmissions')<mean('no-streaming-deal','firstAdmissions');
checks['late word of mouth can grow']=rows('late-sleeper').some(r=>r.peakWeek>1);
checks['viable demand continues beyond old $3B cap']=rows('extreme-demand').every(r=>r.continuedPast3B);
const quantiles=(values:number[])=>{const s=[...values].sort((a,b)=>a-b);return {min:s[0],p10:s[Math.floor((s.length-1)*.1)],p50:s[Math.floor((s.length-1)*.5)],p90:s[Math.floor((s.length-1)*.9)],max:s.at(-1)}};
const distributions=CALIBRATION_CASES.map(name=>({name,runs:seeds,profitable:rows(name).filter(r=>r.profitCents>0).length,censoredRuns:rows(name).filter(r=>r.runCensored).length,forecastCoverage:rows(name).filter(r=>r.forecastCovered).length/seeds,metrics:Object.fromEntries(['grossCents','producerReceiptsCents','profitCents','firstAdmissions','repeatAdmissions','awarePeople','bookingCents','campaignCents','weeks','rightsMaximumCents'].map(k=>[k,quantiles(rows(name).map(r=>r[k]))]))}));
const report={kind:'CONDITIONAL_PURE_KERNEL',schema:1,tuningVersion:CINEMA_MARKET_TUNING_VERSION,seedCount:seeds,caseCount:24,measuredTreatments:26,conditionalRuns:24*seeds,additionalMatchedControls:64,horizonWeeks:maxWeeks,checks,distributions,runs:summaries,limitations:['Authored 3-country aggregate populations/resources, not real career outcome probabilities','Opening scenarios are bounded scenarios, not probabilistic confidence intervals','104-week survivors are right-censored; no forced theater exit','Pure rights quotes use explicit household/resource assumptions, not a signed buyer']};
writeFileSync(process.env.CINEMA_CALIBRATION_OUTPUT||'/private/tmp/actor-cinema-calibration.json',JSON.stringify(report,null,2)+'\n');
for(const [name,ok] of Object.entries(checks))console.log(`${ok?'PASS':'FAIL'} ${name}`);
console.log(`Calibration: ${summaries.length} measured treatments; ${summaries.reduce((n,r)=>n+r.weeks,0)} title-weeks`);assert.ok(Object.values(checks).every(Boolean),'Conditional balance tendencies failed; inspect distributions before tuning');
