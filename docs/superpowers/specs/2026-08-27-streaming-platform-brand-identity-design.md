# Streaming Platform Brand Identity System

**Date:** 2026-08-27

**Status:** In-chat design approved; awaiting written-spec review before implementation

**Parent work:** Competitive Streaming Platform AI Phase 4 and the global streaming ecosystem extension

## 1. Outcome

Every named streaming platform in the game will have one stable, recognizable identity wherever the player sees it.

- Existing real services use a canonical in-game representation of their established brand colours and, where a suitable local asset is available, their recognizable logo or wordmark.
- Multi-colour identities such as JioHotstar, ZEE5, and Peacock are not flattened into one arbitrary accent when the presentation can use their wider palette.
- Fictional services created during a save receive a complete generated identity: palette, mark, type treatment, and lockup.
- A generated identity is created once, persisted with the operator, and remains stable across reloads, market expansion, distress, acquisition, and promotion out of `Others`.
- Commission briefs, bidding and deal surfaces, market views, rival cards, and release-related platform labels resolve branding from the same source instead of maintaining separate colour switches.

This is a brand foundation, not a redesign of every surrounding screen. Existing screen layouts remain in place unless a small adjustment is required to render the shared mark or wordmark cleanly.

## 2. Repository findings that shape the design

### 2.1 Platform styling is currently duplicated

Core platform colours are separately encoded in:

- `components/PlatformCommissionBriefCard.tsx`;
- `components/StreamingPlatformWars.tsx`;
- `services/streamingAudienceMarket.ts`;
- `views/lifestyle/business/ReleaseWizard.tsx`;
- `views/lifestyle/business/components/ProjectDashboardModal.tsx`; and
- studio-finance rival presentation data.

Those mappings already disagree on some shades. Extending each mapping for every regional and generated company would make drift inevitable.

### 2.2 The ecosystem has stable operator identity but no visual identity

`StreamingEcosystemOperator` already owns a stable `id`, `name`, origin, lifecycle, home market, and simulation attributes. Seeded real operators and generated fictional operators use the same record, but the record currently has no brand field.

The company read model, `StreamingCompanySummary`, also omits branding. Consumers therefore receive a name but cannot render a canonical platform mark or palette.

### 2.3 Generated companies are already deterministic

`createDynamicStreamingOperator` builds each future company from a deterministic seed containing the player, ecosystem sequence, week, market, and origin. Brand generation can consume the same random stream without introducing `Math.random()` or render-time randomness.

### 2.4 Player-owned platform branding is related but not the same domain

The owned-platform flow already has useful mark, typeface, and lockup primitives in `StreamingBrandVisuals.tsx`. Those primitives can be extracted or adapted for fictional rival marks. They must not make rival identity depend on the player-owned presentation shell, and existing player-uploaded custom logo data remains private to the player platform.

## 3. Approaches considered

### Approach A — A name-based colour and logo switch in each component

This is the smallest immediate edit, but it repeats the current problem, relies on fragile substring matching, and cannot persist generated identities safely.

**Rejected.**

### Approach B — Store remote image URLs for every company

This can display exact artwork quickly, but it creates network dependence, broken saves when URLs change, inconsistent dark-mode variants, privacy concerns, and no solution for fictional operators.

**Rejected.** No runtime hotlinking is allowed.

### Approach C — Canonical real-brand registry plus persisted generated identity

A shared registry resolves real operators by stable ID. Generated operators store their generated visual decisions in the save. A single resolver produces a presentation-safe identity for UI consumers.

**Chosen.** It gives real services consistency, fictional services permanence, bounded save growth, offline rendering, and one migration path.

## 4. Data ownership and contracts

### 4.1 Persisted operator brand reference

`StreamingEcosystemOperator` gains a discriminated brand value:

```ts
type StreamingOperatorBrand =
  | {
      source: 'REAL_REGISTRY';
      registryKey: StreamingRealBrandKey;
    }
  | {
      source: 'GENERATED';
      identity: StreamingGeneratedBrandIdentity;
    };
```

Real companies persist only the registry key. Their established presentation data is code-owned configuration rather than duplicated into every save. Fictional companies persist the decisions needed to recreate their own brand exactly.

### 4.2 Generated identity

```ts
interface StreamingGeneratedBrandIdentity {
  schemaVersion: 1;
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  onPrimaryColor: string;
  markId: string;
  typefaceId: StreamingTypefaceId;
  lockupId: 'WORDMARK' | 'SIDE' | 'STACK' | 'ICON';
}
```

