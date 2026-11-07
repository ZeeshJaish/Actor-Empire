import { STREAMING_ESTATE_QUARTERS, STREAMING_ESTATE_RATE, startStreamingEstatePlan, streamingEstateQuarterly } from './streamingEstatePlan';
import { rebaseLegacyWeeks } from './legacyWorldClock';
import type { OwnedStreamingExecutiveAppointment } from '../types';
import type {
    OwnedStreamingCompanyEra,
    OwnedStreamingLedgerEntry,
    OwnedStreamingLegacyMontage,
    OwnedStreamingPlatformState,
    OwnedStreamingSuccessionPlan,
    Player,
    Relationship,
    StreamingEraMandate,
    StreamingFounderOfficeRole,
    StreamingLegacyIdentity,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek, getLegacyInheritancePreview, getRelationshipAge } from './legacyLogic';
import { getIndustryPeople } from './industry/industryPeople';
import { getStreamingEquityValuation } from './streamingPublicMarkets';
import { PUBLIC_FLOAT_HOLDER } from './streamingBuybacks';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));

export const STREAMING_ERA_MANDATES: Array<{
    id: StreamingEraMandate;
    label: string;
    promise: string;
    weeklyEffect: string;
}> = [
    { id: 'BALANCED', label: 'Balanced Empire', promise: 'Protect audience, culture and cash together.', weeklyEffect: 'Small engagement and reliability lift' },
    { id: 'AUDIENCE_GROWTH', label: 'Audience Expansion', promise: 'Turn the platform into a mass habit.', weeklyEffect: 'Faster acquisition, slightly higher churn' },
    { id: 'ORIGINALS_PRESTIGE', label: 'Originals Prestige', promise: 'Make the slate culturally unavoidable.', weeklyEffect: 'Higher engagement when Originals are active' },
    { id: 'TECHNOLOGY_LEADERSHIP', label: 'Technology Leadership', promise: 'Win trust through an exceptional stream.', weeklyEffect: 'Higher playback success and retention' },
    { id: 'GLOBAL_EXPANSION', label: 'Global Bridge', promise: 'Build a platform that travels across cultures.', weeklyEffect: 'Higher acquisition across multiple regions' },
    { id: 'TRUST_AND_RESILIENCE', label: 'Trust & Resilience', promise: 'Make recovery and viewer trust a strategic advantage.', weeklyEffect: 'Lower churn and stronger playback' },
    { id: 'CASH_DISCIPLINE', label: 'Durable Economics', promise: 'Compound a company that can survive every cycle.', weeklyEffect: 'Modest retention with lower demand volatility' },
];

export const STREAMING_LEGACY_IDENTITIES: Record<StreamingLegacyIdentity, {
    label: string;
    title: string;
    description: string;
}> = {
    AUDIENCE_ARCHITECT: { label: 'Audience Architect', title: 'You made watching a habit.', description: 'Subscriber scale and engagement became the company’s defining achievement.' },
    ORIGINALS_TITAN: { label: 'Originals Titan', title: 'You built stories people could only find here.', description: 'Original commissions, renewals and awards became the platform’s cultural signature.' },
    TECHNOLOGY_PIONEER: { label: 'Technology Pioneer', title: 'The stream itself became your advantage.', description: 'Engineering depth, product quality and reliable delivery defined the company.' },
    GLOBAL_BRIDGE: { label: 'Global Bridge', title: 'You carried stories across borders.', description: 'Regional expansion and global prestige made the platform larger than its home market.' },
    TRUSTED_STEWARD: { label: 'Trusted Steward', title: 'Viewers believed the platform would do the right thing.', description: 'Trust, resilience and clean governance outlasted short-term pressure.' },
    CORPORATE_STRATEGIST: { label: 'Corporate Strategist', title: 'You changed the shape of the market.', description: 'Acquisitions, ownership and public-company choices became your defining moves.' },
    COMEBACK_BUILDER: { label: 'Comeback Builder', title: 'The company became stronger after the fall.', description: 'Recoveries, hard decisions and renewed momentum wrote the most memorable chapters.' },
    BALANCED_EMPIRE: { label: 'Balanced Empire', title: 'No single victory explains the company.', description: 'Audience, stories, technology, trust and economics grew as one durable system.' },
};

const milestoneCopy: Partial<Record<OwnedStreamingLedgerEntry['type'], { title: string; caption: string }>> = {
    FOUNDATION_CREATED: { title: 'The signal begins', caption: 'A platform name became a real company.' },
    INFRASTRUCTURE_COMMITTED: { title: 'The first server room', caption: 'The company committed the systems that would carry its audience.' },
    LICENSE_SIGNED: { title: 'The first rights window', caption: 'The catalog gained a story audiences could actually watch.' },
    ORIGINAL_GREENLIT: { title: 'The first Original', caption: 'The company stopped being only a distributor and backed its own creative identity.' },
    LAUNCH_COMMITTED: { title: 'Premiere night', caption: 'The public stream went live and the first audience arrived.' },
    MILESTONE_REACHED: { title: 'A number becomes history', caption: 'A real operating milestone entered the permanent company record.' },
    REGIONAL_LAUNCH_COMPLETED: { title: 'A new region lights up', caption: 'The signal crossed another border.' },
    STREAMING_PLATFORM_ACQUIRED: { title: 'The empire expands', caption: 'A rival platform became part of the company’s future.' },
    IPO_LISTED: { title: 'The bell rings', caption: 'The private platform entered public markets.' },
    CRISIS_RECOVERED: { title: 'The comeback', caption: 'A damaged service completed a funded recovery.' },
    HOSTILE_TAKEOVER_DEFENDED: { title: 'Control survives', caption: 'The company answered a direct challenge to its independence.' },
    GENERATION_HANDOFF: { title: 'The next generation', caption: 'The platform crossed from one family chapter into another.' },
};

