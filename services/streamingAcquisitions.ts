import type {
    OwnedStreamingAcquisitionCase,
    OwnedStreamingAcquisitionIntegration,
    OwnedStreamingAcquisitionValuation,
    OwnedStreamingCinematicEvent,
    OwnedStreamingDiligenceIssue,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingRivalProfile,
    PlatformId,
    Player,
    StreamingAcquisitionCommitmentId,
    StreamingAcquisitionDealStructure,
    StreamingAcquisitionFundingSource,
    StreamingIntegrationMode,
    StreamingRegulatoryStrategy,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    STREAMING_RIVAL_TEMPLATES,
    getStreamingCompetitiveWorld,
} from './streamingCompetitiveWorld';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

export interface StreamingAcquisitionCommitmentDefinition {
    id: StreamingAcquisitionCommitmentId;
    label: string;
    detail: string;
    sellerSupport: number;
    boardSupport: number;
    regulatoryRelief: number;
    integrationCostPercent: number;
}

export interface StreamingIntegrationModeDefinition {
    id: StreamingIntegrationMode;
    label: string;
    thesis: string;
    integrationWeeks: number;
    reservePercent: number;
    weeklyCostPercent: number;
    subscriberRetentionPercent: number;
    catalogRetentionPercent: number;
    technologyRetentionPercent: number;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    reliabilityRisk: number;
}

export interface StreamingRegulatoryStrategyDefinition {
    id: StreamingRegulatoryStrategy;
    label: string;
    detail: string;
    remedyPercent: number;
    scrutinyRelief: number;
    subscriberRetentionPercent: number;
    catalogRetentionPercent: number;
    technologyRetentionPercent: number;
}

export interface StreamingAcquisitionTargetDossier {
    rival: OwnedStreamingRivalProfile;
    owned: boolean;
    activeCase: OwnedStreamingAcquisitionCase | null;
    strategicFit: number;
    thesis: string;
    pressure: string;
    estimatedValue: number;
}

export interface StreamingAcquisitionCommandView {
    available: boolean;
    platform: OwnedStreamingPlatformState;
    targets: StreamingAcquisitionTargetDossier[];
    cases: OwnedStreamingAcquisitionCase[];
    integrations: OwnedStreamingAcquisitionIntegration[];
    activeCase: OwnedStreamingAcquisitionCase | null;
}

export interface StreamingAcquisitionActionResult {
    player: Player;
    changed: boolean;
    reason?: string;
    caseId?: string;
}

export interface StreamingAcquisitionWeeklyEffects {
    weeklyOperatingCost: number;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    reliabilityRisk: number;
    activeIntegrations: OwnedStreamingAcquisitionIntegration[];
}

export const STREAMING_ACQUISITION_COMMITMENTS: StreamingAcquisitionCommitmentDefinition[] = [
    {
        id: 'SERVICE_CONTINUITY',
        label: 'Service continuity',
        detail: 'Keep the acquired service available while accounts, billing and support are reconciled.',
        sellerSupport: 2,
        boardSupport: 5,
        regulatoryRelief: 8,
        integrationCostPercent: 0.004,
    },
    {
        id: 'EMPLOYEE_PROTECTION',
        label: 'Employee protection',
        detail: 'Fund a transition floor for core creative, product and infrastructure teams.',
        sellerSupport: 4,
        boardSupport: 7,
        regulatoryRelief: 10,
        integrationCostPercent: 0.006,
    },
    {
        id: 'CREATOR_GUARANTEE',
        label: 'Creator guarantee',
        detail: 'Honor active creator contracts and committed production windows.',
        sellerSupport: 6,
        boardSupport: 4,
        regulatoryRelief: 7,
        integrationCostPercent: 0.005,
    },
    {
        id: 'DATA_SEPARATION',
        label: 'Data separation',
        detail: 'Ring-fence viewer data until privacy and recommendation systems pass review.',
        sellerSupport: 1,
        boardSupport: 8,
        regulatoryRelief: 16,
        integrationCostPercent: 0.008,
    },
];

export const STREAMING_INTEGRATION_MODES: StreamingIntegrationModeDefinition[] = [
    { id: 'PRESERVE_BRAND', label: 'Preserve brand', thesis: 'Keep its identity, leadership rhythm and loyal audience intact.', integrationWeeks: 12, reservePercent: 0.035, weeklyCostPercent: 0.0018, subscriberRetentionPercent: 96, catalogRetentionPercent: 100, technologyRetentionPercent: 70, acquisitionRateDelta: 0.0014, churnRateDelta: -0.0006, reliabilityRisk: 0.01 },
    { id: 'SUB_PLATFORM', label: 'Operate as sub-platform', thesis: 'Connect identity and billing while maintaining a distinct programming service.', integrationWeeks: 10, reservePercent: 0.032, weeklyCostPercent: 0.0017, subscriberRetentionPercent: 94, catalogRetentionPercent: 100, technologyRetentionPercent: 78, acquisitionRateDelta: 0.0017, churnRateDelta: -0.0005, reliabilityRisk: 0.018 },
    { id: 'MERGE_CATALOGS', label: 'Merge catalogs', thesis: 'Make the acquired library the first visible source of combination value.', integrationWeeks: 8, reservePercent: 0.028, weeklyCostPercent: 0.0015, subscriberRetentionPercent: 88, catalogRetentionPercent: 100, technologyRetentionPercent: 45, acquisitionRateDelta: 0.0022, churnRateDelta: -0.00035, reliabilityRisk: 0.025 },
    { id: 'BUNDLE', label: 'Build a bundle', thesis: 'Preserve both services and sell the relationship before touching the underlying platforms.', integrationWeeks: 6, reservePercent: 0.022, weeklyCostPercent: 0.0013, subscriberRetentionPercent: 97, catalogRetentionPercent: 90, technologyRetentionPercent: 40, acquisitionRateDelta: 0.0025, churnRateDelta: -0.0008, reliabilityRisk: 0.012 },
    { id: 'FULL_ABSORPTION', label: 'Fully absorb', thesis: 'Unify brand, catalog, accounts, teams and technology into one operating company.', integrationWeeks: 16, reservePercent: 0.05, weeklyCostPercent: 0.0024, subscriberRetentionPercent: 79, catalogRetentionPercent: 94, technologyRetentionPercent: 92, acquisitionRateDelta: 0.0028, churnRateDelta: 0.0007, reliabilityRisk: 0.075 },
    { id: 'TECH_ONLY', label: 'Retain technology only', thesis: 'Acquire the systems and engineering capability, then release the audience business.', integrationWeeks: 9, reservePercent: 0.03, weeklyCostPercent: 0.0014, subscriberRetentionPercent: 12, catalogRetentionPercent: 0, technologyRetentionPercent: 100, acquisitionRateDelta: 0.0003, churnRateDelta: 0, reliabilityRisk: 0.035 },
    { id: 'CATALOG_ONLY', label: 'Retain catalog only', thesis: 'Keep the rights portfolio while migrating or disposing of the operating service.', integrationWeeks: 7, reservePercent: 0.024, weeklyCostPercent: 0.0012, subscriberRetentionPercent: 26, catalogRetentionPercent: 100, technologyRetentionPercent: 0, acquisitionRateDelta: 0.0018, churnRateDelta: -0.0002, reliabilityRisk: 0.008 },
    { id: 'SUNSET_MIGRATE', label: 'Sunset and migrate', thesis: 'Close the acquired app and move willing households into the core platform.', integrationWeeks: 11, reservePercent: 0.04, weeklyCostPercent: 0.002, subscriberRetentionPercent: 68, catalogRetentionPercent: 88, technologyRetentionPercent: 64, acquisitionRateDelta: 0.0016, churnRateDelta: 0.0011, reliabilityRisk: 0.06 },
];

