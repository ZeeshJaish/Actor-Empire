# Genre label layout fix

The original genre grid used the viewport's `sm` breakpoint to force four columns inside a narrow panel. At a 1440px viewport each primary button was 71px wide with 16px padding on both sides; even Action occupied two text lines. Mobile also split longer genre names. Secondary choices required hidden horizontal scrolling.

The existing wizard now uses content-sized wrapping buttons for both genre groups. Labels use normal casing and remain whole. Primary selection is amber, secondary selection is white; both have explicit pressed states, accessible group labels and visible keyboard focus. Each button is at least 44px tall. All existing genre handlers and story/DNA logic are unchanged.

Verified in Chromium at 320, 390, 768 and 1440px viewport widths, including the same narrow desktop panel as the report:

- Every label is single-line and fits its button; neither group nor the page scrolls horizontally.
- All 17 primary choices and 16 secondary choices remain available after selection.
- Secondary selection and clearing, Space-key selection, visible 2px keyboard focus, and progression into the expanded DNA questions pass.
- `npm run audit:script-broad-expansion` passes 1,302 prior profiles, existing metadata and 26 story combinations.
- `npm run build` passes, with the existing chunk-size warning.
- Design detector returns no findings; no ignore rules were added.
- `git diff --check` passes. Other workspace changes were preserved.

These are responsive browser checks, not physical-device testing. Screenshots `genre-mobile.png` and `genre-desktop.png` show the actual changed section; `mobile-after.png` and `desktop-after.png` show the full page.
