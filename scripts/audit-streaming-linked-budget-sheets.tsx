import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetLinkSection } from '../components/studio-finance/components/BudgetLinkSection';
import { BuildBudgetContent, LaunchBudgetContent } from '../components/studio-finance/components/BudgetSheets';
import {
  createBuildBudgetSummary,
  createLaunchBudgetSummary,
  countCompletedBudgetSteps,
  resolveLinkedBudgetDestination,
  type LinkedBudgetSummary,
} from '../components/studio-finance/finance/budgetLinks';
import { getStreamingDefineLaunchWizardProgress } from '../services/streamingLaunchProgram';
import { infrastructureMoneyPlan } from '../components/studio-finance/finance/build';

assert.deepEqual(infrastructureMoneyPlan({
  lines: [
    { id: 'infra', label: 'Infrastructure commissioning', amount: 530_000_000, timing: 'COMMISSION' },
    { id: 'marketing', label: 'Launch marketing ceiling', amount: 7_800_000_000, timing: 'OPENING_NIGHT' },
  ],
  total: 8_330_000_000,
  commissionNow: 530_000_000,
  deferred: 7_800_000_000,
  available: 10_000_000_000,
  headroom: 1_670_000_000,
  shortfall: 0,
}), {
  lines: [{ id: 'infra', label: 'Infrastructure commissioning', amount: 530_000_000, timing: 'COMMISSION' }],
  total: 530_000_000,
  commissionNow: 530_000_000,
  deferred: 0,
  available: 10_000_000_000,
  headroom: 9_470_000_000,
  shortfall: 0,
});

const summary: LinkedBudgetSummary = {
  program: 'Build the Platform',
  status: 'Draft',
  primaryLabel: 'Proposed build',
  primaryValue: '$21.9M',
  metrics: [
    { label: 'Network', value: '8 racks · 3 cities' },
    { label: 'Weekly operation', value: '$720K' },
  ],
};

const markup = renderToStaticMarkup(
  <BudgetLinkSection
    id="build-budget-link"
    summary={summary}
    actionLabel="Open Build"
    onOpen={() => undefined}
  />,
);

assert.match(markup, /Build the Platform/);
assert.match(markup, /Draft/);
assert.match(markup, /\$21\.9M/);
assert.match(markup, /aria-expanded="false"/);
assert.doesNotMatch(markup, /Weekly operation/);

const launchMarkup = renderToStaticMarkup(
  <LaunchBudgetContent
    rows={[
      { id: 'markets', label: 'Opening markets', done: true, cost: 0, paidAmount: 0, paymentState: 'included' },
      { id: 'clearance', label: 'Market clearance', done: true, cost: 81_600_000, paidAmount: 81_600_000, paymentState: 'paid' },
      { id: 'catalogue', label: 'Opening catalogue', done: false, cost: null, paidAmount: 0, paymentState: 'pending' },
    ]}
    available={500_000_000}
    linkedSummary={summary}
    onSelectStep={() => undefined}
    onOpenLinked={() => undefined}
  />,
);
assert.match(launchMarkup, /Launch checklist/);
assert.match(launchMarkup, /Stages cleared/);
assert.match(launchMarkup, /2\/3/);
assert.match(launchMarkup, /Not priced/);
assert.match(launchMarkup, /Build the Platform/);

const launchSummary: LinkedBudgetSummary = {
  program: 'Define the Launch',
  status: 'Approved',
  primaryLabel: 'Known launch subtotal',
  primaryValue: '$86.1M',
  metrics: [{ label: 'Stages cleared', value: '5/7' }],
};
const buildMarkup = renderToStaticMarkup(
  <BuildBudgetContent
    stages={[
      { id: 'network', label: 'Network', done: true, detail: 'Settled' },
      { id: 'money', label: 'Money', done: true, detail: 'Settled' },
      { id: 'test', label: 'Test', done: false, detail: 'Not started' },
      { id: 'launch', label: 'Launch', done: false, detail: 'Not started' },
    ]}
    lines={[
      { id: 'launch-paid', label: 'Market clearance already settled', amount: 81_600_000, locked: true },
      { id: 'infra', label: 'Infrastructure construction', amount: 18_000_000, note: '8 racks' },
      { id: 'reserve', label: 'Operating reserve · six weeks', amount: 3_900_000, note: '$650K a week' },
    ]}
    total={21_900_000}
    available={500_000_000}
    headroom={478_100_000}
    shortfall={0}
    linkedSummary={launchSummary}
    onSelectStage={() => undefined}
    onOpenLinked={() => undefined}
  />,
);
assert.match(buildMarkup, /Build checklist/);
assert.match(buildMarkup, /2\/4/);
assert.match(buildMarkup, /Infrastructure construction/);
assert.match(buildMarkup, /Operating reserve/);
assert.doesNotMatch(buildMarkup, /Market clearance already settled/);
assert.match(buildMarkup, /Define the Launch/);

