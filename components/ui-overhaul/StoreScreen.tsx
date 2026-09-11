import React, { useState } from 'react';
import type { ActorSkills, Genre } from '../../types';
import type { PremiumProductId } from '../../services/premiumLogic';
import type { StoreUiGroup, StoreUiProduct } from '../../services/storeUiAdapter';
import { BASE_CSS } from './theme';
import { Icon, Style, cssVar } from './ui';

type StoreTab = 'REWARDS' | 'PREMIUM';
type RewardType = 'REWARDED_CASH' | 'REWARDED_ENERGY' | 'REWARDED_STATS' | 'REWARDED_SKILL' | 'REWARDED_GENRE';

export interface StoreScreenCopy {
  premiumTab: string;
  restore: string;
  owned: string;
  add: string;
  unlock: string;
  confirmTitle: string;
  confirmBuyPrefix: string;
  chargePrefix: string;
  chargeSuffix: string;
  rewardAfterConfirm: string;
  cancel: string;
  continue: string;
}

interface StoreScreenProps {
  money: string;
  bonusBank: number;
  readyEnergy: number;
  groups: StoreUiGroup[];
  showPremium: boolean;
  premiumNote: string;
  skills: Array<keyof ActorSkills>;
  genres: Genre[];
  formatGenre: (genre: Genre) => string;
  copy: StoreScreenCopy;
  onBack: () => void;
  onWatchAd: (type: RewardType, data?: keyof ActorSkills | Genre) => void;
  onBuy: (productId: PremiumProductId) => void;
  onRestore: () => void;
}

