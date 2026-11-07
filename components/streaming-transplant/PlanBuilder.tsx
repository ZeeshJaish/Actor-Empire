/* ============================================================================
   PLAN BUILDER — a service's plans side by side (plan §6.2–§6.5, Phase 2 #45–#47).

   Columns are plans, side-scrolling past the third; rows are the price, ads
   and what each plan offers (picture, HDR, colour, sound, Clear dialogue,
   screens, downloads) and adds (early premieres, Live events, an extra member,
   the full catalogue). Tapping a cell opens its picker at the foot of the
   screen. A step the service cannot sell yet is grey with a lock: tapping it
   gives a small shake and says what to unlock, with Go to Tech.

   Two more columns when they run, held to the same tech:
     Free with ads (#46)  first: its ad breaks and its own quality
     Rent or buy (#47)    last: its own quality, and its editions' prices and
                          rental length behind its price cell
   They sit alone when the service sells no plans.

   The same table sits in Define the Launch › Pricing and in the Platform
   room's Offer tab. Presentation only: every edit is a pure function of
   services/streamingPlanBuilder.ts, handed back whole through onChange.

   #105 (plan §18.4) tier columns: each column opens with its colour band,
   its name and a big price (the price row is gone); its cells are chips (the
   best picture in the table golden), ad pips, screens, ticks and a download
   arrow. A row the service cannot sell yet shows locks, and its name an
   "Unlock ›" that opens that exact Tech step.
   ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import css from './presentation/screens/NetworkDesk/PlanBuilder.module.css';
import { cx } from './presentation/cx';
import type {
  OwnedStreamingPricingConfiguration,
  OwnedStreamingPricingPlan,
  OwnedStreamingTechTreeState,
  StreamingPricingPlanColorId,
  StreamingTechId,
} from '../../types';
import { projectStreamingCommercialOffers } from '../../services/streamingCommercialOffers';
import {
  STREAMING_STORE_BUY_MAX, STREAMING_STORE_RENT_MAX, STREAMING_STORE_TOP_BUY_MAX, STREAMING_STORE_TOP_RENT_MAX,
} from '../../services/streamingPricingEconomy';
import { STREAMING_FREE_TIER_ID, STREAMING_FREE_TIER_NAME, streamingPictureRank, type StreamingPlanOfferLock } from '../../services/streamingPlanOffer';
import { STREAMING_STORE_ID, STREAMING_STORE_NAME, resolveStreamingStoreEditions } from '../../services/streamingStoreEditions';
import { getStreamingTechDefinition } from '../../services/streamingTechTreeCatalogue';
import {
  STREAMING_FREE_TIER_AD_OPTIONS,
  STREAMING_FREE_TIER_ROWS,
  STREAMING_STORE_ROWS,
  addStreamingPlan,
  applyStreamingFreeTierChoice,
  applyStreamingPlanBuilderChoice,
  applyStreamingStoreChoice,
  duplicateStreamingPlan,
  removeStreamingPlan,
  renameStreamingPlan,
  replaceWithStreamingStarterPlans,
  setStreamingPlanColour,
  setStreamingPlanPrice,
  setStreamingStoreTerms,
  setStreamingStoreTopEdition,
  streamingFreeTierCellLock,
  streamingFreeTierOptionLock,
  streamingFreeTierValue,
  streamingPlanBuilderCellLock,
  streamingPlanBuilderOptionLock,
  streamingPlanBuilderValue,
  streamingStoreCellLock,
  streamingStoreOptionLock,
  streamingStoreValue,
  type StreamingPlanBuilderOption,
  type StreamingPlanBuilderRow,
  type StreamingPlanBuilderRowId,
  type StreamingPlanBuilderView,
} from '../../services/streamingPlanBuilder';
import { STREAMING_OFFER_PERSONALITY } from './offerPersonality';

export interface PlanBuilderFooter {
  /** the row's name: "Forecast", "On it" */
  label: string;
  /** per plan id (the free tier: STREAMING_FREE_TIER_ID, the store: STREAMING_STORE_ID): a figure and a small detail ("19.1M", "86%") */
  cells: Record<string, { value: string; detail?: string } | undefined>;
  /** shown for a plan without a figure */
  empty?: string;
}

export interface PlanBuilderProps {
  pricing: OwnedStreamingPricingConfiguration;
  builder: StreamingPlanBuilderView;
  /** the pricing in force, when a live offer is being edited: changed cells are marked, new plans tagged */
  saved?: OwnedStreamingPricingConfiguration;
  footer?: PlanBuilderFooter;
  /** absent: the table is read-only */
  onChange?: (pricing: OwnedStreamingPricingConfiguration) => void;
  onGoToTech?: (techId: StreamingTechId) => void;
  /** more lines in the price picker for a plan (what its discounts make of it) */
  priceDetail?: (plan: OwnedStreamingPricingPlan) => React.ReactNode;
  /** a price being typed, before it is committed (null when it ends) */
  onPricePreview?: (pricing: OwnedStreamingPricingConfiguration | null) => void;
  /** offer "Suggest plans from my tech" */
  suggest?: boolean;
  /** colour swatches in each plan's menu */
  colours?: readonly StreamingPricingPlanColorId[];
  /** #107: the host's ad breaks and store controls (one editor each, plan §18.3): the free column's Ads cell and the
      store's price open them instead of a picker of their own */
  onOpenControl?: (control: 'ADS' | 'STORE') => void;
}

