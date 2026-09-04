import type { IndustryContentFingerprint, IndustryUniverseBlueprint, StudioId, Universe } from '../../types';
import { createDeterministicId, hashDeterministicSeed } from '../deterministicRandom';

export type IndustryContentMaterializationBoundary =
    | 'PRIVATE_SELECTION'
    | 'PUBLIC_ANNOUNCEMENT'
    | 'TALENT_ATTACHMENT'
    | 'PLAYER_INTERACTION'
    | 'RIGHTS_TRANSACTION'
    | 'PRODUCTION_COMMITMENT'
    | 'RELEASE_SCHEDULING'
    | 'PERMANENT_HISTORY'
    | 'OWNERSHIP_TRANSFER';

export interface IndustryContentMaterializationEligibility {
    eligible: boolean;
    boundary: IndustryContentMaterializationBoundary;
    reason: 'MISSING_ELIGIBLE_SOURCE_RIGHT' | null;
}

const EXTERNAL_SOURCE_INTENTS = new Set(['LICENSED_WORK', 'ACQUIRED_IP']);

export const evaluateIndustryContentMaterialization = (input: {
    fingerprint: IndustryContentFingerprint;
    boundary: IndustryContentMaterializationBoundary;
    sourceRightsEligible: boolean;
}): IndustryContentMaterializationEligibility => {
    if (input.boundary !== 'PRIVATE_SELECTION' && EXTERNAL_SOURCE_INTENTS.has(input.fingerprint.sourceIntent)
        && (!input.sourceRightsEligible || !input.fingerprint.sourceRightId)) {
        return { eligible: false, boundary: input.boundary, reason: 'MISSING_ELIGIBLE_SOURCE_RIGHT' };
    }
    return { eligible: true, boundary: input.boundary, reason: null };
};

const TITLE_LEADS = ['Ashes', 'Crown', 'Echo', 'Frontier', 'Legacy', 'Signal', 'Shadow', 'Glass', 'Last', 'Silent'];
const TITLE_ENDS = ['Protocol', 'City', 'Horizon', 'Empire', 'Orbit', 'Witness', 'Dynasty', 'Season', 'Accord', 'Reckoning'];

export interface IndustryContentMaterializationDraft {
    projectId: string;
    fingerprintId: string;
    ownerCompanyId: string;
    ownerCompanyKind: IndustryContentFingerprint['ownerCompanyKind'];
    title: string;
    presentationSeed: string;
    format: IndustryContentFingerprint['format'];
    primaryGenre: IndustryContentFingerprint['primaryGenre'];
    lifecycle: 'DRAFT';
    resolvedFacts: {
        sourceIntent: IndustryContentFingerprint['sourceIntent'];
        relationship: IndustryContentFingerprint['relationship'];
        originalLanguage: string;
        priorityMarket: string;
        budgetSuitability: IndustryContentFingerprint['budgetSuitability'];
    };
}

export const createIndustryContentMaterializationDraft = (input: {
    fingerprint: IndustryContentFingerprint;
    eligibility: IndustryContentMaterializationEligibility;
}): IndustryContentMaterializationDraft => {
    if (!input.eligibility.eligible) throw new Error(input.eligibility.reason || 'Content materialization is not eligible.');
    const { fingerprint } = input;
    const titleHash = hashDeterministicSeed(`${fingerprint.seed}:title`);
    const title = `${TITLE_LEADS[titleHash % TITLE_LEADS.length]} ${TITLE_ENDS[Math.floor(titleHash / TITLE_LEADS.length) % TITLE_ENDS.length]}`;
    return {
        projectId: fingerprint.canonicalProjectId || createDeterministicId('industry_project', fingerprint.id),
        fingerprintId: fingerprint.id,
        ownerCompanyId: fingerprint.ownerCompanyId,
        ownerCompanyKind: fingerprint.ownerCompanyKind,
        title,
        presentationSeed: createDeterministicId('industry_presentation', fingerprint.seed),
        format: fingerprint.format,
        primaryGenre: fingerprint.primaryGenre,
        lifecycle: 'DRAFT',
        resolvedFacts: {
            sourceIntent: fingerprint.sourceIntent,
            relationship: fingerprint.relationship,
            originalLanguage: fingerprint.originalLanguage,
            priorityMarket: fingerprint.priorityMarket,
            budgetSuitability: { ...fingerprint.budgetSuitability },
        },
    };
};

export const createCanonicalUniverseDraft = (input: {
    blueprint: IndustryUniverseBlueprint;
    fingerprint: IndustryContentFingerprint;
    studioId: StudioId;
    sourceRightsEligible: boolean;
    existingCanonicalUniverseId?: string;
}): Universe => {
    if (input.blueprint.anchorFingerprintId !== input.fingerprint.id) throw new Error('Universe anchor does not match the fingerprint.');
    const eligibility = evaluateIndustryContentMaterialization({
        fingerprint: input.fingerprint,
        boundary: 'PUBLIC_ANNOUNCEMENT',
        sourceRightsEligible: input.sourceRightsEligible,
    });
    if (!eligibility.eligible) throw new Error('Universe materialization requires an eligible source right.');
    const colorHash = hashDeterministicSeed(`${input.blueprint.seed}:color`);
    const color = `#${(colorHash & 0xffffff).toString(16).padStart(6, '0')}`;
    const project = createIndustryContentMaterializationDraft({
        fingerprint: input.fingerprint,
        eligibility,
    });
    return {
        id: input.existingCanonicalUniverseId || input.blueprint.canonicalUniverseId || createDeterministicId('universe', input.blueprint.id),
        name: `${project.title} Universe`,
        description: `${input.blueprint.creativePillars.join(', ')} stories rooted in ${input.fingerprint.setting.toLowerCase().replaceAll('_', ' ')}.`,
        studioId: input.studioId,
        ownerCompanyId: input.blueprint.ownerCompanyId,
        ownerCompanyKind: input.blueprint.ownerCompanyKind,
        blueprintId: input.blueprint.id,
        originFingerprintId: input.fingerprint.id,
        currentPhase: input.blueprint.currentPhaseLabel,
        saga: input.blueprint.currentSagaLabel,
        currentSagaName: input.blueprint.currentSagaLabel,
        currentPhaseName: input.blueprint.currentPhaseLabel,
        momentum: input.blueprint.momentum,
        brandPower: Math.round((input.blueprint.confidence + input.blueprint.financialScale) / 2),
        marketShare: 0,
        color,
        roster: [],
        slate: [],
        weeksUntilNextPhase: input.blueprint.plannedCadenceWeeks,
        status: 'ACTIVE',
    };
};
