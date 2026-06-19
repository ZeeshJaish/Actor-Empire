# Rights Market Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent, rotating Hollywood Rights Market with fictional opportunities, scarcity, expiry, scouting, tracking, and cinematic lead sheets while preserving the existing Development Lab source-material market.

**Architecture:** Add a dedicated rights-opportunity model to `StudioState`, separate from the existing `Script[] ipMarket`. A pure `rightsMarket` domain service owns deterministic generation, normalization, cycle advancement, scouting, tracking, and featured-lead selection; React only renders and dispatches those operations. Replace the shallow Acquisitions tab in `IPManagement` with a focused `RightsMarket` game surface and verify the domain through a bundled audit script plus TypeScript/build/browser checks.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind utility classes, Motion, Lucide React, esbuild audit scripts.

---

## File Map

- Create `services/rightsMarket.ts`: rights-opportunity generation and all pure market transitions.
- Create `scripts/audit-rights-market.ts`: deterministic assertions covering generation, cycles, scouting, tracking, migration, and source-market isolation.
- Create `views/lifestyle/business/components/RightsMarket.tsx`: featured dossier, watch strip, filters, compact leads, and public lead sheet.
- Modify `types.ts`: add rights-market domain types and optional `StudioState` fields.
- Modify `services/businessLogic.ts`: initialize and normalize rights-market state without changing `ipMarket` behavior.
- Modify `views/lifestyle/business/IPManagement.tsx`: rename the Acquisitions tab, remove the shallow one-click buyout screen, and mount `RightsMarket`.
- Modify `package.json`: add the repeatable `audit:rights-market` command.

### Task 1: Add Rights-Market Domain Types

**Files:**
- Modify: `types.ts:193-330`

- [ ] **Step 1: Add the rights-market types before `StudioState`**

```ts
export type RightsPropertyType = 'CHARACTER' | 'FRANCHISE' | 'CATALOG' | 'STORY_WORLD';
export type RightsArchetype =
    | 'DORMANT_HERO'
    | 'CULT_HORROR'
    | 'FAILED_BLOCKBUSTER'
    | 'VIRAL_STORY'
    | 'STREAMING_CATALOG'
    | 'PRESTIGE_PROPERTY';
export type RightsRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';
export type RightsSignal = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type RightsMarketStatus = 'AVAILABLE' | 'EXPIRED';

export interface RightsOpportunity {
    id: string;
    title: string;
    archetype: RightsArchetype;
    propertyType: RightsPropertyType;
    primaryGenre: Genre;
    shortPitch: string;
    availabilityReason: string;
    sellerName: string;
    askingPrice: number;
    rarity: RightsRarity;
    fanbase: RightsSignal;
    publicRisk: RightsSignal;
    visibleUpside: string;
    publicConcern: string;
    rivalInterest: RightsSignal;
    listedAtWeek: number;
    expiresAtWeek: number;
    marketStatus: RightsMarketStatus;
    isTracked: boolean;
    accent: string;
    emblemKey: 'SHIELD' | 'SKULL' | 'FLAME' | 'BOOK' | 'LIBRARY' | 'AWARD';
    intelligenceSeed: number;
}

export interface RightsMarketNotice {
    id: string;
    opportunityTitle: string;
    kind: 'FINAL_WEEK' | 'EXPIRED';
    week: number;
}
```

- [ ] **Step 2: Add optional compatibility-safe fields to `StudioState`**

```ts
rightsMarket?: RightsOpportunity[];
rightsMarketCycle?: number;
lastRightsMarketAdvanceWeek?: number;
lastRightsScoutingCycle?: number;
rightsMarketNotices?: RightsMarketNotice[];
```

- [ ] **Step 3: Run TypeScript validation**

Run: `npm run lint`

Expected: PASS with no new type errors.

- [ ] **Step 4: Commit the domain types**

```bash
git add types.ts
git commit -m "Add rights market domain types"
```

### Task 2: Write the Failing Rights-Market Audit

**Files:**
- Create: `scripts/audit-rights-market.ts`
- Modify: `package.json`

- [ ] **Step 1: Create an audit that imports the planned public API**

