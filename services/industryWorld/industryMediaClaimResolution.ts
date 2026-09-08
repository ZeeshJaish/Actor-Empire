import type {
    IndustryEventFact,
    IndustryMediaClaim,
    IndustryMediaClaimStatus,
    IndustryMediaInstitution,
    IndustryMediaPersonality,
    IndustryMediaSourceRecord,
    Player,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

type TerminalClaimStatus = Exclude<IndustryMediaClaimStatus, 'OPEN'>;

export interface IndustryMediaSourceRecordAdvance {
    record: IndustryMediaSourceRecord;
    delta: number;
}

export interface IndustryMediaClaimResolutionResult {
    player: Player;
    resolvedClaims: IndustryMediaClaim[];
}

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, Math.round(value)))
);

const sourceDelta = (
    claim: IndustryMediaClaim,
    institution: IndustryMediaInstitution,
    status: TerminalClaimStatus,
): number => {
    if (status === 'CONFIRMED') return claim.kind === 'LEAK' ? 5 : claim.kind === 'PREDICTION' ? 3 : 4;
    if (status === 'PARTLY_CONFIRMED') return claim.kind === 'LEAK' ? 2 : 1;
    if (status === 'REFUTED') {
        const base = claim.kind === 'LEAK' ? -4 : claim.kind === 'RUMOUR' ? -3 : -2;
        return Math.max(-8, base - (institution.sensationalism >= 75 ? 2 : 0));
    }
    return 0;
};

export const advanceIndustryMediaSourceRecord = (
    existing: IndustryMediaSourceRecord | undefined,
    claim: IndustryMediaClaim,
    personality: IndustryMediaPersonality | undefined,
    institution: IndustryMediaInstitution,
    status: TerminalClaimStatus,
    absoluteWeek: number,
): IndustryMediaSourceRecordAdvance => {
    const sourceId = personality?.id || institution.id;
    const baseline = personality?.credibility ?? institution.credibility;
    const fallback: IndustryMediaSourceRecord = {
        schemaVersion: 1,
        id: createDeterministicId('industry_media_source_record', sourceId, claim.category),
        sourceId,
        institutionId: institution.id,
        ...(personality ? { personalityId: personality.id } : {}),
        category: claim.category,
        calls: 0,
        confirmed: 0,
        partlyConfirmed: 0,
        refuted: 0,
        expired: 0,
        reliability: baseline,
        currentStreak: 0,
        lastResolvedAbsoluteWeek: -1,
        recentClaimIds: [],
    };
    const current = existing || fallback;
    if (current.recentClaimIds.includes(claim.id)) return { record: current, delta: 0 };
    const countsAsCall = status !== 'SUPERSEDED';
    const delta = sourceDelta(claim, institution, status);
    const streak = status === 'CONFIRMED' || status === 'PARTLY_CONFIRMED'
        ? Math.max(1, current.currentStreak + 1)
        : status === 'REFUTED' ? Math.min(-1, current.currentStreak - 1) : 0;
    return {
        delta,
        record: {
            ...current,
            calls: current.calls + (countsAsCall ? 1 : 0),
            confirmed: current.confirmed + (status === 'CONFIRMED' ? 1 : 0),
            partlyConfirmed: current.partlyConfirmed + (status === 'PARTLY_CONFIRMED' ? 1 : 0),
            refuted: current.refuted + (status === 'REFUTED' ? 1 : 0),
            expired: current.expired + (status === 'EXPIRED_UNVERIFIED' ? 1 : 0),
            reliability: clamp(current.reliability + delta, 0, 100),
            currentStreak: clamp(streak, -20, 20),
            lastResolvedAbsoluteWeek: Math.round(absoluteWeek),
            recentClaimIds: [...current.recentClaimIds.filter(id => id !== claim.id), claim.id].slice(-16),
        },
    };
};

const sameSubject = (claim: IndustryMediaClaim, event: IndustryEventFact): boolean => {
    if (claim.target.projectId && event.projectId !== claim.target.projectId) return false;
    if (claim.target.companyId && !claim.target.projectId) {
        const eventCompany = event.companyId || event.platformId;
        if (eventCompany !== claim.target.companyId) return false;
    }
    return true;
};

const evidenceIds = (event: IndustryEventFact, kind: IndustryEventFact['evidence'][number]['kind']): string[] => (
    event.evidence.filter(item => item.kind === kind).map(item => item.id)
);

