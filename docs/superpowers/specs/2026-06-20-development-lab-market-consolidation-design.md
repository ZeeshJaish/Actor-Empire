# Development Lab Market Consolidation

## Goal

Consolidate the existing source-material market and Rights Market inside the
Development Lab instead of presenting Rights & Universes as a second parallel
studio division.

This phase changes navigation and organization only. It does not add studio
acquisitions, negotiations, ownership contracts, or a second inventory model.

## Player Flow

The Production House dashboard has one creative entry point: Development Lab.

Development Lab keeps its five existing tabs:

- Vault
- Concept
- Market
- Franchise
- Universe

Market contains three lanes:

- Scripts: finished screenplays and spec scripts ready to acquire.
- Stories: books, life rights, documentary access, and other source material.
- Properties: the existing intelligence-led Rights Market with tracking,
  scouting, expiry, rarity, rival pressure, and dossiers.

Vault contains two inventory lanes:

- Scripts: the existing active scripts and produced archive.
- Rights: the future home for completed property acquisitions. It starts empty
  because property dealmaking is outside this phase.

## Removed Duplication

The Production House dashboard no longer shows a separate Rights & Universes
card. The `IP_MANAGEMENT` route is removed from the dashboard flow.

No gameplay is lost:

- Franchise remains in Development Lab.
- Universe remains in Development Lab.
- The existing Rights Market is embedded in Development Lab Market.
- The existing source-material market remains available through Scripts and
  Stories.

## Save Compatibility

Existing saves retain both market data sets:

- `studioState.ipMarket`
- `studioState.rightsMarket`
- rights-market cycle, scouting, tracking, and notice metadata

Normalization continues to initialize missing rights-market fields without
replacing old source-market listings.

## UI Direction

This remains a game screen rather than a management dashboard:

- one strong Development Lab identity
- compact segmented market lanes
- contextual filters only inside the selected lane
- no nested page title competing with the Development Lab header
- no duplicate Franchise or Universe management pages

## Out Of Scope

- buying a studio
- bidding wars
- rights negotiation choices
- contract signing
- acquired-rights development bonuses
- autonomous subsidiary decisions

Those systems can build on this consolidated navigation in later phases.