```ts
import {
    advanceRightsMarket,
    commissionRightsScouting,
    createInitialRightsMarket,
    getFeaturedRightsOpportunity,
    normalizeRightsMarketState,
    toggleTrackedOpportunity,
} from '../services/rightsMarket';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const initial = createInitialRightsMarket({
    currentWeek: 20,
    studioId: 'studio_test',
    studioBalance: 80_000_000,
    studioPrestige: 45,
});

assert(initial.opportunities.length === 6, 'initial market must contain six leads');
assert(new Set(initial.opportunities.map(item => item.id)).size === 6, 'lead ids must be unique');
assert(new Set(initial.opportunities.map(item => item.title)).size === 6, 'lead titles must be unique');
assert(initial.opportunities.every(item => item.expiresAtWeek > 20), 'all leads must start active');

const repeated = createInitialRightsMarket({
    currentWeek: 20,
    studioId: 'studio_test',
    studioBalance: 80_000_000,
    studioPrestige: 45,
});
assert(
    JSON.stringify(initial.opportunities) === JSON.stringify(repeated.opportunities),
    'same studio and week must generate the same initial market',
);

let trackedOpportunities = toggleTrackedOpportunity(initial.opportunities, initial.opportunities[0].id).opportunities;
trackedOpportunities = toggleTrackedOpportunity(trackedOpportunities, initial.opportunities[1].id).opportunities;
trackedOpportunities = toggleTrackedOpportunity(trackedOpportunities, initial.opportunities[2].id).opportunities;
const fourthTrack = toggleTrackedOpportunity(trackedOpportunities, initial.opportunities[3].id);
assert(!fourthTrack.changed, 'fourth tracked lead must be rejected');
assert(fourthTrack.reason === 'TRACK_LIMIT', 'fourth tracked lead must explain the limit');

const advanced = advanceRightsMarket({
    opportunities: trackedOpportunities,
    notices: [],
    currentWeek: Math.max(...trackedOpportunities.map(item => item.expiresAtWeek)),
    studioId: 'studio_test',
    studioBalance: 80_000_000,
    studioPrestige: 45,
    previousCycle: initial.cycle,
});
assert(advanced.opportunities.length === 6, 'advance must refill market to six leads');
assert(advanced.notices.some(notice => notice.kind === 'EXPIRED'), 'tracked expiry must create a notice');

const scouting = commissionRightsScouting({
    opportunities: advanced.opportunities,
    currentWeek: 24,
    studioId: 'studio_test',
    studioBalance: 80_000_000,
    studioPrestige: 45,
    currentCycle: 6,
    lastScoutingCycle: -1,
});
assert(scouting.changed, 'first scouting action in a cycle must succeed');
assert(scouting.cost === 250_000, 'scouting must cost $250k');
assert(scouting.addedIds.length <= 2, 'scouting must add at most two leads');
assert(!scouting.opportunities.some(item => item.rarity === 'LEGENDARY' && scouting.addedIds.includes(item.id)), 'scouting cannot force legendary leads');

const repeatedScouting = commissionRightsScouting({
    opportunities: scouting.opportunities,
    currentWeek: 24,
    studioId: 'studio_test',
    studioBalance: 80_000_000,
    studioPrestige: 45,
    currentCycle: 6,
    lastScoutingCycle: 6,
});
assert(!repeatedScouting.changed, 'scouting must be limited to once per cycle');
assert(repeatedScouting.reason === 'ALREADY_SCOUTED', 'repeat scouting must explain its lock');

const normalized = normalizeRightsMarketState(undefined, {
    currentWeek: 20,
    studioId: 'studio_test',
    studioBalance: 80_000_000,
    studioPrestige: 45,
});
assert(normalized.opportunities.length === 6, 'old saves must initialize safely');
assert(getFeaturedRightsOpportunity(normalized.opportunities) !== undefined, 'market must select a featured lead');

console.log('Rights Market audit passed');
```

- [ ] **Step 2: Add the package script**

```json
"audit:rights-market": "esbuild scripts/audit-rights-market.ts --bundle --platform=node --format=esm --outfile=/tmp/audit-rights-market.mjs && node /tmp/audit-rights-market.mjs"
```