const decisionFor = (
    claim: IndustryMediaClaim,
    event: IndustryEventFact,
): { status: TerminalClaimStatus; explanation: string } | null => {
    if (!sameSubject(claim, event)) return null;
    const expected = claim.target.expectedEventTypes.includes(event.type);
    if (claim.category === 'CASTING') {
        if (event.type === 'PROJECT_CANCELLED') return { status: 'SUPERSEDED', explanation: 'The project was cancelled before the casting report could be resolved.' };
        if (event.type !== 'PROJECT_CAST') return null;
        const talentIds = evidenceIds(event, 'TALENT');
        if (claim.target.talentId && talentIds.includes(claim.target.talentId)) return { status: 'CONFIRMED', explanation: 'The later canonical cast announcement matched the reported talent.' };
        const leadWasAnnounced = event.evidence.some(item => item.kind === 'TALENT' && String(item.metric || '').toUpperCase() === 'LEAD');
        return leadWasAnnounced ? { status: 'REFUTED', explanation: 'The canonical lead casting contradicted the reported talent.' } : null;
    }
    if (claim.category === 'PROJECT_OUTCOME') {
        if (!['PROJECT_HIT', 'PROJECT_FLOP', 'PROJECT_SLEEPER'].includes(event.type)) return null;
        return expected
            ? { status: 'CONFIRMED', explanation: 'The canonical release outcome matched the prediction.' }
            : { status: 'REFUTED', explanation: 'The canonical release outcome contradicted the prediction.' };
    }
    if (claim.category === 'RELEASE_WINDOW') {
        if (event.type === 'PROJECT_CANCELLED') return { status: 'SUPERSEDED', explanation: 'Cancellation superseded the predicted release window.' };
        if (!['PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED'].includes(event.type) || claim.target.expectedAbsoluteWeek === undefined) return null;
        const distance = Math.abs(event.absoluteWeek - claim.target.expectedAbsoluteWeek);
        const tolerance = Math.max(0, claim.target.toleranceWeeks || 0);
        if (distance <= tolerance) return { status: 'CONFIRMED', explanation: 'The canonical release timing landed inside the predicted window.' };
        if (distance <= Math.max(tolerance + 1, tolerance * 2)) return { status: 'PARTLY_CONFIRMED', explanation: 'The release happened close to, but outside, the predicted window.' };
        return { status: 'REFUTED', explanation: 'The canonical release timing fell outside the predicted window.' };
    }
    if (claim.category === 'PLATFORM_DESTINATION') {
        if (event.type === 'PROJECT_CANCELLED') return { status: 'SUPERSEDED', explanation: 'Cancellation superseded the platform-destination claim.' };
        if (!['RIGHTS_DEAL', 'RIGHTS_TRANSFER'].includes(event.type)) return null;
        if (claim.target.platformId && event.platformId !== claim.target.platformId) return { status: 'REFUTED', explanation: 'The canonical rights deal named a different platform.' };
        const expectedCountries = claim.target.expectedCountryIds || [];
        if (!expectedCountries.length) return { status: 'CONFIRMED', explanation: 'The canonical rights deal matched the predicted platform.' };
        const actualCountries = new Set(evidenceIds(event, 'COUNTRY'));
        const matches = expectedCountries.filter(countryId => actualCountries.has(countryId)).length;
        if (matches === expectedCountries.length) return { status: 'CONFIRMED', explanation: 'The platform and complete predicted market scope matched.' };
        if (matches > 0) return { status: 'PARTLY_CONFIRMED', explanation: 'The platform matched, but only part of the predicted market scope did.' };
        return { status: 'REFUTED', explanation: 'The canonical rights scope did not match the prediction.' };
    }
    if (claim.category === 'PROJECT_STATUS') {
        if (expected) return { status: 'CONFIRMED', explanation: 'The later canonical project status matched the report.' };
        if (event.type === 'PROJECT_CANCELLED') return { status: 'REFUTED', explanation: 'The project was cancelled instead of reaching the predicted status.' };
        if (event.type === 'PROJECT_SOLD') return { status: 'SUPERSEDED', explanation: 'A project sale transferred the decision before the prediction could resolve.' };
        return null;
    }
    if (claim.category === 'FRANCHISE_DIRECTION') {
        if (event.type === 'PROJECT_CANCELLED') return { status: 'SUPERSEDED', explanation: 'Cancellation superseded the expected franchise continuation.' };
        if (event.type !== 'FRANCHISE_DECISION') return null;
        const universes = evidenceIds(event, 'UNIVERSE');
        if (claim.target.universeId && universes.length && !universes.includes(claim.target.universeId)) return { status: 'REFUTED', explanation: 'The canonical franchise decision concerned a different universe.' };
        return { status: 'CONFIRMED', explanation: 'A canonical franchise decision matched the continuation report.' };
    }
    if (claim.category === 'AWARDS') {
        if (event.type !== 'AWARD_WON') return null;
        return { status: 'CONFIRMED', explanation: 'The canonical award result matched the prediction.' };
    }
    if (claim.category === 'COMPANY_MOVE') {
        if (!event.type.startsWith('COMPANY_') || ['COMPANY_DISTRESS', 'COMPANY_PROMOTED', 'COMPANY_LAUNCHED'].includes(event.type)) return null;
        return expected
            ? { status: 'CONFIRMED', explanation: 'The company took the predicted canonical action.' }
            : { status: 'REFUTED', explanation: 'The company took a different canonical action.' };
    }
    return null;
};

