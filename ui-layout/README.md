# Reusable responsive layout core

This module is intentionally independent of Actor Empire gameplay. A future React/WebView game can copy or package `ui-layout/` and import `ui-layout/layout.css`; it must keep its own visual tokens, cards, state, and callbacks.

## Rules

- Choose columns from the **available container width**, not a named phone model, pixel ratio, or device performance tier.
- `chooseColumnCount` is pure. Variant thresholds are `columns × minItemWidthPx + gaps`; the smallest variant is the safe initial/unknown-width mode.
- `ResponsiveGrid` measures its own box. It changes only CSS columns, preserving child keys, state, and callbacks. Do not put a changing `key` on the grid when switching variants.
- `InformationGrid` uses 1/2/4 columns with 96-pixel minimum items; `ActionGroup` uses 1/2 columns with 144-pixel minimum items. These are starting policies, not visual styling mandates.
- `GameViewport`, `ContentRegion`, `AdaptiveHeader`, and `SheetActionFooter` supply safe-area-aware geometry. Their colors, typography, borders, shadows, and icon styles belong to each game.
- The CSS sets a 44×44-pixel minimum on buttons inside the primitives. If a game renders a custom clickable non-button, give it equivalent target geometry and mark it with `data-layout-touch-target` for diagnostics.
- `auditLayout` is a development-only import from `ui-layout/diagnostics`, **not** the production barrel. Mark primary labels with `data-layout-primary-label`, overflow regions with `data-layout-overflow-region`, and elements with stable `data-layout-id` values. It returns issue IDs only; it never inspects player text or changes the DOM.
- `DEFAULT_LAYOUT_TOKENS` names the base touch, spacing, readable-width, maximum-width, and mode values. The viewport's matching CSS variables let each game override spacing, maximum content width, and minimum target size without editing the primitives; do not set touch targets below 44 pixels. Mark primary actions with `data-layout-primary-action` and fixed overlays with `data-layout-fixed-chrome` to detect obstructed actions in development.
- Keep mode decisions at the containing component; do not change save schemas, tutorial IDs, navigation, purchases, or reward callbacks because a width bucket changes.
- Opt-in horizontal carousels use `no-scrollbar` (legacy `hide-scrollbar` also works) with `railInteractions.css` and `installHorizontalRailDrag(document)`. Existing `custom-scrollbar` rails get the same drag interaction when they overflow horizontally. Touch keeps native panning; mouse/pen can drag; a drag never activates its card. Do not use these classes on data tables or text-selection regions where a visible scrollbar is part of the interaction.

## Validation

The pure policy audit is `scripts/audit-responsive-layout-policy.ts`. The synthetic browser fixture is `scripts/fixtures/responsive-layout-qa.html` and its audit is `scripts/audit-responsive-layout-browser.ts`. The fixture checks exact boundary widths, child mount count, minimum target size, overflow at representative phone widths, short height, and diagnostic detection. These checks do not replace screen-by-screen visual QA after adoption.
