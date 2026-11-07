/**
 * #242 (plan §25.4 Q2): the platform decides when it shows. Zeesh (2026-11-04): "Production house ka jab ek project me Netflix ko du to
 * wo Abhi tk at a moment active ho data the means visible to users but ab wo change hai , Netflix decide karega ki lab kiosk dikhana , same
 * what we gonna do with when we opt for a movie that is straight to platforms"; and (2026-11-05): "we do it in best way with best ui nad ux".
 *
 * The contract holds the week the platform's calendar picked. The player sees "Netflix decides, by Week X", then "With Netflix · date not
 * set", and 4 weeks before the premiere the platform names the date: a line in the activity log and news, no popup, because there is nothing
 * to decide. A commission follows the same words, from the week its slate entry appears.
 */
import type { Player } from '../types';
import { addActivityLog } from './activityLog';
import { gameWeekLabel } from './gameWeek';
import { getAbsoluteWeek } from './legacyLogic';

/** how far ahead of the premiere a platform names the date */
export const STREAMING_PREMIERE_NOTICE_WEEKS = 4;
/** the outside date in the contract, after the week its calendar picks */
export const STREAMING_PREMIERE_OUTSIDE_WEEKS = 4;

export type StreamingPremiereStage = 'DATE_NOT_SET' | 'DATED' | 'LIVE';

export interface StreamingPremiereStatus {
    platformId: string;
    platformName: string;
    stage: StreamingPremiereStage;
    /** null until the platform has named it */
    premiereWeek: number | null;
    /** the latest it can be */
    outsideWeek: number | null;
    weeksLeft: number | null;
    /** the status, on a card */
    label: string;
    /** one more line, under the timeline */
    line: string;
}

export const streamingPremiereNoticeWeek = (signedAtAbsoluteWeek: number, startsAtAbsoluteWeek: number) => (
    Math.max(signedAtAbsoluteWeek + 1, startsAtAbsoluteWeek - STREAMING_PREMIERE_NOTICE_WEEKS)
);

/** the offer's own words, before anything is signed */
export const streamingOfferPremiereWords = (platformName: string, proposedAbsoluteWeek: number | null | undefined, now?: number) => (
    proposedAbsoluteWeek
        ? `${platformName} decides, by ${gameWeekLabel(proposedAbsoluteWeek + STREAMING_PREMIERE_OUTSIDE_WEEKS, now)}`
        : `${platformName} decides`
);

const weeksWord = (weeks: number) => `${weeks} week${weeks === 1 ? '' : 's'}`;

const dated = (platformId: string, platformName: string, premiereWeek: number, now: number): StreamingPremiereStatus => ({
    platformId, platformName, stage: 'DATED', premiereWeek, outsideWeek: null, weeksLeft: premiereWeek - now,
    label: `${platformName} · ${gameWeekLabel(premiereWeek, now)}`,
    line: `${platformName} set the date. It premieres in ${weeksWord(premiereWeek - now)}.`,
});

const notSet = (platformId: string, platformName: string, outsideWeek: number | null, now: number): StreamingPremiereStatus => ({
    platformId, platformName, stage: 'DATE_NOT_SET', premiereWeek: null, outsideWeek, weeksLeft: null,
    label: `With ${platformName} · date not set`,
    line: outsideWeek !== null
        ? `${platformName} picks the week from its calendar, no later than ${gameWeekLabel(outsideWeek, now)}.`
        : `${platformName} picks the week from its calendar.`,
});

const live = (platformId: string, platformName: string, premiereWeek: number): StreamingPremiereStatus => ({
    platformId, platformName, stage: 'LIVE', premiereWeek, outsideWeek: null, weeksLeft: 0, label: `On ${platformName}`, line: `Streaming on ${platformName}.`,
});

const soldContracts = (player: Pick<Player, 'world'>) => Object.values(player.world?.streamingRightsContracts || {})
    .filter(contract => contract.status === 'ACTIVE' && contract.seller?.type === 'PLAYER_STUDIO' && Boolean(contract.buyer?.platformId));

