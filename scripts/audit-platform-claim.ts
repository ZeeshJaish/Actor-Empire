/**
 * #241 (plan §25.4 Q1): a platform takes you to court, on the game's own case record. Before greenlight a kill fee and no suit; after it, the
 * fee back and damages; a missed date gets a notice first. Settle or fight through the hearing popups, which survive a reload. The old
 * Funding Claim is on the same record.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type LegalCase, type Player } from '../types';
import { generateLegalHearing } from '../services/lifeEventLogic';
import { PLATFORM_CLAIM_CASE, PLATFORM_CLAIM_VERDICT, chargeStudioLegal, createPlatformClaimHearing, fileStreamingPlatformClaim } from '../services/platformClaim';

const pass = (label: string) => console.log(`✓ ${label}`);
const studio = { id: 'studio-1', name: 'Northern Pictures', type: 'PRODUCTION_HOUSE', balance: 500_000_000, stats: { investorConfidence: 50 }, studioState: { financeLedger: [] } };
const base = (reputation = 40): Player => ({
    ...structuredClone(INITIAL_PLAYER),
    id: 'claim', name: 'Claim Founder', age: 40, currentWeek: 10, money: 1_000_000,
    stats: { ...INITIAL_PLAYER.stats, reputation },
    businesses: [structuredClone(studio)],
} as unknown as Player);
const cases = (player: Player): LegalCase[] => player.flags.activeCases || [];
const reload = (player: Player): Player => JSON.parse(JSON.stringify(player));
const choose = (player: Player, caseId: string, optionId: string) => {
    const hearing = generateLegalHearing(player, caseId)!;
    const option = hearing.options.find(item => item.id === optionId)!;
    return option.impact(reload(player)).updatedPlayer;
};
const balance = (player: Player) => player.businesses[0].balance;

const filed = fileStreamingPlatformClaim(base(), { kind: 'WALKED_AWAY', studioId: 'studio-1', platformId: 'NETFLIX', platformName: 'Netflix', titleName: 'Glass Harbour', feeBack: 2_125_000, damages: 9_000_000, key: 'test' });
const legal = cases(filed)[0];
assert.equal(legal.caseType, PLATFORM_CLAIM_CASE);
assert.equal(legal.title, 'Netflix v. Northern Pictures');
assert.equal(legal.nextHearingWeek, 11, 'the first hearing is next week');
assert.match(filed.news[0].headline, /^Netflix files a lawsuit over Glass Harbour/);
assert.match(filed.logs.at(-1)!.message, /Netflix filed a lawsuit over "Glass Harbour"/, 'a line in the activity log');
assert.equal(balance(filed), 500_000_000, 'filing costs nothing yet');
assert.deepEqual(filed.pendingEvents || [], base().pendingEvents || [], 'no popup when it is filed: there is nothing to decide yet');
pass('filed: news, a line in the activity log, no popup, nothing paid; the first hearing is next week');

const again = reload(filed);
const hearing = generateLegalHearing(again, legal.id);
assert.ok(hearing, 'the hearing is rebuilt from the record, after a reload too');
assert.equal(hearing!.type, 'LEGAL');
assert.deepEqual(hearing!.options.map(option => option.id), ['SETTLE_CLAIM', 'FIGHT_CLAIM']);
assert.equal(createPlatformClaimHearing(base(), 'nothing'), null);
pass('the hearing popup is rebuilt from plain data, so it survives a reload');

const settled = choose(filed, legal.id, 'SETTLE_CLAIM');
const settlement = legal.settlementDemand!;
assert.equal(balance(settled), 500_000_000 - settlement);
assert.equal(cases(settled)[0].status, 'SETTLED');
assert.equal((settled.businesses[0] as any).studioState.financeLedger[0].type, 'LEGAL');
assert.ok(settlement < 11_125_000, 'settling is cheaper than the claim');
assert.equal(generateLegalHearing(settled, legal.id), null, 'a closed case has no hearing');
pass(`settled for $${(settlement / 1e6).toFixed(2)}M, from studio money, on its books, and it ends`);

const claim = 2_125_000 + 9_000_000;
const first = choose(filed, legal.id, 'FIGHT_CLAIM');
assert.equal(cases(first)[0].currentHearing, 2);
assert.equal(cases(first)[0].status, 'ACTIVE');
const fee = legal.legalFeePerHearing!;
assert.equal(balance(first), 500_000_000 - fee);
const lost = choose(first, legal.id, 'FIGHT_CLAIM');
assert.equal(cases(lost)[0].status, 'LOST', 'walking away is hard to defend');
assert.ok(balance(first) - balance(lost) >= claim * PLATFORM_CLAIM_VERDICT, 'the award is more than the claim');
assert.ok(lost.stats.reputation < first.stats.reputation, 'it shows');
assert.match(lost.news[0].headline, /Netflix wins lawsuit/);
pass('fought and lost: fees each hearing, then more than the claim, and reputation falls');

const strong = fileStreamingPlatformClaim(base(100), { kind: 'FUNDING', studioId: 'studio-1', platformId: 'HULU', platformName: 'Hulu', titleName: 'Paper City', feeBack: 0, damages: 2_000_000, key: 'strong' });
const strongCase = cases(strong)[0];
const won = choose(choose(strong, strongCase.id, 'FIGHT_CLAIM'), strongCase.id, 'FIGHT_CLAIM');
assert.equal(cases(won)[0].status, 'WON', 'a good name and a weaker claim can win');
assert.equal(balance(won), 500_000_000 - strongCase.legalFeePerHearing! * 2, 'only the fees');
pass('fought and won: only the fees; the old Funding Claim runs on the same record');

const noStudio = chargeStudioLegal({ ...base(), money: 5_000_000, businesses: [] } as Player, 'gone', 1_000_000, 'A fee', 'nostudio');
assert.equal(noStudio.money, 4_000_000, 'a studio since sold leaves the bill with you');
pass('a studio since sold leaves the bill with you');
console.log('platform-claim audit passed');
