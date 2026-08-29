# Competitive Streaming Platform AI — Phase 5 Economy, Distress, Rescue, and Valuation

**Date:** 2026-08-29

**Status:** Approved design; implementation has not started

**Project:** Competitive Streaming Platform AI, original eight-phase roadmap

**Phase:** 5 of 8

## 1. Purpose

Phase 5 replaces artificial rival-platform money growth with a durable operating economy. AI-controlled streaming companies must earn revenue, settle real costs and commitments, manage a profile-specific reserve, react progressively to financial trouble, and receive explainable valuations. A company may restructure, obtain bounded financing, enter bankruptcy administration, become dormant, or emerge as an acquisition target.

The phase also preserves long-term competitive density. Established rivals receive a modest operating-cost advantage while AI-controlled, and the wider streaming ecosystem may create credible local, regional, corporate-backed, or rare global entrants. This keeps the world competitive without making any named company immortal or granting invisible weekly cash.

This is not the player streaming-house infrastructure phase for power, cooling, bandwidth, and reliability.

## 2. Dependencies and boundaries

Phase 5 consumes the canonical state and decisions created by earlier Platform AI phases:

- Phase 1 supplies platform identity, controller ownership, competence, parent-backing profile, deterministic identifiers, and acquisition handoff.
- Phase 2 supplies content plans, rights commitments, bidding commitments, and strategy decisions.
- Phase 3 supplies commission milestones, producer fees, production overruns, cancellations, and player-studio obligations.
- Phase 4 supplies research, installation, localization, country operations, market-entry costs, and saved AI efficiency snapshots.

The canonical boundaries remain:

- `WorldState.platforms` and `PlatformAiRuntimeState` are the authority for deep Platform AI finance.
- Existing industry projects, rights contracts, production projects, research jobs, localization jobs, and market operations remain canonical. Phase 5 references them rather than cloning them.
- `services/platformAi/platformAiEconomy.ts` remains the weekly settlement and valuation boundary.
- `services/platformAi/platformAiDistress.ts` remains the world-aware distress boundary for catalogue trades, restructuring, rescue, and administration outcomes.
- `services/platformAi/platformAiState.ts` owns normalization and save compatibility.
- `services/streamingPlatformEcosystem.ts` remains the compact simulation boundary for non-core regional and generated operators.
- Player-owned streaming businesses continue through the player economy. They never receive AI efficiency, automatic distress decisions, parent rescue, external-investment cushions, or competitive-world protection.

Phase 5 does not add the full streaming release, awards, or learning system from Phase 6; the general reaction-template system from Phase 7; the final 2,600-week balance certification from Phase 8; a lawsuit system; or a new co-producer recovery mechanic.

## 3. Design principles

1. **Every material cash movement has evidence.** Revenue, cost, debt, rescue, investment, and reserve allocation must have a canonical source and durable ledger row.
2. **No hidden solvency floor.** Cash can reach zero. Unfunded mandatory obligations become honest debt or persisted arrears.
3. **AI advantage is narrow and reversible.** It reduces selected internal operating costs while the controller is AI, never third-party contractual prices, and disappears prospectively after player acquisition.
4. **Failure remains possible.** Parent support and external investment are gated, capped, consequential, and unavailable to the player.
5. **Protect competition, not brands.** The simulation may produce a credible replacement giant rather than rescuing the same famous company forever.
6. **Saved decisions do not reroll.** The same absolute week and episode cannot settle twice or choose a different outcome after reload.
7. **Valuation is derived, finite, and explainable.** It is not a random percentage applied to last week's number.
8. **The phase stores deep rival data without forcing a large new UI.** Existing Forbes, bidding, acquisition, and later news selectors consume concise presentation models.

## 4. Canonical weekly economy

Each AI-controlled platform is processed once per absolute week in this order:

