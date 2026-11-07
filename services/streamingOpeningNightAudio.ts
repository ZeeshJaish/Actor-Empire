/**
 * #257, #265: the opening night's sound. Zeesh (2026-11-05): "need better sound ig , its sound really ai". So it is no longer played on oscillators. Each scene's sound is rendered
 * ahead of time (scripts/audio/render-opening-night.mjs: a crowd of separate voices, thousands of separate claps, real rooms, a score in one key) and shipped as a small file; this
 * only starts them on their cues. They are fetched and decoded when Launch Control opens, off the main thread, so no tap pays for them.
 *
 * A browser opens sound only from a tap, so the tap that goes live resumes this context and everything after it plays on it: the ident at zero is ten seconds after the tap, and a
 * context of its own would stay silent on a phone. The context itself is made ahead of that tap: making one took 300 ms, the longest frame of the night.
 */
import type { OwnedStreamingCustomIdentAudio } from '../types';
import { IDENT_FILES, scheduleStreamingIdentNotes, type StreamingIdentPreviewId } from './streamingIdentAudio';

export type NightStem = 'count' | 'zero' | 'world' | 'city' | 'room' | 'rise' | 'held' | 'just' | 'buckled' | 'flood' | 'floodBad';

/* functions, so that nothing looks for a file until something is about to play: the audits bundle this for Node, where there is no such address */
const STEM_FILES: Record<NightStem, () => string> = {
  count: () => new URL('../assets/audio/opening-night/count.m4a', import.meta.url).href,
  zero: () => new URL('../assets/audio/opening-night/zero.m4a', import.meta.url).href,
  world: () => new URL('../assets/audio/opening-night/world.m4a', import.meta.url).href,
  city: () => new URL('../assets/audio/opening-night/city.m4a', import.meta.url).href,
  room: () => new URL('../assets/audio/opening-night/room.m4a', import.meta.url).href,
  rise: () => new URL('../assets/audio/opening-night/rise.m4a', import.meta.url).href,
  held: () => new URL('../assets/audio/opening-night/held.m4a', import.meta.url).href,
  just: () => new URL('../assets/audio/opening-night/just.m4a', import.meta.url).href,
  buckled: () => new URL('../assets/audio/opening-night/buckled.m4a', import.meta.url).href,
  flood: () => new URL('../assets/audio/opening-night/flood.m4a', import.meta.url).href,
  floodBad: () => new URL('../assets/audio/opening-night/floodBad.m4a', import.meta.url).href,
};

export interface OpeningNightAudio {
  /** call it from the tap */
  resume: () => void;
  /** every file decoded, or given up on */
  whenLoaded: () => Promise<void>;
  /** a scene's sound, from its first sample, now */
  play: (stem: NightStem) => void;
  /** everything playing fades away */
  hush: (seconds: number) => void;
  ident: (sound: StreamingIdentPreviewId, customAudio?: Pick<OwnedStreamingCustomIdentAudio, 'dataUrl'> | null) => void;
  setMuted: (muted: boolean) => void;
  close: () => void;
}

/** `ident`: the sound this service chose, so it is decoded with the rest */
export const openOpeningNightAudio = (ident?: StreamingIdentPreviewId | null): OpeningNightAudio | null => {
  if (typeof window === 'undefined') return null;
  const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  let context: AudioContext;
  try {
    context = new Context();
  } catch {
    return null;
  }
  const master = context.createGain();
  /* only a safety net: the files are mastered already */
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 2;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  master.connect(limiter);
  limiter.connect(context.destination);

  let closed = false;
  const stems = new Map<string, AudioBuffer>();
  const playing = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>();
  const load = async (id: string, url: string) => {
    try {
      const response = await fetch(url);
      const data = await response.arrayBuffer();
      if (closed) return;
      stems.set(id, await context.decodeAudioData(data));
    } catch {
      /* a scene without its sound: the night goes on */
    }
  };
  const identFile = ident && ident !== 'custom' && ident !== 'silent' ? IDENT_FILES[ident] : null;
  const loaded = Promise.all([
    ...(Object.entries(STEM_FILES) as Array<[NightStem, () => string]>).map(([id, url]) => load(id, url())),
    ...(identFile ? [load('ident', identFile())] : []),
  ]).then(() => undefined);

  const start = (buffer: AudioBuffer) => {
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    source.connect(gain);
    gain.connect(master);
    const entry = { source, gain };
    playing.add(entry);
    source.onended = () => {
      playing.delete(entry);
      gain.disconnect();
    };
    source.start();
  };
  const live = (run: () => void) => {
    if (closed) return;
    try {
      run();
    } catch {
      /* a context a browser has torn down must not take the night with it */
    }
  };

  return {
    resume: () => { if (context.state === 'suspended') void context.resume().catch(() => undefined); },
    whenLoaded: () => loaded,
    play: stem => live(() => {
      const buffer = stems.get(stem);
      if (buffer) start(buffer);
    }),
    hush: seconds => live(() => {
      const now = context.currentTime;
      playing.forEach(({ source, gain }) => {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + seconds);
        source.stop(now + seconds + 0.02);
      });
    }),
    ident: (sound, customAudio) => live(() => {
      if (sound === 'silent') return;
      /* the crowd drops back: for these few seconds the service's own sound is the one to hear */
      const now = context.currentTime;
      playing.forEach(({ gain }) => {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.32, now + 0.25);
      });
      if (sound === 'custom') {
        if (!customAudio?.dataUrl) return;
        const element = new Audio(customAudio.dataUrl);
        element.volume = 0.82;
        void element.play().catch(() => undefined);
        return;
      }
      const buffer = stems.get('ident');
      if (buffer) start(buffer);
      /* its file did not come: the notes are still known */
      else scheduleStreamingIdentNotes(context, master, sound, context.currentTime);
    }),
    setMuted: muted => live(() => {
      master.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.03);
    }),
    close: () => {
      if (closed) return;
      closed = true;
      playing.forEach(({ source }) => { try { source.stop(); } catch { /* it had already stopped */ } });
      playing.clear();
      void context.close().catch(() => undefined);
    },
  };
};
