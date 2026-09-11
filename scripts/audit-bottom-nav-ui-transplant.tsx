import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BottomNav } from '../components/BottomNav';
import { INITIAL_PLAYER, Page } from '../types';

const html = renderToStaticMarkup(
  <BottomNav
    player={INITIAL_PLAYER}
    activePage={Page.LIFESTYLE}
    setPage={() => undefined}
    unreadMessages={12}
  />,
);

assert.match(html, /<nav[^>]+aria-label="Primary game navigation"/);
assert.match(html, /aria-label="Lifestyle"[^>]+aria-current="page"/);
assert.match(html, /aria-label="Mobile"/);
assert.match(html, />9\+</);
assert.doesNotMatch(html, /aria-label="Store"/);

console.log('Bottom navigation UI transplant audit passed.');
