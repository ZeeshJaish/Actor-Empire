/* ============================================================================
   2 · Market clearance — pay to enter, then wait for the state to say yes.

   Every version of this screen has been a fight against length. A stacked list
   of full cards, one per market, is unreadable at four markets and absurd at
   twelve. So the markets became a strip — flag, code, a status dot — and only
   the one you are looking at opens underneath. One market, one glance.

   Money is charged only on confirmation.

   #111: the count is a gauge with a legend, so the bar's four colours say what
   they are; the review's five stages are named under their dots; and the note
   under the gauge reads the whole board (it said "Nothing filed yet" with every
   market cleared).
   ========================================================================== */

import { useState } from 'react';
import { CLEARANCE_STAGES, type ClearanceOutcome, type ClearanceStage, type ClearanceState } from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { money } from '../../finance/format';
import { FlagField, flagAccent } from '../FlagField';
import {
  STREAMING_MARKET_REAPPLICATION_ENERGY,
  STREAMING_MARKET_REQUIREMENT_ENERGY,
} from '../../../../services/streamingMarkets';
import { quoteStreamingMarketFilingEnergy } from '../../../../services/streamingMarketFilingQuote';

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

/* The five stages in a word each, under their dots. */
const STAGE_WORD: Record<ClearanceStage, string> = {
  FILED: 'Filed', RIGHTS: 'Access', REGULATORY: 'Review', COMPLIANCE: 'Data', APPROVAL: 'Approval',
};

/* 2026-11-11 (player reports): a declined market showed an active "File again"
   that the government refused for two weeks, with no word on screen; a Pay
   button greyed out on a money rule while its label still said "Pay"; and a
   stuck country could never leave the opening. Now the wait is a countdown,
   every short button says what is short and where to fix it, every action
   says what happened, a market that has not cleared can be dropped before
   the commission, and the requests and refiles go in one tap. */
const weeks = (n: number) => `${n} week${n === 1 ? '' : 's'}`;
type Note = { ok: boolean; message: string; countryId?: string };

