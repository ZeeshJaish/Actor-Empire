import React from 'react';
import { Page, Player } from '../types';
import { getPlayerLanguage, t } from '../services/i18n';
import { Icon, IconName, Style } from './ui-overhaul/ui';

interface BottomNavProps {
  player: Player;
  activePage: Page;
  setPage: (page: Page) => void;
  unreadMessages?: number;
}

const NAV_CSS = `
.ae-live-dock{
  --gold:#f8a810;--line:rgba(255,255,255,.095);--ghost:rgba(249,246,239,.22);--alert:#ff5c5c;
  position:fixed;left:0;right:0;bottom:0;z-index:50;padding:0 16px calc(12px + env(safe-area-inset-bottom));pointer-events:none;
}
.ae-live-dock::before{content:"";position:absolute;left:0;right:0;bottom:0;height:104px;pointer-events:none;background:linear-gradient(180deg,rgba(7,6,5,0),#070605 64%);}
.ae-live-nav{
  position:relative;width:100%;max-width:398px;height:60px;margin:0 auto;border-radius:20px;overflow:hidden;
  display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-items:center;pointer-events:auto;
  background:rgba(19,18,16,.9);-webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);
  box-shadow:inset 0 0 0 1px var(--line),0 20px 42px -24px #000;
}
.ae-live-nav-ind{position:absolute;inset:0 auto 0 0;width:16.6667%;pointer-events:none;transition:transform .42s cubic-bezier(.34,1.24,.4,1);}
.ae-live-nav-ind::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:22px;height:2px;border-radius:0 0 2px 2px;background:var(--gold);box-shadow:0 0 12px var(--gold),0 0 26px rgba(248,168,16,.42);}
.ae-live-nav-ind::after{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:58px;height:34px;background:radial-gradient(50% 100% at 50% 0%,rgba(248,168,16,.26),transparent 72%);}
.ae-live-nav button{position:relative;height:100%;display:grid;place-items:center;color:var(--ghost);background:transparent;border:0;padding:0;cursor:pointer;transition:color .2s ease;-webkit-tap-highlight-color:transparent;}
.ae-live-nav button.is-on{color:var(--gold);}
.ae-live-nav button>svg{transition:transform .2s cubic-bezier(.2,.8,.2,1);}
.ae-live-nav button:active>svg{transform:scale(.86);}
.ae-live-badge{position:absolute;top:10px;right:calc(50% - 21px);min-width:17px;height:17px;padding:0 5px;border-radius:9px;display:grid;place-items:center;font-size:9px;font-weight:800;color:#fff;background:var(--alert);box-shadow:0 0 0 2px rgba(19,18,16,.96);}
@media (prefers-reduced-motion:reduce){.ae-live-dock *,.ae-live-dock *::before,.ae-live-dock *::after{animation:none!important;transition:none!important;}}
`;

export const BottomNav: React.FC<BottomNavProps> = ({ player, activePage, setPage, unreadMessages = 0 }) => {
  const language = getPlayerLanguage(player);
  const navItems: Array<{ page: Page; icon: IconName; label: string }> = [
    { page: Page.HOME, icon: 'home', label: t(language, 'nav.home') },
    { page: Page.CAREER, icon: 'briefcase', label: t(language, 'nav.career') },
    { page: Page.IMPROVE, icon: 'dumbbell', label: t(language, 'nav.improve') },
    { page: Page.SOCIAL, icon: 'users', label: t(language, 'nav.social') },
    { page: Page.LIFESTYLE, icon: 'bag', label: t(language, 'nav.lifestyle') },
    { page: Page.MOBILE, icon: 'phone', label: t(language, 'nav.mobile') },
  ];
  const activeIndex = Math.max(0, navItems.findIndex(item => item.page === activePage));

  return (
    <div className="ae-live-dock" data-ui="actor-empire-navigation-overhaul">
      <Style css={NAV_CSS} />
      <nav className="ae-live-nav" aria-label="Primary game navigation">
        <span className="ae-live-nav-ind" style={{ transform: `translateX(${activeIndex * 100}%)` }} aria-hidden="true" />
        {navItems.map(item => {
          const isActive = activePage === item.page;
          const badgeCount = item.page === Page.MOBILE ? unreadMessages : 0;
          return (
            <button
              key={item.page}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              data-tutorial-id={`nav-${String(item.page).toLowerCase()}`}
              className={isActive ? 'is-on' : undefined}
              onClick={() => setPage(item.page)}
            >
              <Icon name={item.icon} size={20} sw={1.75} />
              {badgeCount > 0 && <span className="ae-live-badge">{badgeCount > 9 ? '9+' : badgeCount}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
