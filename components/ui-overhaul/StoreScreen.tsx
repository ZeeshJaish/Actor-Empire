import React, { useState } from 'react';
import type { ActorSkills, Genre } from '../../types';
import type { PremiumProductId } from '../../services/premiumLogic';
import type { StoreUiGroup, StoreUiProduct } from '../../services/storeUiAdapter';
import { BASE_CSS } from './theme';
import { Icon, Style, cssVar } from './ui';
import { CashArt, CollectionArt, EnergyArt, GenreArt, NoAdsArt, PlayBadge, SkillArt, WellnessArt } from './StoreArt';
import { StreamingPlusChip, StreamingPlusPreview } from '../streamingPlus/StreamingPlusParts';

/* The Store (redesigned 2026-11-08, Zeesh: "ad side vala bhi aur paid side vala bhi visually better").
   Store rules followed here (App Store 3.1.1 and the HIG, Google Play Payments):
   - prices are the store's own, in the player's currency; on a device an item without one is not sold;
   - each item says what it gives and whether it is used up (energy, cash) or one-time (No Ads, collections, the pack);
   - Buy opens the store's own confirmation sheet, nothing in between; Restore Purchases is always one tap away;
   - Best value is worked out from the store's prices, never a made-up discount;
   - a reward ad is always marked as an ad, always the player's choice, and the reward is given after it finishes. */

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
  /** what the cash ad pays now (it grows with net worth) */
  rewardedCash?: number;
  noAdsOwner?: boolean;
  /** the Streaming+ Pack's card: its own sheet shows the price and the list */
  streamingPlus?: { owned: boolean; price: string | null };
  onOpenStreamingPlus?: () => void;
  /** which store the prices come from, for the small print */
  storeName?: string;
  onBack: () => void;
  onWatchAd: (type: RewardType, data?: keyof ActorSkills | Genre) => void;
  onBuy: (productId: PremiumProductId) => void | Promise<void>;
  onRestore: () => void | Promise<void>;
}

