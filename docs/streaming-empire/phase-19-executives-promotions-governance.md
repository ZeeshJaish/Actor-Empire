# Phase 19 — Executives, Promotions and Governance

Status: complete.

Phase 19 turns Company Office into a living organization. The founder can
remain hands-on, build a specialist team through external hiring or internal
promotion, develop executives over canonical game weeks, publish delegation
guardrails, compose an advisory board, and voluntarily trade equity for
celebrity capital. Board power follows ownership: genuine veto power begins
only after real dilution.

## Player flow

1. Enter Leadership Suite through the physical Board Table hotspot or Company
   Office organization console.
2. Read the full nine-seat organization chart and open an executive dossier
   with visible skill, loyalty, ambition, ethics, relationships, performance,
   level, experience, strategy, cost, and origin.
3. Fill a vacant role from the external market or promote from the internal
   bench. Outside hires start closer to mastery; internal talent begins cheaper
   and more loyal.
4. Put an active executive into one of four development programs. Company
   treasury pays once; the program completes in real game weeks without
   real-world timers or paid skips.
5. Set rights, capacity, campaign, renewal, and incident mandates. Each lane
   shows the specialist seat required to delegate it and surfaces live
   violations from canonical platform activity.
6. Appoint up to two independent directors and call major board motions.
7. Review celebrity investor term sheets with explicit capital, dilution,
   participation, influence, and board-seat consequences. Remaining independent
   is always available.
8. If equity is accepted, receive a fact-backed investor reveal. Outside
   ownership enters the equity register, treasury receives capital, continuing
   participation becomes a weekly cost, and future major votes become binding.

## Organization

The nine roles are:

- Chief Operating Officer
- Chief Financial Officer
- Chief Technology Officer
- Chief Content Officer
- Product Head
- Marketing Head
- Advertising Head
- International Head
- Security & Trust Head

Executives are optional for normal manual play. Their value is specialist
authority, delegation coverage, development, future automation readiness, and
more meaningful organization decisions—not a forced setup choice.

## Executive development

| Program | Canonical effect |
|---|---|
| Role Mastery Lab | Skill and performance |
| Founder Alignment Retreat | Loyalty and founder relationship |
| Trust & Governance Residency | Ethics and internal relationship |
| Executive Performance Sprint | Performance and experience |

Only one development program may run for an executive at a time. Start cost,
ready week, completion, trait changes, and ledger entries are persisted.
Reprocessing a completed week cannot apply the benefit again.

## Delegation

The mandate stores:

- maximum delegated rights bid
- required infrastructure headroom
- weekly campaign authority
- minimum renewal margin
- incident response policy

Delegation is not silent autoplay. It is a visible operating contract. Relevant
executives activate its lanes; live rights, campaign, and capacity facts can
raise founder-review warnings when they exceed the mandate.

## Board power and ownership

At 100% founder ownership, the board is advisory. Independent directors can
vote and reveal strategic friction, but a founder-backed motion cannot be
vetoed. Accepted outside equity changes that rule:

```text
100% founder ownership -> advisory governance
voluntary equity issuance -> outside ownership
outside ownership > 0 -> binding majority votes
failed binding majority -> motion rejected and consequence not applied
```

Approved motions modify the canonical delegation record. Rejected motions
leave the current policy unchanged. Director votes are deterministic for the
same company, motion, director, and game week, and reflect strategy fit,
relationship, independence, and investor pressure.

## Celebrity investors

All offers and personalities are fictional game characters. Each term sheet
discloses:

- treasury capital
- founder dilution
- board nominee, if negotiated
- ongoing operating-revenue participation
- preferred strategy and influence demand
- attention benefit with no guaranteed subscribers or awards

Acceptance creates one equity issuance, one equity-holder record, one investor
record, optional nominee director, one ledger fact, and one cinematic reveal.
It cannot be accepted twice. A control floor prevents a deal from silently
reducing founder ownership below 51%.

## Weekly economy

The existing weekly processor now:

- completes due executive development exactly once
- charges active executive compensation
- charges active independent-director fees
- charges negotiated investor participation on positive operating revenue
- exposes governance cost in the weekly operations record

The investor reveal presents already committed facts. Skipping it never changes
cash, ownership, directors, or voting power.

## Visual and mobile contract

Leadership Suite is an immersive company floor rather than another dashboard:

- cinematic executive-floor scene and physical board/investor hotspots
- connected organization chart with a founder spine and specialist seats
- executive dossier and visual trait bars
- talent gallery, development chamber, delegation command deck
- circular board chamber with vote history
- investor salon, term sheet, and major reveal
- 44px actions, keyboard focus, reduced-motion treatment, and responsive
  mobile/desktop layouts

No new raster images were required. It uses the existing streaming scene
pipeline plus CSS-rendered spatial elements, keeping future visual upgrades
independent from gameplay state.

## Persistence

Schema v17 adds expanded executive traits, executive-development records,
delegation mandates, board directors, motions and votes, celebrity investors,
governance confidence, weekly governance cost, and investor reveal events.
Schema v16 saves migrate with safe empty leadership/governance collections and
a default founder-controlled delegation mandate.

## Validation

```bash
npm run audit:streaming-leadership-governance-phase19
npm run lint
npm run build
```

The audit covers migration, nine-role parity, external/internal tradeoffs,
development timing and exactly-once completion, delegation persistence,
advisory founder control, voluntary dilution, equity and treasury movements,
nominee creation, binding rejection, weekly cost, control floor, HQ
integration, and future-phase boundaries.

Phase 20 now implements rival poaching, global expansion, Platform Wars,
market share and annual awards. M&A, IPO/public markets, and
crisis/shadow-operation systems remain later phases.
