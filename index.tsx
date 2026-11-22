import './services/runtimeCompatibility';
import React from 'react';
import './index.css';
import './ui-layout/railInteractions.css';
import { installHorizontalRailDrag } from './ui-layout/railInteractions';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { bootstrapFirebase, installGlobalTelemetryHandlers, noteReactComponentStack, recordNonFatal, trackGameEvent } from './services/firebaseService';
import { drawIdleFaces, endLazyFaceLoading, loadKeptFaces } from './services/npcAvatar';
import { markSelfReload } from './services/sessionBreadcrumb';

// 21 Nov 2026 (boot freeze): the game code has loaded; people made from now on draw their face at once, as before
endLazyFaceLoading();

installHorizontalRailDrag(document);

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
    markSelfReload();
    window.location.reload();
  };

  private openSafeMenu = () => {
    try {
      sessionStorage.setItem(SAFE_BOOT_SESSION_KEY, '1');
    } catch {
      // Reload still gives the player another clean boot attempt.
    }
    markSelfReload();
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

/** Tells the start-up guard in index.html that the game drew its first screen. */
const BootMountedMarker = () => {
  React.useEffect(() => {
    document.documentElement.dataset.actorEmpireMounted = 'true';
  }, []);
  return null;
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

try {
  void bootstrapFirebase().catch(error => {
    console.error('Firebase bootstrap failed; continuing with the local game shell.', error);
  });
  installGlobalTelemetryHandlers();
  // The start-up guard in index.html leaves a note when it had to show its message; report it once, now that
  // telemetry runs, so we can see how often phones get stuck before the first screen.
  try {
    const bootNote = localStorage.getItem('actorEmpire.bootFallback.v1');
    if (bootNote) {
      localStorage.removeItem('actorEmpire.bootFallback.v1');
      const parsed = JSON.parse(bootNote) as { kind?: unknown; at?: unknown };
      trackGameEvent('startup_fallback_shown', {
        kind: String(parsed?.kind || 'unknown').slice(0, 20),
        minutes_ago: typeof parsed?.at === 'number' ? Math.max(0, Math.round((Date.now() - parsed.at) / 60_000)) : -1,
      });
    }
  } catch {
    // diagnostics only
  }
} catch (error) {
  // Telemetry must never prevent the local game and recovery UI from rendering.
  console.error('Startup telemetry could not initialize.', error);
}

/* 21 Nov 2026: an error React cannot hand to a boundary keeps React's component stack, so its global_js_error report names
   the component once the build's source map is applied (1.0.30's React #185 left only React's own throw site). The
   error then goes out exactly as React's own handler sends it: a window error event (the boot guard and the
   global_js_error report listen to it). */
const reportLikeReact = (error: unknown) => {
  if (typeof window.reportError === 'function') { window.reportError(error); return; }
  if (typeof window.ErrorEvent === 'function') {
    const message = error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : String(error);
    if (!window.dispatchEvent(new window.ErrorEvent('error', { bubbles: true, cancelable: true, message, error }))) return;
  }
  console.error(error);
};
const root = ReactDOM.createRoot(rootElement, {
  onUncaughtError: (error: unknown, errorInfo: { componentStack?: string }) => {
    noteReactComponentStack(error, errorInfo?.componentStack);
    reportLikeReact(error);
  },
} as Parameters<typeof ReactDOM.createRoot>[1]);
root.render(
  <React.StrictMode>
    <RootRecoveryBoundary>
      <BootMountedMarker />
      <App />
    </RootRecoveryBoundary>
  </React.StrictMode>
);

/* 21 Nov 2026 (boot freeze): the built-in people's faces are read from the phone right away, and any still missing are
   drawn while the phone is idle after start-up, famous people first (services/npcAvatar.ts). A face a screen or a week
   reads before then is drawn on the spot. */
void loadKeptFaces();
window.setTimeout(() => { drawIdleFaces(); }, 1200);
