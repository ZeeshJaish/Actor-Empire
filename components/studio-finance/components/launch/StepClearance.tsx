/* ============================================================================
   2 · Market clearance — pay to enter, then wait for the state to say yes.

   Every version of this screen has been a fight against length. A stacked list
   of full cards, one per market, is unreadable at four markets and absurd at
   twelve. So the markets became a strip — flag, code, a status dot — and only
   the one you are looking at opens underneath. One market, one glance.

   Money is charged only on confirmation.
   ========================================================================== */

import { useState } from 'react';
import { CLEARANCE_STAGES, type ClearanceOutcome, type ClearanceState } from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { money } from '../../finance/format';
import { FlagField, flagAccent } from '../FlagField';
import {
  STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY,
  STREAMING_MARKET_REAPPLICATION_ENERGY,
  STREAMING_MARKET_REQUIREMENT_ENERGY,
} from '../../../../services/streamingMarkets';

const OUTCOME: Record<ClearanceOutcome, { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' }> = {
  NOT_FILED: { label: 'Not filed', tone: 'flat' },
  IN_REVIEW: { label: 'Application filed', tone: 'good' },
  APPROVED: { label: 'Approved', tone: 'good' },
  CONDITIONS: { label: 'Approved with conditions', tone: 'warn' },
  DELAYED: { label: 'Delayed', tone: 'warn' },
  DOCUMENT_REQUIRED: { label: 'Needs a document', tone: 'warn' },
  PAYMENT_REQUIRED: { label: 'Needs a payment', tone: 'warn' },
  REJECTED: { label: 'Rejected for now', tone: 'bad' },
  REVISABLE: { label: 'Can file again', tone: 'warn' },
};

const NEEDS_PLAYER: ClearanceOutcome[] = ['DOCUMENT_REQUIRED', 'PAYMENT_REQUIRED', 'REJECTED', 'REVISABLE'];

