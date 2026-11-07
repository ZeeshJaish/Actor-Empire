/**
 * #257, #262: OPENING NIGHT. Zeesh (2026-11-05): "we need to redesignthe pages of opening night as i feel its a bit buggy and also not so good and relevent as per our new
 * system , also the design and animation isnt our level", "launch night ka animation thoda aisa tagda hona chaiye screen aese hone chaiye ki lage big event hai , real world
 * se bhi cheeze mimiking hone chaiye", and then "better naimation screen and stuff rather htan using images". So nothing here is a photo: every frame is drawn in code.
 *
 * Three acts:
 *   LAUNCH CONTROL  the wall of screens and the poll, the one choice left, the switch under its guard (opening-night/LaunchControl.tsx)
 *   THE BROADCAST   the lights: the count, the logo, the ident, the world, the city, one room, the peak (opening-night/TheBroadcast.tsx)
 *   THE FLOOD       everybody talking at once, and the numbers that came of it (opening-night/TheFlood.tsx). It is the broadcast's last scene
 *
 * The launch is committed once, when the player goes live, and the rest only presents what was saved: it cannot reroll and it writes nothing. A launch saved but not yet
 * watched (a reload during the show, the developer cheat) opens on the poll answered, to watch it or go straight to what the world made of it.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import css from './presentation/screens/PremiereNight/PremiereNight.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import { Mark, type Brand } from './StreamingBrandVisuals';
import type { OwnedStreamingLaunchCommit, StreamingLaunchCapacityPlan, StreamingLaunchOutcomeTier } from '../../types';
import type { OpeningNightMoment, OpeningNightStation } from '../../services/streamingOpeningNight';
import type { StreamingLaunchCapacityOption } from '../../services/streamingLaunch';
import type { StreamingNetworkMapView } from '../../services/streamingNetworkMapView';
import type { StreamingIdentPreviewId } from '../../services/streamingIdentAudio';
import { openOpeningNightAudio, type OpeningNightAudio } from '../../services/streamingOpeningNightAudio';
import { LaunchControl } from './opening-night/LaunchControl';
import { TheBroadcast } from './opening-night/TheBroadcast';
import { useNight } from './opening-night/useNight';

/* ============================================================
   MODEL
   ============================================================ */
export interface PremiereHall {
  id: string; label: string;
  ceiling: number; burstCeiling: number;
  /** fraction of the night's traffic this hall carries */
  share: number;
}

export interface PremiereCheck { id: string; label: string; ok: boolean; note: string }

export type PremiereStation = OpeningNightStation;
export type PremiereMoment = OpeningNightMoment;

export interface PremiereInputs {
  title: string;
  projectType?: 'MOVIE' | 'SERIES';
  halls?: PremiereHall[];
  ceiling: number;
  burstCeiling: number;
  /** what the forecast says a likely night looks like */
  expected: number;
  /** 0–1, how much the build shakes under load */
  wobble?: number;
  arpu?: number;
  treasury?: number;
  checks: PremiereCheck[];
  investor?: { name: string; agenda: string } | null;
  rivals?: { name: string; subs: string; show?: string }[];
  /** whoever runs engineering, if anyone was hired */
  engineer?: { name: string; role: string } | null;
  /** canonical save seed */
  simulationSeed?: string;
  /** Canonical readiness owns the launch gate: a real blocker must never be bypassed by the presentation layer. */
  launchAllowed?: boolean;
  launchBlockerMessage?: string;
  /** Authoritative opening facts. The show must never reroll this result. */
  committedLaunch?: OwnedStreamingLaunchCommit | null;
  /* ── #257 ── */
  stations?: PremiereStation[];
  capacityOptions?: StreamingLaunchCapacityOption[];
  /** what each way of taking the peak does to the night */
  playbackFor?: Partial<Record<StreamingLaunchCapacityPlan, { playbackSuccessRate: number; outcomeTier: StreamingLaunchOutcomeTier }>>;
  network?: StreamingNetworkMapView;
  ident?: { sound: StreamingIdentPreviewId; seconds: number; packageId: string; customAudio?: { dataUrl: string } | null };
  moments?: PremiereMoment[];
  /** the opening title, as the poster the game draws for it */
  titleArt?: { id: string; title: string; genre: string; hue: number } | null;
  /** the catalogue's best-known titles, on the wall's screen */
  posters?: Array<{ id: string; title: string; genre: string; hue: number }>;
  titleCount?: number;
  runwayWeeks?: number;
  /** the opening markets, most subscribers first, once the launch is saved */
  markets?: Array<{ countryId: string; name: string; subscribers: number }>;
  weekLabel?: string;
  /** the week's other headlines, for the paper */
  stories?: string[];
}

export interface PremiereLaunchResult { ok: boolean; message?: string; commit?: OwnedStreamingLaunchCommit }

export type NightVerdict = 'TRIUMPH' | 'HELD' | 'BROKE';

export interface PremiereResult {
  verdict: NightVerdict;
  peak: number;
  failedPct: number;
  subsGained: number;
  subsLost: number;
  burstCost: number;
  actions: string[];
  worstCity: string | null;
}

export const premiereResultFromCommit = (commit: OwnedStreamingLaunchCommit): PremiereResult => ({
  verdict: commit.outcomeTier === 'DEGRADED_OPENING' ? 'BROKE'
    : commit.outcomeTier === 'PRESSURED_OPENING' ? 'HELD' : 'TRIUMPH',
  peak: commit.forecastLikelyConcurrentStreams,
  failedPct: Math.round((100 - commit.playbackSuccessRate) * 100) / 100,
  subsGained: commit.initialSubscribers, subsLost: 0,
  burstCost: commit.capacityPlanCost, actions: [], worstCity: null,
});

