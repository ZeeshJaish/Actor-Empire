import assert from 'node:assert/strict';
import {
    INITIAL_PLAYER,
    type Player,
    type StreamingRightsContract,
} from '../types';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
} from '../services/streamingRightsCore';
import {
    buildStreamingRightsRenewalOffer,
    classifyStreamingRightsRenewalControl,
    getStreamingRightsCalendar,
    normalizeStreamingRightsCalendarState,
    normalizeStreamingRightsManagementState,
    processStreamingRightsCalendarWeek,
    resolveStreamingRightsRenewal,
    takeControlOfStreamingRightsRenewal,
} from '../services/streamingRightsCalendar';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { settleStreamingContractRoyaltyForPlayer } from '../services/streamingContractSettlement';
import { progressPlatformAiRightsLifecycle } from '../services/platformAi/platformAiRightsLifecycle';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { openStreamingRightsRenewal, signStreamingRightsDeal } from '../services/streamingRightsMarketplace';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingRightsCalendar, {
    getStreamingRightsProjectLine,
    getStreamingRightsTimingLabel,
} from '../components/StreamingRightsCalendar';

const clonePlayer = (): Player => structuredClone(INITIAL_PLAYER);

const makeContract = (input: {
    id: string;
    projectId?: string;
    startsAtAbsoluteWeek?: number;
    durationWeeks?: number;
    permanent?: boolean;
    countryIds?: string[];
}): StreamingRightsContract => {
    const startsAtAbsoluteWeek = input.startsAtAbsoluteWeek ?? 0;
    const permanent = input.permanent ?? false;
    const license = createStreamingLicenseContract({
        id: input.id,
        sourceProject: {
            id: input.projectId || `project-${input.id}`,
            title: input.permanent ? 'Forever Picture' : 'Monsoon City',
            mediaType: 'MOVIE',
            genre: 'DRAMA',
        },
        buyerPlatformId: 'NETFLIX',
        platformContentPlanId: null,
        cataloguePackageId: null,
        licensorName: 'Empire Studios',
        territory: input.countryIds?.length ? 'MULTI_REGION' : 'GLOBAL',
        countryIds: input.countryIds || [],
        durationWeeks: input.durationWeeks ?? 52,
        exclusivity: 'EXCLUSIVE',
        minimumGuarantee: 100_000_000,
        platformRevenueShare: 75,
        signedAtAbsoluteWeek: startsAtAbsoluteWeek,
        startsAtAbsoluteWeek,
        status: 'ACTIVE',
        origin: permanent ? 'CATALOGUE_ACQUISITION' : 'STUDIO_MARKET',
        sellerType: 'STUDIO',
        sellerPlatformId: null,
        windowType: permanent ? 'PERMANENT' : 'FIRST_WINDOW',
        permanentPurchase: permanent,
        renewalOption: !permanent,
        sublicensingAllowed: false,
        sequelRightsIncluded: false,
        changeOfControl: 'NOTICE',
    });
    return createStreamingRightsContractFromLicense({
        license,
        seller: {
            type: 'PLAYER_STUDIO',
            id: 'empire-studios',
            name: 'Empire Studios',
            platformId: null,
        },
        buyer: {
            type: 'AI_PLATFORM',
            id: 'NETFLIX',
            name: 'Netflix',
            platformId: 'NETFLIX',
        },
        guaranteeDisposition: 'PAID',
        settledAtAbsoluteWeek: startsAtAbsoluteWeek,
    });
};

