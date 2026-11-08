/**
 * Platform room · Tech (codex-handoff/plans/platform-tech-plan.md, Phase 1).
 *
 *   1. what the plans can offer because of the tree; a locked one opens the step it needs
 *   2. the groups (Picture, HDR, Colour, Sound…), one tile each: the best step and its version.
 *      A tile opens its group in place of the tiles (#78), with "‹ All tech" back:
 *   3. the next upgrade, shown: the same picture now and after it, side by side on one
 *      frame (drag to compare); Sound shows the room's speakers now and after
 *   4. the step's action: unlock it with treasury cash, or raise its version with energy
 *      (+5 a press, hold to repeat, or Fill), exactly as Localization does
 *   5. the group's ladder: tap a step to look at it
 *
 * A press shows at once and reaches the game a moment later; a version reached plays its moment
 * over the card, a tech unlocked a bigger one (#80, as Localization's hello). Nothing here saves
 * or loads on a tap.
 */
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import t from './presentation/screens/NetworkDesk/TechDesk.module.css';
import { cx } from './presentation/cx';
import { AdsWorld, AppsWorld, FamilyWorld, OptimisationWorld, PlaybackWorld, SharingWorld, SmartAiWorld, TrustWorld } from './TechScenes';
import type { StreamingTechGroupId, StreamingTechId } from '../../types';
import { streamingTechUnlocks } from '../../services/streamingLaunchUnlocks';
import { StreamingPlusChip } from '../streamingPlus/StreamingPlusParts';
import { openStreamingPlusSheet } from '../../services/streamingPlusEvents';
import type {
  StreamingTechDeskFeature,
  StreamingTechDeskGroup,
  StreamingTechDeskStep,
  StreamingTechDeskView,
  StreamingTechSharingLook,
  StreamingTechAiLook,
  StreamingTechFamilyLook,
  StreamingTechAdsLook,
} from '../../services/streamingTechDesk';

export type TechActionResult = { ok: boolean; message: string; completed?: boolean };
export interface TechDeskActions {
  onUnlock?: (techId: StreamingTechId) => TechActionResult;
  onContribute?: (techId: StreamingTechId, amount: number | 'FILL') => TechActionResult;
  /** pays a full bar's price and reaches the version (#84) */
  onCompleteVersion?: (techId: StreamingTechId) => TechActionResult;
}

const money = (value: number): string => {
  const trim = (n: number) => String(+n.toFixed(1));
  if (value >= 1e9) return `$${trim(value / 1e9)}B`;
  if (value >= 1e6) return `$${trim(value / 1e6)}M`;
  if (value >= 1e3) return `$${Math.round(value / 1e3)}K`;
  return `$${Math.round(value)}`;
};

const fmtRate = (value: number) => String(+value.toFixed(2));
const pct = (factor: number) => `${Math.round((1 - factor) * 100)}%`;

const Bolt: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5 5 13.6h5.6l-1.3 7.9 8.2-11.1h-5.6l1.3-7.9Z" /></svg>
);

const GroupIcon: React.FC<{ group: StreamingTechGroupId }> = ({ group }) => {
  if (group === 'PICTURE') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="13.5" rx="2.2" /><path d="M8.5 21h7M12 17.5V21" />
      <path className={t.iconFill} d="M6 7.5h3v3H6zM10.5 7.5h3v3h-3zM15 7.5h3v3h-3zM6 12h3v3H6zM10.5 12h3v3h-3z" /></svg>
  );
  if (group === 'HDR') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" className={t.iconFill} />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>
  );
  if (group === 'COLOUR') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9.5" r="5" /><circle cx="15" cy="9.5" r="5" /><circle cx="12" cy="14.6" r="5" className={t.iconFill} /></svg>
  );
  if (group === 'OPTIMISATION') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 15.5a8.5 8.5 0 0 1 17 0" /><path d="M12 15.5 16.2 9.6" />
      <circle cx="12" cy="15.5" r="1.9" className={t.iconFill} /><path d="M5 19.5h14" /></svg>
  );
  if (group === 'STABILIZATION') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path className={t.iconFill} d="M12 2.8 19.5 5.6v5.6c0 4.6-3.1 8.6-7.5 10-4.4-1.4-7.5-5.4-7.5-10V5.6Z" />
      <path d="m8.4 12.2 2.5 2.5 4.8-5.2" /></svg>
  );
  if (group === 'PLAYBACK') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path className={t.iconFill} d="M10 8.2v7.6l6-3.8Z" /></svg>
  );
  if (group === 'APPS') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="13.5" height="9.5" rx="1.6" /><path d="M6.5 18h5.5M9.25 14.5V18" />
      <rect x="17" y="8.5" width="4.8" height="10" rx="1.2" className={t.iconFill} /></svg>
  );
  if (group === 'SMART_AI') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path className={t.iconFill} d="M11 3.5 12.6 8.4 17.5 10 12.6 11.6 11 16.5 9.4 11.6 4.5 10 9.4 8.4Z" />
      <path d="M18 14.5v5M15.5 17h5M5.5 16.5v3M4 18h3" /></svg>
  );
  if (group === 'ADS') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path className={t.iconFill} d="M3.5 10v4h3l6 4.5v-13l-6 4.5Z" />
      <path d="M16 8.6a4.6 4.6 0 0 1 0 6.8" /><path d="M19 12h2.5" /></svg>
  );
  if (group === 'FAMILY') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.6V20h13V9.6" />
      <circle cx="12" cy="12.6" r="2.3" className={t.iconFill} /><path d="M8.4 20a3.6 3.6 0 0 1 7.2 0" /></svg>
  );
  if (group === 'TRUST') return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" />
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2" className={t.iconFill} /><path d="M12 14.6v2.6" /></svg>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path className={t.iconFill} d="M4 9.2h3.4L12 5v14l-4.6-4.2H4z" /><path d="M15.5 8.6a4.6 4.6 0 0 1 0 6.8M18.3 6a8.4 8.4 0 0 1 0 12" /></svg>
  );
};

/* What a version means in each group, in one line. */
const VERSION_MEANING: Record<StreamingTechGroupId, string> = {
  PICTURE: 'A better encode at the same resolution: less blur, less blocking.',
  HDR: 'More light held in the highlights and more detail in the dark.',
  COLOUR: 'Smoother gradients: fewer bands in every sky.',
  SOUND: 'A cleaner mix: clearer voices, tighter effects.',
  OPTIMISATION: 'A better-tuned encoder: less data for the same picture.',
  STABILIZATION: 'Deeper coverage: more debt paid down each week, fewer surprises.',
  PLAYBACK: 'A tighter player: faster starts, steadier streams.',
  APPS: 'A better app on that screen: smoother, more of the catalogue, fewer crashes.',
  TRUST: 'Stronger protection: harder to copy, quicker to catch, safer to sign in.',
  SMART_AI: 'Sharper guesses: more viewers find something they want, sooner.',
  FAMILY: 'More for the whole home: more screens at once, richer profiles, a safer kids space.',
  ADS: 'Sharper matching and better-placed breaks: advertisers pay more for every slot.',
};

/* ── the preview ─────────────────────────────────────────────────────────── */

type Side = {
  step: StreamingTechDeskStep | null; version: number; label: string; dialogue: number;
  /** Optimisation: the load factor this side runs at · Stabilization: debt paid a week, and the debt */
  load?: number; paydown?: number; debt?: number;
  /** Trust and safety (#54): the Security level, and how likely a title leaks against DRM alone */
  shield?: { security: number; leak: number };
  /** Sharing control (#56): outside homes, the share who pay to stay, the crackdown's cancellations */
  sharing?: StreamingTechSharingLook;
  /** Smart AI (#59): the Recommendations level and what the tree does to watching */
  ai?: StreamingTechAiLook;
  /** Profiles and family (#60): screens, kids profiles, watch parties */
  family?: StreamingTechFamilyLook;
  /** Ads tech (#61): the Commerce level, targeting, slots and breaks */
  ads?: StreamingTechAdsLook;
};

const RESOLUTION: Partial<Record<StreamingTechId, number>> = {
  PICTURE_480P: 480, PICTURE_720P: 720, PICTURE_1080P: 1080, PICTURE_4K: 2160,
  PICTURE_8K: 4320, PICTURE_12K: 6480, PICTURE_16K: 8640, PICTURE_24K: 12960,
};
/* A version is the encode's quality: version 1 is soft and banded, 2 a little soft, 3 clean. */
const VERSION_BLUR = [.6, .6, .3, 0];
const VERSION_LEVELS = [7, 7, 16, 0];

/** Deterministic 0..1 from two integers (the city's lit windows). */
const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const BUILDINGS: Array<[number, number, number]> = [
  [4, 30, 74], [36, 22, 58], [60, 34, 92], [96, 26, 66], [124, 40, 104], [166, 24, 70],
  [192, 30, 86], [224, 22, 60], [248, 36, 96], [286, 30, 72],
];

const PictureScene: React.FC<{ id: string }> = ({ id }) => (
  <g id={id}>
    <rect width="320" height="180" fill={`url(#${id}-sky)`} />
    <circle cx="236" cy="70" r="34" fill="#ffd28a" opacity=".22" />
    <circle cx="236" cy="70" r="19" fill="#ffe7b6" />
    <path d="M0 116 38 100 80 112 122 92 170 108 212 96 262 110 320 98V180H0Z" fill="#3b2b5e" />
    {BUILDINGS.map(([x, w, h], index) => (
      <g key={index}>
        <rect x={x} y={180 - h - 18} width={w} height={h} fill={index % 2 ? '#141a35' : '#10162c'} />
        {Array.from({ length: Math.floor((h - 8) / 7) }, (_, row) => Array.from({ length: Math.floor((w - 4) / 6) }, (_, col) => (
          hash(index * 13 + row, col) > .42
            ? <rect key={`${row}-${col}`} x={x + 3 + col * 6} y={180 - h - 18 + 5 + row * 7} width="3" height="4" fill="#ffd27a" opacity={.55 + hash(row, col + index) * .45} />
            : null
        )))}
      </g>
    ))}
    <rect x="40" y="56" width="74" height="30" rx="2" fill="#0c1022" stroke="#3b82f6" strokeWidth="1.4" />
    <text x="77" y="74.5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#ffffff" fontFamily="Inter, system-ui, sans-serif" letterSpacing=".5">EMPIRE+</text>
    <text x="77" y="82" textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#9db8ff" fontFamily="Inter, system-ui, sans-serif" letterSpacing=".8">NOW STREAMING · 4 NEW TITLES</text>
    <rect y="162" width="320" height="18" fill="#090b14" />
    {Array.from({ length: 11 }, (_, index) => <rect key={index} x={6 + index * 30} y="170" width="14" height="1.6" fill="#f5c46b" opacity=".75" />)}
  </g>
);

/** The encode (blur, then fewer shades), then the pixel trick: one dot per cell, tiled, kept
    where the picture is, grown to fill the cell. */
const PictureFilter: React.FC<{ id: string; block: number; version: number }> = ({ id, block, version }) => {
  const blur = VERSION_BLUR[version] ?? 0;
  const levels = VERSION_LEVELS[version] ?? 0;
  const table = levels > 0 ? Array.from({ length: levels }, (_, index) => (index / (levels - 1)).toFixed(3)).join(' ') : '';
  const coded = levels > 0 ? 'coded' : blur > 0 ? 'soft' : 'SourceGraphic';
  return (
    <filter id={id} x="0" y="0" width="320" height="180" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      {/* a filter with no step at all would hide the picture: version 3 at full resolution passes it through */}
      {blur <= 0 && levels <= 0 && block <= 1 ? <feOffset in="SourceGraphic" dx="0" dy="0" /> : null}
      {blur > 0 ? <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="soft" /> : null}
      {levels > 0 ? (
        <feComponentTransfer in={blur > 0 ? 'soft' : 'SourceGraphic'} result="coded">
          <feFuncR type="discrete" tableValues={table} />
          <feFuncG type="discrete" tableValues={table} />
          <feFuncB type="discrete" tableValues={table} />
        </feComponentTransfer>
      ) : null}
      {block > 1 ? (
        <>
          <feFlood x={Math.floor(block / 2)} y={Math.floor(block / 2)} width="1" height="1" floodColor="#fff" />
          <feComposite width={block} height={block} />
          <feTile result="grid" />
          <feComposite in={coded} in2="grid" operator="in" />
          <feMorphology operator="dilate" radius={Math.floor(block / 2)} />
        </>
      ) : null}
    </filter>
  );
};

