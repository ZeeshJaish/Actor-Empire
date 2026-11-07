/* ============================================================================
   ACCOUNT-SHARING POLICY — the numbers the weekly settlement applies, in one
   place, so the game and its preview can never disagree.

   The player's policy has two levers:
     sharing posture   how many outside homes may watch on one paid account
     enforcement       how hard sharing (and piracy) is policed, at a weekly cost

   What the settlement does with them (worldStreamingCustomers.applyAccessPaths
   and advanceCohort, streamingWeeklyLoop's enforcement cost):
     - outside homes watching on your accounts scale with posture × enforcement
       (rival services always sit at Balanced + Standard)
     - each shared home adds 0.72 accounts of delivery load
     - enforcement scales piracy everywhere (the policy is world-wide)
     - Household only and Aggressive each add 0.4% a week to your cancellations
     - enforcement costs a fixed team plus a little per account of load
   Sharing control in Tech (Trust and safety, #56) changes three of these for the player:
     - Household detection leaves 50 / 40 / 30% of the extra cancellations
     - Device check multiplies the outside homes by 0.75 / 0.7 / 0.65
     - Paid extra member: on plans selling Extra member, 35 / 40 / 45% of the sharers the rules turn
       away pay 40% of the plan's price to stay (they watch, and load the network, as shared homes)
   Without it, sharing never turns into paying customers. Prices and reputation are untouched.

   Extracted from those two files without changing a single value.
   ========================================================================== */

import type { StreamingEnforcementInvestment, StreamingSharingPosture, WorldStreamingCustomerAccessPolicy } from '../types';

export const STREAMING_SHARING_POLICY_EFFECTS = {
    /** Multiplies the outside homes that watch on a paid account. */
    sharingPosture: { REACH_FIRST: 1.3, BALANCED: .75, HOUSEHOLD_ONLY: .24 } as Record<StreamingSharingPosture, number>,
    /** Multiplies the same, by how hard sharing is policed. */
    sharingEnforcement: { LIGHT: 1.08, STANDARD: .78, AGGRESSIVE: .48 } as Record<StreamingEnforcementInvestment, number>,
    /** Multiplies piracy tendency in every country (the policy is world-wide). */
    piracyEnforcement: { LIGHT: 1.18, STANDARD: .8, AGGRESSIVE: .48 } as Record<StreamingEnforcementInvestment, number>,
    /** Extra weekly cancellation rate for your accounts under Household only. */
    householdOnlyWeeklyCancellation: .004,
    /** Extra weekly cancellation rate for your accounts under Aggressive enforcement. */
    aggressiveWeeklyCancellation: .004,
    /** Delivery load each shared home adds, in accounts. */
    sharedLoadPerHome: .72,
} as const;

/** What policing account sharing costs a week: a fixed team plus a little per account of delivery load. */
export const STREAMING_SHARING_ENFORCEMENT_COST = {
    fixed: { LIGHT: 25_000, STANDARD: 100_000, AGGRESSIVE: 350_000 } as Record<StreamingEnforcementInvestment, number>,
    perAccessAccount: { LIGHT: .005, STANDARD: .012, AGGRESSIVE: .025 } as Record<StreamingEnforcementInvestment, number>,
} as const;

/** Anything unrecognised sits at Balanced + Standard, as the settlement always did. */
export const streamingSharingPostureFactor = (posture: StreamingSharingPosture | undefined): number => (
    (posture ? STREAMING_SHARING_POLICY_EFFECTS.sharingPosture[posture] : undefined) ?? STREAMING_SHARING_POLICY_EFFECTS.sharingPosture.BALANCED
);
export const streamingSharingEnforcementFactor = (enforcement: StreamingEnforcementInvestment | undefined): number => (
    (enforcement ? STREAMING_SHARING_POLICY_EFFECTS.sharingEnforcement[enforcement] : undefined) ?? STREAMING_SHARING_POLICY_EFFECTS.sharingEnforcement.STANDARD
);
export const streamingPiracyEnforcementFactor = (enforcement: StreamingEnforcementInvestment | undefined): number => (
    (enforcement ? STREAMING_SHARING_POLICY_EFFECTS.piracyEnforcement[enforcement] : undefined) ?? STREAMING_SHARING_POLICY_EFFECTS.piracyEnforcement.STANDARD
);
export const streamingPolicyWeeklyCancellationRate = (policy: Pick<WorldStreamingCustomerAccessPolicy, 'sharingPosture' | 'enforcementInvestment'>): number => (
    (policy.sharingPosture === 'HOUSEHOLD_ONLY' ? STREAMING_SHARING_POLICY_EFFECTS.householdOnlyWeeklyCancellation : 0)
    + (policy.enforcementInvestment === 'AGGRESSIVE' ? STREAMING_SHARING_POLICY_EFFECTS.aggressiveWeeklyCancellation : 0)
);
/** Anything other than Aggressive or Standard is billed as Light, as the settlement always did. */
export const streamingSharingEnforcementWeeklyCost = (enforcement: StreamingEnforcementInvestment | undefined, accessLoadAccounts: number): number => {
    const level: StreamingEnforcementInvestment = enforcement === 'AGGRESSIVE' || enforcement === 'STANDARD' ? enforcement : 'LIGHT';
    return STREAMING_SHARING_ENFORCEMENT_COST.fixed[level] + accessLoadAccounts * STREAMING_SHARING_ENFORCEMENT_COST.perAccessAccount[level];
};

