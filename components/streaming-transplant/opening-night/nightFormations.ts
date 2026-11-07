/**
 * #262: where the night's lights go. Each formation says, for every light, where it sits, how big and bright it is, what colour, and when it comes on. Everything is worked
 * out from the service: its logo, its real network and markets, the saved launch's numbers. The same every replay, because the randomness is seeded. Built in slices while
 * Launch Control is up, so the show never has to wait for it and no tap pays for it.
 */
import { ATLAS_H, ATLAS_W, countryGeoOf } from '../AudienceAtlas';
import { lightHasCountry, lightMergedPath, lightWorld } from '../audienceAtlasGeometry';
import { projectLonLat, WORLD_PROJECTION } from '../../../views/lifestyle/business/components/worldMapDetailedGeometry';
import type { StreamingNetworkMapView } from '../../../services/streamingNetworkMapView';
import type { OpeningNightMoment } from '../../../services/streamingOpeningNight';
import type { OwnedStreamingLaunchCommit } from '../../../types';
import { blankFormation, eveningOf, KIND, NIGHT_LEAD_LIGHTS, NIGHT_LIGHTS, type Formation } from './nightEngine';

export type Rgb = [number, number, number];
export interface NightPalette { brand: Rgb; lift: Rgb; deep: Rgb; accent: Rgb }
export interface NightSize { W: number; H: number }

const hsl = (h: number, s: number, l: number): Rgb => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + ((h % 360) + 360) % 360 / 30) % 12;
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
};
export const nightPalette = (brand: { hue: number; sat: number; accentHue?: number }): NightPalette => ({
  brand: hsl(brand.hue, brand.sat, 58),
  lift: hsl(brand.hue, Math.min(100, brand.sat + 8), 74),
  deep: hsl(brand.hue, brand.sat * 0.85, 22),
  accent: hsl(brand.accentHue ?? brand.hue + 40, 92, 66),
});

const WHITE: Rgb = [1, 1, 1];
const WARM: Rgb = [1, 0.86, 0.66];
const COOL: Rgb = [0.78, 0.88, 1];
const AMBER: Rgb = [1, 0.7, 0.26];
const RED: Rgb = [1, 0.26, 0.3];
const DEGREE = Math.PI / 180;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const smooth = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

const seeded = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const put = (f: Formation, i: number, x: number, y: number, size: number, alpha: number, c: Rgb, act = -1, kind: number = KIND.DOT) => {
  f.pos[i * 2] = x;
  f.pos[i * 2 + 1] = y;
  f.look[i * 2] = size;
  f.look[i * 2 + 1] = alpha;
  f.color[i * 3] = c[0];
  f.color[i * 3 + 1] = c[1];
  f.color[i * 3 + 2] = c[2];
  f.act[i] = act;
  f.kind[i] = kind;
};
const copyOf = (f: Formation): Formation => ({ pos: f.pos.slice(), look: f.look.slice(), color: f.color.slice(), act: f.act.slice(), kind: f.kind.slice() });
const shuffled = <T,>(list: T[], rand: () => number): T[] => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/* what was drawn on a small canvas */
interface Ink { width: number; height: number; taken: Uint8Array; area: number }
const inkOf = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): Ink => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  draw(ctx);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const taken = new Uint8Array(canvas.width * canvas.height);
  let area = 0;
  for (let i = 0; i < taken.length; i += 1) {
    if (data[i * 4 + 3] > 110) {
      taken[i] = 1;
      area += 1;
    }
  }
  return { width: canvas.width, height: canvas.height, taken, area };
};
/* `count` points spread evenly over the ink, the regular way a drone show's lights sit; in no order, so they cross the sky to get there */
const spreadOver = (ink: Ink, count: number, rand: () => number): Float32Array => {
  const walk = (spacing: number) => {
    const found: number[] = [];
    let row = 0;
    for (let y = spacing / 2; y < ink.height; y += spacing * 0.866, row += 1) {
      for (let x = row % 2 ? spacing : spacing / 2; x < ink.width; x += spacing) {
        if (ink.taken[Math.floor(y) * ink.width + Math.floor(x)]) found.push(x, y);
      }
    }
    return found;
  };
  let spacing = Math.max(1.05, Math.sqrt((ink.area * 1.15) / Math.max(1, count)));
  let found = walk(spacing);
  for (let tries = 0; tries < 3 && found.length / 2 < count; tries += 1) {
    spacing = Math.max(1.05, spacing * Math.sqrt(found.length / 2 / count) * 0.98);
    found = walk(spacing);
  }
  const whole = found.length / 2;
  const order = shuffled(Array.from({ length: whole }, (_, index) => index), rand);
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    const at = whole ? order[i % whole] : 0;
    /* more lights than places: the rest sit between them */
    const spare = i >= whole;
    out[i * 2] = (found[at * 2] ?? ink.width / 2) + (spare ? (rand() - 0.5) * spacing : 0);
    out[i * 2 + 1] = (found[at * 2 + 1] ?? ink.height / 2) + (spare ? (rand() - 0.5) * spacing : 0);
  }
  return out;
};

