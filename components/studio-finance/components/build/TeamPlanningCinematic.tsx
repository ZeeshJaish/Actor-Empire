import { useEffect, useState } from 'react';
import {
  facilityRacks,
  limitingFactor,
  serviceForecast,
  type BuildData,
} from '../../finance/build';
import type { BuildTeamProposal } from '../../finance/buildPlanner';
import { compactCount, money } from '../../finance/format';
import { WorldMap } from './WorldMap';
import { RackWall } from './RackWall';

const BEATS = [
  ['Mapping the opening', 'Matching real market demand to the opening footprint'],
  ['Placing the network', 'Drawing the shortest resilient route between the selected rooms'],
  ['Racking the rooms', 'Assigning capacity, ownership and failover'],
  ['Clearing the allocation', 'Reconciling the network quote with the authorized ceiling'],
  ['Rehearsing the crowd', 'Running likely and high-demand traffic against available capacity'],
] as const;

const BEAT_DURATION_MS = 1_050;
const CINEMATIC_DURATION_MS = 6_800;

const pct = (value: number, ceiling: number) => `${Math.max(2, Math.min(100, (value / Math.max(1, ceiling)) * 100))}%`;

export function TeamPlanningStage({
  data,
  proposal,
  beat,
}: {
  data: BuildData;
  proposal: BuildTeamProposal;
  beat: number;
}) {
  const cities = proposal.cityIds.map(id => data.cities.find(city => city.id === id)).filter(Boolean);
  const services = serviceForecast(data, proposal.draft);
  const facilityIndex = Math.min(Math.max(0, beat - 2), Math.max(0, proposal.draft.facilities.length - 1));
  const facility = proposal.draft.facilities[facilityIndex];
  const listing = facility ? data.listings.find(candidate => candidate.id === facility.listingId) : undefined;
  const totalCapacity = proposal.steadyCapacity + proposal.burstCapacity;
  const load = proposal.likelyDemand / Math.max(1, totalCapacity);
  const totalRacks = proposal.rackDistribution.reduce((sum, racks) => sum + racks, 0);
  const quoteShare = proposal.networkBudget / Math.max(1, proposal.allocation);
  const reserveShare = proposal.unusedAllocation / Math.max(1, proposal.allocation);
  const highDemandClears = proposal.highDemand <= totalCapacity;

  if (beat === 0) {
    return (
      <div className="bw-team-cine-map bw-team-stage-enter">
        <div className="bw-team-signal-head">
          <span>Opening demand</span>
          <b>{compactCount(proposal.likelyDemand)} likely viewers</b>
        </div>
        <div className="bw-team-map-frame">
          <WorldMap
            data={data}
            draft={proposal.draft}
            services={services}
            cinematic
            cinematicDurationMs={BEAT_DURATION_MS - 150}
          />
          <i className="bw-team-map-scan" />
        </div>
        <div className="bw-team-market-tape">
          {data.markets.slice(0, 4).map((market, index) => (
            <span key={market.id} style={{ ['--i' as string]: index }}>
              <i />
              <em>{market.name}</em>
              <b>{compactCount(market.demand)}</b>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (beat === 1) {
    return (
      <div className="bw-team-cine-route bw-team-stage-enter">
        <div className="bw-team-signal-head">
          <span>Placement route</span>
          <b>{cities.length} {cities.length === 1 ? 'site' : 'sites'} shortlisted</b>
        </div>
        <div className="bw-team-route-map">
          <WorldMap
            data={data}
            draft={proposal.draft}
            services={services}
            showNetworkRoutes
            cinematic
            cinematicDurationMs={BEAT_DURATION_MS - 150}
          />
        </div>
        <div className="bw-team-route-line">
          {cities.map((city, index) => city && (
            <span key={city.id} style={{ ['--i' as string]: index }}>
              <i>{String(index + 1).padStart(2, '0')}</i>
              <em>Route {String(index + 1).padStart(2, '0')}</em>
              <b>{city.name}</b>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (beat === 2 && facility) {
    return (
      <div className="bw-team-cine-racks bw-team-stage-enter">
        <div className="bw-team-signal-head">
          <span>Room {String(facilityIndex + 1).padStart(2, '0')} of {String(proposal.draft.facilities.length).padStart(2, '0')}</span>
          <b>{cities[facilityIndex]?.name || facility.cityId}</b>
        </div>
        <RackWall
          facility={facility}
          listing={listing}
          limiting={limitingFactor(data, facility)}
          compact
          load={Math.min(1, load)}
          owned={Math.round(facilityRacks(facility) * proposal.draft.ownedShare)}
        />
        <div className="bw-team-room-tape">
          <strong>{facilityRacks(facility)} racks</strong>
          <span>{proposal.draft.architecture.toLowerCase()} fleet</span>
          <span>{compactCount(facility.groups.reduce((sum, group) => sum + group.capacity, 0))} steady</span>
        </div>
      </div>
    );
  }

  if (beat === 3) {
    return (
      <div className="bw-team-cine-allocation bw-team-stage-enter">
        <div className="bw-team-clearance-mark" data-state={proposal.requiresApproval ? 'warn' : 'clear'}>
          <i>{proposal.requiresApproval ? '!' : '✓'}</i>
          <span>
            <em>Budget clearance</em>
            <b>{proposal.requiresApproval ? 'Founder approval' : 'Within authority'}</b>
          </span>
        </div>
        <div className="bw-team-clearance-tracks">
          <span>
            <em>Authorized</em><b>{money(proposal.allocation)}</b>
            <i><s style={{ width: '100%' }} /></i>
          </span>
          <span>
            <em>Network quote</em><b>{money(proposal.networkBudget)}</b>
            <i><s style={{ width: pct(quoteShare, 1) }} /></i>
          </span>
          <span>
            <em>Held back</em><b>{money(proposal.unusedAllocation)}</b>
            <i><s style={{ width: pct(reserveShare, 1) }} /></i>
          </span>
        </div>
        <p>{money(proposal.projectedTreasury)} remains in studio treasury after commissioning.</p>
      </div>
    );
  }

  if (beat === 4) {
    return (
      <div className="bw-team-cine-rehearsal bw-team-stage-enter" data-state={highDemandClears ? 'clear' : 'warn'}>
        <div className="bw-team-rehearsal-head">
          <span>
            <em>Opening-night rehearsal</em>
            <b>{highDemandClears ? 'Traffic clears the network' : 'Peak traffic exceeds capacity'}</b>
          </span>
          <strong>{highDemandClears ? 'PASS' : 'WATCH'}</strong>
        </div>
        <div
          className="bw-team-load-plot"
          style={{ ['--load-scale' as string]: Math.max(.14, Math.min(1.15, proposal.highDemand / Math.max(1, totalCapacity))) }}
          aria-hidden="true"
        >
          <i className="bw-team-load-cap" />
          <svg viewBox="0 0 600 180" preserveAspectRatio="none">
            <path className="bw-team-load-fill" d="M0 158 C55 156 86 138 125 140 C176 144 184 103 228 111 C275 120 292 69 338 81 C390 94 409 38 460 56 C500 69 535 25 600 42 L600 180 L0 180 Z" />
            <path className="bw-team-load-wave" d="M0 158 C55 156 86 138 125 140 C176 144 184 103 228 111 C275 120 292 69 338 81 C390 94 409 38 460 56 C500 69 535 25 600 42" />
          </svg>
        </div>
        <div className="bw-team-load-legend">
          <span><i /><em>Likely load</em><b>{compactCount(proposal.likelyDemand)}</b></span>
          <span><i /><em>High load</em><b>{compactCount(proposal.highDemand)}</b></span>
          <span><i /><em>Capacity</em><b>{compactCount(totalCapacity)}</b></span>
        </div>
      </div>
    );
  }

  return (
    <div className="bw-team-cine-blueprint bw-team-stage-enter" data-state={highDemandClears ? 'clear' : 'warn'}>
      <div className="bw-team-blueprint-title">
        <em>Engineering sign-off</em>
        <b>{proposal.networkClass}</b>
        <p>{cities.length} {cities.length === 1 ? 'site is' : 'sites are'} routed and ready for your approval.</p>
      </div>
      <div className="bw-team-blueprint-route" aria-hidden="true">
        <div className="bw-team-blueprint-core"><strong>{totalRacks}</strong><small>racks allocated</small></div>
        <div className="bw-team-blueprint-nodes">
          {cities.map((city, index) => city && (
            <span key={city.id} style={{ ['--i' as string]: index }}><i />{city.name}</span>
          ))}
        </div>
      </div>
      <div className="bw-team-blueprint-stats">
        <span><em>Footprint</em><b>{cities.length} {cities.length === 1 ? 'site' : 'sites'}</b></span>
        <span><em>Fleet</em><b>{totalRacks} racks</b></span>
        <span><em>Capacity</em><b>{compactCount(totalCapacity)}</b></span>
        <span><em>Quote</em><b>{money(proposal.networkBudget)}</b></span>
        <span><em>Build time</em><b>{proposal.buildWeeks} wk</b></span>
      </div>
      <p className="bw-team-blueprint-note">Drawing ready · Nothing charged until commissioning</p>
    </div>
  );
}

export function TeamPlanningCinematic({
  data,
  proposal,
  onComplete,
}: {
  data: BuildData;
  proposal: BuildTeamProposal;
  onComplete: () => void;
}) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const started = window.setInterval(
      () => setBeat(current => Math.min(BEATS.length, current + 1)),
      BEAT_DURATION_MS,
    );
    const completed = window.setTimeout(onComplete, CINEMATIC_DURATION_MS);
    return () => {
      window.clearInterval(started);
      window.clearTimeout(completed);
    };
  }, [onComplete]);

  const current = beat >= BEATS.length ? null : BEATS[beat];

  return (
    <div className={`bw-team-cine is-beat-${Math.min(beat, BEATS.length)}`} role="status" aria-live="polite" aria-label="Your engineering team is preparing the network plan">
      <header>
        <span>Empire engineering</span>
        <div className="bw-team-cine-progress" aria-hidden="true">
          {BEATS.map((_, index) => <i key={index} className={index <= beat ? 'is-on' : undefined} />)}
        </div>
        <b>{beat >= BEATS.length ? 'READY' : `${String(beat + 1).padStart(2, '0')} / ${String(BEATS.length).padStart(2, '0')}`}</b>
      </header>

      <section className="bw-team-cine-stage" aria-hidden="true">
        <TeamPlanningStage data={data} proposal={proposal} beat={beat} />
      </section>

      <footer className="bw-team-cine-copy">
        <span>{beat >= BEATS.length ? '✓' : String(beat + 1).padStart(2, '0')}</span>
        <div>
          <h2>{beat >= BEATS.length ? 'Plan ready' : current?.[0]}</h2>
          <p>{beat >= BEATS.length ? `${proposal.networkClass} network prepared for your approval.` : current?.[1]}</p>
        </div>
      </footer>
    </div>
  );
}
