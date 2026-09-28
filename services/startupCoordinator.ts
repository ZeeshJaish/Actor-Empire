export type StartupTaskId =
  | 'APP_CORE'
  | 'CRITICAL_ASSETS'
  | 'STORAGE'
  | 'SAVE_SUMMARIES'
  | 'HOME_SCREEN'
  | 'FIRST_SCREEN';
export type StartupTaskStatus = 'PENDING' | 'RUNNING' | 'READY' | 'FAILED' | 'TIMED_OUT' | 'RECOVERED';
export type StartupOutcome = 'IDLE' | 'RUNNING' | 'READY' | 'FAILED' | 'TIMED_OUT';
export type StartupFailureKind = 'NETWORK' | 'STORAGE' | 'ASSET' | 'WEBVIEW' | 'APP';

export interface StartupTaskState {
  status: StartupTaskStatus;
  weight: number;
}

export interface StartupFailure {
  taskId: StartupTaskId;
  message: string;
  kind: StartupFailureKind;
}

export interface StartupState {
  attemptId: number;
  outcome: StartupOutcome;
  progress: number;
  activeTaskId: StartupTaskId | null;
  failure: StartupFailure | null;
  tasks: Record<StartupTaskId, StartupTaskState>;
}

const STARTUP_TASK_WEIGHTS: Record<StartupTaskId, number> = {
  APP_CORE: 10,
  CRITICAL_ASSETS: 15,
  STORAGE: 25,
  SAVE_SUMMARIES: 20,
  HOME_SCREEN: 20,
  FIRST_SCREEN: 10,
};

const createTasks = (): StartupState['tasks'] => ({
  APP_CORE: { status: 'PENDING', weight: STARTUP_TASK_WEIGHTS.APP_CORE },
  CRITICAL_ASSETS: { status: 'PENDING', weight: STARTUP_TASK_WEIGHTS.CRITICAL_ASSETS },
  STORAGE: { status: 'PENDING', weight: STARTUP_TASK_WEIGHTS.STORAGE },
  SAVE_SUMMARIES: { status: 'PENDING', weight: STARTUP_TASK_WEIGHTS.SAVE_SUMMARIES },
  HOME_SCREEN: { status: 'PENDING', weight: STARTUP_TASK_WEIGHTS.HOME_SCREEN },
  FIRST_SCREEN: { status: 'PENDING', weight: STARTUP_TASK_WEIGHTS.FIRST_SCREEN },
});

const isCompletedTask = (status: StartupTaskStatus): boolean => status === 'READY' || status === 'RECOVERED';

const calculateProgress = (tasks: StartupState['tasks']): number => (
  Object.values(tasks).reduce((total, task) => total + (isCompletedTask(task.status) ? task.weight : 0), 0)
);

const isTerminal = (state: StartupState): boolean => (
  state.outcome === 'READY' || state.outcome === 'FAILED' || state.outcome === 'TIMED_OUT'
);

const transitionTask = (
  state: StartupState,
  taskId: StartupTaskId,
  attemptId: number,
  status: StartupTaskStatus,
  message?: string,
  failureKind: StartupFailureKind = 'APP',
): StartupState => {
  if (attemptId !== state.attemptId || isTerminal(state)) return state;

  const previousStatus = state.tasks[taskId].status;
  if (isCompletedTask(previousStatus) || previousStatus === 'FAILED' || previousStatus === 'TIMED_OUT') return state;

  const tasks = {
    ...state.tasks,
    [taskId]: { ...state.tasks[taskId], status },
  };
  const failed = status === 'FAILED' || status === 'TIMED_OUT';
  const ready = Object.values(tasks).every(task => isCompletedTask(task.status));

  return {
    ...state,
    tasks,
    progress: calculateProgress(tasks),
    activeTaskId: failed || ready ? null : taskId,
    outcome: failed ? status : ready ? 'READY' : 'RUNNING',
    failure: failed ? { taskId, message: message || 'Startup task failed.', kind: failureKind } : null,
  };
};

export const createStartupState = (): StartupState => ({
  attemptId: 0,
  outcome: 'IDLE',
  progress: 0,
  activeTaskId: null,
  failure: null,
  tasks: createTasks(),
});

export const beginStartupAttempt = (state: StartupState): StartupState => ({
  attemptId: state.attemptId + 1,
  outcome: 'RUNNING',
  progress: 0,
  activeTaskId: 'APP_CORE',
  failure: null,
  tasks: createTasks(),
});

export const beginStartupRetry = (state: StartupState): StartupState => {
  if (!state.failure) return state;
  const taskId = state.failure.taskId;
  const tasks = {
    ...state.tasks,
    [taskId]: { ...state.tasks[taskId], status: 'RUNNING' as const },
  };
  return {
    ...state,
    attemptId: state.attemptId + 1,
    outcome: 'RUNNING',
    progress: calculateProgress(tasks),
    activeTaskId: taskId,
    failure: null,
    tasks,
  };
};

export const startStartupTask = (
  state: StartupState,
  taskId: StartupTaskId,
  attemptId: number,
): StartupState => transitionTask(state, taskId, attemptId, 'RUNNING');

export const completeStartupTask = (
  state: StartupState,
  taskId: StartupTaskId,
  attemptId: number,
): StartupState => transitionTask(state, taskId, attemptId, 'READY');

export const recoverStartupTask = (
  state: StartupState,
  taskId: StartupTaskId,
  attemptId: number,
): StartupState => transitionTask(state, taskId, attemptId, 'RECOVERED');

export const failStartupTask = (
  state: StartupState,
  taskId: StartupTaskId,
  attemptId: number,
  message: string,
  failureKind: StartupFailureKind = 'APP',
): StartupState => transitionTask(state, taskId, attemptId, 'FAILED', message, failureKind);

export const timeoutStartupTask = (
  state: StartupState,
  taskId: StartupTaskId,
  attemptId: number,
  message: string,
  failureKind: StartupFailureKind = 'APP',
): StartupState => transitionTask(state, taskId, attemptId, 'TIMED_OUT', message, failureKind);
