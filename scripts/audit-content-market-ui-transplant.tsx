import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingContentMarket from '../components/StreamingContentMarket';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getContentMarketCollections, getContentMarketListings, getContentMarketSupplySummary } from '../services/streamingContentMarket';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction } from '../services/streamingBuyerAuctions';

const player = contentMarketFixture();
const brand = {
  name: 'Empire+', markId: 'FRAME_PLAY', customMark: null,
  hue: 252, sat: 88, identId: 'PULSE', customIdent: null,
  promiseId: 'BALANCED', publicManifesto: 'Stories worth gathering for.',
  layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 35,
  identMode: 'badge' as const, identLen: 2 as const,
  ratingId: 'MATURE', lockupId: 'SIDE', serverCity: null,
};

const html = renderToStaticMarkup(
  <StreamingContentMarket
    player={player}
    brand={brand}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onCommission={() => undefined}
    onReview={() => undefined}
  />,
);

assert.match(html, /data-content-market-design="zip-exact"/, 'The Content Market renders the approved ZIP design system');
assert.match(html, /data-content-market-scene="gate"/, 'Add Content opens on the ZIP gate scene');
assert.match(html, /WHERE IS IT COMING FROM\?/, 'Add Content opens on the transplanted three-route gate');
assert.match(html, /FROM YOUR STUDIO/, 'The gate keeps the owned-studio acquisition route');
assert.match(html, /COMMISSION AN ORIGINAL/, 'The gate keeps the existing commissioning route');
assert.match(html, /THE MARKET/, 'The gate opens the external rights market');
assert.doesNotMatch(html, /rights simply move/i, 'Studio import copy must not imply that ownership moves');
assert.doesNotMatch(html, /own it outright/i, 'Commission copy must not promise ownership beyond the signed contract');
assert.match(html, /\$500M to spend/, 'Buying power is projected from the real Content Market funds');
const gateSupply = getContentMarketSupplySummary(player);
assert.match(html, new RegExp(`${gateSupply.totalCanonicalTitles} TITLES · ${gateSupply.liveAuctions} LIVE`), 'The market gate counts canonical titles rather than package cards');

const marketPlayer = contentMarketFixture();
marketPlayer.ownedStreamingPlatform.contentMarketDraft = {
  tab: 'ALL', search: '', selectedId: '__open_market__', ownedIds: [],
};
const marketHtml = renderToStaticMarkup(
  <StreamingContentMarket
    player={marketPlayer}
    brand={brand}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onCommission={() => undefined}
    onReview={() => undefined}
  />,
);

assert.match(marketHtml, /data-content-market-scene="market"/, 'The external route uses the exact ZIP market-floor scene');
assert.match(marketHtml, /THE MARKET/, 'The external route uses the transplanted market-floor masthead');
assert.match(marketHtml, /WEEK 12/, 'The market masthead uses the real game week');
assert.match(marketHtml, /aria-label="Search the market"/, 'The ZIP catalogue search is present');
assert.match(marketHtml, />Filter</, 'The ZIP filter-sheet trigger is present');
assert.match(marketHtml, /aria-label="Sort"/, 'The ZIP market sort control is present');
assert.match(marketHtml, /aria-label="Toggle density"/, 'The ZIP density switch is present');
assert.match(marketHtml, /In the room now/, 'The exact rails-first market includes live rooms');
assert.match(marketHtml, /Everyone is talking about these/, 'The exact rails-first market includes public-interest discovery');
assert.match(marketHtml, /Already proven/, 'The exact rails-first market includes proven releases');
assert.match(marketHtml, /The Harbour 1/, 'The poster wall is populated from live game listings, not ZIP fixtures');
assert.match(marketHtml, /OPEN/, 'Direct-purchase cards state their real availability');
assert.match(marketHtml, /IN THE ROOM/, 'Persistent buyer auctions are integrated into the same ZIP market floor');

const detailPlayer = contentMarketFixture();
const detailListing = getContentMarketListings(detailPlayer)[0];
detailPlayer.ownedStreamingPlatform.contentMarketDraft = {
  tab: 'ALL', search: '', selectedId: detailListing.id, ownedIds: [],
};
const detailHtml = renderToStaticMarkup(
  <StreamingContentMarket
    player={detailPlayer}
    brand={brand}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onCommission={() => undefined}
    onReview={() => undefined}
  />,
);

assert.match(detailHtml, /data-content-market-scene="detail"/, 'A selected title receives the exact ZIP detail scene');
assert.match(detailHtml, /RELEASE HISTORY/, 'The exact title page includes release-history evidence');
assert.match(detailHtml, /YOU CAN LICENSE/, 'The exact avails sheet leads with eligible rights reach');
assert.match(detailHtml, />Rights</, 'The title page preserves the ZIP Rights face');
assert.match(detailHtml, />Deal</, 'The title page preserves the ZIP Deal face');
assert.match(detailHtml, />Interest</, 'The title page preserves the ZIP Interest face');
assert.match(detailHtml, /THE ASK/, 'The listed guarantee remains the primary commercial decision');
assert.match(detailHtml, /The Harbour 1/, 'The detail page uses the canonical project title');
assert.match(detailHtml, /BUY ·/, 'The existing immediate-signing action remains connected to the ZIP action bar');
assert.match(detailHtml, /OFFER/, 'The private-offer route remains connected to the ZIP action bar');

