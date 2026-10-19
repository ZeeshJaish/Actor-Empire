import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as access from '../services/streamingContentAvailability';
import {streamingCatalogueScaleFixture} from './helpers/streamingCatalogueScaleFixture';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {forecastWorldStreamingBuildDemand} from '../services/worldEconomy/worldStreamingPricingForecast';

if(process.argv.includes('--hash')) {
    for(const count of [52,104]) {
        const {player}=streamingCatalogueScaleFixture(count);
        const forecast=forecastWorldStreamingBuildDemand(player,player.ownedStreamingPlatform.serviceConfiguration.pricing,
            player.ownedStreamingPlatform.identity!.dayOneMarketIds);
        console.log(JSON.stringify({titles:count,forecastHash:createHash('sha256').update(JSON.stringify(forecast)).digest('hex')}));
    }
} else {
    const factory=access.createStreamingTitleRouteReadBatch;
    assert.equal(typeof factory,'function','world-offer reads must prepare one country/title batch');
    const {player}=streamingCatalogueScaleFixture(52);
    const platform=player.ownedStreamingPlatform;
    const week=getAbsoluteWeek(player.age,player.currentWeek);
    const countries=access.getOwnedPlatformPackageCountryIds(platform);
    let countryReads=0;
    platform.marketOperations=platform.marketOperations.map(operation=>new Proxy(operation,{get(target,key,receiver){
        if(key==='countryId')countryReads++;return Reflect.get(target,key,receiver);
    }}));
    const batch=factory(player,week,platform,new Set<string>());
    const referenceInputs={platform,ownedTitleIds:new Set<string>()};
    for(const id of platform.catalogProjectIds) for(const country of countries) for(const route of [
        {kind:'SUBSCRIPTION',planId:platform.serviceConfiguration.pricing.plans[0].id},{kind:'RENTAL'},{kind:'PURCHASE'},
    ] as const) {
        const prepared=batch(id,country,route);
        const before=countryReads;
        assert.deepEqual(prepared,access.evaluatePlayerStreamingTitleRoute(player,id,country,week,route,referenceInputs),
            'batch must retain the exact canonical route decision and denial');
        countryReads=before; // Count batch reads only; independent fresh reference deliberately repeats work.
    }
    assert.ok(countryReads<=countries.length*8,`country list was rebuilt per route: ${countryReads}`);
    const batchCountryReads=countryReads;
    const id=platform.catalogProjectIds[0];
    const route={kind:'SUBSCRIPTION' as const,planId:platform.serviceConfiguration.pricing.plans[0].id};
    platform.catalogLicenses.filter(licence=>licence.sourceProjectId===id).forEach(licence=>licence.expiresAtAbsoluteWeek=week);
    Object.values(player.world.streamingRightsContracts||{}).filter(contract=>contract.sourceProjectId===id)
        .forEach(contract=>contract.expiresAtAbsoluteWeek=week);
    assert.deepEqual(factory(player,week,platform,new Set<string>())(id,'US',route),
        access.evaluatePlayerStreamingTitleRoute(player,id,'US',week,route),'fresh batches must honor changed canonical expiry');
    const ownedId=player.pastProjects[0].id;
    const ownedIds=new Set([ownedId]);
    const assertOwnedBatch=()=>{
        const ownedBatch=factory(player,week,platform,ownedIds);
        for(const country of ['US','IN','ZZ']) assert.deepEqual(ownedBatch(ownedId,country,route),
            access.evaluatePlayerStreamingTitleRoute(player,ownedId,country,week,route,{platform,ownedTitleIds:ownedIds}),
            'owned positions and countries outside the footprint must retain canonical denials');
    };
    assertOwnedBatch();
    const contract=Object.values(player.world.streamingRightsContracts!)[0];
    player.world.streamingRightsContracts!['owned-conflict']={...contract,id:'owned-conflict',sourceProjectId:ownedId,
        territory:'DOMESTIC',countryIds:['US'],exclusivity:'EXCLUSIVE',startsAtAbsoluteWeek:week,expiresAtAbsoluteWeek:week+10,
        buyer:{...contract.buyer,id:'different-platform'}};
    assertOwnedBatch();
    platform.lifecycle='ACTIVE';
    platform.marketOperations.find(operation=>operation.countryId==='US')!.status='SUSPENDED';
    assertOwnedBatch();
    platform.serviceConfiguration.pricing={...platform.serviceConfiguration.pricing,streams:['ads']};
    assertOwnedBatch();
    console.log(JSON.stringify({passed:7,titles:52,countries:countries.length,batchCountryReads}));
}
