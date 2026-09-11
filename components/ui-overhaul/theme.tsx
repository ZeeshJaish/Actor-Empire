/**
 * ACTOR EMPIRE — design tokens + base chrome
 * ---------------------------------------------------------------------------
 * One source of truth for the look. Every screen imports BASE_CSS so colour,
 * type, panels, meters, chips, sheets, the nav and the toast stay identical
 * across the app. Screens add only what is unique to them.
 *
 * The gold ramp is sampled from Actor-Empire-Logo-Exact.svg — a saturated
 * amber (hue 33-44, sat .87-1.0), not a pale champagne.
 * ---------------------------------------------------------------------------
 */

export const tokens = {
  goldHi: "#f8c020",
  gold: "#f8a810",
  goldMid: "#e89000",
  goldDeep: "#d87800",
  bg: "#070605",
  card: "#14110d",
  card2: "#191510",
  ink: "#f9f6ef",
  money: "#52e0a0",
  alert: "#ff5c5c",
  /** attribute + track hues, shared by every screen */
  hues: {
    health: "#ff5c7a",
    physique: "#ff9a3c",
    mood: "#35e0a8",
    looks: "#c77dff",
    acting: "#4cc9ff",
    writing: "#7c7cff",
    directing: "#ffd24c",
    bondStrong: "#35e0a8",
    bondWarm: "#f8c020",
    bondCold: "#ff5c5c",
  },
} as const;

