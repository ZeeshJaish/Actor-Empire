import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Reads only the audit report, never the user's game-save store or full world.
const [input,output]=process.argv.slice(2);
assert.ok(input&&output,'Provide the retained career report and output JSON path');
const bytes=readFileSync(input),r=JSON.parse(bytes);
assert.equal(r.manualCapitalGrants,0);assert.equal(r.authoredCompletedPackages,0);assert.equal(r.loansTaken,0);
assert.equal(r.failure,undefined);assert.equal(r.origin.initialCash,2000);
assert.equal(r.replays,r.weeks);
const films=[...new Map(r.films.map(f=>[f.id,f])).values()];
assert.equal(films.length,r.films.length,'No duplicate film observations');
const own=films.filter(f=>f.ownCredit),financials=new Map(r.summary.rows.map(f=>[f.id,f]));
const matureAt=r.curve.find(p=>p.craft>=80&&p.fame>=70)?.weeks;
const film=f=>({id:f.id,name:f.name,ownCredit:f.ownCredit,closed:f.closed,quality:f.quality,
 productionDollars:f.budgetCents===null?null:f.budgetCents/100,campaignDollars:f.campaignCents===null?null:f.campaignCents/100,
 grossDollars:f.grossCents/100,producerReceiptsDollars:f.receiptsCents/100,
 theatricalProfitDollars:financials.has(f.id)?financials.get(f.id).theatricalProfitCents/100:null,
 actorBackendDollars:f.actorPaidCents/100,
 paidWeeks:f.weekly.filter(w=>w.grossCents>0).length,
 trackedRunWeeks:f.weekly.length,
 firstObservedCareerWeek:f.weekly[0]?.week,lastObservedCareerWeek:f.weekly.at(-1)?.week});
const top=xs=>xs.toSorted((a,b)=>b.grossCents-a.grossCents).slice(0,5).map(film);
const count=xs=>[1,2,3].map(b=>({grossBillions:b,observed:xs.length,attained:xs.filter(f=>f.grossCents>=b*1e11).length,closedAttained:xs.filter(f=>f.closed&&f.grossCents>=b*1e11).length}));
const tours=r.actions.filter(a=>a.type==='actual-press-tour');
assert.equal(new Set(tours.map(a=>a.projectId)).size,tours.length,'No repeated policy press tour');
const result={status:r.status,completeObservation:r.status==='HORIZON_COMPLETE'||r.status==='CAREER_ENDED',
 sourceRef:r.origin.sourceRef,executable:r.executable,inputReport:input,inputSha256:createHash('sha256').update(bytes).digest('hex'),
 weeks:r.weeks,origin:r.origin,lineage:r.lineage,ownerCapitalMilestone:r.ownerCapitalMilestone,finalCashDollars:r.cash,finalProfile:r.curve.at(-1),firstObservedStarProfileWeek:matureAt,
 safeguards:{manualCapitalGrants:0,authoredCompletedPackages:0,loans:0,saves:r.saves,reloads:r.reloads,duplicateWeeksRejected:r.replays,failedPromotionRecovery:r.failedPromotionChecked},
 filmCounts:{released:films.length,closed:r.summary.completed,open:r.summary.open,playerCredits:own.length,playerClosed:own.filter(f=>f.closed).length},
 attainment:{player:count(own),world:count(films)},
 closedFinancialOutcomes:{all:r.summary.all,small:r.summary.small,player:r.summary.player},
 topPlayer:top(own),topWorld:top(films),
 management:r.actions.filter(a=>a.type.startsWith('hire-current')).map(a=>({week:a.week,type:a.type,cost:a.cost,terms:a.terms})),
 actualPressTours:tours.length,actualSponsorsSigned:r.actions.filter(a=>a.type==='sign-current-sponsorship').length,
 positiveLifeChoiceCash:r.actions.filter(a=>a.type.startsWith('actual-life-choice')&&a.cost<0).map(a=>({week:a.week,type:a.type,dollars:-a.cost})),
 conclusion:own.some(f=>f.grossCents>=2e11)?'ORGANIC_PLAYER_2B_ATTAINMENT_OBSERVED':'ORGANIC_PLAYER_2B_NOT_VERIFIED',
 limitations:['One adaptive longitudinal career is a capability probe, not a hit-rate or rarity estimate',
 'World NPC film gross and player-credited film gross are reported separately',
 'No owned studio or self-financed production is claimed unless actually founded through paid gameplay',
 'Open theatrical runs are interim observations; future streaming income is excluded',
 'Controlled UI-adapter cases and prior prepared-capital examples are excluded']};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,weeks:r.weeks,cash:r.cash,playerTop:result.topPlayer[0]?.grossDollars,worldTop:result.topWorld[0]?.grossDollars,conclusion:result.conclusion}));
