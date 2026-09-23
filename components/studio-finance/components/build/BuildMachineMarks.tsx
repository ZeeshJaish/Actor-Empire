import type { CloudProviderId, ServerTier } from '../../finance/build';

/** Fictional Build hardware crests. These identify the player's choices; the
    shapes do not encode capacity or alter any of the underlying machines. */
export function ServerMark({ tier }: { tier: ServerTier }) {
  const marks = {
    SCOUT: <><path d="M12 2.5 19 18l-7-3-7 3 7-15.5Z" /><path d="M12 15v6M8.5 17.2 12 15l3.5 2.2" /></>,
    WORKHORSE: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M7 9h10M7 15h10M9 7v4M15 13v4" /><circle cx="18" cy="9" r=".7" fill="currentColor" /></>,
    TITAN: <><path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z" /><path d="M8 17V7l4-2 4 2v10l-4 2-4-2ZM12 5v14" /></>,
  };
  return <svg className="bw-machine-mark" data-build-mark={`server-${tier.toLowerCase()}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{marks[tier]}</svg>;
}

/** Three provider identities follow their actual offer character: Atlas spans
    the world, Northwind is a compact route, Meridian has the widest reach. */
export function CloudMark({ provider }: { provider: CloudProviderId }) {
  const marks = {
    ATLAS: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-5 4-5 14 0 18M12 3c5 4 5 14 0 18" /></>,
    NORTHWIND: <><path d="M3 18 10 5l3 8 8-7-6 13-4-7-8 6Z" /><path d="M6 20h12" /></>,
    MERIDIAN: <><path d="M3 17c5-9 13-12 18-10M3 17c6 1 12-1 18-10M3 17c9-1 14 1 18-10" /><circle cx="4" cy="17" r="1.6" fill="currentColor" /><circle cx="20" cy="7" r="1.6" fill="currentColor" /></>,
  };
  return <svg className="bw-machine-mark" data-build-mark={`cloud-${provider.toLowerCase()}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{marks[provider]}</svg>;
}
