# Project C5 — Fandoms, Instagram, and Public Campaigns

**Status:** Completed on 2026-09-05

## Purpose

C5 turns anonymous engagement into persistent audience communities. Important players, companies, projects, universes, talent, and platforms can develop recognizable fandoms whose activity appears through the existing Instagram and X experiences. Fandoms can organize time-separated campaigns, but they remain a compact stats-driven public-reaction layer rather than thousands of simulated individuals or another player-management job.

## Chosen approach

Use a hybrid persistent model:

1. Save one lightweight record for each qualified fandom.
2. Save only meaningful campaign arcs and their major moments.
3. Derive visual feed tiles, profile grids, and ordinary comments from those bounded records.

Purely temporary posts were rejected because audiences would forget their history after every week. Individual-fan simulation was rejected because it would inflate saves, reuse templates visibly, increase Process Week work, and add no meaningful player decision.

## Authority and boundaries

- `WorldState.industryEvents` remains the source of canonical public facts.
- `WorldState.industryMedia.stories` remains the shared media-story registry.
- A fandom or campaign must retain valid event/story evidence and cannot invent a release, cancellation, casting, renewal, relationship, deal, revenue result, award, quotation, or company action.
- C5 may read C3 response outcomes and C4 video outcomes, but it never applies their effects again and never rewrites their saved performance.
- C6 owns rumours, leaks, prediction reliability, and truth resolution. A C5 casting wish or renewal request must be visibly framed as a fan request, not inside information.
- C7 owns permanent feuds, long-term narrative memory, and media control. C5 rivalry is temporary campaign behaviour, not a permanent feud system.
- C5 cannot directly change money, energy, fame, project quality, IMDb ratings, box office, streaming revenue, rights, production, ownership, contracts, awards, or company state.
- Viewing or joining a campaign is optional. Ignoring it is safe.
- No remote image or avatar dependency is introduced.

## Saved model

Industry-media schema advances from 4 to 5 with two collections.

### Fandom record

Each qualified community stores:

- stable ID and deterministic display identity;
- handle, name, local palette, avatar/motif, and short bio;
- primary subject key and optional company, project, universe, platform, or talent reference;
- home region and preferred language;
- community archetype;
- approximate size, loyalty, activity, coordination, optimism, and volatility;
- first-formed and last-active absolute weeks;
- bounded friendly and rival subject references;
- bounded recent campaign IDs and major-moment history.

Approved archetypes are:

- `DEVOTED` — loyal and resilient through weak outcomes;
- `CREATIVE` — edits, art, theories, and character appreciation;
- `EVENT` — premieres, watch parties, awards, and milestones;
- `PROTECTIVE` — rallies around criticism or controversy;
- `ANALYTICAL` — performance, lore, business, and evidence discussion;
- `VOLATILE` — highly active but more likely to create messy clashes.

Archetypes shape presentation and probabilities; they do not guarantee success or toxicity.

### Campaign record

Each meaningful campaign stores:

- stable ID and exact-once campaign key;
- fandom ID, subject key, event/story evidence, and optional C3/C4 source reference;
- campaign type, hashtag, headline, purpose, and fact-safe context;
- current lifecycle stage;
- start, last-advanced, next-eligible, and terminal weeks;
- reach, participation, coordination, sentiment, and heat;
- saved deterministic performance roll and final outcome;
- bounded major moments;
- optional player participation record;
- cross-platform publication keys.

Campaign stages are `SPARK`, `RALLY`, `PEAK`, `AFTERMATH`, and `CLOSED`. A campaign advances only on entered weeks and never rerolls after save/reload.

Campaign outcomes are `BREAKOUT`, `STRONG`, `MODEST`, `FIZZLED`, and `MESSY`.

## Fandom formation

A fandom is not created for every title. A subject becomes eligible through one or more of:

- repeated medium/high C1 story attention;
- a notable release, award, or franchise/universe commitment;
- sustained player, studio, platform, or talent audience reach;
- a C4 `HIT` or `BREAKOUT` video tied to the subject;
- an existing project or universe with material audience proof;
- deterministic regional/genre fit strong enough to support a niche community.

Formation scoring combines canonical reach, story importance, recency, genre, region, repeated attention, existing audience proof, C4 creator influence, and deterministic variance. Wealth, studio size, or platform scale cannot guarantee a fandom. Smaller projects can create cult communities; major releases can fail to produce a durable one.

Fandom names, handles, palettes, and bios are deterministic from subject, region, language, and archetype. Generated identity must avoid pretending to be an official account.

