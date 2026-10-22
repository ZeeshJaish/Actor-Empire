import { CINEMA_EXPOSURE_PROFILE as profile, CINEMA_ROLE_WEIGHTS } from './boxOfficeProfiles';
import type { CinemaCreditedPerson, CinemaExposureCohort, CinemaExposureEvent, CinemaExposureInput, CinemaExposureRecord,
    CinemaExposureResult, CinemaKnownInputs, CinemaWeekInput } from './boxOfficeTypes';

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const count = (value: number, label: string): number => {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`Invalid cinema ${label}`);
    return value;
};
const uniqueCast = (cast: readonly CinemaCreditedPerson[]): CinemaCreditedPerson[] => {
    const people = new Map<string, CinemaCreditedPerson>();
    for (const member of cast) {
        const roleWeight = CINEMA_ROLE_WEIGHTS[member.roleType] ?? 0;
        const existing = people.get(member.personId);
        if (member.personId && (!existing || roleWeight > existing.roleWeight)) people.set(member.personId, { ...member, roleWeight });
    }
    return [...people.values()].sort((a, b) => a.personId.localeCompare(b.personId));
};
const recognitionUnion = (values: number[]): number => {
    if (!values.length) return 0;
    const max = Math.max(...values);
    return max + (1 - max) * -Math.expm1(-(values.reduce((sum, v) => sum + v, 0) - max) * profile.incrementalCastOverlap);
};
const actorRecognition = (actor: CinemaCreditedPerson, cohort?: CinemaExposureCohort): number => {
    const evidence = cohort?.actors?.[actor.personId];
    const base = evidence ? clamp(evidence.recognition)
        : Math.pow(clamp(Math.max(actor.fame, (actor.stature || 0) * 0.5) / 100), 1.4) * profile.legacyRecognitionCeiling;
    const experiencedShare = cohort?.people ? clamp((evidence?.experiencedPeople || 0) / cohort.people) : 0;
    const favorite = Math.min(clamp(evidence?.favoriteFraction || 0), experiencedShare);
    return clamp(base + favorite * profile.favoriteRecognitionLift) * actor.roleWeight;
};
export const getCinemaRecognitionShare = (cast: readonly CinemaCreditedPerson[], studio: CinemaExposureInput['studio']): number => (
    recognitionUnion([...uniqueCast(cast).map(actor => actorRecognition(actor)),
        clamp(studio.releasedTitleCount / 8) * clamp(studio.prestige / 100) * 0.25])
);
const normalizedEvent = (event: CinemaExposureEvent): CinemaExposureEvent => {
    if (!event.id?.trim() || !event.titleId?.trim() || !event.channel?.trim()
        || !['ANNOUNCEMENT','PAID_CAMPAIGN','PROMOTION','LOCAL_DISCOVERY','STREAMING_CHANNEL','LEGACY_ESTIMATE'].includes(event.kind)) throw new Error('Invalid cinema exposure source');
    count(event.absoluteWeek, 'exposure week'); count(event.impressions, 'impressions');
    for (const value of [event.paidCostCents, event.actualFootfall, event.accessiblePeople]) if (value !== undefined) count(value, 'source amount');
    return { id: event.id, titleId: event.titleId, absoluteWeek: event.absoluteWeek, kind: event.kind, channel: event.channel, impressions: event.impressions,
        ...(event.countryIds !== undefined ? { countryIds: [...new Set(event.countryIds)].sort() } : {}),
        ...(event.paidCostCents !== undefined ? { paidCostCents: event.paidCostCents } : {}),
        ...(event.actualFootfall !== undefined ? { actualFootfall: event.actualFootfall } : {}),
        ...(event.accessiblePeople !== undefined ? { accessiblePeople: event.accessiblePeople } : {}),
        ...(event.sentiment !== undefined ? { sentiment: clamp(event.sentiment, -1, 1) } : {}),
        ...(event.recognitionShare !== undefined ? { recognitionShare: clamp(event.recognitionShare) } : {}),
        ...(event.impressionsEstimated !== undefined ? { impressionsEstimated: event.impressionsEstimated === true } : {}) };
};
const uniqueEvents = (events: readonly CinemaExposureEvent[]): CinemaExposureEvent[] => {
    const result = new Map<string, CinemaExposureEvent>();
    for (const raw of events) {
        const event = normalizedEvent(raw), existing = result.get(event.id);
        if (existing && JSON.stringify(existing) !== JSON.stringify(event)) throw new Error(`Conflicting cinema exposure source ${event.id}`);
        result.set(event.id, event);
    }
    return [...result.values()].sort((a, b) => a.absoluteWeek - b.absoluteWeek || a.id.localeCompare(b.id));
};

