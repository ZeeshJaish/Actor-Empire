// Read-only route audit: isolated players, real service gates and rendered profile/desk components.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { initializeStocks, getStockOutstandingShares } from '../services/stockLogic';
import { ensureStudioEcosystem } from '../services/studioEcosystem';
import { buildForbesStudioProfile, type ForbesStudioProfile as Profile } from '../services/forbesStudioProfile';
import { getAcquisitionEligibility, completeAcquisitionTransaction, runDueDiligence, type AcquisitionCase } from '../services/studioAcquisition';
import { getCompanyPosition } from '../services/companyPosition';
import { getPublicControlReadiness } from '../services/publicStockControl';
import { getStockTakeoverSnapshot } from '../services/stockTakeover';
import { ForbesStudioProfile } from '../views/mobile/components/ForbesStudioProfile';
import { StudioAcquisitionDesk } from '../views/mobile/components/StudioAcquisitionDesk';
import { StudioAcquisitionDealRoom, DEFAULT_ACQ_CONFIG } from '../views/mobile/components/StudioAcquisitionDealRoom';

const output = process.env.STOCK_ROUTE_PROBE_OUTPUT || 'docs/reports/2026-10-22-stock-acquisition-fix/route-recheck';
fs.mkdirSync(output, { recursive: true });
const fixture = () => {
    const p = structuredClone(INITIAL_PLAYER);
    Object.assign(p, { age: 35, currentWeek: 12, money: 2e12, stocks: initializeStocks(), portfolio: [], businesses: [], pendingEvents: [] });
    p.world = ensureStudioEcosystem(p.world); p.energy = { ...p.energy, current: 100 };
    return p;
};
const profileFor = (p: Player, id: string) => buildForbesStudioProfile({ player: p, studio: p.world.studios![id], rank: 1, worldProjects: p.world.projects, universes: p.world.universes });
const fail = () => ({ success: false, reason: 'AUDIT_ONLY' }) as any;
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const buttons = (html: string) => [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map(m => text(m[1]));
const render = (p: Player, profile: Profile, acq?: AcquisitionCase) => renderToStaticMarkup(<ForbesStudioProfile player={p} profile={profile} acquisitionCase={acq} companyPosition={getCompanyPosition(p, profile)} language="en" ownershipCommandRecorded={false} onClose={()=>{}} onOpenStocks={()=>{}} onApproachStudio={()=>{}} onOwnershipCommand={fail} onRequestPrivateExit={fail} onAcceptPrivateExit={fail} onDeclinePrivateExit={fail} onStartPrivateControl={fail}/>);
const rows: any[] = [];
const inspect = (name: string, p: Player, profile: Profile, acq?: AcquisitionCase) => {
    const stock = p.stocks.find(s => s.relatedStudioId === profile.id);
    const html = render(p, profile, acq); const before = JSON.stringify(p);
    const signed = completeAcquisitionTransaction({ player: p, profile });
    const row: Record<string, unknown> = { name, studio: profile.id, state: profile.acquisitionState, caseStatus: acq?.status, eligibility: getAcquisitionEligibility(profile, acq, p), readiness: getPublicControlReadiness(p, profile), stocksControl: stock ? getStockTakeoverSnapshot(p, stock).canTransferControl : undefined, renderedButtons: buttons(html), signed: signed.success, signingReason: signed.reason, signingCashDelta: signed.player.money-p.money, businessesAdded: signed.player.businesses.length-p.businesses.length, originalUntouched: before===JSON.stringify(p) };
    rows.push(row); return { row, html };
};
for (const id of ['PARAMOUNT','WARNER_BROS','UNIVERSAL']) for(const pct of [0,49,50,51,100]) {
    const p=fixture(),s=p.stocks.find(s=>s.relatedStudioId===id)!;
    if(pct)p.portfolio=[{stockId:s.id,shares:Math.floor(getStockOutstandingShares(s)*pct/100),averageCost:s.price,totalInvested:Math.floor(getStockOutstandingShares(s)*pct/100)*s.price}];
    inspect(`${id}-${pct}`,p,profileFor(p,id));
}
for(const kind of ['DRAFT','ACCEPTED','COUNTERED','REJECTED','FINAL_REJECTION','CLOSED'] as const){
    const p=fixture(),s=p.stocks.find(s=>s.id==='stk_para')!;
    p.portfolio=[{stockId:s.id,shares:331500000,averageCost:13,totalInvested:4309500000}];
    const profile=profileFor(p,'PARAMOUNT');
    const acq:AcquisitionCase={studioId:profile.id,studioName:profile.name,acquisitionState:profile.acquisitionState,publicValuation:profile.valuation,approachedYear:35,approachedWeek:11,status:kind==='FINAL_REJECTION'?'REJECTED':kind,offer:{type:'MINORITY',amount:1e9,minorityPercent:49,funding:{source:'PERSONAL'},complianceRisk:0,complianceBand:'ROUTINE',submittedWeek:11,submittedYear:35,round:kind==='FINAL_REJECTION'?3:1},sellerResponse:{decision:kind==='ACCEPTED'?'ACCEPTED':kind==='COUNTERED'?'COUNTERED':'REJECTED',round:kind==='FINAL_REJECTION'?3:1,respondedWeek:12,respondedYear:35,summary:'Isolated route audit'}};
    if(kind==='CLOSED'){acq.reapproachAfterYear=35;acq.reapproachAfterWeek=15;}
    p.flags.studioAcquisitionCases=[acq];
    const {html}=inspect(`PARAMOUNT-51-${kind}`,p,profile,acq);fs.writeFileSync(`${output}/${kind.toLowerCase()}-profile.html`,html);
}
for(const id of ['NETFLIX','APPLE_TV','DISNEY_PLUS']){
    const p=fixture(),s=p.stocks.find(s=>s.relatedStudioId===id)!;p.portfolio=[{stockId:s.id,shares:getStockOutstandingShares(s),averageCost:s.price,totalInvested:getStockOutstandingShares(s)*s.price}];
    inspect(`${id}-100-reserved`,p,profileFor(p,id));
    const profile=profileFor(p,id);const acq:AcquisitionCase={studioId:id,studioName:profile.name,acquisitionState:profile.acquisitionState,publicValuation:profile.valuation,approachedYear:35,approachedWeek:11,status:'DRAFT'};p.flags.studioAcquisitionCases=[acq];const drafted=inspect(`${id}-100-reserved-old-DRAFT`,p,profile,acq);const diligence=runDueDiligence({player:p,profile,funding:{source:'PERSONAL'}});drafted.row.diligence={success:diligence.success,reason:diligence.reason,cashDelta:diligence.player.money-p.money};
}
for(const state of ['OPEN_TO_OFFERS','NOT_FOR_SALE'] as const){
    const p=fixture();const profile={...profileFor(p,'PARAMOUNT'),id:'PRIVATE_AUDIT',name:'Private Route Audit',isPlayerOwned:false,acquisitionState:state};
    inspect(`private-${state}`,p,profile);
    if(state==='NOT_FOR_SALE'){
      const acq:AcquisitionCase={studioId:profile.id,studioName:profile.name,acquisitionState:state,publicValuation:profile.valuation,approachedYear:35,approachedWeek:1,status:'CLOSED',reapproachAfterYear:35,reapproachAfterWeek:2};p.flags.studioAcquisitionCases=[acq];const drafted=inspect('private-NOT_FOR_SALE-expired-CLOSED',p,profile,acq);const diligence=runDueDiligence({player:p,profile,funding:{source:'PERSONAL'}});drafted.row.diligence={success:diligence.success,reason:diligence.reason,cashDelta:diligence.player.money-p.money};
    }
}
{
    const p=fixture();const profile=profileFor(p,'PARAMOUNT');const html=renderToStaticMarkup(<StudioAcquisitionDesk player={p} profile={profile} onClose={()=>{}} onOpenStocks={()=>{}} onSetOperatingModel={fail} onRunDiligence={fail} onSubmitOffer={fail} onAcceptCounter={fail} onReviseOffer={fail} onBeatRival={fail} onWalkAway={fail} onCompleteAcquisition={fail} onCompleteStockControl={fail} onUpdatePresentation={fail}/>);
    fs.writeFileSync(`${output}/public-zero-desk.html`,html);rows.push({name:'public-zero-desk',renderedButtons:buttons(html),hasOpenStocks:buttons(html).some(b=>/Open Stocks/.test(b)),hasPublicPosition:/Your Market Position/.test(html)});
}
for(const s of initializeStocks()){
 const p=fixture();p.portfolio=[{stockId:s.id,shares:getStockOutstandingShares(s),averageCost:s.price,totalInvested:getStockOutstandingShares(s)*s.price}];const snap=getStockTakeoverSnapshot(p,p.stocks.find(x=>x.id===s.id)!);rows.push({name:`stock-catalog-${s.symbol}`,relatedStudioId:s.relatedStudioId,transferReady:snap.canTransferControl,unlocks:snap.availableRoutes,nextUnlock:snap.nextUnlockLabel});
}
for(const amount of [2040675000,0]){
 const acquisitionCase:AcquisitionCase={studioId:'PARAMOUNT',studioName:'Paramount Pictures',acquisitionState:'PUBLICLY_TRADED',publicValuation:8450000000,approachedYear:35,approachedWeek:12,status:'ACQUIRED',closing:{finalPrice:amount,acquiredBusinessId:'PARAMOUNT',signedYear:35,signedWeek:13,funding:{source:'PERSONAL'},verifiedDebt:0,hiddenLiabilities:0,expectedAnnualIncome:0,assetSummary:'Verified closing receipt',outcome:'CONTROL'}};
 const html=renderToStaticMarkup(<StudioAcquisitionDealRoom config={{...DEFAULT_ACQ_CONFIG,publicControlReady:true,signingPrice:0,marketType:'PUBLIC'}} acquisitionCase={acquisitionCase} onClose={()=>{}} onRunDiligence={fail} onSubmitOffer={fail} onAcceptCounter={fail} onReviseOffer={fail} onBeatRival={fail} onWalkAway={fail} onCompleteAcquisition={fail} onSetOperatingModel={fail}/>);
 rows.push({name:`acquired-receipt-${amount}`,text:text(html)});
}
{
 const p=fixture();const profile={...profileFor(p,'PARAMOUNT'),id:'LEGACY_PRIVATE',isPlayerOwned:false,acquisitionState:'OPEN_TO_OFFERS' as const};
 p.flags.companyEquityPositions=[{studioId:profile.id,percent:20,investedAmount:150000000}];
 const acquisitionCase:AcquisitionCase={studioId:profile.id,studioName:profile.name,acquisitionState:profile.acquisitionState,publicValuation:profile.valuation,approachedYear:34,approachedWeek:1,status:'ACQUIRED',closing:{finalPrice:150000000,signedYear:34,signedWeek:1,funding:{source:'PERSONAL'},verifiedDebt:0,hiddenLiabilities:0,expectedAnnualIncome:0,assetSummary:'Legacy20% private stake, no saved offer',outcome:'MINORITY_STAKE'}};
 p.flags.studioAcquisitionCases=[acquisitionCase];const before=JSON.stringify(p);
 const html=renderToStaticMarkup(<StudioAcquisitionDesk player={p} profile={profile} acquisitionCase={acquisitionCase} onClose={()=>{}} onOpenStocks={()=>{}} onSetOperatingModel={fail} onRunDiligence={fail} onSubmitOffer={fail} onAcceptCounter={fail} onReviseOffer={fail} onBeatRival={fail} onWalkAway={fail} onCompleteAcquisition={fail} onCompleteStockControl={fail} onUpdatePresentation={fail}/>);
 rows.push({name:'legacy-private-minority-receipt',text:text(html),originalUntouched:before===JSON.stringify(p)});
}
const report={kind:'REAL_SERVICE_GATES_AND_SERVER_RENDERED_PRODUCTION_COMPONENTS',rows};fs.writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2)+'\n');
for(const row of rows)console.log(JSON.stringify(row));
if(process.env.STOCK_ROUTE_ASSERT==='1'){
 const failures:string[]=[];
 const check=(name:string,fn:()=>void)=>{try{fn();console.log('PASS',name)}catch(error){failures.push(name);console.log('FAIL',name,String(error))}};
 for(const row of rows.filter(r=>r.stocksControl===true))check(`${row.name} exposes current control transfer in Forbes`,()=>assert.ok(row.renderedButtons.includes('Complete Control Transfer')));
 for(const row of rows.filter(r=>r.name.includes('reserved-old-DRAFT')))check(`${row.name} cannot sell unusable acquisition diligence`,()=>{assert.equal(row.renderedButtons.includes('Approach Studio'),false);assert.equal(row.diligence.success,false);assert.equal(row.diligence.cashDelta,0)});
 for(const row of rows.filter(r=>/^(PARAMOUNT|WARNER_BROS|UNIVERSAL)-(0|49)$/.test(r.name)))check(`${row.name} labels the public tender separately`,()=>assert.ok(row.renderedButtons.includes('Open Public Tender')));
 check('public dossier offers both Stocks and public tender routes',()=>{const r=rows.find(r=>r.name==='public-zero-desk');assert.ok(r.renderedButtons.includes('Buy Shares in Stocks'));assert.ok(r.renderedButtons.includes('Open Public Tender →'))});
 check('expired closed case cannot make a private not-for-sale company available',()=>{const r=rows.find(r=>r.name==='private-NOT_FOR_SALE-expired-CLOSED');assert.equal(r.eligibility.canApproach,false);assert.equal(r.diligence.success,false);assert.equal(r.diligence.cashDelta,0);assert.equal(r.renderedButtons.includes('Approach Studio'),false)});
 check('completed tender receipt retains actual paid price after control becomes ready',()=>assert.match(rows.find(r=>r.name==='acquired-receipt-2040675000').text,/Paid \$2B/));
 check('completed existing-share control receipt retains its actual zero price',()=>assert.match(rows.find(r=>r.name==='acquired-receipt-0').text,/Paid \$0/));
 check('legacy minority closing without an old offer shows the actual20% register position',()=>{const row=rows.find(r=>r.name==='legacy-private-minority-receipt');assert.match(row.text,/Position 20\.00%/);assert.equal(row.originalUntouched,true)});
 if(failures.length)throw Error(`${failures.length} acquisition entry-route regressions failed`);
}
