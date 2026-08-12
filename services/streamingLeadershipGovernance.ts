import type {
    OwnedStreamingBoardDirector,
    OwnedStreamingBoardMotion,
    OwnedStreamingCapitalAction,
    OwnedStreamingCelebrityInvestor,
    OwnedStreamingCinematicEvent,
    OwnedStreamingExecutiveAppointment,
    OwnedStreamingExecutiveDevelopment,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    Player,
    StreamingBoardMotionId,
    StreamingExecutiveDevelopmentTrack,
    StreamingExecutiveRole,
    StreamingExecutiveStrategy,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    STREAMING_EXECUTIVE_CANDIDATES,
    hireStreamingExecutive,
    type StreamingExecutiveCandidate,
} from './streamingCompany';

export interface StreamingInternalPromotionCandidate {
    id: string;
    name: string;
    initials: string;
    currentTitle: string;
    role: StreamingExecutiveRole;
    roleLabel: string;
    specialty: string;
    weeklyCompensation: number;
    skill: number;
    loyalty: number;
    ambition: number;
    ethics: number;
    preferredStrategy: StreamingExecutiveStrategy;
}

export interface StreamingExecutiveDevelopmentDefinition {
    id: StreamingExecutiveDevelopmentTrack;
    title: string;
    description: string;
    capitalCost: number;
    developmentWeeks: number;
    effectLabel: string;
}

export interface StreamingIndependentDirectorCandidate {
    id: string;
    name: string;
    initials: string;
    specialty: string;
    preferredStrategy: StreamingExecutiveStrategy;
    independence: number;
    founderRelationship: number;
    weeklyCompensation: number;
    promise: string;
    friction: string;
}

export interface StreamingCelebrityInvestorOffer {
    id: string;
    name: string;
    initials: string;
    publicIdentity: string;
    investedCapital: number;
    ownershipPercent: number;
    boardSeat: boolean;
    profitParticipationPercent: number;
    preferredStrategy: StreamingExecutiveStrategy;
    influenceDemand: string;
    attentionEffect: string;
    caution: string;
}

export interface StreamingBoardMotionDefinition {
    id: StreamingBoardMotionId;
    title: string;
    eyebrow: string;
    description: string;
    strategy: StreamingExecutiveStrategy;
    consequence: string;
}

export interface StreamingLeadershipSuite {
    available: boolean;
    absoluteWeek: number;
    activeExecutives: OwnedStreamingExecutiveAppointment[];
    openRoles: StreamingExecutiveRole[];
    activeDevelopment: OwnedStreamingExecutiveDevelopment[];
    weeklyExecutiveCost: number;
    weeklyBoardCost: number;
    boardBinding: boolean;
    boardModeLabel: string;
    boardConfidence: number;
    activeDirectors: OwnedStreamingBoardDirector[];
    outsideOwnershipPercent: number;
    delegationCoverage: Record<'RIGHTS' | 'CAPACITY' | 'CAMPAIGNS' | 'RENEWALS' | 'INCIDENTS', boolean>;
    alerts: string[];
}

export interface StreamingLeadershipActionResult {
    player: Player;
    changed: boolean;
    reason?: string;
}

export const STREAMING_EXECUTIVE_ROLE_ORDER: StreamingExecutiveRole[] = [
    'COO',
    'CFO',
    'CTO',
    'CHIEF_CONTENT_OFFICER',
    'PRODUCT_HEAD',
    'MARKETING_HEAD',
    'ADVERTISING_HEAD',
    'INTERNATIONAL_HEAD',
    'SECURITY_TRUST_HEAD',
];

export const STREAMING_EXECUTIVE_ROLE_LABELS: Record<StreamingExecutiveRole, string> = {
    COO: 'Chief Operating Officer',
    CFO: 'Chief Financial Officer',
    CTO: 'Chief Technology Officer',
    CHIEF_CONTENT_OFFICER: 'Chief Content Officer',
    PRODUCT_HEAD: 'Product Head',
    MARKETING_HEAD: 'Marketing Head',
    ADVERTISING_HEAD: 'Advertising Head',
    INTERNATIONAL_HEAD: 'International Head',
    SECURITY_TRUST_HEAD: 'Security & Trust Head',
};

