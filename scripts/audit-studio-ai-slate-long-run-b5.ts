import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { INITIAL_PLAYER, type NPCStudioState, type Player, type StudioAiSlateStatus, type WorldState } from '../types';
import {
    consumeStudioGreenlightForLegacyRelease,
    executeStudioAiSlateWeek,
    normalizeStudioAiState,
    STUDIO_AI_SLATE_KEY_LIMIT,
} from '../services/studioAi';
import { adaptStudioIntelligenceContext, collectIndustryContentGlobalRecent, processIndustryIntelligenceShadowCompany } from '../services/industryIntelligence';

const TOTAL_WEEKS = 400 * 52;

const studio = (id: string, valuation: number, reputation: number, cashReserve: number, archetype: string): NPCStudioState => ({
    id, name: id.split('_').map(part => part[0] + part.slice(1).toLowerCase()).join(' '),
    valuation, reputation, cashReserve, recentHits: reputation >= 75 ? 3 : 0, archetype,
});

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = 'studio-ai-slate-long-run-b5';
    player.businesses = [];
    player.stockTakeovers = [];
    player.world = {
        ...player.world,
        projects: [],
        industryProductions: {},
        studios: {
            MAJOR_COMMERCIAL: studio('MAJOR_COMMERCIAL', 70, 88, 80_000, 'COMMERCIAL'),
            PRESTIGE_LABEL: studio('PRESTIGE_LABEL', 14, 82, 45_000, 'PRESTIGE'),
            GENRE_SPECIALIST: studio('GENRE_SPECIALIST', 2.5, 68, 25_000, 'GENRE'),
            DEVELOPING_HOUSE: studio('DEVELOPING_HOUSE', 0.22, 38, 12_000, 'EMERGENT'),
        },
        npcVentures: {},
    } as WorldState;
    Object.keys(player.world.studios || {}).forEach(studioId => {
        const item = player.world.studios![studioId];
        player.world.studios![studioId] = { ...item, ai: normalizeStudioAiState(item, { absoluteWeek: 0 }) };
    });
    return player;
};

const run = () => {
    const player = createFixture();
    const transitions: Partial<Record<StudioAiSlateStatus, number>> = {};
    let admitted = 0;
    for (let absoluteWeek = 1; absoluteWeek <= TOTAL_WEEKS; absoluteWeek += 1) {
        player.age = 18 + Math.floor(absoluteWeek / 52);
        player.currentWeek = (absoluteWeek % 52) + 1;
        Object.keys(player.world.studios || {}).sort().forEach(studioId => {
            let current = player.world.studios![studioId];
            const beforeIds = new Set(current.ai?.slate?.commitments.map(entry => entry.id) || []);
            const context = adaptStudioIntelligenceContext(player, current, absoluteWeek);
            const intelligence = processIndustryIntelligenceShadowCompany({
                context,
                state: current.ai!.intelligence!,
                globalRecentFingerprints: collectIndustryContentGlobalRecent(player.world, current.id),
            });
            current = { ...current, ai: { ...current.ai!, intelligence: intelligence.state } };
            current = executeStudioAiSlateWeek({ player, world: player.world, studio: current, absoluteWeek }).studio;
            current.ai?.slate?.commitments.forEach(commitment => {
                transitions[commitment.status] = (transitions[commitment.status] || 0) + 1;
                if (!beforeIds.has(commitment.id)) admitted += 1;
            });
            while (current.ai?.slate?.commitments.some(item => item.status === 'GREENLIT' && item.source === 'INDEPENDENT' && item.legacyReleaseConsumedAtAbsoluteWeek === undefined)) {
                current = consumeStudioGreenlightForLegacyRelease(current, absoluteWeek).studio;
            }
            player.world.studios![studioId] = current;
        });
    }
    return { player, transitions, admitted };
};

const started = performance.now();
const first = run();
const durationMs = performance.now() - started;
const second = run();
assert.deepEqual(second, first, '400-year B5 replay must be deterministic');
assert.ok(first.admitted > 100, 'long-run studios must form many bounded development commitments');
assert.ok((first.transitions.GREENLIT || 0) > 0, 'some projects must reach greenlight');
assert.ok((first.transitions.REWRITE || 0) + (first.transitions.ON_HOLD || 0) + (first.transitions.TURNAROUND || 0) + (first.transitions.ABANDONED || 0) > 0, 'long-run decisions must not collapse into automatic greenlights');

let totalBytes = 0;
for (const item of Object.values(first.player.world.studios || {})) {
    const slate = item.ai!.slate!;
    const activeCount = slate.commitments.filter(entry => ['DEVELOPING', 'REWRITE', 'GREENLIT'].includes(entry.status)).length;
    assert.ok(slate.commitments.length <= Math.max(24, activeCount), `${item.id} slate history must remain bounded`);
    assert.ok(slate.processedProposalKeys.length <= STUDIO_AI_SLATE_KEY_LIMIT);
    assert.ok(slate.processedReviewKeys.length <= STUDIO_AI_SLATE_KEY_LIMIT);
    assert.equal(new Set(slate.commitments.map(entry => entry.id)).size, slate.commitments.length, `${item.id} commitment IDs must remain unique`);
    assert.equal(item.ai!.capacity.committedDevelopmentSlots, activeCount - slate.commitments.filter(entry => entry.status === 'GREENLIT').length);
    assert.ok(Number.isFinite(item.cashReserve) && item.cashReserve >= 0);
    totalBytes += Buffer.byteLength(JSON.stringify(item.ai));
}
assert.ok(totalBytes < 1_500_000, `B5 retained state exceeded the representative 1.5 MB budget (${totalBytes})`);
assert.ok(durationMs < 20_000, `B5 400-year representative run exceeded 20 seconds (${durationMs.toFixed(0)}ms)`);

console.log(JSON.stringify({
    weeks: TOTAL_WEEKS,
    companies: Object.keys(first.player.world.studios || {}).length,
    admitted: first.admitted,
    transitions: first.transitions,
    retainedBytes: totalBytes,
    durationMs: Math.round(durationMs),
}));
console.log('Studio AI B5 long-run audit passed.');