const runClockAndPersistenceAudit = (): void => {
    const expiring = makeContract({ id: 'contract-expiring', countryIds: ['IN', 'US'] });
    const permanent = makeContract({ id: 'contract-permanent', permanent: true });
    const player = clonePlayer();
    player.world = normalizeWorldPlatformAi(player, player.world, 0);
    player.world.streamingRightsContracts = {
        [expiring.id]: expiring,
        [permanent.id]: permanent,
    };
    player.world.platforms!.NETFLIX.ai!.rightsContracts = [
        { ...expiring },
        { ...permanent },
    ];

    const management = normalizeStreamingRightsManagementState(undefined);
    assert.equal(management.controlMode, 'CUSTOM', 'Custom Control must be the migration-safe default');
    assert.equal(management.policy.noticeWeeks, 8, 'the default renewal watch window should open eight weeks early');

    const normalizedEmpty = normalizeStreamingRightsCalendarState(undefined);
    assert.deepEqual(normalizedEmpty.renewalCases, {}, 'missing saves should normalize to an empty case registry');
    assert.equal(normalizedEmpty.lastProcessedAbsoluteWeek, -1);

    const week44 = processStreamingRightsCalendarWeek(player, 44);
    assert.equal(week44.processed, true);
    assert.equal(week44.createdCaseIds.length, 1, 'only the expiring contract should create a renewal case');
    const caseId = week44.createdCaseIds[0];
    const renewalCase = week44.player.world.streamingRightsCalendar!.renewalCases[caseId];
    assert.equal(renewalCase.sourceContractId, expiring.id);
    assert.deepEqual(renewalCase.countryIds, ['IN', 'US'], 'the case must preserve exact legal scope');
    assert.equal(renewalCase.renewalStartsAtAbsoluteWeek, 53);
    assert.equal(renewalCase.decisionDeadlineAbsoluteWeek, 52);

    const replay = processStreamingRightsCalendarWeek(week44.player, 44);
    assert.equal(replay.processed, false, 'replaying one week must be a no-op');
    assert.equal(Object.keys(replay.player.world.streamingRightsCalendar!.renewalCases).length, 1);

    const week52 = processStreamingRightsCalendarWeek(replay.player, 52);
    assert.equal(week52.player.world.streamingRightsContracts![expiring.id].status, 'ACTIVE', 'rights stay active through the listed expiry week');
    assert.equal(
        week52.player.world.platforms!.NETFLIX.ai!.rightsContracts.find(row => row.id === expiring.id)?.status,
        'ACTIVE',
        'AI projection must agree during the listed expiry week',
    );

    const week53 = processStreamingRightsCalendarWeek(week52.player, 53);
    assert.equal(week53.player.world.streamingRightsContracts![expiring.id].status, 'EXPIRED');
    assert.equal(week53.expiredContractIds.includes(expiring.id), true);
    assert.equal(
        week53.player.world.platforms!.NETFLIX.ai!.rightsContracts.find(row => row.id === expiring.id)?.status,
        'EXPIRED',
        'AI projection cannot retain an expired canonical contract',
    );
    assert.equal(week53.player.world.streamingRightsContracts![permanent.id].status, 'ACTIVE');
    assert.equal(
        Object.values(week53.player.world.streamingRightsCalendar!.renewalCases)
            .some(candidate => candidate.sourceContractId === permanent.id),
        false,
        'permanent rights never enter the renewal calendar',
    );

    const calendar = getStreamingRightsCalendar(week53.player, 53);
    assert.equal(calendar.groups.recentlyCompleted.some(item => item.sourceContractId === expiring.id), true);
    assert.equal(calendar.summary.permanent, 1);
};

const runMigrationAndCompactionAudit = (): void => {
    const contract = makeContract({ id: 'contract-save', countryIds: ['IN'] });
    const player = clonePlayer();
    player.world.streamingRightsContracts = { [contract.id]: contract };
    const processed = processStreamingRightsCalendarWeek(player, 44).player;
    const caseId = Object.keys(processed.world.streamingRightsCalendar!.renewalCases)[0];
    const rawDigests = Array.from({ length: 35 }, (_, index) => ({
        id: `legacy-digest-${index}`,
        absoluteWeek: index,
        actionRequired: 0,
        approachingExpiry: 1,
        delegatedRenewals: 0,
        returnedToMarket: 0,
        expired: 0,
        summary: `Legacy digest ${index}`,
    }));
    const corrupted = {
        ...processed,
        streamingRightsManagement: {
            ...processed.streamingRightsManagement!,
            controlMode: 'INVALID_MODE',
        },
        world: {
            ...processed.world,
            streamingRightsCalendar: {
                ...processed.world.streamingRightsCalendar!,
                digests: rawDigests,
            },
        },
    } as unknown as Player;

    const migrated = migratePlayerSave(corrupted);
    assert.equal(migrated.streamingRightsManagement!.controlMode, 'CUSTOM');
    assert.equal(Object.keys(migrated.world.streamingRightsCalendar!.renewalCases).length, 1);
    assert.equal(migrated.world.streamingRightsCalendar!.renewalCases[caseId].sourceContractId, contract.id);
    assert.ok(migrated.world.streamingRightsCalendar!.digests.length <= 20, 'migration must bound digest history');

    const compacted = compactPlayerForPersistence(migrated);
    assert.ok(compacted.world.streamingRightsCalendar!.digests.length <= 20, 'save compaction must keep the calendar bounded');
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(compacted)) as Player);
    assert.deepEqual(
        reloaded.world.streamingRightsCalendar!.renewalCases[caseId],
        compacted.world.streamingRightsCalendar!.renewalCases[caseId],
        'a persisted renewal case must reload without rerolling its saved facts',
    );
};

