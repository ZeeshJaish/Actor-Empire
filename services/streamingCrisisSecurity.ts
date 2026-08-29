import type {
    OwnedStreamingCrisis,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingShadowOperation,
    OwnedStreamingWeeklySnapshot,
    PlatformId,
    Player,
    StreamingCrisisCommunication,
    StreamingCrisisCompensation,
    StreamingCrisisSeverity,
    StreamingCrisisType,
    StreamingIncidentPolicy,
    StreamingShadowOperationType,
    StreamingTrustInitiativeType,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
} from './ownedStreamingPlatform';

const clamp = (value: number, minimum = 0, maximum = 100): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const roundMoney = (value: number): number => Math.max(0, Math.round(value));

const SEVERITY_MULTIPLIER: Record<StreamingCrisisSeverity, number> = {
    MINOR: 0.75,
    SERIOUS: 1,
    MAJOR: 1.65,
    CRITICAL: 2.5,
};

export interface StreamingTrustInitiativeDefinition {
    id: StreamingTrustInitiativeType;
    title: string;
    kicker: string;
    description: string;
    cashCost: number;
    publicTrustDelta: number;
    regulatoryScrutinyDelta: number;
    employeeLoyaltyDelta: number;
    evidenceTrailDelta: number;
    securityPressureDelta: number;
}

export const STREAMING_TRUST_INITIATIVES: StreamingTrustInitiativeDefinition[] = [
    {
        id: 'SECURITY_DRILL',
        title: 'Run a red-team readiness drill',
        kicker: 'DEFENSIVE SECURITY',
        description: 'Stress the response organization, rehearse recovery ownership and close weak hand-offs.',
        cashCost: 2_200_000,
        publicTrustDelta: 1,
        regulatoryScrutinyDelta: -2,
        employeeLoyaltyDelta: 2,
        evidenceTrailDelta: -2,
        securityPressureDelta: -12,
    },
    {
        id: 'WHISTLEBLOWER_CHANNEL',
        title: 'Open a protected speak-up channel',
        kicker: 'EMPLOYEE TRUST',
        description: 'Independent intake gives employees a safe path to raise concerns before they become public failures.',
        cashCost: 1_400_000,
        publicTrustDelta: 2,
        regulatoryScrutinyDelta: -3,
        employeeLoyaltyDelta: 10,
        evidenceTrailDelta: -3,
        securityPressureDelta: -3,
    },
    {
        id: 'TRANSPARENCY_REPORT',
        title: 'Publish a transparency report',
        kicker: 'PUBLIC ACCOUNTABILITY',
        description: 'Explain service reliability, rights enforcement and trust metrics with verifiable operating facts.',
        cashCost: 1_000_000,
        publicTrustDelta: 8,
        regulatoryScrutinyDelta: -6,
        employeeLoyaltyDelta: 2,
        evidenceTrailDelta: -6,
        securityPressureDelta: -1,
    },
    {
        id: 'INDEPENDENT_AUDIT',
        title: 'Commission an independent audit',
        kicker: 'CLEAN ADVANTAGE',
        description: 'A third party reviews security, rights and governance, producing durable defence against future exposure.',
        cashCost: 3_800_000,
        publicTrustDelta: 6,
        regulatoryScrutinyDelta: -12,
        employeeLoyaltyDelta: 4,
        evidenceTrailDelta: -15,
        securityPressureDelta: -8,
    },
];

export interface StreamingShadowOperationDefinition {
    id: StreamingShadowOperationType;
    title: string;
    description: string;
    cashCost: number;
    baseSuccessPercent: number;
    baseExposurePercent: number;
    expectedImpact: string;
}

export const STREAMING_SHADOW_OPERATIONS: StreamingShadowOperationDefinition[] = [
    {
        id: 'INTELLIGENCE_PURCHASE',
        title: 'Purchase market intelligence',
        description: 'Acquire non-public strategic signals through an opaque intermediary.',
        cashCost: 1_600_000,
        baseSuccessPercent: 78,
        baseExposurePercent: 12,
        expectedImpact: 'Sharper read on a rival and a modest prestige advantage.',
    },
    {
        id: 'WHISPER_CAMPAIGN',
        title: 'Commission a whisper campaign',
        description: 'Seed doubt around a rival’s strategic narrative without attaching your company name.',
        cashCost: 2_400_000,
        baseSuccessPercent: 66,
        baseExposurePercent: 26,
        expectedImpact: 'Reduce rival prestige and increase rivalry heat.',
    },
    {
        id: 'CONTRACT_PRESSURE',
        title: 'Apply covert contract pressure',
        description: 'Use indirect commercial leverage to make a rival’s next negotiation more expensive.',
        cashCost: 3_200_000,
        baseSuccessPercent: 61,
        baseExposurePercent: 32,
        expectedImpact: 'Drain part of a rival reserve and create one operating mistake.',
    },
    {
        id: 'COVERT_CONTENT_LEAK',
        title: 'Authorize a covert content leak',
        description: 'Release a protected competitive signal through an unconnected channel.',
        cashCost: 4_500_000,
        baseSuccessPercent: 55,
        baseExposurePercent: 46,
        expectedImpact: 'Damage rival prestige, with a material delayed evidence trail.',
    },
    {
        id: 'CORPORATE_ESPIONAGE',
        title: 'Commission corporate espionage',
        description: 'Seek strategic access through a deniable corporate network.',
        cashCost: 6_500_000,
        baseSuccessPercent: 49,
        baseExposurePercent: 58,
        expectedImpact: 'Create multiple rival mistakes but sharply raise exposure risk.',
    },
    {
        id: 'SERVICE_DISRUPTION_ATTEMPT',
        title: 'Attempt covert service disruption',
        description: 'Back a deniable effort intended to interrupt a rival’s operating momentum.',
        cashCost: 9_000_000,
        baseSuccessPercent: 42,
        baseExposurePercent: 72,
        expectedImpact: 'Largest rival reserve and prestige hit; severe regulatory consequences if exposed.',
    },
];