const HdrScene: React.FC<{ id: string }> = ({ id }) => (
  <g id={id}>
    <rect width="320" height="180" fill={`url(#${id}-sky)`} />
    <circle cx="160" cy="92" r="40" fill="#ffb36b" opacity=".28" />
    <circle cx="160" cy="92" r="17" fill="#fff1cf" />
    <rect y="104" width="320" height="76" fill={`url(#${id}-sea)`} />
    {[0, 1, 2, 3, 4, 5].map(index => (
      <rect key={index} x={160 - (34 - index * 4.5)} y={110 + index * 9} width={(34 - index * 4.5) * 2} height="2.2" rx="1.1" fill="#ffd7a0" opacity={.7 - index * .09} />
    ))}
    <path d="M0 64 20 58 44 72 58 98 74 112 70 180H0Z" fill="#120d1c" />
    <path d="M320 58 296 66 276 88 262 108 268 180H320Z" fill="#160f22" />
    <path d="M30 92h6v-14h4v14h3" stroke="#2b1f3f" strokeWidth="2" fill="none" />
    <circle cx="288" cy="96" r="2" fill="#ffcf7a" />
  </g>
);

/** HDR level 0 (none) … 9 (Ultra, version 3): saturation, contrast and how much the highlights hold. */
const hdrLevel = (side: Side): number => {
  if (!side.step) return 0;
  const index = side.step.id === 'HDR_HDR' ? 0 : side.step.id === 'HDR_PRO' ? 1 : 2;
  return index * 3 + side.version;
};
const HdrFilter: React.FC<{ id: string; level: number }> = ({ id, level }) => {
  const slope = .68 + level * .075;
  const intercept = .16 - level * .024;
  return (
    <filter id={id} x="0" y="0" width="320" height="180" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feColorMatrix type="saturate" values={String(.5 + level * .1)} />
      <feComponentTransfer>
        <feFuncR type="linear" slope={slope} intercept={intercept} />
        <feFuncG type="linear" slope={slope} intercept={intercept} />
        <feFuncB type="linear" slope={slope} intercept={intercept} />
      </feComponentTransfer>
    </filter>
  );
};

const COLOUR_STOPS: Array<[number, [number, number, number]]> = [
  [0, [13, 20, 64]], [.34, [59, 42, 122]], [.6, [196, 86, 122]], [.8, [242, 145, 106]], [1, [255, 215, 150]],
];
const colourAt = (share: number): string => {
  const index = Math.max(0, COLOUR_STOPS.findIndex(([at]) => at >= share) - 1);
  const [a, from] = COLOUR_STOPS[index];
  const [b, to] = COLOUR_STOPS[Math.min(COLOUR_STOPS.length - 1, index + 1)];
  const k = b > a ? (share - a) / (b - a) : 0;
  return `rgb(${from.map((value, channel) => Math.round(value + (to[channel] - value) * k)).join(',')})`;
};
/* bands in the sky at versions 1, 2 and 3: each version clearly smoother, and never past the next step's first */
const COLOUR_BANDS: Partial<Record<StreamingTechId, [number, number, number]>> = {
  COLOUR_8BIT: [6, 8, 10], COLOUR_10BIT: [12, 16, 21], COLOUR_12BIT: [26, 34, 44], COLOUR_16BIT: [90, 130, 180],
};
const colourBands = (side: Side): number => (COLOUR_BANDS[side.step?.id as StreamingTechId] || [6, 8, 10])[Math.max(0, side.version - 1)];

const ColourSky: React.FC<{ bands: number }> = ({ bands }) => (
  <g>
    {Array.from({ length: bands }, (_, index) => (
      <rect key={index} x="0" y={(index * 180) / bands} width="320" height={180 / bands + .6} fill={colourAt((index + .5) / bands)} />
    ))}
  </g>
);
const ColourGround: React.FC = () => (
  <g>
    <path d="M0 132 52 108 96 124 150 96 206 120 252 104 320 126V180H0Z" fill="#1d1233" />
    <path d="M0 152 64 136 132 150 196 132 262 148 320 138V180H0Z" fill="#0f0a1d" />
    <path d="M206 58q5-4 10 0q5-4 10 0M232 46q4-3 8 0q4-3 8 0" stroke="#1d1233" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </g>
);

/* Sound: a home theatre seen from the sofa. Each speaker the layout has sends its sound to the
   viewer as a moving beam; Spatial adds the ceiling speakers' light falling on the viewer,
   Lossless a clean waveform under the screen, Personal a halo tuned to the viewer's ears, and
   Clear dialogue a line lifted out of the centre speaker. */
type Spot = { x: number; y: number; w: number; h: number; rank: number };
const SOUND_ORDER: StreamingTechId[] = ['SOUND_STEREO', 'SOUND_51', 'SOUND_71', 'SOUND_SPATIAL', 'SOUND_LOSSLESS', 'SOUND_PERSONAL'];
const soundRank = (stepId: StreamingTechId | undefined) => Math.max(0, SOUND_ORDER.indexOf(stepId as StreamingTechId));
const EAR: [number, number] = [160, 147];
/* rank: 0 stereo · 1 5.1 · 2 7.1 */
const SPEAKER_SPOTS: Spot[] = [
  { x: 84, y: 50, w: 13, h: 62, rank: 0 },   // front left tower
  { x: 223, y: 50, w: 13, h: 62, rank: 0 },  // front right tower
  { x: 140, y: 88, w: 40, h: 9, rank: 1 },   // centre
  { x: 9, y: 70, w: 14, h: 26, rank: 1 },    // side left
  { x: 297, y: 70, w: 14, h: 26, rank: 1 },  // side right
  { x: 4, y: 128, w: 20, h: 34, rank: 2 },   // rear left
  { x: 296, y: 128, w: 20, h: 34, rank: 2 }, // rear right
];
const CEILING: Array<[number, number]> = [[98, 4], [222, 4]];

const SoundScene: React.FC<{ uid: string; side: Side; accent: string; muted: boolean }> = ({ uid, side, accent, muted }) => {
  const rank = soundRank(side.step?.id);
  const tone = muted ? '#8d97ab' : accent;
  const strength = [.42, .42, .62, .85][side.version] ?? .42;
  const spots = SPEAKER_SPOTS.filter(spot => spot.rank <= rank);
  const beam = (x: number, y: number, key: string, delay: number) => {
    const mx = (x + EAR[0]) / 2 + (x < EAR[0] ? -10 : x > EAR[0] ? 10 : 0);
    const my = Math.min(y, EAR[1]) + Math.abs(EAR[1] - y) * .35;
    return (
      <path key={key} className={t.beam} d={`M${x} ${y} Q${mx} ${my} ${EAR[0]} ${EAR[1] - 6}`} stroke={tone}
        strokeWidth={1.7 + side.version * .45} strokeOpacity={strength} fill="none" style={{ animationDelay: `${delay}ms` }} />
    );
  };
  return (
    <g>
      <rect width="320" height="180" fill={`url(#${uid}-wall)`} />
      <polygon points="0,0 320,0 284,12 36,12" fill="#0f1426" />
      <polygon points="0,0 36,12 36,118 0,180" fill="#0b0f1d" />
      <polygon points="320,0 284,12 284,118 320,180" fill="#0b0f1d" />
      <polygon points="36,118 284,118 320,180 0,180" fill={`url(#${uid}-floor)`} />
      {/* the screen, and its light on the floor */}
      <ellipse cx="160" cy="58" rx="74" ry="36" fill={tone} opacity={muted ? .06 : .14} />
      <ellipse cx="160" cy="132" rx="118" ry="22" fill="#7a3b8f" opacity=".12" />
      <rect x="110" y="30" width="100" height="56" rx="2.5" fill="#04050a" stroke="rgba(255,255,255,.14)" />
      <rect x="113" y="33" width="94" height="50" rx="1.5" fill={`url(#${uid}-screen)`} />
      <path d="M113 70 140 58 158 66 180 52 207 64V83H113Z" fill="#0b0f1d" opacity=".55" />
      {rank >= 4 && (
        <path className={t.lossless} d="M116 78q4-6 8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0" stroke={tone} strokeWidth="1.3" fill="none" opacity=".9" />
      )}
      {/* the ceiling speakers (Spatial): their sound falls on the viewer like light */}
      {rank >= 3 && CEILING.map(([x, y], index) => (
        <g key={`c${index}`}>
          <polygon className={t.cone} points={`${x - 6},${y + 4} ${x + 6},${y + 4} ${EAR[0] + (x < 160 ? -4 : 4)},${EAR[1] - 8} ${EAR[0] + (x < 160 ? -16 : 16)},${EAR[1] - 8}`}
            fill={`url(#${uid}-cone)`} style={{ animationDelay: `${index * 400}ms` }} />
          <ellipse cx={x} cy={y + 3} rx="9" ry="3" fill="#1b2236" stroke={tone} strokeOpacity=".8" />
        </g>
      ))}
      {spots.map((spot, index) => beam(spot.x + spot.w / 2, spot.y + spot.h / 3, `b${index}`, index * 160))}
      {rank >= 3 && CEILING.map(([x, y], index) => beam(x, y + 5, `cb${index}`, 300 + index * 200))}
      {spots.map((spot, index) => (
        <g key={`s${index}`}>
          {!muted && <rect x={spot.x - 2} y={spot.y - 2} width={spot.w + 4} height={spot.h + 4} rx="4" fill={tone} opacity=".16" className={t.glow} style={{ animationDelay: `${index * 160}ms` }} />}
          <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx="2.5" fill="#161c2e" stroke="rgba(255,255,255,.1)" />
          {spot.h > 20 ? (
            <>
              <circle cx={spot.x + spot.w / 2} cy={spot.y + spot.h * .3} r={spot.w * .3} fill="#05060a" stroke={tone} strokeOpacity=".7" />
              <circle cx={spot.x + spot.w / 2} cy={spot.y + spot.h * .68} r={spot.w * .36} fill="#05060a" stroke={tone} strokeOpacity=".7" />
            </>
          ) : (
            <rect x={spot.x + 3} y={spot.y + 2.5} width={spot.w - 6} height={spot.h - 5} rx="2" fill="#05060a" stroke={tone} strokeOpacity=".7" />
          )}
        </g>
      ))}
      {rank >= 1 && <rect x="196" y="100" width="18" height="15" rx="2" fill="#161c2e" stroke="rgba(255,255,255,.1)" />}
      {/* the viewer on the sofa, seen from behind */}
      {rank >= 5 && [16, 23].map((r, index) => (
        <circle key={`h${index}`} className={t.halo} cx={EAR[0]} cy={EAR[1]} r={r} stroke={tone} style={{ animationDelay: `${index * 500}ms` }} />
      ))}
      <path d="M92 180V160q0-10 12-10h112q12 0 12 10v20Z" fill="#1a2135" />
      <path d="M136 180q0-22 24-22t24 22Z" fill="#232c44" />
      <circle cx={EAR[0]} cy={EAR[1]} r="10.5" fill="#2e3854" />
      {side.dialogue > 0 && (
        <g className={t.dialogue}>
          <path d="M136 15h48q5 0 5 5v6q0 5-5 5h-20l-4 5-4-5h-20q-5 0-5-5v-6q0-5 5-5Z" fill="#f6f8ff" opacity={.7 + side.dialogue * .1} />
          <text x="160" y="27" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#10131c" fontFamily="Inter, system-ui, sans-serif">“Run!”</text>
        </g>
      )}
    </g>
  );
};

