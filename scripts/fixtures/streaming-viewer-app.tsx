/* The viewer app (#58) with what a subscriber meets while an incident is open, for checking at
   phone widths. `?outage=` picks one: down (a platform outage, titles stall), slow (slow streams,
   a fix rolling out), downloads (Downloads broken: the button pauses), app (the Smart TV app keeps
   closing), none. `?plan=` opens the app as BASIC (no downloads: the button opens the plans that
   have them) or PREMIUM (downloads). Phase 4 (#63): `?ai=1` runs Because you watched, `?profiles=1`
   opens on "Who's watching?", and `?kids=1`, `?channels=1`, `?autoplay=1` give both plans Kids
   profiles, AI channels and Autoplay; `?phase4=1` turns on all five. Nothing here saves. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/fonts.css';
import { ViewerApp, type AppState } from '../../components/streaming-transplant/StreamingViewerExperience';
import type { Brand } from '../../components/streaming-transplant/StreamingBrandVisuals';
import type { StreamingViewerPersonal, StreamingViewerPlan, StreamingViewerQuality } from '../../services/streamingViewerQuality';
import type { StreamingViewerOutage } from '../../services/streamingViewerOutage';

const brand: Brand = {
  name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
  publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
  lockupId: 'WORDMARK', serverCity: null,
};
const STEPS = ['4K', '1080p', '720p', '480p'] as const;
const quality = (planMax: '4K' | '1080p', planName: string): StreamingViewerQuality => ({
  planName, planMax, nowIn: null,
  badges: planMax === '4K' ? ['4K', 'HDR', 'Spatial audio'] : [],
  menu: STEPS.map(label => ({ label, state: STEPS.indexOf(label) >= STEPS.indexOf(planMax) ? 'AVAILABLE' as const : 'UPGRADE' as const })),
});
const query = new URLSearchParams(window.location.search);
const on = (key: string) => query.get(key) === '1' || query.get('phase4') === '1';
/* Phase 4's plan rows (#62), as the plan cards list them */
const phase4 = [...(on('kids') ? ['Kids profiles'] : []), ...(on('channels') ? ['AI channels'] : []), ...(on('autoplay') ? ['Autoplay'] : [])];
const plans: StreamingViewerPlan[] = [
  { id: 'BASIC', name: 'Basic', monthly: 7.99, price: '$7.99 a month', adLevel: 'NONE', adSpotsPerHour: 0, picture: '1080p Full HD',
    features: ['2 screens at once', ...phase4], ads: 'No ads', quality: quality('1080p', 'Basic'), colorId: 'ocean' },
  { id: 'PREMIUM', name: 'Premium', monthly: 14.99, price: '$14.99 a month', adLevel: 'NONE', adSpotsPerHour: 0, picture: '4K HDR',
    features: ['Spatial audio', '4 screens at once', 'Downloads', ...phase4], ads: 'No ads', quality: quality('4K', 'Premium'), colorId: 'magenta' },
];
const personal: StreamingViewerPersonal | null = on('ai') || on('profiles') ? { because: on('ai'), profiles: on('profiles') } : null;
const OUTAGES: Record<string, StreamingViewerOutage | null> = {
  down: { headline: 'We\'re fixing an issue', line: 'Some titles may not start, or may stop part way. We\'re on it.', stall: true, downloadsDown: false },
  slow: { headline: 'A fix is rolling out', line: 'Titles may be slow to start at busy times.', stall: true, downloadsDown: false },
  downloads: { headline: 'We\'re fixing an issue', line: 'Downloads aren\'t working right now. Streaming works as usual.', stall: false, downloadsDown: true },
  app: { headline: 'We\'re fixing an issue', line: 'The Smart TV app may close while you watch. Your other screens work as usual.', stall: false, downloadsDown: false },
  none: null,
};
const outage = OUTAGES[query.get('outage') || 'down'] ?? null;
const titles: AppState['titles'] = [
  { id: 't1', title: 'Midnight Harbor', kind: 'ORIGINAL', format: 'Series', genre: 'Thriller', hue: 214, logline: 'A harbour town keeps one secret too many.', rank: 1,
    episodes: [{ n: 1, title: 'Low Tide', mins: 42 }, { n: 2, title: 'Fog Bank', mins: 44 }, { n: 3, title: 'The Lighthouse Keeper\'s Last Confession', mins: 47 }] },
  { id: 't2', title: 'Glass Coast', kind: 'LICENSED', format: 'Film', genre: 'Drama', hue: 28, logline: 'Two sisters, one summer house.', rank: 2, progress: .4 },
  { id: 't3', title: 'Paper Window', kind: 'ORIGINAL', format: 'Series', genre: 'Comedy', hue: 312, logline: 'An office that never closes.', rank: 3, newThisWeek: true },
  { id: 't4', title: 'Lantern Lane', kind: 'ORIGINAL', format: 'Series', genre: 'Animation', hue: 46, logline: 'Three friends light up the oldest street in town.', rank: 4,
    episodes: [{ n: 1, title: 'The First Lantern', mins: 22 }, { n: 2, title: 'Rain Day', mins: 22 }] },
  { id: 't5', title: 'Comet Run', kind: 'LICENSED', format: 'Film', genre: 'Adventure', hue: 168, logline: 'A race to the edge of the sky.', progress: .7 },
  { id: 't6', title: 'Cold Signal', kind: 'LICENSED', format: 'Film', genre: 'Drama', hue: 256, logline: 'A radio operator hears her own voice.' },
];
/* #114: `?layout=` opens the app on any of the 13 front pages' homes (cinema, spotlight, quiet-shelf, marquee, split-hero,
   editorial-index, chapters, shelves, timeline, wall, mosaic, vertical-feed, freeform-canvas) */
const state: AppState = {
  live: true, layoutId: query.get('layout') || 'cinema', titles, watchingNow: 182_000, network: { peakLoad: 42, tier: '4K', latencyMs: 30 },
  quality: plans[0].quality, plans, currentPlanId: query.get('plan') === 'PREMIUM' ? 'PREMIUM' : 'BASIC', outage,
  ...(personal ? { personal } : {}),
  /* #115: `?ident=STANDARD|FULL|CINEMATIC` opens the app on the ident (Pulse; ?sound= another), for its kit's length;
     #119: GENRE, ADAPTIVE and LIVING too, each its own film */
  ...(query.get('ident') ? { opening: {
    sound: (query.get('sound') || 'pulse') as never, packageId: query.get('ident')!,
    seconds: ({ STANDARD: 3, FULL: 8, CINEMATIC: 12, GENRE: 10, ADAPTIVE: 10, LIVING: 12 } as Record<string, number>)[query.get('ident')!] ?? 3,
  } } : {}),
};

createRoot(document.getElementById('root')!).render(<ViewerApp brand={brand} state={state} onBack={() => undefined} />);