- [ ] **Step 3: Run the audit and verify the red state**

Run: `npm run audit:rights-market`

Expected: FAIL because `services/rightsMarket.ts` does not exist.

- [ ] **Step 4: Commit the failing audit**

```bash
git add scripts/audit-rights-market.ts package.json
git commit -m "Test rights market lifecycle"
```

### Task 3: Implement Deterministic Opportunity Generation

**Files:**
- Create: `services/rightsMarket.ts`

- [ ] **Step 1: Define constants and deterministic random helpers**

```ts
import {
    Genre,
    RightsArchetype,
    RightsMarketNotice,
    RightsOpportunity,
    RightsRarity,
} from '../types';

export const RIGHTS_MARKET_SIZE = 6;
export const RIGHTS_TRACK_LIMIT = 3;
export const RIGHTS_SCOUTING_COST = 250_000;
export const RIGHTS_MARKET_CYCLE_WEEKS = 4;

const hashString = (value: string) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const seededRandom = (seed: number) => {
    let state = seed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const pick = <T,>(items: readonly T[], random: () => number): T =>
    items[Math.floor(random() * items.length)];
```

- [ ] **Step 2: Add fictional archetype templates**

Create six template groups matching the spec. Each group must provide at least eight title fragments/combinations and three seller names so a six-card market cannot repeat titles. Templates define genre choices, price bands, fanbase, risk, upside, concern, accent, and emblem.

```ts
interface RightsTemplate {
    archetype: RightsArchetype;
    propertyType: RightsOpportunity['propertyType'];
    genres: Genre[];
    titles: string[];
    sellers: string[];
    pitches: string[];
    reasons: string[];
    upsides: string[];
    concerns: string[];
    priceRange: [number, number];
    fanbase: RightsOpportunity['fanbase'];
    risk: RightsOpportunity['publicRisk'];
    emblemKey: RightsOpportunity['emblemKey'];
    accent: string;
}
```

Use only fictional names such as `Nova Wardens`, `Deadlight House`, `Ashfall Protocol`, `Glass Kingdom`, `Laugh Track Library`, and `The Quiet Crown`. Do not add real studios, characters, books, or entertainment franchises.

- [ ] **Step 3: Implement rarity and affordability gates**

```ts
const rollRarity = (
    random: () => number,
    studioBalance: number,
    studioPrestige: number,
    allowLegendary: boolean,
): RightsRarity => {
    const roll = random();
    const legendaryEligible = allowLegendary && (studioBalance >= 500_000_000 || studioPrestige >= 70);
    if (legendaryEligible && roll < 0.04) return 'LEGENDARY';
    if (roll < 0.20) return 'RARE';
    if (roll < 0.50) return 'UNCOMMON';
    return 'COMMON';
};
```

Scale asking price by rarity while keeping at least two generated listings below 35% of the studio's available balance whenever the balance is at least $5M. This makes the board aspirational without becoming entirely unusable.

- [ ] **Step 4: Implement the public market creation API**

```ts
export interface RightsMarketContext {
    currentWeek: number;
    studioId: string;
    studioBalance: number;
    studioPrestige: number;
}

export const createInitialRightsMarket = (context: RightsMarketContext): {
    opportunities: RightsOpportunity[];
    cycle: number;
} => {
    const cycle = Math.floor(context.currentWeek / RIGHTS_MARKET_CYCLE_WEEKS);
    return {
        opportunities: generateUniqueOpportunities(RIGHTS_MARKET_SIZE, context, cycle, true),
        cycle,
    };
};
```

IDs, titles, rarity, prices, and expiry must be stable for the same `studioId`, cycle, and slot. Set expiry windows between 3 and 10 weeks and never generate expired listings.

- [ ] **Step 5: Run the audit and inspect the remaining failures**

Run: `npm run audit:rights-market`

Expected: FAIL only because lifecycle, scouting, tracking, and normalization exports are not implemented yet.

- [ ] **Step 6: Commit generation**

```bash
git add services/rightsMarket.ts
git commit -m "Generate fictional rights opportunities"
```

### Task 4: Implement Market Lifecycle, Tracking, and Scouting

