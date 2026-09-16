/* ============================================================================
   BUILD THE PLATFORM — the shell.

   Five stages that answer one question: can this service actually be delivered?
   Define the Launch decided what it is; this decides whether it exists.

   The shell owns the stage track, the budget rail, and the draft. Nothing here
   is charged: racks, leases, repairs and campaigns are a drawing until the
   commissioning sequence in the last stage runs.
   ========================================================================== */

import React, { useEffect, useMemo, useState } from 'react';
import type { BuildData, BuildDraft, BuildHandlers, BuildStageId } from '../../finance/build';
import {
  BUILD_STAGES, REDUNDANCY_COPY, STAGE_STATE_COPY,
  buildTotals, constructionProgress, headerLine, infrastructureMoneyPlan, moneyPlan, serviceForecast, stageStates,
} from '../../finance/build';
import type { BuildTeamProposal } from '../../finance/buildPlanner';
import type { LinkedBudgetSummary } from '../../finance/budgetLinks';
import { brandVars } from '../../finance/brand';
import { money } from '../../finance/format';
import { BuildBudgetContent } from '../BudgetSheets';
import { Row, Sheet } from '../ui';
import { StageSites } from './StageSites';
import { StagePlans } from './StagePlans';
import { StageMoney } from './StageMoney';
import { StageTest } from './StageTest';
import { StageLaunch } from './StageLaunch';
import '../../styles/tokens.css';
import '../../styles/studio-finance.css';
import '../../styles/launch.css';
import '../../styles/build.css';
import '../../styles/cine.css';

export interface BuildWizardProps extends BuildHandlers {
  data: BuildData;
  initialStage?: BuildStageId;
  initialDraft?: BuildDraft;
  initialSheet?: 'money' | 'build' | null;
  launchBudgetSummary?: LinkedBudgetSummary;
  onDraftChange?: (draft: BuildDraft) => void;
}

