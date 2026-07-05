import React from 'react';
import { Player } from '../types';
import { APP_DISPLAY_VERSION } from '../services/appVersion';

export const ACTOR_EMPIRE_INTRO_LOGO = '/assets/actor-empire-intro.png';

export const ActorEmpireIntroStyle: React.FC = () => (
  <style>{`
    @font-face {
      font-family: 'Anton';
      src: url('/assets/fonts/actor-empire-anton-400.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Archivo';
      src: url('/assets/fonts/actor-empire-archivo-500.woff2') format('woff2');
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Archivo';
      src: url('/assets/fonts/actor-empire-archivo-600.woff2') format('woff2');
      font-weight: 600;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Archivo';
      src: url('/assets/fonts/actor-empire-archivo-700.woff2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Archivo';
      src: url('/assets/fonts/actor-empire-archivo-800.woff2') format('woff2');
      font-weight: 800;
      font-style: normal;
      font-display: swap;
    }
    @keyframes aeIntroGrainShift {
      0% { transform: translate(0,0); }
      25% { transform: translate(-2%,1.5%); }
      50% { transform: translate(1.5%,-2%); }
      75% { transform: translate(-1%,-1%); }
      100% { transform: translate(0,0); }
    }
    @keyframes aeIntroHalo {
      0%, 100% { opacity: .55; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.12); }
    }
    @keyframes aeIntroMarkIn {
      0% { opacity: 0; transform: scale(.6); }
      60% { opacity: 1; }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes aeIntroLetterIn {
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    @keyframes aeIntroRiseIn {
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes aeIntroSweep {
      to { background-position: -60% 0; }
    }
    @keyframes aeIntroBarShine {
      0% { background-position: -60px 0; }
      100% { background-position: calc(100% + 60px) 0; }
    }
    @keyframes aeIntroSpotFind {
      0% { transform: translate(-50%,-50%) scale(0); opacity: 0; }
      28% { transform: translate(-50%,-50%) scale(.22); opacity: 1; }
      55% { transform: translate(-50%,-50%) scale(.26); }
      100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
    }
    @keyframes aeIntroBeamIn {
      0% { opacity: 0; }
      22% { opacity: 1; }
      70% { opacity: .5; }
      100% { opacity: 0; }
    }
    @keyframes aeIntroTitleLit {
      0% { filter: brightness(.28) drop-shadow(0 22px 40px rgba(0,0,0,.75)); transform: scale(.965); }
      45% { filter: brightness(1.25) drop-shadow(0 22px 40px rgba(0,0,0,.75)) drop-shadow(0 0 50px rgba(255,226,160,.35)); transform: scale(1.01); }
      100% { filter: brightness(1) drop-shadow(0 22px 40px rgba(0,0,0,.75)); transform: scale(1); }
    }
    @keyframes aeIntroStarPop {
      to { opacity: 1; transform: scale(1) rotate(0deg); }
    }
    @keyframes aeIntroCtaIn {
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes aeIntroCtaPulse {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.14); }
    }
    @keyframes aeIntroDrift {
      0% { transform: translateY(12vh) translateX(0); opacity: 0; }
      12% { opacity: var(--o); }
      88% { opacity: var(--o); }
      100% { transform: translateY(-14vh) translateX(var(--dx)); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ae-intro-motion, .ae-intro-motion::before, .ae-intro-motion::after {
        animation-duration: .01s !important;
        transition-duration: .01s !important;
      }
    }
  `}</style>
);

const GrainAndVignette: React.FC = () => (
  <>
    <div
      className="ae-intro-motion pointer-events-none absolute inset-[-50%] z-[60] opacity-[0.05]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        animation: 'aeIntroGrainShift .9s steps(4) infinite',
      }}
    />
    <div className="pointer-events-none absolute inset-0 z-[55] bg-[radial-gradient(120%_90%_at_50%_42%,transparent_55%,rgba(0,0,0,0.72)_100%)]" />
  </>
);

const StudioLetters: React.FC = () => {
  const letters = 'EMPIRE STUDIOZ'.split('');
  return (
    <div className="mt-11 flex gap-[0.38em] text-[13px] font-black uppercase text-[#e8b64c]">
      {letters.map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="ae-intro-motion inline-block opacity-0 blur-[6px]"
          style={{
            transform: 'translateY(14px)',
            animation: `aeIntroLetterIn .7s cubic-bezier(.16,1,.3,1) ${0.35 + index * 0.045}s forwards`,
          }}
        >
          {letter === ' ' ? '\u00a0' : letter}
        </span>
      ))}
    </div>
  );
};

