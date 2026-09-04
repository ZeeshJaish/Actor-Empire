import type {
    Business,
    Commitment,
    IndustryProductionCommitment,
    IndustryProductionStatus,
    Player,
    ProjectDetails,
    StudioFinanceEntry,
    StudioId,
    WorldState,
} from '../../types';
import { reconcileStudioAiController } from '../studioAi/studioAiControl';
import { createDeterministicId } from '../deterministicRandom';

const TERMINAL = new Set<IndustryProductionStatus>(['RELEASED', 'CANCELLED']);
const toMoney = (millions: number): number => Math.round(Math.max(0, Number(millions) || 0) * 1_000_000);
const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, Math.round(value)));

const budgetTierFor = (millions: number): ProjectDetails['budgetTier'] => (
    millions >= 150 ? 'BLOCKBUSTER' : millions >= 70 ? 'HIGH' : millions >= 20 ? 'MID' : 'LOW'
);

const playerPhaseFor = (status: IndustryProductionStatus): Commitment['projectPhase'] => {
    if (status === 'PRODUCTION') return 'PRODUCTION';
    if (status === 'POST_PRODUCTION') return 'POST_PRODUCTION';
    if (status === 'DELIVERED' || status === 'AWAITING_RELEASE' || status === 'ON_HOLD' || status === 'TURNAROUND') {
        return 'AWAITING_RELEASE';
    }
    return 'PRE_PRODUCTION';
};

const phaseWeeksLeftFor = (production: IndustryProductionCommitment): number => {
    const calendar = production.productionCalendar;
    const elapsed = Math.max(0, Math.min(calendar.totalWeeks, calendar.elapsedWeeks));
    if (production.status === 'PRODUCTION') {
        return Math.max(1, calendar.preProductionWeeks + calendar.productionWeeks - elapsed);
    }
    if (production.status === 'POST_PRODUCTION') return Math.max(1, calendar.totalWeeks - elapsed);
    if (['DELIVERED', 'AWAITING_RELEASE', 'ON_HOLD', 'TURNAROUND'].includes(production.status)) return 0;
    return Math.max(1, calendar.preProductionWeeks - elapsed);
};

