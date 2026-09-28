import { Capacitor, registerPlugin } from '@capacitor/core';
import type { StartupDiagnosticEvent } from './startupDiagnostics';

export interface NativeStartupRecoveryState {
  available: boolean;
  safeModeRecommended: boolean;
  consecutiveStartupFailures: number;
  rendererRestartCount: number;
  lastCheckpoint?: string;
  lastFailedTask?: string;
  lastFailureCode?: string;
  appVersion?: string;
  androidVersion?: string;
  webViewVersion?: string;
  memoryClassMb?: number;
  online?: boolean;
}

interface StartupRecoveryPlugin {
  checkpoint(event: StartupDiagnosticEvent): Promise<void>;
  getState(): Promise<Record<string, unknown>>;
}

const StartupRecovery = registerPlugin<StartupRecoveryPlugin>('StartupRecovery');

const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const notifyNativeStartupCheckpoint = async (event: StartupDiagnosticEvent): Promise<void> => {
  if (!isAndroid()) return;
  await StartupRecovery.checkpoint(event);
};

const numberOrZero = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
);

const shortText = (value: unknown) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : undefined
);

export const readNativeStartupRecoveryState = async (): Promise<NativeStartupRecoveryState> => {
  if (!isAndroid()) {
    return {
      available: false,
      safeModeRecommended: false,
      consecutiveStartupFailures: 0,
      rendererRestartCount: 0,
    };
  }

  try {
    const state = await StartupRecovery.getState();
    return {
      available: true,
      safeModeRecommended: state.safeModeRecommended === true,
      consecutiveStartupFailures: numberOrZero(state.consecutiveStartupFailures),
      rendererRestartCount: numberOrZero(state.rendererRestartCount),
      lastCheckpoint: shortText(state.lastCheckpoint),
      lastFailedTask: shortText(state.lastFailedTask),
      lastFailureCode: shortText(state.lastFailureCode),
      appVersion: shortText(state.appVersion),
      androidVersion: shortText(state.androidVersion),
      webViewVersion: shortText(state.webViewVersion),
      memoryClassMb: numberOrZero(state.memoryClassMb) || undefined,
      online: typeof state.online === 'boolean' ? state.online : undefined,
    };
  } catch {
    return {
      available: false,
      safeModeRecommended: false,
      consecutiveStartupFailures: 0,
      rendererRestartCount: 0,
    };
  }
};
