/**
 * #262: Launch Control. The one page of the night where the player decides. It mimics a launch director's poll over a control room's wall of screens: each desk's screen
 * switches on and answers, one after another, out of what the company has actually done. Then the one real choice left, how to take the peak, with what it does to the night;
 * and a switch under a guard, because this cannot be undone. All drawn in code, nothing from another room's pictures.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { StreamingLaunchCapacityPlan } from '../../../types';
import { Poster } from '../../../content-market-exact/Poster';
import { Brand, Mark, brandColor } from '../StreamingBrandVisuals';
import { StreamingLightsMap } from '../StreamingLightsMap';
import { CountryFlagSvg } from '../../studio-finance/components/FlagField';
import { cx } from '../presentation/cx';
import css from '../presentation/screens/PremiereNight/PremiereNight.module.css';
import type { PremiereInputs, PremiereStation } from '../StreamingPremiereExperience';

const POLL_STEP_MS = 420;
const OUTCOME_WORDS = { SMOOTH_OPENING: 'SMOOTH', PRESSURED_OPENING: 'PRESSURED', DEGRADED_OPENING: 'ROUGH' } as const;
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `$${Math.round(value / 1e3)}K` : `$${Math.round(value)}`);
export const streamsWord = (value: number) => (value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.round(value)));

const stationState = (station: PremiereStation) => (station.tone === 'BLOCKED' ? 'NO-GO' : station.tone === 'WATCH' ? 'WATCH' : 'GO');

/* one screen on the wall: dark until its desk answers, then it switches on */
const Screen: React.FC<{ station?: PremiereStation; answered: boolean; wide?: boolean; children: React.ReactNode }> = ({ station, answered, wide, children }) => {
  const state = station ? stationState(station) : 'GO';
  return (
    <div className={cx(css.screen, wide && css.screenWide, answered && css.screenOn, answered && state === 'WATCH' && css.screenWatch, answered && state === 'NO-GO' && css.screenNo)}>
      <div className={css.screenPicture}>{children}</div>
      <i className={css.scanlines} aria-hidden="true" />
      <div className={css.screenHead}>
        <b>{station?.label}</b>
        <em>{answered ? state : '···'}</em>
      </div>
    </div>
  );
};