const playerWithAiPerformance = (input: {
    contract: StreamingRightsContract;
    commercialScore: number;
    quality: number;
    subscriberImpactMillions: number;
    viewsMillions: number;
    awards: number;
    cashReserveMillions?: number;
    blocked?: boolean;
}): Player => {
    const player = clonePlayer();
    player.world = normalizeWorldPlatformAi(player, player.world, 0);
    player.world.streamingRightsContracts = { [input.contract.id]: input.contract };
    const netflix = player.world.platforms!.NETFLIX;
    netflix.cashReserve = input.cashReserveMillions ?? 5_000;
    netflix.ai!.rightsContracts = [{ ...input.contract }];
    netflix.ai!.releaseMemory = [{
        projectId: input.contract.sourceProjectId,
        releasedAtAbsoluteWeek: 20,
        genre: 'DRAMA',
        targetAudience: 'PG-13',
        leadActorId: null,
        directorId: null,
        quality: input.quality,
        commercialScore: input.commercialScore,
        prestigeScore: input.quality,
        subscriberImpactMillions: input.subscriberImpactMillions,
        outcome: input.commercialScore >= 70 ? 'HIT' : input.commercialScore < 35 ? 'FLOP' : 'SOLID',
        awardWins: input.awards,
        observedAwardKeys: [],
        regionalResults: [{
            countryId: 'IN',
            localizationState: 'DUBBED',
            reachMultiplier: 1,
            appreciationMultiplier: 1,
            completionMultiplier: 1,
            viewsMillions: input.viewsMillions,
            commercialScore: input.commercialScore,
            subscriberImpactMillions: input.subscriberImpactMillions,
        }],
    }];
    if (input.blocked) {
        netflix.ai!.status = 'DISTRESSED';
        netflix.ai!.spendingRestrictions = {
            source: 'RESTRUCTURE',
            blocksNewBids: true,
            blocksNewGreenlights: true,
            blocksNewResearch: false,
            blocksExpansion: true,
            expiresAtAbsoluteWeek: 60,
        };
    }
    player.world.projects = [{
        id: input.contract.sourceProjectId,
        name: input.contract.titleAtSigning,
        genre: 'DRAMA',
        rating: input.quality / 10,
        finalQuality: input.quality,
    } as any];
    return player;
};

