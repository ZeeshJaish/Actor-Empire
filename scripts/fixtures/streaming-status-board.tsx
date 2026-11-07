/* The Platform room's STATUS (#49, #50) with a server incident nobody has answered (its energy
   repair short of energy), a backlash being waited out, a breach under a cash fix, a region down,
   a site behind on maintenance, Picture held to 1080p and a paused product: every state the board
   can show, for checking it at phone widths. Repairs answer with a message, and change nothing.
   #53 adds what Playback and Apps can break: an app crash (Apps down), and a broken feature being
   fixed (Playback slow); #54 the Trust and safety row, slow while the breach is fixed; #55 a title
   on pirate sites nobody has taken down yet, its answers worded as takedowns (Takedown network
   halves its weeks). #102: the servers and the tech a line each, open because they are in trouble,
   and seven incidents in the last year (five shown); `?calm` is a service launched 22 weeks ago with
   nothing wrong: every line from the launch, the servers and the tech closed, three past incidents. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PlatformDesk, type NetworkState } from '../../components/streaming-transplant/StreamingNetworkExperience';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';
import type {
  StreamingStatusBoard, StreamingStatusDay, StreamingStatusIncident, StreamingStatusRow, StreamingStatusSection,
} from '../../services/streamingStatusBoard';

const brand: Brand = {
  name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
  publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
  lockupId: 'WORDMARK', serverCity: null,
};
const bars = (bad: number[] = []) => Array.from({ length: 30 }, (_, n) => (bad.includes(n) ? 2 : n > 26 ? 1 : 0));
/* #101 lines: a week each, the marks given, grey before `from`; #102 as many weeks as the service has run */
const line = (marks: Record<number, StreamingStatusDay> = {}, from = 0, weeks = 30): StreamingStatusDay[] => (
  Array.from({ length: weeks }, (_, n) => (n < from ? 'NONE' : marks[n] ?? 'WORKING'))
);
const RANK: Record<StreamingStatusDay, number> = { NONE: -1, WORKING: 0, SLOW: 1, DOWN: 2 };
const worstOf = (lines: StreamingStatusDay[][]): StreamingStatusDay[] => lines[0].map((_, n) => (
  lines.map(days => days[n]).reduce((worst, day) => (RANK[day] > RANK[worst] ? day : worst), 'NONE' as StreamingStatusDay)
));
const region = (row: Omit<StreamingStatusRow, 'history'>, cities: StreamingStatusRow[]): StreamingStatusRow => ({
  ...row, cities, history: worstOf(cities.map(city => city.history!)),
});
const city = (id: string, label: string, status: StreamingStatusRow['status'], history: StreamingStatusDay[], reason?: string): StreamingStatusRow => ({
  id: `CITY:${id}`, label, detail: '', status, history, ...(reason ? { reason } : {}),
});
/* #102 a section as one line: the worst of its rows each week, and the worst row's reason */
const lined = (section: StreamingStatusSection, label: string): StreamingStatusSection => {
  const rank = (row: StreamingStatusRow) => (row.status === 'OFF' ? 0 : RANK[row.status]);
  const top = [...section.rows].sort((left, right) => rank(right) - rank(left))[0];
  const status = top.status === 'OFF' ? 'WORKING' : top.status;
  return {
    ...section,
    overview: { label, status, ...(status !== 'WORKING' && top.reason ? { reason: top.reason } : {}), history: worstOf(section.rows.map(row => row.history!)) },
  };
};
/* #102 a past incident, resolved `weeks` after it began */
const past = (id: string, kind: string, title: string, openedAtWeek: number, weeks: number, major: boolean, note: string, where: string | null = null): StreamingStatusIncident => ({
  id, source: where ? 'INFRASTRUCTURE' : 'CRISIS', title, kind, where, severity: major ? 'MAJOR' : 'MINOR', major, stage: 'RESOLVED',
  openedAtWeek, weeks, readyAtWeek: null, weeksLeft: null, resolvedAtWeek: openedAtWeek + weeks, affectedViewers: 0, damage: [], cause: '', note,
  hits: [], region: null, repairPath: null, weeksToRunItsCourse: null,
});
const state: NetworkState = {
  live: true,
  components: [
    { id: 'REACH', name: 'Reach', status: 'degraded', uptime: 89, measure: 'of your markets reached', history: bars() },
    { id: 'SERVED', name: 'Served well', status: 'degraded', uptime: 86, measure: 'served to the standard', history: bars() },
    { id: 'REGIONS', name: 'Thin regions', status: 'outage', uptime: 80, measure: 'of markets served well · 2 thin · 3 dark', history: bars() },
    { id: 'DELIVERY', name: 'Video delivery', status: 'outage', uptime: 96.4, history: bars([29]) },
    { id: 'ACCOUNTS', name: 'Accounts and payments', status: 'outage', uptime: 96.3, history: bars([29]) },
    { id: 'RECOMMENDATIONS', name: 'Recommendations', status: 'outage', uptime: 99.92, history: bars([29]) },
    { id: 'RIGHTS', name: 'Rights and publishing', status: 'outage', uptime: 99.96, history: bars([29]) },
  ],
  cities: [], tech: [], products: [], incidents: [],
  peakLoad: 88, headroom: '1,204,000 HD streams free', technicalDebt: 22,
};
const board: StreamingStatusBoard = {
  live: true,
  overall: 'DOWN',
  headline: 'Traffic spike in Ashburn and 2 more',
  line: 'Subscribers are seeing this right now, and nobody has responded yet',
  open: [
    {
      id: 'spike', source: 'INFRASTRUCTURE', title: 'Premiere traffic overwhelmed a site', kind: 'Traffic spike', where: 'Ashburn · Atlas Compute',
      severity: 'MAJOR', major: true, stage: 'OPEN', openedAtWeek: 811, weeks: 1, readyAtWeek: null, weeksLeft: null, resolvedAtWeek: null,
      affectedViewers: 640_000, damage: ['Viewing −1.5%', 'Churn +0.18% a week', 'Playback −2.2 points', 'Capacity −34%', 'Tech health −3.5 a week'],
      cause: 'Peak demand beyond the site.', note: 'Viewers in North America are buffering through the premiere.', hits: ['DELIVERY'], region: 'NORTH_AMERICA',
      repairPath: null, weeksToRunItsCourse: 9,
      repairs: [
        { path: 'ENERGY', cash: 1_500_000, energy: 50, weeks: 0, available: false, refusal: 'Needs 50 energy; you have 20.' },
        { path: 'FIX', cash: 6_000_000, energy: 0, weeks: 5, available: true },
        { path: 'WAIT', cash: 0, energy: 0, weeks: 9, available: true },
      ],
    },
    {
      id: 'backlash', source: 'CRISIS', title: 'The recommendation system triggered backlash', kind: 'Recommendation backlash', where: null,
      severity: 'MINOR', major: false, stage: 'OPEN', openedAtWeek: 809, weeks: 3, readyAtWeek: null, weeksLeft: null, resolvedAtWeek: null,
      affectedViewers: 410_000, damage: ['Viewing −0.4%', 'Churn +0.09% a week', 'Tech health −1 a week'],
      cause: 'Recommendations ran ahead of security.', note: 'Viewers and creators are challenging how discovery decisions were made.', hits: ['RECOMMENDATIONS'], region: null,
      repairPath: 'WAIT', weeksToRunItsCourse: 3,
      repairs: [
        { path: 'ENERGY', cash: 500_000, energy: 25, weeks: 0, available: true },
        { path: 'FIX', cash: 2_000_000, energy: 0, weeks: 3, available: true },
      ],
    },
    {
      id: 'crash', source: 'CRISIS', title: 'The Smart TV app keeps crashing', kind: 'App crash', where: null,
      severity: 'MAJOR', major: true, stage: 'OPEN', openedAtWeek: 811, weeks: 1, readyAtWeek: null, weeksLeft: null, resolvedAtWeek: null,
      affectedViewers: 520_000, damage: ['Viewing −1.1%', 'Churn +0.11% a week', 'Playback −0.6 points', 'Tech health −3.5 a week'],
      cause: 'Smart TV apps at Basic with tech debt 22', note: 'Viewers watching on the Smart TV app cannot keep a title playing. It needs a fix before they give up on it.',
      hits: ['DELIVERY'], region: null, repairPath: null, weeksToRunItsCourse: 9,
      repairs: [
        { path: 'ENERGY', cash: 1_500_000, energy: 50, weeks: 0, available: true },
        { path: 'FIX', cash: 6_000_000, energy: 0, weeks: 5, available: true },
        { path: 'WAIT', cash: 0, energy: 0, weeks: 9, available: true },
      ],
    },
    {
      id: 'pirated', source: 'CRISIS', title: '“Midnight Harbor” is on pirate sites', kind: 'Title piracy', where: null,
      severity: 'SERIOUS', major: false, stage: 'OPEN', openedAtWeek: 811, weeks: 1, readyAtWeek: null, weeksLeft: null, resolvedAtWeek: null,
      affectedViewers: 310_000, damage: ['Viewing −1.4%', 'Churn +0.08% a week'],
      cause: 'Takedown network at Basic: leak risk 45%',
      note: 'Copies of “Midnight Harbor” are spreading on pirate sites. Every week they stay up, people watch them there instead of on your service.',
      hits: ['RIGHTS'], region: null, repairPath: null, weeksToRunItsCourse: 3, takedown: true,
      repairs: [
        { path: 'ENERGY', cash: 500_000, energy: 25, weeks: 0, available: true },
        { path: 'FIX', cash: 2_000_000, energy: 0, weeks: 2, available: true },
        { path: 'WAIT', cash: 0, energy: 0, weeks: 3, available: true },
      ],
    },
    {
      id: 'breach', source: 'CRISIS', title: 'Customer accounts were exposed', kind: 'Account breach', where: null,
      severity: 'SERIOUS', major: false, stage: 'REPAIRING', openedAtWeek: 809, weeks: 3, readyAtWeek: 814, weeksLeft: 2, resolvedAtWeek: null,
      affectedViewers: 120_000, damage: ['Viewing −0.1%', 'Churn +0.03% a week', 'Playback −0.2 points', 'Tech health −2 a week'],
      cause: 'Weak account security.', note: 'Password resets are rolling out to everyone affected.', hits: ['ACCOUNTS'], region: null,
      repairPath: 'FIX', weeksToRunItsCourse: null,
    },
  ],
  service: { DELIVERY: 'DOWN', ACCOUNTS: 'DOWN', RECOMMENDATIONS: 'DOWN', RIGHTS: 'DOWN' },
  sections: [
    lined({
      id: 'SERVERS', title: 'Servers', note: '12 cities · peak load 88%', empty: '',
      rows: [
        region({ id: 'SERVER:NORTH_AMERICA', label: 'North America', detail: '5 cities · 48 racks · Atlas Compute 2 · Rented 3', status: 'DOWN', reason: 'Ashburn: traffic spike, 34% of capacity lost', incidentId: 'spike' }, [
          city('ASHBURN', 'Ashburn', 'DOWN', line({ 28: 'DOWN', 29: 'DOWN' }), 'Ashburn: traffic spike, 34% of capacity lost'),
          city('CHICAGO', 'Chicago', 'WORKING', line({ 12: 'DOWN', 13: 'SLOW', 14: 'SLOW' })),
          city('DALLAS', 'Dallas', 'WORKING', line()),
          city('SEATTLE', 'Seattle', 'WORKING', line({}, 20)),
          city('TORONTO', 'Toronto', 'WORKING', line()),
        ]),
        region({ id: 'SERVER:EUROPE', label: 'Europe', detail: '4 cities · 112 racks · Rented', status: 'SLOW', reason: 'Frankfurt: 54% condition, maintenance has fallen behind' }, [
          city('FRANKFURT', 'Frankfurt', 'SLOW', line({ 29: 'SLOW' }), 'Frankfurt: 54% condition, maintenance has fallen behind'),
          city('LONDON', 'London', 'WORKING', line({ 5: 'DOWN', 6: 'DOWN', 7: 'DOWN', 8: 'SLOW', 9: 'SLOW' })),
          city('MADRID', 'Madrid', 'WORKING', line()),
          city('PARIS', 'Paris', 'WORKING', line()),
        ]),
        region({ id: 'SERVER:ASIA', label: 'Asia', detail: '3 cities · 152 racks · Meridian Edge', status: 'WORKING' }, [
          city('MUMBAI', 'Mumbai', 'WORKING', line()),
          city('SINGAPORE', 'Singapore', 'WORKING', line({ 21: 'SLOW' })),
          city('TOKYO', 'Tokyo', 'WORKING', line()),
        ]),
      ],
    }, '1 city down · 1 slow'),
    lined({
      id: 'TECH', title: 'Tech', note: '7 running', empty: '',
      rows: [
        { id: 'TECH:PICTURE', label: 'Picture', detail: '8K · Basic', status: 'SLOW', reason: 'Plans sell 8K; viewers get 1080p (peak load 88%)', history: line({ 29: 'SLOW' }) },
        { id: 'TECH:SOUND', label: 'Sound', detail: 'Spatial 3D · Basic, plus Clear dialogue', status: 'WORKING', history: line() },
        { id: 'TECH:STABILIZATION', label: 'Stabilization', detail: 'Redundancy · Basic', status: 'SLOW', reason: 'Tech debt 62: it slows playback until it is paid down', history: line({ 29: 'SLOW' }) },
        { id: 'TECH:PLAYBACK', label: 'Playback', detail: 'No buffering · Smooth, plus Downloads, Skip intro and recap, Continue anywhere, Subtitles and audio description', status: 'SLOW', reason: 'Fix under way: downloads stopped working', incidentId: 'downloads', history: line({ 26: 'SLOW', 27: 'SLOW', 28: 'SLOW', 29: 'SLOW' }) },
        { id: 'TECH:APPS', label: 'Apps and devices', detail: 'Consoles · Basic', status: 'DOWN', reason: 'The Smart TV app keeps crashing', incidentId: 'crash', history: line({ 9: 'DOWN', 10: 'SLOW', 11: 'SLOW', 29: 'DOWN' }) },
        { id: 'TECH:TRUST', label: 'Trust and safety', detail: 'Takedown network · Basic, plus Account security', status: 'SLOW', reason: 'Fix under way: customer accounts were exposed', incidentId: 'breach', history: line({ 27: 'SLOW', 28: 'SLOW', 29: 'SLOW' }) },
        { id: 'TECH:PROFILES', label: 'Profiles and family', detail: 'Profiles and screens · 4 screens', status: 'WORKING', history: line({}, 18) },
      ],
    }, 'Apps and devices down · 4 more'),
    {
      id: 'PRODUCTS', title: 'Products', empty: '',
      rows: [
        { id: 'PRODUCT:LIVE', label: 'NORTHSTAR+ Live', detail: 'Adds 6% to peak load', status: 'DOWN', reason: 'The video service is down' },
        { id: 'PRODUCT:KIDS', label: 'NORTHSTAR+ Kids', detail: 'Paused', status: 'OFF' },
      ],
    },
  ],
  lineFromLaunch: false,
  history: [
    past('outage-old', 'Platform outage', 'The whole service went dark for a night', 801, 1, true, 'Failover brought the service back by morning.'),
    past('spike-chicago', 'Traffic spike', 'A season finale overwhelmed a site', 794, 3, true, 'Extra racks took the load.', 'Chicago · Rented'),
    {
      id: 'leak', source: 'CRISIS', title: '“Glass Coast” is on pirate sites', kind: 'Title piracy', where: null,
      severity: 'MINOR', major: false, stage: 'RESOLVED', openedAtWeek: 790, weeks: 4, readyAtWeek: null, weeksLeft: null, resolvedAtWeek: 794,
      affectedViewers: 0, damage: [], cause: '', note: 'Takedowns cleared the copies.', hits: [], region: null,
      repairPath: 'ENERGY', weeksToRunItsCourse: null,
    },
    past('spike-london', 'Traffic spike', 'A football final overwhelmed a site', 787, 5, true, 'The region was rerouted until the site recovered.', 'London · Rented'),
    past('breach-old', 'Account breach', 'Customer accounts were exposed', 775, 6, false, 'Password resets reached everyone affected.'),
    past('backlash-old', 'Recommendation backlash', 'The recommendation system triggered backlash', 768, 3, false, 'Viewers calmed down once the picks were explained.'),
    past('rights-old', 'Rights problem', 'A title went out in a market it was not licensed for', 762, 0, false, 'It was pulled the same week.'),
  ],
};

