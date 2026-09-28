import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentMarket } from '../content-market-exact/ExactContentMarket';
import { DevelopmentLabMarket } from '../views/lifestyle/business/components/DevelopmentLabMarket';
import { INITIAL_PLAYER } from '../types';
import { createBusiness } from '../services/businessLogic';

const markup = renderToStaticMarkup(<ContentMarket
    brand={{ hue: 37, sat: 70 } as any}
    state={{ treasury: 5_000_000, committed: 0, week: 9, subs: 0 }}
    catalogue={[]} initialScene="MARKET" onBack={() => {}}
    paidScout={{ price: 1_350_000, count: 2, shortfall: 0, weeksUntilFree: 2,
        onScout: () => ({ changed: false, detail: 'not executed' }) }}
/>);
assert.match(markup, /PRIVATE SCOUTING/);
assert.match(markup, /Scout \$1\.35M/);
assert.match(markup, /Paid scout #3 this cycle/);
assert.doesNotMatch(markup, /not executed/, 'rendering the screen cannot buy a scout');

const player = structuredClone(INITIAL_PLAYER);
const studio = createBusiness('Phase 7 Studio', 'PRODUCTION_HOUSE', 'INDIE_STUDIO',
    { quality: 'STANDARD', pricing: 'MARKET', marketing: 'MEDIUM' }, '', 9);
studio.balance = 5_000_000;
player.businesses.push(studio);
const studioMarkup = renderToStaticMarkup(<DevelopmentLabMarket
    market={[]} player={player} studio={studio} onUpdatePlayer={() => {}} playerMoney={studio.balance}
    onBuy={() => {}} onRefresh={() => {}} refreshPrice={1_350_000} refreshCount={2}
    refreshShortfall={0} refreshFeedback="" weeksUntilRefresh={2} currentWeek={9}
    marketTrends={[]} language="en"
/>);
assert.match(studioMarkup, /\$1\.35M/);
assert.match(studioMarkup, /Paid scout #3 this cycle/);
assert.match(studioMarkup, /studio treasury/);
console.log('Paid market scouting phase 7 UI audit: PASS');
