/**
 * ACTOR EMPIRE — Home / Main screen
 * ---------------------------------------------------------------------------
 * A drop-in redesign of the main game screen. Same information as before,
 * nothing added, nothing removed — only the look, layout and hierarchy.
 *
 * A portrait-led life-sim dashboard:
 *   · the character plate — a lit portrait on a designed backdrop, the role as
 *     an earned badge, and the year drawn as 52 week-bars you can read at once
 *   · colour-coded attribute tiles, one hue per stat
 *   · the week's feed, then the age-up action
 *
 * - Self-contained: no external CSS, no icon library, no fonts, no images.
 * - Every class is namespaced `ae-` and scoped under `.ae-root`.
 * - All values are props with sensible defaults, so it renders standalone.
 *
 * Usage:
 *   <ActorEmpireHome
 *     name={player.name}
 *     avatarUrl={player.avatar}      // pixel art stays crisp (image-rendering)
 *     tags={["ACTOR", "COMEBACK"]}   // [0] becomes the role badge, rest wrap below
 *     money={formatMoney(player.money)}
 *     year={state.year}
 *     week={state.week}
 *     energy={player.energy}
 *     energyMax={player.energyMax}
 *     condition={{ health, physique, mood, looks }}
 *     skills={{ talent, experience }}
 *     status={{ reputation, fame }}
 *     feed={liveFeed}
 *     activeTab="home"
 *     phoneBadge={unreadCount}
 *     onAgeUp={ageUpWeek}
 *     onTabChange={setTab}
 *   />
 *
 * The parent element must have a height (the component fills 100% of it).
 * ---------------------------------------------------------------------------
 */

import React from "react";

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

export type ActorEmpireTab =
  | "home"
  | "career"
  | "training"
  | "social"
  | "store"
  | "phone";

export interface FeedEntry {
  id?: string | number;
  year: number;
  week: number;
  text: string;
  /** Marks the entry with the accent dot. Defaults to true for the newest. */
  isNew?: boolean;
}

export interface EnergyEntry {
  id?: string | number;
  label: string;
  week: number;
  /** Negative for energy spent, positive for energy gained. */
  amount: number;
}

export interface ActorEmpireHomeProps {
  name?: string;
  avatarUrl?: string;
  /** First entry renders as the gold role badge; the rest wrap as neutral chips. */
  tags?: string[];
  /** Pre-formatted, e.g. "$249.9M". */
  money?: string;
  /** Shown beside YEAR. Defaults to the year on the newest feed entry, else 1. */
  year?: number;
  week?: number;
  weeksPerYear?: number;
  energy?: number;
  energyMax?: number;
  condition?: { health: number; physique: number; mood: number; looks: number };
  skills?: { talent: number; experience: number };
  status?: { reputation: number; fame: number };
  feed?: FeedEntry[];
  /** Energy spent/earned this week. Negative `amount` = spent. */
  energyLedger?: EnergyEntry[];
  /** Energy committed but not yet spent, shown as RESERVED. */
  energyReserved?: number;
  activeTab?: ActorEmpireTab;
  phoneBadge?: number;
  className?: string;
  showNavigation?: boolean;
  isProcessing?: boolean;
  onTabChange?: (tab: ActorEmpireTab) => void;
  onAgeUp?: () => void;
  onOpenStore?: () => void;
  onOpenSettings?: () => void;
  onChangeAvatar?: () => void;
  onOpenCareerArc?: () => void;
}

/* ========================================================================== */
/* Styles                                                                     */
/* ========================================================================== */

