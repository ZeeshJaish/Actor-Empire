/**
 * EMPIRE+ v2 — CONTENT DESK · LOCALIZATION
 *
 *   1. the language map      the world in the game's own atlas colours (the
 *                            Greenlight / Build wizard sea and land): each region
 *                            painted once set up, outlined until then, your
 *                            markets pinned, and the week's viewers your
 *                            languages added
 *   2. the regions           six cards, three by two, each with its own map
 *   3. the region            its map band and flags; "Set up <region>" (cash,
 *                            once), then Subtitles (read along: a captioned frame)
 *                            and Dubbing (heard: a voice) as three-step ladders —
 *                            library · new releases · day-one premieres — each step
 *                            filled with energy (+5⚡, hold, or Fill). Reaching a
 *                            level says hello in the region's languages.
 *   4. the language report   what travelled, what is paying off where, who
 *                            watches in which language, what is still untapped,
 *                            and the trend
 *
 * Every figure comes from `getStreamingLocalizationDesk` (the weekly engine's
 * own counts). Energy presses update this screen at once and are handed to
 * the game in one go a moment later, so a tap never waits on the save.
 */
import React, { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import l from './presentation/screens/ContentDesk/LocalizationRoom.module.css';
import { cx } from './presentation/cx';
import { TitleArt } from './ContentPanels';
import type { CatalogueTitle } from './StreamingContentExperience';
import { CountryFlagSvg } from '../studio-finance/components/FlagField';
import {
  MAP_BASE_HEIGHT,
  MAP_WIDTH,
  WORLD_GRATICULE_PATH,
  boundsForCountry,
  getCountryLabelPoint,
  projectLonLat,
} from '../../views/lifestyle/business/components/worldMapDetailedGeometry';
import { lightHasCountry, lightMergedPath, lightWorld } from './audienceAtlasGeometry';
import { getCountryPosition, getCountryShapeId } from '../../services/worldEconomy/worldCountryGeography';
import type {
  StreamingLocalizationDeskRegion,
  StreamingLocalizationDeskTier,
  StreamingLocalizationDeskTrack,
  StreamingLocalizationDeskTrendPoint,
  StreamingLocalizationDeskView,
} from '../../services/streamingLocalizationDesk';
import type { StreamingLocalizationTrack } from '../../types';

export type LocalizationActionResult = { ok: boolean; message: string; completed?: boolean };

export interface LocalizationDeskActions {
  onOpenRegion?: (packageId: string) => LocalizationActionResult;
  onContribute?: (packageId: string, track: StreamingLocalizationTrack, amount: number | 'FILL') => LocalizationActionResult;
}

/* ── formatting ── */
const compact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(abs >= 1e10 ? 0 : 1).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e5 ? 0 : 1).replace(/\.0$/, '')}K`;
  return `${Math.round(value)}`;
};
const signed = (value: number): string => `${value >= 0 ? '+' : '−'}${compact(Math.abs(value))}`;
const money = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1e3) return `$${Math.round(value / 1e3)}K`;
  return `$${Math.round(value)}`;
};
const trackName = (track: StreamingLocalizationTrack) => (track === 'SUBTITLES' ? 'Subtitles' : 'Dubbing');
const shortWeek = (label: string) => label.split('·').pop()?.trim() || label;
const keyOf = (packageId: string, track: StreamingLocalizationTrack) => `${packageId}:${track}`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
/** A group's languages, the first few by name and the rest counted. */
const someLanguages = (languages: string[], shown = 4, glue = ' · ') => (
  languages.length > shown ? `${languages.slice(0, shown).join(glue)} +${languages.length - shown} more` : languages.join(glue)
);

const Bolt: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5 4.8 13.4h6.1l-1.3 8.1 8.6-11.2h-6.2l1.2-7.8Z" /></svg>
);
const TrackIcon: React.FC<{ track: StreamingLocalizationTrack }> = ({ track }) => (track === 'SUBTITLES' ? (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M10.4 10.2a2.2 2.2 0 1 0 0 3.6M17.1 10.2a2.2 2.2 0 1 0 0 3.6" /></svg>
) : (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" /></svg>
));

/**
 * Each region's voice, for presentation only: hello in its languages (the
 * level-up moment, the way a new phone says hello), a line of film dialogue
 * as its subtitles would read it, and the word its dubbing says.
 */
const REGION_VOICE: Record<string, { hello: string[]; line: string; spoken: string }> = {
  WESTERN_EUROPE_CORE: { hello: ['Hello', 'Bonjour', 'Hallo', 'Ciao', 'Hej'], line: 'Où étais-tu ?', spoken: 'Bonjour !' },
  INDIA_CORE: { hello: ['नमस्ते', 'آداب', 'வணக்கம்', 'নমস্কার', 'ආයුබෝවන්'], line: 'तुम कहाँ थे?', spoken: 'नमस्ते!' },
  LATIN_AMERICA_CORE: { hello: ['Hola', 'Olá', 'Bonjou', '¡Hola!'], line: '¿Dónde estabas?', spoken: '¡Hola!' },
  SOUTHEAST_ASIA_CORE: { hello: ['Halo', 'Xin chào', 'สวัสดี', 'Kumusta', 'Mingalaba'], line: 'Kamu ke mana saja?', spoken: 'Halo!' },
  EAST_ASIA_CORE: { hello: ['你好', 'こんにちは', '안녕하세요', 'Сайн уу'], line: '你去哪儿了？', spoken: '你好！' },
  MIDDLE_EAST_AFRICA_CORE: { hello: ['مرحبا', 'Merhaba', 'سلام', 'Habari', 'Selam'], line: 'أين كنت؟', spoken: 'مرحبا!' },
  EASTERN_EUROPE_CENTRAL_ASIA_CORE: { hello: ['Привет', 'Cześć', 'Привіт', 'Salut', 'Сәлем'], line: 'Где ты был?', spoken: 'Привет!' },
};
const voiceOf = (packageId: string) => REGION_VOICE[packageId] || { hello: ['Hello'], line: 'Where were you?', spoken: 'Hello!' };

/* ── geometry, computed once per region and kept ── */
type Box = [number, number, number, number];
const BAND_ASPECT = 2.3; // the region band's width to height (LocalizationRoom.module.css)
const CARD_ASPECT = 1.9; // a region card's map
const regionGeometryCache = new Map<string, { path: string; centroid: [number, number]; viewBox: Box; cardBox: Box }>();
/** The light atlas files most countries by their numeric shape id, Kosovo by its own code. */
const shapeKey = (countryId: string): string | null => getCountryShapeId(countryId) ?? (lightHasCountry(countryId) ? countryId : null);
const fitBox = (left: number, top: number, right: number, bottom: number, aspect: number, share: number, anchorX: number, anchorY: number, minimum: number, heightShare = .84): Box => {
  const width = Math.min(MAP_WIDTH, Math.max(minimum, (right - left) / share, ((bottom - top) / heightShare) * aspect));
  const height = width / aspect;
  const x = Math.max(0, Math.min(MAP_WIDTH - width, (left + right) / 2 - width * anchorX));
  const y = Math.max(10, Math.min(MAP_BASE_HEIGHT - height, (top + bottom) / 2 - height * anchorY));
  return [x, y, width, height];
};
const regionGeometry = (region: StreamingLocalizationDeskRegion) => {
  const cached = regionGeometryCache.get(region.packageId);
  if (cached) return cached;
  const shapeIds = region.homeCountryIds.map(id => getCountryShapeId(id)).filter((id): id is string => Boolean(id));
  // The region's shape comes from the light atlas (the 1:110m edition the
  // Audience room draws, through the same projection): a tenth of the points.
  const path = lightMergedPath(region.homeCountryIds.map(shapeKey).filter((key): key is string => Boolean(key)));
  // The band centres on the region's lead country: a merged region spanning
  // continents (English) would otherwise centre on the ocean.
  const leadShape = region.flags[0] ? getCountryShapeId(region.flags[0]) : null;
  const leadPoint = leadShape ? getCountryLabelPoint(leadShape) : null;
  // The band frames the region's heart: the countries nearest its lead market
  // that hold three quarters of its land. Spanish and Portuguese also reach
  // Spain and Angola, but the Latin America band shows Latin America.
  const measured = shapeIds.map(id => {
    const [[x0, y0], [x1, y1]] = boundsForCountry(id);
    return { x0, y0, x1, y1, area: Math.max(1, (x1 - x0) * (y1 - y0)) };
  }).filter(box => [box.x0, box.y0, box.x1, box.y1].every(Number.isFinite));
  const largest = [...measured].sort((a, b) => b.area - a.area)[0];
  const centroid = (leadPoint || (largest ? [(largest.x0 + largest.x1) / 2, (largest.y0 + largest.y1) / 2] : [MAP_WIDTH / 2, MAP_BASE_HEIGHT / 2])) as [number, number];
  const boxes = measured
    .map(box => ({ ...box, gap: Math.hypot((box.x0 + box.x1) / 2 - centroid[0], (box.y0 + box.y1) / 2 - centroid[1]) }))
    .sort((a, b) => a.gap - b.gap);
  const land = boxes.reduce((sum, box) => sum + box.area, 0);
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, held = 0;
  for (const box of boxes) {
    left = Math.min(left, box.x0); top = Math.min(top, box.y0); right = Math.max(right, box.x1); bottom = Math.max(bottom, box.y1);
    held += box.area;
    if (held >= land * .75) break;
  }
  const found = Number.isFinite(left);
  // The band: the heart fills most of its height and sits right of centre,
  // clear of the name plate in the lower left. A card: the heart, centred.
  const viewBox: Box = found ? fitBox(left, top, right, bottom, BAND_ASPECT, .62, .62, .46, 170) : [0, 30, MAP_WIDTH, MAP_BASE_HEIGHT - 110];
  const cardBox: Box = found ? fitBox(left, top, right, bottom, CARD_ASPECT, .82, .5, .5, 120) : [0, 30, MAP_WIDTH, MAP_WIDTH / CARD_ASPECT];
  const result = { path, centroid, viewBox, cardBox };
  regionGeometryCache.set(region.packageId, result);
  return result;
};
const pinFor = (countryId: string): [number, number] | null => {
  const position = getCountryPosition(countryId);
  return position ? projectLonLat(position.longitude, position.latitude) : null;
};
/**
 * Merging a region's countries into one shape (and parsing the sea's shelf
 * and the borders) is the only heavy work on this tab, so it never runs on
 * the tap that opens it: the maps paint sea and land first, the regions and
 * the detail fade in a moment later, and the shapes are kept for every visit.
 */
const useRegionGeometryReady = (regions: StreamingLocalizationDeskRegion[]): boolean => {
  const allCached = regions.every(region => regionGeometryCache.has(region.packageId));
  const [ready, setReady] = useState(allCached);
  useEffect(() => {
    if (ready || allCached) { if (!ready) setReady(true); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      regions.forEach(regionGeometry);
      setReady(true);
    }, 40);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [ready, allCached, regions]);
  return ready || allCached;
};

/* ── the atlas: the game's own sea and land, drawn once and reused ──
   The light atlas (1:110m, as the Audience room draws it: 68 KB of land
   instead of the Build map's 850 KB) is parsed once into one hidden <defs>
   and every map on the tab draws it with <use>; the colours are the shared
   atlas's, stop for stop. */
interface Atlas {
  ready: boolean;
  ocean: string; vignette: string; land: string; gloss: string;
  landPath: string; gridPath: string; shelfPath: string; bordersPath: string;
  region: (packageId: string) => string;
}
const AtlasContext = createContext<Atlas | null>(null);
const useAtlas = (): Atlas => {
  const atlas = useContext(AtlasContext);
  if (!atlas) throw new Error('LocalizationDesk atlas missing');
  return atlas;
};
const ref = (id: string) => `#${id}`;
const paint = (id: string) => `url(#${id})`;

