import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { FirebasePerformance } from '@capacitor-firebase/performance';
import { APP_DISPLAY_VERSION } from './appVersion';
import { Player } from '../types';

let firebaseBootstrapped = false;
let firebaseAuthBootstrapped = false;
let firebasePushBootstrapped = false;
let firebasePushListenersInstalled = false;
let firebaseAuthUserId: string | null = null;
export type FirebaseAuthStatus = {
  state: 'idle' | 'web_skipped' | 'starting' | 'ready' | 'signed_out' | 'failed';
  userId: string | null;
  isNative: boolean;
  error?: string;
};
export type FirebasePushPermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';
export type FirebasePushStatus = {
  state: 'web_skipped' | 'not_requested' | 'checking' | 'prompting' | 'ready' | 'denied' | 'failed';
  receive?: FirebasePushPermissionState;
  tokenTail: string | null;
  isNative: boolean;
  error?: string;
};
let firebaseAuthStatus: FirebaseAuthStatus = {
  state: Capacitor.isNativePlatform() ? 'idle' : 'web_skipped',
  userId: null,
  isNative: Capacitor.isNativePlatform(),
};
let firebasePushStatus: FirebasePushStatus = {
  state: Capacitor.isNativePlatform() ? 'not_requested' : 'web_skipped',
  tokenTail: null,
  isNative: Capacitor.isNativePlatform(),
};
const firebaseAuthStatusListeners = new Set<(status: FirebaseAuthStatus) => void>();
const firebasePushStatusListeners = new Set<(status: FirebasePushStatus) => void>();
const activeTraceStarts = new Map<string, Promise<boolean>>();
const stoppingTraceNames = new Set<string>();
const RESERVED_ANALYTICS_PREFIXES = ['firebase_', 'google_', 'ga_'];
const checkpointLastSentAt = new Map<string, number>();
const CHECKPOINT_EVENT_THROTTLE_MS = 5000;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 12000;
const FIREBASE_AUTH_STORAGE_KEY = 'actorEmpire.firebaseAnonymousAuth.v1';
const FIREBASE_AUTH_REFRESH_SAFETY_MS = 5 * 60 * 1000;
const FIRESTORE_ISSUE_REPORT_COLLECTION = 'issueReports';
const TRACE_CONTEXT_LIMIT = 18;
const FIREBASE_WEB_CONFIG = {
  authDomain: 'actor-empire-1ff1d.firebaseapp.com',
  projectId: 'actor-empire-1ff1d',
  storageBucket: 'actor-empire-1ff1d.firebasestorage.app',
  messagingSenderId: '14822737702',
};
const FIREBASE_PLATFORM_CONFIG = {
  android: {
    apiKey: 'AIzaSyCnalAoJJEfPe2ruWYtoyGRVMlp3WVokWg',
    appId: '1:14822737702:android:ff4aeae8ed55b15b10e3e7',
  },
  ios: {
    apiKey: 'AIzaSyDGRfhpsZ5rmawl7C86YJxWtWMY_u3AV48',
    appId: '1:14822737702:ios:f3e2f2eeef10d04a10e3e7',
  },
};

type StoredAnonymousAuth = {
  localId: string;
  idToken?: string;
  refreshToken?: string;
  createdAt: number;
  expiresAt?: number;
};

type TraceContext = {
  last_action?: string;
  last_screen?: string;
  last_event_id?: string;
  last_checkpoint?: string;
  last_report_id?: string;
  greenlight_step?: string;
  active_project_phase?: string;
  save_slot?: string;
  save_size?: number;
  save_key?: string;
  flow?: string;
  updated_at?: string;
};

let traceContext: TraceContext = {};

const runSafely = async (label: string, task: () => Promise<void>) => {
  try {
    await task();
  } catch (error) {
    console.warn(`[Firebase] ${label} skipped`, error);
  }
};

const isNativeTelemetry = () => Capacitor.isNativePlatform();
export const getTelemetryPlatform = () => Capacitor.getPlatform();
export const getFirebaseAuthUserId = () => firebaseAuthUserId;
export const getFirebaseAuthStatus = () => ({ ...firebaseAuthStatus });
export const getFirebasePushStatus = () => ({ ...firebasePushStatus });

export const onFirebaseAuthStatusChanged = (listener: (status: FirebaseAuthStatus) => void) => {
  firebaseAuthStatusListeners.add(listener);
  listener(getFirebaseAuthStatus());
  return () => {
    firebaseAuthStatusListeners.delete(listener);
  };
};

export const onFirebasePushStatusChanged = (listener: (status: FirebasePushStatus) => void) => {
  firebasePushStatusListeners.add(listener);
  listener(getFirebasePushStatus());
  return () => {
    firebasePushStatusListeners.delete(listener);
  };
};

const setFirebaseAuthStatus = (status: Partial<FirebaseAuthStatus>) => {
  firebaseAuthStatus = {
    ...firebaseAuthStatus,
    ...status,
    userId: status.userId !== undefined ? status.userId : firebaseAuthUserId,
    isNative: Capacitor.isNativePlatform(),
  };
  firebaseAuthStatusListeners.forEach((listener) => listener(getFirebaseAuthStatus()));
};

