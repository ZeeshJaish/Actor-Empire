/** Ads tech, Phase 4 #61 (codex-handoff/plans/platform-tech-plan.md §4.1 row 11: "Ads tech | Ad
 *  targeting, Smarter ad breaks, New ad formats | More ad revenue per hour; fewer ad minutes needed for
 *  the same money"; §4.3: ADVERTISING_COMMERCE = Ads tech, plus product launches as today; §13 Phase 4:
 *  "ads tech raises ad revenue per hour"). Checks:
 *  - the catalogue: the targeting ladder, its starter and the side lines;
 *  - the bridge: Commerce from the best targeting step, never lowered;
 *  - old saves: Commerce 12 → Contextual targeting, 30 → + Audience targeting, 50 → + Precision
 *    targeting (never AI ad matching or a side line); a schema-7 tree joins once;
 *  - the ad market: New ad formats sells more slots at the same minutes (so fewer minutes earn the
 *    same), Smarter ad breaks keeps viewers through long breaks; a supply without them is as before;
 *  - one real week on the test company, A/B: more ad revenue, at a better rate with Precision
 *    targeting and with more slots with New ad formats; Smarter ad breaks: ads cost viewers less;
 *  - the Tech tab, STATUS and Product Lab's words. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { STREAMING_INCORPORATION_ECONOMY } from '../services/streamingEconomy';
import {
    STREAMING_TECH_TREE_SCHEMA, applyStreamingTechBridge, convertStreamingTechTreeFromLevels, deriveStreamingTechEngineLevel, getStreamingTechGroupLadder,
    normalizeStreamingTechTreeState, streamingTechAdEffects,
} from '../services/streamingTechTreeCatalogue';
import { unlockStreamingTech } from '../services/streamingTechTree';
import { clearStreamingAdMarket, type StreamingAdMarketSupply } from '../services/worldEconomy/worldStreamingAdMarket';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { getStreamingProductSuite } from '../services/streamingProductSuite';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Ads Tech Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const owned = (state: OwnedStreamingTechTreeState) => Object.keys(state.techs).filter(id => id.startsWith('ADS_')).sort();
const withTechs = (state: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...state,
    techs: { ...state.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const ladder = getStreamingTechGroupLadder('ADS');
    assert.deepEqual(ladder.map(item => `${item.name}${item.sideLine ? '*' : ''}${item.starter ? '(start)' : ''}${item.futuristic ? '✦' : ''}`), [
        'Basic ad server(start)', 'Contextual targeting', 'Audience targeting', 'Precision targeting', 'AI ad matching✦', 'Smarter ad breaks*', 'New ad formats*',
    ]);
    assert.deepEqual(ladder.filter(item => !item.starter).map(item => item.unlockCost / 1e6), [6, 20, 60, 150, 8, 15], 'Prices in $M');
    assert.equal(STREAMING_TECH_TREE_SCHEMA, 8);
    console.log(`PASS catalogue: ${ladder.map(item => item.name).join(', ')}`);

    /* ── the bridge ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    const targeting = withTechs(bare, [['ADS_CONTEXTUAL', 1], ['ADS_AUDIENCE', 2]]);
    assert.equal(deriveStreamingTechEngineLevel(targeting, 'ADVERTISING_COMMERCE'), 34, 'Commerce = the best targeting step (Audience targeting v2 34)');
    const levels = { PLAYBACK_QUALITY: 0, DELIVERY_CAPACITY: 0, RELIABILITY: 0, DATA_RECOMMENDATIONS: 0, SECURITY: 0, CONTENT_OPERATIONS: 0, ADVERTISING_COMMERCE: 10, PRODUCT_EXPERIENCE: 0 };
    assert.deepEqual([applyStreamingTechBridge(levels, targeting).ADVERTISING_COMMERCE, applyStreamingTechBridge({ ...levels, ADVERTISING_COMMERCE: 35 }, targeting).ADVERTISING_COMMERCE], [34, 35],
        'Raised to what the tree stands for, never lowered (a Product Lab launch can still raise it)');
    console.log('PASS bridge: Commerce 34 from Audience targeting v2; never lowered');

    /* ── old saves ── */
    const adsOf = (commerce: number) => owned(convertStreamingTechTreeFromLevels({ ADVERTISING_COMMERCE: commerce }));
    assert.deepEqual([adsOf(11), adsOf(12), adsOf(34), adsOf(100)], [
        ['ADS_BASIC'], ['ADS_BASIC', 'ADS_CONTEXTUAL'], ['ADS_AUDIENCE', 'ADS_BASIC', 'ADS_CONTEXTUAL'], ['ADS_AUDIENCE', 'ADS_BASIC', 'ADS_CONTEXTUAL', 'ADS_PRECISION'],
    ], 'Commerce 12 → Contextual targeting, 30 → Audience targeting, 50 → Precision targeting; never AI ad matching or a side line');
    const schemaSeven = { schemaVersion: 7, convertedFromLegacy: false, techs: { PICTURE_1080P: { version: 1 } } };
    const joined = normalizeStreamingTechTreeState(schemaSeven, { ADVERTISING_COMMERCE: 34 });
    assert.deepEqual([joined.schemaVersion, owned(joined), joined.techs.ADS_AUDIENCE?.granted], [8, ['ADS_AUDIENCE', 'ADS_BASIC', 'ADS_CONTEXTUAL'], true], 'A schema-7 tree joins once');
    assert.deepEqual(owned(normalizeStreamingTechTreeState({ ...joined, techs: { ...joined.techs, ADS_AUDIENCE: undefined } }, { ADVERTISING_COMMERCE: 34 })),
        ['ADS_BASIC', 'ADS_CONTEXTUAL'], 'Never again');
    console.log('PASS old saves: Commerce 12 → Contextual targeting, 30 → + Audience targeting, 50 → + Precision targeting; a schema-7 tree joins once');

    /* ── the ad market ── */
    assert.deepEqual(streamingTechAdEffects(bare), { slots: 1, breakSlope: 1, annoyance: 1 }, 'Neither side line: as before');
    assert.deepEqual(streamingTechAdEffects(withTechs(bare, [['ADS_FORMATS', 3], ['ADS_BREAKS', 2]])), { slots: 1.2, breakSlope: .55, annoyance: .85 });
    const supply = (rows: Partial<StreamingAdMarketSupply>): StreamingAdMarketSupply => ({
        platformId: 'PLAYER', eligibleHours: 2_000_000, minutesPerHour: 4, audienceQualityIndex: 34, brandSafetyIndex: 60, ...rows,
    });
    const rival: StreamingAdMarketSupply = { platformId: 'RIVAL', eligibleHours: 3_000_000, minutesPerHour: 8, audienceQualityIndex: 50, brandSafetyIndex: 55 };
    const market = (player: StreamingAdMarketSupply, budget = 400_000) => clearStreamingAdMarket({
        countryId: 'US', absoluteWeek: 900, advertiserDemandBudget: budget, marketReferenceCpm: 18, suppliers: [rival, player],
    });
    const plain = market(supply({}));
    assert.deepEqual(market(supply({ slotFactor: 1, breakSlope: 1 })), plain, 'Factors of 1: exactly as without them');
    const formats = market(supply({ slotFactor: 1.2 }));
    assert.equal(formats.byPlatform.PLAYER.availableImpressions, Math.floor(plain.byPlatform.PLAYER.availableImpressions * 1.2), 'New ad formats v3: 20% more slots at 4 minutes an hour');
    assert.ok(formats.byPlatform.PLAYER.revenue > plain.byPlatform.PLAYER.revenue, 'More slots, more of the pool');
    const moreMinutes = market(supply({ minutesPerHour: 4.8 }));
    assert.equal(formats.byPlatform.PLAYER.revenue, moreMinutes.byPlatform.PLAYER.revenue, 'Formats at 4 minutes earn what 4.8 minutes did: fewer minutes, the same money');
    const longBreaks = market(supply({ minutesPerHour: 12 }));
    const smartBreaks = market(supply({ minutesPerHour: 12, breakSlope: .4 }));
    assert.ok(smartBreaks.byPlatform.PLAYER.availableImpressions > longBreaks.byPlatform.PLAYER.availableImpressions, 'At 12 minutes an hour, Smarter ad breaks keeps more of the audience');
    assert.deepEqual(market(supply({ minutesPerHour: 6, breakSlope: .4 })).byPlatform.PLAYER, market(supply({ minutesPerHour: 6 })).byPlatform.PLAYER, 'Up to six minutes nobody is lost, so breaks change nothing');
    console.log(`PASS ad market: New ad formats v3 slots ${plain.byPlatform.PLAYER.availableImpressions.toLocaleString()} → ${formats.byPlatform.PLAYER.availableImpressions.toLocaleString()}, revenue $${plain.byPlatform.PLAYER.revenue.toLocaleString()} → $${formats.byPlatform.PLAYER.revenue.toLocaleString()} (what 4.8 minutes earned); at 12 minutes Smarter ad breaks v3 slots ${longBreaks.byPlatform.PLAYER.availableImpressions.toLocaleString()} → ${smartBreaks.byPlatform.PLAYER.availableImpressions.toLocaleString()}`);

    /* ── the test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('ads-tech-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    assert.deepEqual([base.technologyLevels.ADVERTISING_COMMERCE, owned(base.techTree!)], [34, ['ADS_AUDIENCE', 'ADS_BASIC', 'ADS_CONTEXTUAL']], 'Commerce 34: Contextual and Audience targeting, given');
    assert.equal(getWorldStreamingOffers(qa, week).offers.find(item => item.isPlayer)!.adPenaltyFactor, undefined, 'Without Smarter ad breaks: not set');
    const playerWith = (state: OwnedStreamingTechTreeState, extra: Partial<OwnedStreamingPlatformState> = {}): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...base, ...extra, techTree: state } as OwnedStreamingPlatformState, qa.id),
    });

    /* ── one real week, A/B ── */
    const weekOf = async (player: Player) => {
        const next = (await processGameWeek(player)).player;
        const viewing = next.world.worldStreamingViewing!.platforms!.PLAYER!;
        return { revenue: viewing.revenue.advertisingRevenue, impressions: viewing.revenue.advertisingImpressions, hours: viewing.totalHoursViewed,
            freeViewers: viewing.accessMix.freeViewingAccounts || 0,
        };
    };
    const cpm = (row: { revenue: number; impressions: number }) => row.revenue / Math.max(1, row.impressions) * 1_000;
    const plainWeek = await weekOf(qa);
    const precision = unlockStreamingTech({ ...qa, ownedStreamingPlatform: { ...qa.ownedStreamingPlatform, treasuryCash: Math.max(qa.ownedStreamingPlatform.treasuryCash, 200_000_000) } }, 'ADS_PRECISION');
    assert.ok(precision.changed, `Unlock Precision targeting: ${precision.reason}`);
    assert.equal(precision.player.ownedStreamingPlatform.technologyLevels.ADVERTISING_COMMERCE, 50, 'Precision targeting raises Commerce 34 → 50');
    const precisionWeek = await weekOf(precision.player);
    const formatsWeek = await weekOf(playerWith(withTechs(base.techTree!, [['ADS_FORMATS', 3]])));
    const breaksWeek = await weekOf(playerWith(withTechs(base.techTree!, [['ADS_BREAKS', 3]])));
    assert.ok(plainWeek.revenue > 0, `The test company sells ads (${plainWeek.revenue.toLocaleString()})`);
    assert.ok(precisionWeek.revenue > plainWeek.revenue && cpm(precisionWeek) > cpm(plainWeek),
        `Precision targeting: ad revenue $${plainWeek.revenue.toLocaleString()} → $${precisionWeek.revenue.toLocaleString()}, rate $${cpm(plainWeek).toFixed(2)} → $${cpm(precisionWeek).toFixed(2)}`);
    assert.ok(formatsWeek.revenue > plainWeek.revenue && formatsWeek.impressions > plainWeek.impressions,
        `New ad formats v3: ad revenue $${plainWeek.revenue.toLocaleString()} → $${formatsWeek.revenue.toLocaleString()}, impressions ${plainWeek.impressions.toLocaleString()} → ${formatsWeek.impressions.toLocaleString()}`);
    // the test company's paid plans carry no ads, so Smarter ad breaks shows in its free tier: its ads cost viewers less
    assert.ok(breaksWeek.freeViewers > plainWeek.freeViewers && breaksWeek.revenue > plainWeek.revenue,
        `Smarter ad breaks v3: free viewers ${plainWeek.freeViewers.toLocaleString()} → ${breaksWeek.freeViewers.toLocaleString()}, ad revenue $${plainWeek.revenue.toLocaleString()} → $${breaksWeek.revenue.toLocaleString()}`);
    const perHour = (row: { revenue: number; hours: number }) => row.revenue / Math.max(1, row.hours) * 1_000;
    console.log(`PASS week: ad revenue $${plainWeek.revenue.toLocaleString()} ($${perHour(plainWeek).toFixed(2)} per 1,000 hours watched, $${cpm(plainWeek).toFixed(2)} per 1,000 ads) → Precision targeting $${precisionWeek.revenue.toLocaleString()} ($${perHour(precisionWeek).toFixed(2)}, $${cpm(precisionWeek).toFixed(2)}) → New ad formats v3 $${formatsWeek.revenue.toLocaleString()} ($${perHour(formatsWeek).toFixed(2)}, ${plainWeek.impressions.toLocaleString()} → ${formatsWeek.impressions.toLocaleString()} ads); Smarter ad breaks v3 free viewers ${plainWeek.freeViewers.toLocaleString()} → ${breaksWeek.freeViewers.toLocaleString()}, ad revenue $${breaksWeek.revenue.toLocaleString()}`);

    /* ── the Tech tab, STATUS, Product Lab ── */
    const desk = getStreamingTechDesk(qa);
    const group = desk.groups.find(item => item.id === 'ADS')!;
    const step = (id: string) => group.steps.find(item => item.id === id)!;
    assert.deepEqual([group.accent, group.name, group.best?.id], ['#2dd4bf', 'Ads tech', 'ADS_AUDIENCE']);
    assert.deepEqual(step('ADS_FORMATS').more, ['+10% ad slots an hour, same ad minutes']);
    assert.deepEqual(step('ADS_BREAKS').more, ['Long ad breaks lose 30% fewer viewers', 'Viewers mind ads 10% less']);
    const precisionStep = step('ADS_PRECISION').effect;
    assert.ok(precisionStep?.kind === 'ADS' && precisionStep.now.commerce === 34 && precisionStep.next.commerce === 50, 'Precision targeting: Commerce 34 → 50');
    const row = getStreamingStatusBoard(qa).sections.find(section => section.id === 'TECH')!.rows.find(item => item.id === 'TECH:ADS')!;
    assert.deepEqual([row.status, row.detail], ['WORKING', 'Audience targeting · Basic']);
    let founded = fresh('ads-tech-founded');
    const platform = normalizeOwnedStreamingPlatformState(founded.ownedStreamingPlatform, founded.id);
    founded = {
        ...founded, money: STREAMING_INCORPORATION_ECONOMY.cashRequired, stats: { ...founded.stats, fame: 80, reputation: 80 },
        ownedStreamingPlatform: { ...platform, lifecycle: 'ELIGIBLE', milestoneKeys: [...new Set([...platform.milestoneKeys, 'streaming-launch-clearance'])] },
    };
    const company = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(founded, {
        ...createDefaultStreamingFoundingDraft(getAbsoluteWeek(founded.age, founded.currentWeek)), currentStep: 2, name: 'SPOTLIGHT', primaryColor: '#2DD4BF', secondaryColor: '#071311',
    }));
    assert.ok(company.changed, `The company is registered: ${company.reason}`);
    const store = getStreamingProductSuite(company.player).lines.find(line => line.definition.id === 'STORE')!;
    assert.ok(store.blockers.includes('EMPIRE+ Free or Commerce Level 20 required (Ads tech in Tech)'), `Product Lab says where Commerce is built: ${store.blockers.join('; ')}`);
    console.log(`PASS tech tab, status and Product Lab: teal; New ad formats "${step('ADS_FORMATS').more[0]}"; Smarter ad breaks "${step('ADS_BREAKS').more.join('", "')}"; Precision targeting Commerce 34 → 50; STATUS "${row.detail}"; Product Lab "…Commerce Level 20 required (Ads tech in Tech)"`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