export const STREAMING_INTERNAL_PROMOTION_CANDIDATES: StreamingInternalPromotionCandidate[] = [
    { id: 'internal-coo', name: 'Rhea Menon', initials: 'RM', currentTitle: 'VP, Platform Operations', role: 'COO', roleLabel: 'COO', specialty: 'Operating cadence', weeklyCompensation: 132_000, skill: 66, loyalty: 86, ambition: 68, ethics: 84, preferredStrategy: 'BALANCED' },
    { id: 'internal-cfo', name: 'Daniel Kim', initials: 'DK', currentTitle: 'Finance Director', role: 'CFO', roleLabel: 'CFO', specialty: 'Treasury controls', weeklyCompensation: 138_000, skill: 68, loyalty: 84, ambition: 61, ethics: 91, preferredStrategy: 'MARGIN_FIRST' },
    { id: 'internal-cto', name: 'Ishaan Bose', initials: 'IB', currentTitle: 'VP, Engineering', role: 'CTO', roleLabel: 'CTO', specialty: 'Reliable systems', weeklyCompensation: 150_000, skill: 70, loyalty: 82, ambition: 73, ethics: 78, preferredStrategy: 'TECHNOLOGY_FIRST' },
    { id: 'internal-content', name: 'Zara Khan', initials: 'ZK', currentTitle: 'Director, Originals', role: 'CHIEF_CONTENT_OFFICER', roleLabel: 'Chief Content Officer', specialty: 'Audience-led slates', weeklyCompensation: 142_000, skill: 69, loyalty: 85, ambition: 75, ethics: 82, preferredStrategy: 'CREATIVE_FIRST' },
    { id: 'internal-product', name: 'Noah Williams', initials: 'NW', currentTitle: 'Director, Product', role: 'PRODUCT_HEAD', roleLabel: 'Product Head', specialty: 'Viewer journeys', weeklyCompensation: 128_000, skill: 67, loyalty: 88, ambition: 70, ethics: 86, preferredStrategy: 'GROWTH_FIRST' },
    { id: 'internal-marketing', name: 'Anika Shah', initials: 'AS', currentTitle: 'Director, Brand', role: 'MARKETING_HEAD', roleLabel: 'Marketing Head', specialty: 'Franchise campaigns', weeklyCompensation: 126_000, skill: 66, loyalty: 83, ambition: 80, ethics: 76, preferredStrategy: 'GROWTH_FIRST' },
    { id: 'internal-advertising', name: 'Mateo Cruz', initials: 'MC', currentTitle: 'Director, Ad Products', role: 'ADVERTISING_HEAD', roleLabel: 'Advertising Head', specialty: 'Responsible monetization', weeklyCompensation: 124_000, skill: 65, loyalty: 84, ambition: 68, ethics: 88, preferredStrategy: 'MARGIN_FIRST' },
    { id: 'internal-international', name: 'Priya Iyer', initials: 'PI', currentTitle: 'Director, Localization', role: 'INTERNATIONAL_HEAD', roleLabel: 'International Head', specialty: 'Regional operations', weeklyCompensation: 140_000, skill: 68, loyalty: 87, ambition: 66, ethics: 89, preferredStrategy: 'GLOBAL_FIRST' },
    { id: 'internal-security', name: 'Omar Rahman', initials: 'OR', currentTitle: 'Director, Trust Operations', role: 'SECURITY_TRUST_HEAD', roleLabel: 'Security & Trust Head', specialty: 'Viewer protection', weeklyCompensation: 136_000, skill: 69, loyalty: 89, ambition: 55, ethics: 96, preferredStrategy: 'TRUST_FIRST' },
];

export const STREAMING_EXECUTIVE_DEVELOPMENT_PROGRAMS: StreamingExecutiveDevelopmentDefinition[] = [
    { id: 'ROLE_MASTERY', title: 'Role Mastery Lab', description: 'Deep operating work with the executive team.', capitalCost: 4_000_000, developmentWeeks: 3, effectLabel: '+8 skill, +6 performance' },
    { id: 'FOUNDER_ALIGNMENT', title: 'Founder Alignment Retreat', description: 'Clarify authority, conflict boundaries and shared strategy.', capitalCost: 2_500_000, developmentWeeks: 2, effectLabel: '+10 loyalty, +10 founder relationship' },
    { id: 'ETHICS_TRUST', title: 'Trust & Governance Residency', description: 'Strengthen judgment before pressure arrives.', capitalCost: 3_000_000, developmentWeeks: 3, effectLabel: '+10 ethics, +5 internal relationship' },
    { id: 'PERFORMANCE_COACHING', title: 'Executive Performance Sprint', description: 'Turn current capability into better weekly execution.', capitalCost: 2_000_000, developmentWeeks: 2, effectLabel: '+12 performance, +4 experience' },
];

