/**
 * Campaign scenes (#144, plan §20.10 point 4): the geometry that puts a creative onto a photo.
 *  - `quadMatrix3d`: the CSS matrix3d that maps a w × h element onto any four-cornered face in the photo (a billboard,
 *    a train side, a poster wall) in true perspective, the way design mockups place artwork.
 *  - `quadPoint` (#149): the same mapping for one point, so a canvas can draw a creative onto the face (a campaign's
 *    picture for the news).
 *  - `coverFrame`: how a backdrop of a known size covers a box, keeping a focal point (the billboard, the tower) in
 *    view, so everything drawn in the backdrop's own pixels lines up at any screen size.
 */

export type ScenePoint = [number, number];
/** top-left, top-right, bottom-right, bottom-left, in the backdrop's own pixels */
export type SceneQuad = [ScenePoint, ScenePoint, ScenePoint, ScenePoint];

/* the unit square onto the quad (Heckbert's square-to-quad): x = (a·u + b·v + x0) / (g·u + k·v + 1), y likewise */
const squareToQuad = (quad: SceneQuad) => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    return { a: x1 - x0, b: x3 - x0, d: y1 - y0, e: y3 - y0, g: 0, k: 0, x0, y0 };
  }
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const k = (dx1 * dy3 - dx3 * dy1) / det;
  return { a: x1 - x0 + g * x1, b: x3 - x0 + k * x3, d: y1 - y0 + g * y1, e: y3 - y0 + k * y3, g, k, x0, y0 };
};

/** CSS `matrix3d(...)` mapping an element's (0,0)–(w,h) box onto the quad; the element needs `transform-origin: 0 0`. */
export const quadMatrix3d = (w: number, h: number, quad: SceneQuad): string => {
  const { a, b, d, e, g, k, x0, y0 } = squareToQuad(quad);
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.map(value => Number(value.toFixed(9))).join(',')})`;
};

/** Where the point (u, v) of a face's own unit box (0–1 across, 0–1 down) lands in the photo, in true perspective. */
export const quadPoint = (quad: SceneQuad, u: number, v: number): ScenePoint => {
  const { a, b, d, e, g, k, x0, y0 } = squareToQuad(quad);
  const w = g * u + k * v + 1;
  return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w];
};

/** The scale and offset that cover a box with a backdrop, the focal point as near the box's centre as the edges allow. */
export const coverFrame = (box: { width: number; height: number }, image: { width: number; height: number }, focus: ScenePoint) => {
  const scale = Math.max(box.width / image.width, box.height / image.height);
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const x = clamp(box.width / 2 - focus[0] * scale, box.width - image.width * scale, 0);
  const y = clamp(box.height / 2 - focus[1] * scale, box.height - image.height * scale, 0);
  return { scale, x, y };
};
