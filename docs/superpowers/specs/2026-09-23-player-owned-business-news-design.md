# Player-owned business news and buzz — design for review

Status: proposed; no news-system implementation in this change.

## Goal

Make the player's public streaming and production-house actions visible in News and existing social/media channels, using saved game facts rather than a second news simulation. Rival coverage remains on the current industry-world pipeline. Private registration, capital injection, and draft edits do not become public announcements.

## Verified current seams

- The owned streaming platform already saves action and weekly facts in `ownedStreamingPlatform.eventLedger`. `commitOwnedStreamingLaunch` writes a stable `LAUNCH_COMMITTED` entry and a `launchCommit`, but does not currently publish a Trade story.
- The world industry ledger saves `IndustryEventFact` records and `publishedEventKeys`; `projectIndustryEvents` turns selected facts into News, X, Instagram, and media-story records with deterministic IDs and a two-public-stories-per-week budget. Its collectors currently cover rival/world companies, not the player's owned streaming ledger.
- Production-house launch and title outcomes already produce some direct News entries. A released film's `BOMB`/`FLOP`/`MISS`/`HIT`/`MEGA_HIT` classifications are therefore not missing wholesale. Those existing entries must be reconciled, not duplicated.
- The News app's `YOU` filter currently tests only `category === 'YOU'`. An owned-company story categorized `INDUSTRY` or `TOP_STORY` would be invisible in that tab even with a valid `companyId`.

## Proposed model

Use an adapter from canonical, saved domain events to `IndustryEventFact`; do not make News or social posts the source of truth. Give the owned streaming company a stable media identity derived from the player ID, not the editable brand name. Retain the source ledger ID as evidence and use a deterministic idempotency key such as `owned-streaming:<source-event-id>:<beat>`. Append to the existing world industry ledger, then use the existing media projection and publication keys. Replaying a save or running a week twice must not produce a second fact or post.

For immediate public milestones, add a narrowly targeted projection path that processes the newly appended fact IDs through the same publisher, without re-evaluating unrelated due world events. The regular entered-week path handles weekly performance and rival coverage. Both paths share the same publication keys and editorial budget; a launch must get a guaranteed player-owned slot without silently dropping every rival story that week. Where a public event competes for limited slots, unpublished facts remain pending instead of being marked evaluated and lost.

## Public beats and evidence

| Beat | Canonical evidence | Publication rule |
| --- | --- | --- |
| Public launch announcement | Saved `launchMarketingPlan` reservation, linked by its stable plan ID | One pre-opening story only when the committed plan represents a public campaign; no story for drafts, incorporation, or private budget reservation alone. Add an explicit announcement action/fact if that distinction is not currently modeled. |
| Opening day | `LAUNCH_COMMITTED` plus `launchCommit` | One high-priority company launch story immediately after successful commit; mention actual opening slate, initial audience, and launch condition only when those fields exist. |
| Catalog | Saved license/original release or material slate change | Highlight a genuinely new marquee title, first original, major rights deal, or material catalog expansion; not every import or edit. Link the title/project ID. |
| Platform performance | Saved weekly metrics/history and existing milestone or distress facts | Publish threshold-crossing trends with a cooldown, not a weekly recap of the same number; success and setbacks both possible. Distinguish subscribers, playback, and finance. |
| Production house | Existing production and release outcome facts | Keep existing film-release coverage; add only missing sustained company-level poor-performance/recovery beats backed by multiple saved periods, with a cooldown. Never call one weak week a collapse. |
| Rivals | Existing `collectIndustryEventFacts` path | Preserve current behavior; no parallel rival-news path. |

News copy may describe the player's catalog or studio performance, but must never invent audience counts, reviews, title rights, or unrecorded revenue. Existing media voices can frame facts differently; the underlying evidence and numeric claims stay canonical. Use the game's localization/message infrastructure for new player-facing templates rather than persisting English-only prose as the sole renderable meaning. Old saves and already saved News items remain readable. Any buzz or audience consequence must reuse the existing media-response/economy path, with bounded effects and explicit tests; publishing a post must not also apply a separate hidden modifier.

## Discovery and presentation

- Keep editorial categories (`INDUSTRY`, `TOP_STORY`) as they are. Include owned company IDs and owned project IDs in the News `YOU` filter, rather than changing all owned-business stories to `YOU` and losing editorial context.
- Opening-day and marquee-catalog beats may flow to News and suitable social channels according to existing channel rules; a minor weekly change may merit only social coverage or no public post. Media institution/byline, story grouping, and discussions stay owned by the existing media system.
- Show the source company and affected title where available so player and rival coverage are legible. The feed should not spam a separate story for every country, price change, or weekly metric tick.

## Integration order and tests

1. Add contract tests for the adapter: stable source IDs, evidence linkage, no private-action publication, catalog and launch thresholds, and legacy-save normalization.
2. Add player-owned fact collection at successful action seams and the entered-week seam. Make action publication and weekly publication share exactly-once keys.
3. Update editorial selection so major owned milestones are visible while rival stories retain space and deferred facts are not discarded.
4. Extend the `YOU` filter to owned-company/project IDs, and add localized copy/templates for new beats.
5. Reconcile direct production-house News generation so a fact is published once across old and new routes; add sustained poor-performance/recovery coverage only from saved multi-week evidence.
6. Run replay, reload, week-advance, action-duplicate, social/news-link, and legacy-save audits, plus mobile visual checks. Test positive and negative states (no launch draft story, no fabricated catalog, no repeated distress headline).

## Boundaries

No new energy charge, treasury charge, or save reset is required. Any media-driven balance effect must be surfaced and reviewed separately rather than assumed neutral. Any save-shape extension must be backward-compatible and bounded like the existing industry ledger. The public announcement trigger and cooldown thresholds should be fixed in tests before implementation; those are editorial rules, not random outcomes.
