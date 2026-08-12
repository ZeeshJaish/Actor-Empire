import React, { useState } from 'react';
import { BookOpen, ChevronRight, Film, Info, PenTool, Sparkles, Star, Tv } from 'lucide-react';
import { Genre, ProjectFormat, ProjectType, Script, ScriptAttributes, ScriptSubjectType, TargetAudience } from '../../../../types';
import { generateProceduralLogline } from '../../../../src/data/generators';
import { SCRIPT_TEMPLATES, ScriptQuestion } from '../../../../src/data/scriptTemplates';
import { resolveProjectType } from '../../../../services/businessLogic';
import { ALL_GENRES, PROJECT_FORMATS, formatGenreLabel, formatProjectFormatLabel, isSubjectDrivenGenre } from '../../../../services/genreCatalog';
import { getPlayerLanguage, t } from '../../../../services/i18n';
import { inferStoryCompass } from '../../../../services/characterIdentityLogic';
import { StoryCompassStrip } from './StoryCompassStrip';

const clampScriptStat = (value: number) => Math.max(10, Math.min(100, Math.round(value)));
const CUSTOM_PREMISE_MAX_LENGTH = 180;

const sanitizeCustomPremise = (value: string) => value.replace(/\s+/g, ' ').trimStart().slice(0, CUSTOM_PREMISE_MAX_LENGTH);

const getSubjectTypeLabel = (subjectType?: ScriptSubjectType) => (subjectType || 'PUBLIC_FIGURE').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const getFormatQuestions = (format: ProjectFormat): ScriptQuestion[] => {
    if (format === 'ANIMATED') {
        return [{
            id: 'format-animation-style',
            question: 'What animation identity does it have?',
            options: [
                { id: 'family-spectacle', text: 'Family Spectacle', reviewSnippet: 'bright, emotional, and built for all ages', newsHeadline: 'Families are already responding to the animation concept.' },
                { id: 'stylized-art-film', text: 'Stylized Art Film', reviewSnippet: 'visually daring and emotionally precise', newsHeadline: 'The animation style is being called bold and distinctive.' },
                { id: 'voice-comedy', text: 'Voice-Driven Comedy', reviewSnippet: 'powered by funny, expressive performances', newsHeadline: 'The voice performances are expected to be the selling point.' }
            ]
        }];
    }
    if (format === 'ANIME') {
        return [{
            id: 'format-anime-lane',
            question: 'Which anime lane does it follow?',
            options: [
                { id: 'shonen-event', text: 'Shonen Event Film', reviewSnippet: 'big emotion, rivalries, and explosive action', newsHeadline: 'Anime fans are circling the event-film energy.' },
                { id: 'dark-fantasy', text: 'Dark Fantasy Anime', reviewSnippet: 'mythic, intense, and visually sharp', newsHeadline: 'The dark fantasy anime angle is building serious buzz.' },
                { id: 'slice-of-life', text: 'Slice-of-Life Drama', reviewSnippet: 'quiet, heartfelt, and character-driven', newsHeadline: 'The intimate anime drama could be a sleeper hit.' }
            ]
        }];
    }
    return [];
};

const getSubjectQuestions = (genre: Genre, subjectName: string, subjectType: ScriptSubjectType): ScriptQuestion[] => {
    if (!isSubjectDrivenGenre(genre)) return [];
    const label = subjectName || 'the subject';
    if (genre === 'BIOPIC') {
        return [{
            id: 'subject-biopic-focus',
            question: `What part of ${label}'s story anchors the movie?`,
            options: [
                { id: 'private-cost', text: 'Private Cost of Fame', reviewSnippet: 'finding pain beneath the public image', newsHeadline: `${label}'s private life gives the biopic emotional weight.` },
                { id: 'defining-victory', text: 'Defining Victory', reviewSnippet: 'building toward the moment that changed everything', newsHeadline: `${label}'s defining win gives the film a strong spine.` },
                { id: 'messy-truth', text: 'Messy Truth', reviewSnippet: 'refusing to sand down the contradictions', newsHeadline: `The ${getSubjectTypeLabel(subjectType)} angle is being treated with unusual honesty.` }
            ]
        }];
    }
    return [{
        id: 'subject-doc-access',
        question: `What access do we have to ${label}?`,
        options: [
            { id: 'exclusive-footage', text: 'Exclusive Footage', reviewSnippet: 'driven by material nobody has seen before', newsHeadline: `Exclusive footage makes the ${label} documentary feel urgent.` },
            { id: 'key-witnesses', text: 'Key Witnesses', reviewSnippet: 'built around firsthand testimony', newsHeadline: `Witness interviews are giving the documentary real authority.` },
            { id: 'open-question', text: 'Unresolved Question', reviewSnippet: 'following a mystery without easy answers', newsHeadline: `The unresolved question at the center of ${label} is grabbing attention.` }
        ]
    }];
};

