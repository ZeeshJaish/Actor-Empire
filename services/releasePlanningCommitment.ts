import type { ReleasePlanningDraft } from '../types';

export const isReleaseDistributionLocked = (draft?: ReleasePlanningDraft | null): boolean => (
    draft?.commitmentState === 'SIGNED'
    && draft.releaseType === 'STREAMING_ONLY'
    && Boolean(draft.selectedStreamingContractIds?.length)
);

export const getReleaseWizardEntryStep = (
    draft: ReleasePlanningDraft | null | undefined,
    fallbackStep: number,
): number => {
    const savedStep = Math.max(1, Math.round(Number(draft?.step) || fallbackStep));
    return isReleaseDistributionLocked(draft) ? Math.max(3, savedStep) : savedStep;
};

export const getReleasePlanningCtaLabel = (draft?: ReleasePlanningDraft | null): string => {
    if (!draft) return 'Plan Release';
    return isReleaseDistributionLocked(draft) ? 'Continue Signed Launch' : 'Continue Release Plan';
};
