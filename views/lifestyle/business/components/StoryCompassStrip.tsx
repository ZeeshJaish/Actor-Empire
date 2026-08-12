import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Info, X } from 'lucide-react';
import { StoryCompass } from '../../../../types';

interface StoryCompassStripProps {
    compass: StoryCompass;
    helper?: string;
    showFlexibility?: boolean;
}

const titleCase = (value: string): string => value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());

const sourceCopy: Record<StoryCompass['source'], string> = {
    SCRIPT_DNA: 'Read from your Script DNA, genre, premise, and development choices.',
    AUTHOR_INTENT: 'Protected by the writer’s authored intent.',
    MARKET_INFERENCE: 'Inferred from the purchased script’s genre, premise, tags, and source material.',
    CANON: 'Carried forward from established franchise or universe canon.',
};

const flexibilityCopy: Record<StoryCompass['flexibility'], string> = {
    OPEN: 'Open: experimentation is welcome and unusual casting receives more creative room.',
    ADAPTABLE: 'Adaptable: you can reinterpret the material, but major changes need support on the page.',
    PROTECTED: 'Protected: canon and authored rules matter more, so unexplained contradictions carry greater risk.',
};

const compassItems = (compass: StoryCompass) => [
    { label: 'Focus', value: titleCase(compass.perspective) },
    { label: 'Conflict', value: titleCase(compass.conflictSource) },
    { label: 'World', value: titleCase(compass.worldRule) },
    { label: 'Cast', value: titleCase(compass.castShape) },
    { label: 'Tone', value: titleCase(compass.tone) },
];

const compassSentence = (compass: StoryCompass): string => {
    const perspective = {
        PROTAGONIST_LED: 'a clear main-character focus',
        VILLAIN_LED: 'a villain-led point of view',
        DUAL: 'two connected lead journeys',
        ENSEMBLE: 'an ensemble point of view',
    }[compass.perspective];
    const conflict = {
        ANTAGONIST: 'a central opponent',
        RIVAL: 'a major rivalry',
        INTERNAL: 'an inner struggle',
        SOCIETY: 'pressure from society',
        NATURE: 'a fight against nature',
        MYSTERY: 'a mystery at its centre',
    }[compass.conflictSource];
    const world = {
        GROUNDED: 'a grounded world',
        TECHNOLOGY: 'a technology-driven world',
        MAGIC: 'a magical world',
        SUPERNATURAL: 'a supernatural world',
        SUPERPOWERED: 'a superpowered world',
        MIXED: 'a mixed-rule world',
    }[compass.worldRule];
    const cast = {
        INTIMATE: 'an intimate cast',
        BALANCED: 'a balanced cast',
        ENSEMBLE: 'a broad ensemble',
    }[compass.castShape];
    return `The script suggests ${perspective}, ${conflict}, ${world}, and ${cast}.`;
};

export const StoryCompassStrip: React.FC<StoryCompassStripProps> = ({
    compass,
    helper = 'Casting guidance read from the story—not a restriction.',
    showFlexibility = false,
}) => {
    const [showGuide, setShowGuide] = useState(false);
    const items = compassItems(compass);

    return (
        <>
            <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.075] via-cyan-400/[0.025] to-transparent" aria-label="Story Compass">
                <div className="px-4 pb-3 pt-3.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <BookOpen size={14} className="shrink-0 text-cyan-300" aria-hidden="true" />
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">Story Compass</p>
                            </div>
                            <p className="mt-2 text-[11px] font-bold leading-5 text-zinc-200">
                                {compassSentence(compass)}
                            </p>
                            <p className="mt-1 text-[9px] font-semibold leading-4 text-zinc-500">{helper}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowGuide(true)}
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-cyan-300/20 bg-black/20 text-cyan-200/70 transition-colors hover:border-cyan-300/45 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                            aria-label="Explain the Story Compass"
                        >
                            <Info size={15} />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 border-t border-cyan-300/10 sm:grid-cols-5">
                    {items.map((item, index) => (
                        <div
                            key={item.label}
                            className={`min-w-0 px-3 py-2.5 ${
                                index % 2 === 0 && index < 4 ? 'border-r border-cyan-300/10 sm:border-r' : ''
                            } ${index < 4 ? 'border-b border-cyan-300/10 sm:border-b-0' : ''} ${
                                index > 0 ? 'sm:border-l sm:border-cyan-300/10' : ''
                            }`}
                        >
                            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-600">{item.label}</p>
                            <p className="mt-1 break-words text-[9px] font-black uppercase leading-4 tracking-[0.08em] text-cyan-100/80">{item.value}</p>
                        </div>
                    ))}
                </div>
                {showFlexibility && (
                    <div className="border-t border-cyan-300/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">
                        Creative flexibility: {titleCase(compass.flexibility)}
                    </div>
                )}
            </section>

            {showGuide && createPortal(
                <div
                    className="fixed inset-0 z-[150] flex items-end bg-black/75 backdrop-blur-sm"
                    role="presentation"
                    onClick={() => setShowGuide(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="story-compass-guide-title"
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-h-[84dvh] overflow-hidden rounded-t-[28px] border-t border-zinc-700 bg-[#0d0d0f]"
                        style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
                    >
                        <div className="mx-auto mt-2.5 h-1 w-12 rounded-full bg-zinc-700" />
                        <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-4">
                            <div>
                                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-300">Script Reading</div>
                                <h3 id="story-compass-guide-title" className="mt-1 text-xl font-black text-white">Why these suggestions?</h3>
                                <p className="mt-1 max-w-md text-[11px] font-medium leading-5 text-zinc-400">{sourceCopy[compass.source]}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide(false)}
                                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                aria-label="Close Story Compass guide"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overscroll-contain overflow-y-auto border-t border-zinc-800/80 px-5 py-3" style={{ maxHeight: 'min(62dvh, 34rem)' }}>
                            {items.map((item, index) => (
                                <div key={item.label} className={`py-3 ${index ? 'border-t border-zinc-800/80' : ''}`}>
                                    <div className="flex items-baseline justify-between gap-4">
                                        <p className="text-[8px] font-black uppercase tracking-[0.17em] text-zinc-500">{item.label}</p>
                                        <p className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-cyan-200">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                                <p className="text-[8px] font-black uppercase tracking-[0.17em] text-zinc-300">
                                    {compass.confidence}% confidence · {titleCase(compass.source)}
                                </p>
                                <p className="mt-2 text-[10px] font-medium leading-5 text-zinc-400">{flexibilityCopy[compass.flexibility]}</p>
                                <p className="mt-2 text-[10px] font-medium leading-5 text-zinc-500">
                                    A surprising choice can still become inspired casting. The game only penalizes combinations that contradict the script without earning the change through writing and performance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
};
