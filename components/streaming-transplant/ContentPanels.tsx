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
     SlatePlanner    once live: a year of weeks to schedule premieres in
     LevelRing       a 0–3 localization tier as a ring

   Presentation only; the desk hands in the data and the actions.
   ========================================================================== */

import React from 'react';
import { Eye, RefreshCcw, Star } from 'lucide-react';
/* the desk's reset must reach the page first (equal specificity) */
import './presentation/screens/ContentDesk/ContentDesk.module.css';
import css from './presentation/screens/ContentDesk/ContentRoom.module.css';
import { cx } from './presentation/cx';
import { Poster } from '../../content-market-exact/Poster';
import type { CatalogueTitle, SlateWeek } from './StreamingContentExperience';

export const count = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : `${n}`);
export const money = (n: number) => (n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);

/** a genre id as words: SCI_FI → sci-fi */
export const genreWord = (genre: string) => genre.toLowerCase().replace(/_/g, '-');
/** a genre id as a label: SCI_FI → Sci-Fi */
export const genreLabel = (genre: string) => genreWord(genre).replace(/(^|-)([a-z])/g, (_, edge: string, letter: string) => edge + letter.toUpperCase());

/* Where a title comes from, as a small tinted badge in the mix legend's colours:
   Original amber, licensed cyan, your studio violet. */
const SOURCE_BADGE_WORDS: Record<CatalogueTitle['kind'], string> = { ORIGINAL: 'Original', LICENSED: 'Licensed', OWNED: 'Your studio' };
export const SourceBadge: React.FC<{ kind: CatalogueTitle['kind'] }> = ({ kind }) => (
  <em className={cx(css.src, css[`src${kind}`])}>{SOURCE_BADGE_WORDS[kind]}</em>
);

/* ── one title's art ─────────────────────────────────────────────────────── */
export const TitleArt: React.FC<{ title: Pick<CatalogueTitle, 'id' | 'title' | 'genre' | 'hue' | 'poster' | 'year'>; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string; rank?: number }> = ({ title, size = 'sm', className, rank }) => (
  <span className={cx(css.art, className)}>
    <Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} year={title.year ?? undefined} size={size} poster={title.poster} />
    {typeof rank === 'number' && <i className={css.rank}>{rank}</i>}
  </span>
);

/* ── the most-watched title ──────────────────────────────────────────────────
   A cinematic header: the title's own art blurred behind it, the poster and
   name side by side, and the week in three equal columns underneath. */
export const Spotlight: React.FC<{ title: CatalogueTitle; live: boolean; onOpen?: () => void }> = ({ title, live, onOpen }) => {
  const watched = live && (title.views ?? 0) > 0;
  const rated = typeof title.rating === 'number';
  const completion = Math.max(0, Math.min(100, title.completion ?? 0));
  return (
    <button type="button" className={cx(css.spotlight, formatTone(title))} onClick={onOpen}>
      <span className={css.spotBackdrop} aria-hidden="true">
        <Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} size="md" poster={title.poster} bare />
      </span>
      <TitleArt title={title} size="md" className={css.spotArt} />
      <span className={css.spotBody}>
        <span className={css.spotEyebrow}><i aria-hidden="true" />{watched ? 'Most watched this week' : live ? 'On your service' : 'On your shelves'}</span>
        <b className={css.spotTitle}>{title.title}</b>
        <span className={css.spotTags}>
          <SourceBadge kind={title.kind} />
          <small>{title.format} · {genreLabel(title.genre)}{title.year ? ` · Year ${title.year}` : ''}</small>
        </span>
      </span>
      {watched || rated ? (
        <span className={css.spotStats}>
          {watched && <span><b>{count(title.views!)}</b><small>Watched</small></span>}
          {watched && <span><b>{completion}%</b><small>Finish it</small><i className={css.spotBar} aria-hidden="true"><em style={{ width: `${completion}%` }} /></i></span>}
          {rated && <span className={css.spotRated}><b><Star aria-hidden="true" />{title.rating!.toFixed(1)}</b><small>Rating</small></span>}
        </span>
      ) : <span className={css.spotNote}>{live ? 'No viewing settled for it yet.' : 'Viewing starts on opening night.'}</span>}
    </button>
  );
};

/* Films and series wear the studio slate's colours everywhere on the desk:
   blue for a film, red for a series (card border, legend and list alike). */
export const formatTone = (title: Pick<CatalogueTitle, 'format'>) => (title.format === 'Series' ? css.series : css.film);