1. Resolve subscription, advertising, and verified contractual income.
2. Accrue mandatory recurring operating costs.
3. Accrue due content, research, technology, localization, rights, market, and financing obligations.
4. Settle mandatory and previously committed obligations before discretionary new spending.
5. Convert uncovered mandatory amounts into debt or persisted arrears; never erase them.
6. Calculate closing cash, closing debt, reserve coverage, and loss runway.
7. Allocate genuine surplus or make at most one eligible distress-stage advancement.
8. Recalculate the standalone valuation and write a compact finance snapshot.

The absolute week is the settlement idempotency boundary. Reprocessing an already settled week returns unchanged canonical finance state.

### 4.1 Income

Supported income sources are:

- paid subscriptions based on paying subscribers and effective pricing;
- advertising based on the eligible active audience rather than pretending every viewer is a paid subscriber;
- verified contract income from active canonical rights and participation records;
- catalogue licensing or sale receipts after the corresponding transaction settles;
- existing co-production participation only where a canonical agreement already exists;
- parent rescue and external investment, recorded in separate exceptional-financing fields rather than ordinary operating revenue.

YouTube-like services use a paid-subscriber equivalent for subscription valuation while advertising continues to use the wider eligible audience. Expired, cancelled, duplicated, or unsupported contracts contribute no revenue.

### 4.2 Costs

Supported costs are:

- delivery and service operations;
- staff and base operations;
- active-country operating costs, taxes, levies, and market policy costs;
- original commission instalments, producer fees, and accepted production overruns;
- marketing commitments;
- rights acquisitions and catalogue packages;
- partner revenue shares;
- research, installation, and technology work;
- localization jobs;
- market entry and expansion;
- debt interest, restructuring, and administration;
- every other canonical contractual obligation.

Costs retain their standard amount and applied amount when an AI efficiency exists. This makes the advantage auditable and allows an acquisition handoff to use player-standard future terms without rewriting history.

### 4.3 Commitment priority

Money is not freely available merely because it appears in `cashReserve`. The economy distinguishes:

- cash reserve;
- due mandatory costs;
- pending one-time obligations;
- accepted production and rights commitments;
- research, localization, and market commitments;
- available uncommitted cash;
- debt and accrued financing cost.

Third-party contractual payments, including producer fees owed to the player, are never discounted by AI efficiency and are never silently subordinated to a new discretionary greenlight.

## 5. AI operating-cost advantage

Deep AI platforms receive a small, profile-based recurring operating-cost advantage so they remain competitive with a player who can optimize manually.

### 5.1 Eligible cost classes

The Phase 5 recurring-operations multiplier applies only to:

- internal delivery and service operations;
- base staff and corporate operations;
- ordinary infrastructure procurement and maintenance represented as internal COGS;
- standard internal localization operations where no third-party fixed contract controls the price.

The multiplier is clamped to `0.88...0.95`, providing a 5–12% saving. Company scale, finance competence, technology, and operating profile choose the value within the band. This is separate from the existing Phase 4 snapshots for research, installation, market entry, localization, lead time, and throughput; those saved terms remain authoritative for commitments already created.

### 5.2 Ineligible cost classes

No AI discount applies to:

- player or NPC producer fees;
- production budgets promised in a commission;
- active bidding offers or backend participation;
- rights acquisition prices;
- taxes, levies, fines, or government charges;
- debt principal or interest;
- catalogue purchase prices;
- any fixed third-party contractual obligation.

### 5.3 Acquisition handoff

At the first player-acquisition handoff week:

- newly accrued recurring operating costs use multiplier `1`;
- new Phase 4 efficiency snapshots use player-standard cost and lead-time rules;
- already settled costs and completed progress remain unchanged;
- accepted immutable third-party terms remain unchanged;
- the handoff week is persisted so reload cannot reapply or remove an advantage twice.

## 6. Runway and reserve discipline

The economy maintains two different measures:

- **Reserve coverage weeks:** closing cash divided by trailing mandatory weekly operating cost.
- **Loss runway weeks:** closing cash divided by the absolute trailing weekly loss; `null` when the platform is not losing money.

