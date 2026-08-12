# Phase 13 — Detailed Title Analysis

## Contract

Phase 13 adds a canonical title-week telemetry layer and a complete performance
dossier for every title in the programmed launch slate.

The seven dossier reports are:

- Overview
- Audience
- Engagement
- Discovery
- Financials
- Technical
- Future

Opening a dossier is read-only. It cannot reroll results, move cash, renew a
right, order a sequel or change promotion.

## Canonical title facts

Each completed live platform week allocates the platform result across titles
that are available in that program week. The allocation records:

- viewing accounts and hours viewed;
- completion, repeat viewing and satisfaction;
- homepage, recommendation, search and direct discovery;
- attributed subscription revenue;
- allocated cash cost and content amortization;
- cash and accounting contribution;
- playback success.

Revenue, cash cost, amortization, cash contribution and accounting contribution
reconcile exactly back to the canonical platform week. Title attribution never
creates additional revenue or cost.

## Report maturity

Reports appear only after enough canonical evidence:

- Overview, Audience and Technical: one measured week
- Engagement and Discovery: two measured weeks
- Financials and Future: four measured weeks

Titles from saves that predate Phase 13 are shown as **not measured** until a
new live platform week creates telemetry. Unknown history is never backfilled
as zero.

## Boundaries

Discovery is descriptive in Phase 13. Promotion campaigns, recommendation
tuning and other audience controls remain Phase 14.

The Future report provides decision insight only. Renewals, cancellations,
sequels and contract actions remain in their later canonical systems.

## Implementation map

- Canonical title-week simulation: `services/streamingWeeklyLoop.ts`
- Migration-safe title records: `services/ownedStreamingPlatform.ts`
- Dossier derivation and maturity: `services/streamingTitleAnalytics.ts`
- Seven-tab experience: `components/StreamingTitleDossier.tsx`
- Responsive visual system: `styles/streaming-title-dossier.css`
- HQ and Analytics Center entry points:
  `components/StreamingPlatformHQ.tsx`,
  `components/StreamingAnalyticsCenter.tsx`

## Validation

```bash
npm run audit:streaming-title-analysis-phase13
npm run audit:streaming-analytics-phase12
npm run audit:streaming-weekly-loop-phase10
npm run lint
npm run build
```
