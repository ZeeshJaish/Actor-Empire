/**
 * EMPIRE+ v2 — NETWORK
 *
 * The second division page. Same principle as the Content Desk: every section
 * borrows something the player has already used.
 *   STATUS   → a public status page (status.<service>.com), 90-day uptime bars and all
 *   CAPACITY → the server cities placed in the wizard, with real load and latency
 *   TECH     → upgrade tracks that take game weeks to build
 *   PRODUCTS → the product suite, each active / paused / locked behind research
 *
 * A status page is the perfect vehicle for an outage, because everyone has
 * watched one go red for a service they were trying to use.
 */
import s from './presentation/screens/NetworkDesk/NetworkDesk.module.css';
import { cx } from './presentation/cx';
import React, { useMemo, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */
export type CompStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

export interface NetComponent {
  id: string;
  name: string;
  status: CompStatus;
  uptime: number;                 // % over the window
  /** one entry per day, newest last: 0 fine · 1 degraded · 2 down */
  history: number[];
}

export interface ServerCity {
  id: string; city: string; region: string;
  loadPct: number; latencyMs: number; capacityGbps: number; hub: boolean;
  racks?: number;
  role?: 'CORE ORIGIN' | 'REGIONAL HUB' | 'EDGE CACHE';
  campus?: string;
}

export interface TechTrack {
  id: string; name: string; note: string;
  level: number; maxLevel: number;
  /** set while a build is under way */
  building?: { weeksLeft: number; doctrine: 'HARDENED' | 'BALANCED' | 'SPRINT' };
  debt?: boolean;
}

export interface PlatformProduct {
  id: string; name: string; note: string;
  state: 'ACTIVE' | 'PAUSED' | 'LOCKED';
  requires?: string;
  weeklyCost?: number;
  load?: number;                  // added server load %
}

export interface Incident {
  id: string; when: string; title: string;
  severity: 'minor' | 'major'; resolvedIn: string; note: string;
}

/** what a tier of engineering costs, before doctrine is chosen */
export const techCost = (t: TechTrack) => 1_200_000 * (t.level + 1);
export const TECH_DOCTRINES: {
  id: 'HARDENED' | 'BALANCED' | 'SPRINT'; name: string; line: string;
  weeks: number; cost: number; debt: boolean;
}[] = [
  { id: 'HARDENED', name: 'Hardened', line: 'Tested twice. Nothing to pay back.', weeks: 1.35, cost: 1.15, debt: false },
  { id: 'BALANCED', name: 'Balanced', line: 'Normal engineering, normal risk.', weeks: 1, cost: 1, debt: false },
  { id: 'SPRINT', name: 'Sprint', line: 'Fast, cheap, and it will cost you later.', weeks: .6, cost: .92, debt: true },
];

export interface NetworkState {
  live: boolean;
  components: NetComponent[];
  cities: ServerCity[];
  tech: TechTrack[];
  products: PlatformProduct[];
  incidents: Incident[];
  peakLoad: number;               // %
  headroom: string;               // e.g. "1.9 Tbps of 2.4 Tbps"
  technicalDebt: number;          // 0-100
}

type Tab = 'STATUS' | 'CAPACITY' | 'TECH' | 'PRODUCTS';

const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`;

const STATUS_COPY: Record<CompStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded performance',
  outage: 'Major outage',
  maintenance: 'Under maintenance',
};

/* ============================================================
   BUILD A TIER — the doctrine choice, before any money moves
   ============================================================ */
const BuildSheet: React.FC<{
  track: TechTrack; treasury: number;
  onConfirm: (d: 'HARDENED' | 'BALANCED' | 'SPRINT', cost: number, weeks: number) => void;
  onClose: () => void;
}> = ({ track, treasury, onConfirm, onClose }) => {
  const [pick, setPick] = useState<'HARDENED' | 'BALANCED' | 'SPRINT'>('BALANCED');
  const d = TECH_DOCTRINES.find(x => x.id === pick)!;
  const base = techCost(track);
  const cost = Math.round(base * d.cost);
  const weeks = Math.max(1, Math.round(4 * d.weeks));
  const afford = cost <= treasury;

  return (
    <div className={s.tsheet} onClick={onClose}>
      <div className={s.tsbox} onClick={e => e.stopPropagation()}>
        <div className={s.tshead}>
          <div>
            <b>{track.name}</b>
            <span>TIER {track.level + 1} OF {track.maxLevel}</span>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className={s.tsnote}>{track.note}</p>

        <div className={s.tsdocs}>
          {TECH_DOCTRINES.map(x => (
            <button key={x.id} className={cx(s.tsdoc, (pick === x.id ? s.on : ''), (x.debt ? s.risky : ''))}
              onClick={() => setPick(x.id)}>
              <b>{x.name}</b>
              <span>{x.line}</span>
              <em>{Math.max(1, Math.round(4 * x.weeks))}w · {money(Math.round(base * x.cost))}</em>
            </button>
          ))}
        </div>

        <div className={s.tsline}>
          <div><span>COST NOW</span><b className={afford ? '' : s.bad}>{money(cost)}</b></div>
          <div><span>DELIVERS IN</span><b>{weeks}w</b></div>
          <div><span>TREASURY AFTER</span><b className={afford ? '' : s.bad}>{money(treasury - cost)}</b></div>
        </div>
        {d.debt && (
          <p className={s.tsdebt}>
            Sprint work is carried as technical debt. It shows on this page until
            somebody is paid to go back and finish it properly.
          </p>
        )}

        <button className={cx(s.tsgo, (afford ? '' : s.off))}
          onClick={() => afford && onConfirm(pick, cost, weeks)}>
          {afford ? `START BUILD · ${money(cost)}` : 'NOT ENOUGH IN THE TREASURY'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   THE PAGE
   ============================================================ */
export const NetworkDesk: React.FC<{
  brand: Brand;
  state: NetworkState;
  onBack: () => void;
  initialTab?: Tab;
  onAddCity?: () => void;
  onBuild?: (t: TechTrack, doctrine: 'HARDENED' | 'BALANCED' | 'SPRINT', cost: number, weeks: number) => void;
  onCancelBuild?: (t: TechTrack) => void;
  treasury?: number;
  onToggleProduct?: (p: PlatformProduct) => void;
}> = ({ brand, state, onBack, initialTab, onAddCity, onBuild, onCancelBuild, onToggleProduct, treasury = 0 }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'STATUS');
  const [buildTrack, setBuildTrack] = useState<TechTrack | null>(null);

  /* the banner is derived from the components, never set by hand */
  const overall: CompStatus = useMemo(() => {
    if (state.components.some(x => x.status === 'outage')) return 'outage';
    if (state.components.some(x => x.status === 'degraded')) return 'degraded';
    if (state.components.some(x => x.status === 'maintenance')) return 'maintenance';
    return 'operational';
  }, [state.components]);

  const hot = state.cities.filter(x => x.loadPct >= 85).length;
  const building = state.tech.filter(t => t.building).length;

  return (
    <div className={cx(s.nw, s[overall])} style={{ ['--epx-nw-c' as string]: c }}>
      <div className={s.nwtop}>
        <button className={s.nwback} onClick={onBack} aria-label="Back">←</button>
        <div className={s.nwtitle}>
          <b>NETWORK</b>
          <span>SERVERS · TECHNOLOGY · PRODUCTS</span>
        </div>
        <span className={s.nwmark}><Mark brand={brand} /></span>
      </div>

      <div className={s.nwstats}>
        <div><span>PEAK LOAD</span><b className={state.peakLoad >= 85 ? s.bad : state.peakLoad >= 70 ? s.warn : ''}>{state.peakLoad}%</b></div>
        <div><span>CITIES</span><b>{state.cities.length}</b></div>
        <div><span>BUILDING</span><b>{building}</b></div>
        <div><span>TECH DEBT</span><b className={state.technicalDebt >= 50 ? s.bad : state.technicalDebt >= 25 ? s.warn : ''}>{state.technicalDebt}</b></div>
      </div>

      <div className={s.nwtabs}>
        {(['STATUS', 'CAPACITY', 'TECH', 'PRODUCTS'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? s.on : ''} onClick={() => setTab(t)}>
            {t}
            {t === 'STATUS' && overall !== 'operational' && <i className={cx(s.tdot, s[overall])} />}
            {t === 'CAPACITY' && hot > 0 && <i className={cx(s.tdot, s.degraded)} />}
          </button>
        ))}
      </div>

      <div className={s.nwscroll}>

        {/* ── STATUS — the page everyone has watched go red ── */}
        {tab === 'STATUS' && (
          <>
            <div className={cx(s.banner, s[overall])}>
              <i className={s.bdot} />
              <div>
                <b>{overall === 'operational' ? 'All Systems Operational' : STATUS_COPY[overall]}</b>
                <span>
                  {overall === 'operational'
                    ? 'Subscribers are watching normally'
                    : 'Subscribers are seeing this right now'}
                </span>
              </div>
            </div>

            <section className={s.nwsec}>
              <div className={s.nwhead}><h2>Components</h2><span>last 90 days</span></div>
              {state.components.map(comp => (
                <div className={s.comp} key={comp.id}>
                  <div className={s.comptop}>
                    <b>{comp.name}</b>
                    <em className={s[comp.status] ?? comp.status}>{STATUS_COPY[comp.status]}</em>
                  </div>
                  {/* the uptime strip — the one element that says "status page" instantly */}
                  <div className={s.upstrip}>
                    {comp.history.map((d, n) => (
                      <i key={n} className={d === 2 ? s.down : d === 1 ? s.deg : s.ok} />
                    ))}
                  </div>
                  <div className={s.compfoot}>
                    <span>90 days ago</span>
                    <em>{comp.uptime.toFixed(2)}% uptime</em>
                    <span>today</span>
                  </div>
                </div>
              ))}
            </section>

            <section className={s.nwsec}>
              <div className={s.nwhead}><h2>Incident history</h2></div>
              {state.incidents.length === 0 && <div className={s.nwempty}>No incidents recorded.</div>}
              {state.incidents.map(i => (
                <div className={cx(s.incident, s[i.severity])} key={i.id}>
                  <div className={s.inctop}>
                    <b>{i.title}</b>
                    <em>{i.when}</em>
                  </div>
                  <p>{i.note}</p>
                  <span className={s.incres}>Resolved in {i.resolvedIn}</span>
                </div>
              ))}
            </section>
          </>
        )}

        {/* ── CAPACITY — the cities placed in the wizard, under real load ── */}
        {tab === 'CAPACITY' && (
          <section className={s.nwsec}>
            <div className={s.nwhead}>
              <h2>Data centres</h2>
              <button className={s.nwadd} onClick={onAddCity}>+ ADD CITY</button>
            </div>

            <div className={s.loadcard}>
              <div className={s.lchead}><span>PLATFORM PEAK LOAD</span><b className={state.peakLoad >= 85 ? s.bad : ''}>{state.peakLoad}%</b></div>
              <div className={s.lcbar}><i style={{ width: `${state.peakLoad}%` }} /></div>
              <span className={s.lcnote}>{state.headroom}</span>
            </div>

            {state.cities.map(ct => (
              <div className={cx(s.city, (ct.loadPct >= 85 ? s.hot : ''))} key={ct.id}>
                <div className={s.citytop}>
                  <div className={s.cityid}>
                    <b>{ct.city}</b>
                    {ct.role
                      ? <i className={s.hubpill}>{ct.role}</i>
                      : ct.hub && <i className={s.hubpill}>TIER-1 HUB</i>}
                    <span>
                      {ct.region} · {ct.capacityGbps} Gbps
                      {ct.racks ? ` · ${ct.racks} racks` : ''}
                    </span>
                    {ct.campus && <span>{ct.campus}</span>}
                  </div>
                  <div className={s.citynum}>
                    <b className={ct.loadPct >= 85 ? s.bad : ct.loadPct >= 70 ? s.warn : ''}>{ct.loadPct}%</b>
                    <span>LOAD</span>
                  </div>
                </div>
                <div className={s.cbar2}><i style={{ width: `${ct.loadPct}%` }} /></div>
                <div className={s.cityfoot}>
                  <span>Median latency</span>
                  <em className={ct.latencyMs > 120 ? s.bad : ct.latencyMs > 60 ? s.warn : s.good}>{ct.latencyMs}ms</em>
                </div>
              </div>
            ))}

            {hot > 0 && (
              <div className={s.nwwarn}>
                {hot} data centre{hot === 1 ? '' : 's'} above 85% at peak. A premiere week will
                push {hot === 1 ? 'it' : 'them'} into buffering — add a city or reserve burst capacity.
              </div>
            )}
          </section>
        )}

        {/* ── TECH — upgrades that cost real weeks ── */}
        {tab === 'TECH' && (
          <section className={s.nwsec}>
            <div className={s.nwhead}><h2>Engineering</h2><span>{building} in progress</span></div>
            {state.tech.map(t => (
              <div className={cx(s.track, (t.building ? s.busy : ''))} key={t.id}>
                <div className={s.tktop}>
                  <div className={s.tkid}>
                    <b>{t.name}</b>
                    <span>{t.note}</span>
                  </div>
                  <div className={s.tklvl}>
                    {Array.from({ length: t.maxLevel }).map((_, n) => (
                      <i key={n} className={n < t.level ? s.on : ''} />
                    ))}
                  </div>
                </div>
                {t.building ? (
                  <div className={s.tkbuild}>
                    <span className={cx(s.doctrine, s[t.building.doctrine.toLowerCase()])}>{t.building.doctrine}</span>
                    <span className={s.tkweeks}>{t.building.weeksLeft} week{t.building.weeksLeft === 1 ? '' : 's'} remaining</span>
                    {t.building.doctrine === 'SPRINT' && <span className={s.tkdebt}>+ technical debt</span>}
                    <button className={s.tkcancel} onClick={() => onCancelBuild?.(t)}>CANCEL</button>
                  </div>
                ) : (
                  <div className={s.tkacts}>
                    {t.debt && <span className={s.tkdebt}>carrying debt</span>}
                    <button className={s.tkbtn} disabled={t.level >= t.maxLevel}
                      onClick={() => setBuildTrack(t)}>
                      {t.level >= t.maxLevel ? 'MAXED' : `BUILD TIER ${t.level + 1}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── PRODUCTS — what the service actually offers ── */}
        {tab === 'PRODUCTS' && (
          <section className={s.nwsec}>
            <div className={s.nwhead}><h2>Product suite</h2><span>{state.products.filter(p => p.state === 'ACTIVE').length} live</span></div>
            <div className={s.prodgrid}>
              {state.products.map(p => (
                <button key={p.id} className={cx(s.prod, s[p.state.toLowerCase()])}
                  onClick={() => p.state !== 'LOCKED' && onToggleProduct?.(p)}>
                  <div className={s.prodtop}>
                    <b>{p.name}</b>
                    <i className={cx(s.pstate, s[p.state.toLowerCase()])}>{p.state === 'LOCKED' ? '🔒' : p.state}</i>
                  </div>
                  <span className={s.prodnote}>{p.note}</span>
                  {p.state === 'LOCKED' ? (
                    <span className={s.prodreq}>Needs {p.requires}</span>
                  ) : (
                    <div className={s.prodfoot}>
                      <span>{p.weeklyCost ? `${money(p.weeklyCost)}/wk` : 'no cost'}</span>
                      {p.load !== undefined && <em>+{p.load}% load</em>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className={s.nwfoot} />
      </div>
      {buildTrack && (
        <BuildSheet track={buildTrack} treasury={treasury}
          onConfirm={(d, cost, weeks) => { onBuild?.(buildTrack, d, cost, weeks); setBuildTrack(null); }}
          onClose={() => setBuildTrack(null)} />
      )}
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/NetworkDesk/NetworkDesk.module.css */
