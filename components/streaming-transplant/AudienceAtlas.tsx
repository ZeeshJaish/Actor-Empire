/* ============================================================================
   AUDIENCE ATLAS — the living map at the top of the Audience room.

   This is the same picture the player drew their launch on in the Build
   wizard: the same sea, shelf, relief and grey land, the same 1000×520 world,
   the same continent boxes and the same camera that flies to a region when you
   tap it. A player who built a network on this map recognises it at once —
   "this is where my markets are" — and now it is alive:

     PLATFORM    your countries, washed in your colour as in the wizard, with
                 lights sized by your audience there (paid accounts, homes
                 watching free, or buyers, by your business model)
     MARKET      the whole industry: lights sized by the people watching, in
                 the colour of the service that leads each country
     OPERATIONS  where you stand: live, on its way, paused, open ground

   Tap a continent to fly to it, tap a country there to open its card, tap the
   sea to come back out. Nothing on the map is decoration: every shape is a row
   from the world simulation, and a zero is not drawn.

   Camera helpers mirror NetworkAtlas (same boxes, same out-cubic flight) so
   both maps move the same way. The shapes come from audienceAtlasGeometry: the
   1:110m edition of the same atlas through the same projection, because the
   50m paths the Build map uses cost a quarter of a second to paint here.
   ========================================================================== */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
/* Order matters: the desk's reset (`.ad :where(*){padding:0…}`) and these
   panel rules have the same specificity, so the reset must be in the page
   first. The Platform room now imports this file (its network map) before the
   HQ reaches the Audience room, so the desk sheet is pulled in here, ahead of
   this file's own sheet, whoever imports it first. */
import './presentation/screens/AudienceDesk/AudienceDesk.module.css';
import css from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import { cx } from './presentation/cx';
import {
  WORLD_GRATICULE_PATH,
  getCountryLabelPoint,
  projectLonLat,
} from '../../views/lifestyle/business/components/worldMapDetailedGeometry';
import { lightCountryPath, lightHasCountry, lightLandOutside, lightMergedPath, lightWorld } from './audienceAtlasGeometry';
import { REGION_MAP_OVERLAYS } from '../../services/regionMap';
import { getCountryPosition, getCountryShapeId } from '../../services/worldEconomy/worldCountryGeography';
import { WORLD_COUNTRY_DEFINITIONS } from '../../services/worldEconomy/worldCountryRegistry';
import { AUDIENCE_WORDS, REGION_SHORT_LABELS, compact, type AtlasCountry, type AtlasRegionId, type AtlasRegionSummary, type AudienceKind } from './audienceAtlasModel';

export type AtlasMode = 'PLATFORM' | 'MARKET' | 'OPERATIONS';

export interface AtlasReading {
  value: string;
  caption: string;
  tone?: 'good' | 'bad' | 'warn';
}

export interface AudienceAtlasProps {
  mode: AtlasMode;
  countries: AtlasCountry[];
  regions: AtlasRegionSummary[];
  /** Your brand colour, as hex. */
  accent: string;
  focusRegion: AtlasRegionId | null;
  selectedCountryId?: string | null;
  /** Countries picked on the market-entry page, drawn bright over open ground. */
  picked?: ReadonlySet<string>;
  /** What "your audience" means for this service (accounts, ad homes, buyers). */
  audienceKind?: AudienceKind;
  onFocusRegion: (regionId: AtlasRegionId | null) => void;
  onSelectCountry: (countryId: string) => void;
  /** The figure at the foot of the picture, left. */
  reading: AtlasReading;
  /** The answering figure, right. */
  aside?: AtlasReading;
  /** 0–1: drawn as the frame's bottom edge, the way the Build map draws coverage. */
  gauge?: number;
}

/* --- the drawing space and the camera (mirrors NetworkAtlas) --------------- */
const W = 1000;
const H = 520;
type Box = { x: number; y: number; w: number; h: number };
const WORLD_BOX: Box = { x: 120, y: 48, w: 870, h: 420 };

function boxFromLonLat(box: [[number, number], [number, number]], pad = 0.14): Box {
  const corners: Array<[number, number]> = [
    [box[0][0], box[0][1]], [box[1][0], box[0][1]],
    [box[0][0], box[1][1]], [box[1][0], box[1][1]],
    [(box[0][0] + box[1][0]) / 2, box[1][1]],
    [(box[0][0] + box[1][0]) / 2, box[0][1]],
  ];
  const points = corners.map(([lng, lat]) => projectLonLat(lng, lat)).filter(Boolean) as Array<[number, number]>;
  if (points.length === 0) return WORLD_BOX;
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const x0 = Math.min(...xs); const x1 = Math.max(...xs);
  const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  const padX = (x1 - x0) * pad; const padY = (y1 - y0) * pad;
  return { x: x0 - padX, y: y0 - padY, w: (x1 - x0) + padX * 2, h: (y1 - y0) + padY * 2 };
}