Each operating profile supplies a target runway. The target is not the same for every company: conservative mature services may preserve more coverage, while aggressive growth services may accept a lower reserve.

Cash above the target is surplus only after all known commitments are covered. Genuine surplus is allocated through deterministic, recorded decisions:

- approved content;
- approved research or capability work;
- debt reduction;
- approved market growth through the existing commitment systems;
- shareholder or parent distributions represented as cash leaving the simulation;
- later acquisition systems when they expose a canonical commitment.

Surplus allocation cannot create a placeholder project merely to consume cash. Every referenced allocation must point to a real approved commitment, except an explicit distribution.

## 7. Financial state and distress entry

The durable company states remain `ACTIVE`, `DISTRESSED`, `RESTRUCTURING`, and `DORMANT`. Risk bands used for planning may distinguish stable, pressured, and critical companies without adding another public company status.

Distress may begin because of:

- positive debt or newly unfunded mandatory costs;
- loss runway below the critical threshold;
- repeated inability to settle accepted obligations;
- failed restructuring monitoring;
- another explicitly persisted solvency trigger.

A profitable company with low reserve coverage is not treated as if it has only a few weeks until death. Reserve coverage and loss runway remain separate.

## 8. Fixed distress ladder

One persisted `PlatformAiDistressEpisode` controls progression. A stage result is `PENDING`, `APPLIED`, `UNAVAILABLE`, or `FAILED`; unavailable stages remain recorded so the episode cannot reroll them.

The canonical order is:

1. `FREEZE_GREENLIGHTS` — reduce flexible marketing and prevent new risky discretionary greenlights while protecting accepted obligations.
2. `PAUSE_RESEARCH` — stop creating new research, installation, localization-expansion, or market-expansion commitments; affordable active work may finish.
3. `HOLD_COMMISSION` — place an eligible not-yet-physical commission on hold. Accepted player commissions and work already physically underway remain governed by their contracts.
4. `LICENSE_CATALOGUE` — offer an eligible canonical title through a real paid, time-limited platform-to-platform licence. No project clone is created.
5. `WITHDRAW_REGION` — suspend the weakest eligible non-core market after considering audience, cost, revenue, strategic value, home-market status, and existing obligations.
6. `RESTRUCTURE` — reduce discretionary strategy, improve eligible debt terms, block aggressive planning, and enter a persisted monitoring period.
7. `PARENT_RESCUE` — attempt capped parent support only after restructuring has failed and the parent profile is eligible.
8. `EXTERNAL_RECAPITALIZATION` — attempt one consequential outside funding round when parent support is unavailable, ineligible, or insufficient.
9. `BANKRUPTCY_ADMINISTRATION` — stop ordinary commissioning, bidding, research, and expansion while an administration outcome is resolved.
10. `DORMANT` — preserve the legal/catalogue/debt shell, stop normal AI planning, and expose the company as a distressed acquisition opportunity.

Adding the final two active stages requires a schema migration from the existing eight-stage episode order. Migration maps completed stages by stage name rather than raw array index, inserts the new unresolved stages after `PARENT_RESCUE`, preserves every prior result, and is pure and idempotent.

Each stage has a minimum observation cadence. The resolver advances at most one stage per eligible processing week and waits through monitoring windows where required. Reloading cannot shorten a monitoring window.

## 9. Parent rescue

Parent backing remains `NONE`, `LIMITED`, or `STRONG`. A parent rescue requires:

- AI control;
- a failed restructuring monitoring period;
- eligible backing;
- genuine remaining need;
- at least 104 weeks since the last parent rescue;
- no already applied rescue for the current stage.

The cap is bounded by recent operating scale, recent mandatory cost, half of the target reserve, current debt, actual need, and the backing multiplier. `LIMITED` backing receives half the scale allowance of `STRONG` backing.