/** Pure population-bounded exposure. No seats, release footprint, wallets or ticket sales enter this calculation. */
export const buildCinemaExposure = (input: CinemaExposureInput): CinemaExposureResult => {
    count(input.absoluteWeek, 'week');
    const cast = uniqueCast(input.cast);
    const studioRecognition = clamp(input.studio.releasedTitleCount / 8) * clamp(input.studio.prestige / 100) * 0.25;
    const attentionPotential = Math.round(100 * clamp(recognitionUnion(cast.map(actor => actorRecognition(actor))) * 0.6
        + clamp(input.storyAttention / 100) * 0.2 + clamp(input.musicAttention / 100) * 0.1 + studioRecognition * 0.1));
    const cohortIds = new Set<string>();
    const cohorts = [...input.cohorts].sort((a, b) => a.id.localeCompare(b.id)).map(cohort => {
        if (!cohort.id || !cohort.countryId || cohortIds.has(cohort.id)) throw new Error('Invalid/duplicate cinema cohort identity');
        cohortIds.add(cohort.id);count(cohort.people, 'cohort population');
        const prior = Math.min(cohort.people, count(cohort.priorAwarePeople ?? 0, 'prior awareness'));
        return { cohortId: cohort.id, countryId: cohort.countryId, people: cohort.people, awarePeople: prior, newlyAwarePeople: 0 };
    });
    count(cohorts.reduce((sum, row) => sum + row.people, 0), 'total population');
    const evidenceById = new Map(input.cohorts.map(c => [c.id, c]));
    const events = uniqueEvents(input.events);
    if (events.some(event => event.titleId !== input.titleId)) throw new Error('Exposure belongs to a different cinema title');
    const applied = new Set(input.appliedEventIds || []);
    const recognitionApplied = new Set(cohorts.filter(row => events.some(event => event.kind === 'ANNOUNCEMENT' && applied.has(event.id)
        && (!event.countryIds || event.countryIds.includes(row.countryId)))).map(row => row.cohortId));
    const sources: CinemaExposureResult['sources'] = [];
    for (const event of events) {
        if (event.absoluteWeek > input.absoluteWeek || applied.has(event.id)) continue;
        const rows = cohorts.filter(row => !event.countryIds || event.countryIds.includes(row.countryId));
        const eligible = rows.reduce((sum, row) => sum + row.people, 0);
        let impressions = event.impressions;
        if (event.kind === 'LOCAL_DISCOVERY') impressions = Math.min(impressions, Math.floor((event.actualFootfall || 0) * profile.localFootfallDiscovery));
        if (event.kind === 'STREAMING_CHANNEL') impressions = Math.min(impressions, event.accessiblePeople || 0);
        if ((event.kind === 'PAID_CAMPAIGN' && !event.paidCostCents) || event.kind === 'LEGACY_ESTIMATE') impressions = 0;
        let qualifiedImpressions = 0, newlyAwarePeople = 0;
        for (const row of rows) {
            const cohort = evidenceById.get(row.cohortId)!;
            let qualified = eligible ? impressions * row.people / eligible : 0;
            if (event.kind === 'ANNOUNCEMENT' && !recognitionApplied.has(row.cohortId)) {
                const trust = cohort.people ? clamp((cohort.studioTrust?.experiencedPeople || 0) / cohort.people) * clamp(cohort.studioTrust?.strength || 0) : 0;
                const recognition = event.recognitionShare ?? recognitionUnion([...cast.map(actor => actorRecognition(actor, cohort)), studioRecognition, trust * profile.studioTrustReach]);
                qualified += row.people * recognition * profile.announcementRecognitionReach;
                recognitionApplied.add(row.cohortId);
            }
            const wholeImpressions = Math.floor(qualified);
            qualifiedImpressions = count(qualifiedImpressions + wholeImpressions, 'qualified impressions');
            const growth = row.people ? Math.floor((row.people - row.awarePeople) * -Math.expm1(-wholeImpressions / row.people)) : 0;
            row.awarePeople += growth;row.newlyAwarePeople += growth;newlyAwarePeople += growth;
        }
        applied.add(event.id);
        sources.push({ eventId: event.id, kind: event.kind, qualifiedImpressions, newlyAwarePeople,
            estimated: event.kind === 'LEGACY_ESTIMATE' || event.impressionsEstimated === true });
    }
    return { attentionPotential, awarePeople: cohorts.reduce((n, c) => n + c.awarePeople, 0),
        newlyAwarePeople: cohorts.reduce((n, c) => n + c.newlyAwarePeople, 0), cohorts, sources,
        appliedEventIds: [...applied].sort(), recognitionEstimated: studioRecognition > 0 || events.some(e => e.kind === 'ANNOUNCEMENT' && e.recognitionShare !== undefined)
            || input.cohorts.some(c => cast.some(a => !c.actors?.[a.personId])) };
};

