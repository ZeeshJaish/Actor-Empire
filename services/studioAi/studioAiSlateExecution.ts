import type {
    IndustryContentFingerprint,
    IndustryIntelligenceProposal,
    NPCStudioState,
    Player,
    StudioAiSlateCommitment,
    WorldState,
} from '../../types';
import { reviewStudioSlateCommitment } from './studioAiGreenlight';
import { applyStudioAiDevelopmentTransaction, admitStudioContentProposal } from './studioAiSlateAdmission';
import { appendStudioAiSlateKey } from './studioAiSlateState';
import { attachNormalizedStudioAiState } from './studioAiState';
import { adoptStudioIndustryCommissions } from './studioAiCommissionBridge';

interface ExecuteStudioAiSlateWeekInput {
    player: Player;
    world: WorldState;
    studio: NPCStudioState;
    absoluteWeek: number;
}

export interface ExecuteStudioAiSlateWeekResult {
    studio: NPCStudioState;
    admittedCount: number;
    reviewedCount: number;
    rejectedCount: number;
}

const TERMINAL = new Set(['DORMANT', 'SOLD_MERGED', 'CLOSED']);
const REVIEWABLE = new Set(['DEVELOPING', 'REWRITE', 'ON_HOLD']);

const updateProposalStatus = (
    studio: NPCStudioState,
    proposalId: string,
    status: IndustryIntelligenceProposal['status'],
): NPCStudioState => ({
    ...studio,
    ai: studio.ai?.intelligence ? {
        ...studio.ai,
        intelligence: {
            ...studio.ai.intelligence,
            proposals: studio.ai.intelligence.proposals.map(item => item.id === proposalId ? { ...item, status } : item),
        },
    } : studio.ai,
});

const updateFingerprintLifecycle = (
    studio: NPCStudioState,
    fingerprintId: string,
    lifecycle: IndustryContentFingerprint['lifecycle'],
): NPCStudioState => ({
    ...studio,
    ai: studio.ai?.intelligence ? {
        ...studio.ai,
        intelligence: {
            ...studio.ai.intelligence,
            content: {
                ...studio.ai.intelligence.content,
                selectedFingerprints: studio.ai.intelligence.content.selectedFingerprints.map(item => (
                    item.id === fingerprintId ? { ...item, lifecycle } : item
                )),
            },
        },
    } : studio.ai,
});

const findFingerprint = (studio: NPCStudioState, fingerprintId: string): IndustryContentFingerprint | undefined => (
    studio.ai?.intelligence?.content.selectedFingerprints.find(item => item.id === fingerprintId)
);

const restoreProposal = (studio: NPCStudioState, commitment: StudioAiSlateCommitment): IndustryIntelligenceProposal | undefined => {
    const current = studio.ai?.intelligence?.proposals.find(item => item.id === commitment.proposalId);
    if (current) return current;
    const snapshot = commitment.proposalSnapshot;
    if (!snapshot) return undefined;
    return {
        id: commitment.proposalId,
        idempotencyKey: commitment.proposalKey,
        companyId: studio.id,
        companyKind: 'PRODUCTION_STUDIO',
        lane: 'CONTENT_STRATEGY',
        decisionCycle: 0,
        absoluteWeek: commitment.createdAtAbsoluteWeek,
        actionFamily: 'DEVELOP_CONTENT',
        optionId: 'RESTORED_COMMITMENT',
        urgency: snapshot.score.need,
        confidence: snapshot.confidence,
        expectedExposureMillions: commitment.proposedBudgetMillions,
        affordabilityCeilingMillions: snapshot.affordabilityCeilingMillions,
        score: { ...snapshot.score },
        reasonCodes: ['STRATEGIC_NEED'],
        uncertaintyKey: snapshot.uncertaintyKey,
        contentFingerprintId: commitment.fingerprintId,
        status: 'EXECUTED',
        nextReviewAbsoluteWeek: commitment.nextReviewAbsoluteWeek || commitment.updatedAtAbsoluteWeek,
    };
};

