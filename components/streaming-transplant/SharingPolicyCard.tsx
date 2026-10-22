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
   ========================================================================== */

import React, { useEffect, useMemo, useState } from 'react';
import css from './presentation/screens/AudienceDesk/SharingPolicy.module.css';
import { cx } from './presentation/cx';
import { compact } from './audienceAtlasModel';
import { previewStreamingSharingPolicy, type StreamingSharingPolicyFigures } from '../../services/streamingSharingPolicy';
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
  onApply: (policy: { sharingPosture: StreamingSharingPosture; enforcementInvestment: StreamingEnforcementInvestment }) => void;
}> = ({ accent, policy, settled, settledPolicy, settledAvailable, appliesNextWeek = false, onApply }) => {
  const [posture, setPosture] = useState<StreamingSharingPosture>(policy.sharingPosture);
  const [enforcement, setEnforcement] = useState<StreamingEnforcementInvestment>(policy.enforcementInvestment);
  /* follow the saved policy if it changes underneath (e.g. after Apply) */
  useEffect(() => { setPosture(policy.sharingPosture); setEnforcement(policy.enforcementInvestment); }, [policy.enforcementInvestment, policy.sharingPosture]);
  const changed = posture !== policy.sharingPosture || enforcement !== policy.enforcementInvestment;
  const outlook = useMemo(
    () => previewStreamingSharingPolicy(settled, settledPolicy || policy, { sharingPosture: posture, enforcementInvestment: enforcement }),
    [enforcement, policy, posture, settled, settledPolicy],
  );

  /* For each effect: which direction is good for you. More outside homes and
     more piracy are not revenue: they are viewers who pay you nothing. */
  const rows: Array<{ label: string; now: string; next: string; better: 'down' | 'up' | 'none'; delta: number; unit?: string }> = [
    { label: 'Outside homes on your accounts', now: compact(outlook.now.sharedHomes), next: compact(outlook.next.sharedHomes), better: 'none', delta: outlook.next.sharedHomes - outlook.now.sharedHomes },
    { label: 'Network load', now: compact(outlook.now.accessLoadAccounts), next: compact(outlook.next.accessLoadAccounts), better: 'down', delta: outlook.next.accessLoadAccounts - outlook.now.accessLoadAccounts, unit: 'accounts' },
    { label: 'Policing cost', now: money(outlook.now.weeklyEnforcementCost), next: money(outlook.next.weeklyEnforcementCost), better: 'down', delta: outlook.next.weeklyEnforcementCost - outlook.now.weeklyEnforcementCost, unit: 'a week' },
    { label: 'Extra cancellations', now: percent(outlook.now.extraWeeklyCancellation), next: percent(outlook.next.extraWeeklyCancellation), better: 'down', delta: outlook.next.extraWeeklyCancellation - outlook.now.extraWeeklyCancellation, unit: 'a week' },
    { label: 'Piracy', now: compact(outlook.now.piracyReach), next: compact(outlook.next.piracyReach), better: 'down', delta: outlook.next.piracyReach - outlook.now.piracyReach, unit: 'people' },
  ];
  const tone = (row: typeof rows[number]) => (row.delta === 0 || row.better === 'none' ? '' : (row.delta < 0) === (row.better === 'down') ? css.good : css.bad);

  return (
    <div className={css.card} style={{ ['--policy-accent' as string]: accent }}>
      <span className={css.eyebrow}>ACCOUNT SHARING</span>
      <h3 className={css.title}>Who can watch on one paid account?</h3>

      <div className={css.lever}>
        <span>SHARING POSTURE</span>
        <div className={css.segments} role="radiogroup" aria-label="Sharing posture">
          {POSTURES.map(item => (
            <button key={item.id} type="button" role="radio" aria-checked={posture === item.id}
              className={cx(posture === item.id && css.on, policy.sharingPosture === item.id && css.current)} onClick={() => setPosture(item.id)}>
              <b>{item.label}</b><small>{item.hint}</small>
            </button>
          ))}
        </div>
      </div>
      <div className={css.lever}>
        <span>ENFORCEMENT</span>
        <div className={css.segments} role="radiogroup" aria-label="Enforcement">
          {ENFORCEMENT.map(item => (
            <button key={item.id} type="button" role="radio" aria-checked={enforcement === item.id}
              className={cx(enforcement === item.id && css.on, policy.enforcementInvestment === item.id && css.current)} onClick={() => setEnforcement(item.id)}>
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
          <div key={row.label} className={css.row}>
            <span>{row.label}</span>
            {changed
              ? <b className={tone(row)}><s>{row.now}</s><i aria-hidden="true">→</i>{row.next}{row.unit && <small>{row.unit}</small>}</b>
              : <b>{row.now}{row.unit && <small>{row.unit}</small>}</b>}
          </div>
        ))}
      </div>

      <p className={css.note}>
        Sharing never turns into paying customers here: outside homes watch for free and use your network.
        Stricter rules cut that load but cost a policing team and push some subscribers to cancel.
        Changes apply from the next weekly settlement and cost nothing to switch.
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
