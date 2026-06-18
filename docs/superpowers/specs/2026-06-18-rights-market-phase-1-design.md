# Hollywood Power Plays: Phase 1 Rights Market

## Purpose

Phase 1 creates a rotating Rights Market inside the existing `IP & Universes`
area. It should make the player feel like a studio chief discovering valuable
entertainment properties before rival studios do.

This is not another Script Vault and it is not a business dashboard.

- Development Lab remains the place where the player creates and develops
  projects.
- Development Lab's Market remains the place for scripts, books, life rights,
  documentary access, and other production-ready source material.
- The Rights Market is where the player discovers larger ownership
  opportunities: characters, catalogs, dormant franchises, failed sagas, and
  other properties that can later power multiple projects.

Phase 1 builds discovery, urgency, collection intent, and market rotation. Deep
research arrives in Phase 2, while negotiation and purchasing arrive in Phase
3.

## Player Fantasy

The emotional promise is:

> I noticed the next major franchise before everyone else.

The market must make the player ask:

- Is this forgotten property secretly valuable?
- Why is another studio watching it?
- Should I track it before the opportunity disappears?
- Can my studio afford to compete for properties at this level?

## Entry Point

The existing `IP & Universes > Acquisitions` tab becomes `Rights Market`.

The screen opens as a cinematic industry intelligence board rather than an
e-commerce list. It uses the game's established black, zinc, amber, and white
Production House visual language.

The existing Development Lab tabs and behavior are not removed or relocated.

## Opportunity Types

Phase 1 ships with six fictional property archetypes:

1. Dormant Hero
   - High universe potential
   - High fan scrutiny
   - Usually expensive and contested
2. Cult Horror
   - Small but loyal fanbase
   - Affordable
   - Strong streaming and reboot potential
3. Failed Blockbuster Saga
   - Damaged public reputation
   - Large hidden upside
   - High financial risk
4. Viral Story Property
   - Fast-growing attention
   - Short availability window
   - Rivals may enter quickly
5. Streaming Catalog
   - Several related legacy titles
   - Reliable library value
   - Lower theatrical upside
6. Prestige Property
   - Awards and reputation potential
   - Smaller commercial ceiling
   - Attractive to prestige-focused studios

All names, studios, characters, and histories are fictional.

## Opportunity Data

Rights opportunities use their own save model rather than pretending to be
scripts.

Each opportunity stores:

- `id`
- `title`
- `archetype`
- `propertyType`
- `primaryGenre`
- `shortPitch`
- `sellerName`
- `askingPrice`
- `rarity`
- `fanbase`
- `publicRisk`
- `visibleUpside`
- `rivalInterest`
- `listedAtWeek`
- `expiresAtWeek`
- `marketStatus`
- `isTracked`
- deterministic visual identity fields such as accent and emblem key
- Phase 2 placeholder fields for unrevealed intelligence

`StudioState` gains a separate `rightsMarket` collection and rights-market
refresh metadata. Existing `ipMarket` data remains untouched for Development
Lab compatibility.

Old saves receive a generated Rights Market the first time this screen is
opened. No current scripts, franchises, universes, or purchases are deleted.

## Market Rotation

The market contains six active opportunities.

- Opportunities have individual availability windows between 3 and 10 game
  weeks.
- Expired opportunities leave the board.
- Natural market replenishment occurs in four-week market cycles.
- Empty slots are filled without replacing valid opportunities the player is
  already considering.
- Rarity controls appearance frequency:
  - Common: 50%
  - Uncommon: 30%
  - Rare: 16%
  - Legendary: 4%
- Legendary opportunities require a studio with credible prestige or capital;
  early studios should not constantly see impossible billion-dollar listings.

### Scouting Refresh

The existing unlimited reroll button is replaced by `Commission Scouting`.

- Cost: $250,000
- Adds up to two fresh leads without deleting the whole board.
- Available once per natural four-week market cycle.
- Cannot force or increase Legendary odds.
- Cannot restore an expired opportunity.

This prevents players from repeatedly rerolling until they receive the best
property.

## Market Screen

### Header

The compact header shows:

- Rights Market title
- Current studio funds
- Time until the next industry cycle
- Commission Scouting action and availability

### Featured Opportunity

One opportunity is selected as the market's featured lead based on rarity,
rival interest, and time pressure.

It receives the largest visual treatment:

- Property emblem
- Classified file treatment
- Rarity stamp
- Asking price
- Expiry countdown
- Rival studio pressure
- One strength and one warning
- `Track Opportunity` action

This creates a strong first focal point rather than six equal cards.

### Remaining Opportunities

The other five appear as compact dossier rows/cards with:

- Title and archetype
- Genre
- Asking price
- Risk/upside pair
- Rival interest
- Expiry
- Tracked state