export const EmpireStudioBumper: React.FC = () => (
  <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(90%_60%_at_50%_46%,#100d07_0%,#040404_62%)] text-white">
    <GrainAndVignette />
    <div className="relative z-10 flex flex-col items-center px-8 text-center">
      <div
        className="ae-intro-motion relative flex h-[106px] w-[106px] items-center justify-center rounded-[26px] bg-[linear-gradient(150deg,#191512,#0a0908_60%)] opacity-0 shadow-[0_0_0_1px_rgba(232,182,76,0.22),0_30px_60px_-18px_rgba(0,0,0,0.9),0_0_90px_-8px_rgba(232,182,76,0.28)] before:absolute before:inset-[-34px] before:-z-10 before:rounded-full before:bg-[radial-gradient(circle,rgba(232,182,76,0.20),transparent_66%)]"
        style={{ animation: 'aeIntroMarkIn 1.1s cubic-bezier(.16,1,.3,1) .15s forwards' }}
      >
        <div className="ae-intro-motion absolute inset-[-34px] -z-10 rounded-full bg-[radial-gradient(circle,rgba(232,182,76,0.20),transparent_66%)]" style={{ animation: 'aeIntroHalo 3.2s ease-in-out infinite' }} />
        <img src={ACTOR_EMPIRE_INTRO_LOGO} alt="Empire Studioz" className="h-full w-full rounded-[26px] object-cover" />
      </div>
      <StudioLetters />
      <div className="ae-intro-motion mt-3.5 flex translate-y-[18px] items-center gap-5 opacity-0" style={{ animation: 'aeIntroRiseIn .9s cubic-bezier(.16,1,.3,1) 1.05s forwards' }}>
        <div className="h-px w-[34px] bg-gradient-to-r from-transparent to-[#e8b64c]/75" />
        <div
          className="font-['Anton',sans-serif] text-[clamp(46px,13vw,64px)] leading-none tracking-[0.06em] text-transparent"
          style={{
            background: 'linear-gradient(110deg,#fff 30%,#fff 42%,#ffdf8e 50%,#fff 58%,#fff 70%)',
            backgroundSize: '280% 100%',
            backgroundPosition: '110% 0',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            animation: 'aeIntroSweep 1.6s ease-in-out 1.5s forwards',
          }}
        >
          PRESENTS
        </div>
        <div className="h-px w-[34px] bg-gradient-to-l from-transparent to-[#e8b64c]/75" />
      </div>
    </div>
  </div>
);

type ActorEmpireLoadingScreenProps = {
  progress: number;
  status: string;
};

export const ActorEmpireLoadingScreen: React.FC<ActorEmpireLoadingScreenProps> = ({ progress, status }) => {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="relative flex h-full w-full items-start justify-center overflow-hidden bg-[radial-gradient(100%_66%_at_50%_38%,#0e0c08_0%,#040404_64%)] px-[30px] text-white">
      <GrainAndVignette />
      <div className="relative z-10 mt-[22dvh] flex w-full max-w-[420px] flex-col items-center">
        <div
          className="ae-intro-motion relative flex h-24 w-24 translate-y-4 scale-90 items-center justify-center rounded-3xl bg-[linear-gradient(155deg,#221c12,#0b0a07_65%)] opacity-0 shadow-[0_0_0_1px_rgba(232,182,76,0.30),inset_0_1px_0_rgba(255,223,142,0.18),0_24px_50px_-16px_rgba(0,0,0,0.95),0_0_70px_-6px_rgba(232,182,76,0.30)]"
          style={{ animation: 'aeIntroRiseIn .8s cubic-bezier(.16,1,.3,1) .1s forwards' }}
        >
          <img src={ACTOR_EMPIRE_INTRO_LOGO} alt="Actor Empire" className="h-full w-full rounded-3xl object-cover" />
        </div>
        <h1
          className="ae-intro-motion mt-[30px] translate-y-4 text-center font-['Anton',sans-serif] text-[clamp(58px,17vw,84px)] leading-[0.92] tracking-[0.02em] opacity-0"
          style={{
            background: 'linear-gradient(180deg,#ffffff 18%,#e8eaee 44%,#83878e 96%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 18px 32px rgba(0,0,0,.7))',
            animation: 'aeIntroRiseIn .8s cubic-bezier(.16,1,.3,1) .22s forwards',
          }}
        >
          <span className="block">ACTOR</span>
          <span className="block">EMPIRE</span>
        </h1>
        <div className="ae-intro-motion mt-[9dvh] w-full translate-y-4 opacity-0" style={{ animation: 'aeIntroRiseIn .8s cubic-bezier(.16,1,.3,1) .38s forwards' }}>
          <div className="mb-3.5 flex items-baseline justify-between">
            <div className="text-[12px] font-black uppercase tracking-[0.42em] text-[#8b8e94]">Loading</div>
            <div className="font-['Anton',sans-serif] text-[22px] tracking-[0.06em] text-[#e8b64c] drop-shadow-[0_0_24px_rgba(232,182,76,0.5)]">{safeProgress}%</div>
          </div>
          <div className="relative h-[7px] rounded-full bg-[#17171a] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.05)]">
            <div
              className="relative h-full rounded-full bg-[linear-gradient(90deg,#8a6420,#e8b64c_45%,#ffdf8e_85%,#fff)] shadow-[0_0_18px_rgba(232,182,76,0.55),0_0_46px_rgba(232,182,76,0.22)] after:absolute after:inset-0 after:rounded-full after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] after:bg-[length:60px_100%] after:bg-no-repeat"
              style={{ width: `${safeProgress}%` }}
            >
              <div className="ae-intro-motion absolute inset-0 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] bg-[length:60px_100%] bg-no-repeat" style={{ animation: 'aeIntroBarShine 1.4s linear infinite' }} />
            </div>
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fff_0%,#ffdf8e_35%,transparent_70%)] blur-[0.5px]"
              style={{ left: `${safeProgress}%`, opacity: safeProgress > 1 ? 1 : 0 }}
            />
          </div>
          <div className="ae-intro-motion mt-[22px] min-h-4 text-center text-[11.5px] font-black uppercase tracking-[0.32em] text-[#a8aab0]" style={{ animation: 'aeIntroRiseIn .8s cubic-bezier(.16,1,.3,1) .5s forwards' }}>
            {status}
          </div>
        </div>
      </div>
    </div>
  );
};

