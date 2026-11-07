/**
 * #253: the opening night's record. A launch that has settled can be reopened from a save, and this is what it opens on: reopening must never reroll it.
 * Zeesh (2026-11-05): "want to redesign this streaming live screen". The network lit up, the service's own name and colour, and the night in big numbers.
 */
import React, { useEffect, useState } from 'react';
import type { OwnedStreamingLaunchCommit } from '../types';
import type { StreamingNetworkMapView } from '../services/streamingNetworkMapView';
import { brandVars } from './streaming-transplant/presentation/brand';
import { cx } from './streaming-transplant/presentation/cx';
import { Brand, Mark, typeFace } from './streaming-transplant/StreamingBrandVisuals';
import { StreamingLightsMap } from './streaming-transplant/StreamingLightsMap';
import css from './streaming-transplant/presentation/screens/OpeningBuild/LaunchReceipt.module.css';

const compact = (value: number) => (value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(value >= 1e8 ? 0 : 2)}M` : Math.round(value).toLocaleString('en-US'));

const OUTCOME = {
  SMOOTH_OPENING: { label: 'SMOOTH OPENING', tone: 'good', line: 'Nobody noticed the machine. That is the job.' },
  PRESSURED_OPENING: { label: 'PRESSURED OPENING', tone: 'warn', line: 'It held, but only just. The network felt the night.' },
  DEGRADED_OPENING: { label: 'ROUGH OPENING', tone: 'bad', line: 'Some viewers saw it break. They are still here.' },
} as const;

const calm = () => typeof window === 'undefined' || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const useCountUp = (target: number, ms = 1100) => {
  const [value, setValue] = useState(() => (calm() ? target : 0));
  useEffect(() => {
    if (calm()) { setValue(target); return undefined; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
};

export default function StreamingLaunchReceipt({ brand, platformName, commit, network, onOpen, onBack }: {
  brand: Brand;
  platformName: string;
  commit: OwnedStreamingLaunchCommit;
  network: StreamingNetworkMapView;
  onOpen: () => void;
  onBack: () => void;
}) {
  const outcome = OUTCOME[commit.outcomeTier] || OUTCOME.SMOOTH_OPENING;
  const subscribers = useCountUp(commit.initialSubscribers);
  const face = typeFace(brand);
  return (
    <main className={css.lr} data-epx-root style={brandVars(brand)} aria-label="Opening night">
      <StreamingLightsMap accent={`hsl(${brand.hue} ${brand.sat}% 62%)`} network={network} lit={network.sites.length} className={css.map} />
      <button type="button" className={css.back} onClick={onBack} aria-label="Back to headquarters">←</button>
      <span className={css.onAir}><i aria-hidden="true" />LIVE</span>

      <div className={css.body}>
        <div className={css.lockup}>
          <span className={css.mark}><Mark brand={brand} /></span>
          <h1 style={{ fontFamily: face.stack, fontWeight: face.weight, letterSpacing: face.spacing }}>{platformName}</h1>
        </div>
        <span className={css.eyebrow}>OPENING NIGHT</span>

        <div className={css.big}>
          <b>{compact(subscribers)}</b>
          <span>SUBSCRIBERS<br />ON THE FIRST NIGHT</span>
        </div>

        <div className={cx(css.verdict, css[outcome.tone])}>
          <b>{outcome.label}</b>
          <p>{outcome.line}</p>
        </div>

        <div className={css.cells}>
          <span><b>{commit.playbackSuccessRate.toFixed(2)}%</b><small>PLAYBACK</small></span>
          <span><b>{compact(commit.protectedPeakConcurrentStreams)}</b><small>PEAK HELD</small></span>
          <span><b>{commit.openingTitleCount}</b><small>TITLES</small></span>
        </div>
        {commit.openingOriginalTitle && <p className={css.led}>Led by <b>{commit.openingOriginalTitle}</b></p>}
      </div>

      <footer className={css.foot}>
        <button type="button" className={css.go} onClick={onOpen}>OPEN YOUR HQ</button>
      </footer>
    </main>
  );
}
