/**
 * EMPIRE+ v2 — BOARDROOM
 *
 * The fourth division page: money, people, ownership, and the public markets.
 * Same rule as the others — borrow something the player already knows.
 *   FINANCE   → a bank statement / P&L: money in, money out, a net, a runway
 *   THE TABLE → the boardroom itself, with a chair per person — and empty chairs
 *               for the board seats you have not sold. Governance as an image
 *   OWNERSHIP → a cap table, the way any founder has seen one
 *   MARKETS   → a stock app once listed; before that, an honest readiness list
 */
import css from './presentation/screens/Boardroom/Boardroom.module.css';
import { cx } from './presentation/cx';
import React, { useMemo, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */
export interface LedgerLine { id: string; label: string; amount: number; note?: string }

export interface Exec {
  id: string; role: string; name: string;
  loyalty: number;                 // 0-100
  salary: number;
  unlocks: string;
  /** the founder occupies the head of the table and cannot be dismissed */
  founder?: boolean;
}

export interface BoardSeat {
  id: string;
  /** undefined while the seat is unsold — that is the point of the image */
  holder?: string;
  votes?: number;
}

export interface Holder {
  id: string; name: string; pct: number;
  since: string;
  you?: boolean;
}

export interface IpoCheck { id: string; label: string; done: boolean; note?: string }

export interface SharePoint { label: string; value: number }

export interface BoardroomState {
  live: boolean;
  treasury: number;
  weeklyRevenue: LedgerLine[];
  weeklyCosts: LedgerLine[];
  execs: Exec[];
  seats: BoardSeat[];
  holders: Holder[];
  /** true once the company has listed */
  listed: boolean;
  ipoChecks: IpoCheck[];
  share?: {
    /** the symbol the listing actually chose — not one derived a second time */
    ticker?: string;
    price: number; changePct: number; marketCap: number; history: SharePoint[];
  };
  successor?: { name: string; role: string } | null;
  legacyTitle?: string;
}

type Tab = 'FINANCE' | 'THE TABLE' | 'OWNERSHIP' | 'MARKETS';

/* ============================================================
   HELPERS
   ============================================================ */
const money = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `$${(a / 1e9).toFixed(2)}B`
    : a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M`
      : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${a}`;
  return n < 0 ? `−${s}` : s;
};
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ============================================================
   THE PAGE
   ============================================================ */
