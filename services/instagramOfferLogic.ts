import { AuditionOpportunity, BudgetTier, Player } from '../types';
import { generateAudition } from './roleLogic';

export type InstagramReferralDeliveryType = 'AUDITION' | 'DIRECT_ROLE';

export interface InstagramReferralOutcome {
    deliveryType: InstagramReferralDeliveryType;
    opportunity: AuditionOpportunity;
}

const getUsedProjectTitles = (player: Player): string[] => [
    ...(player.commitments || []).map(commitment => commitment.name),
    ...(player.pastProjects || []).map(project => project.name),
].filter(Boolean);

export const createInstagramReferralAudition = (player: Player): AuditionOpportunity => {
    const fame = Number(player.stats?.fame) || 0;
    const reputation = Number(player.stats?.reputation) || 0;
    const accessScore = (fame * 0.7) + (reputation * 0.3);
    const tier: BudgetTier = accessScore >= 45 ? 'MID' : 'LOW';
    const projectType = Math.random() < 0.5 ? 'MOVIE' : 'SERIES';

    return generateAudition('SUPPORTING', tier, getUsedProjectTitles(player), player, 'DIRECTOR', projectType);
};

export const createInstagramReferralOutcome = (
    player: Player,
    random: () => number = Math.random
): InstagramReferralOutcome => {
    const fame = Number(player.stats?.fame) || 0;
    const reputation = Number(player.stats?.reputation) || 0;
    const talent = Number(player.stats?.talent) || 0;
    const currentAbsoluteWeek = ((Number(player.age) || 0) * 52) + (Number(player.currentWeek) || 0);
    const lastDirectRoleWeek = Number(player.flags?.lastInstagramDirectRoleAbsoluteWeek ?? -999);
    const hasBusyActingRole = (player.commitments || []).some(commitment =>
        commitment.type === 'ACTING_GIG'
        && ['AUDITION', 'PRE_PRODUCTION', 'PRODUCTION'].includes(commitment.projectPhase || '')
    );
    const hasPendingRoleOffer = (player.inbox || []).some(message => message.type === 'OFFER_ROLE');
    const eligibleForDirectRole = fame >= 75
        && reputation >= 60
        && talent >= 65
        && !hasBusyActingRole
        && !hasPendingRoleOffer
        && currentAbsoluteWeek - lastDirectRoleWeek >= 26;

    if (eligibleForDirectRole) {
        const directRoleChance = Math.min(
            0.12,
            0.04
            + (Math.max(0, fame - 75) * 0.002)
            + (Math.max(0, reputation - 60) * 0.0015)
            + (Math.max(0, talent - 65) * 0.001)
        );

        if (random() < directRoleChance) {
            const tier: BudgetTier = fame >= 85 && reputation >= 70 ? 'HIGH' : 'MID';
            const roleType = fame >= 85 && random() < 0.35 ? 'LEAD' : 'SUPPORTING';
            const projectType = random() < 0.55 ? 'MOVIE' : 'SERIES';
            return {
                deliveryType: 'DIRECT_ROLE',
                opportunity: generateAudition(
                    roleType,
                    tier,
                    getUsedProjectTitles(player),
                    player,
                    'DIRECT',
                    projectType
                )
            };
        }
    }

    return {
        deliveryType: 'AUDITION',
        opportunity: createInstagramReferralAudition(player)
    };
};

export const isValidInstagramReferralOpportunity = (value: unknown): value is AuditionOpportunity => {
    const opportunity = value as AuditionOpportunity | undefined;
    return Boolean(
        opportunity
        && typeof opportunity.id === 'string'
        && opportunity.id.length > 0
        && typeof opportunity.projectName === 'string'
        && opportunity.projectName.length > 0
        && typeof opportunity.roleType === 'string'
        && opportunity.project
        && typeof opportunity.project === 'object'
        && Number.isFinite(opportunity.estimatedIncome)
    );
};

export const resolveInstagramReferralOutcome = (
    referral: { deliveryType?: InstagramReferralDeliveryType; opportunity?: unknown },
    player: Player
): InstagramReferralOutcome => {
    if (!isValidInstagramReferralOpportunity(referral.opportunity)) {
        return {
            deliveryType: 'AUDITION',
            opportunity: createInstagramReferralAudition(player)
        };
    }

    return {
        deliveryType: referral.deliveryType === 'DIRECT_ROLE' ? 'DIRECT_ROLE' : 'AUDITION',
        opportunity: referral.opportunity
    };
};
