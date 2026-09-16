import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StageMoney } from '../components/studio-finance/components/build/StageMoney';

const html = renderToStaticMarkup(React.createElement(StageMoney, {
  data: {
    treasury: { available: 50_000_000, committedLaunch: 7_000_000 },
    pricing: { model: 'Subscriptions + ads', plans: 3, arpu: 13, reach: 1_500_000, problems: [] },
    campaigns: [],
    marketing: {
      draft: { schemaVersion: 1, objective: 'PLATFORM_INTRODUCTION', timeline: 'BALANCED', budgetCeiling: 8_000_000, allocationMode: 'AUTO', countryWeights: {}, channelAllocations: { SOCIAL_DIGITAL: .6, CREATORS: .4 }, updatedAtAbsoluteWeek: 100, revision: 2 },
      recommendations: { lean: 2_000_000, balanced: 8_000_000, heavy: 14_000_000, event: 22_000_000 },
      forecast: {
        id: 'f', version: 1, signature: 's', effectiveBudget: 8_000_000, organicAwareness: .04, likelyAwarenessLift: .18,
        acquiredAccounts: { low: 80_000, likely: 120_000, high: 160_000 }, concurrentStreams: { low: 2_450_000, likely: 2_500_000, high: 2_600_000 },
        baselineConcurrentStreams: 2_400_000, saturationPercent: 96, efficiencyStatus: 'SATURATED',
        customerAcquisitionCost: 66.67, confidenceScore: 74, confidence: 'MEDIUM', warnings: [],
        countryForecasts: [{ countryId: 'US', countryName: 'United States', allocatedAmount: 8_000_000, organicAwareness: .04, likelyAwarenessLift: .18, likelyAcquiredAccounts: 120_000, likelyConcurrentStreams: 140_000, customerAcquisitionCost: 66.67, confidenceScore: 74, confidence: 'MEDIUM' }],
      },
      channels: [{ id: 'SOCIAL_DIGITAL', label: 'Social & digital', line: 'Targeted reach.', available: true }],
    },
  },
  draft: { campaignId: 'none' },
  patch: () => undefined,
  plan: { lines: [{ id: 'infra', label: 'Infrastructure commissioning', amount: 12_000_000, timing: 'COMMISSION' }, { id: 'campaign', label: 'Launch marketing ceiling', amount: 8_000_000, timing: 'OPENING_NIGHT' }], total: 20_000_000, commissionNow: 12_000_000, deferred: 8_000_000, available: 50_000_000, headroom: 30_000_000, shortfall: 0 },
  handlers: { onChangeMarketing: () => undefined },
} as never));

assert.ok(html.includes('Launch allocation'));
assert.ok(html.includes('Marketing ceiling'));
assert.ok(html.includes('Campaign plan'));
assert.ok(html.includes('Country forecast'));
assert.ok(html.includes('74% · medium confidence'), 'The forecast must show the live score behind its confidence label.');
assert.ok(html.includes('Before campaign'));
assert.ok(html.includes('With this plan'));
assert.ok(html.includes('Market saturated'));
assert.match(html, /2\.4M[\s\S]*→[\s\S]*2\.5M/, 'Opening concurrency must show the baseline and proposed result.');
assert.ok(html.includes('Complete launch bill'));
assert.ok(html.includes('Commercial setup'));
assert.ok(html.includes('Edit pricing'));
assert.equal(html.includes('Regional push'), false);
assert.equal(html.includes('National campaign'), false);
assert.equal(/<s(?:\s|>)/.test(html), false, 'Money-stage units must not use strike-through markup.');

console.log('Streaming launch marketing UI audit passed.');
