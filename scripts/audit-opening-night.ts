/**
 * #257: the opening night, redesigned. Zeesh (2026-11-05): "we need to redesignthe pages of opening night as i feel its a bit buggy and also not so good and relevent as
 * per our new system". The browser run checks the pictures; this holds what they must not lose: every figure is the saved launch's, the one choice left is real, a saved
 * launch cannot read as blocked, and the world the old page made up does not come back. #262: "i wanted the openng night to be made with yk better naimation screen and stuff
 * rather htan using images": nothing in it comes from a picture, and the campaign shows on the globe as a flare and a name.
 */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { commitOwnedStreamingLaunch, getStreamingLaunchReadiness, streamingLaunchPlaybackFor } from '../services/streamingLaunch';
import { openingNightMoments, openingNightStations } from '../services/streamingOpeningNight';
import { openOpeningNightAudio } from '../services/streamingOpeningNightAudio';
import { scheduleStreamingIdentNotes } from '../services/streamingIdentAudio';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { eveningOf, globePoint } from '../components/streaming-transplant/opening-night/nightEngine';
import { replayNightOf } from '../components/streaming-transplant/opening-night/replayNightData';
import { openingNightFlood } from '../services/streamingOpeningNightFlood';

const pass = (label: string) => console.log(`PASS ${label}`);
const source = (path: string) => readFileSync(path, 'utf8');

/* ---- the one choice left */
const career = createC6QaCareer();
const platform = normalizeOwnedStreamingPlatformState(career.ownedStreamingPlatform, career.id);
const readiness = getStreamingLaunchReadiness(career);
assert.equal(readiness.capacityOptions.length, 3);
const committed = readiness.capacityOptions.map(option => {
  const launched = commitOwnedStreamingLaunch(career, option.id);
  if (!launched.changed) return null;
  const forecast = streamingLaunchPlaybackFor(platform, option);
  assert.equal(launched.launchCommit!.capacityPlan, option.id);
  assert.equal(launched.launchCommit!.capacityPlanCost, option.cost);
  assert.equal(launched.launchCommit!.playbackSuccessRate, Math.round(forecast.playbackSuccessRate * 100) / 100, `${option.id}: what Launch Control expects is what gets saved`);
  assert.equal(launched.launchCommit!.outcomeTier, forecast.outcomeTier, `${option.id}: the tier too`);
  return { option, launched };
});
const standard = committed.find(row => row?.option.id === 'STANDARD');
const burst = committed.find(row => row?.option.id === 'CLOUD_BURST');
const staggered = committed.find(row => row?.option.id === 'STAGGERED_PREMIERE');
assert.ok(standard, 'the free way always works');
if (burst) {
  assert.ok(burst.launched.launchCommit!.protectedPeakConcurrentStreams > standard!.launched.launchCommit!.protectedPeakConcurrentStreams, 'a cloud burst buys room');
  assert.equal(standard!.launched.player.ownedStreamingPlatform.treasuryCash - burst.launched.player.ownedStreamingPlatform.treasuryCash, burst.option.cost, 'and it is paid for');
}
if (staggered) assert.ok(staggered.launched.launchCommit!.initialSubscribers <= standard!.launched.launchCommit!.initialSubscribers, 'a stagger gives up some of the night');
pass('the three ways of taking the peak are real, and what Launch Control expects is what gets saved');

/* ---- the poll */
const items = [
  { id: 'network', label: '', detail: 'n', tone: 'READY', destination: 'TECH' }, { id: 'peak', label: '', detail: 'High case above the room.', tone: 'WATCH', destination: 'TECH' },
  { id: 'slate', label: '', detail: 's', tone: 'READY', destination: 'CONTENT' }, { id: 'rights', label: '', detail: 'A licence lapsed.', tone: 'BLOCKED', destination: 'CONTENT' },
  { id: 'markets', label: '', detail: 'm', tone: 'READY', destination: 'MARKET' },
  { id: 'company', label: '', detail: 'The platform is already live.', tone: 'BLOCKED', destination: 'COMPANY' },
] as never;
const facts = { cities: 52, countries: 1, titles: 3, title: 'A Film', treasury: 1_800_000_000 };
const before = openingNightStations({ items, committed: false, ...facts });
assert.equal(before.find(row => row.id === 'NETWORK')?.tone, 'WATCH');
assert.equal(before.find(row => row.id === 'NETWORK')?.line, 'High case above the room.', 'a warning speaks for itself');
assert.equal(before.find(row => row.id === 'CATALOGUE')?.tone, 'BLOCKED');
assert.equal(before.find(row => row.id === 'MARKETS')?.line, '1 country cleared');
assert.equal(before.find(row => row.id === 'TREASURY')?.tone, 'BLOCKED');
const after = openingNightStations({ items, committed: true, ...facts });
assert.ok(after.every(row => row.tone === 'READY'), 'a saved launch cannot read as NO-GO: readiness says "already live" for a platform that is');
assert.equal(after.find(row => row.id === 'TREASURY')?.line, '$1.8B in the bank');
pass('the poll answers from the company, and a saved launch reads all GO');

