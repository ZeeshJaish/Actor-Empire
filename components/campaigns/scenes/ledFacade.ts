/**
 * A building as its own screen (#144): the creative is sampled into the facade's LED dots, row by row inside the
 * tower's outline, each dot in the colour under it, brightened the way LEDs read at night. Drawn once per creative
 * into a canvas the size of the backdrop; the scene reveals it, glows it and reflects it in the water.
 * #156: a sky mask keeps the dots on the structure (Tokyo Tower's lattice, the Empire State Building's spire); a wheel's
 * rim (the London Eye) is lit round in the creative's colours; a scene with no water has no reflection.
 */
import type { LedFacadeScene, RingScene } from './sceneCatalogue';
import { isSky } from './sceneArt';

/** the facade's left and right edge at a height, between the measured rows */
export const facadeEdges = (scene: LedFacadeScene, y: number): [number, number] | null => {
  const rows = scene.profile;
  if (y < rows[0][0] || y > rows[rows.length - 1][0]) return null;
  const at = rows.findIndex(row => row[0] >= y);
  if (rows[at][0] === y || at === 0) return [rows[at][1], rows[at][2]];
  const [y0, l0, r0] = rows[at - 1];
  const [y1, l1, r1] = rows[at];
  const t = (y - y0) / (y1 - y0);
  /* the setbacks step rather than slope: take the row above until the step */
  return [t < .5 ? l0 : l1, t < .5 ? r0 : r1];
};

/** The creative's pixels across the facade's box, cover-fit and centred, as the dots will sample them. */
const sampleCreative = (scene: LedFacadeScene, creative: CanvasImageSource & { width: number; height: number }) => {
  const top = scene.profile[0][0];
  const bottom = scene.profile[scene.profile.length - 1][0];
  const left = Math.min(...scene.profile.map(row => row[1]));
  const right = Math.max(...scene.profile.map(row => row[2]));
  const box = { x: left, y: top, w: right - left, h: bottom - top };
  const canvas = document.createElement('canvas');
  canvas.width = box.w;
  canvas.height = box.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const scale = Math.max(box.w / creative.width, box.h / creative.height);
  const dw = creative.width * scale;
  const dh = creative.height * scale;
  ctx.drawImage(creative, (box.w - dw) / 2, (box.h - dh) / 2, dw, dh);
  return { box, pixels: ctx.getImageData(0, 0, box.w, box.h) };
};

/** LEDs at night: dark stays dark, colour comes up bright and saturated. */
const ledColour = (r: number, g: number, b: number): [number, number, number, number] => {
  const max = Math.max(r, g, b);
  const lift = max > 0 ? Math.min(1.8, 255 / max) : 1;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return [Math.min(255, r * lift), Math.min(255, g * lift), Math.min(255, b * lift), Math.min(1, 0.05 + lum * 1.4)];
};

