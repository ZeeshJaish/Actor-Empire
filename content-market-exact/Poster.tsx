/**
 * EMPIRE+ v2 — THE ONE-SHEET
 *
 * A film market is a WALL OF POSTERS. Every stand at Cannes and AFM is papered
 * with them, and a buyer's eye moves across art long before it reaches a price.
 * The first version of the Content Market drew the paperwork and skipped the
 * product entirely, which is why it read as a document you had to study rather
 * than a floor you could scan.
 *
 * So every title generates a real one-sheet, deterministically from its own id:
 *
 *   THE FIELD     a duotone ground built from the title's hue. Film posters
 *                 are almost never full-colour photographs any more; they are
 *                 two colours and a shape.
 *   THE MOTIF     genre decides the composition, because genres really do have
 *                 house styles — a thriller is a vertical light and a lone
 *                 figure, a horror poster is a doorway with something behind
 *                 it, a romance is warm bloom and two forms overlapping.
 *   THE TYPE      heavy condensed caps, tracked out, sitting in the lower
 *                 third with a hairline rule above it.
 *   THE BILLING   the tiny unreadable credit block along the bottom edge. It
 *                 is the single detail that makes a rectangle read as a FILM
 *                 POSTER instead of a coloured card, and it costs three lines.
 */
import css from './OneSheet.module.css';
import { cx } from './cx';
import React from 'react';

export type Motif = 'beam' | 'horizon' | 'door' | 'bloom' | 'grid' | 'arch' | 'stack' | 'orbit';

const MOTIF_OF: Record<string, Motif> = {
  Thriller: 'beam', Drama: 'horizon', Horror: 'door', Romance: 'bloom',
  Espionage: 'grid', Historical: 'arch', Mixed: 'stack', 'Sci-Fi': 'orbit',
  Documentary: 'horizon', Comedy: 'bloom', Action: 'beam',
};

export const motifFor = (genre: string): Motif => MOTIF_OF[genre] ?? 'horizon';

/** the credit block. Real ones are unreadable, and that is the point. */
const BILLING = [
  'MERIDIAN PICTURES PRESENTS  IN ASSOCIATION WITH HARROW & VANE  A CORMORANT PRODUCTION',
  'CASTING BY  MUSIC BY  COSTUME DESIGNER  EDITED BY  PRODUCTION DESIGNER  DIRECTOR OF PHOTOGRAPHY',
  'EXECUTIVE PRODUCERS  PRODUCED BY  WRITTEN BY  DIRECTED BY',
];

