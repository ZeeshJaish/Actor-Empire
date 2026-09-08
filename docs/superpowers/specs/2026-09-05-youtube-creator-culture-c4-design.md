# Project C4 — YouTube Theory, Breakdown, and Creator Culture

**Status:** Completed on 2026-09-05

## Purpose

C4 connects Actor Empire's existing YouTube application to the canonical industry-media world. Saved industry facts and story arcs can produce persistent theory, explainer, business-analysis, review, response-analysis, and creator-reaction videos from recurring C2 personalities. The feature should make the entertainment world feel observed without creating another player chore or a second hidden full-career simulation.

## Boundaries

- `WorldState.industryEvents` remains the source of canonical public facts.
- `WorldState.industryMedia.stories` remains the canonical media-story registry.
- Videos retain both `industryEventId` and `mediaStoryId`; they cannot invent projects, deals, casting, rights, money, awards, quotations, or outcomes.
- Speculation must be labelled and use uncertain language. C6 owns rumours, leaks, prediction reliability, and later truth resolution.
- NPC creator channels remain separate from `Player.youtube`. Their views, subscribers, estimated revenue, and sponsor appeal never change the player's channel, money, offers, or upload history.
- C4 may change saved media-only attention and creator performance. It cannot directly change player/company money, fame, reputation, controversy, relationships, rights, projects, quality, production, ownership, contracts, or awards.
- A resolved C3 response may be analysed, but its gameplay effects are never applied twice.
- Viewing videos is optional. C4 adds no mandatory decision or response.
- The existing two-story weekly editorial budget remains authoritative. At most two industry videos may be published in an entered week, and some weeks produce none.
- No remote thumbnail or avatar dependency is introduced.

## Recommended architecture

Add two bounded collections to `IndustryMediaWorldState`:

1. `creatorChannels` stores lightweight performance for eligible saved media personalities.
2. `youtubeVideos` stores fact-grounded public videos and their saved performance.

`industryMediaYoutube.ts` owns normalization, deterministic eligibility, creator selection, format selection, fact-safe copy, thumbnail presentation, initial performance, weekly catalogue advancement, and compaction. It consumes C1 stories, C2 assignments/personalities, C3 responses, and the retained industry-event ledger. It does not depend on `Player.youtube`.

The entered-week coordinator runs C4 after C3 response resolution so a newly resolved response can become a later analysis topic without duplicating the response consequence. Every resolution key and metric is saved, making reload and repeated same-week calls exact.

## Saved creator channels

Each eligible YouTube personality receives a stable channel record with:

- personality identity;
- subscriber count and lifetime views;
- credibility, momentum, sponsor appeal, and estimated lifetime revenue;
- upload count, hit count, flop count, and last-upload week;
- bounded recent video identifiers.

Anchor creator starting values derive deterministically from C2 reach, credibility, sensationalism, and identity. Generated creators use the same calculation. One creator may publish at most once per entered week and may not repeat the same story beat.

## Saved videos

Each video stores:

- stable ID, creator/personality ID, institution ID when present;
- canonical event and story IDs plus evidence event IDs;
- video format and claim mode;
- title, summary, confirmed-fact text, optional clearly labelled interpretation;
- local thumbnail palette, label, and motif;
- project/company/subject links where available;
- publication week, views, likes, comments, momentum result, and subscriber change;
- optional C3 response ID/outcome reference used for response analysis;
- a deterministic publication key.

Supported formats are `THEORY`, `EXPLAINED`, `BUSINESS_BREAKDOWN`, `REVIEW_AFTERMATH`, `RESPONSE_ANALYSIS`, and `CREATOR_REACTION`.

## Editorial selection

Only retained, active or recently resolved C1 stories that are YouTube-eligible can publish. Priority combines importance, freshness, story stage, category-format fit, discussion heat, C3 response relevance, creator category/genre/region/language fit, creator cadence, story fatigue, and deterministic variance.

