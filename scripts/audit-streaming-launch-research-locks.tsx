import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StepIdent } from '../components/studio-finance/components/launch/StepIdent';
import { StepPricing } from '../components/studio-finance/components/launch/StepPricing';
import { StepStorefront } from '../components/studio-finance/components/launch/StepStorefront';
import type { StepProps } from '../components/studio-finance/components/launch/LaunchWizard';
import type { LaunchData, LaunchDraft } from '../components/studio-finance/finance/launch';

const pricing = {
  streams: ['subs'] as const,
  plans: [{ id: 'opening', name: 'Opening', monthly: 9, featureIds: ['noads', 'catalogue'], ads: false }],
  annualDiscount: 10,
  introOffer: 0,
  ads: { minutesPerHour: 4, cpm: 24 },
  rentals: { rent: 6, buy: 20, windowWeeks: 4 },
  premium: { price: 30 },
  daypass: { price: 5 },
  sponsor: { perTitle: 3_000_000, titles: 2 },
  metered: { perHour: 2 },
  patron: { monthly: 8 },
};

const data = {
  company: { name: 'Empire+', week: 12, brandHex: '#5b36ff', markId: 'BOLT' },
  treasury: { available: 100_000_000, founderContributed: 100_000_000, planned: 0, committed: 0, paid: 0 },
  energy: { current: 100, max: 100 },
  capitalRoutes: [],
  regions: [],
  countries: [],
  selectedCountryIds: [],
  clearance: [],
  identSounds: [{ id: 'pulse', name: 'Pulse', description: 'Two low hits' }],
  identPackages: [
    { id: 'sting', name: 'Just the ident', cost: 0, description: 'A clean opening mark.', included: true, frames: ['Ident'] },
    { id: 'genre', name: 'Genre worlds', cost: 7_500_000, description: 'Six authored worlds.', included: false, frames: ['Ident', 'End'] },
  ],
  ident: { soundId: 'pulse', packageId: 'sting', commissioned: false, committedCost: 0, purchasedPackageIds: [] },
  storefronts: [
    { id: 'cinema', name: 'Cinema', line: 'One premiere commands the room.', effects: ['Premium', 'Focused', 'Needs a headline'], layout: 'hero' },
    { id: 'chapters', name: 'Chapters', line: 'Editorial chapters.', effects: ['Authored', 'Discovery', 'Needs curation'], layout: 'rooms' },
  ],
  storefrontTitles: [],
  pricingApproaches: [],
  pricing,
  market: { rivalAveragePrice: 12, reachRate: 0.03 },
  offer: { storefrontId: 'cinema', saved: false },
  catalogue: {
    titles: 0,
    hours: 0,
    hoursNeeded: 500,
    ownedAvailable: 0,
    ownedLinked: 0,
    externalLicences: 0,
    activeAgreements: 0,
    genreCoverage: [],
    gaps: [],
    readiness: 0,
    anchors: [],
    shelfStrategy: 'Opening night',
  },
  forecast: { audience: 0, peakConcurrent: 0, bandwidthGbps: 0, edgeSites: 0 },
  blockers: [],
  blueprintSaved: false,
  capabilityLocks: {
    'ident:genre': 'Product Experience level 20',
    'storefront:chapters': 'Content Operations 18',
    'stream:ads': 'Commerce level 20 or EMPIRE+ Free',
    'feature:hd': 'Playback Quality level 20',
  },
} as unknown as LaunchData;

const draft: LaunchDraft = {
  selectedCountryIds: [],
  soundId: 'pulse',
  packageId: 'sting',
  storefrontId: 'cinema',
  pricing: { ...pricing, streams: [...pricing.streams] },
};

const props: StepProps = {
  data,
  draft,
  patch: () => undefined,
  chosen: [],
  treasury: data.treasury,
  free: data.treasury.available,
  gap: 0,
  handlers: {},
};

const visibleText = (markup: string) => markup
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const lockCount = (markup: string) => (markup.match(/data-research-lock="true"/g) || []).length;

const identMarkup = renderToStaticMarkup(<StepIdent {...props} />);
assert.equal(lockCount(identMarkup), 1, 'Every locked ident package should carry the shared research-lock marker.');
assert.match(visibleText(identMarkup), /Research locked.*Product Experience level 20/);

const storefrontMarkup = renderToStaticMarkup(<StepStorefront {...props} />);
assert.equal(lockCount(storefrontMarkup), 1, 'Every locked storefront layout should carry the shared research-lock marker.');
assert.match(visibleText(storefrontMarkup), /Research locked.*Content Operations 18/);

const lockedStorefrontMarkup = renderToStaticMarkup(
  <StepStorefront {...props} draft={{ ...draft, storefrontId: 'chapters' }} />,
);
assert.match(
  visibleText(lockedStorefrontMarkup),
  /Research preview/,
  'A locked storefront shown on the main stage should be named as a research preview.',
);

const pricingMarkup = renderToStaticMarkup(<StepPricing {...props} />);
assert.equal(lockCount(pricingMarkup), 1, 'Collapsed pricing keeps revenue-model research requirements visible without rendering every plan editor.');
assert.match(visibleText(pricingMarkup), /Research locked.*Commerce level 20 or EMPIRE\+ Free/);

console.log('Streaming launch research-lock UX audit passed.');