export interface StreamingCrisisWeeklyEffects {
    acquisitionRateDelta: number;
    churnRateDelta: number;
    engagementRateDelta: number;
    playbackDelta: number;
    weeklyRecoveryCost: number;
    activeCrisis: OwnedStreamingCrisis | null;
}

export interface StreamingIncidentCommandSnapshot {
    available: boolean;
    activeCrisis: OwnedStreamingCrisis | null;
    publicTrust: number;
    regulatoryScrutiny: number;
    employeeLoyalty: number;
    evidenceTrail: number;
    securityPressure: number;
    securityLevel: number;
    reliabilityLevel: number;
    openRegulatoryCaseCount: number;
    openWhistleblowerCount: number;
    pendingEvidenceCount: number;
    recentCrises: OwnedStreamingCrisis[];
    recentShadowOperations: OwnedStreamingShadowOperation[];
}

export interface StreamingCrisisActionResult {
    changed: boolean;
    player: Player;
    reason: string;
}

export interface StreamingCrisisResponsePreview {
    responseCost: number;
    recoveryWeeks: number;
    trustDirection: 'IMPROVES' | 'MIXED' | 'WORSENS';
    scrutinyDirection: 'IMPROVES' | 'MIXED' | 'WORSENS';
    evidenceDirection: 'IMPROVES' | 'MIXED' | 'WORSENS';
}

const ledgerEntry = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    type: OwnedStreamingLedgerEntry['type'],
    idempotencyKey: string,
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

const replacePlayerPlatform = (player: Player, platform: OwnedStreamingPlatformState): Player => ({
    ...player,
    ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platform, player.id),
});

export const getStreamingIncidentCommand = (player: Player): StreamingIncidentCommandSnapshot => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const state = platform.crisisSecurity;
    return {
        available: platform.lifecycle === 'ACTIVE' && Boolean(platform.launchCommit),
        activeCrisis: [...state.crises].reverse().find(item => item.stage !== 'RESOLVED') || null,
        publicTrust: state.publicTrust,
        regulatoryScrutiny: state.regulatoryScrutiny,
        employeeLoyalty: state.employeeLoyalty,
        evidenceTrail: state.evidenceTrail,
        securityPressure: state.securityPressure,
        securityLevel: platform.technologyLevels.SECURITY,
        reliabilityLevel: platform.technologyLevels.RELIABILITY,
        openRegulatoryCaseCount: state.regulatoryCases.filter(item => item.status === 'OPEN').length,
        openWhistleblowerCount: state.whistleblowerReports.filter(item => item.status === 'OPEN').length,
        pendingEvidenceCount: state.shadowOperations.filter(item => item.status === 'EVIDENCE_PENDING').length,
        recentCrises: [...state.crises].reverse().slice(0, 8),
        recentShadowOperations: [...state.shadowOperations].reverse().slice(0, 8),
    };
};

export const getStreamingCrisisWeeklyEffects = (
    value: OwnedStreamingPlatformState,
): StreamingCrisisWeeklyEffects => {
    const platform = normalizeOwnedStreamingPlatformState(value);
    const activeCrisis = [...platform.crisisSecurity.crises].reverse().find(item => item.stage !== 'RESOLVED') || null;
    if (!activeCrisis) {
        const trustAdvantage = clamp((platform.crisisSecurity.publicTrust - 70) / 10_000, -0.004, 0.004);
        return {
            acquisitionRateDelta: trustAdvantage,
            churnRateDelta: -trustAdvantage * 0.75,
            engagementRateDelta: trustAdvantage * 2,
            playbackDelta: 0,
            weeklyRecoveryCost: 0,
            activeCrisis: null,
        };
    }
    const severity = SEVERITY_MULTIPLIER[activeCrisis.severity];
    const recoveringMultiplier = activeCrisis.stage === 'RECOVERING' ? 0.48 : 1;
    return {
        acquisitionRateDelta: -0.0045 * severity * recoveringMultiplier,
        churnRateDelta: 0.006 * severity * recoveringMultiplier,
        engagementRateDelta: -0.012 * severity * recoveringMultiplier,
        playbackDelta: activeCrisis.type === 'PLATFORM_OUTAGE'
            ? -2.2 * severity * recoveringMultiplier
            : activeCrisis.type === 'ACCOUNT_BREACH' ? -0.4 * severity * recoveringMultiplier : 0,
        weeklyRecoveryCost: activeCrisis.stage === 'RECOVERING' ? activeCrisis.weeklyRecoveryCost : 0,
        activeCrisis,
    };
};

const getSeverity = (risk: number): StreamingCrisisSeverity => (
    risk >= 0.72 ? 'CRITICAL' : risk >= 0.56 ? 'MAJOR' : risk >= 0.38 ? 'SERIOUS' : 'MINOR'
);

const CRISIS_COPY: Record<StreamingCrisisType, { title: string; detail: string }> = {
    PLATFORM_OUTAGE: {
        title: 'Peak traffic destabilized the service',
        detail: 'Playback failures spread across a meaningful viewer cohort. The command team needs a recovery doctrine, compensation decision and public message.',
    },
    ACCOUNT_BREACH: {
        title: 'Account-trust controls reported a breach',
        detail: 'A verified account-security event is affecting viewer confidence. Containment, disclosure and remediation now carry different costs.',
    },
    CONTENT_LEAK: {
        title: 'A protected release escaped its window',
        detail: 'A high-value title surfaced before its programmed release. Rights partners, viewers and regulators are watching the response.',
    },
    RECOMMENDATION_BACKLASH: {
        title: 'The recommendation system triggered backlash',
        detail: 'Viewers and creators are challenging how discovery decisions were made. Trust, transparency and product recovery are now linked.',
    },
    RIGHTS_COMPLIANCE: {
        title: 'Rights controls found a material conflict',
        detail: 'A territory or window obligation was not enforced correctly. The platform must repair the catalog and address partner confidence.',
    },
    EMPLOYEE_ALLEGATION: {
        title: 'An internal allegation reached leadership',
        detail: 'An employee raised a credible concern about operating conduct. The response will shape loyalty, evidence and public trust.',
    },
};

