import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PushRegistration } from '../services/pushRegistration';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

const iosDelegate = readFileSync('ios/App/App/AppDelegate.swift', 'utf8');
assert.match(iosDelegate, /didRegisterForRemoteNotificationsWithDeviceToken/);
assert.match(iosDelegate, /NotificationCenter\.default\.post\(name: \.capacitorDidRegisterForRemoteNotifications, object: deviceToken\)/);
assert.match(iosDelegate, /didFailToRegisterForRemoteNotificationsWithError/);

let tokenRequests = 0;
let permissionRequests = 0;
const ios = new PushRegistration({
  platform: 'ios',
  isSupported: async () => true,
  checkPermissions: async () => 'prompt',
  requestPermissions: async () => { permissionRequests++; return 'granted'; },
  getToken: async () => { tokenRequests++; return 'ios-fcm-token'; },
});
await ios.bootstrap();
assert.equal(ios.getStatus().state, 'not_requested');
const [first, second] = await Promise.all([ios.enable(), ios.enable()]);
assert.equal(permissionRequests, 1, 'concurrent taps must share one permission request');
assert.equal(first.state, 'checking');
assert.equal(second.state, 'checking');
assert.equal(tokenRequests, 0, 'iOS must wait for APNs registration');
await ios.apnsTokenReceived();
assert.equal(tokenRequests, 1);
assert.equal(ios.getStatus().state, 'ready');
assert.equal(ios.getStatus().tokenTail, '-fcm-token');

const bootGranted = new PushRegistration({
  platform: 'ios',
  isSupported: async () => true,
  checkPermissions: async () => 'granted',
  requestPermissions: async () => 'granted',
  getToken: async () => 'token',
});
await bootGranted.bootstrap();
assert.equal(bootGranted.getStatus().state, 'checking', 'permission alone cannot mean ready');
await bootGranted.apnsTokenReceived();
assert.equal(bootGranted.getStatus().state, 'ready');

let androidRequests = 0;
const android = new PushRegistration({
  platform: 'android',
  isSupported: async () => true,
  checkPermissions: async () => 'granted',
  requestPermissions: async () => 'granted',
  getToken: async () => { androidRequests++; return 'android-token'; },
});
await android.bootstrap();
assert.equal(android.getStatus().state, 'ready');
assert.equal(androidRequests, 1);
await android.bootstrap();
assert.equal(androidRequests, 1, 'resume should check permission without fetching an unchanged token');

let finishInitialCheck!: (permission: 'prompt') => void;
const initialCheck = new Promise<'prompt'>(resolve => { finishInitialCheck = resolve; });
let queuedPrompts = 0;
const queuedEnable = new PushRegistration({
  platform: 'android',
  isSupported: async () => true,
  checkPermissions: (() => {
    let firstCheck = true;
    return async () => firstCheck ? (firstCheck = false, await initialCheck) : 'prompt';
  })(),
  requestPermissions: async () => { queuedPrompts++; return 'granted'; },
  getToken: async () => 'queued-token',
});
const bootWhileTapping = queuedEnable.bootstrap();
const tapWhileBooting = queuedEnable.enable();
finishInitialCheck('prompt');
await Promise.all([bootWhileTapping, tapWhileBooting]);
assert.equal(queuedPrompts, 1, 'manual tap during startup must still request permission');
assert.equal(queuedEnable.getStatus().state, 'ready');

const blocked = new PushRegistration({
  platform: 'android',
  isSupported: async () => true,
  checkPermissions: async () => 'denied',
  requestPermissions: async () => 'denied',
  getToken: async () => { throw new Error('must not fetch token'); },
});
await blocked.bootstrap();
assert.equal(blocked.getStatus().state, 'denied');
await blocked.enable();
assert.equal(blocked.getStatus().state, 'denied');
blocked.tokenReceived('stale-token');
assert.equal(blocked.getStatus().state, 'denied', 'token events cannot override denied permission');

let currentPermission: 'granted' | 'denied' = 'granted';
const resumed = new PushRegistration({
  platform: 'android',
  isSupported: async () => true,
  checkPermissions: async () => currentPermission,
  requestPermissions: async () => currentPermission,
  getToken: async () => 'device-token',
});
await resumed.bootstrap();
assert.equal(resumed.getStatus().state, 'ready');
currentPermission = 'denied';
await resumed.bootstrap();
assert.equal(resumed.getStatus().state, 'denied', 'OS permission changes must invalidate registration state');
assert.equal(resumed.getStatus().tokenTail, null);

const emptyToken = new PushRegistration({
  platform: 'android',
  isSupported: async () => true,
  checkPermissions: async () => 'granted',
  requestPermissions: async () => 'granted',
  getToken: async () => '',
});
await emptyToken.bootstrap();
assert.equal(emptyToken.getStatus().state, 'checking', 'empty FCM token cannot mean ready');
emptyToken.tokenReceived('later-valid-token');
await flush();
assert.equal(emptyToken.getStatus().state, 'ready');

console.log('Push registration audit passed');
