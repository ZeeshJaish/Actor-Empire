import type {
    OwnedStreamingCatalogLicense,
    PlatformAiContentPlan,
    PlatformAiDecisionRecord,
    PlatformAiRightsRenewalRecord,
    PlatformId,
    PlatformState,
    Player,
    StreamingRightsSellerType,
    StreamingRightsWindowType,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    getStreamingRightsContract,
    isStreamingLicenseActiveAt,
    millionsToFullCurrency,
    registerStreamingRightsContract,
    validateStreamingRightsAvailability,
} from '../streamingRightsCore';
import {
    appendPlatformAiDecisions,
    getPlatformAiRightsRenewalContractId,
    getPlatformAiRightsRenewalId,
    getPlatformAiRightsRenewalObligationId,
    normalizePlatformAiRightsRenewals,
    normalizePlatformAiState,
    reconcilePlatformAiRightsRenewalObligations,
    resolvePlatformController,
} from './platformAiState';

export type PlatformAiRightsLifecycleReason =
    | 'PLAYER_CONTROLLED'
    | 'PLATFORM_NOT_FOUND'
    | 'LICENSE_NOT_FOUND'
    | 'RENEWAL_NOT_ALLOWED'
    | 'RENEWAL_NOT_DUE'
    | 'RIGHTS_CONFLICT'
    | 'DUPLICATE';

export interface PlatformAiRightsLifecycleInput {
    player: Player;
    world: WorldState;
    platformId: PlatformId;
    absoluteWeek: number;
}

export interface QueuePlatformAiRightsRenewalInput extends PlatformAiRightsLifecycleInput {
    licenseId: string;
}

export interface QueuePlatformAiRightsRenewalResult {
    world: WorldState;
    changed: boolean;
    record: PlatformAiRightsRenewalRecord | null;
    reason?: PlatformAiRightsLifecycleReason;
}

export interface ProgressPlatformAiRightsLifecycleResult {
    world: WorldState;
    changed: boolean;
    expiredLicenseIds: string[];
    resetPlanIds: string[];
    activatedRenewalLicenseIds: string[];
    queuedRenewalIds: string[];
    reason?: 'PLAYER_CONTROLLED' | 'PLATFORM_NOT_FOUND';
}

const updatePlatform = (
    world: WorldState,
    platformId: PlatformId,
    platform: PlatformState,
): WorldState => ({
    ...world,
    platforms: { ...world.platforms!, [platformId]: platform },
});

const renewalContractExpiry = (record: PlatformAiRightsRenewalRecord): number => (
    record.nextStartsAtAbsoluteWeek + record.durationWeeks
);

const hasCanonicalActiveRightAt = (
    contract: OwnedStreamingCatalogLicense | null | undefined,
    absoluteWeek: number,
): contract is OwnedStreamingCatalogLicense => Boolean(
    contract
    && contract.status === 'ACTIVE'
    && isStreamingLicenseActiveAt(contract, absoluteWeek),
);

const renewalDecision = (
    platformId: PlatformId,
    record: PlatformAiRightsRenewalRecord,
    absoluteWeek: number,
    type: 'RIGHTS_RENEWAL_QUEUED' | 'RIGHTS_RENEWAL_ACTIVATED',
): PlatformAiDecisionRecord => ({
    id: createDeterministicId('platform_ai_decision', platformId, record.id, type),
    absoluteWeek,
    type,
    summary: type === 'RIGHTS_RENEWAL_QUEUED'
        ? 'A catalogue-rights renewal entered payment settlement.'
        : 'A paid catalogue-rights renewal became active.',
    reason: type === 'RIGHTS_RENEWAL_QUEUED'
        ? `${record.minimumGuaranteeMillions}M was persisted as a contractual obligation before contract creation.`
        : `The non-overlapping continuation starts in week ${record.nextStartsAtAbsoluteWeek}.`,
    cashImpactMillions: type === 'RIGHTS_RENEWAL_QUEUED' ? -record.minimumGuaranteeMillions : 0,
});

