/* Perf plan (2026-11-08): a sound the game is playing stops while the app is hidden (home button,
   lock, a call) and goes on from the same moment when the player comes back. A context the game
   had paused itself stays paused. */

const contexts = new Set<AudioContext>();
const resumeWhenShown = new WeakSet<AudioContext>();
let listening = false;

const onVisibilityChange = () => {
  const hidden = document.visibilityState === 'hidden';
  contexts.forEach(context => {
    if (context.state === 'closed') {
      contexts.delete(context);
      return;
    }
    try {
      if (hidden) {
        if (context.state === 'running') {
          resumeWhenShown.add(context);
          void context.suspend().catch(() => undefined);
        }
      } else if (resumeWhenShown.has(context)) {
        resumeWhenShown.delete(context);
        void context.resume().catch(() => undefined);
      }
    } catch {
      /* a context the browser has already torn down: nothing to pause */
    }
  });
};

export const pauseAudioWhileHidden = <T extends AudioContext>(context: T): T => {
  if (typeof document === 'undefined') return context;
  contexts.add(context);
  context.addEventListener?.('statechange', () => {
    if (context.state !== 'closed') return;
    contexts.delete(context);
    resumeWhenShown.delete(context);
  });
  if (!listening) {
    listening = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  return context;
};