type CellRow = 'price' | StreamingPlanBuilderRowId;
type Cell = { planId: string; row: CellRow };
/* slot: an empty cell the service cannot fill yet, with the tech that fills it */
type CellView = { value: string | null; text: string; lock: StreamingPlanOfferLock | null; changed: boolean; slot: StreamingPlanOfferLock | null };
type BuilderView = Pick<StreamingPlanBuilderView, 'tree' | 'levels'>;

const FREE = STREAMING_FREE_TIER_ID;
const STORE = STREAMING_STORE_ID;
const COLOUR_HEX: Record<StreamingPricingPlanColorId, string> = {
  emerald: '#34d399', ocean: '#38bdf8', teal: '#2dd4bf', rose: '#fb7185', magenta: '#e879f9', graphite: '#94a3b8',
};
/* the free column and the store wear their offers' colours (#104) */
const FREE_COLOUR = STREAMING_OFFER_PERSONALITY.ADS.colour;
const STORE_COLOUR = STREAMING_OFFER_PERSONALITY.STORE.colour;
const AD_PIPS: Record<string, number> = { NONE: 0, LIGHT: 1, STANDARD: 2, HEAVY: 3 };
const LIMIT_WORDS: Record<number, string> = { 12: 'Twelve' };
const price = (value: number) => (value <= 0 ? 'Free' : `$${value.toFixed(2)}`);
const step = (value: number, by: number) => Math.round((value + by) * 100) / 100;

/* the free tier's and the store's columns: what they read, lock and change, and what their pickers say */
interface SpecialApi {
  name: string;
  rows: StreamingPlanBuilderRowId[];
  value: (pricing: OwnedStreamingPricingConfiguration, row: StreamingPlanBuilderRowId, tree: OwnedStreamingTechTreeState) => string | null;
  optionLock: (pricing: OwnedStreamingPricingConfiguration, row: StreamingPlanBuilderRowId, value: string, view: BuilderView) => StreamingPlanOfferLock | null;
  cellLock: (pricing: OwnedStreamingPricingConfiguration, row: StreamingPlanBuilderRowId, view: BuilderView) => StreamingPlanOfferLock | null;
  apply: (pricing: OwnedStreamingPricingConfiguration, row: StreamingPlanBuilderRowId, value: string, view: BuilderView) => OwnedStreamingPricingConfiguration;
  isSet: (pricing: OwnedStreamingPricingConfiguration) => boolean;
  unsetNote: string;
  setNote: string;
}
const SPECIALS: Record<string, SpecialApi> = {
  [FREE]: {
    name: STREAMING_FREE_TIER_NAME, rows: STREAMING_FREE_TIER_ROWS,
    value: streamingFreeTierValue, optionLock: streamingFreeTierOptionLock, cellLock: streamingFreeTierCellLock, apply: applyStreamingFreeTierChoice,
    isSet: pricing => Boolean(pricing.freeAdOffer),
    // #57: a free tier also draws in people who would pirate your titles
    unsetNote: 'Until you set it, free viewers watch what your plans\' viewers watch. Pick a step to give the free tier its own quality. A free tier also draws in people who would pirate your titles.',
    setNote: 'Better quality draws more free viewers, pirates among them, and keeps them watching, so more ad money, but every viewer costs more to stream.',
  },
  [STORE]: {
    name: STREAMING_STORE_NAME, rows: STREAMING_STORE_ROWS,
    value: streamingStoreValue, optionLock: streamingStoreOptionLock, cellLock: streamingStoreCellLock, apply: applyStreamingStoreChoice,
    isSet: pricing => Boolean(pricing.storeQuality),
    unsetNote: 'Until you set it, store buyers watch what your plans\' viewers watch. Pick a step to give Rent or buy its own quality.',
    setNote: 'A better store turns more of its shoppers into buyers. Above 1080p it sells an HD edition and a top edition: set their prices from the Price cell.',
  },
};

const Lock: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 16 16" className={cx(css.lock, className)} aria-hidden="true">
    <rect x="3.2" y="7" width="9.6" height="7" rx="1.6" /><path d="M5.4 7V5.2a2.6 2.6 0 015.2 0V7" />
  </svg>
);
const Tick = () => (
  <svg viewBox="0 0 16 16" className={css.glyph} aria-hidden="true"><circle cx="8" cy="8" r="6.3" /><path d="M5.3 8.3l1.9 1.9 3.6-4" /></svg>
);
const Download = () => (
  <svg viewBox="0 0 16 16" className={css.glyph} aria-hidden="true"><path d="M8 2.6v7.2M4.9 7.1 8 10.2l3.1-3.1M3.3 13h9.4" /></svg>
);
const Screen = () => (
  <svg viewBox="0 0 12 10" className={css.screen} aria-hidden="true"><rect x="1" y="1" width="10" height="6.2" rx="1.2" /><path d="M4.3 9h3.4" /></svg>
);
/* #106 the devices a plan plays on: a TV, a laptop, a phone, a tablet */
const Laptop = () => (
  <svg viewBox="0 0 12 10" className={css.screen} aria-hidden="true"><rect x="2.2" y="1.6" width="7.6" height="5" rx=".9" /><path d="M.8 8.6h10.4" /></svg>
);
const Phone = () => (
  <svg viewBox="0 0 12 10" className={css.screen} aria-hidden="true"><rect x="3.6" y=".8" width="4.8" height="8.4" rx="1.1" /><path d="M5.5 7.6h1" /></svg>
);
const Tablet = () => (
  <svg viewBox="0 0 12 10" className={css.screen} aria-hidden="true"><rect x="2" y=".8" width="8" height="8.4" rx="1.2" /><path d="M5.5 7.7h1" /></svg>
);

