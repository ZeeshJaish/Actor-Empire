/**
 * #170 (plan §21.13, §21.17): the International seat's jobs.
 *
 *   - FILINGS: the market files the player opened. A government that asks for an additional requirement gets it
 *     answered (its payment and 5⚡, `resolveStreamingMarketRequirement`); a file temporarily rejected is filed again
 *     once its cooling period ends (5⚡, `resumeStreamingMarketClearance`). Opening or leaving a market stays the
 *     player's.
 *   - LANGUAGES: the set-up region where the language fit is weakest (the most viewers who watched titles in other
 *     languages that no level reached last week) gets its next Subtitles or Dubbing level, a step at a time from the
 *     energy allowance, as the player's own +5 presses do (`contributeStreamingLocalizationEnergy`). Subtitles first:
 *     the cheapest way to reach them; a global-first head moves to Dubbing after the first Subtitles level. When every
 *     set-up region is covered, a region not yet set up with viewers waiting is brought as a card (its set-up is the
 *     player's cash).
 */
import type { StreamingExecutiveStrategy, StreamingLocalizationTrack } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { getStreamingLocalizationDesk, type StreamingLocalizationDeskRegion } from '../streamingLocalizationDesk';
import { STREAMING_LOCALIZATION_ENERGY_STEP } from '../streamingLocalizationRegions';
import { contributeStreamingLocalizationEnergy, streamingLocalizationLevelName } from '../streamingLocalizationResearch';
import { getStreamingDayOneMarket } from '../streamingDayOneMarkets';
import {
    STREAMING_MARKET_REAPPLICATION_ENERGY,
    STREAMING_MARKET_REQUIREMENT_ENERGY,
    resolveStreamingMarketRequirement,
    resumeStreamingMarketClearance,
} from '../streamingMarkets';
import type { StreamingTeamExecutor, StreamingTeamJobRunner, StreamingTeamProposal } from './teamJobs';

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const first = (name: string) => name.split(' ')[0] || name;
const people = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(value / 1e3)}K`);
const countryOf = (countryId: string | null) => (countryId ? getStreamingDayOneMarket(countryId)?.country || countryId : 'the region');

/* ── filings ── */

export const runFilings: StreamingTeamJobRunner = (context) => {
    const { platform, absoluteWeek, executive } = context;
    const name = first(executive.nameAtAppointment);
    return platform.marketOperations
        .filter(operation => operation.source === 'PLAYER_ACTION' && operation.clearance)
        .flatMap((operation): StreamingTeamProposal[] => {
            const clearance = operation.clearance!;
            const country = countryOf(operation.countryId);
            if (operation.status === 'AWAITING_FUNDING' && clearance.outcome === 'ADDITIONAL_REQUIREMENT') {
                return [{
                    jobId: 'FILINGS',
                    dedupeKey: `filing:${operation.id}:${clearance.reviewAttempt}`,
                    title: `Answer ${country}'s follow-up`,
                    detail: `${clearance.additionalPayment > 0 ? `${money(clearance.additionalPayment)} filing · ` : ''}the file goes back into review`,
                    reason: `${country}'s regulator asked for ${clearance.condition ? clearance.condition.charAt(0).toLowerCase() + clearance.condition.slice(1).replace(/\.$/, '') : 'an additional compliance filing'}. ${name} answers it so the launch there stays on track.`,
                    cost: clearance.additionalPayment,
                    energy: STREAMING_MARKET_REQUIREMENT_ENERGY,
                    action: { kind: 'MARKET_FOLLOW_UP', operationId: operation.id, step: 'REQUIREMENT' },
                    priority: 32,
                }];
            }
            if (operation.status === 'SUSPENDED' && clearance.outcome === 'TEMPORARILY_REJECTED' && (clearance.resumeAllowedAtAbsoluteWeek ?? 0) <= absoluteWeek) {
                return [{
                    jobId: 'FILINGS',
                    dedupeKey: `reapply:${operation.id}:${clearance.reviewAttempt}`,
                    title: `Reapply in ${country}`,
                    detail: 'A revised application · two weeks of review',
                    reason: `${country} turned the first application down for now; its cooling period is over. ${name} files a revised one.`,
                    cost: 0,
                    energy: STREAMING_MARKET_REAPPLICATION_ENERGY,
                    action: { kind: 'MARKET_FOLLOW_UP', operationId: operation.id, step: 'REAPPLY' },
                    priority: 30,
                }];
            }
            return [];
        });
};

export const executeMarketFollowUp: StreamingTeamExecutor = (player, action) => {
    if (action.kind !== 'MARKET_FOLLOW_UP') return { player, changed: false };
    const result = action.step === 'REQUIREMENT'
        ? resolveStreamingMarketRequirement(player, action.operationId)
        : resumeStreamingMarketClearance(player, action.operationId);
    if (result.changed) return { player: result.player, changed: true };
    return {
        player,
        changed: false,
        reason: result.reason === 'INSUFFICIENT_TREASURY' ? 'The treasury cannot pay the filing.'
            : result.reason === 'INSUFFICIENT_ENERGY' ? 'Not enough energy.'
                : result.reason === 'TOO_EARLY' ? 'The cooling period is not over yet.' : 'That filing has already moved on.',
    };
};

/* ── languages ── */

