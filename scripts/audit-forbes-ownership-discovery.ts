import {
    applyForbesOwnershipDiscovery,
    getForbesOwnershipCommand,
} from '../services/forbesOwnershipDiscovery';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

assert(getForbesOwnershipCommand('NOT_FOR_SALE', false)?.action === 'MONITOR_STUDIO', 'Not-for-sale studios should be monitorable.');
assert(getForbesOwnershipCommand('PUBLICLY_TRADED', false)?.action === 'MONITOR_STUDIO', 'Public studios should be monitorable.');
assert(getForbesOwnershipCommand('OPEN_TO_OFFERS', false)?.action === 'EXPRESS_INTEREST', 'Open studios should accept expressions of interest.');
assert(getForbesOwnershipCommand('SEEKING_INVESTMENT', false)?.action === 'VIEW_INVESTMENT', 'Investment-seeking studios should expose the investment opportunity.');
assert(getForbesOwnershipCommand('DISTRESSED', false)?.action === 'PREPARE_ACQUISITION', 'Distressed studios should allow acquisition preparation.');
assert(getForbesOwnershipCommand('AUCTION_EXPECTED', false)?.action === 'PREPARE_ACQUISITION', 'Auction candidates should allow acquisition preparation.');
assert(getForbesOwnershipCommand('OPEN_TO_OFFERS', true) === null, 'Player-owned studios must not target themselves.');

const player: any = {
    age: 24,
    currentWeek: 18,
    flags: {},
    inbox: [],
    logs: [],
};
const profile: any = {
    id: 'studio_target',
    name: 'Target Pictures',
    acquisitionState: 'OPEN_TO_OFFERS',
    isPlayerOwned: false,
    valuation: 500_000_000,
};

const first = applyForbesOwnershipDiscovery({ player, profile });
assert(first.success, 'A valid discovery command should succeed.');
assert(first.command?.action === 'EXPRESS_INTEREST', 'The applied command should match the studio acquisition state.');
assert(first.player !== player, 'Discovery should return a new player object.');
assert(first.player.flags.forbesOwnershipDiscoveries.length === 1, 'Discovery should persist one tracked studio state.');
assert(first.player.inbox.length === 1 && first.player.inbox[0].sender === 'Forbes Business Desk', 'Discovery should create an unread Forbes message.');
assert(first.player.inbox[0].data?.studioId === profile.id, 'The inbox response should preserve the target studio.');

const duplicate = applyForbesOwnershipDiscovery({ player: first.player, profile });
assert(!duplicate.success && duplicate.reason === 'ALREADY_RECORDED', 'Duplicate discovery actions should be blocked.');
assert(duplicate.player.inbox.length === 1, 'Duplicate actions must not create extra messages.');

const selfTarget = applyForbesOwnershipDiscovery({
    player,
    profile: { ...profile, id: 'player_studio', isPlayerOwned: true },
});
assert(!selfTarget.success && selfTarget.reason === 'PLAYER_OWNED', 'Player-owned studios should reject ownership discovery actions.');

console.log('Forbes ownership discovery audit passed.');
