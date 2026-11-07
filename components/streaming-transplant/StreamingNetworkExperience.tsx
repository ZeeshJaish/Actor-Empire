/**
 * EMPIRE+ v2 — PLATFORM
 *
 * The second division page. Same principle as the Content Desk: every section
 * borrows something the player has already used.
 *   OFFER    → everything the viewer is sold: ways to earn, plans and prices
 *              (editable live, staged, applied from next week), account
 *              sharing, storefront and ident — see PlatformOffer.tsx
 *   STATUS   → a public status page (status.<service>.com), 90-day uptime bars and all; since
 *              #49 the health board of servers, tech and products and the one incident list
 *              (crises and server incidents) — see PlatformStatus.tsx
 *   CAPACITY → (tab "NETWORK") the network map: markets by how well they are
 *              served, each room's field, sites, load — see PlatformNetwork.tsx
 *   TECH     → the tech tree (TechDesk.tsx: Picture, HDR, Colour, Sound, unlocked with
 *              cash and raised with energy), then the engineering tracks still built
 *              over game weeks
 *   PRODUCTS → the product suite, each active / paused / locked behind research
 *
 * A status page is the perfect vehicle for an outage, because everyone has
 * watched one go red for a service they were trying to use.
 */
import s from './presentation/screens/NetworkDesk/NetworkDesk.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useMemo, useState } from 'react';
import { Brand, Mark, brandColor, brandDeep } from './StreamingBrandVisuals';
import { PlatformOffer, type PlatformOfferActions, type PlatformOfferData, type PlatformSharingProps } from './PlatformOffer';
import { PlatformNetwork } from './PlatformNetwork';
import { PlatformStatus, platformStatusOverall, type PlatformRepairResult } from './PlatformStatus';
import type { StreamingStatusBoard, StreamingStatusIncident } from '../../services/streamingStatusBoard';
import type { StreamingIncidentRepairPath } from '../../services/streamingIncidentRepair';
import type { StreamingNetworkMapView } from '../../services/streamingNetworkMapView';
import type { StreamingTechDeskView } from '../../services/streamingTechDesk';
import type { StreamingTechId } from '../../types';
import { TechDesk, type TechDeskActions } from './TechDesk';
import { ProductShowcase } from './ProductShowcase';

/* ============================================================
   MODEL
   ============================================================ */
export type CompStatus = 'operational' | 'degraded' | 'outage' | 'maintenance';

export interface NetComponent {
  id: string;
  name: string;
  status: CompStatus;
  uptime: number;                 // % over the window
  /** What the percentage measures, when it is not uptime — "reached",
      "served well". The network signals are shares of an audience, not
      minutes of a month, and the foot of the card says which. */
  measure?: string;
  /** one entry per day, newest last: 0 fine · 1 degraded · 2 down · 3 no data

      3 exists because the strip had no way to say "nothing ran here". A
      platform with no network filled ninety days with 0 and drew ninety green
      bars beside "0.00% uptime" — the most reassuring possible way to display
      an absence. */
  history: number[];
  /** #102: the first bar is the launch's week (the service is younger than the strip), and the foot says "Launch" */
  fromLaunch?: boolean;
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
  /* BUILDING: launched in the old Product Lab and still being built (#126); it goes live at the weekly close */
  state: 'ACTIVE' | 'PAUSED' | 'LOCKED' | 'BUILDING';
  requires?: string;
  weeklyCost?: number;
  load?: number;                  // added server load %
  /** the save's product line (KIDS, LIVE…), for Pause and Resume */
  lineId?: string;
  /** weeks until a BUILDING product goes live */
  readyIn?: number;
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
  /** #92: regions with a network order under way (the Network desk's Building rows) */
  networkBuilding?: number;
  /** #97: this week's playback success, % of plays that start and hold (the room strip's PLAYBACK) */
  playbackSuccess?: number | null;
  headroom: string;               // e.g. "1.9 Tbps of 2.4 Tbps"
  technicalDebt: number;          // 0-100
}

