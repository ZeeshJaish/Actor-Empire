/* ============================================================================
   THE NETWORK ATLAS — the fixed thing at the top of the Network page.

   The shared Production House atlas answers "where shall we shoot this?" and
   is drawn for that: every country tinted by continent, every place labelled,
   the whole world equally loud. This page asks a different question — "who am
   I opening to, and how much of them do I actually reach?" — so it draws a
   different picture on the same geometry.

   Four rules, and they are the whole design:

     · The markets you are opening in are SOLID. Everything else is a hairline.
       One glance says which places are yours to answer for.
     · Reach is a FILL, not a dot. Every room throws a field across the land
       around it; the fields merge, and the merged shape is your coverage. Add
       a rack and the shape grows — you watch the map take more ground.
     · What a room is FOR changes the shape of its field. A fast cache pulls
       the field in tight and bright over one city; a region relay spreads it
       thin and wide. That is the difference between the two, drawn, rather
       than two numbers in a table.
     · Nothing is decoration. Every shape on this map is a figure from the
       draft, and if the figure is zero the shape is not drawn.

   The geometry is the game's own — same topology, same projection, same
   1000×520 drawing space as every other map in Actor Empire — so this is a
   presentation of the shared world, not a second world.
   ========================================================================== */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  WORLD_BORDERS_PATH,
  WORLD_COUNTRY_BY_ID,
  WORLD_COUNTRY_NUMERIC_BY_ALPHA2,
  WORLD_GRATICULE_PATH,
  WORLD_LAND_PATH,
  WORLD_PATH,
  WORLD_SHELF_PATH,
  getRegionGeometry,
  projectLonLat,
} from '../../../../views/lifestyle/business/components/worldMapDetailedGeometry';
import { REGION_MAP_OVERLAYS } from '../../../../services/regionMap';
import type {
  BuildData, BuildDraft, City, CountryService, Facility,
} from '../../finance/build';
import { SERVER_TIERS, computeRacks, facilityReachFactor, facilityRacks, tiersOf } from '../../finance/build';
import type { ServerTier } from '../../finance/build';
import { getPlaceByListingId } from '../../../../services/streamingSitePlaces';
import { FIBRE_STANDARD_AT_LAUNCH, fibreMultiplier } from '../../../../services/streamingFibreLadder';
import {
  capacityFactor,
  demandInsideBase,
  effectiveReachKm,
  servedBand,
  type ReachSource,
  type ReachTarget,
} from '../../../../services/streamingNetworkReach';

/* --- the colour of a site --------------------------------------------------
   A city you hold is marked in a colour of its own, and the same colour marks
   it everywhere else on the page — its row in your network, its card in the
   rail. That is the whole association: the violet dot on the map and the
   violet row below it are one place, and you never have to read a name off a
   180px map to know which is which.

   Red and green are not in this list. Those two already mean something here —
   a market you are opening in, and ground you reach — and a site that happened
   to be assigned one would be making a claim it has no business making. */
const SITE_TONES = ['#a78bfa', '#22d3ee', '#f472b6', '#fb923c', '#60a5fa', '#e879f9', '#c4b5fd', '#5eead4'];

/** Which colour each held city wears, in the order you took them. Stable: it
    is keyed off the order rooms were added, so taking a second room in a city
    you already hold does not shuffle the map. */
export function siteTones(facilities: Array<{ cityId: string }>): Map<string, string> {
  const tones = new Map<string, string>();
  facilities.forEach(facility => {
    if (tones.has(facility.cityId)) return;
    tones.set(facility.cityId, SITE_TONES[tones.size % SITE_TONES.length]);
  });
  return tones;
}

/* The drawing space every path below is in. */
const W = 1000;
const H = 520;

/* The world view used to be the whole 1000x520 sheet, and the sheet is bigger
   than the world drawn on it: the land runs x 56-980, y 53-463, so a quarter of
   the box was empty paper — most of it dead Pacific west of Alaska, where no
   city in this game stands. The box is the land instead, trimmed to the west
   where nothing is and stopping just past Auckland at x 942.

   Everything else follows from this one rectangle: the frame is given its
   aspect so the world fills it exactly rather than being letterboxed inside
   it. */
const WORLD_BOX_X = 120;
const WORLD_BOX_Y = 48;
const WORLD_BOX_W = 870;
const WORLD_BOX_H = 420;
/** The shape the map frame should be, so a world view has no empty paper in it. */
export const WORLD_ASPECT = WORLD_BOX_W / WORLD_BOX_H;


/* --- reach ----------------------------------------------------------------
   A room throws a field. How far it carries, and what shape that field takes,
   is decided by how many racks are in it and what those racks are doing —
   which is the one thing this page is for. */

/** Kilometres a duty is worth reaching, per rack, and how tightly it focuses.
    `spread` above 1 widens and softens; below 1 pulls in and concentrates. */
/* The map drew its own copy of this, with the same seven spreads written out a
   second time. One table now, in the engine, so the field the map draws and the
   verdict the forecast reaches cannot describe different rooms. */

export interface AtlasField {
  cityId: string;
  x: number;
  y: number;
  /** Radius in projected units. */
  r: number;
  /** 0–1: how hard this field is drawn. */
  intensity: number;
  /** True while the room is a drawing rather than a built thing. */
  planned: boolean;
  /** Racks held back for live peaks, which the field shows as a second ring. */
  live: boolean;
  /** The field stopped because the racks ran out of capacity, not because there
      were too few of them to reach further. */
  capped?: boolean;
  /** 0–1: how well this field actually serves the ground it covers, as opposed
      to how far it throws. Range is the ring; this is what is solid inside it. */
  quality?: number;
}

/** Where a city lands on the map, or nothing. A city from an older save or a
    thin fixture may carry no `coord` at all — the map is drawn on every frame
    of this stage now, so one of those must leave a place undrawn rather than
    take the whole page down. */
function pointOf(city: Pick<City, 'coord'>): [number, number] | null {
  const lng = city.coord?.lng;
  const lat = city.coord?.lat;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return projectLonLat(lng as number, lat as number);
}

/** Roughly how many projected units a kilometre is at this projection's scale.
    geoNaturalEarth1 fitted to 1000 units wide puts a degree at about 2.8
    units, and a degree of longitude is about 111km at the equator. */
const UNITS_PER_KM = 2.8 / 111;

/* The field's colours: green at the room, yellow where reach is thin. */
const GREEN: [number, number, number] = [52, 211, 153];
const YELLOW: [number, number, number] = [250, 204, 90];
const rgb = (c: [number, number, number]): string => `rgb(${c.join(',')})`;