export const readCinemaExposureRecord = (source: { cinemaExposure?: CinemaExposureRecord; hiddenStats?: { rawHype?: number } }): CinemaExposureRecord => (
    source.cinemaExposure ? { version: 1, attentionPotential: clamp(source.cinemaExposure.attentionPotential, 0, 100),
        attentionBasis: source.cinemaExposure.attentionBasis, storyAttention: clamp(source.cinemaExposure.storyAttention || 0, 0, 100),
        musicAttention: clamp(source.cinemaExposure.musicAttention || 0, 0, 100), events: uniqueEvents(source.cinemaExposure.events) }
        : { version: 1, attentionPotential: clamp(source.hiddenStats?.rawHype || 0, 0, 100), attentionBasis: 'LEGACY_ESTIMATE', storyAttention: 0, musicAttention: 0, events: [] }
);
export const appendCinemaExposureEvent = (source: Parameters<typeof readCinemaExposureRecord>[0], event: CinemaExposureEvent): CinemaExposureRecord => {
    const record = readCinemaExposureRecord(source);
    return { ...record, events: uniqueEvents([...record.events, event]) };
};

/** Explicit whitelist: observed final quality and unknown future observed fields cannot cross this boundary. */
export const projectCinemaForecastInput = (input: CinemaWeekInput, known: CinemaKnownInputs): CinemaWeekInput => ({
    absoluteWeek: count(input.absoluteWeek, 'forecast week'), seed: input.seed, tuningVersion: input.tuningVersion, knowledge: 'FORECAST',
    cohorts: structuredClone(known.cohorts),
    countries: structuredClone(input.countries), supply: structuredClone(input.supply),
    marketState: structuredClone(input.marketState), history: structuredClone(input.history),
    titles: known.titles.map(title => {
        const [low, high] = title.delivery.qualityRange;
        if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high > 100 || low > high) throw new RangeError('Invalid visible cinema quality range');
        return { id: title.id, owner: { ...title.owner }, projectType: title.projectType, genre: title.genre, budgetCents: title.budgetCents,
            cast: uniqueCast(title.cast).map(person => ({ personId: person.personId, name: person.name, roleType: person.roleType, roleWeight: person.roleWeight,
                fame: person.fame, stature: person.stature, isPlayer: person.isPlayer, characterIds: [...person.characterIds] })),
            directorId: title.directorId, playerCredited: title.playerCredited,
            ...(title.market ? {market:{releaseWeek:title.market.releaseWeek,runtimeMinutes:title.market.runtimeMinutes,languages:[...title.market.languages],
                countryIds:[...title.market.countryIds],chainIds:[...title.market.chainIds],format:title.market.format,
                universeId:title.market.universeId,returningCharacterIds:title.market.returningCharacterIds ? [...title.market.returningCharacterIds] : undefined,
                payoff:title.market.payoff,accessibility:title.market.accessibility,urgency:title.market.urgency,
                ...(title.market.streamingWindow ? {streamingWindow:structuredClone(title.market.streamingWindow)} : {})}} : {}),
            ...(title.exposure ? { exposure: readCinemaExposureRecord({ cinemaExposure: title.exposure }) } : {}),
            delivery: { estimatedQuality: clamp(title.delivery.estimatedQuality ?? (low + high) / 2, low, high), qualityRange: [low, high],
                scriptQuality: clamp(title.delivery.scriptQuality, 0, 100), directorQuality: clamp(title.delivery.directorQuality, 0, 100),
                castingStrength: clamp(title.delivery.castingStrength, 0, 100) } };
    }),
});
