// Development-only career: exercises real HQ components and the real weekly engine.
// State lives in React only; no real save slots are read or written.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StreamingPlatformHQ from '../../components/StreamingPlatformHQ';
import { contentMarketFixture } from '../helpers/contentMarketFixture';
import { createC6QaCareer } from '../../lab/c6QaCareer';
import { configureStreamingPricingOffer } from '../../services/streamingCommercialOffers';
import { getStreamingLaunchDefinitionSignature } from '../../services/streamingLaunchProgram';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';
import { processGameWeek } from '../../services/gameLoop';
import { advanceStreamingOpportunityMarket } from '../../services/streamingOpportunityMarket';

function createQaPlayer() {
  const query = new URLSearchParams(location.search);
  const player = query.has('ready') ? createC6QaCareer() : contentMarketFixture();
  // The public-market fixture has only a skeletal studio, so run weekly QA
  // as an independent platform career; production/actor paths have separate audits.
  if (!query.has('ready')) player.businesses = [];
  const requestedMode = query.has('subscription') ? 'SUBSCRIPTION' : query.get('mode');
  if (requestedMode === 'SUBSCRIPTION' || requestedMode === 'ADVERTISING' || requestedMode === 'STORE') {
    player.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
      player.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: requestedMode });
    player.ownedStreamingPlatform.launchProgram.lastBlueprintSignature = getStreamingLaunchDefinitionSignature(player);
  }
  player.money = 900_000_000;
  player.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
  return advanceStreamingOpportunityMarket(player);
}

function Fixture() {
  const [player, setPlayer] = useState(createQaPlayer);
  const [busy, setBusy] = useState(false);
  return <>
    <aside style={{ position: 'fixed', top: 0, left: 0, zIndex: 99999, color: 'white', background: '#222', padding: 8, fontSize: 12, width: 160 }}
      aria-label="Isolated QA status">
      Isolated QA · Week {player.currentWeek}<br />
      Paid {player.ownedStreamingPlatform.metrics.subscribers.toLocaleString()}<br />
      Treasury ${player.ownedStreamingPlatform.treasuryCash.toLocaleString()}<br />
      <button disabled={busy} onClick={async () => {
        setBusy(true);
        try { setPlayer((await processGameWeek(player)).player); }
        finally { setBusy(false); }
      }}>{busy ? 'Processing QA week' : 'Advance isolated QA week'}</button>
    </aside>
    <StreamingPlatformHQ player={player} onUpdatePlayer={setPlayer} onTrustedMarketUpdate={setPlayer} onBack={() => {}} />
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
