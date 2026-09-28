import assert from 'node:assert/strict';
import { assertNativeSaveTransferShared, selectNativeSaveTransferPort } from '../services/nativeSaveTransferPort';

const android = { id: 'android-stream' };
const ios = { id: 'ios-stream' };
const ports = { android, ios };

assert.equal(selectNativeSaveTransferPort('android', true, true, ports), android);
assert.equal(selectNativeSaveTransferPort('ios', true, true, ports), ios);
assert.equal(selectNativeSaveTransferPort('ios', true, false, ports), null);
assert.equal(selectNativeSaveTransferPort('ios', false, true, ports), null);
assert.equal(selectNativeSaveTransferPort('web', false, false, ports), null);
assert.doesNotThrow(() => assertNativeSaveTransferShared({ shared: true }));
assert.throws(() => assertNativeSaveTransferShared({ shared: false }), /cancelled/i);

console.log('Native save-transfer port audit passed.');
