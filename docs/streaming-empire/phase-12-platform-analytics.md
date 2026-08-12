# Phase 12 — Platform Analytics Center

## Contract

Phase 12 is a read-only intelligence layer over canonical streaming state. It
does not award subscribers, move money, create incidents or inject future
outcomes.

It provides two information layers:

- **CEO Pulse** turns the selected period into five actionable conclusions:
  audience, retention, finance, technology and content runway.
- **Analyst Mode** exposes the reconciled facts and graph detail underneath
  those conclusions.

## Included analytics

- Subscriber timeline
- Join, cancel and reactivation waterfall
- Derived retention cohorts that reconcile to closing subscribers
- Aggregate churn and engagement
- Revenue and ARPU
- Cash contribution versus accounting contribution
- Cash runway
- Actual capacity plus four-week driver-explained forecast
- Operational incident history from committed pressure weeks
- Modeled world subscriber share
- Twelve-week content-gap heatmap
- Ledger reconciliation status

Analytics can be viewed across the latest 4, 12, 26 or 52 committed operating
weeks. Changing the range never changes simulation state.

## Truth boundaries

Phase 12 explicitly marks the following as **not measured** instead of showing
zero:

- churn by subscription tier and territory;
- cost per viewing hour;
- recommendation-attributed viewing share.

Those require canonical telemetry introduced by later locked phases. Detailed
per-title analysis remains Phase 13, and marketing/recommendation controls
remain Phase 14.

## Implementation map

- Derived analytics and reconciliation: `services/streamingAnalytics.ts`
- Shared graph system:
  `components/streaming-analytics/StreamingGraphSystem.tsx`
- CEO Pulse and Analyst Mode: `components/StreamingAnalyticsCenter.tsx`
- Responsive visual system: `styles/streaming-analytics.css`
- HQ entry points: `components/StreamingPlatformHQ.tsx`

## Validation

```bash
npm run audit:streaming-analytics-phase12
npm run audit:streaming-quarter-season-phase11
npm run audit:streaming-weekly-loop-phase10
npm run lint
npm run build
```