function fitBox(box: Box, aspect: number): Box {
  const boxAspect = box.w / box.h;
  let { x, y, w, h } = box;
  if (boxAspect < aspect) { const next = h * aspect; x -= (next - w) / 2; w = next; }
  else { const next = w / aspect; y -= (next - h) / 2; h = next; }
  x = Math.max(-40, Math.min(x, W + 40 - w));
  y = Math.max(-40, Math.min(y, H + 40 - h));
  return { x, y, w, h };
}

function useFlight(target: Box, ms = 620): Box {
  const [box, setBox] = useState(target);
  const from = useRef(target);
  const goal = useRef(target);
  const raf = useRef(0);
  const current = useRef(target);
  current.current = box;

  useEffect(() => {
    const same = goal.current.x === target.x && goal.current.y === target.y
      && goal.current.w === target.w && goal.current.h === target.h;
    if (same) return undefined;
    goal.current = target;
    from.current = current.current;
    const start = typeof performance !== 'undefined' ? performance.now() : 0;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame !== 'function') { setBox(target); return undefined; }
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      const a = from.current;
      setBox({
        x: a.x + (target.x - a.x) * e,
        y: a.y + (target.y - a.y) * e,
        w: a.w + (target.w - a.w) * e,
        h: a.h + (target.h - a.h) * e,
      });
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target.x, target.y, target.w, target.h, ms]);

  return box;
}

/* --- where each country is, computed once and kept ------------------------- */
interface CountryGeo { shapeId: string | null; point: [number, number] | null }
const geoCache = new Map<string, CountryGeo>();
const geoOf = (countryId: string): CountryGeo => {
  const cached = geoCache.get(countryId);
  if (cached) return cached;
  /* Kosovo has no numeric code; the light atlas files its shape under "XK". */
  const shapeId = getCountryShapeId(countryId) ?? (lightHasCountry(countryId) ? countryId : null);
  let point = shapeId ? getCountryLabelPoint(shapeId) : null;
  if (!point) {
    const position = getCountryPosition(countryId);
    point = position ? projectLonLat(position.longitude, position.latitude) : null;
  }
  const geo = { shapeId, point };
  geoCache.set(countryId, geo);
  return geo;
};
const pathOf = (countryId: string): string => {
  const { shapeId } = geoOf(countryId);
  return shapeId && lightHasCountry(shapeId) ? lightCountryPath(shapeId) : '';
};

const REGION_BOX = new Map<string, Box>(REGION_MAP_OVERLAYS.map(region => [region.id, boxFromLonLat(region.fitBox)]));

/* The shared overlays list numeric shape ids, and Kosovo has none, so Europe
   would carry a Kosovo-shaped hole without it. */
const regionKeysOf = (region: typeof REGION_MAP_OVERLAYS[number]): string[] => (
  region.id === 'EUROPE' ? [...region.countryIds, 'XK'] : region.countryIds
);

/* Land that is no market at all: Greenland, Western Sahara, the Falklands,
   Puerto Rico, New Caledonia, the French Southern Lands. Grey land elsewhere
   is open ground you could enter; these never can be, so they are drawn a
   shade quieter and never read as somewhere you are missing. */
let noMarketLand: string | null = null;
const noMarketLandPath = (): string => {
  if (noMarketLand === null) {
    noMarketLand = lightLandOutside(
      WORLD_COUNTRY_DEFINITIONS.map(definition => geoOf(definition.id).shapeId).filter((key): key is string => Boolean(key)),
    );
  }
  return noMarketLand;
};

/** A country's drawn shape ('' for island states too small to draw). */
export const countryPathOf = pathOf;
/** A country's shape key in the light atlas, and the point its label sits on. */
export const countryGeoOf = geoOf;
/** The atlas camera, shared with the Platform room's network map. */
export { boxFromLonLat as atlasBoxFromLonLat, fitBox as atlasFitBox, useFlight as useAtlasFlight, W as ATLAS_W, H as ATLAS_H };
export type { Box as AtlasBox };

/** A continent as its own small picture: its merged silhouette, the box the
    Build camera frames it with, and the region's accent from the shared atlas. */
