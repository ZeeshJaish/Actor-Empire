import { strict as assert } from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ActorEmpireHome from '../components/ui-overhaul/HomeScreen';

const markup = renderToStaticMarkup(
    <ActorEmpireHome
        name="Avatar QA"
        avatarUrl="data:image/png;base64,qa"
        onChangeAvatar={() => undefined}
    />
);

assert.match(
    markup,
    /<button[^>]*class="ae-port"[^>]*aria-label="Change avatar"/,
    'The complete profile portrait should be the accessible Change Avatar button.'
);
assert.doesNotMatch(
    markup,
    /<button[^>]*class="ae-cam"/,
    'The camera badge should not be a nested button that double-counts portrait taps.'
);

console.log('Home avatar interaction audit passed.');
