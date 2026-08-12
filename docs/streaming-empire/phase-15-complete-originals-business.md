# Phase 15 — Complete Originals Business

## Contract

Phase 15 expands the Phase 7 starter Original into a repeatable, canonical
content business:

1. Find an audience gap and enter the Pitch Room.
2. Choose creative format and Original strategy.
3. Select the physical production house.
4. Negotiate the production cap, platform-rights share, producer backend,
   exclusive window, and sequel rights.
5. Commission one real script and open the existing Greenlight workflow.
6. Track the same canonical project through production and delivery.
7. Commit a localization package with company cash and game-week delivery.
8. Authorize scope, release rhythm, and launch weight.
9. Hand the existing project to the canonical release processor.
10. Collect title telemetry through the existing weekly platform processor.
11. After four measured weeks, renew, cancel, protect a later licensing
    window, or open a franchise pitch.

Only one ungreenlit commission may exist at a time, preventing competing drafts
from attaching to the wrong production project.

## Originals Studio

The Content Room now opens a scene-first Originals Studio with:

- a horizontally scrollable title rail;
- a seven-stage production journey;
- contract and canonical-project truth;
- a visual localization bay;
- release control;
- performance-report maturity;
- a future decision room.

The mobile layout collapses into one command column and retains a compact
two-column decision grid. Reduced-motion preferences remove nonessential
transitions.

## Canonical production and release boundary

EMPIRE+ never creates a duplicate production simulator.

- The commission creates a real script and concept in the selected production
  house.
- Greenlight creates and attaches one canonical commitment ID.
- Production remains in the existing project workflow.
- Release authorization adds the platform plan to the commission, then updates
  that same delivered commitment for the existing release processor.
- Owned Originals do not receive a fake rival `StreamingState`; that type
  remains reserved for third-party streaming distribution.
- Later Original premieres enter the shared program calendar by reference, so
  the weekly loop, title analytics, viewer home, and Growth War Room see the
  same project.

## Localization

| Package | Subtitles | Dubs | Cash | Game weeks | Content Ops |
|---|---:|---:|---:|---:|---:|
| Home Market Master | 2 | 0 | $0.5M | 1 | 0 |
| Regional Bridge | 8 | 3 | $2.5M | 2 | 10 |
| World Premiere Grid | 20 | 8 | $7.5M | 3 | 20 |

Localization is charged once from platform treasury. Release scope cannot
exceed the committed master package.

## Lifecycle evidence

The Future Decision Room requires a canonical released project and four
measured title weeks. Unknown information remains unknown.

- **Renew:** opens a prefilled next-season pitch with lineage and season number.
- **End the run:** records cancellation without deleting catalog value.
- **License later:** protects an exclusive window and queues strategic intent;
  counterparty trading remains Phase 16.
- **Build a franchise:** opens a related-world pitch when sequel rights exist.

No decision fabricates a produced title, subscriber, view, or cash outcome.

## State and migration

Owned-streaming schema v13 extends each commission with strategy, lineage,
contract terms, localization, release authorization, and an evidence-backed
lifecycle decision. Schema v12 and older saves receive safe contract defaults
but no fabricated spend, release, or decision.

## Implementation map

- Repeatable commissioning and shared program references:
  `services/streamingOriginals.ts`
- Localization, release, and lifecycle decisions:
  `services/streamingOriginalsBusiness.ts`
- Migration: `services/ownedStreamingPlatform.ts`
- Existing release handoff: `services/gameLoop.ts`
- Scene-first workspace: `components/StreamingOriginalsStudio.tsx`
- Expanded Pitch Room: `components/StreamingOriginalCommissioning.tsx`
- Responsive visual system: `styles/streaming-originals-studio.css`

## Validation

```bash
npm run audit:streaming-originals-business-phase15
npm run audit:streaming-originals-phase7
npm run audit:streaming-weekly-loop-phase10
npm run audit:streaming-title-analysis-phase13
npm run audit:streaming-promotion-phase14
npm run lint
npm run build
```