const regionShapeCache = new Map<string, { path: string; viewBox: string; accent: string }>();
export const regionShapeOf = (regionId: AtlasRegionId): { path: string; viewBox: string; accent: string } | null => {
  const cached = regionShapeCache.get(regionId);
  if (cached) return cached;
  const overlay = REGION_MAP_OVERLAYS.find(region => region.id === regionId);
  const box = REGION_BOX.get(regionId);
  if (!overlay || !box) return null;
  /* Greenland belongs to Europe in the shared atlas, but in a small tile only a
     cropped slab of it fits, which reads as a smudge rather than a place. */
  const ids = regionId === 'EUROPE' ? regionKeysOf(overlay).filter(id => id !== '304') : regionKeysOf(overlay);
  const shape = { path: lightMergedPath(ids), viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`, accent: overlay.accent };
  regionShapeCache.set(regionId, shape);
  return shape;
};

/** The map's fixed geometry (the light world, quiet land, every country's
    position, the region shapes), built ahead of time in small steps. Each step
    is pure and cached, so the HQ runs one per idle slot and the first tap into
    the Audience room finds it ready instead of paying for it. */
export const AUDIENCE_ATLAS_WARMUP: ReadonlyArray<() => void> = [
  () => { lightWorld(); },
  () => { noMarketLandPath(); },
  () => { WORLD_COUNTRY_DEFINITIONS.forEach(definition => geoOf(definition.id)); },
  () => {
    REGION_MAP_OVERLAYS.forEach(region => {
      lightMergedPath(regionKeysOf(region));
      regionShapeOf(region.id as AtlasRegionId);
    });
  },
];

/* The light on a country. Area, not radius, follows the number, so a country
   with four times the audience looks four times as big, not sixteen. */
const radiusPx = (value: number, max: number, minPx: number, maxPx: number): number => (
  value <= 0 || max <= 0 ? 0 : minPx + (maxPx - minPx) * Math.sqrt(Math.min(1, value / max))
);

/* Open water beside each continent: the Pacific off California, off Peru, the
   Atlantic off Ireland and off West Africa, the Indian Ocean, the Tasman Sea. */
const REGION_LABEL_LONLAT: Record<AtlasRegionId, [number, number]> = {
  NORTH_AMERICA: [-126, 27],
  SOUTH_AMERICA: [-104, -12],
  EUROPE: [-24, 55],
  AFRICA: [-14, -4],
  ASIA: [88, 3],
  OCEANIA: [157, -21],
};

const OPENING_TONE = '#f5b544';
const PAUSED_TONE = '#ff6b6b';

/* Country labels inside a region (see `regionLabels`): their type sizes in
   screen pixels, an estimate of how wide a string sets (Archivo 800 with its
   tracking; Anton's narrow figures), and the overlap test. */
const LABEL_NAME_PX = 8.5;
const LABEL_VALUE_PX = 10;
type LabelRect = { x: number; y: number; w: number; h: number };
const labelNameWidth = (text: string): number => text.length * LABEL_NAME_PX * 0.68;
const labelValueWidth = (text: string): number => text.length * LABEL_VALUE_PX * 0.5;
const rectsOverlap = (a: LabelRect, b: LabelRect): boolean => (
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
);
/** How wide a chip on the picture sets: per-character advance plus its icon and padding. */
const chipWidth = (text: string, perChar: number, extra: number): number => (text ? text.length * perChar + extra : 0);

/* The key in the top corner, per mode. Rendered from here, and measured from
   here so country labels keep clear of it. */
type LegendItem = { key: 'keyLive' | 'keyLight' | 'keyViewer' | 'keyOpening' | 'keyPicked'; label: string };
const LEGEND: Record<AtlasMode, LegendItem[]> = {
  PLATFORM: [{ key: 'keyLive', label: 'Live' }, { key: 'keyLight', label: 'Your accounts' }],
  MARKET: [{ key: 'keyViewer', label: "Viewers · leader's colour" }],
  OPERATIONS: [{ key: 'keyLive', label: 'Live' }, { key: 'keyOpening', label: 'On its way' }],
};
const PICKED_KEY: LegendItem = { key: 'keyPicked', label: 'Picked' };

/* How many lights the world view keeps (and its hard ceiling), and the most a
   single region draws. See `lights` below. */
const WORLD_LIGHTS = 14;
const WORLD_LIGHTS_MAX = 24;
const REGION_LIGHTS_MAX = 60;

/* The world itself: sea, shelf, relief and land, exactly as the Build map draws
   them. It never changes, so it is its own memoised layer — a camera move or a
   new number repaints the markets and lights, not the whole planet's diffing. */
export const AtlasWorld = React.memo(function AtlasWorld({ uid, onSea }: { uid: string; onSea: () => void }) {
  const world = lightWorld();
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-ocean`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="48%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <radialGradient id={`${uid}-vignette`} cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="#082f49" stopOpacity="0" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`${uid}-ground`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d3dae3" />
          <stop offset="55%" stopColor="#a9b4c2" />
          <stop offset="100%" stopColor="#8d99a9" />
        </linearGradient>
      </defs>
      {/* the sea — also the way back out */}
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${uid}-ocean)`} className={css.sea} onClick={onSea} />
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill={`url(#${uid}-vignette)`} pointerEvents="none" />
      <path d={WORLD_GRATICULE_PATH} className={css.grid} vectorEffect="non-scaling-stroke" />
      <g className={css.shelf}>
        <path d={world.shelf} strokeWidth={16} style={{ ['--o' as string]: '0.07' }} vectorEffect="non-scaling-stroke" />
        <path d={world.shelf} strokeWidth={8} style={{ ['--o' as string]: '0.1' }} vectorEffect="non-scaling-stroke" />
        <path d={world.shelf} strokeWidth={3} style={{ ['--o' as string]: '0.15' }} vectorEffect="non-scaling-stroke" />
      </g>
      <path d={world.land} className={css.relief} transform="translate(0,7)" />
      <path d={world.land} className={cx(css.relief, css.reliefDeep)} transform="translate(0,12)" />
      <path d={world.land} fill={`url(#${uid}-ground)`} pointerEvents="none" />
      <path d={noMarketLandPath()} className={css.landQuiet} />
    </>
  );
});

