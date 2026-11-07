import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronRight, Pencil, Sparkles } from 'lucide-react';
import { buildEpisodeNames } from '../services/episodeNames';

export interface EpisodeNameValue {
    set: number;
    custom: Record<string, string>;
}

interface EpisodeNamesProps {
    title: string;
    seed: string;
    genre?: string;
    episodes: number;
    season?: number;
    value: EpisodeNameValue;
    /** green in the Production House, red from the Commission page */
    tone?: 'GREEN' | 'RED';
}

const TONES = {
    GREEN: { eyebrow: 'text-emerald-300', chip: 'bg-emerald-500/15 text-emerald-200', button: 'bg-emerald-500 text-black', page: 'from-[#04140e]' },
    RED: { eyebrow: 'text-rose-300', chip: 'bg-rose-500/15 text-rose-200', button: 'bg-rose-500 text-white', page: 'from-[#190408]' },
};

/** #273: the whole season's names, Auto-name all, and any name typed by hand */
export const EpisodeNamesEditor: React.FC<EpisodeNamesProps & {
    onChange: (value: EpisodeNameValue) => void;
    onClose: () => void;
}> = ({ title, seed, genre, episodes, season = 1, value, tone = 'GREEN', onChange, onClose }) => {
    const theme = TONES[tone];
    const names = buildEpisodeNames({ seed, genre, episodes, season, set: value.set, custom: value.custom });
    const automatic = buildEpisodeNames({ seed, genre, episodes, season, set: value.set });
    const typeName = (episode: number, name: string) => {
        const custom = { ...value.custom };
        if (name.trim() && name.trim() !== automatic[episode - 1]) custom[String(episode)] = name;
        else delete custom[String(episode)];
        onChange({ ...value, custom });
    };
    return createPortal(
        <div data-episode-names className={`fixed inset-0 z-[90] flex flex-col bg-gradient-to-b ${theme.page} to-black text-white`}>
            <div className="shrink-0 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+16px)]">
                <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3">
                    <button type="button" onClick={onClose} aria-label="Back" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-200">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <div className={`truncate text-[10px] font-black uppercase tracking-[0.16em] ${theme.eyebrow}`}>{title} · Season {season}</div>
                        <h2 className="truncate text-xl font-black">Episode names</h2>
                    </div>
                </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
                <button
                    type="button"
                    data-auto-name-all
                    onClick={() => onChange({ set: value.set + 1, custom: {} })}
                    className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-left active:scale-[0.99]"
                >
                    <Sparkles size={18} className="shrink-0 text-amber-300" />
                    <span className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-[0.1em] text-amber-200">Auto-name all</span>
                        <span className="mt-0.5 block text-[11px] font-semibold text-zinc-400">The game names them for this show. Tap again for others.</span>
                    </span>
                </button>
                {names.map((name, index) => {
                    const episode = index + 1;
                    return (
                        <label key={episode} className="flex min-h-[52px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3">
                            <span className={`grid h-7 w-8 shrink-0 place-items-center rounded-md text-[10px] font-black ${theme.chip}`}>E{episode}</span>
                            <input
                                value={value.custom[String(episode)] ?? name}
                                maxLength={48}
                                aria-label={`Episode ${episode} name`}
                                onChange={event => typeName(episode, event.target.value)}
                                className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600"
                                placeholder={automatic[index]}
                            />
                            <Pencil size={13} className="shrink-0 text-zinc-500" aria-hidden="true" />
                        </label>
                    );
                })}
                <p className="pt-1 text-center text-[11px] font-semibold text-zinc-500">Tap a name to type your own. They show on IMDb too.</p>
            </div>
            <div className="shrink-0 border-t border-white/10 bg-black/60 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
                <button type="button" onClick={onClose} className={`min-h-[52px] w-full rounded-2xl text-sm font-black uppercase tracking-[0.12em] ${theme.button}`}>Done</button>
            </div>
        </div>,
        document.body,
    );
};

/** The row that opens the editor, in a wizard's Setup */
export const EpisodeNamesCard: React.FC<EpisodeNamesProps & { onChange: (value: EpisodeNameValue) => void }> = props => {
    const { seed, genre, episodes, season = 1, value, tone = 'GREEN' } = props;
    const [open, setOpen] = useState(false);
    const names = buildEpisodeNames({ seed, genre, episodes, season, set: value.set, custom: value.custom });
    const theme = TONES[tone];
    return (
        <>
            <button
                type="button"
                data-episode-names-card
                onClick={() => setOpen(true)}
                className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left active:scale-[0.99]"
            >
                <span className="min-w-0 flex-1">
                    <span className={`block text-[10px] font-black uppercase tracking-[0.16em] ${theme.eyebrow}`}>Episode names · {episodes} episodes</span>
                    <span className="mt-1 block truncate text-sm font-bold text-white">{names.slice(0, 3).join(' · ')}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-zinc-500" />
            </button>
            {open && <EpisodeNamesEditor {...props} onClose={() => setOpen(false)} />}
        </>
    );
};
