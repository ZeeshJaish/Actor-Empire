import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {captureNetworkBuildData} from './fixtures/networkSuggestionBuildData';
import {BuildWizard} from '../components/studio-finance/components/build/BuildWizard';
import type {Player} from '../types';

for (const path of process.argv.slice(2)) {
 const player:Player=JSON.parse(readFileSync(path,'utf8'));
 const snapshot=JSON.stringify(player);
 const saved=player.ownedStreamingPlatform.infrastructureSetupDraft;
 const {data,draft}=captureNetworkBuildData(player,undefined,{placements:saved?.networkPlacements || [],facilities:saved?.facilities || [],regionPlans:saved?.regionPlans || [],arch:'HYBRID',doctrine:'STANDARD',campaign:'NONE'});
 const forecast=data.canonical!.runRehearsal!(draft,'LIKELY');
 const quote=JSON.stringify(data.canonical!.quote!(draft));
 const renderStart=performance.now();
 const markup=renderToStaticMarkup(<BuildWizard data={data} initialDraft={draft} initialStage="test"/>);
 const renderMs=performance.now()-renderStart;
 assert.ok(markup.includes('Spare regular capacity'));
 assert.ok(!markup.includes('Facility map'));
 assert.ok(!markup.includes('bw-fleet'));
 assert.ok(!markup.includes('bw-aisle'));
 assert.ok(!/\d+ rented/.test(markup),'No derived fake machine count');
 assert.equal(JSON.stringify(data.canonical!.quote!(draft)),quote);
 assert.equal(JSON.stringify(player),snapshot,'Read and render never change source saves, rights or money');
 console.log(JSON.stringify({titles:player.ownedStreamingPlatform.catalogLicenses.length,markets:forecast.countries.length,ssrRenderMs:+renderMs.toFixed(1)}));
}
