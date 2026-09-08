# Project C Phase C2 — Media Institutions and Recurring Personalities Design

**Status:** Approved for implementation on 2026-09-04

## Purpose

C2 gives C1's canonical media stories stable publishers and recognizable human voices. News, X, and Instagram coverage should feel as though it comes from a living entertainment-media world: recurring trade reporters, business analysts, critics, hostile or supportive commentators, and fan-theory creators who retain their identity and viewpoint across weeks.

C2 is a presentation and interpretation layer. It does not create a second industry simulation, and it does not change the facts established by the game.

## Hard boundaries

- `WorldState.industryEvents` remains the sole canonical public-fact ledger.
- `WorldState.industryMedia.stories` remains the canonical media-story registry introduced by C1.
- Institutions and personalities may select, frame, interpret, criticize, support, or explicitly speculate about a saved fact. They may not invent projects, deals, money, rights, ownership, relationships, awards, production events, company outcomes, quotations, or precise figures.
- C2 does not directly alter player fame, reputation, controversy, money, relationships, rights, project quality, or company performance.
- C2 adds no mandatory player decision. Public statements and player responses begin in C3.
- Full YouTube breakdown videos, thumbnails, views, and creator-channel performance begin in C4. C2 creates the persistent creator identities that C4 will use.
- News, X, Instagram, and the existing future YouTube application remain the player surfaces. C2 adds no separate media-management screen.
- The existing C1 limit of two distinct public industry stories per entered week remains the editorial budget.
- Only active or publication-due stories evaluate media identities. The entire media roster never runs every week.

## Recommended architecture

C2 upgrades `IndustryMediaWorldState` from schema version 1 to version 2. The state continues to live at `WorldState.industryMedia` and gains four bounded collections:

1. `institutions`: stable media brands;
2. `personalities`: stable journalists, critics, commentators, and theory creators;
3. `storyAssignments`: compact records connecting a C1 story to selected voices and angles;
4. `subjectStances`: media-only affinity memory for a personality and a canonical subject.

The weekly flow becomes:

```text
canonical B7 event fact
        -> C1 story identity and lifecycle
        -> C2 coverage eligibility and voice selection
        -> fact-safe angle and deterministic template
        -> existing News / X / Instagram feed items
```

`processIndustryWorldWeek` remains the only entered-week coordinator. C2 is called from the existing `projectIndustryEvents` presentation path after C1 advances stories and before channel items are created.

## Media institutions

`IndustryMediaInstitution` stores a compact persistent identity:

- deterministic `id`, name, short name, handles, local brand colours, and local avatar/logo seed;
- kind: `TRADE`, `BUSINESS`, `PRESTIGE`, `TABLOID`, `STREAMING`, `REGIONAL`, or `FANDOM`;
- supported channels;
- home region, covered regions, and supported languages;
- editorial focus categories;
- credibility, reach, access, sensationalism, and prestige traits on bounded scales;
- active/dormant state used internally, never exposed as a raw company-style status badge.

The initial world contains a curated anchor roster with global and regional coverage. Generated institutions use deterministic name and brand vocabularies and may enter only when a region or industry segment lacks coverage. Generated identities use local assets or CSS/initial avatars; they never depend on remote image URLs.

Institutions are not economic companies. They do not own cash, hire staff through the studio system, or run full AI turns.

## Recurring personalities

`IndustryMediaPersonality` stores:

- deterministic `id`, name, handle, local avatar seed, institution link, home region, and languages;
- role: `REPORTER`, `INVESTIGATOR`, `BUSINESS_ANALYST`, `CRITIC`, `COLUMNIST`, `COMMENTATOR`, or `THEORY_CREATOR`;
- voice archetype and a small vocabulary profile;
- preferred story categories, genres, regions, studios, platforms, and talent subjects;
- credibility, reach, aggression, optimism, humour, sensationalism, and independence traits;
- stable baseline stance toward the player and selected industry subjects;
- last appearance week, recent story IDs, and channel cooldowns;
- optional signature-rival or signature-supporter role.

The state stores identity and compact memory, not a permanent copy of every sentence the personality has written.

## Hostile and supportive recurring voices

C2 supports a J. Jonah Jameson-style commentator through a `SIGNATURE_ANTAGONIST` role. This personality has a strong, persistent negative editorial prior toward the player and a higher likelihood of being assigned to player-related stories.

The antagonist may:

