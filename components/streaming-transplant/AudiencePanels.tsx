/* ============================================================================
   AUDIENCE PANELS — the small visual pieces around the living map.

     RegionRail      the continents as one segmented strip, each with its number
     TopCountryRail  the countries that matter most, as flag cards
     MarketFunnel    every home that can stream, narrowing to the homes that chose you
     WinnersBoard    who wins the homes and who wins the watch time, as two aligned bars
     MarketPulse     how many watch now, with the year's curve
     AccessBoard     the load your network carries: payers, outside homes, piracy
     RegionTiles     every continent as its own small map
     CountryRows     flag · name · number, the list under a map

   Presentation only: every figure arrives from audienceAtlasModel.
   ========================================================================== */

import React from 'react';
import css from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import { cx } from './presentation/cx';
import { CountryFlagSvg } from '../studio-finance/components/FlagField';
import { WORLD_GRATICULE_PATH } from '../../views/lifestyle/business/components/worldMapDetailedGeometry';
import { countryPathOf, regionShapeOf } from './AudienceAtlas';
import {
  AUDIENCE_WORDS,
  MARKET_STATE_LABELS,
  REGION_SHORT_LABELS,
  compact,
  formatShare,
  signedCompact,
  type AtlasCountry,
  type AtlasRegionId,
  type AtlasRegionSummary,
  type AtlasShare,
  type AudienceKind,
} from './audienceAtlasModel';

/* ── the continents, as one segmented strip ─────────────────────────────── */
/* Seven cells that always fit the width: no sideways scroll, nothing cut by
   the edge of the screen. The labels are the short forms; the full names are
   in each cell's accessible label. */
const STRIP_LABELS: Record<AtlasRegionId, string> = {
  NORTH_AMERICA: 'N.AMER',
  SOUTH_AMERICA: 'S.AMER',
  EUROPE: 'EUROPE',
  AFRICA: 'AFRICA',
  ASIA: 'ASIA',
  OCEANIA: 'OCEANIA',
};

export const RegionRail: React.FC<{
  regions: AtlasRegionSummary[];
  focus: AtlasRegionId | null;
  valueOf: (region: AtlasRegionSummary) => number;
  format?: (value: number) => string;
  worldValue: number;
  onFocus: (regionId: AtlasRegionId | null) => void;
}> = ({ regions, focus, valueOf, format = compact, worldValue, onFocus }) => (
  <div className={css.regionStrip} role="tablist" aria-label="Regions">
    <button type="button" role="tab" aria-selected={!focus} aria-label={`World ${format(worldValue)}`} className={!focus ? css.on : ''} onClick={() => onFocus(null)}>
      <small>WORLD</small><b>{format(worldValue)}</b>
    </button>
    {regions.map(region => {
      const value = valueOf(region);
      return (
        <button key={region.id} type="button" role="tab" aria-selected={focus === region.id}
          aria-label={`${REGION_SHORT_LABELS[region.id]} ${value > 0 ? format(value) : 'none'}`}
          className={focus === region.id ? css.on : ''} onClick={() => onFocus(region.id)}>
          <small>{STRIP_LABELS[region.id]}</small>
          <b className={value > 0 ? '' : css.muted}>{value > 0 ? format(value) : '—'}</b>
        </button>
      );
    })}
  </div>
);

/* ── the countries that matter most, as flag cards ──────────────────────── */
export interface TopCountryCard {
  country: AtlasCountry;
  value: string;
  caption: string;
  /** 0–1, drawn as the card's bar. */
  meter: number;
  tone: string;
  change?: number;
}

