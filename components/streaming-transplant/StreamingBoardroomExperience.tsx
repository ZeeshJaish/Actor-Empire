import css from './presentation/screens/Boardroom/Boardroom.module.css';
import room from './presentation/screens/Boardroom/BoardroomRoom.module.css';
import { cx } from './presentation/cx';
import React, { useMemo, useState } from 'react';
import { Mark, brandColor, type Brand } from './StreamingBrandVisuals';

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
  onOpenTable?: () => void;
  onOpenOwnership?: () => void;
  /** Mergers & acquisitions (main's prop names); without it the DEALS tab is not shown. */
  onOpenAcquisitions?: () => void;
  acquisitionSummary?: string;
  onOpenBrief?: () => void;
  /** a weekly CEO brief is waiting to be read */
  briefPending?: boolean;
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
const initials = (name: string) => name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
const LEGACY_TAB: Record<LegacyTab, BoardroomTab> = { FINANCE: 'MONEY', 'THE TABLE': 'TABLE', OWNERSHIP: 'OWNERSHIP', MARKETS: 'MARKETS' };
const TAB_LABELS: Record<BoardroomTab, string> = { MONEY: 'MONEY', TABLE: 'THE TABLE', OWNERSHIP: 'OWNERSHIP', MARKETS: 'MARKETS', DEALS: 'M&A' };

/* ============================================================================
   THE BOARDROOM — money, people and ownership, drawn rather than listed.

   It was a hub of text rows that threw most of BoardroomState away. This is
   the visual Boardroom recovered from 907e027 (its stylesheet,
   Boardroom.module.css, stayed in the repo, reviewed and unused), brought up
   to date: every tab ends in a door to the room where the work is done
   (Studio Finance, the leadership suite, capital, public markets, M&A, the
   CEO brief, legacy).

     MONEY      the treasury and its runway; where this week's money came
                from and went, as two bars and a statement; the CEO brief
     THE TABLE  the board around a table; leadership and loyalty; succession
     OWNERSHIP  the cap table as one bar; who holds what; who controls
     MARKETS    the share price, or the honest IPO checklist
     M&A        acquisition reviews (after opening)
   ========================================================================== */
