import React from 'react';
import { Home, Briefcase, Dumbbell, Users, ShoppingBag, Smartphone } from 'lucide-react';
import { Page } from '../types';

interface BottomNavProps {
  activePage: Page;
  setPage: (page: Page) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, setPage }) => {
  const navItems = [
    { page: Page.HOME, icon: Home, label: 'Home' },
    { page: Page.CAREER, icon: Briefcase, label: 'Career' },
    { page: Page.IMPROVE, icon: Dumbbell, label: 'Improve' },
    { page: Page.SOCIAL, icon: Users, label: 'Social' },
    { page: Page.LIFESTYLE, icon: ShoppingBag, label: 'Lifestyle' },
    { page: Page.MOBILE, icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="glass-card rounded-2xl flex justify-around items-center h-16 shadow-2xl shadow-black/50 pointer-events-auto">
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                    isActive ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-amber-400/50 blur-md rounded-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''}`} />
                  {isActive && <span className="absolute -bottom-1 w-1 h-1 bg-amber-400 rounded-full"></span>}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};