import type {
    Genre,
    PlatformId,
    PlatformAiReleaseEntry,
    PlatformAiReleaseReadinessSnapshot,
    PlatformAiPremiereSelectionReason,
    TargetAudience,
} from '../../types';
import { createDeterministicRng } from '../deterministicRandom';

export interface BuildReadyPlatformAiReleasePassportInput {
    evaluatedAtAbsoluteWeek: number;
    premiereAtAbsoluteWeek: number;
    releaseEntries: PlatformAiReleaseEntry[];
    rightsContractIds: string[];
    localizationReadyAtAbsoluteWeek: number;
    scheduledTitleCount: number;
    releaseCapacity: number;
}

/** Captures the evidence already validated by the canonical scheduler. */
export const buildReadyPlatformAiReleasePassport = (
    input: BuildReadyPlatformAiReleasePassportInput,
): PlatformAiReleaseReadinessSnapshot => ({
    evaluatedAtAbsoluteWeek: input.evaluatedAtAbsoluteWeek,
    premiereAtAbsoluteWeek: input.premiereAtAbsoluteWeek,
    latestRequiredAbsoluteWeek: Math.max(
        input.premiereAtAbsoluteWeek,
        ...input.releaseEntries.flatMap(entry => entry.installmentAbsoluteWeeks),
    ),
    ready: true,
    blockers: [],
    canonicalProjectIds: [...new Set(input.releaseEntries.map(entry => entry.canonicalProjectId))].sort(),
    rightsContractIds: [...new Set(input.rightsContractIds)].sort(),
    countryIds: [...new Set(input.releaseEntries.flatMap(entry => entry.countryIds))].sort(),
    localizationReadyAtAbsoluteWeek: input.localizationReadyAtAbsoluteWeek,
    scheduledTitleCount: input.scheduledTitleCount,
    releaseCapacity: input.releaseCapacity,
    selectionScore: null,
    selectionReasons: [],
});

export type PlatformAiPremiereReason = PlatformAiPremiereSelectionReason;

export interface PlatformAiPremiereCandidate {
    premiereAtAbsoluteWeek: number;
    latestRequiredAbsoluteWeek: number;
    rightsExpireAtAbsoluteWeek: number;
    scheduledTitleCount: number;
    sameGenreCount: number;
    sameAudienceCount: number;
}

export interface ChoosePlatformAiPremiereInput {
    playerId: string;
    platformId: PlatformId;
    planId: string;
    absoluteWeek: number;
    strategyCycle: number;
    strategySkill: number;
    genre: Genre;
    targetAudience: TargetAudience;
    commercialForecast: number;
    prestigeForecast: number;
    marketingReserveMillions: number;
    candidates: PlatformAiPremiereCandidate[];
}

export interface PlatformAiPremiereChoice extends PlatformAiPremiereCandidate {
    score: number;
    reasons: PlatformAiPremiereReason[];
}

const isAwardsPositioningWeek = (absoluteWeek: number): boolean => {
    const weekOfYear = ((Math.max(0, absoluteWeek) % 52) + 1);
    return weekOfYear >= 40 && weekOfYear <= 48;
};

/** Ranks only already-legal weeks; entitlement validation remains the scheduler's responsibility. */
export const choosePlatformAiPremiere = (
    input: ChoosePlatformAiPremiereInput,
): PlatformAiPremiereChoice | null => {
    const candidates = input.candidates.map(candidate => {
        const delayWeeks = Math.max(1, candidate.premiereAtAbsoluteWeek - input.absoluteWeek);
        const rightsMarginWeeks = candidate.rightsExpireAtAbsoluteWeek === Number.MAX_SAFE_INTEGER
            ? 52
            : candidate.rightsExpireAtAbsoluteWeek - candidate.latestRequiredAbsoluteWeek;
        const awardsPositioning = input.prestigeForecast >= 72 && isAwardsPositioningWeek(candidate.premiereAtAbsoluteWeek);
        const congestionPenalty = candidate.scheduledTitleCount * 4
            + candidate.sameGenreCount * 6
            + candidate.sameAudienceCount * 7;
        const expiryUrgency = rightsMarginWeeks <= 8 ? Math.max(0, 9 - rightsMarginWeeks) * 2.5 : 0;
        const judgementAmplitude = Math.max(0.35, 1.6 - (Math.max(7, Math.min(10, input.strategySkill)) - 7) * 0.35);
        const judgement = (createDeterministicRng([
            input.playerId,
            input.platformId,
            input.planId,
            input.strategyCycle,
            candidate.premiereAtAbsoluteWeek,
            'PREMIERE_SELECTION',
        ].join(':'))() * 2 - 1) * judgementAmplitude;
        const score = Math.round((
            input.commercialForecast * 0.08
            + input.prestigeForecast * 0.04
            + Math.min(8, input.marketingReserveMillions * 0.12)
            + (awardsPositioning ? input.prestigeForecast * 0.14 : 0)
            + expiryUrgency
            - delayWeeks * 0.4
            - congestionPenalty
            + judgement
        ) * 100) / 100;
        const reasons: PlatformAiPremiereReason[] = [];
        if (delayWeeks <= 2) reasons.push('EARLY_AVAILABILITY');
        if (expiryUrgency > 0) reasons.push('RIGHTS_EXPIRY_URGENCY');
        if (congestionPenalty === 0) reasons.push('LOW_CONGESTION');
        if (candidate.sameGenreCount > 0 || candidate.sameAudienceCount > 0) reasons.push('AVOID_SELF_CANNIBALIZATION');
        if (awardsPositioning) reasons.push('AWARDS_POSITIONING');
        return { ...candidate, score, reasons };
    });
    return candidates.sort((left, right) => (
        right.score - left.score
        || left.premiereAtAbsoluteWeek - right.premiereAtAbsoluteWeek
    ))[0] || null;
};
