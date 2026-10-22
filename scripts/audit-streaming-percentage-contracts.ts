import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDiscoveryPercentageTotal, assertPercentageTotal } from './helpers/streamingPercentageAssertions';

test('canonical decimal shares cover 100% despite floating-point addition', () => {
    const shares = [44, 2.8, 9.1, 12.2, 16.8, 15.1];
    assert.notEqual(shares.reduce((sum, value) => sum + value, 0), 100);
    assertPercentageTotal(shares, 'Persona total');
});

test('actual gaps, double counting and empty populations still fail', () => {
    for (const values of [[49, 50], [51, 50], [50, 49.999], []]) {
        assert.throws(() => assertPercentageTotal(values, 'Invalid total'));
    }
});

test('non-finite, negative, missing and out-of-range values cannot be hidden', () => {
    for (const value of [NaN, Infinity, -Infinity, -1, 101, undefined, null, '50']) {
        assert.throws(() => assertPercentageTotal([50, value as number], 'Invalid value'));
    }
});

const legacy = { homepagePercent: 38, recommendationsPercent: 30, searchPercent: 16, directPercent: 16 };
test('four-channel legacy discovery supports absent or undefined optional fields', () => {
    assertDiscoveryPercentageTotal(legacy, 'Legacy mix');
    assertDiscoveryPercentageTotal({ ...legacy, marketingPercent: undefined, externalBuzzPercent: undefined }, 'Normalized legacy mix');
});

test('all six recorded channels must reconcile together', () => {
    assertDiscoveryPercentageTotal({ homepagePercent: 30, recommendationsPercent: 25, searchPercent: 15, directPercent: 10, marketingPercent: 12, externalBuzzPercent: 8 }, 'Six-channel mix');
    assert.throws(() => assertDiscoveryPercentageTotal({ ...legacy, marketingPercent: 1 }, 'Double counted campaign'));
});

test('missing required channels and invalid optional values still fail', () => {
    assert.throws(() => assertDiscoveryPercentageTotal({ ...legacy, homepagePercent: undefined as unknown as number }, 'Missing homepage'));
    for (const value of [NaN, Infinity, -1, null]) {
        assert.throws(() => assertDiscoveryPercentageTotal({ ...legacy, marketingPercent: value as number }, 'Invalid marketing'));
    }
});
