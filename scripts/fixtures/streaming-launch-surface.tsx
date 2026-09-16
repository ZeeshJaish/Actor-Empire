// Development-only fixture. It renders the real launch wizard against a
// deterministic player and never writes to a real save slot.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StreamingDefineLaunchExperience from '../../components/StreamingDefineLaunchExperience';
import { contentMarketFixture } from '../helpers/contentMarketFixture';
import { normalizeOwnedStreamingPlatformState } from '../../services/ownedStreamingPlatform';

function Fixture() {
  const requestedStep = new URLSearchParams(window.location.search).get('step');
  const initialStep = requestedStep === 'pricing'
    ? 'PRICING' as const
    : requestedStep === 'blueprint' ? 'BLUEPRINT' as const : undefined;
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
        customMarkDataUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22%3E%3Cpath fill=%22%23ffffff%22 d=%22M20 2 36 11v18L20 38 4 29V11z%22/%3E%3C/svg%3E',
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
