# Project A Phase A6 Completion Report

**Phase:** A6 — Two-Sided Acquisition and Resale Synchronization

**Status:** COMPLETE

**Completed:** 2026-09-01

**Next approval-gated phase:** A7 — Rights Office, Relationship Intelligence, and Commercial Observability

## 1. Simulation changes

Platforms can now sell an exact remaining licence position to another eligible platform. A full transfer does not mint a fresh term: the successor inherits the same title, territory, countries, exclusivity, window, start and expiry, localization, backend, accrued royalty evidence, package attribution, and unresolved obligations. The source position becomes `TRANSFERRED_OUT`, leaving one active current holder.

The transaction payment belongs entirely to the current holder. The original studio keeps the title/IP and its original backend terms, but receives no resale participation and is not asked for consent. Sublicensing remains a distinct child window and does not replace the parent holder.

`WorldState.streamingRightsContracts` remains the exploitation authority. The new `streamingRightsTransactions` registry records replay-safe commercial history and lineage only.

## 2. Player-visible result

EMPIRE+ resale listings now show the original owner, reseller/current holder, exact countries, remaining weeks, inherited exclusivity/backend, obligation count, asking price, and a short incompatibility reason. For full transfers, only price is negotiable; the inherited licence facts are fixed.

The Production House Rights Desk now includes a compact transfer ledger. A title can visibly read `Empire Studios → Hulu → Netflix`, identify Netflix as the current holder, and still show the original Japan scope and remaining term. There is no fake studio approval button.

## 3. Existing systems reused

- A1 canonical contract registry and exact-once contract registration.
- A2 existing EMPIRE+ negotiation and competitive-pressure surface.
- A3 compatibility authority and short conflict explanations.
- A4 original expiry dates and calendar timing.
- A5 group IDs, exact component facts, and all-or-nothing batch settlement boundary.
- Owned-platform treasury, catalogue, obligations, and event ledger.
- Platform AI controller, finance, distress, rights, slate, and weekly-turn systems.
- Existing migration and persistence compaction.

## 4. Legacy paths removed or retained

Synthetic platform-trade opportunities were removed. EMPIRE+ now lists only a real active canonical platform-held contract. Existing `SUBLICENSE_OUT` signing and distress licence disposal were routed through the A6 authority instead of constructing private copies.

Legacy change-of-control fields remain readable for old saves, but no longer terminate an otherwise valid licence merely because a platform changes hands. Original-studio consent, notice, and resale participation are intentionally absent from downstream transfers.

## 5. Data and migration

Save migration advanced to version 29. Old contracts self-root without invented history. New contracts persist root, parent, creating transaction, and transferred-successor references. Compaction retains unresolved, contract-referenced, and recent settled transaction history. Save/compact/migrate round trips preserve the full holder chain.

## 6. Verification evidence

Fresh passing checks:

- `audit:streaming-contract-foundation-phase1`
- `audit:streaming-active-bidding-phase2`
- `audit:streaming-rights-compatibility-phase3`
- `audit:streaming-rights-calendar-phase4`
- `audit:streaming-catalogue-packages-phase5`
- `audit:streaming-rights-transactions-phase6`
- `audit:streaming-rights-marketplace-phase16`
- `audit:platform-ai-distress`
- `audit:platform-ai-economy`
- `audit:platform-ai-release`
- `audit:platform-ai-turn`
- `audit:save-migration`
- `audit:save-transfer`
- `npm run build`

The A6 audit includes SSR assertions for both player-facing surfaces, exact Empire/Hulu/Netflix economics, current-holder uniqueness, inherited obligations, sublicense lineage, AI-only background trade, player inbound/outbound trade, idempotency, failed-settlement atomicity, multi-title atomicity, and persistence.

Responsive browser QA passed at mobile and desktop sizes with no horizontal overflow. The mobile resale card kept all four exact licence facts visible, and the Production House ledger retained the full chain in a compact row.

Repository-wide `npm run lint` still reports older stale owned-platform audit fixtures missing fields such as `publicManifesto` and `networkPlacements`. No A6-owned TypeScript diagnostic remains, and the production build passes.

## 7. Intentionally deferred

A7 owns the news/digest presentation, full relationship intelligence, detailed studio/platform statements, and scalable mandate explanations. A6 records the factual events and current ownership needed by those systems, but does not create a parallel reaction feed.

The broader legal/lawsuit pack and future-output/multi-picture partnerships remain deferred under the master roadmap.

## 8. Next phase

A7 — Rights Office, Relationship Intelligence, and Commercial Observability. It will make the deep rights market manageable for 30–40 title libraries through Strategy, Custom, and Full Control, while explaining delegated decisions and showing durable commercial relationships and statements.
