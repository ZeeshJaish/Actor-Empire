import type { IndustryContentFingerprint, IndustryIntelligenceProposal, IndustryIntelligenceState, WorldState } from '../../types';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';
import { generateIndustryContentCandidates } from './industryContentGenerator';
import { selectIndustryContentCandidate } from './industryContentNovelty';
import { createIndustryUniverseBlueprint, evaluateIndustryUniverseBlueprint } from './industryUniverseBlueprint';
import {
    INDUSTRY_CONTENT_BLUEPRINT_LIMIT,
    INDUSTRY_CONTENT_FINGERPRINT_LIMIT,
    INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT,
    INDUSTRY_CONTENT_NOVELTY_SIGNATURE_LIMIT,
    compactIndustryContentFingerprints,
} from './industryIntelligenceState';

export interface ProcessIndustryContentShadowSelectionInput {
    context: IndustryIntelligenceContext;
    state: IndustryIntelligenceState;
    proposal: IndustryIntelligenceProposal;
    globalRecentFingerprints: IndustryContentFingerprint[];
}

export interface ProcessIndustryContentShadowSelectionResult {
    state: IndustryIntelligenceState;
    changed: boolean;
    selectedFingerprint: IndustryContentFingerprint | null;
}

const TERMINAL_STATUSES = new Set(['CLOSED', 'SOLD_MERGED', 'DORMANT']);

export const processIndustryContentShadowSelection = (
    input: ProcessIndustryContentShadowSelectionInput,
): ProcessIndustryContentShadowSelectionResult => {
    const selectionKey = `content_selection:${input.proposal.id}`;
    if (input.context.controller !== 'AI' || TERMINAL_STATUSES.has(input.context.status)
        || input.proposal.lane !== 'CONTENT_STRATEGY' || input.proposal.actionFamily !== 'DEVELOP_CONTENT'
        || input.state.content.materializationKeys.includes(selectionKey)) {
        return { state: input.state, changed: false, selectedFingerprint: null };
    }
    const generationContext: IndustryIntelligenceContext = {
        ...input.context,
        decisionCycleByLane: { ...input.context.decisionCycleByLane, CONTENT_STRATEGY: input.proposal.decisionCycle },
    };
    const candidates = generateIndustryContentCandidates({
        context: generationContext,
        proposalId: input.proposal.id,
        affordabilityCeilingMillions: input.proposal.affordabilityCeilingMillions,
    });
    let selected = selectIndustryContentCandidate(candidates, {
        companyRecent: input.state.content.selectedFingerprints,
        globalRecent: input.globalRecentFingerprints.filter(item => item.ownerCompanyId !== input.state.companyId),
        currentAbsoluteWeek: input.context.absoluteWeek,
        franchiseFatigue: input.context.condition.franchiseFatigue,
    });
    if (!selected) {
        return {
            state: {
                ...input.state,
                content: {
                    ...input.state.content,
                    materializationKeys: [...input.state.content.materializationKeys, selectionKey].slice(-INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT),
                },
            },
            changed: true,
            selectedFingerprint: null,
        };
    }
    let blueprints = input.state.content.universeBlueprints;
    if (selected.relationship === 'FOUND_UNIVERSE') {
        const evaluation = evaluateIndustryUniverseBlueprint({
            context: generationContext,
            fingerprint: selected,
            compatibleSuccessfulFingerprints: input.state.content.selectedFingerprints.filter(item => (
                item.lifecycle === 'MATERIALIZED' && (item.primaryGenre === selected!.primaryGenre || item.theme === selected!.theme)
            )),
            existingBlueprints: blueprints,
        });
        if (evaluation.eligible) {
            const blueprint = createIndustryUniverseBlueprint({ evaluation, context: generationContext, fingerprint: selected });
            selected = { ...selected, universeBlueprintId: blueprint.id };
            blueprints = [...blueprints.filter(item => item.id !== blueprint.id), blueprint].slice(-INDUSTRY_CONTENT_BLUEPRINT_LIMIT);
        }
    }
    const content = {
        selectedFingerprints: compactIndustryContentFingerprints([
            ...input.state.content.selectedFingerprints.filter(item => item.id !== selected!.id),
            selected,
        ], INDUSTRY_CONTENT_FINGERPRINT_LIMIT),
        universeBlueprints: blueprints,
        recentNoveltySignatures: [...input.state.content.recentNoveltySignatures.filter(item => item !== selected!.noveltySignature), selected.noveltySignature]
            .slice(-INDUSTRY_CONTENT_NOVELTY_SIGNATURE_LIMIT),
        materializationKeys: [...input.state.content.materializationKeys.filter(item => item !== selectionKey), selectionKey]
            .slice(-INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT),
    };
    return { state: { ...input.state, content }, changed: true, selectedFingerprint: selected };
};

export const collectIndustryContentGlobalRecent = (
    world: WorldState,
    excludingCompanyId?: string,
): IndustryContentFingerprint[] => {
    const studios = Object.values(world.studios || {}).flatMap(studio => studio.ai?.intelligence?.content.selectedFingerprints || []);
    const platforms = Object.values(world.platforms || {}).flatMap(platform => platform.ai?.intelligence?.content.selectedFingerprints || []);
    const ecosystemOperators = Object.values(world.streamingPlatformEcosystem?.operators || {}).flatMap(operator => (
        operator.intelligence?.content.selectedFingerprints || []
    ));
    return [...studios, ...platforms, ...ecosystemOperators]
        .filter(item => item.ownerCompanyId !== excludingCompanyId)
        .sort((left, right) => right.createdAtAbsoluteWeek - left.createdAtAbsoluteWeek || left.id.localeCompare(right.id))
        .slice(0, 96);
};