export const STREAMING_INDEPENDENT_DIRECTORS: StreamingIndependentDirectorCandidate[] = [
    { id: 'director-meera-sen', name: 'Meera Sen', initials: 'MS', specialty: 'Media governance', preferredStrategy: 'BALANCED', independence: 92, founderRelationship: 58, weeklyCompensation: 95_000, promise: 'Balances founder speed with durable governance.', friction: 'Will not approve decisions with hidden downside.' },
    { id: 'director-thomas-adebayo', name: 'Thomas Adebayo', initials: 'TA', specialty: 'Technology oversight', preferredStrategy: 'TECHNOLOGY_FIRST', independence: 88, founderRelationship: 54, weeklyCompensation: 105_000, promise: 'Understands infrastructure, risk and long-term platform value.', friction: 'Challenges content spending that outruns the stack.' },
    { id: 'director-lucia-reyes', name: 'Lucia Reyes', initials: 'LR', specialty: 'Audience and trust', preferredStrategy: 'TRUST_FIRST', independence: 95, founderRelationship: 52, weeklyCompensation: 100_000, promise: 'Protects viewers and the platform’s public legitimacy.', friction: 'Rejects growth tactics that trade away trust.' },
];

export const STREAMING_CELEBRITY_INVESTOR_OFFERS: StreamingCelebrityInvestorOffer[] = [
    { id: 'investor-aarav-kapoor', name: 'Aarav Kapoor', initials: 'AK', publicIdentity: 'Global film star', investedCapital: 120_000_000, ownershipPercent: 8, boardSeat: false, profitParticipationPercent: 1.5, preferredStrategy: 'CREATIVE_FIRST', influenceDemand: 'First-look access for two prestige productions and visible launch participation.', attentionEffect: 'Instant cultural attention without guaranteed subscriber conversion.', caution: 'Creative expectations may conflict with margin discipline.' },
    { id: 'investor-sofia-laurent', name: 'Sofia Laurent', initials: 'SL', publicIdentity: 'Actor and luxury founder', investedCapital: 240_000_000, ownershipPercent: 14, boardSeat: true, profitParticipationPercent: 2.5, preferredStrategy: 'GLOBAL_FIRST', influenceDemand: 'One board seat and a serious international rollout mandate.', attentionEffect: 'High global credibility and partner attention.', caution: 'Her nominee receives a genuine vote after dilution.' },
    { id: 'investor-dante-cole', name: 'Dante Cole', initials: 'DC', publicIdentity: 'Music and sports icon', investedCapital: 360_000_000, ownershipPercent: 22, boardSeat: true, profitParticipationPercent: 4, preferredStrategy: 'GROWTH_FIRST', influenceDemand: 'Live-event priority, commerce participation and a board seat.', attentionEffect: 'Mass-market heat around Live, Fan and Store.', caution: 'The largest capital offer creates the strongest ongoing influence.' },
];

export const STREAMING_BOARD_MOTIONS: StreamingBoardMotionDefinition[] = [
    { id: 'RIGHTS_AUTHORITY', eyebrow: 'CONTENT CAPITAL', title: 'Expand delegated rights authority', description: 'Let the content and finance team negotiate larger windows without returning for every threshold decision.', strategy: 'CREATIVE_FIRST', consequence: 'Maximum delegated rights bid increases by $25M.' },
    { id: 'CAPACITY_GUARDRAIL', eyebrow: 'PLATFORM RESILIENCE', title: 'Adopt the 30% headroom rule', description: 'Require a wider capacity cushion before product and release expansion.', strategy: 'TECHNOLOGY_FIRST', consequence: 'Minimum delegated capacity headroom becomes at least 30%.' },
    { id: 'GROWTH_AUTHORITY', eyebrow: 'AUDIENCE INVESTMENT', title: 'Expand weekly campaign authority', description: 'Allow the marketing team to approve a larger weekly campaign envelope.', strategy: 'GROWTH_FIRST', consequence: 'Delegated campaign limit increases by $5M per week.' },
    { id: 'TRUST_CHARTER', eyebrow: 'PUBLIC LEGITIMACY', title: 'Adopt a transparent incident charter', description: 'Put public disclosure and clear viewer communication into the standing mandate.', strategy: 'TRUST_FIRST', consequence: 'Incident posture becomes Transparent First.' },
];

