# Streaming commercial C1 — offer representation and save migration

Date: 2026-09-23

Scope: canonical commercial-offer intent and projection only. No launch UI, entitlement, customer-choice, ad market, commercial settlement, or treasury rule changed.

## Implemented boundary

- Existing `streams`, custom `plans`, `ads`, and uniform `rentals.rent` / `rentals.buy` remain the saved price authority and the inputs to the current economy. The optional `commercialOffers` schema-1 object adds leading-model intent, explicit free-ad access, ad-free pass prices, and per-offer premium/early-window settings. Normalization is idempotent; the early-window setting is bounded to 0–4 weeks and is **intent only**, not granted access yet.
- `projectStreamingCommercialOffers` gives player and AI pricing the same read-only shape: paid subscription plans, an optional free-ad offer, one uniform rent/buy offer, and relevant pass settings. It does not present `OPEN_ACCESS` as a paid subscription plan. `ads.cpm` is labelled `targetCpm` in this projection, but the live economy still directly uses that numeric input; market-realized CPM and fill belong to C4.
- A core starter activates exactly one stream. Inactive custom plans, uniform store prices, pass prices, and offer benefits remain saved for later hybrids. A subscription switch from a genuinely planless ad/store save creates one default paid plan.
- Canonical save parsing now distinguishes an *absent* plan/stream array from an explicitly empty one. Ad-only and store-only saves no longer gain three fallback subscription plans on migration. The migration validates versioned intent and round-trips all three core choices twice without drift.

## Measured compatibility and limits

The C0 fixed-input fixture remains identical: at 600,000 eligible hours, the 4-minute/$20-CPM ad-only row earns $76,531 before $9,184 commercial operating cost; rent/buy earns $8,934 + $4,240; hybrid incremental revenue is $89,705. The live ad-only counterexample is also unchanged: 250,000 synthetic free accounts, 347,977 delivered hours, **$0 ad revenue**. C1 does not claim the model balance or ad-only settlement is fixed.

All 33 mature-field AI offers still carry subscriptions, ads, and rentals, with zero pure ad-only or store-only AI rivals. Their current commercial configurations project through the same C1 helper as the player. Strategy diversity, title entitlement, customer choice, and shared settlement are C2–C4 work. Saved legacy sponsor/patron pricing and existing subscription billing paths are retained; C1 does not silently remove historical or current income.

## Verification

| Check | Result |
| --- | --- |
| `audit:streaming-commercial-c1` | Pass: normalization, inactive-benefit preservation, core projection, ad/store/subscription save migration, AI configuration projection |
| `audit:streaming-commercial-c0` | Pass: numeric fixture unchanged, inherited ad-only live gap reproduced |
| `audit:streaming-pricing-world` | Pass: 5,203,108 normal subscribers, $48,807,593.84/month in its controlled fixture |
| `audit:streaming-billing-cohorts` | Pass: monthly/annual affordability and UI checks |
| `audit:world-streaming-we6` | Pass: 400-year horizon, 311.5 KiB state, 22,921.7 ms in the final run |
| `audit:world-economy-we8-save` | Pass: integrity, compaction, migration |
| `npx tsc --noEmit --project tsconfig.streaming-commercial-c1.json` | Pass: targeted C1 import graph |
| `npm run build` | Pass with pre-existing mixed-import and large-chunk warnings; no gameplay proof |
| `git diff --check` | Pass |

Next decision gate: C2 must define and test rights-aware title/territory/window access before any early-access benefit becomes effective. C3 must split free/store cohorts from subscribers, and C4 must calibrate actual ad fill and realized CPM. C5 then makes these offer choices editable in the launch UI.
