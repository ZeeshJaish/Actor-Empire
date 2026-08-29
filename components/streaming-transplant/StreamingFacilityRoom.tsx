/**
 * EMPIRE+ — THE FACILITY ROOM
 *
 * Physical infrastructure used to be eight abstract cells — capacity floor,
 * backup power, energy/week, water/week, physical ops, sustainability, public
 * reputation, visible constraints — stacked above a repair list that named
 * facilities the player could not see. All of it true, none of it legible: you
 * had to read seven numbers to learn the one fact that matters, which is
 * "cooling is the thing holding this site back".
 *
 * So the room draws itself instead.
 *
 *   · cabinets on a floor — filled for installed racks, ghosted for the
 *     positions the lease still has room for
 *   · four supply gauges, and the ONE that is setting the ceiling is marked,
 *     because a bottleneck is a single fact, not a table
 *   · the limiting subsystem is highlighted in the drawing itself: the cooling
 *     duct, the power rail, the fibre run or the empty floor
 *   · the fix is attached to the thing that is broken, not filed elsewhere
 *
 * It renders; it never derives. Every number arrives already computed by
 * getStreamingFacilityPhysicalView() via derive().
 */
import React from 'react';
import css from './presentation/screens/Buildout/Buildout.module.css';
import { cx } from './presentation/cx';
import type { StreamingFacilityRepairAction } from '../../services/streamingInfrastructurePhysical';
import type { HallView } from './StreamingBuildoutExperience';

type Supply = 'POWER' | 'COOLING' | 'BANDWIDTH' | 'RACK_SPACE';

const SUPPLY_LABEL: Record<Supply, string> = {
  POWER: 'Power',
  COOLING: 'Cooling',
  BANDWIDTH: 'Fibre',
  RACK_SPACE: 'Floor space',
};

/** What the player is actually being told when a given supply runs out. */
const SUPPLY_CONSEQUENCE: Record<Supply, string> = {
  POWER: 'The contract cannot feed every machine at once.',
  COOLING: 'Heat builds faster than the room can shed it.',
  BANDWIDTH: 'The fibre run cannot carry a full house.',
  RACK_SPACE: 'The lease has no floor left to stand a machine on.',
};

const pct = (used: number, capacity: number) => (
  capacity > 0 ? Math.min(200, Math.round((used / capacity) * 100)) : 0
);

/** Load colour. A supply over its contract is not "nearly full", it is broken. */
const loadTone = (value: number) => (value >= 100 ? 'bad' : value >= 85 ? 'warn' : 'good');

const money = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};

/** Which repair addresses which supply, so the fix can sit on the fault. */
const REPAIR_FOR: Record<Supply, StreamingFacilityRepairAction> = {
  POWER: 'UPGRADE_POWER',
  COOLING: 'IMPROVE_COOLING',
  BANDWIDTH: 'ADD_BANDWIDTH',
  RACK_SPACE: 'UPGRADE_POWER', // no lease-expansion repair exists; space is solved by leasing
};