const runValuationAndControlAudit = (): void => {
    const strongContract = makeContract({ id: 'contract-strong', projectId: 'project-strong', countryIds: ['IN', 'US'] });
    const weakContract = makeContract({ id: 'contract-weak', projectId: 'project-weak', countryIds: ['IN', 'US'] });
    strongContract.cumulativeRoyaltyPaid = 32_000_000;
    strongContract.cumulativeRoyaltyAccrued = 38_000_000;
    const strongPlayer = playerWithAiPerformance({
        contract: strongContract,
        commercialScore: 91,
        quality: 88,
        subscriberImpactMillions: 4.2,
        viewsMillions: 44,
        awards: 3,
    });
    strongPlayer.world.streamingRoyaltySettlements = {
        strong: {
            id: 'settlement-strong',
            idempotencyKey: 'settlement-strong',
            contractId: strongContract.id,
            projectId: strongContract.sourceProjectId,
            buyerPlatformId: 'NETFLIX',
            sellerStudioId: 'empire-studios',
            absoluteWeek: 40,
            adjustedGrossReceipts: 260_000_000,
            grossRoyaltyAccrued: 38_000_000,
            royaltyPaid: 32_000_000,
            recoupmentRemaining: 0,
            capRemaining: null,
        },
    };
    const weakPlayer = playerWithAiPerformance({
        contract: weakContract,
        commercialScore: 21,
        quality: 34,
        subscriberImpactMillions: -0.8,
        viewsMillions: 2,
        awards: 0,
    });

    const strong = buildStreamingRightsRenewalOffer(strongPlayer, strongContract, 44);
    const weak = buildStreamingRightsRenewalOffer(weakPlayer, weakContract, 44);
    assert.equal(strong.offerDisposition, 'OFFERED');
    assert.equal(weak.offerDisposition, 'OFFERED', 'a weak title with a renewal option may receive reduced terms');
    assert.ok(strong.performance.performanceScore > weak.performance.performanceScore);
    assert.ok(strong.proposedEconomics!.minimumGuarantee > weak.proposedEconomics!.minimumGuarantee);
    assert.ok(strong.proposedEconomics!.minimumGuarantee > strongContract.minimumGuarantee);
    assert.ok(weak.proposedEconomics!.minimumGuarantee < weakContract.minimumGuarantee);
    assert.notEqual(strong.proposedEconomics!.minimumGuarantee, 108_000_000, 'renewals must not use the old fixed 8% uplift');

    const blockedPlayer = playerWithAiPerformance({
        contract: strongContract,
        commercialScore: 91,
        quality: 88,
        subscriberImpactMillions: 4.2,
        viewsMillions: 44,
        awards: 3,
        cashReserveMillions: 20,
        blocked: true,
    });
    const blocked = buildStreamingRightsRenewalOffer(blockedPlayer, strongContract, 44);
    assert.equal(blocked.offerDisposition, 'DECLINED', 'a financially restricted incumbent cannot make a new renewal offer');
    assert.equal(blocked.proposedEconomics, null);

    const routineManagement = normalizeStreamingRightsManagementState({
        controlMode: 'CUSTOM',
        policy: { protectGlobalExclusives: true },
    });
    const routine = classifyStreamingRightsRenewalControl(
        weakPlayer,
        weakContract,
        weak,
        routineManagement,
    );
    assert.equal(routine.requiresApproval, false, 'default Custom Control should delegate a routine bounded title');
    assert.match(routine.delegatedReason || '', /Custom Control/);

    const protectedContract = { ...strongContract, territory: 'GLOBAL' as const, countryIds: [] };
    const protectedDecision = classifyStreamingRightsRenewalControl(
        strongPlayer,
        protectedContract,
        strong,
        routineManagement,
    );
    assert.equal(protectedDecision.requiresApproval, true);
    assert.ok(protectedDecision.protectionReasons.includes('WORLDWIDE_EXCLUSIVE'));

    const full = classifyStreamingRightsRenewalControl(
        weakPlayer,
        weakContract,
        weak,
        normalizeStreamingRightsManagementState({ controlMode: 'FULL' }),
    );
    assert.equal(full.requiresApproval, true);
    assert.ok(full.protectionReasons.includes('FULL_CONTROL'));

    const strategyPlayer = {
        ...weakPlayer,
        streamingRightsManagement: normalizeStreamingRightsManagementState({
            controlMode: 'STRATEGY',
            policy: { preference: 'RENEW_WINNERS', protectGlobalExclusives: false },
        }),
    };
    const opened = processStreamingRightsCalendarWeek(strategyPlayer, 44).player;
    const caseId = Object.keys(opened.world.streamingRightsCalendar!.renewalCases)[0];
    const openedCase = opened.world.streamingRightsCalendar!.renewalCases[caseId];
    assert.equal(openedCase.offerDisposition, 'OFFERED');
    assert.equal(openedCase.status, 'OFFER_AVAILABLE');
    assert.match(openedCase.delegatedReason || '', /Strategy Mode/);

    const delegated = processStreamingRightsCalendarWeek(opened, 45).player;
    const delegatedCase = delegated.world.streamingRightsCalendar!.renewalCases[caseId];
    assert.equal(delegatedCase.outcome, 'LET_EXPIRE', 'the saved weak-title threshold should resolve a routine Strategy case');
    assert.equal(delegatedCase.status, 'LETTING_EXPIRE');

    const takeover = takeControlOfStreamingRightsRenewal(opened, caseId, 45);
    assert.equal(takeover.changed, true);
    assert.equal(takeover.player.world.streamingRightsCalendar!.renewalCases[caseId].status, 'ACTION_REQUIRED');
    assert.ok(takeover.player.streamingRightsManagement!.manualContractIds.includes(weakContract.id));
    assert.equal(takeControlOfStreamingRightsRenewal(takeover.player, caseId, 45).changed, false, 'manual takeover must be replay-safe');
};

