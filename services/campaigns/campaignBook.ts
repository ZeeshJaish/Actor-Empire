/**
 * A saved campaign book, checked (#145). Anything malformed is dropped rather than repaired; the numbers are bounded.
 * Kept apart from the engine and the adapter so the platform's own normalizer can use it without a cycle.
 */
import type { Campaign, CampaignBook, CampaignBudget, CampaignFormatId, CampaignWeek } from '../../types';
import { CAMPAIGN_FORMATS } from './campaignFormats';
import { CAMPAIGN_EXTENDED_WEEKS, CAMPAIGN_STRENGTHS } from './campaignEngine';

const SUBJECTS = new Set(['SERVICE', 'TITLE', 'UNIVERSE', 'FRANCHISE']);
const WHERE = new Set(['LIVE', 'REGION', 'COUNTRIES']);
const STATUS = new Set(['RUNNING', 'PAUSED', 'FINISHED', 'STOPPED']);
const END = new Set(['SPENT', 'DONE', 'STOPPED']);

const num = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []);

const budgetOf = (value: any): CampaignBudget | null => {
    if (!value || typeof value !== 'object') return null;
    if (value.kind === 'BURST') {
        const total = num(value.total);
        const weeks = num(value.weeks, 1, 6);
        return total !== null && weeks !== null ? { kind: 'BURST', total, weeks: Math.round(weeks) } : null;
    }
    if (value.kind === 'POT') {
        const total = num(value.total);
        const weekly = value.weekly === null || value.weekly === undefined ? null : num(value.weekly);
        return total !== null ? { kind: 'POT', total, weekly } : null;
    }
    if (value.kind === 'ALWAYS_ON') {
        const monthly = num(value.monthly);
        return monthly !== null ? { kind: 'ALWAYS_ON', monthly } : null;
    }
    if (value.kind === 'WEEKS') {
        /* #154: 1–52 weeks; how hard is the nearest of 1, 1.5 and 2 */
        const weeks = num(value.weeks, 1, CAMPAIGN_EXTENDED_WEEKS);
        const strength = num(value.strength, 0, 10) ?? 1;
        const nearest = CAMPAIGN_STRENGTHS.reduce<number>((best, option) => (Math.abs(option - strength) < Math.abs(best - strength) ? option : best), 1);
        return weeks !== null ? { kind: 'WEEKS', weeks: Math.round(weeks), strength: nearest } : null;
    }
    return null;
};

const weekOf = (value: any): CampaignWeek | null => {
    const absoluteWeek = num(value?.absoluteWeek);
    if (absoluteWeek === null) return null;
    return {
        absoluteWeek: Math.round(absoluteWeek), spend: num(value.spend) ?? 0, reach: num(value.reach) ?? 0,
        awareness: num(value.awareness, 0, 1) ?? 0, joins: num(value.joins) ?? 0, viewers: num(value.viewers) ?? 0,
        ...(value.paused === 'TREASURY' ? { paused: 'TREASURY' as const } : {}),
    };
};