const AtlasDefs: React.FC<{ regions: StreamingLocalizationDeskRegion[] }> = ({ regions }) => {
  const atlas = useAtlas();
  const world = lightWorld();
  return (
    <svg className={l.atlasDefs} width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={atlas.ocean} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" /><stop offset="48%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <radialGradient id={atlas.vignette} cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="#082f49" stopOpacity="0" /><stop offset="100%" stopColor="#020617" stopOpacity=".5" />
        </radialGradient>
        <linearGradient id={atlas.land} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bbf7d0" /><stop offset="55%" stopColor="#34d399" /><stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={atlas.gloss} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".3" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <path id={atlas.landPath} d={world.land} />
        <path id={atlas.gridPath} d={WORLD_GRATICULE_PATH} vectorEffect="non-scaling-stroke" />
        {atlas.ready && <path id={atlas.shelfPath} d={world.shelf} vectorEffect="non-scaling-stroke" />}
        {atlas.ready && <path id={atlas.bordersPath} d={world.borders} vectorEffect="non-scaling-stroke" />}
        {atlas.ready && regions.map(region => (
          <path key={region.packageId} id={atlas.region(region.packageId)} d={regionGeometry(region).path} vectorEffect="non-scaling-stroke" />
        ))}
      </defs>
    </svg>
  );
};

/** Sea, grid, shelf, relief and land, under whatever a map paints on top. */
const AtlasGround: React.FC<{ box: Box; relief?: boolean }> = ({ box, relief = false }) => {
  const atlas = useAtlas();
  const [x, y, width, height] = box;
  const drop = (6 * width / MAP_WIDTH).toFixed(2);
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={width} height={height} fill={paint(atlas.ocean)} />
      <rect x={x} y={y} width={width} height={height} fill={paint(atlas.vignette)} />
      <use href={ref(atlas.gridPath)} className={l.atlasGrid} />
      {atlas.ready && <use href={ref(atlas.shelfPath)} className={l.atlasShelfWide} />}
      {atlas.ready && <use href={ref(atlas.shelfPath)} className={l.atlasShelf} />}
      {atlas.ready && relief && <use href={ref(atlas.landPath)} className={l.atlasRelief} transform={`translate(0 ${drop})`} />}
      <use href={ref(atlas.landPath)} className={l.atlasLand} fill={paint(atlas.land)} />
    </g>
  );
};

/** Gloss and borders over the land and the regions. */
const AtlasCover: React.FC<{ gloss?: boolean }> = ({ gloss = false }) => {
  const atlas = useAtlas();
  if (!atlas.ready) return null;
  return (
    <g aria-hidden="true" pointerEvents="none">
      {gloss && <use href={ref(atlas.landPath)} className={l.atlasGloss} fill={paint(atlas.gloss)} />}
      <use href={ref(atlas.bordersPath)} className={l.atlasBorders} />
    </g>
  );
};

/* ── measured width for the charts (no distortion of dots and lines) ── */
const useMeasuredWidth = <T extends HTMLElement>(fallback: number) => {
  const node = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const read = () => setWidth(Math.max(120, Math.round(element.getBoundingClientRect().width)));
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [node, width] as const;
};

const niceCeiling = (value: number): number => {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const unit = value / power;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return step * power;
};

/* ── 1. the language map: the Audience room's living map, for languages ──
   The world in a frame, each region's week written on the map where it lies,
   your markets lit in their region's colour (the selected region's pulse in an
   overlay of its own, so the map never repaints), and the reading on the
   picture's lower edge with a gauge of the share. */
