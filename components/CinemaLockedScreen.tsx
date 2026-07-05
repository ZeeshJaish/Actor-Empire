import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import '../styles/cinema-lock.css';

const FEATS: [string, string][] = [
  ['🎟️', 'Sell out opening nights'],
  ['🏗️', 'Build IMAX megaplexes'],
  ['🍿', 'Set the popcorn prices'],
  ['🌆', 'Open screens in every city'],
  ['💺', 'Design luxury recliner halls'],
  ['🔴', 'Host red carpet premieres'],
  ['📊', 'Own the box office charts'],
  ['⭐', 'Screen your own hits first'],
];

interface Props {
  onBack?: () => void;
}

/** EMPIRE CINEMAS cinema chain — locked "Future Update" teaser. */
export default function CinemaLockedScreen({ onBack = () => history.back() }: Props) {
  const [notified, setNotified] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    <div className="cinema-lock" ref={rootRef}>
      <div className="curtain" />
      <div className="curtain-fade" />
      <div className="beam l" />
      <div className="beam r" />
      <div className="grain" />
      <div className="vignette" />

      <div className="topbar">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <div className="locked-chip">Future Update</div>
      </div>

      <div className="hero">
        <div className="ticket-zone">
          <div className="ticket">
            <div className="star">★</div>
            <div className="stub">
              <span>ADMIT ONE</span>
            </div>
          </div>
        </div>
        <div className="bulbs">
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i} className="bulb" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <div className="brand">
          EMPIRE<span className="gold">CINEMAS</span>
        </div>
        <div className="brand-sub">Your Cinema Chain</div>
        <div className="soon">
          <span className="lightdot" />
          <span className="lightdot d2" />
          <div className="soon-text">COMING SOON</div>
          <span className="lightdot d3" />
          <span className="lightdot" />
        </div>
        <p className="pitch">
          Stop premiering in other people's theaters. <b>Build your own cinema chain</b>, sell out
          opening night, and keep every rupee of the <span className="g">box office</span>.
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
          {notified ? '✓ You have front row seats' : '🎟️ Notify me on release'}
        </button>
        <div className="cta-note">Arriving in a future update</div>
      </div>
    </div>
  );
}