const currentLeaderName = (player: Player, platform: OwnedStreamingPlatformState): string => {
    if (platform.leadership.currentCeo.holderType === 'EXECUTIVE') {
        return platform.leadership.appointments.find(item => (
            item.executiveId === platform.leadership.currentCeo.executiveId && item.status === 'ACTIVE'
        ))?.nameAtAppointment || 'Chief Executive';
    }
    return player.name;
};

const scoreLegacyIdentity = (platform: OwnedStreamingPlatformState): Record<StreamingLegacyIdentity, number> => {
    const techAverage = Object.values(platform.technologyLevels).reduce((sum, value) => sum + value, 0) / 8;
    const releasedOriginals = platform.originalCommissions.filter(item => item.status === 'RELEASED').length;
    const awardWins = platform.competitiveWorld.awardSeasons.reduce((sum, season) => (
        sum + season.results.filter(result => result.winnerId === 'PLAYER').length
    ), 0);
    const regions = platform.competitiveWorld.regionalLaunches.filter(item => item.status === 'ACTIVE').length;
    const recoveries = platform.crisisSecurity.crises.filter(item => item.stage === 'RESOLVED').length;
    return {
        AUDIENCE_ARCHITECT: Math.min(100, Math.log10(Math.max(1, platform.metrics.subscribers)) * 11 + platform.metrics.engagementRate * 42),
        ORIGINALS_TITAN: releasedOriginals * 16 + awardWins * 12 + Math.min(22, platform.originalCommissions.length * 4),
        TECHNOLOGY_PIONEER: techAverage * 0.8 + platform.metrics.technologyHealth * 0.35 + platform.productLines.filter(item => item.status === 'ACTIVE').length * 4,
        GLOBAL_BRIDGE: regions * 15 + platform.competitiveWorld.globalPrestige * 0.65,
        TRUSTED_STEWARD: platform.crisisSecurity.publicTrust * 0.7 + platform.crisisSecurity.trustInitiatives.length * 7 - platform.crisisSecurity.evidenceTrail * 0.25,
        CORPORATE_STRATEGIST: platform.corporateDevelopment.acquiredPlatformIds.length * 24 + (platform.publicCompany.lifecycle === 'PUBLIC' ? 28 : 0) + (100 - platform.founderOwnershipPercent) * 0.25,
        COMEBACK_BUILDER: recoveries * 24 + platform.crisisSecurity.crises.length * 4 + platform.publicCompany.hostileTakeovers.filter(item => item.status !== 'ACTIVE').length * 18,
        BALANCED_EMPIRE: 45 + Math.min(30, platform.weeklyHistory.length * 0.75),
    };
};

export const deriveStreamingLegacyIdentity = (platform: OwnedStreamingPlatformState): StreamingLegacyIdentity => {
    const scores = scoreLegacyIdentity(platform);
    const ranked = (Object.entries(scores) as Array<[StreamingLegacyIdentity, number]>)
        .sort((left, right) => right[1] - left[1]);
    const [first, second] = ranked;
    if (!first || first[1] < 50 || (second && first[1] - second[1] < 5)) return 'BALANCED_EMPIRE';
    return first[0];
};

export interface StreamingLegacyMilestone {
    id: string;
    factId: string;
    absoluteWeek: number;
    title: string;
    caption: string;
    type: OwnedStreamingLedgerEntry['type'];
}

export interface StreamingSuccessionCandidate {
    id: string;
    type: 'EXECUTIVE' | 'FAMILY_HEIR';
    name: string;
    role: string;
    readinessScore: number;
    readinessNote: string;
    canOperateNow: boolean;
}

