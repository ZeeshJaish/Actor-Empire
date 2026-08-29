import type {
    OwnedStreamingResearchProgram,
    StreamingResearchCategory,
    StreamingResearchInstallTargetType,
    StreamingResearchIpStrategy,
    StreamingResearchLifecycleStage,
    StreamingTechnologyBuildMode,
} from '../types';
import { createDeterministicId } from './deterministicRandom';

export interface StreamingResearchDefinitionCore {
    id: string;
    title: string;
    category: StreamingResearchCategory;
    installTargetType: StreamingResearchInstallTargetType;
    researchCost: number;
    patentCost: number;
    installationCost: number;
    weeklyOperatingCost: number;
    licenseWeeklyCost: number;
    staffRequired: number;
    researchWeeks: number;
    prototypeWeeks: number;
    testWeeks: number;
    installationWeeks: number;
}

export interface StreamingResearchPreview {
    definitionId: string;
    buildMode: StreamingTechnologyBuildMode;
    researchCost: number;
    researchWeeks: number;
    prototypeWeeks: number;
    testWeeks: number;
    installationWeeks: number;
    patentCost: number;
    licenseIpCost: number;
    weeklyOperatingCost: number;
    licenseWeeklyCost: number;
    rivalInterestPercent: number;
}

const MODE_FACTORS: Record<StreamingTechnologyBuildMode, { cost: number; weeks: number; rival: number }> = {
    HARDENED: { cost: 1.15, weeks: 1, rival: -4 },
    BALANCED: { cost: 1, weeks: 0, rival: 0 },
    SPRINT: { cost: 1.2, weeks: -1, rival: 6 },
};

export const previewStreamingResearchProgram = (
    definition: StreamingResearchDefinitionCore,
    buildMode: StreamingTechnologyBuildMode,
): StreamingResearchPreview => {
    const factors = MODE_FACTORS[buildMode];
    return {
        definitionId: definition.id,
        buildMode,
        researchCost: Math.round(definition.researchCost * factors.cost),
        researchWeeks: Math.max(1, definition.researchWeeks + factors.weeks),
        prototypeWeeks: definition.prototypeWeeks,
        testWeeks: definition.testWeeks,
        installationWeeks: definition.installationWeeks,
        patentCost: definition.patentCost,
        licenseIpCost: Math.round(definition.patentCost * 0.25),
        weeklyOperatingCost: definition.weeklyOperatingCost,
        licenseWeeklyCost: definition.licenseWeeklyCost,
        rivalInterestPercent: Math.max(0, 8 + factors.rival),
    };
};

export const getStreamingResearchStageDuration = (
    program: Pick<OwnedStreamingResearchProgram, 'researchWeeks' | 'prototypeWeeks' | 'testWeeks' | 'installationWeeks'>,
    stage: StreamingResearchLifecycleStage,
): number => {
    if (stage === 'RESEARCHING') return program.researchWeeks;
    if (stage === 'PROTOTYPING') return program.prototypeWeeks;
    if (stage === 'TESTING') return program.testWeeks;
    if (stage === 'INSTALLING') return program.installationWeeks;
    return 0;
};

export interface StreamingResearchSchedule {
    stage: StreamingResearchLifecycleStage;
    researchWeeks: number;
    prototypeWeeks: number;
    testWeeks: number;
    installationWeeks: number;
    stageStartedAtAbsoluteWeek: number;
    stageReadyAtAbsoluteWeek: number;
    completedAtAbsoluteWeek: number | null;
}

/** Advances one actor-neutral research stage. Funding/IP decisions remain with the caller. */
export const advanceStreamingResearchSchedule = <T extends StreamingResearchSchedule>(
    program: T,
    absoluteWeek: number,
): T => {
    if (absoluteWeek < program.stageReadyAtAbsoluteWeek) return program;
    const nextStage: StreamingResearchLifecycleStage | null = program.stage === 'RESEARCHING'
        ? 'PROTOTYPING'
        : program.stage === 'PROTOTYPING'
            ? 'TESTING'
            : program.stage === 'TESTING'
                ? 'AWAITING_IP'
                : null;
    if (!nextStage) return program;
    return {
        ...program,
        stage: nextStage,
        stageStartedAtAbsoluteWeek: absoluteWeek,
        stageReadyAtAbsoluteWeek: absoluteWeek + getStreamingResearchStageDuration(program, nextStage),
    };
};

export const beginStreamingResearchInstallationSchedule = <T extends StreamingResearchSchedule>(
    program: T,
    absoluteWeek: number,
    installationWeeks: number,
): T => program.stage !== 'READY_TO_INSTALL' ? program : ({
    ...program,
    stage: 'INSTALLING',
    stageStartedAtAbsoluteWeek: absoluteWeek,
    stageReadyAtAbsoluteWeek: absoluteWeek + Math.max(1, installationWeeks),
} as T);