/* ---- what the campaign bought, on the globe */
const plan = { formatIds: ['SOCIAL_FEED', 'CITY_SCREEN', 'TV_SPOTS', 'DRONE_SHOW', 'LANDMARK_LIGHT_SHOW', 'BILLBOARD'], places: { LANDMARK_LIGHT_SHOW: 'US', CITY_SCREEN: 'IN' }, openingCountryIds: ['US', 'IN'] } as never;
const moments = openingNightMoments(plan);
assert.deepEqual(moments.map(moment => moment.formatId), ['DRONE_SHOW', 'LANDMARK_LIGHT_SHOW', 'CITY_SCREEN'], 'big moments first, then the famous screens; what has no one place does not show');
assert.equal(moments.find(moment => moment.formatId === 'LANDMARK_LIGHT_SHOW')?.label, 'Empire State Building');
assert.equal(moments.find(moment => moment.formatId === 'LANDMARK_LIGHT_SHOW')?.countryId, 'US');
assert.equal(moments.find(moment => moment.formatId === 'CITY_SCREEN')?.label, 'Mumbai, Lower Parel');
assert.deepEqual(openingNightMoments(null), [], 'no campaign: no flare, nothing made up');
assert.deepEqual(openingNightMoments({ formatIds: ['TV_SPOTS'], places: {}, openingCountryIds: ['US'] } as never), []);
pass('the globe flares for what the campaign bought, and only that');

/* ---- the turning world */
assert.deepEqual(globePoint(0, 0, 0, 0).map(value => Math.round(value * 1000) / 1000), [0, 0, 1], 'longitude 0 faces the viewer before the world turns');
assert.ok(Math.abs(globePoint(-1, 0, 1, 0)[2] - 1) < 1e-9, 'turning by a place\'s longitude brings it to the middle');
assert.ok(globePoint(0, 0, 0.5, 0)[0] > 0, 'as the world turns, its face moves right: what lies west comes into view');
assert.ok(globePoint(0, 1.5, 0, 0.3)[2] > 0 && globePoint(0, -1.5, 0, 0.3)[2] < 0, 'tilted to show the north, where the land is');
assert.deepEqual(eveningOf([151, 139, 77, -74, -118]), { east: 151, range: 269 }, 'eight o\'clock starts at the date line and moves west: Sydney first, Los Angeles last');
const oneCity = eveningOf([77]);
assert.equal(oneCity.range, 80, 'one city: the world still turns');
assert.equal(oneCity.east - oneCity.range / 2, 77, 'and that city is in the middle of it');
pass('8 PM goes west over a turning globe');

