# Cinema Chain Brand System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all six cinema chains Netflix/Prime-style vector identities and render those identities consistently across Theatrical Desk and Box Office surfaces.

**Architecture:** Extract a domain-neutral brand presentation foundation from the existing streaming-platform renderer, retain `StreamingPlatformBrand` as a compatibility wrapper, and add a cinema-specific registry, SVG mark library, and wrapper component. Cinema economics, localized names, IDs, selection behavior, and save data remain owned by their current systems.

**Tech Stack:** React 19, TypeScript, CSS, inline SVG, Vite, esbuild audit scripts, React DOM server rendering, Playwright/Chromium browser verification.

**Spec:** `docs/superpowers/specs/2026-09-16-cinema-chain-brand-system-design.md`

## Global Constraints

- Keep the six existing `CinemaChainId` values and localized names unchanged.
- Do not change chain economics, regional availability, contracts, selection rules, or saved data.
- Final marks must be code-native SVG; do not add generated bitmap or externally hosted logo assets.
- Preserve the public behavior and appearance of `StreamingPlatformBrand` for existing Netflix, Prime Video, Disney+, and other platform call sites.
- Support `MARK`, `WORDMARK`, and `LOCKUP` variants at `XS`, `SM`, and `MD` sizes.
- Unknown chain IDs must render a deterministic monogram and readable name rather than an empty mark.
- Selection must remain understandable without colour alone and must preserve `aria-pressed` on partner buttons.
- Verify at 393 x 600 and 393 x 852 before claiming visual completion.
- Preserve unrelated dirty-worktree changes. Do not stage or commit unless the user explicitly authorizes it; commit commands below are documented checkpoints only.

---

## File Structure

### New files

- `services/brandPresentation.ts` — shared colour normalization, contrast, and CSS-variable helpers.
- `components/brand/BrandIdentity.tsx` — shared mark/wordmark/lockup composition.
- `styles/brand-identity.css` — shared sizes, typography layout, and signal-strip styles.
- `components/brand/CinemaChainBrandMarks.tsx` — six cinema SVG marks plus deterministic fallback glyph.
- `services/cinemaChainBrandRegistry.ts` — fixed cinema brand definitions and resolver.
- `components/CinemaChainBrand.tsx` — cinema-facing wrapper around `BrandIdentity`.
- `scripts/audit-brand-presentation.tsx` — shared model and streaming-regression audit.
- `scripts/audit-cinema-chain-brand.tsx` — six-chain registry and rendered-mark audit.

### Modified files

- `types.ts` — shared brand presentation and cinema presentation contracts.
- `services/streamingPlatformBrandRegistry.ts` — delegate generic colour logic while retaining compatibility exports.
- `components/StreamingPlatformBrand.tsx` — delegate composition to `BrandIdentity`.
- `views/lifestyle/business/components/CinemaChainLogo.tsx` — compatibility wrapper around `CinemaChainBrand`.
- `views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx` — replace dots with chain marks/lockups.
- `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css` — size and align chain identities in mobile cards and summaries.
- `views/mobile/BoxOfficeApp.tsx` — consume the canonical cinema brand component.
- `scripts/audit-cinema-chain-ui.mjs` — assert canonical branding is used in current cinema UI.
- `scripts/audit-release-wizard-transplant-browser.cjs` — verify marks, lockups, state, and mobile overflow in the real desk fixture.
- `scripts/fixtures/release-wizard-transplant.tsx` — expose all six partner identities in the desk fixture.
- `package.json` — add focused audit commands.

---

### Task 1: Shared Brand Presentation Contract and Colour Utilities

**Files:**
- Create: `services/brandPresentation.ts`
- Modify: `types.ts:216-247`
- Modify: `services/streamingPlatformBrandRegistry.ts:1-76,240-330`
- Create/Test: `scripts/audit-brand-presentation.tsx`
- Modify: `package.json:342-347`

**Interfaces:**
- Consumes: current `StreamingPlatformBrandPresentation`, `StreamingTypefaceId`, and `StreamingWordmarkStyleId` contracts.
- Produces: `BrandIdentityPresentation`, `BrandIdentityMarkKind`, `normalizeBrandHex(value, fallback)`, `getReadableBrandInk(background)`, `brandHslToHex(hue, saturation, lightness)`, and `getBrandIdentityCssVars(brand, prefix)`.

- [ ] **Step 1: Write the failing shared-presentation audit**

Create `scripts/audit-brand-presentation.tsx` with exact assertions for normalization, contrast, streaming compatibility, and CSS variables:

