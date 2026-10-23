import type {ContractFilm,Player,ProjectType,RoleType} from '../types';
import {getCareerEvidence} from './actorCareerBalance';
import {interpolateProductionBudget} from './studioProductionEconomy';

const clamp = (n:number) => Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const backendWeight:Record<RoleType,number> = {MINOR:0,CAMEO:.025,SUPPORTING:.45,ENSEMBLE:.65,LEAD:1};
const salaryWeight:Record<RoleType,number> = {MINOR:.05,CAMEO:.1,SUPPORTING:.3,ENSEMBLE:.4,LEAD:1};

/** Quotation inputs only: skills, wallet size and a whole film's box office
 * are not a substitute for this actor's current audience and personal work. */
export const getActorOfferLeverage = (player?:Player):number => {
    if(!player)return 0;
    const evidence=getCareerEvidence(player);
    return clamp(clamp(player.stats.fame/100)*.3+clamp(player.stats.reputation/100)*.2
        +evidence.workSignal*.35+evidence.audience*.15);
};

/** Only call when creating a new offer. Signed and already displayed terms
 * continue through their existing acceptance, persistence and settlement paths. */
export const quoteActorBackend = (player:Player|undefined,role:RoleType,type:ProjectType,variation=1):number =>
    Math.floor((type==='SERIES'?1.5:2.5)*backendWeight[role]
        *(.3+.7*getActorOfferLeverage(player))*.6*clamp(variation)*100)/100;

/** One quoted rate for the whole multi-picture package, weighted by the actual
 * remaining billing commitments. Existing contract installments are never readjusted. */
export const quoteActorFranchiseBackend = (player:Player,films:ContractFilm[]):number => {
    if(!films.length)return 0;
    const weight=films.reduce((n,f)=>n+backendWeight[f.role],0)/films.length;
    return Math.floor(2*weight*(.3+.7*getActorOfferLeverage(player))*.6*100)/100;
};

export const quoteActorFranchiseSalary = (player:Player,films:ContractFilm[],budget=120000000):number => {
    const units=films.reduce((n,f)=>n+salaryWeight[f.role],0);
    const safeBudget=Number.isFinite(budget)?Math.max(0,budget):120000000;
    const leadBase=12000*interpolateProductionBudget(safeBudget,{LOW:1,MID:20,HIGH:120,BLOCKBUSTER:300});
    return Math.floor(leadBase*units*(.85+.4*getActorOfferLeverage(player))*1.5);
};