export function BuildWizard({ data, initialStage = 'sites', initialDraft, initialSheet, launchBudgetSummary, onDraftChange, ...handlers }: BuildWizardProps) {
  const [stageId, setStageId] = useState<BuildStageId>(initialStage);
  const [openSheet, setOpenSheet] = useState<'money' | 'build' | null>(initialSheet ?? null);
  const [draft, setDraft] = useState<BuildDraft>(() => initialDraft ?? ({
    facilities: [...data.existing],
    architecture: 'HYBRID',
    ownedShare: 0.6,
    doctrine: 'STANDARD',
    campaignId: data.campaigns[0]?.id ?? '',
    mode: 'ASSISTED',
    instructions: data.team,
    repairIds: [],
    rehearsal: null,
    override: false,
  }));
  const [teamProposal, setTeamProposal] = useState<BuildTeamProposal | null>(null);
  const externalRehearsal = initialDraft?.rehearsal ?? null;

  /* The full-screen legacy rehearsal persists its canonical result in the
     parent. Pull only that evidence back into this draft when the player
     returns, without resetting any uncommitted facilities or rack choices. */
  useEffect(() => {
    setDraft(prev => {
      const current = prev.rehearsal;
      const same = current?.signature === externalRehearsal?.signature
        && current?.verdict === externalRehearsal?.verdict
        && current?.peak === externalRehearsal?.peak
        && current?.failedPct === externalRehearsal?.failedPct;
      if (same || (!current && !externalRehearsal)) return prev;
      return { ...prev, rehearsal: externalRehearsal };
    });
  }, [externalRehearsal]);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const brand = useMemo(() => brandVars(data.company.brandHex), [data.company.brandHex]);
  const index = Math.max(0, BUILD_STAGES.findIndex((s) => s.id === stageId));

  const totals = useMemo(() => buildTotals(data, draft), [data, draft]);
  const states = useMemo(() => stageStates(data, draft), [data, draft]);
  const plan = useMemo(() => moneyPlan(data, draft), [data, draft]);
  const buildPlan = useMemo(() => infrastructureMoneyPlan(plan), [plan]);
  const services = useMemo(() => serviceForecast(data, draft), [data, draft]);
  const managed = draft.mode === 'ASSISTED' && Boolean(draft.teamPlanApproved);
  const construction = data.construction
    ? constructionProgress(data.company.week, data.construction.committedAtWeek, data.construction.readyAtWeek)
    : null;
  const constructionLocked = construction?.status === 'BUILDING';

  const patch = (next: Partial<BuildDraft>) => {
    if (constructionLocked) return;
    setDraft((prev) => ({ ...prev, ...next }));
  };
  const selectStage = (next: BuildStageId) => {
    setOpenSheet(null);
    setStageId(next);
  };
  const go = (to: number) => selectStage(BUILD_STAGES[Math.max(0, Math.min(BUILD_STAGES.length - 1, to))].id);

  const shared = { data, draft, patch, totals, plan, services, handlers, managed, teamProposal, setTeamProposal };
  const red = REDUNDANCY_COPY[totals.redundancy];
  const editableStage = stageId === 'sites' ? <StageSites {...shared} />
    : stageId === 'plans' ? <ManagedStage managed={managed} onTakeControl={() => patch({ mode: 'HANDS', teamPlanApproved: false, teamPlanClass: undefined })}><StagePlans {...shared} /></ManagedStage>
      : stageId === 'money' ? <ManagedStage managed={managed} onTakeControl={() => patch({ mode: 'HANDS', teamPlanApproved: false, teamPlanClass: undefined })}><StageMoney {...shared} /></ManagedStage>
        : stageId === 'test' ? <StageTest {...shared} />
          : null;
  const constructionPhase = !construction ? ''
    : construction.progressPercent < 25 ? 'Rooms and contracts'
      : construction.progressPercent < 50 ? 'Power, cooling and fibre'
        : construction.progressPercent < 75 ? 'Racks and machines'
          : construction.progressPercent < 90 ? 'Network routing'
            : 'Final commissioning checks';

  return (
    <div className="sf lw bw" style={brand as React.CSSProperties}>
      <header className="sf-head">
        <button type="button" className="sf-icon-btn" onClick={() => handlers.onExit?.()} aria-label="Back">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2L4 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="sf-head-titles">
          <h1>The Build</h1>
          <p>{headerLine(data, draft)}</p>
        </div>
        <span className="lw-count">{index + 1}<i>/{BUILD_STAGES.length}</i></span>
      </header>

      <nav className="lw-track" aria-label="Build stages">
        <span className="lw-track-line" aria-hidden="true">
          <i style={{ width: `${(index / (BUILD_STAGES.length - 1)) * 100}%` }} />
        </span>
        {BUILD_STAGES.map((s, i) => {
          const state = i < index ? 'done' : i === index ? 'now' : 'ahead';
          const health = states[s.id];
          return (
            <button
              key={s.id}
              type="button"
              className={`lw-stop is-${state} health-${health.toLowerCase()}`}
              onClick={() => selectStage(s.id)}
              aria-label={s.verb}
              aria-current={i === index ? 'step' : undefined}
            >
              <span className="lw-stop-glyph" aria-hidden="true">
                {state === 'done' ? <Tick /> : <StageIcon stage={s.id} />}
              </span>
              <span className="lw-stop-name">{s.label}</span>
            </button>
          );
        })}
      </nav>

      {/* --- the budget rail: what the drawing would cost, always visible --- */}
      <section className={buildPlan.shortfall > 0 ? 'lw-rail is-over' : 'lw-rail'}>
        <div className="lw-rail-top">
          <button type="button" className="lw-rail-cell" onClick={() => setOpenSheet('money')} aria-haspopup="dialog">
            <em>Studio money</em>
            <b>{money(plan.available)}</b>
          </button>
          <button type="button" className="lw-rail-cell is-end lw-bill-toggle" onClick={() => setOpenSheet('build')} aria-haspopup="dialog">
            <span>
              <em>This build</em>
              <svg className="lw-bill-chevron" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <b className={buildPlan.shortfall > 0 ? 'sf-tone-bad' : undefined}>{money(buildPlan.total)}</b>
          </button>
        </div>

        <div className="lw-gauge" role="img" aria-label={`Build ${money(buildPlan.total)} against ${money(buildPlan.available)}`}>
          <i className="lw-gauge-fill" style={{ width: `${Math.min(100, (Math.min(buildPlan.total, buildPlan.available) / Math.max(1, buildPlan.available, buildPlan.total)) * 100)}%` }} />
          {buildPlan.shortfall > 0 && (
            <i className="lw-gauge-over" style={{ width: `${(buildPlan.shortfall / Math.max(1, buildPlan.total)) * 100}%` }} />
          )}
          <span className="lw-gauge-mark" style={{ left: `${(buildPlan.available / Math.max(1, buildPlan.available, buildPlan.total)) * 100}%` }} aria-hidden="true" />
        </div>

        {/* The size of the network gets its own line: squeezed between the two
            money cells it pushed the right-hand figure off a 375px screen. */}
        <div className="bw-rail-mid">
          <span>{totals.racks} racks</span>
          <span>{totals.cities} {totals.cities === 1 ? 'city' : 'cities'}</span>
          <span className={`sf-tone-${red.tone}`}>{red.label}</span>
        </div>

        {buildPlan.shortfall > 0 && (
          <div className="lw-rail-foot">
            <span className="sf-tone-bad">{money(buildPlan.shortfall)} short of commissioning</span>
            <button type="button" className="lw-inject" onClick={() => handlers.onOpenStudioFinance?.()}>Add money</button>
          </div>
        )}
      </section>

      {constructionLocked && construction && (
        <section className="bw-construction-status" role="status" aria-live="polite" aria-label="Construction underway">
          <header><b>Construction underway</b><strong>Week {construction.elapsedWeeks} of {construction.totalWeeks}</strong></header>
          <div className="bw-construction-track" role="progressbar" aria-valuemin={0} aria-valuemax={construction.totalWeeks} aria-valuenow={construction.elapsedWeeks}>
            <i style={{ width: `${construction.progressPercent}%` }} />
          </div>
          <p><span>{constructionPhase}</span><em>{construction.remainingWeeks} {construction.remainingWeeks === 1 ? 'week' : 'weeks'} remaining</em></p>
        </section>
      )}

      {/* One sentence saying what this stage is for, and whether it is settled.
          The wizard is long; this line is what stops it feeling long. */}
      <p className={`bw-ask is-${STAGE_STATE_COPY[states[stageId]].tone}`}>
        <span>{BUILD_STAGES[index].ask}</span>
        <b>{STAGE_STATE_COPY[states[stageId]].label}</b>
      </p>

      <div className="sf-scroll" key={stageId}>
        <div className="lw-body lw-enter">
          {constructionLocked && editableStage ? (
            <fieldset className="bw-construction-locked" disabled>
              <legend>Commissioned configuration locked while crews build</legend>
              {editableStage}
            </fieldset>
          ) : editableStage}
          {stageId === 'launch' && <StageLaunch {...shared} onJump={setStageId} />}
          <div className="sf-tail" />
        </div>
      </div>

      <footer className="lw-foot">
        <button type="button" className="sf-btn sf-btn--ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          Back
        </button>
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          disabled={index === BUILD_STAGES.length - 1}
          onClick={() => go(index + 1)}
        >
          {index === BUILD_STAGES.length - 1 ? 'Commission below' : `Next · ${BUILD_STAGES[index + 1].label}`}
        </button>
      </footer>

      <Sheet
        open={openSheet === 'money'}
        onClose={() => setOpenSheet(null)}
        eyebrow="Company money"
        title={buildPlan.shortfall > 0 ? `${money(buildPlan.shortfall)} short` : 'Studio money'}
        footer={
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => { setOpenSheet(null); handlers.onOpenStudioFinance?.(); }}>
            Open Studio Finance
          </button>
        }
      >
        <div className="lw-injectbars">
          <div>
            <span className="sf-eyebrow">Studio holds</span>
            <b>{money(buildPlan.available)}</b>
            <i style={{ width: '100%' }} className="is-have" />
          </div>
          <div>
            <span className="sf-eyebrow">This build</span>
            <b className={buildPlan.shortfall > 0 ? 'sf-tone-bad' : undefined}>{money(buildPlan.total)}</b>
            <i style={{ width: `${Math.min(100, (buildPlan.total / Math.max(1, buildPlan.available, buildPlan.total)) * 100)}%` }} className={buildPlan.shortfall > 0 ? 'is-over' : 'is-plan'} />
          </div>
        </div>
        <Row label="Define the Launch already committed" value={money(-data.treasury.committedLaunch)} tone={data.treasury.committedLaunch > 0 ? 'bad' : 'flat'} />
        <Row label="Current build drawing" value={money(-buildPlan.total)} tone={buildPlan.total > 0 ? 'bad' : 'flat'} />
        <Row
          label={buildPlan.shortfall > 0 ? 'Still needed' : 'Treasury after this build'}
          value={money(buildPlan.shortfall > 0 ? buildPlan.shortfall : buildPlan.headroom)}
          tone={buildPlan.shortfall > 0 ? 'bad' : 'good'}
        />
      </Sheet>

      <Sheet
        open={openSheet === 'build'}
        onClose={() => setOpenSheet(null)}
        eyebrow="Build budget"
        title={`${money(buildPlan.total)} build plan`}
        footer={buildPlan.shortfall > 0 ? (
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => setOpenSheet('money')}>
            Review Studio Money
          </button>
        ) : undefined}
      >
        <BuildBudgetContent
          stages={BUILD_STAGES.map(stage => ({
            id: stage.id,
            label: stage.label,
            done: states[stage.id] === 'DONE',
            detail: STAGE_STATE_COPY[states[stage.id]].label,
          }))}
          lines={buildPlan.lines}
          total={buildPlan.total}
          available={buildPlan.available}
          headroom={buildPlan.headroom}
          shortfall={buildPlan.shortfall}
          linkedSummary={launchBudgetSummary}
          onSelectStage={selectStage}
          onOpenLinked={() => {
            setOpenSheet(null);
            handlers.onOpenLaunchBudget?.();
          }}
        />
      </Sheet>
    </div>
  );
}