```tsx
import assert from 'node:assert/strict';
import {
  brandHslToHex,
  getBrandIdentityCssVars,
  getReadableBrandInk,
  normalizeBrandHex,
} from '../services/brandPresentation';
import {
  getReadableStreamingBrandInk,
  normalizeStreamingBrandHex,
  resolveStreamingPlatformBrandById,
} from '../services/streamingPlatformBrandRegistry';

assert.equal(normalizeBrandHex('#e50914', '#000000'), '#E50914');
assert.equal(normalizeBrandHex('invalid', '#123456'), '#123456');
assert.equal(getReadableBrandInk('#FFFFFF'), '#07090D');
assert.equal(getReadableBrandInk('#050505'), '#FFFFFF');
assert.equal(brandHslToHex(0, 100, 50), '#FF0000');
assert.equal(normalizeStreamingBrandHex('#e50914', '#000000'), '#E50914');
assert.equal(getReadableStreamingBrandInk('#FFFFFF'), '#07090D');

const netflix = resolveStreamingPlatformBrandById('NETFLIX');
assert.equal(netflix.primaryColor, '#E50914');
assert.equal(netflix.markKey, 'NETFLIX_N');
assert.equal(netflix.lockupId, 'SIDE');
assert.deepEqual(getBrandIdentityCssVars(netflix, 'platform-brand'), {
  '--platform-brand-primary': '#E50914',
  '--platform-brand-secondary': '#B20710',
  '--platform-brand-surface': '#0A0B0E',
  '--platform-brand-on-primary': '#FFFFFF',
  '--platform-brand-on-surface': '#FFFFFF',
});

console.log('Shared brand presentation audit passed.');
```

- [ ] **Step 2: Add the failing audit command and run it**

Add:

```json
"audit:brand-presentation": "esbuild scripts/audit-brand-presentation.tsx --bundle --platform=node --format=esm --loader:.css=text --outfile=/tmp/audit-brand-presentation.mjs && node /tmp/audit-brand-presentation.mjs"
```

Run: `npm run audit:brand-presentation`

Expected: FAIL because `services/brandPresentation.ts` and the shared types do not exist.

- [ ] **Step 3: Add the shared presentation types**

In `types.ts`, introduce the domain-neutral contract and keep the streaming type source-compatible:

```ts
export type BrandIdentityMarkKind = 'LOCAL_ASSET' | 'VECTOR_MARK' | 'WORDMARK' | 'MONOGRAM';
export type StreamingPlatformBrandMarkKind = BrandIdentityMarkKind;

export interface BrandIdentityPresentation {
    displayName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColors: string[];
    surfaceColor: string;
    onPrimaryColor: string;
    onSurfaceColor: string;
    markKind: BrandIdentityMarkKind;
    markKey: string;
    typefaceId: StreamingTypefaceId;
    lockupId: StreamingWordmarkStyleId;
}

export interface StreamingPlatformBrandPresentation extends BrandIdentityPresentation {
    platformId: string;
}
```

- [ ] **Step 4: Implement shared colour and CSS-variable helpers**

Create `services/brandPresentation.ts`:

```ts
import type { BrandIdentityPresentation } from '../types';

const HEX = /^#[0-9A-F]{6}$/;

export const normalizeBrandHex = (value: string, fallback: string): string => {
  const normalized = String(value || '').trim().toUpperCase();
  return HEX.test(normalized) ? normalized : fallback;
};

const channel = (hex: string, offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16);
const linear = (value: number) => {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const color = normalizeBrandHex(hex, '#000000');
  return 0.2126 * linear(channel(color, 1))
    + 0.7152 * linear(channel(color, 3))
    + 0.0722 * linear(channel(color, 5));
};
const contrast = (left: string, right: string) => {
  const a = luminance(left), b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

export const getReadableBrandInk = (background: string): string => (
  contrast(background, '#07090D') >= contrast(background, '#FFFFFF') ? '#07090D' : '#FFFFFF'
);

export const brandHslToHex = (hue: number, saturation: number, lightness: number): string => {
  const s = saturation / 100, l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs(sector % 2 - 1));
  const [r, g, b] = sector < 1 ? [chroma, x, 0]
    : sector < 2 ? [x, chroma, 0]
    : sector < 3 ? [0, chroma, x]
    : sector < 4 ? [0, x, chroma]
    : sector < 5 ? [x, 0, chroma]
    : [chroma, 0, x];
  const match = l - chroma / 2;
  const hex = (value: number) => Math.round((value + match) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
};

export const getBrandIdentityCssVars = (
  brand: BrandIdentityPresentation,
  prefix = 'brand-identity',
): Record<string, string> => ({
  [`--${prefix}-primary`]: brand.primaryColor,
  [`--${prefix}-secondary`]: brand.secondaryColor,
  [`--${prefix}-surface`]: brand.surfaceColor,
  [`--${prefix}-on-primary`]: brand.onPrimaryColor,
  [`--${prefix}-on-surface`]: brand.onSurfaceColor,
});
```

