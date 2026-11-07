/**
 * #253: the waiting screen. Zeesh (2026-11-05): "wht if we after commison remove the define the launch and buld the platform screen and show another tab
 * showing waiitng for build or smt that open the waiting screen that thigns are being build ??". Both wizards are done, so the Command Deck shows one card
 * and it opens this: the network coming online on the map, the weeks to opening night, each crew's progress, and what was approved, locked until then.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Clock3, Landmark, Lock, Megaphone, Server, TriangleAlert } from 'lucide-react';
import { gameWeekLabel } from '../../services/gameWeek';
import type { StreamingOpeningProgrammeFocus } from '../../types';
import type { StreamingOpeningProgrammeView, StreamingOpeningWorkstreamId, StreamingOpeningWorkstreamView } from '../../services/streamingOpeningProgramme';
import type { StreamingLaunchReadiness } from '../../services/streamingLaunch';
import type { StreamingNetworkMapView } from '../../services/streamingNetworkMapView';
import { brandVars } from './presentation/brand';
import { cx } from './presentation/cx';
import { Brand, typeFace } from './StreamingBrandVisuals';
import { StreamingLightsMap } from './StreamingLightsMap';
import css from './presentation/screens/OpeningBuild/OpeningBuild.module.css';

export type StreamingOpeningProgrammeTab = 'BUILD' | 'PLAN';

interface Props {
  launchReadiness?: Pick<StreamingLaunchReadiness, 'canLaunch' | 'blockerCount' | 'items'>;
  brand: Brand;
  view: StreamingOpeningProgrammeView;
  network: StreamingNetworkMapView;
  focus: StreamingOpeningProgrammeFocus;
  initialTab?: StreamingOpeningProgrammeTab;
  /** what was approved */
  plan: React.ReactNode;
  onBack: () => void;
  onResolveClearance: (operationId: string) => void;
  onOpeningNight: () => void;
  /** a launch blocker only Content can fix */
  onOpenContent?: () => void;
}