export const Boardroom: React.FC<{
  brand: Brand;
  founderName: string;
  state: BoardroomState;
  onBack: () => void;
  initialTab?: Tab;
  onHire?: () => void;
  onIssueEquity?: () => void;
  onFileIpo?: () => void;
  onOpenLegacy?: () => void;
}> = ({ brand, founderName, state, onBack, initialTab, onHire, onIssueEquity, onFileIpo, onOpenLegacy }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'FINANCE');

  const revenue = state.weeklyRevenue.reduce((a, x) => a + x.amount, 0);
  const costs = state.weeklyCosts.reduce((a, x) => a + x.amount, 0);
  const net = revenue - costs;
  /** Runway only means something while you are losing money. */
  const runway = net >= 0 ? null : Math.floor(state.treasury / Math.abs(net));

  const soldSeats = state.seats.filter(s => s.holder).length;
  const yourStake = state.holders.find(h => h.you)?.pct ?? 100;
  const ipoReady = state.ipoChecks.filter(x => x.done).length;

  /* seats laid out around an ellipse; the founder sits at the head */
  const seatPos = useMemo(() => {
    const people = [
      { key: 'founder', label: initials(founderName), kind: 'founder' as const },
      ...state.execs.filter(e => !e.founder).map(e => ({ key: e.id, label: initials(e.name), kind: 'exec' as const })),
      ...state.seats.map(s => ({
        key: s.id,
        label: s.holder ? initials(s.holder) : '',
        kind: (s.holder ? 'investor' : 'empty') as 'investor' | 'empty',
      })),
    ];
    const n = people.length;
    return people.map((p, i) => {
      const a = (-90 + (i / n) * 360) * (Math.PI / 180);
      return { ...p, x: 50 + Math.cos(a) * 40, y: 50 + Math.sin(a) * 36 };
    });
  }, [founderName, state.execs, state.seats]);

  return (
    <div className={css.br} style={{
      /* Host tokens, with the prototype's own values as fallbacks — the screen
         must render correctly when dropped into an app that defines neither. */
      ['--epx-br-line' as string]: 'var(--line, rgba(255,255,255,.09))',
      ['--epx-br-panel' as string]: 'var(--panel, rgba(255,255,255,.045))',
      ['--epx-br-c' as string]: c,
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
        <div><span>TREASURY</span><b className={css.green}>{money(state.treasury)}</b></div>
        <div><span>WEEKLY NET</span><b className={net >= 0 ? css.green : css.bad}>{money(net)}</b></div>
        <div><span>YOUR STAKE</span><b>{yourStake.toFixed(1)}%</b></div>
        <div><span>BOARD</span><b className={soldSeats ? '' : css.muted}>{soldSeats ? `${soldSeats} seats` : 'None'}</b></div>
      </div>

      <div className={css.brtabs}>
        {(['FINANCE', 'THE TABLE', 'OWNERSHIP', 'MARKETS'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? css.on : ''} onClick={() => setTab(t)}>
            {t}
            {t === 'FINANCE' && runway !== null && runway < 26 && <i className={css.tdot} />}
          </button>
        ))}
      </div>

      <div className={css.brscroll}>

        {/* ── FINANCE — a statement, not a dashboard ── */}
        {tab === 'FINANCE' && (
          <>
            <div className={css.balance}>
              <span>COMPANY TREASURY</span>
              <b>{money(state.treasury)}</b>
              {runway === null
                ? <em className={css.good}>Profitable — the treasury is growing</em>
                : <em className={runway < 26 ? css.bad : css.warn}>
                    {runway} week{runway === 1 ? '' : 's'} of runway at this burn
                  </em>}
            </div>

            {runway !== null && runway < 26 && (
              <div className={css.brwarn}>
                Under six months of runway. Raise prices, cut a cost line, or issue
                equity before the treasury runs dry — an empty treasury forces a sale.
              </div>
            )}

            {!state.live ? (
              <div className={css.brpending}>
                <b>No trading yet</b>
                <span>Revenue lines appear once the platform is live. Costs are already running.</span>
              </div>
            ) : (
              <section className={css.brsec}>
                <div className={css.brhead}><h2>This week</h2><span>operating statement</span></div>
                <div className={css.statement}>
                  <div className={css.stgroup}>
                    <div className={css.stlabel}>MONEY IN</div>
                    {state.weeklyRevenue.map(l => (
                      <div className={css.stline} key={l.id}>
                        <div className={css.stid}><b>{l.label}</b>{l.note && <span>{l.note}</span>}</div>
                        <em className={css.in}>{money(l.amount)}</em>
                      </div>
                    ))}
                    <div className={css.stsub}><span>Total revenue</span><em>{money(revenue)}</em></div>
                  </div>

                  <div className={css.stgroup}>
                    <div className={css.stlabel}>MONEY OUT</div>
                    {state.weeklyCosts.map(l => (
                      <div className={css.stline} key={l.id}>
                        <div className={css.stid}><b>{l.label}</b>{l.note && <span>{l.note}</span>}</div>
                        <em className={css.out}>{money(-l.amount)}</em>
                      </div>
                    ))}
                    <div className={css.stsub}><span>Total costs</span><em>{money(-costs)}</em></div>
                  </div>

                  <div className={cx(css.stnet, (net >= 0 ? css.pos : css.neg))}>
                    <span>NET THIS WEEK</span>
                    <b>{money(net)}</b>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ── THE TABLE — governance as a picture ── */}
        {tab === 'THE TABLE' && (
          <>
            <section className={css.brsec}>
              <div className={css.brhead}>
                <h2>The table</h2>
                <span>{state.execs.length} hired · {state.seats.length - soldSeats} empty</span>
              </div>
              <div className={css.tableroom}>
                <div className={css.tabletop} />
                {seatPos.map(p => (
                  <div key={p.key} className={cx(css.seat, css[p.kind])}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                    {p.label || <i className={css.seatx} />}
                  </div>
                ))}
              </div>
              <div className={css.seatkey}>
                <span><i className={cx(css.k, css.founder)} />Founder</span>
                <span><i className={cx(css.k, css.exec)} />Executive</span>
                <span><i className={cx(css.k, css.empty)} />Unsold seat</span>
              </div>
            </section>

            <section className={css.brsec}>
              <div className={css.brhead}>
                <h2>Leadership</h2>
                <button className={css.bradd} onClick={onHire}>+ HIRE</button>
              </div>
              {state.execs.map(e => (
                <div className={css.execrow} key={e.id}>
                  <span className={css.execav}>{initials(e.name)}</span>
                  <div className={css.execid}>
                    <b>{e.name}</b>
                    <span>{e.role}{e.founder ? ' · you' : ''}</span>
                    <span className={css.execunl}>{e.unlocks}</span>
                  </div>
                  <div className={css.execnum}>
                    <em>{e.founder ? '—' : money(e.salary)}</em>
                    <div className={css.loyal}>
                      <i style={{ width: `${e.loyalty}%` }} />
                    </div>
                    <span>{e.loyalty}% loyal</span>
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
                  <em>Derived from what you have actually done — not chosen.</em>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── OWNERSHIP — a cap table ── */}
        {tab === 'OWNERSHIP' && (
          <section className={css.brsec}>
            <div className={css.brhead}><h2>Cap table</h2><span>who owns the company</span></div>

            {/* stacked, with a 2px gap between segments so they never blur together */}
            <div className={css.capbar}>
              {state.holders.map(h => (
                <i key={h.id} className={h.you ? css.you : ''} style={{ width: `${h.pct}%` }} />
              ))}
            </div>

            {state.holders.map(h => (
              <div className={cx(css.holder, (h.you ? css.you : ''))} key={h.id}>
                <i className={cx(css.hchip, (h.you ? css.you : ''))} />
                <div className={css.hid}><b>{h.name}</b><span>since {h.since}</span></div>
                <em>{h.pct.toFixed(1)}%</em>
              </div>
            ))}

            <div className={cx(css.govnote, (yourStake > 50 ? css.safe : css.risk))}>
              {yourStake >= 100
                ? 'You own the company outright. The board is advisory and cannot outvote you.'
                : yourStake > 50
                  ? `You hold ${yourStake.toFixed(1)}% — still a controlling stake. The board advises; you decide.`
                  : `You hold ${yourStake.toFixed(0)}%. You no longer control the company — the board can outvote you.`}
            </div>

            <button className={css.bigbtn} onClick={onIssueEquity}>
              ISSUE EQUITY
              <span>Raises cash. Fills a board seat. Costs you control.</span>
            </button>
          </section>
        )}

        {/* ── MARKETS — a stock app, or an honest checklist ── */}
        {tab === 'MARKETS' && (
          <>
            {state.listed && state.share ? (
              <>
                <div className={css.ticker}>
                  <div className={css.tkid}>
                    <b>{state.share?.ticker
                      ?? (brand.name.replace(/[^A-Z]/gi, '').slice(0, 4).toUpperCase() || 'EMPR')}</b>
                    <span>{brand.name}</span>
                  </div>
                  <div className={css.tkprice}>
                    <b>${state.share.price.toFixed(2)}</b>
                    <em className={state.share.changePct >= 0 ? css.up : css.down}>
                      {state.share.changePct >= 0 ? '▲' : '▼'} {Math.abs(state.share.changePct).toFixed(2)}%
                    </em>
                  </div>
                </div>
                <SharePlot data={state.share.history} up={state.share.changePct >= 0} />
                <div className={css.mcap}><span>MARKET CAP</span><b>{money(state.share.marketCap)}</b></div>
              </>
            ) : (
              <section className={css.brsec}>
                <div className={css.brhead}>
                  <h2>Going public</h2>
                  <span>{ipoReady} of {state.ipoChecks.length} ready</span>
                </div>
                <div className={css.brnote}>
                  An IPO is optional. Staying private forever is a perfectly good ending —
                  listing raises cash and costs you privacy, control and patience.
                </div>
                {state.ipoChecks.map(k => (
                  <div className={cx(css.ipocheck, (k.done ? css.done : ''))} key={k.id}>
                    <i className={css.ipodot}>{k.done ? '✓' : ''}</i>
                    <div className={css.ipoid}><b>{k.label}</b>{k.note && <span>{k.note}</span>}</div>
                  </div>
                ))}
                <button className={cx(css.bigbtn, (ipoReady < state.ipoChecks.length ? css.dead : ''))}
                  disabled={ipoReady < state.ipoChecks.length} onClick={onFileIpo}>
                  {ipoReady < state.ipoChecks.length ? 'NOT READY TO FILE' : 'FILE FOR IPO'}
                  <span>{ipoReady < state.ipoChecks.length
                    ? `${state.ipoChecks.length - ipoReady} requirement${state.ipoChecks.length - ipoReady === 1 ? '' : 's'} outstanding`
                    : 'Roadshow, pricing, listing day'}</span>
                </button>
              </section>
            )}
          </>
        )}

        <div className={css.brfoot} />
      </div>
    </div>
  );
};

/** Share price: one series, one axis, last point direct-labelled. */
const SharePlot: React.FC<{ data: SharePoint[]; up: boolean }> = ({ data, up }) => {
  const w = 320, h = 120, pad = 8, base = h - 18;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  const x = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
  const y = (v: number) => 10 + (1 - (v - min) / span) * (base - 18);
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const stroke = up ? '#4ade80' : '#ff5a5f';
  return (
    <div className={css.plotwrap}>
      <svg viewBox={`0 0 ${w} ${h}`} className={css.shareplot}>
        {[0, .5, 1].map(f => (
          <line key={f} x1={pad} x2={w - pad} y1={10 + f * (base - 18)} y2={10 + f * (base - 18)}
            stroke="#fff" strokeOpacity=".07" strokeWidth="1" />
        ))}
        <polyline points={line} fill="none" stroke={stroke} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(data.length - 1)} cy={y(vals[vals.length - 1])} r="4"
          fill={stroke} stroke="#050609" strokeWidth="2" />
      </svg>
      <div className={css.plotaxis}>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/Boardroom/Boardroom.module.css */
