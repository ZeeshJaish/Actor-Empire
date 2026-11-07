/**
 * The Upcoming Packs' sound, shared by their pages. The files are rendered ahead of time (scripts/audio/render-pack-sounds.mjs); this only starts them.
 *
 * Nothing here runs on a tap but starting a buffer: making a context took 300 ms in the opening night, the longest frame it had, so the context is made when the list settles, and the
 * files are fetched and decoded in the background after a page mounts. Any failure is silent: a page works with no sound at all. Nothing here touches the save.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const SOUND_KEY = 'ae-pack-sound';
const FADE_SECONDS = 0.08;
/* the theme: how it leaves, how it returns from the speaker button, and what the page's big moment does to it */
const MUSIC_EXIT_SECONDS = 0.4;
const MUSIC_RETURN_SECONDS = 1.2;
const DUCK_LEVEL = 0.05;
const DUCK_CUTOFF = 220;
const OPEN_CUTOFF = 20000;
const RESTORE_SECONDS = 2.5;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let mountedPages = 0;
let resumeWhenVisible = false;
let listening = false;
let soundOn = true;
let soundRead = false;

const playing = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>();
const decoded = new Map<string, Promise<AudioBuffer | null>>();
const fetched = new Map<string, Promise<ArrayBuffer | null>>();

const readSoundOn = () => {
  if (soundRead) return soundOn;
  soundRead = true;
  try {
    soundOn = window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    soundOn = true;
  }
  return soundOn;
};

const onVisibility = () => {
  if (!context) return;
  try {
    if (document.hidden) {
      resumeWhenVisible = context.state === 'running';
      if (resumeWhenVisible) void context.suspend().catch(() => undefined);
    } else {
      resumeWhenVisible = false;
      if (mountedPages > 0 && context.state !== 'running') void context.resume().catch(() => undefined);
    }
  } catch {
    /* a browser that has torn the context down: no sound, nothing else */
  }
};

const ensureContext = (): AudioContext | null => {
  if (context) return context;
  if (typeof window === 'undefined') return null;
  try {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return null;
    context = new Context();
    master = context.createGain();
    master.gain.value = readSoundOn() ? 1 : 0;
    /* only a safety net, for a Notify over the door: the files are mastered already */
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 2;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master.connect(limiter);
    limiter.connect(context.destination);
    if (!listening) {
      listening = true;
      document.addEventListener('visibilitychange', onVisibility);
    }
    return context;
  } catch {
    context = null;
    master = null;
    return null;
  }
};

