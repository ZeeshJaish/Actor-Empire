import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ZedburyStudiosIntro from '../components/ZedburyStudiosIntro';

const source = (relativePath: string) => readFileSync(relativePath, 'utf8');

const ident = renderToStaticMarkup(<ZedburyStudiosIntro state="on" />);
assert.match(ident, /id="act1"/, 'The startup ident needs its isolated studio-card surface.');
assert.match(ident, /aria-label="Zedbury Studios"/, 'The vector mark needs an accessible studio name.');
assert.match(ident, />Presents</, 'The studio card needs the approved restrained caption.');
assert.doesNotMatch(ident, /Tap to skip/, 'A non-interactive ident must not advertise a dead skip action.');

const skippableIdent = renderToStaticMarkup(<ZedburyStudiosIntro state="on" onSkip={() => undefined} />);
assert.match(skippableIdent, /Tap to skip/, 'A host-provided skip action should expose its affordance.');

const app = source('App.tsx');
assert.match(app, /<ZedburyStudiosIntro/, 'Startup must render the final Zedbury studio ident.');
assert.doesNotMatch(app, /<EmpireStudioBumper/, 'The superseded startup bumper must not remain reachable.');

const contentMarket = source('components/StreamingContentMarket.tsx');
assert.match(contentMarket, /initialTab/, 'Content Market routes need a deterministic initial shelf.');
assert.match(contentMarket, /You don't own a production house/, 'An empty studio shelf must explain the missing prerequisite.');
assert.match(contentMarket, /Your studio hasn't released anything yet/, 'A pre-release studio shelf must explain its timing.');
assert.match(contentMarket, /No listing matches that filter/, 'Filtered emptiness must not be described as an empty market.');

const platform = source('components/StreamingPlatformHQ.tsx');
assert.match(platform, /contentMarketInitialTab/, 'Platform HQ must preserve the selected Content Market route.');
assert.match(platform, /fibreState: platform\.fibre/, 'Career Build must receive the platform fibre state used by canonical coverage.');

const campus = source('components/StreamingTechnologyCampus.tsx');
assert.match(campus, /NETWORK FIBRE/, 'Technology Campus must expose the canonical fibre ladder.');
assert.match(campus, /buyStreamingFibreLevels/, 'Fibre tuning must use the canonical purchase service.');
assert.match(campus, /installStreamingFibreGeneration/, 'Fibre generation rollout must use the canonical lifecycle service.');

const rehearsal = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
assert.match(rehearsal, /The five stages of a rehearsal/, 'The rehearsal must use the final five-stage signal rail.');
assert.match(rehearsal, /program monitor/i, 'The rehearsal must show the viewer-facing programme monitor.');
assert.match(rehearsal, /forecastFor\?\.\(scenario\)/, 'Saved careers must keep the canonical rehearsal forecast bridge.');
assert.match(rehearsal, /regionPlans: reconstructStreamingRegionPlans/, 'The visual transplant must retain canonical regional build intent.');
assert.match(rehearsal, /fibreState\?: StreamingFibreState/, 'The rehearsal must grade the installed canonical fibre state.');

const worldOffers = source('services/worldEconomy/worldStreamingOffers.ts');
assert.match(worldOffers, /streamingIntroOfferAppliesTo/, 'World demand must apply an introductory offer only to its selected plan.');

const lifestyle = source('views/lifestyle/LifestyleAssets.tsx');
assert.match(lifestyle, /REAL_ESTATE_DEALERS/, 'Property shopping must expose the canonical dealer catalogue.');
assert.match(lifestyle, /quoteRealEstateSale/, 'Property sale UI must use the canonical market quote.');
assert.match(lifestyle, /GROUP_HOLDINGS_ABOVE/, 'Large portfolios must group without burdening small portfolios.');

console.log('Claude frontend Phase 5 UI contract passed.');
