import { money } from './format';

export type LinkedBudgetStatus = 'Not planned' | 'Draft' | 'Approved' | 'Commissioned' | 'Building' | 'Live';

export interface LinkedBudgetMetric {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad' | 'flat';
}

export interface LinkedBudgetSummary {
  program: 'Define the Launch' | 'Build the Platform';
  status: LinkedBudgetStatus;
  primaryLabel: string;
  primaryValue: string;
  metrics: LinkedBudgetMetric[];
}

export interface BuildBudgetSummaryInput {
  hasDraft: boolean;
  approved: boolean;
  commissioned: boolean;
  live: boolean;
  total: number;
  weeklyOperatingCost: number;
  buildWeeks: number;
  buildWeeksRemaining?: number;
  racks: number;
  cities: number;
  redundancy: string;
}

export function createBuildBudgetSummary(input: BuildBudgetSummaryInput): LinkedBudgetSummary {
  const status: LinkedBudgetStatus = input.live
    ? 'Live'
    : input.commissioned && (input.buildWeeksRemaining ?? 0) > 0
      ? 'Building'
    : input.commissioned
      ? 'Commissioned'
      : input.approved
        ? 'Approved'
        : input.hasDraft
          ? 'Draft'
          : 'Not planned';
  const resilienceTone = /redundant|resilient/i.test(input.redundancy)
    ? 'good' as const
    : /exposed|single|fragile/i.test(input.redundancy)
      ? 'warn' as const
      : 'flat' as const;

  return {
    program: 'Build the Platform',
    status,
    primaryLabel: input.commissioned || input.live ? 'Capital invested' : 'Proposed build',
    primaryValue: money(input.total),
    metrics: [
      { label: 'Network', value: `${input.racks} racks · ${input.cities} ${input.cities === 1 ? 'city' : 'cities'}` },
      { label: 'Resilience', value: input.redundancy, tone: resilienceTone },
      { label: 'Weekly operation', value: money(input.weeklyOperatingCost) },
      input.commissioned && (input.buildWeeksRemaining ?? 0) > 0
        ? {
            label: 'Construction',
            value: `${input.buildWeeksRemaining} ${input.buildWeeksRemaining === 1 ? 'week' : 'weeks'} remaining`,
            tone: 'warn' as const,
          }
        : { label: 'Build time', value: `${input.buildWeeks} ${input.buildWeeks === 1 ? 'week' : 'weeks'}` },
    ],
  };
}

export interface LaunchBudgetSummaryInput {
  completedStages: number;
  totalStages: number;
  knownSubtotal: number;
  paidAmount: number;
  dueAmount: number;
  blueprintSaved: boolean;
  live: boolean;
}

export function createLaunchBudgetSummary(input: LaunchBudgetSummaryInput): LinkedBudgetSummary {
  const status: LinkedBudgetStatus = input.live
    ? 'Live'
    : input.blueprintSaved
      ? 'Approved'
      : input.completedStages > 0
        ? 'Draft'
        : 'Not planned';
  return {
    program: 'Define the Launch',
    status,
    primaryLabel: 'Known launch subtotal',
    primaryValue: money(input.knownSubtotal),
    metrics: [
      { label: 'Stages cleared', value: `${input.completedStages}/${input.totalStages}` },
      { label: 'Paid', value: money(input.paidAmount), tone: input.paidAmount > 0 ? 'good' : 'flat' },
      { label: 'Still due', value: money(input.dueAmount), ...(input.dueAmount > 0 ? { tone: 'warn' as const } : {}) },
    ],
  };
}

export type LinkedBudgetOrigin = 'LAUNCH' | 'BUILD';

export function countCompletedBudgetSteps<T extends string>(checks: Array<{ step: T; complete: boolean }>): number {
  return new Set(checks
    .filter(check => check.complete && check.step !== 'FUND')
    .map(check => check.step)).size;
}

export function resolveLinkedBudgetDestination(origin: LinkedBudgetOrigin) {
  return origin === 'LAUNCH'
    ? { surface: 'BUILD' as const, sheet: 'build' as const }
    : { surface: 'DEFINE_LAUNCH' as const, sheet: 'plan' as const };
}
