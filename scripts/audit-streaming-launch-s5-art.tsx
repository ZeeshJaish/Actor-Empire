import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StreamingTitleArt } from '../components/studio-finance/components/StreamingTitleArt';
import { topEarners } from '../components/studio-finance/finance/derive';
import type { TitleFinance } from '../components/studio-finance/finance/types';
import { Poster as RightsOneSheet } from '../content-market-exact/Poster';

const fallback = renderToStaticMarkup(<StreamingTitleArt id="stable-film-42" title="The Long Horizon" genre="Drama" size={54} />);
assert.equal(fallback, renderToStaticMarkup(<StreamingTitleArt id="stable-film-42" title="The Long Horizon" genre="Drama" size={54} />),
  'A title gets stable fallback art across renders.');
assert.match(fallback, /data-title-art="stable-film-42"/);
assert.match(fallback, /THE LONG<\/b><b>HORIZON/, 'The established one-sheet includes the actual title.');

const custom = renderToStaticMarkup(<StreamingTitleArt id="stable-film-42" title="The Long Horizon" genre="Drama" size={54}
  poster={{ type: 'IMAGE', imageData: 'data:image/png;base64,dGVzdA==' }} />);
assert.match(custom, /<img[^>]*src="data:image\/png;base64,dGVzdA=="/, 'Actual production art wins when present.');
assert.doesNotMatch(custom, /OneSheet_po/, 'The generated one-sheet is a fallback, not a second poster.');

const financeTitle: TitleFinance = {
  id: 'stable-film-42', name: 'The Long Horizon', format: 'FILM',
  poster: { type: 'IMAGE', imageData: 'data:image/png;base64,dGVzdA==' },
  subscriptionValue: 1, advertising: 0, licensing: 0,
  productionCost: 0, marketingCost: 0, infrastructureCost: 0, trend: 0,
};
assert.match(renderToStaticMarkup(<StreamingTitleArt id={financeTitle.id} title={financeTitle.name}
  poster={topEarners([financeTitle])[0].poster} />), /<img[^>]*src="data:image\/png;base64,dGVzdA=="/,
  'Finance rankings keep the saved title image, rather than losing it during projection.');

const rightsFallback = renderToStaticMarkup(<RightsOneSheet id="stable-film-42" title="The Long Horizon" genre="Drama" hue={164} size="sm" />);
const rightsCustom = renderToStaticMarkup(<RightsOneSheet id="stable-film-42" title="The Long Horizon" genre="Drama" hue={164} size="sm"
  poster={{ type: 'IMAGE', imageData: 'data:image/png;base64,dGVzdA==' }} />);
assert.match(rightsFallback, /OneSheet_po/, 'The rights market retains its production one-sheet.');
assert.match(rightsCustom, /<img[^>]*src="data:image\/png;base64,dGVzdA=="/, 'The rights market also prefers the same production image.');

console.log('S5 title art: canonical image precedence and deterministic one-sheet passed.');
