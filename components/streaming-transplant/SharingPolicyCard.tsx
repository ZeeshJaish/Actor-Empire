/* ============================================================================
   ACCOUNT SHARING — who may watch on one paid account, and what each choice
   really does.

   The old screen showed two rows of buttons under "SHARING POSTURE" and
   "ENFORCEMENT" and saved on every tap, with no word on what they changed.
   Here the choice is staged: pick a posture and an enforcement level, see
   what the next weekly settlement would do (outside homes on your accounts,
   network load, the policing bill, extra cancellations, piracy), then apply.

   Every figure comes from previewStreamingSharingPolicy, which uses the same
   constants as the settlement itself (services/streamingSharingPolicy.ts).
   Sharing control in Tech (#56) changes them: Household detection cuts the
   extra cancellations, Device check the outside homes, and with Paid extra
   member a plan selling Extra member turns some sharers into paying members.

   #108 (plan §18.4; Zeesh: "आउटसाइड होम, पब्लिकली क्लोज, पायरेसी, उसको थोड़ा सा
   और बेटर दिखाना होगा"): the posture is a three-stop dial, enforcement three
   levels of bars, and each figure a gauge: its bar runs from none to the most
   any of the nine policies would give, filled where the pick lands, with a tick
   where today's policy stands.
   ========================================================================== */

import React, { useEffect, useMemo, useState } from 'react';
import css from './presentation/screens/AudienceDesk/SharingPolicy.module.css';
import { cx } from './presentation/cx';
import { compact } from './audienceAtlasModel';
import {
  STREAMING_NO_SHARING_CONTROL, previewStreamingSharingPolicy, type StreamingSharingControl, type StreamingSharingPolicyFigures, type StreamingSharingPolicyOutlook,
} from '../../services/streamingSharingPolicy';
import type { StreamingEnforcementInvestment, StreamingSharingPosture, WorldStreamingCustomerAccessPolicy } from '../../types';

const POSTURES: Array<{ id: StreamingSharingPosture; label: string; hint: string }> = [
  { id: 'REACH_FIRST', label: 'Reach first', hint: 'friends welcome' },
  { id: 'BALANCED', label: 'Balanced', hint: 'a little sharing' },
  { id: 'HOUSEHOLD_ONLY', label: 'Household only', hint: 'one home per account' },
];
const ENFORCEMENT: Array<{ id: StreamingEnforcementInvestment; label: string; hint: string }> = [
  { id: 'LIGHT', label: 'Light', hint: 'trust, small team' },
  { id: 'STANDARD', label: 'Standard', hint: 'regular checks' },
  { id: 'AGGRESSIVE', label: 'Aggressive', hint: 'device limits, big team' },
];

/** The policy in a few words, for the rooms that only name it. */
export const SHARING_POSTURE_WORDS = Object.fromEntries(POSTURES.map(item => [item.id, item.label])) as Record<StreamingSharingPosture, string>;
export const ENFORCEMENT_WORDS = Object.fromEntries(ENFORCEMENT.map(item => [item.id, item.label])) as Record<StreamingEnforcementInvestment, string>;

const money = (value: number) => `$${compact(Math.round(value))}`;
const percent = (rate: number) => (rate > 0 ? `+${(rate * 100).toFixed(1)}%` : '0%');

