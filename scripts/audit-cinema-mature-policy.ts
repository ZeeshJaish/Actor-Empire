import assert from 'node:assert/strict';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {matureCareerUi,createMatureAppCareerPolicy} from './fixtures/cinemaMatureAppPolicy';
import * as maturePolicy from './fixtures/cinemaMatureAppPolicy';
import {INSTAGRAM_POST_CONFIGS} from '../services/instagramLogic';
import type {Player,Message,AuditionOpportunity} from '../types';

const origin=readCinemaAuditCheckpoint<any>(process.env.CAREER_ORIGIN_CHECKPOINT!);
assert.ok(origin?.player,'Use the actual earned origin for these adapter checks');
const fresh=()=>structuredClone(origin.player) as Player;
let passed=0;
{
 const choose=(maturePolicy as any).selectMatureCareerOpportunity;
 assert.equal(typeof choose,'function','The mature policy needs one comparison across inbox and Casting App choices');
 const p=fresh(),base=structuredClone(p.weeklyOpportunities.auditions[0]);
 const weak:AuditionOpportunity={...base,id:'weak-direct',projectName:'Weak direct case',roleType:'LEAD',estimatedIncome:25000,project:{...base.project,genre:'DRAMA',budgetTier:'LOW',visibleScriptBuzz:'Unknown',visibleDirectorTier:'Indie'}};
 const strong:AuditionOpportunity={...base,id:'strong-audition',projectName:'Strong current audition case',roleType:'SUPPORTING',estimatedIncome:60000,project:{...base.project,genre:'DRAMA',budgetTier:'BLOCKBUSTER',visibleScriptBuzz:'Masterpiece',visibleDirectorTier:'Legend'}};
 p.commitments=[];p.activeReleases=[];p.pastProjects=[];p.inbox=[{id:'current-direct',type:'OFFER_ROLE',data:weak,isExpired:false} as Message];p.weeklyOpportunities.auditions=[strong];
 assert.equal(choose(p).opportunity.id,strong.id,'An inbox offer must not automatically hide a stronger current audition');passed++;
 const before=choose(p).score;strong.project.hiddenStats={...strong.project.hiddenStats,qualityScore:1};assert.equal(choose(p).score,before);strong.project.hiddenStats.qualityScore=100;assert.equal(choose(p).score,before,'Secret final quality cannot guide the policy');passed++;
}
{
 const p=fresh(),opp=p.weeklyOpportunities.auditions.find(o=>!o.universeContract)!;assert.ok(opp);
 // Controlled adapter case only. This synthetic inbox wrapper never enters a
 // career run, and the actual currently quoted project/pay remain unchanged.
 const message={id:'adapter-current-offer',type:'OFFER_ROLE',isExpired:false,data:opp} as Message;
 p.inbox=[message];const next=matureCareerUi(p).accept(message);
 assert.equal(next.money,p.money,'Single-film signing cannot invent a cash payment');
 const gig=next.commitments.at(-1)!;assert.equal(gig.lumpSum,opp.estimatedIncome);assert.equal(gig.projectDetails?.estimatedBudget,opp.project.estimatedBudget);
 assert.equal(gig.projectPhase,'PRE_PRODUCTION');assert.equal(next.inbox.length,0);passed++;
 assert.throws(()=>matureCareerUi(next).accept(message),/actual current offer/,'The policy must not re-accept a removed message');passed++;
}
{
 let p=fresh();p.instagram.lastPostWeek=0;p.instagram.weeklyPostCount=0;
 const beforeCash=p.money,beforeEnergy=p.energy.current,beforeFollowers=p.stats.followers;
 p=matureCareerUi(p).post('REEL');
 assert.equal(p.money,beforeCash);assert.equal(p.energy.current,beforeEnergy-INSTAGRAM_POST_CONFIGS.REEL.energy);assert.ok(p.stats.followers>beforeFollowers);assert.equal(p.instagram.weeklyPostCount,1);passed++;
 // Cap remains the actual UI cap; the career policy uses only one post/week.
 while(p.instagram.weeklyPostCount<3&&p.energy.current>=INSTAGRAM_POST_CONFIGS.REEL.energy)p=matureCareerUi(p).post('REEL');
 if(p.instagram.weeklyPostCount===3){const followers=p.stats.followers,energy=p.energy.current;p=matureCareerUi(p).post('REEL');assert.equal(p.stats.followers,followers);assert.equal(p.energy.current,energy);passed++;}
}
{
 const p=fresh(),job=p.commitments.find(c=>c.type==='JOB'&&!c.projectDetails)!;assert.ok(job);
 const gigs=p.commitments.filter(c=>c.type==='ACTING_GIG').map(c=>({id:c.id,pay:c.lumpSum,performance:c.productionPerformance}));
 const next=matureCareerUi(p).quit(job.id);assert.ok(!next.commitments.some(c=>c.id===job.id));assert.equal(next.money,p.money);assert.deepEqual(next.commitments.filter(c=>c.type==='ACTING_GIG').map(c=>({id:c.id,pay:c.lumpSum,performance:c.productionPerformance})),gigs);passed++;
}
{
 const p=fresh(),actions:any[]=[],signed=new Map<string,number>(),beforeCash=p.money;
 const next=createMatureAppCareerPolicy(0,actions,signed,new Set())(p,156);
 assert.ok(next.money<=beforeCash,'This production week has expenses and cannot invent capital');
 assert.ok(actions.some(a=>a.type==='quit-part-time-for-film'));
 assert.ok(actions.filter(a=>a.type.startsWith('actual-weekly-instagram')).length<=1);
 for(const [id,pay] of signed)assert.equal(next.commitments.find(c=>c.id===id)?.lumpSum,pay);passed++;
}
console.log(JSON.stringify({passed,failures:0,kind:'UI_ADAPTER_CASES_EXCLUDED_FROM_NORMAL_CAREER_RESULTS'}));
