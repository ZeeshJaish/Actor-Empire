/* ============================================================================
   1 · Sites — where the platform physically exists.

   The first question is who is doing this: the team, or you. Everything after
   that follows the world the game is actually built from — region, then
   country, then the cities inside it that can hold a rack — instead of one flat
   list of city names.

   Nothing is charged here. A lease is a drawing until commissioning.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BuildDraft, City, Facility, FacilityListing } from '../../finance/build';
import {
  REDUNDANCY_COPY,
  citiesIn,
  countriesIn,
  facilityRacks,
  facilityRoomLabel,
  groupFacilityLeases,
} from '../../finance/build';
import type { StageProps } from './BuildWizard';
import { compactCount, money } from '../../finance/format';
import { WorldMap } from './WorldMap';
import { CityScene } from './CityScene';
import { CountryShape } from './CountryShape';
import { SpecMeters } from './SpecMeters';
import { BuildMetricSheet, type BuildMetricInfo } from './BuildMetricSheet';
import { Tag } from '../ui';
import {
  createBuildTeamProposal,
  type BuildPlanningFailure,
} from '../../finance/buildPlanner';
import { TeamPlanningCinematic } from './TeamPlanningCinematic';

const AVAILABILITY: Record<FacilityListing['availability'], { label: string; tone: 'good' | 'warn' | 'flat' }> = {
  AVAILABLE: { label: 'Available', tone: 'good' },
  LIMITED: { label: 'Limited space', tone: 'warn' },
  RESEARCH: { label: 'Needs research', tone: 'flat' },
};

type FacilityVisualKind = 'cloud' | 'cabinet' | 'cage' | 'suite' | 'hall' | 'campus';

const FACILITY_IDENTITY: Record<FacilityVisualKind, { model: string; research?: string }> = {
  cloud: { model: 'Provider operated' },
  cabinet: { model: 'Shared facility' },
  cage: { model: 'Private zone' },
  suite: { model: 'Private room' },
  hall: { model: 'Dedicated hall' },
  campus: { model: 'Owned campus', research: 'Owned infrastructure research required' },
};

function facilityVisualKind(listing: FacilityListing): FacilityVisualKind {
  switch (listing.facilityType) {
    case 'CLOUD_ALLOCATION': return 'cloud';
    case 'RENTED_CABINET': return 'cabinet';
    case 'PRIVATE_CAGE': return 'cage';
    case 'PRIVATE_SUITE': return 'suite';
    case 'DEDICATED_DATA_HALL': return 'hall';
    case 'OWNED_DATA_CENTRE':
    case 'LEGACY_CAMPUS': return 'campus';
    default: {
      const name = `${listing.name} ${listing.type}`.toLowerCase();
      if (name.includes('cloud')) return 'cloud';
      if (name.includes('cabinet')) return 'cabinet';
      if (name.includes('cage')) return 'cage';
      if (name.includes('suite')) return 'suite';
      if (name.includes('hall')) return 'hall';
      return 'campus';
    }
  }
}

export function FacilityIdentity({ listing }: { listing: FacilityListing }) {
  const kind = facilityVisualKind(listing);
  const identity = FACILITY_IDENTITY[kind];
  const research = listing.availability === 'RESEARCH';
  return (
    <div
      className={`bw-facility-identity is-${kind}${research ? ' is-research' : ''}`}
      aria-label={`${listing.name} · ${identity.model} · ${listing.rackPositions} racks${research ? ' · Research required' : ''}`}
    >
      <FacilityMark kind={kind} />
      <span className="bw-facility-model">
        <b>{identity.model}</b>
        <em>{listing.rackPositions} racks</em>
      </span>
      {research && (
        <span className="bw-facility-research">
          <b>RESEARCH REQUIRED</b>
          <em>{identity.research || 'Infrastructure research required'}</em>
        </span>
      )}
    </div>
  );
}

function FacilityMark({ kind }: { kind: FacilityVisualKind }) {
  return (
    <span className={`bw-facility-mark is-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 64 44">
        {kind === 'cloud' && <><path d="M17 31h31a8 8 0 0 0 .5-16 13 13 0 0 0-24-3A10 10 0 0 0 17 31Z" /><path d="M24 26h16M28 31v5m8-5v5" /></>}
        {kind === 'cabinet' && <><rect x="23" y="5" width="18" height="34" rx="2" /><path d="M27 12h10M27 18h10M27 24h10M27 30h10" /></>}
        {kind === 'cage' && <><path d="M10 7h44v31H10zM16 7v31m32-31v31" /><rect x="25" y="13" width="14" height="21" rx="1" /><path d="M28 19h8m-8 5h8m-8 5h8" /></>}
        {kind === 'suite' && <><path d="M8 38V7h48v31M14 13h36v25" /><rect x="20" y="18" width="10" height="18" /><rect x="34" y="18" width="10" height="18" /><path d="M23 23h4m10 0h4" /></>}
        {kind === 'hall' && <><path d="M5 37V10h54v27" /><rect x="10" y="16" width="9" height="18" /><rect x="23" y="16" width="9" height="18" /><rect x="36" y="16" width="9" height="18" /><rect x="49" y="16" width="6" height="18" /></>}
        {kind === 'campus' && <><path d="M4 38h56M10 38V15h18v23m8 0V7h18v31" /><path d="M15 21h8m-8 6h8m-8 6h8M41 14h8m-8 7h8m-8 7h8m-8 6h8" /></>}
      </svg>
    </span>
  );
}

/** A newly leased room starts with a sensible default rather than empty floor. */
export function facilityFromListing(listing: FacilityListing, first: boolean): Facility {
  const racks = Math.max(1, Math.min(listing.rackPositions, first ? 2 : 1));
  const engineering = listing.engineering;
  const backupCoverage = engineering
    ? Math.min(1, engineering.backupPowerKw / Math.max(1, racks * 12))
    : .7;
  return {
    id: `fac-${listing.id}-${Date.now()}`,
    listingId: listing.id,
    cityId: listing.cityId,
    built: false,
    groups: [
      first
        ? { id: `g-${listing.id}-origin`, name: 'Origin', duty: 'ORIGIN', racks, capacity: racks * 140_000 }
        : { id: `g-${listing.id}-edge`, name: 'Edge', duty: 'EDGE', racks, capacity: racks * 120_000 },
    ],
    power: { used: racks * 12, contracted: engineering?.powerContractKw ?? listing.rackPositions * 12 },
    cooling: { used: racks * 11, available: engineering?.coolingCapacityKw ?? listing.rackPositions * 10 },
    bandwidth: { used: racks * 2_000, available: engineering?.committedBandwidthMbps ?? listing.rackPositions * 3_200 },
    condition: 0.92,
    uptime: listing.uptime,
    backup: engineering?.backupPowerMode || 'UPS',
    backupCoverage,
    energyPerWeek: racks * 14,
    waterPerWeek: racks * 26,
    opCost: listing.weeklyRent * 0.55,
    sustainability: listing.fibre === 'Carrier hotel' ? 62 : 74,
    reputation: 70,
  };
}

