import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { createBusiness } from '../services/businessLogic';
import { createContract } from '../services/talentService';
import { NPC_DATABASE, generateNewUnknowns } from '../services/npcLogic';
import { createSaveIntegrityManifest } from '../services/saveIntegrity';
import { saveVerifiedGameData, loadVerifiedGameData, getSaveGenerationKeys } from '../services/saveGenerations';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';

const actor = { ...generateNewUnknowns(1)[0], id: 'legacy-recover-actor', name: 'Legacy Actor' };
const modes = ['valid', 'tampered', 'different-career', 'same-default-id-other-studio', 'same-owner-other-contract',
    'different-signing-terms', 'synthesized-contract-id', 'uncontracted-history', 'deceased', 'missing', 'read-error',
    'already-present', 'contract-snapshot', 'static-and-family', 'legacy-owner-mirror'] as const;

async function scenario(mode: typeof modes[number]) {
    // Actual independent careers share this default ID; it cannot establish provenance.
    const previous = structuredClone(INITIAL_PLAYER);
    previous.money = 50_000_000;
    previous.age = 30;
    previous.currentWeek = 20;
    const studio = createBusiness('Legacy Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO',
        { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', 20);
    previous.businesses = [studio];
    const contract = { ...createContract(actor.id, 'MOVIE_DEAL', 'WEEKLY_INSTALLMENTS', 3, 100000, 100, 20), studioId: studio.id };
    previous.studio.talentRoster = [contract];
    studio.studioState!.talentRoster = [contract];
    previous.flags.extraNPCs = [actor];
    if (mode === 'different-career') previous.id = 'different-career';

    const current = structuredClone(previous);
    current.id = INITIAL_PLAYER.id;
    current.money = 40_123_456.75;
    current.flags.extraNPCs = [];
    const currentContract = current.studio.talentRoster[0];
    currentContract.moviesRemaining = 2;
    currentContract.amountPaid = 1923;
    currentContract.installmentsPaid = 1;
    if (mode === 'same-default-id-other-studio') {
        current.name = 'Independent Imported Career';
        current.businesses[0].id = 'independent-owned-studio';
        currentContract.studioId = current.businesses[0].id;
    }
    if (mode === 'same-owner-other-contract') currentContract.id += '1';
    if (mode === 'different-signing-terms') currentContract.totalAmount += 1;
    if (mode === 'synthesized-contract-id') {
        currentContract.id = `contract_${studio.id}_${actor.id}`;
        contract.id = currentContract.id;
    }
    if (mode === 'legacy-owner-mirror') {
        delete currentContract.studioId;
        delete contract.studioId;
    }
    if (mode === 'already-present') current.flags.extraNPCs = [{ ...actor, stats: { ...actor.stats, talent: 95 } }];
    if (mode === 'contract-snapshot') currentContract.actorSnapshot = structuredClone(actor);
    if (mode === 'deceased') current.flags.dynastyCareer = { members: { [actor.id]: { npcId: actor.id, status: 'DECEASED' } } } as any;
    if (mode === 'static-and-family') {
        currentContract.npcId = NPC_DATABASE.find(n => n.occupation === 'ACTOR')!.id;
        currentContract.id = `contract_${currentContract.npcId}_${Date.now()}`;
        current.relationships = [{ id: 'rel_mom' }, { id: 'rel_dad' }] as any;
    }
    current.businesses[0].studioState!.talentRoster = structuredClone(current.studio.talentRoster);
    if (mode === 'uncontracted-history') {
        current.pastProjects = [{ id: 'old-film', castList: [{ actorId: actor.id, actorName: actor.name }] }] as any;
        current.studio.talentRoster = [];
        current.businesses[0].studioState!.talentRoster = [];
    }

    const store = new CinemaMemorySaveStore();
    const key = 'legacy-profile-only';
    await saveVerifiedGameData(store, key, previous, createSaveIntegrityManifest(previous, 'MANUAL'));
    await saveVerifiedGameData(store, key, current, createSaveIntegrityManifest(current, 'MANUAL'));
    if (mode === 'tampered') (store.records.get(getSaveGenerationKeys(key).previous) as any).player.money++;
    if (mode === 'missing') store.records.delete(getSaveGenerationKeys(key).previous);
    let previousReads = 0;
    const read = store.read.bind(store);
    store.read = async name => {
        if (name === getSaveGenerationKeys(key).previous) {
            previousReads++;
            if (mode === 'read-error') throw new Error('Previous read unavailable');
        }
        return read(name);
    };
    const loaded = await loadVerifiedGameData(store, key);
    assert.equal(loaded.status, 'CURRENT');
    assert.equal(loaded.player!.money, current.money);
    assert.deepEqual(loaded.player!.businesses, current.businesses);
    assert.deepEqual(loaded.player!.studio, current.studio);
    assert.deepEqual({ ...loaded.player, flags: { ...loaded.player!.flags, extraNPCs: current.flags.extraNPCs } }, current,
        'Every current career field except recovered actor profiles must stay exactly unchanged');
    const restored = loaded.player!.flags.extraNPCs.find(n => n.id === actor.id);
    assert.equal(Boolean(restored), ['valid', 'already-present', 'contract-snapshot', 'legacy-owner-mirror'].includes(mode), mode);
    if (mode === 'valid' || mode === 'contract-snapshot' || mode === 'legacy-owner-mirror') assert.deepEqual(restored, actor);
    if (mode === 'already-present') assert.equal(restored!.stats.talent, 95);
    if (['static-and-family', 'already-present', 'contract-snapshot', 'uncontracted-history', 'deceased', 'synthesized-contract-id'].includes(mode)) {
        assert.equal(previousReads, 0, 'Healthy or unprovable references must not read/verify a previous generation');
    }
    assert.deepEqual(store.records.get(key), current, 'Profile repair must not overwrite durable current save');
    console.log(`PASS ${mode}: current cash, contract progress, ownership and durable source preserved; previous reads ${previousReads}`);
}
for (const mode of modes) await scenario(mode);
