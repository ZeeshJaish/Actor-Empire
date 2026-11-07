import { useCallback, useRef, useState } from 'react';

/* The pack pages keep one state object and read its latest values from timers, so a late timer never sees an old tap. */
export function useMergedState<T extends object>(initial: T) {
  const [state, setState] = useState(initial);
  const latest = useRef(state);
  const merge = useCallback((patch: Partial<T>) => {
    latest.current = { ...latest.current, ...patch };
    setState(latest.current);
  }, []);
  return [state, merge, latest] as const;
}