**Files:**
- Modify: `services/rightsMarket.ts`

- [ ] **Step 1: Implement featured-lead selection**

```ts
const RARITY_SCORE: Record<RightsRarity, number> = {
    COMMON: 0,
    UNCOMMON: 20,
    RARE: 40,
    LEGENDARY: 65,
};

const SIGNAL_SCORE = { LOW: 0, MEDIUM: 10, HIGH: 22, EXTREME: 35 } as const;

export const getFeaturedRightsOpportunity = (opportunities: RightsOpportunity[]) =>
    [...opportunities]
        .filter(item => item.marketStatus === 'AVAILABLE')
        .sort((left, right) => {
            const leftScore = RARITY_SCORE[left.rarity] + SIGNAL_SCORE[left.rivalInterest] - left.expiresAtWeek;
            const rightScore = RARITY_SCORE[right.rarity] + SIGNAL_SCORE[right.rivalInterest] - right.expiresAtWeek;
            return rightScore - leftScore || left.title.localeCompare(right.title);
        })[0];
```

- [ ] **Step 2: Implement the three-item tracking transition**

```ts
export const toggleTrackedOpportunity = (
    opportunities: RightsOpportunity[],
    opportunityId: string,
): { opportunities: RightsOpportunity[]; changed: boolean; reason?: 'NOT_FOUND' | 'TRACK_LIMIT' } => {
    const target = opportunities.find(item => item.id === opportunityId);
    if (!target) return { opportunities, changed: false, reason: 'NOT_FOUND' };
    const trackedCount = opportunities.filter(item => item.isTracked).length;
    if (!target.isTracked && trackedCount >= RIGHTS_TRACK_LIMIT) {
        return { opportunities, changed: false, reason: 'TRACK_LIMIT' };
    }
    return {
        opportunities: opportunities.map(item => item.id === opportunityId ? { ...item, isTracked: !item.isTracked } : item),
        changed: true,
    };
};
```

- [ ] **Step 3: Implement cycle advancement and notices**

`advanceRightsMarket` must:

1. Mark listings with `expiresAtWeek <= currentWeek` as expired.
2. Create one `EXPIRED` notice for each tracked expired listing.
3. Create one `FINAL_WEEK` notice when a tracked listing first reaches one week remaining.
4. Remove expired listings from the active collection.
5. Preserve all unexpired listing objects and tracked state.
6. Fill only empty slots until the market contains six active leads.
7. Keep the newest 12 notices and avoid duplicate notice IDs.

- [ ] **Step 4: Implement once-per-cycle scouting**

`commissionRightsScouting` returns a transition result containing `changed`, `opportunities`, `addedIds`, `cost`, and a failure reason of `INSUFFICIENT_FUNDS`, `ALREADY_SCOUTED`, or `MARKET_FULL`.

Scouting must add at most two `COMMON`, `UNCOMMON`, or `RARE` listings; it must not replace tracked leads or use Legendary generation odds.

- [ ] **Step 5: Implement old-save normalization**

```ts
export const normalizeRightsMarketState = (
    state: {
        opportunities?: RightsOpportunity[];
        notices?: RightsMarketNotice[];
        cycle?: number;
        lastAdvanceWeek?: number;
        lastScoutingCycle?: number;
    } | undefined,
    context: RightsMarketContext,
) => {
    const initial = createInitialRightsMarket(context);
    const opportunities = Array.isArray(state?.opportunities)
        ? state.opportunities.filter(isValidRightsOpportunity)
        : initial.opportunities;
    const advanced = advanceRightsMarket({
        opportunities,
        notices: Array.isArray(state?.notices) ? state.notices : [],
        currentWeek: context.currentWeek,
        studioId: context.studioId,
        studioBalance: context.studioBalance,
        studioPrestige: context.studioPrestige,
        previousCycle: Number.isFinite(state?.cycle) ? Number(state?.cycle) : initial.cycle,
    });
    return {
        ...advanced,
        lastScoutingCycle: Number.isFinite(state?.lastScoutingCycle)
            ? Number(state?.lastScoutingCycle)
            : -1,
    };
};
```

Include normalized `cycle`, `lastAdvanceWeek`, and `lastScoutingCycle` in the returned state.

