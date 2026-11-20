import React, { useEffect, useRef, useState } from 'react';
import { CareerOpeningScreen } from './ActorEmpireIntro';

/* 20 Nov 2026: the bar for opening a saved career (CareerOpeningScreen). Like the start-up bar it keeps its own clock
   (App never re-renders for it) and never moves back, but it may pass each mark only once the real step behind it is
   done: the save is read (step 0 → 1), checked (1 → 2), and the world prepared (2). The career is on screen when the
   open ends, so the last stretch to 100 is never waited for. */

const CAPS = [38, 72, 94];
const EXPECTED_MS = 4500;

interface CareerOpeningBarProps {
  step: 0 | 1 | 2;
  name: string;
  age: number;
  week: number;
  translate: (key: string, vars?: Record<string, string | number>) => string;
}

export const CareerOpeningBar: React.FC<CareerOpeningBarProps> = ({ step, name, age, week, translate }) => {
  const [progress, setProgress] = useState(0);
  const capRef = useRef(CAPS[0]);
  capRef.current = CAPS[step];

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    let shown = 0;
    const tick = (now: number) => {
      const ratio = Math.min(0.985, (now - startedAt) / EXPECTED_MS);
      const eased = 1 - Math.pow(1 - ratio, 1.6);
      const next = Math.max(shown, Math.min(capRef.current, Math.round(eased * 100)));
      if (next !== shown) {
        shown = next;
        setProgress(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const status = translate(step === 0 ? 'careerOpen.reading' : step === 1 ? 'careerOpen.checking' : 'careerOpen.preparing');
  return (
    <CareerOpeningScreen
      progress={progress}
      label={translate('careerOpen.label')}
      name={name}
      detail={translate('careerOpen.ageWeek', { age, week })}
      status={status}
    />
  );
};