const CSS = `
.store-overhaul .st-head{display:flex;align-items:center;gap:12px;margin-bottom:15px}.store-overhaul .st-back{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;color:var(--dim);background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line);transition:transform .12s ease}.store-overhaul .st-back:active{transform:scale(.92);color:var(--ink)}.store-overhaul .st-head h1{flex:1;min-width:0}.store-overhaul .st-money{flex:none;display:flex;align-items:center;gap:6px;padding:9px 13px;border-radius:12px;font-size:13px;font-weight:800;letter-spacing:-.02em;color:var(--money);background:color-mix(in srgb,var(--money) 11%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--money) 26%,transparent)}
.store-overhaul .st-res{display:flex;align-items:center;gap:13px;padding:14px;border-radius:19px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.store-overhaul .st-res-i{width:40px;height:40px;flex:none;border-radius:14px;display:grid;place-items:center;color:var(--gold-hi);background:rgba(248,168,16,.11);box-shadow:inset 0 0 0 1px rgba(248,168,16,.24)}.store-overhaul .st-res-t{flex:1;min-width:0}.store-overhaul .st-res-n{display:block;margin-top:6px;font-size:11px;font-weight:650;line-height:1.45;color:var(--faint)}.store-overhaul .st-res-v{display:flex;align-items:baseline;gap:16px;margin-top:5px}.store-overhaul .st-res-v span{font-size:8px;font-weight:800;letter-spacing:.16em;color:var(--faint)}.store-overhaul .st-res-v b{font-size:20px;font-weight:800;letter-spacing:-.04em;line-height:1;margin-left:5px}
.store-overhaul .st-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;margin-top:13px;padding:4px;border-radius:16px;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px var(--hair)}.store-overhaul .st-tab{display:flex;align-items:center;justify-content:center;gap:6px;height:38px;border-radius:12px;font-size:9.5px;font-weight:800;letter-spacing:.11em;color:var(--faint);transition:color .2s ease,background .2s ease,box-shadow .2s ease}.store-overhaul .st-tab.is-on{color:var(--gold-hi);background:rgba(248,168,16,.12);box-shadow:inset 0 0 0 1px var(--line-on)}
.store-overhaul .st-restore{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:44px;margin-top:9px;border-radius:14px;font-size:12px;font-weight:750;color:var(--dim);background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px var(--line)}
.store-overhaul .st-ads{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}.store-overhaul .st-ad{position:relative;padding:14px;border-radius:18px;text-align:left;background:color-mix(in srgb,var(--c) 7%,var(--card));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 22%,transparent);transition:transform .12s ease}.store-overhaul .st-ad:active{transform:scale(.98)}.store-overhaul .st-ad-i{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 28%,transparent)}.store-overhaul .st-tag{position:absolute;top:13px;right:13px;padding:3px 7px;border-radius:6px;font-size:8px;font-weight:800;letter-spacing:.14em;color:var(--faint);background:rgba(255,255,255,.07)}.store-overhaul .st-ad-n{display:block;margin-top:14px;font-size:16px;font-weight:800;letter-spacing:-.03em;line-height:1.15}.store-overhaul .st-ad-d{display:block;margin-top:5px;font-size:11px;font-weight:650;line-height:1.4;color:var(--faint)}
.store-overhaul .st-boost{margin-top:9px;padding:14px;border-radius:19px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.store-overhaul .st-boost-h{display:flex;align-items:center;gap:12px}.store-overhaul .st-boost-i{width:44px;height:44px;flex:none;border-radius:15px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 28%,transparent)}.store-overhaul .st-boost-t{flex:1;min-width:0}.store-overhaul .st-boost-n{display:block;font-size:16px;font-weight:800;letter-spacing:-.03em}.store-overhaul .st-boost-d{display:block;margin-top:4px;font-size:11px;font-weight:650;line-height:1.4;color:var(--faint)}.store-overhaul .st-boost-c{flex:none;font-size:8px;font-weight:800;letter-spacing:.14em;color:var(--faint)}.store-overhaul .st-play{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 30%,transparent)}
.store-overhaul .st-rail{display:flex;gap:7px;margin:13px -14px 0;padding:0 14px 2px;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),transparent);mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),transparent)}.store-overhaul .st-rail::-webkit-scrollbar{display:none}.store-overhaul .st-opt{flex:none;padding:9px 14px;border-radius:11px;font-size:11.5px;font-weight:750;color:var(--faint);background:rgba(255,255,255,.045);box-shadow:inset 0 0 0 1px var(--hair)}.store-overhaul .st-opt.is-on{color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 46%,transparent)}.store-overhaul .st-cta{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;height:46px;margin-top:12px;border-radius:14px;font-size:13px;font-weight:800;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 32%,transparent)}
.store-overhaul .st-lead{display:flex;align-items:center;gap:13px;margin-top:9px;padding:14px;border-radius:19px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}.store-overhaul .st-lead-i{width:42px;height:42px;flex:none;border-radius:15px;display:grid;place-items:center;color:var(--gold-hi);background:rgba(248,168,16,.12);box-shadow:inset 0 0 0 1px rgba(248,168,16,.26)}.store-overhaul .st-lead b{display:block;font-size:17px;font-weight:800;letter-spacing:-.03em}.store-overhaul .st-lead p{margin-top:4px;font-size:11px;font-weight:650;line-height:1.4;color:var(--faint)}
.store-overhaul .st-band{display:flex;align-items:center;gap:10px;margin:22px 0 2px}.store-overhaul .st-band-i{width:30px;height:30px;flex:none;border-radius:11px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 28%,transparent)}.store-overhaul .st-band-n{font-size:11px;font-weight:800;letter-spacing:.19em}.store-overhaul .st-band-c{margin-left:auto;min-width:24px;height:22px;padding:0 8px;border-radius:8px;display:grid;place-items:center;font-size:10px;font-weight:800;color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent)}.store-overhaul .st-band-r{display:block;height:2px;border-radius:1px;margin:9px 0 0;background:linear-gradient(90deg,var(--c),color-mix(in srgb,var(--c) 22%,transparent) 38%,transparent 82%)}
.store-overhaul .st-item{position:relative;margin-top:9px;padding:14px;border-radius:18px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line-2)}.store-overhaul .st-item.is-best{box-shadow:inset 0 0 0 1.5px var(--line-on)}.store-overhaul .st-item-h{display:flex;align-items:center;gap:12px}.store-overhaul .st-item-i{width:42px;height:42px;flex:none;border-radius:15px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 28%,transparent)}.store-overhaul .st-item-n{flex:1;min-width:0;font-size:15.5px;font-weight:800;letter-spacing:-.03em;line-height:1.2}.store-overhaul .st-price{flex:none;font-size:16px;font-weight:800;letter-spacing:-.035em}.store-overhaul .st-item-d{margin-top:10px;font-size:11.5px;font-weight:650;line-height:1.5;color:var(--faint)}.store-overhaul .st-item-f{display:flex;align-items:center;gap:10px;margin-top:12px}.store-overhaul .st-rate{font-size:9px;font-weight:800;letter-spacing:.1em;color:var(--faint)}.store-overhaul .st-buy{margin-left:auto;flex:none;height:36px;padding:0 20px;border-radius:11px;font-size:12.5px;font-weight:800;color:#141210;background:var(--ink)}.store-overhaul .st-buy.is-owned{color:var(--mood);background:rgba(53,224,168,.14);box-shadow:inset 0 0 0 1px rgba(53,224,168,.36)}.store-overhaul .st-best{position:absolute;top:-7px;right:14px;padding:3px 8px;border-radius:6px;font-size:7.5px;font-weight:800;letter-spacing:.14em;color:#241606;background:var(--gold)}.store-overhaul .st-note{margin:20px 0 4px;font-size:11px;font-weight:650;text-align:center;color:var(--faint)}
.store-overhaul .st-modal{position:absolute;inset:0;z-index:30;display:grid;place-items:center;padding:20px;background:rgba(4,3,2,.8);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}.store-overhaul .st-modal-card{width:100%;max-width:350px;padding:20px;border-radius:24px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line),0 28px 70px -32px #000}.store-overhaul .st-modal-card h2{font-size:20px;font-weight:800}.store-overhaul .st-modal-card p{margin-top:9px;font-size:12px;line-height:1.55;color:var(--dim)}.store-overhaul .st-modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.store-overhaul .st-modal-actions button{height:43px;border-radius:12px;font-size:12px;font-weight:800}.store-overhaul .st-cancel{color:var(--dim);background:rgba(255,255,255,.045);box-shadow:inset 0 0 0 1px var(--hair)}.store-overhaul .st-continue{color:#241606;background:var(--gold)}
@media(max-width:374px){.store-overhaul .ae-scroll{padding-left:12px;padding-right:12px}.store-overhaul .st-head{gap:9px}.store-overhaul .st-money{padding-left:9px;padding-right:9px;font-size:11px}.store-overhaul .st-res{padding:12px}.store-overhaul .st-res-v{gap:8px}.store-overhaul .st-res-v b{font-size:17px}.store-overhaul .st-ad{padding:12px}.store-overhaul .st-ad-n{font-size:14px}.store-overhaul .st-ad-d{font-size:9.5px}.store-overhaul .st-item{padding:12px}.store-overhaul .st-item-h{gap:9px}.store-overhaul .st-item-i{width:38px;height:38px}.store-overhaul .st-item-n{font-size:14px}.store-overhaul .st-price{font-size:14px}}
`;

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const numberFromPrice = (price: string) => Number.parseFloat(price.replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0;
const currencyFromPrice = (price: string) => price.match(/[^0-9\s.,]+/)?.[0] || '$';

function GroupBand({ group }: { group: StoreUiGroup }) {
  return <div style={cssVar('--c', group.color)}>
    <div className="st-band"><span className="st-band-i"><Icon name={group.icon} size={15} /></span><span className="st-band-n">{group.label.toUpperCase()}</span><span className="st-band-c">{group.items.length}</span></div>
    <span className="st-band-r" />
  </div>;
}

export default function StoreScreen({ money, bonusBank, readyEnergy, groups, showPremium, premiumNote, skills, genres, formatGenre, copy, onBack, onWatchAd, onBuy, onRestore }: StoreScreenProps) {
  const [tab, setTab] = useState<StoreTab>('REWARDS');
  const [skill, setSkill] = useState<keyof ActorSkills>(skills[0] || 'delivery');
  const [genre, setGenre] = useState<Genre>(genres[0] || 'ACTION');
  const [pending, setPending] = useState<StoreUiProduct | null>(null);

  return <div className="ae store-overhaul" data-ui="actor-empire-store-overhaul">
    <Style css={BASE_CSS} /><Style css={CSS} /><div className="ae-bg" />
    <div className="ae-scroll">
      <header className="st-head ae-in"><button type="button" className="st-back" onClick={onBack} aria-label="Back to Home"><Icon name="back" size={17} sw={2.2} /></button><h1 className="ae-h1">Store</h1><span className="st-money">{money}</span></header>

      <section className="st-res ae-in" style={cssVar('--d', '.04s')}>
        <span className="st-res-i"><Icon name="bolt" size={18} /></span>
        <span className="st-res-t"><span className="ae-lab">Energy reserve</span><span className="st-res-v"><span>BONUS BANK <b style={{ color: bonusBank ? 'var(--gold-hi)' : 'var(--ghost)' }}>{bonusBank}</b></span><span>READY <b style={{ color: 'var(--gold-hi)' }}>{readyEnergy}</b></span></span><span className="st-res-n">Bought energy carries over week to week until fully used.</span></span>
      </section>

      {showPremium ? <>
        <div className="st-tabs ae-in" role="tablist" aria-label="Store sections">
          <button type="button" className={`st-tab${tab === 'REWARDS' ? ' is-on' : ''}`} role="tab" aria-selected={tab === 'REWARDS'} onClick={() => setTab('REWARDS')}>REWARDS <Icon name="play" size={13} /></button>
          <button type="button" className={`st-tab${tab === 'PREMIUM' ? ' is-on' : ''}`} role="tab" aria-selected={tab === 'PREMIUM'} onClick={() => setTab('PREMIUM')}>{copy.premiumTab.toUpperCase()} <Icon name="crown" size={13} /></button>
        </div>
        <button type="button" className="st-restore" onClick={onRestore}><Icon name="check" size={14} sw={2.4} />{copy.restore}</button>
      </> : null}

      {(!showPremium || tab === 'REWARDS') ? <div className="ae-in" data-store-tab="REWARDS">
        <div className="st-ads">
          <button type="button" className="st-ad" style={cssVar('--c', 'var(--money)')} onClick={() => onWatchAd('REWARDED_CASH')} aria-label="Watch ad for 5,000 cash"><span className="st-tag">AD</span><span className="st-ad-i"><Icon name="dollar" size={21} /></span><span className="st-ad-n">Get $5,000</span><span className="st-ad-d">Small instant cash injection</span></button>
          <button type="button" className="st-ad" style={cssVar('--c', 'var(--gold-hi)')} onClick={() => onWatchAd('REWARDED_ENERGY')} aria-label="Watch ad to refill 25 energy"><span className="st-tag">AD</span><span className="st-ad-i"><Icon name="bolt" size={21} /></span><span className="st-ad-n">Refill 25 Energy</span><span className="st-ad-d">Keep working longer</span></button>
        </div>

        <section className="st-boost" style={cssVar('--c', 'var(--health)')}><div className="st-boost-h"><span className="st-boost-i"><Icon name="heart" size={21} /></span><span className="st-boost-t"><span className="st-boost-n">Wellness Package</span><span className="st-boost-d">Boost Health, Mood, Looks &amp; Body to 90+</span></span><button type="button" className="st-play" onClick={() => onWatchAd('REWARDED_STATS')} aria-label="Watch ad for Wellness Package"><Icon name="play" size={17} /></button></div></section>

        <section className="st-boost" style={cssVar('--c', 'var(--writing)')}><div className="st-boost-h"><span className="st-boost-i"><Icon name="brain" size={21} /></span><span className="st-boost-t"><span className="st-boost-n">Skill Master</span></span><span className="st-boost-c">{skills.length}</span></div><div className="st-rail" aria-label="Choose skill">{skills.map(item => <button type="button" className={`st-opt${skill === item ? ' is-on' : ''}`} key={item} aria-pressed={skill === item} onClick={() => setSkill(item)}>{titleCase(item)}</button>)}</div><button type="button" className="st-cta" onClick={() => onWatchAd('REWARDED_SKILL', skill)}><Icon name="play" size={15} />Boost {titleCase(skill)} (+10)</button></section>

        <section className="st-boost" style={cssVar('--c', 'var(--looks)')}><div className="st-boost-h"><span className="st-boost-i"><Icon name="clapper" size={21} /></span><span className="st-boost-t"><span className="st-boost-n">Genre Study</span></span><span className="st-boost-c">{genres.length}</span></div><div className="st-rail" aria-label="Choose genre">{genres.map(item => <button type="button" className={`st-opt${genre === item ? ' is-on' : ''}`} key={item} aria-pressed={genre === item} onClick={() => setGenre(item)}>{formatGenre(item)}</button>)}</div><button type="button" className="st-cta" onClick={() => onWatchAd('REWARDED_GENRE', genre)}><Icon name="play" size={15} />Study {formatGenre(genre)} (+10 XP)</button></section>
        <p className="st-note">Watch ads to support the game and get rewards.</p>
      </div> : null}

      {showPremium && tab === 'PREMIUM' ? <div className="ae-in" data-store-tab="PREMIUM">
        <section className="st-lead"><span className="st-lead-i"><Icon name="crown" size={19} /></span><span><b>Premium Store</b><p>{premiumNote}</p></span></section>
        {groups.map(group => <section key={group.id}><GroupBand group={group} />{group.items.map(item => {
          const rate = item.amount && numberFromPrice(item.price) > 0 ? `${Math.round(item.amount / numberFromPrice(item.price)).toLocaleString()} PER ${currencyFromPrice(item.price)}1` : null;
          return <article className={`st-item${item.bestValue ? ' is-best' : ''}`} key={item.id} style={cssVar('--c', item.color)}>
            {item.bestValue ? <span className="st-best">BEST VALUE</span> : null}
            <div className="st-item-h"><span className="st-item-i"><Icon name={item.icon} size={19} /></span><span className="st-item-n">{item.name}</span><span className="st-price">{item.price}</span></div>
            <p className="st-item-d">{item.note}</p><div className="st-item-f">{rate ? <span className="st-rate">{rate}</span> : <span />}
              <button type="button" className={`st-buy${item.owned ? ' is-owned' : ''}`} disabled={item.owned} onClick={() => setPending(item)} aria-label={`${item.owned ? copy.owned : item.kind === 'consumable' ? copy.add : copy.unlock} ${item.name}`}>{item.owned ? copy.owned : item.kind === 'consumable' ? copy.add : copy.unlock}</button>
            </div>
          </article>;
        })}</section>)}
      </div> : null}
    </div>

    {pending ? <div className="st-modal" role="dialog" aria-modal="true" aria-label={copy.confirmTitle}><div className="st-modal-card"><h2>{copy.confirmTitle}</h2><p>{copy.confirmBuyPrefix} <strong>{pending.name}</strong>? {copy.chargePrefix} <strong>{pending.price}</strong> {copy.chargeSuffix} {copy.rewardAfterConfirm}</p><div className="st-modal-actions"><button type="button" className="st-cancel" onClick={() => setPending(null)}>{copy.cancel}</button><button type="button" className="st-continue" onClick={() => { onBuy(pending.id); setPending(null); }}>{copy.continue}</button></div></div></div> : null}
  </div>;
}
