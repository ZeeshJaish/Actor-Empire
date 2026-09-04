import type { IndustryContentFingerprint, IndustryProductionCommitment, Player, StudioAiProductionCheckpoint, StudioAiProductionMilestone, WorldState } from '../../types';
import { upsertCanonicalIndustryProduction } from '../industryProductions';
import { cancelProjectTalentBookings } from '../talentBookings';
import { releaseStudioAiProduction } from './studioAiCommercialResult';
import { applyStudioAiProductionMilestone } from './studioAiProductionEconomy';
import { evaluateStudioAiProductionProblem } from './studioAiProductionProblems';
import { finalizeStudioAiProductionQuality } from './studioAiProductionQuality';
import { appendStudioAiProductionKey } from './studioAiProductionState';
import { packageStudioAiProductionTalent } from './studioAiProductionTalent';
import { settleStudioAiProductionTurnaround } from './studioAiProductionTurnaround';
import { planStudioAiProductionRelease } from './studioAiReleasePlanning';

const TERMINAL_PRODUCTIONS = new Set(['RELEASED', 'CANCELLED']);
const TERMINAL_STUDIOS = new Set(['DORMANT', 'SOLD_MERGED', 'CLOSED']);

export interface ExecuteStudioAiProductionWeekInput { player: Player; world: WorldState; absoluteWeek: number }
export interface ExecuteStudioAiProductionWeekResult { world: WorldState; progressedCount: number; releasedCount: number; heldCount: number; cancelledCount: number; logs: string[] }

const phaseMilestone = (production: IndustryProductionCommitment): StudioAiProductionMilestone | null => {
    const completed = production.productionCalendar.elapsedWeeks;
    const preEnd = production.productionCalendar.preProductionWeeks;
    const productionEnd = preEnd + production.productionCalendar.productionWeeks;
    if (completed === 0) return 'PRE_PRODUCTION_START';
    if (completed === preEnd) return 'PRODUCTION_START';
    if (completed === productionEnd) return 'POST_PRODUCTION_START';
    return null;
};

const checkpoint = (before: number, after: number, production: IndustryProductionCommitment): StudioAiProductionCheckpoint[] => {
    const pre = production.productionCalendar.preProductionWeeks;
    const length = production.productionCalendar.productionWeeks;
    const markers: Array<[number, StudioAiProductionCheckpoint]> = [
        [pre, 'PRODUCTION_START'], [pre + Math.max(1, Math.floor(length * 0.35)), 'PRODUCTION_35'],
        [pre + Math.max(1, Math.floor(length * 0.70)), 'PRODUCTION_70'], [pre + length, 'POST_PRODUCTION_START'],
    ];
    return markers.filter(([week]) => before < week && after >= week).map(([, key]) => key);
};

