import {applyCareerAuditionApplication,acceptCareerPartTimeJob} from '../../services/careerApplicationActions';
/** Authored action policy, not a skill/cash grant. Mirrors current App action costs. */
import {resolveLifeEventFallback} from '../../services/lifeEventFallback';
import {applyCrisisImpact} from '../../services/productionService';
import type {Player} from '../../types';
import {IMPROVEMENT_CATALOG,GENRE_TRAINING_CATALOG} from '../../services/lifestyleLogic';
import {calculateAuditionGain,calculateProductionGain,calculateGenreFit,rewardGenreExperience,ROLE_DEFINITIONS} from '../../services/roleLogic';
import {spendPlayerEnergy,syncWeeklyEnergyForCommitments} from '../../services/premiumLogic';
import {getAbsoluteWeek} from '../../services/legacyLogic';
import {LIFESTYLE_ACTIVITY_CATALOG,createDefaultLifestyleActivitySelections,resolveLifestyleActivity,buildLifestyleActivityQuote} from '../../services/lifestyleActivities';
import {applyProjectPromotionAttribution} from '../../services/projectPromotionAttribution';

export interface CareerAction {week:number;action:string;cashBefore:number;cashAfter:number;energy:number;projectId?:string}
export const prepareOrdinaryCinemaWeek=(source:Player,actions:CareerAction[]):Player=>{
 let player=source;
 const record=(action:string,cashBefore:number,energy:number,projectId?:string)=>actions.push({week:getAbsoluteWeek(player.age,player.currentWeek),action,cashBefore,cashAfter:player.money,energy,projectId});
 // Resolve the same unmonetized choices the full App presents, before advancing.
 while(player.pendingEvents.length){
  const event=player.pendingEvents[0],queue=player.pendingEvents,before=player.money;
  if(event.type==='LIFE_EVENT'&&event.data?.lifeEvent){
   const life=event.data.lifeEvent,options=life.options;
   const preferred=options.findIndex((o:any)=>o.labelKey==='life.event.early.sideHustle.auditions.label'||o.label==='Focus on Auditions');
   const index=preferred>=0?preferred:options.findIndex((o:any)=>!o.isGolden);
   if(index<0)throw new Error('No ordinary unmonetized life choice');
   const option=options[index],result=typeof option.impact==='function'?option.impact(player):resolveLifeEventFallback(player,life,index,option);
   player=result.updatedPlayer;
   if(result.feedbackDelay&&result.feedbackType)(player.flags.pendingFeedback ||= []).push({type:result.feedbackType,weeksLeft:result.feedbackDelay});
   record('Life choice: '+(option.labelKey||option.label),before,0);
  }else if(event.type==='PRODUCTION_CRISIS'||event.type==='DIRECTOR_DECISION'){
   const options=event.data.options||[];
   // Generated crises store empty labels; their money key still charges $25k.
   const index=options.findIndex((o:any)=>!o.isGolden&&!/\$|pr\.label|cgi\.label|\.money\.label/i.test([o.labelKey,o.label].join(' ')));
   if(index<0)throw new Error('No ordinary affordable production choice');
   player=applyCrisisImpact(player,event,index).updatedPlayer;record('Production choice: '+(options[index].labelKey||options[index].label),before,0);
  }else throw new Error('Ordinary journey needs an actual choice handler for '+event.type);
  player.pendingEvents=queue.filter(e=>e.id!==event.id);
 }
 const improve=(id:string)=>{
  const option=Object.values(IMPROVEMENT_CATALOG).flatMap(a=>a.flatMap(x=>x.options)).find(o=>o.id===id)!;
  if(player.money<option.moneyCost||player.energy.current<option.energyCost)return;
  const before=player.money;player.money-=option.moneyCost;spendPlayerEnergy(player,option.energyCost,option.label);
  const roll=Math.random()*100;
  for(const [key,val] of Object.entries(option.gains)){
   if(typeof val!=='number')continue;
   const stats=key in player.stats&&key!=='skills'?player.stats:player.stats.skills;
   const current=Number((stats as any)[key]);(stats as any)[key]=Math.min(100,Math.max(0,current+val*(current>80?.5:1)));
   if(roll>90)(stats as any)[key]=Math.min(100,(stats as any)[key]+1);
  }
  if(roll<option.risk)player.stats.happiness=Math.max(0,player.stats.happiness-5);
  record(option.label,before,option.energyCost);
 };
 // Real unpaid actions maintain wellbeing; unused energy is not treatment.
 if(player.stats.body<60||player.stats.health<75)improve('opt_jog');
 if(player.stats.happiness<65)improve('opt_meditate');
 if(player.stats.health<=72&&player.money>=1150)improve('opt_checkup');
 if(player.activeHealthConditions?.length){
  const clinic=LIFESTYLE_ACTIVITY_CATALOG.find(a=>a.id==='wellness_reset')!;
  const selections={...createDefaultLifestyleActivitySelections(clinic),scaleId:clinic.scales[0].id,wellnessProviderId:'private_doctor',wellnessFocusId:'basic_treatment',wellnessSupportId:'followup_visit',wellnessProgramId:player.activeHealthConditions.some(c=>c.conditionId.includes('pain')||c.conditionId.includes('fracture'))?'injury_rehab':'flu_care'};
  const quote=buildLifestyleActivityQuote(clinic,selections,player);
  if(player.money>=quote.totalCost+1000){const before=player.money,result=resolveLifestyleActivity(player,clinic,selections);if(result.success){player=result.player;record('Health Clinic',before,0)}}
 }
 const audition=player.commitments.find(c=>c.projectPhase==='AUDITION');
 const old=player.commitments;
 if(audition)player.commitments=old.filter(c=>c.type!=='JOB'&&c.type!=='COURSE');
 else if(!old.some(c=>c.type==='JOB')){
  const job=[...(player.weeklyOpportunities.jobs||[])].filter(j=>j.energyCost<=35).sort((a,b)=>(b.income||0)/(b.energyCost||1)-(a.income||0)/(a.energyCost||1))[0];
  if(job){player=acceptCareerPartTimeJob(player,structuredClone(job));record('Accept current job: '+job.name,player.money,job.energyCost)}
 }
 if(audition)syncWeeklyEnergyForCommitments(player,old);
 const genre=GENRE_TRAINING_CATALOG.find(o=>o.genre==='DRAMA')!;
 while(!audition&&!player.commitments.some(c=>c.projectDetails)&&player.stats.genreXP.DRAMA<100&&player.money>=genre.cost+1000&&player.energy.current>=genre.energy){
  const before=player.money;player.money-=genre.cost;spendPlayerEnergy(player,genre.energy,'Genre training');rewardGenreExperience(player,'DRAMA',1);record('Train DRAMA',before,genre.energy);
 }
 if(!player.commitments.some(c=>c.projectDetails)&&!player.applications.length&&player.money>=2000&&player.energy.current>=25&&player.stats.genreXP.DRAMA>=100){
  const offer=(player.weeklyOpportunities.auditions||[]).filter(o=>o.project.type==='MOVIE'&&!o.project.isFamous&&o.project.releaseStrategy==='THEATRICAL'&&['MINOR','CAMEO'].includes(o.roleType)&&calculateGenreFit(player,o.project).fitScore>=80)
   .sort((a,b)=>ROLE_DEFINITIONS[a.roleType].difficulty-ROLE_DEFINITIONS[b.roleType].difficulty)[0];
  if(offer){player=applyCareerAuditionApplication(player,offer,`ordinary-application-${getAbsoluteWeek(player.age,player.currentWeek)}`);record('Apply current audition: '+offer.projectName,player.money,25)}
 }
 for(const c of player.commitments){
  if(c.projectPhase==='AUDITION')while(player.energy.current>=20&&(c.auditionPerformance||0)<100){c.auditionPerformance=Math.min(100,(c.auditionPerformance||0)+calculateAuditionGain(player,c.roleType||'MINOR',c.auditionPerformance||0));spendPlayerEnergy(player,20,'Practice: '+c.name);record('Audition rehearsal',player.money,20,c.id)}
  if(c.projectPhase==='PRODUCTION')while(player.energy.current>=20&&(c.productionPerformance||0)<100){c.productionPerformance=Math.min(100,(c.productionPerformance||0)+calculateProductionGain(player,c.roleType||'MINOR',c.productionPerformance||0,player.commitments.some(j=>j.type==='JOB')));spendPlayerEnergy(player,20,'Rehearse: '+c.name);record('Production rehearsal',player.money,20,c.id)}
  if(c.projectPhase==='POST_PRODUCTION'&&player.energy.current>=10){
   spendPlayerEnergy(player,10,'Promotion: '+c.name);const id=`ordinary-promo-${getAbsoluteWeek(player.age,player.currentWeek)}`;
   const post={id,authorId:'PLAYER',authorName:player.name,authorHandle:player.instagram.handle,authorAvatar:player.avatar,type:'ANNOUNCEMENT' as const,caption:`So excited for you all to see ${c.name}!`,week:player.currentWeek,year:player.age,likes:Math.floor(player.stats.followers*.1),comments:Math.floor(player.stats.followers*.005),isPlayer:true,promotedProjectId:c.id};
   player.instagram.posts=[post,...player.instagram.posts];player.instagram.feed=[post,...player.instagram.feed];
   player=applyProjectPromotionAttribution(player,{projectId:c.id,publicationId:id,channel:'INSTAGRAM',promotionType:'ANNOUNCEMENT',absoluteWeek:getAbsoluteWeek(player.age,player.currentWeek),reach:post.likes,engagement:post.likes}).player;record('Career Instagram promotion',player.money,10,c.id);
  }
 }
 return player;
};