export const SharingPolicyCard: React.FC<{
  accent: string;
  policy: WorldStreamingCustomerAccessPolicy;
  /** Last week's settled figures under the current policy. */
  settled: StreamingSharingPolicyFigures;
  settledPolicy?: Pick<WorldStreamingCustomerAccessPolicy, 'sharingPosture' | 'enforcementInvestment'>;
  /** False before the first settled week: the preview has nothing to scale yet. */
  settledAvailable: boolean;
  /** The current policy was chosen this week, so the settled figures still show the old one. */
  appliesNextWeek?: boolean;
  /** Sharing control in Tech (#56); without it, the policy as before */
  control?: StreamingSharingControl;
  onApply: (policy: { sharingPosture: StreamingSharingPosture; enforcementInvestment: StreamingEnforcementInvestment }) => void;
}> = ({ accent, policy, settled, settledPolicy, settledAvailable, appliesNextWeek = false, control = STREAMING_NO_SHARING_CONTROL, onApply }) => {
  const [posture, setPosture] = useState<StreamingSharingPosture>(policy.sharingPosture);
  const [enforcement, setEnforcement] = useState<StreamingEnforcementInvestment>(policy.enforcementInvestment);
  /* follow the saved policy if it changes underneath (e.g. after Apply) */
  useEffect(() => { setPosture(policy.sharingPosture); setEnforcement(policy.enforcementInvestment); }, [policy.enforcementInvestment, policy.sharingPosture]);
  const changed = posture !== policy.sharingPosture || enforcement !== policy.enforcementInvestment;
  const outlook = useMemo(
    () => previewStreamingSharingPolicy(settled, settledPolicy || policy, { sharingPosture: posture, enforcementInvestment: enforcement }, control),
    [control, enforcement, policy, posture, settled, settledPolicy],
  );
  const payingMembers = control.extraMemberShare > 0 && control.sellsExtraMember;

  /* each gauge's full scale: the most any of the nine policies would give */
  const most = useMemo(() => {
    const all = POSTURES.flatMap(item => ENFORCEMENT.map(level => previewStreamingSharingPolicy(settled, policy,
      { sharingPosture: item.id, enforcementInvestment: level.id }, control).next));
    const top = (read: (outlook: StreamingSharingPolicyOutlook) => number) => Math.max(1e-9, ...all.map(read));
    return {
      sharedHomes: top(row => row.sharedHomes), accessLoadAccounts: top(row => row.accessLoadAccounts), weeklyEnforcementCost: top(row => row.weeklyEnforcementCost),
      extraWeeklyCancellation: top(row => row.extraWeeklyCancellation), piracyReach: top(row => row.piracyReach), extraMembers: top(row => row.extraMembers),
    };
  }, [control, policy, settled]);

  /* For each effect: which direction is good for you. More outside homes and
     more piracy are not revenue: they are viewers who pay you nothing. */
  type Key = keyof typeof most;
  const gauge = (key: Key, label: string, show: (value: number) => string, better: 'down' | 'up' | 'none', colour: string, unit?: string) => ({
    key, label, colour, better, unit, now: show(outlook.now[key]), next: show(outlook.next[key]),
    nowAt: Math.min(1, outlook.now[key] / most[key]), nextAt: Math.min(1, outlook.next[key] / most[key]), delta: outlook.next[key] - outlook.now[key],
  });
  const rows = [
    gauge('sharedHomes', 'Outside homes on your accounts', compact, 'none', '#ffb020'),
    gauge('accessLoadAccounts', 'Network load', compact, 'down', '#5aa9ff', 'accounts'),
    gauge('weeklyEnforcementCost', 'Policing cost', money, 'down', '#ab94ff', 'a week'),
    gauge('extraWeeklyCancellation', 'Extra cancellations', percent, 'down', '#ff8a5c', 'a week'),
    gauge('piracyReach', 'Piracy', compact, 'down', '#ff5a6a', 'people'),
    // Paid extra member (#56): sharers the rules turn away who pay to stay
    ...(payingMembers ? [gauge('extraMembers', 'Paying extra members', compact, 'up', '#4ade80', 'homes')] : []),
  ];
  const tone = (row: typeof rows[number]) => (row.delta === 0 || row.better === 'none' ? '' : (row.delta < 0) === (row.better === 'down') ? css.good : css.bad);
  const postureAt = POSTURES.findIndex(item => item.id === posture);

  return (
    <div className={css.card} style={{ ['--policy-accent' as string]: accent }}>
      <span className={css.eyebrow}>ACCOUNT SHARING</span>
      <h3 className={css.title}>Who can watch on one paid account?</h3>

      {/* the posture: a dial of three stops, open to closed; a dot marks today's */}
      <div className={css.lever}>
        <span>SHARING POSTURE</span>
        <div className={css.dial} role="radiogroup" aria-label="Sharing posture" style={{ ['--at' as string]: `${postureAt * 50}%` }}>
          <i className={css.track} aria-hidden="true"><em /></i>
          {POSTURES.map(item => (
            <button key={item.id} type="button" role="radio" aria-checked={posture === item.id}
              className={cx(css.stop, posture === item.id && css.on, policy.sharingPosture === item.id && css.current)} onClick={() => setPosture(item.id)}>
              <i aria-hidden="true" /><b>{item.label}</b><small>{item.hint}</small>
            </button>
          ))}
        </div>
      </div>
      {/* enforcement: three levels, drawn as one, two and three bars */}
      <div className={css.lever}>
        <span>ENFORCEMENT</span>
        <div className={css.levels} role="radiogroup" aria-label="Enforcement">
          {ENFORCEMENT.map((item, index) => (
            <button key={item.id} type="button" role="radio" aria-checked={enforcement === item.id}
              className={cx(enforcement === item.id && css.on, policy.enforcementInvestment === item.id && css.current)} onClick={() => setEnforcement(item.id)}>
              <span className={css.bars} aria-hidden="true">{[0, 1, 2].map(bar => <i key={bar} className={bar <= index ? css.lit : undefined} />)}</span>
              <b>{item.label}</b><small>{item.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={css.outlook}>
        <div className={css.outlookHead}>
          <span>{changed ? 'IF YOU SWITCH' : 'YOUR POLICY TODAY'}</span>
          {changed ? <small>now → next week</small> : appliesNextWeek ? <em>starts next week</em> : null}
        </div>
        {!settledAvailable ? (
          <p className={css.pending}>The first settled week fills this in. Until then, the policy simply waits.</p>
        ) : rows.map(row => (
          <div key={row.label} className={css.row} style={{ ['--g' as string]: row.colour }}>
            <span>{row.label}</span>
            {changed
              ? <b className={tone(row)}><s>{row.now}</s><i aria-hidden="true">→</i>{row.next}{row.unit && <small>{row.unit}</small>}</b>
              : <b>{row.now}{row.unit && <small>{row.unit}</small>}</b>}
            <i className={css.gauge} aria-hidden="true"><em style={{ width: `${Math.round(row.nextAt * 100)}%` }} />{changed && <u style={{ left: `${Math.round(row.nowAt * 100)}%` }} />}</i>
          </div>
        ))}
      </div>

      <p className={css.note}>
        {payingMembers
          ? `Outside homes watch for free and use your network. Sharers your rules turn away can stay as paying extra members on plans with Extra member: about ${Math.round(control.extraMemberShare * 100)}% of them pay 40% of the plan's price.`
          : 'Sharing never turns into paying customers here: outside homes watch for free and use your network.'}
        {' '}Stricter rules cut that load but cost a policing team and push some subscribers to cancel{control.crackdownFactor < 1 ? `, ${Math.round((1 - control.crackdownFactor) * 100)}% fewer with Household detection` : ''}.
        {' '}Changes apply from the next weekly settlement and cost nothing to switch.
      </p>
      {policy.source === 'LEADERSHIP_DEFAULT' && !changed && (
        <p className={css.source}>Set by your leadership (Balanced + Standard). Choosing a policy makes it yours.</p>
      )}
      {changed && (
        <div className={css.actions}>
          <button type="button" className={css.apply} onClick={() => onApply({ sharingPosture: posture, enforcementInvestment: enforcement })}>Apply from next week</button>
          <button type="button" className={css.reset} onClick={() => { setPosture(policy.sharingPosture); setEnforcement(policy.enforcementInvestment); }}>Keep current</button>
        </div>
      )}
    </div>
  );
};
