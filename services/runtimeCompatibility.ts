import cloneFallback from 'core-js-pure/actual/structured-clone';
import arrayAtFallback from 'core-js-pure/actual/array/virtual/at';
import replaceAllFallback from 'core-js-pure/actual/string/virtual/replace-all';

// The declared iOS 15 baseline predates these APIs. Install only missing
// features before the app modules execute; keep working native implementations.
if (typeof globalThis.structuredClone !== 'function') {
    Object.defineProperty(globalThis, 'structuredClone', { value: cloneFallback, writable: true, configurable: true });
}
if (typeof Array.prototype.at !== 'function') {
    Object.defineProperty(Array.prototype, 'at', { value: arrayAtFallback, writable: true, configurable: true });
    if (typeof Symbol.unscopables === 'symbol') {
        const excluded = Array.prototype[Symbol.unscopables] || Object.create(null);
        excluded.at = true;
        if (!Array.prototype[Symbol.unscopables]) Object.defineProperty(Array.prototype, Symbol.unscopables, { value: excluded, configurable: true });
    }
}
if (typeof Object.hasOwn !== 'function') {
    Object.defineProperty(Object, 'hasOwn', { value: (value: unknown, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key), writable: true, configurable: true });
}
if (typeof String.prototype.replaceAll !== 'function') {
    Object.defineProperty(String.prototype, 'replaceAll', { value: replaceAllFallback, writable: true, configurable: true });
}
