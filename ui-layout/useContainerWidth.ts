import { useEffect, useRef, useState } from 'react';

/** Measure a local group, not the device viewport. One observer per mounted group. */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [widthPx, setWidthPx] = useState(Number.NaN);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const next = Math.max(0, Math.round(element.getBoundingClientRect().width));
      setWidthPx(previous => previous === next ? previous : next);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return { ref, widthPx };
}
