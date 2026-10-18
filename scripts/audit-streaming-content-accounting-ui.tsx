import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { balanceFixture } from './helpers/streamingBalanceFixture';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { getStreamingStudioFinanceData } from '../services/streamingStudioFinance';
import { StudioFinance } from '../components/studio-finance/components/StudioFinance';
import { TitleSheet } from '../components/studio-finance/components/TitleSheet';
import { summarize } from '../components/studio-finance/finance/derive';

const { p } = balanceFixture({ id: 'accounting-render', core: 'SUBSCRIPTION', catalog: 8 });
p.currentWeek++;
const settled = processOwnedStreamingPlatformWeek(p).player;
const op = settled.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
// Literal reporting fixture: $1,000 receipts - $200 operating - $100 content.
Object.assign(op, { subscriptionRevenue: 1_000, productRevenue: 0, worldViewingIncrementalRevenue: 0,
    totalCashCost: 200, netCashContribution: 800, contentAmortization: 100,
    accountingContribution: 700, contentAccountingVersion: 1, additionalOperatingExpense: 0 });
const title = op.titlePerformance![0];
Object.assign(title, { attributedSubscriptionRevenue: 1_000, incrementalRevenue: 0, advertisingRevenue: 0,
    allocatedCashCost: 200, allocatedContentAmortization: 100, cashContribution: 800, accountingContribution: 700 });
op.titlePerformance = [title];
const data = getStreamingStudioFinanceData(settled);
assert.equal(summarize(data.weeks, data.cash).accountingProfit, 700);
const current = renderToStaticMarkup(<StudioFinance data={data} />);
assert.match(current, /Operating profit/);
assert.match(current, /Operating cash/);
assert.match(current, /Recorded/);
assert.match(current, /\+\$700/);
const sheet = renderToStaticMarkup(<TitleSheet title={data.titles[0]} onClose={() => {}} />);
assert.match(sheet, /Period contribution/);
assert.match(sheet, /Allocated operating costs/);
assert.match(sheet, /Content amortization/);
assert.match(sheet, /\+\$700/);
assert.ok(!sheet.includes('Lifetime profit'));
const legacy = JSON.parse(JSON.stringify(data));
legacy.weeks.forEach((week: { accountingProfit: number | null }) => { week.accountingProfit = null; });
const legacyMarkup = renderToStaticMarkup(<StudioFinance data={legacy} />);
assert.match(legacyMarkup, /Unavailable for legacy accounting weeks/);
assert.ok(!legacyMarkup.includes('Operating profit</p><p class="sf-changed-copy">$0'));
if (process.env.STREAMING_ACCOUNTING_UI_FIXTURE) {
    writeFileSync(process.env.STREAMING_ACCOUNTING_UI_FIXTURE, JSON.stringify({ current: data, legacy }));
}
console.log('Finance accounting render audit passed: $700 profit, $800 operating cash, $100 non-cash content expense; legacy profit unavailable.');
