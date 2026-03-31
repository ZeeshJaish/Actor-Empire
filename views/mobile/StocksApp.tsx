
import React, { useState } from 'react';
import { Player, Stock } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { calculatePortfolioValue } from '../../services/stockLogic';
import { ArrowLeft, TrendingUp, TrendingDown, PieChart, Activity, DollarSign, Lock, AlertTriangle } from 'lucide-react';

interface StocksAppProps {
  player: Player;
  onBack: () => void;
  onTrade: (stockId: string, amount: number) => void;
}

export const StocksApp: React.FC<StocksAppProps> = ({ player, onBack, onTrade }) => {
  const [tab, setTab] = useState<'MARKET' | 'PORTFOLIO'>('MARKET');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  // Buy/Sell State
  const [sharesInput, setSharesInput] = useState<string>('');
  
  // Helpers
  
  const getHolding = (stockId: string) => player.portfolio.find(p => p.stockId === stockId);
  
  const portfolioValue = calculatePortfolioValue(player.portfolio, player.stocks);
  const cash = player.money;

  const renderStockRow = (stock: Stock) => {
      const history = stock.priceHistory;
      const startPrice = history[0];
      const currentPrice = stock.price;
      const change = currentPrice - startPrice;
      const changePercent = (change / startPrice) * 100;
      const isPositive = change >= 0;
      
      const holding = getHolding(stock.id);

      return (
          <div key={stock.id} onClick={() => { setSelectedStock(stock); setSharesInput(''); }} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between active:bg-zinc-800 transition-colors">
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {stock.symbol}
                  </div>
                  <div>
                      <div className="font-bold text-white text-sm">{stock.name}</div>
                      <div className="text-[10px] text-zinc-500">{stock.sector} {holding && `• ${holding.shares} owned`}</div>
                  </div>
              </div>
              
              <div className="text-right">
                  <div className="font-mono font-bold text-white text-sm">{formatMoney(stock.price)}</div>
                  <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPositive ? <TrendingUp size={10}/> : <TrendingDown size={10}/>} {Math.abs(changePercent).toFixed(1)}%
                  </div>
              </div>
          </div>
      );
  };

  // --- DETAIL VIEW ---
  if (selectedStock) {
      const holding = getHolding(selectedStock.id);
      const inputAmount = parseInt(sharesInput) || 0;
      const cost = inputAmount * selectedStock.price;
      const canAfford = inputAmount > 0 && cost <= player.money;
      const canSell = holding && inputAmount > 0 && inputAmount <= holding.shares;

      // Synergy Check
      const hasSynergy = player.activeSponsorships.some(s => s.brandName === selectedStock.relatedBrandName);

      return (
          <div className="absolute inset-0 bg-black flex flex-col z-50 text-white animate-in slide-in-from-right duration-300">
              <div className="p-4 pt-12 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900">
                  <button onClick={() => setSelectedStock(null)}><ArrowLeft size={20}/></button>
                  <div className="flex-1">
                      <div className="font-bold text-lg">{selectedStock.symbol}</div>
                      <div className="text-xs text-zinc-400">{selectedStock.name}</div>
                  </div>
                  <div className="text-right">
                      <div className="font-bold text-lg">{formatMoney(selectedStock.price)}</div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {/* Chart Placeholder */}
                  <div className="h-40 bg-zinc-900 rounded-2xl mb-6 flex items-end px-2 pb-2 relative overflow-hidden border border-zinc-800">
                      <div className="absolute top-2 left-2 text-[10px] text-zinc-500">12 Week Trend</div>
                      <div className="flex items-end w-full gap-1 h-full">
                          {selectedStock.priceHistory.map((p, i) => {
                              const min = Math.min(...selectedStock.priceHistory) * 0.9;
                              const max = Math.max(...selectedStock.priceHistory) * 1.1;
                              const height = ((p - min) / (max - min)) * 100;
                              return (
                                  <div key={i} className={`flex-1 rounded-t-sm ${i === selectedStock.priceHistory.length - 1 ? 'bg-blue-500' : 'bg-zinc-700'}`} style={{ height: `${height}%` }}></div>
                              )
                          })}
                      </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">Div Yield</div>
                          <div className="font-mono font-bold text-emerald-400">{(selectedStock.dividendYield * 100).toFixed(1)}%</div>
                      </div>
                      <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase">Volatility</div>
                          <div className="font-mono font-bold text-yellow-400">{selectedStock.volatility > 0.04 ? 'HIGH' : 'LOW'}</div>
                      </div>
                  </div>

                  {/* Synergy Badge */}
                  {hasSynergy && (
                      <div className="bg-indigo-900/30 border border-indigo-500/30 p-3 rounded-xl mb-6 flex items-center gap-3">
                          <div className="p-2 bg-indigo-500 rounded-full"><Lock size={12} className="text-white"/></div>
                          <div>
                              <div className="text-xs font-bold text-indigo-300">Partner Stock</div>
                              <div className="text-[10px] text-indigo-400">You are sponsored by this brand.</div>
                          </div>
                      </div>
                  )}

                  {/* Position */}
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6">
                      <div className="text-xs text-zinc-500 uppercase font-bold mb-2">Your Position</div>
                      {holding ? (
                          <div className="flex justify-between items-end">
                              <div>
                                  <div className="text-2xl font-mono font-bold text-white">{holding.shares}</div>
                                  <div className="text-[10px] text-zinc-400">Shares</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-emerald-400 font-mono font-bold">{formatMoney(holding.shares * selectedStock.price)}</div>
                                  <div className="text-[10px] text-zinc-400">Value</div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-sm text-zinc-600 italic">You own no shares.</div>
                      )}
                  </div>

                  {/* Trade Controls */}
                  <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                      <div className="text-xs text-zinc-500 uppercase font-bold mb-3">Trade</div>
                      <div className="flex gap-2 mb-3">
                          <input 
                            type="number" 
                            placeholder="Shares" 
                            value={sharesInput}
                            onChange={(e) => setSharesInput(e.target.value)}
                            className="flex-1 bg-black border border-zinc-700 rounded-lg p-3 text-white font-mono focus:outline-none focus:border-blue-500"
                          />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-4">
                          <span>Est. Value: <span className="text-white font-mono">{formatMoney(isNaN(cost) ? 0 : cost)}</span></span>
                          <span>Cash: <span className="text-white font-mono">{formatMoney(player.money)}</span></span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                            className={`py-3 rounded-xl font-bold text-sm ${!canSell ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                            disabled={!canSell}
                            onClick={() => {
                                if (canSell) {
                                    onTrade(selectedStock.id, -inputAmount);
                                    setSharesInput('');
                                }
                            }}
                          >
                              Sell
                          </button>
                          <button 
                            className={`py-3 rounded-xl font-bold text-sm ${!canAfford ? 'bg-blue-900/50 text-blue-300/50' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                            disabled={!canAfford}
                            onClick={() => {
                                if (canAfford) {
                                    onTrade(selectedStock.id, inputAmount);
                                    setSharesInput('');
                                }
                            }}
                          >
                              Buy
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN LIST ---
  return (
    <div className="absolute inset-0 bg-black flex flex-col z-40 text-white animate-in slide-in-from-right duration-300 font-sans">
        <div className="bg-zinc-900 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 border-b border-zinc-800">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-2 text-emerald-500 font-bold tracking-widest uppercase">
                <Activity size={20}/> STOCKS
            </div>
            <div className="w-8"></div>
        </div>

        {/* Portfolio Summary */}
        <div className="p-6 bg-zinc-900 border-b border-zinc-800">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Total Portfolio Value</div>
            <div className="text-4xl font-mono font-bold text-white mb-4">{formatMoney(portfolioValue)}</div>
            <div className="flex gap-4">
                <div className="flex-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase">Cash Available</div>
                    <div className="font-mono text-zinc-300 text-sm font-bold">{formatMoney(cash)}</div>
                </div>
                <div className="flex-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase">Yield (Est)</div>
                    <div className="font-mono text-emerald-400 text-sm font-bold">+${(calculatePortfolioValue(player.portfolio, player.stocks) * 0.02).toFixed(0)}/yr</div>
                </div>
            </div>
        </div>

        <div className="flex bg-zinc-950 border-b border-zinc-800">
            <button onClick={() => setTab('MARKET')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'MARKET' ? 'text-white border-b-2 border-white' : 'text-zinc-600'}`}>Market</button>
            <button onClick={() => setTab('PORTFOLIO')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'PORTFOLIO' ? 'text-white border-b-2 border-white' : 'text-zinc-600'}`}>Portfolio</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            {tab === 'MARKET' && player.stocks.map(stock => renderStockRow(stock))}
            
            {tab === 'PORTFOLIO' && (
                player.portfolio.length === 0 ? (
                    <div className="text-center text-zinc-600 mt-10 text-sm">You have no investments.</div>
                ) : (
                    player.portfolio.map(item => {
                        const stock = player.stocks.find(s => s.id === item.stockId);
                        if (!stock) return null;
                        return renderStockRow(stock);
                    })
                )
            )}
        </div>
    </div>
  );
};