const getScriptQuestions = (genre: Genre, format: ProjectFormat, subjectName: string, subjectType: ScriptSubjectType): ScriptQuestion[] => [
    ...getFormatQuestions(format),
    ...getSubjectQuestions(genre, subjectName, subjectType),
    ...(SCRIPT_TEMPLATES[genre] || []),
];

const calculateConceptAttributes = (
    genre: Genre,
    format: ProjectFormat,
    subjectType: ScriptSubjectType,
    selectedOptions: { questionId: string; choiceId: string }[],
    hasSecondaryGenre: boolean
): ScriptAttributes => {
    const attrs: ScriptAttributes = { plot: 50, characters: 50, pacing: 50, dialogue: 50, action: 50, originality: 50 };
    const boost = (stat: keyof ScriptAttributes, amount: number) => {
        attrs[stat] = clampScriptStat((attrs[stat] || 50) + amount);
    };

    if (hasSecondaryGenre) boost('originality', 4);
    if (format === 'ANIMATED') {
        boost('originality', 8);
        boost('characters', 5);
        if (genre === 'ANIMATION' || genre === 'FANTASY') boost('action', 5);
    }
    if (format === 'ANIME') {
        boost('originality', 10);
        boost('action', 7);
        boost('pacing', 4);
    }
    if (genre === 'BIOPIC') {
        boost('characters', 10);
        boost('dialogue', 4);
        boost('originality', subjectType === 'ATHLETE' || subjectType === 'MUSICIAN' ? 5 : 2);
    }
    if (genre === 'DOCUMENTARY') {
        boost('originality', 12);
        boost('plot', 6);
        boost('dialogue', 3);
        boost('action', -8);
    }
    if (genre === 'MUSICAL') {
        boost('originality', 8);
        boost('dialogue', 5);
        boost('pacing', 5);
    }
    if (genre === 'SPORTS') {
        boost('action', 8);
        boost('pacing', 6);
        boost('characters', 4);
    }
    if (genre === 'CRIME') {
        boost('plot', 8);
        boost('pacing', 5);
    }
    if (genre === 'MYSTERY') {
        boost('plot', 10);
        boost('originality', 4);
        boost('pacing', 3);
        boost('dialogue', 2);
    }
    if (genre === 'FANTASY') {
        boost('plot', 8);
        boost('originality', 7);
    }

    selectedOptions.forEach(option => {
        const id = option.choiceId;
        if (/archive|exclusive|original|forbidden|lost-heir|world|mature|stylized|messy/.test(id)) boost('originality', 5);
        if (/authorized|private|intimate|character|slice|family|community|mob/.test(id)) boost('characters', 5);
        if (/investigative|detective|mystery|case|truth|open-question/.test(id)) boost('plot', 5);
        if (/shonen|rivalry|final|breakneck|sports|action|monster/.test(id)) boost('action', 5);
        if (/jukebox|voice|comedy|dialogue|interviews|witnesses/.test(id)) boost('dialogue', 5);
        if (/comeback|underdog|cultural|backstage|fame|dark-fantasy/.test(id)) boost('pacing', 4);
    });

    return attrs;
};

const calculateConceptQuality = (attrs: ScriptAttributes) => {
    const weighted = ((attrs.plot || 50) * 1.2) + ((attrs.characters || 50) * 1.1) + (attrs.pacing || 50) + (attrs.dialogue || 50) + ((attrs.action || 50) * 0.85) + ((attrs.originality || 50) * 1.1);
    return clampScriptStat(weighted / 6.25);
};

type ScriptBuilderStep = 'IDEA' | 'IDENTITY' | 'STORY' | 'DRAFT';