const chooseCrisisType = (
    platform: OwnedStreamingPlatformState,
    snapshot: OwnedStreamingWeeklySnapshot,
    rng: () => number,
): StreamingCrisisType => {
    const operations = snapshot.operations;
    if ((operations?.capacityUtilizationPercent || 0) >= 96 || (operations?.playbackSuccessRate || 100) < 97.8) return 'PLATFORM_OUTAGE';
    if (platform.rightsObligations.some(item => item.status === 'BREACHED')) return 'RIGHTS_COMPLIANCE';
    if (platform.crisisSecurity.employeeLoyalty < 48) return 'EMPLOYEE_ALLEGATION';
    if (platform.technologyLevels.SECURITY < 2) return rng() < 0.58 ? 'ACCOUNT_BREACH' : 'CONTENT_LEAK';
    if (platform.technologyLevels.DATA_RECOMMENDATIONS > platform.technologyLevels.SECURITY + 2) return 'RECOMMENDATION_BACKLASH';
    const types: StreamingCrisisType[] = ['PLATFORM_OUTAGE', 'ACCOUNT_BREACH', 'CONTENT_LEAK', 'RECOMMENDATION_BACKLASH', 'RIGHTS_COMPLIANCE', 'EMPLOYEE_ALLEGATION'];
    return types[Math.floor(rng() * types.length)] || 'PLATFORM_OUTAGE';
};

const resolveDueRecoveryAndEvidence = (
    value: OwnedStreamingPlatformState,
    absoluteWeek: number,
): OwnedStreamingPlatformState => {
    let platform = normalizeOwnedStreamingPlatformState(value);
    const state = platform.crisisSecurity;
    const ledger: OwnedStreamingLedgerEntry[] = [];
    let publicTrust = state.publicTrust;
    let regulatoryScrutiny = state.regulatoryScrutiny;
    let employeeLoyalty = state.employeeLoyalty;
    let evidenceTrail = state.evidenceTrail;
    let securityPressure = state.securityPressure;
    let rivalryHeat = platform.competitiveWorld.rivalryHeat;
    let globalPrestige = platform.competitiveWorld.globalPrestige;

    const crises = state.crises.map(crisis => {
        if (crisis.stage !== 'RECOVERING' || crisis.recoveryReadyAtAbsoluteWeek === null || crisis.recoveryReadyAtAbsoluteWeek > absoluteWeek) return crisis;
        const recoveryKey = `${crisis.idempotencyKey}:recovered`;
        publicTrust = clamp(publicTrust + (crisis.communication === 'FULL_DISCLOSURE' ? 6 : 3));
        regulatoryScrutiny = clamp(regulatoryScrutiny - (crisis.responseDoctrine === 'TRANSPARENT_FIRST' ? 8 : 4));
        securityPressure = clamp(securityPressure - 10);
        const recovered: OwnedStreamingCrisis = {
            ...crisis,
            stage: 'RESOLVED',
            resolvedAtAbsoluteWeek: absoluteWeek,
            outcomeNote: 'Service recovered through the funded response plan. The incident remains part of the company record, but operations are stable again.',
        };
        ledger.push(ledgerEntry(platform, absoluteWeek, 'CRISIS_RECOVERED', recoveryKey, `${crisis.title} reached verified recovery.`, { crisisId: crisis.id }));
        return recovered;
    });

    const shadowOperations = state.shadowOperations.map(operation => {
        if (operation.status !== 'EVIDENCE_PENDING' || operation.evidenceDueAtAbsoluteWeek > absoluteWeek) return operation;
        const rng = createDeterministicRng(`${platform.simulationSeed}:shadow-evidence:${operation.id}`);
        const defence = platform.technologyLevels.SECURITY * 2
            + (platform.leadership.appointments.some(item => item.status === 'ACTIVE' && item.role === 'SECURITY_TRUST_HEAD') ? 7 : 0);
        const exposureChance = clamp(operation.exposureRiskPercent - defence, 5, 92);
        const exposed = rng() * 100 < exposureChance;
        const evidenceKey = `${operation.idempotencyKey}:evidence`;
        if (exposed) {
            publicTrust = clamp(publicTrust - 12);
            regulatoryScrutiny = clamp(regulatoryScrutiny + 24);
            employeeLoyalty = clamp(employeeLoyalty - 9);
            evidenceTrail = clamp(evidenceTrail + 28);
            rivalryHeat = clamp(rivalryHeat + 12);
            globalPrestige = clamp(globalPrestige - 7);
        } else {
            evidenceTrail = clamp(evidenceTrail - 2);
        }
        ledger.push(ledgerEntry(
            platform,
            absoluteWeek,
            'SHADOW_EVIDENCE_RESOLVED',
            evidenceKey,
            exposed ? 'A shadow operation was exposed.' : 'A delayed evidence review closed without public attribution.',
            { operationId: operation.id, exposed },
        ));
        return {
            ...operation,
            status: exposed ? 'EXPOSED' as const : 'CLEARED' as const,
            exposureConsequence: exposed
                ? 'Public attribution damaged trust, increased regulatory scrutiny and weakened employee loyalty.'
                : 'The evidence window closed without public attribution.',
        };
    });

    platform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        crisisSecurity: {
            ...state,
            publicTrust,
            regulatoryScrutiny,
            employeeLoyalty,
            evidenceTrail,
            securityPressure,
            crises,
            shadowOperations,
        },
        competitiveWorld: {
            ...platform.competitiveWorld,
            rivalryHeat,
            globalPrestige,
        },
        eventLedger: [...platform.eventLedger, ...ledger],
    });

    const exposed = shadowOperations.find(item => (
        item.status === 'EXPOSED'
        && item.evidenceDueAtAbsoluteWeek === absoluteWeek
        && !value.cinematicQueue.some(scene => scene.idempotencyKey === `${item.idempotencyKey}:exposure-scene`)
    ));
    if (exposed) {
        const fact = platform.eventLedger.find(item => item.idempotencyKey === `${exposed.idempotencyKey}:evidence`);
        if (fact) {
            platform = queueOwnedStreamingCinematic(platform, {
                idempotencyKey: `${exposed.idempotencyKey}:exposure-scene`,
                type: 'CRISIS_EXPOSURE',
                priority: 'MAJOR',
                availableAtAbsoluteWeek: absoluteWeek,
                title: 'The evidence reaches daylight',
                factIds: [fact.id],
            });
        }
    }
    return platform;
};