const runAtomicRenewalAndReversionAudit = (): void => {
    const source = makeContract({ id: 'contract-atomic', projectId: 'project-atomic', countryIds: ['IN', 'US'] });
    source.platformContentPlanId = 'plan-atomic';
    source.cumulativeRoyaltyPaid = 20_000_000;
    const player = playerWithAiPerformance({
        contract: source,
        commercialScore: 86,
        quality: 84,
        subscriberImpactMillions: 3.1,
        viewsMillions: 35,
        awards: 2,
    });
    player.world.platforms!.NETFLIX.ai!.rightsContracts = [{ ...source }];
    player.world.platforms!.NETFLIX.ai!.slate = [{
        id: 'plan-future-renewal-window',
        platformId: 'NETFLIX',
        status: 'SCHEDULED',
        sourceProjectIds: [source.sourceProjectId],
        rightsContractIds: [source.id],
        releaseEntries: [],
    } as any];
    player.businesses = [{
        id: 'empire-studios',
        type: 'PRODUCTION_HOUSE',
        name: 'Empire Studios',
        balance: 10_000_000,
        stats: { weeklyRevenue: 0, weeklyProfit: 0, lifetimeRevenue: 0 },
        studioState: { financeLedger: [] },
    } as any];

    const expiryWeekRoyalty = settleStreamingContractRoyaltyForPlayer(player, {
        contractId: source.id,
        absoluteWeek: 52,
        attribution: {
            projectId: source.sourceProjectId,
            contributionWeight: 1,
            attributedSubscriptionRevenue: 20_000_000,
            attributedAdvertisingRevenue: 0,
            attributedTransactionalRevenue: 0,
            allowedDeductions: 0,
            adjustedGrossReceipts: 20_000_000,
        },
    });
    assert.equal(expiryWeekRoyalty.changed, true, 'royalty settlement remains valid during the listed expiry week');

    const opened = processStreamingRightsCalendarWeek(expiryWeekRoyalty.player, 44).player;
    const caseId = Object.keys(opened.world.streamingRightsCalendar!.renewalCases)[0];
    const offered = opened.world.streamingRightsCalendar!.renewalCases[caseId];
    assert.equal(offered.offerDisposition, 'OFFERED');
    const guarantee = offered.proposedEconomics!.minimumGuarantee;
    const cashBeforeMillions = opened.world.platforms!.NETFLIX.cashReserve;
    const studioBalanceBefore = opened.businesses[0].balance;
    const accepted = resolveStreamingRightsRenewal(opened, {
        caseId,
        action: 'ACCEPT_RENEWAL',
        absoluteWeek: 44,
    });
    assert.equal(accepted.changed, true);
    assert.equal(accepted.reason, 'RENEWED');
    const replacement = accepted.replacementContractId
        ? accepted.player.world.streamingRightsContracts![accepted.replacementContractId]
        : null;
    assert.ok(replacement, 'acceptance must create a canonical replacement');
    assert.equal(replacement!.startsAtAbsoluteWeek, 53);
    assert.equal(replacement!.renewedFromLicenseId, source.id);
    assert.equal(replacement!.territory, source.territory);
    assert.deepEqual(replacement!.countryIds, source.countryIds);
    assert.equal(accepted.player.world.streamingRightsContracts![source.id].status, 'ACTIVE');
    assert.equal(accepted.player.world.platforms!.NETFLIX.cashReserve, cashBeforeMillions - guarantee / 1_000_000);
    assert.equal(accepted.player.businesses[0].balance, studioBalanceBefore + guarantee);
    assert.equal(
        accepted.player.world.platforms!.NETFLIX.ai!.rightsContracts.some(contract => contract.id === replacement!.id),
        true,
        'the AI buyer projection must receive the same canonical replacement',
    );
    const beforeReplacementStarts = processStreamingRightsCalendarWeek(accepted.player, 45).player;
    assert.equal(
        beforeReplacementStarts.world.platforms!.NETFLIX.ai!.slate[0].status,
        'SCHEDULED',
        'a scheduled plan using a signed future renewal must not be invalidated before that next window starts',
    );

    const replay = resolveStreamingRightsRenewal(accepted.player, {
        caseId,
        action: 'ACCEPT_RENEWAL',
        absoluteWeek: 44,
    });
    assert.equal(replay.changed, false);
    assert.equal(replay.player.world.platforms!.NETFLIX.cashReserve, accepted.player.world.platforms!.NETFLIX.cashReserve);
    assert.equal(Object.values(replay.player.world.streamingRightsContracts!).filter(contract => contract.renewedFromLicenseId === source.id).length, 1);

    const week53 = processStreamingRightsCalendarWeek(accepted.player, 53).player;
    assert.equal(week53.world.streamingRightsContracts![source.id].status, 'EXPIRED');
    assert.equal(week53.world.streamingRightsContracts![replacement!.id].status, 'ACTIVE');
    const postExpiryRoyalty = settleStreamingContractRoyaltyForPlayer(week53, {
        contractId: source.id,
        absoluteWeek: 53,
        attribution: {
            projectId: source.sourceProjectId,
            contributionWeight: 1,
            attributedSubscriptionRevenue: 20_000_000,
            attributedAdvertisingRevenue: 0,
            attributedTransactionalRevenue: 0,
            allowedDeductions: 0,
            adjustedGrossReceipts: 20_000_000,
        },
    });
    assert.equal(postExpiryRoyalty.changed, false);

    const conflictSource = makeContract({ id: 'contract-conflict-source', projectId: 'project-conflict', countryIds: ['IN'] });
    const conflictPlayer = playerWithAiPerformance({
        contract: conflictSource,
        commercialScore: 75,
        quality: 75,
        subscriberImpactMillions: 1,
        viewsMillions: 15,
        awards: 0,
    });
    const conflictOpened = processStreamingRightsCalendarWeek(conflictPlayer, 44).player;
    const conflictCaseId = Object.keys(conflictOpened.world.streamingRightsCalendar!.renewalCases)[0];
    const blocking = makeContract({
        id: 'contract-next-window-blocker',
        projectId: conflictSource.sourceProjectId,
        startsAtAbsoluteWeek: 53,
        durationWeeks: 52,
        countryIds: ['IN'],
    });
    blocking.buyer = { type: 'AI_PLATFORM', id: 'DISNEY_PLUS', name: 'Disney+', platformId: 'DISNEY_PLUS' };
    blocking.buyerPlatformId = 'DISNEY_PLUS';
    conflictOpened.world.streamingRightsContracts![blocking.id] = blocking;
    const cashBeforeConflict = conflictOpened.world.platforms!.NETFLIX.cashReserve;
    const conflict = resolveStreamingRightsRenewal(conflictOpened, {
        caseId: conflictCaseId,
        action: 'ACCEPT_RENEWAL',
        absoluteWeek: 44,
    });
    assert.equal(conflict.changed, false);
    assert.equal(conflict.reason, 'RIGHTS_CONFLICT');
    assert.equal(conflict.player.world.platforms!.NETFLIX.cashReserve, cashBeforeConflict);
    assert.equal(Object.values(conflict.player.world.streamingRightsContracts!).filter(contract => contract.renewedFromLicenseId === conflictSource.id).length, 0);

    const ownedSource = {
        ...makeContract({ id: 'contract-owned-expiry', projectId: 'project-owned-expiry', countryIds: ['IN'] }),
        buyerPlatformId: null,
        buyer: {
            type: 'PLAYER_PLATFORM' as const,
            id: 'empire-plus',
            name: 'EMPIRE+',
            platformId: null,
        },
    };
    const ownedPlayer = clonePlayer();
    ownedPlayer.world.streamingRightsContracts = { [ownedSource.id]: ownedSource };
    ownedPlayer.ownedStreamingPlatform.catalogLicenses = [{ ...ownedSource }];
    ownedPlayer.ownedStreamingPlatform.catalogProjectIds = [ownedSource.sourceProjectId];
    ownedPlayer.ownedStreamingPlatform.launchSlate = {
        programmedAtAbsoluteWeek: 1,
        revision: 1,
        entries: [{
            id: 'slate-owned-expiry',
            projectId: ownedSource.sourceProjectId,
            title: ownedSource.titleAtSigning,
            source: 'LICENSED_WINDOW',
            projectType: 'MOVIE',
            genre: 'DRAMA',
            launchWeek: 1,
            releasePattern: 'SINGLE_PREMIERE',
            marketingPlan: { tier: 'STANDARD', spend: 0 } as any,
        }],
    };
    const ownedExpired = processStreamingRightsCalendarWeek(ownedPlayer, 53).player;
    assert.equal(ownedExpired.ownedStreamingPlatform.catalogLicenses[0].status, 'EXPIRED');
    assert.equal(ownedExpired.ownedStreamingPlatform.catalogProjectIds.includes(ownedSource.sourceProjectId), false);
    assert.equal(ownedExpired.ownedStreamingPlatform.launchSlate!.entries.some(entry => entry.projectId === ownedSource.sourceProjectId), false);

    const legacySource = makeContract({ id: 'contract-a4-vs-legacy', projectId: 'project-a4-vs-legacy', countryIds: ['IN'] });
    legacySource.platformContentPlanId = 'plan-a4-vs-legacy';
    const legacyPlayer = playerWithAiPerformance({
        contract: legacySource,
        commercialScore: 70,
        quality: 70,
        subscriberImpactMillions: 1,
        viewsMillions: 10,
        awards: 0,
    });
    legacyPlayer.world.platforms!.NETFLIX.ai!.rightsContracts = [{ ...legacySource }];
    const a4Managed = processStreamingRightsCalendarWeek(legacyPlayer, 44).player;
    const legacyProgress = progressPlatformAiRightsLifecycle({
        player: a4Managed,
        world: a4Managed.world,
        platformId: 'NETFLIX',
        absoluteWeek: 52,
    });
    assert.equal(legacyProgress.queuedRenewalIds.length, 0, 'legacy Platform AI must defer to the canonical A4 case');
};

