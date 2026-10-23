import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player, type NPCState } from '../types';
import { useGameActions } from '../hooks/useGameActions';
import { NPC_DATABASE, calculateInteraction } from '../services/npcLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { loadVerifiedGameData, saveVerifiedGameData } from '../services/saveGenerations';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { compareProtectedSaveState } from '../services/saveIntegrity';
import { getNpcRelationshipScore, getSyncedNpcStates, syncLinkedNpcRelationships } from '../services/relationshipBond';

const npc = { ...NPC_DATABASE[0], id: 'relationship-sync-npc', openness: 100, tier: 'INDIE' as const };
function fixture(score = 80, linkedScore?: number): Player {
    const p = structuredClone(INITIAL_PLAYER);
    Object.assign(p, { id: 'relationship-sync-audit', age: 25, currentWeek: 48, money: 1_000_000 });
    p.stats.fame = 0;
    p.flags.extraNPCs = [npc];
    p.energy.current = 100;
    p.relationships = [{ id: 'native-social', name: npc.name, relation: 'Friend', closeness: 67, image: '',
        lastInteractionWeek: 48, lastInteractionAbsolute: getAbsoluteWeek(25, 48) }];
    p.instagram.npcStates = { [npc.id]: { npcId: npc.id, relationshipScore: score, relationshipLevel: 'Friend',
        isFollowing: true, isFollowedBy: true, hasMet: linkedScore !== undefined, lastInteractionWeek: 48,
        chatHistory: [{ sender: 'NPC', text: 'Existing chat', timestamp: 123 }] } };
    if (linkedScore !== undefined) p.relationships.push({ id: 'existing-linked', name: npc.name,
        relation: 'Connection', closeness: linkedScore, image: npc.avatar, npcId: npc.id,
        lastInteractionWeek: 48, lastInteractionAbsolute: getAbsoluteWeek(25, 48) });
    return p;
}
const linked = (p: Player) => p.relationships.find(r => r.npcId === npc.id)!;
const ig = (p: Player): NPCState => p.instagram.npcStates[npc.id];
function act(p: Player, run: (a: ReturnType<typeof useGameActions>) => void): Player {
    let state = p;
    function Probe() {
        const actions = useGameActions({ player: state,
            setPlayer: update => { state = typeof update === 'function' ? update(state) : update; },
            setToastMessage: () => {}, setActivePressEvent: () => {}, setShowProtectionPrompt: () => {},
            setActiveSocialEvent: () => {}, setPendingBabyNaming: () => {} });
        run(actions);
        return null;
    }
    renderToStaticMarkup(<Probe />);
    return state;
}
async function advance(p: Player, weeks: number): Promise<Player> {
    for (let i = 0; i < weeks; i++) {
        const before = getAbsoluteWeek(p.age, p.currentWeek);
        p = (await processGameWeek(p)).player;
        assert.equal(getAbsoluteWeek(p.age, p.currentWeek), before + 1);
        assert.equal(ig(p).relationshipScore, linked(p).closeness, 'both stored bars must decay together');
    }
    return p;
}
let passed = 0, failed = 0;
async function check(name: string, run: () => void | Promise<void>) {
    try { await run(); passed++; console.log('PASS', name); }
    catch (error) { failed++; console.error('FAIL', name, String(error)); }
}
async function main() {
    await check('Instagram interactions stay separate until an explicit successful Befriend', () => {
        let p = act(fixture(79), a => a.handleNPCInteract(npc, 'BEFRIEND'));
        assert.equal(p.relationships.length, 1);
        p = act(p, a => a.handleNPCInteract(npc, 'GREET'));
        assert.equal(ig(p).relationshipScore, 82);
        assert.equal(p.relationships.length, 1, 'crossing 80 alone must not create a Social connection');
        assert.equal(p.relationships[0].closeness, 67, 'matching names are not identity links');
        p = act(p, a => a.handleNPCInteract(npc, 'BEFRIEND'));
        assert.equal(p.relationships.length, 2);
        assert.equal(linked(p).closeness, 87);
        assert.equal(ig(p).relationshipScore, 87);
        assert.equal(ig(p).hasMet, true);
        assert.equal(linked(p).lastInteractionAbsolute, getAbsoluteWeek(p.age, p.currentWeek));
    });
    await check('repeat Befriend cannot duplicate the contact or farm free bond gains', () => {
        let p = act(fixture(), a => a.handleNPCInteract(npc, 'BEFRIEND'));
        const id = linked(p).id;
        p = act(p, a => a.handleNPCInteract(npc, 'BEFRIEND'));
        assert.equal(p.relationships.length, 2);
        assert.equal(linked(p).id, id);
        assert.equal(linked(p).closeness, 85);
    });
    await check('a Social NPC identity alone does not link Instagram before Befriend', () => {
        let p = fixture(80, 90);
        ig(p).hasMet = false;
        p = act(p, a => a.handleNPCInteract(npc, 'GREET'));
        assert.equal(linked(p).closeness, 90);
        assert.equal(ig(p).relationshipScore, 83);
        p = act(p, a => a.handleNPCInteract(npc, 'BEFRIEND'));
        assert.equal(p.relationships.length, 2, 'reuse the exact NPC identity, never duplicate it');
        assert.equal(linked(p).closeness, 95, 'preserve the existing Social bond when explicitly linking');
        assert.equal(ig(p).relationshipScore, 95);
    });
    await check('a rejected Befriend cannot borrow an independent Social score to unlock Instagram', () => {
        const source = fixture(5, 90);
        ig(source).hasMet = false;
        const p = act(source, a => a.handleNPCInteract(npc, 'BEFRIEND'));
        assert.equal(linked(p).closeness, 90);
        assert.equal(ig(p).relationshipScore, 5);
        assert.equal(ig(p).hasMet, false);
    });
    await check('legacy duplicate NPC identities are preserved and resolve to the same bond everywhere', () => {
        const source = fixture(100, 40);
        source.relationships.push({ ...linked(source), id: 'legacy-other-contact', closeness: 80 });
        assert.equal(getNpcRelationshipScore(source, npc.id), 40);
        assert.equal(getSyncedNpcStates(source)[npc.id].relationshipScore, 40);
        const p = act(source, a => a.handleNPCInteract(npc, 'GREET'));
        assert.equal(linked(p).closeness, 43);
        assert.equal(ig(p).relationshipScore, 43);
        assert.equal(p.relationships.find(r => r.id === 'legacy-other-contact')!.closeness, 80);
        assert.equal(p.relationships.length, 3);
    });
    await check('Social-only maintenance immediately updates the linked Instagram score and contact date', () => {
        const source = fixture(100, 40);
        source.currentWeek = 51;
        const before = structuredClone(source);
        const p = act(source, a => a.handleSocialInteract('existing-linked', 'CALL'));
        assert.equal(linked(p).closeness, 42);
        assert.equal(ig(p).relationshipScore, 42);
        assert.equal(ig(p).lastInteractionWeek, 51);
        assert.equal(linked(p).lastInteractionAbsolute, getAbsoluteWeek(25, 51));
        assert.equal(p.money, before.money);
        assert.deepEqual(ig(p).chatHistory, ig(before).chatHistory);
        assert.equal(ig(source).relationshipScore, 100, 'mirroring must not mutate the previous Instagram state');
    });
    await check('Instagram greeting adds its normal gain to the current Social bond, never the stale 100', () => {
        const p = act(fixture(100, 0), a => a.handleNPCInteract(npc, 'GREET'));
        assert.equal(linked(p).closeness, 3);
        assert.equal(ig(p).relationshipScore, 3);
    });
    await check('interaction requirements use the current linked bond rather than stale Instagram eligibility', () => {
        const result = calculateInteraction(fixture(100, 10), npc, 'COFFEE');
        assert.equal(result.relationshipDelta, -5);
        const p = act(fixture(100, 10), a => a.handleNPCInteract(npc, 'COFFEE'));
        assert.equal(linked(p).closeness, 5, 'negative interaction outcomes must reach both sides');
        assert.equal(ig(p).relationshipScore, 5);
    });
    await check('a low Instagram cache cannot erase a stronger legitimate Social bond', () => {
        const p = act(fixture(1, 90), a => a.handleNPCInteract(npc, 'GREET'));
        assert.equal(linked(p).closeness, 93);
        assert.equal(ig(p).relationshipScore, 93);
    });
    await check('insufficient energy cannot change the bond or refresh its contact clock', () => {
        const p = fixture(100, 30);
        p.energy.current = 0;
        const before = structuredClone(linked(p));
        const after = act(p, a => a.handleNPCInteract(npc, 'GREET'));
        assert.deepEqual(linked(after), before);
        assert.equal(after.money, p.money);
    });
    await check('old-save migration mirrors linked bonds without creating links or charging historical decay', () => {
        const source = fixture(100, 42);
        const original = structuredClone(source);
        source.instagram.npcStates.unlinked = { ...ig(source), npcId: 'unlinked', relationshipScore: 91, hasMet: false };
        source.instagram.npcStates.brand = { ...ig(source), npcId: 'brand', relationshipScore: 16, relationshipLevel: 'BRAND', hasMet: false };
        const p = migratePlayerSave(source);
        assert.equal(linked(p).closeness, 42);
        assert.equal(ig(p).relationshipScore, 42);
        assert.equal(p.relationships.length, source.relationships.length);
        assert.equal(linked(p).id, linked(source).id);
        assert.equal(linked(p).lastInteractionAbsolute, linked(source).lastInteractionAbsolute);
        assert.equal(p.money, source.money);
        assert.deepEqual(ig(p).chatHistory, ig(original).chatHistory);
        assert.equal(ig(p).isFollowedBy, ig(original).isFollowedBy);
        assert.deepEqual(p.instagram.npcStates.unlinked, source.instagram.npcStates.unlinked);
        assert.deepEqual(p.instagram.npcStates.brand, source.instagram.npcStates.brand);
        assert.equal(ig(source).relationshipScore, 100);
        const again = migratePlayerSave(p);
        assert.deepEqual(again.relationships, p.relationships);
        assert.deepEqual(again.instagram.npcStates, p.instagram.npcStates);
    });
    await check('verified save preparation repairs only the stale linked cache and preserves protected state', () => {
        const source = prepareVerifiedPlayerForPersistence(migratePlayerSave(fixture(100, 42)), 'MANUAL').player;
        ig(source).relationshipScore = 100;
        const before = structuredClone(source);
        const prepared = prepareVerifiedPlayerForPersistence(source, 'MANUAL');
        assert.equal(ig(prepared.player).relationshipScore, 42);
        assert.deepEqual(compareProtectedSaveState(source, prepared.player), { ok: true });
        assert.deepEqual(prepared.player.relationships, before.relationships);
        assert.deepEqual(ig(prepared.player).chatHistory, ig(before).chatHistory);
        assert.equal(ig(source).relationshipScore, 100);
    });
    await check('bond mirroring preserves all other player data, contracts, identities and independent contacts', () => {
        const source = fixture(100, 42);
        const before = structuredClone(source);
        const synced = syncLinkedNpcRelationships(source);
        const expected = structuredClone(before);
        ig(expected).relationshipScore = 42;
        assert.deepEqual(synced, expected);
        assert.deepEqual(source, before);
        assert.equal(syncLinkedNpcRelationships(synced), synced, 'already-synced states must retain object identity');
    });
    if (!process.argv.includes('--actions-only')) for (const held of [5, 10]) await check(`Befriend → maintain 100 for ${held} weeks → rollover/decay → both actions → verified save/reload → decay again`, async () => {
        let p = fixture(95);
        p.currentWeek = held === 5 ? 48 : 43;
        p = act(p, a => a.handleNPCInteract(npc, 'BEFRIEND'));
        const id = linked(p).id;
        for (let i = 0; i < held; i++) {
            p = act(p, a => a.handleSocialInteract(id, 'CALL'));
            p = await advance(p, 1);
            assert.equal(linked(p).closeness, 100);
        }
        assert.equal(p.age, 26);
        p = await advance(p, 15);
        assert.equal(linked(p).closeness, 78);
        assert.equal(p.relationships[0].npcId, undefined, 'Social-only contact stays unlinked');
        p = act(p, a => a.handleNPCInteract(npc, 'GREET'));
        assert.equal(linked(p).closeness, 81);
        p = act(p, a => a.handleSocialInteract(id, 'CALL'));
        assert.equal(linked(p).closeness, 83);
        assert.equal(ig(p).relationshipScore, 83);
        const store = new CinemaMemorySaveStore();
        for (let cycle = 0; cycle < 2; cycle++) {
            // Runtime event queues may carry callbacks; persistence compacts those separately.
            const before = JSON.parse(JSON.stringify(p)) as Player;
            const prepared = prepareVerifiedPlayerForPersistence(p, 'MANUAL');
            assert.deepEqual(prepared.comparison, { ok: true });
            await saveVerifiedGameData(store, 'relationship-sync', prepared.player, prepared.manifest);
            const loaded = await loadVerifiedGameData(store, 'relationship-sync');
            assert.equal(loaded.status, 'CURRENT');
            assert.deepEqual(loaded.player!.relationships, prepared.player.relationships);
            p = migratePlayerSave(loaded.player!);
            const bondFacts = (player: Player) => player.relationships.map(r => ({
                id: r.id, npcId: r.npcId, name: r.name, relation: r.relation, closeness: r.closeness,
                lastInteractionWeek: r.lastInteractionWeek, lastInteractionAbsolute: r.lastInteractionAbsolute,
            }));
            assert.deepEqual(bondFacts(p), bondFacts(before));
            assert.equal(p.money, before.money);
            assert.deepEqual(p.portfolio, before.portfolio);
            assert.deepEqual(p.commitments, before.commitments);
            assert.deepEqual(ig(p).chatHistory, ig(before).chatHistory);
            assert.equal(ig(p).relationshipScore, linked(p).closeness);
            if (cycle === 0) {
                p = await advance(p, 5);
                assert.equal(linked(p).closeness, 83);
                p = await advance(p, 1);
                assert.equal(linked(p).closeness, 81, 'reload must not extend the contact grace');
            }
        }
        console.log('FLOW', JSON.stringify({ held, id, finalBond: linked(p).closeness, instagram: ig(p).relationshipScore, saveReloadCycles: 2 }));
    });
    console.log(`Relationship sync audit: ${passed} passed, ${failed} failed.`);
    if (failed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
