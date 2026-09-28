import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { INITIAL_PLAYER } from '../types';
import { SettingsPage } from '../views/SettingsPage';
import '../index.css';

// This isolated fixture exposes the Android-only entry, without a native plugin or real saves.
Capacitor.getPlatform = () => 'android';
const fail = () => { throw new Error('Save transfer callbacks must not run in layout QA'); };

createRoot(document.getElementById('root')!).render(
  <div className="h-dvh overflow-y-auto bg-zinc-950 p-4 text-white">
    <SettingsPage
      player={INITIAL_PLAYER}
      onUpdatePlayer={fail}
      onExportData={fail}
      onImportData={fail}
      onBack={() => {}}
      onMainMenu={() => {}}
    />
  </div>,
);
