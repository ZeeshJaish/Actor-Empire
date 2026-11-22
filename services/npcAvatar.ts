import type { Gender } from '../types';
import {
    type ProfileBuilderCategoryId,
    type ProfileBuilderGender,
    createSeededProfileSelection,
    getProfilePart,
} from './profileBuilder';
import { exportProfilePortrait } from '../views/avatar/profilePortraitRenderer';
import { WEEK_AHEAD_LOAD_PORTRAITS_GLOBAL } from './weekAhead/weekAheadProtocol';
import { APP_DISPLAY_VERSION } from './appVersion';

const avatarCache = new Map<string, string>();
const MAX_GENERATED_AVATARS = 96;

/* Week Ahead (2026-11-12): the background worker that prepares the next week has no canvas, so its portraits
   must be the main thread's. The main thread keeps every portrait it hands out here (the strings the NPCs
   already hold; no extra copies) and gives them to the worker before the worker loads the game code. While
   the worker loads, and while it runs a week, a provider answers here instead: a portrait the main thread
   handed out, or a pending mark the main thread replaces with its portrait before that week is saved. */
type GeneratedAvatarProvider = (gender: Gender, nameSeed: string, cacheKey: string) => string;
let generatedAvatarProvider: GeneratedAvatarProvider | null = null;
export const setGeneratedAvatarProvider = (provider: GeneratedAvatarProvider | null): void => { generatedAvatarProvider = provider; };
const handedOutPortraits = new Map<string, string>();
/* 21 Nov 2026 (boot freeze): the lazy-face state, declared before any function here can run (see the section below). */
let facesWaitWhileLoading = typeof document !== 'undefined';
/** Cache keys of the built-in people whose faces waited; the kept-face store holds these faces only. */
const builtinFaceKeys = new Set<string>();
/** Every person (and load-time copy) whose face waited, for the idle drawing; emptied once it is done. */
const waitingPeople: object[] = [];
/** The faces kept on the phone, by cache key; drawGenderedAvatar takes a face from here before drawing. */
const keptFaces = new Map<string, string>();
let unstoredBuiltinFaces = 0;
const faceStats = { waited: 0, drawn: 0, drawnIdle: 0, drawnWhileLoading: 0, reused: 0, kept: 0, stored: 0, idleStart: 0, idleDone: 0 };
let inIdleSlice = false;
/* the idle drawing's state: running (started, not done), paused while a week plays (App), and who waits for it */
let idleFacesRunning = false;
let idleFacesPaused = false;
let faceWaiters: Array<() => void> = [];
const releaseFaceWaiters = (): void => { const waiters = faceWaiters; faceWaiters = []; for (const resolve of waiters) resolve(); };
/** The main thread's portraits by cache key, for the Week Ahead worker. */
export const getHandedOutPortraits = (): Array<[string, string]> => [...handedOutPortraits];
/* Week-speed plan Phase 1 (2026-11-17), item 1: the table above grows for the whole session (every face any screen
   showed) and was copied whole into the worker. The worker needs the faces its own copy of the game code draws while
   it loads (handed out before the app marked its load done) and the faces of the people in the NPC list it is sent.
   Any other face it meets during a week it asks for (the 'need-portraits' round trip), so the results are the same
   (the wa-equiv gate). */
let loadPortraitKeys: Set<string> | null = null;
/** Called once the app has loaded: the faces handed out until now are the ones the game code draws as it loads. */
export const markPortraitLoadDone = (): void => { if (!loadPortraitKeys) loadPortraitKeys = new Set(handedOutPortraits.keys()); };
/** The portraits the Week Ahead worker gets at start: the load-time faces and the faces of these people. */
export const getPortraitsForWorker = (people: readonly unknown[]): Array<[string, string]> => {
    if (!loadPortraitKeys) return [...handedOutPortraits];
    const faces = new Set<string>();
    for (const person of people) {
        if (hasUndrawnFace(person)) continue;
        const avatar = (person as { avatar?: unknown } | null)?.avatar;
        if (typeof avatar === 'string') faces.add(avatar);
    }
    const kept: Array<[string, string]> = [];
    for (const [key, portrait] of handedOutPortraits) if (loadPortraitKeys.has(key) || faces.has(portrait)) kept.push([key, portrait]);
    return kept;
};

export const clearGeneratedAvatarCache = (): void => { avatarCache.clear(); };
export const getGeneratedAvatarCacheSize = (): number => avatarCache.size;