## Campaign eligibility and types

Only an active/recent eligible story or supported saved outcome can start a campaign. The engine prioritizes culturally relevant subjects and does not fill quiet weeks artificially.

Supported campaign types are:

- `COUNTDOWN` — anticipation before a confirmed premiere or event;
- `WATCH_PARTY` — coordinated viewing after a real scheduled/released fact;
- `FAN_EDIT` — edits, art, character appreciation, or visual celebration;
- `AWARD_DRIVE` — fan support around an eligible award story without changing voting outcomes;
- `SAVE_THE_PROJECT` — a request following a real hold, cancellation, or uncertainty fact;
- `CONTINUE_THE_UNIVERSE` — demand for more after an established project/universe beat;
- `DEFEND_SUBJECT` — support after criticism or a public response;
- `CELEBRATE` — hit, milestone, premiere, funding, acquisition, or award celebration;
- `CASTING_WISH` — explicitly labelled fan preference, never a rumour;
- `HASHTAG_CLASH` — a temporary evidence-grounded rivalry between active communities.

One fandom may not start multiple campaigns from the same story beat. At most one campaign starts per entered week and at most two major campaign moments publish in that week. Existing campaigns take priority over creating new ones when they need a terminal or player-relevant beat.

## Multi-week campaign progression

### Spark

The first post establishes the campaign, hashtag, purpose, and source context. It may remain niche.

### Rally

Participation grows or stalls. Instagram can show fan edits, carousels, countdowns, or watch-party cards. X may carry one bounded hashtag echo when appropriate.

### Peak

The deterministic result resolves from fandom size, loyalty, activity, coordination, subject momentum, story importance, regional fit, prior fatigue, C3/C4 context, player participation, and saved variance.

### Aftermath

The system publishes one restrained recap for meaningful outcomes, updates only fandom/social metrics, and closes the campaign. A fizzled campaign remains part of the fandom's history rather than disappearing.

Campaigns progress with real week gaps. They cannot emit every stage in one Process Week.

## Player involvement and workload

C5 is observation-first. The player receives no recurring inbox demand and no penalty for silence.

When a major player-related campaign is opened in Instagram, the player may choose:

- `Join the trend` — opens the existing Instagram composer with a fact-safe suggested caption;
- `Thank the fans` — opens a restrained appreciation caption;
- `Let fans lead` — records no response and closes the prompt locally.

Nothing publishes automatically. Existing posting limits, image handling, caption flow, and player Instagram economy remain authoritative.

Only one participation record is allowed per campaign. Joining may produce small bounded changes to Instagram followers, fan loyalty, fandom activity, and campaign heat. A poor tone or volatile campaign may add limited Instagram controversy. Participation cannot rescue a commercial flop or force a renewal, casting, award, rights deal, or company decision.

Large player slates remain manageable because campaigns are selected by cultural importance rather than generated for every project. Quiet, routine, and low-importance projects remain silent.

## Instagram experience

Reuse `InstagramApp` rather than creating another app.

### Feed

Campaign posts use the existing `InstaPost` flow with added optional fandom/campaign references. Cards show a compact campaign label, hashtag, source context, participation scale, and current public mood without exposing raw backend debug states.

### Search and Explore

Add a compact entertainment-trends strip and qualified fandom accounts. Search resolves real saved fandom names, handles, subjects, projects, companies, and hashtags.

### Fandom profile

Reuse the current NPC-profile pattern with a distinct collective profile. Show the fandom's subject, approximate community size, bio, recent campaign history, and a derived nine-tile grid. Ordinary grid items are derived from saved identity/campaign data rather than saved individually.

### Campaign detail

Selecting a campaign post shows its purpose, source fact, hashtag, visible multi-week moments, approximate participation, outcome when resolved, and optional player-participation controls. It does not expose probability formulas or numeric AI diagnostics.

### Visual language

Use local deterministic gradients, motifs, typography, and generated SVG avatars. Campaign cards should feel like fan culture inside the existing game, not a separate SaaS dashboard or a stack of identical metric boxes.

## Cross-platform behaviour

- Instagram is the primary C5 surface.
- X may receive one bounded hashtag/trend echo from a meaningful rally, clash, or peak.
- C2 media personalities may react through their existing fact-safe voice system.
- C4 videos may seed campaign eligibility, but C5 does not change their saved views or channel metrics.
- C5 does not create a new C1 story for every fan post. All campaign publications point back to the existing story/event evidence.
- No routine campaign enters News. Exceptional trade coverage remains a later editorial decision and is not required for C5 completion.

## Effects and isolation

