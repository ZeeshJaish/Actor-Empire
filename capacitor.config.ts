import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeeshapps.actorempire',
  appName: 'Actor Empire',
  webDir: 'dist',
  /* Crash fix (19 Nov 2026), qa/2026-11-19-crash-scene/FIX-PLAN.md item 2.3: the web view is the game's own black
     before its first frame, instead of white (Android, and iPhones in light mode), on every launch and reload.
     npx cap sync writes it into both native configs. */
  backgroundColor: '#050505',
};

export default config;
