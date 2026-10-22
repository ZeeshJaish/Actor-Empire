import type {Player,AuditionOpportunity,Commitment} from '../types';
import {spendPlayerEnergy,syncWeeklyEnergyForCommitments} from './premiumLogic';

/** React may replay an updater; every candidate must leave its source untouched. */
export const applyCareerAuditionApplication=(player:Player,offer:AuditionOpportunity,applicationId:string):Player=>{
 const next:Player={...player,energy:{...player.energy},flags:{...player.flags},applications:[...player.applications,{id:applicationId,type:'AUDITION',name:offer.projectName,weeksRemaining:1,data:offer}]};
 spendPlayerEnergy(next,25,'Audition: '+offer.projectName);return next;
};
export const acceptCareerPartTimeJob=(player:Player,job:Commitment):Player=>{
 const next:Player={...player,energy:{...player.energy},flags:{...player.flags},commitments:[...player.commitments,job]};
 syncWeeklyEnergyForCommitments(next,player.commitments);return next;
};