- describe a large investment as reckless;
- frame a hit as expensive, lucky, or still unproven;
- revisit a real earlier setback when it is relevant;
- praise a rival facing similar facts;
- give reluctant or qualified praise when overwhelming canonical evidence makes denial unbelievable.

The antagonist may not fabricate a scandal, loss, quotation, contract, failure, or number. Their hostility changes framing, not truth.

A `SIGNATURE_SUPPORTER` uses the same system with a positive prior. Supporters may defend the player's record or creative ambition but cannot call an actual flop a hit or conceal a canonical failure.

Subject stances belong only to the media world. Repeated factual outcomes may shift them slowly within personality-specific bounds, allowing grudging respect or growing scepticism without erasing the identity's defining character. These values do not modify canonical business relationships.

## Fan-theory creators

`THEORY_CREATOR` personalities are persistent cross-platform identities inspired by entertainment-analysis and lore channels. In C2 they may publish short, explicitly uncertain X or Instagram reactions based on saved franchise, universe, casting, or project facts.

Allowed language includes `may`, `could`, `suggests`, `possibly`, and `theory`. A theory cannot be written as a confirmed leak. C4 will reuse the same identity to create full YouTube videos and measure their audience performance.

## Coverage selection

For each C1 story selected under the existing two-story weekly budget, C2 scores only a bounded eligible shortlist. The deterministic score combines:

- institution and role fit for the story category;
- channel eligibility;
- home-market and language relevance;
- story importance and lifecycle stage;
- institution access and credibility;
- personality subject interest and media-only stance;
- signature antagonist/supporter relevance when the player is a subject;
- recent-appearance fatigue and channel cooldowns;
- repeat-angle penalties;
- a deterministic tie-break derived from story, week, channel, institution, and personality IDs.

The selector chooses at most one primary institution and one primary personality for each emitted channel item. A story can use different suitable voices across weeks, but an existing compatible assignment is preferred when continuity is stronger than variety.

The selector does not use `Math.random()` and produces the same result after save/reload.

## Fact safety and language construction

Every C2 line has a claim mode:

- `FACT`: direct restatement of the canonical event;
- `ANALYSIS`: interpretation whose factual nouns and figures still come from the event;
- `OPINION`: clearly subjective praise or criticism;
- `SPECULATION`: explicitly uncertain prediction or theory.

Templates are selected by story category, event type, lifecycle stage, role, voice archetype, stance band, and claim mode. Canonical names, figures, regions, and outcomes are injected only from the referenced event or story. Templates cannot introduce a new proper noun, precise figure, quotation, or outcome.

A fact-safety validator rejects an invalid candidate and falls back to a neutral direct restatement. This keeps creative variety subordinate to canonical truth.

## Channel behaviour

### News

`NewsItem` gains optional institution and personality references plus a saved source label and byline. The News app displays the real publisher and journalist instead of guessing the source from headline keywords. Trade reporters favour confirmed development; analysts favour company, streaming, and rights stories; critics favour release and awards coverage; tabloids favour public controversy that already exists as a canonical fact.

### X

Industry posts use the selected personality's stable name, handle, avatar, verification, tone, and engagement profile instead of the generic `Industry Desk`. The existing X profile and post-detail UI receives a small adapter so media personalities can be opened like other public profiles. Replies, arguments, player responses, and statements remain C3.

### Instagram

Institutional entertainment accounts and eligible personalities can author the existing industry announcement or reaction cards. C2 uses the existing Instagram feed model and does not create an additional visual feed.

### YouTube

C2 stores theory-creator identity and channel presentation metadata only. It does not create saved videos or run YouTube economics. C4 owns that behaviour.

All newly emitted items retain `industryEventId` and `mediaStoryId` and add `mediaInstitutionId` and, when applicable, `mediaPersonalityId`.

## Existing-system reuse

C2 reuses rather than duplicates:

- B7 `IndustryEventFact` truth and exactly-once publication keys;
- C1 story identity, lifecycle, publication timing, and bounds;
- `processIndustryWorldWeek` and `projectIndustryEvents`;
- existing `NewsItem`, `XPost`, and `InstaPost` arrays and UI cards;
- the X profile, handle, post-detail, reply-list, quote-list, and verification presentation;
- global creator social-profile concepts from the existing YouTube and social systems;
- game region and language data;
- deterministic RNG helpers;
- save migration, integrity, compaction, and large-save recovery boundaries;
- B8's long-run and mature Process Week performance fixtures.

