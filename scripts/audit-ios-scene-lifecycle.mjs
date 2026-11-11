import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => fs.readFileSync(new URL(name, `file://${root}`), 'utf8');
const plist = name => JSON.parse(execFileSync('/usr/bin/plutil', [
  '-convert', 'json', '-o', '-', `${root}${name}`,
], { encoding: 'utf8' }));

const info = plist('ios/App/App/Info.plist');
const manifest = info.UIApplicationSceneManifest;
assert.ok(manifest, 'iOS 27 requires a UIApplicationSceneManifest');
assert.equal(manifest.UIApplicationSupportsMultipleScenes, false, 'Keep one game window');
const scenes = manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication;
assert.equal(scenes.length, 1);
assert.equal(scenes[0].UISceneDelegateClassName, '$(PRODUCT_MODULE_NAME).SceneDelegate');
assert.equal(scenes[0].UISceneStoryboardFile, 'Main', 'Preserve the custom Capacitor controller');

const scene = read('ios/App/App/SceneDelegate.swift');
assert.match(scene, /class SceneDelegate: UIResponder, UIWindowSceneDelegate/);
assert.match(scene, /var window: UIWindow\?/);
assert.match(scene, /window\?\.rootViewController = ViewController\(\)/);
assert.match(scene, /SceneDelegateProxy\.shared\.scene\(scene, willConnectTo: session, options: connectionOptions\)/);
assert.match(scene, /func scene\(_ scene: UIScene, openURLContexts/);
assert.match(scene, /func scene\(_ scene: UIScene, continue userActivity/);
assert.match(scene, /SceneDelegateProxy\.shared\.scene\(scene, openURLContexts: URLContexts\)/);
assert.match(scene, /SceneDelegateProxy\.shared\.scene\(scene, continue: userActivity\)/);
assert.doesNotMatch(scene, /CAPBridgeViewController\(\)/, 'Do not bypass custom plugin registration');

const project = plist('ios/App/App.xcodeproj/project.pbxproj');
const objects = project.objects;
const file = Object.entries(objects).find(([, value]) =>
  value.isa === 'PBXFileReference' && value.path === 'SceneDelegate.swift');
assert.ok(file, 'SceneDelegate must be registered in Xcode');
const buildFile = Object.entries(objects).find(([, value]) =>
  value.isa === 'PBXBuildFile' && value.fileRef === file[0]);
assert.ok(buildFile, 'SceneDelegate must have a build entry');
assert.ok(Object.values(objects).some(value =>
  value.isa === 'PBXSourcesBuildPhase' && value.files.includes(buildFile[0])),
'SceneDelegate must compile in the app target');
assert.match(read('ios/App/App/Base.lproj/Main.storyboard'), /customClass="ViewController"/);
assert.match(read('ios/App/App/ViewController.swift'), /registerPluginType\(PurchasesPlugin\.self\)/);
assert.match(read('ios/App/App/ViewController.swift'), /registerPluginType\(TrackingPermissionPlugin\.self\)/);
assert.match(read('ios/App/App/AppDelegate.swift'), /capacitorDidRegisterForRemoteNotifications/);
assert.match(read('ios/App/App/AppDelegate.swift'), /config\.delegateClass = SceneDelegate\.self/);
assert.match(read('node_modules/@capacitor/ios/Capacitor/Capacitor/CAPSceneDelegateProxy.swift'), /class SceneDelegateProxy/);
console.log('iOS scene lifecycle configuration audit passed.');