/* A mouse cannot swipe, so dragging the rail scrolls it and a drag never opens
   a card. Touch and trackpads keep the browser's own scrolling. */
const useDragScroll = () => {
  const drag = React.useRef({ x: 0, left: 0, moved: false, down: false });
  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    drag.current.down = false;
    delete event.currentTarget.dataset.dragging;
  };
  return {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false, down: true };
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      if (!state.down) return;
      const dx = event.clientX - state.x;
      if (!state.moved && Math.abs(dx) < 6) return;
      if (!state.moved) {
        state.moved = true;
        event.currentTarget.dataset.dragging = '';
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      event.currentTarget.scrollLeft = state.left - dx;
    },
    onPointerUp: release,
    onPointerCancel: release,
    onClickCapture: (event: React.MouseEvent) => {
      if (!drag.current.moved) return;
      drag.current.moved = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
};

/* A long name steps its type down instead of being cut: up to three balanced lines. */
const titleSize = (name: string) => (name.length <= 12 ? css.nameL : name.length <= 20 ? css.nameM : name.length <= 30 ? css.nameS : css.nameXs);

/* why a kept title stays: an Original, your studio's own title, or a licence bought for good */
const keptWord = (title: CatalogueTitle) => (title.kind === 'LICENSED' ? 'Permanent' : SOURCE_BADGE_WORDS[title.kind]);

/* ── one title as a poster card, the studio slate's way ──────────────────────
   views over the rating top-right, the name and "Series · Crime" along the
   bottom, a blue frame for a film and red for a series. The rail adds the rank
   ribbon; the kept grid sets it compact and names why the title stays. */
const PosterCard: React.FC<{ title: CatalogueTitle; live: boolean; rank?: number; source?: boolean; compact?: boolean; onOpen?: () => void }> = ({ title, live, rank, source = false, compact = false, onOpen }) => {
  const watched = live && title.views !== undefined;
  const rated = typeof title.rating === 'number';
  /* "Series · Documentary" is the longest line; long ones set tighter instead of ending in "…" */
  const line = `${title.format} · ${genreLabel(title.genre)}`;
  return (
    <button type="button" className={cx(css.card, compact && css.cardCompact, formatTone(title))} onClick={onOpen}
      aria-label={`${title.title}, ${title.format.toLowerCase()}${source ? `, ${keptWord(title).toLowerCase()}` : ''}${rank ? `, number ${rank}` : ''}${watched ? `, ${count(title.views!)} watched` : ''}${rated ? `, rated ${title.rating!.toFixed(1)}` : ''}`}>
      {/* the player's own poster when there is one, otherwise the art without its type */}
      <span className={css.cardArt} aria-hidden="true">
        <Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} year={title.year ?? undefined} size="md" poster={title.poster} bare />
      </span>
      <i className={css.cardShade} aria-hidden="true" />
      {rank !== undefined && <span className={css.cardRank} aria-hidden="true"><span><small>TOP</small><b>{rank}</b></span></span>}
      {(watched || rated) && (
        <span className={css.cardStats} aria-hidden="true">
          {watched && <span className={css.cardViews}><i><Eye /></i><b>{count(title.views!)}</b></span>}
          {rated && <span className={css.cardRating}><i><Star /></i><b>{title.rating!.toFixed(1)}</b></span>}
        </span>
      )}
      <span className={css.cardFoot} aria-hidden="true">
        {source && <em className={cx(css.src, css[`src${title.kind}`])}>{keptWord(title)}</em>}
        <b className={titleSize(title.title)}>{title.title}</b>
        <small className={line.length > 18 ? css.tagTight : undefined}>{line}</small>
      </span>
    </button>
  );
};

/* ── the service as a viewer sees it: a rail of poster cards, ranked ──────── */
export const PosterRail: React.FC<{ titles: CatalogueTitle[]; live: boolean; onOpen?: (title: CatalogueTitle) => void }> = ({ titles, live, onOpen }) => {
  const drag = useDragScroll();
  return (
    <div className={css.rail} {...drag}>
      {titles.map((title, index) => (
        <PosterCard key={title.id} title={title} live={live} rank={live && (title.views ?? 0) > 0 ? index + 1 : undefined} onOpen={() => onOpen?.(title)} />
      ))}
    </div>
  );
};

/* ── what the catalogue is made of ───────────────────────────────────────── */
type MixPart = { key: string; n: number; tone: string; label: React.ReactNode };
const SOURCE_TONES = { ORIGINAL: 'cOriginal', LICENSED: 'cLicensed', OWNED: 'cOwned' } as const;
const SOURCE_WORDS = { ORIGINAL: 'original', LICENSED: 'licensed', OWNED: 'from your studio' } as const;

