import assert from 'node:assert/strict';
import { getCinemaProjectFinance } from '../../../../services/boxOffice/boxOfficeSettlement';

// Diagnostic of the current presenter, not a proposed change or a cash settlement.
const source = { id: 'funded', budget: 100e6, totalStudioReceipts: 100e6, studioCashAtRisk: 50e6,
    investorPlan: { totalRaised: 50e6 }, investorPayouts: { lifetimeInvestorPayout: 50e6, weeklyInvestorPayouts: [50e6] } };
const actual = getCinemaProjectFinance(source as Parameters<typeof getCinemaProjectFinance>[0]);
const projectResultBeforeFinancing = source.totalStudioReceipts - source.budget;
const studioResultAfterFinancing = source.totalStudioReceipts - source.investorPayouts.lifetimeInvestorPayout - source.studioCashAtRisk;
assert.equal(actual.netProfitCents, -50e8);
assert.equal(actual.studioReturnPercent, 0);
assert.equal(projectResultBeforeFinancing, 0);
assert.equal(studioResultAfterFinancing, 0);
console.log(JSON.stringify({ kind: 'CURRENT_FINANCE_PRESENTATION_DIAGNOSTIC', source, actual,
    projectResultBeforeFinancing, studioResultAfterFinancing }, null, 2));