/* #102 `?calm`: launched 22 weeks ago (23 weeks, the launch's own the first), nothing wrong now */
const young = (marks: Record<number, StreamingStatusDay> = {}, from = 0) => line(marks, from, 23);
const calmState: NetworkState = {
  ...state,
  components: state.components.map(comp => ({
    ...comp, status: 'operational' as const, fromLaunch: true,
    uptime: comp.measure ? 96 : 99.94,
    measure: comp.id === 'REGIONS' ? 'of markets served well · 0 thin · 0 dark' : comp.measure,
    history: Array.from({ length: 23 }, (_, n) => (comp.id === 'DELIVERY' && n === 9 ? 1 : 0)),
  })),
  peakLoad: 41,
};
const calmBoard: StreamingStatusBoard = {
  live: true,
  overall: 'WORKING',
  headline: 'All systems working',
  line: 'Subscribers are watching normally',
  open: [],
  service: { DELIVERY: 'WORKING', ACCOUNTS: 'WORKING', RECOMMENDATIONS: 'WORKING', RIGHTS: 'WORKING' },
  sections: [
    lined({
      id: 'SERVERS', title: 'Servers', note: '12 cities · peak load 41%', empty: '',
      rows: [
        region({ id: 'SERVER:NORTH_AMERICA', label: 'North America', detail: '5 cities · 48 racks · Atlas Compute 2 · Rented 3', status: 'WORKING' }, [
          city('ASHBURN', 'Ashburn', 'WORKING', young()),
          city('CHICAGO', 'Chicago', 'WORKING', young({ 9: 'DOWN', 10: 'SLOW' })),
          city('DALLAS', 'Dallas', 'WORKING', young()),
          city('SEATTLE', 'Seattle', 'WORKING', young({}, 14)),
          city('TORONTO', 'Toronto', 'WORKING', young()),
        ]),
        region({ id: 'SERVER:EUROPE', label: 'Europe', detail: '4 cities · 112 racks · Rented', status: 'WORKING' }, [
          city('FRANKFURT', 'Frankfurt', 'WORKING', young()),
          city('LONDON', 'London', 'WORKING', young()),
          city('MADRID', 'Madrid', 'WORKING', young()),
          city('PARIS', 'Paris', 'WORKING', young()),
        ]),
        region({ id: 'SERVER:ASIA', label: 'Asia', detail: '3 cities · 152 racks · Meridian Edge', status: 'WORKING' }, [
          city('MUMBAI', 'Mumbai', 'WORKING', young()),
          city('SINGAPORE', 'Singapore', 'WORKING', young({ 15: 'SLOW' })),
          city('TOKYO', 'Tokyo', 'WORKING', young()),
        ]),
      ],
    }, 'All 12 cities working'),
    lined({
      id: 'TECH', title: 'Tech', note: '7 running', empty: '',
      rows: [
        { id: 'TECH:PICTURE', label: 'Picture', detail: '4K · Basic', status: 'WORKING', history: young() },
        { id: 'TECH:SOUND', label: 'Sound', detail: '5.1 surround · Basic', status: 'WORKING', history: young() },
        { id: 'TECH:STABILIZATION', label: 'Stabilization', detail: 'Autoscaling · Basic', status: 'WORKING', history: young() },
        { id: 'TECH:PLAYBACK', label: 'Playback', detail: 'Standard player, plus Downloads', status: 'WORKING', history: young({ 6: 'SLOW', 7: 'SLOW' }) },
        { id: 'TECH:APPS', label: 'Apps and devices', detail: 'Phone and web apps · Basic', status: 'WORKING', history: young() },
        { id: 'TECH:TRUST', label: 'Trust and safety', detail: 'Studio DRM · Basic', status: 'WORKING', history: young({ 1: 'SLOW', 2: 'SLOW', 3: 'SLOW', 4: 'SLOW', 5: 'SLOW', 6: 'SLOW' }) },
        { id: 'TECH:SMART_AI', label: 'Smart AI', detail: 'Because you watched · Basic', status: 'WORKING', history: young({}, 18) },
      ],
    }, 'All 7 working'),
    {
      id: 'PRODUCTS', title: 'Products', empty: '',
      rows: [{ id: 'PRODUCT:LIVE', label: 'NORTHSTAR+ Live', detail: 'Adds 6% to peak load', status: 'WORKING' }],
    },
  ],
  lineFromLaunch: true,
  history: [
    past('chicago', 'Traffic spike', 'Premiere traffic overwhelmed a site', 752, 2, true, 'Failover to Dallas held the premiere.', 'Chicago · Atlas Compute'),
    past('broken', 'Feature broken', 'Downloads stopped working', 749, 2, false, 'A patch brought downloads back.'),
    past('breach', 'Account breach', 'Customer accounts were exposed', 744, 6, false, 'Password resets reached everyone affected.'),
  ],
};
const calm = new URLSearchParams(window.location.search).has('calm');

const Fixture = () => (
  <PlatformDesk brand={brand} state={calm ? calmState : state} onBack={() => undefined} initialTab="STATUS" statusBoard={calm ? calmBoard : board} onRespondToIncident={() => undefined}
    onRepairIncident={(incident, path) => (incident.takedown
      ? { ok: true, message: path === 'ENERGY' ? 'Taken down: the copies are gone, and its viewers are back on your service.'
        : path === 'FIX' ? 'Takedowns filed: the copies come down in 2 weeks, about half of them right away.' : 'Letting it run: 3 more weeks of viewers watching pirated copies, no cash.' }
      : { ok: path !== 'ENERGY', message: path === 'FIX' ? `Fix under way: ${incident.title} is repaired in 5 weeks.` : path === 'WAIT' ? 'Waiting it out: 9 more weeks of damage, no cash.' : 'Needs 50 energy; you have 20.' })} />
);
createRoot(document.getElementById('root')!).render(<Fixture />);
