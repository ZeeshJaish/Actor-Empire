/* ============================================================================
   CITY SCENE

   A city is more memorable than a row in a table, so every city gets a drawn
   skyline: seeded from its name so London is always the same London, tinted by
   a hash so no two cities feel alike, with the leased building lit from within.

   Generated rather than illustrated, for the same reason the flags are: art
   files do not survive a handoff, and a city list that grows should never wait
   on a designer.
   ========================================================================== */

import { useMemo } from 'react';

interface Props {
  seed: string;
  /** Lights on in the building you have leased. */
  active?: boolean;
  height?: number;
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(state: number): () => number {
  let s = state || 7;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* Dusk, night, dawn and overcast — enough that cities feel like places. */
const SKIES: Array<[string, string]> = [
  ['#101a2c', '#2a2340'],
  ['#0d1420', '#1d2a3d'],
  ['#141020', '#332038'],
  ['#0b1618', '#1b3038'],
  ['#171214', '#3a2430'],
];

export function CityScene({ seed, active, height = 78 }: Props) {
  const scene = useMemo(() => {
    const next = rng(hash(seed));
    const [skyTop, skyBottom] = SKIES[Math.floor(next() * SKIES.length)];
    const buildings: Array<{ x: number; w: number; h: number; hero: boolean; windows: number }> = [];

    let x = -4;
    while (x < 104) {
      const w = 6 + next() * 12;
      const h = 18 + next() * 54;
      buildings.push({ x, w, h, hero: false, windows: Math.floor(next() * 4) + 2 });
      x += w + 1.5 + next() * 3;
    }
    /* One of them is yours. */
    const heroIndex = Math.floor(buildings.length * (0.35 + next() * 0.3));
    if (buildings[heroIndex]) {
      buildings[heroIndex].hero = true;
      buildings[heroIndex].h = Math.max(buildings[heroIndex].h, 52);
    }
    return { skyTop, skyBottom, buildings, moonX: 12 + next() * 76 };
  }, [seed]);

  return (
    <svg className={active ? 'cs is-on' : 'cs'} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${hash(seed)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.skyTop} />
          <stop offset="100%" stopColor={scene.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#sky-${hash(seed)})`} />
      <circle cx={scene.moonX} cy="18" r="4" fill="rgba(255,255,255,0.16)" />

      {scene.buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={100 - b.h} width={b.w} height={b.h} fill={b.hero ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)'} />
          {b.hero && active && (
            <>
              <rect x={b.x} y={100 - b.h} width={b.w} height={b.h} fill="rgb(var(--sf-brand-on-rgb))" opacity="0.16" />
              <rect x={b.x - 0.6} y={100 - b.h - 0.6} width={b.w + 1.2} height={b.h + 1.2} fill="none" stroke="rgb(var(--sf-brand-on-rgb))" strokeWidth="0.8" opacity="0.8" />
            </>
          )}
          {Array.from({ length: b.windows }, (_, w) => (
            <rect
              key={w}
              x={b.x + 1.5}
              y={100 - b.h + 4 + w * 7}
              width={Math.max(1.5, b.w - 3)}
              height="2.6"
              fill={b.hero && active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.16)'}
            />
          ))}
        </g>
      ))}
      <rect y="96" width="100" height="4" fill="rgba(0,0,0,0.85)" />
    </svg>
  );
}
