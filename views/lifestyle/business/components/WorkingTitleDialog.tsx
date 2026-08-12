import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Info, PenLine, X } from 'lucide-react';
import type { ProjectType } from '../../../../types';
import {
    getProjectTitleError,
    normalizeProjectTitle,
    PROJECT_TITLE_MAX_LENGTH
} from '../../../../services/projectNaming';
import { ProjectFormatChoice } from './ProjectFormatChoice';

interface WorkingTitleDialogProps {
    mode: 'COMMISSION' | 'RENAME';
    title: string;
    description: string;
    initialTitle: string;
    confirmLabel?: string;
    eyebrow?: string;
    helperText?: string;
    infoText?: string;
    allowProjectTypeChoice?: boolean;
    initialProjectType?: ProjectType;
    onClose: () => void;
    onConfirm: (title: string, projectType?: ProjectType) => void;
}

export const WorkingTitleDialog: React.FC<WorkingTitleDialogProps> = ({
    mode,
    title,
    description,
    initialTitle,
    confirmLabel,
    eyebrow,
    helperText,
    infoText,
    allowProjectTypeChoice = false,
    initialProjectType = 'MOVIE',
    onClose,
    onConfirm
}) => {
    const [workingTitle, setWorkingTitle] = useState(initialTitle);
    const [projectType, setProjectType] = useState<ProjectType>(initialProjectType);
    const inputRef = useRef<HTMLInputElement>(null);
    const error = useMemo(() => getProjectTitleError(workingTitle), [workingTitle]);
    const normalizedLength = normalizeProjectTitle(workingTitle).length;

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (error) return;
        onConfirm(normalizeProjectTitle(workingTitle), allowProjectTypeChoice ? projectType : undefined);
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="working-title-dialog-title">
            <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close working title dialog" />
            <form
                onSubmit={handleSubmit}
                className="relative w-full sm:max-w-lg overflow-hidden rounded-t-3xl sm:rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                            {mode === 'COMMISSION' ? <Clapperboard size={21} /> : <PenLine size={21} />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-400">
                                {eyebrow || (mode === 'COMMISSION' ? 'New Project' : 'Script Vault')}
                            </p>
                            <h2 id="working-title-dialog-title" className="mt-1 text-xl font-black text-white">{title}</h2>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <label className="block">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Working Title</span>
                        <input
                            ref={inputRef}
                            value={workingTitle}
                            onChange={event => setWorkingTitle(event.target.value)}
                            maxLength={PROJECT_TITLE_MAX_LENGTH}
                            className={`w-full rounded-xl border bg-black px-4 py-3.5 text-base font-bold text-white outline-none transition-colors ${
                                error ? 'border-rose-500/70 focus:border-rose-400' : 'border-zinc-700 focus:border-amber-400'
                            }`}
                            placeholder="Enter a project title"
                            aria-invalid={!!error}
                            aria-describedby="working-title-help"
                        />
                    </label>

                    <div className="flex items-start justify-between gap-4">
                        <p id="working-title-help" className={`text-xs ${error ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {error || helperText || 'You can rename this project until filming begins.'}
                        </p>
                        <span className="shrink-0 text-[10px] font-mono text-zinc-600">
                            {normalizedLength}/{PROJECT_TITLE_MAX_LENGTH}
                        </span>
                    </div>

                    {allowProjectTypeChoice && (
                        <ProjectFormatChoice
                            value={projectType}
                            onChange={setProjectType}
                            helperText="Choose how this spin-off will be developed and released."
                        />
                    )}

                    <div className="flex items-start gap-2 rounded-xl border border-sky-500/15 bg-sky-500/5 px-3 py-3 text-sky-200">
                        <Info size={15} className="mt-0.5 shrink-0 text-sky-400" />
                        <p className="text-xs leading-relaxed">
                            {infoText || 'Once production starts, the title locks so releases, news, cast records, and franchise history stay consistent.'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 border-t border-zinc-800 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-900">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!!error}
                        className="flex-[1.4] rounded-xl bg-amber-400 px-4 py-3 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                    >
                        {confirmLabel || (mode === 'COMMISSION' ? 'Commission Project' : 'Save Title')}
                    </button>
                </div>
            </form>
        </div>
    );
};
