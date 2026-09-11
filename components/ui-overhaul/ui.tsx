/**
 * ACTOR EMPIRE — shared UI kit
 * ---------------------------------------------------------------------------
 * Icons, primitives and behaviour every screen reuses: the bottom sheet, the
 * bottom nav, the toast, meters, and the mount-reveal hook that drives the
 * count-up. Screens should never redefine these.
 * ---------------------------------------------------------------------------
 */

import React from "react";

/* ========================================================================== */
/* Icons                                                                      */
/* ========================================================================== */

export type IconName =
  | "home" | "briefcase" | "dumbbell" | "users" | "bag" | "phone"
  | "bolt" | "chevron" | "chevronRight" | "close" | "check" | "plus"
  | "brain" | "heart" | "sparkles" | "smile" | "gem" | "trend" | "trophy" | "star"
  | "book" | "mic" | "penTool" | "monitor"
  | "sword" | "masks" | "pulse" | "search" | "ghost" | "rocket" | "map"
  | "crown" | "message" | "gift" | "coffee" | "call" | "baby" | "clock" | "flame"
  | "clapper" | "camera" | "video" | "megaphone" | "calendar" | "tv" | "ticket"
  | "card" | "building" | "lock" | "play" | "news" | "bars" | "bank"
  | "back" | "shield" | "dollar" | "car" | "plane";