const ATLAS_BOX: Box = [120, -10, 870, 540];
/** Where each region's figure is written (longitude, latitude): over its land,
    or for Europe & English over the Atlantic between its two shores. */
const LABEL_AT: Record<string, [number, number]> = {
  WESTERN_EUROPE_CORE: [-35, 45],
  INDIA_CORE: [78, 21],
  LATIN_AMERICA_CORE: [-55, -10],
  SOUTHEAST_ASIA_CORE: [114, -1],
  EAST_ASIA_CORE: [133, 38],
  MIDDLE_EAST_AFRICA_CORE: [18, 18],
  EASTERN_EUROPE_CENTRAL_ASIA_CORE: [70, 57],
};
const SHORT_NAME: Record<string, string> = {
  WESTERN_EUROPE_CORE: 'Europe & English',
  INDIA_CORE: 'South Asia',
  LATIN_AMERICA_CORE: 'Latin America',
  SOUTHEAST_ASIA_CORE: 'SE Asia',
  EAST_ASIA_CORE: 'East Asia',
  MIDDLE_EAST_AFRICA_CORE: 'M. East & Africa',
  EASTERN_EUROPE_CENTRAL_ASIA_CORE: 'E. Europe & C. Asia',
};
const onAtlas = (point: [number, number]): React.CSSProperties => ({
  left: `${((point[0] - ATLAS_BOX[0]) / ATLAS_BOX[2]) * 100}%`,
  top: `${((point[1] - ATLAS_BOX[1]) / ATLAS_BOX[3]) * 100}%`,
});

const LanguageAtlas: React.FC<{
  desk: StreamingLocalizationDeskView;
  selected: string;
  weekDelta: number | null;
  share: number | null;
  onSelect: (packageId: string) => void;
}> = ({ desk, selected, weekDelta, share, onSelect }) => {
  const atlas = useAtlas();
  const regions = desk.regions;
  // #138: every live market a region reaches is filled once, in the colour of
  // the region its main language belongs to (it was a glowing dot). One merged
  // shape per colour, made once the atlas is ready, never on the tap that opens
  // the tab; an island too small to draw keeps a small mark.
  const markets = useMemo(() => {
    if (!atlas.ready) return [];
    const home = new Map<string, StreamingLocalizationDeskRegion>();
    regions.forEach(region => region.homeCountryIds.forEach(id => home.set(id, region)));
    const seen = new Set<string>();
    const byAccent = new Map<string, { accent: string; shapes: string[]; dots: Array<{ id: string; point: [number, number] }> }>();
    regions.forEach(region => region.markets.countryIds.forEach(id => {
      if (seen.has(id)) return;
      seen.add(id);
      const accent = (home.get(id) || region).accent;
      const entry = byAccent.get(accent) ?? { accent, shapes: [], dots: [] };
      const shape = shapeKey(id);
      if (shape && lightHasCountry(shape)) entry.shapes.push(shape);
      else { const point = pinFor(id); if (point) entry.dots.push({ id, point }); }
      byAccent.set(accent, entry);
    }));
    return [...byAccent.values()].map(entry => ({ ...entry, path: entry.shapes.length ? lightMergedPath(entry.shapes) : '' }));
  }, [atlas.ready, regions]);
  const labels = useMemo(() => regions.flatMap(region => {
    const at = LABEL_AT[region.packageId];
    const point = at ? projectLonLat(at[0], at[1]) : null;
    return point ? [{ region, point: point as [number, number] }] : [];
  }), [regions]);
  const active = regions.find(region => region.packageId === selected);
  const viewBox = ATLAS_BOX.join(' ');
  const setUp = regions.filter(region => region.open).length;
  return (
    <div className={l.hero}>
      <svg className={l.worldMap} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Language regions on the world map">
        <AtlasGround box={ATLAS_BOX} relief />
        {atlas.ready && active && <use href={ref(atlas.region(active.packageId))} className={cx(l.regionGlow, l.fadeIn)} style={{ ['--ac' as string]: active.accent }} aria-hidden="true" />}
        {atlas.ready && regions.map(region => (
          <use
            key={region.packageId}
            href={ref(atlas.region(region.packageId))}
            className={cx(l.regionShape, l.fadeIn, region.open ? l.regionOpen : l.regionClosed, region.packageId === selected && l.regionOn)}
            style={{ ['--ac' as string]: region.accent }}
            role="button"
            tabIndex={0}
            aria-label={`${region.name}${region.open ? ', set up' : ', not set up'}`}
            onClick={() => onSelect(region.packageId)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(region.packageId); } }}
          />
        ))}
        <AtlasCover />
        <g className={cx(l.liveMarkets, l.fadeIn)} aria-hidden="true">
          {markets.map(entry => (
            <g key={entry.accent} style={{ ['--ac' as string]: entry.accent }}>
              {entry.path && <path d={entry.path} className={l.liveMarket} vectorEffect="non-scaling-stroke" />}
              {entry.dots.map(dot => <circle key={dot.id} cx={dot.point[0]} cy={dot.point[1]} r={3.2} className={l.liveMarket} vectorEffect="non-scaling-stroke" />)}
            </g>
          ))}
        </g>
      </svg>
      <span className={l.atlasChip}>Languages{desk.week ? ` · ${shortWeek(desk.week.label)}` : ''}</span>
      <span className={l.atlasCount}><i />{setUp} of {regions.length} set up</span>
      {labels.map(({ region, point }) => (
        <button
          key={region.packageId}
          type="button"
          className={cx(l.atlasLabel, !region.open && l.atlasLabelMuted, region.packageId === selected && l.atlasLabelOn)}
          style={{ ...onAtlas(point), ['--ac' as string]: region.accent }}
          onClick={() => onSelect(region.packageId)}
          aria-label={`${region.name}${region.open && region.week ? `: ${signed(region.week.added)} viewers this week` : region.open ? ': set up' : ': not set up'}`}
        >
          {region.open && <b>{region.week ? signed(region.week.added) : 'New'}</b>}
          <small>{SHORT_NAME[region.packageId] || region.name}</small>
        </button>
      ))}
      <div className={l.read}>
        <span className={l.readSide}>
          <span className={l.readValue}>
            <b>{desk.week ? signed(desk.week.added) : '—'}</b>
            {weekDelta !== null && weekDelta !== 0 && (
              <small className={weekDelta > 0 ? l.up : l.down}>{weekDelta > 0 ? '▲' : '▼'} {compact(Math.abs(weekDelta))}</small>
            )}
          </span>
          <em>{desk.week ? 'Added by your languages' : desk.live ? 'Figures after this week' : 'Figures once you are live'}</em>
        </span>
        {share !== null && (
          <span className={cx(l.readSide, l.readEnd)}>
            <b>{share}%</b>
            <em>subtitled or dubbed</em>
          </span>
        )}
      </div>
      {share !== null && <span className={l.gauge} aria-hidden="true"><s style={{ width: `${Math.min(100, share)}%` }} /></span>}
    </div>
  );
};

