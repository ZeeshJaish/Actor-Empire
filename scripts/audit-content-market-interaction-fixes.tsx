import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction,
    placeStreamingBuyerAuctionBid } from '../services/streamingBuyerAuctions';
import StreamingBuyerAuctionRoom from '../components/StreamingBuyerAuctionRoom';
import * as marketModel from '../content-market-exact/model';
import * as playerUiState from '../services/playerUiState';
import { ContentMarket } from '../content-market-exact/ExactContentMarket';
import { buildExactContentMarketLots } from '../content-market-exact/adapter';
import { getContentMarketListings } from '../services/streamingContentMarket';
import { TitleDossier } from '../components/streaming-transplant/StreamingDossierExperience';

const fixture = contentMarketFixture();
const lot = getStreamingBuyerAuctionLots(fixture)[0];
assert.ok(lot, 'Fixture needs a real auction lot');
const controlledLot = {
    ...lot,
    minimumGuarantee: 4_000_000,
    minimumBidIncrement: 100_000,
    allowedTerms: {
        ...lot.allowedTerms,
        marketingMaximum: 1_300_000,
        futureGreenlightAllowed: true,
        futureGreenlightReserve: 4_000_000,
    },
};
const opened = openStreamingBuyerAuction(fixture, lot.id, 1_000_000);
assert.ok(opened.session, 'Fixture must open a real saved room');
const session = { ...opened.session!, lot: controlledLot, bids: [], leaderBidId: null };
const roomPlayer = { ...opened.player, ownedStreamingPlatform: {
    ...opened.player.ownedStreamingPlatform,
    buyerAuctionSessions: opened.player.ownedStreamingPlatform.buyerAuctionSessions.map(saved =>
        saved.id === session.id ? session : saved),
} };
const placed = placeStreamingBuyerAuctionBid(roomPlayer, session.id, {
    minimumGuarantee: 4_000_000, licensorRevenueShare: 10,
    marketingGuarantee: 1_300_000, futureGreenlight: true,
}, 1_000_001);
assert.equal(placed.session?.bids.find(bid => bid.isPlayer)?.minimumGuarantee, 4_000_000,
    'The actual auction headline is the upfront guarantee');
assert.equal(placed.session?.bids.find(bid => bid.isPlayer)?.guaranteedExposure, 9_300_000,
    'The budget separately reserves guarantee, marketing and future-original exposure');
const roomHtml = renderToStaticMarkup(<StreamingBuyerAuctionRoom player={opened.player} session={session}
    onUpdatePlayer={() => undefined} onExit={() => undefined} />);
assert.match(roomHtml, /TABLE \$4\.2(?:0)?M/, 'Bid button states the guarantee that is actually placed');
assert.match(roomHtml, /\$9\.5(?:0)?M[^<]*budget/i,
    'The separate budget reserve is visible before the player bids');

const postActionScene = (marketModel as any).getContentMarketPostActionScene;
assert.equal(typeof postActionScene, 'function', 'A successful action needs a deterministic return route');
assert.equal(postActionScene('LISTING'), 'MARKET');
assert.equal(postActionScene('OPPORTUNITY'), 'MARKET');
assert.equal(postActionScene('STUDIO'), 'STUDIO');
assert.equal(postActionScene('OFFER'), 'MARKET');

const prepareTrustedMarketUpdate = (playerUiState as any).prepareTrustedMarketUpdateForUi;
assert.equal(typeof prepareTrustedMarketUpdate, 'function',
    'A market service result needs a current-schema update path separate from legacy-save migration');
const updatedTreasury = { ...fixture, ownedStreamingPlatform: {
    ...fixture.ownedStreamingPlatform, treasuryCash: 445_000_000,
} };
const prepared = prepareTrustedMarketUpdate(updatedTreasury);
assert.equal(prepared.ownedStreamingPlatform.treasuryCash, 445_000_000);
assert.equal(prepared.world.projects, updatedTreasury.world.projects,
    'Routine market actions must not rebuild a full world and stall the next tap');

const listedLots = buildExactContentMarketLots(fixture, {
    listings: getContentMarketListings(fixture), collections: [], opportunityOffers: [],
    auctionLots: [], upcomingSales: [], ownedTitles: [],
});
const listed = listedLots.find(item => item.mode === 'LISTED' && item.sourceKind === 'LISTING');
assert.ok(listed, 'Fixture needs a real listed rights lot');
const optimisticRead = marketModel.verdictOf(listed!, {
    ...marketModel.offerFrom(listed!.listed!), mg: listed!.listed!.mg * 2,
});
assert.doesNotMatch(optimisticRead.line, /likely to sign|clears their current asking shape/i,
    'Indicative visual reads must not promise the asynchronous seller outcome');
const brand = { name: 'Empire+', markId: 'FRAME_PLAY', customMark: null,
    hue: 252, sat: 88, identId: 'PULSE', customIdent: null, promiseId: 'BALANCED',
    publicManifesto: 'Stories worth gathering for.', layoutId: 'CINEMA', typeId: 'GROTESK',
    accentHue: 35, identMode: 'badge', identLen: 2, ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null } as any;
const offerHtml = renderToStaticMarkup(<ContentMarket brand={brand}
    state={{ treasury: 500_000_000, committed: 0, week: 12, subs: 0 }} catalogue={listedLots}
    onBack={() => undefined} initialScene="OFFER" initialLotId={listed!.id} />);
assert.doesNotMatch(offerHtml, /<button[^>]*>[^<]*(?:Non-recoupable|Adjusted gross|Net receipts|Gross receipts)/i,
    'Offer editor cannot expose controls missing from the signed marketplace contract');
assert.match(offerHtml, /Nothing is charged while an offer sits with them/i,
    'Offer stage states that payment happens only after signing');
assert.doesNotMatch(offerHtml, /likely to sign|clears their current asking shape/i,
    'The visual seller read cannot promise an outcome from a different backend scoring model');

const dossierHtml = renderToStaticMarkup(<TitleDossier brand={brand} onClose={() => undefined} t={{
    id: 'market-test', title: 'The Harbour', kind: 'LICENSED', format: 'Film', genre: 'Drama',
    hue: 35, logline: 'Licensed title', status: 'READY TO SCHEDULE', rightsWeeksLeft: 104,
    viewers: 0, completion: 0, subsAcquired: 0, churnPrevented: 0,
    revenue: 0, cost: 0, rightsInvestment: 55_000_000, financialsAvailable: false,
    sources: [{ label: 'Platform discovery', pct: 100 }],
    journey: { steps: ['Acquired', 'Prepared', 'Scheduled', 'Live'], at: 1 },
    dna: [], artwork: [], press: [], maturity: { have: 0, need: 8 },
}} />);
assert.match(dossierHtml, /RIGHTS GUARANTEE PAID[\s\S]*?\$55\.0M/,
    'Catalogue dossier must show the rights fee already charged to treasury');
assert.match(dossierHtml, /REVENUE \/ LATEST WEEK[\s\S]*?—/,
    'An unreleased title must not imply measured zero revenue');

console.log('Content Market interaction fixes passed.');
