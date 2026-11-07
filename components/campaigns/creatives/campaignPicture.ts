/**
 * A campaign's picture (#149; plan §20.10 point 6: "Each comes with 2–3 X posts from fans and press, with the scene's
 * picture"). One still of what the city saw, kept in the media store for the news, the fans' posts and Instagram:
 *  - the Burj Khalifa: the backdrop with the creative in the facade's LED dots, their glow, the tower's light on the sky
 *    and its reflection in the water, as the live scene composes them;
 *  - a billboard: the backdrop with the creative mapped onto the board in true perspective (a fine mesh of triangles,
 *    since a canvas has no perspective transform) and lit by the lamps below it;
 *  - #156, every format's scene: each face of a scene (six posters, two airport screens) with the creative fitted to
 *    it and lit as the live scene lights it (lamps above, the day, dusk, or a screen's own glow), a train's joins, a
 *    flyer's paper border; Tokyo Tower's and the Empire State Building's lights off the sky; the London Eye's rim; a
 *    drone show writing the name;
 *  - any other campaign: its widest creative.
 * Drawn after a launch, in the background (never on the tap); a picture that never arrives leaves the posts without one.
 */
import { CAMPAIGN_SCENES, type CampaignSceneId, type DronesScene, type LedFacadeScene, type QuadScene, type RingScene } from '../scenes/sceneCatalogue';
import { quadPoint, type ScenePoint, type SceneQuad } from '../scenes/sceneGeometry';
import { drawLedFacade, drawLedReflection, drawLedRing, drawReflection } from '../scenes/ledFacade';
import { drawFaceArt, faceShape } from '../scenes/sceneArt';
import { drawDrones, droneFleet } from '../scenes/droneShow';
import { loadMediaBlob } from '../../../services/mediaStorage';
import { keepCreativeAs } from './creativeMedia';

type Source = CanvasImageSource & { width: number; height: number };

