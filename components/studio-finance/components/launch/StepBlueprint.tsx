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
import { compactCount, money, moneyPrecise, pct } from '../../finance/format';
import { FlagField } from '../FlagField';
import { StreamingTitleArt } from '../StreamingTitleArt';
import { Mark } from '../../../streaming-transplant/StreamingBrandVisuals';
import { StepIcon, TickIcon } from './StageIcons';
import { STREAMING_OFFER_PERSONALITY } from '../../../streaming-transplant/offerPersonality';

/* #113: each stream in the colour of the offer it belongs to (#104's personalities) */
const STREAM_COLOUR: Record<string, string> = {
  subs: STREAMING_OFFER_PERSONALITY.SUBSCRIPTION.colour,
  ads: STREAMING_OFFER_PERSONALITY.ADS.colour,
  daypass: STREAMING_OFFER_PERSONALITY.ADS.colour,
  rentals: STREAMING_OFFER_PERSONALITY.STORE.colour,
};

const WAVE: Record<string, number[]> = {
  pulse: [30, 90, 40, 95, 35, 25, 20],
  ascent: [20, 35, 50, 65, 80, 92, 100],
  premiere: [45, 55, 70, 85, 100, 80, 60],
  silent: [12, 12, 12, 12, 12, 12, 12],
  choir: [60, 70, 78, 82, 80, 74, 66],
  machine: [90, 20, 85, 25, 80, 30, 70],
};

export function summarizeBlueprintOffer(settings: import('../../finance/launch').PricingSettings) {
  const subscription = settings.streams.includes('subs') && settings.plans.length > 0;
  const ads = settings.streams.includes('ads');
  const store = settings.streams.includes('rentals');
  const planPrice = subscription ? Math.min(...settings.plans.map(plan => plan.monthly)) : 0;
  const extras = [ads ? 'free ads' : null, store ? 'rent or buy' : null].filter(Boolean).join(' + ');
  return {
    showPlanLadder: subscription,
    label: subscription ? 'What it costs a household' : 'Viewing offer',
    value: subscription
      ? `${settings.plans.length} plans from ${moneyPrecise(planPrice)}${extras ? ` + ${extras}` : ''}`
      : ads && store ? 'Free with ads + rent or buy'
        : ads ? `Free with ads · ${settings.ads.minutesPerHour} ad min/hour`
          : store ? `Rent ${moneyPrecise(settings.rentals.rent)} · Buy ${moneyPrecise(settings.rentals.buy)}`
            : 'Choose an offer',
    readout: ads ? 'FREE' : store ? 'PER TITLE' : '',
    detail: ads ? `${settings.ads.minutesPerHour} ad min/hour` : store ? 'Rent or own' : '',
  };
}

