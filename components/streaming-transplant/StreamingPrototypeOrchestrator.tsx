/**
 * ACTOR EMPIRE — EMPIRE+ v2 : "THE WALL OF SCREENS"
 *
 * Founding → Control Desk. Heavy-graphics redesign.
 *   WALL     — a broadcast monitor wall of rivals with one dead screen (unlock)
 *   CASE     — "the case for you": evidence slams down, verdict stamps
 *   WIZARD   — name · mark · colour · ident · manifesto · layout · regions · team · bill book
 *   FOUNDING — registration stamps → licence → channel → YOUR ident boots the dead screen
 *   DESK     — control desk with an OPERATOR / VIEWER toggle, live feed programming,
 *              and a title dossier
 *
 * Everything wears the player's chosen colour (one --brand variable).
 * Cinematics only display already-committed choices; they never roll outcomes.
 */
import css from './presentation/screens/Shell/Shell.module.css';
import { cx } from './presentation/cx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brand, BrandBoard, IDENTS, LAYOUTS, LOCKUPS, MARKS, LETTERFORMS, Mark, PROMISES, TYPEFACES,
  RegionId, Waveform, brandColor, brandDeep, letterMark, cityById,
} from './StreamingBrandVisuals';
import { InteractiveRegionMap } from '../../views/lifestyle/business/components/InteractiveRegionMap';
import {
  STREAMING_DAY_ONE_REGION_LABELS,
  getStreamingDayOneCountryPresentation,
  getStreamingDayOneLanguageLabel,
  getStreamingDayOneMarket,
  getStreamingDayOneMarketsForRegion,
  getStreamingDayOneRegionIds,
  getStreamingMarketEntryProfile,
  summarizeStreamingDayOneMarkets,
  type StreamingDayOneRegionId,
} from '../../services/streamingDayOneMarkets';
import { StreamingCountryFlagArt } from './StreamingCountryFlagArt';
import { WallOfScreens } from './StreamingWallExperience';
import { MachineWakesUp, Activation } from './StreamingCinematicsExperience';
import { PlatformHQ, HqState, HqStat, SlateItem, ServiceTitle, Division, HqEvent } from './StreamingPlatformCommandDeck';
import { ContentDesk, ContentDeskState, CatalogueTitle, SlateWeek } from './StreamingContentExperience';
import { NetworkDesk, NetworkState, NetComponent, ServerCity, TechTrack, PlatformProduct, Incident } from './StreamingNetworkExperience';
import { AudienceDesk, AudienceState, AudienceMetric, ChartRow, Campaign, RegionRow, Attribution } from './StreamingAudienceExperience';
import { Boardroom, BoardroomState, Exec as BoardExec, BoardSeat, Holder, IpoCheck, LedgerLine } from './StreamingBoardroomExperience';
import { ViewerApp, AppState, AppTitle } from './StreamingViewerExperience';
import { TitleDossier, DossierTitle } from './StreamingDossierExperience';
import { TheBuild, BuildSel, BuildInputs, RunResult, Placement, HallView, derive, presetPlacements } from './StreamingBuildoutExperience';
import { PricingDesk, PricingSel, Capabilities, defaultPricing, derivePricing } from './StreamingPricingExperience';
import { RaiseDesk, Raise, RaiseTotals, totalsOf } from './StreamingRaiseExperience';
import { PremiereNight, PremiereInputs, PremiereResult } from './StreamingPremiereExperience';
import type {
  StreamingIpoPresentationInputs as IpoInputs,
  StreamingIpoPresentationResult as IpoResult,
} from './streamingIpoPresentationModel';
import { Listing } from './StreamingListingExperience';
import { StockBug, StockPanel, quoteOf } from './StreamingStockExperience';

/* ============================================================
   CONFIG
   ============================================================ */
export interface Rival { name: string; subs: string; hue: number; markId: string; show: string; genre: string; wordmark?: boolean; color?: string; }
export interface Qualification { id: string; label: string; detail: string; met: boolean; }
/** the three real unlock requirements — Lifestyle → Streaming Platform */
export interface UnlockReq { id: string; label: string; have: number; need: number; kind: 'money' | 'stat'; }
export interface ExecCandidate {
  id: string; role: string; name: string; trait: string; skill: number;
  unlocks: string; salary: number;
  avatarUrl?: string;
  /** where you would be poaching them from, and how long they were there */
  from: string; years: number;
}
export interface ShelfTitle { id: string; name: string; kind: string; heat: number; expires?: string; }

export interface EpConfig {
  playerName: string;
  defaultName: string;
  qualifications: Qualification[];
  rivals: Rival[];
  execs: ExecCandidate[];
  registrationFee: number;
  brandLegalFee: number;
  infraDeposit: number;
  playerCash: number;
  starterTitles: ShelfTitle[];
  /** gate requirements + avatar */
  unlockReqs: UnlockReq[];
  avatarUrl?: string;
  setupCost: number;
  openingTreasury: number;
  /** When supplied by the live game, the deed total is the canonical founding transaction.
   *  Regional reach, team payroll and infrastructure choices remain operating plans rather
   *  than prototype cash charges added during incorporation. */
  fixedIncorporationTotal?: number;
}

export const DEFAULT_CONFIG: EpConfig = {
  playerName: 'Aiden Cross',
  defaultName: 'EMPIRE+',
  playerCash: 5_100_000_000,
  registrationFee: 12_000_000,
  brandLegalFee: 26_500_000,
  infraDeposit: 95_000_000,
  qualifications: [
    { id: 'PROD', label: 'Production house', detail: 'Crossfire Studios · operating', met: true },
    { id: 'CAP', label: 'Capital reserve', detail: '$5.1B liquid', met: true },
    { id: 'REP', label: 'Industry standing', detail: '82 reputation · A-list', met: true },
    { id: 'CAT', label: 'Owned catalogue', detail: '42 titles you control', met: true },
    { id: 'RIGHTS', label: 'Distribution rights', detail: '2 of 5 required', met: false },
  ],
  rivals: [
    // real platforms already present in the game world — typographic wordmarks,
    // not reproductions of their logo artwork
    { name: 'NETFLIX', subs: '278M', hue: 357, markId: 'MONOLITH', show: 'THE LAST STAND', genre: 'Action', wordmark: true },
    { name: 'DISNEY+', subs: '164M', hue: 224, markId: 'CROWN', show: 'GLASS KINGDOM', genre: 'Family', wordmark: true },
    { name: 'YOUTUBE', subs: '2.5B', hue: 0, markId: 'PULSE', show: 'EVERYTHING, ALWAYS', genre: 'Creator', wordmark: true },
    { name: 'APPLE TV+', subs: '45M', hue: 210, markId: 'APERTURE', show: 'MIDNIGHT ECHO', genre: 'Prestige', wordmark: true, color: '#e6ebf5' },
    { name: 'HULU', subs: '52M', hue: 152, markId: 'PRISM', show: 'PAPER CITIES', genre: 'Drama', wordmark: true },
    // your fictional rivals
    { name: 'VISTAPLAY', subs: '44M', hue: 276, markId: 'RIFT', show: 'AFTERGLOW', genre: 'Sci-Fi' },
    { name: 'ORBIT TV', subs: '38M', hue: 32, markId: 'ORBIT', show: 'THE QUIET HOUR', genre: 'Docs' },
    { name: 'STREAMCO', subs: '29M', hue: 44, markId: 'SIGNALTOWER', show: 'COURT OF ASH', genre: 'Period' },
  ],

  execs: [
    /* CTO — buy reliability, frontier research, cost, or speed */
    { id: 'CTO_A', role: 'CTO', name: 'Priya Raman', trait: 'Reliability zealot', skill: 88, unlocks: 'Frontier research nobody has attempted', salary: 9_000_000, from: 'Vistaplay', years: 11 },
    { id: 'CTO_B', role: 'CTO', name: 'Tomás Iglesias', trait: 'Ships before it is ready', skill: 79, unlocks: 'Half the build time, twice the outages', salary: 5_200_000, from: 'Orbit TV', years: 6 },
    { id: 'CTO_C', role: 'CTO', name: 'Wen Zhao', trait: 'Cost surgeon', skill: 82, unlocks: 'Encoding bills cut by a third, forever', salary: 6_800_000, from: 'StreamCo', years: 13 },
    { id: 'CTO_D', role: 'CTO', name: 'Nadia Belkacem', trait: 'Playback obsessive', skill: 85, unlocks: 'Playback tech tiers two research steps early', salary: 7_900_000, from: 'Netflix', years: 8 },
    /* CFO — debt, discipline, aggression, or patience */
    { id: 'CFO_A', role: 'CFO', name: 'Ken Osei', trait: 'Burn-rate hawk', skill: 86, unlocks: 'Debt financing and the IPO track', salary: 8_400_000, from: 'Orbit TV', years: 14 },
    { id: 'CFO_B', role: 'CFO', name: 'Marta Lindqvist', trait: 'Never blinks', skill: 90, unlocks: 'Hostile acquisitions and rival distress buys', salary: 11_500_000, from: 'Disney+', years: 17 },
    { id: 'CFO_C', role: 'CFO', name: 'Sam Adeyemi', trait: 'Runway monk', skill: 77, unlocks: 'Survive twice as long on the same cash', salary: 4_100_000, from: 'Hulu', years: 5 },
    { id: 'CFO_D', role: 'CFO', name: 'Ivy Chandra', trait: 'Tax architect', skill: 81, unlocks: 'Regional licensing costs shaved every quarter', salary: 6_300_000, from: 'Vistaplay', years: 10 },
    /* COO — scale, talent, crisis, or global */
    { id: 'COO_A', role: 'COO', name: 'Dana Ortiz', trait: 'Ruthless operator', skill: 83, unlocks: 'Delegation mandates and scale ops', salary: 7_600_000, from: 'StreamCo', years: 9 },
    { id: 'COO_B', role: 'COO', name: 'Julian Pryce', trait: 'Talent whisperer', skill: 80, unlocks: 'Stars sign for less and stay loyal', salary: 6_400_000, from: 'Netflix', years: 12 },
    { id: 'COO_C', role: 'COO', name: 'Rekha Nair', trait: 'Crisis specialist', skill: 87, unlocks: 'Outages and scandals resolve at half the damage', salary: 8_900_000, from: 'Disney+', years: 15 },
    { id: 'COO_D', role: 'COO', name: 'Bo Hallberg', trait: 'Expansion machine', skill: 78, unlocks: 'New regions open a full quarter faster', salary: 5_600_000, from: 'Orbit TV', years: 7 },
    /* CHIEF CONTENT OFFICER — prestige, volume, fandom, or local-language depth */
    { id: 'CCO_A', role: 'Chief Content Officer', name: 'Nia Okafor', trait: 'Prestige taste-maker', skill: 86, unlocks: 'Distinctive originals and awards strategy', salary: 8_300_000, from: 'Netflix', years: 11 },
    { id: 'CCO_B', role: 'Chief Content Officer', name: 'Leena Kapoor', trait: 'Audience portfolio architect', skill: 82, unlocks: 'Balances tentpoles, comfort viewing and churn control', salary: 7_100_000, from: 'Disney+', years: 9 },
    { id: 'CCO_C', role: 'Chief Content Officer', name: 'Gabriel Ortiz', trait: 'Franchise world-builder', skill: 80, unlocks: 'Turns breakout titles into connected slates', salary: 6_400_000, from: 'Hulu', years: 8 },
    { id: 'CCO_D', role: 'Chief Content Officer', name: 'Hana Sato', trait: 'Global-local curator', skill: 84, unlocks: 'Local-language titles travel farther', salary: 7_700_000, from: 'Vistaplay', years: 10 },
  ],
  unlockReqs: [
    { id: 'cash', label: 'Liquid cash', have: 92_400_000, need: 85_000_000, kind: 'money' },
    { id: 'fame', label: 'Fame', have: 71, need: 65, kind: 'stat' },
    { id: 'rep', label: 'Reputation', have: 58, need: 55, kind: 'stat' },
  ],
  setupCost: 70_000_000,
  openingTreasury: 15_000_000,
  starterTitles: [
    { id: 't1', name: 'DEAD SIGNAL', kind: 'Original · Film', heat: 94 },
    { id: 't2', name: 'The Cheat Code', kind: 'Owned · Thriller', heat: 92 },
    { id: 't3', name: 'Paper Cities', kind: 'Owned · Drama', heat: 74 },
    { id: 't4', name: 'Neon Harbor', kind: 'Owned · Action', heat: 68 },
    { id: 't5', name: 'Classics Vault', kind: 'Licensed · 40 titles', heat: 51, expires: '2 yr window' },
  ],
};

export type Phase = 'WALL' | 'CASE' | 'WIZARD' | 'FOUNDING' | 'DESK' | 'BUILD' | 'PREMIERE' | 'IPO' | 'VIEWER' | 'CONTENT' | 'NETWORK' | 'AUDIENCE' | 'BOARDROOM';

export interface EpResult {
  brand: Brand; regions: RegionId[]; execIds: string[]; total: number;
}

/* ============================================================
   HELPERS
   ============================================================ */
const fmt = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2).replace(/0$/, '')}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  return `$${Math.round(v / 1e3)}K`;
};
const fmtPeople = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${Math.round(n / 1e6)}M` : `${n}`;
/** counts, not money — subscribers read as 1.2M / 340K, never $1.2M */
const fmtCount = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`;

const MARKET_REGION_ACCENTS: Record<StreamingDayOneRegionId, string> = {
  NORTH_AMERICA: '#60a5fa',
  SOUTH_AMERICA: '#34d399',
  EUROPE: '#a78bfa',
  AFRICA: '#fbbf24',
  ASIA: '#fb7185',
  OCEANIA: '#22d3ee',
};

const STREAMING_RIVAL_COLORS: Record<string, string> = {
  NETFLIX: '#e50914',
  AMAZON_PRIME: '#00a8e1',
  DISNEY_PLUS: '#2563eb',
  YOUTUBE: '#ff0033',
  HULU: '#1ce783',
  APPLE_TV: '#e5e7eb',
};

function useTimers() {
  const t = useRef<number[]>([]);
  useEffect(() => () => { t.current.forEach(x => window.clearTimeout(x)); }, []);
  return useCallback((fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); t.current.push(id); return id; }, []);
}

const Count: React.FC<{ to: number; ms?: number; fmt?: (n: number) => string }> = ({ to, ms = 1200, fmt: f }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    const s = Date.now();
    const iv = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - s) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) window.clearInterval(iv);
    }, 40);
    return () => window.clearInterval(iv);
  }, [to, ms]);
  return <>{f ? f(v) : v.toLocaleString()}</>;
};

/* ============================================================
   SCENE 1 — THE WALL OF SCREENS
   ============================================================ */
/* ============================================================
   SCENE 3 — THE WIZARD
   ============================================================ */
/** paid extras, itemised on the deed you sign at the end */
export const IDENT_FEE = 4_500_000;

/** one chair per position; each has its own pool of candidates */
export const POSITIONS = ['CTO', 'CFO', 'COO', 'Chief Content Officer'] as const;

const STEPS = ['NAME', 'MARK', 'TYPE', 'COLOUR', 'IDENT', 'MANIFESTO', 'LAYOUT', 'REGIONS', 'TEAM', 'BILL'] as const;
type Step = typeof STEPS[number];
const STEP_META: Record<Step, [string, string]> = {
  NAME: ['Name It', 'What the world will type'],
  MARK: ['The Mark', 'One shape, everywhere, forever'],
  TYPE: ['The Typeface', 'The voice your name is set in'],
  COLOUR: ['The Colour', 'Everything you own will wear it'],
  IDENT: ['The Ident', 'Three seconds before everything you release'],
  MANIFESTO: ['The Manifesto', 'What you promise — and what they will demand'],
  LAYOUT: ['The Storefront', 'How subscribers meet your catalogue'],
  REGIONS: ['Day-One Markets', 'Choose where viewers can subscribe first'],
  TEAM: ['The Table', 'Who else has a chair'],
  BILL: ['Incorporation', 'Sign, pay, exist'],
};