export const CatalogueMix: React.FC<{ titles: CatalogueTitle[] }> = ({ titles }) => {
  const total = Math.max(1, titles.length);
  const films = titles.filter(title => title.format === 'Film').length;
  const genreCounts = new Map<string, number>();
  titles.forEach(title => genreCounts.set(title.genre, (genreCounts.get(title.genre) ?? 0) + 1));
  const genres = [...genreCounts.entries()].sort((left, right) => right[1] - left[1]);
  const otherGenres = genres.slice(4).reduce((sum, [, n]) => sum + n, 0);
  const share = (n: number) => `${Math.round(n / total * 100)}%`;
  /* each bar names its colours underneath, so a segment can be read without guessing */
  const row = (label: string, parts: MixPart[]) => {
    const present = parts.filter(part => part.n > 0);
    return (
      <div className={css.mixRow}>
        <span>{label}</span>
        <i className={css.mixBar}>{present.map(part => <em key={part.key} className={css[part.tone]} style={{ flexGrow: part.n }} />)}</i>
        <small className={css.legend}>{present.map(part => <span key={part.key}><i className={css[part.tone]} />{part.label}</span>)}</small>
      </div>
    );
  };
  return (
    <div className={css.mix}>
      {row('FORMAT', [
        { key: 'film', n: films, tone: 'cFilm', label: <><b>{films}</b> films</> },
        { key: 'series', n: titles.length - films, tone: 'cSeries', label: <><b>{titles.length - films}</b> series</> },
      ])}
      {row('SOURCE', (['ORIGINAL', 'LICENSED', 'OWNED'] as const).map(kind => {
        const n = titles.filter(title => title.kind === kind).length;
        return { key: kind, n, tone: SOURCE_TONES[kind], label: <><b>{n}</b> {SOURCE_WORDS[kind]}</> };
      }))}
      {row('GENRES', [
        ...genres.slice(0, 4).map(([genre, n], index) => ({ key: genre, n, tone: `g${index + 1}`, label: <>{genreWord(genre)} <b>{share(n)}</b></> })),
        { key: 'other', n: otherGenres, tone: 'gOther', label: <>other <b>{share(otherGenres)}</b></> },
      ])}
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
  /* #168: decided by your team's executive ("Renewed by Nia") */
  const by = renewal?.by && (renewal.stage === 'RENEWED' || renewal.stage === 'LETTING_GO') ? renewal.by.split(' ')[0] : null;
  const line = !renewal ? 'Renewal talks open nearer the end of the window.'
    : renewal.stage === 'RENEWED' ? (by ? `${by} renewed it. The new window starts when this one ends.` : 'Renewed. The new window starts when this one ends.')
      : renewal.stage === 'LETTING_GO' ? (by ? `${by} let it go. It stays on the service until the window ends.` : 'You are letting it go. It stays on the service until the window ends.')
        : renewal.stage === 'RETURNING' ? 'Going back to the market. Other platforms can bid for the next window.'
          : renewal.stage === 'CLOSED' ? 'No renewal offer came. It leaves when the window ends.'
            : renewal.offer ? `The licensor offers ${renewal.offer.durationWeeks} more weeks for ${money(renewal.offer.cost)}${renewal.offer.expiresInWeeks > 0 ? `; the offer stands ${renewal.offer.expiresInWeeks} more week${renewal.offer.expiresInWeeks === 1 ? '' : 's'}` : ''}.`
              : 'Talks are open; the licensor has not made an offer yet.';
  return (
    /* a renewed licence is not urgent, however near its window's end */
    <div className={cx(css.renewal, left <= 3 && renewal?.stage !== 'RENEWED' && css.renewalHot)}>
      <button type="button" className={css.renewalArt} onClick={onOpen} aria-label={`Open ${title.title}`}><TitleArt title={title} size="xs" /></button>
      <div className={css.renewalBody}>
        <div className={css.renewalTop}>
          <b>{title.title}</b>
          <em>{left === 0 ? 'ends this week' : `${left}w left`}</em>
        </div>
        <small>{rights.licensor} · {rights.territory.toLowerCase()}{rights.exclusive ? ' · exclusive' : ''}</small>
        {by && <span className={css.decidedBy}>{renewal!.stage === 'RENEWED' ? 'Renewed' : 'Let go'} by {by}</span>}
        <i className={css.drain}><em style={{ width: `${Math.max(3, Math.min(100, left / total * 100))}%` }} /></i>
        <p>{line}</p>
        <div className={css.renewalActions}>
          {decidable ? (
            <>
              <button type="button" className={css.renew} onClick={() => onDecide?.(renewal!.caseId, 'ACCEPT_RENEWAL')}>
                <RefreshCcw aria-hidden="true" />Renew<span className={css.price}>{money(renewal!.offer!.cost)}</span>
              </button>
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

/* ── every licence on one year's timeline ────────────────────────────────────
   The soonest endings first; past the first eight, Load more adds ten, so a
   big library is not one long scroll of identical bars. */
const RUNWAY_FIRST = 8;
const RUNWAY_PAGE = 10;
export const RightsRunway: React.FC<{ titles: CatalogueTitle[]; horizon?: number; onOpen?: (title: CatalogueTitle) => void }> = ({ titles, horizon = 52, onOpen }) => {
  const [limit, setLimit] = React.useState(RUNWAY_FIRST);
  const rest = Math.max(0, titles.length - limit);
  return (
    <div className={css.runway}>
      <div className={css.runwayTicks} aria-hidden="true">
        {[0, .25, .5, .75, 1].map(step => <span key={step} style={{ left: `${step * 100}%` }}>{step === 0 ? 'now' : `+${Math.round(step * horizon)}w`}</span>)}
      </div>
      {titles.slice(0, limit).map(title => {
        const left = title.rights!.endsInWeeks ?? horizon;
        const beyond = left > horizon;
        const tone = left <= 6 ? css.hot : left <= 13 ? css.warm : css.calm;
        return (
          <button key={title.id} type="button" className={css.runwayRow} onClick={() => onOpen?.(title)}>
            <span className={css.runwayName}>{title.title}</span>
            <small className={tone}>{`${left}w`}</small>
            <i className={css.runwayTrack}>
              <em className={cx(tone, beyond && css.beyond)} style={{ width: `${Math.max(2, Math.min(100, left / horizon * 100))}%` }} />
            </i>
          </button>
        );
      })}
      {rest > 0 && (
        <button type="button" className={cx(css.more, css.runwayMore)} onClick={() => setLimit(shown => shown + RUNWAY_PAGE)}>
          Load more <small>{Math.min(RUNWAY_PAGE, rest)} of {rest} left</small>
        </button>
      )}
    </div>
  );
};

/* ── what the service keeps for good ─────────────────────────────────────────
   Folded into one row by default: a stack of the first five posters, a "+N"
   tile and how many of each kind. Tapping it opens a grid of the rail's poster
   cards (compact, with why each title stays) nine at a time, and Load more
   adds twelve. Six or fewer are simply shown. */
const KEPT_FAN = 5;
const KEPT_FIRST = 9;
const KEPT_PAGE = 12;
const KEPT_KINDS = [
  { kind: 'ORIGINAL', one: 'Original', many: 'Originals' },
  { kind: 'OWNED', one: 'Your studio', many: 'Your studio' },
  { kind: 'LICENSED', one: 'Permanent', many: 'Permanent' },
] as const;
export const KeptGrid: React.FC<{ titles: CatalogueTitle[]; live?: boolean; onOpen?: (title: CatalogueTitle) => void }> = ({ titles, live = false, onOpen }) => {
  const [open, setOpen] = React.useState(false);
  const [limit, setLimit] = React.useState(KEPT_FIRST);
  const short = titles.length <= 6;
  if (!short && !open) {
    const fan = titles.slice(0, KEPT_FAN);
    const more = titles.length - fan.length;
    const kinds = KEPT_KINDS.map(entry => ({ ...entry, n: titles.filter(title => title.kind === entry.kind).length })).filter(entry => entry.n > 0);
    return (
      <button type="button" className={css.keptStack} onClick={() => setOpen(true)} aria-expanded={false}
        aria-label={`${titles.length} titles kept for good: ${kinds.map(entry => `${entry.n} ${(entry.n === 1 ? entry.one : entry.many).toLowerCase()}`).join(', ')}. Show all`}>
        <span className={css.keptFan} aria-hidden="true">
          {fan.map(title => (
            <span key={title.id}><Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} size="xs" poster={title.poster} bare /></span>
          ))}
          {more > 0 && <span className={css.keptMore}><b>+{more}</b><small>more</small></span>}
        </span>
        <span className={css.keptSum} aria-hidden="true">
          <span className={css.keptKinds}>
            {kinds.map(entry => <em key={entry.kind} className={cx(css.src, css[`src${entry.kind}`])}><b>{entry.n}</b> {entry.n === 1 ? entry.one : entry.many}</em>)}
          </span>
          <small>Show all {titles.length} →</small>
        </span>
      </button>
    );
  }
  const shown = short ? titles : titles.slice(0, limit);
  const rest = titles.length - shown.length;
  return (
    <>
      <div className={css.kept}>
        {shown.map(title => <PosterCard key={title.id} title={title} live={live} source compact onOpen={() => onOpen?.(title)} />)}
      </div>
      {!short && (
        <div className={css.keptFoot}>
          {rest > 0 && (
            <button type="button" className={css.more} onClick={() => setLimit(count => count + KEPT_PAGE)}>
              Load more <small>{Math.min(KEPT_PAGE, rest)} of {rest} left</small>
            </button>
          )}
          <button type="button" className={css.link} onClick={() => { setOpen(false); setLimit(KEPT_FIRST); }}>Show less</button>
        </div>
      )}
    </>
  );
};

/* ── the slate planner, once live ────────────────────────────────────────────
   The release weeks as a list by game year: each week with its premieres, and
   a run of empty weeks folded into one line. Tapping a row opens it in place:
   a premiere the slate set gets a ✕, and under them sit the titles on the
   shelves, one tap to premiere there. A folded run opens with its weeks as
   chips to pick from. Moving is ✕ in one week and a tap in another. Auto-fill
   places the whole shelf at once (planned in streamingSlateProgramming).
   Originals premiere through their release in the Originals studio; a licence
   bought after setup goes live when its rights start. The slate plans weeks
   only: campaigns are not set here (premieres keep the Standard plan). */
type SlatePlan = 'LEAN' | 'STANDARD' | 'EVENT';
type SlateActionResult = { ok: boolean; message: string } | undefined;
export type SlateAutoFillItem = { projectId: string; title: string; absoluteWeek: number; marketingPlan: SlatePlan };
/* the shelf as a row of posters: one tap premieres the title in the week */
const ReadyRail: React.FC<{ titles: CatalogueTitle[]; week: SlateWeek; now: number; onPick: (title: CatalogueTitle) => void }> = ({ titles, week, now, onPick }) => {
  const drag = useDragScroll();
  return (
    <div className={css.slReady}>
      <small>Ready to add · tap to premiere in W{week.weekOfYear ?? week.week}</small>
      <div className={css.slRail} {...drag}>
        {titles.map(title => {
          /* a licence must still run in that week */
          const ok = !title.rights || title.rights.perpetual || title.rights.endsInWeeks === undefined || now + title.rights.endsInWeeks > week.week;
          return (
            <button key={title.id} type="button" disabled={!ok} className={cx(css.slPick, formatTone(title))} onClick={() => onPick(title)}
              aria-label={ok ? `Premiere ${title.title} in week ${week.weekOfYear ?? week.week}` : `${title.title}: its rights end before this week`}>
              <span className={css.slPickArt}><Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} size="xs" poster={title.poster} /></span>
              <b>{title.title}</b>
              <small>{ok ? `${title.format} · ${genreLabel(title.genre)}` : 'Rights end first'}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
};

type SlateRow = { kind: 'week'; key: string; week: SlateWeek } | { kind: 'run'; key: string; weeks: SlateWeek[] };

export const SlatePlanner: React.FC<{
  slate: SlateWeek[];
  titles: CatalogueTitle[];
  /** the first absolute week a premiere can be set in */
  scheduleFrom?: number;
  /** the auto-fill plan for the shelf around what is planned, earliest week first */
  autoFill?: SlateAutoFillItem[];
  /** the auto-fill plan starting fresh (the planned premieres taken off first) */
  autoFillFresh?: SlateAutoFillItem[];
  onSchedule?: (projectId: string, absoluteWeek: number, plan: SlatePlan) => SlateActionResult;
  onUnschedule?: (projectId: string) => SlateActionResult;
  onAutoFill?: (fresh: boolean) => SlateActionResult;
  onClearPlans?: () => SlateActionResult;
  onOpen?: (title: CatalogueTitle) => void;
}> = ({ slate, titles, scheduleFrom, autoFill = [], autoFillFresh = [], onSchedule, onUnschedule, onAutoFill, onClearPlans, onOpen }) => {
  const now = slate[0]?.week ?? 0;
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [runWeek, setRunWeek] = React.useState<number | null>(null);
  const [note, setNote] = React.useState<{ key: string; ok: boolean; message: string } | null>(null);
  /* the plan card's step: choosing how to auto-fill, previewing a plan, or confirming Remove all */
  const [step, setStep] = React.useState<null | 'choose' | 'keep' | 'fresh' | 'clear'>(null);
  const byId = React.useMemo(() => new Map(titles.map(title => [title.id, title])), [titles]);
  const ready = React.useMemo(() => titles.filter(title => title.schedulable).sort((left, right) => left.title.localeCompare(right.title)), [titles]);
  const planned = slate.flatMap(week => week.releases).filter(release => release.editable).length;
  const tag = (week: SlateWeek) => `W${week.weekOfYear ?? week.week}`;
  const when = (week: SlateWeek) => (week.now ? 'Now' : week.week === now + 1 ? 'Next' : `in ${week.week - now}w`);
  const report = (key: string, result: SlateActionResult) => { if (result) setNote({ key, ...result }); };
  const toggle = (key: string, firstWeek: number | null = null) => {
    setOpenKey(current => (current === key ? null : key));
    setRunWeek(firstWeek);
    setNote(null);
  };

  /* the rows of each game year: a week with premieres (and this week) is a row;
     a run of empty weeks is one row */
  const years: Array<{ year: number; count: number; rows: SlateRow[] }> = [];
  slate.forEach(week => {
    const year = week.year ?? 0;
    let group = years[years.length - 1];
    if (!group || group.year !== year) { group = { year, count: 0, rows: [] }; years.push(group); }
    group.count += 1;
    const last = group.rows[group.rows.length - 1];
    if (week.releases.length === 0 && !week.now) {
      if (last?.kind === 'run') { last.weeks.push(week); return; }
      group.rows.push({ kind: 'run', key: `run-${week.week}`, weeks: [week] });
      return;
    }
    group.rows.push({ kind: 'week', key: `week-${week.week}`, week });
  });

  const canAdd = (week: SlateWeek) => Boolean(onSchedule) && scheduleFrom !== undefined && week.week >= scheduleFrom;
  /* after a change the row it lands in stays open: an added title turns its
     week into a row of its own; taking off a week's last title folds it into
     the empty run that now starts at or before it */
  const premiere = (key: string, week: SlateWeek) => (title: CatalogueTitle) => {
    const result = onSchedule?.(title.id, week.week, 'STANDARD');
    if (!result) return;
    const landed = result.ok ? `week-${week.week}` : key;
    setOpenKey(landed);
    setNote({ key: landed, ...result });
  };
  const takeOff = (key: string, week: SlateWeek, projectId: string) => {
    const result = onUnschedule?.(projectId);
    if (!result) return;
    if (!result.ok || week.releases.length > 1) { setNote({ key, ...result }); return; }
    let start = week.week;
    for (let previous = week.week - 1; ; previous -= 1) {
      const row = slate.find(item => item.week === previous);
      if (!row || row.now || row.releases.length || row.year !== week.year) break;
      start = previous;
    }
    setOpenKey(`run-${start}`);
    setRunWeek(week.week);
    setNote({ key: `run-${start}`, ...result });
  };

  const weekBody = (week: SlateWeek, key: string) => (
    <div className={css.slBody}>
      {week.releases.map(release => {
        const title = release.projectId ? byId.get(release.projectId) : undefined;
        return (
          <div key={release.id} className={cx(css.slLine, release.format === 'Series' ? css.series : css.film)}>
            <button type="button" className={css.slLineArt} onClick={() => title && onOpen?.(title)} aria-label={`Open ${release.title}`}>
              <Poster id={release.projectId || release.id} title={release.title} genre={release.genre || 'Drama'} hue={release.hue} size="xs" poster={release.poster} />
            </button>
            <div className={css.slInfo}>
              <b>{release.title}</b>
              <span className={css.metaLine}><SourceBadge kind={release.kind} />{release.format ?? 'Film'}</span>
              {release.rightsRisk && <small className={css.wkRisk}>Its licence ends before this week</small>}
              {!release.editable && (
                <small className={css.wkNote}>{release.kind === 'ORIGINAL' ? 'Premiere set in the Originals studio' : release.auto ? 'Goes live by itself when its licence starts' : week.now ? 'Premieres this week' : 'Set in the opening slate'}</small>
              )}
            </div>
            {release.editable && release.projectId && canAdd(week) && (
              <button type="button" className={css.slRemove} onClick={() => takeOff(key, week, release.projectId!)} aria-label={`Take ${release.title} off this week`}>✕</button>
            )}
          </div>
        );
      })}
      {canAdd(week)
        ? (ready.length ? <ReadyRail titles={ready} week={week} now={now} onPick={premiere(key, week)} /> : <p className={css.wkEmpty}>Nothing on your shelves to add.</p>)
        : week.now && <p className={css.wkEmpty}>This week is already running. Premieres can be set from next week.</p>}
      {note?.key === key && <p className={cx(css.wkMsg, note.ok ? css.good : css.bad)} role="status">{note.message}</p>}
    </div>
  );

  return (
    <div className={css.plan}>
      {(ready.length > 0 || planned > 0) && (
        <div className={css.planReady}>
          {ready.length > 0 && (
            <span className={css.keptFan} aria-hidden="true">
              {ready.slice(0, 4).map(title => <span key={title.id}><Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} size="xs" poster={title.poster} bare /></span>)}
            </span>
          )}
          <div className={css.planReadyText}>
            <p>
              {ready.length > 0
                ? <><b>{ready.length} title{ready.length === 1 ? ' is' : 's are'} on your shelves</b> but not on the service. </>
                : <>Everything on your shelves is scheduled. </>}
              {planned > 0 ? `${planned} premiere${planned === 1 ? '' : 's'} planned.` : 'Tap a week to add, or let Auto-fill place them.'}
            </p>
            <div className={css.planTools}>
              {onAutoFill && (autoFill.length > 0 || autoFillFresh.length > 0) && (
                <button type="button" className={css.autoBtn} aria-expanded={step === 'choose' || step === 'keep' || step === 'fresh'}
                  onClick={() => { setStep(current => (current && current !== 'clear' ? null : planned > 0 ? 'choose' : 'keep')); setNote(null); }}>Auto-fill</button>
              )}
              {onClearPlans && planned > 0 && (
                <button type="button" className={css.clearBtn} aria-expanded={step === 'clear'}
                  onClick={() => { setStep(current => (current === 'clear' ? null : 'clear')); setNote(null); }}>Remove all</button>
              )}
            </div>
          </div>
        </div>
      )}
      {step === 'choose' && (
        <div className={css.autoPlan}>
          <header>
            <b>Auto-fill · you already planned {planned} premiere{planned === 1 ? '' : 's'}</b>
            <small>Keep them and fill the weeks around them, or start fresh: take them off and plan every title again.</small>
          </header>
          <button type="button" className={css.autoChoice} disabled={!autoFill.length} onClick={() => setStep('keep')}>
            <b>Keep my plans</b>
            <small>{autoFill.length ? `Fill the gaps · ${autoFill.length} title${autoFill.length === 1 ? '' : 's'} from the shelves` : 'Nothing on the shelves to add'}</small>
          </button>
          <button type="button" className={css.autoChoice} disabled={!autoFillFresh.length} onClick={() => setStep('fresh')}>
            <b>Start fresh</b>
            <small>Replace my plans · plan all {autoFillFresh.length} title{autoFillFresh.length === 1 ? '' : 's'} again</small>
          </button>
          <div className={css.autoActions}><button type="button" className={css.link} onClick={() => setStep(null)}>Cancel</button></div>
        </div>
      )}
      {(step === 'keep' || step === 'fresh') && (() => {
        const plan = step === 'fresh' ? autoFillFresh : autoFill;
        return (
          <div className={css.autoPlan}>
            <header>
              <b>{step === 'fresh' ? 'Auto-fill · start fresh' : 'Auto-fill plan'}</b>
              <small>{step === 'fresh' ? `Your ${planned} planned premiere${planned === 1 ? '' : 's'} come off first. ` : ''}Closes the silent weeks first, about one premiere every third week, inside each title's rights.</small>
            </header>
            {plan.map(item => (
              <div key={item.projectId} className={css.autoRow}>
                <span>{item.title}</span>
                <em>Year {Math.floor(item.absoluteWeek / 52) + 1} · W{(item.absoluteWeek % 52) + 1}</em>
              </div>
            ))}
            <div className={css.autoActions}>
              <button type="button" className={css.link} onClick={() => setStep(planned > 0 ? 'choose' : null)}>{planned > 0 ? 'Back' : 'Cancel'}</button>
              <button type="button" className={css.go} onClick={() => { report('auto', onAutoFill?.(step === 'fresh')); setStep(null); }}>Schedule all {plan.length}</button>
            </div>
          </div>
        );
      })()}
      {step === 'clear' && (
        <div className={cx(css.autoPlan, css.clearPlan)}>
          <header>
            <b>Remove all {planned} planned premiere{planned === 1 ? '' : 's'}?</b>
            <small>The slate goes back to empty. Setup and studio titles return to your shelves; a licence bought after setup goes live again when its rights start. Originals are not touched.</small>
          </header>
          <div className={css.autoActions}>
            <button type="button" className={css.link} onClick={() => setStep(null)}>Cancel</button>
            <button type="button" className={css.clearGo} onClick={() => { report('auto', onClearPlans?.()); setStep(null); }}>Remove all {planned}</button>
          </div>
        </div>
      )}
      {note?.key === 'auto' && <p className={cx(css.wkMsg, note.ok ? css.good : css.bad)} role="status">{note.message}</p>}
      {years.map(group => (
        <section key={group.year} className={css.planYear}>
          <header><b>{group.year ? `Year ${group.year}` : 'Programme'}</b><small>{group.count} week{group.count === 1 ? '' : 's'}</small></header>
          <div className={css.slRows}>
            {group.rows.map(row => {
              const open = openKey === row.key;
              if (row.kind === 'week') {
                const { week } = row;
                return (
                  <div key={row.key} className={cx(css.sl, open && css.slOpen, week.now && css.slNow)}>
                    <button type="button" className={css.slHead} onClick={() => toggle(row.key)} aria-expanded={open}
                      aria-label={`${week.label}${week.year ? `, year ${week.year} week ${week.weekOfYear}` : ''}: ${week.releases.length ? week.releases.map(release => release.title).join(', ') : 'nothing scheduled'}`}>
                      <span className={css.slWhen}><b>{tag(week)}</b><small>{when(week)}</small></span>
                      <span className={css.slList}>
                        {open ? <span className={css.slEmpty}>{week.year ? `Year ${week.year} · Week ${week.weekOfYear}` : week.label}</span>
                          : week.releases.length ? week.releases.map(release => (
                            <span key={release.id} className={cx(css.slItem, release.format === 'Series' ? css.series : css.film)}>
                              <span className={css.slArt}><Poster id={release.projectId || release.id} title={release.title} genre={release.genre || 'Drama'} hue={release.hue} size="xs" poster={release.poster} bare /></span>
                              <span className={css.slText}><b>{release.title}</b><small><SourceBadge kind={release.kind} />{release.format ?? 'Film'}</small></span>
                            </span>
                          )) : <span className={css.slEmpty}>Nothing premieres this week</span>}
                      </span>
                      <i className={css.slChevron} aria-hidden="true">{open ? '–' : '+'}</i>
                    </button>
                    {open && weekBody(week, row.key)}
                  </div>
                );
              }
              const { weeks } = row;
              const picked = weeks.find(week => week.week === runWeek) ?? weeks[0];
              return (
                <div key={row.key} className={cx(css.sl, css.slRun, open && css.slOpen)}>
                  <button type="button" className={css.slHead} onClick={() => toggle(row.key, weeks[0].week)} aria-expanded={open}
                    aria-label={`${weeks.length === 1 ? tag(weeks[0]) : `${tag(weeks[0])} to ${tag(weeks[weeks.length - 1])}`}: nothing scheduled`}>
                    <span className={css.slWhen}><b>{weeks.length === 1 ? tag(weeks[0]) : `${tag(weeks[0])}–${weeks[weeks.length - 1].weekOfYear ?? weeks[weeks.length - 1].week}`}</b><small>{weeks.length === 1 ? when(weeks[0]) : `${weeks.length} weeks`}</small></span>
                    <span className={css.slList}><span className={css.slEmpty}>Nothing yet</span></span>
                    <i className={css.slChevron} aria-hidden="true">{open ? '–' : '+'}</i>
                  </button>
                  {open && (
                    <>
                      {weeks.length > 1 && (
                        <div className={css.slChips} role="group" aria-label="Pick a week">
                          {weeks.map(week => (
                            <button key={week.week} type="button" className={cx(css.slChip, picked.week === week.week && css.slChipOn)} aria-pressed={picked.week === week.week}
                              onClick={() => { setRunWeek(week.week); setNote(null); }}>{tag(week)}</button>
                          ))}
                        </div>
                      )}
                      {weekBody(picked, row.key)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

/* ── the release weeks ───────────────────────────────────────────────────── */
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
