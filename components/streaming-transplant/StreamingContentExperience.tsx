/**
 * EMPIRE+ v2 — CONTENT DESK
 *
 * The permanent content-business headquarters. Everything here borrows an interface the player has
 * already used, so none of it needs teaching:
 *   LIBRARY  → a creator-dashboard content list (YouTube Studio / App Store Connect)
 *   RIGHTS   → the phone's subscription manager, with renewal countdowns
 *   SLATE    → a release calendar
 *
 * The HQ's red pressure light points here, so the thing it was shouting about
 * is the first thing on screen.
 */
import s from './presentation/screens/ContentDesk/ContentDesk.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useMemo, useState } from 'react';
import { Archive, ChevronRight, Film, LibraryBig, LockKeyhole, Sparkles, X } from 'lucide-react';
import { Brand, Mark, brandColor, brandDeep, typeFace } from './StreamingBrandVisuals';

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
}

export interface SlateRelease {
  id: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED';
  marketing: 'NONE' | 'LIGHT' | 'HEAVY';
  hue: number;
  /** set when the licence lapses before the release date — a real blocker */
  rightsRisk?: boolean;
}

export interface SlateWeek { week: number; releases: SlateRelease[] }

export interface ContentDeskState {
  live: boolean;
  titles: CatalogueTitle[];
  slate: SlateWeek[];
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
  let gap = 0, worst = 0, worstAt = 0;
  slate.forEach(w => {
    if (w.releases.length === 0) { gap++; if (gap > worst) { worst = gap; worstAt = w.week - gap + 1; } }
    else gap = 0;
  });
  if (worst >= 3) out.push({
    id: 'gap', level: 'urgent',
    text: `${worst} silent weeks from WK ${worstAt} — nothing new to open the app for`,
  });

  // a licence that lapses before its own release date
  slate.forEach(w => w.releases.forEach(r => {
    if (r.rightsRisk) out.push({
      id: `risk-${r.id}`, level: 'urgent',
      text: `${r.title} is scheduled for WK ${w.week} but its licence lapses first`,
    });
  }));