Autonomous campaign resolution updates only:

- fandom size, loyalty, activity, coordination, optimism, and volatility;
- campaign reach, participation, sentiment, heat, moments, and outcome;
- bounded media-story attention metadata needed for presentation.

Optional player participation may additionally update only:

- Instagram followers;
- Instagram fan loyalty;
- Instagram controversy within a strict cap.

The processor must prove byte-for-byte isolation for money, energy, fame, general reputation, projects, releases, production, companies, rights, contracts, awards, `Player.youtube`, and unrelated social records.

## Weekly integration

Add a focused `industryMediaFandoms.ts` domain service. It owns normalization, fandom formation, campaign selection, campaign progression, deterministic outcomes, derived post creation, optional participation, and bounded compaction.

The entered-week order becomes:

1. Platform and studio AI.
2. B7 fact collection.
3. C1/C2 presentation.
4. C3 response resolution.
5. C4 YouTube processing.
6. C5 fandom/campaign processing.

C5 receives the post-C4 player/world so a saved creator-video outcome can seed a later campaign. Same-week replay is inert through stable processed keys and the existing entered-week checkpoint.

## Template system

Campaign copy combines bounded axes:

- fandom archetype;
- campaign type and stage;
- story category and stage;
- genre and subject kind;
- region and language;
- scale and sentiment band;
- supportive, neutral, defensive, or rival stance;
- C3 response and C4 video context;
- prior campaign outcome;
- player participation state.

Every template receives only validated canonical values. Numeric claims must come from stored campaign metrics or canonical evidence. Invalid or missing evidence falls back to restrained generic fan wording or suppresses publication.

## Persistence and compaction

- Industry-media schema advances from 4 to 5.
- Save migration advances from 37 to 38.
- Retain at most 96 fandoms and 160 campaigns.
- Retain at most 6 major moments per campaign, 12 recent campaign IDs per fandom, 8 friendly/rival subject references per fandom, and 640 processed campaign keys.
- Compaction preserves active campaigns, player-related campaigns awaiting optional participation, recent resolved campaigns, and higher-importance evidence before dormant history.
- Orphaned campaigns are removed when their fandom, story, or primary event is invalid. Fandom histories and campaign references are repaired during normalization.
- Old saves receive empty normalized C5 collections. Fandoms form only through future qualifying entered weeks; migration does not fabricate historical campaigns.

## Error and edge-case handling

- Missing evidence suppresses the campaign or removes it during reconciliation.
- A removed project may retain only a valid historical subject label when canonical event evidence remains; otherwise its fandom is compacted.
- Closed/cancelled subjects may retain cult fandoms, but cannot start countdown/watch-party campaigns without a qualifying new fact.
- Rival campaigns cannot target the same fandom as both sides.
- Hashtags are normalized, length-bounded, deterministic, and collision-safe.
- Same-week replay, save/reload, and duplicated input events cannot duplicate fandoms, campaigns, player effects, or feed posts.
- Feed and profile projections tolerate malformed legacy data and never render `undefined`, `NaN`, or remote-only art.

## Verification plan

Focused C5 audits must cover:

- fandom qualification, deterministic identity, archetype variety, and no every-title spam;
- campaign eligibility, lifecycle spacing, outcome variety, and exact-once progression;
- fact grounding, fan-wish labels, prohibited claims, and C3/C4 non-duplication;
- optional player participation, safe silence, one-action limit, composer handoff, and effect caps;
- Instagram feed/search/profile/detail presentation and local visual assets;
- X echo bounds and lineage;
- save migration 38, schema 5 normalization, compaction, orphan cleanup, and round-trip parity;
- player/company economy, rights, project, production, award, C3, C4, and YouTube isolation;
- C1–C4 and B7 regressions, production build, and mobile-width browser smoke.

The combined Project C 400-year, save-growth, Process Week, and physical low-end device certification remains C8.

## Completion gate

C5 is complete when important subjects can form persistent but bounded fandoms; campaigns advance over real weeks with saved deterministic outcomes; Instagram visibly reflects fandom identity and campaign history; player participation is optional and silence is safe; large slates do not create repetitive decisions; all public claims remain tied to canonical evidence; C1–C4 and player social systems remain intact; old saves migrate; mobile presentation remains usable; and focused plus adjacent verification passes.

## Deferred

- C6: rumours, leaks, predictions, source reliability, and later truth resolution.
- C7: permanent feuds, long-term narratives, and media ownership/control.
- C8: final variety, balance, save growth, Process Week performance, 400-year, and physical-device certification.
