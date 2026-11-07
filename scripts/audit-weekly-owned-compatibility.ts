/** Controlled old/new engine compatibility replay; actual UI career evidence is separate. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import type { Player } from '../types';
import { NPC_DATABASE } from '../services/npcLogic';
import { processGameWeek } from '../services/gameLoop';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { readCinemaAuditCheckpoint, cinemaAuditRandom, cinemaAuditClock } from './fixtures/cinemaAuditCheckpoint';
const saved = readCinemaAuditCheckpoint<any>('cinema-verification.local/owned-studio-20261029/earned-owned-prefix/career-0.json.gz');
if (saved.npcDatabase) { NPC_DATABASE.length = 0; NPC_DATABASE.push(...saved.npcDatabase); delete saved.npcDatabase; }
let player = saved.player as Player; delete saved.player;
const rng = cinemaAuditRandom('normal-cinema-cohort:0', saved.randomCalls || 0), clock = cinemaAuditClock(saved.clockNext);
Math.random = rng.next; Date.now = clock.now;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rows = [];
const weeks = Number(process.env.OWNED_COMPAT_WEEKS || 12);
const snapshotDir = process.env.OWNED_COMPAT_SNAPSHOT_DIR;
if (snapshotDir) mkdirSync(snapshotDir, { recursive: true });
for (let i = 0; i < weeks; i++) {
    const prior = hash(player), result = await processGameWeek(player);
    assert.equal(hash(player), prior, 'Entire prior player must remain unchanged at week ' + i);
    const prepared = prepareVerifiedPlayerForPersistence(result.player, 'PROCESS_WEEK');
    player = prepared.player;
    if (i === 0 && process.env.OWNED_COMPAT_SNAPSHOT) writeFileSync(process.env.OWNED_COMPAT_SNAPSHOT, JSON.stringify(player));
    if (snapshotDir) writeFileSync(`${snapshotDir}/week-${i + 1}.json.gz`, gzipSync(JSON.stringify(player), { level: 1 }));
    const receipt = player.world.cinemaMarket!.weeks.at(-1)!;
    rows.push({ week: i + 1, age: player.age, careerWeek: player.currentWeek, playerSha256: hash(player), manifest: prepared.manifest.digest, cash: player.money,
        receipt: { id: receipt.id, grossCents: receipt.titles.reduce((n, t) => n + t.grossCents, 0), actorCents: receipt.titles.reduce((n, t) => n + t.actorPaidCents, 0) } });
    // Bound this compatibility harness. The actual hour-long browser test never forces GC.
    (globalThis as any).gc?.();
}
const output = { kind: 'CONTROLLED_12_WEEK_COMPLETE_PLAYER_PARITY_NOT_UI_BALANCE', randomCalls: rng.calls(), clockNext: clock.next(), rows };
assert.ok(process.env.OWNED_COMPAT_OUTPUT); writeFileSync(process.env.OWNED_COMPAT_OUTPUT!, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ weeks: rows.length, allPriorPlayersUnchanged: true, finalPlayerSha256: rows.at(-1)!.playerSha256 }));
