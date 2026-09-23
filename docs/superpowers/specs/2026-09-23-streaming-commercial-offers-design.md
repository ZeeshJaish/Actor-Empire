# Streaming commercial offers and audience choice — design

Date: 2026-09-23
Status: proposed for user review; product direction approved in conversation
Scope: Define Launch pricing, player and AI offers, title entitlements, world-audience choice, weekly commercial revenue, forecasts, and save compatibility

## Outcome

A player chooses a subscription-led, advertising-led, or rental-and-purchase-led streaming service. The choice sets its starting offer and presentation, not a separate economy. The player can combine compatible offers later. Every displayed benefit, audience forecast, viewing event, and revenue line comes from the same canonical offer and title-access rules.

One rent price and one purchase price apply to **every eligible title** on the player's platform. There are no library/new-release categories, title-price overrides, or multiple rental tiers in this design. Existing currency formatting may change the displayed currency; it must not silently create a different title price. Any pre-existing canonical market-pricing conversion must be made visible and tested rather than replaced by an unannounced new curve.

## Product contract

### Core models and the existing card language

The present colourful card row, expandable editor, forecast, and bottom summary remain the visual basis. Its heading becomes **Your offers**, since not every card is a recurring plan.

| Core model | Initial card(s) | Core charge | Optional combinations |
| --- | --- | --- | --- |
| Subscription-led | Editable Essential, Standard, and Premiere cards; player may add, rename, and remove plans within a tested UI/data limit | Monthly or annual membership by actual billing path | Ads on chosen plans, uniform title rent/buy, Premium access benefit |
| Advertising-led | One prominent Free with ads card | No viewer entry charge; advertising on delivered eligible viewing | One-hour and/or 24-hour ad-free passes, uniform title rent/buy, Premium access benefit, later membership hybrid |
| Rental-and-purchase-led | One prominent Rent or buy card | Uniform per-title rent or purchase price | Free ad-supported shelf, Premium access benefit, later membership hybrid |

Pure rental/purchase has free browsing and no mandatory entry fee. If the player adds a recurring membership gate, it is shown as a separate **membership + rental** hybrid with both charges visible. A rental or purchase never becomes a subscription merely because the buyer has an account. A one-time permanent store-entry fee is excluded from this design; it would need its own access duration and balance decision. Annual and introductory membership discounts appear only for recurring plans.

The ad-free pass changes the ad experience, **not** title ownership or catalogue entitlement. Its 1-hour and 24-hour variants can each have a price, or the player can offer only one. A 24-hour pass does not open paid rentals. During pass-covered viewing, the platform earns pass revenue but no ad impressions for the removed breaks. This replaces the ambiguous standalone pay-by-hour/day-pass switches in the launch-pricing UI; it is not a fourth core model.

Premium access is an optional benefit on any eligible offer, not a separate revenue stream. The player chooses a lead time of 0–4 whole game weeks per offer/plan; the effective lead is further limited by the title's rights and scheduled release window. For example, one subscription tier may see a title two weeks before the general catalogue; an advertising offer may show an early title with ads; a store offer may make it rentable early at the same uniform rental price. A title must be scheduled for that offer and territory, and rights must cover the early window. The current `early` feature's appeal bonus is not proof of access: the weekly viewing path must enforce the window. The 4-week cap is a proposed launch balance choice for user review, not an existing game rule.

Remove Sponsored titles and Fund the show from **streaming launch pricing**. Do not delete unrelated production finance, sponsorship, or historical ledger records. Live actor interactions remain out of scope.

### Rules that prevent misleading offers