const P: Record<IconName, React.ReactNode> = {
  home: (<><path d="M3.8 10.4 12 3.9l8.2 6.5v8.2a1.5 1.5 0 0 1-1.5 1.5H5.3a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M9.4 20.1V14h5.2v6.1"/></>),
  briefcase: (<><path d="M4.2 7.7h15.6a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4.2a1.5 1.5 0 0 1-1.5-1.5v-9a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M9 7.7V6.1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.6M2.7 12.4h18.6"/></>),
  dumbbell: <path d="M6.8 6.6v10.8M3.6 9.2v5.6M17.2 6.6v10.8M20.4 9.2v5.6M6.8 12h10.4"/>,
  users: (<><path d="M15.6 20v-1.8a3.9 3.9 0 0 0-3.9-3.9H6.5a3.9 3.9 0 0 0-3.9 3.9V20"/><circle cx="9.1" cy="7.5" r="3.1"/><path d="M17.6 4.7a3.1 3.1 0 0 1 0 5.8M21.4 20v-1.8a3.9 3.9 0 0 0-2.9-3.75"/></>),
  bag: (<><path d="M4.7 7.6h14.6l.9 12.1H3.8z"/><path d="M9 10.1V6.7a3 3 0 0 1 6 0v3.4"/></>),
  phone: (<><path d="M8 2.9h8a1.8 1.8 0 0 1 1.8 1.8v14.6A1.8 1.8 0 0 1 16 21.1H8a1.8 1.8 0 0 1-1.8-1.8V4.7A1.8 1.8 0 0 1 8 2.9z"/><path d="M10.6 18.1h2.8"/></>),
  bolt: <path d="M13.4 2 4.6 13.4h5.6L10.6 22l8.8-11.4h-5.6z"/>,
  chevron: <path d="M6 9.5l6 6 6-6"/>,
  chevronRight: <path d="M9 5l7 7-7 7"/>,
  close: <path d="M6 6l12 12M18 6L6 18"/>,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  brain: (<><path d="M8.6 5.1A3.4 3.4 0 0 1 12 3.3a3.4 3.4 0 0 1 3.4 1.8 3.2 3.2 0 0 1 3.4 3.2 3.1 3.1 0 0 1-.6 1.9 3.2 3.2 0 0 1 .2 4.1 3.3 3.3 0 0 1-2.9 4.8 3.3 3.3 0 0 1-3.5 1.2 3.3 3.3 0 0 1-3.5-1.2 3.3 3.3 0 0 1-2.9-4.8 3.2 3.2 0 0 1 .2-4.1A3.1 3.1 0 0 1 5.2 8.3a3.2 3.2 0 0 1 3.4-3.2z"/><path d="M12 4v16.1"/><path d="M8.8 9.3c1.3.7 2.2.7 3.2 0M12 14.6c1.1.7 2 .7 3.2 0"/></>),
  heart: <path d="M12 20.3 4.8 13.2a4.5 4.5 0 0 1 6.4-6.3l.8.8.8-.8a4.5 4.5 0 1 1 6.4 6.3z"/>,
  sparkles: (<><path d="M10.4 3.1 12 7.3l4.2 1.6L12 10.5l-1.6 4.2-1.6-4.2L4.6 8.9l4.2-1.6z"/><path d="M17.6 14.4l.85 2.3 2.3.85-2.3.85-.85 2.3-.85-2.3-2.3-.85 2.3-.85z"/></>),
  smile: (<><circle cx="12" cy="12" r="8.8"/><path d="M8.5 14.3s1.3 1.7 3.5 1.7 3.5-1.7 3.5-1.7"/><path d="M9.2 9.7h.01M14.8 9.7h.01" strokeWidth={2.4}/></>),
  gem: (<><path d="M6.4 3.2h11.2l3.2 5.2L12 20.8 1.2 8.4z"/><path d="M1.2 8.4h19.6"/></>),
  trend: (<><path d="M3 16.6 9 10.6l3.5 3.5L20.8 5.7"/><path d="M15.5 5.7h5.3V11"/></>),
  trophy: (<><path d="M7.2 3.4h9.6v4.7a4.8 4.8 0 0 1-9.6 0z"/><path d="M16.8 5h2.5v1.7a3.7 3.7 0 0 1-3 3.6M7.2 5H4.7v1.7a3.7 3.7 0 0 0 3 3.6M12 13v3.6M8.7 20.4h6.6M9.7 20.4l.4-3.3h3.8l.4 3.3"/></>),
  star: <path d="M12 3.4l2.6 5.3 5.85.85-4.23 4.12 1 5.83L12 16.75l-5.23 2.75 1-5.83L3.55 9.55l5.85-.85z"/>,
  book: (<><path d="M4 4.4h5.4A2.6 2.6 0 0 1 12 7v12.6a2 2 0 0 0-2-2H4z"/><path d="M20 4.4h-5.4A2.6 2.6 0 0 0 12 7v12.6a2 2 0 0 1 2-2h6z"/></>),
  mic: (<><path d="M12 3.2a2.9 2.9 0 0 1 2.9 2.9v5.6a2.9 2.9 0 0 1-5.8 0V6.1A2.9 2.9 0 0 1 12 3.2z"/><path d="M5.6 11a6.4 6.4 0 0 0 12.8 0M12 17.4V21M8.8 21h6.4"/></>),
  penTool: (<><path d="M11.2 3.6 4 10.8l3.2 9.6 9.6-3.2 3.6-7.2z"/><path d="M11.2 3.6 20.4 10l-9.2 4z"/><circle cx="11.6" cy="12.4" r="2.2"/></>),
  monitor: (<><path d="M3.4 4.6h17.2a1.4 1.4 0 0 1 1.4 1.4v9.4a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 15.4V6a1.4 1.4 0 0 1 1.4-1.4z"/><path d="M8.6 21h6.8M12 16.8V21"/></>),
  sword: (<><path d="M18.6 3.4h2.8v2.8L11.8 15.8 8.6 12.6z"/><path d="M7.4 13.8 10.6 17 8 19.6 4.8 16.4z"/><path d="M3.4 20.6 6 18"/></>),
  masks: (<><path d="M10.6 4.4c-3 0-5.2 1-5.2 1s-.4 6 1 8.8c1.1 2.2 4.2 2.6 5.6.6 1.1-1.6 1.2-6.4.8-9.2a12 12 0 0 0-2.2-1.2z"/><path d="M14.4 6.6c2.6-.4 4.2.4 4.2.4s.6 6-.6 8.8c-1 2.2-4 2.8-5.5.9"/><path d="M7.6 9.2h.01M10.8 9.2h.01" strokeWidth={2.2}/></>),
  pulse: <path d="M2.6 12.4h4L9 6.8l3.4 10.6 2.4-5h6.6"/>,
  search: (<><circle cx="11" cy="11" r="6.8"/><path d="M16.2 16.2 21 21"/></>),
  ghost: (<><path d="M4.6 20.6V10.4a7.4 7.4 0 1 1 14.8 0v10.2l-2.5-1.8-2.4 1.8-2.5-1.8-2.5 1.8-2.4-1.8z"/><path d="M9.4 9.6h.01M14.6 9.6h.01" strokeWidth={2.4}/></>),
  rocket: (<><path d="M12 2.6c3.4 2.2 5.2 6 5.2 10L12 18l-5.2-5.4c0-4 1.8-7.8 5.2-10z"/><circle cx="12" cy="10" r="2.1"/><path d="M8.4 16.4 6 20.8l4.4-1.6M15.6 16.4 18 20.8l-4.4-1.6"/></>),
  map: (<><path d="M2.8 6.4 9 3.6l6 2.8 6.2-2.8v14l-6.2 2.8-6-2.8-6.2 2.8z"/><path d="M9 3.6v14M15 6.4v14"/></>),
  crown: (<><path d="M3.2 7.4 6.9 12l5.1-6.6L17.1 12l3.7-4.6 -1.5 11.2H4.7z"/><path d="M4.7 20.2h14.6"/></>),
  message: (<><path d="M20.6 12.2a7.8 7.8 0 0 1-8.4 7.8 8.6 8.6 0 0 1-3.3-.7L3.4 21l1.7-5.2a7.8 7.8 0 0 1-.7-3.3 7.8 7.8 0 0 1 7.8-8.1 7.8 7.8 0 0 1 8.4 7.8z"/></>),
  gift: (<><path d="M3.6 11.6h16.8v8.4a1.4 1.4 0 0 1-1.4 1.4H5a1.4 1.4 0 0 1-1.4-1.4z"/><path d="M2.6 7.6h18.8v4H2.6zM12 7.6v13.8"/><path d="M12 7.6S10.9 3 8.4 3a2.3 2.3 0 0 0 0 4.6zM12 7.6S13.1 3 15.6 3a2.3 2.3 0 0 1 0 4.6z"/></>),
  coffee: (<><path d="M3.6 8h13v7.2a4.6 4.6 0 0 1-4.6 4.6H8.2a4.6 4.6 0 0 1-4.6-4.6z"/><path d="M16.6 9.4h1.8a2.6 2.6 0 0 1 0 5.2h-1.8"/><path d="M6.6 2.6v2.6M10 2.6v2.6M13.4 2.6v2.6"/></>),
  call: <path d="M21 16.6v2.8a1.9 1.9 0 0 1-2.1 1.9 18.6 18.6 0 0 1-8.1-2.9 18.3 18.3 0 0 1-5.6-5.6A18.6 18.6 0 0 1 2.3 4.6 1.9 1.9 0 0 1 4.2 2.5H7a1.9 1.9 0 0 1 1.9 1.6 12 12 0 0 0 .7 2.6 1.9 1.9 0 0 1-.4 2L8 9.8a15 15 0 0 0 5.6 5.6l1.1-1.2a1.9 1.9 0 0 1 2-.4 12 12 0 0 0 2.6.7A1.9 1.9 0 0 1 21 16.6z"/>,
  baby: (<><circle cx="12" cy="12" r="9"/><path d="M9 10.4h.01M15 10.4h.01" strokeWidth={2.3}/><path d="M9.2 15.2c1.7 1.4 3.9 1.4 5.6 0"/></>),
  clock: (<><circle cx="12" cy="12" r="8.8"/><path d="M12 7.2V12l3.4 2"/></>),
  flame: <path d="M12 2.6s5.4 4 5.4 9.4a5.4 5.4 0 0 1-10.8 0c0-2 .9-3.4.9-3.4s.6 1.6 1.9 1.9c0-2.6.9-5.9 2.6-7.9z"/>,
  clapper: (<><path d="M3 9.7h18v9.1a1.7 1.7 0 0 1-1.7 1.7H4.7A1.7 1.7 0 0 1 3 18.8z"/><path d="M3.5 9.7 2.7 6.4 20 3.7l.8 3.3z"/><path d="m7.9 5.1-1 4.2M12.7 4.4l-1 4.2M17.5 3.7l-1 4.2"/></>),
  camera: (<><path d="M4.2 7.7h3.1l1.4-2.3h6.6l1.4 2.3h3.1a1.6 1.6 0 0 1 1.6 1.6v8.4a1.6 1.6 0 0 1-1.6 1.6H4.2a1.6 1.6 0 0 1-1.6-1.6V9.3a1.6 1.6 0 0 1 1.6-1.6z"/><circle cx="12" cy="13.3" r="3.3"/></>),
  video: (<><rect x="2.7" y="6.5" width="12.8" height="11" rx="1.9"/><path d="m15.5 11.1 5.8-3.2v8.2l-5.8-3.2z"/></>),
  megaphone: (<><path d="M3.5 10.2v3.6a1.6 1.6 0 0 0 1.6 1.6h2.2l6.8 4.2V4.4L7.3 8.6H5.1a1.6 1.6 0 0 0-1.6 1.6z"/><path d="M17.4 8.8a4.4 4.4 0 0 1 0 6.4"/><path d="m7.5 15.6 1.1 4.9h3l-1-4.9"/></>),
  calendar: (<><rect x="3" y="5.3" width="18" height="15.4" rx="1.9"/><path d="M3 10.1h18M8.1 3.3v4M15.9 3.3v4"/></>),
  tv: (<><rect x="2.7" y="7.7" width="18.6" height="12.8" rx="1.9"/><path d="m8.1 3.5 3.9 4.2 3.9-4.2"/></>),
  ticket: (<><path d="M3 8.5a1.6 1.6 0 0 1 1.6-1.6h14.8A1.6 1.6 0 0 1 21 8.5v2.1a2.1 2.1 0 0 0 0 4.2v2.1a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 16.9v-2.1a2.1 2.1 0 0 0 0-4.2z"/><path d="M14.1 7.5v2.2M14.1 14.5v2.2"/></>),
  card: (<><rect x="2.8" y="5.9" width="18.4" height="12.9" rx="2.3"/><path d="M2.8 10.3h18.4"/><circle cx="17.1" cy="14.7" r="1.2"/></>),
  building: (<><path d="M4.1 20.4V8.7L12 4.3l7.9 4.4v11.7"/><path d="M2.6 20.4h18.8"/><path d="M9.7 20.4v-5.1h4.6v5.1"/><path d="M9.5 10.7h1.1M13.4 10.7h1.1"/></>),
  lock: (<><rect x="4.4" y="10.3" width="15.2" height="10.2" rx="2.1"/><path d="M8.1 10.3V7.6a3.9 3.9 0 0 1 7.8 0v2.7"/></>),
  play: <path d="M7.8 4.8 19.4 12 7.8 19.2z"/>,
  news: (<><path d="M3.6 5.4h13.2v14.2H5.4a1.8 1.8 0 0 1-1.8-1.8z"/><path d="M16.8 8.7h3.6v9.1a1.8 1.8 0 0 1-3.6 0z"/><path d="M6.5 8.7h7.4M6.5 12.1h7.4M6.5 15.5h4.7"/></>),
  bars: <path d="M5.7 20.1v-8.6M12 20.1V4.9M18.3 20.1v-5.6"/>,
  bank: (<><path d="M3.4 9.7 12 4.4l8.6 5.3"/><path d="M2.8 20.2h18.4"/><path d="M5.9 12.3v5.9M10 12.3v5.9M14 12.3v5.9M18.1 12.3v5.9"/></>),
  back: <path d="M19.4 12H4.6M11 5.6 4.6 12l6.4 6.4"/>,
  shield: (<><path d="M12 3.1 20 6v6.1c0 4.4-3.2 7.6-8 8.8-4.8-1.2-8-4.4-8-8.8V6z"/><path d="M12 8.6v4.2M12 16.1h.01" strokeWidth={2.1}/></>),
  dollar: (<><path d="M12 2.9v18.2"/><path d="M16.6 6.7H9.9a3.1 3.1 0 0 0 0 6.2h4.2a3.1 3.1 0 0 1 0 6.2H6.9"/></>),
  car: (<><path d="M4.4 16.6V11l2-4.4a1.8 1.8 0 0 1 1.7-1.1h7.8a1.8 1.8 0 0 1 1.7 1.1l2 4.4v5.6"/><path d="M2.9 11h18.2"/><path d="M4.4 16.6h15.2v1.9a1.4 1.4 0 0 1-1.4 1.4h-1.3a1.4 1.4 0 0 1-1.4-1.4v-1.9M8.5 16.6v1.9a1.4 1.4 0 0 1-1.4 1.4H5.8a1.4 1.4 0 0 1-1.4-1.4v-1.9"/><path d="M7.4 13.9h1.2M15.4 13.9h1.2" strokeWidth={2}/></>),
  plane: <path d="M10.4 2.9a1.6 1.6 0 0 1 3.2 0v5.9l7.8 4.4v2.4l-7.8-2.3v4.4l2.6 2v1.6L12 20.3l-4.2.9v-1.6l2.6-2v-4.4l-7.8 2.3v-2.4l7.8-4.4z"/>,
};

