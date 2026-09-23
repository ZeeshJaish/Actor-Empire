import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Check, ChevronRight, Clock3, FileLock2, Landmark, Megaphone, Server, TriangleAlert } from 'lucide-react';
import type { StreamingOpeningProgrammeFocus } from '../../types';
import type { Brand } from './StreamingBrandVisuals';
import type { StreamingOpeningProgrammeView, StreamingOpeningWorkstreamId } from '../../services/streamingOpeningProgramme';

interface Props {
  brand: Brand;
  view: StreamingOpeningProgrammeView;
  focus: StreamingOpeningProgrammeFocus;
  onBack: () => void;
  onOpenCommissionedPlan: () => void;
  onResolveClearance: (operationId: string) => void;
  onOpeningNight: () => void;
}

const FOCUS_WORKSTREAM: Partial<Record<StreamingOpeningProgrammeFocus, StreamingOpeningWorkstreamId>> = {
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  CLEARANCES: 'CLEARANCES',
  MARKETING: 'MARKETING',
};

const iconFor = (id: StreamingOpeningWorkstreamId) => {
  if (id === 'INFRASTRUCTURE') return Server;
  if (id === 'CLEARANCES') return Landmark;
  if (id === 'MARKETING') return Megaphone;
  return FileLock2;
};

const stateLabel = (view: StreamingOpeningProgrammeView) => {
  if (view.state === 'ACTION_REQUIRED') return 'ACTION REQUIRED';
  if (view.state === 'READY_TO_OPEN') return 'READY FOR OPENING NIGHT';
  if (view.state === 'LIVE') return 'LIVE';
  return 'COMMISSIONED';
};

export default function StreamingOpeningProgramme({
  brand, view, focus, onBack, onOpenCommissionedPlan, onResolveClearance, onOpeningNight,
}: Props) {
  const focusId = FOCUS_WORKSTREAM[focus];
  const focusRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!focusId) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    focusRef.current?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    focusRef.current?.focus({ preventScroll: true });
  }, [focusId]);
  const controller = view.workstreams.find(item => item.controlsDate) || null;
  const ready = view.state === 'READY_TO_OPEN';
  const openingLabel = ready
    ? 'Begin Opening Night'
    : `Opening Night · ${view.remainingWeeks} ${view.remainingWeeks === 1 ? 'week' : 'weeks'} remaining`;
  const openingGateReason = controller
    ? `${controller.label} is controlling the opening date. ${controller.remainingWeeks ?? view.remainingWeeks} ${controller.remainingWeeks === 1 ? 'week remains' : 'weeks remain'}.`
    : 'Opening Night is waiting for the commissioned workstreams to finish.';

  return (
    <main className="sop" style={{ ['--sop-brand' as string]: `hsl(${brand.hue} ${brand.sat}% 58%)` }}>
      <header className="sop-header">
        <button type="button" className="sop-back" onClick={onBack} aria-label="Back to Streaming+"><ArrowLeft /></button>
        <span><small>STREAMING+</small><h1>THE OPENING PROGRAMME</h1></span>
        <b className={`sop-state is-${view.state.toLowerCase()}`}>{stateLabel(view)}</b>
      </header>

      <section className="sop-hero" aria-live="polite">
        <p className="sop-eyebrow">{view.dateCertainty === 'CONFIRMED' ? 'Opening week' : 'Earliest opening'}</p>
        <h2>{view.earliestOpeningAbsoluteWeek === null ? 'Date pending' : `Week ${view.earliestOpeningAbsoluteWeek}`}</h2>
        <div className="sop-facts">
          <span><b>{view.cityCount}</b><small>cities</small></span>
          <span><b>{view.rackCount}</b><small>racks</small></span>
          <span><b>${Math.round(view.releasedCapital / 1_000_000)}M</b><small>released</small></span>
        </div>
      </section>

      {controller ? (
        <section className="sop-controller">
          <p className="sop-eyebrow">Controls the date</p>
          <div><Clock3 aria-hidden="true" /><span><b>{controller.label}</b><small>{controller.detail}</small></span><strong>{controller.remainingWeeks ?? '—'} wk</strong></div>
        </section>
      ) : (
        <section className="sop-controller is-ready"><p className="sop-eyebrow">All systems ready</p><div><Check aria-hidden="true" /><span><b>Opening Night is cleared</b><small>The commissioned service can take its first viewers.</small></span></div></section>
      )}

      <section className="sop-workstreams">
        <p className="sop-eyebrow">Workstreams</p>
        <ul>
          {view.workstreams.map(item => {
            const Icon = iconFor(item.id);
            const isFocused = item.id === focusId;
            return (
              <li key={item.id} ref={isFocused ? focusRef : undefined} tabIndex={isFocused ? -1 : undefined} className={`${isFocused ? 'is-focused ' : ''}is-${item.status.toLowerCase()}`}>
                <Icon aria-hidden="true" />
                <span><b>{item.label}</b><small>{item.detail}</small></span>
                <em>{item.status.replaceAll('_', ' ')}</em>
                {item.actionLabel && item.operationIds[0] && (
                  <button type="button" onClick={() => onResolveClearance(item.operationIds[0])}>
                    <TriangleAlert aria-hidden="true" />{item.actionLabel}<ChevronRight aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="sop-actions">
        {!ready && <p id="sop-opening-gate-reason" role="status" className="sop-gate-reason">{openingGateReason}</p>}
        <button type="button" className="sop-plan" onClick={onOpenCommissionedPlan}>Commissioned plan</button>
        <button type="button" className="sop-open" disabled={!ready} aria-disabled={!ready}
          aria-describedby={!ready ? 'sop-opening-gate-reason' : undefined}
          onClick={onOpeningNight}>{openingLabel}</button>
      </footer>
    </main>
  );
}
