/**
 * EMPIRE+ v2 — CONTENT DESK
 *
 * The permanent content-business headquarters, built around the titles'
 * own one-sheets (see ContentPanels.tsx):
 *   LIBRARY      → the most-watched title in the spotlight, the service as a
 *                  viewer sees it (a ranked poster rail), what the catalogue
 *                  is made of, then the filterable list
 *   RIGHTS       → licences near their end with the real renewal decision,
 *                  every licence on a one-year runway, what is kept for good,
 *                  what has lapsed
 *   SLATE        → the release weeks on the calendar, empty runs folded
 *   LOCALIZATION → language regions: the viewers this week's subtitles and
 *                  dubbing added, the lab (energy), and each region's levels
 *                  (LocalizationDesk.tsx)
 */
import s from './presentation/screens/ContentDesk/ContentDesk.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowDownUp, ChevronRight, Film, LibraryBig, LockKeyhole, Sparkles, X } from 'lucide-react';
import { gameWeekLabel, gameWeekText } from '../../services/gameWeek';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';
import room from './presentation/screens/ContentDesk/ContentRoom.module.css';
import {
  CatalogueMix, KeptGrid, PosterRail, RenewalCard, RightsRunway, SlateCalendar, SlatePlanner, Spotlight, TitleArt,
  count as countLabel, formatTone, genreLabel, SourceBadge, type RenewalAction,
} from './ContentPanels';
import { LocalizationDesk, type LocalizationDeskActions } from './LocalizationDesk';
import type { StreamingLocalizationDeskView } from '../../services/streamingLocalizationDesk';

const LIST_PAGE = 10;

