import type {
    OwnedStreamingCapitalAction,
    OwnedStreamingExecutiveAppointment,
    OwnedStreamingLedgerEntry,
    Player,
    Gender,
    StreamingExecutiveRole,
    StreamingExecutiveStrategy,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';

export interface StreamingExecutiveCandidate {
    id: string;
    name: string;
    role: StreamingExecutiveRole;
    roleLabel: string;
    initials: string;
    gender: Gender;
    formerCompany: string;
    yearsExperience: number;
    specialty: string;
    style: string;
    strength: string;
    caution: string;
    weeklyCompensation: number;
    skill: number;
    loyalty: number;
    ambition: number;
    ethics: number;
    preferredStrategy: StreamingExecutiveStrategy;
}

export const STREAMING_EXECUTIVE_CANDIDATES: StreamingExecutiveCandidate[] = [
    {
        id: 'ava-chen',
        name: 'Ava Chen',
        role: 'COO',
        roleLabel: 'COO',
        initials: 'AC',
        gender: 'FEMALE', formerCompany: 'StreamCo', yearsExperience: 12,
        specialty: 'Launch operations',
        style: 'Disciplined',
        strength: 'Keeps ambitious rollouts organized.',
        caution: 'Pushes back on rushed expansion.',
        weeklyCompensation: 180_000,
        skill: 78, loyalty: 72, ambition: 62, ethics: 84, preferredStrategy: 'BALANCED',
    },
    {
        id: 'marcus-vale',
        name: 'Marcus Vale',
        role: 'CTO',
        roleLabel: 'CTO',
        initials: 'MV',
        gender: 'MALE', formerCompany: 'Vistaplay', yearsExperience: 14,
        specialty: 'Playback systems',
        style: 'Inventive',
        strength: 'Raises the ceiling for product and delivery.',
        caution: 'Can accumulate technical debt chasing speed.',
        weeklyCompensation: 210_000,
        skill: 86, loyalty: 60, ambition: 84, ethics: 66, preferredStrategy: 'TECHNOLOGY_FIRST',
    },
    {
        id: 'nia-okafor',
        name: 'Nia Okafor',
        role: 'CHIEF_CONTENT_OFFICER',
        roleLabel: 'Chief Content Officer',
        initials: 'NO',
        gender: 'FEMALE', formerCompany: 'Orbit TV', yearsExperience: 13,
        specialty: 'Originals strategy',
        style: 'Taste-maker',
        strength: 'Finds distinctive stories and talent.',
        caution: 'Prefers creative bets over safe volume.',
        weeklyCompensation: 195_000,
        skill: 84, loyalty: 68, ambition: 76, ethics: 78, preferredStrategy: 'CREATIVE_FIRST',
    },
    {
        id: 'rafael-silva',
        name: 'Rafael Silva',
        role: 'CFO',
        roleLabel: 'CFO',
        initials: 'RS',
        gender: 'MALE', formerCompany: 'StreamCo', yearsExperience: 16,
        specialty: 'Capital discipline',
        style: 'Pragmatic',
        strength: 'Protects runway and deal economics.',
        caution: 'May resist prestige spending.',
        weeklyCompensation: 185_000,
        skill: 82, loyalty: 74, ambition: 58, ethics: 88, preferredStrategy: 'MARGIN_FIRST',
    },
    {
        id: 'maya-park',
        name: 'Maya Park',
        role: 'PRODUCT_HEAD',
        roleLabel: 'Product Head',
        initials: 'MP',
        gender: 'FEMALE', formerCompany: 'Vistaplay', yearsExperience: 11,
        specialty: 'Subscriber experience',
        style: 'Audience-obsessed',
        strength: 'Connects product usefulness to retention.',
        caution: 'Will challenge content decisions that ignore viewer behavior.',
        weeklyCompensation: 175_000,
        skill: 81, loyalty: 70, ambition: 72, ethics: 82, preferredStrategy: 'GROWTH_FIRST',
    },
    {
        id: 'jonah-reed',
        name: 'Jonah Reed',
        role: 'MARKETING_HEAD',
        roleLabel: 'Marketing Head',
        initials: 'JR',
        gender: 'MALE', formerCompany: 'Orbit TV', yearsExperience: 10,
        specialty: 'Audience growth',
        style: 'Provocative',
        strength: 'Builds campaigns that create cultural urgency.',
        caution: 'Can outrun the evidence when chasing attention.',
        weeklyCompensation: 170_000,
        skill: 80, loyalty: 61, ambition: 86, ethics: 64, preferredStrategy: 'GROWTH_FIRST',
    },
    {
        id: 'leila-haddad',
        name: 'Leila Haddad',
        role: 'ADVERTISING_HEAD',
        roleLabel: 'Advertising Head',
        initials: 'LH',
        gender: 'FEMALE', formerCompany: 'StreamCo', yearsExperience: 12,
        specialty: 'Ad products and commerce',
        style: 'Commercial',
        strength: 'Turns the Free and Store products into disciplined businesses.',
        caution: 'Needs a clear ceiling to prevent monetization pressure.',
        weeklyCompensation: 165_000,
        skill: 79, loyalty: 67, ambition: 74, ethics: 73, preferredStrategy: 'MARGIN_FIRST',
    },
    {
        id: 'elena-volkov',
        name: 'Elena Volkov',
        role: 'INTERNATIONAL_HEAD',
        roleLabel: 'International Head',
        initials: 'EV',
        gender: 'FEMALE', formerCompany: 'Vistaplay', yearsExperience: 15,
        specialty: 'Regional expansion',
        style: 'Diplomatic',
        strength: 'Balances local teams, rights and cultural specificity.',
        caution: 'Rejects global plans that lack localization depth.',
        weeklyCompensation: 190_000,
        skill: 83, loyalty: 69, ambition: 70, ethics: 86, preferredStrategy: 'GLOBAL_FIRST',
    },
    {
        id: 'amir-qazi',
        name: 'Amir Qazi',
        role: 'SECURITY_TRUST_HEAD',
        roleLabel: 'Security & Trust Head',
        initials: 'AQ',
        gender: 'MALE', formerCompany: 'Orbit TV', yearsExperience: 13,
        specialty: 'Platform trust',
        style: 'Uncompromising',
        strength: 'Protects viewers, rights holders and incident credibility.',
        caution: 'Will slow launches that cannot meet the trust standard.',
        weeklyCompensation: 185_000,
        skill: 85, loyalty: 77, ambition: 54, ethics: 94, preferredStrategy: 'TRUST_FIRST',
    },
    {
        id: 'priya-raman', name: 'Priya Raman', role: 'CTO', roleLabel: 'CTO', initials: 'PR',
        gender: 'FEMALE', formerCompany: 'StreamCo', yearsExperience: 15,
        specialty: 'Reliability engineering', style: 'Methodical', strength: 'Cuts peak-hour outages and protects launch nights.',
        caution: 'Will delay features that fail stress tests.', weeklyCompensation: 225_000,
        skill: 89, loyalty: 76, ambition: 65, ethics: 88, preferredStrategy: 'TRUST_FIRST',
    },
    {
        id: 'theo-nakamura', name: 'Theo Nakamura', role: 'CTO', roleLabel: 'CTO', initials: 'TN',
        gender: 'MALE', formerCompany: 'Orbit TV', yearsExperience: 11,
        specialty: 'Encoding economics', style: 'Efficient', strength: 'Serves more viewers from every infrastructure dollar.',
        caution: 'Optimization can arrive before product polish.', weeklyCompensation: 175_000,
        skill: 81, loyalty: 68, ambition: 72, ethics: 80, preferredStrategy: 'MARGIN_FIRST',
    },
    {
        id: 'imani-brooks', name: 'Imani Brooks', role: 'CTO', roleLabel: 'CTO', initials: 'IB',
        gender: 'FEMALE', formerCompany: 'Vistaplay', yearsExperience: 12,
        specialty: 'Recommendation systems', style: 'Experimental', strength: 'Builds discovery technology that lifts viewing depth.',
        caution: 'Research bets need patient capital.', weeklyCompensation: 205_000,
        skill: 85, loyalty: 64, ambition: 88, ethics: 74, preferredStrategy: 'TECHNOLOGY_FIRST',
    },
    {
        id: 'elias-berg', name: 'Elias Berg', role: 'CTO', roleLabel: 'CTO', initials: 'EB',
        gender: 'MALE', formerCompany: 'Northstar Cloud', yearsExperience: 17,
        specialty: 'Global delivery networks', style: 'Scale-first', strength: 'Makes regional expansion technically predictable.',
        caution: 'His architecture carries a high fixed cost.', weeklyCompensation: 240_000,
        skill: 91, loyalty: 59, ambition: 82, ethics: 76, preferredStrategy: 'GLOBAL_FIRST',
    },
    {
        id: 'elise-morgan', name: 'Elise Morgan', role: 'CFO', roleLabel: 'CFO', initials: 'EM',
        gender: 'FEMALE', formerCompany: 'Vistaplay', yearsExperience: 18,
        specialty: 'Public-market readiness', style: 'Exacting', strength: 'Builds auditable books and a credible path to IPO.',
        caution: 'Demands governance before aggressive growth.', weeklyCompensation: 230_000,
        skill: 90, loyalty: 70, ambition: 78, ethics: 92, preferredStrategy: 'TRUST_FIRST',
    },
    {
        id: 'dev-malhotra', name: 'Dev Malhotra', role: 'CFO', roleLabel: 'CFO', initials: 'DM',
        gender: 'MALE', formerCompany: 'Orbit TV', yearsExperience: 12,
        specialty: 'Growth financing', style: 'Aggressive', strength: 'Finds capital quickly when a market window opens.',
        caution: 'Comfortable with leverage and dilution.', weeklyCompensation: 195_000,
        skill: 84, loyalty: 57, ambition: 91, ethics: 66, preferredStrategy: 'GROWTH_FIRST',
    },
    {
        id: 'sofia-petrov', name: 'Sofia Petrov', role: 'CFO', roleLabel: 'CFO', initials: 'SP',
        gender: 'FEMALE', formerCompany: 'StreamCo', yearsExperience: 14,
        specialty: 'Rights economics', style: 'Forensic', strength: 'Finds hidden cost and upside in catalogue contracts.',
        caution: 'Negotiations move slowly under her review.', weeklyCompensation: 200_000,
        skill: 86, loyalty: 75, ambition: 61, ethics: 90, preferredStrategy: 'MARGIN_FIRST',
    },
    {
        id: 'owen-price', name: 'Owen Price', role: 'CFO', roleLabel: 'CFO', initials: 'OP',
        gender: 'MALE', formerCompany: 'Horizon Media Bank', yearsExperience: 10,
        specialty: 'Runway planning', style: 'Conservative', strength: 'Keeps the company alive through weak quarters.',
        caution: 'May underfund breakout opportunities.', weeklyCompensation: 160_000,
        skill: 78, loyalty: 86, ambition: 48, ethics: 91, preferredStrategy: 'BALANCED',
    },
    {
        id: 'mateo-laurent', name: 'Mateo Laurent', role: 'COO', roleLabel: 'COO', initials: 'ML',
        gender: 'MALE', formerCompany: 'Vistaplay', yearsExperience: 13,
        specialty: 'International launches', style: 'Diplomatic', strength: 'Coordinates localization, rights and operations across regions.',
        caution: 'Rejects expansion without local teams.', weeklyCompensation: 205_000,
        skill: 85, loyalty: 72, ambition: 73, ethics: 86, preferredStrategy: 'GLOBAL_FIRST',
    },
    {
        id: 'zara-okafor', name: 'Zara Okafor', role: 'COO', roleLabel: 'COO', initials: 'ZO',
        gender: 'FEMALE', formerCompany: 'Orbit TV', yearsExperience: 10,
        specialty: 'Incident command', style: 'Unflappable', strength: 'Contains outages and public crises before trust collapses.',
        caution: 'Keeps larger safety reserves than growth teams like.', weeklyCompensation: 190_000,
        skill: 83, loyalty: 81, ambition: 60, ethics: 93, preferredStrategy: 'TRUST_FIRST',
    },
    {
        id: 'daniel-kim', name: 'Daniel Kim', role: 'COO', roleLabel: 'COO', initials: 'DK',
        gender: 'MALE', formerCompany: 'StreamCo', yearsExperience: 15,
        specialty: 'Automation and process', style: 'Relentless', strength: 'Makes a lean company operate at national scale.',
        caution: 'Efficiency pressure can hurt team morale.', weeklyCompensation: 215_000,
        skill: 88, loyalty: 63, ambition: 82, ethics: 71, preferredStrategy: 'MARGIN_FIRST',
    },
    {
        id: 'amara-diallo', name: 'Amara Diallo', role: 'COO', roleLabel: 'COO', initials: 'AD',
        gender: 'FEMALE', formerCompany: 'PanWorld Broadcast', yearsExperience: 9,
        specialty: 'People and partner operations', style: 'Collaborative', strength: 'Improves execution without burning out the company.',
        caution: 'Avoids ruthless short-term cuts.', weeklyCompensation: 170_000,
        skill: 79, loyalty: 90, ambition: 55, ethics: 95, preferredStrategy: 'BALANCED',
    },
    {
        id: 'leena-kapoor', name: 'Leena Kapoor', role: 'CHIEF_CONTENT_OFFICER', roleLabel: 'Chief Content Officer', initials: 'LK',
        gender: 'FEMALE', formerCompany: 'StreamCo', yearsExperience: 14,
        specialty: 'Portfolio strategy', style: 'Analytical', strength: 'Balances tentpoles, comfort viewing and retention titles.',
        caution: 'Needs strong evidence before backing an auteur bet.', weeklyCompensation: 205_000,
        skill: 86, loyalty: 73, ambition: 70, ethics: 84, preferredStrategy: 'BALANCED',
    },
    {
        id: 'gabriel-ortiz', name: 'Gabriel Ortiz', role: 'CHIEF_CONTENT_OFFICER', roleLabel: 'Chief Content Officer', initials: 'GO',
        gender: 'MALE', formerCompany: 'Orbit TV', yearsExperience: 12,
        specialty: 'Franchise development', style: 'Commercial', strength: 'Builds repeatable worlds around breakout stories.',
        caution: 'Can overextend a popular property.', weeklyCompensation: 190_000,
        skill: 82, loyalty: 65, ambition: 87, ethics: 72, preferredStrategy: 'GROWTH_FIRST',
    },
    {
        id: 'hana-sato', name: 'Hana Sato', role: 'CHIEF_CONTENT_OFFICER', roleLabel: 'Chief Content Officer', initials: 'HS',
        gender: 'FEMALE', formerCompany: 'Vistaplay', yearsExperience: 11,
        specialty: 'Local-language originals', style: 'Curatorial', strength: 'Finds regional stories with global travel potential.',
        caution: 'Rejects generic global commissions.', weeklyCompensation: 200_000,
        skill: 85, loyalty: 79, ambition: 71, ethics: 89, preferredStrategy: 'GLOBAL_FIRST',
    },
    {
        id: 'camille-laurent', name: 'Camille Laurent', role: 'CHIEF_CONTENT_OFFICER', roleLabel: 'Chief Content Officer', initials: 'CL',
        gender: 'NON_BINARY', formerCompany: 'Northlight Pictures', yearsExperience: 10,
        specialty: 'Prestige and emerging talent', style: 'Bold', strength: 'Creates signature originals that define a platform.',
        caution: 'A concentrated slate raises creative risk.', weeklyCompensation: 185_000,
        skill: 83, loyalty: 67, ambition: 84, ethics: 82, preferredStrategy: 'CREATIVE_FIRST',
    },
];

export const STREAMING_FOUNDING_EXECUTIVE_ROLES: StreamingExecutiveRole[] = [
    'CTO', 'CFO', 'COO', 'CHIEF_CONTENT_OFFICER',
];

/** Four stable choices per chair, refreshed every four in-game weeks. */
export const getStreamingFoundingExecutiveCandidates = (
    player: Player,
    candidatesPerRole = 4,
): StreamingExecutiveCandidate[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const marketCycle = Math.floor(getAbsoluteWeek(player.age, player.currentWeek) / 4);
    return STREAMING_FOUNDING_EXECUTIVE_ROLES.flatMap(role => {
        const pool = STREAMING_EXECUTIVE_CANDIDATES.filter(candidate => candidate.role === role);
        const rng = createDeterministicRng(`${platform.simulationSeed}:founding-executives:${role}:${marketCycle}`);
        const rotated = [...pool];
        for (let index = rotated.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(rng() * (index + 1));
            [rotated[index], rotated[swapIndex]] = [rotated[swapIndex], rotated[index]];
        }
        return rotated.slice(0, Math.max(1, Math.min(candidatesPerRole, rotated.length)));
    });
};

const isIncorporated = (player: Player): boolean => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return Boolean(
        platform.identity
        && platform.foundingProfile
        && ['FOUNDING', 'ACTIVE', 'SUSPENDED'].includes(platform.lifecycle),
    );
};