export interface BuildControlHandoffConfirmation {
  title: string;
  body: string;
  confirmLabel: string;
}

/** Switching control never silently deletes rooms. The warning is only needed
 * once there is meaningful work to protect (or a proposal would be discarded). */
export function getBuildControlHandoffConfirmation(
  draft: BuildDraft,
  hasPendingProposal = false,
): BuildControlHandoffConfirmation | null {
  const hasExistingWork = draft.facilities.length > 0
    || draft.repairIds.length > 0
    || Boolean(draft.rehearsal)
    || Boolean(draft.teamPlanApproved)
    || hasPendingProposal;
  if (!hasExistingWork) return null;
  if (draft.mode === 'HANDS') {
    return {
      title: 'Hand this layout to the team?',
      body: 'Your current rooms stay in place until you approve a replacement. A new team proposal can replace this layout.',
      confirmLabel: 'Hand to team',
    };
  }
  return {
    title: 'Take control of this team plan?',
    body: 'The approved rooms stay in place and become editable. Future changes will be yours to manage.',
    confirmLabel: 'Take control',
  };
}

export function StageSites({ data, draft, patch, totals, services, handlers, teamProposal: proposal, setTeamProposal }: StageProps) {
  const [chosen, setChosen] = useState(draft.facilities.length > 0 || Boolean(draft.teamPlanApproved));
  const [regionId, setRegionId] = useState(data.regions[0]?.id);
  const [countryId, setCountryId] = useState<string | undefined>(undefined);
  const [cityId, setCityId] = useState<string | undefined>(undefined);
  const [reviewing, setReviewing] = useState(Boolean(proposal));
  const [planning, setPlanning] = useState(false);
  const [planningFailure, setPlanningFailure] = useState<BuildPlanningFailure | null>(null);
  const [openInfo, setOpenInfo] = useState<BuildMetricInfo | null>(null);
  const [leaseFeedback, setLeaseFeedback] = useState('');
  const [handoffConfirmation, setHandoffConfirmation] = useState<BuildControlHandoffConfirmation | null>(null);
  const handoffTriggerRef = useRef<HTMLButtonElement>(null);
  const handoffConfirmRef = useRef<HTMLButtonElement>(null);

  const red = REDUNDANCY_COPY[totals.redundancy];

  const lease = (listing: FacilityListing) => {
    const planned = draft.facilities.filter((facility) => facility.listingId === listing.id).length + 1;
    patch({ facilities: [...draft.facilities, facilityFromListing(listing, draft.facilities.length === 0)] });
    setLeaseFeedback(`${listing.name} added · ${planned} ${planned === 1 ? 'room' : 'rooms'} now planned in ${data.cities.find(candidate => candidate.id === listing.cityId)?.name ?? 'this city'}.`);
  };

  const drop = (facility: Facility) => {
    const listing = data.listings.find((candidate) => candidate.id === facility.listingId);
    const remaining = Math.max(0, draft.facilities.filter((candidate) => candidate.listingId === facility.listingId).length - 1);
    patch({ facilities: draft.facilities.filter((f) => f.id !== facility.id) });
    setLeaseFeedback(remaining === 0
      ? `${listing?.name ?? 'Room'} removed · no rooms remain planned.`
      : `${listing?.name ?? 'Room'} removed · ${remaining} ${remaining === 1 ? 'room remains' : 'rooms remain'} planned.`);
  };

  const updateInstructions = (instructions: typeof draft.instructions) => {
    setTeamProposal(null);
    setPlanningFailure(null);
    setReviewing(false);
    patch({ instructions, teamPlanApproved: false, teamPlanClass: undefined });
  };

  const prepareTeamPlan = () => {
    const result = createBuildTeamProposal(data, { ...draft, mode: 'ASSISTED', teamPlanApproved: false });
    if (result.ok === false) {
      setPlanningFailure(result);
      setTeamProposal(null);
      setReviewing(false);
      return;
    }
    setPlanningFailure(null);
    setTeamProposal(result.proposal);
    setReviewing(false);
    setPlanning(true);
  };

  const finishPlanning = useCallback(() => {
    setPlanning(false);
    setReviewing(true);
  }, []);

  const applyControlHandoff = useCallback(() => {
    setTeamProposal(null);
    setReviewing(false);
    setPlanningFailure(null);
    setHandoffConfirmation(null);
    patch({
      mode: draft.mode === 'ASSISTED' ? 'HANDS' : 'ASSISTED',
      teamPlanApproved: false,
      teamPlanClass: undefined,
    });
  }, [draft.mode, patch, setTeamProposal]);

  const closeHandoffConfirmation = useCallback(() => {
    setHandoffConfirmation(null);
    requestAnimationFrame(() => handoffTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!handoffConfirmation) return undefined;
    handoffConfirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeHandoffConfirmation();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeHandoffConfirmation, handoffConfirmation]);

  /* --- the first question ---------------------------------------------- */
  if (!chosen) {
    return (
      <section className="bw-gate2">
        <p className="sf-eyebrow">Before anything else</p>
        <h2>Who builds this network?</h2>

        <button
          type="button"
          className="bw-gate2-card"
          onClick={() => { patch({ mode: 'ASSISTED', teamPlanApproved: false }); setChosen(true); }}
        >
          <span className="bw-gate2-art" aria-hidden="true">
            <i /><i /><i />
          </span>
          <b>Let the team build it</b>
          <em>
            Engineering picks the cities, leases the rooms and sizes the racks
            against your opening markets. You set the instructions and approve
            the draft.
          </em>
          <s>Recommended if this is your first network</s>
        </button>

        <button
          type="button"
          className="bw-gate2-card is-hands"
          onClick={() => { patch({ mode: 'HANDS', teamPlanApproved: false }); setChosen(true); }}
        >
          <span className="bw-gate2-art is-hands" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </span>
          <b>I will place it myself</b>
          <em>
            Region by region, country by country, city by city. You choose every
            room, every contract and what each rack is for.
          </em>
          <s>Slower, and every decision is yours</s>
        </button>

        <p className="lw-rule">
          Either way nothing is charged. You can hand it back to the team, or
          take it off them, at any point before commissioning.
        </p>
      </section>
    );
  }

  const region = data.regions.find((r) => r.id === regionId);
  const countries = regionId ? countriesIn(data, regionId) : [];
  const country = data.countries.find((c) => c.id === countryId);
  const cities = countryId ? citiesIn(data, countryId) : [];
  const city = data.cities.find((c) => c.id === cityId);
  const listings = data.listings.filter((l) => l.cityId === cityId);
  const leasedHere = draft.facilities.filter((f) => f.cityId === cityId);
  const leasedGroups = groupFacilityLeases(data, leasedHere);

  const pinsFor = (target: string) => citiesIn(data, target).map((c) => ({
    id: c.id,
    x: c.plot.x,
    y: c.plot.y,
    longitude: c.coord.lng,
    latitude: c.coord.lat,
    state: draft.facilities.some((f) => f.cityId === c.id)
      ? ('built' as const)
      : c.recommended ? ('picked' as const) : ('idle' as const),
  }));

  return (
    <>
      {planning && proposal && <TeamPlanningCinematic data={data} proposal={proposal} onComplete={finishPlanning} />}
      {handoffConfirmation && <div className="bw-confirm-backdrop">
        <section className="bw-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="bw-control-handoff-title" aria-describedby="bw-control-handoff-body">
          <p className="sf-eyebrow">Build control</p>
          <h2 id="bw-control-handoff-title">{handoffConfirmation.title}</h2>
          <p id="bw-control-handoff-body">{handoffConfirmation.body}</p>
          <div className="lw-actions">
            <button type="button" className="sf-btn sf-btn--ghost" onClick={closeHandoffConfirmation}>Keep current control</button>
            <button ref={handoffConfirmRef} type="button" className="sf-btn sf-btn--primary" onClick={applyControlHandoff}>{handoffConfirmation.confirmLabel}</button>
          </div>
        </section>
      </div>}
      {/* Picking on the map walks the list down to the same place, so the two
          controls are never telling the player different things. */}
      <WorldMap
        data={data}
        draft={draft}
        services={services}
        selectedRegionId={regionId}
        selectedCountryId={countryId}
        selectedCityId={cityId}
        onSelectRegion={(id) => {
          setLeaseFeedback('');
          setRegionId(id);
          setCountryId(undefined);
          setCityId(undefined);
        }}
        onSelectCountry={(id) => {
          setLeaseFeedback('');
          const picked = data.countries.find((candidate) => candidate.id === id);
          if (picked) setRegionId(picked.regionId);
          setCountryId(id);
          setCityId(undefined);
        }}
        onSelectCity={(id) => {
          setLeaseFeedback('');
          const picked = data.cities.find((c) => c.id === id);
          const ctry = picked && data.countries.find((k) => k.id === picked.countryId);
          if (ctry) { setRegionId(ctry.regionId); setCountryId(ctry.id); }
          setCityId(id);
        }}
        showNetworkRoutes
      />
      <p className="wm-hint">
        <b>{region?.name ?? 'World network'}</b>
        <span>· Tap the map to scout · connected sites carry a live route</span>
      </p>

      <div className="bw-summary">
        <span><em>Sites</em><b>{totals.cities}</b></span>
        <span><em>Machines</em><b>{totals.racks}</b></span>
        <span><em>Build</em><b>{money(totals.buildCost)}</b></span>
        <span><em>Time</em><b>{totals.weeks}<s>wk</s></b></span>
      </div>
      <p className={`bw-red sf-tone-${red.tone}`}>{red.label} — {red.line}</p>

      {/* --- who is drawing it ------------------------------------------- */}
      <div className="bw-whobar">
        <span>{draft.mode === 'ASSISTED'
          ? draft.teamPlanApproved ? 'Team plan approved'
            : reviewing && proposal ? 'Team proposal ready'
              : 'The team is waiting for your brief'
          : 'You are placing this network'}</span>
        <button
          ref={handoffTriggerRef}
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            const confirmation = getBuildControlHandoffConfirmation(draft, Boolean(proposal));
            if (confirmation) setHandoffConfirmation(confirmation);
            else applyControlHandoff();
          }}
        >
          {draft.mode === 'ASSISTED' ? 'Take over' : 'Hand it back'}
        </button>
      </div>

      {draft.mode === 'ASSISTED' ? (
        <>
          <section className="bw-brief">
            <p className="sf-eyebrow">Team brief</p>
            {data.hasExplicitOpeningMarkets === false && (
              <div className="bw-plan-error" role="alert">
                <b>Opening markets have not been chosen</b>
                <p>Your team cannot size viewer demand until the Day-One footprint is confirmed.</p>
                <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onOpenDefine?.('MARKETS')}>
                  Choose opening markets
                </button>
              </div>
            )}
            <Choice
              label="Priority"
              value={draft.instructions.priority}
              options={[['CASH', 'Save cash'], ['BALANCED', 'Balanced'], ['ONLINE', 'Stay online'], ['PREMIUM', 'Premium']]}
              onPick={(v) => updateInstructions({ ...draft.instructions, priority: v as never })}
            />
            <Choice
              label="Risk"
              value={draft.instructions.risk}
              options={[['CAREFUL', 'Careful'], ['NORMAL', 'Normal'], ['FAST', 'Fast']]}
              onPick={(v) => updateInstructions({ ...draft.instructions, risk: v as never })}
            />
            <div className="bw-brief-row"><span>Ask me before anything over</span><b>{money(draft.instructions.askAbove)}</b></div>
            <div className="bw-budget-head">
              <span><b>Build allocation</b><em>An authorization ceiling. Nothing is spent here.</em></span>
              <b>{money(draft.instructions.maxBudget)}</b>
            </div>
            <label className="bw-budget-custom">
              <span>Custom allocation</span>
              <span className="bw-budget-input"><i>$</i><input type="number" min="0" step="100000" value={draft.instructions.maxBudget} onChange={event => updateInstructions({ ...draft.instructions, maxBudget: Math.max(0, Number(event.target.value) || 0) })} /></span>
            </label>

            {draft.teamPlanApproved ? (
              <div className="bw-team-state is-approved" role="status">
                <i>✓</i>
                <span>
                  <em>Team plan approved</em>
                  <b>{draft.teamPlanClass || 'Approved'} · {totals.cities} {totals.cities === 1 ? 'site' : 'sites'} · {totals.racks} racks</b>
                </span>
              </div>
            ) : !reviewing && (
              <div className="bw-team-state is-empty">
                <i aria-hidden="true" />
                <span>
                  <em>Engineering has not drawn a network yet</em>
                  <b>Set the brief and allocation, then ask the team to prepare it.</b>
                </span>
              </div>
            )}

            {planningFailure && (
              <div className="bw-plan-error" role="alert">
                <b>{planningFailure.message}</b>
                {planningFailure.minimumBudget !== undefined && <p>Minimum credible allocation: {money(planningFailure.minimumBudget)}</p>}
                <ul>{planningFailure.alternatives.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
            )}

            {reviewing && proposal && (
              <section className="bw-team-proposal is-ready" aria-label="Engineering proposal">
                <header className="bw-team-proposal-head">
                  <span><i aria-hidden="true" /><em>Proposal ready</em><small>Engineering proposal</small></span>
                  <strong><small>Quoted build</small>{money(proposal.networkBudget)}</strong>
                </header>

                <div className="bw-team-proposal-name">
                  <b>{proposal.networkClass}</b>
                  <span>network</span>
                </div>

                <div className="bw-team-proposal-summary" aria-label="Proposal summary">
                  <span><strong>{proposal.rackDistribution.reduce((sum, count) => sum + count, 0)}</strong><em>racks</em></span>
                  <span><strong>{proposal.cityIds.length}</strong><em>{proposal.cityIds.length === 1 ? 'site' : 'sites'}</em></span>
                  <span><strong>{proposal.buildWeeks}</strong><em>weeks</em></span>
                </div>

                <div className="bw-team-proposal-route">
                  <em>Opening route</em>
                  <div aria-hidden="true">
                    {proposal.cityIds.map((id, index) => <i key={id} style={{ ['--i' as string]: index }} />)}
                  </div>
                  <p>{proposal.cityIds.map(id => data.cities.find(city => city.id === id)?.name || id).join(' · ')}</p>
                </div>

                <section className="bw-team-proposal-profile" aria-label="Operating profile">
                  <h3>Operating profile</h3>
                  <dl>
                    <div><dt>Expected load</dt><dd>{compactCount(proposal.likelyDemand)}</dd></div>
                    <div><dt>Peak load</dt><dd>{compactCount(proposal.highDemand)}</dd></div>
                    <div><dt>Service capacity</dt><dd>{compactCount(proposal.steadyCapacity + proposal.burstCapacity)}</dd></div>
                    <div><dt>Weekly operation</dt><dd>{money(proposal.weeklyOperatingCost)}</dd></div>
                  </dl>
                  <p>
                    <span>Launch reserve <b>{money(proposal.reserveCost)}</b></span>
                    <span>Allocation left <b>{money(proposal.unusedAllocation)}</b></span>
                    <span>Treasury after <b>{money(proposal.projectedTreasury)}</b></span>
                  </p>
                </section>

                {proposal.capacityBoundary && <section className="bw-capacity-boundary" role="status" aria-label={proposal.capacityBoundary.label}>
                  <header>
                    <span><em>Footprint fully covered</em><b>{proposal.capacityBoundary.label}</b></span>
                    <strong>{money(proposal.unusedAllocation)}<small>unallocated</small></strong>
                  </header>
                  <div className="bw-capacity-boundary-stats">
                    <span><b>{proposal.capacityBoundary.openingMarketCount}</b><small>opening {proposal.capacityBoundary.openingMarketCount === 1 ? 'market' : 'markets'}</small></span>
                    <span><b>{proposal.capacityBoundary.eligibleCityCount}</b><small>eligible {proposal.capacityBoundary.eligibleCityCount === 1 ? 'city' : 'cities'}</small></span>
                    <span><b>{proposal.capacityBoundary.rackCeiling}</b><small>rack ceiling</small></span>
                  </div>
                  <p>Every currently eligible assisted-plan rack in {proposal.capacityBoundary.regionNames.join(' + ')} is included in this proposal. {money(proposal.unusedAllocation)} remains unallocated rather than being spent without an authorized market.</p>
                  {proposal.capacityBoundary.researchLockedFacilityCount > 0 && <p className="bw-capacity-research">{proposal.capacityBoundary.researchLockedFacilityCount} owned-campus {proposal.capacityBoundary.researchLockedFacilityCount === 1 ? 'option needs' : 'options need'} infrastructure research.</p>}
                  {proposal.capacityBoundary.expansionRegionCount > 0 && <button type="button" className="sf-btn sf-btn--ghost" onClick={() => handlers.onOpenDefine?.('MARKETS')}>Expand opening markets</button>}
                </section>}

                <div className="bw-team-reasons">
                  <em>Why this plan</em>
                  <ul>{proposal.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                </div>
                {proposal.warnings.map(warning => <p className="bw-team-warning" key={warning}>{warning}</p>)}
                <div className="lw-actions">
                  <button type="button" className="sf-btn sf-btn--ghost" onClick={() => { setReviewing(false); setTeamProposal(null); }}>Change brief</button>
                  <button type="button" className="sf-btn sf-btn--primary" onClick={() => {
                    patch({ ...proposal.draft, teamPlanApproved: true, teamPlanClass: proposal.networkClass });
                    setReviewing(false);
                    setTeamProposal(null);
                  }}>Approve plan</button>
                </div>
                <p className="lw-rule">Approval applies the drawing only. Treasury moves only when you commission.</p>
              </section>
            )}

            {!reviewing && !draft.teamPlanApproved && (
              <div className="lw-actions bw-team-prepare-action">
                <button
                  type="button"
                  className="sf-btn sf-btn--primary"
                  disabled={data.hasExplicitOpeningMarkets === false || planning}
                  onClick={prepareTeamPlan}
                >
                  Ask the team to prepare a plan
                </button>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* --- country ------------------------------------------------------ */}
          {!countryId && (
            <ul className="bw-countrygrid">
              {countries.map((c) => {
                const inCountry = citiesIn(data, c.id);
                const leased = draft.facilities.filter((f) => inCountry.some((x) => x.id === f.cityId)).length;
                return (
                  <li key={c.id}>
                    <button type="button" className={leased > 0 ? 'bw-countrycard is-on' : 'bw-countrycard'} onClick={() => { setLeaseFeedback(''); setCountryId(c.id); }}>
                      <CountryShape
                        shape={c.shape}
                        countryCode={c.code}
                        countryName={c.name}
                        pins={pinsFor(c.id)}
                        active={c.opening}
                        height={78}
                      />
                      <span className="bw-countrycard-body">
                        <b>{c.name}{c.opening && <i>opening market</i>}</b>
                        <em>{inCountry.length} {inCountry.length === 1 ? 'city' : 'cities'}{leased > 0 ? ` · ${leased} leased` : ''}</em>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* --- cities inside it ---------------------------------------------- */}
          {country && (
            <section className="bw-country">
              <header className="bw-country-head">
                <button type="button" className="bw-back" onClick={() => { setLeaseFeedback(''); setCountryId(undefined); setCityId(undefined); }}>‹ All of {region?.name}</button>
                <h3>{country.name}</h3>
                <p>{country.note}</p>
              </header>

              <div className="bw-countrymap">
                <CountryShape
                  shape={country.shape}
                  countryCode={country.code}
                  countryName={country.name}
                  pins={pinsFor(country.id)}
                  active={country.opening}
                  height={168}
                  onPin={(id) => { setLeaseFeedback(''); setCityId(id); }}
                />
              </div>

              <div className="bw-cities">
                {cities.map((c) => {
                  const leased = draft.facilities.filter((f) => f.cityId === c.id);
                  return (
                    <button key={c.id} type="button" className={c.id === cityId ? 'bw-city is-on' : 'bw-city'} onClick={() => { setLeaseFeedback(''); setCityId(c.id); }}>
                      <CityScene seed={c.name} active={leased.length > 0} height={44} />
                      <span className="bw-city-name">{c.name}</span>
                      <span className="bw-city-meta">
                        {leased.length > 0 ? `${leased.reduce((s, f) => s + facilityRacks(f), 0)} racks` : c.recommended ? 'Suggested' : 'Free'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* --- the rooms in that city ------------------------------------------ */}
          {city && (
            <section className="bw-market">
              <div className="bw-market-head">
                <CityScene seed={city.name} active={leasedHere.length > 0} height={104} />
                <div className="bw-market-title">
                  <h3>{city.name}</h3>
                  <p>{city.note}</p>
                </div>
              </div>

              {leasedHere.length > 0 && (
                <section className="bw-city-plan" aria-label={`${city.name} planned facilities`}>
                  <header>
                    <span>
                      <em>City plan</em>
                      <b>{leasedHere.length} {leasedHere.length === 1 ? 'room' : 'rooms'} · {leasedHere.reduce((sum, facility) => sum + facilityRacks(facility), 0)} racks</b>
                    </span>
                    <strong>PLANNED</strong>
                  </header>
                  <ul className="bw-leased">
                    {leasedGroups.map((group) => {
                      const listing = group.listing;
                      const kind = listing ? facilityVisualKind(listing) : 'campus';
                      return (
                        <li key={group.listingId} className="bw-lease-stack">
                          <div className="bw-lease-stack-head">
                            <FacilityMark kind={kind} />
                            <span>
                              <b>{listing?.name ?? 'Facility'}</b>
                              <em>{listing?.provider ?? 'Facility provider'}</em>
                            </span>
                            <strong><b>×{group.count}</b><em>planned</em></strong>
                          </div>
                          <div className="bw-lease-stack-facts">
                            <span><em>Rooms</em><b>{group.count}</b></span>
                            <span><em>Racks</em><b>{group.racks}</b></span>
                            <span><em>Weekly</em><b>{money(group.weeklyRent)}</b></span>
                          </div>
                          <div className="bw-lease-stack-actions">
                            <button type="button" className="bw-stack-remove" onClick={() => drop(group.facilities[group.facilities.length - 1])}>− Remove one</button>
                            {listing && <button type="button" className="bw-stack-add" onClick={() => lease(listing)}>+ Add another</button>}
                          </div>
                          <details className="bw-lease-units">
                            <summary>View {group.count} individual {group.count === 1 ? 'room' : 'rooms'}</summary>
                            <ol>
                              {group.facilities.map((facility) => (
                                <li key={facility.id}>
                                  <span>
                                    <b>{facilityRoomLabel(data, draft.facilities, facility)}</b>
                                    <em>{facilityRacks(facility)} {facilityRacks(facility) === 1 ? 'rack' : 'racks'}</em>
                                  </span>
                                  <button type="button" className="bw-drop" onClick={() => drop(facility)} aria-label={`Remove ${facilityRoomLabel(data, draft.facilities, facility)}`}>Remove</button>
                                </li>
                              ))}
                            </ol>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {leaseFeedback && <p className="bw-lease-feedback" role="status" aria-live="polite">✓ {leaseFeedback}</p>}

              <ul className="bw-listings">
                {listings.map((listing) => {
                  const availability = AVAILABILITY[listing.availability];
                  const plannedCount = draft.facilities.filter((facility) => facility.listingId === listing.id).length;
                  return (
                    <li key={listing.id} className={`bw-listing${listing.availability === 'RESEARCH' ? ' is-research' : ''}`}>
                      <header>
                        <div>
                          <b>{listing.name}</b>
                          <em>{listing.provider}</em>
                        </div>
                        {listing.availability === 'RESEARCH'
                          ? <span className="bw-research-badge">Research required</span>
                          : <Tag tone={availability.tone}>{availability.label}</Tag>}
                      </header>

                      <FacilityIdentity listing={listing} />

                      <p className="bw-listing-line">{listing.description}</p>

                      {/* Eight numbers, eight small pictures. */}
                      <SpecMeters listing={listing} onExplain={setOpenInfo} />

                      <p className="bw-listing-note">{listing.note}</p>

                      <button
                        type="button"
                        className="sf-btn sf-btn--primary"
                        disabled={listing.availability === 'RESEARCH'}
                        onClick={() => lease(listing)}
                      >
                        {listing.availability === 'RESEARCH'
                          ? 'Locked · Research required'
                          : plannedCount > 0
                            ? `Add another · ${plannedCount} planned`
                            : `Plan this room · ${money(listing.moveIn)} to move in`}
                      </button>
                    </li>
                  );
                })}
                {listings.length === 0 && <li className="bw-contract-empty">No rooms for lease in {city.name} yet.</li>}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="lw-rule">
        Nothing here is charged. Leases, racks and repairs stay a drawing until
        you commission the build in the last stage.
      </p>

      <BuildMetricSheet info={openInfo} onClose={() => setOpenInfo(null)} />
    </>
  );
}

function Choice({ label, value, options, onPick }: {
  label: string; value: string; options: Array<[string, string]>; onPick: (value: string) => void;
}) {
  return (
    <div className="bw-choice">
      <em>{label}</em>
      <div className="pr-chips">
        {options.map(([id, name]) => (
          <button key={id} type="button" className={value === id ? 'pr-chip is-on' : 'pr-chip'} onClick={() => onPick(id)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
