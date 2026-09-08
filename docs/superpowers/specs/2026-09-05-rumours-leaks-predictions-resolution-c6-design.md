# Project C6 — Rumours, Leaks, Predictions, and Resolution

**Status:** COMPLETE — implemented and verified on 2026-09-05

## Purpose

C6 lets Actor Empire's media world discuss plausible future outcomes without confusing speculation with game truth. Recurring outlets, journalists, analysts, creators, and fandoms can publish rumours, rare leaks, and predictions; later canonical industry events confirm, partly confirm, refute, supersede, or leave those claims unverified. The world remembers who was accurate, which gives media personalities a real track record while keeping the system compact, deterministic, optional for the player, and safe for long mobile saves.

## Chosen approach

Use an evidence-linked hybrid model:

1. Save one lightweight, atomic claim for each important rumour, leak, or prediction.
2. Save its source, evidence, typed target, expected outcome, publication window, and eventual canonical resolution.
3. Derive ordinary posts, replies, profile summaries, and most follow-up presentation from those bounded records.

A posts-only implementation was rejected because reloads and week progression would forget what each source predicted. A full invisible journalist simulation was rejected because it would add a parallel world model, inflate saves, repeat content templates, and increase Process Week cost without improving player decisions.

## Authority and truth boundary

- `WorldState.industryEvents` remains the only authority for completed public facts.
- `WorldState.industryMedia.stories` remains the canonical media-story registry for subjects already grounded in B7 events.
- C6 claims are assertions about possible future outcomes, not `IndustryEventFact` records.
- A C6 claim cannot cast talent, greenlight/cancel/release a project, create a franchise decision, award a prize, reserve or transfer rights, fund or close a company, change ownership, or create a contract.
- Resolution comes only from later retained canonical facts or an explicitly defined expiry/supersession rule.
- A leak can reveal that an eligible AI-controlled company was genuinely considering a saved intention at publication time. It does not promise that the company will execute that intention.
- Player-controlled companies, acquired subsidiaries, and player-owned streaming platforms do not expose private unpublished intentions in C6. Player-confidential leaks require a future staff/security/crisis system with counterplay.
- Copy must never fabricate direct quotations, confidential contract amounts, private relationships, criminal conduct, medical claims, or legal accusations.
- `FACT`, `ANALYSIS`, `OPINION`, `SPECULATION`, and the new claim labels remain visibly distinct.

## Claim families

### Rumour

A rumour is a public inference from retained evidence. It may use project stage, repeated partnerships, public meetings, release activity, recent rights movement, franchise history, or other observable facts. It never claims to possess private confirmation.

### Leak

A leak is a rare report derived from an actual, saved, leak-eligible AI intention. The source company must still be AI-controlled, the intention must be meaningful and active, the subject must already have a valid public story anchor, and the source must have sufficient access. C6 saves a publication-time snapshot so later AI history compaction cannot rewrite what was genuinely being considered.

Leaks are restricted to safe entertainment-business intentions such as a platform considering a commission, a studio exploring a franchise continuation, a tentative release window, a rights target, or an eligible casting direction. They cannot reveal exact hidden budgets, bid ceilings, financial formulas, negotiation rolls, player data, or internal AI debug scores.

### Prediction

A prediction is an attributed forecast based on public evidence. Predictions include awards forecasts, platform-destination calls, casting calls, release-window estimates, sequel/universe expectations, company funding/restructuring forecasts, and project outcome forecasts. The source needs relevant subject/category expertise but no private access.

## Saved claim model

Industry-media schema advances from 5 to 6 with bounded claim and source-record collections.

Each claim stores:

- stable ID and exact-once publication key;
- kind: `RUMOUR`, `LEAK`, or `PREDICTION`;
- lifecycle status: `OPEN`, `CONFIRMED`, `PARTLY_CONFIRMED`, `REFUTED`, `EXPIRED_UNVERIFIED`, or `SUPERSEDED`;
- atomic claim category and expected canonical event family;
- subject key and stable company, platform, project, production, universe, talent, rights-contract, transaction, or award references where relevant;
- anchor story ID, anchor event ID, and bounded evidence-event IDs;
- source institution/personality and publication channel;
- fact-safe headline, summary, known evidence, interpretation, and uncertainty wording;
- visible confidence band and hidden deterministic strength score;
- publication, earliest-resolution, expiry, last-evaluated, and resolved absolute weeks;
- optional leak-intention snapshot containing only the minimum safe claim inputs;
- resolution event IDs, resolution explanation, and saved source-record delta;
- optional C3 discussion/response, C4 video, or C5 fandom/campaign lineage.

