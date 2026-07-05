import { useEffect, useRef, useState } from 'react';
import EmpireStudiozIntro from './EmpireStudiozIntro';
import ActorEmpireLoading from './ActorEmpireLoading';
import ActorEmpireStart from './ActorEmpireStart';
import SaveSlotScreen from './SaveSlotScreen';
import CreateStarScreen from './CreateStarScreen';
import type { ActState, NewCareerData, SlotEntry } from './types';
import '../styles/intro.css';

interface Props {
  slots?: SlotEntry[];
  /** Load this save and hand off to the game */
  onPlaySlot?: (slotIndex: number) => void;
  /** Delete this save and keep the save-slot screen in place */
  onDeleteSlot?: (slotIndex: number) => void;
  /** Create the career with the chosen options */
  onBeginCareer?: (data: NewCareerData, slotIndex: number) => void;
  /** Start at the title screen when the app already showed the boot bumper */
  skipIntro?: boolean;
  version?: string;
}

const DEMO_SLOTS: SlotEntry[] = [
  { name: 'Tony Stark', age: 20, fame: 100 },
  { name: 'Tony Stark', age: 18, fame: 0 },
  null,
];

/**
 * Full intro sequence with the original phase machine and timings:
 * studio ident → loading → spotlight title → save slots → create your star.
 */
export default function IntroFlow({
  slots = DEMO_SLOTS,
  onPlaySlot,
  onDeleteSlot,
  onBeginCareer,
  skipIntro = false,
  version = 'Version 1.0.18',
}: Props) {
  const [act1, setAct1] = useState<ActState>('');
  const [act2, setAct2] = useState<ActState>('');
  const [act3, setAct3] = useState<ActState>(skipIntro ? 'on lit' : '');
  const [act4, setAct4] = useState<ActState>('');
  const [act5, setAct5] = useState<ActState>('');
  const [flashKey, setFlashKey] = useState(0);
  const [pendingCreateSlot, setPendingCreateSlot] = useState<number | null>(null);
  const startedRef = useRef(false);
  const timers = useRef<number[]>([]);
  const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  /* boot: act1 plays, auto-advances after 3450ms */
  useEffect(() => {
    if (skipIntro) return;
    requestAnimationFrame(() => setAct1('on'));
    after(3450, toLoading);
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toLoading = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setAct1('on exit');
    after(600, () => {
      setAct1('');
      setAct2('on');
    });
  };

  const toTitle = () => {
    setAct2('on exit');
    after(620, () => {
      setAct2('');
      setAct3('on'); // spotlight finds the title
      after(1750, () => setAct3('on lit')); // room floods with light
    });
  };

  const flash = () => {
    setFlashKey((k) => k + 1);
    if (navigator.vibrate) navigator.vibrate(18);
  };

  const startCareer = () => {
    flash();
    after(220, () => {
      setAct3('');
      setAct4('on');
    });
  };

  return (
    <div id="stage">
      <div className="grain" />
      <div className="vignette" />
      <div id="flash" key={flashKey} className={flashKey ? 'go' : ''} />

      <EmpireStudiozIntro state={act1} onSkip={toLoading} />
      <ActorEmpireLoading state={act2} onDone={toTitle} />
      <ActorEmpireStart state={act3} onStart={startCareer} version={version} />
      <SaveSlotScreen
        state={act4}
        slots={slots}
        version={version}
        onBack={() => {
          setAct4('');
          setAct3('on lit');
        }}
        onPlay={(i) => {
          flash();
          onPlaySlot?.(i);
        }}
        onDeleteSlot={onDeleteSlot}
        onCreateNew={(i) => {
          setPendingCreateSlot(i);
          setAct4('');
          setAct5('on');
        }}
      />
      <CreateStarScreen
        state={act5}
        onBack={() => {
          setAct5('');
          setAct4('on');
        }}
        onBegin={(data) => {
          flash();
          onBeginCareer?.(data, pendingCreateSlot ?? slots.findIndex((s) => s === null));
        }}
      />
    </div>
  );
}
