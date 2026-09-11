import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Business } from '../types';
import { buildLifestyleUiModel } from '../services/lifestyleUiAdapter';
import { LifestylePage } from '../views/LifestylePage';
import { CAR_CATALOG, PROPERTY_CATALOG } from '../services/lifestyleLogic';

const studio: Business = {
  id: 'studio-one',
  name: 'Zedbury Studios',
  type: 'PRODUCTION_HOUSE',
  subtype: 'INDIE_STUDIO',
  logo: '🎬',
  color: 'bg-amber-500',
  foundedWeek: 1,
  balance: 5_000_000,
  isActive: true,
  config: {
    quality: 'PREMIUM',
    pricing: 'MARKET',
    marketing: 'MEDIUM',
    marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
    theme: 'PLAYER STUDIO',
    productionType: 'Original Studio',
    amenities: [],
  },
  stats: {
    weeklyRevenue: 0,
    weeklyExpenses: 0,
    weeklyProfit: 0,
    lifetimeRevenue: 0,
    valuation: 5_000_000,
    brandHealth: 70,
    customerSatisfaction: 70,
    riskLevel: 20,
    hype: 50,
  },
  staff: [],
  products: [],
  hiringPool: [],
  lastHiringRefreshWeek: 1,
  history: [],
  studioState: {
    scripts: [],
    concepts: [],
    writers: [],
    ipMarket: [],
    lastMarketRefreshWeek: 1,
    lastWriterRefreshWeek: 1,
  },
};

const player = {
  ...INITIAL_PLAYER,
  name: 'Lifestyle Tester',
  money: 123_456,
  assets: [PROPERTY_CATALOG[0].id, CAR_CATALOG[0].id],
  businesses: [studio],
};

const model = buildLifestyleUiModel(player);
assert.equal(model.holder, 'Lifestyle Tester');
assert.equal(model.liquidCash, 123_456);
assert.equal(model.assets, PROPERTY_CATALOG[0].price + CAR_CATALOG[0].price);
assert.equal(model.destinations.find(destination => destination.id === 'studio')?.name, 'Zedbury Studios');
assert.equal(model.destinations.find(destination => destination.id === 'studio')?.active, true);
assert.deepEqual(model.destinations.map(destination => destination.id), ['studio', 'business', 'streaming', 'cinema', 'assets', 'activities']);

const html = renderToStaticMarkup(
  <LifestylePage
    player={player}
    onBuyItem={() => undefined}
    onSellItem={() => undefined}
    onSetResidence={() => undefined}
    onStartBusiness={() => undefined}
    onShutdownBusiness={() => undefined}
    onUpdatePlayer={() => undefined}
    onPremiumPurchase={() => undefined}
  />,
);

assert.match(html, /data-ui="actor-empire-lifestyle-overhaul"/);
assert.match(html, />Lifestyle</);
assert.match(html, />Zedbury Studios</);
assert.match(html, />Assets</);
assert.match(html, />Activities</);
assert.doesNotMatch(html, /Primary game navigation/, 'Lifestyle hub must use the app-level bottom navigation only.');

console.log('Lifestyle UI transplant audit passed.');
