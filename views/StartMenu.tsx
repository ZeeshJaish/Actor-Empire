
import React, { useEffect, useMemo, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Player } from '../types';
import { APP_DISPLAY_VERSION } from '../services/appVersion';
import IntroFlow from '../components/IntroFlow';
import type { NewCareerData, SlotEntry } from '../components/types';
import {
  enableManualPushNotifications,
  getFirebasePushStatus,
  onFirebasePushStatusChanged,
  trackGameEvent,
  type FirebasePushStatus,
} from '../services/firebaseService';

interface StartMenuProps {
  saveSlots: Record<number, Player | null>;
  onSelectSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
  onCreateCareerFromIntro: (data: NewCareerData, slot: number) => void;
  skipIntro?: boolean;
}

const PUSH_START_PROMPT_KEY = 'actorEmpire.pushStartPrompt.v1';
const PUSH_START_PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

const readPushPromptDismissedAt = () => {
  try {
    const raw = localStorage.getItem(PUSH_START_PROMPT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { dismissedAt?: number };
    return typeof parsed.dismissedAt === 'number' ? parsed.dismissedAt : 0;
  } catch {
    return 0;
  }
};

const writePushPromptDismissedAt = () => {
  try {
    localStorage.setItem(PUSH_START_PROMPT_KEY, JSON.stringify({ dismissedAt: Date.now() }));
  } catch {
    // Local preference only; permission flow can still continue without it.
  }
};

const shouldShowPushPrompt = (status: FirebasePushStatus, showMenu: boolean) => {
  if (!showMenu) return false;
  if (!status.isNative) return false;
  if (status.state === 'ready' || status.state === 'denied' || status.state === 'web_skipped' || status.state === 'prompting' || status.state === 'checking') {
    return false;
  }
  if (status.state !== 'not_requested' || (status.receive !== 'prompt' && status.receive !== 'prompt-with-rationale')) {
    return false;
  }
  const dismissedAt = readPushPromptDismissedAt();
  return !dismissedAt || Date.now() - dismissedAt > PUSH_START_PROMPT_COOLDOWN_MS;
};

const toIntroSlots = (saveSlots: Record<number, Player | null>): SlotEntry[] => (
  [1, 2, 3].map((slot) => {
    const save = saveSlots[slot];
    return save ? { name: save.name, age: save.age, fame: save.stats.fame } : null;
  })
);

export const StartMenu: React.FC<StartMenuProps> = ({ saveSlots, onSelectSlot, onDeleteSlot, onCreateCareerFromIntro, skipIntro = false }) => {
  const [pushStatus, setPushStatus] = useState(getFirebasePushStatus);
  const [isPushPromptDismissed, setIsPushPromptDismissed] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const introSlots = useMemo(() => toIntroSlots(saveSlots), [saveSlots]);

  useEffect(() => {
    return onFirebasePushStatusChanged(setPushStatus);
  }, []);

  const showPushPrompt = shouldShowPushPrompt(pushStatus, true) && !isPushPromptDismissed;

  const dismissPushPrompt = (action: 'not_now' | 'enabled' | 'blocked' | 'checking' | 'failed') => {
    writePushPromptDismissedAt();
    setIsPushPromptDismissed(true);
    trackGameEvent('push_start_prompt_dismissed', { action });
  };

  const handleStartMenuPushAllow = async () => {
    if (isEnablingPush) return;
    setIsEnablingPush(true);
    trackGameEvent('push_start_prompt_allow_tapped', {});
    const status = await enableManualPushNotifications('start_menu_soft_prompt');
    setIsEnablingPush(false);

    if (status.state === 'ready') {
      dismissPushPrompt('enabled');
    } else if (status.state === 'denied') {
      dismissPushPrompt('blocked');
    } else if (status.state === 'checking') {
      dismissPushPrompt('checking');
    } else if (status.state === 'failed') {
      dismissPushPrompt('failed');
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#040404] font-sans text-white">
        <IntroFlow
            slots={introSlots}
            version={`Version ${APP_DISPLAY_VERSION}`}
            skipIntro={skipIntro}
            onPlaySlot={(slotIndex) => onSelectSlot(slotIndex + 1)}
            onDeleteSlot={(slotIndex) => onDeleteSlot(slotIndex + 1)}
            onBeginCareer={(data, slotIndex) => onCreateCareerFromIntro(data, slotIndex + 1)}
        />

        {showPushPrompt && (
            <div className="absolute inset-x-4 bottom-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-[2rem] border border-emerald-300/25 bg-zinc-950/90 p-4 shadow-[0_24px_80px_rgba(16,185,129,0.2)] backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-black shadow-[0_0_24px_rgba(52,211,153,0.35)]">
                            <Bell size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">Optional Alerts</div>
                                    <h2 className="mt-1 text-xl font-black leading-tight text-white">Stay in the loop</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => dismissPushPrompt('not_now')}
                                    className="rounded-full bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                                    aria-label="Dismiss notification prompt"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-400">
                                Get casting invites, project results, offers, and major world events. You can turn this off in system settings.
                            </p>
                            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                                <button
                                    type="button"
                                    onClick={handleStartMenuPushAllow}
                                    disabled={isEnablingPush}
                                    className="rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition-all hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-60"
                                >
                                    {isEnablingPush ? 'Opening' : 'Allow Updates'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => dismissPushPrompt('not_now')}
                                    className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/10"
                                >
                                    Not Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
