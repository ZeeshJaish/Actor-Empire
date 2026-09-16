/* ============================================================================
   5 · Launch — turn the drawing into a paid, persistent network.

   Commissioning is the only moment in this wizard that spends money, so it is
   the only moment that takes its time: six steps, drawn, with the money leaving
   the treasury at step five. Every gate must be current before that sequence
   can begin.
   ========================================================================== */

import { useCallback, useMemo, useState } from 'react';
import type { BuildStageId } from '../../finance/build';
import { cityFor, constructionProgress, facilityRacks, facilityRoomLabel, gates, listingFor } from '../../finance/build';
import type { StageProps } from './BuildWizard';
import { compactCount, money } from '../../finance/format';
import { Cutscene } from '../cine/Cutscene';
import { commissionBeats } from '../cine/CommissionCut';

export function StageLaunch({ data, draft, totals, plan, handlers, onJump }: StageProps & { onJump: (stage: BuildStageId) => void }) {
  const [rolling, setRolling] = useState(false);
  const [done, setDone] = useState(data.commissioned);
  const [commitError, setCommitError] = useState('');
  const list = gates(data, draft);
  const open = list.filter((g) => !g.ok);
  const definitionChecks = data.defineLaunchChecks || [];
  const definitionOpen = definitionChecks.filter(check => !check.complete);
  const blocked = open.length > 0 || definitionOpen.length > 0;
  const readyCount = list.filter(gate => gate.ok).length
    + definitionChecks.filter(check => check.complete).length;
  const requirementCount = list.length + definitionChecks.length;
  const readinessPercent = requirementCount > 0 ? readyCount / requirementCount * 100 : 0;
  const finalProof = list.find(gate => gate.id === 'rehearsal');
  const preparationGates = list.filter(gate => gate.id !== 'rehearsal');
  const commissionNow = plan.commissionNow ?? plan.total;
  const alreadyPaid = plan.lines
    .filter(line => line.timing === 'SETTLED')
    .reduce((sum, line) => sum + line.amount, 0);
  const launchPlanTotal = alreadyPaid + plan.total;
  const construction = data.construction
    ? constructionProgress(data.company.week, data.construction.committedAtWeek, data.construction.readyAtWeek)
    : null;
  const constructionLocked = construction?.status === 'BUILDING';

  /* Commissioning is the only moment in this wizard that spends money, so it
     is the only moment that stops being a screen. The sequence plays full
   bleed; the charge happens when it reaches its end card. Charged exactly once — `done` never
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
    () => commissionBeats(
      totals,
      plan,
      cityList,
      data.company.name,
      data.company.signatoryName ?? data.company.name,
    ),
    [totals, plan, cityList, data.company.name, data.company.signatoryName],
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

  const beginCommission = () => {
    const validation = handlers.onValidateCommission?.(draft);
    if (validation && !validation.ok) {
      setCommitError(validation.message);
      return;
    }
    setCommitError('');
    setRolling(true);
  };

  if (done) {
    return (
      <>
        <section className="bw-done">
          <span className="bw-done-mark" aria-hidden="true"><i /><i /><i /></span>
          <b>{constructionLocked ? 'Construction underway' : 'Operational'}</b>
          <p>
            {constructionLocked && construction
              ? `${totals.cities} cities and ${totals.racks} racks are being built. ${construction.remainingWeeks} ${construction.remainingWeeks === 1 ? 'week remains' : 'weeks remain'} until the network is operational.`
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
          <button type="button" className="sf-btn sf-btn--ghost" disabled={constructionLocked} onClick={() => { setDone(false); onJump('sites'); }}>
            {constructionLocked ? 'Configuration locked' : 'Plan a revision'}
          </button>
          <button type="button" className="sf-btn sf-btn--primary" disabled={constructionLocked} onClick={() => handlers.onOpeningNight?.()}>
            {constructionLocked && construction
              ? `Opening night · ${construction.remainingWeeks} ${construction.remainingWeeks === 1 ? 'week' : 'weeks'} remaining`
              : 'Opening night'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* --- one compact readiness board: six preparation gates and one final proof --- */}
      <section className={blocked ? 'bw-launch-readiness is-blocked' : 'bw-launch-readiness'}>
        <header className="bw-launch-readiness-head">
          <span>
            <p className="sf-eyebrow">Commissioning readiness</p>
            <strong>{readyCount} of {requirementCount} ready</strong>
          </span>
          <b className={blocked ? 'is-blocked' : 'is-ready'}>
            {blocked ? `${open.length + definitionOpen.length} open` : 'Ready'}
          </b>
        </header>

        <div
          className="bw-launch-readiness-meter"
          role="progressbar"
          aria-label="Commissioning readiness"
          aria-valuemin={0}
          aria-valuemax={requirementCount}
          aria-valuenow={readyCount}
        >
          <i style={{ width: `${readinessPercent}%` }} />
        </div>

        <ul className="bw-launch-gate-grid">
          {preparationGates.map(gate => (
            <li key={gate.id}>
              <button type="button" className={gate.ok ? 'bw-launch-gate is-ok' : 'bw-launch-gate'} onClick={() => onJump(gate.stage)}>
                <i aria-hidden="true">{gate.ok ? '✓' : '×'}</i>
                <span><b>{gate.label}</b><em>{gate.value}</em></span>
              </button>
            </li>
          ))}
        </ul>

        {finalProof && (
          <button
            type="button"
            className={finalProof.ok ? 'bw-final-proof is-ok' : 'bw-final-proof'}
            onClick={() => onJump(finalProof.stage)}
          >
            <span className="bw-final-proof-mark" aria-hidden="true">{finalProof.ok ? '✓' : '×'}</span>
            <span><em>Final proof</em><b>{finalProof.label}</b><small>{finalProof.value}</small></span>
            <i aria-hidden="true">→</i>
          </button>
        )}

        <p className="bw-launch-readiness-line">
          {blocked ? 'Open a red item to finish the commissioning record.' : 'Every gate is current. This network is ready to sign.'}
        </p>
      </section>

      {definitionOpen.length > 0 && (
        <section className="bw-launch-blockers" aria-label="Define the Launch blockers">
          <header>
            <span><p className="sf-eyebrow">Define the Launch</p><b>Fix before commissioning</b></span>
            <em>{definitionOpen.length} open</em>
          </header>
          <ul>
            {definitionOpen.map(check => (
              <li key={check.id}>
                <button type="button" onClick={() => handlers.onOpenDefine?.(check.step)}>
                  <span><b>{check.label}</b><em>{check.detail}</em></span>
                  <i aria-hidden="true">Fix →</i>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- what will be signed ---------------------------------------------- */}
      <section className="bw-contract">
        <header className="bw-contract-head">
          <span><p className="sf-eyebrow">The contract</p><b>Rooms being commissioned</b></span>
          <em>{draft.facilities.length} {draft.facilities.length === 1 ? 'room' : 'rooms'}</em>
        </header>
        <ul className="bw-contract-list">
          {draft.facilities.map((facility) => {
            const listing = listingFor(data, facility);
            return (
              <li key={facility.id}>
                <span><b>{facilityRoomLabel(data, draft.facilities, facility)}</b><em>{listing?.name}</em></span>
                <span><small>{facilityRacks(facility)} {facilityRacks(facility) === 1 ? 'rack' : 'racks'}</small><s>{(listing?.moveIn ?? 0) > 0 ? money(listing?.moveIn ?? 0) : 'Included'}</s></span>
              </li>
            );
          })}
          {draft.facilities.length === 0 && <li className="bw-contract-empty">Nothing leased. There is no build to commission.</li>}
        </ul>

        <div className="bw-launch-costs" aria-label="Complete launch cost summary">
          <span><em>Plan total</em><b>{money(launchPlanTotal)}</b></span>
          <span><em>Already paid</em><b className="sf-tone-good">−{money(alreadyPaid)}</b></span>
          <span className="is-due"><em>Due now</em><b>{money(commissionNow)}</b></span>
        </div>
        {(plan.deferred ?? 0) > 0 && (
          <div className="bw-launch-reserve"><span>Opening-night reserve</span><b>{money(plan.deferred ?? 0)}</b></div>
        )}
        <p className="bw-contract-note">Commissioning executes every room contract and turns this drawing into persistent infrastructure.</p>
      </section>

      {rolling && (
        <Cutscene
          beats={beats}
          brandHex={data.company.brandHex}
          navigation="timed"
          onComplete={commit}
          onClose={() => setRolling(false)}
          closeLabel="Track the opening programme"
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
                  ? `Construction begins now. ${data.company.name} is operational in ${totals.weeks} weeks.`
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

      {!blocked && (
        <div className="lw-actions bw-commission-action">
          <button type="button" className="sf-btn sf-btn--primary" onClick={beginCommission}>
            Commission · {money(commissionNow)}
          </button>
        </div>
      )}

      {commitError && <p className="bw-commit-error" role="alert">{commitError}</p>}

    </>
  );
}