const isAvailable = (platform: OwnedStreamingPlatformState): boolean => (
    Boolean(platform.identity) && ['FOUNDING', 'ACTIVE', 'SUSPENDED'].includes(platform.lifecycle)
);
const activeExecutives = (platform: OwnedStreamingPlatformState) => (
    platform.leadership.appointments.filter(item => item.status === 'ACTIVE')
);
const hasRole = (platform: OwnedStreamingPlatformState, roles: StreamingExecutiveRole[]): boolean => (
    activeExecutives(platform).some(item => roles.includes(item.role))
);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const getStreamingLeadershipSuite = (player: Player): StreamingLeadershipSuite => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const active = activeExecutives(platform);
    const activeDirectors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    const outsideOwnershipPercent = clamp(100 - platform.founderOwnershipPercent, 0, 100);
    const latest = platform.weeklyHistory.at(-1)?.operations;
    const actualHeadroom = platform.infrastructureSetup?.loadTest.headroomPercent || 0;
    const alerts: string[] = [];
    if (latest?.growthPlanCost && latest.growthPlanCost > platform.leadership.delegation.weeklyCampaignLimit) {
        alerts.push('The latest campaign exceeded delegated marketing authority.');
    }
    if (platform.lifecycle === 'ACTIVE' && actualHeadroom < platform.leadership.delegation.minimumCapacityHeadroomPercent) {
        alerts.push(`Capacity headroom is below the ${platform.leadership.delegation.minimumCapacityHeadroomPercent}% mandate.`);
    }
    const highestRightsTable = platform.rightsNegotiations
        .filter(item => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(item.status))
        .reduce((highest, item) => Math.max(highest, item.minimumGuarantee), 0);
    if (highestRightsTable > platform.leadership.delegation.maximumRightsBid) {
        alerts.push('A live rights table exceeds delegated bid authority and needs founder review.');
    }
    return {
        available: isAvailable(platform),
        absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
        activeExecutives: active,
        openRoles: STREAMING_EXECUTIVE_ROLE_ORDER.filter(role => !active.some(item => item.role === role)),
        activeDevelopment: platform.leadership.developmentPrograms.filter(item => item.status === 'IN_PROGRESS'),
        weeklyExecutiveCost: active.reduce((sum, item) => sum + item.weeklyCompensation, 0),
        weeklyBoardCost: activeDirectors.reduce((sum, item) => sum + item.weeklyCompensation, 0),
        boardBinding: outsideOwnershipPercent > 0,
        boardModeLabel: outsideOwnershipPercent > 0 ? 'Binding governance' : 'Founder advisory board',
        boardConfidence: platform.governance.boardConfidence,
        activeDirectors,
        outsideOwnershipPercent,
        delegationCoverage: {
            RIGHTS: hasRole(platform, ['CHIEF_CONTENT_OFFICER', 'CFO']),
            CAPACITY: hasRole(platform, ['CTO', 'COO']),
            CAMPAIGNS: hasRole(platform, ['MARKETING_HEAD', 'COO']),
            RENEWALS: hasRole(platform, ['CFO', 'CHIEF_CONTENT_OFFICER']),
            INCIDENTS: hasRole(platform, ['SECURITY_TRUST_HEAD', 'COO']),
        },
        alerts,
    };
};

export const appointStreamingExternalExecutive = (
    player: Player,
    candidateId: string,
): StreamingLeadershipActionResult => {
    const result = hireStreamingExecutive(
        player,
        candidateId,
        `leadership-suite:${candidateId}`,
    );
    return { player: result.player, changed: result.changed, reason: result.reason };
};

