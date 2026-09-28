# Shared streaming marketplace, first look, and marquee slate — design

Date: 2026-09-25

Status: User approved the in-chat direction; written-spec review pending. No implementation in this document.

Scope: Phases 5 and 6 of `2026-09-25-shared-streaming-library-and-legacy-rights-design.md`, plus a small premium fictional title batch. Phases 1–4 already exist locally. Phase 7 release/device hardening remains separate.

## Player experience

The Content Market has a useful rotating shelf immediately after library migration, even if a wealthy player starts a platform before normal world production has generated many titles. The library is shared: a title keeps one canonical identity and one producer, while the player's and rivals' streaming rights are separate positions. Searching the library does not turn every title into an offer; unavailable titles explain whether they are held by another platform, already in the player's catalogue, blocked by unresolved rights, or outside the current sale window.

A scarce marquee tier supplies recognisable in-game anchors. The batch contains 16 original fictional titles: 12 movies and four series, across multiple genres, languages, and producers. Each has a distinctive authored name, quality 90–98, public in-game rating 8.6–9.5, high but varied reach/prestige, and a premium licensing reference value. These are not real films or live IMDb ratings. No title is gifted to the player or automatically declared a platform original. A platform can make one a signature exclusive only by acquiring valid exclusive rights in the relevant markets and window. Existing viewing and catalogue-strength calculations should consume its high quality/rating through normal title data; this feature adds no new audience, subscriber, or revenue subsystem.

## Versioned library extension

The existing historical v1 generator is immutable. Add a separate deterministic v2 marquee batch with stable names and IDs derived from the saved library seed and v2 index. Save only the v2 activation/version and any explicit rights state, not 16 hot `world.projects` records. New and already-migrated saves activate the same v2 batch once; migration is idempotent, and older v1 IDs, titles, producer snapshots, ratings, and awards never change. Choose producers from the frozen non-player roster, respecting each producer's earliest year; no player-owned studio gains fabricated titles. All marquee release dates precede activation, so they create no historical nominations or wins and cannot enter a ceremony whose ballot was already set.

If an exceptional save lacks a valid v1 recipe, loading fails through the existing integrity boundary rather than presenting a silently empty market. A deterministic ID collision with a surviving saved project resolves to the saved project; it never overwrites the saved result.

## Phase 5: rights-valid market integration

The saved-first library resolver feeds the marketplace candidate pool. Candidate eligibility is evaluated against current time, canonical contracts, legacy rights holds, ownership, seller authority, territories, exclusivity, and window type. Existing protected permanent legacy purchases are never relisted. Expired finite rights do not become permanent; an unsold title can return to supply when a compatible window is free.

The three-week market cycle keeps the existing 12-title direct shelf and collection/auction limits. Search and filters can inspect the full shared library by title, type, genre, language, producer, release age, quality, and marquee tier; result state is explicit, and only rights-valid offers have purchase actions. The direct shelf reserves up to two positions for available marquee titles and fills the rest with mid-price, long-tail, genre, and language variety rather than only the highest-rating titles. When no marquee title is compatible, those positions revert to ordinary titles.

Direct offers and collection rows carry an exact title/rights-lot snapshot or revision signature. On private offer, auction settlement, direct purchase, and collection signing, re-resolve title identity and validate seller, country set, start/end, exclusivity, window, and current rights registry. A stale, conflicting, or now-held offer fails without a treasury charge, contract, or partial collection. Collections are atomic. Prices use existing quote/reference paths with quality, rating, prestige, reach, age, territory, duration, and exclusivity inputs. Marquee titles apply a 2× multiplier to the comparable ordinary reference value before normal term and negotiation factors; it is not a separate cash mechanic.

## Phase 6: first-look pacing and rival contest

Persist a starter-grace anchor once per platform/library migration. A new platform starts at incorporation; an existing platform first receiving the library starts at that migration week. The first-look set contains 12 deterministic compatible titles, including at most two marquee choices. Those titles retain normal prices and must pass all rights checks. The grace ends at the earlier of 25 titles actually playable in at least one active entered market or 12 game weeks after the anchor. Reopening, migration, and app update never restart the clock. A platform already at 25 playable titles has no grace.

During grace, only the protected 12-title set is withheld from new rival acquisition; rivals continue to produce and contest the rest of the world. Existing rival or legacy positions are never displaced by first-look. Up to 24 rival opening positions in other seeded titles are explicit, deterministic canonical rights claims with no invented historical payment or player expense. After grace, unpurchased starter titles enter normal rival competition. Rival wins persist as actual rights positions; the player sees them as held, not as purchasable. The market continues to rotate available value and genre/language variety after competition begins.

## Boundaries and acceptance

No change to existing film IP ownership, permanent legacy streaming positions, explicit finite terms, historical payments, prior awards, or saved release metadata. No real film titles, free marquee licence, fabricated prior audience results, or 2,016-object hot-save copy. Do not treat rights held by a rival as still available merely because a title remains in the shared library.

Focused tests cover new/old rich and poor saves; v1/v2 identity replay; marquee quality and price; no invented awards; rights holds and permanent purchases; territory/window conflicts; direct, search, package, auction, private offer, and atomic settlement paths; migration/reopen; exact 25-title and 12-week grace boundaries; rival acquisition before/after grace; and save size/integrity. Run existing rights, catalogue, save-transfer, awards, and build checks. Report pre-existing failures separately. This local phase does not include the Phase 7 device/release gate.