export const TopCountryRail = React.memo(function TopCountryRail({ cards, onOpen }: { cards: TopCountryCard[]; onOpen: (countryId: string) => void }) { return (
  cards.length ? (
    <div className={css.countryRail}>
      {cards.map(card => (
        <button key={card.country.id} type="button" className={css.countryChip} style={{ ['--chip-tone' as string]: card.tone }} onClick={() => onOpen(card.country.id)}>
          <span className={css.chipFlag}><CountryFlagSvg code={card.country.id} fit="stretch" /></span>
          {typeof card.change === 'number' && card.change !== 0 && (
            <em className={card.change < 0 ? css.down : ''}>{signedCompact(card.change)}</em>
          )}
          <strong>{card.value}</strong>
          <span>{card.country.name}</span>
          <small>{card.caption}</small>
          <i><b style={{ width: `${Math.max(4, Math.min(100, card.meter * 100))}%` }} /></i>
        </button>
      ))}
    </div>
  ) : null
); });

/* ── from every home that can stream, down to the homes that chose you ──── */
/* One picture instead of a grid of totals: each bar is measured against the
   first, so the narrowing is the story. The facts underneath are the numbers
   that explain the narrowing (how many services a home keeps, how much it
   watches, what it can spend). */
export interface FunnelRow {
  label: string;
  value: number;
  /** Words after the figure, e.g. "homes". */
  unit: string;
  you?: boolean;
  /** Shown instead of a bar when the row has no figure yet (e.g. before launch). */
  pending?: string;
}

export const MarketFunnel: React.FC<{
  accent: string;
  rows: FunnelRow[];
  /** Where every home stands: streaming only, both, cinema only, neither. */
  reach?: { streamingOnly: number; dual: number; cinemaOnly: number; neither: number; streamingReach: number; cinemaReach: number };
  facts: Array<{ value: string; label: string }>;
  overlap?: { one: number; two: number; three: number };
  /** Short honest framings shown under the picture, one line each. */
  notes?: string[];
}> = ({ accent, rows, reach, facts, overlap, notes = [] }) => {
  const top = Math.max(1, rows[0]?.value ?? 1);
  return (
    <div className={css.funnel} style={{ ['--funnel-accent' as string]: accent }}>
      {rows.map(row => {
        const share = row.value / top * 100;
        return (
          <div key={row.label} className={cx(css.funnelRow, row.you && css.funnelYou)}>
            <div className={css.funnelHead}>
              <span>{row.label}</span>
              {row.pending
                ? <em>{row.pending}</em>
                : <b>{compact(row.value)}<small> {row.unit}{rows[0] !== row ? ` · ${formatShare(share)}` : ''}</small></b>}
            </div>
            <div className={css.funnelBar} aria-hidden="true">
              {!row.pending && <i style={{ width: `${Math.min(100, share)}%` }} />}
            </div>
          </div>
        );
      })}
      {reach && (() => {
        const total = Math.max(1, reach.streamingOnly + reach.dual + reach.cinemaOnly + reach.neither);
        const part = (value: number) => `${value / total * 100}%`;
        return (
          <div className={css.funnelReach}>
            <div className={css.reachBar} role="img" aria-label="Homes that can reach streaming only, both, cinema only and neither">
              <i style={{ width: part(reach.streamingOnly), background: '#38bdf8' }} />
              <i style={{ width: part(reach.dual), background: '#a78bfa' }} />
              <i style={{ width: part(reach.cinemaOnly), background: '#f5b544' }} />
              <i style={{ width: part(reach.neither), background: 'rgba(255,255,255,.1)' }} />
            </div>
            <div className={css.reachKeys}>
              <span><i style={{ background: '#38bdf8' }} />STREAMING REACH<b>{compact(reach.streamingReach)}</b></span>
              <span><i style={{ background: '#a78bfa' }} />BOTH<b>{compact(reach.dual)}</b></span>
              <span><i style={{ background: '#f5b544' }} />CINEMA REACH<b>{compact(reach.cinemaReach)}</b></span>
              <span><i style={{ background: 'rgba(255,255,255,.3)' }} />NEITHER<b>{compact(reach.neither)}</b></span>
            </div>
          </div>
        );
      })()}
      {facts.length > 0 && (
        <div className={css.funnelFacts}>
          {facts.map(fact => <div key={fact.label}><b>{fact.value}</b><span>{fact.label}</span></div>)}
        </div>
      )}
      {overlap && (
        <div className={css.funnelOverlap}>
          <span>SERVICES PER PAYING HOME</span>
          <div className={css.overlapBar} role="img" aria-label={`${overlap.one.toFixed(0)}% keep one service, ${overlap.two.toFixed(0)}% two, ${overlap.three.toFixed(0)}% three or more`}>
            <i style={{ width: `${overlap.one}%` }}><b>1</b></i>
            <i style={{ width: `${overlap.two}%` }}><b>2</b></i>
            <i style={{ width: `${overlap.three}%` }}><b>3+</b></i>
          </div>
          <div className={css.overlapKeys}>
            <small>{overlap.one.toFixed(0)}% one</small><small>{overlap.two.toFixed(0)}% two</small><small>{overlap.three.toFixed(0)}% three or more</small>
          </div>
        </div>
      )}
      {notes.filter(Boolean).map(line => <p key={line} className={css.funnelNote}>{line}</p>)}
    </div>
  );
};

