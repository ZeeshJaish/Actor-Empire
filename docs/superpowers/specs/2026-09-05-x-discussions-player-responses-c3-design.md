# Project C Phase C3 — X Discussions, Public Statements, and Player Responses Design

**Status:** Approved for implementation on 2026-09-05

## Purpose

C3 turns selected C1 stories and C2-authored X posts into bounded public discussions in which the player may respond. The goal is meaningful media agency without turning every project into a chore or creating a second simulation.

The player can leave a discussion alone, reply directly, quote it publicly, or issue a formal statement when the story is important enough. A response appears immediately, then the public reaction resolves once on the next entered week. Silence is a valid choice and has no automatic penalty.

## Authority boundaries

- `WorldState.industryEvents` remains the only canonical fact ledger.
- C1 remains the story-identity and lifecycle authority.
- C2 remains the institution, personality, stance, authorship, and fact-safe voice authority.
- C3 discussions and responses are public interpretation. They cannot create or change projects, contracts, rights, money, ownership, production, awards, company results, or private business relationships.
- C3 may apply small, bounded public consequences to reputation, controversy, X followers, media-only stance, and discussion heat.
- A response cannot rewrite the source fact, delete unfavourable coverage, or guarantee a positive reaction.

## Player experience

An eligible C2 X post shows a small `Discussion` marker. Opening it displays a compact thread made from recurring C2 personalities rather than anonymous filler. Player-related posts show optional response controls while their two-week response window is open.

The player may choose:

- tone: `CLARIFY`, `ACKNOWLEDGE`, `DEFEND`, `CHALLENGE`, `HUMOUR`, or `APPRECIATION`;
- format: `REPLY`, `QUOTE`, or, for high-importance player stories, `STATEMENT`;
- speaker: the player personally or their studio when the canonical story supports a studio/business subject.

The existing generic X composer and generic replies remain available for ordinary non-C3 posts. C3 takes over only when a post has valid B7/C1/C2 lineage.

## Discussion lifecycle

```text
B7 fact -> C1 story -> C2 X post -> C3 discussion
                                  -> optional player response
                                  -> next entered week resolution
                                  -> bounded reaction / follow-up
```

A discussion is created deterministically for a meaningful C2 X item with a retained event, story, and media identity. It stores only a compact set of turns and memory. The system does not simulate every user or run the entire media roster.

The response opportunity closes two entered weeks after the source event. Expiry means only that the player can no longer publish an official C3 response to that beat. It creates no punishment. A later canonical event in the same story can open a fresh discussion.

There is at most one official player response per canonical event. Resubmission and replay are exact no-ops.

## Public discussion turns

Each discussion receives a small deterministic cast selected from the existing C2 identities. Turns retain personality, institution, claim mode, source event, story, week, tone, and parent/quote relationship.

The signature antagonist remains recognizably hostile and the signature supporter remains recognizably supportive, but neither may contradict the canonical event. Other reporters, analysts, critics, and commentators can agree, qualify, or challenge the initial framing. Speculation remains labelled as uncertainty.

Discussion generation is bounded and event-driven. Inactive weeks do not grow threads.

## Response content and publicist reuse

C3 provides authored response drafts rather than requiring free-text composition for every story. Tone and format select a fact-safe template grounded in the source story. The player publishes the chosen draft with one tap.

The existing `team.publicist` is reused:

- no publicist: direct plain-language drafts and no strategic recommendation;
- rookie/standard: a recommendation plus a basic risk note;
- elite/legend: a more reliable format/tone recommendation and modest protection from a poorly received result.

The publicist never publishes automatically and never guarantees success.

## Deterministic resolution

The public reaction resolves on the next entered week. Outcome is `LANDED`, `MIXED`, `BACKFIRED`, or `IGNORED`. It is derived from a deterministic key and bounded inputs:

- event importance and discussion heat;
- source institution credibility/reach;
- source personality stance and aggression;
- tone/format fit for the canonical event and story category;
- player reputation, audience size, and controversy;
- response timing;
- publicist tier;
- deterministic variance.

The response stores its resolved outcome and applied deltas so save/reload cannot reroll it. Effects are clamped to:

- reputation: `-3..+3`;
- controversy: `-8..+10`;
- media stance: `-6..+6`;
- discussion heat: `-25..+30`;
- followers: a small reach-relative, absolutely bounded change.

No fame, cash, energy, rights, production, project quality, award, company, or contract value changes are permitted. C3 responses use no energy because they are optional media choices, not weekly grinding tasks.

## Presentation projection

The published response is inserted into the existing X feed/posts immediately and linked to the source via `mediaDiscussionId`, `mediaResponseId`, `replyToId`, or `quoteOfId` as appropriate.

At resolution, the thread receives a compact public-reaction turn. A high-importance formal statement may also create a News follow-up, but that item retains the same canonical `industryEventId` and `mediaStoryId`; it is not a new B7 fact.

The X detail view displays canonical C3 turns with real C2 names/handles/avatars. Legacy `replyList` and `quoteList` remain the fallback for ordinary posts and old saves.

## Persistence and bounds

`IndustryMediaWorldState` advances to schema version 3 and gains:

- bounded discussions;
- bounded discussion turns;
- player responses with pending/resolved state;
- processed response and discussion keys for exactly-once execution.

Initial limits:

- at most 120 discussions;
- at most 8 turns per discussion;
- at most 120 player responses;
- at most 240 processed discussion/response keys.

Normalization removes orphan event/story/personality references and preserves valid legacy C1/C2 data. Compaction retains pending responses and recent or high-importance discussions first.

Save migration advances from version 35 to 36. Existing X posts remain valid and do not gain synthetic historical discussions. C3 begins only for newly eligible posts or explicit valid fixtures.

## Existing-system reuse

C3 reuses:

- B7 events, evidence, and exactly-once weekly coordinator;
- C1 story identity and lifecycle;
- C2 institutions, personalities, fact-safe claim modes, media stance, local avatars, and profile adapters;
- existing `XPost`, feed, posts, post detail, reply, quote, and statement presentation;
- existing player reputation, Instagram controversy, X followers, team publicist, News feed, save migration, compaction, and deterministic RNG;
- `processIndustryWorldWeek` as the only pending-response resolution seam.

It does not create a new social app, full user graph, autonomous publicist, or parallel event ledger.

## Verification

Focused audits must prove:

1. deterministic discussion creation and recurring C2 participant identity;
2. fact-safe turns, antagonist/supporter consistency, and bounded turn count;
3. response eligibility, format restrictions, silence safety, and one response per event;
4. deterministic next-week resolution and exact-once effects;
5. publicist recommendations without auto-publishing;
6. X thread UI, response controls, outcome state, and legacy fallback;
7. migration 35 to 36, malformed-state recovery, compaction, and no replay;
8. C1, C2, B7, lint, and production-build regressions.

Per user direction, C3 will not add or run a new 400-year/mobile performance test. The combined Project C long-run/device certification remains C8.

## Completion gate

C3 is complete when the player can optionally respond to valid media discussions, responses resolve once on the next entered week with saved bounded consequences, recurring personalities retain fact-safe continuity, silence is safe, ordinary X behaviour remains intact, save migration is compatible, and all focused/adjacent checks pass.

## Intentionally deferred

- C4: YouTube theories, breakdown videos, and creator economics;
- C5: organized fandoms, campaigns, hashtags, and Instagram mobilization;
- C6: rumours, leaks, prediction reliability, and resolution;
- C7: permanent feuds, media ownership/control, and long narrative history;
- C8: final variety, balance, mobile performance, and long-run certification.
