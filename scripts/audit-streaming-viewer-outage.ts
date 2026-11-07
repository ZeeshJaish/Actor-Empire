/** What a viewer meets while an incident is open, Phase 3 #58 (codex-handoff/plans/platform-tech-plan.md
 *  §8: "Phase 3: an outage banner ("We're fixing an issue") while an incident is open; buffering when
 *  load is high; a downloads icon"). Checks:
 *  - the banner's words for each kind viewers would notice, and none for those they would not (a
 *    pirated title, a backlash, a rights problem, a staff allegation);
 *  - "A fix is rolling out" while it is repaired; the worst one shows; a broken Downloads pauses the
 *    button whichever banner shows;
 *  - the Download button: on the plan, paused, or on another plan; none where no plan sells downloads;
 *  - the game's viewer state carries the banner only while one is open;
 *  - the app: the banner on the home screen (and nothing without one). */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingInfrastructureIncident, type OwnedStreamingPlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getStreamingViewerOutage, streamingViewerDownloadState } from '../services/streamingViewerOutage';
import { createCanonicalViewerState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { ViewerApp, type AppState } from '../components/streaming-transplant/StreamingViewerExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const crisis = (type: OwnedStreamingCrisis['type'], stage: OwnedStreamingCrisis['stage'] = 'DETECTED', extra: Partial<OwnedStreamingCrisis> = {}): OwnedStreamingCrisis => ({
    id: `c-${type}`, idempotencyKey: `c-${type}`, type, severity: 'SERIOUS', stage, title: type, detail: '', cause: '', detectedAtAbsoluteWeek: 800,
    affectedSubscribers: 1000, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null, communication: null, responseCost: 0,
    weeklyRecoveryCost: 0, recoveryReadyAtAbsoluteWeek: stage === 'RECOVERING' ? 803 : null, resolvedAtAbsoluteWeek: stage === 'RESOLVED' ? 802 : null, outcomeNote: null, ...extra,
});
const server = (type: OwnedStreamingInfrastructureIncident['type'], severity: OwnedStreamingInfrastructureIncident['severity'] = 'MAJOR'): OwnedStreamingInfrastructureIncident => ({
    id: `s-${type}`, idempotencyKey: `s-${type}`, type, severity, stage: 'DETECTED', title: type, detail: '', cause: '', facilityId: 'f', cityId: 'ASH',
    detectedAtAbsoluteWeek: 800, affectedSubscribers: 1000, capacityLossPercent: 20, conditionLossPercent: 10, responseAction: null, rerouteFacilityId: null,
    compensation: null, insuranceClaimed: false, responseCost: 0, insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null,
    assistedHandled: false, publicReaction: '', subscriberReaction: '', outcomeNote: null,
});
const withIncidents = (crises: OwnedStreamingCrisis[], incidents: OwnedStreamingInfrastructureIncident[] = []) => ({
    crisisSecurity: { crises, infrastructureOperations: { incidents } },
}) as unknown as Pick<OwnedStreamingPlatformState, 'crisisSecurity'>;
const of = (crises: OwnedStreamingCrisis[], incidents: OwnedStreamingInfrastructureIncident[] = []) => getStreamingViewerOutage(withIncidents(crises, incidents));

