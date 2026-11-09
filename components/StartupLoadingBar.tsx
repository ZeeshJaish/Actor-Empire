import React, { useEffect, useRef, useState } from 'react';
import { ActorEmpireLoadingScreen } from './ActorEmpireIntro';

/* Perf plan (2026-11-08): the start-up bar keeps its own clock. Before, its progress lived in App,
   so the whole game re-rendered about 16 times a second for 7 seconds while it was also trying to
   start. The bar fills over the same time and with the same curve as before, but it can pass each
   mark only once the real step behind it is done: the saves are listed, then the last-played
   career is read and checked. It never moves back. */

const LINE_EVERY_MS = 420;
const CAP_UNTIL_SAVES_LISTED = 35;
const CAP_UNTIL_CAREER_READY = 88;
const CAP_UNTIL_SHOWN = 99;

interface StartupLoadingBarProps {
  durationMs: number;
  savesReady: boolean;
  careerReady: boolean;
  lineKeys: readonly string[];
  translate: (key: string) => string;
}

export const StartupLoadingBar: React.FC<StartupLoadingBarProps> = ({
  durationMs,
  savesReady,
  careerReady,
  lineKeys,
  translate,
}) => {
  const [progress, setProgress] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const capRef = useRef(CAP_UNTIL_SAVES_LISTED);
  capRef.current = !savesReady ? CAP_UNTIL_SAVES_LISTED : !careerReady ? CAP_UNTIL_CAREER_READY : CAP_UNTIL_SHOWN;

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    let shown = 0;
    const tick = (now: number) => {
      const ratio = Math.min(0.985, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - ratio, 1.45);
      const next = Math.max(shown, Math.min(capRef.current, Math.round(eased * 100)));
      if (next !== shown) {
        shown = next;
        setProgress(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const lines = window.setInterval(() => {
      setLineIndex(index => (index + 1) % Math.max(1, lineKeys.length));
    }, LINE_EVERY_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(lines);
    };
  }, [durationMs, lineKeys.length]);

  const lineKey = lineKeys[lineIndex % Math.max(1, lineKeys.length)] || '';
  return <ActorEmpireLoadingScreen progress={progress} status={translate(lineKey)} />;
};
