# Streaming Platform Brand Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every real and generated streaming operator one canonical, persistent visual identity and render it consistently across the game's current platform-facing surfaces.

**Architecture:** Seeded real operators store a lightweight registry reference; generated operators store a deterministic palette, mark, typeface, and lockup. A pure resolver turns either source, plus the player-owned platform adapter and `Others`, into one presentation model consumed by a reusable React component and palette helpers.

**Tech Stack:** TypeScript, React, Vite, server-rendered React audit scripts, deterministic RNG utilities, CSS custom properties, existing save normalization.

**Spec:** `docs/superpowers/specs/2026-08-27-streaming-platform-brand-identity-design.md`

## Global Constraints

- Preserve the existing dirty worktree and all unrelated user changes.
- Do not stage or commit files during this implementation.
- Key branding by stable platform/operator ID, never primarily by display name.
- Do not use runtime logo downloads, remote image URLs, or third-party CDNs.
- Verify real colour and asset choices against first-party resources where available; record the source or explicit wordmark fallback.
- Generate fictional identity deterministically, persist it once, and never silently regenerate it.
- Preserve current screen layouts and all streaming economics, offer logic, timers, market shares, and gameplay `brandPower`.
- Preserve player-owned custom-logo handling and adapt it only at presentation time.
- Enforce readable foreground contrast anywhere normal text sits on a brand colour.

---

## File Structure

### New files

- `services/streamingPlatformBrandRegistry.ts` — canonical real-platform registry, aliases, resolver, contrast helpers, CSS variables, player and `Others` adapters.
- `services/streamingPlatformBrandGenerator.ts` — deterministic fictional-brand generation, collision checks, and generated-brand normalization.
- `components/streaming-brand/StreamingBrandMarkPrimitives.tsx` — neutral geometric and letter marks shared by owned and rival platforms.
- `components/StreamingPlatformBrand.tsx` — accessible mark, wordmark, and compact lockup renderer.
- `styles/streaming-platform-brand.css` — renderer-only sizing and truncation rules.
- `scripts/audit-streaming-platform-branding.tsx` — registry, migration, determinism, rendering, and source-coverage audit.
- `docs/streaming-empire/STREAMING-BRAND-SOURCES.md` — source/fallback manifest for every seeded real operator.
- `public/assets/streaming/platform-brands/` — only reviewed local assets that can be responsibly bundled.

### Existing files to modify

- `types.ts`
- `services/streamingPlatformEcosystemSeeds.ts`
- `services/streamingPlatformEcosystem.ts`
- `services/streamingPlatformEcosystemTurn.ts`
- `components/streaming-transplant/StreamingBrandVisuals.tsx`
- `components/PlatformCommissionBriefCard.tsx`
- `views/mobile/MessagesApp.tsx`
- `components/StreamingPlatformWars.tsx`
- `components/StreamingMarketExpansionWizard.tsx`
- `components/StreamingDefineLaunchWizard.tsx`
- `services/streamingAudienceMarket.ts`
- `views/lifestyle/business/ReleaseWizard.tsx`
- `views/lifestyle/business/components/ProjectDashboardModal.tsx`
- `views/lifestyle/business/components/StreamingBiddingRoom.tsx`
- `components/studio-finance/finance/rivals.ts` and direct consumers
- `scripts/audit-global-streaming-ecosystem.ts`
- `scripts/audit-platform-commission-brief-card.tsx`
- `scripts/audit-streaming-active-bidding-phase2.ts`
- `package.json`

---

### Task 1: Canonical real-platform registry