const SoundDefs: React.FC<{ uid: string; accent: string }> = ({ uid, accent }) => (
  <>
    <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#121831" /><stop offset=".66" stopColor="#0b0f1d" />
    </linearGradient>
    <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#0d1121" /><stop offset="1" stopColor="#06070d" />
    </linearGradient>
    <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#1f3a8a" /><stop offset=".55" stopColor="#7a3b8f" /><stop offset="1" stopColor="#f08a4b" />
    </linearGradient>
    <linearGradient id={`${uid}-cone`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={accent} stopOpacity=".38" /><stop offset="1" stopColor={accent} stopOpacity="0" />
    </linearGradient>
  </>
);

/* Optimisation: the data centre at peak. Racks light up with the load they carry and the lanes
   carry each viewer's stream as packets: heavy and red at ×1.0, light and green once optimised. */
/* Stabilization: the status page at a glance. The uptime strip and the service's heartbeat
   settle as Stabilization pays the tech debt down faster than quality piles it up. */
const unit = (a: number, b: number) => { const x = Math.sin(a * 91.7 + b * 47.3) * 43758.5453; return x - Math.floor(x); };
const StabilizationScene: React.FC<{ paydown: number; debt: number; accent: string; muted: boolean }> = ({ paydown, debt, accent, muted }) => {
  const shaky = Math.max(.04, Math.min(1, (debt + 12) / (12 + paydown * 14)));
  const beat = Array.from({ length: 33 }, (_, index) => {
    const x = index * 10;
    const spike = index % 6 === 3 ? -(10 + 26 * shaky) : index % 6 === 4 ? 8 + 16 * shaky : (unit(index, 2) - .5) * 14 * shaky;
    return `${x},${96 + spike}`;
  }).join(' ');
  return (
    <g>
      <rect width="320" height="180" fill="#070a12" />
      <text x="10" y="13" fontSize="6.5" fontWeight="900" letterSpacing="1.2" fill="#6f7686" fontFamily="Inter, system-ui, sans-serif">UPTIME</text>
      {Array.from({ length: 30 }, (_, index) => {
        const roll = unit(index, 7);
        const fill = roll < shaky * .22 ? '#ff5a5f' : roll < shaky * .55 ? '#ffb020' : '#2f9e5f';
        return <rect key={index} x={10 + index * 10.1} y="19" width="7.4" height="30" rx="1.6" fill={fill} />;
      })}
      <text x="10" y="70" fontSize="6.5" fontWeight="900" letterSpacing="1.2" fill="#6f7686" fontFamily="Inter, system-ui, sans-serif">PLAYBACK</text>
      {/* pathLength 1: the line draws in whole however shaky (long) it is */}
      <polyline className={t.beat} points={beat} pathLength={1} fill="none" stroke={muted ? '#8d97ab' : accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <text x="10" y="140" fontSize="6.5" fontWeight="900" letterSpacing="1.2" fill="#6f7686" fontFamily="Inter, system-ui, sans-serif">STEADY</text>
      <rect x="10" y="146" width="300" height="10" rx="5" fill="#141a2b" />
      <rect x="10" y="146" width={Math.max(8, 300 * (1 - shaky))} height="10" rx="5" fill={muted ? '#8d97ab' : accent} />
    </g>
  );
};

/* Playback (#52): how fast a title starts, whether it stalls, and the extras around the player.
   A side shows its main step (or the best one owned) and every owned side line, plus its own. */
const START_SECONDS: Partial<Record<StreamingTechId, [number, number, number]>> = {
  PLAY_FAST_START: [1.8, 1.4, 1], PLAY_ADAPTIVE: [1.4, 1.1, .8], PLAY_LOW_LATENCY: [1, .8, .6],
};
const EXTRA_WORDS: Partial<Record<StreamingTechId, string>> = {
  PLAY_DOWNLOADS: 'Downloads', PLAY_SKIP_INTRO: 'Skip intro', PLAY_CONTINUE: 'Continue anywhere', PLAY_ACCESSIBILITY: 'Subtitles + AD',
};
const playbackLook = (side: Side, group: StreamingTechDeskGroup) => {
  const own = side.step && !side.step.sideLine;
  const main = own ? side.step : group.best;
  const version = own ? side.version : group.best?.version ?? 0;
  const start = main && version >= 1 ? START_SECONDS[main.id]?.[version - 1] ?? 6 : 6;
  const smooth = Boolean(main && (main.id === 'PLAY_ADAPTIVE' || main.id === 'PLAY_LOW_LATENCY') && version >= 1);
  const live = Boolean(main && main.id === 'PLAY_LOW_LATENCY' && version >= 1);
  const extras = group.steps.filter(item => item.sideLine && (item.state === 'OWNED' || (item.id === side.step?.id && side.version >= 1)))
    .map(item => EXTRA_WORDS[item.id] || item.name);
  return { start, smooth, live, extras };
};
/* the last of the five screens a side lights (0 = the phone) */
const appsLit = (side: Side, group: StreamingTechDeskGroup): number => {
  const ladder = group.steps.filter(item => !item.sideLine);
  const main = side.step && !side.step.sideLine ? side.step : group.best;
  return main && (side.step === main ? side.version >= 1 : true) ? Math.max(0, ladder.findIndex(item => item.id === main.id)) : 0;
};
/** the groups drawn as worlds (#79) */
const WORLDS = new Set<StreamingTechGroupId>(['OPTIMISATION', 'PLAYBACK', 'APPS', 'TRUST', 'SMART_AI', 'FAMILY', 'ADS']);

const TechPreview: React.FC<{
  group: StreamingTechDeskGroup;
  now: Side;
  next: Side | null;
  celebrating: boolean;
}> = ({ group, now, next, celebrating }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Apps lights its screens left to right: the handle starts between the last one lit now and the
  // first one next lights, so the new screen shows on the NEXT side (the phone → Smart TV step too)
  const home = group.id === 'APPS' && next && appsLit(next, group) > appsLit(now, group)
    ? ((32 + (appsLit(now, group) + .5) * 64) / 320) * 100
    : 50;
  const [split, setSplit] = useState(home);
  const frame = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const solo = !next || celebrating;
  useEffect(() => { setSplit(home); }, [group.id, now.step?.id, now.version, next?.step?.id, next?.version, home]);
  const setFrom = (clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width <= 0) return;
    setSplit(Math.max(6, Math.min(94, ((clientX - box.left) / box.width) * 100)));
  };
  const drag = solo ? {} : {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setFrom(event.clientX);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => { if (dragging.current) setFrom(event.clientX); },
    onPointerUp: () => { dragging.current = false; },
    onPointerCancel: () => { dragging.current = false; },
  };
  const cut = solo ? 320 : (split / 100) * 320;
  const right = solo ? now : next!;

  let art: React.ReactNode;
  let zoomNote = '';
  if (group.id === 'PICTURE') {
    const resNow = RESOLUTION[now.step?.id as StreamingTechId] || 480;
    const resNext = RESOLUTION[right.step?.id as StreamingTechId] || resNow;
    // past 4K the frame looks closer (the billboard still whole), so the steps keep looking different
    const zoom = Math.max(resNow, resNext) >= 6480 ? 4 : Math.max(resNow, resNext) >= 4320 ? 3 : 1;
    if (zoom > 1) zoomNote = `${zoom}× zoom`;
    /* The step shown next is drawn sharp, and the one now as much coarser as its resolution is
       lower. A version (the same resolution) keeps that resolution's grain and differs in its
       encode: blur at version 1, less at 2, none at 3. */
    const grain = (res: number) => Math.max(1, Math.min(5, Math.round((2160 * zoom) / res / 1.5)));
    const sameRes = resNow === resNext;
    const blockNow = sameRes ? grain(resNow) : Math.max(grain(resNow), Math.min(10, Math.round((2.2 * resNext) / resNow)));
    const blockNext = sameRes ? grain(resNext) : 1;
    const view = zoom > 1 ? `translate(160 90) scale(${zoom}) translate(-77 -72)` : undefined;
    art = (
      <>
        <defs>
          <linearGradient id={`${uid}-scene-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b2b6b" /><stop offset=".55" stopColor="#b0507a" /><stop offset=".72" stopColor="#ffb36b" />
          </linearGradient>
          <PictureScene id={`${uid}-scene`} />
          <PictureFilter id={`${uid}-now`} block={blockNow} version={now.version} />
          <PictureFilter id={`${uid}-next`} block={blockNext} version={right.version} />
          <clipPath id={`${uid}-left`}><rect x="0" y="0" width={cut} height="180" /></clipPath>
          <clipPath id={`${uid}-right`}><rect x={cut} y="0" width={320 - cut} height="180" /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-left)`} filter={`url(#${uid}-now)`}><use href={`#${uid}-scene`} transform={view} /></g>
        {!solo && <g clipPath={`url(#${uid}-right)`} filter={`url(#${uid}-next)`}><use href={`#${uid}-scene`} transform={view} /></g>}
      </>
    );
  } else if (group.id === 'HDR') {
    const glow = (level: number) => (level === 0 ? 0 : .18 + level * .07);
    art = (
      <>
        <defs>
          <linearGradient id={`${uid}-scene-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#25184a" /><stop offset=".62" stopColor="#e4685a" /><stop offset=".86" stopColor="#ffcf8a" />
          </linearGradient>
          <linearGradient id={`${uid}-scene-sea`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3c2c5c" /><stop offset="1" stopColor="#0a0a18" />
          </linearGradient>
          <radialGradient id={`${uid}-bloom`}><stop offset="0" stopColor="#fff6dc" /><stop offset=".35" stopColor="#ffd08a" stopOpacity=".7" /><stop offset="1" stopColor="#ff9a5a" stopOpacity="0" /></radialGradient>
          <HdrScene id={`${uid}-scene`} />
          <HdrFilter id={`${uid}-now`} level={hdrLevel(now)} />
          <HdrFilter id={`${uid}-next`} level={hdrLevel(right)} />
          <clipPath id={`${uid}-left`}><rect x="0" y="0" width={cut} height="180" /></clipPath>
          <clipPath id={`${uid}-right`}><rect x={cut} y="0" width={320 - cut} height="180" /></clipPath>
        </defs>
        {[{ side: now, clip: 'left', filter: 'now' }, ...(solo ? [] : [{ side: right, clip: 'right', filter: 'next' }])].map(({ side, clip, filter }) => (
          <g key={clip} clipPath={`url(#${uid}-${clip})`}>
            <g filter={`url(#${uid}-${filter})`}><use href={`#${uid}-scene`} /></g>
            {hdrLevel(side) === 0
              ? <><circle cx="160" cy="92" r="27" fill="#fbf7ee" /><rect width="320" height="180" fill="#8a8796" opacity=".16" /></>
              : <circle cx="160" cy="92" r={30 + hdrLevel(side) * 4} fill={`url(#${uid}-bloom)`} opacity={glow(hdrLevel(side))} />}
          </g>
        ))}
      </>
    );
  } else if (group.id === 'STABILIZATION') {
    const scene = (side: Side, muted: boolean) => <StabilizationScene paydown={side.paydown ?? 1} debt={side.debt ?? 0} accent={group.accent} muted={muted} />;
    art = (
      <>
        <defs>
          <clipPath id={`${uid}-left`}><rect x="0" y="0" width={cut} height="180" /></clipPath>
          <clipPath id={`${uid}-right`}><rect x={cut} y="0" width={320 - cut} height="180" /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-left)`}>{scene(now, !solo)}</g>
        {!solo && <g clipPath={`url(#${uid}-right)`}>{scene(right, false)}</g>}
      </>
    );
  } else if (group.id === 'SOUND') {
    art = (
      <>
        <defs>
          <SoundDefs uid={uid} accent={group.accent} />
          <clipPath id={`${uid}-left`}><rect x="0" y="0" width={cut} height="180" /></clipPath>
          <clipPath id={`${uid}-right`}><rect x={cut} y="0" width={320 - cut} height="180" /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-left)`}><SoundScene uid={uid} side={now} accent={group.accent} muted={!solo} /></g>
        {!solo && <g clipPath={`url(#${uid}-right)`}><SoundScene uid={uid} side={right} accent={group.accent} muted={false} /></g>}
      </>
    );
  } else if (WORLDS.has(group.id)) {
    /* #79: the seven groups drawn as worlds (TechScenes.tsx), each whole, now and next; ids kept apart */
    const aiOf = (side: Side): StreamingTechAiLook => side.ai ?? { level: 0, lift: 0, completion: 0, rank: 0, autoplay: false, channels: false, voice: false };
    const adsOf = (side: Side): StreamingTechAdsLook => side.ads ?? { commerce: 0, rank: 0, slots: 1, breakSlope: 1, annoyance: 1 };
    const familyOf = (side: Side): StreamingTechFamilyLook => side.family ?? { screens: 1, kids: false, party: false, appeal: 0, product: 0 };
    const shieldOf = (side: Side) => side.shield ?? { security: 0, leak: 1 };
    const scene = (side: Side, mirror: boolean) => {
      const id = `${uid}-${mirror ? 'next' : 'now'}`;
      switch (group.id) {
        case 'OPTIMISATION': return <OptimisationWorld uid={id} load={side.load ?? 1} accent={group.accent} mirror={mirror} />;
        case 'PLAYBACK': return <PlaybackWorld uid={id} movie={`${uid}-movie`} look={playbackLook(side, group)} accent={group.accent} mirror={mirror} />;
        case 'APPS': return <AppsWorld uid={id} lit={appsLit(side, group)} fresh={mirror && appsLit(side, group) > appsLit(now, group)} accent={group.accent} mirror={mirror} />;
        case 'SMART_AI': return <SmartAiWorld uid={id} look={aiOf(side)} accent={group.accent} mirror={mirror} />;
        case 'ADS': return <AdsWorld uid={id} look={adsOf(side)} accent={group.accent} mirror={mirror} />;
        case 'FAMILY': return <FamilyWorld uid={id} look={familyOf(side)} accent={group.accent} mirror={mirror} />;
        default: // Trust and safety; Sharing control (#56): the homes on one password
          return side.sharing
            ? <SharingWorld uid={id} check={side.sharing.check} share={side.sharing.share} accent={group.accent} mirror={mirror} />
            : <TrustWorld uid={id} security={shieldOf(side).security} leak={shieldOf(side).leak} accent={group.accent} mirror={mirror} />;
      }
    };
    art = (
      <>
        <defs>
          <clipPath id={`${uid}-left`}><rect x="0" y="0" width={cut} height="180" /></clipPath>
          <clipPath id={`${uid}-right`}><rect x={cut} y="0" width={320 - cut} height="180" /></clipPath>
          {group.id === 'PLAYBACK' && <>
            <linearGradient id={`${uid}-movie-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1b2b6b" /><stop offset=".55" stopColor="#b0507a" /><stop offset=".72" stopColor="#ffb36b" />
            </linearGradient>
            <PictureScene id={`${uid}-movie`} />
          </>}
        </defs>
        <g clipPath={`url(#${uid}-left)`}>{scene(now, false)}</g>
        {!solo && <g clipPath={`url(#${uid}-right)`}>{scene(right, true)}</g>}
      </>
    );
  } else if (group.id === 'COLOUR') {
    art = (
      <>
        <defs>
          <clipPath id={`${uid}-left`}><rect x="0" y="0" width={cut} height="180" /></clipPath>
          <clipPath id={`${uid}-right`}><rect x={cut} y="0" width={320 - cut} height="180" /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-left)`}><ColourSky bands={colourBands(now)} /></g>
        {!solo && <g clipPath={`url(#${uid}-right)`}><ColourSky bands={colourBands(right)} /></g>}
        <ColourGround />
      </>
    );
  }

  return (
    <div className={cx(t.preview, celebrating && t.previewLit)} style={{ ['--ac' as string]: group.accent }}>
      <div ref={frame} className={cx(t.frame, !solo && t.frameSplit)} {...drag}>
        <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img"
          aria-label={solo ? `${group.name} now: ${now.label}` : `${group.name} now: ${now.label}; next: ${right.label}`}>
          {art}
        </svg>
        {!solo && (
          <span className={t.handle} style={{ left: `${split}%` }} aria-hidden="true"><i /></span>
        )}
        {zoomNote && <span className={t.zoom}>{zoomNote}</span>}
      </div>
      <div className={t.sides}>
        <span className={t.sideNow}><small>NOW</small><b>{now.label}</b></span>
        {!solo && next && <span className={t.sideNext}><small>NEXT</small><b>{next.label}</b></span>}
      </div>
    </div>
  );
};

/* ── the moment (#81; Zeesh: "need better level up animation like you know there are tech upgrade not language one"):
   a tech upgrade over the whole card, no longer Localization's climbing words (#80). The group's chip on a circuit board:
   - a tech unlocked (the big one, 4.2 s): the board's traces and the chip draw themselves, data runs in along the traces
     while it installs (ten bars fill, 0–100%), then it powers on: the chip flashes, its V1 badge pops, two rings and two
     waves of bits break out, a scan line sweeps the card, and "UNLOCKED" with its name; its first version pip lights;
   - a version reached (3.2 s): the chip is on already; energy runs in and charges the next version pip, the badge rolls
     V1 → V2, one ring and one wave of bits, the scan line, then "VERSION 2 REACHED".
   #87: it plays over the whole screen (MomentLayer), not only the card, so a card scrolled half off shows it whole. */
export type TechMoment = {
  id: StreamingTechId; group: StreamingTechGroupId; kind: 'UNLOCK' | 'VERSION'; version: number; versions: number;
  label: string; title: string; detail: string; note?: string; key: number;
};
const MOMENT_MS: Record<TechMoment['kind'], number> = { UNLOCK: 4200, VERSION: 3200 };
/** the install (or the charge) runs from INSTALL_MS to POWER_MS, when the chip powers on */
const INSTALL_MS: Record<TechMoment['kind'], number> = { UNLOCK: 400, VERSION: 200 };
const POWER_MS: Record<TechMoment['kind'], number> = { UNLOCK: 2000, VERSION: 1250 };
/** the board (560 square, centred on the 84 px chip): a bus of three traces from beyond each edge to the chip's pins,
 *  jogging at 45° as a circuit board's do, and a few short traces between pads */
const TRACES = [
  'M244 0V190L268 214V241', 'M280 0V241', 'M330 0V182L292 220V241',
  'M226 560V378L268 336V319', 'M280 560V319', 'M318 560V352L292 326V319',
  'M0 236H200L232 268H241', 'M0 280H241', 'M0 330H188L226 292H241',
  'M560 222H372L326 268H319', 'M560 280H319', 'M560 318H352L326 292H319',
];
const PADS = ['M150 150H184L204 170V196', 'M410 146V178L388 200H372', 'M156 420H196L214 438', 'M404 446V420L424 400H446'];
const VIAS: Array<[number, number]> = [[244, 190], [330, 182], [226, 378], [318, 352], [200, 236], [188, 330], [372, 222], [352, 318]];
const PAD_ENDS: Array<[number, number]> = [[150, 150], [204, 196], [410, 146], [372, 200], [156, 420], [214, 438], [404, 446], [446, 400]];
const PINS = [34, 48, 62];
const CHIP = 'M28 13H68A15 15 0 0 1 83 28V68A15 15 0 0 1 68 83H28A15 15 0 0 1 13 68V28A15 15 0 0 1 28 13Z';
const CHIP_INNER = 'M31 21H65A10 10 0 0 1 75 31V65A10 10 0 0 1 65 75H31A10 10 0 0 1 21 65V31A10 10 0 0 1 31 21Z';
const BITS: Array<[number, number]> = [[-120, -40], [-86, -70], [-34, -82], [26, -80], [84, -64], [122, -30], [116, 30], [70, 62], [-6, 72], [-72, 60], [-114, 24]];
/** 0–100% while it installs; written straight into its node each frame, so nothing re-renders */
const InstallPercent: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const node = useRef<HTMLElement>(null);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const done = Math.max(0, Math.min(1, (time - start - from) / (to - from)));
      if (node.current) node.current.textContent = `${Math.round(done * 100)}%`;
      if (done < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);
  return <b ref={node}>0%</b>;
};
const LevelUp: React.FC<{ moment: TechMoment }> = ({ moment }) => {
  const big = moment.kind === 'UNLOCK';
  const from = INSTALL_MS[moment.kind];
  const power = POWER_MS[moment.kind];
  const ms = (value: number) => `${Math.round(value)}ms`;
  /* The card can change height under the moment (a version's energy reaches the game 0.2 s in): the chip stays where it
     was first centred, and only moves up if the card shrinks so far that the words would be cut. */
  const over = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLSpanElement>(null);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const box = over.current;
    const inner = stack.current;
    if (!box || !inner) return undefined;
    const place = () => setTop(current => {
      const room = Math.max(0, box.clientHeight - inner.offsetHeight);
      return current === null ? room / 2 : Math.min(current, room);
    });
    place();
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    watch?.observe(box);
    return () => watch?.disconnect();
  }, []);
  return (
    <div ref={over} className={cx(t.levelup, big ? t.levelBig : t.levelVersion, moment.title.length > 18 && t.levelLong)} style={{ animationDuration: ms(MOMENT_MS[moment.kind]) }}
      role="status" aria-label={`${moment.label}: ${moment.title}. ${moment.detail}${moment.note ? `. ${moment.note}` : ''}`}>
      <span className={t.levelScan} aria-hidden="true" style={{ animationDelay: ms(power) }} />
      <span ref={stack} className={t.levelStack} style={top === null ? undefined : { top, transform: 'none' }}>
        <span className={t.levelCore} aria-hidden="true">
          <span className={t.levelChip}>
            {/* the board: traces draw in (an unlock), then data (energy, for a version) runs in along them */}
            <svg className={t.levelBoard} viewBox="0 0 560 560" style={{ animationDelay: ms(power) }}>
              {[...TRACES, ...PADS].map((d, index) => <path key={d} className={t.levelTrace} d={d} pathLength={100} style={{ animationDelay: ms(60 + index * 40) }} />)}
              {VIAS.map(([x, y], index) => <circle key={`${x}-${y}`} className={t.levelVia} cx={x} cy={y} r="2.6" style={{ animationDelay: ms(520 + index * 40) }} />)}
              {PAD_ENDS.map(([x, y], index) => <circle key={`${x}-${y}`} className={t.levelPad} cx={x} cy={y} r="4" style={{ animationDelay: ms(560 + index * 40) }} />)}
              {TRACES.flatMap((d, index) => [0, 1].map(round => (
                <path key={`${d}-${round}`} className={t.levelPulse} d={d} pathLength={100}
                  style={{ animationDelay: ms(from + ((index * 5) % 12) * 50 + round * (power - from) / 2) }} />
              )))}
            </svg>
            <span className={t.levelGlow} />
            <span className={t.levelFlash} style={{ animationDelay: ms(power) }} />
            <svg className={t.levelProgress} viewBox="0 0 124 124">
              <path className={t.levelTrack} d="M62 6a56 56 0 1 1 0 112a56 56 0 1 1 0-112" />
              <path className={t.levelFill} d="M62 6a56 56 0 1 1 0 112a56 56 0 1 1 0-112" pathLength={100}
                style={{ animationDuration: `${power - from}ms, 300ms`, animationDelay: `${from}ms, ${power}ms` }} />
            </svg>
            <span className={t.levelChipCore} style={{ animationDelay: ms(power) }}>
              <svg className={t.levelChipArt} viewBox="0 0 96 96">
                {PINS.map((at, index) => (
                  <g key={at} className={t.levelPin} style={{ animationDelay: ms(560 + index * 70) }}>
                    <rect x={at - 3} y="3" width="6" height="11" rx="2" /><rect x={at - 3} y="82" width="6" height="11" rx="2" />
                    <rect x="3" y={at - 3} width="11" height="6" rx="2" /><rect x="82" y={at - 3} width="11" height="6" rx="2" />
                  </g>
                ))}
                <path className={t.levelBody} d={CHIP} pathLength={1} />
                <path className={t.levelInner} d={CHIP_INNER} pathLength={1} />
              </svg>
              <span className={t.levelIcon}><GroupIcon group={moment.group} /></span>
              <span className={t.levelBadge} style={big ? { animationDelay: ms(power) } : undefined}>
                {big ? <b>V1</b> : <span className={t.levelRoll} style={{ animationDelay: ms(power) }}><b>V{moment.version - 1}</b><b>V{moment.version}</b></span>}
              </span>
            </span>
            {Array.from({ length: big ? 2 : 1 }, (_, index) => <span key={index} className={t.levelRing} style={{ animationDelay: ms(power + index * 220) }} />)}
            <span className={t.levelBits}>
              {(big ? [1, 1.65] : [1]).flatMap((reach, wave) => BITS.map(([dx, dy], index) => (
                <i key={`${wave}-${index}`} style={{ ['--dx' as string]: `${Math.round(dx * reach)}px`, ['--dy' as string]: `${Math.round(dy * reach)}px`,
                  animationDelay: ms(power + wave * 200 + (index % 3) * 40) }} />
              )))}
            </span>
          </span>
          {/* its versions: those reached lit; the new one lights as it powers on (a version charges it with energy first) */}
          <span className={t.levelPips}>
            {Array.from({ length: moment.versions }, (_, index) => {
              const pip = index + 1;
              const fresh = pip === moment.version;
              return (
                <i key={pip} className={cx(pip < moment.version && t.levelPipOn, fresh && t.levelPipNew)} style={fresh ? { animationDelay: ms(power) } : undefined}>
                  {fresh && !big && <em style={{ animationDuration: `${power - from}ms, 250ms`, animationDelay: `${from}ms, ${power}ms` }} />}
                </i>
              );
            })}
          </span>
        </span>
        <span className={t.levelText} aria-hidden="true">
          <span className={t.levelInstall} style={{ animationDelay: ms(power) }}>
            {big && <span className={t.levelSegs}>{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ animationDelay: ms(from + (index + 1) * (power - from) / 10 - 110) }} />)}</span>}
            <small>{big ? 'INSTALLING' : `UPGRADING TO V${moment.version}`}<InstallPercent from={from} to={power - 120} /></small>
          </span>
          <span className={t.levelFinal} style={{ animationDelay: ms(power + 100) }}>
            <small>{moment.label}</small>
            <b style={{ animationDelay: ms(power + 100) }}>{moment.title}</b>
            <em>{moment.detail}</em>
            {moment.note && <i>{moment.note}</i>}
          </span>
        </span>
      </span>
      <span className={t.levelSkip} aria-hidden="true">Tap to skip</span>
    </div>
  );
};
/** #87 (Zeesh: "jab hum log kisi cheez ko upgrade kar de rahe hain … aadha dikh raha hai … wo animation hamare screen mein
 *  show ho jaaye, aur wo jaise hi khatam ho jaaye phir wapas hum log back to the screen"): the moment's layer on the page's
 *  body, over the whole screen wherever the card is scrolled. Nothing under it moves: a touch is held by touch-action and a
 *  wheel scrolls nothing, so it ends where it began. A tap, or Escape, skips it. */