const rememberGeneratedAvatar = (key: string, portrait: string): string => {
    avatarCache.set(key, portrait);
    if (avatarCache.size > MAX_GENERATED_AVATARS) {
        avatarCache.delete(avatarCache.keys().next().value!);
    }
    return portrait;
};

const toProfileBuilderGender = (gender: Gender): ProfileBuilderGender => {
    if (gender === 'FEMALE') return 'FEMALE';
    if (gender === 'NON_BINARY') return 'NON_BINARY';
    return 'MALE';
};

const fallbackColors = (category: ProfileBuilderCategoryId, id: string, fallback: string[]): string[] => {
    const colors = getProfilePart(category, id)?.colors || [];
    return colors.length > 0 ? colors : fallback;
};

const createFallbackPortrait = (gender: ProfileBuilderGender, seed: string): string => {
    const selection = createSeededProfileSelection(gender, seed);
    const skin = fallbackColors('skinTone', selection.skinTone, ['#d8a878', '#b88254', '#8e5c34']);
    const hair = fallbackColors('hairColor', selection.hairColor, ['#4a4644', '#26221e', '#100d0a']);
    const outfit = fallbackColors('outfit', selection.outfit, ['#3e4454', '#262a36', '#14161e', '#e8e6e0']);
    const frame = fallbackColors('frame', selection.frame, ['#20242c', '#12151b', '#5b6470']);
    const eye = fallbackColors('eyeColor', selection.eyeColor, ['#201005', '#4a2c14', '#66421e']);
    const faceShape = getProfilePart('faceShape', selection.faceShape)?.shape || 'oval';
    const hairShape = getProfilePart('hair', selection.hair)?.shape || 'side';
    const mouthShape = getProfilePart('mouth', selection.mouth)?.shape || 'smile';
    const facialHairShape = getProfilePart('facialHair', selection.facialHair)?.shape || 'none';
    const faceWidth = faceShape === 'wide' || faceShape === 'square' ? 54 : faceShape === 'slim' || faceShape === 'sharp' ? 44 : 50;
    const chinRadius = faceShape === 'square' ? 10 : faceShape === 'sharp' ? 4 : 16;
    const hairTop = hairShape === 'bald' ? '' : `<path d="M${64 - faceWidth / 2 - 2} 45 Q64 25 ${64 + faceWidth / 2 + 2} 45 L${64 + faceWidth / 2 - 2} 58 Q64 48 ${64 - faceWidth / 2 + 2} 58 Z" fill="${hair[1] || hair[0]}"/>`;
    const hairExtra = hairShape === 'long' || hairShape === 'bob' || hairShape === 'dreads'
        ? `<rect x="${64 - faceWidth / 2 - 5}" y="50" width="${faceWidth + 10}" height="42" rx="12" fill="${hair[2] || hair[1] || hair[0]}"/>`
        : hairShape === 'bun'
            ? `<circle cx="64" cy="33" r="12" fill="${hair[1] || hair[0]}"/>`
            : hairShape === 'afro' || hairShape === 'curly'
                ? `<circle cx="64" cy="43" r="33" fill="${hair[1] || hair[0]}"/>`
                : '';
    const mouth = mouthShape === 'full-lips' || mouthShape === 'pout'
        ? '<path d="M55 88 Q64 94 73 88 Q64 98 55 88Z" fill="#a65254"/>'
        : '<path d="M55 88 Q64 95 73 88" fill="none" stroke="#5e2d28" stroke-width="4" stroke-linecap="round"/>';
    const beard = facialHairShape === 'none'
        ? ''
        : `<path d="M${64 - faceWidth / 2 + 8} 84 Q64 110 ${64 + faceWidth / 2 - 8} 84 L${64 + faceWidth / 2 - 8} 98 Q64 116 ${64 - faceWidth / 2 + 8} 98 Z" fill="${hair[2] || hair[1] || hair[0]}" opacity="0.72"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" shape-rendering="crispEdges">
<rect width="128" height="128" rx="20" fill="${frame[1] || frame[0]}"/>
<circle cx="64" cy="60" r="48" fill="${frame[0]}" opacity="0.65"/>
<rect x="35" y="95" width="58" height="30" rx="8" fill="${outfit[1] || outfit[0]}"/>
<path d="M45 95 L64 110 L83 95 L86 128 H42 Z" fill="${outfit[2] || outfit[1] || outfit[0]}"/>
${hairExtra}
<rect x="${64 - faceWidth / 2}" y="42" width="${faceWidth}" height="58" rx="${chinRadius}" fill="${skin[1] || skin[0]}"/>
<rect x="${64 - faceWidth / 2 + 7}" y="52" width="${faceWidth - 14}" height="39" rx="${Math.max(4, chinRadius - 4)}" fill="${skin[0]}"/>
${hairTop}
<rect x="${64 - faceWidth / 2 + 10}" y="66" width="10" height="8" fill="#f3f6f8"/>
<rect x="${64 + faceWidth / 2 - 20}" y="66" width="10" height="8" fill="#f3f6f8"/>
<rect x="${64 - faceWidth / 2 + 14}" y="68" width="5" height="5" fill="${eye[1] || eye[0]}"/>
<rect x="${64 + faceWidth / 2 - 16}" y="68" width="5" height="5" fill="${eye[1] || eye[0]}"/>
<rect x="61" y="76" width="6" height="8" fill="${skin[2] || skin[1] || skin[0]}" opacity="0.72"/>
${beard}
${mouth}
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const drawGenderedAvatar = (profileGender: ProfileBuilderGender, seed: string, cacheKey: string): string => {
    const cached = avatarCache.get(cacheKey);
    if (cached) {
        avatarCache.delete(cacheKey);
        avatarCache.set(cacheKey, cached);
        return cached;
    }

    // 21 Nov 2026: a face already handed out this session, or kept on the phone, is the same picture; no redraw
    const known = handedOutPortraits.get(cacheKey) || keptFaces.get(cacheKey);
    if (known) {
        faceStats.reused += 1;
        return rememberGeneratedAvatar(cacheKey, known);
    }
    if (typeof document !== 'undefined') {
        try {
            const portrait = exportProfilePortrait(createSeededProfileSelection(profileGender, seed), 1);
            faceStats.drawn += 1;
            if (inIdleSlice) faceStats.drawnIdle += 1;
            if (facesWaitWhileLoading) faceStats.drawnWhileLoading += 1;
            if (builtinFaceKeys.has(cacheKey)) unstoredBuiltinFaces += 1;
            return rememberGeneratedAvatar(cacheKey, portrait);
        } catch (error) {
            console.warn('NPC portrait generation failed; using the local fallback portrait.', error);
        }
    }

    const portrait = createFallbackPortrait(profileGender, seed);
    return rememberGeneratedAvatar(cacheKey, portrait);
};

/** The shared portrait source for every NPC-facing surface. */
export const getGenderedAvatar = (gender: Gender, nameSeed: string): string => {
    const seed = nameSeed.replace(/\s/g, '');
    const profileGender = toProfileBuilderGender(gender);
    const cacheKey = `${profileGender}:${seed}`;
    const provider = generatedAvatarProvider
        || ((globalThis as Record<string, unknown>)[WEEK_AHEAD_LOAD_PORTRAITS_GLOBAL] as GeneratedAvatarProvider | undefined);
    if (provider) return provider(gender, nameSeed, cacheKey);
    const portrait = drawGenderedAvatar(profileGender, seed, cacheKey);
    if (typeof document !== 'undefined') handedOutPortraits.set(cacheKey, portrait);
    return portrait;
};

/* ------------------------------------------------------------------------------------------------------------------ *
 * 21 Nov 2026 (boot freeze: a slow phone sat 13-25 s on the logo while 796 built-in NPC faces were drawn as the game
 * code loaded). The people the game code builds AS IT LOADS, on a page that can draw, get their face the first time
 * anything reads it (a screen, a week, a copy, a save), by the same seed, so it is the same picture; from then on it is
 * a plain value in the same place (the key order of the object does not change). Everyone made after the load, and
 * everyone in the Week Ahead worker or in Node, draws the face at once, exactly as before. Builders write:
 *     return faceOnCreation({ ..., get avatar() { return drawLazyFace(this, gender, seed); },
 *                                  set avatar(value: string) { keepFace(this, value); }, ... });
 * - Faces nobody has read yet are drawn a few at a time while the phone is idle (drawIdleFaces), famous people first.
 * - The drawn built-in faces are kept on the phone (IndexedDB 'ActorEmpireFaces') for this game version, and a kept
 *   set is used only after a fresh drawing of one face matches it byte for byte, so a later start draws none.
 * - A face read before it was drawn is drawn on the spot: never blank, never missing.
 * ------------------------------------------------------------------------------------------------------------------ */

/** Counters for tests: faces that waited, drawn (of them by the idle drawing, and while the code loaded), reused, loaded
 *  from the phone, stored, and when the idle drawing started and finished (performance.now()). */
export const getFaceStats = (): Readonly<typeof faceStats> => ({ ...faceStats });

/** index.tsx calls this once the game code has loaded: people made from then on draw their face at once, as before. */
export const endLazyFaceLoading = (): void => { facesWaitWhileLoading = false; };

/** The cache key getGenderedAvatar uses for this person. */
export const avatarCacheKey = (gender: Gender, nameSeed: string): string => `${toProfileBuilderGender(gender)}:${nameSeed.replace(/\s/g, '')}`;

const keepFaceValue = (holder: object, value: unknown): void => {
    Object.defineProperty(holder, 'avatar', { value, writable: true, enumerable: true, configurable: true });
};

/* Calling a lazy face's getter with this object as `this` returns the face's cache key and draws nothing. */
const FACE_KEY_PROBE = Object.freeze({});
const undrawnFaceKey = (person: unknown): string | null => {
    if (!person || typeof person !== 'object') return null;
    const descriptor = Object.getOwnPropertyDescriptor(person, 'avatar');
    return descriptor && typeof descriptor.get === 'function' ? String(descriptor.get.call(FACE_KEY_PROBE)) : null;
};

/** Every built-in person builder returns its person through this. While the game code loads (on a page that can
 *  draw) the face waits for its first reader; otherwise it is drawn now, as before. */
export const faceOnCreation = <T extends object>(person: T): T => {
    if (!facesWaitWhileLoading) {
        void (person as { avatar?: unknown }).avatar;
        return person;
    }
    const key = undrawnFaceKey(person);
    if (key) { builtinFaceKeys.add(key); waitingPeople.push(person); faceStats.waited += 1; }
    return person;
};

/** Getter body for a person's face: draws it (or takes the same picture from this session or the phone), then keeps
 *  it as a plain value in the same place. */
export const drawLazyFace = (holder: object, gender: Gender, nameSeed: string): string => {
    if (holder === FACE_KEY_PROBE) return avatarCacheKey(gender, nameSeed);
    const face = getGenderedAvatar(gender, nameSeed);
    keepFaceValue(holder, face);
    return face;
};

/** Setter body: an assigned face replaces the lazy one, in the same place. */
export const keepFace = (holder: object, value: unknown): void => keepFaceValue(holder, value);

/** True when this cache key is a built-in face still waiting for the idle drawing (not drawn, not kept on the phone). */
export const isFaceStillWaiting = (cacheKey: string): boolean =>
    builtinFaceKeys.has(cacheKey) && !handedOutPortraits.has(cacheKey) && !keptFaces.has(cacheKey);

/** Resolves once the idle drawing is done, or at once when it is not running (never started, as in Node and the tests,
 *  or done) or is paused for a week (a week must never wait for it). */
export const whenWaitingFacesDrawn = (): Promise<void> => (idleFacesRunning && !idleFacesPaused
    ? new Promise<void>(resolve => { faceWaiters.push(resolve); })
    : Promise.resolve());

/** App pauses the idle drawing while a week plays, so the two never share the phone's time; anything waiting for it is
 *  answered at once (it then draws what it needs itself). */
export const setIdleFacesPaused = (paused: boolean): void => {
    idleFacesPaused = paused;
    if (paused) releaseFaceWaiters();
};

/** True while this person's face has not been drawn (reading `avatar` would draw it; this does not). */
export const hasUndrawnFace = (person: unknown): boolean => {
    if (!person || typeof person !== 'object') return false;
    const descriptor = Object.getOwnPropertyDescriptor(person, 'avatar');
    return Boolean(descriptor && typeof descriptor.get === 'function');
};

/** A copy of a person that keeps an undrawn face undrawn (the copy's getter draws for the copy). Same keys, same order,
 *  same values as `{ ...person }`. */
export const copyPersonKeepingFace = <T extends object>(person: T): T => {
    if (!hasUndrawnFace(person)) return { ...person };
    const copy = {} as Record<string, unknown>;
    const source = person as Record<string, unknown>;
    for (const name of Object.keys(source)) {
        if (name === 'avatar') Object.defineProperty(copy, 'avatar', Object.getOwnPropertyDescriptor(source, 'avatar')!);
        else copy[name] = source[name];
    }
    if (facesWaitWhileLoading) waitingPeople.push(copy);
    return copy as T;
};

/** The people as the Week Ahead worker gets them: an undrawn face becomes the worker's pending mark (its week asks the
 *  main thread for the picture before the week is used), so sending the list draws nothing. */
export const peopleForWorker = (people: readonly unknown[], pendingPrefix: string): unknown[] => people.map(person => {
    const key = undrawnFaceKey(person);
    if (!key) return person;
    const source = person as Record<string, unknown>;
    const copy: Record<string, unknown> = {};
    for (const name of Object.keys(source)) copy[name] = name === 'avatar' ? `${pendingPrefix}${key}` : source[name];
    return copy;
});

const FACE_STORE_DB = 'ActorEmpireFaces';
const FACE_STORE = 'faces';
const FACE_RECORD_KEY = 'npc-faces';
let keptFacesRead: Promise<number> | null = null;

interface KeptFaceRecord { version?: string; probeKey?: string; faces?: Record<string, string>; savedAt?: number }

const openFaceStore = (version?: number): Promise<IDBDatabase | null> => new Promise(resolve => {
    try {
        if (typeof indexedDB === 'undefined') { resolve(null); return; }
        const request = version ? indexedDB.open(FACE_STORE_DB, version) : indexedDB.open(FACE_STORE_DB);
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(FACE_STORE)) request.result.createObjectStore(FACE_STORE); };
        request.onsuccess = () => {
            const db = request.result;
            if (db.objectStoreNames.contains(FACE_STORE)) { resolve(db); return; }
            // a database of this name without the store (not made by this code): one upgrade adds it
            const next = db.version + 1;
            db.close();
            if (version) { resolve(null); return; }
            void openFaceStore(next).then(resolve);
        };
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
    } catch { resolve(null); }
});

/** Reads the kept faces once. A kept set is used only if it was kept by this game version and one face drawn now is
 *  byte-identical to its kept copy (a WebView update that changes the pictures makes the game draw them again). */
export const loadKeptFaces = (): Promise<number> => {
    if (keptFacesRead) return keptFacesRead;
    keptFacesRead = (async () => {
        if (typeof document === 'undefined') return 0;
        const db = await openFaceStore();
        if (!db) return 0;
        try {
            const record = await new Promise<KeptFaceRecord | null>(resolve => {
                const tx = db.transaction(FACE_STORE, 'readonly');
                const request = tx.objectStore(FACE_STORE).get(FACE_RECORD_KEY);
                request.onsuccess = () => resolve((request.result as KeptFaceRecord | undefined) || null);
                request.onerror = () => resolve(null);
            });
            const faces = record?.faces;
            if (!record || record.version !== APP_DISPLAY_VERSION || !faces || typeof faces !== 'object') return 0;
            const probeKey = record.probeKey;
            if (!probeKey || typeof faces[probeKey] !== 'string') return 0;
            const split = probeKey.indexOf(':');
            const probe = exportProfilePortrait(createSeededProfileSelection(probeKey.slice(0, split) as ProfileBuilderGender, probeKey.slice(split + 1)), 1);
            if (probe !== faces[probeKey]) return 0;
            for (const [key, face] of Object.entries(faces)) {
                if (builtinFaceKeys.has(key) && typeof face === 'string' && face.startsWith('data:image/png')) keptFaces.set(key, face);
            }
            faceStats.kept = keptFaces.size;
            return keptFaces.size;
        } catch {
            return 0;
        } finally {
            db.close();
        }
    })();
    return keptFacesRead;
};

let storing: Promise<void> | null = null;
/** Keeps the built-in faces drawn so far on the phone (one record, replaced), when any is new since the last time. */
const storeKeptFaces = (): Promise<void> => {
    if (storing) return storing;
    if (!unstoredBuiltinFaces || typeof document === 'undefined') return Promise.resolve();
    storing = (async () => {
        const counted = unstoredBuiltinFaces;
        const faces: Record<string, string> = {};
        for (const key of builtinFaceKeys) {
            const face = handedOutPortraits.get(key) || keptFaces.get(key);
            if (face && face.startsWith('data:image/png')) faces[key] = face;
        }
        const probeKey = Object.keys(faces)[0];
        if (!probeKey) return;
        const db = await openFaceStore();
        if (!db) return;
        try {
            const done = await new Promise<boolean>(resolve => {
                const tx = db.transaction(FACE_STORE, 'readwrite');
                tx.objectStore(FACE_STORE).put({ version: APP_DISPLAY_VERSION, probeKey, faces, savedAt: Date.now() } satisfies KeptFaceRecord, FACE_RECORD_KEY);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
                tx.onabort = () => resolve(false);
            });
            if (done) {
                unstoredBuiltinFaces = Math.max(0, unstoredBuiltinFaces - counted);
                faceStats.stored = Object.keys(faces).length;
            }
        } catch {
            /* keeping faces is only a speed-up */
        } finally {
            db.close();
        }
    })().finally(() => { storing = null; });
    return storing;
};

/* 22 Nov 2026 (the Redmi: the idle drawing gets ~30 faces a second while the start screens animate, so the order decides
   what is ready first): the NPC list's people first, famous first (Instagram's search, X and the casting steps list them
   all), then the global creators every career shows (20M+ followers), then the other creators, shown only when their
   country pack is on. */
const fameRank = (person: unknown): number => {
    const { id, tier, followers } = (person || {}) as { id?: unknown; tier?: unknown; followers?: unknown };
    if (typeof id === 'string' && id.startsWith('yt_global_')) return typeof followers === 'number' && followers >= 20_000_000 ? 2 : 3;
    return tier === 'ICON' || tier === 'A_LIST' ? 0 : 1;
};

type IdleDeadline = { timeRemaining(): number };
/** After start-up: reads the kept faces, then draws every face still waiting while the phone is idle, famous people
 *  first, a few milliseconds at a time, and keeps them on the phone (also when the app goes to the background).
 *  `people` defaults to everyone whose face waited at load. Returns a stop function. */
export const drawIdleFaces = (people: () => readonly unknown[] = () => waitingPeople): (() => void) => {
    let stopped = false;
    let queue: unknown[] | null = null;
    let index = 0;
    let rechecked = false;
    const idle = (globalThis as { requestIdleCallback?: (cb: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number }).requestIdleCallback;
    const schedule = () => {
        if (stopped) return;
        if (typeof idle === 'function') idle(deadline => step(deadline), { timeout: 600 });
        else setTimeout(() => step(null), 40);
    };
    const step = (deadline: IdleDeadline | null) => {
        if (stopped) return;
        if (idleFacesPaused) { schedule(); return; }
        if (!faceStats.idleStart) faceStats.idleStart = performance.now();
        if (!queue) {
            const waiting = people().filter(hasUndrawnFace);
            queue = waiting.map((person, order) => ({ person, order, rank: fameRank(person) }))
                .sort((a, b) => a.rank - b.rank || a.order - b.order)
                .map(entry => entry.person);
        }
        // up to 40 ms of a free moment (a browser offers at most 50), at least one face when the phone stays busy
        const budget = deadline ? Math.max(4, Math.min(deadline.timeRemaining(), 40)) : 8;
        const started = performance.now();
        inIdleSlice = true;
        try {
            while (index < queue.length && performance.now() - started < budget) {
                const person = queue[index++];
                if (hasUndrawnFace(person)) void (person as { avatar?: unknown }).avatar;
            }
        } finally {
            inIdleSlice = false;
        }
        // 22 Nov 2026 (the Redmi needs ~45 s of free moments on the first start): progress is kept every 200 new faces, so
        // a player who leaves early keeps what was drawn and the next start draws only the rest
        if (unstoredBuiltinFaces >= 200 && !storing) void storeKeptFaces();
        if (index < queue.length) { schedule(); return; }
        if (!rechecked) {
            // people added to the list since (a week replaces some entries): one more pass
            rechecked = true;
            queue = people().filter(hasUndrawnFace);
            index = 0;
            if (queue.length) { schedule(); return; }
        }
        faceStats.idleDone = performance.now();
        waitingPeople.length = 0;
        idleFacesRunning = false;
        releaseFaceWaiters();
        void storeKeptFaces();
    };
    const onHide = () => { if (document.visibilityState === 'hidden') void storeKeptFaces(); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onHide);
    idleFacesRunning = true;
    void loadKeptFaces().then(() => schedule(), () => schedule());
    return () => {
        stopped = true;
        idleFacesRunning = false;
        releaseFaceWaiters();
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onHide);
    };
};
