import type { OwnedStreamingCustomIdentAudio, StreamingSoundIdentKey } from '../types';

export type StreamingIdentPreviewId = Lowercase<StreamingSoundIdentKey> | 'custom';

const OUTPUT_SAMPLE_RATE = 22_050;
const MAX_DURATION_SECONDS = 8;
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

let activeAudio: HTMLAudioElement | null = null;
let activeContext: AudioContext | null = null;

const stopActivePreview = () => {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (activeContext) {
    void activeContext.close().catch(() => undefined);
    activeContext = null;
  }
};

const audioContextConstructor = (): typeof AudioContext | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    || null;
};

/** Plays only from an explicit player gesture. Presets are synthesized locally,
    so the same path works in Safari, Android WebView and Capacitor without a
    network request or a native audio plugin. */
export const playStreamingIdentPreview = async (
  sound: StreamingIdentPreviewId,
  customAudio?: Pick<OwnedStreamingCustomIdentAudio, 'dataUrl'> | null,
): Promise<void> => {
  stopActivePreview();
  if (sound === 'silent') return;

  if (sound === 'custom' && customAudio?.dataUrl) {
    const audio = new Audio(customAudio.dataUrl);
    activeAudio = audio;
    audio.volume = 0.82;
    audio.addEventListener('ended', () => {
      if (activeAudio === audio) activeAudio = null;
    }, { once: true });
    await audio.play();
    return;
  }

  const AudioContextClass = audioContextConstructor();
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  activeContext = context;
  await context.resume();

  const sequences: Record<Exclude<StreamingIdentPreviewId, 'silent' | 'custom'>, Array<[number, number, number, OscillatorType]>> = {
    pulse: [[92, 0, 0.2, 'sine'], [138, 0.22, 0.28, 'sine']],
    ascent: [[196, 0, 0.14, 'triangle'], [293.66, 0.14, 0.16, 'triangle'], [440, 0.3, 0.2, 'triangle'], [659.25, 0.49, 0.34, 'sine']],
    premiere: [[82.41, 0, 0.44, 'triangle'], [220, 0.1, 0.55, 'sine'], [329.63, 0.12, 0.55, 'sine'], [493.88, 0.2, 0.58, 'sine']],
    choir: [[196, 0, 0.72, 'sine'], [246.94, 0.02, 0.72, 'sine'], [293.66, 0.04, 0.72, 'sine']],
    machine: [[120, 0, 0.09, 'square'], [72, 0.13, 0.1, 'sawtooth'], [180, 0.27, 0.12, 'square'], [96, 0.43, 0.18, 'sawtooth']],
    spark: [[659.25, 0, 0.12, 'sine'], [987.77, 0.1, 0.18, 'triangle'], [1318.51, 0.2, 0.24, 'sine']],
    impact: [[65.41, 0, 0.42, 'sine'], [98, 0.015, 0.36, 'sawtooth'], [49, 0.08, 0.5, 'triangle']],
    orbit: [[220, 0, 0.22, 'sine'], [329.63, 0.16, 0.24, 'triangle'], [246.94, 0.34, 0.28, 'sine'], [493.88, 0.5, 0.34, 'sine']],
    bloom: [[174.61, 0, 0.55, 'sine'], [261.63, 0.08, 0.62, 'sine'], [392, 0.18, 0.62, 'triangle']],
    prism: [[523.25, 0, 0.13, 'triangle'], [783.99, 0.09, 0.17, 'sine'], [1046.5, 0.2, 0.22, 'triangle'], [1567.98, 0.3, 0.26, 'sine']],
    ember: [[110, 0, 0.34, 'sine'], [164.81, 0.12, 0.44, 'triangle'], [220, 0.28, 0.5, 'sine']],
    signal: [[440, 0, 0.08, 'square'], [440, 0.15, 0.08, 'square'], [659.25, 0.3, 0.1, 'sine'], [880, 0.45, 0.2, 'triangle']],
    horizon: [[146.83, 0, 0.7, 'sine'], [220, 0.08, 0.72, 'sine'], [329.63, 0.2, 0.7, 'triangle'], [493.88, 0.38, 0.55, 'sine']],
    analog: [[196, 0, 0.16, 'sawtooth'], [185, 0.18, 0.18, 'triangle'], [293.66, 0.38, 0.24, 'sawtooth'], [277.18, 0.4, 0.28, 'sine']],
  };
  const sequence = sequences[sound as keyof typeof sequences] || sequences.pulse;
  let end = 0;
  sequence.forEach(([frequency, delay, duration, oscillatorType], index) => {
    end = Math.max(end, delay + duration);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = oscillatorType;
    oscillator.frequency.value = frequency;
    if (sound === 'machine' || sound === 'analog') oscillator.detune.value = index % 2 ? -18 : 14;
    gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(sound === 'choir' ? 0.055 : 0.1, context.currentTime + delay + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + delay);
    oscillator.stop(context.currentTime + delay + duration + 0.03);
  });
  window.setTimeout(() => {
    if (activeContext === context) activeContext = null;
    void context.close().catch(() => undefined);
  }, Math.ceil((end + 0.2) * 1000));
};

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
};