Rescue proceeds debt-first. Only the remainder may restore cash up to the limited target. The company remains under rescue monitoring and cannot immediately resume aggressive bidding, commissioning, or expansion.

The finance ledger records gross rescue, debt reduction, cash remainder, source, week, and episode. Presentation records may report reputation damage, reduced autonomy, or strategy pressure, but these consequences must be derived from saved state rather than flavor-only claims.

## 10. External recapitalization

External recapitalization is a separate exceptional-financing route, not a second parent rescue and not an automatic game grant.

### 10.1 Eligibility

The deterministic investor score considers:

- trailing revenue and operating margin;
- subscriber base and momentum;
- catalogue and technology value;
- brand reputation;
- home-market strength and strategic reach;
- debt and required new money;
- previous rescue and funding history;
- whether a plausible recovery exists after funding;
- global and regional competitive concentration.

A large or strategically important platform may receive a higher probability because it retains valuable assets or because its disappearance would leave a weak competitive market. Size never guarantees success. A structurally valueless company may receive no offer.

### 10.2 Terms and cap

One recapitalization attempt is allowed per distress episode. A successfully funded platform enters a cooldown of at least 104 weeks before another episode may receive external funding. The amount is capped by recent operating scale, actual debt and arrears, a limited reserve target, investor confidence, and the company's post-money valuation.

Funds settle in this order:

1. unfunded mandatory obligations and arrears;
2. debt principal;
3. a bounded operating reserve;
4. essential accepted productions already underway.

No recapitalization money is available for a new bidding spree, speculative acquisition, or aggressive expansion until monitoring proves recovery.

### 10.3 Consequences

The saved funding round records:

- investor/source archetype;
- gross proceeds;
- debt and arrears reduction;
- cash remainder;
- dilution or control consequence;
- autonomy restriction;
- valuation impact;
- absolute week, episode, and cooldown;
- deterministic public summary data.

The first valuation after funding may remain depressed because dilution, debt, distress, and execution risk offset the new cash. Funding is survival capital, not proof of success.

Player-owned platforms are ineligible. They must use player-facing financing systems.

## 11. Bankruptcy administration

If restructuring, parent rescue, and external recapitalization do not restore a viable path, the company enters administration rather than disappearing immediately.

Administration causes:

- no new commissions, bidding sessions, research, localization expansion, or market launches;
- sharply restricted discretionary marketing;
- continued settlement or accrual of unavoidable accepted obligations;
- individual review of active projects without inventing cancellation rights;
- persisted debt, catalogue, technology, markets, and contracts;
- a severe valuation and reputation discount;
- eligibility for an acquisition outcome where an existing canonical acquisition system supports it.

The deterministic administration outcome can be:

- acquired or recapitalized through an available compatible transaction;
- reduced to a smaller viable regional operator in the compact ecosystem;
- moved to `DORMANT` as a legal/catalogue shell;
- marked for later liquidation handling when a canonical rights-sale system supports it.

Phase 5 does not delete or scatter rights without a canonical transfer. Until such a transaction exists, the dormant entity remains the rights holder.

## 12. Valuation

AI standalone valuation derives from:

- annualized trailing revenue;
- trailing operating margin;
- paying-subscriber equivalent;
- subscriber and revenue growth;
- eligible catalogue strength based on owned or currently valid rights;
- technology and localization capability;
- market reach and reputation;
- debt, arrears, restructuring, rescue, administration, and dormancy discounts;
- dilution or control consequences from external funding.

Expired licences, duplicated entitlements, and the full audience of ad-led services cannot inflate paid-subscriber or catalogue value. The result is clamped to a finite non-negative number and smoothed using 85% prior valuation plus 15% newly calculated valuation unless a later balance audit justifies a versioned change.

Player-controlled platforms retain their player-facing valuation authority; the AI calculator does not overwrite them.

## 13. Competitive-world continuity