export const executeStudioAiProductionWeek = (input: ExecuteStudioAiProductionWeekInput): ExecuteStudioAiProductionWeekResult => {
    let world = input.world;
    let progressedCount = 0;
    let releasedCount = 0;
    let heldCount = 0;
    let cancelledCount = 0;
    const logs: string[] = [];
    const fingerprintsById = new Map<string, IndustryContentFingerprint>();
    for (const studio of Object.values(world.studios || {})) {
        for (const fingerprint of studio.ai?.intelligence?.content.selectedFingerprints || []) {
            fingerprintsById.set(fingerprint.id, fingerprint);
        }
    }
    for (const productionId of Object.keys(world.industryProductions || {}).sort()) {
        let production = world.industryProductions![productionId];
        if (production.source !== 'STUDIO_INDEPENDENT' || !production.studioAiExecution || TERMINAL_PRODUCTIONS.has(production.status)) continue;
        let studio = world.studios?.[production.producerStudioId];
        if (!studio?.ai || studio.ai.controller !== 'AI' || TERMINAL_STUDIOS.has(studio.ai.status)) continue;
        let execution = production.studioAiExecution;
        if (execution.lastProgressedAbsoluteWeek >= input.absoluteWeek) continue;
        const fingerprint = execution.fingerprintSnapshot || fingerprintsById.get(execution.fingerprintId);
        if (!fingerprint) continue;

        if (!execution.talentSelected) {
            const packaged = packageStudioAiProductionTalent({ player: { ...input.player, world }, world, studio, production, absoluteWeek: input.absoluteWeek });
            world = packaged.world; production = packaged.production; studio = world.studios?.[production.producerStudioId] || studio;
        }
        execution = production.studioAiExecution!;

        if (production.status === 'ON_HOLD') {
            if ((execution.nextReviewAbsoluteWeek ?? Number.MAX_SAFE_INTEGER) > input.absoluteWeek) continue;
            if (execution.releaseBlockedReason === 'MISSING_STREAMING_RIGHTS') {
                production = { ...production, status: 'AWAITING_RELEASE', studioAiExecution: { ...execution, selectedReleaseMode: null, releaseBlockedReason: 'NONE', nextReviewAbsoluteWeek: input.absoluteWeek } };
            } else {
                const holdAge = input.absoluteWeek - (execution.holdStartedAtAbsoluteWeek ?? input.absoluteWeek);
                if (holdAge >= 26) {
                    const turnaroundProduction = { ...production, status: 'TURNAROUND' as const, studioAiExecution: { ...execution, selectedReleaseMode: 'TURNAROUND' as const } };
                    let transferred = false;
                    for (const buyer of Object.values(world.studios || {}).filter(candidate => candidate.id !== studio.id).sort((left, right) => left.id.localeCompare(right.id))) {
                        const result = settleStudioAiProductionTurnaround({ world, production: turnaroundProduction, seller: studio, buyer, absoluteWeek: input.absoluteWeek });
                        if (!result.changed) continue;
                        world = result.world; production = result.production; studio = result.buyer; execution = production.studioAiExecution!; transferred = true; break;
                    }
                    if (!transferred) {
                        const remaining = Math.max(0, production.budgetMillions - production.paidMillions);
                        studio = { ...studio, ai: { ...studio.ai!, finance: { ...studio.ai!.finance, committedSpendMillions: Math.max(0, studio.ai!.finance.committedSpendMillions - remaining) } } };
                        production = { ...production, status: 'CANCELLED', updatedAtAbsoluteWeek: input.absoluteWeek, studioAiExecution: { ...execution, selectedReleaseMode: null, lastProgressedAbsoluteWeek: input.absoluteWeek, processedKeys: appendStudioAiProductionKey(execution.processedKeys, `b6-cancel:${production.id}`) } };
                        world = { ...world, studios: { ...(world.studios || {}), [studio.id]: studio }, talentBookings: cancelProjectTalentBookings(world.talentBookings, production.canonicalProjectId, input.absoluteWeek), industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production) };
                        cancelledCount += 1;
                        logs.push(`${production.title} was cancelled after a prolonged financing hold.`);
                        continue;
                    }
                }
                const milestone = phaseMilestone(production) || (production.productionCalendar.elapsedWeeks >= production.productionCalendar.totalWeeks ? 'DELIVERY' : null);
                if (milestone) {
                    const paid = applyStudioAiProductionMilestone({ studio, production, milestone, absoluteWeek: input.absoluteWeek });
                    studio = paid.studio; production = paid.production;
                    world = { ...world, studios: { ...(world.studios || {}), [studio.id]: studio }, industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production) };
                }
                if (production.status === 'ON_HOLD') {
                    production = { ...production, studioAiExecution: { ...production.studioAiExecution!, lastProgressedAbsoluteWeek: input.absoluteWeek, nextReviewAbsoluteWeek: input.absoluteWeek + 4 } };
                    world = { ...world, industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production) };
                    heldCount += 1;
                    continue;
                }
            }
        }

        if (production.status === 'AWAITING_RELEASE') {
            if (!production.studioAiExecution!.selectedReleaseMode) {
                const planned = planStudioAiProductionRelease({ world, studio, production, fingerprint, absoluteWeek: input.absoluteWeek });
                production = planned.production;
                world = { ...world, industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production) };
                if (planned.mode === 'HOLD') { heldCount += 1; continue; }
            }
            const released = releaseStudioAiProduction({ world, studio, production, absoluteWeek: input.absoluteWeek });
            world = released.world; production = released.production; studio = released.studio;
            if (released.changed) { releasedCount += 1; logs.push(`${production.title} was released.`); }
            else if (production.studioAiExecution) {
                production = { ...production, studioAiExecution: { ...production.studioAiExecution, lastProgressedAbsoluteWeek: input.absoluteWeek } };
                world = { ...world, industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production) };
            }
            continue;
        }

        const dueMilestone = phaseMilestone(production);
        if (dueMilestone) {
            const paid = applyStudioAiProductionMilestone({ studio, production, milestone: dueMilestone, absoluteWeek: input.absoluteWeek });
            studio = paid.studio; production = paid.production;
            world = { ...world, studios: { ...(world.studios || {}), [studio.id]: studio }, industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production) };
            if (production.status === 'ON_HOLD') { heldCount += 1; continue; }
        }
        const before = production.productionCalendar.elapsedWeeks;
        const after = Math.min(production.productionCalendar.totalWeeks, before + 1);
        production = { ...production, productionCalendar: { ...production.productionCalendar, elapsedWeeks: after }, updatedAtAbsoluteWeek: input.absoluteWeek };
        for (const key of checkpoint(before, after, production)) {
            const problem = evaluateStudioAiProductionProblem({ studio, production, checkpoint: key, absoluteWeek: input.absoluteWeek });
            studio = problem.studio; production = problem.production;
            if (production.status === 'ON_HOLD') break;
        }
        if (production.status !== 'ON_HOLD' && after >= production.productionCalendar.totalWeeks) {
            const paid = applyStudioAiProductionMilestone({ studio, production, milestone: 'DELIVERY', absoluteWeek: input.absoluteWeek });
            studio = paid.studio; production = paid.production;
            if (production.status === 'DELIVERED') {
                const quality = finalizeStudioAiProductionQuality({ studio, production, fingerprint, absoluteWeek: input.absoluteWeek });
                production = quality.production;
            }
        }
        if (production.studioAiExecution && production.status !== 'RELEASED') production = {
            ...production,
            studioAiExecution: { ...production.studioAiExecution, controllerAtLastProgression: 'AI', lastProgressedAbsoluteWeek: input.absoluteWeek, processedKeys: appendStudioAiProductionKey(production.studioAiExecution.processedKeys, `b6-progress:${input.absoluteWeek}`) },
        };
        world = { ...world, studios: { ...(world.studios || {}), [studio.id]: studio }, industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production) };
        progressedCount += 1;
    }
    return { world, progressedCount, releasedCount, heldCount, cancelledCount, logs };
};