  // an Original with no marketing behind it
  slate.forEach(w => w.releases.forEach(r => {
    if (r.kind === 'ORIGINAL' && r.marketing === 'NONE') out.push({
      id: `mkt-${r.id}`, level: 'watch',
      text: `${r.title} premieres WK ${w.week} with no campaign behind it`,
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
  onReviewCatalogue?: () => void;
  onOpenSlate?: () => void;
  onRenew?: (t: CatalogueTitle) => void;
  onLapse?: (t: CatalogueTitle) => void;
  localization?: { providers: number; facilities: number; planned: number; inProgress: number; ready: number; assets: number };
  onOpenLocalization?: () => void;
}> = ({ brand, state, onBack, initialTab, onOpenTitle, entryRoutes = [], onAddContent, onReviewCatalogue, onOpenSlate, onRenew, onLapse, localization, onOpenLocalization }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const tf = typeFace(brand);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'LIBRARY');
  const [filter, setFilter] = useState<'ALL' | 'ORIGINAL' | 'LICENSED' | 'OWNED' | 'EXPIRING'>('ALL');
  const [showEntryRoutes, setShowEntryRoutes] = useState(false);

  const licensed = useMemo(() => state.titles.filter(t => t.rights), [state.titles]);
  const expiring = useMemo(
    () => licensed
      .filter(t => t.rights!.endsInWeeks !== undefined && t.rights!.endsInWeeks! <= 6)
      .sort((a, b) => a.rights!.endsInWeeks! - b.rights!.endsInWeeks!),
    [licensed],
  );
  const warnings = useMemo(() => slateWarnings(state.slate, state.titles), [state.slate, state.titles]);

  const shown = useMemo(() => state.titles.filter(t =>
    filter === 'ALL' ? true
      : filter === 'EXPIRING' ? t.rights?.endsInWeeks !== undefined && t.rights.endsInWeeks <= 6
        : t.kind === filter), [state.titles, filter]);

  const counts = {
    titles: state.titles.length,
    originals: state.titles.filter(t => t.kind === 'ORIGINAL').length,
    licensed: licensed.length,
    expiring: expiring.length,
  };

  return (
    <div className={s.cd} data-epx-root style={brandVars(brand)}>
      <div className={s.cdtop}>
        <button className={s.cdback} onClick={onBack} aria-label="Back">←</button>
        <div className={s.cdtitle}>
          <b>CONTENT DESK</b>
          <span>CATALOGUE · ORIGINALS · RIGHTS · MORE</span>
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
          <button key={t} className={tab === t ? s.on : ''} onClick={() => setTab(t)}>
            {t}
            {t === 'RIGHTS' && counts.expiring > 0 && <i className={s.tdot} />}
            {t === 'SLATE' && warnings.some(w => w.level === 'urgent') && <i className={s.tdot} />}
          </button>
        ))}
      </div>

      <div className={s.cdscroll}>

        {/* ── the thing the HQ light was shouting about, answered first ── */}
        {tab !== 'SLATE' && expiring.length > 0 && (
          <section className={s.cdsec}>
            <div className={cx(s.cdhead, s.urgent)}>
              <h2>Windows closing</h2>
              <span>{expiring.length} contract{expiring.length === 1 ? '' : 's'} need a decision</span>
            </div>
            {expiring.map(t => {
              const r = t.rights!;
              const left = r.endsInWeeks!;
              const total = r.windowWeeks ?? 104;
              const pct = Math.max(2, Math.min(100, (left / total) * 100));
              return (
                <div className={cx(s.rightrow, (left <= 3 ? s.critical : s.warning))} key={t.id}>
                  <div className={s.rrtop}>
                    <span className={s.rrart} style={{ ['--epx-cd-h' as string]: `${t.hue}` }} />
                    <div className={s.rrid}>
                      <b>{t.title}</b>
                      <span>{r.licensor} · {r.territory}{r.exclusive ? ' · EXCLUSIVE' : ''}</span>
                    </div>
                    <em className={left <= 3 ? s.crit : ''}>{left}w</em>
                  </div>
                  <div className={s.rrbar}><i style={{ width: `${pct}%` }} /></div>
                  <div className={s.rracts}>
                    <span className={s.rrcost}>Renewal {r.renewCost ? money(r.renewCost) : '—'}</span>
                    <button className={cx(s.rrbtn, s.ghost)} onClick={() => onLapse?.(t)}>LET LAPSE</button>
                    <button className={cx(s.rrbtn, s.go)} onClick={() => onRenew?.(t)}>RENEW</button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── LIBRARY — the creator-dashboard content list ── */}
        {tab === 'LIBRARY' && (
          <section className={s.cdsec}>
            <div className={s.cdhead}>
              <h2>Library</h2>
              <button className={s.cdadd} onClick={() => onAddContent ? onAddContent() : setShowEntryRoutes(true)}>+ ADD CONTENT</button>
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
                <button type="button" onClick={() => onAddContent ? onAddContent() : setShowEntryRoutes(true)}>ADD CONTENT <ChevronRight size={15} /></button>
              </div>
            ) : shown.length === 0 ? <div className={s.empty}>Nothing matches that filter.</div> : null}

            {shown.map(t => (
              <button className={s.trow} key={t.id} onClick={() => onOpenTitle?.(t)}>
                <span className={s.tart} style={{ ['--epx-cd-h' as string]: `${t.hue}` }}>
                  <i className={s.tghost} style={{ fontFamily: tf.stack }}>{t.title.slice(0, 2)}</i>
                </span>
                <div className={s.tinfo}>
                  <b>{t.title}</b>
                  <span className={s.tmeta}>
                    {t.kind === 'ORIGINAL' ? 'Original' : t.kind === 'OWNED' ? 'Studio import' : 'Licensed'} · {t.format} · {t.genre}
                  </span>
                  <div className={s.tpills}>
                    <i className={cx(s.pill, s[t.status.replace(/\s/g, '').toLowerCase()])}>{t.status}</i>
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
                      <b>{count(t.views)}</b><span>VIEWS</span>
                      <em>{t.completion}% done</em>
                    </>
                  ) : (
                    <><b className={s.pend}>—</b><span>PENDING</span></>
                  )}
                </div>
              </button>
            ))}
            {onReviewCatalogue && <button className={s.localizationAction} onClick={onReviewCatalogue}>Review catalogue coverage →</button>}
          </section>
        )}

        {/* ── RIGHTS — the subscription manager ── */}
        {tab === 'RIGHTS' && (
          <>
            <section className={s.cdsec}>
              <div className={s.cdhead}><h2>Active windows</h2><span>{licensed.length} contracts</span></div>
              {licensed.filter(t => (t.rights!.endsInWeeks ?? 999) > 6).map(t => {
                const r = t.rights!;
                const left = r.endsInWeeks;
                const total = r.windowWeeks ?? 104;
                return (
                  <div className={s.rightrow} key={t.id}>
                    <div className={s.rrtop}>
                      <span className={s.rrart} style={{ ['--epx-cd-h' as string]: `${t.hue}` }} />
                      <div className={s.rrid}>
                        <b>{t.title}</b>
                        <span>{r.licensor} · {r.territory}{r.exclusive ? ' · EXCLUSIVE' : ''}</span>
                      </div>
                      <em>{left === undefined ? '∞' : `${left}w`}</em>
                    </div>
                    {left !== undefined && (
                      <div className={s.rrbar}><i style={{ width: `${Math.min(100, (left / total) * 100)}%` }} /></div>
                    )}
                    <div className={s.rracts}>
                      <span className={s.rrcost}>
                        {left === undefined ? 'Owned in perpetuity' : `Renewal ${r.renewCost ? money(r.renewCost) : '—'}`}
                      </span>
                      {left !== undefined && <button className={cx(s.rrbtn, s.ghost)} onClick={() => onRenew?.(t)}>RENEW EARLY</button>}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className={s.cdsec}>
              <div className={s.cdhead}><h2>Owned outright</h2><span>no expiry</span></div>
              <div className={s.ownedgrid}>
                {state.titles.filter(t => !t.rights).map(t => (
                  <button className={s.ownedcard} key={t.id} style={{ ['--epx-cd-h' as string]: `${t.hue}` }}
                    onClick={() => onOpenTitle?.(t)}>
                    <b>{t.title}</b>
                    <span>{t.format} · {t.genre}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── SLATE — a release calendar ── */}
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

            <div className={s.cal}>
              {state.slate.map(w => (
                <div className={cx(s.calweek, (w.releases.length === 0 ? s.empty : ''))} key={w.week}>
                  <div className={s.calw}><span>WK</span><b>{w.week}</b></div>
                  <div className={s.calbody}>
                    {w.releases.length === 0
                      ? <div className={s.calnone}>No release</div>
                      : w.releases.map(r => (
                        <div className={cx(s.calrel, (r.rightsRisk ? s.risk : ''))} key={r.id}
                          style={{ ['--epx-cd-h' as string]: `${r.hue}` }}>
                          <b>{r.title}</b>
                          <div className={s.calpills}>
                            <i className={r.kind === 'ORIGINAL' ? s.orig : ''}>{r.kind}</i>
                            <i className={cx(s.mkt, s[r.marketing.toLowerCase()])}>{r.marketing} MKT</i>
                            {r.rightsRisk && <i className={s.riskpill}>RIGHTS LAPSE</i>}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'LOCALIZATION' && (
          <section className={s.cdsec}>
            <div className={s.cdhead}><h2>Language operations</h2><span>title by title</span></div>
            <div className={s.localizationHero}>
              <span>CONTENT CAPABILITY</span><strong>{localization?.assets || 0}</strong><h3>language assets ready</h3>
              <p>Subtitles and dubbing belong to individual titles. Build in-house facilities or contract providers as the company grows.</p>
            </div>
            <div className={s.localizationGrid}>
              <div><span>PROVIDERS</span><b>{localization?.providers || 0}</b></div><div><span>IN-HOUSE ROOMS</span><b>{localization?.facilities || 0}</b></div><div><span>IN PROGRESS</span><b>{localization?.inProgress || 0}</b></div><div><span>READY JOBS</span><b>{localization?.ready || 0}</b></div>
            </div>
            {(localization?.planned || 0) > 0 && <div className={s.localizationNotice}>{localization?.planned} planned language jobs still need a provider or facility.</div>}
            <button type="button" className={s.localizationAction} onClick={onOpenLocalization}>OPEN LANGUAGE CAPABILITIES →</button>
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