/* ── the twelve-week trend of what localization added ── */
const AddedTrend: React.FC<{ points: StreamingLocalizationDeskTrendPoint[] }> = ({ points }) => {
  const [wrapRef, width] = useMeasuredWidth<HTMLDivElement>(320);
  const [focus, setFocus] = useState<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const height = 120;
  const pad = { left: 34, right: 14, top: 16, bottom: 20 };
  const innerW = Math.max(40, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = niceCeiling(Math.max(...points.map(point => point.added), 1));
  const x = (index: number) => pad.left + (points.length <= 1 ? innerW : (index / (points.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - (value / max) * innerH;
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.added).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;
  const last = points.length - 1;
  const pick = (clientX: number) => {
    const element = wrapRef.current;
    if (!element || points.length === 0) return;
    const ratio = (clientX - element.getBoundingClientRect().left - pad.left) / innerW;
    setFocus(Math.max(0, Math.min(last, Math.round(ratio * last))));
  };
  const clearLater = (delay: number) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setFocus(null), delay);
  };
  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);
  const tip = focus !== null ? points[focus] : null;
  const tipLeft = focus !== null ? Math.min(Math.max(x(focus), 76), width - 76) : 0;
  return (
    <div
      ref={wrapRef}
      className={l.trend}
      role="img"
      aria-label={`Viewers added by your languages over ${points.length} weeks: from ${compact(points[0]?.added || 0)} to ${compact(points[last]?.added || 0)} a week.`}
      tabIndex={0}
      onPointerDown={event => { pick(event.clientX); if (event.pointerType !== 'mouse') clearLater(2600); }}
      onPointerMove={event => { if (event.pointerType === 'mouse' || event.buttons) pick(event.clientX); }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') setFocus(null); }}
      onFocus={() => setFocus(last)}
      onBlur={() => setFocus(null)}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') setFocus(value => Math.max(0, (value ?? last) - 1));
        if (event.key === 'ArrowRight') setFocus(value => Math.min(last, (value ?? last) + 1));
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <linearGradient id="loc-trend-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8ecf4" stopOpacity=".16" />
            <stop offset="100%" stopColor="#e8ecf4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, .5, 1].map(step => (
          <g key={step}>
            <line className={l.grid} x1={pad.left} x2={width - pad.right} y1={y(max * step)} y2={y(max * step)} />
            <text className={l.tick} x={pad.left - 7} y={y(max * step) + 3} textAnchor="end">{compact(max * step)}</text>
          </g>
        ))}
        {points.length > 1 && <path d={area} fill="url(#loc-trend-wash)" />}
        {points.length > 1 && <path d={line} className={l.trendLine} />}
        {points.map((point, index) => point.markers.slice(0, 3).map((marker, order) => (
          <circle key={`${point.absoluteWeek}:${order}`} cx={x(index)} cy={y(point.added) - 11 - order * 9} r={4} fill={marker.accent} className={l.ringed} />
        )))}
        {focus !== null && (
          <g>
            <line className={l.crosshair} x1={x(focus)} x2={x(focus)} y1={pad.top - 6} y2={pad.top + innerH} />
            <circle cx={x(focus)} cy={y(points[focus].added)} r={5} className={cx(l.ringed, l.focusDot)} />
          </g>
        )}
        {points.length > 0 && focus === null && <circle cx={x(last)} cy={y(points[last].added)} r={4.5} className={cx(l.ringed, l.endDot)} />}
        <text className={l.tick} x={x(0)} y={height - 4} textAnchor="start">{shortWeek(points[0]?.label || '')}</text>
        <text className={l.tick} x={x(last)} y={height - 4} textAnchor="end">{shortWeek(points[last]?.label || '')}</text>
      </svg>
      {tip && (
        <div className={l.tip} style={{ left: tipLeft }} role="status">
          <small>{tip.label}</small>
          <b>{signed(tip.added)}</b>
          <span><i className={l.keyLine} />added by your languages</span>
          <span><i className={cx(l.keyLine, l.keyMuted)} />{compact(tip.localized)} watched with subtitles or dubbing</span>
          {tip.markers.map(marker => (
            <span key={`${marker.name}:${marker.level}`} className={l.tipMarker}><i style={{ background: marker.accent }} />{marker.name} · {marker.level} began</span>
          ))}
        </div>
      )}
    </div>
  );
};