export const commitStreamingCrisisSecurityWeek = (
    value: OwnedStreamingPlatformState,
    player: Player,
    snapshot: OwnedStreamingWeeklySnapshot,
): OwnedStreamingPlatformState => {
    let platform = resolveDueRecoveryAndEvidence(value, snapshot.absoluteWeek);
    const state = platform.crisisSecurity;
    if (state.lastEvaluatedAbsoluteWeek !== null && state.lastEvaluatedAbsoluteWeek >= snapshot.absoluteWeek) return platform;

    let nextState = {
        ...state,
        lastEvaluatedAbsoluteWeek: snapshot.absoluteWeek,
        publicTrust: clamp(state.publicTrust + (snapshot.operations?.playbackSuccessRate || 0) >= 99 ? 0.35 : -0.2),
        securityPressure: clamp(
            state.securityPressure
            + Math.max(0, (snapshot.operations?.capacityUtilizationPercent || 0) - 82) * 0.12
            + Math.max(0, 2 - platform.technologyLevels.SECURITY) * 1.5
            - platform.technologyLevels.SECURITY * 0.35,
        ),
    };
    const ledger: OwnedStreamingLedgerEntry[] = [];
    const openRegulator = nextState.regulatoryCases.some(item => item.status === 'OPEN');
    if (nextState.regulatoryScrutiny >= 55 && !openRegulator) {
        const key = `streaming-regulatory-case:${snapshot.absoluteWeek}`;
        const caseId = createDeterministicId('streaming_regulator', platform.simulationSeed, key);
        nextState = {
            ...nextState,
            regulatoryCases: [...nextState.regulatoryCases, {
                id: caseId,
                idempotencyKey: key,
                title: 'Platform conduct inquiry',
                status: 'OPEN' as const,
                scrutinyAtOpening: nextState.regulatoryScrutiny,
                openedAtAbsoluteWeek: snapshot.absoluteWeek,
                response: null,
                responseCost: 0,
                resolvedAtAbsoluteWeek: null,
                outcomeNote: null,
            }],
        };
        ledger.push(ledgerEntry(platform, snapshot.absoluteWeek, 'REGULATORY_CASE_OPENED', key, 'A formal platform conduct inquiry opened.', { caseId }));
    }
    const openWhistleblower = nextState.whistleblowerReports.some(item => item.status === 'OPEN');
    if ((nextState.evidenceTrail >= 48 || nextState.employeeLoyalty <= 42) && !openWhistleblower) {
        const key = `streaming-whistleblower:${snapshot.absoluteWeek}`;
        const reportId = createDeterministicId('streaming_whistleblower', platform.simulationSeed, key);
        nextState = {
            ...nextState,
            whistleblowerReports: [...nextState.whistleblowerReports, {
                id: reportId,
                idempotencyKey: key,
                title: 'Protected internal disclosure',
                allegation: 'An employee reported that leadership conduct and the official record may not fully align.',
                status: 'OPEN' as const,
                sourceConfidence: clamp(52 + nextState.evidenceTrail * 0.35),
                openedAtAbsoluteWeek: snapshot.absoluteWeek,
                response: null,
                responseCost: 0,
                resolvedAtAbsoluteWeek: null,
                outcomeNote: null,
            }],
        };
        ledger.push(ledgerEntry(platform, snapshot.absoluteWeek, 'WHISTLEBLOWER_REPORT_OPENED', key, 'A protected internal disclosure reached the board.', { reportId }));
    }

    const unresolved = nextState.crises.some(item => item.stage !== 'RESOLVED')
        || nextState.infrastructureOperations.incidents.some(item => item.stage !== 'RESOLVED');
    const lastCrisisWeek = nextState.crises.at(-1)?.detectedAtAbsoluteWeek ?? -100;
    const operations = snapshot.operations;
    const technicalDebt = platform.infrastructureSetup?.technicalDebt || 0;
    const risk = clamp(
        0.045
        + Math.max(0, (operations?.capacityUtilizationPercent || 0) - 82) / 145
        + Math.max(0, 98.8 - (operations?.playbackSuccessRate || 99.8)) / 18
        + technicalDebt / 150
        + nextState.securityPressure / 430
        + Math.max(0, 60 - nextState.employeeLoyalty) / 420
        + platform.corporateDevelopment.integrations.filter(item => item.status === 'IN_PROGRESS').length * 0.035
        - platform.technologyLevels.SECURITY * 0.018
        - platform.technologyLevels.RELIABILITY * 0.012,
        0.02,
        0.78,
    );
    const rng = createDeterministicRng(`${platform.simulationSeed}:crisis-week:${snapshot.absoluteWeek}`);
    let detectedCrisis: OwnedStreamingCrisis | null = null;
    if (!unresolved && snapshot.absoluteWeek - lastCrisisWeek >= 6 && rng() < risk) {
        const type = chooseCrisisType(platform, snapshot, rng);
        const severity = getSeverity(risk + rng() * 0.18);
        const multiplier = SEVERITY_MULTIPLIER[severity];
        const key = `streaming-crisis:${snapshot.absoluteWeek}:${type}`;
        const copy = CRISIS_COPY[type];
        detectedCrisis = {
            id: createDeterministicId('streaming_crisis', platform.simulationSeed, key),
            idempotencyKey: key,
            type,
            severity,
            stage: 'DETECTED',
            title: copy.title,
            detail: copy.detail,
            cause: type === 'PLATFORM_OUTAGE'
                ? `${(operations?.capacityUtilizationPercent || 0).toFixed(0)}% peak-capacity use and ${(operations?.playbackSuccessRate || 0).toFixed(2)}% playback success`
                : `${platform.technologyLevels.SECURITY} security maturity with ${nextState.securityPressure.toFixed(0)} pressure`,
            detectedAtAbsoluteWeek: snapshot.absoluteWeek,
            affectedSubscribers: Math.round(snapshot.subscribers * clamp(0.025 * multiplier, 0.01, 0.22)),
            estimatedRevenueAtRisk: roundMoney((operations?.subscriptionRevenue || 0) * 0.16 * multiplier),
            responseDoctrine: null,
            compensation: null,
            communication: null,
            responseCost: 0,
            weeklyRecoveryCost: roundMoney(650_000 * multiplier),
            recoveryReadyAtAbsoluteWeek: null,
            resolvedAtAbsoluteWeek: null,
            outcomeNote: null,
        };
        nextState = {
            ...nextState,
            publicTrust: clamp(nextState.publicTrust - 2.5 * multiplier),
            regulatoryScrutiny: clamp(nextState.regulatoryScrutiny + (type === 'ACCOUNT_BREACH' || type === 'RIGHTS_COMPLIANCE' ? 5 : 2) * multiplier),
            securityPressure: clamp(nextState.securityPressure + 9 * multiplier),
            crises: [...nextState.crises, detectedCrisis],
        };
        ledger.push(ledgerEntry(platform, snapshot.absoluteWeek, 'CRISIS_DETECTED', key, copy.title, {
            crisisId: detectedCrisis.id,
            type,
            severity,
            affectedSubscribers: detectedCrisis.affectedSubscribers,
        }));
    }

    platform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        crisisSecurity: nextState,
        eventLedger: [...platform.eventLedger, ...ledger],
    }, player.id);
    const newFacts = new Map(ledger.map(item => [item.idempotencyKey, item]));
    const regulatorFact = [...ledger].reverse().find(item => item.type === 'REGULATORY_CASE_OPENED');
    const whistleblowerFact = [...ledger].reverse().find(item => item.type === 'WHISTLEBLOWER_REPORT_OPENED');
    const crisisFact = detectedCrisis ? newFacts.get(detectedCrisis.idempotencyKey) : null;
    if (crisisFact) {
        platform = queueOwnedStreamingCinematic(platform, {
            idempotencyKey: `${detectedCrisis!.idempotencyKey}:scene`,
            type: detectedCrisis!.type === 'PLATFORM_OUTAGE' ? 'PLATFORM_OUTAGE' : 'CRISIS_EXPOSURE',
            priority: detectedCrisis!.severity === 'CRITICAL' ? 'MAJOR' : 'IMPORTANT',
            availableAtAbsoluteWeek: snapshot.absoluteWeek,
            title: detectedCrisis!.title,
            factIds: [crisisFact.id],
        });
    } else if (whistleblowerFact) {
        platform = queueOwnedStreamingCinematic(platform, {
            idempotencyKey: `${whistleblowerFact.idempotencyKey}:scene`,
            type: 'WHISTLEBLOWER_REVEAL',
            priority: 'MAJOR',
            availableAtAbsoluteWeek: snapshot.absoluteWeek,
            title: 'A protected voice reaches the board',
            factIds: [whistleblowerFact.id],
        });
    } else if (regulatorFact) {
        platform = queueOwnedStreamingCinematic(platform, {
            idempotencyKey: `${regulatorFact.idempotencyKey}:scene`,
            type: 'REGULATORY_HEARING',
            priority: 'MAJOR',
            availableAtAbsoluteWeek: snapshot.absoluteWeek,
            title: 'The regulator opens the record',
            factIds: [regulatorFact.id],
        });
    }
    return platform;
};

