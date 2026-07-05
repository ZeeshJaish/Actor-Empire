import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import '../styles/streaming-lock.css';

const PALETTES: [string, string][] = [
  ['#3b1d4f', '#120a1c'], ['#4f1d1d', '#1c0a0a'], ['#1d3b4f', '#0a141c'],
  ['#4f3b1d', '#1c140a'], ['#1d4f35', '#0a1c12'], ['#43124f', '#170a1c'],
  ['#4f2b12', '#1c0f0a'], ['#12304f', '#0a111c'], ['#2d124f', '#100a1c'],
  ['#4f1240', '#1c0a16'],
];
const TITLES = [
  'UNTITLED\nORIGINAL', 'SEASON\nONE', 'THE\nPILOT', 'EXCLUSIVE\nDROP', 'PRIME\nTIME',
  'BINGE\nBAIT', 'GOLDEN\nHOUR', 'OFF\nSCRIPT', 'THE\nGREENLIGHT', 'ROYALTY\nCHECK',
  'STUDIO\nCUT', 'LATE\nNIGHT', 'NO\nSPOILERS', 'DIRECTOR\nMODE', 'A-LIST\nONLY',
];
const FEATS: [string, string][] = [
  ['🎬', 'Greenlight your own originals'],
  ['💰', 'Earn royalties while you sleep'],
  ['📈', 'Steal subscribers from rivals'],
  ['🏆', 'Win Streamy Awards'],
  ['🤝', 'Sign exclusive talent deals'],
  ['🌍', 'Go global in 190 countries'],
  ['🧠', 'Own the algorithm'],
  ['🍿', 'Set the binge meta'],
];
const COLS = 4, PER = 7;

interface Props {
  onBack?: () => void;
}

/** EMPIRE+ streaming platform — locked "Future Update" teaser. */
export default function StreamingLockedScreen({ onBack = () => history.back() }: Props) {
  const [notified, setNotified] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () =>
      Array.from({ length: COLS }, (_, c) =>
        Array.from({ length: PER }, (_, p) => {
          const i = c * PER + p;
          const [a, b] = PALETTES[i % PALETTES.length];
          return { grad: `linear-gradient(165deg, ${a}, ${b} 78%)`, title: TITLES[i % TITLES.length] };
        })
      ),
    []
  );

  const notify = (e: MouseEvent) => {
    if (notified) return;
    setNotified(true);
    const b = document.createElement('div');
    b.className = 'burst';
    const size = 140;
    b.style.cssText = `left:${e.clientX - size / 2}px;top:${e.clientY - size / 2}px;width:${size}px;height:${size}px`;
    rootRef.current?.appendChild(b);
    setTimeout(() => b.remove(), 750);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <div className="stream-lock" ref={rootRef}>
      <div className="wall">
        {columns.map((posters, c) => (
          <div
            key={c}
            className={'col' + (c % 2 ? ' up' : '')}
            style={{ '--dur': `${34 + c * 7}s` } as CSSProperties}
          >
            {posters.map((p, i) => (
              <div key={i} className="poster" style={{ '--pg': p.grad } as CSSProperties}>
                <b>
                  {p.title.split('\n')[0]}
                  <br />
                  {p.title.split('\n')[1]}
                </b>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="wall-fade" />
      <div className="aurora" />
      <div className="grain" />
      <div className="vignette" />

      <div className="topbar">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <div className="locked-chip">Future Update</div>
      </div>

      <div className="hero">
        <div className="orb-zone">
          <div className="ring" />
          <div className="ring" />
          <div className="ring" />
          <div className="orb">
            <div className="tri" />
          </div>
        </div>
        <div className="brand">
          EMPIRE<span className="plus">+</span>
        </div>
        <div className="brand-sub">Your Streaming Platform</div>
        <div className="soon">
          <span className="lightdot" />
          <span className="lightdot d2" />
          <div className="soon-text">COMING SOON</div>
          <span className="lightdot d3" />
          <span className="lightdot" />
        </div>
        <p className="pitch">
          Stop starring in other people's hits. <b>Launch your own platform</b>, greenlight
          originals, and watch the <span className="g">royalties</span> roll in while you sleep.
        </p>
      </div>

      <div className="ticker-zone">
        <div className="ticker">
          {[...FEATS, ...FEATS].map(([ic, tx], i) => (
            <div key={i} className="tk">
              <i>{ic}</i>
              {tx}
            </div>
          ))}
        </div>
      </div>

      <div className="cta-zone">
        <button className={'btn-notify' + (notified ? ' done' : '')} onClick={notify}>
          {notified ? '✓ You’re on the premiere list' : '🔔 Notify me on release'}
        </button>
        <div className="cta-note">Arriving in a future update</div>
      </div>
    </div>
  );
}
