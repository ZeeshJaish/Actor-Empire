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
  BUILD_STAGES, CLOUD_WEEKLY_PER_RACK, OPEN_TIERS, REDUNDANCY_COPY, SERVER_TIERS, STAGE_STATE_COPY,
  buildTotals, constructionProgress, gates, headerLine, infrastructureMoneyPlan, listingFor, moneyPlan,
  rackBuildCost, rehearsalStale, serviceForecast, stageStates,
} from '../../finance/build';
import { openingNightDemand, type BuildTeamProposal } from '../../finance/buildPlanner';
import type { LinkedBudgetSummary } from '../../finance/budgetLinks';
import { brandVars } from '../../finance/brand';
import { compactCount, money } from '../../finance/format';
import { BuildBudgetContent } from '../BudgetSheets';
import { Row, Sheet } from '../ui';
import { Headline, PlanStrip, type StripView } from '../kit';
import { StageNetwork } from './StageNetwork';
import { facilitiesIn, openingRegions } from '../../finance/placer';
import { StageMoney } from './StageMoney';
import { StageTest } from './StageTest';
import { StageLaunch } from './StageLaunch';
import '../../styles/tokens.css';
import '../../styles/studio-finance.css';
import '../../styles/launch.css';
import '../../styles/kit.css';
import '../../styles/build.css';
import '../../styles/network.css';
import '../../styles/cine.css';

export interface BuildWizardProps extends BuildHandlers {
  data: BuildData;
  initialStage?: BuildStageId;
  initialDraft?: BuildDraft;
  initialSheet?: 'money' | 'build' | null;
  launchBudgetSummary?: LinkedBudgetSummary;
  onDraftChange?: (draft: BuildDraft) => void;
}

/** A build with nothing decided. One definition, used to open the wizard and to
    start it over, so the two can never mean different things by "from scratch".
    The rooms the studio already owns are not part of this build — they survive
    it, because nobody asked to demolish anything. */
export function blankDraft(data: BuildData, mode: BuildDraft['mode']): BuildDraft {
  return {
    facilities: [...data.existing],
    architecture: 'HYBRID',
    ownedShare: 0.6,
    doctrine: 'STANDARD',
    campaignId: data.campaigns[0]?.id ?? '',
    mode,
    instructions: data.team,
    repairIds: [],
    rehearsal: null,
    override: false,
  };
}

/** Would starting over change anything? Asked of `blankDraft` itself, field by
    field, so the offer to clear the build can never appear on one it would
    leave exactly as it is — nor vanish from one it would empty. Reading the
    blank's own keys means a decision added to the draft later is covered
    without anyone remembering to come back here.

    Two things are deliberately not work. The blank is built in the draft's own
    mode, so who is holding the pen cannot read as work: taking control back
    from the team does not make their rooms disappear, and so cannot make the
    build untouched. And the rooms the studio already owned are in the blank
    draft too — a reset never demolishes them, so a build that has only those
    has nothing to clear.

    This is not `getBuildControlHandoffConfirmation`'s `hasExistingWork`, which
    answers a different question — what a handoff could replace, pre-owned
    rooms included — and so cannot be the same test. */
export function buildDraftHasWork(data: BuildData, draft: BuildDraft, pendingProposal = false): boolean {
  if (pendingProposal || draft.teamPlanApproved) return true;
  const blank = blankDraft(data, draft.mode);
  return (Object.keys(blank) as Array<keyof BuildDraft>)
    .some((key) => JSON.stringify(draft[key] ?? null) !== JSON.stringify(blank[key] ?? null));
}

