import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import type {Player,Genre,Message,AuditionOpportunity} from '../../types';
import {careerActionHarness,enrollThroughApp} from './actorCareerActions';
import {getActorTalent,calculateGenreFit,getPhaseDuration,generateReleasePressQuestions} from '../../services/roleLogic';
import {WORKSHOP_CATALOG,GENRE_TRAINING_CATALOG,IMPROVEMENT_CATALOG} from '../../services/lifestyleLogic';
import {applyCareerAuditionApplication,acceptCareerPartTimeJob} from '../../services/careerApplicationActions';
import {resolveLifeEventFallback} from '../../services/lifeEventFallback';
import {applyCrisisImpact} from '../../services/productionService';
import {syncWeeklyEnergyForCommitments,spendPlayerEnergy} from '../../services/premiumLogic';
import {LIFESTYLE_ACTIVITY_CATALOG,createDefaultLifestyleActivitySelections,resolveLifestyleActivity,buildLifestyleActivityQuote,getLifestyleActivityCooldownWeeks} from '../../services/lifestyleActivities';
import {applyOpportunityIdentityToProject} from '../../services/characterIdentityLogic';
import {normalizeUniverseMap} from '../../services/universeLogic';
import {getAbsoluteWeek} from '../../services/legacyLogic';
import {INSTAGRAM_POST_CONFIGS,calculateInstagramPostOutcome,clampInstagramStat} from '../../services/instagramLogic';
import {applyProjectPromotionAttribution} from '../../services/projectPromotionAttribution';
import {PHASE_ONE_ENERGY_COSTS} from '../../services/energyCosts';