const setFirebasePushStatus = (status: Partial<FirebasePushStatus>) => {
  firebasePushStatus = {
    ...firebasePushStatus,
    ...status,
    isNative: Capacitor.isNativePlatform(),
  };
  firebasePushStatusListeners.forEach((listener) => listener(getFirebasePushStatus()));
};

const attachFirebaseAuthUserId = async () => {
  if (!firebaseAuthUserId || !isNativeTelemetry()) return;
  await Promise.all([
    runSafely('analytics-auth-user-id', () => FirebaseAnalytics.setUserId({ userId: firebaseAuthUserId })),
    runSafely('crashlytics-auth-user-id', () => FirebaseCrashlytics.setUserId({ userId: firebaseAuthUserId })),
    runSafely('crashlytics-auth-key', () =>
      FirebaseCrashlytics.setCustomKey({
        key: 'firebase_auth_uid',
        value: firebaseAuthUserId || '',
        type: 'string',
      })
    ),
  ]);
};

const sanitizeName = (name: string, fallback: string) => {
  const cleaned = name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return cleaned || fallback;
};

const sanitizeEventName = (name: string) => {
  const cleaned = sanitizeName(name, 'game_event');
  const normalized = cleaned.toLowerCase();
  if (RESERVED_ANALYTICS_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return `ae_${cleaned}`.slice(0, 40);
  }
  return cleaned;
};

const sanitizeValue = (value: unknown): string | number | boolean => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 90);
  if (value === null || value === undefined) return '';
  return String(value).slice(0, 90);
};

const sanitizeParams = (params: Record<string, unknown> = {}) => {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([key]) => !!key)
      .slice(0, 25)
      .map(([key, value]) => [sanitizeName(key, 'param'), sanitizeValue(value)])
  );
};

const getCompactTraceParams = () => sanitizeParams({
  trace_action: traceContext.last_action,
  trace_screen: traceContext.last_screen,
  trace_checkpoint: traceContext.last_checkpoint,
  trace_event_id: traceContext.last_event_id,
  trace_report_id: traceContext.last_report_id,
  trace_greenlight_step: traceContext.greenlight_step,
  trace_project_phase: traceContext.active_project_phase,
  trace_save_slot: traceContext.save_slot,
});

export const getTelemetryTraceContext = () => ({ ...traceContext });

export const getFirestoreTraceFields = () => Object.fromEntries(
  Object.entries(getTelemetryTraceContext())
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, TRACE_CONTEXT_LIMIT)
    .map(([key, value]) => [`trace_${sanitizeName(key, 'field')}`, value])
);

const getCrashKeyType = (value: unknown): 'string' | 'long' | 'double' | 'boolean' => {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'double';
  return 'string';
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown error');
};

const getPushPermissionReceive = (permission: unknown): FirebasePushPermissionState | undefined => {
  const receive = (permission as { receive?: FirebasePushPermissionState })?.receive;
  if (receive === 'prompt' || receive === 'prompt-with-rationale' || receive === 'granted' || receive === 'denied') {
    return receive;
  }
  return undefined;
};

