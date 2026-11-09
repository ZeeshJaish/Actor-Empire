import css from './presentation/screens/Boardroom/Boardroom.module.css';
import room from './presentation/screens/Boardroom/BoardroomRoom.module.css';
import { cx } from './presentation/cx';
import React, { useCallback, useMemo, useState } from 'react';
import { Mark, brandColor, type Brand } from './StreamingBrandVisuals';
import type { StreamingTeamView } from '../../services/team/streamingTeam';
import { TeamBar, TeamSheets, TeamTab, type BoardroomTeamActions, type TeamSheet } from './BoardroomTeam';
import { BoardroomOwnership, type BoardroomOwnershipActions } from './BoardroomOwnership';
import { BoardSheet } from './BoardroomBoard';
import type { StreamingSaleView } from '../../services/streamingCompanySale';
import type { StreamingStepDownView } from '../../services/streamingStepDown';
import type { StreamingOwnershipView } from '../../services/streamingInvestorOffers';
import { BoardroomMarkets, type BoardroomMarketsActions } from './BoardroomMarkets';
import { BoardroomDeals } from './BoardroomDeals';
import type { StreamingListingDeskView } from '../../services/streamingListingDesk';
import type { StreamingCashSummary } from '../../services/streamingStudioFinance';
import type { Gender } from '../../types';
import { RoomSubtitle } from './RoomSubtitle';

export interface LedgerLine { id: string; label: string; amount: number; note?: string }

export interface Exec {
  id: string;
  role: string;
  name: string;
  loyalty: number;
  salary: number;
  unlocks: string;
  founder?: boolean;
}

export interface BoardSeat {
  id: string;
  holder?: string;
  votes?: number;
}

export interface Holder {
  id: string;
  name: string;
  pct: number;
  since: string;
  you?: boolean;
}

export interface IpoCheck { id: string; label: string; done: boolean; note?: string }
export interface SharePoint { label: string; value: number }

export interface BoardroomState {
  live: boolean;
  absoluteWeek?: number;
  /** #163: weeks since the company was founded */
  companyWeek?: number;
  companyYear?: number;
  treasury: number;
  treasuryDelta?: number;
  weeklyNetDelta?: number;
  weeklyRevenue: LedgerLine[];
  weeklyCosts: LedgerLine[];
  execs: Exec[];
  seats: BoardSeat[];
  holders: Holder[];
  listed: boolean;
  ipoChecks: IpoCheck[];
  share?: {
    ticker?: string;
    price: number;
    changePct: number;
    marketCap: number;
    history: SharePoint[];
  };
  successor?: { name: string; role: string } | null;
  legacyTitle?: string;
}

type LegacyTab = 'FINANCE' | 'THE TABLE' | 'OWNERSHIP' | 'MARKETS';
export type BoardroomTab = 'MONEY' | 'TABLE' | 'OWNERSHIP' | 'MARKETS' | 'DEALS';

interface Props {
  brand: Brand;
  founderName: string;
  state: BoardroomState;
  onBack: () => void;
  initialTab?: LegacyTab | BoardroomTab;
  onHire?: () => void;
  onIssueEquity?: () => void;
  onFileIpo?: () => void;
  onOpenLegacy?: () => void;
  onOpenFinance?: () => void;
  /** #209: your salary, a bonus, taking money out */
  onOpenTable?: () => void;
  onOpenOwnership?: () => void;
  /** Mergers & acquisitions (main's prop names); without it the DEALS tab is not shown. */
  onOpenAcquisitions?: () => void;
  acquisitionSummary?: string;
  /** #165: the team that runs jobs for the player; with it, THE TABLE is TEAM */
  team?: StreamingTeamView;
  teamActions?: BoardroomTeamActions;
  /** #166: the M&A tab shows "Coming in a future update"; #177: as THE DEAL ROOM, its rumours naming these rivals */
  mnaComingSoon?: boolean;
  mnaRivals?: string[];
  /** #166: the latest 12-week board review, on MONEY; #176: a card that opens nothing (the weekly brief is gone) */
  boardReview?: { latest: BoardroomReview | null; weeksUntilNext: number };
  /** #172: OWNERSHIP's cap table with faces, the term sheets on the table, and your bank */
  ownership?: StreamingOwnershipView;
  ownershipActions?: BoardroomOwnershipActions;
  /** #190: selling the company, on OWNERSHIP */
  sale?: StreamingSaleView | null;
  /** #191: stepping down, on TEAM */
  stepDown?: StreamingStepDownView | null;
  /** #173: MARKETS, the road to the bell and public life */
  listingDesk?: StreamingListingDeskView;
  listingActions?: BoardroomMarketsActions;
  /** #175: MONEY is the summary: the cash line, the pace and the one runway (the books are in Studio Finance) */
  cash?: StreamingCashSummary;
  /** #179: the founder's own picture, at the head of TEAM's table */
  founderAvatar?: string | null;
  founderGender?: Gender | null;
}