**Files:**
- Create: `services/streamingPlatformBrandRegistry.ts`
- Create: `docs/streaming-empire/STREAMING-BRAND-SOURCES.md`
- Create when supported: `public/assets/streaming/platform-brands/*`
- Create: `scripts/audit-streaming-platform-branding.tsx`
- Modify: `types.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `StreamingOperatorBrand`, `StreamingGeneratedBrandIdentity`, `StreamingPlatformBrandPresentation`, `StreamingPlatformBrandMarkKind`.
- Produces: `REAL_STREAMING_PLATFORM_BRANDS`, `getRealStreamingPlatformBrand`, `resolveStreamingPlatformBrandById`, `getStreamingPlatformBrandCssVars`.
- Consumes: existing `StreamingTypefaceId`, `StreamingWordmarkStyleId`, `PlatformId`, and ecosystem seed IDs.

- [x] **Step 1: Write the failing registry audit**

Add this coverage shape to the new audit:

```tsx
for (const seed of STREAMING_ECOSYSTEM_OPERATOR_SEEDS) {
  const brand = getRealStreamingPlatformBrand(seed.id);
  assert.ok(brand, `${seed.id} must have a canonical brand`);
  assert.match(brand.primaryColor, /^#[0-9A-F]{6}$/);
  assert.ok(brand.accentColors.length >= 1 && brand.accentColors.length <= 4);
  assert.equal(getStreamingPlatformBrandCssVars(brand)['--platform-brand-primary'], brand.primaryColor);
}
```

Also require distinct identities for Netflix, Prime Video, Hulu, Disney+, YouTube, JioHotstar, ZEE5, and Sony LIV, plus multi-colour support for JioHotstar and ZEE5.

- [x] **Step 2: Register the audit and verify RED**

Add:

```json
"audit:streaming-platform-branding": "esbuild scripts/audit-streaming-platform-branding.tsx --bundle --platform=node --format=cjs --outfile=/tmp/audit-streaming-platform-branding.cjs && node /tmp/audit-streaming-platform-branding.cjs"
```

Run: `npm run audit:streaming-platform-branding`

Expected: FAIL because the registry and contracts do not exist.

- [x] **Step 3: Add the brand contracts**

Add these compatible shapes to `types.ts`:

```ts
export type StreamingPlatformBrandMarkKind = 'LOCAL_ASSET' | 'VECTOR_MARK' | 'WORDMARK' | 'MONOGRAM';

export interface StreamingGeneratedBrandIdentity {
  schemaVersion: 1;
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  onPrimaryColor: string;
  markId: string;
  typefaceId: StreamingTypefaceId;
  lockupId: StreamingWordmarkStyleId;
}

export type StreamingOperatorBrand =
  | { source: 'REAL_REGISTRY'; registryKey: string }
  | { source: 'GENERATED'; identity: StreamingGeneratedBrandIdentity };

export interface StreamingPlatformBrandPresentation {
  platformId: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColors: string[];
  surfaceColor: string;
  onPrimaryColor: string;
  onSurfaceColor: string;
  markKind: StreamingPlatformBrandMarkKind;
  markKey: string;
  typefaceId: StreamingTypefaceId;
  lockupId: StreamingWordmarkStyleId;
}
```

- [x] **Step 4: Research and document all real brands**

Create one manifest row for each exact seed ID:

`NETFLIX`, `APPLE_TV`, `DISNEY_PLUS`, `HULU`, `YOUTUBE`, `PRIME_VIDEO`, `CRAVE`, `VIX`, `GLOBOPLAY`, `NOW`, `ITVX`, `RTL_PLUS`, `CANAL_PLUS`, `MOVISTAR_PLUS`, `RAIPLAY`, `DSTV_STREAM`, `SHAHID`, `JIOHOTSTAR`, `ZEE5`, `SONY_LIV`, `U_NEXT`, `ABEMA`, `TVING`, `WAVVE`, `COUPANG_PLAY`, `VIU`, `VIDIO`, `TRUE_ID`, `IWANT_TFC`, `STAN`, `BINGE`, `NEON`, `TVNZ_PLUS`.

Each row records public name, first-party source URL, primary/supporting colours, mark strategy, local asset path if used, and fallback. When redistribution status is unclear, record and use `WORDMARK — no bundled third-party asset`.

- [x] **Step 5: Implement the finite registry**

Normalize colours to uppercase `#RRGGBB`; cap accents at four; assign explicit foreground/surface colours. Return `null` for an unknown registry key and a neutral deterministic wordmark from the public resolver for an unknown ID.

Export explicit legacy aliases such as `AMAZON_PRIME -> PRIME_VIDEO`; never infer a real platform from an arbitrary generated name substring.

- [x] **Step 6: Run to GREEN**

Run: `npm run audit:streaming-platform-branding`

Expected: PASS for full seed coverage, valid colours, palette bounds, and CSS variables.

- [x] **Step 7: Review checkpoint**

Inspect the focused diff. Confirm only contracts, registry/source documentation, assets, and audit wiring changed. Do not stage or commit.

---

### Task 2: Deterministic generation, persistence, and migration

**Files:**
- Create: `services/streamingPlatformBrandGenerator.ts`
- Modify: `types.ts`
- Modify: `services/streamingPlatformEcosystemSeeds.ts`
- Modify: `services/streamingPlatformEcosystem.ts`
- Modify: `services/streamingPlatformEcosystemTurn.ts`
- Modify: `scripts/audit-streaming-platform-branding.tsx`
- Modify: `scripts/audit-global-streaming-ecosystem.ts`

**Interfaces:**
- Produces: `generateStreamingOperatorBrand(input): StreamingGeneratedBrandIdentity`.
- Produces: `normalizeGeneratedStreamingBrand(value, fallbackInput, occupiedBrands): StreamingGeneratedBrandIdentity`.
- Adds: `brand: StreamingOperatorBrand` to `StreamingEcosystemOperator` and resolved `brand` to `StreamingCompanySummary`.

- [x] **Step 1: Add failing persistence assertions**

Require two identical creation inputs to return deep-equal brands. Delete brands from a cloned schema-1 state, normalize it, and require schema 2, real registry references, generated backfill, and idempotence.

Run: `npm run audit:streaming-platform-branding`

Expected: FAIL because operator branding and schema 2 are absent.

- [x] **Step 2: Implement a separate brand RNG**

Use:

```ts
const brandSeed = `${operatorId}:${name}:${homeCountryId}:${origin}:streaming-brand:v1`;
const rng = createDeterministicRng(brandSeed);
```

Do not consume the existing company-stat RNG, preserving current cash, technology, catalogue, risk, and market outcomes.

Allow only `BOLT`, `ORBIT`, `PRISM`, `PULSE`, `APERTURE`, `SIGNALTOWER`, `CROWN`, `MONOLITH`, `RIFT`, `ECLIPSE`, `LETTER_SOLID`, `LETTER_OUTLINE`, and `LETTER_SLAB`, plus existing typeface and lockup IDs.

- [x] **Step 3: Implement origin art direction and collision repair**

Weight palettes and mark/type combinations by origin as defined in the spec. Reject a candidate when primary hue distance is under 18 degrees and its mark/type pair matches an occupied company. Stop after eight attempts; the ninth result rotates hue by `47 * operatorIndex` and advances the mark index, so generation cannot loop forever.

- [x] **Step 4: Add real brand references to seeds and operators**

Add `brandRegistryKey` to each seed, defaulting to its ID. `seedToOperator` emits:

```ts
brand: { source: 'REAL_REGISTRY', registryKey: seed.brandRegistryKey }
```

- [x] **Step 5: Bump and normalize ecosystem schema**

Set `STREAMING_ECOSYSTEM_SCHEMA_VERSION = 2`. Seeded real operators normalize to their registry key. Valid generated identity remains semantically unchanged. Missing dynamic identity is generated from saved stable fields. Malformed colours and unknown IDs receive deterministic safe fallback. Normalize dynamic operators in stable ID order for reproducible schema-1 backfills.

Do not alter lifecycle, cash, valuation, subscribers, markets, events, or scores.

- [x] **Step 6: Brand new fictional operators exactly once**

After ID and name creation, call `generateStreamingOperatorBrand` with current active brands as collision inputs and persist:

```ts
brand: { source: 'GENERATED', identity: generatedBrand }
```

Weekly progression must never assign `operator.brand`.

- [x] **Step 7: Resolve brand in company summaries**

Include resolved brand in `toCompanySummary`. Give `Others` a neutral aggregate presentation without creating a fake operator.

- [x] **Step 8: Run migration audits to GREEN**

Run:

```bash
npm run audit:streaming-platform-branding
npm run audit:global-streaming-ecosystem
npm run audit:save-migration
```

Expected: all PASS, including deterministic creation, schema-1 backfill, schema-2 idempotence, and unchanged operator economics.

- [x] **Step 9: Review checkpoint**

Confirm the diff is limited to brand schema, generator, normalizer, and audits. Do not stage or commit.

---

### Task 3: Shared mark and wordmark renderer

**Files:**
- Create: `components/streaming-brand/StreamingBrandMarkPrimitives.tsx`
- Create: `components/StreamingPlatformBrand.tsx`
- Create: `styles/streaming-platform-brand.css`
- Modify: `components/streaming-transplant/StreamingBrandVisuals.tsx`
- Modify: `scripts/audit-streaming-platform-branding.tsx`

**Interfaces:**
- Produces: `StreamingPlatformBrand` with `variant: 'MARK' | 'WORDMARK' | 'LOCKUP'`, `size: 'XS' | 'SM' | 'MD'`, optional `className`, and optional `decorative`.
- Preserves: current `MARKS`, `letterMark`, and `Mark` exports from `StreamingBrandVisuals.tsx`.

- [x] **Step 1: Add failing server-render assertions**

Render Netflix, Prime Video, JioHotstar, and a generated identity. Require `data-platform-brand`, correct accessible naming, canonical CSS variables, SVG-only generated marks, and a missing-asset wordmark fallback.

Run: `npm run audit:streaming-platform-branding`

Expected: FAIL because the component is absent.

- [x] **Step 2: Extract neutral mark primitives**

Move only generic `MARKS`, `LETTERFORMS`, `letterMark`, and current-colour SVG rendering into the neutral file. Import and re-export those names from `StreamingBrandVisuals.tsx` so existing consumers retain the same API. Leave sound ident, manifesto, map, and player brand-deck code untouched.

- [x] **Step 3: Implement the brand component**

Render finite local assets, vector marks, wordmarks, and monograms according to `markKind`. Local asset errors fall back to a wordmark. Saved content never supplies SVG/HTML. Apply the existing typeface allow-list and registry CSS variables.

- [x] **Step 4: Add minimal density-safe styling**

Define 16px, 22px, and 32px mark sizes for `XS`, `SM`, and `MD`; one-line truncation; and compact lockup gaps. Do not add cards, borders, generic backgrounds, or shadows.

- [x] **Step 5: Run component regressions**

Run:

```bash
npm run audit:streaming-platform-branding
npm run audit:streaming-brand-polish
npm run audit:streaming-design-system
```

Expected: all PASS, including the existing owned-platform brand flow.

- [x] **Step 6: Review checkpoint**

Confirm existing `StreamingBrandVisuals` exports remain compatible. Do not stage or commit.

---

### Task 4: Commission and ecosystem UI integration

**Files:**
- Modify: `components/PlatformCommissionBriefCard.tsx`
- Modify: `views/mobile/MessagesApp.tsx`
- Modify: `components/StreamingPlatformWars.tsx`
- Modify: `components/StreamingMarketExpansionWizard.tsx`
- Modify: `components/StreamingDefineLaunchWizard.tsx`
- Modify: `scripts/audit-platform-commission-brief-card.tsx`
- Modify: `scripts/audit-platform-ai-platform-wars.ts`
- Modify: `scripts/audit-streaming-platform-branding.tsx`

**Interfaces:**
- Consumes: summary brands, stable platform IDs, `StreamingPlatformBrand`, and brand CSS variables.
- Produces: consistent real, regional, generated, and `Others` identity in current compact layouts.

- [x] **Step 1: Change commission audit to require ID branding**

Add `platformId` to the offer fixture, assert the shared brand hook, and require removal of the local `getPlatformAccent` function.

Run: `npm run audit:platform-commission-brief-card`

Expected: FAIL until the card interface changes.

- [x] **Step 2: Replace commission name matching**

Include `platformId` in `BriefOffer`, resolve by ID, apply its CSS variables, and render the compact wordmark/lockup in the current header. Pass the existing `offer.platformId` from `MessagesApp`. Retain the one-screen card height, ledger, schedule, and actions.

- [x] **Step 3: Replace Platform Wars colour/initial maps**

Remove `RIVAL_COLORS`. Use resolved brands for movement entries, battlefronts, executive cards, and region chips. Choose mark-only or wordmark-only variants to fit current space; do not introduce new card wrappers.

- [x] **Step 4: Render regional/generated identity in market flows**

Use `StreamingCompanySummary.brand` in expansion and launch rival rows. Preserve rail/card dimensions. Render `Others` with its neutral aggregate mark.

- [x] **Step 5: Run focused UI audits**

Run:

```bash
npm run audit:platform-commission-brief-card
npm run audit:platform-ai-platform-wars
npm run audit:global-streaming-ecosystem
npm run audit:streaming-platform-branding
```

Expected: all PASS, including multi-colour JioHotstar and persisted generated output.

- [x] **Step 6: Review checkpoint**

Confirm no surrounding redesign, forced scroll, or horizontal overflow rule was introduced. Do not stage or commit.

---

### Task 5: Legacy deal, bidding, audience, and finance integration

**Files:**
- Modify: `services/streamingAudienceMarket.ts`
- Modify: `views/lifestyle/business/ReleaseWizard.tsx`
- Modify: `views/lifestyle/business/components/ProjectDashboardModal.tsx`
- Modify: `views/lifestyle/business/components/StreamingBiddingRoom.tsx`
- Modify: `components/studio-finance/finance/rivals.ts` and direct consumers as required by its current contract.
- Modify: `scripts/audit-streaming-active-bidding-phase2.ts`
- Modify: `scripts/audit-streaming-audience-market-phase2.ts`
- Modify: `scripts/audit-streaming-platform-branding.tsx`

**Interfaces:**
- Consumes: stable IDs and explicit legacy aliases from the registry.
- Preserves: bid values, quality requirements, ceilings, audience copy/scores, finance calculations, bidding timers, and auction state.

- [x] **Step 1: Add failing no-drift assertions**

Require the migrated files to use the canonical registry and stop declaring duplicated core platform hex maps. Require serialized bidding offers to retain their colour field, populated from canonical identity.

Run:

```bash
npm run audit:streaming-platform-branding
npm run audit:streaming-active-bidding-phase2
```

Expected: new no-drift assertions FAIL.

- [x] **Step 2: Separate release economics from identity**

Keep existing bid, quality, and max-budget fields. Remove authored colour literals and resolve presentation by `platform.id`. Use a shared mark only where it fits; otherwise apply canonical CSS variables to the existing row.

- [x] **Step 3: Brand the bidding room by platform ID**

Resolve session platforms and offer slips through `platformId`, applying brand variables to existing accents and indicators. Do not change timer extension, platform response windows, revisions, final-offer behaviour, or deal selection.

- [x] **Step 4: Centralize audience-market display identity**

Keep all audience scores and prose. Source real platform names/colours from the registry adapter without changing balance.

- [x] **Step 5: Replace finance substring colour heuristics**

Resolve known streaming rivals through explicit aliases. Unresolved studios keep the neutral finance fallback. Never classify arbitrary names by trademark substring.

- [x] **Step 6: Run legacy-flow audits**

Run:

```bash
npm run audit:streaming-platform-branding
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-audience-market-phase2
npm run audit:platform-ai-player-commissions
npm run audit:streaming-contract-economics-phase2
```

Expected: all PASS with unchanged economics and audience balance.

- [x] **Step 7: Audit remaining duplicated literals**

Run:

```bash
rg -n "#E50914|#e50914|#1CE783|#1ce783|#00A8E1|#00a8e1" --glob '*.{ts,tsx,css}' .
```

Known brand literals should remain only in the registry, registry documentation/tests, or unrelated audience-segment styling. Do not remove legitimate non-platform colour uses. Do not stage or commit.

---

### Task 6: Full verification and live game QA

**Files:**
- Modify only focused audits or styling defects exposed by verification.

**Interfaces:**
- Consumes: all completed brand slices.
- Produces: fresh automated and browser evidence for the complete player-visible flow.

- [x] **Step 1: Run the focused regression set**

Run:

```bash
npm run audit:streaming-platform-branding
npm run audit:global-streaming-ecosystem
npm run audit:platform-commission-brief-card
npm run audit:platform-ai-player-commissions
npm run audit:platform-ai-platform-wars
npm run audit:streaming-active-bidding-phase2
npm run audit:streaming-audience-market-phase2
npm run audit:streaming-brand-polish
npm run audit:save-migration
```

Expected: every command exits 0.

- [x] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite exits 0 with no brand import, type, or asset errors.

- [x] **Step 3: Confirm local server identity**

Verify that `http://127.0.0.1:3000/` is served from `/Users/zeesh/Vibe code/Actor empire`. Restart Vite only if the current process is stale or belongs to another checkout.

- [x] **Step 4: Browser-check the commission message**

Use the existing commission cheat fixture. At the phone viewport confirm all offer details and both actions fit without internal card scrolling, platform identity matches the stable ID, contrast is readable, and the card remains consistent with other game messages.

- [x] **Step 5: Browser-check global and regional identity**

Open Platform Wars and an India market view. Confirm core globals, Prime Video, JioHotstar, ZEE5, and Sony LIV are distinct without widening cards or causing horizontal overflow.

- [x] **Step 6: Browser-check generated identity persistence**

Expose one deterministic fictional operator in a visible market/global summary. Reload and confirm name, palette, mark, and type treatment remain unchanged.

- [x] **Step 7: Final worktree review**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Separate brand-system changes from pre-existing unrelated work. Do not stage or commit.

- [x] **Step 8: Report completion evidence**

List canonical real platforms, generated-brand persistence behaviour, migrated screens, schema migration, exact passing commands, browser-verified views, and every intentional wordmark fallback where a suitable local logo asset was not bundled.
