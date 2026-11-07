/** A long test career for the platform's energy, #72 (codex-handoff/plans/platform-tech-plan.md §13, Phase 5:
 *  "a long test career shows energy demand that lasts"). The test company plays on as an engaged player would,
 *  on the week's own 100 energy and nothing bought:
 *  - every open incident is repaired with energy while there is energy, then fixed with cash, else waited out;
 *  - the next tech it can afford is unlocked while the treasury keeps $1B;
 *  - the rest of the week's energy goes into versions, the nearest to done first.
 *  Each year it reports what the platform asked of the week's energy, what was left unspent, and what is left
 *  to ask. Checks: the first two years leave no more than 5% of the week's energy unspent (the tree as #72
 *  tunes it), and a year the service ends at 10M subscribers or more keeps having incidents (#73, #74).
 *  Usage: node <bundle> [years=2] [out.json]; about five minutes a year. ENERGY_TIERS and FUTURE_COST try
 *  other numbers (below) and skip the checks. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player, type StreamingTechId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { completeStreamingTechVersion, contributeStreamingTechEnergy, unlockStreamingTech } from '../services/streamingTechTree';
import {
    STREAMING_TECH_DEFINITIONS,
    getStreamingTechMissingRequirements,
    resolveStreamingTechTree,
    streamingTechNextVersionEnergy,
    streamingTechVersion,
} from '../services/streamingTechTreeCatalogue';
import { getStreamingOpenIncidents } from '../services/streamingStatusBoard';
import { STREAMING_INCIDENT_REPAIR, repairStreamingIncident } from '../services/streamingIncidentRepair';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Energy Long Run', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const M = (value: number) => `$${(value / 1e6).toFixed(0)}M`;
const energyOf = (player: Player) => Math.max(0, Math.floor(Number(player.energy?.current) || 0));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

/* what is left to ask: the energy to bring every owned tech to version 3 */
const versionBacklog = (player: Player) => {
    const tree = resolveStreamingTechTree(platformOf(player));
    return STREAMING_TECH_DEFINITIONS.reduce((sum, definition) => {
        const owned = tree.techs[definition.id];
        if (!owned || owned.version < 1) return sum;
        const next = streamingTechNextVersionEnergy(definition, owned.version);
        if (next === null) return sum;
        return sum + next - owned.progress + (owned.version === 1 ? definition.versionEnergy[1] : 0);
    }, 0);
};

interface Year {
    year: number;
    weeks: number;
    energyGiven: number;
    repairEnergy: number;
    versionEnergy: number;
    unspent: number;
    weeksWithUnspent: number;
    incidents: number;
    serverIncidents: number;
    majorIncidents: number;
    repairedWithEnergy: number;
    fixedWithCash: number;
    waited: number;
    repairEnergyShort: number;
    unlocks: number;
    unlockCash: number;
    versionsReached: number;
    /** #84: full bars the treasury could not pay for when they filled */
    waitingForMoney: number;
    backlogEnd: number;
    owned: number;
    maxed: number;
    lockedLeft: number;
    treasury: number;
    subscribers: number;
}

