/* ============================================================================
   5 · Launch — turn the drawing into a paid, persistent network.

   Commissioning is the only moment in this wizard that spends money, so it is
   the only moment that takes its time: six steps, drawn, with the money leaving
   the treasury at step five. Before that, five gates — and a founder override
   for the player who wants to open anyway.
   ========================================================================== */

import { useCallback, useMemo, useState } from 'react';
import type { BuildStageId } from '../../finance/build';
import { cityFor, facilityRacks, gates, listingFor } from '../../finance/build';
import type { StageProps } from './BuildWizard';
import { compactCount, money } from '../../finance/format';
import { Cutscene } from '../cine/Cutscene';
import { commissionBeats } from '../cine/CommissionCut';

export function StageLaunch({ data, draft, patch, totals, plan, handlers, onJump }: StageProps & { onJump: (stage: BuildStageId) => void }) {
  const [rolling, setRolling] = useState(false);
  const [done, setDone] = useState(data.commissioned);
  const [commitError, setCommitError] = useState('');
  const list = gates(data, draft);
  const open = list.filter((g) => !g.ok);
  const definitionOpen = (data.defineLaunchChecks || []).filter(check => !check.complete);
  const blocked = open.length > 0 || definitionOpen.length > 0;
  const canOverride = definitionOpen.length === 0 && blocked && open.every((g) => g.id === 'rehearsal');
  const commissionNow = plan.commissionNow ?? plan.total;
  const alreadyPaid = plan.lines
    .filter(line => line.timing === 'SETTLED')
    .reduce((sum, line) => sum + line.amount, 0);
  const launchPlanTotal = alreadyPaid + plan.total;

  /* Commissioning is the only moment in this wizard that spends money, so it
     is the only moment that stops being a screen. The sequence plays full
     bleed; the charge happens when it reaches its end card, whether the player
     watched every beat or skipped to it. Charged exactly once — `done` never
     returns to false on its own, and reopening the stage shows the receipt. */
  const cityList = useMemo(() => {
    const seen = new Set<string>();
    return draft.facilities
      .map((f) => cityFor(data, f))
      .filter((c): c is NonNullable<typeof c> => {
        if (!c || seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
  }, [data, draft.facilities]);
  const beats = useMemo(
    () => commissionBeats(totals, plan, cityList, data.company.name),
    [totals, plan, cityList, data.company.name],
  );
  const commit = useCallback(() => {
    if (done) return;
    const result = handlers.onCommission?.(draft);
    if (result && !result.ok) {
      setCommitError(result.message);
      setRolling(false);
      return;
    }
    setCommitError('');
    setDone(true);
  }, [done, handlers, draft]);

  if (done) {
    return (
      <>
        <section className="bw-done">
          <span className="bw-done-mark" aria-hidden="true"><i /><i /><i /></span>
          <b>Commissioned</b>
          <p>
            {totals.weeks > 0
              ? `${totals.cities} cities and ${totals.racks} racks commissioned. The network becomes operational in ${totals.weeks} weeks.`
              : `${totals.racks} racks across ${totals.cities} cities are operational.`}
          </p>
          <p className="bw-done-sub">
            This wizard is your Infrastructure screen from here — come back to add
            rooms, move racks, repair limits or rehearse a revision. Work on
            Define the Launch continues while the crews build.
          </p>
        </section>

        <ul className="bw-receipt">
          {plan.lines.map((line) => (
            <li key={line.id}><span>{line.label}</span><b>{money(line.amount)}</b></li>
          ))}
          <li><span>Complete launch plan</span><b>{money(launchPlanTotal)}</b></li>
          <li><span>Paid before commissioning</span><b className="sf-tone-good">−{money(alreadyPaid)}</b></li>
          <li className="is-total"><span>Released from treasury</span><b>{money(commissionNow)}</b></li>
          {(plan.deferred ?? 0) > 0 && <li><span>Reserved for opening night</span><b>{money(plan.deferred ?? 0)}</b></li>}
        </ul>

        {/* Commissioning is not a dead end: the wizard is the Infrastructure
            screen from here, and a revision is just another drawing. */}
        <div className="lw-actions">
          <button type="button" className="sf-btn sf-btn--ghost" onClick={() => { setDone(false); onJump('sites'); }}>
            Plan a revision
          </button>
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onOpeningNight?.()}>
            Opening night
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* --- the gates ------------------------------------------------------- */}
      <section className={blocked ? 'bw-gates is-blocked' : 'bw-gates'}>
        <p className="sf-eyebrow">Launch gates</p>
        <ul>
          {list.map((gate) => (
            <li key={gate.id}>
              <button type="button" className={gate.ok ? 'bw-gate is-ok' : 'bw-gate'} onClick={() => onJump(gate.stage)}>
                <i aria-hidden="true">{gate.ok ? '✓' : '×'}</i>
                <span><b>{gate.label}</b><em>{gate.value}</em></span>
              </button>
            </li>
          ))}
        </ul>
        <p className="bw-gates-line">
          {blocked ? 'Finish the red gates before steel moves.' : 'Every launch gate has an answer.'}
        </p>
      </section>

      {definitionOpen.length > 0 && (
        <section className="bw-gates is-blocked">
          <p className="sf-eyebrow">Define the Launch still needs answers</p>
          <ul>
            {definitionOpen.map(check => (
              <li key={check.id}>
                <button type="button" className="bw-gate" onClick={() => handlers.onOpenDefine?.(check.step)}>
                  <i aria-hidden="true">×</i>
                  <span><b>{check.label}</b><em>{check.detail}</em></span>
                </button>
              </li>
            ))}
          </ul>
          <p className="bw-gates-line">Open an item, confirm it there, then return to this contract.</p>
        </section>
      )}

      {/* --- what will be signed ---------------------------------------------- */}
      <section className="bw-contract">
        <p className="sf-eyebrow">The contract</p>
        <ul className="bw-contract-list">
          {draft.facilities.map((facility) => {
            const listing = listingFor(data, facility);
            const city = cityFor(data, facility);
            return (
              <li key={facility.id}>
                <b>{city?.name}</b>
                <em>{listing?.name} · {facilityRacks(facility)} racks</em>
                <s>{(listing?.moveIn ?? 0) > 0 ? money(listing?.moveIn ?? 0) : 'Included'}</s>
              </li>
            );
          })}
          {draft.facilities.length === 0 && <li className="bw-contract-empty">Nothing leased. There is no build to commission.</li>}
        </ul>
        <ul className="bw-receipt bw-cost-summary" aria-label="Complete launch cost summary">
          <li><span>Complete launch plan</span><b>{money(launchPlanTotal)}</b></li>
          <li><span>Already paid</span><b className="sf-tone-good">−{money(alreadyPaid)}</b></li>
          <li className="is-total"><span>Due at commissioning</span><b>{money(commissionNow)}</b></li>
          {(plan.deferred ?? 0) > 0 && <li><span>Paid on opening night</span><b>{money(plan.deferred ?? 0)}</b></li>}
        </ul>
        <p className="lw-rule">
          Commissioning is the moment the drawing becomes a paid, persistent
          network. {money(commissionNow)} leaves the treasury and the contracts
          execute.
          {(plan.deferred ?? 0) > 0 && ` ${money(plan.deferred ?? 0)} remains reserved for opening night.`}
        </p>
      </section>

      {rolling && (
        <Cutscene
          beats={beats}
          brandHex={data.company.brandHex}
          onComplete={commit}
          onClose={() => setRolling(false)}
          closeLabel="See the receipt"
          finale={(
            <>
              <span className="cine-crest" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5l5.2 5.2L20 7" />
                </svg>
              </span>
              <p className="cine-eyebrow">Rev A · executed</p>
              <h2>Commissioned</h2>
              <p className="cine-quote">
                {totals.weeks > 0
                  ? `The crews start Monday. ${data.company.name} is operational in ${totals.weeks} weeks.`
                  : `${data.company.name} is operational tonight.`}
              </p>
              <div className="cine-figs">
                <div><em>Cities</em><b>{totals.cities}</b></div>
                <div><em>Racks</em><b>{totals.racks}</b></div>
                <div><em>Released</em><b>{money(commissionNow)}</b></div>
                <div><em>Can carry</em><b>{compactCount(totals.capacity)}</b></div>
              </div>
            </>
          )}
        />
      )}

      <div className="lw-actions">
        {canOverride && (
          <button type="button" className="sf-btn sf-btn--ghost" onClick={() => { patch({ override: true }); setRolling(true); }}>
            Build it anyway
          </button>
        )}
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          disabled={blocked && !canOverride}
          onClick={() => setRolling(true)}
        >
          {blocked && !canOverride ? `${open.length + definitionOpen.length} gates still red` : `Commission · ${money(commissionNow)}`}
        </button>
      </div>

      {commitError && <p className="bw-commit-error" role="alert">{commitError}</p>}

      {draft.override && (
        <p className="bw-override">
          Founder override recorded. If opening night goes badly, this is the line
          the board will read back to you.
        </p>
      )}
    </>
  );
}