export const Poster: React.FC<{
  id: string; title: string; genre: string; hue: number; year?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** a collection shows a fan of spines rather than one sheet */
  stack?: number;
}> = ({ id, title, genre, hue, year, size = 'md', stack }) => {
  const motif = motifFor(genre);
  /* deterministic wobble so two thrillers do not draw the same poster */
  const seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const jitter = (n: number, span: number) => ((seed * (n + 7)) % span) - span / 2;

  const words = title.toUpperCase().split(' ');
  /* break the title the way a poster does: never more than three lines */
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 11 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 3);

  return (
    <div className={cx(css.po, css['po-' + (size)])}>
      <svg className={css.poart} viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${hue} 62% 34%)`} />
            <stop offset="58%" stopColor={`hsl(${hue + 12} 55% 13%)`} />
            <stop offset="100%" stopColor={`hsl(${hue + 18} 48% 6%)`} />
          </linearGradient>
          <radialGradient id={`r${id}`} cx="50%" cy="34%" r="62%">
            <stop offset="0%" stopColor={`hsl(${hue - 14} 92% 66%)`} stopOpacity=".62" />
            <stop offset="100%" stopColor={`hsl(${hue} 70% 20%)`} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="150" fill={`url(#g${id})`} />
        <rect width="100" height="150" fill={`url(#r${id})`} />

        {motif === 'beam' && (
          <g>
            <path d={`M${46 + jitter(1, 8)} 0 L${58 + jitter(2, 8)} 0 L74 104 L30 104 Z`}
              fill={`hsl(${hue - 20} 96% 78%)`} opacity=".2" />
            <ellipse cx="50" cy="104" rx="26" ry="4" fill="#000" opacity=".34" />
            <path d="M50 104 L50 84 M46 90 L50 84 L54 90" stroke={`hsl(${hue} 30% 4%)`}
              strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <circle cx="50" cy="80" r="3.1" fill={`hsl(${hue} 30% 4%)`} />
          </g>
        )}

        {motif === 'horizon' && (
          <g>
            <circle cx={50 + jitter(3, 26)} cy="52" r="15" fill={`hsl(${hue - 24} 88% 72%)`} opacity=".5" />
            <rect y="98" width="100" height="52" fill={`hsl(${hue + 20} 44% 5%)`} />
            <path d="M0 98 Q26 92 50 97 T100 95 L100 100 L0 100 Z" fill={`hsl(${hue + 20} 44% 5%)`} />
            <circle cx="62" cy="94" r="2.3" fill={`hsl(${hue + 20} 40% 4%)`} />
          </g>
        )}

        {motif === 'door' && (
          <g>
            <rect width="100" height="150" fill="#04030a" opacity=".52" />
            <rect x={36 + jitter(4, 6)} y="40" width="28" height="64" rx="1"
              fill={`hsl(${hue - 8} 96% 60%)`} opacity=".8" />
            <rect x={41 + jitter(4, 6)} y="48" width="18" height="56" fill="#050208" opacity=".92" />
            <ellipse cx="50" cy="112" rx="30" ry="7" fill={`hsl(${hue} 90% 52%)`} opacity=".14" />
          </g>
        )}

        {motif === 'bloom' && (
          <g>
            <circle cx={40 + jitter(5, 8)} cy="58" r="24" fill={`hsl(${hue - 16} 90% 70%)`} opacity=".42" />
            <circle cx={60 + jitter(6, 8)} cy="66" r="24" fill={`hsl(${hue + 22} 88% 66%)`} opacity=".42" />
            <rect y="104" width="100" height="46" fill={`hsl(${hue + 14} 40% 7%)`} opacity=".7" />
          </g>
        )}

        {motif === 'grid' && (
          <g stroke={`hsl(${hue - 18} 70% 68%)`} strokeWidth=".5" opacity=".4" fill="none">
            {[22, 40, 58, 76].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} />)}
            {[18, 38, 58, 78].map(x => <line key={x} x1={x} y1="0" x2={x} y2="104" />)}
            <circle cx="50" cy="58" r="17" strokeWidth="1.1" opacity=".9" />
            <line x1="50" y1="34" x2="50" y2="82" strokeWidth="1.1" opacity=".9" />
            <line x1="26" y1="58" x2="74" y2="58" strokeWidth="1.1" opacity=".9" />
          </g>
        )}

        {motif === 'arch' && (
          <g>
            <path d="M28 104 L28 62 Q50 36 72 62 L72 104 Z" fill={`hsl(${hue - 12} 82% 62%)`} opacity=".34" />
            <path d="M36 104 L36 66 Q50 48 64 66 L64 104 Z" fill={`hsl(${hue + 16} 44% 7%)`} opacity=".9" />
            <circle cx="50" cy="40" r="9" fill={`hsl(${hue - 26} 92% 74%)`} opacity=".7" />
          </g>
        )}

        {motif === 'orbit' && (
          <g>
            <circle cx="50" cy="112" r="46" fill={`hsl(${hue + 14} 46% 8%)`} />
            <ellipse cx="50" cy="112" rx="46" ry="46" fill="none"
              stroke={`hsl(${hue - 22} 92% 70%)`} strokeWidth="1.2" opacity=".7" />
            <circle cx={64 + jitter(7, 10)} cy="44" r="4" fill={`hsl(${hue - 30} 96% 80%)`} opacity=".9" />
          </g>
        )}

        {motif === 'stack' && (
          <g>
            {[0, 1, 2, 3, 4].map(i => (
              <rect key={i} x={12 + i * 15} y={38 + (i % 2) * 7} width="12" height="62" rx="1"
                fill={`hsl(${hue + i * 26} 64% ${52 - i * 5}%)`} opacity=".82" />
            ))}
          </g>
        )}

      </svg>

      <div className={css.pograin} />
      <div className={css.poshade} />

      <div className={css.potype}>
        <i className={css.porule} />
        {shown.map((l, i) => <b key={i}>{l}</b>)}
        {year && (size === 'md' || size === 'lg') && <span className={css.poyear}>{year}</span>}
      </div>

      {(size === 'md' || size === 'lg') && (
        <div className={css.pobilling}>
          {BILLING.slice(0, size === 'lg' ? 3 : 2).map((b, i) => <i key={i}>{b}</i>)}
        </div>
      )}

      {stack && stack > 1 && <span className={css.postack}>{stack}</span>}
    </div>
  );
};

/* ============================================================
   RIVAL PLATFORM MARKS — the logos you are bidding against
   ============================================================ */
export const PlatformMark: React.FC<{
  name: string; tint: string; small?: boolean;
}> = ({ name, tint, small }) => {
  /* a wordmark reduced the way a streaming logo is: one or two letterforms */
  const mark = name.replace(/[^A-Za-z+]/g, '').slice(0, 1) + (name.includes('+') ? '+' : '');
  return (
    <span className={cx(css.pm, (small ? css['pm-sm'] : ''))} style={{ ['--epx-po-pmt' as string]: tint }}>
      {mark}
    </span>
  );
};

/* Styles now live in presentation/screens/OneSheet/OneSheet.module.css */