export interface DevelopmentLabScriptWizardProps {
    onComplete: (script: Script) => void;
    language: ReturnType<typeof getPlayerLanguage>;
    initialScript?: Script;
    initialProjectType?: ProjectType;
}

interface ScriptBuilderStepItem {
    id: ScriptBuilderStep;
    label: string;
    short: string;
}

interface ProgressRailProps {
    currentStepLabel: string;
    previewQuality: number;
    builderSteps: ScriptBuilderStepItem[];
    step: ScriptBuilderStep;
    stepIndex: number;
    onStepChange: (step: ScriptBuilderStep) => void;
}

const ProgressRail: React.FC<ProgressRailProps> = ({ currentStepLabel, previewQuality, builderSteps, step, stepIndex, onStepChange }) => (
    <div className="mb-6">
        <div className="mb-5 flex items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                    <PenTool size={13} />
                    Script Concept
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight">{currentStepLabel}</h2>
            </div>
            <div className="shrink-0 rounded-2xl border border-zinc-800 bg-black/50 px-4 py-3 text-right">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Quality</div>
                <div className="mt-1 text-2xl font-black leading-none text-white">{previewQuality}</div>
            </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {builderSteps.map((item, index) => {
                const isActive = item.id === step;
                const isDone = index < stepIndex;
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                            if (index <= stepIndex) onStepChange(item.id);
                        }}
                        className={`group relative rounded-2xl border px-2 py-3 text-center transition-all ${
                            isActive
                                ? 'border-amber-400 bg-amber-400 text-black shadow-[0_10px_28px_rgba(251,191,36,0.18)]'
                                : isDone
                                    ? 'border-teal-400/25 bg-teal-400/10 text-teal-200'
                                    : 'border-zinc-800 bg-zinc-950/80 text-zinc-600 hover:text-zinc-300'
                        }`}
                    >
                        <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-[10px] font-black">
                            {index + 1}
                        </div>
                        <div className="text-[9px] font-black uppercase leading-tight sm:text-[10px]">{item.short}</div>
                    </button>
                );
            })}
        </div>
    </div>
);

interface WizardFooterProps {
    step: ScriptBuilderStep;
    continueDisabled: boolean;
    continueLabel: string;
    onBack: () => void;
    onContinue: () => void;
}

const WizardFooter: React.FC<WizardFooterProps> = ({ step, continueDisabled, continueLabel, onBack, onContinue }) => (
    <div className="mt-7 grid grid-cols-[minmax(96px,0.34fr)_1fr] gap-3 border-t border-zinc-800/80 pt-5 sm:grid-cols-[140px_1fr]">
        <button
            type="button"
            onClick={onBack}
            disabled={step === 'IDEA'}
            className="min-h-[58px] rounded-2xl border border-zinc-800 bg-zinc-950 px-5 text-sm font-black uppercase text-zinc-300 transition-colors hover:border-zinc-600 disabled:text-zinc-700 disabled:opacity-50"
        >
            Back
        </button>
        <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            className="min-h-[58px] rounded-2xl bg-amber-400 px-4 text-sm font-black uppercase tracking-wide text-black shadow-[0_12px_34px_rgba(251,191,36,0.18)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
        >
            {continueLabel}
        </button>
    </div>
);

const SurfaceHeader: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
    <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-black shadow-[0_10px_24px_rgba(251,191,36,0.16)]">
            {icon}
        </div>
        <div>
            <h3 className="text-2xl font-black leading-tight tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
        </div>
    </div>
);

interface OptionTileProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