const buildInheritedProjectDetails = (
    production: IndustryProductionCommitment,
): ProjectDetails => {
    const execution = production.studioAiExecution;
    const talent = execution?.talent;
    const quality = execution?.finalQuality;
    const creative = quality?.creativeQuality ?? Math.max(40, production.writerSkill);
    const directing = quality?.executionQuality ?? talent?.packageScore ?? 60;
    const commercial = quality?.commercialPotential ?? talent?.packageScore ?? 55;
    const estimatedBudget = toMoney(production.budgetMillions);
    return {
        title: production.title,
        sourceScriptId: `inherited_script_${production.canonicalProjectId}`,
        writerName: production.writerName,
        writerSkill: production.writerSkill,
        isOriginal: true,
        type: production.projectType,
        description: `Inherited production preserved from ${production.producerStudioId}'s active slate.`,
        studioId: production.producerStudioId,
        subtype: production.universeId ? 'UNIVERSE_ENTRY' : 'STANDALONE',
        genre: production.genre,
        format: 'LIVE_ACTION',
        targetAudience: 'PG-13',
        budgetTier: budgetTierFor(production.budgetMillions),
        estimatedBudget,
        releaseScale: production.budgetMillions >= 150 ? 'GLOBAL' : production.budgetMillions >= 50 ? 'MASS' : 'LIMITED',
        releaseStrategy: execution?.publicReleaseStrategy || (production.projectType === 'SERIES' ? 'STREAMING_ONLY' : undefined),
        visibleHype: commercial >= 78 ? 'HIGH' : commercial >= 48 ? 'MID' : 'LOW',
        hiddenStats: {
            scriptQuality: clamp(creative),
            directorQuality: clamp(directing),
            castingStrength: clamp(talent?.packageScore ?? 55),
            distributionPower: clamp(commercial),
            rawHype: clamp(commercial),
            qualityScore: clamp((creative + directing + commercial) / 3),
            prestigeBonus: clamp(quality?.prestigePotential ?? 0),
            studioPrestigeScore: clamp(quality?.prestigePotential ?? 55),
        },
        playerProductionFocus: { isPlayerProducer: true },
        directorName: talent?.directorName || 'Inherited Director',
        directorId: talent?.directorId,
        director: talent ? {
            id: talent.directorId,
            name: talent.directorName,
            tier: talent.packageScore >= 85 ? 'A_LIST' : talent.packageScore >= 68 ? 'ESTABLISHED' : 'RISING',
            quality: talent.packageScore,
        } : undefined,
        visibleDirectorTier: talent?.packageScore && talent.packageScore >= 85 ? 'A-List' : 'Established',
        visibleScriptBuzz: creative >= 78 ? 'Hot' : creative >= 55 ? 'Promising' : 'Quiet',
        visibleCastStrength: talent?.packageScore && talent.packageScore >= 82 ? 'Star-Studded' : talent ? 'Solid' : 'Unconfirmed',
        castList: talent ? [{
            id: talent.leadActorId,
            name: talent.leadActorName,
            role: 'Lead',
            roleType: 'LEAD',
            isPlayer: false,
            image: '',
            type: 'ACTOR',
            npcId: talent.leadActorId,
            actorId: talent.leadActorId,
            actorName: talent.leadActorName,
            status: 'CONFIRMED',
        }] : [],
        universeId: production.universeId,
        industryProductionId: production.id,
        canonicalIndustryProjectId: production.canonicalProjectId,
        inheritedFromStudioAi: true,
        inheritedPaidMillions: production.paidMillions,
        inheritedProblemIds: execution?.problems.map(problem => problem.id) || [],
        inheritedProductionStatus: production.status,
    };
};

const buildInheritedCommitment = (production: IndustryProductionCommitment): Commitment => {
    const phaseWeeksLeft = phaseWeeksLeftFor(production);
    const details = buildInheritedProjectDetails(production);
    return {
        id: `player_handoff_${production.canonicalProjectId}`,
        name: production.title,
        type: 'JOB',
        energyCost: 0,
        income: 0,
        payoutType: 'LUMPSUM',
        upfrontCost: toMoney(production.budgetMillions),
        projectPhase: playerPhaseFor(production.status),
        phaseWeeksLeft,
        totalPhaseDuration: phaseWeeksLeft,
        productionCalendar: structuredClone(production.productionCalendar),
        productionPerformance: details.hiddenStats.qualityScore,
        promotionalBuzz: details.hiddenStats.rawHype,
        projectDetails: details,
    };
};

const mapAiLedger = (
    business: Business,
    studioId: StudioId,
    player: Player,
): StudioFinanceEntry[] => {
    const source = player.world.studios?.[studioId]?.ai?.ledger || [];
    const existing = new Set((business.studioState?.financeLedger || []).map(entry => entry.id));
    const inherited = source.flatMap(entry => {
        if (existing.has(entry.id)) return [];
        return [{
            id: entry.id,
            week: (Math.max(0, entry.absoluteWeek) % 52) + 1,
            year: Math.floor(Math.max(0, entry.absoluteWeek) / 52),
            amount: Math.round(entry.amountMillions * 1_000_000),
            type: entry.amountMillions >= 0 ? 'CAPITAL_INJECTION' as const : 'PRODUCTION_SPEND' as const,
            label: entry.description,
        }];
    });
    return [...inherited, ...(business.studioState?.financeLedger || [])].slice(0, 260);
};

export interface StudioOwnershipMaterializationResult {
    player: Player;
    world: WorldState;
    business: Business;
    inheritedCommitments: Commitment[];
    changed: boolean;
}