const FILLED: IconName[] = ["bolt", "call", "play"];

export function Icon({ name, size = 18, sw = 1.8 }: { name: IconName; size?: number; sw?: number }) {
  const solid = FILLED.indexOf(name) !== -1;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={solid ? "currentColor" : "none"} stroke={solid ? "none" : "currentColor"}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {P[name]}
    </svg>
  );
}

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

export const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, isFinite(n) ? n : 0));
export const cssVar = (name: string, value: string) => ({ [name]: value } as React.CSSProperties);
export const money = (n: number) => "$" + n.toLocaleString("en-US");
export const compactMoney = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return "$" + n;
};

/** Eases 0 → 1 once on mount; returns 1 immediately under reduced motion. */
export function useReveal(duration = 900, delay = 280) {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") { setT(1); return; }
    const reduce = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setT(1); return; }
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

/** Transient confirmation message. */
export function useToast(ms = 2200) {
  const [msg, setMsg] = React.useState<string | null>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const say = React.useCallback((m: string) => {
    setMsg(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), ms);
  }, [ms]);
  React.useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return { msg, say };
}

/* ========================================================================== */
/* Primitives                                                                 */
/* ========================================================================== */

export function Style({ css }: { css: string }) {
  return <style>{css}</style>;
}

export function Meter({ value, color, thin }: { value: number; color?: string; thin?: boolean }) {
  return (
    <div className={"ae-meter" + (thin ? " is-thin" : "")} style={color ? cssVar("--c", color) : undefined}>
      <i style={{ width: clamp(value) + "%" }} />
    </div>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  return (
    <div className={"ae-toast" + (msg ? " is-on" : "")} role="status">
      <Icon name="check" size={14} sw={2.4} />
      {msg}
    </div>
  );
}

export function Sheet({
  open, onClose, eyebrow, eyebrowIcon, title, children, head,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  eyebrowIcon?: IconName;
  title?: string;
  /** Replaces the default eyebrow/title block entirely. */
  head?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={"ae-sheet-wrap" + (open ? " is-open" : "")}>
      <div className="ae-scrim" onClick={onClose} />
      <div className="ae-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="ae-grip" />
        <div className="ae-sheet-top">
          {head || (
            <div>
              {eyebrow && (
                <div className="ae-sheet-eyebrow">
                  {eyebrowIcon && <Icon name={eyebrowIcon} size={11} />}
                  {eyebrow}
                </div>
              )}
              {title && <h2 className="ae-sheet-title">{title}</h2>}
            </div>
          )}
          <button className="ae-sheet-x" onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} sw={2.2} />
          </button>
        </div>
        <div className="ae-sheet-body">{children}</div>
      </div>
    </div>
  );
}

