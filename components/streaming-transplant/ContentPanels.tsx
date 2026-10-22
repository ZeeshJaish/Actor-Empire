/* ============================================================================
   CONTENT ROOM — the visual pieces of the Content Desk.

   The desk used to be lists of text with two-letter colour tiles for art. The
   game already draws a real one-sheet for every title (content-market-exact
   Poster, the same art the Content Market and the opening catalogue use), so
   the room is built around it:

     Spotlight       the most-watched title, big, with its week in numbers
     PosterRail      the service as a viewer sees it: ranked posters
     CatalogueMix    films vs series, where titles come from, top genres
     RenewalCard     a licence near its end and the real decision on it
     RightsRunway    every licence on one year's timeline
     KeptGrid        what the service keeps for good
     SlateCalendar   the release weeks, empty runs folded into one row
     LevelRing       a 0–3 localization tier as a ring

   Presentation only; the desk hands in the data and the actions.
   ========================================================================== */

import React from 'react';
/* the desk's reset must reach the page first (equal specificity) */
import './presentation/screens/ContentDesk/ContentDesk.module.css';
import css from './presentation/screens/ContentDesk/ContentRoom.module.css';
import { cx } from './presentation/cx';
import { Poster } from '../../content-market-exact/Poster';
import type { CatalogueTitle, SlateWeek } from './StreamingContentExperience';

export const count = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : `${n}`);
export const money = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);

const KIND_WORDS: Record<CatalogueTitle['kind'], string> = { ORIGINAL: 'Original', LICENSED: 'Licensed', OWNED: 'From your studio' };

/* ── one title's art ─────────────────────────────────────────────────────── */
export const TitleArt: React.FC<{ title: Pick<CatalogueTitle, 'id' | 'title' | 'genre' | 'hue' | 'poster' | 'year'>; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string; rank?: number }> = ({ title, size = 'sm', className, rank }) => (
  <span className={cx(css.art, className)}>
    <Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} year={title.year ?? undefined} size={size} poster={title.poster} />
    {typeof rank === 'number' && <i className={css.rank}>{rank}</i>}
  </span>
);

/* ── the most-watched title ──────────────────────────────────────────────── */
export const Spotlight: React.FC<{ title: CatalogueTitle; live: boolean; onOpen?: () => void }> = ({ title, live, onOpen }) => {
  const watched = live && (title.views ?? 0) > 0;
  return (
    <button type="button" className={css.spotlight} onClick={onOpen} style={{ ['--h' as string]: `${title.hue}` }}>
      <TitleArt title={title} size="md" className={css.spotArt} />
      <div className={css.spotBody}>
        <span className={css.eyebrow}>{watched ? 'MOST WATCHED THIS WEEK' : live ? 'ON YOUR SERVICE' : 'ON YOUR SHELVES'}</span>
        <b className={css.spotTitle}>{title.title}</b>
        <small className={css.spotMeta}>{KIND_WORDS[title.kind]} · {title.format} · {title.genre.toLowerCase()}{title.year ? ` · ${title.year}` : ''}</small>
        {watched ? (
          <div className={css.spotFigures}>
            <div><b>{count(title.views!)}</b><span>watched</span></div>
            <div className={css.spotRing}>
              <svg viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="15" className={css.ringTrack} />
                {(title.completion ?? 0) > 0 && <circle cx="18" cy="18" r="15" className={css.ringFill} pathLength={100} strokeDasharray={`${title.completion} 100`} />}
              </svg>
              <b>{title.completion ?? 0}%</b>
              <span>finish it</span>
            </div>
          </div>
        ) : <p className={css.spotNote}>{live ? 'No viewing settled for it yet.' : 'Viewing starts on opening night.'}</p>}
      </div>
    </button>
  );
};

/* ── the service as a viewer sees it ─────────────────────────────────────── */
export const PosterRail: React.FC<{ titles: CatalogueTitle[]; live: boolean; onOpen?: (title: CatalogueTitle) => void }> = ({ titles, live, onOpen }) => (
  <div className={css.rail}>
    {titles.map((title, index) => (
      <button key={title.id} type="button" className={css.railItem} onClick={() => onOpen?.(title)}>
        <TitleArt title={title} size="sm" rank={live && (title.views ?? 0) > 0 ? index + 1 : undefined} />
        <b>{title.title}</b>
        <small>{live && title.views !== undefined ? `${count(title.views)} watched` : title.format}</small>
      </button>
    ))}
  </div>
);

