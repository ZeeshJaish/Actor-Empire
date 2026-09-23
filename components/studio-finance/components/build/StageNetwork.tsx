/* ============================================================================
   1 · The network — how each region is served.

   This file was the whole Network stage: a question about who builds it, a
   brief for the team, a planning cinematic and a proposal to approve, then
   region, country, city, the rooms for lease there, and the drawer that
   filled them. Fourteen hundred lines, five numbered steps on one screen, and
   a city choice the player could not make well.

   It is the region board now (#103). The player says how many servers and
   how much cloud each region gets; the placer puts the rooms where the
   audience is. Nobody drafts the network for you, so there is no team path
   here any more — the planner's placement logic survives inside the placer.
   ========================================================================== */

import React from 'react';
import type { StageProps } from './BuildWizard';
import { RegionBoard } from './RegionBoard';

export function StageNetwork(props: StageProps) {
  return <RegionBoard {...props} />;
}

