import type { IndustryContentFingerprint } from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';
import { createIndustryBudgetSuitability } from './industryBudgetSuitability';
import {
    INDUSTRY_CONTENT_AUDIENCES, INDUSTRY_CONTENT_FORMATS, INDUSTRY_CONTENT_GENRES, INDUSTRY_CONTENT_LANGUAGES,
    INDUSTRY_CONTENT_MARKETS, INDUSTRY_CONTENT_PERIODS, INDUSTRY_CONTENT_RELEASE_PATHS, INDUSTRY_CONTENT_RELATIONSHIPS,
    INDUSTRY_CONTENT_SETTINGS, INDUSTRY_CONTENT_SOURCE_INTENTS, INDUSTRY_CONTENT_SUBGENRES, INDUSTRY_CONTENT_THEMES,
    INDUSTRY_CONTENT_TONES,
} from './industryContentVocabulary';

export interface GenerateIndustryContentCandidatesInput {
    context: IndustryIntelligenceContext;
    proposalId: string;
    affordabilityCeilingMillions: number;
}

const pick = <T>(values: readonly T[], rng: () => number, offset = 0): T => values[(Math.floor(rng() * values.length) + offset) % values.length];
const bounded = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const generateIndustryContentCandidates = (
    input: GenerateIndustryContentCandidatesInput,
): IndustryContentFingerprint[] => Array.from({ length: 6 }, (_, candidateIndex) => {
    const { context } = input;
    const decisionCycle = context.decisionCycleByLane.CONTENT_STRATEGY;
    const seed = `${context.seed}:${context.companyId}:${input.proposalId}:${decisionCycle}:${candidateIndex}`;
    const rng = createDeterministicRng(seed);
    const format = pick(INDUSTRY_CONTENT_FORMATS, rng);
    const primaryGenre = pick(INDUSTRY_CONTENT_GENRES, rng, candidateIndex);
    let secondaryGenre = pick(INDUSTRY_CONTENT_GENRES, rng, candidateIndex + 3);
    if (secondaryGenre === primaryGenre) secondaryGenre = INDUSTRY_CONTENT_GENRES[(INDUSTRY_CONTENT_GENRES.indexOf(primaryGenre) + 1) % INDUSTRY_CONTENT_GENRES.length];
    const subgenre = pick(INDUSTRY_CONTENT_SUBGENRES, rng, candidateIndex);
    const tone = pick(INDUSTRY_CONTENT_TONES, rng, candidateIndex);
    const theme = pick(INDUSTRY_CONTENT_THEMES, rng, candidateIndex * 2);
    const setting = pick(INDUSTRY_CONTENT_SETTINGS, rng, candidateIndex * 3);
    const period = pick(INDUSTRY_CONTENT_PERIODS, rng, candidateIndex);
    const targetAudience = pick(INDUSTRY_CONTENT_AUDIENCES, rng, candidateIndex);
    const originalLanguage = pick(INDUSTRY_CONTENT_LANGUAGES, rng, candidateIndex);
    const priorityMarket = pick(INDUSTRY_CONTENT_MARKETS, rng, candidateIndex);
    const releasePath = context.companyKind === 'STREAMING_PLATFORM'
        ? pick(['STREAMING_FIRST', 'HYBRID', 'LIMITED_EVENT'] as const, rng)
        : pick(INDUSTRY_CONTENT_RELEASE_PATHS, rng);
    const sourcePool = context.companyKind === 'STREAMING_PLATFORM'
        ? ['PLATFORM_ORIGINAL', 'INDIVIDUAL_COMMISSION', 'LICENSED_WORK', 'ACQUIRED_IP', 'ORIGINAL'] as const
        : ['ORIGINAL', 'INTERNAL_DEVELOPMENT', 'INDIVIDUAL_COMMISSION', 'ACQUIRED_IP'] as const;
    const sourceIntent = pick(sourcePool, rng, candidateIndex);
    const franchiseRoll = rng() * 100;
    const relationship = franchiseRoll < context.identity.franchiseAppetite * 0.08
        ? pick(INDUSTRY_CONTENT_RELATIONSHIPS.filter(value => value !== 'STANDALONE'), rng, candidateIndex)
        : 'STANDALONE';
    const commercialIntent = bounded(context.identity.commercialIntent * 0.7 + rng() * 30);
    const prestigeIntent = bounded(context.identity.prestigeIntent * 0.7 + rng() * 30);
    const creativeRisk = bounded(context.identity.riskTolerance * 0.65 + rng() * 35);
    const starPowerTarget = bounded(context.identity.scale * 0.55 + commercialIntent * 0.25 + rng() * 20);
    const budgetSuitability = createIndustryBudgetSuitability({ format, primaryGenre, creativeRisk, starPowerTarget, commercialIntent, affordabilityCeilingMillions: input.affordabilityCeilingMillions });
    const noveltySignature = [format, primaryGenre, secondaryGenre, subgenre, tone, theme, setting, period, targetAudience, originalLanguage, relationship].join('|');
    return {
        id: createDeterministicId('industry_content_fingerprint', seed), seed,
        ownerCompanyId: context.companyId, ownerCompanyKind: context.companyKind, format, primaryGenre, secondaryGenre,
        subgenre, tone, theme, setting, period, targetAudience, originalLanguage, priorityMarket,
        commercialIntent, prestigeIntent, creativeRisk, starPowerTarget, releasePath,
        sourceIntent: INDUSTRY_CONTENT_SOURCE_INTENTS.includes(sourceIntent) ? sourceIntent : 'ORIGINAL', relationship,
        budgetSuitability,
        noveltySignature, noveltyScore: 50, createdAtAbsoluteWeek: context.absoluteWeek, decisionCycle, lifecycle: 'SELECTED',
    };
});