/* ── what the catalogue is made of ───────────────────────────────────────── */
export const CatalogueMix: React.FC<{ titles: CatalogueTitle[] }> = ({ titles }) => {
  const total = Math.max(1, titles.length);
  const films = titles.filter(title => title.format === 'Film').length;
  const sources = (['ORIGINAL', 'LICENSED', 'OWNED'] as const).map(kind => ({ kind, n: titles.filter(title => title.kind === kind).length }));
  const genreCounts = new Map<string, number>();
  titles.forEach(title => genreCounts.set(title.genre, (genreCounts.get(title.genre) ?? 0) + 1));
  const genres = [...genreCounts.entries()].sort((left, right) => right[1] - left[1]);
  const topGenres = genres.slice(0, 4);
  const otherGenres = genres.slice(4).reduce((sum, [, n]) => sum + n, 0);
  const bar = (parts: Array<{ key: string; n: number; tone: string }>) => (
    <i className={css.mixBar}>{parts.filter(part => part.n > 0).map(part => <em key={part.key} className={css[part.tone]} style={{ flexGrow: part.n }} />)}</i>
  );
  return (
    <div className={css.mix}>
      <div className={css.mixRow}>
        <span>FORMAT</span>
        {bar([{ key: 'f', n: films, tone: 't1' }, { key: 's', n: titles.length - films, tone: 't3' }])}
        <small><b>{films}</b> films · <b>{titles.length - films}</b> series</small>
      </div>
      <div className={css.mixRow}>
        <span>SOURCE</span>
        {bar(sources.map((source, index) => ({ key: source.kind, n: source.n, tone: `t${index + 1}` })))}
        <small>{sources.filter(source => source.n > 0).map(source => `${source.n} ${source.kind === 'ORIGINAL' ? 'original' : source.kind === 'OWNED' ? 'from your studio' : 'licensed'}`).join(' · ')}</small>
      </div>
      <div className={css.mixRow}>
        <span>GENRES</span>
        {bar([...topGenres.map(([genre, n], index) => ({ key: genre, n, tone: `t${index + 1}` })), { key: 'other', n: otherGenres, tone: 't5' }])}
        <small>{topGenres.map(([genre, n]) => `${genre.toLowerCase()} ${Math.round(n / total * 100)}%`).join(' · ')}{otherGenres ? ` · other ${Math.round(otherGenres / total * 100)}%` : ''}</small>
      </div>
    </div>
  );
};

/* ── a licence near its end, and the decision on it ──────────────────────── */
export type RenewalAction = 'ACCEPT_RENEWAL' | 'LET_EXPIRE' | 'RETURN_TO_MARKET';
export const RenewalCard: React.FC<{
  title: CatalogueTitle;
  onDecide?: (caseId: string, action: RenewalAction) => void;
  onOpenCalendar?: () => void;
  onOpen?: () => void;
}> = ({ title, onDecide, onOpenCalendar, onOpen }) => {
  const rights = title.rights!;
  const left = rights.endsInWeeks ?? 0;
  const total = Math.max(left, rights.windowWeeks ?? 104);
  const renewal = title.renewal;
  const decidable = Boolean(renewal?.pending && renewal.offer && (renewal.stage === 'OFFER' || renewal.stage === 'DECIDE'));
  const line = !renewal ? 'Renewal talks open nearer the end of the window.'
    : renewal.stage === 'RENEWED' ? 'Renewed. The new window starts when this one ends.'
      : renewal.stage === 'LETTING_GO' ? 'You are letting it go. It stays on the service until the window ends.'
        : renewal.stage === 'RETURNING' ? 'Going back to the market. Other platforms can bid for the next window.'
          : renewal.stage === 'CLOSED' ? 'No renewal offer came. It leaves when the window ends.'
            : renewal.offer ? `The licensor offers ${renewal.offer.durationWeeks} more weeks for ${money(renewal.offer.cost)}${renewal.offer.expiresInWeeks > 0 ? `; the offer stands ${renewal.offer.expiresInWeeks} more week${renewal.offer.expiresInWeeks === 1 ? '' : 's'}` : ''}.`
              : 'Talks are open; the licensor has not made an offer yet.';
  return (
    <div className={cx(css.renewal, left <= 3 && css.renewalHot)}>
      <button type="button" className={css.renewalArt} onClick={onOpen} aria-label={`Open ${title.title}`}><TitleArt title={title} size="xs" /></button>
      <div className={css.renewalBody}>
        <div className={css.renewalTop}>
          <b>{title.title}</b>
          <em>{left === 0 ? 'ends this week' : `${left}w left`}</em>
        </div>
        <small>{rights.licensor} · {rights.territory.toLowerCase()}{rights.exclusive ? ' · exclusive' : ''}</small>
        <i className={css.drain}><em style={{ width: `${Math.max(3, Math.min(100, left / total * 100))}%` }} /></i>
        <p>{line}</p>
        <div className={css.renewalActions}>
          {decidable ? (
            <>
              <button type="button" className={css.primary} onClick={() => onDecide?.(renewal!.caseId, 'ACCEPT_RENEWAL')}>Renew · {money(renewal!.offer!.cost)}</button>
              <button type="button" className={css.secondary} onClick={() => onDecide?.(renewal!.caseId, 'LET_EXPIRE')}>Let it go</button>
            </>
          ) : renewal?.pending && (renewal.stage === 'TALKS' || renewal.stage === 'DECIDE') ? (
            <button type="button" className={css.secondary} onClick={() => onDecide?.(renewal.caseId, 'LET_EXPIRE')}>Let it go</button>
          ) : null}
          {onOpenCalendar && <button type="button" className={css.link} onClick={onOpenCalendar}>Rights calendar →</button>}
        </div>
      </div>
    </div>
  );
};

