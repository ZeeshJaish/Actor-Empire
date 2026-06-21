# Owned IP Performance Dossier Design

## Goal

Extend Phase 4 with a readable, game-like IP dossier that connects each owned IP to the studio’s existing scripts, active releases, completed projects, and Project Dashboard.

## Placement and flow

The feature stays inside `Development Lab > Vault > IP`.

- Tapping an IP card opens a full-screen dossier overlay.
- The existing **Develop IP** button still opens Development Authorization directly.
- Tapping **Open Project** inside the dossier exits Development Lab and opens that release in the existing Production House Project Dashboard.
- Closing the dossier returns to the unchanged IP Library position.

No new route, save collection, project page, or duplicated release dashboard is introduced.

## Existing data only

The dossier derives its content live from:

- `OwnedRight` for deal type, acquisition cost, expiry, project allowance, and restrictions.
- Studio scripts carrying `OWNED_RIGHT:<rightId>` for development activity.
- `Player.activeReleases` matching studio and `subjectName` for current release performance.
- `Player.pastProjects` matching studio and `subjectName` for completed performance.
- The current Project Dashboard for detailed release actions and continuation controls.

## Dossier anatomy

### Command header

Shows the IP title, rarity, highlighted IP type, ownership state, genre, and a close action. The surface uses the existing dark cinematic language, colored IP accent edge, ownership stamp, and compact game typography.

### Rights command strip

Shows deal/control type, expiry or permanent control, projects used or remaining, acquisition cost, and the creative guarantee when present.

### Performance pulse

Shows:

- Lifetime gross: theatrical gross plus recorded streaming revenue.
- Average rating from released work with a rating.
- Released project count.
- Awards won.
- Audience strength: Unproven, Niche, Growing, Strong, or Massive.
- Momentum: Unproven, Hot, Rising, Steady, or Cooling.

Audience strength and momentum are derived display labels, not new saved stats. Momentum prioritizes an active release’s current status, then the newest completed project’s existing `outcomeTier`.

### Screen history

Lists active and completed releases newest first. Each row shows title, movie/series, release state, gross, rating, and an **Open Project** action that hands off to the existing Project Dashboard.

### Development pipeline

Lists linked scripts and their current status. If there are no releases, the dossier clearly says the IP is unproven and makes development the next move.

## Scope boundary

This slice does not add character rosters, sequel/spin-off unlock logic, franchise creation, universe assignment, or new revenue calculations. Those remain Slice 3.

## Verification

- Pure performance tests cover matching, totals, audience strength, momentum, ordering, and the unproven state.
- A UI source audit covers the dossier, screen history, pipeline, existing Project Dashboard handoff, and Develop IP handoff.
- TypeScript lint and production build pass.
- Browser QA verifies card-to-dossier, unproven data, close behavior, Develop IP, and Open Project when a matching release exists.