`THEORY` requires a project-development, project-release, or franchise story and a theory creator. It always uses `SPECULATION`. Rights, company, and partnership stories prefer `EXPLAINED` or `BUSINESS_BREAKDOWN`. Released outcomes and awards prefer `REVIEW_AFTERMATH`. A resolved C3 response may produce `RESPONSE_ANALYSIS`. Other valid personality-led coverage may use `CREATOR_REACTION`.

The system publishes no more than one video per story beat and two per week. Low-importance routine accounting does not become a video merely to fill the feed.

## Creator performance

Initial performance is deterministic and bounded. It combines creator reach and subscribers, story importance and freshness, topic fit, discussion heat, title/thumbnail strength, regional fit, prior momentum, fatigue, and persisted variance.

A video resolves as `BREAKOUT`, `HIT`, `NORMAL`, or `FLOP`. This updates only the creator channel and the video's saved counters. Smaller creators can break out; large creators can flop. Estimated ad revenue is creator-world flavour data and never enters a company ledger.

Older saved videos receive a small bounded weekly long-tail view update for a limited age window. Their original outcome and copy never reroll.

## YouTube application

The existing YouTube Home and Watch views are reused.

- The Home feed blends player uploads, existing music releases, saved C4 industry videos, and deterministic generic filler.
- The current `Math.random()`/`Date.now()` generic filler is replaced with stable deterministic IDs, creators, metrics, and upload ages.
- Industry cards display creator identity, local thumbnail art, format label, views, and age.
- The Watch view displays creator subscribers, a fact/speculation label, summary, confirmed facts, interpretation where allowed, and saved contextual comments.
- Lightweight Home filters expose `All`, `Film & TV`, `Theories`, and `Industry` without creating a new app or management screen.
- Existing player upload, Studio, monetization, merchandise, livestream, and sponsorship flows remain unchanged.

## Cross-platform culture

C4 may add a bounded X or Instagram promotional echo for a newly published industry video. The echo retains the same event/story/video references and contains no new fact. It does not consume or create another C1 story and does not open a second C3 discussion for the same event.

## Persistence and bounds

- Industry media schema advances from 3 to 4 and save migration advances from 36 to 37.
- Old saves receive empty normalized C4 collections and deterministic creator-channel seeds when needed.
- Retain at most 160 industry videos, 80 creator channels, 16 recent video IDs per channel, 8 comments per video, 12 evidence IDs per video, and 640 processed video keys.
- Compaction prioritizes recent videos, response analyses awaiting visibility, and high-importance videos while preserving referential integrity.
- Reconciliation removes invalid video references when their canonical stories/events no longer exist and repairs channel histories.

## Verification

C4 requires focused audits for:

- fact grounding, format eligibility, explicit speculation, and response-reference safety;
- deterministic publication and performance with same-week idempotency;
- creator growth, small-channel breakouts, large-channel flops, cadence, and no player-channel mutation;
- feed/watch UI presentation and deterministic generic filler;
- old-save migration, normalization, compaction, and orphan cleanup;
- compatibility with C1, C2, C3, B7, production build, and a mobile-width browser smoke.

The combined 400-year and physical-device certification remains C8.

## Completion gate

C4 is complete when saved fact-grounded industry videos appear in the existing YouTube experience; recurring creators retain deterministic bounded performance; theory cannot masquerade as fact; player and NPC channels remain isolated; C3 consequences cannot duplicate; reload and same-week replay are exact; old saves migrate; mobile UI remains usable; and focused plus adjacent verification passes.

## Deferred

- C5: organized fandoms, campaigns, hashtags, and deeper Instagram mobilization.
- C6: rumours, leaks, prediction reliability, and truth resolution.
- C7: permanent feuds, ownership/control, and long narrative history.
- C8: variety, balance, save growth, mobile performance, 400-year, and physical-device certification.