/* an empty cell (the row's "off") whose first step needs a tech the service has not unlocked: HDR, Downloads, Kids profiles… */
const slotLock = (row: StreamingPlanBuilderRow, value: string | null, lockOf: (value: string) => StreamingPlanOfferLock | null): StreamingPlanOfferLock | null => {
  const [off, first] = row.options;
  if (value === null || !off || !first || off.short !== '—' || value !== off.value) return null;
  const lock = lockOf(first.value);
  return lock?.techId && !lock.combination ? lock : null;
};

/* what a cell shows: ad pips, a chip (the table's best picture golden), screens, a tick, a download arrow, a lock or a dash */
const Face: React.FC<{ row: StreamingPlanBuilderRowId; item: CellView; free?: boolean; gold?: boolean; mobile?: boolean }> = ({ row, item, free, gold, mobile }) => {
  if (row === 'ads') {
    // the free tier runs the service's cadence, the "Standard" a plan's ad level halves or doubles
    const pips = free ? 2 : AD_PIPS[item.value ?? 'NONE'] ?? 0;
    if (!pips) return <span className={css.noAds}>No ads</span>;
    return (
      <span className={css.adFace}>
        <span className={css.pips}>{[0, 1, 2].map(index => <i key={index} className={index < pips ? css.pipOn : undefined} />)}</span>
        <small>{item.text}</small>
      </span>
    );
  }
  if (item.text === '—') return item.slot ? <Lock className={css.slotLock} /> : <span className={css.dash}>—</span>;
  if (row === 'devices') {
    return (
      <span className={css.adFace}>
        <span className={css.devices}>{item.value === 'mobile' ? <><Phone /><Tablet /></> : <><Screen /><Laptop /><Phone /></>}</span>
        <small>{item.value === 'mobile' ? 'Phones' : 'Every device'}</small>
      </span>
    );
  }
  if (row === 'screens') {
    // the screens a plan streams to at once, drawn as its devices (#106: a phones-only plan's are phones)
    const count = Number(item.value) || 1;
    return (
      <span className={css.screens} style={{ gridTemplateColumns: `repeat(${count === 4 ? 2 : Math.min(count, 3)}, auto)` }}>
        {Array.from({ length: count }, (_, index) => (mobile ? <Phone key={index} /> : <Screen key={index} />))}
      </span>
    );
  }
  if (row === 'downloads') return <Download />;
  if (item.text === '✓') return <Tick />;
  return <span className={cx(css.chip, gold && css.gold)}>{item.text}</span>;
};

/* the price picker: − / typed figure / +, committed on blur, Enter or a step */
const PriceEditor: React.FC<{ value: number; onCommit: (value: number) => void; onPreview?: (value: number | null) => void }> = ({ value, onCommit, onPreview }) => {
  const [text, setText] = useState(value.toFixed(2));
  useEffect(() => setText(value.toFixed(2)), [value]);
  const commit = () => {
    const parsed = Number(text);
    onPreview?.(null);
    if (Number.isFinite(parsed) && text.trim()) onCommit(parsed); else setText(value.toFixed(2));
  };
  return (
    <div className={css.priceEdit}>
      <button type="button" onClick={() => onCommit(step(value, -1))} aria-label="Lower the price by $1">−</button>
      <label>
        <span aria-hidden="true">$</span>
        <input type="number" inputMode="decimal" min={0} max={100} step="0.01" value={text} aria-label="Price a month"
          onChange={event => {
            setText(event.target.value);
            const parsed = Number(event.target.value);
            onPreview?.(event.target.value.trim() && Number.isFinite(parsed) ? parsed : null);
          }}
          onBlur={commit}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
        <i>/month</i>
      </label>
      <button type="button" onClick={() => onCommit(step(value, 1))} aria-label="Raise the price by $1">+</button>
    </div>
  );
};

/* one figure with − and + (the store's prices and rental length) */
const Stepper: React.FC<{ label: string; value: string; onLower: () => void; onRaise: () => void; canLower?: boolean; canRaise?: boolean }> = ({
  label, value, onLower, onRaise, canLower = true, canRaise = true,
}) => (
  <div className={css.stepRow} role="group" aria-label={label}>
    <span>{label}</span>
    <button type="button" onClick={onLower} disabled={!canLower} aria-label={`Lower ${label.toLowerCase()}`}>−</button>
    <b>{value}</b>
    <button type="button" onClick={onRaise} disabled={!canRaise} aria-label={`Raise ${label.toLowerCase()}`}>+</button>
  </div>
);