const CSS = `
/* ============================================================
   ACTOR EMPIRE — Home screen
   Portrait-led life-sim dashboard. Warm indigo ground, a lit
   character plate, colour-coded attribute tiles.
   Every selector is scoped to .ae-root.
   ============================================================ */

.ae-root{
  /* ---- brand palette, sampled from Actor-Empire-Logo-Exact.svg ---- */
  --gold-hi:#f8c020;    /* reel highlight  */
  --gold:#f8a810;       /* core gold       */
  --gold-mid:#e89000;   /* mid tone        */
  --gold-deep:#d87800;  /* shadow side     */

  --bg:#070605;         /* logo ground     */
  --bg-2:#0e0c09;
  --ink:#f9f6ef;
  --dim:rgba(249,246,239,.6);
  --faint:rgba(249,246,239,.36);
  --ghost:rgba(249,246,239,.18);

  --panel:rgba(255,255,255,.05);
  --panel-2:rgba(255,255,255,.02);
  --card:#14110d;
  --line:rgba(248,168,16,.13);
  --line-2:rgba(248,168,16,.09);
  --sunk:rgba(0,0,0,.5);

  --acc:var(--gold);
  --acc-2:var(--gold-hi);
  --acc-dim:rgba(248,168,16,.42);
  --money:var(--gold-hi);
  --nrg:var(--gold);
  --alert:#ff5c5c;

  --s1:#ff5c7a;  /* health     */
  --s2:#ff7a3c;  /* physique   */
  --s3:#2fd68f;  /* mood       */
  --s4:#b57bff;  /* looks      */
  --s5:#35c8f0;  /* talent     */
  --s6:#7a72f0;  /* experience */
  --s7:#5c9cff;  /* reputation */
  --s8:#f8c020;  /* fame — the brand gold */

  position:relative;
  display:flex;
  flex-direction:column;
  height:100%;
  overflow:hidden;
  isolation:isolate;
  background:var(--bg);
  color:var(--ink);
  font-family:"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;
  font-variant-numeric:tabular-nums;
  -webkit-font-smoothing:antialiased;
  -webkit-tap-highlight-color:transparent;
  user-select:none;
}
.ae-root *,.ae-root *::before,.ae-root *::after{box-sizing:border-box;}
:where(.ae-root) :where(button){font:inherit;color:inherit;background:transparent;border:0;padding:0;cursor:pointer;}
:where(.ae-root) :where(h1,p,ul,li){margin:0;padding:0;list-style:none;}
.ae-root svg{display:block;}

/* ---------- ground ---------- */
.ae-bg{position:absolute;inset:0;z-index:0;pointer-events:none;}
.ae-bg::before{
  content:"";position:absolute;left:-30%;right:-30%;top:-26%;height:78%;
  background:
    radial-gradient(42% 48% at 26% 20%, rgba(248,168,16,.19), transparent 70%),
    radial-gradient(40% 44% at 86% 6%,  rgba(216,120,0,.15), transparent 72%);
}
.ae-bg::after{
  content:"";position:absolute;inset:0;
  background:radial-gradient(126% 88% at 50% 40%, transparent 40%, rgba(0,0,0,.58) 100%);
}

/* ---------- scroll ---------- */
.ae-scroll{
  position:relative;z-index:1;flex:1;min-height:0;
  display:flex;flex-direction:column;
  overflow-y:auto;overflow-x:hidden;
  padding:max(20px,calc(13px + env(safe-area-inset-top))) 16px 24px;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;
}
.ae-scroll::-webkit-scrollbar{display:none;}

.ae-anim{animation:ae-in .6s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0s);}
@keyframes ae-in{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}

.ae-lab{font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--faint);}

/* ---------- panels ---------- */
.ae-panel{
  position:relative;flex:none;padding:16px;border-radius:24px;
  background:var(--card);
  box-shadow:inset 0 0 0 1px var(--line), 0 20px 40px -34px #000;
}

/* ---------- the character plate ---------- */
.ae-top{display:flex;gap:14px;align-items:flex-start;}
.ae-tools{
  display:flex;flex-direction:column;flex:none;border-radius:13px;overflow:hidden;
  background:rgba(255,255,255,.035);
  box-shadow:inset 0 0 0 1px var(--line);
}

.ae-port{
  position:relative;width:92px;height:92px;flex:none;border-radius:21px;
  cursor:pointer;touch-action:manipulation;
  box-shadow:0 20px 36px -18px rgba(0,0,0,.9), inset 0 0 0 1px rgba(255,255,255,.1);
}
/* a designed backdrop, so any portrait reads as art */
.ae-port-bg{
  position:absolute;inset:0;border-radius:inherit;overflow:hidden;
  background:
    radial-gradient(64% 56% at 28% 18%, rgba(248,192,32,.5), transparent 66%),
    radial-gradient(72% 66% at 84% 94%, rgba(216,120,0,.42), transparent 70%),
    linear-gradient(158deg,#4a3411,#241a09 60%,#120d06);
}
.ae-port-bg::after{
  content:"";position:absolute;inset:0;
  background:radial-gradient(58% 30% at 50% 100%, rgba(0,0,0,.55), transparent 66%);
}
.ae-port-art{position:absolute;inset:0;border-radius:inherit;overflow:hidden;}
.ae-port-art>img{
  width:100%;height:100%;display:block;
  object-fit:cover;object-position:50% 50%;
  image-rendering:pixelated;
  /* crop past the artwork's own border ring so the face fills the plate */
  transform:scale(var(--port-zoom,1.2));
  transform-origin:50% 36%;
}
.ae-port-art>span{
  width:100%;height:100%;display:grid;place-items:center;
  font-size:34px;font-weight:850;color:var(--gold-hi);
  background:rgba(0,0,0,.24);
}
.ae-port-shine{
  position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(152deg,rgba(255,255,255,.2),rgba(255,255,255,0) 44%);
}
.ae-port-edge{
  position:absolute;inset:0;border-radius:21px;pointer-events:none;
  background:linear-gradient(150deg,var(--gold-hi),rgba(255,255,255,.16) 40%,var(--gold-deep));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;padding:1.4px;
}
.ae-cam{
  position:absolute;right:-5px;bottom:-5px;z-index:2;width:26px;height:26px;border-radius:50%;
  display:grid;place-items:center;color:#241606;
  background:linear-gradient(140deg,#ffe9b0,var(--gold));
  box-shadow:0 4px 12px -2px rgba(0,0,0,.85), 0 0 0 2px var(--bg);
  transition:transform .13s ease;
}
.ae-cam:active{transform:scale(.88);}

.ae-id{min-width:0;flex:1;display:flex;flex-direction:column;}

.ae-name{
  min-width:0;
  font-size:var(--name-size,23px);font-weight:750;letter-spacing:-.03em;line-height:1.14;
  overflow-wrap:anywhere;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
.ae-icb{
  width:34px;height:34px;flex:none;display:grid;place-items:center;
  color:var(--dim);background:transparent;
  transition:color .18s ease,background .18s ease;
}
.ae-tools .ae-icb + .ae-icb{box-shadow:inset 0 1px 0 var(--line);}
.ae-icb:active{color:var(--gold);background:rgba(255,255,255,.05);}

/* role emblem — an earned badge, not a grey pill */
.ae-chips{display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;}
.ae-role{
  display:inline-flex;align-items:center;gap:6px;flex:none;
  padding:5px 11px 5px 8px;border-radius:9px;
  font-size:9.5px;font-weight:800;letter-spacing:.14em;color:#241606;
  background:linear-gradient(120deg,var(--gold-hi),var(--gold) 48%,var(--gold-deep));
  box-shadow:0 3px 10px -5px rgba(248,168,16,.55), inset 0 1px 0 rgba(255,255,255,.5);
}
.ae-role svg{color:#241606;}
.ae-trait{
  display:inline-flex;align-items:center;flex:none;white-space:nowrap;
  padding:5px 10px;border-radius:8px;
  font-size:9px;font-weight:700;letter-spacing:.14em;color:var(--dim);
  background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line);
}

/* ---------- the year, one bar per week ---------- */
.ae-yr{margin-top:13px;padding-top:12px;border-top:1px solid var(--line-2);}
.ae-yr-head{display:flex;align-items:baseline;margin-bottom:9px;}
.ae-yr-head b{font-size:11px;font-weight:800;color:var(--acc-2);margin-left:6px;}
.ae-yr-head .ae-lab:last-child{margin-left:auto;color:var(--ghost);}
.ae-year{display:flex;align-items:flex-end;gap:2px;height:24px;}
.ae-wk{
  flex:1;height:14px;border-radius:2px;background:rgba(255,255,255,.09);
  transform-origin:bottom;
  animation:ae-wkin .5s cubic-bezier(.2,.9,.2,1) both;animation-delay:var(--wd,0s);
}
@keyframes ae-wkin{from{transform:scaleY(.15);opacity:0;}to{transform:scaleY(1);opacity:1;}}
.ae-wk.is-past{background:linear-gradient(180deg,var(--gold),var(--gold-deep));opacity:.8;}
.ae-wk.is-mark{height:19px;background:rgba(255,255,255,.17);}
.ae-wk.is-now{
  height:24px;border-radius:3px;opacity:1;
  background:linear-gradient(180deg,#fff0c4,var(--gold-hi) 45%,var(--gold));
  box-shadow:0 0 12px var(--acc-2),0 0 26px var(--acc-dim);
  animation:ae-wkin .5s cubic-bezier(.2,.9,.2,1) both,ae-now 2.4s ease-in-out infinite .6s;
}
@keyframes ae-now{0%,100%{box-shadow:0 0 12px var(--acc-2),0 0 24px var(--acc-dim);}50%{box-shadow:0 0 18px var(--acc-2),0 0 40px var(--acc-dim);}}

/* ---------- resources ---------- */
.ae-res{display:flex;gap:14px;margin-top:12px;padding-top:11px;border-top:1px solid var(--line-2);}
.ae-res-c{flex:1;min-width:0;}
.ae-res-c + .ae-res-c{padding-left:14px;border-left:1px solid var(--line-2);}
.ae-res-btn{display:block;text-align:left;border-radius:10px;transition:opacity .15s ease;}
.ae-res-btn:active{opacity:.62;}
.ae-res-head{display:flex;align-items:center;gap:5px;}
.ae-res-head>svg{color:var(--gold);opacity:.75;}
.ae-res-v{margin-top:6px;font-size:18px;font-weight:750;letter-spacing:-.032em;line-height:1;}
.ae-res-v.is-money{color:var(--money);text-shadow:0 0 24px rgba(248,192,32,.35);}
.ae-res-v em{font-style:normal;font-size:12px;font-weight:700;color:var(--ghost);}
.ae-nrg{position:relative;height:5px;margin-top:8px;border-radius:3px;background:var(--sunk);overflow:hidden;}
.ae-nrg>i{
  position:absolute;inset:0 auto 0 0;border-radius:3px;
  background:linear-gradient(90deg,var(--gold-deep),var(--gold-hi));box-shadow:0 0 10px -1px var(--nrg);
  animation:ae-grow .8s cubic-bezier(.2,.8,.2,1) both .15s;
}
.ae-nrg>i::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(100deg,transparent 34%,rgba(255,255,255,.6) 50%,transparent 66%);
  transform:translateX(-105%);animation:ae-flow 3.4s ease-in-out infinite;
}
@keyframes ae-flow{0%{transform:translateX(-105%);}55%,100%{transform:translateX(105%);}}
@keyframes ae-grow{from{clip-path:inset(0 100% 0 0);}to{clip-path:inset(0 0 0 0);}}

/* ---------- attribute tiles ---------- */
.ae-sec{margin-top:11px;}
.ae-slab{margin-bottom:7px;font-size:9px;font-weight:800;letter-spacing:.2em;color:var(--faint);}
.ae-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.ae-tiles--pair>.ae-tile{grid-column:span 2;}
.ae-tile{
  position:relative;overflow:hidden;padding:9px 10px 9px;border-radius:15px;
  background:color-mix(in srgb,var(--c) 10%,var(--card));
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 26%,transparent);
}
.ae-tile-top{display:flex;align-items:center;gap:6px;margin-bottom:5px;}
.ae-tile-top>svg{color:var(--c);flex:none;}
.ae-tile-n{font-size:7.5px;font-weight:800;letter-spacing:.1em;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ae-tile-v{margin-left:auto;font-size:17px;font-weight:750;letter-spacing:-.035em;line-height:1;color:var(--ink);}
.ae-tile-v em{font-style:normal;font-size:9px;font-weight:700;color:var(--ghost);margin-left:2px;letter-spacing:0;}
.ae-tile-bar{position:relative;height:2px;margin-top:6px;border-radius:2px;background:var(--sunk);overflow:hidden;}
.ae-tile-bar>i{
  position:absolute;inset:0 auto 0 0;border-radius:2px;background:var(--c);
  box-shadow:0 0 9px -1px var(--c);
  animation:ae-grow .8s cubic-bezier(.2,.8,.2,1) both .2s;
}

/* ---------- feed ---------- */
.ae-feed{
  position:relative;flex:1 1 auto;min-height:186px;margin-top:12px;
  display:flex;flex-direction:column;padding:14px 15px 13px;border-radius:22px;
  background:var(--card);
  box-shadow:inset 0 0 0 1px var(--line), 0 20px 40px -34px #000;
}
.ae-fhead{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex:none;}
.ae-fhead .ae-count{margin-left:auto;font-size:8.5px;font-weight:800;letter-spacing:.14em;color:var(--ghost);}
.ae-log{
  flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;
  -webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 16px),transparent);
  mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 16px),transparent);
}
.ae-log::-webkit-scrollbar{display:none;}
.ae-live{
  width:6px;height:6px;border-radius:50%;flex:none;background:var(--alert);
  box-shadow:0 0 9px var(--alert);animation:ae-blink 2s steps(1,end) infinite;
}
@keyframes ae-blink{0%,64%{opacity:1;}65%,100%{opacity:.25;}}
.ae-when{font-size:8px;font-weight:800;letter-spacing:.2em;color:var(--ghost);margin-bottom:8px;}
.ae-grp + .ae-grp{margin-top:12px;}
.ae-ev{position:relative;padding:0 0 9px 15px;}
.ae-ev:last-child{padding-bottom:0;}
.ae-ev::before{
  content:"";position:absolute;left:0;top:5px;width:5px;height:5px;border-radius:50%;
  background:var(--ghost);
}
.ae-ev.is-new::before{background:var(--acc-2);box-shadow:0 0 10px var(--acc-2);}
.ae-ev p{font-size:12px;line-height:1.45;color:var(--dim);}
.ae-ev.is-new p{color:var(--ink);font-weight:550;}

/* ---------- dock ---------- */
.ae-dock{position:relative;z-index:2;flex:none;padding:0 16px calc(12px + env(safe-area-inset-bottom));}
.ae-dock::before{
  content:"";position:absolute;left:0;right:0;bottom:100%;height:42px;pointer-events:none;
  background:linear-gradient(180deg,rgba(7,6,5,0),var(--bg) 76%);
}
.ae-cta{
  position:relative;overflow:hidden;width:100%;height:56px;border-radius:19px;
  display:flex;align-items:center;justify-content:center;gap:11px;
  font-size:15px;font-weight:750;letter-spacing:-.01em;color:#241606;
  background:linear-gradient(160deg,#ffe08c 0%,var(--gold-hi) 24%,var(--gold) 58%,var(--gold-deep) 100%);
  box-shadow:0 16px 42px -14px rgba(248,168,16,.65), inset 0 1px 0 rgba(255,255,255,.55);
  transition:transform .13s cubic-bezier(.2,.8,.2,1),box-shadow .13s ease;
}
.ae-cta>*{position:relative;z-index:1;}
.ae-cta::after{
  content:"";position:absolute;top:-30%;bottom:-30%;left:-55%;width:28%;transform:skewX(-16deg);
  background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.55),rgba(255,255,255,0));
  animation:ae-sheen 5.5s ease-in-out infinite;
}
@keyframes ae-sheen{0%{left:-55%;}16%{left:135%;}100%{left:135%;}}
.ae-cta:active{transform:translateY(2px) scale(.994);box-shadow:0 8px 22px -14px rgba(248,168,16,.65);}
.ae-next{
  font-size:10.5px;font-weight:800;letter-spacing:.08em;
  padding:4px 9px;border-radius:8px;background:rgba(60,34,0,.22);color:rgba(36,22,6,.85);
}

.ae-nav{
  position:relative;margin-top:12px;height:60px;border-radius:21px;overflow:hidden;
  display:grid;grid-template-columns:repeat(6,1fr);align-items:center;
  background:rgba(24,19,10,.82);
  -webkit-backdrop-filter:blur(24px) saturate(1.5);backdrop-filter:blur(24px) saturate(1.5);
  box-shadow:inset 0 0 0 1px var(--line), 0 20px 44px -32px #000;
}
.ae-nav-ind{
  position:absolute;top:0;left:0;width:16.6667%;height:100%;pointer-events:none;
  transition:transform .4s cubic-bezier(.34,1.24,.4,1);
}
.ae-nav-ind::before{
  content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:22px;height:2px;border-radius:0 0 2px 2px;
  background:linear-gradient(90deg,var(--acc),var(--acc-2));
  box-shadow:0 0 12px var(--acc-2),0 0 26px var(--acc-dim);
}
.ae-nav-ind::after{
  content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:58px;height:34px;
  background:radial-gradient(50% 100% at 50% 0%,rgba(248,168,16,.3),transparent 72%);
}
.ae-root .ae-tab{
  position:relative;height:100%;display:grid;place-items:center;color:var(--ghost);
  transition:color .2s ease;
}
.ae-root .ae-tab>svg{position:relative;z-index:1;transition:transform .2s cubic-bezier(.2,.8,.2,1);}
.ae-root .ae-tab:active>svg{transform:scale(.86);}
.ae-root .ae-tab.is-active{color:var(--acc-2);}
.ae-badge{
  position:absolute;top:10px;right:calc(50% - 21px);z-index:2;
  min-width:17px;height:17px;padding:0 5px;border-radius:9px;
  display:grid;place-items:center;
  font-size:9px;font-weight:800;color:#fff;background:var(--alert);
  box-shadow:0 0 0 2px rgba(24,19,10,.95),0 0 14px -2px rgba(255,92,92,.9);
}

@media (prefers-reduced-motion:reduce){
  .ae-root *,.ae-root *::before,.ae-root *::after{animation:none !important;transition:none !important;}
}

@media (max-width:392px){
  .ae-port{width:92px;height:92px;border-radius:21px;}
  .ae-port-edge{border-radius:21px;}
  .ae-top{gap:12px;}
  .ae-tile-n{font-size:7px;letter-spacing:.06em;}
}
@media (max-width:360px){
  .ae-res-v{font-size:19px;}
  .ae-scroll,.ae-dock{padding-left:13px;padding-right:13px;}
}

/* ---------- energy ledger sheet ---------- */
.ae-sheet-wrap{position:absolute;inset:0;z-index:20;display:flex;align-items:flex-end;pointer-events:none;}
.ae-sheet-wrap.is-open{pointer-events:auto;}
.ae-scrim{
  position:absolute;inset:0;opacity:0;transition:opacity .3s ease;
  background:rgba(4,3,2,.7);
  -webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);
}
.ae-sheet-wrap.is-open .ae-scrim{opacity:1;}
.ae-sheet{
  position:relative;width:100%;max-height:78%;display:flex;flex-direction:column;
  padding:10px 16px calc(18px + env(safe-area-inset-bottom));
  border-radius:26px 26px 0 0;background:var(--card);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.09), 0 -24px 60px -34px #000;
  transform:translateY(103%);transition:transform .34s cubic-bezier(.22,.9,.28,1);
}
.ae-sheet-wrap.is-open .ae-sheet{transform:none;}
.ae-grip{width:38px;height:4px;border-radius:3px;background:rgba(255,255,255,.16);margin:0 auto 14px;flex:none;}
.ae-sheet-top{display:flex;align-items:flex-start;gap:12px;flex:none;}
.ae-sheet-eyebrow{display:flex;align-items:center;gap:6px;font-size:8.5px;font-weight:800;letter-spacing:.2em;color:var(--gold);}
.ae-sheet-title{margin-top:7px;font-size:21px;font-weight:800;letter-spacing:.005em;text-transform:uppercase;line-height:1.05;}
.ae-sheet-x{
  margin-left:auto;flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
  color:var(--dim);background:rgba(255,255,255,.045);box-shadow:inset 0 0 0 1px var(--line);
  transition:color .15s ease;
}
.ae-sheet-x:active{color:var(--ink);}
.ae-sheet-sub{margin-top:9px;font-size:12px;line-height:1.45;color:var(--dim);flex:none;}
.ae-sheet-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:15px;flex:none;}
.ae-sstat{
  padding:10px 11px 11px;border-radius:14px;
  background:color-mix(in srgb,var(--c) 10%,var(--card));
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 26%,transparent);
}
.ae-sstat-n{font-size:7.5px;font-weight:800;letter-spacing:.14em;color:var(--dim);}
.ae-sstat-v{margin-top:7px;font-size:19px;font-weight:750;letter-spacing:-.03em;line-height:1;color:var(--c);}
.ae-sheet-rule{height:1px;margin:15px 0 13px;background:var(--line-2);flex:none;}
.ae-sheet-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;}
.ae-sheet-list::-webkit-scrollbar{display:none;}
.ae-lrow{
  display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:13px;
  background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px var(--line-2);
}
.ae-lrow + .ae-lrow{margin-top:7px;}
.ae-lrow-t{flex:1;min-width:0;}
.ae-lrow-n{font-size:11.5px;font-weight:700;color:var(--ink);line-height:1.3;overflow-wrap:anywhere;}
.ae-lrow-w{margin-top:4px;font-size:8px;font-weight:800;letter-spacing:.16em;color:var(--ghost);}
.ae-amt{flex:none;padding:5px 10px;border-radius:9px;font-size:11.5px;font-weight:800;}
.ae-amt.is-out{color:var(--gold-hi);background:rgba(248,168,16,.13);box-shadow:inset 0 0 0 1px rgba(248,168,16,.32);}
.ae-amt.is-in{color:#2fd68f;background:rgba(47,214,143,.12);box-shadow:inset 0 0 0 1px rgba(47,214,143,.32);}
.ae-sheet-empty{padding:22px 0;text-align:center;font-size:12px;color:var(--faint);}
`;