const whenIdle = (run: () => void, timeout: number) => {
  const idle = (window as typeof window & { requestIdleCallback?: (fn: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void });
  if (idle.requestIdleCallback) {
    const id = idle.requestIdleCallback(run, { timeout });
    return () => idle.cancelIdleCallback?.(id);
  }
  const id = setTimeout(run, timeout);
  return () => clearTimeout(id);
};

/** Makes the context ahead of the tap that needs it. Call it when the list has mounted; it waits for an idle moment and returns the way to cancel. */
export const preparePackAudio = () => (typeof window === 'undefined' ? () => undefined : whenIdle(() => { ensureContext(); }, 1200));

const fetchBytes = (url: string): Promise<ArrayBuffer | null> => {
  let job = fetched.get(url);
  if (!job) {
    job = fetch(url)
      .then(response => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null)
      .then(data => {
        if (!data) fetched.delete(url);
        return data;
      });
    fetched.set(url, job);
  }
  return job;
};

/** Fetches a file's bytes ahead of the tap that wants them, so that decoding is the only wait after it. It never decodes: a decoded theme is many MB. Returns the way to cancel. */
export const prefetchPackBytes = (url: () => string) => (typeof window === 'undefined' ? () => undefined : whenIdle(() => {
  try { void fetchBytes(url()); } catch { /* the page will try, and stay silent */ }
}, 600));

let silentPlayed = false;
/** Call it inside a tap: browsers open sound only from one. It never makes the context, which is the slow part; a tap with no context yet is picked up by the page's first press. */
export const unlockPackAudio = () => {
  if (!context) return;
  try {
    if (context.state !== 'running') void context.resume().catch(() => undefined);
    if (!silentPlayed) {
      /* older iPhones also want something started from the tap */
      silentPlayed = true;
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(context.destination);
      source.start();
    }
  } catch {
    /* no sound */
  }
};

const decode = (url: string): Promise<AudioBuffer | null> => {
  let job = decoded.get(url);
  if (!job) {
    job = (async () => {
      try {
        const data = await fetchBytes(url);
        const owner = ensureContext();
        /* a copy: decoding takes the bytes it is given, and the page may be opened again */
        return owner && data ? await owner.decodeAudioData(data.slice(0)) : null;
      } catch {
        return null;
      }
    })();
    decoded.set(url, job);
  }
  return job;
};

const startBuffer = (buffer: AudioBuffer, rate = 1, delay = 0) => {
  if (!context || !master) return;
  const source = context.createBufferSource();
  source.buffer = buffer;
  if (rate !== 1) source.playbackRate.value = rate;
  const gain = context.createGain();
  source.connect(gain);
  gain.connect(master);
  const entry = { source, gain };
  playing.add(entry);
  source.onended = () => {
    playing.delete(entry);
    try { gain.disconnect(); } catch { /* it had gone */ }
  };
  source.start(delay > 0 ? context.currentTime + delay : 0);
};

const fadeAll = () => {
  if (!context) return;
  const now = context.currentTime;
  playing.forEach(({ source, gain }) => {
    try {
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      source.stop(now + FADE_SECONDS + 0.02);
    } catch {
      /* it had already stopped */
    }
  });
};

export type PackSoundFiles = Record<string, () => string>;
export interface PackPlayOptions { rate?: number; delay?: number }
/** A page's theme: one file holding the intro and then the loop. The loop points sit inside the periodic part, well clear of AAC's encoder delay, which differs between browsers. */
export interface PackMusic { url: () => string; loopStart: number; loopEnd: number }
interface MusicNodes { source: AudioBufferSourceNode; filter: BiquadFilterNode; duck: GainNode; fade: GainNode }

/**
 * `files` and `music` must be the same objects for the life of the page (constants beside the page), the file values functions, so that nothing looks for a file until a page is mounted.
 * A sound that is not ready is skipped. The theme starts as soon as it is decoded and plays until the page goes: the intro once, then the loop.
 */
export const usePackSounds = (files: PackSoundFiles, music?: PackMusic) => {
  const [on, setOn] = useState(readSoundOn);
  const buffers = useRef(new Map<string, AudioBuffer>());
  const alive = useRef(false);
  const musicBuffer = useRef<AudioBuffer | null>(null);
  const musicNodes = useRef<MusicNodes | null>(null);
  /* true once the intro has had its moment, or has lost it: from then on the theme only ever comes back at the loop */
  const introSpent = useRef(false);
  const ducked = useRef(false);

  const startMusic = useCallback(() => {
    const buffer = musicBuffer.current;
    /* the guard on the nodes is what keeps it to one, under StrictMode too */
    if (!alive.current || !music || !buffer || !context || !master || musicNodes.current || ducked.current || !readSoundOn()) return;
    try {
      if (context.state !== 'running') void context.resume().catch(() => undefined);
      const fromLoop = introSpent.current;
      introSpent.current = true;
      const now = context.currentTime;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = music.loopStart;
      source.loopEnd = music.loopEnd;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = OPEN_CUTOFF;
      const duck = context.createGain();
      const fade = context.createGain();
      source.connect(filter);
      filter.connect(duck);
      duck.connect(fade);
      fade.connect(master);
      if (fromLoop) {
        fade.gain.setValueAtTime(0, now);
        fade.gain.linearRampToValueAtTime(1, now + MUSIC_RETURN_SECONDS);
      }
      source.onended = () => {
        try { fade.disconnect(); duck.disconnect(); filter.disconnect(); source.disconnect(); } catch { /* it had gone */ }
      };
      /* if the context is still waiting for a press, this simply begins with it */
      source.start(0, fromLoop ? music.loopStart : 0);
      musicNodes.current = { source, filter, duck, fade };
    } catch {
      /* no sound */
    }
  }, [music]);

  const stopMusic = useCallback((seconds: number) => {
    const nodes = musicNodes.current;
    musicNodes.current = null;
    if (!nodes || !context) return;
    try {
      const now = context.currentTime;
      nodes.fade.gain.cancelScheduledValues(now);
      nodes.fade.gain.setValueAtTime(nodes.fade.gain.value, now);
      nodes.fade.gain.linearRampToValueAtTime(0, now + seconds);
      nodes.source.stop(now + seconds + 0.02);
    } catch {
      /* it had already stopped */
    }
  }, []);

  /** The power dies: the theme drops away and a low-pass closes on it. */
  const duckMusic = useCallback(() => {
    ducked.current = true;
    /* a theme still decoding when this comes must not open with its intro over the door */
    introSpent.current = true;
    const nodes = musicNodes.current;
    if (!nodes || !context) return;
    try {
      const now = context.currentTime;
      nodes.duck.gain.cancelScheduledValues(now);
      nodes.duck.gain.setTargetAtTime(DUCK_LEVEL, now, 0.07);
      nodes.filter.frequency.cancelScheduledValues(now);
      nodes.filter.frequency.setTargetAtTime(DUCK_CUTOFF, now, 0.09);
    } catch {
      /* no sound */
    }
  }, []);

  /** It comes back up through the opening filter. */
  const restoreMusic = useCallback(() => {
    ducked.current = false;
    const nodes = musicNodes.current;
    if (!nodes || !context) { startMusic(); return; }
    try {
      const now = context.currentTime;
      nodes.duck.gain.cancelScheduledValues(now);
      nodes.duck.gain.setValueAtTime(DUCK_LEVEL, now);
      nodes.duck.gain.linearRampToValueAtTime(1, now + RESTORE_SECONDS);
      nodes.filter.frequency.cancelScheduledValues(now);
      nodes.filter.frequency.setValueAtTime(DUCK_CUTOFF, now);
      nodes.filter.frequency.exponentialRampToValueAtTime(OPEN_CUTOFF, now + RESTORE_SECONDS);
    } catch {
      /* no sound */
    }
  }, [startMusic]);

  const play = useCallback((name: string, options: PackPlayOptions = {}) => {
    if (!readSoundOn() || !context) return;
    const buffer = buffers.current.get(name);
    if (!buffer) return;
    try {
      if (context.state !== 'running') void context.resume().catch(() => undefined);
      startBuffer(buffer, options.rate, options.delay);
    } catch {
      /* no sound */
    }
  }, []);

  const toggleSound = useCallback(() => {
    const next = !readSoundOn();
    soundOn = next;
    setOn(next);
    try {
      if (context && master) {
        if (next && context.state !== 'running') void context.resume().catch(() => undefined);
        master.gain.setTargetAtTime(next ? 1 : 0, context.currentTime, 0.02);
      }
    } catch {
      /* no sound */
    }
    /* off stops the theme for good; on brings it back at the loop's level, and never replays the intro */
    introSpent.current = true;
    if (next) startMusic();
    else stopMusic(0.06);
    /* never on the tap itself */
    setTimeout(() => {
      try { window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off'); } catch { /* it lasts this session */ }
    }, 0);
  }, [startMusic, stopMusic]);

  useEffect(() => {
    alive.current = true;
    introSpent.current = false;
    ducked.current = false;
    mountedPages += 1;
    let musicUrl = '';
    try { musicUrl = music ? music.url() : ''; } catch { /* no theme */ }
    const entries = Object.entries(files);
    /* one page's files in memory at a time: four decoded files are megabytes */
    const urls = entries.map(([name, url]) => {
      try { return [name, url()] as const; } catch { return [name, ''] as const; }
    }).filter(([, url]) => url);
    const keep = new Set(urls.map(([, url]) => url));
    decoded.forEach((_, url) => { if (!keep.has(url)) decoded.delete(url); });
    const taken = buffers.current;
    const cancelLoad = whenIdle(() => {
      const owner = ensureContext();
      if (!owner) return;
      /* its own tap may have come before the context existed */
      if (owner.state !== 'running') void owner.resume().catch(() => undefined);
      urls.forEach(([name, url]) => {
        void decode(url).then(buffer => {
          if (!buffer || !alive.current) return;
          taken.set(name, buffer);
        });
      });
      if (musicUrl) {
        void decode(musicUrl).then(buffer => {
          if (!buffer || !alive.current) return;
          musicBuffer.current = buffer;
          startMusic();
        });
      }
    }, 120);
    /* a page reached without a tap, or a browser that wants a later event of the same press */
    const press = () => {
      unlockPackAudio();
      if (context?.state === 'running') removePress();
    };
    const PRESS_EVENTS = ['pointerdown', 'pointerup', 'click'] as const;
    const removePress = () => PRESS_EVENTS.forEach(type => document.removeEventListener(type, press, true));
    PRESS_EVENTS.forEach(type => document.addEventListener(type, press, { capture: true, passive: true }));
    return () => {
      alive.current = false;
      mountedPages -= 1;
      cancelLoad();
      removePress();
      fadeAll();
      stopMusic(MUSIC_EXIT_SECONDS);
      /* the theme's decoded buffer is many MB. Only its small bytes stay, for the next visit */
      musicBuffer.current = null;
      if (musicUrl) decoded.delete(musicUrl);
      /* an idle running context keeps the phone's audio awake for nothing. It must outlast the theme's fade */
      setTimeout(() => {
        try {
          if (mountedPages === 0 && context?.state === 'running') void context.suspend().catch(() => undefined);
        } catch {
          /* no sound */
        }
      }, (MUSIC_EXIT_SECONDS + 0.06) * 1000);
    };
  }, [files, music, startMusic, stopMusic]);

  return { play, soundOn: on, toggleSound, duckMusic, restoreMusic };
};
