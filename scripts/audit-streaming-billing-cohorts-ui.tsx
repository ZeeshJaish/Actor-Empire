import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanPricePaths } from '../components/studio-finance/components/launch/StepPricing';
import type { PricingSettings } from '../components/studio-finance/finance/launch';

const pricing: PricingSettings = {
    streams: ['subs'],
    plans: [{ id: 'PREMIERE', name: 'Premiere', monthly: 17.99, featureIds: ['uhd'], ads: false }],
    annualDiscount: 0,
    introOffer: 50,
    introOfferPlanId: 'PREMIERE',
    ads: { minutesPerHour: 0, cpm: 0 },
    rentals: { rent: 0, buy: 0, windowWeeks: 0 },
    premium: { price: 0 },
    daypass: { price: 0 },
    sponsor: { perTitle: 0, titles: 0 },
    metered: { perHour: 0 },
    patron: { monthly: 0 },
};
const markup = renderToStaticMarkup(React.createElement(PlanPricePaths, {
    plan: pricing.plans[0], settings: pricing, share: 10,
    cohorts: [{ households: 100, monthlyStreamingBudgetPerHousehold: 9,
        priceSensitivityIndex: 50, entertainmentAppetiteIndex: 50, piracyTendencyIndex: 10 }],
    pathHouseholds: { monthly: 57, annual: 0 },
}));
assert.match(markup, /Monthly path: 100% affordable/,
    'the plan must explain that the monthly promotion fits a $9 household budget');
assert.match(markup, /Annual path: 0% affordable/,
    'the annual path must not inherit a monthly-only introductory discount');
assert.match(markup, /57 monthly buyers.*0 annual buyers/s,
    'the displayed plan allocation explains which path the canonical forecast actually chose');
assert.match(markup, /average, not a charged price/,
    'the blend is identified as an average rather than a customer bill');
assert.match(markup, /Year one.*\$188\.88/s,
    'the displayed first-year value follows the forecast buyer mix rather than the fixed 33\/67 assumption');
console.log('Billing path UI: monthly and annual affordability and buyer counts shown.');