export const materializeStudioOwnership = (
    player: Player,
    studioId: StudioId,
    absoluteWeek: number,
): StudioOwnershipMaterializationResult => {
    if (!player.world) {
        const business = (player.businesses || []).find(candidate => candidate.type === 'PRODUCTION_HOUSE' && candidate.id === studioId);
        return {
            player,
            world: player.world as WorldState,
            business: business || ({} as Business),
            inheritedCommitments: [],
            changed: false,
        };
    }
    const studio = player.world.studios?.[studioId];
    const business = (player.businesses || []).find(candidate => candidate.type === 'PRODUCTION_HOUSE' && candidate.id === studioId);
    if (!studio?.ai || !business?.studioState) {
        return {
            player,
            world: player.world,
            business: business || ({} as Business),
            inheritedCommitments: [],
            changed: false,
        };
    }

    const activeProductions = Object.values(player.world.industryProductions || {})
        .filter(production => production.producerStudioId === studioId)
        .filter(production => production.source === 'STUDIO_INDEPENDENT' && !TERMINAL.has(production.status))
        .sort((left, right) => left.id.localeCompare(right.id));
    const pending = activeProductions.filter(production => !production.playerHandoff?.playerCommitmentId);
    const alreadyExact = business.studioState.industryHandoffSnapshot
        && business.studioState.industryHandoffSnapshot.ai.lastProcessedAbsoluteWeek === studio.ai.lastProcessedAbsoluteWeek
        && business.balance === toMoney(studio.cashReserve)
        && business.stats.valuation === toMoney(studio.valuation * 1_000)
        && studio.ai.controller === 'PLAYER'
        && pending.length === 0;
    if (alreadyExact) {
        return { player, world: player.world, business, inheritedCommitments: [], changed: false };
    }

    const inheritedCommitments = pending.map(buildInheritedCommitment);
    const commitmentById = new Map((player.commitments || []).map(commitment => [commitment.id, commitment]));
    inheritedCommitments.forEach(commitment => commitmentById.set(commitment.id, commitment));
    const updatedBusiness: Business = {
        ...business,
        balance: toMoney(studio.cashReserve),
        stats: {
            ...business.stats,
            valuation: toMoney(studio.valuation * 1_000),
            brandHealth: clamp(studio.reputation),
            investorConfidence: clamp(studio.reputation - (studio.ai.status === 'DISTRESSED' ? 18 : 0)),
            riskLevel: clamp(studio.ai.finance.debtPrincipalMillions / Math.max(1, studio.cashReserve) * 20, 5, 95),
        },
        studioState: {
            ...business.studioState,
            financeLedger: mapAiLedger(business, studioId, player),
            industryHandoffSnapshot: {
                schemaVersion: 1,
                sourceStudioId: studioId,
                materializedAtAbsoluteWeek: absoluteWeek,
                ai: structuredClone(studio.ai),
                activeIndustryProductionIds: activeProductions.map(production => production.id),
            },
        },
    };
    const playerWithBusiness: Player = {
        ...player,
        businesses: player.businesses.map(candidate => candidate.id === studioId ? updatedBusiness : candidate),
        commitments: [...commitmentById.values()],
    };
    const controlledStudio = reconcileStudioAiController(studio, playerWithBusiness, absoluteWeek);
    const industryProductions = { ...(player.world.industryProductions || {}) };
    activeProductions.forEach(production => {
        const commitmentId = production.playerHandoff?.playerCommitmentId || `player_handoff_${production.canonicalProjectId}`;
        industryProductions[production.id] = {
            ...production,
            studioAiExecution: production.studioAiExecution ? {
                ...production.studioAiExecution,
                controllerAtLastProgression: 'PLAYER',
            } : undefined,
            playerHandoff: {
                schemaVersion: 1,
                playerCommitmentId: commitmentId,
                materializedAtAbsoluteWeek: production.playerHandoff?.materializedAtAbsoluteWeek || absoluteWeek,
                lastPlayerControlledAbsoluteWeek: absoluteWeek,
                dematerializedAtAbsoluteWeek: null,
            },
        };
    });
    const world: WorldState = {
        ...player.world,
        studios: { ...(player.world.studios || {}), [studioId]: controlledStudio },
        industryProductions,
    };
    const nextPlayer: Player = { ...playerWithBusiness, world };
    return { player: nextPlayer, world, business: updatedBusiness, inheritedCommitments, changed: true };
};

