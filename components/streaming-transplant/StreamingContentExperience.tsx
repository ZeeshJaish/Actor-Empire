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
 *   LOCALIZATION → the platform's subtitle and dubbing tiers and its
 *                  language networks
 */
import s from './presentation/screens/ContentDesk/ContentDesk.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ChevronRight, Film, LibraryBig, LockKeyhole, Sparkles, X } from 'lucide-react';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';
import room from './presentation/screens/ContentDesk/ContentRoom.module.css';
import {
  CatalogueMix, KeptGrid, LevelRing, PosterRail, RenewalCard, RightsRunway, SlateCalendar, Spotlight, TitleArt,
  count as countLabel, type RenewalAction,
} from './ContentPanels';
import type { CustomPoster } from '../../types';

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
}

export interface CatalogueTitle {
  id: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED' | 'OWNED';
  format: string;                 // "Film" | "Series"
  genre: string;
  status: 'LIVE' | 'STAGED' | 'IN PRODUCTION' | 'READY TO SCHEDULE' | 'SCHEDULED' | 'AWAITING AVAILABILITY' | 'RIGHTS EXPIRED' | 'RIGHTS UNAVAILABLE';
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
}

export interface SlateWeek { week: number; label?: string; now?: boolean; releases: SlateRelease[] }

export interface ContentDeskState {
  live: boolean;
  titles: CatalogueTitle[];
  slate: SlateWeek[];
  /** PROGRAMME: weeks counted from opening night (before launch) · WEEKS: the calendar */
  calendar?: 'PROGRAMME' | 'WEEKS';
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
const money = (n: number) => n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B`
  : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
    : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`;
const count = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
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

