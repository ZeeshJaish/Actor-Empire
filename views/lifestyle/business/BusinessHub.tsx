
import React from 'react';
import { Player, Business } from '../../../types';
import { formatMoney } from '../../../services/formatUtils';
import { ArrowLeft, Plus, Rocket, TrendingUp, Store, Wallet } from 'lucide-react';

interface BusinessHubProps {
    player: Player;
    onBack: () => void;
    onSelectBusiness: (id: string) => void;
    onStartWizard: () => void;
}

export const BusinessHub: React.FC<BusinessHubProps> = ({ player, onBack, onSelectBusiness, onStartWizard }) => {

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20 pt-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="bg-zinc-900 p-2 rounded-full hover:bg-zinc-800"><ArrowLeft size={20}/></button>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Empire</h2>
                </div>
                {player.businesses.length > 0 && (
                    <button onClick={onStartWizard} className="bg-white text-black p-2 rounded-full hover:bg-zinc-200">
                        <Plus size={24} />
                    </button>
                )}
            </div>

            {player.businesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
                    <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2">
                        <Rocket size={48} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Build Your Legacy</h3>
                        <p className="text-zinc-400 text-sm max-w-xs mx-auto">Start a side hustle or build a global conglomerate. The choice is yours.</p>
                    </div>
                    <button onClick={onStartWizard} className="w-full py-4 bg-white text-black font-bold rounded-xl shadow-xl hover:scale-[1.02] transition-transform">
                        Start First Venture
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {player.businesses.map(b => (
                        <div key={b.id} onClick={() => onSelectBusiness(b.id)} className="group relative bg-zinc-900 border border-zinc-800 p-5 rounded-[2rem] hover:border-zinc-700 transition-all cursor-pointer overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp size={80} />
                            </div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-3xl border border-zinc-800 shadow-inner">
                                        {b.logo}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-white leading-tight">{b.name}</h3>
                                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">{b.subtype.replace('_', ' ')}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-mono font-bold ${b.stats.weeklyProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                        {b.stats.weeklyProfit >= 0 ? '+' : ''}{formatMoney(b.stats.weeklyProfit)}
                                    </div>
                                    <div className="text-[10px] text-zinc-600 font-bold uppercase">Weekly Net</div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
                                <span className="flex items-center gap-1"><Store size={12}/> {b.stats.locations} Location{b.stats.locations! > 1 ? 's' : ''}</span>
                                <span className="flex items-center gap-1"><Wallet size={12}/> {formatMoney(b.balance)} Cash</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
