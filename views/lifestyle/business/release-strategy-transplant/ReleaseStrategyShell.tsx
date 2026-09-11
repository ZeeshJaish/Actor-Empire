import React from 'react';
import type { ReleaseFilmArt, ReleaseStepMeta, ReleaseWizardPhase, ReleaseWizardRoute } from './model';
import css from './ReleaseStrategy.module.css';

const PHASE_COPY: Record<ReleaseWizardPhase, { title: string; subtitle: string }> = {
  DISTRIBUTION: { title: 'Distribution', subtitle: 'Choose the life this picture will have.' },
  DESK: { title: 'Theatrical Desk', subtitle: 'Build the footprint. Own the risk.' },
  WAR: { title: 'The War Room', subtitle: 'Buyers are live. Terms move fast.' },
  CAMPAIGN: { title: 'Campaign', subtitle: 'Decide what the audience should feel.' },
  FESTIVALS: { title: 'Festivals', subtitle: 'Choose the rooms that can change the story.' },
  CALENDAR: { title: 'Calendar', subtitle: 'Find the week the market belongs to you.' },
  FINALIZE: { title: 'Finalize', subtitle: 'Read the complete release before you lock it.' },
};

export const ReleaseStrategyShell: React.FC<{
  film: ReleaseFilmArt;
  phase: ReleaseWizardPhase;
  progress: ReleaseStepMeta[];
  route: ReleaseWizardRoute | null;
  hue?: number;
  onBack: () => void;
  children: React.ReactNode;
}> = ({ film, phase, progress, route, hue, onBack, children }) => {
  const copy = PHASE_COPY[phase];
  const shellClassName = `${css.rs} ${route ? css[`r-${route.toLowerCase()}`] : ''}`;
  const shellStyle = { '--h': String(hue ?? (route === 'STREAMING' ? 210 : 26)) } as React.CSSProperties;

  if (phase === 'WAR') {
    return (
      <section className={shellClassName} style={shellStyle} data-ui="release-strategy-transplant">
        <div className={css.wash} aria-hidden="true" />
        <main key={phase} className={css.warTakeover}>{children}</main>
      </section>
    );
  }

  return (
    <section
      className={shellClassName}
      style={shellStyle}
      data-ui="release-strategy-transplant"
    >
      <div className={css.wash} aria-hidden="true" />
      <header className={css.top}>
        <button type="button" className={css.back} onClick={onBack} aria-label="Go back">←</button>
        <div className={css.mast}>
          <b>Release Strategy</b>
          <span>{film.title.toUpperCase()} ({film.tagline})</span>
        </div>
      </header>
      <div className={css.steps} aria-label="Release strategy progress">
        {progress.map(item => (
          <i key={item.id} title={item.label} className={item.state === 'complete' ? css.did : item.state === 'current' ? css.now : ''} />
        ))}
      </div>
      <main key={phase} className={css.body}>
        <div className={css.head}>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        {children}
      </main>
    </section>
  );
};
