/** Localization by region (Content Desk → Localization). Builds the developer test company
 * (~40 s; it sets up three regions and reaches levels along its 16 weeks), then checks:
 *  - the rules: energy 10/20/30 and 20/30/40; what each level reaches (library 9+ weeks, new
 *    releases from week 2, premieres from day one); the fit model; the map's home countries;
 *  - the company's state, the desk view (ladders, reach notes, the language report), and the
 *    weekly figures stepping up with levels, with each region's top titles and untapped viewers;
 *  - set up (cash only), energy straight into a track (kept between presses; a press needs its
 *    whole 5, FILL puts what there is, this week's energy first), reaching a level (milestone,
 *    ledger), every refusal; no lab, no slots, no cash per level;
 *  - the campus no longer offers localization research;
 *  - A/B on the same weeks: one more level means more viewers added, more watching in their own
 *    language, a higher offer index in the region's markets and more subscribers there;
 *    no region set up means no change at all;
 *  - older saves: none, idempotent, campus tiers kept; a #23 save's lab energy becomes progress. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type StreamingLocalizationTrack } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingResearchPortfolio, startStreamingResearchProgram } from '../services/streamingResearchLifecycle';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { normalizeWorldStreamingViewingState } from '../services/worldEconomy/worldStreamingViewing';
import {
    STREAMING_LANGUAGE_FIT, STREAMING_LOCALIZATION_HOME_COUNTRIES, STREAMING_LOCALIZATION_LEVEL_ENERGY, STREAMING_LOCALIZATION_REGION_META,
    STREAMING_LOCALIZATION_REGION_ORDER, createStreamingCountryLocalizationResolver, measureStreamingLocalizationRegion,
    resolveStreamingLocalizationRegions, resolveTitleLanguageFit, streamingLocalizationLevelNeeded,
} from '../services/streamingLocalizationRegions';
import {
    contributeStreamingLocalizationEnergy, unlockStreamingLocalizationRegion, type StreamingLocalizationActionResult,
} from '../services/streamingLocalizationResearch';
import { getStreamingLocalizationDesk } from '../services/streamingLocalizationDesk';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Localization Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, weekly: number, bank: number): Player => ({
    ...player, energy: { ...player.energy, current: weekly + bank, max: weekly + bank },
    flags: { ...player.flags, weeklyBaseEnergyRemaining: weekly, bonusEnergyBank: bank },
});
const withTreasury = (player: Player, treasuryCash: number): Player => ({
    ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, treasuryCash },
});
const refused = (label: string, result: StreamingLocalizationActionResult, reason: string, player: Player) => {
    assert.equal(result.changed, false, `${label} is refused`);
    assert.equal(result.reason, reason, `${label}: ${reason}`);
    assert.equal(result.player, player, `${label}: the save is untouched`);
};
const region = (player: Player, packageId: string) => resolveStreamingLocalizationRegions(player.ownedStreamingPlatform).find(row => row.packageId === packageId)!;
const lastLocalization = (player: Player) => player.world.worldStreamingViewing!.snapshots.at(-1)!.localization!;
const playerOffer = (player: Player) => getWorldStreamingOffers(player, weekOf(player)).offers.find(offer => offer.isPlayer)!;
const fmt = (value: number) => Math.round(value).toLocaleString('en-US');
const press = (player: Player, packageId: string, track: StreamingLocalizationTrack, amount: number | 'FILL') =>
    contributeStreamingLocalizationEnergy(player, packageId, track, amount);

async function main() {
    const started = performance.now();

    /* ── the rules ── */
    assert.deepEqual(STREAMING_LOCALIZATION_LEVEL_ENERGY.SUBTITLES, [10, 20, 30]);
    assert.deepEqual(STREAMING_LOCALIZATION_LEVEL_ENERGY.DUBBING, [20, 30, 40]);
    assert.deepEqual([1, 2, 5, 8, 9, 40].map(streamingLocalizationLevelNeeded), [3, 2, 2, 2, 1, 1], 'Premieres need 3, new releases 2, the library 1');
    const india = { packageId: 'INDIA_CORE', subtitleLevel: 2 as const, dubbingLevel: 1 as const };
    const fits = [20, 5, 1].map(weeks => Math.round(resolveTitleLanguageFit(india, weeks) * 100));
    assert.deepEqual(fits, [106, 76, 58], 'Subtitles 2 + Dubbing 1: the library plays local, new releases get subtitles, premieres wait for level 3');
    assert.equal(Math.round(resolveTitleLanguageFit({ packageId: null, subtitleLevel: 0, dubbingLevel: 0 }, 20) * 100), 42);
    assert.deepEqual([...STREAMING_LOCALIZATION_REGION_ORDER].map(id => STREAMING_LOCALIZATION_REGION_META[id].accent),
        ['#7c4dff', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#c026d3'], 'The validated colour order');
    // Seven groups: every country in the world has one by its main language.
    const homes = Object.values(STREAMING_LOCALIZATION_HOME_COUNTRIES).flat();
    assert.equal(homes.length, WORLD_COUNTRY_DEFINITIONS.length, 'Every country has exactly one group');
    assert.equal(new Set(homes).size, WORLD_COUNTRY_DEFINITIONS.length, 'No country is in two groups');
    assert.ok(['CN', 'TW'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.EAST_ASIA_CORE.includes(id)), 'China and Taiwan are East Asia');
    assert.ok(['PK', 'NP', 'LK'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.INDIA_CORE.includes(id)), 'Pakistan, Nepal and Sri Lanka are South Asia');
    assert.ok(['RU', 'PL', 'UA', 'KZ'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.EASTERN_EUROPE_CENTRAL_ASIA_CORE.includes(id)), 'Russia, Poland, Ukraine and Kazakhstan are Eastern Europe & Central Asia');
    assert.ok(['VN', 'MM'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.SOUTHEAST_ASIA_CORE.includes(id)) && ['IR', 'TR', 'ET'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.MIDDLE_EAST_AFRICA_CORE.includes(id))
        && ['NL', 'SE'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.WESTERN_EUROPE_CORE.includes(id)), 'The rest of the world joins the groups it borders');
    assert.ok(STREAMING_LOCALIZATION_HOME_COUNTRIES.INDIA_CORE.includes('IN'), 'India is on India\'s map');
    assert.ok(['BR', 'MX'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.LATIN_AMERICA_CORE.includes(id)), 'Brazil and Mexico are on Latin America\'s map');
    assert.ok(['JP', 'KR'].every(id => STREAMING_LOCALIZATION_HOME_COUNTRIES.EAST_ASIA_CORE.includes(id)), 'Japan and Korea are on East Asia\'s map');
    console.log(`PASS rules: energy 10/20/30 and 20/30/40; library → new releases → day-one premieres; Subtitles 2 + Dubbing 1 plays ${fits.join(' / ')}% (closed 42%)`);

    /* ── the test company ── */
    const base = await buildStreamingFullPlatformQa(fresh('localization-regions-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const open = resolveStreamingLocalizationRegions(base.ownedStreamingPlatform).filter(row => row.unlocked)
        .map(row => `${row.packageId}:${row.subtitleLevel}/${row.dubbingLevel}`).sort();
    assert.deepEqual(open, ['INDIA_CORE:0/0', 'LATIN_AMERICA_CORE:2/0', 'WESTERN_EUROPE_CORE:2/1'], 'Three regions set up with their levels');
    assert.ok(!base.ownedStreamingPlatform.capabilities.installed.some(row => row.capabilityId === 'LOCALIZATION_FOUNDATION'), 'No campus research stood before a region');
    assert.equal(region(base, 'LATIN_AMERICA_CORE').dubbingProgress, 10, 'Latin America Dubbing 1 holds 10 of 20');
    assert.equal(region(base, 'INDIA_CORE').subtitleProgress, 5, 'India Subtitles 1 holds 5 of 10');
    assert.equal((base.ownedStreamingPlatform.localizationOperations as { research?: unknown }).research, undefined, 'No lab in the save');
    const viewing = base.world.worldStreamingViewing!;
    assert.equal(normalizeWorldStreamingViewingState(viewing, base, viewing.lastProcessedAbsoluteWeek), viewing, 'The saved week stays valid with its localization figures (loading rebuilds nothing)');
    const series = viewing.snapshots.filter(row => row.localization).map(row => ({ added: row.localization!.addedViewingAccounts, localized: row.localization!.localizedViewingAccounts }));
    console.log(`  added a week: ${series.map(row => fmt(row.added)).join(' → ')}`);
    const firstOpenWeek = series.findIndex(row => row.added > 0);
    assert.ok(firstOpenWeek >= 0, 'Some week has viewers added by localization');
    assert.ok(series.slice(0, firstOpenWeek).every(row => row.added === 0 && row.localized === 0), 'Before any region: nothing added, nobody watching through one');
    assert.ok(series.at(-1)!.added > series[firstOpenWeek].added, 'With more levels, more viewers are added');
    const totals = lastLocalization(base);
    const rows = Object.values(totals.byPackage);
    assert.equal(rows.reduce((sum, row) => sum + row.added, 0), totals.addedViewingAccounts, 'Regions add up to the total added');
    assert.equal(rows.reduce((sum, row) => sum + row.localized, 0), totals.localizedViewingAccounts, 'Regions add up to the total watched in their language');
    assert.equal(rows.reduce((sum, row) => sum + (row.untapped || 0), 0), totals.untappedViewingAccounts, 'Regions add up to the total untapped');
    assert.ok(totals.localizedViewingAccounts > 0 && totals.localizedViewingAccounts <= totals.playerViewingAccounts, 'Watched in their language is part of everyone who watched');
    assert.ok((totals.byPackage.LATIN_AMERICA_CORE?.top || []).length > 0, 'A set-up region knows its most-watched titles in its languages');
    assert.ok((totals.untappedViewingAccounts || 0) > 0, 'Some other-language viewing is still untapped');
    console.log(`PASS company: ${open.join(', ')}; this week ${fmt(totals.localizedViewingAccounts)} of ${fmt(totals.playerViewingAccounts)} in their language, ${fmt(totals.addedViewingAccounts)} added, ${fmt(totals.untappedViewingAccounts || 0)} untapped`);

    /* ── the desk ── */
    const desk = getStreamingLocalizationDesk(base);
    assert.deepEqual(desk.regions.map(row => row.packageId), [...STREAMING_LOCALIZATION_REGION_ORDER]);
    assert.ok(desk.live && desk.week && desk.week.added === totals.addedViewingAccounts, 'The desk shows the last processed week');
    assert.ok(desk.trend.length >= 2 && desk.trend.length <= 12 && desk.trend.some(point => point.markers.length), 'Twelve weeks with level markers');
    const latam = desk.regions.find(row => row.packageId === 'LATIN_AMERICA_CORE')!;
    assert.deepEqual(latam.tracks.SUBTITLES.tiers.map(tier => tier.state), ['DONE', 'DONE', 'NEXT']);
    assert.deepEqual(latam.tracks.DUBBING.tiers.map(tier => `${tier.state}:${tier.progress}/${tier.energy}`), ['NEXT:10/20', 'LATER:0/30', 'LATER:0/40']);
    assert.ok(latam.tracks.SUBTITLES.tiers.every(tier => tier.reach.note.length > 0), 'Each level says which titles it brings');
    assert.ok(latam.week && latam.week.added > 0 && latam.topTitles.length > 0 && latam.since && !latam.since.pending, 'Latin America shows its week, its titles and its change since its last level');
    assert.ok(latam.homeCountryIds.includes('BR') && latam.markets.countryIds.length > 0, 'Its map and its pins');
    const eastAsia = desk.regions.find(row => row.packageId === 'EAST_ASIA_CORE')!;
    assert.ok(!eastAsia.open && eastAsia.openCost === 12_000_000 && eastAsia.week === null, 'East Asia not set up');
    assert.ok(desk.insights.topTitles.length > 0 && desk.insights.audienceByLanguage.length > 0, 'The language report has titles and languages');
    assert.ok(Math.abs(desk.insights.audienceByLanguage.reduce((sum, row) => sum + row.share, 0) - 1) < 1e-6, 'Audience shares add up to everyone');
    console.log(`PASS desk: Latin America ladders ${latam.tracks.SUBTITLES.level}/${latam.tracks.DUBBING.level}, "${latam.tracks.SUBTITLES.tiers[2].reach.note}"; travelling best: ${desk.insights.topTitles[0].title} (${fmt(desk.insights.topTitles[0].viewers)}); top language ${desk.insights.audienceByLanguage[0].language}`);

    /* ── refusals leave the save untouched ── */
    refused('Energy for a region not set up', press(base, 'EAST_ASIA_CORE', 'SUBTITLES', 5), 'REGION_LOCKED', base);
    refused('An unknown region', press(base, 'MOON_CORE', 'SUBTITLES', 5), 'UNKNOWN_REGION', base);
    refused('Setting up a set-up region', unlockStreamingLocalizationRegion(base, 'INDIA_CORE'), 'ALREADY_OPEN', base);
    refused('Setting up an unknown region', unlockStreamingLocalizationRegion(base, 'MOON_CORE'), 'UNKNOWN_REGION', base);
    const poor = withTreasury(base, 0);
    refused('Setting up without the cash', unlockStreamingLocalizationRegion(poor, 'EAST_ASIA_CORE'), 'INSUFFICIENT_TREASURY', poor);
    const topped = press(withEnergy(base, 100, 0), 'WESTERN_EUROPE_CORE', 'SUBTITLES', 'FILL');
    assert.ok(topped.completed?.level === 3, 'Subtitles 3 reached with a FILL of 30');
    refused('Past level 3', press(topped.player, 'WESTERN_EUROPE_CORE', 'SUBTITLES', 5), 'MAX_LEVEL', topped.player);
    console.log('PASS refusals: not set up, unknown, already set up, no cash, past level 3');

    /* ── set up: cash only ── */
    const setUp = unlockStreamingLocalizationRegion(base, 'EAST_ASIA_CORE');
    assert.ok(setUp.changed);
    assert.equal(base.ownedStreamingPlatform.treasuryCash - setUp.player.ownedStreamingPlatform.treasuryCash, 12_000_000);
    assert.ok(setUp.player.ownedStreamingPlatform.costCommitments.some(row => row.label === 'East Asia Core Languages' && row.weeklyAmount === 120_000));
    assert.equal(setUp.player.energy.current, base.energy.current, 'Setting up costs no energy');
    const firstPress = press(withEnergy(setUp.player, 100, 0), 'EAST_ASIA_CORE', 'DUBBING', 5);
    assert.ok(firstPress.changed && firstPress.contributed === 5, 'Energy goes straight in after setup: no start, no lab');
    assert.equal(firstPress.player.ownedStreamingPlatform.treasuryCash, setUp.player.ownedStreamingPlatform.treasuryCash, 'A level costs no cash');
    console.log('PASS set up: East Asia for $12M (+$120K a week), no energy; energy straight into Dubbing 1, no cash');

    /* ── energy: kept between presses, this week first, then the bank ── */
    let player = withEnergy(base, 7, 0);
    let step = press(player, 'INDIA_CORE', 'SUBTITLES', 5);
    assert.ok(step.changed && step.contributed === 5 && step.completed?.level === 1, 'India Subtitles 1: 5 + 5 of 10 reaches it');
    assert.equal(step.player.flags.weeklyBaseEnergyRemaining, 2);
    assert.equal(player.flags.weeklyBaseEnergyRemaining, 7, 'The old save is not mutated');
    assert.equal(region(step.player, 'INDIA_CORE').subtitleLevel, 1);
    assert.equal(region(step.player, 'INDIA_CORE').subtitleProgress, 0, 'Progress starts again for the next level');
    player = step.player;
    refused('A press with 2⚡ left', press(player, 'LATIN_AMERICA_CORE', 'DUBBING', 5), 'INSUFFICIENT_ENERGY', player);
    step = press(player, 'LATIN_AMERICA_CORE', 'DUBBING', 'FILL');
    assert.ok(step.changed && step.contributed === 2 && !step.completed, 'FILL puts in what there is');
    assert.equal(region(step.player, 'LATIN_AMERICA_CORE').dubbingProgress, 12, 'Kept: 10 + 2');
    player = withEnergy(step.player, 0, 100);
    const before = player;
    step = press(player, 'LATIN_AMERICA_CORE', 'DUBBING', 'FILL');
    assert.ok(step.changed && step.contributed === 8 && step.completed?.level === 1, 'FILL finishes it');
    assert.equal(step.player.flags.bonusEnergyBank, 92, 'The bank pays when this week is spent');
    player = step.player;
    const milestone = player.ownedStreamingPlatform.localizationOperations.regions!.find(row => row.packageId === 'LATIN_AMERICA_CORE')!.milestones.at(-1)!;
    const baselineRow = lastLocalization(before).byPackage.LATIN_AMERICA_CORE;
    assert.deepEqual([milestone.track, milestone.level, milestone.baselineAbsoluteWeek, milestone.baselineAddedViewers, milestone.baselineLocalizedViewers],
        ['DUBBING', 1, before.world.worldStreamingViewing!.snapshots.at(-1)!.absoluteWeek, baselineRow.added, baselineRow.localized], 'The milestone keeps the week it started from');
    assert.ok(player.ownedStreamingPlatform.eventLedger.some(row => row.type === 'TITLE_LOCALIZATION_READY' && row.metadata?.packageId === 'LATIN_AMERICA_CORE'));
    assert.ok((player.flags.weeklyEnergySpendLog || []).some((row: { label: string }) => row.label.startsWith('Localization: Latin America')), 'The energy log names it');
    console.log('PASS energy: India Subtitles 1 reached (5 + 5), a press with 2 left is refused, FILL puts 2 (10 → 12) then 8 from the bank; milestone and ledger written');

    /* ── the campus no longer offers localization research ── */
    const portfolio = getStreamingResearchPortfolio(base);
    assert.ok(!portfolio.programs.some(row => row.definition.installTargetType === 'LOCALIZATION_CAPABILITY'), 'No campus localization programme on offer');
    const campus = startStreamingResearchProgram(base, 'subtitle-operations-l1', 'BALANCED');
    assert.ok(!campus.changed && /Content Desk/.test(campus.reason || ''), 'Starting one points to the Content Desk');
    console.log('PASS campus: localization research is no longer offered there');

    /* ── A/B: the same weeks with and without one more level ── */
    const withLevel = withEnergy(base, 100, 0);
    const finished = press(withLevel, 'LATIN_AMERICA_CORE', 'DUBBING', 'FILL');
    assert.ok(finished.completed);
    const markets = measureStreamingLocalizationRegion(base, 'LATIN_AMERICA_CORE').countries.map(row => row.countryId);
    const indexA = playerOffer(withLevel).localizationStrengthByCountry!;
    const indexB = playerOffer(finished.player).localizationStrengthByCountry!;
    const raised = markets.filter(id => (indexB[id] ?? 0) > (indexA[id] ?? 0));
    assert.ok(raised.length > 0, 'The offer is easier to choose in the region\'s markets');
    assert.ok(Object.keys(indexA).filter(id => !markets.includes(id)).every(id => indexA[id] === indexB[id]), 'Markets the region does not reach are unchanged');
    let a = withLevel;
    let b = finished.player;
    for (let index = 0; index < 3; index += 1) {
        a = (await processGameWeek(a)).player;
        b = (await processGameWeek(b)).player;
    }
    const rowA = lastLocalization(a).byPackage.LATIN_AMERICA_CORE;
    const rowB = lastLocalization(b).byPackage.LATIN_AMERICA_CORE;
    const subsA = measureStreamingLocalizationRegion(a, 'LATIN_AMERICA_CORE').subscribers;
    const subsB = measureStreamingLocalizationRegion(b, 'LATIN_AMERICA_CORE').subscribers;
    console.log(`  Latin America after 3 weeks · without / with Dubbing 1: added ${fmt(rowA.added)} / ${fmt(rowB.added)}, in their language ${fmt(rowA.localized)} / ${fmt(rowB.localized)}, untapped ${fmt(rowA.untapped || 0)} / ${fmt(rowB.untapped || 0)}, subscribers ${fmt(subsA)} / ${fmt(subsB)}`);
    assert.ok(rowB.added > rowA.added, 'One more level adds more viewers');
    assert.ok(rowB.localized >= rowA.localized, 'At least as many watch in their own language');
    assert.ok(subsB > subsA, 'More subscribe in the region\'s markets');
    assert.ok(lastLocalization(b).playerViewingAccounts > lastLocalization(a).playerViewingAccounts, 'The service is watched more overall');
    console.log(`PASS A/B: Dubbing 1 (the library) → +${fmt(rowB.added - rowA.added)} added a week, +${fmt(subsB - subsA)} subscribers in ${markets.length} markets; offer index up in ${raised.length}, unchanged elsewhere`);

    /* ── no region set up: nothing changes ── */
    const bare: Player = { ...base, ownedStreamingPlatform: normalizeOwnedStreamingPlatformState({
        ...base.ownedStreamingPlatform,
        capabilities: { ...base.ownedStreamingPlatform.capabilities,
            installed: base.ownedStreamingPlatform.capabilities.installed.filter(row => !row.capabilityId.startsWith('LANGUAGE_PACKAGE:')) },
        localizationOperations: { ...base.ownedStreamingPlatform.localizationOperations, regions: [] },
    }, base.id) };
    const bareOffer = playerOffer(bare);
    assert.ok(Object.values(bareOffer.localizationStrengthByCountry!).every(value => value === bareOffer.localizationStrengthIndex), 'No region: every market keeps the plain index');
    assert.equal(createStreamingCountryLocalizationResolver(bare.ownedStreamingPlatform)(['Portuguese']).packageId, null);
    const bareWeek = (await processGameWeek(bare)).player;
    assert.deepEqual([lastLocalization(bareWeek).addedViewingAccounts, lastLocalization(bareWeek).localizedViewingAccounts], [0, 0], 'No region: nothing added, nobody watching through one');
    assert.ok((lastLocalization(bareWeek).untappedViewingAccounts || 0) > 0, 'No region: every other-language viewer is untapped');
    console.log('PASS no region: the offer and the week are as before localization');

    /* ── older saves ── */
    const legacyRoot = structuredClone(base.ownedStreamingPlatform) as any;
    delete legacyRoot.localizationOperations.regions;
    legacyRoot.capabilities.installed.push(
        { capabilityId: 'LOCALIZATION_FOUNDATION', branch: 'CONTENT_OPERATIONS', status: 'OPERATING', installedAtAbsoluteWeek: 1, sourceProjectId: null, legacyLevelFloor: 0 },
        { capabilityId: 'SUBTITLE_OPERATIONS_L1', branch: 'CONTENT_OPERATIONS', status: 'OPERATING', installedAtAbsoluteWeek: 1, sourceProjectId: null, legacyLevelFloor: 0 },
    );
    const once = normalizeOwnedStreamingPlatformState(legacyRoot, base.id);
    const twice = normalizeOwnedStreamingPlatformState(once, base.id);
    assert.deepEqual(once.localizationOperations.regions, []);
    assert.equal(JSON.stringify(twice), JSON.stringify(once), 'Normalising is idempotent');
    assert.equal(once.treasuryCash, base.ownedStreamingPlatform.treasuryCash, 'Loading never moves cash');
    const legacyRegions = resolveStreamingLocalizationRegions(once);
    assert.ok(legacyRegions.filter(row => row.unlocked).every(row => row.subtitleLevel === 1), 'Campus Subtitles 1 still counts in every set-up region');
    assert.ok(legacyRegions.filter(row => !row.unlocked).every(row => row.subtitleLevel === 0), '…and nowhere a region is not set up');
    // A save from #23 kept levels "in the lab": their energy becomes the track's progress.
    const labRoot = structuredClone(base.ownedStreamingPlatform) as any;
    labRoot.localizationOperations.regions = labRoot.localizationOperations.regions.map((row: any) => ({ ...row, subtitleProgress: undefined, dubbingProgress: undefined }));
    labRoot.localizationOperations.research = [
        { id: 'lab-a', packageId: 'LATIN_AMERICA_CORE', track: 'DUBBING', level: 1, cashCost: 3_000_000, energyRequired: 20, energyContributed: 15, status: 'ACTIVE', startedAtAbsoluteWeek: 1 },
        { id: 'lab-b', packageId: 'WESTERN_EUROPE_CORE', track: 'SUBTITLES', level: 1, cashCost: 1_000_000, energyRequired: 10, energyContributed: 5, status: 'PAUSED', startedAtAbsoluteWeek: 1 },
    ];
    const migrated = normalizeOwnedStreamingPlatformState(labRoot, base.id);
    const migratedRegions = new Map(migrated.localizationOperations.regions!.map(row => [row.packageId, row]));
    assert.equal(migratedRegions.get('LATIN_AMERICA_CORE')!.dubbingProgress, 15, 'Lab energy toward the next level becomes progress');
    assert.equal(migratedRegions.get('WESTERN_EUROPE_CORE')!.subtitleProgress, 0, 'Lab energy for a level already passed is dropped');
    assert.equal((migrated.localizationOperations as { research?: unknown }).research, undefined, 'The lab is not written back');
    assert.equal(JSON.stringify(normalizeOwnedStreamingPlatformState(migrated, base.id)), JSON.stringify(migrated), 'The migration is idempotent');
    console.log('PASS older saves: none and idempotent, cash unchanged, campus tiers kept; a #23 lab becomes track progress');

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s · save ${(JSON.stringify(base).length / 1e6).toFixed(1)} MB`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
