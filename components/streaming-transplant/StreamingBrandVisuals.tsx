/**
 * EMPIRE+ v2 — brand assets & the Brand Deck
 * Logo marks, idents, layout formats, the dot-matrix world map, and the
 * six-card Brand Deck that shows how the world will see the platform.
 */
/* The design system is installed here rather than at a route entry because
   almost every streaming screen already depends on this module. Importing it
   from the dependency root guarantees tokens are defined before any screen
   module's rules are evaluated, whichever screen the player lands on first. */
import './presentation';
/* Waveform, WorldMap and BrandBoard are rendered only by the shell, and their
   rules have always lived in the shell's stylesheet — so they read from the
   shell's module rather than owning one. */
import css from './presentation/screens/Shell/Shell.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PRODUCTION_LOCATION_CATALOG,
  getStreamingDataCenterCost,
} from '../../services/productionLocations';
import {
  STREAMING_BRAND_LETTERFORMS,
  STREAMING_BRAND_MARKS,
  StreamingBrandMarkGlyph,
  renderStreamingBrandLetterMark,
} from '../streaming-brand/StreamingBrandMarkPrimitives';

/* ============================================================
   BRAND PRIMITIVES
   ============================================================ */

export interface Brand {
  name: string;
  markId: string;
  customMark: string | null;   // data URL
  hue: number;                 // 0-360
  sat: number;                 // 40-100
  identId: string;
  customIdent: string | null;  // file name
  promiseId: string;
  /** Public-facing copy only; gameplay remains tied to promiseId. */
  publicManifesto: string;
  layoutId: string;
  /* --- added in the wizard rebuild --- */
  typeId: string;              // wordmark typeface
  accentHue: number;           // secondary colour, 0-360
  identMode: IdentMode;        // none / badge / full sting (full is a paid extra)
  identLen: 2 | 4;             // sting length in seconds
  ratingId: string;            // content-rating ceiling — gates licensing later
  lockupId: string;            // how the mark and wordmark sit together
  serverCity: string | null;   // legacy prototype value; live servers are chosen in Build
}

export type IdentMode = 'none' | 'badge' | 'full';

/** Wordmark typefaces. Each carries its own weight/spacing/case so the choice
 *  reads clearly even where the exact family isn't installed. */
export const TYPEFACES: Record<string, {
  label: string; note: string; stack: string;
  weight: number; spacing: string; transform: 'uppercase' | 'none';
}> = {
  GROTESK: {
    label: 'Grotesk', note: 'Neutral, modern, safe', weight: 900, spacing: '-.02em',
    transform: 'uppercase', stack: "'Helvetica Neue',Helvetica,Arial,sans-serif",
  },
  GEOMETRIC: {
    label: 'Geometric', note: 'Optimistic, tech-forward', weight: 700, spacing: '.14em',
    transform: 'uppercase', stack: "Futura,'Century Gothic','Avenir Next',system-ui,sans-serif",
  },
  SERIF: {
    label: 'Serif', note: 'Prestige, awards, legacy', weight: 700, spacing: '.02em',
    transform: 'none', stack: "Georgia,'Times New Roman',serif",
  },
  CONDENSED: {
    label: 'Condensed', note: 'Loud, tabloid, urgent', weight: 900, spacing: '.01em',
    transform: 'uppercase', stack: "'Arial Narrow','Haettenschweiler',Impact,sans-serif",
  },
  MONO: {
    label: 'Mono', note: 'Technical, cult, precise', weight: 700, spacing: '.08em',
    transform: 'uppercase', stack: "ui-monospace,Menlo,'Courier New',monospace",
  },
  SLAB: {
    label: 'Slab', note: 'Sturdy, editorial, warm', weight: 800, spacing: '.01em',
    transform: 'none', stack: "Rockwell,'Bookman Old Style',Georgia,serif",
  },
};
export const typeFace = (b: Pick<Brand, 'typeId'>) => TYPEFACES[b.typeId] ?? TYPEFACES.GROTESK;