const CSS = `
.store-overhaul .st-head{display:flex;align-items:center;gap:12px;margin-bottom:15px}.store-overhaul .st-back{width:44px;height:44px;flex:none;border-radius:50%;display:grid;place-items:center;color:var(--dim);background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line);transition:transform .12s ease}.store-overhaul .st-back:active{transform:scale(.92);color:var(--ink)}.store-overhaul .st-head h1{flex:1;min-width:0}.store-overhaul .st-money{flex:none;display:flex;align-items:center;gap:6px;padding:9px 13px;border-radius:12px;font-size:13px;font-weight:800;letter-spacing:-.02em;color:var(--money);background:color-mix(in srgb,var(--money) 11%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--money) 26%,transparent)}
.store-overhaul .st-res{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:19px;background:linear-gradient(135deg,rgba(248,168,16,.1),transparent 60%),var(--card);box-shadow:inset 0 0 0 1px var(--line)}.store-overhaul .st-res-t{flex:1;min-width:0}.store-overhaul .st-res-v{display:flex;align-items:baseline;gap:16px;margin-top:4px}.store-overhaul .st-res-v span{font-size:8px;font-weight:800;letter-spacing:.16em;color:var(--faint)}.store-overhaul .st-res-v b{font-size:20px;font-weight:800;letter-spacing:-.04em;line-height:1;margin-left:5px}.store-overhaul .st-res-n{display:block;margin-top:5px;font-size:10.5px;font-weight:650;line-height:1.4;color:var(--faint)}
.store-overhaul .st-tabs{display:grid;grid-template-columns:1fr 1fr;margin-top:13px;padding:4px;border-radius:16px;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px var(--hair)}.store-overhaul .st-tab{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border-radius:12px;font-size:9.5px;font-weight:800;letter-spacing:.11em;color:var(--faint);transition:color .2s ease,background .2s ease,box-shadow .2s ease}.store-overhaul .st-tab.is-on{color:var(--gold-hi);background:rgba(248,168,16,.12);box-shadow:inset 0 0 0 1px var(--line-on)}
.store-overhaul .st-restore{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;margin-top:9px;border-radius:14px;font-size:12px;font-weight:750;color:var(--dim);background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px var(--line)}.store-overhaul .st-restore:disabled{opacity:.6}
.store-overhaul .st-kicker{display:flex;align-items:center;gap:8px;margin:20px 2px 9px;font-size:10px;font-weight:850;letter-spacing:.19em;color:var(--faint)}.store-overhaul .st-kicker::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}
/* rewards: two big tiles */
.store-overhaul .st-rw{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.store-overhaul .st-rw-tile{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;min-height:178px;padding:13px;border-radius:20px;text-align:left;background:radial-gradient(120% 80% at 80% 0%,color-mix(in srgb,var(--c) 22%,transparent),transparent 62%),var(--card);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 26%,transparent);transition:transform .12s ease}.store-overhaul .st-rw-tile:active{transform:scale(.97)}.store-overhaul .st-rw-art{margin:-4px 0 2px -6px}.store-overhaul .st-rw-ad{position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:5px;font-size:8px;font-weight:850;letter-spacing:.15em;color:var(--dim)}.store-overhaul .st-rw-n{display:block;margin-top:auto;font-size:22px;font-weight:850;letter-spacing:-.045em;line-height:1;color:var(--ink)}.store-overhaul .st-rw-d{display:block;margin-top:5px;font-size:11px;font-weight:650;line-height:1.35;color:var(--faint)}.store-overhaul .st-rw-go{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:38px;margin-top:11px;border-radius:12px;font-size:12px;font-weight:850;color:#141210;background:var(--c)}
/* rewards: one wide card each */
.store-overhaul .st-rc{margin-top:9px;padding:13px;border-radius:20px;background:radial-gradient(90% 90% at 0% 0%,color-mix(in srgb,var(--c) 16%,transparent),transparent 60%),var(--card);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 22%,transparent)}.store-overhaul .st-rc-h{display:flex;align-items:center;gap:11px}.store-overhaul .st-rc-t{flex:1;min-width:0}.store-overhaul .st-rc-n{display:block;font-size:15.5px;font-weight:850;letter-spacing:-.03em}.store-overhaul .st-rc-d{display:block;margin-top:3px;font-size:11px;font-weight:650;line-height:1.38;color:var(--faint)}.store-overhaul .st-rc-play{flex:none;display:flex;align-items:center;gap:6px;min-height:44px;padding:0 13px;border-radius:13px;font-size:11.5px;font-weight:850;color:#141210;background:var(--c)}
.store-overhaul .st-rail{display:flex;gap:7px;margin:12px -13px 0;padding:0 13px 2px;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),transparent);mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),transparent)}.store-overhaul .st-rail::-webkit-scrollbar{display:none}.store-overhaul .st-opt{flex:none;min-height:40px;display:flex;align-items:center;padding:0 14px;border-radius:11px;font-size:11.5px;font-weight:750;color:var(--faint);background:rgba(255,255,255,.045);box-shadow:inset 0 0 0 1px var(--hair)}.store-overhaul .st-opt.is-on{color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 46%,transparent)}.store-overhaul .st-cta{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;margin-top:11px;border-radius:14px;font-size:13px;font-weight:850;color:#141210;background:var(--c)}
.store-overhaul .st-note{margin:18px 4px 4px;font-size:11px;font-weight:650;line-height:1.5;text-align:center;color:var(--faint)}
/* shop: the pack */
.store-overhaul .st-pack{position:relative;display:block;width:100%;margin-top:12px;padding:0;border-radius:22px;overflow:hidden;text-align:left;background:#08080b;box-shadow:inset 0 0 0 1px rgba(248,168,16,.4),0 20px 50px -30px rgba(248,168,16,.7);transition:transform .12s ease}.store-overhaul .st-pack:active{transform:scale(.985)}.store-overhaul .st-pack-b{position:relative;padding:12px 14px 14px;margin-top:-34px;background:linear-gradient(180deg,rgba(8,8,11,0),#08080b 36px)}.store-overhaul .st-pack-e{display:flex;align-items:center;gap:7px;font-size:9px;font-weight:850;letter-spacing:.2em;color:var(--gold-hi)}.store-overhaul .st-pack-n{display:block;margin-top:5px;font-size:23px;font-weight:900;letter-spacing:-.045em;color:var(--ink)}.store-overhaul .st-pack-l{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.store-overhaul .st-pack-l span{padding:5px 8px;border-radius:8px;font-size:10px;font-weight:750;color:#ffe7a8;background:rgba(248,168,16,.1);box-shadow:inset 0 0 0 1px rgba(248,168,16,.24)}.store-overhaul .st-pack-f{display:flex;align-items:center;gap:10px;margin-top:12px}.store-overhaul .st-pack-f small{flex:1;min-width:0;font-size:10.5px;font-weight:650;line-height:1.35;color:var(--faint)}.store-overhaul .st-pack-go{flex:none;display:flex;align-items:center;gap:6px;min-height:44px;padding:0 15px;border-radius:13px;font-size:13px;font-weight:900;color:#241606;background:linear-gradient(135deg,#ffd56a,#f8a810 55%,#e89000)}.store-overhaul .st-pack-go.is-owned{color:#35e0a8;background:rgba(53,224,168,.12);box-shadow:inset 0 0 0 1px rgba(53,224,168,.36)}
/* shop: a product card */
.store-overhaul .st-card{position:relative;display:flex;align-items:center;gap:12px;margin-top:9px;padding:12px;border-radius:19px;background:radial-gradient(100% 100% at 0% 50%,color-mix(in srgb,var(--c) 13%,transparent),transparent 58%),var(--card);box-shadow:inset 0 0 0 1px var(--line-2,var(--line))}.store-overhaul .st-card.is-best{box-shadow:inset 0 0 0 1.5px var(--line-on)}.store-overhaul .st-card-art{flex:none;display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1px var(--hair)}.store-overhaul .st-card-t{flex:1;min-width:0}.store-overhaul .st-card-n{display:block;font-size:15px;font-weight:850;letter-spacing:-.03em;line-height:1.2}.store-overhaul .st-card-a{display:block;margin-top:2px;font-size:19px;font-weight:900;letter-spacing:-.045em;color:var(--c)}.store-overhaul .st-card-d{display:block;margin-top:3px;font-size:10.5px;font-weight:650;line-height:1.38;color:var(--faint)}.store-overhaul .st-card-k{display:inline-block;margin-top:5px;padding:2px 6px;border-radius:5px;font-size:8px;font-weight:850;letter-spacing:.12em;color:var(--dim);background:rgba(255,255,255,.06)}
.store-overhaul .st-best{position:absolute;top:-7px;right:14px;padding:3px 8px;border-radius:6px;font-size:7.5px;font-weight:850;letter-spacing:.14em;color:#241606;background:var(--gold)}
.store-overhaul .st-buy{flex:none;min-width:76px;min-height:44px;padding:0 14px;border-radius:12px;font-size:13px;font-weight:900;letter-spacing:-.02em;color:#141210;background:var(--ink)}.store-overhaul .st-buy:disabled{opacity:.42}.store-overhaul .st-buy.is-owned{color:var(--mood);background:rgba(53,224,168,.14);box-shadow:inset 0 0 0 1px rgba(53,224,168,.36);opacity:1}.store-overhaul .st-buy.is-busy{opacity:.7}
/* shop: energy as a 2×2 grid */
.store-overhaul .st-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}.store-overhaul .st-tile{position:relative;display:flex;flex-direction:column;align-items:center;padding:12px 10px 10px;border-radius:19px;text-align:center;background:radial-gradient(100% 70% at 50% 0%,color-mix(in srgb,var(--c) 16%,transparent),transparent 62%),var(--card);box-shadow:inset 0 0 0 1px var(--line)}.store-overhaul .st-tile.is-best{box-shadow:inset 0 0 0 1.5px var(--line-on)}.store-overhaul .st-tile-a{display:block;margin-top:2px;font-size:21px;font-weight:900;letter-spacing:-.05em;color:var(--c)}.store-overhaul .st-tile-d{display:block;margin-top:2px;font-size:10px;font-weight:650;color:var(--faint)}.store-overhaul .st-tile .st-buy{width:100%;margin-top:10px}
.store-overhaul .st-legal{margin:20px 4px 6px;font-size:10px;font-weight:600;line-height:1.55;text-align:center;color:var(--ghost)}
@media(max-width:374px){.store-overhaul .ae-scroll{padding-left:12px;padding-right:12px}.store-overhaul .st-head{gap:9px}.store-overhaul .st-money{padding-left:9px;padding-right:9px;font-size:11px}.store-overhaul .st-rw-tile{padding:11px;min-height:168px}.store-overhaul .st-rw-n{font-size:19px}.store-overhaul .st-card{gap:9px;padding:10px}.store-overhaul .st-card-art{width:50px;height:50px}.store-overhaul .st-card-n{font-size:13.5px}.store-overhaul .st-card-a{font-size:17px}.store-overhaul .st-buy{min-width:68px;padding:0 10px;font-size:12px}.store-overhaul .st-tile-a{font-size:18px}.store-overhaul .st-pack-n{font-size:20px}}
`;

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const compactCash = (amount: number) => (amount >= 1_000_000
  ? `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, '')}M`
  : `$${amount.toLocaleString()}`);

