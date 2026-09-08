// Development-only fixture. Not imported by the game and never writes real save slots.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import { contentMarketFixture } from '../helpers/contentMarketFixture';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';
import { MobilePage } from '../../views/mobile/MobilePage';
import { getContentMarketListings } from '../../services/streamingContentMarket';
import { openStreamingPrivateOffer, processStreamingPrivateOffersWeek } from '../../services/streamingRightsMarketplace';
import { advanceStreamingBuyerAuction, getStreamingBuyerAuctionLots, openStreamingBuyerAuction, placeStreamingBuyerAuctionBid } from '../../services/streamingBuyerAuctions';

function Fixture() {
  const messageMode = new URLSearchParams(location.search).has('message');
  const auctionMessageMode = new URLSearchParams(location.search).has('auctionMessage');
  const [player, setPlayer] = useState(() => {
    const saved = sessionStorage.getItem('cm1-isolated-player');
    if (saved) return JSON.parse(saved);
    const p = contentMarketFixture();
    p.money = 900_000_000;
    if (new URLSearchParams(location.search).has('noStudio')) { p.businesses = []; p.pastProjects = []; }
    if (new URLSearchParams(location.search).has('gold')) p.ownedStreamingPlatform.identity!.primaryColor = '#f1bd24';
    p.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(p.ownedStreamingPlatform, p.id);
    if (messageMode) {
      const listing = getContentMarketListings(p)[0];
      const opened = openStreamingPrivateOffer(p, listing.id, {
        ...listing.terms,
        minimumGuarantee: Math.round(listing.rivalBidAmount * 1.4),
      });
      if (opened.changed && opened.negotiation?.responseDueAbsoluteWeek != null) {
        return processStreamingPrivateOffersWeek(opened.player, opened.negotiation.responseDueAbsoluteWeek).player;
      }
    }
    if (auctionMessageMode) {
      const lot = getStreamingBuyerAuctionLots(p)[0];
      const opened = openStreamingBuyerAuction(p, lot.id, 6_000_000);
      if (opened.changed && opened.session) {
        const bid = placeStreamingBuyerAuctionBid(opened.player, opened.session.id, {
          minimumGuarantee: Math.round(lot.referenceValue * 1.8),
          licensorRevenueShare: lot.allowedTerms.backendMaximum,
          marketingGuarantee: lot.allowedTerms.marketingMaximum,
          futureGreenlight: lot.allowedTerms.futureGreenlightAllowed,
        }, 6_001_000);
        if (bid.changed) return advanceStreamingBuyerAuction(bid.player, opened.session.id, 45, 6_046_000).player;
      }
    }
    return p;
  });
  const [screen, setScreen] = useState<'MESSAGES' | 'HQ'>(messageMode || auctionMessageMode ? 'MESSAGES' : 'HQ');
  const [offerId, setOfferId] = useState<string | undefined>();
  const update = (next: typeof player) => { sessionStorage.setItem('cm1-isolated-player', JSON.stringify(next)); setPlayer(next); };
  if (screen === 'MESSAGES') return <MobilePage player={player} initialAppMode="MESSAGES" onUpdatePlayer={update}
    onDeleteMessage={id => update({ ...player, inbox: player.inbox.filter(message => message.id !== id) })}
    onOpenStreamingContentOffer={id => { setOfferId(id); setScreen('HQ'); }} />;
  return <StreamingPlatformHQ player={player} onUpdatePlayer={update} onBack={() => {}} initialContentMarketOfferId={offerId} />;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
