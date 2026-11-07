/**
 * #156: a drone show. The campaign's name is set in the display face across the scene's sky box (two lines when it is
 * long), read back as a grid of points, and each point is a drone: a small light in the service's colour, a little
 * brighter and whiter at the letters' hearts. At the launch the fleet rises from the water and the skyline and flies
 * into place; at rest it hangs there. Pure drawing: the scene animates it.
 */
import type { DronesScene } from './sceneCatalogue';

export interface Drone {
  /** where it ends, in the backdrop's pixels */
  x: number;
  y: number;
  /** where it takes off from */
  fromX: number;
  fromY: number;
  /** when it leaves, 0–1 of the flight */
  delay: number;
  colour: string;
  size: number;
}

/* the same fleet for the same name: a small seeded random */
const seeded = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

/** words in at most two lines, the longer line as short as possible */
const twoLines = (text: string): string[] => {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length < 2 || text.length <= 12) return [words.join(' ')];
  let best: string[] = [words.join(' ')];
  let longest = Infinity;
  for (let cut = 1; cut < words.length; cut += 1) {
    const lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
    const width = Math.max(...lines.map(line => line.length));
    if (width < longest) { longest = width; best = lines; }
  }
  return best;
};

/** The fleet that writes `name` in the scene's sky, in the service's hue. */
export const droneFleet = (scene: DronesScene, name: string, hue: number): Drone[] => {
  const [left, top, right, bottom] = scene.sky;
  const width = right - left;
  const height = bottom - top;
  const lines = twoLines(name || 'NOW STREAMING');
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width / 2);
  canvas.height = Math.round(height / 2);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  /* the largest size at which every line fits the box */
  let size = canvas.height / lines.length * 0.86;
  const fits = () => {
    ctx.font = `400 ${size}px 'Anton','Archivo',sans-serif`;
    return lines.every(line => ctx.measureText(line).width <= canvas.width * 0.94);
  };
  while (size > 8 && !fits()) size -= 2;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lead = size * 1.02;
  lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (index - (lines.length - 1) / 2) * lead));
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  /* a drone every few pixels of the letters: denser for short names, never more than about 900 */
  const lit = (x: number, y: number) => data[(y * canvas.width + x) * 4 + 3] > 128;
  let litCount = 0;
  for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) if (lit(x, y)) litCount += 1;
  const step = Math.max(3, Math.round(Math.sqrt(litCount * 4 / 900)));
  const random = seeded(`${name}:${hue}`);
  const drones: Drone[] = [];
  for (let y = Math.floor(step / 2); y < canvas.height; y += step) {
    for (let x = Math.floor(step / 2); x < canvas.width; x += step) {
      if (!lit(x, y)) continue;
      const heart = lit(x - step, y) && lit(x + step, y) && lit(x, y - step) && lit(x, y + step);
      const light = heart ? 72 + random() * 14 : 60 + random() * 10;
      drones.push({
        x: left + x * 2 + (random() - 0.5) * 1.6,
        y: top + y * 2 + (random() - 0.5) * 1.6,
        fromX: left + random() * width,
        fromY: (scene.waterline ?? scene.height) - 40 - random() * 120,
        delay: random() * 0.35,
        colour: `hsl(${hue},${heart ? 80 : 95}%,${light.toFixed(0)}%)`,
        size: heart ? 2.2 : 1.8,
      });
    }
  }
  return drones;
};

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** The fleet at `progress` (0: on the ground, 1: in place), with a little hover at rest. */
export const drawDrones = (target: HTMLCanvasElement, scene: DronesScene, drones: Drone[], progress: number, hover = 0) => {
  if (target.width !== scene.width) target.width = scene.width;
  if (target.height !== scene.height) target.height = scene.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, target.width, target.height);
  drones.forEach((drone, index) => {
    const t = ease(Math.min(1, Math.max(0, (progress - drone.delay) / (1 - drone.delay))));
    const wobble = hover ? Math.sin(hover * 0.9 + index * 0.7) * 0.9 : 0;
    const x = drone.fromX + (drone.x - drone.fromX) * t;
    const y = drone.fromY + (drone.y - drone.fromY) * t + wobble;
    ctx.fillStyle = drone.colour;
    ctx.globalAlpha = 0.35 + 0.65 * t;
    ctx.beginPath();
    ctx.arc(x, y, drone.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};