- Service technology, capacity, market operations, localization, and content rights remain canonical. A card cannot promise 4K, downloads, a country, or a title the platform cannot actually serve.
- The three core business models must be selectable when a streaming platform is configured; research may improve scale/efficiency or unlock advanced controls but must not make a chosen core model impossible at launch. This changes today's capability gates and requires explicit balance tests.
- One viewer may subscribe and later rent a separate title. A single viewing event may use only one access entitlement and can generate only the compatible revenue lines.
- A title can have different offer windows, but none can precede the contract's start, exceed its expiry, or bypass territory and monetization restrictions. New rights terms should state allowed subscription, ad-supported, rental/purchase, and early-window uses. At migration, an existing contract retains the title-access modes the platform already used under that contract; adding a new mode later requires an amended or new grant. Historical viewing is never replayed and existing access is not retroactively revoked.
- A player-facing offer must have at least one reachable, entitled title in an opening market. A configured revenue toggle alone is not launch readiness.

## Canonical data and simulation

### Offer and entitlement boundary

Introduce a versioned commercial-offer projection from the platform's saved configuration. It contains: core model; recurring plans (if any); one free-with-ads offer (if enabled); one uniform rent/buy price pair (if enabled); optional ad-free pass durations/prices; and per-offer benefits including early-access lead weeks. Do not copy viewer accounts or rights contracts into the pricing object.

One shared access evaluator takes `(platform, title, country, game week, viewer entitlement/offer)` and returns an allowed/denied reason, available ways to watch, charge, ad status, and applicable rights position. UI, forecast, player weekly loop, and AI use this evaluator or the same normalized projection. A customer cannot watch merely because a title exists somewhere in the catalogue.

The current world offer fallback creates a zero-price `OPEN_ACCESS` plan for all non-subscription services. That can remain as a temporary migration adapter, but it must not remain the canonical definition of a rental buyer or a recurring paid account. The current viewing stage broadly distributes plan accounts over available titles before modelling rental/pass transactions; the new flow must resolve the transaction or free entitlement first.

### World population chooses a service and an action

Raw country population and its demographic cohorts remain the source of truth. The improvement is a **consumer-choice layer**, not an arbitrary rewrite of population totals:

1. Determine reachable households from country population, internet/device/language access, market availability, and local network delivery. Payment access gates subscriptions, rentals, purchases, and passes, but does not disqualify a household from free ad-supported viewing.
2. Expose each cohort to player and rival offers using awareness/marketing, catalogue appeal and rights, localization, reliability, affordability, ad tolerance, and persona fit. Include a no-service/outside option. Apply the existing household entertainment budget across paid choices.
3. Distinguish recurring subscribers (existing monthly and annual billing-path cohorts), free ad viewers, pass buyers, rental buyers, purchase buyers, and non-converters. A household may subscribe and separately rent, but each person/household and each transaction is counted once in its appropriate metric.
4. Choose an eligible title and access route before allocating actual viewing. Local capacity/route quality can prevent intended views; only delivered ad-eligible views create ad impressions. Failed playback is visible as unmet demand, not fabricated revenue.
5. Persist deterministic aggregate cohort movements and reasons. Price, promotions, benefits, ads, title appeal, rivals, and outages should measurably influence choice without guaranteeing that a cheaper plan captures everyone.

S4.1 has **already** split monthly and annual subscription buyers and migrated customer state to schema 2. Preserve that work. This design adds free and transaction cohorts alongside it; it does not reintroduce blended-price affordability or change annual cash timing without a separate balance decision. World population totals, existing billing-path counts, customer movements, and financial totals must reconcile at country and global levels.

### Revenue and financial settlement

The weekly pipeline records a deterministic, idempotent commercial outcome by platform, country, title, offer, and week. Charge and classify revenue as follows:

| Revenue | Trigger | Exclusion/invariant |
| --- | --- | --- |
| Subscription | Active monthly/annual billing-path customer | Existing path-specific intro and annual pricing; no synthetic free accounts |
| Advertising | Delivered ad-eligible viewing hours and filled impressions | No impressions during ad-free pass coverage or on rights-prohibited content |
| Ad-free pass | Purchased 1-hour or 24-hour pass | Never grants a paid title and never books ads for removed breaks |
| Rental | One eligible rental transaction using the uniform rental price | Viewer gets its stated rental window; no duplicated charge on rewatch |
| Purchase | One eligible purchase transaction using the uniform purchase price | Persistent entitlement subject to the canonical purchase terms; no repeated charge |

