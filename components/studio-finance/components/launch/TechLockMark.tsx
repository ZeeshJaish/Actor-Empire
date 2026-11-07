/* #109 (plan §18.5; Zeesh: "… लॉक्ड रहे रिसर्च से खुले गए … वो सारी चीज़ हमने अच्छा टेक में डाल दे"): a locked front page
   or ident kit names the Tech step that unlocks it, in place of "Research locked". Compact (a tile), the step's name. */
interface TechLockMarkProps {
  /** the Tech step's name: "Smart TV apps" */
  tech?: string;
  compact?: boolean;
}

export function TechLockMark({ tech, compact = false }: TechLockMarkProps) {
  return (
    <span className={`lw-tech-lock${compact ? ' is-compact' : ''}`} data-tech-lock="true">
      <span className="lw-tech-lock-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M5 7V5.4a3 3 0 0 1 6 0V7" />
          <rect x="3.5" y="7" width="9" height="6.5" rx="1.8" />
          <path d="M8 9.5v1.8" />
        </svg>
      </span>
      <span className="lw-tech-lock-copy">
        <b>{compact ? tech || 'In Tech' : `Unlock: ${tech || 'in Tech'}`}</b>
      </span>
    </span>
  );
}