/* ========================================================================== */
/* Icons                                                                      */
/* ========================================================================== */

type IconName =
  | "cart" | "gear" | "camera"
  | "heart" | "dumbbell" | "smile" | "sparkles"
  | "gem" | "trend" | "trophy" | "star"
  | "home" | "briefcase" | "users" | "bag" | "phone"
  | "chevron" | "close";

const PATHS: Record<IconName, React.ReactNode> = {
  cart: (
    <>
      <path d="M2.8 4h2.1l2.3 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.95-1.6L20 7.6H6.1" />
      <circle cx="9.6" cy="19.4" r="1.3" />
      <circle cx="17.4" cy="19.4" r="1.3" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.1 14.6a1.5 1.5 0 0 0 .3 1.66l.06.05a1.9 1.9 0 1 1-2.68 2.68l-.05-.06a1.5 1.5 0 0 0-1.66-.3 1.5 1.5 0 0 0-.9 1.37v.15a1.9 1.9 0 1 1-3.8 0v-.08a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.66.3l-.05.06a1.9 1.9 0 1 1-2.68-2.68l.06-.05a1.5 1.5 0 0 0 .3-1.66 1.5 1.5 0 0 0-1.37-.9H3.7a1.9 1.9 0 1 1 0-3.8h.08a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.66l-.06-.05a1.9 1.9 0 1 1 2.68-2.68l.05.06a1.5 1.5 0 0 0 1.66.3h.07a1.5 1.5 0 0 0 .9-1.37V3.7a1.9 1.9 0 1 1 3.8 0v.08a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.66-.3l.05-.06a1.9 1.9 0 1 1 2.68 2.68l-.06.05a1.5 1.5 0 0 0-.3 1.66v.07a1.5 1.5 0 0 0 1.37.9h.15a1.9 1.9 0 1 1 0 3.8h-.08a1.5 1.5 0 0 0-1.37.9z" />
    </>
  ),
  camera: (
    <>
      <path d="M15 4.6H9L7.6 6.7H4.4A1.4 1.4 0 0 0 3 8.1v9.5A1.4 1.4 0 0 0 4.4 19h15.2a1.4 1.4 0 0 0 1.4-1.4V8.1a1.4 1.4 0 0 0-1.4-1.4h-3.2z" />
      <circle cx="12" cy="12.5" r="3.1" />
    </>
  ),
  heart: <path d="M12 20.3 4.8 13.2a4.5 4.5 0 0 1 6.4-6.3l.8.8.8-.8a4.5 4.5 0 1 1 6.4 6.3z" />,
  dumbbell: <path d="M6.8 6.6v10.8M3.6 9.2v5.6M17.2 6.6v10.8M20.4 9.2v5.6M6.8 12h10.4" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M8.5 14.3s1.3 1.7 3.5 1.7 3.5-1.7 3.5-1.7" />
      <path d="M9.2 9.7h.01M14.8 9.7h.01" strokeWidth={2.4} />
    </>
  ),
  sparkles: (
    <>
      <path d="M10.4 3.1 12 7.3l4.2 1.6L12 10.5l-1.6 4.2-1.6-4.2L4.6 8.9l4.2-1.6z" />
      <path d="M17.6 14.4l.85 2.3 2.3.85-2.3.85-.85 2.3-.85-2.3-2.3-.85 2.3-.85z" />
    </>
  ),
  gem: (
    <>
      <path d="M6.4 3.2h11.2l3.2 5.2L12 20.8 1.2 8.4z" />
      <path d="M1.2 8.4h19.6" />
    </>
  ),
  trend: (
    <>
      <path d="M3 16.6 9 10.6l3.5 3.5L20.8 5.7" />
      <path d="M15.5 5.7h5.3V11" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.2 3.4h9.6v4.7a4.8 4.8 0 0 1-9.6 0z" />
      <path d="M16.8 5h2.5v1.7a3.7 3.7 0 0 1-3 3.6M7.2 5H4.7v1.7a3.7 3.7 0 0 0 3 3.6M12 13v3.6M8.7 20.4h6.6M9.7 20.4l.4-3.3h3.8l.4 3.3" />
    </>
  ),
  star: (
    <path d="M12 3.4l2.6 5.3 5.85.85-4.23 4.12 1 5.83L12 16.75l-5.23 2.75 1-5.83L3.55 9.55l5.85-.85z" />
  ),
  home: (
    <>
      <path d="M3.8 10.4 12 3.9l8.2 6.5v8.2a1.5 1.5 0 0 1-1.5 1.5H5.3a1.5 1.5 0 0 1-1.5-1.5z" />
      <path d="M9.4 20.1V14h5.2v6.1" />
    </>
  ),
  briefcase: (
    <>
      <path d="M4.2 7.7h15.6a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4.2a1.5 1.5 0 0 1-1.5-1.5v-9a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M9 7.7V6.1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.6M2.7 12.4h18.6" />
    </>
  ),
  users: (
    <>
      <path d="M15.6 20v-1.8a3.9 3.9 0 0 0-3.9-3.9H6.5a3.9 3.9 0 0 0-3.9 3.9V20" />
      <circle cx="9.1" cy="7.5" r="3.1" />
      <path d="M17.6 4.7a3.1 3.1 0 0 1 0 5.8M21.4 20v-1.8a3.9 3.9 0 0 0-2.9-3.75" />
    </>
  ),
  bag: (
    <>
      <path d="M4.7 7.6h14.6l.9 12.1H3.8z" />
      <path d="M9 10.1V6.7a3 3 0 0 1 6 0v3.4" />
    </>
  ),
  chevron: <path d="M9 5l7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  phone: (
    <>
      <path d="M8 2.9h8a1.8 1.8 0 0 1 1.8 1.8v14.6A1.8 1.8 0 0 1 16 21.1H8a1.8 1.8 0 0 1-1.8-1.8V4.7A1.8 1.8 0 0 1 8 2.9z" />
      <path d="M10.6 18.1h2.8" />
    </>
  ),
};

