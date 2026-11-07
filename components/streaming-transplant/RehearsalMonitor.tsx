import React, { useEffect, useState } from 'react';
import css from './presentation/screens/Buildout/Buildout.module.css';
import { cx } from './presentation/cx';

type Playback = 'PLAYING' | 'BUFFERING' | 'DOWN';

const clock = (seconds: number) => [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
  .map(part => String(part).padStart(2, '0')).join(':');
const watchers = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(value >= 1e7 ? 1 : 2)}M`
  : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.max(0, Math.round(value))));

/** #98 (Zeesh: "Northern Signal playing … kaafi plain lag raha hai … aisa bana ki lage ki haan video chal raha hai non-stop"):
 *  the load test's program monitor, in the founding wizard and on the Network tab alike. A picture that moves under film
 *  grain, a LIVE badge, a viewer count that ticks, a clock that runs, a playhead that never stops and sound bars. When it
 *  buffers, the picture dims, a spinner turns and the clock stalls; a stream that is gone is static. The state is the
 *  rehearsal's own (streamingRehearsalPlayback); only the motion is the monitor's. */
export const RehearsalMonitor: React.FC<{
  brand: string;
  /** "SURGE", "PREMIERE NIGHT" */
  label: string;
  title: string;
  state: Playback;
  /** people watching what is shown (one market, or every market) at this moment of the night */
  viewers: number;
  /** a word over the picture, e.g. "3 of 25 markets struggling" */
  note?: string | null;
}> = ({ brand, label, title, state, viewers, note }) => {
  const [seconds, setSeconds] = useState(41 * 60 + 17);
  const [drift, setDrift] = useState(1);
  /* the clock runs, and the count breathes, only while it plays */
  useEffect(() => {
    if (state !== 'PLAYING') return undefined;
    const timer = window.setInterval(() => {
      setSeconds(value => value + 1);
      setDrift(1 + (Math.random() - .5) * .006);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state]);
  const stateClass = state === 'DOWN' ? css.broke : state === 'BUFFERING' ? css.burst : css.held;
  return (
    <div className={cx(css.rhwscreen, css.rhwlivefeed, stateClass)} role="img"
      aria-label={`${brand}, ${label.toLowerCase()}: ${title}. ${state === 'DOWN' ? 'Stream unavailable' : state === 'BUFFERING' ? 'Buffering' : 'Playing'}, ${watchers(viewers * drift)} watching`}>
      <div className={css.rhwscene} aria-hidden="true"><i /><i /><i /><i /></div>
      <i className={css.rhwgrain} aria-hidden="true" />
      <i className={css.viewerSignal} aria-hidden="true" />
      <i className={css.rhwvignette} aria-hidden="true" />

      <div className={css.rhwtop}>
        <span className={css.rhwlive}><i />{state === 'DOWN' ? 'OFF AIR' : 'LIVE'}</span>
        <span className={css.rhwwatchers}>{state === 'DOWN' ? brand : <><b>{watchers(viewers * drift)}</b> watching</>}</span>
      </div>

      {state !== 'PLAYING' && (
        <div className={css.rhwcenter} role="status">
          {state === 'DOWN' ? <i className={css.rhwoff} /> : <i className={css.viewerSpinner} />}
          <b>{state === 'DOWN' ? 'STREAM UNAVAILABLE' : 'BUFFERING'}</b>
        </div>
      )}
      {note && state === 'PLAYING' && <span className={css.rhwnote}>{note}</span>}

      <div className={css.rhwfoot}>
        <div className={css.rhwcap}>
          <span>{brand} · {label}</span>
          <b>{title}</b>
        </div>
        <div className={css.rhwcontrols}>
          <i className={css.rhwplaybtn} aria-hidden="true">
            {state === 'PLAYING'
              ? <svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>
              : <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>}
          </i>
          <span className={css.rhwtime}>{clock(seconds)}</span>
          <span className={css.rhwtrack} aria-hidden="true"><i className={css.rhwbuffered} /><i className={css.rhwplayed} /></span>
          <span className={css.rhweq} aria-hidden="true"><i /><i /><i /><i /></span>
          <span className={css.rhwq}>{state === 'PLAYING' ? '1080p' : state === 'BUFFERING' ? '480p' : '—'}</span>
        </div>
      </div>
    </div>
  );
};