/** How the mark and the wordmark sit together. */
export const LOCKUPS: Record<string, { label: string; note: string }> = {
  WORDMARK: { label: 'Wordmark', note: 'Name only — clean and editorial' },
  SIDE: { label: 'Horizontal', note: 'Mark left, wordmark right' },
  STACK: { label: 'Stacked', note: 'Mark above, wordmark below' },
  ICON: { label: 'Icon only', note: 'Legacy icon-only identity' },
};
export const PLAYER_LOCKUP_IDS = ['WORDMARK', 'SIDE', 'STACK'] as const;

/** Content-rating ceiling. A real decision: it caps what you may license. */
export const RATINGS: Record<string, { label: string; note: string; caps: string }> = {
  FAMILY: { label: 'Family', note: 'All ages', caps: 'No mature titles — widest reach, lowest prestige' },
  TEEN: { label: 'Teen', note: 'Up to 15', caps: 'Most of the market, some awards bait off-limits' },
  MATURE: { label: 'Mature', note: 'Up to 18', caps: 'Everything licensable — narrower household reach' },
};

export const brandColor = (b: Pick<Brand, 'hue' | 'sat'>) => `hsl(${b.hue} ${b.sat}% 58%)`;
export const accentColor = (b: Pick<Brand, 'accentHue' | 'sat'>) => `hsl(${b.accentHue} ${b.sat}% 62%)`;
/** hsl → hex, so the brand board can chip out real hex codes like a brand guide */
export const hslHex = (h: number, sPct: number, lPct: number) => {
  const sN = sPct / 100, lN = lPct / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
};
export const brandDeep = (b: Pick<Brand, 'hue' | 'sat'>) => `hsl(${b.hue} ${Math.round(b.sat * 0.85)}% 26%)`;
export const brandGlow = (b: Pick<Brand, 'hue' | 'sat'>, a = 0.5) => `hsl(${b.hue} ${b.sat}% 58% / ${a})`;

/* --- logo marks are shared with rival and generated platform identity. --- */
export const MARKS = STREAMING_BRAND_MARKS;
export const LETTERFORMS = STREAMING_BRAND_LETTERFORMS;
export const letterMark = renderStreamingBrandLetterMark;

export const Mark: React.FC<{
  brand: Pick<Brand, 'name' | 'markId' | 'customMark'>;
  className?: string;
}> = ({ brand, className }) => {
  if (brand.customMark) return <img className={className} src={brand.customMark} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
  return <StreamingBrandMarkGlyph className={className} name={brand.name} markId={brand.markId} />;
};

/* --- sound idents as waveforms --- */
export const IDENTS: Record<string, { label: string; note: string; bars: number[] }> = {
  PULSE: { label: 'Pulse', note: 'Two heartbeats, then silence', bars: [6, 14, 26, 14, 6, 18, 30, 18, 8, 4] },
  RISE: { label: 'Rise', note: 'A climb that never resolves', bars: [4, 7, 10, 14, 18, 22, 26, 30, 34, 30] },
  STORM: { label: 'Storm', note: 'Loud. Unapologetic.', bars: [28, 9, 34, 6, 24, 12, 36, 15, 30, 20] },
  HUSH: { label: 'Hush', note: 'A whisper before the picture', bars: [3, 5, 4, 7, 6, 9, 7, 5, 4, 3] },
  ANTHEM: { label: 'Anthem', note: 'Orchestral. Expensive.', bars: [10, 18, 12, 24, 16, 30, 20, 34, 26, 36] },
};

