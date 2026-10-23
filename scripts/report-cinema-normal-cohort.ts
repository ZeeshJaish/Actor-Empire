import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {summarizeCareerFilms} from './fixtures/cinemaCareerCohortMetrics';
const out=process.env.CAREER_OUTPUT!,target=process.env.CAREER_REPORT_OUTPUT||out+'/summary.json';
assert.ok(out);
const seeds=(process.env.CAREER_SEEDS||'0,1,2,3').split(',').map(Number);
const releaseCutoff=Number(process.env.CAREER_RELEASE_CUTOFF||104);
assert.ok(Number.isInteger(releaseCutoff)&&releaseCutoff>0);
const careers=seeds.map(seed=>JSON.parse(readFileSync(`${out}/career-${seed}.json`,'utf8')));
assert.equal(new Set(careers.map(c=>c.executable)).size,1,'Do not pool different simulation executables');
for(const c of careers){assert.ok(['HORIZON_COMPLETE','CAREER_ENDED','UNFUNDED'].includes(c.status),`Seed ${c.seed} is not finished`);assert.ok(c.failedPromotionChecked);assert.equal(c.replays,c.weeks);}
const quantiles=(xs:number[])=>{if(!xs.length)return null;xs.sort((a,b)=>a-b);return {min:xs[0],median:xs[Math.floor(xs.length/2)],p90:xs[Math.ceil((xs.length-1)*.9)],max:xs.at(-1)}};
const all=careers.flatMap(c=>c.films.map((f:any)=>({...f,id:`world-${c.seed}:${f.id}`,canonicalId:f.id,seed:c.seed})));
for(const f of all){assert.equal((f.weekly||[]).reduce((n:number,w:any)=>n+w.grossCents,0),f.grossCents,'Weekly paid history must reconcile with lifetime receipts');}
const summary=summarizeCareerFilms(all),early=all.filter(f=>f.weekly[0]?.week<=releaseCutoff);
const packages=new Set(all.map(f=>JSON.stringify([f.canonicalId,f.owner,f.genre,f.quality,f.budgetCents,f.campaignCents,f.universeId])));
const closed=summary.rows.map((f:any)=>{
    let cumulative=0,week95:number|null=null;f.weekly.forEach((w:any,i:number)=>{cumulative+=w.grossCents;if(week95===null&&f.grossCents>0&&cumulative>=f.grossCents*.95)week95=i+1});
    return {...f,runWeeks:f.weekly.length,week95};
});
const rate=(n:number,d:number)=>d?n/d*100:null;
const report={kind:'FOUR_NORMAL_CAREERS_PINNED_SOURCE',executable:careers[0].executable,
    careers:careers.map(c=>({seed:c.seed,genre:c.genre,status:c.status,weeks:c.weeks,cash:c.cash,alive:c.alive,skill:c.skill,
        saves:c.saves,reloads:c.reloads,replays:c.replays,failedPromotionChecked:c.failedPromotionChecked,summary:c.summary})),
    weeks:careers.reduce((n,c)=>n+c.weeks,0),saves:careers.reduce((n,c)=>n+c.saves,0),reloads:careers.reduce((n,c)=>n+c.reloads,0),replays:careers.reduce((n,c)=>n+c.replays,0),
    filmObservations:all.length,distinctCanonicalIds:new Set(all.map(f=>f.canonicalId)).size,distinctPackageIdentities:packages.size,
    summary,rates:{recoupedPercent:rate(summary.all.recouped,summary.all.completed),financialHitPercent:rate(summary.all.hits,summary.all.completed),
        nearBreakEvenPercent:rate(summary.all.nearBreakEven,summary.all.completed),lossBeyondFivePercent:rate(summary.all.losses,summary.all.completed),
        smallRecoupedPercent:rate(summary.small.recouped,summary.small.completed)},
    nearBreakEvenDetail:{belowCost:summary.rows.filter(f=>f.status==='NEAR_BREAK_EVEN'&&f.theatricalProfitCents<0).length,
        atOrAboveCost:summary.rows.filter(f=>f.status==='NEAR_BREAK_EVEN'&&f.theatricalProfitCents>=0).length,
        smallBelowCost:summary.rows.filter(f=>f.budgetCents!<=25e8&&f.status==='NEAR_BREAK_EVEN'&&f.theatricalProfitCents<0).length,
        smallAtOrAboveCost:summary.rows.filter(f=>f.budgetCents!<=25e8&&f.status==='NEAR_BREAK_EVEN'&&f.theatricalProfitCents>=0).length},
    earlyReleaseCohort:{definition:`Films entering cinema in the first ${releaseCutoff} career weeks, observed through each career horizon or ending; incomplete runs remain censored`,
        releaseCutoff,minimumFollowUpWeeksByCareer:careers.map(c=>({seed:c.seed,weeks:Math.max(0,c.weeks-releaseCutoff)})),summary:summarizeCareerFilms(early)},
    budgetBands:[['<=25M',0,25e8],['25–80M',25e8,80e8],['>80M',80e8,Infinity]].map(([name,min,max])=>({name,summary:summarizeCareerFilms(all.filter(f=>f.budgetCents!==null&&f.budgetCents>(min as number)&&f.budgetCents<=(max as number))).all})),
    qualityBands:[['<50',0,50],['50–74',50,75],['75+',75,101]].map(([name,min,max])=>({name,summary:summarizeCareerFilms(all.filter(f=>typeof f.quality==='number'&&f.quality>=(min as number)&&f.quality<(max as number))).all})),
    smallQualityBands:[['<50',0,50],['50–74',50,75],['75+',75,101]].map(([name,min,max])=>({name,summary:summarizeCareerFilms(all.filter(f=>f.budgetCents!==null&&f.budgetCents<=25e8&&typeof f.quality==='number'&&f.quality>=(min as number)&&f.quality<(max as number))).all})),
    runWeeks:quantiles(closed.map(f=>f.runWeeks)),week95:quantiles(closed.filter(f=>f.week95!==null).map(f=>f.week95!)),
    smallResults:closed.filter(f=>f.budgetCents<=25e8),playerResults:closed.filter(f=>f.ownCredit),
    largest:all.sort((a,b)=>b.grossCents-a.grossCents).slice(0,10),peakWorkerRssMiB:Math.max(...careers.map(c=>c.peakRssBytes))/1048576,
    definitions:{recoupment:'Theatrical producer receipts cover production, campaign, booking and paid backend; investor ownership distributions excluded',
        financialHit:'Theatrical project profit is at least 60% of production budget, matching the normal NPC financial-hit hurdle',nearBreakEven:'Absolute profit or deficit within 5% of total modeled paid costs; exact deficits remain deficits',
        billionAttainment:'Measured public gross crossed the threshold; recent open films can still grow, so attainment is not a final lifetime probability'},
    limitations:['Fixed sustainable actor policies over four early careers, not every career path or a universal player-wide probability',
        `All-completed rates can favor short runs; the first-${releaseCutoff}-weeks release cohort is provided as a follow-up check`,
        'Company/title identities can recur across seeded worlds; observations are correlated, so no independent-binomial confidence interval is claimed',
        'Future streaming, soundtrack and merchandise receipts are excluded from theatrical results; a theater loss is not a final all-media loss',
        'Prepared established-owner attainability cases are excluded from these normal-career rates']};
writeFileSync(target,JSON.stringify(report,null,2));
console.log(JSON.stringify({weeks:report.weeks,filmObservations:report.filmObservations,distinctPackages:packages.size,all:summary.all,small:summary.small,player:summary.player,rates:report.rates,billionAttainment:summary.billionAttainment,runWeeks:report.runWeeks,week95:report.week95},null,2));