export const BASE_CSS = `
.ae{
  --gold-hi:#f8c020; --gold:#f8a810; --gold-mid:#e89000; --gold-deep:#d87800;
  --bg:#070605; --card:#14110d; --card-2:#191510; --sunk:rgba(0,0,0,.5);
  --ink:#f9f6ef;
  --dim:rgba(249,246,239,.6);
  --faint:rgba(249,246,239,.36);
  --ghost:rgba(249,246,239,.18);
  /* Hairlines are NEUTRAL. Gold is a state, not a surface — it means
     selected, active, or energy, and nothing else. */
  --line:rgba(255,255,255,.095);
  --line-2:rgba(255,255,255,.055);
  --hair:rgba(255,255,255,.07);
  --line-on:rgba(248,168,16,.44);
  --money:#52e0a0; --alert:#ff5c5c; --risk:#ff6b6b;
  --health:#ff5c7a; --physique:#ff9a3c; --mood:#35e0a8; --looks:#c77dff;
  --acting:#4cc9ff; --writing:#7c7cff; --directing:#ffd24c;

  position:relative;display:flex;flex-direction:column;height:100%;overflow:hidden;
  isolation:isolate;background:var(--bg);color:var(--ink);
  font-family:"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  -webkit-tap-highlight-color:transparent;user-select:none;
}
.ae *,.ae *::before,.ae *::after{box-sizing:border-box;}
:where(.ae) :where(button){font:inherit;color:inherit;background:transparent;border:0;padding:0;cursor:pointer;}
:where(.ae) :where(h1,h2,h3,p,ul,li){margin:0;padding:0;list-style:none;}
.ae svg{display:block;}

/* ---------- ground ---------- */
.ae-bg{position:absolute;inset:0;z-index:0;pointer-events:none;}
.ae-bg::before{content:"";position:absolute;left:-30%;right:-30%;top:-24%;height:72%;
  background:radial-gradient(46% 40% at 30% 6%, rgba(248,168,16,.035), transparent 72%);}
.ae-bg::after{content:"";position:absolute;inset:0;
  background:radial-gradient(130% 92% at 50% 36%, transparent 54%, rgba(0,0,0,.45) 100%);}

.ae-scroll{
  position:relative;z-index:1;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;
  padding:max(20px,calc(15px + env(safe-area-inset-top))) 16px 26px;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;
}
.ae-scroll::-webkit-scrollbar{display:none;}

.ae-in{animation:ae-in .55s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--d,0s);}
@keyframes ae-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
@keyframes ae-grow{from{clip-path:inset(0 100% 0 0);}to{clip-path:inset(0 0 0 0);}}

/* ---------- type ---------- */
.ae-lab{display:block;font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--faint);}
.ae-h1{font-size:27px;font-weight:800;letter-spacing:-.035em;line-height:1.05;}
.ae-sub{margin-top:6px;font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);line-height:1.5;}

/* ---------- surfaces ---------- */
.ae-card{position:relative;border-radius:20px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);}
.ae-card-2{position:relative;border-radius:15px;background:var(--card-2);box-shadow:inset 0 0 0 1px var(--hair);}
.ae-rule{height:1px;background:var(--line-2);}
.ae-sec{display:flex;align-items:center;gap:9px;margin:18px 0 10px;}
.ae-sec-rule{flex:1;height:1px;background:var(--line-2);}

/* ---------- meters ---------- */
.ae-meter{position:relative;height:5px;border-radius:3px;background:var(--sunk);overflow:hidden;}
.ae-meter>i{position:absolute;inset:0 auto 0 0;border-radius:3px;background:var(--c,var(--gold));
  animation:ae-grow .8s cubic-bezier(.2,.8,.2,1) both .12s;}
.ae-meter.is-thin{height:3px;}

/* ---------- chips ---------- */
.ae-chip{
  display:inline-flex;align-items:center;gap:5px;
  font-size:9px;font-weight:800;letter-spacing:.06em;padding:5px 9px;border-radius:8px;
  color:color-mix(in srgb,var(--c,var(--gold)) 82%,#fff);
  background:color-mix(in srgb,var(--c,var(--gold)) 14%,transparent);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c,var(--gold)) 30%,transparent);
}
.ae-chip.is-solid{color:#241606;background:var(--c,var(--gold));box-shadow:none;}

/* ---------- segmented sub-navigation ---------- */
.ae-seg{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:4px;border-radius:16px;
  background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px var(--hair);}
.ae-seg-ind{position:absolute;top:4px;left:4px;height:calc(100% - 8px);border-radius:12px;pointer-events:none;
  background:rgba(248,168,16,.12);box-shadow:inset 0 0 0 1px var(--line-on);
  transition:transform .36s cubic-bezier(.34,1.18,.4,1);}
.ae .ae-seg-b{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;height:38px;
  font-size:9.5px;font-weight:800;letter-spacing:.11em;color:var(--faint);transition:color .22s ease;}
.ae .ae-seg-b.is-on{color:var(--gold-hi);}
.ae .ae-seg-b>svg{transition:transform .2s cubic-bezier(.2,.8,.2,1);}
.ae .ae-seg-b:active>svg{transform:scale(.86);}
.ae-seg-n{font-size:8.5px;font-weight:800;opacity:.6;}

/* ---------- primary action ---------- */
.ae-btn{
  display:flex;align-items:center;justify-content:center;gap:9px;
  width:100%;height:44px;border-radius:12px;
  font-size:13px;font-weight:800;letter-spacing:.01em;color:#241606;background:var(--gold);
  transition:transform .12s ease,background .15s ease;
}
.ae-btn:active{transform:translateY(1px);background:var(--gold-mid);}
.ae-btn:disabled{background:rgba(255,255,255,.06);color:var(--ghost);cursor:default;}
.ae-btn.is-ghost{color:var(--dim);background:transparent;box-shadow:inset 0 0 0 1px var(--hair);}
.ae-btn.is-ghost:active{color:var(--alert);background:transparent;}
.ae-btn.is-done{background:rgba(53,224,168,.16);color:var(--mood);box-shadow:inset 0 0 0 1px rgba(53,224,168,.4);}

/* ---------- bottom sheet ---------- */
.ae-sheet-wrap{position:absolute;inset:0;z-index:20;display:flex;align-items:flex-end;pointer-events:none;}
.ae-sheet-wrap.is-open{pointer-events:auto;}
.ae-scrim{position:absolute;inset:0;opacity:0;transition:opacity .3s ease;
  background:rgba(4,3,2,.72);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);}
.ae-sheet-wrap.is-open .ae-scrim{opacity:1;}
.ae-sheet{
  position:relative;width:100%;max-height:84%;display:flex;flex-direction:column;
  padding:10px 16px calc(18px + env(safe-area-inset-bottom));
  border-radius:26px 26px 0 0;background:var(--card);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.09), 0 -24px 60px -34px #000;
  transform:translateY(103%);transition:transform .36s cubic-bezier(.22,.94,.28,1);
}
.ae-sheet-wrap.is-open .ae-sheet{transform:none;}
.ae-grip{width:38px;height:4px;border-radius:3px;background:rgba(255,255,255,.16);margin:0 auto 14px;flex:none;}
.ae-sheet-top{display:flex;align-items:flex-start;gap:12px;flex:none;}
.ae-sheet-eyebrow{display:flex;align-items:center;gap:6px;font-size:8.5px;font-weight:800;letter-spacing:.2em;color:var(--gold);}
.ae-sheet-title{margin-top:7px;font-size:21px;font-weight:800;letter-spacing:-.02em;line-height:1.08;}
.ae-sheet-x{
  margin-left:auto;flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
  color:var(--dim);background:rgba(255,255,255,.045);box-shadow:inset 0 0 0 1px var(--line);
}
.ae-sheet-x:active{color:var(--ink);}
.ae-sheet-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;margin-top:14px;}
.ae-sheet-body::-webkit-scrollbar{display:none;}

/* ---------- toast ---------- */
.ae-toast{
  position:absolute;left:50%;bottom:96px;z-index:30;transform:translate(-50%,14px);
  display:flex;align-items:center;gap:8px;padding:10px 15px;border-radius:12px;
  font-size:12px;font-weight:750;color:var(--ink);
  background:var(--card-2);box-shadow:inset 0 0 0 1px var(--line), 0 12px 30px -12px #000;
  opacity:0;pointer-events:none;transition:opacity .22s ease,transform .28s cubic-bezier(.2,.8,.2,1);
}
.ae-toast.is-on{opacity:1;transform:translate(-50%,0);}
.ae-toast svg{color:var(--gold);flex:none;}

/* ---------- nav ---------- */
.ae-dock{position:relative;z-index:2;flex:none;padding:0 16px calc(12px + env(safe-area-inset-bottom));}
.ae-dock::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:38px;pointer-events:none;
  background:linear-gradient(180deg,rgba(7,6,5,0),var(--bg) 76%);}
.ae-nav{
  position:relative;height:60px;border-radius:20px;overflow:hidden;
  display:grid;grid-template-columns:repeat(6,1fr);align-items:center;
  background:rgba(19,18,16,.84);
  -webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);
  box-shadow:inset 0 0 0 1px var(--line);
}
.ae-nav-ind{position:absolute;top:0;left:0;width:16.6667%;height:100%;pointer-events:none;
  transition:transform .42s cubic-bezier(.34,1.24,.4,1);}
.ae-nav-ind::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:22px;height:2px;border-radius:0 0 2px 2px;background:var(--gold);
  box-shadow:0 0 12px var(--gold),0 0 26px rgba(248,168,16,.42);}
.ae-nav-ind::after{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:58px;height:34px;background:radial-gradient(50% 100% at 50% 0%,rgba(248,168,16,.26),transparent 72%);}
.ae .ae-navtab{position:relative;height:100%;display:grid;place-items:center;color:var(--ghost);transition:color .2s ease;}
.ae .ae-navtab.is-on{color:var(--gold);}
.ae .ae-navtab>svg{transition:transform .2s cubic-bezier(.2,.8,.2,1);}
.ae .ae-navtab:active>svg{transform:scale(.86);}
.ae-navbadge{
  position:absolute;top:10px;right:calc(50% - 21px);min-width:17px;height:17px;padding:0 5px;border-radius:9px;
  display:grid;place-items:center;font-size:9px;font-weight:800;color:#fff;background:var(--alert);
  box-shadow:0 0 0 2px rgba(19,18,16,.96);
}

@media (prefers-reduced-motion:reduce){
  .ae *,.ae *::before,.ae *::after{animation:none !important;transition:none !important;}
}
`;
