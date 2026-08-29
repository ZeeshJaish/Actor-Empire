/* ============================================================================
   3 · Money — does the whole launch fit inside the treasury?

   Pricing is not set here. It was decided in Define the Launch and is only
   read back, because two screens that can both change a price are two screens
   that will eventually disagree about it.
   ========================================================================== */

import type { StageProps } from './BuildWizard';
import { compactCount, money, moneyPrecise } from '../../finance/format';

export function StageMoney({ data, draft, patch, plan, handlers }: StageProps) {
  const campaign = data.campaigns.find((c) => c.id === draft.campaignId);

  return (
    <>
      <section className={plan.shortfall > 0 ? 'bw-money is-short' : 'bw-money'}>
        <p className="sf-eyebrow">Everything this launch commits</p>
        <p className="bw-money-figure">{money(plan.total)}</p>
        <p className={plan.shortfall > 0 ? 'sf-tone-bad' : 'sf-tone-good'}>
          {plan.shortfall > 0
            ? `You are ${money(plan.shortfall)} short. Add company capital or make the plan smaller.`
            : `${money(plan.headroom)} left in the treasury afterwards.`}
        </p>

        {/* Grouped, because eleven lines is a spreadsheet and four groups is a
            decision: what the network costs, what it costs to keep, what the
            content cost, and how loudly you open. */}
        <ul className="bw-lines">
          {plan.lines.map((line) => (
            <li key={line.id}>
              <span className="bw-line-top">
                <b>{line.label}</b>
                <s>{money(line.amount)}</s>
              </span>
              <span className="bw-line-bar"><i style={{ width: `${Math.min(100, (line.amount / Math.max(1, plan.lines.reduce((sum, item) => sum + item.amount, 0))) * 100)}%` }} /></span>
              {line.note && <em>{line.note}</em>}
            </li>
          ))}
        </ul>

        {plan.shortfall > 0 && (
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onOpenStudioFinance?.()}>
            Open Studio Finance
          </button>
        )}
      </section>

      {/* --- what was already decided ---------------------------------------- */}
      <section className="bw-pricing">
        <header>
          <p className="sf-eyebrow">Decided in Define the Launch</p>
          <button type="button" className="sf-link" onClick={() => handlers.onEditPricing?.()}>Edit pricing</button>
        </header>
        <div className="cr-tiles">
          <span><em>Revenue model</em><b className="bw-model">{data.pricing.model}</b></span>
          <span><em>On sale</em><b>{data.pricing.plans}<s>plans</s></b></span>
          <span><em>Per household</em><b>{moneyPrecise(data.pricing.arpu)}</b></span>
          <span><em>Reach</em><b>{compactCount(data.pricing.reach)}</b></span>
        </div>
        {data.pricing.plans === 0 && (
          <p className="bw-blocker">Nothing is on sale. Commissioning is blocked until at least one plan exists.</p>
        )}
        {data.pricing.problems.length > 0 && (
          <ul className="cr-risks">
            {data.pricing.problems.map((problem) => <li key={problem}><i aria-hidden="true">!</i>{problem}</li>)}
          </ul>
        )}
      </section>

      {/* --- how loudly you open ---------------------------------------------- */}
      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">Opening night awareness</p>
        <ul className="bw-campaigns">
          {data.campaigns.map((option) => {
            const on = draft.campaignId === option.id;
            return (
              <li key={option.id}>
                <button type="button" className={on ? 'bw-campaign is-on' : 'bw-campaign'} onClick={() => patch({ campaignId: option.id })}>
                  <span className="bw-campaign-top">
                    <b>{option.name}</b>
                    <s>{option.cost > 0 ? money(option.cost) : 'Free'}</s>
                  </span>
                  <em>{option.line}</em>
                  <span className="bw-campaign-lift">
                    <i style={{ width: `${Math.min(100, (option.multiplier / 2.6) * 100)}%` }} />
                    <s>{option.multiplier.toFixed(2)}× opening demand</s>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="lw-rule">
          Marketing buys attention, not capacity. Every extra household it brings
          arrives at the same racks — which is what the rehearsal is for.
        </p>
      </section>

      {campaign && campaign.multiplier > 1 && (
        <p className="bw-note">
          {campaign.name} is forecast to bring {compactCount(data.pricing.reach * campaign.multiplier)} households
          to opening night instead of {compactCount(data.pricing.reach)}.
        </p>
      )}
    </>
  );
}
