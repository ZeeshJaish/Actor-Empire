/**
 * EMPIRE+ v2 — PLATFORM HQ
 *
 * The screen the player returns to every week, so it is a status-and-entry
 * surface, not a ceremony: numbers → what is in flight → what is on the service
 * → the operations you can walk into. No weekly prompt lives here; the main
 * game owns week advancement and random events.
 *
 * It deliberately borrows the production-house format the player already knows
 * (hero numbers, scrollable stat strip, card rows, a divisions grid) so nothing
 * has to be taught.
 */
import css from './presentation/screens/CommandDesk/CommandDesk.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useMemo, useState } from 'react';
import { Brand, Mark, RegionId, typeFace } from './StreamingBrandVisuals';
import type {
  StreamingLaunchDestination,
  StreamingLaunchProgramView,
  StreamingLaunchTrackId,
} from '../../services/streamingLaunchProgram';

/* ============================================================
   MODEL
   ============================================================ */

export type SlateStage =
  | 'COMMISSIONED' | 'IN PRODUCTION' | 'DELIVERED' | 'SCHEDULED'
  | 'NEGOTIATING' | 'SIGNED';

export interface SlateItem {
  id: string;
  title: string;
  kind: 'ORIGINAL' | 'LICENSED';
  stage: SlateStage;
  /** 0-1, how far through the current stage */
  progress: number;
  budget?: number;
  releaseWeek?: number;
  hue: number;
}

export type ServiceStatus = 'TOP 10' | 'RISING' | 'STEADY' | 'FADING';

export interface ServiceTitle {
  id: string;
  title: string;
  kind: string;              // "Original · Film", "Licensed · Series"
  status: ServiceStatus;
  rating: number;            // 0-10
  views: number;             // lifetime views
  completion: number;        // 0-100
  /** licensed titles only — weeks until the window closes */
  expiresIn?: number;
  hue: number;
}

export type DivisionId = 'CONTENT' | 'PLATFORM' | 'AUDIENCE' | 'BOARDROOM';
export type Pressure = 'calm' | 'watch' | 'urgent';

/** A card's table of contents. Text only, one line, in the division's own
 *  colour — the card must still read perfectly with these ignored. */
export interface DivisionChip { id: string; label: string; alert?: boolean }

export interface Division {
  id: DivisionId;
  label: string;
  sub: string;
  statLabel: string;
  stat: string;
  pressure: Pressure;
  /** why the light is on — shown only when it is not calm */
  note?: string;
  chips?: DivisionChip[];
}

/* ── one slot for anything time-sensitive ──────────────────
   Before this there were two bars — a launch prompt and a red division alert —
   with separate code and the same job. Every future moment (a crisis, an
   auction closing, awards, a quarter review, the IPO window) would have grown
   a third and a fourth. One slot, ranked, and nothing at all when the company
   is having a quiet week.                                                    */
export type EventTone = 'brand' | 'urgent' | 'warn' | 'calm';
export interface HqEvent {
  id: string;
  /** lower sorts first; crisis outranks everything */
  priority: number;
  label: string;
  line: string;
  tone: EventTone;
  /** shown right-aligned: a countdown, a count, a time to resolution */
  meta?: string;
  /** true for the one moment the whole desk is currently about */
  hero?: boolean;
}

export interface HqStat { id: string; label: string; value: string; tone?: 'good' | 'bad' | 'pending' }

export interface HqState {
  live: boolean;                   // false until opening night has been played
  /** true once the halls are commissioned but the service has not opened */
  built?: boolean;
  tier: string;                    // REGIONAL / NATIONAL / …
  territories: number;
  reachLevel: number;
  subscribers: number;
  subsDelta: number;
  treasury: number;
  /** pre-launch only */
  readiness?: { done: number; total: number };
  nowPlaying?: { title: string; watching: number };
  stats: HqStat[];
  slate: SlateItem[];
  service: ServiceTitle[];
  divisions: Division[];
  /** anything time-sensitive; the desk shows the most urgent one and no more */
  events?: HqEvent[];
  /** Canonical pre-launch campaign. It guides the desk without replacing it. */
  launchProgram?: StreamingLaunchProgramView;
}

/* ============================================================
   FORMATTING
   ============================================================ */
const money = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${n}`;
};
const count = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
};
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${count(Math.abs(n))}`;

