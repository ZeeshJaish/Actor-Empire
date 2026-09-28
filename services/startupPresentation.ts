import type {
  StartupFailureKind,
  StartupState,
  StartupTaskId,
} from './startupCoordinator';

export interface StartupFailurePresentation {
  title: string;
  message: string;
  primaryActionLabel: 'Retry';
  secondaryActionLabel: 'Restart Game';
}

export interface StartupPresentation {
  status: string;
  supportingMessage?: string;
  failure?: StartupFailurePresentation;
}

const STARTUP_STATUS: Record<StartupTaskId, string> = {
  APP_CORE: 'Preparing Actor Empire…',
  CRITICAL_ASSETS: 'Checking game files…',
  STORAGE: 'Opening career storage…',
  SAVE_SUMMARIES: 'Checking your save files…',
  HOME_SCREEN: 'Loading game screens…',
  FIRST_SCREEN: 'Almost ready…',
};

const getFailurePresentation = (kind: StartupFailureKind): StartupFailurePresentation => {
  switch (kind) {
    case 'NETWORK':
      return {
        title: 'Connection interrupted',
        message: 'A network issue interrupted startup. Retry now. If it continues, restart the game.',
        primaryActionLabel: 'Retry',
        secondaryActionLabel: 'Restart Game',
      };
    case 'STORAGE':
      return {
        title: 'Career storage did not respond',
        message: 'Actor Empire could not safely read your career storage. Your existing careers have not been changed.',
        primaryActionLabel: 'Retry',
        secondaryActionLabel: 'Restart Game',
      };
    case 'WEBVIEW':
      return {
        title: 'Android system update needed',
        message: 'Actor Empire could not start in this Android WebView. Update Android System WebView, then restart the game.',
        primaryActionLabel: 'Retry',
        secondaryActionLabel: 'Restart Game',
      };
    case 'ASSET':
      return {
        title: 'Game files did not load',
        message: 'A required Actor Empire file could not be prepared. No career data was changed.',
        primaryActionLabel: 'Retry',
        secondaryActionLabel: 'Restart Game',
      };
    default:
      return {
        title: 'Actor Empire could not finish loading',
        message: 'Startup stopped safely before the game opened. No career data was changed.',
        primaryActionLabel: 'Retry',
        secondaryActionLabel: 'Restart Game',
      };
  }
};

export const getStartupPresentation = (
  state: StartupState,
  options: { takingLonger?: boolean } = {},
): StartupPresentation => {
  const taskId = state.failure?.taskId || state.activeTaskId || 'FIRST_SCREEN';
  return {
    status: state.failure ? 'Startup paused' : STARTUP_STATUS[taskId],
    supportingMessage: !state.failure && options.takingLonger
      ? 'Taking a moment. Your careers are safe.'
      : undefined,
    failure: state.failure ? getFailurePresentation(state.failure.kind) : undefined,
  };
};