const runGameLoopIntegrationAudit = async (): Promise<void> => {
    const player = clonePlayer();
    player.age = 20;
    player.currentWeek = 20;
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const contract = makeContract({
        id: 'contract-real-week-loop',
        projectId: 'project-real-week-loop',
        startsAtAbsoluteWeek: currentAbsoluteWeek - 52,
        durationWeeks: 52,
        countryIds: ['IN'],
    });
    assert.equal(contract.expiresAtAbsoluteWeek, currentAbsoluteWeek);
    player.world.streamingRightsContracts = { [contract.id]: contract };
    const result = await processGameWeek(player);
    assert.equal(
        result.player.world.streamingRightsContracts![contract.id].status,
        'EXPIRED',
        'the real weekly loop must process A4 at the beginning of the entered week',
    );
    assert.equal(
        result.player.world.streamingRightsCalendar!.lastProcessedAbsoluteWeek,
        currentAbsoluteWeek + 1,
    );
};

const runOwnedRenewalDeskAudit = (): void => {
    const contract = {
        ...makeContract({ id: 'contract-owned-renewal-desk', projectId: 'project-owned-renewal-desk', countryIds: ['IN'] }),
        buyerPlatformId: null,
        buyer: {
            type: 'PLAYER_PLATFORM' as const,
            id: 'empire-plus',
            name: 'EMPIRE+',
            platformId: null,
        },
    };
    const makeOwnedPlayer = (currentWeek: number): Player => {
        const player = clonePlayer();
        player.age = 1;
        player.currentWeek = currentWeek;
        player.ownedStreamingPlatform.treasuryCash = 1_000_000_000;
        player.ownedStreamingPlatform.catalogLicenses = [{ ...contract }];
        player.ownedStreamingPlatform.catalogProjectIds = [contract.sourceProjectId];
        player.world.streamingRightsContracts = { [contract.id]: contract };
        return player;
    };

    const early = openStreamingRightsRenewal(makeOwnedPlayer(44), contract.id);
    assert.equal(early.changed, false);
    assert.equal(early.reason, 'NOT_READY');
    assert.match(early.detail || '', /Week 44/);

    const inWindow = openStreamingRightsRenewal(makeOwnedPlayer(45), contract.id);
    assert.equal(inWindow.changed, true);
    assert.ok(inWindow.negotiation);
    const renewalCase = Object.values(inWindow.player.world.streamingRightsCalendar!.renewalCases)
        .find(candidate => candidate.sourceContractId === contract.id)!;
    assert.equal(inWindow.negotiation!.minimumGuarantee, renewalCase.proposedEconomics!.minimumGuarantee);
    assert.equal(inWindow.negotiation!.durationWeeks, renewalCase.proposedEconomics!.durationWeeks);
    assert.equal(inWindow.negotiation!.expiresAtAbsoluteWeek, renewalCase.decisionDeadlineAbsoluteWeek);
    assert.notEqual(inWindow.negotiation!.minimumGuarantee, 108_000_000);
    const platformCalendarMarkup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
        player: inWindow.player,
        context: 'PLATFORM',
        onUpdatePlayer: () => undefined,
    }));
    assert.match(platformCalendarMarkup, /EMPIRE\+ \/ RIGHTS EXCHANGE/);
    assert.match(platformCalendarMarkup, /Monsoon City/);
    assert.match(platformCalendarMarkup, /Accept renewal/);

    const readyPlayer: Player = {
        ...inWindow.player,
        ownedStreamingPlatform: {
            ...inWindow.player.ownedStreamingPlatform,
            rightsNegotiations: inWindow.player.ownedStreamingPlatform.rightsNegotiations.map(negotiation => (
                negotiation.id === inWindow.negotiation!.id
                    ? { ...negotiation, status: 'READY_TO_SIGN' as const }
                    : negotiation
            )),
        },
    };
    const treasuryBefore = readyPlayer.ownedStreamingPlatform.treasuryCash;
    const signed = signStreamingRightsDeal(readyPlayer, inWindow.negotiation!.id);
    assert.equal(signed.changed, true);
    const signedCase = Object.values(signed.player.world.streamingRightsCalendar!.renewalCases)
        .find(candidate => candidate.sourceContractId === contract.id)!;
    assert.equal(signedCase.outcome, 'ACCEPTED');
    assert.ok(signedCase.replacementContractId);
    assert.equal(
        signed.player.ownedStreamingPlatform.treasuryCash,
        treasuryBefore - inWindow.negotiation!.minimumGuarantee,
    );
    assert.equal(
        signed.player.world.streamingRightsContracts![signedCase.replacementContractId!].startsAtAbsoluteWeek,
        53,
    );
    const signedReplay = signStreamingRightsDeal(signed.player, inWindow.negotiation!.id);
    assert.equal(signedReplay.changed, false);
    assert.equal(signedReplay.player.ownedStreamingPlatform.treasuryCash, signed.player.ownedStreamingPlatform.treasuryCash);
};

