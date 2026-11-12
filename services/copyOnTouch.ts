/* 2026-11-12 (player report: "if something like this [a life event] pops up & I choose, most of the time it
   crashes"): choosing an option made a full JSON copy of the career (JSON.parse(JSON.stringify(player)))
   before the option's impact ran. On a late career (70–80 MB) that is an 80 MB string plus a second whole
   career in memory at once, which is enough for iOS/Android to kill the web view.

   A copy-on-touch draft gives the impact the same thing it had before (a copy it may change freely, with
   the same JSON semantics: functions and undefined dropped), but copies only the top-level parts the impact
   actually touches. Untouched parts (the world, the streaming company…) are shared with the original. */

const jsonCopy = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export interface CopyOnTouch<T extends object> {
  /** Hand this to the code that may change it. */
  draft: T;
  /** Turn a result back into a plain object (the draft itself, or anything else unchanged). */
  finish: (value: unknown) => unknown;
  /** The top-level keys copied so far (for tests). */
  touched: () => string[];
}

export const createCopyOnTouch = <T extends object>(source: T): CopyOnTouch<T> => {
  const touched = new Map<PropertyKey, unknown>();
  const removed = new Set<PropertyKey>();
  const read = (key: PropertyKey): unknown => {
    if (touched.has(key)) return touched.get(key);
    if (removed.has(key)) return undefined;
    const value = Reflect.get(source, key);
    if (typeof value === 'function') return undefined;
    if (value && typeof value === 'object') {
      const copy = jsonCopy(value);
      touched.set(key, copy);
      return copy;
    }
    return value;
  };
  const keys = (): PropertyKey[] => {
    const all = new Set<PropertyKey>(Reflect.ownKeys(source));
    touched.forEach((_, key) => all.add(key));
    removed.forEach(key => all.delete(key));
    /* listing keys must not copy anything: check the values where they are */
    return [...all].filter(key => {
      if (typeof key !== 'string') return false;
      const value = touched.has(key) ? touched.get(key) : Reflect.get(source, key);
      return value !== undefined && typeof value !== 'function';
    });
  };
  const draft = new Proxy(source, {
    get: (_target, key) => read(key),
    set: (_target, key, value) => { touched.set(key, value); removed.delete(key); return true; },
    deleteProperty: (_target, key) => { touched.delete(key); removed.add(key); return true; },
    has: (_target, key) => !removed.has(key) && (touched.has(key) || Reflect.has(source, key)),
    ownKeys: () => keys() as Array<string | symbol>,
    getOwnPropertyDescriptor: (_target, key) => {
      if (removed.has(key) || !(touched.has(key) || Reflect.has(source, key))) return undefined;
      const value = read(key);
      return value === undefined ? undefined : { value, writable: true, enumerable: true, configurable: true };
    },
  }) as T;
  const materialize = (): T => {
    const out: Record<PropertyKey, unknown> = {};
    for (const key of Reflect.ownKeys(source)) {
      if (removed.has(key)) continue;
      const value = touched.has(key) ? touched.get(key) : Reflect.get(source, key);
      if (value !== undefined && typeof value !== 'function') out[key as string] = value;
    }
    touched.forEach((value, key) => { if (!(key in out) && value !== undefined) out[key as string] = value; });
    return out as T;
  };
  return {
    draft,
    finish: value => (value === draft ? materialize() : value),
    touched: () => [...touched.keys()].map(String),
  };
};