The game protects an entertaining competitive structure, not the permanent survival of Netflix or any other named company.

### 13.1 Competition health

A deterministic competitive-health selector observes:

- active global giants;
- visible international challengers;
- strong regional leaders;
- market concentration;
- subscriber concentration;
- regions with insufficient named competition;
- recent bankruptcies, acquisitions, promotions, and launches;
- active generated-operator bounds and launch cooldowns.

It returns an advisory pressure score and reasons. It never directly credits cash, subscribers, projects, or rights.

### 13.2 Launch influence

The existing streaming ecosystem launch processor may use the pressure score to increase the bounded chance of:

- a funded regional challenger;
- a telecom-, broadcaster-, studio-, technology-, or conglomerate-backed entrant;
- a strong regional platform expanding internationally;
- a rare new global entrant when competitive density remains too low.

Existing cooldowns, operator caps, deterministic identity generation, market capacity, and persistence still apply. A pressure score changes a probability within a bounded band; it does not guarantee a weekly launch.

### 13.3 Starting classes

Generated services may begin as:

- local startup;
- funded regional challenger;
- corporate-backed entrant;
- rare global-scale entrant.

A global-scale entrant receives substantial but finite starting capital, several justified markets, compatible historical technology and language capability, a launch catalogue abstraction or canonical entitlements where available, and a coherent generated brand. It does not begin with every capability, guaranteed hits, infinite runway, or copied Netflix behavior.

Brand identity, origin, backer, colors, marks, strategy, home market, strengths, weaknesses, and starting economics are generated once and persisted. Starting strength follows origin rather than always beginning at level zero.

### 13.4 Deep-system boundary

Non-core generated operators continue through the compact ecosystem economy until a dedicated materialization boundary promotes them into a deep Platform AI participant. Visibility in Forbes or global rival summaries does not create an invalid `PlatformId`, rights contract, or commission record.

Phase 5 must keep its selectors and funding/competition data compatible with that future materialization. Full bidding and contract participation begins only after the party-identifier systems can represent the operator canonically.

## 14. Player-facing effects

Phase 5 uses existing surfaces rather than adding a large rival-finance dashboard.

The player may observe:

- logical valuation movement in Forbes streaming rankings;
- distress, restructuring, administration, dormancy, or acquisition status;
- lower offer capacity and fewer commissions from weak platforms;
- catalogue distress licences;
- weak-market withdrawals;
- parent rescue or external funding events;
- regional challengers becoming visible;
- rare credible new global entrants.

Only material events expose presentation payloads. A funding example may read: “Netflix secures a strategic funding round after restructuring,” but the text is derived from a real saved financing record. Routine weekly accounting remains diagnostics-only. The broad News/X/Instagram reaction-template engine remains deferred.

## 15. Data additions

Implementation may evolve exact names during the written implementation plan, but canonical state needs these concepts:

- recurring AI operating-efficiency policy and applied weekly saving;
- finance snapshot fields for standard eligible COGS, applied eligible COGS, efficiency saving, external investment, arrears reduction, and administration cost;
- external recapitalization record with idempotency key, episode, terms, disposition, restrictions, and cooldown;
- administration state with entry week, outcome, and resolution reference;
- distress actions `EXTERNAL_RECAPITALIZATION` and `BANKRUPTCY_ADMINISTRATION`;
- competitive-health snapshot or deterministic selector output sufficient to explain launch pressure;
- generated starting class and backing/origin data compatible with the existing ecosystem operator record.

Saved histories remain bounded. Durable authority must not depend solely on presentation `decisionHistory`.

## 16. Failure handling and invariants

