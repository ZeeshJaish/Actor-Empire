import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getOriginalsStudio, getOriginalsStudios, getStudioIssueCount, getStudioQualityEdge, getStudioShootWeeks } from '../services/originalsStudios';

/* #277: who may make an Original, and whether the card tells the truth. */

const player: Player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'originals-studios-audit', name: 'Audit', age: 30, currentWeek: 8 });
const studios = getOriginalsStudios(player);
const ids = new Set(studios.map(studio => studio.id));

/* --- production houses only */
for (const never of ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE', 'AMAZON_STUDIOS', 'PIXAR', 'MARVEL_STUDIOS', 'LUCASFILM', 'HBO']) {
    assert.ok(!ids.has(never), `${never} must never make an Original for the player`);
}
for (const may of ['PARAMOUNT', 'WARNER_BROS', 'UNIVERSAL', 'SONY_PICTURES', 'LIONSGATE', 'MGM', 'DREAMWORKS', 'ARTISAN_PICTURES', 'SEARCHLIGHT', 'DC_STUDIOS']) {
    assert.ok(ids.has(may), `${may} may make one`);
}

/* --- personalities differ, for real reasons */
const prestige = getOriginalsStudio(player, 'ARTISAN_PICTURES')!;
const franchise = getOriginalsStudio(player, 'DC_STUDIOS')!;
const legacy = getOriginalsStudio(player, 'PARAMOUNT')!;
assert.equal(prestige.style, 'SLOW_BURN', 'a prestige house spends on a slow burn');
assert.equal(franchise.style, 'BIG_OPENING', 'a franchise house opens big');
assert.equal(legacy.style, 'EVEN', 'a balanced major spends evenly');
assert.match(prestige.typeLabel, /Prestige/);
assert.notEqual(prestige.line === franchise.line && prestige.creative === franchise.creative, true);
const raw: any = player.world.studios;
assert.equal(prestige.creative, Math.round(raw.ARTISAN_PICTURES.ai.competence.creative));
assert.equal(prestige.onSet, Math.round(raw.ARTISAN_PICTURES.ai.competence.production));
assert.equal(prestige.budgetControl, Math.round(raw.ARTISAN_PICTURES.ai.profile.financialDiscipline));
assert.equal(prestige.starPull, Math.round(raw.ARTISAN_PICTURES.ai.competence.talentRelations));

/* --- the record is what it really made */
for (const studio of studios) {
    const { record } = studio;
    assert.equal(record.hits + record.average + record.flops <= record.titles, true, studio.id);
    assert.ok(record.rating === 0 || (record.rating >= 1 && record.rating <= 10), studio.id);
    assert.equal(record.thin, record.titles < 3);
    assert.ok(studio.mark.length >= 1 && studio.mark.length <= 3, studio.mark);
    assert.ok(studio.line.endsWith('.'));
}
const withTitles = studios.filter(studio => studio.record.titles >= 10);
assert.ok(withTitles.length >= 3, 'the historical catalogue gives real studios a real record');
assert.ok(withTitles.every(studio => studio.record.genres.length > 0));

/* --- a young studio with nothing behind it has a thin record and says so */
const young: any = structuredClone(raw.PARAMOUNT);
young.id = 'npc_venture_test';
young.name = 'Tiny Works';
young.ai = { ...young.ai, origin: 'NPC_VENTURE', profile: { ...young.ai.profile, strategy: 'COMMERCIAL', riskTolerance: 30 } };
const withYoung: Player = { ...player, world: { ...player.world, studios: { ...raw, npc_venture_test: young }, npcVentures: { npc_venture_test: { id: 'npc_venture_test', name: 'Tiny Works', status: 'ACTIVE', cashReserve: 40, reputation: 50, creativeQuality: 50 } } as any } };
const youngCard = getOriginalsStudio(withYoung, 'npc_venture_test')!;
assert.ok(youngCard, 'a young studio over the bar may make one');
assert.equal(youngCard.record.titles, 0);
assert.equal(youngCard.record.thin, true);
assert.equal(youngCard.style, 'EVEN', 'a careful young studio spends evenly');
const under = (patch: Record<string, number | string>) => getOriginalsStudio({ ...withYoung, world: { ...withYoung.world, npcVentures: { npc_venture_test: { ...withYoung.world.npcVentures!.npc_venture_test, ...patch } } as any } }, 'npc_venture_test');
assert.equal(under({ cashReserve: 10 }), null, 'too little cash');
assert.equal(under({ reputation: 20 }), null, 'too little reputation');
assert.equal(under({ creativeQuality: 20 }), null, 'too little craft');
assert.equal(under({ status: 'CLOSED' }), null, 'closed');

/* --- a studio the player runs is not an outside studio */
const owned: Player = { ...player, world: { ...player.world, studios: { ...raw, MGM: { ...raw.MGM, ai: { ...raw.MGM.ai, controller: 'PLAYER' } } } } };
assert.equal(getOriginalsStudio(owned, 'MGM'), null);

/* --- the effects are real numbers and stay small */
assert.ok(getStudioQualityEdge({ creative: 95, onSet: 95 }) > 2);
assert.ok(getStudioQualityEdge({ creative: 95, onSet: 95 }) <= 3);
assert.ok(getStudioQualityEdge({ creative: 40, onSet: 40 }) < -2);
assert.equal(getStudioQualityEdge({ creative: 70, onSet: 70 }), 0);
assert.ok(getStudioShootWeeks({ onSet: 90 }, 10) < getStudioShootWeeks({ onSet: 40 }, 10));
assert.ok(getStudioShootWeeks({ onSet: 90 }, 8) >= 8 && getStudioShootWeeks({ onSet: 40 }, 13) <= 13, 'stays inside the shoot the Production House has');
const issues = (budgetControl: number, onSet: number, fit = 1) => {
    let total = 0;
    for (let i = 0; i < 2000; i += 1) {
        const count = getStudioIssueCount({ id: `s${i}`, budgetControl, onSet }, 'seed', fit);
        assert.ok(count >= 0 && count <= 3);
        total += count;
    }
    return total / 2000;
};
assert.ok(issues(90, 90) < issues(40, 40), 'careful studios come back for money less');
assert.ok(issues(60, 60, 0.4) > issues(60, 60, 1), 'a thin budget brings more trouble');
assert.ok(issues(90, 90) < 1, `a careful studio averages under one: ${issues(90, 90)}`);
assert.ok(issues(40, 40) > 1, `a careless one averages over one: ${issues(40, 40)}`);

/* --- the card files stay in the design */
const cardSource = readFileSync('components/originals/OriginalsStudioCard.tsx', 'utf8');
for (const word of ['Track record', 'How they spend a season', 'Too few titles yet', 'Budget control', 'Star pull']) assert.ok(cardSource.includes(word), word);

console.log('originals studios audit passed');
