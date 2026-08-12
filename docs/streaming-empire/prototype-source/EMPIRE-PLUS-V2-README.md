# EMPIRE+ — START HERE

## What this is

A **working UI/UX prototype** of the EMPIRE+ streaming expansion, built as the
visual and interaction reference for the real implementation in
`~/Vibe code/Actor empire`.

**Every screen in here has been run in a browser and checked by screenshot.**
The layouts, type sizes, colours, spacing, shadows and timings are the design —
not a rough pass to be tidied up.

## Read in this order

| # | file | what it settles |
|---|---|---|
| 1 | **`design/CSS-CONTRACT.md`** | **read first.** Why a previous integration rebuilt these screens by accident, two worked examples with the exact values, and the list of things most likely to get "corrected" |
| 2 | **`design/css/*.css`** | every stylesheet, extracted verbatim from the components. **Copy these.** |
| 3 | **`design/CLASS-INDEX.md`** | every class name each component renders, paired with its stylesheet — generated from source. Use as a checklist |
| 4 | **`design/DESIGN-SPEC.md`** | the visual system, type scale, colour tokens, surface rules, and five CSS traps this codebase already produced |
| 5 | **`HANDOFF-DELTA.md`** | what this prototype changed vs. the 25-phase handoff, and the 8 conflicts to resolve on integration |

## The one instruction that matters

> **Do not redesign. Reproduce.**
>
> `design/css/*.css` and `src/*.tsx` are a **matched pair**. Take the class names
> from the TSX, take the rules from the CSS, and author no replacement styles for
> anything that already has them. If your markup uses different class names, the
> CSS silently does nothing and you have rebuilt the screen by accident — which
> is exactly what happened last time.

If a value looks odd — a 6.5px label, `.24em` tracking, a shadow with a negative
spread — it is deliberate and it was tuned against a screenshot. Substituting
"sensible" values produces something that is recognisably not this design.

Where you genuinely need to change something (state layer, save format,
determinism, week processing), change the **logic**, and leave the **presentation
values alone**.

## Running it

```
npm install
npm run dev          # port 4214
```

There is a hidden dev nav at the top of the screen (low opacity until hovered)
that jumps straight to any phase: WALL · CASE · WIZARD · FOUNDING · DESK ·
BUILD · PREMIERE · IPO · VIEWER · CONTENT · NETWORK · AUDIENCE · BOARDROOM.

**Compare against the running prototype rather than guessing.** If your build
looks different, the prototype is the reference.

## What is finished, and what is not

**Finished and verified in-browser**
- The founding wizard, HQ desk, build/infrastructure, pricing, raising finance
- **Premiere Night** — launch readiness through to the morning after
- **The Listing** (roadmap Phase 22) — all five stages, end to end
- The live share price, derived and living in the Boardroom's MARKETS tab

**Not built**
- Originals · Global · Rival CEOs · Awards · Acquisitions · Legacy
- Quarterly earnings · crisis · hiring & board votes · rights marketplace

**Known gaps in the prototype itself** (all listed with fixes in `HANDOFF-DELTA.md`)
- No save layer, no week processing, no determinism ledger
- One `Math.random()` that must become seeded
- Hardcoded cap table and weekly net
- The allotment table is the one screen never seen running

## Recommended next phase

**Originals.** Premiere Night already launches a title, and nothing in the game
creates one — that is a live dependency gap, not just a missing feature.
Quarterly earnings should follow immediately, because the listing now promises
an earnings call every quarter forever.