const industryStatusForPlayerPhase = (
    phase: Commitment['projectPhase'],
    fallback: IndustryProductionStatus,
): IndustryProductionStatus => {
    if (phase === 'PRE_PRODUCTION') return 'PRE_PRODUCTION';
    if (phase === 'PRODUCTION') return 'PRODUCTION';
    if (phase === 'POST_PRODUCTION') return 'POST_PRODUCTION';
    if (phase === 'AWAITING_RELEASE') return 'AWAITING_RELEASE';
    return fallback;
};

export interface StudioOwnershipDematerializationResult {
    player: Player;
    world: WorldState;
    changed: boolean;
}

export const dematerializeStudioOwnership = (
    player: Player,
    studioId: StudioId,
    absoluteWeek: number,
): StudioOwnershipDematerializationResult => {
    const studio = player.world?.studios?.[studioId];
    if (!studio?.ai) return { player, world: player.world, changed: false };
    const productions = Object.values(player.world.industryProductions || {})
        .filter(production => production.producerStudioId === studioId)
        .filter(production => production.playerHandoff && production.playerHandoff.dematerializedAtAbsoluteWeek === null);
    if (!productions.length && studio.ai.controller === 'AI') return { player, world: player.world, changed: false };

    const commitments = new Map((player.commitments || []).map(commitment => [commitment.id, commitment]));
    const removedCommitmentIds = new Set<string>();
    const industryProductions = { ...(player.world.industryProductions || {}) };
    productions.forEach(production => {
        const handoff = production.playerHandoff!;
        const commitment = commitments.get(handoff.playerCommitmentId);
        if (commitment) removedCommitmentIds.add(commitment.id);
        industryProductions[production.id] = {
            ...production,
            status: commitment
                ? industryStatusForPlayerPhase(commitment.projectPhase, production.status)
                : production.status,
            productionCalendar: commitment?.productionCalendar
                ? structuredClone(commitment.productionCalendar)
                : production.productionCalendar,
            updatedAtAbsoluteWeek: absoluteWeek,
            studioAiExecution: production.studioAiExecution ? {
                ...production.studioAiExecution,
                controllerAtLastProgression: 'AI',
                lastProgressedAbsoluteWeek: absoluteWeek,
            } : undefined,
            playerHandoff: {
                ...handoff,
                lastPlayerControlledAbsoluteWeek: absoluteWeek,
                dematerializedAtAbsoluteWeek: absoluteWeek,
            },
        };
    });

    const handoffKey = `PLAYER:AI:${studioId}:${absoluteWeek}`;
    const nextStudio = {
        ...studio,
        ai: {
            ...studio.ai,
            controller: 'AI' as const,
            handoffKeys: [...studio.ai.handoffKeys, handoffKey].slice(-104),
            events: [...studio.ai.events, {
                id: createDeterministicId('studio_ai_handoff_event', handoffKey),
                absoluteWeek,
                type: 'OWNERSHIP_CHANGED' as const,
                summary: `AI control resumed at ${studio.name}; the player's final production milestones were preserved.`,
            }].slice(-48),
            decisions: [...studio.ai.decisions, {
                id: createDeterministicId('studio_ai_handoff_decision', handoffKey),
                absoluteWeek,
                type: 'OWNERSHIP_HANDOFF' as const,
                summary: 'PLAYER to AI control handoff.',
            }].slice(-48),
        },
    };
    const world: WorldState = {
        ...player.world,
        studios: { ...(player.world.studios || {}), [studioId]: nextStudio },
        industryProductions,
    };
    const nextPlayer: Player = {
        ...player,
        commitments: (player.commitments || []).filter(commitment => !removedCommitmentIds.has(commitment.id)),
        world,
    };
    return { player: nextPlayer, world, changed: true };
};
