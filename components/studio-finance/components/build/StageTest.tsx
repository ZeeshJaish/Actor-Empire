/* ============================================================================
   3 · Test — what will opening night actually feel like?

   The stage before this one says what the network is. This one is the only
   place that finds out whether it is true, so the page is three things in the
   order you need them:

   · THE BOARD — the real-world thing a viewer meets when a service is in
     trouble is a status page: the banner, the row of little bars, the list of
     affected components. So opening night is drawn as your status page before
     it happens. One bar per market, ordered west to east — the way a premiere
     actually crosses the world — each coloured by the state the engine gives
     it, sweeping in as the night sweeps. Under the banner, the markets that
     will be affected and what would fix each one. Under those, capacity as the
     thing it actually is: every cabinet in the network standing in an aisle,
     the ones opening night lights up lit, owned faces solid and rented ones
     outlined, and the machines with no floor standing past the end.
   · WHAT HAPPENED — the evidence from the last run. The rehearsal returns the
     night country by country and room by room, and this page used to throw
     all of it away on one line of summary. It does not any more: the markets
     that failed, by how much, the rooms that ran hottest and what was holding
     each one back, and the way back to the network to change it.
   · THE RUN — the one action, last, right above the footer.

   The full-screen rehearsal this opens is Actor Empire's own and is not
   touched here. This page decides whether to enter it and reads what it left
   behind.
   ========================================================================== */

import { SCENARIOS, SERVICE_COPY, SUPPLY_COPY, countryServiceCoverageValid, rehearsalStale } from '../../finance/build';
import type { CountryService, Limiting, ServiceState } from '../../finance/build';
import { compactCount, pct } from '../../finance/format';
import { Bars, Figure, Verdict, type KitTone } from '../kit';
import type { StageProps } from './BuildWizard';

const whole = (value: number): string => String(Math.round(value));
const percent = (value: number): string => pct(value, 0);

/* --- the aisle --------------------------------------------------------------
   Every cabinet in the network, standing on a floor, and how many of them the
   night actually lights up. Owned faces are solid and rented ones outlined,
   which is how the room's own rack wall already draws the difference, so this
   is the same world seen from further back. */

const AISLE_MAX = 480;

/** How the aisle divides. The caption reads from this too, so it can never
    claim a rented machine the picture has not drawn — with two machines and a
    22% burst share there is no whole machine to call rented, and saying "some
    rented" over an aisle of two solid faces is a small lie. */
function aisleSplit(racks: number, own: number, carried: number) {
  const drawn = Math.min(AISLE_MAX, Math.max(1, Math.round(racks)));
  const owned = carried > 0 ? Math.round(drawn * (own / carried)) : drawn;
  return { drawn, owned, rented: drawn - owned };
}

function Aisle({ racks, peak, carried, own }: {
  racks: number;
  peak: number;
  carried: number;
  /** Steady capacity — the rest of what is carried is rented burst. */
  own: number;
}) {
  const { drawn, owned: ownedCabinets } = aisleSplit(racks, own, carried);
  const columns = drawn > 200 ? 32 : drawn > 80 ? 20 : drawn > 24 ? 12 : 8;
  const rows = Math.ceil(drawn / columns);
  const cell = 100 / columns;
  const cab = cell * 0.74;
  const cabHeight = cab * 1.5;
  const rowHeight = cabHeight * 1.32;

  /* The cabinets you own come first, so the lit block only reaches the rented
     ones when the night has asked for more than you own. */
  const load = carried > 0 ? peak / carried : 0;
  const lit = Math.max(0, Math.min(drawn, Math.round(drawn * Math.min(1, load))));
  const over = load > 1;
  /* Whoever is left when the aisle is full is standing outside it. */
  const stranded = over
    ? Math.min(columns * 2, Math.max(1, Math.round(drawn * (load - 1))))
    : 0;

  const at = (index: number) => ({
    x: (index % columns) * cell + (cell - cab) / 2,
    y: Math.floor(index / columns) * rowHeight,
  });
  const floor = rows * rowHeight;
  const strandedRows = stranded > 0 ? Math.ceil(stranded / columns) : 0;
  const height = floor + (stranded > 0 ? 6 + strandedRows * rowHeight : 0);

  return (
    <svg
      className={over ? 'bw-aisle is-over' : 'bw-aisle'}
      viewBox={`0 0 100 ${height.toFixed(2)}`}
      role="img"
      aria-label={`${racks} machines, ${Math.round(Math.min(1, load) * 100)}% of the network under load`}
    >
      {Array.from({ length: drawn }, (unused, index) => {
        const spot = at(index);
        const rented = index >= ownedCabinets;
        const on = index < lit;
        return (
          <g key={index} className={`bw-aisle-cab${on ? ' is-lit' : ''}${rented ? ' is-rented' : ''}`}>
            <rect x={spot.x} y={spot.y} width={cab} height={cabHeight} rx={cab * 0.18} />
            {/* The strip of drive lights down a live cabinet's face. */}
            {on && <rect className="bw-aisle-lamp" x={spot.x + cab * 0.22} y={spot.y + cabHeight * 0.18} width={cab * 0.56} height={cabHeight * 0.16} rx={cabHeight * 0.08} />}
          </g>
        );
      })}

      {stranded > 0 && (
        <>
          <line className="bw-aisle-edge" x1="0" y1={floor + 3} x2="100" y2={floor + 3} />
          {Array.from({ length: stranded }, (unused, index) => {
            const spot = at(index);
            return (
              <rect
                key={`over-${index}`}
                className="bw-aisle-stranded"
                x={spot.x}
                y={floor + 6 + spot.y}
                width={cab}
                height={cabHeight}
                rx={cab * 0.18}
              />
            );
          })}
        </>
      )}
    </svg>
  );
}

