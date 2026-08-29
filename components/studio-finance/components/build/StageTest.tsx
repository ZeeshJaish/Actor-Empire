/* ============================================================================
   4 · Test — the control room before the full rehearsal.

   This stage deliberately stays short. The player checks the forecast here,
   then enters Actor Empire's original full-screen load rehearsal to watch the
   audience curve rise, facilities take traffic and viewer failures appear.
   ========================================================================== */

import { SERVICE_COPY, rehearsalStale } from '../../finance/build';
import { compactCount, pct } from '../../finance/format';
import type { StageProps } from './BuildWizard';

export function StageTest({ data, draft, totals, services, handlers }: StageProps) {
  const result = draft.rehearsal;
  const stale = rehearsalStale(data, draft);
  const expectedPeak = services.reduce((sum, service) => sum + service.peak, 0);
  const averageStartup = Math.round(
    services.reduce((sum, service) => sum + service.startupMs, 0) / Math.max(1, services.length),
  );
  const averageBuffering = services.reduce(
    (sum, service) => sum + service.buffering,
    0,
  ) / Math.max(1, services.length);
  const atRisk = services.filter(service => service.state !== 'READY');
  const worst = [...atRisk].sort((a, b) => riskOrder(b.state) - riskOrder(a.state))[0];
  const canRehearse = totals.racks > 0 && Boolean(handlers.onOpenRehearsal);

  return (
    <>
      <section className="bw-forecast">
        <p className="sf-eyebrow">Opening-night forecast</p>
        <p className="bw-forecast-line">
          {totals.racks === 0
            ? 'There is no network to test yet. Place a facility and install capacity first.'
            : worst
              ? `${worst.name} is the weak point. The rehearsal will show exactly what its viewers experience.`
              : 'The drawing looks healthy on paper. Now put it under a real premiere-night load.'}
        </p>
        <div className="cr-tiles">
          <span><em>Likely peak</em><b>{compactCount(expectedPeak)}</b></span>
          <span><em>Own capacity</em><b>{compactCount(totals.capacity)}</b></span>
          <span><em>Start time</em><b>{averageStartup}<s>ms</s></b></span>
          <span><em>Buffer risk</em><b>{pct(averageBuffering, 0)}</b></span>
        </div>
      </section>

      {atRisk.length > 0 && (
        <section className="lw-block">
          <p className="sf-eyebrow lw-block-head">Signals to watch</p>
          <ul className="bw-countries">
            {atRisk.slice(0, 3).map(service => {
              const copy = SERVICE_COPY[service.state];
              return (
                <li key={service.marketId} className={`bw-country is-${copy.tone}`}>
                  <span className="bw-country-code">{service.code}</span>
                  <span className="bw-country-body">
                    <span className="bw-country-top">
                      <b>{service.name}</b>
                      <s className={`sf-tone-${copy.tone}`}>{copy.label}</s>
                    </span>
                    <em>{service.fix || service.localization}</em>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="bw-rehearsal bw-rehearsal-entry">
        <p className="sf-eyebrow">Live load rehearsal · costs nothing</p>
        <h2>Watch opening night hit the network.</h2>
        <p>
          Choose an audience scenario, watch concurrent viewers climb against
          the capacity line, then inspect the stream from the viewer's side.
        </p>

        <div className="bw-rehearsal-sequence" aria-label="Rehearsal sequence">
          {['Audience', 'Route', 'Stress', 'Viewers', 'Decision'].map((label, index) => (
            <span key={label}><i>{index + 1}</i>{label}</span>
          ))}
        </div>

        {result && !stale && (
          <div className={`bw-result is-${result.verdict.toLowerCase()}`}>
            <b>{result.verdict === 'HELD' ? 'Last rehearsal held' : result.verdict === 'RENTED' ? 'Last rehearsal used burst' : 'Last rehearsal broke'}</b>
            <p>{compactCount(result.peak)} at peak · {result.failedPct}% failed · {result.spof} single points.</p>
          </div>
        )}

        {stale && (
          <div className="bw-stale">
            <b>The previous evidence is out of date</b>
            <p>The network changed after the last run. Test the current drawing again.</p>
          </div>
        )}

        <button
          type="button"
          className="sf-btn sf-btn--primary bw-open-rehearsal"
          disabled={!canRehearse}
          onClick={() => handlers.onOpenRehearsal?.(draft)}
        >
          {totals.racks === 0 ? 'Build capacity first' : result && !stale ? 'Test the load again' : 'Test the load'}
        </button>
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