export const StreamingFacilityRoom: React.FC<{
  hall: HallView;
  /** how many of this room's racks are actually standing, not just drawn */
  builtRacks: number;
  /** true when the team may action a repair without the player opening it */
  assisted: boolean;
  approvalThreshold: number | null;
  onRepair: (action: StreamingFacilityRepairAction) => void;
  onLease: () => void;
}> = ({ hall, builtRacks, assisted, approvalThreshold, onRepair, onLease }) => {
  const p = hall.physical;

  const supplies: Array<{ id: Supply; used: number; capacity: number; unit: string; load: number }> = [
    { id: 'POWER', used: p.powerUsedKw, capacity: p.state.powerContractKw, unit: 'kW',
      load: pct(p.powerUsedKw, p.state.powerContractKw) },
    { id: 'COOLING', used: p.coolingUsedKw, capacity: p.state.coolingCapacityKw, unit: 'kW',
      load: pct(p.coolingUsedKw, p.state.coolingCapacityKw) },
    { id: 'BANDWIDTH', used: p.bandwidthUsedMbps, capacity: p.state.bandwidthMbps, unit: 'Mbps',
      load: pct(p.bandwidthUsedMbps, p.state.bandwidthMbps) },
    { id: 'RACK_SPACE', used: p.rackSpaceUsed, capacity: p.rackSpaceUsed + p.rackSpaceAvailable, unit: 'racks',
      load: pct(p.rackSpaceUsed, p.rackSpaceUsed + p.rackSpaceAvailable) },
  ];

  const limiting = p.limitingFactor !== 'NONE' && p.limitingFactor !== 'MAINTENANCE'
    ? p.limitingFactor as Supply
    : null;
  const wornOut = p.limitingFactor === 'MAINTENANCE';

  /* Cabinets: one per installed rack, then ghosts for the free positions the
     lease already pays for. Capped so a 40-rack hall stays a drawing. */
  const totalSlots = Math.min(18, Math.max(hall.racks, 1) + Math.min(6, hall.freeRacks));
  const cabinets = Array.from({ length: totalSlots }, (_, i) => ({
    i,
    standing: i < builtRacks,
    drawn: i >= builtRacks && i < hall.racks,
  }));
  /* Layout in viewBox units: the cabinets always span the room. */
  const MARGIN = 10;
  const slotWidth = (200 - MARGIN * 2) / totalSlots;
  const cabWidth = Math.min(16, slotWidth * 0.74);

  const repair = limiting ? p.repairActions.find(a => a.id === REPAIR_FOR[limiting]) : null;
  const maintenanceRepair = wornOut ? p.repairActions.find(a => a.id === 'REPLACE_EQUIPMENT') : null;
  const action = maintenanceRepair ?? repair ?? null;
  const needsApproval = action !== null
    && approvalThreshold !== null
    && action.cost >= approvalThreshold;

  return (
    <article className={cx(css.physRoom, limiting || wornOut ? css.strained : '')}>

      <header className={css.roomHead}>
        <div>
          <span>{hall.city.label}</span>
          <b>{hall.campusLabel}</b>
        </div>
        <em className={cx(
          p.usableCapacityFactor < 70 ? css.bad : p.usableCapacityFactor < 90 ? css.warn : css.good,
        )}>{Math.round(p.usableCapacityFactor)}% USABLE</em>
      </header>

      {/* ── the room ── */}
      <div className={css.roomStage}>
        <svg viewBox="0 0 200 92" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <linearGradient id={`floor-${hall.facilityId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,.07)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* back wall grid — depth without detail */}
          <g opacity=".5">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="62"
                stroke="rgba(255,255,255,.05)" strokeWidth=".6" />
            ))}
          </g>

          {/* the overhead cooling duct: it darkens and flows as heat builds */}
          <g className={cx(css.duct, limiting === 'COOLING' ? css.faulted : '')}>
            <rect x="0" y="4" width="200" height="9" rx="2" />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} className={cx(css.ductVent, 'loop')} x={12 + i * 27} y="13" width="13" height="3" rx="1.5"
                style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </g>

          {/* the power rail down the left wall */}
          <g className={cx(css.rail, limiting === 'POWER' ? css.faulted : '')}>
            <rect x="0" y="16" width="5" height="46" rx="2" />
          </g>

          {/* the floor */}
          <rect x="0" y="62" width="200" height="30" fill={`url(#floor-${hall.facilityId})`} />
          <line x1="0" y1="62" x2="200" y2="62" stroke="rgba(255,255,255,.12)" strokeWidth=".8" />

          {/* cabinets */}
          <g>
            {cabinets.map(cab => {
              /* Cabinets divide the room rather than marching in from the left,
                 so a two-rack cage and an eighteen-rack hall both read as a
                 full room — the difference is cabinet width, which is the
                 honest visual for "how much machine is in here". */
              const x = MARGIN + cab.i * slotWidth + (slotWidth - cabWidth) / 2;
              return (
                <g key={cab.i} className={cx(
                  css.cab,
                  cab.standing ? css.standing : cab.drawn ? css.drawn : css.ghost,
                )} style={{ animationDelay: `${cab.i * 0.05}s` }}>
                  <rect x={x} y="24" width={cabWidth} height="38" rx="1.4" />
                  {cab.standing && Array.from({ length: 5 }, (_, r) => (
                    <rect key={r} className={cx(css.cabLed, 'loop')}
                      x={x + cabWidth * 0.18} y={28 + r * 6.8}
                      width={cabWidth * 0.64} height="1.8" rx=".9"
                      style={{ animationDelay: `${((cab.i * 3 + r) % 7) * 0.28}s` }} />
                  ))}
                </g>
              );
            })}
          </g>

          {/* the fibre run along the floor */}
          <g className={cx(css.fibre, limiting === 'BANDWIDTH' ? css.faulted : '')}>
            <line x1="4" y1="70" x2="196" y2="70" />
            <circle className={cx(css.fibrePulse, 'loop')} cy="70" r="1.6">
              <animate attributeName="cx" from="4" to="196" dur="3.1s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>

        {(limiting || wornOut) && (
          <span className={css.roomFlag}>
            {wornOut ? 'EQUIPMENT WORN' : `${SUPPLY_LABEL[limiting!].toUpperCase()} IS THE CEILING`}
          </span>
        )}
      </div>

      {/* ── the four supplies ── */}
      <div className={css.gauges}>
        {supplies.map(supply => {
          const isLimit = limiting === supply.id;
          const tone = loadTone(supply.load);
          return (
            <div key={supply.id} className={cx(css.gauge, isLimit ? css.limit : '')}>
              <div className={css.gaugeTop}>
                <span>{SUPPLY_LABEL[supply.id]}</span>
                <em className={css[tone]}>{supply.load}%</em>
              </div>
              <div className={css.gaugeTrack}>
                <i className={css[tone]} style={{ width: `${Math.min(100, supply.load)}%` }} />
                {supply.load > 100 && <b className={css.gaugeOver} />}
              </div>
              <small>{Math.round(supply.used).toLocaleString()} / {Math.round(supply.capacity).toLocaleString()} {supply.unit}</small>
            </div>
          );
        })}
      </div>

      {/* ── one sentence, then the fix ── */}
      <p className={css.roomRead}>
        {wornOut
          ? `Condition has fallen to ${Math.round(p.state.maintenanceConditionPercent)}%. Worn equipment drops capacity wherever it sits.`
          : limiting
            ? `${SUPPLY_CONSEQUENCE[limiting]} It is holding this room at ${Math.round(p.usableCapacityFactor)}% of the racks you have drawn.`
            : `Power, cooling, fibre and floor all clear this drawing. Burst headroom is ${Math.round(p.burstCapacityFactor * 100)}%.`}
      </p>

      <div className={css.roomActions}>
        {action ? (
          <button type="button" className={css.roomFix} onClick={() => onRepair(action.id)}>
            <b>{needsApproval ? `APPROVE · ${action.label}` : action.label}</b>
            <span>{money(action.cost)} · added to the drawing, not the treasury</span>
          </button>
        ) : null}
        {(limiting === 'RACK_SPACE' || hall.freeRacks === 0) && (
          <button type="button" className={css.roomLease} onClick={onLease}>
            <b>LEASE ANOTHER CAGE</b>
            <span>Add hard rack space in {hall.city.label}</span>
          </button>
        )}
      </div>

      {!assisted && (
        <small className={css.roomNote}>
          Hands-on: repairs are yours to schedule. Costs land at commissioning.
        </small>
      )}
    </article>
  );
};