- [ ] **Step 5: Preserve streaming compatibility exports**

Replace the duplicated normalization/contrast code in `services/streamingPlatformBrandRegistry.ts` with imports and aliases:

```ts
import {
  getBrandIdentityCssVars,
  getReadableBrandInk,
  normalizeBrandHex,
  brandHslToHex,
} from './brandPresentation';

export const normalizeStreamingBrandHex = normalizeBrandHex;
export const getReadableStreamingBrandInk = getReadableBrandInk;
export const streamingBrandHslToHex = brandHslToHex;

export const getStreamingPlatformBrandCssVars = (
  brand: StreamingPlatformBrandPresentation,
): Record<string, string> => getBrandIdentityCssVars(brand, 'platform-brand');
```

Keep all existing real-platform registry entries and resolver behavior unchanged.

- [ ] **Step 6: Run the focused and existing streaming audits**

Run: `npm run audit:brand-presentation`

Expected: PASS with `Shared brand presentation audit passed.`

Run: `npm run audit:streaming-platform-branding`

Expected: PASS with the existing streaming platform branding success message.

- [ ] **Step 7: Commit checkpoint if explicitly authorized**

```bash
git add types.ts services/brandPresentation.ts services/streamingPlatformBrandRegistry.ts scripts/audit-brand-presentation.tsx package.json
git commit -m "refactor: share brand presentation primitives"
```

---

### Task 2: Shared Brand Renderer Without Streaming Visual Regression

**Files:**
- Create: `components/brand/BrandIdentity.tsx`
- Create: `styles/brand-identity.css`
- Modify: `components/StreamingPlatformBrand.tsx:1-91`
- Modify/Test: `scripts/audit-brand-presentation.tsx`

**Interfaces:**
- Consumes: `BrandIdentityPresentation`, `getBrandIdentityCssVars`, and a caller-provided SVG `mark` node.
- Produces: `BrandIdentity`, `BrandIdentityVariant`, and `BrandIdentitySize`; `StreamingPlatformBrand` keeps its current props and default export.

- [ ] **Step 1: Extend the audit with failing renderer assertions**

Add to `scripts/audit-brand-presentation.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingPlatformBrand from '../components/StreamingPlatformBrand';

const netflixMarkup = renderToStaticMarkup(
  <StreamingPlatformBrand brand={netflix} variant="LOCKUP" size="SM" />,
);
assert.match(netflixMarkup, /data-platform-brand="NETFLIX"/);
assert.match(netflixMarkup, /brand-identity--lockup/);
assert.match(netflixMarkup, /Netflix/);
assert.match(netflixMarkup, /data-platform-mark="NETFLIX_N"/);
```

Run: `npm run audit:brand-presentation`

Expected: FAIL because the current component does not render the shared `brand-identity` structure.

- [ ] **Step 2: Create the shared renderer**

Create `components/brand/BrandIdentity.tsx` with these exact public contracts:

```tsx
import React from 'react';
import type { BrandIdentityPresentation, StreamingTypefaceId } from '../../types';
import { getBrandIdentityCssVars } from '../../services/brandPresentation';
import '../../styles/brand-identity.css';

export type BrandIdentityVariant = 'MARK' | 'WORDMARK' | 'LOCKUP';
export type BrandIdentitySize = 'XS' | 'SM' | 'MD';

export interface BrandIdentityProps {
  brand: BrandIdentityPresentation;
  identityId: string;
  variant?: BrandIdentityVariant;
  size?: BrandIdentitySize;
  mark: React.ReactNode;
  className?: string;
  decorative?: boolean;
  dataAttribute?: 'data-platform-brand' | 'data-cinema-chain-brand';
}
```

Move the current `TYPEFACE_STYLE` table and mark/wordmark/lockup composition from `StreamingPlatformBrand.tsx` into this component. Use generic `brand-identity` class names, `--brand-identity-*` CSS variables, `role="img"` plus `aria-label={brand.displayName}` for non-decorative instances, and `aria-hidden` for decorative instances. Spread `{ [dataAttribute]: identityId }` only when a data attribute is supplied.

- [ ] **Step 3: Create shared styles**

Create `styles/brand-identity.css` by translating the current streaming selectors one-for-one:

```css
.brand-identity { --brand-identity-mark-size:1.375rem; align-items:center; color:var(--brand-identity-primary); display:inline-flex; gap:.42rem; line-height:1; max-width:100%; min-width:0; vertical-align:middle }
.brand-identity--xs { --brand-identity-mark-size:1rem; gap:.3rem }
.brand-identity--md { --brand-identity-mark-size:2rem; gap:.56rem }
.brand-identity--stacked { align-items:flex-start; flex-direction:column; gap:.3rem }
.brand-identity__mark { color:var(--brand-identity-primary); display:inline-grid; flex:0 0 var(--brand-identity-mark-size); height:var(--brand-identity-mark-size); place-items:center; width:var(--brand-identity-mark-size) }
.brand-identity__mark>img,.brand-identity__mark>svg { display:block; height:100%; max-width:100%; object-fit:contain; width:100% }
.brand-identity__wordmark-wrap { display:inline-flex; flex-direction:column; min-width:0 }
.brand-identity__wordmark { color:var(--brand-identity-primary); display:block; font-size:.82rem; line-height:1.02; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.brand-identity--xs .brand-identity__wordmark { font-size:.68rem }
.brand-identity--md .brand-identity__wordmark { font-size:1rem }
.brand-identity__signal { display:flex; height:2px; margin-top:.16rem; max-width:3.2rem; min-width:1.4rem; overflow:hidden }
.brand-identity__signal>i { display:block; flex:1 1 0; min-width:.3rem }
@media (prefers-reduced-motion:reduce){.brand-identity,.brand-identity *{transition:none!important}}
```

- [ ] **Step 4: Convert `StreamingPlatformBrand` into a compatibility wrapper**

Keep its existing prop names and default export. Preserve local-asset fallback logic, then render:

```tsx
return (
  <BrandIdentity
    brand={brand}
    identityId={brand.platformId}
    variant={variant}
    size={size}
    className={className}
    decorative={decorative}
    dataAttribute="data-platform-brand"
    mark={assetPath
      ? <img src={assetPath} alt="" />
      : <StreamingBrandMarkGlyph name={brand.displayName} markId={markKey} />}
  />
);
```

For a missing local asset, pass a copy of the brand with `markKind: 'WORDMARK'` so the shared renderer preserves the current wordmark fallback.

- [ ] **Step 5: Run focused audit and production build**

Run: `npm run audit:brand-presentation`

Expected: PASS.

Run: `npm run build`

Expected: Vite production build exits 0 with no TypeScript/esbuild errors.

- [ ] **Step 6: Commit checkpoint if explicitly authorized**

```bash
git add components/brand/BrandIdentity.tsx styles/brand-identity.css components/StreamingPlatformBrand.tsx scripts/audit-brand-presentation.tsx
git commit -m "refactor: extract reusable brand identity renderer"
```

---

### Task 3: Six Cinema Brand Definitions, SVG Marks, and Fallback

**Files:**
- Create: `components/brand/CinemaChainBrandMarks.tsx`
- Create: `services/cinemaChainBrandRegistry.ts`
- Create: `components/CinemaChainBrand.tsx`
- Modify: `types.ts:1124-1190`
- Modify: `views/lifestyle/business/components/CinemaChainLogo.tsx:1-124`
- Create/Test: `scripts/audit-cinema-chain-brand.tsx`
- Modify: `package.json:342-347`

**Interfaces:**
- Consumes: `BrandIdentity`, `CinemaChainId`, existing localized names from `getCinemaChainName`, and shared colour helpers.
- Produces: `CinemaChainBrandPresentation`, `resolveCinemaChainBrandById(chainId, displayName?, language?)`, `CinemaChainBrandGlyph`, and `CinemaChainBrand`.

- [ ] **Step 1: Write the failing six-chain audit**

Create `scripts/audit-cinema-chain-brand.tsx`:

