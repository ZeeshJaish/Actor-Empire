# Market-born streaming opportunities and shared supply — design

Date: 2026-09-25

Status: Superseded for future planning by `2026-09-27-streaming-content-market-and-studio-talent-roadmap-design.md`. Historical context only; its 15-lightweight-offer and single-lane assumptions are no longer the proposal. This document changes no gameplay or save data.

Scope: A recurring shared Content Market supply lane, integration with real studio productions and the existing historical library, rival acquisition, and the point at which a market-born offer becomes a released world title.

## Player contract

The Content Market has three sources, with different permanence rules:

| Source | Before a streaming deal | If no platform buys | If a platform buys |
| --- | --- | --- | --- |
| Existing historical library | A released, canonical film or series; the 2,000-title base and its 16 marquee titles remain intact | It stays in the world; compatible rights may be offered again | A rights position changes, not the film's producer or past results |
| Real studio production or platform commission | A canonical production with its own lifecycle and, where eligible, a future-rights sale | Production and release continue under their existing rules | The buyer obtains only the contracted streaming window; production and release remain canonical |
| Market-born opportunity | A lightweight, shared distribution-seeking offer, not yet a public release | The offer expires or is withdrawn; no full project, rating, viewers, or award is invented | One canonical project identity and the exact streaming deal are saved; public film results begin only at actual release |

The generator creates **15 new market-born opportunities per three-game-week world cycle**, not 15 per platform. It is an additional source, not a replacement for either the historical library or real productions. The player and all eligible rival platforms view the same offer IDs and compete under the same rights ledger. A wealthy platform can buy more content, but it cannot receive a duplicate private version of a title or bypass price, scope, and compatibility rules.

## Approaches considered

1. **Recommended: compact shared opportunities with promotion on sale.** Generate only lightweight offers; persist winners as canonical projects and contracts. This keeps the market busy without putting every unsold listing into the full simulation.
2. Generate 15 full world projects each cycle. This makes unsold releases real, but would add roughly 260 simulated projects per game year before real studios and commissions, inflating saves, ratings, awards, and news.
3. Give each platform a private generated inventory. This fills screens cheaply, but destroys title identity and makes rival rights competition untrustworthy.

The production-house IP Market is a presentation precedent, not a technical generator to copy: its UI-driven `Math.random()`/`Date.now()` refresh would reroll shared streaming offers on reopen. The new lane must run in the deterministic, exactly-once weekly world pipeline.

## Market-born offer lifecycle

At each cycle boundary, a versioned generator derives 15 globally shared offer IDs from the save's stable market seed, generator version, absolute cycle, and slot. **All 15 are available for licensing now**; none is a future studio production or an Upcoming sale. The mix spans film and series, genres, languages, seller regions, and price tiers. At most one offer in every fourth cycle is marked as a scarce, high-potential featured listing; other cycles may have strong titles but no guaranteed marquee. These are starting balance values to test, not promises that every cycle contains a hit.

An offer contains a fictional title and logline, format, genre, language, lightweight independent rights-holder identity, forecast quality and public-interest band, asking price, exact available rights/territories/modes, and a three-week sale window. It does **not** contain a future delivery date, public rating, box-office result, award, detailed cast/crew schedule, or historical payment. A forecast is labeled as such in the UI. The initial generator uses independent sellers without simulated studio treasuries; named game studios reach this market through their genuine production lane, avoiding imaginary producer spending or income.

Available now means the underlying work is complete and its streaming rights can be bought immediately; it does not mean the film has publicly premiered or automatically appears on a platform. The buyer still needs a valid licence, an active platform and market, and an actual release or catalogue scheduling step. Generated offers do not simulate filming, future delivery, or production delays. Real studio productions can have genuine future dates, delays, cancellations, and changed windows under their existing rules.