export function BuildWizard({ data, initialStage = 'network', initialDraft, initialSheet, launchBudgetSummary, onDraftChange, ...handlers }: BuildWizardProps) {
  const [stageId, setStageId] = useState<BuildStageId>(initialStage);
  const [openSheet, setOpenSheet] = useState<'money' | 'build' | null>(initialSheet ?? null);
  /* Hands-on, always (#103): nobody drafts the network for you. */
  const [draft, setDraft] = useState<BuildDraft>(() => initialDraft ?? blankDraft(data, 'HANDS'));
  const [teamProposal, setTeamProposal] = useState<BuildTeamProposal | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  /* Taking control from the team hands you their drawing to edit, which is the
     right default — you asked to change it, not to lose it. This is the other
     thing: nothing kept, nobody's plan, your own hands, back at the first
     stage. Every stage reads the draft, so clearing the draft clears them all. */
  const startOver = () => {
    if (data.marketPlanning?.editable === false) return;
    setConfirmReset(false);
    setOpenSheet(null);
    setTeamProposal(null);
    setStageId('network');
    setDraft(blankDraft(data, 'HANDS'));
  };
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
  const marketLocked = data.marketPlanning?.editable === false;
  const noMarketQuote = marketLocked && data.markets.length === 0;

  /* What the plan adds up to, computed the same way the Test stage computes it
     so the bar and the rehearsal can never disagree. */
  const expectedPeak = services.reduce((sum, service) => sum + service.peak, 0);
  const serviceCapacity = totals.capacity + totals.burst;
  const carries = serviceCapacity >= expectedPeak;
  const shortAtPeak = Math.max(0, expectedPeak - serviceCapacity);

  const patch = (next: Partial<BuildDraft>) => {
    if (constructionLocked || marketLocked) return;
    setDraft((prev) => ({ ...prev, ...next }));
  };
  const selectStage = (next: BuildStageId) => {
    setOpenSheet(null);
    setStageId(next);
  };
  const go = (to: number) => selectStage(BUILD_STAGES[Math.max(0, Math.min(BUILD_STAGES.length - 1, to))].id);

  /* Starting over is offered only where it would do something — not only where
     a team has been. The page asking "is there a proposal?" made the button
     disappear at the exact moment you took the pen, which left starting clean
     as something you had to do before taking control, in that order, or not at
     all. The wizard owns the draft, so the wizard answers it. */
  const hasWork = useMemo(() => buildDraftHasWork(data, draft, Boolean(teamProposal)), [data, draft, teamProposal]);
  const shared = { data, draft, patch, totals, plan, services, handlers, managed, teamProposal, setTeamProposal, onJump: selectStage, onStartOver: hasWork && !marketLocked ? () => setConfirmReset(true) : undefined };
  /* Network is not wrapped: under a team plan you must still be able to open a
     city and read what they did, which a disabled fieldset would prevent. It
     locks its own controls instead, and carries the way to take control. */
  const editableStage = stageId === 'network' ? <StageNetwork {...shared} />
    : stageId === 'money' ? noMarketQuote
      ? <section className="bw-market-no-quote"><h2>No market quote yet</h2><p>File an opening market to see a country-specific build bill. The unit prices above are illustrative; your actual network, cloud, and contract costs depend on the filed countries and your drawing.</p></section>
      : <ManagedStage managed={managed} onTakeControl={() => patch({ mode: 'HANDS', teamPlanApproved: false, teamPlanClass: undefined })}><StageMoney {...shared} /></ManagedStage>
      : stageId === 'test' ? <StageTest {...shared} />
        : null;
  /* --- the bar is about the page you are on -----------------------------
     One shape everywhere: the stage's own name and its figure, the verdict
     that page is judged on, and a measure of that figure against its own
     limit. What fills it changes per stage, because the
     question does: Network counts places and what stands in them, Money
     counts what it costs, Test counts the night itself, and Launch counts
     what is left to clear. Where a stage has a gate, the bar fails in the
     gate's own words so the strip and the final checklist cannot disagree. */
  const checks = useMemo(() => gates(data, draft), [data, draft]);
  const bar = useMemo<StripView>(() => {
    if (noMarketQuote && (stageId === 'money' || stageId === 'launch')) return {
      subject: BUILD_STAGES[index].label, value: 0, format: () => 'No quote',
      verdict: { label: 'File a market first', tone: 'warn' }, blocking: true,
      gauge: { value: 0, limit: 1, label: 'No country-specific quote until an opening-market filing starts' },
    };
    const rooms = draft.facilities.length;
    const roomWord = `${rooms} ${rooms === 1 ? 'room' : 'rooms'}`;
    const failing = (stage: BuildStageId) => checks.find((gate) => gate.stage === stage && !gate.ok);

    if (stageId === 'network') {
      const red = REDUNDANCY_COPY[totals.redundancy];
      const capped = failing('network');
      /* The gauge used to count "markets reached" — every market with any state
         at all — while the page's own Coverage counter counted only the markets
         that were READY. A network serving everyone badly read 12-of-12 six
         inches above 0-of-12, and neither number was the one the stage is
         judged on. Both are gone; the strip now reads the same night the band
         at the top of the page reads, against the same capacity the Test stage
         rehearses, so the three cannot disagree. */
      const night = openingNightDemand(data, services);
      /* Regions set, not sites: the player works by region now (#103), and
         where the rooms stand is the placer's business. */
      const regionsSet = openingRegions(data).filter(region => facilitiesIn(data, draft, region.id).length > 0).length;
      return {
        subject: BUILD_STAGES[index].label,
        value: regionsSet,
        format: whole,
        unit: regionsSet === 1 ? 'region' : 'regions',
        verdict: draft.facilities.length === 0
          ? { label: 'Nothing set yet', tone: 'warn' }
          : capped
            ? { label: capped.value, tone: 'bad' }
            : { label: totals.redundancy === 'SINGLE' ? 'Single point' : red.label, tone: red.tone },
        /* A single point of failure is a warning you may ship with; a room that
           cannot run its racks is not. */
        blocking: Boolean(capped && capped.id !== 'team-plan'),
        gauge: {
          value: night.high,
          limit: serviceCapacity,
          /* "at peak", not "arriving".

             This read `${night.high} arriving` while the band pinned above it
             reads `${night.likely} expected` — 261.6K against 168.8K, the same
             night described by two numbers ten pixels apart with nothing to say
             they were different questions. Planning capacity against the high
             case is right; calling the high case "arriving" beside a headline
             that says "expected" is what made it look broken. */
          label: `${compactCount(night.high)} at peak against ${compactCount(serviceCapacity)} carried`,
        },
      };
    }

    if (stageId === 'test') {
      const rehearsal = draft.rehearsal;
      const stale = rehearsalStale(data, draft);
      const fresh = rehearsal && !stale ? rehearsal : null;
      return {
        subject: BUILD_STAGES[index].label,
        value: expectedPeak,
        format: compactCount,
        unit: 'peak',
        verdict: !rehearsal ? { label: 'Not rehearsed', tone: 'warn' }
          : stale ? { label: 'Out of date', tone: 'warn' }
            : rehearsal.verdict === 'HELD' ? { label: 'It held', tone: 'good' }
              : rehearsal.verdict === 'RENTED' ? { label: 'Held by renting', tone: 'warn' }
                : { label: 'It broke', tone: 'bad' },
        blocking: Boolean(fresh) && rehearsal?.verdict === 'BROKE',
        gauge: fresh
          ? { value: fresh.peak, limit: fresh.capacity, label: `${compactCount(fresh.peak)} hit against ${compactCount(fresh.capacity)} carried` }
          : { value: expectedPeak, limit: serviceCapacity, label: `${compactCount(expectedPeak)} expected against ${compactCount(serviceCapacity)} carried` },
      };
    }

    if (stageId === 'launch') {
      /* Launch is the only stage judged on more than the Build: Define the
         Launch has to be finished too. The strip used to count the seven build
         gates while the page counted all fourteen, so one said "1 check to
         clear" beside a page saying "3 open". They count the same thing now. */
      const defineChecks = data.defineLaunchChecks ?? [];
      const everything = checks.length + defineChecks.length;
      const clear = checks.filter((gate) => gate.ok).length + defineChecks.filter((check) => check.complete).length;
      const open = everything - clear;
      return {
        subject: BUILD_STAGES[index].label,
        value: buildPlan.total,
        format: money,
        verdict: open === 0
          ? { label: 'Ready to commission', tone: 'good' }
          : { label: `${open} ${open === 1 ? 'check' : 'checks'} to clear`, tone: 'bad' },
        blocking: open > 0,
        gauge: { value: clear, limit: everything, label: `${clear} of ${everything} checks clear` },
      };
    }

    return {
      subject: BUILD_STAGES[index].label,
      value: buildPlan.total,
      format: money,
      verdict: buildPlan.shortfall > 0
        ? { label: `${money(buildPlan.shortfall)} short`, tone: 'bad' }
        : { label: `${money(buildPlan.headroom)} left after`, tone: 'good' },
      blocking: buildPlan.shortfall > 0,
      gauge: {
        value: buildPlan.total,
        limit: buildPlan.available,
        label: `${money(buildPlan.total)} against ${money(buildPlan.available)}`,
      },
    };
  }, [stageId, index, checks, data, draft, totals, services, buildPlan, serviceCapacity, expectedPeak, shortAtPeak, carries, noMarketQuote]);

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
          const health = states[s.id];
          // A visited page is not a cleared gate. The track is navigable in
          // preview mode, so position alone must never manufacture a tick.
          const state = i === index ? 'now' : i < index ? (health === 'DONE' ? 'done' : 'todo') : 'ahead';
          return (
            <button
              key={s.id}
              type="button"
              className={`lw-stop is-${state} health-${health.toLowerCase()}`}
              onClick={() => selectStage(s.id)}
              aria-label={`${s.label} stage, ${state === 'now' ? 'current' : state === 'done' ? 'complete' : 'not complete'}; ${STAGE_STATE_COPY[health].label}`}
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

      {constructionLocked && construction && (
        <section className="bw-construction-status" role="status" aria-live="polite" aria-label="Construction underway">
          <header><b>Construction underway</b><strong>Week {construction.elapsedWeeks} of {construction.totalWeeks}</strong></header>
          <div className="bw-construction-track" role="progressbar" aria-valuemin={0} aria-valuemax={construction.totalWeeks} aria-valuenow={construction.elapsedWeeks}>
            <i style={{ width: `${construction.progressPercent}%` }} />
          </div>
          <p><span>{constructionPhase}</span><em>{construction.remainingWeeks} {construction.remainingWeeks === 1 ? 'week' : 'weeks'} remaining</em></p>
        </section>
      )}

      {marketLocked && (
        <section className="bw-market-locked" role="status">
          <strong>Build preview · Market Clearance needed</strong>
          <p>{data.marketPlanning?.reason}</p>
          <button type="button" className="sf-btn sf-btn--ghost" onClick={() => handlers.onOpenDefine?.('MARKETS')}>Open Market Clearance</button>
          {!data.markets.length && (
            <details className="bw-market-unit-prices">
              <summary>Illustrative unit prices</summary>
              <p>Country-specific build totals are unavailable until you file an opening market.</p>
              <ul>
                {OPEN_TIERS.map(tier => <li key={tier}>{SERVER_TIERS[tier].name}: {money(rackBuildCost(tier))} per rack</li>)}
                <li>Cloud: from {money(CLOUD_WEEKLY_PER_RACK)} per compute each week; provider and region change the quote.</li>
              </ul>
            </details>
          )}
        </section>
      )}

      <div className="sf-scroll" key={stageId}>
        <div className="lw-body lw-enter">
          {/* The stage's question, as its title. It used to sit in the fixed
              chrome as a 13px line under the money rail; every stage now opens
              on it, large, and it scrolls away with the stage it belongs to. */}
          {/* Network is the exception: its map is the headline. The stage's
              question sat above the picture, so the one fixed thing on the page
              started 180px down it and the first thing you read was a sentence
              about a map you could not yet see. */}
          {stageId !== 'network' && (
            <Headline
              ask={BUILD_STAGES[index].ask}
              state={STAGE_STATE_COPY[states[stageId]].label}
              tone={STAGE_STATE_COPY[states[stageId]].tone}
              step={{ n: index + 1, of: BUILD_STAGES.length, name: BUILD_STAGES[index].label }}
            />
          )}
          {(constructionLocked || marketLocked) && editableStage ? (
            <fieldset className="bw-construction-locked" disabled>
              <legend>{marketLocked ? 'Build editing locked until opening-market filing' : 'Commissioned configuration locked while crews build'}</legend>
              {editableStage}
            </fieldset>
          ) : editableStage}
          {stageId === 'launch' && (marketLocked
            ? <fieldset className="bw-construction-locked" disabled><legend>Commissioning locked until opening-market filing</legend><StageLaunch {...shared} onJump={setStageId} /></fieldset>
            : <StageLaunch {...shared} onJump={setStageId} />)}
          <div className="sf-tail" />
        </div>
      </div>

      {/* --- the plan, wherever you are ------------------------------------
          This was a card between the track and the content: studio money, the
          build, a gauge. It sat at the top, so the figures your decisions move
          were furthest from the thumb moving them — and it never said the one
          thing a network is for, which is whether it carries the night. It is
          a strip above the footer now, and it answers that. */}
      <PlanStrip
        view={bar}
        page={stageId}
        tone={bar.verdict ? bar.verdict.tone : 'flat'}
        over={buildPlan.shortfall > 0}
        measure={{
          label: stageId === 'network' ? 'Capacity' : stageId === 'test' ? 'Rehearsal load' : stageId === 'launch' ? 'Gates clear' : 'Budget',
          value: bar.gauge.value,
          of: bar.gauge.limit,
        }}
        money={noMarketQuote
          ? { label: 'Quote', value: 'Pending', spent: 0, of: buildPlan.available }
          : buildPlan.shortfall > 0
          ? { label: 'Short', value: money(buildPlan.shortfall), bad: true, spent: buildPlan.total, of: buildPlan.available }
          : { label: 'Money', value: money(buildPlan.available), spent: buildPlan.total, of: buildPlan.available }}
        ways={[
          { label: 'The build', onClick: () => setOpenSheet('build') },
          buildPlan.shortfall > 0
            ? { label: 'Add money', primary: true, onClick: () => handlers.onOpenStudioFinance?.() }
            : { label: 'Money', onClick: () => setOpenSheet('money') },
        ]}
      />

      {/* Undoing an hour of decisions asks first, in the dialog the handoff
          between team and player already uses. */}
      {confirmReset && (
        <div className="bw-confirm-backdrop">
          <section className="bw-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="bw-reset-title" aria-describedby="bw-reset-body">
            <p className="sf-eyebrow">Build control</p>
            <h2 id="bw-reset-title">Start the build again?</h2>
            <p id="bw-reset-body">
              Every room, rack and rehearsal in this draft goes, and the team&rsquo;s plan with it.
              You start at the first stage with nothing decided and your own hands on it.
              Rooms the studio already owns are untouched.
            </p>
            <div className="lw-actions">
              <button type="button" className="sf-btn sf-btn--ghost" onClick={() => setConfirmReset(false)}>Keep this draft</button>
              <button type="button" className="sf-btn sf-btn--primary" onClick={startOver}>Start over</button>
            </div>
          </section>
        </div>
      )}

      <footer className="lw-foot">
        <button type="button" className="sf-btn sf-btn--ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          Back
        </button>
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          disabled={index === BUILD_STAGES.length - 1}
          aria-describedby={index === BUILD_STAGES.length - 1 ? 'bw-commission-guidance' : undefined}
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
        title={noMarketQuote ? 'No market quote yet' : `${money(buildPlan.total)} build plan`}
        footer={buildPlan.shortfall > 0 ? (
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => setOpenSheet('money')}>
            Review Studio Money
          </button>
        ) : undefined}
      >
        {noMarketQuote ? <p>File an opening market to unlock a country-specific build quote. No cash or energy is spent by this preview.</p> : <BuildBudgetContent
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
        />}
      </Sheet>
    </div>
  );
}

function StageIcon({ stage }: { stage: BuildStageId }) {
  const paths: Record<BuildStageId, React.ReactElement> = {
    /* A pin over racks: the place and what stands in it, which is now one
       decision and one stage. */
    network: <><path d="M12 20.5s6-5.4 6-9.6a6 6 0 10-12 0c0 4.2 6 9.6 6 9.6z" /><rect x="9" y="8" width="6" height="2.2" rx="1" /><rect x="9" y="11.6" width="6" height="2.2" rx="1" /></>,
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
  /** Jump to another stage — the way back from a judgement to the place it
      is changed. */
  onJump?: (stage: BuildStageId) => void;
  /** Ask to clear the draft entirely. Offered beside the pen, because that is
      where the question of who is drawing is already being asked. */
  onStartOver?: () => void;
}

const whole = (value: number): string => String(Math.round(value));

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
