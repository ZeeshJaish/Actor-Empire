/**
 * #262: the night itself, as a live broadcast, every frame of it drawn in code. Zeesh (2026-11-05): "launch night ka animation thoda aisa tagda hona chaiye screen aese hone
 * chaiye ki lage big event hai , real world se bhi cheeze mimiking hone chaiye", and of the first version "rather htan using images".
 *
 * One set of lights (nightEngine.ts) flies from each picture to the next:
 *   THE COUNT   a dark stadium of phones held up, a ripple through them each second, and a drone show's number over them
 *   ZERO        a flash and a boom; the numbers burst, the crowd's lights rise and fly into the service's logo
 *   THE IDENT   the service's own ident and sound, full screen, for the first time
 *   THE WORLD   the lights become a globe that turns under 8 PM, moving west; the cities catch, streams arc out to them, and what the campaign bought flares with its name
 *   THE CITY    the globe becomes a skyline at night; window after window turns the colour of a TV. The camera goes through one, into its light
 *   ONE ROOM    a drawn room: a phone's notification, two people on a sofa, the opening title on the TV
 *   THE PEAK    the control room's board, a wall of lamps with the night's curve in it. IT HELD, and fireworks; or IT BUCKLED, and the lamps fall
 *   THE FLOOD   the lights let go and rise, and everybody is talking (TheFlood.tsx). It stays until the player leaves
 * Every number is the saved launch's: the show only presents them. It writes nothing. Numbers tick through refs, not state, so the clock costs no render.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { OwnedStreamingLaunchCommit, StreamingIdentPackageId } from '../../../types';
import { Poster } from '../../../content-market-exact/Poster';
import { Brand, Mark } from '../StreamingBrandVisuals';
import { StreamingIdentPlayer } from '../StreamingIdentPlayer';
import { CountryFlagSvg } from '../../studio-finance/components/FlagField';
import type { OpeningNightAudio } from '../../../services/streamingOpeningNightAudio';
import type { StreamingIdentPreviewId } from '../../../services/streamingIdentAudio';
import { cx } from '../presentation/cx';
import css from '../presentation/screens/PremiereNight/PremiereNight.module.css';
import { createNightEngine, globePoint, type Formation } from './nightEngine';
import { applyDigit, peakFormation, RISE_LIGHTS, riseFormation } from './nightFormations';
import { TheFlood } from './TheFlood';
import { WORLD_WAVE_SECONDS, type PreparedNight } from './useNight';
import { streamsWord } from './LaunchControl';
import type { PremiereInputs } from '../StreamingPremiereExperience';

export const COUNT_SECONDS = 10;
const LOGO_SECONDS = 2.8;
const HOLD_SECONDS = 0.5;
const WORLD_MORPH_SECONDS = 1.5;
const CITY_MORPH_SECONDS = 1.3;
const CITY_SECONDS = 5;
const ZOOM_SECONDS = 1;
const ROOM_SECONDS = 5.4;
const PEAK_SECONDS = 9.5;
const PEAK_REACHED_AT = 4.4;

type Scene = 'COUNT' | 'LOGO' | 'IDENT' | 'HOLD' | 'WORLD' | 'CITY' | 'ROOM' | 'PEAK' | 'FLOOD';
const STEPS: Scene[] = ['COUNT', 'IDENT', 'WORLD', 'CITY', 'ROOM', 'PEAK'];

const pad = (value: number) => String(Math.max(0, Math.floor(value))).padStart(2, '0');
const clockWord = (seconds: number) => `${pad(seconds / 3600)}:${pad((seconds % 3600) / 60)}:${pad(seconds % 60)}`;
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const easeOut = (x: number) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;
const whole = (value: number) => Math.round(value).toLocaleString('en-US');

/* ── one room ── */
const OneRoom = React.memo(function OneRoom({ brand, inputs }: { brand: Brand; inputs: PremiereInputs }) {
  const art = inputs.titleArt;
  const hue = art?.hue ?? brand.hue;
  return (
    <div className={css.oneRoom} style={{ ['--tv-hue' as string]: hue }}>
      <i className={css.roomGlow} aria-hidden="true" />
      <div className={css.tv}>
        <div className={css.tvPicture}>
          {art && <span className={css.tvPoster}><Poster id={art.id} title={art.title} genre={art.genre} hue={art.hue} size="lg" bare /></span>}
          <i className={css.tvShade} aria-hidden="true" />
          <div className={css.tvWords}>
            <b>{inputs.title}</b>
            <span>NOW STREAMING ON {(brand.name || 'EMPIRE+').toUpperCase()}</span>
          </div>
          <i className={css.tvOn} aria-hidden="true" />
        </div>
      </div>
      {/* two people on a sofa, seen from behind: only the TV lights their edges */}
      <svg className={css.sofa} viewBox="0 0 390 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <g className={css.sofaPeople} fill="#04050a">
          {/* hair up in a bun */}
          <path d="M60 194C66 170 92 158 125 151L128 118H158L161 151C194 158 220 170 226 194z" />
          <ellipse cx="143" cy="88" rx="30" ry="35" />
          <circle cx="147" cy="42" r="15" />
          {/* short hair, and leaning in towards the other */}
          <g transform="rotate(-5 263 130)">
            <path d="M196 196C200 172 224 160 248 156V136C237 128 230 114 230 98C230 72 245 58 263 58C281 58 296 72 296 98C296 114 289 128 278 136V156C302 160 326 172 330 196z" />
            <circle cx="229" cy="101" r="4.5" />
            <circle cx="297" cy="101" r="4.5" />
          </g>
          {/* the back of the sofa, two cushions */}
          <path d="M-10 262V192C-10 176 4 168 22 168H186C190 168 193 170 195 173C197 170 200 168 204 168H368C386 168 400 176 400 192V262z" fill="#07080e" />
        </g>
      </svg>
      <div className={css.push} role="presentation">
        <span className={css.pushMark}><Mark brand={brand} /></span>
        <div><small>{brand.name || 'EMPIRE+'} <em>now</em></small><b>{inputs.title} is streaming</b><span>Tap to watch</span></div>
      </div>
    </div>
  );
});

