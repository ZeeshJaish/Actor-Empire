/* The world reacts (#117) in the game's own News and X apps: one real industry week for a live service, Northstar+.
   ?story=brand (default): a new look and a 4K plan a quarter cheaper than the global rivals'.
   ?story=offer: Free with ads made the main offer, and a 1080p plan dearer than the rivals' 4K.
   ?app=news (default) or ?app=x. Nothing saves. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { INITIAL_PLAYER, type Player } from '../../types';
import { migratePlayerSave } from '../../services/saveMigration';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../../services/streamingFounding';
import { normalizeStreamingPricingConfiguration } from '../../services/streamingPricingEconomy';
import { createStreamingPricingForCoreModel } from '../../services/streamingCommercialOffers';
import { saveStreamingPricingPlan } from '../../services/streamingLaunchProgram';
import { applyStreamingBrandLook, getStreamingBrandLook } from '../../services/streamingBrandStudio';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { processIndustryWorldWeek } from '../../services/industryWorld';
import { NewsApp } from '../../views/mobile/NewsApp';
import { XApp } from '../../views/mobile/XApp';

const query = new URLSearchParams(window.location.search);
const offer4k = { picture: 'PICTURE_4K', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 2, downloads: false } as const;

const build = (): Player => {
  const base = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'world-reacts', name: 'World Reacts', age: 24, currentWeek: 10, money: 300_000_000 });
  const eligible: Player = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, lifecycle: 'ELIGIBLE', simulationSeed: 'owned-streaming:world-reacts', milestoneKeys: ['streaming-launch-clearance'] } };
  const founded = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(eligible, { ...createDefaultStreamingFoundingDraft(100), currentStep: 2, name: 'Northstar+' })).player;
  const platform = founded.ownedStreamingPlatform;
  const pricing = normalizeStreamingPricingConfiguration({ ...platform.serviceConfiguration.pricing,
    commercialOffers: { ...platform.serviceConfiguration.pricing.commercialOffers!, coreModelSelected: true } });
  const live = { ...founded, ownedStreamingPlatform: { ...platform, lifecycle: 'ACTIVE', treasuryCash: 50_000_000, launchCommit: { idempotencyKey: 'launch' } as never,
    metrics: { ...platform.metrics, subscribers: 2_000_000 }, serviceConfiguration: { ...platform.serviceConfiguration, storefrontLayoutId: 'cinema', pricing } } } as Player;
  const week = getAbsoluteWeek(live.age, live.currentWeek);
  const withPlans = (player: Player, plans: Player['ownedStreamingPlatform']['serviceConfiguration']['pricing']['plans']) => ({ ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform,
    serviceConfiguration: { ...player.ownedStreamingPlatform.serviceConfiguration, pricing: normalizeStreamingPricingConfiguration({ ...player.ownedStreamingPlatform.serviceConfiguration.pricing, plans }) } } }) as Player;
  const acted = query.get('story') === 'offer'
    ? withPlans(saveStreamingPricingPlan(live, createStreamingPricingForCoreModel(pricing, 'ADVERTISING'), 'OPERATIONS').player,
      [{ id: 'STANDARD', name: 'Standard', monthly: 29.99, featureIds: [], ads: false }])
    : withPlans(applyStreamingBrandLook(live, { ...getStreamingBrandLook(live.ownedStreamingPlatform.identity!), visualMarkId: 'ORBIT', primaryColor: '#8B5CF6' }).player,
      [{ id: 'PREMIUM', name: 'Premium', monthly: 12.99, featureIds: [], ads: false, offer: { ...offer4k } }]);
  return processIndustryWorldWeek(acted, acted.world, week + 1).player;
};

const App = () => {
  const [player, setPlayer] = useState(build);
  return query.get('app') === 'x'
    ? <XApp player={player} onBack={() => undefined} onUpdatePlayer={setPlayer} />
    : <NewsApp player={player} onBack={() => undefined} />;
};
createRoot(document.getElementById('root')!).render(<App />);