export const queuePlatformAiRightsRenewal = (
    input: QueuePlatformAiRightsRenewalInput,
): QueuePlatformAiRightsRenewalResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return { world: input.world, changed: false, record: null, reason: 'PLAYER_CONTROLLED' };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) return { world: input.world, changed: false, record: null, reason: 'PLATFORM_NOT_FOUND' };
    const platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const projectedPrevious = platform.ai!.rightsContracts.find(contract => contract.id === input.licenseId);
    const previous = projectedPrevious
        ? getStreamingRightsContract(input.world.streamingRightsContracts, projectedPrevious.id)
        : null;
    if (!previous || previous.buyerPlatformId !== input.platformId) {
        return { world: input.world, changed: false, record: null, reason: 'LICENSE_NOT_FOUND' };
    }
    const hasCanonicalA4Case = Object.values(input.world.streamingRightsCalendar?.renewalCases || {})
        .some(renewalCase => renewalCase.sourceContractId === previous.id);
    if (hasCanonicalA4Case) {
        return { world: input.world, changed: false, record: null, reason: 'DUPLICATE' };
    }
    if (
        !previous.renewalOption
        || previous.permanentPurchase
        || previous.expiresAtAbsoluteWeek >= Number.MAX_SAFE_INTEGER
        || !previous.platformContentPlanId
    ) return { world: input.world, changed: false, record: null, reason: 'RENEWAL_NOT_ALLOWED' };
    if (input.absoluteWeek < previous.expiresAtAbsoluteWeek) {
        return { world: input.world, changed: false, record: null, reason: 'RENEWAL_NOT_DUE' };
    }
    const nextStartsAtAbsoluteWeek = previous.expiresAtAbsoluteWeek + 1;
    const renewalId = getPlatformAiRightsRenewalId(previous.id, nextStartsAtAbsoluteWeek);
    const existing = platform.ai!.rightsRenewals.find(record => record.id === renewalId);
    if (existing) return { world: input.world, changed: false, record: existing, reason: 'DUPLICATE' };
    const renewalLicenseId = getPlatformAiRightsRenewalContractId(previous.id, nextStartsAtAbsoluteWeek);
    if (platform.ai!.rightsContracts.some(contract => contract.id === renewalLicenseId)) {
        return { world: input.world, changed: false, record: null, reason: 'DUPLICATE' };
    }
    const durationWeeks = Math.max(1, Math.round(previous.durationWeeks));
    const availability = validateStreamingRightsAvailability({
        player: input.player,
        world: updatePlatform(input.world, input.platformId, platform),
        sourceProjectId: previous.sourceProjectId,
        buyerPlatformId: input.platformId,
        territory: previous.territory,
        countryIds: previous.countryIds || [],
        windowType: previous.windowType || 'SECOND_WINDOW',
        exclusivity: previous.exclusivity,
        startsAtAbsoluteWeek: nextStartsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: nextStartsAtAbsoluteWeek + durationWeeks,
        excludeLicenseIds: [previous.id],
    });
    if (!availability.available) {
        return { world: input.world, changed: false, record: null, reason: 'RIGHTS_CONFLICT' };
    }
    const minimumGuaranteeMillions = Math.max(0, previous.minimumGuarantee / 1_000_000);
    if (minimumGuaranteeMillions <= 0) {
        return { world: input.world, changed: false, record: null, reason: 'RENEWAL_NOT_ALLOWED' };
    }
    const record: PlatformAiRightsRenewalRecord = {
        id: renewalId,
        platformId: input.platformId,
        previousLicenseId: previous.id,
        sourceProjectId: previous.sourceProjectId,
        platformContentPlanId: previous.platformContentPlanId,
        nextStartsAtAbsoluteWeek,
        durationWeeks,
        minimumGuaranteeMillions,
        obligationId: getPlatformAiRightsRenewalObligationId(previous.id, nextStartsAtAbsoluteWeek),
        status: 'PENDING_PAYMENT',
        paymentSettledAtAbsoluteWeek: null,
        renewalLicenseId: null,
        createdAtAbsoluteWeek: input.absoluteWeek,
        activatedAtAbsoluteWeek: null,
    };
    const rightsRenewals = normalizePlatformAiRightsRenewals(
        [...platform.ai!.rightsRenewals, record],
        input.platformId,
        platform.ai!.rightsContracts,
    );
    const pendingOneTimeObligations = reconcilePlatformAiRightsRenewalObligations(
        platform.ai!.pendingOneTimeObligations,
        rightsRenewals,
    );
    const nextPlatform: PlatformState = {
        ...platform,
        ai: {
            ...platform.ai!,
            rightsRenewals,
            pendingOneTimeObligations,
            decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, [
                renewalDecision(input.platformId, record, input.absoluteWeek, 'RIGHTS_RENEWAL_QUEUED'),
            ]),
        },
    };
    return {
        world: updatePlatform(input.world, input.platformId, nextPlatform),
        changed: true,
        record,
    };
};

