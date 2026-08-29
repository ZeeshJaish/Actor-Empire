# EMPIRE+ Presentation System

Status: Step 1 foundation. This contract applies to the cinematic streaming
experience under `components/streaming-transplant/`. It does not change game
economics, save data, progression, or business rules.

## Product direction

EMPIRE+ is a mobile management game, not an administration dashboard. Every
screen should feel like a place or moment in the company while making the next
player decision obvious.

The presentation rules are:

1. One primary decision per view. Secondary detail is disclosed on demand.
2. Show state visually before explaining it in prose.
3. Keep no more than three facts at the highest visual priority at once.
4. Use the player's platform colour as identity, never as the only state cue.
5. Preserve the dark cinematic language of the supplied EMPIRE+ reference.
6. Use glass only for a meaningful layer. Stacked blur is avoided for mobile
   WebView performance and legibility.
7. Documents, contracts, newspapers and term sheets intentionally use the
   paper palette; this is world-building, not inconsistency.

## Source of truth

| File | Responsibility |
|---|---|
| `presentation/tokens.css` | Colour, type, space, shape, depth, motion and layers |
| `presentation/primitives.css` | Shared screen, card, stat, meter, chip, button, choice, document and cinematic shapes |
| `presentation/brand.ts` | Runtime player-brand bridge, accessible brand ink and temporary legacy aliases |
| `presentation/index.ts` | Installs the shared CSS and exports the helpers |

`StreamingBrandVisuals.tsx` imports the presentation entry because it is the
common dependency of the branded streaming screens. Vite installs that CSS
once even though many screens consume the helpers.

Every cinematic root carries `data-epx-root`. This scopes focus treatment,
touch behaviour and reduced motion to EMPIRE+ instead of affecting the rest of
Actor Empire.

## Core tokens

### Type

| Role | Token | Size |
|---|---|---:|
| Micro label | `--epx-t-micro` | 11px |
| Caption | `--epx-t-caption` | 12px |
| Body | `--epx-t-body` | 14px |
| Stat/card value | `--epx-t-value` | 17px |
| Section title | `--epx-t-title` | 21px |
| Hero value | `--epx-t-hero` | 27px |
| Reveal/display | `--epx-t-display` | 36px |
| Full cinematic | `--epx-t-mega` | 52px |

Eleven pixels is the floor. If copy cannot fit at that size, reduce, collapse,
or move the copy rather than shrinking it.

Use `--epx-font-ui` for interface copy, `--epx-font-mono` for operational
numbers, and `--epx-font-doc` only for in-world editorial or legal material.

### Surfaces and foreground

Surfaces progress from `--epx-s-void` through `--epx-s-overlay`. Foreground
progresses from `--epx-fg-max` through `--epx-fg-5`. A card must move to the
next surface rung when it needs elevation; it must not invent another black.

Semantic state always combines colour with a label, icon, shape, or value:

- `--epx-good*`: healthy, clear, operational
- `--epx-warn*`: pressure, risk, attention
- `--epx-bad*`: failure, blocker, shortfall
- `--epx-pending*`: not yet proven or not yet live

### Player brand

Screens set the player identity with:

```tsx
<div data-epx-root style={brandVars(brand)}>
```

Use `--epx-brand`, `--epx-brand-lift`, `--epx-brand-deep`,
`--epx-brand-wash`, `--epx-brand-line` and `--epx-brand-grad` in CSS.
`brandVars()` derives `--epx-brand-ink`, choosing dark or white control text
from the selected colour's luminance. This protects contrast for yellow,
orange and neutral player brands.

The old aliases such as `--epx-bld-c` and `--epx-hq-c` are compatibility
bridges only. Remove each alias from `brand.ts` after its screen no longer
references it.

### Spacing and shape

Spacing uses a 4px base: `--epx-sp-1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`,
and `12`. Screen gutters use `--epx-gutter`. Repeated control and card shapes
use the shared radius ladder rather than local values.

Interactive controls must provide at least a 44 by 44 pixel touch target with
at least 8 pixels between adjacent actions.

### Motion

Motion communicates a state change, reveal, or physical action. A normal view
should have one or two active motion ideas, not continuous animation on every
surface.

- `--epx-d-fast` and `--epx-d-base`: controls and normal reveals
- `--epx-d-slow`: physical or consequential transitions
- `--epx-d-cine`: cutscene beats only
- `--epx-ease-out`: default entrance/settle
- `--epx-ease-spring`: tactile confirmations only

The OS `prefers-reduced-motion` setting resolves EMPIRE+ motion immediately
without leaking into other Actor Empire screens.

## Shared primitives

Use a primitive when two screens need the same visual job:

- `.epx-screen`, `.epx-top`, `.epx-body`, `.epx-foot`
- `.epx-eyebrow`, `.epx-caption`, `.epx-copy`, `.epx-title`, `.epx-hero`
- `.epx-card`, `.epx-stat`, `.epx-stats`
- `.epx-meter`, `.epx-segbar`
- `.epx-chip`, `.epx-btn`, `.epx-choice`
- `.epx-cine`, `.epx-beat`, `.epx-doc`

Screen-specific CSS remains valid for real scenery, art, spatial layouts and
unique cinematic moments. Repeated cards, buttons, labels and meters belong in
the shared layer.

## Migration rule

Step 1 establishes and safely installs the system; it does not perform the
Build-page redesign. Existing modules may retain local values while they are
migrated one screen at a time.

For every later screen rebuild:

1. Identify the single player question the view answers.
2. Replace repeated UI shapes with primitives.
3. Replace local type, colour, spacing, radius and motion values with tokens.
4. Remove that screen's legacy brand aliases.
5. Verify 375px mobile first, then 768px and desktop framing.
6. Test keyboard focus, 44px touch targets, reduced motion and no horizontal
   overflow.

Run `npm run audit:streaming-design-system` after presentation changes. The
audit treats remaining raw colours and sub-11px declarations as migration
metrics until their owning screen is rebuilt; new shared-system regressions are
hard failures.
