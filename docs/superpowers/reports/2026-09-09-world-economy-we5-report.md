# World Economy WE5 Final Report

**Date:** 2026-09-09
**Phase:** WE5 — Acquisition, Churn, Sharing, and Piracy
**Status:** Complete

## Outcome

WE5 converts WE4's desired country/cohort/plan demand into a persistent weekly customer population. It uses sparse aggregate cells rather than individual people, so the same finite world can produce believable movement without saving billions of records.

## Canonical customer facts

- Paid accounts, paying households, profiles, active viewers, externally shared households, shared active viewers, piracy reach, and access load are separate quantities.
- The saved waterfall is exact: starting paid accounts + joins + reactivations - cancellations = ending paid accounts.
- Upgrades and downgrades move accounts between exact plans without changing platform totals.
- Platform switches are linked source-to-destination movements rather than unrelated cancellation and join guesses.
- Recently lapsed groups are bounded and can reactivate later.
- Every movement carries a concise primary reason code; raw utility calculations are not exposed to the player.

## Player platform integration

- The owned-platform weekly processor now consumes WE5's exact joins, cancellations, reactivations, ending accounts, plan mix, switching, sharing, piracy, and access load.
- The old generic acquisition/churn model remains only as a compatibility fallback when no eligible WE5 player offer exists.
- Subscription revenue is calculated only from paid plan cells. Shared access and piracy never create subscription income.
- Shared access contributes to infrastructure load.
- The platform-wide sharing posture and enforcement investment affect customer behaviour. Enforcement also creates a real weekly operating cost, so aggressive control is not a free dominant choice.
- Locked weekly CEO plans and growth actions now enter the player offer used by world competition, preserving the value of existing marketing, retention, and reliability decisions.

## Player-visible results

- Audience Market shows paid accounts, paying homes, shared access, piracy reach, access load, monthly paid-plan revenue, plan movements, and linked switches.
- Audience Market provides two optional global controls: Sharing Posture and Enforcement. There is no country-by-country or cohort micromanagement.
- Analytics Center projects the same canonical customer and access facts and sums real plan and platform movement across the selected window.
- The weekly CEO report shows upgrades, downgrades, shared access, and piracy next to the existing subscriber waterfall and financial result.

## Save and progression safety

- Save migration advanced to version 45 and owned streaming schema advanced to version 24.
- Existing cash, streaming treasury, and subscriber totals are preserved when WE5 is first seeded.
- A committed absolute week is immutable. Reloading after owned-platform metrics are synchronized cannot advance customers or tenure twice.
- Malformed customer cells rebuild deterministically from canonical world inputs.
- Customer snapshots are capped at 52 and recent movement evidence at 624 rows.

## Long-run evidence

- Horizon tested: 400 game years / 20,800 weeks, using 400 annual progression and persistence checkpoints.
- Final serialized WE5 state: about 1,403.4 KiB.
- Runtime in the final focused Node audit: about 11.73 seconds for all 400 annual checkpoints, approximately 29.3 ms per annual checkpoint on this development machine.
- Final accounts and revenue remained finite, non-negative, reconciled, and deterministic across JSON save/reload checkpoints.

## Verification

The following focused gates passed together:

- `audit:world-population-we1`
- `audit:world-audience-we2`
- `audit:world-audience-we3`
- `audit:world-streaming-we4`
- `audit:world-streaming-we5`
- `audit:world-streaming-we5-ui`
- `audit:streaming-weekly-loop-phase10`
- `audit:save-migration`
- `audit:week-processing-save-safety`
- `lint`
- `build`

## WE6 handoff

WE6 should consume WE5 active viewers, shared viewers, piracy reach, exact plans, country/cohort identities, catalogue availability, rights, localization, releases, promotion, buzz, recommendation capability, and platform access. It will own title-level starts, watch hours, completion, repeat viewing, advertising inventory, premium transactions, rentals, purchases, sponsorship exposure, and title-level piracy. It must not recreate population, participation, subscriptions, customer movement, or paid subscription revenue.
