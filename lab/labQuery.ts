/* Shared query parsing for the dev harnesses. Not imported by the game. */
import { emptySetup, placeRegion, type RegionSetup } from '../components/studio-finance/finance/placer';
import type { BuildData, BuildDraft, BuildStageId, CloudProviderId, ServerTier } from '../components/studio-finance/finance/build';
import { createLabDraft, LAB_OPENING_MARKET_IDS } from './buildLabData';

const query = () => new URLSearchParams(window.location.search);

/** `?markets=US,NG,ZA` replaces the default set and `?markets=+NG,ZA` adds to
    it, so a region the default does not open can be designed against without
    moving the default, which the audits read. */
export function openingFromQuery(): string[] {
  const asked = query().get('markets');
  if (!asked) return LAB_OPENING_MARKET_IDS;
  const add = asked.startsWith('+');
  const given = (add ? asked.slice(1) : asked).split(',').map(code => code.trim().toUpperCase()).filter(Boolean);
  if (given.length === 0) return LAB_OPENING_MARKET_IDS;
  return add ? [...new Set([...LAB_OPENING_MARKET_IDS, ...given])] : given;
}

const STAGES: Record<string, BuildStageId> = { network: 'network', money: 'money', test: 'test', launch: 'launch' };
export const stageFromQuery = (): BuildStageId => STAGES[(query().get('stage') || '').toLowerCase()] ?? 'network';

/** `?bare=1` drops the harness chrome, for capturing a page on its own. */
export const bareFromQuery = (): boolean => query().get('bare') === '1';

const REGION_CODES: Record<string, string> = {
  NA: 'NORTH_AMERICA', SA: 'SOUTH_AMERICA', EU: 'EUROPE',
  AF: 'AFRICA', AS: 'ASIA', OC: 'OCEANIA',
};
const TIER_CODES: Record<string, ServerTier> = { S: 'SCOUT', W: 'WORKHORSE', T: 'TITAN' };

/** `?fill=NA:2T4W,EU:8W,AF:6S+c40@NORTHWIND` — per region, a count against each
    server letter and an optional `c<compute>` of cloud. */
export function fillFromQuery(): Map<string, RegionSetup> {
  const out = new Map<string, RegionSetup>();
  const asked = query().get('fill');
  if (!asked) return out;
  for (const part of asked.split(',')) {
    const [rawRegion, rawSetup] = part.split(':');
    if (!rawSetup) continue;
    const key = String(rawRegion || '').trim().toUpperCase();
    const setup = emptySetup();
    for (const [, count, letter] of rawSetup.toUpperCase().matchAll(/(\d+)\s*([SWTC])/g)) {
      if (letter === 'C') setup.cloud.compute = Number(count);
      else setup.servers[TIER_CODES[letter]] += Number(count);
    }
    const provider = rawSetup.toUpperCase().match(/@([A-Z]+)/)?.[1];
    if (provider) setup.cloud.provider = provider as CloudProviderId;
    out.set(REGION_CODES[key] ?? key, setup);
  }
  return out;
}

/** The seeded build. Parsed into the same `RegionSetup` the stepper builds and
    handed to the same `placeRegion`, so a seeded build and a clicked one are
    the same build. */
export function draftFromQuery(data: BuildData): BuildDraft {
  let draft = createLabDraft();
  for (const [regionId, setup] of fillFromQuery()) draft = placeRegion(data, draft, regionId, setup).draft;
  return draft;
}