const collectionKind = (id: PremiumProductId): 'home' | 'car' | 'yacht' | 'crown' => (id.includes('home') ? 'home' : id.includes('vehicle') ? 'car' : id.includes('sky') ? 'yacht' : 'crown');

export default function StoreScreen({
  money, bonusBank, readyEnergy, groups, showPremium, premiumNote, skills, genres, formatGenre, copy,
  rewardedCash = 5000, noAdsOwner = false, streamingPlus, onOpenStreamingPlus, storeName = 'the store',
  onBack, onWatchAd, onBuy, onRestore,
}: StoreScreenProps) {
  const [tab, setTab] = useState<StoreTab>('REWARDS');
  const [skill, setSkill] = useState<keyof ActorSkills>(skills[0] || 'delivery');
  const [genre, setGenre] = useState<Genre>(genres[0] || 'ACTION');
  const [busyId, setBusyId] = useState<PremiumProductId | null>(null);
  const [restoring, setRestoring] = useState(false);

  const buy = (item: StoreUiProduct) => {
    if (busyId || item.owned || !item.available) return;
    setBusyId(item.id);
    /* straight to the store's own confirmation sheet: nothing in between */
    void Promise.resolve(onBuy(item.id)).finally(() => setBusyId(null));
  };
  const restore = () => {
    if (restoring) return;
    setRestoring(true);
    void Promise.resolve(onRestore()).finally(() => setRestoring(false));
  };

  const groupOf = (id: StoreUiGroup['id']) => groups.find(group => group.id === id);
  const adFree = groupOf('ad_free')?.items[0];
  const energy = groupOf('energy')?.items || [];
  const cash = groupOf('cash')?.items || [];
  const collections = groupOf('collection')?.items || [];

  const buyButton = (item: StoreUiProduct) => (
    <button type="button" className={`st-buy${item.owned ? ' is-owned' : ''}${busyId === item.id ? ' is-busy' : ''}`}
      disabled={item.owned || !item.available || Boolean(busyId)} onClick={() => buy(item)}
      aria-label={item.owned ? `${item.name}: ${copy.owned}` : item.available ? `Buy ${item.name} for ${item.price}` : `${item.name}: price not available from ${storeName} right now`}>
      {item.owned ? <><Icon name="check" size={13} sw={2.6} /> {copy.owned}</> : busyId === item.id ? '…' : item.price}
    </button>
  );
  const kindTag = (item: StoreUiProduct) => <span className="st-card-k">{item.kind === 'consumable' ? 'USED IN THIS SAVE' : 'ONE-TIME · EVERY SAVE'}</span>;

  return <div className="ae store-overhaul" data-ui="actor-empire-store-overhaul">
    <Style css={BASE_CSS} /><Style css={CSS} /><div className="ae-bg" />
    <div className="ae-scroll">
      <header className="st-head ae-in"><button type="button" className="st-back" onClick={onBack} aria-label="Back to Home"><Icon name="back" size={17} sw={2.2} /></button><h1 className="ae-h1">Store</h1><span className="st-money">{money}</span></header>

      <section className="st-res ae-in" style={cssVar('--d', '.04s')}>
        <EnergyArt level={bonusBank > 0 ? 2 : 1} size={46} />
        <span className="st-res-t"><span className="ae-lab">Energy reserve</span><span className="st-res-v"><span>BONUS BANK <b style={{ color: bonusBank ? 'var(--gold-hi)' : 'var(--ghost)' }}>{bonusBank}</b></span><span>READY <b style={{ color: 'var(--gold-hi)' }}>{readyEnergy}</b></span></span><span className="st-res-n">Bought energy carries over week to week until it is used. It never expires.</span></span>
      </section>

      {showPremium ? <>
        <div className="st-tabs ae-in" role="tablist" aria-label="Store sections">
          <button type="button" className={`st-tab${tab === 'REWARDS' ? ' is-on' : ''}`} role="tab" aria-selected={tab === 'REWARDS'} onClick={() => setTab('REWARDS')}>REWARDS <Icon name="play" size={13} /></button>
          <button type="button" className={`st-tab${tab === 'PREMIUM' ? ' is-on' : ''}`} role="tab" aria-selected={tab === 'PREMIUM'} onClick={() => setTab('PREMIUM')}>{copy.premiumTab.toUpperCase()} <Icon name="crown" size={13} /></button>
        </div>
        <button type="button" className="st-restore" onClick={restore} disabled={restoring}><Icon name="check" size={14} sw={2.4} />{restoring ? 'Restoring…' : copy.restore}</button>
      </> : null}

      {(!showPremium || tab === 'REWARDS') ? <div className="ae-in" data-store-tab="REWARDS">
        <div className="st-rw">
          <button type="button" className="st-rw-tile" style={cssVar('--c', 'var(--money)')} onClick={() => onWatchAd('REWARDED_CASH')} aria-label={`Watch ad for ${rewardedCash.toLocaleString()} cash`}>
            <span className="st-rw-ad"><PlayBadge size={16} />AD</span>
            <span className="st-rw-art"><CashArt level={rewardedCash >= 100_000 ? 4 : rewardedCash >= 20_000 ? 3 : 2} size={68} /></span>
            <b className="st-rw-n">+{compactCash(rewardedCash)}</b>
            <span className="st-rw-d">Grows with your net worth</span>
            <span className="st-rw-go"><Icon name="play" size={12} />Watch an ad</span>
          </button>
          <button type="button" className="st-rw-tile" style={cssVar('--c', 'var(--gold-hi)')} onClick={() => onWatchAd('REWARDED_ENERGY')} aria-label="Watch ad to refill 25 energy">
            <span className="st-rw-ad"><PlayBadge size={16} />AD</span>
            <span className="st-rw-art"><EnergyArt level={2} size={68} /></span>
            <b className="st-rw-n">+25 ⚡</b>
            <span className="st-rw-d">Back into this week's energy</span>
            <span className="st-rw-go"><Icon name="play" size={12} />Watch an ad</span>
          </button>
        </div>

        <section className="st-rc" style={cssVar('--c', 'var(--health)')}>
          <div className="st-rc-h">
            <WellnessArt size={52} />
            <span className="st-rc-t"><span className="st-rc-n">Wellness Package</span><span className="st-rc-d">Health, mood, looks and body up to 90 · two short ads</span></span>
            <button type="button" className="st-rc-play" onClick={() => onWatchAd('REWARDED_STATS')} aria-label="Watch two ads for the Wellness Package"><Icon name="play" size={12} />2 ads</button>
          </div>
        </section>

        <section className="st-rc" style={cssVar('--c', 'var(--writing)')}>
          <div className="st-rc-h"><SkillArt size={52} /><span className="st-rc-t"><span className="st-rc-n">Skill Master</span><span className="st-rc-d">+10 to one acting skill</span></span></div>
          <div className="st-rail" aria-label="Choose skill">{skills.map(item => <button type="button" className={`st-opt${skill === item ? ' is-on' : ''}`} key={item} aria-pressed={skill === item} onClick={() => setSkill(item)}>{titleCase(item)}</button>)}</div>
          <button type="button" className="st-cta" onClick={() => onWatchAd('REWARDED_SKILL', skill)}><Icon name="play" size={14} />Watch an ad · +10 {titleCase(skill)}</button>
        </section>

        <section className="st-rc" style={cssVar('--c', 'var(--looks)')}>
          <div className="st-rc-h"><GenreArt size={52} /><span className="st-rc-t"><span className="st-rc-n">Genre Study</span><span className="st-rc-d">+10 experience in one genre</span></span></div>
          <div className="st-rail" aria-label="Choose genre">{genres.map(item => <button type="button" className={`st-opt${genre === item ? ' is-on' : ''}`} key={item} aria-pressed={genre === item} onClick={() => setGenre(item)}>{formatGenre(item)}</button>)}</div>
          <button type="button" className="st-cta" onClick={() => onWatchAd('REWARDED_GENRE', genre)}><Icon name="play" size={14} />Watch an ad · +10 XP {formatGenre(genre)}</button>
        </section>
        <p className="st-note">Every reward here is an optional ad, given once the ad finishes.{noAdsOwner ? ' No Ads removed the forced ads; these stay yours to choose.' : ''}</p>
      </div> : null}

      {showPremium && tab === 'PREMIUM' ? <div className="ae-in" data-store-tab="PREMIUM">
        {streamingPlus && onOpenStreamingPlus ? (
          <button type="button" className="st-pack" onClick={onOpenStreamingPlus} aria-label={streamingPlus.owned ? 'Streaming+ Pack: yours. See what it holds' : 'Streaming+ Pack: see what it holds'} data-store-streaming-plus>
            <StreamingPlusPreview compact />
            <span className="st-pack-b">
              <span className="st-pack-e"><StreamingPlusChip owned={streamingPlus.owned} />{streamingPlus.owned ? 'YOURS' : 'STREAMING EXPANSION'}</span>
              <b className="st-pack-n">Streaming+ Pack</b>
              <span className="st-pack-l"><span>30 cities</span><span>Titan servers</span><span>10 future Tech</span><span>IPO</span><span>7 big moments</span><span>13 front pages</span></span>
              <span className="st-pack-f">
                <small>For your streaming company. One-time, every save.</small>
                <span className={`st-pack-go${streamingPlus.owned ? ' is-owned' : ''}`}>{streamingPlus.owned ? <><Icon name="check" size={13} sw={2.6} />Yours</> : streamingPlus.price ? <>See inside · {streamingPlus.price}</> : 'See inside'}</span>
              </span>
            </span>
          </button>
        ) : null}

        {adFree ? <>
          <p className="st-kicker">PLAY WITHOUT BREAKS</p>
          <article className="st-card" style={cssVar('--c', 'var(--acting)')}>
            <span className="st-card-art"><NoAdsArt size={48} /></span>
            <span className="st-card-t"><b className="st-card-n">{adFree.name}</b><span className="st-card-d">{adFree.note}</span>{kindTag(adFree)}</span>
            {buyButton(adFree)}
          </article>
        </> : null}

        {energy.length ? <>
          <p className="st-kicker">ENERGY</p>
          <div className="st-grid">
            {energy.map((item, index) => (
              <article key={item.id} className={`st-tile${item.bestValue ? ' is-best' : ''}`} style={cssVar('--c', 'var(--gold-hi)')}>
                {item.bestValue ? <span className="st-best">BEST VALUE</span> : null}
                <EnergyArt level={index + 1} size={60} />
                <b className="st-tile-a">{(item.amount || 0).toLocaleString()} ⚡</b>
                <span className="st-tile-d">Carries over until used</span>
                {buyButton(item)}
              </article>
            ))}
          </div>
        </> : null}

        {cash.length ? <>
          <p className="st-kicker">CASH · YOUR OWN WALLET</p>
          {cash.map((item, index) => (
            <article key={item.id} className={`st-card${item.bestValue ? ' is-best' : ''}`} style={cssVar('--c', 'var(--money)')}>
              {item.bestValue ? <span className="st-best">BEST VALUE</span> : null}
              <span className="st-card-art"><CashArt level={index + 1} size={56} /></span>
              <span className="st-card-t"><b className="st-card-n">{item.name}</b><b className="st-card-a">{compactCash(item.amount || 0)}</b><span className="st-card-d">Into your personal money at once</span></span>
              {buyButton(item)}
            </article>
          ))}
        </> : null}

        {collections.length ? <>
          <p className="st-kicker">COLLECTIONS</p>
          {collections.map(item => (
            <article key={item.id} className="st-card" style={cssVar('--c', item.id.includes('ultimate') ? 'var(--gold-hi)' : 'var(--looks)')}>
              <span className="st-card-art"><CollectionArt kind={collectionKind(item.id)} size={48} /></span>
              <span className="st-card-t"><b className="st-card-n">{item.name}</b><span className="st-card-d">{item.unlocks ? `Unlocks ${item.unlocks} items in the market. ` : ''}{item.note}</span>{kindTag(item)}</span>
              {buyButton(item)}
            </article>
          ))}
        </> : null}

        <p className="st-legal">{premiumNote} Prices are set by {storeName} in your currency and charged to your {storeName} account when you confirm. Energy and cash are used in the save you buy them in; one-time items unlock on every save and can be restored.</p>
      </div> : null}
    </div>
  </div>;
}
