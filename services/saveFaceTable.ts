/* Week-speed Phase 2 (2026-11-17), the face content table: the plan's Phase 2 item 6. This build (2a) only READS it.
   The writer (packSaveFaceTable) ships with 2b, after 2a's reader is in the field.

   A late career's save carries ~12.6 MB of face pictures (data URLs: generated NPC portraits, cast photos, feed
   avatars), of which ~4.4 MB are different pictures (fixture late-career, 17 Nov: 815 strings, 444 unique).

   The stored form (2b):
   - the saved player gets `faceTable: { v: 1, faces: { <key>: <data URL> } }`;
   - each face string (a "data:image/" string of at least FACE_MIN_CHARS) is stored as "aeface:1:<key>", where key is
     a 16-hex-digit hash of the picture. A picture whose key is already taken by a different picture stays inline.
   - The player's own avatar (top-level `avatar`, which can be an uploaded photo) always stays inline.
   - No generator seed keys: the reader never regenerates a picture, it only looks one up.
   This is a physical representation only (like savePayloadBlocks): the integrity manifest is made from the complete
   player, and every read puts the pictures back (resolveSaveFaceTable, in savePayloadBlocks' materialize and in
   imports) before the save is verified or used. In memory, every reference to one picture then shares one string.
   Builds before 2a would show the references as broken images: that is why this reader ships a release first. */

export const FACE_TABLE_VERSION = 1;
export const FACE_REFERENCE_PREFIX = 'aeface:1:';
export const FACE_MIN_CHARS = 200;
const REFERENCE = /^aeface:1:([0-9a-f]{16})$/;

export interface SaveFaceTable {
    v: typeof FACE_TABLE_VERSION;
    faces: Record<string, string>;
}

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

/** Copy-on-write walk: new objects only along paths where `change` returned something else. Key order is kept. */
const rewrite = (value: unknown, change: (text: string, path: readonly string[]) => string, path: string[]): unknown => {
    if (typeof value === 'string') return change(value, path);
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        let out: unknown[] | null = null;
        for (let index = 0; index < value.length; index += 1) {
            const item = value[index];
            const next = rewrite(item, change, path);
            if (next !== item) {
                if (!out) out = value.slice();
                out[index] = next;
            }
        }
        return out || value;
    }
    let out: Record<string, unknown> | null = null;
    for (const key of Object.keys(value)) {
        const item = (value as Record<string, unknown>)[key];
        path.push(key);
        const next = rewrite(item, change, path);
        path.pop();
        if (next !== item) {
            if (!out) out = { ...(value as Record<string, unknown>) };
            out[key] = next;
        }
    }
    return out || value;
};

/** A save as stored (a player, or anything without a face table) → the complete save. The same object comes back when
 *  there is no table. A malformed table is dropped and its references stay, so the save fails verification and the
 *  recovery list opens, instead of a career with missing faces. */
export const resolveSaveFaceTable = <T>(save: T): T => {
    if (!save || typeof save !== 'object' || Array.isArray(save) || !own(save as object, 'faceTable')) return save;
    const { faceTable, ...rest } = save as unknown as Record<string, unknown> & { faceTable?: SaveFaceTable };
    const faces = faceTable && faceTable.v === FACE_TABLE_VERSION && faceTable.faces && typeof faceTable.faces === 'object'
        ? faceTable.faces
        : null;
    if (!faces) return rest as unknown as T;
    return rewrite(rest, text => {
        if (text.length > FACE_REFERENCE_PREFIX.length + 16) return text;
        const match = REFERENCE.exec(text);
        const face = match ? faces[match[1]] : undefined;
        return typeof face === 'string' ? face : text;
    }, []) as T;
};

const faceKey = (text: string): string => {
    let first = 0x811c9dc5, second = 0x9e3779b9;
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ (code + index), 0x85ebca6b);
    }
    return (first >>> 0).toString(16).padStart(8, '0') + (second >>> 0).toString(16).padStart(8, '0');
};

/** 2b's writer (not called by this build): a complete player → its stored form with a face table. Returns the same
 *  object when it holds no face picture. */
export const packSaveFaceTable = <T extends object>(player: T): T => {
    const faces: Record<string, string> = {};
    let references = 0;
    const packed = rewrite(player, (text, path) => {
        if (text.length < FACE_MIN_CHARS || !text.startsWith('data:image/')) return text;
        if (path.length === 1 && path[0] === 'avatar') return text;
        const key = faceKey(text);
        const held = faces[key];
        if (held === undefined) faces[key] = text;
        else if (held !== text) return text;
        references += 1;
        return FACE_REFERENCE_PREFIX + key;
    }, []) as T;
    if (!references) return player;
    return { ...(packed as object), faceTable: { v: FACE_TABLE_VERSION, faces } satisfies SaveFaceTable } as T;
};
