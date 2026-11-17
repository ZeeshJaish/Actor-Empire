/* Same-result week memo (week-speed plan, Step 1, 2026-11-17).

   Inside one game week, and inside one save preparation, the same objects are normalized again and again.
   For example, the owned platform is normalized ~15 times a week, and the studio ecosystem once for every market
   of a Forbes list. A normalizer gives an equal result for an equal input, so inside one scope we hand back the
   result we already built. Measured on 17 Nov (performance/2026-11-16-lever-sizing): ~95 ms M4 a week, plus ~10 in
   the save, with the same final save hash.

   Rules:
   - A scope is open only while week or save-preparation code runs. The week's frame yields pause it, so screen
     code that runs between two steps of the week never reads or fills it. With no open scope, every wrapped
     function runs exactly as before.
   - The key is the first argument's identity plus the other arguments: primitives by value, sets by their
     contents, other objects by identity. An object a normalizer returned inside the scope is also handed back
     as is when it comes in again with the same other arguments, because normalizing a normalized object gives
     the same object again.
   - This relies on neither the inputs nor the results being changed in place while the scope is open. To check that,
     a tool can set globalThis.__AE_WEEK_MEMO_CHECK__ = true. The memo then keeps a JSON copy of every input and
     result it stores. When the scope closes, it compares them and lists any that changed in
     globalThis.__AE_WEEK_MEMO_CHANGES__. Nothing about the run changes. Never set it in the app. */

type MemoTable = {
    /** results this normalizer returned in the scope, with the key of the other arguments */
    outputs: WeakMap<object, string>;
    /** input object → (other-arguments key → result) */
    results: WeakMap<object, Map<string, unknown>>;
};

type WatchedObject = { name: string; role: 'input' | 'result'; value: object; json: string };
type WeekMemoScope = { tables: Map<string, MemoTable>; watched: WatchedObject[] | null };

type MemoGlobals = { __AE_WEEK_MEMO_CHECK__?: boolean; __AE_WEEK_MEMO_CHANGES__?: Array<{ name: string; role: string; path: string }> };
const memoGlobals = globalThis as MemoGlobals;

const newScope = (): WeekMemoScope => ({ tables: new Map(), watched: memoGlobals.__AE_WEEK_MEMO_CHECK__ ? [] : null });

const firstDifference = (before: unknown, after: unknown, path: string, depth: number): string => {
    if (depth > 6 || before === null || after === null || typeof before !== 'object' || typeof after !== 'object') return path;
    const keys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);
    for (const key of keys) {
        const left = (before as Record<string, unknown>)[key];
        const right = (after as Record<string, unknown>)[key];
        if (JSON.stringify(left) !== JSON.stringify(right)) return firstDifference(left, right, `${path}.${key}`, depth + 1);
    }
    return path;
};

const watch = (scope: WeekMemoScope, name: string, role: WatchedObject['role'], value: object): void => {
    if (!scope.watched) return;
    try {
        scope.watched.push({ name, role, value, json: JSON.stringify(value) });
    } catch {
        // Not serializable: nothing to compare.
    }
};

const closeScope = (scope: WeekMemoScope): void => {
    if (!scope.watched) return;
    const changes = memoGlobals.__AE_WEEK_MEMO_CHANGES__ || (memoGlobals.__AE_WEEK_MEMO_CHANGES__ = []);
    for (const item of scope.watched) {
        let now = '';
        try { now = JSON.stringify(item.value); } catch { continue; }
        if (now !== item.json) changes.push({ name: item.name, role: item.role, path: firstDifference(JSON.parse(item.json), JSON.parse(now), '$', 0) });
    }
};

let activeScope: WeekMemoScope | null = null;

const objectIds = new WeakMap<object, number>();
let nextObjectId = 1;
const identityOf = (value: object): number => {
    let id = objectIds.get(value);
    if (id === undefined) {
        id = nextObjectId;
        nextObjectId += 1;
        objectIds.set(value, id);
    }
    return id;
};

const keyOfOtherArguments = (rest: readonly unknown[]): string => {
    let length = rest.length;
    while (length > 0 && rest[length - 1] === undefined) length -= 1;
    let key = '';
    for (let index = 0; index < length; index += 1) {
        const value = rest[index];
        if (value === undefined) key += '|u';
        else if (value === null) key += '|n';
        else if (value instanceof Set) key += `|S${JSON.stringify([...value].map(String).sort())}`;
        else if (typeof value === 'object' || typeof value === 'function') key += `|o${identityOf(value as object)}`;
        else key += `|${typeof value}:${String(value)}`;
    }
    return key;
};

/** Runs `run` with a fresh memo scope open (synchronous work only, such as one save preparation). */
export const withWeekMemo = <T>(run: () => T): T => {
    const previous = activeScope;
    const scope = newScope();
    activeScope = scope;
    try {
        return run();
    } finally {
        activeScope = previous;
        closeScope(scope);
    }
};

/** Runs an async week with its own memo scope. The scope is paused by `pauseWeekMemo` around every await that can
    let other code run, and closed when the week ends. */
export const withWeekMemoAsync = async <T>(run: () => Promise<T>): Promise<T> => {
    const previous = activeScope;
    const scope = newScope();
    activeScope = scope;
    try {
        return await run();
    } finally {
        activeScope = previous;
        closeScope(scope);
    }
};

/** Closes the open scope for the length of an await, and gives it back afterwards. */
export const pauseWeekMemo = async <T>(waitFor: () => Promise<T>): Promise<T> => {
    const scope = activeScope;
    if (!scope) return waitFor();
    activeScope = null;
    try {
        return await waitFor();
    } finally {
        activeScope = scope;
    }
};

/** Wraps a normalizer whose first argument is the object it normalizes. Outside a scope it is the plain function. */
export const memoizeWeekNormalizer = <Fn extends (input: any, ...rest: any[]) => any>(name: string, normalize: Fn): Fn => {
    const memoized = (input: unknown, ...rest: unknown[]): unknown => {
        const scope = activeScope;
        if (!scope || input === null || typeof input !== 'object') return normalize(input, ...rest);
        let table = scope.tables.get(name);
        if (!table) {
            table = { outputs: new WeakMap(), results: new WeakMap() };
            scope.tables.set(name, table);
        }
        const key = keyOfOtherArguments(rest);
        if (table.outputs.get(input) === key) return input;
        const known = table.results.get(input);
        if (known && known.has(key)) return known.get(key);
        const result = normalize(input, ...rest);
        if (result !== null && typeof result === 'object') {
            watch(scope, name, 'input', input);
            if (result !== input) watch(scope, name, 'result', result);
            table.outputs.set(result, key);
            if (known) known.set(key, result);
            else table.results.set(input, new Map([[key, result]]));
        }
        return result;
    };
    return memoized as Fn;
};
