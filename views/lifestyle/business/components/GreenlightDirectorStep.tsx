import React from 'react';
import { Clock, Video } from 'lucide-react';
import { type Player } from '../../../../types';
import { GreenlightCrewSelector } from './GreenlightCrewSelector';

interface GreenlightDirectorStepProps {
    availableDirectors: any[];
    selectedDirectorId: string | null;
    onSelectDirector: (directorId: string) => void;
    directorMode: 'HIRE' | 'SELF' | 'IN_HOUSE';
    onDirectorModeChange: (mode: 'HIRE' | 'SELF' | 'IN_HOUSE') => void;
    player: Player;
    hiredIds: string[];
    inHouseQuality: number;
    inHouseFame: number;
    inHouseLevel: number;
    returningTalent?: any[];
    onNegotiate: (talentId: string, returningData: any) => void;
    formatMoney: (value: number) => string;
    isExistingConcept: boolean;
    onBack: () => void;
    onNext: () => void;
}

export const GreenlightDirectorStep: React.FC<GreenlightDirectorStepProps> = ({
    availableDirectors,
    selectedDirectorId,
    onSelectDirector,
    directorMode,
    onDirectorModeChange,
    player,
    hiredIds,
    inHouseQuality,
    inHouseFame,
    inHouseLevel,
    returningTalent,
    onNegotiate,
    formatMoney,
    isExistingConcept,
    onBack,
    onNext,
}) => {
    const requiresSelection = directorMode === 'HIRE' && !selectedDirectorId;

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto px-4 pt-6 pb-44">
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-6 mb-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-2">Hire a Director</h2>
                <p className="text-zinc-400 text-sm">The visionary who will lead your project. Choose wisely—their style affects the movie's outcome.</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                    <Clock size={12} />
                    Roster refreshes every 3 weeks
                </div>
            </div>

            <GreenlightCrewSelector
                title="Director"
                icon={<Video size={16} />}
                role="DIRECTOR"
                candidates={availableDirectors}
                selectedId={selectedDirectorId}
                onSelect={onSelectDirector}
                mode={directorMode}
                onModeChange={onDirectorModeChange}
                player={player}
                hiredIds={hiredIds}
                inHouseQuality={inHouseQuality}
                inHouseFame={inHouseFame}
                inHouseLevel={inHouseLevel}
                returningTalent={returningTalent}
                onNegotiate={onNegotiate}
                formatMoney={formatMoney}
            />

            <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe-lg bg-gradient-to-t from-[#020a05] via-[#020a05]/90 to-transparent pointer-events-none flex justify-center z-30">
                <div className="pointer-events-auto flex gap-4 w-full max-w-md">
                    <button type="button" onClick={onBack} className="flex-1 bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl border border-zinc-700 backdrop-blur-md transition-colors">
                        {isExistingConcept ? 'Exit' : 'Back'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (requiresSelection) return;
                            onNext();
                        }}
                        disabled={requiresSelection}
                        className={`flex-[2] font-black uppercase tracking-wider py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105 ${
                            requiresSelection
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                        }`}
                    >
                        Next: Casting
                    </button>
                </div>
            </div>
        </div>
    );
};
