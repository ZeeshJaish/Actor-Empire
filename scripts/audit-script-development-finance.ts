import assert from 'node:assert/strict';
import type {Script} from '../types';
import {recordScriptDevelopmentPayment as record,getPrepaidScriptDevelopmentCash as prepaid,allocateScriptDevelopmentPayment as allocate} from '../services/scriptDevelopmentFinance';
import {calculateGreenlightFundingPosition} from '../views/lifestyle/business/greenlightCalculations';
import {calculateGreenlightEstimatedQuality} from '../views/lifestyle/business/greenlightCalculations';
const script={id:'script-paid-case',status:'READY',developmentCost:0}as Script;
const initial=JSON.stringify(script),paid=record(script,'studio-a',1000),twice=record(paid,'studio-a',500);
assert.equal(JSON.stringify(script),initial);assert.equal(twice.developmentCost,1500);assert.equal(prepaid(twice,'studio-a'),1500);
assert.equal(prepaid(twice,'studio-b'),0);assert.equal(prepaid({...script,developmentCost:5000},'studio-a'),0);
const used=allocate(twice,'studio-a','project-a');assert.equal(prepaid(used,'studio-a'),0);assert.deepEqual(allocate(used,'studio-a','project-b'),used);
assert.equal(prepaid(record(used,'studio-a',200),'studio-a'),200);
assert.equal(prepaid({...paid,developmentPayment:{studioId:'studio-a',cashPaid:1e30}},'studio-a'),1000);
for(const bad of [-1,NaN,Infinity])assert.deepEqual(record(script,'studio-a',bad),script);
const funding=(prepaidDevelopmentCash=0,investorRaisedAmount=0)=>calculateGreenlightFundingPosition({packageBudget:10000,prepaidDevelopmentCash,investorRaisedAmount,normalizedInvestorRaise:investorRaisedAmount,studioBalance:10000,productionFund:0,lockedStreamingFundingAmount:0});
assert.equal(funding().netGreenlightCashRequirement,10000);assert.equal(funding(1500).netGreenlightCashRequirement,8500);assert.equal(funding(1500,3000).netGreenlightCashRequirement,5500);
const quality=(choices:Record<string,string>)=>calculateGreenlightEstimatedQuality({scriptQuality:75,directorQuality:90,castingStrength:90,crewQualities:[90,90,90,90],equipmentChoices:choices,ownedEquipmentLevels:{},gearTiers:{TIER_5:{cost:8500000,quality:30}},locationQualities:[90],storyFitQualityAdjustment:0,backgroundAuthenticity:60,backgroundReliability:60,backgroundSetCare:60});
assert.equal(quality({cameras:'TIER_5',lighting:'TIER_5',sound:'TIER_5',practical:'TIER_5'}),quality({cameras:'TIER_5',lighting:'TIER_5',sound:'TIER_5',practicalEffects:'TIER_5'}),'The old audit-only rental-key alias did not raise estimated craft');
console.log(JSON.stringify({passed:10,kind:'CONTROLLED_FINANCIAL_AND_INPUT_PARITY_CASES_NOT_CAREER_RESULTS'}));

// The actual Greenlight preview must allow the cash already paid for writing,
// while a fixed platform commission retains its external budget/investor guard.
const {quoteOwnedFundingPreview}=await import('./fixtures/cinemaOwnedStudioActions');
const previewInput={availableGreenlightFunds:950_000,prepaidDevelopmentCash:250_000,isPlayerPlatformCommission:false,budgetBreakdown:{total:1_000_000},musicBudget:0,unpaidPackageBudget:950_000,lockedStreamingFundingAmount:0,investorRaiseAmount:2_000_000};
const preview=quoteOwnedFundingPreview(previewInput);assert.equal(preview.maxMarketingBudget,200_000);assert.ok(preview.normalizedInvestorRaise<=950_000);assert.equal(preview.maxInvestorRaise,preview.normalizedInvestorRaise);
const commission=quoteOwnedFundingPreview({...previewInput,isPlayerPlatformCommission:true});assert.equal(commission.maxMarketingBudget,0);assert.equal(commission.maxInvestorRaise,0);assert.equal(commission.normalizedInvestorRaise,0);
console.log(JSON.stringify({actualPreviewCases:2,kind:'SOURCE_UI_PREVIEW_NOT_CAREER_RESULTS'}));
