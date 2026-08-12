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
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek, getRelationshipAge } from './legacyLogic';
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
    STREAMING_AWARDS_RESOLVED: { title: 'The industry notices', caption: 'The platform stepped onto the awards stage.' },
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

export const getStreamingSuccessionCandidates = (player: Player): StreamingSuccessionCandidate[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const executives = platform.leadership.appointments
        .filter(item => item.status === 'ACTIVE')
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
    const family = player.relationships
        .filter(item => item.relation === 'Child')
        .map(item => {
            const age = getRelationshipAge(item, player.age, player.currentWeek);
            const readiness = Math.round(clamp((item.closeness || 50) * 0.55 + Math.min(30, age) * 1.5));
            return {
                id: item.id,
                type: 'FAMILY_HEIR' as const,
                name: item.name,
                role: age >= 18 ? `Family heir • age ${age}` : `Designated heir • age ${age}`,
                readinessScore: readiness,
                readinessNote: age >= 18 ? 'Eligible through the existing family legacy handoff' : 'May be designated now; operations wait until adulthood',
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
): { player: Player; changed: boolean; reason?: 'NO_PLAN' | 'ALREADY_TRANSITIONED' | 'FAMILY_HANDOFF_REQUIRED' | 'EXECUTIVE_NOT_ACTIVE' } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const plan = platform.legacy.successionPlan;
    if (!plan) return { player, changed: false, reason: 'NO_PLAN' };
    if (plan.status === 'TRANSITIONED') return { player, changed: false, reason: 'ALREADY_TRANSITIONED' };
    if (plan.candidateType === 'FAMILY_HEIR') return { player, changed: false, reason: 'FAMILY_HANDOFF_REQUIRED' };
    const executive = platform.leadership.appointments.find(item => item.executiveId === plan.candidateId && item.status === 'ACTIVE');
    if (!executive) return { player, changed: false, reason: 'EXECUTIVE_NOT_ACTIVE' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
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

export const getStreamingEraWeeklyEffects = (platform: OwnedStreamingPlatformState) => {
    const mandate = platform.legacy.currentMandate;
    return {
        mandate,
        acquisitionRateDelta: mandate === 'AUDIENCE_GROWTH' ? 0.003
            : mandate === 'GLOBAL_EXPANSION' && platform.competitiveWorld.regionalLaunches.filter(item => item.status === 'ACTIVE').length > 1 ? 0.0025
                : 0,
        churnRateDelta: mandate === 'TRUST_AND_RESILIENCE' ? -0.0012
            : mandate === 'TECHNOLOGY_LEADERSHIP' ? -0.0007
                : mandate === 'CASH_DISCIPLINE' ? -0.0004
                    : mandate === 'AUDIENCE_GROWTH' ? 0.0005
                        : mandate === 'BALANCED' ? -0.0002 : 0,
        engagementRateDelta: mandate === 'ORIGINALS_PRESTIGE' && platform.originalCommissions.some(item => item.status === 'RELEASED') ? 0.008
            : mandate === 'BALANCED' ? 0.0015 : 0,
        playbackBoost: mandate === 'TECHNOLOGY_LEADERSHIP' ? 0.18
            : mandate === 'TRUST_AND_RESILIENCE' ? 0.08
                : mandate === 'BALANCED' ? 0.03 : 0,
    };
};

const rebaseAbsoluteWeeks = (value: unknown, offset: number, key = ''): unknown => {
    if (Array.isArray(value)) return value.map(item => rebaseAbsoluteWeeks(item, offset));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => (
            [childKey, rebaseAbsoluteWeeks(childValue, offset, childKey)]
        )));
    }
    if (
        typeof value === 'number'
        && Number.isFinite(value)
        && (key === 'absoluteWeek' || key.endsWith('AbsoluteWeek'))
    ) {
        return Math.max(0, value - offset);
    }
    return value;
};

export const rebaseOwnedStreamingPlatformForLegacy = (
    platformValue: OwnedStreamingPlatformState,
    fromAbsoluteWeek: number,
    toAbsoluteWeek: number,
): OwnedStreamingPlatformState => {
    const offset = Math.max(0, fromAbsoluteWeek - toAbsoluteWeek);
    if (!offset) return platformValue;
    const rebased = rebaseAbsoluteWeeks(platformValue, offset) as OwnedStreamingPlatformState;
    return {
        ...rebased,
        processedWeekKeys: [],
        weeklyDecisions: [],
        growthActions: [],
        lastAcknowledgedWeeklyReportAbsoluteWeek: rebased.lastProcessedAbsoluteWeek,
    };
};

export const handoffOwnedStreamingPlatformToHeir = (
    parent: Player,
    heir: Pick<Relationship, 'id' | 'name'>,
    heirAge: number,
    heirWeek: number,
): OwnedStreamingPlatformState => {
    const parentPlatform = normalizeOwnedStreamingPlatformState(parent.ownedStreamingPlatform, parent.id);
    if (!parentPlatform.identity) return parentPlatform;
    const parentWeek = getAbsoluteWeek(parent.age, parent.currentWeek);
    const heirAbsoluteWeek = getAbsoluteWeek(heirAge, heirWeek);
    const rebased = normalizeOwnedStreamingPlatformState(
        rebaseOwnedStreamingPlatformForLegacy(parentPlatform, parentWeek, heirAbsoluteWeek),
        parent.id,
    );
    const closedEra = buildClosedEra(parent, parentPlatform, parentWeek, 'GENERATION_HANDOFF');
    const handoffKey = `streaming-generation-handoff:${parent.id}:${heir.id}:${parentWeek}`;
    const handoffFact: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', parentPlatform.simulationSeed, handoffKey),
        idempotencyKey: handoffKey,
        absoluteWeek: heirAbsoluteWeek,
        type: 'GENERATION_HANDOFF',
        summary: `${heir.name} inherited the operating platform and opened a new family era.`,
        source: 'PLAYER_ACTION',
        metadata: { parentName: parent.name, heirName: heir.name, eraNumber: parentPlatform.legacy.currentEraNumber + 1 },
    };
    return compactOwnedStreamingPlatformForPersistence({
        ...rebased,
        leadership: {
            ...rebased.leadership,
            currentCeo: { holderType: 'FOUNDER', executiveId: null, sinceAbsoluteWeek: heirAbsoluteWeek },
        },
        legacy: {
            ...rebased.legacy,
            founderOfficeRole: 'FOUNDER_CEO',
            currentEraNumber: parentPlatform.legacy.currentEraNumber + 1,
            currentEraStartedAtAbsoluteWeek: heirAbsoluteWeek,
            currentMandate: parentPlatform.legacy.successionPlan?.candidateType === 'FAMILY_HEIR'
                && parentPlatform.legacy.successionPlan.candidateId === heir.id
                ? parentPlatform.legacy.successionPlan.mandate
                : 'BALANCED',
            successionPlan: null,
            closedEras: [
                ...rebased.legacy.closedEras,
                { ...(rebaseAbsoluteWeeks(closedEra, parentWeek - heirAbsoluteWeek) as OwnedStreamingCompanyEra) },
            ],
            endlessMode: true,
            transitionCount: rebased.legacy.transitionCount + 1,
        },
        eventLedger: [...rebased.eventLedger, handoffFact],
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