/* ── who wins: the homes and the watch time, one above the other ────────── */
/* Two different races. Homes are who gets paid every month; watch time is who
   gets watched. The same colours sit in both bars, so a service that wins one
   and not the other shows at a glance. */
const nameKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export const WinnersBoard: React.FC<{
  accent: string;
  homes: { shares: AtlasShare[]; unclaimedShare: number };
  /** Your figure in the corner: paying homes, homes watching free or buyers. */
  homesWon: number;
  homesWonLabel?: string;
  homesWonCaption: string;
  unclaimedHomes: number;
  /** Caption under the unclaimed figure, e.g. "60% of homes that can stream chose nobody". */
  unclaimedCaption: string;
  /** The competition model's homes for you at today's offer (paid accounts move toward it). */
  demandHomes?: number;
  /** Which of your plans those homes pick, and what they pay on average after
      annual and introductory discounts (the competition model's plan mix). */
  planMix?: { plans: Array<{ id: string; name: string; households: number }>; effectivePrice: number };
  watch: Array<{ id: string; name: string; color: string; sharePercent: number }>;
}> = ({ accent, homes, homesWon, homesWonLabel = 'HOMES WON', homesWonCaption, unclaimedHomes, unclaimedCaption, demandHomes, planMix, watch }) => {
  /* The watch-time model names the big global services and folds every local
     and regional one into a single "Local & regional" share. The homes are
     folded the same way, so both bars compare like with like. A service is
     matched by id, or by name when the two lists spell it differently. */
  type Row = { key: string; name: string; color: string; homes: number | null; watch: number | null; you: boolean };
  const keyOf = (id: string, name: string) => (id === 'PLAYER' ? 'PLAYER' : id === 'REGIONAL' ? 'REGIONAL' : nameKey(name) || id);
  const regional = watch.find(item => item.id === 'REGIONAL');
  const named = new Set(watch.filter(item => item.id !== 'REGIONAL').map(item => keyOf(item.id, item.name)));
  const rows = new Map<string, Row>();
  const add = (key: string, name: string, color: string, side: 'homes' | 'watch', value: number) => {
    const current = rows.get(key) || { key, name, color, homes: null, watch: null, you: key === 'PLAYER' };
    current[side] = (current[side] ?? 0) + value;
    rows.set(key, current);
  };
  homes.shares.forEach(item => {
    const own = keyOf(item.id, item.name);
    if (own === 'PLAYER') add('PLAYER', 'You', accent, 'homes', item.share);
    else if (named.has(own) || !regional) add(own, item.name, item.color, 'homes', item.share);
    else add('REGIONAL', regional.name, regional.color, 'homes', item.share);
  });
  watch.forEach(item => {
    const key = keyOf(item.id, item.name);
    add(key, key === 'PLAYER' ? 'You' : item.name, key === 'PLAYER' ? accent : item.color, 'watch', item.sharePercent);
  });
  const ranked = Array.from(rows.values())
    .sort((left, right) => Number(right.you) - Number(left.you) || Math.max(right.homes ?? 0, right.watch ?? 0) - Math.max(left.homes ?? 0, left.watch ?? 0));
  const keys = ranked.slice(0, 8);
  const bySize = (side: 'homes' | 'watch') => ranked
    .filter(row => (row[side] ?? 0) > 0)
    .sort((left, right) => Number(right.you) - Number(left.you) || (right[side] ?? 0) - (left[side] ?? 0))
    .map(row => ({ key: row.key, width: row[side] ?? 0, color: row.color, you: row.you }));
  const homeSlices = bySize('homes');
  const watchSlices = bySize('watch').filter(slice => slice.width >= .25);
  const pct = (value: number | null) => (value === null ? '—' : value > 0 && value < 1 ? formatShare(value) : `${value.toFixed(0)}%`);
  return (
    <div className={css.winners} style={{ ['--winners-accent' as string]: accent }}>
      <div className={css.homesTop}>
        <div className={css.homesYou}><span>{homesWonLabel}</span><b>{compact(homesWon)}</b><small>{homesWonCaption}</small></div>
        <div><span>UNCLAIMED HOMES</span><b>{compact(unclaimedHomes)}</b><small>{unclaimedCaption}</small></div>
      </div>
      <div className={css.winBars}>
        <span>HOMES</span>
        <div className={css.winBar} role="img" aria-label="Share of paying homes by service">
          {homeSlices.map(slice => <i key={slice.key} className={slice.you ? css.you : ''} style={{ width: `${slice.width}%`, background: slice.color }} />)}
          <i className={css.open} style={{ width: `${homes.unclaimedShare}%` }} />
        </div>
        <span>WATCH TIME</span>
        <div className={css.winBar} role="img" aria-label="Share of viewing time by service">
          {watchSlices.map(slice => <i key={slice.key} className={slice.you ? css.you : ''} style={{ width: `${slice.width}%`, background: slice.color }} />)}
        </div>
      </div>
      <div className={css.winKeys}>
        <div className={css.winKeysHead}><span /><small>HOMES</small><small>WATCH</small></div>
        {keys.map(row => (
          <div key={row.key} className={row.you ? css.youKey : ''}>
            <span><i style={{ background: row.color }} />{row.name}</span>
            <b>{pct(row.homes)}</b>
            <b>{pct(row.watch)}</b>
          </div>
        ))}
        <div className={css.openKey}><span><i />Nobody yet</span><b>{`${homes.unclaimedShare.toFixed(0)}%`}</b><b>—</b></div>
      </div>
      {typeof demandHomes === 'number' && demandHomes > 0 && (
        <div className={css.winDemand}><span>HOMES WON</span><b>{compact(demandHomes)}</b><small>at today's offer · they become paying homes over the coming weeks</small></div>
      )}
      {planMix && planMix.plans.length > 0 && (() => {
        const won = planMix.plans.reduce((sum, plan) => sum + plan.households, 0);
        const total = won || 1;
        return (
          <div className={css.planMix}>
            <div className={css.planMixHead}>
              <span>WHICH PLAN THEY PICK</span>
              <div><small>EFFECTIVE PRICE</small><b>{won > 0 ? `$${planMix.effectivePrice.toFixed(2)}` : '—'}</b><small>a month</small></div>
            </div>
            {won > 0 ? (
              <div className={css.planMixBar} role="img" aria-label="Homes won by plan">
                {planMix.plans.map((plan, index) => plan.households > 0 && (
                  <i key={plan.id} style={{ flexGrow: plan.households, ['--tint' as string]: `${[100, 66, 42, 28, 18, 12][index] ?? 12}%` }} />
                ))}
              </div>
            ) : <small className={css.planMixNone}>No homes won yet at today's offer.</small>}
            <div className={css.planMixKeys}>
              {planMix.plans.map((plan, index) => (
                <span key={plan.id}><i style={{ ['--tint' as string]: `${[100, 66, 42, 28, 18, 12][index] ?? 12}%` }} />{plan.name}<b>{Math.round(plan.households / total * 100)}%</b></span>
              ))}
            </div>
          </div>
        );
      })()}
      <p className={css.winNote}>Every active service competes for the same finite country households. Price, plan fit, catalogue, localization and trust decide who wins; homes may still choose nobody.</p>
    </div>
  );
};

/* ── the market's pulse: how many watch now, and the year it took ──────── */
export const MarketPulse: React.FC<{ accent: string; data: number[]; now: number; caption: string }> = ({ accent, data, now, caption }) => {
  const w = 320, h = 58, pad = 3;
  const safe = data.length > 1 ? data : [now, now];
  const min = Math.min(...safe), max = Math.max(...safe), span = max - min || 1;
  const points = safe.map((value, index) => {
    const x = pad + (index / Math.max(1, safe.length - 1)) * (w - pad * 2);
    const y = h - pad - ((value - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const first = safe[0] || 0;
  const change = first > 0 ? (safe[safe.length - 1] - first) / first * 100 : 0;
  const last = points[points.length - 1];
  return (
    <div className={css.pulse} style={{ ['--pulse-accent' as string]: accent }}>
      <div className={css.pulseHead}>
        <div><b>{compact(now)}</b><span>{caption}</span></div>
        <em className={change < 0 ? css.down : ''}>{change >= 0 ? '+' : '−'}{Math.abs(change).toFixed(change !== 0 && Math.abs(change) < 10 ? 1 : 0)}%<small>in 52 weeks</small></em>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Streaming viewers over the last 52 weeks, ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(0)} percent`}>
        <polygon points={`${pad},${h} ${line} ${w - pad},${h}`} />
        <polyline points={line} />
        <circle cx={last[0]} cy={last[1]} r="3.2" />
      </svg>
    </div>
  );
};

/* ── who watches your service: payers, outside homes, pirates ──────────── */
/* The network serves every paid account plus the outside homes watching on
   them (each counts as 0.72 of an account of load). The bar is that load, so
   the slice that pays nothing is plain to see. Piracy sits beside it: people
   watching your titles outside your service. */
export const AccessBoard: React.FC<{
  accent: string;
  paidAccounts: number;
  sharedHomes: number;
  sharedViewers: number;
  piracyReach: number;
  accessLoadAccounts: number;
  monthlySubscriptionRevenue: number;
}> = ({ accent, paidAccounts, sharedHomes, sharedViewers, piracyReach, accessLoadAccounts, monthlySubscriptionRevenue }) => {
  const load = Math.max(1, accessLoadAccounts);
  const paidShare = Math.min(100, paidAccounts / load * 100);
  return (
    <div className={css.access} style={{ ['--access-accent' as string]: accent }}>
      <div className={css.accessHead}>
        <span>YOUR NETWORK SERVES</span>
        <b>{compact(accessLoadAccounts)}<small> accounts</small></b>
      </div>
      <div className={css.accessBar} role="img" aria-label={`${paidShare.toFixed(0)} percent paying, ${(100 - paidShare).toFixed(0)} percent outside homes on shared accounts`}>
        <i style={{ width: `${paidShare}%` }} />
        <i className={css.accessShared} style={{ width: `${100 - paidShare}%` }} />
      </div>
      <div className={css.accessKeys}>
        <div><i style={{ background: accent }} /><span>PAID ACCOUNTS</span><b>{compact(paidAccounts)}</b><small>${compact(monthlySubscriptionRevenue)}/mo</small></div>
        <div><i className={css.accessSharedKey} /><span>SHARED ACCESS</span><b>{compact(sharedHomes)}</b><small>homes · {compact(sharedViewers)} people</small></div>
        <div><i className={css.accessPiracyKey} /><span>PIRACY REACH</span><b>{compact(piracyReach)}</b><small>people</small></div>
      </div>
      <p className={css.accessNote}>Outside homes watch on your subscribers' accounts: they use your network and pay nothing. Pirates watch your titles outside the service.</p>
    </div>
  );
};

/* ── every continent as its own small map ───────────────────────────────── */
export const RegionTiles: React.FC<{
  regions: AtlasRegionSummary[];
  countries: AtlasCountry[];
  live: boolean;
  focus: AtlasRegionId | null;
  /** What "your audience" means for this service. */
  audienceKind?: AudienceKind;
  onOpen: (regionId: AtlasRegionId) => void;
}> = ({ regions, countries, live, focus, audienceKind = 'ACCOUNTS', onOpen }) => (
  <div className={css.regionGrid}>
    {regions.map(region => {
      const shape = regionShapeOf(region.id);
      const mine = countries.filter(country => country.regionId === region.id && country.state !== 'AVAILABLE');
      const value = live ? region.playerAudience : region.activeViewers;
      return (
        <button key={region.id} type="button" className={cx(css.regionTile, focus === region.id && css.on)}
          style={{ ['--tile' as string]: shape?.accent || '#93c5fd' }} onClick={() => onOpen(region.id)}
          aria-label={`${region.label}: ${region.live} live of ${region.countries} countries`}>
          {shape && (
            <svg className={css.tileMap} viewBox={shape.viewBox} preserveAspectRatio="xMaxYMid meet" aria-hidden="true">
              {/* the atlas grid behind the continent: texture that is also a map */}
              <path d={WORLD_GRATICULE_PATH} className={css.tileGrid} vectorEffect="non-scaling-stroke" />
              <path d={shape.path} className={css.tileLand} vectorEffect="non-scaling-stroke" />
              {mine.map(country => {
                const path = countryPathOf(country.id);
                return path ? <path key={country.id} d={path} className={country.state === 'LIVE' ? css.tileLive : css.tileOpening} vectorEffect="non-scaling-stroke" /> : null;
              })}
            </svg>
          )}
          <small><i aria-hidden="true" />{REGION_SHORT_LABELS[region.id]}</small>
          {/* A region you hold no one in still shows who is down there, in grey. */}
          <strong className={value > 0 ? '' : css.muted}>{compact(value > 0 ? value : region.activeViewers)}</strong>
          <em>{live ? (value > 0 ? AUDIENCE_WORDS[audienceKind].region : 'watching · none yours yet') : 'people watching'}</em>
          <div className={css.strip} aria-hidden="true">
            {region.segments.map((state, index) => <i key={index} className={css[`s_${state}`]} />)}
          </div>
          <div className={css.tileFoot}><span><b>{region.live}</b> live{region.opening ? ` · ${region.opening} on the way` : ''}</span><span>{region.countries} countries</span></div>
        </button>
      );
    })}
  </div>
);

/* ── flag · name · number ───────────────────────────────────────────────── */
export interface CountryRowItem {
  country: AtlasCountry;
  value: string;
  caption: string;
  meter?: number;
}

export const CountryRows = React.memo(function CountryRows({ rows, onOpen }: { rows: CountryRowItem[]; onOpen: (countryId: string) => void }) { return (
  <div className={css.countryList}>
    {rows.map(row => (
      <button key={row.country.id} type="button" className={css.countryRow} onClick={() => onOpen(row.country.id)}>
        <span className={css.rowFlag}><CountryFlagSvg code={row.country.id} fit="stretch" /></span>
        <span className={css.rowName}>
          <b>{row.country.name}</b>
          <small>{row.caption}</small>
        </span>
        <span className={css.rowValue}>
          <b>{row.value}</b>
          <small className={css[`st_${row.country.state}`]}>{row.country.state === 'OPENING' && row.country.progress !== null ? `${row.country.progress}%` : MARKET_STATE_LABELS[row.country.state]}</small>
        </span>
        {typeof row.meter === 'number' && <span className={css.rowMeter}><i style={{ width: `${Math.max(2, Math.min(100, row.meter * 100))}%` }} /></span>}
      </button>
    ))}
  </div>
); });
