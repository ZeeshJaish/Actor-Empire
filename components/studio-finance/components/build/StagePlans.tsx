/* ============================================================================
   2 · Plans — can the rooms actually run the racks you have drawn?

   A rack on a drawing is free. A rack that needs power the room does not have,
   or cooling it cannot carry, is a lie the rehearsal will find. So every
   facility shows its floor, its supply rails, and the one thing that is its
   ceiling — and the repair for that ceiling sits next to it.
   ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BuildData, Duty, Facility } from '../../finance/build';
import type { Limiting } from '../../finance/build';
import {
  ARCHITECTURES, ARCH_SHARE, DUTIES, LIMITING_COPY, SUPPLY_COPY,
  architectureFor, copyCityTemplateToNetwork, facilityRacks, facilityRoomLabel, fitRackGroupsToLimit, limitingFactor, listingFor, usableCapacity,
} from '../../finance/build';
import type { StageProps } from './BuildWizard';
import { compactCount, money, pct } from '../../finance/format';
import { RackWall, DUTY_TINT } from './RackWall';
import { ResourceMetric } from './ResourceMetric';
import { BuildMetricSheet, type BuildMetricInfo } from './BuildMetricSheet';
import { Sheet } from '../ui';

interface CityPlan {
  id: string;
  name: string;
  facilities: Facility[];
  racks: number;
  capacity: number;
  weeklyCost: number;
  attention: number;
}

export function roomCapacityFeedback(used: number, limit: number): {
  canAdd: boolean;
  message: string | null;
} {
  if (used < limit) return { canAdd: true, message: null };
  return {
    canAdd: false,
    message: `Room full — ${used} of ${limit} rack positions used. Remove a rack or lease another room in Sites.`,
  };
}

function cityPlansFor(data: BuildData, facilities: Facility[]): CityPlan[] {
  const plans = new Map<string, CityPlan>();
  facilities.forEach(facility => {
    const listing = listingFor(data, facility);
    const city = data.cities.find(candidate => candidate.id === facility.cityId);
    const current = plans.get(facility.cityId) ?? {
      id: facility.cityId,
      name: city?.name ?? 'Unknown city',
      facilities: [],
      racks: 0,
      capacity: 0,
      weeklyCost: 0,
      attention: 0,
    };
    current.facilities.push(facility);
    current.racks += facilityRacks(facility);
    current.capacity += facility.groups.reduce((sum, group) => sum + group.capacity, 0);
    current.weeklyCost += facility.opCost + (listing?.weeklyRent ?? 0);
    if (limitingFactor(data, facility) !== 'NONE') current.attention += 1;
    plans.set(facility.cityId, current);
  });
  return Array.from(plans.values()).sort((left, right) => (
    right.attention - left.attention || left.name.localeCompare(right.name)
  ));
}

export function StagePlans({ data, draft, patch, totals }: StageProps) {
  const [dutyFor, setDutyFor] = useState<{ facilityId: string; groupId: string } | null>(null);
  const [openInfo, setOpenInfo] = useState<BuildMetricInfo | null>(null);
  const facilities = useMemo(
    () => data.canonical?.facilities?.(draft) ?? draft.facilities,
    [data, draft],
  );
  const cityPlans = useMemo(() => cityPlansFor(data, facilities), [data, facilities]);
  const firstAttentionCity = cityPlans.find(city => city.attention > 0) ?? cityPlans[0];
  const firstAttentionRoom = firstAttentionCity?.facilities.find(facility => limitingFactor(data, facility) !== 'NONE')
    ?? firstAttentionCity?.facilities[0];
  const [cityFilter, setCityFilter] = useState<'ALL' | 'ATTENTION'>('ALL');
  const [activeCityId, setActiveCityId] = useState(firstAttentionCity?.id ?? '');
  const [activeFacilityId, setActiveFacilityId] = useState(firstAttentionRoom?.id ?? '');
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyUndo, setCopyUndo] = useState<Facility[] | null>(null);
  const [capacityFeedback, setCapacityFeedback] = useState<{ facilityId: string; message: string } | null>(null);
  const capacityFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const attentionCityCount = cityPlans.filter(city => city.attention > 0).length;
  const visibleCities = cityFilter === 'ATTENTION'
    ? cityPlans.filter(city => city.attention > 0)
    : cityPlans;
  const activeCity = visibleCities.find(city => city.id === activeCityId) ?? visibleCities[0] ?? cityPlans[0];
  const activeFacility = activeCity?.facilities.find(facility => facility.id === activeFacilityId)
    ?? activeCity?.facilities.find(facility => limitingFactor(data, facility) !== 'NONE')
    ?? activeCity?.facilities[0];
  const copyResult = useMemo(
    () => activeCity ? copyCityTemplateToNetwork(data, draft, activeCity.id) : null,
    [activeCity?.id, data, draft],
  );
  const copyWarningRooms = useMemo(() => {
    if (!copyOpen || !copyResult) return 0;
    const previewDraft = { ...draft, facilities: copyResult.facilities };
    const previewFacilities = data.canonical?.facilities?.(previewDraft) ?? copyResult.facilities;
    return previewFacilities
      .filter(facility => facility.cityId !== activeCity?.id)
      .filter(facility => limitingFactor(data, facility) !== 'NONE')
      .length;
  }, [activeCity?.id, copyOpen, copyResult, data, draft]);

  useEffect(() => {
    if (!activeCity) return;
    if (activeCity.id !== activeCityId) setActiveCityId(activeCity.id);
    if (!activeCity.facilities.some(facility => facility.id === activeFacilityId)) {
      const next = activeCity.facilities.find(facility => limitingFactor(data, facility) !== 'NONE')
        ?? activeCity.facilities[0];
      setActiveFacilityId(next?.id ?? '');
    }
  }, [activeCity, activeCityId, activeFacilityId, data]);

  useEffect(() => {
    if (!activeCity) return;
    cityButtonRefs.current[activeCity.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeCity?.id, cityFilter]);

  useEffect(() => () => {
    if (capacityFeedbackTimer.current) clearTimeout(capacityFeedbackTimer.current);
  }, []);

  if (facilities.length === 0) {
    return <p className="lw-empty">No rooms leased yet. Go back and put something on the map.</p>;
  }

  const constrained = facilities.filter((f) => limitingFactor(data, f) !== 'NONE');
  const lowest = Math.min(...facilities.map((f) => usableCapacity(data, f)));
  const backup = Math.round(
    (facilities.reduce((sum, f) => sum + f.backupCoverage, 0) / facilities.length) * 100,
  );
  const share = draft.ownedShare ?? ARCH_SHARE[draft.architecture];
  const ownedPct = Math.round(share * 100);

  const editPatch = (next: Parameters<typeof patch>[0]) => {
    setCopyUndo(null);
    patch(next);
  };

  const writeFacility = (id: string, next: Partial<Facility>) =>
    editPatch({ facilities: draft.facilities.map((f) => (f.id === id ? { ...f, ...next } : f)) });

  const writeGroups = (facility: Facility, groups: Facility['groups']) => {
    const rackLimit = listingFor(data, facility)?.rackPositions ?? Number.POSITIVE_INFINITY;
    const requested = groups.reduce((sum, group) => sum + Math.max(0, group.racks), 0);
    const safeGroups = requested > rackLimit ? fitRackGroupsToLimit(groups, rackLimit) : groups;
    const withCapacity = safeGroups.map(group => ({
      ...group,
      capacity: group.racks * (group.duty === 'ORIGIN' ? 140_000 : group.duty === 'REGIONAL' ? 130_000 : 120_000),
    }));
    if (data.canonical?.facilities) {
      writeFacility(facility.id, { groups: withCapacity });
      return;
    }
    const racks = withCapacity.reduce((sum, group) => sum + group.racks, 0);
    writeFacility(facility.id, {
      groups: withCapacity,
      power: { ...facility.power, used: racks * 12 },
      cooling: { ...facility.cooling, used: racks * 11 },
      bandwidth: { ...facility.bandwidth, used: racks * 40 },
      energyPerWeek: racks * 14,
      waterPerWeek: racks * 26,
    });
  };

  const showRoomCapacityFeedback = (facility: Facility, rackLimit: number) => {
    const feedback = roomCapacityFeedback(facilityRacks(facility), rackLimit);
    if (!feedback.message) return false;
    setCapacityFeedback({ facilityId: facility.id, message: feedback.message });
    if (capacityFeedbackTimer.current) clearTimeout(capacityFeedbackTimer.current);
    capacityFeedbackTimer.current = setTimeout(() => setCapacityFeedback(null), 3000);
    return true;
  };

  const changeRacks = (facility: Facility, groupId: string, delta: number) => {
    const rackLimit = listingFor(data, facility)?.rackPositions ?? Number.POSITIVE_INFINITY;
    if (delta > 0 && showRoomCapacityFeedback(facility, rackLimit)) return;
    if (delta < 0 && capacityFeedback?.facilityId === facility.id) setCapacityFeedback(null);
    const groups = facility.groups.map((g) => {
      if (g.id !== groupId) return g;
      const racks = Math.max(0, g.racks + delta);
      return { ...g, racks };
    }).filter((g) => g.racks > 0 || g.duty === 'ORIGIN');
    writeGroups(facility, groups);
  };

  const addGroup = (facility: Facility, duty: Duty) => {
    const rackLimit = listingFor(data, facility)?.rackPositions ?? Number.POSITIVE_INFINITY;
    if (showRoomCapacityFeedback(facility, rackLimit)) return;
    writeGroups(facility, [...facility.groups, {
        id: `g-${facility.id}-${duty}-${Date.now()}`,
        name: DUTIES[duty].name,
        duty,
        racks: 1,
        capacity: 120_000,
      }]);
  };

  const setDuty = (facility: Facility, groupId: string, duty: Duty) => {
    writeGroups(facility, facility.groups.map((g) => (
      g.id === groupId ? { ...g, duty, name: DUTIES[duty].name } : g
    )));
    setDutyFor(null);
  };

  const toggleRepair = (id: string) =>
    editPatch({ repairIds: draft.repairIds.includes(id) ? draft.repairIds.filter((r) => r !== id) : [...draft.repairIds, id] });

  return (
    <>
      <section className={constrained.length === 0 ? 'bw-verdict is-good' : 'bw-verdict is-warn'}>
        <b>
          {constrained.length === 0
            ? 'Every room can run every rack you have drawn.'
            : `${constrained.length} of ${facilities.length} rooms are not ready to run as drawn.`}
        </b>
        {/* Three sentences, not three metrics. "Lowest usable capacity" is a
            phrase from an engineering report, not something a player should
            have to decode. */}
        <ul className="bw-plainstats">
          <li>
            <i className={lowest >= 1 ? 'is-good' : 'is-warn'} aria-hidden="true" />
            {lowest >= 1
              ? constrained.length === 0
                ? 'Every rack you have drawn can actually be switched on.'
                : 'Power, cooling and fibre can feed the racks; the highlighted rooms have another constraint.'
              : `The tightest room can only run ${pct(lowest * 100, 0)} of the racks drawn in it.`}
          </li>
          <li>
            <i className={backup >= 90 ? 'is-good' : backup >= 60 ? 'is-warn' : 'is-bad'} aria-hidden="true" />
            {`If the mains fail, ${backup}% of these machines keep running on the generators.`}
          </li>
          <li>
            <i className="is-good" aria-hidden="true" />
            {`Together they can carry ${compactCount(totals.capacity)} people watching at once.`}
          </li>
        </ul>
      </section>

      <section className="bw-network-roster" aria-label="Network rooms">
        <header className="bw-roster-head">
          <div>
            <p className="sf-eyebrow">Network rooms</p>
            <b>{cityPlans.length} {cityPlans.length === 1 ? 'city' : 'cities'} · {facilities.length} rooms</b>
          </div>
          <div className="bw-roster-filters" aria-label="Filter cities">
            <button type="button" className={cityFilter === 'ALL' ? 'is-on' : ''} onClick={() => setCityFilter('ALL')}>All</button>
            <button
              type="button"
              className={cityFilter === 'ATTENTION' ? 'is-on is-warn' : ''}
              disabled={attentionCityCount === 0}
              onClick={() => {
                const first = cityPlans.find(city => city.attention > 0);
                setCityFilter('ATTENTION');
                if (first) {
                  setActiveCityId(first.id);
                  setActiveFacilityId(first.facilities.find(facility => limitingFactor(data, facility) !== 'NONE')?.id ?? first.facilities[0]?.id ?? '');
                }
              }}
            >
              Needs attention {attentionCityCount > 0 && <i>{attentionCityCount}</i>}
            </button>
          </div>
        </header>

        <div className="bw-city-strip" aria-label="Cities in this network">
          {visibleCities.map(city => (
            <button
              ref={element => { cityButtonRefs.current[city.id] = element; }}
              key={city.id}
              type="button"
              data-city-plan={city.id}
              className={`bw-city-plan${activeCity?.id === city.id ? ' is-on' : ''}${city.attention > 0 ? ' is-warn' : ''}`}
              aria-pressed={activeCity?.id === city.id}
              aria-label={`Open ${city.name}, ${city.facilities.length} rooms, ${city.attention} needs attention`}
              onClick={() => {
                setActiveCityId(city.id);
                setActiveFacilityId(city.facilities.find(facility => limitingFactor(data, facility) !== 'NONE')?.id ?? city.facilities[0]?.id ?? '');
              }}
            >
              <span className="bw-city-plan-top">
                <b>{city.name}</b>
                <i className={city.attention > 0 ? 'is-warn' : 'is-good'}>{city.attention > 0 ? city.attention : '✓'}</i>
              </span>
              <span>{city.facilities.length} {city.facilities.length === 1 ? 'room' : 'rooms'} · {city.racks} racks</span>
              <span>{compactCount(city.capacity)} streams · {money(city.weeklyCost)}/wk</span>
            </button>
          ))}
        </div>

        {activeCity && (
          <div className="bw-city-workspace">
            <div className="bw-city-workspace-head">
              <span><em>Working city</em><b>{activeCity.name}</b></span>
              <div className="bw-city-workspace-actions">
                <span className={activeCity.attention > 0 ? 'is-warn' : 'is-good'}>
                  {activeCity.attention > 0
                    ? `${activeCity.attention} ${activeCity.attention === 1 ? 'room needs' : 'rooms need'} attention`
                    : 'All rooms ready'}
                </span>
                <button
                  type="button"
                  className="bw-copy-city"
                  disabled={!copyResult || copyResult.affectedRooms === 0}
                  onClick={() => setCopyOpen(true)}
                >
                  Copy setup to all cities
                </button>
                {copyUndo && (
                  <button
                    type="button"
                    className="bw-copy-undo"
                    onClick={() => {
                      patch({ facilities: copyUndo });
                      setCopyUndo(null);
                    }}
                  >
                    Undo copy
                  </button>
                )}
              </div>
            </div>
            <div className="bw-room-strip" aria-label={`Rooms in ${activeCity.name}`}>
              {activeCity.facilities.map((facility, index) => {
                const listing = listingFor(data, facility);
                const limiting = limitingFactor(data, facility);
                return (
                  <button
                    key={facility.id}
                    type="button"
                    data-room-picker={facility.id}
                    className={`bw-room-picker${activeFacility?.id === facility.id ? ' is-on' : ''}${limiting !== 'NONE' ? ' is-warn' : ''}`}
                    aria-pressed={activeFacility?.id === facility.id}
                    onClick={() => setActiveFacilityId(facility.id)}
                  >
                    <span><i className={limiting === 'NONE' ? 'is-good' : 'is-warn'} />Room {String(index + 1).padStart(2, '0')}</span>
                    <b>{facilityRacks(facility)}<small>/{listing?.rackPositions ?? 0} racks</small></b>
                    <em>{limiting === 'NONE' ? 'Ready' : SUPPLY_COPY[limiting as Exclude<Limiting, 'NONE'>]?.name ?? 'Attention'}</em>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {activeFacility && (() => {
        const facility = activeFacility;
        const editableFacility = draft.facilities.find(candidate => candidate.id === facility.id) ?? facility;
        const listing = listingFor(data, facility);
        const limiting = limitingFactor(data, facility);
        const rackLimit = listing?.rackPositions ?? facilityRacks(facility);
        const roomFull = facilityRacks(facility) === rackLimit;
        const repairs = data.repairs.filter((r) => r.facilityId === facility.listingId);

        return (
          <section key={facility.id} className="bw-room" data-room-workbench={facility.id}>
            <header className="bw-room-head">
              <div>
                <b>{facilityRoomLabel(data, facilities, facility)}</b>
                <em>{listing?.name} · {listing?.provider}</em>
              </div>
              <span className={`bw-room-count${capacityFeedback?.facilityId === facility.id ? ' is-limit-hit' : ''}`}>{facilityRacks(facility)}<s>/{listing?.rackPositions ?? 0}</s></span>
            </header>

            {/* Which machines you own and which you are renting — the
                architecture choice, made visible in the room it applies to. */}
            <p className="bw-own">
              <span className="bw-own-key is-owned" aria-hidden="true" />
              {Math.round(facilityRacks(facility) * share)} owned
              <span className="bw-own-key is-rented" aria-hidden="true" />
              {facilityRacks(facility) - Math.round(facilityRacks(facility) * share)} rented
              <s>{ARCHITECTURES[architectureFor(share)].name}</s>
            </p>

            <RackWall
              facility={facility}
              listing={listing}
              limiting={limiting}
              load={facility.power.used / Math.max(1, facility.power.contracted)}
              owned={Math.round(facilityRacks(facility) * share)}
            />

            <p className={limiting === 'NONE' ? `bw-limit is-ok${roomFull ? ' is-full' : ''}` : 'bw-limit'}>
              {limiting === 'NONE' && roomFull
                ? `Room full · ${facilityRacks(facility)} of ${rackLimit} rack positions assigned`
                : LIMITING_COPY[limiting]}
            </p>

            {capacityFeedback?.facilityId === facility.id && (
              <p className="bw-capacity-feedback" role="status" aria-live="polite">
                {capacityFeedback.message}
              </p>
            )}

            {/* The repair that fixes the actual ceiling comes first and alone.
                Everything else about the room is one tap away — a room has
                fourteen numbers and a player needs one of them. */}
            {limiting !== 'NONE' && repairs.filter((r) => r.fixes === limiting).map((repair) => {
              const on = draft.repairIds.includes(repair.id);
              return (
                <button key={repair.id} type="button" className={on ? 'bw-fix is-on' : 'bw-fix'} onClick={() => toggleRepair(repair.id)}>
                  <span className={`bw-fix-tile is-${SUPPLY_COPY[repair.fixes as Exclude<typeof repair.fixes, 'NONE'>]?.tone ?? 'space'}`} aria-hidden="true">
                    <FixIcon fixes={repair.fixes} />
                  </span>
                  <span className="bw-fix-body">
                    <span className="bw-fix-top">
                      <b>{repair.label}</b>
                      <span className="st-model-switch" aria-hidden="true"><i /></span>
                    </span>
                    <span className="bw-fix-copy">{repair.what}</span>
                    <span className="bw-fix-chips">
                      <i>{money(repair.cost)}</i>
                      <i>{repair.weeks} weeks</i>
                      <i className="is-key">clears this room's ceiling</i>
                    </span>
                  </span>
                </button>
              );
            })}

            <details className="bw-roomdetail">
              <summary>Everything about this room</summary>
              <div className="bw-roomstats">
                <span><em>Reliability</em><b>{(facility.uptime * 100).toFixed(2)}%</b></span>
                <span><em>Condition</em><b>{pct(facility.condition * 100, 0)}</b></span>
                <span><em>Backup</em><b>{facility.backup}</b></span>
                <span><em>Backup covers</em><b>{pct(facility.backupCoverage * 100, 0)}</b></span>
                <ResourceMetric resource="energy" label="Energy a week" value={facility.energyPerWeek} unit="MWh" compact onExplain={() => setOpenInfo({
                  title: 'Weekly energy use', value: `${facility.energyPerWeek} MWh`,
                  summary: 'The electricity these machines consume during a normal operating week.',
                  impact: 'Energy use contributes to operating cost and the network’s sustainability score.',
                  guidance: 'Reduce rack load, choose more efficient facilities, or improve the power setup.',
                })} />
                <ResourceMetric resource="water" label="Water a week" value={facility.waterPerWeek} unit="m³" compact onExplain={() => setOpenInfo({
                  title: 'Weekly water use', value: `${facility.waterPerWeek} m³`,
                  summary: 'The water used by this facility’s cooling systems in a normal week.',
                  impact: 'Higher water use can reduce sustainability and make the site more expensive to operate.',
                  guidance: 'Use efficient cooling or move future capacity to facilities with a better resource profile.',
                })} />
                <span><em>Running a week</em><b>{money(facility.opCost)}</b></span>
                <span><em>Free slots</em><b>{Math.max(0, (listing?.rackPositions ?? 0) - facilityRacks(facility))}</b></span>
              </div>

              {repairs.filter((r) => r.fixes !== limiting).length > 0 && (
                <ul className="bw-repairs">
                  {repairs.filter((r) => r.fixes !== limiting).map((repair) => {
                    const on = draft.repairIds.includes(repair.id);
                    return (
                      <li key={repair.id}>
                        <button type="button" className={on ? 'bw-repair is-on' : 'bw-repair'} onClick={() => toggleRepair(repair.id)}>
                          <span className={`bw-fix-tile is-${SUPPLY_COPY[repair.fixes as Exclude<typeof repair.fixes, 'NONE'>]?.tone ?? 'space'}`} aria-hidden="true">
                            <FixIcon fixes={repair.fixes} />
                          </span>
                          <span className="bw-fix-body">
                            <span className="bw-fix-top">
                              <b>{repair.label}</b>
                              <span className="st-model-switch" aria-hidden="true"><i /></span>
                            </span>
                            <span className="bw-fix-copy">{repair.what}</span>
                            <span className="bw-fix-chips">
                              <i>{money(repair.cost)}</i>
                              <i>{repair.weeks} weeks</i>
                              <i className="is-quiet">headroom, not the ceiling</i>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </details>

            {/* --- the floor, group by group --------------------------------- */}
            <ul className="bw-groups">
              {facility.groups.map((group) => (
                <li key={group.id}>
                  <span className="bw-group-tint" style={{ background: DUTY_TINT[group.duty] }} aria-hidden="true" />
                  <span className="bw-group-body">
                    <b>{DUTIES[group.duty].name}<i>{DUTIES[group.duty].tech}</i></b>
                    <em>{DUTIES[group.duty].shortLine}</em>
                    <s>{compactCount(group.capacity)} streams</s>
                  </span>
                  <span className="bw-group-racks">
                    <button type="button" className="st-step" onClick={() => changeRacks(editableFacility, group.id, -1)} aria-label="Remove a rack">−</button>
                    <b>{group.racks}</b>
                    <button
                      type="button"
                      className={`st-step${roomFull ? ' is-capacity-locked' : ''}`}
                      aria-disabled={roomFull}
                      onClick={() => changeRacks(editableFacility, group.id, 1)}
                      aria-label="Add a rack"
                    >+</button>
                  </span>
                  <button type="button" className="bw-group-duty" onClick={() => setDutyFor({ facilityId: facility.id, groupId: group.id })}>
                    Duty
                  </button>
                </li>
              ))}
            </ul>

            <div className="bw-addgroup">
              {(['EDGE', 'REGIONAL', 'ENCODE', 'SERVICES', 'LIVE'] as Duty[])
                .filter((duty) => !facility.groups.some((g) => g.duty === duty))
                .map((duty) => (
                  <button
                    key={duty}
                    type="button"
                    className={`pr-chip${roomFull ? ' is-capacity-locked' : ''}`}
                    aria-disabled={roomFull}
                    onClick={() => addGroup(editableFacility, duty)}
                  >
                    + {DUTIES[duty].name}
                  </button>
                ))}
            </div>

          </section>
        );
      })()}

      {/* --- two choices, three ways each ------------------------------------
          These were six tall cards. They are two rows now: pick one, read one
          line about what it costs you. */}
      {/* --- own it or rent it, and how much of each --------------------------
          The three names are presets on one dial. "Hybrid" was a word the
          player had to accept; now it is a mix they set. */}
      <section className="lw-block">
        <div className="bw-section-title">
          <p className="sf-eyebrow lw-block-head">Own it or rent it</p>
          <InfoButton label="About ownership mix" onClick={() => setOpenInfo({
            title: 'Ownership mix', value: `${ownedPct}% owned`,
            summary: 'This decides how many machines you buy and how many you rent from infrastructure partners.',
            impact: 'Owning costs more now but less each week. Renting opens faster and supplies surge capacity, but keeps a larger weekly bill.',
            guidance: 'Move the slider and compare the live build cost, weekly cost, timing, and surge capacity below.',
          })} />
        </div>
        <div className="bw-tri">
          {(Object.keys(ARCHITECTURES) as Array<keyof typeof ARCHITECTURES>).map((id) => (
            <button
              key={id}
              type="button"
              className={architectureFor(share) === id ? 'bw-tri-btn is-on' : 'bw-tri-btn'}
              onClick={() => editPatch({ architecture: id, ownedShare: ARCH_SHARE[id] })}
            >
              {ARCHITECTURES[id].name}
            </button>
          ))}
        </div>

        <div className="bw-mix">
          <div className="bw-mix-bar" role="img" aria-label={`${ownedPct}% owned, ${100 - ownedPct}% rented`}>
            <i className="is-owned" style={{ width: `${ownedPct}%` }} />
            <i className="is-rented" style={{ width: `${100 - ownedPct}%` }} />
          </div>
          <input
            className="sf-slider bw-mix-slider"
            type="range"
            min={0}
            max={100}
            step={5}
            value={ownedPct}
            onChange={(e) => {
              const next = Number(e.target.value) / 100;
              editPatch({ ownedShare: next, architecture: architectureFor(next) });
            }}
            aria-label="How much of the fleet you own"
          />
          <div className="bw-mix-keys">
            <span><i className="is-owned" />{ownedPct}% owned · {Math.round(totals.racks * share)} racks</span>
            <span><i className="is-rented" />{100 - ownedPct}% rented · {totals.racks - Math.round(totals.racks * share)} racks</span>
          </div>
        </div>

        <div className="bw-decision-facts" aria-label="Ownership consequences">
          <span><em>Upfront</em><b>{money(totals.buildCost)} build cost</b></span>
          <span><em>Every week</em><b>{money(totals.weeklyCost)} running cost</b></span>
          <span><em>Timeline</em><b>{totals.weeks} weeks to build</b></span>
          <span><em>Traffic buffer</em><b>{compactCount(totals.burst)} temporary capacity</b></span>
        </div>
      </section>

      {/* --- what the estate costs to keep -------------------------------------- */}
      <section className="bw-estate">
        <p className="sf-eyebrow">Every week, once it is running</p>
        <div className="cr-tiles">
          <ResourceMetric resource="money" label="Running cost" value={money(totals.weeklyCost)} unit="/wk" onExplain={() => setOpenInfo({
            title: 'Weekly running cost', value: `${money(totals.weeklyCost)}/week`,
            summary: 'The recurring facility, rental, and operating bill after this network is commissioned.',
            impact: 'This amount leaves the platform treasury every week whether viewing is high or low.',
            guidance: 'Choose cheaper sites, own more machines, or reduce the planned rack count.',
          })} />
          <ResourceMetric resource="energy" label="Energy" value={totals.energy} unit="MWh" onExplain={() => setOpenInfo({
            title: 'Network energy use', value: `${totals.energy} MWh/week`,
            summary: 'The electricity consumed by every facility in this proposed network.',
            impact: 'It contributes to weekly operating pressure and sustainability performance.',
            guidance: 'Use fewer racks or favour efficient facilities when energy use becomes too high.',
          })} />
          <ResourceMetric resource="water" label="Water" value={totals.water} unit="m³" onExplain={() => setOpenInfo({
            title: 'Network water use', value: `${totals.water} m³/week`,
            summary: 'The cooling water consumed across the complete proposed network.',
            impact: 'Water-intensive cooling can lower sustainability and increase operating pressure.',
            guidance: 'Prefer facilities with efficient cooling and avoid unnecessary rack capacity.',
          })} />
          <ResourceMetric resource="network" label="Traffic buffer" value={compactCount(totals.burst)} onExplain={() => setOpenInfo({
            title: 'Traffic buffer', value: compactCount(totals.burst),
            summary: 'Temporary extra streaming capacity available above the network’s steady limit.',
            impact: 'It absorbs sudden premiere traffic. With no surge capacity, excess viewers may buffer or lose access.',
            guidance: 'Rent part of the fleet or add capacity in another facility before a major opening.',
            status: totals.burst > 0 ? 'good' : 'warn',
          })} />
        </div>
        <div className="bw-scores">
          <Score label="Sustainability" value={totals.sustainability} />
          <Score label="Public reputation" value={totals.reputation} />
        </div>
      </section>

      <Sheet
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        eyebrow="City template"
        title={`Copy ${activeCity?.name ?? 'this city'} setup?`}
        footer={(
          <div className="sf-sheet-actions">
            <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setCopyOpen(false)}>Cancel</button>
            <button
              type="button"
              className="sf-btn sf-btn--primary"
              disabled={!copyResult || copyResult.affectedRooms === 0}
              onClick={() => {
                if (!copyResult) return;
                setCopyUndo(draft.facilities);
                patch({ facilities: copyResult.facilities });
                setCopyOpen(false);
              }}
            >
              Copy setup
            </button>
          </div>
        )}
      >
        <p className="bw-copy-explain">
          Rack duties and quantities will be repeated across rooms already leased in the other cities.
          Providers, leases, prices, repairs and physical room limits stay local.
        </p>
        {copyResult && (
          <div className="bw-copy-preview" aria-label="Copy setup preview">
            <span><em>Cities</em><b>{copyResult.destinationCities}</b></span>
            <span><em>Rooms</em><b>{copyResult.affectedRooms}</b></span>
            <span><em>Racks placed</em><b>{copyResult.copiedRacks}</b></span>
            <span><em>Scaled rooms</em><b>{copyResult.reducedRooms}</b></span>
          </div>
        )}
        {copyResult && copyResult.reducedRooms > 0 && (
          <p className="bw-copy-notice is-warn">
            {copyResult.reducedRooms} {copyResult.reducedRooms === 1 ? 'room is' : 'rooms are'} smaller than the source template.
            The duty mix will be preserved while {copyResult.requestedRacks - copyResult.copiedRacks} excess racks are left out.
          </p>
        )}
        <p className={copyWarningRooms > 0 ? 'bw-copy-notice is-warn' : 'bw-copy-notice is-good'}>
          {copyWarningRooms > 0
            ? `${copyWarningRooms} destination ${copyWarningRooms === 1 ? 'room still needs' : 'rooms still need'} attention after the copy.`
            : 'Every destination room is expected to remain ready after the copy.'}
        </p>
      </Sheet>

      <BuildMetricSheet info={openInfo} onClose={() => setOpenInfo(null)} />

      <Sheet
        open={dutyFor !== null}
        onClose={() => setDutyFor(null)}
        eyebrow="Rack duty"
        title="What these machines do"
      >
        <ul className="bw-duties">
          {(Object.keys(DUTIES) as Duty[]).map((duty) => (
            <li key={duty}>
              <button
                type="button"
                className="bw-duty"
                disabled={DUTIES[duty].locked}
                onClick={() => {
                  const facility = draft.facilities.find((f) => f.id === dutyFor?.facilityId);
                  if (facility && dutyFor) setDuty(facility, dutyFor.groupId, duty);
                }}
              >
                <span className="bw-group-tint" style={{ background: DUTY_TINT[duty] }} aria-hidden="true" />
                <span>
                  <b>{DUTIES[duty].name}{DUTIES[duty].locked && <i> · needs research</i>}</b>
                  <em>{DUTIES[duty].line}</em>
                  <s>{DUTIES[duty].tech}</s>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="lw-rule">The network must always keep at least one content origin — it is where the masters live.</p>
      </Sheet>
    </>
  );
}

function InfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="bw-info-btn" aria-label={label} onClick={onClick}>i</button>;
}

/* One glyph per supply, so a repair is recognisable before it is read. */
function FixIcon({ fixes }: { fixes: Limiting }) {
  const paths: Record<string, React.ReactElement> = {
    POWER: <path d="M13 2L5 13h5l-1 9 8-11h-5z" />,
    COOLING: <><path d="M12 3v18M5 7l14 10M19 7L5 17" /></>,
    BANDWIDTH: <><path d="M4 18a16 16 0 0116 0" /><path d="M8 15a10 10 0 018 0" /><circle cx="12" cy="19.5" r="1.4" /></>,
    RACK: <><rect x="4" y="4" width="16" height="7" rx="1.5" /><rect x="4" y="13" width="16" height="7" rx="1.5" /></>,
    CONDITION: <><path d="M14.5 5.5a4 4 0 00-5.6 5.6l-4.2 4.2a1.6 1.6 0 002.3 2.3l4.2-4.2a4 4 0 005.6-5.6l-2.4 2.4-2.2-2.2z" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill={fixes === 'POWER' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[fixes] ?? paths.RACK}
    </svg>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const tone = value >= 70 ? 'good' : value >= 45 ? 'warn' : 'bad';
  return (
    <div className="bw-score">
      <em>{label}</em>
      <span className="rw-bar"><i className={`is-${tone}`} style={{ width: `${value}%` }} /></span>
      <s>{value}</s>
    </div>
  );
}