type ActorEmpireTitleScreenProps = {
  onStart?: () => void;
  showButton?: boolean;
  compact?: boolean;
};

export const ActorEmpireTitleScreen: React.FC<ActorEmpireTitleScreenProps> = ({ onStart, showButton = true, compact = false }) => (
  <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#040404] text-white">
    <GrainAndVignette />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_50%_36%,rgba(214,170,80,0.10)_0%,transparent_60%)]" />
    <div className="ae-intro-motion absolute left-1/2 top-[38%] h-[1200px] w-[1200px] rounded-full bg-[radial-gradient(circle,rgba(255,241,205,0.16)_0%,rgba(232,182,76,0.10)_26%,rgba(232,182,76,0.04)_45%,transparent_66%)]" style={{ animation: 'aeIntroSpotFind 2.1s cubic-bezier(.16,1,.3,1) .2s forwards', transform: 'translate(-50%,-50%) scale(0)' }} />
    <div className="ae-intro-motion absolute left-1/2 top-[-6%] h-[56%] w-[min(88vw,420px)] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,236,190,0.14),rgba(255,236,190,0.03)_70%,transparent)] blur-[2px] [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" style={{ animation: 'aeIntroBeamIn 2.4s ease .2s forwards' }} />
    <div className={`relative z-10 text-center ${compact ? '-mt-28' : '-mt-10'}`}>
      <div
        className="ae-intro-motion relative inline-block font-['Anton',sans-serif] text-[clamp(64px,19vw,96px)] leading-[0.9] tracking-[0.015em]"
        style={{
          background: 'linear-gradient(180deg,#ffffff 16%,#eceef1 45%,#7c8087 98%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'brightness(.28) drop-shadow(0 22px 40px rgba(0,0,0,.75))',
          transform: 'scale(.965)',
          animation: 'aeIntroTitleLit 2s cubic-bezier(.16,1,.3,1) .55s forwards',
        }}
      >
        ACTOR<br />EMPIRE
        <span className="ae-intro-motion absolute -right-7 -top-4 text-[46px] text-[#e8b64c] opacity-0" style={{ transform: 'scale(0) rotate(-40deg)', animation: 'aeIntroStarPop .7s cubic-bezier(.34,1.56,.64,1) 1.5s forwards' }}>★</span>
      </div>
      <div className="mt-6 flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] text-[#87898f] before:h-px before:w-[30px] before:bg-[#2c2d31] after:h-px after:w-[30px] after:bg-[#2c2d31]">
        Version {APP_DISPLAY_VERSION}
      </div>
    </div>
    {showButton && (
      <div className="absolute bottom-[calc(34px+env(safe-area-inset-bottom))] left-6 right-6 z-20 flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={onStart}
          className="ae-intro-motion relative flex w-full max-w-[400px] translate-y-[34px] items-center justify-center gap-3 rounded-full border-0 bg-[linear-gradient(180deg,#ffffff,#e9e9ec)] px-8 py-[22px] font-['Anton',sans-serif] text-2xl uppercase tracking-[0.09em] text-[#101010] opacity-0 shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_22px_44px_-14px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08),0_0_60px_-10px_rgba(255,241,205,0.25)] transition-transform active:scale-[0.965]"
          style={{ animation: 'aeIntroCtaIn .9s cubic-bezier(.34,1.56,.64,1) .45s forwards' }}
        >
          <span className="h-0 w-0 border-y-[9px] border-l-[15px] border-y-transparent border-l-[#101010]" />
          Start Career
          <span className="ae-intro-motion pointer-events-none absolute -bottom-2 left-1/2 -z-10 h-20 w-[78%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(255,236,190,0.16),transparent_70%)]" style={{ animation: 'aeIntroCtaPulse 2.6s ease-in-out infinite' }} />
        </button>
        <div className="text-[10px] font-black uppercase tracking-[0.36em] text-[#46474b]">Designed &amp; built by Zeesh</div>
      </div>
    )}
  </div>
);