/** a picture is kept at three quarters of its backdrop: 768 × 1152 */
const PICTURE_SCALE = 0.75;

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Could not load ${src}`));
  image.src = src;
});

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return { canvas, ctx: canvas.getContext('2d')! };
};

/** a soft blur that every browser draws the same: down to a small canvas and back up */
const softened = (source: HTMLCanvasElement, factor: number) => {
  const small = canvasOf(source.width / factor, source.height / factor);
  small.ctx.imageSmoothingQuality = 'high';
  small.ctx.drawImage(source, 0, 0, small.canvas.width, small.canvas.height);
  return small.canvas;
};

/** one triangle of the source drawn onto one triangle of the photo (an affine map, clipped, grown half a pixel) */
const drawTriangle = (ctx: CanvasRenderingContext2D, image: Source, s: [ScenePoint, ScenePoint, ScenePoint], d: [ScenePoint, ScenePoint, ScenePoint]) => {
  const [[x0, y0], [x1, y1], [x2, y2]] = s;
  const [[u0, v0], [u1, v1], [u2, v2]] = d;
  const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (Math.abs(den) < 1e-9) return;
  const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den;
  const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den;
  const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den;
  const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den;
  const dd = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den;
  const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den;
  const cx = (u0 + u1 + u2) / 3;
  const cy = (v0 + v1 + v2) / 3;
  const grow = ([px, py]: ScenePoint): ScenePoint => {
    const length = Math.hypot(px - cx, py - cy) || 1;
    return [px + ((px - cx) / length) * 0.6, py + ((py - cy) / length) * 0.6];
  };
  const [g0, g1, g2] = d.map(grow);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g0[0], g0[1]);
  ctx.lineTo(g1[0], g1[1]);
  ctx.lineTo(g2[0], g2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, dd, e, f);
  /* only the cell's part of the source, a pixel wider */
  const left = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 1);
  const top = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 1);
  const right = Math.min(image.width, Math.ceil(Math.max(x0, x1, x2)) + 1);
  const bottom = Math.min(image.height, Math.ceil(Math.max(y0, y1, y2)) + 1);
  ctx.drawImage(image, left, top, right - left, bottom - top, left, top, right - left, bottom - top);
  ctx.restore();
};

/** A source drawn onto a four-cornered face in true perspective. */
export const drawToQuad = (ctx: CanvasRenderingContext2D, image: Source, quad: SceneQuad, cols = 18, rows = 8) => {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const u0 = col / cols, u1 = (col + 1) / cols, v0 = row / rows, v1 = (row + 1) / rows;
      const s00: ScenePoint = [u0 * image.width, v0 * image.height];
      const s10: ScenePoint = [u1 * image.width, v0 * image.height];
      const s11: ScenePoint = [u1 * image.width, v1 * image.height];
      const s01: ScenePoint = [u0 * image.width, v1 * image.height];
      const d00 = quadPoint(quad, u0, v0), d10 = quadPoint(quad, u1, v0), d11 = quadPoint(quad, u1, v1), d01 = quadPoint(quad, u0, v1);
      drawTriangle(ctx, image, [s00, s10, s11], [d00, d10, d11]);
      drawTriangle(ctx, image, [s00, s11, s01], [d00, d11, d01]);
    }
  }
};

/** the creative cover-fitted into the board's own shape, as the live scene's `background-size: cover` does */
const boardArt = (creative: Source, aspect: number) => {
  const width = 1200;
  const height = Math.round(width / aspect);
  const { canvas, ctx } = canvasOf(width, height);
  const scale = Math.max(width / creative.width, height / creative.height);
  ctx.drawImage(creative, (width - creative.width * scale) / 2, (height - creative.height * scale) / 2, creative.width * scale, creative.height * scale);
  return canvas;
};

/** #156: a print's light by day, at dusk or from lamps above (the scene's `.lightDay`, `.lightDusk`, `.lightAbove`) */
const printLight = (aspect: number, light: 'ABOVE' | 'DAY' | 'DUSK') => {
  const width = 600;
  const height = Math.round(width / aspect);
  const { canvas, ctx } = canvasOf(width, height);
  const stops: Array<[number, string]> = light === 'DAY' ? [[0, '#ffffff'], [0.55, '#f3f1ec'], [1, '#dcd8d0']]
    : light === 'DUSK' ? [[0, '#eef2fa'], [0.7, '#c3cadb'], [1, '#a7b0c6']] : [[0, '#fbf3e6'], [0.55, '#d6d1ca'], [1, '#9d9a98']];
  const base = light === 'DAY' ? ctx.createLinearGradient(0, 0, width * 0.36, height) : ctx.createLinearGradient(0, 0, 0, height);
  stops.forEach(([at, colour]) => base.addColorStop(at, colour));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  return canvas;
};

/** the lamps below a board: the foot brightest, the top falling off, warm (the scene's `.boardLight`) */
const boardLight = (aspect: number) => {
  const width = 600;
  const height = Math.round(width / aspect);
  const { canvas, ctx } = canvasOf(width, height);
  const base = ctx.createLinearGradient(0, height, 0, 0);
  base.addColorStop(0, '#f2ede4');
  base.addColorStop(0.55, '#c9c6c2');
  base.addColorStop(1, '#8f8f95');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  [0.22, 0.8].forEach(at => {
    ctx.save();
    ctx.translate(width * at, height * 1.12);
    ctx.scale(width * 0.6, height * 1.2);
    const lamp = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    lamp.addColorStop(0, 'rgba(255,244,222,1)');
    lamp.addColorStop(0.7, 'rgba(255,244,222,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  });
  return canvas;
};

const vignette = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.save();
  ctx.translate(width * 0.5, height * 0.45);
  ctx.scale(width * 1.2, height * 0.9);
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  shade.addColorStop(0.55, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
};

/* a face shrunk by a paper border, in its own perspective */
const insetQuad = (quad: SceneQuad, margin: number): SceneQuad => (margin > 0
  ? [quadPoint(quad, margin, margin), quadPoint(quad, 1 - margin, margin), quadPoint(quad, 1 - margin, 1 - margin), quadPoint(quad, margin, 1 - margin)] : quad);

const billboardPicture = (scene: QuadScene, backdrop: HTMLImageElement, creative: Source) => {
  const { canvas, ctx } = canvasOf(scene.width, scene.height);
  ctx.drawImage(backdrop, 0, 0, scene.width, scene.height);
  /* #144's billboard as it was; #156: every face, the creative fitted to its shape and lit as the live scene lights it */
  const shape = faceShape(scene);
  const art = scene.shape || scene.margin ? drawFaceArt(scene, creative, 1200) : boardArt(creative, scene.aspect);
  const screen = scene.surface === 'SCREEN';
  const light = screen ? null : (scene.light ?? 'BELOW') === 'BELOW' ? boardLight(shape) : printLight(shape, scene.light as 'ABOVE' | 'DAY' | 'DUSK');
  [scene.quad, ...(scene.quads || [])].forEach(face => {
    const quad = insetQuad(face, scene.margin ?? 0);
    drawToQuad(ctx, art, quad);
    if (light) {
      ctx.globalCompositeOperation = 'multiply';
      drawToQuad(ctx, light, quad, 12, 4);
      ctx.globalCompositeOperation = 'source-over';
    }
    /* a train's joins */
    (scene.seams || []).forEach(at => {
      const [x0, y0] = quadPoint(face, at, 0);
      const [x1, y1] = quadPoint(face, at, 1);
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    });
  });
  vignette(ctx, scene.width, scene.height);
  return canvas;
};

const facadePicture = (scene: LedFacadeScene, backdrop: HTMLImageElement, creative: Source) => {
  const { canvas, ctx } = canvasOf(scene.width, scene.height);
  ctx.drawImage(backdrop, 0, 0, scene.width, scene.height);
  const led = document.createElement('canvas');
  /* #156: the dots stay off the sky the backdrop shows (a lattice, a spire) */
  drawLedFacade(led, scene, creative, scene.skyMask ? ctx.getImageData(0, 0, scene.width, scene.height) : null);
  const reflection = document.createElement('canvas');
  drawLedReflection(reflection, scene, led);
  ctx.globalCompositeOperation = 'screen';
  /* the tower's light on the sky (the scene's `.skyGlow`) */
  const top = scene.profile[0];
  ctx.save();
  ctx.translate(top[1] + 50, top[0] + 330);
  ctx.scale(310, 550);
  const sky = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  sky.addColorStop(0, 'rgba(150,180,255,.24)');
  sky.addColorStop(1, 'rgba(150,180,255,0)');
  ctx.fillStyle = sky;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  /* the glow, the dots, the water */
  ctx.globalAlpha = 0.85;
  ctx.drawImage(softened(led, 8), 0, 0, scene.width, scene.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(led, 0, 0);
  ctx.drawImage(softened(reflection, 2), 0, 0, scene.width, scene.height);
  ctx.globalCompositeOperation = 'source-over';
  vignette(ctx, scene.width, scene.height);
  return canvas;
};

/* #156: the London Eye's rim, its glow and the river */
const ringPicture = (scene: RingScene, backdrop: HTMLImageElement, creative: Source) => {
  const { canvas, ctx } = canvasOf(scene.width, scene.height);
  ctx.drawImage(backdrop, 0, 0, scene.width, scene.height);
  const led = document.createElement('canvas');
  drawLedRing(led, scene, creative);
  const reflection = document.createElement('canvas');
  drawLedReflection(reflection, scene, led);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.8;
  ctx.drawImage(softened(led, 8), 0, 0, scene.width, scene.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(led, 0, 0);
  ctx.drawImage(softened(reflection, 2), 0, 0, scene.width, scene.height);
  ctx.globalCompositeOperation = 'source-over';
  vignette(ctx, scene.width, scene.height);
  return canvas;
};

/* #156: the fleet in place, its glow and the water */
const dronesPicture = (scene: DronesScene, backdrop: HTMLImageElement, label: string, hue: number) => {
  const { canvas, ctx } = canvasOf(scene.width, scene.height);
  ctx.drawImage(backdrop, 0, 0, scene.width, scene.height);
  const fleet = document.createElement('canvas');
  drawDrones(fleet, scene, droneFleet(scene, label, hue), 1);
  const reflection = document.createElement('canvas');
  drawReflection(reflection, scene, fleet, scene.sky[3]);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.8;
  ctx.drawImage(softened(fleet, 6), 0, 0, scene.width, scene.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(fleet, 0, 0);
  ctx.drawImage(softened(reflection, 2), 0, 0, scene.width, scene.height);
  ctx.globalCompositeOperation = 'source-over';
  vignette(ctx, scene.width, scene.height);
  return canvas;
};

/** The campaign's picture: its scene with its creative, or the creative alone; a drone show writes `label` in `hue`. */
export const composeCampaignPicture = async (sceneId: CampaignSceneId | null, creative: Source, label = '', hue = 214): Promise<HTMLCanvasElement> => {
  if (!sceneId) return creative instanceof HTMLCanvasElement ? creative : (() => {
    const { canvas, ctx } = canvasOf(creative.width, creative.height);
    ctx.drawImage(creative, 0, 0);
    return canvas;
  })();
  const scene = CAMPAIGN_SCENES[sceneId];
  const backdrop = await loadImage(scene.backdrop);
  const full = scene.kind === 'QUAD' ? billboardPicture(scene, backdrop, creative)
    : scene.kind === 'RING' ? ringPicture(scene, backdrop, creative)
      : scene.kind === 'DRONES' ? dronesPicture(scene, backdrop, label, hue) : facadePicture(scene, backdrop, creative);
  const { canvas, ctx } = canvasOf(scene.width * PICTURE_SCALE, scene.height * PICTURE_SCALE);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
  return canvas;
};

/** Draws a campaign's picture and keeps it under `id`: from a creative in hand, or one read back from the store. */
export const keepCampaignPicture = async (id: string, sceneId: CampaignSceneId | null, source: Source | { mediaId: string }, label = '', hue = 214): Promise<void> => {
  let creative: Source | null = 'mediaId' in source ? null : source;
  if ('mediaId' in source) {
    const blob = await loadMediaBlob(source.mediaId);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    try { creative = await loadImage(url); } finally { URL.revokeObjectURL(url); }
  }
  if (!creative) return;
  keepCreativeAs(id, await composeCampaignPicture(sceneId, creative, label, hue));
};
