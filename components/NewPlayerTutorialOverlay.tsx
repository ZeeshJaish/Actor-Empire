import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clapperboard, FastForward, PlayCircle, X } from 'lucide-react';
import { Page, type Player } from '../types';
import {
    buildActiveNewPlayerTutorialState,
    getNewPlayerTutorialState,
    getNewPlayerTutorialStep,
    NEW_PLAYER_TUTORIAL_FIRST_STEP_ID,
    NEW_PLAYER_TUTORIAL_STEPS,
    type NewPlayerTutorialState,
    type NewPlayerTutorialStep,
} from '../services/newPlayerTutorial';

interface NewPlayerTutorialOverlayProps {
    player: Player;
    activePage: Page;
    setPage: (page: Page) => void;
    onOpenMobileAppMode?: (mode: string) => void;
    onUpdateTutorialState: (state: NewPlayerTutorialState) => void;
}

type TargetRect = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

const toneClasses: Record<NewPlayerTutorialStep['tone'], { badge: string; button: string; ring: string; glow: string }> = {
    gold: {
        badge: 'bg-amber-400 text-black',
        button: 'bg-amber-400 text-black hover:bg-amber-300',
        ring: 'border-amber-300',
        glow: 'rgba(251, 191, 36, 0.36)',
    },
    blue: {
        badge: 'bg-sky-400 text-black',
        button: 'bg-sky-400 text-black hover:bg-sky-300',
        ring: 'border-sky-300',
        glow: 'rgba(56, 189, 248, 0.34)',
    },
    emerald: {
        badge: 'bg-emerald-400 text-black',
        button: 'bg-emerald-400 text-black hover:bg-emerald-300',
        ring: 'border-emerald-300',
        glow: 'rgba(52, 211, 153, 0.34)',
    },
    rose: {
        badge: 'bg-rose-400 text-black',
        button: 'bg-rose-400 text-black hover:bg-rose-300',
        ring: 'border-rose-300',
        glow: 'rgba(251, 113, 133, 0.34)',
    },
    violet: {
        badge: 'bg-violet-400 text-black',
        button: 'bg-violet-400 text-black hover:bg-violet-300',
        ring: 'border-violet-300',
        glow: 'rgba(167, 139, 250, 0.34)',
    },
};

const makeCompletedSteps = (state: NewPlayerTutorialState, stepId: string) => (
    Array.from(new Set([...(state.completedStepIds || []), stepId]))
);

