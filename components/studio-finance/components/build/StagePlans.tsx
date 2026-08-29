/* ============================================================================
   2 · Plans — can the rooms actually run the racks you have drawn?

   A rack on a drawing is free. A rack that needs power the room does not have,
   or cooling it cannot carry, is a lie the rehearsal will find. So every
   facility shows its floor, its supply rails, and the one thing that is its
   ceiling — and the repair for that ceiling sits next to it.
   ========================================================================== */

import React, { useState } from 'react';
import type { Duty, Facility } from '../../finance/build';
import type { Limiting } from '../../finance/build';
import {
  ARCHITECTURES, ARCH_SHARE, DOCTRINES, DUTIES, LIMITING_COPY, SUPPLY_COPY,
  architectureFor, cityFor, facilityRacks, limitingFactor, listingFor, usableCapacity,
} from '../../finance/build';
import type { StageProps } from './BuildWizard';
import { compactCount, money, pct } from '../../finance/format';
import { RackWall, DUTY_TINT } from './RackWall';
import { Sheet } from '../ui';

export function StagePlans({ data, draft, patch, totals }: StageProps) {
  const [dutyFor, setDutyFor] = useState<{ facilityId: string; groupId: string } | null>(null);

  if (draft.facilities.length === 0) {
    return <p className="lw-empty">No rooms leased yet. Go back and put something on the map.</p>;
  }

  const constrained = draft.facilities.filter((f) => limitingFactor(data, f) !== 'NONE');
  const lowest = Math.min(...draft.facilities.map((f) => usableCapacity(data, f)));
  const backup = Math.round(
    (draft.facilities.reduce((sum, f) => sum + f.backupCoverage, 0) / draft.facilities.length) * 100,
  );
  const share = draft.ownedShare ?? ARCH_SHARE[draft.architecture];
  const ownedPct = Math.round(share * 100);

  const writeFacility = (id: string, next: Partial<Facility>) =>
    patch({ facilities: draft.facilities.map((f) => (f.id === id ? { ...f, ...next } : f)) });

  const changeRacks = (facility: Facility, groupId: string, delta: number) => {
    const groups = facility.groups.map((g) => {
      if (g.id !== groupId) return g;
      const racks = Math.max(0, g.racks + delta);
      return { ...g, racks, capacity: racks * (g.duty === 'ORIGIN' ? 140_000 : g.duty === 'REGIONAL' ? 130_000 : 120_000) };
    }).filter((g) => g.racks > 0 || g.duty === 'ORIGIN');

    const racks = groups.reduce((sum, g) => sum + g.racks, 0);
    writeFacility(facility.id, {
      groups,
      power: { ...facility.power, used: racks * 12 },
      cooling: { ...facility.cooling, used: racks * 11 },
      bandwidth: { ...facility.bandwidth, used: racks * 40 },
      energyPerWeek: racks * 14,
      waterPerWeek: racks * 26,
    });
  };

  const addGroup = (facility: Facility, duty: Duty) => {
    writeFacility(facility.id, {
      groups: [...facility.groups, {
        id: `g-${facility.id}-${duty}-${Date.now()}`,
        name: DUTIES[duty].name,
        duty,
        racks: 1,
        capacity: 120_000,
      }],
    });
  };

  const setDuty = (facility: Facility, groupId: string, duty: Duty) => {
    writeFacility(facility.id, {
      groups: facility.groups.map((g) => (g.id === groupId ? { ...g, duty, name: DUTIES[duty].name } : g)),
    });
    setDutyFor(null);
  };

  const toggleRepair = (id: string) =>
    patch({ repairIds: draft.repairIds.includes(id) ? draft.repairIds.filter((r) => r !== id) : [...draft.repairIds, id] });

  return (
    <>
      <section className={constrained.length === 0 ? 'bw-verdict is-good' : 'bw-verdict is-warn'}>
        <b>
          {constrained.length === 0
            ? 'Every room can run every rack you have drawn.'
            : `${constrained.length} of ${draft.facilities.length} rooms cannot run every rack you have drawn.`}
        </b>
        {/* Three sentences, not three metrics. "Lowest usable capacity" is a
            phrase from an engineering report, not something a player should
            have to decode. */}
        <ul className="bw-plainstats">
          <li>
            <i className={lowest >= 1 ? 'is-good' : 'is-warn'} aria-hidden="true" />
            {lowest >= 1
              ? 'Every rack you have drawn can actually be switched on.'
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

      {draft.facilities.map((facility) => {
        const listing = listingFor(data, facility);
        const city = cityFor(data, facility);
        const limiting = limitingFactor(data, facility);
        const repairs = data.repairs.filter((r) => r.facilityId === facility.listingId);

        return (
          <section key={facility.id} className="bw-room">
            <header className="bw-room-head">
              <div>
                <b>{city?.name}</b>
                <em>{listing?.name} · {listing?.provider}</em>
              </div>
              <span className="bw-room-count">{facilityRacks(facility)}<s>/{listing?.rackPositions ?? 0}</s></span>
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

            <p className={limiting === 'NONE' ? 'bw-limit is-ok' : 'bw-limit'}>{LIMITING_COPY[limiting]}</p>

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
                    <s>{repair.what}</s>
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
                <span><em>Energy a week</em><b>{facility.energyPerWeek} MWh</b></span>
                <span><em>Water a week</em><b>{facility.waterPerWeek} m³</b></span>
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
                            <s>{repair.what}</s>
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
                    <em>{DUTIES[group.duty].line}</em>
                    <s>{compactCount(group.capacity)} streams</s>
                  </span>
                  <span className="bw-group-racks">
                    <button type="button" className="st-step" onClick={() => changeRacks(facility, group.id, -1)} aria-label="Remove a rack">−</button>
                    <b>{group.racks}</b>
                    <button type="button" className="st-step" onClick={() => changeRacks(facility, group.id, 1)} aria-label="Add a rack">+</button>
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
                  <button key={duty} type="button" className="pr-chip" onClick={() => addGroup(facility, duty)}>
                    + {DUTIES[duty].name}
                  </button>
                ))}
            </div>

          </section>
        );
      })}

      {/* --- two choices, three ways each ------------------------------------
          These were six tall cards. They are two rows now: pick one, read one
          line about what it costs you. */}
      {/* --- own it or rent it, and how much of each --------------------------
          The three names are presets on one dial. "Hybrid" was a word the
          player had to accept; now it is a mix they set. */}
      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">Own it or rent it</p>
        <div className="bw-tri">
          {(Object.keys(ARCHITECTURES) as Array<keyof typeof ARCHITECTURES>).map((id) => (
            <button
              key={id}
              type="button"
              className={architectureFor(share) === id ? 'bw-tri-btn is-on' : 'bw-tri-btn'}
              onClick={() => patch({ architecture: id, ownedShare: ARCH_SHARE[id] })}
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
              patch({ ownedShare: next, architecture: architectureFor(next) });
            }}
            aria-label="How much of the fleet you own"
          />
          <div className="bw-mix-keys">
            <span><i className="is-owned" />{ownedPct}% owned · {Math.round(totals.racks * share)} racks</span>
            <span><i className="is-rented" />{100 - ownedPct}% rented · {totals.racks - Math.round(totals.racks * share)} racks</span>
          </div>
        </div>

        <p className="bw-tri-line">
          {ownedPct >= 90
            ? 'Every machine is yours. Dearest to build, cheapest to keep, and nothing to fall back on when a night goes bigger than planned.'
            : ownedPct <= 30
              ? 'Almost everything is rented. Cheap to stand up, expensive every week, and you can borrow capacity on the night.'
              : `You own the core and rent the edge. ${money(totals.weeklyCost)} a week to keep, with ${compactCount(totals.burst)} of rented burst behind you.`}
        </p>
      </section>

      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">How hard you push the crews</p>
        <div className="bw-tri">
          {(Object.keys(DOCTRINES) as Array<keyof typeof DOCTRINES>).map((id) => (
            <button key={id} type="button" className={draft.doctrine === id ? 'bw-tri-btn is-on' : 'bw-tri-btn'} onClick={() => patch({ doctrine: id })}>
              {DOCTRINES[id].name}
            </button>
          ))}
        </div>
        <p className="bw-tri-line">{DOCTRINES[draft.doctrine].line}</p>
        <div className="lw-effects">{DOCTRINES[draft.doctrine].effects.map((e) => <i key={e}>{e}</i>)}</div>
      </section>

      {/* --- what the estate costs to keep -------------------------------------- */}
      <section className="bw-estate">
        <p className="sf-eyebrow">Every week, once it is running</p>
        <div className="cr-tiles">
          <span><em>Running cost</em><b>{money(totals.weeklyCost)}</b></span>
          <span><em>Energy</em><b>{totals.energy}<s>MWh</s></b></span>
          <span><em>Water</em><b>{totals.water}<s>m³</s></b></span>
          <span><em>Burst held</em><b>{compactCount(totals.burst)}</b></span>
        </div>
        <div className="bw-scores">
          <Score label="Sustainability" value={totals.sustainability} />
          <Score label="Public reputation" value={totals.reputation} />
        </div>
      </section>

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
