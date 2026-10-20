// Disposable stress data only. The first 104 acquisitions and historical grants
// come from the pinned 1,040-title lab; additional distinct released projects
// exercise world/project indexes with explicit canonical subscription licences.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import type {Player} from '../types';
import {createStreamingLicenseContract,createStreamingRightsContractFromLicense} from '../services/streamingRightsCore';
import {getAbsoluteWeek} from '../services/legacyLogic';
const player=JSON.parse(readFileSync('/tmp/streaming-stress-1040-player.json','utf8')) as Player;
const platform=player.ownedStreamingPlatform;
assert.equal(platform.catalogLicenses.length,1040);
const sources=player.world.projects.filter(p=>platform.catalogProjectIds.includes(p.id));
assert.ok(sources.length);
const week=getAbsoluteWeek(player.age,player.currentWeek);
for(let n=1040;n<5000;n++){
    const source=sources[(n-1040)%sources.length];
    const project={...source,id:`stress-5000-project:${n}`,title:`${source.title} · Archive ${n+1}`,
        marketOpportunityId:undefined,marketAcquiredAtAbsoluteWeek:undefined,marketPremiereAtAbsoluteWeek:undefined};
    player.world.projects.push(project);
    const license=createStreamingLicenseContract({id:`stress-5000-license:${n}`,
        sourceProject:{id:project.id,title:project.title,mediaType:project.mediaType,genre:project.genre},
        buyerPlatformId:null,platformContentPlanId:null,cataloguePackageId:null,licensorName:'Stress fixture studio',
        territory:'GLOBAL',countryIds:[],durationWeeks:104,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:0,
        platformRevenueShare:100,signedAtAbsoluteWeek:week,startsAtAbsoluteWeek:week,origin:'STUDIO_MARKET',
        sellerType:'STUDIO',sellerPlatformId:null,windowType:'FIRST_WINDOW',
        accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}});
    platform.catalogProjectIds.push(project.id);platform.catalogLicenses.push(license);
    player.world.streamingRightsContracts![license.id]=createStreamingRightsContractFromLicense({license,
        buyer:{type:'PLAYER_PLATFORM',id:platform.identity!.slug,name:platform.identity!.name,platformId:null},
        guaranteeDisposition:'PAID',settledAtAbsoluteWeek:week});
}
assert.equal(new Set(platform.catalogProjectIds).size,5000);
assert.equal(new Set(platform.catalogLicenses.map(l=>l.sourceProjectId)).size,5000);
writeFileSync('/tmp/streaming-stress-5000-player.json',JSON.stringify(player));
console.log(JSON.stringify({distinctTitles:5000,worldProjects:player.world.projects.length,
    canonicalContracts:Object.keys(player.world.streamingRightsContracts!).length,
    filedCountries:platform.marketOperations.length,bytes:Buffer.byteLength(JSON.stringify(player))}));
