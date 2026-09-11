import React from 'react';
import type { ReleaseFilmArt } from './model';
import css from './ReleaseStrategy.module.css';

export type FilmSheetStyle = 'mass' | 'prestige' | 'fanbase' | 'viral' | 'sleeper';

const DRESS: Record<FilmSheetStyle, { band?: string; strip?: string; quote?: string; laurels?: boolean }> = {
  mass: { band: 'THIS SUMMER', strip: 'IN CINEMAS' },
  prestige: { laurels: true, quote: '“A staggering piece of work.”', strip: 'OFFICIAL SELECTION' },
  fanbase: { band: 'THE STORY CONTINUES', strip: 'FOR EVERYONE WHO WAITED' },
  viral: { quote: 'NOBODY IS GOING TO AGREE ABOUT THIS' },
  sleeper: { strip: 'IN SELECT CINEMAS' },
};

const join = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

export const FilmSheet: React.FC<{
  film: ReleaseFilmArt;
  size?: 'sm' | 'md' | 'lg';
  dress?: FilmSheetStyle;
}> = ({ film, size = 'md', dress }) => {
  const dressing = dress ? DRESS[dress] : null;
  const words = film.title.toUpperCase().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (`${current} ${word}`.trim().length > 10 && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  const hue = film.hue;
  const gradientId = `release-sheet-${film.art}-${hue}`;

  return (
    <div className={join(css.sheet, css[`shz-${size}`], dress && css[`dr-${dress}`])}
      style={{ '--sh': String(hue) } as React.CSSProperties}>
      <svg className={css.shart} viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${gradientId}-base`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${hue} 68% 38%)`} />
            <stop offset="56%" stopColor={`hsl(${hue + 14} 58% 14%)`} />
            <stop offset="100%" stopColor={`hsl(${hue + 20} 48% 5%)`} />
          </linearGradient>
          <radialGradient id={`${gradientId}-light`} cx="50%" cy="34%" r="60%">
            <stop offset="0%" stopColor={`hsl(${hue - 16} 92% 66%)`} stopOpacity=".55" />
            <stop offset="100%" stopColor={`hsl(${hue} 70% 20%)`} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="150" fill={`url(#${gradientId}-base)`} />
        <rect width="100" height="150" fill={`url(#${gradientId}-light)`} />
        {film.art === 'thriller' && <g><path d="M46 0 L58 0 L74 104 L30 104 Z" fill={`hsl(${hue - 20} 96% 78%)`} opacity=".2" /><ellipse cx="50" cy="104" rx="26" ry="4" fill="#000" opacity=".34" /><path d="M50 104 V84 M46 90 L50 84 L54 90" stroke={`hsl(${hue} 30% 4%)`} strokeWidth="3.2" fill="none" strokeLinecap="round" /><circle cx="50" cy="80" r="3" fill={`hsl(${hue} 30% 4%)`} /></g>}
        {film.art === 'drama' && <g><circle cx="56" cy="52" r="15" fill={`hsl(${hue - 24} 88% 72%)`} opacity=".5" /><path d="M0 98 Q26 92 50 97 T100 95 V150 H0 Z" fill={`hsl(${hue + 20} 44% 5%)`} /></g>}
        {film.art === 'horror' && <g><rect width="100" height="150" fill="#04030a" opacity=".5" /><rect x="36" y="40" width="28" height="64" fill={`hsl(${hue - 8} 96% 60%)`} opacity=".8" /><rect x="41" y="48" width="18" height="56" fill="#050208" opacity=".92" /></g>}
        {film.art === 'romance' && <g><circle cx="40" cy="58" r="24" fill={`hsl(${hue - 16} 90% 70%)`} opacity=".4" /><circle cx="60" cy="66" r="24" fill={`hsl(${hue + 22} 88% 66%)`} opacity=".4" /><rect y="104" width="100" height="46" fill={`hsl(${hue + 14} 40% 7%)`} opacity=".7" /></g>}
        {film.art === 'scifi' && <g><circle cx="50" cy="116" r="46" fill={`hsl(${hue + 14} 46% 8%)`} /><ellipse cx="50" cy="116" rx="46" ry="46" fill="none" stroke={`hsl(${hue - 22} 92% 70%)`} strokeWidth="1.1" opacity=".7" /><circle cx="66" cy="42" r="4" fill={`hsl(${hue - 30} 96% 80%)`} opacity=".9" /></g>}
        {film.art === 'action' && <g stroke={`hsl(${hue - 18} 88% 68%)`} strokeWidth=".6" opacity=".45" fill="none">{[26, 46, 66, 86].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y - 12} />)}<circle cx="50" cy="58" r="18" strokeWidth="1.3" opacity=".9" /></g>}
      </svg>
      <div className={css.shgrain} />
      <div className={css.shshade} />
      <div className={css.shtype}>
        {lines.slice(0, 3).map(line => <b key={line}>{line}</b>)}
        <em>{film.tagline}</em>
      </div>
      {dressing?.band && <span className={css.drband}>{dressing.band}</span>}
      {dressing?.laurels && <><span className={join(css.drlaurel, css.drleft)}>❦</span><span className={join(css.drlaurel, css.drright)}>❦</span></>}
      {dressing?.quote && <span className={css.drquote}>{dressing.quote}</span>}
      {dressing?.strip && <span className={css.drstrip}>{dressing.strip}</span>}
    </div>
  );
};