const getTokenTail = (token?: string | null) => token ? token.slice(-10) : null;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const readStoredAnonymousAuth = (): StoredAnonymousAuth | null => {
  try {
    const raw = globalThis.localStorage?.getItem(FIREBASE_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAnonymousAuth>;
    if (!parsed.localId || typeof parsed.localId !== 'string') return null;
    return {
      localId: parsed.localId,
      idToken: typeof parsed.idToken === 'string' ? parsed.idToken : undefined,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : undefined,
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
};

const writeStoredAnonymousAuth = (auth: StoredAnonymousAuth) => {
  try {
    globalThis.localStorage?.setItem(FIREBASE_AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch (error) {
    console.warn('[Firebase Auth] Could not persist anonymous UID', error);
  }
};

const createAnonymousAuthViaRest = async (): Promise<StoredAnonymousAuth> => {
  const platformConfig = Capacitor.getPlatform() === 'ios'
    ? FIREBASE_PLATFORM_CONFIG.ios
    : FIREBASE_PLATFORM_CONFIG.android;
  const response = await withTimeout(
    fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${platformConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
    'Firebase anonymous auth REST'
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Firebase anonymous auth REST failed: ${message}`);
  }
  if (!payload?.localId || typeof payload.localId !== 'string') {
    throw new Error('Firebase anonymous auth REST returned no localId');
  }

  return {
    localId: payload.localId,
    idToken: typeof payload.idToken === 'string' ? payload.idToken : undefined,
    refreshToken: typeof payload.refreshToken === 'string' ? payload.refreshToken : undefined,
    createdAt: Date.now(),
    expiresAt: Date.now() + (Number(payload.expiresIn || 3600) * 1000),
  };
};

const refreshAnonymousAuthViaRest = async (storedAuth: StoredAnonymousAuth): Promise<StoredAnonymousAuth> => {
  if (!storedAuth.refreshToken) return storedAuth;
  const platformConfig = Capacitor.getPlatform() === 'ios'
    ? FIREBASE_PLATFORM_CONFIG.ios
    : FIREBASE_PLATFORM_CONFIG.android;
  const response = await withTimeout(
    fetch(`https://securetoken.googleapis.com/v1/token?key=${platformConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: storedAuth.refreshToken,
      }).toString(),
    }),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
    'Firebase anonymous auth refresh'
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Firebase anonymous auth refresh failed: ${message}`);
  }

  const refreshedAuth = {
    localId: typeof payload.user_id === 'string' ? payload.user_id : storedAuth.localId,
    idToken: typeof payload.id_token === 'string' ? payload.id_token : storedAuth.idToken,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : storedAuth.refreshToken,
    createdAt: storedAuth.createdAt,
    expiresAt: Date.now() + (Number(payload.expires_in || 3600) * 1000),
  };
  writeStoredAnonymousAuth(refreshedAuth);
  firebaseAuthUserId = refreshedAuth.localId;
  setFirebaseAuthStatus({ state: 'ready', userId: firebaseAuthUserId, error: undefined });
  return refreshedAuth;
};

const getFreshAnonymousAuth = async (): Promise<StoredAnonymousAuth | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  if (!firebaseAuthBootstrapped) {
    await bootstrapFirebaseAuth();
  }
  const storedAuth = readStoredAnonymousAuth();
  if (!storedAuth?.localId) return null;
  firebaseAuthUserId = storedAuth.localId;
  const shouldRefresh = !storedAuth.idToken
    || !storedAuth.expiresAt
    || storedAuth.expiresAt - Date.now() < FIREBASE_AUTH_REFRESH_SAFETY_MS;
  if (!shouldRefresh) return storedAuth;
  return refreshAnonymousAuthViaRest(storedAuth);
};

const getPlayerSnapshot = (player?: Player | null) => ({
  age: player?.age,
  week: player?.currentWeek,
  money_m: typeof player?.money === 'number' ? Math.round(player.money / 1000000) : undefined,
  fame: player?.stats?.fame,
  reputation: player?.stats?.reputation,
  health: player?.stats?.health,
  pending_events: player?.pendingEvents?.length || 0,
  commitments: player?.commitments?.length || 0,
  active_releases: player?.activeReleases?.length || 0,
  inbox_messages: player?.inbox?.length || 0,
});

const getProductionHouseSnapshot = (player?: Player | null) => {
  const businesses = Array.isArray((player as any)?.businesses) ? (player as any).businesses : [];
  const studio = businesses.find((business: any) => business?.type === 'PRODUCTION_HOUSE');
  const commitments = Array.isArray((player as any)?.commitments) ? (player as any).commitments : [];
  const scripts = Array.isArray(studio?.studioState?.scripts) ? studio.studioState.scripts : [];
  const concepts = Array.isArray(studio?.studioState?.concepts) ? studio.studioState.concepts : [];
  const pendingReturnDeals = scripts.reduce((count: number, script: any) => {
    const returningTalent = Array.isArray(script?.returningTalent) ? script.returningTalent : [];
    return count + returningTalent.filter((deal: any) => deal && deal.accepted !== true).length;
  }, 0);

  return {
    has_production_house: Boolean(studio),
    production_house_projects: studio
      ? commitments.filter((commitment: any) => commitment?.projectDetails?.studioId === studio.id).length
      : 0,
    studio_scripts: scripts.length,
    studio_concepts: concepts.length,
    pending_return_deals: pendingReturnDeals,
    studio_balance_m: typeof studio?.balance === 'number' ? Math.round(studio.balance / 1000000) : 0,
  };
};

const getRecentLogSnapshot = (player?: Player | null) => {
  const logs = Array.isArray(player?.logs) ? player!.logs : [];
  return logs
    .slice(0, 5)
    .map((log) => `Y${log.year}W${log.week}:${log.message}`)
    .join(' | ')
    .slice(0, 500);
};

const estimateSaveSize = (player?: Player | null) => {
  if (!player) return 0;
  try {
    return JSON.stringify(player).length;
  } catch {
    return 0;
  }
};

const getReportSaveSlot = (player?: Player | null) => {
  const directSlot = player?.flags?.lastLoadedSlot;
  if (directSlot !== undefined && directSlot !== null && directSlot !== '') return directSlot;
  if (traceContext.save_slot !== undefined && traceContext.save_slot !== null && traceContext.save_slot !== '') {
    return traceContext.save_slot;
  }
  const match = String(traceContext.save_key || '').match(/actorEmpireSave_(\d+)/);
  return match?.[1] ? Number(match[1]) : '';
};

const shouldSendCheckpointEvent = (checkpoint: string) => {
  const now = Date.now();
  const previous = checkpointLastSentAt.get(checkpoint) || 0;
  if (now - previous < CHECKPOINT_EVENT_THROTTLE_MS) return false;
  checkpointLastSentAt.set(checkpoint, now);
  return true;
};

const installPushMessagingListeners = () => {
  if (!isNativeTelemetry() || firebasePushListenersInstalled) return;
  firebasePushListenersInstalled = true;

  void runSafely('push-token-listener', async () => {
    await FirebaseMessaging.addListener('tokenReceived', (event) => {
      const tokenTail = getTokenTail(event.token);
      setFirebasePushStatus({ state: 'ready', tokenTail, error: undefined });
      setCrashKey('push_token_tail', tokenTail || '');
      addBreadcrumb('push_token_received', { token_tail: tokenTail || 'none' });
      trackGameEvent('push_token_received', { has_token: Boolean(tokenTail), token_tail: tokenTail || 'none' });
    });
  });

  void runSafely('push-received-listener', async () => {
    await FirebaseMessaging.addListener('notificationReceived', (event) => {
      addBreadcrumb('push_notification_received', {
        title: event.notification.title || '',
        has_data: Boolean(event.notification.data),
      });
      trackGameEvent('push_notification_received', {
        has_title: Boolean(event.notification.title),
        has_data: Boolean(event.notification.data),
      });
    });
  });

  void runSafely('push-action-listener', async () => {
    await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
      addBreadcrumb('push_notification_opened', {
        action_id: event.actionId || 'tap',
        title: event.notification.title || '',
      });
      trackGameEvent('push_notification_opened', {
        action_id: event.actionId || 'tap',
        has_data: Boolean(event.notification.data),
      });
    });
  });

  if (Capacitor.getPlatform() === 'ios') {
    void runSafely('push-apns-token-listener', async () => {
      await FirebaseMessaging.addListener('apnsTokenReceived', (event) => {
        const tokenTail = getTokenTail(event.token);
        setCrashKey('apns_token_tail', tokenTail || '');
        addBreadcrumb('push_apns_token_received', { token_tail: tokenTail || 'none' });
      });
    });
  }
};

export const bootstrapPushMessaging = async () => {
  if (!Capacitor.isNativePlatform()) {
    setFirebasePushStatus({ state: 'web_skipped', tokenTail: null, error: undefined });
    return getFirebasePushStatus();
  }
  if (firebasePushBootstrapped) return getFirebasePushStatus();
  firebasePushBootstrapped = true;
  installPushMessagingListeners();
  setFirebasePushStatus({ state: 'checking', error: undefined });

  try {
    const supported = await FirebaseMessaging.isSupported();
    if (!supported.isSupported) {
      setFirebasePushStatus({ state: 'failed', tokenTail: null, error: 'Firebase Messaging is not supported on this device.' });
      return getFirebasePushStatus();
    }
    const permission = await FirebaseMessaging.checkPermissions();
    const receive = getPushPermissionReceive(permission);
    setFirebasePushStatus({
      state: receive === 'granted' ? 'ready' : receive === 'denied' ? 'denied' : 'not_requested',
      receive,
      error: undefined,
    });
    setCrashKey('push_permission', receive || 'unknown');
  } catch (error) {
    const message = getErrorMessage(error);
    setFirebasePushStatus({ state: 'failed', tokenTail: null, error: message });
    recordNonFatal(error, 'push_bootstrap_failed', { platform: getTelemetryPlatform() });
  }

  return getFirebasePushStatus();
};

export const enableManualPushNotifications = async (source = 'settings_support') => {
  if (!Capacitor.isNativePlatform()) {
    setFirebasePushStatus({ state: 'web_skipped', tokenTail: null, error: undefined });
    return getFirebasePushStatus();
  }

  installPushMessagingListeners();
  markTraceAction('push_permission_requested', { flow: 'manual_push' });
  addBreadcrumb('push_permission_requested', { platform: getTelemetryPlatform() });
  trackGameEvent('push_permission_requested', { source });
  setFirebasePushStatus({ state: 'prompting', error: undefined });

  try {
    const supported = await FirebaseMessaging.isSupported();
    if (!supported.isSupported) {
      setFirebasePushStatus({ state: 'failed', tokenTail: null, error: 'Firebase Messaging is not supported on this device.' });
      return getFirebasePushStatus();
    }

    const permission = await FirebaseMessaging.requestPermissions();
    const receive = getPushPermissionReceive(permission);
    setCrashKey('push_permission', receive || 'unknown');

    if (receive !== 'granted') {
      setFirebasePushStatus({ state: 'denied', receive, tokenTail: null, error: undefined });
      addBreadcrumb('push_permission_denied', { receive: receive || 'unknown' });
      trackGameEvent('push_permission_denied', { receive: receive || 'unknown', source });
      return getFirebasePushStatus();
    }

    const result = await FirebaseMessaging.getToken();
    const tokenTail = getTokenTail(result.token);
    setFirebasePushStatus({ state: 'ready', receive, tokenTail, error: undefined });
    setCrashKey('push_enabled', true);
    setCrashKey('push_token_tail', tokenTail || '');
    addBreadcrumb('push_manual_enabled', { token_tail: tokenTail || 'none' });
    trackGameEvent('push_manual_enabled', {
      has_token: Boolean(tokenTail),
      token_tail: tokenTail || 'none',
      source,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    if (Capacitor.getPlatform() === 'ios' && message.includes('No APNS token specified')) {
      setFirebasePushStatus({ state: 'checking', error: 'Waiting for APNS token.' });
      addBreadcrumb('push_waiting_for_apns_token', { platform: getTelemetryPlatform() });
      trackGameEvent('push_waiting_for_apns_token', { source });
      return getFirebasePushStatus();
    }
    setFirebasePushStatus({ state: 'failed', error: message });
    recordNonFatal(error, 'push_manual_enable_failed', { platform: getTelemetryPlatform() });
    trackGameEvent('push_manual_enable_failed', { error: message, source });
  }

  return getFirebasePushStatus();
};

export const bootstrapFirebase = async () => {
  if (!Capacitor.isNativePlatform()) {
    setFirebaseAuthStatus({ state: 'web_skipped', userId: null });
    setFirebasePushStatus({ state: 'web_skipped', tokenTail: null });
    return;
  }
  if (firebaseBootstrapped) return;
  firebaseBootstrapped = true;

  await Promise.all([
    runSafely('analytics', () => FirebaseAnalytics.setEnabled({ enabled: true })),
    runSafely('crashlytics', async () => {
      await FirebaseCrashlytics.setEnabled({ enabled: true });
      await FirebaseCrashlytics.log({ message: 'Actor Empire Firebase bootstrapped' });
    }),
    runSafely('performance', () => FirebasePerformance.setEnabled({ enabled: true })),
    bootstrapFirebaseAuth(),
    bootstrapPushMessaging(),
  ]);
};

export const bootstrapFirebaseAuth = async () => {
  if (!Capacitor.isNativePlatform()) {
    setFirebaseAuthStatus({ state: 'web_skipped', userId: null });
    return;
  }
  if (firebaseAuthBootstrapped) return;
  firebaseAuthBootstrapped = true;

  console.info('[Firebase Auth] Anonymous auth bootstrap starting', {
    platform: getTelemetryPlatform(),
    appVersion: APP_DISPLAY_VERSION,
  });
  setFirebaseAuthStatus({ state: 'starting', userId: null, error: undefined });
  await runSafely('anonymous-auth-started-log', () => FirebaseCrashlytics.log({ message: 'Firebase anonymous auth starting' }));
  await runSafely('anonymous-auth-started-event', () =>
    FirebaseAnalytics.logEvent({
      name: 'auth_anonymous_started',
      params: sanitizeParams({
        app_version: APP_DISPLAY_VERSION,
        platform: getTelemetryPlatform(),
      }),
    })
  );

  try {
    const storedAuth = readStoredAnonymousAuth();
    console.info('[Firebase Auth] Anonymous auth storage checked', {
      hasStoredUser: Boolean(storedAuth?.localId),
      projectId: FIREBASE_WEB_CONFIG.projectId,
      authDomain: FIREBASE_WEB_CONFIG.authDomain,
      appId: Capacitor.getPlatform() === 'ios' ? FIREBASE_PLATFORM_CONFIG.ios.appId : FIREBASE_PLATFORM_CONFIG.android.appId,
    });
    const anonymousAuth = storedAuth || await createAnonymousAuthViaRest();
    writeStoredAnonymousAuth(anonymousAuth);
    firebaseAuthUserId = anonymousAuth.localId;
    console.info('[Firebase Auth] Anonymous auth ready', {
      uidTail: firebaseAuthUserId.slice(-8),
      source: storedAuth ? 'local_storage' : 'rest',
    });
    setFirebaseAuthStatus({ state: 'ready', userId: firebaseAuthUserId, error: undefined });
    await attachFirebaseAuthUserId();
    await runSafely('anonymous-auth-ready-log', () => FirebaseCrashlytics.log({ message: 'Firebase anonymous auth ready' }));
    await runSafely('anonymous-auth-success-event', () =>
      FirebaseAnalytics.logEvent({
        name: 'auth_anonymous_success',
        params: sanitizeParams({
          app_version: APP_DISPLAY_VERSION,
          platform: getTelemetryPlatform(),
          has_uid: Boolean(firebaseAuthUserId),
        }),
      })
    );
    await runSafely('anonymous-auth-ready-event', () =>
      FirebaseAnalytics.logEvent({
        name: 'anonymous_auth_ready',
        params: sanitizeParams({
          app_version: APP_DISPLAY_VERSION,
          platform: getTelemetryPlatform(),
        }),
      })
    );

  } catch (error) {
    const message = getErrorMessage(error);
    console.warn('[Firebase Auth] Anonymous auth failed', {
      message,
      platform: getTelemetryPlatform(),
    });
    setFirebaseAuthStatus({ state: 'failed', userId: null, error: message });
    await runSafely('anonymous-auth-failed-log', () => FirebaseCrashlytics.log({ message: `Firebase anonymous auth failed: ${message}` }));
    await runSafely('anonymous-auth-failed-key', () =>
      FirebaseCrashlytics.setCustomKey({
        key: 'firebase_auth_error',
        value: message,
        type: 'string',
      })
    );
    await runSafely('anonymous-auth-failed-event', () =>
      FirebaseAnalytics.logEvent({
        name: 'auth_anonymous_failed',
        params: sanitizeParams({
          app_version: APP_DISPLAY_VERSION,
          platform: getTelemetryPlatform(),
          error: message,
        }),
      })
    );
  }
};

export const trackGameEvent = (name: string, params: Record<string, unknown> = {}) => {
  if (!isNativeTelemetry()) return;
  void runSafely(`analytics:${name}`, () =>
    FirebaseAnalytics.logEvent({
      name: sanitizeEventName(name),
      params: sanitizeParams({
        app_version: APP_DISPLAY_VERSION,
        platform: getTelemetryPlatform(),
        ...getCompactTraceParams(),
        ...params,
      }),
    })
  );
};

export const setCurrentGameScreen = (screenName: string) => {
  const safeScreen = screenName.slice(0, 90);
  markTraceAction('screen_opened', { last_screen: safeScreen });
  if (!isNativeTelemetry()) return;
  void runSafely(`screen:${safeScreen}`, () =>
    FirebaseAnalytics.setCurrentScreen({
      screenName: safeScreen,
      screenClassOverride: safeScreen,
    })
  );
};

export const addBreadcrumb = (message: string, params: Record<string, unknown> = {}) => {
  if (!isNativeTelemetry()) return;
  const suffix = Object.keys(params).length ? ` ${JSON.stringify(sanitizeParams(params))}` : '';
  void runSafely(`breadcrumb:${message}`, () =>
    FirebaseCrashlytics.log({ message: `${message}${suffix}`.slice(0, 1000) })
  );
};

export const setCrashKey = (key: string, value: unknown) => {
  if (!isNativeTelemetry()) return;
  const safeValue = sanitizeValue(value);
  void runSafely(`crash-key:${key}`, () =>
    FirebaseCrashlytics.setCustomKey({
      key: sanitizeName(key, 'key'),
      value: safeValue,
      type: getCrashKeyType(safeValue),
    })
  );
};

export const markTraceAction = (action: string, context: Record<string, unknown> = {}) => {
  const updates: TraceContext = {
    last_action: sanitizeName(action, 'action'),
    updated_at: new Date().toISOString(),
  };

  Object.entries(context).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    const safeKey = sanitizeName(key, 'field') as keyof TraceContext;
    if (safeKey in updates || [
      'last_screen',
      'last_event_id',
      'last_checkpoint',
      'last_report_id',
      'greenlight_step',
      'active_project_phase',
      'save_slot',
      'save_size',
      'save_key',
      'flow',
    ].includes(safeKey)) {
      (updates as Record<string, unknown>)[safeKey] = sanitizeValue(value);
    }
  });

  traceContext = {
    ...traceContext,
    ...updates,
  };

  if (!isNativeTelemetry()) return;
  Object.entries(getCompactTraceParams()).forEach(([key, value]) => setCrashKey(key, value));
};

export const setCrashContext = (player?: Player | null, context: Record<string, unknown> = {}) => {
  if (!isNativeTelemetry()) return;
  const values: Record<string, unknown> = {
    app_version: APP_DISPLAY_VERSION,
    platform: Capacitor.getPlatform(),
    player_age: player?.age,
    player_week: player?.currentWeek,
    player_money: player?.money,
    player_fame: player?.stats?.fame,
    player_health: player?.stats?.health,
    pending_events: player?.pendingEvents?.length || 0,
    commitments: player?.commitments?.length || 0,
    ...getCompactTraceParams(),
    ...context,
  };

  Object.entries(values).forEach(([key, value]) => setCrashKey(key, value));
  const userId = firebaseAuthUserId || player?.id;
  if (userId) {
    void runSafely('analytics-user-id', () => FirebaseAnalytics.setUserId({ userId: String(userId) }));
    void runSafely('crashlytics-user-id', () => FirebaseCrashlytics.setUserId({ userId: String(userId) }));
  }
};

export const recordNonFatal = (
  error: unknown,
  label: string,
  context: Record<string, unknown> = {}
) => {
  if (!isNativeTelemetry()) return;
  const message = getErrorMessage(error);
  const safeContext = sanitizeParams({ ...getCompactTraceParams(), ...context });
  const keysAndValues = Object.entries(safeContext).map(([key, value]) => ({
    key,
    value,
    type: getCrashKeyType(value),
  }));
  addBreadcrumb(`nonfatal:${label}`, { message, ...safeContext });
  Object.entries(safeContext).forEach(([key, value]) => setCrashKey(key, value));
  void runSafely(`nonfatal:${label}`, () =>
    FirebaseCrashlytics.recordException({
      message: `${label}: ${message}`.slice(0, 900),
      domain: 'ActorEmpire',
      keysAndValues,
    })
  );
};

export const markGameCheckpoint = (
  checkpoint: string,
  player?: Player | null,
  context: Record<string, unknown> = {}
) => {
  if (!isNativeTelemetry()) return;
  const safeCheckpoint = sanitizeName(checkpoint, 'checkpoint');
  const snapshot = sanitizeParams({
    checkpoint: safeCheckpoint,
    ...getPlayerSnapshot(player),
    ...context,
  });

  markTraceAction(`checkpoint_${safeCheckpoint}`, {
    last_checkpoint: safeCheckpoint,
    last_event_id: snapshot.event_id || snapshot.issue_id || snapshot.source || safeCheckpoint,
    last_screen: snapshot.screen,
    save_slot: snapshot.save_slot,
    greenlight_step: snapshot.step,
    active_project_phase: snapshot.project_phase || snapshot.active_project_phase,
  });
  addBreadcrumb(`checkpoint:${safeCheckpoint}`, snapshot);
  setCrashKey('last_checkpoint', safeCheckpoint);
  Object.entries(snapshot).forEach(([key, value]) => setCrashKey(`last_${key}`, value));

  if (shouldSendCheckpointEvent(safeCheckpoint)) {
    trackGameEvent('game_checkpoint', snapshot);
  }
};

export const recordFlowFailure = (
  error: unknown,
  flow: string,
  player?: Player | null,
  context: Record<string, unknown> = {}
) => {
  if (!isNativeTelemetry()) return;
  const safeFlow = sanitizeName(flow, 'flow');
  markGameCheckpoint(`${safeFlow}_failed`, player, context);
  recordNonFatal(error, `${safeFlow}_failed`, {
    flow: safeFlow,
    ...getPlayerSnapshot(player),
    ...context,
  });
  trackGameEvent('game_flow_failed', {
    flow: safeFlow,
    ...getPlayerSnapshot(player),
    ...context,
  });
};

const createIssueId = () => {
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  return `ae_${Date.now().toString(36)}_${randomSuffix}`;
};

const persistLocalIssueReport = (report: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  try {
    const key = 'actorEmpireIssueReports';
    const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
    const reports = Array.isArray(existing) ? existing : [];
    window.localStorage.setItem(key, JSON.stringify([report, ...reports].slice(0, 10)));
  } catch (error) {
    console.warn('[Firebase] local issue report cache skipped', error);
  }
};

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

const toFirestoreValue = (value: unknown): FirestoreValue => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { integerValue: '0' };
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.slice(0, 20).map(toFirestoreValue),
      },
    };
  }
  if (typeof value === 'object') {
    const fields = Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => Boolean(key))
        .slice(0, 80)
        .map(([key, nestedValue]) => [sanitizeName(key, 'field'), toFirestoreValue(nestedValue)])
    );
    return { mapValue: { fields } };
  }
  return { stringValue: String(value).slice(0, 1500) };
};

const toFirestoreFields = (report: Record<string, unknown>) => Object.fromEntries(
  Object.entries(report)
    .filter(([key]) => Boolean(key))
    .map(([key, value]) => [sanitizeName(key, 'field'), toFirestoreValue(value)])
);

const submitIssueReportToFirestore = async (report: Record<string, unknown>) => {
  if (!Capacitor.isNativePlatform()) return;
  const auth = await getFreshAnonymousAuth();
  if (!auth?.idToken) {
    throw new Error('Firestore issue report skipped: anonymous auth token unavailable');
  }

  const issueId = String(report.issue_id || '').trim();
  if (!issueId) throw new Error('Firestore issue report skipped: issue ID unavailable');

  const endpoint = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB_CONFIG.projectId}/databases/(default)/documents/${FIRESTORE_ISSUE_REPORT_COLLECTION}?documentId=${encodeURIComponent(issueId)}`;
  const response = await withTimeout(
    fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: toFirestoreFields(report) }),
    }),
    AUTH_BOOTSTRAP_TIMEOUT_MS,
    'Firestore issue report write'
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Firestore issue report write failed: ${message}`);
  }
};

export type PlayerIssueReportPayload = {
  category: string;
  details?: string;
  currentPage?: string;
  currentScreen?: string;
  extra?: Record<string, unknown>;
};

export const submitPlayerIssueReport = (
  player: Player,
  payload: PlayerIssueReportPayload
) => {
  const issueId = createIssueId();
  const category = sanitizeName(payload.category || 'OTHER', 'issue');
  const details = String(payload.details || '').trim().slice(0, 500);
  markTraceAction('player_issue_report_submit', {
    last_report_id: issueId,
    last_screen: payload.currentScreen || payload.currentPage || 'unknown',
    save_slot: getReportSaveSlot(player),
    save_size: estimateSaveSize(player),
  });
  const runtimeContext = {
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : 'unknown',
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
    is_native: Capacitor.isNativePlatform(),
  };
  const context = {
    issue_id: issueId,
    category,
    screen: payload.currentScreen || payload.currentPage || 'unknown',
    platform: getTelemetryPlatform(),
    app_version: APP_DISPLAY_VERSION,
    detail_preview: details || 'no_details',
    detail_length: details.length,
    save_slot: getReportSaveSlot(player),
    save_size: estimateSaveSize(player),
    ...getPlayerSnapshot(player),
    ...getProductionHouseSnapshot(player),
    recent_logs: getRecentLogSnapshot(player),
    ...getFirestoreTraceFields(),
    ...runtimeContext,
    ...(payload.extra || {}),
  };
  const firestoreReport = {
    ...context,
    details,
    status: 'new',
    source: 'in_app_support',
    firebase_uid: firebaseAuthUserId || '',
    created_at: new Date().toISOString(),
  };

  persistLocalIssueReport(firestoreReport);

  setCrashContext(player, {
    last_manual_issue_id: issueId,
    last_manual_issue_category: category,
    last_manual_issue_screen: context.screen,
    last_manual_issue_platform: context.platform,
  });
  addBreadcrumb('player_issue_reported', context);
  trackGameEvent('player_issue_reported', context);
  recordNonFatal(
    new Error(`${category}: ${details || 'Player submitted a report without details.'}`),
    'player_issue_reported',
    context
  );
  void submitIssueReportToFirestore(firestoreReport)
    .then(() => {
      addBreadcrumb('issue_report_firestore_saved', { issue_id: issueId, category });
      trackGameEvent('issue_report_firestore_saved', { issue_id: issueId, category });
      setCrashKey('last_issue_report_firestore_status', 'saved');
    })
    .catch((error) => {
      const message = getErrorMessage(error);
      console.warn('[Firebase] Firestore issue report skipped', message);
      addBreadcrumb('issue_report_firestore_failed', { issue_id: issueId, error: message });
      trackGameEvent('issue_report_firestore_failed', {
        issue_id: issueId,
        category,
        error: message,
      });
      setCrashKey('last_issue_report_firestore_status', 'failed');
      setCrashKey('last_issue_report_firestore_error', message);
    });

  return issueId;
};

export const installGlobalTelemetryHandlers = () => {
  if (typeof window === 'undefined' || !isNativeTelemetry()) return;
  const globalWindow = window as typeof window & { __actorEmpireTelemetryInstalled?: boolean };
  if (globalWindow.__actorEmpireTelemetryInstalled) return;
  globalWindow.__actorEmpireTelemetryInstalled = true;

  window.addEventListener('error', (event) => {
    recordNonFatal(event.error || event.message, 'global_js_error', {
      source: event.filename || 'unknown',
      line: event.lineno || 0,
      column: event.colno || 0,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    recordNonFatal(event.reason || 'Unhandled promise rejection', 'global_unhandled_rejection', {
      promise: 'unhandled',
    });
  });
};

export const startPerformanceTrace = (traceName: string, attributes: Record<string, unknown> = {}) => {
  if (!isNativeTelemetry()) return;
  const safeTraceName = sanitizeName(traceName, 'game_trace');
  if (activeTraceStarts.has(safeTraceName) || stoppingTraceNames.has(safeTraceName)) {
    console.warn(`[Firebase] trace-start:${safeTraceName} skipped`, { errorMessage: 'trace already active' });
    return;
  }

  const startPromise = (async () => {
    try {
      await FirebasePerformance.startTrace({ traceName: safeTraceName });
      await Promise.all(
        Object.entries(sanitizeParams(attributes)).slice(0, 5).map(([attribute, value]) =>
          FirebasePerformance.putAttribute({
            traceName: safeTraceName,
            attribute: sanitizeName(attribute, 'attribute'),
            value: String(value).slice(0, 40),
          })
        )
      );
      return true;
    } catch (error) {
      console.warn(`[Firebase] trace-start:${safeTraceName} skipped`, error);
      activeTraceStarts.delete(safeTraceName);
      stoppingTraceNames.delete(safeTraceName);
      return false;
    }
  })();

  activeTraceStarts.set(safeTraceName, startPromise);
};

export const stopPerformanceTrace = (
  traceName: string,
  metrics: Record<string, number> = {}
) => {
  if (!isNativeTelemetry()) return;
  const safeTraceName = sanitizeName(traceName, 'game_trace');
  const startPromise = activeTraceStarts.get(safeTraceName);
  if (stoppingTraceNames.has(safeTraceName)) {
    console.warn(`[Firebase] trace-stop:${safeTraceName} skipped`, { errorMessage: 'trace stop already pending' });
    return;
  }
  if (!startPromise) {
    console.warn(`[Firebase] trace-stop:${safeTraceName} skipped`, { errorMessage: 'trace was not active' });
    return;
  }

  stoppingTraceNames.add(safeTraceName);
  void runSafely(`trace-stop:${safeTraceName}`, async () => {
    const didStart = await startPromise;
    try {
      if (!didStart) return;
      await Promise.all(
        Object.entries(metrics)
          .filter(([, value]) => Number.isFinite(value))
          .slice(0, 10)
          .map(([metricName, num]) =>
            FirebasePerformance.putMetric({
              traceName: safeTraceName,
              metricName: sanitizeName(metricName, 'metric'),
              num,
            })
          )
      );
      await FirebasePerformance.stopTrace({ traceName: safeTraceName });
    } finally {
      activeTraceStarts.delete(safeTraceName);
      stoppingTraceNames.delete(safeTraceName);
    }
  });
};
