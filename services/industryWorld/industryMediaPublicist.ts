import type {
    IndustryEventImportance,
    IndustryMediaPrEffectVector,
    IndustryMediaPrIntervention,
    Player,
    TeamMember,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

const EMPTY_EFFECTS: IndustryMediaPrEffectVector = {
    reputation: 0,
    controversy: 0,
    followers: 0,
    projectBuzz: 0,
    mediaStance: 0,
    discussionHeat: 0,
    relationshipTension: 0,
    narrativeMomentum: 0,
};

const TIER_RULES: Record<TeamMember['tier'], { amplification: number; damageReduction: number; capacity: number }> = {
    ROOKIE: { amplification: 0.05, damageReduction: 0.10, capacity: 1 },
    STANDARD: { amplification: 0.12, damageReduction: 0.22, capacity: 2 },
    ELITE: { amplification: 0.20, damageReduction: 0.35, capacity: 3 },
    LEGEND: { amplification: 0.28, damageReduction: 0.45, capacity: 4 },
};
const IMPORTANCE_RANK: Record<IndustryEventImportance, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const POSITIVE_IS_BENEFICIAL = new Set<keyof IndustryMediaPrEffectVector>([
    'reputation', 'followers', 'projectBuzz', 'mediaStance', 'narrativeMomentum',
]);

const normalizeVector = (value: Partial<IndustryMediaPrEffectVector>): IndustryMediaPrEffectVector => ({
    ...EMPTY_EFFECTS,
    ...Object.fromEntries(Object.entries(EMPTY_EFFECTS).map(([key]) => {
        const numeric = Number(value[key as keyof IndustryMediaPrEffectVector]);
        return [key, Number.isFinite(numeric) ? Math.round(numeric) : 0];
    })),
});

const adjustValue = (
    key: keyof IndustryMediaPrEffectVector,
    raw: number,
    amplification: number,
    damageReduction: number,
): number => {
    if (raw === 0) return 0;
    const beneficial = POSITIVE_IS_BENEFICIAL.has(key) ? raw > 0 : raw < 0;
    const adjusted = raw * (beneficial ? 1 + amplification : 1 - damageReduction);
    const rounded = Math.round(adjusted);
    if (raw > 0) return Math.max(0, rounded);
    return Math.min(0, rounded);
};

export interface PublicistMediaModifierInput {
    key: string;
    absoluteWeek: number;
    importance: IndustryEventImportance;
    rawEffects: Partial<IndustryMediaPrEffectVector>;
    outcomeLabel?: string;
    sourceId?: string;
    projectId?: string;
}

export interface PublicistMediaModifierResult {
    key: string;
    player: Player;
    rawEffects: IndustryMediaPrEffectVector;
    appliedEffects: IndustryMediaPrEffectVector;
    intervention?: IndustryMediaPrIntervention;
    outcomeChanged: false;
}

export const applyPublicistMediaModifier = (
    player: Player,
    input: PublicistMediaModifierInput,
): PublicistMediaModifierResult => {
    const rawEffects = normalizeVector(input.rawEffects);
    const media = normalizeIndustryMediaWorld(player.world.industryMedia);
    const interventionKey = `publicist:${input.key}`;
    const existing = media.prInterventions.find(item => item.interventionKey === interventionKey);
    if (existing) {
        return {
            key: input.key,
            player,
            rawEffects: existing.rawEffects,
            appliedEffects: existing.appliedEffects,
            intervention: existing,
            outcomeChanged: false,
        };
    }
    const publicist = player.team?.publicist;
    if (!publicist) return { key: input.key, player, rawEffects, appliedEffects: rawEffects, outcomeChanged: false };
    const rules = TIER_RULES[publicist.tier];
    const used = media.prInterventions.filter(item => item.absoluteWeek === input.absoluteWeek).length;
    if (used >= rules.capacity) {
        return { key: input.key, player, rawEffects, appliedEffects: rawEffects, outcomeChanged: false };
    }
    const appliedEffects = Object.fromEntries(
        (Object.keys(rawEffects) as Array<keyof IndustryMediaPrEffectVector>).map(key => [
            key,
            adjustValue(key, rawEffects[key], rules.amplification, rules.damageReduction),
        ]),
    ) as unknown as IndustryMediaPrEffectVector;
    const changed = (Object.keys(rawEffects) as Array<keyof IndustryMediaPrEffectVector>)
        .some(key => rawEffects[key] !== appliedEffects[key]);
    if (!changed) return { key: input.key, player, rawEffects, appliedEffects: rawEffects, outcomeChanged: false };
    const preventedDamage = Math.max(0, rawEffects.controversy - appliedEffects.controversy)
        + Math.max(0, rawEffects.discussionHeat - appliedEffects.discussionHeat)
        + Math.max(0, appliedEffects.reputation - rawEffects.reputation);
    const amplifiedGain = Math.max(0, appliedEffects.reputation - rawEffects.reputation)
        + Math.max(0, appliedEffects.projectBuzz - rawEffects.projectBuzz)
        + Math.max(0, appliedEffects.mediaStance - rawEffects.mediaStance);
    const summary = preventedDamage > amplifiedGain
        ? `${publicist.name} contained part of the media damage; the underlying outcome did not change.`
        : `${publicist.name} amplified the favourable coverage; the underlying outcome did not change.`;
    const intervention: IndustryMediaPrIntervention = {
        schemaVersion: 1,
        id: createDeterministicId('industry_media_pr_intervention', interventionKey),
        interventionKey,
        absoluteWeek: Math.max(0, Math.round(input.absoluteWeek)),
        tier: publicist.tier,
        importance: input.importance,
        rawEffects,
        appliedEffects,
        ...(input.outcomeLabel ? { outcomeLabel: input.outcomeLabel } : {}),
        summary,
        ...(input.sourceId ? { sourceId: input.sourceId } : {}),
        ...(input.projectId ? { projectId: input.projectId } : {}),
    };
    const nextMedia = normalizeIndustryMediaWorld({
        ...media,
        prInterventions: [...media.prInterventions, intervention],
        processedC7Keys: [...media.processedC7Keys, interventionKey],
    });
    return {
        key: input.key,
        player: { ...player, world: { ...player.world, industryMedia: nextMedia } },
        rawEffects,
        appliedEffects,
        intervention,
        outcomeChanged: false,
    };
};

export interface PublicistMediaBatchResult {
    player: Player;
    results: PublicistMediaModifierResult[];
}

export const applyPublicistMediaBatch = (
    player: Player,
    inputs: PublicistMediaModifierInput[],
): PublicistMediaBatchResult => {
    let nextPlayer = player;
    const indexed = inputs.map((input, index) => ({ input, index }));
    const ordered = [...indexed].sort((left, right) => (
        IMPORTANCE_RANK[right.input.importance] - IMPORTANCE_RANK[left.input.importance]
        || left.input.key.localeCompare(right.input.key)
    ));
    const byIndex = new Map<number, PublicistMediaModifierResult>();
    ordered.forEach(({ input, index }) => {
        const result = applyPublicistMediaModifier(nextPlayer, input);
        nextPlayer = result.player;
        byIndex.set(index, result);
    });
    return { player: nextPlayer, results: indexed.map(({ index }) => byIndex.get(index)!) };
};

export interface PublicistWeekSummary {
    publicistName?: string;
    tier?: TeamMember['tier'];
    interventionsUsed: number;
    capacity: number;
    summary: string;
    interventions: IndustryMediaPrIntervention[];
}

export const getPublicistWeekSummary = (player: Player, absoluteWeek: number): PublicistWeekSummary => {
    const publicist = player.team?.publicist;
    const interventions = normalizeIndustryMediaWorld(player.world.industryMedia).prInterventions
        .filter(item => item.absoluteWeek === absoluteWeek);
    if (!publicist) {
        return { interventionsUsed: 0, capacity: 0, summary: 'No publicist was active this week.', interventions: [] };
    }
    const capacity = TIER_RULES[publicist.tier].capacity;
    return {
        publicistName: publicist.name,
        tier: publicist.tier,
        interventionsUsed: interventions.length,
        capacity,
        summary: interventions.length
            ? `${publicist.name} handled ${interventions.length} media moment${interventions.length === 1 ? '' : 's'} automatically this week.`
            : `${publicist.name} had no media damage or positive coverage to shape this week.`,
        interventions,
    };
};