Every generated offer is live during its current three-week cycle and then expires if unbought. Open negotiations and auction rooms finish under their recorded deadlines rather than vanishing during rotation. Unacquired offers are discarded without creating a world project or a world-news trail, including featured listings. Opening or closing the Market within a cycle never creates another batch or rerolls the current one.

The first successful acquisition atomically promotes the offer into one compact canonical project record, creates its rights contract, debits the winning platform once, and records a seller settlement without replaying past finances. Later compatible non-exclusive or territorial deals reference that same project ID. An exclusive window permits only one compatible winner. An acquired project remains saved even if its first buyer later fails, lets rights lapse, or never schedules a premiere.

Acquisition is **not** itself a release. The buyer can schedule a generated title's first premiere through the existing player launch/catalogue flow or a deterministic rival release plan without waiting for filming or delivery. Viewing still requires an active platform, a licensed market, and the actual premiere. Contract start and expiry are explicit; delaying a platform launch does not secretly extend a finite term. On actual premiere, the project enters the released-title resolver and receives a deterministic in-game public rating, viewing/commercial result, and eligible future award participation. Its producer remains the independent rights holder; a streaming licence is not an IP purchase or a platform original.

## Real productions and existing rights

The 2,000-title historical recipe and 16-title marquee extension are immutable. Existing saved releases, old permanent purchases, explicit finite windows, and unresolved legacy holds retain precedence over any new offer. The generator never synthesizes another copy of a saved title or relists protected old rights.

Real independent studio productions remain canonical whether or not a streamer buys them. The existing upcoming-rights pipeline already exposes announced sales, future availability, delay handling, and contract signing to the player's platform, but that sale state is currently player-local. A shared discovery projection must derive real studio sales from their canonical production IDs for rival participation; existing player-local followed sales, signed sessions, and contracts retain their IDs and authority during migration. The projection cannot create a second sale or charge. Platform originals continue through the commissioning/production pipeline and are not generated as third-party market lots.

## Awards, ratings, news, and audience

Market-born offers may have a **Featured** or high-potential label inside the Market, but generate no world news before acquisition; an unbought offer must be able to vanish cleanly. Genuine studio productions may generate pre-sale trade buzz when their actual production and future-rights sale support it. Neither kind of pre-release copy may claim a film has released, earned an IMDb-style in-game rating, or won an award.

The signed deal may create a rights-acquisition fact. The first actual public release creates the release/review/viewing facts; a later season may consider the film or series under the existing award-year and media-type rules. No ceremony already resolved or ballot already frozen is reopened. The same canonical title is released once even when several platforms hold compatible windows. Acquiring streaming rights does not transfer the producer's award credit or manufacture prior wins. Historical titles retain their existing seeded ratings and no fabricated past awards.

Forecast quality and demand guide price and rival interest. Final creative quality is deterministic from the saved offer seed and is not rerolled by reopening or the winner's identity. Platform marketing, market reach, access modes, and competing services affect viewing and commercial results through existing systems; they do not rewrite the film's intrinsic quality. A title is playable only where the buyer has an active market and a valid rights route.

## Thirty-three-platform competition and stock balance

The 15 offers are one world batch. Every eligible player, core rival, and generated operator uses a shared offer/rights authority rather than a player-specific copy. AI bidding considers genre/language fit, active countries, catalogue gaps, remaining treasury and operating runway, bid history, and price. Rival decisions are staggered and bounded by operating capacity so 33 platforms do not each buy every cycle. Large platforms may have larger libraries, but repeated similar titles yield diminishing marginal value. Exclusive global rights are scarce and expensive; regional or non-exclusive positions let one world film serve multiple platforms without duplicate project identities.

Fifteen new offers alone cannot seed convincing libraries for 33 established operators. Rival opening catalogues therefore need a separate, compact, rights-valid baseline from the shared historical library, scaled by platform maturity and footprint. The existing 24 opening claims across all core rivals are not sufficient for that goal. Any expanded positions must be deterministic, preserve earlier contracts, and respect territory/window overlap; no fictional past cash charges are posted. The player's existing 12-title first-look rule remains normal-price and ends at 25 actually playable titles or 12 weeks, whichever comes first. Those first-look titles must stay discoverable/purchasable during grace rather than rotate out unseen.

