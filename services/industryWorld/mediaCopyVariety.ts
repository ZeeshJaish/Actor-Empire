import { createDeterministicRng } from '../deterministicRandom';

/* Zeesh, 2026-11-09: "ek hi title baar baar repeat ho raha hai, bas naam aur subject alag hai".
   Media lines are built from slots chosen independently of each other (opener × claim × hedge, frame × subject),
   so one kind of story reads differently from story to story. The seed is the story's own id: the same story
   always reads the same way, on every screen and after every reload. */

export type CopyVars = Record<string, string | undefined>;

/** One option from a family, always the same one for the same seed. */
export const pickCopy = <T>(seed: string, options: readonly T[]): T => {
    const index = Math.floor(createDeterministicRng(`media-copy:${seed}`)() * options.length);
    return options[Math.min(options.length - 1, Math.max(0, index))];
};

/** Fill {name} slots; an empty slot leaves no double spaces or stray spaces before punctuation. */
export const fillCopy = (template: string, vars: CopyVars): string => template
    .replace(/\{(\w+)\}/g, (_match, key: string) => vars[key] ?? '')
    /* "the The Light claim" → "The Light claim": a title that brings its own article */
    .replace(/\b[Tt]he (?=(?:The|A|An) [A-Z0-9])/g, '')
    .replace(/\s+([,.!?:;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** The fixed words of a frame, lower-cased: "{title} misses its mark" → ["misses its mark"]. */
const plainWords = (text: string): string => text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const frameWords = (frame: string): string[] => frame.split(/\{\w+\}/).map(plainWords).filter(part => part.length >= 4);

/** True when a published line reads like this frame: its fixed words appear in it, in order. */
export const lineUsesFrame = (line: string, frame: string): boolean => {
    const words = frameWords(frame);
    if (!words.length) return false;
    const text = plainWords(line);
    let from = 0;
    for (const part of words) {
        const at = text.indexOf(part, from);
        if (at < 0) return false;
        from = at + part.length;
    }
    return true;
};

/** Like pickCopy, but frames that recent lines already used are skipped while a fresh one is left, so stories of one
    kind go through every frame before any frame comes back. Same seed and same history give the same pick. */
export const pickFreshCopy = (seed: string, frames: readonly string[], recentLines: readonly string[] = []): string => {
    const start = pickCopy(seed, frames.map((_frame, index) => index));
    for (let step = 0; step < frames.length; step += 1) {
        const frame = frames[(start + step) % frames.length];
        if (!recentLines.some(line => lineUsesFrame(line, frame))) return frame;
    }
    return frames[start];
};

/** Upper-case the first letter (a frame may start with a lower-case slot). */
export const sentenceStart = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/** One pick per slot, each slot on its own seed: three slots of five options give 125 versions of one line. */
export const composeCopy = (seed: string, slots: readonly (readonly string[])[], vars: CopyVars): string => slots
    .map((options, index) => fillCopy(pickCopy(`${seed}:${index}`, options), vars))
    .filter(Boolean)
    .map(sentenceStart)
    .join(' ');
