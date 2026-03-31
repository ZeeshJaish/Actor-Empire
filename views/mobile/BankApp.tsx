
import React, { useState, useMemo } from 'react';
import { Player, Transaction } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, PieChart, Landmark, DollarSign, CreditCard, ChevronDown, Shield, AlertCircle } from 'lucide-react';

interface BankAppProps {
  player: Player;
  onBack: () => void;
}

export const BankApp: React.FC<BankAppProps> = ({ player, onBack }) => {
  const [tab, setTab] = useState<'OVERVIEW' | 'BREAKDOWN' | 'HISTORY'>('OVERVIEW');
  const [selectedYear, setSelectedYear] = useState<number>(player.age);
  const [showYearMenu, setShowYearMenu] = useState(false);

  // --- DATA PREPARATION ---
  
  // Available Years: Current Age + All years in history
  const availableYears = useMemo(() => {
      const historyYears = player.finance.yearly.map(y => y.year);
      return [player.age, ...historyYears].sort((a, b) => b - a);
  }, [player.age, player.finance.yearly]);

  // Get Data for Selected Year
  const yearData = useMemo(() => {
      // If Current Year (YTD)
      if (selectedYear === player.age) {
          const ytdTx = player.finance.history.filter(t => t.year === selectedYear);
          const income = ytdTx.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
          const expense = ytdTx.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
          
          const breakdown = ['SALARY', 'ROYALTY', 'SPONSORSHIP', 'DIVIDEND', 'BUSINESS'].map(cat => {
              const amount = ytdTx.filter(t => t.amount > 0 && t.category === cat).reduce((sum, t) => sum + t.amount, 0);
              return { label: cat, amount, percent: income > 0 ? (amount / income) * 100 : 0 };
          }).sort((a, b) => b.amount - a.amount);

          return { income, expense, breakdown, history: ytdTx };
      } 
      // If Past Year
      else {
          const record = player.finance.yearly.find(y => y.year === selectedYear);
          const income = record?.totalIncome || 0;
          const expense = record?.totalExpenses || 0;
          
          const breakdown = ['SALARY', 'ROYALTY', 'SPONSORSHIP', 'DIVIDEND', 'BUSINESS'].map(cat => {
              const amount = record?.incomeByCategory[cat as any] || 0;
              return { label: cat, amount, percent: income > 0 ? (amount / income) * 100 : 0 };
          }).sort((a, b) => b.amount - a.amount);

          // We still filter main history for the list, assuming history isn't truncated too aggressively
          // If history is truncated, this might be empty for old years, which is acceptable for a "sim"
          const hist = player.finance.history.filter(t => t.year === selectedYear);
          
          return { income, expense, breakdown, history: hist };
      }
  }, [selectedYear, player.finance, player.age]);

  const netIncome = yearData.income - yearData.expense;
  const savingsRate = yearData.income > 0 ? ((yearData.income - yearData.expense) / yearData.income) * 100 : 0;

  // Fake Credit Score Calculation
  const creditScore = Math.min(850, 300 + Math.floor(player.money / 1000) + (player.stats.reputation * 2));
  const creditLabel = creditScore >= 800 ? 'Excellent' : creditScore >= 740 ? 'Very Good' : creditScore >= 670 ? 'Good' : 'Fair';
  const creditColor = creditScore >= 740 ? 'text-emerald-400' : creditScore >= 670 ? 'text-blue-400' : 'text-yellow-400';


  return (
    <div className="absolute inset-0 bg-zinc-950 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 font-sans">
        
        {/* HEADER */}
        <div className="bg-[#004b87] p-4 pt-12 pb-6 shadow-xl flex flex-col relative overflow-hidden shrink-0 transition-all">
            {/* Top Bar */}
            <div className="flex justify-between items-start relative z-20 mb-4">
                <button onClick={onBack} className="text-white/80 hover:text-white p-1 bg-black/10 rounded-full"><ArrowLeft size={20}/></button>
                <div className="flex flex-col items-end">
                    <button 
                        onClick={() => setShowYearMenu(!showYearMenu)}
                        className="flex items-center gap-1 bg-black/20 hover:bg-black/30 px-3 py-1 rounded-full text-xs font-bold transition-colors"
                    >
                        {selectedYear === player.age ? `Current Year (${selectedYear})` : `Year ${selectedYear}`} <ChevronDown size={14}/>
                    </button>
                    {showYearMenu && (
                        <div className="absolute top-10 right-0 bg-white text-slate-900 rounded-xl shadow-2xl py-2 w-32 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                            {availableYears.map(y => (
                                <button 
                                    key={y}
                                    onClick={() => { setSelectedYear(y); setShowYearMenu(false); }}
                                    className={`px-4 py-2 text-xs font-bold text-left hover:bg-slate-100 ${selectedYear === y ? 'text-blue-600 bg-blue-50' : ''}`}
                                >
                                    {y === player.age ? `Current (${y})` : `Year ${y}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Balance Card */}
            <div className="relative z-10">
                <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Total Liquid Assets</div>
                {/* Responsive Font Size for large numbers */}
                <div className={`font-mono font-bold text-white tracking-tight leading-none ${player.money > 99999999 ? 'text-3xl' : 'text-4xl'}`}>
                    {formatMoney(player.money)}
                </div>
            </div>

            {/* Decorative */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-20 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-30">
            <button onClick={() => setTab('OVERVIEW')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${tab === 'OVERVIEW' ? 'text-blue-400 border-b-2 border-blue-400 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Wallet size={14}/> Overview
            </button>
            <button onClick={() => setTab('BREAKDOWN')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${tab === 'BREAKDOWN' ? 'text-blue-400 border-b-2 border-blue-400 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <PieChart size={14}/> Breakdown
            </button>
            <button onClick={() => setTab('HISTORY')} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-2 ${tab === 'HISTORY' ? 'text-blue-400 border-b-2 border-blue-400 bg-zinc-900' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <CreditCard size={14}/> History
            </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-4">
            
            {tab === 'OVERVIEW' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    
                    {/* Financial Health / Credit */}
                    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                                <Shield size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Credit Score</div>
                                <div className={`text-lg font-bold ${creditColor}`}>{creditScore} <span className="text-sm font-normal text-zinc-500">• {creditLabel}</span></div>
                            </div>
                        </div>
                        <div className="h-10 w-10 relative">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <path className={`${creditScore >= 740 ? 'text-emerald-500' : 'text-blue-500'}`} strokeDasharray={`${(creditScore/850)*100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            </svg>
                        </div>
                    </div>

                    {/* Cash Flow Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Income ({selectedYear})</div>
                                <div className="text-lg font-bold text-emerald-400 truncate">{formatMoney(yearData.income)}</div>
                            </div>
                            <TrendingUp size={48} className="absolute -bottom-2 -right-2 text-emerald-500/5 z-0" />
                        </div>
                        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Expenses ({selectedYear})</div>
                                <div className="text-lg font-bold text-rose-400 truncate">-{formatMoney(yearData.expense)}</div>
                            </div>
                            <TrendingDown size={48} className="absolute -bottom-2 -right-2 text-rose-500/5 z-0" />
                        </div>
                    </div>

                    {/* Net Income & Savings */}
                    <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Net Income</div>
                            <div className={`font-mono font-bold ${netIncome >= 0 ? 'text-white' : 'text-rose-400'}`}>{netIncome >= 0 ? '+' : ''}{formatMoney(netIncome)}</div>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                            <div className={`h-full ${netIncome >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.abs(savingsRate))}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Savings Rate</span>
                            <span>{savingsRate.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Loans / Liabilities (Future Proofing) */}
                    <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-6 text-center">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-500">
                            <Landmark size={20} />
                        </div>
                        <h3 className="text-white font-bold text-sm mb-1">No Active Loans</h3>
                        <p className="text-zinc-500 text-xs">You have no outstanding debts or mortgages.</p>
                        {/* Placeholder button for future */}
                        <button disabled className="mt-4 px-4 py-2 bg-zinc-800 text-zinc-600 rounded-lg text-xs font-bold cursor-not-allowed">Apply for Loan (Coming Soon)</button>
                    </div>
                </div>
            )}

            {tab === 'BREAKDOWN' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Income Sources ({selectedYear})</h3>
                        <div className="text-xs font-mono text-emerald-400 font-bold">+{formatMoney(yearData.income)}</div>
                    </div>
                    
                    <div className="space-y-3">
                        {yearData.breakdown.map((cat) => (
                            <div key={cat.label} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${cat.amount > 0 ? 'bg-blue-500' : 'bg-zinc-700'}`}></div>
                                        <span className="text-sm font-bold text-zinc-300 capitalize">{cat.label.toLowerCase()}</span>
                                    </div>
                                    <span className="text-sm font-mono text-white font-bold">{formatMoney(cat.amount)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${cat.label === 'ROYALTY' ? 'bg-amber-500' : cat.label === 'SALARY' ? 'bg-blue-500' : cat.label === 'SPONSORSHIP' ? 'bg-emerald-500' : 'bg-purple-500'}`} 
                                        style={{ width: `${cat.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {yearData.income === 0 && <div className="text-center text-zinc-600 text-sm py-10">No income recorded for {selectedYear}.</div>}
                </div>
            )}

            {tab === 'HISTORY' && (
                <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Transactions • {selectedYear}</div>
                    {yearData.history.length === 0 ? (
                        <div className="text-center text-zinc-600 text-sm py-10 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
                            No transaction history available for this period.
                        </div>
                    ) : (
                        yearData.history.map((tx) => (
                            <div key={tx.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center group hover:bg-zinc-800 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {tx.amount > 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm truncate max-w-[150px] sm:max-w-[200px]">{tx.description}</div>
                                        <div className="text-[10px] text-zinc-500">Wk {tx.week} • {tx.category}</div>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                    {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

        </div>
    </div>
  );
};
