import assert from 'node:assert/strict';
import {INITIAL_PLAYER} from '../types';
import {initializeStocks} from '../services/stockLogic';
import {ensureStudioEcosystem} from '../services/studioEcosystem';
import {buildForbesStudioProfile} from '../services/forbesStudioProfile';
import {completeAcquisitionTransaction} from '../services/studioAcquisition';
import {getPublicControlReadiness} from '../services/publicStockControl';
const fixture=()=>{const p=structuredClone(INITIAL_PLAYER);p.money=10e9;p.stocks=initializeStocks();p.world=ensureStudioEcosystem(p.world);p.world.studios!.PARAMOUNT.ai={finance:{debtPrincipalMillions:100},ledger:[]} as any;p.portfolio=[{stockId:'stk_para',shares:331500000,averageCost:13,totalInvested:4309500000}];return p};
let failed=0;for(const [name,change] of [ ['unsafe known debt',(p:any)=>p.world.studios.PARAMOUNT.ai.finance.debtPrincipalMillions=1e20],['nonfinite known debt',(p:any)=>p.world.studios.PARAMOUNT.ai.finance.debtPrincipalMillions=Infinity],['unsafe known cash',(p:any)=>p.world.studios.PARAMOUNT.cashReserve=1e22] ] as const){const p=fixture();change(p);const profile=buildForbesStudioProfile({player:p,studio:p.world.studios!.PARAMOUNT,rank:1,worldProjects:[],universes:{}});try{const r=completeAcquisitionTransaction({player:p,profile});assert.equal(r.success,false);assert.equal(r.player,p);assert.equal(p.businesses.some(b=>b.id==='PARAMOUNT'),false);console.log('PASS',name)}catch(e){failed++;console.log('FAIL',name,e instanceof Error?e.message:e)}}
{const p=fixture();p.portfolio.push({...p.portfolio[0]});const profile=buildForbesStudioProfile({player:p,studio:p.world.studios!.PARAMOUNT,rank:1,worldProjects:[],universes:{}});try{assert.equal(getPublicControlReadiness(p,profile).eligible,false);console.log('PASS duplicate holding rejects control')}catch(e){failed++;console.log('FAIL duplicate holding rejects control')}}
for(const funding of [[{ownerStudioId:'',shares:1}],[{ownerStudioId:'corp',shares:-1}],[{ownerStudioId:'corp',shares:1.5}],[{ownerStudioId:'corp',shares:1e20}],[{ownerStudioId:'corp',shares:331500001}]]){
 const p=fixture();p.portfolio[0].equityFunding=funding;const profile=buildForbesStudioProfile({player:p,studio:p.world.studios!.PARAMOUNT,rank:1,worldProjects:[],universes:{}});
 try{assert.equal(getPublicControlReadiness(p,profile).eligible,false);const r=completeAcquisitionTransaction({player:p,profile});assert.equal(r.success,false);assert.equal(r.player,p);console.log('PASS malformed corporate rights reject unchanged')}catch(e){failed++;console.log('FAIL malformed corporate rights',e instanceof Error?e.message:e)}
}
{
 const p=fixture();p.stocks=p.stocks.filter(s=>s.id!=='stk_para');const imported={id:'legacy-import',symbol:'LGC',name:'Legacy Paramount',sector:'MEDIA',price:1,outstandingShares:1e15,priceHistory:[1],volatility:0,dividendYield:0,lastDividendPayoutWeek:0,relatedStudioId:'PARAMOUNT'} as any;
 p.stocks.unshift(imported);p.portfolio=[{stockId:imported.id,shares:5e14,averageCost:0,totalInvested:0}];const profile=buildForbesStudioProfile({player:p,studio:p.world.studios!.PARAMOUNT,rank:1,worldProjects:[],universes:{}});
 try{assert.equal(getPublicControlReadiness(p,profile).eligible,false);const r=completeAcquisitionTransaction({player:p,profile});assert.equal(r.success,false);assert.equal(r.player,p);console.log('PASS impossible minimum-cent register rejects unchanged')}catch(e){failed++;console.log('FAIL minimum-cent register',e instanceof Error?e.message:e)}
}
if(failed)throw Error(`${failed} signing guards failed`);