export const resolveIndustryMediaClaims = (
    player: Player,
    absoluteWeek: number,
): IndustryMediaClaimResolutionResult => {
    const media = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const ledger = normalizeIndustryEventLedger(player.world?.industryEvents);
    const institutions = new Map(media.institutions.map(item => [item.id, item]));
    const personalities = new Map(media.personalities.map(item => [item.id, item]));
    const sourceRecords = [...media.sourceRecords];
    const processedClaimKeys = [...media.processedClaimKeys];
    const resolvedIds = new Set<string>();
    let playerReputationDelta = 0;
    let playerControversyDelta = 0;
    const claims = media.claims.map(claim => {
        if (claim.status !== 'OPEN' || absoluteWeek < claim.earliestResolutionAbsoluteWeek) return claim;
        const candidates = ledger.events
            .filter(event => event.absoluteWeek >= claim.earliestResolutionAbsoluteWeek && event.absoluteWeek <= absoluteWeek)
            .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id));
        let decision: ReturnType<typeof decisionFor> = null;
        let decisionEvent: IndustryEventFact | undefined;
        for (const event of candidates) {
            decision = decisionFor(claim, event);
            if (decision) { decisionEvent = event; break; }
        }
        if (!decision && absoluteWeek >= claim.expiryAbsoluteWeek) {
            decision = { status: 'EXPIRED_UNVERIFIED', explanation: 'The claim was never substantiated within its verification window.' };
        }
        if (!decision) return { ...claim, lastEvaluatedAbsoluteWeek: absoluteWeek };
        const resolveKey = `c6:resolved:${claim.id}:${decision.status}:${decisionEvent?.id || claim.expiryAbsoluteWeek}`;
        if (processedClaimKeys.includes(resolveKey)) return claim;
        const institution = institutions.get(claim.institutionId);
        const personality = claim.personalityId ? personalities.get(claim.personalityId) : undefined;
        if (!institution) return claim;
        const sourceId = personality?.id || institution.id;
        const existingIndex = sourceRecords.findIndex(record => record.sourceId === sourceId && record.category === claim.category);
        const advanced = advanceIndustryMediaSourceRecord(
            existingIndex >= 0 ? sourceRecords[existingIndex] : undefined,
            claim,
            personality,
            institution,
            decision.status,
            absoluteWeek,
        );
        if (existingIndex >= 0) sourceRecords[existingIndex] = advanced.record;
        else sourceRecords.push(advanced.record);
        const response = claim.responseId
            ? media.playerResponses.find(item => item.id === claim.responseId)
            : undefined;
        let playerCredibilityApplied = false;
        if (response && claim.playerRelated && ['CLARIFY', 'CHALLENGE', 'HUMOUR'].includes(response.tone)) {
            const defended = response.tone === 'CLARIFY' || response.tone === 'CHALLENGE';
            if (decision.status === 'REFUTED') {
                playerReputationDelta += defended ? 2 : 1;
                playerControversyDelta -= defended ? 1 : 0;
                playerCredibilityApplied = true;
            } else if (decision.status === 'CONFIRMED') {
                playerReputationDelta -= defended ? 2 : 1;
                playerControversyDelta += defended ? 3 : 1;
                playerCredibilityApplied = true;
            } else if (decision.status === 'PARTLY_CONFIRMED') {
                playerReputationDelta -= defended ? 1 : 0;
                playerControversyDelta += defended ? 1 : 0;
                playerCredibilityApplied = defended;
            }
        }
        processedClaimKeys.push(resolveKey);
        resolvedIds.add(claim.id);
        return {
            ...claim,
            status: decision.status,
            lastEvaluatedAbsoluteWeek: absoluteWeek,
            resolution: {
                status: decision.status,
                absoluteWeek,
                eventIds: decisionEvent ? [decisionEvent.id] : [],
                explanation: decision.explanation,
                sourceReliabilityDelta: advanced.delta,
                ...(playerCredibilityApplied ? { playerCredibilityApplied: true } : {}),
            },
        };
    });
    const nextMedia = normalizeIndustryMediaWorld({ ...media, claims, sourceRecords, processedClaimKeys });
    const nextPlayer: Player = {
        ...player,
        stats: playerReputationDelta ? {
            ...player.stats,
            reputation: clamp(player.stats.reputation + playerReputationDelta, 0, 100),
        } : player.stats,
        instagram: playerControversyDelta ? {
            ...player.instagram,
            controversy: clamp((player.instagram.controversy || 0) + playerControversyDelta, 0, 100),
        } : player.instagram,
        world: { ...player.world, industryMedia: nextMedia },
    };
    return {
        player: nextPlayer,
        resolvedClaims: nextMedia.claims.filter(claim => resolvedIds.has(claim.id)),
    };
};