const MomentLayer: React.FC<{ accent: string; onSkip: () => void; children: React.ReactNode }> = ({ accent, onSkip, children }) => {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = layer.current;
    if (!node) return undefined;
    const hold = (event: WheelEvent) => event.preventDefault();
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onSkip(); };
    node.addEventListener('wheel', hold, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      node.removeEventListener('wheel', hold);
      window.removeEventListener('keydown', key);
    };
  }, [onSkip]);
  return createPortal(
    <div ref={layer} className={cx(t.tech, t.momentLayer)} style={{ ['--ac' as string]: accent }} onClick={onSkip}>
      {children}
    </div>,
    document.body,
  );
};

/** #88 (Zeesh: "tech debt wale mein … i button ke jaise click kare to bata de ki tech debt kya hai, kyon hai aur kaise kya
 *  hatta hai"): what it is, where it comes from, what it costs now and how it goes down. The costs are the engine's own:
 *  the bandwidth bill × (1 + debt / 200) (streamingDeliveryLoad), playback success − 0.035 a point (streamingWeeklyLoop)
 *  and the week's incident risk + debt / 150 (streamingCrisisRisk); audit:streaming-tech-debt-info checks they still are. */
const TECH_DEBT_COSTS = { billPerPoint: 1 / 200, playbackPerPoint: .035, riskPerPoint: 1 / 150 } as const;
const DebtInfo: React.FC<{ id: string; tone: string; debt: number; paydown: number; bill: number; onStabilization: () => void }> = ({
  id, tone, debt, paydown, bill, onStabilization,
}) => {
  const points = Math.max(0, debt);
  const billShare = points * TECH_DEBT_COSTS.billPerPoint;
  /* the week's bill already carries the debt, so its debt part is bill × share / (1 + share) */
  const billExtra = bill > 0 ? bill * billShare / (1 + billShare) : 0;
  const playback = points * TECH_DEBT_COSTS.playbackPerPoint;
  const risk = points * TECH_DEBT_COSTS.riskPerPoint * 100;
  const weeks = paydown > 0 ? Math.ceil(points / paydown) : 0;
  return (
    <div id={id} className={cx(t.debtPanel, tone)} role="region" aria-label="About tech debt">
      <section>
        <span className={t.eyebrow}>WHAT IT IS</span>
        <p>Shortcuts your engineers take to ship better tech fast. Everything works, but the service stays fragile until the shortcuts are cleaned up.</p>
      </section>
      <section>
        <span className={t.eyebrow}>WHERE IT COMES FROM</span>
        <p>Unlocking and raising tech adds it, Picture, HDR, Colour and Sound the most; each step shows how much, as “+3&nbsp;tech&nbsp;debt”. Old campus builds and companies you bought left some too.</p>
      </section>
      <section>
        <span className={t.eyebrow}>WHAT IT COSTS YOU NOW · {Math.round(points)}</span>
        {points > 0 ? (
          <ul className={t.debtCosts}>
            <li>
              <b>+{Math.round(billShare * 100)}%</b>
              <span>Bandwidth bill{billExtra >= 1000 && <small>about {money(billExtra)} more a week</small>}</span>
            </li>
            <li>
              <b>−{+playback.toFixed(1)}</b>
              <span>Playback success<small>more plays stall or fail, and more viewers leave</small></span>
            </li>
            <li>
              <b>+{Math.round(risk)}</b>
              <span>Incident risk<small>incidents come sooner and hit harder</small></span>
            </li>
          </ul>
        ) : <p>Nothing: the service runs clean.</p>}
      </section>
      <section>
        <span className={t.eyebrow}>HOW IT GOES DOWN</span>
        <p>
          {paydown <= 0 ? <>Nothing pays it down yet. Unlock Stabilization to pay some off every week.</>
            : points <= 0 ? <>Stabilization pays up to <b>{fmtRate(paydown)} a week</b>, so new debt is paid off as it comes. Raise Stabilization to pay more.</>
              : <>Stabilization pays <b>{fmtRate(paydown)} a week</b>, so it is gone in about {weeks} week{weeks === 1 ? '' : 's'} if you add no more. Raise Stabilization to pay faster.</>}
        </p>
        <button type="button" className={t.debtGo} onClick={onStabilization}>Open Stabilization <i aria-hidden="true">›</i></button>
      </section>
    </div>
  );
};