export const STREAMING_REGULATORY_STRATEGIES: StreamingRegulatoryStrategyDefinition[] = [
    { id: 'CLEAN_COMMITMENTS', label: 'Commitment package', detail: 'Offer continuity, labor, creator and data protections to preserve the whole transaction.', remedyPercent: 0.008, scrutinyRelief: 28, subscriberRetentionPercent: 96, catalogRetentionPercent: 96, technologyRetentionPercent: 96 },
    { id: 'ASSET_CARVEOUT', label: 'Asset carve-out', detail: 'Guarantee clearance by divesting overlapping audience, catalog and technology assets.', remedyPercent: 0.014, scrutinyRelief: 100, subscriberRetentionPercent: 75, catalogRetentionPercent: 75, technologyRetentionPercent: 65 },
    { id: 'CONTEST_REVIEW', label: 'Contest review', detail: 'Defend the full deal with minimal concessions. Cheaper, slower and genuinely blockable.', remedyPercent: 0.003, scrutinyRelief: 4, subscriberRetentionPercent: 100, catalogRetentionPercent: 100, technologyRetentionPercent: 100 },
];

const TARGET_THESES: Record<PlatformId, string> = {
    NETFLIX: 'Instant global scale, deep originals operations and the strongest direct subscriber engine.',
    APPLE_TV: 'Elite playback technology, premium brand trust and a prestige-first catalog signal.',
    DISNEY_PLUS: 'Franchise loyalty, family retention and a global branded-entertainment moat.',
    HULU: 'Agile curation, mature advertising operations and a focused premium audience.',
    YOUTUBE: 'Creator reach, live attention and a distribution network with unmatched global breadth.',
};

const createLedger = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    idempotencyKey: string,
    type: OwnedStreamingLedgerEntry['type'],
    summary: string,
    metadata?: OwnedStreamingLedgerEntry['metadata'],
): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
    idempotencyKey,
    absoluteWeek,
    type,
    summary,
    source: 'PLAYER_ACTION',
    metadata,
});

const replaceCase = (
    platform: OwnedStreamingPlatformState,
    nextCase: OwnedStreamingAcquisitionCase,
    ledger?: OwnedStreamingLedgerEntry,
): OwnedStreamingPlatformState => ({
    ...platform,
    corporateDevelopment: {
        ...platform.corporateDevelopment,
        acquisitionCases: platform.corporateDevelopment.acquisitionCases.map(entry => (
            entry.id === nextCase.id ? nextCase : entry
        )),
    },
    eventLedger: ledger ? [...platform.eventLedger, ledger] : platform.eventLedger,
});

const persistPlayer = (player: Player, platform: OwnedStreamingPlatformState): Player => ({
    ...player,
    ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platform, player.id),
});

const strategicFitFor = (rival: OwnedStreamingRivalProfile, platform: OwnedStreamingPlatformState): number => {
    const techGap = Math.max(0, rival.technology - platform.metrics.technologyHealth);
    const prestigeGap = Math.max(0, rival.prestige - platform.competitiveWorld.globalPrestige);
    const scaleGap = Math.min(30, rival.subscribersMillions / 12);
    return Math.round(clamp(45 + techGap * 0.22 + prestigeGap * 0.16 + scaleGap, 35, 98));
};

const estimateTargetValue = (player: Player, rival: OwnedStreamingRivalProfile): number => {
    const world = player.world.platforms?.[rival.platformId];
    const worldValue = Math.max(0, world?.valuation || 0) * 1_000_000_000;
    const operatingValue = rival.subscribersMillions * 92_000_000
        + rival.catalogPower * 150_000_000
        + rival.technology * 90_000_000
        + rival.prestige * 45_000_000;
    return Math.round(worldValue > 0 ? worldValue * 0.82 + operatingValue * 0.18 : operatingValue);
};

const findCase = (platform: OwnedStreamingPlatformState, caseId: string) => (
    platform.corporateDevelopment.acquisitionCases.find(entry => entry.id === caseId) || null
);

const commitmentTotal = (
    commitments: StreamingAcquisitionCommitmentId[],
    key: 'sellerSupport' | 'boardSupport' | 'regulatoryRelief' | 'integrationCostPercent',
): number => commitments.reduce((total, id) => (
    total + (STREAMING_ACQUISITION_COMMITMENTS.find(item => item.id === id)?.[key] || 0)
), 0);

export const getStreamingAcquisitionCommand = (player: Player): StreamingAcquisitionCommandView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const competitive = getStreamingCompetitiveWorld({ ...player, ownedStreamingPlatform: platform });
    const targets = competitive.rivals.map(rival => {
        const owned = platform.corporateDevelopment.acquiredPlatformIds.includes(rival.platformId);
        const activeCase = platform.corporateDevelopment.acquisitionCases
            .find(entry => entry.targetPlatformId === rival.platformId && !['SIGNED', 'WITHDRAWN'].includes(entry.status)) || null;
        const fit = strategicFitFor(rival, platform);
        return {
            rival,
            owned,
            activeCase,
            strategicFit: fit,
            thesis: TARGET_THESES[rival.platformId],
            pressure: rival.cashReserveMillions >= 5_000
                ? 'A cash-rich board will demand a control premium.'
                : rival.mistakes > 0
                    ? 'Recent strategic mistakes have opened a negotiation window.'
                    : 'No distressed discount is visible in the market.',
            estimatedValue: estimateTargetValue(player, rival),
        };
    });
    const activeCase = platform.corporateDevelopment.acquisitionCases
        .slice().reverse().find(entry => !['SIGNED', 'WITHDRAWN'].includes(entry.status))
        || platform.corporateDevelopment.acquisitionCases.at(-1)
        || null;
    return {
        available: platform.lifecycle === 'ACTIVE',
        platform,
        targets,
        cases: platform.corporateDevelopment.acquisitionCases,
        integrations: platform.corporateDevelopment.integrations,
        activeCase,
    };
};