/** $1.2B · $45M · $850K · $900 */
const moneyShort = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1).replace(/\.0$/, '')}B`
  : value >= 1e6 ? `$${(value / 1e6).toFixed(value >= 1e8 ? 0 : 1).replace(/\.0$/, '')}M`
  : value >= 1e3 ? `$${Math.round(value / 1e3)}K` : `$${Math.round(value)}`);

/** the year under a week in the purchase record: blank this year, then "last yr", "2 yrs ago" */
const yearsAgo = (absoluteWeek: number, now?: number) => {
  if (now === undefined) return '';
  const years = Math.floor(now / 52) - Math.floor(absoluteWeek / 52);
  return years <= 0 ? '' : years === 1 ? 'last yr' : `${years} yrs ago`;
};
import type { CustomPoster } from '../../types';
import { RoomSubtitle } from './RoomSubtitle';

/* ============================================================
   MODEL
   ============================================================ */
export interface RightsWindow {
  licensor: string;
  territory: string;
  /** weeks until the window closes; undefined when owned outright */
  endsInWeeks?: number;
  /** total length of the window in weeks, for the drain bar */
  windowWeeks?: number;
  exclusive: boolean;
  renewCost?: number;
  /** a permanent window or purchase: no end date */
  perpetual?: boolean;
}

/** Renewal talks the rights calendar has open for a licence. */
export interface RenewalCase {
  caseId: string;
  stage: 'TALKS' | 'OFFER' | 'DECIDE' | 'RENEWED' | 'RETURNING' | 'LETTING_GO' | 'CLOSED';
  /** a decision can still be recorded */
  pending: boolean;
  offer?: { cost: number; durationWeeks: number; expiresInWeeks: number };
  deadlineInWeeks: number;
  /** #168: the executive who decided it, and how many weeks ago */
  by?: string;
  byWeeksAgo?: number;
}

export interface CatalogueTitle {
  id: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED' | 'OWNED';
  format: string;                 // "Film" | "Series"
  genre: string;
  status: 'LIVE' | 'STAGED' | 'IN PRODUCTION' | 'READY TO SCHEDULE' | 'SCHEDULED' | 'EARLY ACCESS' | 'AWAITING AVAILABILITY' | 'RIGHTS EXPIRED' | 'RIGHTS UNAVAILABLE';
  rating?: number;
  views?: number;
  completion?: number;
  hue: number;
  rights?: RightsWindow;
  year?: number | null;
  /** the player's own production art, when there is some */
  poster?: CustomPoster;
  /** KEPT: Originals, studio imports, licences with no end · WINDOW: a licence
      that runs out · LAPSED: a licensed title with no active licence */
  rightsState?: 'KEPT' | 'WINDOW' | 'LAPSED';
  renewal?: RenewalCase;
  /** on the shelves but not on the service yet: the slate can give it a premiere week */
  schedulable?: boolean;
  /** the absolute week it joined the catalogue: a licence's first signing (not a renewal), an Original's commission,
      a studio title's link (Zeesh, 2026-11-09: the Library shows it and sorts by it) */
  addedAt?: number;
}

/** One acquisition, for the Rights tab's week-by-week record of what was bought (Zeesh, 2026-11-09). */
export interface ContentHistoryEntry {
  id: string;
  projectId: string;
  title: string;
  /** the absolute week it was signed, commissioned or linked */
  at: number;
  /** how it came in: Market, Collection, From a platform, Upcoming sale, Renewal, Original, Your studio, Opening catalogue */
  how: string;
  /** paid up front: a licence's guarantee or an Original's fee (0 for a studio title) */
  paid: number;
  /** a licence's length in weeks, or kept for good */
  weeks?: number;
  kept?: boolean;
}

export interface SlateRelease {
  id: string;
  projectId?: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED' | 'OWNED';
  /** the slate's own campaign plan names */
  marketing: 'LEAN' | 'STANDARD' | 'EVENT';
  hue: number;
  genre?: string;
  poster?: CustomPoster;
  /** set when the licence lapses before the release date — a real blocker */
  rightsRisk?: boolean;
  format?: 'Film' | 'Series';
  /** a premiere still ahead that the slate set: it can be moved or taken off */
  editable?: boolean;
  /** #291: an Original series: all at once, or an episode a week */
  rhythm?: 'ALL' | 'WEEKLY';
  /** goes on the service by itself when its licence starts (a licence bought after setup);
      the slate shows it but does not plan it */
  auto?: boolean;
  /** a licensed title's rights window, in absolute weeks (no end: kept for good) */
  rightsFrom?: number;
  rightsUntil?: number;
}

/** `week` is the absolute week once live (programme week before launch); `year` and
    `weekOfYear` are the game calendar's, for labels */
export interface SlateWeek { week: number; label?: string; now?: boolean; releases: SlateRelease[]; year?: number; weekOfYear?: number }

export interface ContentDeskState {
  live: boolean;
  titles: CatalogueTitle[];
  slate: SlateWeek[];
  /** PROGRAMME: weeks counted from opening night (before launch) · WEEKS: the calendar */
  calendar?: 'PROGRAMME' | 'WEEKS';
  /** once live: the first absolute week a premiere can be set in (next week) */
  scheduleFrom?: number;
  /** once live: where Auto-fill would premiere the titles on the shelves, around the plan */
  autoFill?: Array<{ projectId: string; title: string; absoluteWeek: number; marketingPlan: 'LEAN' | 'STANDARD' | 'EVENT' }>;
  /** once live: the same, starting fresh (the planned premieres taken off first) */
  autoFillFresh?: Array<{ projectId: string; title: string; absoluteWeek: number; marketingPlan: 'LEAN' | 'STANDARD' | 'EVENT' }>;
  /** the absolute week now, for "added week 14 last year" */
  now?: number;
  /** everything bought, newest first */
  history?: ContentHistoryEntry[];
}

export type ContentEntryRouteId = 'LICENSE' | 'ORIGINAL' | 'OWNED' | 'CATALOGUE';

export interface ContentEntryRoute {
  id: ContentEntryRouteId;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  disabled?: boolean;
  onSelect?: () => void;
}

type Tab = 'LIBRARY' | 'RIGHTS' | 'SLATE' | 'LOCALIZATION';

/* ============================================================
   HELPERS
   ============================================================ */
const count =(n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;

const ENTRY_ICON = {
  LICENSE: Film,
  ORIGINAL: Sparkles,
  OWNED: LibraryBig,
  CATALOGUE: Archive,
} satisfies Record<ContentEntryRouteId, React.ComponentType<{ size?: number }>>;

/** Slate warnings, derived rather than authored — the same checks the doc lists. */
const slateWarnings = (slate: SlateWeek[], titles: CatalogueTitle[]) => {
  const out: { id: string; level: 'watch' | 'urgent'; text: string }[] = [];

  // a run of empty weeks bleeds subscribers (read over the next twelve weeks: a
  // year-long calendar is mostly empty far ahead, and that is not a warning)
  let gap = 0, worst = 0, worstAt: SlateWeek | null = null, runStart: SlateWeek | null = null;
  slate.slice(0, 12).forEach(w => {
    if (w.releases.length === 0) { if (gap === 0) runStart = w; gap++; if (gap > worst) { worst = gap; worstAt = runStart; } }
    else gap = 0;
  });
  if (worst >= 3 && worstAt) out.push({
    id: 'gap', level: 'urgent',
    text: `${worst} silent weeks from ${(worstAt as SlateWeek).label?.toLowerCase() ?? `week ${(worstAt as SlateWeek).week}`} — nothing new to open the app for`,
  });

  // a licence that lapses before its own release date
  slate.forEach(w => w.releases.forEach(r => {
    if (r.rightsRisk) out.push({
      id: `risk-${r.id}`, level: 'urgent',
      text: `${r.title} is scheduled for ${w.label?.toLowerCase() ?? `week ${w.week}`} but its licence ends first`,
    });
  }));

  // nothing that holds people week to week
  if (!titles.some(t => t.format === 'Series' && t.status === 'LIVE')) out.push({
    id: 'retention', level: 'watch',
    text: 'No live series — nothing is holding subscribers between films',
  });

  return out;
};

/* ============================================================
   THE PAGE
   ============================================================ */
export const ContentDesk: React.FC<{
  brand: Brand;
  state: ContentDeskState;
  onBack: () => void;
  initialTab?: Tab;
  onOpenTitle?: (t: CatalogueTitle) => void;
  entryRoutes?: ContentEntryRoute[];
  onAddContent?: () => void;
  onOpenSlate?: () => void;
  /** Kept for callers: opens the rights desk for a title (fallback when no renewal is open). */
  onRenew?: (t: CatalogueTitle) => void;
  onLapse?: (t: CatalogueTitle) => void;
  /** Records a renewal decision on the rights calendar's open case. */
  onRenewalDecision?: (caseId: string, action: RenewalAction) => { ok: boolean; message: string };
  /** once live: premiere a title from the shelves in a week */
  onScheduleTitle?: (projectId: string, absoluteWeek: number, plan: 'LEAN' | 'STANDARD' | 'EVENT', rhythm?: 'ALL' | 'WEEKLY') => { ok: boolean; message: string };
  /** once live: take a premiere that has not happened yet off the slate */
  onUnscheduleTitle?: (projectId: string) => { ok: boolean; message: string };
  /** once live: premiere everything on the shelves where the auto-fill plan puts it
      (fresh: take the planned premieres off first and plan everything anew) */
  onAutoFillSlate?: (fresh: boolean) => { ok: boolean; message: string };
  /** once live: take every planned premiere off the slate */
  onClearSlatePlans?: () => { ok: boolean; message: string };
  /** Opens the rights calendar (Rights Exchange, Calendar tab). */
  onOpenRightsCalendar?: () => void;
  /** The Localization tab: regions, the lab and the week's figures (`getStreamingLocalizationDesk`). */
  localizationDesk?: StreamingLocalizationDeskView;
  /** Each returns what happened, so a refusal is shown instead of swallowed. */
  localizationActions?: LocalizationDeskActions;
}> = ({ brand, state, onBack, initialTab, onOpenTitle, entryRoutes = [], onAddContent, onOpenSlate, onRenew, onRenewalDecision, onScheduleTitle, onUnscheduleTitle, onAutoFillSlate, onClearSlatePlans, onOpenRightsCalendar, localizationDesk, localizationActions }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'LIBRARY');
  const [filter, setFilter] = useState<'ALL' | 'ORIGINAL' | 'LICENSED' | 'OWNED' | 'EXPIRING'>('ALL');
  /* Zeesh, 2026-11-09: the Library in the order titles joined it, newest first unless turned round */
  const [librarySort, setLibrarySort] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [historyLimit, setHistoryLimit] = useState(12);
  // Keep the approved cards intact while bounding poster/SVG work for large libraries.
  const [listPages, setListPages] = useState<Record<string, number>>({});
  useEffect(() => { setListPages(current => ({ ...current, library: 0 })); }, [filter]);
  const pageSize = 60;
  const pageOf = (key: string, total: number) => Math.min(listPages[key] || 0, Math.max(0, Math.ceil(total / pageSize) - 1));
  const visibleTitles = (key: string, titles: CatalogueTitle[]) => titles.length <= 100 ? titles : titles.slice(pageOf(key, titles.length) * pageSize, (pageOf(key, titles.length) + 1) * pageSize);
  const pagination = (key: string, total: number) => {
    if (total <= 100) return null;
    const page = pageOf(key, total);
    return <nav className={s.cdhead} aria-label={`${key} pages`}>
      <button type="button" className={s.cdadd} disabled={page === 0} onClick={() => setListPages(current => ({ ...current, [key]: page - 1 }))}>← Previous</button>
      <span>{page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} of {total}</span>
      <button type="button" className={s.cdadd} disabled={(page + 1) * pageSize >= total} onClick={() => setListPages(current => ({ ...current, [key]: page + 1 }))}>Next →</button>
    </nav>;
  };
  /* the list opens on ten titles; Load more adds ten, and a new filter starts again at ten */
  const [listLimit, setListLimit] = useState(LIST_PAGE);
  const [showEntryRoutes, setShowEntryRoutes] = useState(false);
  const [openingMarket, setOpeningMarket] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const openFrame = useRef<number | null>(null);
  const openTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (openFrame.current !== null) cancelAnimationFrame(openFrame.current);
    if (openTimer.current !== null) clearTimeout(openTimer.current);
  }, []);
  const openContent = () => {
    if (!onAddContent) { setShowEntryRoutes(true); return; }
    if (openingMarket) return;
    setOpeningMarket(true);
    openFrame.current = requestAnimationFrame(() => {
      openTimer.current = window.setTimeout(() => { setOpeningMarket(false); onAddContent(); }, 0);
    });
  };
  const switchTab = (next: Tab) => { setTab(next); setFeedback(null); };

  const windows = useMemo(() => state.titles.filter(t => (t.rightsState ? t.rightsState === 'WINDOW' : Boolean(t.rights && !t.rights.perpetual)) && t.rights?.endsInWeeks !== undefined)
    .sort((a, b) => a.rights!.endsInWeeks! - b.rights!.endsInWeeks!), [state.titles]);
  /* #168: renewals your team decided in the last four weeks */
  const handled = useMemo(() => windows.filter(t => t.renewal?.by && !t.renewal.pending && (t.renewal.byWeeksAgo ?? 99) <= 4), [windows]);
  const handledBy = useMemo(() => {
    const names = new Set(handled.map(t => t.renewal!.by!.split(' ')[0]));
    return names.size === 1 ? [...names][0] : 'your team';
  }, [handled]);
  /* a decision is due: a licence in its last six weeks, or open renewal talks */
  const decisions = useMemo(() => windows.filter(t => !handled.includes(t) && (t.rights!.endsInWeeks! <= 6
    || (t.renewal?.pending && ['OFFER', 'DECIDE', 'TALKS'].includes(t.renewal.stage)))), [windows, handled]);
  const kept = useMemo(() => state.titles.filter(t => (t.rightsState ?? (t.rights ? 'WINDOW' : 'KEPT')) === 'KEPT'), [state.titles]);
  const lapsed = useMemo(() => state.titles.filter(t => t.rightsState === 'LAPSED'), [state.titles]);
  const warnings = useMemo(() => slateWarnings(state.slate, state.titles), [state.slate, state.titles]);
  /* once live, the Slate tab plans the calendar itself */
  const planning = state.calendar === 'WEEKS' && state.live && state.scheduleFrom !== undefined;
  const byViews = useMemo(() => [...state.titles].sort((a, b) => (b.views ?? -1) - (a.views ?? -1)), [state.titles]);
  const titleById = useMemo(() => new Map(state.titles.map(t => [t.id, t])), [state.titles]);
  const history = state.history ?? [];

  const shown = useMemo(() => state.titles.filter(t =>
    filter === 'ALL' ? true
      : filter === 'EXPIRING' ? t.rights?.endsInWeeks !== undefined && t.rights.endsInWeeks <= 6
        : t.kind === filter)
    /* a title with no known week (an old save's trimmed record) goes to the end either way */
    .sort((a, b) => {
      if (a.addedAt === undefined || b.addedAt === undefined) return (a.addedAt === undefined ? 1 : 0) - (b.addedAt === undefined ? 1 : 0);
      return librarySort === 'NEWEST' ? b.addedAt - a.addedAt : a.addedAt - b.addedAt;
    }), [state.titles, filter, librarySort]);

  const counts = {
    titles: state.titles.length,
    originals: state.titles.filter(t => t.kind === 'ORIGINAL').length,
    licensed: state.titles.filter(t => t.kind === 'LICENSED').length,
    expiring: windows.filter(t => t.rights!.endsInWeeks! <= 6).length,
  };

  const decide = (caseId: string, action: RenewalAction) => {
    if (!onRenewalDecision) return;
    setFeedback(onRenewalDecision(caseId, action));
  };
  const statusClass = (status: CatalogueTitle['status']) => s[status.replace(/\s/g, '').toLowerCase()];

  return (
    <div className={s.cd} data-epx-root style={brandVars(brand)}>
      <div className={s.cdtop}>
        <button className={s.cdback} onClick={onBack} aria-label="Back">←</button>
        <div className={s.cdtitle}>
          <b>CONTENT DESK</b>
          <RoomSubtitle>LIBRARY · RIGHTS · SLATE · LANGUAGES</RoomSubtitle>
        </div>
        <span className={s.cdmark}><Mark brand={brand} /></span>
      </div>

      <div className={s.cdstats}>
        <div><span>TITLES</span><b>{counts.titles}</b></div>
        <div><span>ORIGINALS</span><b>{counts.originals}</b></div>
        <div><span>LICENSED</span><b>{counts.licensed}</b></div>
        <div><span>EXPIRING</span><b className={counts.expiring ? s.bad : ''}>{counts.expiring}</b></div>
      </div>

      <div className={s.cdtabs}>
        {(['LIBRARY', 'RIGHTS', 'SLATE', 'LOCALIZATION'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? s.on : ''} onClick={() => switchTab(t)}>
            {t}
            {t === 'RIGHTS' && decisions.length > 0 && <i className={s.tdot} />}
            {t === 'SLATE' && warnings.some(w => w.level === 'urgent') && <i className={s.tdot} />}
          </button>
        ))}
      </div>

      <div className={cx(s.cdscroll, room.room)}>
        {feedback && <p className={cx(room.feedback, feedback.ok ? room.good : room.bad)} role="status">{feedback.message}</p>}

        {/* ── LIBRARY — the service as a viewer would see it ── */}
        {tab === 'LIBRARY' && (
          <>
            {byViews.length > 0 && <Spotlight title={byViews[0]} live={state.live} onOpen={() => onOpenTitle?.(byViews[0])} />}
            {decisions.length > 0 && (
              <button type="button" className={room.alert} onClick={() => switchTab('RIGHTS')}>
                <i aria-hidden="true" />
                <b>{decisions.length === 1 ? `${decisions[0].title}'s licence needs a decision` : `${decisions.length} licences need a decision`}</b>
                <em>RIGHTS →</em>
              </button>
            )}
            {byViews.length > 1 && (
              <section className={s.cdsec}>
                <div className={s.cdhead}><h2>On your service</h2><span>{state.live ? 'by viewers this week' : 'your opening shelves'}</span></div>
                <PosterRail titles={byViews.slice(0, 12)} live={state.live} onOpen={onOpenTitle} />
              </section>
            )}
            {state.titles.length > 0 && (
              <section className={s.cdsec}>
                <div className={s.cdhead}><h2>What it is made of</h2><span>{state.titles.length} title{state.titles.length === 1 ? '' : 's'}</span></div>
                <CatalogueMix titles={state.titles} />
              </section>
            )}

            <section className={s.cdsec}>
              <div className={s.cdhead}>
                <h2>Library</h2>
                <button className={s.cdadd} disabled={openingMarket} aria-busy={openingMarket} onClick={openContent}>{openingMarket ? 'OPENING MARKET…' : '+ ADD CONTENT'}</button>
              </div>
              <div className={s.chips}>
                {(['ALL', 'ORIGINAL', 'LICENSED', 'OWNED', 'EXPIRING'] as const).map(f => (
                  <button key={f} className={filter === f ? s.on : ''} onClick={() => { setFilter(f); setListLimit(LIST_PAGE); }}>
                    {f === 'ALL' ? 'All' : f === 'ORIGINAL' ? 'Originals' : f === 'LICENSED' ? 'Licensed' : f === 'OWNED' ? 'My studio' : 'Expiring'}
                  </button>
                ))}
              </div>

              {shown.length === 0 && state.titles.length === 0 ? (
                <div className={s.emptyLibrary}>
                  <span className={s.emptyLibraryMark}><Film size={25} /></span>
                  <strong>Your shelves are empty.</strong>
                  <p>Choose how the first title enters the service.</p>
                  <button type="button" disabled={openingMarket} aria-busy={openingMarket} onClick={openContent}>{openingMarket ? 'OPENING MARKET…' : 'ADD CONTENT'} <ChevronRight size={15} /></button>
                </div>
              ) : shown.length === 0 ? <div className={s.empty}>Nothing matches that filter.</div> : null}

              {/* the count on the left, the order (newest or oldest first) on the right: always in sight, not at the end of the scrolling chips */}
              {shown.length > 0 && (
                <div className={s.listbar}>
                  <small className={room.listCount}>{shown.length > LIST_PAGE ? `Showing ${Math.min(listLimit, shown.length)} of ${shown.length}` : `${shown.length} title${shown.length === 1 ? '' : 's'}`}</small>
                  <button type="button" className={s.sortchip} aria-label={`Sorted ${librarySort === 'NEWEST' ? 'newest first' : 'oldest first'}. Change the order`}
                    onClick={() => { setLibrarySort(order => (order === 'NEWEST' ? 'OLDEST' : 'NEWEST')); setListLimit(LIST_PAGE); }}>
                    <ArrowDownUp size={11} aria-hidden="true" />{librarySort === 'NEWEST' ? 'Newest first' : 'Oldest first'}
                  </button>
                </div>
              )}
              {shown.slice(0, listLimit).map(t => (
                <button className={s.trow} key={t.id} onClick={() => onOpenTitle?.(t)}>
                  <span className={cx(s.tposter, room.thumb, formatTone(t))}><TitleArt title={t} size="xs" /></span>
                  <div className={s.tinfo}>
                    <b>{t.title}</b>
                    <span className={cx(s.tmeta, room.metaLine)}>
                      <SourceBadge kind={t.kind} />{t.format} · {genreLabel(t.genre)}
                      {t.addedAt !== undefined && <span className={s.tadded}>added {gameWeekText(t.addedAt, state.now)}</span>}
                    </span>
                    <div className={s.tpills}>
                      <i className={cx(s.pill, statusClass(t.status))}>{t.status}</i>
                      {t.rights?.perpetual && <i className={cx(s.pill, s.own)}>KEPT FOR GOOD</i>}
                      {t.rights?.endsInWeeks !== undefined && (
                        <i className={cx(s.pill, s.win, (t.rights.endsInWeeks <= 6 ? s.soon : ''))}>
                          {t.rights.endsInWeeks}w LEFT
                        </i>
                      )}
                      {t.kind === 'OWNED' && <i className={cx(s.pill, s.own)}>STUDIO IMPORT</i>}
                    </div>
                  </div>
                  <div className={s.tnums}>
                    {state.live && t.views !== undefined ? (
                      <>
                        <b>{countLabel(t.views)}</b><span>VIEWS</span>
                        <em className={s.tdone}><i style={{ width: `${t.completion ?? 0}%` }} />{t.completion ?? 0}% finish</em>
                      </>
                    ) : (
                      <><b className={s.pend}>—</b><span>PENDING</span></>
                    )}
                  </div>
                </button>
              ))}
              {shown.length > listLimit && (
                <button type="button" className={room.more} onClick={() => setListLimit(limit => limit + LIST_PAGE)}>
                  Load more <small>{Math.min(LIST_PAGE, shown.length - listLimit)} of {shown.length - listLimit} left</small>
                </button>
              )}
            </section>
          </>
        )}

        {/* ── RIGHTS — decisions first, then the runway, then what is kept ── */}
        {tab === 'RIGHTS' && (
          <>
            {decisions.length > 0 && (
              <section className={s.cdsec}>
                <div className={cx(s.cdhead, s.urgent)}><h2>Needs a decision</h2><span>{decisions.length} licence{decisions.length === 1 ? '' : 's'}</span></div>
                {visibleTitles('decisions', decisions).map(t => (
                  <RenewalCard key={t.id} title={t}
                    onDecide={onRenewalDecision ? decide : undefined}
                    onOpenCalendar={onOpenRightsCalendar ?? (onRenew ? () => onRenew(t) : undefined)}
                    onOpen={() => onOpenTitle?.(t)} />
                ))}
                {pagination('decisions', decisions.length)}
              </section>
            )}

            {handled.length > 0 && (
              <section className={s.cdsec}>
                <div className={s.cdhead}><h2>Handled by {handledBy}</h2><span>{handled.length} licence{handled.length === 1 ? '' : 's'} · last 4 weeks</span></div>
                {handled.map(t => (
                  <RenewalCard key={t.id} title={t}
                    onOpenCalendar={onOpenRightsCalendar ?? (onRenew ? () => onRenew(t) : undefined)}
                    onOpen={() => onOpenTitle?.(t)} />
                ))}
              </section>
            )}

            <section className={s.cdsec}>
              <div className={s.cdhead}><h2>Licence runway</h2><span>{windows.length ? 'the next 52 weeks' : 'no licence ends'}</span></div>
              {windows.length > 0
                ? <RightsRunway titles={visibleTitles('windows', windows)} onOpen={onOpenTitle} />
                : <div className={s.empty}>Every title on the service is yours to keep.</div>}
              {pagination('windows', windows.length)}
            </section>

            {kept.length > 0 && (
              <section className={s.cdsec}>
                <div className={s.cdhead}><h2>Kept for good</h2><span>{kept.length} title{kept.length === 1 ? '' : 's'} · no end date</span></div>
                <p className={room.keptNote}>Your Originals, your studio's own titles and licences bought for good. They never leave the service and never need renewing.</p>
                <KeptGrid titles={visibleTitles('kept', kept)} live={state.live} onOpen={onOpenTitle} />
                {pagination('kept', kept.length)}
              </section>
            )}

            {lapsed.length > 0 && (
              <section className={s.cdsec}>
                <div className={s.cdhead}><h2>Licence ended</h2><span>no longer on the service</span></div>
                {visibleTitles('lapsed', lapsed).map(t => (
                  <button className={s.trow} key={t.id} onClick={() => onOpenTitle?.(t)}>
                    <span className={s.tposter}><TitleArt title={t} size="xs" /></span>
                    <div className={s.tinfo}>
                      <b>{t.title}</b>
                      <span className={s.tmeta}>{t.format} · {t.genre}</span>
                      <div className={s.tpills}><i className={cx(s.pill, statusClass(t.status))}>{t.status}</i></div>
                    </div>
                  </button>
                ))}
                {pagination('lapsed', lapsed.length)}
                {onAddContent && <button type="button" className={room.link} onClick={openContent}>Look for new windows in the Content Market →</button>}
              </section>
            )}

            {/* Zeesh, 2026-11-09: what was bought, in which week, and how */}
            {history.length > 0 && (
              <section className={s.cdsec}>
                <div className={s.cdhead}><h2>Bought, week by week</h2><span>{history.length} deal{history.length === 1 ? '' : 's'} · newest first</span></div>
                {history.slice(0, historyLimit).map(entry => {
                  const title = titleById.get(entry.projectId);
                  return (
                    <button type="button" className={s.trow} key={entry.id} onClick={() => title && onOpenTitle?.(title)} disabled={!title}>
                      <span className={s.hweek}><b>{gameWeekLabel(entry.at).replace(/^Week /, 'W')}</b><i>{yearsAgo(entry.at, state.now)}</i></span>
                      <div className={s.tinfo}>
                        <b>{entry.title}</b>
                        <span className={s.tmeta}>{entry.how}{entry.kept ? ' · kept for good' : entry.weeks ? ` · ${entry.weeks} weeks` : ''}</span>
                      </div>
                      <div className={s.tnums}>
                        <b>{entry.paid > 0 ? moneyShort(entry.paid) : '—'}</b><span>{entry.paid > 0 ? 'PAID' : 'NO FEE'}</span>
                      </div>
                    </button>
                  );
                })}
                {history.length > historyLimit && (
                  <button type="button" className={room.more} onClick={() => setHistoryLimit(limit => limit + 12)}>
                    Load more <small>{Math.min(12, history.length - historyLimit)} of {history.length - historyLimit} left</small>
                  </button>
                )}
              </section>
            )}
          </>
        )}

        {/* ── SLATE — the release weeks ── */}
        {tab === 'SLATE' && (
          <section className={s.cdsec}>
            {/* once live the schedule is planned right here; the opening slate before launch keeps its planner */}
            <div className={s.cdhead}><h2>Release schedule</h2>{planning
              ? <span>a year ahead · tap a week</span>
              : onOpenSlate && <button className={s.cdadd} onClick={onOpenSlate}>OPEN SLATE PLANNER</button>}</div>
            {warnings.length > 0 && (
              <div className={s.warnlist}>
                {warnings.map(w => (
                  <div className={cx(s.warn, s[w.level])} key={w.id}>
                    <i />{w.text}
                  </div>
                ))}
              </div>
            )}
            {planning
              ? <SlatePlanner slate={state.slate} titles={state.titles} scheduleFrom={state.scheduleFrom} autoFill={state.autoFill} autoFillFresh={state.autoFillFresh}
                  onSchedule={onScheduleTitle} onUnschedule={onUnscheduleTitle} onAutoFill={onAutoFillSlate} onClearPlans={onClearSlatePlans} onOpen={onOpenTitle} />
              : <SlateCalendar slate={state.slate} posters={titleById} />}
          </section>
        )}

        {/* ── LOCALIZATION — the week's language figures, the lab, the regions ── */}
        {tab === 'LOCALIZATION' && (
          localizationDesk
            ? <LocalizationDesk desk={localizationDesk} posters={titleById} onFeedback={setFeedback} {...localizationActions} />
            : <p className={s.empty}>Languages open once the service has a company behind it.</p>
        )}

        <div className={s.cdfoot} />
      </div>

      {showEntryRoutes ? (
        <div className={s.entryBackdrop} onClick={() => setShowEntryRoutes(false)}>
          <section
            className={s.entrySheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-entry-title"
            onClick={event => event.stopPropagation()}
          >
            <div className={s.entryHandle} />
            <header className={s.entryHead}>
              <div>
                <span>CONTENT DESK</span>
                <h2 id="content-entry-title">Add content</h2>
                <p>Choose how this title enters your service.</p>
              </div>
              <button type="button" onClick={() => setShowEntryRoutes(false)} aria-label="Close content routes"><X size={20} /></button>
            </header>

            <div className={s.entryList}>
              {entryRoutes.map(route => {
                const Icon = ENTRY_ICON[route.id];
                return (
                  <button
                    type="button"
                    key={route.id}
                    className={route.disabled ? s.entryDisabled : ''}
                    disabled={route.disabled}
                    onClick={() => {
                      setShowEntryRoutes(false);
                      route.onSelect?.();
                    }}
                  >
                    <span className={s.entryIcon}><Icon size={20} /></span>
                    <span className={s.entryCopy}>
                      <small>{route.eyebrow}</small>
                      <strong>{route.title}</strong>
                      <em>{route.description}</em>
                    </span>
                    <span className={s.entryState}>{route.status}</span>
                    {route.disabled ? <LockKeyhole className={s.entryArrow} size={16} /> : <ChevronRight className={s.entryArrow} size={17} />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/ContentDesk/ContentDesk.module.css */
