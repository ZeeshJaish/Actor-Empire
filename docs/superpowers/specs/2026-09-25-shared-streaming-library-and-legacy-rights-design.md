# Shared streaming library and legacy-rights preservation — design

Date: 2026-09-25

Status: Proposed for user review; no gameplay or save-format implementation in this document

Scope: Actor Empire's per-save historical screen library, streaming Content Market, rival title positions, and old-save rights migration

## Player contract

Every save has one shared world of released films and series. The player's platform and rival platforms compete for streaming positions in that world; neither receives a private duplicate of a film. The target is at least 2,000 distinct released titles after migration or new-game initialization, including every surviving title already recorded in the save. The historical seed fills the deficit; it never replaces or renames a real saved project. New simulation-driven releases continue to join the world normally.

The film's producer, underlying ownership, release result, public rating, and award record are separate from streaming rights. A platform can buy a timed or permanent streaming position without becoming the film's producer. A purchased title counts as playable only in markets, modes, and weeks allowed by its rights and the platform's market access.

Old purchases have priority over new supply. An old completed bid represented as a complete acquisition remains a permanent streaming position for its winning platform, with no renewal, re-charge, or second sale. The producing studio keeps the film unless a separate record proves an underlying IP sale. An old deal whose territory was not recorded is protected as worldwide. Explicitly bounded deals retain their actual duration and territory. An ambiguous title is unavailable for sale until its rights can be proven free. Migration never manufactures a past charge, payout, or award.

## Why a separate library is needed

`services/streamingCatalog.ts` currently builds candidates mainly from `player.world.projects` and `player.pastProjects`. `services/worldLogic.ts` keeps only the current and preceding release years plus a small older slice, with a 320-item final limit. `services/saveCompaction.ts` has a 900-item ordinary world-project budget, preserving referenced projects above that budget. The three-week selection in `services/streamingMarketSupply.ts` rotates a small discovery shelf; it does not create supply. A 2,000-title back catalogue placed directly in `world.projects` would be trimmed or inflate the hot save.

The existing rights model already distinguishes permanent acquisitions from limited windows, but `migrateStreamingRightsContractRegistry` can reconstruct an old active streaming release as a 52-week exclusive contract when only a legacy `streaming` projection survives. Archived `pastProjects` can still be market candidates. This makes a separate legacy-rights reconciliation mandatory before historical titles are exposed to the market.

The proposed atomic career-history sidecar archive is a separate, not-yet-enabled design. This library must not assume that sidecar is already available or silently change its format. Both designs should later share stable title IDs and bounded transfer/integrity requirements rather than maintain two incompatible historical copies.

## Chosen architecture and alternatives

Use a versioned, deterministic per-save historical catalogue with stable title IDs, compact seed identity, and saved mutable overlays. Existing saved releases are canonical source records; seeded history is immutable baseline data. A unified title resolver reads saved releases first, then seeded titles, and exposes one resolved title to marketplace, rival, awards, and UI consumers. The canonical rights registry, plus explicit legacy holds where a buyer cannot be recovered, is the sole availability authority.

Two rejected shortcuts are (1) putting 2,000 `IndustryProject` objects into `world.projects`, which conflicts with retention and save-size controls, and (2) giving each platform a separate fake catalogue, which creates duplicate identities and makes rival competition meaningless. A single static global list without a per-save version is also insufficient: an app update could reshuffle ownership or ratings in an ongoing career.

## Title identity and catalogue data