const OptionTile: React.FC<OptionTileProps> = ({ active, onClick, children, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
            active
                ? 'border-white bg-white text-black shadow-[0_16px_35px_rgba(255,255,255,0.08)]'
                : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-amber-400/50 hover:bg-zinc-900'
        } ${className}`}
    >
        {active ? <div className="absolute inset-y-0 left-0 w-1 bg-amber-400" /> : null}
        {children}
    </button>
);

export const DevelopmentLabScriptWizard: React.FC<DevelopmentLabScriptWizardProps> = ({ onComplete, language, initialScript, initialProjectType }) => {
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
    const [step, setStep] = useState<ScriptBuilderStep>(initialScript ? 'STORY' : 'IDEA');
    const [storyIndex, setStoryIndex] = useState(0);
    const [title, setTitle] = useState(initialScript?.title || '');
    const [projectType, setProjectType] = useState<ProjectType>(resolveProjectType(initialScript?.projectType, (initialScript as any)?.type, (initialScript as any)?.projectDetails?.type, initialProjectType));
    const [format, setFormat] = useState<ProjectFormat>(initialScript?.format || 'LIVE_ACTION');
    const [targetAudience, setTargetAudience] = useState<TargetAudience>(initialScript?.targetAudience || 'PG-13');
    const [episodes, setEpisodes] = useState(initialScript?.episodes || 8);
    const [primaryGenre, setPrimaryGenre] = useState<Genre | ''>(initialScript?.genres[0] || '');
    const [secondaryGenre, setSecondaryGenre] = useState<Genre | ''>(initialScript?.genres[1] || '');
    const [subjectName, setSubjectName] = useState(initialScript?.subjectName || '');
    const [subjectType, setSubjectType] = useState<ScriptSubjectType>(initialScript?.subjectType || 'PUBLIC_FIGURE');
    const [showStatInfo, setShowStatInfo] = useState(false);
    const [draftPremise, setDraftPremise] = useState(initialScript?.logline || '');
    const [premiseEdited, setPremiseEdited] = useState(Boolean(initialScript?.logline));
    
    const [options, setOptions] = useState<Record<string, string>>(() => {
        const initialOptions: Record<string, string> = {};
        initialScript?.options?.forEach(option => {
            initialOptions[option.questionId] = option.choiceId;
        });
        return initialOptions;
    });
    const [seedLogline] = useState(() => initialScript?.logline || generateProceduralLogline());

    const genres: Genre[] = ALL_GENRES;
    const needsSubject = isSubjectDrivenGenre(primaryGenre);
    const questions = primaryGenre ? getScriptQuestions(primaryGenre as Genre, format, subjectName, subjectType) : [];
    const selectedScriptOptions = questions.map(q => ({
        questionId: q.id,
        choiceId: options[q.id] || q.options[0].id
    }));
    const previewAttributes = primaryGenre
        ? calculateConceptAttributes(primaryGenre as Genre, format, subjectType, selectedScriptOptions, Boolean(secondaryGenre))
        : { plot: 50, characters: 50, pacing: 50, dialogue: 50, action: 50, originality: 50 };
    const previewQuality = calculateConceptQuality(previewAttributes);
    const selectedOptionLabels = questions
        .map(q => q.options.find(opt => opt.id === (options[q.id] || q.options[0].id))?.text)
        .filter(Boolean);
    const suggestedPremise = needsSubject && subjectName.trim()
        ? `${primaryGenre === 'BIOPIC' ? 'A dramatic portrait' : 'A documentary investigation'} of ${subjectName.trim()}, built around the public story and private cost behind the headlines.`
        : seedLogline;
    const displayedPremise = premiseEdited ? draftPremise : suggestedPremise;
    const finalPremise = (displayedPremise.trim() || suggestedPremise).slice(0, CUSTOM_PREMISE_MAX_LENGTH);
    const previewStoryCompass = inferStoryCompass({
        genres: primaryGenre
            ? secondaryGenre
                ? [primaryGenre as Genre, secondaryGenre as Genre]
                : [primaryGenre as Genre]
            : [],
        logline: finalPremise,
        options: selectedScriptOptions,
        isOriginal: initialScript?.isOriginal ?? true,
        storyCompass: initialScript?.storyCompass,
        sourceMaterial: needsSubject ? 'ADAPTATION' : initialScript?.sourceMaterial,
    }, initialScript?.isOriginal === false ? 'MARKET_INFERENCE' : 'SCRIPT_DNA');
    const builderSteps: ScriptBuilderStepItem[] = [
        { id: 'IDEA', label: tr('developmentLab.builder.step.idea.label'), short: tr('developmentLab.builder.step.idea.short') },
        { id: 'IDENTITY', label: tr('developmentLab.builder.step.identity.label'), short: tr('developmentLab.builder.step.identity.short') },
        { id: 'STORY', label: tr('developmentLab.builder.step.story.label'), short: tr('developmentLab.builder.step.story.short') },
        { id: 'DRAFT', label: tr('developmentLab.builder.step.draft.label'), short: tr('developmentLab.builder.step.draft.short') }
    ];
    const stepIndex = builderSteps.findIndex(s => s.id === step);
    const safeStoryIndex = Math.min(storyIndex, Math.max(questions.length - 1, 0));
    const currentQuestion = questions[safeStoryIndex];
    const selectedQuestionChoice = currentQuestion ? options[currentQuestion.id] : undefined;
    const canLeaveIdea = Boolean(title.trim());
    const canLeaveIdentity = Boolean(primaryGenre && (!needsSubject || subjectName.trim()));
    const canLeaveStory = !currentQuestion || Boolean(selectedQuestionChoice);
    const currentStepLabel = builderSteps[stepIndex]?.label || tr('developmentLab.builder.scriptBuilder');
    const audienceTone: Record<TargetAudience, string> = {
        G: 'bg-emerald-400 text-black border-emerald-300 shadow-[0_10px_24px_rgba(52,211,153,0.15)]',
        PG: 'bg-lime-300 text-black border-lime-200 shadow-[0_10px_24px_rgba(190,242,100,0.13)]',
        'PG-13': 'bg-amber-400 text-black border-amber-300 shadow-[0_10px_24px_rgba(251,191,36,0.15)]',
        R: 'bg-rose-500 text-white border-rose-400 shadow-[0_10px_24px_rgba(244,63,94,0.16)]',
        'NC-17': 'bg-red-700 text-white border-red-500 shadow-[0_10px_24px_rgba(185,28,28,0.18)]'
    };
    const statInfo = [
        ['Plot', 'Raised by mystery, investigation, crime, fantasy world-building, documentary access, and choices about truth or cases.'],
        ['Characters', 'Raised by biopic subjects, private stories, family/community choices, intimate tones, animation, sports, and character-led options.'],
        ['Pacing', 'Raised by anime, sports, crime, comeback stories, underdog arcs, backstage pressure, and darker fantasy lanes.'],
        ['Dialogue', 'Raised by biopics, documentaries, musicals, interviews, witnesses, comedy, voice-driven choices, and dialogue-heavy options.'],
        ['Action', 'Raised by anime, sports, action-heavy set pieces, monster/rivalry/final-battle choices, and some animated fantasy concepts.'],
        ['Originality', 'Raised by animated/anime formats, secondary genre hybrids, documentaries, fantasy, musicals, exclusive access, forbidden/messy/world-building choices.']
    ];

    const buildScript = (): Script => ({
        ...(initialScript || {}),
        id: initialScript?.id || `script_${Date.now()}`,
        title,
        projectType,
        format,
        targetAudience,
        episodes: projectType === 'SERIES' ? episodes : undefined,
        genres: secondaryGenre ? [primaryGenre as Genre, secondaryGenre as Genre] : [primaryGenre as Genre],
        status: 'CONCEPT',
        quality: initialScript?.quality || previewQuality,
        options: selectedScriptOptions,
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 0,
        isOriginal: initialScript ? initialScript.isOriginal : true,
        // Script DNA still drives gameplay calculations; this premise is player-facing flavor.
        logline: finalPremise,
        storyCompass: previewStoryCompass,
        subjectName: needsSubject ? subjectName.trim() : undefined,
        subjectType: needsSubject ? subjectType : undefined,
        sourceMaterial: needsSubject ? 'ADAPTATION' : initialScript?.sourceMaterial,
        sourceMaterialType: primaryGenre === 'BIOPIC' ? 'LIFE_RIGHTS' : primaryGenre === 'DOCUMENTARY' ? 'DOCUMENTARY_SUBJECT' : initialScript?.sourceMaterialType,
        attributes: previewAttributes,
        baseQuality: initialScript?.baseQuality || previewQuality,
        developmentCost: initialScript?.developmentCost || 0
    });

    const goForward = () => {
        if (step === 'IDEA' && canLeaveIdea) {
            setStep('IDENTITY');
            return;
        }
        if (step === 'IDENTITY' && canLeaveIdentity) {
            setStoryIndex(0);
            setStep(questions.length ? 'STORY' : 'DRAFT');
            return;
        }
        if (step === 'STORY' && canLeaveStory) {
            if (safeStoryIndex < questions.length - 1) {
                setStoryIndex(safeStoryIndex + 1);
            } else {
                setStep('DRAFT');
            }
            return;
        }
        if (step === 'DRAFT') {
            onComplete(buildScript());
        }
    };

    const goBack = () => {
        if (step === 'IDENTITY') setStep('IDEA');
        if (step === 'STORY') {
            if (safeStoryIndex > 0) setStoryIndex(safeStoryIndex - 1);
            else setStep('IDENTITY');
        }
        if (step === 'DRAFT') setStep(questions.length ? 'STORY' : 'IDENTITY');
    };

    const continueDisabled =
        (step === 'IDEA' && !canLeaveIdea) ||
        (step === 'IDENTITY' && !canLeaveIdentity) ||
        (step === 'STORY' && !canLeaveStory);

    const continueLabel = step === 'IDEA'
        ? 'Next: Genre'
        : step === 'IDENTITY'
            ? 'Next: Story'
            : step === 'STORY'
                ? (safeStoryIndex < questions.length - 1 ? 'Next Choice' : 'Review Script')
                : 'Add To Vault';

    return (
        <div className="min-h-full pb-20">
            <div className="max-w-3xl mx-auto">
                <div className="rounded-[2rem] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(5,5,6,0.98))] p-4 sm:p-6 shadow-2xl">
                    <ProgressRail
                        currentStepLabel={currentStepLabel}
                        previewQuality={previewQuality}
                        builderSteps={builderSteps}
                        step={step}
                        stepIndex={stepIndex}
                        onStepChange={setStep}
                    />
                    <div className="mb-6 rounded-2xl border border-zinc-800 bg-black/45 p-3">
                        <div className="min-w-0">
                            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Concept</div>
                            <div className="mt-1 text-base font-black leading-snug text-zinc-100 break-words">{title.trim() || 'Untitled'}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{projectType}</span>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{formatProjectFormatLabel(format)}</span>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{primaryGenre ? formatGenreLabel(primaryGenre as Genre) : 'Genre Not Set'}</span>
                            {secondaryGenre && (
                                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200">{formatGenreLabel(secondaryGenre as Genre)}</span>
                            )}
                        </div>
                    </div>
                {step === 'IDEA' && (
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_32%),#070708] p-5 sm:p-7">
                        <SurfaceHeader
                            title="Start the concept"
                            description="Name the project and lock the basic production shape before choosing the creative lane."
                            icon={<PenTool size={20} />}
                        />
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. The Last Stand"
                            className="w-full bg-black/70 border border-zinc-800 rounded-[1.4rem] px-5 py-5 text-2xl font-black text-white placeholder:text-zinc-700 focus:outline-none focus:border-white transition-colors"
                        />
                        <div className="mt-6 grid grid-cols-1 gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Format</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {PROJECT_FORMATS.map(t => (
                                        <OptionTile key={t} onClick={() => setFormat(t)} active={format === t} className="min-h-[74px]">
                                            <div className="text-xs font-black uppercase">{formatProjectFormatLabel(t)}</div>
                                        </OptionTile>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {['MOVIE', 'SERIES'].map(t => (
                                    <OptionTile key={t} onClick={() => setProjectType(t as ProjectType)} active={projectType === t}>
                                        <div className="text-sm font-black uppercase">{t}</div>
                                    </OptionTile>
                                ))}
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Audience</div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {['G', 'PG', 'PG-13', 'R', 'NC-17'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTargetAudience(t as TargetAudience)}
                                            className={`shrink-0 min-w-[64px] px-4 py-3 rounded-2xl border text-xs font-black transition-colors ${
                                                targetAudience === t ? audienceTone[t as TargetAudience] : 'bg-black border-zinc-800 text-zinc-400'
                                            }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {projectType === 'SERIES' && (
                                <div className="rounded-[1.4rem] bg-black/60 border border-zinc-800 p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-[10px] font-black uppercase text-zinc-500">Episodes</div>
                                        <span className="text-teal-300 font-mono font-black text-sm">{episodes}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="4"
                                        max="24"
                                        step="1"
                                        value={episodes}
                                        onChange={e => setEpisodes(parseInt(e.target.value))}
                                        className="w-full accent-teal-300 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'IDENTITY' && (
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.10),transparent_32%),#070708] p-5 sm:p-7">
                        <SurfaceHeader
                            title="Choose the lane"
                            description="Pick the primary movie type first. Add a secondary genre only when the idea is clearly a hybrid."
                            icon={<Sparkles size={20} />}
                        />
                        <div className="space-y-5">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Primary Genre</div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {genres.map(g => (
                                        <OptionTile
                                            key={g}
                                            onClick={() => {
                                                setPrimaryGenre(g);
                                                if (g === 'ANIMATION') setFormat('ANIMATED');
                                                if (!isSubjectDrivenGenre(g)) setSubjectName('');
                                            }}
                                            active={primaryGenre === g}
                                            className="min-h-[54px] p-3"
                                        >
                                            <div className="text-[10px] sm:text-xs font-black uppercase leading-tight break-words">{formatGenreLabel(g)}</div>
                                        </OptionTile>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Secondary Genre</div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {genres.filter(g => g !== primaryGenre).map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setSecondaryGenre(secondaryGenre === g ? '' : g)}
                                            className={`shrink-0 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-colors ${
                                                secondaryGenre === g ? 'bg-white text-black' : 'bg-black border border-zinc-800 text-zinc-500'
                                            }`}
                                        >
                                            {formatGenreLabel(g)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {needsSubject && (
                                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="text-sm font-black text-white mb-4">{primaryGenre === 'BIOPIC' ? 'Biopic Focus' : 'Documentary Focus'}</div>
                                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">
                                                {primaryGenre === 'BIOPIC' ? 'Who is it about?' : 'What is it about?'}
                                            </label>
                                            <input
                                                type="text"
                                                value={subjectName}
                                                onChange={e => setSubjectName(e.target.value)}
                                                placeholder={primaryGenre === 'BIOPIC' ? 'e.g. Maya Stone, football legend' : 'e.g. The Westbridge Case'}
                                                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">Subject Lane</label>
                                            <select
                                                value={subjectType}
                                                onChange={e => setSubjectType(e.target.value as ScriptSubjectType)}
                                                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:border-white transition-colors"
                                            >
                                                {['PUBLIC_FIGURE', 'ATHLETE', 'MUSICIAN', 'CRIMINAL_CASE', 'HISTORICAL_EVENT', 'COMPANY', 'TEAM', 'FANDOM'].map(type => (
                                                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'STORY' && (
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),#070708] p-5 sm:p-7">
                        <SurfaceHeader
                            title="Shape the story"
                            description={`${safeStoryIndex + 1} of ${Math.max(questions.length, 1)} choices. Keep the old step flow, but make each choice feel decisive.`}
                            icon={<BookOpen size={20} />}
                        />
                        {currentQuestion ? (
                            <div>
                                <div className="flex gap-1 mb-5">
                                    {questions.map((q, idx) => (
                                        <div key={q.id} className={`h-1 flex-1 rounded-full ${idx <= safeStoryIndex ? 'bg-white' : 'bg-zinc-800'}`} />
                                    ))}
                                </div>
                                <h3 className="text-2xl font-black leading-tight mb-5 tracking-tight">{currentQuestion.question}</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {currentQuestion.options.map(opt => (
                                        <OptionTile
                                            key={opt.id}
                                            active={options[currentQuestion.id] === opt.id}
                                            onClick={() => setOptions(current => ({ ...current, [currentQuestion.id]: opt.id }))}
                                            className="min-h-[116px]"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="text-lg font-black leading-tight">{opt.text}</div>
                                                    <div className="text-xs opacity-70 mt-3 italic leading-relaxed">"{opt.reviewSnippet}"</div>
                                                </div>
                                                {options[currentQuestion.id] === opt.id && (
                                                    <Star size={16} className="shrink-0 fill-current" />
                                                )}
                                            </div>
                                        </OptionTile>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] bg-black border border-zinc-800 p-5 text-zinc-400 text-sm">
                                This concept has no extra story questions yet. You can review the draft now.
                            </div>
                        )}
                    </div>
                )}

                {step === 'DRAFT' && (
                    <div className="rounded-[1.5rem] overflow-hidden border border-zinc-800 bg-[#070708]">
                        <div className="p-6 sm:p-8 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_35%),linear-gradient(145deg,#111113,#050505)] border-b border-zinc-800">
                            <div className="text-[10px] font-black uppercase text-teal-300 mb-4">Final Draft Review</div>
                            <h2 className="text-3xl sm:text-4xl font-black leading-tight break-words">{title}</h2>
                            <div className="flex flex-wrap gap-2 mt-5">
                                {[projectType, formatProjectFormatLabel(format), primaryGenre ? formatGenreLabel(primaryGenre as Genre) : null, secondaryGenre ? formatGenreLabel(secondaryGenre as Genre) : null].filter(Boolean).map(chip => (
                                    <span key={chip} className="text-[10px] font-black uppercase bg-white/10 text-white border border-white/10 rounded-full px-3 py-1">
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 sm:p-6 space-y-5">
                            <div className="rounded-[1.4rem] border border-zinc-800 bg-black/55 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">Player Premise</div>
                                        <div className="mt-1 text-[11px] font-bold text-zinc-500">The one-line pitch the town repeats.</div>
                                    </div>
                                    <div className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black ${
                                        finalPremise.length >= CUSTOM_PREMISE_MAX_LENGTH
                                            ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                                            : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                                    }`}>
                                        {finalPremise.length}/{CUSTOM_PREMISE_MAX_LENGTH}
                                    </div>
                                </div>
                                <textarea
                                    value={displayedPremise}
                                    onChange={e => {
                                        setPremiseEdited(true);
                                        setDraftPremise(sanitizeCustomPremise(e.target.value));
                                    }}
                                    rows={3}
                                    placeholder="A sharp one-line pitch for this project..."
                                    className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm font-semibold leading-relaxed text-zinc-100 placeholder:text-zinc-700 focus:border-amber-300 focus:outline-none"
                                />
                                {premiseEdited && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPremiseEdited(false);
                                            setDraftPremise('');
                                        }}
                                        className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-amber-300"
                                    >
                                        Use DNA Suggestion
                                    </button>
                                )}
                            </div>
                            {needsSubject && subjectName && (
                                <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="text-[10px] font-black uppercase text-amber-300 mb-1">Subject</div>
                                    <div className="text-sm font-black text-white">{subjectName}</div>
                                    <div className="text-xs text-zinc-500 mt-1">{getSubjectTypeLabel(subjectType)}</div>
                                </div>
                            )}
                            <StoryCompassStrip
                                compass={previewStoryCompass}
                                helper="Guides automatic character suggestions. You can still rewrite every role during casting."
                                showFlexibility
                            />
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Script DNA</div>
                                <button
                                    onClick={() => setShowStatInfo(current => !current)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                                        showStatInfo ? 'border-amber-400 bg-amber-400 text-black' : 'border-zinc-800 bg-black text-zinc-400'
                                    }`}
                                    aria-label="Explain script DNA stats"
                                >
                                    <Info size={15} />
                                </button>
                            </div>
                            {showStatInfo && (
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="text-sm font-black text-white">How these stats are calculated</div>
                                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                                        Every concept starts at 50. Format, genre, subject type, secondary genre, and your story choices add small boosts. Final quality weighs Plot, Characters, and Originality slightly more than Action.
                                    </p>
                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {statInfo.map(([label, description]) => (
                                            <div key={label}>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">{label}</div>
                                                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    ['Plot', previewAttributes.plot],
                                    ['Characters', previewAttributes.characters],
                                    ['Pacing', previewAttributes.pacing],
                                    ['Dialogue', previewAttributes.dialogue],
                                    ['Action', previewAttributes.action],
                                    ['Originality', previewAttributes.originality],
                                ].map(([label, value]) => (
                                    <div key={label as string} className="bg-black rounded-2xl p-3 border border-zinc-800">
                                        <div className="text-[8px] text-zinc-500 font-black uppercase">{label}</div>
                                        <div className="text-base text-white font-mono font-black">{value}</div>
                                    </div>
                                ))}
                            </div>
                            {selectedOptionLabels.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-black uppercase text-zinc-500 mb-2">Chosen Angles</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOptionLabels.map(label => (
                                            <span key={label} className="text-[10px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1">{label}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between rounded-[1.4rem] bg-teal-300 text-black p-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase opacity-70">Draft Quality</div>
                                    <div className="text-xs font-bold opacity-70 mt-1">Ready for the vault</div>
                                </div>
                                <div className="text-4xl font-black">{previewQuality}</div>
                            </div>
                        </div>
                    </div>
                )}
                    <WizardFooter
                        step={step}
                        continueDisabled={continueDisabled}
                        continueLabel={continueLabel}
                        onBack={goBack}
                        onContinue={goForward}
                    />
                </div>
            </div>
        </div>
    );
};
