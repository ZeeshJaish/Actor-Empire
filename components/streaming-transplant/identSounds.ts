/**
 * The fifteen ident sounds as a viewer would describe them (#119; Zeesh, 2026-11-01: "आइडेंट म्यूजिक के लिए समझ ही नहीं
 * आ रहा"). A name alone ("Prism", "Orbit") says nothing, so each sound carries what it sounds like and its shape: the
 * wave its notes make (seven heights, 0–100, drawn as bars) and where its hits land (0–1 of its length). The notes
 * themselves are `services/streamingIdentAudio.ts`'s; this table only describes them.
 */
import type { StreamingSoundIdentKey } from '../../types';

export interface StreamingIdentSoundInfo {
    key: StreamingSoundIdentKey;
    name: string;
    /** what it sounds like, in a few plain words */
    feel: string;
    /** seven heights, 0–100: the shape its notes make */
    wave: number[];
    /** where its hits land, 0–1 of its length */
    beats: number[];
}

export const STREAMING_IDENT_SOUNDS: readonly StreamingIdentSoundInfo[] = [
    { key: 'PULSE', name: 'Pulse', feel: 'Two deep heartbeat hits', wave: [30, 90, 40, 95, 35, 25, 20], beats: [.15, .45] },
    { key: 'ASCENT', name: 'Ascent', feel: 'Four notes climbing up', wave: [20, 35, 50, 65, 80, 92, 100], beats: [.1, .3, .55, .8] },
    { key: 'PREMIERE', name: 'Premiere', feel: 'A big orchestral swell', wave: [45, 55, 70, 85, 100, 80, 60], beats: [.2, .9] },
    { key: 'SILENT', name: 'Silent', feel: 'No sound, the logo alone', wave: [12, 12, 12, 12, 12, 12, 12], beats: [] },
    { key: 'CHOIR', name: 'Choir', feel: 'One long choir chord', wave: [60, 70, 78, 82, 80, 74, 66], beats: [.25] },
    { key: 'MACHINE', name: 'Machine', feel: 'Metal clanks and air', wave: [90, 20, 85, 25, 80, 30, 70], beats: [.1, .35, .6] },
    { key: 'SPARK', name: 'Spark', feel: 'Bright glassy chimes', wave: [22, 45, 82, 38, 96, 54, 30], beats: [.08, .3, .58] },
    { key: 'IMPACT', name: 'Impact', feel: 'One huge cinema boom', wave: [100, 76, 48, 34, 26, 20, 16], beats: [.08] },
    { key: 'ORBIT', name: 'Orbit', feel: 'A synth tune going round', wave: [30, 48, 72, 96, 72, 48, 30], beats: [.12, .38, .7] },
    { key: 'BLOOM', name: 'Bloom', feel: 'A warm chord opening up', wave: [18, 28, 44, 66, 84, 96, 92], beats: [.18, .5] },
    { key: 'PRISM', name: 'Prism', feel: 'Sparkling crystal notes', wave: [46, 88, 34, 96, 42, 78, 28], beats: [.08, .26, .48, .72] },
    { key: 'EMBER', name: 'Ember', feel: 'Warm bass, a slow glow', wave: [64, 72, 80, 68, 54, 42, 32], beats: [.12, .5] },
    { key: 'SIGNAL', name: 'Signal', feel: 'Digital beeps, a beacon', wave: [76, 18, 76, 18, 92, 34, 22], beats: [.08, .28, .58] },
    { key: 'HORIZON', name: 'Horizon', feel: 'A wide, airy rise', wave: [20, 30, 42, 58, 74, 88, 100], beats: [.2, .7] },
    { key: 'ANALOG', name: 'Analog', feel: 'Retro tape-warm synth', wave: [68, 44, 76, 38, 72, 48, 62], beats: [.1, .42, .74] },
];

const BY_KEY = new Map(STREAMING_IDENT_SOUNDS.map(sound => [sound.key, sound]));

/** a sound's description by its key or its lower-case preview id ("pulse"); Pulse when unknown */
export const streamingIdentSoundInfo = (key?: string | null): StreamingIdentSoundInfo =>
    BY_KEY.get(String(key || '').toUpperCase() as StreamingSoundIdentKey) || STREAMING_IDENT_SOUNDS[0];

/** a sound's seven heights spread over n bars (linear between them), 0–1 */
export const streamingIdentWaveBars = (wave: number[], n: number): number[] => Array.from({ length: n }, (_, index) => {
    const at = (index / Math.max(1, n - 1)) * (wave.length - 1);
    const low = Math.floor(at);
    const high = Math.min(wave.length - 1, low + 1);
    return (wave[low] + (wave[high] - wave[low]) * (at - low)) / 100;
});
