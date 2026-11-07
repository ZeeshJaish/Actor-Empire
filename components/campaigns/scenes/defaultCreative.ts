/**
 * A creative made for you when none is uploaded (#144; every frame and the title's own poster art in #148, plan §20.10
 * point 5: "Without an upload, each frame is made from the title's poster or the service's logo and key art"). Drawn on
 * a canvas in the frame's own shape:
 *  - wide (a billboard 3:1, a train's side 8:1): the poster's art in a panel on the left fading into its colours, the
 *    title large beside it, "Now streaming on …";
 *  - widescreen (16:9, a TV spot's end card): the art across the frame, the words low on the left;
 *  - square, poster and vertical (1:1, 2:3, 9:16, the 1:3 tower banner): the one-sheet itself, the title in its lower
 *    third under a hairline rule, a "Watch now" pill on a vertical screen;
 *  - a facade (1:6, read as LED dots): a dark field with a glowing sun, the title running up the tower in letters thick
 *    enough to read in dots.
 * A campaign for the service itself has no poster: its colours, its initial as a mark, its name and "Join today".
 */
import { drawPosterArt, type PosterArtSource } from '../creatives/posterArt';
import { madeForYouSize } from '../creatives/creativeFrames';

export interface CreativeSubject {
  title: string;
  /** the service's name */
  service: string;
  /** the title's hue and the service's (0–360) */
  hue: number;
  brandHue: number;
  /** what the campaign sells; a universe or franchise is drawn from its lead title's poster */
  kind?: 'SERVICE' | 'TITLE' | 'UNIVERSE' | 'FRANCHISE';
  /** the poster to draw from; without one the art is the service's own colours */
  art?: PosterArtSource | null;
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${((Math.round(h) % 360) + 360) % 360},${s}%,${l}%,${a})`;
const DISPLAY = "'Anton','Archivo',sans-serif";
const LABEL = "'Inter',sans-serif";

const fontsReady = async () => {
  try {
    await Promise.all(['400 120px Anton', '900 60px Archivo', '800 40px Inter'].map(font => document.fonts.load(font)));
  } catch { /* the stack falls back to the system's sans */ }
};

/** words broken into at most `lines` lines, the longest line as short as possible */
const split = (text: string, lines: number): string[] => {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1 || lines <= 1) return [words.join(' ')];
  let best: string[] = [words.join(' ')];
  let bestWidth = Infinity;
  const tryCut = (cuts: number[]) => {
    const parts = [0, ...cuts, words.length].slice(1).map((end, index, ends) => words.slice(index ? ends[index - 1] : 0, end).join(' '));
    const width = Math.max(...parts.map(part => part.length));
    if (width < bestWidth) { bestWidth = width; best = parts; }
  };
  for (let a = 1; a < words.length; a += 1) {
    if (lines === 2) tryCut([a]);
    else for (let b = a + 1; b < words.length; b += 1) {
      if (lines === 3) tryCut([a, b]);
      else for (let c = b + 1; c < words.length; c += 1) tryCut([a, b, c]);
    }
    if (lines > 2) tryCut([a]);
  }
  return best;
};

/** the largest font size (px) at which every line fits `width` */
const fit = (ctx: CanvasRenderingContext2D, lines: string[], family: string, weight: string, width: number, max: number) => {
  let size = max;
  for (; size > 10; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (lines.every(line => ctx.measureText(line).width <= width)) break;
  }
  return size;
};

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
};

/** a service's art: its colour, a soft light, its initial as a faint mark */
const drawBrandArt = (ctx: CanvasRenderingContext2D, subject: CreativeSubject, box: { x: number; y: number; w: number; h: number }) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const field = ctx.createLinearGradient(box.x, box.y, box.x + box.w * 0.4, box.y + box.h);
  field.addColorStop(0, hsl(subject.brandHue, 78, 30));
  field.addColorStop(0.6, hsl(subject.brandHue + 10, 70, 12));
  field.addColorStop(1, hsl(subject.brandHue + 20, 60, 6));
  ctx.fillStyle = field;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const r = Math.max(box.w, box.h) * 0.6;
  const light = ctx.createRadialGradient(box.x + box.w / 2, box.y + box.h * 0.36, 0, box.x + box.w / 2, box.y + box.h * 0.36, r);
  light.addColorStop(0, hsl(subject.brandHue - 10, 95, 70, 0.55));
  light.addColorStop(1, hsl(subject.brandHue, 90, 40, 0));
  ctx.fillStyle = light;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const initial = (subject.service.replace(/[^A-Za-z0-9]/g, '')[0] || '+').toUpperCase();
  const size = Math.min(box.w, box.h) * 0.9;
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillText(initial, box.x + box.w / 2, box.y + box.h * 0.46);
  ctx.restore();
};

const drawArt = (ctx: CanvasRenderingContext2D, subject: CreativeSubject, box: { x: number; y: number; w: number; h: number }) => (
  subject.art ? drawPosterArt(ctx, subject.art, box) : drawBrandArt(ctx, subject, box)
);

/** the words a creative says: the headline, and the line under it (the service sells itself; anything else is a title) */
const wordsOf = (subject: CreativeSubject) => (subject.kind === 'SERVICE'
  ? { headline: subject.service, eyebrow: 'NOW STREAMING', foot: 'JOIN TODAY' }
  : { headline: subject.title, eyebrow: 'NOW STREAMING', foot: `ON ${subject.service.toUpperCase()}` });

const shadowed = (ctx: CanvasRenderingContext2D, blur: number) => {
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = blur;
};

/** a billboard or a train's side: the art in a panel, the words beside it */
const wide = (subject: CreativeSubject, width: number, height: number): HTMLCanvasElement => {
  const { canvas, ctx } = canvasOf(width, height);
  const field = ctx.createLinearGradient(0, 0, width, height);
  field.addColorStop(0, hsl(subject.hue, 70, 20));
  field.addColorStop(0.55, hsl(subject.hue, 75, 11));
  field.addColorStop(1, hsl(subject.brandHue, 80, 9));
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, width, height);
  const thin = width / height >= 5;
  /* #159: a train's side carries the art faintly from end to end, as real wraps do */
  if (thin) {
    ctx.save();
    ctx.globalAlpha = 0.24;
    drawArt(ctx, subject, { x: 0, y: 0, w: width, h: height });
    ctx.restore();
  }
  /* the art panel, its right edge fading into the field (#159: a train's side has one at each end) */
  const panel = Math.round(Math.min(width * 0.42, height * 1.1));
  const endPanel = (side: 'LEFT' | 'RIGHT') => {
    const art = canvasOf(panel, height);
    drawArt(art.ctx, subject, { x: 0, y: 0, w: panel, h: height });
    const fade = art.ctx.createLinearGradient(0, 0, panel, 0);
    fade.addColorStop(side === 'LEFT' ? 0.62 : 0, side === 'LEFT' ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)');
    fade.addColorStop(side === 'LEFT' ? 1 : 0.38, side === 'LEFT' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
    art.ctx.globalCompositeOperation = 'destination-in';
    art.ctx.fillStyle = fade;
    art.ctx.fillRect(0, 0, panel, height);
    ctx.drawImage(art.canvas, side === 'LEFT' ? 0 : width - panel, 0);
  };
  endPanel('LEFT');
  if (thin) {
    endPanel('RIGHT');
    /* the service's mark on the tail panel */
    const r = height * 0.24;
    const markX = width - panel * 0.5;
    ctx.fillStyle = hsl(subject.brandHue, 85, 52);
    ctx.beginPath();
    ctx.arc(markX, height / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `400 ${Math.round(r * 1.3)}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText((subject.service.replace(/[^A-Za-z0-9]/g, '')[0] || '+').toUpperCase(), markX, height / 2 + r * 0.06);
  }
  /* the words */
  const { headline, eyebrow, foot } = wordsOf(subject);
  const pad = height * 0.12;
  const x = panel + pad * 0.6;
  const room = width - x - pad - (thin ? panel * 0.8 : 0);
  const lines = split(headline, thin ? 1 : 2);
  const size = fit(ctx, lines, DISPLAY, '400', room, height * (thin ? 0.44 : 0.3));
  const lead = size * 0.98;
  const small = Math.max(13, Math.round(height * (thin ? 0.1 : 0.065)));
  const block = small * 1.6 + lines.length * lead + small * 1.7;
  let y = (height - block) / 2 + small;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = hsl(subject.brandHue, 90, 58);
  ctx.fillRect(x, y - small * 0.82, small * 2.6, Math.max(3, small * 0.22));
  ctx.font = `800 ${small}px ${LABEL}`;
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.fillText(eyebrow, x + small * 3.2, y);
  y += small * 0.7 + lead * 0.84;
  shadowed(ctx, size * 0.12);
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lead));
  ctx.shadowBlur = 0;
  ctx.font = `800 ${small}px ${LABEL}`;
  ctx.fillStyle = hsl(subject.brandHue, 90, 70);
  ctx.fillText(foot, x + 2, y + (lines.length - 1) * lead + small * 1.7);
  return canvas;
};