function Ico({ name, size = 17, sw = 1.8 }: { name: IconName; size?: number; sw?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

const Bolt = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.6 1.8 4.2 13.6h5.9L10.4 22.2 19.8 10h-5.9z" />
  </svg>
);

const SolidStar = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.6l2.75 5.6 6.2.9-4.48 4.37 1.06 6.17L12 16.73l-5.53 2.91 1.06-6.17L3.05 9.1l6.2-.9z" />
  </svg>
);

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

const clamp = (n: number) => Math.max(0, Math.min(100, isFinite(n) ? n : 0));
const cssVar = (name: string, value: string) =>
  ({ [name]: value } as React.CSSProperties);

/**
 * Eases 0 → 1 once on mount so the readout counts up with the bars.
 * Returns 1 immediately when the viewer prefers reduced motion.
 */
function useReveal(duration = 900, delay = 320) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") {
      setT(1);
      return;
    }
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start - delay) / duration));
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [duration, delay]);
  return t;
}

const NAV: { key: ActorEmpireTab; icon: IconName; label: string }[] = [
  { key: "home", icon: "home", label: "Home" },
  { key: "career", icon: "briefcase", label: "Career" },
  { key: "training", icon: "dumbbell", label: "Training" },
  { key: "social", icon: "users", label: "Social" },
  { key: "store", icon: "bag", label: "Store" },
  { key: "phone", icon: "phone", label: "Phone" },
];