Cards are not filled with every statistic. Phase 2 intelligence appears as
locked or classified rather than exposing unfinished mechanics.

### Filters

Only useful filters are shown:

- All
- Affordable
- High Interest
- Expiring
- Tracked

Filters use a compact segmented strip and do not create another navigation
layer.

## Player Actions in Phase 1

### Track Opportunity

Tracking is free and limited to three simultaneous opportunities.

- Tracked opportunities move into a compact watch strip at the top.
- Tracking does not reserve rights or stop rivals.
- A tracked opportunity receives clearer expiry and rival-pressure feedback.
- When a tracked opportunity expires, it moves to a short lost-opportunity
  notice rather than disappearing silently.

The three-item limit forces prioritization without adding contract complexity.

### Open Lead

Tapping a card opens a lightweight lead sheet containing only currently public
information. It is not the full Phase 2 dossier.

The lead sheet shows:

- What the property is
- Why it is available
- Publicly known opportunity
- Publicly known concern
- Seller and asking price
- Expiry and rival interest

The closing panel previews:

> Full investigation and deal actions unlock in the next Power Plays phase.

No fake purchase button is shown. The current one-click `Buyout IP` behavior is
removed from this screen only; Development Lab's existing source-material
purchase flow remains operational.

## Visual Direction

The interface should feel like a Hollywood intelligence room:

- Dark studio background
- Warm amber for opportunity and ownership
- Muted red for rival pressure and expiry danger
- Off-white paper details for lead sheets
- Classified stamps, studio seals, file tabs, and restrained film grain
- Original fictional emblems made from the existing icon system

Motion is reserved for meaningful events:

- A new market cycle deals files onto the board
- Tracking stamps a file and moves it into the watch strip
- Rival interest escalating produces a brief red pulse
- An expiring lead gains restrained urgency in its final week

There should be no constant pulsing, floating, or decorative animation.

## Responsive Behavior

### Mobile

- Featured dossier occupies the primary viewport width.
- Remaining opportunities use one-column compact rows.
- Filters scroll horizontally.
- Lead sheet opens as a full-screen game surface.
- Price, expiry, and primary action remain visible without horizontal
  compression.

### Desktop

- Featured lead uses a wide hero dossier.
- Remaining opportunities use a two-column layout.
- Lead sheet can use a centered cinematic overlay.

Both layouts preserve the existing Production House navigation and safe-area
spacing.

## Game Feedback

Phase 1 adds concise studio log/news feedback for:

- Rights Market cycle refreshed
- Scouting commissioned
- Opportunity tracked
- Tracked opportunity entering its final week
- Tracked opportunity lost or expired

No global news story is generated merely for viewing or tracking an
opportunity. Public trade headlines are reserved for actual deals in later
phases.

## Architecture

The implementation is separated into:

1. Rights-market domain types
2. Deterministic opportunity generator and market-advance service
3. Save normalization and old-save migration
4. Rights Market screen components
5. Tracking and scouting actions
6. Focused tests for generation, expiry, rarity, limits, and save safety

The generator must not run directly during React rendering. Generated
opportunities are persisted so reopening the screen does not change the market.

## Failure and Edge Cases

- Missing market data: initialize safely.
- Duplicate generated titles: reject and regenerate.
- Player cannot afford scouting: disable action and explain required funds.
- Scouting already used this cycle: show next available cycle.
- Tracking a fourth item: require the player to untrack one first.
- Opportunity expires while tracked: remove it from active listings and record
  a lost-opportunity notice.
- Game week jumps several cycles: expire old listings once and refill to six;
  do not repeatedly charge or generate duplicate notices.
- Existing `ipMarket` scripts: remain untouched.

## Verification

### Automated

- Generates six unique fictional opportunities.
- Rarity and affordability gates behave correctly.
- Market remains stable during rerenders.
- Natural cycles preserve unexpired opportunities.
- Expired opportunities are removed and replaced.
- Scouting can be used only once per cycle.
- Scouting adds at most two leads and cannot increase Legendary odds.
- Tracking is limited to three.
- Old saves initialize without data loss.
- Existing Development Lab IP purchases still work.

### Visual

- Test common mobile widths including 393px.
- Test wide desktop layout.
- Confirm titles, prices, countdowns, and buttons never overlap.
- Confirm featured lead remains the clear focal point.
- Confirm lead sheet and filters do not scroll the page behind them.
- Confirm reduced-motion behavior.

## Explicitly Deferred

The following are not part of Phase 1:

- Paid investigation
- Hidden intelligence reveals
- Negotiation
- Licensing, options, or buyouts
- Contract signing
- Rights Library
- Rival offer resolution
- Studio acquisitions

Their data boundaries are anticipated, but Phase 1 does not expose incomplete
buttons or simulate fake transactions.