const Sparkline: React.FC<{ values: number[]; accent: string; label: string }> = ({ values, accent, label }) => {
  const width = 92, height = 30, padX = 5, padY = 6;
  if (values.length < 2 || values.every(value => value <= 0)) return <span className={l.sparkEmpty} aria-hidden="true" />;
  const max = Math.max(...values, 1);
  const x = (index: number) => padX + (index / (values.length - 1)) * (width - padX * 2);
  const y = (value: number) => padY + (height - padY * 2) * (1 - value / max);
  const path = values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  return (
    <svg className={l.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={`${path} L${x(values.length - 1)},${height - padY} L${x(0)},${height - padY} Z`} fill={accent} opacity=".14" />
      <path d={path} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="4" fill={accent} className={l.ringed} />
    </svg>
  );
};

/* ── 2. the regions: six cards, each with its own map ── */
const Flags: React.FC<{ codes: string[]; className?: string; cell?: string }> = ({ codes, className, cell }) => (
  <span className={className} aria-hidden="true">
    {codes.map(code => <span key={code} className={cell}><CountryFlagSvg code={code} fit="stretch" /></span>)}
  </span>
);

const RegionGrid: React.FC<{
  regions: StreamingLocalizationDeskRegion[];
  selected: string;
  onSelect: (packageId: string) => void;
}> = ({ regions, selected, onSelect }) => {
  const atlas = useAtlas();
  return (
    <div className={l.regionGrid} role="tablist" aria-label="Language regions">
      {regions.map((region, index) => {
        const on = region.packageId === selected;
        const box = atlas.ready ? regionGeometry(region).cardBox : null;
        // A seventh region spans the last row, with room to say how far it reaches.
        const wide = regions.length % 3 === 1 && index === regions.length - 1;
        return (
          <button
            key={region.packageId}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={region.open
              ? `${region.name}: set up, subtitles ${region.tracks.SUBTITLES.level} of 3, dubbing ${region.tracks.DUBBING.level} of 3`
              : `${region.name}: not set up, ${money(region.openCost)} to set up`}
            className={cx(l.rcard, on && l.rcardOn, region.open && l.rcardOpen, wide && l.rcardWide)}
            style={{ ['--ac' as string]: region.accent }}
            onClick={() => onSelect(region.packageId)}
          >
            <span className={l.rcardMap}>
              <svg viewBox={(box || [0, 0, 190, 100]).join(' ')} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <rect x={box ? box[0] : 0} y={box ? box[1] : 0} width={box ? box[2] : 190} height={box ? box[3] : 100} fill={paint(atlas.ocean)} />
                {box && <use href={ref(atlas.landPath)} className={l.cardLand} fill={paint(atlas.land)} />}
                {box && (
                  <use href={ref(atlas.region(region.packageId))} className={cx(l.cardRegion, l.fadeIn, region.open ? l.cardRegionOpen : l.cardRegionClosed)} />
                )}
              </svg>
              <Flags codes={region.flags.slice(0, 3)} className={l.rcardFlags} cell={l.rcardFlag} />
            </span>
            <span className={l.rcardName}>{region.name}</span>
            {region.open ? (
              <span className={l.rcardLevels} aria-hidden="true">
                {(['SUBTITLES', 'DUBBING'] as const).map(track => (
                  <span key={track} className={l.rcardTrack}>
                    <em>{track === 'SUBTITLES' ? 'SUB' : 'DUB'}</em>
                    {[1, 2, 3].map(pip => <i key={pip} className={pip <= region.tracks[track].level ? l.pipOn : ''} />)}
                  </span>
                ))}
              </span>
            ) : (
              <span className={l.rcardSetup} aria-hidden="true">Set up · {money(region.openCost)}</span>
            )}
            {wide && (
              <span className={l.rcardMore} aria-hidden="true">
                {region.homeCountryIds.length} {region.homeCountryIds.length === 1 ? 'country' : 'countries'} · {someLanguages(region.languages, 3, ', ')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ── 3. the region ── */
/** Over a region that is set up, its languages keep saying hello, one by one. */
const GreetingBubble: React.FC<{ packageId: string; style: React.CSSProperties }> = ({ packageId, style }) => {
  const words = voiceOf(packageId).hello;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (words.length < 2 || still) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % words.length), 2400);
    return () => window.clearInterval(timer);
  }, [packageId, words.length]);
  return (
    <span className={l.helloBubble} style={style} aria-hidden="true">
      <b key={index} dir="auto">{words[index % words.length]}</b>
    </span>
  );
};

const RegionBand: React.FC<{ region: StreamingLocalizationDeskRegion }> = ({ region }) => {
  const atlas = useAtlas();
  const geometry = atlas.ready ? regionGeometry(region) : null;
  const pins = useMemo(() => region.markets.countryIds
    .map(id => ({ id, point: pinFor(id) }))
    .filter((row): row is { id: string; point: [number, number] } => Boolean(row.point)), [region]);
  const box: Box = geometry?.viewBox ?? [0, 30, MAP_WIDTH, MAP_BASE_HEIGHT - 110];
  const pinRadius = Math.max(2.4, box[2] / 120);
  return (
    <div className={l.band} style={{ ['--ac' as string]: region.accent }}>
      <svg key={region.packageId} className={l.bandMap} viewBox={box.join(' ')} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <AtlasGround box={box} relief />
        {geometry && <use href={ref(atlas.region(region.packageId))} className={cx(l.regionGlow, l.fadeIn)} />}
        {geometry && <use href={ref(atlas.region(region.packageId))} className={cx(l.bandRegion, l.fadeIn, region.open ? l.regionOpen : l.regionClosed)} />}
        <AtlasCover />
        {pins.map(pin => (
          <g key={pin.id}>
            <circle className={l.pinRing} cx={pin.point[0]} cy={pin.point[1]} r={pinRadius * 1.9} />
            <circle className={l.pinDot} cx={pin.point[0]} cy={pin.point[1]} r={pinRadius} />
          </g>
        ))}
      </svg>
      <span className={l.bandShade} />
      <span className={cx(l.bandBadge, region.open ? l.bandBadgeOpen : '')}>{region.open ? 'SET UP' : 'NOT SET UP'}</span>
      {region.open && geometry && (
        <GreetingBubble packageId={region.packageId} style={{
          left: `${Math.min(86, Math.max(14, ((geometry.centroid[0] - box[0]) / box[2]) * 100))}%`,
          top: `${Math.min(70, Math.max(26, ((geometry.centroid[1] - box[1]) / box[3]) * 100))}%`,
        }} />
      )}
      <span className={l.plate}>
        <Flags codes={region.flags} className={l.plateFlags} cell={l.plateFlag} />
        <span className={l.plateName}>{region.name}</span>
        <span className={l.plateLanguages}>{someLanguages(region.languages)}</span>
      </span>
    </div>
  );
};

const EnergyBar: React.FC<{ tier: StreamingLocalizationDeskTier; pending: number; step: number; accent: string }> = ({ tier, pending, step, accent }) => {
  const filled = Math.min(tier.energy, tier.progress + pending);
  const segments = Math.max(1, Math.round(tier.energy / step));
  return (
    <span className={l.segments} style={{ ['--ac' as string]: accent }} aria-hidden="true">
      {Array.from({ length: segments }, (_, index) => {
        const on = filled >= (index + 1) * step;
        const fresh = on && tier.progress < (index + 1) * step;
        return <i key={index} className={cx(on && l.segOn, fresh && l.segFresh)} />;
      })}
    </span>
  );
};

/* What each track is, at a glance: subtitles are read (a film frame with its
   caption), dubbing is heard (a voice). Dim until the track has a level. */
const WAVE = [34, 58, 42, 76, 52, 88, 64, 40, 70, 94, 60, 46, 80, 56, 38, 66, 84, 50, 72, 44, 62, 36];
const TrackStrip: React.FC<{ track: StreamingLocalizationTrack; packageId: string; on: boolean }> = ({ track, packageId, on }) => {
  const voice = voiceOf(packageId);
  return track === 'SUBTITLES' ? (
    <span className={cx(l.strip, l.stripSub, on && l.stripOn)} aria-hidden="true">
      <span className={l.stripScene} />
      <span className={l.caption} dir="auto">{voice.line}</span>
    </span>
  ) : (
    <span className={cx(l.strip, l.stripDub, on && l.stripOn)} aria-hidden="true">
      <span className={l.bubble} dir="auto">
        <svg viewBox="0 0 24 24"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" /></svg>
        {voice.spoken}
      </span>
      <span className={l.wave}>{WAVE.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${(index % 8) * 95}ms` }} />)}</span>
    </span>
  );
};

/* A level reached: hello in the region's languages, then what it brings. */
const HELLO_STEP = 380;
const HELLO_MS = 3800;
const SPARKS: Array<[number, number]> = [[-118, -34], [-84, -62], [-36, -74], [24, -72], [82, -58], [116, -26], [110, 30], [64, 58], [-10, 66], [-74, 54], [-112, 22]];
const HelloBurst: React.FC<{ packageId: string; title: string; detail: string }> = ({ packageId, title, detail }) => {
  const words = voiceOf(packageId).hello.slice(0, 5);
  const finalAt = words.length * HELLO_STEP + 120;
  return (
    <div className={l.hello} style={{ animationDuration: `${HELLO_MS}ms` }} role="status">
      <span className={l.helloGlow} aria-hidden="true" />
      <span className={l.helloWords} aria-hidden="true">
        {words.map((word, index) => <b key={index} dir="auto" style={{ animationDelay: `${index * HELLO_STEP}ms` }}>{word}</b>)}
      </span>
      <span className={l.helloSparks} aria-hidden="true">
        {SPARKS.map(([dx, dy], index) => (
          <i key={index} style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, animationDelay: `${finalAt + (index % 3) * 40}ms` }} />
        ))}
      </span>
      <span className={l.helloFinal} style={{ animationDelay: `${finalAt}ms` }}>
        <small>{title}</small>
        <em>{detail}</em>
      </span>
    </div>
  );
};

const TrackLadder: React.FC<{
  region: StreamingLocalizationDeskRegion;
  track: StreamingLocalizationDeskTrack;
  pending: number;
  energyLeft: number;
  step: number;
  justReached: number | null;
  onAdd: (packageId: string, track: StreamingLocalizationTrack, tier: StreamingLocalizationDeskTier, amount: number | 'FILL') => boolean;
}> = ({ region, track, pending, energyLeft, step, justReached, onAdd }) => {
  const next = track.tiers.find(tier => tier.state === 'NEXT') || null;
  const contributed = next ? Math.min(next.energy, next.progress + pending) : 0;
  const remaining = next ? next.energy - contributed : 0;
  const nextStep = Math.min(step, remaining);
  const canStep = Boolean(next) && remaining > 0 && energyLeft >= nextStep;
  const fill = Math.min(remaining, energyLeft);
  // Holding +5 repeats a press. Each repeat reads this render's level (never one
  // captured when the hold began), a hold never carries into the next level, and
  // any lift, cancel, blur or hidden page ends it, wherever the finger is.
  const latest = useRef({ packageId: region.packageId, track: track.track, next, step, onAdd });
  latest.current = { packageId: region.packageId, track: track.track, next, step, onAdd };
  const repeat = useRef<{ delay: number | null; tick: number | null; release: (() => void) | null }>({ delay: null, tick: null, release: null });
  const stop = useCallback(() => {
    const { delay, tick, release } = repeat.current;
    repeat.current = { delay: null, tick: null, release: null };
    if (delay) window.clearTimeout(delay);
    if (tick) window.clearInterval(tick);
    release?.();
  }, []);
  useEffect(() => stop, [region.packageId, track.track, stop]);
  const press = (level: number): boolean => {
    const now = latest.current;
    if (!now.next || now.next.level !== level) return false;
    return now.onAdd(now.packageId, now.track, now.next, now.step);
  };
  const start = () => {
    stop();
    if (!next || !press(next.level)) return;
    const level = next.level;
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
      repeat.current.tick = window.setInterval(() => { if (!press(level)) stop(); }, 130);
    }, 380);
  };
  const levelShown = Math.min(3, track.level + (next && contributed >= next.energy ? 1 : 0));
  const celebrated = justReached !== null ? track.tiers.find(tier => tier.level === justReached) || null : null;
  const caption = (tier: StreamingLocalizationDeskTier) => (tier.level === 3
    ? (tier.reach.count > 0 ? `${tier.reach.count} coming` : 'every premiere')
    : plural(tier.reach.count, 'title'));
  return (
    <section className={cx(l.ladder, track.track === 'SUBTITLES' ? l.ladderSub : l.ladderDub)} style={{ ['--ac' as string]: region.accent }}
      aria-label={`${trackName(track.track)} level ${levelShown} of 3`}>
      <header className={l.ladderHead}>
        <span className={l.ladderIcon}><TrackIcon track={track.track} /></span>
        <span className={l.ladderTitle}>
          <b>{trackName(track.track)}</b>
          <small>{track.track === 'SUBTITLES' ? 'They read along in their language' : 'They hear it in their language · the bigger lift'}</small>
        </span>
        <span className={l.ladderLevel}>LEVEL {levelShown}<em>/3</em></span>
      </header>
      <TrackStrip track={track.track} packageId={region.packageId} on={levelShown > 0} />
      <ol className={l.steps}>
        {track.tiers.map(tier => {
          const reached = tier.state === 'DONE' || (tier.state === 'NEXT' && contributed >= tier.energy);
          const isNext = tier.state === 'NEXT' && !reached;
          const share = isNext && tier.energy > 0 ? contributed / tier.energy : 0;
          return (
            <li key={tier.level} className={cx(l.step, reached && l.stepDone, isNext && l.stepNext, justReached === tier.level && l.stepFresh)}>
              <span className={l.stepDot}>
                <svg className={l.stepRing} viewBox="0 0 36 36" aria-hidden="true">
                  <circle className={l.ringTrack} cx="18" cy="18" r="16" />
                  {share > 0 && <circle className={l.ringFill} cx="18" cy="18" r="16" pathLength={100} strokeDasharray={`${share * 100} 100`} />}
                </svg>
                <b>{reached ? '✓' : tier.level}</b>
              </span>
              <span className={l.stepName}>{tier.name}</span>
              <span className={l.stepCaption}>{caption(tier)}</span>
            </li>
          );
        })}
      </ol>
      {next && contributed < next.energy ? (
        <div className={l.nextTier}>
          <p className={l.nextWhat}>
            <b>Level {next.level} · {next.name}</b>
            <span>{trackName(track.track)} for {next.detail}: {next.reach.note}.</span>
          </p>
          <div className={l.energyRow}>
            <span className={l.energyCount}><b>{contributed}</b> / {next.energy}<Bolt className={l.boltInline} /></span>
            <div className={l.energyButtons}>
              <button
                type="button"
                className={l.plus}
                disabled={!canStep}
                aria-label={`Add ${nextStep || step} energy to ${region.name} ${trackName(track.track)} level ${next.level}`}
                onPointerDown={event => { if (event.button === 0 || event.pointerType !== 'mouse') start(); }}
                onPointerUp={stop}
                onPointerLeave={stop}
                onPointerCancel={stop}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onAdd(region.packageId, track.track, next, step); } }}
                onContextMenu={event => event.preventDefault()}
              >
                +{nextStep || step}<Bolt className={l.boltBtn} />
              </button>
              {remaining > step && (
                <button type="button" className={l.fill} disabled={fill <= 0} onClick={() => onAdd(region.packageId, track.track, next, 'FILL')}
                  aria-label={`Fill ${region.name} ${trackName(track.track)} level ${next.level} with ${fill} energy`}>
                  Fill · {fill}<Bolt className={l.boltInline} />
                </button>
              )}
            </div>
          </div>
          <EnergyBar tier={next} pending={pending} step={step} accent={region.accent} />
          {remaining > 0 && energyLeft < nextStep && <p className={l.noEnergy}>Out of energy for now. It refills next week, or get more in the Store.</p>}
        </div>
      ) : next ? (
        <p className={l.reachedNote}>Level {next.level} reached · it reaches {next.detail} from next week.</p>
      ) : (
        <p className={l.reachedNote}>Every title, from its first day. {trackName(track.track)} is complete here.</p>
      )}
      {celebrated && (
        <HelloBurst
          key={`${track.track}:${celebrated.level}`}
          packageId={region.packageId}
          title={`${trackName(track.track)} ${celebrated.level} reached`}
          detail={`${trackName(track.track)} for ${celebrated.detail}, from next week.`}
        />
      )}
    </section>
  );
};

const PosterRow: React.FC<{ titles: Array<{ id: string; title: string; viewers: number }>; posters: Map<string, CatalogueTitle>; accent: string }> = ({ titles, posters, accent }) => (
  <div className={l.posterRow}>
    {titles.map((row, index) => {
      const poster = posters.get(row.id);
      return (
        <div key={row.id} className={l.posterCell}>
          <TitleArt title={poster || { id: row.id, title: row.title, genre: 'DRAMA', hue: 210, year: null }} size="sm" rank={index + 1} />
          <b>{row.title}</b>
          <span><i style={{ background: accent }} />{compact(row.viewers)}</span>
        </div>
      );
    })}
  </div>
);

const RegionPanel: React.FC<{
  region: StreamingLocalizationDeskRegion;
  live: boolean;
  posters: Map<string, CatalogueTitle>;
  pending: Record<string, number>;
  energyLeft: number;
  energy: StreamingLocalizationDeskView['energy'];
  step: number;
  justReached: { key: string; level: number } | null;
  opening: boolean;
  onOpen: (packageId: string) => void;
  onAdd: (packageId: string, track: StreamingLocalizationTrack, tier: StreamingLocalizationDeskTier, amount: number | 'FILL') => boolean;
}> = ({ region, live, posters, pending, energyLeft, energy, step, justReached, opening, onOpen, onAdd }) => {
  const helps = region.helps.count > 0
    ? <>Helps most in <b>{region.helps.names.slice(0, 3).join(', ')}{region.helps.count > 3 ? ` +${region.helps.count - 3}` : ''}</b>{region.helps.subscribers > 0 && <> · <b>{compact(region.helps.subscribers)}</b> subscribers there</>}</>
    : region.markets.count > 0
      ? <>Most of your titles already play in a language its markets speak.</>
      : <>None of your markets speak these languages yet.</>;
  return (
    <article className={cx(l.panel, region.open && l.panelOpen)} style={{ ['--ac' as string]: region.accent }}>
      <RegionBand region={region} />
      <div className={l.panelBody}>
        <p className={l.helps}>{helps}{region.markets.count > 0 && <span className={l.reach}> · reaches {region.markets.count} of your markets</span>}</p>

        {!region.open ? (
          <>
            {region.untapped > 0 && (
              <p className={l.untappedHook}>
                <b>{compact(region.untapped)}</b> viewers in its markets watched titles from other languages last week with no subtitles or dubbing.
              </p>
            )}
            <ul className={l.setupList}>
              <li><i>1</i>Set up {region.name}: your service speaks {someLanguages(region.languages, 5, ', ')}.</li>
              <li><i>2</i>Raise Subtitles and Dubbing with energy: the library first, then new releases, then premieres from day one.</li>
            </ul>
            <button type="button" className={cx(l.setupBtn, opening && l.setupBusy)} disabled={!region.canAffordOpen || opening} onClick={() => onOpen(region.packageId)}>
              <span>{opening ? `Setting up ${region.name}…` : region.canAffordOpen ? `Set up ${region.name}` : `Needs ${money(region.openCost)} in the treasury`}</span>
              <small>{money(region.openCost)} once · {money(region.weeklyCost)} a week</small>
            </button>
          </>
        ) : (
          <>
            {region.week ? (
              <div className={l.regionStats}>
                {region.tracks.SUBTITLES.level + region.tracks.DUBBING.level > 0
                  ? <div><b>{compact(region.week.localized)}</b><span>watched with subtitles or dubbing</span></div>
                  : <div><b className={l.statQuiet}>—</b><span>no subtitles or dubbing yet</span></div>}
                <div><b className={region.week.added > 0 ? l.up : ''}>{signed(region.week.added)}</b><span>added this week</span></div>
                <Sparkline values={region.trend} accent={region.accent} label={`${region.name}: viewers added a week, last ${region.trend.length} weeks`} />
              </div>
            ) : (
              <p className={l.since}>{live ? 'Its first figures arrive when this week closes.' : 'Figures start the week your service goes live.'}</p>
            )}
            {region.since && (region.since.pending
              ? <p className={l.since}>{region.since.label} is live{region.since.by ? `, reached by ${region.since.by.split(' ')[0]}` : ''}. Its first results arrive when this week closes.</p>
              : <p className={l.since}>Since {region.since.label}{region.since.by ? `, reached by ${region.since.by.split(' ')[0]}` : ''}{region.since.weeks > 0 ? ` (${region.since.weeks} wk${region.since.weeks === 1 ? '' : 's'})` : ''}:{' '}
                  <b className={region.since.added >= 0 ? l.up : l.down}>{signed(region.since.added)}</b> added a week</p>)}

            <div className={l.energyLine}>
              <span>Raise a level with energy</span>
              <span className={l.energyPill} aria-label={`${energyLeft} energy available`}>
                <Bolt className={l.boltPill} /><b>{energyLeft}</b>
                <small>{energy.bank > 0 ? `${Math.max(0, energyLeft - energy.bank)} this week · ${Math.min(energy.bank, energyLeft)} banked` : 'left this week'}</small>
              </span>
            </div>
            {(['SUBTITLES', 'DUBBING'] as const).map(track => (
              <TrackLadder key={track} region={region} track={region.tracks[track]} pending={pending[keyOf(region.packageId, track)] || 0}
                energyLeft={energyLeft} step={step}
                justReached={justReached?.key === keyOf(region.packageId, track) ? justReached.level : null}
                onAdd={onAdd} />
            ))}

            {region.topTitles.length > 0 && (
              <div className={l.subhead}><h4>Most watched in {region.languages[0]}{region.languages.length > 1 ? ' & co.' : ''}</h4><span>last week</span></div>
            )}
            {region.topTitles.length > 0 && <PosterRow titles={region.topTitles.slice(0, 3)} posters={posters} accent={region.accent} />}
            {region.untapped > 0 && (
              <p className={l.untappedNote}><b>{compact(region.untapped)}</b> still watched other-language titles here that no level reaches yet.</p>
            )}
          </>
        )}
      </div>
    </article>
  );
};

/* ── 4. the language report ── */
const TRAVEL_SHOWN = 6;
const LanguageReport: React.FC<{ desk: StreamingLocalizationDeskView; posters: Map<string, CatalogueTitle>; onSelect: (packageId: string) => void }> = ({ desk, posters, onSelect }) => {
  const [showTable, setShowTable] = useState(false);
  const [allTitles, setAllTitles] = useState(false);
  const top = desk.insights.topTitles;
  const shownTitles = allTitles ? top : top.slice(0, TRAVEL_SHOWN);
  const languages = desk.insights.audienceByLanguage;
  const paying = desk.regions
    .filter(region => region.open && region.week && region.week.added > 0)
    .sort((left, right) => (right.week?.added || 0) - (left.week?.added || 0));
  const maxPaying = Math.max(1, ...paying.map(region => region.week?.added || 0));
  const untapped = desk.regions.filter(region => region.untapped > 0).sort((left, right) => right.untapped - left.untapped);
  const maxUntapped = Math.max(1, ...untapped.map(region => region.untapped));
  return (
    <section className={l.report}>
      <div className={l.sectionHead}><h2>Language report</h2><span>{desk.week ? desk.week.label : 'after your first week'}</span></div>

      {top.length > 0 && (
        <div className={l.card}>
          <div className={l.cardHead}><h3>Travelling best</h3><span>watched in other languages</span></div>
          <ol className={l.travel}>
            {shownTitles.map((row, index) => {
              const poster = posters.get(row.id);
              return (
                <li key={row.id}>
                  <TitleArt title={poster || { id: row.id, title: row.title, genre: 'DRAMA', hue: 210, year: null }} size="xs" rank={index + 1} />
                  <span className={l.travelBody}>
                    <b>{row.title}</b>
                    <span className={l.travelRegions}>
                      {row.regions.slice(0, 3).map(region => (
                        <em key={region.packageId}><i style={{ background: region.accent }} />{region.name} {compact(region.viewers)}</em>
                      ))}
                    </span>
                  </span>
                  <strong>{compact(row.viewers)}</strong>
                </li>
              );
            })}
          </ol>
          {top.length > TRAVEL_SHOWN && (
            <button type="button" className={l.moreToggle} onClick={() => setAllTitles(value => !value)} aria-expanded={allTitles}>
              {allTitles ? 'Show fewer' : `Show all ${top.length}`}
            </button>
          )}
        </div>
      )}

      {paying.length > 0 && (
        <div className={l.card}>
          <div className={l.cardHead}><h3>Paying off</h3><span>viewers added this week, by region</span></div>
          <ul className={l.barList}>
            {paying.map(region => (
              <li key={region.packageId}>
                <button type="button" onClick={() => onSelect(region.packageId)} style={{ ['--ac' as string]: region.accent }}>
                  <span className={l.barName}><i />{region.name}</span>
                  <span className={l.barTrack}><i style={{ width: `${((region.week?.added || 0) / maxPaying) * 100}%` }} /></span>
                  <span className={l.barValue}>{signed(region.week?.added || 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {languages.length > 0 && (
        <div className={l.card}>
          <div className={l.cardHead}><h3>Your audience by language</h3><span>main language of where they watch</span></div>
          <ul className={l.langBars}>
            {languages.map(row => (
              <li key={row.language}>
                <span className={l.langName}>{row.language}</span>
                <span className={l.langTrack}><i style={{ width: `${Math.max(2, row.share * 100)}%` }} /></span>
                <span className={l.langValue}>{Math.round(row.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {untapped.length > 0 && (
        <div className={l.card}>
          <div className={l.cardHead}><h3>Still untapped</h3><span>other-language titles, no subtitles or dubbing</span></div>
          <ul className={l.barList}>
            {untapped.map(region => (
              <li key={region.packageId}>
                <button type="button" onClick={() => onSelect(region.packageId)} style={{ ['--ac' as string]: region.accent }}>
                  <span className={l.barName}><i />{region.name}</span>
                  <span className={l.barTrack}><i style={{ width: `${(region.untapped / maxUntapped) * 100}%` }} /></span>
                  <span className={l.barValue}>{compact(region.untapped)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {desk.trend.length >= 2 && (
        <div className={l.card}>
          <div className={l.cardHead}><h3>Added by your languages</h3><span>{desk.trend.length} weeks</span></div>
          <AddedTrend points={desk.trend} />
          <div className={l.legend}>
            <span><i className={l.keyLine} />Viewers added each week</span>
            {desk.trend.some(point => point.markers.length) && <span><i className={l.keyDot} />A level began</span>}
            <button type="button" className={l.tableToggle} onClick={() => setShowTable(value => !value)} aria-expanded={showTable}>
              {showTable ? 'Hide figures' : 'Weekly figures'}
            </button>
          </div>
          {showTable && (
            <table className={l.table}>
              <thead><tr><th>Week</th><th>Subtitled or dubbed</th><th>Added</th></tr></thead>
              <tbody>
                {[...desk.trend].reverse().map(point => (
                  <tr key={point.absoluteWeek}>
                    <td>{point.label}{point.markers.map(marker => <em key={marker.name + marker.level}> · {marker.name} {marker.level}</em>)}</td>
                    <td>{point.localized.toLocaleString('en-US')}</td>
                    <td>{point.added.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
};

/* ── the tab ── */
export const LocalizationDesk: React.FC<{
  desk: StreamingLocalizationDeskView;
  posters?: Map<string, CatalogueTitle>;
  onFeedback: (feedback: { ok: boolean; message: string }) => void;
} & LocalizationDeskActions> = ({ desk, posters = new Map(), onFeedback, onOpenRegion, onContribute }) => {
  const firstPick = useMemo(() => (
    desk.regions.find(region => region.open && (region.tracks.SUBTITLES.level < 3 || region.tracks.DUBBING.level < 3))
    || [...desk.regions].sort((left, right) => right.untapped - left.untapped)[0]
    || desk.regions[0]
  )?.packageId ?? '', []); // eslint-disable-line react-hooks/exhaustive-deps
  const [selected, setSelected] = useState(firstPick);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [justReached, setJustReached] = useState<{ key: string; level: number } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const openTimer = useRef<{ timer: number; run: () => void } | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const contributeRef = useRef(onContribute);
  contributeRef.current = onContribute;
  const timers = useRef<Record<string, number>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pendingTotal = Object.keys(pending).reduce((sum, key) => sum + (pending[key] || 0), 0);
  const energyLeft = Math.max(0, desk.energy.available - pendingTotal);
  const energyLeftRef = useRef(energyLeft);
  energyLeftRef.current = energyLeft;
  const region = desk.regions.find(row => row.packageId === selected) || desk.regions[0];

  const ready = useRegionGeometryReady(desk.regions);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const atlas = useMemo<Atlas>(() => ({
    ready,
    ocean: `loc${uid}-ocean`, vignette: `loc${uid}-vignette`, land: `loc${uid}-land`, gloss: `loc${uid}-gloss`,
    landPath: `loc${uid}-land-path`, gridPath: `loc${uid}-grid-path`, shelfPath: `loc${uid}-shelf-path`, bordersPath: `loc${uid}-borders-path`,
    region: packageId => `loc${uid}-region-${packageId}`,
  }), [ready, uid]);

  const commit = useCallback((key: string) => {
    const amount = pendingRef.current[key];
    if (timers.current[key]) { window.clearTimeout(timers.current[key]); delete timers.current[key]; }
    if (!amount) return;
    // Taken off the pending list before the game hears of it, so it can never be handed over twice.
    pendingRef.current = { ...pendingRef.current };
    delete pendingRef.current[key];
    setPending(current => { const next = { ...current }; delete next[key]; return next; });
    const [packageId, track] = key.split(':') as [string, StreamingLocalizationTrack];
    const result = contributeRef.current?.(packageId, track, amount);
    if (!result) return;
    if (!result.ok) { onFeedback(result); return; }
    if (result.completed) onFeedback({ ok: true, message: result.message });
  }, [onFeedback]);

  // Hand anything still pending to the game when the tab closes.
  useEffect(() => () => {
    if (openTimer.current) { window.clearTimeout(openTimer.current.timer); openTimer.current.run(); }
    Object.keys(timers.current).forEach(key => window.clearTimeout(timers.current[key]));
    Object.keys(pendingRef.current).forEach(key => {
      const amount = pendingRef.current[key] || 0;
      if (!amount) return;
      const [packageId, track] = key.split(':') as [string, StreamingLocalizationTrack];
      contributeRef.current?.(packageId, track, amount);
    });
  }, []);
  useEffect(() => {
    if (!justReached) return;
    const timer = window.setTimeout(() => setJustReached(null), HELLO_MS);
    return () => window.clearTimeout(timer);
  }, [justReached]);

  /** A press shows at once; the game hears about it a moment later, in one go. */
  const add = useCallback((packageId: string, track: StreamingLocalizationTrack, tier: StreamingLocalizationDeskTier, amount: number | 'FILL'): boolean => {
    if (tier.state !== 'NEXT') return false;
    const key = keyOf(packageId, track);
    const already = pendingRef.current[key] || 0;
    const remaining = tier.energy - tier.progress - already;
    if (remaining <= 0) return false;
    const available = energyLeftRef.current;
    const want = amount === 'FILL' ? remaining : Math.min(amount, remaining);
    const put = Math.min(want, available);
    if (put <= 0 || (amount !== 'FILL' && put < want)) {
      onFeedback({ ok: false, message: 'Out of energy for now. It refills next week, or get more in the Store.' });
      return false;
    }
    const total = already + put;
    pendingRef.current = { ...pendingRef.current, [key]: total };
    energyLeftRef.current = available - put;
    setPending(current => ({ ...current, [key]: total }));
    const full = total >= tier.energy - tier.progress;
    if (full) setJustReached({ key, level: tier.level });
    if (timers.current[key]) window.clearTimeout(timers.current[key]);
    // Full: let the filled step paint, then hand it over. Otherwise wait for the next press.
    timers.current[key] = window.setTimeout(() => commit(key), full ? 180 : 650);
    return !full;
  }, [commit, onFeedback]);

  /** Set up shows at once; the game sets the region up a moment later, after the press has painted. */
  const openRegion = (packageId: string) => {
    if (openTimer.current) return;
    setOpening(packageId);
    const run = () => {
      openTimer.current = null;
      const result = onOpenRegion?.(packageId);
      setOpening(null);
      if (result) onFeedback(result);
    };
    openTimer.current = { timer: window.setTimeout(run, 90), run };
  };

  const select = (packageId: string) => {
    setSelected(packageId);
    window.requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  const lastTwo = desk.trend.slice(-2);
  const weekDelta = lastTwo.length === 2 ? lastTwo[1].added - lastTwo[0].added : null;
  const share = desk.week && desk.week.playerViewers > 0 ? Math.round(desk.week.localized / desk.week.playerViewers * 100) : null;

  return (
    <AtlasContext.Provider value={atlas}>
      <section className={l.loc}>
        <AtlasDefs regions={desk.regions} />
        {/* 1 · the language map, its figures written on it */}
        <LanguageAtlas desk={desk} selected={region?.packageId ?? ''} weekDelta={weekDelta} share={share} onSelect={select} />

        {/* 2 · the regions */}
        <RegionGrid regions={desk.regions} selected={region?.packageId ?? ''} onSelect={select} />

        {/* 3 · the region */}
        <div ref={panelRef}>
          {region && (
            <RegionPanel region={region} live={desk.live} posters={posters} pending={pending} energyLeft={energyLeft} energy={desk.energy}
              step={desk.energy.step} justReached={justReached} opening={opening === region.packageId}
              onOpen={openRegion}
              onAdd={add} />
          )}
        </div>

        {/* 4 · the language report */}
        <LanguageReport desk={desk} posters={posters} onSelect={select} />
      </section>
    </AtlasContext.Provider>
  );
};

export default LocalizationDesk;
