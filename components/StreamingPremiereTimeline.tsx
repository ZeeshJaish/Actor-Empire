/*
 * #242: where a title stands with the platform that holds it: Delivered → the platform picks a week → Premiere. On the wizard's date step,
 * on the project's page.
 */
import React from 'react';
import css from './StreamingPremiereTimeline.module.css';
import type { StreamingPremiereStatus } from '../services/streamingPremiereStatus';

export const StreamingPremiereTimeline: React.FC<{ status: StreamingPremiereStatus }> = ({ status }) => {
  const stage = status.stage === 'DATE_NOT_SET' ? 1 : status.stage === 'DATED' ? 2 : 3;
  const steps = ['Delivered', `${status.platformName} picks a week`, 'Premiere'];
  return (
    <section className={css.box} aria-label={status.label}>
      <header className={css.head}>
        <b>{status.label}</b>
        {status.stage === 'DATED' && status.weeksLeft !== null && <span className={css.chip}>{status.weeksLeft}w</span>}
      </header>
      <ol className={css.steps}>
        {steps.map((step, index) => (
          <li key={step} className={index < stage ? css.done : index === stage ? css.now : ''}>
            <i aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className={css.line}>{status.line}</p>
    </section>
  );
};

/** the wizard's date step, for a title a platform has bought: the platform decides, so there is no calendar to pick from */
export const StreamingPlatformDecidesStep: React.FC<{ status: StreamingPremiereStatus | null; platformName: string; onContinue: () => void; onBack: () => void }> = ({ status, platformName, onContinue, onBack }) => (
  <div className={css.step}>
    <span className={css.eyebrow}>THE DATE</span>
    <h2 className={css.title}>{platformName} decides</h2>
    <p className={css.lead}>A platform that buys a title sets its date from its own calendar. It tells you 4 weeks ahead, and the contract holds it to the date below.</p>
    {status && <StreamingPremiereTimeline status={status} />}
    <div className={css.actions}>
      <button type="button" className={css.back} onClick={onBack}>Back</button>
      <button type="button" className={css.go} onClick={onContinue}>Continue</button>
    </div>
  </div>
);
