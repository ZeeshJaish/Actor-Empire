/* Dev page: the opening night on a loop, with no game and no save behind it. http://localhost:3500/night-lab.html. Not part of the game bundle (see night-lab.html). */
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import type { StreamingLaunchOutcomeTier } from '../types';
import NightReplay from '../components/streaming-transplant/opening-night/NightReplay';
import './nightLab.css';

const TIERS: Array<{ id: StreamingLaunchOutcomeTier; label: string }> = [
  { id: 'SMOOTH_OPENING', label: 'It held' },
  { id: 'PRESSURED_OPENING', label: 'Held, just' },
  { id: 'DEGRADED_OPENING', label: 'Buckled' },
];
const TONES = [
  { id: 'blue', hue: 218, sat: 92, accentHue: 38 },
  { id: 'red', hue: 356, sat: 88, accentHue: 44 },
  { id: 'purple', hue: 262, sat: 84, accentHue: 190 },
  { id: 'green', hue: 152, sat: 72, accentHue: 48 },
  { id: 'gold', hue: 42, sat: 92, accentHue: 210 },
];
/* how long the flood runs before the night starts again */
const FLOOD_MS = 11000;

/* ?bare: the night alone, at the window's size, for screenshots; the outcome can be set from a script */
const BARE = new URLSearchParams(window.location.search).has('bare');

const Lab = () => {
  /* null: a different outcome each time round */
  const [fixedTier, setFixedTier] = useState<StreamingLaunchOutcomeTier | null>(null);
  const [tone, setTone] = useState(TONES[0]);
  /* a browser only allows sound after a click, so it starts off and the chip is that click */
  const [sound, setSound] = useState(() => new URLSearchParams(window.location.search).has('sound'));
  const [looping, setLooping] = useState(true);
  const [run, setRun] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const again = () => {
    window.clearTimeout(timer.current);
    setRun(value => value + 1);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const loopingRef = useRef(looping);
  loopingRef.current = looping;
  const tier = fixedTier ?? TIERS[run % TIERS.length].id;
  (window as unknown as { __labTier: (next: StreamingLaunchOutcomeTier) => void }).__labTier = next => { setFixedTier(next); again(); };

  return (
    <div className={BARE ? 'nl nlBare' : 'nl'}>
      {!BARE && <div className="nlBar">
        <div className="nlGroup">
          <span className="nlLabel">RESULT</span>
          <button type="button" className="nlChip" aria-pressed={fixedTier === null} onClick={() => setFixedTier(null)}>Each in turn</button>
          {TIERS.map(item => (
            <button key={item.id} type="button" className="nlChip" aria-pressed={fixedTier === item.id} onClick={() => { setFixedTier(item.id); again(); }}>{item.label}</button>
          ))}
        </div>
        <div className="nlGroup">
          <span className="nlLabel">COLOUR</span>
          {TONES.map(item => (
            <button key={item.id} type="button" className="nlTone" aria-label={item.id} aria-pressed={tone.id === item.id} style={{ background: `hsl(${item.hue} ${item.sat}% 58%)` }} onClick={() => { setTone(item); again(); }} />
          ))}
        </div>
        <div className="nlGroup">
          <button type="button" className="nlChip" aria-pressed={sound} onClick={() => { setSound(value => !value); again(); }}>Sound {sound ? 'on' : 'off'}</button>
          <button type="button" className="nlChip" aria-pressed={looping} onClick={() => setLooping(value => !value)}>Loop {looping ? 'on' : 'off'}</button>
          <button type="button" className="nlChip" onClick={again}>Play again</button>
        </div>
      </div>}
      <div className="nlStage" data-lab-run={run} data-lab-tier={tier}>
        <NightReplay
          key={`${run}-${tone.id}-${sound}`}
          framed
          tier={tier}
          tone={tone}
          silent={!sound}
          onClose={again}
          onAgain={again}
          onFlood={() => {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => { if (loopingRef.current) again(); }, FLOOD_MS);
          }}
        />
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('lab')!).render(<React.StrictMode><Lab /></React.StrictMode>);
