/** The exact issued UTF-16 structural hash. Native JSON quoting handles ordinary
 * strings; surrogate-containing strings retain the issued UTF-16 spelling.
 * Mutable hash state and both bounded quoting caches are invocation-local. */
export const stableSaveHash = (value: unknown): string => {
    let first = 0x811c9dc5, second = 0x9e3779b9, offset = 0;
    const quoted = new Map<string, string>();
    const quotedKeys = new Map<string, string>();
    // Only key ordering is reused, within this hash invocation. Values and
    // objects are never cached, including during independent stored-data checks.
    // A trie compares complete key sequences without a delimiter/collision risk.
    type SortKeyNode = { next: Map<string, SortKeyNode>; keys?: readonly string[] };
    const sortKeys: SortKeyNode = { next: new Map() };
    let sortKeyNodes = 0;
    const orderedKeys = (record: Record<string, unknown>): readonly string[] => {
        const keys = Object.keys(record);
        if (keys.length > 32) return keys.sort();
        let node = sortKeys;
        for (const key of keys) {
            let next = node.next.get(key);
            if (!next) {
                if (sortKeyNodes >= 2048) return keys.sort();
                next = { next: new Map() }; node.next.set(key, next); sortKeyNodes++;
            }
            node = next;
        }
        return node.keys || (node.keys = keys.sort());
    };
    const write = (text: string) => {
        let localFirst = first, localSecond = second, localOffset = offset;
        for (let index = 0; index < text.length; index++, localOffset++) {
            const code = text.charCodeAt(index);
            localFirst = Math.imul(localFirst ^ code, 0x01000193);
            localSecond = Math.imul(localSecond ^ (code + localOffset), 0x85ebca6b);
        }
        first = localFirst; second = localSecond; offset = localOffset;
    };
    const quote = (text: string, key = false): string => {
        const cache = key ? quotedKeys : quoted;
        const hit = cache.get(text);
        if (hit !== undefined) return hit;
        const result = !/[\ud800-\udfff]/.test(text) ? JSON.stringify(text) : `"${text.replace(/[\\"\u0000-\u001f]/g, character => {
            if (character === '\\') return '\\\\';
            if (character === '"') return '\\"';
            if (character === '\b') return '\\b';
            if (character === '\f') return '\\f';
            if (character === '\n') return '\\n';
            if (character === '\r') return '\\r';
            if (character === '\t') return '\\t';
            return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
        })}"`;
        if (text.length <= 128 && cache.size < 2048) cache.set(text, result);
        return result;
    };
    const visit = (item: unknown): void => {
        if (item === null) { write('null'); return; }
        if (typeof item === 'string') { write(quote(item)); return; }
        if (typeof item === 'number') { write(Number.isFinite(item) ? String(item) : 'null'); return; }
        if (typeof item === 'boolean') { write(item ? 'true' : 'false'); return; }
        if (Array.isArray(item)) {
            write('[');
            for (let index = 0; index < item.length; index++) {
                if (index) write(',');
                // Array.map/join in issued signatures preserves sparse slots.
                if (index in item) visit(item[index]);
            }
            write(']'); return;
        }
        if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>, keys = orderedKeys(record);
            write('{');
            for (let index = 0; index < keys.length; index++) {
                if (index) write(',');
                const key = keys[index]; write(quote(key, true)); write(':'); visit(record[key]);
            }
            write('}'); return;
        }
        write('null');
    };
    visit(value);
    return (first >>> 0).toString(16).padStart(8, '0') + (second >>> 0).toString(16).padStart(8, '0');
};

/** Perf plan Phase 3 (2026-11-09): exactly stableSaveHash(JSON.parse(JSON.stringify(value))), computed in
 * one walk, without building the JSON text and its parsed copy. JSON.stringify's rules are applied on the
 * way: toJSON (with its key), boxed primitives unwrapped, object keys whose value is undefined, a function
 * or a symbol left out, null for those in arrays and for non-finite numbers, BigInt and cycles throw.
 * The hash steps (characters written, key order, quoting) are the ones stableSaveHash uses. */