/** How far past its reach a field is brushed: a hair, so the edge is soft
    rather than a compass line. It was 1.5 (#110), which made the yellow band
    three times the area of the green core — the halo, not the core, was most
    of what a player saw, and six of them over a red market made one orange
    stain (#112). The halo is a rim on the core now, not a field around it. */
export const FIELD_WASH = 1.05;

/** The green core's own disc, a quarter wider than the served band so the
    gradient's soft edge lands exactly where a stream stops meeting the
    standard. `SERVED_BAND` is the reach model's, read once. */
export const CORE_SOFT = 1.25;

/** The fraction of a room's reach inside which a stream meets the standard. */
const SERVED_BAND = servedBand(FIBRE_STANDARD_AT_LAUNCH);

/** Each server wears its own shape on the map (#114), and the counters in the
    row below wear the same three, so a glance at the map says what is
    standing where: a Scout is an arrowhead, a Workhorse a square, a Titan a
    six-sided slab. Drawn in screen pixels like everything else in the pins
    group. */
export function tierMarkPath(tier: ServerTier, r: number): string {
  if (tier === 'SCOUT') return `M0 ${-r} L ${(r * 0.92).toFixed(2)} ${(r * 0.62).toFixed(2)} L ${(-r * 0.92).toFixed(2)} ${(r * 0.62).toFixed(2)} Z`;
  if (tier === 'TITAN') {
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${(Math.cos(angle) * r).toFixed(2)} ${(Math.sin(angle) * r).toFixed(2)}`;
    });
    return `M${points.join(' L')} Z`;
  }
  const side = r * 0.86;
  return `M${-side} ${-side} H${side} V${side} H${-side} Z`;
}

/** The field one room throws. The radius is the reach model's, so the ground
    this draws and the verdict the engine gives are the same arithmetic — a
    player can no longer watch green close over a country and then be told the
    country is unserved. What is decided here is only how it LOOKS: how hard
    the field is drawn, and whether it is a drawing or a built thing. */
export function fieldFor(
  city: City,
  facilities: Facility[],
  targets: ReachTarget[],
  /* The platform's fibre multiplier. The engine applies the same one; a field
     drawn without it would be the map and the forecast reading different
     ladders, which is the fault #77 closed. */
  fibre = 1,
): AtlasField | null {
  const point = pointOf(city);
  if (!point) return null;
  const racks = facilities.reduce((sum, facility) => sum + facilityRacks(facility), 0);
  if (racks <= 0) return null;

  /* The buildings these rooms are in, rack-weighted. The engine reads a room's
     own address, and if the map kept reading the city's the two would disagree
     about how far the same room throws — the fault #77 closed. */
  let transit = 0;
  let transitRacks = 0;
  let reach = 0;
  facilities.forEach(facility => {
    const place = getPlaceByListingId(facility.listingId);
    const racksHere = facilityRacks(facility);
    if (place) {
      transit += place.transit * racksHere;
      transitRacks += racksHere;
    }
    /* A cloud room reaches as far as its provider lets it; a building as far
       as the ladder does. Weighted by compute, like the transit. */
    reach += computeRacks(facility) * facilityReachFactor(facility);
  });
  const live = facilities.some(facility => (facility.groups || []).some(group => group.duty === 'LIVE' && group.racks > 0));
  const compute = facilities.reduce((sum, facility) => sum + computeRacks(facility), 0);

  const source: ReachSource = {
    cityId: city.id,
    lat: city.coord?.lat ?? 0,
    lng: city.coord?.lng ?? 0,
    /* Compute, not cabinets: two Titans throw further than two Scouts. */
    racks: compute,
    capacity: facilities.reduce((sum, facility) => (
      sum + (facility.groups || []).reduce((groupSum, group) => groupSum + (group.capacity || 0), 0)
    ), 0),
    spread: 1,
    transit: transitRacks > 0 ? transit / transitRacks : undefined,
    fibre: fibre * (compute > 0 ? reach / compute : 1),
  };
  /* How much stands in the room decides how strong its field is drawn, but
     never faintly: the placer spreads at two racks a city, so at 0.5 the
     floor (#109) every room on a wide network was drawn washed out and the
     country between them read tan instead of green (#112). */
  const intensity = Math.min(1, 0.74 + Math.min(1, source.racks / 16) * 0.26);
  /* The gate: a field may not claim more audience than the racks can carry. */
  const inside = demandInsideBase(source, targets);
  const km = effectiveReachKm(source, inside);

  return {
    cityId: city.id,
    x: point[0],
    y: point[1],
    r: Math.max(8, km * UNITS_PER_KM),
    intensity,
    planned: facilities.every(facility => !facility.built),
    live,
    /* True when capacity is what stopped it, not racks — the field would be
       wider if the machines in it could carry more. */
    capped: source.capacity > 0 && capacityFactor(source, inside) < 1,
    /* How much of the ring is actually solid. The duty mix's own smoothness,
       pulled down when the racks cannot carry what the field claims — so a
       relay thrown far on thin capacity reads as a wide ring with a small
       served core, which is the truth about it. Range shrinking was the only
       language the field had before, and range is what the ring already says. */
    quality: Math.max(0.12, Math.min(1, capacityFactor(source, inside))),
  };
}

/* --- the view -------------------------------------------------------------
   One box, moved. Choosing a region does not swap the picture for a different
   picture; it flies the same world so the ground you were looking at travels
   to where you are going. */

type Box = { x: number; y: number; w: number; h: number };

const WORLD_BOX: Box = { x: WORLD_BOX_X, y: WORLD_BOX_Y, w: WORLD_BOX_W, h: WORLD_BOX_H };

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

/** Fit a box to the frame's aspect without ever cropping what it was asked to
    show — it only ever grows the short side. */
function fitBox(box: Box, aspect: number): Box {
  const boxAspect = box.w / box.h;
  let { x, y, w, h } = box;
  if (boxAspect < aspect) { const next = h * aspect; x -= (next - w) / 2; w = next; }
  else { const next = w / aspect; y -= (next - h) / 2; h = next; }
  /* Never fly off the edge of the world. */
  x = Math.max(-40, Math.min(x, W + 40 - w));
  y = Math.max(-40, Math.min(y, H + 40 - h));
  return { x, y, w, h };
}

const REGION_BOX = new Map(REGION_MAP_OVERLAYS.map(region => [region.id, boxFromLonLat(region.fitBox)]));

/* Each region as one silhouette, merged from its real countries. Nothing is
   drawn with these — they are the hit areas that let you tap a continent to fly
   to it, and the sea behind them is what takes you back out. Hit testing the
   browser already does for free beats projecting the tap back into lon/lat and
   working out which polygon it landed in. */
const REGION_HIT = REGION_MAP_OVERLAYS.map(region => ({
  id: region.id as string,
  label: region.shortLabel,
  path: getRegionGeometry(region.countryIds).path,
}));

/** Where a city sits, as a box tight enough to read its neighbours. */
function cityBox(city: City): Box {
  const point = pointOf(city);
  if (!point) return WORLD_BOX;
  const w = 210;
  return { x: point[0] - w / 2, y: point[1] - (w * 0.52) / 2, w, h: w * 0.52 };
}

/** Ease a viewBox from wherever it is to wherever it is going, so the world
    travels instead of cutting. */
function useFlight(target: Box, ms = 620): Box {
  const [box, setBox] = useState(target);
  const from = useRef(target);
  const start = useRef(0);
  const raf = useRef(0);
  const goal = useRef(target);

  useEffect(() => {
    const same = goal.current.x === target.x && goal.current.y === target.y
      && goal.current.w === target.w && goal.current.h === target.h;
    if (same) return undefined;
    goal.current = target;
    from.current = box;
    start.current = performance.now();
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setBox(target); return undefined; }

    const tick = (now: number) => {
      const t = Math.min(1, (now - start.current) / ms);
      /* A camera move, not a bounce: out-cubic settles without overshoot. */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.y, target.w, target.h, ms]);

  return box;
}

/* --- the component --------------------------------------------------------- */

export interface NetworkAtlasProps {
  data: BuildData;
  draft: BuildDraft;
  services: CountryService[];
  /** Where the camera is pointed. */
  regionId?: string;
  cityId?: string;
  /** A city being previewed but not yet chosen — drawn as a ghost field so a
      player can see what a room there would take before taking it. */
  previewCityId?: string;
  previewRacks?: number;
  /* The city whose card is under your thumb in the rail below. It is named on
     the map while it is, and forgotten the moment you scroll past it. */
  focusCityId?: string;
  onSelectCity?: (cityId: string) => void;
  /* Tapping a continent flies to it; tapping the sea comes back out. */
  onSelectRegion?: (regionId: string) => void;
  onShowWorld?: () => void;
}

export function NetworkAtlas({
  data, draft, services, regionId, cityId, previewCityId, previewRacks = 0, focusCityId,
  onSelectCity, onSelectRegion, onShowWorld,
}: NetworkAtlasProps) {
  /* The frame measures itself. Being told its aspect meant the camera fitted a
     box for one shape and the SVG sliced it to another, so a region flight
     quietly cropped the coasts it had just been asked to show. */
  const frame = useRef<SVGSVGElement>(null);
  const [frameSize, setFrameSize] = useState({ w: 375, h: 234 });
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

  const cityById = useMemo(() => new Map(data.cities.map(city => [city.id, city])), [data.cities]);
  const tones = useMemo(() => siteTones(draft.facilities), [draft.facilities]);
  const countryById = useMemo(() => new Map(data.countries.map(country => [country.id, country])), [data.countries]);

  /* --- who you are opening to, and how well it is going ------------------- */
  const openingCountries = useMemo(() => data.countries.filter(country => country.opening), [data.countries]);
  const marketPaths = useMemo(() => openingCountries.flatMap(country => {
    const numeric = WORLD_COUNTRY_NUMERIC_BY_ALPHA2[country.code.toUpperCase()];
    const feature = numeric ? WORLD_COUNTRY_BY_ID.get(numeric) : undefined;
    const path = feature ? WORLD_PATH(feature) : null;
    if (!path) return [];
    return [{ id: country.id, code: country.code, name: country.name, path }];
  }), [openingCountries]);

  /* --- a market whose every person is served (#117) --------------------------
     The ground between the cities is empty, so no field reaches it and it
     keeps the market's red however well the market is served. That reads as
     unfinished when it is finished: at 100% there is nobody in this country
     the network does not serve. So the country itself turns green — not by
     degrees, which is the tint that was rightly rejected in #110 for turning
     a continent green off one room in New York, but at the end, once the
     forecast says every person counted here is served. Under 100% it is red,
     as it always was, and the fields over it say how far along you are. */
  const finished = useMemo(
    () => new Set(services.filter(service => (service.coveredShare ?? 0) >= 0.995).map(service => service.code.toUpperCase())),
    [services],
  );

  /* Where the audience is, so a field can be told when it has claimed more of
     it than the racks can carry. */
  const reachTargets = useMemo<ReachTarget[]>(() => data.markets.map(market => ({
    lat: market.coord?.lat ?? 0,
    lng: market.coord?.lng ?? 0,
    demand: market.demand,
    countryCode: market.code,
  })), [data.markets]);

  /* --- what you actually reach -------------------------------------------- */
  /* One reading of the ladder for every field on the map, from the same place
     the engine reads it. */
  const fibre = useMemo(() => fibreMultiplier(data.fibre), [data.fibre]);
  const fields = useMemo(() => {
    const byCity = new Map<string, Facility[]>();
    draft.facilities.forEach(facility => {
      const list = byCity.get(facility.cityId) ?? [];
      list.push(facility);
      byCity.set(facility.cityId, list);
    });
    return Array.from(byCity.entries()).flatMap(([id, facilities]) => {
      const city = cityById.get(id);
      if (!city) return [];
      const field = fieldFor(city, facilities, reachTargets, fibre);
      return field ? [field] : [];
    });
  }, [cityById, draft.facilities, reachTargets, fibre]);

  /* --- arrival (#107) --------------------------------------------------------
     A field that is new is drawn at nothing for one frame and then at its
     size, so the transition on `r` carries it out from the city the way a
     signal spreads; and a ring pings out from the city once, outside the
     blur, so the eye is taken to where the room landed. A field that is only
     growing — another rack in a city that had one — just grows. A room taken
     away and put back arrives again. In a static render nothing has arrived
     and nothing needs to: every field is drawn at its size. */
  const arrivedRef = useRef(new Set<string>());
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [pinging, setPinging] = useState<string[]>([]);
  const pingTimers = useRef<number[]>([]);
  const live = typeof window !== 'undefined';
  useEffect(() => {
    const present = new Set(fields.map(field => field.cityId));
    for (const id of Array.from(arrivedRef.current)) if (!present.has(id)) arrivedRef.current.delete(id);
    const fresh = fields.map(field => field.cityId).filter(id => !arrivedRef.current.has(id));
    if (fresh.length === 0) return undefined;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        fresh.forEach(id => arrivedRef.current.add(id));
        rerender();
        setPinging(prev => [...prev, ...fresh]);
        pingTimers.current.push(window.setTimeout(() => {
          setPinging(prev => prev.filter(id => !fresh.includes(id)));
        }, 1400));
      });
    });
    return () => { window.cancelAnimationFrame(first); window.cancelAnimationFrame(second); };
  }, [fields]);
  useEffect(() => () => { pingTimers.current.forEach(timer => window.clearTimeout(timer)); }, []);
  const drawnR = (field: AtlasField): number => (!live || arrivedRef.current.has(field.cityId) ? field.r : 0);

  /* The room you are about to take, drawn before you take it. This is the
     whole reason the map is fixed: you change a number down the page and the
     ground under the picture moves while you are still deciding. */
  const preview = useMemo<AtlasField | null>(() => {
    if (!previewCityId) return null;
    const city = cityById.get(previewCityId);
    if (!city) return null;
    const point = pointOf(city);
    if (!point) return null;
    const actual = previewRacks > 0 ? 520 + 340 * Math.sqrt(previewRacks) : 0;
    if (actual <= 0) return null;
    return {
      cityId: city.id, x: point[0], y: point[1],
      r: Math.max(0, actual * UNITS_PER_KM), intensity: 0.5, planned: true, live: false,
    };
  }, [cityById, previewCityId, previewRacks]);

  /* Which rooms are wired to which: each to its two nearest, deduped, and
     capped so a network of forty rooms does not draw eight hundred arcs. */
  const links = useMemo(() => {
    if (fields.length < 2) return [] as Array<{ id: string; d: string; planned: boolean }>;
    const seen = new Set<string>();
    const out: Array<{ id: string; d: string; planned: boolean; km: number }> = [];
    for (const from of fields) {
      const near = fields
        .filter(to => to.cityId !== from.cityId)
        .map(to => ({ to, km: Math.hypot(to.x - from.x, to.y - from.y) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 2);
      for (const { to, km } of near) {
        const id = [from.cityId, to.cityId].sort().join('~');
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ id, d: arc(from, to), planned: from.planned && to.planned, km });
      }
    }
    return out.sort((a, b) => a.km - b.km).slice(0, 48);
  }, [fields]);

  /* --- the camera ---------------------------------------------------------- */
  const target = useMemo(() => {
    const city = cityId ? cityById.get(cityId) : undefined;
    if (city) return fitBox(cityBox(city), aspect);
    if (regionId && REGION_BOX.has(regionId as never)) return fitBox(REGION_BOX.get(regionId as never)!, aspect);
    return fitBox(WORLD_BOX, aspect);
  }, [aspect, cityById, cityId, regionId]);
  const flown = useFlight(target);

  /* --- the camera you drive yourself --------------------------------------
     The rails below choose a place and the camera flies to it. Dragging and
     pinching take the camera off the rails for as long as you are holding it;
     choosing anything below puts it back. `manual` is that override, and it is
     cleared the moment the page chooses somewhere for you. */
  const [manual, setManual] = useState<Box | null>(null);
  useEffect(() => { setManual(null); }, [regionId, cityId]);
  const view = manual ?? flown;

  /* One pointer pans, two pinch. A tap is a pointer that barely moved, and it
     falls through to whatever it landed on — a pin, a continent, or the sea. */
  const gesture = useRef<{
    points: Map<number, { x: number; y: number }>;
    start: Box;
    from: { x: number; y: number };
    spread: number;
    moved: number;
    captured: boolean;
  } | null>(null);

  const clientToMap = useCallback((clientX: number, clientY: number, box: Box) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { x: box.x, y: box.y };
    return {
      x: box.x + ((clientX - rect.left) / rect.width) * box.w,
      y: box.y + ((clientY - rect.top) / rect.height) * box.h,
    };
  }, []);

  /* Never smaller than a city block, never bigger than the world, and never
     off the edge of it. */
  const clampBox = useCallback((box: Box): Box => {
    const w = Math.min(WORLD_BOX_W, Math.max(70, box.w));
    const h = w / (box.w / box.h);
    const x = Math.max(WORLD_BOX_X - 60, Math.min(box.x, WORLD_BOX_X + WORLD_BOX_W + 60 - w));
    const y = Math.max(WORLD_BOX_Y - 60, Math.min(box.y, WORLD_BOX_Y + WORLD_BOX_H + 60 - h));
    return { x, y, w, h };
  }, []);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = gesture.current ?? {
      points: new Map<number, { x: number; y: number }>(),
      start: view, from: { x: 0, y: 0 }, spread: 0, moved: 0, captured: false,
    };
    current.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const list = [...current.points.values()];
    current.start = view;
    current.from = list.length === 2
      ? { x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 }
      : { x: event.clientX, y: event.clientY };
    current.spread = list.length === 2 ? Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y) : 0;
    current.moved = 0;
    gesture.current = current;
    /* No pointer capture yet, deliberately. A captured pointer retargets its
       `click` to the element that captured it, so capturing on press sent every
       tap to the <svg> and the continent under the finger never heard it. The
       capture is taken below, the moment the gesture becomes a drag. */
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = gesture.current;
    if (!current || !current.points.has(event.pointerId)) return;
    current.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const list = [...current.points.values()];
    /* Once it is a drag it needs the capture, so the camera keeps following a
       finger that has left the frame. */
    const hold = () => {
      if (current.captured) return;
      current.captured = true;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* already gone */ }
    };
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const unitsPerPx = current.start.w / rect.width;

    if (list.length >= 2) {
      const spread = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
      if (current.spread > 0 && spread > 0) {
        const scale = current.spread / spread;
        const mid = { x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 };
        const anchor = clientToMap(mid.x, mid.y, current.start);
        const w = current.start.w * scale;
        const h = current.start.h * scale;
        current.moved += 8;
        hold();
        setManual(clampBox({
          x: anchor.x - ((anchor.x - current.start.x) / current.start.w) * w,
          y: anchor.y - ((anchor.y - current.start.y) / current.start.h) * h,
          w, h,
        }));
      }
      return;
    }

    const dx = event.clientX - current.from.x;
    const dy = event.clientY - current.from.y;
    current.moved = Math.max(current.moved, Math.hypot(dx, dy));
    if (current.moved < 5) return;
    hold();
    setManual(clampBox({
      x: current.start.x - dx * unitsPerPx,
      y: current.start.y - dy * unitsPerPx,
      w: current.start.w,
      h: current.start.h,
    }));
  };

  /* `click` fires after `pointerup`, by which time the gesture is already torn
     down — so asking the live gesture how far it moved always answered zero and
     every drag ended in a tap on whatever it finished over. The distance is
     kept past the end of the gesture instead. */
  const lastMoved = useRef(0);

  const endPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const current = gesture.current;
    if (!current) return;
    current.points.delete(event.pointerId);
    lastMoved.current = current.moved;
    if (current.points.size === 0) gesture.current = null;
  };

  /* A tap only counts as a tap if the camera did not move under it. */
  const tapped = () => lastMoved.current < 5;


  /* Wheel zoom, on a listener of our own (#118).

     React attaches `wheel` at the root as PASSIVE, so the `preventDefault`
     this needs never took: the browser logged "Unable to preventDefault
     inside passive event listener invocation" on every notch — 147 of them in
     one walk — and, worse, a wheel over the map zoomed the map AND scrolled
     the page under it. A native listener registered with `passive: false` is
     the only way to hold the gesture. */
  const wheelState = useRef({ view, clampBox });
  wheelState.current = { view, clampBox };
  useEffect(() => {
    const svg = frame.current;
    if (!svg) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { view: box, clampBox: clamp } = wheelState.current;
      const anchor = clientToMap(event.clientX, event.clientY, box);
      const scale = Math.exp(event.deltaY * 0.0016);
      const w = box.w * scale;
      const h = box.h * scale;
      setManual(clamp({
        x: anchor.x - ((anchor.x - box.x) / box.w) * w,
        y: anchor.y - ((anchor.y - box.y) / box.h) * h,
        w, h,
      }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [clientToMap]);

  /* Detail scales with the zoom, so a pin is the same size on the screen
     whether you are looking at the world or at one city. */
  const k = view.w / W;
  const hair = Math.max(0.22, 0.7 * k);

  /* --- screen space --------------------------------------------------------
     Pins and names are drawn in a group scaled by 1/pixelScale, so everything
     inside it is measured in screen pixels and NOTHING in it changes size when
     the camera moves. This is how the shared atlas does it, and it is the
     reason its names are always legible: drawn in map units instead, a name
     had to carry a font size and a halo that both shrank as the world grew,
     and at world zoom it was three grey pixels tall.

     A child coordinate c lands at c * s view units, and s * pixelScale = 1, so
     a child coordinate of 1 is exactly one pixel on the screen. */
  const pixelScale = frameSize.w / view.w;
  const toScreen = (value: number) => value * pixelScale;
  /* Where a point actually falls inside the frame, for fitting a name beside
     it without running off the edge. */
  const inFrameX = (x: number) => (x - view.x) * pixelScale;
  const inFrameY = (y: number) => (y - view.y) * pixelScale;


  /* --- the pins ------------------------------------------------------------ */
  const pins = useMemo(() => data.cities.flatMap(city => {
    const point = pointOf(city);
    if (!point) return [];
    const held = draft.facilities.filter(facility => facility.cityId === city.id);
    const racks = held.reduce((sum, facility) => sum + facilityRacks(facility), 0);
    const country = countryById.get(city.countryId);
    /* Which server this place is, in one shape: the tier with the most racks
       in it, cloud counted as the Workhorse compute it is sold as. */
    const stack = held.reduce<Record<ServerTier, number>>((sum, facility) => {
      const here = tiersOf(facility);
      return { SCOUT: sum.SCOUT + here.SCOUT, WORKHORSE: sum.WORKHORSE + here.WORKHORSE, TITAN: sum.TITAN + here.TITAN };
    }, { SCOUT: 0, WORKHORSE: 0, TITAN: 0 });
    const ranked = (['TITAN', 'WORKHORSE', 'SCOUT'] as ServerTier[])
      .filter(candidate => stack[candidate] > 0)
      .sort((a, b) => stack[b] - stack[a]);
    const tier = ranked[0] ?? 'WORKHORSE';
    return [{
      id: city.id,
      name: city.name,
      x: point[0],
      y: point[1],
      racks,
      tier,
      /* The second kind standing here, so a city of Titans and a squad of
         Workhorses says both (#115). */
      second: ranked[1],
      mixed: ranked.length > 1,
      held: held.length > 0,
      market: Boolean(country?.opening),
      regionId: country?.regionId,
      recommended: Boolean(city.recommended),
    }];
  }), [countryById, data.cities, draft.facilities]);

  /* --- which names are drawn, and on which side of their dot --------------
     Settled entirely in screen pixels, because that is where names collide:
     London and Paris overlap at city zoom, Toronto and New York at world zoom,
     and no zoom-derived number describes both. The places with something to
     say are placed first; anything that would land on a name already placed
     goes unlabelled rather than being drawn through it.

     A name sits BESIDE its dot, not above it, and flips to the other side when
     it would run off the frame — the shared atlas's rule, and the reason its
     names never trail off the edge. */
  const LABEL_PX = 10.5;
  const DOT_PX = 4.5;
  /* A dot is smaller the further out you are (#111): at world zoom twenty
     dots at full size are a rash over three continents, and the thing the
     player is reading there is the territory, not the addresses. Collision
     still uses the full size, so names never crowd. */
  const dotScale = 1 - 0.34 * Math.min(1, view.w / WORLD_BOX_W);

  /* Which places are marked at all. At world zoom, twenty-four dots in three
     clusters is a rash, not a map — half of them sit on top of each other and
     none of them can be tapped. A place is marked when you hold it, when you
     are opening in it, or when you are in its region; the rest appear as you
     travel. */
  /* A city with nothing in it is not marked. Before you have built anything
     the world is the markets you chose and nothing else — no constellation of
     dots for places you have not been, and no dots to read names off. Sites
     you hold are always marked; candidates appear only inside the region you
     are actually working in, which is where you are choosing between them. */
  /* #110: a dot is a room. Nothing is marked until a server stands there;
     candidates are not dots to read names off, they are where the placer
     may land the next one. */
  const rankOf = useCallback((pin: { id: string; held: boolean; regionId?: string }) => (
    pin.id === cityId || pin.id === previewCityId ? 0
      : pin.held ? 1
        : 4
  ), [cityId, previewCityId]);

  /* Marked places, and never two of them on the same few pixels. */
  const shownPins = useMemo(() => {
    const placed: Array<{ x: number; y: number }> = [];
    return [...pins]
      .filter(pin => rankOf(pin) < 4 || pin.id === focusCityId)
      .sort((a, b) => rankOf(a) - rankOf(b))
      .filter(pin => {
        const sx = inFrameX(pin.x);
        const sy = inFrameY(pin.y);
        if (placed.some(seen => Math.hypot(seen.x - sx, seen.y - sy) < DOT_PX * 2.6)) return false;
        placed.push({ x: sx, y: sy });
        return true;
      });
  }, [focusCityId, inFrameX, inFrameY, pins, rankOf]);

  /* --- which places are named ---------------------------------------------
     Almost none of them. Five names across a world view still lay "Rio de
     Janeiro" and "Los Angeles" across an ocean each, and on a map 180px tall
     that is most of the Atlantic spent on text a player can already read in
     the rail below.

     So a name is not a fixture of a place — it is what the map says about the
     ONE place you are attending to: the city you have chosen, the card under
     your thumb in the rail, or the room you are filling. At most two are ever
     on screen, and the map is otherwise dots and territory. */
  const named = useMemo(
    () => new Set([cityId, focusCityId, previewCityId].filter(Boolean) as string[]),
    [cityId, focusCityId, previewCityId],
  );

  const labelled = useMemo(() => {
    const placed: Array<{ x: number; y: number; w: number }> = [];
    return [...pins]
      .filter(pin => named.has(pin.id))
      .map(pin => ({ pin, sx: inFrameX(pin.x), sy: inFrameY(pin.y) }))
      .filter(({ sx, sy }) => sx > -40 && sx < frameSize.w + 40 && sy > -20 && sy < frameSize.h + 20)
      .flatMap(({ pin, sx, sy }) => {
        const width = pin.name.length * LABEL_PX * 0.58;
        const gap = DOT_PX + 6;
        const fitsRight = sx + gap + width <= frameSize.w - 8;
        const fitsLeft = sx - gap - width >= 8;
        if (!fitsRight && !fitsLeft) return [];
        const left = !fitsRight;
        /* The box the name will occupy, so the next one can avoid it. */
        const x0 = left ? sx - gap - width : sx + gap;
        if (placed.some(seen => x0 < seen.x + seen.w + 5 && x0 + width + 5 > seen.x
          && Math.abs(seen.y - sy) < LABEL_PX + 3)) return [];
        placed.push({ x: x0, y: sy, w: width });
        return [{ pin, left }];
      });
  }, [frameSize.h, frameSize.w, inFrameX, inFrameY, named, pins]);


  return (
    <svg
      ref={frame}
      className="bw-atlas"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid slice"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      role="group"
      aria-label={`Network map: ${fields.length} ${fields.length === 1 ? 'site' : 'sites'} against ${marketPaths.length} opening ${marketPaths.length === 1 ? 'market' : 'markets'}`}
    >
      <defs>
        {/* The merge that turns separate fields into one coverage shape. Blur
            then raise the contrast: overlapping fields fuse into a single
            territory instead of stacking into a pile of discs. */}
        <filter id="bw-field-merge" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={6 * k} result="soft" />
          {/* Crush the blurred alpha into a territory with an edge. The curve
              has to start below the faintest field on the page: at 15× it
              needed 0.37 alpha to show anything at all, so a planned room —
              drawn at 0.15 — was multiplied straight to nothing and the only
              thing left on the map was its outline. 0.12 in is the floor,
              0.32 is solid. */}
          <feColorMatrix
            in="soft"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -0.6"
          />
        </filter>
        {/* The sea, the vignette and the gloss are the game's own map, copied
            stop for stop from the shared atlas rather than approximated — this
            is the same ocean Greenlight shows. What is NOT copied is its land:
            there it is a green-to-teal gradient, and here land has to stay
            neutral so that red can mean "a market I am opening in" and green
            can mean "ground I actually reach". */}
        <linearGradient id="bw-atlas-ocean" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="48%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <radialGradient id="bw-atlas-vignette" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="#082f49" stopOpacity="0" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.5" />
        </radialGradient>
        <linearGradient id="bw-atlas-ground" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d3dae3" />
          <stop offset="55%" stopColor="#a9b4c2" />
          <stop offset="100%" stopColor="#8d99a9" />
        </linearGradient>
        <linearGradient id="bw-atlas-gloss" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bw-land-clip">
          <path d={WORLD_LAND_PATH} />
        </clipPath>
        {/* A field, in two layers (#111).

            One disc green in the middle and yellow at the rim painted its own
            yellow over its neighbour's green — with thirty rooms in Asia the
            rims won everywhere and a country that was fully served looked
            yellow. So every field's yellow halo is laid down first and every
            green core goes on top of all of them: a rim can never cover a
            core again. Each is a gradient in bounding-box units, so a field
            wears it at its own size, and the field's opacity is still how
            much stands in the room. */}
        <radialGradient id="bw-field-tail" cx="50%" cy="50%" r="50%">
          {/* Reach is at 95% of this disc and the green core ends at 64% of
              it, so the band between them is the yellow: reached, not served
              to the standard. */}
          <stop offset="0%" stopColor={rgb(YELLOW)} stopOpacity="0" />
          <stop offset="46%" stopColor={rgb(YELLOW)} stopOpacity="0.14" />
          <stop offset="64%" stopColor={rgb(YELLOW)} stopOpacity="0.46" />
          <stop offset="86%" stopColor={rgb(YELLOW)} stopOpacity="0.3" />
          <stop offset="100%" stopColor={rgb(YELLOW)} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bw-field-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={rgb(GREEN)} stopOpacity="1" />
          <stop offset="74%" stopColor={rgb(GREEN)} stopOpacity="1" />
          <stop offset="88%" stopColor={rgb(GREEN)} stopOpacity="0.8" />
          <stop offset="100%" stopColor={rgb(GREEN)} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* --- the sea, and the depth of it ----------------------------------
          The sea is also the way back out: tap water and the camera returns to
          the world. Everything you can tap on this map does the obvious thing
          to the camera — a city takes you to the city, a continent to the
          continent, the sea to all of it. */}
      <rect
        x={-200} y={-200} width={W + 400} height={H + 400}
        fill="url(#bw-atlas-ocean)"
        className="bw-atlas-sea-hit"
        onClick={onShowWorld ? () => { if (tapped()) onShowWorld(); } : undefined}
        role={onShowWorld ? 'button' : undefined}
        tabIndex={onShowWorld ? 0 : undefined}
        aria-label={onShowWorld ? 'Show the whole world' : undefined}
        onKeyDown={onShowWorld ? event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onShowWorld();
          }
        } : undefined}
      />
      <rect x={-200} y={-200} width={W + 400} height={H + 400} fill="url(#bw-atlas-vignette)" />
      <path d={WORLD_GRATICULE_PATH} className="bw-atlas-grid" vectorEffect="non-scaling-stroke" />

      {/* --- the continental shelf: three strokes of falling light around
              every landmass. Same three the shared atlas uses. ------------- */}
      <g className="bw-atlas-shelf">
        <path d={WORLD_SHELF_PATH} strokeWidth={16} style={{ ['--o' as string]: '0.07' }} vectorEffect="non-scaling-stroke" />
        <path d={WORLD_SHELF_PATH} strokeWidth={8} style={{ ['--o' as string]: '0.1' }} vectorEffect="non-scaling-stroke" />
        <path d={WORLD_SHELF_PATH} strokeWidth={3} style={{ ['--o' as string]: '0.15' }} vectorEffect="non-scaling-stroke" />
      </g>

      {/* --- land stands above the sea and casts down into it -------------- */}
      <path d={WORLD_LAND_PATH} className="bw-atlas-relief" transform="translate(0,7)" />
      <path d={WORLD_LAND_PATH} className="bw-atlas-relief is-deep" transform="translate(0,12)" />

      {/* --- the land: grey, everywhere, always ----------------------------
          A region you are not opening in has no colour of its own. It is
          ground. The only colours on this map are the two that mean
          something. */}
      <path d={WORLD_LAND_PATH} fill="url(#bw-atlas-ground)" />
      {/* Every country's edge, so the ground you have not opened reads as
          countries rather than as one grey slab (#113). */}
      <path d={WORLD_BORDERS_PATH} className="bw-atlas-coast" vectorEffect="non-scaling-stroke" pointerEvents="none" />

      {/* --- the markets you are opening in: red, from the moment you choose
          them, and the same red afterwards. A market is a promise you made;
          how it is going is the field brushed over it (#110 — the tint by
          served share of #108 went, because it turned a whole country green
          for a room in one city). ------------------------------------- */}
            <g className="bw-atlas-markets">
        {marketPaths.map(market => (
          <path
            key={market.id}
            d={market.path}
            className={finished.has(market.code.toUpperCase()) ? 'bw-atlas-market is-served' : 'bw-atlas-market'}
            data-code={market.code}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* --- reach: the green a site emits -----------------------------------
          Every room throws a field; the fields merge into one territory, and
          the territory grows as you put racks in. Drawn over the markets, so
          a market turning green is the plainest possible statement that it is
          being served. */}
      {(fields.length > 0 || preview) && (
        <>
          {/* The ground each room reaches (#109, relaid #111): the yellow
              halos of every field first, then every green core over all of
              them, so a neighbour's rim never covers a core. Fields cross
              every border in the way and are clipped to land; where two
              overlap they add up, which is what two rooms serving one place
              look like. */}
          <g className="bw-atlas-emit">
            {fields.map(field => (
              <circle key={`emit-${field.cityId}`} cx={field.x} cy={field.y} r={drawnR(field) * FIELD_WASH} fill="url(#bw-field-tail)" />
            ))}
            {preview && preview.r > 0 && <circle className="is-preview" cx={preview.x} cy={preview.y} r={preview.r * FIELD_WASH} fill="url(#bw-field-tail)" />}
          </g>

          <g clipPath="url(#bw-land-clip)">
            {/* The halos are a UNION, not a sum (#112). Six two-rack rooms in
                the east each threw a halo at 0.38, and six of those stacked
                to near-solid yellow which over a red market read as one
                orange stain across the country — the thing that made a fully
                served America look broken. Blended with `lighten` inside an
                isolated group they take the strongest, so any number of
                overlapping halos is one halo. The cores below still stack,
                because two rooms over one place really is more signal. */}
            <g className="bw-atlas-field bw-atlas-halos">
              {fields.map(field => (
                <circle
                  key={`tail-${field.cityId}`}
                  cx={field.x}
                  cy={field.y}
                  r={drawnR(field) * FIELD_WASH}
                  className={field.planned ? 'bw-atlas-reach is-planned' : 'bw-atlas-reach'}
                  fill="url(#bw-field-tail)"
                  style={{ opacity: field.intensity }}
                />
              ))}
              {preview && preview.r > 0 && (
                <circle
                  cx={preview.x}
                  cy={preview.y}
                  r={preview.r * FIELD_WASH}
                  className="bw-atlas-reach is-preview"
                  fill="url(#bw-field-tail)"
                  style={{ opacity: 0.5 }}
                />
              )}
            </g>
            <g className="bw-atlas-field">
              {fields.map(field => (
                <circle
                  key={`core-${field.cityId}`}
                  cx={field.x}
                  cy={field.y}
                  r={drawnR(field) * SERVED_BAND * CORE_SOFT}
                  className={field.planned ? 'bw-atlas-reach is-planned' : 'bw-atlas-reach'}
                  fill="url(#bw-field-core)"
                  style={{ opacity: field.intensity }}
                />
              ))}
              {preview && preview.r > 0 && (
                <circle
                  cx={preview.x}
                  cy={preview.y}
                  r={preview.r * SERVED_BAND * CORE_SOFT}
                  className="bw-atlas-reach is-preview"
                  fill="url(#bw-field-core)"
                  style={{ opacity: 0.5 }}
                />
              )}
            </g>
          </g>

          {/* Where a room just landed: one ring, out from the city and gone,
              outside the field so it stays a line (#107). */}
          {pinging.length > 0 && (
            <g className="bw-atlas-pings" aria-hidden="true">
              {pinging.map(id => {
                const field = fields.find(candidate => candidate.cityId === id);
                return field ? (
                  <circle key={`ping-${id}`} cx={field.x} cy={field.y} r={field.r} className="bw-atlas-ping" vectorEffect="non-scaling-stroke" />
                ) : null;
              })}
            </g>
          )}

          {/* The proposed room's own edge, outside the field so it stays a
              line. A field you have not taken yet is drawn creeping. */}
          {preview && (
            <circle
              cx={preview.x}
              cy={preview.y}
              r={preview.r}
              className="bw-atlas-edge"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      )}

      {/* --- tap a continent to fly to it ---------------------------------- */}
      {onSelectRegion && (
        <g className="bw-atlas-hit">
          {REGION_HIT.map(region => (
            <path
              key={region.id}
              d={region.path}
              onClick={() => { if (tapped()) onSelectRegion(region.id); }}
              role="button"
              tabIndex={0}
              aria-label={`Scout ${region.label}`}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectRegion(region.id);
                }
              }}
            />
          ))}
        </g>
      )}

      {/* --- the light on the ground, and the lines drawn on it ------------ */}
      <path d={WORLD_LAND_PATH} fill="url(#bw-atlas-gloss)" fillOpacity={0.38} pointerEvents="none" />
      <path d={WORLD_BORDERS_PATH} className="bw-atlas-borders" vectorEffect="non-scaling-stroke" />

      {/* --- the routes between your own sites ------------------------------
          A mesh, not a star (#111). Every room links to its two nearest
          neighbours, so the picture is a network holding itself together
          rather than twenty lines converging on whichever room happened to be
          placed first. Each link is a faint line with traffic running along
          it: short dashes crawling from one room to the other, which is what
          a link between two servers is. */}
      {links.length > 0 && (
        <g className="bw-atlas-routes">
          {links.map(link => (
            <path key={`route-${link.id}`} d={link.d} strokeWidth={hair * 1.4} className={link.planned ? 'bw-atlas-route is-planned' : 'bw-atlas-route'} />
          ))}
          {links.map((link, index) => (
            <path
              key={`traffic-${link.id}`}
              d={link.d}
              strokeWidth={hair * 2.2}
              className="bw-atlas-traffic"
              style={{ ['--delay' as string]: `${(index % 7) * 0.42}s` }}
            />
          ))}
        </g>
      )}

      {/* --- the places ------------------------------------------------------ */}
      {/* --- the places, and their names ------------------------------------
          One group, scaled so everything inside it is measured in screen
          pixels. A dot is the same dot and a name is the same name whether you
          are looking at the world or at one city. */}
      <g className="bw-atlas-screen" transform={`scale(${(1 / pixelScale).toFixed(6)})`}>
        <g className="bw-atlas-pins">
          {shownPins.map(pin => (
            <g
              key={pin.id}
              className={[
                'bw-atlas-pin',
                pin.held ? 'is-held' : '',
                pin.id === cityId ? 'is-on' : '',
                pin.id === previewCityId ? 'is-preview' : '',
                pin.id === focusCityId ? 'is-peek' : '',
                pin.market ? 'is-market' : '',
                /* Amber meant "the team suggests here". Every one of the
                   twenty-four day-one markets names a suggested city, so
                   eighteen amber rings were being drawn for markets this
                   platform is not opening in at all — a recommendation about
                   a place that is not on the table. It is only a suggestion
                   where it could be taken. */
                pin.recommended && pin.market && !pin.held ? 'is-rec' : '',
              ].filter(Boolean).join(' ')}
              transform={`translate(${toScreen(pin.x).toFixed(2)} ${toScreen(pin.y).toFixed(2)})`}
              /* A pin carries a 16px invisible target for a thumb, and a
                 transparent fill still catches a tap. With eighty rooms at
                 world zoom those targets tiled whole continents, so tapping
                 "America" hit a pin that had no handler and did nothing at
                 all — the region under it never heard the tap (#117). A pin
                 nobody can act on is not a target. */
              pointerEvents={onSelectCity ? undefined : 'none'}
              style={tones.has(pin.id) ? { ['--tone' as string]: tones.get(pin.id) } : undefined}
              onClick={onSelectCity ? () => onSelectCity(pin.id) : undefined}
              role={onSelectCity ? 'button' : undefined}
              tabIndex={onSelectCity ? 0 : undefined}
              aria-label={onSelectCity ? `${pin.name}${pin.racks > 0 ? `, ${pin.racks} racks, mostly ${SERVER_TIERS[pin.tier].name}${pin.second ? ` and ${SERVER_TIERS[pin.second].name}` : ''}` : ''}` : undefined}
              onKeyDown={onSelectCity ? event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectCity(pin.id);
                }
              } : undefined}
            >
              {/* A generous, invisible target: these dots are 5px wide and a
                  thumb is not. */}
              <circle r={16} className="bw-atlas-pin-hit" />
              {/* A held site keeps a live ring; an empty one is a dot. */}
              {pin.held && <circle r={DOT_PX * 2.2 * dotScale} className="bw-atlas-pin-ring" />}
              {pin.held ? (
                <>
                  <path
                    d={tierMarkPath(pin.tier, (DOT_PX + (pin.id === cityId || pin.id === focusCityId ? 1.9 : 1.1)) * dotScale)}
                    className={`bw-atlas-pin-dot is-${pin.tier.toLowerCase()}`}
                  />
                  {/* A second kind in the same city rides on the shoulder of
                      the first, small, so a mixed room is plainly mixed. */}
                  {pin.second && (() => {
                    const r = (DOT_PX + (pin.id === cityId || pin.id === focusCityId ? 1.9 : 1.1)) * dotScale;
                    return (
                      <path
                        d={tierMarkPath(pin.second, r * 0.62)}
                        transform={`translate(${(r * 0.95).toFixed(2)} ${(r * 0.95).toFixed(2)})`}
                        className={`bw-atlas-pin-mix is-${pin.second.toLowerCase()}`}
                      />
                    );
                  })()}
                </>
              ) : (
                <circle
                  r={(pin.id === cityId || pin.id === focusCityId ? DOT_PX + 1.5
                    : pin.market || pin.recommended ? DOT_PX : DOT_PX - 1.4) * dotScale}
                  className="bw-atlas-pin-dot"
                />
              )}
            </g>
          ))}
        </g>

        {/* Names last, so nothing is drawn through one. */}
        <g className="bw-atlas-labels">
          {labelled.map(({ pin, left }) => (
            <text
              key={`label-${pin.id}`}
              x={toScreen(pin.x) + (left ? -(DOT_PX + 6) : DOT_PX + 6)}
              y={toScreen(pin.y) + LABEL_PX * 0.34}
              textAnchor={left ? 'end' : 'start'}
              className="bw-atlas-label is-on"
              style={{ fontSize: `${LABEL_PX}px` }}
            >
              {pin.name}
            </text>
          ))}
        </g>

      </g>
    </svg>
  );
}

/** A route between two sites, bowed so two of them never lie on top of each
    other and the network reads as links rather than a scribble. */
function arc(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  /* Bow perpendicular to the line, by a fixed fraction of its length. */
  const bow = Math.min(60, length * 0.16);
  const cx = mx - (dy / length) * bow;
  const cy = my + (dx / length) * bow;
  return `M${from.x} ${from.y}Q${cx} ${cy} ${to.x} ${to.y}`;
}