/* What the move does besides the picture: load and cost cut, debt paid down, or debt added. */
const EffectFacts: React.FC<{ step: StreamingTechDeskStep; deliveryCost?: number }> = ({ step, deliveryCost = 0 }) => (
  <>
    {step.effect?.kind === 'LOAD' && step.effect.now > 0 && (
      <li className={t.feeds}>
        −{pct(step.effect.next / step.effect.now)} load per viewer
        {Math.abs(step.effect.costNext / step.effect.costNow - step.effect.next / step.effect.now) > .004 ? ` · −${pct(step.effect.costNext / step.effect.costNow)} cost` : ' and cost'}
      </li>
    )}
    {/* what that is in money, from last week's bandwidth bill */}
    {step.effect?.kind === 'LOAD' && step.effect.costNow > 0 && deliveryCost * (1 - step.effect.costNext / step.effect.costNow) >= 1_000 && (
      <li className={t.feeds}>Saves about {money(deliveryCost * (1 - step.effect.costNext / step.effect.costNow))} a week</li>
    )}
    {step.effect?.kind === 'PAYDOWN' && (
      <li className={t.feeds}>Pays {fmtRate(step.effect.next)} debt a week (now {fmtRate(step.effect.now)})</li>
    )}
    {step.effect?.kind === 'PLAYBACK' && step.effect.next > step.effect.now && (
      <li className={t.feeds}>
        Playback success +{(step.effect.next - step.effect.now).toFixed(2)} points{step.effect.now > 0 ? ` (Playback adds +${step.effect.now.toFixed(2)} now)` : ''}
      </li>
    )}
    {step.effect?.kind === 'SECURITY' && step.effect.next > step.effect.now && (
      <li className={t.feeds}>Security {step.effect.now} → {step.effect.next}</li>
    )}
    {step.effect?.kind === 'PRODUCT' && step.effect.next > step.effect.now && (
      <li className={t.feeds}>Product Experience {step.effect.now} → {step.effect.next}</li>
    )}
    {step.effect?.kind === 'FAMILY' && step.effect.next.product > step.effect.now.product && (
      <li className={t.feeds}>Product Experience {step.effect.now.product} → {step.effect.next.product}</li>
    )}
    {step.effect?.kind === 'ADS' && step.effect.next.commerce > step.effect.now.commerce && (
      <li className={t.feeds}>Commerce {step.effect.now.commerce} → {step.effect.next.commerce}: a bigger share of each market's ad money, at a better rate</li>
    )}
    {/* what the move does for viewers (#53): churn, habit streamers, homes that can watch */}
    {step.more.map(line => <li key={line} className={t.feeds}>{line}</li>)}
    {/* what it puts at risk (#59): a backlash when Recommendations outrun Security */}
    {step.risks.map(line => <li key={line} className={t.debtFact}>{line}</li>)}
    {step.debtNext > 0 && <li className={t.debtFact}>+{step.debtNext} tech debt</li>}
  </>
);

