import type { StartupTaskId } from './startupCoordinator';

const SAFE_MODE_CRITICAL_TASKS = new Set<StartupTaskId>([
  'CRITICAL_ASSETS',
  'HOME_SCREEN',
]);

export interface StartupFailureCountDecision {
  count: number;
  shouldArmSafeMode: boolean;
}

export const advanceStartupFailureCount = (
  previousCount: number,
  taskId: StartupTaskId,
): StartupFailureCountDecision => {
  const count = Math.max(0, Math.floor(previousCount)) + 1;
  return {
    count,
    shouldArmSafeMode: count >= 2 && SAFE_MODE_CRITICAL_TASKS.has(taskId),
  };
};
