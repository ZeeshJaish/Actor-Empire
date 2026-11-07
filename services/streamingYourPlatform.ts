/**
 * #244 (plan §25.4 Q3): your own film on your own service, on an internal deal: no bids and no fee. Selling it later asks you to pull it first.
 * #252: one door, on the rights floor beside the room. Zeesh (2026-11-05): "bid to platforms me jau and wha jab aata hai enter wat room or bid room
 * udhar ek aur button ho apne platofrm me bhejne ke". A released film goes on the shelves and is not live until it is scheduled in Content; a film
 * the wizard is releasing takes its date from the Calendar; a film in cinemas goes on the week after they close.
 */
import type { OwnedStreamingLedgerEntry, Player, ScheduledEvent } from '../types';
import { addActivityLog } from './activityLog';
import { createDeterministicId } from './deterministicRandom';
import { gameWeekLabel } from './gameWeek';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { resolveStreamingCatalogTitle } from './streamingCatalog';
import { linkContentMarketOwnedTitles } from './streamingContentMarket';
import { scheduleStreamingSlateTitle, STREAMING_SLATE_REFUSAL_COPY } from './streamingSlateProgramming';
import { getStreamingTitlePlacement } from './streamingTitlePlacement';

export interface YourPlatformResult { player: Player; changed: boolean; detail: string }

/** #253: the quick road for a film in cinemas: live by itself this many weeks after the run closes */
export const YOUR_SERVICE_AFTER_CINEMA_WEEKS = [1, 2, 4, 8] as const;
const weeksWords = (weeks: number) => (weeks === 1 ? 'the week' : `${weeks} weeks`);

/** on the shelves, and on the Slate for that week. All or nothing. */
export const placeTitleOnYourService = (input: Player, projectId: string, absoluteWeek: number): YourPlatformResult => {
    const linked = input.ownedStreamingPlatform.catalogProjectIds.includes(projectId)
        ? { player: input, changed: true, detail: '' }
        : linkContentMarketOwnedTitles(input, [projectId]);
    if (!linked.changed) return { player: input, changed: false, detail: linked.detail };
    const scheduled = scheduleStreamingSlateTitle(linked.player, { projectId, absoluteWeek, marketingPlan: 'STANDARD' });
    if (!scheduled.changed) return { player: input, changed: false, detail: STREAMING_SLATE_REFUSAL_COPY[scheduled.reason ?? 'UNKNOWN_TITLE'] };
    const name = linked.player.ownedStreamingPlatform.identity?.name || 'your service';
    return { player: scheduled.player, changed: true, detail: `It premieres on ${name} in ${gameWeekLabel(absoluteWeek, getAbsoluteWeek(input.age, input.currentWeek))}.` };
};

const withCinemaFlag = (player: Player, projectId: string, weeks: number | null): Player => ({
    ...player,
    activeReleases: player.activeReleases.map(release => {
        if (release.id !== projectId) return release;
        const { ownPlatformAfterCinema: _was, ownPlatformAfterCinemaWeeks: _weeks, ...hiddenStats } = release.projectDetails.hiddenStats;
        return { ...release, projectDetails: { ...release.projectDetails, hiddenStats: weeks !== null ? { ...hiddenStats, ownPlatformAfterCinema: true, ownPlatformAfterCinemaWeeks: weeks } : hiddenStats } };
    }),
});

/** from the rights floor. In cinemas it waits for the run to close, then takes the road chosen (#253); otherwise it goes on the shelves, and Content schedules it. */
export const sendTitleToYourService = (player: Player, projectId: string, afterCinemaWeeks = 0): YourPlatformResult => {
    const placement = getStreamingTitlePlacement(player, projectId);
    if (!placement.mayPutOnYours) return { player, changed: false, detail: placement.whyNotOnYours || 'It cannot go on your service now.' };
    if (placement.inCinemas) {
        const detail = afterCinemaWeeks > 0
            ? `It goes live on ${placement.serviceName} ${weeksWords(afterCinemaWeeks)} after cinemas close.`
            : `It goes on your ${placement.serviceName} shelf when cinemas close.`;
        const name = player.activeReleases.find(release => release.id === projectId)?.name || 'Your film';
        return { player: addActivityLog(withCinemaFlag(player, projectId, afterCinemaWeeks), `"${name}": ${detail}`), changed: true, detail };
    }
    const linked = linkContentMarketOwnedTitles(player, [projectId]);
    if (!linked.changed) return { player, changed: false, detail: linked.detail };
    const name = resolveStreamingCatalogTitle(linked.player, projectId)?.title || 'Your title';
    return {
        player: addActivityLog(linked.player, `"${name}" is on your ${placement.serviceName} shelf. Schedule it in Content.`),
        changed: true,
        detail: `It is on your ${placement.serviceName} shelf. Schedule it in Content.`,
    };
};