export const respondToStreamingCrisis = (
    player: Player,
    crisisId: string,
    doctrine: StreamingIncidentPolicy,
    compensation: StreamingCrisisCompensation,
    communication: StreamingCrisisCommunication,
): StreamingCrisisActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const crisis = platform.crisisSecurity.crises.find(item => item.id === crisisId && item.stage === 'DETECTED');
    if (!crisis) return { changed: false, player, reason: 'That incident no longer needs a first response.' };
    const preview = getStreamingCrisisResponsePreview(platform, crisis, doctrine, compensation, communication);
    const responseCost = preview.responseCost;
    if (platform.treasuryCash < responseCost) return { changed: false, player, reason: 'The company treasury cannot fund this response package.' };
    const recoveryWeeks = preview.recoveryWeeks;
    const trustDelta = (compensation === 'FULL' ? 7 : compensation === 'TARGETED' ? 3 : -4)
        + (communication === 'FULL_DISCLOSURE' ? 7 : communication === 'FACTUAL_UPDATE' ? 2 : -4)
        + (doctrine === 'TRANSPARENT_FIRST' ? 3 : doctrine === 'CONTAIN_FIRST' ? -2 : 0);
    const scrutinyDelta = (communication === 'FULL_DISCLOSURE' ? -8 : communication === 'HOLDING_STATEMENT' ? 5 : -2)
        + (doctrine === 'TRANSPARENT_FIRST' ? -5 : doctrine === 'CONTAIN_FIRST' ? 4 : 0);
    const evidenceDelta = doctrine === 'CONTAIN_FIRST' ? 8 : doctrine === 'TRANSPARENT_FIRST' ? -6 : -2;
    const key = `${crisis.idempotencyKey}:response`;
    const entry = ledgerEntry(platform, absoluteWeek, 'CRISIS_RESPONSE_LOCKED', key, `Leadership funded a ${doctrine.toLowerCase().replaceAll('_', ' ')} recovery for ${crisis.title}.`, {
        crisisId: crisis.id,
        doctrine,
        compensation,
        communication,
        responseCost,
        recoveryWeeks,
    });
    const nextPlatform = {
        ...platform,
        treasuryCash: platform.treasuryCash - responseCost,
        crisisSecurity: {
            ...platform.crisisSecurity,
            publicTrust: clamp(platform.crisisSecurity.publicTrust + trustDelta),
            regulatoryScrutiny: clamp(platform.crisisSecurity.regulatoryScrutiny + scrutinyDelta),
            evidenceTrail: clamp(platform.crisisSecurity.evidenceTrail + evidenceDelta),
            employeeLoyalty: clamp(platform.crisisSecurity.employeeLoyalty + (doctrine === 'TRANSPARENT_FIRST' ? 4 : doctrine === 'CONTAIN_FIRST' ? -2 : 1)),
            crises: platform.crisisSecurity.crises.map(item => item.id === crisis.id ? {
                ...item,
                stage: 'RECOVERING' as const,
                responseDoctrine: doctrine,
                compensation,
                communication,
                responseCost,
                weeklyRecoveryCost: roundMoney(item.weeklyRecoveryCost * (doctrine === 'SERVICE_FIRST' ? 1.15 : 1)),
                recoveryReadyAtAbsoluteWeek: absoluteWeek + recoveryWeeks,
                outcomeNote: `Recovery is funded and targeted for game week ${absoluteWeek + recoveryWeeks}.`,
            } : item),
        },
        eventLedger: [...platform.eventLedger, entry],
    };
    return { changed: true, player: replacePlayerPlatform(player, nextPlatform), reason: 'The incident entered funded recovery.' };
};

