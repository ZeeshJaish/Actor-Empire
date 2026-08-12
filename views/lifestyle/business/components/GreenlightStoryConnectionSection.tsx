import React from 'react';
import {
    Clapperboard,
    Globe,
    Info,
    Layers,
    Plus,
    X,
} from 'lucide-react';
import type { Universe, UniverseId } from '../../../../types';
import type { ConnectedProjectIntent } from '../greenlightUtils';

interface GreenlightFranchiseOption {
    id: string;
    name: string;
    lastInstallment: number;
    genre?: string;
}

interface GreenlightStoryConnectionSectionProps {
    connectedProjectIntent: ConnectedProjectIntent;
    effectiveConnectedIntent: ConnectedProjectIntent;
    linkedUniverseCastCount: number;
    showStoryConnectionInfo: boolean;
    selectableUniverses: Universe[];
    selectedUniverseId: UniverseId | 'NEW' | null;
    newUniverseName: string;
    franchises: GreenlightFranchiseOption[];
    selectedFranchiseId: string | 'NEW' | null;
    translate: (key: any) => string;
    getUniversePhaseLabel: (phase: Universe['currentPhase']) => string;
    onToggleStoryConnectionInfo: () => void;
    onConnectedProjectIntentChange: (intent: ConnectedProjectIntent) => void;
    onUniverseChange: (universeId: UniverseId | 'NEW' | null) => void;
    onNewUniverseNameChange: (name: string) => void;
    onFranchiseChange: (franchiseId: string | 'NEW' | null) => void;
}

const CONNECTED_PROJECT_INTENTS: ConnectedProjectIntent[] = [
    'AUTO',
    'SOLO',
    'CROSSOVER',
    'EVENT',
    'REBOOT',
];

