/**
 * #156: what a scene puts on its faces, drawn once per creative and kept.
 *  - `faceArt`: the creative in the face's own shape. When the face is the creative's frame (a billboard showing a
 *    3:1 creative) it is cover-fitted; when it is far from it (a tall airport screen showing a 9:16 creative, a long
 *    tower banner showing a 1:3 one) the creative is shown whole and carried on past its edges in its edges' own
 *    colours, so nothing is cut or stretched. Kept per creative, scene and size, and handed out as an object URL so a page of
 *    format cards never encodes the same picture twice.
 *  - `backdropPixels`: a backdrop's pixels at its own size, for the LED dots to stay off the sky (`skyMask`).
 */
import type { CampaignScene, QuadScene } from './sceneCatalogue';

type Source = CanvasImageSource & { width: number; height: number };

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  /* 2026-11-16: a phone out of canvas memory (iOS) hands back no context. Say so as an error the card catches (it
     keeps its plain backdrop), never a crash halfway through drawing */
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.width = 0; canvas.height = 0; throw new Error('No canvas memory'); }
  return { canvas, ctx };
};
/** a picture made now, its failure handed back as a refused promise (the card's `.catch`), never thrown at the card */
const attempt = (make: () => Promise<string>): Promise<string> => {
  try { return make(); } catch (error) { return Promise.reject(error); }
};

/** a face's own width ÷ height */
export const faceShape = (scene: QuadScene) => scene.shape ?? scene.aspect;

/** whether the creative is shown whole, carried on in its edges' colours, rather than cover-fitted */
export const faceContains = (scene: QuadScene) => Math.abs(faceShape(scene) - scene.aspect) / scene.aspect > 0.12;