/** The tiles in three sections of four, a line over each (#83; Zeesh: "thoda sa categorize … bas single ek line … jaise video quality"). */
const TILE_SECTIONS: Array<{ name: string; groups: StreamingTechGroupId[] }> = [
  { name: 'Picture & sound', groups: ['PICTURE', 'HDR', 'COLOUR', 'SOUND'] },
  { name: 'Streaming', groups: ['OPTIMISATION', 'STABILIZATION', 'PLAYBACK', 'APPS'] },
  { name: 'Viewers & money', groups: ['TRUST', 'SMART_AI', 'FAMILY', 'ADS'] },
];

/** Optimisation, Stabilization, Apps, Trust and safety, Smart AI and Ads tech: a main step below the best one owned. It keeps a
 *  job (#85) and its versions still add a little, but the picture shows the group's best. */
const superseded = (group: StreamingTechDeskGroup, step: StreamingTechDeskStep): boolean => (
  (group.id === 'OPTIMISATION' || group.id === 'STABILIZATION' || group.id === 'APPS' || group.id === 'TRUST' || group.id === 'SMART_AI' || group.id === 'ADS')
  && step.state === 'OWNED' && !step.sideLine && Boolean(group.best) && group.best?.id !== step.id
);

/* ── one step's action ── */
const StepAction: React.FC<{
  group: StreamingTechDeskGroup;
  step: StreamingTechDeskStep;
  founded: boolean;
  pending: number;
  energyLeft: number;
  energy: StreamingTechDeskView['energy'];
  unlocking: boolean;
  onUnlock: (step: StreamingTechDeskStep) => void;
  onAdd: (step: StreamingTechDeskStep, amount: number | 'FILL') => boolean;
  /** #84: paying a full bar's price */
  completing: boolean;
  onComplete: (step: StreamingTechDeskStep) => void;
  onGoTo: (id: StreamingTechId) => void;
  /** last week's bandwidth bill, for what an Optimisation move saves */
  deliveryCost: number;
}> = ({ group, step, founded, pending, energyLeft, energy, unlocking, onUnlock, onAdd, completing, onComplete, onGoTo, deliveryCost }) => {
  const latest = useRef({ step, onAdd, energyStep: energy.step });
  latest.current = { step, onAdd, energyStep: energy.step };
  const repeat = useRef<{ delay: number | null; tick: number | null; release: (() => void) | null }>({ delay: null, tick: null, release: null });
  const stop = useCallback(() => {
    const { delay, tick, release } = repeat.current;
    repeat.current = { delay: null, tick: null, release: null };
    if (delay) window.clearTimeout(delay);
    if (tick) window.clearInterval(tick);
    release?.();
  }, []);
  useEffect(() => stop, [step.id, stop]);

  /* #109 (plan §18.5): what the step unlocks at launch and in the brand, "the Marquee front page and …" */
  const unlocks = streamingTechUnlocks(step.id);
  const unlocksLine = unlocks.length ? `Unlocks ${unlocks.length > 1 ? `${unlocks.slice(0, -1).join(', ')} and ${unlocks.at(-1)}` : unlocks[0]}` : null;

  if (step.state === 'LOCKED') {
    return (
      <div className={t.action}>
        <p className={t.actionTitle}><b>{step.name}</b>{step.futuristic && <i className={t.future}>✦ FUTURE</i>}{step.streamingPlus && <StreamingPlusChip />}</p>
        <p className={t.actionLine}>{step.detail}.</p>
        {unlocksLine && <p className={t.actionLine}>{unlocksLine}.</p>}
        <p className={t.needs}>Needs {step.needs.join(' and ')} first.</p>
        {step.needIds[0] && <button type="button" className={t.secondary} onClick={() => onGoTo(step.needIds[0])}>Go to {step.needs[0]}</button>}
      </div>
    );
  }

  if (step.state === 'OPEN') {
    return (
      <div className={t.action}>
        <p className={t.actionTitle}><b>Unlock {step.name}</b>{step.futuristic && <i className={t.future}>✦ FUTURE</i>}{step.streamingPlus && <StreamingPlusChip />}</p>
        <p className={t.actionLine}>{step.detail}.</p>
        <ul className={t.facts}>
          <li>Arrives at version 1 · {step.versionNames[0]}</li>
          <li>{money(step.weeklyUpkeep)} a week to run</li>
          {step.feeds.length > 0 && <li className={t.feeds}>Plans: {step.feeds.join(', ')}</li>}
          {unlocksLine && <li className={t.feeds}>{unlocksLine}</li>}
          <EffectFacts step={step} deliveryCost={deliveryCost} />
        </ul>
        {step.streamingPlus ? (
          <button type="button" className={t.primary}
            onClick={() => openStreamingPlusSheet({ source: 'tech-step', focus: 'tech', line: `${step.name} is one of the Streaming+ Pack's 10 future Tech steps.` })}>
            <span>Unlock {step.name} with Streaming+</span>
            <small>With the pack it costs {money(step.unlockCost)} once from the treasury</small>
          </button>
        ) : (
        <button type="button" className={cx(t.primary, unlocking && t.busy)} disabled={!founded || !step.affordable || unlocking}
          onClick={() => onUnlock(step)}>
          <span>{unlocking ? `Unlocking ${step.name}…` : !founded ? 'Found your platform first' : step.affordable ? `Unlock ${step.name}` : `Needs ${money(step.unlockCost)} in the treasury`}</span>
          <small>{money(step.unlockCost)} once from the treasury</small>
        </button>
        )}
      </div>
    );
  }

  /* #85: a step below the best one owned keeps a job, so it is raised like any other (its facts say what it adds) */
  /* owned: raise its version with energy */
  const needed = step.nextEnergy;
  if (needed === null || !step.nextVersion) {
    return (
      <div className={cx(t.action, t.actionDone)}>
        <p className={t.actionTitle}><b>{step.name} · {step.versionName}</b></p>
        <p className={t.actionLine}>Version 3 reached. {step.name} is as good as it gets here.</p>
      </div>
    );
  }
  const contributed = Math.min(needed, step.progress + pending);
  const remaining = needed - contributed;
  const nextStep = Math.min(energy.step, remaining);
  const canStep = remaining > 0 && energyLeft >= nextStep;
  const fill = Math.min(remaining, energyLeft);
  /* a segment a press, up to 24; a version that needs more (#72) shows 24 bigger segments */
  const segments = Math.max(1, Math.min(24, Math.round(needed / energy.step)));
  const perSegment = needed / segments;
  const press = (): boolean => {
    const now = latest.current;
    return now.onAdd(now.step, now.energyStep);
  };
  const start = () => {
    stop();
    if (!press()) return;
    const onHidden = () => { if (document.visibilityState !== 'visible') stop(); };
    window.addEventListener('pointerup', stop, true);
    window.addEventListener('pointercancel', stop, true);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', onHidden);
    repeat.current.release = () => {
      window.removeEventListener('pointerup', stop, true);
      window.removeEventListener('pointercancel', stop, true);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', onHidden);
    };
    repeat.current.delay = window.setTimeout(() => {
      repeat.current.delay = null;
      repeat.current.tick = window.setInterval(() => { if (!press()) stop(); }, 130);
    }, 380);
  };
  /* #84: the energy is full, and the version waits for its price (Zeesh: "pay 126 million to complete this level"): it is
     reached only when it is paid, never on energy alone, and only with that much in the treasury */
  if (remaining <= 0 && step.nextCost > 0) {
    return (
      <div className={t.action}>
        <p className={t.actionTitle}><b>{step.name} · version {step.nextVersion}</b><i className={t.vname}>{step.nextVersionName}</i></p>
        <p className={t.actionLine}>Energy full: {needed}<Bolt className={t.boltInline} /> in. Pay its price to complete version {step.nextVersion}.</p>
        {(step.effect || step.debtNext > 0 || step.more.length > 0 || step.risks.length > 0) && <ul className={t.facts}><EffectFacts step={step} deliveryCost={deliveryCost} /></ul>}
        <span className={t.segments} aria-hidden="true">{Array.from({ length: segments }, (_, index) => <i key={index} className={t.segOn} />)}</span>
        <button type="button" className={cx(t.primary, completing && t.busy)} disabled={!step.nextAffordable || completing} onClick={() => onComplete(step)}>
          <span>{completing ? `Completing version ${step.nextVersion}…` : step.nextAffordable
            ? `Pay ${money(step.nextCost)} to complete version ${step.nextVersion}` : `Needs ${money(step.nextCost)} in the treasury`}</span>
          <small>{step.nextAffordable ? `${money(step.nextCost)} once from the treasury` : `Its energy stays in until the treasury can pay`}</small>
        </button>
      </div>
    );
  }
  if (remaining <= 0) {
    return (
      <div className={cx(t.action, t.actionDone)}>
        <p className={t.actionTitle}><b>{step.name} · {step.nextVersionName}</b></p>
        <p className={t.actionLine}>Version {step.nextVersion} reached. Viewers see it from next week.</p>
      </div>
    );
  }
  return (
    <div className={t.action}>
      <p className={t.actionTitle}><b>{step.name} · version {step.nextVersion}</b><i className={t.vname}>{step.nextVersionName}</i></p>
      <p className={t.actionLine}>{VERSION_MEANING[group.id]}</p>
      {(step.effect || step.debtNext > 0 || step.more.length > 0 || step.risks.length > 0) && <ul className={t.facts}><EffectFacts step={step} deliveryCost={deliveryCost} /></ul>}
      <div className={t.energyRow}>
        <span className={t.energyCount}><b>{contributed}</b> / {needed}<Bolt className={t.boltInline} />
          {step.nextCost > 0 && <em className={cx(t.versionCost, !step.nextAffordable && t.versionCostShort)}>+ {money(step.nextCost)}</em>}
        </span>
        <div className={t.energyButtons}>
          <button type="button" className={t.plus} disabled={!canStep}
            aria-label={`Add ${nextStep || energy.step} energy to ${step.name} version ${step.nextVersion}`}
            onPointerDown={event => { if (event.button === 0 || event.pointerType !== 'mouse') start(); }}
            onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onAdd(step, energy.step); } }}
            onContextMenu={event => event.preventDefault()}>
            +{nextStep || energy.step}<Bolt className={t.boltBtn} />
          </button>
          {remaining > energy.step && (
            <button type="button" className={t.fill} disabled={fill <= 0} onClick={() => onAdd(step, 'FILL')}
              aria-label={`Fill ${step.name} version ${step.nextVersion} with ${fill} energy`}>
              Fill · {fill}<Bolt className={t.boltInline} />
            </button>
          )}
        </div>
      </div>
      <span className={t.segments} aria-hidden="true">
        {Array.from({ length: segments }, (_, index) => {
          const on = contributed >= Math.min(needed, (index + 1) * perSegment);
          const fresh = on && step.progress < Math.min(needed, (index + 1) * perSegment);
          return <i key={index} className={cx(on && t.segOn, fresh && t.segFresh)} />;
        })}
      </span>
      {step.nextCost > 0 && (
        <p className={step.nextAffordable ? t.paidAt : t.needsMoney}>
          Fill its energy, then pay {money(step.nextCost)} to complete version {step.nextVersion}.{step.nextAffordable ? '' : ' The treasury cannot cover it yet.'}
        </p>
      )}
      {energyLeft < nextStep && <p className={t.noEnergy}>Out of energy for now. It refills next week, or get more in the Store.</p>}
    </div>
  );
};