const campaignOf = (value: any): Campaign | null => {
    if (!value || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
    const subject = value.subject;
    const budget = budgetOf(value.budget);
    const startedAtAbsoluteWeek = num(value.startedAtAbsoluteWeek);
    const formats = strings(value.formats).filter((id): id is CampaignFormatId => id in CAMPAIGN_FORMATS);
    if (!subject || !SUBJECTS.has(subject.kind) || typeof subject.id !== 'string' || !budget || startedAtAbsoluteWeek === null
        || !formats.length || !STATUS.has(value.status) || !value.where || !WHERE.has(value.where.kind)) return null;
    const countryIds = [...new Set(strings(value.countryIds))];
    const byCountry = value.byCountry && typeof value.byCountry === 'object'
        ? Object.fromEntries(Object.entries(value.byCountry as Record<string, any>).filter(([countryId, row]) => countryIds.includes(countryId) && row && typeof row === 'object')
            .map(([countryId, row]) => [countryId, { joins: Math.round(num(row.joins) ?? 0), viewers: Math.round(num(row.viewers) ?? 0) }]))
        : undefined;
    /* #154: a big moment's place: one of its countries, for one of its big moments */
    const places = value.places && typeof value.places === 'object'
        ? Object.fromEntries(Object.entries(value.places).filter(([key, countryId]) => formats.includes(key as CampaignFormatId)
            && CAMPAIGN_FORMATS[key as CampaignFormatId].group === 'BIG_MOMENT' && typeof countryId === 'string' && countryIds.includes(countryId)))
        : undefined;
    const creativeIds = value.creativeIds && typeof value.creativeIds === 'object'
        ? Object.fromEntries(Object.entries(value.creativeIds).filter(([key, id]) => key in CAMPAIGN_FORMATS && typeof id === 'string'))
        : undefined;
    return {
        id: value.id,
        name: value.name,
        subject: { kind: subject.kind, id: subject.id, name: String(subject.name || ''), projectIds: strings(subject.projectIds) },
        where: { kind: value.where.kind, ...(typeof value.where.regionId === 'string' ? { regionId: value.where.regionId } : {}) },
        countryIds,
        formats: [...new Set(formats)],
        budget,
        ...(places && Object.keys(places).length ? { places: places as Campaign['places'] } : {}),
        energy: num(value.energy, 0, 999) ?? 0,
        status: value.status,
        startedAtAbsoluteWeek: Math.round(startedAtAbsoluteWeek),
        endedAtAbsoluteWeek: value.endedAtAbsoluteWeek === null || value.endedAtAbsoluteWeek === undefined ? null : Math.round(num(value.endedAtAbsoluteWeek) ?? 0),
        ...(END.has(value.endReason) ? { endReason: value.endReason } : {}),
        spent: num(value.spent) ?? 0,
        toppedUp: num(value.toppedUp) ?? 0,
        weeks: (Array.isArray(value.weeks) ? value.weeks : []).map(weekOf).filter((week: CampaignWeek | null): week is CampaignWeek => Boolean(week)).slice(-26),
        ...(creativeIds && Object.keys(creativeIds).length ? { creativeIds: creativeIds as Campaign['creativeIds'] } : {}),
        ...(byCountry && Object.keys(byCountry).length ? { byCountry } : {}),
        ...(typeof value.pictureMediaId === 'string' && value.pictureMediaId ? { pictureMediaId: value.pictureMediaId } : {}),
        /* #160: paid in full when commissioned, and what came back */
        ...(typeof value.paid === 'number' && Number.isFinite(value.paid) ? { paid: Math.max(0, Math.round(value.paid)) } : {}),
        ...(typeof value.refunded === 'number' && Number.isFinite(value.refunded) && value.refunded > 0 ? { refunded: Math.round(value.refunded) } : {}),
        /* #167: who on the team started it */
        ...(value.runBy && typeof value.runBy.name === 'string' && value.runBy.name
            ? { runBy: { name: String(value.runBy.name).slice(0, 80), seatId: String(value.runBy.seatId || 'MARKETING').slice(0, 24) } } : {}),
    };
};

const awareness = (value: unknown): Record<string, number> => (value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value as Record<string, unknown>)
        .map(([key, level]) => [key, num(level, 0, 1)] as const)
        .filter((entry): entry is readonly [string, number] => entry[1] !== null && entry[1] > 0))
    : {});

export const normalizeCampaignBook = (value: unknown): CampaignBook => {
    const source = (value && typeof value === 'object' ? value : {}) as Partial<CampaignBook>;
    const campaigns = (Array.isArray(source.campaigns) ? source.campaigns : []).map(campaignOf)
        .filter((campaign): campaign is Campaign => Boolean(campaign));
    const seen = new Set<string>();
    return {
        schemaVersion: 1,
        campaigns: campaigns.filter(campaign => (seen.has(campaign.id) ? false : (seen.add(campaign.id), true))).slice(-60),
        serviceAwareness: awareness(source.serviceAwareness),
        titleAwareness: Object.fromEntries(Object.entries(source.titleAwareness && typeof source.titleAwareness === 'object' ? source.titleAwareness : {})
            .map(([projectId, countries]) => [projectId, awareness(countries)] as const)
            .filter(([, countries]) => Object.keys(countries).length > 0)),
        lastRunAbsoluteWeek: source.lastRunAbsoluteWeek === null || source.lastRunAbsoluteWeek === undefined ? null : Math.round(num(source.lastRunAbsoluteWeek) ?? 0),
    };
};