/** a TV spot's end card: the art across the frame, the words low on the left */
const widescreen = (subject: CreativeSubject, width: number, height: number): HTMLCanvasElement => {
  const { canvas, ctx } = canvasOf(width, height);
  drawArt(ctx, subject, { x: 0, y: 0, w: width, h: height });
  const shade = ctx.createLinearGradient(0, 0, width * 0.75, 0);
  shade.addColorStop(0, 'rgba(3,4,8,.72)');
  shade.addColorStop(1, 'rgba(3,4,8,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  const floor = ctx.createLinearGradient(0, height * 0.45, 0, height);
  floor.addColorStop(0, 'rgba(3,4,8,0)');
  floor.addColorStop(1, 'rgba(3,4,8,.7)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, width, height);
  const { headline, eyebrow, foot } = wordsOf(subject);
  const pad = width * 0.06;
  const lines = split(headline, 2);
  const size = fit(ctx, lines, DISPLAY, '400', width * 0.56, height * 0.19);
  const lead = size * 0.98;
  const small = Math.round(height * 0.036);
  const bottom = height - pad;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${small}px ${LABEL}`;
  ctx.fillStyle = hsl(subject.brandHue, 90, 70);
  ctx.fillText(`${eyebrow} ${foot}`, pad + 2, bottom);
  shadowed(ctx, size * 0.12);
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.fillStyle = '#ffffff';
  const top = bottom - small * 1.3 - (lines.length - 1) * lead - size * 0.06;
  lines.forEach((line, index) => ctx.fillText(line, pad, top + index * lead));
  ctx.shadowBlur = 0;
  ctx.fillStyle = hsl(subject.brandHue, 90, 58);
  ctx.fillRect(pad, top - size * 0.98, small * 2.8, Math.max(3, small * 0.24));
  return canvas;
};

/** square, poster, vertical screen, tower banner: the one-sheet, the title in its lower third */
const sheet = (subject: CreativeSubject, width: number, height: number): HTMLCanvasElement => {
  const { canvas, ctx } = canvasOf(width, height);
  drawArt(ctx, subject, { x: 0, y: 0, w: width, h: height });
  const ratio = width / height;
  const floor = ctx.createLinearGradient(0, height * 0.42, 0, height);
  floor.addColorStop(0, 'rgba(3,4,8,0)');
  floor.addColorStop(1, 'rgba(3,4,8,.82)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, width, height);
  const { headline, eyebrow, foot } = wordsOf(subject);
  const pad = width * 0.08;
  const lines = split(headline, ratio < 0.45 ? 4 : 3);
  const size = fit(ctx, lines, DISPLAY, '400', width - pad * 2, Math.min(width * 0.2, height * 0.12));
  const lead = size * 0.98;
  const small = Math.max(14, Math.round(Math.min(width * 0.034, height * 0.024)));
  /* a vertical screen keeps a "Watch now" pill at its foot, and the words sit above it */
  const vertical = ratio < 0.6 && ratio > 0.45;
  const pillH = small * 2.6;
  const pillY = height - pad * 1.5 - pillH / 2;
  const bottom = vertical ? pillY - pillH / 2 - small * 1.2 : height - pad * 1.2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${small}px ${LABEL}`;
  ctx.fillStyle = hsl(subject.brandHue, 90, 70);
  ctx.fillText(`${eyebrow} ${foot}`, width / 2, bottom);
  const top = bottom - small * 1.5 - (lines.length - 1) * lead - size * 0.04;
  /* the hairline rule over the title, as the game's posters have */
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillRect(width / 2 - width * 0.08, top - size * 1.02, width * 0.16, Math.max(2, size * 0.03));
  shadowed(ctx, size * 0.14);
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, index) => ctx.fillText(line, width / 2, top + index * lead));
  ctx.shadowBlur = 0;
  if (vertical) {
    /* a vertical screen asks: Watch now */
    const label = subject.kind === 'SERVICE' ? 'JOIN NOW' : 'WATCH NOW';
    ctx.font = `900 ${small * 1.15}px ${LABEL}`;
    const pillW = ctx.measureText(label).width + small * 3;
    ctx.fillStyle = hsl(subject.brandHue, 88, 56);
    ctx.beginPath();
    ctx.roundRect(width / 2 - pillW / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width / 2, pillY + 1);
  }
  return canvas;
};

