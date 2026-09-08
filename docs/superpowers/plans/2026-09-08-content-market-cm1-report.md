# CM1 — Unified Content Market handoff

Implemented locally on September 8, 2026. No commit or push was requested. Unrelated work was preserved.

## What the player gets

- **Content Desk → Add Content** and the HQ **Content Market** command open the same branded market, before and after launch.
- Launch Catalogue has separate actions: **Build/Continue opening catalogue** opens the market; **Review opening catalogue** opens programming and coverage once a catalogue exists; **Open Content Desk** opens the permanent Library. Back returns to the originating Catalogue step.
- Released films, series, collections, and studio imports share search, compact title rows, and one agreement-review layout. Platform colours, logo mark, typography conventions, and contrast-aware button ink reuse the streaming presentation system.
- Individual purchases and collections use real released projects, canonical contracts, existing treasury settlement, and existing per-title collection allocations. The first acquisition establishes the opening catalogue but does not close pre-launch buying.
- Studio imports carry no fabricated internal purchase or revenue. Rights granted elsewhere exclude the relevant markets and remain excluded after import. Completely unavailable titles cannot be imported.
- Original commissioning opens the existing brief/producer/funding/Greenlight process without requiring a starter catalogue first. It does not bypass production or its actual funding/producer requirements.
- Filters, search, selected agreements, and studio selections are saved as a small market draft. Finance detours retain the selected agreement while treasury changes. Saved legacy opening agreements and existing negotiations remain accessible.

## Consistent source and availability

Library and title-detail source labels distinguish **Licensed**, **Studio import**, and **Original**. Acquired content is not automatically called Live.

The shared availability projection distinguishes in-production, future-window, ready-to-schedule, scheduled, live, expired, and unavailable content. Unfinished originals and unavailable rights do not count toward available opening content or subscriber-preview playback. The weekly programme projection also excludes unavailable titles, including studio imports subsequently blocked across the platform's markets.

Opening-country coverage counts only usable titles in that country. A US-only acquisition does not invalidate an already-valid India catalogue, and does not gain India playback rights. Missing title-country combinations remain visible.

Watching time uses available runtime information, with labelled estimates otherwise. The depth guide varies by catalogue strategy (30/40/80 hours), is informational, and is not a legal launch gate. Existing premiere requirements remain: a locked slate of at least three titles including a delivered Original, plus the existing market, infrastructure, and other launch checks. Buying content does not automatically schedule it. Licence windows begin at signing, including before launch; transfers inherit their remaining window and obligations.

## Verification

Passed:

1. `npm run audit:content-market-cm1` — repeated founding acquisitions, post-launch acquisition, studio imports, no duplicate charge, collection allocation/settlement, insufficient and reserved funds, stale listings, future availability, canonical reload, owned-country exclusions, original/dossier source, and unavailable weekly playback.
2. `npm run audit:streaming-catalog-phase6`
3. `npm run audit:streaming-rights-compatibility-phase3`
4. `npm run audit:streaming-catalogue-packages-phase5`
5. `npm run audit:streaming-launch-draft-continuity`
6. `npm run audit:streaming-opening-catalogue-phase6`
7. `npm run audit:streaming-originals-phase7`
8. `npm run audit:streaming-rights-marketplace-phase16`
9. `npm run audit:streaming-weekly-loop-phase10`
10. `npm run audit:streaming-launch-phase8`

The isolated browser audit exercises the real HQ, market, Finance, Library, dossier, opening-catalogue desk, and commissioning UI at 390px and 320px: injection and return, purchases, imports, collections, both launch return paths, draft autosave/reload, no-studio buying, and two platform brand colours. No browser page errors or Vite error overlay were observed. Test fixtures do not touch real save slots and are not imported by the game entry point.

Run it with `npm run audit:content-market-browser` when Playwright is installed, or supply `PLAYWRIGHT_MODULE` pointing to the available Playwright package. The Vite server must be running at `http://127.0.0.1:3000/`.

TypeScript passed using an 8GB compiler heap (`node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false`). The default compiler heap was insufficient for this repository; this is a build-tool limit, not a measurement of game RAM. Production build passed with the existing large-bundle/index.css warnings. `git diff --check` passed.

## Still outside CM1

CM2 adds delayed private offers and weekly replies; CM3 adds player-as-buyer auctions; CM4 adds upcoming sales and connected world reactions. No inactive placeholder tabs, new background company simulation, or 400-year endurance run were introduced here. These phases still require approval.