export const Waveform: React.FC<{ identId: string; playing?: boolean; color: string }> = ({ identId, playing, color }) => {
  const def = IDENTS[identId] ?? IDENTS.PULSE;
  return (
    <div className={cx(css.wave, (playing ? css.on : ''))}>
      {def.bars.map((h, i) => (
        <i key={i} style={{ height: h, background: color, animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
};

/* --- brand promises = manifesto + expectation contract --- */
export interface Promise {
  id: string; label: string; manifesto: string;
  expects: string[]; forgives: string; punishes: string;
}
export const PROMISES: Promise[] = [
  {
    id: 'EVENT', label: 'Event House',
    manifesto: 'Every premiere will feel like a holiday.',
    expects: ['≥1 event premiere per quarter', 'Marketing spend that matches the noise', 'Simultaneous global drops'],
    forgives: 'A thin back-catalog between events',
    punishes: 'Two quiet quarters in a row — churn spikes hard',
  },
  {
    id: 'BINGE', label: 'Binge Machine',
    manifesto: 'You will never run out of the next episode.',
    expects: ['Deep completed seasons, not teasers', 'Constant catalog additions', 'Strong next-up recommendations'],
    forgives: 'Fewer headline premieres',
    punishes: 'Catalog gaps — finishers cancel within two weeks',
  },
  {
    id: 'FANDOM', label: 'Fandom Forever',
    manifesto: 'The worlds you love will never be cancelled.',
    expects: ['Franchise continuity', 'Spinoffs and companion content', 'Community and fan features'],
    forgives: 'Weak general-audience titles',
    punishes: 'Cancelling a beloved series — reputation damage is permanent',
  },
  {
    id: 'WORLD', label: 'World Stage',
    manifesto: 'Great stories do not need a passport.',
    expects: ['Originals from multiple regions', 'Fast localization and subtitles', 'Regional premieres, not leftovers'],
    forgives: 'A smaller home-market slate',
    punishes: 'Ignoring a launched region — it churns first',
  },
  {
    id: 'EVERYONE', label: "Everyone's Screen",
    manifesto: 'One subscription the whole house agrees on.',
    expects: ['Kids-safe library', 'Family co-viewing titles', 'Multiple profiles and screens'],
    forgives: 'Less prestige credibility',
    punishes: 'Adult-only drift — family accounts leave together',
  },
  {
    id: 'TECH', label: 'Technology First',
    manifesto: 'It will always play, instantly, perfectly.',
    expects: ['Best-in-class playback quality', 'Near-zero buffering', 'Early device and format support'],
    forgives: 'A less starry slate',
    punishes: 'Any outage — trust collapses faster than rivals',
  },
  {
    id: 'PRESTIGE', label: 'The Critics\' House',
    manifesto: 'We will be the platform awards remember.',
    expects: ['Auteur-driven originals', 'Festival and awards campaigns', 'Protected creative control'],
    forgives: 'Lower raw viewership',
    punishes: 'A cheap-looking slate — critics turn publicly',
  },
];

/* --- app layout formats (advanced ones gated by tech) --- */
export interface LayoutFormat { id: string; label: string; note: string; lock?: string; }
export const LAYOUTS: LayoutFormat[] = [
  /* --- available at founding --- */
  { id: 'ROWS', label: 'Rows Only', note: 'Classic shelves. Cheap to serve, easy to scan.' },
  { id: 'HERO_IMG', label: 'Image Hero', note: 'One big poster on top, shelves below.' },
  { id: 'GRID', label: 'Poster Grid', note: 'Everything visible at once. Catalogue-forward.' },
  { id: 'RESUME', label: 'Continue Watching', note: 'Half-finished titles come first. Habit over discovery.' },
  /* --- unlocked by research, post-founding --- */
  { id: 'HERO_VIDEO', label: 'Video Hero', note: 'Autoplaying trailer takes the screen.', lock: 'Playback Tech II' },
  { id: 'SPOTLIGHT', label: 'Spotlight Carousel', note: 'Rotating full-bleed features.', lock: 'Product Tech I' },
  { id: 'EDITORIAL', label: 'Editorial Collections', note: 'Human-curated shelves with cover art and copy.', lock: 'Editorial Desk' },
  { id: 'TRAILER', label: 'Auto-Trailer Wall', note: 'Every tile plays silently on hover.', lock: 'Playback Tech III' },
  { id: 'PERSONAL', label: 'Personalised Rows', note: 'Every subscriber gets a different home.', lock: 'Recommendation Engine' },
  { id: 'PROFILES', label: 'Multi-Profile Home', note: 'One household, many fronts. Kids mode included.', lock: 'Household Accounts' },
  { id: 'LIVE', label: 'Live Rail', note: 'A live channel strip above everything.', lock: 'EMPIRE+ Live' },
  { id: 'CINEMA', label: 'Cinematic Fullscreen', note: 'No chrome at all. The catalogue becomes the wallpaper.', lock: 'Frontier UI' },
];

/* ============================================================
   DOT-MATRIX WORLD MAP
   ============================================================ */
export type RegionId = 'NORTH_AMERICA' | 'SOUTH_AMERICA' | 'EUROPE' | 'AFRICA' | 'ASIA' | 'OCEANIA';
export const REGION_OF: Record<string, RegionId> = {
  N: 'NORTH_AMERICA', S: 'SOUTH_AMERICA', E: 'EUROPE', F: 'AFRICA', A: 'ASIA', O: 'OCEANIA',
};
/** 64 x 26 coarse equirectangular mask */
export const WORLD_MASK = [
  '.....NN.........NNN.....................AAAAAAAAAAA.............',
  '...NNNNNNN.....NNNNN...........EEE......AAAAAAAAAAAAAA..........',
  '..NNNNNNNNNN...NNNN..........EEEEEE....AAAAAAAAAAAAAAAA.........',
  '..NNNNNNNNNNNN.NNN..........EEEEEEEE...AAAAAAAAAAAAAAAAA........',
  '...NNNNNNNNNNNN.............EEEEEEEE...AAAAAAAAAAAAAAAAAA.......',
  '....NNNNNNNNNN..............EEEEEEE....AAAAAAAAAAAAAAAAAAA......',
  '.....NNNNNNNNN..............EEEEEE.....AAAAAAAAAAAAAAAAAAA......',
  '......NNNNNNN...............EEEEE......AAAAAAAAAAAAAAAAAAA......',
  '.......NNNNNN...............EEEE.......AAAAAAAAAAAAAAAAAA.......',
  '........NNNNN..............FFFFFF......AAAAAAAAAAAAAAAAA........',
  '.........NNN...............FFFFFFFF....AAAAAAAAAAAAAAAA.........',
  '..........NN...............FFFFFFFFF...AAAAAAAAAAAAAA...........',
  '...........N...............FFFFFFFFF..AAAAAAAAAAAA..............',
  '............SS.............FFFFFFFFF..AAAAAAAAAA................',
  '.............SSS...........FFFFFFFFF...AAAAAAA..................',
  '..............SSSS.........FFFFFFFF....AAAAA....................',
  '..............SSSSS........FFFFFFF.....AAA......................',
  '..............SSSSS........FFFFFF.......AA......................',
  '..............SSSSS........FFFFF...........OOOO.................',
  '..............SSSS.........FFFF...........OOOOOOO...............',
  '..............SSSS..........FF............OOOOOOO...............',
  '..............SSS.........................OOOOO.................',
  '..............SSS............................OO.................',
  '..............SS...............................OO...............',
  '..............S.................................................',
];

export interface RegionInfo {
  id: RegionId; label: string; viewers: number; rivals: string[]; cost: number;
}
/** Real cities you can put your one data centre in. `hub` marks the
 *  best-connected option — cheaper latency, higher rent. */
export interface City { id: string; label: string; region: RegionId; x: number; y: number; hub?: boolean; cost: number; quality: number; }
export const CITIES: City[] = PRODUCTION_LOCATION_CATALOG.map(item => ({
  id: item.id,
  label: item.name,
  region: item.regionId,
  // The shared location catalog uses percentage coordinates. The latency model
  // uses the older 64 x 26 range, so only the projection changes here.
  x: item.x * 0.64,
  y: item.y * 0.26,
  hub: item.quality >= 9,
  cost: getStreamingDataCenterCost(item),
  quality: item.quality,
}));
export const cityById = (id: string | null) => CITIES.find(c => c.id === id) ?? null;

/** Rough round-trip latency from a server city to a region's centre of mass.
 *  Not simulation — just an honest-feeling penalty for distance. */
const REGION_CENTRE: Record<RegionId, [number, number]> = {
  NORTH_AMERICA: [13, 9], SOUTH_AMERICA: [20, 19], EUROPE: [31, 7],
  AFRICA: [32, 16], ASIA: [48, 12], OCEANIA: [55, 20],
};
export const latencyTo = (city: City | null, region: RegionId) => {
  if (!city) return null;
  const [rx, ry] = REGION_CENTRE[region];
  const d = Math.hypot(city.x - rx, (city.y - ry) * 1.6);
  return Math.round(18 + d * 7.5 - (city.hub ? 8 : 0));
};
export const latencyGrade = (ms: number) => ms < 60 ? 'good' : ms < 120 ? 'ok' : 'bad';

export const REGIONS: RegionInfo[] = [
  { id: 'NORTH_AMERICA', label: 'North America', viewers: 310_000_000, rivals: ['Netflix', 'Prime Video', 'Disney+'], cost: 180_000_000 },
  { id: 'EUROPE', label: 'Europe', viewers: 405_000_000, rivals: ['Netflix', 'Prime Video', 'Disney+'], cost: 150_000_000 },
  { id: 'ASIA', label: 'Asia', viewers: 1_240_000_000, rivals: ['Netflix', 'Prime Video', 'Disney+'], cost: 260_000_000 },
  { id: 'SOUTH_AMERICA', label: 'South America', viewers: 265_000_000, rivals: ['Netflix', 'Prime Video'], cost: 90_000_000 },
  { id: 'AFRICA', label: 'Africa', viewers: 340_000_000, rivals: [], cost: 70_000_000 },
  { id: 'OCEANIA', label: 'Oceania', viewers: 34_000_000, rivals: ['Netflix', 'Prime Video', 'Disney+'], cost: 45_000_000 },
];

export const WorldMap: React.FC<{
  selected: RegionId[]; color: string; onToggle: (r: RegionId) => void;
  /** when set, the map also places the single launch data centre */
  serverCity?: string | null;
  onPickCity?: (id: string) => void;
  drillRegion?: RegionId | null;
  onDrill?: (r: RegionId | null) => void;
}> = ({ selected, color, onToggle, serverCity, onPickCity, drillRegion, onDrill }) => {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: RegionId }[] = [];
    WORLD_MASK.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const r = REGION_OF[ch];
        if (r) out.push({ x, y, r });
      });
    });
    return out;
  }, []);
  const [hover, setHover] = useState<RegionId | null>(null);
  const server = cityById(serverCity ?? null);
  const drilling = drillRegion ?? null;
  const cities = drilling ? CITIES.filter(ct => ct.region === drilling) : [];
  return (
    <div className={css.worldmap}>
      <svg viewBox="0 0 64 26" preserveAspectRatio="xMidYMid meet">
        {dots.map((d, i) => {
          const on = selected.includes(d.r);
          const hot = hover === d.r;
          return (
            <circle key={i} cx={d.x + 0.5} cy={d.y + 0.5}
              r={on ? 0.42 : 0.3}
              fill={on ? color : hot ? '#6d7484' : '#2c313c'}
              style={{
                filter: on ? `drop-shadow(0 0 .5px ${color})` : undefined,
                transition: 'fill .35s, r .35s',
                animation: on ? `dotpop .4s ${(d.x + d.y) * 0.008}s both` : undefined,
              }} />
          );
        })}

        {/* coverage ring around the one server you launch with */}
        {server && (
          <g>
            <circle cx={server.x + 0.5} cy={server.y + 0.5} r="7" fill="none"
              stroke={color} strokeWidth=".14" opacity=".26" />
            <circle cx={server.x + 0.5} cy={server.y + 0.5} r="4" fill="none"
              stroke={color} strokeWidth=".18" opacity=".45" />
          </g>
        )}

        {/* city nodes, only while drilled into a region */}
        {cities.map(ct => {
          const on = ct.id === serverCity;
          return (
            <g key={ct.id} className={cx(css.cnode, (on ? css.on : ''))}
              onClick={() => onPickCity?.(ct.id)}>
              <circle cx={ct.x + 0.5} cy={ct.y + 0.5} r="1.5" fill="transparent" />
              <circle cx={ct.x + 0.5} cy={ct.y + 0.5} r={on ? 0.85 : 0.6}
                fill={on ? color : '#0b0d12'} stroke={color}
                strokeWidth={on ? 0 : 0.22} />
              {ct.hub && !on && <circle cx={ct.x + 0.5} cy={ct.y + 0.5} r="0.2" fill={color} />}
            </g>
          );
        })}

        {/* the server itself, drawn as a rack pin */}
        {server && (
          <g className={css.srv}>
            <rect x={server.x - 0.35} y={server.y - 0.9} width="1.7" height="1.5" rx=".3"
              fill={color} />
            <rect x={server.x + 0.35} y={server.y + 0.6} width=".3" height=".9" fill={color} opacity=".7" />
          </g>
        )}
      </svg>
      <div className={css['worldmap-hit']}>
        {REGIONS.map(r => (
          <button key={r.id}
            className={cx(css.rgn, css[r.id], (selected.includes(r.id) ? css.on : ''))}
            onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}
            onClick={() => {
              if (onDrill) { onDrill(drilling === r.id ? null : r.id); if (!selected.includes(r.id)) onToggle(r.id); }
              else onToggle(r.id);
            }}>
            <span>{r.label}</span>
            {r.rivals.length > 0 && <span className={css.rivalpip}>{r.rivals.length}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
   THE BRAND DECK — how the world will see it
   ============================================================ */

/* ============================================================
   THE BRAND BOARD
   One composed image, every tile live. Change the name, mark,
   colour or typeface and all of it re-renders at once.
   ============================================================ */
export const BrandBoard: React.FC<{ brand: Brand; regionCount?: number }> = ({ brand }) => {
  const c = brandColor(brand), c2 = brandDeep(brand), ac = accentColor(brand);
  const name = brand.name.trim() || 'UNNAMED';
  const tf = typeFace(brand);
  const promise = PROMISES.find(p => p.id === brand.promiseId);
  const tagline = (brand.publicManifesto.trim() || promise?.manifesto || 'Anywhere & anytime').replace(/\.$/, '');
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unnamed';
  const wordmark: React.CSSProperties = {
    fontFamily: tf.stack, fontWeight: tf.weight, letterSpacing: tf.spacing,
    textTransform: tf.transform,
  };
  const lockupMode = brand.lockupId === 'ICON' ? 'ICON' : PLAYER_LOCKUP_IDS.includes(brand.lockupId as typeof PLAYER_LOCKUP_IDS[number])
    ? brand.lockupId
    : 'SIDE';
  const protectedMark = Boolean(brand.customMark) || brand.markId.startsWith('LETTER_');

  /* a sheen sweeps the whole board whenever anything changes */
  const customMarkSignature = brand.customMark ? `${brand.customMark.length}:${brand.customMark.slice(-32)}` : 'preset';
  const sig = `${name}|${brand.markId}|${brand.hue}|${brand.sat}|${brand.accentHue}|${brand.typeId}|${brand.promiseId}|${brand.publicManifesto}|${brand.lockupId}|${customMarkSignature}`;
  const [flash, setFlash] = useState(0);
  const prev = useRef(sig);
  useEffect(() => {
    if (prev.current !== sig) { prev.current = sig; setFlash(f => f + 1); }
  }, [sig]);

  return (
    <div
      className={css.bboard}
      key={flash}
      aria-label={`Live brand deck for ${name}`}
      style={{
        ['--epx-deck-primary' as string]: c,
        ['--epx-deck-deep' as string]: c2,
        ['--epx-deck-accent' as string]: ac,
      }}
    >
      <div className={css.deckMeta}>
        <span>PLATFORM IDENTITY</span>
        <b>LIVE PREVIEW</b>
      </div>

      <div className={cx(css.bt, css.deckWordmark)}>
        <div className={cx(
          css.deckWordmarkLockup,
          lockupMode === 'SIDE' ? css.deckWordmarkSide : '',
          lockupMode === 'STACK' ? css.deckWordmarkStack : '',
          lockupMode === 'ICON' ? css.deckWordmarkIcon : '',
        )}>
          {lockupMode !== 'WORDMARK' && <span className={css.deckWordmarkMark}><Mark brand={brand} /></span>}
          {lockupMode !== 'ICON' && (
            <div className={css.deckWordmarkCopy}>
              <div className={css.deckWordmarkText} style={wordmark}>{name}<i>™</i></div>
              <span className={css.deckWordmarkTagline}>ORIGINALS · FILMS · SERIES</span>
            </div>
          )}
        </div>
      </div>

      <div className={cx(css.bt, css.deckIconTile)}>
        <div className={css.deckAppIcon}><span><Mark brand={brand} /></span><em>3</em></div>
      </div>

      <div className={cx(css.bt, css.deckCrop, protectedMark ? css.deckCropSafe : '')} aria-hidden="true">
        <span className={css.deckCropMark}><Mark brand={brand} /></span>
      </div>

      <div className={cx(css.bt, css.deckSeal)}>
        <div className={css.deckRound}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <defs><path id="epx-brand-arc" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" /></defs>
            <text><textPath href="#epx-brand-arc" startOffset="0%">{`${name} · STREAM ANYWHERE · `}</textPath></text>
          </svg>
          <span><Mark brand={brand} /></span>
        </div>
      </div>

      <div className={cx(css.bt, css.deckBrowser)}>
        <div className={css.deckBrowserTop}>
          <div className={css.deckDots}><i /><i /><i /></div>
          <div className={css.deckTab}><span><Mark brand={brand} /></span><b>Watch — {name}</b><i>×</i></div>
        </div>
        <div className={css.deckAddress}><i /><span>https://watch.{slug}.com/</span></div>
      </div>

      <div className={cx(css.bt, css.deckDock)}>
        <div className={css.deckDockScreen}>
          <i /><i /><i />
          <span><Mark brand={brand} /></span>
        </div>
      </div>

      <div className={cx(css.bt, css.deckPromise)}>
        <span>{tagline}</span>
        <i>THE {name} PROMISE</i>
      </div>

      <div className={cx(css.bt, css.deckPhone)}>
        <div className={css.deckDevice}>
          <i className={css.deckSpeaker} />
          <div className={css.deckClock}><small>SUNDAY · PREMIERE NIGHT</small><b>17:44</b></div>
          <div className={css.deckPhoneArt}><span><Mark brand={brand} /></span></div>
          <div className={css.deckPush}>
            <span><Mark brand={brand} /></span>
            <div><b>{name}</b><small>Your premiere begins tonight.</small></div>
            <em>now</em>
          </div>
        </div>
      </div>

      <div className={cx(css.bt, css.deckPlayer)}>
        <div className={css.deckPlayerArt}>
          <span className={css.deckWatermark}><Mark brand={brand} /></span>
          <i className={css.deckFigure} />
        </div>
        <div className={css.deckPlayerHud}>
          <b style={{ fontFamily: tf.stack }}>DEAD SIGNAL</b>
          <div><i /></div>
          <span>▶︎ &nbsp; 12:04 / 47:22</span>
        </div>
      </div>

      <div className={css.deckPalette} aria-label="Selected brand colours">
        {[
          [c, hslHex(brand.hue, brand.sat, 58)],
          [ac, hslHex(brand.accentHue, brand.sat, 62)],
          [c2, hslHex(brand.hue, Math.round(brand.sat * 0.85), 26)],
        ].map(([fill, hex]) => <span key={hex}><i style={{ background: fill }} /><b>{hex}</b></span>)}
      </div>

      <div className={css['bb-sheen']} />
    </div>
  );
};
