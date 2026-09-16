import React from 'react';

export type BuildMetricFamily = 'money' | 'energy' | 'water' | 'network' | 'infrastructure';

interface ResourceMetricProps {
  resource: BuildMetricFamily;
  label: string;
  value: React.ReactNode;
  unit?: string;
  compact?: boolean;
  onExplain?: () => void;
}

export function ResourceMetric({ resource, label, value, unit, compact = false, onExplain }: ResourceMetricProps) {
  const className = `sf-metric-card is-${resource}${compact ? ' is-compact' : ''}`;
  const content = (
    <>
      <em>
        <ResourceGlyph resource={resource} />
        {label}
      </em>
      <b>
        {value}
        {unit && <small className="sf-resource-unit">{unit}</small>}
      </b>
    </>
  );

  return onExplain
    ? <button type="button" className={className} aria-label={`Explain ${label}`} onClick={onExplain}>{content}</button>
    : <span className={className}>{content}</span>;
}

function ResourceGlyph({ resource }: { resource: BuildMetricFamily }) {
  const paths: Record<BuildMetricFamily, React.ReactElement> = {
    energy: <path d="M13 2 5.5 13h5L9 22l9.5-12h-5L13 2Z" />,
    water: <path d="M12 2.5S5.5 10.1 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.5 12 2.5Z" />,
    money: <path d="M16.5 7.5c0-1.7-1.8-3-4.5-3s-4.5 1.3-4.5 3 1.5 2.6 4.5 3 4.5 1.3 4.5 3-1.8 3-4.5 3-4.5-1.3-4.5-3M12 2v20" />,
    network: <><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="6" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="m7.3 11 9.4-4M7.3 13l9.4 4" /></>,
    infrastructure: <><rect x="4" y="4" width="16" height="6" rx="1.5" /><rect x="4" y="14" width="16" height="6" rx="1.5" /><path d="M7 7h.01M7 17h.01" /></>,
  };
  return (
    <svg className="sf-resource-glyph" viewBox="0 0 24 24" aria-hidden="true" fill={resource === 'energy' || resource === 'water' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[resource]}
    </svg>
  );
}
