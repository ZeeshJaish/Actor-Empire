/* ============================================================================
   5 · Launch — turn the drawing into a paid, persistent network.

   Commissioning is the only moment in this wizard that spends money, so it is
   the only moment that takes its time: six steps, drawn, with the money leaving
   the treasury at step five. Every gate must be current before that sequence
   can begin.
   ========================================================================== */

import { useCallback, useMemo, useState } from 'react';
import type { BuildStageId } from '../../finance/build';
import { kitWords, cityFor, constructionProgress, facilityRacks, facilityRoomLabel, gates, listingFor } from '../../finance/build';
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
  /* A contract is with someone. The rooms were a flat list; they are grouped
     under the provider whose contract executes, which is what a schedule to an
     agreement actually looks like. */
  const providers = useMemo(() => {
    const groups = new Map<string, { provider: string; rooms: Array<{ id: string; label: string; racks: number; moveIn: number }>; racks: number; moveIn: number }>();
    for (const facility of draft.facilities) {
      const listing = listingFor(data, facility);
      const provider = listing?.provider ?? 'Unnamed provider';
      const group = groups.get(provider) ?? { provider, rooms: [], racks: 0, moveIn: 0 };
      group.rooms.push({
        id: facility.id,
        label: facilityRoomLabel(data, draft.facilities, facility),
        racks: facilityRacks(facility),
        moveIn: listing?.moveIn ?? 0,
      });
      group.racks += facilityRacks(facility);
      group.moveIn += listing?.moveIn ?? 0;
      groups.set(provider, group);
    }
    return [...groups.values()].sort((left, right) => right.racks - left.racks);
  }, [data, draft.facilities]);

  /* One list of everything that must be true, whichever screen owns it — a
     Build gate and a Define the Launch check are the same kind of thing to the
     person about to sign, and they were in two sections counted separately. */
  const items = useMemo(() => {
    const all = [
      ...list.map(gate => ({
        id: gate.id,
        label: gate.label,
        value: gate.value,
        ok: gate.ok,
        proof: gate.id === 'rehearsal',
        where: 'Open',
        fix: () => onJump(gate.stage),
      })),
      ...definitionChecks.map(check => ({
        id: `define:${check.id}`,
        label: check.label,
        value: check.detail,
        ok: check.complete,
        proof: false,
        where: 'Fix',
        fix: () => handlers.onOpenDefine?.(check.step),
      })),
    ];
    /* The rehearsal is the last word on whether this works, so when it is open
       it is the first thing to fix. */
    const open = all.filter(item => !item.ok).sort((left, right) => Number(right.proof) - Number(left.proof));
    return { open, cleared: all.filter(item => item.ok) };
  }, [definitionChecks, handlers, list, onJump]);
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
              ? `${kitWords(totals, ' and ')} across ${totals.cities} ${totals.cities === 1 ? 'city' : 'cities'} are being built. ${construction.remainingWeeks} ${construction.remainingWeeks === 1 ? 'week remains' : 'weeks remain'} until the network is operational.`
              : `${kitWords(totals, ' and ')} across ${totals.cities} ${totals.cities === 1 ? 'city' : 'cities'} are operational.`}
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
          <button type="button" className="sf-btn sf-btn--ghost" disabled={constructionLocked} onClick={() => { setDone(false); onJump('network'); }}>
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
      {/* --- everything that must be true before you sign --------------------
          This was a board of six cards in two columns, mostly green, with the
          Define the Launch blockers in a second section underneath. Fourteen
          checks of which eleven are fine is eleven cards saying so and three
          saying something. The open ones are the page now; the cleared ones are
          one line you can open — the same rule the rehearsal screen learned. */}
      <section id="bw-commission-guidance" className={blocked ? 'bw-sign is-blocked' : 'bw-sign'}>
        <p className="kit-title">
          <b>Before you sign</b>
          <em>{readyCount} of {requirementCount} ready</em>
        </p>

        <div
          className="bw-sign-meter"
          role="progressbar"
          aria-label="Commissioning readiness"
          aria-valuemin={0}
          aria-valuemax={requirementCount}
          aria-valuenow={readyCount}
        >
          <i className={blocked ? '' : 'is-ready'} style={{ width: `${readinessPercent}%` }} />
        </div>

        {items.open.length > 0 ? (
          <>
            <p className="bw-sign-head">Fix before commissioning<em>{items.open.length} open</em></p>
            <ul className="bw-sign-list">
              {items.open.map(item => (
                <li key={item.id} className={item.proof ? 'is-proof' : undefined}>
                  <button type="button" onClick={item.fix}>
                    <i aria-hidden="true" />
                    <span>
                      <b>{item.proof ? `Final proof · ${item.label}` : item.label}</b>
                      <em>{item.value}</em>
                    </span>
                    <s>{item.where} →</s>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="bw-sign-clear">Every check is current. This network is ready to sign.</p>
        )}

        {items.cleared.length > 0 && (
          <details className="bw-sign-cleared">
            <summary>
              <b>{items.cleared.length} cleared</b>
              <em>{items.cleared.slice(0, 3).map(item => item.label).join(', ')}{items.cleared.length > 3 ? ` and ${items.cleared.length - 3} more` : ''}</em>
            </summary>
            <ul className="bw-sign-list">
              {items.cleared.map(item => (
                <li key={item.id} className="is-ok">
                  <button type="button" onClick={item.fix}>
                    <i aria-hidden="true" />
                    <span><b>{item.proof ? `Final proof · ${item.label}` : item.label}</b><em>{item.value}</em></span>
                    <s>{item.where} →</s>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* --- the agreement --------------------------------------------------
          This page asks whether this is the network you will pay for, so the
          thing under that question should be the thing you are about to sign.
          It was a card with a heading, a figure, a list of rooms and three cost
          tiles — true, and shaped like nothing. A commissioning agreement has
          parties, a schedule of what is acquired, a consideration, the terms
          that take effect on execution, and a line to sign on. All five are
          things this game already knows. */}
      {data.marketPlanning?.editable === false && data.markets.length === 0 ? (
        <section className="bw-market-no-quote">
          <h2>No commissioning agreement yet</h2>
          <p>File an opening market and draw its network before a room schedule or amount due can be quoted. Nothing can be signed from this preview.</p>
        </section>
      ) : <section className="bw-agreement">
        <header className="bw-agreement-head">
          <span>
            <em>Commissioning agreement</em>
            <b>{data.company.name}</b>
          </span>
          <s>Rev A</s>
        </header>

        <p className="bw-agreement-rule">
          Schedule A · rooms commissioned
          <em>
            {draft.facilities.length} {draft.facilities.length === 1 ? 'room' : 'rooms'}
            {providers.length > 0 && ` · ${providers.length} ${providers.length === 1 ? 'provider' : 'providers'}`}
          </em>
        </p>

        {providers.length === 0 ? (
          <p className="bw-agreement-empty">Nothing leased. There is no build to commission.</p>
        ) : (
          <ul className="bw-agreement-schedule">
            {providers.map(group => (
              <li key={group.provider}>
                <details className="bw-agreement-provider">
                  <summary className="bw-agreement-party">
                    <b>{group.provider}</b>
                    <em>{group.rooms.length} {group.rooms.length === 1 ? 'room' : 'rooms'} · {group.racks} racks · {money(group.moveIn)} room move-in</em>
                  </summary>
                  <ul>
                    {group.rooms.map(room => (
                      <li key={room.id}>
                        <span>{room.label}</span>
                        <s>{room.racks} {room.racks === 1 ? 'rack' : 'racks'}</s>
                        <b>{room.moveIn > 0 ? money(room.moveIn) : 'Included'}</b>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}

        <p className="bw-agreement-rule">Consideration</p>
        <dl className="bw-agreement-money">
          <div><dt>Plan total</dt><dd>{money(launchPlanTotal)}</dd></div>
          <div><dt>Already paid</dt><dd className="sf-tone-good">−{money(alreadyPaid)}</dd></div>
          {(plan.deferred ?? 0) > 0 && (
            <div><dt>Held for opening night</dt><dd>{money(plan.deferred ?? 0)}</dd></div>
          )}
          <div className="is-due"><dt>Due on execution</dt><dd>{money(commissionNow)}</dd></div>
        </dl>

        <p className="bw-agreement-rule">On execution</p>
        <ul className="bw-agreement-terms">
          <li>Every room above is contracted and {money(commissionNow)} leaves the treasury, once.</li>
          <li>
            {totals.weeks > 0
              ? `Construction begins. ${kitWords(totals, ' and ')} across ${totals.cities} ${totals.cities === 1 ? 'city' : 'cities'} are operational in ${totals.weeks} ${totals.weeks === 1 ? 'week' : 'weeks'}.`
              : `${kitWords(totals, ' and ')} across ${totals.cities} ${totals.cities === 1 ? 'city' : 'cities'} are operational tonight.`}
          </li>
          {(plan.deferred ?? 0) > 0 && (
            <li>{money(plan.deferred ?? 0)} stays reserved for opening night and is not charged now.</li>
          )}
          <li>The drawing becomes real infrastructure. A change after this is a revision, not an edit.</li>
        </ul>

        {/* The line you sign on. The name is the company's own signatory — the
            same one the commissioning sequence puts on the document. */}
        <div className="bw-agreement-sign">
          <span className="bw-agreement-line" aria-hidden="true" />
          <em>Signed for {data.company.name} by</em>
          <b>{data.company.signatoryName ?? data.company.name}</b>
        </div>
      </section>}

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
                <div><em>{totals.racks > 0 ? 'Racks' : 'Compute'}</em><b>{totals.racks > 0 ? totals.racks : totals.compute}</b></div>
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
