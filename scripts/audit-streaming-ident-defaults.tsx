import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingDefineLaunchExperience from '../components/StreamingDefineLaunchExperience';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import type { LaunchDraft } from '../components/studio-finance/finance/launch';

const renderIdent = (initialDraft?: LaunchDraft, player = contentMarketFixture()) => renderToStaticMarkup(
  <StreamingDefineLaunchExperience player={player} initialStep="IDENTITY" initialDraft={initialDraft}
    onUpdatePlayer={() => {}} onClose={() => {}} onOpenFinance={() => {}} onOpenCatalogue={() => {}}
    onOpenBuild={() => {}} onOpenPricing={() => {}} onOpenTechnology={() => {}} />
);
const soundButtons = (html: string) => html.match(/<button[^>]*aria-label="Preview [^"]+ ident sound"[^>]*>/g) || [];

test('fresh ident starts with Silent selected first and the included ident selected first', () => {
  const markup = renderIdent();
  const sounds = soundButtons(markup);
  assert.ok(sounds.length > 1);
  assert.match(sounds[0], /Preview Silent ident sound/);
  assert.match(sounds[0], /aria-pressed="true"/);
  assert.match(markup, /aria-label="Just the ident" aria-pressed="true" class="id-kit is-on[^"]*"/);
  assert.ok(markup.indexOf('Just the ident') < markup.indexOf('The whole kit'));
});

test('an untouched restored draft gets the included silent defaults', () => {
  const markup = renderIdent({ selectedCountryIds: [], soundId: undefined, packageId: undefined });
  assert.match(soundButtons(markup)[0], /aria-pressed="true"/);
  assert.match(markup, /aria-label="Just the ident" aria-pressed="true" class="id-kit is-on[^"]*"/);
});

test('a saved player choice survives the new defaults', () => {
  const markup = renderIdent({ selectedCountryIds: [], soundId: 'premiere', packageId: 'full' });
  const sounds = soundButtons(markup);
  assert.match(sounds.find(s => s.includes('Preview Premiere'))!, /aria-pressed="true"/);
  assert.match(sounds.find(s => s.includes('Preview Silent'))!, /aria-pressed="false"/);
  assert.match(markup, /aria-label="(?:Preview )?The whole kit[^"]*" aria-pressed="true" class="id-kit is-on[^"]*"/);
});

test('a commissioned sound remains selected when no working draft overrides it', () => {
  const player = contentMarketFixture();
  player.ownedStreamingPlatform.serviceConfiguration.soundIdentKey = 'ASCENT';
  player.ownedStreamingPlatform.serviceConfiguration.identPackageId = 'STANDARD';
  const markup = renderIdent(undefined, player);
  assert.match(soundButtons(markup).find(s => s.includes('Preview Ascent'))!, /aria-pressed="true"/);
});
