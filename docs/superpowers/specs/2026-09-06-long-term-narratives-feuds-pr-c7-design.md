# Project C7 — Long-Term Narratives, Feuds, PR, and Media Memory

**Status:** Approved for implementation in chat on 2026-09-06

## Purpose

C7 makes Actor Empire's media world remember important history. Canonical industry events can develop into long-running, evidence-backed narratives; recurring personalities can form believable relationships and feuds; resolved C6 calls affect later authority; and the existing publicist becomes an automatic amplification and damage-control system. C7 also connects eligible player social promotion to the existing project-buzz and Release Wizard marketing path without creating another marketing engine or recurring player chore.

## Authority boundaries

- `WorldState.industryEvents` remains the sole authority for completed industry facts.
- C1 remains the shared story identity and lifecycle authority.
- C2 remains the media institution, personality, voice, and authorship authority.
- C3 remains the public discussion and player-response authority.
- C4 remains the industry YouTube video, performance, and creator-economy authority.
- C5 remains the fandom and public-campaign authority.
- C6 remains the rumour, leak, prediction, truth-resolution, and source-record authority.
- Existing project `promotionalBuzz`, Release Wizard campaign state, and marketing-reality calculations remain the commercial promotion authorities.
- C7 may summarize, frame, remember, amplify bounded positive media effects, and mitigate bounded negative media effects. It cannot change canonical facts, project quality, reviews, IMDb ratings, awards, rights, contracts, production, company ownership, or whether a C3/C6 outcome occurred.

## Existing-system findings

The repository already has several real but partly separate paths:

- Career-page Instagram and X promotion actions create posts and add buzz to a specific commitment.
- Press conferences update the selected commitment's buzz and player-facing stats.
- Release Wizard persists marketing spend, allocation, positioning, timing, fit, forecast, and risk.
- Release creation consumes `Commitment.promotionalBuzz`.
- Marketing reality creates bounded buzz, reputation, franchise, News, and X consequences.
- The publicist supplies weekly fame support plus C3 recommendation and backfire mitigation.
- Generic X and Instagram posts primarily update personal social results and do not consistently identify a promoted project.
- YouTube has a `PROJECT_PROMO` upload plan but does not consistently feed the selected project's existing promotion state.

C7 centralizes project-promotion attribution and PR application while preserving each existing owner.

## Long-term narratives

`IndustryMediaNarrative` is a compact, saved interpretation of multiple canonical events about one stable subject. Supported themes include ambitious risk-taker, reckless spender, awards powerhouse, franchise architect, overhyped star, reliable hitmaker, comeback, decline, global expansion, fading dominance, difficult collaborator, and underdog.

Each narrative stores:

- stable ID, subject key/name, theme, and polarity;
- internal stage: `EMERGING`, `ESTABLISHED`, `DEFINING`, `FADING`, or `RESOLVED`;
- strength, confidence, supporting and contradicting evidence totals;
- first, last-advanced, next-eligible-publication, and optional resolved weeks;
- primary story/event lineage;
- up to eight `IndustryMediaNarrativeLandmark` records.

Stages are internal simulation state. Player-facing copy expresses the history naturally rather than exposing a synthetic status badge or raw strength score.

### Qualification and progression

A narrative candidate requires a meaningful B7 fact already linked to C1. The deterministic score combines event importance, subject repetition, existing story depth, theme fit, corroborating or contradictory facts, recency, and a stable tie-break. C7 creates at most one new narrative per entered week.

Later evidence may strengthen, contradict, transform, fade, or resolve a narrative. Contradictory narratives may coexist when they represent defensible competing interpretations. No narrative may be advanced twice by the same canonical event.

### Landmark memory

Landmarks retain only meaningful history: origin, major supporting evidence, major contradiction, player confrontation, resolved C6 call, major success/failure/comeback, relationship turning point, and latest decisive development. Each stores stable evidence IDs, week, kind, summary, and signed impact. Ordinary feed copy is never copied into permanent memory.

## Media relationships and feuds