export const getStreamingLegacyMilestones = (platform: OwnedStreamingPlatformState): StreamingLegacyMilestone[] => {
    const seen = new Set<string>();
    return platform.eventLedger
        .filter(fact => milestoneCopy[fact.type])
        .filter(fact => {
            const key = fact.type === 'MILESTONE_REACHED' ? fact.id : fact.type;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map(fact => ({
            id: `legacy-milestone-${fact.id}`,
            factId: fact.id,
            absoluteWeek: fact.absoluteWeek,
            title: milestoneCopy[fact.type]!.title,
            caption: fact.summary || milestoneCopy[fact.type]!.caption,
            type: fact.type,
        }))
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek)
        .slice(-16);
};

/* #203: who from your connections can be named, and what the board thinks of them */
const CONNECTION_NOTE: Partial<Record<Relationship['relation'], string>> = {
    Child: 'Family, not an operator',
    Spouse: 'Family, not an operator',
    Partner: 'Family, not an operator',
    Parent: 'Family, not an operator',
    Sibling: 'Family, not an operator',
    Friend: 'A friend, not an operator',
};
const CONNECTION_SKILL_MOST = 78;
/** 35 + closeness × 0.15 + (age − 18, up to 30) × 0.5, ±10 from the career's seed, 78 at most */
export const streamingConnectionSkill = (seed: string, relationship: Pick<Relationship, 'id' | 'closeness'>, age: number) => {
    const swing = (createDeterministicRng(`${seed}:connection:${relationship.id}`)() - 0.5) * 20;
    return Math.round(Math.min(CONNECTION_SKILL_MOST, Math.max(20, 35 + (relationship.closeness || 0) * 0.15 + Math.min(30, Math.max(0, age - 18)) * 0.5 + swing)));
};
const connectionPay = (skill: number) => Math.round((60_000 + skill * 2_000) / 5_000) * 5_000;
/** someone from your connections as chief executive: paid by their skill, with no chair at the table */
export const streamingConnectionCeo = (platform: OwnedStreamingPlatformState, relationship: Relationship, skill: number, absoluteWeek: number): OwnedStreamingExecutiveAppointment => {
    const key = `connection:${relationship.id}`;
    return {
        id: createDeterministicId('streaming_executive', platform.simulationSeed, `${key}:${absoluteWeek}`),
        executiveId: key,
        role: 'CEO',
        nameAtAppointment: relationship.name,
        status: 'ACTIVE',
        origin: 'INTERNAL_PROMOTION',
        appointedAtAbsoluteWeek: absoluteWeek,
        endedAtAbsoluteWeek: null,
        weeklyCompensation: connectionPay(skill),
        skill,
        loyalty: Math.round(clamp(relationship.closeness || 50)),
        ambition: 50,
        ethics: 70,
        preferredStrategy: 'BALANCED',
        founderRelationship: Math.round(clamp(relationship.closeness || 50)),
        internalRelationship: 50,
        performance: 55,
        level: 2,
        experience: 0,
    };
};

export const getStreamingSuccessionCandidates = (player: Player): StreamingSuccessionCandidate[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const executives = platform.leadership.appointments
        .filter(item => item.status === 'ACTIVE' && item.role !== 'CEO')
        .map(item => {
            const readiness = Math.round(clamp(
                item.skill * 0.28
                + item.performance * 0.24
                + item.loyalty * 0.18
                + item.founderRelationship * 0.18
                + item.level * 2.4,
            ));
            return {
                id: item.executiveId,
                type: 'EXECUTIVE' as const,
                name: item.nameAtAppointment,
                role: item.role.replace(/_/g, ' '),
                readinessScore: readiness,
                readinessNote: readiness >= 75 ? 'Board-ready operator' : readiness >= 58 ? 'Credible with visible development gaps' : 'High-risk stretch appointment',
                canOperateNow: true,
            };
        });
    const family = (player.relationships || [])
        .filter(item => CONNECTION_NOTE[item.relation])
        .map(item => {
            const age = getRelationshipAge(item, player.age, player.currentWeek);
            return {
                id: item.id,
                type: 'FAMILY_HEIR' as const,
                name: item.name,
                role: `${item.relation} · age ${age}`,
                readinessScore: streamingConnectionSkill(platform.simulationSeed, item, age),
                readinessNote: age >= 18 ? CONNECTION_NOTE[item.relation]! : 'Can take over at 18',
                canOperateNow: age >= 18,
            };
        });
    return [...executives, ...family].sort((left, right) => right.readinessScore - left.readinessScore);
};

export const getStreamingLegacyOffice = (player: Player) => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const identity = deriveStreamingLegacyIdentity(platform);
    const milestones = getStreamingLegacyMilestones(platform);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    return {
        available: Boolean(platform.identity) && platform.lifecycle !== 'LOCKED',
        identity,
        identityProfile: STREAMING_LEGACY_IDENTITIES[identity],
        milestones,
        candidates: getStreamingSuccessionCandidates(player),
        activeLeaderName: currentLeaderName(player, platform),
        currentEraWeeks: Math.max(0, absoluteWeek - platform.legacy.currentEraStartedAtAbsoluteWeek),
        canOpenNewEra: absoluteWeek - platform.legacy.currentEraStartedAtAbsoluteWeek >= 12,
        latestMontage: platform.legacy.montages.at(-1) || null,
        completedEraCount: platform.legacy.closedEras.length,
    };
};

export const planStreamingSuccession = (
    player: Player,
    candidateType: 'EXECUTIVE' | 'FAMILY_HEIR',
    candidateId: string,
    mandate: StreamingEraMandate,
): { player: Player; changed: boolean; reason?: 'CANDIDATE_NOT_FOUND' } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const candidate = getStreamingSuccessionCandidates(player).find(item => item.id === candidateId && item.type === candidateType);
    if (!candidate) return { player, changed: false, reason: 'CANDIDATE_NOT_FOUND' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `streaming-succession-plan:${absoluteWeek}:${candidate.type}:${candidate.id}`;
    const plan: OwnedStreamingSuccessionPlan = {
        id: createDeterministicId('streaming_succession', platform.simulationSeed, idempotencyKey),
        candidateType: candidate.type,
        candidateId: candidate.id,
        candidateName: candidate.name,
        readinessScore: candidate.readinessScore,
        selectedAtAbsoluteWeek: absoluteWeek,
        mandate,
        status: 'DESIGNATED',
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'SUCCESSION_PLAN_UPDATED',
        summary: `${candidate.name} was designated for the next chapter under a ${mandate.replace(/_/g, ' ').toLowerCase()} mandate.`,
        source: 'PLAYER_ACTION',
        metadata: { candidateType, candidateId, readinessScore: candidate.readinessScore, mandate },
    };
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                legacy: { ...platform.legacy, successionPlan: plan },
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
    };
};