export const GreenlightStoryConnectionSection: React.FC<GreenlightStoryConnectionSectionProps> = ({
    connectedProjectIntent,
    effectiveConnectedIntent,
    linkedUniverseCastCount,
    showStoryConnectionInfo,
    selectableUniverses,
    selectedUniverseId,
    newUniverseName,
    franchises,
    selectedFranchiseId,
    translate,
    getUniversePhaseLabel,
    onToggleStoryConnectionInfo,
    onConnectedProjectIntentChange,
    onUniverseChange,
    onNewUniverseNameChange,
    onFranchiseChange,
}) => (
    <section className="space-y-6" aria-label="Universe and franchise connection">
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Clapperboard size={16} className="text-emerald-400" /> Story Connection
                    </h3>
                    <button
                        type="button"
                        onClick={onToggleStoryConnectionInfo}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${showStoryConnectionInfo ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-black/30 text-zinc-500 hover:text-white hover:border-zinc-500'}`}
                        aria-label="Explain story connection"
                        aria-expanded={showStoryConnectionInfo}
                    >
                        <Info size={13} />
                    </button>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    {linkedUniverseCastCount} known cast
                </span>
            </div>
            {showStoryConnectionInfo ? (
                <div className="bg-black/35 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                        This tells the game what kind of IP movie you are making, so it can set validation, subtype, continuity risk, and fan expectations.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CONNECTED_PROJECT_INTENTS.map(intent => (
                            <div key={intent} className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                                    {translate(`greenlight.connectedIntent.${intent}.label`)}
                                </p>
                                <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                                    {translate(`greenlight.connectedIntent.${intent}.body`)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {CONNECTED_PROJECT_INTENTS.map(intent => {
                    const isSelected = connectedProjectIntent === intent;
                    const isEffective = effectiveConnectedIntent === intent;
                    return (
                        <button
                            key={intent}
                            type="button"
                            onClick={() => onConnectedProjectIntentChange(intent)}
                            className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 text-white' : isEffective ? 'bg-blue-500/10 border-blue-500/30 text-blue-100' : 'bg-black/25 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'}`}
                            aria-pressed={isSelected}
                        >
                            <div className="text-[10px] font-black uppercase tracking-widest">
                                {translate(`greenlight.connectedIntent.${intent}.label`)}
                            </div>
                            <div className="mt-1 text-[9px] opacity-60 leading-tight">
                                {translate(`greenlight.connectedIntent.${intent}.hint`)}
                            </div>
                        </button>
                    );
                })}
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Current plan: <span className="text-emerald-300">{effectiveConnectedIntent}</span>
                {effectiveConnectedIntent === 'EVENT'
                    ? ' • needs three known characters'
                    : effectiveConnectedIntent === 'CROSSOVER'
                        ? ' • needs one known character'
                        : ''}
            </p>
        </div>

        <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Globe size={16} className="text-blue-400" /> Universe Connection
            </h3>
            {selectedUniverseId ? (
                <button
                    type="button"
                    onClick={() => onUniverseChange(null)}
                    className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest"
                >
                    Disconnect
                </button>
            ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectableUniverses.map(universe => (
                <button
                    key={universe.id}
                    type="button"
                    onClick={() => onUniverseChange(universe.id)}
                    className={`p-4 rounded-xl border text-left transition-all group relative overflow-hidden ${selectedUniverseId === universe.id ? 'bg-zinc-900 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    aria-pressed={selectedUniverseId === universe.id}
                >
                    <div
                        className="absolute top-0 right-0 w-16 h-16 opacity-10 blur-xl pointer-events-none"
                        style={{ backgroundColor: universe.color }}
                    />
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: universe.color }} />
                        <div className="font-black text-xs uppercase tracking-tight">{universe.name}</div>
                    </div>
                    <div className="text-[10px] opacity-60 leading-tight mb-3 line-clamp-2">{universe.description}</div>
                    <div className="flex justify-between items-center mt-auto">
                        <div className="text-[9px] font-bold text-blue-400 uppercase">{getUniversePhaseLabel(universe.currentPhase)}</div>
                        <div className="text-[9px] font-mono text-zinc-500">MOM: {universe.momentum}%</div>
                    </div>
                </button>
            ))}

            <button
                type="button"
                onClick={() => onUniverseChange(selectedUniverseId === 'NEW' ? null : 'NEW')}
                className={`p-4 rounded-xl border text-left transition-all group relative overflow-hidden ${selectedUniverseId === 'NEW' ? 'bg-blue-500/10 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                aria-pressed={selectedUniverseId === 'NEW'}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-blue-400">
                        <Plus size={16} />
                    </div>
                    <div>
                        <div className="font-black text-xs uppercase tracking-tight">Create New Universe</div>
                        <div className="text-[10px] text-zinc-500">Found a new cinematic universe.</div>
                    </div>
                </div>
            </button>
        </div>

        {selectedUniverseId === 'NEW' ? (
            <div className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                <label htmlFor="greenlight-new-universe-name" className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    Universe Name
                </label>
                <input
                    id="greenlight-new-universe-name"
                    type="text"
                    value={newUniverseName}
                    onChange={event => onNewUniverseNameChange(event.target.value)}
                    placeholder="e.g. The Cosmic Saga"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-[10px] text-zinc-500 italic">This will establish a new IP owned by your studio.</p>
            </div>
        ) : null}

        <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-amber-400" /> Franchise Connection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {franchises.map(franchise => (
                    <button
                        key={franchise.id}
                        type="button"
                        onClick={() => onFranchiseChange(franchise.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${selectedFranchiseId === franchise.id ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                        aria-pressed={selectedFranchiseId === franchise.id}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-black text-xs uppercase tracking-tight">{franchise.name}</div>
                            <div className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-bold uppercase">{franchise.genre}</div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <div className="text-[10px] text-zinc-500">Part {franchise.lastInstallment + 1}</div>
                            <div className="text-[10px] text-amber-400 font-bold uppercase">Established</div>
                        </div>
                    </button>
                ))}

                <button
                    type="button"
                    onClick={() => onFranchiseChange(selectedFranchiseId === 'NEW' ? null : 'NEW')}
                    className={`p-4 rounded-xl border text-left transition-all ${selectedFranchiseId === 'NEW' ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    aria-pressed={selectedFranchiseId === 'NEW'}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400">
                            <Plus size={16} />
                        </div>
                        <div>
                            <div className="font-black text-xs uppercase tracking-tight">Start New Franchise</div>
                            <div className="text-[10px] text-zinc-500">Establish this project as a series starter.</div>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => onFranchiseChange(null)}
                    className={`p-4 rounded-xl border text-left transition-all ${selectedFranchiseId === null ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    aria-pressed={selectedFranchiseId === null}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <X size={16} />
                        </div>
                        <div>
                            <div className="font-black text-xs uppercase tracking-tight">Standalone Project</div>
                            <div className="text-[10px] text-zinc-500">No franchise or universe connection.</div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    </section>
);