/** Draws the facade's dots for this creative into `target` (sized to the backdrop); with `mask`, none on the sky. */
export const drawLedFacade = (target: HTMLCanvasElement, scene: LedFacadeScene, creative: CanvasImageSource & { width: number; height: number }, mask?: ImageData | null) => {
  target.width = scene.width;
  target.height = scene.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, target.width, target.height);
  const { box, pixels } = sampleCreative(scene, creative);
  const pitch = scene.pitch;
  const radius = pitch * 0.36;
  for (let y = box.y + pitch / 2; y < box.y + box.h; y += pitch) {
    const edges = facadeEdges(scene, y);
    if (!edges) continue;
    const [left, right] = edges;
    /* the facade's curve: dots thin out towards the edges, as a round tower turns away */
    const mid = (left + right) / 2;
    const half = (right - left) / 2;
    for (let x = left + pitch / 2; x < right - pitch / 4; x += pitch) {
      if (mask && isSky(mask, x, y)) continue;
      const px = Math.min(box.w - 1, Math.max(0, Math.round(x - box.x)));
      const py = Math.min(box.h - 1, Math.max(0, Math.round(y - box.y)));
      const i = (py * box.w + px) * 4;
      const [r, g, b, a] = ledColour(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
      const turn = 1 - Math.pow(Math.abs(x - mid) / Math.max(1, half), 3) * 0.55;
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${(a * turn).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

/** #156: a light layer's lower part mirrored into the water below `waterline`, stretched and faded (none without
    water); `bottom` is where the lights end. */
export const drawReflection = (target: HTMLCanvasElement, size: { width: number; height: number; waterline: number | null }, source: HTMLCanvasElement, bottom: number) => {
  target.width = size.width;
  target.height = size.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, target.width, target.height);
  if (size.waterline === null) return;
  const band = 140;
  const room = size.height - size.waterline;
  ctx.save();
  ctx.translate(0, size.waterline + 8);
  ctx.scale(1, room / band);
  ctx.translate(0, band);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(source, 0, bottom - band, size.width, band, 0, 0, size.width, band);
  ctx.restore();
  /* fade with depth */
  const fade = ctx.createLinearGradient(0, size.waterline, 0, size.height);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, size.waterline, size.width, room);
  ctx.globalCompositeOperation = 'source-over';
};

/** The facade's (or the wheel's) lower part mirrored into the water below `waterline`, for the reflection layer. */
export const drawLedReflection = (target: HTMLCanvasElement, scene: LedFacadeScene | RingScene, facade: HTMLCanvasElement) => (
  drawReflection(target, scene, facade, scene.kind === 'RING' ? scene.center[1] + scene.outer : scene.profile[scene.profile.length - 1][0])
);

/** #156: a wheel's rim lit round in the creative's colours: its colours laid along the rim, left to right as the
    wheel turns from the top, in rings of dots between the rim's inner and outer edge; the spokes faintly. */
export const drawLedRing = (target: HTMLCanvasElement, scene: RingScene, creative: CanvasImageSource & { width: number; height: number }, compact = false) => {
  target.width = scene.width;
  target.height = scene.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, target.width, target.height);
  /* the creative squeezed into a strip: across is round the rim, down is from its inner to its outer edge */
  const strip = document.createElement('canvas');
  strip.width = 360;
  strip.height = 24;
  const sctx = strip.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(creative, 0, 0, strip.width, strip.height);
  const pixels = sctx.getImageData(0, 0, strip.width, strip.height).data;
  /* a wheel is flooded with light, not shown as a picture: the creative's most vivid colour carries its dark parts */
  let accent: [number, number, number] = [150, 180, 255];
  let best = -1;
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const vivid = (max - Math.min(r, g, b)) * max;
    if (vivid > best) { best = vivid; accent = [r, g, b]; }
  }
  const lift = Math.max(...accent) > 0 ? 255 / Math.max(...accent) : 1;
  accent = [Math.min(255, accent[0] * lift), Math.min(255, accent[1] * lift), Math.min(255, accent[2] * lift)];
  const at = (turn: number, depth: number): [number, number, number, number] => {
    const x = Math.min(359, Math.max(0, Math.floor(turn * 360)));
    const y = Math.min(23, Math.max(0, Math.floor(depth * 24)));
    const i = (y * 360 + x) * 4;
    const [r, g, b, a] = ledColour(pixels[i], pixels[i + 1], pixels[i + 2]);
    const dark = Math.max(0, 0.6 - a) / 0.6;
    return [r + (accent[0] - r) * dark, g + (accent[1] - g) * dark, b + (accent[2] - b) * dark, Math.max(0.62, a)];
  };
  const [cx, cy] = scene.center;
  /* on a small card the dots run together into a lit band, as the eye reads a wheel from far away */
  const radius = scene.pitch * (compact ? 0.62 : 0.36);
  const dot = (x: number, y: number, [r, g, b, a]: [number, number, number, number], fade: number) => {
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.max(0.12, a * fade).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let ring = scene.inner; ring <= scene.outer; ring += scene.pitch) {
    const steps = Math.round((Math.PI * 2 * ring) / scene.pitch);
    for (let step = 0; step < steps; step += 1) {
      const turn = step / steps;
      const angle = turn * Math.PI * 2 - Math.PI / 2;
      dot(cx + Math.cos(angle) * ring, cy + Math.sin(angle) * ring, at(turn, (ring - scene.inner) / Math.max(1, scene.outer - scene.inner)), 1);
    }
  }
  /* 32 spokes, faint, each in its point of the rim's colour */
  for (let spoke = 0; spoke < 32; spoke += 1) {
    const turn = spoke / 32;
    const angle = turn * Math.PI * 2 - Math.PI / 2;
    for (let along = 24; along < scene.inner - 4; along += scene.pitch * 1.6) {
      dot(cx + Math.cos(angle) * along, cy + Math.sin(angle) * along, at(turn, 0.5), 0.35);
    }
  }
};