export const promoteStreamingInternalExecutive = (
    player: Player,
    candidateId: string,
): StreamingLeadershipActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!isAvailable(platform)) return { player, changed: false, reason: 'NOT_AVAILABLE' };
    const candidate = STREAMING_INTERNAL_PROMOTION_CANDIDATES.find(item => item.id === candidateId);
    if (!candidate) return { player, changed: false, reason: 'NOT_FOUND' };
    if (activeExecutives(platform).some(item => item.role === candidate.role)) {
        return { player, changed: false, reason: 'ROLE_FILLED' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `executive-promotion:${candidate.id}`;
    if (platform.eventLedger.some(item => item.idempotencyKey === idempotencyKey)) {
        return { player, changed: false, reason: 'ALREADY_COMMITTED' };
    }
    const appointment: OwnedStreamingExecutiveAppointment = {
        id: createDeterministicId('streaming_executive', platform.simulationSeed, idempotencyKey),
        executiveId: candidate.id,
        role: candidate.role,
        nameAtAppointment: candidate.name,
        status: 'ACTIVE',
        origin: 'INTERNAL_PROMOTION',
        appointedAtAbsoluteWeek: absoluteWeek,
        endedAtAbsoluteWeek: null,
        weeklyCompensation: candidate.weeklyCompensation,
        skill: candidate.skill,
        loyalty: candidate.loyalty,
        ambition: candidate.ambition,
        ethics: candidate.ethics,
        preferredStrategy: candidate.preferredStrategy,
        founderRelationship: 74,
        internalRelationship: 82,
        performance: 58,
        level: 1,
        experience: 0,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'EXECUTIVE_APPOINTED',
        summary: `${candidate.name} promoted from ${candidate.currentTitle} to ${candidate.roleLabel}.`,
        source: 'PLAYER_ACTION',
        metadata: { executiveId: candidate.id, role: candidate.role, origin: 'INTERNAL_PROMOTION' },
    };
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                leadership: {
                    ...platform.leadership,
                    appointments: [...platform.leadership.appointments, appointment],
                },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

export const dismissStreamingExecutive = (
    player: Player,
    executiveId: string,
): StreamingLeadershipActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const appointment = activeExecutives(platform).find(item => item.executiveId === executiveId);
    if (!appointment) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `executive-departure:${appointment.id}:${absoluteWeek}`;
    const ended: OwnedStreamingExecutiveAppointment = {
        ...appointment,
        status: 'DISMISSED',
        endedAtAbsoluteWeek: absoluteWeek,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'EXECUTIVE_DEPARTED',
        summary: `${appointment.nameAtAppointment} departed the ${STREAMING_EXECUTIVE_ROLE_LABELS[appointment.role]} role.`,
        source: 'PLAYER_ACTION',
        metadata: { executiveId, role: appointment.role },
    };
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                leadership: {
                    ...platform.leadership,
                    appointments: platform.leadership.appointments.map(item => item.id === appointment.id ? ended : item),
                },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

export const startStreamingExecutiveDevelopment = (
    player: Player,
    executiveId: string,
    track: StreamingExecutiveDevelopmentTrack,
): StreamingLeadershipActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const appointment = activeExecutives(platform).find(item => item.executiveId === executiveId);
    const definition = STREAMING_EXECUTIVE_DEVELOPMENT_PROGRAMS.find(item => item.id === track);
    if (!appointment || !definition) return { player, changed: false, reason: 'NOT_FOUND' };
    if (platform.leadership.developmentPrograms.some(item => item.executiveId === executiveId && item.status === 'IN_PROGRESS')) {
        return { player, changed: false, reason: 'PROGRAM_ACTIVE' };
    }
    if (platform.treasuryCash < definition.capitalCost) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `executive-development:${executiveId}:${track}:${absoluteWeek}`;
    const program: OwnedStreamingExecutiveDevelopment = {
        id: createDeterministicId('streaming_exec_development', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        executiveId,
        track,
        status: 'IN_PROGRESS',
        capitalCost: definition.capitalCost,
        developmentWeeks: definition.developmentWeeks,
        startedAtAbsoluteWeek: absoluteWeek,
        readyAtAbsoluteWeek: absoluteWeek + definition.developmentWeeks,
        completedAtAbsoluteWeek: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'EXECUTIVE_DEVELOPMENT_STARTED',
        summary: `${appointment.nameAtAppointment} entered ${definition.title}.`,
        source: 'PLAYER_ACTION',
        metadata: { executiveId, track, capitalCost: definition.capitalCost, readyAtAbsoluteWeek: program.readyAtAbsoluteWeek },
    };
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - definition.capitalCost,
                leadership: {
                    ...platform.leadership,
                    developmentPrograms: [...platform.leadership.developmentPrograms, program],
                },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

export const completeDueStreamingExecutiveDevelopment = (
    platformValue: OwnedStreamingPlatformState,
    absoluteWeek: number,
): {
    platform: OwnedStreamingPlatformState;
    completedPrograms: OwnedStreamingExecutiveDevelopment[];
    ledgerEntries: OwnedStreamingLedgerEntry[];
} => {
    const completedPrograms: OwnedStreamingExecutiveDevelopment[] = [];
    const ledgerEntries: OwnedStreamingLedgerEntry[] = [];
    const programs = platformValue.leadership.developmentPrograms.map(program => {
        if (program.status !== 'IN_PROGRESS' || absoluteWeek < program.readyAtAbsoluteWeek) return program;
        const completed = { ...program, status: 'COMPLETED' as const, completedAtAbsoluteWeek: absoluteWeek };
        completedPrograms.push(completed);
        const idempotencyKey = `${program.idempotencyKey}:completed`;
        if (!platformValue.eventLedger.some(item => item.idempotencyKey === idempotencyKey)) {
            ledgerEntries.push({
                id: createDeterministicId('streaming_event', platformValue.simulationSeed, idempotencyKey),
                idempotencyKey,
                absoluteWeek,
                type: 'EXECUTIVE_DEVELOPMENT_COMPLETED',
                summary: `Executive development completed: ${program.track.toLowerCase().replaceAll('_', ' ')}.`,
                source: 'WEEK_PROCESSOR',
                metadata: { executiveId: program.executiveId, track: program.track },
            });
        }
        return completed;
    });
    if (!completedPrograms.length) return { platform: platformValue, completedPrograms, ledgerEntries };
    const appointments = platformValue.leadership.appointments.map(appointment => {
        const programsForExecutive = completedPrograms.filter(program => program.executiveId === appointment.executiveId);
        if (!programsForExecutive.length) return appointment;
        let next = { ...appointment };
        programsForExecutive.forEach(program => {
            if (program.track === 'ROLE_MASTERY') {
                next.skill = clamp(next.skill + 8, 0, 100);
                next.performance = clamp(next.performance + 6, 0, 100);
            } else if (program.track === 'FOUNDER_ALIGNMENT') {
                next.loyalty = clamp(next.loyalty + 10, 0, 100);
                next.founderRelationship = clamp(next.founderRelationship + 10, 0, 100);
            } else if (program.track === 'ETHICS_TRUST') {
                next.ethics = clamp(next.ethics + 10, 0, 100);
                next.internalRelationship = clamp(next.internalRelationship + 5, 0, 100);
            } else {
                next.performance = clamp(next.performance + 12, 0, 100);
                next.experience += 4;
            }
            next.experience += 6;
        });
        const earnedLevel = clamp(1 + Math.floor(next.experience / 18), 1, 5) as 1 | 2 | 3 | 4 | 5;
        next.level = Math.max(next.level, earnedLevel) as 1 | 2 | 3 | 4 | 5;
        return next;
    });
    return {
        platform: {
            ...platformValue,
            leadership: {
                ...platformValue.leadership,
                appointments,
                developmentPrograms: programs,
            },
        },
        completedPrograms,
        ledgerEntries,
    };
};

export const updateStreamingDelegationMandate = (
    player: Player,
    next: Partial<OwnedStreamingPlatformState['leadership']['delegation']>,
): StreamingLeadershipActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!activeExecutives(platform).length) return { player, changed: false, reason: 'NO_EXECUTIVES' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const mandate = {
        maximumRightsBid: Math.round(clamp(next.maximumRightsBid ?? platform.leadership.delegation.maximumRightsBid, 1_000_000, 1_000_000_000)),
        minimumCapacityHeadroomPercent: Math.round(clamp(next.minimumCapacityHeadroomPercent ?? platform.leadership.delegation.minimumCapacityHeadroomPercent, 5, 80)),
        weeklyCampaignLimit: Math.round(clamp(next.weeklyCampaignLimit ?? platform.leadership.delegation.weeklyCampaignLimit, 1_000_000, 250_000_000)),
        renewalMinimumMarginPercent: Math.round(clamp(next.renewalMinimumMarginPercent ?? platform.leadership.delegation.renewalMinimumMarginPercent, 0, 60)),
        incidentPolicy: next.incidentPolicy || platform.leadership.delegation.incidentPolicy,
        updatedAtAbsoluteWeek: absoluteWeek,
    };
    const signature = `${mandate.maximumRightsBid}:${mandate.minimumCapacityHeadroomPercent}:${mandate.weeklyCampaignLimit}:${mandate.renewalMinimumMarginPercent}:${mandate.incidentPolicy}`;
    const idempotencyKey = `delegation-mandate:${absoluteWeek}:${signature}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'DELEGATION_MANDATE_UPDATED',
        summary: 'Founder updated the executive delegation mandate.',
        source: 'PLAYER_ACTION',
        metadata: {
            maximumRightsBid: mandate.maximumRightsBid,
            minimumCapacityHeadroomPercent: mandate.minimumCapacityHeadroomPercent,
            weeklyCampaignLimit: mandate.weeklyCampaignLimit,
            renewalMinimumMarginPercent: mandate.renewalMinimumMarginPercent,
            incidentPolicy: mandate.incidentPolicy,
        },
    };
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                leadership: { ...platform.leadership, delegation: mandate },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

export const appointStreamingIndependentDirector = (
    player: Player,
    candidateId: string,
): StreamingLeadershipActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const candidate = STREAMING_INDEPENDENT_DIRECTORS.find(item => item.id === candidateId);
    if (!candidate) return { player, changed: false, reason: 'NOT_FOUND' };
    const active = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    if (active.some(item => item.candidateId === candidateId)) return { player, changed: false, reason: 'ALREADY_APPOINTED' };
    if (active.filter(item => item.seatType === 'INDEPENDENT').length >= 2) return { player, changed: false, reason: 'BOARD_FULL' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `board-director:${candidate.id}`;
    const director: OwnedStreamingBoardDirector = {
        id: createDeterministicId('streaming_board_director', platform.simulationSeed, candidate.id),
        candidateId: candidate.id,
        name: candidate.name,
        seatType: 'INDEPENDENT',
        status: 'ACTIVE',
        preferredStrategy: candidate.preferredStrategy,
        independence: candidate.independence,
        founderRelationship: candidate.founderRelationship,
        weeklyCompensation: candidate.weeklyCompensation,
        appointedAtAbsoluteWeek: absoluteWeek,
        endedAtAbsoluteWeek: null,
        linkedInvestorId: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'BOARD_DIRECTOR_APPOINTED',
        summary: `${candidate.name} joined the EMPIRE+ board as an independent director.`,
        source: 'PLAYER_ACTION',
        metadata: { candidateId, weeklyCompensation: candidate.weeklyCompensation },
    };
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                governance: {
                    ...platform.governance,
                    directors: [...platform.governance.directors, director],
                },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

export const acceptStreamingCelebrityInvestment = (
    player: Player,
    offerId: string,
): StreamingLeadershipActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const offer = STREAMING_CELEBRITY_INVESTOR_OFFERS.find(item => item.id === offerId);
    if (!offer) return { player, changed: false, reason: 'NOT_FOUND' };
    if (platform.governance.celebrityInvestors.some(item => item.candidateId === offerId)) {
        return { player, changed: false, reason: 'ALREADY_DECIDED' };
    }
    if (platform.founderOwnershipPercent - offer.ownershipPercent < 51) {
        return { player, changed: false, reason: 'CONTROL_LIMIT' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `celebrity-investment:${offer.id}`;
    const ownershipAfter = platform.founderOwnershipPercent - offer.ownershipPercent;
    const investor: OwnedStreamingCelebrityInvestor = {
        id: createDeterministicId('streaming_celebrity_investor', platform.simulationSeed, offer.id),
        candidateId: offer.id,
        name: offer.name,
        status: 'ACCEPTED',
        investedCapital: offer.investedCapital,
        ownershipPercent: offer.ownershipPercent,
        boardSeatGranted: offer.boardSeat,
        profitParticipationPercent: offer.profitParticipationPercent,
        influenceDemand: offer.influenceDemand,
        decisionAtAbsoluteWeek: absoluteWeek,
    };
    const capitalAction: OwnedStreamingCapitalAction = {
        id: createDeterministicId('streaming_capital', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        type: 'EQUITY_ISSUANCE',
        absoluteWeek,
        amount: offer.investedCapital,
        treasuryDelta: offer.investedCapital,
        personalCashDelta: 0,
        debtDelta: 0,
        ownershipBefore: platform.founderOwnershipPercent,
        ownershipAfter,
    };
    const equityPosition = {
        id: createDeterministicId('streaming_equity', platform.simulationSeed, offer.id),
        holderName: offer.name,
        ownershipPercent: offer.ownershipPercent,
        investedCapital: offer.investedCapital,
        issuedAtAbsoluteWeek: absoluteWeek,
    };
    const director: OwnedStreamingBoardDirector | null = offer.boardSeat ? {
        id: createDeterministicId('streaming_board_director', platform.simulationSeed, offer.id),
        candidateId: `${offer.id}:nominee`,
        name: `${offer.name} nominee`,
        seatType: 'INVESTOR_NOMINEE',
        status: 'ACTIVE',
        preferredStrategy: offer.preferredStrategy,
        independence: 24,
        founderRelationship: 48,
        weeklyCompensation: 0,
        appointedAtAbsoluteWeek: absoluteWeek,
        endedAtAbsoluteWeek: null,
        linkedInvestorId: investor.id,
    } : null;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'CELEBRITY_INVESTMENT_ACCEPTED',
        summary: `${offer.name} invested in ${platform.identity?.name || 'EMPIRE+'}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            investedCapital: offer.investedCapital,
            ownershipPercent: offer.ownershipPercent,
            founderOwnershipAfter: ownershipAfter,
            boardSeat: offer.boardSeat,
            profitParticipationPercent: offer.profitParticipationPercent,
        },
    };
    const cinematic: OwnedStreamingCinematicEvent = {
        id: createDeterministicId('streaming_scene', platform.simulationSeed, `${idempotencyKey}:reveal`),
        idempotencyKey: `${idempotencyKey}:reveal`,
        type: 'CELEBRITY_INVESTOR_REVEAL',
        status: 'QUEUED',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: absoluteWeek,
        title: `${offer.name} joins the signal`,
        factIds: [ledger.id],
    };
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                founderOwnershipPercent: ownershipAfter,
                treasuryCash: platform.treasuryCash + offer.investedCapital,
                finance: {
                    ...platform.finance,
                    capitalActions: [...platform.finance.capitalActions, capitalAction],
                    equityHolders: [...platform.finance.equityHolders, equityPosition],
                },
                governance: {
                    ...platform.governance,
                    boardConfidence: clamp(platform.governance.boardConfidence + 4, 0, 100),
                    celebrityInvestors: [...platform.governance.celebrityInvestors, investor],
                    directors: director ? [...platform.governance.directors, director] : platform.governance.directors,
                },
                eventLedger: [...platform.eventLedger, ledger],
                cinematicQueue: [...platform.cinematicQueue, cinematic],
                milestoneKeys: Array.from(new Set([...platform.milestoneKeys, 'outside-ownership-accepted'])),
            }, player.id),
        },
    };
};

