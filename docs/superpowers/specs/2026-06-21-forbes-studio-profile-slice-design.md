# Forbes Studio Profiles — Phase 5 Slice 1 Design

## Goal

Turn Forbes → Studios into the discovery surface for company ownership by making every ranked studio selectable and opening an immersive company profile.

## Scope

This slice includes valuation, capital, debt, profitability, hits, flops, catalog highlights, management identity, and one acquisition-state badge for every studio. It does not add offers, negotiations, investment purchases, auctions, or ownership transfers.

## Architecture

`ForbesApp` keeps its existing ranking construction. A focused `studioProfileService` converts the selected ranking entry plus existing world, venture, project, universe, and player-business data into a stable `ForbesStudioProfile` view model. Static studio details use deterministic ID-based intelligence so opening the same company never changes its numbers.

The profile is a full-screen layer inside the existing Forbes app. Closing it returns to the exact Studios ranking without creating a new route or separate ownership system.

## Profile Information

- Company hero: rank, studio name, archetype, reputation, and acquisition state.
- Financial command: valuation, capital, estimated debt, and profitability.
- Performance record: hits, flops, and hit rate.
- Catalog: up to five existing world or NPC-venture releases, with a truthful empty state when no releases exist.
- Company identity: management personality and ownership structure.

## Acquisition States

Every studio receives one of: Not for sale, Open to offers, Distressed, Seeking investment, Publicly traded, or Auction expected. Player-owned studios are always Not for sale. NPC ventures use their actual cash, valuation, and hit/flop pressure. Established studios use stable deterministic classifications based on their current finances and identity.

The state is informational in Slice 1. There is no disabled acquisition button pretending that negotiation already exists.

## UI Direction

The ranking remains compact editorial Forbes UI. Selectable cards gain a clear chevron and pressed feedback. The dossier uses black editorial surfaces, ivory typography, amber rank accents, green/red financial signals, restrained motion, and dense but readable command strips instead of large empty SaaS cards.

## Testing

- A pure audit verifies deterministic profiles, all acquisition states, venture financial pressure, player-studio ownership, and catalog sourcing.
- A source audit verifies selectable studio controls and required dossier labels.
- TypeScript, production build, and browser QA verify the rendered Studios → profile → back flow on mobile.

