# Content Market CM4 implementation report

## Outcome

CM4 completes the unified Content Market roadmap. A real independent production can now announce a future streaming-rights sale, receive a saved opening week, be followed by the player, open through the existing CM3 auction room, and settle into the canonical rights registry.

Winning the sale does not manufacture a finished title. The licence begins at its saved availability week and the Content Desk reports the title as **In production** until the canonical production reaches delivery. Later production delays move both the player licence and actor-neutral world contract together.

## Player-visible flow

1. Content Market now has **Upcoming** beside Your offers and Live auctions.
2. Each future title shows its rights holder, bidding week, expected availability, opening level, markets, public-interest estimate, and the real signals behind that estimate.
3. Follow creates an opening-week Message. The message opens the exact future lot in Content Market.
4. When live, the title enters the existing contract-shaped auction room. Upfront guarantee, backend, marketing, future-greenlight terms, rival revisions, room pressure, and saved recovery continue to use CM3.
5. A win adds a future-dated licence to the Content Desk. It can be reviewed immediately but cannot be scheduled or played before delivery and availability.
6. If another platform wins or the reserve is missed, Upcoming records the loss or no-sale. If the production or rights become invalid, the sale is withdrawn.

## Shared system connections

- Canonical B6 industry productions supply title identity, studio, talent package, progress, quality outlook, problems, planned release, and verified result signals.
- A3/A4/A6 rights compatibility prevents impossible country/window/exclusivity lots.
- CM3 supplies the live auction, rival budgets, realtime recovery, bidding terms, commitment accounting, and settlement record.
- The shared rights registry supplies permanent contract history, exact territory scope, start/expiry dates, and later renewal handling.
- Content availability and Content Desk presentation distinguish acquired future access from a playable title.
- Project C industry events, News, X, YouTube, and attributed claims publish confirmed announcements/results and clearly label rumours as unconfirmed. Private bid economics are not published.
- The single industry-world week coordinator discovers, opens, reconciles, and publishes CM4 activity exactly once per entered week.

## Save and performance boundaries

- Older saves normalize with an empty Upcoming list; no fabricated rights or messages are created.
- Upcoming records are deduplicated and capped at 80 retained entries.
- Opening notifications, industry events, contracts, auction settlement, and delay facts use deterministic idempotency keys.
- Closed listings can age out of the active UI while the canonical world contract remains permanent history.
- The focused audit measures a representative oversized queue during verification; no 400-year simulation is required for this phase.

## Verification gates

- CM1 direct purchases, studio imports, collection allocation, funds, and reload.
- CM2 delayed private offers and confidential settlement.
- CM3 buyer auction win/loss, contract-shaped bids, saved sessions, and canonical settlement.
- CM4 scheduled discovery, watch notification, AI/no-sale resolution, player win, delay, delivery gate, event-backed coverage, rumour attribution, idempotency, bounds, and weekly-cost measurement.
- A4 rights calendar, Phase 7 Originals, Phase 8 launch, B7 industry-world coordinator/events, and Project C media compatibility.
- 320 px mobile browser walkthrough for Upcoming and the future-auction handoff.
- TypeScript no-emit check, whitespace validation, and production build.