const buildClosedEra = (
    player: Player,
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    reason: OwnedStreamingCompanyEra['closingReason'],
): OwnedStreamingCompanyEra => {
    const highlights = getStreamingLegacyMilestones(platform)
        .filter(item => item.absoluteWeek >= platform.legacy.currentEraStartedAtAbsoluteWeek)
        .slice(-8)
        .map(item => item.factId);
    const firstSnapshot = platform.weeklyHistory.find(item => item.absoluteWeek >= platform.legacy.currentEraStartedAtAbsoluteWeek);
    return {
        id: createDeterministicId('streaming_era', platform.simulationSeed, platform.legacy.currentEraNumber, platform.legacy.currentEraStartedAtAbsoluteWeek),
        eraNumber: platform.legacy.currentEraNumber,
        title: platform.legacy.currentEraNumber === 1 ? 'The Founding Era' : `Era ${platform.legacy.currentEraNumber}`,
        leaderName: currentLeaderName(player, platform),
        leaderType: platform.leadership.currentCeo.holderType === 'EXECUTIVE' ? 'EXECUTIVE' : 'FOUNDER',
        mandate: platform.legacy.currentMandate,
        legacyIdentity: deriveStreamingLegacyIdentity(platform),
        startedAtAbsoluteWeek: platform.legacy.currentEraStartedAtAbsoluteWeek,
        endedAtAbsoluteWeek: absoluteWeek,
        closingReason: reason,
        subscriberStart: firstSnapshot?.subscribers || 0,
        subscriberEnd: platform.metrics.subscribers,
        treasuryEnd: platform.treasuryCash,
        globalPrestigeEnd: platform.competitiveWorld.globalPrestige,
        publicTrustEnd: platform.crisisSecurity.publicTrust,
        highlightFactIds: highlights,
    };
};

const appendEraFacts = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    closedEra: OwnedStreamingCompanyEra,
    leaderName: string,
    mandate: StreamingEraMandate,
    reason: OwnedStreamingCompanyEra['closingReason'],
): OwnedStreamingLedgerEntry[] => {
    const closedKey = `streaming-era-closed:${closedEra.eraNumber}:${absoluteWeek}:${reason}`;
    const openedKey = `streaming-era-opened:${closedEra.eraNumber + 1}:${absoluteWeek}:${leaderName}`;
    return [
        {
            id: createDeterministicId('streaming_event', platform.simulationSeed, closedKey),
            idempotencyKey: closedKey,
            absoluteWeek,
            type: 'COMPANY_ERA_CLOSED',
            summary: `${closedEra.title} entered the permanent archive under the ${STREAMING_LEGACY_IDENTITIES[closedEra.legacyIdentity].label} identity.`,
            source: 'PLAYER_ACTION',
            metadata: { eraNumber: closedEra.eraNumber, reason },
        },
        {
            id: createDeterministicId('streaming_event', platform.simulationSeed, openedKey),
            idempotencyKey: openedKey,
            absoluteWeek,
            type: 'COMPANY_ERA_OPENED',
            summary: `${leaderName} opened Era ${closedEra.eraNumber + 1} with the ${mandate.replace(/_/g, ' ').toLowerCase()} mandate.`,
            source: 'PLAYER_ACTION',
            metadata: { eraNumber: closedEra.eraNumber + 1, leaderName, mandate },
        },
    ];
};

export const enactStreamingSuccession = (
    player: Player,
    founderRoleAfter: Exclude<StreamingFounderOfficeRole, 'FOUNDER_CEO'>,
): { player: Player; changed: boolean; reason?: 'NO_PLAN' | 'ALREADY_TRANSITIONED' | 'TOO_YOUNG' | 'EXECUTIVE_NOT_ACTIVE' } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const plan = platform.legacy.successionPlan;
    if (!plan) return { player, changed: false, reason: 'NO_PLAN' };
    if (plan.status === 'TRANSITIONED') return { player, changed: false, reason: 'ALREADY_TRANSITIONED' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    /* #203: someone from your connections: they come on as chief executive, without a chair at the table */
    let joining: OwnedStreamingExecutiveAppointment | null = null;
    if (plan.candidateType === 'FAMILY_HEIR') {
        const relationship = (player.relationships || []).find(item => item.id === plan.candidateId);
        const candidate = getStreamingSuccessionCandidates(player).find(item => item.type === 'FAMILY_HEIR' && item.id === plan.candidateId);
        if (!relationship || !candidate) return { player, changed: false, reason: 'EXECUTIVE_NOT_ACTIVE' };
        if (!candidate.canOperateNow) return { player, changed: false, reason: 'TOO_YOUNG' };
        joining = streamingConnectionCeo(platform, relationship, candidate.readinessScore, absoluteWeek);
    }
    const executive = joining || platform.leadership.appointments.find(item => item.executiveId === plan.candidateId && item.status === 'ACTIVE');
    if (!executive) return { player, changed: false, reason: 'EXECUTIVE_NOT_ACTIVE' };
    const closedEra = buildClosedEra(player, platform, absoluteWeek, 'FOUNDER_TRANSITION');
    const eraFacts = appendEraFacts(platform, absoluteWeek, closedEra, executive.nameAtAppointment, plan.mandate, 'FOUNDER_TRANSITION');
    const successionKey = `streaming-successor-appointed:${absoluteWeek}:${executive.executiveId}`;
    const successorFact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, successionKey),
        idempotencyKey: successionKey,
        absoluteWeek,
        type: 'SUCCESSOR_APPOINTED',
        summary: `${executive.nameAtAppointment} became Chief Executive as ${player.name} moved to ${founderRoleAfter === 'EXECUTIVE_CHAIR' ? 'Executive Chair' : 'Founder Emeritus'}.`,
        source: 'PLAYER_ACTION',
        metadata: { executiveId: executive.executiveId, founderRoleAfter, readinessScore: plan.readinessScore },
    };
    const facts = [...platform.eventLedger, ...eraFacts, successorFact];
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                leadership: {
                    ...platform.leadership,
                    ...(joining ? { appointments: [...platform.leadership.appointments, joining] } : {}),
                    currentCeo: { holderType: 'EXECUTIVE', executiveId: executive.executiveId, sinceAbsoluteWeek: absoluteWeek },
                },
                legacy: {
                    ...platform.legacy,
                    founderOfficeRole: founderRoleAfter,
                    currentEraNumber: platform.legacy.currentEraNumber + 1,
                    currentEraStartedAtAbsoluteWeek: absoluteWeek,
                    currentMandate: plan.mandate,
                    successionPlan: { ...plan, status: 'TRANSITIONED' },
                    closedEras: [...platform.legacy.closedEras, closedEra],
                    endlessMode: true,
                    transitionCount: platform.legacy.transitionCount + 1,
                },
                eventLedger: facts,
                cinematicQueue: [...platform.cinematicQueue, {
                    id: createDeterministicId('streaming_scene', platform.simulationSeed, successionKey),
                    idempotencyKey: `streaming-succession-ceremony:${successionKey}`,
                    type: 'SUCCESSION_CEREMONY',
                    status: 'QUEUED',
                    priority: 'MAJOR',
                    availableAtAbsoluteWeek: absoluteWeek,
                    title: 'A New Name on the CEO Door',
                    factIds: [successorFact.id, ...eraFacts.map(item => item.id)],
                }],
            }, player.id),
        },
    };
};

