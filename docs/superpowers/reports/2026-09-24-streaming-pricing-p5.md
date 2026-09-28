# P5 — Audience and revenue calibration

**Status:** Implemented and technically checked on 2026-09-24. This is a balance recommendation, not a promise of earned cash or a release decision. P6 remains the separately approved career/save/visual regression gate. No save, commit, push, or production release was made for this phase.

## Root cause and correction

The reported billion-scale number could not be tied to a supplied career snapshot. An isolated, read-only fixture with the same three familiar prices ($7.99/$12.99/$17.99), 5% annual discount, no introductory offer, and a request for all 197 world markets reproduced **$3.214B/month** in the old launch preview. It used age 40/week 12, no player catalogue, no commissioned network, default marketing and 33 active rivals. China contributed about **$2.728B/month**: it had no rival offer in that fixture, so almost every affordable willing household was handed to a brand-new, empty service.

Three separable defects were proven:

1. The forecast reported **1.424B reachable households across 197 countries**, while the actual player offer was normalized to the first **40** markets. The forecast now reads the effective country list from the same offer registry used by live audience choice, and its country rows sum exactly to the headline reach. It does not change the existing 40-market limit.
2. A household with one affordable subscription previously had no paid **outside choice**. Plan utility decided *which* service/plan won but not *whether* the household subscribed. Paid choice now uses the existing launch-age/marketing exposure curve already used for free access, a market-local catalogue factor, and an explicit outside weight. A new or weak service cannot inherit a monopoly audience; a mature, strong service can still earn substantial demand. There is no revenue ceiling.
3. Player catalogue strength previously began at 25 and rose for raw IDs, active licences and unfinished commissions even if the titles could not be played. Thirty nonexistent IDs raised the score from 25 to 91. The player offer now evaluates actual title-route permission at the current week and country for the enabled subscription, free-ad and store modes, using the canonical rights rule. A US-only licensed title raises the US score and paid demand, not India's. The scoring path reuses a prepared platform/owned-title context to avoid repeatedly normalizing the same catalogue.

The new paid-choice tuning is explicit: each candidate's existing utility weight is multiplied by the existing offer-exposure factor and by `clamp((playableCatalogueScore - 10) / 90, 0.02, 1)`; a country with **zero playable titles** receives a minimal `0.0001` catalogue factor. The candidate weights are compared to an outside weight of `1`. These are gameplay coefficients, not observed real-world conversion rates or arbitrary money caps. Player and AI use the same paid-choice kernel; AI offers retain their existing simulated catalogue quality and maturity inputs. World population and cohort budgets are unchanged. We recommend retaining these coefficients for P6 playtesting, then tuning only against actual career evidence.

## Measured scenarios

All money below is game currency. Forecast subscription figures are **monthly equivalents**, including the annual cohort at its discounted monthly-equivalent price; they are not the cash transferred into treasury on day one. Ad and store estimates are **weekly conditional** receipts, requiring playable rights, delivered viewing, buyers and market demand.

| Deterministic fixture | Paid accounts | Subscription / month | Other observation |
| --- | ---: | ---: | --- |
| Before P5: 197 markets requested, empty player catalogue | 271,303,392 | $3,213,815,852 | 197-country headline reach even though only 40 offers were active |
| After P5: same request, empty catalogue | 27,113 | $320,771 | 40 effective countries; 499,151,555 reachable households |
| New empty-catalogue entrant, US only | 289 | $3,592 | 7 rivals |
| New empty-catalogue entrant, US/IN/GB/CA/AU/DE | 835 | $9,808 | 16 rivals |
| US only, all plan prices raised to $78 | 38 | $2,917 | Fewer buyers and less money than the $7.99–$17.99 US fixture |
| Established two-year service in 40 markets, 30 **fake** title IDs | 27,115 | $320,807 | Metadata alone no longer becomes catalogue appeal |
| Established two-year service in 40 markets, 30 playable globally licensed titles | 174,707,873 | $2,129,398,436 | Deliberate large-market stress test, not a recommended starting offer |

The first 197-market row was captured before P5 code changes; all other rows are from `scripts/diagnose-streaming-pricing-p5.ts` after the change. The fully licensed stress test demonstrates that large global revenue remains possible with genuine content, maturity and reach. It also shows why a blanket revenue cap would be wrong. The zero-catalogue forecast retains a tiny conditional acquisition floor rather than presenting it as earned money; the UI already says that the opening forecast requires eligible titles, delivery and real buyers. The launch gate separately requires an available opening title.

Offer and delivery checks on the same model:

| Scenario | Audience | Conditional incremental receipts |
| --- | ---: | ---: |
| US free entry, 2 ad minutes/hour | 95,479 free households; zero paid | $9,836/week ads, no subscription cash |
| US free entry, 10 ad minutes/hour | 74,586 free households; zero paid | $30,735/week ads; reach falls as load rises |
| US subscription + store hybrid | 289 paid; 12,017 store households | $3,592/month subscriptions plus $2,562/week conditional store |
| C6 live US ad fixture, normal / thin / outage capacity | Delivered viewing only | $82,003 / $53,416 / $37,571 weekly incremental gross |
| C6 live US store fixture, normal / thin capacity | Rights-valid delivered transactions | $11,109 / $4,646 weekly incremental gross |

The 30-title/40-market forecast took about **28 ms in the local Node audit** after the prepared-route change versus about **299 ms before it** on that same synthetic fixture. This is not a mobile-device or full-wizard performance measurement.

## Forecast-to-live accounting and balance

The pricing card's potential gross uses the canonical forecast's paid monthly equivalents, plus conditional ad/store components. The monthly and annual paid household counts reconcile to the paid headline, and country rows reconcile to it. The live weekly loop instead starts from actual customer cells, limits player accounts by commissioned network coverage and the existing launch subscriber seed, divides monthly-equivalent subscription revenue by 4.33, adds only delivered ad/store receipts, subtracts rights, infrastructure, staff, marketing and other operating costs, and then changes treasury. Annual cohort cash is accrued weekly in this game; the preview does **not** promise an annual prepayment windfall. No duplicate paid/free primary households or budget overspend was found in the checked cohort.

The C6 one-title/one-country live fixture still settles near its network-limited seed: subscription-only **179,962** paid accounts and **+$183,644** operating result; ad-only **0** paid, **243,773** free viewers and **−$52,314** result; store-only **−$114,283**; hybrid **179,965** paid, **258,365** free viewers and **+$256,872** result. Relative to the preceding C6 report, the subscription fixture changed by only four paid accounts (179,966 → 179,962); that comparison is a network-limited launch seed, **not a measured churn rate**. The P4 ad-only fixture reported about $84,905 incremental gross and −$49,742 result; after P5's shared audience changes it reports $82,003 and −$52,314. The C4 AI aggregate weekly advertising line moved from P4's $117,910,228 to $116,344,657 in the current fixture (about −1.3%); AI subscription receipts still remain finite and are governed by the same outside-choice kernel, but an exact pre-P5 AI subscription baseline was not preserved. These fixture deltas should not be extrapolated to every save.

The completed P5 audit also checks that a higher-priced offer does not automatically grow income, free entry does not mint subscription money, identical tiers do not receive an invented premium share, and an attractive higher tier can win an affluent cohort. The empty-catalogue fixture's subscription revenue per paid account changed from about **$11.85 to $11.83 per month**; most of the gross reduction is demand correction, not a lower bill.

## Verification and limits

- Red/green P5 audit reproduced the 197-versus-40 footprint, absent paid outside choice, fake-catalogue inflation, and country-rights leakage; it now checks those plus cohort conservation, local budgets, monthly/annual reconciliation, high price, free entry and higher-tier selection.
- `npm run audit:streaming-pricing-p5`, `audit:streaming-commercial-c3`, `c4`, `c6`, `audit:streaming-billing-cohorts`, `audit:streaming-pricing-world`, and `audit:streaming-build-world` passed after the catalogue change. The C3/C6 focused TypeScript checks, `npm run lint`, `npm run build`, and `git diff --check` passed. Vite retained its missing `/index.css`, dynamic-import and large-chunk notices; the Build audit retained ignored-CSS warnings. During verification, a concurrently added, incomplete adaptive-performance script temporarily made global lint fail; its missing modules arrived in the shared worktree and a fresh final lint rerun passed. P5 did not edit that script.
- `npm run audit:world-streaming-we4` **failed** on an existing assertion expecting a research-locked `hd` feature to survive normalization; the current normalizer strips it. P5 did not change that feature normalization. Do not call this check green.
- No player save was opened or edited. The new per-country catalogue score is derived at runtime and is not persisted. Existing offer and settled-money save fields remain unchanged.
- The 197-market reproduction is a matching **isolated fixture**, not proof of the user's exact screenshot state. The strong-catalogue stress test is intentionally global and mature; it does not establish a target conversion rate. A real P6 career, saved-game reopen, mobile performance/touch check and subjective pricing-page approval are still required.

## Next boundary

P6: integrated career, save and 320/393/430-pixel visual regression across subscription, ads, store and hybrid offers. Do not treat P5's conditional forecast as launch cash or proceed to release on this report alone.
