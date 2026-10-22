import type { Player, WorldStreamingAiStoreEntitlement } from '../../types';
import { getWorldStreamingOffers } from '../worldEconomy/worldStreamingOffers';
import { createStreamingCatalogueReadContext } from '../streamingContentAvailability';
import { createCinemaAlternativeAccess } from './boxOfficeAlternativeAccess';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import type { CinemaExposureCohort, CinemaStreamingAlternative } from './boxOfficeTypes';

/** Read the existing ecosystem once. Do not run customer/viewing settlement or invent missing access. */
export const readCinemaStreamingAlternatives=(player:Player,week:number,cohorts:readonly CinemaExposureCohort[]):CinemaStreamingAlternative[]=>{
    const customers=player.world.worldStreamingCustomers,viewing=player.world.worldStreamingViewing;
    const paid=customers&&customers.lastProcessedAbsoluteWeek<week?customers:undefined;
    const observed=viewing&&viewing.lastProcessedAbsoluteWeek<week?viewing:undefined;
    if(!paid&&!observed)return [];
    const context=createStreamingCatalogueReadContext(player);
    const registry=getWorldStreamingOffers(player,week,context),offers=new Map(registry.offers.map(o=>[o.platformId,o]));
    const result:CinemaStreamingAlternative[]=[];
    const primary=new Map<string,Array<{planId:string;households:number}>>();
    const ownership=new Map<string,WorldStreamingAiStoreEntitlement[]>();
    for(const entitlement of [...(observed?.aiStoreEntitlements||[]),...(player.world.worldStreamingAudienceChoice?.entitlements||[])]){
        if(entitlement.purchasedAtAbsoluteWeek>=week||(entitlement.expiresAtAbsoluteWeek!==null&&entitlement.expiresAtAbsoluteWeek<=week))continue;
        const key=JSON.stringify([entitlement.countryId,entitlement.platformId]),rows=ownership.get(key)||[];
        rows.push(entitlement);ownership.set(key,rows);
    }
    const accesses=new Map<string,ReturnType<typeof createCinemaAlternativeAccess>>();
    const accessFor=(id:string)=>{
        if(!accesses.has(id))accesses.set(id,createCinemaAlternativeAccess(player,offers.get(id)!,week,context));
        return accesses.get(id)!;
    };
    for(const country of Object.values(paid?.countries||{}))for(const c of country.cohorts)for(const cell of c.planCells){
        const key=JSON.stringify([country.countryId,c.cohortId,cell.platformId]),rows=primary.get(key)||[];
        rows.push({planId:cell.planId,households:cell.primaryHouseholds});primary.set(key,rows);
    }
    for(const cohort of cohorts){
        const raw=player.world.worldAudienceEconomy?.countries[cohort.countryId]?.cohorts.find(c=>`${cohort.countryId}:${c.id}`===cohort.id);
        const participation=player.world.worldAudienceParticipation?.countries[cohort.countryId]?.cohorts.find(c=>c.cohortId===raw?.id);
        const eligible=cohort.market?.eligiblePeople||0,population=player.world.worldPopulation?.countries[cohort.countryId]?.population||0;
        if(!raw||!participation||!eligible||!population)continue;
        const dualShare=participation.dualParticipantHouseholds/Math.max(1,participation.dualParticipantHouseholds+participation.cinemaOnlyHouseholds);
        for(const id of registry.byCountry[cohort.countryId]||[]){
            const offer=offers.get(id)!;
            const candidates:Array<{share:number;strength:number;freshness:number;week:number}>=[];
            for(const cell of primary.get(JSON.stringify([cohort.countryId,raw.id,id]))||[]){
                const catalogue=accessFor(id)(cohort.countryId,{kind:'SUBSCRIPTION',planId:cell.planId});
                if(catalogue.ids.size)candidates.push({share:cell.households/Math.max(1,raw.households),strength:catalogue.strength,freshness:catalogue.freshness,week:paid!.lastProcessedAbsoluteWeek});
            }
            const played=observed?.countries[cohort.countryId]?.platformPerformance?.[id];
            if(played&&projectStreamingCommercialOffers(offer.commercialConfiguration).freeAdOffer){
                const catalogue=accessFor(id)(cohort.countryId,{kind:'AD_SUPPORTED'});
                const freeShare=played.accessMix.freeViewingAccounts/Math.max(1,played.totalViewingAccounts);
                if(catalogue.ids.size&&freeShare>0)candidates.push({share:played.estimatedViewers*freeShare/population,strength:catalogue.strength,freshness:catalogue.freshness,week:observed!.lastProcessedAbsoluteWeek});
            }
            for(const entitlement of ownership.get(JSON.stringify([cohort.countryId,id]))||[]){
                const catalogue=accessFor(id)(cohort.countryId,{kind:entitlement.kind},entitlement);
                if(catalogue.ids.has(entitlement.titleId))candidates.push({share:entitlement.households*raw.people/Math.max(1,raw.households)/population,strength:catalogue.strength,freshness:catalogue.freshness,week:entitlement.purchasedAtAbsoluteWeek});
            }
            const best=candidates.sort((a,b)=>Math.min(dualShare,b.share)*b.strength-Math.min(dualShare,a.share)*a.strength)[0];
            if(!best)continue;
            const age=week-best.week;
            const accessiblePeople=Math.floor(eligible*Math.min(dualShare,best.share)*2**(-Math.max(0,age-1)/8));
            if(!accessiblePeople)continue;
            result.push({platformId:id,countryId:cohort.countryId,cohortId:cohort.id,accessiblePeople,
                catalogueStrength:Math.round(best.strength),
                serviceQuality:Math.round(offer.reliabilityIndex),localization:Math.round(offer.localizationStrengthIndex),
                freshness:Math.round(best.freshness*100),
                preferredGenres:[...offer.preferredGenres],evidenceWeek:week-Math.max(1,age)});
        }
    }
    return result.sort((a,b)=>a.cohortId.localeCompare(b.cohortId)||a.platformId.localeCompare(b.platformId));
};