export const scoutStreamingAcquisitionTarget = (
    player: Player,
    targetPlatformId: PlatformId,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    let platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const view = getStreamingCompetitiveWorld({ ...player, ownedStreamingPlatform: platform });
    const target = view.rivals.find(entry => entry.platformId === targetPlatformId);
    if (platform.lifecycle !== 'ACTIVE') return { player, changed: false, reason: 'PLATFORM_NOT_ACTIVE' };
    if (!target) return { player, changed: false, reason: 'TARGET_NOT_AVAILABLE' };
    if (platform.corporateDevelopment.acquiredPlatformIds.includes(targetPlatformId)) {
        return { player, changed: false, reason: 'ALREADY_OWNED' };
    }
    const existing = platform.corporateDevelopment.acquisitionCases
        .find(entry => entry.targetPlatformId === targetPlatformId && !['WITHDRAWN'].includes(entry.status));
    if (existing) return { player, changed: false, reason: 'CASE_ALREADY_EXISTS', caseId: existing.id };
    const idempotencyKey = `streaming-acquisition:${targetPlatformId}`;
    const acquisitionCase: OwnedStreamingAcquisitionCase = {
        id: createDeterministicId('streaming_acquisition_case', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        targetPlatformId,
        targetPlatformName: target.platformName,
        targetCeoName: target.ceoName,
        status: 'SCOUTED',
        openedAtAbsoluteWeek: absoluteWeek,
        updatedAtAbsoluteWeek: absoluteWeek,
        valuation: null,
        offer: null,
        diligence: null,
        counterbid: null,
        approval: null,
        regulatoryReview: null,
        financing: null,
        integrationMode: null,
        finalPurchasePrice: null,
        signedAtAbsoluteWeek: null,
        acquiredSubscriberCount: 0,
        outcomeNote: null,
    };
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${idempotencyKey}:scouted`,
        'ACQUISITION_SCOUTED',
        `Corporate development opened a confidential file on ${target.platformName}.`,
        { targetPlatformId, targetPlatformName: target.platformName },
    );
    platform = {
        ...platform,
        competitiveWorld: view.world,
        corporateDevelopment: {
            ...platform.corporateDevelopment,
            acquisitionCases: [...platform.corporateDevelopment.acquisitionCases, acquisitionCase],
        },
        eventLedger: [...platform.eventLedger, ledger],
    };
    return { player: persistPlayer(player, platform), changed: true, caseId: acquisitionCase.id };
};

export const valueStreamingAcquisitionTarget = (
    player: Player,
    caseId: string,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase) return { player, changed: false, reason: 'CASE_NOT_FOUND' };
    if (acquisitionCase.valuation) return { player, changed: false, reason: 'ALREADY_VALUED', caseId };
    const rival = platform.competitiveWorld.rivals.find(entry => entry.platformId === acquisitionCase.targetPlatformId);
    if (!rival) return { player, changed: false, reason: 'TARGET_NOT_AVAILABLE' };
    const valuationCost = Math.round(clamp(4_000_000 + rival.subscribersMillions * 75_000, 4_000_000, 30_000_000));
    if (platform.treasuryCash < valuationCost) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    const standaloneValue = estimateTargetValue(player, rival);
    const subscriberValue = Math.round(rival.subscribersMillions * 92_000_000);
    const catalogValue = Math.round(rival.catalogPower * 150_000_000);
    const technologyValue = Math.round(rival.technology * 90_000_000);
    const brandValue = Math.round(rival.prestige * 45_000_000);
    const strategicPremium = Math.round(standaloneValue * strategicFitFor(rival, platform) / 1_000);
    const debtAndLiabilities = Math.round(standaloneValue * (0.035 + (100 - rival.technology) / 2_000));
    const fairValue = Math.round(standaloneValue + strategicPremium - debtAndLiabilities);
    const sellerFloor = Math.round(fairValue * (1.035 + rival.aggression / 2_000));
    const valuation: OwnedStreamingAcquisitionValuation = {
        standaloneValue,
        subscriberValue,
        catalogValue,
        technologyValue,
        brandValue,
        strategicPremium,
        debtAndLiabilities,
        fairValue,
        sellerFloor,
        valuationCost,
        valuedAtAbsoluteWeek: absoluteWeek,
    };
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: 'VALUED',
        updatedAtAbsoluteWeek: absoluteWeek,
        valuation,
    };
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${acquisitionCase.idempotencyKey}:valued`,
        'ACQUISITION_VALUED',
        `${acquisitionCase.targetPlatformName} received an independent ${Math.round(fairValue / 1_000_000_000)}B fair-value range.`,
        { targetPlatformId: acquisitionCase.targetPlatformId, fairValue, valuationCost },
    );
    return {
        player: persistPlayer(player, {
            ...replaceCase(platform, nextCase, ledger),
            treasuryCash: platform.treasuryCash - valuationCost,
        }),
        changed: true,
        caseId,
    };
};