/* ── the stadium: tier after tier of phones held up in the dark, round a stage ── */
const STADIUM_HORIZON = 0.53;
const stadiumSeats = (W: number, H: number, density: number, rand: () => number) => {
  const horizon = H * STADIUM_HORIZON;
  const farTop = H * 0.15;
  const rows = 36;
  const seats: Array<[number, number, number]> = [];
  for (let row = 0; row < rows; row += 1) {
    const t = 0.15 * (1.1 / 0.15) ** (row / (rows - 1));
    const across = W * 1.02 * t;
    const below = (H - horizon) * t;
    const above = farTop * t;
    const spacing = density * (1.4 + 8.6 * t * t);
    const rowOffset = rand() * 0.2;
    for (let angle = rowOffset; angle < rowOffset + Math.PI * 2;) {
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const reach = sin > 0 ? below : above;
      const x = W / 2 + across * cos;
      const y = horizon + reach * sin;
      /* the aisles between the blocks */
      const inBlock = Math.abs(Math.sin(angle * 6)) > 0.045;
      if (inBlock && x > -14 && x < W + 14 && y > -14 && y < H + 14) {
        seats.push([x + (rand() - 0.5) * spacing * 0.6, y + (rand() - 0.5) * spacing * 0.42, clamp((y - (horizon - farTop)) / (H - (horizon - farTop)), 0, 1)]);
      }
      angle += spacing / Math.max(1, Math.hypot(across * sin, reach * cos));
    }
  }
  return seats;
};
export const stadiumFormation = ({ W, H }: NightSize, palette: NightPalette): Formation => {
  const f = blankFormation();
  const rand = seeded('crowd');
  const horizon = H * STADIUM_HORIZON;
  for (let i = 0; i < NIGHT_LEAD_LIGHTS; i += 1) {
    /* the drones, waiting high up, hardly lit */
    put(f, i, rand() * W, rand() * horizon * 0.8, 1.3, 0.14 + rand() * 0.2, mix(palette.lift, WHITE, 0.5));
  }
  const crowd = NIGHT_LIGHTS - NIGHT_LEAD_LIGHTS;
  const trial = stadiumSeats(W, H, 1, rand);
  const seats = shuffled(stadiumSeats(W, H, Math.sqrt(trial.length / crowd) * 0.97, rand), rand);
  for (let i = 0; i < crowd; i += 1) {
    const [x, y, depth] = seats[i % seats.length];
    const tint = rand();
    const colour = tint < 0.44 ? WARM : tint < 0.84 ? COOL : palette.brand;
    /* some phones are not up yet */
    const held = rand() < 0.13 ? 0.22 : 0.7 + 0.3 * rand();
    put(f, NIGHT_LEAD_LIGHTS + i, x, y, 1.2 + 4.4 * depth ** 2.1, (0.76 + 0.24 * depth) * held, colour);
  }
  return f;
};

