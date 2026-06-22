# Compact Forbes Position Card Design

## Goal

Reduce the vertical footprint of the Forbes **Your Position** section while keeping ownership, value, strategic influence, and the Stocks route immediately understandable.

## Layout

The card becomes an adaptive compact summary:

- slim header with **Your Position** and the current position badge;
- one primary metrics row showing ownership percentage, position value, and strategic target;
- one thin strategic-influence progress bar;
- one compact footer row containing either the empty-state explanation or owned-position micro stats;
- a small **Open Stocks** action aligned to the right when a linked public stock exists.

The empty state should fit in approximately half the current card height. It must not repeat the lack of ownership through multiple large blocks.

## Empty State

For a company with no holdings:

- show `0%` ownership prominently but not oversized;
- show `$0` position value;
- show the company-specific 20%, 25%, or 30% strategic target;
- show one short line: **No shares or negotiated equity held**;
- show a compact **Open Stocks** action when applicable.

The separate bordered empty-message box is removed.

## Owned Position

When the player has a financial or strategic stake, the same card expands only slightly to include a compact micro-stat row:

- public shares;
- negotiated/private stake;
- estimated annual dividend.

The position badge and progress bar communicate whether the holding is Financial Stake or Strategic Stake. No additional explanatory paragraph is required when the threshold has already been reached.

## Controlling Position

Player-controlled companies show:

- `100%` ownership;
- company position value;
- **Controlling Owner** badge;
- a short control statement in the footer.

The large controlling-owner callout box is removed.

## Visual Direction

- retain the existing sky-blue ownership identity;
- use restrained radial lighting and a thin border;
- reduce padding, type size, and nested boxes;
- keep the strongest number as ownership percentage;
- use one-line labels and compact icon buttons;
- preserve accessible text and tap targets;
- avoid SaaS-style equal-weight stat cards.

## Behavior and Architecture

Only `ForbesCompanyPosition.tsx` changes. `CompanyPosition`, stock calculations, acquisition cases, strategic thresholds, and navigation callbacks remain unchanged.

## Testing

Source and browser checks cover:

- empty public-stock state;
- financial stake state;
- strategic stake state;
- controlling-owner state;
- 20%, 25%, and 30% thresholds;
- Open Stocks navigation;
- reduced first-viewport height without clipping or overflow.
