interface ResearchLockMarkProps {
  reason: string;
  compact?: boolean;
}

export function ResearchLockMark({ reason, compact = false }: ResearchLockMarkProps) {
  return (
    <span
      className={`lw-research-lock${compact ? ' is-compact' : ''}`}
      data-research-lock="true"
    >
      <span className="lw-research-lock-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M5 7V5.4a3 3 0 0 1 6 0V7" />
          <rect x="3.5" y="7" width="9" height="6.5" rx="1.8" />
          <path d="M8 9.5v1.8" />
        </svg>
      </span>
      <span className="lw-research-lock-copy">
        <b>Research locked</b>
        <em>{reason}</em>
      </span>
    </span>
  );
}
