# Phase 22 — IPO and Public Company

Status: implemented in owned-streaming schema v20.

## Locked player promise

Phase 22 is an issuer-side public-company simulation for the player-owned
streaming platform. It does not add the platform to the player's external stock
portfolio, so the player can never buy their own company through the old stock
screen.

Going public is voluntary. Remaining private forever is a complete competitive
strategy with no readiness penalty, content lock, or paid shortcut.

## Player flow

1. Enter **Public Markets** from Company Office.
2. Review six fact-backed readiness pillars.
3. Clear the two filing gates: one canonical 12-week operating report and an
   active CFO.
4. Choose a fictional ticker, primary offer percentage, and investable
   narrative.
5. Run the roadshow. Institutional and retail demand are derived from the
   platform's audience, technology, prestige, governance, financial record, and
   deterministic simulation seed.
6. Price within the disclosed range. The listing atomically moves primary
   proceeds into company treasury, creates the public float, dilutes every
   existing holder proportionally, updates founder voting control, records the
   capital action, and queues one listing cinematic.
7. Publish conservative, balanced, or ambitious guidance for the next canonical
   12-week cycle.
8. Each live week creates one deterministic OHLC quote. The price responds to
   subscriber movement, cash contribution, playback trust, leverage, normal
   market noise, and results versus guidance.
9. Each public 12-week report resolves earnings and opens an
   ownership-weighted shareholder ballot.
10. Material misses can create persistent activist campaigns. If founder control
    is below 51% and a funded aggressive rival exists, activist pressure can
    become a hostile tender.
11. The founder may defend independence, find a white knight, activate a rights
    plan, or negotiate. A lost control battle creates a binding recovery mandate
    while the founder remains an operator; it never creates an abrupt game-over.

## Readiness

The six pillars are:

- audited operating history;
- active CFO;
- governance credibility;
- subscriber scale;
- trailing playback reliability;
- financeable leverage and runway.

The operating report and CFO are hard filing gates. At least four of six pillars
must pass to start a roadshow. All values are derived from canonical owned
streaming state.

## Capital and control

The IPO is a primary issuance. Proceeds enter company treasury, not personal
cash. Public ownership is added to `finance.equityHolders`, while founder and
pre-IPO holder percentages are scaled by the new issuance. The listing also
creates a normal `EQUITY_ISSUANCE` capital action.

Public shareholder resolutions combine actual founder voting power with
institutional support across the outside float. This preserves the Phase 19 rule
that governance becomes binding only after real dilution.

## Cinematics and accessibility

`IPO_LISTING` and `HOSTILE_TAKEOVER_DEFENCE` are queued only after committed
ledger facts exist. Both presentations are skippable, persisted through the
shared cinematic queue, and disable ambient rotation under reduced motion.

## Persistence and limits

Schema v20 adds one `publicCompany` aggregate containing the IPO plan, listing
record, 104 weekly quotes, 24 guidance records, 24 earnings reports, 32
shareholder votes, 16 activist campaigns, and 12 hostile-takeover records.
Migration from v19 initializes a safe `PRIVATE` state without fabricating an IPO
or market history.

## Deferred

- Phase 24 legacy/endgame systems.
- Phase 25 monetization. There are no paid IPO advantages, rescues, or power
  purchases in this phase.

## Verification

Run:

```bash
npm run audit:streaming-public-markets-phase22
npm run lint
npm run build
```
