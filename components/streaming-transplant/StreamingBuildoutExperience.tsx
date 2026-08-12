/**
 * EMPIRE+ v2 — THE BUILD
 *
 * Pre-launch the platform is not a company yet, so this is not a dashboard and
 * it is not a settings page. It is a cheque being spent on things that do not
 * exist. Three ideas carry the whole screen:
 *
 *   THE HALLS      infrastructure is a place, not a tier. Racks stand in named
 *                  cities. The page scrolls DOWN through your cities and each
 *                  hall scrolls ACROSS through its racks, so buying more never
 *                  shrinks anything — the room simply gets longer.
 *   ONE BUDGET     servers, catalogue, originals and the campaign all eat the
 *                  same pot. The decision is never "which tier is best", it is
 *                  "what am I willing to be bad at".
 *   THE REHEARSAL  a simulated premiere night, run before the real one — and it
 *                  breaks city by city, so you find out which of your own
 *                  territories you let down.
 *
 * The cruel links: marketing raises demand, and demand is what breaks servers;
 * and every rack you place in a cheap city is a rack far away from someone.
 */
import css from './presentation/screens/Buildout/Buildout.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StreamingNetworkNodeRole } from '../../types';
import {
  Brand, Mark, City, CITIES, RegionId, REGIONS, brandColor, brandDeep,
  cityById, latencyTo,
} from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */

export type PkgId = 'STARTER' | 'ESSENTIAL' | 'GROWTH' | 'PREMIERE';
export type ArchId = 'CLOUD' | 'HYBRID' | 'OWNED';
export type DoctrineId = 'SAFE' | 'STANDARD' | 'RUSHED';
export type CampId = 'NONE' | 'REGIONAL' | 'NATIONAL';
export type Scenario = 'QUIET' | 'LIKELY' | 'SURGE';

/** A city campus. Buildings and halls expand automatically as rack count grows. */
export interface Placement { cityId: string; racks: number; role: StreamingNetworkNodeRole }

export interface BuildSel {
  placements: Placement[];
  arch: ArchId;
  doctrine: DoctrineId;
  campaign: CampId;
}

export interface BuildInputs {
  treasury: number;
  catalogueSpend: number;
  catalogueTitles: number;
  originalsSpend: number;
  originalsCount: number;
  premiereTitle: string;
  /** the territories the player took in the wizard */
  regions: RegionId[];
  /** where the app can be opened, even before those places become paid launch markets */
  coverageRegions?: RegionId[];
  /** the city the player put their headquarters in — every build starts here */
  homeCityId: string | null;
  /** how much bigger the crowd is because of the plans on sale (see pricing.tsx) */
  audienceMul: number;
  /** weekly repayment on anything borrowed (see raise.tsx) */
  debtWeekly?: number;
}

export interface BuildCommitResult {
  ok: boolean;
  message: string;
  next?: 'BACK' | 'LAUNCH';
}

/* one rack is the unit of everything — capacity, money, time */
export const PER_RACK_CEILING = 65_000;
const PER_RACK_CAPEX = 3_750_000;
const PER_RACK_WEEKLY = 90_000;
/** A campus can keep growing. The limit only protects the mobile renderer/save. */
const MAX_RACKS_PER_CAMPUS = 96;
/** viewers per person of reachable population on a premiere night */
const DEMAND_RATE = 0.00018;

const ROLE_RULES: Record<StreamingNetworkNodeRole, {
  name: string; short: string; line: string;
  capex: number; weekly: number; ceiling: number; cache: number; latency: number;
}> = {
  CORE_ORIGIN: {
    name: 'Core origin', short: 'ORIGIN', line: 'Full catalogue, encoding and company control.',
    capex: 1, weekly: 1, ceiling: 1, cache: 100, latency: 12,
  },
  REGIONAL_HUB: {
    name: 'Regional hub', short: 'HUB', line: 'Replicates most titles and carries a whole region.',
    capex: .78, weekly: .84, ceiling: .95, cache: 76, latency: 4,
  },
  EDGE_CACHE: {
    name: 'Edge cache', short: 'EDGE', line: 'Keeps popular titles close to viewers.',
    capex: .48, weekly: .62, ceiling: .82, cache: 42, latency: 0,
  },
};

const campusOf = (racks: number) => racks <= 6
  ? { label: 'Rented cage', halls: 1 }
  : racks <= 20
    ? { label: 'Private server hall', halls: Math.ceil(racks / 12) }
    : racks <= 48
      ? { label: 'Data-centre campus', halls: Math.ceil(racks / 18) }
      : { label: 'Hyperscale campus', halls: Math.ceil(racks / 24) };

/* ── presets: a starting point, not a cage ─────────────────── */
interface Pkg { id: PkgId; name: string; sub: string; racks: number; cities: number }
export const PACKAGES: Pkg[] = [
  { id: 'STARTER', name: 'Starter Rack', sub: 'One room, one city', racks: 2, cities: 1 },
  { id: 'ESSENTIAL', name: 'Essential Grid', sub: 'Two cities, one spare', racks: 4, cities: 2 },
  { id: 'GROWTH', name: 'Growth Network', sub: 'Three cities, real spare', racks: 7, cities: 3 },
  { id: 'PREMIERE', name: 'Premiere Network', sub: 'Built for opening night', racks: 10, cities: 4 },
];

/* ── rent it, own it, or both ──────────────────────────────── */
interface Arch {
  id: ArchId; name: string; line: string;
  capexMul: number; weeklyMul: number; weeksMul: number;
  capacityMul: number; burst: number; latencyAdd: number; onPremFrac: number;
}
export const ARCHS: Arch[] = [
  {
    id: 'CLOUD', name: 'Cloud-first', line: 'Rent everything. Cheap to start, expensive forever.',
    capexMul: .55, weeklyMul: 1.50, weeksMul: .65, capacityMul: 1, burst: .45, latencyAdd: 18, onPremFrac: .18,
  },
  {
    id: 'HYBRID', name: 'Hybrid', line: 'Own the core, rent the edge. No answer is wrong.',
    capexMul: 1, weeklyMul: 1, weeksMul: 1, capacityMul: 1, burst: .20, latencyAdd: 8, onPremFrac: .5,
  },
  {
    id: 'OWNED', name: 'Owned metal', line: 'Buy the machines. Brutal upfront, cheap for years.',
    capexMul: 1.45, weeklyMul: .65, weeksMul: 1.35, capacityMul: 1.1, burst: 0, latencyAdd: 0, onPremFrac: 1,
  },
];

/* ── how carefully it gets built ───────────────────────────── */
interface Doctrine {
  id: DoctrineId; name: string; line: string;
  weeksMul: number; costMul: number; debt: number; ceilingMul: number; wobble: number;
}
export const DOCTRINES: Doctrine[] = [
  { id: 'SAFE', name: 'Hardened', line: 'Tested twice. Nothing falls over.', weeksMul: 1.25, costMul: 1.10, debt: 0, ceilingMul: 1.00, wobble: .00 },
  { id: 'STANDARD', name: 'Standard', line: 'Normal engineering. Normal risk.', weeksMul: 1.00, costMul: 1.00, debt: 4, ceilingMul: 1.00, wobble: .04 },
  { id: 'RUSHED', name: 'Sprint', line: 'Corners cut. You will pay this back.', weeksMul: .55, costMul: 1.15, debt: 14, ceilingMul: 1.00, wobble: .12 },
];

/* ── the campaign, which is also the trap ──────────────────── */
interface Camp { id: CampId; name: string; line: string; cost: number; demandMul: number }
export const CAMPAIGNS: Camp[] = [
  { id: 'NONE', name: 'No campaign', line: 'Word of mouth. Whoever finds you, finds you.', cost: 0, demandMul: 1.00 },
  { id: 'REGIONAL', name: 'Regional push', line: 'Outdoor, radio, one chat show.', cost: 1_800_000, demandMul: 1.55 },
  { id: 'NATIONAL', name: 'National campaign', line: 'Everyone in the country knows the date.', cost: 4_600_000, demandMul: 2.45 },
];

export const SCENARIOS: { id: Scenario; name: string; sub: string; mul: number }[] = [
  { id: 'QUIET', name: 'Quiet night', sub: 'Fewer turn up than you hoped', mul: .55 },
  { id: 'LIKELY', name: 'Likely', sub: 'What your team actually expects', mul: 1.0 },
  { id: 'SURGE', name: 'Surge', sub: 'It catches. Everyone at once', mul: 1.9 },
];

const archOf = (id: ArchId) => ARCHS.find(a => a.id === id)!;
const docOf = (id: DoctrineId) => DOCTRINES.find(d => d.id === id)!;
const campOf = (id: CampId) => CAMPAIGNS.find(c => c.id === id)!;
const regionOf = (id: RegionId) => REGIONS.find(r => r.id === id)!;

/** rent, power and people are not the same price everywhere */
export const costIndex = (c: City) => c.cost / 10_000_000;

