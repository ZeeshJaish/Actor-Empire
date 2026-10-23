import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import type {Player,Genre,Message,AuditionOpportunity} from '../../types';
import {careerActionHarness,enrollThroughApp} from './actorCareerActions';
import {getActorTalent,calculateGenreFit,getPhaseDuration} from '../../services/roleLogic';
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

const ts:typeof import('typescript')=createRequire(process.cwd()+'/package.json')('typescript');
// Only the real UI callbacks are extracted. DOM, toast and React state sinks
// are replaced; pay, audition gates, followers, energy and outcomes are not.
const callbacks=(()=>{
 const found=new Map<string,string>();
 const parse=(path:string,text:string)=>{
  const ast=ts.createSourceFile(path,text,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
  const visit=(n:import('typescript').Node)=>{
   if(ts.isVariableDeclaration(n)&&['handleQuitJob','handleAcceptMessage'].includes(n.name.getText(ast)))found.set(n.name.getText(ast),n.initializer!.getText(ast));
   if(ts.isJsxAttribute(n)&&n.name.getText(ast)==='onPost'&&n.initializer&&ts.isJsxExpression(n.initializer)&&n.initializer.expression){const value=n.initializer.expression.getText(ast);if(value.includes('calculateInstagramPostOutcome'))found.set('post',value);}
   ts.forEachChild(n,visit);
  };visit(ast);
 };
 parse('App.tsx',readFileSync('App.tsx','utf8'));
 parse('MobilePage.tsx',readFileSync('views/mobile/MobilePage.tsx','utf8'));
 for(const key of ['handleQuitJob','handleAcceptMessage','post'])assert.ok(found.has(key),'Missing exact UI action '+key);
 return ts.transpileModule(`const quit=${found.get('handleQuitJob')};const accept=${found.get('handleAcceptMessage')};const post=${found.get('post')};return {quit,accept,post};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
})();

export const matureCareerUi=(input:Player)=>{
 let current=input;
 const dependencies={props:{player:input},handleGenericUpdate:(fn:(p:Player)=>Player)=>{current=fn(current)},handleUpdatePlayer:(p:Player)=>{current=p},
  setToastMessage:()=>{},showToast:()=>{},tr:(key:string)=>key,syncWeeklyEnergyForCommitments,getPhaseDuration,applyOpportunityIdentityToProject,normalizeUniverseMap,
  INSTAGRAM_POST_CONFIGS,calculateInstagramPostOutcome,clampInstagramStat,spendPlayerEnergy,getAbsoluteWeek,applyProjectPromotionAttribution};
 const ui=new Function(...Object.keys(dependencies),callbacks)(...Object.values(dependencies));
 return {quit:(id:string)=>{ui.quit(id);return current},post:(type:string,projectId?:string)=>{ui.post(type,'Work, preparation and a new week.',undefined,undefined,projectId);return current},accept:(message:Message)=>{
  assert.ok(input.inbox.some(m=>m.id===message.id&&!m.isExpired),'Only an actual current offer can be accepted');
  assert.ok(['OFFER_ROLE','OFFER_AUDITION','OFFER_NEGOTIATION'].includes(message.type));ui.accept(message);return current;
 }};
};

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
export const createMatureAppCareerPolicy=(seed:number,actions:any[],signed:Map<string,number>,phases:Set<string>)=>(input:Player,week:number)=>{
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
