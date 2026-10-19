import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, createInitialOwnedStreamingPlatformState, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { evaluatePlayerStreamingTitleRoute, getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getStreamingOriginalLiveStatus } from '../services/streamingOriginals';
import { projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';

const fixture = (): Player => {
    const p = structuredClone(INITIAL_PLAYER) as Player;
    p.id = 'original-readiness-repair'; p.age = 40; p.currentWeek = 12;
    p.ownedStreamingPlatform = createInitialOwnedStreamingPlatformState(p.id);
    const s = p.ownedStreamingPlatform;
    s.identity = { name: 'Repair QA', slug: 'repair-qa', dayOneMarketIds: ['US'] } as any;
    s.originalCommissions = [{ id: 'commission', scriptId: 'script', producerStudioId: 'producer', canonicalProjectId: 'completed-original', title: 'Completed Original', status: 'GREENLIT', projectType: 'MOVIE', genre: 'DRAMA', episodes: 1, commissionedAtAbsoluteWeek: 2000, productionFundingApplied: 15000000, contract: { platformRightsPercent: 100, producerBackendPercent: 0, exclusiveWindowWeeks: 104, sequelRightsIncluded: false }, localization: null, releasePlan: null } as any];
    p.commitments = [{ id: 'completed-original', projectPhase: 'AWAITING_RELEASE', projectDetails: { ownedStreamingOriginal: true } } as any];
    p.world.projects = []; p.pastProjects = []; p.activeReleases = []; p.world.industryProductions = {};
    return p;
};
const results: { name: string; pass: boolean }[] = [];
const check = (name: string, condition: unknown) => results.push({ name, pass: Boolean(condition) });
const p = fixture(); const before = JSON.stringify(p); const id = 'completed-original'; const week = getAbsoluteWeek(p.age, p.currentWeek);
const planId = projectStreamingCommercialOffers(p.ownedStreamingPlatform.serviceConfiguration.pricing).subscriptions[0]?.id || '';
const route = (player: Player) => evaluatePlayerStreamingTitleRoute(player, id, 'US', week, { kind: 'SUBSCRIPTION', planId });
check('legacy completed commitment recovers catalogue without editing commission', getStreamingContentAvailability(p, id, ['US']).available);
check('legacy completed commitment recovers subscription route', route(p).allowed);
check('live status agrees with catalogue', getStreamingOriginalLiveStatus(p, p.ownedStreamingPlatform.originalCommissions[0]) === 'DELIVERED');
check('readiness does not mutate cash, IDs, signatures or saved input', JSON.stringify(p) === before);
for (const phase of ['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'PLANNING', 'SCHEDULED']) {
    const q = structuredClone(p); q.commitments[0].projectPhase = phase as any;
    check(`${phase} commitment stays unavailable`, !getStreamingContentAvailability(q, id, ['US']).available && !route(q).allowed);
}
for (const status of ['DELIVERED', 'AWAITING_RELEASE', 'RELEASED', 'PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'ON_HOLD', 'CANCELLED', 'TURNAROUND', 'PLANNED']) {
    const q = structuredClone(p); q.commitments = [];
    q.world.industryProductions = { production: { canonicalProjectId: id, status } as any };
    const expected = ['DELIVERED', 'AWAITING_RELEASE', 'RELEASED'].includes(status);
    check(`canonical ${status} agrees across catalogue and route`, getStreamingContentAvailability(q, id, ['US']).available === expected && route(q).allowed === expected);
}
const staleReleased = structuredClone(p);
staleReleased.world.projects = [{ id, title: 'Completed Original' } as any];
staleReleased.commitments[0].projectPhase = 'PRODUCTION';
check('unfinished commitment cannot be bypassed by a stale released mirror', !route(staleReleased).allowed);
staleReleased.commitments[0].projectPhase = 'AWAITING_RELEASE';
staleReleased.world.industryProductions = { production: { canonicalProjectId: id, status: 'CANCELLED' } as any };
check('cancelled canonical production overrides released mirrors', !route(staleReleased).allowed);
staleReleased.world.industryProductions.production.status = 'DELIVERED';
check('released project upgrades completed canonical production to released', getStreamingOriginalLiveStatus(staleReleased, staleReleased.ownedStreamingPlatform.originalCommissions[0]) === 'RELEASED');
const future = structuredClone(p);
future.ownedStreamingPlatform.launchCommit = { idempotencyKey: 'launch', committedAtAbsoluteWeek: week - 3 } as any;
future.ownedStreamingPlatform.launchSlate = { revision: 1, entries: [{ id: 'future-slate', projectId: id, title: 'Completed Original', source: 'ORIGINAL', projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 12, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD' }] } as any;
check('finished production does not bypass scheduled premiere', !route(future).allowed);
const later = structuredClone(p);
later.ownedStreamingPlatform.originalCommissions[0].releasePlan = { id: 'premiere', scope: 'DOMESTIC_MASTER', releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD', premiereAtAbsoluteWeek: week + 2 } as any;
check('postlaunch Original cannot bypass authorized future premiere', !route(later).allowed);
later.ownedStreamingPlatform.originalCommissions[0].releasePlan!.premiereAtAbsoluteWeek = week;
later.ownedStreamingPlatform.originalCommissions[0].localization = { packageId: 'DOMESTIC_MASTER', readyAtAbsoluteWeek: week + 1 } as any;
check('Original cannot play before localization delivery', !route(later).allowed);
const missing = structuredClone(p); missing.commitments = [];
check('greenlit without canonical completion remains blocked', !route(missing).allowed && !getStreamingContentAvailability(missing, id, ['US']).available);
const css = readFileSync('styles/streaming-originals-studio.css', 'utf8');
const overlay = css.match(/\.originals-studio-overlay\s*\{([^}]+)/)?.[1] || '';
check('Originals modal owns a fixed inset viewport above HQ', /position:\s*fixed/.test(overlay) && /inset:\s*0/.test(overlay) && Number(overlay.match(/z-index:\s*(\d+)/)?.[1]) > 110);
const main = css.match(/\.originals-studio-main\s*\{([^}]+)/)?.[1] || '';
check('Originals content can shrink and scroll inside viewport', /min-height:\s*0/.test(main) && /overflow-y:\s*auto/.test(main));
for (const row of results) console.log(`${row.pass ? 'PASS' : 'FAIL'} ${row.name}`);
if (results.some(row => !row.pass)) throw new Error(`${results.filter(row => !row.pass).length}/${results.length} Original readiness checks failed`);
console.log(`${results.length}/${results.length} Original readiness checks passed`);