`IndustryMediaRelationship` expands C2 subject stance into a bounded relationship between a media personality and a stable subject. It stores affinity, respect, trust, tension, familiarity, direction, last meaningful interaction, up to twelve landmark interaction IDs, and optional feud state.

Internal feud states are `NONE`, `BUILDING`, `ACTIVE`, `COOLING`, and `RESOLVED`. A feud cannot start from one negative item. It requires repeated meaningful conflicts across separate evidence events or a qualifying combination of hostility, direct C3 confrontation, refuted C6 call, and sustained tension.

Feuds can escalate, cool through inactivity, become one-sided, resolve, or become grudging respect. Signature antagonists retain their negative identity bounds and never turn into generic supporters; overwhelming evidence may force qualified praise. Supporters cannot deny canonical failures and may become disappointed after repeated contrary evidence.

C7 may also save bounded personality-to-personality rivalries when repeated evidence-linked public disagreements exist. These remain media relationships and cannot alter business outcomes.

## C6 source-history integration

C7 reads category-specific C6 source records when assigning authority and follow-up framing. A source with a strong casting record may receive more weight on casting claims; repeated refutations reduce later authority in that category. Player-facing copy uses qualitative descriptions such as `usually reliable on casting` or `mixed platform-reporting record`; raw reliability formulas remain hidden.

## Project-promotion attribution

Eligible player content can optionally carry a stable promoted project/commitment ID:

- X career or promotional posts;
- Instagram announcements, BTS posts, Reels, and celebrations;
- YouTube `PROJECT_PROMO` uploads;
- existing Career-page X/Instagram promotion;
- press conferences and red-carpet promotion.

`applyProjectPromotionAttribution` calculates and saves a single bounded attribution from post performance, platform/type fit, player reach, publicist amplification, campaign positioning/fit, recent project-promotion fatigue, and deterministic variance. It updates only the selected active project's existing `promotionalBuzz` and a bounded attribution ledger. Lifestyle or unrelated content cannot affect a project.

The same publication key is exact-once across all entry points. Repeated promotion receives diminishing returns, and a post cannot affect multiple projects. Organic promotion spends only the existing post/action energy. Paid campaign spending remains owned by Release Wizard and is never charged again.

## Automatic PR system

The publicist becomes a passive, paid team benefit rather than a recommendation-heavy control mode. Raw C3, C6-response, social, press, promotion, or C7 relationship effects are calculated first. `applyPublicistMediaModifier` then records the raw effects, applied effects, publicist tier, capacity use, and exact-once key.

PR may amplify bounded positive follower, reputation, project-buzz, relationship, and narrative-momentum effects. PR may reduce bounded negative reputation, controversy, follower, discussion-heat, relationship, feud-tension, and narrative-momentum effects. It cannot reverse an effect's direction or change the named outcome: `BACKFIRED` remains backfired, a refuted claim remains refuted, and a flop remains a flop.

Initial balance targets are:

| Tier | Positive amplification | Negative reduction | Major results per entered week |
|---|---:|---:|---:|
| Rookie | 5% | 10% | 1 |
| Standard | 12% | 22% | 2 |
| Elite | 20% | 35% | 3 |
| Legend | 28% | 45% | 4 |

When eligible incidents exceed capacity, the deterministic selector protects the highest-importance and highest-potential-damage player-related items first. Unused capacity is not banked. Hiring or dismissing a publicist changes only future unresolved effects.

The publicist's existing weekly salary remains the complete recurring cost. C7 adds no PR action currency and no automatic publishing.

## Player workload and presentation

C7 has no custom-control mode, no standing-policy configuration, and no mandatory weekly screen.

- News detail may show a compact `The story so far` landmark timeline.
- X profiles and discussions may show qualitative relationship history and recall prior confrontations.
- C4 may create retrospectives, feud histories, comeback breakdowns, and prediction-accountability videos while retaining C4 performance ownership.
- C5 may reference long-running rivalries and anniversaries while retaining C5 campaign ownership.
- The existing Team app publicist card shows tier benefits, current-week capacity, and recent concrete after-action records such as additional reach or prevented damage.
- Appropriate X, Instagram, and YouTube composers receive a minimal project selector only when eligible active projects exist.