/* the store's price picker: its HD prices, its top edition's (when it sells above 1080p), its rental length */
const StorePrices: React.FC<{ pricing: OwnedStreamingPricingConfiguration; tree: OwnedStreamingTechTreeState; onChange: (next: OwnedStreamingPricingConfiguration) => void }> = ({
  pricing, tree, onChange,
}) => {
  const editions = resolveStreamingStoreEditions(pricing, tree);
  const top = pricing.storeTopEdition;
  const topName = editions.topPicture ? getStreamingTechDefinition(editions.topPicture)?.name || null : null;
  const rent = pricing.rentals.rent;
  const buy = pricing.rentals.buy;
  const weeks = pricing.rentals.windowWeeks;
  return (
    <div className={css.storePrices}>
      <span className={css.eyebrow}>{topName ? 'HD EDITION' : 'EVERY TITLE'}</span>
      {/* #103: the store card's range, not $100 */}
      <Stepper label="Rent" value={price(rent)} canLower={rent > 1} canRaise={rent < STREAMING_STORE_RENT_MAX}
        onLower={() => onChange(setStreamingStoreTerms(pricing, { rent: step(rent, -.5) }))}
        onRaise={() => onChange(setStreamingStoreTerms(pricing, { rent: step(rent, .5) }))} />
      <Stepper label="Buy" value={price(buy)} canLower={buy > 1} canRaise={buy < STREAMING_STORE_BUY_MAX}
        onLower={() => onChange(setStreamingStoreTerms(pricing, { buy: step(buy, -1) }))}
        onRaise={() => onChange(setStreamingStoreTerms(pricing, { buy: step(buy, 1) }))} />
      {topName && (
        <>
          <span className={css.eyebrow}>{topName.toUpperCase()} EDITION</span>
          <div className={css.segments} role="group" aria-label={`${topName} edition price`}>
            <button type="button" aria-pressed={!top} onClick={() => onChange(setStreamingStoreTopEdition(pricing, null))}>Same as HD</button>
            <button type="button" aria-pressed={Boolean(top)}
              onClick={() => onChange(setStreamingStoreTopEdition(pricing, top || { rent: step(rent, 2), buy: step(buy, 5) }))}>Its own price</button>
          </div>
          {top && (
            <>
              <Stepper label={`Rent in ${topName}`} value={price(top.rent)} canLower={top.rent > rent} canRaise={top.rent < STREAMING_STORE_TOP_RENT_MAX}
                onLower={() => onChange(setStreamingStoreTopEdition(pricing, { ...top, rent: step(top.rent, -.5) }))}
                onRaise={() => onChange(setStreamingStoreTopEdition(pricing, { ...top, rent: step(top.rent, .5) }))} />
              <Stepper label={`Buy in ${topName}`} value={price(top.buy)} canLower={top.buy > buy} canRaise={top.buy < STREAMING_STORE_TOP_BUY_MAX}
                onLower={() => onChange(setStreamingStoreTopEdition(pricing, { ...top, buy: step(top.buy, -1) }))}
                onRaise={() => onChange(setStreamingStoreTopEdition(pricing, { ...top, buy: step(top.buy, 1) }))} />
            </>
          )}
          <p className={css.sheetNote}>
            {Math.round(editions.topRentShare * 100)}% of renters take {topName}
            {top ? `, so a rental earns ${price(editions.rentPrice)} on average and a purchase ${price(editions.buyPrice)}.` : ' at the HD price.'}
            {' '}Fewer take it the more it costs, and each {topName} viewer needs more of your servers.
          </p>
        </>
      )}
      <span className={css.eyebrow}>RENTAL</span>
      <Stepper label="Rental length" value={`${weeks} week${weeks === 1 ? '' : 's'}`} canLower={weeks > 1} canRaise={weeks < 16}
        onLower={() => onChange(setStreamingStoreTerms(pricing, { windowWeeks: weeks - 1 }))}
        onRaise={() => onChange(setStreamingStoreTerms(pricing, { windowWeeks: weeks + 1 }))} />
      <p className={css.sheetNote}>How long a rental lasts. It never outlasts a title's rights.</p>
    </div>
  );
};

