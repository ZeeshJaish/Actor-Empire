import type { GameLanguage, Message, Player } from '../types';
import type { ForbesStudioProfile, StudioAcquisitionState } from './forbesStudioProfile';
import { getPlayerLanguage, t } from './i18n';

export type ForbesOwnershipAction =
    | 'MONITOR_STUDIO'
    | 'EXPRESS_INTEREST'
    | 'VIEW_INVESTMENT'
    | 'PREPARE_ACQUISITION';

export interface ForbesOwnershipCommand {
    action: ForbesOwnershipAction;
    label: string;
    completedLabel: string;
    description: string;
}

export interface ForbesOwnershipDiscoveryRecord {
    studioId: string;
    studioName: string;
    action: ForbesOwnershipAction;
    acquisitionState: StudioAcquisitionState;
    recordedWeek: number;
    recordedYear: number;
}

interface ApplyForbesOwnershipDiscoveryInput {
    player: Player;
    profile: Pick<ForbesStudioProfile, 'id' | 'name' | 'acquisitionState' | 'valuation'> & { isPlayerOwned?: boolean };
}

export interface ApplyForbesOwnershipDiscoveryResult {
    success: boolean;
    player: Player;
    command: ForbesOwnershipCommand | null;
    reason?: 'PLAYER_OWNED' | 'ALREADY_RECORDED' | 'NO_COMMAND';
}

const STATE_ACTIONS: Record<StudioAcquisitionState, ForbesOwnershipAction> = {
    NOT_FOR_SALE: 'MONITOR_STUDIO',
    PUBLICLY_TRADED: 'MONITOR_STUDIO',
    OPEN_TO_OFFERS: 'EXPRESS_INTEREST',
    SEEKING_INVESTMENT: 'VIEW_INVESTMENT',
    DISTRESSED: 'PREPARE_ACQUISITION',
    AUCTION_EXPECTED: 'PREPARE_ACQUISITION',
};

const buildForbesOwnershipCommand = (action: ForbesOwnershipAction, language: GameLanguage): ForbesOwnershipCommand => ({
    action,
    label: t(language, `services.forbesOwnership.command.${action}.label`),
    completedLabel: t(language, `services.forbesOwnership.command.${action}.completedLabel`),
    description: t(language, `services.forbesOwnership.command.${action}.description`),
});

export const getForbesOwnershipCommand = (
    acquisitionState: StudioAcquisitionState,
    isPlayerOwned: boolean,
    language: GameLanguage = 'en',
): ForbesOwnershipCommand | null => {
    if (isPlayerOwned) return null;
    const action = STATE_ACTIONS[acquisitionState];
    return action ? buildForbesOwnershipCommand(action, language) : null;
};

export const getForbesOwnershipDiscoveries = (player: Player): ForbesOwnershipDiscoveryRecord[] => (
    Array.isArray(player.flags?.forbesOwnershipDiscoveries)
        ? player.flags.forbesOwnershipDiscoveries
        : []
);

const getMessageCopy = (
    profile: ApplyForbesOwnershipDiscoveryInput['profile'],
    command: ForbesOwnershipCommand,
    language: GameLanguage,
) => {
    return {
        subject: t(language, `services.forbesOwnership.message.${command.action}.subject`, { studio: profile.name }),
        text: t(language, `services.forbesOwnership.message.${command.action}.text`, { studio: profile.name }),
    };
};

export const applyForbesOwnershipDiscovery = ({
    player,
    profile,
}: ApplyForbesOwnershipDiscoveryInput): ApplyForbesOwnershipDiscoveryResult => {
    const language = getPlayerLanguage(player);
    const command = getForbesOwnershipCommand(profile.acquisitionState, Boolean(profile.isPlayerOwned), language);
    if (profile.isPlayerOwned) return { success: false, player, command: null, reason: 'PLAYER_OWNED' };
    if (!command) return { success: false, player, command: null, reason: 'NO_COMMAND' };

    const discoveries = getForbesOwnershipDiscoveries(player);
    if (discoveries.some(record => record.studioId === profile.id)) {
        return { success: false, player, command, reason: 'ALREADY_RECORDED' };
    }

    const record: ForbesOwnershipDiscoveryRecord = {
        studioId: profile.id,
        studioName: profile.name,
        action: command.action,
        acquisitionState: profile.acquisitionState,
        recordedWeek: player.currentWeek,
        recordedYear: player.age,
    };
    const copy = getMessageCopy(profile, command, language);
    const message: Message = {
        id: `forbes_ownership_${profile.id}_${player.age}_${player.currentWeek}`,
        sender: t(language, 'services.forbesOwnership.sender'),
        subject: copy.subject,
        text: copy.text,
        type: 'SYSTEM',
        data: {
            kind: 'FORBES_OWNERSHIP_DISCOVERY',
            studioId: profile.id,
            studioName: profile.name,
            acquisitionState: profile.acquisitionState,
            action: command.action,
            valuation: profile.valuation,
        },
        isRead: false,
        weekSent: player.currentWeek,
    };

    return {
        success: true,
        command,
        player: {
            ...player,
            flags: {
                ...player.flags,
                forbesOwnershipDiscoveries: [...discoveries, record],
            },
            inbox: [message, ...(player.inbox || [])],
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: t(language, 'services.forbesOwnership.commandLog', {
                    command: t(language, `services.forbesOwnership.command.${command.action}.label`),
                    studio: profile.name,
                }),
                type: 'neutral' as const,
            }, ...(player.logs || [])].slice(0, 50),
        },
    };
};