/** the territories actually being served — never an empty list */
export const territoriesOf = (regions: RegionId[]): RegionId[] =>
  regions.length ? regions : ['NORTH_AMERICA'];

/** The obvious cities, best-connected first, taken one territory at a time so a
 *  two-territory player gets one in each before a second in either. Falls back
 *  to further cities inside the same territory when there is only one. */
export const suggestedCities = (regions: RegionId[], want = 1, homeCityId?: string | null): City[] => {
  const pools = [...territoriesOf(regions)]
    .sort((a, b) => regionOf(b).viewers - regionOf(a).viewers)
    .map(r => CITIES.filter(c => c.region === r)
      .sort((a, b) => (b.hub ? 1 : 0) - (a.hub ? 1 : 0) || a.cost - b.cost));

  const out: City[] = [];
  /* the headquarters city was chosen in the wizard and the platform is already
     staffed there — the first hall always goes where the company already is */
  const home = cityById(homeCityId ?? null);
  if (home) {
    out.push(home);
    for (const pool of pools) {
      const i = pool.findIndex(x => x.id === home.id);
      if (i >= 0) pool.splice(i, 1);
    }
  }
  for (let round = 0; out.length < want && round < 6; round++) {
    let added = false;
    for (const pool of pools) {
      if (out.length >= want) break;
      if (pool[round]) { out.push(pool[round]); added = true; }
    }
    if (!added) break;
  }
  return out;
};

/** spread a preset's racks across the obvious cities, biggest territory first.
 *  Racks that would overflow a city's floor spill into the next one rather than
 *  quietly vanishing — the chip promises a rack count and must deliver it. */
export const presetPlacements = (id: PkgId, regions: RegionId[], homeCityId?: string | null): Placement[] => {
  const p = PACKAGES.find(x => x.id === id)!;
  const need = Math.ceil(p.racks / MAX_RACKS_PER_CAMPUS);
  const cities = suggestedCities(regions, Math.max(p.cities, need), homeCityId);
  if (!cities.length) return [];
  const out: Placement[] = cities.map((c, index) => ({
    cityId: c.id,
    racks: 0,
    role: index === 0 ? 'CORE_ORIGIN' : index === 1 ? 'REGIONAL_HUB' : 'EDGE_CACHE',
  }));
  let left = p.racks;
  while (left > 0) {
    const open = out.filter(x => x.racks < MAX_RACKS_PER_CAMPUS);
    if (!open.length) break;
    for (const slot of open) { if (left <= 0) break; slot.racks++; left--; }
  }
  return out.filter(x => x.racks > 0);
};

/** which preset, if any, the current placements still match */
export const matchedPreset = (sel: BuildSel, regions: RegionId[], homeCityId?: string | null): PkgId | null => {
  const key = (ps: Placement[]) =>
    [...ps].filter(p => p.racks > 0).map(p => `${p.cityId}:${p.racks}:${p.role}`).sort().join('|');
  const mine = key(sel.placements);
  return PACKAGES.find(p => key(presetPlacements(p.id, regions, homeCityId)) === mine)?.id ?? null;
};

/* ============================================================
   DERIVED — every number on the screen comes out of here, so a
   display can never disagree with the thing it is displaying.
   ============================================================ */
export interface HallView {
  city: City; racks: number; onPrem: number; remote: number;
  role: StreamingNetworkNodeRole;
  campusLabel: string; facilityCount: number; cacheHit: number;
  ceiling: number; burstCeiling: number;
  capex: number; weekly: number;
  /** territories this hall is the nearest placed city for */
  serves: RegionId[];
  /** worst latency among the territories it serves */
  latency: number | null;
  /** % of this hall's own ceiling used by a likely premiere night */
  load: number;
}
export interface CoverageRow {
  region: RegionId; label: string; viewers: number;
  cityId: string | null; cityLabel: string;
  latency: number | null; share: number; isLaunchMarket: boolean;
  cacheHit: number; bufferRisk: number; quality: 'EXCELLENT' | 'GOOD' | 'UNSTABLE' | 'POOR';
}
export interface Derived {
  capex: number; weekly: number; weeks: number;
  opsReserve: number; campaignCost: number; debtReserve: number;
  committed: number; remaining: number; over: boolean;
  ceiling: number; burstCeiling: number;
  racks: number; debt: number;
  halls: HallView[];
  coverage: CoverageRow[];
  /** worst latency anyone in your territories suffers */
  worstLatency: number | null;
  /** territories with no server anywhere */
  unserved: RegionId[];
  averageLatency: number | null;
  averageCacheHit: number;
  bufferingRisk: number;
  deliveryCostPerHour: number;
  resilienceLabel: 'FRAGILE' | 'EXPOSED' | 'REDUNDANT';
  plainSummary: string;
  demandTotal: (s: Scenario) => number;
  demandOfCity: (cityId: string, s: Scenario) => number;
}

