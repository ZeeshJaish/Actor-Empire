/* ============================================================================
   AUDIENCE PANELS — the region strip above the living map (MARKETS, and the Enter New Markets page).

     RegionRail      the continents as one segmented strip, each with its number

   #136: the old panels around the map (TopCountryRail, MarketFunnel, WinnersBoard, MarketPulse, AccessBoard,
   RegionTiles, CountryRows) are gone; the tabs draw their own (AudienceMarketsTab, AudienceWorldTab).
   Presentation only: every figure arrives from audienceAtlasModel.
   ========================================================================== */

import React from 'react';
import css from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import {
  REGION_SHORT_LABELS,
  compact,
  type AtlasRegionId,
  type AtlasRegionSummary,
} from './audienceAtlasModel';

/* ── the continents, as one segmented strip ─────────────────────────────── */
/* Seven cells that always fit the width: no sideways scroll, nothing cut by
   the edge of the screen. The labels are the short forms; the full names are
   in each cell's accessible label. */
const STRIP_LABELS: Record<AtlasRegionId, string> = {
  NORTH_AMERICA: 'N.AMER',
  SOUTH_AMERICA: 'S.AMER',
  EUROPE: 'EUROPE',
  AFRICA: 'AFRICA',
  ASIA: 'ASIA',
  OCEANIA: 'OCEANIA',
};

export const RegionRail: React.FC<{
  regions: AtlasRegionSummary[];
  focus: AtlasRegionId | null;
  valueOf: (region: AtlasRegionSummary) => number;
  format?: (value: number) => string;
  worldValue: number;
  onFocus: (regionId: AtlasRegionId | null) => void;
}> = ({ regions, focus, valueOf, format = compact, worldValue, onFocus }) => (
  <div className={css.regionStrip} role="tablist" aria-label="Regions">
    <button type="button" role="tab" aria-selected={!focus} aria-label={`World ${format(worldValue)}`} className={!focus ? css.on : ''} onClick={() => onFocus(null)}>
      <small>WORLD</small><b>{format(worldValue)}</b>
    </button>
    {regions.map(region => {
      const value = valueOf(region);
      return (
        <button key={region.id} type="button" role="tab" aria-selected={focus === region.id}
          aria-label={`${REGION_SHORT_LABELS[region.id]} ${value > 0 ? format(value) : 'none'}`}
          className={focus === region.id ? css.on : ''} onClick={() => onFocus(region.id)}>
          <small>{STRIP_LABELS[region.id]}</small>
          <b className={value > 0 ? '' : css.muted}>{value > 0 ? format(value) : '—'}</b>
        </button>
      );
    })}
  </div>
);