/* The kit's unit slot is a <s>, and this page's time is asserted not to use
   strike-through markup, so ms and % carry their own. */
function Measure({ value, unit }: { value: string; unit?: string }) {
  return <b className="kit-figure">{value}{unit && <small className="sf-unit">{unit}</small>}</b>;
}

/* A status page's own words. The engine's five states are these five
   severities — a market that buffers is degraded, one that cannot carry its
   peak is a partial outage — so the page can borrow the vocabulary without
   bending what it means. */
const STATUS_WORD: Record<ServiceState, string> = {
  READY: 'Operational',
  WATCH: 'Degraded performance',
  POOR: 'Partial outage',
  UNSTABLE: 'Major outage',
  NONE: 'No delivery path',
};

const VERDICT: Record<'HELD' | 'RENTED' | 'BROKE', { label: string; tone: KitTone }> = {
  HELD: { label: 'It held', tone: 'good' },
  RENTED: { label: 'Held by renting', tone: 'warn' },
  BROKE: { label: 'It broke', tone: 'bad' },
};

export function StageTest({ data, draft, totals, services, handlers, onJump }: StageProps) {
  const result = draft.rehearsal;
  const stale = rehearsalStale(data, draft);
  const expectedPeak = services.reduce((sum, service) => sum + service.peak, 0);
  const carried = totals.capacity + totals.burst;
  const clears = carried >= expectedPeak;
  const averageStartup = Math.round(
    services.reduce((sum, service) => sum + service.startupMs, 0) / Math.max(1, services.length),
  );
  const averageBuffering = services.reduce((sum, service) => sum + service.buffering, 0)
    / Math.max(1, services.length);
  /* The strip reads west to east, the way a premiere crosses the world — and
     the way the team's proposal lights its skylines. A market the game has no
     coordinate for keeps its place rather than being dropped. */
  const longitudeOf = (service: CountryService): number => (
    data.markets?.find((market) => market.id === service.marketId)?.coord.lng ?? 0
  );
  const strip = [...services].sort((left, right) => longitudeOf(left) - longitudeOf(right));
  const ready = services.filter((service) => service.state === 'READY').length;
  const affected = [...services]
    .filter((service) => service.state !== 'READY')
    .sort((left, right) => riskOrder(right.state) - riskOrder(left.state));
  const down = services.filter((service) => service.state === 'UNSTABLE' || service.state === 'NONE').length;
  const unavailable = services.filter((service) => !countryServiceCoverageValid(service)).length;
  /* Three signals, read off the same forecast the map is painted from.

     The board used to read six services, one per rack duty, and go red for
     the duty with no rooms. Since #99 nobody chooses a duty — every room
     expands into all six — so that reading could only ever fire by rounding,
     on a network too small to put a rack in each. What a player can act on
     is where the rooms are: how much of the night is inside any ring at all,
     how much of it is close enough for a smooth stream, and the markets that
     fall between the two. Capacity has its own block below. */
  const reachedOf = (service: CountryService) => service.reachedShare ?? (service.state === 'NONE' ? 0 : 1);
  const reached = expectedPeak > 0
    ? services.reduce((sum, service) => sum + service.peak * reachedOf(service), 0) / expectedPeak
    : 0;
  const served = expectedPeak > 0
    ? services.reduce((sum, service) => sum + service.coveredPeak, 0) / expectedPeak
    : 0;

  /* Machines are racks in buildings and compute rented from the cloud alike:
     an all-cloud network is a network, and it is tested like one (#106). */
  const machines = totals.racks + (totals.compute ?? 0);
  const banner: { label: string; tone: KitTone } = unavailable > 0
    ? { label: `Coverage unavailable in ${unavailable} ${unavailable === 1 ? 'market' : 'markets'}`, tone: 'bad' }
    : machines === 0
    ? { label: 'No service', tone: 'flat' }
    : down > 0
      ? { label: `Major outage expected in ${down} ${down === 1 ? 'market' : 'markets'}`, tone: 'bad' }
      : affected.length > 0
        ? { label: `Degraded performance in ${affected.length} ${affected.length === 1 ? 'market' : 'markets'}`, tone: 'warn' }
        : { label: 'All systems operational', tone: 'good' };

  const canRehearse = unavailable === 0 && machines > 0 && Boolean(handlers.onOpenRehearsal);
  const unavailableReason = unavailable > 0
    ? 'Coverage unavailable. Reopen Build and verify the network before running a rehearsal.'
    : machines === 0
    ? 'Add rooms and racks in the Network stage before running the rehearsal.'
    : !handlers.onOpenRehearsal
      ? 'The rehearsal service is unavailable. Return to the Streaming Hall and reopen Build.'
      : '';

  const loadPct = carried > 0 ? Math.round((expectedPeak / carried) * 100) : 0;
  const { rented } = aisleSplit(machines, totals.capacity, carried);
  const failedCountries = result
    ? [...result.countries].filter((country) => country.failedPct > 0).sort((left, right) => right.failedPct - left.failedPct)
    : [];
  const hotRooms = result
    ? [...result.rooms].sort((left, right) => right.load - left.load).slice(0, 3)
    : [];

  return (
    <>
      {/* --- the board -----------------------------------------------------
          Your status page for a night that has not happened yet. */}
      <section className="bw-paper" aria-label="Projected opening-night status">
        <p className="kit-title"><b>Opening night</b><em>projected</em></p>

        <p className={`bw-board-banner is-${banner.tone}`} role="status">
          <i className="bw-board-dot" aria-hidden="true" />
          {banner.label}
        </p>

        {/* The three signals under the banner: reached, served well, and the
            headroom on the night. The thin regions are the list below. */}
        {machines > 0 && (
          <div className="bw-paper-facts bw-board-signals" aria-label="Reached, served and headroom">
            <span>
              <Measure value={percent(reached * 100)} />
              <em>of the night reached</em>
            </span>
            <span>
              <Measure value={percent(served * 100)} />
              <em>served well</em>
            </span>
            <span>
              <Measure value={clears ? percent(carried > 0 ? ((carried - expectedPeak) / carried) * 100 : 0) : compactCount(expectedPeak - carried)} />
              <em>{clears ? 'headroom at peak' : 'short at peak'}</em>
            </span>
          </div>
        )}

        {strip.length > 0 && (
          <>
            {/* One bar per market, west to east, the way the night crosses the
                world — and the way the proposal's skylines light up. */}
            {/* A status page has ninety bars and can leave them unlabelled.
                Two markets cannot: two anonymous slabs say nothing. Up to a
                dozen, every bar is named; past that the strip goes dense and
                the names would not fit anyway. */}
            <div
              className={strip.length <= 12 ? 'bw-board-strip is-few' : 'bw-board-strip'}
              role="img"
              aria-label={`${ready} of ${strip.length} markets operational`}
            >
              {strip.map((service, index) => (
                <span
                  key={service.marketId}
                  className={`bw-board-bar is-${SERVICE_COPY[service.state].tone}`}
                  style={{ ['--i' as string]: index }}
                  title={`${service.name} · ${STATUS_WORD[service.state]}`}
                >
                  <i aria-hidden="true" />
                  <em>{service.code}</em>
                </span>
              ))}
            </div>
            <p className="bw-board-axis">
              <span>West</span>
              <span><b>{ready}</b> of {strip.length} operational</span>
              <span>East</span>
            </p>
          </>
        )}

        {affected.length > 0 && (
          <ul className="bw-board-affected" aria-label="Markets that will be affected">
            {affected.slice(0, 4).map((service) => (
              <li key={service.marketId} className={`is-${SERVICE_COPY[service.state].tone}`}>
                <i aria-hidden="true" />
                <b>{service.name}</b>
                {/* Thin or dark, in the two shares: reached at all, and served
                    well. A market reached at the ragged edge of a ring and
                    served nowhere is the one the list exists to name. */}
                <em>
                  {STATUS_WORD[service.state]}
                  {reachedOf(service) > 0
                    ? ` · ${percent(reachedOf(service) * 100)} reached, ${percent((service.coveredShare ?? 0) * 100)} served well`
                    : ' · out of reach'}
                </em>
                <s>{service.fix || service.localization}</s>
              </li>
            ))}
            {affected.length > 4 && (
              <li className="is-more">+{affected.length - 4} more markets affected</li>
            )}
          </ul>
        )}

        <p className="kit-title bw-board-rule"><b>Capacity</b><em>{loadPct}% under load</em></p>

        <p className="bw-paper-figure">
          <Figure value={expectedPeak} format={compactCount} />
          <em>expected at peak, of {compactCount(carried)} this network can carry</em>
        </p>

        {machines > 0 && (
          <Aisle racks={machines} peak={expectedPeak} carried={carried} own={totals.capacity} />
        )}

        <p className="bw-paper-scale">
          <span>
            {machines} {machines === 1 ? 'machine' : 'machines'}
            {rented > 0 && <><i aria-hidden="true" className="bw-paper-key" />{rented} rented</>}
          </span>
          <span className={clears ? '' : 'is-over'}>
            {clears
              ? `${loadPct}% under load · ${compactCount(carried - expectedPeak)} spare`
              : `${loadPct}% · ${compactCount(expectedPeak - carried)} with nowhere to go`}
          </span>
        </p>

        <Verdict
          label={unavailable > 0 ? 'Coverage unavailable' : machines === 0 ? 'Nothing to test' : clears ? 'Clears on paper' : 'Short on paper'}
          tone={unavailable > 0 ? 'bad' : machines === 0 ? 'flat' : clears ? 'good' : 'bad'}
          line={unavailable > 0
            ? 'The service projection is incomplete. This drawing cannot be verified or commissioned.'
            : machines === 0
            ? 'There is no network to test yet. Put a room on the map and fill it.'
            : 'A status page is drawn from what the drawing says. Only the rehearsal puts a real night through it.'}
        />
        <p className="bw-evidence-note">This load rehearsal tests routed traffic. Geographic coverage of every opening market is checked separately before commissioning.</p>

        {/* The facts paper can still be right about, each said once. */}
        <div className="bw-paper-facts">
          <span>
            <Measure value={whole(averageStartup)} unit="ms" />
            <em>before a stream starts</em>
          </span>
          <span>
            <Measure value={percent(averageBuffering)} />
            <em>of it expected to buffer</em>
          </span>
          <span>
            <b className="kit-figure">{totals.cities}</b>
            <em>{totals.cities === 1 ? 'city serving it' : 'cities serving it'}</em>
          </span>
        </div>
      </section>

      {/* --- what happened -------------------------------------------------
          The rehearsal hands back the night country by country and room by
          room. All of it was being dropped for a single line; it is the whole
          reason to run one. */}
      {result && (
        <section className={stale ? 'bw-evidence is-stale' : 'bw-evidence'} aria-label="What happened">
          <p className="kit-title">
            <b>What happened</b>
            <em>{SCENARIOS[result.scenario].name}</em>
          </p>

          {stale ? (
            <Verdict
              label="Out of date"
              tone="warn"
              line="The network changed after this run, so this is evidence for a drawing you no longer have."
            />
          ) : (
            <Verdict
              label={VERDICT[result.verdict].label}
              tone={VERDICT[result.verdict].tone}
              line={result.verdict === 'HELD'
                ? `${compactCount(result.peak)} at peak with ${compactCount(result.spare)} to spare.`
                : result.verdict === 'RENTED'
                  ? 'Burst capacity carried the night. Rented machines hold it up, and cost every week.'
                  : `${percent(result.failedPct)} of viewers could not watch.`}
            />
          )}

          <Bars items={[
            { label: 'Peak hit', value: compactCount(result.peak), fill: result.peak / Math.max(1, result.peak, result.capacity), tone: result.verdict === 'BROKE' ? 'bad' : 'flat' },
            { label: 'Carried', value: compactCount(result.capacity), fill: result.capacity / Math.max(1, result.peak, result.capacity), tone: 'good' },
            { label: 'Spare', value: compactCount(result.spare), fill: Math.max(0, result.spare) / Math.max(1, result.peak, result.capacity), tone: result.spare > 0 ? 'good' : 'bad' },
          ]} />

          {result.spof > 0 && (
            <p className="bw-evidence-note">
              {result.spof} {result.spof === 1 ? 'market depends' : 'markets depend'} on a single room. Lose it and they go dark.
            </p>
          )}

          {failedCountries.length > 0 && (
            <ul className="bw-evidence-list" aria-label="Markets that failed">
              {failedCountries.slice(0, 5).map((country) => (
                <li key={country.code} className={`is-${SERVICE_COPY[country.state].tone}`}>
                  <i aria-hidden="true" />
                  <b>{country.name}</b>
                  <em>{SERVICE_COPY[country.state].label}</em>
                  <s>{percent(country.failedPct)} failed</s>
                </li>
              ))}
              {failedCountries.length > 5 && (
                <li className="is-more">+{failedCountries.length - 5} more markets lost viewers</li>
              )}
            </ul>
          )}

          {result.held.length > 0 && failedCountries.length > 0 && (
            <p className="bw-evidence-note is-good">
              {result.held.length} {result.held.length === 1 ? 'market' : 'markets'} came through it clean.
            </p>
          )}

          {hotRooms.length > 0 && (
            <ul className="bw-evidence-rooms" aria-label="The rooms under most load">
              {hotRooms.map((room) => (
                <li key={`${room.city}-${room.limiting}`}>
                  <b>{room.city}</b>
                  <span className="bw-evidence-load" aria-hidden="true">
                    <i className={room.load >= 1 ? 'is-bad' : room.load >= 0.85 ? 'is-warn' : 'is-good'} style={{ width: `${Math.min(100, room.load * 100)}%` }} />
                  </span>
                  <em>{percent(room.load * 100)} loaded</em>
                  <s>{room.limiting === 'NONE' ? 'Room is fine' : SUPPLY_COPY[room.limiting as Exclude<Limiting, 'NONE'>].name}</s>
                </li>
              ))}
            </ul>
          )}

          {(failedCountries.length > 0 || result.verdict === 'BROKE' || stale) && onJump && (
            <button type="button" className="bw-evidence-fix" onClick={() => onJump('network')}>
              Change the network →
            </button>
          )}
        </section>
      )}

      {/* --- the run -------------------------------------------------------- */}
      <section className="bw-run" aria-label="Live load rehearsal">
        <p className="bw-run-plate">
          <i className={canRehearse ? 'bw-run-lamp is-armed' : 'bw-run-lamp'} aria-hidden="true" />
          Live load rehearsal · costs nothing
        </p>
        <h2>Watch opening night hit the network.</h2>
        <p className="bw-run-line">
          Choose an audience scenario, watch concurrent viewers climb against
          the capacity line, then inspect the stream from the viewer's side.
        </p>

        {/* The line a monitor draws when nothing is happening: flat, with one
            blip crossing it. Pressing the key is what puts a night on it. */}
        <svg className="bw-run-trace" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
          <path className="bw-run-trace-line" d="M0 9 H100" />
          <path className="bw-run-trace-blip" d="M-8 9 h3 l1.4 -6 l1.6 9 l1.4 -3 h2.6" />
        </svg>

        <div className="bw-run-steps" aria-label="Rehearsal sequence">
          {['Audience', 'Route', 'Stress', 'Viewers', 'Decision'].map((label, index) => (
            <span key={label}><i>{index + 1}</i>{label}</span>
          ))}
        </div>

        <button
          type="button"
          className="sf-btn sf-btn--primary bw-run-go"
          disabled={!canRehearse}
          aria-describedby={unavailableReason ? 'bw-rehearsal-unavailable' : undefined}
          onClick={() => handlers.onOpenRehearsal?.(draft)}
        >
          {machines === 0 ? 'Build capacity first' : result && !stale ? 'Test the load again' : 'Test the load'}
        </button>
        {unavailableReason && <p id="bw-rehearsal-unavailable" className="bw-run-unavailable" role="note">{unavailableReason}</p>}
      </section>

      <p className="lw-rule">
        The rehearsal is simulated. It never spends money or changes the live
        platform; it records evidence against this exact network drawing.
      </p>
    </>
  );
}

function riskOrder(state: string): number {
  return ['READY', 'WATCH', 'POOR', 'UNSTABLE', 'NONE'].indexOf(state);
}
