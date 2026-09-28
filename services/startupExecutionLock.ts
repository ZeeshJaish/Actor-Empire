export type StartupExecutionLease = symbol;

export interface StartupExecutionLock {
  tryAcquire(): StartupExecutionLease | null;
  release(lease: StartupExecutionLease): void;
  isLocked(): boolean;
}

export const createStartupExecutionLock = (): StartupExecutionLock => {
  let activeLease: StartupExecutionLease | null = null;
  return {
    tryAcquire: () => {
      if (activeLease) return null;
      activeLease = Symbol('startup-execution');
      return activeLease;
    },
    release: lease => {
      if (activeLease === lease) activeLease = null;
    },
    isLocked: () => activeLease !== null,
  };
};
