import type { LifeEvent, LifeEventImpactResult, LifeEventOption, Player, ScheduledEvent } from '../types';
import { getPlayerLanguage, t } from './i18n';
import { resolveLegacyRegulatorPressureChoice } from './regulatorPressure';
import { resolveLegacyRivalRetaliationChoice } from './rivalRetaliation';
import { resolveShareholderVote } from './shareholderVoting';
import { resolveLegacyTalentInstabilityChoice } from './talentInstability';
import { resolveLegacyWorldReactionChoice } from './worldReactions';

const reconstructed = (result: LifeEventImpactResult | null): LifeEventImpactResult | null => result
    ? { ...result, resolutionKind: 'LEGACY_RECONSTRUCTED' }
    : null;

const parseStructuredPenalty = (value: unknown): number | null => {
    if (typeof value !== 'string' || !/^\$\d{1,3}(?:,\d{3})*$/.test(value)) return null;
    const parsed = Number(value.replace(/[$,]/g, ''));
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const resolveGovernmentAudit = (
    player: Player,
    lifeEvent: LifeEvent,
    option: LifeEventOption,
): LifeEventImpactResult | null => {
    if (!lifeEvent.id.startsWith('audit_')) return null;
    const language = getPlayerLanguage(player);
    if (option.labelKey === 'life.event.audit.government.pay.label') {
        const penalty = parseStructuredPenalty(option.textVars?.penalty);
        if (penalty === null) return null;
        return {
            updatedPlayer: { ...player, money: player.money - penalty },
            log: t(language, 'life.event.audit.government.pay.log'),
            logKey: 'life.event.audit.government.pay.log',
            resolutionKind: 'LEGACY_RECONSTRUCTED',
        };
    }
    if (option.labelKey === 'life.event.audit.government.fight.label') {
        return {
            updatedPlayer: {
                ...player,
                stats: { ...player.stats, reputation: player.stats.reputation - 15 },
            },
            log: t(language, 'life.event.audit.government.fight.log'),
            logKey: 'life.event.audit.government.fight.log',
            resolutionKind: 'LEGACY_RECONSTRUCTED',
        };
    }
    return null;
};

export const resolveLegacyLifeEventChoice = (
    player: Player,
    event: ScheduledEvent,
    lifeEvent: LifeEvent,
    option: LifeEventOption,
): LifeEventImpactResult | null => {
    const optionId = option.id || '';
    if (event.data?.worldReactionEventType) {
        return reconstructed(resolveLegacyWorldReactionChoice(player, event.data.worldReactionEventType, optionId));
    }
    if (event.data?.regulatorPressureEventType) {
        return reconstructed(resolveLegacyRegulatorPressureChoice(player, optionId));
    }
    if (event.data?.talentInstabilityEventType) {
        return reconstructed(resolveLegacyTalentInstabilityChoice(player, optionId));
    }
    if (event.data?.rivalRetaliationEventType) {
        return reconstructed(resolveLegacyRivalRetaliationChoice(player, optionId));
    }
    if (event.data?.stockDecisionType === 'SHAREHOLDER_VOTE' && typeof event.data.voteId === 'string') {
        const selection = optionId === 'VOTE_AGAINST' ? 'AGAINST' : optionId === 'VOTE_FOR' || optionId === 'ADVISOR_SAFE_VOTE' ? 'FOR' : null;
        if (!selection) return null;
        const vote = resolveShareholderVote(player, event.data.voteId, selection, { golden: optionId === 'ADVISOR_SAFE_VOTE' });
        if (!vote.success) return null;
        return {
            updatedPlayer: vote.player,
            log: vote.vote?.outcomeSummary || t(getPlayerLanguage(player), 'life.event.shareholder.for.log', { company: vote.vote?.companyName || '' }),
            resolutionKind: 'LEGACY_RECONSTRUCTED',
        };
    }
    return resolveGovernmentAudit(player, lifeEvent, option);
};

export const createUnresolvableLegacyLifeEventResult = (player: Player): LifeEventImpactResult => ({
    updatedPlayer: player,
    log: 'This older event could not be restored safely. It was removed without changing your money, relationships, ownership, or stats.',
    logKey: 'life.modal.legacy.unresolvable.log',
    resolutionKind: 'LEGACY_UNRESOLVABLE',
    legacyReason: 'MISSING_SERIALIZED_CONTEXT',
});