/* ── the countdown: a drone show's numbers over the crowd ── */
export const digitInk = ({ W, H }: NightSize, value: number): Float32Array => {
  const fontSize = Math.min(H * 0.34, W * (value >= 10 ? 0.62 : 0.8));
  const ink = inkOf(W, H * 0.56, ctx => {
    ctx.font = `400 ${fontSize}px Anton, Archivo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), W / 2, H * 0.29);
  });
  return spreadOver(ink, NIGHT_LEAD_LIGHTS, seeded(`digit-ink${value}`));
};
/** the lead lights take the number; the crowd below stays where it is */
export const applyDigit = (stadium: Formation, ink: Float32Array, palette: NightPalette, H: number) => {
  const top = H * 0.11;
  const height = H * 0.36;
  for (let i = 0; i < NIGHT_LEAD_LIGHTS; i += 1) {
    const y = ink[i * 2 + 1];
    const down = clamp((y - top) / height, 0, 1);
    put(stadium, i, ink[i * 2], y, 2.25, 1, mix(WHITE, palette.lift, down * 0.9));
  }
};

/* ── the logo: everything that was in the air and most of the crowd ── */
export const logoInk = ({ W, H }: NightSize, name: string, typeface: { stack: string; weight: number | string }, mark: CanvasImageSource | null): Ink => inkOf(W, H * 0.62, ctx => {
  const side = Math.min(W * 0.44, H * 0.22);
  const markY = H * 0.13;
  if (mark) ctx.drawImage(mark, W / 2 - side / 2, markY, side, side);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  /* the biggest that fits; a long name takes two lines rather than turning to dust */
  const fit = (lines: string[]) => {
    let fontSize = Math.min(W * 0.17, H * 0.085);
    ctx.font = `${typeface.weight} ${fontSize}px ${typeface.stack}`;
    while (lines.some(line => ctx.measureText(line).width > W * 0.86) && fontSize > 12) {
      fontSize -= 1;
      ctx.font = `${typeface.weight} ${fontSize}px ${typeface.stack}`;
    }
    return fontSize;
  };
  const words = name.split(/\s+/).filter(Boolean);
  let lines = [name];
  let fontSize = fit(lines);
  if (fontSize < W * 0.085 && words.length > 1) {
    let best = 1;
    for (let at = 1; at < words.length; at += 1) {
      const longest = (cut: number) => Math.max(words.slice(0, cut).join(' ').length, words.slice(cut).join(' ').length);
      if (longest(at) < longest(best)) best = at;
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    fontSize = fit(lines);
  }
  lines.forEach((line, index) => ctx.fillText(line, W / 2, markY + side + fontSize * (0.85 + index * 1.12)));
});
export const logoFormation = (stadium: Formation, ink: Ink, palette: NightPalette): Formation => {
  const f = copyOf(stadium);
  const rand = seeded('logo');
  const flying = Math.floor(NIGHT_LIGHTS * 0.76);
  const places = spreadOver(ink, flying, rand);
  const top = ink.height * 0.2;
  for (let i = 0; i < NIGHT_LIGHTS; i += 1) {
    if (i < flying) {
      const y = places[i * 2 + 1];
      const down = clamp((y - top) / (ink.height * 0.55), 0, 1);
      put(f, i, places[i * 2], y, 1.5 + rand() * 0.6, 0.6 + rand() * 0.38, mix(mix(WHITE, palette.lift, 0.5), palette.brand, down * 0.8));
    } else {
      /* those who stayed have turned the service's colour */
      f.color[i * 3] = palette.brand[0];
      f.color[i * 3 + 1] = palette.brand[1];
      f.color[i * 3 + 2] = palette.brand[2];
      f.look[i * 2 + 1] = Math.min(1, f.look[i * 2 + 1] * 1.5);
    }
  }
  return f;
};

/* ── the world: land in dots on a turning globe, the network in light, eight o'clock moving west ── */
export interface NightWorld {
  formation: Formation;
  seconds: number;
  /** how far the globe has turned at the start and at the end, in radians */
  spinStart: number;
  spinEnd: number;
  tilt: number;
  /** longitude, latitude, in radians */
  hub: [number, number];
  /** `stack`: how many went up in the same country before it */
  chips: Array<{ lon: number; lat: number; label: string; line: string; act: number; stack: number }>;
}
export const worldFormation = async ({ W, H }: NightSize, palette: NightPalette, network: StreamingNetworkMapView, moments: OpeningNightMoment[], seconds: number, breathe: () => Promise<void>): Promise<NightWorld> => {
  const f = blankFormation();
  const rand = seeded('world');
  const evening = eveningOf(network.sites.map(site => site.lng));
  /* a place comes on a little before it faces the viewer, so it is seen to happen */
  const actOf = (lng: number) => clamp((((((evening.east - lng) % 360) + 360) % 360 - 26) / evening.range) * seconds, 0.12, seconds * 0.97);
  const sites = network.sites;
  const shapes: string[] = [];
  network.markets.forEach(market => {
    const geo = countryGeoOf(market.countryId);
    if (geo.shapeId && lightHasCountry(geo.shapeId)) shapes.push(geo.shapeId);
  });

  let next = 0;
  const maxRacks = Math.max(1, ...sites.map(site => site.racks));
  /* the cities, in the lead lights so they are never dropped */
  sites.forEach(site => {
    if (next + 2 >= NIGHT_LEAD_LIGHTS) return;
    const act = actOf(site.lng);
    const weight = Math.sqrt(site.racks / maxRacks);
    put(f, next, site.lng * DEGREE, site.lat * DEGREE, 15 + 16 * weight, 0.36, palette.brand, act, KIND.GLOBE);
    put(f, next + 1, site.lng * DEGREE, site.lat * DEGREE, 3.2 + 2.8 * weight, 1, WHITE, act, KIND.GLOBE);
    next += 2;
  });
  /* what the campaign bought: a flare, and its name */
  const chips: NightWorld['chips'] = [];
  moments.forEach(moment => {
    const point = moment.countryId ? countryGeoOf(moment.countryId).point : null;
    const place = point ? WORLD_PROJECTION.invert?.(point) : null;
    if (!place || next >= NIGHT_LEAD_LIGHTS) return;
    const act = actOf(place[0]);
    put(f, next, place[0] * DEGREE, place[1] * DEGREE, 50, 0.6, palette.accent, act, KIND.GLOBE);
    next += 1;
    chips.push({ lon: place[0] * DEGREE, lat: place[1] * DEGREE, label: moment.label, line: moment.line, act, stack: chips.filter(chip => chip.lon === place[0] * DEGREE && chip.lat === place[1] * DEGREE).length });
  });
  /* streams on their way: the rest of the lead lights, by each city's size */
  const totalRacks = Math.max(1, sites.reduce((sum, site) => sum + site.racks, 0));
  const streamLights = NIGHT_LEAD_LIGHTS - next;
  sites.forEach(site => {
    const count = Math.max(6, Math.round(streamLights * (site.racks / totalRacks)));
    const act = actOf(site.lng);
    for (let n = 0; n < count && next < NIGHT_LEAD_LIGHTS; n += 1, next += 1) put(f, next, site.lng * DEGREE, site.lat * DEGREE, 1.7 + rand() * 0.9, 0.9, mix(palette.lift, WHITE, 0.4), act, KIND.STREAM);
  });
  for (; next < NIGHT_LEAD_LIGHTS; next += 1) put(f, next, 0, 0, 1, 0, WHITE);

  /* the land in even dots round the whole globe: lit where the service sells, faint everywhere else */
  const land = inkMask(lightWorld().land, shapes.length ? lightMergedPath(shapes) : '');
  const STARS = 170;
  const wanted = NIGHT_LIGHTS - next - STARS;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const dotAt = (index: number, total: number): [number, number, number] => {
    const lat = Math.asin(1 - ((index + 0.5) * 2) / total) / DEGREE;
    const lon = (((index * golden) % (Math.PI * 2)) / DEGREE) - 180;
    const point = projectLonLat(lon, lat);
    return [lon, lat, point ? land(point[0], point[1]) : 0];
  };
  /* how much of the globe is land decides how many dots make the lights go round */
  let landShare = 0;
  for (let i = 0; i < 4000; i += 1) if (dotAt(i, 4000)[2]) landShare += 1;
  const total = Math.round(wanted / Math.max(0.05, landShare / 4000));
  const dots: Array<[number, number, number]> = [];
  for (let i = 0; i < total; i += 1) {
    const dot = dotAt(i, total);
    if (dot[2]) dots.push(dot);
    if (i % 7000 === 6999) await breathe();
  }
  /* shuffled, so stepping down drops dots evenly */
  shuffled(dots, rand).forEach(([lon, lat, mask]) => {
    if (next >= NIGHT_LIGHTS - STARS) return;
    if (mask > 1) put(f, next, lon * DEGREE, lat * DEGREE, 2.1, 0.96, mix(palette.brand, palette.lift, rand() * 0.7), actOf(lon), KIND.GLOBE);
    else put(f, next, lon * DEGREE, lat * DEGREE, 1.9, 0.62, [0.52, 0.62, 0.88], -1, KIND.GLOBE);
    next += 1;
  });
  /* the stars behind it */
  for (; next < NIGHT_LIGHTS; next += 1) {
    let x = rand() * W;
    let y = rand() * H;
    for (let tries = 0; tries < 6 && Math.hypot(x - W / 2, y - H * 0.47) < W * 0.63; tries += 1) {
      x = rand() * W;
      y = rand() * H;
    }
    put(f, next, x, y, 0.9 + rand() * 0.8, 0.2 + rand() * 0.5, WHITE);
  }
  const hubSite = [...sites].sort((a, b) => b.racks - a.racks)[0];
  return {
    formation: f,
    seconds,
    spinStart: -evening.east * DEGREE,
    spinEnd: (evening.range - evening.east) * DEGREE,
    tilt: 0.3,
    hub: hubSite ? [hubSite.lng * DEGREE, hubSite.lat * DEGREE] : [0, 0],
    chips,
  };
};

/* 0 sea, 1 land, 2 land the service sells in */
const inkMask = (landPath: string, soldPath: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#f00';
  ctx.fill(new Path2D(landPath));
  if (soldPath) {
    ctx.fillStyle = '#0f0';
    ctx.fill(new Path2D(soldPath));
  }
  const data = ctx.getImageData(0, 0, ATLAS_W, ATLAS_H).data;
  return (x: number, y: number) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= ATLAS_W || py >= ATLAS_H) return 0;
    const at = (py * ATLAS_W + px) * 4;
    if (data[at + 1] > 128) return 2;
    return data[at] > 128 ? 1 : 0;
  };
};

/* ── a city at night: every window that comes on is a TV ── */
export interface NightCity { formation: Formation; focus: [number, number]; skyline: Uint8Array }
export const cityFormation = ({ W, H }: NightSize, palette: NightPalette): NightCity => {
  const f = blankFormation();
  const rand = seeded('city');
  const ground = H - 70;
  const tops = [new Float32Array(512), new Float32Array(512), new Float32Array(512)];
  const windows: Array<{ x: number; y: number; size: number; layer: number }> = [];
  const tower = (x: number, width: number, height: number, gapX: number, gapY: number, size: number, layer: number, glass = true) => {
    const roof = ground - height;
    if (glass) {
      const inset = gapX * 0.7;
      for (let wy = roof + gapY * 0.8; wy < ground; wy += gapY) {
        for (let wx = x + inset; wx < x + width - inset * 0.6; wx += gapX) windows.push({ x: wx, y: wy, size, layer });
      }
    }
    const reach = (H - roof) / H;
    for (let at = Math.floor((x / W) * 512); at <= Math.floor(((x + width) / W) * 512); at += 1) {
      if (at >= 0 && at < 512) tops[layer][at] = Math.max(tops[layer][at], reach);
    }
  };
  /* the far blocks, some with a setback and a mast; then nearer and bigger; the gaps between them are the sky */
  const masts: Array<[number, number]> = [];
  for (let x = -14; x < W + 10;) {
    const width = 30 + rand() * 36;
    const height = H * (0.34 + rand() * 0.3);
    tower(x, width, height, 4.9, 5.8, 2, 2);
    if (rand() < 0.4) tower(x + width * 0.2, width * 0.6, height + H * (0.02 + rand() * 0.05), 4.9, 5.8, 2, 2);
    if (rand() < 0.3) {
      tower(x + width * 0.48, 1.6, height + H * 0.09, 9, 9, 1, 2, false);
      masts.push([x + width * 0.48, ground - height - H * 0.09]);
    }
    x += width + 2 + rand() * 7;
  }
  for (let x = -30; x < W + 10;) {
    const width = 58 + rand() * 50;
    const height = H * (0.2 + rand() * 0.22);
    tower(x, width, height, 7.6, 9, 3.1, 1);
    if (rand() < 0.35) tower(x + width * 0.22, width * 0.56, height + H * 0.035, 7.6, 9, 3.1, 1);
    x += width + 14 + rand() * 34;
  }
  tower(-14, 100, H * 0.34, 12, 14, 5.2, 0);
  tower(W - 84, 104, H * 0.28, 12, 14, 5.2, 0);
  /* near ones first, then shuffled, so stepping down keeps the picture */
  const order = windows.filter(item => item.layer === 0).concat(shuffled(windows.filter(item => item.layer !== 0), rand));
  const centre: [number, number] = [W * 0.42, ground];
  const reach = Math.hypot(W * 0.7, H * 0.7);
  let focus: [number, number] = [W * 0.6, H * 0.5];
  let bestFocus = Infinity;
  let next = 0;
  /* a red light on each mast, for the aircraft */
  masts.forEach(([x, y]) => {
    put(f, next, x, y, 3.2, 0.95, RED);
    next += 1;
  });
  for (let index = 0; index < order.length && next < NIGHT_LIGHTS; index += 1, next += 1) {
    const item = order[index];
    const roll = rand();
    if (roll < 0.13) {
      put(f, next, item.x, item.y, item.size, 0.6, WARM, -1, KIND.WINDOW);
    } else if (roll < 0.24) {
      put(f, next, item.x, item.y, item.size, 0.06, WARM, -1, KIND.WINDOW);
    } else {
      /* the TVs come on from one part of town outward */
      const away = Math.hypot(item.x - centre[0], item.y - centre[1]) / reach;
      const act = 0.2 + away * 2.7 + rand() * 0.75;
      const colour = rand() < 0.5 ? mix(palette.lift, WHITE, 0.3) : rand() < 0.5 ? palette.brand : COOL;
      put(f, next, item.x, item.y, item.size, 1, colour, act, KIND.WINDOW);
      const distance = Math.hypot(item.x - W * 0.5, item.y - H * 0.46);
      if (item.layer === 1 && act < 2.2 && distance < bestFocus) {
        bestFocus = distance;
        focus = [item.x, item.y];
      }
    }
  }
  /* the rest: a few stars */
  for (; next < NIGHT_LIGHTS; next += 1) {
    const seen = rand() < 0.1;
    put(f, next, rand() * W, rand() * H * 0.36, 0.8 + rand() * 1, seen ? 0.2 + rand() * 0.4 : 0, WHITE);
  }
  const skyline = new Uint8Array(512 * 4);
  for (let at = 0; at < 512; at += 1) {
    skyline[at * 4] = Math.round(tops[0][at] * 255);
    skyline[at * 4 + 1] = Math.round(tops[1][at] * 255);
    skyline[at * 4 + 2] = Math.round(tops[2][at] * 255);
    skyline[at * 4 + 3] = 255;
  }
  return { formation: f, focus, skyline };
};

/* ── the flood's sky: every light on the board lets go and goes up, as the likes go up; on a bad night, ash comes down ── */
export const RISE_LIGHTS = 4200;
export const riseFormation = ({ W, H }: NightSize, palette: NightPalette, tier: OwnedStreamingLaunchCommit['outcomeTier']): Formation => {
  const f = blankFormation();
  const rand = seeded('rise');
  const colours: Rgb[] = tier === 'DEGRADED_OPENING' ? [RED, [0.5, 0.18, 0.22], [0.7, 0.3, 0.26]]
    : tier === 'PRESSURED_OPENING' ? [AMBER, palette.lift, WARM]
      : [palette.brand, palette.lift, palette.accent, WHITE, palette.lift];
  for (let i = 0; i < NIGHT_LIGHTS; i += 1) {
    if (i < RISE_LIGHTS) put(f, i, rand() * W, rand() * H, 1 + rand() ** 3 * 3.4, 0.16 + rand() * 0.6, colours[Math.floor(rand() * colours.length)], -1, KIND.RISING);
    /* the rest leave as they go, and are not drawn again */
    else put(f, i, rand() * W, rand() * H, 1, 0, WHITE);
  }
  return f;
};

export const FIREWORK_SHELLS = 7;
/* #266: when each shell bursts, in seconds after the peak: no two gaps alike, as a real barrage. The rendered sound has the same list (scripts/audio/render-opening-night.mjs), and follows each burst by as long as its sound takes to arrive. */
export const FIREWORK_TIMES = [0.14, 0.58, 1.33, 1.71, 2.62, 3.05, 3.9];

/* ── the peak: the control room's board, a wall of lamps, and the night's curve in them ── */
export interface NightPeak {
  formation: Formation;
  /** the room there is, as a height on the board; null when it is far above the night */
  roomY: number | null;
  peakPoint: [number, number];
}
export const peakFormation = ({ W, H }: NightSize, palette: NightPalette, commit: Pick<OwnedStreamingLaunchCommit, 'outcomeTier' | 'protectedPeakConcurrentStreams'>, peak: number, options: {
  /** how much of the night's curve has already happened when this comes up, 0–1 */
  drawnSoFar: number;
  /** seconds until the peak */
  reach: number;
  /** where the board goes, between the words above and below it */
  top: number;
  bottom: number;
}): NightPeak => {
  const f = blankFormation();
  const rand = seeded('peak');
  const room = commit.protectedPeakConcurrentStreams;
  const roomInBoard = room <= peak * 2;
  const ceiling = Math.max(peak * 1.14, roomInBoard ? room * 1.1 : 0, 1);
  const boardTop = options.top;
  const boardHeight = Math.max(60, options.bottom - options.top);
  const gap = clamp(W / 72, 4.1, 6);
  const cols = Math.floor((W - 28) / gap);
  const rows = Math.floor(boardHeight / gap);
  const left = (W - (cols - 1) * gap) / 2;
  const tier = commit.outcomeTier;
  const hot = tier === 'DEGRADED_OPENING' ? RED : tier === 'PRESSURED_OPENING' ? AMBER : palette.lift;
  let next = 0;
  const roomRow = roomInBoard ? Math.round((room / ceiling) * (rows - 1)) : -1;
  for (let c = 0; c < cols; c += 1) {
    const at = c / Math.max(1, cols - 1);
    const height = smooth(at) * (peak / ceiling);
    const lit = Math.ceil(height * (rows - 1));
    const act = at <= options.drawnSoFar ? -1 : ((at - options.drawnSoFar) / Math.max(0.001, 1 - options.drawnSoFar)) * options.reach;
    for (let r = 0; r < rows && next < NIGHT_LIGHTS; r += 1, next += 1) {
      const x = left + c * gap;
      const y = boardTop + boardHeight - r * gap;
      if (r === roomRow) {
        put(f, next, x, y, 2.6, c % 2 ? 0.95 : 0.25, WHITE);
      } else if (r <= lit) {
        const above = roomInBoard && r > roomRow;
        /* the top of the curve is the brightest thing on the board */
        const colour = r === lit ? WHITE : above ? hot : mix(palette.brand, palette.lift, r / Math.max(1, rows - 1));
        const falls = tier === 'DEGRADED_OPENING' && r > lit * 0.42;
        put(f, next, x, y, r === lit ? 4.4 : 3.5, r === lit ? 1 : 0.42 + 0.58 * (r / Math.max(1, lit)), colour, act, falls ? KIND.FALLING : KIND.DOT);
      } else {
        /* a lamp that never comes on: it still shows the board */
        put(f, next, x, y, 2.3, 0.8, [0.3, 0.36, 0.48], 1e6);
      }
    }
  }
  /* the fireworks: everything else, waiting unseen, if the night deserves them */
  const shells = tier === 'SMOOTH_OPENING' ? FIREWORK_SHELLS : tier === 'PRESSURED_OPENING' ? 2 : 0;
  const colours: Rgb[] = [palette.lift, palette.accent, WARM, palette.brand, WHITE];
  const spare = NIGHT_LIGHTS - next;
  for (let s = 0; s < shells; s += 1) {
    const cx = W * (0.16 + ((s * 0.618) % 1) * 0.68);
    const cy = boardTop + boardHeight * (0.08 + rand() * 0.5);
    const at = options.reach + FIREWORK_TIMES[s];
    const colour = colours[s % colours.length];
    const reach = 8 + rand() * 5.5;
    const count = Math.floor(spare / shells);
    for (let n = 0; n < count && next < NIGHT_LIGHTS; n += 1, next += 1) put(f, next, cx, cy, reach, 1, mix(colour, WHITE, rand() * 0.3), at, KIND.FIREWORK);
  }
  for (; next < NIGHT_LIGHTS; next += 1) put(f, next, W / 2, H / 2, 1, 0, WHITE);
  const peakRow = (peak / ceiling) * (rows - 1);
  return {
    formation: f,
    roomY: roomInBoard ? boardTop + boardHeight - roomRow * gap : null,
    peakPoint: [left + (cols - 1) * gap, boardTop + boardHeight - peakRow * gap],
  };
};