export interface BoardroomReview {
  quarter: number;
  tier: string;
  /** #176: the tier's id, for its colour */
  tierId?: 'BREAKOUT' | 'GROWING' | 'STEADY' | 'UNDER_PRESSURE';
  identity: string;
  headline: string;
  verdict: string;
  hits: string[];
  misses: string[];
  subscribersNet: number;
  revenue: number;
  cash: number;
}

const money = (value: number): string => {
  const absolute = Math.abs(value);
  const compact = absolute >= 1e9
    ? `$${(absolute / 1e9).toFixed(1).replace(/\.0$/, '')}B`
    : absolute >= 1e6
      ? `$${(absolute / 1e6).toFixed(1).replace(/\.0$/, '')}M`
      : absolute >= 1e3
        ? `$${Math.round(absolute / 1e3)}K`
        : `$${Math.round(absolute)}`;
  return value < 0 ? `−${compact}` : compact;
};
const signedMoney = (value: number): string => value > 0 ? `+${money(value)}` : money(value);
/* #176: members as the card reads them: +11.9M, −709K */
const signedCount = (value: number): string => {
  const absolute = Math.abs(value);
  const compact = absolute >= 1e6 ? `${(absolute / 1e6).toFixed(1).replace(/\.0$/, '')}M` : absolute >= 1e4 ? `${Math.round(absolute / 1e3)}K` : absolute.toLocaleString();
  return `${value < 0 ? '−' : '+'}${compact}`;
};
/* #176: the review's sentences carry long figures ("+1,527,079 net members"); the card reads them short */
const shortFigures = (line: string): string => line.replace(/(\d{1,3}(?:,\d{3})+)/g, figure => {
  const value = Number(figure.replace(/,/g, ''));
  return value >= 1e6 ? `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : value >= 1e4 ? `${Math.round(value / 1e3)}K` : figure;
});
const initials = (name: string) => name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();

/* #175: the treasury's last weekly closes as one line, its last point lit */
const CashLine = ({ closes, up }: { closes: number[]; up: boolean }) => {
  const min = Math.min(...closes);
  const span = Math.max(...closes) - min || Math.max(1, Math.abs(min));
  const x = (index: number) => (index / Math.max(1, closes.length - 1)) * 100;
  const y = (value: number) => 90 - ((value - min) / span) * 76;
  const points = closes.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
  return (
    <span className={cx(room.cashLine, up ? room.cashUp : room.cashDown)} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={`0,100 ${points} 100,100`} />
        <polyline points={points} />
      </svg>
      <i style={{ top: `${y(closes[closes.length - 1])}%` }} />
    </span>
  );
};
const LEGACY_TAB: Record<LegacyTab, BoardroomTab> = { FINANCE: 'MONEY', 'THE TABLE': 'TABLE', OWNERSHIP: 'OWNERSHIP', MARKETS: 'MARKETS' };
const TAB_LABELS: Record<BoardroomTab, string> = { MONEY: 'MONEY', TABLE: 'THE TABLE', OWNERSHIP: 'OWNERSHIP', MARKETS: 'MARKETS', DEALS: 'M&A' };

/* ============================================================================
   THE BOARDROOM — money, people and ownership, drawn rather than listed.

   It was a hub of text rows that threw most of BoardroomState away. This is
   the visual Boardroom recovered from 907e027 (its stylesheet,
   Boardroom.module.css, stayed in the repo, reviewed and unused), brought up
   to date: every tab ends in a door to the room where the work is done
   (Studio Finance, the leadership suite, capital, public markets, M&A;
   #176: the CEO brief is gone).

     MONEY      the pace or the runway and the cash line (#175); this week in
                one bar; the quarter's report card (#176)
     THE TABLE  the board around a table; leadership and loyalty; succession
     OWNERSHIP  the cap table as one bar; who holds what; who controls
     MARKETS    the share price, or the honest IPO checklist
     M&A        acquisition reviews (after opening)
   ========================================================================== */
export const Boardroom = ({
  brand, founderName, state, onBack, initialTab, onHire, onIssueEquity, onFileIpo, onOpenLegacy,
  onOpenFinance, onOpenTable, onOpenOwnership, onOpenAcquisitions, acquisitionSummary,
  team, teamActions, mnaComingSoon, mnaRivals, boardReview, ownership, ownershipActions, sale, stepDown, listingDesk, listingActions, cash,
  founderAvatar, founderGender,
}: Props) => {
  const [teamSheet, setTeamSheet] = useState<TeamSheet | null>(null);
  /* #217: the board's own sheet, over OWNERSHIP */
  const [boardOpen, setBoardOpen] = useState(false);
  const closeBoard = useCallback(() => setBoardOpen(false), []);
  const closeTeamSheet = useCallback(() => setTeamSheet(null), []);
  const hasTeam = Boolean(team && teamActions);
  const accent = brandColor(brand);
  const tabs: BoardroomTab[] = onOpenAcquisitions || mnaComingSoon ? ['MONEY', 'TABLE', 'OWNERSHIP', 'MARKETS', 'DEALS'] : ['MONEY', 'TABLE', 'OWNERSHIP', 'MARKETS'];
  const resolvedInitial = initialTab ? (initialTab in LEGACY_TAB ? LEGACY_TAB[initialTab as LegacyTab] : initialTab as BoardroomTab) : 'MONEY';
  const [tab, setTab] = useState<BoardroomTab>(tabs.includes(resolvedInitial) ? resolvedInitial : 'MONEY');

  const revenue = state.weeklyRevenue.reduce((sum, line) => sum + line.amount, 0);
  const costs = state.weeklyCosts.reduce((sum, line) => sum + line.amount, 0);
  const net = revenue - costs;
  /* runway only means something while the company loses money; #175: the same runway as Studio Finance (the last 4
     weeks' pace) when the host passes it */
  const runway = cash ? cash.runwayWeeks : net >= 0 ? null : Math.floor(state.treasury / Math.max(1, Math.abs(net)));
  const pace = cash ? cash.weeklyNet : net;
  const occupiedSeats = state.seats.filter(seat => seat.holder).length;
  const yourStake = state.holders.find(holder => holder.you)?.pct ?? 100;
  const ipoReady = state.ipoChecks.filter(check => check.done).length;
  const companyWeek = Math.max(1, Math.floor(state.companyWeek ?? state.absoluteWeek ?? 1));
  const companyYear = Math.max(1, Math.floor(state.companyYear ?? 1));
  /* What needs the player this week — the briefing the hub opened with (#5
     keeps it, above the tabs' pictures). Each alert opens the tab it is about. */
  const alerts: Array<{ id: string; text: string; tab: BoardroomTab; severity: 'urgent' | 'warn' | 'info'; open?: () => void }> = [];
  if (!state.live) alerts.push({ id: 'prelaunch', tab: 'MONEY', severity: state.treasury > 0 ? 'info' : 'urgent',
    text: state.treasury > 0 ? 'Treasury is funded. The company is waiting for its launch network.' : 'The company has no operating capital. Fund it before making commitments.' });
  if (runway !== null && runway < 12) alerts.push({ id: 'runway', tab: 'MONEY', severity: runway < 4 ? 'urgent' : 'warn',
    text: `${runway} week${runway === 1 ? '' : 's'} of runway remain at ${cash ? "the last 4 weeks' pace" : "this week's burn"}.` });
  if (yourStake < 51) alerts.push({ id: 'control', tab: 'OWNERSHIP', severity: 'urgent', text: `Founder control is below a majority at ${yourStake.toFixed(1)}%.` });
  const delta = (value: number | undefined) => (typeof value === 'number' && value !== 0
    ? <small className={value > 0 ? room.deltaUp : room.deltaDown}>{signedMoney(value)}</small> : null);

  /* the founder at the head of the table, then executives, then director seats */
  const seatPositions = useMemo(() => {
    const people = [
      { key: 'founder', label: initials(founderName), kind: 'founder' as const },
      ...state.execs.filter(exec => !exec.founder).map(exec => ({ key: exec.id, label: initials(exec.name), kind: 'exec' as const })),
      ...state.seats.map(seat => ({ key: seat.id, label: seat.holder ? initials(seat.holder) : '', kind: (seat.holder ? 'investor' : 'empty') as 'investor' | 'empty' })),
    ];
    return people.map((person, index) => {
      const angle = (-90 + (index / people.length) * 360) * (Math.PI / 180);
      return { ...person, x: 50 + Math.cos(angle) * 40, y: 50 + Math.sin(angle) * 36 };
    });
  }, [founderName, state.execs, state.seats]);

  const largest = (lines: LedgerLine[]) => lines.reduce<LedgerLine | null>((top, line) => (line.amount > (top?.amount ?? 0) ? line : top), null);
  const topIn = largest(state.weeklyRevenue);
  const topOut = largest(state.weeklyCosts);
  const closes = cash?.closes ?? [];
  const cashChange = closes.length ? closes[closes.length - 1].cash - closes[0].cash : 0;
  const door = (label: string, line: string, onClick?: () => void, dot?: boolean) => onClick ? (
    <button type="button" className={room.door} onClick={onClick}>
      <span><b>{label}{dot && <i className={room.doorDot} />}</b><small>{line}</small></span>
      <em aria-hidden="true">→</em>
    </button>
  ) : null;

  return (
    <div className={cx(css.br, room.room)} data-epx-root style={{
      ['--epx-br-line' as string]: 'var(--line, rgba(255,255,255,.09))',
      ['--epx-br-panel' as string]: 'var(--panel, rgba(255,255,255,.045))',
      ['--epx-br-c' as string]: accent,
    }}>
      <div className={css.brtop}>
        <button className={css.brback} onClick={onBack} aria-label="Back">←</button>
        <div className={css.brtitle}>
          <b>BOARDROOM</b>
          <RoomSubtitle>{hasTeam ? 'MONEY · TEAM · OWNERSHIP' : 'MONEY · PEOPLE · OWNERSHIP'}</RoomSubtitle>
        </div>
        <span className={css.brmark}><Mark brand={brand} /></span>
      </div>

      <div className={css.brstats}>
        <div><span>TREASURY</span><b className={state.treasury > 0 ? css.green : css.bad}>{money(state.treasury)}</b>{delta(state.treasuryDelta)}</div>
        <div><span>CASH / WEEK</span><b className={net >= 0 ? css.green : css.bad}>{state.live ? signedMoney(net) : '—'}</b>{delta(state.weeklyNetDelta)}</div>
        <div><span>YOUR STAKE</span><b>{yourStake.toFixed(yourStake % 1 ? 1 : 0)}%</b></div>
        {hasTeam
          ? <div><span>TEAM</span><b className={team!.totals.filled ? '' : css.muted}>{team!.totals.filled}/6</b></div>
          : <div><span>BOARD</span><b className={occupiedSeats ? '' : css.muted}>{occupiedSeats ? `${occupiedSeats} seat${occupiedSeats === 1 ? '' : 's'}` : 'None'}</b></div>}
      </div>

      {/* the plaque: the room states which week it is sitting in */}
      <div className={room.stamp}><span>Week {companyWeek} · Books open</span><span>Year {companyYear}</span></div>

      <div className={cx(css.brtabs, room.tabs)}>
        {tabs.map(item => (
          <button key={item} className={tab === item ? css.on : ''} onClick={() => setTab(item)}>
            {item === 'TABLE' && hasTeam ? 'TEAM' : TAB_LABELS[item]}
            {item === 'TABLE' && hasTeam && team!.totals.waiting > 0 && <i className={css.tdot} />}
            {item === 'MONEY' && runway !== null && runway < 26 && <i className={css.tdot} />}
            {item === 'OWNERSHIP' && yourStake < 51 && <i className={css.tdot} />}
          </button>
        ))}
      </div>

      <div className={css.brscroll}>
        {alerts.length > 0 && (
          <ul className={room.alerts}>
            {alerts.map((alert, index) => (
              <li key={alert.id}>
                <button type="button" className={cx(room.alert, room.enter)} style={{ ['--i' as string]: index }} onClick={() => (alert.open ? alert.open() : setTab(alert.tab))}>
                  <i className={room[`sev_${alert.severity}`]} aria-hidden="true" />
                  <span>{alert.text}</span>
                  <em aria-hidden="true">›</em>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* ── MONEY ── */}
        {tab === 'MONEY' && (
          <>
            {/* #175: MONEY is the summary: the pace, the runway and the cash line; the books are in Studio Finance */}
            <div className={cx(room.cash, room.enter)} style={{ ['--i' as string]: alerts.length }}>
              <span className={room.cashEyebrow}>{!state.live ? 'COMPANY TREASURY' : runway === null ? 'CASH IS GROWING' : 'RUNWAY'}</span>
              <b className={cx(room.cashFigure, state.live && (runway === null ? room.inText : runway < 26 ? room.outText : room.warnText))}>
                {!state.live ? money(state.treasury) : runway === null ? signedMoney(pace) : `${runway} week${runway === 1 ? '' : 's'}`}
              </b>
              <em className={room.cashLineCopy}>
                {!state.live ? 'No trading yet — revenue starts on opening night'
                  : runway === null ? `a week, on average over the last ${cash ? '4 weeks' : 'week'}`
                    : `at ${signedMoney(pace)} a week, the last ${cash ? "4 weeks'" : "week's"} pace${runway < 26 ? '. Raise prices, cut a cost line or raise money.' : ''}`}
              </em>
              {state.live && closes.length > 1 && (
                <>
                  <CashLine closes={closes.map(point => point.cash)} up={cashChange >= 0} />
                  <span className={room.cashFoot}>
                    <span>W{closes[0].week}</span>
                    <span><b>{money(state.treasury)}</b> now · {signedMoney(cashChange)} in {closes.length} weeks</span>
                    <span>W{closes[closes.length - 1].week}</span>
                  </span>
                </>
              )}
            </div>

            {/* #175: this week in one bar and three numbers; every line of it is in Studio Finance */}
            {state.live && (
              <section className={css.brsec}>
                <div className={css.brhead}><h2>This week</h2><span>{revenue > 0 || costs > 0 ? `week ${companyWeek}` : 'nothing settled yet'}</span></div>
                <div className={room.week}>
                  <i className={room.split} aria-hidden="true">
                    <em className={room.splitIn} style={{ flexGrow: Math.max(1, revenue) }} />
                    <em className={room.splitOut} style={{ flexGrow: Math.max(1, costs) }} />
                  </i>
                  <span className={room.weekCells}>
                    <span><small>IN</small><b className={room.inText}>{money(revenue)}</b></span>
                    <span><small>OUT</small><b className={room.outText}>{money(-costs)}</b></span>
                    <span><small>NET</small><b className={net >= 0 ? room.inText : room.outText}>{signedMoney(net)}</b></span>
                  </span>
                  {(topIn || topOut) && (
                    <span className={room.weekMost}>
                      {topIn && <span>Most in · <b>{topIn.label}</b></span>}
                      {topOut && <span>Most out · <b>{topOut.label}</b></span>}
                    </span>
                  )}
                </div>
              </section>
            )}

            {boardReview && state.live && (
              <section className={css.brsec}>
                <div className={css.brhead}><h2>Board review</h2><span>{boardReview.latest ? `next in ${boardReview.weeksUntilNext} week${boardReview.weeksUntilNext === 1 ? '' : 's'}` : `first in ${boardReview.weeksUntilNext} week${boardReview.weeksUntilNext === 1 ? '' : 's'}`}</span></div>
                {boardReview.latest ? (
                  /* #176: the quarter's report card in its simplest form: the tier, the headline, three numbers, the
                     best and the worst; it opens nothing */
                  <div className={cx(room.review, room[`tier${boardReview.latest.tierId ?? 'STEADY'}`])}>
                    <span className={room.reviewTop}><b>QUARTER {boardReview.latest.quarter}</b><em>{boardReview.latest.tier}</em></span>
                    <strong>{boardReview.latest.headline}</strong>
                    <span className={room.reviewFigs}>
                      <span><small>MEMBERS</small><b className={boardReview.latest.subscribersNet >= 0 ? room.inText : room.outText}>{signedCount(boardReview.latest.subscribersNet)}</b></span>
                      <span><small>REVENUE</small><b>{money(boardReview.latest.revenue)}</b></span>
                      <span><small>CASH</small><b className={boardReview.latest.cash >= 0 ? room.inText : room.outText}>{signedMoney(boardReview.latest.cash)}</b></span>
                    </span>
                    {(boardReview.latest.hits[0] || boardReview.latest.misses[0]) && (
                      <span className={room.reviewNotes}>
                        {boardReview.latest.hits[0] && <span className={room.reviewHit}><i aria-hidden="true">▲</i>{shortFigures(boardReview.latest.hits[0])}</span>}
                        {boardReview.latest.misses[0] && <span className={room.reviewMiss}><i aria-hidden="true">▼</i>{shortFigures(boardReview.latest.misses[0])}</span>}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className={css.brnote}>Every twelve weeks the board reviews the quarter: members, revenue, cash and how the service played.</div>
                )}
              </section>
            )}

            <section className={css.brsec}>
              {door('Studio Finance', 'The books, and your own money: salary, bonus, taking it out', onOpenFinance)}
            </section>
          </>
        )}

        {/* ── TEAM (#165) ── */}
        {tab === 'TABLE' && hasTeam && (
          <TeamTab team={team!} founderInitials={initials(founderName)} founderName={founderName} founderAvatar={founderAvatar} founderGender={founderGender} onOpen={setTeamSheet} stepDown={stepDown} />
        )}

        {/* ── THE TABLE ── */}
        {tab === 'TABLE' && !hasTeam && (
          <>
            <section className={css.brsec}>
              <div className={css.brhead}><h2>The table</h2><span>{state.execs.length} executive{state.execs.length === 1 ? '' : 's'} · {state.seats.length - occupiedSeats} empty seat{state.seats.length - occupiedSeats === 1 ? '' : 's'}</span></div>
              <div className={css.tableroom}>
                <div className={css.tabletop} />
                {seatPositions.map(person => (
                  <div key={person.key} className={cx(css.seat, css[person.kind])} style={{ left: `${person.x}%`, top: `${person.y}%` }}>
                    {person.label || <i className={css.seatx} />}
                  </div>
                ))}
              </div>
              <div className={css.seatkey}>
                <span><i className={cx(css.k, css.founder)} />You</span>
                <span><i className={cx(css.k, css.exec)} />Executive</span>
                <span><i className={cx(css.k, room.kInvestor)} />Director</span>
                <span><i className={cx(css.k, css.empty)} />Empty seat</span>
              </div>
            </section>

            <section className={css.brsec}>
              <div className={css.brhead}><h2>Leadership</h2>{(onOpenTable ?? onHire) && <button className={css.bradd} onClick={onOpenTable ?? onHire}>+ HIRE</button>}</div>
              {state.execs.length === 0 && <div className={css.brnote}>No executives yet. You run everything yourself; each hire takes a load off and costs a weekly salary.</div>}
              {state.execs.map(exec => (
                <div className={css.execrow} key={exec.id}>
                  <span className={css.execav}>{initials(exec.name)}</span>
                  <div className={css.execid}>
                    <b>{exec.name}</b>
                    <span>{exec.role}{exec.founder ? ' · you' : ''}</span>
                    <span className={css.execunl}>{exec.unlocks}</span>
                  </div>
                  <div className={css.execnum}>
                    <em>{exec.founder ? '—' : `${money(exec.salary)}/wk`}</em>
                    <div className={css.loyal}><i style={{ width: `${Math.max(0, Math.min(100, exec.loyalty))}%` }} /></div>
                    <span>{Math.round(exec.loyalty)}% loyal</span>
                  </div>
                </div>
              ))}
            </section>

            <section className={css.brsec}>
              <div className={css.brhead}><h2>Succession</h2></div>
              <button className={css.succard} onClick={onOpenLegacy}>
                <div className={css.sucid}>
                  <span>IF YOU STEP DOWN</span>
                  <b>{state.successor ? state.successor.name : 'Nobody named'}</b>
                  <em>{state.successor ? state.successor.role : 'The board would choose for you'}</em>
                </div>
                <i className={css.chev}>›</i>
              </button>
              {state.legacyTitle && (
                <div className={css.legacy}>
                  <span>WHAT YOU ARE BECOMING</span>
                  <b>{state.legacyTitle}</b>
                  <em>Earned from what the company has done, not chosen.</em>
                </div>
              )}
              {door('Leadership suite', 'Hire, review and replace executives and directors', onOpenTable ?? onHire)}
            </section>
          </>
        )}

        {/* ── OWNERSHIP ── */}
        {tab === 'OWNERSHIP' && ownership && ownershipActions && (
          <BoardroomOwnership view={ownership} companyName={brand.name} founderName={founderName} actions={ownershipActions} sale={sale} onOpenBoard={() => setBoardOpen(true)} />
        )}
        {tab === 'OWNERSHIP' && !(ownership && ownershipActions) && (
          <section className={css.brsec}>
            <div className={css.brhead}><h2>Cap table</h2><span>who owns the company</span></div>
            <div className={css.capbar}>
              {state.holders.map(holder => <i key={holder.id} className={holder.you ? css.you : ''} style={{ width: `${holder.pct}%` }} />)}
            </div>
            {state.holders.map(holder => (
              <div className={cx(css.holder, holder.you ? css.you : '')} key={holder.id}>
                <i className={cx(css.hchip, holder.you ? css.you : '')} />
                <div className={css.hid}><b>{holder.you ? `${holder.name} (you)` : holder.name}</b><span>since {holder.since}</span></div>
                <em>{holder.pct.toFixed(1)}%</em>
              </div>
            ))}
            <div className={cx(css.govnote, yourStake > 50 ? css.safe : css.risk)}>
              {yourStake >= 100
                ? 'You own the company outright. The board advises; it cannot outvote you.'
                : yourStake > 50
                  ? `You hold ${yourStake.toFixed(1)}% — still a controlling stake. The board advises; you decide.`
                  : `You hold ${yourStake.toFixed(0)}%. You no longer control the company — the board can outvote you.`}
            </div>
            {door('Raise capital', 'Equity raises cash and fills a board seat — and costs you control', onOpenOwnership ?? onIssueEquity)}
          </section>
        )}

        {/* ── MARKETS ── */}
        {tab === 'MARKETS' && listingDesk && listingActions && <BoardroomMarkets view={listingDesk} actions={listingActions} />}
        {tab === 'MARKETS' && !(listingDesk && listingActions) && (
          state.listed && state.share ? (
            <>
              <div className={css.ticker}>
                <div className={css.tkid}>
                  <b>{state.share.ticker ?? (brand.name.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase() || 'EMPR')}</b>
                  <span>{brand.name}</span>
                </div>
                <div className={css.tkprice}>
                  <b>${state.share.price.toFixed(2)}</b>
                  <em className={state.share.changePct >= 0 ? css.up : css.down}>{state.share.changePct >= 0 ? '▲' : '▼'} {Math.abs(state.share.changePct).toFixed(2)}%</em>
                </div>
              </div>
              {state.share.history.length > 1 && <SharePlot data={state.share.history} up={state.share.changePct >= 0} />}
              <div className={css.mcap}><span>MARKET CAP</span><b>{money(state.share.marketCap)}</b></div>
              {door('Public markets', 'Investors, guidance and the share register', onFileIpo)}
            </>
          ) : (
            <section className={css.brsec}>
              <div className={css.brhead}><h2>Going public</h2><span>{ipoReady} of {state.ipoChecks.length} ready</span></div>
              <div className={css.brnote}>An IPO is optional. Staying private is a perfectly good ending — listing raises cash and costs privacy, control and patience.</div>
              <i className={room.readiness}><em style={{ width: `${state.ipoChecks.length ? ipoReady / state.ipoChecks.length * 100 : 0}%` }} /></i>
              {state.ipoChecks.map(check => (
                <div className={cx(css.ipocheck, check.done ? css.done : '')} key={check.id}>
                  <i className={css.ipodot}>{check.done ? '✓' : ''}</i>
                  <div className={css.ipoid}><b>{check.label}</b>{check.note && <span>{check.note}</span>}</div>
                </div>
              ))}
              {door('IPO desk', ipoReady < state.ipoChecks.length ? `${state.ipoChecks.length - ipoReady} requirement${state.ipoChecks.length - ipoReady === 1 ? '' : 's'} outstanding` : 'Ready: roadshow, pricing, listing day', onFileIpo)}
            </section>
          )
        )}

        {/* ── M&A ── */}
        {/* #177: M&A as a teaser for the update that brings it */}
        {tab === 'DEALS' && mnaComingSoon && <BoardroomDeals companyName={brand.name} rivals={mnaRivals ?? []} />}
        {tab === 'DEALS' && !mnaComingSoon && (
          <section className={css.brsec}>
            <div className={css.brhead}><h2>Mergers &amp; acquisitions</h2><span>{state.live ? 'open' : 'after opening'}</span></div>
            <div className={room.deals}>
              <b>{state.live ? 'Buy a rival, a library or a regional service' : 'Opens once the service is live'}</b>
              <span>{acquisitionSummary || 'No acquisition reviews started'}</span>
            </div>
            {state.live && door('Open M&A', 'Targets, due diligence and integration', onOpenAcquisitions)}
          </section>
        )}

        <div className={css.brfoot} />
      </div>
      {/* #165: the in-tray and the week's report, pinned under the TEAM tab */}
      {tab === 'TABLE' && hasTeam && <TeamBar team={team!} onOpen={setTeamSheet} />}
      {hasTeam && <TeamSheets team={team!} sheet={teamSheet} onClose={closeTeamSheet} onOpen={setTeamSheet} actions={teamActions!} stepDown={stepDown} />}
      {boardOpen && ownership?.board && ownershipActions && <BoardSheet board={ownership.board} actions={ownershipActions} onClose={closeBoard} />}
    </div>
  );
};

/** Share price: one series, one axis, the last point marked. */
const SharePlot = ({ data, up }: { data: SharePoint[]; up: boolean }) => {
  const w = 320, h = 120, pad = 8, base = h - 18;
  const values = data.map(point => point.value);
  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const x = (index: number) => pad + (index / Math.max(1, data.length - 1)) * (w - pad * 2);
  const y = (value: number) => 10 + (1 - (value - min) / span) * (base - 18);
  const line = data.map((point, index) => `${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const stroke = up ? '#4ade80' : '#ff5a5f';
  return (
    <div className={css.plotwrap}>
      <svg viewBox={`0 0 ${w} ${h}`} className={css.shareplot}>
        {[0, .5, 1].map(f => <line key={f} x1={pad} x2={w - pad} y1={10 + f * (base - 18)} y2={10 + f * (base - 18)} stroke="#fff" strokeOpacity=".07" strokeWidth="1" />)}
        <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(data.length - 1)} cy={y(values[values.length - 1])} r="4" fill={stroke} stroke="#050609" strokeWidth="2" />
      </svg>
      <div className={css.plotaxis}><span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span></div>
    </div>
  );
};
