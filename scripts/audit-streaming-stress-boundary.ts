import {readFileSync,writeFileSync} from 'node:fs';
import {migratePlayerSave} from '../services/saveMigration';
import {normalizeOwnedStreamingPlatformState} from '../services/ownedStreamingPlatform';
import {getStreamingOpeningCatalogueView} from '../services/streamingOpeningCatalogue';
import type {Player} from '../types';
import {getAbsoluteWeek} from '../services/legacyLogic';
const player=JSON.parse(readFileSync('/tmp/streaming-stress-1040-player.json','utf8')) as Player;
const migrated=migratePlayerSave(JSON.parse(JSON.stringify(player)));
const normalized=normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform,player.id);
const opening=getStreamingOpeningCatalogueView(migrated);
const referenceIds=new Set(normalized.catalogProjectIds);
const licensedIds=new Set(normalized.catalogLicenses.map(license=>license.sourceProjectId));
const week=getAbsoluteWeek(player.age,player.currentWeek);
const dropped=player.ownedStreamingPlatform.catalogLicenses.filter(license=>!licensedIds.has(license.sourceProjectId));
const result={expectedTitles:1040,inputReferences:player.ownedStreamingPlatform.catalogProjectIds.length,
    inputLicenses:player.ownedStreamingPlatform.catalogLicenses.length,
    inputDistinctTitles:new Set(player.ownedStreamingPlatform.catalogLicenses.map(license=>license.sourceProjectId)).size,
    reloadedReferences:migrated.ownedStreamingPlatform.catalogProjectIds.length,reloadedLicenses:migrated.ownedStreamingPlatform.catalogLicenses.length,
    referencesWithoutLocalLicense:[...referenceIds].filter(id=>!licensedIds.has(id)),
    localLicensesWithoutReference:[...licensedIds].filter(id=>!referenceIds.has(id)),
    reloadedOpeningTitles:opening.titles.length,reloadedOpeningAvailable:opening.titles.filter(title=>title.available).length,
    droppedLicensesWithActiveCanonicalContract:dropped.filter(license=>{
        const contract=player.world.streamingRightsContracts?.[license.id];
        return contract?.status==='ACTIVE'&&contract.startsAtAbsoluteWeek<=week&&contract.expiresAtAbsoluteWeek>week;
    }).length,
    droppedExamples:dropped.slice(0,3).map(license=>({id:license.id,title:license.titleAtSigning,
        canonicalContractRetained:Boolean(migrated.world.streamingRightsContracts?.[license.id])})),
    all1040Retained:migrated.ownedStreamingPlatform.catalogProjectIds.length===1040&&migrated.ownedStreamingPlatform.catalogLicenses.length===1040};
writeFileSync('/tmp/streaming-stress-1040-boundary.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,referencesWithoutLocalLicense:result.referencesWithoutLocalLicense.length,localLicensesWithoutReference:result.localLicensesWithoutReference.length}));
if(!result.all1040Retained)process.exitCode=1;
