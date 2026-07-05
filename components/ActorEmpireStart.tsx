import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { ActState } from './types';
import '../styles/intro.css';

interface Props {
  /** '' hidden · 'on' spotlight finds title · 'on lit' room floods with light */
  state?: ActState;
  onStart?: () => void;
  version?: string;
  credit?: string;
}

/** ACT III — spotlight title screen with START CAREER. */
export default function ActorEmpireStart({
  state = 'on lit',
  onStart,
  version = 'Version 1.0.18',
  credit = 'Designed & built by Zeesh',
}: Props) {
  // faint drifting dust motes (generated once)
  const motes = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        sz: 1 + Math.random() * 2.2,
        left: 8 + Math.random() * 84,
        top: Math.random() * 100,
        o: (0.15 + Math.random() * 0.5).toFixed(2),
        dx: ((Math.random() - 0.5) * 60).toFixed(0),
        dur: 7 + Math.random() * 9,
        delay: -Math.random() * 12,
      })),
    []
  );

  return (
    <section className={`phase ${state}`.trim()} id="act3">
      <div className="floor" />
      <div className="stars">
        {motes.map((m, i) => (
          <div
            key={i}
            className="mote"
            style={
              {
                width: m.sz + 'px',
                height: m.sz + 'px',
                left: m.left + '%',
                top: m.top + '%',
                '--o': m.o,
                '--dx': m.dx + 'px',
                animationDuration: m.dur + 's',
                animationDelay: m.delay + 's',
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="beam" />
      <div className="spot" />
      <div className="hero">
        <div className="hero-title">
          ACTOR
          <br />
          EMPIRE
          <svg className="star" viewBox="0 0 46 42">
            <defs>
              <linearGradient id="aeStarGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffdf8e" />
                <stop offset=".5" stopColor="#e8b64c" />
                <stop offset="1" stopColor="#b9852c" />
              </linearGradient>
            </defs>
            <path
              d="M23 2l6.2 12.6L43 16.6l-10 9.8 2.4 13.8L23 33.7l-12.4 6.5L13 26.4 3 16.6l13.8-2z"
              fill="url(#aeStarGrad)"
            />
          </svg>
        </div>
        <div className="hero-version">{version}</div>
      </div>
      <div className="cta-zone">
        <button className="btn-start" id="startBtn" onClick={onStart}>
          <span className="play" />
          Start Career
          <div className="btn-glow" />
        </button>
        <div className="credit">{credit}</div>
      </div>
    </section>
  );
}