export const LaunchControl: React.FC<{
  brand: Brand;
  inputs: PremiereInputs;
  feedback: string;
  onBack?: () => void;
  onGoLive: (plan: StreamingLaunchCapacityPlan) => void;
  onSkipToReaction: () => void;
}> = ({ brand, inputs, feedback, onBack, onGoLive, onSkipToReaction }) => {
  const stations = inputs.stations ?? [];
  const options = inputs.capacityOptions ?? [];
  const committed = Boolean(inputs.committedLaunch);
  const [polled, setPolled] = useState(committed ? stations.length : 0);
  const [plan, setPlan] = useState<StreamingLaunchCapacityPlan>('STANDARD');
  const [armed, setArmed] = useState(false);
  const blockers = stations.filter(station => station.tone === 'BLOCKED').length;
  const pollDone = polled >= stations.length;
  const allowed = inputs.launchAllowed !== false;
  const option = options.find(candidate => candidate.id === plan) ?? options[0];
  const stationOf = (id: string) => stations.find(station => station.id === id);
  const answered = (id: string) => stations.findIndex(station => station.id === id) < polled && stationOf(id) !== undefined;
  const speaking = stations.filter((station, index) => index < polled && station.tone !== 'READY');

  useEffect(() => {
    if (pollDone) return undefined;
    const timer = window.setTimeout(() => setPolled(count => count + 1), POLL_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [polled, pollDone]);

  const peak = useMemo(() => {
    if (!option) return null;
    const room = option.protectedPeakConcurrentStreams;
    const high = option.effectiveHighConcurrentStreams;
    const top = Math.max(room, high, 1) * 1.08;
    return { room, high, roomAt: (room / top) * 100, highAt: (high / top) * 100, over: high > room };
  }, [option]);

  /* a bar for each of the biggest cities, by its racks */
  const racks = useMemo(() => {
    const sites = [...(inputs.network?.sites ?? [])].sort((a, b) => b.racks - a.racks).slice(0, 14);
    const most = Math.max(1, ...sites.map(site => site.racks));
    return sites.map(site => ({ id: site.id, height: 16 + (site.racks / most) * 84 }));
  }, [inputs.network]);
  const flags = useMemo(() => [...(inputs.network?.markets ?? [])].sort((a, b) => b.audience - a.audience).slice(0, 6), [inputs.network]);
  const countries = inputs.network?.markets.length ?? 0;

  return (
    <div className={css.control}>
      <header className={css.controlTop}>
        {onBack && <button type="button" className={css.controlBack} onClick={onBack} aria-label="Back">←</button>}
        <div className={css.controlTitle}>
          <b>LAUNCH CONTROL</b>
          <span>{inputs.weekLabel ?? 'OPENING NIGHT'} · {committed ? 'LIVE' : pollDone ? (allowed ? 'AWAITING YOUR GO' : 'HOLD') : 'POLLING THE DESKS'}</span>
        </div>
        <div className={css.controlClock} role="status"><b>{committed ? 'T+00:00:00' : 'T-00:00:10'}</b></div>
        <span className={css.controlMark}><Mark brand={brand} /></span>
      </header>

      <div className={css.wall}>
        <Screen station={stationOf('NETWORK')} answered={answered('NETWORK')} wide>
          {inputs.network && <StreamingLightsMap accent={brandColor(brand)} network={inputs.network} lit={answered('NETWORK') ? inputs.network.sites.length : 0} className={css.wallMap} />}
          <div className={css.screenStat}><b>{inputs.network?.sites.length ?? 0}</b><span>CITIES ONLINE</span></div>
          <div className={css.rackBars} aria-hidden="true">{racks.map((rack, index) => <i key={rack.id} style={{ height: `${rack.height}%`, animationDelay: `${index * 0.04}s` }} />)}</div>
        </Screen>
        <Screen station={stationOf('CATALOGUE')} answered={answered('CATALOGUE')}>
          <div className={css.posterRow} aria-hidden="true">
            {(inputs.posters ?? []).slice(0, 4).map(poster => <span key={poster.id}><Poster id={poster.id} title={poster.title} genre={poster.genre} hue={poster.hue} size="xs" bare /></span>)}
          </div>
          <div className={css.screenStat}><b>{inputs.titleCount ?? 0}</b><span>{inputs.titleCount === 1 ? 'TITLE' : 'TITLES'} READY</span></div>
        </Screen>
        <Screen station={stationOf('MARKETS')} answered={answered('MARKETS')}>
          <div className={css.flagRow} aria-hidden="true">{flags.map(market => <i key={market.countryId}><CountryFlagSvg code={market.countryId} fit="stretch" /></i>)}</div>
          <div className={css.screenStat}><b>{countries}</b><span>{countries === 1 ? 'COUNTRY' : 'COUNTRIES'} CLEARED</span></div>
        </Screen>
        <Screen station={stationOf('TREASURY')} answered={answered('TREASURY')}>
          <div className={css.screenStat}><b>{money(inputs.treasury ?? 0)}</b><span>IN THE BANK{inputs.runwayWeeks ? ` · ${Math.min(999, Math.round(inputs.runwayWeeks))} WEEKS OF RUNWAY` : ''}</span></div>
        </Screen>
        <Screen station={stationOf('PROGRAMME')} answered={answered('PROGRAMME')}>
          <div className={css.buildBar} aria-hidden="true"><i /></div>
          <div className={css.screenStat}><b>100%</b><span>BUILT AND SIGNED OFF</span></div>
        </Screen>
      </div>

      <div className={css.controlBody}>
        {speaking.length > 0 && (
          <ul className={css.desksSay}>
            {speaking.map(station => <li key={station.id} className={station.tone === 'BLOCKED' ? css.sayNo : css.sayWatch}><b>{station.label}</b> {station.line}</li>)}
          </ul>
        )}
        {!committed && options.length > 0 && option && peak && (
          <section className={css.plan} aria-label="How to take the peak">
            <div className={css.pollHead}><span>HOW WE TAKE THE PEAK</span></div>
            <div className={css.planRow} role="radiogroup">
              {options.map(candidate => (
                <button key={candidate.id} type="button" role="radio" aria-checked={candidate.id === plan} disabled={!candidate.canAfford}
                  className={cx(css.planTile, candidate.id === plan && css.planOn)} onClick={() => setPlan(candidate.id)}>
                  <b>{candidate.title}</b>
                  <em>{candidate.canAfford ? (candidate.cost > 0 ? money(candidate.cost) : 'FREE') : 'NOT ENOUGH'}</em>
                </button>
              ))}
            </div>
            <div className={css.peakBar} aria-hidden="true">
              <i className={cx(css.peakFill, peak.over && css.peakOver)} style={{ width: `${peak.highAt}%` }} />
              <i className={css.peakRoom} style={{ left: `${peak.roomAt}%` }} />
            </div>
            <p className={css.peakLine}>
              <span>High case <b>{streamsWord(peak.high)}</b> · room for <b>{streamsWord(peak.room)}</b></span>
              {inputs.playbackFor?.[plan] && (
                <em className={cx(css.peakExpect, css[`expect${OUTCOME_WORDS[inputs.playbackFor[plan].outcomeTier]}`])}>EXPECT {OUTCOME_WORDS[inputs.playbackFor[plan].outcomeTier]}</em>
              )}
            </p>
            {plan !== 'STANDARD' && <p className={css.peakCost}>{option.consequence}</p>}
          </section>
        )}
      </div>

      <footer className={css.controlFoot}>
        {(feedback || !allowed) && <p className={css.controlBlocked} role="status">{feedback || inputs.launchBlockerMessage}</p>}
        {committed ? (
          <div className={css.watchRow}>
            <button type="button" className={css.controlQuiet} onClick={onSkipToReaction}>THE REACTION</button>
            <button type="button" className={cx(css.goLive, css.goArmed)} onClick={() => onGoLive(plan)}>WATCH THE NIGHT</button>
          </div>
        ) : (
          <div className={cx(css.switch, armed && css.switchArmed)}>
            <button type="button" className={css.goLive} disabled={!armed} tabIndex={armed ? 0 : -1} onClick={() => onGoLive(plan)}>
              <i aria-hidden="true" />GO LIVE
            </button>
            <button type="button" className={css.guard} disabled={!allowed || !pollDone || blockers > 0} aria-hidden={armed} tabIndex={armed ? -1 : 0} onClick={() => setArmed(true)}>
              <span>{!allowed || blockers > 0 ? `RESOLVE ${blockers} BLOCKER${blockers === 1 ? '' : 'S'}` : pollDone ? 'LIFT THE GUARD' : 'POLLING THE DESKS'}</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
