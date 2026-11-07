/**
 * A title's poster art on a canvas (#148), so a made-for-you creative carries the same one-sheet the title has
 * everywhere in the game. It draws the shapes of `content-market-exact/Poster.tsx` (the duotone field, the glow and
 * the genre's motif, wobbled by the title's id) in the poster's own 100 × 150 units, covering the box the way the
 * poster's `xMidYMid slice` does. Plain canvas paths, no SVG, so the canvas can still be read back for the LED dots.
 */
import { motifFor } from '../../../content-market-exact/Poster';

export interface PosterArtSource {
  id: string;
  genre: string;
  hue: number;
}

const hue = (value: number) => ((Math.round(value) % 360) + 360) % 360;
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${hue(h)},${s}%,${l}%,${a})`;

/** Draws the poster's art to cover `box`, its focus (a third of the way down) kept in view. */
export const drawPosterArt = (ctx: CanvasRenderingContext2D, art: PosterArtSource, box: { x: number; y: number; w: number; h: number }) => {
  const h0 = art.hue;
  const seed = [...art.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const jitter = (n: number, span: number) => ((seed * (n + 7)) % span) - span / 2;
  const scale = Math.max(box.w / 100, box.h / 150);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.translate(box.x + (box.w - 100 * scale) / 2, box.y + (box.h - 150 * scale) / 2);
  ctx.scale(scale, scale);

  /* the field: the title's hue from a lit top to a near-black foot */
  const field = ctx.createLinearGradient(0, 0, 0, 150);
  field.addColorStop(0, hsl(h0, 62, 34));
  field.addColorStop(0.58, hsl(h0 + 12, 55, 13));
  field.addColorStop(1, hsl(h0 + 18, 48, 6));
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, 100, 150);
  /* the glow, an ellipse the poster's shape (its radial gradient is on the box) */
  ctx.save();
  ctx.translate(50, 51);
  ctx.scale(1, 1.5);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 62);
  glow.addColorStop(0, hsl(h0 - 14, 92, 66, 0.62));
  glow.addColorStop(1, hsl(h0, 70, 20, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(-50, -34, 100, 100);
  ctx.restore();

  const fill = (path: string | Path2D, colour: string) => { ctx.fillStyle = colour; ctx.fill(typeof path === 'string' ? new Path2D(path) : path); };
  const circle = (x: number, y: number, r: number) => { const path = new Path2D(); path.arc(x, y, r, 0, Math.PI * 2); return path; };
  const ellipse = (x: number, y: number, rx: number, ry: number) => { const path = new Path2D(); path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); return path; };

  switch (motifFor(art.genre)) {
    case 'beam':
      fill(`M${46 + jitter(1, 8)} 0 L${58 + jitter(2, 8)} 0 L74 104 L30 104 Z`, hsl(h0 - 20, 96, 78, 0.2));
      fill(ellipse(50, 104, 26, 4), 'rgba(0,0,0,.34)');
      ctx.strokeStyle = hsl(h0, 30, 4);
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(new Path2D('M50 104 L50 84 M46 90 L50 84 L54 90'));
      fill(circle(50, 80, 3.1), hsl(h0, 30, 4));
      break;
    case 'horizon':
      fill(circle(50 + jitter(3, 26), 52, 15), hsl(h0 - 24, 88, 72, 0.5));
      fill('M0 98 L100 98 L100 150 L0 150 Z', hsl(h0 + 20, 44, 5));
      fill('M0 98 Q26 92 50 97 T100 95 L100 100 L0 100 Z', hsl(h0 + 20, 44, 5));
      fill(circle(62, 94, 2.3), hsl(h0 + 20, 40, 4));
      break;
    case 'door':
      fill('M0 0 H100 V150 H0 Z', 'rgba(4,3,10,.52)');
      fill(`M${36 + jitter(4, 6)} 40 h28 v64 h-28 Z`, hsl(h0 - 8, 96, 60, 0.8));
      fill(`M${41 + jitter(4, 6)} 48 h18 v56 h-18 Z`, 'rgba(5,2,8,.92)');
      fill(ellipse(50, 112, 30, 7), hsl(h0, 90, 52, 0.14));
      break;
    case 'bloom':
      fill(circle(40 + jitter(5, 8), 58, 24), hsl(h0 - 16, 90, 70, 0.42));
      fill(circle(60 + jitter(6, 8), 66, 24), hsl(h0 + 22, 88, 66, 0.42));
      fill('M0 104 H100 V150 H0 Z', hsl(h0 + 14, 40, 7, 0.7));
      break;
    case 'grid': {
      ctx.strokeStyle = hsl(h0 - 18, 70, 68, 0.4);
      ctx.lineWidth = 0.5;
      const lines = new Path2D();
      [22, 40, 58, 76].forEach(y => { lines.moveTo(0, y); lines.lineTo(100, y); });
      [18, 38, 58, 78].forEach(x => { lines.moveTo(x, 0); lines.lineTo(x, 104); });
      ctx.stroke(lines);
      ctx.strokeStyle = hsl(h0 - 18, 70, 68, 0.36);
      ctx.lineWidth = 1.1;
      ctx.stroke(circle(50, 58, 17));
      ctx.stroke(new Path2D('M50 34 L50 82 M26 58 L74 58'));
      break;
    }
    case 'arch':
      fill('M28 104 L28 62 Q50 36 72 62 L72 104 Z', hsl(h0 - 12, 82, 62, 0.34));
      fill('M36 104 L36 66 Q50 48 64 66 L64 104 Z', hsl(h0 + 16, 44, 7, 0.9));
      fill(circle(50, 40, 9), hsl(h0 - 26, 92, 74, 0.7));
      break;
    case 'orbit':
      fill(circle(50, 112, 46), hsl(h0 + 14, 46, 8));
      ctx.strokeStyle = hsl(h0 - 22, 92, 70, 0.7);
      ctx.lineWidth = 1.2;
      ctx.stroke(circle(50, 112, 46));
      fill(circle(64 + jitter(7, 10), 44, 4), hsl(h0 - 30, 96, 80, 0.9));
      break;
    case 'stack':
      [0, 1, 2, 3, 4].forEach(i => fill(`M${12 + i * 15} ${38 + (i % 2) * 7} h12 v62 h-12 Z`, hsl(h0 + i * 26, 64, 52 - i * 5, 0.82)));
      break;
  }
  ctx.restore();
};