export const getStreamingCrisisResponsePreview = (
    platform: OwnedStreamingPlatformState,
    crisis: OwnedStreamingCrisis,
    doctrine: StreamingIncidentPolicy,
    compensation: StreamingCrisisCompensation,
    communication: StreamingCrisisCommunication,
): StreamingCrisisResponsePreview => {
    const multiplier = SEVERITY_MULTIPLIER[crisis.severity];
    const doctrineCost = doctrine === 'SERVICE_FIRST' ? 2_200_000 : doctrine === 'TRANSPARENT_FIRST' ? 2_600_000 : 1_500_000;
    const compensationCost = compensation === 'FULL'
        ? Math.max(1_500_000, crisis.affectedSubscribers * 12)
        : compensation === 'TARGETED' ? Math.max(450_000, crisis.affectedSubscribers * 4) : 0;
    const communicationCost = communication === 'FULL_DISCLOSURE' ? 1_100_000 : communication === 'FACTUAL_UPDATE' ? 450_000 : 150_000;
    const responseCost = roundMoney((doctrineCost + compensationCost + communicationCost) * multiplier);
    const recoveryWeeks = Math.max(2, Math.round(
        5
        - (doctrine === 'SERVICE_FIRST' ? 1 : 0)
        - (platform.technologyLevels.RELIABILITY >= 3 ? 1 : 0)
        + (doctrine === 'TRANSPARENT_FIRST' ? 1 : 0),
    ));
    const trustScore = (compensation === 'FULL' ? 2 : compensation === 'TARGETED' ? 1 : -1)
        + (communication === 'FULL_DISCLOSURE' ? 2 : communication === 'FACTUAL_UPDATE' ? 1 : -1)
        + (doctrine === 'TRANSPARENT_FIRST' ? 1 : doctrine === 'CONTAIN_FIRST' ? -1 : 0);
    const scrutinyScore = (communication === 'FULL_DISCLOSURE' ? 2 : communication === 'HOLDING_STATEMENT' ? -1 : 1)
        + (doctrine === 'TRANSPARENT_FIRST' ? 2 : doctrine === 'CONTAIN_FIRST' ? -1 : 0);
    const evidenceScore = doctrine === 'TRANSPARENT_FIRST' ? 2 : doctrine === 'CONTAIN_FIRST' ? -2 : 1;
    const direction = (score: number): 'IMPROVES' | 'MIXED' | 'WORSENS' => score >= 2 ? 'IMPROVES' : score <= -1 ? 'WORSENS' : 'MIXED';
    return {
        responseCost,
        recoveryWeeks,
        trustDirection: direction(trustScore),
        scrutinyDirection: direction(scrutinyScore),
        evidenceDirection: direction(evidenceScore),
    };
};