Claims are atomic wherever practical. A post may discuss multiple claims, but each part resolves independently. `PARTLY_CONFIRMED` is reserved for genuinely indivisible scoped claims such as a multi-market rights destination or a release-window range; it is not a fallback for vague writing.

## Supported claim categories and typed resolution

C6 v1 supports:

- `CASTING` — resolved by canonical cast evidence with stable talent identity;
- `PROJECT_STATUS` — greenlight, hold, cancellation, sale, release planning, or release;
- `PLATFORM_DESTINATION` — resolved by canonical rights contract/deal/transfer identity and eligible territory scope;
- `RELEASE_WINDOW` — resolved against the saved release plan or actual release week with an explicit tolerance window;
- `FRANCHISE_DIRECTION` — sequel, spin-off, crossover, revival, or conclusion resolved by canonical franchise decisions;
- `AWARDS` — nomination/win calls resolved by canonical award events;
- `COMPANY_MOVE` — funding, restructuring, acquisition, recovery, expansion, or closure resolved by canonical company events;
- `PROJECT_OUTCOME` — hit, flop, or sleeper predictions resolved only after the corresponding canonical outcome.

Resolution adapters compare stable identifiers and typed values, never brittle headline text. Where B7 evidence currently lacks a necessary stable reference, C6 may enrich the existing collector/evidence schema—for example, with a talent or universe reference—without creating another source of truth.

Each category defines its own realistic minimum and maximum observation window. A casting prediction may resolve quickly; an award or franchise prediction may remain open longer. If no confirming or contradicting fact exists by expiry, the result is `EXPIRED_UNVERIFIED`, not automatically false.

## Eligibility and selection

C6 does not manufacture claims to fill quiet weeks. A candidate requires:

- a retained active/recent C1 story and valid anchor event;
- a subject/category combination supported by a typed resolver;
- enough public evidence, or a valid leak-eligible AI intention;
- no equivalent open claim for the same subject, category, expected target, and source cycle;
- a suitable C2 institution/personality based on focus, region, language, access, credibility, independence, sensationalism, and recent workload;
- a deterministic relevance score above the category threshold.

Selection balances importance, cultural momentum, unresolved uncertainty, source fit, regional relevance, novelty, recent saturation, and deterministic variance. Wealth or fame cannot guarantee favourable predictions. A smaller regional project can generate credible local chatter while a routine blockbuster may generate nothing new.

At most one new saved claim is created per entered week. At most two claim-related public beats—including resolutions—publish in one week, with player-related or high-importance resolutions taking priority. One subject/category pair cannot dominate consecutive weeks unless a new canonical fact materially advances it.

## Leak safety and ownership conversion

The leak adapter reads only compact saved intentions already owned by Platform AI, Studio AI, or shared industry intelligence. It does not cause those systems to evaluate again and does not consume or mutate their decisions.

A candidate leak is suppressed when:

- the company is player-controlled at publication time;
- the saved intention belongs to an acquired/delegated player subsidiary;
- no public story anchor exists;
- it exposes a bid ceiling, exact private offer, unreleased contract, debug score, or confidential player choice;
- the underlying record is malformed, abandoned, already public, or too old;
- the same intention has already generated a claim.

If the player acquires the company after an AI leak was published, the historical claim remains valid and can still resolve. No new private player-side leaks are created after control changes.

## Source reliability and media identity

C6 extends C2 identities rather than creating duplicate journalists. Each source receives a compact category-specific prediction record containing:

- calls made, confirmed, partly confirmed, refuted, and expired;
- current bounded accuracy/reliability score by supported category;
- current streak and last resolved claim IDs;
- bounded recent claim history.

Credibility changes are small, deterministic, and applied exactly once when a claim resolves. A correct difficult leak can improve access/reliability more than an obvious prediction. A sensational false claim reduces reliability more than an expired report. `EXPIRED_UNVERIFIED` produces little or no accuracy movement because absence of evidence is not proof of falsehood.

The engine retains precise numbers. Player-facing profiles use game-world presentation such as `Usually reliable on casting`, `Mixed rights record`, `Three recent calls confirmed`, or a compact confirmed/refuted count. Source reliability influences later assignment and audience trust but cannot directly change company finances, project quality, ratings, awards, contracts, or rights.

## Multi-week lifecycle

### Publication