export const StreamingFoundingWizardScene: React.FC<{
  cfg: EpConfig; brand: Brand; setBrand: React.Dispatch<React.SetStateAction<Brand>>;
  regions: RegionId[]; setRegions: React.Dispatch<React.SetStateAction<RegionId[]>>;
  marketIds: string[]; setMarketIds: React.Dispatch<React.SetStateAction<string[]>>;
  execIds: string[]; setExecIds: React.Dispatch<React.SetStateAction<string[]>>;
  onIncorporate: (total: number) => void; onBack: () => void;
}> = ({ cfg, brand, setBrand, regions, setRegions, marketIds, setMarketIds, execIds, setExecIds, onIncorporate, onBack }) => {
  const [i, setI] = useState(0);
  const [drill, setDrill] = useState<RegionId | null>(null);
  const [showMarketIntelligence, setShowMarketIntelligence] = useState(false);
  const [entryRulesMarketId, setEntryRulesMarketId] = useState<string | null>(null);
  const entryRulesCloseRef = useRef<HTMLButtonElement>(null);
  const entryRulesSheetRef = useRef<HTMLElement>(null);
  const entryRulesReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  /* Incorporation is the one irreversible act in the flow, so it takes two
     deliberate taps: SIGN inks the signature, then pressing the seal commits.
     Press-and-hold was unreliable across devices; plain taps are not. */
  const [inked, setInked] = useState(false);   // signature drawn
  const [armed, setArmed] = useState(false);   // ink finished — the seal is now pressable
  const [sealed, setSealed] = useState(false); // committed
  const signTimers = useRef<number[]>([]);
  const step = STEPS[i];
  const [title, sub] = STEP_META[step];
  const c = brandColor(brand);
  const fileRef = useRef<HTMLInputElement>(null);
  const identRef = useRef<HTMLInputElement>(null);
  const manifestoRef = useRef<HTMLTextAreaElement>(null);
  const promise = PROMISES.find(p => p.id === brand.promiseId);
  const manifestoText = brand.publicManifesto.trim() || promise?.manifesto || '';
  const manifestoIsCustom = Boolean(promise && manifestoText !== promise.manifesto);
  const [editingManifesto, setEditingManifesto] = useState(false);
  const [manifestoByPromise, setManifestoByPromise] = useState<Record<string, string>>(() => ({
    [brand.promiseId]: manifestoText,
  }));

  useEffect(() => {
    if (!editingManifesto) return;
    manifestoRef.current?.focus();
    manifestoRef.current?.setSelectionRange(manifestoRef.current.value.length, manifestoRef.current.value.length);
  }, [editingManifesto]);

  const closeEntryRules = useCallback(() => {
    setEntryRulesMarketId(null);
    window.setTimeout(() => entryRulesReturnFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!entryRulesMarketId) return;
    entryRulesCloseRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEntryRules();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        entryRulesSheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeEntryRules, entryRulesMarketId]);

  const updateManifesto = (value: string) => {
    const next = value.slice(0, 160);
    setManifestoByPromise(current => ({ ...current, [brand.promiseId]: next }));
    setBrand(current => ({ ...current, publicManifesto: next }));
  };

  const resetManifesto = () => {
    const preset = promise?.manifesto || '';
    setManifestoByPromise(current => ({ ...current, [brand.promiseId]: preset }));
    setBrand(current => ({ ...current, publicManifesto: preset }));
  };

  const choosePromise = (nextPromise: typeof PROMISES[number]) => {
    const nextManifesto = manifestoByPromise[nextPromise.id] ?? nextPromise.manifesto;
    setEditingManifesto(false);
    setBrand(current => ({
      ...current,
      promiseId: nextPromise.id,
      publicManifesto: nextManifesto,
    }));
  };

  const marketSummary = useMemo(() => summarizeStreamingDayOneMarkets(marketIds), [marketIds]);
  const selectedMarketRegions = useMemo(
    () => getStreamingDayOneRegionIds(marketIds) as RegionId[],
    [marketIds],
  );
  const activeMarketRegion = (drill || selectedMarketRegions[0] || 'NORTH_AMERICA') as StreamingDayOneRegionId;
  const activeRegionMarkets = useMemo(
    () => getStreamingDayOneMarketsForRegion(activeMarketRegion),
    [activeMarketRegion],
  );
  const activeRegionSelectedMarketIds = useMemo(
    () => activeRegionMarkets.filter(market => marketIds.includes(market.id)).map(market => market.id),
    [activeRegionMarkets, marketIds],
  );
  const activeRegionSummary = useMemo(
    () => summarizeStreamingDayOneMarkets(activeRegionSelectedMarketIds),
    [activeRegionSelectedMarketIds],
  );
  const activeRegionAllSelected = activeRegionMarkets.length > 0
    && activeRegionSelectedMarketIds.length === activeRegionMarkets.length;
  const activeRegionAccent = MARKET_REGION_ACCENTS[activeMarketRegion];
  const entryRulesMarket = entryRulesMarketId ? getStreamingDayOneMarket(entryRulesMarketId) : null;
  const entryRulesProfile = entryRulesMarket ? getStreamingMarketEntryProfile(entryRulesMarket.id) : null;
  const marketScale = marketSummary.regionCount === 0 ? '—'
    : marketSummary.regionCount === 1 ? 'FOCUSED'
      : marketSummary.regionCount <= 3 ? 'MULTI-REGION' : 'WORLDWIDE';
  const hires = cfg.execs.filter(e => execIds.includes(e.id));
  const signing = hires.reduce((s, e) => s + e.salary, 0);
  /* every optional upgrade taken in the wizard becomes a line on the deed */
  const extras: { id: string; label: string; fee: number }[] = [];
  if (brand.identMode === 'full') {
    extras.push({ id: 'ident', label: `Ident sting · ${brand.identLen}s, licensed for all originals`, fee: IDENT_FEE });
  }
  const extrasCost = extras.reduce((a, e) => a + e.fee, 0);
  const total = cfg.fixedIncorporationTotal
    ?? cfg.registrationFee + cfg.brandLegalFee + cfg.infraDeposit + signing + extrasCost;
  const canonicalFoundingTransaction = cfg.fixedIncorporationTotal !== undefined;

  const commitMarketIds = (nextIds: string[]) => {
    const uniqueIds = Array.from(new Set(nextIds));
    setMarketIds(uniqueIds);
    setRegions(getStreamingDayOneRegionIds(uniqueIds) as RegionId[]);
  };

  const canNext = step === 'NAME' ? brand.name.trim().length >= 2
    : step === 'REGIONS' ? marketIds.length > 0 : true;

  const sign = () => {
    if (inked) return;
    setInked(true);
    /* The seal cannot be pressed while the ink is still flowing. This is the
       ceremony, and it also makes it impossible for the tap that signs to also
       commit — React can reuse the button node between the two states. */
    signTimers.current.push(window.setTimeout(() => setArmed(true), 900));
  };
  const pressSeal = () => {
    if (!armed || sealed) return;
    setSealed(true);
    signTimers.current.push(window.setTimeout(() => onIncorporate(total), 1000)); // let the seal press in
  };
  /* Without this, navigating away mid-ceremony leaves a timer that incorporates
     the company after the player has already left the wizard. */
  useEffect(() => () => { signTimers.current.forEach(window.clearTimeout); signTimers.current = []; }, []);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => setBrand(b => ({ ...b, customMark: String(rd.result) }));
    rd.readAsDataURL(f);
  };

  return (
    <div className={css.scene}>
      <div className={css.topbar}>
        <button className={css.back} onClick={() => i === 0 ? onBack() : setI(i - 1)}>←</button>
        <div className={css.mid}><span className={css.kick}>{i + 1} / {STEPS.length}</span><b>{title}</b><span className={css.sub}>{sub}</span></div>
        <div style={{ width: 38 }} />
      </div>
      <div className={css.scrub}>
        <div className={css.track}>
          <i className={css.rail} />
          <i className={css.played} style={{ width: `${(i / (STEPS.length - 1)) * 100}%` }} />
          {STEPS.map((s, k) => (
            <button key={s} type="button" title={STEP_META[s][0]}
              className={cx(css.tick, (k <= i ? css.done : ''))}
              style={{ left: `${(k / (STEPS.length - 1)) * 100}%` }}
              onClick={() => k < i && setI(k)} />
          ))}
          <i className={css.head} style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }} />
        </div>
        <span className={css.tc}>{String(i + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>
      </div>

      <div className={css.scroll}>
        <BrandBoard brand={brand} regionCount={regions.length} />

        {step === 'NAME' && (
          <div className={css.pad}>
            <input className={css.nameinput} value={brand.name} maxLength={16} autoFocus placeholder={cfg.defaultName}
              onChange={e => setBrand(b => ({ ...b, name: e.target.value.toUpperCase() }))} />
            <div className={css.hint}>Short names survive on a billboard. You get “+” free.</div>
            <div className={css.chips}>
              {[cfg.defaultName, `${cfg.playerName.split(' ')[0].toUpperCase()}+`, 'NOVA', 'THE SIGNAL', 'PRIME CUT'].map(n => (
                <button key={n} onClick={() => setBrand(b => ({ ...b, name: n }))}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {step === 'MARK' && (
          <div className={css.pad}>
            <div className={css.seclabel}>LETTERFORMS · from “{(brand.name.trim()[0] || 'E').toUpperCase()}”</div>
            <div className={css.markgrid}>
              {LETTERFORMS.map(s => {
                const id = `LETTER_${s}`;
                return (
                  <button key={id} className={cx(css.markpick, (brand.markId === id && !brand.customMark ? css.on : ''))}
                    onClick={() => setBrand(b => ({ ...b, markId: id, customMark: null }))}>
                    <span style={{ color: c }}><svg viewBox="0 0 48 48">{letterMark((brand.name.trim()[0] || 'E').toUpperCase(), s)}</svg></span>
                  </button>
                );
              })}
            </div>
            {['Geometric', 'Emblem', 'Abstract'].map(group => (
              <React.Fragment key={group}>
                <div className={css.seclabel}>{group.toUpperCase()}</div>
                <div className={css.markgrid}>
                  {Object.entries(MARKS).filter(([, m]) => m.group === group).map(([id, m]) => (
                    <button key={id} className={cx(css.markpick, (brand.markId === id && !brand.customMark ? css.on : ''))}
                      onClick={() => setBrand(b => ({ ...b, markId: id, customMark: null }))}>
                      <span style={{ color: c }}><svg viewBox="0 0 48 48">{m.svg}</svg></span>
                    </button>
                  ))}
                </div>
              </React.Fragment>
            ))}
            <div className={css.seclabel}>YOUR OWN</div>
            <button className={cx(css.upload, (brand.customMark ? css.on : ''))} onClick={() => fileRef.current?.click()}>
              {brand.customMark
                ? <><img src={brand.customMark} alt="" /><span>Custom mark loaded · tap to replace</span></>
                : <><i>+</i><span>Upload a logo (PNG / SVG)</span></>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          </div>
        )}

        {step === 'COLOUR' && (
          <div className={css.pad}>
            <div className={css.huepreview} style={{ ['--epx-ep2-rc' as string]: 'var(--rc)', ['--epx-ep2-rot' as string]: 'var(--rot)', ['--epx-ep2-c2' as string]: 'var(--c2)',  background: `linear-gradient(140deg, ${c}, ${brandDeep(brand)})` }}>
              <b>{`hsl(${brand.hue} ${brand.sat}% 58%)`}</b>
            </div>
            <div className={css.seclabel}>HUE</div>
            <input className={css.hueslider} type="range" min={0} max={359} value={brand.hue}
              onChange={e => setBrand(b => ({ ...b, hue: Number(e.target.value) }))} />
            <div className={css.seclabel}>INTENSITY</div>
            <input className={css.satslider} type="range" min={25} max={100} value={brand.sat}
              style={{ ['--epx-ep2-c' as string]: c }}
              onChange={e => setBrand(b => ({ ...b, sat: Number(e.target.value) }))} />
            <div className={css.seclabel}>PRESETS</div>
            <div className={css.swatches}>
              {[[352, 82], [268, 74], [190, 78], [26, 88], [150, 62], [214, 80], [45, 90], [0, 0]].map(([h, s]) => (
                <button key={`${h}-${s}`} className={brand.hue === h && brand.sat === s ? css.on : ''}
                  style={{ background: `hsl(${h} ${s}% 58%)` }}
                  onClick={() => setBrand(b => ({ ...b, hue: h, sat: s }))} />
              ))}
            </div>
          </div>
        )}

        {step === 'TYPE' && (
          <div className={css.pad}>
            <div className={css.seclabel}>WORDMARK TYPEFACE</div>
            {Object.entries(TYPEFACES).map(([id, t]) => (
              <button key={id} className={cx(css.typerow, (brand.typeId === id ? css.on : ''))}
                onClick={() => setBrand(b => ({ ...b, typeId: id }))}>
                <span className={css.spec} style={{
                  fontFamily: t.stack, fontWeight: t.weight,
                  letterSpacing: t.spacing, textTransform: t.transform,
                }}>{brand.name.trim() || 'UNNAMED'}</span>
                <div className={css.tmeta}><b>{t.label}</b><span>{t.note}</span></div>
              </button>
            ))}
            <div className={css.seclabel}>LOCKUP</div>
            <div className={css.pickrow}>
              {Object.entries(LOCKUPS).map(([id, l]) => (
                <button key={id} className={cx(css.pick, (brand.lockupId === id ? css.on : ''))}
                  onClick={() => setBrand(b => ({ ...b, lockupId: id }))}>
                  <b>{l.label}</b><span>{l.note}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'IDENT' && (
          <div className={css.pad}>
            <div className={css.seclabel}>WHAT PLAYS BEFORE YOUR TITLES</div>
            <div className={css.identmodes}>
              {([
                ['none', 'Nothing', 'Titles start instantly', 0],
                ['badge', 'Corner badge', 'Your mark watermarks the player', 0],
                ['full', 'Full ident sting', 'Plays before every original', IDENT_FEE],
              ] as const).map(([mode, label, note, fee]) => (
                <button key={mode} className={cx(css.imode, (brand.identMode === mode ? css.on : ''))}
                  onClick={() => setBrand(b => ({ ...b, identMode: mode }))}>
                  {/* each option previewed inside a real player frame */}
                  <div className={css.ipreview}>
                    <i className={css.iscrub} />
                    {mode === 'none' && <i className={css.iblank} />}
                    {mode === 'badge' && <span className={css.ibadge}><Mark brand={brand} /></span>}
                    {mode === 'full' && <span className={css.ifull}><Mark brand={brand} /></span>}
                  </div>
                  <div className={css.imeta}><b>{label}</b><span>{note}</span></div>
                  <em className={fee ? css.paid : ''}>{fee ? `+${fmt(fee)}` : 'FREE'}</em>
                </button>
              ))}
            </div>
            <div className={css.tradeoff}>
              {brand.identMode === 'full'
                ? 'Builds recall — but it is friction before every play, and bingers will feel it.'
                : brand.identMode === 'badge'
                  ? 'Invisible friction, weaker recall. What most services settle on.'
                  : 'Fastest possible start. Nobody will ever learn your mark from the player.'}
            </div>

            {brand.identMode === 'full' && (
              <>
                <div className={css.seclabel}>THE STING</div>
                {Object.entries(IDENTS).map(([id, d]) => (
                  <button key={id} className={cx(css.identrow, (brand.identId === id && !brand.customIdent ? css.on : ''))}
                    onClick={() => setBrand(b => ({ ...b, identId: id, customIdent: null }))}>
                    <Waveform identId={id} playing={brand.identId === id && !brand.customIdent} color={c} />
                    <div><b>{d.label}</b><span>{d.note}</span></div>
                    <em>{brand.identId === id && !brand.customIdent ? 'PLAYING' : 'PLAY'}</em>
                  </button>
                ))}
                <div className={css.seclabel}>LENGTH</div>
                <div className={css.pickrow}>
                  {([2, 4] as const).map(len => (
                    <button key={len} className={cx(css.pick, (brand.identLen === len ? css.on : ''))}
                      onClick={() => setBrand(b => ({ ...b, identLen: len }))}>
                      <b>{len} seconds</b><span>{len === 2 ? 'A flash — barely noticed' : 'A statement — impossible to miss'}</span>
                    </button>
                  ))}
                </div>
                <button className={cx(css.upload, (brand.customIdent ? css.on : ''))} onClick={() => identRef.current?.click()}>
                  <i>♪</i><span>{brand.customIdent ? `${brand.customIdent} · tap to replace` : 'Upload your own ident (audio)'}</span>
                </button>
                <input ref={identRef} type="file" accept="audio/*" hidden
                  onChange={e => { const f = e.target.files?.[0]; if (f) setBrand(b => ({ ...b, customIdent: f.name })); }} />
              </>
            )}
          </div>
        )}

        {step === 'MANIFESTO' && (
          <div className={css.pad}>
            <div className={css.manifesto} style={{ ['--epx-ep2-c' as string]: c }}>
              <div className={css.manifestoTools}>
                <span>PUBLIC MANIFESTO</span>
                <div>
                  {manifestoIsCustom && <button type="button" onClick={resetManifesto}>RESET</button>}
                  <button type="button" onClick={() => setEditingManifesto(value => !value)}>
                    {editingManifesto ? 'DONE' : 'EDIT'}
                  </button>
                </div>
              </div>
              <span className={css.q}>“</span>
              {editingManifesto ? (
                <label className={css.manifestoEditor} htmlFor="streaming-public-manifesto">
                  <span>Write the sentence viewers and the press will remember</span>
                  <textarea
                    ref={manifestoRef}
                    id="streaming-public-manifesto"
                    maxLength={160}
                    rows={3}
                    value={brand.publicManifesto}
                    onChange={event => updateManifesto(event.target.value)}
                  />
                  <em>{brand.publicManifesto.length} / 160</em>
                </label>
              ) : (
                <button type="button" className={css.manifestoQuote} onClick={() => setEditingManifesto(true)}>
                  <b>{manifestoText}</b>
                  <span>Tap to rewrite your public words</span>
                </button>
              )}
              <span className={css.sig}>— {brand.name.trim() || cfg.defaultName}, founding charter</span>
              <div className={css.manifestoStatus} aria-live="polite">
                <b>STRATEGY · {promise?.label}</b>
                <span>{manifestoIsCustom ? 'PUBLIC WORDING CUSTOMIZED' : 'PRESET WORDING'}</span>
              </div>
            </div>
            <div className={css.seclabel}>THE EXPECTATION CONTRACT</div>
            <div className={css.expect}>
              {promise?.expects.map(e => <div key={e} className={css.ex}><i>▸</i>{e}</div>)}
              <div className={cx(css.ex, css.good)}><i>✓</i><b>Forgives:</b> {promise?.forgives}</div>
              <div className={cx(css.ex, css.bad)}><i>!</i><b>Punishes:</b> {promise?.punishes}</div>
            </div>
            <div className={css.seclabel}>CHOOSE YOUR PROMISE</div>
            <div className={css.promises}>
              {PROMISES.map(p => (
                <button key={p.id} className={cx(css.prom, (brand.promiseId === p.id ? css.on : ''))}
                  onClick={() => choosePromise(p)}>{p.label}</button>
              ))}
            </div>
            <div className={css.promiseLogicNote}>
              Your words are public. <b>{promise?.label}</b> remains the gameplay strategy used for audience, content, churn and press reactions.
            </div>
          </div>
        )}

        {step === 'LAYOUT' && (
          <div className={css.pad}>
            {LAYOUTS.map(l => (
              <button key={l.id} className={cx(css.layoutrow, (brand.layoutId === l.id ? css.on : ''), (l.lock ? css.locked : ''))}
                onClick={() => !l.lock && setBrand(b => ({ ...b, layoutId: l.id }))}>
                <div className={css.thumb}>{layoutThumb(l.id, c)}</div>
                <div className={css.txt}><b>{l.label}</b><span>{l.note}</span></div>
                {l.lock && <em className={css.lock}>🔒 {l.lock}</em>}
              </button>
            ))}
          </div>
        )}

        {step === 'REGIONS' && (
          <div className={css.pad}>
            <section className={css.marketIntro} aria-labelledby="day-one-markets-title">
              <div>
                <span>OPENING FOOTPRINT</span>
                <h3 id="day-one-markets-title">Where can people subscribe?</h3>
              </div>
              <b>{marketSummary.marketCount || '—'} market{marketSummary.marketCount === 1 ? '' : 's'}</b>
              <p>Choose countries now. Servers, racks and network spending are designed separately before launch.</p>
            </section>
            <div className={css.streamingCanonicalMap}>
              <InteractiveRegionMap
                selectedRegionIds={selectedMarketRegions}
                activeRegionId={activeMarketRegion}
                visualTone="production"
                showPreview={false}
                onSelectRegion={regionId => {
                  const region = regionId as RegionId;
                  setDrill(region);
                }}
              />
              <div className={css.marketMapStatus} aria-live="polite">
                <span>VIEWING</span>
                <b>{STREAMING_DAY_ONE_REGION_LABELS[activeMarketRegion]}</b>
                <em>{activeRegionSelectedMarketIds.length}/{activeRegionMarkets.length} selected</em>
              </div>
            </div>

            <section className={css.marketRegionPanel} style={{ ['--epx-ep2-c' as string]: activeRegionAccent }}>
              <div className={css.marketRegionHead}>
                <div>
                  <span>MARKET VIEW</span>
                  <h3>{STREAMING_DAY_ONE_REGION_LABELS[activeMarketRegion]}</h3>
                </div>
                <button
                  type="button"
                  className={css.marketRegionAction}
                  onClick={() => {
                    const ids = activeRegionMarkets.map(market => market.id);
                    commitMarketIds(activeRegionAllSelected
                      ? marketIds.filter(id => !ids.includes(id))
                      : [...marketIds, ...ids]);
                  }}
                >
                  {activeRegionAllSelected ? 'REMOVE ALL' : `ADD ALL ${activeRegionMarkets.length}`}
                </button>
              </div>
              <div className={css.marketRegionGuide}>
                <p>Swipe through the markets. Add only the countries you want on opening day.</p>
                <span aria-hidden="true">SWIPE →</span>
              </div>
              <div className={css.marketCountryDeck} aria-label={`${STREAMING_DAY_ONE_REGION_LABELS[activeMarketRegion]} markets`}>
                {activeRegionMarkets.map((market, marketIndex) => {
                  const selected = marketIds.includes(market.id);
                  const presentation = getStreamingDayOneCountryPresentation(market.id);
                  const entryProfile = getStreamingMarketEntryProfile(market.id);
                  const localNameIsDifferent = presentation.localName
                    && presentation.localName.toLocaleLowerCase() !== market.country.toLocaleLowerCase();
                  return (
                    <article
                      key={market.id}
                      className={cx(css.marketCountryCard, selected ? css.on : '')}
                      style={{ ['--market-card-accent' as string]: activeRegionAccent }}
                    >
                      <div className={css.marketCountryHero}>
                        <StreamingCountryFlagArt marketId={market.id} className={css.marketFlagArt} />
                        <span className={css.marketCountryCode} aria-hidden="true">{market.id}</span>
                        <div className={css.marketCountryCardTop}>
                          <div>
                            <span>OPENING MARKET · {String(marketIndex + 1).padStart(2, '0')}</span>
                            <h4>{market.country}</h4>
                            {localNameIsDifferent ? <em>{presentation.localName}</em> : null}
                          </div>
                          <b className={css.marketCountryRisk} data-level={market.competition}>{market.competition}</b>
                        </div>
                        <div className={css.marketCountryHeroFooter}>
                          <span><i aria-hidden="true" /> DAY-ONE TERRITORY</span>
                        </div>
                      </div>
                      <div className={css.marketCountryAudience}>
                        <div><strong>{fmtPeople(market.streamingAudience)}</strong><span>streaming viewers</span></div>
                        <div><strong>+{market.annualGrowthPercent}%</strong><span>yearly growth</span></div>
                      </div>
                      <p>{market.marketNote}</p>
                      <div className={css.marketLanguageStrip} aria-label={`Languages: ${market.languages.join(', ')}`}>
                        {market.languages.map(language => (
                          <span key={language} title={language}>{getStreamingDayOneLanguageLabel(language)}</span>
                        ))}
                      </div>
                      <div className={css.marketCountryFacts}>
                        <div><span>RIGHTS</span><b>{fmt(market.openingRightsEstimate)}</b></div>
                        <div><span>LAUNCH EFFORT</span><b>{market.launchDifficulty === 'HARD' ? 'High' : market.launchDifficulty === 'MODERATE' ? 'Manageable' : 'Light'}</b></div>
                        <div><span>TOP RIVAL</span><b>{market.rivals[0]?.name || 'Open field'} · {market.rivals[0]?.watchSharePercent || 0}%</b></div>
                      </div>
                      <div className={css.marketLocalVersion}><span>LOCAL LAUNCH</span><b>{market.localizationNote}</b></div>
                      <button
                        type="button"
                        className={css.marketEntryRulesButton}
                        aria-haspopup="dialog"
                        onClick={event => {
                          entryRulesReturnFocusRef.current = event.currentTarget;
                          setEntryRulesMarketId(market.id);
                        }}
                      >
                        <span><b>RULES &amp; TAXES</b><em>{entryProfile.taxLoad.toLowerCase()} tax · {entryProfile.approvalLoad.toLowerCase()} review</em></span>
                        <i aria-hidden="true">›</i>
                      </button>
                      <button
                        type="button"
                        className={css.marketCountryToggle}
                        aria-pressed={selected}
                        onClick={() => commitMarketIds(selected
                          ? marketIds.filter(id => id !== market.id)
                          : [...marketIds, market.id])}
                      >
                        <span aria-hidden="true">{selected ? '✓' : '+'}</span>
                        {selected ? 'INCLUDED ON OPENING DAY' : 'ADD TO OPENING DAY'}
                      </button>
                    </article>
                  );
                })}
              </div>
              <div className={css.marketRegionImpact} aria-live="polite">
                <div className={css.marketRegionImpactHead}>
                  <div><span>REGION IMPACT</span><b>{STREAMING_DAY_ONE_REGION_LABELS[activeMarketRegion]} opening</b></div>
                  <strong>{activeRegionSelectedMarketIds.length}/{activeRegionMarkets.length}</strong>
                </div>
                <p>{activeRegionSelectedMarketIds.length
                  ? `${activeRegionSelectedMarketIds.length} market${activeRegionSelectedMarketIds.length === 1 ? '' : 's'} selected. ${activeRegionSummary.verdict}`
                  : 'Browse freely. Nothing in this region is part of opening day yet.'}</p>
                <div className={css.marketRegionImpactStats}>
                  <div><span>VIEWERS</span><b>{activeRegionSelectedMarketIds.length ? fmtPeople(activeRegionSummary.streamingAudience) : '—'}</b></div>
                  <div><span>RIGHTS</span><b>{activeRegionSelectedMarketIds.length ? fmt(activeRegionSummary.openingRightsEstimate) : '—'}</b></div>
                  <div><span>LANGUAGES</span><b>{activeRegionSelectedMarketIds.length ? activeRegionSummary.languageCount : '—'}</b></div>
                  <div><span>GROWTH</span><b>{activeRegionSelectedMarketIds.length ? `+${activeRegionSummary.averageGrowthPercent.toFixed(1)}%` : '—'}</b></div>
                </div>
              </div>
            </section>

            <section className={css.marketSummary} style={{ ['--epx-ep2-c' as string]: c }}>
              <div className={css.marketSummaryHead}>
                <div>
                  <span>YOUR DAY-ONE FOOTPRINT</span>
                  <h3>{marketSummary.marketCount ? `${marketSummary.marketCount} markets · ${marketSummary.regionCount} regions` : 'Nothing selected yet'}</h3>
                </div>
                <b data-level={marketSummary.launchDifficulty}>{marketSummary.launchDifficulty}</b>
              </div>
              <p>{marketSummary.verdict}</p>
              {marketSummary.marketCount ? <small className={css.marketEstimateNote}>Planning estimates only · no market or server cost is charged during incorporation.</small> : null}
              <div className={css.marketStats}>
                <div><span>STREAMING VIEWERS</span><b><Count to={marketSummary.streamingAudience} fmt={fmtPeople} /></b></div>
                <div><span>YEARLY GROWTH</span><b>{marketSummary.marketCount ? `${marketSummary.averageGrowthPercent.toFixed(1)}%` : '—'}</b></div>
                <div><span>OPENING RIGHTS</span><b>{marketSummary.marketCount ? fmt(marketSummary.openingRightsEstimate) : '—'}</b></div>
                <div><span>LANGUAGES</span><b>{marketSummary.languageCount || '—'}</b></div>
              </div>
              <button
                type="button"
                className={css.marketIntelToggle}
                onClick={() => setShowMarketIntelligence(value => !value)}
                aria-expanded={showMarketIntelligence}
              >
                {showMarketIntelligence ? 'HIDE MARKET INTELLIGENCE' : 'SEE MARKET INTELLIGENCE'} <span>{showMarketIntelligence ? '−' : '+'}</span>
              </button>
              {showMarketIntelligence ? (
                <div className={css.marketIntel}>
                  <div className={css.marketIntelTitle}>
                    <span>WHO ALREADY OWNS ATTENTION</span>
                    <em>Game-world estimate</em>
                  </div>
                  {marketSummary.topRivals.length ? marketSummary.topRivals.map(rivalEntry => (
                    <div
                      className={css.marketRival}
                      key={rivalEntry.id}
                      style={{ ['--market-rival-color' as string]: STREAMING_RIVAL_COLORS[rivalEntry.id] || c }}
                    >
                      <b><span aria-hidden="true" />{rivalEntry.name}</b>
                      <i><span style={{ width: `${Math.min(100, rivalEntry.weightedShare)}%` }} /></i>
                      <em>{Math.round(rivalEntry.weightedShare)}%</em>
                    </div>
                  )) : <p className={css.marketEmpty}>Select a market to reveal its competitive landscape.</p>}
                  {marketIds.length ? (
                    <div className={css.marketWorkload}>
                      <div><span>COMPETITION</span><b>{marketSummary.competition === 'FIERCE' ? 'Crowded' : marketSummary.competition === 'BUSY' ? 'Competitive' : 'Room to grow'}</b></div>
                      <div><span>LAUNCH WORK</span><b>{marketSummary.launchDifficulty === 'HARD' ? 'High' : marketSummary.launchDifficulty === 'MODERATE' ? 'Manageable' : 'Light'}</b></div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={css.marketNetworkNote}>
                <b>NETWORK COMES NEXT</b>
                <span>The Build screen will recommend server cities for this footprint. You can accept it, move it, or add more locations before rehearsal.</span>
              </div>
            </section>

            {entryRulesMarket && entryRulesProfile ? (
              <div
                className={css.marketEntryBackdrop}
                style={{ ['--epx-ep2-c' as string]: c }}
                onClick={event => {
                  if (event.target === event.currentTarget) closeEntryRules();
                }}
              >
                <section
                  ref={entryRulesSheetRef}
                  className={css.marketEntrySheet}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="market-entry-title"
                  aria-describedby="market-entry-summary"
                >
                  <div className={css.marketEntryHandle} aria-hidden="true" />
                  <div className={css.marketEntryHero} data-level={entryRulesProfile.approvalLoad}>
                    <StreamingCountryFlagArt marketId={entryRulesMarket.id} className={css.marketEntryFlagArt} />
                    <span className={css.marketEntryCode} aria-hidden="true">{entryRulesMarket.id}</span>
                    <div>
                      <span>{entryRulesMarket.id} · MARKET ENTRY DOSSIER</span>
                      <h3 id="market-entry-title">{entryRulesMarket.country}</h3>
                      <p id="market-entry-summary">What opening here asks from your company.</p>
                    </div>
                    <button ref={entryRulesCloseRef} type="button" onClick={closeEntryRules} aria-label="Close market entry rules">×</button>
                    <b className={css.marketEntryStatus}>{entryRulesProfile.approvalWeeks} WEEK REVIEW</b>
                  </div>
                  <div className={css.marketEntrySignals}>
                    <div data-level={entryRulesProfile.taxLoad}><span>TAX LOAD</span><b>{entryRulesProfile.taxLoad === 'BALANCED' ? 'Medium' : entryRulesProfile.taxLoad.toLowerCase()}</b></div>
                    <div data-level={entryRulesProfile.approvalLoad}><span>OPENING REVIEW</span><b>{entryRulesProfile.approvalLoad.toLowerCase()}</b></div>
                    <div><span>EXPECTED TIME</span><b>{entryRulesProfile.approvalWeeks} weeks</b></div>
                  </div>
                  <div className={css.marketEntrySection}>
                    <span>WHAT MUST BE CLEARED</span>
                    <div className={css.marketEntryClearances}>
                      {entryRulesProfile.clearances.map(clearance => <b key={clearance}>{clearance}</b>)}
                    </div>
                  </div>
                  <div className={css.marketEntryRule}>
                    <span>LOCAL EXPECTATION</span>
                    <p>{entryRulesProfile.localRule}</p>
                  </div>
                  <div className={css.marketEntryOutcome}>
                    <div><span>PLANNED OVERHEAD</span><b>{fmt(entryRulesProfile.plannedOverheadEstimate)}</b></div>
                    <p>{entryRulesProfile.consequence}</p>
                  </div>
                  <small>Game-world planning estimate · reviewed again before Build and rehearsal · nothing is charged here.</small>
                  <button type="button" className={css.marketEntryDone} onClick={closeEntryRules}>GOT IT</button>
                </section>
              </div>
            ) : null}
          </div>
        )}

        {step === 'TEAM' && (
          <div className={css.pad}>
            {/* the same desk, the same paper as the founding cinematic — a stack of CVs */}
            <div className={css.cvstack}>
              <div className={css.cvfolder}>
                <span>CANDIDATES</span>
                <em>{execIds.length} of {POSITIONS.length} chairs filled · {execIds.length ? fmt(signing) : 'no salaries yet'}</em>
              </div>
              {POSITIONS.map(role => {
                const pool = cfg.execs.filter(e => e.role === role);
                const picked = pool.find(e => execIds.includes(e.id));
                return (
                  <div className={css.posgroup} key={role}>
                    <div className={css.poshead}>
                      <b>{role}</b>
                      <em>{picked ? picked.name : `${pool.length} candidates · none chosen`}</em>
                    </div>
                    <div className={css.poscards}>
                      {pool.map((e, k) => {
                        const on = execIds.includes(e.id);
                        return (
                          <button key={e.id} className={cx(css.cv, (on ? css.hired : ''), (picked && !on ? css.passed : ''))}
                            style={{ ['--epx-ep2-r' as string]: `${(k % 2 ? 1 : -1) * 0.5}deg` }}
                            onClick={() => setExecIds(cur => {
                              /* one chair per position — choosing swaps, choosing again clears */
                              const others = cur.filter(x => !pool.some(p => p.id === x));
                              return on ? others : [...others, e.id];
                            })}>
                    <div className={css.cvhead}>
                      <div className={css.cvphoto}><i className={css.clip2} />
                        {e.avatarUrl
                          ? <img className={css.candidateAvatar} src={e.avatarUrl} alt={`${e.name}, ${e.role}`} />
                          : <PortraitBlock seed={e.id} />}
                      </div>
                      <div className={css.cvid}>
                        <b>{e.name}</b>
                        <span className={css.cvrole}>{e.role}</span>
                        <span className={css.cvfrom}>{e.years} yrs at <i>{e.from}</i> — would resign to join you</span>
                      </div>
                    </div>
                    <div className={css.cvrule} />
                    <div className={css.cvline}><span>UNLOCKS</span><b>{e.unlocks}</b></div>
                    <div className={css.cvline}><span>TRAIT</span><b>{e.trait}</b></div>
                    <div className={css.cvline}><span>SKILL</span><b>{e.skill} / 100</b></div>
                    <div className={css.cvline}><span>SIGNING</span><b>{fmt(e.salary)}</b></div>
                            <div className={css.cvstamp}>{on ? 'HIRED' : 'TAP TO SIGN'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <button className={cx(css.solo, (execIds.length === 0 ? css.on : ''))} onClick={() => setExecIds([])}>
              <b>CLOSE THE FOLDER — GO SOLO</b>
              <span>No salaries. No advice. Every call is yours — and every mistake.
                Those chairs in the office stay empty.</span>
            </button>
          </div>
        )}

        {step === 'BILL' && (
          <div className={css.pad}>
            <div className={css.ledger}>
              <div className={css.lhead}>
                <div><b>ARTICLES OF INCORPORATION</b><span>{brand.name.trim() || cfg.defaultName}</span></div>
                <div className={css.lmark} style={{ color: c }}><Mark brand={brand} /></div>
              </div>
              <div className={css.lrule} />
              {[
                ['Registration, government, rights & legal', cfg.registrationFee],
                ['Opening company treasury', cfg.infraDeposit],
                ...(!canonicalFoundingTransaction ? ([
                  ['Brand, trademark & legal', cfg.brandLegalFee],
                  ['Opening market rights estimate', marketSummary.openingRightsEstimate],
                  ['Founding team signing', signing],
                ] as Array<[string, number]>) : []),
              ].map(([k, v], n) => (
                <div key={k as string} className={css.lrow} style={{ animationDelay: `${n * 0.11}s` }}>
                  <span>{k as string}</span><b>{fmt(v as number)}</b>
                </div>
              ))}
              {extras.length > 0 && !canonicalFoundingTransaction && (
                <>
                  <div className={css.lsub}>OPTIONAL — CHOSEN BY YOU</div>
                  {extras.map((x, n) => (
                    <div key={x.id} className={cx(css.lrow, css.extra)} style={{ animationDelay: `${(5 + n) * 0.11}s` }}>
                      <span>{x.label}</span><b>{fmt(x.fee)}</b>
                    </div>
                  ))}
                </>
              )}
              {canonicalFoundingTransaction && (
                <div className={css.lsub}>DAY-ONE MARKETS & TEAM · NETWORK SPENDING HAPPENS LATER IN BUILD</div>
              )}
              <div className={cx(css.lrule, css.dashed)} />
              <div className={css.ltotal}><span>TOTAL DUE TODAY</span><b>{fmt(total)}</b></div>
              <div className={css.lfund}>
                <span>Funded from personal wealth</span>
                <b>{fmt(cfg.playerCash)} → {fmt(cfg.playerCash - total)}</b>
              </div>
              <div className={css.lterms}>
                <div><span>FOUNDER · OWNER · CEO</span><b>{cfg.playerName}</b></div>
                <div><span>DAY-ONE FOOTPRINT</span><b>{marketScale} · {marketSummary.marketCount} market{marketSummary.marketCount === 1 ? '' : 's'}</b></div>
                <div><span>PROMISE</span><b>{promise?.label}</b></div>
                <div><span>BOARD</span><b>{hires.length ? hires.map(h => h.role).join(' · ') : 'None — solo founder'}</b></div>
              </div>
              <div className={css.lsign}>
                <span className={cx(css.cursive, (inked ? css.inked : ''))}>{cfg.playerName}</span>
                <div className={css.line} />
                <span className={css.cap}>SIGNATURE OF FOUNDER</span>
              </div>
              <div className={css.notary}>
                <button type="button"
                  className={cx(css.seal, (sealed ? css.pressed : ''), (armed && !sealed ? css.armed : ''))}
                  style={{ ['--epx-ep2-c' as string]: c }}
                  onClick={pressSeal} disabled={!armed || sealed}>
                  <Mark brand={brand} />
                  <svg viewBox="0 0 100 100" className={css.sealring}>
                    <defs><path id="sealarc" d="M50,50 m-34,0 a34,34 0 1,1 68,0 a34,34 0 1,1 -68,0" /></defs>
                    <text><textPath href="#sealarc" startOffset="0%">NOTARISED · REGISTRAR OF COMPANIES · </textPath></text>
                  </svg>
                </button>
                <div className={css.witness}>
                  <div><i />NOTARY PUBLIC</div>
                  <div><i />WITNESS</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={css.foot}>
        {step !== 'BILL' ? (
          <button className={cx(css.btn, css.brand, (canNext ? '' : css.dead))} onClick={() => canNext && setI(i + 1)}>
            {step === 'REGIONS' && marketIds.length === 0 ? 'Choose at least one market' : 'Continue →'}
          </button>
        ) : (
          !inked ? (
            <button key="sign" className={cx(css.btn, css.brand, css.big)} onClick={sign}>
              SIGN &amp; PAY {fmt(total)}
            </button>
          ) : (
            <button key="seal" className={cx(css.btn, css.big, css.sealbtn, (sealed ? css.done : ''), (armed ? css.armed : ''))}
              onClick={pressSeal} disabled={!armed || sealed}>
              {sealed ? 'INCORPORATED' : armed ? 'PRESS THE SEAL TO INCORPORATE' : 'SIGNING…'}
            </button>
          )
        )}
      </div>
    </div>
  );
};

/** A tiny deterministic HD-pixel portrait, same language as the CharacterCreator
 *  avatars — enough to read as a passport photo clipped to a CV. */
const PortraitBlock: React.FC<{ seed: string }> = ({ seed }) => {
  const h = useMemo(() => {
    let n = 0; for (let k = 0; k < seed.length; k++) n = (n * 31 + seed.charCodeAt(k)) >>> 0;
    return n;
  }, [seed]);
  const skin = ['#c98d63', '#8d5a3b', '#e0b394', '#a06b45'][h % 4];
  const hair = ['#1d1712', '#3d2a1c', '#57402c', '#0f0d0b'][(h >> 3) % 4];
  const shirt = ['#2b3a52', '#3a2b3f', '#24413a', '#42352a'][(h >> 6) % 4];
  return (
    <svg viewBox="0 0 14 16" shapeRendering="crispEdges" className={css.pblock}>
      <rect x="0" y="0" width="14" height="16" fill="#20242c" />
      <rect x="1" y="11" width="12" height="5" fill={shirt} />
      <rect x="4" y="3" width="6" height="7" fill={skin} />
      <rect x="4" y="9" width="6" height="2" fill={skin} />
      <rect x="3" y="2" width="8" height="3" fill={hair} />
      <rect x="3" y="4" width="1" height="3" fill={hair} />
      <rect x="10" y="4" width="1" height="3" fill={hair} />
      <rect x="5" y="6" width="1" height="1" fill="#141414" />
      <rect x="8" y="6" width="1" height="1" fill="#141414" />
    </svg>
  );
};

const layoutThumb = (id: string, c: string) => (
  <svg viewBox="0 0 40 56">
    <rect x="0" y="0" width="40" height="56" rx="4" fill="#0d0e13" />
    {id === 'ROWS' && <g>{[10, 26, 42].map(y => <g key={y}>{[3, 13, 23, 33].map(x => <rect key={x} x={x} y={y} width="8" height="12" rx="1.5" fill={x === 3 ? c : '#252833'} />)}</g>)}</g>}
    {id === 'HERO_IMG' && <g><rect x="3" y="4" width="34" height="20" rx="2.5" fill={c} /><g>{[28, 42].map(y => [3, 13, 23, 33].map(x => <rect key={`${x}${y}`} x={x} y={y} width="8" height="10" rx="1.5" fill="#252833" />))}</g></g>}
    {id === 'HERO_VIDEO' && <g><rect x="0" y="0" width="40" height="26" fill={c} opacity=".9" /><polygon points="17,9 25,13 17,17" fill="#0d0e13" /><g>{[30, 44].map(y => [3, 13, 23, 33].map(x => <rect key={`${x}${y}`} x={x} y={y} width="8" height="10" rx="1.5" fill="#252833" />))}</g></g>}
    {id === 'GRID' && <g>{[6, 20, 34, 48].map(y => [3, 15, 27].map(x => <rect key={`${x}${y}`} x={x} y={y} width="10" height="12" rx="1.5" fill={(x + y) % 7 === 0 ? c : '#252833'} />))}</g>}
    {id === 'SPOTLIGHT' && <g><rect x="2" y="6" width="36" height="26" rx="3" fill={c} /><rect x="0" y="10" width="4" height="18" rx="2" fill="#252833" /><rect x="36" y="10" width="4" height="18" rx="2" fill="#252833" /><g>{[16, 20, 24].map((x, i) => <circle key={x} cx={x} cy="36" r="1.4" fill={i === 0 ? c : '#3a3f4c'} />)}</g><g>{[3, 13, 23, 33].map(x => <rect key={x} x={x} y="42" width="8" height="10" rx="1.5" fill="#252833" />)}</g></g>}
    {id === 'LIVE' && <g><rect x="2" y="4" width="36" height="8" rx="2" fill={c} /><circle cx="6" cy="8" r="1.6" fill="#0d0e13" /><g>{[16, 30, 44].map(y => [3, 13, 23, 33].map(x => <rect key={`${x}${y}`} x={x} y={y} width="8" height="10" rx="1.5" fill="#252833" />))}</g></g>}
    {id === 'RESUME' && <g><rect x="3" y="6" width="34" height="16" rx="2.5" fill="#252833" /><rect x="3" y="20" width="21" height="2" rx="1" fill={c} /><polygon points="17,11 23,14 17,17" fill={c} /><g>{[28, 42].map(y => [3, 13, 23, 33].map(x => <rect key={`${x}${y}`} x={x} y={y} width="8" height="10" rx="1.5" fill="#252833" />))}</g></g>}
    {id === 'EDITORIAL' && <g><rect x="3" y="5" width="16" height="20" rx="2" fill={c} /><g>{[7, 12, 17, 22].map(y => <rect key={y} x="22" y={y} width="15" height="2" rx="1" fill="#2f3442" />)}</g><g>{[30, 44].map(y => [3, 13, 23, 33].map(x => <rect key={`${x}${y}`} x={x} y={y} width="8" height="10" rx="1.5" fill="#252833" />))}</g></g>}
    {id === 'TRAILER' && <g>{[6, 20, 34, 48].map(y => [3, 15, 27].map(x => <g key={`${x}${y}`}><rect x={x} y={y} width="10" height="12" rx="1.5" fill={(x + y) % 5 === 0 ? c : '#252833'} />{(x + y) % 5 === 0 && <polygon points={`${x + 3.5},${y + 4} ${x + 7},${y + 6} ${x + 3.5},${y + 8}`} fill="#0d0e13" />}</g>))}</g>}
    {id === 'PERSONAL' && <g><g>{[8, 24, 40].map((y, i) => <g key={y}><rect x="3" y={y - 4} width={11 + i * 4} height="2" rx="1" fill={c} opacity={.8 - i * .18} />{[3, 13, 23, 33].map(x => <rect key={x} x={x} y={y} width="8" height="10" rx="1.5" fill={x === 3 && i === 0 ? c : '#252833'} />)}</g>)}</g></g>}
    {id === 'PROFILES' && <g>{[[8, 8], [20, 8], [32, 8]].map(([cx], i) => <circle key={cx} cx={cx + 2} cy="12" r="5" fill={i === 0 ? c : '#2b303d'} />)}<g>{[24, 38].map(y => [3, 13, 23, 33].map(x => <rect key={`${x}${y}`} x={x} y={y} width="8" height="10" rx="1.5" fill="#252833" />))}</g></g>}
    {id === 'CINEMA' && <g><rect x="0" y="0" width="40" height="56" rx="4" fill={c} opacity=".92" /><rect x="0" y="0" width="40" height="56" rx="4" fill="url(#cinfade)" /><defs><linearGradient id="cinfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d0e13" stopOpacity="0" /><stop offset="1" stopColor="#0d0e13" stopOpacity=".85" /></linearGradient></defs><rect x="6" y="44" width="20" height="2.5" rx="1.25" fill="#fff" opacity=".9" /><rect x="6" y="49" width="12" height="2" rx="1" fill="#fff" opacity=".5" /></g>}
  </svg>
);

/* ============================================================
   DEMO STATE for the HQ
   In the game this is derived from OwnedStreamingPlatformState; here it is
   assembled from the wizard's choices so the screen has something true to show.
   ============================================================ */
const buildHqState = (
  cfg: EpConfig, regions: RegionId[], execIds: string[], live: boolean,
  readiness: { done: number; total: number } = { done: 6, total: 9 },
  net: { peak: number; cities: number; arpu: string; plans: number } =
    { peak: 78, cities: 1, arpu: '$11.40', plans: 2 },
  /* the catalogue as it stands after every renewal and lapse the player made */
  cat: { titles: number; expiring: number; soonest?: { title: string; weeks: number } } =
    { titles: 62, expiring: 1, soonest: { title: 'Night Ledger', weeks: 3 } },
  treasury: number = cfg.openingTreasury,
  night: { subs: number; lost: number; failedPct: number } | null = null,
  built = false,
  listed = false,
  ipoReadyish = false,
): HqState => {
  const territories = Math.max(1, regions.length);
  const reachLevel = territories >= 4 ? 4 : territories >= 3 ? 3 : territories >= 2 ? 2 : 1;
  const tier = ['—', 'REGIONAL', 'NATIONAL', 'MULTI-REGION', 'GLOBAL'][reachLevel];

  const slate: SlateItem[] = [
    { id: 's1', title: 'Dead Signal', kind: 'ORIGINAL', stage: 'IN PRODUCTION', progress: 0.62, budget: 42_000_000, releaseWeek: 6, hue: 352 },
    { id: 's2', title: 'The Long Quiet', kind: 'ORIGINAL', stage: 'COMMISSIONED', progress: 0.14, budget: 28_000_000, releaseWeek: 11, hue: 214 },
    { id: 's3', title: 'Harbour Lights', kind: 'LICENSED', stage: 'NEGOTIATING', progress: 0.4, budget: 9_500_000, hue: 168 },
    { id: 's4', title: 'Cold Open', kind: 'ORIGINAL', stage: 'DELIVERED', progress: 1, budget: 19_000_000, releaseWeek: 3, hue: 38 },
    { id: 's5', title: 'Vault Classics', kind: 'LICENSED', stage: 'SIGNED', progress: 1, budget: 6_000_000, releaseWeek: 2, hue: 280 },
  ];

  const service: ServiceTitle[] = [
    { id: 'v1', title: 'Atlas Rising', kind: 'Original · Series', status: 'TOP 10', rating: 8.4, views: 42_000_000, completion: 71, hue: 214 },
    { id: 'v2', title: 'Night Ledger', kind: 'Licensed · Thriller', status: 'RISING', rating: 8.0, views: 18_400_000, completion: 64, expiresIn: 3, hue: 352 },
    { id: 'v3', title: 'Crown City', kind: 'Original · Film', status: 'STEADY', rating: 7.7, views: 11_900_000, completion: 58, hue: 152 },
    { id: 'v4', title: 'Paper Cities', kind: 'Licensed · Drama', status: 'FADING', rating: 6.9, views: 4_100_000, completion: 41, expiresIn: 9, hue: 268 },
  ];

  const hasCTO = execIds.some(id => id.startsWith('CTO'));
  const divisions: Division[] = [
    {
      id: 'CONTENT', label: 'CONTENT DESK', sub: 'CATALOGUE & RIGHTS',
      statLabel: 'TITLES', stat: String(cat.titles),
      /* renew the licence and this light goes out — counted, never typed */
      pressure: cat.soonest && cat.soonest.weeks <= 4 ? 'urgent'
        : cat.expiring > 0 ? 'watch' : 'calm',
      note: cat.soonest
        ? `${cat.soonest.title} rights expire in ${cat.soonest.weeks} week${cat.soonest.weeks === 1 ? '' : 's'}`
        : undefined,
      chips: [
        { id: 'LIBRARY', label: 'LIBRARY' },
        { id: 'RIGHTS', label: 'RIGHTS', alert: cat.expiring > 0 },
        { id: 'SLATE', label: 'SLATE' },
        { id: 'COMMISSION', label: 'NEW' },
      ],
    },
    {
      id: 'NETWORK', label: 'NETWORK', sub: 'SERVERS & PRODUCT',
      statLabel: 'PEAK LOAD', stat: `${net.peak}%`,
      pressure: net.peak >= 92 ? 'urgent' : net.peak >= 82 ? 'watch' : 'calm',
      note: net.peak >= 92
        ? `${net.peak}% at peak — a premiere will not fit`
        : `${net.peak}% at peak across ${net.cities} cit${net.cities === 1 ? 'y' : 'ies'}`,
      chips: [
        { id: 'HALLS', label: 'HALLS', alert: net.peak >= 82 },
        { id: 'STATUS', label: 'STATUS' },
        { id: 'TECH', label: 'TECH' },
        { id: 'PRODUCTS', label: 'PRODUCTS' },
      ],
    },
    {
      id: 'AUDIENCE', label: 'AUDIENCE', sub: 'GROWTH & RIVALS',
      statLabel: 'MARKET SHARE', stat: '4.2%',
      pressure: night && night.lost > 0 ? 'watch' : 'calm',
      note: night && night.lost > 0
        ? `${fmtCount(night.lost)} lost on opening night and not coming back`
        : undefined,
      chips: [
        { id: 'ANALYTICS', label: 'GROWTH', alert: !!night && night.lost > 0 },
        { id: 'TOP 10', label: 'RIVALS' },
        { id: 'CAMPAIGNS', label: 'CAMPAIGNS' },
        { id: 'REGIONS', label: 'REGIONS' },
      ],
    },
    {
      id: 'BOARDROOM', label: 'BOARDROOM', sub: 'MONEY & PEOPLE',
      statLabel: 'TREASURY', stat: fmt(treasury),
      pressure: hasCTO ? 'calm' : 'watch', note: 'No CTO appointed — you are running engineering yourself',
      chips: [
        { id: 'FINANCE', label: 'LEDGER' },
        { id: 'OWNERSHIP', label: 'OWNERS' },
        { id: 'PRICING', label: 'PRICING', alert: net.plans === 0 },
        { id: 'RAISE', label: 'RAISE' },
      ],
    },
  ];

  const pending = (label: string, id: string): HqStat => ({ id, label, value: 'PENDING', tone: 'pending' });

  /* Everything time-sensitive lands in one list and the desk shows exactly one.
     Priority is the whole design: a crisis outranks a launch, a launch outranks
     an expiring licence, and when the list is empty there is no bar at all. */
  const events: HqEvent[] = [
    ...(net.peak >= 92 && live ? [{
      id: 'crisis', priority: 0, tone: 'urgent' as const, hero: true,
      label: 'CAPACITY CRISIS',
      line: `${net.peak}% at peak across ${net.cities} cit${net.cities === 1 ? 'y' : 'ies'}`,
      meta: 'NOW',
    }] : []),
    ...(!live && built ? [{
      id: 'opening', priority: 1, tone: 'brand' as const, hero: true,
      label: 'OPENING NIGHT',
      line: 'The halls are standing. Nothing is open yet.',
    }] : []),
    ...(!live && !built ? [{
      id: 'launch', priority: 2, tone: 'brand' as const,
      label: 'LAUNCH COMMAND',
      line: 'Build-out, load rehearsal & premiere night',
      meta: `${readiness.done}/${readiness.total}`,
    }] : []),
    ...(live && !listed && ipoReadyish ? [{
      id: 'ipo', priority: 4, tone: 'brand' as const,
      label: 'IPO WINDOW OPEN',
      line: 'Bankers are calling. The window closes in six weeks.',
      meta: '6W',
    }] : []),
    ...(live && night && night.lost > 0 ? [{
      id: 'fallout', priority: 3, tone: 'warn' as const,
      label: 'OPENING NIGHT FALLOUT',
      line: `${fmtCount(night.lost)} accounts lost and not coming back`,
    }] : []),
    ...(divisions.filter(d => d.pressure === 'urgent' && d.note).map((d, i) => ({
      id: `div-${d.id}`, priority: 5 + i, tone: 'urgent' as const,
      label: d.label, line: d.note!,
    }))),
  ];

  return {
    live, built, tier, territories, reachLevel,
    /* opening night is where the subscriber number comes from — before it there
       is no number, and after it the one it produced is the one that stands */
    subscribers: night ? night.subs : 2_412_000,
    subsDelta: night ? night.subs : 128_400,
    treasury,
    readiness,
    nowPlaying: { title: 'Atlas Rising · S1 E4', watching: 84_200 },
    stats: live ? [
      { id: 'churn', label: 'CHURN', value: '3.1%', tone: 'good' },
      { id: 'watch', label: 'WATCH HOURS', value: '48.2M' },
      { id: 'titles', label: 'TITLES', value: String(cat.titles) },
      { id: 'orig', label: 'ORIGINALS', value: '9' },
      { id: 'arpu', label: 'ARPU', value: net.arpu },
      { id: 'up', label: 'UPTIME', value: '99.2%', tone: 'good' },
      { id: 'share', label: 'MARKET SHARE', value: '4.2%' },
      { id: 'rating', label: 'APP RATING', value: '4.6/5' },
      { id: 'awards', label: 'AWARDS', value: '3' },
      { id: 'ltr', label: 'LIFETIME REVENUE', value: '$681M' },
      { id: 'val', label: 'VALUATION', value: '$1.2B' },
    ] : [
      pending('CHURN', 'churn'), pending('WATCH HOURS', 'watch'),
      { id: 'titles', label: 'TITLES', value: String(cat.titles) },
      { id: 'orig', label: 'ORIGINALS', value: '2' },
      pending('ARPU', 'arpu'), pending('UPTIME', 'up'),
      pending('MARKET SHARE', 'share'), pending('APP RATING', 'rating'),
      { id: 'awards', label: 'AWARDS', value: '0' },
      pending('LIFETIME REVENUE', 'ltr'),
      { id: 'val', label: 'VALUATION', value: fmt(cfg.setupCost + cfg.openingTreasury) },
    ],
    slate, service, divisions, events,
  };
};

/** Demo catalogue + slate for the Content Desk. */
const buildContentState = (
  live: boolean,
  /** what the player did about each expiring licence */
  rights: Record<string, 'RENEWED' | 'LAPSED'> = {},
): ContentDeskState => {
  const titles: CatalogueTitle[] = [
    { id: 'c1', title: 'Atlas Rising', kind: 'ORIGINAL', format: 'Series', genre: 'Drama', status: 'LIVE', rating: 8.4, views: 42_000_000, completion: 71, hue: 214 },
    { id: 'c2', title: 'Night Ledger', kind: 'LICENSED', format: 'Film', genre: 'Thriller', status: 'LIVE', rating: 8.0, views: 18_400_000, completion: 64, hue: 352,
      rights: { licensor: 'Halloway Pictures', territory: 'Worldwide', endsInWeeks: 3, windowWeeks: 104, exclusive: true, renewCost: 14_000_000 } },
    { id: 'c3', title: 'Crown City', kind: 'ORIGINAL', format: 'Film', genre: 'Action', status: 'LIVE', rating: 7.7, views: 11_900_000, completion: 58, hue: 152 },
    { id: 'c4', title: 'Paper Cities', kind: 'LICENSED', format: 'Series', genre: 'Drama', status: 'LIVE', rating: 6.9, views: 4_100_000, completion: 41, hue: 268,
      rights: { licensor: 'Castle Road Media', territory: 'Europe', endsInWeeks: 5, windowWeeks: 52, exclusive: false, renewCost: 6_200_000 } },
    { id: 'c5', title: 'Vault Classics', kind: 'LICENSED', format: 'Film', genre: 'Collection', status: 'LIVE', rating: 7.1, views: 9_600_000, completion: 33, hue: 38,
      rights: { licensor: 'Orbit TV Holdings', territory: 'Worldwide', endsInWeeks: 42, windowWeeks: 104, exclusive: false, renewCost: 5_000_000 } },
    { id: 'c6', title: 'Dead Signal', kind: 'ORIGINAL', format: 'Series', genre: 'Sci-Fi', status: 'IN PRODUCTION', hue: 352 },
    { id: 'c7', title: 'The Long Quiet', kind: 'ORIGINAL', format: 'Film', genre: 'Drama', status: 'IN PRODUCTION', hue: 214 },
    { id: 'c8', title: 'Harbour Lights', kind: 'LICENSED', format: 'Series', genre: 'Comedy', status: 'STAGED', hue: 168,
      rights: { licensor: 'Vistaplay', territory: 'North America', endsInWeeks: 78, windowWeeks: 104, exclusive: true, renewCost: 9_500_000 } },
  ];

  const slate: SlateWeek[] = [
    { week: 1, releases: [] },
    { week: 2, releases: [{ id: 'r1', title: 'Vault Classics', kind: 'LICENSED', marketing: 'LIGHT', hue: 38 }] },
    { week: 3, releases: [{ id: 'r2', title: 'Cold Open', kind: 'ORIGINAL', marketing: 'HEAVY', hue: 38 }] },
    { week: 4, releases: [] },
    { week: 5, releases: [{ id: 'r3', title: 'Night Ledger — S2', kind: 'LICENSED', marketing: 'LIGHT', hue: 352, rightsRisk: true }] },
    { week: 6, releases: [{ id: 'r4', title: 'Dead Signal', kind: 'ORIGINAL', marketing: 'HEAVY', hue: 352 }] },
    { week: 7, releases: [] },
    { week: 8, releases: [] },
    { week: 9, releases: [] },
    { week: 10, releases: [{ id: 'r5', title: 'Harbour Lights', kind: 'LICENSED', marketing: 'LIGHT', hue: 168 }] },
    { week: 11, releases: [{ id: 'r6', title: 'The Long Quiet', kind: 'ORIGINAL', marketing: 'NONE', hue: 214 }] },
    { week: 12, releases: [] },
  ];

  /* A lapsed licence does not grey out — the title leaves the catalogue,
     because that is what happens. A renewal starts the window again. */
  const kept = titles
    .filter(t => rights[t.id] !== 'LAPSED')
    .map(t => rights[t.id] === 'RENEWED' && t.rights
      ? { ...t, rights: { ...t.rights, endsInWeeks: t.rights.windowWeeks ?? 52 } }
      : t);
  const gone = new Set(titles.filter(t => rights[t.id] === 'LAPSED').map(t => t.title));
  const renewedTitles = new Set(titles.filter(t => rights[t.id] === 'RENEWED').map(t => t.title));

  const cleaned = slate.map(w => ({
    ...w,
    releases: w.releases
      .filter(r => ![...gone].some(g => r.title.startsWith(g)))
      .map(r => renewedTitles.size && [...renewedTitles].some(g => r.title.startsWith(g))
        ? { ...r, rightsRisk: false } : r),
  }));

  return { live, titles: kept, slate: cleaned };
};

/** Demo network state. `history` is generated deterministically so the uptime
 *  strips look like a real 90-day record rather than noise. */
/** The six engineering tracks are the single source of truth for what the
 *  platform can do: the Network page draws them, and the pricing page reads
 *  the same levels to decide which plan columns are even sellable. */
export const TECH_TRACKS: TechTrack[] = [
  { id: 'delivery', name: 'Delivery capacity', note: 'Edge throughput and burst headroom', level: 3, maxLevel: 5 },
  { id: 'playback', name: 'Playback quality', note: 'Bitrate ladder, HDR, start time', level: 2, maxLevel: 5, building: { weeksLeft: 4, doctrine: 'HARDENED' } },
  { id: 'reliability', name: 'Reliability', note: 'Failover, redundancy, outage risk', level: 1, maxLevel: 5, debt: true },
  { id: 'product', name: 'Product experience', note: 'Profiles, devices, simultaneous streams', level: 1, maxLevel: 5 },
  { id: 'ads', name: 'Advertising stack', note: 'Ad server, inventory, measurement', level: 0, maxLevel: 5 },
  { id: 'contentops', name: 'Content operations', note: 'Ingest, localisation, subtitles', level: 3, maxLevel: 5, building: { weeksLeft: 2, doctrine: 'SPRINT' } },
];

/** what those levels unlock, stated once so no screen can disagree */
export const capabilitiesOf = (tech: TechTrack[]): Capabilities => {
  const lvl = (id: string) => tech.find(t => t.id === id)?.level ?? 0;
  return {
    adserver: lvl('ads') >= 1,
    profiles: lvl('product') >= 2,
    uhd: lvl('playback') >= 3,
  };
};

const buildNetworkState = (
  live: boolean, cityName: string,
  halls: HallView[] = [], peak = 88, caps?: Capabilities,
  tech: TechTrack[] = TECH_TRACKS,
  paused: Record<string, boolean> = {},
): NetworkState => {
  const hist = (seed: number, incidents: [number, number][] = []) =>
    Array.from({ length: 90 }, (_, d) => {
      for (const [at, sev] of incidents) if (d === at) return sev;
      // seed 0 means a spotless record — without this guard 0 % 47 === 0 marks every day
      return seed > 0 && (d * seed) % 47 === 0 ? 1 : 0;
    });

  /* A component only appears on the status page once the platform actually runs
     that thing — the list grows as engineering ships, exactly like a real one. */
  const components: NetComponent[] = [
    { id: 'playback', name: 'Playback', status: 'operational', uptime: 99.94, history: hist(7) },
    {
      id: 'delivery', name: 'Streaming delivery',
      status: peak >= 92 ? 'outage' : peak >= 82 ? 'degraded' : 'operational',
      uptime: peak >= 82 ? 99.41 : 99.96,
      history: peak >= 82 ? hist(5, [[86, 1], [87, 1], [88, 2], [89, 1]]) : hist(5),
    },
    { id: 'accounts', name: 'Sign-in & accounts', status: 'operational', uptime: 99.99, history: hist(11) },
    { id: 'billing', name: 'Billing', status: 'operational', uptime: 100, history: hist(0) },
    { id: 'search', name: 'Search', status: 'maintenance', uptime: 99.72, history: hist(9, [[89, 1]]) },
    ...(caps?.profiles
      ? [{ id: 'profiles', name: 'Profiles & devices', status: 'operational' as const, uptime: 99.9, history: hist(17) }]
      : []),
    ...(caps?.adserver
      ? [{ id: 'ads', name: 'Ad delivery', status: 'operational' as const, uptime: 99.6, history: hist(19) }]
      : []),
  ];

  /* the cities are the halls you built, under the traffic your plans invite */
  const cities: ServerCity[] = halls.length
    ? halls.map(h => ({
      id: h.city.id, city: h.city.label,
      region: h.serves.length ? `${h.serves.length} territor${h.serves.length === 1 ? 'y' : 'ies'}` : 'idle',
      loadPct: h.load, latencyMs: h.latency ?? 0,
      capacityGbps: h.racks * 240, hub: !!h.city.hub,
    }))
    : [{ id: 'c1', city: cityName, region: 'Home market', loadPct: peak, latencyMs: 24, capacityGbps: 1200, hub: true }];


  /* products answer to the same capabilities the pricing page reads, so a plan
     can never be on sale here and impossible over there */
  const products: PlatformProduct[] = [
    { id: 'p1', name: 'Core service', note: 'The subscription everyone starts on', state: 'ACTIVE', weeklyCost: 0, load: 0 },
    { id: 'p5x', name: 'Kids', note: 'Curated catalogue, separate profile', state: paused.p5x ? 'PAUSED' : 'ACTIVE', weeklyCost: 340_000, load: 4 },
    /* unlocked by engineering, switched on or off by the player */
    caps?.profiles
      ? { id: 'p2', name: 'Profiles & devices', note: 'Separate profiles, more than one stream', state: paused.p2 ? 'PAUSED' : 'ACTIVE', weeklyCost: 340_000, load: 4 }
      : { id: 'p2', name: 'Profiles & devices', note: 'Separate profiles, more than one stream', state: 'LOCKED', requires: 'Product experience II' },
    caps?.adserver
      ? { id: 'p3', name: 'Free / ad tier', note: 'Ad-supported entry point', state: paused.p3 ? 'PAUSED' : 'ACTIVE', weeklyCost: 1_100_000, load: 18 }
      : { id: 'p3', name: 'Free / ad tier', note: 'Ad-supported entry point', state: 'LOCKED', requires: 'Advertising stack I' },
    caps?.uhd
      ? { id: 'p4', name: '4K HDR', note: 'The top of the bitrate ladder', state: paused.p4 ? 'PAUSED' : 'ACTIVE', weeklyCost: 620_000, load: 11 }
      : { id: 'p4', name: '4K HDR', note: 'The top of the bitrate ladder', state: 'LOCKED', requires: 'Playback quality III' },
    { id: 'p5', name: 'Live', note: 'Events and simulcast', state: 'LOCKED', requires: 'EMPIRE+ Live' },
    { id: 'p6', name: 'Store', note: 'Merchandise and rentals', state: 'LOCKED', requires: 'Commerce I' },
  ];

  const incidents: Incident[] = live ? [
    { id: 'i1', when: '2 weeks ago', title: 'Elevated buffering in Europe', severity: 'major',
      resolvedIn: '3h 40m', note: 'A premiere pushed Frankfurt past its committed egress. Traffic was shed to London until burst capacity came online.' },
    { id: 'i2', when: '6 weeks ago', title: 'Search unavailable', severity: 'minor',
      resolvedIn: '52m', note: 'An index rebuild ran during peak hours. Browsing and playback were unaffected.' },
  ] : [];

  const totalGbps = cities.reduce((t, c) => t + c.capacityGbps, 0);
  return {
    live, components, cities, tech, products, incidents,
    peakLoad: peak,
    headroom: `${((totalGbps * peak) / 100 / 1000).toFixed(2)} Tbps of ${(totalGbps / 1000).toFixed(2)} Tbps committed`,
    technicalDebt: 34 + tech.filter(t => t.debt || t.building?.doctrine === 'SPRINT').length * 6,
  };
};

/** Demo audience state. The Top 10 deliberately mixes your titles with the same
 *  rivals the player met on the Wall of Screens. */
const buildAudienceState = (live: boolean, brandName: string, regions: RegionId[]): AudienceState => {
  // a plausible 90-week subscriber climb with a dip, so the chart has a shape
  const trend = Array.from({ length: 90 }, (_, i) => {
    const base = 240_000 + i * 24_000;
    const dip = i > 52 && i < 60 ? -90_000 : 0;
    const wobble = Math.round(Math.sin(i / 3.1) * 22_000);
    return { label: `Wk ${i + 1}`, value: Math.max(0, base + dip + wobble) };
  });

  const metrics: AudienceMetric[] = [
    { id: 'subs', label: 'SUBSCRIBERS', value: '2.41M', delta: 5.6, spark: trend.slice(-14).map(t => t.value) },
    { id: 'churn', label: 'CHURN', value: '3.1%', delta: -0.4, inverse: true, spark: [4.1, 3.9, 3.8, 3.6, 3.4, 3.3, 3.1] },
    { id: 'watch', label: 'WATCH HOURS', value: '48.2M', delta: 8.1, spark: [31, 34, 33, 38, 41, 44, 48] },
    { id: 'arpu', label: 'ARPU', value: '$11.40', delta: 1.2, spark: [10.8, 10.9, 11.0, 11.1, 11.2, 11.3, 11.4] },
  ];

  const chart: ChartRow[] = [
    { rank: 1, prevRank: 1, title: 'The Last Harbour', platform: 'Vistaplay', mine: false, hue: 268 },
    { rank: 2, prevRank: 4, title: 'Atlas Rising', platform: brandName, mine: true, hue: 214 },
    { rank: 3, prevRank: 2, title: 'Ironmark', platform: 'StreamCo', mine: false, hue: 12 },
    { rank: 4, prevRank: 3, title: 'Glass Hours', platform: 'Orbit TV', mine: false, hue: 190 },
    { rank: 5, prevRank: undefined, title: 'Night Ledger', platform: brandName, mine: true, hue: 352 },
    { rank: 6, prevRank: 5, title: 'Saltwater', platform: 'Vistaplay', mine: false, hue: 158 },
    { rank: 7, prevRank: 6, title: 'The Quiet Fleet', platform: 'StreamCo', mine: false, hue: 42 },
    { rank: 8, prevRank: 12, title: 'Crown City', platform: brandName, mine: true, hue: 152 },
    { rank: 9, prevRank: 7, title: 'Dust & Signal', platform: 'Orbit TV', mine: false, hue: 300 },
    { rank: 10, prevRank: 9, title: 'Long Division', platform: 'Vistaplay', mine: false, hue: 96 },
  ];

  const attribution: Attribution[] = [
    { id: 'org', label: 'Organic', value: 61_200, note: 'Word of mouth and search — nothing was paid for this.' },
    { id: 'camp', label: 'Campaigns', value: 44_800, note: 'Attributed to the Dead Signal trailer push and the regional billboards.' },
    { id: 'rec', label: 'Recommendations', value: 22_400, note: 'Surfaced by your own homepage and Top 10 placement.' },
  ];

  const campaigns: Campaign[] = [
    { id: 'k1', name: 'Dead Signal — premiere push', channel: 'Trailer · Social · Homepage hero', spend: 8_400_000, reachLow: 4_200_000, reachHigh: 11_000_000, weeksLeft: 3, live: true },
    { id: 'k2', name: 'Back catalogue revival', channel: 'Genre spotlight', spend: 1_100_000, reachLow: 600_000, reachHigh: 1_800_000, weeksLeft: 6, live: true },
    { id: 'k3', name: 'Harbour Lights launch', channel: 'Regional · Billboard', spend: 2_600_000, reachLow: 900_000, reachHigh: 3_400_000, weeksLeft: 0, live: false },
  ];

  const REGION_LABEL: Record<string, string> = {
    NORTH_AMERICA: 'North America', SOUTH_AMERICA: 'South America', EUROPE: 'Europe',
    AFRICA: 'Africa', ASIA: 'Asia', OCEANIA: 'Oceania',
  };
  const rows: RegionRow[] = (regions.length ? regions : (['EUROPE', 'ASIA'] as RegionId[])).map((r, i) => ({
    id: r,
    label: REGION_LABEL[r] ?? r,
    subs: [1_480_000, 620_000, 210_000, 98_000, 44_000, 21_000][i] ?? 18_000,
    sharePct: [6.4, 3.8, 2.1, 1.4, 0.9, 0.5][i] ?? 0.4,
    growthPct: [7.2, 4.1, -1.8, 2.6, 0.4, -0.6][i] ?? 0,
    latencyMs: [24, 74, 142, 168, 96, 188][i] ?? 150,
    rivals: [['Vistaplay'], ['StreamCo', 'Vistaplay'], ['Orbit TV'], [], ['StreamCo'], []][i] ?? [],
  })).sort((a, b) => b.subs - a.subs);

  return {
    live, metrics, trend, trendLabel: 'Subscribers', chart,
    attribution, campaigns, objective: 'BALANCED', regions: rows,
  };
};

/** Demo boardroom state. Ownership starts at 100% founder, so the board seats
 *  are drawn empty — that image is the governance rule. */
const buildBoardroomState = (
  cfg: EpConfig, execIds: string[], live: boolean, playerName: string,
  funds: RaiseTotals = { cash: 0, debtWeekly: 0, debtOutstanding: 0, equityGiven: 0, investors: [], founderCash: 0 },
  ops: { infraWeekly: number; cities: number; peak: number; arpu: number; adsOn: boolean; treasury: number } =
    { infraWeekly: 0, cities: 0, peak: 0, arpu: 0, adsOn: false, treasury: cfg.openingTreasury },
  /* once this exists the company is public, and the MARKETS tab has to stop
     offering to file for an IPO it has already completed */
  listedQuote?: { ticker: string; price: number; pct: number; shares: number; history: number[] },
): BoardroomState => {
  const hired = cfg.execs.filter(e => execIds.includes(e.id));

  const execs: BoardExec[] = [
    { id: 'founder', role: 'Founder · CEO', name: playerName, loyalty: 100, salary: 0, unlocks: 'Every decision is yours', founder: true },
    ...hired.map(e => ({
      id: e.id, role: e.role, name: e.name,
      loyalty: 62 + (e.skill % 30), salary: e.salary, unlocks: e.unlocks,
    })),
  ];

  /* three seats exist; each investor who bought in fills one, so governance
     is an image before it is ever a number */
  const seats: BoardSeat[] = [{ id: 's1' }, { id: 's2' }, { id: 's3' }]
    .map((s, i) => funds.investors[i]
      ? { ...s, holder: funds.investors[i].name, votes: 1 }
      : s);

  const holders: Holder[] = [
    { id: 'you', name: playerName, pct: Math.max(0, 100 - funds.equityGiven), since: 'incorporation', you: true },
    ...funds.investors.map((iv, i) => ({
      id: `inv${i}`, name: iv.name, pct: iv.pct, since: 'the build',
    })),
  ];

  /* ARPU is monthly — the ledger is weekly, so it has to be divided or the
     revenue line would be four times what the pricing page promised */
  const SUBS = 2_410_000;
  const weeklyRevenue: LedgerLine[] = live ? [
    {
      id: 'subs', label: 'Subscriptions', amount: Math.round(SUBS * ops.arpu / 4.33),
      note: `2.41M subscribers · ARPU $${ops.arpu.toFixed(2)}`,
    },
    {
      id: 'ads', label: 'Advertising', amount: ops.adsOn ? 1_780_000 : 0,
      note: ops.adsOn ? 'Ad tier is selling' : 'No ad tier on sale',
    },
    { id: 'lic', label: 'Outbound licensing', amount: 2_100_000, note: 'Windows sublicensed to other platforms' },
  ] : [];

  const weeklyCosts: LedgerLine[] = [
    /* before launch the catalogue and the originals were capital in the build,
       not a weekly line — inventing one here would contradict that screen */
    ...(live ? [{ id: 'content', label: 'Content & rights', amount: 3_200_000, note: 'Originals in production, licence guarantees' }] : []),
    {
      id: 'infra', label: 'Infrastructure',
      amount: Math.max(1, ops.infraWeekly),
      note: `${ops.cities} data centre${ops.cities === 1 ? '' : 's'} · ${ops.peak}% peak load`,
    },
    ...(live ? [{ id: 'mkt', label: 'Marketing', amount: 900_000, note: 'Always-on acquisition' }] : []),
    { id: 'people', label: 'Salaries', amount: Math.max(1_400_000, hired.reduce((a, e) => a + Math.round(e.salary / 52), 0)), note: `${hired.length + 1} on payroll` },
    /* the price of having started large, charged every single week */
    ...(funds.debtWeekly > 0 ? [{
      id: 'debt', label: 'Debt service', amount: funds.debtWeekly,
      note: `${fmt(funds.debtOutstanding)} facility drawn during the build`,
    }] : []),
  ];

  const ipoChecks: IpoCheck[] = [
    { id: 'cfo', label: 'A CFO in post', done: hired.some(e => e.role === 'CFO'), note: 'No filing can be prepared without one' },
    { id: 'rev', label: 'Four profitable quarters', done: false, note: 'The company is still investing ahead of revenue' },
    { id: 'audit', label: 'Independent audit', done: live, note: 'Books opened to an outside firm' },
    { id: 'gov', label: 'Board constituted', done: funds.investors.length > 0, note: 'At least one seat must be held by an outside director' },
  ];

  return {
    live, treasury: ops.treasury,
    weeklyRevenue, weeklyCosts, execs, seats, holders,
    listed: !!listedQuote, ipoChecks,
    share: listedQuote ? {
      ticker: listedQuote.ticker,
      price: listedQuote.price,
      changePct: listedQuote.pct,
      marketCap: listedQuote.price * listedQuote.shares,
      history: listedQuote.history.map((v, i) => ({ label: `W${i + 1}`, value: v })),
    } : undefined,
    successor: hired.length ? { name: hired[0].name, role: hired[0].role } : null,
    legacyTitle: live ? 'Audience Architect' : undefined,
  };
};

/** Demo app state. Rows are derived from the catalogue, so "Leaving Soon" is
 *  literally the rights countdown the Content Desk manages. */
const buildAppState = (brand: Brand, live: boolean): AppState => {
  const titles: AppTitle[] = [
    { id: 'v1', title: 'Atlas Rising', kind: 'ORIGINAL', format: 'Series', genre: 'Drama', hue: 214,
      rank: 1, progress: 0.42,
      logline: 'A cartographer discovers the maps have been lying for two hundred years.',
      episodes: [
        { n: 1, title: 'True North', mins: 54 }, { n: 2, title: 'The Blank Quarter', mins: 51 },
        { n: 3, title: 'Meridian', mins: 58 }, { n: 4, title: 'What the Sea Kept', mins: 62 },
      ] },
    { id: 'v2', title: 'Night Ledger', kind: 'LICENSED', format: 'Film', genre: 'Thriller', hue: 352,
      rank: 2, leavingInWeeks: 3,
      logline: 'An accountant finds a second set of books, and a reason to run.' },
    { id: 'v3', title: 'Crown City', kind: 'ORIGINAL', format: 'Film', genre: 'Action', hue: 152,
      rank: 3, logline: 'One night, one city, and a debt that will not wait until morning.' },
    { id: 'v4', title: 'Paper Cities', kind: 'LICENSED', format: 'Series', genre: 'Drama', hue: 268,
      rank: 4, leavingInWeeks: 5, progress: 0.18,
      logline: 'Three architects build a town that was never meant to be lived in.' },
    { id: 'v5', title: 'Vault Classics', kind: 'LICENSED', format: 'Collection', genre: 'Classics', hue: 38,
      rank: 5, logline: 'Forty restored films that shaped the century.' },
    { id: 'v6', title: 'Cold Open', kind: 'ORIGINAL', format: 'Film', genre: 'Comedy', hue: 42,
      newThisWeek: true, logline: 'A late-night writers room has ninety minutes and no idea.' },
    { id: 'v7', title: 'Harbour Lights', kind: 'LICENSED', format: 'Series', genre: 'Comedy', hue: 168,
      newThisWeek: true, logline: 'A failing seaside town gets one last summer to save itself.' },
    { id: 'v8', title: 'The Long Quiet', kind: 'ORIGINAL', format: 'Film', genre: 'Drama', hue: 200,
      newThisWeek: true, logline: 'After the signal stops, a family keeps the routine anyway.' },
  ];
  return {
    live, layoutId: brand.layoutId, titles, watchingNow: 84_200,
    /* mirrors the Network page: 88% peak load means this will stall */
    network: { peakLoad: 88, tier: 'HD', latencyMs: 24 },
  };
};

/** Demo dossier data, keyed by title id. */
const DOSSIERS: Record<string, DossierTitle> = {
  v1: {
    id: 'v1', title: 'Atlas Rising', kind: 'ORIGINAL', format: 'Series', genre: 'Drama', hue: 214,
    logline: 'A cartographer discovers the maps have been lying for two hundred years.',
    status: 'ON THE SERVICE', chartRank: 1, rating: 8.4,
    viewers: 42_000_000, completion: 71, subsAcquired: 214_000, churnPrevented: 88_000,
    revenue: 96_400_000, cost: 42_000_000,
    sources: [
      { label: 'Homepage hero', pct: 41 }, { label: 'Top 10 row', pct: 27 },
      { label: 'Recommendations', pct: 19 }, { label: 'Search', pct: 13 },
    ],
    journey: { steps: ['Commissioned', 'In production', 'Delivered', 'Scheduled', 'Premiere', 'Week 1', 'Peak', 'Long tail'], at: 6 },
    dna: [
      { label: 'Reach', value: 88 }, { label: 'Completion', value: 71 },
      { label: 'Retention', value: 64 }, { label: 'Acquisition', value: 79 }, { label: 'Rewatch', value: 42 },
    ],
    artwork: [
      { id: 'a', hue: 214, ctr: 6.8, live: true }, { id: 'b', hue: 190, ctr: 5.1, live: false },
    ],
    dropOff: [{ ep: 1, pct: 100 }, { ep: 2, pct: 92 }, { ep: 3, pct: 88 }, { ep: 4, pct: 71 }],
    maturity: { have: 6, need: 8 },
    press: [
      { id: 'p1', tag: 'REVIEW', source: 'INDUSTRY', head: 'Atlas Rising is the year to beat', body: 'Critics are calling it the most confident debut season a new platform has ever shipped.' },
      { id: 'p2', tag: 'LATEST', source: 'TRENDING', head: 'Everyone is arguing about episode four', body: 'The mid-season turn has split the audience and doubled the conversation.' },
    ],
  },
  v2: {
    id: 'v2', title: 'Night Ledger', kind: 'LICENSED', format: 'Film', genre: 'Thriller', hue: 352,
    logline: 'An accountant finds a second set of books, and a reason to run.',
    status: 'ON THE SERVICE', chartRank: 2, rating: 8.0, rightsWeeksLeft: 3,
    viewers: 18_400_000, completion: 64, subsAcquired: 31_000, churnPrevented: 142_000,
    revenue: 22_100_000, cost: 14_000_000,
    sources: [
      { label: 'Top 10 row', pct: 46 }, { label: 'Recommendations', pct: 31 },
      { label: 'Search', pct: 15 }, { label: 'Homepage hero', pct: 8 },
    ],
    journey: { steps: ['Licensed', 'Delivered', 'Scheduled', 'Live', 'Week 1', 'Peak', 'Long tail', 'Window closes'], at: 6 },
    dna: [
      { label: 'Reach', value: 62 }, { label: 'Completion', value: 64 },
      { label: 'Retention', value: 81 }, { label: 'Acquisition', value: 24 }, { label: 'Rewatch', value: 55 },
    ],
    artwork: [
      { id: 'a', hue: 352, ctr: 5.4, live: true }, { id: 'b', hue: 12, ctr: 6.2, live: false },
    ],
    maturity: { have: 9, need: 8 },
    press: [
      { id: 'p1', tag: 'LATEST', source: 'INDUSTRY', head: 'Night Ledger leaves EMPIRE+ next month', body: 'Halloway Pictures has not yet renewed the window, and rivals are circling.' },
    ],
  },
};
const byTitle = (name: string) => Object.values(DOSSIERS).find(d => d.title === name);
const dossierFor = (id: string, fallback: AppTitle): DossierTitle =>
  DOSSIERS[id] ?? byTitle(fallback.title) ?? {
  id, title: fallback.title, kind: fallback.kind, format: fallback.format, genre: fallback.genre,
  hue: fallback.hue, logline: fallback.logline, status: 'ON THE SERVICE',
  viewers: 4_100_000, completion: 48, subsAcquired: 12_000, churnPrevented: 26_000,
  revenue: 5_200_000, cost: 6_000_000,
  sources: [{ label: 'Recommendations', pct: 52 }, { label: 'Search', pct: 30 }, { label: 'Top 10 row', pct: 18 }],
  journey: { steps: ['Commissioned', 'Delivered', 'Scheduled', 'Live', 'Week 1', 'Peak', 'Long tail'], at: 4 },
  dna: [
    { label: 'Reach', value: 44 }, { label: 'Completion', value: 48 },
    { label: 'Retention', value: 51 }, { label: 'Acquisition', value: 22 }, { label: 'Rewatch', value: 30 },
  ],
  artwork: [{ id: 'a', hue: fallback.hue, ctr: 3.9, live: true }],
  maturity: { have: 2, need: 8 },
  press: [{ id: 'p1', tag: 'LATEST', source: 'INDUSTRY', head: `${fallback.title} finds a quiet audience`, body: 'Steady rather than spectacular — the kind of title a catalogue is built on.' }],
};

/* ============================================================
   SCENE 5 — THE CONTROL DESK (operator ⇄ viewer)
   ============================================================ */

/* ============================================================
   ROOT
   ============================================================ */
export interface Props {
  config?: Partial<EpConfig>;
  onComplete?: (r: EpResult) => void;
  onClose?: () => void;
  debugNav?: boolean;
}
const PHASES: Phase[] = ['WALL', 'CASE', 'WIZARD', 'FOUNDING', 'DESK', 'BUILD', 'PREMIERE', 'IPO'];

export const EmpirePlusV2: React.FC<Props> = ({ config, onComplete, onClose, debugNav }) => {
  const cfg = useMemo<EpConfig>(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const [phase, setPhase] = useState<Phase>('WALL');
  const [brand, setBrand] = useState<Brand>({
    name: '', markId: 'BOLT', customMark: null, hue: 352, sat: 82,
    identId: 'PULSE', customIdent: null, promiseId: 'EVENT',
    publicManifesto: PROMISES.find(promise => promise.id === 'EVENT')?.manifesto || '', layoutId: 'HERO_IMG',
    typeId: 'GROTESK', accentHue: 44, identMode: 'badge', identLen: 2,
    ratingId: 'TEEN', lockupId: 'SIDE', serverCity: null,
  });
  const [regions, setRegions] = useState<RegionId[]>([]);
  const [marketIds, setMarketIds] = useState<string[]>([]);
  const [execIds, setExecIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [hqLive, setHqLive] = useState(false);
  const [dossier, setDossier] = useState<string | null>(null);

  /* ── the build-out: one selection, shared by the Build screen and the HQ ── */
  const [buildSel, setBuildSel] = useState<BuildSel | null>(null);
  const [rehearsed, setRehearsed] = useState<RunResult | null>(null);
  /** null until commissioning — before that every rack on screen is a drawing */
  const [builtRacks, setBuiltRacks] = useState<Placement[] | null>(null);

  const [pricing, setPricing] = useState<PricingSel>(defaultPricing);
  const [showPricing, setShowPricing] = useState(false);
  const [raises, setRaises] = useState<Raise[]>([]);
  const [showRaise, setShowRaise] = useState(false);
  /** which tab a division page should open on, when a chip named one */
  const [divTab, setDivTab] = useState<string | null>(null);

  /* ── the buttons that actually change something ────────────────────────
     Each of these used to be wired to a handler that did nothing. They now
     hold real state, cost real money, and every screen downstream reads the
     result rather than a fixed demo value. */
  const [rightsCalls, setRightsCalls] = useState<Record<string, 'RENEWED' | 'LAPSED'>>({});
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [tech, setTech] = useState<TechTrack[]>(() => TECH_TRACKS.map(t => ({ ...t })));
  /** money spent on running the company, as opposed to building it */
  const [opsSpend, setOpsSpend] = useState(0);
  /** what actually happened on opening night — null until it has been played */
  const [night, setNight] = useState<PremiereResult | null>(null);
  /** null until the company has listed */
  const [listing, setListing] = useState<IpoResult | null>(null);
  /* the listing promised the price would live on the desk afterwards — it is
     derived from the same numbers every other screen is showing, so it can
     never disagree with them */
  const [showQuote, setShowQuote] = useState(false);
  const [subsAtListing, setSubsAtListing] = useState(0);

  const funds = useMemo(() => totalsOf(raises), [raises]);
  /* the founder's own liquid cash, less what incorporation already took */
  const founderLeft = Math.max(0,
    (cfg.unlockReqs.find(r => r.id === 'cash')?.have ?? cfg.playerCash)
    - cfg.setupCost - cfg.openingTreasury);

  /* one source of truth: engineering levels → capabilities → which plans exist */
  const caps = useMemo<Capabilities>(() => capabilitiesOf(tech), [tech]);
  const pr = useMemo(() => derivePricing(pricing, caps), [pricing, caps]);

  const buildInputs = useMemo<BuildInputs>(() => ({
    treasury: cfg.openingTreasury + funds.cash,
    catalogueSpend: 3_400_000, catalogueTitles: 62,
    originalsSpend: 4_200_000, originalsCount: 2,
    premiereTitle: 'Dead Signal',
    regions,
    homeCityId: brand.serverCity,
    audienceMul: pr.reachMul,
    debtWeekly: funds.debtWeekly,
  }), [cfg.openingTreasury, regions, brand.serverCity, pr.reachMul, funds.cash, funds.debtWeekly]);

  /* the opening build is a preset laid into whatever territories were taken,
     so it cannot be seeded until the wizard has run */
  const build = useMemo<BuildSel>(() => buildSel ?? ({
    placements: presetPlacements('ESSENTIAL', regions, brand.serverCity),
    arch: 'CLOUD', doctrine: 'STANDARD', campaign: 'NONE',
  }), [buildSel, regions, brand.serverCity]);

  /* readiness is counted, never typed: six things were true before this screen
     opened, and the last three are exactly what the Build can still get wrong */
  const buildDerived = useMemo(() => derive(build, buildInputs), [build, buildInputs]);

  /* every switched-on product is more work for the same halls */
  const productLoad =
    (caps.profiles && !paused.p2 ? 4 : 0)
    + (caps.adserver && !paused.p3 ? 18 : 0)
    + (caps.uhd && !paused.p4 ? 11 : 0)
    + (!paused.p5x ? 4 : 0);
  const hallPeak = buildDerived.halls.length
    ? Math.max(...buildDerived.halls.map(h => h.load)) : 0;
  const peakNow = Math.min(140, hallPeak + productLoad);

  const readiness = useMemo(() => {
    const d = buildDerived;
    return {
      done: 4
        + (d.racks > 0 && d.unserved.length === 0 ? 1 : 0)
        + (pr.sellable.length > 0 ? 1 : 0)
        + (d.over ? 0 : 1)
        + (rehearsed ? 1 : 0)
        + (rehearsed && rehearsed.verdict !== 'BROKE' ? 1 : 0),
      total: 9,
    };
  }, [build, buildInputs, rehearsed, pr.sellable.length]);

  /* three stages: PLANNING → BUILT (halls up, doors shut) → LIVE */
  const built = builtRacks !== null;
  /* the commissioning cinematic showed the money leaving; every screen that
     names the treasury afterwards has to agree that it went */
  const spent = useMemo(
    () => builtRacks ? derive({ ...build, placements: builtRacks }, buildInputs).committed : 0,
    [builtRacks, build, buildInputs]);
  const treasuryNow = cfg.openingTreasury + funds.cash - spent - opsSpend;

  /* one catalogue, read by the desk as well as by the Content page, so a
     renewal cannot clear the warning in one place and leave it in another */
  const catSummary = useMemo(() => {
    const titles = buildContentState(hqLive, rightsCalls).titles;
    const windows = titles
      .map(t => t.rights?.endsInWeeks)
      .filter((w): w is number => typeof w === 'number' && w <= 12)
      .sort((a, b) => a - b);
    const first = titles.find(t => t.rights?.endsInWeeks === windows[0]);
    return {
      titles: titles.length + 54,
      expiring: windows.length,
      soonest: first && windows.length
        ? { title: first.title, weeks: windows[0] }
        : undefined,
    };
  }, [hqLive, rightsCalls]);

  /* the night is judged by every decision already made, so its inputs are
     assembled out of the other screens rather than authored here */
  const premiereInputs = useMemo<PremiereInputs>(() => {
    const d = buildDerived;
    const total = d.demandTotal('LIKELY') || 1;
    return {
      title: 'Dead Signal',
      halls: d.halls.map(h => ({
        id: h.city.id, label: h.city.label,
        ceiling: h.ceiling, burstCeiling: h.burstCeiling,
        share: d.demandOfCity(h.city.id, 'LIKELY') / total,
      })),
      ceiling: d.ceiling, burstCeiling: d.burstCeiling,
      expected: total,
      wobble: build.doctrine === 'RUSHED' ? .12 : build.doctrine === 'STANDARD' ? .04 : 0,
      arpu: pr.arpu,
      treasury: treasuryNow,
      investor: funds.investors[0]
        ? { name: funds.investors[0].name, agenda: funds.investors[0].agenda }
        : null,
      /* the rivals from the wall get to comment on the night they lost a screen */
      rivals: cfg.rivals.map(r => ({ name: r.name, subs: r.subs, show: r.show })),
      engineer: (() => {
        const e = cfg.execs.find(x => execIds.includes(x.id) && /CTO|ENG|TECH/i.test(x.role + x.id));
        return e ? { name: e.name, role: e.role } : null;
      })(),
      checks: [
        { id: 'brand', label: 'Brand, mark and ident registered', ok: true, note: 'Filed at incorporation' },
        { id: 'legal', label: 'Operating licence in every territory', ok: true, note: `${Math.max(1, regions.length)} territories cleared` },
        { id: 'cat', label: 'Catalogue secured', ok: true, note: '62 titles licensed and ingested' },
        { id: 'orig', label: 'A first Original delivered', ok: true, note: 'Dead Signal is in the can' },
        { id: 'slate', label: 'Twelve-week slate scheduled', ok: true, note: 'Nothing goes dark before week 12' },
        {
          id: 'sites', label: 'Data centres in every territory',
          ok: d.racks > 0 && d.unserved.length === 0,
          note: d.unserved.length
            ? `${d.unserved.length} territory with no server anywhere`
            : `${d.racks} racks across ${d.halls.length} cities`,
        },
        {
          id: 'plans', label: 'Something to sell', ok: pr.sellable.length > 0,
          note: pr.sellable.length ? `${pr.sellable.length} plan(s) on sale` : 'No plan is on sale',
        },
        {
          id: 'money', label: 'Inside the budget', ok: !d.over,
          note: d.over ? 'Committed more than the treasury holds' : `${fmt(d.remaining)} uncommitted`,
        },
        {
          id: 'test', label: 'Load rehearsal passed',
          ok: !!rehearsed && rehearsed.verdict !== 'BROKE',
          note: !rehearsed ? 'Never rehearsed'
            : rehearsed.verdict === 'BROKE' ? 'The rehearsal broke and nothing was changed'
              : `Held at ${Math.round(rehearsed.peakLoad)}% of capacity`,
        },
      ],
    };
  }, [buildDerived, build.doctrine, pr, funds, treasuryNow, regions.length, rehearsed, cfg, execIds]);

  /* the filing is written out of what the company actually is, including the
     parts of it the player would rather nobody read */
  /* re-rated off listing-day close by what the company has done since */
  const liveQuote = useMemo(() => listing && quoteOf({
    closePrice: listing.closePrice,
    subsAtListing: subsAtListing || (night?.subsGained ?? 2_412_000),
    subs: night?.subsGained ?? 2_412_000,
    churnPct: 4.1,
    techDebt: 34 + tech.filter(t => t.debt || t.building?.doctrine === 'SPRINT').length * 6,
    treasury: treasuryNow,
    weeklyNet: -1_700_000,
    marks: listing.omitted.length,
  }), [listing, subsAtListing, night, tech, treasuryNow]);

  const ipoInputs = useMemo<IpoInputs>(() => {
    const d = buildDerived;
    const hasCFO = cfg.execs.some(e => execIds.includes(e.id) && /CFO/i.test(e.role + e.id));
    return {
      founderName: cfg.playerName,
      founderPct: Math.max(0, 100 - funds.equityGiven),
      subscribers: night?.subsGained ?? 2_412_000,
      arpu: pr.arpu,
      churnPct: 4.1,
      peakLoad: peakNow,
      techDebt: 34 + tech.filter(t => t.debt || t.building?.doctrine === 'SPRINT').length * 6,
      rivals: cfg.rivals.map(r => r.name),
      checks: [
        { id: 'cfo', label: 'A CFO in post', ok: hasCFO, note: hasCFO ? 'Filing can be prepared in-house' : 'No filing can be prepared without one' },
        { id: 'audit', label: 'Independent audit complete', ok: hqLive, note: 'Books opened to an outside firm' },
        { id: 'rev', label: 'Four profitable quarters', ok: false, note: 'The company is still investing ahead of revenue' },
        { id: 'gov', label: 'Board constituted', ok: funds.investors.length > 0, note: 'At least one seat held by an outside director' },
        { id: 'ops', label: 'Twelve months without a major outage', ok: !night || night.failedPct === 0, note: night && night.failedPct > 0 ? `${night.failedPct}% of streams failed on opening night` : 'Clean record' },
      ],
      risks: [
        ...(night && night.failedPct > 0 ? [{
          id: 'r-outage', label: 'A major service outage on opening night',
          detail: `${night.failedPct}% of streams failed at peak and ${fmtCount(night.subsLost)} accounts were lost permanently.`,
          cost: .07,
        }] : []),
        ...(d.halls.length <= 1 ? [{
          id: 'r-single', label: 'Reliance on a single data centre',
          detail: 'All traffic is carried by one hall. There is no failover.',
          cost: .05,
        }] : []),
        {
          id: 'r-debt', label: 'Technical debt carried from sprint-built work',
          detail: 'Parts of the platform were built fast and have not been finished properly.',
          cost: .04,
        },
        {
          id: 'r-rights', label: 'Licences expiring within twelve months',
          detail: 'A material share of the catalogue is licensed rather than owned, and some windows close soon.',
          cost: .04,
        },
        {
          id: 'r-control', label: `The founder controls ${Math.max(0, 100 - funds.equityGiven).toFixed(1)}% of votes`,
          detail: 'Outside shareholders will have no practical ability to influence the company.',
          cost: .06,
        },
      ],
    };
  }, [buildDerived, cfg, execIds, funds, pr.arpu, peakNow, tech, night, hqLive]);

  const named = useMemo(() => brand.name.trim() ? brand : { ...brand, name: cfg.defaultName }, [brand, cfg.defaultName]);
  const c = brandColor(brand);

  return (
    <div className={css.ep2} style={{ ['--epx-ep2-brand' as string]: c, ['--epx-ep2-brand2' as string]: brandDeep(brand) }}>
      {debugNav && (
        <div className={css.devnav}>
          {PHASES.map(p => <button key={p} className={phase === p ? css.cur : ''} onClick={() => setPhase(p)}>{p.slice(0, 5)}</button>)}
        </div>
      )}
      {/* ── the quote lives here from the moment you list, and never leaves ── */}
      {listing && phase === 'BOARDROOM' && divTab === 'MARKETS' && (
        <StockBug ticker={listing.ticker} quote={liveQuote!} onOpen={() => setShowQuote(true)} />
      )}
      {listing && showQuote && (
        <StockPanel ticker={listing.ticker} quote={liveQuote!} closePrice={listing.closePrice}
          onClose={() => setShowQuote(false)} />
      )}

      {phase === 'WALL' && (
        <WallOfScreens
          playerName={cfg.playerName}
          avatarUrl={cfg.avatarUrl}
          rivals={cfg.rivals}
          requirements={cfg.unlockReqs.map(r => ({
            id: r.id, label: r.label, have: r.have, need: r.need,
            fmt: r.kind === 'money' ? fmt : (n: number) => String(Math.round(n)),
          }))}
          setupCost={fmt(cfg.setupCost)}
          treasury={fmt(cfg.openingTreasury)}
          totalCost={fmt(cfg.setupCost + cfg.openingTreasury)}
          onEnter={() => setPhase('CASE')}
          onClose={() => onClose?.()} />
      )}
      {phase === 'CASE' && (
        <MachineWakesUp playerName={cfg.playerName}
          totalCost={fmt(cfg.setupCost + cfg.openingTreasury)}
          applicant={{
            name: cfg.playerName,
            avatarUrl: cfg.avatarUrl,
            fame: cfg.unlockReqs.find(r => r.id === 'fame')?.have ?? 0,
            reputation: cfg.unlockReqs.find(r => r.id === 'rep')?.have ?? 0,
            liquid: fmt(cfg.unlockReqs.find(r => r.id === 'cash')?.have ?? cfg.playerCash),
            credits: cfg.starterTitles.slice(0, 3).map(t => t.name),
          }}
          onDone={() => setPhase('WIZARD')} />
      )}
      {phase === 'WIZARD' && (
        <StreamingFoundingWizardScene cfg={cfg} brand={brand} setBrand={setBrand} regions={regions} setRegions={setRegions}
          marketIds={marketIds} setMarketIds={setMarketIds}
          execIds={execIds} setExecIds={setExecIds}
          onIncorporate={t => { setTotal(t); if (!brand.name.trim()) setBrand(b => ({ ...b, name: cfg.defaultName })); setPhase('FOUNDING'); }}
          onBack={() => setPhase('WALL')} />
      )}
      {phase === 'FOUNDING' && (
        <Activation brand={named} playerName={cfg.playerName} regionCount={regions.length}
          disbursed={fmt(cfg.setupCost)} treasury={fmt(cfg.openingTreasury)}
          hires={cfg.execs.filter(e => execIds.includes(e.id)).map(e => ({ role: e.role, name: e.name }))}
          wall={<WallOfScreens playerName={cfg.playerName} avatarUrl={cfg.avatarUrl}
            rivals={cfg.rivals} requirements={[]} setupCost="" treasury="" totalCost=""
            claimed={{ mark: <Mark brand={named} />, name: named.name, color: brandColor(named) }}
            onEnter={() => { }} onClose={() => { }} />}
          onDone={() => setPhase('DESK')} />
      )}
      {phase === 'DESK' && (
        <PlatformHQ brand={named}
          state={buildHqState(cfg, regions, execIds, hqLive, readiness, {
            peak: peakNow,
            cities: buildDerived.halls.length,
            arpu: pr.sellable.length ? `$${pr.arpu.toFixed(2)}` : 'PENDING',
            plans: pr.sellable.length,
          }, catSummary, treasuryNow,
            night ? { subs: night.subsGained, lost: night.subsLost, failedPct: night.failedPct } : null,
            built, !!listing, hqLive && !listing)}
          onBack={() => onClose?.()}
          onOpenViewer={() => setPhase('VIEWER')}
          onOpenTitle={t => setDossier(t.id)}
          onOpenDivision={(d, chip) => {
            /* two chips are not tabs at all — pricing and raising money are
               overlays this component owns, so they short-circuit here */
            if (chip === 'PRICING') { setShowPricing(true); return; }
            if (chip === 'RAISE') { setShowRaise(true); return; }
            if (chip === 'HALLS') { setPhase('BUILD'); return; }
            if (chip === 'COMMISSION') { setPhase('CONTENT'); setDivTab('SLATE'); return; }
            setDivTab(chip ?? null);
            if (d === 'CONTENT') setPhase('CONTENT');
            if (d === 'NETWORK') setPhase('NETWORK');
            if (d === 'AUDIENCE') setPhase('AUDIENCE');
            if (d === 'BOARDROOM') setPhase('BOARDROOM');
          }}
          onEvent={e => {
            if (e.id === 'launch' || e.id === 'opening') { setPhase(built && !hqLive ? 'PREMIERE' : 'BUILD'); return; }
            if (e.id === 'crisis') { setDivTab('CAPACITY'); setPhase('NETWORK'); return; }
            if (e.id === 'fallout') { setDivTab('ANALYTICS'); setPhase('AUDIENCE'); return; }
            if (e.id.startsWith('div-')) {
              const d = e.id.slice(4) as 'CONTENT' | 'NETWORK' | 'AUDIENCE' | 'BOARDROOM';
              setDivTab(null); setPhase(d);
            }
          }}
          onLaunch={() => setPhase(built && !hqLive ? 'PREMIERE' : 'BUILD')}
          onCommission={() => { setDivTab('SLATE'); setPhase('CONTENT'); }}
          onSeeAll={() => { setDivTab('LIBRARY'); setPhase('CONTENT'); }} />
      )}
      {phase === 'BUILD' && (
        <TheBuild brand={named} inputs={buildInputs} sel={build}
          result={rehearsed}
          built={builtRacks}
          isLive={hqLive}
          onCommit={p => setBuiltRacks(p)}
          onOpenNight={() => setPhase('PREMIERE')}
          pricing={{
            label: pricing.model === 'ADS' ? 'Ad-supported'
              : pricing.model === 'SUBS' ? 'Subscription' : 'Free tier + subscription',
            arpu: pr.sellable.length ? `$${pr.arpu.toFixed(2)}` : '—',
            reach: `×${pr.reachMul.toFixed(2)}`,
            problems: pr.problems.length,
            sellable: pr.sellable.length,
          }}
          onOpenPricing={() => setShowPricing(true)}
          funding={{ borrowed: funds.debtOutstanding, soldPct: funds.equityGiven, own: funds.founderCash }}
          onRaise={() => setShowRaise(true)}
          onChange={s => { setBuildSel(s); setRehearsed(null); }}
          onResult={r => setRehearsed(r)}
          onBack={() => setPhase('DESK')}
          onLaunch={() => setPhase('PREMIERE')} />
      )}
      {phase === 'PREMIERE' && (
        <PremiereNight brand={named} inputs={premiereInputs}
          onBack={() => setPhase('DESK')}
          onDone={r => { setNight(r); setHqLive(true); setPhase('DESK'); }} />
      )}
      {phase === 'CONTENT' && (
        <ContentDesk brand={named} state={buildContentState(hqLive, rightsCalls)}
          initialTab={divTab as any ?? undefined}
          onBack={() => setPhase('DESK')}
          onOpenTitle={t => setDossier(t.title)}
          onRenew={t => {
            /* a renewal is money out of the treasury tonight, not a toggle */
            const cost = t.rights?.renewCost ?? 0;
            if (cost > treasuryNow) return;
            setOpsSpend(x => x + cost);
            setRightsCalls(r => ({ ...r, [t.id]: 'RENEWED' }));
          }}
          onLapse={t => setRightsCalls(r => ({ ...r, [t.id]: 'LAPSED' }))}
          onCommission={() => setPhase('BUILD')} />
      )}
      {phase === 'NETWORK' && (
        <NetworkDesk brand={named}
          state={buildNetworkState(
            hqLive, cityById(brand.serverCity)?.label ?? 'Los Angeles',
            buildDerived.halls, peakNow, caps, tech, paused)}
          initialTab={divTab as any ?? undefined}
          treasury={treasuryNow}
          onBack={() => setPhase('DESK')}
          onAddCity={() => setPhase('BUILD')}
          onBuild={(t, doctrine, cost, weeks) => {
            setOpsSpend(x => x + cost);
            setTech(list => list.map(x => x.id === t.id
              ? { ...x, building: { weeksLeft: weeks, doctrine }, debt: x.debt || doctrine === 'SPRINT' }
              : x));
          }}
          onCancelBuild={t => setTech(list => list.map(x => x.id === t.id
            ? { ...x, building: undefined } : x))}
          onToggleProduct={p => setPaused(x => ({ ...x, [p.id]: !x[p.id] }))} />
      )}
      {phase === 'AUDIENCE' && (
        <AudienceDesk brand={named} state={buildAudienceState(hqLive, named.name, regions)}
          initialTab={divTab as any ?? undefined}
          onBack={() => setPhase('DESK')} />
      )}
      {phase === 'BOARDROOM' && (
        <Boardroom brand={named} founderName={cfg.playerName}
          state={buildBoardroomState(cfg, execIds, hqLive, cfg.playerName, funds, {
            infraWeekly: buildDerived.weekly,
            cities: buildDerived.halls.length,
            peak: peakNow,
            arpu: pr.arpu,
            adsOn: pr.sellable.some(v => !v.tier.paid),
            treasury: treasuryNow,
          }, listing && liveQuote ? {
            ticker: listing.ticker, price: liveQuote.price, pct: liveQuote.pct,
            shares: 62_000_000,
            /* the plot walks from listing-day close to where it trades now */
            history: Array.from({ length: 12 }, (_, i) =>
              listing.closePrice + (liveQuote.price - listing.closePrice) * (i / 11)),
          } : undefined)}
          initialTab={divTab as any ?? undefined}
          onBack={() => setPhase('DESK')}
          onIssueEquity={() => setShowRaise(true)}
          onFileIpo={() => setPhase('IPO')} />
      )}
      {phase === 'IPO' && (
        <Listing brand={named} inputs={ipoInputs}
          onBack={() => setPhase('BOARDROOM')}
          onDone={r => {
            setListing(r);
            setSubsAtListing(ipoInputs.subscribers);
            setDivTab('MARKETS'); setPhase('BOARDROOM');
          }} />
      )}
      {phase === 'VIEWER' && (
        <ViewerApp brand={named} state={buildAppState(named, hqLive)}
          onBack={() => setPhase('DESK')} />
      )}
      {showRaise && (
        <RaiseDesk brand={named} founderName={cfg.playerName}
          founderAvailable={founderLeft} raises={raises}
          onSign={r => setRaises(x => [...x, r])}
          onClose={() => setShowRaise(false)} />
      )}
      {showPricing && (
        <PricingDesk brand={named} sel={pricing} caps={caps}
          ceiling={buildDerived.ceiling}
          expectedLikely={buildDerived.demandTotal('LIKELY')}
          onChange={s => { setPricing(s); setRehearsed(null); }}
          onClose={() => setShowPricing(false)} />
      )}
      {dossier && (() => {
        /* callers pass either an id (HQ rail) or a title (Content Desk), so match both */
        const all = buildAppState(named, hqLive).titles;
        const fallback = all.find(x => x.id === dossier) ?? all.find(x => x.title === dossier) ?? all[0];
        return (
          <TitleDossier brand={named} t={dossierFor(dossier, fallback)}
            onClose={() => setDossier(null)} />
        );
      })()}
    </div>
  );
};

export default EmpirePlusV2;

/* Styles live in the scoped Shell CSS module. */
