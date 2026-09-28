import React, { useEffect, useState } from 'react';
import { ActorEmpireIntroStyle, ActorEmpireLoadingScreen } from './ActorEmpireIntro';
import ZedburyStudiosIntro from './ZedburyStudiosIntro';

type GameApp = typeof import('../App').App;

const STUDIO_IDENT_EXIT_MS = 1_150;
const STUDIO_IDENT_END_MS = 1_470;
const GAME_CODE_DEADLINE_MS = 20_000;

export const GameStartupBootstrap: React.FC = () => {
  const [identExiting, setIdentExiting] = useState(false);
  const [identComplete, setIdentComplete] = useState(false);
  const [AppComponent, setAppComponent] = useState<GameApp | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIdentExiting(true), STUDIO_IDENT_EXIT_MS);
    const endTimer = window.setTimeout(() => setIdentComplete(true), STUDIO_IDENT_END_MS);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(endTimer);
    };
  }, []);

  useEffect(() => {
    if (!identComplete || AppComponent || loadError) return;
    const timer = window.setTimeout(() => setTakingLonger(true), 1_000);
    return () => window.clearTimeout(timer);
  }, [AppComponent, identComplete, loadError]);

  useEffect(() => {
    let active = true;
    let deadline: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      deadline = window.setTimeout(() => reject(new Error('Game screens took too long to load.')), GAME_CODE_DEADLINE_MS);
    });

    void Promise.race([import('../App'), timeout])
      .then(module => {
        if (active) setAppComponent(() => module.App);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (deadline !== undefined) window.clearTimeout(deadline);
      });

    return () => {
      active = false;
      if (deadline !== undefined) window.clearTimeout(deadline);
    };
  }, []);

  if (identComplete && AppComponent) {
    return <AppComponent startupStudioIntroHandled />;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#050505] text-white">
      <ActorEmpireIntroStyle />
      {!identComplete ? (
        <ZedburyStudiosIntro state={identExiting ? 'on exit' : 'on'} />
      ) : (
        <ActorEmpireLoadingScreen
          progress={0}
          status={loadError ? 'Game screens unavailable' : 'Loading game screens…'}
          supportingMessage={!loadError && takingLonger ? 'Taking a moment. Your careers are safe.' : undefined}
          error={loadError ? 'Actor Empire could not prepare its game screens. Your careers were not changed.' : undefined}
          primaryActionLabel="Retry"
          onPrimaryAction={loadError ? () => window.location.reload() : undefined}
        />
      )}
    </div>
  );
};
