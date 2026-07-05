import { useEffect, useRef } from 'react';
import { logoDataUri } from '../assets/logo';
import type { ActState } from './types';
import '../styles/intro.css';

const STATUSES: [number, string][] = [
  [0, 'Rolling out the red carpet'],
  [18, 'Building the studio lot'],
  [36, 'Signing your first contract'],
  [54, 'Casting the extras'],
  [72, 'Syncing career saves'],
  [90, 'Cueing the spotlight'],
];

interface Props {
  /** '' hidden · 'on' playing · 'on exit' dimming out */
  state?: ActState;
  /** Fires when the bar reaches 100% (after the 650ms hold, like the original) */
  onDone?: () => void;
}

/** ACT II — "ACTOR EMPIRE" loading screen with organic progress simulation. */
export default function ActorEmpireLoading({ state = 'on', onDone }: Props) {
  const fillRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const simRef = useRef({ target: 0 });
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const active = state === 'on';

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let cancelled = false;
    const timeouts: number[] = [];
    const sim = { prog: 0, target: 0, statusIdx: 0, done: false };
    simRef.current = sim;

    const setStatus = (txt: string) => {
      const el = statusRef.current;
      if (!el) return;
      el.classList.remove('swap');
      void el.offsetWidth;
      el.textContent = txt;
      el.classList.add('swap');
    };

    // organic: quick bursts with brief stalls
    const stepTargets = () => {
      if (sim.done || cancelled) return;
      if (sim.target < 100) {
        sim.target = Math.min(100, sim.target + 6 + Math.random() * 16);
        timeouts.push(window.setTimeout(stepTargets, 260 + Math.random() * 540));
      }
    };

    const tick = () => {
      if (cancelled) return;
      sim.prog += (sim.target - sim.prog) * 0.065;
      if (sim.target >= 100 && sim.prog > 99.4) sim.prog = 100;
      const p = Math.floor(sim.prog);
      if (fillRef.current) fillRef.current.style.width = sim.prog + '%';
      if (sparkRef.current) {
        sparkRef.current.style.left = sim.prog + '%';
        sparkRef.current.style.opacity = sim.prog > 1 ? '1' : '0';
      }
      if (pctRef.current) pctRef.current.textContent = p + '%';
      while (sim.statusIdx < STATUSES.length - 1 && p >= STATUSES[sim.statusIdx + 1][0]) {
        sim.statusIdx++;
        setStatus(STATUSES[sim.statusIdx][1]);
      }
      if (sim.prog >= 100 && !sim.done) {
        sim.done = true;
        if (pctRef.current) pctRef.current.textContent = '100%';
        timeouts.push(window.setTimeout(() => onDoneRef.current?.(), 650));
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    stepTargets();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
    };
  }, [active]);

  /* tap to fast-forward the bar */
  const skip = () => {
    simRef.current.target = 100;
  };

  return (
    <section className={`phase ${state}`.trim()} id="act2" onPointerDown={skip}>
      <div className="load-inner">
        <div className="app-badge">
          <img src={logoDataUri} alt="Actor Empire" />
        </div>
        <h1 className="load-title">
          <span>ACTOR</span>
          <span>EMPIRE</span>
        </h1>
        <div className="load-bar-wrap">
          <div className="load-meta">
            <div className="kicker">Loading</div>
            <div id="pct" ref={pctRef}>0%</div>
          </div>
          <div className="track">
            <div className="fill" id="fill" ref={fillRef} />
            <div className="spark" id="spark" ref={sparkRef} />
          </div>
        </div>
        <div className="load-status" id="status" ref={statusRef}>
          Rolling out the red carpet
        </div>
      </div>
      <div className="skip-hint">Tap to skip</div>
    </section>
  );
}