/** the way back. Selling outside asks for this first. */
export const pullTitleFromYourService = (player: Player, projectId: string): YourPlatformResult => {
    const placement = getStreamingTitlePlacement(player, projectId);
    if (!placement.mayPull) return { player, changed: false, detail: placement.isOriginal ? `It is a ${placement.serviceName} Original.` : 'It is not on your service.' };
    if (placement.afterCinema) return { player: withCinemaFlag(player, projectId, null), changed: true, detail: `It will not go on ${placement.serviceName} after cinemas close.` };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `title-pulled:${projectId}:${now}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key), idempotencyKey: key, absoluteWeek: now, type: 'CATALOG_PULLED', source: 'PLAYER_ACTION',
        summary: 'A studio title came off the service.', metadata: { projectId },
    };
    return {
        player: {
            ...player,
            activeReleases: player.activeReleases.map(release => {
                if (release.id !== projectId || !release.projectDetails.hiddenStats.ownPlatformRelease) return release;
                const { ownPlatformRelease: _was, ...hiddenStats } = release.projectDetails.hiddenStats;
                /* #252: not archived yet: back on the rights floor, or the week's close has no run to play and no buyer to wait for */
                const backOnTheFloor = release.distributionPhase === 'STREAMING' && !release.streaming;
                return { ...release, ...(backOnTheFloor ? { distributionPhase: 'STREAMING_BIDDING' as const } : {}), projectDetails: { ...release.projectDetails, hiddenStats } };
            }),
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                catalogProjectIds: platform.catalogProjectIds.filter(id => id !== projectId),
                starterCatalog: platform.starterCatalog ? { ...platform.starterCatalog, ownedProjectIds: platform.starterCatalog.ownedProjectIds.filter(id => id !== projectId) } : platform.starterCatalog,
                launchSlate: platform.launchSlate ? { ...platform.launchSlate, entries: platform.launchSlate.entries.filter(entry => entry.projectId !== projectId), revision: platform.launchSlate.revision + 1 } : platform.launchSlate,
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        detail: `It is off ${placement.serviceName}. You can sell it now.`,
    };
};

/** #253: the week's close: a film sent for the shelf leaves cinemas. It is only pushed now, so the popup says what is left to do. */
export const landTitleOnShelfAfterCinema = (player: Player, projectId: string, title: string): YourPlatformResult => {
    const linked = linkContentMarketOwnedTitles(player, [projectId]);
    if (!linked.changed) return { player, changed: false, detail: linked.detail };
    const name = linked.player.ownedStreamingPlatform.identity?.name || 'your service';
    const event: ScheduledEvent = {
        id: `streaming-decision-on_the_shelf-${projectId}`, week: player.currentWeek, type: 'STREAMING_DECISION',
        title: `"${title}" is on your shelf`, data: { streamingDecision: { kind: 'ON_THE_SHELF', key: projectId } },
    };
    return { player: { ...linked.player, pendingEvents: [...(linked.player.pendingEvents || []), event] }, changed: true, detail: `It is on your ${name} shelf. Schedule it in Content.` };
};

/** the week's close: an outside window ends. A line in the activity log, not a popup: nothing has to be decided this week. */
export const announceStreamingRightsBack = (input: Player, absoluteWeek: number): Player => {
    let player = input;
    for (const contract of Object.values(player.world?.streamingRightsContracts || {})) {
        if (contract.status !== 'ACTIVE' || contract.expiresAtAbsoluteWeek !== absoluteWeek || contract.permanentPurchase || contract.windowType === 'PERMANENT') continue;
        if (contract.seller?.type !== 'PLAYER_STUDIO' || !contract.buyer?.platformId) continue;
        const placement = getStreamingTitlePlacement(player, contract.sourceProjectId);
        if (placement.kind === 'EXCLUSIVE_OUTSIDE' || placement.kind === 'THEIRS') continue;
        const message = placement.onShelf
            ? `"${contract.titleAtSigning}" is back from ${contract.buyer.name}, and on your ${placement.serviceName} shelf. Schedule it in Content.`
            : placement.onYours
            ? `"${contract.titleAtSigning}" is back from ${contract.buyer.name}, and back on ${placement.serviceName}.`
            : placement.serviceName
                ? `"${contract.titleAtSigning}" is back from ${contract.buyer.name}. Sell it again or send it to ${placement.serviceName} from Filmography.`
                : `"${contract.titleAtSigning}" is back from ${contract.buyer.name}. You can sell it again from Filmography.`;
        player = addActivityLog(player, message);
    }
    return player;
};
