import React from 'react';
import { CheckCircle } from 'lucide-react';

interface GameToastProps {
  title: string;
  subtext: string;
}

export const GameToast: React.FC<GameToastProps> = ({ title, subtext }) => (
  <div role="status" className="fixed left-1/2 top-6 z-[60] flex min-w-[300px] -translate-x-1/2 items-center gap-4 rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-white shadow-2xl animate-in slide-in-from-top fade-in duration-300">
    <div className="rounded-full bg-emerald-500 p-1"><CheckCircle size={20} className="text-black" strokeWidth={3} /></div>
    <div><div className="text-sm font-bold">{title}</div><div className="text-xs text-zinc-400">{subtext}</div></div>
  </div>
);