export const beginNextStreamingEra = (
    player: Player,
    mandate: StreamingEraMandate,
): { player: Player; changed: boolean; reason?: 'ERA_TOO_YOUNG' } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (absoluteWeek - platform.legacy.currentEraStartedAtAbsoluteWeek < 12) {
        return { player, changed: false, reason: 'ERA_TOO_YOUNG' };
    }
    const closedEra = buildClosedEra(player, platform, absoluteWeek, 'NEW_MANDATE');
    const leaderName = currentLeaderName(player, platform);
    const eraFacts = appendEraFacts(platform, absoluteWeek, closedEra, leaderName, mandate, 'NEW_MANDATE');
    return {
        changed: true,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                legacy: {
                    ...platform.legacy,
                    currentEraNumber: platform.legacy.currentEraNumber + 1,
                    currentEraStartedAtAbsoluteWeek: absoluteWeek,
                    currentMandate: mandate,
                    closedEras: [...platform.legacy.closedEras, closedEra],
                    endlessMode: true,
                    transitionCount: platform.legacy.transitionCount + 1,
                },
                eventLedger: [...platform.eventLedger, ...eraFacts],
                cinematicQueue: [...platform.cinematicQueue, {
                    id: createDeterministicId('streaming_scene', platform.simulationSeed, 'new-era', absoluteWeek),
                    idempotencyKey: `streaming-new-era:${absoluteWeek}:${mandate}`,
                    type: 'NEW_ERA_KEYNOTE',
                    status: 'QUEUED',
                    priority: 'IMPORTANT',
                    availableAtAbsoluteWeek: absoluteWeek,
                    title: `Era ${platform.legacy.currentEraNumber + 1}: ${STREAMING_ERA_MANDATES.find(item => item.id === mandate)!.label}`,
                    factIds: eraFacts.map(item => item.id),
                }],
            }, player.id),
        },
    };
};

export const createStreamingLegacyMontage = (
    player: Player,
): { player: Player; changed: boolean; montage: OwnedStreamingLegacyMontage | null } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `streaming-legacy-film:era-${platform.legacy.currentEraNumber}`;
    const existing = platform.legacy.montages.find(item => item.idempotencyKey === idempotencyKey) || null;
    if (existing) return { player, changed: false, montage: existing };
    const identity = deriveStreamingLegacyIdentity(platform);
    const milestones = getStreamingLegacyMilestones(platform);
    const sourceMilestones = milestones.length ? milestones : platform.eventLedger.slice(0, 1).map(fact => ({
        id: `legacy-milestone-${fact.id}`,
        factId: fact.id,
        absoluteWeek: fact.absoluteWeek,
        title: 'The signal begins',
        caption: fact.summary,
        type: fact.type,
    }));
    if (!sourceMilestones.length) return { player, changed: false, montage: null };
    const montage: OwnedStreamingLegacyMontage = {
        id: createDeterministicId('streaming_legacy_montage', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        eraNumber: platform.legacy.currentEraNumber,
        createdAtAbsoluteWeek: absoluteWeek,
        identity,
        title: `${platform.identity?.name || 'The Platform'}: The Signal We Built`,
        chapters: sourceMilestones.slice(-8).map(item => ({
            id: createDeterministicId('streaming_legacy_chapter', item.factId),
            title: item.title,
            caption: item.caption,
            absoluteWeek: item.absoluteWeek,
            factId: item.factId,
        })),
    };
    const fact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'LEGACY_FILM_COMMITTED',
        summary: `${montage.title} was cut from ${montage.chapters.length} verified company chapters.`,
        source: 'PLAYER_ACTION',
        metadata: { identity, eraNumber: montage.eraNumber, chapterCount: montage.chapters.length },
    };
    return {
        changed: true,
        montage,
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                legacy: { ...platform.legacy, montages: [...platform.legacy.montages, montage] },
                eventLedger: [...platform.eventLedger, fact],
                cinematicQueue: [...platform.cinematicQueue, {
                    id: createDeterministicId('streaming_scene', platform.simulationSeed, idempotencyKey),
                    idempotencyKey: `streaming-legacy-montage:${idempotencyKey}`,
                    type: 'LEGACY_MONTAGE',
                    status: 'QUEUED',
                    priority: 'MAJOR',
                    availableAtAbsoluteWeek: absoluteWeek,
                    title: montage.title,
                    factIds: [fact.id, ...montage.chapters.map(item => item.factId)],
                }],
            }, player.id),
        },
    };
};