export const executeStudioAiSlateWeek = (input: ExecuteStudioAiSlateWeekInput): ExecuteStudioAiSlateWeekResult => {
    let studio = attachNormalizedStudioAiState(input.studio, { absoluteWeek: input.absoluteWeek });
    if (studio.ai!.controller !== 'AI' || TERMINAL.has(studio.ai!.status)) {
        return { studio: input.studio, admittedCount: 0, reviewedCount: 0, rejectedCount: 0 };
    }
    studio = adoptStudioIndustryCommissions({ world: input.world, studio, absoluteWeek: input.absoluteWeek }).studio;
    let admittedCount = 0;
    let reviewedCount = 0;
    let rejectedCount = 0;
    const activationWeek = studio.ai!.slate!.activatedAtAbsoluteWeek;
    const proposals = (studio.ai!.intelligence?.proposals || [])
        .filter(item => item.lane === 'CONTENT_STRATEGY'
            && item.absoluteWeek >= activationWeek
            && !studio.ai!.slate!.processedProposalKeys.includes(item.idempotencyKey))
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id));

    proposals.forEach(proposal => {
        const fingerprint = proposal.contentFingerprintId ? findFingerprint(studio, proposal.contentFingerprintId) : undefined;
        const admission = admitStudioContentProposal({ studio, proposal, fingerprint, absoluteWeek: input.absoluteWeek });
        const slate = studio.ai!.slate!;
        studio = {
            ...studio,
            ai: {
                ...studio.ai!,
                slate: {
                    ...slate,
                    commitments: admission.commitment ? [...slate.commitments, admission.commitment] : slate.commitments,
                    processedProposalKeys: appendStudioAiSlateKey(slate.processedProposalKeys, proposal.idempotencyKey),
                },
            },
        };
        if (admission.accepted && admission.commitment && admission.transaction) {
            admittedCount += 1;
            studio = updateProposalStatus(studio, proposal.id, 'EXECUTED');
            studio = updateFingerprintLifecycle(studio, admission.commitment.fingerprintId, 'COMMITTED');
            studio = applyStudioAiDevelopmentTransaction(studio, admission.transaction);
        } else {
            rejectedCount += 1;
            studio = updateProposalStatus(studio, proposal.id, proposal.actionFamily === 'HOLD' ? 'ACCEPTED' : 'REJECTED');
            if (fingerprint) studio = updateFingerprintLifecycle(studio, fingerprint.id, 'ABANDONED');
        }
        studio = attachNormalizedStudioAiState(studio, { absoluteWeek: input.absoluteWeek });
    });

    const dueCommitmentIds = studio.ai!.slate!.commitments
        .filter(item => REVIEWABLE.has(item.status)
            && item.nextReviewAbsoluteWeek !== null
            && item.nextReviewAbsoluteWeek <= input.absoluteWeek)
        .map(item => item.id);

    dueCommitmentIds.forEach(commitmentId => {
        const commitment = studio.ai!.slate!.commitments.find(item => item.id === commitmentId);
        if (!commitment) return;
        const reviewKey = `b5-review:${commitment.id}:${commitment.nextReviewAbsoluteWeek}:${commitment.rewriteCount}`;
        if (studio.ai!.slate!.processedReviewKeys.includes(reviewKey)) return;
        const fingerprint = findFingerprint(studio, commitment.fingerprintId);
        const proposal = restoreProposal(studio, commitment);
        if (!fingerprint || !proposal) {
            studio = {
                ...studio,
                ai: {
                    ...studio.ai!,
                    slate: {
                        ...studio.ai!.slate!,
                        commitments: studio.ai!.slate!.commitments.map(item => item.id === commitment.id
                            ? { ...item, status: 'CANCELLED', updatedAtAbsoluteWeek: input.absoluteWeek, nextReviewAbsoluteWeek: null }
                            : item),
                        processedReviewKeys: appendStudioAiSlateKey(studio.ai!.slate!.processedReviewKeys, reviewKey),
                    },
                },
            };
            reviewedCount += 1;
            return;
        }
        const review = reviewStudioSlateCommitment({ studio, commitment, fingerprint, proposal, absoluteWeek: input.absoluteWeek });
        if (!review.reviewed) return;
        const becameGreenlit = commitment.status !== 'GREENLIT' && review.commitment.status === 'GREENLIT';
        studio = {
            ...studio,
            ai: {
                ...studio.ai!,
                finance: {
                    ...studio.ai!.finance,
                    committedSpendMillions: becameGreenlit
                        ? Math.round((studio.ai!.finance.committedSpendMillions + (review.commitment.greenlightBudgetMillions || 0)) * 1000) / 1000
                        : studio.ai!.finance.committedSpendMillions,
                },
                slate: {
                    ...studio.ai!.slate!,
                    commitments: studio.ai!.slate!.commitments.map(item => item.id === commitment.id ? review.commitment : item),
                    processedReviewKeys: appendStudioAiSlateKey(studio.ai!.slate!.processedReviewKeys, reviewKey),
                },
            },
        };
        if (review.transaction) studio = applyStudioAiDevelopmentTransaction(studio, review.transaction);
        if (review.commitment.status === 'ABANDONED' || review.commitment.status === 'CANCELLED') {
            studio = updateFingerprintLifecycle(studio, commitment.fingerprintId, review.commitment.status);
        }
        reviewedCount += 1;
        studio = attachNormalizedStudioAiState(studio, { absoluteWeek: input.absoluteWeek });
    });

    return { studio, admittedCount, reviewedCount, rejectedCount };
};
