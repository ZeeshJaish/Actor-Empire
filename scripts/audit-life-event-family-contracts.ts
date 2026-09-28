import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type LifeEvent, type Player, type ScheduledEvent } from '../types';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import {
    getLifeEventResolutionContractViolations,
    materializePlayerLifeEventImpacts,
} from '../services/lifeEventResolver';

const source = structuredClone(INITIAL_PLAYER) as Player;
source.id = 'life-event-family-contract-player';

const familyDescriptors = [
    ['STANDARD', {}],
    ['LUXE', {}],
    ['FUNDING_BREACH', {}],
    ['GOVERNMENT_AUDIT', {}],
    ['WORLD_REACTION', { worldReactionEventType: 'ANTI_MONOPOLY_PRESSURE' }],
    ['REGULATOR_PRESSURE', { regulatorPressureEventType: 'REGULATOR_REVIEW' }],
    ['TALENT_INSTABILITY', { talentInstabilityEventType: 'RETENTION_CRISIS' }],
    ['RIVAL_RETALIATION', { rivalRetaliationEventType: 'NEGATIVE_PRESS_LEAK' }],
    ['SHAREHOLDER_VOTING', { stockDecisionType: 'SHAREHOLDER_VOTE' }],
] as const;

const createFamilyEvent = (
    family: string,
    data: Record<string, string>,
    index: number,
): ScheduledEvent => {
    const lifeEvent: LifeEvent = {
        id: family === 'LUXE'
            ? `luxe_contract_${index}`
            : family === 'FUNDING_BREACH'
                ? `funding_breach_contract_${index}`
                : family === 'GOVERNMENT_AUDIT'
                    ? `audit_contract_${index}`
                    : `life_contract_${family.toLowerCase()}_${index}`,
        type: 'LIFE',
        title: `${family} contract`,
        description: `Serializable contract for ${family}`,
        options: [{
            id: `${family}_CHOICE`,
            label: 'Apply family result',
            impact: player => ({
                updatedPlayer: { ...player, money: player.money + index + 1 },
                log: `${family} resolved`,
            }),
        }],
    };
    return {
        id: `event_contract_${family.toLowerCase()}_${index}`,
        week: source.currentWeek,
        type: 'LIFE_EVENT',
        title: lifeEvent.title,
        data: { ...data, lifeEvent },
    };
};

const familyEvents = familyDescriptors.map(([family, data], index) => createFamilyEvent(family, data, index));
source.pendingEvents = familyEvents.slice(0, 5);
source.scheduledEvents = familyEvents.slice(5);

const strictMaterialized = materializePlayerLifeEventImpacts(source, { strict: true });
assert.deepEqual(getLifeEventResolutionContractViolations(strictMaterialized), []);
const prepared = prepareVerifiedPlayerForPersistence(source, 'PROCESS_WEEK');
assert.deepEqual(
    getLifeEventResolutionContractViolations(prepared.persistedPlayer),
    [],
    'Every callback-based event family must cross persistence with a registered resolver contract.',
);

const malformed = structuredClone(prepared.persistedPlayer) as Player;
const malformedOption = malformed.pendingEvents![0].data.lifeEvent.options[0];
delete malformedOption.impactId;
delete malformedOption.impactPayload;
assert.equal(getLifeEventResolutionContractViolations(malformed).length, 1);

malformedOption.noEffect = true;
assert.deepEqual(
    getLifeEventResolutionContractViolations(malformed),
    [],
    'An explicitly declared no-effect option is a valid contract.',
);

console.log('Life-event family contract audit passed.');