/* ── a one-glance preview of switching policy ─────────────────────────────── */
export interface StreamingSharingPolicyFigures {
    paidAccounts: number;
    /** Outside homes watching on your accounts. */
    sharedHomes: number;
    /** People watching your titles through piracy. */
    piracyReach: number;
    accessLoadAccounts: number;
    /** Sharers paying to stay as extra members (#56). */
    extraMembers?: number;
}
export interface StreamingSharingPolicyOutlook {
    sharedHomes: number;
    accessLoadAccounts: number;
    weeklyEnforcementCost: number;
    /** Extra weekly cancellation rate (0.004 = 0.4% a week). */
    extraWeeklyCancellation: number;
    piracyReach: number;
    /** Sharers paying to stay as extra members (#56). */
    extraMembers: number;
}
/** What the player's Sharing control in Tech does to the policy (#56); none owned, all neutral. */
export interface StreamingSharingControl {
    /** Household detection: the share of the extra cancellations left */
    crackdownFactor: number;
    /** Device check: what outside homes are multiplied by */
    sharingCheck: number;
    /** Paid extra member: of the sharers turned away, the share who pay to stay (0 without it) */
    extraMemberShare: number;
    /** whether any plan sells Extra member */
    sellsExtraMember: boolean;
}
export const STREAMING_NO_SHARING_CONTROL: StreamingSharingControl = { crackdownFactor: 1, sharingCheck: 1, extraMemberShare: 0, sellsExtraMember: false };
type PolicyLevers = Pick<WorldStreamingCustomerAccessPolicy, 'sharingPosture' | 'enforcementInvestment'>;

/** From last week's settled figures under the current policy, what the next
    settlement would look like under another. Delivery load, enforcement cost
    and the extra cancellations follow the settlement exactly. Shared homes and
    piracy are scaled by the policy factors; the settlement also caps them by
    the homes that pay for nothing and mixes in affordability, so those two are
    estimates. */
export const previewStreamingSharingPolicy = (
    settled: StreamingSharingPolicyFigures,
    current: PolicyLevers,
    next: PolicyLevers,
    /** the player's Sharing control in Tech (#56); without it, as before */
    control: StreamingSharingControl = STREAMING_NO_SHARING_CONTROL,
): { now: StreamingSharingPolicyOutlook; next: StreamingSharingPolicyOutlook } => {
    const sharingFactor = (policy: PolicyLevers) => streamingSharingPostureFactor(policy.sharingPosture) * streamingSharingEnforcementFactor(policy.enforcementInvestment);
    const sharedNext = Math.round(settled.sharedHomes * sharingFactor(next) / Math.max(1e-6, sharingFactor(current)));
    // extra members (#56) are the turned-away sharers who pay: they follow how many the rules turn away
    const openest = STREAMING_SHARING_POLICY_EFFECTS.sharingPosture.REACH_FIRST * STREAMING_SHARING_POLICY_EFFECTS.sharingEnforcement.LIGHT;
    const turnedAway = (policy: PolicyLevers) => Math.max(0, openest - sharingFactor(policy) * control.sharingCheck);
    const extraNow = Math.max(0, Math.round(settled.extraMembers || 0));
    const extraNext = turnedAway(current) > 0 ? Math.round(extraNow * turnedAway(next) / turnedAway(current)) : extraNow;
    const loadNext = settled.paidAccounts + Math.round((sharedNext + extraNext) * STREAMING_SHARING_POLICY_EFFECTS.sharedLoadPerHome);
    const piracyNext = Math.round(settled.piracyReach * streamingPiracyEnforcementFactor(next.enforcementInvestment)
        / Math.max(1e-6, streamingPiracyEnforcementFactor(current.enforcementInvestment)));
    return {
        now: {
            sharedHomes: settled.sharedHomes,
            accessLoadAccounts: settled.accessLoadAccounts,
            weeklyEnforcementCost: streamingSharingEnforcementWeeklyCost(current.enforcementInvestment, settled.accessLoadAccounts),
            extraWeeklyCancellation: streamingPolicyWeeklyCancellationRate(current) * control.crackdownFactor,
            piracyReach: settled.piracyReach,
            extraMembers: extraNow,
        },
        next: {
            sharedHomes: sharedNext,
            accessLoadAccounts: loadNext,
            weeklyEnforcementCost: streamingSharingEnforcementWeeklyCost(next.enforcementInvestment, loadNext),
            extraWeeklyCancellation: streamingPolicyWeeklyCancellationRate(next) * control.crackdownFactor,
            piracyReach: piracyNext,
            extraMembers: extraNext,
        },
    };
};