export function derive(sel: BuildSel, inp: BuildInputs): Derived {
  const a = archOf(sel.arch), d = docOf(sel.doctrine), c = campOf(sel.campaign);
  const marketTerr = territoriesOf(inp.regions);
  const terr = territoriesOf(inp.coverageRegions?.length ? inp.coverageRegions : inp.regions);

  const placed = sel.placements
    .filter(p => p.racks > 0)
    .map(p => ({ p, city: cityById(p.cityId) }))
    .filter((x): x is { p: Placement; city: City } => !!x.city);

  /* A territory is carried by every hall close enough to serve it — not only the
     single nearest one — and the traffic splits between them by rack count. Any
     other rule would leave a second city in the same region standing idle, which
     is not how a delivery network behaves and would make redundancy worthless. */
  const NEARBY_MS = 30;
  const totalViewers = terr.reduce((s, r) => s + regionOf(r).viewers, 0);
  const marketViewers = marketTerr.reduce((s, r) => s + regionOf(r).viewers, 0);
  const cityShare = new Map<string, number>();
  const poolOf = new Map<RegionId, string[]>();

  const coverage: CoverageRow[] = terr.map(r => {
    const cands = placed.map(({ p, city }) => ({
      city, racks: p.racks, role: p.role,
      cacheHit: Math.min(98, ROLE_RULES[p.role].cache + Math.round(Math.log2(Math.max(1, p.racks)) * 7)),
      ms: (latencyTo(city, r) ?? 999) + ROLE_RULES[p.role].latency
        + a.latencyAdd + (d.id === 'RUSHED' ? 9 : 0),
    })).sort((x, y) => x.ms - y.ms);

    const worldwideShare = totalViewers ? regionOf(r).viewers / totalViewers : 0;
    const demandShare = marketTerr.includes(r) && marketViewers
      ? regionOf(r).viewers / marketViewers
      : 0;
    // Headline experience numbers describe the market the player is actually
    // opening today. The expanded table still previews every future region.
    const share = demandShare || (marketViewers ? 0 : worldwideShare);
    if (!cands.length) {
      return {
        region: r, label: regionOf(r).label, viewers: regionOf(r).viewers,
        cityId: null, cityLabel: 'NO SERVER', latency: null, share,
        isLaunchMarket: marketTerr.includes(r),
        cacheHit: 0, bufferRisk: 100, quality: 'POOR' as const,
      };
    }
    const best = cands[0];
    const pool = cands.filter(x => x.ms <= best.ms + NEARBY_MS);
    const poolRacks = pool.reduce((s, x) => s + x.racks * ROLE_RULES[x.role].ceiling, 0) || 1;
    for (const x of pool) {
      cityShare.set(x.city.id, (cityShare.get(x.city.id) ?? 0)
        + demandShare * ((x.racks * ROLE_RULES[x.role].ceiling) / poolRacks));
    }
    poolOf.set(r, pool.map(x => x.city.id));

    const cacheHit = Math.round(pool.reduce((sum, x) => sum + x.cacheHit * x.racks, 0)
      / Math.max(1, pool.reduce((sum, x) => sum + x.racks, 0)));
    const bufferRisk = Math.max(1, Math.min(38, Math.round(
      Math.max(0, best.ms - 42) * .105 + Math.max(0, 68 - cacheHit) * .16 + (d.id === 'RUSHED' ? 3.5 : 0),
    )));
    const quality: CoverageRow['quality'] = bufferRisk <= 3 && best.ms < 70 ? 'EXCELLENT'
      : bufferRisk <= 7 && best.ms < 125 ? 'GOOD'
        : bufferRisk <= 15 ? 'UNSTABLE' : 'POOR';
    return {
      region: r, label: regionOf(r).label, viewers: regionOf(r).viewers,
      cityId: best.city.id,
      cityLabel: pool.length > 1 ? `${best.city.label} +${pool.length - 1}` : best.city.label,
      latency: best.ms, share, isLaunchMarket: marketTerr.includes(r), cacheHit, bufferRisk, quality,
    };
  });

  const halls: HallView[] = placed.map(({ p, city }) => {
    const idx = costIndex(city);
    const role = ROLE_RULES[p.role];
    const campus = campusOf(p.racks);
    const serves = coverage.filter(x => (poolOf.get(x.region) ?? []).includes(city.id));
    const onPrem = a.onPremFrac >= 1
      ? p.racks
      : Math.max(1, Math.round(p.racks * a.onPremFrac));
    const ceiling = Math.round(p.racks * PER_RACK_CEILING * d.ceilingMul * role.ceiling * a.capacityMul);
    return {
      city, racks: p.racks, onPrem, remote: p.racks - onPrem,
      role: p.role,
      campusLabel: campus.label,
      facilityCount: campus.halls,
      cacheHit: Math.min(98, role.cache + Math.round(Math.log2(Math.max(1, p.racks)) * 7)),
      ceiling, burstCeiling: Math.round(ceiling * (1 + a.burst)),
      capex: Math.round(p.racks * PER_RACK_CAPEX * idx * a.capexMul * d.costMul * role.capex),
      weekly: Math.round(p.racks * PER_RACK_WEEKLY * idx * a.weeklyMul * role.weekly),
      serves: serves.map(x => x.region),
      latency: serves.length ? Math.max(...serves.map(x => x.latency ?? 0)) : null,
      load: 0,        // filled once total demand is known, just below
    };
  }).sort((x, y) => y.racks - x.racks);

  const racks = halls.reduce((s, h) => s + h.racks, 0);
  const capex = halls.reduce((s, h) => s + h.capex, 0);
  const weekly = halls.reduce((s, h) => s + h.weekly, 0);

  /* a wider build takes longer, and the biggest hall sets the floor */
  const biggest = halls.reduce((m, h) => Math.max(m, h.racks), 0);
  const weeks = racks === 0 ? 0 : Math.max(1, Math.ceil(
    (2 + biggest * .28 + Math.max(0, halls.length - 1) * .7) * a.weeksMul * d.weeksMul));

  const opsReserve = weekly * 6;
  const campaignCost = c.cost;
  /* borrowed money starts costing the week it is drawn, launched or not */
  const debtReserve = (inp.debtWeekly ?? 0) * 6;
  const committed = capex + opsReserve + campaignCost + debtReserve
    + inp.catalogueSpend + inp.originalsSpend;
  const remaining = inp.treasury - committed;

  const ceiling = halls.reduce((s, h) => s + h.ceiling, 0);
  const burstCeiling = halls.reduce((s, h) => s + h.burstCeiling, 0);

  /* three separate things swell the crowd, and none of them build a rack:
     the size of your territories, what the plans cost, and the campaign */
  const base = marketViewers * DEMAND_RATE * (inp.audienceMul || 1);
  const demandTotal = (s: Scenario) =>
    Math.round(base * c.demandMul * SCENARIOS.find(x => x.id === s)!.mul);
  const demandOfCity = (cityId: string, s: Scenario) =>
    Math.round(demandTotal(s) * (cityShare.get(cityId) ?? 0));

  for (const h of halls) {
    h.load = h.ceiling ? Math.round((demandOfCity(h.city.id, 'LIKELY') / h.ceiling) * 100) : 0;
  }
  const served = coverage.filter(x => x.latency !== null);
  const averageLatency = served.length
    ? Math.round(served.reduce((sum, row) => sum + (row.latency || 0) * row.share, 0)
      / Math.max(.001, served.reduce((sum, row) => sum + row.share, 0)))
    : null;
  const averageCacheHit = served.length
    ? Math.round(served.reduce((sum, row) => sum + row.cacheHit * row.share, 0)
      / Math.max(.001, served.reduce((sum, row) => sum + row.share, 0)))
    : 0;
  const bufferingRisk = served.length
    ? Math.round(served.reduce((sum, row) => sum + row.bufferRisk * row.share, 0)
      / Math.max(.001, served.reduce((sum, row) => sum + row.share, 0)))
    : 100;
  const deliveryCostPerHour = Math.max(.01, Math.round((weekly / Math.max(1, ceiling) * 4.2) * 100) / 100);
  const resilienceLabel: Derived['resilienceLabel'] = halls.length >= 3 ? 'REDUNDANT'
    : halls.length === 2 ? 'EXPOSED' : 'FRAGILE';
  const weak = [...coverage].filter(row => row.quality === 'POOR' || row.quality === 'UNSTABLE')
    .sort((x, y) => y.bufferRisk - x.bufferRisk);
  const weakLaunchMarket = weak.filter(row => row.isLaunchMarket);
  const plainSummary = !halls.length
    ? 'Nothing can stream until the first core origin exists.'
    : weakLaunchMarket.length
      ? `${weakLaunchMarket[0].label} is in your launch market and may buffer. Put a hub or edge cache closer to it.`
      : weak.length
        ? `Your launch market should feel good. ${weak[0].label} will struggle if you expand there without a closer node.`
      : resilienceLabel === 'FRAGILE'
        ? 'Picture quality is healthy, but one city failure can take the platform down.'
        : 'The network should feel fast during normal viewing. Rehearse a premiere before committing.';

  return {
    capex, weekly, weeks, opsReserve, campaignCost, debtReserve,
    committed, remaining, over: remaining < 0,
    ceiling, burstCeiling, racks, debt: d.debt,
    halls, coverage,
    worstLatency: served.length ? Math.max(...served.map(x => x.latency!)) : null,
    unserved: coverage.filter(x => x.latency === null).map(x => x.region),
    averageLatency, averageCacheHit, bufferingRisk, deliveryCostPerHour,
    resilienceLabel, plainSummary,
    demandTotal, demandOfCity,
  };
}

/* ============================================================
   FORMATTING
   ============================================================ */
