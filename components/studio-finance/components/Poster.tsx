/* ============================================================================
   A poster with no image file.

   The brief allows imagery only where it is financially relevant — a title's
   own artwork beside its earnings. Shipping actual poster art would mean asset
   files, which do not survive the handoff, so each poster is generated from the
   title's seed: same title, same poster, every session, zero bytes on disk.

   If the host game already has real poster art, pass `src` and this falls back
   to the image. The generated art is the default, not a placeholder to strip.
   ========================================================================== */

import { useMemo, type ReactElement } from 'react';

interface PosterProps {
  seed: string;
  /** Real artwork, when the host has it. */
  src?: string;
  size?: number;
  /** Ranking numeral drawn over the poster, e.g. on the Top Earners list. */
  rank?: number;
}

/* Deterministic 32-bit hash → the whole poster is a function of the title id. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(state: number): () => number {
  let s = state || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* Five houses of colour. Deliberately desaturated so a wall of posters never
   fights the money for attention. */
const PALETTES: Array<[string, string, string]> = [
  ['#101822', '#2c4c63', '#d9b26a'], // cold noir
  ['#1b1013', '#5a2230', '#e6c0a3'], // blood drama
  ['#0f1a15', '#245240', '#cfe0c3'], // green thriller
  ['#171021', '#432a5e', '#d7c2ee'], // purple sci-fi
  ['#1d160e', '#6a4520', '#f0d7a4'], // sepia epic
];

export function Poster({ seed, src, size = 44, rank }: PosterProps) {
  const art = useMemo(() => buildArt(seed), [seed]);
  const height = Math.round(size * 1.45);

  return (
    <div className="sf-poster" style={{ width: size, height }}>
      {src ? (
        <img src={src} alt="" />
      ) : (
        <svg viewBox="0 0 40 58" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">
          <rect width="40" height="58" fill={art.bg} />
          {art.shapes}
          <rect y="44" width="40" height="14" fill="rgba(0,0,0,0.55)" />
          <rect x="4" y="48" width={art.titleWidth} height="2.2" rx="1.1" fill={art.ink} opacity="0.9" />
          <rect x="4" y="52.4" width={art.subWidth} height="1.4" rx="0.7" fill={art.ink} opacity="0.45" />
        </svg>
      )}
      {typeof rank === 'number' && <span className="sf-poster-rank">{rank}</span>}
    </div>
  );
}

function buildArt(seed: string) {
  const next = rng(hash(seed));
  const [bg, mid, ink] = PALETTES[Math.floor(next() * PALETTES.length)];
  const variant = Math.floor(next() * 5);
  const shapes: ReactElement[] = [];

  if (variant === 0) {
    // Sunburst behind a horizon.
    for (let i = 0; i < 9; i += 1) {
      shapes.push(
        <polygon key={i} points={`20,26 ${-6 + i * 6},0 ${0 + i * 6},0`} fill={mid} opacity={0.35 + (i % 3) * 0.12} />,
      );
    }
    shapes.push(<circle key="s" cx="20" cy="26" r={5 + next() * 3} fill={ink} opacity="0.85" />);
    shapes.push(<rect key="h" y="30" width="40" height="14" fill={bg} opacity="0.85" />);
  } else if (variant === 1) {
    // Two figures against a wall of light.
    shapes.push(<rect key="w" x="6" y="6" width="28" height="34" fill={mid} opacity="0.5" />);
    shapes.push(<ellipse key="a" cx="15" cy="30" rx="4" ry="10" fill={bg} />);
    shapes.push(<ellipse key="b" cx="25" cy="32" rx="3.4" ry="8" fill={bg} />);
    shapes.push(<circle key="ha" cx="15" cy="19" r="2.6" fill={bg} />);
    shapes.push(<circle key="hb" cx="25" cy="23" r="2.2" fill={bg} />);
  } else if (variant === 2) {
    // Skyline.
    let x = 0;
    let i = 0;
    while (x < 40) {
      const w = 3 + next() * 5;
      const h = 8 + next() * 22;
      shapes.push(<rect key={`c${i}`} x={x} y={42 - h} width={w - 0.6} height={h} fill={mid} opacity={0.55 + next() * 0.4} />);
      x += w;
      i += 1;
    }
    shapes.push(<circle key="moon" cx={8 + next() * 24} cy="10" r="3.4" fill={ink} opacity="0.8" />);
  } else if (variant === 3) {
    // Diagonal split with a title slab.
    shapes.push(<polygon key="p" points="0,0 40,0 40,26 0,40" fill={mid} opacity="0.75" />);
    shapes.push(<rect key="r" x="7" y="16" width="26" height="1.8" fill={ink} opacity="0.8" />);
    shapes.push(<rect key="r2" x="11" y="21" width="18" height="1.2" fill={ink} opacity="0.45" />);
  } else {
    // Concentric rings — the sci-fi house.
    for (let i = 4; i > 0; i -= 1) {
      shapes.push(<circle key={i} cx="20" cy="22" r={i * 4.5} fill="none" stroke={i % 2 ? mid : ink} strokeWidth="1.1" opacity={0.25 + i * 0.15} />);
    }
    shapes.push(<circle key="core" cx="20" cy="22" r="2.4" fill={ink} />);
  }

  return {
    bg,
    ink,
    shapes,
    titleWidth: 16 + Math.round(next() * 14),
    subWidth: 8 + Math.round(next() * 10),
  };
}