The player continues to choose whether to publish existing posts or C3 responses. Silence remains safe. PR never auto-publishes or invents a player statement.

## Entered-week order

The single `processIndustryWorldWeek` seam remains authoritative:

1. Existing platform/studio simulation and B7 event collection run.
2. C1 stories advance and C2 coverage assignments remain available.
3. C6 open claims resolve against new B7 facts.
4. C3 pending player responses resolve to raw effects.
5. C7 applies eligible publicist protection/amplification exactly once.
6. C4 videos and C5 fandom campaigns advance using saved facts/outcomes.
7. C7 advances existing narratives and relationships, then selects at most one new narrative.
8. C6 may create one new claim.
9. Existing presentation services publish bounded News/X/Instagram/YouTube items.

Direct player social actions use the same focused attribution and PR services outside week progression, save their result immediately, and cannot be reapplied during the next entered week.

## Failure handling

- Missing event/story evidence prevents narrative or landmark creation.
- Missing personalities prevent relationship changes and fall back to ordinary fact-safe coverage.
- Missing projects make promotion attribution a visible no-op; no other project is guessed.
- Malformed PR records are normalized or discarded without invalidating the save.
- A dismissed publicist does not erase completed interventions.
- Invalid or excessive relationship/narrative data is clamped and compacted while pending player-relevant state is retained first.
- If C7 copy cannot prove its referenced history, presentation falls back to the current factual C1/C2 copy.

## Persistence and bounds

Industry-media schema advances from 6 to 7 and save migration advances from 39 to 40.

Initial bounds:

- 120 narratives;
- 8 landmarks per narrative;
- 240 media relationships;
- 12 landmark interactions per relationship/personality-subject history;
- 160 saved PR interventions;
- 160 saved project-promotion attributions;
- 640 exact-once C7 processing keys;
- at most one new narrative per entered week;
- at most one dedicated retrospective beat inside an eight-week global cooldown.

Old saves receive empty C7 collections. Migration does not fabricate historical narratives, feuds, PR interventions, or project links. Existing C1–C6 state remains valid.

## Verification requirements

Focused executable audits must prove:

1. schema-7 normalization, orphan cleanup, clamping, prioritization, and all bounds;
2. deterministic evidence-backed narrative creation, progression, contradiction, fading, and landmark retention;
3. feud qualification across separate evidence, escalation/cooling/resolution, signature-role bounds, and silence safety;
4. C6 category record influence without raw-score exposure or truth mutation;
5. project selection, exact-once attribution, single-project isolation, promotion fatigue, and no double marketing charge;
6. PR tier amplification/reduction, capacity priority, no sign reversal, no outcome rewrite, and exact-once reload safety;
7. entered-week ordering and isolation from canonical business/project state;
8. News/X/YouTube/Instagram/Team presentation and legacy fallback;
9. migration 39 to 40 and compacted-save recovery;
10. C1–C6, B7, promotion/marketing, social, YouTube, production build, and relevant mobile regressions.

The combined 400-year/device certification remains C8.

## Completion gate

C7 is complete when evidence-backed long-term narratives persist; media personalities remember meaningful relationships; feuds form only from repeated real conflict and can evolve or cool; C6 source history affects later qualitative authority; eligible player promotion feeds exactly once into the selected project's existing buzz; Release Wizard remains the only paid-marketing authority; publicists automatically amplify positive media effects and reduce negative ones within tier/capacity bounds; no new recurring player chore exists; silence is safe; canonical outcomes cannot be rewritten; old saves migrate safely; and focused plus adjacent verification passes.

## Intentionally deferred

- Full media-company acquisition, outlet economics, staff, editorial independence, and media-conglomerate ownership require a dedicated future Media Empire project.
- Legal retaliation, defamation, confidentiality litigation, bribery, paid disinformation, staff espionage, and planted player rumours remain outside C7.
- Combined variety, balance, mature-save growth, mobile performance, 400-year simulation, and physical low-end device certification remain C8.