export const PlanBuilder: React.FC<PlanBuilderProps> = ({
  pricing, builder, saved, footer, onChange, onGoToTech, priceDetail, onPricePreview, suggest, colours, onOpenControl,
}) => {
  const readOnly = !onChange;
  const root = useRef<HTMLDivElement>(null);
  const plansOn = pricing.streams.includes('subs');
  const projection = useMemo(() => projectStreamingCommercialOffers(pricing), [pricing]);
  const savedProjection = useMemo(() => (saved ? projectStreamingCommercialOffers(saved) : null), [saved]);
  const freeOn = Boolean(projection.freeAdOffer);
  const storeOn = Boolean(projection.storeOffer);
  const plans = plansOn ? pricing.plans : [];
  const [cell, setCell] = useState<Cell | null>(null);
  const [lockNote, setLockNote] = useState<{ value: string; lock: StreamingPlanOfferLock; key: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirmSuggest, setConfirmSuggest] = useState(false);
  const openSpecial = cell && ((cell.planId === FREE && freeOn) || (cell.planId === STORE && storeOn)) ? SPECIALS[cell.planId] : null;
  const openPlan = cell && cell.planId !== FREE && cell.planId !== STORE ? plans.find(plan => plan.id === cell.planId) || null : null;
  const openRow: StreamingPlanBuilderRow | null = cell && cell.row !== 'price' ? builder.rows.find(row => row.id === cell.row) || null : null;
  const rowLabel = (row: CellRow) => (row === 'price' ? (cell?.planId === STORE ? 'Prices and rental' : 'Price a month') : builder.rows.find(item => item.id === row)?.label || row);

  /* a picker or menu closes with Escape; a column that goes away takes its picker with it */
  useEffect(() => {
    if (!cell && !menu) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setCell(null); setMenu(null); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [cell, menu]);
  useEffect(() => { setLockNote(null); }, [cell?.planId, cell?.row]);
  useEffect(() => { if (cell && !openPlan && !openSpecial) setCell(null); }, [cell, openPlan, openSpecial]);

  /* what each plan's cells show, and whether they moved from the pricing in force */
  const table = useMemo(() => plans.map(plan => {
    const before = saved?.plans.find(item => item.id === plan.id);
    const cells: CellView[] = builder.rows.map(row => {
      const value = streamingPlanBuilderValue(pricing, plan, row.id, builder.tree);
      return {
        value,
        text: row.options.find(item => item.value === value)?.short ?? value,
        lock: streamingPlanBuilderCellLock(pricing, plan, row.id, builder),
        // a new plan is tagged NEW instead
        changed: Boolean(saved && before && streamingPlanBuilderValue(saved, before, row.id, builder.tree) !== value),
        slot: slotLock(row, value, option => streamingPlanBuilderOptionLock(pricing, plan, row.id, option, builder)),
      };
    });
    return { plan, cells, isNew: Boolean(saved && !before), priceChanged: Boolean(saved && before && before.monthly !== plan.monthly) };
  }), [plans, pricing, builder, saved]);

  /* the free tier's and the store's columns: their rows, the rest "—" */
  const special = (id: string, on: boolean, wasOn: boolean) => {
    if (!on) return null;
    const api = SPECIALS[id];
    const isNew = Boolean(saved && !wasOn);
    const cells: CellView[] = builder.rows.map(row => {
      const value = api.value(pricing, row.id, builder.tree);
      if (value === null) return { value, text: '—', lock: null, changed: false, slot: null };
      const options: StreamingPlanBuilderOption[] = id === FREE && row.id === 'ads' ? STREAMING_FREE_TIER_AD_OPTIONS : row.options;
      return {
        value,
        // a saved ad load off the presets reads as itself
        text: options.find(item => item.value === value)?.short ?? (row.id === 'ads' ? `${pricing.ads.minutesPerHour} min/h` : value),
        lock: api.cellLock(pricing, row.id, builder),
        changed: Boolean(saved && !isNew && api.value(saved, row.id, builder.tree) !== value),
        slot: row.id === 'ads' ? null : slotLock(row, value, option => api.optionLock(pricing, row.id, option, builder)),
      };
    });
    return { id, api, cells, isNew, set: api.isSet(pricing) };
  };
  const free = useMemo(() => special(FREE, freeOn, Boolean(savedProjection?.freeAdOffer)), [freeOn, pricing, builder, saved, savedProjection]); // eslint-disable-line react-hooks/exhaustive-deps
  const store = useMemo(() => special(STORE, storeOn, Boolean(savedProjection?.storeOffer)), [storeOn, pricing, builder, saved, savedProjection]); // eslint-disable-line react-hooks/exhaustive-deps
  const storePricesChanged = Boolean(store && saved && !store.isNew && (saved.rentals.rent !== pricing.rentals.rent || saved.rentals.buy !== pricing.rentals.buy
    || saved.rentals.windowWeeks !== pricing.rentals.windowWeeks || JSON.stringify(saved.storeTopEdition) !== JSON.stringify(pricing.storeTopEdition)));

  const change = (next: OwnedStreamingPricingConfiguration) => onChange?.(next);
  const lockOf = (value: string): StreamingPlanOfferLock | null => {
    if (!openRow) return null;
    if (openSpecial) return openSpecial.optionLock(pricing, openRow.id, value, builder);
    return openPlan ? streamingPlanBuilderOptionLock(pricing, openPlan, openRow.id, value, builder) : null;
  };
  const pick = (value: string) => {
    if (!openRow || (!openPlan && !openSpecial)) return;
    const lock = lockOf(value);
    if (lock) { setLockNote({ value, lock, key: Date.now() }); return; }
    change(openSpecial
      ? openSpecial.apply(pricing, openRow.id, value, builder)
      : applyStreamingPlanBuilderChoice(pricing, openPlan!.id, openRow.id, value, builder));
    setCell(null);
  };
  const add = () => {
    const result = addStreamingPlan(pricing, builder);
    if (!result.planId) return;
    change(result.pricing);
    setMenu(null);
  };

  /* with no plans, only the rows the free tier and the store have */
  const specialRows = [...(free ? STREAMING_FREE_TIER_ROWS : []), ...(store ? STREAMING_STORE_ROWS : [])];
  const visibleRows = plansOn ? builder.rows : builder.rows.filter(row => specialRows.includes(row.id));
  const rowIndex = (row: StreamingPlanBuilderRow) => builder.rows.indexOf(row);
  const devicesIndex = builder.rows.findIndex(row => row.id === 'devices');
  /* a row's cells across the columns shown: the free tier, the plans, the store */
  const across = (row: StreamingPlanBuilderRow): CellView[] => {
    const index = rowIndex(row);
    return [...(free ? [free.cells[index]] : []), ...table.map(item => item.cells[index]), ...(store ? [store.cells[index]] : [])];
  };
  /* Zeesh: "480p 720p 1080p को गोल्डन करती है, वो काफ़ी बढ़िया है" (plan §18.10): the best picture sold in the table is a golden chip */
  const pictureRow = builder.rows.find(row => row.id === 'picture');
  const pictureRanks = pictureRow ? across(pictureRow).filter(item => item.value).map(item => streamingPictureRank(item.value as StreamingTechId)) : [];
  const bestPicture = pictureRanks.length ? Math.max(...pictureRanks) : -1;
  const isGold = (row: StreamingPlanBuilderRow, item: CellView) => row.id === 'picture' && Boolean(item.value) && streamingPictureRank(item.value as StreamingTechId) === bestPicture;
  /* a row every column has locked (no HDR, Downloads, Kids profiles… yet): its name opens the step in Tech */
  const rowUnlock = (row: StreamingPlanBuilderRow): StreamingPlanOfferLock | null => {
    const cells = across(row).filter(item => item.value !== null);
    return cells.length > 0 && cells.every(item => item.slot) ? cells[0].slot : null;
  };
  const full = plans.length >= builder.maxPlans;
  const limitLabel = `${LIMIT_WORDS[builder.maxPlans] || builder.maxPlans}-plan limit`;
  const sheetName = openSpecial ? openSpecial.name : openPlan?.name || '';
  const sheetOptions: StreamingPlanBuilderOption[] = openRow
    ? cell?.planId === FREE && openRow.id === 'ads' ? STREAMING_FREE_TIER_AD_OPTIONS : openRow.options
    : [];
  const currentValue = openRow
    ? openSpecial ? openSpecial.value(pricing, openRow.id, builder.tree)
      : openPlan ? streamingPlanBuilderValue(pricing, openPlan, openRow.id, builder.tree) : null
    : null;
  const specialSet = cell?.planId === FREE ? free?.set : cell?.planId === STORE ? store?.set : false;

  type Special = NonNullable<typeof free>;
  const tint = (colour: string | undefined) => (colour ? { ['--pc' as string]: colour } as React.CSSProperties : undefined);
  const specialColour = (column: Special) => (column.id === FREE ? FREE_COLOUR : STORE_COLOUR);
  /* a cell's words for a screen reader: what it holds, what it needs */
  const wordsOf = (name: string, row: StreamingPlanBuilderRow, item: CellView) => {
    const off = item.text === '—';
    return `${name} ${row.label}: ${off ? 'none' : item.text}${item.lock ? `, ${item.lock.needs}` : item.slot ? `, ${item.slot.needs}` : ''}`;
  };
  /* the column's top: its band, its name and its big price (the store: a rental, with the purchase under it) */
  const specialHead = (column: Special) => {
    const isStore = column.id === STORE;
    const active = isStore && cell?.planId === STORE && cell.row === 'price';
    const figure = isStore
      ? <><b>{price(pricing.rentals.rent)}</b><small>rent · buy {price(pricing.rentals.buy)}</small></>
      : <><b>Free</b><small>ads pay</small></>;
    return (
      <th key={column.id} scope="col" className={cx(css.planHead, css.freeHead)} style={tint(specialColour(column))}>
        {column.isNew && <span className={css.newTag}>NEW</span>}
        <span className={css.planName}>{column.api.name}</span>
        {isStore && !readOnly ? (
          <button type="button" className={cx(css.headPrice, active && css.active, storePricesChanged && css.changed)}
            onClick={() => (onOpenControl ? onOpenControl('STORE') : setCell(active ? null : { planId: STORE, row: 'price' }))}
            aria-label={`${column.api.name} prices: rent ${price(pricing.rentals.rent)}, buy ${price(pricing.rentals.buy)}. Change`}>{figure}</button>
        ) : <span className={css.headPrice}>{figure}</span>}
        {!column.set && <span className={css.freeHint}>Quality not set</span>}
      </th>
    );
  };
  const specialCell = (column: Special, row: StreamingPlanBuilderRow) => {
    const item = column.cells[rowIndex(row)];
    if (item.value === null) {
      return <td key={column.id} className={cx(css.cell, css.off)} style={tint(specialColour(column))}><span aria-label={`${column.api.name} ${row.label}: not part of it`}>—</span></td>;
    }
    const active = cell?.planId === column.id && cell.row === row.id;
    const off = item.text === '—';
    const words = wordsOf(column.api.name, row, item);
    const content = <><Face row={row.id} item={item} free={column.id === FREE} gold={isGold(row, item)} />{item.lock && <Lock className={css.cellLock} />}</>;
    return (
      <td key={column.id} style={tint(specialColour(column))} className={cx(css.cell, active && css.active, off && css.off, !column.set && row.id !== 'ads' && !off && css.unset,
        item.lock && css.cellLocked, item.changed && css.changed)}>
        {readOnly ? <span aria-label={words}>{content}</span> : (
          <button type="button" aria-label={`${words}. Change`} onClick={() => (onOpenControl && column.id === FREE && row.id === 'ads'
            ? onOpenControl('ADS') : setCell(active ? null : { planId: column.id, row: row.id }))}>{content}</button>
        )}
      </td>
    );
  };

  return (
    <div ref={root} className={cx(css.builder, !readOnly && css.editable)}>
      {plansOn && (
        <div className={css.head}>
          <span className={css.count}>{plans.length} of {builder.maxPlans} plans</span>
          {!readOnly && suggest && builder.suggestions.length > 0 && (
            confirmSuggest ? (
              <span className={css.confirm} role="group" aria-label="Replace your plans">
                <span>Replace your plans with {builder.suggestions.length} starters?</span>
                <button type="button" onClick={() => { change(replaceWithStreamingStarterPlans(pricing, builder)); setConfirmSuggest(false); setCell(null); }}>Replace</button>
                <button type="button" onClick={() => setConfirmSuggest(false)}>Keep mine</button>
              </span>
            ) : (
              <button type="button" className={css.suggest} onClick={() => setConfirmSuggest(true)}>Suggest plans from my tech</button>
            )
          )}
        </div>
      )}

      <div className={css.scroll} role="region" aria-label="Plans side by side" tabIndex={0}>
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.corner} scope="col"><span className={css.eyebrow}>PLAN</span></th>
              {free && specialHead(free)}
              {table.map(({ plan, isNew, priceChanged }) => (
                <th key={plan.id} scope="col" className={css.planHead} style={tint(plan.colorId ? COLOUR_HEX[plan.colorId] : undefined)}>
                  {isNew && <span className={css.newTag}>NEW</span>}
                  {renaming === plan.id && !readOnly ? (
                    <input className={css.rename} defaultValue={plan.name} maxLength={40} autoFocus aria-label="Plan name"
                      onFocus={event => event.currentTarget.select()}
                      onBlur={event => { change(renameStreamingPlan(pricing, plan.id, event.currentTarget.value)); setRenaming(null); }}
                      onKeyDown={event => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') setRenaming(null);
                      }} />
                  ) : readOnly ? (
                    <span className={css.planName}>{plan.name}</span>
                  ) : (
                    <button type="button" className={css.planName} onClick={() => { setRenaming(plan.id); setMenu(null); }}
                      aria-label={`${plan.name}. Rename`}>{plan.name}</button>
                  )}
                  {readOnly ? (
                    <span className={css.headPrice}><b>{price(plan.monthly)}</b><small>a month</small></span>
                  ) : (
                    <button type="button" className={cx(css.headPrice, cell?.planId === plan.id && cell.row === 'price' && css.active, priceChanged && css.changed)}
                      onClick={() => setCell(cell?.planId === plan.id && cell.row === 'price' ? null : { planId: plan.id, row: 'price' })}
                      aria-label={`${plan.name} price: ${price(plan.monthly)} a month. Change`}><b>{price(plan.monthly)}</b><small>a month</small></button>
                  )}
                  {!readOnly && (
                    <span className={css.menuWrap}>
                      <button type="button" className={css.more} aria-label={`More for ${plan.name}`} aria-expanded={menu === plan.id}
                        onClick={() => setMenu(menu === plan.id ? null : plan.id)}>⋯</button>
                      {menu === plan.id && (
                        <span className={css.menu} role="menu">
                          {colours && colours.length > 0 && (
                            <span className={css.swatches} role="group" aria-label="Plan colour">
                              {colours.map(colorId => (
                                <button key={colorId} type="button" className={css.swatch} aria-label={`${colorId} colour`}
                                  aria-pressed={plan.colorId === colorId} style={{ ['--sw' as string]: COLOUR_HEX[colorId] }}
                                  onClick={() => { change(setStreamingPlanColour(pricing, plan.id, colorId)); setMenu(null); }} />
                              ))}
                            </span>
                          )}
                          <button type="button" role="menuitem" disabled={full}
                            onClick={() => { const result = duplicateStreamingPlan(pricing, plan.id, builder); if (result.planId) change(result.pricing); setMenu(null); }}>Duplicate</button>
                          <button type="button" role="menuitem" disabled={plans.length <= 1}
                            onClick={() => { change(removeStreamingPlan(pricing, plan.id)); setMenu(null); }}>Remove</button>
                        </span>
                      )}
                    </span>
                  )}
                </th>
              ))}
              {store && specialHead(store)}
              {!readOnly && plansOn && (
                <th scope="col" className={css.addHead}>
                  <button type="button" className={css.add} disabled={full} onClick={add}>{full ? limitLabel : '+ Add plan'}</button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, visibleIndex) => {
              const unlock = rowUnlock(row);
              return (
              <tr key={row.id} className={cx(visibleIndex === 0 || row.id === 'early' ? css.groupStart : undefined, unlock && css.lockedRow)}>
                <th scope="row" className={css.rowHead}>
                  {row.label}
                  {unlock?.techId && onGoToTech && (
                    <button type="button" className={css.rowUnlock} onClick={() => { setCell(null); onGoToTech(unlock.techId!); }}
                      aria-label={unlock.needs}><Lock />Unlock ›</button>
                  )}
                </th>
                {free && specialCell(free, row)}
                {table.map(({ plan, cells }) => {
                  const item = cells[rowIndex(row)];
                  const active = cell?.planId === plan.id && cell.row === row.id;
                  const off = item.text === '—';
                  const words = wordsOf(plan.name, row, item);
                  const mobile = devicesIndex >= 0 && cells[devicesIndex]?.value === 'mobile';
                  const content = <><Face row={row.id} item={item} gold={isGold(row, item)} mobile={mobile} />{item.lock && <Lock className={css.cellLock} />}</>;
                  return (
                    <td key={plan.id} style={tint(plan.colorId ? COLOUR_HEX[plan.colorId] : undefined)}
                      className={cx(css.cell, active && css.active, off && css.off, item.lock && css.cellLocked, item.changed && css.changed)}>
                      {readOnly ? <span aria-label={words}>{content}</span> : (
                        <button type="button" onClick={() => setCell(active ? null : { planId: plan.id, row: row.id })} aria-label={`${words}. Change`}>
                          {content}
                        </button>
                      )}
                    </td>
                  );
                })}
                {store && specialCell(store, row)}
                {!readOnly && plansOn && <td className={css.addCell} aria-hidden="true" />}
              </tr>
              );
            })}
            {footer && (
              <tr className={css.footRow}>
                <th scope="row" className={css.rowHead}>{footer.label}</th>
                {[...(free ? [FREE] : []), ...plans.map(plan => plan.id), ...(store ? [STORE] : [])].map(id => {
                  const stat = footer.cells[id];
                  return (
                    <td key={id} className={css.stat}>
                      {stat ? <><b>{stat.value}</b>{stat.detail && <i>{stat.detail}</i>}</> : <i>{footer.empty ?? '—'}</i>}
                    </td>
                  );
                })}
                {!readOnly && plansOn && <td className={css.addCell} aria-hidden="true" />}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* the picker over the whole screen: a host that moves or scales its page (the launch wizard's step) would
          otherwise hold the fixed sheet inside it, below the screen; it keeps the host's accent */}
      {cell && (openPlan || openSpecial) && !readOnly && createPortal(
        <div className={css.builder} style={{ ['--pb-accent' as string]: root.current ? getComputedStyle(root.current).getPropertyValue('--pa').trim() || undefined : undefined }}>
          <button type="button" className={css.backdrop} aria-label="Close" onClick={() => setCell(null)} />
          <div className={css.sheet} role="dialog" aria-label={`${sheetName}: ${rowLabel(cell.row)}`}>
            <div className={css.sheetHead}>
              <span className={css.eyebrow}>{sheetName.toUpperCase()}</span>
              <b>{rowLabel(cell.row)}</b>
              <button type="button" className={css.close} onClick={() => setCell(null)}>Done</button>
            </div>

            {cell.row === 'price' && openPlan && (
              <>
                <PriceEditor value={openPlan.monthly}
                  onCommit={value => change(setStreamingPlanPrice(pricing, openPlan.id, value))}
                  onPreview={onPricePreview ? value => onPricePreview(value === null ? null : setStreamingPlanPrice(pricing, openPlan.id, value)) : undefined} />
                {priceDetail && <div className={css.priceDetail}>{priceDetail(openPlan)}</div>}
              </>
            )}
            {cell.row === 'price' && cell.planId === STORE && openSpecial && (
              <StorePrices pricing={pricing} tree={builder.tree} onChange={change} />
            )}

            {openRow && (
              <ul className={css.options}>
                {sheetOptions.map(option => {
                  const on = currentValue === option.value;
                  const lock = on ? null : lockOf(option.value);
                  const shaking = lockNote?.value === option.value;
                  return (
                    <li key={option.value}>
                      <button type="button" key={shaking ? lockNote!.key : 'still'}
                        className={cx(css.option, on && css.chosen, lock && css.locked, shaking && css.shake)}
                        aria-pressed={on} aria-disabled={lock ? true : undefined} onClick={() => pick(option.value)}>
                        <span><b>{option.label}</b>{lock ? <small>{lock.needs}</small> : option.line ? <small>{option.line}</small> : null}</span>
                        {lock ? <Lock /> : on ? <i className={css.tick} aria-hidden="true">✓</i> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {openSpecial && openRow && (
              <p className={css.sheetNote}>
                {cell.planId === FREE && openRow.id === 'ads'
                  ? `${currentValue === 'custom' ? `Now ${pricing.ads.minutesPerHour} ad minutes an hour, kept until you pick a break. ` : ''}Ad plans run this cadence too, scaled by their ad level. More breaks earn more an hour but push viewers away.`
                  : specialSet ? openSpecial.setNote : openSpecial.unsetNote}
              </p>
            )}

            {lockNote && (
              <div className={css.note} role="status">
                <span>{lockNote.lock.combination ? `${lockNote.lock.needs}.` : `${lockNote.lock.needs} to offer it.`}</span>
                {lockNote.lock.techId && onGoToTech && (
                  <button type="button" onClick={() => { const techId = lockNote.lock.techId!; setCell(null); onGoToTech(techId); }}>Unlock in Tech ›</button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default PlanBuilder;
