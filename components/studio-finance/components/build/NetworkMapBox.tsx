/* ============================================================================
   THE MAP BOX — the one fixed thing on the Network stage.

   It is the same box in every state the stage has: before a pen is chosen,
   while the team holds one, and while you are placing rooms yourself. That is
   the point of it. A stage that swapped its picture depending on who was
   drawing had two designs, and the player had to learn both.

   The box is the atlas, where you are on it, and the one reading the whole
   stage is judged by: what the markets you chose expect on the night, and how
   much of it this network actually starts.
   ========================================================================== */

import React from 'react';
import type { BuildData, BuildDraft, BuildTotals, CountryService } from '../../finance/build';
import { REDUNDANCY_COPY, countryServiceCoverageValid } from '../../finance/build';
import { compactCount, money } from '../../finance/format';
import { openingNightDemand } from '../../finance/buildPlanner';
import { regionsOf } from '../../finance/placer';
import { populationOf } from '../../../../services/worldPopulationClusters';
import { NetworkAtlas, WORLD_ASPECT } from './NetworkAtlas';
import { useCountUp } from './motion';

export interface NetworkMapBoxProps {
  data: BuildData;
  draft: BuildDraft;
  totals: BuildTotals;
  services: CountryService[];
  regionId?: string;
  cityId?: string;
  /** A room being filled but not yet taken, drawn as ground before it is paid
      for. This is why the box is pinned: you move a stepper down the page and
      the ground moves up here while you are still deciding. */
  previewCityId?: string;
  previewRacks?: number;
  /** What that proposed room would add, drawn ahead of the covered bar. */
  previewCapacity?: number;
  /* The card under your thumb in the rail below, named on the map. */
  focusCityId?: string;
  onSelectCity?: (cityId: string) => void;
  /* Tapping a continent flies to it, tapping the sea comes back out. */
  onSelectRegion?: (regionId: string) => void;
  /** Tucked while a room is open below. The box stays PINNED — the whole reason
      it is pinned is that you move a stepper down the page and the ground moves
      up here while you are still deciding — it just stops taking half the
      screen while you are reading a list of six duties. */
  tucked?: boolean;
  onShowWorld?: () => void;
  onShowRegion?: () => void;
  boxRef?: React.Ref<HTMLDivElement>;
}

