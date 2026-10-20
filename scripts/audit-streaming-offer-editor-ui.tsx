import assert from 'node:assert/strict';
import { createStreamingLicenseContract, createStreamingRightsContractFromLicense, registerStreamingRightsContract } from '../services/streamingRightsCore';
import { getAbsoluteWeek } from '../services/legacyLogic';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as model from '../content-market-exact/model';
import * as adapter from '../content-market-exact/adapter';
import { ContentMarket } from '../content-market-exact/ExactContentMarket';
import StreamingContentMarket from '../components/StreamingContentMarket';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getContentMarketCollections, getContentMarketListings, getContentMarketPrivateOfferDefaults } from '../services/streamingContentMarket';
import { processStreamingPrivateOffersWeek, acceptStreamingRightsCounter, signStreamingRightsDeal } from '../services/streamingRightsMarketplace';

const brand: any = { name: 'Empire+', hue: 252, sat: 88, markId: 'FRAME_PLAY', identMode: 'badge', identLen: 2 };
let passed = 0;
const failures: string[] = [];
const check = (name: string, run: () => void) => {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
};
const player = contentMarketFixture();
player.ownedStreamingPlatform.treasuryCash = 50_000_000_000_000;
player.world.projects = Array.from({ length: 9 }, (_, i) => ({ ...player.world.projects[i % 6], id: `private-ui-${i}`, studioId: `seller-${Math.floor(i / 3)}`, rating: 3, boxOffice: 1000000 }));
const collections = getContentMarketCollections(player);
const source = collections.find(row => getContentMarketPrivateOfferDefaults(player, row.id));
assert.ok(source, 'Fixture must have a real non-auction collection');
const lot = adapter.buildExactContentMarketLots(player, { listings: [], collections: [source], auctionLots: [], upcomingSales: [], ownedTitles: [] })[0];
check('whole USD parser preserves editing states and never rounds or clamps', () => {
  const parse = (model as any).parseOfferUsd;
  assert.equal(typeof parse, 'function');
  for (const draft of ['', ' ', '-', '1.', '1.01', '-1', '1e6', 'Infinity', '1,23', '9007199254740992']) assert.equal(parse(draft, 5e12).value, null, draft);
  for (const [draft, value] of [['0', 0], ['123456789', 123456789], ['123,456,789', 123456789], ['5000000000000', 5e12]] as const) assert.equal(parse(draft, 5e12).value, value);
  assert.equal(parse('5000000001', 5e9).value, null);
});
check('offer renders custom exact USD, supported clauses and no Marketing controls', () => {
  const html = renderToStaticMarkup(<ContentMarket brand={brand} state={{ treasury: 5e12, committed: 0, week: 12, subs: 0 }} catalogue={[lot]} initialScene="OFFER" initialLotId={lot.id} onBack={() => {}} />);
  assert.match(html, /aria-label="Upfront offer in USD"/);
  assert.doesNotMatch(html, />Marketing<|>MARKETING<|250K/);
  for (const label of ['Sequel rights', 'Sublicensing', 'Renewal option']) assert.ok(html.includes(`About ${label}`), label);
  assert.match(html, /First window/);
  assert.match(html, /No sequel rights/);
});
check('canonical adapter submits exact collection and keeps persisted negotiation identity through reply and signature', () => {
  const prepare = (adapter as any).prepareExactContentMarketOffer;
  const submit = (adapter as any).submitExactContentMarketOffer;
  assert.equal(typeof prepare, 'function'); assert.equal(typeof submit, 'function');
  const prepared = prepare(player, lot);
  assert.ok(prepared);
  assert.equal(prepared.listed.backendPct, 0);
  const offer = { ...model.offerFrom(prepared.listed), markets: source.package.requestedCountryIds, mg: source.totalGuarantee + 123 };
  const result = submit(player, prepared, offer);
  assert.equal(result.changed, true, result.detail);
  const negotiation = result.negotiation!;
  assert.equal(negotiation.minimumGuarantee, offer.mg);
  assert.equal(negotiation.sourceProjectId, source.id);
  assert.equal(negotiation.marketingGuarantee, 0);
  assert.equal(negotiation.cancellationPenalty, prepared.offerDefaults.cancellationPenalty);
  assert.equal(negotiation.durationWeeks, source.package.maximumDurationWeeks);
  assert.equal(negotiation.sequelRightsIncluded, false);
  const invalid = submit(player, prepared, { ...offer, mg: 123.4 });
  assert.equal(invalid.changed, false);
  assert.equal(invalid.player, player);
  assert.equal(negotiation.collectionSnapshot.package.components.length, source.package.components.length);
  const render = (p: typeof player) => renderToStaticMarkup(<StreamingContentMarket player={p} brand={brand} initialOfferId={negotiation.id} onUpdatePlayer={() => {}} onClose={() => {}} onOpenFinance={() => {}} onCommission={() => {}} onReview={() => {}} />);
  const pending = render(JSON.parse(JSON.stringify(result.player)));
  const index = renderToStaticMarkup(<StreamingContentMarket player={result.player} brand={brand} initialTab="OFFERS" onUpdatePlayer={() => {}} onClose={() => {}} onOpenFinance={() => {}} onCommission={() => {}} onReview={() => {}} />);
  assert.match(index, /Your private offers/);
  assert.ok(index.includes(negotiation.title));
  assert.match(pending, /Revise offer/);
  assert.match(pending, new RegExp(`${source.package.components.length} titles`));
  assert.match(pending, /Frozen collection/);
  let next = result.player;
  for (let i = 0; i < 4; i++) { next = { ...next, currentWeek: next.currentWeek + 1 }; next = processStreamingPrivateOffersWeek(next, (next.age - 1) * 52 + next.currentWeek - 1).player; }
  const replied = next.ownedStreamingPlatform.rightsNegotiations.find((n: any) => n.id === negotiation.id)!;
  if (replied.responseStatus === 'SELLER_COUNTERED') next = acceptStreamingRightsCounter(next, replied.id).player;
  assert.match(render(next), /Sign agreement/);
  const signed = signStreamingRightsDeal(next, negotiation.id);
  assert.equal(signed.changed, true, signed.detail);
  assert.equal(signed.player.ownedStreamingPlatform.catalogLicenses.length, source.package.components.length);
});
check('canonical adapter sends an individual custom amount unchanged', () => {
  const listing = getContentMarketListings(player).find(row => getContentMarketPrivateOfferDefaults(player, row.id));
  assert.ok(listing);
  const item = adapter.buildExactContentMarketLots(player, { listings: [listing], collections: [], auctionLots: [], upcomingSales: [], ownedTitles: [] })[0];
  const prepared = (adapter as any).prepareExactContentMarketOffer(player, item);
  const offer = { ...model.offerFrom(prepared.listed), markets: listing.countryIds, mg: listing.terms.minimumGuarantee + 123 };
  const result = (adapter as any).submitExactContentMarketOffer(player, prepared, offer);
  assert.equal(result.changed, true, result.detail);
  assert.equal(result.negotiation.minimumGuarantee, offer.mg);
});
check('inherited fixed clauses and penalty display the canonical source and survive actual transfer', () => {
  const resale = contentMarketFixture();
  resale.businesses = []; resale.pastProjects = [];
  resale.world.projects = resale.world.projects.slice(0, 1);
  const week = getAbsoluteWeek(resale.age, resale.currentWeek);
  const license = createStreamingLicenseContract({ id: 'ui-inherited-trade', sourceProject: resale.world.projects[0], buyerPlatformId: 'NETFLIX', platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'Harbour', territory: 'MULTI_REGION', durationWeeks: 104, exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 1000000, platformRevenueShare: 100,
    signedAtAbsoluteWeek: week - 3, startsAtAbsoluteWeek: week - 3, countryIds: ['US', 'IN'], origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null, windowType: 'FIRST_WINDOW',
    renewalOption: true, sublicensingAllowed: true, sequelRightsIncluded: true, cancellationPenalty: 1234567, changeOfControl: 'CONSENT_REQUIRED', marketingGuarantee: 500000,
    accessGrant: { schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' } });
  const contract = createStreamingRightsContractFromLicense({ license, seller: { type: 'NPC_STUDIO', id: 'seller-cm1', name: 'Harbour', platformId: null }, buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' }, guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week - 3 });
  resale.world.streamingRightsContracts = registerStreamingRightsContract({}, contract).registry;
  const listing = getContentMarketListings(resale).find(row => row.sourceLicenseId === license.id)!;
  assert.ok(listing);
  const card = adapter.buildExactContentMarketLots(resale, { listings: [listing], collections: [], auctionLots: [], upcomingSales: [], ownedTitles: [] })[0];
  const prepared = adapter.prepareExactContentMarketOffer(resale, card)!;
  assert.equal(prepared.listed!.renewal, 'First option');
  assert.equal(prepared.listed!.sublicense, true);
  assert.equal(prepared.listed!.sequel, true);
  const html = renderToStaticMarkup(<ContentMarket brand={brand} state={{ treasury: 5e12, committed: 0, week: 12, subs: 0 }} catalogue={[prepared]} initialScene="OFFER" initialLotId={prepared.id} onBack={() => {}} />);
  assert.match(html, /\$1,234,567/);
  assert.match(html, /consent required/);
  assert.match(html, /Inherited marketing obligation/);
  assert.match(html, /\$500,000/);
  for (const label of ['Sequel rights', 'Sublicensing', 'Renewal option']) assert.match(html, new RegExp(`aria-pressed="true" disabled=""[^>]*>[^<]*${label}`));
  const sent = adapter.submitExactContentMarketOffer(resale, prepared, { ...model.offerFrom(prepared.listed!), markets: listing.countryIds });
  assert.equal(sent.changed, true, sent.detail);
  const negotiation = sent.player.ownedStreamingPlatform.rightsNegotiations[0];
  assert.equal(negotiation.marketingGuarantee, 0, 'Proposal money support remains separate from inherited obligations');
  const due = negotiation.responseDueAbsoluteWeek!;
  const replied = processStreamingPrivateOffersWeek(sent.player, due).player;
  const atReply = { ...replied, age: Math.floor(due / 52) + 1, currentWeek: due % 52 + 1 };
  const signed = signStreamingRightsDeal(atReply, negotiation.id);
  assert.equal(signed.changed, true, signed.detail);
  const acquired = signed.player.ownedStreamingPlatform.catalogLicenses.find(row => row.sourceProjectId === license.sourceProjectId)!;
  assert.ok(acquired);
  assert.equal(acquired.renewalOption, true); assert.equal(acquired.sublicensingAllowed, true); assert.equal(acquired.sequelRightsIncluded, true);
  assert.equal(acquired.cancellationPenalty, 1234567); assert.equal(acquired.changeOfControl, 'CONSENT_REQUIRED');
  assert.equal(acquired.marketingGuarantee, 500000, 'Existing obligation survives while new proposal support stays zero');
});
check('malformed saved collection stays visible without offering signature or crashing', () => {
  const prepared = (adapter as any).prepareExactContentMarketOffer(player, lot);
  const sent = (adapter as any).submitExactContentMarketOffer(player, prepared, { ...model.offerFrom(prepared.listed), markets: source.package.requestedCountryIds });
  for (const snapshot of [{ schemaVersion: 1 }, { ...sent.negotiation.collectionSnapshot, package: { ...source.package, components: [null] } }]) {
    const damaged = JSON.parse(JSON.stringify(sent.player));
    damaged.ownedStreamingPlatform.rightsNegotiations[0] = { ...sent.negotiation, status: 'READY_TO_SIGN', responseStatus: 'SELLER_ACCEPTED', collectionSnapshot: snapshot };
    const html = renderToStaticMarkup(<StreamingContentMarket player={damaged} brand={brand} initialOfferId={sent.negotiation.id} onUpdatePlayer={() => {}} onClose={() => {}} onOpenFinance={() => {}} onCommission={() => {}} onReview={() => {}} />);
    assert.match(html, /Collection details unavailable/);
    assert.doesNotMatch(html, /Sign agreement/);
  }
});
check('upcoming details render with no selected private offer', () => {
  const upcoming = structuredClone(player);
  upcoming.ownedStreamingPlatform.upcomingRightsSales = [{ schemaVersion: 1, id: 'ui-upcoming', idempotencyKey: 'ui-upcoming', sourceProductionId: 'future-prod', sourceProjectId: 'future-title', title: 'Future Title', projectType: 'MOVIE', genre: 'DRAMA', sellerId: 'seller-0', sellerName: 'Harbour', announcedAtAbsoluteWeek: 1259, opensAtAbsoluteWeek: 1261, originalAvailabilityAbsoluteWeek: 1270, plannedAvailabilityAbsoluteWeek: 1270, durationWeeks: 104, territory: 'MULTI_REGION', countryIds: ['IN'], windowType: 'FIRST_WINDOW', exclusivity: 'NON_EXCLUSIVE', referenceValue: 10000000, minimumGuarantee: 10000000, publicInterestScore: 50, publicInterest: 'ACTIVE', publicInterestDrivers: ['In production'], status: 'ANNOUNCED', followedAtAbsoluteWeek: null, openedNotificationId: null, auctionSessionId: null, winningContractId: null, winnerName: null, resolvedAtAbsoluteWeek: null, lastProcessedAbsoluteWeek: 1259 } as any];
  upcoming.ownedStreamingPlatform.contentMarketDraft = { tab: 'OFFERS', selectedId: 'ui-upcoming', search: '', ownedIds: [] };
  const html = renderToStaticMarkup(<StreamingContentMarket player={upcoming} brand={brand} onUpdatePlayer={() => {}} onClose={() => {}} onOpenFinance={() => {}} onCommission={() => {}} onReview={() => {}} />);
  assert.match(html, /Future Title/);
  assert.match(html, /Expected availability/);
  assert.doesNotMatch(html, /Frozen collection/);
});
console.log(JSON.stringify({ passed, failures }));
if (failures.length) process.exitCode = 1;