const CREW_WORDS: Partial<Record<StreamingOpeningWorkstreamId, string>> = {
  INFRASTRUCTURE: 'The network',
  CLEARANCES: 'Government clearance',
  MARKETING: 'Launch campaign',
};
const ICONS: Partial<Record<StreamingOpeningWorkstreamId, typeof Server>> = { INFRASTRUCTURE: Server, CLEARANCES: Landmark, MARKETING: Megaphone };
const CREWS: StreamingOpeningWorkstreamId[] = ['INFRASTRUCTURE', 'CLEARANCES', 'MARKETING'];
const LOCKED_WORDS: Partial<Record<StreamingOpeningWorkstreamId, string>> = {
  CATALOGUE: 'Catalogue', SERVICE: 'Storefront', PRICING: 'Pricing', REHEARSAL: 'Rehearsal',
};

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(value >= 1e10 ? 1 : 2)}B` : value >= 1e6 ? `$${Math.round(value / 1e6)}M` : `$${Math.round(value / 1e3)}K`);
const weeksWord = (weeks: number) => (weeks === 1 ? 'WEEK' : 'WEEKS');

/* elapsed against the whole of it; a clearance with no date yet has no bar to show */
const crewShare = (item: StreamingOpeningWorkstreamView) => {
  if (item.status === 'READY' || item.status === 'PASSED') return 1;
  if (item.remainingWeeks === null || item.elapsedWeeks === null) return null;
  const whole = item.elapsedWeeks + item.remainingWeeks;
  return whole > 0 ? Math.min(1, item.elapsedWeeks / whole) : 1;
};

export default function StreamingOpeningProgramme({
  brand, view, network, launchReadiness, focus, initialTab = 'BUILD', plan, onBack, onResolveClearance, onOpeningNight, onOpenContent,
}: Props) {
  const [tab, setTab] = useState<StreamingOpeningProgrammeTab>(initialTab);
  const uid = useId();
  const focusId = focus === 'CLEARANCES' || focus === 'INFRASTRUCTURE' || focus === 'MARKETING' ? focus : null;
  const focusRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!focusId) return;
    focusRef.current?.scrollIntoView({ block: 'center' });
    focusRef.current?.focus({ preventScroll: true });
  }, [focusId]);

  const ready = view.state === 'READY_TO_OPEN';
  const asked = view.state === 'ACTION_REQUIRED';
  const cleared = ready && launchReadiness?.canLaunch === true;
  const blockers = ready ? (launchReadiness?.items.filter(item => item.tone === 'BLOCKED') || []) : [];
  const crews = view.workstreams.filter(item => CREWS.includes(item.id));
  const lockedRows = view.workstreams.filter(item => LOCKED_WORDS[item.id]);
  const face = typeFace(brand);
  const opening = view.earliestOpeningAbsoluteWeek === null ? 'Date pending' : gameWeekLabel(view.earliestOpeningAbsoluteWeek);
  const ticks = useMemo(() => Array.from({ length: Math.min(52, Math.max(1, view.totalWeeks)) }), [view.totalWeeks]);
  const doneTicks = Math.round(ticks.length * view.progress);
  const controller = view.workstreams.find(item => item.controlsDate) || null;
  const why = ready
    ? blockers[0]?.detail || ''
    : controller
      ? `${CREW_WORDS[controller.id] || controller.label} sets the opening date. ${controller.remainingWeeks ?? view.remainingWeeks} ${controller.remainingWeeks === 1 ? 'week remains' : 'weeks remain'}.`
      : 'Opening night is waiting for the crews to finish.';

  return (
    <main className={css.ob} data-epx-root data-ui="opening-build" style={brandVars(brand)}>
      <div className={css.scroll}>
        <header className={css.hero}>
          <StreamingLightsMap accent={`hsl(${brand.hue} ${brand.sat}% 62%)`} network={network} lit={view.citiesOnline} className={css.map} />
          <div className={css.heroShade} aria-hidden="true" />
          <button type="button" className={css.back} onClick={onBack} aria-label="Back to headquarters">←</button>
          <span className={cx(css.state, ready && css.stateReady, asked && css.stateAsk)}>
            <i aria-hidden="true" />{ready ? 'READY' : asked ? 'NEEDS YOU' : 'BEING BUILT'}
          </span>
          <div className={css.heroWords}>
            <span className={css.service} style={{ fontFamily: face.stack, fontWeight: face.weight, letterSpacing: face.spacing }}>{brand.name}</span>
            {ready ? (
              <h1 className={css.readyHead}>OPENING NIGHT<br />IS READY</h1>
            ) : (
              <div className={css.count} aria-live="polite">
                <b>{view.remainingWeeks}</b>
                <span>{weeksWord(view.remainingWeeks)}<br />TO OPENING NIGHT</span>
              </div>
            )}
            <p>{ready ? `Every crew is done. ${view.cityCount} cities are online.` : `Opens ${view.dateCertainty === 'CONFIRMED' ? 'in' : 'around'} ${opening} · ${view.citiesOnline} of ${view.cityCount} cities online`}</p>
          </div>
        </header>

        <div className={css.track} role="img" aria-label={`${Math.round(view.progress * 100)}% built`}>
          {ticks.map((_, index) => <i key={index} className={index < doneTicks ? css.tickOn : ''} />)}
        </div>

        <div className={css.tabs} role="tablist" aria-label="The build">
          <button type="button" role="tab" id={`${uid}-b`} aria-selected={tab === 'BUILD'} className={tab === 'BUILD' ? css.tabOn : ''} onClick={() => setTab('BUILD')}>THE BUILD</button>
          <button type="button" role="tab" id={`${uid}-p`} aria-selected={tab === 'PLAN'} className={tab === 'PLAN' ? css.tabOn : ''} onClick={() => setTab('PLAN')}>WHAT YOU APPROVED</button>
        </div>

        {tab === 'BUILD' ? (
          <section className={css.page} role="tabpanel" aria-labelledby={`${uid}-b`}>
            {blockers.length > 0 && (
              <div className={css.blockers} role="status">
                <span className={css.eyebrow}>BEFORE OPENING NIGHT</span>
                {blockers.map(item => (
                  <div key={item.id}><b>{item.label}</b><p>{item.detail}</p></div>
                ))}
                {onOpenContent && blockers.some(item => ['slate', 'rights', 'offer-coverage'].includes(item.id)) && (
                  <button type="button" className={css.fix} onClick={onOpenContent}>Fix it in Content</button>
                )}
              </div>
            )}

            <span className={css.eyebrow}>THE CREWS</span>
            <ul className={css.crews}>
              {crews.map(item => {
                const Icon = ICONS[item.id] || Clock3;
                const share = crewShare(item);
                const done = item.status === 'READY';
                const action = item.status === 'ACTION_REQUIRED';
                return (
                  <li key={item.id} ref={item.id === focusId ? focusRef : undefined} tabIndex={item.id === focusId ? -1 : undefined} className={cx(css.crew, done && css.crewDone, action && css.crewAsk)}>
                    <span className={css.crewIcon}>{done ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
                    <div className={css.crewBody}>
                      <div className={css.crewHead}>
                        <b>{CREW_WORDS[item.id]}</b>
                        <em>{done ? 'DONE' : item.remainingWeeks === null ? '—' : `${item.remainingWeeks} WK`}</em>
                      </div>
                      <p>{item.detail}</p>
                      {share !== null && <span className={css.bar}><i style={{ width: `${Math.round(share * 100)}%` }} /></span>}
                      {item.controlsDate && !done && <span className={css.setsDate}>SETS THE DATE</span>}
                      {item.actionLabel && item.operationIds[0] && (
                        <button type="button" className={css.answer} onClick={() => onResolveClearance(item.operationIds[0])}>
                          <TriangleAlert aria-hidden="true" />{item.actionLabel}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={css.facts}>
              <span><b>{view.cityCount.toLocaleString()}</b><small>CITIES</small></span>
              <span><b>{view.rackCount.toLocaleString()}</b><small>RACKS</small></span>
              <span><b>{money(view.releasedCapital)}</b><small>RELEASED</small></span>
            </div>

            <button type="button" className={css.locked} onClick={() => setTab('PLAN')}>
              <span className={css.lockIcon}><Lock aria-hidden="true" /></span>
              <span className={css.lockWords}>
                <b>Locked until opening night</b>
                <small>{lockedRows.map(item => LOCKED_WORDS[item.id]).join(' · ')}</small>
              </span>
              <i aria-hidden="true">›</i>
            </button>
            <p className={css.note}>Weeks pass as you play. Originals, technology and money stay open.</p>
          </section>
        ) : (
          <section className={css.page} role="tabpanel" aria-labelledby={`${uid}-p`}>{plan}</section>
        )}
      </div>

      <footer className={css.foot}>
        {!cleared && <p id="sop-opening-gate-reason" role="status" className={css.why}>{why}</p>}
        <button type="button" className={cx(css.go, cleared && css.goReady)} disabled={!cleared} aria-disabled={!cleared}
          aria-describedby={!cleared ? 'sop-opening-gate-reason' : undefined} onClick={onOpeningNight}>
          {!cleared && <i className={css.goFill} style={{ width: `${Math.round(view.progress * 100)}%` }} aria-hidden="true" />}
          <span>{cleared ? 'BEGIN OPENING NIGHT' : ready ? 'NOT CLEARED YET' : `OPENING NIGHT · ${view.remainingWeeks} ${weeksWord(view.remainingWeeks)}`}</span>
        </button>
      </footer>
    </main>
  );
}
