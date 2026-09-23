import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { INITIAL_PLAYER, type Player } from '../../types';
import StreamingLockedScreen from '../../components/StreamingLockedScreen';

const initial: Player = {
  ...structuredClone(INITIAL_PLAYER), id: 's2-isolated-browser-career', money: 900_000_000,
  stats: { ...structuredClone(INITIAL_PLAYER.stats), fame: 65, reputation: 55 },
  ownedStreamingPlatform: {
    ...structuredClone(INITIAL_PLAYER.ownedStreamingPlatform), lifecycle: 'ELIGIBLE',
    simulationSeed: 'owned-streaming:s2-isolated-browser-career',
    milestoneKeys: ['streaming-launch-clearance'],
  },
};

function Fixture() {
  const [player, setPlayer] = useState(initial);
  return <StreamingLockedScreen player={player} onUpdatePlayer={setPlayer} onBack={() => undefined} />;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