const collectionPlayer = contentMarketFixture();
collectionPlayer.world.projects.push(...Array.from({ length: 20 }, (_, index) => ({
  id: `ui-collection-${index}`,
  title: `Archive Volume ${index + 1}`,
  studioId: 'ui-collection-studio',
  mediaType: 'MOVIE',
  genre: index % 2 ? 'THRILLER' : 'DRAMA',
  rating: 7 + index / 100,
  year: 20 + index % 5,
  boxOffice: 15_000_000 + index * 1_000_000,
} as any)));
const largeCollection = getContentMarketCollections(collectionPlayer)
  .sort((left, right) => right.rows.length - left.rows.length)[0];
assert.ok(largeCollection.rows.length > 12, 'The fixture exposes a collection large enough to exercise progressive detail rendering');
const largeCollectionAuction = getStreamingBuyerAuctionLots(collectionPlayer)
  .find(lot => lot.listingKind === 'CATALOGUE_PACKAGE' && lot.listingId === largeCollection.id);
collectionPlayer.ownedStreamingPlatform.contentMarketDraft = {
  tab: largeCollectionAuction ? 'AUCTIONS' : 'COLLECTIONS',
  search: '',
  selectedId: largeCollectionAuction?.id || largeCollection.id,
  ownedIds: [],
};
const largeCollectionHtml = renderToStaticMarkup(
  <StreamingContentMarket
    player={collectionPlayer}
    brand={brand}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onCommission={() => undefined}
    onReview={() => undefined}
  />,
);
const deferredCollectionTitle = largeCollection.package.components.find(component => (
  component.sourceProjectId === largeCollection.rows[12].componentProjectId
))!.title;
assert.match(largeCollectionHtml, /data-content-market-scene="detail"/, 'A collection keeps a detail page when the current cycle assigns it to a live room');
assert.doesNotMatch(largeCollectionHtml, new RegExp(deferredCollectionTitle), 'Collection detail does not render every allocation row at once');
assert.match(largeCollectionHtml, /SHOW 8 MORE/, 'Large collection detail offers the remaining titles without rendering them immediately');

const studioPlayer = contentMarketFixture();
studioPlayer.ownedStreamingPlatform.contentMarketDraft = {
  tab: 'OWNED', search: '', selectedId: '__open_studio__', ownedIds: [],
};
const studioHtml = renderToStaticMarkup(
  <StreamingContentMarket
    player={studioPlayer}
    brand={brand}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onCommission={() => undefined}
    onReview={() => undefined}
  />,
);
assert.match(studioHtml, /data-content-market-scene="studio"/, 'The studio route uses the exact ZIP studio scene');
assert.match(studioHtml, /The Last Light/, 'The studio shelf is populated from the player production catalogue');
assert.match(studioHtml, /DELIVERED AND ELIGIBLE/, 'Studio titles explain the actual eligibility boundary');
assert.match(studioHtml, /NO FEE/, 'Studio onboarding distinguishes internal linkage from a market purchase');

const roomsPlayer = contentMarketFixture();
roomsPlayer.ownedStreamingPlatform.contentMarketDraft = {
  tab: 'AUCTIONS', search: '', selectedId: '__open_rooms__', ownedIds: [],
};
const roomsHtml = renderToStaticMarkup(
  <StreamingContentMarket
    player={roomsPlayer}
    brand={brand}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onCommission={() => undefined}
    onReview={() => undefined}
  />,
);
assert.match(roomsHtml, /data-content-market-scene="market"/, 'Live buyer auctions stay on the shared exact ZIP market floor');
assert.match(roomsHtml, /IN THE ROOM/, 'An unentered auction clearly signals that bidding is live');

const roomPlayer = contentMarketFixture();
const roomLot = getStreamingBuyerAuctionLots(roomPlayer)[0];
const openedRoom = openStreamingBuyerAuction(roomPlayer, roomLot.id, 1_000);
assert.ok(openedRoom.session, 'The canonical auction service opens the fixture room');
openedRoom.player.ownedStreamingPlatform.contentMarketDraft = {
  tab: 'AUCTIONS', search: '', selectedId: openedRoom.session!.id, ownedIds: [],
};
const liveRoomHtml = renderToStaticMarkup(
  <StreamingContentMarket
    player={openedRoom.player}
    brand={brand}
    onUpdatePlayer={() => undefined}
    onClose={() => undefined}
    onOpenFinance={() => undefined}
    onCommission={() => undefined}
    onReview={() => undefined}
  />,
);
assert.match(liveRoomHtml, /data-content-market-scene="room"/, 'The saved canonical auction uses the exact ZIP room scene');
assert.match(liveRoomHtml, /LEADING CONTRACT/, 'The room preserves the ZIP auction board');
assert.match(liveRoomHtml, /aria-label="Auction offer console"/, 'The canonical bid controls remain attached to the ZIP pinned maker');

console.log('Content Market UI transplant passed.');
