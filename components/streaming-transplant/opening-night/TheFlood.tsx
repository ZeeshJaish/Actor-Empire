/**
 * #264: how the night ends: the whole world talking. Zeesh (2026-11-05): "may be better social flood or smt i dont like the newspaper concept". The posts rise from the bottom like
 * water, pour past faster and faster, and slow; the count of posts runs up; the service's name goes round the trending strip; and then the card lands, with the saved launch's
 * numbers on it. The two walls of posts are each one long strip moved by the compositor, so all of this costs the main thread almost nothing.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import type { OwnedStreamingLaunchCommit } from '../../../types';
import { openingNightFlood, type OpeningNightFloodPost } from '../../../services/streamingOpeningNightFlood';
import { cx } from '../presentation/cx';
import css from '../presentation/screens/PremiereNight/PremiereNight.module.css';
import type { Brand } from '../StreamingBrandVisuals';
import type { PremiereInputs } from '../StreamingPremiereExperience';
import { streamsWord } from './LaunchControl';

/* how the torrent runs: slowly at first, a blur at its height, and a crawl behind the card */
export const FLOOD_CARD_SECONDS = 5.4;
const rateAt = (seconds: number) => {
  if (seconds < 1) return 0.3;
  if (seconds < 4.2) return 0.3 + ((seconds - 1) / 3.2) ** 2 * 5.6;
  if (seconds < FLOOD_CARD_SECONDS + 1) return 0.2 + (1 - (seconds - 4.2) / (FLOOD_CARD_SECONDS + 1 - 4.2)) ** 2 * 5.7;
  return 0.2;
};
const whole = (value: number) => Math.round(value).toLocaleString('en-US');
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const count = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(value));

const Post: React.FC<{ post: OpeningNightFloodPost }> = ({ post }) => (
  <article className={css.post}>
    <header>
      <i style={{ background: post.colour }} aria-hidden="true">{initials(post.name)}</i>
      <div>
        <b>{post.name}{post.verified && <em aria-label="verified">✓</em>}</b>
        <span>{post.handle} · {post.ago}</span>
      </div>
    </header>
    <p>{post.text}</p>
    <footer>
      {post.place && <span className={css.postPlace}>{post.place}</span>}
      <span>♥ {count(post.likes)}</span>
      <span>↻ {count(post.reposts)}</span>
    </footer>
  </article>
);

export const TheFlood: React.FC<{
  brand: Brand;
  inputs: PremiereInputs;
  commit: OwnedStreamingLaunchCommit;
  peak: number;
  onOpen: () => void;
  onAgain?: () => void;
}> = ({ brand, inputs, commit, peak, onOpen, onAgain }) => {
  const name = brand.name || 'EMPIRE+';
  const tier = commit.outcomeTier;
  const flood = useMemo(() => openingNightFlood({
    service: name,
    title: inputs.title,
    commit,
    peak,
    cities: (inputs.network?.sites ?? []).map(site => site.name),
    countries: inputs.network?.markets.length ?? inputs.markets?.length ?? 0,
    rival: inputs.rivals?.[0] ?? null,
    investor: inputs.investor ?? null,
    engineer: inputs.engineer ?? null,
    moments: inputs.moments,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const [left, right] = useMemo(() => [flood.posts.filter((_, index) => index % 2 === 0), flood.posts.filter((_, index) => index % 2 === 1)], [flood]);
  const stripLeft = useRef<HTMLDivElement>(null);
  const stripRight = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLElement>(null);

  useEffect(() => {
    const calm = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const started = performance.now();
    const strips = [stripLeft.current, stripRight.current].flatMap((strip, index) => (strip?.animate && !calm
      ? [strip.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-50%,0)' }], { duration: index ? 62000 : 50000, iterations: Infinity })]
      : []));
    let raf = 0;
    let ticking = 0;
    const run = (now: number) => {
      const seconds = (now - started) / 1000;
      const rate = rateAt(seconds);
      strips.forEach(strip => { strip.playbackRate = rate; });
      if (counter.current) counter.current.textContent = whole(flood.postCount * (1 - (1 - Math.min(1, seconds / FLOOD_CARD_SECONDS)) ** 3));
      if (seconds < FLOOD_CARD_SECONDS + 1.2) raf = requestAnimationFrame(run);
      else ticking = window.setInterval(() => {
        /* the count never quite stops */
        if (document.visibilityState === 'hidden') return;
        if (counter.current) counter.current.textContent = whole(flood.postCount + (performance.now() - started) * 0.9);
      }, 240);
    };
    raf = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(ticking);
      strips.forEach(strip => strip.cancel());
    };
  }, [flood]);

  const trending = flood.trends.map((trend, index) => (
    <span key={trend.tag}><i>{index + 1}</i><b>{trend.tag}</b><em>{count(trend.posts)} posts</em></span>
  ));
  const failedNight = tier === 'DEGRADED_OPENING';

  return (
    <div className={cx(css.reaction, failedNight && css.reactionBad, tier === 'PRESSURED_OPENING' && css.reactionWarn)} data-flood={tier}>
      <div className={css.reactTop}>
        <small>{failedNight ? 'THE WORLD IS FURIOUS' : 'THE WORLD IS TALKING'}</small>
        <b ref={counter as React.RefObject<HTMLElement>}>0</b>
        <span>POSTS AND COUNTING</span>
      </div>
      <div className={css.reactTrend} aria-label="Trending">
        <div>{trending}{trending}</div>
      </div>
      <div className={css.reactWall} aria-hidden="true">
        <div className={css.reactRise}>
          <div className={css.reactColumn}><div ref={stripLeft}>{left.map(post => <Post key={post.id} post={post} />)}{left.map(post => <Post key={`${post.id}b`} post={post} />)}</div></div>
          <div className={css.reactColumn}><div ref={stripRight}>{right.map(post => <Post key={post.id} post={post} />)}{right.map(post => <Post key={`${post.id}b`} post={post} />)}</div></div>
        </div>
      </div>
      <div className={css.reactBurst} aria-hidden="true">
        {flood.reactions.map((emoji, index) => <i key={index} style={{ left: `${74 + ((index * 37) % 22)}%`, animationDelay: `${index * 0.52}s`, animationDuration: `${3.4 + (index % 3) * 0.7}s` }}>{emoji}</i>)}
      </div>
      <div className={css.reactBottom}>
        <section className={css.reactCard}>
          <em>{flood.eyebrow}</em>
          <h2>{flood.headline}</h2>
          <dl>
            <div><dt>SUBSCRIBERS</dt><dd>{streamsWord(commit.initialSubscribers)}</dd></div>
            <div><dt>PEAK AT ONCE</dt><dd>{streamsWord(peak)}</dd></div>
            <div><dt>PLAYED FIRST TIME</dt><dd className={failedNight ? css.reactDdBad : ''}>{commit.playbackSuccessRate.toFixed(2)}%</dd></div>
          </dl>
        </section>
        <footer className={css.reactFoot}>
          {onAgain ? (
            <div className={css.watchRow}>
              <button type="button" className={css.controlQuiet} onClick={onOpen}>CLOSE</button>
              <button type="button" className={cx(css.goLive, css.goArmed)} onClick={onAgain}>PLAY AGAIN</button>
            </div>
          ) : (
            <button type="button" className={cx(css.goLive, css.goArmed)} onClick={onOpen}>OPEN YOUR HQ →</button>
          )}
        </footer>
      </div>
    </div>
  );
};
