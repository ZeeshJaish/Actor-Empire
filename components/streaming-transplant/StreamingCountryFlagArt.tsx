import React, { useId } from 'react';

interface StreamingCountryFlagArtProps {
  marketId: string;
  className?: string;
}

const StripeFlag: React.FC<{ colors: string[]; vertical?: boolean }> = ({ colors, vertical = false }) => (
  <>
    {colors.map((color, index) => (
      <rect
        key={`${color}-${index}`}
        x={vertical ? (160 / colors.length) * index : 0}
        y={vertical ? 0 : (100 / colors.length) * index}
        width={vertical ? 160 / colors.length : 160}
        height={vertical ? 100 : 100 / colors.length}
        fill={color}
      />
    ))}
  </>
);

const UnionJack: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <g transform={compact ? 'scale(.44)' : undefined}>
    <rect width="160" height="100" fill="#173f8a" />
    <path d="M0 0 160 100M160 0 0 100" stroke="#fff" strokeWidth="22" />
    <path d="M0 0 160 100M160 0 0 100" stroke="#c8102e" strokeWidth="10" />
    <path d="M80 0v100M0 50h160" stroke="#fff" strokeWidth="28" />
    <path d="M80 0v100M0 50h160" stroke="#c8102e" strokeWidth="16" />
  </g>
);