/** where a title of yours stands with the platform that holds it; null if none does */
export const getStreamingPremiereStatus = (player: Player, projectId: string): StreamingPremiereStatus | null => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const contract = soldContracts(player)
        .filter(item => item.sourceProjectId === projectId)
        .sort((left, right) => left.startsAtAbsoluteWeek - right.startsAtAbsoluteWeek)[0];
    if (contract) {
        const { platformId, name } = contract.buyer;
        const starts = contract.startsAtAbsoluteWeek;
        /* #243 */
        if (contract.holdsForCinemaClose) return {
            platformId: platformId!, platformName: name, stage: 'DATE_NOT_SET', premiereWeek: null, outsideWeek: null, weeksLeft: null,
            label: `With ${name} · after cinemas close`,
            line: `It starts on ${name} the week after cinemas close.`,
        };
        if (now >= starts) return live(platformId!, name, starts);
        if (now >= streamingPremiereNoticeWeek(contract.signedAtAbsoluteWeek, starts)) return dated(platformId!, name, starts, now);
        return notSet(platformId!, name, starts + STREAMING_PREMIERE_OUTSIDE_WEEKS, now);
    }
    const offer = Object.values(player.world?.platformAiPlayerCommissionOffers || {}).find(item => item.canonicalProductionId === projectId && item.status === 'DELIVERED');
    if (!offer) return null;
    const plan = player.world?.platforms?.[offer.platformId]?.ai?.slate.find(item => item.id === offer.platformContentPlanId);
    const entry = plan?.releaseEntries?.[0];
    if (!entry) return notSet(offer.platformId, offer.platformName, null, now);
    return now >= entry.premiereAtAbsoluteWeek ? live(offer.platformId, offer.platformName, entry.premiereAtAbsoluteWeek) : dated(offer.platformId, offer.platformName, entry.premiereAtAbsoluteWeek, now);
};

const told = (player: Player, id: string, platformName: string, title: string, premiereWeek: number, now: number): Player => ({
    ...addActivityLog(player, `${platformName} dated "${title}" for ${gameWeekLabel(premiereWeek, now)}.`, 'positive'),
    news: [{
        id: `news_premiere_dated_${id}`,
        headline: `${platformName} dates ${title} for ${gameWeekLabel(premiereWeek, now)}`,
        subtext: `The title premieres on ${platformName} in ${weeksWord(premiereWeek - now)}.`,
        category: 'INDUSTRY' as const,
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'LOW' as const,
    }, ...(player.news || [])].slice(0, 80),
});

/** the week's close: a platform names a date when its notice comes up */
export const announceStreamingPremieres = (input: Player, absoluteWeek: number): Player => {
    let player = input;
    for (const contract of soldContracts(player)) {
        if (contract.startsAtAbsoluteWeek <= absoluteWeek || contract.holdsForCinemaClose) continue;
        if (streamingPremiereNoticeWeek(contract.signedAtAbsoluteWeek, contract.startsAtAbsoluteWeek) !== absoluteWeek) continue;
        player = told(player, contract.id, contract.buyer.name, contract.titleAtSigning, contract.startsAtAbsoluteWeek, absoluteWeek);
    }
    const offers = player.world?.platformAiPlayerCommissionOffers || {};
    for (const offer of Object.values(offers)) {
        if (offer.status !== 'DELIVERED' || offer.premiereAnnouncedAtAbsoluteWeek) continue;
        const plan = player.world?.platforms?.[offer.platformId]?.ai?.slate.find(item => item.id === offer.platformContentPlanId);
        const premiere = plan?.releaseEntries?.[0]?.premiereAtAbsoluteWeek;
        if (premiere === undefined) continue;
        const marked: Player = {
            ...player,
            world: { ...player.world, platformAiPlayerCommissionOffers: { ...player.world.platformAiPlayerCommissionOffers, [offer.id]: { ...offer, premiereAnnouncedAtAbsoluteWeek: absoluteWeek } } },
        };
        player = premiere > absoluteWeek ? told(marked, offer.id, offer.platformName, offer.title, premiere, absoluteWeek) : marked;
    }
    return player;
};