export const Boardroom = ({
  brand, founderName, state, onBack, initialTab, onHire, onIssueEquity, onFileIpo, onOpenLegacy,
  onOpenFinance, onOpenTable, onOpenOwnership, onOpenAcquisitions, acquisitionSummary, onOpenBrief, briefPending,
}: Props) => {
  const accent = brandColor(brand);
  const tabs: BoardroomTab[] = onOpenAcquisitions ? ['MONEY', 'TABLE', 'OWNERSHIP', 'MARKETS', 'DEALS'] : ['MONEY', 'TABLE', 'OWNERSHIP', 'MARKETS'];
  const resolvedInitial = initialTab ? (initialTab in LEGACY_TAB ? LEGACY_TAB[initialTab as LegacyTab] : initialTab as BoardroomTab) : 'MONEY';
  const [tab, setTab] = useState<BoardroomTab>(tabs.includes(resolvedInitial) ? resolvedInitial : 'MONEY');

  const revenue = state.weeklyRevenue.reduce((sum, line) => sum + line.amount, 0);
  const costs = state.weeklyCosts.reduce((sum, line) => sum + line.amount, 0);
  const net = revenue - costs;
  /* runway only means something while the company loses money */
  const runway = net >= 0 ? null : Math.floor(state.treasury / Math.max(1, Math.abs(net)));
  const occupiedSeats = state.seats.filter(seat => seat.holder).length;
  const yourStake = state.holders.find(holder => holder.you)?.pct ?? 100;
  const ipoReady = state.ipoChecks.filter(check => check.done).length;
  const absoluteWeek = Math.max(1, Math.floor(state.absoluteWeek ?? 1));
  const companyYear = Math.max(1, Math.floor(state.companyYear ?? 1));
  /* What needs the player this week — the briefing the hub opened with (#5
     keeps it, above the tabs' pictures). Each alert opens the tab it is about. */
  const alerts: Array<{ id: string; text: string; tab: BoardroomTab; severity: 'urgent' | 'warn' | 'info'; open?: () => void }> = [];
  if (!state.live) alerts.push({ id: 'prelaunch', tab: 'MONEY', severity: state.treasury > 0 ? 'info' : 'urgent',
    text: state.treasury > 0 ? 'Treasury is funded. The company is waiting for its launch network.' : 'The company has no operating capital. Fund it before making commitments.' });
  if (runway !== null && runway < 12) alerts.push({ id: 'runway', tab: 'MONEY', severity: runway < 4 ? 'urgent' : 'warn',
    text: `${runway} week${runway === 1 ? '' : 's'} of runway remain at this week's burn.` });
  if (yourStake < 51) alerts.push({ id: 'control', tab: 'OWNERSHIP', severity: 'urgent', text: `Founder control is below a majority at ${yourStake.toFixed(1)}%.` });
  if (briefPending) alerts.push({ id: 'brief', tab: 'MONEY', severity: 'info', text: 'A new weekly CEO brief is waiting.', open: onOpenBrief });
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

  const mixBar = (lines: LedgerLine[], tone: 'in' | 'out') => {
    const total = lines.reduce((sum, line) => sum + Math.max(0, line.amount), 0) || 1;
    return (
      <i className={room.mixBar}>
        {lines.filter(line => line.amount > 0).map((line, index) => (
          <em key={line.id} className={room[`${tone}${Math.min(index, 4)}`]} style={{ flexGrow: line.amount / total }} />
        ))}
      </i>
    );
  };
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
          <span>MONEY · PEOPLE · OWNERSHIP</span>
        </div>
        <span className={css.brmark}><Mark brand={brand} /></span>
      </div>

      <div className={css.brstats}>
        <div><span>TREASURY</span><b className={state.treasury > 0 ? css.green : css.bad}>{money(state.treasury)}</b>{delta(state.treasuryDelta)}</div>
        <div><span>NET / WEEK</span><b className={net >= 0 ? css.green : css.bad}>{state.live ? signedMoney(net) : '—'}</b>{delta(state.weeklyNetDelta)}</div>
        <div><span>YOUR STAKE</span><b>{yourStake.toFixed(yourStake % 1 ? 1 : 0)}%</b></div>
        <div><span>BOARD</span><b className={occupiedSeats ? '' : css.muted}>{occupiedSeats ? `${occupiedSeats} seat${occupiedSeats === 1 ? '' : 's'}` : 'None'}</b></div>
      </div>

      {/* the plaque: the room states which week it is sitting in */}
      <div className={room.stamp}><span>Week {absoluteWeek} · Books open</span><span>Year {companyYear}</span></div>

      <div className={cx(css.brtabs, room.tabs)}>
        {tabs.map(item => (
          <button key={item} className={tab === item ? css.on : ''} onClick={() => setTab(item)}>
            {TAB_LABELS[item]}
            {item === 'MONEY' && ((runway !== null && runway < 26) || briefPending) && <i className={css.tdot} />}
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
            <div className={cx(css.balance, room.enter)} style={{ ['--i' as string]: alerts.length }}>
              <span>COMPANY TREASURY</span>
              <b className={room.balanceFigure}>{money(state.treasury)}</b>
              {!state.live ? <em className={css.warn}>No trading yet — revenue starts on opening night</em>
                : runway === null
                  ? <em className={css.good}>Profitable this week — the treasury is growing</em>
                  : <em className={runway < 26 ? css.bad : css.warn}>{runway} week{runway === 1 ? '' : 's'} of runway at this week's burn</em>}
            </div>
            {runway !== null && runway < 26 && (
              <div className={css.brwarn}>Under six months of runway. Raise prices, cut a cost line or raise capital before the treasury runs dry.</div>
            )}

            {state.live && (
              <section className={css.brsec}>
                <div className={css.brhead}><h2>This week</h2><span>{revenue > 0 || costs > 0 ? 'where the money came from and went' : 'nothing settled yet'}</span></div>
                <div className={room.flows}>
                  <div className={room.flow}>
                    <div className={room.flowHead}><span>MONEY IN</span><b className={room.inText}>{money(revenue)}</b></div>
                    {mixBar(state.weeklyRevenue, 'in')}
                    {state.weeklyRevenue.filter(line => line.amount > 0).map((line, index) => (
                      <div key={line.id} className={room.flowLine}><i className={room[`in${Math.min(index, 4)}`]} /><span>{line.label}</span><b>{money(line.amount)}</b></div>
                    ))}
                  </div>
                  <div className={room.flow}>
                    <div className={room.flowHead}><span>MONEY OUT</span><b className={room.outText}>{money(-costs)}</b></div>
                    {mixBar(state.weeklyCosts, 'out')}
                    {state.weeklyCosts.filter(line => line.amount > 0).map((line, index) => (
                      <div key={line.id} className={room.flowLine}><i className={room[`out${Math.min(index, 4)}`]} /><span>{line.label}</span><b>{money(-line.amount)}</b></div>
                    ))}
                  </div>
                  <div className={cx(css.stnet, net >= 0 ? css.pos : css.neg)}>
                    <span>NET THIS WEEK</span>
                    <b className={room.netFigure}>{signedMoney(net)}</b>
                  </div>
                </div>
              </section>
            )}

            <section className={css.brsec}>
              {door('Studio Finance', 'Capital, loans, investors and the full books', onOpenFinance)}
              {door('CEO brief', state.live ? (briefPending ? 'A new weekly report is waiting' : 'Weekly operations and decisions') : 'Opens with live operations', onOpenBrief, briefPending)}
            </section>
          </>
        )}

        {/* ── THE TABLE ── */}
        {tab === 'TABLE' && (
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
                    <span>{exec.role.toLowerCase()}{exec.founder ? ' · you' : ''}</span>
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
                  <em>{state.successor ? state.successor.role.toLowerCase() : 'The board would choose for you'}</em>
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
        {tab === 'OWNERSHIP' && (
          <section className={css.brsec}>
            <div className={css.brhead}><h2>Cap table</h2><span>who owns the company</span></div>
            <div className={css.capbar}>
              {state.holders.map(holder => <i key={holder.id} className={holder.you ? css.you : ''} style={{ width: `${holder.pct}%` }} />)}
            </div>
            {state.holders.map(holder => (
              <div className={cx(css.holder, holder.you ? css.you : '')} key={holder.id}>
                <i className={cx(css.hchip, holder.you ? css.you : '')} />
                <div className={css.hid}><b>{holder.you ? `${holder.name} (you)` : holder.name}</b><span>since {holder.since.toLowerCase()}</span></div>
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
        {tab === 'MARKETS' && (
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
        {tab === 'DEALS' && (
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
