/**
 * #244 (plan §25.4 Q3): one answer to "where does this title stream?", read from both directions: nowhere, on your service, exclusive with an
 * outside platform, or shared. Zeesh (2026-11-05): "we do it". Filmography, the wizard and Bring it across all read this, so a title can never
 * be put on your service while a buyer holds it, or sold outside while it is on your service, without the game saying so in plain words.
 */
import type { Player } from '../types';
import { gameWeekLabel } from './gameWeek';
import { getAbsoluteWeek } from './legacyLogic';
import { getOwnedPlatformPackageCountryIds } from './streamingContentAvailability';

export type StreamingTitlePlacementKind = 'NOWHERE' | 'YOURS' | 'EXCLUSIVE_OUTSIDE' | 'SHARED' | 'THEIRS';

export interface StreamingTitleOutsideWindow {
    contractId: string;
    platformName: string;
    exclusive: boolean;
    startsAt: number;
    /** null for a sale for good */
    expiresAt: number | null;
    /** it leaves some of the player's markets free */
    partial: boolean;
}

export interface StreamingTitlePlacement {
    kind: StreamingTitlePlacementKind;
    /** the player's service, while it is live */
    serviceName: string | null;
    onYours: boolean;
    /** #252: sent to the service, no premiere set: not live until it is scheduled in Content */
    onShelf: boolean;
    /** a week still ahead on the slate, or the week it premiered */
    yourPremiereWeek: number | null;
    /** it goes on your service the week after cinemas close */
    afterCinema: boolean;
    inCinemas: boolean;
    isOriginal: boolean;
    outside: StreamingTitleOutsideWindow[];
    /** the one line a screen shows */
    line: string;
    mayPutOnYours: boolean;
    whyNotOnYours: string | null;
    maySellOutside: boolean;
    whyNotSellOutside: string | null;
    /** only a studio title on the shelves or planned for after cinemas; never an Original or a title still in production */
    mayPull: boolean;
}

const holderWords = (window: StreamingTitleOutsideWindow, now: number) => (window.expiresAt === null
    ? `${window.platformName} holds it for good`
    : `${window.platformName} holds it until ${gameWeekLabel(window.expiresAt, now)}`);

