/** The exact issued UTF-16 structural hash. Native JSON quoting handles ordinary
 * strings; surrogate-containing strings retain the issued UTF-16 spelling.
 * Mutable hash state and both bounded quoting caches are invocation-local. */
export const stableSaveHash = (value: unknown): string => {
    let first = 0x811c9dc5, second = 0x9e3779b9, offset = 0;
    const quoted = new Map<string, string>();
    const quotedKeys = new Map<string, string>();
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
        if (text.length <= (key ? 32 : 128) && cache.size < 2048) cache.set(text, result);
        return result;
    };
const shapes = {next:new Map<string,any>(),keys:undefined as string[]|undefined};let shapeNodes=0;
    const sortedKeys=(record:Record<string,unknown>):string[]=>{const keys=Object.keys(record);if(keys.length>32||shapeNodes>=2048)return keys.sort();let node=shapes;for(const key of keys){let next=node.next.get(key);if(!next){if(shapeNodes>=2048)return keys.sort();next={next:new Map(),keys:undefined};node.next.set(key,next);shapeNodes++;}node=next;}if(node.keys)return node.keys;return node.keys=keys.sort();};
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
            const record = item as Record<string, unknown>, keys = sortedKeys(record);
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
