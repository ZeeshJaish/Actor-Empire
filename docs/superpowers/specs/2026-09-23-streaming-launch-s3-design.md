# Streaming launch S3 design: country-truth groups and fair filing energy

Status: approved in conversation on 2026-09-23. This supersedes the roadmap's earlier 5+1/cap-25 *candidate*, not the S3 scope. Implementation is inline in the authoritative Actor Empire checkout; no commit or push is authorized.

## Player contract

A group is a bulk-selection affordance over the canonical country catalogue, not a separate market or transaction. Selecting, inspecting, mapping, and quoting remain free. A filing action charges only the unfiled countries actually submitted. Already-filed countries never enter that action's energy or cash quote. Individual filing is 5 energy. For one combined filing of `n` eligible countries, energy is `min(30, 5 + 2*min(n-1,8) + max(n-9,0))`, with 0 for an empty batch. Thus 1/7/13/23 countries cost 5/17/25/30 energy. The discount applies to any multi-country submission, including a partial group or a batch spanning regions, not only to a named group. Reapplication and regulatory follow-up retain their existing separately disclosed costs. Per-country rights/compliance cash and review duration do not change.

The same pure energy quote is consumed by group previews, Market Clearance, opening-programme quotes, and the canonical filing transaction. The transaction re-filters current operation statuses, so a stale client quote cannot charge already-filed countries or double-submit them. Insufficient energy or treasury prevents the transaction without an energy debit; repeat submission is a no-op. Any bank/energy display must use the current quote, not a fixed 5×count copy.

## Group facts and map

The group list derives from `STREAMING_MARKET_SUB_REGIONS` and the launch country catalogue. Its member IDs, selected count, pending-to-file count, audience, audience-weighted rival share, access cash, and compliance cash reconcile to those country records. The group report says how aggregates are calculated and shows each country's status, access/compliance cash, approximate approval duration, requirements, and standalone 5E filing cost. A separate line gives the discounted cost of filing its currently unfiled members together; it is not described as the sum of per-country energy.

Map presentation uses the shared world atlas country IDs and positions. Each member is represented by its atlas shape or a position marker when the atlas lacks a shape (notably tiny islands); selection is visually distinct. Region/group totals never come from map pixel area. Country-list controls remain usable if a tiny marker is hard to tap.

## Responsive and verification contract

At phone widths, the six region controls remain legible, the selected count is a text badge rather than a cramped circle, the region summary wraps into separate count/audience/energy lines, and Add all becomes Remove all when fully selected. Group card and report prices do not clip. The full report remains accessible by keyboard and touch.

Automated checks cover six regions, the 13-country Caribbean and 23-country North America, shapes/centroids including missing-shape islands, aggregate cash/audience/rival reconciliation, partial selection and filing, 0–100 energy boundaries, repeat and rejected filings, save/reload, and the exact UI-to-transaction quote. Isolated phone-browser checks use 393×600 and 393×852, plus desktop. Existing player saves are not modified for fixtures.

## Scope boundary

S3 does not change subscription pricing, AI competitor discounts, Build performance, poster art, or commissioning. S4–S6 own those. No new purchased-energy offer is introduced; the approved balance reduces friction without making energy costs hidden.
