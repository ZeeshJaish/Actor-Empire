/**
 * #263: the opening night, played again, from the dev menu or the night lab (night-lab.html). It goes straight to the count and it writes nothing: there is no save anywhere below
 * this. "PLAY AGAIN" in the flood runs it once more.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Player, StreamingLaunchOutcomeTier } from '../../../types';
import { PremiereNight } from '../StreamingPremiereExperience';
import type { Brand } from '../StreamingBrandVisuals';
import { replayNightOf } from './replayNightData';

const NightReplay: React.FC<{
  player?: Player | null;
  tier?: StreamingLaunchOutcomeTier;
  /** the lab's colour chips */
  tone?: Pick<Brand, 'hue' | 'sat' | 'accentHue'> | null;
  silent?: boolean;
  /** inside the lab's frame, not over the whole game */
  framed?: boolean;
  onClose: () => void;
  onAgain?: () => void;
  onFlood?: () => void;
}> = ({ player = null, tier, tone = null, silent = false, framed = false, onClose, onAgain, onFlood }) => {
  const [night] = useState(() => replayNightOf(player, tier ?? 'SMOOTH_OPENING'));
  const brand = tone ? { ...night.brand, ...tone } : night.brand;
  const show = <PremiereNight autoPlay silent={silent} brand={brand} inputs={night.inputs} onDone={onClose} onAgain={onAgain} onFlood={onFlood} />;
  if (framed) return show;
  return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#000' }}>{show}</div>, document.body);
};

export default NightReplay;
