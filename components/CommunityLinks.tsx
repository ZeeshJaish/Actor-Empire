import { COMMUNITY_LINKS } from '../services/communityLinks';
import { trackGameEvent } from '../services/firebaseService';

interface Props {
  /** where the row sits, for the tap count in Firebase (community_link_open) */
  source: 'start_menu' | 'developer_letter';
  className?: string;
  linkClassName?: string;
  iconSize?: number;
}

/** The studio's socials as a quiet row of icons (23 Nov 2026). A tap opens the link outside the game, as the Settings
 *  links always did (a plain link), and only counts the tap: no save, no wait. */
export default function CommunityLinks({ source, className, linkClassName, iconSize = 18 }: Props) {
  return (
    <nav aria-label="Actor Empire community" className={className}>
      {COMMUNITY_LINKS.map(link => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${link.label} (opens outside the game)`}
          title={link.label}
          className={linkClassName}
          data-community-link={link.id}
          onClick={() => trackGameEvent('community_link_open', { platform: link.id, source })}
        >
          <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true" focusable="false">
            <path d={link.iconPath} fill="currentColor" />
          </svg>
        </a>
      ))}
    </nav>
  );
}