Revenue is gross before canonical platform operating costs, payment costs, and rights/backend settlement. Reconcile gross, each deduction, and net to company treasury and existing rights-contract reports; do not bolt on a second royalty ledger. Historical settled cash is immutable. The forecast and weekly loop use the same rules, with forecast assumptions labelled rather than presented as guaranteed buyers. AI rivals use the same offer, choice, access, and revenue mechanics, though their strategy may choose different prices and features.

## Save compatibility and UI truth

Normalize current `streams`, plans, uniform `rentals.rent`/`rentals.buy`, intro discount, and annual discount into the new versioned offer model without discarding configured services. Old saves must load, re-save, and advance a week deterministically; migration does not replay historical transactions. Legacy sponsor/patron configuration is retained read-only for already operating platforms and absent from new launch editing; its current save-derived income is not silently deleted. C0 must identify representative affected saves and C4 must present the balance impact and a conversion rule for approval before legacy accrual is ended. New sponsor/patron selections cannot create invented deals.

The pricing screen reports, by country and globally: eligible households; subscribers split monthly/annual; free ad viewers; pass buyers; rental buyers; purchase buyers; expected delivered views; gross revenue by source; rights/operating deductions; and net. A title/offer explanation states why it is unavailable (rights, market, timing, plan benefit, payment, or network). Unknown or inapplicable is not displayed as zero or as a healthy status.

## Phased execution proposal

These are review gates, not authorization to silently complete all phases in one pass. Each phase receives a small implementation plan and baseline before gameplay edits.

| Phase | Work and acceptance gate |
| --- | --- |
| C0 — Baseline and invariant fixtures | Freeze current subscription, ad-only, rental-only, hybrid, AI, rights, and old-save outcomes. Record inherited audit failures and balance numbers. No gameplay rule changes. |
| C1 — Canonical offers and migration | Add the versioned offer model, uniform rent/buy prices, legacy adapters, and idempotent save normalization. Three core choices and custom subscription plans can round-trip without revenue changes yet. |
| C2 — Rights and title entitlements | One evaluator enforces territory, title availability, offer permissions, purchase/rental duration, and configurable early weeks. Denied playback explains why. No early-access appeal without actual early viewing. |
| C3 — Population and rival choice | Replace synthetic-free-plan semantics with subscription, free-ad, pass, rental, and purchase cohorts using the same player/AI choice kernel. Preserve S4.1 billing cohorts and household/budget reconciliation. |
| C4 — Weekly revenue and forecast | Settle subscriptions, delivered ads, ad-free passes, and uniform title transactions once; apply rights/operating costs and reconcile treasury. Forecast uses the same kernel. Compare balance deltas before acceptance. |
| C5 — Pricing UI and launch gates | Adapt the existing card design to three models; add/remove subscription plans; show single ad/store cards and relevant optional offers. Require a playable opening offer and show honest numbers at phone widths. |
| C6 — Career and save regression | Run launch-to-live-week player/AI scenarios, old-save migration, annual/monthly, free-only, rent-only, hybrid, early rights, outage, and duplicate-week tests. Record remaining failures and obtain a separate release decision. |

## Scope and review gates

Do not introduce per-title rental categories, a separate sponsor/fan-funding streaming economy, real-time individual viewer accounts, or a new daily game clock. Passes are simulated as deterministic aggregate time coverage inside a weekly turn; a literal 24-hour UI offer must reconcile to the covered viewing hours in that week. Do not change population counts to force desired revenue, tune balance coefficients to mask a defect, rewrite saved historical cash, or stage unrelated work.

The first implementation phase should be C0. At each later phase, report the exact state/economy change, saved-game impact, player and AI parity, observed balance shift, tests, and remaining failures before asking to advance. This design document itself makes no gameplay change or release claim.