/* ── the ladder ── */
const Ladder: React.FC<{
  group: StreamingTechDeskGroup;
  focus: StreamingTechId;
  shownVersion: (step: StreamingTechDeskStep) => number;
  onFocus: (id: StreamingTechId) => void;
}> = ({ group, focus, shownVersion, onFocus }) => {
  const row = (step: StreamingTechDeskStep) => {
    const version = shownVersion(step);
    const sub = step.state === 'OWNED'
      ? `${step.versionNames[version - 1]} · version ${version} of 3`
      : step.state === 'OPEN'
        ? step.streamingPlus ? `Streaming+ · ${money(step.unlockCost)}` : `${money(step.unlockCost)} · ${money(step.weeklyUpkeep)} a week`
        : `Needs ${step.needs.join(' and ')}`;
    return (
      <li key={step.id}>
        <button type="button" className={cx(t.rung, t[`rung${step.state}`], focus === step.id && t.rungOn)} onClick={() => onFocus(step.id)}
          aria-current={focus === step.id ? 'true' : undefined}
          aria-label={`${step.name}: ${step.state === 'OWNED' ? `version ${version}, ${step.versionNames[version - 1]}` : step.state === 'OPEN' ? `can be unlocked for ${money(step.unlockCost)}` : sub}`}>
          <span className={t.node}>{step.state === 'OWNED' ? '✓' : step.state === 'LOCKED' ? (
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5.4a3 3 0 0 1 6 0V7" /><rect x="3.5" y="7" width="9" height="6.5" rx="1.8" /></svg>
          ) : ''}</span>
          <span className={t.rungText}>
            <b>{step.name}{step.futuristic && <i className={t.future}>✦</i>}</b>
            <small>{sub}</small>
          </span>
          {step.state === 'OWNED'
            ? <span className={t.pips} aria-hidden="true">{[1, 2, 3].map(pip => <i key={pip} className={pip <= version ? t.pipOn : ''} />)}</span>
            : step.streamingPlus ? <StreamingPlusChip /> : step.state === 'OPEN' ? <span className={t.openTag}>UNLOCK</span> : null}
        </button>
      </li>
    );
  };
  const main = group.steps.filter(step => !step.sideLine);
  const side = group.steps.filter(step => step.sideLine);
  return (
    <div className={t.ladder} style={{ ['--ac' as string]: group.accent }}>
      <ol className={t.rungs}>{main.map(row)}</ol>
      {side.length > 0 && (
        <>
          <p className={t.sideHead}>ALSO IN {group.name.toUpperCase()}</p>
          <ol className={cx(t.rungs, t.rungsSide)}>{side.map(row)}</ol>
        </>
      )}
    </div>
  );
};

