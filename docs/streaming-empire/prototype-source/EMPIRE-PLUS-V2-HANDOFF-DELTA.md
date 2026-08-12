# EMPIRE+ — WHAT THIS PROTOTYPE CHANGED

Read this next to the authoritative 25-phase handoff. It records where this
prototype **agrees**, where it **adds**, and where it **conflicts** — so the
real implementation can absorb the design without inheriting the shortcuts.

**What this repo is:** a UI/UX prototype at `~/Vibe code/empire-plus-v2`
(React 18 + TS + Vite). It is **not** integrated with `~/Vibe code/Actor empire`.
Treat every screen here as a **design spec that happens to run**, not as code to
merge. The maths is real enough to prove the interactions; the state layer is not.

---

## 1 · Phases built, and out of order

| roadmap phase | state |
|---|---|
| Phase 8 — Launch Readiness & Premiere Night | built (`premiere.tsx`) |
| **Phase 22 — IPO and Public Company Gameplay** | **built in full** (`listing.tsx`, `newsdesk.tsx`, `stock.tsx`) |
| Phases 3–7 partial | founding wizard, HQ, build/infra, pricing, raising finance |

Phase 22 was built **before** Phases 10–21 exist. That was deliberate — it is the
most structurally demanding flow and it forced the visual system into shape — but
it means the listing currently reads game state that the real game will own
differently.

> **Naming collision to avoid:** the listing is internally divided into
> **Act I–V**. Those are *scene groupings inside one phase*. They are unrelated
> to the roadmap's Act 1–5, which span all 25 phases. Rename ours on integration
> (suggest: "Stage 1–5").

---

## 2 · Mechanics the prototype invented (not in the handoff)

These are additions. Each one is playable here and should be evaluated on merit.

### The valuation ask, and four gates
The player **names the valuation** rather than receiving a range. Then four
parties can refuse it, in order:

1. **CFO** — refuses above 1.25× what audited revenue defends
2. **CTO** — refuses to sign the platform-risk annexure above 38 pts tech debt
3. **The board** — a live 7-seat division vote; you get **one lobbying call**
   before it opens, and it can only move somebody already close
4. **Underwriters** — three houses bid their *own* view of value; only a firm
   book puts their money behind yours

At each refusal: **lower the ask**, or **overrule**. Overruling leaves a
permanent **mark** (`CFO DECLINED TO CERTIFY`, `CTO RESIGNED BEFORE FILING`,
`DIRECTOR RESIGNED OVER VALUATION`, `NO FIRM UNDERWRITING`) which then surfaces
in the prospectus cover, the regulator's queries, the news commentary, the book
coverage, and the post-listing share price. **This is the spine of the flow.**

### Share count as a player decision
The handoff never says who chooses how many shares are issued. Here the player
sets it (250k–40M, slider or typed). Valuation ÷ total shares = offer price, and
it drives free float, dilution and how the stock behaves on day one. A float
under ~14% is explicitly punished.

### The regulator
Not in the handoff at all. A fictional **Securities & Markets Board** issues an
**observation letter** — file number, numbered queries derived from what the
player hid and forced, a deadline. Three answers per query: **in full**
(costs weeks), **briefly** (risks return), **restate** (drops the valuation
publicly). Answer two material ones thinly and the filing is **RETURNED**.

The accurate detail worth keeping: *the regulator never approves the valuation.
It decides only whether you may ask.*

### Due diligence vs. the market window
Auditors surface findings derived from real game state (churn, tech debt,
licences, plus every mark). The player then trades **weeks of remediation**
against a **closing market window**. Spend five or more weeks and a named rival
lists into the demand — which multiplies book coverage down by 12%.

### Four smaller mechanics
- **Employee quota** — reserve 0–8% of the offer for staff at a 10% discount;
  it genuinely reduces proceeds
- **Grey market** — an unofficial pre-listing premium with its own fixed error,
  seeded once per run; right more often than wrong
- **Greenshoe** — with a firm book, the underwriter buys your own stock on day
  one and the floor holds at −3.5%; on best-efforts there is no shoe
- **Anchor discount** — one sovereign fund asks for 4% off to anchor the book

### The Market Desk
The handoff lists an "IPO listing" cinematic. This replaces it with a **recurring
business-news channel** that cuts in throughout the flow and reacts with
**derived** commentary — analysts quote your actual multiple, your actual float,
your actual marks. Built as a **sequence** (one speaker at a time, hard cuts,
price ticking during the segment), not a layout.

---

## 3 · Where the prototype AGREES with the handoff

- **Stock reacts to more than profit.** `stock.tsx` derives the live quote from
  subscriber growth vs. the book sold, churn vs. a 3% peer benchmark, cash
  runway, carried technical debt and governance marks — never stored, always
  recomputed, so it cannot contradict any other screen.
