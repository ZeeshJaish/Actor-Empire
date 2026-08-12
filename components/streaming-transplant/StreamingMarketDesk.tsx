/**
 * EMPIRE+ v2 — THE MARKET DESK
 *
 * ── WHAT WAS WRONG WITH THE FIRST TWO PASSES ──────────────────────────────
 * Pass one was two quotes floating in black: empty.
 * Pass two filled the frame with three speakers, three fake video windows and
 * a rail — and it still did not work, because I had built television as a
 * LAYOUT when television is a SEQUENCE. Three talking heads stacked in three
 * identical boxes with all their text showing is a comment thread. A
 * broadcast cuts: one person fills the frame, says their line, and it cuts.
 *
 * So this plays instead of sitting:
 *   – one speaker at a time, name enormous, line landing as they say it
 *   – a hard cut between every one of them
 *   – the price ticks DURING the segment, reacting to what is being said
 *   – no fake video windows at all; the name treatment is the visual
 *   – density lives in the rail and the crawl, where it moves
 */
import css from './presentation/screens/MarketDesk/MarketDesk.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface Feed { who: string; where: string; line: string; anchor?: boolean }
export interface RailRow { label: string; value: string; delta?: number; mine?: boolean }

export interface Segment {
  kick: string;
  headline: string;
  banner?: string;
  tone: 'neutral' | 'good' | 'bad';
  feeds: Feed[];
  rail: RailRow[];
  crawl: string[];
  /** where the number starts and where the segment leaves it */
  bug: { label: string; from: number; to: number; fmt: (n: number) => string };
}

/* ── the running order: title card, then one speaker per cut ── */
const useCuts = (n: number, onEnd: () => void) => {
  const [i, setI] = useState(-1);
  const ended = useRef(false);
  useEffect(() => {
    const ids: number[] = [];
    ids.push(window.setTimeout(() => setI(0), 1500));
    for (let k = 0; k < n; k++) ids.push(window.setTimeout(() => setI(k + 1), 1500 + (k + 1) * 3400));
    ids.push(window.setTimeout(() => { if (!ended.current) { ended.current = true; onEnd(); } },
      1500 + n * 3400 + 900));
    return () => ids.forEach(clearTimeout);
  }, [n]);
  return i;
};

/** The number moves while they talk. That is the whole reason to watch. */
const useTick = (from: number, to: number, run: boolean) => {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!run) return;
    const start = performance.now(); const DUR = 4200;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      /* it does not glide — a tape prints, so it steps */
      const stepped = Math.round(p * 22) / 22;
      const jitter = p < 1 ? Math.sin(p * 34) * (to - from) * .06 : 0;
      setV(from + (to - from) * stepped + jitter);
      if (p < 1) raf = requestAnimationFrame(tick); else setV(to);
    };
    raf = requestAnimationFrame(tick);
    const guard = window.setTimeout(() => setV(to), DUR + 300);
    return () => { cancelAnimationFrame(raf); clearTimeout(guard); };
  }, [from, to, run]);
  return v;
};

export const MarketDesk: React.FC<{ seg: Segment; onDone: () => void }> = ({ seg, onDone }) => {
  const cut = useCuts(seg.feeds.length, onDone);
  const val = useTick(seg.bug.from, seg.bug.to, cut >= 0);
  const up = seg.bug.to >= seg.bug.from;
  const crawl = useMemo(() => [...seg.crawl, ...seg.crawl], [seg.crawl]);
  /* hold the last speaker until the segment actually ends — running past the
     end left a dead frame with nothing on screen */
  const speaker = cut >= 0 ? seg.feeds[Math.min(cut, seg.feeds.length - 1)] : null;

  return (
    <div className={cx(css.nd, css['t-' + (seg.tone)])} onClick={onDone}>
      <div className={css.ndgrain} />

      {/* ── the title card, before anybody speaks ── */}
      <div className={cx(css.ndtitle, (cut >= 0 ? css.out : ''))}>
        <span className={css.ndtitlekick}>{seg.kick}</span>
        <h1>{seg.headline}</h1>
        {seg.banner && <p>{seg.banner}</p>}
      </div>

      {/* ── one speaker, filling the frame ── */}
      {speaker && (
        <div className={css.ndspeak} key={cut}>
          <div className={css.ndwho}>
            <b>{speaker.who}</b>
            <span>{speaker.anchor ? 'THE MARKET DESK' : speaker.where}</span>
          </div>
          <p className={css.ndline}>{speaker.line}</p>
        </div>
      )}

      {/* ── the chrome that never leaves ── */}
      <div className={css.ndtop}>
        <div className={css.ndbug}><i />LIVE</div>
        <span className={css.ndnet}>THE MARKET DESK</span>
        <span className={css.ndkick}>{seg.kick}</span>
      </div>

      <div className={css.ndrail}>
        {seg.rail.map(r => (
          <div className={cx(css.ndrailrow, (r.mine ? css.mine : ''))} key={r.label}>
            <b>{r.label}</b>
            <em>{r.mine ? seg.bug.fmt(val) : r.value}</em>
            {r.delta !== undefined && (
              <i className={r.delta >= 0 ? css.u : css.d}>
                {r.delta >= 0 ? '▲' : '▼'}{Math.abs(r.delta).toFixed(1)}
              </i>
            )}
          </div>
        ))}
      </div>

      <div className={cx(css.ndprice, (up ? css.u : css.d))}>
        <span>{seg.bug.label}</span>
        <b>{seg.bug.fmt(val)}</b>
        <em>{up ? '+' : '−'}{Math.abs(((val - seg.bug.from) / (seg.bug.from || 1)) * 100).toFixed(1)}%</em>
      </div>

      {cut >= 0 && (
        <div className={css.ndprogress}>
          {seg.feeds.map((_, i) => <i key={i} className={i <= cut ? css.on : ''} />)}
        </div>
      )}

      <div className={css.ndlower}>
        <div className={cx(css.ndthird, (cut >= 0 ? css.on : ''))}>
          <span>{seg.kick}</span>
          <b>{seg.headline}</b>
        </div>
        <div className={css.ndcrawl}>
          <div className={css.ndcrawlrun}>{crawl.map((c, i) => <i key={i}>{c}</i>)}</div>
        </div>
      </div>

      <div className={css.ndskip}>TAP TO SKIP</div>
    </div>
  );
};

/* Styles now live in presentation/screens/MarketDesk/MarketDesk.module.css */