type ActorEmpireSaveSlotsScreenProps = {
  saveSlots: Record<number, Player | null>;
  confirmDelete: number | null;
  onBack: () => void;
  onSelectSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
  onConfirmDeleteChange: (slot: number | null) => void;
};

export const ActorEmpireSaveSlotsScreen: React.FC<ActorEmpireSaveSlotsScreenProps> = ({
  saveSlots,
  confirmDelete,
  onBack,
  onSelectSlot,
  onDeleteSlot,
  onConfirmDeleteChange,
}) => {
  const renderSlot = (slot: number) => {
    const save = saveSlots[slot];
    const isDeleting = confirmDelete === slot;
    return (
      <div
        key={slot}
        className={`group relative overflow-hidden rounded-[28px] border ${
          save
            ? 'border-[#e8b64c]/24 bg-[linear-gradient(135deg,rgba(232,182,76,0.16),rgba(21,20,18,0.86)_42%,rgba(6,6,6,0.94))] shadow-[0_22px_70px_-42px_rgba(232,182,76,0.75)]'
            : 'border-[#e8b64c]/25 border-dashed bg-white/[0.025]'
        }`}
      >
        <button
          type="button"
          onClick={() => !isDeleting && onSelectSlot(slot)}
          className="relative flex w-full items-center gap-4 px-5 py-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.08] px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#8f9298]">
                Slot {slot}
              </span>
              {save && (
                <span className="rounded-full border border-[#e8b64c]/35 bg-[#e8b64c]/12 px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#e8b64c]">
                  Active
                </span>
              )}
            </div>
            <div className="font-['Anton',sans-serif] text-[34px] leading-[0.98] tracking-[0.01em] text-white">
              {save ? save.name : 'Empty Slot'}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[12px] font-black uppercase tracking-[0.14em] text-[#8c8f95]">
              {save ? (
                <>
                  <span>Age {save.age}</span>
                  <span className="text-[#e8b64c]">★ {save.stats.fame.toLocaleString()} Fame</span>
                </>
              ) : (
                <span>Start a new career</span>
              )}
            </div>
          </div>
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
            save ? 'bg-white text-black shadow-[0_16px_36px_-20px_rgba(255,255,255,0.9)]' : 'border border-[#e8b64c]/35 text-[#e8b64c]'
          }`}>
            <span className="font-['Anton',sans-serif] text-3xl">{save ? '▶' : '+'}</span>
          </div>
        </button>
        {save && (
          <div className="absolute right-3 top-3 z-20">
            {isDeleting ? (
              <div className="flex gap-1 rounded-full bg-black/70 p-1 backdrop-blur">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteSlot(slot);
                    onConfirmDeleteChange(null);
                  }}
                  className="rounded-full bg-rose-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onConfirmDeleteChange(null);
                  }}
                  className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white"
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onConfirmDeleteChange(slot);
                }}
                className="rounded-full bg-black/55 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 opacity-70 transition hover:text-rose-300"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(90%_62%_at_50%_8%,rgba(232,182,76,0.10),transparent_48%),#040404] font-['Archivo',sans-serif] text-white">
      <GrainAndVignette />
      <div className="relative z-10 px-7 pb-4 pt-[calc(36px+env(safe-area-inset-top))]">
        <div className="mb-12 flex items-center gap-4">
          <img src={ACTOR_EMPIRE_INTRO_LOGO} alt="Actor Empire" className="h-14 w-14 rounded-2xl object-cover shadow-[0_0_34px_rgba(232,182,76,0.18)]" />
          <div>
            <div className="font-['Anton',sans-serif] text-[24px] uppercase tracking-[0.04em]">Actor Empire</div>
            <div className="text-[10px] font-black uppercase tracking-[0.34em] text-[#8e9096]">Version {APP_DISPLAY_VERSION}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.42em] text-[#e8b64c]">Select Save Slot</div>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-[10px] font-black uppercase tracking-[0.34em] text-[#9a9da3]"
          >
            ← Back
          </button>
        </div>
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto px-7 pb-[calc(34px+env(safe-area-inset-bottom))]">
        <div className="space-y-4">
          {[1, 2, 3].map(renderSlot)}
        </div>
      </div>
      <div className="relative z-10 pb-[calc(28px+env(safe-area-inset-bottom))] text-center text-[10px] font-black uppercase tracking-[0.38em] text-[#45464a]">
        Designed &amp; built by Zeesh
      </div>
    </div>
  );
};

type StreamingPlatformComingSoonProps = {
  onBack: () => void;
};

const STREAMING_POSTERS = ['Originals', 'Awards', 'Studio', 'Series', 'Premiere', 'Global'];

export const StreamingPlatformComingSoon: React.FC<StreamingPlatformComingSoonProps> = ({ onBack }) => (
  <div className="relative min-h-full overflow-hidden bg-[#040404] font-['Archivo',sans-serif] text-white">
    <ActorEmpireIntroStyle />
    <GrainAndVignette />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_55%_at_50%_18%,rgba(232,182,76,0.16),transparent_58%),radial-gradient(70%_42%_at_70%_82%,rgba(83,211,255,0.10),transparent_62%)]" />
    <div className="pointer-events-none absolute inset-x-0 top-28 grid grid-cols-3 gap-3 px-5 opacity-30 blur-[0.2px]">
      {STREAMING_POSTERS.map((poster, index) => (
        <div
          key={poster}
          className="h-36 rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02)),radial-gradient(circle_at_35%_18%,rgba(232,182,76,0.35),transparent_34%)]"
          style={{ transform: `translateY(${index % 2 ? 40 : 0}px)` }}
        >
          <div className="p-4 font-['Anton',sans-serif] text-xl uppercase leading-none tracking-[0.04em] text-white/65">{poster}</div>
        </div>
      ))}
    </div>
    <div className="relative z-10 flex min-h-screen flex-col px-7 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[calc(34px+env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onBack}
        className="mb-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-3xl text-white backdrop-blur-xl"
        aria-label="Back"
      >
        ←
      </button>
      <div className="mt-auto">
        <div className="mb-5 inline-flex rounded-full border border-[#e8b64c]/30 bg-black/45 px-4 py-2 text-[11px] font-black uppercase tracking-[0.34em] text-[#e8b64c] backdrop-blur-xl">
          Future Update
        </div>
        <div className="font-['Anton',sans-serif] text-[clamp(64px,19vw,96px)] uppercase leading-[0.88] tracking-[0.02em]">
          EMPIRE<span className="text-[#e8b64c]">+</span>
        </div>
        <div className="mt-5 max-w-[420px] text-2xl font-black leading-tight text-white">
          Build your own streaming house, release originals, and fight for subscribers.
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          {[
            ['Originals', 'Fund series and films'],
            ['Subscribers', 'Grow weekly demand'],
            ['Awards', 'Prestige platform plays'],
            ['Global', 'Worldwide launches'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-[24px] border border-white/10 bg-black/48 p-4 backdrop-blur-xl">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8f9298]">{title}</div>
              <div className="mt-2 text-sm font-bold leading-snug text-zinc-300">{desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-7 rounded-[28px] border border-[#e8b64c]/25 bg-[linear-gradient(135deg,rgba(232,182,76,0.16),rgba(255,255,255,0.04))] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.34em] text-[#e8b64c]">Locked for now</div>
          <div className="mt-2 text-lg font-black leading-snug text-white">This platform opens when the full streaming system is ready.</div>
        </div>
      </div>
    </div>
  </div>
);
