import { createC6QaCareer } from './c6QaCareer';
import { getStreamingLaunchReadiness } from '../services/streamingLaunch';
import { getStreamingBuildMarketAccess } from '../services/streamingBuildMarketAccess';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { listGameDataKeys, saveVerifiedGameData, writeGameSaveSummary } from '../services/storage';

const button = document.querySelector<HTMLButtonElement>('#seed')!;
const result = document.querySelector<HTMLElement>('#result')!;
const requestedStage = new URLSearchParams(location.search).get('stage');
const stage = requestedStage === 'pricing' ? 'PRICING' : requestedStage === 'build' ? 'BUILD' : 'OPENING_NIGHT';
if (stage === 'BUILD') button.textContent = 'Create disposable career before Build';
if (stage === 'PRICING') button.textContent = 'Create disposable career before Pricing';
const allowed = import.meta.env.DEV && ['127.0.0.1', 'localhost'].includes(location.hostname);
if (!allowed) {
    button.disabled = true;
    result.textContent = 'This QA fixture is available only on a local development server.';
}

button.addEventListener('click', async () => {
    if (!allowed) return;
    button.disabled = true;
    try {
        const keys = await listGameDataKeys();
        if (keys.some(key => /^actorEmpireSave(?:_|$)/.test(key))) {
            result.textContent = 'Existing saves found on this origin. No save was changed; use a fresh local port.';
            return;
        }
        const career = createC6QaCareer(stage);
        const readiness = getStreamingLaunchReadiness(career);
        if (stage === 'OPENING_NIGHT' && !readiness.canLaunch) throw new Error('Fixture is not launch-ready.');
        if ((stage === 'BUILD' || stage === 'PRICING') && (!getStreamingBuildMarketAccess(career).editable || readiness.canLaunch)) {
            throw new Error('Fixture does not start before an editable Build and launch.');
        }
        const prepared = prepareVerifiedPlayerForPersistence(career, 'MANUAL');
        const key = 'actorEmpireSave_1';
        await saveVerifiedGameData(key, prepared.player, prepared.manifest, {
            retainPrevious: prepared.retainPrevious,
            needsRecoveryCheckpoint: prepared.needsRecoveryCheckpoint,
        });
        writeGameSaveSummary(key, prepared.player);
        result.innerHTML = 'Isolated signed career created in slot 1. <a href="/">Open the game</a>.';
    } catch (error) {
        result.textContent = `Fixture could not be created: ${error instanceof Error ? error.message : String(error)}`;
        button.disabled = false;
    }
});
