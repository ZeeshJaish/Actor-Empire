import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { useGameActions } from '../hooks/useGameActions';
import { NPC_DATABASE } from '../services/npcLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';

function actionsFor(initial: Player) {
    let state = initial;
    let actions!: ReturnType<typeof useGameActions>;
    function Probe() {
        actions = useGameActions({ player: state,
            setPlayer: update => { state = typeof update === 'function' ? update(state) : update; },
            setToastMessage: () => {}, setActivePressEvent: () => {}, setShowProtectionPrompt: () => {},
            setActiveSocialEvent: () => {}, setPendingBabyNaming: () => {} });
        return null;
    }
    renderToStaticMarkup(<Probe />);
    return { actions, read: () => state };
}
function fixture() {
    const p = structuredClone(INITIAL_PLAYER);
    p.age = 50; p.currentWeek = 10; p.energy.current = 100; p.flags = {};
    p.relationships = [{ id: 'friend', name: 'Friend', relation: 'Friend', closeness: 50, image: '',
        lastInteractionWeek: 10, lastInteractionAbsolute: getAbsoluteWeek(49, 10) }];
    return p;
}
const npc = { ...NPC_DATABASE[0], id: 'clock-npc', openness: 100, tier: 'INDIE' as const };
function addNpcState(p: Player, score: number) {
    p.instagram.npcStates[npc.id] = { npcId: npc.id, isFollowing: true, isFollowedBy: true,
        relationshipScore: score, relationshipLevel: 'Friend', lastInteractionWeek: 10, hasMet: true, chatHistory: [] };
}
let checks = 0;
function check(name: string, run: () => void) { run(); checks++; console.log('PASS', name); }
check('real social contact refreshes the absolute date even at the same week number a year later', () => {
    const test = actionsFor(fixture());
    test.actions.handleSocialInteract('friend', 'CALL');
    assert.equal(test.read().relationships[0].lastInteractionAbsolute, getAbsoluteWeek(50, 10));
    assert.ok(test.read().relationships[0].closeness > 50);
});
check('successful NPC contact refreshes an existing connection absolute clock', () => {
    const p = fixture(); p.relationships[0].npcId = npc.id; addNpcState(p, 60);
    const test = actionsFor(p); test.actions.handleNPCInteract(npc, 'GREET');
    assert.equal(test.read().relationships[0].lastInteractionAbsolute, getAbsoluteWeek(50, 10));
    assert.equal(test.read().relationships[0].closeness, 53, 'normal +3 greeting uses Social 50, not stale Instagram 60');
    assert.equal(test.read().instagram.npcStates[npc.id].relationshipScore, 53);
});
check('newly befriended NPC starts with the current absolute interaction clock', () => {
    const p = fixture(); addNpcState(p, 80);
    const test = actionsFor(p); test.actions.handleNPCInteract(npc, 'BEFRIEND');
    const connection = test.read().relationships.find(r => r.npcId === npc.id);
    assert.ok(connection); assert.equal(connection.lastInteractionAbsolute, getAbsoluteWeek(50, 10));
});
console.log(`Relationship contact action audit passed (${checks} checks).`);
