export interface StartupIdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

export interface StartupBackgroundTask {
  id: string;
  prepare(): Promise<unknown>;
}

type IdleHandle = unknown;

type StartupBackgroundSchedulerDependencies = {
  requestIdle?: (callback: (deadline: StartupIdleDeadline) => void) => IdleHandle;
  cancelIdle?: (handle: IdleHandle) => void;
  onTaskError?: (taskId: string, error: unknown) => void;
};

export interface StartupBackgroundScheduler {
  enqueue(tasks: StartupBackgroundTask[]): void;
  runNow(task: StartupBackgroundTask): Promise<void>;
  cancelPending(): void;
  dispose(): void;
}

const createBrowserIdleAdapter = () => {
  const requestIdleCallback = globalThis.requestIdleCallback?.bind(globalThis);
  const cancelIdleCallback = globalThis.cancelIdleCallback?.bind(globalThis);
  return {
    requestIdle: (callback: (deadline: StartupIdleDeadline) => void): IdleHandle => {
      if (requestIdleCallback) return requestIdleCallback(callback, { timeout: 1_500 });
      return globalThis.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 32);
    },
    cancelIdle: (handle: IdleHandle) => {
      if (requestIdleCallback && cancelIdleCallback) {
        cancelIdleCallback(handle as number);
      } else {
        globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    },
  };
};

export const createStartupBackgroundScheduler = (
  dependencies: StartupBackgroundSchedulerDependencies = {},
): StartupBackgroundScheduler => {
  const browserAdapter = createBrowserIdleAdapter();
  const requestIdle = dependencies.requestIdle || browserAdapter.requestIdle;
  const cancelIdle = dependencies.cancelIdle || browserAdapter.cancelIdle;
  const completed = new Set<string>();
  const inFlight = new Map<string, Promise<void>>();
  let queue: StartupBackgroundTask[] = [];
  let idleHandle: IdleHandle | null = null;
  let disposed = false;

  const execute = (task: StartupBackgroundTask): Promise<void> => {
    if (disposed || completed.has(task.id)) return Promise.resolve();
    const existing = inFlight.get(task.id);
    if (existing) return existing;

    const operation = Promise.resolve()
      .then(() => task.prepare())
      .then(() => { completed.add(task.id); })
      .catch(error => { dependencies.onTaskError?.(task.id, error); })
      .finally(() => { inFlight.delete(task.id); });
    inFlight.set(task.id, operation);
    return operation;
  };

  const scheduleNext = () => {
    if (disposed || idleHandle !== null || queue.length === 0) return;
    idleHandle = requestIdle(() => {
      idleHandle = null;
      const task = queue.shift();
      if (!task || disposed) return;
      void execute(task).finally(scheduleNext);
    });
  };

  return {
    enqueue: tasks => {
      if (disposed) return;
      const queuedIds = new Set(queue.map(task => task.id));
      tasks.forEach(task => {
        if (completed.has(task.id) || inFlight.has(task.id) || queuedIds.has(task.id)) return;
        queue.push(task);
        queuedIds.add(task.id);
      });
      scheduleNext();
    },
    runNow: async task => {
      if (disposed) return;
      queue = queue.filter(queuedTask => queuedTask.id !== task.id);
      if (idleHandle !== null && queue.length === 0) {
        cancelIdle(idleHandle);
        idleHandle = null;
      }
      await execute(task);
      scheduleNext();
    },
    cancelPending: () => {
      queue = [];
      if (idleHandle !== null) {
        cancelIdle(idleHandle);
        idleHandle = null;
      }
    },
    dispose: () => {
      disposed = true;
      queue = [];
      if (idleHandle !== null) {
        cancelIdle(idleHandle);
        idleHandle = null;
      }
    },
  };
};
