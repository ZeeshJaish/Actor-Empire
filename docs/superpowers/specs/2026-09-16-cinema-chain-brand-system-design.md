# Cinema Chain Brand System Design

**Date:** 2026-09-16
**Status:** Approved direction; awaiting specification review

## Goal

Give every fictional cinema chain a distinct, reusable visual identity and show that identity consistently anywhere the chain appears. The experience should match the clarity of the existing Netflix, Prime Video, Disney+, and other streaming-platform presentation system without coupling cinema data to streaming-platform data.

## Scope

This design covers the six existing cinema chains:

- Empire Cinemas
- Z Cinemas
- Nova Circuit
- Prism Halls
- ArcLight Grid
- CrownScreen

It covers identity metadata, vector marks, wordmarks, compact and full lockups, reusable rendering, selection states, fallbacks, accessibility, and adoption in all current cinema-chain UI. It does not change chain economics, availability, regional terms, selection rules, or saved chain identifiers.

## Chosen Approach

Use the same registry-and-renderer pattern as the streaming-platform brand system, with a cinema-specific registry and a shared presentation foundation.

The cinema system will not add cinema chains to `streamingPlatformBrandRegistry.ts`. Instead, the streaming and cinema registries will expose compatible presentation data to shared brand primitives. This preserves domain boundaries while avoiding two independent logo implementations.

Generated bitmap logos are not production assets. Final marks are code-native SVG so they remain sharp at small mobile sizes, inherit accessible colours, and do not require extra network or bundle assets.

## Brand Model

Each cinema-chain entry contains:

- stable `chainId`
- localized display name supplied by the existing cinema-chain service
- primary and secondary colours
- optional accent colours
- dark surface colour
- readable foreground colours for primary and surface backgrounds
- mark kind and mark key
- wordmark typeface
- lockup style

The model mirrors the established streaming presentation concepts: `MARK`, `WORDMARK`, and `LOCKUP`; `XS`, `SM`, and `MD` display sizes; and `WORDMARK`, `SIDE`, `STACK`, or `ICON` lockups.

The existing `CinemaChain.logoMark` and `brandColor` fields remain compatible. The registry becomes the canonical visual presentation source, while the existing fields continue to protect older callers and save-compatible game logic.

## Brand Directions

### Empire Cinemas

- Personality: premium flagship and first-night spectacle
- Mark: monumental cinema entrance combined with a restrained crown
- Palette: warm gold, antique brass, near-black
- Typeface: prestige serif
- Default lockup: horizontal

### Z Cinemas

- Personality: youth-heavy, loud, high-energy mass circuit
- Mark: angular `Z` built from a ticket cut or lightning path
- Palette: electric cyan, deep blue, near-black
- Typeface: condensed display face
- Default lockup: horizontal

### Nova Circuit

- Personality: dependable, modern, family-friendly network
- Mark: orbit around a projector lens or screen
- Palette: mint, teal, deep green-blue
- Typeface: geometric sans serif
- Default lockup: horizontal

### Prism Halls

- Personality: colourful, accessible, mall-first weekend destination
- Mark: faceted prism projecting a screen-shaped beam
- Palette: magenta, violet, warm pink accent
- Typeface: geometric sans serif
- Default lockup: horizontal

### ArcLight Grid

- Personality: prestige urban circuit for auteurs and awards releases
- Mark: theatre light arc crossing a precise city grid
- Palette: soft violet, indigo, charcoal
- Typeface: refined mono or modern serif
- Default lockup: horizontal

### CrownScreen

- Personality: large-scale franchise and premium-event operator
- Mark: screen silhouette with a strong split crown
- Palette: emerald, deep green, muted gold accent
- Typeface: sturdy slab serif
- Default lockup: horizontal

Every mark must have a unique silhouette when rendered in one colour at 16 to 24 CSS pixels. Empire Cinemas and CrownScreen may both reference crowns, but Empire uses an architectural entrance while CrownScreen uses a screen-shaped crown so the two remain recognisable.

## Components and Ownership

### Shared brand primitives

A small domain-neutral presentation layer owns:

- typeface style resolution
- mark, wordmark, and lockup composition
- size variants
- colour CSS variables
- readable-ink selection
- accessible labels and decorative mode

The current streaming component will either consume this shared renderer or retain a thin compatibility wrapper around it. Existing streaming visuals and public component behavior must remain unchanged.

### Cinema brand registry

`cinemaChainBrandRegistry` owns the six fixed identity definitions and resolves a chain ID into presentation data. Unknown IDs receive a deterministic monogram fallback rather than disappearing or rendering an empty dot.

### Cinema brand component

`CinemaChainBrand` accepts a chain ID or resolved presentation and supports the same visual variants and sizes as the streaming component. The current `CinemaChainLogo` becomes a compatibility wrapper or is migrated to the new component, depending on which option causes fewer call-site changes.

## UI Adoption

The first implementation pass covers every currently verified cinema-chain surface:

1. Theatrical Desk partner cards: replace colour dots with compact marks and use full lockups where card width permits.
2. Region headers: replace the cluster of selected colour circles with compact selected-chain marks.
3. Box Office release detail: keep the current icon placement but use the canonical registry identity.
4. Box Office partners page: use the canonical compact lockup.
5. Any streaming-release bidding or project screen that references a cinema chain through shared release data: resolve through the cinema registry rather than displaying a generic label.

A repository search is part of implementation verification so any additional chain-name or chain-colour-only surface is either migrated or explicitly documented as text-only.

## Interaction and States

- Unselected partner cards show the chain identity at reduced emphasis but never hide the mark.
- Selected cards use the chain colour for border, restrained glow, and mark emphasis.
- Disabled states lower overall opacity while preserving readable text contrast.
- Selected-chain summaries show marks with accessible titles; visual-only clusters are decorative when the surrounding text already names the selection count.
- Branding must not change button hit targets, selection behavior, pricing, screen counts, or exhibitor cuts.

## Accessibility and Fallbacks

- Non-decorative lockups expose the localized chain name as their accessible label.
- Decorative instances use `aria-hidden`.
- Foreground colours are selected with the same contrast logic used by the streaming brand registry.
- No selection state relies on colour alone: border, glow, and `aria-pressed` continue to communicate state.
- Missing or unknown marks fall back to a deterministic monogram and the chain name.

## Data and Save Safety

The branding layer is presentational. Existing `CinemaChainId` values remain unchanged, and no save migration is required. Economics continue to come from `services/cinemaChains.ts`; UI code resolves visual identity by stable ID. Localized names remain sourced from existing localization keys rather than being duplicated in the brand registry.

## Verification

Implementation is complete only when all of the following pass:

- unit audit for six known identities, unique marks, readable colour tokens, and unknown-ID fallback
- component rendering audit for every variant and size
- existing cinema-chain service and distribution audits
- Theatrical Desk interaction audit, including selected and unselected partner cards
- Box Office partner and release-detail rendering audit
- production build
- phone screenshot review at 393 x 600 and 393 x 852, checking recognition, truncation, contrast, density, and selected-state clarity

Visual approval remains separate from technical verification. The six marks must be inspected in the actual Theatrical Desk before the branding is considered creatively accepted.

## Non-Goals

- changing cinema-chain names or gameplay personalities
- changing economics, regional availability, or contracts
- adding player-created cinema-chain branding
- introducing bitmap logo downloads or externally hosted assets
- redesigning unrelated Theatrical Desk layout or map behavior