export const stableSaveHashJson = (value: unknown): string => {
    let first = 0x811c9dc5, second = 0x9e3779b9, offset = 0;
    const quoted = new Map<string, string>();
    const write = (text: string) => {
        let localFirst = first, localSecond = second, localOffset = offset;
        for (let index = 0; index < text.length; index++, localOffset++) {
            const code = text.charCodeAt(index);
            localFirst = Math.imul(localFirst ^ code, 0x01000193);
            localSecond = Math.imul(localSecond ^ (code + localOffset), 0x85ebca6b);
        }
        first = localFirst; second = localSecond; offset = localOffset;
    };
    const quote = (text: string): string => {
        const hit = quoted.get(text);
        if (hit !== undefined) return hit;
        const result = !/[\ud800-\udfff]/.test(text) ? JSON.stringify(text) : `"${text.replace(/[\\"\u0000-\u001f]/g, character => {
            if (character === '\\') return '\\\\';
            if (character === '"') return '\\"';
            if (character === '\b') return '\\b';
            if (character === '\f') return '\\f';
            if (character === '\n') return '\\n';
            if (character === '\r') return '\\r';
            if (character === '\t') return '\\t';
            return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
        })}"`;
        if (text.length <= 128 && quoted.size < 4096) quoted.set(text, result);
        return result;
    };
    // SerializeJSONProperty steps 2-4 (no replacer): toJSON, then boxed primitives
    const resolve = (item: unknown, key: () => string): unknown => {
        if (item !== null && (typeof item === 'object' || typeof item === 'bigint')) {
            const toJSON = (item as { toJSON?: unknown }).toJSON;
            if (typeof toJSON === 'function') item = toJSON.call(item, key());
        }
        if (item !== null && typeof item === 'object') {
            if (item instanceof Number) return Number(item);
            if (item instanceof String) return String(item);
            if (item instanceof Boolean) return item.valueOf();
            if (typeof BigInt === 'function' && item instanceof (BigInt as unknown as Function)) return (item as { valueOf: () => unknown }).valueOf();
        }
        return item;
    };
    const dropped = (item: unknown) => item === undefined || typeof item === 'function' || typeof item === 'symbol';
    const ancestors: object[] = [];
    const visit = (item: unknown): void => {
        if (item === null) { write('null'); return; }
        if (typeof item === 'string') { write(quote(item)); return; }
        if (typeof item === 'number') { write(Number.isFinite(item) ? String(item) : 'null'); return; }
        if (typeof item === 'boolean') { write(item ? 'true' : 'false'); return; }
        if (typeof item === 'bigint') throw new TypeError('Do not know how to serialize a BigInt');
        const record = item as Record<string, unknown>;
        if (ancestors.includes(record)) throw new TypeError('Converting circular structure to JSON');
        ancestors.push(record);
        if (Array.isArray(record)) {
            write('[');
            for (let index = 0; index < record.length; index++) {
                if (index) write(',');
                const child = resolve(record[index], () => String(index));
                if (dropped(child)) write('null'); else visit(child);
            }
            write(']');
        } else {
            const entries: Array<[string, unknown]> = [];
            for (const key of Object.keys(record)) {
                const child = resolve(record[key], () => key);
                if (!dropped(child)) entries.push([key, child]);
            }
            // the parsed copy's keys, in stableSaveHash's order (plain code-unit sort)
            entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
            write('{');
            for (let index = 0; index < entries.length; index++) {
                if (index) write(',');
                write(quote(entries[index][0])); write(':'); visit(entries[index][1]);
            }
            write('}');
        }
        ancestors.pop();
    };
    const root = resolve(value, () => '');
    // JSON.parse(undefined) is a SyntaxError: the round trip it replaces could not hash such a value
    if (dropped(root)) throw new SyntaxError('"undefined" is not valid JSON');
    visit(root);
    return (first >>> 0).toString(16).padStart(8, '0') + (second >>> 0).toString(16).padStart(8, '0');
};
