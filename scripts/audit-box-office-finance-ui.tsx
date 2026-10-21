import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectDashboardModal } from '../views/lifestyle/business/components/ProjectDashboardModal';
import { createBusiness } from '../services/businessLogic';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import type { Studio, ActiveRelease, PastProject } from '../types';
import { buildCinemaReleaseDashboardProject, buildCinemaArchiveDashboardProject, createArchivedCinemaReleaseRecord } from '../services/boxOffice/boxOfficePresentation';
import { getCinemaProjectFinance } from '../services/boxOffice/boxOfficeSettlement';
const f=makeCinemaFixture(55);
const studio=createBusiness('Finance UI Fixture','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',20);
f.player.businesses=[studio];
const project={id:'finance-ui',name:'Finance UI',title:'Finance UI',type:'MOVIE',phase:'RELEASED',genre:'ACTION',budget:100e6,gross:230e6,
 totalStudioReceipts:130e6,streamingRevenue:50e6,soundtrackRevenue:10e6,marketingBudgetSpent:30e6,
 earnings:999e6,imdbRating:7.5,rating:7.5,projectDetails:f.project};
const before=JSON.stringify(f.player);
const markup=renderToStaticMarkup(<ProjectDashboardModal project={project} player={f.player} studio={studio as unknown as Studio}
 onClose={()=>{}} onUpdatePlayer={()=>{throw new Error('A finance render cannot update a save');}}/>);
assert.ok(markup.includes('$190.0M'),'Producer card must show actual $130M theater + $50M streaming + $10M soundtrack');
assert.ok(markup.includes('46%'),'ROI uses $190M receipts and $130M actual production/marketing costs');
const legacy={...project,totalStudioReceipts:undefined};
const estimated=renderToStaticMarkup(<ProjectDashboardModal project={legacy} player={f.player} studio={studio as unknown as Studio}
 onClose={()=>{}} onUpdatePlayer={()=>{throw new Error('A finance render cannot update a save');}}/>);
assert.ok(estimated.includes('Estimated'),'Unrecorded historical receipts cannot be presented as settled facts');
assert.equal(JSON.stringify(f.player),before);
console.log('PASS actual finance card render, collected-receipt ROI, legacy estimate label and save immutability');

for(const dto of [buildCinemaReleaseDashboardProject({...project,totalGross:project.gross,imdbRating:7.5,distributionPhase:'THEATRICAL'} as unknown as ActiveRelease),
 buildCinemaArchiveDashboardProject(project as unknown as PastProject)]){
 const routed=renderToStaticMarkup(<ProjectDashboardModal project={dto} player={f.player} studio={studio as unknown as Studio}
  onClose={()=>{}} onUpdatePlayer={()=>{throw new Error('Render cannot update a save');}}/>);
 assert.ok(routed.includes('$190.0M'),'Production-house presentation route must preserve actual receipts and soundtrack');
 assert.ok(routed.includes('46%'),'Production-house presentation route must preserve marketing and funding facts');
}
console.log('PASS production-house active and library routes retain actual finance through dashboard render');
for(const actual of [undefined,0]){
 const archive=createArchivedCinemaReleaseRecord({...project,totalStudioReceipts:actual,streamingRevenue:0,soundtrackRevenue:0,earnings:2e6},'Untitled');
 const finance=getCinemaProjectFinance(archive);
 assert.equal(finance.producerReceiptsCents,actual===0?0:115e8);
 assert.equal(finance.receiptsEstimated,actual===undefined);
}
console.log('PASS archived release detail adapter preserves missing receipt estimates and genuine zero without actor-pay fallback');
