import type { Message, Player } from '../types';
import type { ForbesStudioProfile, StudioAcquisitionState } from './forbesStudioProfile';

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

const COMMANDS: Record<ForbesOwnershipAction, ForbesOwnershipCommand> = {
    MONITOR_STUDIO: {
        action: 'MONITOR_STUDIO',
        label: 'Monitor Studio',
        completedLabel: 'Studio Monitored',
        description: 'Track ownership pressure and receive future company alerts.',
    },
    EXPRESS_INTEREST: {
        action: 'EXPRESS_INTEREST',
        label: 'Express Interest',
        completedLabel: 'Interest Registered',
        description: 'Quietly tell the ownership group that your studio wants a conversation.',
    },
    VIEW_INVESTMENT: {
        action: 'VIEW_INVESTMENT',
        label: 'View Investment Opportunity',
        completedLabel: 'Opportunity Requested',
        description: 'Request the company’s investment brief through Forbes Business Desk.',
    },
    PREPARE_ACQUISITION: {
        action: 'PREPARE_ACQUISITION',
        label: 'Prepare Acquisition',
        completedLabel: 'Acquisition Prepared',
        description: 'Open an internal acquisition watch before the company reaches market.',
    },
};

const STATE_ACTIONS: Record<StudioAcquisitionState, ForbesOwnershipAction> = {
    NOT_FOR_SALE: 'MONITOR_STUDIO',
    PUBLICLY_TRADED: 'MONITOR_STUDIO',
    OPEN_TO_OFFERS: 'EXPRESS_INTEREST',
    SEEKING_INVESTMENT: 'VIEW_INVESTMENT',
    DISTRESSED: 'PREPARE_ACQUISITION',
    AUCTION_EXPECTED: 'PREPARE_ACQUISITION',
};

export const getForbesOwnershipCommand = (
    acquisitionState: StudioAcquisitionState,
    isPlayerOwned: boolean,
): ForbesOwnershipCommand | null => {
    if (isPlayerOwned) return null;
    return COMMANDS[STATE_ACTIONS[acquisitionState]] || null;
};

export const getForbesOwnershipDiscoveries = (player: Player): ForbesOwnershipDiscoveryRecord[] => (
    Array.isArray(player.flags?.forbesOwnershipDiscoveries)
        ? player.flags.forbesOwnershipDiscoveries
        : []
);

const getMessageCopy = (
    profile: ApplyForbesOwnershipDiscoveryInput['profile'],
    command: ForbesOwnershipCommand,
) => {
    if (command.action === 'MONITOR_STUDIO') {
        return {
            subject: `${profile.name} added to company watch`,
            text: `Forbes Business Desk is now monitoring ${profile.name}. Material ownership changes, distress signals or a sale process will be routed here.`,
        };
    }
    if (command.action === 'EXPRESS_INTEREST') {
        return {
            subject: `Interest registered with ${profile.name}`,
            text: `Your confidential interest in ${profile.name} has been recorded. The ownership group now knows your studio is open to a future conversation.`,
        };
    }
    if (command.action === 'VIEW_INVESTMENT') {
        return {
            subject: `${profile.name} investment brief requested`,
            text: `Forbes Business Desk recorded your request for ${profile.name}'s investment opportunity. Detailed capital terms will be handled in the ownership negotiation phase.`,
        };
    }
    return {
        subject: `Acquisition watch opened: ${profile.name}`,
        text: `Your team has started preliminary acquisition monitoring for ${profile.name}. This preserves the opportunity without committing capital before a formal process exists.`,
    };
};

export const applyForbesOwnershipDiscovery = ({
    player,
    profile,
}: ApplyForbesOwnershipDiscoveryInput): ApplyForbesOwnershipDiscoveryResult => {
    const command = getForbesOwnershipCommand(profile.acquisitionState, Boolean(profile.isPlayerOwned));
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
    const copy = getMessageCopy(profile, command);
    const message: Message = {
        id: `forbes_ownership_${profile.id}_${player.age}_${player.currentWeek}`,
        sender: 'Forbes Business Desk',
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
                message: `Forbes ownership command: ${command.label} — ${profile.name}.`,
                type: 'neutral' as const,
            }, ...(player.logs || [])].slice(0, 50),
        },
    };
};