- [ ] **Step 6: Run the audit**

Run: `npm run audit:rights-market`

Expected: `Rights Market audit passed`.

- [ ] **Step 7: Commit lifecycle logic**

```bash
git add services/rightsMarket.ts
git commit -m "Add rights market lifecycle"
```

### Task 5: Integrate Safe Save Defaults and Migration

**Files:**
- Modify: `services/businessLogic.ts:579-680`
- Modify: `scripts/audit-rights-market.ts`

- [ ] **Step 1: Initialize new studios with safe empty rights-market fields**

`createDefaultStudioState` does not receive the real studio id, so it must not
generate listings with a fake shared seed. Add safe empty fields and let the
Rights Market screen initialize them once it has the actual studio context:

```ts
rightsMarket: [],
rightsMarketCycle: Math.floor(currentWeek / RIGHTS_MARKET_CYCLE_WEEKS),
lastRightsMarketAdvanceWeek: currentWeek,
lastRightsScoutingCycle: -1,
rightsMarketNotices: [],
```

Do not remove or rename `ipMarket`, `lastMarketRefreshWeek`, or `purchasedIPTitles`.

- [ ] **Step 2: Normalize optional old-save fields without render-time mutation**

Inside `normalizeStudioState`, preserve valid stored rights data or an empty
array. Market generation belongs to the Rights Market component because it has
the real studio id, balance, and prestige:

```ts
rightsMarket: Array.isArray(studioState?.rightsMarket) ? studioState.rightsMarket : [],
rightsMarketCycle: typeof studioState?.rightsMarketCycle === 'number'
    ? studioState.rightsMarketCycle
    : Math.floor(currentWeek / RIGHTS_MARKET_CYCLE_WEEKS),
lastRightsMarketAdvanceWeek: typeof studioState?.lastRightsMarketAdvanceWeek === 'number'
    ? studioState.lastRightsMarketAdvanceWeek
    : currentWeek,
lastRightsScoutingCycle: typeof studioState?.lastRightsScoutingCycle === 'number'
    ? studioState.lastRightsScoutingCycle
    : -1,
rightsMarketNotices: Array.isArray(studioState?.rightsMarketNotices)
    ? studioState.rightsMarketNotices
    : [],
```

- [ ] **Step 3: Extend the audit with source-market isolation checks**

```ts
const sourceMarketSentinel = [{ id: 'script_market_sentinel', title: 'Do Not Replace' }];
const studioStateLike = {
    ipMarket: sourceMarketSentinel,
    rightsMarket: initial.opportunities,
};
assert(studioStateLike.ipMarket === sourceMarketSentinel, 'rights transitions must not replace source-material market data');
```

Also import and call `normalizeStudioState` with an old save containing one
script in `ipMarket`; assert the same script id remains afterward and the safe
rights-market fields are present. Then call `normalizeRightsMarketState` with
the real test studio id and assert six opportunities are generated.

- [ ] **Step 4: Run focused and type checks**

Run: `npm run audit:rights-market && npm run lint`

Expected: audit prints its pass message and TypeScript exits successfully.

- [ ] **Step 5: Commit migration support**

```bash
git add services/businessLogic.ts scripts/audit-rights-market.ts
git commit -m "Migrate saves for rights market"
```

### Task 6: Build the Rights Market Game Surface

**Files:**
- Create: `views/lifestyle/business/components/RightsMarket.tsx`

- [ ] **Step 1: Add the component contract and local UI state**

```tsx
interface RightsMarketProps {
    player: Player;
    studio: Business;
    onUpdatePlayer: (player: Player) => void;
}

type RightsFilter = 'ALL' | 'AFFORDABLE' | 'HIGH_INTEREST' | 'EXPIRING' | 'TRACKED';

export const RightsMarket: React.FC<RightsMarketProps> = ({ player, studio, onUpdatePlayer }) => {
    const [filter, setFilter] = useState<RightsFilter>('ALL');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const studioState = normalizeStudioState(studio.studioState, player.currentWeek);
    // Derive the normalized market through useMemo. Persist only from user actions
    // or the guarded market-advance effect, never during render.
};
```