const scheduleWindowIsValid = (
    plan: PlatformAiContentPlan,
    contractsById: Map<string, OwnedStreamingCatalogLicense>,
): boolean => {
    if (plan.source === 'COMMISSIONED_ORIGINAL' || plan.status !== 'SCHEDULED') return true;
    if (!plan.releaseEntries.length) return false;
    return plan.releaseEntries.every(entry => {
        const contract = entry.rightsContractId ? contractsById.get(entry.rightsContractId) : null;
        if (
            !entry.sourceProjectId
            || !contract
            || contract.status !== 'ACTIVE'
            || contract.sourceProjectId !== entry.sourceProjectId
            || contract.platformContentPlanId !== plan.id
            || !plan.rightsContractIds.includes(contract.id)
        ) return false;
        const releaseWeeks = entry.installmentAbsoluteWeeks.length
            ? entry.installmentAbsoluteWeeks
            : [entry.premiereAtAbsoluteWeek];
        return releaseWeeks.every(week => (
            contract.status === 'ACTIVE' && isStreamingLicenseActiveAt(contract, week)
        ));
    });
};

const resetInvalidSchedules = (
    world: WorldState,
    platform: PlatformState,
    absoluteWeek: number,
): { platform: PlatformState; resetPlanIds: string[] } => {
    const contractsById = new Map(platform.ai!.rightsContracts.flatMap(projected => {
        const canonical = getStreamingRightsContract(world.streamingRightsContracts, projected.id);
        return canonical ? [[canonical.id, canonical] as const] : [];
    }));
    const resetPlanIds: string[] = [];
    const decisions: PlatformAiDecisionRecord[] = [];
    const slate = platform.ai!.slate.map(plan => {
        if (scheduleWindowIsValid(plan, contractsById)) return plan;
        resetPlanIds.push(plan.id);
        decisions.push({
            id: createDeterministicId('platform_ai_decision', platform.id, plan.id, 'RIGHTS_SCHEDULE_RESET'),
            absoluteWeek,
            type: 'RIGHTS_SCHEDULE_RESET',
            summary: `${plan.title} returned to rights planning.`,
            reason: 'Its signed contract does not cover the complete scheduled release window.',
            cashImpactMillions: 0,
        });
        return {
            ...plan,
            status: 'RIGHTS_READY' as const,
            localizationReadyAtAbsoluteWeek: null,
            premiereAtAbsoluteWeek: null,
            releasePattern: null,
            releaseEntries: [],
            scheduledAtAbsoluteWeek: null,
        };
    });
    if (!resetPlanIds.length) return { platform, resetPlanIds };
    return {
        platform: {
            ...platform,
            ai: {
                ...platform.ai!,
                slate,
                decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, decisions),
            },
        },
        resetPlanIds,
    };
};

const promoteObservedRenewalPayments = (platform: PlatformState): PlatformState => {
    const obligationsById = new Map(platform.ai!.pendingOneTimeObligations.map(obligation => [
        obligation.id,
        obligation,
    ]));
    let changed = false;
    const rightsRenewals = platform.ai!.rightsRenewals.map(record => {
        if (record.status !== 'PENDING_PAYMENT' || record.paymentSettledAtAbsoluteWeek === null) return record;
        const obligation = obligationsById.get(record.obligationId);
        if (
            obligation?.status !== 'SETTLED'
            || obligation.settledWeek !== record.paymentSettledAtAbsoluteWeek
        ) return record;
        changed = true;
        return { ...record, status: 'PAYMENT_SETTLED' as const };
    });
    return changed ? { ...platform, ai: { ...platform.ai!, rightsRenewals } } : platform;
};

