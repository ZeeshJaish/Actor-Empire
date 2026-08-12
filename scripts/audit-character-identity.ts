import assert from 'node:assert/strict';
import {
    applyOpportunityIdentityToProject,
    enrichAuditionOpportunity,
    inferStoryCompass,
    suggestCharacterIdentity,
} from '../services/characterIdentityLogic';
import { getActorCareerArc } from '../services/actorCareerArc';
import { AuditionOpportunity, Player, ProjectDetails } from '../types';

const villainScript = {
    genres: ['CRIME'],
    logline: 'A villain-led crime story about a feared antagonist taking control of the city.',
    isOriginal: true,
} as const;
const compass = inferStoryCompass(villainScript as any);
assert.equal(compass.perspective, 'VILLAIN_LED');
assert.equal(suggestCharacterIdentity(compass, 'LEAD', 0, villainScript as any).storyRole, 'VILLAIN');

const project: ProjectDetails = {
    title: 'City of Knives',
    type: 'MOVIE',
    description: villainScript.logline,
    studioId: 'INDIE' as any,
    subtype: 'STANDALONE',
    genre: 'CRIME',
    budgetTier: 'MID',
    estimatedBudget: 20_000_000,
    visibleHype: 'MID',
    hiddenStats: {
        scriptQuality: 75,
        directorQuality: 70,
        castingStrength: 70,
        distributionPower: 60,
        rawHype: 55,
        qualityScore: 72,
        prestigeBonus: 0,
    },
    directorName: 'A Director',
    visibleDirectorTier: 'Established',
    visibleScriptBuzz: 'Good',
    visibleCastStrength: 'Solid',
    storyCompass: compass,
};
const opportunity: AuditionOpportunity = {
    id: 'villain_offer',
    roleType: 'LEAD',
    projectName: project.title,
    genre: project.genre,
    config: { label: 'Lead', difficulty: 70, energyCost: 40, baseIncome: 10_000, expGain: 10 },
    project,
    estimatedIncome: 4_000_000,
    source: 'AGENT',
};
const player = {
    name: 'Zeesh',
    avatar: '',
    pastProjects: [],
} as unknown as Player;
const enriched = enrichAuditionOpportunity(opportunity, player);
assert.equal(enriched.characterProfile?.storyRole, 'VILLAIN');
assert.equal(enriched.roleFit?.label, 'AGAINST_TYPE');
const identifiedProject = applyOpportunityIdentityToProject(enriched, player);
assert.equal(identifiedProject.castList?.find(member => member.isPlayer)?.storyRole, 'VILLAIN');

const villainCareer = {
    stats: { fame: 15, reputation: 20, experience: 20 },
    age: 25,
    awards: [],
    pastProjects: [88, 82].map((performance, index) => ({
        id: `villain_${index}`,
        name: `Villain Credit ${index + 1}`,
        type: 'ACTING_GIG',
        roleType: 'LEAD',
        year: 24 + index,
        earnings: 1,
        rating: performance / 10,
        reception: 'FINISHED',
        projectQuality: performance,
        genre: 'CRIME',
        playerRolePerformance: performance,
        playerCharacterProfile: {
            storyFunction: 'ANTAGONIST',
            storyRole: 'VILLAIN',
            abilityType: 'NONE',
            nature: 'HUMAN',
            identitySource: 'PLAYER',
        },
    })),
} as unknown as Player;
assert.equal(getActorCareerArc(villainCareer).id, 'VILLAIN_ERA');

console.log('Character identity audit passed: story inference, offer persistence, and public career arc.');
