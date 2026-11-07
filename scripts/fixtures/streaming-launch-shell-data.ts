/**
 * Define the Launch's shell, two ways (#110): `fresh` — nothing settled but Pricing, the ident blocked, the plan
 * $40M over the studio's money — and `ready` — every stage settled, nothing blocking. Read by the shell audit
 * (`audit-streaming-launch-shell.tsx`) and its browser page (`streaming-launch-shell.html`).
 */
import { STREAMING_STOREFRONT_LAYOUTS } from '../../services/streamingStorefront';
import type { Country, LaunchData, LaunchDraft } from '../../components/studio-finance/finance/launch';

export type ShellScenario = 'fresh' | 'ready';

const pricing: LaunchDraft['pricing'] = {
  streams: ['subs'],
  plans: [
    { id: 'essential', name: 'Essential', monthly: 8, featureIds: [], ads: false },
    { id: 'standard', name: 'Standard', monthly: 13, featureIds: ['hd'], ads: false },
    { id: 'premiere', name: 'Premiere', monthly: 18, featureIds: ['hd', 'downloads'], ads: false },
  ],
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

export const shellCountry = (id: string, name: string, flag: string): Country => ({
  id, code: flag, name, region: 'North America', subRegionId: 'NA', subRegion: 'North America', authored: false,
  competition: 'OPEN', difficulty: 'LOW', audience: 12_000_000, addressableHouseholds: 5_000_000, growth: 7,
  opportunity: '', languages: [{ name: 'English', share: 100 }], rightsEstimate: 2_000_000, complianceCost: 400_000,
  rivals: [], localizationNote: '',
  dossier: {
    approvalWeeks: '4–6 weeks', consumerRequirements: ['Local terms'], levels: { tax: 0, review: 1, privacy: 1, localContent: 0 },
    taxBaseline: '10%', privacyLevel: 'Standard', localContentObligation: 'None', regulatoryOverhead: 0, risks: [], clearances: [],
    regulatoryExpectation: 'Local terms apply.', edgeSites: 1, peakConcurrent: 25_000, bandwidthGbps: 40, infraCity: 'Regional hub',
  },
} as unknown as Country);

const countries = [shellCountry('US', 'United States', 'US'), shellCountry('CA', 'Canada', 'CA')];

export function shellData(scenario: ShellScenario): LaunchData {
  const ready = scenario === 'ready';
  return {
    company: { name: 'Northwind+', week: 12, brandHex: '#5b36ff', markId: 'BOLT' },
    treasury: ready
      ? { available: 100_000_000, founderContributed: 100_000_000, planned: 30_000_000, committed: 0, paid: 0 }
      : { available: 100_000_000, founderContributed: 100_000_000, planned: 140_000_000, committed: 0, paid: 0 },
    energy: { current: 100, max: 100 },
    capitalRoutes: [],
    regions: ['North America'],
    countries,
    selectedCountryIds: ready ? countries.map(c => c.id) : [],
    clearance: ready ? countries.map(c => ({ countryId: c.id, outcome: 'APPROVED' })) : [],
    identSounds: [{ id: 'pulse', name: 'Pulse', description: 'Two low hits' }],
    identPackages: [
      { id: 'sting', name: 'Just the ident', cost: 0, description: 'A clean opening mark.', included: true, frames: ['Ident'] },
    ],
    ident: { soundId: 'pulse', packageId: 'sting', commissioned: ready, committedCost: 0, purchasedPackageIds: [] },
    /* #122: every front page, as the wizard lists them, with titles that carry a genre */
    storefronts: STREAMING_STOREFRONT_LAYOUTS.map(layout => ({
      id: layout.id, name: layout.name, line: layout.line, effects: [...layout.effects], layout: layout.composition, family: layout.family,
      category: layout.category, experimental: layout.experimental,
    })),
    storefrontTitles: [
      ['w1', 'Atlas Rising', 'Series', 'Sci-Fi'], ['w2', 'Night Ledger', 'Film', 'Thriller'], ['w3', 'Crown City', 'Film', 'Drama'],
      ['w4', 'Paper Cities', 'Series', 'Comedy'], ['w5', 'Iron Tide', 'Film', 'Action'], ['w6', 'Little Lanterns', 'Series', 'Animation'],
      ['w7', 'Velvet Hour', 'Film', 'Romance'], ['w8', 'Deep Field', 'Film', 'Documentary'],
    ].map(([id, name, format, genre], index) => ({ id, name, format, genre, posterSeed: id, linked: index % 3 === 0 })),
    pricingApproaches: [],
    pricing,
    market: { rivalAveragePrice: 12, reachRate: 0.03 },
    offer: { storefrontId: 'cinema', saved: ready },
    catalogue: {
      titles: ready ? 1_240 : 0, hours: ready ? 2_900 : 0, hoursNeeded: 500, ownedAvailable: 0, ownedLinked: 0,
      externalLicences: 0, activeAgreements: 0, genreCoverage: [], gaps: [], readiness: ready ? 1 : 0, readyForLaunch: ready,
      anchors: [], shelfStrategy: 'Opening night',
    },
    forecast: { audience: 0, peakConcurrent: 0, bandwidthGbps: 0, edgeSites: 0 },
    blockers: ready ? [] : [
      { id: 'no-ident', step: 'ident', severity: 'block', text: 'No service ident has been commissioned.' },
      { id: 'no-markets', step: 'markets', severity: 'warn', text: 'Choose at least one opening market.' },
    ],
    blueprintSaved: ready,
    capabilityLocks: {},
    capabilityLockTech: {},
  } as unknown as LaunchData;
}

export const shellDraft = (scenario: ShellScenario): LaunchDraft => ({
  selectedCountryIds: scenario === 'ready' ? countries.map(c => c.id) : [],
  soundId: 'pulse',
  packageId: 'sting',
  storefrontId: 'cinema',
  pricing: { ...pricing, streams: [...pricing.streams] },
});
