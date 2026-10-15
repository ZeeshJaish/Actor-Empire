# Auction identity, clock and funding terms

Implemented in the main Actor Empire working directory. No commit or GitHub push performed for this feature.

## Player-facing behavior

- Own platform uses its saved brand color, a YOUR PLATFORM badge and distinct standing/leader treatment; rival cards use their own brands.
- Meaningful late bids add3 usable seconds, including at the former45-second wall. Absolute room limit75 seconds. Unchanged offers and withdraw/repeat offers cannot extend the clock; weaker revisions cannot extend it. Revision ids remain unique after withdrawal.
- New auction offers have no marketing guarantee. Upfront and backend remain; current production funding is available for unfinished upcoming-rights productions.
- Future funding starts off. Customize new original, film sequel or series next season;1–3 titles; budget per title; unrestricted/live action/animated/anime format; platform rights share; firm commitment or optional deal.
- NPC future production delivery deadline52 weeks from signing/exercise. Firm funds reserve during bidding, pay once when actual production starts. Option funds reserve/pay only on explicit exercise. Available productions start in the signing/exercise week.
- Funded productions have canonical production calendars, talent bookings, exact linked quantity/lineage, Originals Studio records and delivered licenses/rights/release plans. Saved Funding Deals supports activation after leaving the room/reloading.
- Failed orders release unspent reserves, cancel unfinished canonical productions and release talent bookings, remove unfinished active Originals entries, and notify once. Already spent funds are not refunded. Retries never invent prior production progress.
- New player production-house future-season locked funds explicitly have26-week deadlines. Existing funds missing the new field retain their historical104-week contract behavior.
- Signed auction prices/backend preserve exact selected terms rather than inheriting private negotiation rounding, backend clamps or hidden marketing/viewership promises. Existing signed legacy contracts are preserved.

## Verified

- `npm run build` and `npm run lint` passed.
- CM1, CM2, CM3, CM4 audits passed (legacy marketing/boolean-only auction fixtures updated to the approved structured terms).
- `npm run audit:auction-terms`: old-cap last2 seconds->5, duplicate/reentry behavior, firm/option exposure, invalid terms, JSON persistence, exact signing price/backend, actual weekly processor through funded delivery, minority rights preservation.
- `npm run audit:auction-funding`: real canonical production, count/format/lineage, Originals/program schedule, serialize/normalize before every week, replay, option affordability/activation, deadline failure, reserve release and actual late-start handling.
- `npm run audit:funded-deadlines`: new26, legacy104, extensions, warnings, consumed funds and invalid legacy field fallback.
- Isolated browser: actual market navigation, form selections and budget update, bid submission, distinct own-platform row and extension feedback, no auction marketing text,320/390px screens without horizontal overflow. Saved option survived reload and UI activation charged exactly$10M and created2 productions.
- `git diff --check` passed. Native/device gameplay not exercised in this feature pass.

Screenshots: `output/playwright/auction-future-funding-390.png`, `auction-own-platform-320.png`, `auction-saved-option-320.png`.

Local development URL: http://127.0.0.1:5186/ . QA browser uses development-only in-memory/sessionStorage fixtures; real career slots were not modified.