const encodeMonoWav = (samples: Float32Array, sampleRate: number): Uint8Array => {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return bytes;
};

const bytesToDataUrl = (bytes: Uint8Array): string => {
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(start, Math.min(bytes.length, start + 0x8000))));
  }
  return `data:audio/wav;base64,${btoa(chunks.join(''))}`;
};

const fingerprint = (bytes: Uint8Array): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bytes.length; index += 97) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193);
  }
  return `wav-${(hash >>> 0).toString(16).padStart(8, '0')}-${bytes.length}`;
};

/** Converts any browser-decodable upload into an eight-second maximum, mono,
    22 kHz PCM WAV. This intentionally trades inaudible fidelity for predictable
    local-save size and native WebView playback. */
export const optimizeStreamingIdentUpload = async (file: File): Promise<OwnedStreamingCustomIdentAudio> => {
  if (!file.type.startsWith('audio/') && !/\.(aac|flac|m4a|mp3|ogg|wav)$/i.test(file.name)) {
    throw new Error('Choose an audio file.');
  }
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Audio must be smaller than 30 MB before conversion.');
  const AudioContextClass = audioContextConstructor();
  if (!AudioContextClass) throw new Error('Audio conversion is unavailable on this device.');

  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const durationSeconds = Math.min(MAX_DURATION_SECONDS, decoded.duration);
    const outputLength = Math.max(1, Math.floor(durationSeconds * OUTPUT_SAMPLE_RATE));
    const output = new Float32Array(outputLength);
    const channelData = Array.from({ length: decoded.numberOfChannels }, (_, channel) => decoded.getChannelData(channel));

    for (let index = 0; index < outputLength; index += 1) {
      const sourcePosition = index * decoded.sampleRate / OUTPUT_SAMPLE_RATE;
      const left = Math.min(decoded.length - 1, Math.floor(sourcePosition));
      const right = Math.min(decoded.length - 1, left + 1);
      const mix = sourcePosition - left;
      let sample = 0;
      channelData.forEach((channel) => { sample += channel[left] + (channel[right] - channel[left]) * mix; });
      output[index] = sample / Math.max(1, channelData.length);
    }

    let peak = 0;
    output.forEach((sample) => { peak = Math.max(peak, Math.abs(sample)); });
    const gain = peak > 0.001 ? Math.min(1.8, 0.86 / peak) : 1;
    const fadeSamples = Math.min(Math.floor(OUTPUT_SAMPLE_RATE * 0.035), Math.floor(output.length / 4));
    output.forEach((sample, index) => {
      const fadeIn = fadeSamples ? Math.min(1, index / fadeSamples) : 1;
      const fadeOut = fadeSamples ? Math.min(1, (output.length - 1 - index) / fadeSamples) : 1;
      output[index] = sample * gain * fadeIn * fadeOut;
    });

    const wav = encodeMonoWav(output, OUTPUT_SAMPLE_RATE);
    return {
      dataUrl: bytesToDataUrl(wav),
      originalName: file.name.slice(0, 120),
      durationSeconds: Number(durationSeconds.toFixed(2)),
      sampleRate: OUTPUT_SAMPLE_RATE,
      byteLength: wav.byteLength,
      fingerprint: fingerprint(wav),
    };
  } catch (error) {
    if (error instanceof Error && error.message !== 'EncodingError') throw error;
    throw new Error('This audio format could not be decoded. Try MP3, M4A or WAV.');
  } finally {
    await context.close().catch(() => undefined);
  }
};