/** The creative in a face's own shape, `long` pixels on its long side. */
export const drawFaceArt = (scene: QuadScene, creative: Source, long = 1200): HTMLCanvasElement => {
  const shape = faceShape(scene);
  const width = shape >= 1 ? long : long * shape;
  const height = shape >= 1 ? long / shape : long;
  const { canvas, ctx } = canvasOf(width, height);
  const cover = Math.max(canvas.width / creative.width, canvas.height / creative.height);
  if (!faceContains(scene)) {
    ctx.drawImage(creative, (canvas.width - creative.width * cover) / 2, (canvas.height - creative.height * cover) / 2, creative.width * cover, creative.height * cover);
    return canvas;
  }
  /* the fill: the creative carried on past its edges in its edges' own colours (a poster's sky above it, its ground
     below), so it reads as one picture, never as a stretched or blurred copy of its words */
  const tall = canvas.height / canvas.width > creative.height / creative.width;
  /* 2026-11-16: no memory for the colour probes either: the main canvas is given back before the error goes up */
  const probeOf = (width: number, height: number) => {
    try { return canvasOf(width, height); } catch (error) { canvas.width = 0; canvas.height = 0; throw error; }
  };
  const edge = (from: 'START' | 'END') => {
    const probe = probeOf(tall ? 16 : 1, tall ? 1 : 16);
    const band = 0.03;
    if (tall) probe.ctx.drawImage(creative, 0, from === 'START' ? 0 : creative.height * (1 - band), creative.width, creative.height * band, 0, 0, 16, 1);
    else probe.ctx.drawImage(creative, from === 'START' ? 0 : creative.width * (1 - band), 0, creative.width * band, creative.height, 0, 0, 1, 16);
    const data = probe.ctx.getImageData(0, 0, probe.canvas.width, probe.canvas.height).data;
    probe.canvas.width = 0;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 4;
    return `rgb(${Math.round(r / n * 0.82)},${Math.round(g / n * 0.82)},${Math.round(b / n * 0.82)})`;
  };
  const wash = tall ? ctx.createLinearGradient(0, 0, 0, canvas.height) : ctx.createLinearGradient(0, 0, canvas.width, 0);
  wash.addColorStop(0, edge('START'));
  wash.addColorStop(1, edge('END'));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const contain = Math.min(canvas.width / creative.width, canvas.height / creative.height);
  const dw = creative.width * contain;
  const dh = creative.height * contain;
  ctx.drawImage(creative, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  return canvas;
};

/* B4 (2026-11-15): the campaign list restarted the game on iPhones and turned tiles black on Android as it was
   scrolled: every picture link made for a card was kept for the whole session (one per creative, scene and size, a
   new set each time a creative changed) and every drawing canvas held its memory until the browser got round to it.
   The links now live in one small cache, oldest let go first (a card off screen is unmounted, so nothing on screen
   uses an old one; it is redrawn if the card comes back), and a canvas gives back its memory as soon as its picture
   is made. */
const URL_CACHE_LIMIT = 24;
const ids = new WeakMap<object, number>();
let nextId = 0;
const idOf = (creative: object): number => {
  let id = ids.get(creative);
  if (id === undefined) { id = (nextId += 1); ids.set(creative, id); }
  return id;
};
const cache = new Map<string, Promise<string>>();
/* 2026-11-16: the cache could let a link go while a card was still waiting for it, or still showing it (more than 24
   pictures near the screen at once: 12 of 36 came up blank in the test). A link still being drawn is never let go.
   One that leaves the cache waits 10 s before it is let go, time for the card it was made for to start showing it
   (`showArt`); a link a card shows stays alive until the last card showing it lets go. */
const settled = new Map<string, string>();
const showing = new Map<string, number>();
const leftOver = new Set<string>();
const GRACE_MS = 10000;
const fading = new Map<string, number>();
let sweeper: ReturnType<typeof setTimeout> | undefined;
const sweep = () => {
  const now = Date.now();
  for (const [url, since] of [...fading]) {
    if (showing.has(url)) { fading.delete(url); leftOver.add(url); }
    else if (now - since >= GRACE_MS) { fading.delete(url); URL.revokeObjectURL(url); }
  }
  sweeper = fading.size ? setTimeout(sweep, 1000) : undefined;
};
const letGo = (url: string) => {
  if (showing.has(url)) { leftOver.add(url); return; }
  fading.set(url, Date.now());
  if (sweeper === undefined) sweeper = setTimeout(sweep, 1000);
};
const trim = () => {
  for (const key of [...cache.keys()]) {
    if (cache.size <= URL_CACHE_LIMIT) return;
    const url = settled.get(key);
    if (!url) continue;
    cache.delete(key);
    settled.delete(key);
    letGo(url);
  }
};
const remember = (key: string, made: Promise<string>): Promise<string> => {
  cache.set(key, made);
  made.then(url => {
    if (cache.get(key) === made) settled.set(key, url);
    else letGo(url);
    trim();
  }, () => { if (cache.get(key) === made) cache.delete(key); });
  trim();
  return made;
};
/** a card shows `url` until the returned function is called (its effect's clean-up) */
export const showArt = (url: string): (() => void) => {
  showing.set(url, (showing.get(url) ?? 0) + 1);
  if (fading.delete(url)) leftOver.add(url);
  return () => {
    const left = (showing.get(url) ?? 1) - 1;
    if (left > 0) { showing.set(url, left); return; }
    showing.delete(url);
    if (leftOver.delete(url)) URL.revokeObjectURL(url);
  };
};
const recall = (key: string): Promise<string> | undefined => {
  const known = cache.get(key);
  if (known) { cache.delete(key); cache.set(key, known); }
  return known;
};
/** a drawn canvas's picture as a link, the canvas emptied at once (iOS counts canvas memory until it is freed) */
const toUrl = (canvas: HTMLCanvasElement, what: string): Promise<string> => new Promise<string>((resolve, reject) => {
  canvas.toBlob(blob => {
    canvas.width = 0;
    canvas.height = 0;
    if (blob) resolve(URL.createObjectURL(blob)); else reject(new Error(what));
  }, 'image/jpeg', 0.86);
});

/* object URLs of face art, per creative, scene and size: a page of cards shares them */
export const faceArtUrl = (scene: QuadScene, creative: Source, long = 1200): Promise<string> => {
  const key = `face:${idOf(creative)}:${scene.id}:${long}`;
  return recall(key) ?? remember(key, attempt(() => toUrl(drawFaceArt(scene, creative, long), 'No face art')));
};

/* a creative itself as an object URL, `long` pixels on its long side (the online formats' cards) */
export const creativeUrl = (creative: Source, long = 600): Promise<string> => {
  const key = `plain:${idOf(creative)}:${long}`;
  const known = recall(key);
  if (known) return known;
  return remember(key, attempt(() => {
    const scale = Math.min(1, long / Math.max(creative.width, creative.height));
    const { canvas, ctx } = canvasOf(creative.width * scale, creative.height * scale);
    ctx.drawImage(creative, 0, 0, canvas.width, canvas.height);
    return toUrl(canvas, 'No creative');
  }));
};

/* a backdrop's pixels at its own size, per scene and image (the thumb is enough to tell sky from tower) */
const pixels = new Map<string, Promise<ImageData>>();
export const backdropPixels = (scene: CampaignScene, src: string): Promise<ImageData> => {
  const key = `${scene.id}:${src}`;
  const known = pixels.get(key);
  if (known) return known;
  const made = new Promise<ImageData>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const { canvas, ctx } = canvasOf(scene.width, scene.height);
        ctx.drawImage(image, 0, 0, scene.width, scene.height);
        const data = ctx.getImageData(0, 0, scene.width, scene.height);
        canvas.width = 0;
        resolve(data);
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
  pixels.set(key, made);
  made.catch(() => pixels.delete(key));
  return made;
};

/** sky, not structure: blue and dark (a night sky through a lattice) */
export const isSky = (data: ImageData, x: number, y: number) => {
  const i = (Math.min(data.height - 1, Math.max(0, Math.round(y))) * data.width + Math.min(data.width - 1, Math.max(0, Math.round(x)))) * 4;
  const r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
  return b > r + 18 && b > g + 6 && 0.2126 * r + 0.7152 * g + 0.0722 * b < 95;
};