/* ── every licence on one year's timeline ────────────────────────────────── */
export const RightsRunway: React.FC<{ titles: CatalogueTitle[]; horizon?: number; onOpen?: (title: CatalogueTitle) => void }> = ({ titles, horizon = 52, onOpen }) => (
  <div className={css.runway}>
    <div className={css.runwayTicks} aria-hidden="true">
      {[0, .25, .5, .75, 1].map(step => <span key={step} style={{ left: `${step * 100}%` }}>{step === 0 ? 'now' : `+${Math.round(step * horizon)}w`}</span>)}
    </div>
    {titles.map(title => {
      const left = title.rights!.endsInWeeks ?? horizon;
      const beyond = left > horizon;
      return (
        <button key={title.id} type="button" className={css.runwayRow} onClick={() => onOpen?.(title)}>
          <span className={css.runwayName}>{title.title}</span>
          <i className={css.runwayTrack}>
            <em className={cx(left <= 6 ? css.hot : left <= 13 ? css.warm : css.calm, beyond && css.beyond)} style={{ width: `${Math.max(2, Math.min(100, left / horizon * 100))}%` }} />
          </i>
          <small>{`${left}w`}</small>
        </button>
      );
    })}
  </div>
);

/* ── what the service keeps for good ─────────────────────────────────────── */
export const KeptGrid: React.FC<{ titles: CatalogueTitle[]; onOpen?: (title: CatalogueTitle) => void }> = ({ titles, onOpen }) => (
  <div className={css.kept}>
    {titles.map(title => (
      <button key={title.id} type="button" className={css.keptItem} onClick={() => onOpen?.(title)}>
        <TitleArt title={title} size="sm" />
        <b>{title.title}</b>
        <small>{title.kind === 'ORIGINAL' ? 'ORIGINAL' : title.kind === 'OWNED' ? 'YOUR STUDIO' : 'NO END DATE'}</small>
      </button>
    ))}
  </div>
);

/* ── the release weeks ───────────────────────────────────────────────────── */
const MARKETING_WORDS = { LEAN: 'Lean campaign', STANDARD: 'Standard campaign', EVENT: 'Event campaign' } as const;
export const SlateCalendar: React.FC<{ slate: SlateWeek[]; posters: Map<string, CatalogueTitle> }> = ({ slate, posters }) => {
  /* a run of empty weeks is one folded row, not ten identical cards */
  const rows: Array<{ kind: 'week'; week: SlateWeek } | { kind: 'gap'; from: SlateWeek; to: SlateWeek; n: number }> = [];
  slate.forEach(week => {
    const last = rows[rows.length - 1];
    if (week.releases.length === 0 && !week.now) {
      if (last?.kind === 'gap') { last.to = week; last.n += 1; return; }
      rows.push({ kind: 'gap', from: week, to: week, n: 1 });
      return;
    }
    rows.push({ kind: 'week', week });
  });
  return (
    <div className={css.slate}>
      {rows.map(row => row.kind === 'gap' ? (
        <div key={`gap-${row.from.week}`} className={css.slateGap}>
          <span>{row.n === 1 ? row.from.label : `${row.from.label} – ${row.to.label}`}</span>
          <em>{row.n === 1 ? 'nothing scheduled' : `${row.n} weeks with nothing scheduled`}</em>
        </div>
      ) : (
        <div key={row.week.week} className={cx(css.slateWeek, row.week.now && css.slateNow)}>
          <div className={css.slateWhen}>{row.week.now && <i>NOW</i>}<b>{row.week.label}</b></div>
          <div className={css.slateReleases}>
            {row.week.releases.length === 0 && <span className={css.slateNone}>Nothing new this week</span>}
            {row.week.releases.map(release => {
              const known = release.projectId ? posters.get(release.projectId) : undefined;
              return (
                <div key={release.id} className={cx(css.release, release.rightsRisk && css.releaseRisk)}>
                  <TitleArt size="xs" title={{ id: release.projectId || release.id, title: release.title, genre: release.genre || known?.genre || 'Drama', hue: release.hue, poster: release.poster ?? known?.poster, year: known?.year }} />
                  <div>
                    <b>{release.title}</b>
                    <span>
                      <i className={css[`k_${release.kind}`]}>{release.kind === 'OWNED' ? 'YOUR STUDIO' : release.kind}</i>
                      <i>{MARKETING_WORDS[release.marketing]}</i>
                      {release.rightsRisk && <i className={css.k_risk}>LICENCE ENDS FIRST</i>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── a 0–3 tier as a ring ────────────────────────────────────────────────── */
export const LevelRing: React.FC<{ label: string; name: string; level: number; max?: number }> = ({ label, name, level, max = 3 }) => (
  <div className={css.level} role="img" aria-label={`${name}: Level ${level} of ${max}`}>
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" className={css.ringTrack} />
      {/* a round cap draws a dot at 0, so an empty ring draws no fill */}
      {level > 0 && <circle cx="18" cy="18" r="15" className={css.ringFill} pathLength={100} strokeDasharray={`${Math.round(level / max * 100)} 100`} />}
    </svg>
    <b>{level}<small>/{max}</small></b>
    <span>{label}</span>
  </div>
);