const DEFAULT_LEDGER: EnergyEntry[] = [
  { id: "l1", label: "Streaming deal: Cheat Studios negotiation", week: 10, amount: -10 },
  { id: "l2", label: "Streaming deal: Cheat Studios follow-up", week: 10, amount: -10 },
  { id: "l3", label: "Gym session — physique training", week: 10, amount: -6 },
  { id: "l4", label: "Table read: The Last Horizon", week: 10, amount: -4 },
];

const DEFAULT_FEED: FeedEntry[] = [
  {
    year: 15,
    week: 10,
    text: "📺 Episode scorecard: The Last Horizon — steady signal (+2 renewal).",
  },
  { year: 15, week: 10, text: "Traffic was surprisingly light today." },
  { year: 15, week: 9, text: "Your agent left a voicemail about the Meridian offer." },
  { year: 15, week: 9, text: "Gym session completed. Physique holding steady." },
];

function AvatarFallback({ name }: { name: string }) {
  return <span aria-hidden="true">{name.trim().charAt(0).toUpperCase() || 'A'}</span>;
}

interface Tile {
  key: string;
  label: string;
  value: number;
  color: string;
  icon: IconName;
}

/* ========================================================================== */
/* Screen                                                                     */
/* ========================================================================== */

export default function ActorEmpireHome({
  name = "Tony Stark",
  avatarUrl,
  tags = ["ACTOR", "COMEBACK"],
  money = "$249.9M",
  year,
  week = 10,
  weeksPerYear = 52,
  energy = 75,
  energyMax = 75,
  condition = { health: 77, physique: 63, mood: 73, looks: 63 },
  skills = { talent: 8, experience: 14 },
  status = { reputation: 84, fame: 83 },
  feed = DEFAULT_FEED,
  energyLedger = DEFAULT_LEDGER,
  energyReserved = 0,
  activeTab = "home",
  phoneBadge = 6,
  className,
  showNavigation = true,
  isProcessing = false,
  onTabChange,
  onAgeUp,
  onOpenStore,
  onOpenSettings,
  onChangeAvatar,
  onOpenCareerArc,
}: ActorEmpireHomeProps) {
  const t = useReveal();

  /* Step the display size instead of ellipsising — long names wrap to two lines. */
  const nameSize =
    name.length <= 12 ? 23 : name.length <= 17 ? 20 : name.length <= 24 ? 17 : 15;

  const totalWeeks = Math.max(1, Math.round(weeksPerYear));
  const nowWeek = Math.max(1, Math.min(totalWeeks, Math.round(week)));
  const nextWeek = nowWeek >= totalWeeks ? 1 : nowWeek + 1;
  const shownYear = year !== undefined ? year : feed.length ? feed[0].year : 1;

  const energyPct = clamp(energyMax > 0 ? (energy / energyMax) * 100 : 0);
  const energyShown = t >= 1 ? energy : Math.round(energy * t);

  const sections: { label: string; tiles: Tile[] }[] = [
    {
      label: "CONDITION",
      tiles: [
        { key: "health", label: "HEALTH", value: clamp(condition.health), color: "var(--s1)", icon: "heart" },
        { key: "physique", label: "PHYSIQUE", value: clamp(condition.physique), color: "var(--s2)", icon: "dumbbell" },
        { key: "mood", label: "MOOD", value: clamp(condition.mood), color: "var(--s3)", icon: "smile" },
        { key: "looks", label: "LOOKS", value: clamp(condition.looks), color: "var(--s4)", icon: "sparkles" },
      ],
    },
    {
      label: "SKILLS",
      tiles: [
        { key: "talent", label: "TALENT", value: clamp(skills.talent), color: "var(--s5)", icon: "gem" },
        { key: "experience", label: "EXPERIENCE", value: clamp(skills.experience), color: "var(--s6)", icon: "trend" },
      ],
    },
    {
      label: "STATUS",
      tiles: [
        { key: "reputation", label: "REPUTATION", value: clamp(status.reputation), color: "var(--s7)", icon: "trophy" },
        { key: "fame", label: "FAME", value: clamp(status.fame), color: "var(--s8)", icon: "star" },
      ],
    },
  ];

  /* Consecutive entries from the same week share one timestamp. */
  const groups = React.useMemo(() => {
    const out: { key: string; year: number; week: number; items: FeedEntry[] }[] = [];
    feed.forEach((entry, i) => {
      const key = entry.year + ":" + entry.week;
      const item: FeedEntry = {
        ...entry,
        isNew: entry.isNew !== undefined ? entry.isNew : i === 0,
      };
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, year: entry.year, week: entry.week, items: [item] });
    });
    return out;
  }, [feed]);

  const [ledgerOpen, setLedgerOpen] = React.useState(false);
  const spent = energyLedger.reduce((n, e) => n + (e.amount < 0 ? -e.amount : 0), 0);

  const activeIndex = Math.max(0, NAV.map((n) => n.key).indexOf(activeTab));

  return (
    <div
      className={"ae-root" + (className ? " " + className : "")}
      data-ui="actor-empire-home-overhaul"
    >
      <style>{CSS}</style>

      <div className="ae-bg" />

      <div className="ae-scroll">
        {/* ---------------- character plate ---------------- */}
        <section className="ae-panel ae-anim" data-tutorial-id="home-profile">
          <div className="ae-top">
            <button type="button" className="ae-port" onClick={onChangeAvatar} aria-label="Change avatar">
              <span className="ae-port-bg" />
              <div className="ae-port-art">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <AvatarFallback name={name} />}
              </div>
              <span className="ae-port-shine" />
              <span className="ae-port-edge" />
              <span className="ae-cam" aria-hidden="true">
                <Ico name="camera" size={12} sw={2.1} />
              </span>
            </button>

            <div className="ae-id">
              <h1 className="ae-name" style={cssVar("--name-size", nameSize + "px")}>
                {name}
              </h1>

              <div className="ae-chips">
                {tags.map((tag, i) =>
                  i === 0 ? (
                    <span className="ae-role" key={tag + i}>
                      <SolidStar />
                      {tag}
                    </span>
                  ) : onOpenCareerArc && i === 1 ? (
                    <button className="ae-trait" key={tag + i} onClick={onOpenCareerArc}>
                      {tag}
                    </button>
                  ) : (
                    <span className="ae-trait" key={tag + i}>{tag}</span>
                  )
                )}
              </div>
            </div>

            <div className="ae-tools">
              <button className="ae-icb" onClick={onOpenStore} aria-label="Store">
                <Ico name="cart" size={16} />
              </button>
              <button className="ae-icb" onClick={onOpenSettings} aria-label="Settings">
                <Ico name="gear" size={16} />
              </button>
            </div>
          </div>

          {/* the year, one bar per week */}
          <div className="ae-yr">
            <div className="ae-yr-head">
              <span className="ae-lab">Year</span>
              <b>{shownYear}</b>
              <span className="ae-lab">
                Week {nowWeek} / {totalWeeks}
              </span>
            </div>
            <div className="ae-year">
              {Array.from({ length: totalWeeks }).map((_, i) => {
                const w = i + 1;
                let cls = "ae-wk";
                if (w === nowWeek) cls += " is-now";
                else if (w < nowWeek) cls += " is-past";
                else if (w % 13 === 0) cls += " is-mark";
                return (
                  <i
                    key={w}
                    className={cls}
                    style={cssVar("--wd", (0.14 + w * 0.008).toFixed(3) + "s")}
                  />
                );
              })}
            </div>
          </div>

          {/* resources */}
          <div className="ae-res">
            <div className="ae-res-c">
              <span className="ae-lab">Net Worth</span>
              <div className="ae-res-v is-money">{money}</div>
            </div>
            <button
              className="ae-res-c ae-res-btn"
              onClick={() => setLedgerOpen(true)}
              aria-label="Open energy ledger"
            >
              <span className="ae-res-head">
                <span className="ae-lab">Energy</span>
                <Ico name="chevron" size={10} sw={2.6} />
              </span>
              <div className="ae-res-v">
                {energyShown}
                <em> / {energyMax}</em>
              </div>
              <div className="ae-nrg">
                <i style={{ width: energyPct + "%" }} />
              </div>
            </button>
          </div>
        </section>

        {/* ---------------- attribute tiles ---------------- */}
        {sections.map((sec, si) => (
          <section
            className="ae-sec ae-anim"
            key={sec.label}
            style={cssVar("--d", 0.12 + si * 0.03 + "s")}
          >
            <p className="ae-slab">{sec.label}</p>
            <div className={"ae-tiles" + (sec.tiles.length === 2 ? " ae-tiles--pair" : "")}>
              {sec.tiles.map((tile) => (
                <div className="ae-tile" key={tile.key} style={cssVar("--c", tile.color)}>
                  <div className="ae-tile-top">
                    <Ico name={tile.icon} size={13} sw={1.9} />
                    <span className="ae-tile-v">
                      {Math.round(tile.value * t)}
                      <em>%</em>
                    </span>
                  </div>
                  <div className="ae-tile-n">{tile.label}</div>
                  <div className="ae-tile-bar">
                    <i style={{ width: tile.value + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* ---------------- live feed ---------------- */}
        <section className="ae-feed ae-anim" style={cssVar("--d", ".24s")}>
          <div className="ae-fhead">
            <span className="ae-live" />
            <span className="ae-lab">Activity</span>
            <span className="ae-count">
              {feed.length} {feed.length === 1 ? "EVENT" : "EVENTS"}
            </span>
          </div>

          <div className="ae-log">
            {groups.map((group) => (
              <div className="ae-grp" key={group.key}>
                <div className="ae-when">
                  YEAR {group.year} · WEEK {group.week}
                </div>
                {group.items.map((item, i) => (
                  <div
                    key={item.id !== undefined ? item.id : group.key + "-" + i}
                    className={"ae-ev" + (item.isNew ? " is-new" : "")}
                  >
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---------------- energy ledger ---------------- */}
      <div className={"ae-sheet-wrap" + (ledgerOpen ? " is-open" : "")}>
        <div className="ae-scrim" onClick={() => setLedgerOpen(false)} />
        <div className="ae-sheet" role="dialog" aria-modal="true" aria-label="Energy ledger">
          <span className="ae-grip" />

          <div className="ae-sheet-top">
            <div>
              <div className="ae-sheet-eyebrow">
                <Bolt />
                This week · Energy
              </div>
              <h2 className="ae-sheet-title">Expense Log</h2>
            </div>
            <button className="ae-sheet-x" onClick={() => setLedgerOpen(false)} aria-label="Close">
              <Ico name="close" size={14} sw={2.2} />
            </button>
          </div>

          <p className="ae-sheet-sub">
            Week {nowWeek} energy usage from actions and commitments.
          </p>

          <div className="ae-sheet-stats">
            <div className="ae-sstat" style={cssVar("--c", "var(--gold-hi)")}>
              <div className="ae-sstat-n">SPENT</div>
              <div className="ae-sstat-v">{spent}E</div>
            </div>
            <div className="ae-sstat" style={cssVar("--c", "#8f8a80")}>
              <div className="ae-sstat-n">RESERVED</div>
              <div className="ae-sstat-v">{energyReserved}E</div>
            </div>
            <div className="ae-sstat" style={cssVar("--c", "#2fd68f")}>
              <div className="ae-sstat-n">AVAILABLE</div>
              <div className="ae-sstat-v">{energy}E</div>
            </div>
          </div>

          <div className="ae-sheet-rule" />

          <div className="ae-sheet-list">
            {energyLedger.length === 0 ? (
              <p className="ae-sheet-empty">No energy spent this week.</p>
            ) : (
              energyLedger.map((entry, i) => (
                <div className="ae-lrow" key={entry.id !== undefined ? entry.id : i}>
                  <div className="ae-lrow-t">
                    <div className="ae-lrow-n">{entry.label}</div>
                    <div className="ae-lrow-w">WEEK {entry.week}</div>
                  </div>
                  <span className={"ae-amt " + (entry.amount < 0 ? "is-out" : "is-in")}>
                    {entry.amount < 0 ? "−" : "+"}
                    {Math.abs(entry.amount)}E
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---------------- dock ---------------- */}
      <div className="ae-dock">
        <button
          className="ae-cta ae-anim"
          style={cssVar("--d", ".28s")}
          onClick={onAgeUp}
          disabled={isProcessing}
          data-tutorial-id="home-next-week"
        >
          <span>{isProcessing ? "Processing Week" : "Age Up Week"}</span>
          <span className="ae-next">W {nextWeek}</span>
        </button>

        {showNavigation && <nav className="ae-nav ae-anim" style={cssVar("--d", ".32s")}>
          <span
            className="ae-nav-ind"
            style={{ transform: "translateX(" + activeIndex * 100 + "%)" }}
            aria-hidden="true"
          />
          {NAV.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                className={"ae-tab" + (active ? " is-active" : "")}
                onClick={() => onTabChange && onTabChange(tab.key)}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <Ico name={tab.icon} size={20} sw={1.75} />
                {tab.key === "phone" && phoneBadge > 0 && (
                  <span className="ae-badge">{phoneBadge > 99 ? "99+" : phoneBadge}</span>
                )}
              </button>
            );
          })}
        </nav>}
      </div>
    </div>
  );
}