The source publishes the claim with a visible `RUMOUR`, `UNCONFIRMED / EXCLUSIVE`, or `PREDICTION` label, an evidence summary, and uncertainty language. A saved claim may seed one X discussion and, when editorially appropriate, one News, YouTube, or Instagram/fandom beat through existing systems.

### Open discussion

Existing C2 voices may support, challenge, contextualize, or mock the claim. C4 theory creators may publish a video; C5 fandoms may react or campaign. These surfaces retain the claim ID plus their existing event/story lineage and may not strengthen the claim into fact.

### Evaluation

On each later entered week, only open due claims are checked against newly collected and retained B7 facts. Same-week claims cannot resolve from the event that created their public evidence. Evaluation is deterministic and exact-once.

### Resolution

When evidence matches, contradicts, narrows, or supersedes the expected outcome, C6 saves the resolution and updates the source record once. Significant resolutions create a restrained follow-up; ordinary resolutions update the original card/profile silently.

### Expiry

If the observation window closes without adequate evidence, the claim becomes `EXPIRED_UNVERIFIED`. The interface says `Never substantiated` or equivalent, not `False`.

## Player involvement and workload

C6 is observation-first. There is no recurring DM, mandatory decision, or project-by-project rumour screen.

For one important player-related open claim, the existing C3 response flow may offer:

- `Deny the report`;
- `Challenge the source`;
- `Tease the audience`;
- `No comment`;
- ignore the claim.

Nothing publishes automatically. Silence and `No comment` are safe. The player cannot press a response button to make the predicted project outcome true or false.

If the player voluntarily publishes an unambiguous denial and a later canonical event directly contradicts it, C6 may apply one small capped credibility/controversy adjustment through the existing C3 consequence boundary. Ambiguous teasing, silence, and no-comment responses cannot receive a dishonesty penalty. No resolution may charge money or energy, change fame, alter a project, or force a relationship/contract result.

Large slates remain manageable because claims are selected by uncertainty and cultural relevance, not generated for every active project.

## Player-visible experience

### News

Major claim articles show a clear claim label, source/byline, concise `What we know` evidence, `What is being claimed`, and source track-record context. When resolved, the original detail view receives a compact `What happened next` strip linked to the real canonical event. Only high-importance claims and resolutions enter the main News feed.

### X

X is the primary real-time surface. It shows the originating report, bounded sceptical/supportive replies, quote-posted receipts when resolved, and optional C3 player responses. Existing C3 thread layout and limits remain authoritative.

### YouTube

C4 creator channels can publish prediction/theory videos tied to an open claim and follow-up breakdowns after resolution. C6 does not reroll or duplicate C4 video performance. Correct and incorrect calls contribute to the creator personality's C6 reliability record while C4 remains owner of views, subscribers, momentum, sponsors, and creator revenue.

### Instagram and fandoms

C5 fandoms may react to culturally important casting, franchise, award, or release rumours. The post is labelled as fan reaction to an unconfirmed claim. C6 cannot turn a fandom request into evidence or apply C5 campaign effects again.

### Source profiles and claim history

Existing institution/personality profiles receive a compact `Track record` section with recent confirmed, refuted, and unresolved claims plus category-language summaries. There is no SaaS-style diagnostic dashboard and no raw AI formula exposure.

## Cross-system data flow

The entered-week order becomes:

1. Platform and studio AI process their compact decisions.
2. B7 collects canonical facts.
3. C1/C2 project canonical stories and initial coverage.
4. C6 resolves previously open claims against the new canonical facts.
5. C3 resolves due player responses.
6. C4 processes creator videos.
7. C5 advances fandoms/campaigns.
8. C6 selects at most one new claim from the post-simulation state and publishes bounded claim beats.

Resolution occurs before creation so a newly created claim cannot resolve in its publication week. Claim publication may reuse C3/C4/C5 adapters, but every downstream record retains the claim ID and all prior event/story lineage. Same-week replay remains inert through saved publication/evaluation keys and the existing industry-world checkpoint.

## Copy and template system

Claim copy combines bounded axes:

- claim kind and category;
- source institution kind, role, archetype, access, credibility, and sensationalism;
- story category/stage and subject kind;
- evidence strength and confidence band;
- region, language, genre, platform, and company identity;
- supportive, sceptical, analytical, antagonistic, or fan-theory angle;
- open, resolved, refuted, expired, or superseded lifecycle state;
- player response and prior source history where applicable.

