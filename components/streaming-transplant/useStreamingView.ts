import { useMemo, type DependencyList } from 'react';

/** A memoized read selector. Creating a hidden screen's selector is cheap;
 * its model is resolved only when that screen consumes it. All hooks still run
 * in a fixed order, and dependencies invalidate the synchronous read normally. */
export const useStreamingView = <T>(read: () => T, dependencies: DependencyList): (() => T) => useMemo(() => {
    let resolved = false;
    let value: T;
    return () => {
        if (!resolved) {
            value = read();
            resolved = true;
        }
        return value;
    };
}, dependencies);