function main() {
    const started = performance.now();

    /* ── the banner's words ── */
    assert.equal(of([]), null, 'Nothing open: no banner');
    assert.deepEqual(of([crisis('PLATFORM_OUTAGE')]), { headline: 'We\'re fixing an issue', line: 'Some titles may not start, or may stop part way. We\'re on it.', stall: true, downloadsDown: false });
    assert.equal(of([crisis('PLATFORM_OUTAGE', 'RECOVERING')])!.headline, 'A fix is rolling out', 'While it is repaired');
    assert.equal(of([crisis('PLATFORM_OUTAGE', 'RESOLVED')]), null, 'Resolved: gone');
    assert.deepEqual([of([crisis('SLOW_STREAMING')])!.line, of([crisis('SLOW_STREAMING')])!.stall], ['Titles may be slow to start at busy times.', true]);
    assert.deepEqual([of([crisis('APP_CRASH', 'DETECTED', { techId: 'APPS_TV' })])!.line, of([crisis('APP_CRASH', 'DETECTED', { techId: 'APPS_TV' })])!.stall],
        ['The Smart TV app may close while you watch. Your other screens work as usual.', false]);
    const downloads = of([crisis('FEATURE_BROKEN', 'DETECTED', { techId: 'PLAY_DOWNLOADS' })])!;
    assert.deepEqual([downloads.line, downloads.downloadsDown, downloads.stall], ['Downloads aren\'t working right now. Streaming works as usual.', true, false]);
    assert.equal(of([crisis('FEATURE_BROKEN', 'DETECTED', { techId: 'PLAY_SKIP_INTRO' })])!.line, 'Skip intro and recap isn\'t working right now. Everything else works as usual.');
    assert.equal(of([crisis('ACCOUNT_BREACH')])!.line, 'We\'ve reset some passwords to keep accounts safe. Sign in again if we ask you to.');
    for (const quiet of ['CONTENT_LEAK', 'RECOMMENDATION_BACKLASH', 'RIGHTS_COMPLIANCE', 'EMPLOYEE_ALLEGATION'] as const) {
        assert.equal(of([crisis(quiet)]), null, `${quiet}: the operator's business, no banner`);
    }
    assert.deepEqual([of([], [server('TRAFFIC_SPIKE')])!.line, of([], [server('TRAFFIC_SPIKE')])!.stall],
        ['So many people are watching in North America that some titles are slow to start.', true], 'A server incident names its region');
    assert.equal(of([], [server('DDOS_ATTACK')])!.line, 'We\'re blocking an attack on our service. Some titles may be slow to start.');
    const both = of([crisis('FEATURE_BROKEN', 'DETECTED', { techId: 'PLAY_DOWNLOADS' })], [server('POWER_FAILURE')])!;
    assert.deepEqual([both.line, both.stall, both.downloadsDown], ['Some viewers in North America can\'t start titles right now.', true, true],
        'The one viewers feel most shows (titles stalling); a broken Downloads still pauses the button');
    console.log(`PASS words: "${of([crisis('PLATFORM_OUTAGE')])!.headline}" / "A fix is rolling out"; outage and slow streams stall titles, an app crash names its screen, a broken Downloads pauses the button, a breach asks to sign in again, a server incident names its region; a pirated title, a backlash, a rights problem or an allegation shows nothing`);

    /* ── the Download button ── */
    const premium = { features: ['4 screens at once', 'Downloads'] };
    const basic = { features: ['2 screens at once'] };
    assert.deepEqual([
        streamingViewerDownloadState(premium, [basic, premium], null),
        streamingViewerDownloadState(premium, [basic, premium], downloads),
        streamingViewerDownloadState(basic, [basic, premium], null),
        streamingViewerDownloadState(basic, [basic], null),
        streamingViewerDownloadState(null, [basic, premium], null),
    ], ['ON', 'PAUSED', 'PLAN', null, null], 'On the plan, paused, on another plan; none without downloads anywhere or without plans');
    console.log('PASS download: Download on a plan with downloads, "Paused" while they are broken, Download → the plans that have them on one without; none where no plan sells downloads');

    /* ── the game's viewer state ── */
    const base = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'viewer-outage', name: 'Viewer Outage Audit', age: 15, currentWeek: 1 });
    const playerWith = (crises: OwnedStreamingCrisis[]): Player => ({
        ...base,
        ownedStreamingPlatform: { ...base.ownedStreamingPlatform, crisisSecurity: { ...base.ownedStreamingPlatform.crisisSecurity, crises } },
    });
    assert.equal('outage' in createCanonicalViewerState(playerWith([])), false, 'Nothing open: the state is as before');
    assert.deepEqual(createCanonicalViewerState(playerWith([crisis('APP_CRASH', 'DETECTED', { techId: 'APPS_TV' })])).outage,
        of([crisis('APP_CRASH', 'DETECTED', { techId: 'APPS_TV' })]), 'Open: the state carries the banner');
    console.log('PASS state: the game\'s viewer state carries the banner only while one is open');

    /* ── the app ── */
    const brand: Brand = {
        name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
        publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
        lockupId: 'WORDMARK', serverCity: null,
    };
    const state: AppState = {
        live: true, layoutId: 'cinema', watchingNow: 12000, network: { peakLoad: 40, tier: '4K', latencyMs: 30 },
        titles: [{ id: 't1', title: 'Atlas Rising', kind: 'ORIGINAL', format: 'Series', genre: 'Drama', hue: 214, logline: 'A drama.', rank: 1 }],
    };
    const quiet = renderToStaticMarkup(createElement(ViewerApp, { brand, state, onBack: () => undefined }));
    assert.doesNotMatch(quiet, /fixing an issue|fix is rolling out/, 'No incident: no banner');
    const loud = renderToStaticMarkup(createElement(ViewerApp, { brand, state: { ...state, outage: of([crisis('PLATFORM_OUTAGE')]) }, onBack: () => undefined }));
    assert.match(loud, /role="status"><i[^>]*aria-hidden="true">!<\/i><span><b>We&#x27;re fixing an issue<\/b>Some titles may not start, or may stop part way\. We&#x27;re on it\.<\/span>/,
        'The home screen shows the banner');
    const fixing = renderToStaticMarkup(createElement(ViewerApp, { brand, state: { ...state, outage: of([crisis('SLOW_STREAMING', 'RECOVERING')]) }, onBack: () => undefined }));
    assert.match(fixing, /<b>A fix is rolling out<\/b>Titles may be slow to start at busy times\./);
    console.log('PASS app: the banner on the home screen while one is open, "A fix is rolling out" while it is repaired, nothing without one');
    console.log(`done in ${Math.round(performance.now() - started)} ms`);
}

main();