- **Remaining private is valid.** The Boardroom's MARKETS tab still says an IPO
  is optional and staying private is a good ending.
- **Causality is explained.** Tapping the share price opens **what is moving it**,
  ranked worst first, with each driver's contribution in points.
- **Unknown is not zero.** Pre-listing states read `PENDING`, not `0`.
- **Every cinematic is skippable** and consumes already-computed outcomes.

---

## 4 · CONFLICTS — must be fixed on integration

| # | issue | why it matters |
|---|---|---|
| 1 | **`Math.random()` used for the grey-market bias** (`listing.tsx`, `useState` initialiser) | handoff §4 forbids uncontrolled randomness. Replace with the seeded ledger. |
| 2 | **Share counts are hardcoded** — `PRE_SHARES = 45,000,000` | the real game needs a proper cap table; ownership %s here are derived from a fiction |
| 3 | **The listing does not respect the IPO readiness gates** | the Boardroom already defines them (CFO in post · four profitable quarters · independent audit · board constituted). The prototype's flow can be entered without them. |
| 4 | **No week processing / no `lastProcessedAbsoluteWeek`** | the whole listing runs as one uninterrupted session. In the real game it must span weeks and survive reprocessing without duplicating money or shares. |
| 5 | **No save/migration layer** | nothing here persists. All state is component-local. |
| 6 | **Weekly net is hardcoded** (`-1_700_000`) in the quote inputs | must come from the real ledger |
| 7 | **Our "Act I–V" naming** collides with the roadmap's Acts | rename before merge |
| 8 | **Rivals are name strings only** | Phase 20 defines rivals with memory, cash and strategy; the prototype only borrows their names for the crawl and the window event |

---

## 5 · The visual system (new, and worth keeping)

Two rules produced everything:

**The drawing rule — never draw the thing, draw what the thing produces.**
No buildings, faces, vehicles or perspective. A regulator is a letter with a
file number. A trading floor is a board. A banker is a term sheet. This exists
because an earlier pixel-art pass looked like placeholder game assets and was
scrapped entirely.

**One register per moment.** A single visual language applied to everything made
a legal resolution, a working model, a board vote and a bank auction all look
identical. Each moment now takes the form its content actually has:

| register | used for | look |
|---|---|---|
| **PAPER** | resolution, CFO certification, prospectus, allotment | cream stock, letterpress, square corners, wet cursive signature |
| **TERMINAL** | the valuation model, the price band | amber on black, monospace, live recalculation |
| **REGISTER** | platform risk, the data room | engineering dark, severity edges, load bars |
| **DIVISION** | the board vote | a tally the room watches, seats resolving one at a time |
| **DESK** | underwriters, anchors, the book | competitive, live numbers |
| **ROOM** | the prospectus cover, the lock-in | one warm light |
| **STATE** | the regulator | blue-grey watermarked government stock, **square corners on purpose** |
| **CHANNEL** | all public reaction | broadcast, see `newsdesk.tsx` |

Paper and government letters keep **square corners** deliberately — rounding
them turns documents into UI cards and loses the whole effect. Everything else
uses soft radii and elevation instead of borders.

**Plain-English rule:** every screen opens with one sentence saying what it is
and what you are deciding. Severity reads **SERIOUS / AWKWARD / MINOR**, not
HIGH/MED/LOW.

---

## 6 · Bugs found here that will recur in the real build

Worth knowing before you write the same code again:

1. **`@property` collision.** The app registers `--ink` as a typed custom
   property with `inherits:false`. An un-namespaced `--ink` in another
   stylesheet is silently discarded and falls back to `0%`, rendering an entire
   act invisible. **Namespace every custom property.**
2. **`:where()` has zero specificity.** `.nd :where(*){margin:0;padding:0}`
   scores identically to `.ndthird`, so whichever sheet loaded later won and
   layout padding was intermittently zeroed. **Scope component rules one level
   deeper than the reset.**
3. **`padding: calc(30px + env(...))` in a shorthand** can drop the whole
   declaration. Set a base value first, then override.
4. **`backdrop-filter` + `overflow:hidden` + `border-radius`** clipped the first
   character of every label in the news rail.
5. **Global CSS namespace.** All stylesheets mount at once. Class *and*
   `@keyframes` collisions are the single most common bug in this codebase.

---

## 7 · Recommended next phase

**Phase 15 — Complete Originals Business** (or Phase 7's first Original).

Reason: **Premiere Night already exists and launches a title, but nothing in the
game creates one.** That is a live dependency gap, not just a missing feature.
Every remaining tile needs it — awards need shows, rivals need a slate to fight,
global needs something to distribute, acquisitions need a library, legacy needs
a body of work.

**Quarterly earnings (Phase 11) should follow immediately after**, not before —
the listing now promises an earnings call every quarter forever, but an earnings
call with no slate is a report about nothing.
