import assert from 'node:assert/strict';
import {
    getReleasePlanningCtaLabel,
    getReleaseWizardEntryStep,
    isReleaseDistributionLocked,
} from '../services/releasePlanningCommitment';
import type { ReleasePlanningDraft } from '../types';

const draft: ReleasePlanningDraft = {
    step: 2,
    releaseType: 'STREAMING_ONLY',
    screeningStrategy: null,
    selectedRegionIds: [],
    distributionChainSelections: {},
    campaignPositioning: 'MASS_EVENT',
    campaignTimeline: 'BALANCED_ROLLOUT',
    channelAllocations: {},
    selectedPlatform: null,
    selectedStreamingPlatformIds: [],
    selectedStreamingContractIds: [],
    festivalPremiere: null,
    releaseWeek: 12,
    updatedAt: 1,
};

assert.equal(getReleasePlanningCtaLabel(undefined), 'Plan Release');
assert.equal(getReleasePlanningCtaLabel(draft), 'Continue Release Plan');
assert.equal(getReleaseWizardEntryStep(draft, 1), 2);
assert.equal(isReleaseDistributionLocked(draft), false);

const signedDraft: ReleasePlanningDraft = {
    ...draft,
    commitmentState: 'SIGNED',
    lockedPremiereAbsoluteWeek: 2_045,
    selectedStreamingContractIds: ['contract-1'],
};
assert.equal(isReleaseDistributionLocked(signedDraft), true);
assert.equal(getReleaseWizardEntryStep(signedDraft, 1), 3, 'a signed incomplete launch must reopen at Campaign');
assert.equal(getReleasePlanningCtaLabel(signedDraft), 'Continue Signed Launch');

console.log('Release planning commitment audit passed.');