/** #166 (plan §21.12): eras and their mandates no longer move the weekly model; small passive percentages went
    against the rule "actions, not passive %". The mandate is still recorded with a succession. */
export const getStreamingEraWeeklyEffects = (platform: OwnedStreamingPlatformState) => ({
    mandate: platform.legacy.currentMandate,
    acquisitionRateDelta: 0,
    churnRateDelta: 0,
    engagementRateDelta: 0,
    playbackBoost: 0,
});

export const rebaseOwnedStreamingPlatformForLegacy = (
    platformValue: OwnedStreamingPlatformState,
    fromAbsoluteWeek: number,
    toAbsoluteWeek: number,
): OwnedStreamingPlatformState => {
    const offset = Math.max(0, fromAbsoluteWeek - toAbsoluteWeek);
    if (!offset) return platformValue;
    const rebased = rebaseLegacyWeeks(platformValue, offset);
    return {
        ...rebased,
        processedWeekKeys: [],
        weeklyDecisions: [],
        growthActions: [],
        lastAcknowledgedWeeklyReportAbsoluteWeek: rebased.lastProcessedAbsoluteWeek,
    };
};

/*
 * #207 (plan §23.8): what happens to the company when you die. Zeesh (2026-11-04): "agar mai mar jau to mera beta ya koi
 * bhi takeover kare to kya scene hai", "waisa hi karo jaisa real life me hota agar stake me lagta hai to lagao".
 *
 * The estate pays 25% of the stake's value, as cash and shares already do. The heir chooses: pay it from the cash they
 * inherit (when that covers it) and keep the shares, or sell a quarter of the shares. A chief executive already in place
 * stays, and the heir holds the shares (and the chair, if you held it). If you ran it: at 51% or more the heir chooses to
 * run it or hand it to your named successor; under it the board picks. The board loses 5 confidence; once listed the
 * price falls 3–8% that week, with the new chief executive's skill on top. The next character is still a child: that is
 * the game's rule.
 */
export const STREAMING_ESTATE_TAX = 0.25;
export interface StreamingHandoffChoice { estate?: 'PAY_CASH' | 'SELL_SHARES' | 'OVER_TIME'; run?: 'HEIR' | 'SUCCESSOR' }
export interface StreamingEstate {
    company: string;
    stakePercent: number;
    stakeValue: number;
    tax: number;
    /** the cash the heir inherits, before this */
    inheritedMoney: number;
    canPayCash: boolean;
    /** the heir's stake if shares are sold to pay it */
    percentIfSold: number;
    /** #221: over time, from the wallet */
    overTime: { quarterly: number; quarters: number; ratePercent: number };
    /** what the choice comes to */
    estate: 'PAY_CASH' | 'SELL_SHARES' | 'OVER_TIME';
    cashPaid: number;
    percentAfter: number;
    /** who runs it after you: who is already there, or who you named */
    ceoStays: string | null;
    /** you ran it, at 51% or more: the heir chooses; under it: the board picks this person */
    heirChooses: boolean;
    successor: { name: string; skill: number } | null;
    boardPicks: { name: string; skill: number } | null;
}

/** the successor the handoff would use, for this heir: the one you named, else (for the board) the best of the team */
const handoffSuccessor = (parent: Player, platform: OwnedStreamingPlatformState, heirId?: string) => {
    const plan = platform.legacy.successionPlan;
    const active = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    if (plan?.candidateType === 'EXECUTIVE') {
        const named = active.find(item => item.executiveId === plan.candidateId);
        if (named) return { name: named.nameAtAppointment, skill: named.skill, executiveId: named.executiveId, relationship: null as Relationship | null };
    }
    if (plan?.candidateType === 'FAMILY_HEIR' && plan.candidateId !== heirId) {
        const relationship = (parent.relationships || []).find(item => item.id === plan.candidateId);
        const candidate = getStreamingSuccessionCandidates(parent).find(item => item.type === 'FAMILY_HEIR' && item.id === plan.candidateId);
        if (relationship && candidate?.canOperateNow) return { name: relationship.name, skill: candidate.readinessScore, executiveId: `connection:${relationship.id}`, relationship };
    }
    return null;
};
const bestOfTheTeam = (platform: OwnedStreamingPlatformState) => {
    const best = [...platform.leadership.appointments].filter(item => item.status === 'ACTIVE' && item.role !== 'CEO').sort((a, b) => b.skill - a.skill)[0];
    return best ? { name: best.nameAtAppointment, skill: best.skill, executiveId: best.executiveId, relationship: null as Relationship | null } : null;
};

