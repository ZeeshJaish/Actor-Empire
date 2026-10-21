import { SERVICE_COPY, type ServiceState } from './build';

export type RegionalStatusTone = 'good' | 'warn' | 'bad';
const TONES: RegionalStatusTone[] = ['bad', 'warn', 'good'];
export const REGIONAL_STATUS_SEGMENTS = 14;

/** Approximate proportions, with at least one segment for each nonzero state.
 * Exact market counts accompany the strip; a small outage must never disappear
 * just because a region contains more markets than the display has segments. */
export function regionalStatusSegments(states: readonly ServiceState[]): RegionalStatusTone[] {
  if (!states.length) return [];
  const counts = { good: 0, warn: 0, bad: 0 };
  states.forEach(state => { counts[SERVICE_COPY[state].tone as RegionalStatusTone] += 1; });
  const ideal = TONES.map(tone => counts[tone] / states.length * REGIONAL_STATUS_SEGMENTS);
  const allocated = ideal.map((value, i) => counts[TONES[i]] ? Math.max(1, Math.floor(value)) : 0);
  while (allocated.reduce((sum, value) => sum + value, 0) < REGIONAL_STATUS_SEGMENTS) {
    const index = TONES.map((_, i) => i).filter(i => counts[TONES[i]])
      .sort((a, b) => (ideal[b] - allocated[b]) - (ideal[a] - allocated[a]))[0];
    allocated[index] += 1;
  }
  while (allocated.reduce((sum, value) => sum + value, 0) > REGIONAL_STATUS_SEGMENTS) {
    const index = TONES.map((_, i) => i).filter(i => allocated[i] > 1)
      .sort((a, b) => (allocated[b] - ideal[b]) - (allocated[a] - ideal[a]))[0];
    allocated[index] -= 1;
  }
  return ['good', 'warn', 'bad'].flatMap(tone => Array.from(
    { length: allocated[TONES.indexOf(tone as RegionalStatusTone)] }, () => tone as RegionalStatusTone,
  ));
}
