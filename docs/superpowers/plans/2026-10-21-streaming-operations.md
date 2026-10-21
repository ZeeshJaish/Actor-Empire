# Streaming Operations integration

> Execute inline against the existing checkpoint branch. The user approved the four-section plan and requested implementation; no additional design approval is pending.

**Goal:** Make launch controls revisitable through the existing four Operations divisions while preserving their good layouts, canonical transactions, saved rights and normal progression.

**Architecture:** Reuse the current launch step components in focused Operations shells with explicit save. Keep launch services guarded by default and add an explicit operational save context that preserves launch history. Reuse the tested network drafting/rehearsal pipeline, applying live changes through canonical pending construction orders. Audience maps reuse the existing geographic renderer with scope-correct data.

**Constraints:** Existing four divisions only. Existing colours/fonts/padding. No wizard Next/Back journey in focused editors. No automatic purchases on navigation. Rights, launch receipts, annual customer contracts and current delivery remain intact. Pricing enters the next normal customer settlement; no immediate retrospective charge. Existing research and affordability checks remain. Large lists are grouped/bounded. Test only disposable fixtures, never purchase/advance the user's save.

## Implementation and checks

- [x] Add service-level failing tests for explicit live pricing/storefront/ident saves: default opening guard still rejects; live change preserves launch commit/program, rights and customer contracts; duplicate saves do not debit; insufficient cash/research locks fail. Implement explicit scope and re-run.
  Files: services/streamingLaunchProgram.ts; scripts/audit-streaming-operations.tsx.
- [x] Add focused launch-component shell with local edits, Save/Cancel, contextual feedback and market/clearance tabs; no background launch autosave/checkpoint in Operations. Preserve original wizard behavior. Reuse canonical expansion filing and clearance actions.
  Files: components/StreamingDefineLaunchExperience.tsx; components/studio-finance/components/launch/LaunchWizard.tsx; launch styles.
- [x] Integrate missing HQ category links in prelaunch/live states. Audience exposes Analytics/Top 10/Campaigns/Regions/Markets/Pricing; Platform exposes Network and Viewer Experience alongside current tools; Content retains existing sections; Boardroom owns finance and M&A. Wire region targets and campaign objective selection.
  Files: components/StreamingPlatformHQ.tsx; components/StreamingPromotionWarRoom.tsx.
- [x] Adapt network shell for Operations: Network/Test/Review tabs, current/pending state, no launch campaign/commission replay. Route validation/apply to validateStreamingInfrastructureDraft / commitStreamingInfrastructureSetup; show pending revision and completion. Keep exact-configuration rehearsal and active network until completion.
  Files: StreamingPlatformHQ.tsx; StreamingBuildWizardExperience.tsx; studio-finance BuildWizard.tsx and StageLaunch.tsx.
- [x] Add shared Audience map for industry/platform and market status with six regional values, selected country facts and contextual market action; keep existing charts, poster/content controls and finance UI. Bound portfolio lists and country detail. Preserve map scope/selection when changing tabs.
  Files: components/streaming-transplant/StreamingAudienceExperience.tsx; new Audience map component; AudienceDesk CSS.
- [x] Verify real service flows, canonical save/reload/weekly pricing, live pending network revision and existing save/rights gates. Typecheck and build. Browser-check all four sections, editor cancel/save, scope labels, 320/393px overflow and controls using disposable fixtures. Record results and known limits; leave correct local checkout running.

## Verification boundary

Targeted service/UI/save checks and browser flows completed. The full actor game-week probe remains bounded by a checkpoint-reproduced viewing-stage stall; see docs/reports/2026-10-21-streaming-operations/README.md. No overall release certification is claimed.