export const getStreamingEstate = (player: Player, choice: StreamingHandoffChoice = {}): StreamingEstate | null => {
    const source = player.ownedStreamingPlatform;
    if (!source?.identity || source.lifecycle !== 'ACTIVE' || !source.launchCommit) return null;
    const platform = normalizeOwnedStreamingPlatformState(source, player.id);
    const stakePercent = platform.founderOwnershipPercent;
    if (stakePercent <= 0) return null;
    const stakeValue = Math.round(getStreamingEquityValuation(platform) * stakePercent / 100);
    /* #221: what an earlier estate still owes falls due with this one */
    const tax = Math.round(stakeValue * STREAMING_ESTATE_TAX) + (platform.governance.estatePlan?.owed || 0);
    const inheritedMoney = getLegacyInheritancePreview(player).inheritedMoney;
    const canPayCash = tax <= inheritedMoney;
    const estate = choice.estate === 'OVER_TIME' ? 'OVER_TIME' : choice.estate === 'SELL_SHARES' || !canPayCash ? 'SELL_SHARES' : 'PAY_CASH';
    const percentIfSold = Math.round(stakePercent * Math.max(0, 1 - tax / Math.max(1, stakeValue)) * 100) / 100;
    const percentAfter = estate === 'SELL_SHARES' ? percentIfSold : stakePercent;
    const sitting = platform.leadership.currentCeo.holderType === 'EXECUTIVE'
        ? platform.leadership.appointments.find(item => item.executiveId === platform.leadership.currentCeo.executiveId && item.status === 'ACTIVE') : null;
    const named = handoffSuccessor(player, platform);
    const picks = named || bestOfTheTeam(platform);
    return {
        company: platform.identity!.name,
        stakePercent,
        stakeValue,
        tax,
        inheritedMoney,
        canPayCash,
        percentIfSold,
        overTime: { quarterly: streamingEstateQuarterly(tax), quarters: STREAMING_ESTATE_QUARTERS, ratePercent: STREAMING_ESTATE_RATE * 100 },
        estate,
        cashPaid: estate === 'PAY_CASH' ? tax : 0,
        percentAfter,
        ceoStays: sitting?.nameAtAppointment || null,
        heirChooses: !sitting && percentAfter >= 51,
        successor: named ? { name: named.name, skill: named.skill } : null,
        boardPicks: !sitting && percentAfter < 51 && picks ? { name: picks.name, skill: picks.skill } : null,
    };
};