const activateSettledRenewals = (
    input: PlatformAiRightsLifecycleInput,
    platform: PlatformState,
): { platform: PlatformState; activatedRenewalLicenseIds: string[] } => {
    let nextPlatform = platform;
    const activatedRenewalLicenseIds: string[] = [];
    const candidateIds = nextPlatform.ai!.rightsRenewals
        .filter(record => record.status === 'PAYMENT_SETTLED' && input.absoluteWeek >= record.nextStartsAtAbsoluteWeek)
        .map(record => record.id)
        .sort();
    for (const recordId of candidateIds) {
        const record = nextPlatform.ai!.rightsRenewals.find(candidate => candidate.id === recordId);
        if (!record) continue;
        const previousProjection = nextPlatform.ai!.rightsContracts.find(contract => contract.id === record.previousLicenseId);
        const previous = previousProjection
            ? getStreamingRightsContract(input.world.streamingRightsContracts, previousProjection.id)
            : null;
        const sourceProject = input.world.projects.find(project => project.id === record.sourceProjectId);
        if (!previous || !sourceProject) continue;
        const renewalLicenseId = getPlatformAiRightsRenewalContractId(
            record.previousLicenseId,
            record.nextStartsAtAbsoluteWeek,
        );
        const existingRenewal = nextPlatform.ai!.rightsContracts.find(contract => contract.id === renewalLicenseId);
        if (existingRenewal) continue;
        const worldWithCurrentPlatform = updatePlatform(input.world, input.platformId, nextPlatform);
        const availability = validateStreamingRightsAvailability({
            player: input.player,
            world: worldWithCurrentPlatform,
            sourceProjectId: record.sourceProjectId,
            buyerPlatformId: input.platformId,
            territory: previous.territory,
            countryIds: previous.countryIds || [],
            windowType: previous.windowType || 'SECOND_WINDOW',
            exclusivity: previous.exclusivity,
            startsAtAbsoluteWeek: record.nextStartsAtAbsoluteWeek,
            expiresAtAbsoluteWeek: renewalContractExpiry(record),
            excludeLicenseIds: [previous.id],
        });
        if (!availability.available) continue;
        const renewal = createStreamingLicenseContract({
            id: renewalLicenseId,
            sourceProject,
            buyerPlatformId: input.platformId,
            platformContentPlanId: record.platformContentPlanId,
            cataloguePackageId: previous.cataloguePackageId || null,
            contentSource: previous.contentSource,
            licensorName: previous.licensorName,
            territory: previous.territory,
            countryIds: previous.countryIds || [],
            durationWeeks: record.durationWeeks,
            exclusivity: previous.exclusivity,
            minimumGuarantee: millionsToFullCurrency(record.minimumGuaranteeMillions),
            platformRevenueShare: previous.platformRevenueShare,
            signedAtAbsoluteWeek: input.absoluteWeek,
            startsAtAbsoluteWeek: record.nextStartsAtAbsoluteWeek,
            status: 'ACTIVE',
            origin: 'RENEWAL',
            sellerType: previous.sellerType || 'STUDIO' as StreamingRightsSellerType,
            sellerPlatformId: previous.sellerPlatformId || null,
            windowType: previous.windowType || 'SECOND_WINDOW' as StreamingRightsWindowType,
            permanentPurchase: false,
            marketingGuarantee: previous.marketingGuarantee,
            viewershipBonusThreshold: previous.viewershipBonusThreshold,
            viewershipBonusAmount: previous.viewershipBonusAmount,
            renewalOption: previous.renewalOption,
            sublicensingAllowed: previous.sublicensingAllowed,
            sequelRightsIncluded: previous.sequelRightsIncluded,
            changeOfControl: previous.changeOfControl,
            cancellationPenalty: previous.cancellationPenalty,
            renewedFromLicenseId: previous.id,
        });
        if (!hasCanonicalActiveRightAt(renewal, record.nextStartsAtAbsoluteWeek)) continue;
        const contractedRecord: PlatformAiRightsRenewalRecord = {
            ...record,
            status: 'CONTRACTED',
            renewalLicenseId: renewal.id,
            activatedAtAbsoluteWeek: input.absoluteWeek,
        };
        const rightsContracts = [...nextPlatform.ai!.rightsContracts, renewal];
        const rightsRenewals = nextPlatform.ai!.rightsRenewals.map(candidate => (
            candidate.id === record.id ? contractedRecord : candidate
        ));
        nextPlatform = {
            ...nextPlatform,
            ai: {
                ...nextPlatform.ai!,
                rightsContracts,
                rightsRenewals,
                pendingOneTimeObligations: reconcilePlatformAiRightsRenewalObligations(
                    nextPlatform.ai!.pendingOneTimeObligations,
                    rightsRenewals,
                ),
                slate: nextPlatform.ai!.slate.map(plan => plan.id === record.platformContentPlanId
                    ? {
                        ...plan,
                        rightsContractIds: Array.from(new Set([...plan.rightsContractIds, renewal.id])),
                    }
                    : plan),
                decisionHistory: appendPlatformAiDecisions(nextPlatform.ai!.decisionHistory, [
                    renewalDecision(input.platformId, contractedRecord, input.absoluteWeek, 'RIGHTS_RENEWAL_ACTIVATED'),
                ]),
            },
        };
        activatedRenewalLicenseIds.push(renewal.id);
    }
    return { platform: nextPlatform, activatedRenewalLicenseIds };
};