Media identities remain a separate type from actors and existing YouTube collaboration creators. Presentation adapters may expose a common profile shape, but the canonical databases are not merged.

## Player-visible experience

The player sees consequences rather than configuration screens:

- the same outlet and journalist return to a developing story;
- a trusted analyst explains a platform or studio move;
- a hostile commentator repeatedly questions the player's decisions;
- a supporter pushes back without denying real failures;
- a critic's taste remains recognizable across releases;
- regional outlets notice locally relevant deals and expansions;
- fan-theory creators connect only facts that are actually available and label the connection as theory;
- the same identity is preserved across News, X, Instagram, and later YouTube.

There is no direct C2 button, status dashboard, or weekly chore. C2 changes how the existing world feels when the player checks their phone.

## Example

A canonical event confirms that Empire Studios greenlit an expensive science-fiction universe project.

- A trade reporter states that the project has been greenlit and names the real budget only if it exists in the event.
- A business analyst says the package is ambitious but will require broad demand.
- The signature antagonist calls the scale reckless and references a relevant saved Empire overrun only if that overrun is part of the retained story evidence.
- The signature supporter points to a relevant saved Empire hit only if that event is retained.
- A theory creator says a saved character or universe connection `could` matter, never that an unrecorded crossover is confirmed.

All coverage shares the same `mediaStoryId`; no post creates a second greenlight.

## Persistence, migration, and bounds

Migration advances the industry-media schema without replaying C1 stories. Existing feed items without media identity remain valid and are not rewritten. Newly published coverage uses C2 identities.

Initial implementation targets these explicit bounds:

- at most 16 anchor institutions and 16 generated institutions;
- at most 40 anchor personalities and 40 generated personalities;
- at most 4 compact assignments per retained story;
- at most 12 recent story IDs per personality;
- at most 320 subject-stance records, retaining signature relationships and recent active subjects;
- the existing 240-story C1 limit and two-story weekly editorial budget remain unchanged.

Compaction preserves anchor identities, signature antagonist/supporter continuity, active story assignments, and recent relevant stances. It discards old generated identity memory before canonical stories or event evidence.

## Failure handling

- Missing institution or personality references fall back to a neutral local `Industry Desk` identity.
- Invalid generated identity data is normalized or discarded without invalidating the save.
- A personality ineligible for the target channel is replaced by the next deterministic eligible candidate.
- Missing canonical event evidence prevents publication.
- Invalid fact-safe output falls back to the C1 neutral event projection.
- Save/reload and compaction cannot create a second assignment or republish a beat.

## Verification plan

C2 receives focused deterministic audits for:

1. schema normalization, bounds, and malformed-state recovery;
2. stable institution and personality identity generation;
3. global and regional roster coverage;
4. deterministic assignment and cooldown behaviour;
5. signature antagonist and supporter consistency;
6. factual grounding and speculation labelling;
7. cross-channel identity and story references;
8. save migration, reload parity, compaction, and no replay;
9. focused bounded roster, stance, assignment, feed, and save-state fixtures;
10. C1, B7, B8, build, and focused browser regressions.

Focused multi-year fixtures must prove that one personality does not dominate all coverage, signature identities remain recognizable, local outlets receive relevant stories, and inactive periods do not create background work. C2 does not rerun the 400-year mobile/performance certification; the combined Project C long-run and device-facing gate remains C8 scope.

## Completion gate

C2 is complete when fresh evidence proves:

- stable recurring media institutions and personalities exist across weeks and reloads;
- hostile, supportive, analytical, critical, and theory voices remain distinguishable;
- every claim is grounded in retained canonical evidence and speculation is labelled;
- News, X, and Instagram retain correct event, story, institution, and personality lineage;
- global and regional coverage is deterministic and varied;
- no extra player management or direct gameplay mutation is introduced;
- save growth and Process Week cost remain within the approved B8 boundaries;
- all focused C2 audits and relevant C1/B7/B8 regressions pass.

## Intentionally deferred

- C3: player replies, public statements, arguments, apologies, and response consequences;
- C4: full YouTube theory and breakdown videos, views, thumbnails, and creator performance;
- C5: organized fandoms, campaigns, hashtags, and Instagram mobilization;
- C6: rumours, leaks, predictions, source reliability, and later resolution;
- C7: long-term feuds, media ownership/control, and narrative history;
- C8: final variety, balance, mobile performance, and long-run certification.