export const launchStreamingTrustInitiative = (
    player: Player,
    type: StreamingTrustInitiativeType,
): StreamingCrisisActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const definition = STREAMING_TRUST_INITIATIVES.find(item => item.id === type);
    if (!definition) return { changed: false, player, reason: 'Unknown trust initiative.' };
    if (platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return { changed: false, player, reason: 'Incident Command opens after platform launch.' };
    if (platform.treasuryCash < definition.cashCost) return { changed: false, player, reason: 'The company treasury cannot fund this initiative.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const recentDuplicate = platform.crisisSecurity.trustInitiatives.some(item => (
        item.type === type && absoluteWeek - item.completedAtAbsoluteWeek < 8
    ));
    if (recentDuplicate) return { changed: false, player, reason: 'This initiative is still producing benefits. Revisit it after eight game weeks.' };
    const key = `streaming-trust:${type}:${absoluteWeek}`;
    const initiative = {
        id: createDeterministicId('streaming_trust', platform.simulationSeed, key),
        idempotencyKey: key,
        type,
        title: definition.title,
        cashCost: definition.cashCost,
        completedAtAbsoluteWeek: absoluteWeek,
        outcomeNote: definition.description,
    };
    const entry = ledgerEntry(platform, absoluteWeek, 'TRUST_INITIATIVE_COMPLETED', key, `${definition.title} completed.`, { type, cashCost: definition.cashCost });
    const nextPlatform = {
        ...platform,
        treasuryCash: platform.treasuryCash - definition.cashCost,
        crisisSecurity: {
            ...platform.crisisSecurity,
            publicTrust: clamp(platform.crisisSecurity.publicTrust + definition.publicTrustDelta),
            regulatoryScrutiny: clamp(platform.crisisSecurity.regulatoryScrutiny + definition.regulatoryScrutinyDelta),
            employeeLoyalty: clamp(platform.crisisSecurity.employeeLoyalty + definition.employeeLoyaltyDelta),
            evidenceTrail: clamp(platform.crisisSecurity.evidenceTrail + definition.evidenceTrailDelta),
            securityPressure: clamp(platform.crisisSecurity.securityPressure + definition.securityPressureDelta),
            trustInitiatives: [...platform.crisisSecurity.trustInitiatives, initiative],
        },
        governance: {
            ...platform.governance,
            boardConfidence: clamp(platform.governance.boardConfidence + (type === 'INDEPENDENT_AUDIT' ? 4 : 1)),
        },
        eventLedger: [...platform.eventLedger, entry],
    };
    return { changed: true, player: replacePlayerPlatform(player, nextPlatform), reason: `${definition.title} strengthened the platform.` };
};

export const launchStreamingShadowOperation = (
    player: Player,
    type: StreamingShadowOperationType,
    targetPlatformId: PlatformId,
): StreamingCrisisActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const definition = STREAMING_SHADOW_OPERATIONS.find(item => item.id === type);
    const rival = platform.competitiveWorld.rivals.find(item => item.platformId === targetPlatformId);
    if (!definition || !rival) return { changed: false, player, reason: 'Choose a known rival and operation.' };
    if (platform.treasuryCash < definition.cashCost) return { changed: false, player, reason: 'The company treasury cannot fund this operation.' };
    if (platform.crisisSecurity.shadowOperations.some(item => item.status === 'EVIDENCE_PENDING')) {
        return { changed: false, player, reason: 'One delayed evidence window is already open.' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const securityHead = platform.leadership.appointments.some(item => item.status === 'ACTIVE' && item.role === 'SECURITY_TRUST_HEAD');
    const successEstimatePercent = clamp(definition.baseSuccessPercent + platform.competitiveWorld.globalPrestige * 0.08 - rival.technology * 1.1, 18, 88);
    const exposureRiskPercent = clamp(definition.baseExposurePercent - platform.technologyLevels.SECURITY * 2.5 - (securityHead ? 5 : 0), 5, 92);
    const key = `streaming-shadow:${type}:${targetPlatformId}:${absoluteWeek}`;
    const rng = createDeterministicRng(`${platform.simulationSeed}:${key}`);
    const succeeded = rng() * 100 < successEstimatePercent;
    const evidenceDelay = 3 + Math.floor(rng() * 5);
    const operation: OwnedStreamingShadowOperation = {
        id: createDeterministicId('streaming_shadow', platform.simulationSeed, key),
        idempotencyKey: key,
        type,
        targetPlatformId,
        targetPlatformName: rival.platformName,
        status: 'EVIDENCE_PENDING',
        cashCost: definition.cashCost,
        successEstimatePercent,
        exposureRiskPercent,
        expectedImpact: definition.expectedImpact,
        committedAtAbsoluteWeek: absoluteWeek,
        evidenceDueAtAbsoluteWeek: absoluteWeek + evidenceDelay,
        succeeded,
        outcomeNote: succeeded
            ? `${rival.platformName} absorbed the expected competitive pressure. Attribution remains unresolved.`
            : `The intended impact did not materialize. The evidence window remains open.`,
        exposureConsequence: null,
    };
    const rivalSeverity = type === 'SERVICE_DISRUPTION_ATTEMPT' ? 3 : type === 'CORPORATE_ESPIONAGE' || type === 'COVERT_CONTENT_LEAK' ? 2 : 1;
    const updatedRivals = platform.competitiveWorld.rivals.map(item => item.platformId === rival.platformId && succeeded ? {
        ...item,
        cashReserveMillions: Math.max(0, item.cashReserveMillions - rivalSeverity * 4),
        prestige: clamp(item.prestige - rivalSeverity * 2),
        mistakes: item.mistakes + rivalSeverity,
        memory: {
            ...item.memory,
            resentment: clamp(item.memory.resentment + rivalSeverity * 5),
            encounters: item.memory.encounters + 1,
        },
    } : item);
    const entry = ledgerEntry(platform, absoluteWeek, 'SHADOW_OPERATION_COMMITTED', key, `${definition.title} was authorized against ${rival.platformName}.`, {
        type,
        targetPlatformId,
        cashCost: definition.cashCost,
        successEstimatePercent,
        exposureRiskPercent,
        evidenceDueAtAbsoluteWeek: operation.evidenceDueAtAbsoluteWeek,
    });
    let nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - definition.cashCost,
        crisisSecurity: {
            ...platform.crisisSecurity,
            evidenceTrail: clamp(platform.crisisSecurity.evidenceTrail + definition.baseExposurePercent * 0.16),
            employeeLoyalty: clamp(platform.crisisSecurity.employeeLoyalty - (type === 'INTELLIGENCE_PURCHASE' ? 1 : rivalSeverity * 2)),
            shadowOperations: [...platform.crisisSecurity.shadowOperations, operation],
        },
        competitiveWorld: {
            ...platform.competitiveWorld,
            rivalryHeat: clamp(platform.competitiveWorld.rivalryHeat + rivalSeverity * 6),
            globalPrestige: clamp(platform.competitiveWorld.globalPrestige + (succeeded && type === 'INTELLIGENCE_PURCHASE' ? 2 : 0)),
            rivals: updatedRivals,
        },
        eventLedger: [...platform.eventLedger, entry],
    }, player.id);
    nextPlatform = queueOwnedStreamingCinematic(nextPlatform, {
        idempotencyKey: `${key}:scene`,
        type: 'SHADOW_OPERATION',
        priority: type === 'SERVICE_DISRUPTION_ATTEMPT' ? 'MAJOR' : 'IMPORTANT',
        availableAtAbsoluteWeek: absoluteWeek,
        title: 'A decision enters the shadows',
        factIds: [entry.id],
    });
    return { changed: true, player: replacePlayerPlatform(player, nextPlatform), reason: operation.outcomeNote };
};

