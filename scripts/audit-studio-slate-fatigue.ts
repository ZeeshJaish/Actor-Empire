import { calculateStudioSlateFatigue } from '../services/studioSlateFatigue';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const project: any = {
    title: 'Quiet Harbor',
    studioId: 'STUDIO_1',
    genre: 'DRAMA',
    franchiseId: 'HARBOR',
    hiddenStats: { selfRunProduction: true },
};

const fresh = calculateStudioSlateFatigue({
    age: 30,
    currentWeek: 20,
    activeReleases: [],
    pastProjects: [],
    commitments: [],
} as any, project);
assert(fresh.score === 0 && fresh.label === 'FRESH', 'A carefully made first lean project should not be punished.');

const crowded = calculateStudioSlateFatigue({
    age: 30,
    currentWeek: 20,
    activeReleases: [
        { id: 'active_1', projectDetails: { studioId: 'STUDIO_1', genre: 'DRAMA', franchiseId: 'HARBOR' }, releasedAtAbsoluteWeek: (29 * 52) + 14 },
        { id: 'active_2', projectDetails: { studioId: 'STUDIO_1', genre: 'DRAMA', franchiseId: 'HARBOR' }, releasedAtAbsoluteWeek: (29 * 52) + 10 },
    ],
    pastProjects: [],
    commitments: [
        { id: 'commitment_1', projectPhase: 'PRODUCTION', projectDetails: { hiddenStats: { selfRunProduction: true } } },
        { id: 'commitment_2', projectPhase: 'POST_PRODUCTION', projectDetails: { hiddenStats: { selfRunProduction: true } } },
    ],
} as any, project);
assert(crowded.label === 'FATIGUED', `Repeated self-run releases should become fatigued, got ${crowded.label}.`);
assert(crowded.reviewPenalty > 1, 'Fatigued slates should affect the critical response.');
assert(crowded.notes.includes('back-to-back releases'), 'Fatigue should tell the player what caused it.');

console.log('Studio slate fatigue audit passed.');