async function main() {
    const years = Math.max(1, Number(process.argv[2]) || 2);
    const out = process.argv[3];
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('energy-long-run'), { processWeek: processGameWeek, persistWeek: async next => next });
    /* tuning trials, applied after the build: ENERGY_TIERS="a,b,c,d" multiplies version energy for techs that
       unlock at ≤$10M, ≤$50M, ≤$150M and above; FUTURE_COST multiplies futuristic unlock prices */
    const tiers = String(process.env.ENERGY_TIERS || '').split(',').map(Number).filter(Number.isFinite);
    const futureCost = Number(process.env.FUTURE_COST) || 1;
    const trial = tiers.length === 4 || futureCost !== 1;
    if (trial) {
        STREAMING_TECH_DEFINITIONS.forEach(definition => {
            if (tiers.length === 4) {
                const tier = definition.unlockCost <= 10_000_000 ? 0 : definition.unlockCost <= 50_000_000 ? 1 : definition.unlockCost <= 150_000_000 ? 2 : 3;
                definition.versionEnergy = definition.versionEnergy.map(value => Math.round(value * tiers[tier] / 5) * 5) as [number, number];
            }
            if (definition.futuristic) definition.unlockCost *= futureCost;
        });
        console.log(`trial: energy tiers ×${tiers.join('/') || 1}, futuristic unlocks ×${futureCost}`);
    }
    const startWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const first = platformOf(player);
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s · week ${startWeek} · treasury ${M(first.treasuryCash)} · subscribers ${first.metrics.subscribers.toLocaleString('en-US')} · techs owned ${Object.values(resolveStreamingTechTree(first).techs).filter(tech => tech.version >= 1).length} · backlog ${versionBacklog(player)} energy`);
    const seen = new Set<string>();
    const rows: Year[] = [];
    for (let year = 1; year <= years; year++) {
        const row: Year = { year, weeks: 0, energyGiven: 0, repairEnergy: 0, versionEnergy: 0, unspent: 0, weeksWithUnspent: 0, incidents: 0, serverIncidents: 0, majorIncidents: 0,
            repairedWithEnergy: 0, fixedWithCash: 0, waited: 0, repairEnergyShort: 0, unlocks: 0, unlockCash: 0, versionsReached: 0, waitingForMoney: 0,
            backlogEnd: 0, owned: 0, maxed: 0, lockedLeft: 0, treasury: 0, subscribers: 0 };
        for (let week = 0; week < 52; week++) {
            const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
            row.weeks += 1;
            row.energyGiven += energyOf(player);
            /* 1. incidents: repaired with energy while it lasts, then a cash fix, else waited out */
            const open = getStreamingOpenIncidents(platformOf(player), absoluteWeek).filter(item => item.stage === 'OPEN');
            open.forEach(incident => {
                const key = `${incident.source}:${incident.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    row.incidents += 1;
                    if (incident.source === 'INFRASTRUCTURE') row.serverIncidents += 1;
                    if (incident.major) row.majorIncidents += 1;
                }
                const cost = incident.major ? STREAMING_INCIDENT_REPAIR.ENERGY.major.energy : STREAMING_INCIDENT_REPAIR.ENERGY.minor.energy;
                const before = energyOf(player);
                const repaired = repairStreamingIncident(player, incident.source, incident.id, 'ENERGY');
                if (repaired.changed) {
                    player = repaired.player;
                    row.repairEnergy += before - energyOf(player);
                    row.repairedWithEnergy += 1;
                    return;
                }
                row.repairEnergyShort += cost;
                const fixed = repairStreamingIncident(player, incident.source, incident.id, 'FIX');
                if (fixed.changed) {
                    player = fixed.player;
                    row.fixedWithCash += 1;
                    return;
                }
                const waited = repairStreamingIncident(player, incident.source, incident.id, 'WAIT');
                if (waited.changed) player = waited.player;
                row.waited += 1;
            });
            /* 2. unlocks: the cheapest open tech while the treasury keeps a year of upkeep and $1B */
            for (;;) {
                const platform = platformOf(player);
                const tree = resolveStreamingTechTree(platform);
                const reserve = 1_000_000_000;
                const next = STREAMING_TECH_DEFINITIONS
                    .filter(definition => streamingTechVersion(tree, definition.id) < 1 && definition.unlockCost > 0
                        && !getStreamingTechMissingRequirements(tree, definition).length
                        && platform.treasuryCash - definition.unlockCost >= reserve)
                    .sort((left, right) => left.unlockCost - right.unlockCost || left.id.localeCompare(right.id))[0];
                if (!next) break;
                const unlocked = unlockStreamingTech(player, next.id);
                if (!unlocked.changed) break;
                player = unlocked.player;
                row.unlocks += 1;
                row.unlockCash += next.unlockCost;
            }
            /* 3. versions: the rest of the week's energy, the nearest to done first; a bar left full in an earlier week
               (#84: the treasury could not pay then) is paid first, as soon as the treasury can */
            for (const definition of STREAMING_TECH_DEFINITIONS) {
                const owned = resolveStreamingTechTree(platformOf(player)).techs[definition.id];
                const need = owned && owned.version >= 1 ? streamingTechNextVersionEnergy(definition, owned.version) : null;
                if (need === null || !owned || owned.progress < need) continue;
                const paid = completeStreamingTechVersion(player, definition.id as StreamingTechId);
                if (paid.changed) { player = paid.player; row.versionsReached += 1; }
            }
            for (;;) {
                if (energyOf(player) <= 0) break;
                const tree = resolveStreamingTechTree(platformOf(player));
                /* #84: a full bar waits for its price; the player pays when the treasury can, and fills the next bar */
                const candidates = STREAMING_TECH_DEFINITIONS.flatMap(definition => {
                    const owned = tree.techs[definition.id];
                    const need = owned && owned.version >= 1 ? streamingTechNextVersionEnergy(definition, owned.version) : null;
                    return need === null || !owned || need - owned.progress <= 0 ? [] : [{ id: definition.id as StreamingTechId, left: need - owned.progress }];
                }).sort((left, right) => left.left - right.left || left.id.localeCompare(right.id));
                if (!candidates.length) break;
                const before = energyOf(player);
                const result = contributeStreamingTechEnergy(player, candidates[0].id, 'FILL');
                if (!result.changed) break;
                player = result.player;
                row.versionEnergy += before - energyOf(player);
                if (result.ready) {
                    const paid = completeStreamingTechVersion(player, candidates[0].id);
                    if (paid.changed) { player = paid.player; row.versionsReached += 1; } else row.waitingForMoney += 1;
                }
                if (result.completed) row.versionsReached += 1;
            }
            const left = energyOf(player);
            row.unspent += left;
            if (left > 0) row.weeksWithUnspent += 1;
            player = (await processGameWeek(player)).player;
        }
        const platform = platformOf(player);
        const tree = resolveStreamingTechTree(platform);
        const owned = STREAMING_TECH_DEFINITIONS.filter(definition => streamingTechVersion(tree, definition.id) >= 1);
        row.backlogEnd = versionBacklog(player);
        row.owned = owned.length;
        row.maxed = owned.filter(definition => streamingTechVersion(tree, definition.id) >= 3).length;
        row.lockedLeft = STREAMING_TECH_DEFINITIONS.length - owned.length;
        row.treasury = platform.treasuryCash;
        row.subscribers = platform.metrics.subscribers;
        rows.push(row);
        console.log(`year ${year}: energy ${row.energyGiven} given · ${row.repairEnergy} repairs (${row.repairedWithEnergy} of ${row.incidents} incidents, ${row.serverIncidents} at servers, ${row.majorIncidents} major; ${row.fixedWithCash} fixed with cash, ${row.waited} waited; ${row.repairEnergyShort} short) · ${row.versionEnergy} versions (${row.versionsReached} reached, ${row.waitingForMoney} waiting for money) · ${row.unspent} unspent in ${row.weeksWithUnspent} weeks · ${row.unlocks} unlocks ${M(row.unlockCash)} · owned ${row.owned}/${STREAMING_TECH_DEFINITIONS.length}, maxed ${row.maxed}, backlog ${row.backlogEnd} · treasury ${M(row.treasury)} · subscribers ${row.subscribers.toLocaleString('en-US')} · ${Math.round((performance.now() - started) / 1000)} s`);
    }
    if (out) writeFileSync(out, JSON.stringify({ startWeek, rows }, null, 2));
    if (!trial) {
        rows.slice(0, 2).forEach(row => assert.ok(row.unspent <= row.energyGiven * .05,
            `Year ${row.year}: the platform still asks for the week's energy (${row.unspent} of ${row.energyGiven} unspent)`));
        console.log(`PASS lasts: ${rows.slice(0, 2).map(row => `year ${row.year} ${row.energyGiven - row.unspent} of ${row.energyGiven} spent`).join(', ')}; ${rows[0].backlogEnd} energy still to ask after year 1`);
        /* #73, #74: a service of 10M subscribers or more keeps having incidents, fewer as its tech protects it
           (one to three in two months unprotected, about one fully protected) */
        rows.filter(row => row.subscribers >= 10_000_000).forEach(row => assert.ok(row.incidents >= 1 && row.incidents <= 14,
            `Year ${row.year}: a big service keeps having incidents, as its tech allows (${row.incidents})`));
        console.log(`PASS incidents: ${rows.map(row => `year ${row.year} ${row.incidents} (${row.serverIncidents} at servers, ${row.majorIncidents} major), ${row.repairEnergy} energy`).join(' · ')}`);
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