export const progressPlatformAiRightsLifecycle = (
    input: PlatformAiRightsLifecycleInput,
): ProgressPlatformAiRightsLifecycleResult => {
    if (resolvePlatformController(input.player, input.platformId) === 'PLAYER') {
        return {
            world: input.world,
            changed: false,
            expiredLicenseIds: [],
            resetPlanIds: [],
            activatedRenewalLicenseIds: [],
            queuedRenewalIds: [],
            reason: 'PLAYER_CONTROLLED',
        };
    }
    const sourcePlatform = input.world.platforms?.[input.platformId];
    if (!sourcePlatform) {
        return {
            world: input.world,
            changed: false,
            expiredLicenseIds: [],
            resetPlanIds: [],
            activatedRenewalLicenseIds: [],
            queuedRenewalIds: [],
            reason: 'PLATFORM_NOT_FOUND',
        };
    }
    let platform = normalizePlatformAiState(sourcePlatform, input.player.id, input.absoluteWeek);
    const expiredLicenseIds: string[] = [];
    const rightsContracts = platform.ai!.rightsContracts.map(contract => {
        if (contract.status !== 'ACTIVE' || input.absoluteWeek <= contract.expiresAtAbsoluteWeek) return contract;
        expiredLicenseIds.push(contract.id);
        return { ...contract, status: 'EXPIRED' as const };
    });
    if (expiredLicenseIds.length) {
        platform = { ...platform, ai: { ...platform.ai!, rightsContracts } };
    }
    const expiredCanonicalRegistry = expiredLicenseIds.reduce((registry, contractId) => {
        const canonical = registry?.[contractId];
        if (!canonical || canonical.status !== 'ACTIVE') return registry;
        return { ...registry, [contractId]: { ...canonical, status: 'EXPIRED' as const } };
    }, input.world.streamingRightsContracts);
    let world = updatePlatform(
        { ...input.world, streamingRightsContracts: expiredCanonicalRegistry },
        input.platformId,
        platform,
    );
    const reset = resetInvalidSchedules(world, platform, input.absoluteWeek);
    platform = reset.platform;
    platform = promoteObservedRenewalPayments(platform);
    world = updatePlatform(world, input.platformId, platform);
    const activated = activateSettledRenewals({ ...input, world }, platform);
    platform = activated.platform;
    world = updatePlatform(world, input.platformId, platform);
    for (const contractId of activated.activatedRenewalLicenseIds) {
        const contract = platform.ai!.rightsContracts.find(candidate => candidate.id === contractId);
        if (!contract) continue;
        const registration = registerStreamingRightsContract(
            world.streamingRightsContracts,
            createStreamingRightsContractFromLicense({
                license: contract,
                buyer: {
                    type: 'AI_PLATFORM',
                    id: input.platformId,
                    name: platform.name,
                    platformId: input.platformId,
                },
                guaranteeDisposition: 'PAID',
                settledAtAbsoluteWeek: input.absoluteWeek,
            }),
        );
        world = { ...world, streamingRightsContracts: registration.registry };
    }
    const queuedRenewalIds: string[] = [];
    const alreadyQueuedLicenseIds = new Set(platform.ai!.rightsRenewals.map(record => record.previousLicenseId));
    const dueLicenseIds = platform.ai!.rightsContracts
        .filter(contract => (
            contract.renewalOption
            && !contract.permanentPurchase
            && input.absoluteWeek >= contract.expiresAtAbsoluteWeek
            && !alreadyQueuedLicenseIds.has(contract.id)
            && !Object.values(world.streamingRightsCalendar?.renewalCases || {})
                .some(renewalCase => renewalCase.sourceContractId === contract.id)
        ))
        .map(contract => contract.id)
        .sort();
    for (const licenseId of dueLicenseIds) {
        const queued = queuePlatformAiRightsRenewal({ ...input, world, licenseId });
        if (!queued.changed || !queued.record) continue;
        world = queued.world;
        queuedRenewalIds.push(queued.record.id);
    }
    const changed = expiredLicenseIds.length > 0
        || reset.resetPlanIds.length > 0
        || activated.activatedRenewalLicenseIds.length > 0
        || queuedRenewalIds.length > 0
        || platform !== sourcePlatform;
    if (!changed) world = input.world;
    return {
        world,
        changed,
        expiredLicenseIds,
        resetPlanIds: reset.resetPlanIds,
        activatedRenewalLicenseIds: activated.activatedRenewalLicenseIds,
        queuedRenewalIds,
    };
};