Only normalized hexadecimal colours and allow-listed design IDs may enter persisted state. No JSX, CSS class strings, file paths, remote URLs, or arbitrary uploaded data are stored here.

### 4.3 Resolved presentation identity

UI code receives a non-persisted read model:

```ts
interface StreamingPlatformBrandPresentation {
  platformId: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColors: string[];
  surfaceColor: string;
  onPrimaryColor: string;
  onSurfaceColor: string;
  markKind: 'LOCAL_ASSET' | 'VECTOR_MARK' | 'WORDMARK' | 'MONOGRAM';
  markKey: string;
  typefaceId: StreamingTypefaceId;
  lockupId: 'WORDMARK' | 'SIDE' | 'STACK' | 'ICON';
}
```

`StreamingCompanySummary` gains the resolved `brand` value so market and rival components do not know whether an operator is real or fictional.

Commission offers already include `platformId`. `PlatformCommissionBriefCard` will accept that ID and resolve the canonical identity directly. Name aliases exist only as a defensive fallback for legacy or malformed data; names are never the primary key.

## 5. Canonical real-platform registry

`services/streamingPlatformBrandRegistry.ts` will own the registry keyed by ecosystem/operator ID. It covers every real operator in `STREAMING_ECOSYSTEM_OPERATOR_SEEDS`, including the five core services, Prime Video, and all regional services.

Each record provides:

- established primary and supporting colours;
- safe foreground and surface colours for readable game UI;
- a local asset key when usable logo artwork is included;
- an explicit wordmark or monogram fallback;
- dark- and light-surface behaviour;
- type and lockup metadata; and
- optional additional accent colours for multi-colour identities.

Before values and assets are added, current colours and asset usage will be checked against first-party brand or media resources where available. The game will bundle approved local files under a dedicated streaming-brand asset directory. It will not fetch logos at runtime.

If a suitable distributable logo asset is unavailable, the registry uses a clean text wordmark or restrained monogram. The system must not invent a misleading pseudo-official symbol.

The registry is presentation data only. Subscriber counts, market shares, company strength, and brand-power gameplay values remain the game's authored simulation data.

## 6. Fictional brand generation

`createDynamicStreamingOperator` will call a pure `generateStreamingOperatorBrand` function during company creation.

### 6.1 Inputs

The generator receives:

- the existing deterministic RNG;
- operator name and ID;
- origin archetype;
- home-market region;
- all existing active operator identities for collision checks; and
- generation schema version.

### 6.2 Origin-aware art direction

Origin affects probabilities rather than enforcing one repeated look:

- `TECH_BACKED` and `VENTURE_BACKED`: geometric or abstract marks, cleaner sans or mono wordmarks, stronger cool-colour weighting;
- `TELECOM_BACKED`: signal/orbit/tower forms, highly legible saturated palettes;
- `BROADCASTER_BACKED`: editorial wordmarks and stable horizontal lockups;
- `STUDIO_SPINOFF`: aperture, monolith, serif, slab, or prestige-led treatments;
- `CONGLOMERATE_BACKED`: restrained corporate marks with high-contrast lockups;
- `CELEBRITY_FOUNDED`: expressive colour pairings and bolder wordmarks;
- `BOOTSTRAPPED`: simpler monograms or wordmarks that still look intentional rather than unfinished.

Region can lightly influence palette families but cannot produce stereotypes or make every company from a region look the same.

### 6.3 Collision control

The generator rejects or rerolls identities that are too close to currently active companies based on:

- primary-colour distance;
- identical primary/secondary pair;
- same mark and typeface combination; and
- confusingly similar initial-based marks in the same home market.

After a bounded number of attempts, a deterministic fallback rotates the hue and mark index. Generation can never loop indefinitely.

### 6.4 Persistence rule

Growth, decline, promotion, demotion, distress, or acquisition may alter where the identity appears, but never regenerate it. A later feature may support a deliberate rebrand event; this design does not silently rebrand companies.

## 7. Shared resolver and presentation components

### 7.1 Service boundary

The brand module exposes focused functions:

```ts
getRealStreamingBrand(registryKey)
generateStreamingOperatorBrand(input)
normalizeStreamingOperatorBrand(value, fallback)
resolveStreamingPlatformBrand(operatorOrId)
getStreamingPlatformBrandCssVars(brand)
```

The normalizer validates generated colours, IDs, and contrast, then falls back deterministically when saved data is incomplete.

### 7.2 UI boundary

A reusable `StreamingPlatformBrand` component renders:

- mark only;
- wordmark only; or
- mark-and-wordmark lockup.

It receives resolved presentation identity and size/variant props. It does not query world state or derive brands from names.

A smaller helper exposes CSS custom properties for surfaces that need only the platform palette, such as the commission-card clapper stripe or bidding-room offer border.

The existing fictional mark and typeface primitives will be moved to a neutral shared location or wrapped behind this component. Player-owned branding continues to consume those shared primitives without losing custom-upload support.

## 8. Integration scope

The first implementation pass migrates every currently traced platform-identity surface that already maintains its own platform colour or displays ecosystem companies:

1. platform commission brief;
2. Platform Wars and global-company summaries;
3. market expansion and launch-definition rival lists;
4. streaming audience market presentation;
5. release wizard and project-dashboard platform offers;
6. active bidding-room platform identity; and
7. studio-finance rival labels where those labels refer to streaming services.

The surrounding layouts remain intact. Dense surfaces may use a mark-only or wordmark-only variant to preserve spacing. `Others` receives a neutral aggregate identity and is never treated as a real operator.

Future screens must consume the shared resolver/component instead of adding a local colour map.

## 9. Save migration and normalization

The streaming ecosystem schema increments from version 1 to version 2.

Migration behaviour:

- seeded real operators receive the correct `REAL_REGISTRY` key by operator ID;
- an older dynamic operator with no brand receives a deterministic generated identity derived from stable saved fields, not from current time;
- an already valid generated identity remains semantically unchanged after normalization; only harmless canonical formatting such as hexadecimal letter case may change;
- unknown real-registry keys fall back to a safe generated-looking wordmark without deleting the operator;
- missing or malformed optional ecosystem state still normalizes to the complete seeded world;
- normalization is idempotent; and
- loading a save never advances random state or emits gameplay events.

Player-owned platform identity is not migrated into rival ecosystem identity. When the player is shown alongside rivals, its existing owned identity is adapted into the same presentation read model at runtime.

## 10. Accessibility, resilience, and asset rules

- Every primary/accent treatment used behind text receives an explicit readable foreground.
- Resolver tests enforce WCAG AA contrast for normal text uses; decorative logo colours may retain authentic values when no text is placed over them.
- Marks never carry the company name as their only accessible label. The parent control or component provides the platform name.
- Missing assets fall back to wordmark or monogram without layout shift.
- The UI remains functional offline.
- Local SVGs are sanitized and imported through a finite asset-key map; arbitrary SVG/HTML from saves is never rendered.
- Real logos remain trademarks of their owners. The implementation records the first-party source and usage note for each bundled asset, and falls back when a usable asset cannot be responsibly bundled.

## 11. Verification

Focused automated checks must prove:

1. every real ecosystem seed resolves to a valid registry identity;
2. no registry entry references a missing local asset;
3. core and regional platform colours resolve consistently across consumers;
4. the same generated-operator input produces the same identity across runs and reloads;
5. two launched companies avoid the defined palette/mark collision threshold;
6. schema-1 saves backfill real and dynamic branding without losing operator progress;
7. normalization is idempotent;
8. unsafe colours, marks, or asset keys are repaired;
9. `Others` and player-owned platform adapters resolve safely;
10. the commission card renders Netflix, Prime Video, Hulu, JioHotstar, and a generated operator from canonical data; and
11. the TypeScript build succeeds.

Browser verification will cover a compact commission message, one global Platform Wars view, one regional market with multi-colour local services, and one generated operator becoming visibly branded. The checks must confirm readable contrast, stable spacing, no horizontal overflow, and no new forced scrolling in the compact commission card.

## 12. Completion criteria

This brand-identity extension is complete when:

- all seeded real operators have a canonical identity;
- generated operators persist their own distinct identity;
- old ecosystem saves migrate safely;
- the shared component/resolver replaces the traced local platform-colour mappings;
- real and fictional brands render offline with safe fallbacks;
- commission, market, rival, release, bidding, and finance surfaces agree about each platform's identity;
- focused audits and the project build pass; and
- browser verification demonstrates real, regional, multi-colour, and generated brands without harming the existing compact layouts.

## 13. Explicit non-goals

- No live market-share, subscriber, or financial data is introduced.
- No runtime logo downloads or third-party CDN dependency is introduced.
- No automatic rebranding event is added to weekly simulation.
- No redesign of the surrounding commission, bidding, release, or market layouts is included.
- No change is made to platform economic strength merely because its visual brand is more recognizable.