/* ── the telemetry: one gauge, a ring and a number ── */
const Gauge: React.FC<{ label: string; textRef: React.RefObject<HTMLElement>; ringRef: React.RefObject<SVGCircleElement>; tone?: string }> = ({ label, textRef, ringRef, tone }) => (
  <div className={cx(css.gauge, tone)}>
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="28" className={css.gaugeTrack} pathLength={100} />
      <circle cx="32" cy="32" r="28" className={css.gaugeRing} pathLength={100} ref={ringRef} />
    </svg>
    <b ref={textRef as React.RefObject<HTMLElement>}>0</b>
    <small>{label}</small>
  </div>
);

export const TheBroadcast: React.FC<{
  brand: Brand;
  inputs: PremiereInputs;
  commit: OwnedStreamingLaunchCommit;
  audio: OpeningNightAudio | null;
  night: PreparedNight | null;
  /** straight to the flood: the night has been watched, or the player asks for what came of it */
  startAtFlood?: boolean;
  onOpen: () => void;
  onAgain?: () => void;
  /** the developer's loop: the flood has started */
  onFlood?: () => void;
}> = ({ brand, inputs, commit, audio, night, startAtFlood = false, onOpen, onAgain, onFlood }) => {
  const name = brand.name || 'EMPIRE+';
  const identSeconds = Math.max(2.5, Math.min(12, inputs.ident?.seconds || 3));
  const peak = commit.capacityPlan === 'STAGGERED_PREMIERE' ? Math.round(commit.forecastLikelyConcurrentStreams * 0.68) : commit.forecastLikelyConcurrentStreams;
  const room = Math.max(1, commit.protectedPeakConcurrentStreams);
  const subscribers = commit.initialSubscribers;
  const tier = commit.outcomeTier;
  const failed = Math.max(0, Math.round((100 - commit.playbackSuccessRate) * 100) / 100);

  /* when each thing happens, in seconds from the start of the count */
  const at = useMemo(() => {
    const logo = COUNT_SECONDS;
    const ident = logo + LOGO_SECONDS;
    const hold = ident + identSeconds;
    const world = hold + HOLD_SECONDS;
    const city = world + WORLD_MORPH_SECONDS + WORLD_WAVE_SECONDS;
    const zoom = city + CITY_MORPH_SECONDS + CITY_SECONDS;
    const oneRoom = zoom + ZOOM_SECONDS;
    const board = oneRoom + ROOM_SECONDS;
    const peakAt = board + PEAK_REACHED_AT;
    return { logo, ident, hold, world, city, zoom, oneRoom, board, peakAt, end: board + PEAK_SECONDS };
  }, [identSeconds]);

  const [scene, setScene] = useState<Scene>(startAtFlood ? 'FLOOD' : 'COUNT');
  const [count, setCount] = useState(COUNT_SECONDS);
  const [reached, setReached] = useState(false);
  const [muted, setMuted] = useState(false);
  const [board, setBoard] = useState<{ top: number; bottom: number; roomY: number | null } | null>(null);
  const [flood, setFlood] = useState(false);
  const [goingIn, setGoingIn] = useState(false);

  const lightsHolder = useRef<HTMLDivElement>(null);
  const bug = useRef<HTMLElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLElement>(null);
  const clockSign = useRef<HTMLElement>(null);
  const streamsText = useRef<HTMLElement>(null);
  const streamsRing = useRef<SVGCircleElement>(null);
  const subsText = useRef<HTMLElement>(null);
  const subsRing = useRef<SVGCircleElement>(null);
  const bigCount = useRef<HTMLElement>(null);
  const cityCount = useRef<HTMLElement>(null);
  const chipEls = useRef<Array<HTMLDivElement | null>>([]);
  const toFlood = useRef<() => void>(() => undefined);
  const [noEngine, setNoEngine] = useState(false);

  useEffect(() => {
    let started = performance.now();
    const calm = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    /* A canvas of its own each time this runs: a WebGL context that has been given up cannot be had again from the same canvas, and React's development mode runs this twice. */
    const canvas = night && lightsHolder.current ? document.createElement('canvas') : null;
    if (canvas) {
      canvas.className = css.night;
      lightsHolder.current!.appendChild(canvas);
    }
    const engine = canvas ? createNightEngine(canvas) : null;
    setNoEngine(!engine);
    const size = night?.size ?? { W: 390, H: 844 };
    const diagonal = Math.hypot(size.W, size.H);
    const palette = night?.palette;
    /* what the words take at the top and the bottom of the screen, on this phone */
    const clearTop = (bug.current ? bug.current.offsetTop + bug.current.offsetHeight : 58) + 15 + Math.max(40, Math.min(60, size.W * 0.14));
    const clearBottom = hud.current ? hud.current.offsetTop : size.H - 160;
    const globeRoom = Math.max(160, clearBottom - clearTop);
    const globeRadius = Math.min(size.W * 0.56, globeRoom * 0.56);
    /* the count's own copy of the stadium: its lead lights take each number */
    const stage: Formation | null = night ? { pos: night.stadium.pos.slice(), look: night.stadium.look.slice(), color: night.stadium.color.slice(), act: night.stadium.act.slice(), kind: night.stadium.kind.slice() } : null;

    if (engine && palette && stage) {
      Object.assign(engine.look, {
        brand: palette.brand, lift: palette.lift, accent: palette.lift, horizon: 0.53, glow: 0.55, beams: 0.75, stage: 1, bloom: 1,
        top: [0.012, 0.016, 0.04], bottom: [0.004, 0.005, 0.012],
        center: [size.W / 2, size.H * 0.53], focus: [size.W / 2, size.H * 0.34], sway: calm ? 0 : 1, twinkle: calm ? 0 : 1, hover: calm ? 0 : 1, waveWidth: 70, dim: 1,
      });
      engine.snap(stage);
      if (night) engine.setSkyline(night.city.skyline);
    }

    let waveAt = -9;
    let waveGain = 0;
    let idle = false;
    let phaseFrom = 0;
    let zoomFrom = -1;
    let fadeFrom = -1;
    let fallFrom = -1;
    let turning = false;
    let drifting = false;
    const world = night?.world ?? null;
    /* the board fills what the number above and the verdict below leave; a short screen drops the load bars */
    const tall = clearBottom - clearTop > 400;
    const boardTop = clearTop + 26;
    const boardBottom = Math.max(boardTop + 90, Math.min(boardTop + size.H * 0.42, clearBottom - (tall ? 148 : 82)));
    const peakPlan = night && palette ? peakFormation(size, palette, commit, peak, {
      drawnSoFar: (at.board - COUNT_SECONDS) / Math.max(1, at.peakAt - COUNT_SECONDS),
      reach: PEAK_REACHED_AT,
      top: boardTop,
      bottom: boardBottom,
    }) : null;

    const toDigit = (value: number, first: boolean, seconds: number) => {
      if (!engine || !night || !palette || !stage) return;
      applyDigit(stage, night.digits[value], palette, size.H);
      engine.morph(stage, calm ? { seconds: 0.01 } : { seconds: first ? 0.85 : 0.44, stagger: 0.3, swirl: first ? 34 : 14, glow: 0.35 });
      waveAt = seconds;
      waveGain = 0.55 + (COUNT_SECONDS - value) * 0.07;
    };

    const cues: Array<{ at: number; run: (seconds: number) => void }> = [];
    for (let value = COUNT_SECONDS; value >= 1; value -= 1) {
      cues.push({
        at: COUNT_SECONDS - value,
        run: seconds => {
          setCount(value);
          toDigit(value, value === COUNT_SECONDS, seconds);
          /* the count's sound has every second of the count in it */
          if (value === COUNT_SECONDS) audio?.play('count');
        },
      });
    }
    cues.push({
      at: at.logo,
      run: seconds => {
        setCount(0);
        setScene('LOGO');
        audio?.play('zero');
        navigator.vibrate?.([40, 60, 120]);
        if (engine && night) {
          engine.look.accent = night.palette.brand;
          engine.morph(night.logo, calm ? { seconds: 0.01 } : { seconds: 1.5, stagger: 0.42, swirl: 130, glow: 1.1 });
          waveAt = seconds;
          waveGain = 1.6;
        }
      },
    });
    cues.push({
      at: at.ident,
      run: () => {
        setScene('IDENT');
        if (inputs.ident?.sound !== 'silent') audio?.ident((inputs.ident?.sound || 'pulse') as StreamingIdentPreviewId, inputs.ident?.customAudio ?? null);
        idle = true;
      },
    });
    cues.push({ at: at.hold, run: () => { setScene('HOLD'); idle = false; } });
    cues.push({
      at: at.world,
      run: () => {
        setScene('WORLD');
        audio?.play('world');
        if (engine && world && palette) {
          Object.assign(engine.look, {
            sway: 0, twinkle: 0, hover: 0, dim: 0.46, beams: 0, glow: 0, stage: 0, horizon: 0.5, zoom: 1, hub: world.hub, accent: palette.lift, atmosphere: 1, bloom: 1.1,
            globe: [size.W / 2, clearTop + globeRoom / 2, globeRadius, world.tilt], spin: world.spinStart,
            top: [0.006, 0.012, 0.034], bottom: [0.002, 0.004, 0.014], waveWidth: 40, waveGain: 0,
          });
          engine.morph(world.formation, calm ? { seconds: 0.01 } : { seconds: WORLD_MORPH_SECONDS, stagger: 0.5, swirl: 70, glow: 0.5 });
          phaseFrom = at.world + WORLD_MORPH_SECONDS * 0.8;
          waveGain = 0;
          turning = !calm;
        }
      },
    });
    cues.push({
      at: at.city,
      run: () => {
        setScene('CITY');
        audio?.play('city');
        turning = false;
        if (engine && night) {
          engine.bakeGlobe();
          Object.assign(engine.look, {
            twinkle: 0, dim: 0.3, atmosphere: 0, city: 1, bloom: 1.05, top: [0.008, 0.012, 0.04], bottom: [0.03, 0.03, 0.07], horizon: 0.6, glow: 0.62,
          });
          engine.morph(night.city.formation, calm ? { seconds: 0.01 } : { seconds: CITY_MORPH_SECONDS, stagger: 0.4, swirl: 40, glow: 0.2 });
          phaseFrom = at.city + CITY_MORPH_SECONDS * 0.7;
          engine.look.focus = night.city.focus;
          drifting = !calm;
        }
      },
    });
    cues.push({
      at: at.zoom,
      run: () => {
        if (!engine || !night || calm) return;
        setGoingIn(true);
        engine.look.focus = night.city.focus;
        zoomFrom = at.zoom;
      },
    });
    /* the window fills the screen: the room comes out of its light */
    cues.push({ at: at.oneRoom - 0.26, run: () => { if (!calm) setFlood(true); } });
    cues.push({
      at: at.oneRoom,
      run: () => {
        setScene('ROOM');
        setFlood(false);
        idle = true;
        audio?.play('room');
      },
    });
    cues.push({
      at: at.board,
      run: () => {
        setScene('PEAK');
        idle = false;
        audio?.play('rise');
        if (engine && peakPlan && palette) {
          zoomFrom = -1;
          Object.assign(engine.look, {
            zoom: 1, dim: 0.09, fade: 0, top: [0.006, 0.008, 0.02], bottom: [0.002, 0.002, 0.006], glow: 0, city: 0, atmosphere: 0, bloom: 1.15, center: peakPlan.peakPoint, waveWidth: 34, accent: tier === 'DEGRADED_OPENING' ? [1, 0.26, 0.3] : palette.lift,
          });
          engine.snap(peakPlan.formation);
          phaseFrom = at.board;
          fadeFrom = at.board;
          waveGain = 0;
        }
        if (peakPlan) setBoard({ top: boardTop, bottom: boardBottom, roomY: peakPlan.roomY });
      },
    });
    cues.push({
      at: at.peakAt,
      run: seconds => {
        setReached(true);
        waveAt = seconds;
        waveGain = tier === 'DEGRADED_OPENING' ? 1.2 : 1.8;
        audio?.play(tier === 'DEGRADED_OPENING' ? 'buckled' : tier === 'PRESSURED_OPENING' ? 'just' : 'held');
        if (tier === 'DEGRADED_OPENING') fallFrom = at.peakAt + 0.25;
        navigator.vibrate?.(tier === 'DEGRADED_OPENING' ? [90, 60, 90, 60, 90] : [30, 40, 30]);
      },
    });
    cues.push({ at: at.end, run: seconds => goFlood(seconds, true) });
    cues.sort((left, right) => left.at - right.at);

    let raf = 0;
    let nextCue = 0;
    let flooded = false;
    let floodedAt = 0;
    let trimmed = false;
    /* the end of the show, or Skip: whatever was going on, everything lets go and rises */
    const goFlood = (seconds: number, inTime = false) => {
      if (flooded) return;
      flooded = true;
      floodedAt = seconds;
      nextCue = cues.length;
      idle = false;
      turning = false;
      drifting = false;
      zoomFrom = -1;
      fadeFrom = -1;
      fallFrom = -1;
      setBoard(null);
      setScene('FLOOD');
      onFlood?.();
      /* in time, the peak's last seconds ring on under it; skipped to, whatever was playing gets out of the way */
      if (!inTime) audio?.hush(0.3);
      audio?.play(tier === 'DEGRADED_OPENING' ? 'floodBad' : 'flood');
      if (engine && night && palette) {
        engine.bakeGlobe();
        Object.assign(engine.look, {
          zoom: 1, fade: 1, dim: 1, fall: 0, sway: 0, twinkle: 0, hover: 0, beams: 0, stage: 0, atmosphere: 0, city: 0, glow: 0.3, horizon: 0.02, bloom: 1.1, waveGain: 0,
          rise: tier === 'DEGRADED_OPENING' ? -1 : 1, top: [0.012, 0.014, 0.034], bottom: [0.002, 0.002, 0.006],
        });
        waveGain = 0;
        engine.morph(riseFormation(size, palette, tier), calm ? { seconds: 0.01 } : { seconds: 1.5, stagger: 0.55, swirl: 90, glow: 0.8 });
      }
    };
    toFlood.current = () => goFlood((performance.now() - started) / 1000);
    if (startAtFlood) goFlood(0);

    const render = (now: number) => {
      const seconds = (now - started) / 1000;
      while (nextCue < cues.length && seconds >= cues[nextCue].at) {
        cues[nextCue].run(seconds);
        nextCue += 1;
      }
      if (flooded && !trimmed && seconds > floodedAt + 1.8 && engine) {
        trimmed = true;
        engine.keepLights(RISE_LIGHTS);
      }

      /* the telemetry */
      const left = COUNT_SECONDS - seconds;
      const live = -left;
      if (clock.current) clock.current.textContent = live < 0 ? `00:00:${pad(Math.ceil(left))}` : clockWord(live * 60);
      if (clockSign.current) clockSign.current.textContent = live < 0 ? 'T-' : 'T+';
      const toPeak = Math.max(0, seconds - COUNT_SECONDS) / Math.max(1, at.peakAt - COUNT_SECONDS);
      const streams = smooth(toPeak) * peak;
      const joined = easeOut(toPeak) * subscribers;
      if (streamsText.current) streamsText.current.textContent = streamsWord(streams);
      if (streamsRing.current) streamsRing.current.style.strokeDashoffset = String(100 - Math.min(100, (streams / room) * 100));
      if (subsText.current) subsText.current.textContent = streamsWord(joined);
      if (subsRing.current) subsRing.current.style.strokeDashoffset = String(100 - Math.min(1, toPeak) * 100);
      if (bigCount.current) bigCount.current.textContent = whole(joined);
      if (cityCount.current) cityCount.current.textContent = whole(streams);

      if (engine && !idle) {
        const look = engine.look;
        const sinceWave = seconds - waveAt;
        look.waveFront = sinceWave * diagonal * 0.95;
        look.waveGain = calm ? 0 : Math.max(0, 1 - sinceWave * 0.95) ** 2 * waveGain;
        look.phase = seconds - phaseFrom;
        if (seconds < at.world && !flooded) {
          /* the beams build through the count and blaze at zero */
          const toZero = Math.min(1, seconds / COUNT_SECONDS);
          look.beams = seconds < COUNT_SECONDS ? 0.55 + toZero * 0.6 : 1.6;
          look.glow = seconds < COUNT_SECONDS ? 0.45 + toZero * 0.5 : 1;
          if (seconds < COUNT_SECONDS) {
            /* the picture kicks on every number, harder near the end; the last instant before zero goes black */
            look.zoom = calm ? 1 : 1 + (0.012 + toZero * 0.03) * Math.exp(-sinceWave * 7);
            look.fade = !calm && seconds > COUNT_SECONDS - 0.17 ? 0.08 : 1;
          } else {
            look.zoom = 1;
            look.fade = 1;
          }
        }
        if (turning && world) {
          const [cx, cy, radius, tilt] = look.globe;
          look.spin = world.spinStart + (world.spinEnd - world.spinStart) * Math.min(1, look.phase / WORLD_WAVE_SECONDS);
          world.chips.forEach((chip, index) => {
            const element = chipEls.current[index];
            if (!element) return;
            const [x, y, z] = globePoint(chip.lon, chip.lat, look.spin, tilt);
            element.style.opacity = look.phase >= chip.act && z > 0.12 ? '1' : '0';
            element.style.transform = `translate3d(${Math.min(size.W - 148, cx + radius * x).toFixed(1)}px, ${(cy - radius * y - chip.stack * 40).toFixed(1)}px, 0)`;
          });
        }
        /* a slow push into the city, then through one window */
        if (drifting) look.zoom = 1 + Math.max(0, seconds - at.city) * 0.014;
        if (zoomFrom >= 0) {
          const k = Math.min(1, (seconds - zoomFrom) / ZOOM_SECONDS);
          drifting = false;
          look.zoom = 1.09 + k * k * k * k * 90;
        }
        if (fadeFrom >= 0) look.fade = Math.min(1, (seconds - fadeFrom) / 0.35);
        if (fallFrom >= 0) look.fall = Math.max(0, seconds - fallFrom);
        engine.render(seconds);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    /* a hidden tab stops its frames: the night still ends. Perf plan (2026-11-08): the night waits while
       the app is hidden, and so does its sound (audioVisibility), so on return picture and music go on
       together from the same second; this guard counts only the time the night was on screen. */
    let guard = 0;
    let hiddenAt: number | null = null;
    const armGuard = () => {
      window.clearTimeout(guard);
      const remaining = Math.max(0, (at.end + 2) * 1000 - (performance.now() - started));
      guard = window.setTimeout(() => toFlood.current(), remaining);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (hiddenAt !== null) return;
        hiddenAt = performance.now();
        window.clearTimeout(guard);
      } else if (hiddenAt !== null) {
        started += performance.now() - hiddenAt;
        hiddenAt = null;
        armGuard();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    armGuard();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(guard);
      document.removeEventListener('visibilitychange', onVisibility);
      engine?.dispose();
      canvas?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { audio?.setMuted(muted); }, [audio, muted]);

  const cities = inputs.network?.sites.length ?? 0;
  const countries = inputs.network?.markets.length ?? 0;
  const lower = (() => {
    if (scene === 'COUNT') return { eyebrow: 'LIVE', main: `${name}: opening night`, sub: `${inputs.title} premieres at zero` };
    if (scene === 'LOGO' || scene === 'IDENT') return { eyebrow: 'LIVE', main: 'We are live', sub: `${name}, for the first time anywhere` };
    if (scene === 'WORLD' || scene === 'HOLD') return { eyebrow: 'THE WORLD', main: 'The world goes live', sub: `8 PM, city by city: ${cities} ${cities === 1 ? 'city' : 'cities'}, ${countries} ${countries === 1 ? 'country' : 'countries'}` };
    if (scene === 'CITY') return { eyebrow: 'TONIGHT', main: 'Every window, one TV at a time', sub: `${inputs.title} is playing` };
    if (scene === 'ROOM') return { eyebrow: 'AT HOME', main: 'One living room', sub: `One of ${streamsWord(peak)} about to press play` };
    return { eyebrow: 'LAUNCH CONTROL', main: 'The peak', sub: reached ? 'That was the night' : 'Will it hold?' };
  })();

  const titleNext = inputs.titleArt ? { title: inputs.titleArt.title, hue: inputs.titleArt.hue } : null;
  const markets = (inputs.markets ?? []).slice(0, 4);
  const topMarket = Math.max(1, ...markets.map(market => market.subscribers));
  const rank = commit.openingDemandIndex >= 72 ? 1 : commit.openingDemandIndex >= 60 ? 2 : commit.openingDemandIndex >= 50 ? 4 : 9;
  const fullTag = (brand.name || 'EMPIRE+').replace(/\s+/g, '').toUpperCase();
  /* nobody trends on a whole company name: past a certain length, its initials */
  const tag = fullTag.length <= 14 ? fullTag : (brand.name || '').split(/\s+/).map(word => word[0]).join('').toUpperCase() || fullTag.slice(0, 14);
  const stepNow = STEPS.indexOf(scene === 'LOGO' ? 'COUNT' : scene === 'HOLD' ? 'IDENT' : scene);
  const tallBoard = (hud.current?.offsetTop ?? 684) > 560;

  return (
    <div className={cx(css.broadcast, noEngine && css.noEngine)} data-scene={scene} data-engine={noEngine ? 'plain' : 'lights'} onPointerDown={() => audio?.resume()} style={{ ['--tv-hue' as string]: inputs.titleArt?.hue ?? brand.hue }}>
      <div ref={lightsHolder} className={css.nightStage} aria-hidden="true" />

      {noEngine && scene === 'COUNT' && <b key={count} className={css.plainDigit}>{count}</b>}
      {noEngine && scene === 'LOGO' && <span className={css.plainLogo}><Mark brand={brand} /></span>}
      {scene === 'LOGO' && <i className={css.flash} aria-hidden="true" />}

      {(scene === 'IDENT' || scene === 'HOLD') && (
        <div className={cx(css.identFull, scene === 'HOLD' && css.identOut)}>
          <StreamingIdentPlayer brand={brand} kit={(inputs.ident?.packageId || 'STANDARD') as StreamingIdentPackageId} sound={inputs.ident?.sound || 'pulse'} seconds={identSeconds} next={titleNext} />
        </div>
      )}

      {scene === 'WORLD' && (
        <div className={css.worldWords}>
          <div className={css.bigNumber}>
            <small>PEOPLE WHO JUST JOINED</small>
            <b ref={bigCount as React.RefObject<HTMLElement>}>0</b>
          </div>
          {(night?.world?.chips ?? []).map((chip, index) => (
            <div key={chip.label} className={css.chip} ref={element => { chipEls.current[index] = element; }}>
              <span><small>{chip.line}</small><b>{chip.label}</b></span>
            </div>
          ))}
          {markets.length > 0 && (
            <ol className={css.worldBoard}>
              {markets.map((market, index) => (
                <li key={market.countryId} style={{ animationDelay: `${1.6 + index * 1.2}s` }}>
                  <i className={css.worldFlag}><CountryFlagSvg code={market.countryId} fit="stretch" /></i>
                  <span>{market.name}</span>
                  <b>{whole(market.subscribers)}</b>
                </li>
              ))}
            </ol>
          )}
          <div className={css.chartPills}>
            <span style={{ animationDelay: '4.2s' }}><i>APP STORE</i><b>#{rank}</b> ENTERTAINMENT</span>
            <span style={{ animationDelay: '5.8s' }}><i>TRENDING</i><b>#{rank}</b> {tag}</span>
          </div>
        </div>
      )}

      {scene === 'CITY' && (
        <div className={cx(css.bigNumber, goingIn && css.bigNumberOut)}>
          <small>STREAMING RIGHT NOW</small>
          <b ref={cityCount as React.RefObject<HTMLElement>}>0</b>
        </div>
      )}

      {flood && <i className={css.flood} aria-hidden="true" />}

      {scene === 'ROOM' && <OneRoom brand={brand} inputs={inputs} />}

      {scene === 'FLOOD' && <TheFlood brand={brand} inputs={inputs} commit={commit} peak={peak} onOpen={onOpen} onAgain={onAgain} />}

      {scene === 'PEAK' && (
        <div className={cx(css.peakWords, reached && tier === 'SMOOTH_OPENING' && css.peakGood, reached && tier === 'PRESSURED_OPENING' && css.peakWarn, reached && tier === 'DEGRADED_OPENING' && css.peakBad)}>
          <div className={css.bigNumber}>
            <small>STREAMS AT ONCE</small>
            <b ref={cityCount as React.RefObject<HTMLElement>}>0</b>
          </div>
          {board && (
            <>
              <div className={css.boardHead} style={{ top: board.top - 15 }}>
                <span>THE NIGHT SO FAR</span>
                <span>ROOM FOR {streamsWord(room)}</span>
              </div>
              <div className={css.boardFoot} style={{ top: board.bottom + 14 }}>
                <div className={cx(css.verdict, reached && css.verdictOn)}>
                  <b>{tier === 'SMOOTH_OPENING' ? 'IT HELD' : tier === 'PRESSURED_OPENING' ? 'IT HELD. JUST.' : 'IT BUCKLED'}</b>
                  <span>{tier === 'DEGRADED_OPENING'
                    ? `${failed}% of plays failed at the peak of ${streamsWord(peak)}.`
                    : `${streamsWord(peak)} at once. ${commit.playbackSuccessRate.toFixed(2)}% played first time.`}</span>
                </div>
                {markets.length > 0 && tallBoard && (
                  <ul className={css.loadBars}>
                    {markets.slice(0, 3).map(market => (
                      <li key={market.countryId}>
                        <span>{market.name}</span>
                        <i><em style={{ width: `${(market.subscribers / topMarket) * 100}%` }} /></i>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <i className={cx(css.grade, scene === 'ROOM' && css.gradeLight)} key={`cut${scene === 'ROOM' || scene === 'PEAK' ? scene : 'lights'}`} aria-hidden="true" />

      <header className={css.bug} ref={bug}>
        <span className={css.liveBug}><i aria-hidden="true" />LIVE</span>
        <span className={css.bugBrand}><Mark brand={brand} /></span>
        <span className={css.bugName}>{name}</span>
        <button type="button" className={css.bugSound} aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={muted} onClick={() => setMuted(value => !value)}>{muted ? '×' : '♪'}</button>
        {scene !== 'FLOOD' && <button type="button" className={css.bugSkip} onClick={() => toFlood.current()}>SKIP</button>}
      </header>

      <div className={cx(css.hud, (scene === 'IDENT' || scene === 'FLOOD') && css.hudOut)} ref={hud}>
        <div className={css.lower} key={lower.main}>
          <i aria-hidden="true" />
          <div><small>{lower.eyebrow}</small><b>{lower.main}</b><span>{lower.sub}</span></div>
        </div>
        <div className={css.telemetry}>
          <Gauge label="STREAMS" textRef={streamsText} ringRef={streamsRing} tone={reached && tier !== 'SMOOTH_OPENING' ? css.gaugeHot : undefined} />
          <div className={css.tClock} role="timer">
            <div className={css.tTime}>
              <small ref={clockSign as React.RefObject<HTMLElement>}>T-</small>
              <b ref={clock as React.RefObject<HTMLElement>}>00:00:10</b>
            </div>
            <span>{STEPS.map((step, index) => <i key={step} className={index <= stepNow ? css.tDone : ''} />)}</span>
          </div>
          <Gauge label="JOINED" textRef={subsText} ringRef={subsRing} />
        </div>
      </div>
    </div>
  );
};