/** the next step for a region: its track and level, and the energy still to put in */
const nextStep = (region: StreamingLocalizationDeskRegion, strategy: StreamingExecutiveStrategy) => {
    const step = (track: StreamingLocalizationTrack) => {
        const tier = region.tracks[track].tiers.find(item => item.state === 'NEXT');
        return tier ? { track, level: tier.level, remaining: Math.max(1, tier.energy - tier.progress), tier } : null;
    };
    const subtitles = step('SUBTITLES');
    const dubbing = step('DUBBING');
    const subtitleLevel = region.tracks.SUBTITLES.level;
    /* subtitles first; a global-first head moves to dubbing after the first subtitles level, the rest after the second */
    const dubbingAfter = strategy === 'GLOBAL_FIRST' ? 1 : 2;
    if (dubbing && (!subtitles || (subtitleLevel >= dubbingAfter && region.tracks.DUBBING.level < subtitleLevel))) return dubbing;
    return subtitles || dubbing;
};

export const runLanguages: StreamingTeamJobRunner = (context) => {
    const { player, executive } = context;
    const desk = getStreamingLocalizationDesk(player);
    if (!desk.live) return [];
    const name = first(executive.nameAtAppointment);
    const open = desk.regions
        .filter(region => region.open && region.untapped > 0)
        .map(region => ({ region, step: nextStep(region, executive.preferredStrategy) }))
        .filter((item): item is { region: StreamingLocalizationDeskRegion; step: NonNullable<ReturnType<typeof nextStep>> } => Boolean(item.step))
        .sort((left, right) => right.region.untapped - left.region.untapped || left.region.packageId.localeCompare(right.region.packageId));
    const pick = open[0];
    if (pick) {
        const { region, step } = pick;
        /* a step at a time: what the allowance holds this week (in the desk's own +5 steps), or the whole remainder */
        const allowance = Math.floor(context.energyLeft / STREAMING_LOCALIZATION_ENERGY_STEP) * STREAMING_LOCALIZATION_ENERGY_STEP;
        const energy = allowance >= STREAMING_LOCALIZATION_ENERGY_STEP ? Math.min(step.remaining, allowance) : step.remaining;
        const finishing = energy >= step.remaining;
        const track = step.track === 'SUBTITLES' ? 'subtitles' : 'dubbing';
        const reach = step.level === 1 ? 'the library' : step.tier.name.toLowerCase();
        return [{
            jobId: 'LANGUAGES',
            dedupeKey: `language:${region.packageId}:${step.track}:${step.level}:${step.tier.progress}`,
            title: `${finishing ? track.charAt(0).toUpperCase() + track.slice(1) : `Toward ${track}`} for ${region.name}: ${reach}`,
            detail: `${streamingLocalizationLevelName(step.track, step.level)} · ${finishing ? `${energy}⚡ reaches it` : `${energy}⚡ of the ${step.remaining}⚡ still needed`}`,
            reason: `${people(region.untapped)} viewers in your ${region.name} markets watched titles in other languages that no level reached last week. ${name}'s pick: ${step.track === 'SUBTITLES' ? 'subtitles, the cheapest way to reach them' : 'dubbing, for viewers who will not read along'}.`,
            cost: 0,
            energy,
            action: { kind: 'LOCALIZATION_LEVEL', regionId: region.packageId, track: step.track, level: step.level, energy },
            priority: 18,
        }];
    }
    /* every set-up region covered: the region not yet set up with the most viewers waiting, as a card */
    const waiting = desk.regions.filter(region => !region.open && region.untapped > 0)
        .sort((left, right) => right.untapped - left.untapped || left.packageId.localeCompare(right.packageId))[0];
    if (!waiting) return [];
    return [{
        jobId: 'LANGUAGES',
        dedupeKey: `language-setup:${waiting.packageId}:${Math.floor(getAbsoluteWeek(player.age, player.currentWeek) / 13)}`,
        title: `Set up ${waiting.name}`,
        detail: `${money(waiting.openCost)} once, then ${money(waiting.weeklyCost)} a week · ${waiting.languages.slice(0, 3).join(', ')}`,
        reason: `Every region you set up is covered. ${people(waiting.untapped)} viewers in ${waiting.name} watched titles in other languages last week; setting it up is yours to approve on Localization.`,
        cost: 0,
        energy: 0,
        action: { kind: 'OPEN_ROOM', room: 'LOCALIZATION' },
        askOnly: true,
        priority: 6,
    }];
};

export const executeLocalizationLevel: StreamingTeamExecutor = (player, action, context) => {
    if (action.kind !== 'LOCALIZATION_LEVEL') return { player, changed: false };
    const track = action.track === 'DUBBING' ? 'DUBBING' : 'SUBTITLES';
    const result = contributeStreamingLocalizationEnergy(player, action.regionId, track, action.energy && action.energy > 0 ? Math.round(action.energy) : 'FILL');
    if (!result.changed) {
        return {
            player,
            changed: false,
            reason: result.reason === 'INSUFFICIENT_ENERGY' ? 'Not enough energy.' : result.reason === 'MAX_LEVEL' ? 'That level is already reached.' : 'The region is not set up.',
        };
    }
    /* a level reached keeps who reached it: "reached by Elena" on Localization */
    const completed = result.completed;
    if (!completed) return { player: result.player, changed: true };
    const platform = normalizeOwnedStreamingPlatformState(result.player.ownedStreamingPlatform, result.player.id);
    const regions = (platform.localizationOperations.regions || []).map(region => (region.packageId !== completed.packageId ? region : {
        ...region,
        milestones: region.milestones.map(milestone => (milestone.track === completed.track && milestone.level === completed.level ? { ...milestone, by: context.executiveName } : milestone)),
    }));
    return {
        changed: true,
        player: {
            ...result.player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...platform, localizationOperations: { ...platform.localizationOperations, regions } }, result.player.id),
        },
    };
};