export const respondToStreamingRegulator = (
    player: Player,
    caseId: string,
    response: 'COOPERATE' | 'CONTEST' | 'REMEDIATE',
): StreamingCrisisActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const regulatoryCase = platform.crisisSecurity.regulatoryCases.find(item => item.id === caseId && item.status === 'OPEN');
    if (!regulatoryCase) return { changed: false, player, reason: 'No open regulatory case matches that record.' };
    const cost = response === 'REMEDIATE' ? 5_500_000 : response === 'COOPERATE' ? 2_400_000 : 3_200_000;
    if (platform.treasuryCash < cost) return { changed: false, player, reason: 'The company treasury cannot fund this response.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const scrutinyDelta = response === 'REMEDIATE' ? -28 : response === 'COOPERATE' ? -18 : -7;
    const trustDelta = response === 'REMEDIATE' ? 7 : response === 'COOPERATE' ? 4 : -2;
    const key = `${regulatoryCase.idempotencyKey}:resolved`;
    const entry = ledgerEntry(platform, absoluteWeek, 'REGULATORY_CASE_RESOLVED', key, `${regulatoryCase.title} closed through ${response.toLowerCase()}.`, { caseId, response, cost });
    const nextPlatform = {
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        crisisSecurity: {
            ...platform.crisisSecurity,
            publicTrust: clamp(platform.crisisSecurity.publicTrust + trustDelta),
            regulatoryScrutiny: clamp(platform.crisisSecurity.regulatoryScrutiny + scrutinyDelta),
            evidenceTrail: clamp(platform.crisisSecurity.evidenceTrail + (response === 'CONTEST' ? 4 : -5)),
            regulatoryCases: platform.crisisSecurity.regulatoryCases.map(item => item.id === caseId ? {
                ...item,
                status: 'CLOSED' as const,
                response,
                responseCost: cost,
                resolvedAtAbsoluteWeek: absoluteWeek,
                outcomeNote: 'The inquiry closed with a funded, recoverable company consequence.',
            } : item),
        },
        eventLedger: [...platform.eventLedger, entry],
    };
    return { changed: true, player: replacePlayerPlatform(player, nextPlatform), reason: 'The regulatory case is closed.' };
};

export const respondToStreamingWhistleblower = (
    player: Player,
    reportId: string,
    response: 'PROTECT_AND_INVESTIGATE' | 'DISCREDIT' | 'DISCLOSE',
): StreamingCrisisActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const report = platform.crisisSecurity.whistleblowerReports.find(item => item.id === reportId && item.status === 'OPEN');
    if (!report) return { changed: false, player, reason: 'No open internal report matches that record.' };
    const cost = response === 'PROTECT_AND_INVESTIGATE' ? 2_800_000 : response === 'DISCLOSE' ? 1_800_000 : 900_000;
    if (platform.treasuryCash < cost) return { changed: false, player, reason: 'The company treasury cannot fund this response.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const loyaltyDelta = response === 'PROTECT_AND_INVESTIGATE' ? 12 : response === 'DISCLOSE' ? 6 : -16;
    const trustDelta = response === 'DISCLOSE' ? 7 : response === 'PROTECT_AND_INVESTIGATE' ? 4 : -8;
    const evidenceDelta = response === 'DISCREDIT' ? 15 : response === 'PROTECT_AND_INVESTIGATE' ? -9 : -5;
    const key = `${report.idempotencyKey}:resolved`;
    const entry = ledgerEntry(platform, absoluteWeek, 'WHISTLEBLOWER_REPORT_RESOLVED', key, `Leadership answered ${report.title}.`, { reportId, response, cost });
    const nextPlatform = {
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        crisisSecurity: {
            ...platform.crisisSecurity,
            publicTrust: clamp(platform.crisisSecurity.publicTrust + trustDelta),
            regulatoryScrutiny: clamp(platform.crisisSecurity.regulatoryScrutiny + (response === 'DISCREDIT' ? 10 : -4)),
            employeeLoyalty: clamp(platform.crisisSecurity.employeeLoyalty + loyaltyDelta),
            evidenceTrail: clamp(platform.crisisSecurity.evidenceTrail + evidenceDelta),
            whistleblowerReports: platform.crisisSecurity.whistleblowerReports.map(item => item.id === reportId ? {
                ...item,
                status: 'RESOLVED' as const,
                response,
                responseCost: cost,
                resolvedAtAbsoluteWeek: absoluteWeek,
                outcomeNote: response === 'DISCREDIT'
                    ? 'The allegation was challenged, but the evidence and employee-risk tracks worsened.'
                    : 'The report closed through a protected company process.',
            } : item),
        },
        eventLedger: [...platform.eventLedger, entry],
    };
    return { changed: true, player: replacePlayerPlatform(player, nextPlatform), reason: 'The internal report is resolved.' };
};