```tsx
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CinemaChainBrand from '../components/CinemaChainBrand';
import { CINEMA_CHAIN_BRANDS, resolveCinemaChainBrandById } from '../services/cinemaChainBrandRegistry';

const ids = ['EMPIRE_CINEMAS','Z_CINEMAS','NOVA_CIRCUIT','PRISM_HALLS','ARCLIGHT_GRID','CROWNSCREEN'];
assert.deepEqual(Object.keys(CINEMA_CHAIN_BRANDS).sort(), ids.slice().sort());
assert.equal(new Set(Object.values(CINEMA_CHAIN_BRANDS).map(brand => brand.markKey)).size, 6);

for (const id of ids) {
  const brand = resolveCinemaChainBrandById(id);
  assert.equal(brand.chainId, id);
  assert.match(brand.primaryColor, /^#[0-9A-F]{6}$/);
  const markup = renderToStaticMarkup(<CinemaChainBrand chainId={id} variant="LOCKUP" size="SM" />);
  assert.match(markup, new RegExp(`data-cinema-chain-brand="${id}"`));
  assert.match(markup, new RegExp(`data-cinema-chain-mark="${brand.markKey}"`));
  assert.match(markup, new RegExp(brand.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(markup, /<img/);
}

const fallback = resolveCinemaChainBrandById('FUTURE_CHAIN', 'Future Chain');
assert.equal(fallback.markKind, 'MONOGRAM');
assert.equal(fallback.displayName, 'Future Chain');
assert.match(renderToStaticMarkup(<CinemaChainBrand chainId="FUTURE_CHAIN" displayName="Future Chain" />), /Future Chain/);

console.log('Cinema chain brand audit passed.');
```

- [ ] **Step 2: Register and run the failing audit**

Add:

```json
"audit:cinema-chain-brand": "esbuild scripts/audit-cinema-chain-brand.tsx --bundle --platform=node --format=esm --loader:.css=text --outfile=/tmp/audit-cinema-chain-brand.mjs && node /tmp/audit-cinema-chain-brand.mjs"
```

Run: `npm run audit:cinema-chain-brand`

Expected: FAIL because the cinema registry and component do not exist.

- [ ] **Step 3: Add the cinema presentation contract**

In `types.ts` next to `CinemaChain`, add:

```ts
export interface CinemaChainBrandPresentation extends BrandIdentityPresentation {
    chainId: string;
}
```

The `string` allows deterministic visual fallback for future or legacy IDs; gameplay APIs continue to use the strict `CinemaChainId` union.

- [ ] **Step 4: Implement the six SVG mark primitives**

Create `components/brand/CinemaChainBrandMarks.tsx`. Move and refine the existing code-native paths from `CinemaChainLogo.tsx` into keys with unique silhouettes:

```tsx
import React from 'react';

export const CINEMA_CHAIN_MARKS: Readonly<Record<string, React.ReactNode>> = Object.freeze({
  EMPIRE_GATE: <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 39h34"/><path d="M11 36V22L24 10l13 12v14"/><path d="M17 36V25h14v11"/><path d="M18 15 24 6l6 9-6-2z" fill="currentColor" stroke="none"/><path d="M15 21h18"/></g>,
  Z_TICKET: <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 9h29L22 25h16L9 40l11-15H8z" fill="currentColor" fillOpacity=".16"/><path d="M10 9h29L22 25h16L9 40l11-15H8z" fill="none"/><path d="m35 8-5 10M18 31l-5 10" fill="none" opacity=".65"/></g>,
  NOVA_ORBIT: <g fill="none" stroke="currentColor" strokeWidth="3"><circle cx="24" cy="24" r="10"/><ellipse cx="24" cy="24" rx="19" ry="7" transform="rotate(-20 24 24)"/><ellipse cx="24" cy="24" rx="19" ry="7" transform="rotate(20 24 24)" opacity=".45"/><circle cx="24" cy="24" r="3.5" fill="currentColor" stroke="none"/><circle cx="36" cy="15" r="2" fill="currentColor" stroke="none"/></g>,
  PRISM_BEAM: <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"><path d="M8 37 21 8l12 29z"/><path d="M21 8v29M8 37h25" opacity=".72"/><path d="m25 17 17 6-17 8z" fill="currentColor" fillOpacity=".16"/><path d="m26 20 16 3-16 5" opacity=".7"/></g>,
  ARCLIGHT_GRID: <g fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"><path d="M7 35a17 17 0 0 1 34 0"/><path d="M13 35a11 11 0 0 1 22 0"/><path d="M24 18v17M9 39h30M12 30h24M16 24h16"/><path d="M8 14h32M14 9v30M34 9v30" opacity=".35"/></g>,
  CROWNSCREEN_SPLIT: <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="9" width="34" height="29" rx="6"/><path d="m11 29 3-13 8 7 2-10 2 10 8-7 3 13z" fill="currentColor" fillOpacity=".17"/><path d="m11 29 3-13 8 7 2-10 2 10 8-7 3 13z"/><path d="M16 33h16"/></g>,
});
```

Export `CinemaChainBrandGlyph({ name, markKey })`, rendering a `viewBox="0 0 48 48"` SVG with `currentColor`, `data-cinema-chain-mark={markKey}`, and a `LETTER_OUTLINE` monogram fallback. Do not use `<img>` or data URLs.

- [ ] **Step 5: Implement the cinema brand registry**