export type PlatformDeskTab = 'OFFER' | 'CAPACITY' | 'TECH' | 'PRODUCTS' | 'STATUS';
type Tab = PlatformDeskTab;

/* The room's own pages in its order: what is sold, how it is delivered, what
   is being built, what the product does, and whether it is all working. */
const TABS: Tab[] = ['OFFER', 'CAPACITY', 'TECH', 'PRODUCTS', 'STATUS'];
const TAB_LABELS: Record<Tab, string> = {
  OFFER: 'OFFER',
  CAPACITY: 'NETWORK',
  TECH: 'TECH',
  PRODUCTS: 'PRODUCT',
  STATUS: 'STATUS',
};

export interface PlatformDeskOffer {
  data: PlatformOfferData;
  actions: PlatformOfferActions;
  sharing?: PlatformSharingProps;
}

const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`;

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
export const PlatformDesk: React.FC<{
  brand: Brand;
  state: NetworkState;
  onBack: () => void;
  initialTab?: Tab;
  onAddCity?: () => void;
  onBuild?: (t: TechTrack, doctrine: 'HARDENED' | 'BALANCED' | 'SPRINT', cost: number, weeks: number) => void;
  onCancelBuild?: (t: TechTrack) => void;
  treasury?: number;
  /** a product the save already runs, paused or resumed (#126: the old Product Lab is gone) */
  onPauseProduct?: (p: PlatformProduct, paused: boolean) => { ok: boolean; message: string };
  /** The Offer page's data and actions; without it the tab is not shown. */
  offer?: PlatformDeskOffer;
  /** The Network page's map; without it the tab keeps the plain city list. */
  network?: StreamingNetworkMapView;
  /** Opens the Technology Campus for a track, where builds are priced and
      started; without it the tab keeps its own doctrine sheet. */
  onOpenTechnology?: (t: TechTrack) => void;
  /** The tech tree (Picture, HDR, Colour, Sound) and its two actions; with it, the
      Engineering list below no longer shows Playback quality, which the tree replaces. */
  techDesk?: StreamingTechDeskView;
  techActions?: TechDeskActions;
  /** old research programmes still under way, finished in the Technology Campus */
  researchUnderWay?: number;
  onOpenResearch?: () => void;
  /** the tech the Tech tab opens on (a locked plan step's Go to Tech) */
  techFocus?: StreamingTechId | null;
  /** STATUS's health board and incident list (#49); without it the tab is the prototype's status page */
  statusBoard?: StreamingStatusBoard;
  /** an open incident's Respond: Incident Command */
  onRespondToIncident?: (incident: StreamingStatusIncident) => void;
  /** an open incident's Repair now, Fix or Wait it out (#50) */
  onRepairIncident?: (incident: StreamingStatusIncident, path: StreamingIncidentRepairPath) => PlatformRepairResult;
  /** #90: a live company's Network tab: the network changed region by region, on Build's own map and board */
  networkDesk?: React.ReactNode;
}> = ({ brand, state, onBack, initialTab, onAddCity, onBuild, onCancelBuild, onPauseProduct, offer, network, onOpenTechnology, techDesk, techActions, researchUnderWay = 0, onOpenResearch, treasury = 0, techFocus = null, statusBoard, onRespondToIncident, onRepairIncident, networkDesk }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const tabs = offer ? TABS : TABS.filter(t => t !== 'OFFER');
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab && tabs.includes(initialTab) ? initialTab : tabs[0]);
  const [buildTrack, setBuildTrack] = useState<TechTrack | null>(null);
  /* the Offer tab's plan builder sends a locked step here, opened on the tech it needs */
  const [focusTech, setFocusTech] = useState<StreamingTechId | null>(techFocus);
  const goToTech = (techId: StreamingTechId) => { setFocusTech(techId); setTab('TECH'); };

  /* the banner is derived, never set by hand: from the health board, or the strips without one */
  const overall: CompStatus = useMemo(() => platformStatusOverall(state, statusBoard), [state, statusBoard]);

  const hot = state.cities.filter(x => x.loadPct >= 85).length;
  const building = state.tech.filter(t => t.building).length;
  /* with the Tech tab, Playback (Picture, HDR, Colour, Sound), Reliability (Stabilization), Delivery (Optimisation),
     Security (#54 Trust and safety) and Recommendations (#59 Smart AI) are built there, and Content operations is no
     longer needed (#86); a build already under way stays until it finishes */
  const engineering = techDesk
    ? state.tech.filter(t => t.building || !['PLAYBACK_QUALITY', 'RELIABILITY', 'DELIVERY_CAPACITY', 'SECURITY', 'DATA_RECOMMENDATIONS', 'CONTENT_OPERATIONS'].includes(t.id))
    : state.tech;
  /* the list shows only while it has a track or old research to finish */
  const showEngineering = engineering.length > 0 || (researchUnderWay > 0 && Boolean(onOpenResearch));

  return (
    <div className={cx(s.nw, s[overall])} data-epx-root style={brandVars(brand)}>
      <div className={s.nwtop}>
        <button className={s.nwback} onClick={onBack} aria-label="Back">←</button>
        <div className={s.nwtitle}>
          <b>PLATFORM</b>
          <span>OFFER · NETWORK · TECHNOLOGY · PRODUCT</span>
        </div>
        <span className={s.nwmark}><Mark brand={brand} /></span>
      </div>

      <div className={s.nwstats}>
        <div><span>PEAK LOAD</span><b className={state.peakLoad >= 85 ? s.bad : state.peakLoad >= 70 ? s.warn : ''}>{state.peakLoad}%</b></div>
        <div><span>CITIES</span><b>{state.cities.length}</b></div>
        {/* #97 (Zeesh: "BUILDING … badal kar kuch aur"): the room's third number is how playback went this week; the
            network's builds have their own rows on NETWORK */}
        <div><span>PLAYBACK</span><b className={state.playbackSuccess == null ? '' : state.playbackSuccess < 92 ? s.bad : state.playbackSuccess < 97 ? s.warn : ''}>
          {state.playbackSuccess == null ? '—' : `${state.playbackSuccess >= 99.95 ? 100 : state.playbackSuccess.toFixed(1)}%`}
        </b></div>
        <div><span>TECH DEBT</span><b className={state.technicalDebt >= 50 ? s.bad : state.technicalDebt >= 25 ? s.warn : ''}>{state.technicalDebt}</b></div>
      </div>

      {/* #125 (Zeesh: "hata dete history pGE AND moments dikane ki jarurat nahi"): the HISTORY button and the
          Infrastructure Chronicle it opened are gone; STATUS keeps the history (lines since launch, a year of incidents) */}
      <div className={s.nwtabs}>
        {tabs.map(t => (
          <button key={t} className={tab === t ? s.on : ''} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
            {t === 'STATUS' && overall !== 'operational' && <i className={cx(s.tdot, s[overall])} />}
            {t === 'CAPACITY' && hot > 0 && <i className={cx(s.tdot, s.degraded)} />}
          </button>
        ))}
      </div>

      <div className={s.nwscroll}>

        {/* ── OFFER — what viewers get and pay, editable while live ── */}
        {tab === 'OFFER' && offer && (
          <PlatformOffer accent={c} offer={offer.data} actions={offer.actions} sharing={offer.sharing} onGoToTech={techDesk ? goToTech : undefined} />
        )}

        {/* ── STATUS — the page everyone has watched go red ── */}
        {tab === 'STATUS' && <PlatformStatus state={state} board={statusBoard} onRespond={onRespondToIncident} onRepair={onRepairIncident}
          onTestLoad={networkDesk ? () => setTab('CAPACITY') : undefined} />}

        {/* ── NETWORK — a live company changes it here, region by region (#90); before launch, the map and the door to Build ── */}
        {tab === 'CAPACITY' && networkDesk}
        {tab === 'CAPACITY' && !networkDesk && network && (
          <PlatformNetwork accent={c} map={network} state={state} onChangeNetwork={onAddCity} />
        )}

        {/* ── CAPACITY — the cities placed in the wizard (callers without a map) ── */}
        {tab === 'CAPACITY' && !network && (
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

        {/* ── TECH — the tech tree, then the upgrades that cost real weeks ── */}
        {tab === 'TECH' && techDesk && <TechDesk desk={techDesk} {...techActions} focusTechId={focusTech} />}
        {tab === 'TECH' && showEngineering && (
          <section className={s.nwsec}>
            <div className={s.nwhead}><h2>Engineering</h2><span>{techDesk ? `builds take weeks · ${building} in progress` : `${building} in progress`}</span></div>
            {researchUnderWay > 0 && onOpenResearch ? (
              <button type="button" className={s.researchrow} onClick={onOpenResearch}>
                <b>Research under way</b>
                <span>{researchUnderWay} programme{researchUnderWay === 1 ? '' : 's'} to finish. New research has moved to Tech above.</span>
                <em>OPEN →</em>
              </button>
            ) : null}
            {engineering.map(t => (
              <div className={cx(s.track, (t.building ? s.busy : ''))} key={t.id}>
                <div className={s.tktop}>
                  <div className={s.tkid}>
                    <b>{t.name}</b>
                    <span>{t.note}</span>
                  </div>
                  {/* Levels run 0–100 in the save; five pips cannot draw that, so a
                      long scale is a bar with its number, a short one keeps pips. */}
                  {t.maxLevel > 10 ? (
                    <div className={s.tkscale}>
                      <b>{t.level}<small>/{t.maxLevel}</small></b>
                      <i><em style={{ width: `${Math.min(100, t.level / t.maxLevel * 100)}%` }} /></i>
                    </div>
                  ) : (
                    <div className={s.tklvl}>
                      {Array.from({ length: t.maxLevel }).map((_, n) => (
                        <i key={n} className={n < t.level ? s.on : ''} />
                      ))}
                    </div>
                  )}
                </div>
                {t.building ? (
                  <div className={s.tkbuild}>
                    <span className={cx(s.doctrine, s[t.building.doctrine.toLowerCase()])}>{t.building.doctrine}</span>
                    <span className={s.tkweeks}>{t.building.weeksLeft} week{t.building.weeksLeft === 1 ? '' : 's'} remaining</span>
                    {t.building.doctrine === 'SPRINT' && <span className={s.tkdebt}>+ technical debt</span>}
                    {onOpenTechnology
                      ? <button className={s.tkcancel} onClick={() => onOpenTechnology(t)}>MANAGE</button>
                      : <button className={s.tkcancel} onClick={() => onCancelBuild?.(t)}>CANCEL</button>}
                  </div>
                ) : (
                  <div className={s.tkacts}>
                    {t.debt && <span className={s.tkdebt}>carrying debt</span>}
                    <button className={cx(s.tkbtn, onOpenTechnology ? s.tkopen : '')} disabled={t.level >= t.maxLevel}
                      onClick={() => (onOpenTechnology ? onOpenTechnology(t) : setBuildTrack(t))}>
                      {t.level >= t.maxLevel ? 'MAXED' : onOpenTechnology ? 'UPGRADE →' : `BUILD TIER ${t.level + 1}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── PRODUCTS — #126 (plan §19.13): every product coming in a future update, as moving thumbnails; a save's
            products from the old Product Lab run on above them ── */}
        {tab === 'PRODUCTS' && (
          <ProductShowcase yours={state.products.filter(p => p.state !== 'LOCKED')} onPause={onPauseProduct} />
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

// Compatibility alias for older prototype imports. The live game presents this
// operation as Platform while canonical infrastructure models retain Network.
export const NetworkDesk = PlatformDesk;

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/NetworkDesk/NetworkDesk.module.css */
