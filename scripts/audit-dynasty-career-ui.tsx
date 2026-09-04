import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as socialPage from '../views/SocialPage';
import * as dynastyCareer from '../services/dynastyCareer';
import { INITIAL_PLAYER, type Player } from '../types';

assert.equal(
    typeof (socialPage as any).DynastyCareerLegacyPanel,
    'function',
    'Connections > Legacy must expose the real dynasty career presentation',
);
assert.equal(
    typeof (dynastyCareer as any).getDynastyCareerArchives,
    'function',
    'multi-generation archive access must use one normalized service boundary',
);

const player = structuredClone(INITIAL_PLAYER) as Player;
player.age = 24;
player.currentWeek = 8;
player.flags.dynastyCareer = {
    schemaVersion: 1,
    lastProcessedAbsoluteWeek: 1200,
    members: {
        actor_asha: {
            id: 'actor_asha', playerId: 'player_asha', npcId: 'actor_asha', name: 'Asha Empire', avatar: 'asha', gender: 'FEMALE', generation: 1,
            ageAtSuccession: 48, successionAbsoluteWeek: 1100, health: 76, fame: 90, talent: 92, ambition: 84, selectivity: 65, familyLoyalty: 91,
            status: 'ACTIVE', currentProjectIds: ['project_horizon'], completedProjectIds: [], lastDecisionAbsoluteWeek: 1196, nextDecisionAbsoluteWeek: 1204,
            history: [{ id: 'joined', type: 'PROJECT_JOINED', absoluteWeek: 1198, projectId: 'project_horizon', title: 'Asha Empire joins The Last Horizon', detail: 'Outside production.' }],
        },
        actor_dev: {
            id: 'actor_dev', playerId: 'player_dev', npcId: 'actor_dev', name: 'Dev Empire', avatar: 'dev', gender: 'MALE', generation: 2,
            ageAtSuccession: 72, successionAbsoluteWeek: 1000, health: 44, fame: 82, talent: 80, ambition: 22, selectivity: 88, familyLoyalty: 75,
            status: 'RETIRED', currentProjectIds: [], completedProjectIds: ['project_old'], lastDecisionAbsoluteWeek: 1180, nextDecisionAbsoluteWeek: 1180, retiredAtAbsoluteWeek: 1180,
            history: [{ id: 'retired', type: 'RETIRED', absoluteWeek: 1180, title: 'Dev Empire retires from acting', detail: 'Personal choice.' }],
        },
        actor_mira: {
            id: 'actor_mira', playerId: 'player_mira', npcId: 'actor_mira', name: 'Mira Empire', avatar: 'mira', gender: 'FEMALE', generation: 3,
            ageAtSuccession: 80, successionAbsoluteWeek: 1000, health: 0, fame: 87, talent: 84, ambition: 40, selectivity: 80, familyLoyalty: 82,
            status: 'DECEASED', currentProjectIds: [], completedProjectIds: ['project_final'], lastDecisionAbsoluteWeek: 1100, nextDecisionAbsoluteWeek: 1100,
            diedAtAbsoluteWeek: 1104, deathCause: 'Age-related health complications',
            history: [{ id: 'died', type: 'DIED', absoluteWeek: 1104, title: 'Mira Empire dies at age 82', detail: 'A long career.' }],
        },
    },
};
player.flags.dynastyCareerArchives = {
    actor_asha: { parent: { actorId: 'actor_asha', name: 'Asha Empire' }, pastProjects: [{ id: 'asha_film' }], activeReleases: [], awards: [] },
    actor_dev: { parent: { actorId: 'actor_dev', name: 'Dev Empire' }, pastProjects: [{ id: 'dev_film' }], activeReleases: [], awards: [] },
};
player.world.industryProductions = {
    production_horizon: {
        id: 'production_horizon', canonicalProjectId: 'project_horizon', title: 'The Last Horizon', projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: 'LIONSGATE', status: 'PRODUCTION',
        productionCalendar: { preProductionWeeks: 2, productionWeeks: 8, postProductionWeeks: 4, totalWeeks: 14, focusWindowWeeks: 10, elapsedWeeks: 4, startedAbsoluteWeek: 1196 },
        budgetMillions: 70, paidMillions: 20, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Story Department', writerSkill: 78,
        createdAtAbsoluteWeek: 1196, updatedAtAbsoluteWeek: 1200,
    },
};

const Panel = (socialPage as any).DynastyCareerLegacyPanel;
const markup = renderToStaticMarkup(<Panel player={player} />);
assert.match(markup, /Family careers/);
assert.match(markup, /Asha Empire/);
assert.match(markup, /Working/);
assert.match(markup, /The Last Horizon/);
assert.match(markup, /Dev Empire/);
assert.match(markup, /Retired/);
assert.match(markup, /Mira Empire/);
assert.match(markup, /Age 82 at final record/, 'a deceased relative must stop ageing after their recorded death week');

const archives = (dynastyCareer as any).getDynastyCareerArchives(player);
assert.deepEqual(archives.map((archive: any) => archive.parent.name), ['Asha Empire', 'Dev Empire'], 'both ancestor archives should remain independently retrievable');

console.log('Dynasty career UI audit passed.');