export const NewPlayerTutorialOverlay: React.FC<NewPlayerTutorialOverlayProps> = ({
    player,
    activePage,
    setPage,
    onOpenMobileAppMode,
    onUpdateTutorialState,
}) => {
    const tutorialState = getNewPlayerTutorialState(player);
    const isOffer = tutorialState?.status === 'AVAILABLE';
    const isActive = tutorialState?.status === 'ACTIVE';
    const step = useMemo(
        () => getNewPlayerTutorialStep(isActive ? tutorialState?.stepId : NEW_PLAYER_TUTORIAL_FIRST_STEP_ID),
        [isActive, tutorialState?.stepId]
    );
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

    useEffect(() => {
        if (!isOffer && !isActive) return;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyTouchAction = document.body.style.touchAction;
        const previousHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.touchAction = previousBodyTouchAction;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, [isActive, isOffer]);

    useEffect(() => {
        if (!isActive) return;
        if (activePage === step.page) return;
        if (step.completeOnPage && activePage === step.completeOnPage) return;
        setPage(step.page);
    }, [activePage, isActive, setPage, step.completeOnPage, step.page]);

    useEffect(() => {
        if (!isActive || !step.completeOnPage || activePage !== step.completeOnPage) return;
        const timer = window.setTimeout(() => advanceStep(), 180);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePage, isActive, step.completeOnPage, step.id]);

    useEffect(() => {
        if (!isActive || !step.targetId || activePage !== step.page) {
            setTargetRect(null);
            return;
        }

        let frame = 0;
        const updateTarget = () => {
            const element = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);
            if (!element) {
                setTargetRect(null);
                return;
            }
            element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
            const rect = element.getBoundingClientRect();
            setTargetRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            });
        };
        const scheduleUpdate = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updateTarget);
        };

        scheduleUpdate();
        const retryTimer = window.setTimeout(scheduleUpdate, 260);
        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('scroll', scheduleUpdate, true);
        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(retryTimer);
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('scroll', scheduleUpdate, true);
        };
    }, [activePage, isActive, step.page, step.targetId]);

    if (!tutorialState || (!isOffer && !isActive)) return null;

    const progressIndex = Math.max(0, NEW_PLAYER_TUTORIAL_STEPS.findIndex(item => item.id === step.id));
    const progressTotal = NEW_PLAYER_TUTORIAL_STEPS.length;
    const tone = toneClasses[step.tone];
    const isMobileHomeIconStep = Boolean(
        step.targetId?.startsWith('mobile-') &&
        step.targetId !== 'mobile-inbox' &&
        step.targetId !== 'mobile-phone-home'
    );
    const cardWidth = typeof window === 'undefined' ? 352 : Math.min(352, window.innerWidth - 28);
    const cardHeight = 370;
    const popoverStyle: React.CSSProperties = targetRect
        ? (() => {
            const targetCenter = targetRect.left + targetRect.width / 2;
            const left = Math.min(
                window.innerWidth - cardWidth - 14,
                Math.max(14, targetCenter - cardWidth / 2)
            );
            const placeAbove = targetRect.top > window.innerHeight * 0.48;
            const pinCardTopForLowerMobileIcon = isMobileHomeIconStep && targetRect.top > window.innerHeight * 0.42;
            const top = pinCardTopForLowerMobileIcon
                ? 16
                : placeAbove
                    ? Math.max(16, targetRect.top - cardHeight - 18)
                    : Math.min(window.innerHeight - cardHeight - 16, targetRect.top + targetRect.height + 18);
            const maxTop = Math.max(16, window.innerHeight - cardHeight - 16);
            return {
                left,
                top: Math.min(maxTop, Math.max(16, top)),
                width: cardWidth,
            };
        })()
        : {
            left: 14,
            right: 14,
            bottom: 92,
        };

    const startTutorial = () => {
        onUpdateTutorialState(buildActiveNewPlayerTutorialState(player.currentWeek));
        setPage(Page.HOME);
    };

    const skipTutorial = () => {
        onUpdateTutorialState({
            ...tutorialState,
            status: 'SKIPPED',
            skippedAtWeek: player.currentWeek,
        });
    };

    function advanceStep() {
        if (!isActive) return;
        if (!step.nextStepId) {
            onUpdateTutorialState({
                ...tutorialState,
                status: 'COMPLETED',
                completedStepIds: makeCompletedSteps(tutorialState, step.id),
                completedAtWeek: player.currentWeek,
            });
            return;
        }
        onUpdateTutorialState({
            ...tutorialState,
            stepId: step.nextStepId,
            completedStepIds: makeCompletedSteps(tutorialState, step.id),
        });
    }

    const handlePrimaryAction = () => {
        if (isOffer) {
            startTutorial();
            return;
        }
        if (step.goToPage) {
            setPage(step.goToPage);
        }
        if (step.mobileAppMode) {
            onOpenMobileAppMode?.(step.mobileAppMode);
        }
        advanceStep();
    };

    const handleLockedLayerClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isActive || !targetRect) return;
        const x = event.clientX;
        const y = event.clientY;
        const padding = 10;
        const isInsideTarget = x >= targetRect.left - padding
            && x <= targetRect.left + targetRect.width + padding
            && y >= targetRect.top - padding
            && y <= targetRect.top + targetRect.height + padding;
        if (isInsideTarget) handlePrimaryAction();
    };

    const stopScroll = (event: React.UIEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    if (isOffer) {
        return (
            <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/68 px-4 pb-24 backdrop-blur-sm">
                <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-amber-300/20 bg-zinc-950 shadow-2xl shadow-black">
                    <div className="border-b border-white/10 bg-gradient-to-br from-amber-400/20 via-zinc-900 to-zinc-950 p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                                First Career
                            </div>
                            <Clapperboard size={22} className="text-amber-300" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-white">Want a quick guided tour?</h2>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                            I will take you screen by screen, highlight what to tap, and teach the core loop without locking you into a long lesson.
                        </p>
                    </div>
                    <div className="space-y-3 p-4">
                        <button
                            type="button"
                            onClick={startTutorial}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 text-sm font-black text-black transition hover:bg-amber-300"
                        >
                            <PlayCircle size={18} />
                            Start Tutorial
                        </button>
                        <button
                            type="button"
                            onClick={skipTutorial}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white/10"
                        >
                            <FastForward size={16} />
                            Skip Tutorial
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[160] pointer-events-auto touch-none select-none"
            onClick={handleLockedLayerClick}
            onWheel={stopScroll}
            onTouchMove={stopScroll}
        >
            {targetRect ? (
                <div
                    className={`absolute rounded-[1.45rem] border-[3px] ${tone.ring} transition-all duration-200`}
                    style={{
                        top: Math.max(8, targetRect.top - 8),
                        left: Math.max(8, targetRect.left - 8),
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        boxShadow: `0 0 0 9999px rgba(0,0,0,0.82), 0 0 30px ${tone.glow}`,
                        pointerEvents: 'none',
                    }}
                />
            ) : (
                <div className="absolute inset-0 bg-black/82 backdrop-blur-[2px]" />
            )}

            <div
                className="pointer-events-auto fixed max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[1.6rem] border border-white/20 bg-zinc-950 shadow-2xl shadow-black"
                style={popoverStyle}
                onClick={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
                onTouchMove={(event) => event.stopPropagation()}
            >
                <div className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone.badge}`}>
                            {step.eyebrow}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                            {progressIndex + 1}/{progressTotal}
                        </div>
                    </div>
                    <h3 className="text-xl font-black leading-tight text-white">{step.title}</h3>
                    <p className="mt-2 text-[15px] leading-6 text-zinc-100">{step.body}</p>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                            className="h-full rounded-full bg-white"
                            style={{ width: `${Math.round(((progressIndex + 1) / progressTotal) * 100)}%` }}
                        />
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={handlePrimaryAction}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${tone.button}`}
                        >
                            {step.nextStepId ? <ArrowRight size={17} /> : <CheckCircle2 size={17} />}
                            {step.actionLabel}
                        </button>
                        <button
                            type="button"
                            onClick={skipTutorial}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
                            aria-label="Skip tutorial"
                            title="Skip tutorial"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                        Only the highlighted control is active
                    </div>
                </div>
            </div>
        </div>
    );
};
