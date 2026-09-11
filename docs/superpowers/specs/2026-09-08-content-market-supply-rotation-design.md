# Content Market Supply and Rotation Design

## Status

Approved by the user on September 8, 2026.

## Goal

Give newly founded and acquired player streaming platforms enough real, varied content to build a credible opening catalogue without generating disposable projects, rendering hundreds of rows, or duplicating the game's canonical project records.

## Core rule: the market never invents a title

Every direct listing, auction lot, upcoming sale, and catalogue-package component must reference an existing canonical project ID from the saved game world. Eligible sources are:

- Released projects in `player.world.projects`.
- Eligible completed projects in `player.pastProjects` that are not controlled by one of the player's production houses.
- Existing canonical rights contracts offered for a valid platform trade.
- Existing upcoming-rights records that already reference a canonical in-production project.

The supply layer may group, rank, price, and rotate those projects. It must not create a project merely to fill a listing quota. If the world genuinely contains fewer eligible projects, the market displays fewer opportunities and explains that supply is limited.

## Supply architecture

The system separates the full eligible supply from the small mobile storefront.

1. `getStreamingLicenseCandidatePool(player)` builds the complete deduplicated pool of canonical external titles. It excludes player-owned projects, titles already linked to the player's catalogue, invalid records, and titles whose requested rights have no eligible market scope.
2. The Content Market projects a bounded selection from that pool for the current market cycle.
3. The visible market normally contains up to 12 direct-title opportunities, up to 6 catalogue collections, and up to 3 live auctions. These are discovery surfaces, not the total number of titles available through the collections.
4. A collection normally contains 15–50 eligible canonical projects when the world has sufficient supply. Smaller legitimate collections are allowed when the seller's real eligible catalogue is smaller; the system never pads them with synthetic titles.
5. Collection components retain their own canonical project ID, seller studio ID, allocation weight, rights lot, and final contract. The package price allocation must still sum exactly to the package guarantee.

Collections remain single-seller packages in this phase. Cross-studio broker bundles are excluded because the current signing boundary represents one licensor and using it for several licensors would make contract ownership inaccurate.

## Founding Market

A newly incorporated player platform receives an immediate Founding Market on its first visit. It does not wait for the next three-week refresh.

The Founding Market is a deterministic projection of the eligible game-world pool at the platform's current absolute week. It favours useful opening-catalogue breadth:

- Film and series coverage when both exist.
- Several genres rather than repeated near-identical titles.
- At least a small number of credible anchor titles when the world has them.
- Collections from studios with enough real eligible inventory.
- Prices and rights scopes that the player platform can legally pursue.

During the first 12 weeks after incorporation, each market cycle receives a supply boost: up to 12 direct listings, 4–6 collections, and 2–3 auctions. Because collections can contain 15–50 titles, a mature world can expose access to roughly 100–220 canonical titles without showing 200 individual cards.

After the first 12 weeks, the regular market uses the same maximum direct-listing count but can reduce collection and auction density to match actual supply and keep the market readable.

An acquired operating platform does not need a Founding Market to fake an opening library. It inherits its existing catalogue and rights. The current market appears immediately as supplemental acquisition supply, using the same canonical pool and cycle rules.

## Three-week rotation

The market cycle is `floor(absoluteWeek / 3)`. Results are stable for every week in the same cycle and change only when the cycle changes or authoritative rights availability changes.

Selection is deterministic from the owned platform simulation seed, cycle number, project ID, and opportunity type. Reloading the same save in the same week produces the same listings, collections, auction assignments, prices, and ordering.

The selection balances continuity and discovery:

- Up to 3 high-value headliners remain visible across adjacent cycles while still eligible.
- The remaining direct-listing slots rotate from the full pool.
- Collection composition and auction assignment rotate on the same cycle boundary.
- Genre, format, seller, quality, commercial value, and recency influence ranking.
- No project is guaranteed a slot, and no title can appear twice in the same direct-listing surface.

Active player state survives rotation. A submitted private offer, ready-to-sign agreement, followed upcoming sale, or open auction session remains accessible in its dedicated workspace even when its discovery card leaves the current market cycle. Rotation never cancels a valid deal.

## Rights and settlement safety

Discovery performs an eligibility check using the existing rights compatibility system. Signing or auction settlement performs the same authoritative check again.

- Already-granted exclusive rights are not offered for the same territory and window.
- Partial remaining territories may be offered with their true eligible country scope.
- A collection is included only when every displayed component has a valid rights lot for that seller.
- If availability changes before acceptance, settlement fails safely, no treasury is charged, and the player receives the existing short incompatibility explanation.
- Direct purchase, private negotiation, catalogue collection, and auction paths continue to settle into the existing canonical rights contract and player catalogue records.

## Launch readiness

The game does not impose a hard requirement of 200 titles. Opening readiness continues to be based on useful catalogue strength: playable viewing hours, genre and format coverage, anchor titles, eligible market rights, and release availability.

The launch wizard and Content Desk consume the same catalogue records. The Founding Market supplies acquisition choices; it does not mark unpurchased listings as owned, playable, or launch-ready.

## Persistence and performance

The market projection is derived rather than persisted. The save stores only durable player actions and outcomes already required by the game: negotiations, auction sessions, signed contracts, catalogue-package records, follows, and catalogue links.

This avoids adding hundreds of duplicate listing records to long-lived saves. Pool construction is bounded to canonical project indexes and the UI receives only the selected direct listings and package summaries. Collection details may expose their real component rows on demand, but the main market does not render every component at once.

Older saves need no migration field. Their existing world projects are indexed on the first market read, and the deterministic seed/current cycle produces a stable current market.

## Failure behaviour

- Sparse world: show the legitimate smaller market; do not fabricate filler.
- Missing or malformed project: exclude it without breaking the market.
- No valid collection seller: show direct opportunities only.
- Rights change mid-cycle: remove or mark the affected discovery opportunity unavailable while preserving historical/player deal records.
- Insufficient treasury: keep the opportunity visible but block settlement through the existing finance rule.

## Verification requirements

Implementation follows strict TDD. The focused audit must prove:

- Every surfaced item resolves to a canonical saved project.
- Same save and same three-week cycle produce identical output after reload.
- The rotating portion changes at the next cycle while protected headliners remain when eligible.
- A sufficiently populated founding world exposes a useful opening supply through direct titles plus real package components.
- Sparse worlds remain sparse and receive no synthetic titles.
- Player-owned, already-catalogued, malformed, and rights-incompatible projects are excluded.
- Package component allocations sum exactly to the package guarantee and signing creates canonical component contracts.
- Active negotiations and auctions remain accessible after discovery rotation.
- Acquired platforms retain their catalogue and receive supplemental market supply.
- Existing Content Market, rights, package, launch-continuity, TypeScript, and production-build checks remain green.

## Out of scope

- Generating new films or series solely for market inventory.
- Cross-studio broker bundles.
- A 200-row mobile marketplace.
- Changing the canonical project-generation cadence of AI studios.
- Replacing the existing rights, bidding, negotiation, catalogue, or weekly-progression systems.
