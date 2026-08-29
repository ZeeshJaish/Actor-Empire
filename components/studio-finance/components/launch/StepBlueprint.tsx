/* ============================================================================
   7 · Launch blueprint — the plan, as one page.

   Rebuilt from scratch. A list of eight labelled rows is a checklist, and a
   checklist is not what a player wants at the end of an hour of decisions. What
   they want is to SEE what they made.

   So the blueprint is a collage of the same graphics they built each decision
   with: the flags they chose, the front page they picked, the ident that plays,
   the price ladder they set, the shelf they filled. Everything on this page is
   a picture of a decision, and every tile jumps back to the step that owns it.
   ========================================================================== */

import type { ReactNode } from 'react';
import type { LaunchStepId } from '../../finance/launch';
import { forecastPricing, summarize } from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { compactCount, money, pct } from '../../finance/format';
import { FlagField } from '../FlagField';
import { Poster } from '../Poster';

const WAVE: Record<string, number[]> = {
  pulse: [30, 90, 40, 95, 35, 25, 20],
  ascent: [20, 35, 50, 65, 80, 92, 100],
  premiere: [45, 55, 70, 85, 100, 80, 60],
  silent: [12, 12, 12, 12, 12, 12, 12],
  choir: [60, 70, 78, 82, 80, 74, 66],
  machine: [90, 20, 85, 25, 80, 30, 70],
};