Create `services/cinemaChainBrandRegistry.ts` with these identity values:

```ts
const INPUTS = {
  EMPIRE_CINEMAS: { primaryColor:'#F6C85F', secondaryColor:'#A97822', surfaceColor:'#171107', markKey:'EMPIRE_GATE', typefaceId:'SERIF', lockupId:'SIDE' },
  Z_CINEMAS: { primaryColor:'#44D7FF', secondaryColor:'#146EB4', surfaceColor:'#07131A', markKey:'Z_TICKET', typefaceId:'CONDENSED', lockupId:'SIDE' },
  NOVA_CIRCUIT: { primaryColor:'#7CFFE2', secondaryColor:'#18A88B', surfaceColor:'#061815', markKey:'NOVA_ORBIT', typefaceId:'GEOMETRIC', lockupId:'SIDE' },
  PRISM_HALLS: { primaryColor:'#FF7AD9', secondaryColor:'#8B3DFF', surfaceColor:'#1A0817', markKey:'PRISM_BEAM', typefaceId:'GEOMETRIC', lockupId:'SIDE' },
  ARCLIGHT_GRID: { primaryColor:'#BBA5FF', secondaryColor:'#6650B8', surfaceColor:'#100D1A', markKey:'ARCLIGHT_GRID', typefaceId:'MONO', lockupId:'SIDE' },
  CROWNSCREEN: { primaryColor:'#76FF8A', secondaryColor:'#2D8F4E', surfaceColor:'#07150A', markKey:'CROWNSCREEN_SPLIT', typefaceId:'SLAB', lockupId:'SIDE' },
} as const;
```

Build known entries with localized names from `getCinemaChainName(language, id)`, `markKind: 'VECTOR_MARK'`, distinct accent arrays, and readable inks. For unknown IDs, hash `chainId + displayName` into stable primary/secondary colours using the shared `brandHslToHex` helper and return `markKind: 'MONOGRAM'`, `markKey: 'LETTER_OUTLINE'`, `typefaceId: 'GROTESK'`, and `lockupId: 'SIDE'`.

- [ ] **Step 6: Implement `CinemaChainBrand` and compatibility wrapper**

Create `components/CinemaChainBrand.tsx`:

```tsx
export interface CinemaChainBrandProps {
  chainId: string;
  displayName?: string;
  language?: GameLanguage;
  variant?: BrandIdentityVariant;
  size?: BrandIdentitySize;
  className?: string;
  decorative?: boolean;
}
```

Resolve the brand, render `CinemaChainBrandGlyph`, and delegate to `BrandIdentity` with `dataAttribute="data-cinema-chain-brand"`.

Replace the internals of `views/lifestyle/business/components/CinemaChainLogo.tsx` with a thin wrapper that maps `sm -> SM`, `md -> MD`, and `lg -> MD`, retaining the existing exported name and prop contract. Its only rendered identity must come from `CinemaChainBrand`.

- [ ] **Step 7: Run cinema identity audits**

Run: `npm run audit:cinema-chain-brand`

Expected: PASS with `Cinema chain brand audit passed.`

Run: `npm run audit:cinema-chains`

Expected: PASS with `Cinema chain identity audit passed.`

- [ ] **Step 8: Commit checkpoint if explicitly authorized**

```bash
git add types.ts components/brand/CinemaChainBrandMarks.tsx services/cinemaChainBrandRegistry.ts components/CinemaChainBrand.tsx views/lifestyle/business/components/CinemaChainLogo.tsx scripts/audit-cinema-chain-brand.tsx package.json
git commit -m "feat: add cinema chain brand registry"
```

---

### Task 4: Replace Theatrical and Box Office Dots With Canonical Brands

**Files:**
- Modify: `views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx:1-120`
- Modify: `views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css:738-755`
- Modify: `views/mobile/BoxOfficeApp.tsx:1-15,1200-1230,1535-1560`
- Modify: `scripts/fixtures/release-wizard-transplant.tsx:170-205`
- Modify/Test: `scripts/audit-cinema-chain-ui.mjs`

**Interfaces:**
- Consumes: `CinemaChainBrand` with chain ID, localized display name, variant, size, and decorative mode.
- Produces: branded Theatrical partner cards and selected-chain summaries without changing selection callbacks or economics.

- [ ] **Step 1: Strengthen the failing static UI audit**

Update `scripts/audit-cinema-chain-ui.mjs` to read `TheatricalDeskStep.tsx`, `BoxOfficeApp.tsx`, `CinemaChainBrand.tsx`, and the registry. Assert:

```js
[
  'CinemaChainBrand',
  'variant="MARK"',
  'variant="LOCKUP"',
  'data-cinema-chain-brand',
].forEach(token => mustInclude(combinedUi, token));

if (/className=\{css\.chaindot\}/.test(theatricalDesk)) {
  throw new Error('Theatrical Desk still renders plain cinema-chain dots.');
}
```

Run: `npm run audit:cinema-chain-ui`

Expected: FAIL because Theatrical Desk still renders `.chaindot`.

- [ ] **Step 2: Brand the selected-chain summary**

Import `CinemaChainBrand` in `TheatricalDeskStep.tsx`. Replace each selected `<i>` inside `regmarks` with:

```tsx
<span key={chain.id} title={chain.name}>
  <CinemaChainBrand chainId={chain.id} displayName={chain.name} variant="MARK" size="XS" decorative />
</span>
```

Keep the adjacent selected-count text so the decorative marks do not carry selection meaning alone.

- [ ] **Step 3: Brand every partner card**

Replace `.chaindot` and the plain name with a compact lockup:

```tsx
<CinemaChainBrand
  chainId={chain.id}
  displayName={chain.name}
  variant="LOCKUP"
  size="XS"
  decorative
/>
```

Keep the button's `aria-label={chain.name}`, `aria-pressed={chain.selected}`, click callback, screen count, and exhibitor cut unchanged.

- [ ] **Step 4: Update responsive card CSS**

Remove `.chaindot` rules. Add:

```css
.regmarks{display:flex;align-items:center;gap:5px;margin-left:auto}
.regmarks>span{display:grid;height:18px;width:18px;place-items:center}
.regmarks :global(.brand-identity__mark){filter:drop-shadow(0 0 5px currentColor)}
.chain{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;gap:5px}
.chain :global(.brand-identity){min-width:0;max-width:100%}
.chain :global(.brand-identity__wordmark){color:inherit;font-size:12px}
.chain>span{min-width:0}
.chain.on :global(.brand-identity__mark){filter:drop-shadow(0 0 6px var(--pt))}
```

Preserve the existing selected border/background treatment and ensure the terms line remains beneath the lockup.

- [ ] **Step 5: Use canonical branding in Box Office**

Replace the `CinemaChainLogo` import in `BoxOfficeApp.tsx` with `CinemaChainBrand`. At both current call sites, render:

```tsx
{chainProfile && (
  <CinemaChainBrand
    chainId={chainProfile.id}
    displayName={chainProfile.name}
    variant="MARK"
    size="SM"
  />
)}
```

The surrounding text remains the localized full name, so use the mark-only variant to avoid duplicate wordmarks.

- [ ] **Step 6: Expand the desk fixture to all six chains**

Replace the one-chain fixture list with all six canonical IDs and representative terms. Keep `NOVA_CIRCUIT` selected by default after region selection so the existing click path remains valid. Add `data` only through real component props; do not create fixture-only visual logic.

- [ ] **Step 7: Audit every current cinema-chain surface**

Run:

```bash
rg -n "CinemaChainLogo|CinemaChainBrand|chain\.brandColor|chaindot|chain\.name" views components --glob '*.tsx'
```

Every visual cinema-chain result must either use `CinemaChainBrand`, use the compatibility `CinemaChainLogo` wrapper, or be recorded as a text-only economic row where a logo would reduce readability. Do not migrate streaming-platform identities through the cinema registry.

- [ ] **Step 8: Run static and component audits**

Run: `npm run audit:cinema-chain-ui`

Expected: PASS with `Cinema chain UI audit passed.`

Run: `npm run audit:cinema-chain-brand`

Expected: PASS.

Run: `npm run audit:release-distribution-desk`

Expected: PASS with the existing release-distribution success message.

- [ ] **Step 9: Commit checkpoint if explicitly authorized**

```bash
git add views/lifestyle/business/release-strategy-transplant/TheatricalDeskStep.tsx views/lifestyle/business/release-strategy-transplant/ReleaseStrategy.module.css views/mobile/BoxOfficeApp.tsx scripts/fixtures/release-wizard-transplant.tsx scripts/audit-cinema-chain-ui.mjs
git commit -m "feat: show cinema brands across theatrical surfaces"
```

---

### Task 5: Browser Regression, Phone Screenshots, and Production Verification

**Files:**
- Modify/Test: `scripts/audit-release-wizard-transplant-browser.cjs`
- Create output: `artifacts/cinema-chain-brand/393x600-theatrical-desk.png`
- Create output: `artifacts/cinema-chain-brand/393x852-theatrical-desk.png`
- Modify: `docs/superpowers/specs/2026-09-16-cinema-chain-brand-system-design.md` status only after user visual approval