- [ ] **Step 2: Add one guarded market-advance effect**

Use `useMemo` to calculate `advanceRightsMarket` from current save data. Use an effect that compares serialized ids/status/cycle/notices with saved values and calls `onUpdatePlayer` only when the transition changes persisted market state. Include only primitive comparison keys in dependencies to avoid loops.

The update must replace only the matching production-house business and preserve all unrelated player and studio fields.

- [ ] **Step 3: Implement update actions**

Add handlers:

```tsx
const updateRightsState = (updates: Partial<StudioState>, logMessage?: string) => {
    const updatedStudio: Business = {
        ...studio,
        studioState: { ...studioState, ...updates },
    };
    onUpdatePlayer({
        ...player,
        businesses: player.businesses.map(business => business.id === studio.id ? updatedStudio : business),
        logs: logMessage
            ? [...player.logs, { week: player.currentWeek, year: player.age, message: logMessage, type: 'neutral' }].slice(-80)
            : player.logs,
    });
};
```

`handleToggleTrack` uses `toggleTrackedOpportunity`. If the track limit is reached, show an inline notice: `Your intelligence desk can track only 3 active opportunities.`

`handleCommissionScouting` uses `commissionRightsScouting`, subtracts exactly `$250,000` only on success, persists `lastRightsScoutingCycle`, and logs `Your studio commissioned new rights-market scouting.`

- [ ] **Step 4: Build the compact intelligence header**

Header contents:

- eyebrow: `Industry Intelligence`
- title: `Rights Market`
- current studio funds
- next natural cycle in 1-4 weeks
- `Commission Scouting` button with cost or locked-cycle explanation

Use a dark `#050505` base, zinc borders, amber ownership accent, and no oversized marketing hero.

- [ ] **Step 5: Build the tracked watch strip**

Render only when at least one listing is tracked. Each compact item shows title, weeks left, and rival signal. Keep the strip horizontally scrollable on mobile and do not nest it inside another card.

- [ ] **Step 6: Build the featured dossier**

The featured opportunity uses:

- a narrow file-tab eyebrow with rarity
- emblem selected through a local Lucide icon map
- title, archetype, genre
- short pitch
- one upside and one concern
- price, weeks remaining, rival pressure
- `Track` or `Untrack` icon+text command
- `Open Lead` primary command

Use restrained Motion entrance on cycle change and a single red border/pulse only when one week remains. Respect `prefers-reduced-motion` through Motion's reduced-motion support.

- [ ] **Step 7: Build filters and compact opportunity rows**

Filter behavior:

```ts
const visible = opportunities.filter(item => {
    if (item.id === featured?.id) return false;
    if (filter === 'AFFORDABLE') return item.askingPrice <= studio.balance;
    if (filter === 'HIGH_INTEREST') return item.rivalInterest === 'HIGH' || item.rivalInterest === 'EXTREME';
    if (filter === 'EXPIRING') return item.expiresAtWeek - player.currentWeek <= 2;
    if (filter === 'TRACKED') return item.isTracked;
    return true;
});
```

Rows show only title, archetype, genre, price, one signal, rival interest, expiry, and tracking state. Do not display unrevealed intelligence as real values.

- [ ] **Step 8: Build the public lead sheet**

Open it from `selectedLeadId` as:

- full-screen fixed surface on mobile
- centered overlay on desktop
- off-white paper interior with dark typography
- seller, asking price, public reason, upside, concern, expiry, rival interest
- close icon and track action
- footer text: `Deeper investigation and deal actions are not yet available.`

While open, lock body/background scrolling and stop click/touch propagation so the page behind it cannot scroll.

- [ ] **Step 9: Run checks**

Run: `npm run lint && npm run build`

Expected: both commands pass.

- [ ] **Step 10: Commit the game surface**

```bash
git add views/lifestyle/business/components/RightsMarket.tsx
git commit -m "Build cinematic rights market"
```

### Task 7: Replace the Shallow Acquisitions Screen

**Files:**
- Modify: `views/lifestyle/business/IPManagement.tsx:1-520`

- [ ] **Step 1: Remove obsolete marketplace imports and component**