export function StepBlueprint({ data, draft, chosen, treasury, free, gap, handlers, onJump }: StepProps & { onJump: (step: LaunchStepId) => void }) {
  const footprint = summarize(chosen);
  const settings = draft.pricing ?? data.pricing;
  const addressableHouseholds = chosen.reduce((sum, country) => sum + country.addressableHouseholds, 0);
  const forecast = forecastPricing(settings, addressableHouseholds, data.market);
  const approved = data.clearance.filter((c) => c.outcome === 'APPROVED' || c.outcome === 'CONDITIONS').length;
  const storefront = data.storefronts.find((s) => s.id === draft.storefrontId);
  const sound = data.identSounds.find((s) => s.id === draft.soundId);
  const pack = data.identPackages.find((p) => p.id === draft.packageId);
  const depth = data.catalogue.hours / Math.max(1, data.catalogue.hoursNeeded);

  const checks = [
    { ok: chosen.length > 0, step: 'markets' as LaunchStepId },
    { ok: approved === chosen.length && chosen.length > 0, step: 'clearance' as LaunchStepId },
    { ok: data.ident.commissioned, step: 'ident' as LaunchStepId },
    { ok: Boolean(storefront), step: 'storefront' as LaunchStepId },
    { ok: settings.streams.length > 0, step: 'pricing' as LaunchStepId },
    { ok: depth >= 1, step: 'catalogue' as LaunchStepId },
  ];
  const done = checks.filter((c) => c.ok).length;
  const blocking = data.blockers.filter((b) => b.severity === 'block').length;
  const state = blocking > 0 ? 'blocked' : done === checks.length ? 'ready' : 'warned';

  return (
    <>
      {/* --- the poster for your own launch -------------------------------- */}
      <section className={`bl-hero is-${state}`}>
        <div className="bl-hero-art" aria-hidden="true">
          <span className="bl-hero-mark"><i /><i /><i /></span>
        </div>
        <p className="sf-eyebrow">Opening night plan · week {data.company.week}</p>
        <h2>{data.company.name}</h2>
        <div className="bl-hero-state">
          <span className="bl-ring" style={{ ['--p' as string]: `${(done / checks.length) * 100}%` }} aria-hidden="true">
            <b>{done}<i>/{checks.length}</i></b>
          </span>
          <p>
            {state === 'ready'
              ? 'Every decision is made. Build the Platform can start from this.'
              : state === 'blocked'
                ? `${blocking} thing${blocking > 1 ? 's' : ''} still block opening night.`
                : 'Nothing is blocking. The gaps below will be felt on the first weekend.'}
          </p>
        </div>
      </section>

      {/* --- the decisions, as the pictures they were made with ------------- */}
      <div className="bl-grid">
        <Tile label="Opening markets" state={chosen.length > 0} onJump={() => onJump('markets')}
          value={chosen.length > 0 ? `${footprint.countries} countries · ${compactCount(footprint.audience)} viewers` : 'None chosen'}>
          <div className="bl-flags">
            {chosen.slice(0, 6).map((c) => (
              <span key={c.id}><FlagField code={c.code} src={c.flagSrc} /></span>
            ))}
            {chosen.length > 6 && <em>+{chosen.length - 6}</em>}
          </div>
        </Tile>

        <Tile label="Government clearance" state={approved === chosen.length && chosen.length > 0} onJump={() => onJump('clearance')}
          value={`${approved} of ${chosen.length} approved`}>
          <div className="bl-pips">
            {chosen.map((c) => {
              const s = data.clearance.find((x) => x.countryId === c.id)?.outcome ?? 'NOT_FILED';
              const ok = s === 'APPROVED' || s === 'CONDITIONS';
              const live = s === 'IN_REVIEW' || s === 'DELAYED';
              return <i key={c.id} className={ok ? 'is-ok' : live ? 'is-live' : undefined} />;
            })}
          </div>
        </Tile>

        <Tile label="Front page" state={Boolean(storefront)} onJump={() => onJump('storefront')}
          value={storefront?.name ?? 'Not chosen'}>
          <div className="bl-front">
            <i className="bl-front-hero" />
            <i className="bl-front-row" />
            <i className="bl-front-row is-short" />
          </div>
        </Tile>

        <Tile label="Service ident" state={data.ident.commissioned} onJump={() => onJump('ident')}
          value={data.ident.commissioned ? `${sound?.name ?? '—'} · ${pack?.name ?? '—'}` : 'Not commissioned'}>
          <div className="bl-wave">
            {(WAVE[draft.soundId ?? 'pulse'] ?? WAVE.pulse).map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
        </Tile>

        <Tile label="What it costs a household" state={settings.streams.length > 0} onJump={() => onJump('pricing')}
          value={settings.streams.includes('subs')
            ? `${settings.plans.length} plans from ${money(forecast.entryPrice)}`
            : `${settings.streams.length} revenue stream${settings.streams.length > 1 ? 's' : ''}`}>
          {/* The price ladder, drawn against the dearest plan so the shape is
              the shape of your own pricing rather than an arbitrary scale. */}
          <div className="bl-ladder">
            {settings.plans.slice(0, 5).map((plan) => {
              const dearest = Math.max(...settings.plans.map((p) => p.monthly), 1);
              return (
                <span key={plan.id} style={{ height: `${Math.max(22, (plan.monthly / dearest) * 100)}%` }}>
                  <em>{money(plan.monthly)}</em>
                </span>
              );
            })}
            {settings.plans.length === 0 && <em className="bl-none">No plans</em>}
          </div>
        </Tile>

        <Tile label="Opening catalogue" state={depth >= 1} onJump={() => onJump('catalogue')}
          value={`${compactCount(data.catalogue.titles)} titles · ${compactCount(data.catalogue.hours)} hours`}>
          <div className="bl-posters">
            {data.catalogue.anchors.slice(0, 4).map((t) => (
              <span key={t.id}><Poster seed={t.posterSeed ?? t.id} size={26} /></span>
            ))}
            <em>{depth.toFixed(1)}×</em>
          </div>
        </Tile>
      </div>

      {/* --- what it is forecast to do -------------------------------------- */}
      <section className="bl-money">
        <div className="bl-money-top">
          <div>
            <p className="sf-eyebrow">Forecast revenue</p>
            <p className="bl-money-figure">{money(forecast.monthlyRevenue)}<i>/mo</i></p>
          </div>
          <div className="is-end">
            <p className="sf-eyebrow">Households</p>
            <p className="bl-money-figure">{compactCount(forecast.households)}</p>
          </div>
        </div>
        <div className="bl-money-bar" aria-hidden="true">
          {forecast.streams.map((stream, i) => (
            <i key={stream.id} style={{ width: `${(stream.monthly / Math.max(1, forecast.monthlyRevenue)) * 100}%`, opacity: 1 - i * 0.14 }} title={stream.name} />
          ))}
        </div>
        <p className="bl-money-note">
          Expected range {money(forecast.conservativeMonthlyRevenue)}–{money(forecast.breakoutMonthlyRevenue)} a month · {money(forecast.yearlyRevenue)} expected annually against {money(treasury.planned)} planned to launch
          {gap > 0 && <> · {money(gap)} still to find</>}
          {gap <= 0 && <> · {money(free - treasury.planned)} unspent</>}
        </p>
      </section>

      {data.blockers.length > 0 && (
        <ul className="lw-doc-blockers">
          {data.blockers.map((b) => (
            <li key={b.id} className={b.severity === 'block' ? 'is-block' : 'is-warn'}>
              <button type="button" onClick={() => onJump(b.step)}>
                <i aria-hidden="true" />
                <span>{b.text}</span>
                <em>{b.severity === 'block' ? 'Blocking' : 'Warning'}</em>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="lw-rule">
        Saving does not launch the service. This becomes the requirement document
        for Network Build — and changing markets, pricing or catalogue later
        invalidates the capacity built against it.
      </p>

      <div className="lw-actions">
        <button type="button" className="sf-btn sf-btn--ghost" onClick={() => handlers.onSaveBlueprint?.()}>
          {data.blueprintSaved ? 'Saved' : 'Save blueprint'}
        </button>
        <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onOpenBuildPlatform?.()}>
          Build the Platform
        </button>
      </div>
    </>
  );
}

function Tile({ label, value, state, onJump, children }: {
  label: string; value: string; state: boolean; onJump: () => void; children: ReactNode;
}) {
  return (
    <button type="button" className={state ? 'bl-tile is-ok' : 'bl-tile'} onClick={onJump}>
      <span className="bl-tile-art">{children}</span>
      <span className="bl-tile-label">{label}</span>
      <span className="bl-tile-value">{value}</span>
    </button>
  );
}
