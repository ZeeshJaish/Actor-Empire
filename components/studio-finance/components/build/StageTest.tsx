/* ============================================================================
   3 · Test — what will opening night actually feel like?

   The stage before this one says what the network is. This one is the only
   place that finds out whether it is true, so the page is three things in the
   order you need them:

   · THE BOARD — the real-world thing a viewer meets when a service is in
     trouble is a status page: the banner, the row of little bars, the list of
     affected components. So opening night is drawn as your status page before
     it happens. Regional summaries, with smaller launches ordered west to east — the way a premiere
     actually crosses the world — each coloured by the state the engine gives
     it, sweeping in as the night sweeps. Under the banner, the markets that
     will be affected and what would fix each one. Under those, capacity as the
     load and headroom, followed by actual facility forecasts grouped by region.
     Physical rooms and cloud sites keep their own identity and health.
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
import { Bars, Verdict, type KitTone } from '../kit';
import { regionsOf } from '../../finance/placer';
import { regionalStatusSegments } from '../../finance/regionalStatus';
import type { StageProps } from './BuildWizard';
import { FacilityCapacityPanel } from './FacilityCapacityPanel';

const whole = (value: number): string => String(Math.round(value));
const percent = (value: number): string => value > 0 && value < .1 ? '<0.1%'
  : value > 0 && value < 100 ? pct(Math.floor(value * 10) / 10, 1) : pct(value, 0);

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
  const regionStrips = regionsOf(data).map(region => ({ region, services: strip.filter(service => region.markets.some(market => market.id === service.marketId)) })).filter(group => group.services.length);
  const viewerGap = Math.max(0, expectedPeak - services.reduce((sum, service) => sum + service.coveredPeak, 0));
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

  const failedCountries = result
    ? [...result.countries].filter((country) => country.failedPct > 0).sort((left, right) => right.failedPct - left.failedPct)
    : [];
  const failedAudiencePct = result ? result.countries.reduce((sum, country) => sum + country.demand * country.failedPct, 0)
    / Math.max(1, result.countries.reduce((sum, country) => sum + country.demand, 0)) : 0;
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
            {/* Regional bars show proportions on a fixed scale. Exact counts
                remain visible, including problems smaller than one segment. */}
            {strip.length > 12 ? <div className="bw-board-regions" aria-label={`${ready} of ${strip.length} markets operational`}>
              {regionStrips.map(({ region, services }) => {
                const counts = {
                  good: services.filter(service => service.state === 'READY').length,
                  warn: services.filter(service => service.state === 'WATCH' || service.state === 'POOR').length,
                  bad: services.filter(service => service.state === 'UNSTABLE' || service.state === 'NONE').length,
                };
                const label = `${region.name}: ${counts.good} operational, ${counts.warn} degraded, ${counts.bad} unavailable or unstable, ${services.length} markets total`;
                return <div key={region.id}>
                  <p><b>{region.name}</b><span>{counts.good}/{services.length}</span></p>
                  <div className="bw-board-strip bw-board-summary" role="img" aria-label={label} title={label}>
                    {regionalStatusSegments(services.map(service => service.state)).map((tone, index) => <span key={index} aria-hidden="true" className={`bw-board-bar is-${tone}`}><i/></span>)}
                  </div>
                  <small className="bw-board-counts">{counts.warn + counts.bad === 0 ? 'All operational' : [counts.warn ? `${counts.warn} degraded` : '', counts.bad ? `${counts.bad} down / unstable` : ''].filter(Boolean).join(' · ')}</small>
                </div>;
              })}
            </div> : <div
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
            </div>}
            <p className="bw-board-axis">
              <span>{strip.length > 12 ? 'Approximate share · exact counts above' : 'West'}</span>
              <span><b>{ready}</b> of {strip.length} operational</span>
              <span>{strip.length > 12 ? '' : 'East'}</span>
            </p>
          </>
        )}

        {viewerGap > 0 && <p className="bw-board-gap">{viewerGap.toLocaleString()} expected viewers are outside smooth service. Regional totals can hide small-country gaps.</p>}
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

        <FacilityCapacityPanel totals={totals} expectedPeak={expectedPeak}/>

        <Verdict
          label={unavailable > 0 ? 'Coverage unavailable' : machines === 0 ? 'Nothing to test' : clears ? affected.length ? 'Global capacity clears · local gaps remain' : 'Capacity clears on paper' : 'Short on paper'}
          tone={unavailable > 0 ? 'bad' : machines === 0 ? 'flat' : clears ? 'good' : 'bad'}
          line={unavailable > 0
            ? 'The service projection is incomplete. This drawing cannot be verified or commissioned.'
            : machines === 0
            ? 'There is no network to test yet. Put a room on the map and fill it.'
            : affected.length > 0
            ? 'Total capacity can be sufficient while local routes still need attention.'
            : 'Run a rehearsal to verify delivery when the audience arrives.'}
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
                  : `${percent(failedAudiencePct)} of viewers could not watch.`}
            />
          )}

          <Bars items={[
            { label: 'Peak hit', value: compactCount(result.peak), fill: result.peak / Math.max(1, result.peak, result.capacity), tone: result.verdict === 'BROKE' ? 'bad' : 'flat' },
            { label: 'Carried', value: compactCount(result.capacity), fill: result.capacity / Math.max(1, result.peak, result.capacity), tone: 'good' },
            { label: 'Burst headroom', value: compactCount(result.spare), fill: Math.max(0, result.spare) / Math.max(1, result.peak, result.capacity), tone: result.spare > 0 ? 'good' : 'bad' },
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
              {hotRooms.map((room, index) => (
                <li key={room.id || `${room.city}-${room.limiting}-${index}`}>
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