const applyMotionConsequence = (
    platform: OwnedStreamingPlatformState,
    motionId: StreamingBoardMotionId,
): OwnedStreamingPlatformState => {
    const delegation = { ...platform.leadership.delegation };
    if (motionId === 'RIGHTS_AUTHORITY') delegation.maximumRightsBid += 25_000_000;
    if (motionId === 'CAPACITY_GUARDRAIL') delegation.minimumCapacityHeadroomPercent = Math.max(30, delegation.minimumCapacityHeadroomPercent);
    if (motionId === 'GROWTH_AUTHORITY') delegation.weeklyCampaignLimit += 5_000_000;
    if (motionId === 'TRUST_CHARTER') delegation.incidentPolicy = 'TRANSPARENT_FIRST';
    return {
        ...platform,
        leadership: { ...platform.leadership, delegation },
    };
};

export const callStreamingBoardVote = (
    player: Player,
    motionId: StreamingBoardMotionId,
): StreamingLeadershipActionResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const definition = STREAMING_BOARD_MOTIONS.find(item => item.id === motionId);
    if (!definition) return { player, changed: false, reason: 'NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const recent = platform.governance.motions.find(item => (
        item.motionId === motionId && absoluteWeek - item.calledAtAbsoluteWeek < 4
    ));
    if (recent) return { player, changed: false, reason: 'COOLDOWN' };
    const binding = platform.founderOwnershipPercent < 100;
    const activeDirectors = platform.governance.directors.filter(item => item.status === 'ACTIVE');
    const votes = activeDirectors.map(director => {
        const rng = createDeterministicRng(`${platform.simulationSeed}:board:${motionId}:${director.id}:${absoluteWeek}`);
        const strategyFit = director.preferredStrategy === definition.strategy
            ? 24
            : director.preferredStrategy === 'BALANCED'
                ? 8
                : 0;
        const investorPressure = director.seatType === 'INVESTOR_NOMINEE'
            ? (director.preferredStrategy === definition.strategy ? 10 : -10)
            : 0;
        const score = 38 + strategyFit + investorPressure + (director.founderRelationship - 50) * 0.25 + (rng() - 0.5) * 24;
        const vote = score >= 50 ? 'FOR' as const : 'AGAINST' as const;
        return {
            directorId: director.id,
            directorName: director.name,
            vote,
            rationale: vote === 'FOR'
                ? `The motion fits ${director.preferredStrategy.toLowerCase().replaceAll('_', ' ')} priorities.`
                : `The current risk does not satisfy ${director.preferredStrategy.toLowerCase().replaceAll('_', ' ')} priorities.`,
        };
    });
    const forVotes = 1 + votes.filter(item => item.vote === 'FOR').length;
    const totalVotes = 1 + votes.length;
    const approved = binding ? forVotes > totalVotes / 2 : true;
    const confidenceDelta = approved ? (binding ? 3 : 1) : -6;
    const idempotencyKey = `board-motion:${motionId}:${absoluteWeek}`;
    const motion: OwnedStreamingBoardMotion = {
        id: createDeterministicId('streaming_board_motion', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        motionId,
        title: definition.title,
        status: approved ? 'APPROVED' : 'REJECTED',
        binding,
        founderVote: 'FOR',
        votes,
        boardConfidenceDelta: confidenceDelta,
        calledAtAbsoluteWeek: absoluteWeek,
        resolvedAtAbsoluteWeek: absoluteWeek,
        consequence: approved
            ? definition.consequence
            : 'The proposal was vetoed. Existing authority and policy remain unchanged.',
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'BOARD_VOTE_RESOLVED',
        summary: `${definition.title}: ${approved ? 'approved' : 'rejected'}.`,
        source: 'PLAYER_ACTION',
        metadata: { motionId, binding, forVotes, totalVotes, approved },
    };
    const consequencePlatform = approved ? applyMotionConsequence(platform, motionId) : platform;
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...consequencePlatform,
                governance: {
                    ...consequencePlatform.governance,
                    boardConfidence: clamp(consequencePlatform.governance.boardConfidence + confidenceDelta, 0, 100),
                    motions: [...consequencePlatform.governance.motions, motion],
                },
                eventLedger: [...consequencePlatform.eventLedger, ledger],
            }, player.id),
        },
    };
};

export const getStreamingGovernanceWeeklyCost = (
    platform: OwnedStreamingPlatformState,
    operatingRevenue: number,
): number => {
    const directorCost = platform.governance.directors
        .filter(item => item.status === 'ACTIVE')
        .reduce((sum, item) => sum + item.weeklyCompensation, 0);
    const participationPercent = platform.governance.celebrityInvestors
        .filter(item => item.status === 'ACCEPTED')
        .reduce((sum, item) => sum + item.profitParticipationPercent, 0);
    return Math.round(directorCost + Math.max(0, operatingRevenue) * participationPercent / 100);
};

export const getExternalStreamingExecutiveCandidates = (): StreamingExecutiveCandidate[] => (
    STREAMING_EXECUTIVE_CANDIDATES
);
