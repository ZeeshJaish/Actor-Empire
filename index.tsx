import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { bootstrapFirebase, installGlobalTelemetryHandlers, recordNonFatal } from './services/firebaseService';

const SAFE_BOOT_SESSION_KEY = 'actorEmpire.safeBootOnce';

type RootRecoveryState = { hasError: boolean };

class RootRecoveryBoundary extends React.Component<{ children: React.ReactNode }, RootRecoveryState> {
  declare props: { children: React.ReactNode };
  state: RootRecoveryState = { hasError: false };

  static getDerivedStateFromError(): RootRecoveryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    recordNonFatal(error, 'root_startup_render_failed');
  }

  private retry = () => {
    window.location.reload();
  };

  private openSafeMenu = () => {
    try {
      sessionStorage.setItem(SAFE_BOOT_SESSION_KEY, '1');
    } catch {
      // Reload still gives the player another clean boot attempt.
    }
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
            Actor Empire could not finish drawing this screen. Retry normally or open the lightweight menu without starting ads and tracking services.
          </p>
          <div className="mt-6 grid gap-3">
            <button type="button" onClick={this.openSafeMenu} className="min-h-12 rounded-2xl bg-emerald-400 px-4 font-black text-black">
              Open Safe Menu
            </button>
            <button type="button" onClick={this.retry} className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 font-black text-white">
              Retry Game
            </button>
          </div>
        </section>
      </main>
    );
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

try {
  void bootstrapFirebase().catch(error => {
    console.error('Firebase bootstrap failed; continuing with the local game shell.', error);
  });
  installGlobalTelemetryHandlers();
} catch (error) {
  // Telemetry must never prevent the local game and recovery UI from rendering.
  console.error('Startup telemetry could not initialize.', error);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootRecoveryBoundary>
      <App />
    </RootRecoveryBoundary>
  </React.StrictMode>
);