/** the box the tab scrolls in (the Platform room's page) */
const scrollBox = (node: HTMLElement | null): HTMLElement | null => {
  for (let parent = node?.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return null;
};

/* ── the tab ── */
export const TechDesk: React.FC<{
  desk: StreamingTechDeskView;
  /** open on this tech (a locked plan step's Go to Tech), else on the first group with a step to unlock */
  focusTechId?: StreamingTechId | null;
} & TechDeskActions> = ({ desk, onUnlock, onContribute, onCompleteVersion, focusTechId = null }) => {
  const focusGroup = useMemo(() => (focusTechId ? desk.groups.find(group => group.steps.some(step => step.id === focusTechId))?.id ?? null : null), []); // eslint-disable-line react-hooks/exhaustive-deps
  const firstGroup = useMemo(() => focusGroup ?? (desk.groups.find(group => group.steps.some(step => step.state === 'OPEN')) || desk.groups[0]).id, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [groupId, setGroupId] = useState<StreamingTechGroupId>(firstGroup);
  /* #78: the tiles, or one group opened in their place (Zeesh: "if i click picture then i have to scroll down
     to see details related to it"); Go to Tech opens straight on its group */
  const [opened, setOpened] = useState(Boolean(focusGroup));
  /** the group last opened: its tile keeps a ring when the tiles come back */
  const [visited, setVisited] = useState<StreamingTechGroupId | null>(focusGroup);
  const sectionRef = useRef<HTMLElement>(null);
  const tileRefs = useRef<Partial<Record<StreamingTechGroupId, HTMLButtonElement | null>>>({});
  /** where to look after the next paint: the opened group's top, or the tile just left */
  const reveal = useRef<'GROUP' | StreamingTechGroupId | null>(null);
  const [focusByGroup, setFocusByGroup] = useState<Partial<Record<StreamingTechGroupId, StreamingTechId>>>(
    () => (focusGroup && focusTechId ? { [focusGroup]: focusTechId } : {}),
  );
  const [pending, setPending] = useState<Partial<Record<StreamingTechId, number>>>({});
  const [moment, setMoment] = useState<TechMoment | null>(null);
  /* #88: Tech debt's ⓘ, open or closed */
  const [debtInfo, setDebtInfo] = useState(false);
  const debtInfoId = useId();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [unlocking, setUnlocking] = useState<StreamingTechId | null>(null);
  const unlockTimer = useRef<{ timer: number; run: () => void } | null>(null);
  const [completing, setCompleting] = useState<StreamingTechId | null>(null);
  const completeTimer = useRef<{ timer: number; run: () => void } | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const contributeRef = useRef(onContribute);
  contributeRef.current = onContribute;
  const timers = useRef<Partial<Record<StreamingTechId, number>>>({});
  const pendingTotal = (Object.values(pending) as Array<number | undefined>).reduce<number>((sum, value) => sum + (value || 0), 0);
  const energyLeft = Math.max(0, desk.energy.available - pendingTotal);
  const energyLeftRef = useRef(energyLeft);
  energyLeftRef.current = energyLeft;

  const group = desk.groups.find(item => item.id === groupId) || desk.groups[0];
  const focusId = focusByGroup[group.id] && group.steps.some(step => step.id === focusByGroup[group.id]) ? focusByGroup[group.id]! : group.focus;
  const step = group.steps.find(item => item.id === focusId) || group.steps[0];

  /* a version whose energy is all pressed in shows as reached before the game has heard of it */
  /* the version the game has reached: a full bar waits for its price (#84), so energy alone shows no new version */
  const shownVersion = useCallback((item: StreamingTechDeskStep): number => (item.state === 'OWNED' ? item.version : 0), []);

  const commit = useCallback((id: StreamingTechId) => {
    const amount = pendingRef.current[id];
    if (timers.current[id]) { window.clearTimeout(timers.current[id]); delete timers.current[id]; }
    if (!amount) return;
    // Taken off the pending list before the game hears of it, so it can never be handed over twice.
    pendingRef.current = { ...pendingRef.current };
    delete pendingRef.current[id];
    setPending(current => { const next = { ...current }; delete next[id]; return next; });
    const result = contributeRef.current?.(id, amount);
    if (!result) return;
    if (!result.ok || result.completed) setFeedback(result);
  }, []);

  // Hand anything still pending to the game when the tab closes.
  useEffect(() => () => {
    if (unlockTimer.current) { window.clearTimeout(unlockTimer.current.timer); unlockTimer.current.run(); }
    if (completeTimer.current) { window.clearTimeout(completeTimer.current.timer); completeTimer.current.run(); }
    (Object.keys(timers.current) as StreamingTechId[]).forEach(id => window.clearTimeout(timers.current[id]));
    (Object.keys(pendingRef.current) as StreamingTechId[]).forEach(id => {
      const amount = pendingRef.current[id] || 0;
      if (amount) contributeRef.current?.(id, amount);
    });
  }, []);
  useEffect(() => {
    if (!moment) return;
    const timer = window.setTimeout(() => setMoment(null), MOMENT_MS[moment.kind]);
    return () => window.clearTimeout(timer);
  }, [moment]);
  const skipMoment = useCallback(() => setMoment(null), []);

  /** A press shows at once; the game hears about it a moment later, in one go. */
  const add = useCallback((item: StreamingTechDeskStep, amount: number | 'FILL'): boolean => {
    if (item.state !== 'OWNED' || item.nextEnergy === null || !item.nextVersion) return false;
    const already = pendingRef.current[item.id] || 0;
    const remaining = item.nextEnergy - item.progress - already;
    if (remaining <= 0) return false;
    const available = energyLeftRef.current;
    const want = amount === 'FILL' ? remaining : Math.min(amount, remaining);
    const put = Math.min(want, available);
    if (put <= 0 || (amount !== 'FILL' && put < want)) {
      setFeedback({ ok: false, message: 'Out of energy for now. It refills next week, or get more in the Store.' });
      return false;
    }
    const total = already + put;
    pendingRef.current = { ...pendingRef.current, [item.id]: total };
    energyLeftRef.current = available - put;
    setPending(current => ({ ...current, [item.id]: total }));
    setFeedback(null);
    // full: the bar shows "Pay … to complete" (#84); the version and its moment come with the payment
    const full = total >= item.nextEnergy - item.progress;
    if (timers.current[item.id]) window.clearTimeout(timers.current[item.id]);
    // Full: let the filled step paint, then hand it over. Otherwise wait for the next press.
    timers.current[item.id] = window.setTimeout(() => commit(item.id), full ? 180 : 650);
    return !full;
  }, [commit]);

  /** Unlock shows at once; the game unlocks a moment later, after the press has painted. */
  const unlock = (item: StreamingTechDeskStep) => {
    if (unlockTimer.current) return;
    // Stay on the new tech once it is unlocked: its next move is its version 2.
    setFocusByGroup(current => ({ ...current, [item.group]: item.id }));
    setUnlocking(item.id);
    setFeedback(null);
    const run = () => {
      unlockTimer.current = null;
      const result = onUnlock?.(item.id);
      setUnlocking(null);
      if (!result) return;
      if (result.ok) {
        setMoment({ id: item.id, group: item.group, kind: 'UNLOCK', version: 1, versions: item.versionNames.length, label: 'Unlocked', title: item.name,
          detail: `Version 1 · ${item.versionNames[0]}`, note: 'Viewers see it from next week.', key: Date.now() });
      }
      setFeedback(result);
    };
    unlockTimer.current = { timer: window.setTimeout(run, 90), run };
  };

  /** Pay to complete a version (#84): shows at once; the game is told a moment later, any energy still pending first. */
  const complete = (item: StreamingTechDeskStep) => {
    if (completeTimer.current || !item.nextVersion) return;
    setCompleting(item.id);
    setFeedback(null);
    const run = () => {
      completeTimer.current = null;
      commit(item.id);
      const result = onCompleteVersion?.(item.id);
      setCompleting(null);
      if (!result) return;
      if (result.ok && item.nextVersion) {
        setMoment({ id: item.id, group: item.group, kind: 'VERSION', version: item.nextVersion, versions: item.versionNames.length,
          label: `Version ${item.nextVersion} reached`, title: `${item.name} · ${item.nextVersionName}`, detail: 'Viewers see it from next week.', key: Date.now() });
      }
      setFeedback(result);
    };
    completeTimer.current = { timer: window.setTimeout(run, 90), run };
  };

  const focus = (id: StreamingTechId, inGroup: StreamingTechGroupId = group.id) => {
    setGroupId(inGroup);
    setFocusByGroup(current => ({ ...current, [inGroup]: id }));
  };
  const openGroup = (id: StreamingTechGroupId) => {
    if (!opened || id !== group.id) reveal.current = 'GROUP';
    setGroupId(id);
    setVisited(id);
    setOpened(true);
    setFeedback(null);
  };
  const backToTiles = () => {
    reveal.current = group.id;
    setOpened(false);
    setFeedback(null);
  };
  /** Opens a step wherever it is (a need can sit in another group). */
  const goTo = (id: StreamingTechId) => {
    const owner = desk.groups.find(item => item.steps.some(row => row.id === id));
    if (owner) {
      if (!opened || owner.id !== group.id) reveal.current = 'GROUP';
      focus(id, owner.id);
      setVisited(owner.id);
      setOpened(true);
    }
    setFeedback(null);
  };
  /* the opened group starts at the top of the page; back on the tiles, the one just left is in view */
  useLayoutEffect(() => {
    const want = reveal.current;
    reveal.current = null;
    if (!want) return;
    if (want !== 'GROUP') { tileRefs.current[want]?.scrollIntoView?.({ block: 'nearest' }); return; }
    const box = scrollBox(sectionRef.current);
    if (!box || !sectionRef.current) return;
    const above = sectionRef.current.getBoundingClientRect().top - box.getBoundingClientRect().top;
    if (above < 0) box.scrollTop += above;
  }, [opened, groupId]);
  const openFeature = (feature: StreamingTechDeskFeature) => {
    if (feature.needsStep) goTo(feature.needsStep);
  };

  /* the pair the picture compares */
  const sideOf = (item: StreamingTechDeskStep | null, version: number, dialogue = 0): Side => ({
    step: item,
    version,
    label: item ? `${item.name} · ${item.versionNames[Math.max(0, version - 1)]}` : group.id === 'HDR' ? 'No HDR' : group.id === 'PLAYBACK' ? 'Standard player'
      : group.id === 'FAMILY' ? 'One profile, one screen' : 'Off',
    dialogue,
  });
  const dialogueStep = group.id === 'SOUND' ? group.steps.find(item => item.sideLine) || null : null;
  const dialogueNow = dialogueStep ? shownVersion(dialogueStep) : 0;
  const best = group.best;
  const bestVersion = best ? shownVersion(best) : 0;
  const celebrating = Boolean(moment && group.steps.some(item => item.id === moment.id));
  let now: Side;
  let next: Side | null;
  if (step.id === 'SOUND_CLEAR_DIALOGUE') {
    const version = shownVersion(step);
    now = { ...sideOf(best, bestVersion, version), label: version ? `Clear dialogue · ${group.versionNames[version - 1]}` : 'Dialogue as mixed' };
    next = step.state === 'OWNED' && version >= 3 ? null : { ...sideOf(best, bestVersion, version + 1), label: `Clear dialogue · ${group.versionNames[version]}` };
  } else if (superseded(group, step) && best) {
    /* only the best step counts: show it, with nothing to compare */
    now = sideOf(best, bestVersion);
    next = null;
  } else if (step.state === 'OWNED') {
    const version = shownVersion(step);
    now = sideOf(step, version, dialogueNow);
    next = version >= 3 ? null : sideOf(step, version + 1, dialogueNow);
  } else {
    now = sideOf(best, bestVersion, dialogueNow);
    next = sideOf(step, 1, dialogueNow);
  }
  /* Optimisation and Stabilization compare what the whole tree does now and after this move */
  if (step.effect?.kind === 'LOAD') {
    now = { ...now, load: step.effect.now };
    next = next && { ...next, load: step.effect.next };
  } else if (group.id === 'OPTIMISATION') {
    now = { ...now, load: desk.loadFactor };
  }
  if (step.effect?.kind === 'PAYDOWN') {
    now = { ...now, paydown: step.effect.now, debt: desk.debt };
    next = next && { ...next, paydown: step.effect.next, debt: desk.debt };
  } else if (group.id === 'STABILIZATION') {
    now = { ...now, paydown: desk.debtPaydown, debt: desk.debt };
  }
  /* Trust and safety compares the Security level and the leak risk now and after this move (#54);
     Sharing control (#56) the homes on one password, from the sharing step owned before this one */
  /* Smart AI (#59): the home screen now and after this move */
  if (step.effect?.kind === 'AI') {
    now = { ...now, ai: step.effect.now };
    next = next && { ...next, ai: step.effect.next };
  }
  /* Ads tech (#61): an ad break now and after this move */
  if (step.effect?.kind === 'ADS') {
    now = { ...now, ads: step.effect.now };
    next = next && { ...next, ads: step.effect.next };
  }
  /* Profiles and family (#60): the "Who's watching?" screen now and after this move */
  if (step.effect?.kind === 'FAMILY') {
    now = { ...now, family: step.effect.now };
    next = next && { ...next, family: step.effect.next };
  }
  if (step.effect?.kind === 'SHARING') {
    const before = step.state === 'OWNED' ? null
      : group.steps.filter(item => item.effect?.kind === 'SHARING' && item.state === 'OWNED').at(-1) ?? null;
    now = {
      ...(step.state === 'OWNED' ? now : sideOf(before, before ? shownVersion(before) : 0)),
      ...(step.state === 'OWNED' || before ? {} : { label: 'Passwords shared freely' }),
      sharing: step.effect.now,
    };
    next = next && { ...next, sharing: step.effect.next };
  } else if (step.effect?.kind === 'SECURITY') {
    now = { ...now, shield: { security: step.effect.now, leak: step.effect.leakNow } };
    next = next && { ...next, shield: { security: step.effect.next, leak: step.effect.leakNext } };
  } else if (group.id === 'TRUST') {
    now = { ...now, shield: { security: desk.securityLevel, leak: desk.leakFactor } };
    next = next && { ...next, shield: { security: desk.securityLevel, leak: desk.leakFactor } };
  }
  const live = desk.features.filter(feature => feature.allowed).length;
  /* the tiles' sections, in the desk's order; a group no section names goes in a last one */
  const sections = [
    ...TILE_SECTIONS.map(section => ({ name: section.name, items: desk.groups.filter(item => section.groups.includes(item.id)) })),
    { name: 'More', items: desk.groups.filter(item => !TILE_SECTIONS.some(section => section.groups.includes(item.id))) },
  ].filter(section => section.items.length > 0);
  const debtTone = desk.debt >= 50 ? t.debtBad : desk.debt >= 20 ? t.debtWarn : t.debtOk;
  const openStabilization = () => goTo(desk.groups.find(item => item.id === 'STABILIZATION')?.focus ?? 'STAB_MONITORING');

  if (!opened) return (
    <section ref={sectionRef} className={t.tech}>
      <div className={t.head}>
        <h2>Tech</h2>
        <span>{desk.owned} of {desk.total} unlocked{desk.weeklyUpkeep > 0 ? ` · ${money(desk.weeklyUpkeep)} a week` : ''}</span>
      </div>
      {/* pushing quality up adds tech debt; Stabilization pays it down every week. Its ⓘ says what it is, what it costs
          now and how it goes down (#88). */}
      <div className={cx(t.debtRow, debtTone)}>
        <button type="button" className={cx(t.debt, debtTone)} onClick={openStabilization}
          aria-label={`Tech debt ${Math.round(desk.debt)} of 100. Stabilization pays ${desk.debtPaydown} a week. Open Stabilization`}>
          <span>TECH DEBT</span>
          <b>{Math.round(desk.debt)}</b>
          <i><em style={{ width: `${Math.min(100, desk.debt)}%` }} /></i>
          <small>−{fmtRate(desk.debtPaydown)} a week</small>
        </button>
        <button type="button" className={cx(t.debtInfo, debtInfo && t.debtInfoOn)} aria-expanded={debtInfo} aria-controls={debtInfoId}
          aria-label="What is tech debt?" onClick={() => setDebtInfo(open => !open)}>
          <svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.4" /><path d="M9 8.2v4.7" /><circle className={t.dot} cx="9" cy="5.7" r="1" /></svg>
        </button>
      </div>
      {debtInfo && (
        <DebtInfo id={debtInfoId} tone={debtTone} debt={desk.debt} paydown={desk.debtPaydown} bill={desk.deliveryCost}
          onStabilization={() => { setDebtInfo(false); openStabilization(); }} />
      )}

      {/* 1 · what the plans can offer because of it */}
      <div className={t.offer} role="group" aria-label={`Your plans can offer ${live} of ${desk.features.length} tech features`}>
        <span className={t.eyebrow}>YOUR PLANS CAN OFFER</span>
        <div className={t.chips}>
          {desk.features.map(feature => feature.allowed ? (
            <span key={feature.id} className={cx(t.chip, t.chipOn)}>
              <b>✓</b>
              <span>{feature.name}</span>
              {feature.quality > 1 && <small>×{feature.quality} appeal</small>}
            </span>
          ) : (
            <button key={feature.id} type="button" className={cx(t.chip, t.chipOff)} onClick={() => openFeature(feature)}
              aria-label={`${feature.name}: unlock ${feature.needs} in Tech`}>
              <b><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5.4a3 3 0 0 1 6 0V7" /><rect x="3.5" y="7" width="9" height="6.5" rx="1.8" /></svg></b>
              <span>{feature.name}</span>
              <small>needs {feature.needs}</small>
            </button>
          ))}
        </div>
      </div>

      {/* 2 · the groups, a line over each section of them (#83): a tile opens its group. Header rows size to their line and
          every tile row shares one height, so the twelve tiles stay one size. */}
      <div className={t.groups} role="group" aria-label="Tech groups"
        style={{ gridTemplateRows: sections.flatMap(section => ['auto', ...Array.from({ length: Math.ceil(section.items.length / 2) }, () => '1fr')]).join(' ') }}>
        {sections.map(section => (
          <React.Fragment key={section.name}>
            <h3 className={t.section}>{section.name}</h3>
            {section.items.map(item => {
              const top = item.best;
              const version = top ? shownVersion(top) : 0;
              return (
                <button key={item.id} type="button" ref={node => { tileRefs.current[item.id] = node; }}
                  className={cx(t.tile, item.id === visited && t.tileOn)} style={{ ['--ac' as string]: item.accent }}
                  aria-label={`${item.name}: ${top ? `${top.name}, ${top.versionNames[version - 1]}` : 'not yet'}. Open`}
                  onClick={() => openGroup(item.id)}>
                  <span className={t.tileIcon}><GroupIcon group={item.id} /></span>
                  <span className={t.tileName}>{item.name}</span>
                  <b className={t.tileBest}>{top ? top.name : 'Off'}</b>
                  <span className={t.tileFoot}>
                    <span className={t.pips} aria-hidden="true">{[1, 2, 3].map(pip => <i key={pip} className={pip <= version ? t.pipOn : ''} />)}</span>
                    <small>{top ? top.versionNames[version - 1] : 'not yet'}</small>
                  </span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      {feedback && <p className={cx(t.feedback, feedback.ok ? t.good : t.bad)} role="status">{feedback.message}</p>}
    </section>
  );

  return (
    <section ref={sectionRef} className={cx(t.tech, t.opened)} key={group.id}>
      <button type="button" className={t.back} onClick={backToTiles} aria-label="Back to all tech">
        <i aria-hidden="true">‹</i> All tech
      </button>

      {/* 3 · the next upgrade, shown */}
      <div className={t.stage} style={{ ['--ac' as string]: group.accent }}>
        <div className={t.stageHead}>
          <span className={t.eyebrow}>{group.name.toUpperCase()} · {group.detail.toUpperCase()}</span>
          <span className={t.energyPill} aria-label={`${energyLeft} energy available`}>
            <Bolt className={t.boltPill} /><b>{energyLeft}</b>
          </span>
        </div>
        <div className={t.previewWrap}>
          <TechPreview group={group} now={now} next={next} celebrating={celebrating} />
        </div>

        {/* 4 · its action */}
        <StepAction group={group} step={step} founded={desk.founded} pending={pending[step.id] || 0} energyLeft={energyLeft}
          energy={desk.energy} unlocking={unlocking === step.id} onUnlock={unlock} onAdd={add}
          completing={completing === step.id} onComplete={complete} onGoTo={goTo} deliveryCost={desk.deliveryCost} />
        {feedback && <p className={cx(t.feedback, feedback.ok ? t.good : t.bad)} role="status">{feedback.message}</p>}
      </div>

      {/* 5 · the ladder */}
      <Ladder group={group} focus={step.id} shownVersion={shownVersion} onFocus={id => { focus(id); setFeedback(null); }} />

      {/* the moment, over the whole screen wherever the card is scrolled (#87) */}
      {celebrating && moment && (
        <MomentLayer accent={group.accent} onSkip={skipMoment}>
          <LevelUp key={moment.key} moment={moment} />
        </MomentLayer>
      )}
    </section>
  );
};

export default TechDesk;