export function StepClearance({ data, draft, chosen, free, handlers, initialCountryId, operations, patch }: StepProps) {
  const byCountry = new Map(data.clearance.map((c) => [c.countryId, c]));
  const firstCountry = chosen.find(country=>country.id===initialCountryId)
    || chosen.find(country=>!operations && !draft.selectedCountryIds.includes(country.id))
    || chosen.find(country=>NEEDS_PLAYER.includes(byCountry.get(country.id)?.outcome || 'NOT_FILED')) || chosen[0];
  const [openId, setOpenId] = useState<string | undefined>(firstCountry?.id);
  const [region, setRegion] = useState(firstCountry?.region || data.regions[0]);
  const [note, setNote] = useState<Note | null>(null);
  const [dropping, setDropping] = useState<string | null>(null);
  const say = (result: { ok: boolean; message?: string } | void, countryId?: string) => {
    if (result && result.message) setNote({ ok: result.ok, message: result.message, countryId });
  };
  const toFinance = () => handlers.onOpenStudioFinance?.();

  if (chosen.length === 0) {
    return <p className="lw-empty">{operations ? 'Plan a market entry first. Its filing and clearance will appear here.' : 'Choose opening markets first — there is nothing to clear yet.'}</p>;
  }

  const stateOf = (id: string): ClearanceState =>
    byCountry.get(id) ?? { countryId: id, outcome: 'NOT_FILED', stage: 'FILED' };

  const states = chosen.map((c) => stateOf(c.id).outcome);
  const cleared = states.filter((s) => s === 'APPROVED' || s === 'CONDITIONS').length;
  const waiting = states.filter((s) => s === 'IN_REVIEW' || s === 'DELAYED').length;
  const needsYou = states.filter((s) => NEEDS_PLAYER.includes(s)).length;
  /* declined and still in the government's cooling period: nothing to do but wait (or drop it) */
  const cooling = chosen.filter((c) => (stateOf(c.id).refileInWeeks || 0) > 0);
  const soonest = cooling.length ? Math.min(...cooling.map((c) => stateOf(c.id).refileInWeeks || 0)) : 0;
  const actionable = needsYou - cooling.length;
  const energy = data.energy.current;
  /* one tap for every request that is owed, cheapest first, as far as the free treasury and energy go */
  const owed = chosen.filter((c) => stateOf(c.id).requirement)
    .sort((left, right) => (stateOf(left.id).requirement?.cost || 0) - (stateOf(right.id).requirement?.cost || 0));
  let owedSpend = 0;
  const payable: typeof owed = [];
  for (const country of owed) {
    const cost = stateOf(country.id).requirement?.cost || 0;
    if (owedSpend + cost > free || (payable.length + 1) * STREAMING_MARKET_REQUIREMENT_ENERGY > energy) break;
    owedSpend += cost;
    payable.push(country);
  }
  const refilable = chosen.filter((c) => {
    const st = stateOf(c.id);
    return (st.outcome === 'REJECTED' || st.outcome === 'REVISABLE') && !(st.refileInWeeks || 0);
  });
  const refileNow = refilable.slice(0, Math.floor(energy / STREAMING_MARKET_REAPPLICATION_ENERGY));
  const unfiled = chosen.filter((c) => stateOf(c.id).outcome === 'NOT_FILED');
  const due = unfiled.reduce((sum, c) => sum + c.rightsEstimate + c.complianceCost, 0);
  const filingEnergy = quoteStreamingMarketFilingEnergy(unfiled.map(country => country.id));
  const short = Math.max(0, due - free);

  /* 2026-11-11: with up to 197 markets the strip leads with the ones that need the player, then the
     ones still in review, then the unfiled, then the cleared (they were in pick order before) */
  /* 2026-11-12: filed markets the player took off the plan lead the strip, so they are found and dropped */
  const isOffPlan = (id: string) => !operations && !draft.selectedCountryIds.includes(id);
  const rank = (id: string) => {
    const st = stateOf(id);
    if (isOffPlan(id)) return -1;
    if (NEEDS_PLAYER.includes(st.outcome)) return (st.refileInWeeks || 0) > 0 ? 1 : 0;
    if (st.outcome === 'IN_REVIEW' || st.outcome === 'DELAYED') return 2;
    return st.outcome === 'NOT_FILED' ? 3 : 4;
  };
  const ordered = chosen.map((country, index) => ({ country, index }))
    .sort((left, right) => rank(left.country.id) - rank(right.country.id) || left.index - right.index)
    .map((item) => item.country);
  const visibleCountries = operations ? ordered.filter(country=>country.region===region) : ordered;
  const active = visibleCountries.find((c) => c.id === openId) ?? visibleCountries[0] ?? chosen[0];
  const state = stateOf(active.id);
  const singleFilingEnergy = quoteStreamingMarketFilingEnergy([active.id]);
  const outcome = OUTCOME[state.outcome];
  const stageIndex = CLEARANCE_STAGES.findIndex((s) => s.id === state.stage);
  const walking = state.outcome !== 'NOT_FILED';
  const done = state.outcome === 'APPROVED' || state.outcome === 'CONDITIONS';
  const offPlan = isOffPlan(active.id);
  const coolingWeeks = state.refileInWeeks || 0;
  const fileCost = active.rightsEstimate + active.complianceCost;
  const drop = () => {
    const result = handlers.onWithdrawMarket?.(active.id);
    setDropping(null);
    if (result && result.ok) {
      /* the wizard's own draft drops it too, so its autosave never plans it again */
      patch({ selectedCountryIds: draft.selectedCountryIds.filter((id) => id !== active.id) });
      /* the next market that still needs the player, or the first left */
      setOpenId((ordered.find((c) => c.id !== active.id && rank(c.id) <= 1) ?? ordered.find((c) => c.id !== active.id))?.id);
      say(result);
      return;
    }
    say(result, active.id);
  };

  return (
    <>
      <section className="cl-hero">
        <div className="cl-hero-top">
          <div>
            <p className="sf-eyebrow">Markets cleared</p>
            <p className="cl-hero-figure">{cleared}<i>/{chosen.length}</i></p>
          </div>
          {unfiled.length > 0 && (
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

        <ul className="cl-legend" aria-hidden="true">
          {cleared > 0 && <li className="is-ok"><i />{cleared} cleared</li>}
          {waiting > 0 && <li className="is-wait"><i />{waiting} in review</li>}
          {needsYou > 0 && <li className="is-you"><i />{needsYou} need you</li>}
          {unfiled.length > 0 && <li className="is-none"><i />{unfiled.length} not filed</li>}
        </ul>

        <p className="cl-hero-note">
          {actionable > 0
            ? `${actionable} market${actionable > 1 ? 's are' : ' is'} waiting on you.${cooling.length ? ` ${cooling.length} declined: the first can file again in ${weeks(soonest)}.` : ''}`
            : cooling.length > 0
              ? `${cooling.length} declined market${cooling.length > 1 ? 's' : ''}: the first can file again in ${weeks(soonest)}. Weeks pass when you Age Up${chosen.some((c) => stateOf(c.id).canWithdraw) ? ', or drop a market from the opening' : ''}.`
            : cleared === chosen.length
              ? (operations ? 'All filed markets are cleared. Review a country below for its ongoing obligations.' : 'Every market is cleared for opening day.')
              : waiting > 0
                ? `${waiting} under review. Reviews move a stage each week you Age Up.`
                : unfiled.length === chosen.length
                  ? 'Nothing filed yet. Reviews run 4–6 weeks once they start.'
                  : `${unfiled.length} still to file.`}
        </p>

        {/* 2026-11-11: the players' "do it all at once" */}
        {(owed.length > 1 || refilable.length > 1) && (
          <div className="cl-bulk">
            {owed.length > 1 && (
              <button
                type="button"
                className="sf-btn sf-btn--primary"
                disabled={!payable.length && energy < STREAMING_MARKET_REQUIREMENT_ENERGY}
                onClick={() => (payable.length ? say(handlers.onSubmitAllRequirements?.(payable.map((c) => c.id))) : toFinance())}
              >
                {payable.length === owed.length
                  ? `Pay all ${owed.length} requests · ${money(owedSpend)} · ${owed.length * STREAMING_MARKET_REQUIREMENT_ENERGY}E`
                  : payable.length
                    ? `Pay ${payable.length} of ${owed.length} now · ${money(owedSpend)} · ${payable.length * STREAMING_MARKET_REQUIREMENT_ENERGY}E`
                    : energy < STREAMING_MARKET_REQUIREMENT_ENERGY
                      ? `${STREAMING_MARKET_REQUIREMENT_ENERGY - energy}E short to pay requests`
                      : `${money((stateOf(owed[0].id).requirement?.cost || 0) - free)} short · Add capital`}
              </button>
            )}
            {refilable.length > 1 && (
              <button
                type="button"
                className="sf-btn sf-btn--ghost"
                disabled={!refileNow.length}
                onClick={() => say(handlers.onRefileAll?.(refileNow.map((c) => c.id)))}
              >
                {refileNow.length === refilable.length
                  ? `File all ${refilable.length} again · ${refilable.length * STREAMING_MARKET_REAPPLICATION_ENERGY}E`
                  : refileNow.length
                    ? `File ${refileNow.length} of ${refilable.length} again · ${refileNow.length * STREAMING_MARKET_REAPPLICATION_ENERGY}E`
                    : `${STREAMING_MARKET_REAPPLICATION_ENERGY - energy}E short to file again`}
              </button>
            )}
          </div>
        )}
        {note && !note.countryId && <p className={`cl-msg ${note.ok ? 'is-ok' : 'is-bad'}`} role="status">{note.message}</p>}
      </section>

      {/* --- the markets as a strip, not a stack --------------------------- */}
      {operations && <label className="cl-region-filter">Region
        <select value={region} onChange={event=>{setRegion(event.target.value);setOpenId(undefined);}}>
          {data.regions.filter(name=>chosen.some(country=>country.region===name)).map(name=><option key={name} value={name}>{name} · {chosen.filter(country=>country.region===name).length} markets</option>)}
        </select>
      </label>}
      <div className="cl-strip" role="tablist" aria-label="Market">
        {visibleCountries.map((country) => {
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
              onClick={() => { setOpenId(country.id); setDropping(null); setNote(null); }}
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
          <span className={`cl-panel-pill sf-tone-${coolingWeeks ? 'bad' : outcome.tone}`}>{coolingWeeks ? `Declined · ${weeks(coolingWeeks)} wait` : outcome.label}</span>
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
          <div className="cl-track-names" aria-hidden="true">
            {CLEARANCE_STAGES.map((stage, si) => (
              <span key={stage.id} className={done || (walking && si <= stageIndex) ? 'is-done' : undefined}>{STAGE_WORD[stage.id]}</span>
            ))}
          </div>

          <p className={`cl-stage${state.outcome === 'IN_REVIEW' ? ' is-filed' : ''}`}>
            {done
              ? 'Cleared for opening day'
              : state.outcome === 'REVISABLE' || state.outcome === 'REJECTED'
                ? (coolingWeeks
                  ? `Declined for now · can file again in ${weeks(coolingWeeks)}. Weeks pass when you Age Up.`
                  : 'Declined for now · you can file a revised application today.')
              : walking
                ? <><span aria-hidden="true">✓</span> {CLEARANCE_STAGES[stageIndex].label}{state.weeksRemaining ? ` · ${state.weeksRemaining} weeks left` : ''}</>
                : `Not filed · ${active.dossier.approvalWeeks} once it starts`}
          </p>

          {/* filed: what it cost and what the next step takes, not a "To file" price it will never charge again */}
          <div className="cl-costs">
            <span><em>Market access</em><b>{money(active.rightsEstimate)}</b></span>
            <span><em>Compliance</em><b>{money(active.complianceCost)}</b></span>
            {walking ? (
              <>
                <span>
                  <em>{state.outcome === 'REVISABLE' || state.outcome === 'REJECTED' ? 'To file again' : state.requirement ? 'Request' : 'Review left'}</em>
                  <b>{state.outcome === 'REVISABLE' || state.outcome === 'REJECTED'
                    ? `${STREAMING_MARKET_REAPPLICATION_ENERGY}E`
                    : state.requirement
                      ? money(state.requirement.cost || 0)
                      : done ? '—' : state.weeksRemaining ? weeks(state.weeksRemaining) : '—'}</b>
                </span>
                <span className="is-total"><em>Paid so far</em><b>{money(state.paid ?? fileCost)}</b></span>
              </>
            ) : (
              <>
                <span><em>Founder time alone</em><b>{singleFilingEnergy}E</b></span>
                <span className="is-total"><em>To file</em><b>{money(fileCost)}</b></span>
              </>
            )}
          </div>

          {state.note && <p className="cl-note">{state.note}</p>}

          {state.requirement && (
            <div className="cl-req">
              <span>{state.requirement.label}</span>
              <button
                type="button"
                className="sf-btn sf-btn--ghost"
                disabled={energy < STREAMING_MARKET_REQUIREMENT_ENERGY}
                onClick={() => ((state.requirement?.cost || 0) > free ? toFinance() : say(handlers.onSubmitRequirement?.(active.id), active.id))}
              >
                {energy < STREAMING_MARKET_REQUIREMENT_ENERGY
                  ? `${STREAMING_MARKET_REQUIREMENT_ENERGY - energy}E short`
                  : (state.requirement.cost || 0) > free
                    ? `${money((state.requirement.cost || 0) - free)} short · Add capital`
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
              disabled={energy < singleFilingEnergy}
              onClick={() => (fileCost > free ? toFinance() : say(handlers.onBeginMarketEntry?.([active.id], draft.selectedCountryIds), active.id))}
            >
              {energy < singleFilingEnergy
                ? `${singleFilingEnergy - energy}E short for ${active.name}`
                : fileCost > free
                ? `${money(fileCost - free)} short for ${active.name} · Add capital`
                : `File ${active.name} · ${money(fileCost)} · ${singleFilingEnergy}E`}
            </button>
          )}

          {(state.outcome === 'REJECTED' || state.outcome === 'REVISABLE') && (
            <button
              type="button"
              className="sf-btn sf-btn--ghost"
              disabled={coolingWeeks > 0 || energy < STREAMING_MARKET_REAPPLICATION_ENERGY}
              onClick={() => say(handlers.onFileRevisedApplication?.(active.id), active.id)}
            >
              {coolingWeeks > 0
                ? `Can file again in ${weeks(coolingWeeks)}`
                : energy < STREAMING_MARKET_REAPPLICATION_ENERGY
                ? `${STREAMING_MARKET_REAPPLICATION_ENERGY - energy}E short to refile`
                : `File again · ${STREAMING_MARKET_REAPPLICATION_ENERGY}E`}
            </button>
          )}

          {note?.countryId === active.id && <p className={`cl-msg ${note.ok ? 'is-ok' : 'is-bad'}`} role="status">{note.message}</p>}

          {/* 2026-11-12: a filed market taken off the plan used to vanish from this page while the launch
              checks, the Build and the launch still counted it. It stays here, marked, until it is dropped. */}
          {offPlan && (
            <p className="cl-msg is-bad" role="status">
              You took {active.name} off the plan, but its filing still stands, so the launch still counts it.
              {state.canWithdraw ? ' Drop it below to leave it out.' : ''}
            </p>
          )}

          {state.canWithdraw && (dropping === active.id ? (
            <div className="cl-drop-confirm" role="group" aria-label={`Drop ${active.name} from the opening`}>
              <p>
                {done
                  ? `${active.name} leaves the opening plan and will not open on launch night.`
                  : `${active.name} leaves the opening plan, and the launch no longer waits on it.`}
                {(state.paid || 0) > 0 ? ` The ${money(state.paid || 0)} already paid stays spent.` : ' Nothing has been paid for it yet.'}
              </p>
              <div>
                <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setDropping(null)}>Keep it</button>
                <button type="button" className="sf-btn sf-btn--ghost cl-drop-go" onClick={drop}>Drop {active.name}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="cl-drop" onClick={() => { setDropping(active.id); setNote(null); }}>
              Drop {active.name} from the opening
            </button>
          ))}
        </div>
      </section>

      {/* Filing everything at once is the convenience; the panel above files
         one market on its own, so a shortfall on the expensive market never
         blocks the cheap one. */}
      {unfiled.length > 1 && (
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          disabled={energy < filingEnergy}
          onClick={() => (short > 0 ? toFinance() : say(handlers.onBeginMarketEntry?.(unfiled.map((c) => c.id), draft.selectedCountryIds)))}
        >
          {energy < filingEnergy
            ? `${filingEnergy - energy}E short to file all ${unfiled.length}`
            : short > 0
            ? `${money(short)} short to file all ${unfiled.length} · Add capital`
            : `File all ${unfiled.length} · ${money(due)} · ${filingEnergy}E`}
        </button>
      )}
      {unfiled.length === 0 && <p className="lw-rule">Every market is filed. Reviews run on their own from here.</p>}
    </>
  );
}
