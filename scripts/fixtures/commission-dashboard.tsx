/* The project dashboard (ProjectDashboardModal) of a show the player made for another platform (a commission credit),
   for the browser audit scripts/audit-commission-dashboard.cjs (24 Nov 2026, player report: a Disney+ commission showed
   "Substantial loss" and -$176.9M, although Disney+ paid for the production and paid the studio a producer fee).
   One case per page: ?case=credit-waiting | credit-dated | credit-live | credit-big-deal | film-flop | own-funded-series.
   The credit goes through the same two builders the Production House uses (buildPlatformCommissionFilmography, then
   buildCinemaArchiveDashboardProject), so the page is what the player opens from "Past projects". */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { ProjectDashboardModal } from '../../views/lifestyle/business/components/ProjectDashboardModal';
import { createBusiness } from '../../services/businessLogic';
import { INITIAL_PLAYER } from '../../types';
import { buildPlatformCommissionFilmography } from '../../services/platformAi/platformAiPlayerCommissionPresentation';
import { buildCinemaArchiveDashboardProject } from '../../services/boxOffice/boxOfficePresentation';

/* "now" in the fixture: Age 32, Week 10 = absolute week 1621 (getAbsoluteWeek: (age - 1) * 52 + (week - 1)) */
const NOW_AGE = 32;
const NOW_WEEK = 10;
const NOW = (NOW_AGE - 1) * 52 + (NOW_WEEK - 1);

const makeOffer = (over: Record<string, unknown> = {}): any => ({
  id: 'o1', platformId: 'DISNEY_PLUS', platformName: 'Disney+', platformContentPlanId: 'plan1', briefReference: 'Disney+ Commission #123',
  title: 'Harbor Lights', projectType: 'SERIES', genre: 'DRAMA', status: 'DELIVERED',
  productionBudget: 176_900_000, producerFee: 12_000_000, producerFeePaid: 12_000_000, productionBudgetReturned: 0,
  minimumImdbRating: 7, deliveryAllowanceWeeks: 52, createdAtAbsoluteWeek: 1500, expiresAtAbsoluteWeek: 1600,
  acceptedAtAbsoluteWeek: 1510, greenlitAtAbsoluteWeek: 1520, deliveredAtAbsoluteWeek: 1600, deliveryDeadlineAtAbsoluteWeek: 1650,
  cooldownUntilAbsoluteWeek: null, studioId: 's1', scriptId: 'sc1', commitmentId: 'c1', canonicalProductionId: 'prod1',
  finalQualityScore: 80, deliveredImdbRating: 8.0, releasedAtAbsoluteWeek: null,
  ...over,
});

/* premiereAt: undefined = the platform has no slate entry, a number = the week its calendar picked */
const makePlayer = (offer: any, premiereAt?: number | null): any => {
  const player: any = structuredClone(INITIAL_PLAYER);
  player.age = NOW_AGE;
  player.currentWeek = NOW_WEEK;
  player.world = {
    ...player.world,
    platformAiPlayerCommissionOffers: { [offer.id]: offer },
    platforms: premiereAt === undefined ? player.world?.platforms : {
      [offer.platformId]: {
        cashReserve: 5000,
        ai: {
          status: 'ACTIVE', marketOperations: [], localizationJobs: [],
          slate: [{ id: offer.platformContentPlanId, releaseCountryIds: [], releaseEntries: premiereAt === null ? [] : [{ premiereAtAbsoluteWeek: premiereAt }] }],
        },
      },
    },
  };
  return player;
};

const creditProject = (offer: any): any => buildCinemaArchiveDashboardProject(
  buildPlatformCommissionFilmography({ ownedProjects: [], offers: { [offer.id]: offer }, studioId: 's1' }).commissionCredits[0] as any,
);

const CASES: Record<string, () => { player: any; project: any }> = {
  'credit-waiting': () => { const offer = makeOffer(); return { player: makePlayer(offer, null), project: creditProject(offer) }; },
  'credit-dated': () => { const offer = makeOffer(); return { player: makePlayer(offer, NOW + 4), project: creditProject(offer) }; },
  'credit-live': () => { const offer = makeOffer(); return { player: makePlayer(offer, NOW - 6), project: creditProject(offer) }; },
  'credit-big-deal': () => {
    const offer = makeOffer({ bigDeal: true, platformId: 'PARAMOUNT_PLUS', platformName: 'Paramount+', title: 'The Long Winter Of The Harbor Lights Company', productionBudget: 412_500_000, producerFee: 61_875_000, producerFeePaid: 61_875_000 });
    return { player: makePlayer(offer, null), project: creditProject(offer) };
  },
  /* controls: a film that really lost money, and your own series a platform paid for. Both keep their financial pages. */
  'film-flop': () => {
    const film = {
      id: 'f1', name: 'Cold Orbit', title: 'Cold Orbit', type: 'MOVIE', projectType: 'MOVIE', genre: 'THRILLER', studioId: 's1',
      budget: 100_000_000, gross: 20_000_000, totalStudioReceipts: 10_000_000, streamingRevenue: 0, soundtrackRevenue: 0, imdbRating: 5.2, rating: 5.2,
      projectDetails: { type: 'MOVIE', genre: 'THRILLER', estimatedBudget: 100_000_000, hiddenStats: {} },
    };
    const player: any = structuredClone(INITIAL_PLAYER);
    player.age = NOW_AGE; player.currentWeek = NOW_WEEK;
    return { player, project: buildCinemaArchiveDashboardProject(film as any) };
  },
  'own-funded-series': () => {
    const series = {
      id: 'u1', name: 'Glass Harbor', title: 'Glass Harbor', type: 'SERIES', projectType: 'SERIES', genre: 'DRAMA', studioId: 's1',
      budget: 40_000_000, gross: 0, streamingRevenue: 6_000_000, soundtrackRevenue: 0, imdbRating: 7.4, rating: 7.4,
      platformProductionFunding: 40_000_000, streamingPlatform: 'DISNEY_PLUS',
      projectDetails: { type: 'SERIES', genre: 'DRAMA', estimatedBudget: 40_000_000, hiddenStats: {} },
    };
    const player: any = structuredClone(INITIAL_PLAYER);
    player.age = NOW_AGE; player.currentWeek = NOW_WEEK;
    return { player, project: buildCinemaArchiveDashboardProject(series as any) };
  },
};

const caseId = new URLSearchParams(window.location.search).get('case') || 'credit-waiting';
const build = CASES[caseId];
const studio: any = createBusiness('Commission Fixture', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', 20);
studio.id = 's1';

if (!build) {
  document.getElementById('root')!.textContent = `Unknown case: ${caseId}`;
} else {
  const { player, project } = build();
  createRoot(document.getElementById('root')!).render(
    <div data-case={caseId}>
      <ProjectDashboardModal
        project={project}
        player={player}
        studio={studio}
        onClose={() => undefined}
        onUpdatePlayer={() => { throw new Error('A dashboard render cannot update a save'); }}
      />
    </div>,
  );
}
