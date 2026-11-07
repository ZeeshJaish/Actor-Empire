/** How often incidents come and which kinds, #73 and #74 (codex-handoff/plans/platform-tech-plan.md §7, §14;
 *  Zeesh: "do mahine ke andar ek se teen incident … stabilization optimization isko aur reduce kar sakta hai …
 *  kisi do mahine ke gap mein ek bhi incident na aaye", and "agar piracy wala cheez humne bahut achha upgrade
 *  kar chuka hai to piracy wale cases bahut kam ya minimal aayenge"). Checks:
 *  - size: nothing changes up to 500K subscribers; the floor and the shorter wait reach full at 10M;
 *  - kinds: each kind's share is cut by its own tech (Stabilization, Optimisation, Content protection, Account
 *    security, newer app and feature versions); fully protected, a service lets about a third through;
 *  - the weekly close: three years of the test company's own closes at 20M subscribers, every incident repaired
 *    at once, unprotected, as it is and fully protected: one to three in two months unprotected, about one
 *    protected, two-month spells without any, and leaks rare once Content protection is at the top. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type Player, type StreamingCrisisType } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { STREAMING_INCIDENT_SHARES, commitStreamingCrisisSecurityWeek, streamingIncidentExposure, streamingIncidentWeights } from '../services/streamingCrisisSecurity';
import { commitStreamingInfrastructureOperationsWeek } from '../services/streamingInfrastructureOperations';
import { STREAMING_TECH_DEFINITIONS, resolveStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import {
    STREAMING_SIZE_INCIDENTS,
    streamingIncidentChance,
    streamingIncidentIsMajor,
    streamingIncidentSpacingWeeks,
    streamingServiceSize,
} from '../services/streamingIncidentRepair';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Incidents By Size Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withTree = (platform: OwnedStreamingPlatformState, keep: (id: string, starter: boolean) => number): OwnedStreamingPlatformState => {
    const tree = resolveStreamingTechTree(platform);
    const week = platform.weeklyHistory.at(-1)?.absoluteWeek || 0;
    const techs = Object.fromEntries(STREAMING_TECH_DEFINITIONS.flatMap(definition => {
        const version = keep(definition.id, Boolean(definition.starter));
        return version ? [[definition.id, { version, progress: 0, unlockedAtAbsoluteWeek: week, versionReachedAtAbsoluteWeek: week }]] : [];
    }));
    return { ...platform, techTree: { ...tree, techs } as OwnedStreamingTechTreeState };
};

async function main() {
    const started = performance.now();

    /* ── size, chance and wait ── */
    assert.deepEqual([0, 500_000, 5_250_000, 10_000_000, 30_000_000].map(streamingServiceSize), [0, 0, .5, 1, 1]);
    [0.02, 0.3, 0.78].forEach(risk => assert.equal(streamingIncidentChance(risk, 400_000, 1), risk, 'Up to 500K subscribers the chance is the risk, as before'));
    assert.equal(streamingIncidentChance(.02, 20_000_000, 1), STREAMING_SIZE_INCIDENTS.pace, 'A big, unprotected service: the full pace');
    assert.ok(Math.abs(streamingIncidentChance(.02, 20_000_000, .3) - STREAMING_SIZE_INCIDENTS.pace * .3) < 1e-12, 'Its tech lets a share through');
    assert.equal(streamingIncidentChance(.6, 20_000_000, 1), .6, 'A risk above the floor is the chance');
    assert.deepEqual([400_000, 5_250_000, 10_000_000, 30_000_000].map(streamingIncidentSpacingWeeks), [6, 4, 2, 2], 'Six weeks apart, two for a big service');
    console.log(`PASS size: up to 500K subscribers as before (the risk, six weeks apart); from 10M a floor of ${STREAMING_SIZE_INCIDENTS.pace} × what the tech lets through, two weeks apart`);

    /* ── kinds ── */
    assert.ok(Math.abs(Object.values(STREAMING_INCIDENT_SHARES).reduce((sum, share) => sum + share, 0) - 1) < 1e-12, 'The shares add up to one');
    const qa = await buildStreamingFullPlatformQa(fresh('incidents-by-size'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const bare = withTree(base, (_, starter) => (starter ? 1 : 0));
    const full = withTree(base, () => 3);
    const weightOf = (platform: OwnedStreamingPlatformState, type: StreamingCrisisType) => streamingIncidentWeights(platform).find(row => row.value === type)!.weight;
    const exposures = [bare, base, full].map(streamingIncidentExposure);
    assert.ok(exposures[0] > .85 && exposures[0] <= 1, `Unprotected: nearly everything gets through (${exposures[0].toFixed(2)})`);
    assert.ok(exposures[2] > .2 && exposures[2] < .4, `Fully protected: about a third (${exposures[2].toFixed(2)})`);
    assert.ok(exposures[0] > exposures[1] && exposures[1] > exposures[2], 'More tech, fewer incidents');
    assert.ok(weightOf(full, 'CONTENT_LEAK') <= STREAMING_INCIDENT_SHARES.CONTENT_LEAK * .25, 'Content protection at the top: leaks rare');
    assert.ok(weightOf(full, 'PLATFORM_OUTAGE') <= STREAMING_INCIDENT_SHARES.PLATFORM_OUTAGE * .25 + 1e-12, 'Stabilization at the top: outages a quarter');
    assert.equal(weightOf(full, 'EMPLOYEE_ALLEGATION'), STREAMING_INCIDENT_SHARES.EMPLOYEE_ALLEGATION, 'An allegation has no tech');
    const mix = (platform: OwnedStreamingPlatformState) => streamingIncidentWeights(platform)
        .map(row => `${row.value.toLowerCase().replace(/_/g, ' ')} ${(row.weight * 100).toFixed(1)}`).join(', ');
    console.log(`PASS kinds: let through ${exposures.map(value => value.toFixed(2)).join(' / ')} (unprotected / the test company / fully protected)`);
    console.log(`  unprotected: ${mix(bare)}`);
    console.log(`  fully protected: ${mix(full)}`);

    /* ── the weekly close ── */
    const last = base.weeklyHistory.at(-1)!;
    const years = 3;
    const run = (start: OwnedStreamingPlatformState, subscribers: number) => {
        let platform = start;
        const weeks: number[] = [];
        const kinds = new Map<string, number>();
        let servers = 0, majors = 0;
        for (let week = 1; week <= years * 52; week++) {
            const snapshot = { ...last, absoluteWeek: last.absoluteWeek + week, subscribers };
            platform = commitStreamingInfrastructureOperationsWeek(platform, qa, snapshot);
            platform = commitStreamingCrisisSecurityWeek(platform, qa, snapshot);
            const state = platform.crisisSecurity;
            const fresh = state.crises.filter(item => item.detectedAtAbsoluteWeek === snapshot.absoluteWeek);
            fresh.forEach(item => { weeks.push(week); kinds.set(item.type, (kinds.get(item.type) || 0) + 1); });
            servers += state.infrastructureOperations.incidents.filter(item => item.detectedAtAbsoluteWeek === snapshot.absoluteWeek).length;
            majors += fresh.filter(item => streamingIncidentIsMajor(item.severity)).length;
            /* repaired at once, as Repair now does */
            platform = {
                ...platform,
                crisisSecurity: {
                    ...state,
                    crises: state.crises.map(item => (item.stage === 'RESOLVED' ? item : { ...item, stage: 'RESOLVED' as const, resolvedAtAbsoluteWeek: snapshot.absoluteWeek })),
                    infrastructureOperations: {
                        ...state.infrastructureOperations,
                        incidents: state.infrastructureOperations.incidents.map(item => (item.stage === 'RESOLVED' ? item
                            : { ...item, stage: 'RESOLVED' as const, resolvedAtAbsoluteWeek: snapshot.absoluteWeek })),
                    },
                },
            };
        }
        /* two-month spells (eight weeks) with 0, 1, 2 and 3 or more */
        const spells = [0, 0, 0, 0];
        for (let from = 1; from + 7 <= years * 52; from += 8) spells[Math.min(3, weeks.filter(week => week >= from && week < from + 8).length)] += 1;
        return { total: weeks.length, perTwoMonths: weeks.length / (years * 52 / 8), spells, kinds, servers, majors };
    };
    const line = (label: string, row: ReturnType<typeof run>) => `${label}: ${row.total} in ${years} years (${row.perTwoMonths.toFixed(1)} per two months; spells of two months with 0 / 1 / 2 / 3+: ${row.spells.join(' / ')}; ${row.majors} major; ${row.servers} at servers) — ${[...row.kinds.entries()].sort((left, right) => right[1] - left[1]).map(([kind, count]) => `${kind.toLowerCase().replace(/_/g, ' ')} ${count}`).join(', ')}`;
    const unprotected = run(bare, 20_000_000);
    const asIs = run(base, 20_000_000);
    const protectedRun = run(full, 20_000_000);
    const small = run(base, 300_000);
    assert.ok(unprotected.perTwoMonths >= 1.4 && unprotected.perTwoMonths <= 2.6, `Unprotected and big: one to three in two months (${unprotected.perTwoMonths.toFixed(1)})`);
    assert.ok(protectedRun.perTwoMonths >= .5 && protectedRun.perTwoMonths <= 1.2, `Fully protected: about one in two months (${protectedRun.perTwoMonths.toFixed(1)})`);
    assert.ok(protectedRun.spells[0] >= 3, 'Some two-month spells without any');
    assert.ok((protectedRun.kinds.get('CONTENT_LEAK') || 0) <= 2, 'Leaks rare with Content protection at the top');
    assert.ok(small.perTwoMonths <= .5, `A 300K service keeps the few it had (${small.perTwoMonths.toFixed(1)})`);
    console.log(`PASS close (20M subscribers, every incident repaired at once):`);
    console.log(`  ${line('unprotected', unprotected)}`);
    console.log(`  ${line('the test company', asIs)}`);
    console.log(`  ${line('fully protected', protectedRun)}`);
    console.log(`  ${line('300K subscribers', small)}`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