/** the Burj Khalifa's facade: a dark field, a sun, the title running up the tower */
const facade = (subject: CreativeSubject, width: number, height: number): HTMLCanvasElement => {
  const { canvas, ctx } = canvasOf(width, height);
  const field = ctx.createLinearGradient(0, 0, 0, height);
  /* a dark field, so the letters read bright against it the way LED shows are lit */
  field.addColorStop(0, hsl(subject.brandHue, 95, 34));
  field.addColorStop(0.32, hsl(subject.hue, 90, 17));
  field.addColorStop(1, hsl(subject.hue, 85, 7));
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, width, height);
  const cx = width / 2;
  const sunY = height * 0.21;
  const sun = ctx.createRadialGradient(cx, sunY, 4, cx, sunY, width * 0.75);
  sun.addColorStop(0, hsl(subject.hue, 100, 78, 1));
  sun.addColorStop(0.5, hsl(subject.hue, 95, 52, 0.55));
  sun.addColorStop(1, hsl(subject.hue, 90, 50, 0));
  ctx.fillStyle = sun;
  ctx.fillRect(0, sunY - width * 0.95, width, width * 1.9);
  /* the title runs up the tower, in letters thick enough to read as dots */
  const words = (subject.kind === 'SERVICE' ? subject.service : subject.title).toUpperCase();
  ctx.save();
  ctx.translate(cx, height * 0.925);
  ctx.rotate(-Math.PI / 2);
  const size = fit(ctx, [words], DISPLAY, '400', height * 0.55, width * 0.66);
  ctx.font = `400 ${size}px ${DISPLAY}`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(words, 0, 0);
  ctx.restore();
  return canvas;
};

/** The made-for-you creative for a frame (width ÷ height). */
export const makeDefaultCreative = async (subject: CreativeSubject, aspect: number): Promise<HTMLCanvasElement> => {
  await fontsReady();
  const { width, height } = madeForYouSize(aspect);
  if (aspect >= 2.5) return wide(subject, width, height);
  if (aspect >= 1.4) return widescreen(subject, width, height);
  if (aspect >= 0.3) return sheet(subject, width, height);
  return facade(subject, width, height);
};