The generator receives validated labels and typed references only. `Rumour`, `reportedly`, `believed`, `prediction`, `may`, and comparable uncertainty language are mandatory in unconfirmed copy. Direct factual grammar is reserved for canonical resolution text. Missing or contradictory evidence suppresses publication rather than producing generic invented claims.

## Effects and isolation

Autonomous C6 processing may update only:

- claims and their resolution metadata;
- source category reliability, access reputation, streak, and bounded history;
- claim-linked discussion heat and media presentation metadata;
- derived News/X/Instagram/YouTube reference fields and publication keys.

An explicit player response may additionally use the already bounded C3 reputation, controversy, follower, stance, and discussion-heat effects. C6 must prove isolation for money, energy, fame, project quality, IMDb ratings, box office, streaming revenue, rights, contracts, releases, production, awards, company ownership/state, AI plans, C4 performance, C5 campaign outcomes, and unrelated social records.

## Persistence and compaction

- Industry-media schema advances from 5 to 6.
- Save migration advances from 38 to 39.
- Retain at most 192 claims and 640 processed claim keys.
- Retain at most 12 evidence-event IDs and 4 resolution-event IDs per claim.
- Retain at most 16 recent claim IDs per source and 8 category summary records per source.
- Compaction preserves open claims first, then player-related claims, recent/high-importance resolutions, and source-history anchors needed for displayed records.
- Resolved/expired claims may be compacted into source category aggregates after their display-history window closes.
- Orphaned claims are removed when their source, subject, anchor story, or required canonical evidence is invalid. Cross-references are repaired during normalization.
- Old saves receive empty normalized C6 collections. Migration does not fabricate historical rumours or source accuracy.

## Error and edge-case handling

- Missing stable resolution identity suppresses a claim category until evidence is adequate.
- A changed project title does not break a claim because stable IDs are authoritative.
- A transferred rights contract can partly confirm a scoped destination claim only when the territory/window overlap is explicit.
- Multiple contradictory events resolve according to canonical chronology and category rules; later history may supersede a previously correct short-term claim without rewriting the original resolution.
- An AI plan abandoned before publication cannot leak. An intention abandoned after publication remains a historically genuine consideration but resolves from the later public outcome.
- Acquired/closed companies retain historical source and claim records while generating no new claims when inactive.
- A deleted/compacted media personality can retain an institution attribution if the institution remains valid; otherwise the orphan claim is removed.
- Same-week replay, duplicate facts, reload, or duplicated AI intentions cannot duplicate claims, source deltas, posts, or player effects.
- Renderers tolerate malformed legacy data and never show `undefined`, `NaN`, debug scores, private bid ceilings, or remote-only art.

## Verification plan

Focused C6 audits must cover:

- claim eligibility, atomic identity, deterministic selection, category variety, and no every-project spam;
- rumour/leak/prediction labelling and prohibited factual language;
- leak eligibility, AI-only private-intent boundary, acquisition cutover, safe snapshots, and zero AI mutation;
- typed confirmation, partial confirmation, refutation, supersession, and expiry resolution;
- source category records, exact-once reliability movement, and fair expired-claim treatment;
- C3 optional response reuse, safe silence/no-comment, denial contradiction, and effect caps;
- C4/C5 linkage without performance or campaign-effect duplication;
- News, X, YouTube, Instagram, detail/profile, and resolution-receipt presentation;
- save migration 39, schema 6 normalization, compaction, orphan cleanup, and round-trip parity;
- player/company economy, rights, project, production, award, ownership, AI-plan, and unrelated-social isolation;
- C1–C5 and B7 regressions, production build, and mobile-width browser smoke.

The combined Project C 400-year, save-growth, mature Process Week, and physical low-end-device certification remains C8.

## Completion gate

C6 is complete when rumours, leaks, predictions, and facts are visibly distinct; every saved claim has valid source, subject, evidence, typed target, and resolution rules; later B7 facts resolve claims deterministically; sources develop meaningful bounded category records; resolutions appear naturally in the existing media apps; player response is optional and silence is safe; no claim changes the simulated world; old saves migrate safely; mobile presentation remains usable; and all focused plus adjacent verification passes.

## Deferred

- C7: permanent feuds, long-term narrative memory, relationship arcs between media figures and subjects, and player media ownership/control strategy.
- C8: final variety, balance, save growth, mature Process Week performance, 400-year certification, and physical-device testing.
- Legal accusations, lawsuits, confidentiality breaches, whistle-blowers, staff espionage, paid disinformation, and player-controlled planted rumours remain outside C6.