/**
 * Sub-navigation inside a screen. Each destination is its own view — this is
 * not a filter row, it swaps what the page is about.
 */
export function Segmented<T extends string>({
  items, active, onChange,
}: {
  items: { key: T; label: string; icon?: IconName; count?: number }[];
  active: T;
  onChange: (k: T) => void;
}) {
  const i = Math.max(0, items.map((x) => x.key).indexOf(active));
  const w = "calc((100% - 8px) / " + items.length + ")";
  return (
    <div className="ae-seg" role="tablist">
      <span className="ae-seg-ind" style={{ width: w, transform: "translateX(" + i * 100 + "%)" }} />
      {items.map((it) => (
        <button
          key={it.key}
          role="tab"
          aria-selected={it.key === active}
          className={"ae-seg-b" + (it.key === active ? " is-on" : "")}
          onClick={() => onChange(it.key)}
        >
          {it.icon && <Icon name={it.icon} size={13} />}
          {it.label}
          {it.count !== undefined && <span className="ae-seg-n">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export type NavKey = "home" | "career" | "training" | "social" | "store" | "phone";

export const NAV: { key: NavKey; icon: IconName; label: string }[] = [
  { key: "home", icon: "home", label: "Home" },
  { key: "career", icon: "briefcase", label: "Career" },
  { key: "training", icon: "dumbbell", label: "Training" },
  { key: "social", icon: "users", label: "Social" },
  { key: "store", icon: "bag", label: "Store" },
  { key: "phone", icon: "phone", label: "Phone" },
];

export function NavBar({
  active, badge = 0, onChange,
}: { active: NavKey; badge?: number; onChange?: (k: NavKey) => void }) {
  const i = Math.max(0, NAV.map((n) => n.key).indexOf(active));
  return (
    <div className="ae-dock">
      <nav className="ae-nav">
        <span className="ae-nav-ind" style={{ transform: "translateX(" + i * 100 + "%)" }} aria-hidden="true" />
        {NAV.map((n) => (
          <button
            key={n.key}
            className={"ae-navtab" + (n.key === active ? " is-on" : "")}
            onClick={() => onChange && onChange(n.key)}
            aria-label={n.label}
            aria-current={n.key === active ? "page" : undefined}
          >
            <Icon name={n.icon} size={20} sw={1.75} />
            {n.key === "phone" && badge > 0 && <span className="ae-navbadge">{badge > 99 ? "99+" : badge}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
