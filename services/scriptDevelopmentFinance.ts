import type {Script} from '../types';

const money=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)
    ? Math.max(0,Math.round(value*100)/100):0;

/** Call after the actual studio debit. This records custody, never pays cash. */
export const recordScriptDevelopmentPayment=(script:Script,studioId:string,paid:number):Script=>{
    const amount=money(paid);if(!studioId||amount===0)return script;
    const prior=script.developmentPayment;
    const carried=prior?.studioId===studioId&&!prior.allocatedProjectId?money(prior.cashPaid):0;
    return {...script,developmentCost:money(money(script.developmentCost)+amount),
        developmentPayment:{studioId,cashPaid:money(carried+amount)}};
};

/** A film's full budget retains writing costs; only the new cash call is lower.
 * No inferred legacy refund, foreign-studio credit, or repeated allocation. */
export const getPrepaidScriptDevelopmentCash=(script:Script|null|undefined,studioId:string):number=>{
    const payment=script?.developmentPayment;
    return payment?.studioId===studioId&&!payment.allocatedProjectId&&script?.status!=='PRODUCED'
        ? Math.min(money(script?.developmentCost),money(payment.cashPaid)):0;
};

export const allocateScriptDevelopmentPayment=(script:Script,studioId:string,projectId:string):Script=>
    getPrepaidScriptDevelopmentCash(script,studioId)>0
        ? {...script,developmentPayment:{...script.developmentPayment!,allocatedProjectId:projectId}}:script;