const runCalendarSurfaceAudit = (): void => {
    const contract = makeContract({ id: 'contract-calendar-surface', projectId: 'project-calendar-surface' });
    const player = playerWithAiPerformance({
        contract,
        commercialScore: 82,
        quality: 80,
        subscriberImpactMillions: 2,
        viewsMillions: 22,
        awards: 1,
    });
    const opened = processStreamingRightsCalendarWeek(player, 44).player;
    const markup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
        player: opened,
        context: 'STUDIO',
        onUpdatePlayer: () => undefined,
        onClose: () => undefined,
    }));
    assert.match(markup, /Rights Office/);
    assert.match(markup, /Custom Control/);
    assert.match(markup, /Action required/);
    assert.match(markup, /Monsoon City/);
    assert.match(markup, /Accept renewal/);
    assert.match(markup, /Return to market/);
    assert.match(markup, /Let expire/);
    assert.doesNotMatch(markup, /best deal/i);

    const caseForContract = Object.values(opened.world.streamingRightsCalendar!.renewalCases)[0];
    assert.equal(getStreamingRightsTimingLabel(contract, 44, caseForContract), 'Decision required');
    assert.equal(
        getStreamingRightsTimingLabel(makeContract({ id: 'contract-label-permanent', permanent: true }), 44, null),
        'Permanent',
    );
    assert.equal(
        getStreamingRightsTimingLabel({ ...contract, renewalOption: false }, 44, null),
        'Leaving catalogue after Week 52',
    );

    const projectLine = getStreamingRightsProjectLine(opened, contract.sourceProjectId, 44);
    assert.equal(projectLine, 'Netflix · Worldwide exclusive · 8 weeks remaining');
};

