import type {
    Commitment,
    Player,
    ProjectPromotionAttribution,
    ProjectPromotionChannel,
    ProjectPromotionType,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { applyPublicistMediaModifier, normalizeIndustryMediaWorld } from './industryWorld';

const ELIGIBLE_PHASES = new Set<Commitment['projectPhase']>([
    'PLANNING', 'PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'SCHEDULED', 'AWAITING_RELEASE',
]);
const ELIGIBLE_TYPES = new Set<Commitment['type']>(['ACTING_GIG', 'DIRECTOR_GIG', 'WRITER_GIG']);
const CHANNEL_BASE: Record<ProjectPromotionChannel, number> = {
    X: 3,
    INSTAGRAM: 2,
    YOUTUBE: 4,
    PRESS: 5,
    RED_CARPET: 6,
};

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, Math.round(value)))
);

export const getEligiblePromotionProjects = (player: Player): Commitment[] => (
    player.commitments.filter(item => ELIGIBLE_TYPES.has(item.type) && ELIGIBLE_PHASES.has(item.projectPhase))
);

export interface ApplyProjectPromotionAttributionInput {
    projectId: string;
    publicationId: string;
    channel: ProjectPromotionChannel;
    promotionType: ProjectPromotionType;
    absoluteWeek: number;
    reach?: number;
    engagement?: number;
    campaignFit?: number;
    /** Optional signed result from an interactive appearance such as a press conference. */
    baseBuzzDelta?: number;
}

export interface ApplyProjectPromotionAttributionResult {
    player: Player;
    appliedBuzzDelta: number;
    attribution?: ProjectPromotionAttribution;
}

export const applyProjectPromotionAttribution = (
    player: Player,
    input: ApplyProjectPromotionAttributionInput,
): ApplyProjectPromotionAttributionResult => {
    const project = getEligiblePromotionProjects(player).find(item => item.id === input.projectId);
    const publicationId = input.publicationId.trim();
    if (!project || !publicationId) return { player, appliedBuzzDelta: 0 };
    const media = normalizeIndustryMediaWorld(player.world.industryMedia);
    const attributionKey = `promotion:${publicationId}`;
    const existing = media.promotionAttributions.find(item => item.attributionKey === attributionKey);
    if (existing) return { player, appliedBuzzDelta: 0, attribution: existing };

    const recentSameProject = media.promotionAttributions.filter(item => (
        item.projectId === project.id
        && item.absoluteWeek >= input.absoluteWeek - 6
        && item.absoluteWeek <= input.absoluteWeek
    )).length;
    const fatigueMultiplier = Math.max(0.3, Math.pow(0.72, recentSameProject));
    const reachBoost = Math.min(2, Math.max(0, Number(input.reach || 0)) / 250_000);
    const engagementRate = input.reach ? Math.max(0, Number(input.engagement || 0)) / Math.max(1, input.reach) : 0;
    const engagementBoost = Math.min(1, engagementRate * 8);
    const fitMultiplier = Math.max(0.65, Math.min(1.25, Number(input.campaignFit ?? 1)));
    const calculatedBuzz = (CHANNEL_BASE[input.channel] + reachBoost + engagementBoost) * fitMultiplier;
    const baseBuzzDelta = input.baseBuzzDelta === undefined
        ? clamp(calculatedBuzz, 1, 8)
        : clamp(input.baseBuzzDelta, -8, 8);
    const fatiguedBuzz = baseBuzzDelta === 0
        ? 0
        : Math.sign(baseBuzzDelta) * Math.max(1, Math.round(Math.abs(baseBuzzDelta) * fatigueMultiplier));
    const pr = applyPublicistMediaModifier(player, {
        key: attributionKey,
        absoluteWeek: input.absoluteWeek,
        importance: Math.abs(baseBuzzDelta) >= 6 ? 'HIGH' : Math.abs(baseBuzzDelta) >= 4 ? 'MEDIUM' : 'LOW',
        projectId: project.id,
        sourceId: publicationId,
        rawEffects: { projectBuzz: fatiguedBuzz },
    });
    const appliedBuzzDelta = clamp(pr.appliedEffects.projectBuzz, -10, 10);
    const nextCommitments = pr.player.commitments.map(item => item.id === project.id ? {
        ...item,
        promotionalBuzz: clamp((item.promotionalBuzz || 0) + appliedBuzzDelta, -50, 50),
    } : item);
    const prIntervention = pr.intervention;
    const attribution: ProjectPromotionAttribution = {
        schemaVersion: 1,
        id: createDeterministicId('project_promotion_attribution', attributionKey),
        attributionKey,
        publicationId,
        projectId: project.id,
        projectName: project.name,
        channel: input.channel,
        promotionType: input.promotionType,
        absoluteWeek: Math.max(0, Math.round(input.absoluteWeek)),
        baseBuzzDelta,
        fatigueMultiplier,
        prMultiplier: fatiguedBuzz > 0 ? appliedBuzzDelta / fatiguedBuzz : 1,
        appliedBuzzDelta,
        ...(prIntervention ? { prInterventionId: prIntervention.id } : {}),
    };
    const nextMedia = normalizeIndustryMediaWorld({
        ...normalizeIndustryMediaWorld(pr.player.world.industryMedia),
        promotionAttributions: [
            ...normalizeIndustryMediaWorld(pr.player.world.industryMedia).promotionAttributions,
            attribution,
        ],
        processedC7Keys: [
            ...normalizeIndustryMediaWorld(pr.player.world.industryMedia).processedC7Keys,
            attributionKey,
        ],
    });
    return {
        player: {
            ...pr.player,
            commitments: nextCommitments,
            world: { ...pr.player.world, industryMedia: nextMedia },
        },
        appliedBuzzDelta,
        attribution,
    };
};