**Interfaces:**
- Consumes: completed shared renderer, registry, marks, and integrated UI.
- Produces: automated mobile-layout evidence and two user-review screenshots from the actual Theatrical Desk fixture.

- [ ] **Step 1: Add failing browser assertions**

In the `mode=desk` section of `scripts/audit-release-wizard-transplant-browser.cjs`, after selecting North America, assert:

```js
assert.equal(await page.locator('[data-cinema-chain-brand]').count(), 6);
assert.equal(await page.locator('[data-cinema-chain-mark]').count(), 6);
assert.equal(await page.locator('.chaindot').count(), 0);

const nova = page.getByRole('button', { name: 'Nova Circuit', exact: true });
await nova.click();
assert.equal(await nova.getAttribute('aria-pressed'), 'true');
assert.equal(await nova.locator('[data-cinema-chain-brand="NOVA_CIRCUIT"]').count(), 1);
```

Add desk layout checks at `{ width:393, height:600 }` and `{ width:393, height:852 }`: every partner button must fit horizontally, every wordmark must have `scrollWidth <= clientWidth`, and the page must have no horizontal document overflow.

- [ ] **Step 2: Start the fixture server and verify the test fails for the intended reason**

Run: `npm run dev -- --host 127.0.0.1 --port 5178`

In another terminal run: `npm run audit:release-wizard-transplant-browser`

Expected before final UI corrections: FAIL on a mark-count, truncation, or overflow assertion rather than a server/runtime error.

- [ ] **Step 3: Correct only verified responsive defects**

Adjust the relevant rules in `ReleaseStrategy.module.css` until:

- six cards fit without horizontal overflow at 393 pixels,
- all chain names remain readable or ellipsize inside their own card,
- terms lines remain visible,
- selected borders and SVG marks are both perceptible,
- summary marks do not collide with the region heading or live count.

Do not change map layout, release economics, or partner selection behavior in this step.

- [ ] **Step 4: Capture actual phone screenshots**

Use the existing Playwright Chromium configuration and the desk fixture URL:

```js
for (const viewport of [{ width:393, height:600 }, { width:393, height:852 }]) {
  const shot = await browser.newPage({ viewport });
  await shot.goto(`${URL}?mode=desk`);
  await shot.locator('.region-map-hit-area').first().click();
  await shot.getByRole('button', { name:'Nova Circuit', exact:true }).click();
  await shot.screenshot({
    path:`artifacts/cinema-chain-brand/${viewport.width}x${viewport.height}-theatrical-desk.png`,
    fullPage:true,
  });
  await shot.close();
}
```

Inspect both images directly. Confirm unique silhouettes, readable names, selected-state clarity, balanced card density, and no clipping before presenting them to the user.

- [ ] **Step 5: Run the complete verification matrix**

Run:

```bash
npm run audit:brand-presentation
npm run audit:cinema-chains
npm run audit:cinema-chain-brand
npm run audit:cinema-chain-ui
npm run audit:release-distribution-desk
npm run audit:release-wizard-transplant-browser
npm run build
```

Expected: every command exits 0. Record exact failures rather than claiming partial checks passed.

- [ ] **Step 6: Present screenshots for creative approval**

Show both phone screenshots and summarize only the verified behavior. Technical completion does not equal creative approval; if the user rejects a mark, revise that identity without changing gameplay data.

- [ ] **Step 7: Mark the spec implemented only after visual approval**

Change the spec status from `Approved direction; awaiting specification review` to `Implemented and visually approved` only after the user explicitly approves the in-game screenshots.

- [ ] **Step 8: Commit checkpoint if explicitly authorized**

```bash
git add scripts/audit-release-wizard-transplant-browser.cjs artifacts/cinema-chain-brand docs/superpowers/specs/2026-09-16-cinema-chain-brand-system-design.md
git commit -m "test: verify cinema chain branding on mobile"
```

---

## Final Acceptance Checklist

- [ ] All six cinema chains resolve to distinct vector marks and complete brand presentations.
- [ ] Unknown/future chain IDs render deterministic monograms.
- [ ] Streaming-platform branding remains visually and behaviorally unchanged.
- [ ] Theatrical Desk contains no plain chain-colour dots.
- [ ] Selected and unselected partner cards remain distinguishable without colour alone.
- [ ] Box Office surfaces consume the same canonical cinema identities.
- [ ] No save migration or economics change is introduced.
- [ ] Focused audits, release audits, browser audit, and production build pass.
- [ ] 393 x 600 and 393 x 852 screenshots have been inspected and shown to the user.
- [ ] User has explicitly approved the final in-game identities.