/* ========================================================================== */

export const AudienceAtlas = React.memo(function AudienceAtlas({
  mode, countries, regions, accent, focusRegion, selectedCountryId, picked, audienceKind = 'ACCOUNTS',
  onFocusRegion, onSelectCountry, reading, aside, gauge,
}: AudienceAtlasProps) {
  const uid = useId().replace(/:/g, '');
  const frame = useRef<SVGSVGElement>(null);
  const [frameSize, setFrameSize] = useState({ w: 347, h: 214 });
  useEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setFrameSize({ w: width, h: height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const aspect = frameSize.w / frameSize.h;

  const target = useMemo(() => (
    focusRegion && REGION_BOX.has(focusRegion) ? fitBox(REGION_BOX.get(focusRegion)!, aspect) : fitBox(WORLD_BOX, aspect)
  ), [aspect, focusRegion]);
  const box = useFlight(target);
  /* Map units per screen pixel, so markers keep their size while the camera moves. */
  const unit = box.w / Math.max(1, frameSize.w);

  /* The region silhouettes are the tap targets for "fly there". Their labels
     sit on the sea beside each continent, as annotations, so a region's total
     never lands on top of a country's light. */
  const regionHits = useMemo(() => REGION_MAP_OVERLAYS.map(region => {
    const anchor = REGION_LABEL_LONLAT[region.id as AtlasRegionId] ?? region.labelLonLat;
    return {
      id: region.id as AtlasRegionId,
      path: lightMergedPath(regionKeysOf(region)),
      label: projectLonLat(anchor[0], anchor[1]),
    };
  }), []);

  const regionById = useMemo(() => new Map(regions.map(region => [region.id, region])), [regions]);

  /* --- what is drawn on the land, per mode ------------------------------- */
  const painted = useMemo(() => {
    if (mode === 'MARKET') return countries.filter(country => country.state === 'LIVE');
    return countries.filter(country => country.state !== 'AVAILABLE');
  }, [countries, mode]);

  /* Your markets as one merged shape per state rather than a path per country:
     197 detailed country outlines cost a frame each time the map mounts, one
     merged territory per state costs the same as a single country.
     audienceAtlasGeometry caches each merge by its id list, so a state only
     re-merges when its set of countries changes. Island states too small to
     draw get a marker (smaller in the world view, so they don't speckle it). */
  const territory = useMemo(() => {
    const ids: Record<'live' | 'opening' | 'paused', string[]> = { live: [], opening: [], paused: [] };
    const markers: Array<{ id: string; point: [number, number]; tone: 'live' | 'opening' | 'paused' }> = [];
    painted.forEach(country => {
      const tone = country.state === 'LIVE' ? 'live' : country.state === 'PAUSED' ? 'paused' : 'opening';
      const geo = geoOf(country.id);
      if (geo.shapeId && lightHasCountry(geo.shapeId)) ids[tone].push(geo.shapeId);
      else if (geo.point) markers.push({ id: country.id, point: geo.point, tone });
    });
    const merged = (list: string[]) => (list.length ? lightMergedPath(list) : '');
    return { live: merged(ids.live), opening: merged(ids.opening), paused: merged(ids.paused), markers };
  }, [painted]);

  /* Picked for entry: one merged shape, re-merged only when the pick changes. */
  const pickedTerritory = useMemo(() => {
    const ids: string[] = [];
    const markers: Array<{ id: string; point: [number, number] }> = [];
    picked?.forEach(id => {
      const geo = geoOf(id);
      if (geo.shapeId && lightHasCountry(geo.shapeId)) ids.push(geo.shapeId);
      else if (geo.point) markers.push({ id, point: geo.point });
    });
    return { path: ids.length ? lightMergedPath(ids) : '', markers };
  }, [picked]);
  const legendItems = useMemo(() => (
    mode === 'OPERATIONS' && picked && picked.size > 0 ? [...LEGEND.OPERATIONS, PICKED_KEY]
      : mode === 'PLATFORM' ? [LEGEND.PLATFORM[0], { ...LEGEND.PLATFORM[1], label: AUDIENCE_WORDS[audienceKind].legend }]
        : LEGEND[mode]
  ), [audienceKind, mode, picked]);

  /* Which countries get a light. In the world view only the ones that carry the
     picture: the biggest dozen or so, plus any at least 4% the size of the
     leader. With 197 live markets a light on every one turns the map into
     confetti, and the rest already read as your territory. Inside a region
     every country with an audience is lit, sized against that region's leader. */
  const lights = useMemo(() => {
    if (mode === 'OPERATIONS') return [];
    const valueOf = (country: AtlasCountry) => (mode === 'PLATFORM' ? country.view.playerAudience : country.view.activeViewers);
    /* Biggest first, so small lights sit on top of large ones and stay tappable. */
    const rows = countries
      .filter(country => (!focusRegion || country.regionId === focusRegion) && valueOf(country) > 0)
      .sort((left, right) => valueOf(right) - valueOf(left));
    const max = rows.length ? valueOf(rows[0]) : 0;
    const kept = focusRegion
      ? rows.slice(0, REGION_LIGHTS_MAX)
      : rows.filter((country, rank) => rank < WORLD_LIGHTS || valueOf(country) >= max * 0.04).slice(0, WORLD_LIGHTS_MAX);
    return kept
      .map(country => {
        const geo = geoOf(country.id);
        if (!geo.point) return null;
        const leader = country.view.platformHouseholds[0];
        const color = mode === 'PLATFORM' ? accent : (leader?.id === 'PLAYER' ? accent : leader?.color || '#e8eef6');
        return { country, point: geo.point, value: valueOf(country), share: valueOf(country) / Math.max(1, max), color };
      })
      .filter(Boolean) as Array<{ country: AtlasCountry; point: [number, number]; value: number; share: number; color: string }>;
  }, [accent, countries, focusRegion, mode]);

  const maxLightPx = focusRegion ? 17 : 12;
  const minLightPx = focusRegion ? 2.6 : 1.8;
  /* A slow ring on the strongest few, so the map reads as alive without
     animating every country on it. */
  const pulsing = useMemo(() => new Set(lights.slice(0, mode === 'PLATFORM' ? 6 : 4).map(light => light.country.id)), [lights, mode]);

  const focusCountries = useMemo(() => (
    focusRegion ? countries.filter(country => country.regionId === focusRegion) : []
  ), [countries, focusRegion]);

  /* In a region, name the countries that matter most there, each set around
     its own light: name above and figure below, or both beside it, whichever
     is free. A label that would land on another label, on a neighbour's light,
     on the map's chips or on the reading is moved, or left out, so nothing on
     the picture overlaps. Laid out in screen pixels against where the camera
     is heading, then written back in map units. */
  const focusLabel = focusRegion ? regionById.get(focusRegion)?.label ?? REGION_SHORT_LABELS[focusRegion] : null;
  const readingText = useMemo(() => ({ value: reading.value, caption: reading.caption }), [reading.caption, reading.value]);
  const asideText = useMemo(() => (aside ? { value: aside.value, caption: aside.caption } : null), [aside?.caption, aside?.value]);
  const regionLabels = useMemo(() => {
    if (!focusRegion) return [];
    const valueOf = (country: AtlasCountry) => (
      mode === 'PLATFORM' ? country.view.playerAudience
        : mode === 'MARKET' ? country.view.activeViewers
          : (country.state === 'AVAILABLE' ? 0 : 1 + country.view.activeViewers / 1e9)
    );
    const candidates = focusCountries
      .filter(country => valueOf(country) > 0)
      .sort((left, right) => valueOf(right) - valueOf(left))
      .slice(0, 9)
      .map(country => ({ country, point: geoOf(country.id).point!, value: valueOf(country) }))
      .filter(item => item.point);
    const fw = frameSize.w;
    const fh = frameSize.h;
    const u = target.w / Math.max(1, fw);
    const toScreen = (point: [number, number]): [number, number] => [(point[0] - target.x) / u, (point[1] - target.y) / u];
    const toMap = (point: [number, number]): [number, number] => [target.x + point[0] * u, target.y + point[1] * u];
    const lightOf = new Map<string, number>(lights.map(light => [light.country.id, light.value]));
    const lightMax = lights[0]?.value ?? 0;
    const radiusOf = (countryId: string): number => (
      lightOf.has(countryId) ? Math.max(1.2, radiusPx(lightOf.get(countryId)!, lightMax, minLightPx, maxLightPx)) : 3
    );
    /* What is laid over the picture, measured from its own text: the World /
       region chip, each key chip, the reading and its answer. */
    const chrome: LabelRect[] = [
      { x: 0, y: 0, w: 9 + 4 + chipWidth('World', 7.4, 18) + chipWidth(focusLabel ?? '', 7.4, 18) + 6, h: 38 },
      ...legendItems.map((item, row) => {
        const w = chipWidth(item.label, 6.4, 27) + 6;
        return { x: fw - 10 - w, y: 7 + row * 21, w: w + 10, h: 23 };
      }),
      { x: 0, y: fh - 56, w: 18 + Math.max(readingText.value.length * 13.5, readingText.caption.length * 6.6), h: 56 },
      ...(asideText ? [{ x: fw - 18 - Math.max(asideText.value.length * 10, asideText.caption.length * 6.6), y: fh - 50, w: 18 + Math.max(asideText.value.length * 10, asideText.caption.length * 6.6), h: 50 }] : []),
    ];
    const discs = candidates.map(item => {
      const [sx, sy] = toScreen(item.point);
      const r = radiusOf(item.country.id);
      return { id: item.country.id, rect: { x: sx - r, y: sy - r, w: r * 2, h: r * 2 } };
    });
    const inFrame = (rect: LabelRect) => rect.x >= 4 && rect.y >= 4 && rect.x + rect.w <= fw - 4 && rect.y + rect.h <= fh - 4;
    const placed: Array<{ country: AtlasCountry; name: string; valueText: string; anchor: 'middle' | 'start' | 'end'; nameAt: [number, number]; valueAt: [number, number]; rects: LabelRect[] }> = [];
    for (const item of candidates) {
      if (placed.length >= 5) break;
      const [sx, sy] = toScreen(item.point);
      const name = item.country.name.length > 16 ? `${item.country.name.slice(0, 15)}…` : item.country.name;
      const valueText = mode === 'OPERATIONS' ? '' : compact(item.value);
      const r = radiusOf(item.country.id);
      const nw = labelNameWidth(name);
      const vw = valueText ? labelValueWidth(valueText) : 0;
      const side = (anchor: 'start' | 'end') => {
        const x = anchor === 'start' ? sx + r + 5 : sx - r - 5;
        const left = (width: number) => (anchor === 'start' ? x : x - width);
        return {
          anchor,
          nameAt: [x, sy - 1] as [number, number],
          valueAt: [x, sy + LABEL_VALUE_PX + 1] as [number, number],
          rects: [
            { x: left(nw), y: sy - 1 - LABEL_NAME_PX, w: nw, h: LABEL_NAME_PX + 1 },
            ...(vw ? [{ x: left(vw), y: sy + 1, w: vw, h: LABEL_VALUE_PX }] : []),
          ],
        };
      };
      /* Both lines on one side of the light: under it, or over it. */
      const stack = (below: boolean) => {
        const nameBase = below ? sy + r + 4 + LABEL_NAME_PX : sy - r - 4 - (vw ? LABEL_VALUE_PX + 2 : 0);
        const valueBase = below ? nameBase + 2 + LABEL_VALUE_PX : sy - r - 4;
        return {
          anchor: 'middle' as const,
          nameAt: [sx, nameBase] as [number, number],
          valueAt: [sx, valueBase] as [number, number],
          rects: [
            { x: sx - nw / 2, y: nameBase - LABEL_NAME_PX, w: nw, h: LABEL_NAME_PX + 1 },
            ...(vw ? [{ x: sx - vw / 2, y: valueBase - LABEL_VALUE_PX, w: vw, h: LABEL_VALUE_PX + 1 }] : []),
          ],
        };
      };
      const options = [
        {
          anchor: 'middle' as const,
          nameAt: [sx, sy - r - 4] as [number, number],
          valueAt: [sx, sy + r + 4 + LABEL_VALUE_PX] as [number, number],
          rects: [
            { x: sx - nw / 2, y: sy - r - 4 - LABEL_NAME_PX, w: nw, h: LABEL_NAME_PX + 1 },
            ...(vw ? [{ x: sx - vw / 2, y: sy + r + 4, w: vw, h: LABEL_VALUE_PX + 1 }] : []),
          ],
        },
        side('start'),
        side('end'),
        stack(true),
        stack(false),
      ];
      const obstacles = [...chrome, ...placed.flatMap(label => label.rects), ...discs.filter(disc => disc.id !== item.country.id).map(disc => disc.rect)];
      const fit = options.find(option => option.rects.every(rect => inFrame(rect) && !obstacles.some(other => rectsOverlap(rect, other))));
      if (!fit) continue;
      placed.push({ country: item.country, name, valueText, anchor: fit.anchor, nameAt: toMap(fit.nameAt), valueAt: toMap(fit.valueAt), rects: fit.rects });
    }
    return placed;
  }, [asideText, focusCountries, focusLabel, focusRegion, frameSize.h, frameSize.w, legendItems, lights, maxLightPx, minLightPx, mode, readingText, target]);

  /* Clicks on the sea come back out. Kept stable so the world layer never re-renders. */
  const seaAction = useRef<() => void>(() => undefined);
  seaAction.current = () => { if (focusRegion) onFocusRegion(null); };
  const onSea = useCallback(() => seaAction.current(), []);

  const fontPx = (px: number) => px * unit;
  const regionValue = (region: AtlasRegionSummary | undefined): { value: string; muted: boolean; pending?: boolean } => {
    if (!region) return { value: '—', muted: true };
    if (mode === 'PLATFORM') return { value: region.playerAudience > 0 ? compact(region.playerAudience) : '—', muted: region.playerAudience <= 0 };
    if (mode === 'MARKET') return { value: compact(region.activeViewers), muted: false };
    /* Your markets in the region; amber while none of them is live yet. */
    const count = region.live + region.opening;
    return { value: count > 0 ? String(count) : '—', muted: count === 0, pending: region.live === 0 && region.opening > 0 };
  };

  return (
    <div className={css.atlas} style={{ ['--atlas-accent' as string]: accent }}>
      <svg
        ref={frame}
        className={css.atlasSvg}
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid slice"
        role="group"
        aria-label={focusLabel ? `${focusLabel} map` : 'World audience map'}
      >
        <AtlasWorld uid={uid} onSea={onSea} />

        {/* your territory: one merged shape per state, washed and edged as in Build */}
        <g className={css.markets}>
          {territory.opening && <path d={territory.opening} className={cx(css.market, css.market_opening)} vectorEffect="non-scaling-stroke" />}
          {territory.paused && <path d={territory.paused} className={cx(css.market, css.market_paused)} vectorEffect="non-scaling-stroke" />}
          {territory.live && <path d={territory.live} className={cx(css.market, css.market_live, mode === 'MARKET' && css.marketQuiet)} vectorEffect="non-scaling-stroke" />}
          {territory.markers.map(marker => (
            <circle key={marker.id} cx={marker.point[0]} cy={marker.point[1]} r={(focusRegion ? 3.4 : 2.4) * unit}
              className={cx(css.market, css[`market_${marker.tone}`])} vectorEffect="non-scaling-stroke" />
          ))}
          {pickedTerritory.path && <path d={pickedTerritory.path} className={cx(css.market, css.market_picked)} vectorEffect="non-scaling-stroke" />}
          {pickedTerritory.markers.map(marker => (
            <circle key={marker.id} cx={marker.point[0]} cy={marker.point[1]} r={(focusRegion ? 3.8 : 2.8) * unit}
              className={cx(css.market, css.market_picked)} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        {/* every country's edge, over the territory, so it still reads as countries */}
        <path d={lightWorld().borders} className={css.coast} vectorEffect="non-scaling-stroke" />

        {/* the selected country, held in a white edge */}
        {selectedCountryId && pathOf(selectedCountryId) && (
          <path d={pathOf(selectedCountryId)} className={css.selected} vectorEffect="non-scaling-stroke" />
        )}

        {/* lights: the audience, sized by how many */}
        {lights.length > 0 && (
          <g className={css.lights}>
            {lights.map(light => {
              const r = radiusPx(light.value, lights[0].value, minLightPx, maxLightPx) * unit;
              return (
                <g key={light.country.id} className={css.light} style={{ ['--tone' as string]: light.color }}>
                  <circle cx={light.point[0]} cy={light.point[1]} r={r * 1.85} className={css.lightGlow} />
                  <circle cx={light.point[0]} cy={light.point[1]} r={Math.max(r, 1.2 * unit)} className={css.lightCore} strokeWidth={0.9 * unit} />
                  {r > 3 * unit && <circle cx={light.point[0] - r * 0.28} cy={light.point[1] - r * 0.28} r={r * 0.3} className={css.lightSpark} />}
                </g>
              );
            })}
          </g>
        )}

        {/* labels: regions in the world view, countries inside a region */}
        <g className={css.labels} aria-hidden="true" style={{ strokeWidth: 2.8 * unit }}>
          {!focusRegion && regionHits.map(region => {
            if (!region.label) return null;
            const { value, muted, pending } = regionValue(regionById.get(region.id));
            return (
              <g key={region.id} className={cx(css.regionLabel, muted && css.regionLabelMuted)}>
                {!muted && <text x={region.label[0]} y={region.label[1] - fontPx(3)} fontSize={fontPx(13)} className={cx(css.labelValue, pending && css.labelValuePending)} textAnchor="middle">{value}</text>}
                <text x={region.label[0]} y={region.label[1] + fontPx(muted ? 3 : 9)} fontSize={fontPx(7.5)} className={css.labelName} textAnchor="middle">{REGION_SHORT_LABELS[region.id]}</text>
              </g>
            );
          })}
          {focusRegion && regionLabels.map(label => (
            <g key={label.country.id} className={css.countryLabel}>
              <text x={label.nameAt[0]} y={label.nameAt[1]} fontSize={fontPx(LABEL_NAME_PX)} className={css.labelName} textAnchor={label.anchor}>{label.name}</text>
              {label.valueText && (
                <text x={label.valueAt[0]} y={label.valueAt[1]} fontSize={fontPx(LABEL_VALUE_PX)} className={css.labelValue} textAnchor={label.anchor}>{label.valueText}</text>
              )}
            </g>
          ))}
        </g>

        {/* hit areas: continents in the world view, countries inside one */}
        {!focusRegion ? (
          <g className={css.hits}>
            {regionHits.map(region => (
              <path key={region.id} d={region.path} onClick={() => onFocusRegion(region.id)} aria-label={`Show ${REGION_SHORT_LABELS[region.id]}`} />
            ))}
          </g>
        ) : (
          <g className={css.hits}>
            {focusCountries.map(country => {
              const path = pathOf(country.id);
              const point = geoOf(country.id).point;
              return path
                ? <path key={country.id} d={path} onClick={() => onSelectCountry(country.id)} aria-label={country.name} />
                : point ? <circle key={country.id} cx={point[0]} cy={point[1]} r={9 * unit} onClick={() => onSelectCountry(country.id)} aria-label={country.name} /> : null;
            })}
          </g>
        )}
      </svg>

      {/* The slow rings live in an overlay of their own, on their own layer, so
          their animation never repaints the map underneath. */}
      {pulsing.size > 0 && (
        <svg className={css.atlasPulse} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {lights.filter(light => pulsing.has(light.country.id)).map(light => {
            const r = radiusPx(light.value, lights[0].value, minLightPx, maxLightPx) * unit;
            return <circle key={light.country.id} cx={light.point[0]} cy={light.point[1]} r={r * 1.15} className={css.lightRing} style={{ ['--tone' as string]: light.color }} />;
          })}
        </svg>
      )}

      {/* where you are, as the way back out — the Build map's chip */}
      <nav className={css.crumb} aria-label="Map scope">
        <button type="button" className={!focusRegion ? css.on : ''} onClick={() => onFocusRegion(null)}>World</button>
        {focusLabel && <button type="button" className={css.on} aria-current="true">{focusLabel}</button>}
      </nav>

      <div className={css.legend} aria-hidden="true">
        {legendItems.map(item => <span key={item.label}><i className={css[item.key]} />{item.label}</span>)}
      </div>

      {/* the reading, written on the picture */}
      <div className={css.read}>
        <span className={css.readSide}>
          <b className={reading.tone ? css[`tone_${reading.tone}`] : ''}>{reading.value}</b>
          <em>{reading.caption}</em>
        </span>
        {aside && (
          <span className={cx(css.readSide, css.readEnd)}>
            <b className={aside.tone ? css[`tone_${aside.tone}`] : ''}>{aside.value}</b>
            <em>{aside.caption}</em>
          </span>
        )}
        {typeof gauge === 'number' && (
          <span className={css.gauge} role="img" aria-label={`${Math.round(gauge * 100)} percent`}>
            <s style={{ width: `${Math.max(0, Math.min(100, gauge * 100))}%` }} />
          </span>
        )}
      </div>
    </div>
  );
});

export { OPENING_TONE, PAUSED_TONE };
