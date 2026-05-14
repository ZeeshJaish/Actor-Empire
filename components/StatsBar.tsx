import React from 'react';

interface StatsBarProps {
  label: string;
  value: number; // 0-100
  color: string;
  icon?: React.ReactNode;
}

export const StatsBar: React.FC<StatsBarProps> = ({ label, value, color, icon }) => {
  const safeValue = isNaN(value) || value === undefined ? 0 : value;
  return (
    <div className="mb-3 group min-w-0">
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-widest">
        <span className="min-w-0 flex items-center gap-1.5 group-hover:text-white transition-colors">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-mono opacity-80">{Math.round(safeValue)}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800/60 rounded-full overflow-hidden border border-white/5">
        <div 
          className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,0,0,0.3)] ${color}`} 
          style={{ width: `${Math.max(0, Math.min(100, safeValue))}%` }}
        />
      </div>
    </div>
  );
};