export const submitStreamingAcquisitionOffer = (
    player: Player,
    caseId: string,
    dealStructure: StreamingAcquisitionDealStructure,
    offeredPrice: number,
    commitments: StreamingAcquisitionCommitmentId[],
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase?.valuation) return { player, changed: false, reason: 'VALUATION_REQUIRED' };
    if (!['VALUED', 'OFFER_COUNTERED'].includes(acquisitionCase.status)) {
        return { player, changed: false, reason: 'INVALID_STAGE' };
    }
    const uniqueCommitments = Array.from(new Set(commitments)).filter(id => (
        STREAMING_ACQUISITION_COMMITMENTS.some(item => item.id === id)
    ));
    const sellerFloor = acquisitionCase.valuation.sellerFloor;
    const supportDiscount = commitmentTotal(uniqueCommitments, 'sellerSupport') / 100;
    const effectiveFloor = Math.round(sellerFloor * (1 - Math.min(0.12, supportDiscount)));
    const normalizedOffer = Math.round(clamp(offeredPrice, acquisitionCase.valuation.fairValue * 0.72, sellerFloor * 1.4));
    const accepted = normalizedOffer >= effectiveFloor;
    const sellerCounterPrice = accepted
        ? null
        : Math.round(Math.max(normalizedOffer * 1.025, effectiveFloor));
    const revision = (acquisitionCase.offer?.revision || 0) + 1;
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: accepted ? 'DILIGENCE' : 'OFFER_COUNTERED',
        updatedAtAbsoluteWeek: absoluteWeek,
        offer: {
            dealStructure,
            offeredPrice: normalizedOffer,
            commitments: uniqueCommitments,
            sellerResponse: accepted ? 'ACCEPTED' : 'COUNTERED',
            sellerCounterPrice,
            submittedAtAbsoluteWeek: absoluteWeek,
            revision,
        },
        finalPurchasePrice: accepted ? normalizedOffer : null,
    };
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${acquisitionCase.idempotencyKey}:offer:${revision}`,
        'ACQUISITION_OFFER_SUBMITTED',
        accepted
            ? `${acquisitionCase.targetPlatformName} accepted the headline economics, subject to diligence.`
            : `${acquisitionCase.targetPlatformName} countered the opening proposal.`,
        { offeredPrice: normalizedOffer, sellerCounterPrice, dealStructure, accepted },
    );
    return { player: persistPlayer(player, replaceCase(platform, nextCase, ledger)), changed: true, caseId };
};

export const acceptStreamingAcquisitionCounter = (
    player: Player,
    caseId: string,
): StreamingAcquisitionActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase?.offer?.sellerCounterPrice || acquisitionCase.status !== 'OFFER_COUNTERED') {
        return { player, changed: false, reason: 'NO_SELLER_COUNTER' };
    }
    return submitStreamingAcquisitionOffer(
        player,
        caseId,
        acquisitionCase.offer.dealStructure,
        acquisitionCase.offer.sellerCounterPrice,
        acquisitionCase.offer.commitments,
    );
};

const diligenceIssuesFor = (
    platform: OwnedStreamingPlatformState,
    acquisitionCase: OwnedStreamingAcquisitionCase,
): OwnedStreamingDiligenceIssue[] => {
    const target = platform.competitiveWorld.rivals.find(item => item.platformId === acquisitionCase.targetPlatformId);
    const rng = createDeterministicRng(`${platform.simulationSeed}:${acquisitionCase.id}:diligence`);
    const value = acquisitionCase.valuation?.fairValue || 0;
    const templates = [
        { suffix: 'content', title: 'Content commitments above plan', detail: 'Committed production and minimum guarantees extend beyond the headline catalog value.' },
        { suffix: 'tech', title: 'Migration debt in the playback stack', detail: 'Core services require parallel operation before accounts can be moved safely.' },
        { suffix: 'churn', title: 'Discount cohorts carry hidden churn', detail: 'A meaningful audience cohort is retained by expiring promotional pricing.' },
        { suffix: 'rights', title: 'Change-of-control consent exposure', detail: 'A portion of licensed rights requires counterparty notice or consent at closing.' },
    ];
    const count = 2 + Math.floor(rng() * 2);
    return templates.slice(0, count).map((template, index) => {
        const severityScore = rng() + (target ? (100 - target.technology) / 180 : 0);
        const severity = severityScore > 1.05 ? 'SEVERE' : severityScore > 0.56 ? 'MATERIAL' : 'WATCH';
        const percent = severity === 'SEVERE' ? 0.025 : severity === 'MATERIAL' ? 0.014 : 0.006;
        return {
            id: createDeterministicId('streaming_diligence_issue', acquisitionCase.id, template.suffix),
            title: template.title,
            detail: template.detail,
            severity,
            valueImpact: -Math.round(value * percent * (0.85 + index * 0.12)),
            integrationRisk: severity === 'SEVERE' ? 22 : severity === 'MATERIAL' ? 13 : 6,
        };
    });
};

export const commissionStreamingDueDiligence = (
    player: Player,
    caseId: string,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase?.valuation || !acquisitionCase.offer || acquisitionCase.status !== 'DILIGENCE') {
        return { player, changed: false, reason: 'DILIGENCE_NOT_READY' };
    }
    if (acquisitionCase.diligence) return { player, changed: false, reason: 'ALREADY_DILIGENCED' };
    const commissionedCost = Math.round(clamp(acquisitionCase.valuation.fairValue * 0.0007, 8_000_000, 80_000_000));
    if (platform.treasuryCash < commissionedCost) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    const issues = diligenceIssuesFor(platform, acquisitionCase);
    const valueImpact = issues.reduce((total, issue) => total + issue.valueImpact, 0);
    const adjustedFairValue = Math.max(1, acquisitionCase.valuation.fairValue + valueImpact);
    const verifiedDebt = Math.round(acquisitionCase.valuation.debtAndLiabilities * 0.52);
    const contentLiability = Math.round(acquisitionCase.valuation.debtAndLiabilities * 0.28);
    const technicalDebt = Math.round(acquisitionCase.valuation.debtAndLiabilities * 0.2);
    const target = platform.competitiveWorld.rivals.find(item => item.platformId === acquisitionCase.targetPlatformId);
    const bidder = platform.competitiveWorld.rivals
        .filter(item => item.platformId !== acquisitionCase.targetPlatformId && item.cashReserveMillions >= 100)
        .sort((left, right) => right.aggression + right.cashReserveMillions / 1_000 - left.aggression - left.cashReserveMillions / 1_000)[0];
    const hasCounterbid = Boolean(bidder) && (
        (target?.catalogPower || 0) >= 75
        || createDeterministicRng(`${platform.simulationSeed}:${caseId}:counterbid`)() > 0.48
    );
    const rivalBid = bidder && hasCounterbid
        ? Math.round(Math.max(acquisitionCase.finalPurchasePrice || 0, adjustedFairValue) * 1.045)
        : null;
    const pursuitCostMillions = rivalBid ? Math.round(clamp(rivalBid * 0.00004 / 1_000_000, 6, 90)) : 0;
    const counterbid = bidder && rivalBid
        ? {
            bidderPlatformId: bidder.platformId,
            bidderName: bidder.platformName,
            bidderCeoName: bidder.ceoName,
            amount: rivalBid,
            pursuitCostMillions,
            playerRequiredBid: Math.round(rivalBid * 1.015),
            status: 'OPEN' as const,
            createdAtAbsoluteWeek: absoluteWeek,
            resolvedAtAbsoluteWeek: null,
        }
        : null;
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: counterbid ? 'COUNTERBID' : 'APPROVALS',
        updatedAtAbsoluteWeek: absoluteWeek,
        diligence: {
            commissionedCost,
            issues,
            adjustedFairValue,
            verifiedDebt,
            contentLiability,
            technicalDebt,
            churnExposure: clamp(0.04 + issues.reduce((total, issue) => total + issue.integrationRisk, 0) / 1_000, 0.04, 0.22),
            completedAtAbsoluteWeek: absoluteWeek,
        },
        counterbid,
        finalPurchasePrice: Math.max(acquisitionCase.finalPurchasePrice || 0, adjustedFairValue),
    };
    const rivals = counterbid
        ? platform.competitiveWorld.rivals.map(rival => rival.platformId === counterbid.bidderPlatformId
            ? { ...rival, cashReserveMillions: Math.max(0, rival.cashReserveMillions - pursuitCostMillions) }
            : rival)
        : platform.competitiveWorld.rivals;
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${acquisitionCase.idempotencyKey}:diligence`,
        'ACQUISITION_DILIGENCE_COMPLETED',
        `Diligence on ${acquisitionCase.targetPlatformName} exposed ${issues.length} decision-grade risks.`,
        { commissionedCost, adjustedFairValue, issueCount: issues.length, counterbid: Boolean(counterbid) },
    );
    return {
        player: persistPlayer(player, {
            ...replaceCase(platform, nextCase, ledger),
            treasuryCash: platform.treasuryCash - commissionedCost,
            competitiveWorld: { ...platform.competitiveWorld, rivals },
        }),
        changed: true,
        caseId,
    };
};

