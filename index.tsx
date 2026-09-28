import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './ui-layout/railInteractions.css';
import { GameStartupBootstrap } from './components/GameStartupBootstrap';
import { recordStartupCheckpoint } from './services/startupDiagnostics';
import { installHorizontalRailDrag } from './ui-layout/railInteractions';

recordStartupCheckpoint('bundle_started');
installHorizontalRailDrag(document);

const SAFE_BOOT_SESSION_KEY = 'actorEmpire.safeBootOnce';

type RootRecoveryState = { hasError: boolean };

class RootRecoveryBoundary extends React.Component<{ children: React.ReactNode }, RootRecoveryState> {
  declare props: { children: React.ReactNode };
  declare setState: (state: Partial<RootRecoveryState>) => void;
  state: RootRecoveryState = { hasError: false };
  private failureCount = 0;

  static getDerivedStateFromError(): RootRecoveryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.failureCount += 1;
    recordStartupCheckpoint('startup_failed', {
      failedTask: 'APP_CORE',
      failureCode: 'root_render_failed',
    });
    recordStartupCheckpoint('recovery_opened', {
      failedTask: 'APP_CORE',
      failureCode: 'root_render_failed',
    });
    if (this.failureCount >= 2) {
      try {
        sessionStorage.setItem(SAFE_BOOT_SESSION_KEY, '1');
      } catch {
        // The recovery screen remains available even if session storage is unavailable.
      }
    }

    void import('./services/firebaseService').then(({ recordNonFatal }) => {
      recordNonFatal(error, 'root_startup_render_failed', {
        failure_count: this.failureCount,
        safe_mode_armed: this.failureCount >= 2,
      });
    }).catch(() => {
      console.error('Startup recovery telemetry was unavailable.', error);
    });
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  private restart = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black px-6 py-10 text-white">
        <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-6 text-center shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Startup Recovery</p>
          <h1 className="mt-3 text-2xl font-black">Your career is safe.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-zinc-400">
            Actor Empire could not finish drawing this screen. Retry now. If it continues, restart the game. Your careers were not changed.
          </p>
          <div className="mt-6 grid gap-3">
            <button type="button" onClick={this.retry} className="min-h-12 rounded-2xl bg-emerald-400 px-4 font-black text-black">
              Retry
            </button>
            <button type="button" onClick={this.restart} className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 font-black text-white">
              Restart Game
            </button>
          </div>
        </section>
      </main>
    );
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootRecoveryBoundary>
      <GameStartupBootstrap />
    </RootRecoveryBoundary>
  </React.StrictMode>
);
window.requestAnimationFrame(() => {
  window.requestAnimationFrame(() => {
    document.documentElement.dataset.actorEmpireMounted = 'true';
    recordStartupCheckpoint('react_started');
    window.clearTimeout((window as typeof window & { __actorEmpireBootWatchdog?: number }).__actorEmpireBootWatchdog);
  });
});

// Telemetry is optional startup work. Begin it only after React has replaced
// the static shell so network or SDK failures cannot cause a blank first frame.
const bootstrapOptionalTelemetry = () => {
  void import('./services/firebaseService').then(({ bootstrapFirebase, installGlobalTelemetryHandlers }) => {
    installGlobalTelemetryHandlers();
    return bootstrapFirebase();
  }).catch(error => {
    console.error('Firebase bootstrap failed; continuing with the local game shell.', error);
  });
};

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(bootstrapOptionalTelemetry, { timeout: 2_000 });
} else {
  globalThis.setTimeout(bootstrapOptionalTelemetry, 0);
}