- Invalid or missing income evidence contributes zero rather than fabricated revenue.
- A missing contractual reference cannot be silently paid as a generic expense; it remains unresolved and is reported by the audit path.
- Failed catalogue payment refunds or voids the transfer according to the existing deal ledger.
- Rescue and investment idempotency keys prevent duplicate proceeds.
- A failed funding attempt is persisted and cannot reroll after reload.
- Debt-first disposition cannot make debt or cash negative.
- No company receives both parent rescue and external recapitalization from the same unresolved stage in one week.
- Administration cannot cancel or transfer a project unless the canonical contract permits it.
- Competitive pressure cannot bypass ecosystem caps or create a duplicate company identity.
- Player acquisition disables every future AI-only efficiency, rescue, funding, administration decision, and world-director protection while preserving history and obligations.

## 17. Verification

Focused audits must prove:

1. subscription, advertising, contract, trade, rescue, and investment income are separately reconciled;
2. mandatory, discretionary, financing, localization, research, market, and contractual costs settle exactly once;
3. recurring AI COGS saves 5–12% only on eligible internal costs;
4. producer fees, rights prices, bidding offers, taxes, and debt are never discounted;
5. player acquisition changes future eligible cost multiplier to `1` without rewriting prior snapshots;
6. profitable reserve coverage and loss runway remain distinct;
7. unfunded mandatory cost creates exact debt or arrears with no hidden cash floor;
8. surplus references real approved commitments or a distribution;
9. the migrated ten-stage distress order preserves existing episode results by name;
10. only one distress stage advances per eligible cadence and reload cannot skip monitoring;
11. catalogue distress trades retain one canonical project and valid rights evidence;
12. parent rescue requires failed restructuring, respects backing and the 104-week cooldown, and pays debt first;
13. external funding can succeed or fail, is capped, records dilution/restrictions, and cannot fund immediate aggressive spending;
14. a player-owned platform receives no AI rescue or external funding;
15. administration preserves debt, contracts, catalogue, and projects and cannot invent transfer authority;
16. valuation is finite, non-negative, deterministic, smoothed, and reduced by debt/distress/dilution;
17. competitive pressure can raise a bounded launch chance but cannot directly grant money or subscribers;
18. generated companies may start at multiple strength classes and retain stable identity across reload;
19. Forbes/global selectors can include qualified generated challengers without invalid deep-system IDs;
20. save migration, save compaction, save transfer, and 104-week resume parity preserve canonical shape, including empty collections;
21. existing sourcing, production, player-commission, research, localization, bidding, rights, acquisition, ecosystem, and build checks remain green.

Phase 5 does not claim the full 2,600-week endurance suite. That certification remains Phase 8, although a shorter adverse multi-year economy simulation is required here.

## 18. Completion criteria

Phase 5 is complete when:

- the legacy free-cash/random-valuation path no longer runs alongside Platform AI settlement;
- every deep AI platform has real, explainable weekly income, cost, cash, debt, commitments, reserve, and valuation;
- recurring AI COGS advantage is narrow, recorded, bounded, and removed after acquisition;
- excess cash is visibly allocated instead of accumulating without purpose;
- platforms can progress through distress, restructuring, rescue, outside funding, administration, and dormancy;
- not every distressed company is rescued or funded;
- established platforms can fail without corrupting canonical projects or rights;
- competitive density can recover through bounded credible entrants rather than immortal incumbents;
- generated entrants can begin with origin-appropriate strength and stable branding;
- player-owned platforms receive none of the AI-only protections;
- focused audits, migration checks, build, and deterministic resume checks pass.

## 19. Recommended implementation slices

1. Audit current economy paths, legacy free cash, existing efficiency application, and exact-once reconciliation.
2. Add the recurring eligible-COGS policy, snapshot evidence, acquisition handoff, and focused tests.
3. Extend distress state and migration for external recapitalization and bankruptcy administration.
4. Implement deterministic funding eligibility, terms, debt-first disposition, restrictions, and presentation records.
5. Connect administration to existing acquisition/dormancy boundaries without inventing rights transfers.
6. Add competitive-health selection and bounded launch-class influence to the existing ecosystem processor.
7. Integrate valuation, Forbes/bidding selectors, save normalization, and all adjacent regression audits.