/* ---- drawn here, not borrowed */
const engine = source('components/streaming-transplant/opening-night/nightEngine.ts');
const drawn = [
  ...['TheBroadcast.tsx', 'LaunchControl.tsx', 'TheFlood.tsx', 'useNight.ts', 'nightEngine.ts', 'nightFormations.ts'].map(name => source(`components/streaming-transplant/opening-night/${name}`)),
  source('components/streaming-transplant/StreamingPremiereExperience.tsx'),
  source('components/streaming-transplant/presentation/screens/PremiereNight/PremiereNight.module.css'),
  source('services/streamingOpeningNight.ts'),
].join('\n');
['CampaignScene', 'sceneCatalogue', 'defaultCreative', 'NightPhoto', 'creativeMediaId', '.jpg', '.webp', '.png', 'url('].forEach(word => {
  assert.ok(!drawn.includes(word), `the night has no pictures of its own or of another room's: ${word}`);
});
/* what most GPUs forgive and some do not: it would leave a phone with a black night */
assert.ok(!/pow\(\(/.test(engine), 'no pow() of something that can be negative');
for (const match of engine.matchAll(/smoothstep\((-?[\d.]+), (-?[\d.]+),/g)) assert.ok(Number(match[1]) < Number(match[2]), `smoothstep's edges in order: ${match[0]}`);
pass('the night is drawn in code, and its shaders stay inside what the spec allows');

/* ---- every figure is the saved launch's */
const night = source('components/streaming-transplant/StreamingPremiereExperience.tsx');
const broadcast = source('components/streaming-transplant/opening-night/TheBroadcast.tsx');
const paper = source('components/streaming-transplant/opening-night/TheFlood.tsx');
const control = source('components/streaming-transplant/opening-night/LaunchControl.tsx');
const all = [night, broadcast, paper, control, source('services/streamingOpeningNightFlood.ts')].join('\n');
['Emergency pricing review', 'Three agencies', 'Quietly approached', 'Half-price offers', 'r/streaming', 'BUY BURST', 'HOLD THE DROP', 'DROP QUALITY', 'REHEARSAL SAID', 'Error 5031', 'Marta Vane', 'Vol. XLI'].forEach(word => {
  assert.ok(!all.includes(word), `the old page's made-up world stays gone: ${word}`);
});
assert.ok(!/onUpdatePlayer|persist\(|onLaunch/.test(broadcast + paper), 'the show and the paper write nothing');
assert.ok(/commit\.initialSubscribers/.test(broadcast) && /commit\.initialSubscribers/.test(paper), 'the subscribers are the saved number');
assert.ok(/commit\.playbackSuccessRate/.test(broadcast) && /commit\.playbackSuccessRate/.test(paper));
pass('the show presents the saved launch, and invents nothing');

/* ---- the tap */
assert.ok(/const goLive = \(plan: StreamingLaunchCapacityPlan\) => \{\s*if \(!audio\.current && !silent\) audio\.current = openOpeningNightAudio\(inputs\.ident\?\.sound\);\s*audio\.current\?\.resume\(\);/.test(night), 'the sound opens on the tap, the only moment a browser allows it');
assert.ok(/setTimeout\(\(\) => \{\s*if \(!audio\.current\) audio\.current = openOpeningNightAudio\(inputs\.ident\?\.sound\);/.test(night), 'and it is made ahead of the tap, which making it would hold up');
const goLive = night.slice(night.indexOf('const goLive'), night.indexOf('const result = useMemo'));
assert.ok(goLive.indexOf('setAct(\'CUT\')') < goLive.indexOf('requestAnimationFrame') && goLive.indexOf('requestAnimationFrame') < goLive.indexOf('onLaunch(plan)'), 'the tap only cuts to black; the launch is worked out after that frame');
assert.ok(/disabled=\{!allowed \|\| !pollDone \|\| blockers > 0\}/.test(control), 'a blocker keeps the guard down');
const hq = source('components/StreamingPlatformHQ.tsx');
assert.ok(/commitOwnedStreamingLaunch\(launchPlayer, capacityPlan\)/.test(hq), 'the choice reaches the launch');
assert.ok(/platform\.launchCommit && !premiereStartedHere && !pendingLaunchReveal/.test(hq), 'a launch saved but not yet watched opens the night, not its record');
pass('the tap answers at once, and the choice reaches the launch');

/* ---- the flood: everybody talking, about what really happened */
const floodInput = {
  service: 'NORTHSTAR+', title: 'Northern Signal', peak: 5_283_000, cities: ['Mumbai', 'Lagos', 'São Paulo'], countries: 25, rival: { name: 'Netflix', subs: '280M' },
  investor: { name: 'Sofia Laurent' }, engineer: null, moments: [{ label: 'Empire State Building' }],
};
const commitFor = (outcomeTier: 'SMOOTH_OPENING' | 'PRESSURED_OPENING' | 'DEGRADED_OPENING') => ({
  id: 'x', outcomeTier, initialSubscribers: 7_777_502, playbackSuccessRate: outcomeTier === 'DEGRADED_OPENING' ? 95.3 : 99.99, protectedPeakConcurrentStreams: 4_330_000, openingDemandIndex: 78,
});
(['SMOOTH_OPENING', 'PRESSURED_OPENING', 'DEGRADED_OPENING'] as const).forEach(tier => {
  const flood = openingNightFlood({ ...floodInput, commit: commitFor(tier) });
  const text = flood.posts.map(item => item.text).join(' | ');
  assert.ok(flood.posts.length >= 16, `${tier}: enough posts to be a flood`);
  assert.ok(!/\{\w+\}/.test(text), `${tier}: every blank filled in: ${text}`);
  assert.ok(flood.posts[0].verified, `${tier}: the trade's numbers come first`);
  assert.ok(flood.posts.some(item => item.handle === '@streamwars' && item.text.includes('Netflix')) && flood.posts.some(item => item.name === 'Sofia Laurent'), `${tier}: the rival and the investor, who are real here`);
  assert.ok(text.includes('Empire State Building'), `${tier}: what the campaign bought`);
  assert.ok(flood.posts.filter(item => item.place).every(item => floodInput.cities.includes(item.place!)), `${tier}: the places are the network's own cities`);
  assert.ok(new Set(flood.posts.map(item => item.text)).size === flood.posts.length, `${tier}: nobody says the same thing twice`);
  assert.ok(flood.postCount > 0 && flood.trends.length >= 3);
  assert.deepEqual(openingNightFlood({ ...floodInput, commit: commitFor(tier) }), flood, `${tier}: the same launch, the same flood`);
});
assert.ok(openingNightFlood({ ...floodInput, commit: commitFor('DEGRADED_OPENING') }).posts[0].text.includes('4.7% of plays failed'), 'a rough night: the trade says how rough, from the saved rate');
assert.ok(openingNightFlood({ ...floodInput, commit: commitFor('DEGRADED_OPENING') }).trends[0].tag.endsWith('Down'), 'and that is what trends');
assert.ok(openingNightFlood({ ...floodInput, investor: null, rival: null, moments: [], commit: commitFor('SMOOTH_OPENING') }).posts.every(item => item.handle !== '@streamwars' && !item.text.includes('Empire')), 'a company without them: nobody made up');
assert.ok(/commit\.initialSubscribers/.test(paper) && /commit\.playbackSuccessRate/.test(paper), 'the card carries the saved numbers');
assert.ok(!source('components/streaming-transplant/StreamingPremiereExperience.tsx').includes('MorningPaper') && !broadcast.includes('MorningPaper'), 'the newspaper is gone');
pass('the flood talks about what happened, and only the voices are made up');

/* ---- the lights come on in development too. React's development mode runs an effect twice; giving up a WebGL context on a canvas and asking that canvas again gets a dead one, and the night fell back to its plain number on the dev server. */
assert.ok(/document\.createElement\('canvas'\)/.test(broadcast) && !/<canvas/.test(broadcast), 'the show makes a canvas of its own each time its effect runs');
assert.ok(/canvas\?\.remove\(\)/.test(broadcast), 'and takes it away again');
pass('the lights survive React running the effect twice');

/* ---- the developer's replay changes nothing */
const careerBefore = JSON.stringify(career);
(['SMOOTH_OPENING', 'PRESSURED_OPENING', 'DEGRADED_OPENING'] as const).forEach(tier => {
  const own = replayNightOf(career, tier);
  assert.equal(own.inputs.committedLaunch?.outcomeTier, tier);
  assert.ok((own.inputs.network?.sites.length ?? 0) > 0, 'a globe to show, its own or the demo\'s');
  assert.ok((own.inputs.markets?.length ?? 0) > 0, 'markets on the board');
  assert.equal(own.brand.name, career.ownedStreamingPlatform.identity?.name, 'the player\'s own service');
  const room = own.inputs.committedLaunch!.protectedPeakConcurrentStreams;
  const peak = own.inputs.committedLaunch!.forecastLikelyConcurrentStreams;
  assert.ok(tier === 'SMOOTH_OPENING' ? room > peak : room < peak, `${tier}: the room there was fits the outcome`);
});
assert.equal(JSON.stringify(career), careerBefore, 'playing it leaves the save exactly as it was');
const demo = replayNightOf(null, 'DEGRADED_OPENING');
assert.equal(demo.brand.name, 'NORTHSTAR+', 'no service at all: the demo company');
assert.ok(demo.inputs.network!.sites.length > 30 && demo.inputs.network!.markets.length > 10 && demo.inputs.moments!.length === 3, 'with a network round the world and a campaign');
assert.ok(demo.inputs.network!.markets.every(market => demo.inputs.network!.sites.some(site => site.countryCode === market.countryId)), 'its markets are where its cities are');
const replay = source('components/streaming-transplant/opening-night/NightReplay.tsx');
assert.ok(!/onUpdatePlayer|persist|localStorage|indexedDB/.test(replay + source('components/streaming-transplant/opening-night/replayNightData.ts')), 'there is no save anywhere below it');
assert.ok(/React\.lazy\(\(\) => import\('\.\.\/components\/streaming-transplant\/opening-night\/NightReplay'\)\)/.test(source('views/HomePage.tsx')), 'the menu loads it when asked');
assert.ok(!source('index.html').includes('nightLab'), 'the lab page is not in the game');
pass('the replay plays from anywhere and writes nothing');

/* ---- the sound */
assert.equal(openOpeningNightAudio(), null, 'where there is no sound, the night plays without it');
assert.equal(typeof scheduleStreamingIdentNotes, 'function');
const notes: string[] = [];
const context = {
  createOscillator: () => ({ type: '', frequency: { value: 0 }, detune: { value: 0 }, connect: () => undefined, start: () => notes.push('start'), stop: () => undefined }),
  createGain: () => ({ gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }, connect: () => undefined }),
} as never;
assert.equal(scheduleStreamingIdentNotes(context, {} as never, 'silent', 0), 0, 'a silent ident is silent');
assert.ok(scheduleStreamingIdentNotes(context, {} as never, 'pulse', 0) > 0 && notes.length === 2, 'the ident\'s own notes, on the night\'s context');
pass('the ident plays on the sound the tap opened');

/* ---- the sound is files, one for each scene, and every one is there */
const audioCode = source('services/streamingOpeningNightAudio.ts');
const stems = [...audioCode.matchAll(/assets\/audio\/opening-night\/(\w+)\.m4a/g)].map(match => match[1]);
assert.deepEqual([...stems].sort(), ['buckled', 'city', 'count', 'flood', 'floodBad', 'held', 'just', 'rise', 'room', 'world', 'zero']);
stems.forEach(stem => {
  assert.ok(statSync(`assets/audio/opening-night/${stem}.m4a`).size > 10_000, `${stem}'s file is there`);
  assert.ok(stem === 'floodBad' || new RegExp(`'${stem}'`).test(broadcast), `${stem} is played on a cue`);
});
assert.ok(/'floodBad'/.test(broadcast));
const identCode = source('services/streamingIdentAudio.ts');
const idents = [...identCode.matchAll(/assets\/audio\/idents\/(\w+)\.m4a/g)].map(match => match[1]);
assert.equal(idents.length, 14, 'all fourteen sounds a service can choose, leaving silent and its own upload');
idents.forEach(ident => assert.ok(new RegExp(`\\b${ident}: \\[\\[`).test(identCode), `${ident}: its notes stay, in case the file cannot be played`));
idents.forEach(ident => assert.ok(statSync(`assets/audio/idents/${ident}.m4a`).size > 5_000, `${ident}'s file is there`));
const bytes = [...stems.map(stem => statSync(`assets/audio/opening-night/${stem}.m4a`).size), ...idents.map(ident => statSync(`assets/audio/idents/${ident}.m4a`).size)].reduce((sum, size) => sum + size, 0);
assert.ok(bytes < 2_000_000, `all of it stays small: ${bytes} bytes`);
assert.ok(!/createOscillator/.test(audioCode), 'nothing of the night is an oscillator any more');
/* the fireworks you see and the fireworks you hear are the same fireworks */
const timesIn = (file: string) => /FIREWORK_TIMES = \[([^\]]+)\]/.exec(source(file))![1];
assert.equal(timesIn('scripts/audio/render-opening-night.mjs'), timesIn('components/streaming-transplant/opening-night/nightFormations.ts'), 'the barrage in the sound and in the picture');
const barrageGaps = timesIn('scripts/audio/render-opening-night.mjs').split(',').map(Number).map((time, index, all) => (index ? Math.round((time - all[index - 1]) * 100) : 0)).slice(1);
assert.equal(new Set(barrageGaps).size, barrageGaps.length, 'no two gaps alike: a barrage, not a drum machine');
pass(`the sound is ${stems.length} rendered scenes and ${idents.length} idents, ${(bytes / 1e6).toFixed(2)} MB`);
console.log('opening-night audit passed');