export const completeStreamingResearchInstallationSchedule = <T extends StreamingResearchSchedule>(
    program: T,
    absoluteWeek: number,
): T => program.stage !== 'INSTALLING' || absoluteWeek < program.stageReadyAtAbsoluteWeek ? program : ({
    ...program,
    stage: 'OPERATING',
    stageStartedAtAbsoluteWeek: absoluteWeek,
    stageReadyAtAbsoluteWeek: absoluteWeek,
    completedAtAbsoluteWeek: absoluteWeek,
} as T);

export const createStreamingResearchProgram = (input: {
    seed: string;
    definition: StreamingResearchDefinitionCore;
    buildMode: StreamingTechnologyBuildMode;
    absoluteWeek: number;
    idempotencyKey?: string;
}): OwnedStreamingResearchProgram => {
    const preview = previewStreamingResearchProgram(input.definition, input.buildMode);
    const idempotencyKey = input.idempotencyKey ?? `research-program:${input.definition.id}`;
    return {
        id: createDeterministicId('streaming_research', input.seed, idempotencyKey),
        idempotencyKey,
        definitionId: input.definition.id,
        title: input.definition.title,
        category: input.definition.category,
        stage: 'RESEARCHING',
        buildMode: input.buildMode,
        ipStrategy: null,
        researchCost: preview.researchCost,
        patentCost: input.definition.patentCost,
        installationCost: input.definition.installationCost,
        weeklyOperatingCost: preview.weeklyOperatingCost,
        licenseWeeklyCost: preview.licenseWeeklyCost,
        staffRequired: input.definition.staffRequired,
        researchWeeks: preview.researchWeeks,
        prototypeWeeks: preview.prototypeWeeks,
        testWeeks: preview.testWeeks,
        installationWeeks: preview.installationWeeks,
        startedAtAbsoluteWeek: input.absoluteWeek,
        stageStartedAtAbsoluteWeek: input.absoluteWeek,
        stageReadyAtAbsoluteWeek: input.absoluteWeek + preview.researchWeeks,
        installationTargetType: input.definition.installTargetType,
        installationTargetId: null,
        installationTargetLabel: null,
        rivalInterestPercent: preview.rivalInterestPercent,
        completedAtAbsoluteWeek: null,
    };
};

export const advanceStreamingResearchStage = (
    program: OwnedStreamingResearchProgram,
    absoluteWeek: number,
): OwnedStreamingResearchProgram => {
    const advanced = advanceStreamingResearchSchedule(program, absoluteWeek);
    if (advanced !== program) return advanced;
    return program.stage === 'INSTALLING' && program.installationTargetType === 'FACILITY'
        ? completeStreamingResearchInstallationSchedule(program, absoluteWeek)
        : program;
};

export const previewStreamingResearchIpCost = (
    program: Pick<OwnedStreamingResearchProgram, 'patentCost'>,
    strategy: StreamingResearchIpStrategy,
): number => strategy === 'PATENT' ? program.patentCost : Math.round(program.patentCost * 0.25);

export const markStreamingResearchReadyToInstallSchedule = <T extends StreamingResearchSchedule & {
    ipStrategy: StreamingResearchIpStrategy | null;
}>(
    program: T,
    strategy: StreamingResearchIpStrategy,
    absoluteWeek: number,
): T => program.stage !== 'AWAITING_IP' ? program : ({
    ...program,
    stage: 'READY_TO_INSTALL',
    ipStrategy: strategy,
    stageStartedAtAbsoluteWeek: absoluteWeek,
    stageReadyAtAbsoluteWeek: absoluteWeek,
} as T);

export const clearStreamingResearchIp = (
    program: OwnedStreamingResearchProgram,
    strategy: StreamingResearchIpStrategy,
    absoluteWeek: number,
): OwnedStreamingResearchProgram => ({
    ...markStreamingResearchReadyToInstallSchedule(program, strategy, absoluteWeek),
    rivalInterestPercent: Math.min(100, program.rivalInterestPercent + (strategy === 'PATENT' ? 24 : 7)),
});

export const beginStreamingResearchInstallation = (
    program: OwnedStreamingResearchProgram,
    targetId: string,
    targetLabel: string,
    startedAtAbsoluteWeek: number,
    readyAtAbsoluteWeek: number,
): OwnedStreamingResearchProgram => program.stage !== 'READY_TO_INSTALL' ? program : ({
    ...program,
    stage: 'INSTALLING',
    installationTargetId: targetId,
    installationTargetLabel: targetLabel,
    stageStartedAtAbsoluteWeek: startedAtAbsoluteWeek,
    stageReadyAtAbsoluteWeek: readyAtAbsoluteWeek,
});

export const completeStreamingResearchInstallation = (
    program: OwnedStreamingResearchProgram,
    absoluteWeek: number,
): OwnedStreamingResearchProgram => program.stage !== 'INSTALLING' ? program : ({
    ...program,
    stage: 'OPERATING',
    stageStartedAtAbsoluteWeek: absoluteWeek,
    stageReadyAtAbsoluteWeek: absoluteWeek,
    completedAtAbsoluteWeek: absoluteWeek,
});