const DIV_ICON: Record<DivisionId, React.ReactNode> = {
  CONTENT: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 4v16" />
    </svg>
  ),
  PLATFORM: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="6" rx="1.6" /><rect x="3" y="14" width="18" height="6" rx="1.6" />
      <path d="M7 7h.01M7 17h.01" strokeLinecap="round" />
    </svg>
  ),
  AUDIENCE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18" />
    </svg>
  ),
  BOARDROOM: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 10 12 4l9 6" strokeLinejoin="round" /><path d="M5 10v9M19 10v9M9 19v-5h6v5M3 19h18" />
    </svg>
  ),
};

/* ============================================================
   THE SCREEN
   ============================================================ */
export const PlatformHQ: React.FC<{
  brand: Brand;
  state: HqState;
  onBack?: () => void;
  onCommission?: () => void;
  onOpenDivision?: (d: DivisionId, chip?: string) => void;
  onEvent?: (e: HqEvent) => void;
  onOpenViewer?: () => void;
  /** the treasury is a door, not a readout — see the note at its render site */
  onOpenFinance?: () => void;
  onOpenTitle?: (t: ServiceTitle) => void;
  onSeeAll?: () => void;
  onLaunch?: () => void;
  onOpenLaunchTrack?: (track: StreamingLaunchTrackId) => void;
  onOpenLaunchDestination?: (destination: StreamingLaunchDestination) => void;
}> = ({ brand, state, onBack, onCommission, onOpenDivision, onEvent, onOpenViewer, onOpenFinance, onOpenTitle, onSeeAll, onOpenLaunchTrack }) => {
  const tf = typeFace(brand);
  const [pulse, setPulse] = useState(0);

  /* one event wins the slot; ties break on declaration order */
  const event = useMemo(
    () => [...(state.events ?? [])].sort((a, b) => a.priority - b.priority)[0],
    [state.events]);
  /* how many divisions want something from you, counted rather than typed */
  const needing = useMemo(
    () => state.divisions.filter(d => d.pressure !== 'calm').length,
    [state.divisions]);

  return (
    <div className={css.hq} data-epx-root style={brandVars(brand)}>
      <div className={css.hqscroll}>

        {/* ── header ── */}
        <header className={css.hqhead}>
          <div className={css.hqtop}>
            {onBack && <button className={css.hqback} onClick={onBack} aria-label="Back">←</button>}
            <div className={css.hqname}>
              <h1 style={{ fontFamily: tf.stack, fontWeight: tf.weight, letterSpacing: tf.spacing }}>
                {brand.name || 'UNNAMED'}
              </h1>
              <span className={css.tier}>{state.live ? state.tier : 'PRE-LAUNCH'}</span>
            </div>
          </div>
          <div className={css.hqwhere}>
            <i className={css.pin} />
            {state.live
              ? `${state.territories} territor${state.territories === 1 ? 'y' : 'ies'} · Level ${state.reachLevel}`
              : 'Founder headquarters · the service is under construction'}
          </div>

          <div className={css.hqheroes}>
            <div className={cx(css.hero, css.big)}>
              <span className={css.hlabel}>{state.live ? 'SUBSCRIBERS' : 'LAUNCH READINESS'}</span>
              {state.live ? (
                <>
                  <b className={css.hval}>{count(state.subscribers)}</b>
                  <em className={cx(css.hdelta, (state.subsDelta >= 0 ? '' : css.down))}>
                    {signed(state.subsDelta)} this week
                  </em>
                </>
              ) : (
                <>
                  <b className={css.hval}>{state.readiness?.done ?? 0}<i className={css.of}>/{state.readiness?.total ?? 9}</i></b>
                  <em className={css.hdelta}>checks cleared</em>
                </>
              )}
            </div>
            {/* Money was the hardest thing in the game to find: the only way to
                fund the company was a button that appeared on the Build screen
                once you were ALREADY over budget, or a chip three taps into the
                Boardroom. The number you look at every week is now the door. */}
            {onOpenFinance ? (
              <button type="button" className={cx(css.hero, css.heroTap)} onClick={onOpenFinance}
                aria-label={`Treasury ${money(state.treasury)}. Open financing.`}>
                <span className={css.hlabel}>TREASURY</span>
                <b className={cx(css.hval, css.green)}>{money(state.treasury)}</b>
              </button>
            ) : (
              <div className={css.hero}>
                <span className={css.hlabel}>TREASURY</span>
                <b className={cx(css.hval, css.green)}>{money(state.treasury)}</b>
              </div>
            )}
          </div>

          {/* the one thing a production house cannot show: the service, running */}
          {state.live && state.nowPlaying && (
            <button className={css.nowbar} onClick={onOpenViewer}>
              <span className={css.nowframe}>
                <i className={css.nowart} />
                <i className={css.nowplay} />
              </span>
              <div className={css.nowtxt}>
                <span>MOST WATCHED RIGHT NOW</span>
                <b>{state.nowPlaying.title}</b>
              </div>
              <em>{count(state.nowPlaying.watching)} watching</em>
            </button>
          )}

          {/* ── the event slot: at most one, highest priority, or nothing ── */}
          {event && (state.live || !state.launchProgram) && (
            <button className={cx(css.eventbar, css[event.tone], (event.hero ? css.hero : ''))}
              onClick={() => onEvent?.(event)}>
              <span className={css.evdot} />
              <div className={css.evtxt}>
                <b>{event.label}</b>
                <span>{event.line}</span>
              </div>
              {event.meta && <em className={css.evmeta}>{event.meta}</em>}
              <i className={css.chev}>›</i>
            </button>
          )}

          {!state.live && state.launchProgram && (
            <nav className={css.launchCommandRows} aria-label="Pre-launch wizards">
              {state.launchProgram.tracks.map(track => {
                const next = track.milestones.find(item => !item.complete);
                const cleared = track.completedCount === track.totalCount;
                return (
                  <button
                    type="button"
                    key={track.id}
                    className={cx(css.launchCommandRow, track.id === 'BUILD_PLATFORM' ? css.buildCommandRow : '', cleared ? css.commandCleared : '')}
                    onClick={() => onOpenLaunchTrack?.(track.id)}
                    aria-label={`${track.label}. ${track.completedCount} of ${track.totalCount} checks cleared.${next ? ` Next: ${next.shortLabel}.` : ''}`}
                  >
                    <span className={css.commandSignal} aria-hidden="true"><i /></span>
                    <span className={css.commandCopy}>
                      <small>{track.id === 'DEFINE_LAUNCH' ? 'LAUNCH COMMAND' : 'BUILD COMMAND'}</small>
                      <b>{track.label}</b>
                      <em>{next ? `Next · ${next.shortLabel}` : 'Wizard cleared'}</em>
                    </span>
                    <strong>{track.completedCount}/{track.totalCount}</strong>
                    <i className={css.commandChevron} aria-hidden="true">›</i>
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {/* ── scrollable stat strip ── */}
        {state.live && <div className={css.statstrip}>
          {state.stats.map(s => (
            <div className={css.stat} key={s.id}>
              <span>{s.label}</span>
              <b className={s.tone ? css[s.tone] ?? '' : ''}>{s.value}</b>
            </div>
          ))}
        </div>}

        {/* ── row 1 · the slate ── */}
        {state.live && <section className={css.hqsec}>
          <div className={css.sechead}><h2>The Slate</h2></div>
          <div className={css.rail}>
            <button className={cx(css.card, css.newcard)} onClick={onCommission}>
              <span className={css.plus}>+</span>
              <b>COMMISSION<br />ORIGINAL</b>
            </button>
            {state.slate.map(s => (
              <div className={cx(css.card, css.slatecard)} key={s.id}
                style={{ ['--epx-hq-h' as string]: `${s.hue}` }}>
                <span className={cx(css.stagechip, (s.kind === 'LICENSED' ? css.lic : ''))}>{s.stage}</span>
                <span className={css.ghost} style={{ fontFamily: tf.stack }}>{s.title}</span>
                <div className={css.cardfoot}>
                  <b className={css.ctitle}>{s.title}</b>
                  <div className={css.cmeta}>
                    <div><span>{s.kind === 'ORIGINAL' ? 'BUDGET' : 'RIGHTS'}</span><em>{s.budget ? money(s.budget) : '—'}</em></div>
                    <div className={css.right}><span>RELEASE</span><em>{s.releaseWeek ? `WK ${s.releaseWeek}` : 'TBD'}</em></div>
                  </div>
                  <div className={css.cbar}><i style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>}

        {/* ── row 2 · what is live and still earning ── */}
        {state.live && <section className={css.hqsec}>
          <div className={css.sechead}>
            <h2>{state.live ? 'On the Service' : 'Staged Catalogue'}</h2>
            <button className={css.seemore} onClick={onSeeAll}>SEE MORE <i>›</i></button>
          </div>
          <div className={css.rail}>
            {state.service.map(t => (
              <button className={cx(css.card, css.servicecard)} key={t.id}
                style={{ ['--epx-hq-h' as string]: `${t.hue}` }}
                onClick={() => onOpenTitle?.(t)}>
                <span className={cx(css.statuschip, css[state.live ? t.status.replace(/\s/g, '').toLowerCase() : 'staged'])}>
                  {state.live ? t.status : 'STAGED'}
                </span>
                <span className={css.ratechip}>★ {t.rating.toFixed(1)}</span>
                <span className={css.ghost} style={{ fontFamily: tf.stack }}>{t.title}</span>
                <div className={css.cardfoot}>
                  <b className={css.ctitle}>{t.title}</b>
                  <span className={css.ckind}>{t.kind}</span>
                  {/* no viewing figures can exist before launch — say so rather than invent them */}
                  <div className={css.cmeta}>
                    {state.live ? (
                      <>
                        <div><span>VIEWS</span><em>{count(t.views)}</em></div>
                        <div className={css.right}><span>COMPLETION</span><em className={css.good}>{t.completion}%</em></div>
                      </>
                    ) : (
                      <>
                        <div><span>VIEWS</span><em className={css.pend}>PENDING</em></div>
                        <div className={css.right}><span>STATUS</span><em>READY</em></div>
                      </>
                    )}
                  </div>
                  {/* the slot is always rendered so every card's footer aligns */}
                  <div className={cx(css.expiry, (t.expiresIn === undefined ? ' owned' : t.expiresIn <= 4 ? css.soon : ''))}>
                    {t.expiresIn === undefined
                      ? 'OWNED IN PERPETUITY'
                      : `EXPIRES IN ${t.expiresIn} WEEK${t.expiresIn === 1 ? '' : 'S'}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>}

        {/* ── row 3 · the operations console ── */}
        <section className={cx(css.hqsec, css.console)}>
          <span className={css.kicker}>{state.live ? 'PLATFORM CONTROL CONSOLE' : 'PRE-LAUNCH HEADQUARTERS'}</span>
          <div className={css.consolehead}>
            <h2 className={css.bighead}>{state.live ? 'OPERATIONS' : 'FOUR OPERATIONS'}</h2>
            {needing > 0 && <span className={css.needing}>{needing} NEED YOU</span>}
          </div>

          {!state.live && <p className={css.consoleBrief}>Every room owns one part of the opening. Enter a room when its light calls for you.</p>}

          {/* not a division — the same company seen from the outside */}
          {state.live && <button className={css.viewerstrip} onClick={onOpenViewer}>
            <span className={css.vsicon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="2" y="4" width="20" height="13" rx="2.2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" />
              </svg>
            </span>
            <div className={css.vstxt}>
              <b>SEE IT AS THEY DO</b>
              <span>Viewer mode · phone, web, TV</span>
            </div>
            <i className={css.chev}>›</i>
          </button>}

          <div className={css.consolebox}>
            <div className={css.divgrid}>
              {state.divisions.map(d => (
                <div key={d.id} className={cx(css.divwrap, css[d.id.toLowerCase()])}>
                <button className={cx(css.divcard, css[d.id.toLowerCase()], css[d.pressure])}
                  onClick={() => { setPulse(p => p + 1); onOpenDivision?.(d.id); }}>
                  <i className={cx(css.plight, css[d.pressure])} />
                  <span className={css.divicon}>{DIV_ICON[d.id]}</span>
                  <div className={css.divtxt}>
                    <b>{d.label}</b>
                    <span className={css.divsub}>{d.sub}</span>
                    <span className={css.divstatlabel}>{d.statLabel}</span>
                    <em className={css.divstat}>{d.stat}</em>
                  </div>
                  <i className={css.chev}>›</i>
                </button>
                {d.chips && d.chips.length > 0 && (
                  <div className={css.chiprail}>
                    {d.chips.map(ch => (
                      <button key={ch.id} className={cx(css.chip, (ch.alert ? css.alert : ''))}
                        onClick={() => onOpenDivision?.(d.id, ch.id)}>
                        {ch.label}{ch.alert && <i className={css.chipdot} />}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              ))}
            </div>

          </div>
        </section>

        <div className={css.hqfootspace} />
      </div>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/CommandDesk/CommandDesk.module.css */