const cleanIdempotencyKey = (value: string | undefined): string => (
    String(value || '')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9:_-]/g, '')
        .slice(0, 180)
);

export interface ContributeStreamingFounderCapitalResult {
    player: Player;
    changed: boolean;
    reason:
        | 'CONTRIBUTED'
        | 'INVALID_STATE'
        | 'INVALID_AMOUNT'
        | 'INSUFFICIENT_CASH'
        | 'ALREADY_COMMITTED';
    amount: number;
}

/**
 * Transfers personal cash into company treasury. It does not create revenue,
 * debt, dilution, or a paid entitlement. The action is atomic and idempotent.
 */
export const contributeStreamingFounderCapital = (
    player: Player,
    requestedAmount: number,
    requestedIdempotencyKey?: string,
): ContributeStreamingFounderCapitalResult => {
    const numericAmount = Number(requestedAmount);
    const amount = Number.isFinite(numericAmount)
        ? Math.max(0, Math.round(numericAmount))
        : 0;
    if (!isIncorporated(player)) {
        return { player, changed: false, reason: 'INVALID_STATE', amount };
    }
    if (amount <= 0) {
        return { player, changed: false, reason: 'INVALID_AMOUNT', amount };
    }
    if (player.money < amount) {
        return { player, changed: false, reason: 'INSUFFICIENT_CASH', amount };
    }

    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const suppliedKey = cleanIdempotencyKey(requestedIdempotencyKey);
    const idempotencyKey = suppliedKey
        ? `founder-contribution:${suppliedKey}`
        : `founder-contribution:${platform.identity?.slug || player.id}:${absoluteWeek}:${amount}`;
    if (
        platform.finance.capitalActions.some(action => action.idempotencyKey === idempotencyKey)
        || platform.eventLedger.some(entry => entry.idempotencyKey === idempotencyKey)
    ) {
        return { player, changed: false, reason: 'ALREADY_COMMITTED', amount };
    }

    const capitalAction: OwnedStreamingCapitalAction = {
        id: createDeterministicId('streaming_capital', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        type: 'FOUNDER_CONTRIBUTION',
        absoluteWeek,
        amount,
        treasuryDelta: amount,
        personalCashDelta: -amount,
        debtDelta: 0,
        ownershipBefore: platform.founderOwnershipPercent,
        ownershipAfter: platform.founderOwnershipPercent,
    };
    const ledgerEntry: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'FOUNDER_CAPITAL_CONTRIBUTED',
        summary: `${platform.identity?.name || 'Streaming company'} received founder capital.`,
        source: 'PLAYER_ACTION',
        metadata: {
            amount,
            treasuryBefore: platform.treasuryCash,
            treasuryAfter: platform.treasuryCash + amount,
        },
    };
    const ownedStreamingPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash + amount,
        finance: {
            ...platform.finance,
            capitalActions: [...platform.finance.capitalActions, capitalAction],
        },
        eventLedger: [...platform.eventLedger, ledgerEntry],
    }, player.id);

    return {
        changed: true,
        reason: 'CONTRIBUTED',
        amount,
        player: {
            ...player,
            money: player.money - amount,
            ownedStreamingPlatform,
        },
    };
};