export function StepClearance({ data, draft, chosen, free, handlers }: StepProps) {
  const byCountry = new Map(data.clearance.map((c) => [c.countryId, c]));
  const [openId, setOpenId] = useState<string | undefined>(chosen[0]?.id);

  if (chosen.length === 0) {
    return <p className="lw-empty">Choose opening markets first — there is nothing to clear yet.</p>;
  }

  const stateOf = (id: string): ClearanceState =>
    byCountry.get(id) ?? { countryId: id, outcome: 'NOT_FILED', stage: 'FILED' };

  const states = chosen.map((c) => stateOf(c.id).outcome);
  const cleared = states.filter((s) => s === 'APPROVED' || s === 'CONDITIONS').length;
  const waiting = states.filter((s) => s === 'IN_REVIEW' || s === 'DELAYED').length;
  const needsYou = states.filter((s) => NEEDS_PLAYER.includes(s)).length;
  const unfiled = chosen.filter((c) => stateOf(c.id).outcome === 'NOT_FILED');
  const due = unfiled.reduce((sum, c) => sum + c.rightsEstimate + c.complianceCost, 0);
  const filingEnergy = unfiled.length * STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY;
  const short = Math.max(0, due - free);

  const active = chosen.find((c) => c.id === openId) ?? chosen[0];
  const state = stateOf(active.id);
  const outcome = OUTCOME[state.outcome];
  const stageIndex = CLEARANCE_STAGES.findIndex((s) => s.id === state.stage);
  const walking = state.outcome !== 'NOT_FILED';
  const done = state.outcome === 'APPROVED' || state.outcome === 'CONDITIONS';

  return (
    <>
      <section className="cl-hero">
        <div className="cl-hero-top">
          <div>
            <p className="sf-eyebrow">Markets cleared</p>
            <p className="cl-hero-figure">{cleared}<i>/{chosen.length}</i></p>
          </div>
          {due > 0 && (
            <div className="cl-hero-due">
              <p className="sf-eyebrow">Due to file</p>
              <p className={short > 0 ? 'sf-tone-bad' : ''}>{money(due)}</p>
              <small>{filingEnergy}E founder attention</small>
            </div>
          )}
        </div>

        <div className="cl-status" role="img" aria-label={`${cleared} cleared, ${waiting} in review, ${needsYou} need you`}>
          {cleared > 0 && <i className="is-ok" style={{ width: `${(cleared / chosen.length) * 100}%` }} />}
          {waiting > 0 && <i className="is-wait" style={{ width: `${(waiting / chosen.length) * 100}%` }} />}
          {needsYou > 0 && <i className="is-you" style={{ width: `${(needsYou / chosen.length) * 100}%` }} />}
          {unfiled.length > 0 && <i className="is-none" style={{ width: `${(unfiled.length / chosen.length) * 100}%` }} />}
        </div>

        <p className="cl-hero-note">
          {needsYou > 0
            ? `${needsYou} market${needsYou > 1 ? 's are' : ' is'} waiting on you.`
            : waiting > 0
              ? `${waiting} under review. Everything else stays open while you wait.`
              : 'Nothing filed yet. Reviews run 4–6 weeks once they start.'}
        </p>
      </section>

      {/* --- the markets as a strip, not a stack --------------------------- */}
      <div className="cl-strip" role="tablist" aria-label="Market">
        {chosen.map((country) => {
          const s = stateOf(country.id);
          const tone = OUTCOME[s.outcome].tone;
          const on = country.id === active.id;
          return (
            <button
              key={country.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? 'cl-tab is-on' : 'cl-tab'}
              style={{ ['--terr-accent' as string]: flagAccent(country.code) ?? 'var(--sf-brand-on)' }}
              onClick={() => setOpenId(country.id)}
            >
              <span className="cl-tab-flag" aria-hidden="true"><FlagField code={country.code} src={country.flagSrc} /></span>
              <span className="cl-tab-code">{country.code}</span>
              <span className={`cl-tab-dot sf-tone-${tone}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* --- and one market open underneath -------------------------------- */}
      <section
        className={`cl-panel is-${outcome.tone}`}
        key={active.id}
        style={{ ['--terr-accent' as string]: flagAccent(active.code) ?? 'var(--sf-brand-on)' }}
      >
        <div className="cl-panel-band" aria-hidden="true">
          <FlagField code={active.code} src={active.flagSrc} variant="band" />
          <span className="sf-terr-grain" />
          <span className="sf-terr-shade" />
          <span className="sf-terr-plate">
            <span className="sf-terr-tag">{active.code}</span>
            <span className="sf-terr-name">{active.name}</span>
          </span>
          <span className={`cl-panel-pill sf-tone-${outcome.tone}`}>{outcome.label}</span>
        </div>

        <div className="cl-panel-body">
          <div className="cl-track">
            <span className="cl-track-line" aria-hidden="true">
              <i style={{ width: done ? '100%' : walking ? `${(stageIndex / (CLEARANCE_STAGES.length - 1)) * 100}%` : '0%' }} />
            </span>
            {CLEARANCE_STAGES.map((stage, si) => (
              <span
                key={stage.id}
                className={`cl-dot${done || (walking && si < stageIndex) ? ' is-done' : ''}${walking && si === stageIndex && !done ? ' is-now' : ''}`}
                title={stage.label}
              />
            ))}
          </div>

          <p className={`cl-stage${state.outcome === 'IN_REVIEW' ? ' is-filed' : ''}`}>
            {done
              ? 'Cleared for opening day'
              : walking
                ? <><span aria-hidden="true">✓</span> {CLEARANCE_STAGES[stageIndex].label}{state.weeksRemaining ? ` · ${state.weeksRemaining} weeks left` : ''}</>
                : `Not filed · ${active.dossier.approvalWeeks} once it starts`}
          </p>

          <div className="cl-costs">
            <span><em>Market access</em><b>{money(active.rightsEstimate)}</b></span>
            <span><em>Compliance</em><b>{money(active.complianceCost)}</b></span>
            <span><em>Founder time</em><b>{STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY}E</b></span>
            <span className="is-total"><em>To file</em><b>{money(active.rightsEstimate + active.complianceCost)}</b></span>
          </div>

          {state.note && <p className="cl-note">{state.note}</p>}

          {state.requirement && (
            <div className="cl-req">
              <span>{state.requirement.label}</span>
              <button
                type="button"
                className="sf-btn sf-btn--ghost"
                disabled={(state.requirement.cost || 0) > free || data.energy.current < STREAMING_MARKET_REQUIREMENT_ENERGY}
                onClick={() => handlers.onSubmitRequirement?.(active.id)}
              >
                {data.energy.current < STREAMING_MARKET_REQUIREMENT_ENERGY
                  ? `${STREAMING_MARKET_REQUIREMENT_ENERGY - data.energy.current}E short`
                  : state.requirement.cost
                    ? `Pay ${money(state.requirement.cost)} · ${STREAMING_MARKET_REQUIREMENT_ENERGY}E`
                    : `Send it · ${STREAMING_MARKET_REQUIREMENT_ENERGY}E`}
              </button>
            </div>
          )}

          {state.outcome === 'NOT_FILED' && (
            <button
              type="button"
              className="sf-btn sf-btn--primary"
              disabled={active.rightsEstimate + active.complianceCost > free || data.energy.current < STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY}
              onClick={() => handlers.onBeginMarketEntry?.([active.id], draft.selectedCountryIds)}
            >
              {data.energy.current < STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY
                ? `${STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY - data.energy.current}E short for ${active.name}`
                : active.rightsEstimate + active.complianceCost > free
                ? `${money(active.rightsEstimate + active.complianceCost - free)} short for ${active.name}`
                : `File ${active.name} · ${money(active.rightsEstimate + active.complianceCost)} · ${STREAMING_MARKET_FILING_ENERGY_PER_COUNTRY}E`}
            </button>
          )}

          {(state.outcome === 'REJECTED' || state.outcome === 'REVISABLE') && (
            <button
              type="button"
              className="sf-btn sf-btn--ghost"
              disabled={data.energy.current < STREAMING_MARKET_REAPPLICATION_ENERGY}
              onClick={() => handlers.onFileRevisedApplication?.(active.id)}
            >
              {data.energy.current < STREAMING_MARKET_REAPPLICATION_ENERGY
                ? `${STREAMING_MARKET_REAPPLICATION_ENERGY - data.energy.current}E short to refile`
                : `File again · ${STREAMING_MARKET_REAPPLICATION_ENERGY}E`}
            </button>
          )}
        </div>
      </section>

      {/* Filing everything at once is the convenience; the panel above files
         one market on its own, so a shortfall on the expensive market never
         blocks the cheap one. */}
      {unfiled.length > 1 && (
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          disabled={short > 0 || data.energy.current < filingEnergy}
          onClick={() => handlers.onBeginMarketEntry?.(unfiled.map((c) => c.id), draft.selectedCountryIds)}
        >
          {data.energy.current < filingEnergy
            ? `${filingEnergy - data.energy.current}E short to file all ${unfiled.length}`
            : short > 0
            ? `${money(short)} short to file all ${unfiled.length}`
            : `File all ${unfiled.length} · ${money(due)} · ${filingEnergy}E`}
        </button>
      )}
      {unfiled.length === 0 && <p className="lw-rule">Every market is filed. Reviews run on their own from here.</p>}
    </>
  );
}
