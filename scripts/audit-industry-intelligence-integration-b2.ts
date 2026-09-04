import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type WorldState } from '../types';
import { ensureStudioEcosystem } from '../services/studioEcosystem';
import { attachNormalizedStudioAiState, processStudioAiWeek } from '../services/studioAi';
import { normalizePlatformAiState, processPlatformAiWorldTurn } from '../services/platformAi';

const absoluteWeek = 1_390;

const canonicalWorldProjection = (world: WorldState): WorldState => {
    const projected = structuredClone(world);
    Object.values(projected.studios || {}).forEach(studio => {
        if (studio.ai) delete studio.ai.intelligence;
    });
    Object.values(projected.platforms || {}).forEach(platform => {
        if (platform.ai) delete platform.ai.intelligence;
    });
    return projected;
};

const studioPlayer = structuredClone(INITIAL_PLAYER);
const studioWorld = ensureStudioEcosystem(structuredClone(studioPlayer.world));
const studioId = 'WARNER_BROS';
studioWorld.studios![studioId] = attachNormalizedStudioAiState(studioWorld.studios![studioId], { absoluteWeek });
studioWorld.studios![studioId].ai!.intelligence!.nextDueAbsoluteWeek = {
    ...studioWorld.studios![studioId].ai!.intelligence!.nextDueAbsoluteWeek,
    FINANCE_REVIEW: absoluteWeek,
};
const studioWorldWithoutDueShadow = structuredClone(studioWorld);
studioWorldWithoutDueShadow.studios![studioId].ai!.intelligence!.nextDueAbsoluteWeek.FINANCE_REVIEW = absoluteWeek + 100;
const studioTurn = processStudioAiWeek({ ...studioPlayer, world: studioWorld }, studioWorld, absoluteWeek);
const studioTurnWithoutDueShadow = processStudioAiWeek(
    { ...studioPlayer, world: studioWorldWithoutDueShadow },
    studioWorldWithoutDueShadow,
    absoluteWeek,
);
const studioIntelligence = studioTurn.world.studios![studioId].ai!.intelligence!;
assert.ok(studioIntelligence.proposals.some(item => item.lane === 'FINANCE_REVIEW' && item.absoluteWeek === absoluteWeek));
assert.ok(studioIntelligence.shadowComparisons.some(item => item.lane === 'FINANCE_REVIEW' && item.absoluteWeek === absoluteWeek));
assert.equal(studioTurn.news.some(item => /shadow|intelligence/i.test(item.headline)), false, 'shadow work must not emit news');
assert.equal(studioTurn.socialPosts.some(item => /shadow|intelligence/i.test(item.content)), false, 'shadow work must not emit social posts');
assert.deepEqual(
    canonicalWorldProjection(studioTurn.world),
    canonicalWorldProjection(studioTurnWithoutDueShadow.world),
    'a due studio shadow lane must not alter canonical weekly outcomes',
);
assert.deepEqual(studioTurn.news, studioTurnWithoutDueShadow.news);
assert.deepEqual(studioTurn.socialPosts, studioTurnWithoutDueShadow.socialPosts);
assert.deepEqual(studioTurn.logs, studioTurnWithoutDueShadow.logs);

const studioReplay = processStudioAiWeek(
    { ...studioPlayer, world: studioTurn.world },
    studioTurn.world,
    absoluteWeek,
);
assert.deepEqual(studioReplay.world.studios![studioId], studioTurn.world.studios![studioId], 'same-week studio replay must be stable');

const platformPlayer = structuredClone(INITIAL_PLAYER);
const platformWorld = structuredClone(platformPlayer.world);
platformWorld.platforms!.NETFLIX = normalizePlatformAiState(
    platformWorld.platforms!.NETFLIX,
    platformPlayer.id,
    absoluteWeek,
);
platformWorld.platforms!.NETFLIX.ai!.intelligence!.nextDueAbsoluteWeek = {
    ...platformWorld.platforms!.NETFLIX.ai!.intelligence!.nextDueAbsoluteWeek,
    CAPABILITY_GROWTH: absoluteWeek,
};
platformWorld.platforms!.NETFLIX.ai!.lastProcessedAbsoluteWeek = absoluteWeek - 1;
const platformWorldWithoutDueShadow = structuredClone(platformWorld);
platformWorldWithoutDueShadow.platforms!.NETFLIX.ai!.intelligence!.nextDueAbsoluteWeek.CAPABILITY_GROWTH = absoluteWeek + 100;
const platformTurn = processPlatformAiWorldTurn(
    { ...platformPlayer, world: platformWorld },
    platformWorld,
    absoluteWeek,
);
const platformTurnWithoutDueShadow = processPlatformAiWorldTurn(
    { ...platformPlayer, world: platformWorldWithoutDueShadow },
    platformWorldWithoutDueShadow,
    absoluteWeek,
);
const platformIntelligence = platformTurn.world.platforms!.NETFLIX.ai!.intelligence!;
assert.ok(platformIntelligence.proposals.some(item => item.lane === 'CAPABILITY_GROWTH' && item.absoluteWeek === absoluteWeek));
assert.ok(platformIntelligence.shadowComparisons.some(item => item.lane === 'CAPABILITY_GROWTH' && item.absoluteWeek === absoluteWeek));
assert.equal(platformTurn.news.some(item => /shadow intelligence/i.test(item.headline)), false);
assert.equal(platformTurn.logs.some(item => /shadow intelligence/i.test(item)), false);
assert.deepEqual(
    canonicalWorldProjection(platformTurn.world),
    canonicalWorldProjection(platformTurnWithoutDueShadow.world),
    'a due platform shadow lane must not alter canonical weekly outcomes',
);
assert.deepEqual(platformTurn.news, platformTurnWithoutDueShadow.news);
assert.deepEqual(platformTurn.logs, platformTurnWithoutDueShadow.logs);

const acquiredPlayer = structuredClone(platformPlayer);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredWorld = structuredClone(platformWorld);
const acquiredBefore = structuredClone(acquiredWorld.platforms!.NETFLIX);
const acquiredTurn = processPlatformAiWorldTurn(
    { ...acquiredPlayer, world: acquiredWorld },
    acquiredWorld,
    absoluteWeek,
);
assert.deepEqual(acquiredTurn.world.platforms!.NETFLIX, acquiredBefore, 'acquired platforms must be skipped byte-for-byte by rival AI');

console.log('Industry Intelligence B2 weekly integration audit passed.');