const runGroupedDigestAndUrgentNoticeAudit = (): void => {
    const first = makeContract({ id: 'contract-digest-one', projectId: 'project-digest-one' });
    const second = makeContract({ id: 'contract-digest-two', projectId: 'project-digest-two' });
    const player = clonePlayer();
    player.world = normalizeWorldPlatformAi(player, player.world, 0);
    player.world.streamingRightsContracts = { [first.id]: first, [second.id]: second };
    player.world.platforms!.NETFLIX.ai!.rightsContracts = [{ ...first }, { ...second }];

    const opened = processStreamingRightsCalendarWeek(player, 44);
    assert.ok(opened.digest, 'the rights desk should create one grouped digest for the week');
    assert.equal(opened.digest!.actionRequired, 2);
    assert.equal(
        opened.player.world.streamingRightsCalendar!.digests.filter(digest => digest.absoluteWeek === 44).length,
        1,
        'multiple contract changes in one week must collapse into one digest',
    );
    assert.equal(opened.player.inbox.filter(message => message.id.startsWith('rights-urgent:')).length, 0);

    const urgent = processStreamingRightsCalendarWeek(opened.player, 51);
    const urgentMessages = urgent.player.inbox.filter(message => message.id === 'rights-urgent:51');
    assert.equal(urgentMessages.length, 1, 'protected deadlines one week away should create one grouped inbox notice');
    assert.match(urgentMessages[0].subject, /2 rights decisions due/i);
    assert.equal(urgentMessages[0].type, 'RIGHTS_REPORT');
    assert.equal(
        urgent.player.world.streamingRightsCalendar!.urgentNoticeKeys.filter(key => key === 'rights-urgent:51').length,
        1,
    );

    const replay = processStreamingRightsCalendarWeek(urgent.player, 51);
    assert.equal(replay.processed, false);
    assert.equal(replay.player.inbox.filter(message => message.id === 'rights-urgent:51').length, 1);
};

const main = async (): Promise<void> => {
    runClockAndPersistenceAudit();
    runMigrationAndCompactionAudit();
    runValuationAndControlAudit();
    runAtomicRenewalAndReversionAudit();
    runOwnedRenewalDeskAudit();
    runCalendarSurfaceAudit();
    runGroupedDigestAndUrgentNoticeAudit();
    await runGameLoopIntegrationAudit();
    console.log('Streaming rights calendar Phase A4 audit passed.');
};

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