const renderFlag = (marketId: string): React.ReactNode => {
  switch (marketId) {
    case 'US':
      return <>
        <StripeFlag colors={Array.from({ length: 13 }, (_, index) => index % 2 ? '#fff' : '#b22234')} />
        <rect width="72" height="54" fill="#3c3b6e" />
        {Array.from({ length: 12 }, (_, index) => <circle key={index} cx={9 + (index % 4) * 17} cy={9 + Math.floor(index / 4) * 17} r="2.1" fill="#fff" />)}
      </>;
    case 'CA':
      return <><StripeFlag colors={['#d80621', '#fff', '#d80621']} vertical /><path d="M80 22 86 38l12-5-5 14 11 4-15 8 3 17H68l3-17-15-8 11-4-5-14 12 5z" fill="#d80621" /></>;
    case 'MX':
      return <><StripeFlag colors={['#006847', '#fff', '#ce1126']} vertical /><circle cx="80" cy="51" r="9" fill="#8a6a2f" /><path d="M73 59q7 9 14 0" fill="none" stroke="#2f7a3e" strokeWidth="3" /></>;
    case 'BR':
      return <><rect width="160" height="100" fill="#169b62" /><path d="m80 13 61 37-61 37-61-37z" fill="#ffdf00" /><circle cx="80" cy="50" r="22" fill="#002776" /><path d="M59 46q22-9 43 5" fill="none" stroke="#fff" strokeWidth="4" /></>;
    case 'AR':
      return <><StripeFlag colors={['#74acdf', '#fff', '#74acdf']} /><circle cx="80" cy="50" r="8" fill="#f6b40e" /></>;
    case 'CO':
      return <><rect width="160" height="50" fill="#fcd116" /><rect y="50" width="160" height="25" fill="#003893" /><rect y="75" width="160" height="25" fill="#ce1126" /></>;
    case 'CL':
      return <><rect width="160" height="50" fill="#fff" /><rect y="50" width="160" height="50" fill="#d52b1e" /><rect width="55" height="50" fill="#0039a6" /><circle cx="27.5" cy="25" r="8" fill="#fff" /></>;
    case 'GB': return <UnionJack />;
    case 'DE': return <StripeFlag colors={['#111', '#dd0000', '#ffce00']} />;
    case 'FR': return <StripeFlag colors={['#0055a4', '#fff', '#ef4135']} vertical />;
    case 'ES': return <><rect width="160" height="100" fill="#aa151b" /><rect y="25" width="160" height="50" fill="#f1bf00" /><circle cx="48" cy="50" r="8" fill="#aa151b" opacity=".85" /></>;
    case 'IT': return <StripeFlag colors={['#009246', '#fff', '#ce2b37']} vertical />;
    case 'ZA':
      return <><rect width="160" height="50" fill="#de3831" /><rect y="50" width="160" height="50" fill="#002395" /><path d="M0 0 72 50 0 100z" fill="#000" stroke="#ffb612" strokeWidth="11" /><path d="m0 16 58 34L0 84M58 50h102" fill="none" stroke="#fff" strokeWidth="27" /><path d="m0 16 58 34L0 84M58 50h102" fill="none" stroke="#007a4d" strokeWidth="15" /></>;
    case 'NG': return <StripeFlag colors={['#008751', '#fff', '#008751']} vertical />;
    case 'EG': return <><StripeFlag colors={['#ce1126', '#fff', '#000']} /><circle cx="80" cy="50" r="8" fill="#c6a43b" /></>;
    case 'KE': return <><StripeFlag colors={['#111', '#fff', '#bb0000', '#fff', '#006600']} /><ellipse cx="80" cy="50" rx="11" ry="23" fill="#bb0000" stroke="#fff" strokeWidth="3" /><path d="M80 28v44M70 40l20 20M90 40 70 60" stroke="#111" strokeWidth="3" /></>;
    case 'IN':
      return <><StripeFlag colors={['#ff9933', '#fff', '#138808']} /><circle cx="80" cy="50" r="10" fill="none" stroke="#000080" strokeWidth="2.5" />{Array.from({ length: 12 }, (_, index) => <path key={index} d="M80 40v20" stroke="#000080" strokeWidth="1" transform={`rotate(${index * 15} 80 50)`} />)}</>;
    case 'JP': return <><rect width="160" height="100" fill="#fff" /><circle cx="80" cy="50" r="23" fill="#bc002d" /></>;
    case 'KR': return <><rect width="160" height="100" fill="#fff" /><path d="M57 50a23 23 0 0 1 46 0 11.5 11.5 0 0 0-23 0 11.5 11.5 0 0 1-23 0z" fill="#cd2e3a" /><path d="M103 50a23 23 0 0 1-46 0 11.5 11.5 0 0 0 23 0 11.5 11.5 0 0 1 23 0z" fill="#0047a0" /><path d="m34 24 14 14m-9-19 14 14m58 34 14 14m-9-19 14 14" stroke="#111" strokeWidth="4" /></>;
    case 'ID': return <StripeFlag colors={['#ce1126', '#fff']} />;
    case 'TH': return <><StripeFlag colors={['#a51931', '#fff', '#2d2a4a', '#2d2a4a', '#fff', '#a51931']} /></>;
    case 'PH': return <><rect width="160" height="50" fill="#0038a8" /><rect y="50" width="160" height="50" fill="#ce1126" /><path d="M0 0 76 50 0 100z" fill="#fff" /><circle cx="24" cy="50" r="8" fill="#fcd116" /></>;
    case 'AU':
    case 'NZ':
      return <><rect width="160" height="100" fill={marketId === 'AU' ? '#012169' : '#00247d'} /><UnionJack compact />{[[106,28],[130,48],[103,69],[139,79]].map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r={marketId === 'AU' ? 5 : 4} fill={marketId === 'AU' ? '#fff' : '#cc142b'} stroke="#fff" strokeWidth="1.5" />)}</>;
    default: return <><rect width="160" height="100" fill="#20283a" /><circle cx="80" cy="50" r="24" fill="#fff" opacity=".18" /></>;
  }
};

export const StreamingCountryFlagArt: React.FC<StreamingCountryFlagArtProps> = ({ marketId, className }) => {
  const rawId = useId().replace(/:/g, '');
  const shadeId = `streamingFlagShade-${rawId}`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </linearGradient>
      </defs>
      {renderFlag(String(marketId || '').trim().toUpperCase())}
      <rect width="160" height="100" fill={`url(#${shadeId})`} />
    </svg>
  );
};