The Market shows all 15 currently licensable generated opportunities in a dedicated "Fresh this cycle" presentation, in addition to the current rights-valid historical shelf, genuine studio productions in the existing Upcoming/Hot rights section, collections, and auctions. Generated offers never appear in Upcoming. Search continues to show one canonical title and a clear status: buyable now, future studio window, held, owned, or unresolved. The market does not present the entire 2,000-title library as 2,000 simultaneous sale cards.

Supply tuning starts at 15 new offers per cycle and measures the combined rights-valid stock, acquisition rate, genre/language mix, player affordability, rival catalogue depth, and unsold expiry over long careers. If multi-cycle tests show repeated empty markets, a capped *global* top-up may be added without granting private player titles or overriding rights. The top-up is a later balance choice driven by those measurements, not an unlimited generator in this design.

## Persistence and integration boundaries

- A world-owned, versioned offer ledger saves the current cycle, active offers, bids/sessions, and exactly-once processing checkpoint. Player and rival UI read projections of that same ledger. Internal dates use absolute game weeks; player-facing dates use the game's year/week convention. Migration starts future generation at activation week; it does not backfill fictional past winners.
- Only acquired market-born titles enter a compact persistent title archive. Full `world.projects` records exist for the active release/award window or when a referenced result requires them; unsold candidates never enter that hot collection.
- Existing title resolution remains saved-first. The historical v1/v2 generator is unchanged; the new archive has its own provenance and stable IDs. Rights compatibility and final settlement recheck title, seller, buyer, countries, window, exclusivity, dates, and current ledger revision before any treasury mutation.
- Sale promotion, contract registration, seller/buyer accounting, and cycle checkpoint are one atomic save transition. Replaying a week, reopening, interrupted saving, or exporting/importing cannot create another buyer, project, payment, or news fact.
- The market generator runs in the weekly world sequence before rival market decisions and news projection, not in a React mount/effect. The production-house generator's refresh mechanism is not reused.
- New saves and long-running saves get the same future cadence. Old purchased rights and current player negotiations are preserved; unsupported/corrupt generator state triggers the existing save-integrity recovery path rather than silently rebuilding or emptying the market.

## Delivery slices and acceptance

1. **Shared offer foundation:** deterministic 15-offer cycle, expiry, stable IDs, compact save state, and migration/reopen tests. No purchased rights or public results yet.
2. **Settlement and promotion:** player/rival bids, exact rights compatibility, one canonical title, one winner per exclusive lot, compatible multiple positions only for non-exclusive/territorial windows, finance idempotency, immediate generated-title availability, and old-contract non-regression.
3. **World consequences:** premiere, viewing, review, award-season timing, and restrained acquisition/release news for generated titles; no unsold project leaks into results. Genuine studio productions may separately generate pre-sale trade news.
4. **Rival depth and market presentation:** credible opening positions, first-look shelf visibility, all fresh available-now offers visible, and shared competition for generated current lots and genuine studio Upcoming sales.
5. **Long-career/release hardening:** rich/poor new and old saves, 33-platform stress, multiple decades, save size, deterministic replay, interrupted-save recovery, export/import, low-memory browser/mobile performance, and device validation before iOS/Android activation.

The acceptance gate is behavioral: no empty mature market caused solely by supply generation; no title identity duplication; no double payment; no expired or unavailable right sold; no award before actual release; no real studio project discarded for lack of a streamer; no platform catalogue inflated with unpaid titles; and no activation on mobile before old-save and device round trips pass.

## Non-goals

No real film/IP database, real IMDb integration, automatic transfer of underlying film ownership, full production simulation for every unsold generated offer, retroactive results for old saves, unlimited AI purchases, or guaranteed award win for a high-buzz title.
