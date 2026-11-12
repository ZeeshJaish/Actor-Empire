/* Week Ahead (2026-11-12): the worker sends the main thread only what a week changed. Copying the whole career
   back took a mid-range phone about half a second on the tap and left a second, unshared copy of every text in
   memory. The worker compares the career it started from with the week it prepared and sends the changed parts;
   the main thread applies them to the same career it sent (copy on write: untouched parts stay the very same
   objects). The result is the prepared week exactly: same values, same key order, same holes, -0 and NaN, which
   the gate checks on every week (structuredClone terms, not just JSON).

   Patch kinds, applied in order (a parent's reshaping always comes before patches inside it):
   - [path, value]               the value replaces what is at path;
   - [path, keys, 'KEYS']        the record at path is rebuilt with exactly these keys in this order: a key it
                                 had keeps its value, a new key is filled by a later patch;
   - [path, spec, 'SHIFT']       the array at path is rebuilt from a run of its own items (spec.from, spec.count)
                                 placed at spec.at in an array of spec.length; the other slots are filled by later
                                 patches (news put in front, the oldest week dropped, a log grown at the end).
   Objects with many small changes are sent whole: a path costs more than a few numbers. */

export type CareerPatch =
    | [path: Array<string | number>, value: unknown]
    | [path: Array<string | number>, keys: string[], kind: 'KEYS']
    | [path: Array<string | number>, spec: { length: number; at: number; from: number; count: number }, kind: 'SHIFT'];

const isPlainRecord = (value: object): boolean => {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const sameKeys = (left: string[], right: string[]): boolean => {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false;
    return true;
};

const hasHoles = (items: unknown[]): boolean => {
    for (let index = 0; index < items.length; index++) if (!(index in items)) return true;
    return false;
};

const sameHoles = (left: unknown[], right: unknown[]): boolean => {
    for (let index = 0; index < left.length; index++) if ((index in left) !== (index in right)) return false;
    return true;
};

/** Exact equality in structuredClone terms: values (Object.is), key order, array holes. */
export const exactlyEqual = (left: unknown, right: unknown): boolean => {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left)) {
        const a = left, b = right as unknown[];
        if (a.length !== b.length || !sameHoles(a, b)) return false;
        for (let index = 0; index < a.length; index++) if ((index in a) && !exactlyEqual(a[index], b[index])) return false;
        return true;
    }
    if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
    const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
    const keys = Object.keys(a);
    if (!sameKeys(keys, Object.keys(b))) return false;
    for (const key of keys) if (!exactlyEqual(a[key], b[key])) return false;
    return true;
};

/** The alignment (items put in front, dropped at the end, or the other way round) under which the most items of
 *  `before` reappear unchanged in `after`: after[i] corresponds to before[i - shift] on the overlap. */
const findShift = (before: unknown[], after: unknown[]): { shift: number; at: number; count: number } | null => {
    if (before.length < 4 || after.length < 4 || hasHoles(before) || hasHoles(after)) return null;
    const grow = after.length - before.length;
    const candidates = [...new Set([grow, 0, 1, -1, 2, -2, 3, -3, grow + 1, grow - 1, grow + 2, grow - 2])];
    let best: { shift: number; at: number; count: number; equal: number } | null = null;
    for (const shift of candidates) {
        const start = Math.max(0, shift), end = Math.min(after.length, before.length + shift);
        if (end - start < 2) continue;
        // a few samples first, so a wrong alignment costs little
        let sampled = 0, sampleHits = 0;
        for (let step = 0; step < 6; step++) {
            const index = start + Math.floor(((end - start - 1) * step) / 5);
            sampled += 1;
            if (exactlyEqual(after[index], before[index - shift])) sampleHits += 1;
        }
        if (sampleHits * 3 < sampled) continue;
        let equal = 0;
        for (let index = start; index < end; index++) if (exactlyEqual(after[index], before[index - shift])) equal += 1;
        if (!best || equal > best.equal) best = { shift, at: start, count: end - start, equal };
    }
    if (!best || best.equal * 4 < Math.min(before.length, after.length)) return null;
    return { shift: best.shift, at: best.at, count: best.count };
};

/** Many changes inside one small flat record: sending it whole is cheaper than one path per change. */
const WHOLE_OBJECT_KEYS = 48;

const isFlatRecord = (record: Record<string, unknown>, keys: string[]): boolean => {
    for (const key of keys) { const value = record[key]; if (value && typeof value === 'object') return false; }
    return true;
};