export interface HireStreamingExecutiveResult {
    player: Player;
    changed: boolean;
    reason:
        | 'HIRED'
        | 'INVALID_STATE'
        | 'UNKNOWN_EXECUTIVE'
        | 'ALREADY_HIRED'
        | 'ROLE_FILLED'
        | 'ALREADY_COMMITTED';
    appointment?: OwnedStreamingExecutiveAppointment;
}

/**
 * Executive hiring is optional. Founder-led players keep every capability
 * required to finish the base launch; appointments add specialist options.
 */
export const hireStreamingExecutive = (
    player: Player,
    executiveId: string,
    requestedIdempotencyKey?: string,
): HireStreamingExecutiveResult => {
    if (!isIncorporated(player)) {
        return { player, changed: false, reason: 'INVALID_STATE' };
    }
    const candidate = STREAMING_EXECUTIVE_CANDIDATES.find(item => item.id === executiveId);
    if (!candidate) {
        return { player, changed: false, reason: 'UNKNOWN_EXECUTIVE' };
    }
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const activeAppointments = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    if (activeAppointments.some(item => item.executiveId === candidate.id)) {
        return { player, changed: false, reason: 'ALREADY_HIRED' };
    }
    if (activeAppointments.some(item => item.role === candidate.role)) {
        return { player, changed: false, reason: 'ROLE_FILLED' };
    }

    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const suppliedKey = cleanIdempotencyKey(requestedIdempotencyKey);
    const idempotencyKey = suppliedKey
        ? `executive-hire:${suppliedKey}`
        : `executive-hire:${candidate.id}:${absoluteWeek}`;
    if (platform.eventLedger.some(entry => entry.idempotencyKey === idempotencyKey)) {
        return { player, changed: false, reason: 'ALREADY_COMMITTED' };
    }
    const appointment: OwnedStreamingExecutiveAppointment = {
        id: createDeterministicId('streaming_executive', platform.simulationSeed, idempotencyKey),
        executiveId: candidate.id,
        role: candidate.role,
        nameAtAppointment: candidate.name,
        status: 'ACTIVE',
        origin: 'PLAYER_HIRED',
        appointedAtAbsoluteWeek: absoluteWeek,
        endedAtAbsoluteWeek: null,
        weeklyCompensation: candidate.weeklyCompensation,
        skill: candidate.skill,
        loyalty: candidate.loyalty,
        ambition: candidate.ambition,
        ethics: candidate.ethics,
        preferredStrategy: candidate.preferredStrategy,
        founderRelationship: 60,
        internalRelationship: 62,
        performance: 60,
        level: 2,
        experience: 0,
    };
    const ledgerEntry: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'EXECUTIVE_APPOINTED',
        summary: `${candidate.name} appointed ${candidate.roleLabel}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            executiveId: candidate.id,
            role: candidate.role,
            weeklyCompensation: candidate.weeklyCompensation,
        },
    };
    const ownedStreamingPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        leadership: {
            ...platform.leadership,
            appointments: [...platform.leadership.appointments, appointment],
        },
        eventLedger: [...platform.eventLedger, ledgerEntry],
    }, player.id);
    return {
        changed: true,
        reason: 'HIRED',
        appointment,
        player: { ...player, ownedStreamingPlatform },
    };
};

export type StreamingCompanyCapability =
    | 'HIRE_EXECUTIVE'
    | 'FOUNDER_CAPITAL_CONTRIBUTION'
    | 'CONFIGURE_BASIC_INFRASTRUCTURE'
    | 'BUILD_STARTER_CATALOG'
    | 'COMMISSION_FIRST_ORIGINAL'
    | 'ADVANCED_OPERATIONS'
    | 'ADVANCED_TECHNOLOGY'
    | 'ADVANCED_FINANCE'
    | 'ADVANCED_CONTENT';

export interface StreamingCompanyCapabilityResolution {
    incorporated: boolean;
    activeExecutiveIds: string[];
    activeExecutiveRoles: StreamingExecutiveRole[];
    capabilities: Record<StreamingCompanyCapability, boolean>;
    sources: Partial<Record<StreamingCompanyCapability, string[]>>;
}

export const resolveStreamingCompanyCapabilities = (
    player: Player,
): StreamingCompanyCapabilityResolution => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const incorporated = isIncorporated(player);
    const activeAppointments = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const activeExecutiveRoles = Array.from(new Set(activeAppointments.map(item => item.role)));
    const hasRole = (role: StreamingExecutiveRole): boolean => activeExecutiveRoles.includes(role);
    return {
        incorporated,
        activeExecutiveIds: activeAppointments.map(item => item.executiveId),
        activeExecutiveRoles,
        capabilities: {
            HIRE_EXECUTIVE: incorporated,
            FOUNDER_CAPITAL_CONTRIBUTION: incorporated,
            CONFIGURE_BASIC_INFRASTRUCTURE: incorporated,
            BUILD_STARTER_CATALOG: incorporated,
            COMMISSION_FIRST_ORIGINAL: incorporated,
            ADVANCED_OPERATIONS: incorporated && hasRole('COO'),
            ADVANCED_TECHNOLOGY: incorporated && hasRole('CTO'),
            ADVANCED_FINANCE: incorporated && hasRole('CFO'),
            ADVANCED_CONTENT: incorporated && hasRole('CHIEF_CONTENT_OFFICER'),
        },
        sources: {
            HIRE_EXECUTIVE: incorporated ? ['Founder authority'] : [],
            FOUNDER_CAPITAL_CONTRIBUTION: incorporated ? ['Founder authority'] : [],
            CONFIGURE_BASIC_INFRASTRUCTURE: incorporated ? ['Level 0 foundation'] : [],
            BUILD_STARTER_CATALOG: incorporated ? ['Level 0 foundation'] : [],
            COMMISSION_FIRST_ORIGINAL: incorporated ? ['Level 0 foundation'] : [],
            ADVANCED_OPERATIONS: hasRole('COO') ? ['Active COO'] : [],
            ADVANCED_TECHNOLOGY: hasRole('CTO') ? ['Active CTO'] : [],
            ADVANCED_FINANCE: hasRole('CFO') ? ['Active CFO'] : [],
            ADVANCED_CONTENT: hasRole('CHIEF_CONTENT_OFFICER') ? ['Active Chief Content Officer'] : [],
        },
    };
};

export const hasStreamingCompanyCapability = (
    player: Player,
    capability: StreamingCompanyCapability,
): boolean => resolveStreamingCompanyCapabilities(player).capabilities[capability];