export const beatStreamingAcquisitionCounterbid = (
    player: Player,
    caseId: string,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase?.counterbid || acquisitionCase.counterbid.status !== 'OPEN') {
        return { player, changed: false, reason: 'NO_OPEN_COUNTERBID' };
    }
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: 'APPROVALS',
        updatedAtAbsoluteWeek: absoluteWeek,
        finalPurchasePrice: acquisitionCase.counterbid.playerRequiredBid,
        counterbid: {
            ...acquisitionCase.counterbid,
            status: 'BEATEN',
            resolvedAtAbsoluteWeek: absoluteWeek,
        },
    };
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${acquisitionCase.idempotencyKey}:counterbid:beaten`,
        'ACQUISITION_COUNTERBID_RESOLVED',
        `${acquisitionCase.targetPlatformName} selected the revised player proposal over ${acquisitionCase.counterbid.bidderName}.`,
        { finalPurchasePrice: nextCase.finalPurchasePrice, rivalPlatformId: acquisitionCase.counterbid.bidderPlatformId },
    );
    return { player: persistPlayer(player, replaceCase(platform, nextCase, ledger)), changed: true, caseId };
};

export const seekStreamingAcquisitionApproval = (
    player: Player,
    caseId: string,
    commitments: StreamingAcquisitionCommitmentId[],
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase || !['APPROVALS', 'APPROVAL_BLOCKED'].includes(acquisitionCase.status)) {
        return { player, changed: false, reason: 'APPROVAL_NOT_READY' };
    }
    const finalCommitments = Array.from(new Set(commitments));
    const activeDirectors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    const binding = platform.founderOwnershipPercent < 67 || activeDirectors.some(item => item.seatType === 'INVESTOR_NOMINEE');
    const pricePremium = Math.max(0, (acquisitionCase.finalPurchasePrice || 0) - (acquisitionCase.diligence?.adjustedFairValue || 1))
        / Math.max(1, acquisitionCase.diligence?.adjustedFairValue || 1);
    const commitmentSupport = commitmentTotal(finalCommitments, 'boardSupport');
    const votes = activeDirectors.map(director => {
        const score = director.founderRelationship * 0.34
            + director.independence * 0.18
            + platform.governance.boardConfidence * 0.24
            + commitmentSupport
            - pricePremium * 90;
        const vote = score >= 48 ? 'FOR' as const : 'AGAINST' as const;
        return {
            directorId: director.id,
            directorName: director.name,
            vote,
            rationale: vote === 'FOR'
                ? 'The disclosed protections and strategic fit justify advancing the transaction.'
                : 'The current premium and integration protection do not yet justify the risk.',
        };
    });
    const approved = !binding || votes.filter(vote => vote.vote === 'FOR').length >= Math.ceil(votes.length / 2);
    const confidenceDelta = approved ? 3 : -8;
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: approved ? 'REGULATORY_REVIEW' : 'APPROVAL_BLOCKED',
        updatedAtAbsoluteWeek: absoluteWeek,
        approval: {
            binding,
            status: approved ? 'APPROVED' : 'REJECTED',
            founderVote: 'FOR',
            votes,
            confidenceDelta,
            commitments: finalCommitments,
            resolvedAtAbsoluteWeek: absoluteWeek,
        },
        offer: acquisitionCase.offer ? { ...acquisitionCase.offer, commitments: finalCommitments } : null,
    };
    const revision = (acquisitionCase.approval ? 2 : 1);
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${acquisitionCase.idempotencyKey}:approval:${revision}:${finalCommitments.sort().join('-') || 'none'}`,
        'ACQUISITION_APPROVAL_RESOLVED',
        approved
            ? `The ${binding ? 'binding board vote' : 'founder-controlled review'} approved the ${acquisitionCase.targetPlatformName} transaction.`
            : `The board rejected the current ${acquisitionCase.targetPlatformName} terms.`,
        { approved, binding, confidenceDelta, commitmentCount: finalCommitments.length },
    );
    return {
        player: persistPlayer(player, {
            ...replaceCase(platform, nextCase, ledger),
            governance: {
                ...platform.governance,
                boardConfidence: Math.round(clamp(platform.governance.boardConfidence + confidenceDelta, 0, 100)),
            },
        }),
        changed: true,
        caseId,
    };
};