function StageIcon({ stage }: { stage: BuildStageId }) {
  const paths: Record<BuildStageId, React.ReactElement> = {
    sites: <><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></>,
    plans: <><rect x="3.5" y="4.5" width="17" height="6" rx="1.5" /><rect x="3.5" y="13.5" width="17" height="6" rx="1.5" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
    money: <><circle cx="12" cy="12" r="8" /><path d="M12 7v10M9.5 9.5h5M9.5 14.5h5" /></>,
    test: <><path d="M4 18l4-6 4 3 4-7 4 4" /><path d="M4 20.5h16" /></>,
    launch: <><path d="M12 3c3.2 2.4 5 5.7 5 9.2 0 2.6-1 4.7-2.4 6.1H9.4C8 16.9 7 14.8 7 12.2 7 8.7 8.8 5.4 12 3z" /><circle cx="12" cy="10.5" r="1.8" /><path d="M9 21l1.5-2.5M15 21l-1.5-2.5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[stage]}
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export interface StageProps {
  data: BuildData;
  draft: BuildDraft;
  patch: (next: Partial<BuildDraft>) => void;
  totals: ReturnType<typeof buildTotals>;
  plan: ReturnType<typeof moneyPlan>;
  services: ReturnType<typeof serviceForecast>;
  handlers: BuildHandlers;
  managed: boolean;
  teamProposal: BuildTeamProposal | null;
  setTeamProposal: React.Dispatch<React.SetStateAction<BuildTeamProposal | null>>;
}

function ManagedStage({ managed, onTakeControl, children }: { managed: boolean; onTakeControl: () => void; children: React.ReactNode }) {
  if (!managed) return <>{children}</>;
  return (
    <>
      <div className="bw-managed-bar">
        <span><b>Managed by your team</b><em>The approved plan is locked while Engineering owns the build.</em></span>
        <button type="button" onClick={onTakeControl}>Take control</button>
      </div>
      <fieldset className="bw-managed-content" disabled>{children}</fieldset>
    </>
  );
}
