import { resolveStreamingPlatformBrandByName } from '../../../services/streamingPlatformBrandRegistry';

/* Anything unknown gets a stable colour from its own name, so a new rival is
   still consistently the same colour everywhere. */
const FALLBACK = ['#6d7f95', '#8a6bb5', '#b5836b', '#5f9a8c', '#9a7f5f'];

export function rivalColor(name: string): string {
  const key = name.trim().toLowerCase();
  const known = resolveStreamingPlatformBrandByName(key);
  if (known) return known.primaryColor;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK[hash % FALLBACK.length];
}

/** Grey. Nobody's colour, which is the point — it is the part still to win. */
export const UNCLAIMED = 'rgba(255, 255, 255, 0.16)';
