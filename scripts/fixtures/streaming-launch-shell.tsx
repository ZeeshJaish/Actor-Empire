/* Define the Launch's shell (#110) in a browser: ?s=fresh|ready&step=markets|…|blueprint */
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { LaunchStepId } from '../../components/studio-finance/finance/launch';
import { LaunchWizard } from '../../components/studio-finance/components/launch/LaunchWizard';
import { shellData, shellDraft, type ShellScenario } from './streaming-launch-shell-data';
import '../../styles/fonts.css';

const query = new URLSearchParams(window.location.search);
const scenario = (query.get('s') === 'ready' ? 'ready' : 'fresh') as ShellScenario;
const step = (query.get('step') || 'ident') as LaunchStepId;

createRoot(document.getElementById('root')!).render(
  <LaunchWizard data={shellData(scenario)} initialStep={step} initialDraft={shellDraft(scenario)} />,
);
