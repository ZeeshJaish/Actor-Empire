import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { buildStoreUiModel } from '../services/storeUiAdapter';
import { StorePage } from '../views/StorePage';

const player: Player = {
  ...INITIAL_PLAYER,
  flags: {
    ...INITIAL_PLAYER.flags,
    premiumPurchases: ['no_ads'],
    bonusEnergyBank: 250,
  },
};

const model = buildStoreUiModel(player, 'en', {
  energy_100: '₹89',
  energy_250: '₹179',
  energy_500: '₹349',
  energy_1000: '₹599',
});
assert.deepEqual(model.groups.map(group => [group.id, group.items.length]), [
  ['ad_free', 1],
  ['energy', 4],
  ['cash', 5],
  ['collection', 4],
]);
assert.equal(model.groups[0].items[0].owned, true);
assert.equal(model.groups[1].items.find(item => item.id === 'energy_1000')?.bestValue, true);
assert.equal(model.groups[1].items.find(item => item.id === 'energy_1000')?.price, '₹599');
assert.equal(model.groups[2].items.find(item => item.id === 'cash_1250000')?.bestValue, true);

const html = renderToStaticMarkup(
  <StorePage
    player={player}
    onBack={() => undefined}
    onWatchAd={() => undefined}
    onPremiumPurchase={() => undefined}
    onRestorePurchases={() => undefined}
  />,
);

assert.match(html, /data-ui="actor-empire-store-overhaul"/);
assert.match(html, /role="tablist"/);
assert.match(html, /aria-selected="true"[^>]*>[^<]*(?:<[^>]+>)*REWARDS/i);
assert.match(html, /aria-label="Watch ad for 5,000 cash"/);
assert.match(html, /aria-label="Watch ad to refill 25 energy"/);
assert.equal((html.match(/Restore Purchases/g) || []).length, 1, 'Restore Purchases must have one clear entry point.');
assert.doesNotMatch(html, /Primary game navigation/, 'Store must continue using the app-level navigation only.');

console.log('Store UI transplant audit passed.');
