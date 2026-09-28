import assert from 'node:assert/strict';
import type { LifeEvent, LifeEventOption, ScheduledEvent } from '../types';
import { buildLifeEventDiagnosticContext } from '../services/lifeEventDiagnostics';

const lifeEvent: LifeEvent = {
    id: 'life_world_reaction_antitrust_31_8',
    type: 'LEGAL',
    title: 'Regulatory pressure',
    description: 'A regulator is reviewing the studio.',
    category: 'Studio world reaction',
    options: [{ id: 'COOPERATE', label: 'Cooperate', impact: player => ({ updatedPlayer: player, log: 'Done' }) }],
};
const option = lifeEvent.options[0] as LifeEventOption;
const event: ScheduledEvent = {
    id: 'event_world_reaction_anti_monopoly_pressure_31_8',
    week: 8,
    type: 'LIFE_EVENT',
    title: lifeEvent.title,
    data: { worldReactionEventType: 'ANTI_MONOPOLY_PRESSURE', lifeEvent },
};

assert.deepEqual(buildLifeEventDiagnosticContext(event, lifeEvent, option, 0), {
    event_id: 'event_world_reaction_anti_monopoly_pressure_31_8',
    event_type: 'LIFE_EVENT',
    life_event_id: 'life_world_reaction_antitrust_31_8',
    life_event_type: 'LEGAL',
    life_event_category: 'Studio world reaction',
    event_source: 'WORLD_REACTION',
    event_source_detail: 'ANTI_MONOPOLY_PRESSURE',
    option_id: 'COOPERATE',
    option_index: 0,
    golden: false,
    resolution_path: 'RUNTIME_CALLBACK',
});

const persistedEvent: ScheduledEvent = {
    ...event,
    data: {
        lifeEvent: {
            ...lifeEvent,
            options: [{ label: 'Unknown legacy choice' }],
        },
    },
};
assert.equal(
    buildLifeEventDiagnosticContext(
        persistedEvent,
        persistedEvent.data.lifeEvent,
        persistedEvent.data.lifeEvent.options[0],
        0,
    ).resolution_path,
    'LEGACY_UNRESOLVABLE',
);

const recoverableLegacyEvent: ScheduledEvent = {
    ...event,
    data: {
        ...event.data,
        lifeEvent: {
            ...lifeEvent,
            options: [{ id: 'COOPERATE', label: 'Cooperate' }],
        },
    },
};
assert.equal(
    buildLifeEventDiagnosticContext(
        recoverableLegacyEvent,
        recoverableLegacyEvent.data.lifeEvent,
        recoverableLegacyEvent.data.lifeEvent.options[0],
        0,
    ).resolution_path,
    'LEGACY_RECOVERY',
);

const youtubeEvent: ScheduledEvent = {
    ...event,
    id: 'youtube_choice',
    data: { youtubeResolution: { domain: 'YOUTUBE' }, lifeEvent },
};
assert.equal(
    buildLifeEventDiagnosticContext(youtubeEvent, lifeEvent, option, 0).event_source,
    'YOUTUBE',
);
assert.equal(
    buildLifeEventDiagnosticContext(youtubeEvent, lifeEvent, option, 0).resolution_path,
    'SERIALIZED_YOUTUBE',
);

const malformedContext = buildLifeEventDiagnosticContext(
    { ...event, id: 'malformed_event', data: {} },
    undefined as unknown as LifeEvent,
    { label: 'Continue' },
    0,
);
assert.equal(malformedContext.life_event_id, 'UNKNOWN');
assert.equal(malformedContext.event_source, 'LIFE_EVENT_LOGIC');
assert.equal(malformedContext.resolution_path, 'LEGACY_UNRESOLVABLE');

console.log('Life-event diagnostic context audit passed.');
