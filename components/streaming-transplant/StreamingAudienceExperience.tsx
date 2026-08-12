/**
 * EMPIRE+ v2 — AUDIENCE
 *
 * The third division page. Same rule as the others: borrow an interface the
 * player has already used.
 *   ANALYTICS → a creator-analytics dashboard (range chips, stat tiles, one trend)
 *   TOP 10    → the Top 10 chart every streaming app shows — and the payoff of
 *               the very first screen: the rivals from the Wall are in it, and
 *               now so are you
 *   CAMPAIGNS → the Boost / Promote flow, with estimate ranges
 *   REGIONS   → per-territory performance, tied back to the server latency
 *
 * Charting follows the house rules: one axis, a single series needs no legend,
 * colour follows the entity (yours) rather than rank, magnitude is one hue at
 * varying length, and every line chart ships a hover layer.
 */
import css from './presentation/screens/AudienceDesk/AudienceDesk.module.css';
import { cx } from './presentation/cx';
import React, { useMemo, useRef, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */
export interface TrendPoint { label: string; value: number }

export interface AudienceMetric {
  id: string; label: string; value: string;
  delta: number;                    // % change, signed
  /** lower is better — churn, latency */
  inverse?: boolean;
  spark: number[];
}

export interface ChartRow {
  rank: number;
  /** last week's rank; undefined means new to the chart */
  prevRank?: number;
  title: string;
  platform: string;
  mine: boolean;
  hue: number;
}

export type Attribution = { id: string; label: string; value: number; note: string };

export interface Campaign {
  id: string; name: string; channel: string;
  spend: number; reachLow: number; reachHigh: number;
  weeksLeft: number; live: boolean;
}

export type RecObjective = 'BALANCED' | 'RETENTION' | 'DISCOVERY' | 'BREAKOUT';

export interface RegionRow {
  id: string; label: string;
  subs: number; sharePct: number; growthPct: number;
  latencyMs: number; rivals: string[];
}

export interface AudienceState {
  live: boolean;
  metrics: AudienceMetric[];
  trend: TrendPoint[];
  trendLabel: string;
  chart: ChartRow[];
  attribution: Attribution[];
  campaigns: Campaign[];
  objective: RecObjective;
  regions: RegionRow[];
}

type Tab = 'ANALYTICS' | 'TOP 10' | 'CAMPAIGNS' | 'REGIONS';
type Range = '7D' | '28D' | '90D';

/* ============================================================
   HELPERS
   ============================================================ */
const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`;
const count = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;
const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;

/** A sparkline: 2px line, no axes, no markers. */
const Spark: React.FC<{ data: number[]; good: boolean }> = ({ data, good }) => {
  const w = 62, h = 20, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className={css.spark} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        stroke={good ? '#4ade80' : '#ff5a5f'} opacity=".9" />
    </svg>
  );
};

/* ============================================================
   THE PAGE
   ============================================================ */
export const AudienceDesk: React.FC<{
  brand: Brand;
  state: AudienceState;
  onBack: () => void;
  initialTab?: Tab;
  onNewCampaign?: () => void;
  onObjective?: (o: RecObjective) => void;
  onOpenRegion?: (r: RegionRow) => void;
  onOpenMarketCommand?: () => void;
}> = ({ brand, state, onBack, initialTab, onNewCampaign, onObjective, onOpenRegion, onOpenMarketCommand }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'ANALYTICS');
  const [range, setRange] = useState<Range>('28D');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /* the visible window of the trend, driven by the range chips */
  const shown = useMemo(() => {
    const n = range === '7D' ? 7 : range === '28D' ? 28 : state.trend.length;
    return state.trend.slice(-n);
  }, [state.trend, range]);

  const geom = useMemo(() => {
    const w = 320, h = 132, l = 6, r = 6, t = 10, b = 20;
    const vals = shown.map(p => p.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const lo = min - (max - min) * 0.18, hi = max + (max - min) * 0.12;
    const span = hi - lo || 1;
    const x = (i: number) => l + (i / Math.max(1, shown.length - 1)) * (w - l - r);
    const y = (v: number) => t + (1 - (v - lo) / span) * (h - t - b);
    const line = shown.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    const area = `${l},${h - b} ${line} ${w - r},${h - b}`;
    return { w, h, b, x, y, line, area };
  }, [shown]);

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current; if (!el) return;
    const box = el.getBoundingClientRect();
    const rel = ((e.clientX - box.left) / box.width) * geom.w;
    const i = Math.round(((rel - 6) / (geom.w - 12)) * (shown.length - 1));
    setHover(Math.max(0, Math.min(shown.length - 1, i)));
  };

  const totalAttr = state.attribution.reduce((a, x) => a + x.value, 0) || 1;
  const climbing = state.chart.filter(r => r.mine).length;

  return (
    <div className={css.ad} style={{ ['--epx-ad-c' as string]: c}}>
      <div className={css.adtop}>
        <button className={css.adback} onClick={onBack} aria-label="Back">←</button>
        <div className={css.adtitle}>
          <b>AUDIENCE</b>
          <span>ANALYTICS · CHART · GROWTH</span>
        </div>
        <span className={css.admark}><Mark brand={brand} /></span>
      </div>

      <div className={css.adstats}>
        <div><span>SUBSCRIBERS</span><b>{state.metrics[0]?.value ?? '—'}</b></div>
        <div><span>ON CHART</span><b className={climbing ? css.good : ''}>{climbing}</b></div>
        <div><span>CAMPAIGNS</span><b>{state.campaigns.filter(x => x.live).length}</b></div>
        <div><span>REGIONS</span><b>{state.regions.length}</b></div>
      </div>

      <div className={css.adtabs}>
        {(['ANALYTICS', 'TOP 10', 'CAMPAIGNS', 'REGIONS'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? css.on : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className={css.adscroll}>

        {/* ── ANALYTICS ── */}
        {tab === 'ANALYTICS' && (
          <>
            {onOpenMarketCommand ? (
              <section className={css.adsec}>
                <div className={css.adhead}>
                  <h2>World intelligence</h2>
                  <button className={css.adadd} type="button" onClick={onOpenMarketCommand}>OPEN →</button>
                </div>
              </section>
            ) : null}
            {!state.live ? (
              <div className={css.adpending}>
                <b>No audience data yet</b>
                <span>Charts appear once the platform is live and real subscribers exist.</span>
              </div>
            ) : (
              <>
                {/* filters in one row, above the charts */}
                <div className={css.ranges}>
                  {(['7D', '28D', '90D'] as Range[]).map(r => (
                    <button key={r} className={range === r ? css.on : ''} onClick={() => setRange(r)}>{r}</button>
                  ))}
                </div>

                <div className={css.tiles}>
                  {state.metrics.map(m => {
                    const good = m.inverse ? m.delta <= 0 : m.delta >= 0;
                    return (
                      <div className={css.tile} key={m.id}>
                        <span className={css.tlabel}>{m.label}</span>
                        <b className={css.tval}>{m.value}</b>
                        <div className={css.trow}>
                          <em className={good ? css.up : css.down}>{pct(m.delta)}</em>
                          <Spark data={m.spark} good={good} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* one series, one axis — the title names it, so no legend box */}
                <section className={css.adsec}>
                  <div className={css.adhead}>
                    <h2>{state.trendLabel}</h2>
                    <span>{range === '90D' ? 'last 90 days' : `last ${range === '7D' ? 7 : 28} days`}</span>
                  </div>
                  <div className={css.chartwrap}>
                    <svg ref={svgRef} className={css.trendchart} viewBox={`0 0 ${geom.w} ${geom.h}`}
                      onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
                      <defs>
                        <linearGradient id="adfill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity=".34" />
                          <stop offset="100%" stopColor={c} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* recessive grid */}
                      {[0, .33, .66, 1].map(f => (
                        <line key={f} x1="6" x2={geom.w - 6}
                          y1={10 + f * (geom.h - 30)} y2={10 + f * (geom.h - 30)}
                          stroke="#fff" strokeOpacity=".07" strokeWidth="1" />
                      ))}
                      <polygon points={geom.area} fill="url(#adfill)" />
                      <polyline points={geom.line} fill="none" stroke={c}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {hover !== null && (
                        <>
                          <line x1={geom.x(hover)} x2={geom.x(hover)} y1="10" y2={geom.h - geom.b}
                            stroke="#fff" strokeOpacity=".3" strokeWidth="1" />
                          <circle cx={geom.x(hover)} cy={geom.y(shown[hover].value)} r="5"
                            fill={c} stroke="#050609" strokeWidth="2" />
                        </>
                      )}
                      {/* the last point is direct-labelled — never a number on every point */}
                      <circle cx={geom.x(shown.length - 1)} cy={geom.y(shown[shown.length - 1].value)} r="4"
                        fill={c} stroke="#050609" strokeWidth="2" />
                    </svg>
                    {hover !== null && (
                      <div className={css.tip} style={{ left: `${(geom.x(hover) / geom.w) * 100}%` }}>
                        <b>{count(shown[hover].value)}</b>
                        <span>{shown[hover].label}</span>
                      </div>
                    )}
                    <div className={css.axis}>
                      <span>{shown[0]?.label}</span>
                      <span>{shown[shown.length - 1]?.label}</span>
                    </div>
                  </div>
                </section>

                {/* attribution as small multiples of one magnitude — no rainbow needed */}
                <section className={css.adsec}>
                  <div className={css.adhead}>
                    <h2>What moved it</h2>
                    <span>this week's net adds</span>
                  </div>
                  {state.attribution.map(a => (
                    <div className={css.attr} key={a.id}>
                      <div className={css.attrtop}>
                        <b>{a.label}</b>
                        <em>{count(a.value)}</em>
                      </div>
                      <div className={css.attrbar}>
                        <i style={{ width: `${Math.max(2, (a.value / totalAttr) * 100)}%` }} />
                      </div>
                      <span className={css.attrnote}>{a.note}</span>
                    </div>
                  ))}
                </section>
              </>
            )}
          </>
        )}

        {/* ── TOP 10 — the Wall of Screens, settled into a chart ── */}
        {tab === 'TOP 10' && (
          <section className={css.adsec}>
            <div className={css.adhead}>
              <h2>Top 10 today</h2>
              <span>all platforms</span>
            </div>
            <div className={css.chartlist}>
              {state.chart.map(row => {
                const move = row.prevRank === undefined ? 0 : row.prevRank - row.rank;
                return (
                  <div className={cx(css.crow, (row.mine ? css.mine : ''))} key={`${row.rank}-${row.title}`}>
                    <span className={css.crank}>{row.rank}</span>
                    <span className={cx(css.cmove, (move > 0 ? ' up' : move < 0 ? ' down' : row.prevRank === undefined ? css.new : ''))}>
                      {row.prevRank === undefined ? 'NEW' : move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : '—'}
                    </span>
                    <span className={css.cart} style={{ ['--epx-ad-h' as string]: `${row.hue}` }} />
                    <div className={css.cinfo}>
                      <b>{row.title}</b>
                      <span>{row.platform}</span>
                    </div>
                    {/* identity is never colour alone — yours is labelled too */}
                    {row.mine && <i className={css.youpill}>YOU</i>}
                  </div>
                );
              })}
            </div>
            <div className={css.adnote}>
              Every screen on the wall is in this chart. {climbing === 0
                ? 'None of them are yours yet.'
                : `${climbing} of them ${climbing === 1 ? 'is' : 'are'} yours.`}
            </div>
          </section>
        )}

        {/* ── CAMPAIGNS — the Boost / Promote pattern ── */}
        {tab === 'CAMPAIGNS' && (
          <>
            <section className={css.adsec}>
              <div className={css.adhead}>
                <h2>Campaigns</h2>
                <button className={css.adadd} onClick={onNewCampaign}>+ NEW</button>
              </div>
              {state.campaigns.length === 0 && <div className={css.adempty}>Nothing running.</div>}
              {state.campaigns.map(k => (
                <div className={cx(css.camp, (k.live ? css.live : ''))} key={k.id}>
                  <div className={css.camptop}>
                    <div className={css.campid}>
                      <b>{k.name}</b>
                      <span>{k.channel}</span>
                    </div>
                    <i className={cx(css.campstate, (k.live ? css.on : ''))}>{k.live ? 'RUNNING' : 'DRAFT'}</i>
                  </div>
                  <div className={css.campfoot}>
                    <div><span>SPEND</span><em>{money(k.spend)}</em></div>
                    {/* an estimate is a range, and says so */}
                    <div><span>EST. REACH</span><em>{count(k.reachLow)}–{count(k.reachHigh)}</em></div>
                    <div className={css.right}>
                      <span>{k.live ? 'ENDS' : 'RUNS'}</span>
                      <em>{k.live ? `${k.weeksLeft}w` : 'NOT STARTED'}</em>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className={css.adsec}>
              <div className={css.adhead}>
                <h2>Recommendation engine</h2>
                <span>what the algorithm optimises for</span>
              </div>
              <div className={css.objgrid}>
                {([
                  ['BALANCED', 'Balanced', 'Steady growth, no side effects'],
                  ['RETENTION', 'Retention', 'Keep the people you already have'],
                  ['DISCOVERY', 'Catalogue discovery', 'Push the back catalogue, spread watch time'],
                  ['BREAKOUT', 'Breakout creation', 'Bet everything on making one title huge'],
                ] as [RecObjective, string, string][]).map(([id, label, note]) => (
                  <button key={id} className={cx(css.obj, (state.objective === id ? css.on : ''))}
                    onClick={() => onObjective?.(id)}>
                    <b>{label}</b>
                    <span>{note}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── REGIONS ── */}
        {tab === 'REGIONS' && (
          <section className={css.adsec}>
            <div className={css.adhead}><h2>Territories</h2><span>sorted by subscribers</span></div>
            {state.regions.map(r => (
              <button className={css.reg} key={r.id} onClick={() => onOpenRegion?.(r)}>
                <div className={css.regtop}>
                  <b>{r.label}</b>
                  <em className={r.growthPct >= 0 ? css.up : css.down}>{pct(r.growthPct)}</em>
                </div>
                {/* magnitude: one hue, length carries the value */}
                <div className={css.regbar}><i style={{ width: `${Math.max(2, r.sharePct * 6)}%` }} /></div>
                <div className={css.regfoot}>
                  <div><span>SUBSCRIBERS</span><em>{count(r.subs)}</em></div>
                  <div><span>SHARE</span><em>{r.sharePct.toFixed(1)}%</em></div>
                  <div className={css.right}>
                    <span>LATENCY</span>
                    <em className={r.latencyMs > 120 ? css.bad : r.latencyMs > 60 ? css.warn : css.good}>{r.latencyMs}ms</em>
                  </div>
                </div>
                {r.rivals.length > 0 && (
                  <div className={css.regrivals}>Contested by {r.rivals.join(', ')}</div>
                )}
              </button>
            ))}
          </section>
        )}

        <div className={css.adfoot} />
      </div>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/AudienceDesk/AudienceDesk.module.css */
