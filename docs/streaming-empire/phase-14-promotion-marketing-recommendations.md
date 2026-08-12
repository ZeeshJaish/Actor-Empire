# Phase 14 — Promotion, Marketing and Recommendations

## Contract

Phase 14 adds one auditable next-week Growth War Room. The player can control:

- target title;
- homepage placement;
- trailer, billboard, social and regional campaigns;
- recommendation objective;
- catalog-exploration tradeoff;
- optional two-variant artwork test.

The screen never grants subscribers or title views. It locks modifiers for the
next real game week. The existing weekly processor then resolves audience,
engagement, churn, cash, title discovery and attribution exactly once.

## Weekly flow

1. Select a title available in the next program week.
2. Choose its homepage position and paid reach mix.
3. Set the recommendation mandate and exploration level.
4. Optionally select two artwork variants.
5. Review campaign cash, reach model, join range and tradeoff warnings.
6. Lock the action without moving cash early.
7. Advance one real game week.
8. Read the committed attribution report.

Only one growth action may be locked for a target week. It can coexist with the
Phase 10 operating plan because they control different parts of the business.

## Attribution truth

The weekly processor calculates the same seeded week with organic inputs and
uses that counterfactual to attribute:

- incremental viewing accounts for the target title;
- incremental subscriber joins;
- cost per attributed join;
- observed discovery mix;
- artwork winner and measured conversion lift when a test was armed.

Campaign cash is included in canonical weekly operating costs. Title discovery
still reconciles to one hundred percent, and all title financial allocations
still reconcile to the platform week.

## Recommendation tradeoffs

- Balanced Service avoids a sharp bias.
- Next-Watch Depth prioritizes engagement and churn protection.
- Catalog Discovery gives underexposed titles more opportunity while accepting
  lower immediate conversion.
- Breakout Velocity concentrates attention for acquisition but narrows catalog
  exposure and can increase churn pressure.

Exploration ranges from 10% to 45%. Higher exploration increases deep-catalog
exposure and engagement potential but can reduce immediate conversion.

## Implementation map

- Definitions, preview, locking and deterministic artwork tests:
  `services/streamingPromotion.ts`
- Weekly modifiers, spend and attribution:
  `services/streamingWeeklyLoop.ts`
- Migration-safe growth records:
  `services/ownedStreamingPlatform.ts`
- Complete interactive experience:
  `components/StreamingPromotionWarRoom.tsx`
- Responsive visual system:
  `styles/streaming-promotion.css`
- HQ and title-dossier entry points:
  `components/StreamingPlatformHQ.tsx`,
  `components/StreamingTitleDossier.tsx`

## Validation

```bash
npm run audit:streaming-promotion-phase14
npm run audit:streaming-title-analysis-phase13
npm run audit:streaming-weekly-loop-phase10
npm run lint
npm run build
```
