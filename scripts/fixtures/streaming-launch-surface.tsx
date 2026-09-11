// Development-only fixture. It renders the real launch wizard against a
// deterministic player and never writes to a real save slot.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StreamingDefineLaunchExperience from '../../components/StreamingDefineLaunchExperience';
import { contentMarketFixture } from '../helpers/contentMarketFixture';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';

function Fixture() {
  const requestedStep = new URLSearchParams(window.location.search).get('step');
  const initialStep = requestedStep === 'pricing' ? 'PRICING' as const : undefined;
  const [player, setPlayer] = useState(() => {
    const fixture = contentMarketFixture();
    fixture.money = 900_000_000;
    fixture.ownedStreamingPlatform = normalizeOwnedStreamingPlatformState(
      fixture.ownedStreamingPlatform,
      fixture.id,
    );
    if (fixture.ownedStreamingPlatform.identity) {
      fixture.ownedStreamingPlatform.identity = {
        ...fixture.ownedStreamingPlatform.identity,
        name: 'Empire+',
        primaryColor: '#ef3535',
      };
    }
    return fixture;
  });

  return (
    <StreamingDefineLaunchExperience
      player={player}
      onUpdatePlayer={setPlayer}
      onClose={() => {}}
      onOpenFinance={() => {}}
      onOpenCatalogue={() => {}}
      onOpenContentDesk={() => {}}
      onOpenBuild={() => {}}
      onOpenPricing={() => {}}
      onOpenTechnology={() => {}}
      initialStep={initialStep}
    />
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
