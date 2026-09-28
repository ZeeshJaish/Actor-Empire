export type PushPermission = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';
export type PushRegistrationStatus = {
  state: 'web_skipped' | 'not_requested' | 'checking' | 'prompting' | 'ready' | 'denied' | 'failed';
  receive?: PushPermission;
  tokenTail: string | null;
  isNative: boolean;
  error?: string;
};

type PushPort = {
  platform: 'ios' | 'android';
  isSupported: () => Promise<boolean>;
  checkPermissions: () => Promise<PushPermission>;
  requestPermissions: () => Promise<PushPermission>;
  getToken: () => Promise<string | null | undefined>;
  onStatus?: (status: PushRegistrationStatus) => void;
  onFailure?: (error: unknown, step: 'permission' | 'token') => void;
};

const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error || 'Unknown error');

export class PushRegistration {
  private status: PushRegistrationStatus = { state: 'not_requested', tokenTail: null, isNative: true };
  private apnsReady: boolean;
  private operation: Promise<PushRegistrationStatus> | null = null;
  private operationKind: 'bootstrap' | 'enable' | null = null;
  private tokenOperation: Promise<PushRegistrationStatus> | null = null;
  private apnsWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private tokenRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private tokenRetryAttempt = 0;

  constructor(private readonly port: PushPort) {
    this.apnsReady = port.platform !== 'ios';
  }

  getStatus = () => ({ ...this.status });

  private update(next: Partial<PushRegistrationStatus>) {
    this.status = { ...this.status, ...next };
    this.port.onStatus?.(this.getStatus());
    return this.getStatus();
  }

  private waitForApns() {
    if (!this.apnsWaitTimer) {
      this.apnsWaitTimer = setTimeout(() => {
        this.apnsWaitTimer = null;
        if (this.status.receive !== 'granted' || this.apnsReady) return;
        const error = new Error('Apple push registration did not complete. Try again.');
        this.port.onFailure?.(error, 'token');
        this.update({ state: 'failed', tokenTail: null, error: error.message });
      }, 20000);
    }
    return this.update({ state: 'checking', tokenTail: null, error: undefined });
  }

  private clearApnsWait() {
    if (this.apnsWaitTimer) clearTimeout(this.apnsWaitTimer);
    this.apnsWaitTimer = null;
  }

  private clearTokenRetry() {
    if (this.tokenRetryTimer) clearTimeout(this.tokenRetryTimer);
    this.tokenRetryTimer = null;
  }

  private run(kind: 'bootstrap' | 'enable', action: () => Promise<PushRegistrationStatus>) {
    if (this.operation) {
      return this.operationKind === kind ? this.operation : this.operation.then(() => this.run(kind, action));
    }
    this.operationKind = kind;
    const work = action().finally(() => {
      if (this.operation === work) {
        this.operation = null;
        this.operationKind = null;
      }
    });
    this.operation = work;
    return work;
  }

  private async fetchToken(): Promise<PushRegistrationStatus> {
    if (this.status.receive !== 'granted') return this.getStatus();
    if (!this.apnsReady) return this.waitForApns();
    if (this.tokenOperation) return this.tokenOperation;
    this.clearTokenRetry();
    this.update({ state: 'checking', error: undefined });
    const work = (async () => {
      try {
        const token = await this.port.getToken();
        if (!token?.trim()) throw new Error('Firebase returned an empty registration token.');
        if (this.status.receive !== 'granted') return this.getStatus();
        this.tokenRetryAttempt = 0;
        return this.update({ state: 'ready', tokenTail: token.slice(-10), error: undefined });
      } catch (error) {
        if (this.status.state === 'ready') return this.getStatus();
        const message = messageOf(error);
        if (this.port.platform === 'ios' && message.includes('No APNS token specified')) {
          this.apnsReady = false;
          return this.waitForApns();
        }
        const retryDelays = [1000, 4000, 16000];
        if (this.status.receive === 'granted' && this.tokenRetryAttempt < retryDelays.length) {
          const delay = retryDelays[this.tokenRetryAttempt++];
          this.tokenRetryTimer = setTimeout(() => {
            this.tokenRetryTimer = null;
            void this.fetchToken();
          }, delay);
          return this.update({ state: 'checking', tokenTail: null, error: undefined });
        }
        this.port.onFailure?.(error, 'token');
        return this.update({ state: 'failed', tokenTail: null, error: message });
      }
    })().finally(() => {
      if (this.tokenOperation === work) this.tokenOperation = null;
    });
    this.tokenOperation = work;
    return work;
  }

  bootstrap = () => this.run('bootstrap', async () => {
    const alreadyReady = this.status.state === 'ready' && Boolean(this.status.tokenTail);
    this.update({ state: 'checking', error: undefined });
    try {
      if (!await this.port.isSupported()) {
        return this.update({ state: 'failed', tokenTail: null, error: 'Firebase Messaging is not supported on this device.' });
      }
      const receive = await this.port.checkPermissions();
      if (receive === 'granted') {
        if (alreadyReady) return this.update({ receive, state: 'ready', error: undefined });
        this.update({ receive, state: 'checking', error: undefined });
        return this.fetchToken();
      }
      this.clearApnsWait();
      this.clearTokenRetry();
      this.tokenRetryAttempt = 0;
      return this.update({
        receive,
        state: receive === 'denied' ? 'denied' : 'not_requested',
        tokenTail: null,
        error: undefined,
      });
    } catch (error) {
      this.port.onFailure?.(error, 'permission');
      return this.update({ state: 'failed', tokenTail: null, error: messageOf(error) });
    }
  });

  enable = () => this.run('enable', async () => {
    this.update({ state: 'prompting', error: undefined });
    try {
      if (!await this.port.isSupported()) {
        return this.update({ state: 'failed', tokenTail: null, error: 'Firebase Messaging is not supported on this device.' });
      }
      const current = await this.port.checkPermissions();
      const receive = current === 'granted' ? current : await this.port.requestPermissions();
      if (receive !== 'granted') {
        this.clearApnsWait();
        this.clearTokenRetry();
        this.tokenRetryAttempt = 0;
        return this.update({ state: 'denied', receive, tokenTail: null, error: undefined });
      }
      this.update({ state: 'checking', receive, error: undefined });
      return this.fetchToken();
    } catch (error) {
      this.port.onFailure?.(error, 'permission');
      return this.update({ state: 'failed', tokenTail: null, error: messageOf(error) });
    }
  });

  apnsTokenReceived = async () => {
    this.apnsReady = true;
    this.clearApnsWait();
    return this.status.receive === 'granted' ? this.fetchToken() : this.getStatus();
  };

  tokenReceived = (token: string) => {
    if (token?.trim() && this.status.receive === 'granted' && this.apnsReady) {
      this.clearTokenRetry();
      this.tokenRetryAttempt = 0;
      this.update({ state: 'ready', tokenTail: token.slice(-10), error: undefined });
    }
  };
}
