import type { Player, WorldStreamingAiStoreEntitlement, WorldStreamingPlatformOffer } from '../../types';
import { createStreamingCatalogueReadContext, createStreamingTitleRouteReadBatch, evaluatePlayerStreamingTitleRoute, type StreamingCatalogueReadContext } from '../streamingContentAvailability';
import { getEligibleOwnedStreamingTitles } from '../streamingCatalog';
import { getOwnedStreamingProgramEntries } from '../streamingOriginals';
import { createAiTitleAccessResolver, getAiCataloguePositions } from '../worldEconomy/worldStreamingAiCatalogue';
import { streamingCatalogueValue, streamingTitleQuality, streamingTitleWeeksAvailable } from '../worldEconomy/worldStreamingContentValue';
import { evaluateStreamingTitlePlayback, type StreamingTitleAccessRoute } from '../streamingTitleAccess';
import { projectStreamingCommercialOffers } from '../streamingCommercialOffers';
import { resolveStreamingProductionReadiness } from '../streamingProductionReadiness';
import { cinemaStreamingLanguageReady } from './boxOfficeStreamingAudience';

/** Current route/plan-specific catalogue, in one immutable input projection. Never grants access. */
export const createCinemaAlternativeAccess=(player:Player,offer:WorldStreamingPlatformOffer,week:number,prepared?:StreamingCatalogueReadContext)=>{
    const context=prepared||createStreamingCatalogueReadContext(player),platform=context.platform;
    const owned=offer.isPlayer?new Set(getEligibleOwnedStreamingTitles(player).map(t=>t.id)):new Set<string>();
    const entries=offer.isPlayer?getOwnedStreamingProgramEntries(player,context):[];
    const entriesById=new Map<string,typeof entries[number]>();
    for(const entry of entries)if(!entriesById.has(entry.projectId))entriesById.set(entry.projectId,entry);
    const ids=offer.isPlayer?[...new Set([...platform.catalogProjectIds.filter(id=>owned.has(id)),
        ...(platform.starterCatalog?.ownedProjectIds||[]),...(platform.starterCatalog?.licensedProjectIds||[]),
        ...platform.catalogLicenses.map(l=>l.sourceProjectId),...entries.map(e=>e.projectId)])]:[];
    const playerRoute=offer.isPlayer?createStreamingTitleRouteReadBatch(player,week,platform,owned,context):undefined;
    const aiRoute=offer.isPlayer?undefined:createAiTitleAccessResolver(player,offer,player.world.worldStreamingViewing?.aiCatalogue||[]);
    let aiPositionsByTitle:Map<string,ReturnType<typeof getAiCataloguePositions>>|undefined;
    const aiPositionsFor=(id:string)=>{
        if(!aiPositionsByTitle){
            aiPositionsByTitle=new Map();
            for(const position of getAiCataloguePositions(player,offer.platformId,player.world.worldStreamingViewing?.aiCatalogue||[])){
                const rows=aiPositionsByTitle.get(position.titleId)||[];rows.push(position);aiPositionsByTitle.set(position.titleId,rows);
            }
        }
        return aiPositionsByTitle.get(id)||[];
    };
    const commercial=projectStreamingCommercialOffers(offer.commercialConfiguration);
    const quality=new Map<string,number>(),ages=new Map<string,number>(),readiness=new Map<string,boolean>(),languages=new Map<string,boolean>();
    const cache=new Map<string,{ids:Set<string>;strength:number;freshness:number}>();
    return (country:string,route:StreamingTitleAccessRoute,entitlement?:WorldStreamingAiStoreEntitlement)=>{
        const key=JSON.stringify([country,route,entitlement?.titleId,entitlement?.purchasedAtAbsoluteWeek]);let value=cache.get(key);if(value)return value;
        const positions=aiRoute?.(country,week,route,entitlement?.titleId)||[];
        const proof=entitlement?{kind:entitlement.kind,purchasedAtAbsoluteWeek:entitlement.purchasedAtAbsoluteWeek}:undefined;
        const ownedPlayable=entitlement&&(offer.isPlayer?evaluatePlayerStreamingTitleRoute(player,entitlement.titleId,country,week,route,
            {platform,ownedTitleIds:owned,offer:context.offer,activeCountryIds:context.activeCountryIds,viewerProof:proof}).allowed
            :aiPositionsFor(entitlement.titleId).some(position=>evaluateStreamingTitlePlayback({
                titleId:entitlement.titleId,countryId:country,absoluteWeek:week,productionReadyAtAbsoluteWeek:position.startsAtAbsoluteWeek,
                generalReleaseAtAbsoluteWeek:position.startsAtAbsoluteWeek,marketActive:offer.activeCountryIds.includes(country),
                offer:commercial,route,position,viewerProof:proof}).allowed));
        const playable=(entitlement?(ownedPlayable?[entitlement.titleId]:[]):playerRoute?ids.filter(id=>playerRoute(id,country,route).allowed):positions.map(p=>p.titleId))
            .filter(id=>{
                if(!player.world.cinemaMarket?.titles[id])return true;
                if(!readiness.has(id))readiness.set(id,resolveStreamingProductionReadiness(player,id,undefined,context.productionIndex).ready);
                if(!readiness.get(id))return false;
                const key=JSON.stringify([id,country]);
                if(!languages.has(key))languages.set(key,cinemaStreamingLanguageReady(player,id,country,offer.platformId,week));
                return languages.get(key)!;
            });
        const unique=[...new Set(playable)];
        const starts=new Map<string,number>();
        for(const position of positions)if(!starts.has(position.titleId))starts.set(position.titleId,position.startsAtAbsoluteWeek);
        const catalogue=streamingCatalogueValue(unique.map(id=>{
            if(!quality.has(id))quality.set(id,streamingTitleQuality(player,id,context));
            const start=starts.get(id),entry=entriesById.get(id);
            if(entry&&!ages.has(id))ages.set(id,streamingTitleWeeksAvailable({...player,ownedStreamingPlatform:platform},entry,week));
            return {quality:quality.get(id)!,weeksAvailable:entry?ages.get(id)!:start===undefined?52:Math.max(1,week-start+1),genre:entry?.genre||'UNKNOWN'};
        }));
        value={ids:new Set(unique),strength:catalogue.strength,freshness:catalogue.freshness};cache.set(key,value);return value;
    };
};
