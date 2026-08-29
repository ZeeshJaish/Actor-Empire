/* ============================================================================
   SCENERY — the small real-world props both cutscenes borrow.

   A cinematic still, a person, an avatar. All drawn, all seeded, so the same
   title always gets the same frame and the same commenter always gets the same
   face. Nothing is fetched.
   ========================================================================== */

import { seeded } from './Cutscene';

const FRAMES: Array<[string, string, string]> = [
  ['#0d1826', '#2f5a7a', '#f0c98a'], // dusk over water
  ['#1a0f14', '#5c2436', '#f3b9a0'], // red interior
  ['#0b1712', '#25553f', '#d9e9cd'], // forest night
  ['#16101f', '#432a63', '#cbb6f0'], // neon city
  ['#1c150c', '#6b451c', '#f5d9a2'], // desert gold
];

/** A 16:9 frame that reads as "a film is on screen" without being any film. */
export function Still({ seed, className }: { seed: number; className?: string }) {
  const rnd = seeded(seed * 7 + 3);
  const [deep, mid, key] = FRAMES[Math.floor(rnd() * FRAMES.length)];
  const sunX = 20 + rnd() * 60;
  const ridge = 58 + rnd() * 12;

  return (
    <svg viewBox="0 0 160 90" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mid} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <radialGradient id={`glow-${seed}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={key} stopOpacity="0.9" />
          <stop offset="100%" stopColor={key} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="160" height="90" fill={`url(#sky-${seed})`} />
      <circle cx={sunX} cy={ridge - 14} r="22" fill={`url(#glow-${seed})`} />
      <circle cx={sunX} cy={ridge - 14} r="4.5" fill={key} opacity="0.9" />

      {/* three ridges, back to front */}
      <path d={`M0 ${ridge} L28 ${ridge - 9} L52 ${ridge - 2} L84 ${ridge - 12} L118 ${ridge - 4} L160 ${ridge - 10} L160 90 L0 90 Z`} fill={deep} opacity="0.55" />
      <path d={`M0 ${ridge + 8} L34 ${ridge + 1} L66 ${ridge + 9} L104 ${ridge} L140 ${ridge + 7} L160 ${ridge + 2} L160 90 L0 90 Z`} fill={deep} opacity="0.8" />

      {/* a person, small, because scale is what makes a frame feel like a film */}
      <g fill="#000" opacity="0.85" transform={`translate(${sunX - 3} ${ridge + 4}) scale(0.42)`}>
        <circle cx="6" cy="4" r="3.4" />
        <path d="M2.4 8h7.2l1.6 12H8.6l-.7 12H4.1l-.7-12H0.8z" />
      </g>
      <rect width="160" height="90" fill="none" />
    </svg>
  );
}

/** A person in a hard hat: dark silhouette, hi-vis only where hi-vis goes.
    A solid amber body reads as a cartoon at any size above thumbnail. */
export function Worker({ x, y, scale = 1, flip }: { x: number; y: number; scale?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      {/* legs */}
      <path d="M1.6 20h2.6l-.5 13H1.2zM5.6 20h2.6l.6 13H6.1z" fill="#161c26" />
      {/* torso */}
      <path d="M0.6 6.4h8.6l1.1 14H-0.5z" fill="#242b37" />
      {/* the vest: two braces and a band, which is all a real one is */}
      <path d="M2 6.6h1.5l-.5 13.6H1.4zM6.4 6.6h1.5l.6 13.6H6.9z" fill="rgba(232,163,60,0.9)" />
      <path d="M-0.1 15.6h10v2.1h-10z" fill="rgba(232,163,60,0.72)" />
      {/* arms */}
      <path d="M-0.6 7h1.8l-.9 9.6H-1.4zM8.8 7h1.8l1 9.6H9.6z" fill="#1e252f" />
      {/* head and helmet */}
      <circle cx="4.9" cy="2.6" r="3.1" fill="#1a212b" />
      <path d="M1.5 2.4a3.5 3.5 0 016.9 0z" fill="rgba(232,163,60,0.95)" />
      <path d="M0.9 2.3h8.1v0.9H0.9z" fill="rgba(232,163,60,0.72)" />
    </g>
  );
}

const AV = ['#e0655f', '#59a7e0', '#5fc48c', '#c99be0', '#e0b45f', '#7f8de0'];

/** A face for a handle. Two letters on a colour, the way every app does it. */
export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const rnd = seeded(name.split('').reduce((n, c) => n + c.charCodeAt(0), 0));
  const tone = AV[Math.floor(rnd() * AV.length)];
  const initials = name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
  return (
    <span className="sc-avatar" style={{ width: size, height: size, background: tone }} aria-hidden="true">
      {initials}
    </span>
  );
}