- One title ID is stable for the lifetime of a save. Existing `IndustryProject`, `PastProject`, active release, production commitment, or owned-studio record retains its current canonical ID. Records are merged only by proven canonical lineage or matching ID, never by title text alone. Two films with the same name remain distinct.
- Each resolved record exposes title, movie/series type, genre, language/region, producer/rights-holder ID, release year and week in the game's existing age-year timeline, quality, an in-game public rating where warranted, commercial/reputation signals, and provenance (`SAVED_RELEASE` or `SEEDED_HISTORY`). Fields inferred for an older record carry inference provenance and never overwrite a stored result.
- Seeded titles have deterministic IDs from save seed, catalogue version, and item index. The save stores its catalogue version and seed; the app retains that immutable generator version so updates do not reroll old titles. New content batches use a new version/namespace and append only. Financial transactions, contracts, awards, and acquired positions remain explicit saved state rather than being regenerated.
- The initial target is 2,000 distinct released screen titles, with an 85% movie / 15% series seed mix before existing-title preservation changes the final ratio. If a save already has more than 2,000 distinct released titles, preserve all and generate none for the base batch. Unreleased commitments do not count toward the target or become market listings.
- Assign seeded production to existing game studios with weighted shares based on archetype, budget comfort, territory/language fit, and age. Add lightweight fictional regional/independent rights-holder identities where the named roster lacks variety; they do not need full weekly studio AI. Newly founded companies get no fabricated decades-old library. Existing player-owned titles or acquired-studio rights are never gifted by seeding. A later studio acquisition transfers only assets that its explicit acquisition terms include.
- Historical dates remain earlier than or equal to the save's current week. The generator uses the game's age-year convention, not invented real-world calendar dates. The small current-year tranche has individual release weeks; it cannot be viewed, sold, or considered for awards before release.
- Seeded names and credits are fictional game-world creations. A public rating is an in-game 1–10 value, not a live IMDb score or claim of a real review. Quality, rating, budget tier, reach, and prestige follow broad studio/genre distributions with deterministic variation so the top shelf is scarce and lower-budget libraries are useful.

## Legacy save reconciliation and rights precedence

Migration reads the raw old save before defaults and normalization can erase the distinction between an absent term and an explicit finite term. It inventories canonical world contracts, player-platform licences, AI-platform contracts, production release projections, `activeReleases`, `pastProjects`, owned-studio catalogues, and signed offer/session references. It records source/provenance for every inferred protection. The migration is versioned, idempotent, and staged through the existing verified-save promotion path; a failure leaves the prior complete save authoritative.

Rights are classified in this precedence order:

1. Explicit canonical contract or licence terms win. Preserve buyer, seller, territories, duration/permanence, exclusivity, settled payments, and status. Do not revive an explicitly expired or terminated finite contract.
2. A provable old completed bid or streaming-platform placement with no explicit end term becomes a permanent exclusive streaming position for that buyer. If territory is absent, protect it globally. Existing payments are recorded as already settled; no new cash movement occurs. If an earlier migration synthesized a 52-week `PRODUCTION_RELEASE` contract from that same old placement, reconcile that single contract rather than create a second one, and only promote it when provenance proves the underlying deal was indefinite.
3. A provable sale with unknown buyer or conflicting evidence produces a non-listable rights hold with a reason, not a guessed buyer, charge, or expiry. It is visible in migration diagnostics and cannot be silently sold.
4. A title with no sale, hold, or conflicting ownership is eligible to be evaluated for new rights opportunities. Eligibility still depends on release status, seller authority, country, window, and existing overlapping positions.

Permanent means permanent streaming control in its protected scope, not automatic ownership of the underlying copyright/IP or all ancillary rights. A studio-produced film sold to a rival remains in the world and in that studio's credits, but the player's platform cannot link it as free owned content. A permanent title bought by the player's platform remains playable in its allowed scope without renewal. Rights transfers and sublicensing occur only through the existing explicit transaction rules; the library generator never grants them.

The migration report records counts of preserved titles, explicit finite deals, permanent legacy protections, unresolved holds, seeded titles, and duplicate/lineage conflicts. Data already discarded by an older save cannot be reconstructed exactly; seed titles fill world supply without impersonating lost projects. Re-running migration must produce the same IDs and counts.

## Awards and reputation

Past seeded releases have rating and prestige but no invented nominations or past wins. Existing `awardHistory` and project award profiles remain authoritative. A seeded release from the current or immediately preceding game-year award window may enter only a future unresolved ballot when its actual release week has passed and the existing `isWorldProjectEligibleForAwardSeason` rule accepts it. Film awards currently use the following award year; Emmy eligibility also depends on the invite-week boundary. An award show already resolved in the save is never reopened or retroactively changed.

Eligible seeded contenders must have the metadata needed by the existing category filters (media type, genre, quality, rating, and deterministic craft profile). Public ratings and prestige affect market demand and pricing through the same resolved-title view, but buying streaming rights does not transfer a producer's award or manufacture an accolade for the buyer. New simulation-generated projects retain their actual award outcomes and outrank inferred seed data when identities collide.

## Marketplace and rivalry