  // a run of empty weeks bleeds subscribers
  let gap = 0, worst = 0, worstAt: SlateWeek | null = null, runStart: SlateWeek | null = null;
  slate.forEach(w => {
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

  // an Original with only a lean campaign behind it
  slate.forEach(w => w.releases.forEach(r => {
    if (r.kind === 'ORIGINAL' && r.marketing === 'LEAN') out.push({
      id: `mkt-${r.id}`, level: 'watch',
      text: `${r.title} premieres ${w.label?.toLowerCase() ?? `week ${w.week}`} with only a lean campaign behind it`,
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
  /** Opens the rights calendar (Rights Exchange, Calendar tab). */
  onOpenRightsCalendar?: () => void;
  localization?: {
    subtitleLevel: number;
    dubbingLevel: number;
    simultaneousLocalization: boolean;
    coveredTitleCount: number;
    activeLanguageCount: number;
    packages: Array<{
      id: string;
      name: string;
      languages: string[];
      active: boolean;
      locked: boolean;
      activationCost: number;
    }>;
  };
  onOpenLocalization?: () => void;
  /** Returns what happened, so a refusal is shown instead of swallowed. */
  onActivateLanguagePackage?: (packageId: string) => { ok: boolean; message: string } | void;
}> = ({ brand, state, onBack, initialTab, onOpenTitle, entryRoutes = [], onAddContent, onOpenSlate, onRenew, onRenewalDecision, onOpenRightsCalendar, localization, onOpenLocalization, onActivateLanguagePackage }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'LIBRARY');
  const [filter, setFilter] = useState<'ALL' | 'ORIGINAL' | 'LICENSED' | 'OWNED' | 'EXPIRING'>('ALL');
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
  /* a decision is due: a licence in its last six weeks, or open renewal talks */
  const decisions = useMemo(() => windows.filter(t => t.rights!.endsInWeeks! <= 6
    || (t.renewal?.pending && ['OFFER', 'DECIDE', 'TALKS'].includes(t.renewal.stage))), [windows]);
  const kept = useMemo(() => state.titles.filter(t => (t.rightsState ?? (t.rights ? 'WINDOW' : 'KEPT')) === 'KEPT'), [state.titles]);
  const lapsed = useMemo(() => state.titles.filter(t => t.rightsState === 'LAPSED'), [state.titles]);
  const warnings = useMemo(() => slateWarnings(state.slate, state.titles), [state.slate, state.titles]);
  const byViews = useMemo(() => [...state.titles].sort((a, b) => (b.views ?? -1) - (a.views ?? -1)), [state.titles]);
  const titleById = useMemo(() => new Map(state.titles.map(t => [t.id, t])), [state.titles]);

  const shown = useMemo(() => state.titles.filter(t =>
    filter === 'ALL' ? true
      : filter === 'EXPIRING' ? t.rights?.endsInWeeks !== undefined && t.rights.endsInWeeks <= 6
        : t.kind === filter), [state.titles, filter]);

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
  const activate = (packageId: string) => {
    const result = onActivateLanguagePackage?.(packageId);
    if (result) setFeedback(result);
  };
  const statusClass = (status: CatalogueTitle['status']) => s[status.replace(/\s/g, '').toLowerCase()];

  return (
    <div className={s.cd} data-epx-root style={brandVars(brand)}>
      <div className={s.cdtop}>
        <button className={s.cdback} onClick={onBack} aria-label="Back">←</button>
        <div className={s.cdtitle}>
          <b>CONTENT DESK</b>
          <span>LIBRARY · RIGHTS · SLATE · LANGUAGES</span>
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
                  <button key={f} className={filter === f ? s.on : ''} onClick={() => setFilter(f)}>
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

              {visibleTitles('library', shown).map(t => (
                <button className={s.trow} key={t.id} onClick={() => onOpenTitle?.(t)}>
                  <span className={s.tposter}><TitleArt title={t} size="xs" /></span>
                  <div className={s.tinfo}>
                    <b>{t.title}</b>
                    <span className={s.tmeta}>
                      {t.kind === 'ORIGINAL' ? 'Original' : t.kind === 'OWNED' ? 'Studio import' : 'Licensed'} · {t.format} · {t.genre}
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
              {pagination('library', shown.length)}
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

            <section className={s.cdsec}>
              <div className={s.cdhead}><h2>Licence runway</h2><span>{windows.length ? 'the next 52 weeks' : 'no licence ends'}</span></div>
              {windows.length > 0
                ? <RightsRunway titles={visibleTitles('windows', windows)} onOpen={onOpenTitle} />
                : <div className={s.empty}>Every title on the service is yours to keep.</div>}
              {pagination('windows', windows.length)}
            </section>

            {kept.length > 0 && (
              <section className={s.cdsec}>
                <div className={s.cdhead}><h2>Kept for good</h2><span>no end date</span></div>
                <KeptGrid titles={visibleTitles('kept', kept)} onOpen={onOpenTitle} />
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
          </>
        )}

        {/* ── SLATE — the release weeks ── */}
        {tab === 'SLATE' && (
          <section className={s.cdsec}>
            <div className={s.cdhead}><h2>Release schedule</h2>{onOpenSlate && <button className={s.cdadd} onClick={onOpenSlate}>OPEN SLATE PLANNER</button>}</div>
            {warnings.length > 0 && (
              <div className={s.warnlist}>
                {warnings.map(w => (
                  <div className={cx(s.warn, s[w.level])} key={w.id}>
                    <i />{w.text}
                  </div>
                ))}
              </div>
            )}
            <SlateCalendar slate={state.slate} posters={titleById} />
          </section>
        )}

        {/* ── LOCALIZATION — tiers as rings, networks as cards ── */}
        {tab === 'LOCALIZATION' && (
          <section className={s.cdsec}>
            <div className={s.cdhead}><h2>Languages</h2><span>one system, every title</span></div>
            <div className={room.levels}>
              <LevelRing label="SUBTITLES" name="Subtitle quality" level={localization?.subtitleLevel || 0} />
              <LevelRing label="DUBBING" name="Dubbing quality" level={localization?.dubbingLevel || 0} />
              <div className={cx(s.langStat)}>
                <b>{localization?.activeLanguageCount || 0}</b>
                <span>ACTIVE LANGUAGES</span>
                <em className={localization?.simultaneousLocalization ? s.isReady : ''}>{localization?.simultaneousLocalization ? 'Day-one releases in every language' : 'Day-one releases locked'}</em>
              </div>
            </div>
            <p className={s.localizationRule}>Research raises the tiers once, for the whole platform: every current and future title — {localization?.coveredTitleCount || state.titles.length} today — inherits them in each active language network.</p>
            <div className={s.cdhead} style={{ marginTop: 16 }}><h2>Language networks</h2><span>{(localization?.packages || []).filter(item => item.active).length} active</span></div>
            <div className={s.localizationPackages}>
              {(localization?.packages || []).map(item => (
                <article key={item.id} className={item.active ? s.isActive : item.locked ? s.isLocked : ''}>
                  <div>
                    <span>{item.active ? 'OPERATING' : item.locked ? 'NEEDS LOCALIZATION FOUNDATION' : 'READY TO OPEN'}</span>
                    <b>{item.name}</b>
                    <div className={room.langChips}>{item.languages.map(language => <i key={language}>{language}</i>)}</div>
                  </div>
                  {item.active || item.locked ? (
                    <strong>{item.active ? 'ACTIVE' : 'LOCKED'}</strong>
                  ) : (
                    <button type="button" onClick={() => activate(item.id)}>
                      ACTIVATE<br /><strong>{money(item.activationCost)}</strong>
                    </button>
                  )}
                </article>
              ))}
            </div>
            <button type="button" className={s.localizationAction} onClick={onOpenLocalization}>OPEN RESEARCH CAMPUS →</button>
          </section>
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