const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
// Only the real UI callbacks are extracted. DOM, toast and React state sinks
// are replaced; pay, audition gates, followers, energy and outcomes are not.
const callbacks=(()=>{
 const found=new Map<string,string>();
 const parse=(path:string,text:string)=>{
  const ast=ts.createSourceFile(path,text,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
  const visit=(n:import('typescript').Node)=>{
   if(ts.isVariableDeclaration(n)&&['handleQuitJob','handleAcceptMessage','handleHireMember','hasEnergyFor','normalizeSponsorshipForActivation','handlePromotionAction','handlePressConferenceComplete','mapPressInteractionsToAwardQuestions','getDominantStyleMessage'].includes(n.name.getText(ast)))found.set(n.name.getText(ast),n.initializer!.getText(ast));
   if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='pick'&&ts.isArrowFunction(n.initializer!)&&ts.isBlock((n.initializer as import('typescript').ArrowFunction).body)){
    const body=(n.initializer as import('typescript').ArrowFunction).body as import('typescript').Block;
    const end=body.statements.findIndex(s=>ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>d.name.getText(ast)==='scene'));
    if(end>=0)found.set('pick',`(idx,opt)=>{${body.statements.slice(0,end).map(s=>s.getText(ast)).join('\n')}}`);
   }
   if(ts.isJsxAttribute(n)&&['onHireAgent','onHireManager','onPerformSponsorship'].includes(n.name.getText(ast))&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression&&ts.isArrowFunction(n.initializer.expression))found.set(n.name.getText(ast),n.initializer.expression.getText(ast));
   if(ts.isJsxAttribute(n)&&n.name.getText(ast)==='onPost'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression){const value=n.initializer.expression.getText(ast);if(value.includes('calculateInstagramPostOutcome'))found.set('post',value);}
   ts.forEachChild(n,visit);
  };visit(ast);
 };
 parse('App.tsx',readFileSync('App.tsx','utf8'));
 parse('MobilePage.tsx',readFileSync('views/mobile/MobilePage.tsx','utf8'));
 parse('useGameActions.ts',readFileSync('hooks/useGameActions.ts','utf8'));
 parse('PressConferenceEvent.tsx',readFileSync('views/PressConferenceEvent.tsx','utf8'));
 parse('AwardNightFlow.tsx',readFileSync('views/AwardNightFlow.tsx','utf8'));
 parse('TeamApp.tsx',readFileSync('views/mobile/TeamApp.tsx','utf8'));
 for(const key of ['handleQuitJob','handleAcceptMessage','post'])assert.ok(found.has(key),'Missing exact UI action '+key);
 for(const key of ['onHireAgent','onHireManager','onPerformSponsorship','handlePromotionAction','handlePressConferenceComplete','mapPressInteractionsToAwardQuestions','getDominantStyleMessage','pick','hasEnergyFor','normalizeSponsorshipForActivation'])assert.ok(found.has(key),'Missing real managed action '+key);
 const declarations=[...found].filter(([key])=>!['pick'].includes(key)).map(([key,value])=>`const ${key}=${value};`).join('\n');
 return ts.transpileModule(`let activePressEvent=null;const setActivePressEvent=value=>{activePressEvent=value};${declarations}
 const resolvePress=(indices)=>{let locked=null,statsDelta={},buzzDelta=0,styles=[];
 const setLocked=v=>{locked=v},setStatsDelta=fn=>{statsDelta=fn(statsDelta)},setBuzzDelta=fn=>{buzzDelta=fn(buzzDelta)},setStyles=fn=>{styles=fn(styles)};
 const pick=${found.get('pick')};const questions=mapPressInteractionsToAwardQuestions(activePressEvent.questions);
 questions.forEach((q,i)=>{locked=null;pick(indices[i],q.opts[indices[i]])});
 const result={statsDelta,buzzDelta,styles};const message=getDominantStyleMessage(activePressEvent.project.name,result);handlePressConferenceComplete(statsDelta,buzzDelta,message);return result};
 return {quit:handleQuitJob,accept:handleAcceptMessage,post,hireAgent:onHireAgent,hireManager:onHireManager,hireMember:handleHireMember,perform:onPerformSponsorship,beginPress:handlePromotionAction,event:()=>activePressEvent,resolvePress};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
})();

export const matureCareerUi=(input:Player)=>{
 let current=input;
 const dependencies={props:{player:input},handleGenericUpdate:(fn:(p:Player)=>Player)=>{current=fn(current)},handleUpdatePlayer:(p:Player)=>{current=p},
  setToastMessage:()=>{},showToast:()=>{},tr:(key:string)=>key,syncWeeklyEnergyForCommitments,getPhaseDuration,applyOpportunityIdentityToProject,normalizeUniverseMap,
  INSTAGRAM_POST_CONFIGS,calculateInstagramPostOutcome,clampInstagramStat,spendPlayerEnergy,getAbsoluteWeek,applyProjectPromotionAttribution,
  player:input,setPlayer:(fn:(p:Player)=>Player)=>{current=fn(current)},generateReleasePressQuestions,collaborationSigningEnergyCost:PHASE_ONE_ENERGY_COSTS.COLLABORATION_SIGNING,
  onUpdatePlayer:(p:Player)=>{current=p},guardTeamChange:()=>!input.flags.teamChangeLocked,safeShowToast:()=>{},setSelectedMember:()=>{}};
 const ui=new Function(...Object.keys(dependencies),callbacks)(...Object.values(dependencies));
 return {quit:(id:string)=>{ui.quit(id);return current},post:(type:string,projectId?:string)=>{ui.post(type,'Work, preparation and a new week.',undefined,undefined,projectId);return current},accept:(message:Message)=>{
  assert.ok(input.inbox.some(m=>m.id===message.id&&!m.isExpired),'Only an actual current offer can be accepted');
  assert.ok(['OFFER_ROLE','OFFER_AUDITION','OFFER_NEGOTIATION','OFFER_SPONSORSHIP'].includes(message.type));ui.accept(message);return current;
 },hireAgent:(id:string)=>{assert.ok(!input.flags.teamChangeLocked);const a=input.team.availableAgents.find(a=>a.id===id);assert.ok(a,'Only a current team listing');ui.hireAgent(a);return current},
 hireManager:(id:string)=>{assert.ok(!input.flags.teamChangeLocked);const m=input.team.availableManagers.find(m=>m.id===id);assert.ok(m,'Only a current team listing');ui.hireManager(m);return current},
 hirePublicist:(id:string)=>{const m=input.team.availablePublicists.find(m=>m.id===id);assert.ok(m,'Only a current publicist listing');ui.hireMember(m);return current},
 perform:(id:string)=>{const s=input.activeSponsorships.find(s=>s.id===id);assert.ok(s&&s.requirements.progress<s.requirements.totalRequired&&input.energy.current>=s.requirements.energyCost,'A payable current deliverable and enough energy are required');ui.perform(id,s.requirements.type);return current},
 press:(id:string)=>{assert.ok(input.commitments.some(c=>c.id===id&&c.projectPhase==='POST_PRODUCTION'),'Only a current post-production project can hold this tour');assert.ok(input.energy.current>=25,'Press requires 25 energy');ui.beginPress('PROMO_PRESS_'+id);const event=ui.event();assert.ok(event?.questions.length);
  const indices=event.questions.map((q:any)=>q.options.map((o:any,i:number)=>({i,score:(o.consequences.fame||0)*3+(o.consequences.reputation||0)+(o.consequences.buzz||0)*.1})).sort((a:any,b:any)=>b.score-a.score)[0].i);
  const result=ui.resolvePress(indices);return {player:current,result,answers:event.questions.map((q:any,i:number)=>({question:q.id||q.question,answer:q.options[indices[i]].text,consequences:q.options[indices[i]].consequences}))};
 }};
};

export interface MatureManagedState {pressedProjectIds:string[];agentHireWeek?:number;managerHireWeek?:number}

/** Only information visible before accepting a job; no final quality or future gross. */
export const selectMatureCareerOpportunity=(p:Player)=>{
 const taken=new Set([...p.commitments,...p.pastProjects,...p.activeReleases].map(c=>c.name));
 const candidates:Array<{opportunity:AuditionOpportunity;message?:Message;pay:number;source:'INBOX'|'CASTING_APP';score:number}>=[];
 const add=(opportunity:AuditionOpportunity,pay:number,source:'INBOX'|'CASTING_APP',message?:Message)=>{
  if(!opportunity?.project||taken.has(opportunity.projectName)||opportunity.universeContract&&p.activeUniverseContract)return;
  const fit=calculateGenreFit(p,opportunity.project).fitScore;if(fit<20)return;
  const project=opportunity.project,buzz=String(project.visibleScriptBuzz).toLowerCase(),director=String(project.visibleDirectorTier).toLowerCase();
  const script=/masterpiece/.test(buzz)?30:/great|excellent|high|strong/.test(buzz)?20:/good/.test(buzz)?12:5;
  const crew=/legend/.test(director)?20:/a.list/.test(director)?15:/established|professional/.test(director)?10:4;
  const budget={LOW:3,MID:8,HIGH:14,BLOCKBUSTER:20}[project.budgetTier]||3;
  const billing={MINOR:4,CAMEO:6,SUPPORTING:10,ENSEMBLE:12,LEAD:14}[opportunity.roleType]||4;
  const score=(script+crew+budget+billing+Math.log10(1+Math.max(0,pay))*3)*(.6+.4*fit/100)*(source==='INBOX'?1.05:.85);
  candidates.push({opportunity,pay,source,message,score});
 };
 for(const m of p.inbox)if(!m.isExpired&&['OFFER_ROLE','OFFER_AUDITION','OFFER_NEGOTIATION'].includes(m.type)){
  const opportunity=m.type==='OFFER_NEGOTIATION'?m.data?.opportunity:m.data;
  add(opportunity,m.type==='OFFER_NEGOTIATION'?m.data?.currentOffer:opportunity?.estimatedIncome,'INBOX',m);
 }
 if(p.energy.current>=25)for(const opportunity of p.weeklyOpportunities.auditions)add(opportunity,opportunity.estimatedIncome,'CASTING_APP');
 return candidates.sort((a,b)=>b.score-a.score||a.opportunity.id.localeCompare(b.opportunity.id))[0];
};

/** A decision policy, never a fixture that sets cash, fame, craft or quality.
 * It may take current lead/famous offers, unlike the earlier entry-career policy.
 */
export const createMatureAppCareerPolicy=(seed:number,actions:any[],signed:Map<string,number>,phases:Set<string>,managed:MatureManagedState={pressedProjectIds:[]})=>(input:Player,week:number)=>{
 let p=input;
 const record=(type:string,before:Player,id?:string)=>actions.push({week,type,cost:before.money-p.money,energy:before.energy.current-p.energy.current,projectId:id});
 const update=(type:string,fn:(p:Player)=>Player,id?:string)=>{const before=p;p=fn(p);record(type,before,id)};
 const improve=(id:string)=>{for(const [category,groups] of Object.entries(IMPROVEMENT_CATALOG)){const a=groups.find(g=>g.options.some(o=>o.id===id)),o=a?.options.find(o=>o.id===id);if(a&&o)update('wellbeing:'+id,p=>careerActionHarness(p).improve(category,a.name,o));}};
 while(p.pendingEvents.length){
  const event=p.pendingEvents[0],queue=p.pendingEvents,before=p;
  if(event.data?.lifeEvent){const life=event.data.lifeEvent,index=life.options.findIndex((o:any)=>!o.isGolden);assert.ok(index>=0);const option=life.options[index];p=(typeof option.impact==='function'?option.impact(p):resolveLifeEventFallback(p,life,index,option)).updatedPlayer;}
  else if(['PRODUCTION_CRISIS','DIRECTOR_DECISION'].includes(event.type)){const index=(event.data.options||[]).findIndex((o:any)=>!o.isGolden&&!/\$|\.money\.label|pr\.label|cgi\.label/.test([o.label,o.labelKey].join(' ')));assert.ok(index>=0);p=applyCrisisImpact(p,event,index).updatedPlayer;}
  else throw Error('Unhandled actual career choice '+event.type);
  p.pendingEvents=queue.filter(e=>e.id!==event.id);record('actual-life-choice:'+event.type,before);
 }
 const conditions=p.activeHealthConditions||[];
 if((conditions.length||p.stats.health<65)&&getLifestyleActivityCooldownWeeks(p,'wellness_reset')===0){
  const clinic=LIFESTYLE_ACTIVITY_CATALOG.find(a=>a.id==='wellness_reset')!,ids=conditions.map(c=>c.conditionId).join(' ');
  const choices={...createDefaultLifestyleActivitySelections(clinic),wellnessProviderId:p.money>20000?'private_doctor':'public_clinic',wellnessProgramId:/pain|injury|fracture/.test(ids)?'injury_rehab':/flu|respiratory/.test(ids)?'flu_care':/burnout|anxiety|sleep/.test(ids)?'stress_burnout':'regular_checkup',wellnessFocusId:conditions.length?'advanced_treatment':'full_diagnosis',wellnessSupportId:'followup_visit'};
  const quote=buildLifestyleActivityQuote(clinic,choices,p);if(p.money>=quote.totalCost+1000)update('paid-clinic',p=>{const result=resolveLifestyleActivity(p,clinic,choices);return result.success?result.player:p});
 }
 if(p.stats.health<78)improve('opt_checkup');if(p.stats.body<60)improve('opt_jog');if(p.stats.happiness<70)improve('opt_meditate');
 // Current listings only, paid through the same UI callbacks as a player.
 // Annual contracts and a year's publicist cost must fit within existing cash.
 const tier={ROOKIE:1,STANDARD:2,ELITE:3,LEGEND:4};
 if(!p.flags.teamChangeLocked){
  const a=p.team.availableAgents.filter(a=>a.annualFee<=p.money*.18&&p.money-a.annualFee>=100000&&(!p.team.agent||week-(managed.agentHireWeek??week)>=104&&tier[a.tier]>tier[p.team.agent.tier]))
   .sort((a,b)=>tier[b.tier]-tier[a.tier]||Number(b.specialty==='FILM')-Number(a.specialty==='FILM')||a.annualFee-b.annualFee)[0];
  const m=p.team.availableManagers.filter(m=>m.annualFee<=p.money*.12&&p.money-m.annualFee>=100000&&(!p.team.manager||week-(managed.managerHireWeek??week)>=104&&m.sponsorshipPower>p.team.manager.sponsorshipPower))
   .sort((a,b)=>b.sponsorshipPower-a.sponsorshipPower||a.annualFee-b.annualFee)[0];
  const publicist=!p.team.publicist?p.team.availablePublicists.filter(m=>m.weeklyCost*52<=p.money*.1).sort((a,b)=>tier[b.tier]-tier[a.tier]||a.weeklyCost-b.weeklyCost)[0]:undefined;
  if(a){update('hire-current-agent',p=>matureCareerUi(p).hireAgent(a.id));managed.agentHireWeek=week;actions.at(-1).terms={...a};}
  else if(m){update('hire-current-manager',p=>matureCareerUi(p).hireManager(m.id));managed.managerHireWeek=week;actions.at(-1).terms={...m};}
  else if(publicist){update('hire-current-publicist',p=>matureCareerUi(p).hirePublicist(publicist.id));actions.at(-1).terms={...publicist};}
 }
 const press=p.commitments.find(c=>c.type==='ACTING_GIG'&&c.projectPhase==='POST_PRODUCTION'&&!managed.pressedProjectIds.includes(c.id));
 if(press&&p.energy.current>=25){const before=p,result=matureCareerUi(p).press(press.id);p=result.player;managed.pressedProjectIds.push(press.id);record('actual-press-tour',before,press.id);actions.at(-1).answers=result.answers;actions.at(-1).earned=result.result;}
 if(p.team.manager&&p.activeSponsorships.length<1&&p.energy.current>=PHASE_ONE_ENERGY_COSTS.COLLABORATION_SIGNING+30){
  const offer=p.inbox.filter(m=>!m.isExpired&&m.type==='OFFER_SPONSORSHIP'&&m.data?.requirements?.type==='POST').sort((a,b)=>b.data.weeklyPay-a.data.weeklyPay)[0];
  if(offer){update('sign-current-sponsorship',p=>matureCareerUi(p).accept(offer));actions.at(-1).terms={...offer.data};}
 }
 for(const s of [...p.activeSponsorships]){const remaining=Math.max(0,s.requirements.totalRequired-s.requirements.progress),due=Math.min(remaining,Math.ceil(remaining/Math.max(1,s.durationWeeks-(s.weeksCompleted||0))));
  for(let n=0;n<due&&p.energy.current>=s.requirements.energyCost+20;n++)update('actual-sponsor-deliverable',p=>matureCareerUi(p).perform(s.id),s.id);
 }
 const busy=()=>p.commitments.some(c=>c.type==='ACTING_GIG'&&['AUDITION','PRE_PRODUCTION','PRODUCTION','SCHEDULED'].includes(c.projectPhase||''));
 if(busy()&&p.money>5000)for(const job of p.commitments.filter(c=>c.type==='JOB'&&!c.projectDetails))update('quit-part-time-for-film',p=>matureCareerUi(p).quit(job.id));
 if(!busy()&&p.money<20000&&!p.commitments.some(c=>c.type==='JOB'&&!c.projectDetails)){
  const job=p.weeklyOpportunities.jobs.filter(j=>j.energyCost<=25).sort((a,b)=>b.income/Math.max(1,b.energyCost)-a.income/Math.max(1,a.energyCost))[0];if(job)update('accept-paid-job',p=>acceptCareerPartTimeJob(p,job));
 }
 // Train a pronounced weak craft before another booking rather than spending
 // an entire career accepting whichever inbox offer arrives first.
 const needsCraft=Math.min(...(['delivery','memorization','expression','improvisation','discipline','presence','charisma'] as const).map(k=>p.stats.skills[k]))<55;
 if(!busy()&&!p.commitments.some(c=>c.type==='COURSE')&&needsCraft){
  const course=WORKSHOP_CATALOG.filter(c=>c.skillGains&&(c.upfrontCost||0)+5000<=p.money&&c.energyCost<=30).map(c=>({c,score:Object.entries(c.skillGains!).reduce((n,[k,g])=>n+Math.max(0,65-(p.stats.skills as any)[k])*Number(g),0)/Math.max(1,c.energyCost)})).sort((a,b)=>b.score-a.score)[0]?.c;
  if(course&&p.energy.current>=course.energyCost)update('paid-foundation-course:'+course.id,p=>enrollThroughApp(p,course));
 }
 if(!busy()&&!p.applications.length&&!(needsCraft&&p.commitments.some(c=>c.type==='COURSE'))){
  const selected=selectMatureCareerOpportunity(p);
  if(selected){const offer=selected.opportunity;if(selected.message)update('accept-current-offer:'+offer.roleType,p=>matureCareerUi(p).accept(selected.message!),offer.id);
   else update('apply:'+offer.roleType,p=>applyCareerAuditionApplication(p,offer,'mature-'+seed+'-'+week),offer.id);
   actions.at(-1).choice={source:selected.source,score:selected.score,pay:selected.pay,genre:offer.project.genre,scriptBuzz:offer.project.visibleScriptBuzz,directorTier:offer.project.visibleDirectorTier};}
 }
 const working=p.commitments.find(c=>c.type==='ACTING_GIG'&&['AUDITION','PRE_PRODUCTION','PRODUCTION'].includes(c.projectPhase||''));
 const crossTrain=(['ACTION','SUPERHERO','FANTASY'] as Genre[]).find(g=>(p.stats.genreXP[g]||0)<60);
 const trainingGenre=working?.projectDetails?.genre&&(p.stats.genreXP[working.projectDetails.genre]||0)<35?working.projectDetails.genre:crossTrain;
 const paidTraining=GENRE_TRAINING_CATALOG.find(g=>g.genre===trainingGenre);
 if(paidTraining&&p.money>=paidTraining.cost+5000&&p.energy.current>=paidTraining.energy+40)update('genre:'+paidTraining.genre,p=>careerActionHarness(p).improve('GENRE',paidTraining.genre,{id:'genre',label:paidTraining.label,energyCost:paidTraining.energy,moneyCost:paidTraining.cost,gains:{},risk:0,description:paidTraining.desc}));
 for(const c of [...p.commitments])if(c.type==='ACTING_GIG'){
  signed.set(c.id,signed.get(c.id)??c.lumpSum??0);assert.equal(c.lumpSum||0,signed.get(c.id));phases.add(c.projectPhase||'');
  if(['AUDITION','PRE_PRODUCTION','PRODUCTION'].includes(c.projectPhase||'')){let n=0;while(p.energy.current>=(c.projectPhase==='PRE_PRODUCTION'?10:20)&&n++<10){const before=p;update('project-rehearsal',p=>careerActionHarness(p).rehearse(c.id),c.id);if(p===before)break;}}
 }
 if(!busy()&&!p.commitments.some(c=>c.type==='COURSE')&&getActorTalent(p.stats.skills)<90){
  const course=WORKSHOP_CATALOG.filter(c=>c.skillGains&&(c.upfrontCost||0)+5000<=p.money&&c.energyCost<=30)
   .map(c=>({c,score:Object.entries(c.skillGains!).reduce((n,[k,g])=>n+Math.max(0,90-(p.stats.skills as any)[k])*Number(g),0)/Math.max(1,c.energyCost)})).sort((a,b)=>b.score-a.score)[0]?.c;
  if(course&&p.energy.current>=course.energyCost)update('paid-course:'+course.id,p=>enrollThroughApp(p,course));
 }
 const project=p.commitments.find(c=>c.type==='ACTING_GIG'),genre:Genre=project?.projectDetails?.genre||'DRAMA',training=GENRE_TRAINING_CATALOG.find(g=>g.genre===genre);
 if(!busy()&&training&&p.stats.genreXP[genre]<85&&p.money>=training.cost+5000&&p.energy.current>=training.energy+15)update('genre:'+genre,p=>careerActionHarness(p).improve('GENRE',genre,{id:'genre',label:training.label,energyCost:training.energy,moneyCost:training.cost,gains:{},risk:0,description:training.desc}));
 const postType=project?(project.projectPhase==='POST_PRODUCTION'?'ANNOUNCEMENT':'BTS'):'REEL';
 if(p.energy.current>=INSTAGRAM_POST_CONFIGS[postType].energy)update('actual-weekly-instagram:'+postType,p=>matureCareerUi(p).post(postType,project?.id),project?.id);
 return p;
};
