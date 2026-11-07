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
  return { canvas, ctx: canvas.getContext('2d')! };
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
  const edge = (from: 'START' | 'END') => {
    const probe = canvasOf(tall ? 16 : 1, tall ? 1 : 16);
    const band = 0.03;
    if (tall) probe.ctx.drawImage(creative, 0, from === 'START' ? 0 : creative.height * (1 - band), creative.width, creative.height * band, 0, 0, 16, 1);
    else probe.ctx.drawImage(creative, from === 'START' ? 0 : creative.width * (1 - band), 0, creative.width * band, creative.height, 0, 0, 1, 16);
    const data = probe.ctx.getImageData(0, 0, probe.canvas.width, probe.canvas.height).data;
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

/* object URLs of face art, per creative, scene and size: a page of cards shares them */
const urls = new WeakMap<object, Map<string, Promise<string>>>();
export const faceArtUrl = (scene: QuadScene, creative: Source, long = 1200): Promise<string> => {
  let byScene = urls.get(creative);
  if (!byScene) { byScene = new Map(); urls.set(creative, byScene); }
  const key = `${scene.id}:${long}`;
  const known = byScene.get(key);
  if (known) return known;
  const made = new Promise<string>((resolve, reject) => {
    const canvas = drawFaceArt(scene, creative, long);
    canvas.toBlob(blob => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('No face art'))), 'image/jpeg', 0.86);
  });
  byScene.set(key, made);
  made.catch(() => byScene!.delete(key));
  return made;
};

/* a creative itself as an object URL, `long` pixels on its long side (the online formats' cards) */
const plain = new WeakMap<object, Map<number, Promise<string>>>();
export const creativeUrl = (creative: Source, long = 600): Promise<string> => {
  let bySize = plain.get(creative);
  if (!bySize) { bySize = new Map(); plain.set(creative, bySize); }
  const known = bySize.get(long);
  if (known) return known;
  const made = new Promise<string>((resolve, reject) => {
    const scale = Math.min(1, long / Math.max(creative.width, creative.height));
    const { canvas, ctx } = canvasOf(creative.width * scale, creative.height * scale);
    ctx.drawImage(creative, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('No creative'))), 'image/jpeg', 0.86);
  });
  bySize.set(long, made);
  made.catch(() => bySize!.delete(long));
  return made;
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
      const { ctx } = canvasOf(scene.width, scene.height);
      ctx.drawImage(image, 0, 0, scene.width, scene.height);
      resolve(ctx.getImageData(0, 0, scene.width, scene.height));
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
