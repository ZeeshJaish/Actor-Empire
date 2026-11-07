/** Exact pre-optimization issued hash algorithm; independent compatibility oracle. */
const quoteStableString = (value: string): string => `"${value.replace(/[\\"\u0000-\u001f]/g, character => {
    if (character === '\\') return '\\\\';
    if (character === '"') return '\\"';
    if (character === '\b') return '\\b';
    if (character === '\f') return '\\f';
    if (character === '\n') return '\\n';
    if (character === '\r') return '\\r';
    if (character === '\t') return '\\t';
    return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
})}"`;

const stableSerialize = (value: unknown): string => {
    if (value === null) return 'null';
    if (typeof value === 'string') return quoteStableString(value);
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item)).join(',')}]`;
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map(key => `${quoteStableString(key)}:${stableSerialize(record[key])}`).join(',')}}`;
    }
    return 'null';
};

export const issuedSaveHash = (value: unknown): string => {
    const text = stableSerialize(value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        first ^= code;
        first = Math.imul(first, 0x01000193);
        second ^= code + index;
        second = Math.imul(second, 0x85ebca6b);
    }
    return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
};