export const resolveStreamingRegulatoryReview = (
    player: Player,
    caseId: string,
    strategy: StreamingRegulatoryStrategy,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase || !['REGULATORY_REVIEW', 'REGULATORY_BLOCKED'].includes(acquisitionCase.status)) {
        return { player, changed: false, reason: 'REGULATORY_NOT_READY' };
    }
    const definition = STREAMING_REGULATORY_STRATEGIES.find(item => item.id === strategy)!;
    const playerShare = platform.competitiveWorld.marketShareHistory.at(-1)?.entries.find(item => item.id === 'PLAYER')?.sharePercent || 0;
    const target = platform.competitiveWorld.rivals.find(item => item.platformId === acquisitionCase.targetPlatformId);
    const activeRegions = platform.competitiveWorld.regionalLaunches.filter(item => item.status === 'ACTIVE').length;
    const concentration = playerShare * 2.1 + (target?.catalogPower || 50) * 0.32 + activeRegions * 4;
    const commitmentRelief = commitmentTotal(acquisitionCase.approval?.commitments || [], 'regulatoryRelief');
    const scrutinyScore = Math.round(clamp(concentration - commitmentRelief, 8, 100));
    const contestRoll = createDeterministicRng(`${platform.simulationSeed}:${caseId}:regulatory:${strategy}`)();
    const blocked = strategy === 'CONTEST_REVIEW' && contestRoll < clamp((scrutinyScore - definition.scrutinyRelief) / 110, 0.18, 0.72);
    const status = blocked
        ? 'BLOCKED' as const
        : strategy === 'CONTEST_REVIEW' && scrutinyScore < 36
            ? 'CLEARED' as const
            : 'CLEARED_WITH_REMEDIES' as const;
    const remedyCost = status === 'CLEARED' ? 0 : Math.round((acquisitionCase.finalPurchasePrice || 0) * definition.remedyPercent);
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: blocked ? 'REGULATORY_BLOCKED' : 'FINANCING',
        updatedAtAbsoluteWeek: absoluteWeek,
        regulatoryReview: {
            scrutinyScore,
            strategy,
            status,
            remedyCost,
            subscriberRetentionPercent: blocked ? 0 : definition.subscriberRetentionPercent,
            catalogRetentionPercent: blocked ? 0 : definition.catalogRetentionPercent,
            technologyRetentionPercent: blocked ? 0 : definition.technologyRetentionPercent,
            rationale: blocked
                ? 'The review found the proposed concentration unacceptable without structural remedies.'
                : status === 'CLEARED'
                    ? 'The transaction cleared without structural remedies.'
                    : 'The transaction cleared subject to the disclosed remedy package.',
            resolvedAtAbsoluteWeek: absoluteWeek,
        },
    };
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${acquisitionCase.idempotencyKey}:regulatory:${strategy}`,
        'ACQUISITION_REGULATORY_RESOLVED',
        blocked
            ? `Regulators blocked the current ${acquisitionCase.targetPlatformName} structure.`
            : `${acquisitionCase.targetPlatformName} cleared review${status === 'CLEARED' ? '' : ' with remedies'}.`,
        { strategy, status, scrutinyScore, remedyCost },
    );
    return { player: persistPlayer(player, replaceCase(platform, nextCase, ledger)), changed: true, caseId };
};

const getDebtCapacity = (platform: OwnedStreamingPlatformState): number => {
    const annualizedRevenue = (platform.weeklyHistory.slice(-8)
        .reduce((total, snapshot) => total + (snapshot.operations?.subscriptionRevenue || 0), 0)
        / Math.max(1, Math.min(8, platform.weeklyHistory.length))) * 52;
    return Math.round(Math.max(platform.treasuryCash * 4, annualizedRevenue * 2.6) - platform.debtPrincipal);
};

export const lockStreamingAcquisitionFinancing = (
    player: Player,
    caseId: string,
    source: StreamingAcquisitionFundingSource,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase?.regulatoryReview || acquisitionCase.status !== 'FINANCING' || !acquisitionCase.finalPurchasePrice) {
        return { player, changed: false, reason: 'FINANCING_NOT_READY' };
    }
    const basePrice = acquisitionCase.finalPurchasePrice + acquisitionCase.regulatoryReview.remedyCost;
    const isMerger = acquisitionCase.offer?.dealStructure === 'STRATEGIC_MERGER';
    const equityConsideration = isMerger ? Math.round(basePrice * 0.42) : 0;
    const cashNeed = basePrice - equityConsideration;
    const desiredDebt = source === 'TREASURY' ? 0 : source === 'HYBRID' ? Math.round(cashNeed * 0.5) : cashNeed;
    const debtPrincipal = Math.min(Math.max(0, getDebtCapacity(platform)), desiredDebt);
    const treasuryContribution = cashNeed - debtPrincipal;
    if (treasuryContribution > platform.treasuryCash) {
        return { player, changed: false, reason: 'CAPITAL_STACK_UNAFFORDABLE' };
    }
    if (source === 'ACQUISITION_DEBT' && debtPrincipal < desiredDebt) {
        return { player, changed: false, reason: 'DEBT_CAPACITY_EXCEEDED' };
    }
    const issuedOwnership = equityConsideration > 0
        ? clamp(equityConsideration / Math.max(basePrice * 2.2, equityConsideration) * 100, 1, 32)
        : 0;
    const founderOwnershipAfter = platform.founderOwnershipPercent * (1 - issuedOwnership / 100);
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: 'READY_TO_SIGN',
        updatedAtAbsoluteWeek: absoluteWeek,
        financing: {
            source,
            totalConsideration: basePrice,
            treasuryContribution,
            debtPrincipal,
            equityConsideration,
            weeklyInterestRate: debtPrincipal > 0 ? 0.00125 + clamp(debtPrincipal / Math.max(1, basePrice) * 0.0007, 0, 0.0007) : 0,
            lenderName: debtPrincipal > 0 ? 'Global Media Credit Syndicate' : null,
            founderOwnershipBefore: platform.founderOwnershipPercent,
            founderOwnershipAfter,
            lockedAtAbsoluteWeek: absoluteWeek,
        },
    };
    const ledger = createLedger(
        platform,
        absoluteWeek,
        `${acquisitionCase.idempotencyKey}:financing:${source}`,
        'ACQUISITION_FINANCING_LOCKED',
        `The ${acquisitionCase.targetPlatformName} capital stack is committed and ready for signing.`,
        { source, treasuryContribution, debtPrincipal, equityConsideration, founderOwnershipAfter },
    );
    return { player: persistPlayer(player, replaceCase(platform, nextCase, ledger)), changed: true, caseId };
};

export const signStreamingPlatformAcquisition = (
    player: Player,
    caseId: string,
    integrationMode: StreamingIntegrationMode,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase?.financing || acquisitionCase.status !== 'READY_TO_SIGN') {
        return { player, changed: false, reason: acquisitionCase?.status === 'SIGNED' ? 'ALREADY_SIGNED' : 'SIGNING_NOT_READY' };
    }
    if (platform.corporateDevelopment.acquiredPlatformIds.includes(acquisitionCase.targetPlatformId)) {
        return { player, changed: false, reason: 'ALREADY_OWNED' };
    }
    const mode = STREAMING_INTEGRATION_MODES.find(item => item.id === integrationMode);
    const target = platform.competitiveWorld.rivals.find(item => item.platformId === acquisitionCase.targetPlatformId);
    if (!mode || !target || !acquisitionCase.regulatoryReview) return { player, changed: false, reason: 'TARGET_NOT_AVAILABLE' };
    const commitments = acquisitionCase.approval?.commitments || [];
    const capitalReserve = Math.round(
        acquisitionCase.financing.totalConsideration
        * (mode.reservePercent + commitmentTotal(commitments, 'integrationCostPercent')),
    );
    const totalTreasuryAtClose = acquisitionCase.financing.treasuryContribution + capitalReserve;
    if (platform.treasuryCash < totalTreasuryAtClose) {
        return { player, changed: false, reason: 'INTEGRATION_RESERVE_UNFUNDED' };
    }
    const regulatoryRetention = acquisitionCase.regulatoryReview.subscriberRetentionPercent / 100;
    const modeRetention = mode.subscriberRetentionPercent / 100;
    const acquiredSubscriberCount = Math.round(target.subscribersMillions * 1_000_000 * regulatoryRetention * modeRetention);
    const catalogAssetCount = Math.round(
        target.catalogPower * 18
        * acquisitionCase.regulatoryReview.catalogRetentionPercent / 100
        * mode.catalogRetentionPercent / 100,
    );
    const technologyLevelDelta = Math.round(
        target.technology / 12
        * acquisitionCase.regulatoryReview.technologyRetentionPercent / 100
        * mode.technologyRetentionPercent / 100,
    );
    const integration: OwnedStreamingAcquisitionIntegration = {
        id: createDeterministicId('streaming_acquisition_integration', platform.simulationSeed, caseId),
        idempotencyKey: `${acquisitionCase.idempotencyKey}:integration`,
        acquisitionCaseId: caseId,
        targetPlatformId: acquisitionCase.targetPlatformId,
        targetPlatformName: acquisitionCase.targetPlatformName,
        mode: integrationMode,
        status: 'IN_PROGRESS',
        capitalReserve,
        weeklyOperatingCost: Math.round(acquisitionCase.financing.totalConsideration * mode.weeklyCostPercent / mode.integrationWeeks),
        integrationWeeks: mode.integrationWeeks,
        subscriberRetentionPercent: regulatoryRetention * mode.subscriberRetentionPercent,
        acquiredSubscriberCount,
        catalogAssetCount,
        technologyLevelDelta,
        acquisitionRateDelta: mode.acquisitionRateDelta,
        churnRateDelta: mode.churnRateDelta,
        reliabilityRisk: mode.reliabilityRisk + (acquisitionCase.diligence?.issues.reduce((sum, issue) => sum + issue.integrationRisk, 0) || 0) / 1_000,
        startedAtAbsoluteWeek: absoluteWeek,
        readyAtAbsoluteWeek: absoluteWeek + mode.integrationWeeks,
        completedAtAbsoluteWeek: null,
    };
    const nextCase: OwnedStreamingAcquisitionCase = {
        ...acquisitionCase,
        status: 'SIGNED',
        updatedAtAbsoluteWeek: absoluteWeek,
        integrationMode,
        signedAtAbsoluteWeek: absoluteWeek,
        acquiredSubscriberCount,
        outcomeNote: `${integrationMode.toLowerCase().replaceAll('_', ' ')} integration began with ${acquiredSubscriberCount.toLocaleString()} retained subscribers.`,
    };
    const signingKey = `${acquisitionCase.idempotencyKey}:signed`;
    const signingLedger = createLedger(
        platform,
        absoluteWeek,
        signingKey,
        'STREAMING_PLATFORM_ACQUIRED',
        `${platform.identity?.name || 'The platform'} signed the ${acquisitionCase.targetPlatformName} transaction for ${Math.round(acquisitionCase.financing.totalConsideration / 1_000_000_000)}B.`,
        {
            targetPlatformId: acquisitionCase.targetPlatformId,
            purchasePrice: acquisitionCase.financing.totalConsideration,
            integrationMode,
            acquiredSubscriberCount,
            catalogAssetCount,
            technologyLevelDelta,
        },
    );
    const cinematic: OwnedStreamingCinematicEvent = {
        id: createDeterministicId('streaming_scene', platform.simulationSeed, signingKey),
        idempotencyKey: signingKey,
        type: 'ACQUISITION_SIGNING',
        status: 'QUEUED',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: absoluteWeek,
        title: `${acquisitionCase.targetPlatformName} • Signing Day`,
        factIds: [signingLedger.id],
    };
    const loanId = createDeterministicId('streaming_loan', platform.simulationSeed, signingKey);
    const equityId = createDeterministicId('streaming_equity', platform.simulationSeed, signingKey);
    const financing = acquisitionCase.financing;
    const nextFinance = {
        capitalActions: [
            ...platform.finance.capitalActions,
            ...(financing.debtPrincipal > 0 ? [{
                id: createDeterministicId('streaming_capital_action', platform.simulationSeed, `${signingKey}:debt`),
                idempotencyKey: `${signingKey}:debt`,
                type: 'LOAN_DRAW' as const,
                absoluteWeek,
                amount: financing.debtPrincipal,
                treasuryDelta: 0,
                personalCashDelta: 0,
                debtDelta: financing.debtPrincipal,
                ownershipBefore: platform.founderOwnershipPercent,
                ownershipAfter: platform.founderOwnershipPercent,
            }] : []),
            ...(financing.equityConsideration > 0 ? [{
                id: createDeterministicId('streaming_capital_action', platform.simulationSeed, `${signingKey}:equity`),
                idempotencyKey: `${signingKey}:equity`,
                type: 'EQUITY_ISSUANCE' as const,
                absoluteWeek,
                amount: financing.equityConsideration,
                treasuryDelta: 0,
                personalCashDelta: 0,
                debtDelta: 0,
                ownershipBefore: financing.founderOwnershipBefore,
                ownershipAfter: financing.founderOwnershipAfter,
            }] : []),
        ],
        loans: [
            ...platform.finance.loans,
            ...(financing.debtPrincipal > 0 ? [{
                id: loanId,
                lenderName: financing.lenderName || 'Acquisition lender',
                status: 'ACTIVE' as const,
                principal: financing.debtPrincipal,
                outstandingPrincipal: financing.debtPrincipal,
                weeklyInterestRate: financing.weeklyInterestRate,
                openedAtAbsoluteWeek: absoluteWeek,
            }] : []),
        ],
        equityHolders: [
            ...platform.finance.equityHolders,
            ...(financing.equityConsideration > 0 ? [{
                id: equityId,
                holderName: `${acquisitionCase.targetPlatformName} shareholders`,
                ownershipPercent: Math.max(0, financing.founderOwnershipBefore - financing.founderOwnershipAfter),
                investedCapital: financing.equityConsideration,
                issuedAtAbsoluteWeek: absoluteWeek,
            }] : []),
        ],
    };
    const nextPlatform: OwnedStreamingPlatformState = {
        ...platform,
        treasuryCash: platform.treasuryCash - totalTreasuryAtClose,
        debtPrincipal: platform.debtPrincipal + financing.debtPrincipal,
        founderOwnershipPercent: financing.founderOwnershipAfter,
        finance: nextFinance,
        metrics: {
            ...platform.metrics,
            subscribers: platform.metrics.subscribers + acquiredSubscriberCount,
            netSubscriberMovement: platform.metrics.netSubscriberMovement + acquiredSubscriberCount,
        },
        competitiveWorld: {
            ...platform.competitiveWorld,
            globalPrestige: Math.round(clamp(platform.competitiveWorld.globalPrestige + Math.max(3, target.prestige / 18), 0, 100)),
            rivals: platform.competitiveWorld.rivals.filter(item => item.platformId !== acquisitionCase.targetPlatformId),
            moves: platform.competitiveWorld.moves.map(move => (
                move.platformId === acquisitionCase.targetPlatformId && move.status === 'OPEN'
                    ? { ...move, status: 'EXPIRED' as const, outcomeNote: 'The move ended when the platform changed control.' }
                    : move
            )),
        },
        corporateDevelopment: {
            acquisitionCases: platform.corporateDevelopment.acquisitionCases.map(entry => entry.id === caseId ? nextCase : entry),
            integrations: [...platform.corporateDevelopment.integrations, integration],
            acquiredPlatformIds: [...platform.corporateDevelopment.acquiredPlatformIds, acquisitionCase.targetPlatformId],
        },
        eventLedger: [...platform.eventLedger, signingLedger],
        cinematicQueue: [...platform.cinematicQueue, cinematic],
        milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'first-streaming-platform-acquisition'])),
    };
    return { player: persistPlayer(player, nextPlatform), changed: true, caseId };
};

export const getStreamingAcquisitionWeeklyEffects = (
    platformValue: OwnedStreamingPlatformState,
): StreamingAcquisitionWeeklyEffects => {
    const platform = normalizeOwnedStreamingPlatformState(platformValue);
    const activeIntegrations = platform.corporateDevelopment.integrations.filter(item => item.status === 'IN_PROGRESS');
    const integrated = platform.corporateDevelopment.integrations.filter(item => item.status === 'INTEGRATED');
    return {
        weeklyOperatingCost: activeIntegrations.reduce((total, item) => total + item.weeklyOperatingCost, 0),
        acquisitionRateDelta: [...activeIntegrations, ...integrated].reduce((total, item) => (
            total + item.acquisitionRateDelta * (item.status === 'IN_PROGRESS' ? 0.45 : 1)
        ), 0),
        churnRateDelta: [...activeIntegrations, ...integrated].reduce((total, item) => (
            total + item.churnRateDelta * (item.status === 'IN_PROGRESS' ? 1.25 : 0.65)
        ), 0),
        reliabilityRisk: activeIntegrations.reduce((maximum, item) => Math.max(maximum, item.reliabilityRisk), 0),
        activeIntegrations,
    };
};

export const completeDueStreamingAcquisitionIntegrations = (
    platformValue: OwnedStreamingPlatformState,
    absoluteWeek: number,
): {
    platform: OwnedStreamingPlatformState;
    completedIntegrations: OwnedStreamingAcquisitionIntegration[];
    ledgerEntries: OwnedStreamingLedgerEntry[];
} => {
    const platform = normalizeOwnedStreamingPlatformState(platformValue);
    const completedIntegrations: OwnedStreamingAcquisitionIntegration[] = [];
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    const integrations = platform.corporateDevelopment.integrations.map(integration => {
        if (integration.status !== 'IN_PROGRESS' || absoluteWeek < integration.readyAtAbsoluteWeek) return integration;
        const completed: OwnedStreamingAcquisitionIntegration = {
            ...integration,
            status: 'INTEGRATED',
            completedAtAbsoluteWeek: absoluteWeek,
        };
        completedIntegrations.push(completed);
        const idempotencyKey = `${integration.idempotencyKey}:completed`;
        if (!platform.eventLedger.some(entry => entry.idempotencyKey === idempotencyKey)) {
            ledgerEntries.push({
                ...createLedger(
                    platform,
                    absoluteWeek,
                    idempotencyKey,
                    'ACQUISITION_INTEGRATION_COMPLETED',
                    `${integration.targetPlatformName} completed ${integration.mode.toLowerCase().replaceAll('_', ' ')} integration.`,
                    {
                        targetPlatformId: integration.targetPlatformId,
                        catalogAssetCount: integration.catalogAssetCount,
                        technologyLevelDelta: integration.technologyLevelDelta,
                    },
                ),
                source: 'WEEK_PROCESSOR',
            });
        }
        return completed;
    });
    if (!completedIntegrations.length) {
        return { platform, completedIntegrations, ledgerEntries };
    }
    const technologyDelta = completedIntegrations.reduce((sum, integration) => sum + integration.technologyLevelDelta, 0);
    const nextTechnology = Object.fromEntries(
        Object.entries(platform.technologyLevels).map(([branch, level]) => [
            branch,
            Math.round(clamp(level + technologyDelta, 0, 100)),
        ]),
    ) as OwnedStreamingPlatformState['technologyLevels'];
    return {
        platform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            technologyLevels: nextTechnology,
            metrics: {
                ...platform.metrics,
                technologyHealth: Math.round(clamp(platform.metrics.technologyHealth + technologyDelta, 0, 100)),
            },
            competitiveWorld: {
                ...platform.competitiveWorld,
                globalPrestige: Math.round(clamp(platform.competitiveWorld.globalPrestige + completedIntegrations.length * 3, 0, 100)),
            },
            corporateDevelopment: {
                ...platform.corporateDevelopment,
                integrations,
            },
            eventLedger: [...platform.eventLedger, ...ledgerEntries],
        }),
        completedIntegrations,
        ledgerEntries,
    };
};

export const withdrawStreamingAcquisitionCase = (
    player: Player,
    caseId: string,
): StreamingAcquisitionActionResult => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const acquisitionCase = findCase(platform, caseId);
    if (!acquisitionCase || ['SIGNED', 'WITHDRAWN'].includes(acquisitionCase.status)) {
        return { player, changed: false, reason: 'CANNOT_WITHDRAW' };
    }
    const nextCase = {
        ...acquisitionCase,
        status: 'WITHDRAWN' as const,
        updatedAtAbsoluteWeek: absoluteWeek,
        outcomeNote: 'The platform walked away before signing. Sunk advisory and diligence costs remain spent.',
    };
    return { player: persistPlayer(player, replaceCase(platform, nextCase)), changed: true, caseId };
};
