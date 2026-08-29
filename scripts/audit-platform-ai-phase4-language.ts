import assert from 'node:assert/strict';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import {
    STREAMING_LANGUAGE_PACKAGES,
    STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS,
    resolveStreamingLocalizationTiers,
} from '../services/streamingLocalizationCapabilities';
import {
    resolvePlatformAiLocalizationModeSupport,
    resolvePlatformAiTitleCountryComprehension,
} from '../services/platformAi/platformAiLanguageCapabilities';

const absoluteWeek = 1_200;
const player = createPlatformAiFixture();
const world = normalizeWorldPlatformAi(player, player.world, absoluteWeek);
const ai = structuredClone(world.platforms!.NETFLIX.ai!);
ai.languageCapabilities = [{
    languageId: 'hindi',
    subtitleLevel: 2,
    dubbingLevel: 0,
    source: 'LANGUAGE_PACKAGE',
    sourceReferenceId: 'audit-package',
    activatedAtAbsoluteWeek: absoluteWeek,
}];

assert.equal(STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.length, 8);
assert.ok(STREAMING_LANGUAGE_PACKAGES.length > 0);
assert.deepEqual(
    resolveStreamingLocalizationTiers(['LOCALIZATION_FOUNDATION', 'SUBTITLE_OPERATIONS_L1', 'SUBTITLE_OPERATIONS_L2']),
    { subtitleLevel: 2, dubbingLevel: 0, simultaneousLocalization: false },
);
assert.equal(resolvePlatformAiLocalizationModeSupport(ai, 'Hindi', 'SUBTITLE').supported, true);
assert.equal(resolvePlatformAiLocalizationModeSupport(ai, 'hindi', 'DUB').supported, false);

const base = {
    ai,
    originalLanguageId: 'korean',
    countryId: 'IN',
    targetAudience: 'R' as const,
    genre: 'DRAMA' as const,
    assetLanguageId: 'hindi',
    localizationQuality: 82,
};
const native = resolvePlatformAiTitleCountryComprehension({ ...base, originalLanguageId: 'hindi', assetMode: null });
const dubbingAi = {
    ...ai,
    languageCapabilities: [{ ...ai.languageCapabilities[0], dubbingLevel: 2 as const }],
};
const dubbed = resolvePlatformAiTitleCountryComprehension({
    ...base,
    ai: dubbingAi,
    assetMode: 'DUB',
});
const subtitled = resolvePlatformAiTitleCountryComprehension({ ...base, assetMode: 'SUBTITLE' });
const none = resolvePlatformAiTitleCountryComprehension({ ...base, assetMode: null });
assert.ok(native.reachMultiplier >= dubbed.reachMultiplier);
assert.ok(dubbed.reachMultiplier > subtitled.reachMultiplier);
assert.ok(subtitled.reachMultiplier > none.reachMultiplier);

const familySubtitle = resolvePlatformAiTitleCountryComprehension({
    ...base,
    targetAudience: 'PG',
    genre: 'ANIMATION',
    assetMode: 'SUBTITLE',
});
assert.ok(subtitled.completionMultiplier > familySubtitle.completionMultiplier);
const lowQualityDub = resolvePlatformAiTitleCountryComprehension({
    ...base,
    ai: dubbingAi,
    assetMode: 'DUB',
    localizationQuality: 40,
});
assert.ok(dubbed.appreciationMultiplier > lowQualityDub.appreciationMultiplier);

console.log('Platform AI Phase 4 language-capability audit passed.');
