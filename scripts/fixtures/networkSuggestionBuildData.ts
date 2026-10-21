/** Memory-only capture of the real career bridge. Never imported by production. */
import React from 'react';
import jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { StreamingBuildWizardExperience } from '../../components/streaming-transplant/StreamingBuildWizardExperience';
import { BuildWizard } from '../../components/studio-finance/components/build/BuildWizard';
import { createStreamingCatalogueReadContext } from '../../services/streamingContentAvailability';
import { forecastWorldStreamingBuildDemand } from '../../services/worldEconomy/worldStreamingPricingForecast';
import { getStreamingDayOneMarket } from '../../services/streamingDayOneMarkets';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import type { BuildData, BuildDraft } from '../../components/studio-finance/finance/build';
import type { BuildInputs, BuildSel } from '../../components/streaming-transplant/StreamingBuildoutExperience';
import type { Player } from '../../types';

export function captureNetworkBuildData(player: Player, countryCodes?: string[], selectionOverride?: BuildSel,
  options: { settled?: Pick<BuildInputs, 'defineLaunchPaid' | 'catalogueSpend' | 'originalsSpend'>; marketing?: BuildData['marketing'] } = {},
): { data: BuildData; draft: BuildDraft } {
  const platform = player.ownedStreamingPlatform;
  const ids = countryCodes ?? platform.marketOperations.map(operation => operation.countryId).filter(Boolean);
  const markets = ids.map(getStreamingDayOneMarket).filter(Boolean);
  const forecast = forecastWorldStreamingBuildDemand(player, platform.serviceConfiguration.pricing, ids, createStreamingCatalogueReadContext(player));
  const selection: BuildSel = selectionOverride ?? { placements: [], facilities: [], arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE' };
  const brand: React.ComponentProps<typeof StreamingBuildWizardExperience>['brand'] = {
    name: 'Network QA', markId: 'FRAME_PLAY', customMark: null, hue: 0, sat: 80,
    identId: 'silent', customIdent: null, promiseId: 'BALANCED', publicManifesto: '',
    layoutId: 'wall', typeId: 'default', accentHue: 25, identMode: 'none', identLen: 2,
    ratingId: 'GENERAL', lockupId: 'default', serverCity: null,
  };
  const inputs: BuildInputs = {
    absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek), fibreState: platform.fibre,
    treasury: platform.treasuryCash,
    catalogueSpend: platform.catalogLicenses.reduce((sum, license) => sum + license.minimumGuarantee, 0),
    catalogueTitles: platform.catalogProjectIds.length,
    catalogueRights: { globalTitleCount: 0, primaryMarketId: ids[0], licensedTitles: platform.catalogLicenses.map(license => ({ territory: license.territory })) },
    originalsSpend: 0, originalsCount: 0, premiereTitle: 'QA',
    regions: [...new Set(markets.map(market => market!.regionId))],
    markets: markets.map(market => ({ id: market!.id, country: market!.country, region: market!.regionId,
      audience: market!.streamingAudience, annualGrowthPercent: market!.annualGrowthPercent,
      recommendedCityId: market!.recommendedCityId, localizationNote: market!.localizationNote })),
    hasExplicitOpeningMarkets: true, marketPlanning: { editable: true, reason: null }, homeCityId: null,
    audienceMul: 1, openingDemandForecast: { low: forecast.low, likely: forecast.likely, high: forecast.high, byMarket: forecast.byMarket },
    ...options.settled,
  };
  let captured: { data: BuildData; draft: BuildDraft } | undefined;
  // Intercept the adapter boundary under either JSX transform; no production audit hooks.
  const original = React.createElement;
  const runtime = jsxRuntime as unknown as { jsx: (...args: any[]) => any; jsxs: (...args: any[]) => any };
  const originalJsx = runtime.jsx;
  const originalJsxs = runtime.jsxs;
  const intercept = (factory: (...args: any[]) => any) => (type: any, props: any, ...rest: any[]) => {
    if (type === BuildWizard) {
      captured = { data: props.data, draft: props.initialDraft };
      return original('span', null, 'Captured canonical Build props');
    }
    return factory(type, props, ...rest);
  };
  runtime.jsx = intercept(originalJsx);
  runtime.jsxs = intercept(originalJsxs);
  React.createElement = intercept(original);
  try {
    renderToStaticMarkup(original(StreamingBuildWizardExperience, {
      brand, inputs, sel: selection, marketing: options.marketing, canonicalSource: 'CAREER', onChange: () => {}, onBack: () => {},
    }));
  } finally {
    React.createElement = original; runtime.jsx = originalJsx; runtime.jsxs = originalJsxs;
  }
  if (!captured?.data.canonical || captured.data.canonicalMode !== 'CAREER') throw Error('Career adapter was not captured');
  return captured;
}
