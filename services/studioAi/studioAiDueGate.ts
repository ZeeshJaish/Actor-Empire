import type { IndustryIntelligenceState } from '../../types';

export const isStudioIntelligenceDue = (
    intelligence: IndustryIntelligenceState | undefined,
    absoluteWeek: number,
): boolean => {
    if (!intelligence) return true;
    return Object.values(intelligence.nextDueAbsoluteWeek).some(dueWeek => dueWeek !== null && dueWeek <= absoluteWeek);
};