export const getStreamingTitlePlacement = (player: Player, projectId: string): StreamingTitlePlacement => {
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const platform = player.ownedStreamingPlatform;
    const serviceName = platform?.lifecycle === 'ACTIVE' ? platform.identity?.name || 'your service' : null;
    const service = serviceName || 'your service';
    const isOriginal = (platform?.originalCommissions || []).some(commission => commission.canonicalProjectId === projectId);
    const onYours = isOriginal || (platform?.catalogProjectIds || []).includes(projectId);
    const launchAt = platform?.launchCommit?.committedAtAbsoluteWeek;
    const entry = platform?.launchSlate?.entries.find(item => item.projectId === projectId);
    const yourPremiereWeek = entry && launchAt !== undefined ? launchAt + entry.launchWeek - 1 : null;
    const onShelf = Boolean(serviceName) && onYours && !isOriginal && !entry
        && !(platform?.catalogLicenses || []).some(licence => licence.sourceProjectId === projectId && licence.status === 'ACTIVE');
    const airing = onYours && !onShelf;
    const release = (player.activeReleases || []).find(item => item.id === projectId);
    const inCinemas = release?.distributionPhase === 'THEATRICAL';
    const afterCinema = inCinemas && Boolean(release?.projectDetails?.hiddenStats?.ownPlatformAfterCinema);
    /* #253: a title sent before the choice existed was told "the week after" */
    const afterCinemaWeeks = release?.projectDetails?.hiddenStats?.ownPlatformAfterCinemaWeeks ?? 1;
    const planned = (player.commitments || []).some(item => item.id === projectId && Boolean(item.projectDetails?.hiddenStats?.ownPlatformRelease));
    const released = Boolean(release) || (player.pastProjects || []).some(item => item.id === projectId);
    const markets = platform ? getOwnedPlatformPackageCountryIds(platform) : [];
    const outside: StreamingTitleOutsideWindow[] = Object.values(player.world?.streamingRightsContracts || {})
        .filter(contract => contract.sourceProjectId === projectId && contract.status === 'ACTIVE' && contract.buyer?.type !== 'PLAYER_PLATFORM' && Boolean(contract.buyer?.platformId))
        .map(contract => {
            const forGood = Boolean(contract.permanentPurchase) || contract.windowType === 'PERMANENT';
            return {
                contractId: contract.id, platformName: contract.buyer.name, exclusive: contract.exclusivity === 'EXCLUSIVE',
                startsAt: contract.startsAtAbsoluteWeek, expiresAt: forGood ? null : contract.expiresAtAbsoluteWeek,
                partial: contract.territory !== 'GLOBAL' && (contract.countryIds || []).length > 0 && !markets.every(id => contract.countryIds!.includes(id)),
            };
        })
        .filter(window => window.expiresAt === null || window.expiresAt > now)
        .sort((left, right) => left.startsAt - right.startsAt);
    const exclusive = outside.find(window => window.exclusive && !window.partial);
    const commission = Object.values(player.world?.platformAiPlayerCommissionOffers || {})
        .find(offer => offer.canonicalProductionId === projectId && (offer.status === 'ACCEPTED' || offer.status === 'DELIVERED'));
    const theirs = commission ? `${commission.platformName} owns it. You made it for them.` : null;
    const held = exclusive ? holderWords(exclusive, now) : null;

    const kind: StreamingTitlePlacementKind = theirs ? 'THEIRS'
        : exclusive ? 'EXCLUSIVE_OUTSIDE'
            : outside.length ? 'SHARED'
                : onYours || afterCinema ? 'YOURS' : 'NOWHERE';
    const yoursWords = afterCinema
        ? afterCinemaWeeks === 0 ? `On your ${service} shelf after cinemas close`
            : afterCinemaWeeks === 1 ? `On ${service} the week after cinemas close`
                : `On ${service} ${afterCinemaWeeks} weeks after cinemas close`
        : onShelf ? `On your ${service} shelf. Not live yet.`
        : yourPremiereWeek !== null && yourPremiereWeek > now ? `On ${service} from ${gameWeekLabel(yourPremiereWeek, now)}`
            : `On ${service}`;
    const line = kind === 'THEIRS' ? theirs!
        : kind === 'EXCLUSIVE_OUTSIDE' ? (airing ? `${held}. Back on ${service} after that.` : `${held}.`)
            : kind === 'SHARED' ? `Shared: ${[...new Set(outside.map(window => (window.partial ? `${window.platformName} in some markets` : window.platformName))), ...(airing ? [service] : [])].join(', ')}`
                : kind === 'YOURS' ? yoursWords
                    : inCinemas ? 'In cinemas. Not streaming yet.' : 'Not streaming anywhere.';

    const whyNotOnYours = !serviceName ? 'Your service is not live.'
        : theirs || (isOriginal ? `It is a ${service} Original.` : null)
        || (onYours || afterCinema ? `It is already on ${service}.` : null)
        || (held ? `${held}.` : null)
        || (inCinemas && outside.length ? 'It is already sold for after cinemas.' : null)
        || (!released && !inCinemas ? 'It has not been released yet.' : null);
    const whyNotSellOutside = theirs
        || (isOriginal ? `It is a ${service} Original.` : null)
        || (onYours || afterCinema || planned ? `It is on ${service}. Pull it off first.` : null)
        || (held ? `${held}.` : null);

    return {
        kind, serviceName, onYours, onShelf, yourPremiereWeek, afterCinema, inCinemas, isOriginal, outside, line,
        mayPutOnYours: !whyNotOnYours, whyNotOnYours,
        maySellOutside: !whyNotSellOutside, whyNotSellOutside,
        mayPull: Boolean(serviceName) && !isOriginal && !planned && (afterCinema || onYours),
    };
};