const money = (n: number) => {
  const s = n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (v >= 1e9) return `${s}$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${s}$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${s}$${Math.round(v / 1e3)}k`;
  return `${s}$${Math.round(v)}`;
};
const conc = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1e3)}K`;
const people = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : `${Math.round(n / 1e6)}M`;
const grade = (ms: number) => ms < 60 ? 'good' : ms < 120 ? 'ok' : 'bad';

/* ============================================================
   ONE HALL — racks in a named city, scrolling across
   ============================================================ */
/** A rack you own stands in metal. A rented one is the same machine drawn as a
 *  ghost — it exists and it carries traffic, it just is not in this building.
 *  Never an empty dashed slot: those would read as capacity you have not bought. */
const Rack: React.FC<{ n: number; owned: boolean; planned: boolean }> = ({ n, owned, planned }) => (
  <div className={cx(css.rack, css.on, (owned ? '' : css.rented), (planned ? css.planned : ''))}
    style={{ ['--epx-bld-i' as string]: n }}>
    <i className={css.rvent} />
    {Array.from({ length: 5 }).map((_, u) => (
      <div className={css.runit} key={u}>
        <i className={css.led} style={{ ['--epx-bld-d' as string]: `${((n * 5 + u) % 7) * .21}s` }} />
        <i className={css.led} style={{ ['--epx-bld-d' as string]: `${((n * 3 + u) % 5) * .29 + .1}s` }} />
        <span className={css.rgrill} />
      </div>
    ))}
    <i className={css.rfoot} />
    {planned ? <span className={cx(css.rentmark, css.drawn)}>PLAN</span>
      : !owned && <span className={css.rentmark}>RENTED</span>}
  </div>
);

/** the one human figure — nothing else on the screen gives the racks a size */
const Technician: React.FC = () => (
  <svg className={css.tech} viewBox="0 0 14 40" aria-hidden="true">
    <circle cx="7" cy="4.4" r="3" />
    <path d="M7 7.6 C3.4 7.6 2.2 10.4 2.2 14.6 L2.2 23 L4.4 23 L4.8 39 L9.2 39 L9.6 23 L11.8 23 L11.8 14.6 C11.8 10.4 10.6 7.6 7 7.6 Z" />
  </svg>
);

const Hall: React.FC<{
  h: HallView; canAdd: boolean;
  /** racks already paid for and standing; the rest are still a drawing */
  builtRacks: number;
  onSet: (racks: number) => void;
  onRole: (role: StreamingNetworkNodeRole) => void;
}> = ({ h, canAdd, builtRacks, onSet, onRole }) => {
  const visibleRacks = Math.min(h.racks, 24);
  const hiddenRacks = Math.max(0, h.racks - visibleRacks);
  return (
  <div className={cx(css.hall, (builtRacks < h.racks ? css.planning : ''), (builtRacks > 0 ? css.hasbuilt : ''))}>
    <div className={css.hallhead}>
      <div className={css.hallid}>
        <b>{h.city.label}</b>
        {h.city.hub && <i className={css.hubpill}>TIER-1</i>}
        <span>
          {h.campusLabel} · {h.facilityCount} hall{h.facilityCount === 1 ? '' : 's'}
        </span>
        <span>
          {h.racks} rack{h.racks === 1 ? '' : 's'} · {money(h.capex)} · {money(h.weekly)}/wk
        </span>
      </div>
      <div className={css.stepper}>
        <button onClick={() => onSet(h.racks - 1)} aria-label="Remove a rack">−</button>
        <b>{h.racks}</b>
        <button onClick={() => onSet(h.racks + 1)} disabled={!canAdd} aria-label="Add a rack">+</button>
      </div>
    </div>

    <div className={css.roles} aria-label={`Purpose of the ${h.city.label} campus`}>
      {(Object.keys(ROLE_RULES) as StreamingNetworkNodeRole[]).map(role => (
        <button key={role} className={cx(css.role, h.role === role ? css.on : '')}
          onClick={() => onRole(role)}>
          <b>{ROLE_RULES[role].name}</b>
          <span>{ROLE_RULES[role].line}</span>
        </button>
      ))}
    </div>

    {/* the room itself: fixed-width racks that scroll, never squeeze */}
    <div className={css.room}>
      <div className={css.roomback} />
      <div className={css.roomfloor} />
      <div className={css.rackscroll}>
        <div className={css.rackrow}>
          {Array.from({ length: visibleRacks }).map((_, n) => (
            <React.Fragment key={n}>
              {/* one dashed line is the whole cloud-vs-owned story: this side of
                  it is your building, that side is somebody else's */}
              {h.remote > 0 && n === h.onPrem && (
                <div className={css.wall}><i className={css.wline} /></div>
              )}
              <Rack n={n} owned={n < h.onPrem} planned={n >= builtRacks} />
            </React.Fragment>
          ))}
          {hiddenRacks > 0 && (
            <div className={css.rackoverflow}>
              <b>+{hiddenRacks}</b>
              <span>RACKS IN<br />ADJACENT HALLS</span>
            </div>
          )}
          {builtRacks > 0 && <Technician />}
          {h.racks < MAX_RACKS_PER_CAMPUS && (
            <button className={css.rackadd} onClick={() => onSet(h.racks + 1)}>
              <i>+</i><span>RACK</span>
            </button>
          )}
        </div>
      </div>

      {/* a drawing has to say it is a drawing */}
      {builtRacks < h.racks && (
        <div className={css.plantag}>
          <span className={css.dim}>{(h.racks * .6 + 1.2).toFixed(1)}m × 4.2m</span>
          <span className={css.dim}>{h.racks * 12}kW</span>
          <span className={css.rev}>{builtRacks > 0 ? `REV B · +${h.racks - builtRacks} PLANNED` : 'REV A · NOT FOR CONSTRUCTION'}</span>
        </div>
      )}
    </div>

    <div className={css.hallfoot}>
      {h.serves.length ? (
        <>
          <span>
            Serves {h.serves.map(r => regionOf(r).label).join(' · ')}
          </span>
          {h.latency !== null && (
            <em className={css[grade(h.latency)] ?? ''}>{h.latency}ms</em>
          )}
        </>
      ) : (
        <span className={css.idle}>Serves nobody — another city is closer to all of your territories</span>
      )}
    </div>
  </div>
  );
};

/* ============================================================
   ADD A CITY
   ============================================================ */
const CityPicker: React.FC<{
  sel: BuildSel; inp: BuildInputs; d: Derived;
  onAdd: (cityId: string) => void; onClose: () => void;
}> = ({ sel, inp, d, onAdd, onClose }) => {
  const taken = new Set(sel.placements.filter(p => p.racks > 0).map(p => p.cityId));
  const terr = territoriesOf(inp.coverageRegions?.length ? inp.coverageRegions : inp.regions);

  /* what one rack here would actually fix, said in milliseconds */
  const gain = (c: City) => {
    let best: { label: string; from: number | null; to: number } | null = null;
    for (const row of d.coverage) {
      const to = (latencyTo(c, row.region) ?? 999) + archOf(sel.arch).latencyAdd;
      const from = row.latency;
      if (from === null) return { label: regionOf(row.region).label, from: null, to };
      const win = from - to;
      if (win > 12 && (!best || win > (best.from! - best.to))) {
        best = { label: regionOf(row.region).label, from, to };
      }
    }
    return best;
  };

  return (
    <div className={css.picker} onClick={onClose}>
      <div className={css.pickbox} onClick={e => e.stopPropagation()}>
        <div className={css.pickhead}>
          <b>PLACE A DATA CENTRE</b>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={css.pickscroll}>
          {terr.map(r => {
            const inR = CITIES.filter(c => c.region === r && !taken.has(c.id));
            if (!inR.length) return null;
            return (
              <div className={css.pickgroup} key={r}>
                <span className={css.pickreg}>{regionOf(r).label}</span>
                {inR.map(c => {
                  const g = gain(c);
                  return (
                    <button className={css.pickcity} key={c.id} onClick={() => onAdd(c.id)}>
                      <div className={css.pcid}>
                        <b>{c.label}</b>
                        {c.hub && <i className={css.hubpill}>TIER-1</i>}
                        <span>
                          {money(PER_RACK_CAPEX * costIndex(c))} setup · {money(PER_RACK_WEEKLY * costIndex(c))}/wk
                          {' · '}{c.quality >= 9 ? 'elite grid' : c.quality >= 7 ? 'stable grid' : 'value grid'}
                        </span>
                      </div>
                      <div className={css.pcgain}>
                        {g ? (
                          g.from === null
                            ? <em className={css.new}>Connects {g.label} · {g.to}ms</em>
                            : <em className={css[grade(g.to)] ?? ''}>{g.label} {g.from}→{g.to}ms</em>
                        ) : <em className={css.none}>More capacity, same reach</em>}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   COMMISSIONING — the drawing becomes the building
   ------------------------------------------------------------
   The whole point of the blueprint is this moment. Nothing on the
   Build screen has cost anything yet; here the money actually
   leaves and the outlines turn into machines. Six beats, ~6s,
   tap to skip — the same contract as the founding cinematics.
   ============================================================ */
const BEATS = [
  { ms: 1100, kicker: 'DRAWING APPROVED', line: 'Rev A signed off. Construction may begin.' },
  { ms: 1000, kicker: 'FLOORS POURED', line: 'Raised floor, cable trays, cooling loop.' },
  { ms: 1400, kicker: 'RACKS INSTALLED', line: 'Cabinets bolted down, empty and dark.' },
  { ms: 1500, kicker: 'POWER ON', line: 'Machines boot. The hum starts.' },
  { ms: 1900, kicker: 'FUNDS RELEASED', line: 'Contracts execute. The money leaves.' },
  { ms: 0, kicker: 'COMMISSIONED', line: 'You own a building full of running machines.' },
];

const Commissioning: React.FC<{
  brand: Brand; d: Derived; inp: BuildInputs; sel: BuildSel; onDone: () => void;
  doneLabel?: string;
}> = ({ brand, d, inp, sel, onDone, doneLabel = 'TO OPENING NIGHT →' }) => {
  const [beat, setBeat] = useState(0);
  const timer = useRef(0);

  useEffect(() => {
    if (beat >= BEATS.length - 1) return;
    timer.current = window.setTimeout(() => setBeat(b => b + 1), BEATS[beat].ms);
    return () => clearTimeout(timer.current);
  }, [beat]);

  /* the money only drains once the contracts execute — beat 4 */
  const drained = beat >= 5 ? 1 : beat === 4 ? .55 : 0;
  const spent = Math.round(d.committed * drained);

  const receipts = [
    ...d.halls.map(h => ({
      k: h.city.id,
      what: `LEASE · ${h.city.label}`,
      detail: `${h.racks} rack${h.racks === 1 ? '' : 's'}`,
      v: h.capex,
    })),
    { k: 'ops', what: 'OPERATING RESERVE', detail: '6 weeks', v: d.opsReserve },
    { k: 'cat', what: 'CATALOGUE LICENCES', detail: `${inp.catalogueTitles} titles`, v: inp.catalogueSpend },
    { k: 'orig', what: 'ORIGINAL FIRST-WINDOW FEES', detail: `${inp.originalsCount} titles`, v: inp.originalsSpend },
    ...(d.campaignCost > 0
      ? [{ k: 'camp', what: 'LAUNCH CAMPAIGN', detail: campOf(sel.campaign).name, v: d.campaignCost }]
      : []),
  ];

  const skip = () => {
    clearTimeout(timer.current);
    setBeat(BEATS.length - 1);
  };

  return (
    <div className={cx(css.com, css['b' + (beat)])} onClick={beat < BEATS.length - 1 ? skip : undefined}>
      <div className={css.comtop}>
        <div className={css.comtitle}>
          <b>{brand.name || 'EMPIRE+'}</b>
          <span>
            {d.halls.length} SITE{d.halls.length === 1 ? '' : 'S'} · {d.racks} RACKS ·
            {beat >= BEATS.length - 1 ? ' BUILT · WEEK 0' : ' REV A'}
          </span>
        </div>
        <span className={css.commark}><Mark brand={brand} /></span>
      </div>

      <div className={css.comstage}>
        {d.halls.map((h, hi) => (
          <div className={css.comhall} key={h.city.id} style={{ ['--epx-bld-hi' as string]: hi }}>
            <div className={css.comcity}>
              <b>{h.city.label}</b>
              <em>{h.racks} × {PER_RACK_CEILING / 1000}K</em>
            </div>
            <div className={css.comroom}>
              <div className={css.comfloor} />
              <div className={css.comracks}>
                {Array.from({ length: h.racks }).map((_, n) => (
                  <div className={css.crack} key={n} style={{ ['--epx-bld-i' as string]: n }}>
                    {Array.from({ length: 6 }).map((_, u) => (
                      <i className={css.cu} key={u} style={{ ['--epx-bld-d' as string]: `${((n * 6 + u) % 11) * .09}s` }} />
                    ))}
                  </div>
                ))}
                {beat >= 5 && <Technician />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={css.comledger}>
        <div className={css.comspend}>
          <span>RELEASED</span>
          <b>{money(spent)}</b>
        </div>
        <div className={css.comdrain}><i style={{ width: `${drained * 100}%` }} /></div>
        <div className={css.comrec}>
          {receipts.map((r, i) => (
            <div className={cx(css.rec, (beat >= 4 ? css.in : ''))} key={r.k} style={{ ['--epx-bld-r' as string]: i }}>
              <span>{r.what}</span>
              <em>{r.detail}</em>
              <b>{money(r.v)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className={css.combeat}>
        <span className={css.comkick}>{BEATS[beat].kicker}</span>
        <p>{BEATS[beat].line}</p>
      </div>

      <div className={css.comfoot}>
        {beat >= BEATS.length - 1 ? (
          <button className={css.comgo} onClick={e => { e.stopPropagation(); onDone(); }}>
            {doneLabel}
          </button>
        ) : (
          <div className={css.comskip}>TAP TO SKIP</div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   THE BUDGET — one pot, everything competing for it
   ============================================================ */
const BudgetBar: React.FC<{
  inp: BuildInputs; d: Derived;
  funding?: { borrowed: number; soldPct: number; own: number };
  onRaise?: () => void;
}> = ({ inp, d, funding, onRaise }) => {
  const segs = [
    { k: 'infra', label: 'Infrastructure', v: d.capex },
    { k: 'ops', label: 'Operating reserve', v: d.opsReserve },
    { k: 'debt', label: 'Debt service reserve', v: d.debtReserve },
    { k: 'cat', label: 'Catalogue licences', v: inp.catalogueSpend },
    { k: 'orig', label: 'Original first-window fees', v: inp.originalsSpend },
    { k: 'camp', label: 'Launch campaign', v: d.campaignCost },
  ].filter(s => s.v > 0);

  const scale = d.over ? d.committed : inp.treasury;

  return (
    <div className={cx(css.budget, (d.over ? css.over : ''))}>
      <div className={css.bghead}>
        <div>
          <span>UNCOMMITTED</span>
          <b className={d.over ? css.bad : d.remaining < inp.treasury * .08 ? css.warn : css.good}>
            {money(d.remaining)}
          </b>
        </div>
        <div className={css.right}>
          <span>OF {money(inp.treasury)}</span>
          <em>{money(d.committed)} committed</em>
          {onRaise && <button className={css.raisebtn} onClick={onRaise}>+ RAISE</button>}
        </div>
      </div>

      <div className={css.bgbar}>
        {segs.map(s => (
          <i key={s.k} className={cx(css.sg, css[s.k])} style={{ width: `${(s.v / scale) * 100}%` }} title={s.label} />
        ))}
        {!d.over && <i className={cx(css.sg, css.free)} style={{ width: `${(d.remaining / scale) * 100}%` }} />}
      </div>

      <div className={css.bglegend}>
        {segs.map(s => (
          <span key={s.k}><i className={cx(css.dot, css[s.k])} />{s.label} <em>{money(s.v)}</em></span>
        ))}
      </div>

      {/* where the money came from follows it around */}
      {funding && (funding.borrowed > 0 || funding.soldPct > 0 || funding.own > 0) && (
        <div className={css.funding}>
          {funding.borrowed > 0 && <span><i className={cx(css.fdot, css.debt)} />{money(funding.borrowed)} borrowed</span>}
          {funding.soldPct > 0 && <span><i className={cx(css.fdot, css.eq)} />{funding.soldPct.toFixed(1)}% sold</span>}
          {funding.own > 0 && <span><i className={cx(css.fdot, css.own)} />{money(funding.own)} your own</span>}
        </div>
      )}

      {d.over && (
        <div className={css.bgover}>
          You are {money(-d.remaining)} short. Raise it, or something here has to get smaller.
        </div>
      )}
    </div>
  );
};

/** Once the cheque has cleared there is no budget left to allocate, so the
 *  same bar would be lying. After commissioning the only live number is what
 *  the racks you have newly drawn would cost on top. */
const RevisionBar: React.FC<{ spent: number; d: Derived; dBuilt: Derived }> = ({ spent, d, dBuilt }) => {
  const capex = d.capex - dBuilt.capex;
  const weekly = d.weekly - dBuilt.weekly;
  return (
    <div className={cx(css.budget, css.rev, (capex > 0 ? css.pending : ''))}>
      <div className={css.bghead}>
        <div>
          <span>{capex > 0 ? 'THIS REVISION' : 'ALREADY SPENT'}</span>
          <b className={capex > 0 ? css.warn : ''}>{capex > 0 ? `+${money(capex)}` : money(spent)}</b>
        </div>
        <div className={css.right}>
          <span>{capex > 0 ? `ON TOP OF ${money(spent)}` : 'COMMISSIONED'}</span>
          <em>{capex > 0 ? `+${money(weekly)}/wk running` : `${money(dBuilt.weekly)}/wk running`}</em>
        </div>
      </div>
      {capex > 0 && (
        <div className={cx(css.bgover, css.warn)}>
          Drawn, not built. Commission the revision and the machines go in.
        </div>
      )}
    </div>
  );
};

/* ============================================================
   THE REHEARSAL — a premiere night that costs nothing
   ============================================================ */
export type Verdict = 'HELD' | 'BURST' | 'BROKE';

export interface CityResult {
  cityId: string; label: string;
  demand: number; ceiling: number; burstCeiling: number;
  verdict: Verdict; failedPct: number;
}
export interface RunResult {
  verdict: Verdict;
  peak: number; peakLoad: number;
  burstRented: number; burstCost: number;
  failedPct: number; downMins: number;
  cities: CityResult[];
}

/** S-curve: nobody at 0, everyone by the time the show starts, then a slow bleed */
const curveAt = (t: number) => {
  const rise = 1 / (1 + Math.exp(-(t - .38) * 13));
  const bleed = t > .62 ? (t - .62) * .30 : 0;
  return Math.max(0, rise - bleed);
};

const Rehearsal: React.FC<{
  brand: Brand; d: Derived; inp: BuildInputs; sel: BuildSel;
  onClose: () => void; onResult: (r: RunResult) => void;
}> = ({ brand, d, inp, sel, onClose, onResult }) => {
  const [scenario, setScenario] = useState<Scenario>('LIKELY');
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const raf = useRef(0);

  const target = d.demandTotal(scenario);
  const wobble = docOf(sel.doctrine).wobble;

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const DUR = 6200;
    let over = false;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else finish();
    };
    raf.current = requestAnimationFrame(tick);
    /* rAF stops firing in a backgrounded tab — without this the run would hang
       forever and the player would come back to a rehearsal that never ended */
    const guard = window.setTimeout(() => { setT(1); finish(); }, DUR + 400);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(guard); };

    function finish() {
      if (over) return;
      over = true;

      /* every hall is judged on its own traffic, and the worst one is the night */
      const cities: CityResult[] = d.halls.map(h => {
        const dem = d.demandOfCity(h.city.id, scenario);
        let v: Verdict = 'HELD';
        let failed = 0;
        if (dem > h.burstCeiling) {
          v = 'BROKE';
          failed = Math.min(82, Math.round(((dem - h.burstCeiling) / dem) * 100) + Math.round(wobble * 40));
        } else if (dem > h.ceiling) {
          v = 'BURST';
          failed = Math.round(wobble * 22);
        } else if (wobble > .08 && dem > h.ceiling * .82) {
          v = 'BURST';
          failed = Math.round(wobble * 14);
        }
        return {
          cityId: h.city.id, label: h.city.label, demand: dem,
          ceiling: h.ceiling, burstCeiling: h.burstCeiling, verdict: v, failedPct: failed,
        };
      });

      const worst: Verdict = cities.some(x => x.verdict === 'BROKE') ? 'BROKE'
        : cities.some(x => x.verdict === 'BURST') ? 'BURST' : 'HELD';
      const burstRented = cities.reduce((s, x) =>
        s + Math.max(0, Math.min(x.demand, x.burstCeiling) - x.ceiling), 0);
      const failedPct = cities.length
        ? Math.round(cities.reduce((s, x) => s + x.failedPct * (x.demand || 1), 0)
          / Math.max(1, cities.reduce((s, x) => s + (x.demand || 1), 0)))
        : 0;

      const r: RunResult = {
        verdict: worst,
        peak: target,
        peakLoad: d.ceiling ? Math.round((target / d.ceiling) * 100) : 999,
        burstRented, burstCost: Math.round(burstRented * 4.1),
        failedPct,
        downMins: failedPct > 0 ? 6 + Math.round(failedPct * .9) : 0,
        cities,
      };
      setResult(r); setRunning(false); onResult(r);
    }
  }, [running]);

  const live = Math.round(target * curveAt(t));
  const loadPct = d.ceiling ? (live / d.ceiling) * 100 : 999;
  const overNow = live > d.ceiling;
  const brokeNow = live > d.burstCeiling;

  const W = 300, H = 104;
  const top = Math.max(target, d.burstCeiling) * 1.1 || 1;
  const pts = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const tt = i / 64;
      if (tt > t) break;
      const v = target * curveAt(tt);
      out.push(`${(tt * W).toFixed(1)},${(H - (v / top) * H).toFixed(1)}`);
    }
    return out.join(' ');
  }, [t, target, top]);
  const yOf = (v: number) => H - (v / top) * H;

  return (
    <div className={cx(css.rh, (brokeNow ? ' broke' : overNow ? css.hot : ''), (result ? css.done : ''))}>
      <div className={css.rhtop}>
        <button className={css.rhx} onClick={onClose} aria-label="Close">✕</button>
        <div className={css.rhtitle}>
          <b>LOAD REHEARSAL</b>
          <span>SIMULATED · CHANGES NOTHING</span>
        </div>
        <span className={css.rhmark}><Mark brand={brand} /></span>
      </div>

      <div className={css.rhscroll}>
        {!running && !result && (
          <>
            <p className={css.rhlead}>
              We push a fake premiere night of <b>{inp.premiereTitle}</b> through the
              halls you have built, and watch which city gives first.
            </p>
            <div className={css.rhscen}>
              {SCENARIOS.map(s => (
                <button key={s.id} className={cx(css.scen, (scenario === s.id ? css.on : ''))}
                  onClick={() => setScenario(s.id)}>
                  <b>{s.name}</b>
                  <span>{s.sub}</span>
                  <em>{conc(d.demandTotal(s.id))}</em>
                </button>
              ))}
            </div>

            <div className={css.rhcities}>
              {d.halls.map(h => {
                const dem = d.demandOfCity(h.city.id, scenario);
                const pct = h.ceiling ? Math.round((dem / h.ceiling) * 100) : 0;
                return (
                  <div className={css.rhcity} key={h.city.id}>
                    <div className={css.rctop}>
                      <b>{h.city.label}</b>
                      <em className={pct > 100 ? css.bad : pct > 82 ? css.warn : css.good}>{pct}%</em>
                    </div>
                    <div className={css.rcbar}>
                      <i style={{ width: `${Math.min(100, pct)}%` }} className={pct > 100 ? css.bad : pct > 82 ? css.warn : ''} />
                    </div>
                    <span>{conc(dem)} expected · {conc(h.ceiling)} ceiling</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {(running || result) && (
          <>
            <div className={css.rhlive}>
              <span>CONCURRENT STREAMS</span>
              <b className={brokeNow ? css.bad : overNow ? css.warn : ''}>{conc(result ? result.peak : live)}</b>
              <em>{Math.round(result ? result.peakLoad : loadPct)}% of your own capacity</em>
            </div>

            <svg className={css.rhchart} viewBox={`0 0 ${W} ${H + 16}`} preserveAspectRatio="none">
              {d.burstCeiling > d.ceiling && (
                <line className={css.burstline} x1="0" x2={W} y1={yOf(d.burstCeiling)} y2={yOf(d.burstCeiling)} />
              )}
              <line className={css.ceilline} x1="0" x2={W} y1={yOf(d.ceiling)} y2={yOf(d.ceiling)} />
              <polyline className={css.curve} points={pts} />
              {pts && <circle className={css.head} r="3.4" cx={(t * W).toFixed(1)} cy={yOf(live).toFixed(1)} />}
            </svg>
            <div className={css.rhkeys}>
              <span><i className={css.kc} />your capacity {conc(d.ceiling)}</span>
              {d.burstCeiling > d.ceiling && <span><i className={css.kb} />rented burst {conc(d.burstCeiling)}</span>}
            </div>

            <div className={css.rhbar}>
              <i className={css.fill} style={{ width: `${Math.min(100, loadPct)}%` }} />
            </div>
          </>
        )}

        {result && (
          <div className={cx(css.verdict, css[result.verdict.toLowerCase()])}>
            <b className={css.vhead}>
              {result.verdict === 'HELD' ? 'IT HELD'
                : result.verdict === 'BURST' ? 'IT HELD — BY RENTING'
                  : 'IT BROKE'}
            </b>
            <p>
              {result.verdict === 'HELD' && (
                <>Peak {conc(result.peak)} against {conc(d.ceiling)} across {result.cities.length}
                  {' '}cit{result.cities.length === 1 ? 'y' : 'ies'}. Every territory got through the
                  night, and you pay for that headroom every week to have it.</>
              )}
              {result.verdict === 'BURST' && (
                <>Peak {conc(result.peak)} went past your own hardware. You rented {conc(result.burstRented)}
                  {' '}for the night at {money(result.burstCost)}
                  {result.failedPct > 0 ? `, and ${result.failedPct}% of streams still stuttered.` : '. Nobody watching noticed a thing.'}</>
              )}
              {result.verdict === 'BROKE' && (() => {
                const worst = [...result.cities].sort((a, b) => b.failedPct - a.failedPct)[0];
                const ok = result.cities.filter(x => x.verdict === 'HELD').map(x => x.label);
                return (
                  <>{ok.length ? `${ok.join(' and ')} held. ` : ''}
                    <b>{worst.label} failed.</b> {conc(worst.demand)} people came at
                    {' '}{conc(worst.burstCeiling)} of everything that hall has, rented included,
                    and {worst.failedPct}% of them got nothing — on the one night your whole
                    audience was watching.</>
                );
              })()}
            </p>

            {/* per city, because "which of my own territories did I let down" is
                a far better question than one global percentage */}
            <div className={css.citygrid}>
              {result.cities.map(x => (
                <div className={cx(css.cres, css[x.verdict.toLowerCase()])} key={x.cityId}>
                  <div className={css.crtop}>
                    <b>{x.label}</b>
                    <em>{x.verdict === 'HELD' ? 'HELD' : x.verdict === 'BURST' ? 'RENTED' : 'FAILED'}</em>
                  </div>
                  <span>{conc(x.demand)} vs {conc(x.ceiling)}{x.failedPct > 0 ? ` · ${x.failedPct}% lost` : ''}</span>
                </div>
              ))}
            </div>

            {/* said in the language of the page they will be staring at when it happens for real */}
            <div className={css.ministatus}>
              <div className={css.mstop}>
                <b>Streaming delivery</b>
                <em className={result.verdict === 'BROKE' ? css.outage : result.verdict === 'BURST' && result.failedPct > 0 ? css.degraded : css.operational}>
                  {result.verdict === 'BROKE' ? 'Major outage'
                    : result.verdict === 'BURST' && result.failedPct > 0 ? 'Degraded performance'
                      : 'Operational'}
                </em>
              </div>
              <div className={css.mstrip}>
                {Array.from({ length: 46 }).map((_, n) => {
                  const bad = n >= 42 && result.verdict === 'BROKE';
                  const deg = n >= 43 && result.verdict === 'BURST' && result.failedPct > 0;
                  return <i key={n} className={bad ? css.down : deg ? css.deg : css.ok} />;
                })}
              </div>
            </div>

            <div className={css.fixes}>
              <span className={css.fixhead}>WHAT WOULD CHANGE IT</span>
              {result.cities.filter(x => x.verdict === 'BROKE').map(x => (
                <div className={css.fix} key={x.cityId}>
                  {x.label} needs {Math.ceil((x.demand - x.ceiling) / PER_RACK_CEILING)} more
                  rack{Math.ceil((x.demand - x.ceiling) / PER_RACK_CEILING) === 1 ? '' : 's'} to
                  carry its own traffic.
                </div>
              ))}
              {result.verdict !== 'HELD' && archOf(sel.arch).burst === 0 && (
                <div className={css.fix}>Owned metal has no burst. Hybrid or cloud lets you rent your way out of a spike.</div>
              )}
              {sel.doctrine === 'RUSHED' && (
                <div className={css.fix}>Sprint-built halls run at 90% of their rated ceiling and wobble under load.</div>
              )}
              {result.verdict !== 'HELD' && sel.campaign !== 'NONE' && (
                <div className={css.fix}>A smaller campaign brings fewer people — and fewer people is the cheapest capacity there is.</div>
              )}
              {result.verdict === 'HELD' && (
                <div className={css.fix}>Nothing needs to change. Consider whether you have bought more room than you need.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={css.rhfoot}>
        {!running && !result && (
          <button className={css.rhrun} onClick={() => { setT(0); setRunning(true); }}>RUN THE REHEARSAL</button>
        )}
        {running && <div className={css.rhwait}><i />PUSHING TRAFFIC…</div>}
        {result && (
          <>
            <button className={css.rhagain} onClick={() => { setResult(null); setT(0); }}>RUN AGAIN</button>
            <button className={css.rhrun} onClick={onClose}>BACK TO THE BUILD</button>
          </>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   THE SCREEN
   ============================================================ */
export const TheBuild: React.FC<{
  brand: Brand;
  inputs: BuildInputs;
  sel: BuildSel;
  /** the rehearsal lives in the parent so the HQ's readiness count and this
      screen's gate can never disagree about whether one has been run */
  result?: RunResult | null;
  onResult?: (r: RunResult | null) => void;
  /** what has actually been paid for and stands. null until commissioning —
      everything on screen before that is a drawing, and says so. */
  built?: Placement[] | null;
  /** true only once opening night has actually been played */
  isLive?: boolean;
  onCommit?: (p: Placement[]) => BuildCommitResult | void;
  onOpenNight?: () => void;
  onChange: (s: BuildSel) => void;
  onBack: () => void;
  onLaunch?: () => void;
  /** the plans on sale, summarised — the page itself lives in pricing.tsx */
  pricing?: { label: string; arpu: string; reach: string; problems: number; sellable: number };
  onOpenPricing?: () => void;
  /** where the money came from — see raise.tsx */
  funding?: { borrowed: number; soldPct: number; own: number };
  onRaise?: () => void;
}> = ({ brand, inputs, sel, result, onResult, built, isLive, onCommit, onOpenNight,
  onChange, onBack, onLaunch, pricing, onOpenPricing, funding, onRaise }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const d = useMemo(() => derive(sel, inputs), [sel, inputs]);
  const [rehearse, setRehearse] = useState(false);
  const [picking, setPicking] = useState(false);
  const [commissioning, setCommissioning] = useState(false);
  const [commitResult, setCommitResult] = useState<BuildCommitResult | null>(null);
  const [commitFeedback, setCommitFeedback] = useState('');
  const [showNetworkDetail, setShowNetworkDetail] = useState(false);
  const last = result ?? null;
  const preset = useMemo(
    () => matchedPreset(sel, inputs.regions, inputs.homeCityId),
    [sel, inputs.regions, inputs.homeCityId]);

  const isBuilt = !!built;
  const builtOf = (cityId: string) => built?.find(p => p.cityId === cityId)?.racks ?? 0;
  const planned = d.halls.reduce((s, h) => s + Math.max(0, h.racks - builtOf(h.city.id)), 0);
  /* what the committed build costs, so a revision can be priced as a difference */
  const dBuilt = useMemo(
    () => derive({ ...sel, placements: built ?? [] }, inputs),
    [sel.arch, sel.doctrine, sel.campaign, built, inputs]);

  const commit = (s: BuildSel) => {
    setCommitFeedback('');
    setCommitResult(null);
    onResult?.(null);
    onChange(s);
  };

  const beginCommissioning = () => {
    const outcome = onCommit?.(sel.placements.map(p => ({ ...p })));
    if (outcome && !outcome.ok) {
      setCommitResult(outcome);
      setCommitFeedback(outcome.message);
      return;
    }
    const success = outcome || { ok: true, message: 'The infrastructure contract was committed.', next: 'LAUNCH' as const };
    setCommitResult(success);
    setCommitFeedback('');
    setCommissioning(true);
  };

  const setRacks = (cityId: string, racks: number) => {
    const n = Math.max(0, Math.min(MAX_RACKS_PER_CAMPUS, racks));
    const next = sel.placements.some(p => p.cityId === cityId)
      ? sel.placements.map(p => p.cityId === cityId ? { ...p, racks: n } : p)
      : [...sel.placements, {
        cityId,
        racks: n,
        role: sel.placements.some(p => p.role === 'CORE_ORIGIN') ? 'EDGE_CACHE' : 'CORE_ORIGIN' as const,
      }];
    const active = next.filter(p => p.racks > 0);
    if (active.length && !active.some(p => p.role === 'CORE_ORIGIN')) active[0] = { ...active[0], role: 'CORE_ORIGIN' };
    commit({ ...sel, placements: active });
  };

  const setRole = (cityId: string, role: StreamingNetworkNodeRole) => {
    const next = sel.placements.map(p => {
      if (p.cityId === cityId) return { ...p, role };
      if (role === 'CORE_ORIGIN' && p.role === 'CORE_ORIGIN') return { ...p, role: 'REGIONAL_HUB' as const };
      return p;
    });
    const active = next.filter(p => p.racks > 0);
    if (active.length && !active.some(p => p.role === 'CORE_ORIGIN')) {
      const fallback = active.findIndex(p => p.cityId !== cityId);
      active[Math.max(0, fallback)] = { ...active[Math.max(0, fallback)], role: 'CORE_ORIGIN' };
    }
    commit({ ...sel, placements: active });
  };

  const set = <K extends keyof BuildSel>(k: K, v: BuildSel[K]) => {
    if (sel[k] === v) return;
    commit({ ...sel, [k]: v });
  };

  const ready = !d.over && last !== null && d.racks > 0
    && (!pricing || pricing.sellable > 0);

  return (
    /* 'drawing', not 'plan' — pricing.tsx owns a global .plan for its columns
       and both stylesheets are live at once while that sheet is open */
    <div className={css.bld}
      style={{ ['--epx-bld-c' as string]: c}}>
      <div className={css.bldtop}>
        <button className={css.bldback} onClick={onBack} aria-label="Back">←</button>
        <div className={css.bldtitle}>
          <b>{isBuilt ? 'INFRASTRUCTURE' : 'THE BUILD'}</b>
          <span>
            {isBuilt
              ? `${isLive ? 'BUILT' : 'BUILT · NOT OPEN'} · ${d.racks - planned} RACKS STANDING${planned ? ` · ${planned} DRAWN` : ''}`
              : `NOTHING EXISTS YET · ${d.weeks} WEEK${d.weeks === 1 ? '' : 'S'} TO BUILD`}
          </span>
        </div>
        <span className={css.bldmark}><Mark brand={brand} /></span>
      </div>

      {/* the spine — four things, and where you are among them */}
      {!isBuilt && (
        <div className={css.spine}>
          {([
            ['SITES', d.racks > 0 && d.unserved.length === 0],
            ['PLANS', !pricing || pricing.sellable > 0],
            ['MONEY', !d.over],
            ['TEST', last !== null],
            ['LAUNCH', ready],
          ] as [string, boolean][]).map(([label, done], i) => (
            <div className={cx(css.sp, (done ? css.done : ''))} key={label}>
              <i className={css.spdot}>{done ? '✓' : i + 1}</i>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className={css.bldscroll}>

        {commitFeedback ? (
          <div className={css.commiterror} role="alert">
            <b>BUILD NOT COMMITTED</b>
            <span>{commitFeedback}</span>
          </div>
        ) : null}

        {isBuilt
          ? <RevisionBar spent={dBuilt.committed} d={d} dBuilt={dBuilt} />
          : <BudgetBar inp={inputs} d={d} funding={funding} onRaise={onRaise} />}

        {/* ── coverage: a simple answer first, engineering detail on demand ── */}
        <section className={css.bsec}>
          <div className={css.bhead}>
            <h2>Viewer experience</h2>
            <span>launch market · {d.racks} rack{d.racks === 1 ? '' : 's'}</span>
          </div>
          <div className={css.signalread}>
            <span>WHAT VIEWERS WILL FEEL</span>
            <b>{d.plainSummary}</b>
          </div>
          <div className={css.signalgrid}>
            <div><span>STARTUP</span><b>{d.averageLatency === null ? '—' : d.averageLatency < 70 ? 'FAST' : d.averageLatency < 125 ? 'OKAY' : 'SLOW'}</b><em>{d.averageLatency === null ? 'No network' : `${d.averageLatency}ms average`}</em></div>
            <div><span>BUFFERING</span><b>{d.bufferingRisk <= 5 ? 'LOW' : d.bufferingRisk <= 13 ? 'WATCH' : 'HIGH'}</b><em>{d.bufferingRisk}% risk</em></div>
            <div><span>VIDEO READY</span><b>{d.averageCacheHit}%</b><em>on the serving node</em></div>
            <div><span>OUTAGE SAFETY</span><b>{d.resilienceLabel}</b><em>{d.halls.length} network cit{d.halls.length === 1 ? 'y' : 'ies'}</em></div>
          </div>
          <button className={css.detailtoggle} onClick={() => setShowNetworkDetail(value => !value)}
            aria-expanded={showNetworkDetail}>
            {showNetworkDetail ? 'HIDE ENGINEERING DETAIL' : 'SHOW WHY'} <span>{showNetworkDetail ? '−' : '+'}</span>
          </button>
          {showNetworkDetail && <div className={css.cov}>
            {d.coverage.map(row => (
              <div className={cx(css.covrow, (row.quality === 'POOR' ? css.dark : ''))} key={row.region}>
                <div className={css.covid}>
                  <b>{row.label}</b>
                  <span>{row.isLaunchMarket ? 'Launch market' : 'Future reach'} · {people(row.viewers)} viewers · {row.cacheHit}% cached</span>
                </div>
                <div className={css.covserve}>
                  <span>{row.cityLabel}</span>
                  {row.latency === null
                    ? <em className={css.bad}>NO NETWORK</em>
                    : <em className={css[row.quality.toLowerCase()] ?? ''}>{row.quality} · {row.latency}ms</em>}
                </div>
              </div>
            ))}
          </div>}
          {d.unserved.length > 0 && (
            <div className={css.covwarn}>
              {d.unserved.map(r => regionOf(r).label).join(' and ')} {d.unserved.length === 1 ? 'has' : 'have'} no
              delivery path yet. Add one core origin to begin serving viewers.
            </div>
          )}
        </section>

        {/* ── presets — meaningless once halls are standing, since a preset
               would have to un-build them ── */}
        {!isBuilt && (
        <section className={css.bsec}>
          <div className={css.bhead}><h2>Start from</h2><span>then change anything</span></div>
          <div className={css.presets}>
            {PACKAGES.map(p => (
              <button key={p.id} className={cx(css.pre, (preset === p.id ? css.on : ''))}
                onClick={() => commit({ ...sel, placements: presetPlacements(p.id, inputs.regions, inputs.homeCityId) })}>
                <b>{p.name}</b>
                <span>{p.racks} racks · {p.cities} cit{p.cities === 1 ? 'y' : 'ies'}</span>
              </button>
            ))}
            <div className={cx(css.pre, css.custom, (preset === null ? css.on : ''))}>
              <b>Custom</b>
              <span>{d.halls.length} cit{d.halls.length === 1 ? 'y' : 'ies'} · {d.racks} racks</span>
            </div>
          </div>
        </section>
        )}

        {/* ── the halls: Y through cities, X through racks ── */}
        <section className={css.bsec}>
          <div className={css.bhead}>
            <h2>The halls</h2>
            <button className={css.addcity} onClick={() => setPicking(true)}>+ ADD CITY</button>
          </div>

          {d.halls.length === 0 ? (
            <div className={css.nohalls}>
              No racks anywhere. Pick a preset above, or place a city yourself.
            </div>
          ) : (
            <div className={css.halls}>
              {d.halls.map(h => (
                <Hall key={h.city.id} h={h}
                  canAdd={h.racks < MAX_RACKS_PER_CAMPUS}
                  builtRacks={Math.min(h.racks, builtOf(h.city.id))}
                  /* you cannot un-build a rack that is already standing */
                  onSet={n => setRacks(h.city.id, Math.max(builtOf(h.city.id), n))}
                  onRole={role => setRole(h.city.id, role)} />
              ))}
            </div>
          )}
        </section>

        {/* ── how you get paid — the other half of the same trap as the
               campaign, since a free door fills the halls for nothing ── */}
        {pricing && (
          <section className={css.bsec}>
            <div className={css.bhead}><h2>How you get paid</h2></div>
            <button className={cx(css.payrow, (pricing.sellable === 0 ? css.empty : ''))} onClick={onOpenPricing}>
              <div className={css.payid}>
                <b>{pricing.label}</b>
                <span>{pricing.sellable
                  ? `${pricing.sellable} plan${pricing.sellable === 1 ? '' : 's'} on sale`
                  : 'Nothing on sale'}</span>
              </div>
              <div className={css.paynums}>
                <em>{pricing.arpu}</em>
                <span>ARPU · reach {pricing.reach}</span>
              </div>
              <i className={css.chev}>›</i>
            </button>
            {pricing.problems > 0 && (
              <div className={css.paywarn}>
                {pricing.problems} thing{pricing.problems === 1 ? '' : 's'} wrong with your pricing.
              </div>
            )}
          </section>
        )}

        {/* ── architecture ── */}
        <section className={css.bsec}>
          <div className={css.bhead}><h2>Rent it or own it</h2></div>
          <div className={css.trio}>
            {ARCHS.map(a => (
              <button key={a.id} className={cx(css.tri, (sel.arch === a.id ? css.on : ''))} onClick={() => set('arch', a.id)}>
                <b>{a.name}</b>
                <span>{a.line}</span>
                <div className={css.trifoot}>
                  <em>{a.burst > 0 ? `+${Math.round(a.burst * 100)}% burst` : 'hard ceiling'}</em>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── doctrine ── */}
        <section className={css.bsec}>
          <div className={css.bhead}><h2>How carefully</h2></div>
          <div className={css.trio}>
            {DOCTRINES.map(x => (
              <button key={x.id} className={cx(css.tri, (sel.doctrine === x.id ? css.on : ''), (x.id === 'RUSHED' ? css.risky : ''))}
                onClick={() => set('doctrine', x.id)}>
                <b>{x.name}</b>
                <span>{x.line}</span>
                <div className={css.trifoot}><em>{x.debt > 0 ? `+${x.debt} debt` : 'no debt'}</em></div>
              </button>
            ))}
          </div>
        </section>

        {/* ── campaign — the choice that fights the servers ── */}
        <section className={css.bsec}>
          <div className={css.bhead}><h2>Who knows you exist</h2></div>
          {CAMPAIGNS.map(x => (
            <button key={x.id} className={cx(css.opt, (sel.campaign === x.id ? css.on : ''))} onClick={() => set('campaign', x.id)}>
              <i className={css.tick} />
              <div className={css.optid}>
                <b>{x.name}</b>
                <span>{x.line}</span>
              </div>
              <div className={css.optnums}>
                <em>{x.cost ? money(x.cost) : 'free'}</em>
                <span>×{x.demandMul.toFixed(2)} turnout</span>
              </div>
            </button>
          ))}
          {sel.campaign !== 'NONE' && d.racks > 0 && (
            <div className={css.tension}>
              A campaign is capacity spent in reverse. {campOf(sel.campaign).name} brings
              {' '}{conc(d.demandTotal('LIKELY'))} people at a {conc(d.ceiling)} ceiling.
            </div>
          )}
        </section>

        {last && (
          <section className={css.bsec}>
            <div className={cx(css.carry, css[last.verdict.toLowerCase()])}>
              <b>LAST REHEARSAL · {last.verdict === 'HELD' ? 'HELD' : last.verdict === 'BURST' ? 'HELD BY RENTING' : 'BROKE'}</b>
              <span>Peak {conc(last.peak)} · {last.peakLoad}% of capacity
                {last.verdict === 'BROKE'
                  ? ` · ${last.cities.filter(x => x.verdict === 'BROKE').map(x => x.label).join(', ')} failed`
                  : ''}</span>
            </div>
          </section>
        )}

        <div className={css.bldspace} />
      </div>

      <div className={css.bldfoot}>
        <button className={css.rehbtn} onClick={() => setRehearse(true)} disabled={d.over || d.racks === 0}>
          <i className={css.rbdot} />
          {last ? 'REHEARSE AGAIN' : 'REHEARSE LOAD'}
        </button>
        {isBuilt ? (
          planned > 0
            ? <button className={css.gobtn} onClick={() => setCommissioning(true)}>BUILD THE PLAN →</button>
            /* commissioned but never opened — the only thing left to do is the
               night, and without this the player would be stranded here */
            : !isLive
              ? <button className={css.gobtn} onClick={onOpenNight}>GO TO OPENING NIGHT →</button>
              : <button className={css.gobtn} onClick={onBack}>BACK TO HQ →</button>
        ) : (
          /* a failed rehearsal never blocks the launch — it only stops the button
             from pretending this is a good idea */
          <button className={cx(css.gobtn, (ready ? '' : css.off), (last?.verdict === 'BROKE' ? css.anyway : ''))}
            onClick={() => ready && beginCommissioning()}>
            {d.racks === 0 ? 'NO SERVERS'
              : pricing && pricing.sellable === 0 ? 'NOTHING ON SALE'
                : d.over ? 'OVER BUDGET'
                  : !last ? 'REHEARSE FIRST'
                  : last.verdict === 'BROKE' ? 'BUILD IT ANYWAY →'
                    : 'COMMISSION THE BUILD →'}
          </button>
        )}
      </div>

      {picking && (
        <CityPicker sel={sel} inp={inputs} d={d}
          onAdd={id => { setPicking(false); setRacks(id, 1); }}
          onClose={() => setPicking(false)} />
      )}

      {rehearse && (
        <Rehearsal brand={brand} d={d} inp={inputs} sel={sel}
          onClose={() => setRehearse(false)} onResult={r => onResult?.(r)} />
      )}

      {commissioning && (
        <Commissioning brand={brand} d={d} inp={inputs} sel={sel}
          doneLabel={commitResult?.next === 'BACK' ? 'RETURN TO HQ →' : 'TO OPENING NIGHT →'}
          onDone={() => {
            setCommissioning(false);
            if (commitResult?.next === 'BACK') onBack();
            else onLaunch?.();
          }} />
      )}
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/Buildout/Buildout.module.css */
