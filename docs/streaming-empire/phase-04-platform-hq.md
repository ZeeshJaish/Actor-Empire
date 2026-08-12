# EMPIRE+ Phase 4 — Platform HQ

Phase 4 turns an incorporated streaming company into a coherent operating home. It does not add infrastructure purchasing, subscriptions, licensing, Originals production, or launch simulation early.

The current v7 integration is summarized in
[Streaming Empire v7 — Authoritative Handoff](./README.md).

## Player flow

1. The Phase 3 incorporation transaction completes.
2. The committed founding keynote plays from its queued cinematic fact.
3. The player enters a short Platform HQ welcome.
4. They may take, skip, resume, or replay a five-area orientation.
5. Home becomes the default command centre for launch priorities.
6. The fixed mobile navigation keeps Home, Content, Tech, Market, and Company one tap away.
7. Viewer Mode can be opened at any time to inspect the public storefront
   without leaving canonical company state.

## Five HQ areas

- **Home:** derived treasury, ownership, launch status, CEO priority, and six-stage launch checklist.
- **Content:** truthful catalog, Originals, and slate preparation states. Catalog entries continue to reference canonical project IDs.
- **Tech:** Level 0 foundation, purchased capacity status, and the eight existing technology branches.
- **Market:** brand promise, capacity-derived reach, and explicit unavailable states for pre-launch market analytics.
- **Company:** founder control, treasury, finance, debt, optional executive appointments, and replayable onboarding/cinematic controls.

## Scene-first presentation

The current HQ uses the shared visual-scene shell for Level 0 HQ, command deck,
content studio, network operations centre, market room, and company office.
Hotspots route into real rooms and status overlays describe canonical state.
Every scene has a CSS fallback if its WebP is unavailable.

Viewer Mode previews Phone, TV, and Web storefronts from canonical owned,
licensed, Original, and slate records. Its CEO Lens adds business context but
does not mutate the platform.

## Persistence and ownership

The only Phase 4 persistence is `hqOnboarding`: status, current step, visited sections, and start/completion weeks. Business totals shown in HQ are derived from `OwnedStreamingPlatformState`; they are not copied into screen-specific state.

Onboarding does not change lifecycle, cash, ownership, capacity, catalog, metrics, or milestones. The founding cinematic changes only its presentation status after it is viewed or dismissed.

## Deferred on purpose

- Phase 5: infrastructure capacity, technology purchasing, and subscription products
- Phase 6: catalog import, rights market, and licensing
- Phase 7: Originals and twelve-week slate
- Phase 8: readiness review and live launch

Future cards and checklist rows route to honest explanatory states. They never pretend a purchase or operational action exists before its system is implemented.

## Verification

Run:

```bash
npm run audit:streaming-hq-phase4
npm run audit:streaming-founding-phase3
npm run audit:streaming-access-phase2
npm run build
```
