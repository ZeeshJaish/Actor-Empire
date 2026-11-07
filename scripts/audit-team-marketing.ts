/** #167 (plan §21.17): the Marketing seat's jobs on the full test company.
 *  - a title premiering this week gets a premiere push: Jonah (growth first) picks short video, social feed and TV
 *    spots, his biggest markets, three weeks, sized to the most-for-one-action limit;
 *  - at Do it, inside the limits, the campaign starts through the Studio's own service: paid in full, its energy
 *    spent, "Run by Jonah" on it, DONE in the report; at Ask me it is a card; the same title is never pushed twice;
 *  - a brand campaign is proposed when none ran in the last 13 weeks;
 *  - a running campaign at over twice the average a join is proposed for a stop, and stopping gives back its unrun
 *    weeks; a strong one in its last week is proposed for one more week. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Campaign, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { runStreamingTeamWeek, setStreamingTeamJobMode, setStreamingTeamLimits } from '../services/team/streamingTeam';
import { runBrandCampaign, runCampaignResults, runPremierePush, executeCampaignStop } from '../services/team/teamMarketing';
import { streamingCampaignBook } from '../services/campaigns/streamingCampaigns';
import type { StreamingTeamJobContext } from '../services/team/teamJobs';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Marketing', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
/* #181: whoever carries a job out lands it under or over budget, booked once as a team result (refund +, overrun −) */
const teamResultSince = (before: Player, after: Player) => {
    const seen = new Set(platformOf(before).eventLedger.map(entry => entry.id));
    return platformOf(after).eventLedger
        .filter(entry => entry.type === 'TEAM_RESULT' && !seen.has(entry.id) && !entry.idempotencyKey.startsWith('team-result:expenses:'))
        .reduce((sum, entry) => sum + Number(entry.metadata?.refund || 0) - Number(entry.metadata?.overrun || 0), 0);
};
const withEnergy = (player: Player, amount: number): Player => ({
    ...player, energy: { current: amount, max: amount }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 },
});
const rich = (player: Player): Player => ({ ...player, ownedStreamingPlatform: { ...platformOf(player), treasuryCash: 50_000_000_000 } });
const contextOf = (player: Player): StreamingTeamJobContext => {
    const platform = platformOf(player);
    const executive = streamingTeamSeatHolders(platform.leadership.appointments).holders.get('MARKETING')!;
    const seat = platform.leadership.team!.seats.find(item => item.seatId === 'MARKETING')!;
    return { player, platform, absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek), seat, executive, moneyLeft: seat.weeklyMoney, energyLeft: seat.weeklyEnergy };
};
const pass = (label: string) => console.log(`✓ ${label}`);
/* the build's own weekly close already ran the team this week; run it again as a fresh week's run */
const rerun = (player: Player): Player => {
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return runStreamingTeamWeek({ ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: {
        ...team, lastRunAbsoluteWeek: null, seats: team.seats.map(seat => ({ ...seat, usageWeek: 0, moneyUsed: 0, energyUsed: 0, actionsUsed: 0 })),
    } } } });
};

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-marketing'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = rich(withEnergy(player, 100));
    const platform = platformOf(player);
    const programWeek = getAbsoluteWeek(player.age, player.currentWeek) - platform.launchCommit!.committedAtAbsoluteWeek + 1;
    /* a slate title premieres this week */
    const entry = platform.launchSlate!.entries.find(item => item.source === 'ORIGINAL') || platform.launchSlate!.entries[0];
    player = { ...player, ownedStreamingPlatform: { ...platform, launchSlate: { ...platform.launchSlate!, entries: platform.launchSlate!.entries.map(item => (item.id === entry.id ? { ...item, launchWeek: programWeek } : item)) } } };
    const jonah = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('MARKETING')!;
    assert.equal(jonah.preferredStrategy, 'GROWTH_FIRST');

    /* ── the premiere push ── */
    player = setStreamingTeamLimits(player, 'MARKETING', { weeklyMoney: 150_000_000, actionMoney: 75_000_000, weeklyEnergy: 20 }).player;
    let proposals = runPremierePush(contextOf(player));
    assert.equal(proposals.length, 1);
    const push = proposals[0];
    assert.equal(push.action.kind, 'CAMPAIGN_START');
    const draft = (push.action as unknown as { draft: { formats: string[]; where: { countryIds: string[] }; budget: { weeks: number; strength: number } } }).draft;
    assert.match(push.title, new RegExp(`Push ${entry.title}'s premiere`));
    assert.ok(draft.formats.every(id => ['SHORT_VIDEO', 'SOCIAL_FEED', 'TV_SPOTS'].includes(id)));
    assert.ok(push.cost <= 75_000_000 || draft.where.countryIds.length <= 3, 'sized to the most-for-one-action limit when it can be');
    assert.ok(push.energy >= 5);
    pass(`a premiere push for ${entry.title}: ${draft.formats.join(' + ')}, ${draft.where.countryIds.length} countries, ${draft.budget.weeks} weeks, $${(push.cost / 1e6).toFixed(1)}M, ⚡${push.energy}`);

    /* a small limit shrinks it */
    const small = setStreamingTeamLimits(player, 'MARKETING', { weeklyMoney: 150_000_000, actionMoney: 2_000_000 }).player;
    const smaller = runPremierePush(contextOf(small))[0];
    const smallDraft = (smaller.action as unknown as { draft: { where: { countryIds: string[] }; budget: { weeks: number } } }).draft;
    assert.ok(smaller.cost < push.cost && (smallDraft.where.countryIds.length < draft.where.countryIds.length || smallDraft.budget.weeks < draft.budget.weeks));
    pass(`a $2M limit shrinks it to ${smallDraft.where.countryIds.length} countries, ${smallDraft.budget.weeks} weeks, $${(smaller.cost / 1e6).toFixed(1)}M`);

    /* Ask me (the start): a card */
    const asked = rerun(player);
    assert.ok(platformOf(asked).leadership.team!.tray.some(card => card.dedupeKey === `premiere:${entry.projectId}` && card.status === 'WAITING'));
    assert.equal(streamingCampaignBook(platformOf(asked)).campaigns.filter(campaign => campaign.runBy).length, 0);
    pass('Ask me: a card in the in-tray, nothing started');

    /* Do it: started through the Studio's service, paid in full, energy spent, Run by Jonah */
    let doing = setStreamingTeamJobMode(player, 'MARKETING', 'PREMIERE_PUSH', 'DO').player;
    const cash = platformOf(doing).treasuryCash;
    const energy = doing.energy.current;
    const beforePush = doing;
    doing = rerun(doing);
    const pushResult = teamResultSince(beforePush, doing);
    const book = streamingCampaignBook(platformOf(doing));
    const started_ = book.campaigns.find(campaign => campaign.subject.id === entry.projectId && campaign.runBy)!;
    assert.ok(started_, 'the campaign started');
    assert.equal(started_.runBy!.name, jonah.nameAtAppointment);
    assert.equal(cash - platformOf(doing).treasuryCash, started_.paid! - pushResult);
    assert.equal(energy - doing.energy.current, started_.energy);
    const report = platformOf(doing).leadership.team!.report.find(item => item.kind === 'DONE' && item.jobId === 'PREMIERE_PUSH')!;
    assert.ok(report && report.cost === started_.paid! - pushResult && report.energy === started_.energy);
    assert.equal(runPremierePush(contextOf(doing)).length, 0, 'never the same title twice');
    pass(`Do it: started, $${(started_.paid! / 1e6).toFixed(1)}M paid in full and ⚡${started_.energy} spent, "Run by ${jonah.nameAtAppointment}", DONE in the report`);

    /* ── the brand campaign ── */
    const brand = runBrandCampaign(contextOf(player));
    assert.equal(brand.length, 1);
    assert.match(brand[0].title, /^Brand campaign for /);
    assert.ok((brand[0].action as unknown as { draft: { subject: { kind: string } } }).draft.subject.kind === 'SERVICE');
    pass(`a brand campaign: ${brand[0].detail}`);

    /* ── stop or extend ── */
    const base = streamingCampaignBook(platformOf(doing)).campaigns.find(campaign => campaign.id === started_.id)!;
    const week = getAbsoluteWeek(doing.age, doing.currentWeek);
    const good: Campaign = { ...base, id: 'audit-good', name: 'Audit good', spent: 1_000_000, paid: 3_000_000,
        weeks: [{ absoluteWeek: week - 2, spend: 500_000, reach: 1, awareness: 0.1, joins: 10_000, viewers: 0 }, { absoluteWeek: week - 1, spend: 500_000, reach: 1, awareness: 0.1, joins: 10_000, viewers: 0 }] };
    const dear: Campaign = { ...base, id: 'audit-dear', name: 'Audit dear', spent: 20_000_000, paid: 30_000_000, budget: { kind: 'WEEKS', weeks: 6, strength: 1 },
        weeks: [{ absoluteWeek: week - 2, spend: 10_000_000, reach: 1, awareness: 0.1, joins: 100, viewers: 0 }, { absoluteWeek: week - 1, spend: 10_000_000, reach: 1, awareness: 0.1, joins: 100, viewers: 0 }] };
    const goodLast: Campaign = { ...good, budget: { kind: 'WEEKS', weeks: 3, strength: 1 } };
    const withCampaigns: Player = { ...doing, ownedStreamingPlatform: { ...platformOf(doing), campaignBook: { ...book, campaigns: [...book.campaigns, goodLast, dear] } } };
    proposals = runCampaignResults(contextOf(withCampaigns));
    const stop = proposals.find(item => item.action.kind === 'CAMPAIGN_STOP')!;
    assert.ok(stop && stop.title === 'Stop Audit dear');
    assert.match(stop.detail, /\$10M of its weeks not run comes back/);
    const extend = proposals.find(item => item.action.kind === 'CAMPAIGN_EXTEND')!;
    assert.ok(extend && extend.title === 'Extend Audit good by a week' && extend.cost > 0);
    const cash2 = platformOf(withCampaigns).treasuryCash;
    const stopped = executeCampaignStop(withCampaigns, stop.action, { absoluteWeek: week, executiveName: jonah.nameAtAppointment });
    assert.equal(platformOf(stopped.player).treasuryCash - cash2, 10_000_000);
    pass('stop a dear campaign ($10M of its weeks comes back); extend a strong one in its last week');

    console.log(`Team Marketing audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