export function StepBlueprint({ data, draft, chosen, treasury, free, gap, handlers, pricingPreview, onJump }: StepProps & { onJump: (step: LaunchStepId) => void }) {
  const footprint = summarize(chosen);
  const settings = draft.pricing ?? data.pricing;
  const offer = summarizeBlueprintOffer(settings);
  const addressableHouseholds = chosen.reduce((sum, country) => sum + country.addressableHouseholds, 0);
  const pricingCohorts = chosen.flatMap(country => country.pricingCohorts || []);
  const worldForecast = pricingPreview ? pricingPreview.worldForecast
    : handlers.onForecastPricing?.(settings, chosen.map(country => country.id)) ?? null;
  const forecast = pricingPreview?.forecast ?? forecastPricing(settings, addressableHouseholds, data.market, pricingCohorts, worldForecast);
  const forecastReady = Boolean(worldForecast) && !pricingPreview?.updating;
  const approved = data.clearance.filter((c) => c.outcome === 'APPROVED' || c.outcome === 'CONDITIONS').length;
  const storefront = data.storefronts.find((s) => s.id === draft.storefrontId);
  const sound = data.identSounds.find((s) => s.id === draft.soundId);
  const pack = data.identPackages.find((p) => p.id === draft.packageId);
  const catalogueDepth = data.catalogue.hours / Math.max(1, data.catalogue.hoursNeeded);

  /* The six decisions this wizard is made of: the briefing's six objectives.
     The briefing draws one objective each and the grid below one tile each,
     off this same list, so the count in the briefing and the tiles under it
     can never disagree — and an objective jumps to the step it stands for. */
  const checks = [
    { label: 'Markets', ok: chosen.length > 0, step: 'markets' as LaunchStepId },
    { label: 'Clearance', ok: approved === chosen.length && chosen.length > 0, step: 'clearance' as LaunchStepId },
    { label: 'Ident', ok: data.ident.commissioned, step: 'ident' as LaunchStepId },
    { label: 'Store', ok: Boolean(storefront), step: 'storefront' as LaunchStepId },
    { label: 'Pricing', ok: settings.streams.length > 0, step: 'pricing' as LaunchStepId },
    { label: 'Catalogue', ok: data.catalogue.readyForLaunch ?? data.catalogue.titles > 0, step: 'catalogue' as LaunchStepId },
  ];
  const done = checks.filter((c) => c.ok).length;
  const blocking = data.blockers.filter((b) => b.severity === 'block').length;
  const blockedSteps = new Set(data.blockers.filter((b) => b.severity === 'block').map((b) => b.step));
  const state = blocking > 0 ? 'blocked' : done === checks.length ? 'ready' : 'warned';

  return (
    <>
      {/* --- the mission briefing (#110) ------------------------------------
          The overview reads as a briefing for opening night: the service's
          mark and name, the mission in one line, its six objectives, and a
          stamp — GO when all six are settled, NO GO while something blocks,
          otherwise how many are still open. Each objective is the step it
          stands for, with that step's glyph from the launch sequence, and
          jumps to it; the sentence beneath reconciles both counts. */}
      <section className={`bl-hero is-${state}`} aria-label="Mission briefing">
        <div className="bl-brief-top">
          <p className="sf-eyebrow">Mission briefing</p>
          <span className={`bl-brief-stamp is-${state}`}>
            {state === 'ready' ? 'Go' : state === 'blocked' ? 'No go' : `${checks.length - done} open`}
          </span>
        </div>
        <div className="bl-brief-id">
          <span className="bl-hero-mark" aria-hidden="true">
            <Mark
              brand={{
                name: data.company.name,
                markId: data.company.markId || 'BOLT',
                customMark: data.company.logoSrc || null,
              }}
              className="bl-hero-mark-glyph"
            />
          </span>
          <span className="bl-brief-name">
            <em>Opening night</em>
            <h2>{data.company.name}</h2>
          </span>
        </div>
        <p className="bl-brief-goal">
          {chosen.length > 0
            ? `Open in ${footprint.countries} ${footprint.countries === 1 ? 'market' : 'markets'} · ${compactCount(footprint.audience)} viewers · ${compactCount(data.catalogue.titles)} titles`
            : 'Choose where to open first'}
        </p>

        <div className="bl-hero-pips" role="group" aria-label="The six objectives">
          {checks.map((check) => {
            const blocked = !check.ok && blockedSteps.has(check.step);
            return (
              <button
                key={check.step}
                type="button"
                className={check.ok ? 'is-ok' : blocked ? 'is-blocked' : undefined}
                onClick={() => onJump(check.step)}
                aria-label={`${check.label} — ${check.ok ? 'settled' : blocked ? 'blocked' : 'still open'}`}
              >
                <span className="bl-pip-glyph" aria-hidden="true"><StepIcon step={check.step} /></span>
                <span className="bl-pip-mark" aria-hidden="true">{check.ok ? <TickIcon /> : blocked ? '!' : null}</span>
                <em>{check.label}</em>
              </button>
            );
          })}
        </div>

        <p className="bl-hero-read">
          {state === 'ready'
            ? `All ${checks.length} objectives are settled. Build the Platform can start from this.`
            : state === 'blocked'
              ? `${done} of ${checks.length} settled · ${blocking} ${blocking === 1 ? 'thing still blocks' : 'things still block'} opening night.`
              : `${done} of ${checks.length} settled · finish the remaining objectives and clearance checks before opening night.`}
        </p>
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

        <Tile label={offer.label} state={settings.streams.length > 0} onJump={() => onJump('pricing')}
          value={offer.value}>
          {/* The price ladder, drawn against the dearest plan so the shape is
              the shape of your own pricing rather than an arbitrary scale. */}
          {offer.showPlanLadder ? <div
            className="bl-ladder"
            style={{ ['--bl-plan-count' as string]: Math.max(1, Math.min(5, settings.plans.length)) }}
            aria-label={`${settings.plans.length} household plan${settings.plans.length === 1 ? '' : 's'}`}
          >
            {settings.plans.slice(0, 5).map((plan) => {
              const dearest = Math.max(...settings.plans.map((p) => p.monthly), 1);
              return (
                <span key={plan.id} style={{ height: `${Math.max(22, (plan.monthly / dearest) * 100)}%` }}>
                  <em>{money(plan.monthly)}</em>
                </span>
              );
            })}
          </div> : <div className="bl-offer-readout" aria-label={offer.value}>
            <strong>{offer.readout}</strong><span>{offer.detail}</span>
          </div>}
        </Tile>

        <Tile label="Opening catalogue" state={data.catalogue.readyForLaunch ?? data.catalogue.titles > 0} onJump={() => onJump('catalogue')}
          value={`${compactCount(data.catalogue.titles)} titles · ${compactCount(data.catalogue.hours)} hours`}>
          <div className="bl-posters">
            {data.catalogue.anchors.slice(0, 4).map((t) => (
              <span key={t.id}><StreamingTitleArt id={t.posterSeed ?? t.id} title={t.name} genre={t.format} poster={t.poster} size={26} /></span>
            ))}
            <em>{catalogueDepth.toFixed(1)}×</em>
          </div>
        </Tile>
      </div>

      {/* --- what it is forecast to do --------------------------------------
          #113: the projected result, each stream in its offer's colour and named
          under the bar, so the bar says where the money comes from. */}
      <section className="bl-money" aria-label="Projected result">
        <p className="sf-eyebrow bl-money-head">Projected result</p>
        <div className="bl-money-top">
          <div>
            <p className="sf-eyebrow">Potential gross if playable</p>
            <p className="bl-money-figure">{forecastReady ? money(forecast.monthlyRevenue) : '—'}<i>/mo</i></p>
          </div>
          <div className="is-end">
            <p className="sf-eyebrow">Households</p>
            <p className="bl-money-figure">{forecastReady ? compactCount(forecast.households) : '—'}</p>
          </div>
        </div>
        <div className="bl-money-bar" aria-hidden="true">
          {forecastReady && forecast.streams.map((stream) => (
            <i key={stream.id} style={{ width: `${(stream.monthly / Math.max(1, forecast.monthlyRevenue)) * 100}%`, background: STREAM_COLOUR[stream.id] }} title={stream.name} />
          ))}
        </div>
        {forecastReady && forecast.streams.length > 0 && (
          <ul className="bl-money-keys">
            {forecast.streams.map((stream) => (
              <li key={stream.id} style={{ ['--k' as string]: STREAM_COLOUR[stream.id] ?? 'var(--sf-brand-on)' }}>
                <i aria-hidden="true" />{stream.name}<b>{money(stream.monthly)}</b>
              </li>
            ))}
          </ul>
        )}
        <p className="bl-money-note">
          {forecastReady ? `${money(forecast.yearlyRevenue)} first-year equivalent if eligible titles are watched and buyers convert` : 'Forecast updating or unavailable'} · before network, payment and rights costs · {money(treasury.planned)} planned to launch
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
        This requirement document updates as you work. Changing markets, pricing
        or catalogue later invalidates any capacity built against the older plan.
      </p>

      <div className="lw-actions">
        <span className={`lw-autosave-state ${data.blueprintSaved ? 'is-current' : 'is-pending'}`} role="status">
          <i aria-hidden="true" />
          {data.blueprintSaved ? 'Autosaved · current' : 'Autosaving requirements'}
        </span>
        {/* No build button here. The wizard's own footer already turns into
            "Open Build the Platform" on the last step, so this was a second
            primary action for the same destination, stacked directly above it. */}
      </div>
    </>
  );
}

/* #113: a dossier card — the decision's picture, its label and its value; a tick once it is settled */
function Tile({ label, value, state, onJump, children }: {
  label: string; value: string; state: boolean; onJump: () => void; children: ReactNode;
}) {
  return (
    <button type="button" className={state ? 'bl-tile is-ok' : 'bl-tile'} onClick={onJump}>
      <span className="bl-tile-art">{children}</span>
      <span className="bl-tile-label">{label}</span>
      <span className="bl-tile-value">{value}</span>
      {state && <span className="bl-tile-tick" aria-hidden="true"><TickIcon /></span>}
    </button>
  );
}