assert.deepEqual(createBuildBudgetSummary({
  hasDraft: true,
  approved: true,
  commissioned: false,
  live: false,
  total: 21_900_000,
  weeklyOperatingCost: 650_000,
  buildWeeks: 5,
  racks: 8,
  cities: 3,
  redundancy: 'Redundant',
}), {
  program: 'Build the Platform',
  status: 'Approved',
  primaryLabel: 'Proposed build',
  primaryValue: '$21.9M',
  metrics: [
    { label: 'Network', value: '8 racks · 3 cities' },
    { label: 'Resilience', value: 'Redundant', tone: 'good' },
    { label: 'Weekly operation', value: '$650K' },
    { label: 'Build time', value: '5 weeks' },
  ],
});

assert.deepEqual(createBuildBudgetSummary({
  hasDraft: true,
  approved: true,
  commissioned: true,
  live: false,
  total: 54_400_000,
  weeklyOperatingCost: 650_000,
  buildWeeks: 10,
  buildWeeksRemaining: 7,
  racks: 13,
  cities: 5,
  redundancy: 'Redundant',
}), {
  program: 'Build the Platform',
  status: 'Building',
  primaryLabel: 'Capital invested',
  primaryValue: '$54.4M',
  metrics: [
    { label: 'Network', value: '13 racks · 5 cities' },
    { label: 'Resilience', value: 'Redundant', tone: 'good' },
    { label: 'Weekly operation', value: '$650K' },
    { label: 'Construction', value: '7 weeks remaining', tone: 'warn' },
  ],
});

assert.deepEqual(createLaunchBudgetSummary({
  completedStages: 5,
  totalStages: 7,
  knownSubtotal: 86_100_000,
  paidAmount: 86_100_000,
  dueAmount: 0,
  blueprintSaved: false,
  live: false,
}), {
  program: 'Define the Launch',
  status: 'Draft',
  primaryLabel: 'Known launch subtotal',
  primaryValue: '$86.1M',
  metrics: [
    { label: 'Stages cleared', value: '5/7' },
    { label: 'Paid', value: '$86.1M', tone: 'good' },
    { label: 'Still due', value: '$0' },
  ],
});

assert.deepEqual(resolveLinkedBudgetDestination('LAUNCH'), { surface: 'BUILD', sheet: 'build' });
assert.deepEqual(resolveLinkedBudgetDestination('BUILD'), { surface: 'DEFINE_LAUNCH', sheet: 'plan' });
assert.equal(countCompletedBudgetSteps([
  { step: 'FUND', complete: true },
  { step: 'MARKETS', complete: true },
  { step: 'MARKETS', complete: true },
  { step: 'CLEARANCE', complete: true },
  { step: 'PRICING', complete: false },
]), 2);

assert.equal(countCompletedBudgetSteps([
  { step: 'FUND', complete: true },
  { step: 'MARKETS', complete: true },
  { step: 'CLEARANCE', complete: true },
  { step: 'IDENTITY', complete: true },
  { step: 'STOREFRONT', complete: true },
  { step: 'CATALOGUE', complete: true },
  { step: 'PRICING', complete: true },
  { step: 'BLUEPRINT', complete: true },
]), 7, 'Funding is a budget condition, not an eighth Define the Launch stage.');

assert.deepEqual(getStreamingDefineLaunchWizardProgress({ milestones: [
  { id: 'FUND_COMPANY', trackId: 'DEFINE_LAUNCH', complete: true },
  { id: 'OPENING_MARKETS', trackId: 'DEFINE_LAUNCH', complete: true },
  { id: 'MARKET_CLEARANCES', trackId: 'DEFINE_LAUNCH', complete: true },
  { id: 'SERVICE_IDENT', trackId: 'DEFINE_LAUNCH', complete: true },
  { id: 'STOREFRONT_PRICING', trackId: 'DEFINE_LAUNCH', complete: true },
  { id: 'OPENING_CATALOGUE', trackId: 'DEFINE_LAUNCH', complete: true },
  { id: 'PRICING', trackId: 'DEFINE_LAUNCH', complete: true },
  { id: 'LAUNCH_BLUEPRINT', trackId: 'DEFINE_LAUNCH', complete: true },
]}), { completedCount: 7, totalCount: 7 });

console.log('Streaming linked budget sheets audit passed.');
