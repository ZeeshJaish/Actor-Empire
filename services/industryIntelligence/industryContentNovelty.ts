import type { IndustryContentFingerprint } from '../../types';

export interface IndustryContentNoveltyContext {
    companyRecent: IndustryContentFingerprint[];
    globalRecent: IndustryContentFingerprint[];
    currentAbsoluteWeek: number;
    franchiseFatigue: number;
}

export type IndustryContentNoveltyReason = 'EXACT_DUPLICATE' | 'NEAR_DUPLICATE' | 'MARKET_SATURATION' | 'CONTINUITY_FATIGUE';

export interface IndustryContentNoveltyScore {
    eligible: boolean;
    score: number;
    similarityPenalty: number;
    reasonCodes: IndustryContentNoveltyReason[];
}

const dimensions: Array<keyof IndustryContentFingerprint> = [
    'format', 'primaryGenre', 'secondaryGenre', 'subgenre', 'tone', 'theme', 'setting', 'period',
    'targetAudience', 'originalLanguage', 'releasePath',
];

const similarity = (left: IndustryContentFingerprint, right: IndustryContentFingerprint): number => (
    dimensions.reduce((sum, key) => sum + (left[key] === right[key] ? 1 : 0), 0) / dimensions.length
);
const bounded = (value: number): number => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
const recencyWeight = (age: number): number => Math.max(0.15, 1 - Math.max(0, age) / 156);
const isContinuity = (candidate: IndustryContentFingerprint): boolean => candidate.relationship !== 'STANDALONE';

export const scoreIndustryContentNovelty = (
    candidate: IndustryContentFingerprint,
    context: IndustryContentNoveltyContext,
): IndustryContentNoveltyScore => {
    const companyRecent = [...context.companyRecent].sort((a, b) => a.id.localeCompare(b.id));
    const globalRecent = [...context.globalRecent].sort((a, b) => a.id.localeCompare(b.id));
    if ([...companyRecent, ...globalRecent].some(item => item.noveltySignature === candidate.noveltySignature)) {
        return { eligible: false, score: 0, similarityPenalty: 100, reasonCodes: ['EXACT_DUPLICATE'] };
    }
    const companyPenalty = companyRecent.reduce((maximum, item) => Math.max(
        maximum,
        similarity(candidate, item) * 64 * recencyWeight(context.currentAbsoluteWeek - item.createdAtAbsoluteWeek),
    ), 0);
    const globalPenalty = globalRecent.reduce((maximum, item) => Math.max(
        maximum,
        similarity(candidate, item) * 26 * recencyWeight(context.currentAbsoluteWeek - item.createdAtAbsoluteWeek),
    ), 0);
    const continuityPenalty = isContinuity(candidate) ? Math.max(0, Math.min(100, context.franchiseFatigue)) * 0.28 : 0;
    const similarityPenalty = companyPenalty + globalPenalty + continuityPenalty;
    const strategicValue = (candidate.commercialIntent + candidate.prestigeIntent + candidate.creativeRisk * 0.35) / 2.35;
    const score = bounded(92 - similarityPenalty + strategicValue * 0.12);
    const reasonCodes: IndustryContentNoveltyReason[] = [];
    if (companyPenalty >= 38) reasonCodes.push('NEAR_DUPLICATE');
    if (globalPenalty >= 15) reasonCodes.push('MARKET_SATURATION');
    if (isContinuity(candidate) && context.franchiseFatigue > 0) reasonCodes.push('CONTINUITY_FATIGUE');
    return { eligible: true, score, similarityPenalty: bounded(similarityPenalty), reasonCodes };
};

export const selectIndustryContentCandidate = (
    candidates: IndustryContentFingerprint[],
    context: IndustryContentNoveltyContext,
): IndustryContentFingerprint | null => {
    const ranked = candidates.flatMap(candidate => {
        const novelty = scoreIndustryContentNovelty(candidate, context);
        return novelty.eligible ? [{ candidate, novelty }] : [];
    }).sort((left, right) => right.novelty.score - left.novelty.score || left.candidate.id.localeCompare(right.candidate.id));
    const selected = ranked[0];
    return selected ? { ...selected.candidate, noveltyScore: selected.novelty.score } : null;
};