Remove `generateIPMarket`, the old `FranchiseMarketplace`, and imports used only by that component. Do not alter `UniverseManager` or `FranchiseManager` behavior.

- [ ] **Step 2: Rename the tab and mount the dedicated component**

```tsx
import { RightsMarket } from './components/RightsMarket';

type IPTab = 'UNIVERSES' | 'FRANCHISES' | 'RIGHTS_MARKET';

// Tab definition
{ id: 'RIGHTS_MARKET', label: 'Rights Market', icon: <Crosshair size={14} /> }

// Content
{activeTab === 'RIGHTS_MARKET' && (
    <RightsMarket player={player} studio={studio} onUpdatePlayer={onUpdatePlayer} />
)}
```

Update the parent subtitle to: `Build worlds, manage franchises, and watch the industry's most valuable rights.`

- [ ] **Step 3: Make the outer layout compatible with the immersive surface**

Keep the existing header/tabs for Universes and Franchises. When `RIGHTS_MARKET` is active, reduce duplicate outer padding so the market component controls its own mobile and desktop spacing. Do not introduce a second fixed header.

- [ ] **Step 4: Verify Development Lab isolation by static search**

Run:

```bash
rg -n "generateIPMarket|ipMarket|purchasedIPTitles" views/lifestyle/business/DevelopmentLab.tsx services/businessLogic.ts
```

Expected: existing source-material generation, purchasing, and refresh references remain present.

- [ ] **Step 5: Run all focused checks**

Run: `npm run audit:rights-market && npm run lint && npm run build`

Expected: audit passes, TypeScript passes, and Vite creates the production build.

- [ ] **Step 6: Commit integration**

```bash
git add views/lifestyle/business/IPManagement.tsx
git commit -m "Integrate rights market into studio"
```

### Task 8: Browser Playtest and Responsive Polish

**Files:**
- Modify: `views/lifestyle/business/components/RightsMarket.tsx`
- Modify: `views/lifestyle/business/IPManagement.tsx`

- [ ] **Step 1: Start the local game server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a local URL, normally `http://127.0.0.1:3000/`.

- [ ] **Step 2: Open Production House > IP & Universes > Rights Market at 393x852**

Verify:

- featured dossier is the strongest focal point
- title, price, expiry, and commands fit without overlap
- tracked strip scrolls independently
- filter labels fit and remain tappable
- compact rows do not create horizontal overflow
- bottom safe area remains reachable

- [ ] **Step 3: Exercise the market interactions**

Verify:

- tracking adds a visible stamp/watch item
- fourth tracked lead produces the capacity explanation
- untracking frees capacity
- scouting deducts exactly $250,000 once
- repeated scouting shows the cycle lock and deducts nothing
- lead sheet opens and closes
- the background cannot scroll while the lead sheet is open

- [ ] **Step 4: Verify desktop at 1440x900**

Confirm the featured lead uses the wider layout, remaining leads form two balanced columns, and the public lead sheet is centered without filling the entire desktop.

- [ ] **Step 5: Verify old and adjacent flows**

Open Development Lab > Market and confirm existing source-material cards still allow acquisition. Open Universe and Franchise tabs and confirm their existing data and actions remain available.

- [ ] **Step 6: Run final verification**

Run: `npm run audit:rights-market && npm run lint && npm run build`

Expected: all three commands pass after any responsive fixes.

- [ ] **Step 7: Commit polish**

```bash
git add views/lifestyle/business/components/RightsMarket.tsx views/lifestyle/business/IPManagement.tsx
git commit -m "Polish rights market experience"
```

## Completion Criteria

- Rights Market is visually and mechanically distinct from Development Lab's source-material market.
- Six persistent fictional opportunities appear without rerender changes.
- Expiry, four-week replenishment, scarcity, and featured selection behave deterministically.
- Scouting is limited, costs the correct amount, and cannot be exploited for Legendary leads.
- Tracking is useful, limited to three, and produces final-week/expiry feedback.
- Public lead sheets feel complete without exposing unfinished negotiation controls.
- Old saves initialize safely and existing scripts, universes, franchises, and purchases remain intact.
- Audit, TypeScript, production build, and mobile/desktop browser playtests pass.
