interface PackSoundToggleProps {
  on: boolean;
  onToggle: () => void;
  /** each page styles it in its own look */
  className?: string;
}

/* A pack page's sound switch: 44 by 44, one icon, nothing else. */
export default function PackSoundToggle({ on, onToggle, className }: PackSoundToggleProps) {
  return (
    <button type="button" className={className} style={{ width: 44, height: 44, flex: 'none' }} onClick={onToggle} aria-label={on ? 'Sound on' : 'Sound off'}>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7.8v4.4h2.8L10 15.6V4.4L5.8 7.8H3Z" fill="currentColor" strokeWidth="1.2"></path>
        {on ? (
          <>
            <path d="M12.7 7.6a3.4 3.4 0 0 1 0 4.8"></path>
            <path d="M14.9 5.4a6.5 6.5 0 0 1 0 9.2"></path>
          </>
        ) : (
          <path d="M13 7.7l4.6 4.6M17.6 7.7L13 12.3"></path>
        )}
      </svg>
    </button>
  );
}