/** What turns `before` into `after`. Both are private, plain data (no Maps, Sets, Dates or class objects). */
export const diffCareer = (before: unknown, after: unknown): CareerPatch[] => {
    const patches: CareerPatch[] = [];
    const path: Array<string | number> = [];
    const replace = (value: unknown) => { patches.push([path.slice(), value]); };
    const visitArray = (a: unknown[], b: unknown[]): void => {
        let elementWiseMark = -1, changed = 0;
        if (a.length === b.length && sameHoles(a, b)) {
            elementWiseMark = patches.length;
            for (let index = 0; index < a.length; index++) {
                if (!(index in a)) continue;
                const mark = patches.length;
                path.push(index); visit(a[index], b[index]); path.pop();
                if (patches.length > mark) changed += 1;
            }
            if (changed * 2 <= a.length) return;
        }
        const shift = findShift(a, b);
        if (!shift || (elementWiseMark >= 0 && shift.shift === 0)) {
            if (elementWiseMark < 0) replace(b);
            return;
        }
        if (elementWiseMark >= 0) patches.length = elementWiseMark;
        // The new array starts with the base's items on the overlap; the rest are filled, the overlap is patched.
        patches.push([path.slice(), { length: b.length, at: shift.at, from: shift.at - shift.shift, count: shift.count }, 'SHIFT']);
        for (let index = 0; index < b.length; index++) {
            path.push(index);
            if (index >= shift.at && index < shift.at + shift.count) visit(a[index - shift.shift], b[index]);
            else patches.push([path.slice(), b[index]]);
            path.pop();
        }
    };
    const visit = (left: unknown, right: unknown): void => {
        if (Object.is(left, right)) return;
        if (!left || !right || typeof left !== 'object' || typeof right !== 'object') { replace(right); return; }
        const leftArray = Array.isArray(left), rightArray = Array.isArray(right);
        if (leftArray !== rightArray) { replace(right); return; }
        if (leftArray) { visitArray(left as unknown[], right as unknown[]); return; }
        if (!isPlainRecord(left) || !isPlainRecord(right)) { replace(right); return; }
        const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
        const leftKeys = Object.keys(a), rightKeys = Object.keys(b);
        if (!sameKeys(leftKeys, rightKeys)) {
            // A record that gained, lost or reordered keys (a registry by id): rebuilt in the new key order.
            if (isFlatRecord(b, rightKeys) && rightKeys.length <= WHOLE_OBJECT_KEYS) { replace(right); return; }
            patches.push([path.slice(), rightKeys, 'KEYS']);
            for (const key of rightKeys) {
                path.push(key);
                if (Object.prototype.hasOwnProperty.call(a, key)) visit(a[key], b[key]);
                else patches.push([path.slice(), b[key]]);
                path.pop();
            }
            return;
        }
        const mark = patches.length;
        for (const key of rightKeys) { path.push(key); visit(a[key], b[key]); path.pop(); }
        if (patches.length - mark > Math.max(2, rightKeys.length / 3) && rightKeys.length <= WHOLE_OBJECT_KEYS && isFlatRecord(b, rightKeys)) {
            patches.length = mark;
            replace(right);
        }
    };
    visit(before, after);
    return patches;
};

/** Applies patches to `base` without changing it. Every container on a patched path is copied, once per place in
 *  the tree: an object the base holds in two places gets two copies, because patches describe places (a week may
 *  change the two places differently). */
export const applyCareerPatches = <T>(base: T, patches: readonly CareerPatch[]): T => {
    const fresh = new WeakSet<object>();
    const copyOf = (container: object): object => {
        const copy = Array.isArray(container) ? container.slice() : { ...(container as Record<string, unknown>) };
        fresh.add(copy);
        return copy;
    };
    const box: Record<string, unknown> = { root: base };
    fresh.add(box);
    const fail = () => { throw new Error('A week patch does not fit the career it was made for.'); };
    for (const patch of patches) {
        const path = patch[0];
        // Walk to the holder of the last key, copying every container on the way (the root's holder is `box`).
        let holder = box as Record<string | number, unknown>;
        let key: string | number = 'root';
        for (const step of path) {
            let child = holder[key];
            if (!child || typeof child !== 'object') fail();
            if (!fresh.has(child as object)) { child = copyOf(child as object); holder[key] = child; }
            holder = child as Record<string | number, unknown>;
            key = step;
        }
        if (patch.length === 2) { holder[key] = patch[1]; continue; }
        const current = holder[key];
        if (!current || typeof current !== 'object') fail();
        if (patch[2] === 'KEYS') {
            const source = current as Record<string, unknown>;
            const rebuilt: Record<string, unknown> = {};
            for (const name of patch[1]) rebuilt[name] = Object.prototype.hasOwnProperty.call(source, name) ? source[name] : undefined;
            fresh.add(rebuilt);
            holder[key] = rebuilt;
        } else {
            const source = current as unknown[], spec = patch[1];
            if (!Array.isArray(source) || spec.from < 0 || spec.from + spec.count > source.length) fail();
            const rebuilt: unknown[] = new Array(spec.length).fill(undefined);
            for (let index = 0; index < spec.count; index++) rebuilt[spec.at + index] = source[spec.from + index];
            fresh.add(rebuilt);
            holder[key] = rebuilt;
        }
    }
    return box.root as T;
};

/* Transport: one text per path and two flat lists copy between threads far faster than one small array per
   patch (a late week has about 100,000 patches). '\u001f' never appears in a career key; if it ever did, the
   patches travel unpacked. */
const PATH_SEPARATOR = '\u001f';
export interface PackedCareerPatches { paths: string[]; values: unknown[]; kinds: number[] }
export const packCareerPatches = (patches: readonly CareerPatch[]): PackedCareerPatches | null => {
    const paths: string[] = new Array(patches.length), values: unknown[] = new Array(patches.length), kinds: number[] = new Array(patches.length);
    for (let index = 0; index < patches.length; index++) {
        const patch = patches[index], path = patch[0];
        if (path.length === 0) return null;
        let text = '';
        for (let step = 0; step < path.length; step++) {
            const part = String(path[step]);
            if (part.includes(PATH_SEPARATOR)) return null;
            text = step === 0 ? part : text + PATH_SEPARATOR + part;
        }
        paths[index] = text;
        values[index] = patch[1];
        kinds[index] = patch.length === 2 ? 0 : patch[2] === 'KEYS' ? 1 : 2;
    }
    return { paths, values, kinds };
};
export const unpackCareerPatches = (packed: PackedCareerPatches): CareerPatch[] => {
    const patches: CareerPatch[] = new Array(packed.paths.length);
    for (let index = 0; index < packed.paths.length; index++) {
        const path = packed.paths[index].split(PATH_SEPARATOR);
        const kind = packed.kinds[index];
        patches[index] = kind === 0 ? [path, packed.values[index]]
            : kind === 1 ? [path, packed.values[index] as string[], 'KEYS']
                : [path, packed.values[index] as { length: number; at: number; from: number; count: number }, 'SHIFT'];
    }
    return patches;
};