/* the founding prototype has no saved company behind it: the night it shows is made from its forecast */
const prototypeCommit = (inputs: PremiereInputs): OwnedStreamingLaunchCommit => ({
  id: 'prototype', idempotencyKey: 'prototype', committedAtAbsoluteWeek: 0, capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 100,
  forecastLikelyConcurrentStreams: inputs.expected, forecastHighConcurrentStreams: inputs.expected, protectedPeakConcurrentStreams: inputs.ceiling, launchHeadroomPercent: 0,
  initialSubscribers: Math.round(inputs.expected * 3.1), openingDemandIndex: 70, playbackSuccessRate: inputs.expected <= inputs.ceiling ? 99.6 : 97.4,
  outcomeTier: inputs.expected <= inputs.ceiling ? 'SMOOTH_OPENING' : 'PRESSURED_OPENING', openingTitleCount: 1, openingOriginalTitle: inputs.title,
});

type Act = 'CONTROL' | 'CUT' | 'BROADCAST';

/* ============================================================
   THE NIGHT
   ============================================================ */
export const PremiereNight: React.FC<{
  brand: Brand;
  inputs: PremiereInputs;
  onDone: (r: PremiereResult) => void;
  onBack?: () => void;
  onLaunch?: (plan: StreamingLaunchCapacityPlan) => PremiereLaunchResult | void;
  /* #263, the developer's replay (opening-night/NightReplay.tsx): straight to the count; no sound at all; the night again from the flood; when the flood starts */
  autoPlay?: boolean;
  silent?: boolean;
  onAgain?: () => void;
  onFlood?: () => void;
}> = ({ brand, inputs, onDone, onBack, onLaunch, autoPlay = false, silent = false, onAgain, onFlood }) => {
  const [act, setAct] = useState<Act>(autoPlay ? 'CUT' : 'CONTROL');
  const [feedback, setFeedback] = useState('');
  const [savedLaunch, setSavedLaunch] = useState(inputs.committedLaunch ?? null);
  const [startAtFlood, setStartAtFlood] = useState(false);
  const commit = savedLaunch ?? inputs.committedLaunch ?? null;
  const audio = useRef<OpeningNightAudio | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const markHolder = useRef<HTMLSpanElement>(null);
  /* worked out in slices while Launch Control is up, so the show never has to wait */
  const { night, whenReady } = useNight(root, markHolder, brand, inputs.network, inputs.moments);

  /* the sound is made ahead of the tap, which only has to resume it */
  useEffect(() => {
    if (silent) return undefined;
    const timer = window.setTimeout(() => {
      if (!audio.current) audio.current = openOpeningNightAudio(inputs.ident?.sound);
    }, 500);
    return () => {
      window.clearTimeout(timer);
      audio.current?.close();
      audio.current = null;
    };
  }, [silent]);

  /* The tap only cuts to black, so it answers at once. The launch is worked out in that black, where a long frame cannot be seen. */
  const goLive = (plan: StreamingLaunchCapacityPlan) => {
    if (!audio.current && !silent) audio.current = openOpeningNightAudio(inputs.ident?.sound);
    audio.current?.resume();
    setFeedback('');
    setAct('CUT');
    requestAnimationFrame(() => window.setTimeout(async () => {
      if (!commit) {
        if (!onLaunch) {
          setSavedLaunch(prototypeCommit(inputs));
        } else {
          const outcome = onLaunch(plan);
          if (!outcome || !outcome.ok || !outcome.commit) {
            audio.current?.close();
            audio.current = null;
            setFeedback((outcome && outcome.message) || 'Opening night could not be committed.');
            setAct('CONTROL');
            return;
          }
          setSavedLaunch(outcome.commit);
        }
      }
      /* normally long done; a very quick player waits in the black, not long */
      await Promise.race([Promise.all([whenReady(), audio.current?.whenLoaded()]), new Promise(resolve => window.setTimeout(resolve, 3000))]);
      setAct('BROADCAST');
    }, 40));
  };

  useEffect(() => {
    if (!autoPlay) return undefined;
    const timer = window.setTimeout(() => goLive('STANDARD'), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const result = useMemo(() => (commit ? premiereResultFromCommit(commit) : null), [commit]);

  return (
    <div className={cx(css.pn)} ref={root} data-epx-root data-ui="opening-night" data-act={act} style={brandVars(brand)}>
      <span className={css.markHolder} ref={markHolder} aria-hidden="true"><Mark brand={brand} /></span>
      {act === 'CONTROL' && (
        <LaunchControl brand={brand} inputs={inputs} feedback={feedback} onBack={commit ? undefined : onBack} onGoLive={goLive}
          onSkipToReaction={() => { setStartAtFlood(true); goLive('STANDARD'); }} />
      )}
      {act === 'CUT' && <div className={css.cut} aria-hidden="true" />}
      {act === 'BROADCAST' && commit && (
        <TheBroadcast brand={brand} inputs={inputs} commit={commit} audio={audio.current} night={night} startAtFlood={startAtFlood} onOpen={() => { if (result) onDone(result); }} onAgain={onAgain} onFlood={onFlood} />
      )}
    </div>
  );
};
