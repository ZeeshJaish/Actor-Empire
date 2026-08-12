import React from 'react';
import { Crown, X } from 'lucide-react';
import { type Player } from '../../../../types';

interface GreenlightTalentPickerModalProps {
    roleId: string;
    player: Player;
    playerActingTalent: number;
    castList: any[];
    contractedActors: any[];
    hiredIds: string[];
    availableActors: any[];
    returningTalent: any[];
    calculateActorSalary: (actor: any, roleType: any, closeness?: number) => number;
    formatMoney: (value: number) => string;
    onSelectActor: (actorId: string, actorName: string, salary: number) => void;
    onNegotiate: (talentId: string, returningData: any, roleId: string) => void;
    onClose: () => void;
}

const getReturningActor = (returningTalent: any[], actorId: string) => (
    returningTalent.find(talent => talent.id === actorId && (talent.role === 'LEAD_ACTOR' || talent.role === 'SUPPORTING_ACTOR'))
);

export const GreenlightTalentPickerModal: React.FC<GreenlightTalentPickerModalProps> = ({
    roleId,
    player,
    playerActingTalent,
    castList,
    contractedActors,
    hiredIds,
    availableActors,
    returningTalent,
    calculateActorSalary,
    formatMoney,
    onSelectActor,
    onNegotiate,
    onClose,
}) => {
    const currentRole = castList.find(role => role.id === roleId);
    const currentActorId = currentRole?.actorId;
    const roleType = currentRole?.roleType || 'SUPPORTING';

    return (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <h3 className="font-bold text-white">Select Actor</h3>
                    <button type="button" onClick={onClose} aria-label="Close actor selection" className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">You</div>
                        <button
                            type="button"
                            onClick={() => onSelectActor('PLAYER_SELF', player.name, 0)}
                            className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-left flex justify-between items-center transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/50">
                                    <Crown size={20} className="text-amber-500" />
                                </div>
                                <div>
                                    <div className="font-bold text-white group-hover:text-amber-400 transition-colors">{player.name}</div>
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Acting Talent: {Math.round(playerActingTalent || 0)}</div>
                                </div>
                            </div>
                            <div className="text-right"><div className="font-mono font-bold text-emerald-400">Free</div></div>
                        </button>
                    </div>

                    {contractedActors.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">Studio Roster</div>
                            {contractedActors
                                .filter(actor => !hiredIds.includes(actor.id) || actor.id === currentActorId)
                                .map(actor => (
                                    <button
                                        type="button"
                                        key={actor.id}
                                        onClick={() => onSelectActor(actor.id, actor.name, 0)}
                                        className="w-full p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-left flex justify-between items-center transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-emerald-500/50">
                                                <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{actor.name}</div>
                                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{actor.tier} • Talent: {Math.round(actor.stats?.talent || 0)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right"><div className="font-mono font-bold text-emerald-400">Contracted</div></div>
                                    </button>
                                ))}
                        </div>
                    )}

                    {player.relationships.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">Connections (Nepotism)</div>
                            {player.relationships
                                .filter(relationship => {
                                    const npcId = relationship.npcId || relationship.id;
                                    const connectedActor = availableActors.find(actor => actor.id === npcId);
                                    return Boolean(connectedActor) && (!hiredIds.includes(npcId) || npcId === currentActorId);
                                })
                                .map(relationship => {
                                    const actorId = relationship.npcId || relationship.id;
                                    const connectedActor = availableActors.find(actor => actor.id === actorId);
                                    const returningData = getReturningActor(returningTalent, actorId);
                                    const isReturning = Boolean(returningData);
                                    const walkedAway = isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0;
                                    const salary = connectedActor ? calculateActorSalary(connectedActor, roleType, relationship.closeness) : 0;

                                    return (
                                        <button
                                            type="button"
                                            key={relationship.id}
                                            onClick={() => {
                                                if (walkedAway) return;
                                                onSelectActor(actorId, relationship.name, salary);
                                            }}
                                            className={`w-full p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-left flex justify-between items-center transition-all group ${walkedAway ? 'opacity-50 cursor-not-allowed bg-red-900/10 border-red-900/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-purple-500/50">
                                                    <img src={relationship.image} alt={relationship.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                                                        {relationship.name}
                                                        {isReturning && <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">Returning</span>}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                        {relationship.relation} • Closeness: {relationship.closeness}
                                                        {connectedActor && ` • Talent: ${Math.round(connectedActor.stats?.talent || 0)}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {isReturning && !returningData?.accepted && returningData?.attemptsLeft > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={event => {
                                                            event.stopPropagation();
                                                            onNegotiate(actorId, returningData, roleId);
                                                        }}
                                                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/40 transition-colors"
                                                    >
                                                        Negotiate
                                                    </button>
                                                ) : walkedAway ? (
                                                    <span className="text-red-500 text-xs uppercase tracking-wider">Walked Away</span>
                                                ) : (
                                                    <div className="font-mono font-bold text-emerald-400">Discounted</div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase px-2">Talent Pool</div>
                        {availableActors
                            .filter(actor => (!hiredIds.includes(actor.id) || actor.id === currentActorId) && !contractedActors.some(contracted => contracted.id === actor.id))
                            .map(actor => {
                                const salary = calculateActorSalary(actor, roleType);
                                const returningData = getReturningActor(returningTalent, actor.id);
                                const isReturning = Boolean(returningData);
                                const walkedAway = isReturning && !returningData?.accepted && returningData?.attemptsLeft === 0;

                                return (
                                    <button
                                        type="button"
                                        key={actor.id}
                                        onClick={() => {
                                            if (walkedAway) return;
                                            onSelectActor(actor.id, actor.name, salary);
                                        }}
                                        className={`w-full p-3 bg-black/20 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left flex justify-between items-center transition-all group ${walkedAway ? 'opacity-50 cursor-not-allowed bg-red-900/10 border-red-900/30' : 'hover:border-emerald-500/30'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 group-hover:border-emerald-500/50 transition-colors">
                                                <img src={actor.avatar} alt={actor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                                    {actor.name}
                                                    {returningTalent.some(talent => talent.id === actor.id) && <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">Returning</span>}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                    {actor.tier.replace('_', ' ')} • Fame: {Math.round(actor.stats?.fame || 0)} • Talent: {Math.round(actor.stats?.talent || 0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-emerald-400 font-mono text-sm font-bold">
                                            {isReturning && !returningData?.accepted && returningData?.attemptsLeft > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={event => {
                                                        event.stopPropagation();
                                                        onNegotiate(actor.id, returningData, roleId);
                                                    }}
                                                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/40 transition-colors"
                                                >
                                                    Negotiate
                                                </button>
                                            ) : walkedAway ? (
                                                <span className="text-red-500 text-xs uppercase tracking-wider">Walked Away</span>
                                            ) : (
                                                formatMoney(salary)
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            </div>
        </div>
    );
};