export const handoffOwnedStreamingPlatformToHeir = (
    parent: Player,
    heir: Pick<Relationship, 'id' | 'name'>,
    heirAge: number,
    heirWeek: number,
    choice: StreamingHandoffChoice = {},
): OwnedStreamingPlatformState => {
    const parentPlatform = normalizeOwnedStreamingPlatformState(parent.ownedStreamingPlatform, parent.id);
    if (!parentPlatform.identity) return parentPlatform;
    const parentWeek = getAbsoluteWeek(parent.age, parent.currentWeek);
    const heirAbsoluteWeek = getAbsoluteWeek(heirAge, heirWeek);
    const rebased = normalizeOwnedStreamingPlatformState(
        rebaseOwnedStreamingPlatformForLegacy(parentPlatform, parentWeek, heirAbsoluteWeek),
        parent.id,
    );
    /* a company you sold or left is on record and nothing more */
    if (parentPlatform.lifecycle !== 'ACTIVE') return compactOwnedStreamingPlatformForPersistence(rebased, parent.id);
    const died = Boolean(parent.flags?.isDead);
    const estate = getStreamingEstate(parent, choice);
    const name = parentPlatform.identity.name;

    /* the estate: from the cash inherited (the app takes it there), or a quarter of the shares */
    let shares = rebased;
    if (estate?.estate === 'SELL_SHARES') {
        const sold = estate.stakePercent - estate.percentIfSold;
        const listing = rebased.publicCompany.lifecycle === 'PUBLIC' ? rebased.publicCompany.listing : null;
        const rng = createDeterministicRng(`${rebased.simulationSeed}:estate:${heir.id}`);
        const buyers = getIndustryPeople(parent).filter(person => person.kind === 'INVESTOR' && !rebased.finance.equityHolders.some(holder => holder.holderName === person.name));
        const buyer = buyers[Math.floor(rng() * buyers.length) % Math.max(1, buyers.length)]?.name || 'Private buyers';
        const holderName = listing ? PUBLIC_FLOAT_HOLDER : buyer;
        const existing = rebased.finance.equityHolders.find(holder => holder.holderName === holderName);
        shares = {
            ...rebased,
            founderOwnershipPercent: estate.percentIfSold,
            finance: {
                ...rebased.finance,
                equityHolders: existing
                    ? rebased.finance.equityHolders.map(holder => (holder === existing ? { ...holder, ownershipPercent: Math.round((holder.ownershipPercent + sold) * 10_000) / 10_000 } : holder))
                    : [...rebased.finance.equityHolders, {
                        id: createDeterministicId('streaming_equity', rebased.simulationSeed, `estate:${heir.id}`),
                        holderName, ownershipPercent: Math.round(sold * 10_000) / 10_000, investedCapital: Math.round(estate.tax), issuedAtAbsoluteWeek: heirAbsoluteWeek,
                    }],
            },
            publicCompany: listing ? { ...rebased.publicCompany, listing: { ...listing, publicShares: listing.publicShares + Math.round(listing.sharesOutstanding * sold / 100) } } : rebased.publicCompany,
        };
    }

    /* who runs it */
    const sitting = shares.leadership.currentCeo.holderType === 'EXECUTIVE'
        ? shares.leadership.appointments.find(item => item.executiveId === shares.leadership.currentCeo.executiveId && item.status === 'ACTIVE') || null : null;
    const heirWasCeo = sitting?.executiveId === `connection:${heir.id}`;
    let appointments = shares.leadership.appointments;
    let currentCeo: OwnedStreamingPlatformState['leadership']['currentCeo'] = { holderType: 'FOUNDER', executiveId: null, sinceAbsoluteWeek: heirAbsoluteWeek };
    let founderOfficeRole: OwnedStreamingPlatformState['legacy']['founderOfficeRole'] = 'FOUNDER_CEO';
    let newCeo: { name: string; skill: number; executiveId: string } | null = null;
    let runner = heir.name;
    if (heirWasCeo) {
        appointments = appointments.map(item => (item.id === sitting!.id
            ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: heirAbsoluteWeek, exit: { reason: 'RESIGNED' as const, sudden: false, pricedAtAbsoluteWeek: heirAbsoluteWeek, wasCeo: true } } : item));
    } else if (sitting) {
        currentCeo = shares.leadership.currentCeo;
        founderOfficeRole = shares.legacy.founderOfficeRole;
        runner = sitting.nameAtAppointment;
    } else {
        const named = handoffSuccessor(parent, shares, heir.id);
        const handsOver = shares.founderOwnershipPercent >= 51 ? (choice.run === 'SUCCESSOR' ? named : null) : named || bestOfTheTeam(shares);
        if (handsOver) {
            if (handsOver.relationship) appointments = [...appointments, streamingConnectionCeo(shares, handsOver.relationship, handsOver.skill, heirAbsoluteWeek)];
            currentCeo = { holderType: 'EXECUTIVE', executiveId: handsOver.executiveId, sinceAbsoluteWeek: heirAbsoluteWeek };
            founderOfficeRole = 'EXECUTIVE_CHAIR';
            newCeo = handsOver;
            runner = handsOver.name;
        }
    }
    const handoffWords = sitting && !heirWasCeo ? `${runner} keeps running ${name}; ${heir.name} inherits the founder's shares.`
        : newCeo ? `${runner} takes over at ${name}; ${heir.name} inherits the founder's shares.`
            : `${heir.name} inherits ${name}, and will run it.`;

    /* the reaction: the board, and once listed the price, once */
    const shock = createDeterministicRng(`${rebased.simulationSeed}:founder-death:${heir.id}`)();
    const deathMove = died ? -(0.03 + shock * 0.05) + (newCeo ? Math.max(-0.05, Math.min(0.05, (newCeo.skill - 60) / 800)) : 0) : 0;
    const boardAfter = Math.max(0, Math.min(100, shares.governance.boardConfidence - (died ? 5 : 0) + (newCeo ? Math.round((newCeo.skill - 60) / 4) : 0)));
    const newCeoFact: OwnedStreamingLedgerEntry | null = newCeo ? (() => {
        const key = `streaming-successor-appointed:${heirAbsoluteWeek}:${newCeo!.executiveId}`;
        return {
            id: createDeterministicId('streaming_event', parentPlatform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek: heirAbsoluteWeek,
            type: 'SUCCESSOR_APPOINTED',
            summary: `${newCeo!.name} became Chief Executive after ${parent.name}${died ? "'s death" : ' stepped back'}.`,
            source: 'SYSTEM',
            metadata: { executiveId: newCeo!.executiveId, founderRoleAfter: founderOfficeRole, readinessScore: newCeo!.skill },
        } as OwnedStreamingLedgerEntry;
    })() : null;
    const closedEra = buildClosedEra(parent, parentPlatform, parentWeek, 'GENERATION_HANDOFF');
    const handoffKey = `streaming-generation-handoff:${parent.id}:${heir.id}:${parentWeek}`;
    const handoffFact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', parentPlatform.simulationSeed, handoffKey),
        idempotencyKey: handoffKey,
        absoluteWeek: heirAbsoluteWeek,
        type: 'GENERATION_HANDOFF',
        summary: handoffWords,
        source: 'PLAYER_ACTION',
        metadata: { parentName: parent.name, heirName: heir.name, eraNumber: parentPlatform.legacy.currentEraNumber + 1, died },
    };
    return compactOwnedStreamingPlatformForPersistence({
        ...shares,
        governance: {
            ...shares.governance,
            boardConfidence: boardAfter,
            ...(deathMove && shares.publicCompany.lifecycle === 'PUBLIC' ? { founderDeath: { move: deathMove } } : {}),
            /* #221: paid now, or over time; what an earlier estate owed is in this bill */
            ...(estate ? { estatePlan: estate.estate === 'OVER_TIME' ? startStreamingEstatePlan(estate.tax, heirAbsoluteWeek) : null } : {}),
        },
        leadership: {
            ...shares.leadership,
            appointments,
            currentCeo,
        },
        legacy: {
            ...rebased.legacy,
            founderOfficeRole,
            currentEraNumber: parentPlatform.legacy.currentEraNumber + 1,
            currentEraStartedAtAbsoluteWeek: heirAbsoluteWeek,
            currentMandate: parentPlatform.legacy.successionPlan?.candidateType === 'FAMILY_HEIR'
                && parentPlatform.legacy.successionPlan.candidateId === heir.id
                ? parentPlatform.legacy.successionPlan.mandate
                : 'BALANCED',
            successionPlan: null,
            closedEras: [
                ...rebased.legacy.closedEras,
                { ...(rebaseLegacyWeeks(closedEra, parentWeek - heirAbsoluteWeek) as OwnedStreamingCompanyEra) },
            ],
            endlessMode: true,
            transitionCount: rebased.legacy.transitionCount + 1,
        },
        eventLedger: [...rebased.eventLedger, handoffFact, ...(newCeoFact ? [newCeoFact] : [])],
        cinematicQueue: [...rebased.cinematicQueue, {
            id: createDeterministicId('streaming_scene', parentPlatform.simulationSeed, handoffKey),
            idempotencyKey: `streaming-generation-keynote:${handoffKey}`,
            type: 'NEW_ERA_KEYNOTE',
            status: 'QUEUED',
            priority: 'MAJOR',
            availableAtAbsoluteWeek: heirAbsoluteWeek,
            title: `A New Generation at ${parentPlatform.identity.name}`,
            factIds: [handoffFact.id],
        }],
    }, parent.id);
};