The candidate pool includes saved released titles and seeded historical titles, then passes every candidate through the shared rights-compatibility check before an offer is displayed or signed. Both listing generation and final settlement recheck the exact title, seller, countries, exclusivity, start/end, and current ledger revision. A displayed offer may disappear if rights changed; no money moves on a failed settlement. Collections consist only of independently compatible components and fail atomically if any component becomes unavailable.

The existing three-week discovery cycle remains, with a small direct shelf, collections, and auctions rather than 2,000 cards at once. The full library is searchable/filterable by title, genre, language, producer, age, and quality; discovery rotates by saved seed. Prices vary with rating, prestige, commercial reach, title age, territory, exclusivity, and duration. Seeding does not insert historical licence payments or rival income into the player's save.

Rivals may hold starting positions in some seed titles and continue producing and buying new work. Those holdings are explicit deterministic opening claims, not financial transactions posted to the player's past. The protected starter shelf excludes rival bids for a limited time but does not freeze the whole rival world. Proposed initial tuning: protect the shelf until the player has 25 titles actually playable in at least one active entered market, or 12 game weeks pass, whichever happens first. A newly incorporated platform starts that clock at incorporation. An existing platform first receiving the library in an update starts it at the migration week, so an older empty platform still gets a fair opening; a platform already at 25 playable titles needs no grace. Save the clock's anchor so later app updates cannot restart it. During that interval, protected listings use normal prices and valid rights; the player is not given free titles. After the threshold, unpurchased protected listings join ordinary rival competition. These numbers are balance defaults for review and must be tested against poor and wealthy saves before release.

## Interfaces and failure behavior

The Content Market distinguishes `Available`, `Held by another platform`, `Already in your catalogue`, and `Rights unresolved` when a title is inspected. It does not show locked titles as purchasable cards. Owned-studio imports explain when an older streaming sale blocks a title in a selected market. A permanent legacy position displays `Permanent streaming rights` with its buyer and scope, not an expiry or renewal button. A missing catalogue batch or invalid seed version is a load/integrity error, never an empty market treated as healthy.

The library resolver is read-only; migration owns historical reconciliation; the rights ledger owns availability; market services own discovery and pricing; awards logic owns eligibility. This separation prevents a UI card, seed generator, or rival scoring function from inventing a right.

## Phased delivery and acceptance gates

1. **Baseline and rights fixtures.** Capture new, early, mature, and acquired-platform saves; inventory current projects, archived credits, canonical contracts, bidder-only placements, and missing terms. Add failing preservation/compatibility tests before changing migration. No live save is altered for test setup.
2. **Rights-first migration.** Reconcile explicit and implicit old deals, including already-synthesized 52-week legacy contracts, into permanent/finite/held classifications. Gate: no duplicate contract, renewed fee, lost buyer, relisted permanent title, or change to an explicit finite term. Repeated migration and save/reopen produce identical rights.
3. **Library foundation.** Add stable versioned seed and unified title resolver; preserve existing records, distribute remaining titles among studios, and keep the 2,000-title library outside hot `world.projects`. Gate: deterministic IDs/data, no lost saved projects, bounded save/transfer growth, and identical library after reopen/update.
4. **Reputation and awards.** Add historical ratings/prestige and restricted upcoming-award eligibility. Gate: no invented prior winners, no resolved ballot changes, no unreleased title nominated, and existing award fixtures unchanged.
5. **Market integration.** Feed only rights-valid library titles to direct listings, collections, search, and final settlement. Gate: wealthy new/old saves have useful supply, sold old films cannot be bought twice, and competing/expired contracts remain consistent by territory.
6. **Starter pacing and rivals.** Add protected first-look shelf and later genuine rival contest. Gate: first-look ends at the specified threshold, grants no free rights, rival-owned titles stay protected, and the market still offers a genre/language/value mix after competition begins.
7. **Release hardening.** Run save-integrity/migration/export-import checks, deterministic long-career simulation, award seasons, low-memory/mobile performance, interrupted-save recovery, and UI walkthroughs. Activate on iOS/Android only after old-save round trips and device validation pass; retain a format/feature gate and a safe rollback path.

## Non-goals

No real IMDb API, real film database, retroactive box-office or award history, automatic IP transfer, fabricated old financial settlement, deletion of saved project/rights data, or conversion of an old permanent purchase into a subscription-like renewable licence. The separate career-history archive is not implemented by this feature; integration with it is future work with a shared stable-ID contract.