export function NetworkMapBox({
  data, draft, totals, services, regionId, cityId,
  previewCityId, previewRacks = 0, previewCapacity = 0, focusCityId,
  onSelectCity, onSelectRegion, onShowWorld, onShowRegion, boxRef, tucked = false,
}: NetworkMapBoxProps) {
  const region = regionId ? data.regions.find(candidate => candidate.id === regionId) : undefined;
  const city = cityId ? data.cities.find(candidate => candidate.id === cityId) : undefined;

  /* --- the scope: the world, or the region under the rows (#107) -------------

     The reading follows the crumb. Looking at the world it is the whole
     launch; with a region focused — which is the region whose row is open
     below — it is that region: its night, its people, its served. Before
     this the box kept the whole launch at every zoom, and the page opened on
     "168.8K expected · 131.6K short" over a row that said "40.5K on the
     night · 92% served": two scopes on one screen, and the bigger number
     looked like the row's failure.

     An earlier cut of the same idea was reverted because the headline
     quietly became a region's figure behind a map gesture nobody made. So
     the scope is said in the sentence — "NORTH AMERICA · OF 335M PEOPLE" —
     not only in the crumb, and the world is one tap away.

     One definition of the night still. The whole launch's figure is the
     shared `openingNightDemand`; a region's is its share of it by the
     forecast's peaks, so the six regions sum to the launch and none of them
     is a second answer to "expected". */
  const scoped = regionId ? regionsOf(data).find(candidate => candidate.id === regionId) : undefined;
  const inScope = scoped ? scoped.markets : data.markets;
  const scopePeople = inScope.reduce((sum, market) => sum + populationOf(market.code), 0);
  const scopeIds = new Set(inScope.map(market => market.id));
  const scopedServices = scoped ? services.filter(service => scopeIds.has(service.marketId)) : services;
  const coverageAvailable = scopedServices.length === inScope.length && scopedServices.every(countryServiceCoverageValid);
  const whole = openingNightDemand(data, services).likely;
  const allPeaks = services.reduce((sum, service) => sum + service.peak, 0);
  const scopedPeaks = scopedServices.reduce((sum, service) => sum + service.peak, 0);
  const expected = scoped && allPeaks > 0 ? Math.round(whole * scopedPeaks / allPeaks) : whole;

  /* What you actually serve — not what your racks could carry.

     This was `totals.capacity + totals.burst`, which is the number of streams
     the machines could start if the audience were standing next to them. It
     knows nothing about distance, about who is inside the green field, or about
     whether a single market is reached. A four-rack room in Toronto reported
     317K covered against 169K expected while the forecast underneath graded
     every one of the eight markets NONE, and the band said "would cover it".

     `coveredPeak` is the share of each market's audience inside somebody's
     reach, summed. Same number the map shades and the market list grades, so
     the three cannot disagree again. In a region, the region's markets. */
  const committed = scopedServices.reduce((sum, service) => sum + service.coveredPeak, 0);

  /* The two big numbers follow the room you are configuring, not only the rooms
     you have signed for. */
  const covered = committed + Math.max(0, previewCapacity);
  const share = expected > 0 ? Math.min(1, covered / expected) : 0;
  const short = Math.max(0, expected - covered);
  const previewing = previewCapacity > 0;

  /* The figures roll to where they are going (#107): a number that jumps
     reads as a mistake, one that settles reads as a meter. */
  const expectedShown = useCountUp(expected);
  const coveredShown = useCountUp(covered);

  const pct = Math.round(share * 100);

  return (
    <div className={tucked ? 'bw-net-map is-tucked' : 'bw-net-map'} ref={boxRef}>
      {/* The frame takes the world's own shape, from the atlas that draws it,
          so a world view fills the box instead of floating in it. */}
      {/* The stage takes the world's own shape so a world view fills the box
          instead of floating in it — but an inline aspect beats the stylesheet,
          so the tucked strip has to drop it here rather than override it there.
          Tucked, the strip keeps the full width and crops the world vertically;
          the readout across its foot is what has to survive. */}
      <div
        className="bw-net-stage"
        style={tucked ? undefined : { aspectRatio: String(WORLD_ASPECT) }}
      >
        <NetworkAtlas
          data={data}
          draft={draft}
          services={services}
          regionId={regionId}
          cityId={cityId}
          previewCityId={previewCityId}
          previewRacks={previewRacks}
          focusCityId={focusCityId}
          onSelectCity={onSelectCity}
          onSelectRegion={onSelectRegion}
          onShowWorld={onShowWorld}
        />

        {/* Where you are, on the picture, as the way back out of it. */}
        <nav className="bw-net-crumb" aria-label="Map scope">
          <button type="button" onClick={onShowWorld} className={!regionId ? 'is-on' : undefined}>World</button>
          {region && (
            <button type="button" onClick={onShowRegion} className={!cityId ? 'is-on' : undefined}>
              {region.name}
            </button>
          )}
          {city && <button type="button" className="is-on" aria-current="true">{city.name}</button>}
        </nav>

        {/* --- the reading, on the picture it is about ---------------------
            It was a strip under the map, which made the map a picture with a
            caption and cost eighty pixels of a page that is already long. It
            is part of the picture now: the figures sit on the sea at the foot
            of the frame, over a scrim that only exists where they do. */}
        <div className="bw-net-read">
          <span className="bw-net-read-side is-scoped">
            <b>{coverageAvailable ? compactCount(Math.round(expectedShown)) : '—'}</b>
            {/* The scale used to be a second line across the top of the map —
                "2608.4M people · 168.8K on the night · 0 yours" — which took a
                strip of the picture and floated free of the figure it was
                about. It sits under the number it qualifies now: what the night
                expects, out of how many people are down there — and, in a
                region, whose night it is. */}
            {/* Three figures, each said plainly (#115): what the night
                expects, who it is drawn from, and how much of it you serve.
                The word is "served", the same word the row under it uses. */}
            <em>on the night</em>
            <em className="is-scope">{scoped ? `${scoped.name} · ${compactCount(scopePeople)} people` : `${compactCount(scopePeople)} people`}</em>
          </span>
          <span className="bw-net-gauge" role="img" aria-label={coverageAvailable ? `${pct} percent of the night covered` : 'Coverage unavailable'}>
            {/* The committed bar stops where your signed rooms stop; the
                proposed room continues it, so the gauge and the number beside
                it are telling the same story. */}
            {coverageAvailable && <s
              style={{ width: `${Math.round((Math.min(1, committed / Math.max(1, expected))) * 100)}%` }}
              data-full={share >= 1 ? 'yes' : undefined}
            />}
            {coverageAvailable && previewing && (
              <u
                data-full={share >= 1 ? 'yes' : undefined}
                style={{
                left: `${Math.round((Math.min(1, committed / Math.max(1, expected))) * 100)}%`,
                width: `${Math.min(100 - Math.round((Math.min(1, committed / Math.max(1, expected))) * 100), Math.round((previewCapacity / Math.max(1, expected)) * 100))}%`,
                }}
              />
            )}
          </span>
          <span
            className={[
              'bw-net-read-side is-end',
              short > 0 ? 'is-short' : '',
              previewing ? 'is-preview' : '',
            ].filter(Boolean).join(' ')}
          >
            <b>{coverageAvailable ? compactCount(Math.round(coveredShown)) : '—'}</b>
            <em>{!coverageAvailable ? 'Coverage unavailable' : previewing
              ? (short > 0 ? `${compactCount(short)} still short` : 'would serve it all')
              : (short > 0 ? `${compactCount(short)} short` : 'served')}</em>
          </span>
        </div>
      </div>

      {/* How exposed the network is, said once, under the picture it is about,
          and only when it is bad news — a network that is fine does not need a
          paragraph explaining that it is fine. `redundancy([])` returns SINGLE,
          so an empty draft must not be given a verdict at all. */}
      {totals.racks + (totals.compute ?? 0) > 0 && (
        <p className={`bw-place-risk is-${REDUNDANCY_COPY[totals.redundancy].tone}`} role="status">
          <b>{REDUNDANCY_COPY[totals.redundancy].label}</b>
          {totals.redundancy !== 'REDUNDANT' && <em>{REDUNDANCY_COPY[totals.redundancy].line}</em>}
          {/* What it costs, beside the picture it is about (#120). The two
              figures on the map are a matched pair — the night, and how much
              of it you serve — so the money goes on the line under them
              rather than in among them. */}
          <s>{money(totals.buildCost)} once · {money(totals.weeklyCost)}/wk</s>
        </p>
      )}
    </div>
  );
}
